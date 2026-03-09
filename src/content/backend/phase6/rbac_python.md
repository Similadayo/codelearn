# Track: Backend Engineering — Phase 6: Authentication & Security — Role-Based Access Control (RBAC) in Python

Role-Based Access Control (RBAC) is a foundational security pattern used in virtually every production backend. It reduces complexity, enforces least privilege, and makes audits and compliance easier. In Python backends, a well-designed RBAC model decouples authorization logic from business logic, supports role hierarchies, and enables dynamic permissions and auditing. This lesson builds a practical, testable RBAC engine from scratch and shows how to apply it in a small web context.

## 1. RBAC Foundations: Core Concepts and Python Modeling

In this section, we define the basic RBAC elements (roles, permissions, role inheritance) and implement a compact in-memory engine you can extend to a persistent store. We’ll cover: representing permissions, assigning roles to users, granting permissions to roles, and evaluating whether a user can perform an action.

```python
from typing import Dict, Set, Optional, List
from collections import defaultdict

class RBACEngine:
    def __init__(self):
        # Maps user_id -> set of roles
        self.user_roles: Dict[str, Set[str]] = defaultdict(set)
        # Maps role -> set of permissions (as strings like "read:data")
        self.role_permissions: Dict[str, Set[str]] = defaultdict(set)
        # Optional role inheritance: child_role -> set(parent_roles)
        self.role_inheritance: Dict[str, Set[str]] = defaultdict(set)
        # Optional temporary grants: user_id -> set(permissions) with simple TTL emulation
        self.temp_permissions: Dict[str, Set[str]] = defaultdict(set)

        # Simple audit log for production observability
        self.audit_log: List[str] = []

    def add_role(self, role: str) -> None:
        # Ensure role key exists
        self.role_permissions.setdefault(role, set())

    def grant_permission(self, role: str, permission: str) -> None:
        self.role_permissions[role].add(permission)

    def assign_role(self, user_id: str, role: str) -> None:
        self.user_roles[user_id].add(role)

    def add_role_inheritance(self, child: str, parent: str) -> None:
        self.role_inheritance[child].add(parent)

    def grant_temporary(self, user_id: str, permission: str) -> None:
        # Simple ephemeral grant; in real systems, you'd tie TTL and cleanup
        self.temp_permissions[user_id].add(permission)

    def log_access(self, user_id: str, permission: str) -> None:
        self.audit_log.append(f"USER={user_id} PERMISSION={permission}")

    def user_has_permission(self, user_id: str, permission: str) -> bool:
        # 1) Check temporary permissions first (ephemeral elevation)
        if permission in self.temp_permissions.get(user_id, set()):
            self.log_access(user_id, permission)
            return True

        # 2) Check all roles assigned to the user, with inheritance
        roles = self.user_roles.get(user_id, set())
        if any(self._role_has_perm(role, permission, set()) for role in roles):
            self.log_access(user_id, permission)
            return True

        # 3) Permission not found
        self.log_access(user_id, permission)
        return False

    def _role_has_perm(self, role: str, permission: str, visited: Set[str]) -> bool:
        if role in visited:
            return False
        visited.add(role)

        if permission in self.role_permissions.get(role, set()):
            return True

        # Recurse through parents for inherited permissions
        for parent in self.role_inheritance.get(role, set()):
            if self._role_has_perm(parent, permission, visited):
                return True

        return False
```

