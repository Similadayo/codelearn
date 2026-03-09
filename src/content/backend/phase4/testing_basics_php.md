# Track: Backend Engineering — Phase 4 — Building Web Servers: Testing Basics — Unit & Integration Tests (PHP)

Testing is the backbone of resilient backend systems. Unit tests verify the correctness of individual components in isolation, while integration tests ensure that the interaction between parts of the system works as expected in a near-production setup. Mastery of these tests accelerates refactoring, reduces regression bugs, and gives confidence when shipping complex web server features.

## 1. Unit Testing Fundamentals in PHP

Unit tests focus on small, fast, deterministic units of code. They should be isolated from I/O, databases, and external services. In PHP, PHPUnit is the de facto standard testing framework. The example below demonstrates a pure, deterministic unit test for a small utility class.

```php
<?php
// src/EmailValidator.php
class EmailValidator {
    public function isValid(string $email): bool {
        if (empty($email)) return false;
        if (!strpos($email, '@')) return false;
        [$local, $domain] = explode('@', $email, 2);
        if (!$local || !$domain) return false;
        if (!strpos($domain, '.')) return false;
        if (strlen($domain) < 3) return false;
        return true;
    }
}
```

```php
<?php
// tests/EmailValidatorTest.php
use PHPUnit\Framework\TestCase;

class EmailValidatorTest extends TestCase {
    private EmailValidator $validator;

    protected function setUp(): void {
        $this->validator = new EmailValidator();
    }

    public function testValidEmails(): void {
        $this->assertTrue($this->validator->isValid('user@example.com'));
        $this->assertTrue($this->validator->isValid('alice.bob@sub.example.co.uk'));
    }

    public function testInvalidEmails(): void {
        $this->assertFalse($this->validator->isValid(''));
        $this->assertFalse($this->validator->isValid('no-at-symbol'));
        $this->assertFalse($this->validator->isValid('user@'));
        $this->assertFalse($this->validator->isValid('user@example'));
    }
}
```

### Line-by-line explanation breaking down each line

- // src/EmailValidator.php
- class EmailValidator { … }: Declares the EmailValidator class that encapsulates the email validation logic.
- public function isValid(string $email): bool { … }: Defines a public method isValid that accepts a string and returns a boolean.
- if (empty($email)) return false;: Short-circuits empty input, a common edge case.
- if (!strpos($email, '@')) return false;: Ensures there is at least one @ character.
- [$local, $domain] = explode('@', $email, 2);: Splits the email into local and domain parts.
- if (!$local || !$domain) return false;: Validates both parts exist and are non-empty.
- if (!strpos($domain, '.')) return false;: Requires a dot in the domain to resemble a real domain.
- if (strlen($domain) < 3) return false;: Basic domain length sanity check.
- return true;: If none of the checks failed, the email is considered valid.

- // tests/EmailValidatorTest.php
- use PHPUnit\Framework\TestCase;: Imports the PHPUnit base test class.
- class EmailValidatorTest extends TestCase { … }: Declares a test suite for EmailValidator.
- private EmailValidator $validator;: Declares a property to hold the validator instance.
- protected function setUp(): void { … }: PHPUnit hook that runs before each test; initializes the validator.
- $this->validator = new EmailValidator();: Creates the subject under test.
- public function testValidEmails(): void { … }: Test case for valid emails.
- $this->assertTrue($this->validator->isValid('user@example.com'));: Asserts a valid email passes.
- $this->assertTrue($this->validator->isValid('alice.bob@sub.example.co.uk'));: Another valid example.
- public function testInvalidEmails(): void { … }: Test case for invalid emails.
- $this->assertFalse($this->validator->isValid(''));: Empty string should fail.
- $this->assertFalse($this->validator->isValid('no-at-symbol'));: Missing @ should fail.
- $this->assertFalse($this->validator->isValid('user@'));: Incomplete domain should fail.
- $this->assertFalse($this->validator->isValid('user@example'));: Domain without a dot should fail.

## 2. Testing Strategy: Unit vs Integration

Unit tests verify a single class or function in isolation, using mocks or fakes for dependencies. Integration tests verify that multiple components work together, including routing, controllers, and persistence layers, often by simulating real HTTP requests.

```php
<?php
// tests/SignupIntegrationTest.php
use PHPUnit\Framework\TestCase;

class SignupIntegrationTest extends TestCase
{
    public function testSignupSendsWelcomeEmailAndCreatesUser()
    {
        // Mocking EmailService to simulate email sending
        $emailServiceMock = $this->createMock(EmailService::class);
        $emailServiceMock->expects($this->once())
            ->method('sendWelcomeEmail')
            ->with($this->equalTo('newuser@example.com'))
            ->willReturn(true);

        // The system under test: UserSignup which depends on EmailService
        $signup = new UserSignup($emailServiceMock);

        $result = $signup->signup('newuser@example.com', 'New User');
        $this->assertTrue($result);
    }
}
```

