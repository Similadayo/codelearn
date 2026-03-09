# Track: Backend Engineering — Phase 4: Building Web Servers — Routing: URL Design and Path Parameters (PHP)

Routing is the mechanism that maps incoming HTTP requests to your code that generates a response. In PHP, effective URL design and robust path parameter extraction let you build clean, scalable APIs and web applications. Well-designed routes improve readability, enable intuitive resource modeling, and simplify maintenance as your codebase grows.

## 1. URL Design Principles

Designing URLs that are readable, versioned, and semantically meaningful is foundational for backend systems. This section covers core ideas you’ll apply when modeling resources in PHP without a full framework.

Code example: a simple route templates map (design-focused, not a runnable router)

```php
<?php
// Design-oriented route templates (illustrative, not executed by a router here)
$routes = [
    'GET /api/v1/users' => 'listUsers',
    'GET /api/v1/users/{id}' => 'getUser',
    'GET /api/v1/users/{id}/posts/{post_id}' => 'getUserPost',
    'POST /api/v1/users' => 'createUser',
];
```

### Line-by-line explanation breaking down each line

- Line 1: Opening PHP tag.
- Line 3: Declares an associative array named $routes that maps an HTTP method and a URL pattern to a handler name.
- Line 4: Entry for retrieving all users with the GET method and the fixed path /api/v1/users.
- Line 5: Entry for retrieving a specific user; {id} denotes a path parameter to be extracted.
- Line 6: Entry for retrieving a post belonging to a specific user; demonstrates nested path parameters.
- Line 7: Entry for creating a new user via POST to the collection route.

Why this matters professionally:
- Resource-oriented URLs (nouns) over verbs provide stable, predictable APIs.
- Versioning (api/v1) allows evolution without breaking clients.
- Path parameters communicate relationships and hierarchy (user, post) cleanly.
- Decide early whether you’ll use path parameters or query parameters, and be consistent.

## 2. Path Parameters and Pattern Matching

Path parameters capture dynamic data from the URL path. This section shows how to define a route with placeholders and convert it into a regex, plus how to extract parameter names.

Code example: converting a route pattern with placeholders to a regex and extracting parameter names

```php
<?php
/**
 * Convert a route pattern with {param} placeholders into a PCRE regex.
 * Example: /users/{id}/posts/{post_id} -> /^\/users\/(?P<id>[^\/]+)\/posts\/(?P<post_id>[^\/]+)$/
 */
function patternToRegex(string $pattern): string {
    $regex = preg_replace('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', '(?P<$1>[^/]+)', $pattern);
    return '/^' . $regex . '$/';
}

 /**
  * Extract parameter names from a pattern like /users/{id}/posts/{post_id}
  */
function extractParamNames(string $pattern): array {
    preg_match_all('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', $pattern, $matches);
    return $matches[1] ?? [];
}

// Example usage
$pattern = '/users/{id}/posts/{post_id}';
$regex = patternToRegex($pattern);
$names = extractParamNames($pattern);

// Suppose we matched the path against the regex
$path = '/users/42/posts/100';
if (preg_match($regex, $path, $m)) {
    $params = [];
    foreach ($names as $name) {
        $params[$name] = $m[$name];
    }
    var_export($params); // e.g., array('id' => '42', 'post_id' => '100')
}
```

### Line-by-line explanation breaking down each line

- Line 1: PHP opening tag.
- Line 3-7: Defines patternToRegex to replace {param} with a named capture group (?P<param>[^/]+) and wrap the result with ^ and $ to enforce full-string match.
- Line 9-12: Defines extractParamNames to collect the names of all placeholders in the pattern using a regex.
- Line 15-21: Example usage showing how to convert a pattern and extract parameter names.
- Line 23: Path to match against the generated regex.
- Line 24-30: Performs the match and, if successful, builds an associative array of parameter names to their captured values.
- Line 31: Outputs the parameter array for demonstration.

Why this matters professionally:
- Path parameters enable clean, human-readable URIs and straightforward resource identification (e.g., /users/42/posts/100).
- Separating route templates from runtime values improves maintainability and testing.
- Using named capture groups simplifies parameter extraction and reduces errors when the pattern changes.

## 3. Building a Lightweight PHP Router

A small, framework-free router helps you map HTTP methods and URL patterns to handlers, extract path parameters, and dispatch requests efficiently.

Code block: a compact, runnable PHP Router with path parameter support

