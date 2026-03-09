# Your First Web Server with a Framework (PHP)

Welcome to Phase 4: Building Web Servers. In this lesson, you’ll bootstrap a PHP web server using a micro-framework (Slim 4), define routes, handle JSON payloads, and organize code for maintainability. Framework-based servers let you focus on business logic while the framework handles routing, request/response lifecycles, and middleware. By the end, you’ll have a runnable app you can extend into real APIs or web services.

## 1. Setup and Bootstrapping a Slim 4 App

In this section you’ll install Slim 4 dependencies, create a minimal bootstrap file, and run a small “Hello” route. This forms the foundation for all subsequent features.

```php
<?php
require __DIR__ . '/../vendor/autoload.php';

use Slim\Factory\AppFactory;

// Create Slim app
$app = AppFactory::create();

// A simple route that uses a path parameter
$app->get('/hello/{name}', function ($request, $response, $args) {
    $name = $args['name'];
    $response->getBody()->write("Hello, $name");
    return $response;
});

// Run the app
$app->run();
```

### Line-by-line explanation
- require __DIR__ . '/../vendor/autoload.php';: Loads Composer autoloader so classes from Slim and dependencies can be used.
- use Slim\Factory\AppFactory;: Import Slim’s app factory to instantiate the application.
- $app = AppFactory::create();: Creates a new Slim application instance.
- $app->get('/hello/{name}', function (...) { ... });: Defines a GET route with a required path parameter name. The callback receives the request, response, and route arguments.
- $name = $args['name'];: Extracts the name from the route parameters.
- $response->getBody()->write("Hello, $name");: Writes the response body content.
- return $response;: Returns the response to the framework.
- $app->run();: Starts handling incoming HTTP requests (usually via PHP’s built-in server or a web server like Nginx/Apache).

What you’ve learned
- How to bootstrap a Slim 4 app with a minimal route.
- How path parameters are accessed via $args.
- How to produce a simple text response.

Next, we’ll add more routes to demonstrate handling different kinds of requests.

## 2. Defining Routes and Handling Requests

This section extends the app with an additional route that serves the current server time. You’ll see how to respond with dynamic data and keep routes organized.

```php
// Add this block after the previous route in public/index.php

$app->get('/time', function ($request, $response, $args) {
    $now = new DateTime();
    $response->getBody()->write("Current server time: " . $now->format('Y-m-d H:i:s'));
    return $response;
});
```

### Line-by-line explanation
- $app->get('/time', function (...) { ... });: Adds a new GET route at /time.
- $now = new DateTime();: Creates a DateTime object for the current moment.
- $response->getBody()->write("Current server time: " . $now->format('Y-m-d H:i:s'));: Writes a human-readable timestamp to the response body.
- return $response;: Returns the response to Slim.

What you’ve learned
- How to add multiple routes to a Slim app.
- How to produce dynamic data (server time) in a response.

Next, we’ll introduce JSON input and JSON responses to build a small API endpoint.

## 3. Handling JSON Input and JSON Output

APIs typically consume and return JSON. This section demonstrates parsing a JSON request body and returning a JSON response with the correct Content-Type header.

```php
// Add this route for a simple JSON greet endpoint

$app->post('/api/greet', function ($request, $response, $args) {
    // Parse JSON body (Slim can parse JSON when Content-Type is application/json)
    $data = $request->getParsedBody() ?: [];

    // Fallback if parsed body is not available
    if (!is_array($data)) {
        $data = json_decode($request->getBody()->getContents(), true) ?? [];
    }

    $name = $data['name'] ?? 'Guest';
    $payload = ['message' => "Hello, $name"];

    $response->getBody()->write(json_encode($payload));
    return $response->withHeader('Content-Type', 'application/json');
});
```

### Line-by-line explanation
- $app->post('/api/greet', function (...) { ... });: Defines a POST route at /api/greet.
- $data = $request->getParsedBody() ?: [];: Attempts to parse JSON body into an associative array. Falls back to an empty array if parsing fails.
- if (!is_array($data)) { ... }: Additional fallback to manually decode the body if getParsedBody() didn’t return an array.
- $name = $data['name'] ?? 'Guest';: Reads the name from the parsed body with a default.
- $payload = ['message' => "Hello, $name"];: Prepares a JSON-serializable payload.
- $response->getBody()->write(json_encode($payload));: Writes the JSON string to the response body.
- return $response->withHeader('Content-Type', 'application/json');: Sets the Content-Type header to application/json and returns the response.

What you’ve learned
- How to consume JSON payloads with Slim.
- How to respond with JSON and set the appropriate Content-Type header.
- A safe pattern for extracting data with defaults.

Next, we’ll add middleware to address cross-cutting concerns like logging.

## 4. Middleware and Cross-Cutting Concerns (Logging)

Middleware lets you run code before or after a route handler. Here we’ll add a simple logging middleware that records each request.