### Line-by-line explanation breaking down each line

- // tests/SignupIntegrationTest.php
- use PHPUnit\Framework\TestCase;: Imports the base test class.
- class SignupIntegrationTest extends TestCase { … }: Defines a test class for integration-ish behavior around signup.
- public function testSignupSendsWelcomeEmailAndCreatesUser() { … }: A test method describing the integration of signup and email notification.
- $emailServiceMock = $this->createMock(EmailService::class);: Creates a test double for EmailService.
- $emailServiceMock->expects($this->once()) … ->willReturn(true);: Configures the mock to expect exactly one call to sendWelcomeEmail with a specific email and to return true.
- $signup = new UserSignup($emailServiceMock);: Injects the mock into the system under test.
- $result = $signup->signup('newuser@example.com', 'New User');: Executes the signup flow.
- $this->assertTrue($result);: Verifies the signup reports success.

Note: In real-world PHP apps, integration tests often spin up a test HTTP layer and exercise the full request/response cycle. The example above shows a pragmatic, testable coupling point via dependency injection that behaves like an integration-facing boundary.

## 3. Writing Integration Tests for Web Requests

A lightweight integration test exercises the web layer by dispatching a simulated HTTP request through your router and handlers, without needing a live web server.

```php
<?php
// src/Http/Request.php
class Request {
    public string $method;
    public string $path;
    public array $query;
    public string $body;

    public function __construct(string $method, string $path, array $query = [], string $body = '')
    {
        $this->method = strtoupper($method);
        $this->path = $path;
        $this->query = $query;
        $this->body = $body;
    }
}
```

```php
<?php
// src/Http/Response.php
class Response {
    public int $statusCode;
    public string $body;
    public array $headers;

    public function __construct(int $statusCode = 200, string $body = '', array $headers = [])
    {
        $this->statusCode = $statusCode;
        $this->body = $body;
        $this->headers = $headers;
    }
}
```

```php
<?php
// src/Router.php
class Router {
    private array $routes = [];

    public function addRoute(string $method, string $path, callable $handler): void {
        $this->routes[] = compact('method','path','handler');
    }

    public function dispatch(Request $request): Response {
        foreach ($this->routes as $r) {
            if ($r['method'] !== $request->method) continue;
            // very naive path matching with {id} parameter
            $pattern = preg_replace('#\{[^\}]+\}#', '([^/]+)', $r['path']);
            $pattern = '#^' . $pattern . '$#';
            if (preg_match($pattern, $request->path, $matches)) {
                array_shift($matches); // remove full match
                $params = $matches;
                $response = ($r['handler'])(...$params);
                if ($response instanceof Response) return $response;
                return new Response(200, (string)$response);
            }
        }
        return new Response(404, 'Not Found');
    }
}
```

```php
<?php
// src/App.php
class App {
    private Router $router;

    public function __construct() {
        $this->router = new Router();
        // Define routes
        $this->router->addRoute('GET', '/hello', function() {
            return new Response(200, 'Hello World');
        });
        $this->router->addRoute('GET', '/user/{id}', function(string $id) {
            $user = ['id' => $id, 'name' => 'User ' . $id];
            return new Response(200, json_encode($user), ['Content-Type' => 'application/json']);
        });
    }

    public function handle(Request $request): Response {
        return $this->router->dispatch($request);
    }
}
```

```php
<?php
// tests/IntegrationHttpTest.php
use PHPUnit\Framework\TestCase;

class IntegrationHttpTest extends TestCase {
    public function testHelloRoute() {
        $app = new App();
        $request = new Request('GET', '/hello');
        $response = $app->handle($request);

        $this->assertEquals(200, $response->statusCode);
        $this->assertEquals('Hello World', $response->body);
    }

    public function testUserRoute() {
        $app = new App();
        $request = new Request('GET', '/user/42');
        $response = $app->handle($request);

        $this->assertEquals(200, $response->statusCode);
        $this->assertEquals('application/json', $response->headers['Content-Type'] ?? '');
        $this->assertEquals('{"id":"42","name":"User 42"}', $response->body);
    }

    public function testNotFound() {
        $app = new App();
        $request = new Request('GET', '/nope');
        $response = $app->handle($request);

        $this->assertEquals(404, $response->statusCode);
        $this->assertStringContainsString('Not Found', $response->body);
    }
}
```

### Line-by-line explanation breaking down each line

- // src/Http/Request.php
- class Request { … }: Plain data container for HTTP request details (method, path, query, body).
- public function __construct(string $method, string $path, array $query = [], string $body = '') { … }: Initializes a request object with defaults.
- $this->method = strtoupper($method);: Normalizes the HTTP method to upper case.
- $this->path = $path;: Stores the request path as-is for routing.
- $this->query = $query;: Stores any query parameters.
- $this->body = $body;: Stores the request body.