```python
# Demonstration of the RBAC engine
rbac = RBACEngine()

# Define roles
rbac.add_role("guest")
rbac.add_role("user")
rbac.add_role("admin")

# Grant base permissions
rbac.grant_permission("guest", "read:public")
rbac.grant_permission("user", "read:public")
rbac.grant_permission("user", "read:private")
rbac.grant_permission("admin", "write:private")
rbac.grant_permission("admin", "read:private")

# Role inheritance: admin inherits user permissions
rbac.add_role_inheritance("admin", "user")
rbac.add_role_inheritance("user", "guest")

# Assign roles to users
rbac.assign_role("alice", "user")
rbac.assign_role("bob", "admin")
rbac.assign_role("eve", "guest")

# Temporary elevation for 'alice'
rbac.grant_temporary("alice", "write:private")

print("alice can read public?", rbac.user_has_permission("alice", "read:public"))   # True (via user -> guest)
print("alice can read private?", rbac.user_has_permission("alice", "read:private")) # True (via user role)
print("alice can write private?", rbac.user_has_permission("alice", "write:private")) # True (temp elevation)
print("eve can read private?", rbac.user_has_permission("eve", "read:private"))     # False
print("bob can read private?", rbac.user_has_permission("bob", "read:private"))     # True (admin via inheritance)
```

### Line-by-line explanation
1. Import typing helpers and a default dict to ease dictionary initialization.
2. Define RBACEngine with internal mappings for users, roles, permissions, inheritance, and a simple audit log.
3. __init__: initialize all internal stores; prepare for temporary grants and audit.
4. add_role: ensure a role entry exists in the permission store.
5. grant_permission: assign a permission to a role.
6. assign_role: attach a role to a user.
7. add_role_inheritance: declare that one role inherits permissions from another.
8. grant_temporary: record a temporary permission for a user (ephemeral elevation).
9. log_access: append an access event to the audit log for future analysis.
10. user_has_permission: main public API to test if a user can perform a permission.
11. Check temporary permissions first (ephemeral elevation) and log the access attempt.
12. Retrieve the user’s roles and test all roles for the permission, including inheritance.
13. If none match, log the failed attempt and return False.
14. _role_has_perm: helper to recursively check a role and its parents for a permission, avoiding cycles.
15. In the demonstration block, we define roles, permissions, inheritance, assigns, and a temporary elevation, then query a few scenarios to illustrate outcomes.

### Line-by-line explanation (contextual notes)
- This model is intentionally compact and in-memory, suitable for learning, prototyping, or unit tests. For production, you’d back these structures with a database, add caching, and enforce transactional integrity.
- Inheritance is modeled as explicit parent links, allowing a role to transparently gain the permissions of its ancestors.
- Temporary permissions illustrate dynamic access control scenarios (e.g., a time-limited escalation). In real systems, you’d link TTLs, revocation, and audit events.

## 2. Role Hierarchies, Separation of Duties, and Contextual Permissions

This section extends the base model with role hierarchies more explicitly and introduces a lightweight Separation of Duties (SoD) constraint to prevent risky privilege combinations. We’ll also illustrate a simple context-sensitive permission like tenant-scoped access.

```python
from typing import Tuple, FrozenSet

class RBACEngineExtended(RBACEngine):
    def __init__(self):
        super().__init__()
        # SoD: a set of forbidden role pairs (unordered)
        self.sod_conflicts: Set[FrozenSet[str]] = set()

    def add_sod_conflict(self, role_a: str, role_b: str) -> None:
        self.sod_conflicts.add(frozenset([role_a, role_b]))

    def can_assign_role(self, user_id: str, new_role: str) -> bool:
        # Basic guard to avoid creating forbidden combos
        current = self.user_roles.get(user_id, set())
        for r in current:
            if frozenset([r, new_role]) in self.sod_conflicts:
                return False
        return True

    def assign_role(self, user_id: str, role: str) -> None:
        if not self.can_assign_role(user_id, role):
            raise ValueError(f"Assigning role '{role}' to user '{user_id}' violates SoD constraints.")
        super().assign_role(user_id, role)

    def set_contextual_permission(self, action: str, resource: str, tenant: str) -> str:
        # Build a contextual permission string
        return f"{action}:{resource}:tenant={tenant}"
```

