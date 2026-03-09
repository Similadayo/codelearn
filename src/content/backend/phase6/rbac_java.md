# Role-Based Access Control (RBAC) in Java - Phase 6: Authentication & Security

RBAC is a fundamental mechanism for enforcing least-privilege access in backend systems. By modeling users, roles, and permissions, you can assign sets of capabilities to groups (roles) and keep authorization logic centralized, auditable, and scalable. In production, RBAC supports multi-tenant apps, secure APIs, and auditable access trails, reducing the attack surface and operational risk.

## 1. RBAC Foundations: Roles, Permissions, and the Access Check

- Concepts: 
  - Permissions represent atomic actions (READ, WRITE, DELETE, etc.).
  - Roles are collections of permissions.
  - Users can have one or more roles; authorization checks verify if any assigned role grants the required permission.

- Objective:
  - Create a clean, testable in-memory model showing how to check permissions via user roles.

```java
package com.example.rbac;

import java.util.EnumSet;
import java.util.Set;

// Atomic actions a user might perform
enum Permission {
    READ, WRITE, UPDATE, DELETE, MANAGE_USERS
}

// Roles map to a set of permissions
enum Role {
    USER(EnumSet.of(Permission.READ)),
    MODERATOR(EnumSet.of(Permission.READ, Permission.WRITE, Permission.UPDATE)),
    ADMIN(EnumSet.allOf(Permission.class)); // full access for admin

    private final Set<Permission> permissions;

    Role(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public boolean implies(Permission p) {
        return permissions.contains(p);
    }
}
```

### Line-by-line explanation
- package com.example.rbac; — Declares the package for organization and reuse.
- import java.util.EnumSet; import java.util.Set; — Imports collections used to hold permissions efficiently.
- enum Permission { ... } — Defines the atomic actions that can be granted.
- enum Role { USER(...), MODERATOR(...), ADMIN(...); } — Defines roles and their permission sets.
- private final Set<Permission> permissions; — Stores the permissions assigned to the role.
- Role(Set<Permission> permissions) { this.permissions = permissions; } — Constructor wiring the permission set to the enum constant.
- public Set<Permission> getPermissions() { return permissions; } — Accessor to inspect a role’s permissions.
- public boolean implies(Permission p) { return permissions.contains(p); } — Helper to check if this role grants a given permission.

## 2. Data Model: User, Role, and Permissions

- Objective:
  - Build a user model that can carry multiple roles and provide a reusable hasPermission check.

```java
package com.example.rbac;

import java.util.HashSet;
import java.util.Set;

class User {
    private final String id;
    private final String username;
    private final Set<Role> roles = new HashSet<>();

    public User(String id, String username) {
        this.id = id;
        this.username = username;
    }

    public void addRole(Role role) {
        roles.add(role);
    }

    public void removeRole(Role role) {
        roles.remove(role);
    }

    public boolean hasPermission(Permission permission) {
        for (Role role : roles) {
            if (role.implies(permission)) {
                return true;
            }
        }
        return false;
    }

    // Getters for id/username if needed by higher layers
    public String getId() { return id; }
    public String getUsername() { return username; }
    public Set<Role> getRoles() { return new HashSet<>(roles); }
}
```

```java
package com.example.rbac;

class AccessControlService {
    public boolean authorize(User user, Permission permission) {
        return user != null && user.hasPermission(permission);
    }
}
```

```java
package com.example.rbac;

class ResourceService {
    private final AccessControlService acs = new AccessControlService();

    public void readResource(User user) {
        if (!acs.authorize(user, Permission.READ)) {
            throw new RuntimeException("Access denied: READ permission required");
        }
        System.out.println("Resource read by " + user.getUsername());
        // actual read logic here
    }

    public void writeResource(User user) {
        if (!acs.authorize(user, Permission.WRITE)) {
            throw new RuntimeException("Access denied: WRITE permission required");
        }
        System.out.println("Resource written by " + user.getUsername());
        // actual write logic here
    }
}
```

### Line-by-line explanation
- User class:
  - Fields: id, username, and a Set<Role> to hold multiple roles for a single user.
  - addRole/removeRole: mutate the user’s role assignments.
  - hasPermission: iterates over roles, returning true if any role grants the requested permission.
  - Getters: useful for debug, tests, or UI.

- AccessControlService:
  - authorize: delegates to User.hasPermission to determine if a permission is granted.

- ResourceService:
  - readResource/writeResource: perform authorization checks before accessing the resource.
  - Throws runtime exceptions on denial to clearly signal authorization failures.

