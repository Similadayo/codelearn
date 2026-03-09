# Phase 7 — Advanced API Features: Real-Time with WebSockets (PHP)

Real-Time WebSockets bring live, bidirectional communication to your backend APIs. In PHP, you typically run a long-lived WebSocket server (e.g., Ratchet) alongside your traditional HTTP APIs. This enables features like live notifications, chat, live dashboards, and real-time data streams without polling. This lesson covers building a robust WebSocket server in PHP, implementing topic-based pub/sub, authenticating at handshake, and strategies for real-world production usage.

## 1. Minimal WebSocket Server in PHP (Ratchet)

This section shows a minimal WebSocket server in PHP using Ratchet. It establishes connections and echoes back received messages. It’s the foundation you’ll extend to publish/subscribe to topics and enforce security.

```php
// server-minimal.php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\ConnectionInterface;
use Ratchet\MessageComponentInterface;

class SimpleWebSocket implements MessageComponentInterface {
    protected $clients;

    public function __construct() {
        $this->clients = new \SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn) {
        // Track new client
        $this->clients->attach($conn);
        $conn->send(json_encode(['type' => 'welcome', 'message' => 'Connected to PHP WebSocket server']));
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        // Echo back received message with a simple wrapper
        $payload = ['type' => 'echo', 'payload' => $msg];
        foreach ($this->clients as $client) {
            $client->send(json_encode($payload));
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Cleanup on disconnect
        if ($this->clients->contains($conn)) {
            $this->clients->detach($conn);
        }
    }

    public function onError(ConnectionInterface $conn, \Throwable $e) {
        error_log("WebSocket error: " . $e->getMessage());
        $conn->close();
    }
}

$server = IoServer::factory(new WsServer(new SimpleWebSocket()), 8080);
$server->run();
```

```jsonc
// composer.json (dependency snippet)
{
  "require": {
    "cboden/ratchet": "^0.4"
  }
}
```

### Line-by-line explanation

- require __DIR__ . '/vendor/autoload.php';: Load Composer autoloader for Ratchet.
- use Ratchet\Server\IoServer; use Ratchet\WebSocket\WsServer; use Ratchet\ConnectionInterface; use Ratchet\MessageComponentInterface;: Import Ratchet classes.
- class SimpleWebSocket implements MessageComponentInterface { ... }: Implement a basic WebSocket application that adheres to Ratchet’s interface.
- protected $clients;: Store all connected clients.
- public function __construct() { $this->clients = new \SplObjectStorage(); }: Initialize the client storage.
- public function onOpen(ConnectionInterface $conn) { ... }: Called when a client connects; add to the pool and greet.
- public function onMessage(ConnectionInterface $from, $msg) { ... }: When a message arrives, broadcast it to all connected clients.
- public function onClose(ConnectionInterface $conn) { ... }: Remove the client from the pool on disconnect.
- public function onError(ConnectionInterface $conn, \Throwable $e) { ... }: Log and close on error.
- $server = IoServer::factory(new WsServer(new SimpleWebSocket()), 8080); $server->run();: Create and run the server on port 8080.
- JSON structure: All messages are JSON-encoded; the client should parse and handle accordingly.

## 2. Topic-based Pub/Sub Model

Real-time apps frequently need per-topic channels (e.g., "orders", "notifications"). This section builds a Pub/Sub layer over Ratchet so clients subscribe to topics and publishers broadcast only to interested subscribers.

