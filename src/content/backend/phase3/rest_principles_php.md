# REST Architecture — Designing Good APIs with PHP

Understanding REST architecture is essential for building scalable, maintainable, and interoperable backends. In professional environments, well-designed REST APIs enable teams to evolve services independently, power mobile and web clients, and integrate with external partners. This lesson focuses on designing good APIs in PHP, covering resource modeling, predictable behavior, validation, versioning, security, and practical pitfalls.

## 1. Foundations of RESTful API Design
In REST, you design around resources (nouns) and use standard HTTP methods to operate on them. A well-designed API uses consistent endpoints, meaningful status codes, stateless interactions, and self-descriptive error messages. Below is a compact PHP example showing a simple router for a resource called articles.

```php
<?php
// api.php - tiny REST router for demonstration
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$base = "/api/v1";
$path = trim(str_replace($base, '', $uri), '/');
$segments = array_values(array_filter(explode('/', $path)));

$articles = [
    1 => ["id" => 1, "title" => "Intro to REST", "content" => "Basics...", "author" => "Alice"],
    2 => ["id" => 2, "title" => "Caching in APIs", "content" => "Cache strategies...", "author" => "Bob"],
];

function respond($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($segments)) {
    respond(["message" => "REST API for Articles", "version" => "1.0"]);
}

switch ($method) {
    case 'GET':
        if (count($segments) == 1 && is_numeric($segments[0])) {
            $id = (int)$segments[0];
            if (isset($articles[$id])) {
                respond(["data" => $articles[$id]]);
            } else {
                respond(["error" => "Article not found"], 404);
            }
        } elseif (count($segments) == 1) {
            // not a valid path for this simple router
            respond(["error" => "Invalid path"], 400);
        } else {
            respond(["data" => array_values($articles)]);
        }
        break;

    case 'POST':
        // In a real app, you'd parse JSON body and create a resource.
        $body = json_decode(file_get_contents("php://input"), true);
        if (!$body) {
            respond(["error" => "Invalid JSON body"], 400);
        }
        if (!isset($body['title']) || !isset($body['content'])) {
            respond(["error" => "Missing required fields"], 422);
        }
        // Simulate creation
        $newId = max(array_keys($articles)) + 1;
        $new = [
            "id" => $newId,
            "title" => $body['title'],
            "content" => $body['content'],
            "author" => $body['author'] ?? "Unknown",
        ];
        // Here you would persist to DB; for demo we just return it
        respond(["data" => $new], 201);
        break;

    default:
        respond(["error" => "Method not allowed"], 405);
}
```

### Line-by-line explanation
- Line 1: Declares PHP script to run as PHP.
- Lines 2-4: Set response headers for JSON, CORS, and allowed verbs/headers.
- Line 6-8: Read request method and URI; prepare routing base and path.
- Line 9-11: Break down path into segments for routing.
- Lines 13-20: Sample in-memory data store of articles.
- Lines 22-27: Helper function respond() to standardize responses and status codes.
- Lines 29-32: Quick check for root path to return a brief API overview.
- Line 34: Begin switch on HTTP method.
- GET block: Handles listing all articles or a single article by ID; returns 200 with data or 404 if not found.
- POST block: Reads and decodes JSON body, validates required fields, and simulates creation with 201 status. Returns 400 for invalid JSON and 422 for validation failures.
- Default block: Returns 405 for unsupported methods.

## 2. Resource Modeling, Consistent Responses, and Content Negotiation
A good API provides consistent response shapes, stable data shapes, and clear errors. Centralize formatting, error envelopes, and metadata so clients can predict behavior.

```php
<?php
// api.php (continued) - helper response envelopes and content negotiation
function api_success($data, $meta = []) {
    return ["status" => "success", "data" => $data, "meta" => $meta];
}

function api_error($message, $code = 400, $details = null) {
    $payload = ["status" => "error", "message" => $message, "code" => $code];
    if ($details) $payload["details"] = $details;
    return $payload;
}

function respond_with($payload, $http = 200) {
    http_response_code($http);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
```

### Line-by-line explanation
- Line 2: Defines a helper for returning a standardized success envelope with data and optional meta.
- Line 6: Defines an error envelope with a message, HTTP-like code, and optional details.
- Line 11: Wraps the payload in an actual HTTP response via http_response_code and JSON encoding.

Notes:
- Use these helpers in all endpoints to ensure uniformity.
- Consider adding content negotiation if you need XML or other formats (rare in modern web APIs, but useful for integrations).

## 3. Validation, Error Handling, and HTTP Status Codes
Validation ensures the API behaves predictably and protects backends from invalid data. Use appropriate status codes for different outcomes (201 for created, 400/422 for bad input, 404 for not found, 409 for conflicts, 500 for server errors).

