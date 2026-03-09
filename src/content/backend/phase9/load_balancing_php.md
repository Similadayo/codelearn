# Track: Backend Engineering — Phase 9: System Design & Scalability — Load Balancing & Horizontal Scaling (PHP)

Load balancing and horizontal scaling are foundational skills for building reliable, scalable backends. As traffic grows, you cannot rely on a single server to handle all requests. A well-designed load balancer distributes work across many PHP workers and hosts, while horizontal scaling adds more identical servers to meet demand. In PHP ecosystems, this often means coordinating stateless services, centralizing shared state (sessions, caches, queues), and ensuring health checks, fault tolerance, and predictable performance. This lesson will walk you through architectural patterns, practical PHP code, and production considerations to scale your PHP backends effectively.

## 1. Understanding Load Balancing and Horizontal Scaling

- What it is: 
  - Load balancing: A front-end component that distributes incoming requests across multiple backend servers.
  - Horizontal scaling: Adding more identical servers to handle increased load, rather than increasing the power of a single server.
- Why it matters in PHP:
  - PHP is process-per-request by design; ensuring statelessness and shared resources is essential to scale out.
  - Centralized session storage and distributed caches prevent session affinity problems and data inconsistencies.
  - Health checks and graceful degradation keep systems resilient under failure or high load.

## 2. Load Balancer Architectures and Practical Configuration

In many PHP deployments, a reverse proxy/load balancer sits in front of multiple application servers. Common choices: Nginx (with the stream module), HAProxy, or cloud-native load balancers. Below is a representative Nginx configuration snippet that load-balances across two PHP-FPM backends and includes basic health-check-style routing.

```nginx
# nginx.conf (excerpt) - simple round-robin with least_conn distribution
http {
    upstream php_backends {
        least_conn;
        server app1.internal:9000;
        server app2.internal:9000;
    }

    server {
        listen 80;
        server_name example.com;

        # Basic application routing
        location / {
            proxy_pass http://php_backends;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Simple health check endpoint (optional) that the LB can probe
        location = /healthz {
            access_log off;
            return 200 'ok';
        }
    }
}
```

### Line-by-line explanation
- http { ... }: Begin HTTP server configuration block.
- upstream php_backends { ... }: Define a named backend group “php_backends”.
- least_conn;: Load balancer strategy that routes new requests to the server with the fewest active connections.
- server app1.internal:9000; server app2.internal:9000;: Declare two backend PHP-FPM instances listening on port 9000.
- server { ... }: Define a front-end server that accepts client connections.
- listen 80;: Listen on port 80 for HTTP requests.
- server_name example.com;: Hostname for the site.
- location / { proxy_pass http://php_backends; ... }: Forward all normal traffic to the php_backends group.
- proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;: Preserve client information for the app, which is essential for logging, auth, and tracing.
- location = /healthz { ... }: Optional static health check endpoint that returns 200 OK when the server is reachable.
```

- Notes:
  - This is a minimal, single-region setup. In production, you’d typically place the load balancer in front of several AZs, enable TLS, add health checks to the LB, and configure timeouts and retries.
  - For sticky sessions (session affinity), you’d configure the LB to use a session cookie or switch to a centralized session store (see Section 3).

## 3. PHP Session Management in a Scaled Environment

Horizontal scaling requires moving away from per-process state. Two common approaches:

- Centralized session storage (recommended for PHP behind a load balancer).
- Stateless tokens (e.g., JWT) for authentication, leaving no server-side session.

Code examples below illustrate both.

### 3.1 Centralized session storage with Redis

```php
<?php
// Configure PHP to store sessions in Redis (requires redis extension)
ini_set('session.save_handler', 'redis');
ini_set('session.save_path', 'tcp://redis:6379'); // address of Redis server
session_start();

$_SESSION['user_id'] = 12345;
echo 'Hello user ' . $_SESSION['user_id'];
```

### Line-by-line explanation
- <?php: PHP start tag.
- ini_set('session.save_handler', 'redis');: Tell PHP to use Redis as the session handler.
- ini_set('session.save_path', 'tcp://redis:6379');: Point the session store to Redis (host named "redis" on port 6379).
- session_start();: Begin or resume the session. PHP reads or creates a session_id cookie and loads session data from Redis.
- $_SESSION['user_id'] = 12345;: Persist data in the central session store.
- echo 'Hello user ' . $_SESSION['user_id'];: Use the session data in the response.

### 3.2 Stateless tokens (JWT) for authentication

```php
<?php
// composer require firebase/php-jwt
require 'vendor/autoload.php';
use Firebase\JWT\JWT;

$secretKey = 'your-very-secret-key';

// Token issuance (e.g., on login)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_POST['user_id'] ?? null;
    if (!$userId) { http_response_code(400); echo json_encode(['error'=>'missing user_id']); exit; }

    $payload = [
        'sub' => (string)$userId,
        'iat' => time(),
        'exp' => time() + 3600 // 1 hour expiry
    ];
    $token = JWT::encode($payload, $secretKey);
    echo json_encode(['token' => $token]);
    exit;
}

