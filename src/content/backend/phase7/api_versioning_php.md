# Track: Backend Engineering — Phase 7 — Advanced API Features — Topic: API Versioning & Deprecation Strategies (PHP)

APIs evolve over time. Versioning gives you a reliable path to introduce improvements without breaking existing clients, while well-planned deprecation policies help you retire old behavior gracefully. In PHP backend systems, choosing a versioning approach, implementing clean routing, and surfaced deprecation notices are essential for maintaining API stability at scale. This lesson provides concrete PHP patterns, production-oriented considerations, and hands-on exercises to build robust versioning and sunset workflows.

## 1. Versioning Approaches in PHP

Versioning strategies shape how clients access different API generations. The most common approaches are path-based versioning and content negotiation (via Accept headers). Each has trade-offs in discoverability, caching, and client adoption.

Code example A: Path-based versioning (simple front controller)
```php
<?php
// public/index.php
// Path-based: /api/v1/users or /api/v2/users
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);

// Expect: api/v{n}/resource
$version = 'v1';
$resource = 'home';
if (isset($segments[1]) && in_array($segments[1], ['v1','v2','v3'])) {
    $version = $segments[1];
}
if (isset($segments[2])) {
    $resource = $segments[2];
}

// Very small router
if ($resource === 'users') {
    if ($version === 'v1') {
        require __DIR__ . '/../src/controllers/v1/UserController.php';
        $c = new App\Controllers\V1\UserController();
        echo $c->listUsers();
        exit;
    } elseif ($version === 'v2') {
        require __DIR__ . '/../src/controllers/v2/UserController.php';
        $c = new App\Controllers\V2\UserController();
        echo $c->listUsers();
        exit;
    }
}

// Fallback
http_response_code(404);
echo json_encode(['error' => 'Not found']);
```

Code example B: Content negotiation with Accept header
```php
<?php
// public/negotiation.php
header('Content-Type: application/json');
$accept = $_SERVER['HTTP_ACCEPT'] ?? 'application/json';
$version = 'v1';

if (preg_match('/application\\/vnd\\.myapi\\.v(\\d+)\\+json/', $accept, $m)) {
    $version = 'v' . $m[1];
}

// Simple dispatch based on negotiated version
switch ($version) {
    case 'v1':
        require __DIR__ . '/../src/controllers/v1/UserController.php';
        $c = new App\Controllers\V1\UserController();
        echo $c->listUsers();
        break;
    case 'v2':
        require __DIR__ . '/../src/controllers/v2/UserController.php';
        $c = new App\Controllers\V2\UserController();
        echo $c->listUsers();
        break;
    default:
        http_response_code(406);
        echo json_encode(['error' => 'Unsupported API version in Accept header']);
        break;
}
```

Code example C: Versioned controllers (v1 vs v2)
```php
<?php
// src/controllers/v1/UserController.php
namespace App\Controllers\V1;

class UserController {
  public function listUsers(): string {
    // v1 data shape
    $payload = [
      'version' => 'v1',
      'users' => [
        ['id' => 1, 'name' => 'Alice'],
        ['id' => 2, 'name' => 'Bob'],
      ],
    ];
    return json_encode($payload);
  }
}
```

```php
<?php
// src/controllers/v2/UserController.php
namespace App\Controllers\V2;

class UserController {
  public function listUsers(): string {
    // v2 data shape (enhanced)
    $payload = [
      'version' => 'v2',
      'users' => [
        ['id' => 1, 'full_name' => 'Alice Smith', 'email' => 'alice@example.com'],
        ['id' => 2, 'full_name' => 'Bob Jones', 'email' => 'bob@example.com'],
      ],
      'metadata' => [
        'generated_at' => date('c')
      ],
    ];
    return json_encode($payload);
  }
}
```

### Line-by-line explanation
- Code A: Path-based router
  - Line 4-6: Read and normalize the request path to extract segments like api, v1, users.
  - Line 9-12: Default to v1; override if the second segment matches a known version.
  - Line 13-15: Default resource selection; override if a resource path segment exists.
  - Line 18-24: Simple versioned dispatch: load the v1 or v2 controller and call listUsers().
  - Line 26-29: Fallback 404 response for unknown paths.

