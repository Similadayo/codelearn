# Microservices vs Monolith — When & Why (PHP)

In professional backend engineering, choosing between a monolithic application and a microservices architecture influences deployment speed, team organization, fault tolerance, and data management. This lesson teaches you how to reason about these choices, demonstrates concrete PHP code for both styles, and provides practical migration patterns and pitfalls to avoid. By the end, you’ll understand not just the theory, but how to apply it to real systems with clear tradeoffs.

## 1. 1. What Monoliths and Microservices Are (PHP Concrete Examples)

- Monolith: a single codebase and runtime that handles multiple domain concerns in one process. Simpler to start, easier to reason about in small teams, and typically lower latency due to in-process calls.
- Microservices: independent services, each with its own runtime and data store, communicating over network boundaries. Better fault isolation, independent deployments, and polyglot choices, but adds operational complexity.

Code examples below illustrate a minimal PHP monolith versus microservices that would be deployed and scaled independently.

### Monolith PHP Example (single process, two modules)

```php
<?php
// monolith.php
// A tiny in-process "monolith" with User and Order services living in the same app
class Database {
    public array $users = [];
    public array $orders = [];
}

class UserService {
    private Database $db;
    public function __construct(Database $db) { $this->db = $db; }

    public function createUser(string $name): array {
        $id = count($this->db->users) + 1;
        $user = ['id' => $id, 'name' => $name];
        $this->db->users[$id] = $user;
        return $user;
    }

    public function getUser(int $id): ?array {
        return $this->db->users[$id] ?? null;
    }
}

class OrderService {
    private Database $db;
    public function __construct(Database $db) { $this->db = $db; }

    public function createOrder(int $userId, string $item): array {
        $id = count($this->db->orders) + 1;
        $order = ['id' => $id, 'user_id' => $userId, 'item' => $item];
        $this->db->orders[$id] = $order;
        return $order;
    }

    public function listOrdersForUser(int $userId): array {
        return array_values(array_filter($this->db->orders, fn($o) => $o['user_id'] === $userId));
    }
}

$db = new Database();
$userService = new UserService($db);
$orderService = new OrderService($db);

// Example workflow
$user = $userService->createUser('Alice');
$order = $orderService->createOrder($user['id'], 'Widget A');

// Return a combined view
echo json_encode(['user' => $user, 'order' => $order]);
```

### Line-by-line Explanation

- Line 1-2: Start of the PHP file and comment explaining the monolith concept.
- Lines 4-9: Define a simple in-memory Database class to store users and orders.
- Lines 11-19: UserService with constructor injection of the shared Database and methods to create/get users.
- Lines 21-31: OrderService with constructor injection and methods to create/list orders.
- Lines 33-39: Instantiate the shared Database and both services, simulate a small workflow by creating a user and an order.
- Line 42: Output a consolidated JSON payload showing created user and order.

## 2. 2. Microservices in PHP (Two Small Services + Optional Gateway)

In a microservices approach, User and Order functionality lives in separate services. Each service has its own storage (data boundary) and independent deployment. For demonstration, we’ll implement tiny services that store data in separate JSON files to simulate independent persistence.

### 2a. User Service (user-service.php)

```php
<?php
// user-service.php
$storageDir = __DIR__ . '/storage';
if (!is_dir($storageDir)) mkdir($storageDir, 0777, true);
$path = $storageDir . '/users.json';
if (!file_exists($path)) file_put_contents($path, json_encode([]));

$method = $_SERVER['REQUEST_METHOD'];
$payload = json_decode(file_get_contents('php://input'), true);
$users = json_decode(file_get_contents($path), true);

if ($method === 'POST') {
    $name = $payload['name'] ?? null;
    if (!$name) { http_response_code(400); echo json_encode(['error' => 'name required']); exit; }

    $id = count($users) + 1;
    $new = ['id' => $id, 'name' => $name];
    $users[$id] = $new;
    file_put_contents($path, json_encode($users));
    echo json_encode($new);

} elseif ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if ($id && isset($users[$id])) {
        echo json_encode($users[$id]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'not found']);
    }

} else {
    http_response_code(405);
}
```

### 2b. Product (Item) Service (product-service.php)