```php
<?php
// api.php (partial) - robust validation for article creation
function validate_article_input($input) {
    $errors = [];

    if (empty($input['title'] ?? '')) {
        $errors['title'] = "Title is required.";
    } elseif (strlen($input['title']) < 3) {
        $errors['title'] = "Title must be at least 3 characters.";
    }

    if (empty($input['content'] ?? '')) {
        $errors['content'] = "Content is required.";
    }

    if (!empty($input['author']) && strlen($input['author']) < 2) {
        $errors['author'] = "Author name seems too short.";
    }

    return $errors;
}

// In POST handler
$body = json_decode(file_get_contents("php://input"), true);
if (!$body) {
    respond_with(api_error("Invalid JSON body"), 400);
}
$errors = validate_article_input($body);
if (!empty($errors)) {
    respond_with(api_error("Validation failed", 422, $errors), 422);
}

// If valid, proceed to create
```

### Line-by-line explanation
- Line 2: Starts a function to validate article input and collect errors.
- Lines 4-15: Validate title (required and min length), content (required), and optional author (min length if provided).
- Line 18: Call validate_article_input on the request body to get an errors array.
- Line 19-22: If there are errors, respond with a 422 (Unprocessable Entity) and the details; otherwise, continue with processing.

Tips:
- Use 422 for semantic validation errors (input valid JSON but invalid data).
- Keep error payloads actionable for clients (field-level errors, friendly messages).

## 4. Versioning, Pagination, and Filtering
Versioning keeps your API stable while you evolve endpoints. Pagination prevents huge responses and helps clients manage bandwidth. Filtering enables clients to request subsets.

```php
<?php
// api.php - versioning via URL, pagination, and simple filtering
$version = "v1"; // imagine $segments[0] == "v1" in a real router
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
$offset = ($page - 1) * $limit;

// Suppose $all = fetchAllArticlesFromDB(); here we simulate
$all = array_values($articles); // from previous snippet
$total = count($all);
$paginated = array_slice($all, $offset, $limit);

$baseUrl = strtok($_SERVER['REQUEST_URI'], '?');
$query = $_GET;
unset($query['page']);
$base = preg_replace('/\?.*/', '', $baseUrl);

$links = [];
if ($page > 1) {
    $links[] = $base . '?page=' . ($page - 1) . '&limit=' . $limit;
}
if ($offset + $limit < $total) {
    $links[] = $base . '?page=' . ($page + 1) . '&limit=' . $limit;
}

respond_with(api_success([
    "items" => $paginated,
], [
    "page" => $page,
    "limit" => $limit,
    "total" => $total,
    "links" => $links
]));
```

### Line-by-line explanation
- Line 2: Extracts version information from the path (simplified example).
- Line 3-4: Reads page and limit query parameters with sane defaults.
- Line 5: Calculates the offset for slicing.
- Line 8-9: Prepares a sample dataset and total count.
- Line 10-12: Applies pagination using array_slice to get the current page items.
- Lines 14-22: Builds simple pagination links (prev/next) based on current page and total.
- Line 24-26: Returns a structured envelope containing the paginated items and meta including pagination.

Notes:
- In production, replace the in-memory array with a real DB query that supports LIMIT/OFFSET and COUNT.
- Consider using cursor-based pagination for very large datasets.

## 5. Security Basics: Authentication, Authorization, and Safe Defaults
Security is integral to API design. Use token-based authentication, enforce authorization checks, and avoid leaking sensitive information. Always validate the Authorization header, and prefer short-lived tokens with scopes.

```php
<?php
// Middleware-like simple auth (for demonstration)
function get_bearer_token($headers) {
    if (!isset($headers['Authorization'])) return null;
    if (preg_match('/Bearer\s+(\S+)/', $headers['Authorization'], $m)) {
        return $m[1];
    }
    return null;
}

$headers = apache_request_headers();
$token = get_bearer_token($headers);

$VALID_TOKENS = [
    "example-token-123", // example tokens
];

if ($token === null || !in_array($token, $VALID_TOKENS, true)) {
    respond_with(api_error("Unauthorized"), 401);
}
```

### Line-by-line explanation
- Line 2-9: Defines a small helper to extract a Bearer token from the Authorization header using a regex.
- Line 11: Reads request headers (note: in some environments you may need to use getallheaders()).
- Line 12: Retrieves the token from the headers.
- Lines 14-20: Defines a small allowlist of valid tokens and enforces that the request must present a valid token; responds with 401 otherwise.
- This approach is simplistic for educational purposes; in production use a robust auth system (OAuth2, JWT with proper validation, token revocation, scopes).