- Code B: Accept header negotiation
  - Line 4: Set default JSON header for responses.
  - Line 5-7: Read Accept header; default to v1 if none provided.
  - Line 9-26: Switch on negotiated version; load and invoke the corresponding controller.
  - Line 17: If Accept header contains a pattern for vX, set version accordingly.
  - Line 22-26: Handle unsupported versions with HTTP 406.

- Code C: v1 and v2 controllers
  - V1: Line 1-6: Namespace and class setup; listUsers returns a simple v1 payload.
  - V2: Line 1-6: Namespace and class setup; listUsers returns a richer payload with full_name and email, plus metadata.

## 2. Implementing Versioned Endpoints & Negotiation

This section shows how to wire routing, controllers, and a lightweight response strategy that clearly communicates version information. It also sets up path-based and header-based versioning paths so you can compare trade-offs in a real system.

Code block A: Front controller with path-based routing (minimal)
```php
<?php
// public/index.php (path-based)
require __DIR__ . '/../vendor/autoload.php'; // if you use PSR-4 autoloading

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);
$version = $segments[1] ?? 'v1';
$resource = $segments[2] ?? 'home';

if ($resource === 'users') {
    if ($version === 'v1') {
        require __DIR__ . '/../src/controllers/v1/UserController.php';
        $c = new App\Controllers\V1\UserController();
        http_response_code(200);
        header('Content-Type: application/json');
        echo $c->listUsers();
        exit;
    } elseif ($version === 'v2') {
        require __DIR__ . '/../src/controllers/v2/UserController.php';
        $c = new App\Controllers\V2\UserController();
        http_response_code(200);
        header('Content-Type: application/json');
        echo $c->listUsers();
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
```

Code block B: v1 and v2 controllers (as above, included for completeness)
```php
// src/controllers/v1/UserController.php
namespace App\Controllers\V1;

class UserController {
  public function listUsers(): string {
    $payload = [
      'version' => 'v1',
      'users' => [
        ['id' => 1, 'name' => 'Alice'],
        ['id' => 2, 'name' => 'Bob'],
      ],
    ];
    return json_encode($payload);
  }
}
```

```php
// src/controllers/v2/UserController.php
namespace App\Controllers\V2;

class UserController {
  public function listUsers(): string {
    $payload = [
      'version' => 'v2',
      'users' => [
        ['id' => 1, 'full_name' => 'Alice Smith', 'email' => 'alice@example.com'],
        ['id' => 2, 'full_name' => 'Bob Jones', 'email' => 'bob@example.com'],
      ],
      'metadata' => [
        'generated_at' => date('c')
      ],
    ];
    return json_encode($payload);
  }
}
```

Code block C: Deprecation-aware middleware (sunset checks)
```php
<?php
// src/middleware/DeprecationMiddleware.php
class DeprecationMiddleware {
  private array $plan;
  public function __construct(array $plan) {
    $this->plan = $plan;
  }

  public function enforce(string $version): void {
    if (!isset($this->plan['sunset'][$version])) {
      return; // no sunset for this version
    }

    $sunsetDate = strtotime($this->plan['sunset'][$version]);
    if (time() >= $sunsetDate) {
      http_response_code(426);
      header('Content-Type: application/json');
      echo json_encode([
        'error' => "API version {$version} has sunset. Please migrate to a newer version.",
        'sunset' => $this->plan['sunset'][$version],
        'migration_guide' => $this->plan['migration_guide'][$version] ?? '/docs/migration'
      ]);
      exit;
    } else {
      header('X-API-Deprecation: Version '.$version.' is deprecated and will sunset on '.$this->plan['sunset'][$version]);
      header('X-API-Deprecation-Sunset: '.$this->plan['sunset'][$version]);
    }
  }
}
```

Code block D: Using the deprecation policy in a request flow
```php
<?php
// public/entry.php
require __DIR__ . '/../src/middleware/DeprecationMiddleware.php';

// Example plan: v1 sunsets on 2030-01-01; migration guide for v2
$deprecationPlan = [
  'sunset' => [
    'v1' => '2030-01-01',
  ],
  'migration_guide' => [
    'v1' => '/docs/migration/v1-to-v2',
  ],
  'migration_guide'['v2'] = '/docs/v2'
];

$version = 'v1'; // determined by router (path or negotiation) in real code
$dep = new DeprecationMiddleware($deprecationPlan);
$dep->enforce($version);

// Continue to route to the appropriate version (simplified)
if ($version === 'v1') {
  require __DIR__ . '/../src/controllers/v1/UserController.php';
  $c = new App\Controllers\V1\UserController();
  echo $c->listUsers();
} else {
  require __DIR__ . '/../src/controllers/v2/UserController.php';
  $c = new App\Controllers\V2\UserController();
  echo $c->listUsers();
}
```