```php
<?php
// product-service.php
$path = __DIR__ . '/storage/products.json';
if (!file_exists($path)) file_put_contents($path, json_encode([]));

$method = $_SERVER['REQUEST_METHOD'];
$payload = json_decode(file_get_contents('php://input'), true);
$products = json_decode(file_get_contents($path), true);

if ($method === 'POST') {
    $name = $payload['name'] ?? null;
    $price = $payload['price'] ?? null;
    if (!$name || !is_numeric($price)) { http_response_code(400); echo json_encode(['error' => 'name and numeric price required']); exit; }

    $id = count($products) + 1;
    $new = ['id' => $id, 'name' => $name, 'price' => (float)$price];
    $products[$id] = $new;
    file_put_contents($path, json_encode($products));
    echo json_encode($new);

} elseif ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if ($id && isset($products[$id])) echo json_encode($products[$id]);
    else echo json_encode(array_values($products));

} else {
    http_response_code(405);
}
```

### 2c. Simple API Gateway (gateway.php) — Optional Aggregation

```php
<?php
// gateway.php
function fetchJson($url) {
  $ctx = stream_context_create(['http' => ['timeout' => 2]]);
  $resp = @file_get_contents($url, false, $ctx);
  if ($resp === false) return null;
  return json_decode($resp, true);
}

$path = $_SERVER['REQUEST_URI'];

// Simple aggregated endpoint
if (strpos($path, '/summary') === 0) {
  $userId = $_GET['user_id'] ?? null;
  if (!$userId) { http_response_code(400); echo json_encode(['error' => 'user_id required']); exit; }

  // In a real deployment, these would be network calls to separate services
  $user = fetchJson('http://localhost/user-service.php?id=' . urlencode($userId));
  // Example: fetch adds a list of available products
  $products = fetchJson('http://localhost/product-service.php');
  echo json_encode(['user' => $user, 'products' => $products]);
} else {
  http_response_code(404);
}
```

### Line-by-line Explanation

- user-service.php: 
  - Lines 4-9: Prepare the storage directory and user JSON file.
  - Line 11: Determine HTTP method.
  - Lines 12-20: If POST, validate input, assign a new ID, persist the user, and return created user.
  - Lines 22-34: If GET, return a specific user if exists.
  - Lines 36-40: Return 405 for unsupported methods.

- product-service.php:
  - Lines 3-9: Prepare storage for products.
  - Line 11: Determine HTTP method.
  - Lines 12-21: POST creates a product with a name and numeric price.
  - Lines 23-31: GET returns a specific product or all products.
  - Lines 33-37: 405 for unsupported methods.

- gateway.php:
  - Lines 4-8: Helper to fetch JSON from a URL with a timeout.
  - Line 11: Route handling; support /summary with user_id.
  - Lines 13-20: Fetch user and product data from respective services and return aggregated result.

## 3. 3. Common Beginner Mistakes — 3+ Pitfalls with Bad vs Good Code

X: Common mistakes when choosing or evolving between monoliths and microservices. See bad vs good code side-by-side for clarity.

### Pitfall 1: Shared database across services (tightly coupled boundaries)

- Bad: Two services write to the same table or rely on the same schema, creating coupling and migration headaches.

```php
// Bad: Service A writes to a shared "orders" table
$db->query("INSERT INTO orders (user_id, item) VALUES (?, ?)", [$userId, $item]);
```

```php
// Good: Each service uses its own boundary (distinct schemas/databases)
$dbA->query("INSERT INTO orders_service_a (user_id, item) VALUES (?, ?)", [$userId, $item]);
$dbB->query("INSERT INTO orders_service_b (order_id, status) VALUES (?, ?)", [$orderId, 'created']);
```

### Pitfall 2: Synchronous cross-service calls causing cascading latency/failures

- Bad: UI or a service calls another service directly, creating latency chains.

```php
// Bad: UI directly calls Order service after User service (tight coupling)
$response = file_get_contents('http://orders-service.local/create?user_id=1&item=Widget');
```

```php
// Good: Front-end uses a gateway / façade to orchestrate calls
$response = file_get_contents('https://gateway.local/checkout?user_id=1&item=Widget');
```

### Pitfall 3: No idempotency and no retry/compensation strategy

- Bad: POST requests may create duplicates on retry.

```php
// Bad: POST /orders creates a new order every time
$order = createOrder($_POST['user_id'], $_POST['item']);
```

```php
// Good: Idempotent endpoint with Idempotency-Key
$key = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? null;
if ($cache->exists($key)) {
  return $cache->get($key); // return previous result
}
$order = createOrder($_POST['user_id'], $_POST['item']);
$cache->set($key, $order);
```

### Pitfall 4: No observability (tracing, metrics, logs)