```php
// server-pubsub.php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\ConnectionInterface;
use Ratchet\MessageComponentInterface;

class PubSubWebSocket implements MessageComponentInterface {
    protected $clients;
    protected $topics = [];

    public function __construct() {
        $this->clients = new \SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        $conn->send(json_encode(['type' => 'info', 'message' => 'Connected. Subscribe to topics with {"action":"subscribe","topic":"<name>"}']));
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        if (!$data) return;

        $action = $data['action'] ?? null;

        if ($action === 'subscribe') {
            $topic = $data['topic'] ?? null;
            if (!$topic) return;
            if (!isset($this->topics[$topic])) {
                $this->topics[$topic] = new \SplObjectStorage();
            }
            $this->topics[$topic]->attach($from);
            $from->send(json_encode(['type' => 'subscribed', 'topic' => $topic]));
        } elseif ($action === 'publish') {
            $topic = $data['topic'] ?? null;
            $payload = $data['payload'] ?? null;
            if (!$topic) return;
            $this->broadcast($topic, json_encode([
                'type' => 'message',
                'topic' => $topic,
                'payload' => $payload
            ]));
        } else {
            $from->send(json_encode(['type' => 'error', 'message' => 'Unknown action']));
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Clean up: remove from all topic subscriptions
        foreach ($this->topics as $topic => $storage) {
            if ($storage->contains($conn)) {
                $storage->detach($conn);
            }
        }
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Throwable $e) {
        error_log("WebSocket error: " . $e->getMessage());
        $conn->close();
    }

    protected function broadcast(string $topic, $payload) {
        if (!isset($this->topics[$topic])) return;
        foreach ($this->topics[$topic] as $conn) {
            $conn->send($payload);
        }
    }
}

$server = IoServer::factory(new WsServer(new PubSubWebSocket()), 8080);
$server->run();
```

```js
// client-example.html (JS client consuming the PHP Pub/Sub server)
<!doctype html>
<html>
<head><meta charset="utf-8" /><title>WebSocket Pub/Sub Client</title></head>
<body>
  <script>
    const token = "UNUSED_TOKEN_FOR_DEMO"; // If you add JWT auth, pass via query or header
    const ws = new WebSocket('ws://localhost:8080' + (token ? '?token=' + token : ''));

    ws.onopen = () => {
      // Subscribe to two topics
      ws.send(JSON.stringify({ action: 'subscribe', topic: 'orders' }));
      ws.send(JSON.stringify({ action: 'subscribe', topic: 'notifications' }));
      // Publish a test message to 'orders'
      ws.send(JSON.stringify({ action: 'publish', topic: 'orders', payload: { id: 123, status: 'created' } }));
    };
    ws.onmessage = (event) => {
      console.log('Received:', event.data);
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  </script>
</body>
</html>
```

### Line-by-line explanation (server-pubsub.php)

- require autoload and import Ratchet components: Sets up environment for a real-time PHP WebSocket app.
- class PubSubWebSocket implements MessageComponentInterface { ... }: Core WebSocket application implementing subscription logic.
- protected $clients; protected $topics = [];: Track global clients and per-topic subscriptions.
- public function onOpen(ConnectionInterface $conn) { ... }: Add the new connection to the client pool; greet the client.
- public function onMessage(ConnectionInterface $from, $msg) { $data = json_decode($msg, true); ... }: Decode the JSON message and handle actions.
- if ($action === 'subscribe') { ... }: Create or reuse a topic bucket and attach the connection to that topic; acknowledge subscription.
- elseif ($action === 'publish') { ... }: Broadcast the provided payload to all subscribers of the topic.
- public function onClose(ConnectionInterface $conn) { ... }: Remove the connection from all topic subscriptions and the global pool.
- public function onError(ConnectionInterface $conn, \Throwable $e) { ... }: Log and terminate problematic connections.
- protected function broadcast(string $topic, $payload) { ... }: Send the payload to every subscriber of a topic.
- $server = IoServer::factory(new WsServer(new PubSubWebSocket()), 8080); $server->run();: Bootstraps the real-time server.

### Line-by-line explanation (client-example.html)

- const ws = new WebSocket('ws://localhost:8080' + (token ? '?token=' + token : ''));: Create a WebSocket to the server. If JWT is used, append token as query param.
- ws.onopen: Subscribe to desired topics and optionally publish a test message.
- ws.onmessage: Log any messages received from the server (broadcasts or acknowledgments).
- ws.onerror: Handle connection errors gracefully.

## 3. Authentication and Authorization at Handshake

Authenticating at handshake ensures only trusted clients can subscribe, publish, or receive messages. This example shows how to require a JWT token passed in the query string and to verify it during onOpen. It uses firebase/php-jwt for JWT decoding and validation.