```php
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message ServerRequestInterface as Request;

// A simple logging middleware: logs method and path
$loggingMiddleware = function (Request $request, RequestHandler $handler): Response {
    error_log(sprintf("Incoming %s %s", $request->getMethod(), (string)$request->getUri()));
    $response = $handler->handle($request);
    return $response;
};

$app->add($loggingMiddleware);
```

### Line-by-line explanation
- use statements: Import the PSR interfaces for type hints.
- $loggingMiddleware = function (Request $request, RequestHandler $handler): Response { ... };: Defines a middleware function with the correct signature for Slim 4.
- error_log(sprintf("Incoming %s %s", ... ));: Logs the HTTP method and request URI to the server log.
- $response = $handler->handle($request);: Delegates to the next middleware or the route handler, obtaining the response.
- return $response;: Returns the response downstream.
- $app->add($loggingMiddleware);: Registers the middleware with the Slim app so it runs for every request.

What you’ve learned
- How to implement and attach a middleware in Slim 4.
- How to perform lightweight request logging in production-lean environments.

Optional extension: add a response-time header to observe latency.

```php
$timingMiddleware = function (Request $request, RequestHandler $handler): Response {
    $start = microtime(true);
    $response = $handler->handle($request);
    $duration = microtime(true) - $start;
    return $response->withHeader('X-Response-Time', number_format($duration * 1000, 2) . 'ms');
};

$app->add($timingMiddleware);
```

Line-by-line explanation
- $start = microtime(true);: Capture start time.
- $response = $handler->handle($request);: Continue processing the request.
- $duration = microtime(true) - $start;: Compute elapsed time.
- return $response->withHeader('X-Response-Time', ...);: Attach a performance header to the response.

What you’ve learned
- How to quantify and surface request latency to clients for observability.

## 5. Organizing Code with Controllers and Dependency Injection

As projects grow, routing directly to closures becomes hard to maintain. Using controller classes improves testability and organization. This section shows a simple controller and how to wire it to a route.

Controller file (src/Controllers/GreetController.php):
```php
<?php
namespace App\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class GreetController
{
    public function __invoke(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $name = $args['name'] ?? 'Guest';
        $response->getBody()->write("Hello, {$name} (controller)");
        return $response;
    }
}
```

Router wiring in public/index.php:
```php
require __DIR__ . '/../vendor/autoload.php';
use Slim\Factory\AppFactory;
use App\Controllers\GreetController;

$app = AppFactory::create();

// Wire controller class to route
$app->get('/hello/{name}', GreetController::class);

$app->run();
```

### Line-by-line explanation
- GreetController class: Encapsulates the request handling logic for the /hello/{name} route.
- __invoke method: Makes the controller usable as a route callable. Receives request, response, and route args.
- $name = $args['name'] ?? 'Guest';: Reads the route parameter with a default.
- $response->getBody()->write("Hello, {$name} (controller)");: Writes a response message.
- app->get('/hello/{name}', GreetController::class);: Registers the controller class as the route handler. Slim will instantiate and call __invoke automatically.

What you’ve learned
- How to convert route closures into controller classes for better maintainability.
- How to wire controller classes into Slim’s routing.

## X. Common Beginner Mistakes

Below are common beginner pitfalls with side-by-side bad vs good code. Each pair highlights a real issue and a recommended fix.

1) Not using the framework’s request object; relying on PHP superglobals
- Bad:
```php
$app->get('/user/{id}', function ($request, $response, $args) {
    $id = $_GET['id'] ?? null;
    // fetch user by $id
});
```
- Good:
```php
$app->get('/user/{id}', function ($request, $response, $args) {
    $id = $args['id'];
    // fetch user by $id
});
```

2) Returning JSON without setting Content-Type
- Bad:
```php
$app->get('/api/data', function ($request, $response, $args) {
    $payload = ['ok' => true];
    $response->getBody()->write(json_encode($payload));
    return $response;
});
```
- Good:
```php
$app->get('/api/data', function ($request, $response, $args) {
    $payload = ['ok' => true];
    $response->getBody()->write(json_encode($payload));
    return $response->withHeader('Content-Type', 'application/json');
});
```

3) Blocking or slow operations in request handling without consideration for performance
- Bad:
```php
$app->get('/wait', function ($request, $response, $args) {
    sleep(5); // blocks request thread
    $response->getBody()->write("Done");
    return $response;
});
```
- Good:
```php
$app->get('/wait', function ($request, $response, $args) {
    // Do not block; simulate non-blocking or delegate to async worker where possible
    $response->getBody()->write("Quick response while offloading work");
    return $response;
});
```

4) No validation or sanitization of inputs
- Bad:
```php
$app->get('/search', function ($request, $response, $args) {
    $q = $_GET['q']; // unsafe
    // perform search with $q
});
```
- Good:
```php
$app->get('/search', function ($request, $response, $args) {
    $q = filter_input(INPUT_GET, 'q', FILTER_SANITIZE_STRING);
    // perform search with sanitized $q
});
```