### Line-by-line explanation
- Code A: Front controller with path routing
  - Line 1: PHP opening tag.
  - Line 4-6: Load the auto-loader if present (clean project setups).
  - Line 8-12: Parse and trim the path; extract version and resource from the URL.
  - Line 15-23: Conditional loading and invoking of the correct versioned controller for the users endpoint.
  - Line 25-29: Fallback 404 behavior when the path/version is not supported.

- Code B: v1/v2 controllers line-by-line
  - V1: Lines 3-9 define a simple class and a method that returns a v1 payload.
  - V2: Lines 3-11 define a class returning a richer v2 payload with metadata.

- Code C: DeprecationMiddleware line-by-line
  - Line 3-5: Class and constructor storing the sunset plan.
  - Line 7-18: enforce() checks if the current version has a sunset date; if past, returns 426 with a helpful message; otherwise emits deprecation headers.
  - Line 20-28: No sunset defined → no action; sunset defined → header emissions.

- Code D: Applying deprecation policy in flow
  - Line 4-7: Load the middleware class and initialize with a plan.
  - Line 12-20: Check version against the sunset plan and stop if sunset has occurred.
  - Line 23-31: Route to the appropriate version’s controller and output data.

## X. Common Beginner Mistakes

- Pitfall 1: Not clearly communicating version and sunset to clients
  - Bad
  ```php
  // api/v1/users
  // Returns v1 data but no hints about versioning
  ```
  - Good
  ```php
  // api/v1/users
  // Returns explicit 'version' field and HTTP header with deprecation notice
  header('X-API-Deprecation: v1 is deprecated in favor of v2');
  http_response_code(200);
  echo json_encode(['version' => 'v1', 'users' => [...]]);
  ```

- Pitfall 2: Diverging behavior across versioned controllers without shared contract
  - Bad
  ```php
  // v1/UserController.php
  function listUsers() { return ['users'=>[...] ]; }
  // v2/UserController.php
  function listUsers() { return ['people'=>[...] ]; } // different key names
  ```
  - Good
  ```php
  // Shared contract: always return 'users' key, but with version-specific fields inside
  return ['version' => 'v1', 'users' => [...]];
  ```

- Pitfall 3: Dropping deprecation planning or sunset dates
  - Bad
  ```php
  // No sunset date, no migration path
  // Clients assume v1 remains forever
  ```
  - Good
  ```php
  // Deprecation plan added with sunset date and migration guide
  $plan = ['sunset' => ['v1' => '2030-01-01'], 'migration_guide' => ['v1' => '/docs/migration/v1-to-v2']];
  // Middleware enforces sunset and returns 426 after sunset
  ```

- Pitfall 4: Ignoring content negotiation or not providing at least one stable path
  - Bad
  ```php
  // Only path-based versioning, no header-based option
  ```
  - Good
  ```php
  // Support both path-based and Accept-header-based versioning to ease client migration
  ```

## Y. Why This Matters In Real Systems

- Client stability and ecosystem health: Public or partner APIs must avoid breaking changes for existing clients. Versioned endpoints enable simultaneous longevity of old clients while encouraging migration.
- Migration planning reduces churn: A clear sunset window, migration documentation, and automated tests reduce the risk of breaking downstream apps and mobile clients.
- Observability and governance: Instrumentation around version usage (which version is called, by whom, and when sunset occurs) is essential for planning maintenance windows and deprecation timelines.
- Cache and CDN considerations: URL-path versioning is cache-friendly; header-based versioning can complicate caching unless you cache per variant. A hybrid approach requires careful cache-key design.
- Legal and contractual alignment: Deprecations often require release schedules, documentation, and predictable sunset dates to satisfy SLAs and third-party commitments.

## Z. Study Questions

1. What is the primary difference between path-based versioning and content-negotiation (Accept header) versioning?
2. Why is a sunset date important when deprecating an API version?
3. Which HTTP status code is commonly used to indicate that a deprecated API version should be migrated (and possibly why)?
4. How can you communicate deprecation to clients without breaking current users immediately?
5. What considerations should you have for caching when using multiple API versions?

