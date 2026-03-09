# System Design Interview Walkthroughs in PHP

Welcome to Phase 9 of our Track: Backend Engineering. This module focuses on System Design & Scalability, with a practical emphasis on System Design Interview Walkthroughs using PHP. You’ll learn how to structure a design discussion like a real interview, reason about trade-offs, and implement representative components in PHP to illustrate the concepts. The goal is to blend communication, architectural thinking, and concrete PHP examples that you can adapt in real-world systems.

## 1. Clarify Requirements and Define Success Criteria

In any system design interview, success starts with clarifying scope, constraints, and success metrics. You must translate vague prompts into concrete requirements, non-functional targets, and risk assessments. This section shows how to structure a PHP-based walkthrough that clarifies requirements and captures a design contract.

### Code: Design spec validator (PHP)

```php
<?php
// design_walkthrough.php
function validate_spec(array $spec): bool {
    $required = ['service', 'latency_ms', 'throughput_qps', 'data_persistence'];
    foreach ($required as $r) {
        if (!array_key_exists($r, $spec)) {
            throw new RuntimeException("Missing required field: $r");
        }
        if (empty($spec[$r])) {
            throw new RuntimeException("Invalid value for: $r");
        }
    }
    // Optional: more validation
    return true;
}

$spec = [
    'service' => 'NotificationService',
    'latency_ms' => 200,
    'throughput_qps' => 500,
    'data_persistence' => 'Postgres + Redis',
    'requirements' => ['idempotency', 'at-least-once delivery']
];

try {
    if (validate_spec($spec)) {
        echo "Spec validated: design scope is clear.";
    }
} catch (RuntimeException $e) {
    echo "Spec validation failed: " . $e->getMessage();
}
```

### Line-by-line explanation

- Line 1: Opening PHP tag.
- Line 2: Define function validate_spec that accepts an associative array representing the design spec.
- Line 4: List of required fields that must appear in the spec.
- Line 5-9: Loop through required fields; throw an exception if a key is missing.
- Line 10-13: If a required value is present but empty, throw an exception.
- Line 16: Declare a sample spec describing a Notification service with latency, throughput, and persistence choices.
- Line 26-31: Attempt to validate; print success message or catch and print an error.

Discussion for interviews:
- Clarify data plane vs control plane, latency/throughput targets, durability requirements, and deployment topology (monolith vs microservices).
- Record constraints such as budget, language, hosting, and compliance.
- Agree on validation tests and a minimal success criteria (e.g., latency < 200 ms 95th percentile, 2x replica durability, etc.).

## 2. High-Level Architecture Sketch: Components and Data Flow

A strong design walk-through includes an abstract architecture with components, data flow, and failure modes. In PHP ecosystems, common patterns are API gateways, stateless services, queues, caches, and data stores. Here we illustrate a simple event-driven architecture for a Notification service using Redis as the backbone of the queue and a SQL database as the source of truth.

### Code: Producer and Worker (PHP) using Redis queue (LPUSH/BRPOP)

Producer: enqueue_notification.php
```php
<?php
// enqueue_notification.php
require 'vendor/autoload.php'; // if you use composer with phpredis or predis

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$payload = [
    'user_id' => $_POST['user_id'] ?? null,
    'message' => $_POST['message'] ?? '',
    'created_at' => (new DateTime())->format('Y-m-d H:i:s'),
    'id' => bin2hex(random_bytes(8)),
];

if (empty($payload['user_id']) || empty($payload['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id and message are required']);
    exit;
}

// Push to a Redis list as a queue
$redis->lPush('notifications:queue', json_encode($payload));

http_response_code(202);
echo json_encode(['status' => 'enqueued', 'payload_id' => $payload['id']]);
```

Worker: process_notifications.php
```php
<?php
// process_notifications.php
require 'vendor/autoload.php';

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

while (true) {
    // BRPOP blocks for up to 5 seconds if queue is empty
    $res = $redis->brPop('notifications:queue', 5);
    if ($res === false) {
        // timeout, loop again or break to gracefully stop
        continue;
    }

    [$queue, $payload] = $res;
    $payload = json_decode($payload, true);

    // Simulated send
    $success = send_notification($payload['user_id'], $payload['message']);

    // Persist outcome (pseudo)
    log_delivery($payload['id'], $success);
}

function send_notification($user_id, $message): bool {
    // In real life: call email/SMS/push provider
    // Here we simulate success for demonstration
    echo "Sending to user {$user_id}: {$message}\n";
    return true;
}

function log_delivery(string $id, bool $success): void {
    // Simplified logging; replace with DB write for idempotency, auditing
    $status = $success ? 'delivered' : 'failed';
    $log = sprintf("[%s] Notification %s: %s\n",
        (new DateTime())->format('Y-m-d H:i:s'), $id, $status);
    file_put_contents('/tmp/notifications.log', $log, FILE_APPEND);
}
```