```python
# Demonstration of role hierarchies and SoD
rbac2 = RBACEngineExtended()

# Roles and permissions
rbac2.add_role("guest")
rbac2.add_role("user")
rbac2.add_role("manager")
rbac2.add_role("admin")
rbac2.grant_permission("guest", "read:public")
rbac2.grant_permission("user", "read:public")
rbac2.grant_permission("user", "read:private")
rbac2.grant_permission("manager", "write:reports")
rbac2.grant_permission("admin", "delete:reports")

# Inheritance: admin > manager > user > guest
rbac2.add_role_inheritance("admin", "manager")
rbac2.add_role_inheritance("manager", "user")
rbac2.add_role_inheritance("user", "guest")

# SoD: prevent a user from being both 'admin' and 'auditor'
rbac2.add_sod_conflict("admin", "auditor")

# User assignments
rbac2.assign_role("carla", "guest")
rbac2.assign_role("dave", "user")

# Attempt to assign conflicting role
rbac2.assign_role("carla", "manager")  # carla now has guest and manager; Not conflicting with SoD unless auditor
try:
    rbac2.assign_role("carla", "auditor")  # This would violate SoD
except ValueError as e:
    print("SoD violation prevented:", e)

# Contextual permissions example
ctx_perm = rbac2.set_contextual_permission("read", "reports", "acme_corp")
print("Contextual permission example:", ctx_perm)

# Scoping tests
print("carla can read public?", rbac2.user_has_permission("carla", "read:public"))  # True (guest)
print("carla can read private?", rbac2.user_has_permission("carla", "read:private"))  # True (via inheritance)
print("dave can delete reports?", rbac2.user_has_permission("dave", "delete:reports"))  # False
print("dave can write reports?", rbac2.user_has_permission("dave", "write:reports"))    # True? depends on inheritance
```

### Line-by-line explanation
1. Import typing helpers for Sets and FrozenSet to model SoD pairs as immutable keys.
2. Define RBACEngineExtended as a subclass of the base RBACEngine to reuse core logic.
3. __init__: initialize And extend with SoD constraints container.
4. add_sod_conflict: add a forbidden pair of roles that cannot be simultaneously held by the same user.
5. can_assign_role: helper used to guard role assignment against SoD constraints.
6. assign_role: override to enforce SoD at assignment time; raise an exception on violation.
7. set_contextual_permission: construct a contextualized permission string for resource-tenant scoping.
8. Demonstration: create roles and permission sets, define a hierarchy, and apply an SoD conflict.
9. Attempt to assign conflicting roles and catch the raised exception to illustrate enforcement.
10. Build a contextual permission string to show how tenancy can be embedded in permission semantics.
11. Run a few basic permission checks to illustrate inheritance and basic access decisions.

Notes:
- This section demonstrates how role hierarchies naturally lead to broader access unless carefully constrained, and How SoD constraints can be encoded and enforced in a Python engine.
- Contextual permissions are a lightweight blueprint for real-world tenancy-aware access checks in multi-tenant systems.

## 3. Integrating RBAC with a Web Framework (Flask) in Python

Real systems expose RBAC checks via a web API. This section shows a small Flask-based example that enforces permissions via a decorator, tied to the in-memory RBAC engine from Section 1. You can adapt this to FastAPI, Django, or other frameworks.

```python
from flask import Flask, request, jsonify
import functools

app = Flask(__name__)

# Reuse the RBAC engine (for brevity, re-create or import in real projects)
rbac = RBACEngine()
rbac.add_role("guest")
rbac.add_role("user")
rbac.add_role("admin")
rbac.grant_permission("guest", "read:public")
rbac.grant_permission("user", "read:public")
rbac.grant_permission("admin", "write:private")
rbac.add_role_inheritance("admin", "user")

rbac.assign_role("alice", "user")
rbac.assign_role("bob", "admin")

def get_current_user():
    # In real apps, use auth tokens/JWTs; this is a lightweight stand-in
    return request.headers.get("X-User", "guest")

def require_permission(permission: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if rbac.user_has_permission(user, permission):
                return func(*args, **kwargs)
            return jsonify({"error": "forbidden"}), 403
        return wrapper
    return decorator

@app.route("/public-data", methods=["GET"])
@require_permission("read:public")
def public_data():
    return jsonify({"data": "This is public data"})

@app.route("/private-data", methods=["GET"])
@require_permission("read:private")
def private_data():
    return jsonify({"data": "This is private data"})

# Example usage:
# Set header X-User: alice to access public data
# Set header X-User: bob to access private data (via admin -> user -> read:private)
```

