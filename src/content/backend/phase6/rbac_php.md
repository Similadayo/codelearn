# RBAC in PHP: Phase 6 — Authentication & Security

Role-Based Access Control (RBAC) is a core technique in backend security that assigns permissions to roles rather than individual users. In production systems, RBAC enables scalable, auditable, least-privilege access decisions across dozens or thousands of users and resources. This lesson walks you through modeling RBAC in PHP, implementing permission checks, and integrating it into request handling and auditing workflows.

## 1. RBAC Fundamentals and Data Model

In RBAC, you typically model:
- Roles: named groups of permissions (e.g., admin, editor, viewer)
- Permissions: actions that can be performed (e.g., CREATE_ARTICLE, EDIT_ARTICLE, DELETE_COMMENT)
- Users: individuals who are assigned one or more roles
- Optional resource scoping: permissions may apply to specific resources (e.g., a particular article)

Code example: SQL schema for a simple RBAC store and a minimal PHP class scaffold to query it.

```sql
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  resource_type VARCHAR(50) NULL,
  resource_id INT NULL,
  PRIMARY KEY (role_id, permission_id, resource_type, resource_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

```php
<?php
// RBAC entry point: fetch and check permissions for a user.
// Assumes a PDO connection is available as $pdo.

class RBAC {
  private PDO $pdo;

  public function __construct(PDO $pdo) {
    $this->pdo = $pdo;
  }