Notes:
- For real systems, move authentication to a dedicated middleware or framework-provided mechanism.
- Combine authentication with authorization checks per endpoint (e.g., only certain users can create or delete).

## X. Common Beginner Mistakes
Here are concrete pitfalls beginners often hit, with bad vs good code side-by-side.

- Pitfall 1: Not using proper HTTP status codes
Bad:
```php
// Always returns 200, even on errors
echo json_encode(["status" => "ok", "data" => []]);
```
Good:
```php
http_response_code(404);
echo json_encode(["error" => "Resource not found"]);
```

- Pitfall 2: Ignoring input validation and trusting client data
Bad:
```php
$body = json_decode(file_get_contents("php://input"), true);
$title = $body['title']; // may be missing
```
Good:
```php
$body = json_decode(file_get_contents("php://input"), true);
$errors = [];
if (empty($body['title'])) $errors['title'] = "Title is required.";
if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(["errors" => $errors]);
    exit;
}
$title = $body['title'];
```

- Pitfall 3: Not handling JSON input properly or missing Content-Type
Bad:
```php
// Assume JSON but not parsing or checking
$payload = $_POST;
```
Good:
```php
header("Content-Type: application/json; charset=utf-8");
$payload = json_decode(file_get_contents("php://input"), true);
if ($payload === null) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}
```

- Pitfall 4: No API versioning or unstable endpoints
Bad:
```php
// /articles endpoint changes breaking existing clients
```
Good:
```php
// Use versioned paths like /api/v1/articles and plan v2
```

- Pitfall 5: Missing pagination, filtering, or poor error messages
Bad:
```php
// Large results dump all data
echo json_encode($articles);
```
Good:
```php
// Implement page/limit params and return metadata
```

## Y. Why This Matters In Real Systems
In production, REST APIs are the contract between services and clients. The design decisions directly impact maintainability, scalability, and reliability.

- Consistency and standards: Uniform response shapes and status codes reduce client errors and improve developer experience.
- Versioning: Keeps clients stable while you evolve endpoints, schema, and behavior without breaking existing integrations.
- Observability: Structured responses, error envelopes, and metadata support monitoring, tracing, and debugging.
- Security: Token-based auth, least privilege, and secure defaults prevent data exposure and misuse.
- Performance: Pagination, caching hints, and efficient queries reduce latency and server load.
- Documentation: Self-descriptive APIs paired with examples (and optionally OpenAPI/Swagger) improve onboarding and integration speed.

In PHP ecosystems, you often balance a small custom router (for learning or microservices) with a robust framework for large projects. The principles above apply regardless of tooling: resource-oriented design, clear contract, predictable behavior, and secure, scalable operations.

## Z. Study Questions
1. What are the core constraints of REST, and how do they influence API design?
2. How does versioning help maintain compatibility in public APIs?
3. What HTTP status codes should you typically return for a successful resource creation and for a resource not found?
4. How would you implement pagination on a list endpoint, and what metadata should you return?
5. Why is input validation important in REST APIs, and how should validation errors be communicated to clients?

## Exercise
A practical multi-part coding challenge to reinforce REST API design in PHP.

Part A — Set up a tiny REST API skeleton
- Create a single PHP file (e.g., api.php) that handles routing for a resource named "notes" under /api/v1/notes.
- Implement:
  - GET /api/v1/notes -> returns a list of notes (in-memory).
  - GET /api/v1/notes/{id} -> returns a single note or 404.
  - POST /api/v1/notes -> creates a new note with title and body; returns 201 and the created object.
- Use a consistent response envelope (data, meta) and appropriate status codes.

Part B — Add input validation
- Validate that title and body exist for POST.
- Return 422 with a details object if validation fails.

Part C — Implement pagination
- Extend GET /api/v1/notes to support page and limit query parameters.
- Return data plus meta: page, limit, total, and a small links array for next/previous when applicable.

Part D — Add simple token-based authentication
- Require an Authorization: Bearer <token> header for POST requests only.
- Validate tokens against a small allowlist in code (e.g., ["dev-token-abc"]).
- Return 401 if the token is missing or invalid.

Part E — Documentation snippet (optional)
- Provide a short OpenAPI-like description for the implemented endpoints (paths, methods, request/response shapes, and required headers).

Starter tips:
- Keep all data in-memory for the exercise (no database needed).
- Structure code with small helper functions for responding, validating, and authenticating.
- Test with curl or a minimal REST client (e.g., Postman) to verify various scenarios (success, validation failure, unauthorized, not found).

This lesson provides a compact path from basic REST concepts to practical PHP implementations, emphasizing consistency, validation, versioning, and security in real-world systems.