- Bad: Each service logs independently without correlation data.

```php
// Bad: Independent logs, no trace context
error_log("UserService: created user ".$id);
```

```php
// Good: Use a trace_id across services
$traceId = $_SERVER['HTTP_X_TRACE_ID'] ?? uniqid('trace_', true);
error_log("[$traceId] UserService: created user ".$id);
```

### Pitfall 5: Hidden business logic duplication

- Bad: Duplicated total calculation or validation logic in multiple services.

```php
// Bad: Both services implement calculateTotal separately
function calculateTotal($items) { /* sum */ }
```

```php
// Good: Centralized contract or library (or API contract) shared via a public interface
// Service A calls shared library via a service API; no duplicate logic
```

## 4. 4. Why This Matters In Real Systems — Production Context

- Deployment and autonomy: Microservices enable independent deployments, faster iteration for teams, and easier scaling of hot paths. Monoliths are easier to start, require fewer moving parts, and have simpler observability early on.
- Data management: Monoliths can guarantee strong consistency with a single transaction boundary. Microservices favor bounded contexts and eventual consistency, requiring patterns like sagas for cross-service workflows.
- Reliability and fault isolation: Microservices can isolate failures to a service, limiting blast radius. A monolith failure can affect the entire system.
- Observability and tracing: Distributed systems demand end-to-end tracing, metrics, and centralized logging to diagnose cross-service interactions.
- Team organization: Microservices align with small, autonomous teams owning single services; monoliths suit smaller teams with shared ownership.

In real systems, a staged approach often works best: start with a well-structured monolith, modularize into a “modular monolith” or bounded contexts, and gradually extract services as requirements for scalability and autonomy grow.

## 5. 5. Study Questions — 5 Recall Questions

1) What is the primary difference between a monolith and a microservices architecture in terms of data ownership?
2) Name two real-world advantages of microservices and two potential drawbacks.
3) What is a Saga pattern, and when would you use it?
4) Why is idempotency important for RESTful POST operations in distributed systems?
5) How does API gateway usage improve fault isolation and security in microservices?

## 6. Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small PHP system that starts as a monolith and evolves into microservices with a simple orchestration gateway. You’ll implement a user, product, and order workflow with a basic saga-like compensation.

Part A — Build a PHP Monolith (setup in your project)
- Create a single PHP script monolith.php that implements:
  - In-memory Database (array-based) for users and orders.
  - UserService and OrderService classes (as in Section 1).
  - HTTP-like route handling (simple if/else on REQUEST_METHOD and PATH) to expose:
    - POST /users -> create user
    - GET /users/{id} -> fetch user
    - POST /orders -> create an order for a user
    - GET /orders/{id} -> fetch order
- Run with PHP built-in server (php -S localhost:8000 -t .) and verify endpoints.

Part B — Split into Microservices (two tiny services)
- Create two files:
  - user-service.php (as in Section 2a)
  - product-service.php (as in Section 2b) [or skip products if you prefer orders only]
- Each service uses its own storage (storage/users.json, storage/products.json) and minimal CRUD.
- Add a simple gateway (gateway.php) that aggregates data from both services for a /summary?user_id=X endpoint.

Part C — Implement a Simple Orchestrated Flow (Saga-like)
- Create two or three microservices (you can reuse user-service and product-service or introduce inventory-service.php) with simple endpoints:
  - reserve inventory (inventory-service.php: POST /reserve with item and qty)
  - create order (order-service.php: POST /orders)
  - compensating action (inventory-service.php: POST /release)
- Create a coordinator script saga_coordinator.php that attempts to:
  - Reserve inventory
  - Create order
  - If order creation fails, call the compensating action to release the inventory
- This demonstrates a simple, optimistic saga workflow with compensating action.

Part D — Reflection and Improvements
- Reflect on the tradeoffs observed in your implementation:
  - How does cross-service latency affect user-facing latency?
  - How would you add tracing (e.g., a X-Trace-ID) across services?
  - How would you introduce a real database per service without shared schemas?
  - How would you implement retries, circuit breakers, and idempotency keys in the gateway?

Notes and Tips
- Start small: keep each service tiny and focused on a bounded context.
- Use a lightweight storage (JSON files) for demonstrations, but plan for real databases (PostgreSQL, MySQL, or NoSQL) in production.
- Aim for clear API contracts between services (inputs/outputs, error formats).
- Consider a modular monolith as a stepping stone if you’re unsure about full microservice migration.

End of lesson.