// Token verification (e.g., on protected endpoints)
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/Bearer\s+(.*)$/', $authHeader, $matches)) {
    $token = $matches[1];
    try {
        $decoded = JWT::decode($token, $secretKey, ['HS256']);
        echo json_encode(['sub' => $decoded->sub]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => 'invalid token']);
    }
} else {
    http_response_code(401);
    echo json_encode(['error' => 'missing token']);
}
```

### Line-by-line explanation
- require 'vendor/autoload.php'; use Firebase\JWT\JWT;: Bring in the JWT library.
- $secretKey = 'your-very-secret-key';: Shared secret used to sign and verify tokens.
- Token issuance block: creates a payload with subject, issued-at, and expiry; encodes it into a token.
- If POST with user_id, generate and return a token.
- Token verification block: reads the Authorization header, extracts the Bearer token, and decodes it verifying HS256 signature.
- If decoding fails or token missing, return an appropriate HTTP error.

Notes:
- JWT-based stateless authentication scales well across horizontally scaled PHP services.
- For sensitive data, use short expiry times and rotate signing keys.

## 4. Health Checks and Stateless Health Endpoints

Health checks are critical for auto-scaling and automated recovery. They should be quick, deterministic, and reflect the service's ability to process requests.

```php
<?php
// healthz.php
http_response_code(200);
header('Content-Type: application/json');
$ok = true;
$details = [];