## Exercise

Part A: Build a small PHP API with path-based versioning for users

- Requirements:
  - Implement a front controller that serves /api/v1/users and /api/v2/users.
  - v1 returns a simple list of users with id and name.
  - v2 returns an enhanced list including full_name and email.
  - Include a small deprecation plan: v1 sunsets on 2030-01-01 with a migration guide to v2.

Starter code (you may adapt to your project layout):
```php
// public/index.php
<?php
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments = explode('/', $path);
$version = $segments[2] ?? 'v1'; // expecting /api/v{n}/...
$resource = $segments[3] ?? 'home';

if ($version === 'v1' && $resource === 'users') {
  require __DIR__.'/../src/controllers/v1/UserController.php';
  $c = new App\Controllers\V1\UserController();
  header('Content-Type: application/json');
  echo $c->listUsers();
  exit;
}
if ($version === 'v2' && $resource === 'users') {
  require __DIR__.'/../src/controllers/v2/UserController.php';
  $c = new App\Controllers\V2\UserController();
  header('Content-Type: application/json');
  echo $c->listUsers();
  exit;
}
http_response_code(404);
echo json_encode(['error' => 'Not found']);
```

```php
// src/controllers/v1/UserController.php
<?php
namespace App\Controllers\V1;
class UserController {
  public function listUsers(): string {
    $payload = [
      'version' => 'v1',
      'users' => [
        ['id' => 1, 'name' => 'Alice'],
        ['id' => 2, 'name' => 'Bob'],
      ],
    ];
    return json_encode($payload);
  }
}
```

```php
// src/controllers/v2/UserController.php
<?php
namespace App\Controllers\V2;
class UserController {
  public function listUsers(): string {
    $payload = [
      'version' => 'v2',
      'users' => [
        ['id' => 1, 'full_name' => 'Alice Smith', 'email' => 'alice@example.com'],
        ['id' => 2, 'full_name' => 'Bob Jones', 'email' => 'bob@example.com'],
      ],
      'metadata' => [
        'generated_at' => date('c')
      ],
    ];
    return json_encode($payload);
  }
}
```

```php
// src/middleware/DeprecationMiddleware.php
<?php
class DeprecationMiddleware {
  private array $plan;
  public function __construct(array $plan) {
    $this->plan = $plan;
  }

  public function enforce(string $version): void {
    if (!isset($this->plan['sunset'][$version])) return;
    $sunset = strtotime($this->plan['sunset'][$version]);
    if (time() >= $sunset) {
      http_response_code(426);
      header('Content-Type: application/json');
      echo json_encode([
        'error' => "API version {$version} has sunset. Please migrate to a newer version.",
        'sunset' => $this->plan['sunset'][$version],
        'migration_guide' => $this->plan['migration_guide'][$version] ?? '/docs/migration'
      ]);
      exit;
    } else {
      header('X-API-Deprecation: Version '.$version.' is deprecated and will sunset on '.$this->plan['sunset'][$version]);
      header('X-API-Deprecation-Sunset: '.$this->plan['sunset'][$version]);
    }
  }
}
```

```php
// Example usage of deprecation plan (pseudo-flow)
<?php
require __DIR__ . '/../src/middleware/DeprecationMiddleware.php';
$plan = [
  'sunset' => ['v1' => '2030-01-01'],
  'migration_guide' => ['v1' => '/docs/migration/v1-to-v2']
];
$dep = new DeprecationMiddleware($plan);
$dep->enforce('v1');

// continue routing to v1 or v2 based on some routing logic
```

Notes for the exercise:
- You can run a tiny PHP server for testing: php -S localhost:8080 -t public
- Test endpoints:
  - http://localhost:8080/api/v1/users (v1)
  - http://localhost:8080/api/v2/users (v2)
- Then implement the deprecation sunset:
  - When the date passes (2030-01-01 for v1), requests to /api/v1/users should return 426 with a helpful body and a migration link.
- Optional enhancement: add Accept header negotiation as described earlier to switch versions without path changes.

If you complete this exercise, you’ll have a functional, versioned PHP API with a practical deprecation workflow, ready for real-world usage and client migration planning.