### Line-by-line explanation
1. Import Flask utilities and functools for decorators.
2. Create a Flask app instance to host endpoints.
3. Instantiate the RBAC engine and set up roles/permissions as a usable example.
4. Define a simple get_current_user() to extract a user identity from the request header.
5. Define require_permission decorator: a reusable authorization gate that consults RBAC.
6. Define a public endpoint protected by read:public permission.
7. Define a private endpoint protected by read:private permission.
8. Provide usage notes: how to send X-User headers to simulate different users and see different results.
9. This example demonstrates how to centralize authorization logic and keep route handlers focused on business logic.

## 4. Auditing, Least Privilege, and Dynamic Permissions

Practical backends require observability, principled access control, and sometimes dynamic permissions. This section demonstrates:
- Logging of access attempts for security and auditability.
- The principle of least privilege by restricting actions to the minimal necessary permissions.
- A simple approach to dynamic/temporary permissions.

```python
# Continuing from the first RBACEngine class (or reuse the Extended one)
rbac3 = RBACEngine()

# Basic setup
rbac3.add_role("viewer")
rbac3.add_role("editor")
rbac3.add_role("admin")
rbac3.grant_permission("viewer", "read:resource")
rbac3.grant_permission("editor", "read:resource")
rbac3.grant_permission("editor", "write:resource")
rbac3.grant_permission("admin", "delete:resource")

rbac3.assign_role("carol", "viewer")
rbac3.assign_role("dan", "editor")

# Logging and auditing logic is already integrated in user_has_permission
# Demonstrate real-time access attempts and the audit log
print("carol read resource?", rbac3.user_has_permission("carol", "read:resource"))
print("audit log:", "\n".join(rbac3.audit_log))

# Enforce least privilege: a function that requires a specific permission
def perform_sensitive_action(user_id: str, action_perm: str):
    if not rbac3.user_has_permission(user_id, action_perm):
        raise PermissionError(f"User {user_id} lacks {action_perm} permission.")
    # Action performed
    return f"Action {action_perm} performed by {user_id}"

print(perform_sensitive_action("dan", "write:resource"))
# The following would raise an error unless dan has the permission
try:
    print(perform_sensitive_action("carol", "write:resource"))
except PermissionError as e:
    print("Access denied:", e)
```

### Line-by-line explanation
1. Create a new RBAC engine instance to illustrate auditing and dynamic permissions in isolation.
2. Define roles and permissions: viewer can read, editor can read/write, admin can delete.
3. Assign roles to users to simulate different privilege levels.
4. Call user_has_permission to simulate access attempts; the engine logs these attempts.
5. Print the audit log to demonstrate how security teams can review access activity.
6. Define a helper to perform a sensitive action that requires a given permission; raises if not allowed.
7. Show a successful action by a user with sufficient privileges and a denied attempt for a user lacking permissions.
8. This pattern helps ensure that every authorization decision is auditable and traceable.

Notes:
- In production, you’d integrate with a centralized logging/telemetry system (ELK/Datadog/etc.), correlate with user identities, and ensure that all authorization checks are instrumentation-friendly.
- Dynamic permissions and temporary elevations are powerful but must be tightly controlled and audited to avoid privilege creep.

## 5. Why This Matters In Real Systems — Production Context and Real Usage

