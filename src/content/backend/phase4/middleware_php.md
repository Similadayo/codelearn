# Phase 4 — Building Web Servers: Middleware — Logging, CORS, and Request Pipeline (PHP)

Microservices and modern backends rely on clean, modular request processing. Middleware lets you compose small, focused behaviors—like logging, access control, and cross-origin handling—without baking them into every endpoint. In PHP, a lightweight middleware pattern helps you build scalable, testable request pipelines that can be reused across APIs and services.

## 1. Defining a Minimal Middleware Pattern in PHP
This section introduces a tiny, framework-agnostic middleware pattern: Request, Response, and a Middleware interface. It lays the foundation for logging, CORS, and the request pipeline.

```php
<?php
declare(strict_types=1);

class Request {
  public string $method;
  public string $uri;
  public array $headers;
  public string $body;

  public function __construct(string $method, string $uri, array $headers = [], string $body = '') {
     $this->method = strtoupper($method);
     $this->uri = $uri;
     $this->headers = $headers;
     $this->body = $body;
  }

  public function getHeader(string $name): ?string {
     $nameLower = strtolower($name);
     foreach ($this->headers as $key => $value) {
        if (strtolower($key) === $nameLower) {
           return $value;
        }
     }
     return null;
  }

  public function getOrigin(): ?string {
     return $this->getHeader('Origin');
  }
}

class Response {
  public int $statusCode;
  public array $headers;
  public string $body;

  public function __construct(int $statusCode = 200, array $headers = [], string $body = '') {
     $this->statusCode = $statusCode;
     $this->headers = $headers;
     $this->body = $body;
  }

  public function withHeader(string $name, string $value): self {
     $new = clone $this;
     $new->headers[$name] = $value;
     return $new;
  }

  public function setStatus(int $code): self {
     $new = clone $this;
     $new->statusCode = $code;
     return $new;
  }
}

interface Middleware {
  public function process(Request $request, callable $next): Response;
}
```

### Line-by-line explanation
- declare(strict_types=1); enforces strict typing for clarity and safety.
- Request class holds method, URI, headers, and body to model an HTTP request.
- The constructor initializes normalized method, URI, and content.
- getHeader performs a case-insensitive lookup in the headers.
- getOrigin returns the Origin header, if present.
- Response class models HTTP response with status, headers, and body.
- withHeader returns a new Response instance with an additional header (immutability).
- setStatus returns a new Response with a different status.
- Middleware interface defines a standard process method that accepts a Request and a next-callback, returning a Response.
- This pattern models a chain where each middleware can inspect/modify the request/response and decide when to pass control to the next piece.

---

## 2. Logging Middleware: Observability in the Request Pipeline
Logging is essential for debugging, auditing, and performance monitoring. This middleware demonstrates how to log requests and responses without cluttering endpoint code.

```php
<?php
declare(strict_types=1);

class Logger {
  private string $logFile;
  public function __construct(string $logFile = '/tmp/php_mw.log') {
     $this->logFile = $logFile;
  }
  public function log(string $level, string $message): void {
     $line = sprintf("%s [%s] %s\n", date('Y-m-d H:i:s'), $level, $message);
     file_put_contents($this->logFile, $line, FILE_APPEND | LOCK_EX);
  }
}

class LoggingMiddleware implements Middleware {
  private Logger $logger;
  public function __construct(Logger $logger) {
     $this->logger = $logger;
  }
  public function process(Request $request, callable $next): Response {
     $this->logger->log('INFO', sprintf('Request %s %s', $request->method, $request->uri));
     if ($origin = $request->getOrigin()) {
         $this->logger->log('INFO', 'Origin: ' . $origin);
     }
     $response = $next($request);
     $this->logger->log('INFO', 'Response status: ' . $response->statusCode);
     return $response;
  }
}
```

### Line-by-line explanation
- Logger class writes log lines to a file with a timestamp and log level.
- The constructor accepts an optional log file path.
- log appends a formatted line to the log file, using exclusive file locking to avoid races.
- LoggingMiddleware accepts a Logger via dependency injection for testability and reuse.
- process logs the incoming request method and URI.
- It also logs the Origin header if present, enabling traceability for CORS and cross-domain issues.
- It calls the next middleware to obtain the Response, then logs the response status.
- The final Response is returned unchanged except for being logged.

---

## 3. CORS Middleware: Cross-Origin Resource Sharing in the Pipeline
CORS controls which origins can access your API. This middleware adds the appropriate headers and handles preflight OPTIONS requests.