```php
// server-auth.php
require __DIR__ . '/vendor/autoload.php';
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\ConnectionInterface;
use Ratchet\MessageComponentInterface;
use Firebase\JWT\JWT;

class AuthenticatedWebSocket implements MessageComponentInterface {
    protected $clients;
    protected $secret;
    protected $authenticated;

    public function __construct($secret = 'change-me-please') {
        $this->clients = new \SplObjectStorage();
        $this->authenticated = new \SplObjectStorage();
        $this->secret = $secret;
    }

    public function onOpen(ConnectionInterface $conn) {
        // Extract token from query: ws://host:8080/?token=....
        $request = $conn->httpRequest;
        $token = null;
        if ($request) {
            $uri = $request->getUri();
            $query = $uri->getQuery();
            parse_str($query, $params);
            $token = $params['token'] ?? null;
        }

        if (!$token) {
            $conn->send(json_encode(['type' => 'auth', 'status' => 'missing_token']));
            $conn->close();
            return;
        }

        $payload = $this->verifyJWT($token);
        if (!$payload) {
            $conn->send(json_encode(['type' => 'auth', 'status' => 'invalid_token']));
            $conn->close();
            return;
        }

        // Mark as authenticated and allow further messaging
        $this->authenticated->attach($conn);
        $this->clients->attach($conn);
        $conn->send(json_encode(['type' => 'auth', 'status' => 'ok', 'payload' => $payload]));
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        if (!$this->authenticated->contains($from)) {
            $from->send(json_encode(['type' => 'error', 'message' => 'Not authenticated']));
            return;
        }
        // You can now implement topic routing or other actions here
        $from->send(json_encode(['type' => 'info', 'message' => 'Message received (authenticated)']));
    }

    public function onClose(ConnectionInterface $conn) {
        $this->authenticated->detach($conn);
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Throwable $e) {
        error_log("Auth WebSocket error: " . $e->getMessage());
        $conn->close();
    }

    protected function verifyJWT($token) {
        try {
            // Decode without verifying audience/issuer for simplicity; customize as needed
            $payload = JWT::decode($token, $this->secret, ['HS256']);
            return (array) $payload;
        } catch (\Throwable $e) {
            return null;
        }
    }
}

$server = IoServer::factory(new WsServer(new AuthenticatedWebSocket('your-secret-key')), 8080);
$server->run();
```

```jsonc
// composer.json (JWT dependency)
{
  "require": {
    "cboden/ratchet": "^0.4",
    "firebase/php-jwt": "^5.0"
  }
}
```

### Line-by-line explanation

- use Firebase\JWT\JWT;: Import JWT library to verify tokens.
- class AuthenticatedWebSocket implements MessageComponentInterface { ... }: WebSocket app that enforces authentication.
- protected $secret; protected $authenticated;: Store shared secret for token verification and a set of authenticated connections.
- public function __construct($secret = 'change-me-please') { ... }: Initialize state and the shared secret.
- public function onOpen(ConnectionInterface $conn) { ... }: Extract token from the query string, verify it, and either authorize the connection or close it.
- if (!$token) { ... } else { $payload = $this->verifyJWT($token); ... }: Guard against missing or invalid tokens.
- public function onMessage(ConnectionInterface $from, $msg) { ... }: Only authenticated clients can send messages; respond with an acknowledgment.
- protected function verifyJWT($token) { ... }: Decode and validate the JWT; return payload or null on failure.
- $server = IoServer::factory(new WsServer(new AuthenticatedWebSocket('your-secret-key')), 8080); $server->run();: Launch the secured WebSocket server.

## 4. Cross-Process Scaling and Durability with Redis Pub/Sub

PHP is traditionally request-based. To scale across multiple workers/processes and even multiple machines, you should decouple the real-time delivery mechanism from single-process memory. A common pattern is to use Redis as a pub/sub bus or as a shared state store. The server can subscribe to Redis channels and broadcast messages to connected clients, or publish client events to Redis for other services to consume.