- // src/Http/Response.php
- class Response { … }: Simple HTTP response wrapper with status, body, and headers.
- public function __construct(int $statusCode = 200, string $body = '', array $headers = []) { … }: Initializes a response object.
- $this->statusCode = $statusCode;: Sets the HTTP status code.
- $this->body = $body;: Sets the response payload.
- $this->headers = $headers;: Sets HTTP headers.

- // src/Router.php
- class Router { … }: Lightweight router capable of route registration and dispatch.
- public function addRoute(string $method, string $path, callable $handler): void { … }: Registers a route with a handler.
- public function dispatch(Request $request): Response { … }: Attempts to match the request to a route and execute its handler.
- foreach ($this->routes as $r) { … }: Iterates registered routes to find a match.
- if ($r['method'] !== $request->method) continue;: Skips routes with a different HTTP method.
- $pattern = preg_replace('#\{[^\}]+\}#', '([^/]+)', $r['path']);: Transforms path parameters like {id} into a regex capture.
- $pattern = '#^' . $pattern . '$#';: Anchors pattern to start and end for exact matching.
- if (preg_match($pattern, $request->path, $matches)) { … }: Attempts to match the path against the pattern.
- array_shift($matches);: Removes the full match; remaining items are captured parameters.
- $params = $matches;: Collects route parameters for the handler.
- $response = ($r['handler'])(...$params);: Invokes the route handler with extracted parameters.
- if ($response instanceof Response) return $response;: If the handler already returns a Response, return it directly.
- return new Response(404, 'Not Found');: Fallback 404 if no route matched.

- // src/App.php
- class App { … }: Wires routes into a single dispatchable application.
- private Router $router;: Holds the router instance.
- public function __construct() { … }: Builds the router and registers routes.
- $this->router->addRoute('GET', '/hello', function() { … }): Registers a static text route.
- return new Response(200, 'Hello World');: Static success response.
- $this->router->addRoute('GET', '/user/{id}', function(string $id) { … }): Registers a dynamic user route.
- return new Response(200, json_encode($user), ['Content-Type' => 'application/json']);: Returns JSON user data.
- public function handle(Request $request): Response { … }: Entry point to process a request via the router.
- return $this->router->dispatch($request);: Delegates to router for handling.

- // tests/IntegrationHttpTest.php
- public function testHelloRoute() { … }: Validates /hello route returns proper response.
- $request = new Request('GET', '/hello');: Creates a GET request for /hello.
- $response = $app->handle($request);: Dispatches the request.
- $this->assertEquals(200, $response->statusCode);: Checks status.
- $this->assertEquals('Hello World', $response->body);: Checks body content.

- public function testUserRoute() { … }: Validates /user/{id} route with dynamic parameter.
- $request = new Request('GET', '/user/42');: Creates request for a specific user.
- $response = $app->handle($request);: Dispatches the request.
- $this->assertEquals(200, $response->statusCode);: Status check.
- $this->assertEquals('application/json', $response->headers['Content-Type'] ?? '');: Checks content type.
- $this->assertEquals('{"id":"42","name":"User 42"}', $response->body);: Validates payload.

- public function testNotFound() { … }: Validates non-existent route yields 404.
- $request = new Request('GET', '/nope');: Unknown path.
- $response = $app->handle($request);: Dispatches the request.
- $this->assertEquals(404, $response->statusCode);: 404 check.
- $this->assertStringContainsString('Not Found', $response->body);: Simple text-based error check.

## 4. Setting Up PHPUnit and Test Environment

A solid test setup requires consistent tooling, configuration, and repeatable test runs. The examples below show a minimal PHP project ready for unit and integration tests.

```json
{
  "name": "example/php-backend-testing",
  "require": {
    "php": ">=8.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.5"
  },
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
}
```

```xml
<!-- phpunit.xml -->
<phpunit bootstrap="vendor/autoload.php"
         colors="true"
         verbose="true">
    <testsuites>
        <testsuite name="Unit and Integration Tests">
            <directory>./tests</directory>
        </testsuite>
    </testsuites>
</phpunit>
```

### Line-by-line explanation breaking down each line

- composer.json
- "require-dev": { "phpunit/phpunit": "^9.5" }: Declares PHPUnit as a development dependency.
- "autoload": { "psr-4": { "App\\": "src/" } }: Sets up autoloading for production code under src/.
- The rest defines basic PHP project metadata and dependencies.

- phpunit.xml
- <phpunit bootstrap="vendor/autoload.php" …>: Configures PHPUnit to use Composer autoloading and enable colored output.
- <testsuites> … <directory>./tests</directory> </testsuites>: Points PHPUnit to the tests directory.
- The XML root config enables convenient, repeatable test runs.