## 3. Annotated RBAC with a Lightweight Runtime Interceptor

- Objective:
  - Demonstrate a framework-agnostic, runtime-enforced approach using a custom annotation and a dynamic proxy to apply checks at method invocation time.

```java
package com.example.rbac;

import java.lang.annotation.*;
import java.lang.reflect.*;

// 3A. Annotation to declare required permission on a method
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequiresPermission {
    Permission value();
}
```

```java
package com.example.rbac;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

// Simple security context to simulate "current user" per thread
class SecurityContext {
    private static final ThreadLocal<User> currentUser = new ThreadLocal<>();
    public static void setUser(User u) { currentUser.set(u); }
    public static User getUser() { return currentUser.get(); }
}
```

```java
package com.example.rbac;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

// 3B. Dynamic proxy interceptor that enforces @RequiresPermission on interface methods
class RBACProxy implements InvocationHandler {
    private final Object target;
    private final AccessControlService acs = new AccessControlService();

    private RBACProxy(Object target) { this.target = target; }

    @SuppressWarnings("unchecked")
    public static <T> T create(T target, Class<T> iface) {
        return (T) Proxy.newProxyInstance(
            iface.getClassLoader(),
            new Class<?>[]{iface},
            new RBACProxy(target)
        );
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        RequiresPermission rp = method.getAnnotation(RequiresPermission.class);
        if (rp != null) {
            User user = SecurityContext.getUser();
            if (user == null || !acs.authorize(user, rp.value())) {
                throw new RuntimeException("Access denied: missing permission " + rp.value());
            }
        }
        return method.invoke(target, args);
    }
}
```

```java
package com.example.rbac;

// 3C. Service interface with annotated methods
public interface DocumentService {
    @RequiresPermission(Permission.READ)
    String readDocument(String id);

    @RequiresPermission(Permission.WRITE)
    void writeDocument(String id, String content);
}
```

```java
package com.example.rbac;

// 3C (cont'd). Concrete implementation
class DocumentServiceImpl implements DocumentService {
    public String readDocument(String id) {
        return "Document content for " + id;
    }
    public void writeDocument(String id, String content) {
        // write logic
        System.out.println("Updated " + id + " with new content: " + content);
    }
}
```

```java
package com.example.rbac;

class RBACDemo {
    public static void main(String[] args) {
        // Build a real service behind a proxy that enforces RBAC annotations
        DocumentService svc = RBACProxy.create(new DocumentServiceImpl(), DocumentService.class);

        User alice = new User("1", "alice");
        alice.addRole(Role.USER);

        User bob = new User("2", "bob");
        bob.addRole(Role.MODERATOR);

        User carol = new User("3", "carol");
        carol.addRole(Role.ADMIN);

        // Read as alice (allowed)
        SecurityContext.setUser(alice);
        System.out.println(svc.readDocument("doc1"));

        // Write as alice (denied)
        try {
            svc.writeDocument("doc1", "new content");
        } catch (RuntimeException ex) {
            System.out.println(ex.getMessage());
        }

        // Write as bob (allowed)
        SecurityContext.setUser(bob);
        svc.writeDocument("doc1", "updated by bob");

        // Read as carol (allowed)
        SecurityContext.setUser(carol);
        System.out.println(svc.readDocument("doc1"));
    }
}
```

### Line-by-line explanation
- 3A Annotation: Defines a runtime-visible annotation to declare required permissions on methods.
- SecurityContext: Simple ThreadLocal-based holder to model an authenticated user in the current execution thread.
- RBACProxy: A dynamic proxy that intercepts method calls, checks for RequiresPermission, and uses AccessControlService to authorize before delegating to the target method.
- DocumentService interface: Declares two operations, each annotated with the needed permission.
- DocumentServiceImpl: Real implementation with business logic.
- RBACDemo: Demonstrates using the proxy with three users of different roles to observe permission outcomes.

Note: This proxy approach is framework-agnostic and demonstrates the pattern. In production, you’d typically implement similar behavior with Spring Security or another framework for robust, audited, and scalable enforcement.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Hard-coding role checks in business logic (non-extensible)
  - Bad:
    ```java
    public boolean canDelete(User user) {
        return user.getRole().equals(Role.ADMIN);
    }
    ```
  - Good:
    ```java
    public boolean canDelete(User user) {
        return user.hasPermission(Permission.DELETE);
    }
    ```