### Line-by-line explanation

- Producer script (enqueue_notification.php)
- Line 1: PHP tag.
- Line 4-6: Require autoload (if using Composer). Optional for simple setups.
- Line 8-11: Connect to Redis at localhost:6379.
- Lines 13-19: Build a payload including user_id, message, timestamp, and a random id.
- Lines 21-26: Validate required fields; respond with 400 if missing.
- Line 29: Push payload onto the Redis list queue using LPUSH.
- Lines 31-33: Return a 202 Accepted with the payload id.

- Worker script (process_notifications.php)
- Lines 4-7: PHP tag, autoload, connect to Redis.
- Lines 9-18: Infinite loop; BRPOP with timeout 5 seconds to wait for messages. If no message, continue.
- Line 19-20: Decode payload JSON.
- Line 23: Call a simulated send function.
- Lines 26-29: Log delivery result (could be a DB write in production).

- Helper functions
- send_notification: Simulate sending; replace with provider API calls in production.
- log_delivery: Append a log line to a file; in production use a durable store.

Interview notes:
- This illustrates an asynchronous design where API requests return quickly and actual work happens in a worker. It also demonstrates simple at-least-once processing semantics (the broker guarantees delivery, the worker acknowledges by logging successfully delivered).

## 3. Data Modeling and API Design

Data modeling is central to a scalable system. For a Notification service, you typically store the notification in a durable store for auditing and a read model for fast access. Below is a straightforward relational schema for notifications, plus a PHP-driven API example to create a notification, returning an id and status.

### Code: SQL schema and PHP API for creating notifications

SQL: create_notifications.sql
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
```

PHP API: create_notification.php
```php
<?php
// create_notification.php
require 'vendor/autoload.php';
$db = new PDO('pgsql:host=127.0.0.1;dbname=notifications', 'dbuser', 'dbpass', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$payload = json_decode(file_get_contents('php://input'), true);
$user_id = $payload['user_id'] ?? null;
$message = $payload['message'] ?? null;

if (!$user_id || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id and message are required']);
    exit;
}

$id = bin2hex(random_bytes(16));
$stmt = $db->prepare('INSERT INTO notifications (id, user_id, message, status) VALUES (:id, :user_id, :message, :status)');
$stmt->execute([
    ':id' => $id,
    ':user_id' => $user_id,
    ':message' => $message,
    ':status' => 'pending',
]);

http_response_code(201);
echo json_encode(['id' => $id, 'status' => 'pending']);
```

### Line-by-line explanation

- create_notifications.sql
- Creates a notifications table with id, user_id, message, status, and timestamps.
- Adds an index on user_id for fast reads per user.

- create_notification.php
- Lines 1-4: PHP tag, autoload, and PDO DB connection to Postgres.
- Lines 6-12: Decode input JSON and extract user_id and message; validate presence.
- Lines 14-21: Generate a unique id for the notification; insert a row with status 'pending'.
- Lines 23-26: Return 201 Created with the new id and initial status.

Design notes:
- This schema supports idempotency at the API layer via a client-provided idempotency key, which you can also implement with a dedicated idempotency table.
- In production, consider a read model separate from the write model, and consider a pub/sub channel for notifying downstream services when a notification is enqueued.

## 4. Caching, Rate Limiting, and Reliability Patterns

To scale, you often combine caching for hot reads, rate limiting to prevent abuse, and reliability patterns to ensure durability and correctness in distributed environments.

### Code: Simple per-user rate limiter using Redis (in PHP)

```php
<?php
// rate_limit.php
require 'vendor/autoload.php';
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

function rate_limit_ok($redis, string $user_id, int $limit = 100, int $window_seconds = 60): bool {
    $key = "rate:$user_id";
    $now = time();
    // INCR: atomically increments the counter
    $count = $redis->incr($key);
    if ($count === 1) {
        // First hit in this window; set TTL
        $redis->expire($key, $window_seconds);
    }
    return $count <= $limit;
}

// Example usage
$user_id = $_GET['user_id'] ?? 'anonymous';
$allowed = rate_limit_ok($redis, $user_id, 50, 60);
echo $allowed ? "OK" : "Rate limit exceeded";
```

### Line-by-line explanation

- Line 1-3: PHP tag, autoload, and Redis connection.
- rate_limit_ok function:
  - Line 9: Create a Redis key scoped to user.
  - Line 10: Get current time (not strictly needed for Redis, kept for clarity).
  - Line 12: Atomically increment the user’s counter in Redis.
  - Line 13-15: If this is the first hit in the window, set a TTL so the window slides.
  - Line 16: Return true if the count is within the limit; false otherwise.
- Usage example:
  - Lines 19-21: Acquire a user_id and call rate_limit_ok; print status.

Caching notes:
- Cache hot read data such as user profiles, notification counts, or recent activity to reduce DB pressure. In PHP, using Redis as a distributed cache is common.
- Always have a fallback to the source of truth if the cache misses.

## 5. Reliability, Observability, and API Design

Production-grade systems require idempotency, traceability, and graceful error handling. This section shows how to implement idempotent endpoints and basic observability hooks in PHP.

### Code: Idempotent enqueue endpoint using Redis as an idempotency store

```php
<?php
// enqueue_idempotent.php
require 'vendor/autoload.php';
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$message = $input['message'] ?? null;
$idempotency_key = $input['idempotency_key'] ?? null;

if (!$user_id || !$message || !$idempotency_key) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id, message, and idempotency_key are required']);
    exit;
}