```php
<?php
class Router {
    private array $routes = [];

    public function add(string $method, string $uriPattern, callable $handler): void {
        $regex = $this->compilePattern($uriPattern);
        $paramNames = $this->extractParamNames($uriPattern);
        $this->routes[] = [
            'method' => strtoupper($method),
            'uriPattern' => $uriPattern,
            'handler' => $handler,
            'regex' => $regex,
            'paramNames' => $paramNames,
        ];
    }

    private function compilePattern(string $uriPattern): string {
        $regex = preg_replace('/\{([A-Za-z_][A-Za-z0-9_]*)\}/', '(?P<\$1>[^/]+)', $uriPattern);
        return '/^' . $regex . '$/';
    }

    private function extractParamNames(string $uriPattern): array {
        preg_match_all('/\{([A-Za-z_][A-Za-z0-9_]*)\}/', $uriPattern, $matches);
        return $matches[1] ?? [];
    }

    public function dispatch(string $method, string $path): void {
        foreach ($this->routes as $r) {
            if (strtoupper($method) !== $r['method']) continue;
            if (preg_match($r['regex'], $path, $m)) {
                $params = [];
                foreach ($r['paramNames'] as $name) {
                    $params[$name] = $m[$name] ?? null;
                }
                call_user_func($r['handler'], $params);
                return;
            }
        }
        http_response_code(404);
        echo 'Not Found';
    }
}
```

Usage example:

```php
<?php
$router = new Router();

$router->add('GET', '/api/v1/users', function($params) {
    header('Content-Type: application/json');
    echo json_encode(['users' => ['alice','bob']]);
});

$router->add('GET', '/api/v1/users/{id}', function($params) {
    header('Content-Type: application/json');
    echo json_encode(['user_id' => (int)$params['id']]);
});

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$router->dispatch($method, $path);
```

### Line-by-line explanation breaking down each line

- Line 1: PHP opening tag.
- Line 2: Begin class Router definition.
- Line 3: Private property to store routes.
- Line 5-14: add() registers a route: computes regex and parameter names, then stores a route entry with method, pattern, handler, and the precomputed regex and parameter names.
- Line 16-21: compilePattern() converts a URI pattern like /users/{id} into a full regex with named captures for each placeholder.
- Line 23-27: extractParamNames() collects all placeholder names from the pattern.
- Line 29-40: dispatch() iterates routes, matches by HTTP method and path, extracts values for each parameter, calls the corresponding handler with those values, and returns. If no route matches, responds with 404.
- Line 43-76: Usage example that registers two routes and dispatches the current request path to the appropriate handler.
- Line 49-52: First route handler returns a JSON list of users.
- Line 56-60: Second route handler returns a JSON object with the requested user_id.
- Line 63-65: Retrieves request method and path from the server environment.
- Line 66-67: Dispatches the request to the router.

Why this matters professionally:
- A tiny router keeps your codebase decoupled from a framework, helping teams understand request handling flow.
- Precomputing regex patterns and parameter names improves request dispatch performance.
- Clear separation of route definitions and handlers enables easier testing and mocking.

## 4. Common Beginner Mistakes

Below are real pitfalls with bad vs good code patterns. Each pitfall includes a bad approach and a recommended, robust alternative.

### Pitfall 1: Relying on exact string comparisons instead of a router

Bad:
```php
<?php
$path = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $path === '/api/v1/users') {
    // fetch and return users
} elseif ($method === 'GET' && $path === '/api/v1/users/42') {
    // fetch and return user 42
} else {
    http_response_code(404);
}
```

Good:
```php
<?php
// Use a router instead of direct string matching (see Section 3)
$router = new Router();
$router->add('GET', '/api/v1/users', function($p){ /* list */ });
$router->add('GET', '/api/v1/users/{id}', function($p){ /* get one */ });
// Dispatch with actual path and method
$router->dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
```

### Pitfall 2: Ignoring URL encoding/decoding of path segments

Bad:
```php
$path = $_SERVER['REQUEST_URI']; // contains encoded characters
if ($path === '/api/v1/search/hello%20world') { /* ... */ }
```

Good:
```php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = urldecode($path);
```

### Pitfall 3: Not handling trailing slashes consistently

Bad:
```php
if ($path === '/api/v1/users') { /* ok */ }
if ($path === '/api/v1/users/') { /* not matched */ }
```

Good:
```php
$path = rtrim($path, '/');
if ($path === '') $path = '/';
```

### Pitfall 4: Not validating or sanitizing path parameter values

Bad:
```php
// Directly using path param in a query
$userId = $_GET['id']; // or from path
$query = "SELECT * FROM users WHERE id = $userId";
```

Good:
```php
// Extracted from router with proper type handling and validation
$paramId = isset($params['id']) ? (int)$params['id'] : null;
if ($paramId === null) { http_response_code(400); exit('Missing id'); }
$query = "SELECT * FROM users WHERE id = ?";
$stmt = $db->prepare($query);
$stmt->execute([$paramId]);
```

### Pitfall 5: Overusing query parameters over path parameters

Bad:
```php
// Requiring /users?id=42 instead of /users/42
$path = '/users';
$queryParams = $_GET; // id=42
```