  // Get all explicit permissions for a user (names + optional resource scoping)
  public function getPermissionsForUser(int $userId): array {
    $stmt = $this->pdo->prepare("
      SELECT DISTINCT p.name, rp.resource_type, rp.resource_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = :user_id
    ");
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // Check whether a user has a specific permission, optionally scoped to a resource
  public function hasPermission(int $userId, string $permission, ?string $resourceType = null, ?int $resourceId = null): bool {
    $stmt = $this->pdo->prepare("
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = :user_id
        AND p.name = :perm
        AND (rp.resource_type IS NULL OR rp.resource_type = :rtype)
        AND (rp.resource_id IS NULL OR rp.resource_id = :rid)
      LIMIT 1
    ");
    $stmt->execute([
      ':user_id' => $userId,
      ':perm'    => $permission,
      ':rtype'   => $resourceType,
      ':rid'     => $resourceId
    ]);
    return (bool) $stmt->fetchColumn();
  }
}
```

### Line-by-line explanation
- Line 1-2: PHP opening tag and class declaration for RBAC, which encapsulates DB access.
- Line 4-7: Constructor that stores the PDO instance for later queries.
- Line 10-17: getPermissionsForUser builds a query joining user_roles → roles → role_permissions → permissions to return all permissions a user has, including optional resource scoping.
- Line 18-31: hasPermission builds a query to check if there exists a permission grant for the user that matches the requested permission name and optional resource constraints. It returns true if a row is found, otherwise false.
- Line 34-37: End of class and PHP block.

## 2. Checking Permissions At Runtime (Authorization Checks)

Once you have the RBAC model, you need a lightweight, reusable way to authorize requests. This example shows a basic permission check integrated into a simple Router-like flow (vanilla PHP) to illustrate middleware-like behavior without a framework.

```php
<?php
// Simple RBAC middleware and route staging for a small PHP app.
class Router {
  private array $routes = [];

  public function add(string $method, string $path, callable $handler, ?array $permissions = null) {
    $this->routes[] = compact('method','path','handler','permissions');
  }

  // Dispatch a request, performing authorization before the handler if needed
  public function dispatch(string $method, string $path, int $userId, PDO $pdo) {
    foreach ($this->routes as $r) {
      if ($r['method'] === strtoupper($method) && $r['path'] === $path) {
        // If route requires permissions, check them
        if (!empty($r['permissions'])) {
          $rbac = new RBAC($pdo);
          foreach ($r['permissions'] as $perm) {
            if (!$rbac->hasPermission($userId, $perm)) {
              http_response_code(403);
              echo 'Forbidden';
              return;
            }
          }
        }
        // All checks passed, execute the handler
        call_user_func($r['handler']);
        return;
      }
    }
    http_response_code(404);
    echo 'Not Found';
  }
}
```

```php
<?php
// Example usage wiring up routes with required permissions.
// Assume $pdo is a valid PDO instance and $_SESSION['user_id'] is set after login.

$pdo = new PDO($dsn, $username, $password);
$router = new Router();

// Route that requires EDIT_ARTICLE permission
$router->add('GET', '/articles/edit', function() {
  echo "Edit Article Form";
}, ['EDIT_ARTICLE']);

// Route that requires DELETE_COMMENT permission
$router->add('POST', '/comments/delete', function() {
  echo "Comment deleted";
}, ['DELETE_COMMENT']);

// Dispatch a request (in real app, you would pull method/path from $_SERVER)
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI'], $_SESSION['user_id'] ?? 0, $pdo);
```

### Line-by-line explanation
- Line 1-2: PHP tag and Router class declaration used to register routes and optional permissions.
- Line 4-10: add() stores route information, including required permissions for that route.
- Line 12-28: dispatch() iterates routes, matches method/path, and, if permissions are required, checks each permission using an RBAC instance. If any permission check fails, returns 403; otherwise executes the route handler; if no route matches, returns 404.
- Line 31-41: Example of wiring routes with PERMISSION requirements and dispatching a request using the current user's ID.
- Line 43-47: End of PHP blocks.

## 3. Resource-Level Permissions and Inheritance (Advanced RBAC)

Many systems need resource-scoped permissions (e.g., a user can edit only articles they own). You can model resource_type and resource_id in role_permissions and combine with role inheritance if needed.

```php
<?php
// Simple RBAC extension: role inheritance (parent roles) and per-resource permissions
class RBAC {
  private PDO $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  // Get all permissions for a role, including inherited parents
  public function getPermissionsForRole(int $roleId): array {
    // BFS traversal of inheritance chain (assuming roles.parent_role_id column)
    $visited = [];
    $stack = [$roleId];
    $permissions = [];

    while (!empty($stack)) {
      $current = array_pop($stack);
      if (isset($visited[$current])) continue;
      $visited[$current] = true;

      // Direct permissions for current role
      $stmt = $this->pdo->prepare("
        SELECT p.name, rp.resource_type, rp.resource_id
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = :role
      ");
      $stmt->execute([':role' => $current]);
      foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $permissions[] = $row;
      }

      // Parent role (inheritance)
      $pstmt = $this->pdo->prepare("SELECT parent_role_id FROM roles WHERE id = :id");
      $pstmt->execute([':id' => $current]);
      $parent = $pstmt->fetchColumn();
      if ($parent) $stack[] = (int) $parent;
    }

    // Deduplicate by name and resource scope
    $seen = [];
    $dedup = [];
    foreach ($permissions as $perm) {
      $key = $perm['name'] . '|' . ($perm['resource_type'] ?? '') . '|' . ($perm['resource_id'] ?? '');
      if (!isset($seen[$key])) {
        $seen[$key] = true;
        $dedup[] = $perm;
      }
    }
    return $dedup;
  }
}
```

### Line-by-line explanation
- Line 1-3: PHP boilerplate and RBAC class with inheritance-aware capability.
- Line 5-7: Constructor storing the PDO instance.
- Line 10-28: getPermissionsForRole performs a BFS over role inheritance to gather permissions from the role and all its ancestors.
- Line 12-19: Fetches direct permissions for the current role along with optional resource scoping.
- Line 22-28: Retrieves the parent role, enqueues it for traversal if present.
- Line 31-41: Deduplicates the collected permission records to avoid duplicates.
- Line 44-47: End of class and PHP block.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

- Mistake 1: Checking high-privilege endpoints with user roles directly, not via a permission model
  Bad:
  ```php
  // Direct role check per endpoint (highly error-prone)
  if ($_SESSION['role'] !== 'admin') {
    http_response_code(403);
    exit('Forbidden');
  }
  ```
  Good:
  ```php
  // Centralized RBAC check
  $rbac = new RBAC($pdo);
  if (!$rbac->hasPermission($_SESSION['user_id'], 'MANAGE_USERS')) {
    http_response_code(403);
    exit('Forbidden');
  }
  ```

- Mistake 2: Granting broad permissions without resource scoping
  Bad:
  ```php
  // Grant all EDIT_ARTICLE permission to a role
  INSERT INTO role_permissions (role_id, permission_id) VALUES (1, 2);
  ```
  Good:
  ```php
  // Scope permission to a resource type and/or specific resource
  INSERT INTO role_permissions (role_id, permission_id, resource_type, resource_id)
  VALUES (1, 2, 'ARTICLE', NULL); -- all articles
  -- or
  INSERT INTO role_permissions (role_id, permission_id, resource_type, resource_id)
  VALUES (1, 2, 'ARTICLE', 123); -- article #123 only
  ```

- Mistake 3: Not caching permission lookups for performance
  Bad:
  ```php
  function isForbidden($userId, $action) {
    // Query DB on every request
    return !hasPermissionInDb($userId, $action);
  }
  ```
  Good:
  ```php
  // Cache per-user permissions for a short TTL
  $cacheKey = "rbac_user_$userId";
  $permissions = getFromCache($cacheKey);
  if ($permissions === null) {
    $rbac = new RBAC($pdo);
    $permissions = $rbac->getPermissionsForUser($userId);
    saveToCache($cacheKey, $permissions, 300); // 5 minutes
  }
  // Then check permission in-memory
  $hasPerm = in_array($action, array_column($permissions, 'name'));
  ```

- Mistake 4: Ignoring resource scoping and deny-by-default
  Bad:
  ```php
  // Any user with EDIT_ARTICLE can edit all articles
  if ($userRole === 'editor' && $action === 'EDIT_ARTICLE') { /* allow */ }
  ```
  Good:
  ```php
  // Use hasPermission with resource scope
  if (!$rbac->hasPermission($userId, 'EDIT_ARTICLE', 'ARTICLE', $articleId)) { /* deny */ }
  ```

## 5. Why This Matters In Real Systems

- Security and least privilege: RBAC enforces policy where users only perform actions they’re explicitly allowed to, reducing blast radius during breaches.
- Auditability: Role-permission mappings provide a clear, auditable trail of who can do what, aiding compliance (e.g., PCI, HIPAA, SOC 2).
- Maintainability: Updating role permissions scales better than per-user ACLs when the user base grows.
- Performance considerations: Caching permission sets reduces DB load; consider per-request vs per-session caching with sensible TTLs.
- Resource-level control: Many systems require scoped permissions (e.g., per article, per project). Correct resource scoping prevents privilege leakage.
- Testing and correctness: RBAC must be validated with unit tests and integration tests to catch grading mistakes where a permission is accidentally granted or denied.

Production patterns to consider:
- Cache permission lookups per user with TTLs and invalidation on role/permission changes.
- Use a centralized authorization middleware to separate business logic from policy decisions.
- Include audit logs for permission checks, including user, permission, resource, and outcome.
- Implement support for role hierarchies if your domain requires inheritance.

## 6. Study Questions

1) What are the core RBAC entities and how do they relate to each other?
2) How would you model resource-scoped permissions in a relational database?
3) Why is caching permission lookups beneficial in a high-traffic backend?
4) What is the difference between role-based and attribute-based access control (RBAC vs ABAC), and when might you choose ABAC?
5) How would you test RBAC rules to ensure both denial and grant cases are correct?

## 7. Exercise

Part A – Build a small in-memory RBAC prototype (no framework)

- Create PHP classes or associative arrays to represent:
  - Roles: admin, editor, viewer
  - Users with assigned roles
  - Permissions: VIEW_ARTICLE, EDIT_ARTICLE, DELETE_ARTICLE
  - Basic role-permission mappings (no resource scoping yet)
- Implement a simple hasPermission($userId, $permission) function using in-memory data.
- Write a small script that simulates a user attempting 3 actions (one allowed, one disallowed, one allowed with a different role).

Part B – Add resource-scoped permissions

- Extend the model to support resource_type and resource_id in the permission mapping.
- Implement hasPermission($userId, $permission, $resourceType, $resourceId) so that permissions can be granted per resource.
- Create sample data where:
  - Editor can EDIT_ARTICLE on article with id 101
  - Editor cannot EDIT_ARTICLE on article 102
- Demonstrate decisions for a user trying to edit 101 and 102.

Part C – Integrate middleware-like authorization into a tiny PHP route example

- Build a minimal Router class (as in Section 2) and add two routes:
  - GET /articles/{id} – requires VIEW_ARTICLE for the specific article
  - POST /articles/{id}/edit – requires EDIT_ARTICLE for that article
- Simulate a login (set a user_id in a variable) and show how the same code path handles authorized vs forbidden access.

Part D – Optional: Add role inheritance

- Extend the in-memory model to allow a role to inherit permissions from a parent role.
- Demonstrate that a user with a child role can do actions granted to the parent role as well.

Deliverables for the exercise:
- Complete PHP scripts for each part (A–D) that print clear output showing allowed or denied actions.
- Brief commentary explaining how the design scales to real systems and where you’d place caching and middleware in a framework-based project.

End of Lesson