// Check if we've already processed this idempotency key
$key = "idempotency:$idempotency_key";
if ($redis->exists($key)) {
    // Return the previously stored result
    $result = json_decode($redis->get($key), true);
    http_response_code(200);
    echo json_encode($result);
    exit;
}

// Enqueue work
$payload = [
    'user_id' => $user_id,
    'message' => $message,
    'id' => bin2hex(random_bytes(8)),
    'created_at' => (new DateTime())->format('Y-m-d H:i:s')
];
$redis->lPush('notifications:queue', json_encode($payload));

// Persist idempotent result
$result = ['status' => 'enqueued', 'payload_id' => $payload['id']];
$redis->set($key, json_encode($result), 3600); // cache result for 1 hour

http_response_code(200);
echo json_encode($result);
```

### Line-by-line explanation

- Line 1-4: PHP tag, autoload, and Redis connection.
- Line 6-11: Read input, validate required fields including idempotency_key.
- Line 14-18: Check if the idempotency key already exists; if so, return the cached result to make the operation idempotent.
- Line 21-28: If not seen before, enqueue the notification payload to the queue.
- Line 31-35: Build a result object and store it in Redis under the idempotency key to guarantee the same result on repeat requests.
- Line 37-39: Respond with the result.

Why this matters in real systems:
- Idempotency keys prevent duplicate side effects when clients retry due to network failures.
- Observability hooks (structured logs, metrics) help you monitor throughput, error rates, and latency.
- In production, you would typically추 store idempotency results in a durable store (e.g., a DB row with a unique constraint) and track retries with a backoff policy.

## X. Common Beginner Mistakes

Below are real pitfalls with bad vs good code, illustrating how small differences can dramatically impact reliability and scalability.

### 1) Pitfall: No idempotency in write endpoints

Bad:
```php
// enqueue_without_idempotency.php
$payload = json_decode(file_get_contents('php://input'), true);
$redis->lPush('notifications:queue', json_encode($payload));
```

Good:
```php
// enqueue_idempotent.php (see Section 5)
```

Line-by-line explanation:
- Bad example shows duplicates if the client retries; no guard against duplicates.
- Good example uses an idempotency key to ensure at-most-once behavior for a given request.

### 2) Pitfall: Blocking work in request path

Bad:
```php
// Synchronous sleep in request
sleep(2);
echo json_encode(['status' => 'ok']);
```

Good:
```php
// Move long work to a background worker (as shown in Section 2)
```

Line-by-line explanation:
- Blocking calls in the HTTP handler increase tail latency and reduce throughput.
- Offload heavy tasks to asynchronous workers to keep API latency predictable.

### 3) Pitfall: Cold cache misses without graceful fallback

Bad:
```php
// Direct cache-only read
$data = $cache->get('profile:12345');
echo json_encode($data);
```

Good:
```php
// Cache with DB fallback
$data = $cache->get('profile:12345');
if ($data === false) {
    $data = fetch_from_db(12345);
    $cache->set('profile:12345', $data, 300);
}
echo json_encode($data);
```

Line-by-line explanation:
- The bad approach assumes cache availability and always serves stale or missing data.
- The good approach uses cache with a fallback to a durable data store and updates the cache on a miss.

### 4) Pitfall: Inconsistent data models across services

Bad:
- Each service writes its own copy of notifications schema, leading to drift.

Good:
- Define a shared canonical data model with versioning; use a single source of truth plus read models tailored for each service.

Line-by-line explanation:
- Inconsistent schemas lead to brittle migrations and hard-to-debug bugs in distributed systems.

### 5) Pitfall: Missing observability

Bad:
```php
// No metrics or structured logs
```

Good:
```php
// Lightweight metrics and logging
error_log(json_encode(['event' => 'enqueue', 'user_id' => $user_id, 'id' => $payload['id']]));
// Increment in-process metrics or send to a metrics backend
```

Line-by-line explanation:
- Without observability, diagnosing latency spikes, dropped messages, and failures becomes very difficult in production.

## Y. Why This Matters In Real Systems

In real systems, you’ll be dealing with scale, reliability, and maintainability. This section contextualizes the concepts you’ve learned and explains how they fit into production realities.

- Stateless services and horizontal scaling: PHP apps (especially with PHP-FPM) scale by adding more workers and nodes; keep services stateless and lean in-memory.
- Asynchronous processing: Use queues (Redis, RabbitMQ) to decouple request handling from heavy work, enabling burst handling and smoother latency profiles.
- Durable data and idempotency: Always design write paths to be idempotent when clients might retry. Persist idempotency keys to a durable store to avoid duplicate processing.
- Caching strategies: Cache hot reads to reduce DB load, with correct cache invalidation and per-operation TTLs to prevent stale data.
- Observability: Instrument metrics (latency percentiles, error rates, queue depth) and structured logs to diagnose bottlenecks and SRE alerts.
- Operational realism: Production-grade PHP often uses a task runner or daemon process for workers, a proper web server (Nginx) with PHP-FPM pools, and a robust deployment pipeline with monitoring and rollback capabilities.

## Z. Study Questions

1. What is idempotency in the context of API design, and why is it important for system reliability?
2. How would you design an at-least-once delivery system using a queue and a worker? What are the potential pitfalls?
3. Explain the trade-offs between using Redis as a cache vs a durable database for the read model.
4. Describe how rate limiting per user can protect a system, and what considerations you would have in a distributed environment.
5. What are common signs of a bottleneck in a system design interview, and what patterns would you apply to mitigate them?

## Exercise

Practical multi-part coding challenge: Build a minimal PHP-based notification pipeline with an API, a queue, and a worker, incorporating idempotency and rate limiting. Use Redis for the queue and idempotency storage, and PostgreSQL for the durable write.

Part A — Set up a small PHP project (you can reuse the code blocks from sections above)
- Create a PostgreSQL table: notifications(id UUID, user_id VARCHAR, message TEXT, status VARCHAR, created_at TIMESTAMP)
- Implement an API endpoint POST /enqueue that accepts:
  - user_id (string)
  - message (string)
  - idempotency_key (string)
  - It should enforce idempotency using a Redis-based idempotency store (see Section 5)
  - It should enforce per-user rate limiting (see Section 4)
  - It should enqueue the payload to a Redis queue "notifications:queue"
  - It should return immediately with a status that the request is enqueued or already processed

Part B — Implement a Worker
- Create a PHP script (worker.php) that BRPOPs from the queue and writes a record to the PostgreSQL table with status "delivered"
- Logs progress to a file and stdout for visibility
- Ensure the worker can be rotated and restarted without losing state

Part C — Observability and Tests
- Add simple logging around enqueue and delivery
- Provide a minimal test harness that sends a few enqueue requests (some with the same idempotency_key) and shows idempotent behavior
- Provide a simple script to query the PostgreSQL table to verify inserts and statuses

Part D — Deployment Notes
- Explain how you would deploy this in production (e.g., Nginx + PHP-FPM, Redis, PostgreSQL, a worker supervisor like Supervisor or systemd, and basic monitoring/alerts)

Note: The code in this lesson is intentionally compact and focused on illustrating the concepts for interview walkthroughs. In production, you would separate concerns into discrete services, use frameworks for routing (e.g., Slim or Laravel), add robust error handling, authentication, schema migrations, and stronger observability.

If you’d like, I can provide a starter project layout (file tree), ready-to-run Docker Compose configuration, and a minimal set of unit tests to accompany this lesson.