Good:
```php
// Use path parameters for resource identity
$router->add('GET', '/users/{id}', function($params) {
    $id = (int)$params['id'];
    // fetch by id
});
```

## 5. Why This Matters In Real Systems

- Maintainability: A router with clear patterns makes it easier to add, rename, or deprecate endpoints without breaking clients.
- API usability: Consistent URL design (e.g., /resources/{id}/subresources/{sub_id}) provides a predictable mental model for developers who consume your API.
- Performance: For production systems, precompiled regex and a lean router reduce request latency at scale; consider caching route metadata and using more efficient data structures for route matching.
- Security: Validate and sanitize path parameters; never directly interpolate them into SQL or shell commands.
- Middleware and cross-cutting concerns: A router design that supports middleware (auth, logging, rate limiting) cleanly separates routing from business logic.
- Versioning and deprecation: Place version segments in the URL (e.g., /api/v1/) and provide a plan for migrating clients to newer versions.

## 6. Study Questions

1) What is a path parameter and how does it differ from a query parameter?  
2) How do you convert a route pattern like /users/{id}/posts/{post_id} into a regex for matching?  
3) How does a simple PHP router extract and pass path parameters to a handler?  
4) Why is normalizing trailing slashes important in route matching?  
5) What are two security considerations when using path parameters in your handlers?

## 7. Exercise

Goal: Build a tiny PHP router from scratch and create a small API with path parameters. You will implement a runnable router, register routes with path parameters, and return JSON responses.

Part A — Implement the Router (from Section 3)
- Create a Router class with:
  - add(string $method, string $uriPattern, callable $handler)
  - dispatch(string $method, string $path)
  - Internal helpers to convert patterns to regex and extract parameter names
- Use PHP 8 features (type hints, closures)

Starter code (save as router.php or in your project autoload):

```php
<?php
class Router {
    private array $routes = [];

    public function add(string $method, string $uriPattern, callable $handler): void {
        $regex = $this->compilePattern($uriPattern);
        $paramNames = $this->extractParamNames($uriPattern);
        $this->routes[] = [
            'method' => strtoupper($method),
            'uriPattern' => $uriPattern,
            'handler' => $handler,
            'regex' => $regex,
            'paramNames' => $paramNames,
        ];
    }

    private function compilePattern(string $uriPattern): string {
        $regex = preg_replace('/\{([A-Za-z_][A-Za-z0-9_]*)\}/', '(?P<$1>[^/]+)', $uriPattern);
        return '/^' . $regex . '$/';
    }

    private function extractParamNames(string $uriPattern): array {
        preg_match_all('/\{([A-Za-z_][A-Za-z0-9_]*)\}/', $uriPattern, $matches);
        return $matches[1] ?? [];
    }

    public function dispatch(string $method, string $path): void {
        foreach ($this->routes as $r) {
            if (strtoupper($method) !== $r['method']) continue;
            if (preg_match($r['regex'], $path, $m)) {
                $params = [];
                foreach ($r['paramNames'] as $name) {
                    $params[$name] = $m[$name] ?? null;
                }
                call_user_func($r['handler'], $params);
                return;
            }
        }
        http_response_code(404);
        echo 'Not Found';
    }
}
```

Part B — Expose Endpoints
- Register two endpoints:
  - GET /products -> returns a JSON array of products
  - GET /products/{id} -> returns a JSON object for a specific product id

Example usage:

```php
<?php
require 'router.php'; // if using a separate file

$router = new Router();

$router->add('GET', '/products', function($params) {
    header('Content-Type: application/json');
    echo json_encode(['products' => [
        ['id' => 1, 'name' => 'Widget', 'price' => 9.99],
        ['id' => 2, 'name' => 'Gadget', 'price' => 14.99],
    ]]);
});

$router->add('GET', '/products/{id}', function($params) {
    $id = (int) $params['id'];
    header('Content-Type: application/json');
    echo json_encode(['product' => ['id' => $id, 'name' => 'Widget', 'price' => 9.99]]);
});

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$router->dispatch($method, $path);
```

Part C — Run and Test
- Start a local PHP server:
  - php -S localhost:8000
- Test in your browser or with curl:
  - curl http://localhost:8000/products
  - curl http://localhost:8000/products/1

What you should demonstrate:
- The router can match both a static route and a parameterized route.
- Path parameters are captured and passed to the handler as an associative array.
- Handlers respond with JSON for easy API consumption.

Optional extension (for extra practice):
- Extend the router to support POST, PUT, DELETE methods and request bodies (parsing JSON input from php://input).
- Add simple middleware support (e.g., logging or authentication) that runs before the handler.

This completes a focused, realistic lesson on Routing — URL Design and Path Parameters in PHP, with a practical, runnable router, design considerations, common pitfalls, and a hands-on exercise that reinforces best practices in building web servers.