What these mistakes cost you
- Security vulnerabilities (input tampering, injection).
- Poor client experience due to untyped or misformatted responses.
- Maintenance headaches as the codebase grows.

## Y. Why This Matters In Real Systems

- Maintainability: Using a framework with controllers, middleware, and well-defined routes makes teamwork feasible. New developers can read routes and controllers to understand endpoints quickly.
- Observability: Middleware for logging and timing gives you visibility into traffic, latency, and potential bottlenecks.
- Security: Proper input handling, content types, and error handling are essential to protect users and services.
- Deployability: Slim apps can run behind modern web servers (Nginx/Apache) and in containerized environments (Docker). Clear structure simplifies scaling and testing.
- Reusability: Controllers and services can be tested in isolation, enabled by dependency injection patterns.

## Z. Study Questions

1) What is the role of a micro-framework like Slim in backend development?  
2) How do you access a path parameter in Slim 4 routes?  
3) How do you return a JSON response with the correct Content-Type header in Slim 4?  
4) What is middleware in a web framework, and how would you use it for logging?  
5) Why is organizing routes with controllers beneficial in larger projects?

## Exercise

Build a small, runnable Slim 4 application that demonstrates a production-ready pattern. Complete the following multi-part tasks. Provide code snippets for each step and explain what each part does.

Part A — Bootstrap a Slim app with three routes
- Create a minimal Slim 4 app with:
  - GET /health that returns { "status": "ok" } as JSON.
  - POST /echo that returns the JSON request body under a top-level key "received".
  - A controller-based route GET /greet/{name} that returns "Hello, {name}".

Part B — Add a middleware for timing and logging
- Implement a middleware that logs the method and path, and adds a header X-Processing-Time with the time taken to process the request (in ms). Attach it to the app.

Part C — Use a controller and dependency injection
- Create a simple controller class GreetController that formats the greeting. Wire the route to this controller class (not an anonymous function).

Part D — Validation and error handling
- Add input validation to /echo to ensure the request body is valid JSON. If invalid, return a 400 with JSON { "error": "Invalid JSON" }.

Part E — Run and verify locally
- Provide exact commands to install Slim, run a local PHP server, and test each endpoint with curl.

Example scaffolding (you can adapt as needed)

- composer.json (dependencies)
```json
{
  "require": {
    "slim/slim": "^4.0",
    "slim/psr7": "^1.0",
    "nyholm/psr7": "^1.5"
  }
}
```

- public/index.php
```php
<?php
require __DIR__ . '/../vendor/autoload.php';
use Slim\Factory\AppFactory;
use App\Controllers\GreetController;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;

$app = AppFactory::create();

// Middleware: log and timing
$loggingMiddleware = function (ServerRequestInterface $request, RequestHandler $handler): ResponseInterface {
    error_log(sprintf("Request: %s %s", $request->getMethod(), (string)$request->getUri()));
    $start = microtime(true);
    $response = $handler->handle($request);
    $duration = microtime(true) - $start;
    return $response->withHeader('X-Processing-Time', number_format($duration * 1000, 2) . 'ms');
};
$app->add($loggingMiddleware);

// Part A routes
$app->get('/health', function (ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface {
    $response->getBody()->write(json_encode(['status' => 'ok']));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->post('/echo', function (ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface {
    $body = $request->getBody()->getContents();
    $parsed = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $response->getBody()->write(json_encode(['error' => 'Invalid JSON']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    $response->getBody()->write(json_encode(['received' => $parsed]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Part C: controller-based route
$app->get('/greet/{name}', GreetController::class);

$app->run();
```

- src/Controllers/GreetController.php
```php
<?php
namespace App\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class GreetController
{
    public function __invoke(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $name = $args['name'] ?? 'Guest';
        $response->getBody()->write("Hello, {$name}!");
        return $response;
    }
}
```

Run locally (example)
- Install dependencies (in project root):
  - composer install
- Run PHP built-in server:
  - php -S 127.0.0.1:8080 -t public
- Test endpoints:
  - GET http://127.0.0.1:8080/health
  - POST http://127.0.0.1:8080/echo with body {"foo":"bar"} and Content-Type: application/json
  - GET http://127.0.0.1:8080/greet/Alice

What you’ll learn from the exercise
- End-to-end setup of a Slim-based PHP web server.
- How to build small, testable endpoints with different data formats.
- How to apply middleware for observability and non-functional requirements.
- How to structure code with controllers for maintainability in real projects.

If you want, I can tailor the exercise scaffold for a specific hosting environment (Docker container, Vagrant, or a particular CI setup) or expand any section with more complex examples (e.g., database integration with PDO, environment-based config, or unit tests).