Code snippet: a Redis-backed broadcaster (requires predis/predis or phpredis). This example shows a separate broadcaster that subscribes to a Redis channel and forwards messages to all connected clients subscribed to a topic. In production, you’d typically run this in a separate process/worker.

```php
// server-redis-broadcast.php (conceptual; uses predis)
require __DIR__ . '/vendor/autoload.php';
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class RedisBroadcastWebSocket implements MessageComponentInterface {
    protected $clients;
    protected $topics = [];
    protected $redis;

    public function __construct($redisHost = '127.0.0.1', $redisPort = 6379) {
        $this->clients = new \SplObjectStorage();
        $this->redis = new \Predis\Client(["host" => $redisHost, "port" => $redisPort]);
        // Example: subscribe to a Redis channel in a separate coroutine/loop (pseudo)
        // In real usage, run this in a separate process or thread-safe loop
        $this->redis->subscribe(['ws-broadcast'], function($message) {
            // Expect the message to be JSON with topic and payload
            $payload = json_decode($message['payload'], true);
            if (isset($payload['topic'], $payload['payload'])) {
                $topic = $payload['topic'];
                $this->broadcast($topic, json_encode(['type' => 'redis', 'payload' => $payload['payload']]));
            }
        });
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        // Optional: handle client messages and republish to Redis for cross-process distribution
        $data = json_decode($msg, true);
        if (!$data) return;
        if (($data['action'] ?? null) === 'publish') {
            $topic = $data['topic'] ?? null;
            $payload = $data['payload'] ?? null;
            if ($topic) {
                $this->redis->publish('ws-broadcast', json_encode(['topic' => $topic, 'payload' => $payload]));
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Throwable $e) {
        $conn->close();
    }

    protected function broadcast(string $topic, $payload) {
        foreach ($this->clients as $conn) {
            $conn->send($payload);
        }
    }
}

$server = IoServer::factory(new WsServer(new RedisBroadcastWebSocket()), 8080);
$server->run();
```

Note: The Redis integration above is illustrative. In a production-grade setup, you would typically run a dedicated Redis subscriber/relay process (or use a message broker like NATS, RabbitMQ, or Pusher) and wire it to your Ratchet server(s). The key takeaway is: decouple in-memory state from cross-process delivery and use an external pub/sub or message bus to achieve horizontal scalability.

### Line-by-line explanation

- $this->redis = new \Predis\Client(...);: Connect to Redis.
- $this->redis->subscribe(['ws-broadcast'], function($message) { ... });: Listen for messages on the ws-broadcast channel (illustrative; actual async subscribe requires a loop or separate daemon).
- onMessage: When a client asks to publish, push the payload to Redis for distribution to other processes.
- onOpen/onClose: Manage client lifecycle in the presence of multiple processes.

## X. Common Beginner Mistakes

1) Bad: Not cleaning up on disconnect
- Bad:
```php
public function onClose(ConnectionInterface $conn) {
    // do nothing
}
```
- Good:
```php
public function onClose(ConnectionInterface $conn) {
    foreach ($this->topics as $topic => $storage) {
        if ($storage->contains($conn)) {
            $storage->detach($conn);
        }
    }
    $this->clients->detach($conn);
}
```

2) Bad: Storing ephemeral state in static globals that don’t survive across workers
- Bad:
```php
class PubSubWebSocket {
    private static $topicSubs = [];
    public function onMessage(...) {
        self::$topicSubs[$topic][] = $conn; // loses data when server restarts or scales
    }
}
```
- Good: Use per-connection state with a durable store (e.g., Redis) or a centralized pub/sub mechanism for cross-process sharing.

3) Bad: Accepting arbitrary input without validation
- Bad:
```php
$payload = json_decode($msg, true)['payload'];
$this->broadcast($topic, $payload);
```
- Good:
```php
$payload = json_decode($msg, true);
if (!isset($payload['payload'])) {
    // reject
    return;
}
$clean = filter_var_array($payload['payload'], [
    'id' => FILTER_VALIDATE_INT,
    'message' => FILTER_UNSAFE_RAW, // or sanitize appropriately
]);
$this->broadcast($topic, json_encode(['payload' => $clean]));
```