## 5. Common Beginner Mistakes

### Pitfall 1: Testing with real databases in unit tests
Bad:
```php
<?php
class UserRepositoryTest extends TestCase {
    public function testSaveAndFind() {
        $repo = new UserRepository('pdo:mysql://prod-db'); // uses real DB
        $user = new User('alice@example.com');
        $repo->save($user);
        $this->assertNotNull($repo->find($user->id));
    }
}
```

Good:
```php
<?php
class UserRepositoryTest extends TestCase {
    public function testSaveAndFind() {
        $inMemory = new InMemoryDatabase();
        $repo = new UserRepository($inMemory); // uses in-memory fake DB for unit test
        $user = new User('alice@example.com');
        $repo->save($user);
        $this->assertNotNull($repo->find($user->id));
    }
}
```

### Pitfall 2: Testing private methods or implementation details
Bad:
```php
<?php
class Calculator {
    private function add(int $a, int $b): int { return $a + $b; }
}
```

Good:
```php
<?php
class Calculator {
    public function add(int $a, int $b): int { return $a + $b; }
}
```
Explanation: Test the public API, not private internals; private methods are implementation details that can change.

### Pitfall 3: Overusing mocks for everything
Bad:
```php
<?php
class UserServiceTest extends TestCase {
    public function testSignupEmailsUser() {
        $mailer = $this->createMock(Mailer::class);
        $mailer->expects($this->once())->method('send')->willReturn(true);
        $service = new UserService($mailer, new Logger());
        $service->signup('bob@example.com');
    }
}
```

Good:
```php
<?php
class UserServiceTest extends TestCase {
    public function testSignupSendsWelcomeEmailButWithoutOver-mocking Others() {
        // Partial real collaboration with a simple stub for the mailer
        $mailer = new MailerStub();
        $service = new UserService($mailer, new Logger());
        $result = $service->signup('bob@example.com');
        $this->assertTrue($result);
    }
}
```
Explanation: Use a realistic balance of test doubles and real components to avoid brittle tests.

## 6. Why This Matters In Real Systems

- Reliability and safety: Tests catch regressions as you refactor routes, controllers, or data models.
- Faster development cycles: unit tests provide fast feedback; integration tests validate end-to-end flows before deployment.
- CI/CD readiness: Automated test suites are the gatekeepers for code merged to main branches, enabling safer deployments of web servers.
- Database and I/O isolation: Properly isolating tests (in-memory DB, test containers, or SQLite) avoids flaky environments and data corruption.
- Clear contracts: Tests enforce public API expectations and error handling, serving as living documentation for team contributors.

In production-facing web servers, you typically combine:
- Extensive unit tests for business logic.
- Integration tests for HTTP routing, validation, and controllers.
- End-to-end tests that simulate user journeys (optional in PHP but valuable for critical flows).
- Performance and load tests in a staging environment to gauge response times and resource usage under concurrency.

## 7. Study Questions

1. What is the primary purpose of a unit test, and how does it differ from an integration test?
2. Why should tests mock dependencies, and when might you choose not to mock?
3. How can you structure a PHP application to facilitate effective integration tests of HTTP routes?
4. What are common pitfalls when setting up test environments with databases?
5. How does a typical PHPUnit configuration (phpunit.xml) help ensure consistent test runs across environments?

## 8. Exercise — Practical multi-part coding challenge

Part A: Unit tests for a small utility
- Implement a class CurrencyFormatter with a method format(decimal $amount, string $currencyCode): string that formats a number with 2 decimals and currency symbol (e.g., 19.5 USD -> "$19.50").
- Write PHPUnit tests that verify formatting for USD, EUR, and JPY (JPY uses no decimal places). Ensure edge cases like negative values format correctly.

Part B: Mocking a dependent service
- Create a UserRegistration service that depends on an EmailDispatcher interface with a method send(string $to, string $subject, string $body): bool.
- Implement a unit test that ensures signup calls the dispatcher with the expected subject and recipient, without sending real emails.

Part C: Integration test for routing
- Build a tiny PHP app (like in Section 3) with at least two routes: GET /health returns 200 OK and "OK", and POST /echo returns the posted body back with status 200.
- Write integration tests that dispatch requests to both routes and validate status codes and bodies.

Part D: CI script
- Add a GitHub Actions workflow or a simple shell script that runs composer install, then vendor/bin/phpunit, and fails the build if tests fail.

Part E: Reflective code audit
- Review a small existing PHP code sample and identify at least three improvements to tests (structure, isolation, naming, coverage). Propose concrete test changes and show the before/after snippet.

If you want, I can tailor these examples to a specific PHP framework (Laravel, Symfony, or a micro-framework you’re using) or keep them framework-agnostic for maximum portability.