- Mistake 2: Assuming a one-to-one mapping between user and a single role
  - Bad:
    ```java
    // User has only one role field
    class User { private Role role; }
    ```
  - Good:
    ```java
    // User can hold multiple roles
    class User { private Set<Role> roles = new HashSet<>(); boolean hasPermission(Permission p) { ... } }
    ```

- Mistake 3: Using a permissive "ADMIN" role everywhere (least privilege violation)
  - Bad:
    ```java
    user.addRole(Role.ADMIN); // all access for everyone
    ```
  - Good:
    ```java
    // Compose minimal roles per user
    user.addRole(Role.USER);
    if (needsWrites) user.addRole(Role.MODERATOR);
    ```

- Mistake 4: Not persisting role/permission changes or not reflecting them in checks
  - Bad:
    ```java
    // load permissions from static code path only
    boolean can = true; // no real check
    ```
  - Good:
    ```java
    // Load mappings from DB or config at startup and invalidate cache on changes
    ```

- Mistake 5: Missing audit and logging of authorization decisions
  - Bad:
    ```java
    throw new RuntimeException("Access denied");
    ```
  - Good:
    ```java
    logger.warn("Access denied: user={}, permission={}", user.getUsername(), permission);
    throw new RuntimeException("Access denied");
    ```

## 5. Why This Matters In Real Systems

- Security posture:
  - Ensures least privilege, reducing blast radius when credentials are compromised.
  - Centralizes authorization logic, making audits and reviews simpler.

- Production patterns:
  - DB-backed role-permission catalogs with caching for performance.
  - Dynamic role changes reflect in real-time or near real-time.
  - Auditing and telemetry: log every authorization decision (who, what, when, outcome).

- Integration points:
  - API gateways and microservices often rely on centralized RBAC (or ABAC) to enforce access checks consistently.
  - Combine RBAC with authentication (e.g., JWT or OAuth tokens) and attribute-based checks for finer control.

- Performance considerations:
  - Cache role/permission resolutions to avoid repeated DB lookups.
  - Use efficient data structures (e.g., EnumSet) for permission sets.
  - Be mindful of cache invalidation when roles change.

- Compliance and governance:
  - RBAC provides traceable, auditable access controls suitable for many regulatory regimes (e.g., HIPAA, GDPR, SOX).

## 6. Study Questions

1) Explain the difference between a Permission and a Role in RBAC. How does a User obtain a Permission?

2) What is the purpose of using EnumSet for permission collections in the Role enum?

3) How does the hasPermission method determine if a User can perform a given action?

4) What are the benefits and trade-offs of using a dynamic proxy (or AOP) to enforce method-level RBAC checks?

5) Why is auditing authorization decisions important in production systems?

## 7. Exercise — Practical multi-part coding challenge

Part A: Implement a small in-memory RBAC in Java (no frameworks required)

- Deliverables:
  - Permission and Role definitions (as shown in Section 1).
  - A User class capable of holding multiple roles (as in Section 2).
  - An AccessControlService with an authorize(User, Permission) method.
  - A ResourceService with readResource and writeResource methods (with proper authorization checks).

Part B: Add method-level RBAC with annotations (framework-agnostic)

- Deliverables:
  - Implement RequiresPermission annotation (as in Section 3A).
  - Implement a lightweight dynamic proxy (RBACProxy) (as in Section 3B) to enforce annotation-based checks at runtime.
  - Create a DocumentService interface with annotated methods and a DocumentServiceImpl with concrete logic (as in Section 3C).
  - Demonstrate usage with a small main() that sets different users and performs read/write operations, observing authorization results.

Part C: Basic testing and edge cases

- Tasks:
  - Test that a user with multiple roles can perform an action if any role grants the permission.
  - Ensure a user with no matching role cannot perform restricted actions.
  - Validate that changes to a user’s roles reflect in subsequent authorization checks (e.g., add or remove a role at runtime and re-check).

Part D: Production-oriented enhancements (optional, advanced)

- Suggestions:
  - Move Role->Permissions to a persistent store (DB) with a caching layer.
  - Integrate with a standard security framework (Spring Security) for robust authentication and authorization workflows.
  - Add audit logs for every authorization decision with user id, action, outcome, and timestamp.
  - Implement refreshable caches and cache invalidation strategies on role changes.

Note: While the exercises provide self-contained examples, real systems typically integrate RBAC with a full authentication stack, database-backed catalogs, and framework-specific security features for reliability, maintainability, and scalability.