// Optional DB check
try {
    $pdo = new PDO('mysql:host=db.internal;dbname=app', 'dbuser', 'dbpass', [
        PDO::ATTR_TIMEOUT => 1,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    $pdo->query('SELECT 1');
} catch (Exception $e) {
    $ok = false;
    $details[] = 'db:down';
}

// Optional cache check (Redis)
try {
    $redis = new Redis();
    $redis->connect('redis', 6379);
    $redis->ping();
} catch (Exception $e) {
    $ok = false;
    $details[] = 'cache:down';
}

if (!$ok) {
    http_response_code(503);
}
echo json_encode([
    'status' => $ok ? 'ok' : 'degraded',
    'details' => $details
]);
```

### Line-by-line explanation
- http_response_code(200); header(...): Prepare the response; default OK unless we detect issues.
- $ok = true; $details = []: Track health status and explanations.
- DB check: Try to connect and run a simple query; on failure set ok to false and record detail.
- Cache check: Try to connect to Redis and ping; on failure update status and detail.
- if (!$ok) http_response_code(503);: Signal service unavailability to the LB.
- echo json_encode(...): Return a concise health payload for the orchestrator.

## 5. Horizontal Scaling Patterns, Caching and Data Stores

To scale reads and reduce latency, introduce caching, distributed stores, and asynchronous work queues. Below is a simple PHP caching pattern using Redis to cache expensive computations or views.

```php
<?php
require 'vendor/autoload.php';
$redis = new Redis();
$redis->connect('redis', 6379);

$cacheKey = 'home:render:v1';
if ($redis->exists($cacheKey)) {
    echo $redis->get($cacheKey);
    exit;
}

// Simulate expensive rendering
function renderHomePage() {
    sleep(1); // pretend expensive operation
    return '<html>Cached Home Page at ' . date('H:i:s') . '</html>';
}
$html = renderHomePage();

// Cache for 60 seconds
$redis->setex($cacheKey, 60, $html);

echo $html;
```

### Line-by-line explanation
- require 'vendor/autoload.php'; $redis = new Redis();: Bootstrap Redis client.
- $redis->connect('redis', 6379);: Connect to Redis, assuming a service named "redis".
- $cacheKey = 'home:render:v1';: Key under which we store the rendered page.
- if ($redis->exists($cacheKey)) { echo $redis->get($cacheKey); exit; }: Fast path: serve cached content if present.
- function renderHomePage() { ... }: Simulated expensive rendering function.
- $html = renderHomePage();: Compute content when not cached.
- $redis->setex($cacheKey, 60, $html);: Store content in cache with 60-second TTL.
- echo $html;: Deliver content to the client.

Notes:
- Centralized caches (Redis, Memcached) enable rapid scaling across multiple app servers.
- Consider cache invalidation strategies and cache coherence when data changes.

## 6. X. Common Beginner Mistakes

- Pitfall A: Relying on sticky sessions (server-local state)
  - Bad:
    ```php
    <?php
    session_start();
    // Server-local session state (not shared across instances)
    $_SESSION['cart'] = $_SESSION['cart'] ?? [];
    $_SESSION['cart'][] = $_GET['item'] ?? 'default';
    echo json_encode($_SESSION['cart']);
    ```
  - Good:
    Use Redis-backed sessions (see Section 3.1) or switch to JWT-based stateless sessions.
  - Explanation: Sticky sessions defeat horizontal scaling if your LB doesn’t consistently route the user to the same server, and per-process memory is not shared.

- Pitfall B: SQL injection and unsafe queries in a scaled setup
  - Bad:
    ```php
    <?php
    $name = $_GET['name'];
    $sql = "SELECT * FROM users WHERE name = '$name'";
    $rows = $pdo->query($sql);
    ```
  - Good:
    ```php
    <?php
    $name = $_GET['name'];
    $stmt = $pdo->prepare("SELECT * FROM users WHERE name = :name");
    $stmt->execute(['name' => $name]);
    $rows = $stmt->fetchAll();
    ```
  - Explanation: Prepared statements prevent SQL injection across all instances behind a load balancer.

- Pitfall C: Not configuring timeouts and retries for external calls
  - Bad:
    ```php
    <?php
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->query('SELECT 1');
    ```
  - Good:
    ```php
    <?php
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_TIMEOUT => 1, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->query('SELECT 1');
    ```
  - Explanation: Timeouts prevent cascading delays during autoscaling and high load.

- Pitfall D: Inefficient caching strategy without invalidation
  - Bad:
    ```php
    // Never invalidates; stale content
    echo $redis->get('page');
    ```
  - Good:
    - Use cache TTLs and explicit invalidation hooks when data changes.
  - Explanation: Stale cache undermines correctness under scale.

## 7. Why This Matters In Real Systems

- Reliability: Load balancers can detect unhealthy instances and stop routing traffic to them, improving uptime.
- Scalability: Horizontal scaling allows you to add more PHP workers across multiple servers, reducing latency during peak load.
- Fault tolerance: Centralized session stores and caches minimize single points of failure; redis clusters, managed cache services, and queue backends can be designed to be highly available.
- Observability: Health checks, metrics, and tracing are essential to diagnose bottlenecks and automate recovery.
- Security: Ensure TLS termination, secure cookie handling, and proper authentication/authorization across distributed services.

## 8. Z. Study Questions

1) What is the difference between load balancing and horizontal scaling, and how do they complement each other in a PHP backend?
2) Why is centralizing session storage advantageous in a multi-server PHP deployment?
3) How does a health check endpoint help an orchestrator decide when to remove a node from the pool?
4) Explain how Redis caching can help reduce load on your PHP application servers.
5) What are two stateless authentication approaches and when would you prefer each?

## 9. Exercise

Part A — Configure a basic load-balanced PHP environment (conceptual)
- Task: Write an Nginx configuration snippet that load-balances traffic between two PHP-FPM backends (app1 and app2) and includes a simple health endpoint. Provide the upstream and server blocks, plus a brief note on how you’d deploy across AZs.
- Deliverables: A complete nginx.conf excerpt with comments describing each section.

Part B — Implement Redis-backed PHP sessions
- Task: Create a small PHP application that:
  - Stores user_id in a Redis-backed session.
  - Exposes an endpoint /visit that increments a per-user visit counter stored in the session.
- Deliverables: Two PHP files (index.php and healthz.php) plus a short README describing prerequisites (Redis, PHP Redis extension) and how to run (Docker-compose or local).

Part C — Add a cacheable endpoint with Redis
- Task: Build a PHP script /render that simulates an expensive render and caches the result in Redis for 45 seconds. If the content is cached, return it immediately; otherwise generate content, cache, and return.
- Deliverables: A single PHP file with a mock render function and Redis cache integration.

Part D — Quick design questions
- Task: Describe how you would extend the above setup to handle cross-AZ deployments, including health checks, TLS termination, and cache invalidation after data changes.
- Deliverables: A short write-up outlining architecture decisions, with bullets on fault tolerance, data consistency, and operational considerations.

Note: For all code samples, assume a Unix-like environment, PHP 8.x, Redis available, and a basic understanding of deploying Nginx as a front-end reverse proxy.