RBAC is not just a theory—it's a production discipline. Key reasons it matters:

- Security by design: Restrict access based on the minimum privileges required for a task, reducing blast radius in case of compromise.
- Compliance and audits: Clear role-permission mappings, role hierarchies, and an audit trail are often required by frameworks like SOC 2, PCI-DSS, GDPR, and HIPAA.
- Multi-tenant isolation: Separate tenants share a backend; RBAC helps enforce tenant boundaries at the action level.
- Operational clarity: When onboarding new developers or services, roles and permissions map cleanly to responsibilities and APIs, reducing accidental over-privilege.
- Adaptability: Role hierarchies and contextual permissions allow you to model complex business policies (e.g., separation of duties, escalations, or temporary access) without sprinkling authorization logic all over your codebase.

Production best practices:
- Persist RBAC data in a central store (db, LDAP, or an IAM system) with versioning and migrations.
- Centralize authorization checks behind a reusable API (like the RBACEngine) rather than embedding ad-hoc checks.
- Cache permissions with a sensible invalidation strategy to avoid latency while staying fresh.
- Instrument and audit every authorization decision; expose an audit API for compliance teams.
- Test RBAC rules exhaustively (unit tests, property-based tests for role inheritance, and end-to-end tests with representative user roles).

## 6. Study Questions — 5 Recall Questions

1. What are the three core concepts of RBAC, and how do role inheritance and permission assignment relate to them?
2. How would you implement a simple role hierarchy so that an "admin" implicitly has all the permissions of a "user"?
3. What is the purpose of a Separation of Duties (SoD) constraint, and how can you enforce it in code?
4. Describe how you would incorporate contextual or tenancy-based permissions in an RBAC model.
5. Why is auditing access attempts important in RBAC, and what would you typically log?

## 7. Exercise — Practical Multi-Part Coding Challenge

Part A: Build a reusable Python RBAC module
- Implement an RBAC engine (either extend the one provided in Section 1 or create a modular version).
- Requirements:
  - Define core entities: roles, permissions, users, and optional role inheritance.
  - Support assigning roles to users, granting permissions to roles, and evaluating user permissions.
  - Include a simple audit log of permission checks.

Part B: Add Role Hierarchy and SoD
- Extend the engine to:
  - Support role inheritance (e.g., admin > manager > user).
  - Support a basic Separation of Duties constraint (e.g., prohibit a user from holding two conflicting roles simultaneously).
- Provide a small demonstration script that:
  - Creates three roles with a hierarchy.
  - Defines a couple of SoD conflicts.
  - Assigns roles to two users, attempts to assign a conflicting role, and shows enforcement.

Part C: Minimal Web Integration (Flask)
- Build a minimal Flask app (or reuse the example from Section 3) with at least two endpoints:
  - One endpoint requiring a read permission for a resource.
  - One endpoint requiring a write permission for the resource.
- Demonstrate how a client with different X-User headers receives different responses.
- Ensure the endpoints are protected by a reusable decorator (require_permission) and that all access attempts are logged.

Part D: Testing and Validation
- Write a small test script (or pytest-style tests) that asserts:
  - Users with inherited permissions can access inherited routes.
  - SoD constraints prevent conflicting role assignments.
  - Temporary grants grant access, and logs capture the access attempt.

Deliverables:
- A Python module (rbac.py or similar) containing the RBAC engine with:
  - Role and permission models
  - Inheritance support
  - SoD constraints
  - Optional temporary permissions
  - An audit/logging mechanism
- A short demonstration script showing typical usage and outputs.
- (Optional) A Flask snippet showing protected endpoints and how to exercise them with different users.

This completes a detailed, production-oriented lesson on Role-Based Access Control in Python, covering core modeling, role hierarchies, dev-friendly integration with a web framework, auditing and dynamic permissions, and hands-on exercises to build confidence with RBAC in real systems.