```php
<?php
declare(strict_types=1);

class CorsMiddleware implements Middleware {
  private array $allowedOrigins;
  private string $allowedMethods;
  private string $allowedHeaders;

  public function __construct(array $allowedOrigins = ['*'], string $allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS', string $allowedHeaders = 'Content-Type,Authorization') {
     $this->allowedOrigins = $allowedOrigins;
     $this->allowedMethods = $allowedMethods;
     $this->allowedHeaders = $allowedHeaders;
  }

  public function process(Request $request, callable $next): Response {
     $origin = $request->getOrigin();

     if ($origin && $this->isOriginAllowed($origin)) {
        // Preflight handling for OPTIONS
        if (strtoupper($request->method) === 'OPTIONS') {
           return new Response(200, [
              'Access-Control-Allow-Origin' => $origin,
              'Access-Control-Allow-Methods' => $this->allowedMethods,
              'Access-Control-Allow-Headers' => $this->allowedHeaders,
              'Access-Control-Max-Age' => '3600'
           ]);
        } else {
           $response = $next($request);
           // Attach CORS header to actual response
           return $response->withHeader('Access-Control-Allow-Origin', $origin);
        }
     } else {
        // No origin or not allowed; just pass through
        return $next($request);
     }
  }

  private function isOriginAllowed(string $origin): bool {
     if (in_array('*', $this->allowedOrigins, true)) return true;
     return in_array($origin, $this->allowedOrigins, true);
  }
}
```

### Line-by-line explanation
- CorsMiddleware implements the Middleware interface to integrate with the pipeline.
- Constructor accepts allowed origins and default CORS policy values for methods/headers.
- process fetches the request Origin header.
- If an origin is allowed, and the method is OPTIONS, it returns a 200 response with the necessary CORS headers for preflight.
- If the request is not a preflight, it forwards to the next middleware/handler and attaches Access-Control-Allow-Origin to the actual response.
- isOriginAllowed checks for a wildcard origin or direct matches.
- The middleware either short-circuits (preflight) or augments the downstream response with CORS headers.

---

## 4. Building and Running a Request Pipeline: Compose middlewares
This section shows how to compose multiple middleware components into a single pipeline and run a simulated request through it.

```php
<?php
declare(strict_types=1);

// Final handler: the endpoint logic that runs after all middleware
$finalHandler = function(Request $request): Response {
  $body = 'Hello from the final handler. Requested: ' . $request->uri;
  return (new Response(200, ['Content-Type' => 'text/plain'], $body));
};

// Build pipeline: order matters (e.g., logging wraps everything, CORS sits around final logic)
$middlewares = [
  new LoggingMiddleware(new Logger('/tmp/php_mw.log')),
  new CorsMiddleware(['https://example.com', 'https://sub.example.org'])
];

// Helper to compose middlewares into a single callable
$buildPipeline = function(array $mws, callable $final) {
  $handler = $final;
  foreach (array_reverse($mws) as $mw) {
     $prev = $handler;
     $handler = function(Request $req) use ($mw, $prev) {
        return $mw->process($req, $prev);
     };
  }
  return $handler;
};

$pipeline = $buildPipeline($middlewares, $finalHandler);

// Simulate an incoming request
$request = new Request(
  'GET',
  '/api/data',
  [
    'Origin' => 'https://example.com',
    'Content-Type' => 'application/json'
  ],
  ''
);

$response = $pipeline($request);

// Output a readable representation of the response (suitable for console or logs)
echo "Status: " . $response->statusCode . PHP_EOL;
foreach ($response->headers as $name => $value) {
  echo $name . ': ' . $value . PHP_EOL;
}
echo PHP_EOL . $response->body . PHP_EOL;
```

### Line-by-line explanation
- finalHandler simulates endpoint logic that returns a 200 OK with a plain text body.
- $middlewares holds instances of LoggingMiddleware and CorsMiddleware, demonstrating stack composition.
- buildPipeline creates a single callable by wrapping the final handler with each middleware in reverse order, so the first in the array runs outermost.
- The loop over array_reverse ensures the first middleware in the array is the outermost wrapper.
- The resulting $pipeline is a callable that processes a Request through all middleware and the final handler.
- A sample Request is constructed with method, URI, and headers (including Origin).
- The pipeline is invoked with the request; the returned Response is captured.
- The script prints a readable summary of the response (status, headers, and body) to stdout.

---

## X. Common Beginner Mistakes
Three common mistakes when building middleware in PHP, with bad vs good code examples.