4) Bad: Missing authentication/authorization
- Bad:
```php
$this->onMessage($conn, 'subscribe', 'orders');
```
- Good:
```php
// Enforce token check at onOpen and reject unauthenticated connections early
```

5) Bad: Not handling backpressure or message overflow
- Bad:
```php
foreach ($this->topicSubscribers[$topic] as $conn) {
    $conn->send($payload); // no guard for slow/blocked clients
}
```
- Good:
```php
// Implement write queue, partial sends, or drop policy for very large or slow connections
```

## Y. Why This Matters In Real Systems

- Real-time capabilities enable responsive UIs, faster analytics, and proactive alerts. In production, WebSockets are often deployed behind load balancers and multiple app servers. You must handle:
  - Horizontal scaling: Use a distributed pub/sub mechanism (Redis, NATS, etc.) to broadcast messages across processes/servers.
  - Fault tolerance: Detect dead connections, re-subscribe after failures, and implement reconnection strategies on clients.
  - Security: Validate tokens early, rotate credentials, and narrow channel permissions to least privilege.
  - Monitoring and observability: Log connection lifetimes, message rates, and latency; integrate with metrics platforms.
  - Backpressure and QoS: Guard against slow clients, implement message queues, and consider message prioritization.
  - Operational simplicity: Run WebSocket servers as separate services or containers and decouple from HTTP API services to isolate failure domains.

## Z. Study Questions

1) What is the primary benefit of using a Pub/Sub model over a naive broadcast in a WebSocket server?

2) How can you authenticate a WebSocket client in Ratchet, and why is handshake-time authentication important?

3) Why would you push WebSocket messages through Redis (or another broker) in a horizontally scaled PHP deployment?

4) What are some strategies to handle slow or unresponsive clients in a real-time WebSocket system?

5) How do you subscribe a client to a topic in the Pub/Sub example, and how would you broadcast a message to all subscribers of that topic?

## Exercise

Multi-part practical coding challenge to build a robust WebSocket feature using PHP Ratchet and a simple front-end client.

Part A — Build a Topic-based WebSocket Server with JWT Auth
- Create a Ratchet WebSocket server (server-auth-pubsub.php) that:
  - Requires a JWT token via the WebSocket URL query parameter token.
  - Validates the token on onOpen; closes the connection if invalid/missing.
  - Supports subscription to topics via {"action":"subscribe","topic":"<name>"}.
  - Supports publishing to a topic via {"action":"publish","topic":"<name>","payload":{...}}.
  - Broadcasts published payloads only to subscribers of the topic.

Part B — Simple Web Client to Exercise Features
- Build a minimal HTML/JS client (client-test.html) that:
  - Connects to ws://localhost:8080?token=<JWT> (you can generate a dummy JWT for testing if you have a local verifier).
  - Subscribes to at least two topics.
  - Publishes a sample message to a topic and logs received messages.

Part C — Basic Local Testing Script
- Create a simple PHP script (test-send.php) that uses a WebSocket client library (or a minimal HTTP wrapper to simulate a publish to token-protected channel) to demonstrate sending a message to a topic and receiving broadcasts.

Part D — Optional: Cross-Process Broadcast with Redis
- Extend Part A to publish messages to Redis on publish, and add a separate Redis subscriber process that forwards messages to all connected clients by topic.
- Document how you would run both processes in a real environment (e.g., Docker Compose with two services: ratchet-websocket and redis-broker) and how to scale horizontally behind a load balancer.

Deliverables:
- server-auth-pubsub.php (JWT-authenticated Pub/Sub WebSocket server)
- client-test.html (JS client for testing)
- test-send.php (optional test harness)
- A short README snippet that explains how to run the server, generate a test JWT (or bypass for testing), and verify real-time messages across multiple clients.

This lesson gives you a practical pathway to building secure, scalable, real-time features in a PHP backend, with concrete code you can run locally and extend into production-grade systems.