- Pitfall 1: Not forwarding control to the next middleware
  - Bad:
    ```
    public function process(Request $request, callable $next): Response {
      // Do something, but never call $next
      return new Response(200, [], 'OK');
    }
    ```
  - Good:
    ```
    public function process(Request $request, callable $next): Response {
      // Do something (e.g., logging)
      return $next($request);
    }
    ```

- Pitfall 2: Mutating the original Request or Response in ways that break the pipeline
  - Bad:
    ```
    public function process(Request $request, callable $next): Response {
      $request->uri = '/malicious';
      return $next($request);
    }
    ```
  - Good:
    ```
    public function process(Request $request, callable $next): Response {
      // Do not mutate; instead, read and pass a new, derived Response if needed
      $response = $next($request);
      // Optionally wrap or transform the response header safely
      return $response;
    }
    ```

- Pitfall 3: Misconfiguring CORS handling (either not handling preflight or always allowing all origins)
  - Bad:
    ```
    // Always adds a permissive header with origin = '*'
    public function process(Request $request, callable $next): Response {
      $response = $next($request);
      return $response->withHeader('Access-Control-Allow-Origin', '*');
    }
    ```
  - Good:
    ```
    public function process(Request $request, callable $next): Response {
      $origin = $request->getOrigin();
      if ($origin && in_array($origin, ['https://example.com'], true)) {
         $response = $next($request);
         return $response->withHeader('Access-Control-Allow-Origin', $origin);
      }
      return $next($request);
    }
    ```

---

## Y. Why This Matters In Real Systems
- Observability and reliability: Logging middleware centralizes request/response visibility, enabling performance monitoring, debugging, and incident response without scattering log calls across endpoints.
- Security and interoperability: CORS middleware enforces cross-origin policies, preventing unauthorized cross-site access while still enabling legitimate API usage for web apps and mobile apps.
- Maintainability and scalability: A well-structured middleware pipeline lets teams add features (rate limiting, authentication, input validation, metrics) without touching business logic, reducing risk and improving testability.
- Real-world constraints: Production systems must balance performance (avoid excessive logging), security (avoid leaking sensitive headers), and correctness (ensuring OPTIONS preflight flows work for SPA front-ends).

---

## Z. Study Questions
1. What is the primary purpose of a middleware pipeline in a web server, and how does it improve code reuse?
2. How does the composition order affect which middleware runs first and which response is produced?
3. What special handling does CORS require for preflight (OPTIONS) requests?
4. Why should logging be implemented as a separate middleware rather than scattered across endpoints?
5. In the provided pattern, what would happen if a middleware forgets to call the next() function?

---

## Exercise
Complete the following multi-part coding challenge to reinforce your understanding of PHP middleware.

Part A — Add an Authentication Middleware
- Create a new class AuthMiddleware that checks for an API key in the header X-Api-Key.
- Behavior:
  - If the key is present and equals a known secret (e.g., "secret-123"), allow the request to proceed.
  - If missing or invalid, return a 401 Unauthorized with a JSON body {"error":"Unauthorized"} and Content-Type: application/json.
- Integrate AuthMiddleware into the existing pipeline so it runs after LoggingMiddleware but before CorsMiddleware.

Part B — Implement a Simple In-Memory Logger for Tests
- Create a MemoryLogger that implements Logger-like behavior but stores logs in an array in memory.
- Expose a method getLogs(): array to inspect logs during tests.
- Replace the production Logger in your pipeline with MemoryLogger when running a test harness.

Part C — Request Simulation Harness
- Build a small harness that simulates:
  1) A valid cross-origin request from https://example.com to /api/data.
  2) A preflight OPTIONS request from https://example.com.
  3) A request with an invalid Origin not in the allowed list.
  4) A request with a missing API key (to test AuthMiddleware).
- For each, print the outcome: status code, headers, and body.
- Ensure the harness prints clear separation between scenarios and demonstrates both success and failure paths.

Part D — Optional: Extend with a Simple Router
- Enhance the final handler to simulate routing: if request URI starts with /api/data, return a JSON body {"data":"sample"}; otherwise return 404 with {"error":"Not Found"}.

Deliverables
- Provide a single PHP script (or modular PHP files) that includes:
  - Implementations for Request, Response, Middleware, LoggingMiddleware, CorsMiddleware, AuthMiddleware, and a pipeline builder.
  - A test harness that exercises Parts A–D and outputs results to stdout.
- Ensure strict types, clear separation of concerns, and comments explaining the flow.

This completes a practical, production-aligned exploration of middleware in PHP: logging, CORS handling, and a composable request pipeline.