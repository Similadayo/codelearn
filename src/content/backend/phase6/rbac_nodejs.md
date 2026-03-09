# Track: Backend Engineering - Module: Phase 6 — Authentication & Security - Topic: Role-Based Access Control (RBAC)

RBAC (Role-Based Access Control) is a foundational pattern for enforcing who can do what in a system. In modern web apps, RBAC helps maintain least-privilege security, simplifies auditing, and supports compliance requirements. This lesson walks you through the core concepts, practical Node.js implementations, data modeling, and real-world considerations so you can design scalable, secure access control in production systems.

## 1. Core Concepts of RBAC (Foundational patterns and a simple, centralized model)

RBAC assigns permissions to roles, and users gain access by being assigned one or more roles. This decouples "who a user is" from "what they can do." A few key ideas:
- Roles group permissions (e.g., admin, manager, analyst).
- Permissions are typically strings like "user:read", "order:create".
- Users may hold multiple roles; access is the union of permissions across their roles.
- Centralizing permissions makes audits, onboarding, and policy changes easier.

```js
// rbac-core.js
// Simple centralized RBAC model with static mappings
const rolesPermissions = {
  admin: ['user:create', 'user:read', 'user:update', 'user:delete', 'report:generate', 'inventory:read', 'inventory:write'],
  manager: ['user:read', 'report:generate', 'inventory:read'],
  analyst: ['report:generate', 'inventory:read'],
  viewer: ['inventory:read']
};

// Example user store (in-memory for simplicity)
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'manager' },
  { id: 3, name: 'Carol', role: 'analyst' },
  { id: 4, name: 'Dave', role: 'viewer' }
];

/**
 * Get a user's role object (safely handles missing users)
 */
function getUserRole(userId) {
  const user = users.find(u => u.id === userId);
  return user ? user.role : null;
}

/**
 * Check if a user has permission to perform an action
 * @param {number} userId
 * @param {string} action - e.g. 'user:read'
 * @returns {boolean}
 */
function canAccess(userId, action) {
  const role = getUserRole(userId);
  if (!role) return false;
  const perms = rolesPermissions[role] || [];
  return perms.includes(action);
}

// Demo usage
console.log(canAccess(1, 'user:delete')); // true (Alice is admin)
console.log(canAccess(2, 'user:delete')); // false (Bob is manager)
```
### Line-by-line explanation breaking down each line.
- Line 1-4: Define a simple mapping of roles to their permissions. Each role lists permitted actions as strings.
- Line 7-12: Define an in-memory user list with id, name, and role.
- Line 15-18: getUserRole looks up a user by ID and returns their role or null if not found.
- Line 21-31: canAccess determines the user’s role, retrieves the role’s permissions, and checks if the requested action is allowed.
- Line 34-35: Demonstration calls show how the function behaves for two users.

## 2. Implementing RBAC in Express Middleware (protecting routes)

In real apps, you typically couple RBAC with authentication (e.g., JWT). The middleware checks the incoming request’s user and enforces permissions before handing control to route handlers.

```js
// rbac-express.js
const express = require('express');
const app = express();

// Reuse the same rolesPermissions map from the previous section
const rolesPermissions = {
  admin: ['user:create', 'user:read', 'user:update', 'user:delete', 'report:generate', 'inventory:read', 'inventory:write'],
  manager: ['user:read', 'report:generate', 'inventory:read'],
  analyst: ['report:generate', 'inventory:read'],
  viewer: ['inventory:read']
};

// Mock authentication middleware (for demonstration)
app.use((req, res, next) => {
  // In production, replace this with proper JWT/session parsing
  // For demonstration, we attach a userId to req
  const userId = parseInt(req.headers['x-user-id'], 10);
  if (!userId) return res.status(401).send('Unauthorized');
  // Attach a minimal user object
  const user = { id: userId, role: ([
    { id:1, role:'admin' },
    { id:2, role:'manager' },
    { id:3, role:'analyst' },
    { id:4, role:'viewer' }
  ].find(u => u.id === userId) || { id: userId, role: 'viewer' }).role };
  req.user = { id: userId, role: user.role };
  next();
});

/**
 * Simple RBAC middleware factory
 * @param {string} action - action string like 'user:read'
 */
function authorize(action) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).send('Unauthorized');
    const perms = rolesPermissions[user.role] || [];
    if (perms.includes(action)) return next();
    return res.status(403).send('Forbidden');
  };
}

app.get('/users', authorize('user:read'), (req, res) => {
  res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
});

app.post('/users', authorize('user:create'), (req, res) => {
  // Creation logic here
  res.status(201).send('User created');
});

app.get('/reports', authorize('report:generate'), (req, res) => {
  res.json({ report: 'Quarterly metrics' });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`RBAC demo server running on http://localhost:${PORT}`));
```
### Line-by-line explanation breaking down each line.
- Lines 1-6: Set up an Express app and reuse the same permissions mapping from Section 1.
- Lines 9-19: A minimal middleware that pretends authentication by reading an X-User-Id header and attaching a user object to req. In production, replace with real auth.
- Lines 22-36: authorize(action) is a factory that returns middleware which enforces that the request’s user role has the given action in its permissions.
- Lines 38-40: GET /users route protected by 'user:read'.
- Lines 42-44: POST /users route protected by 'user:create'.
- Lines 46-48: GET /reports route protected by 'report:generate'.
- Lines 50-53: Start the server and log the listening address.

## 3. Data Modeling and Persistence for RBAC (storing roles and permissions)

RBAC scales when roles and permissions are stored in a database. A common pattern is to store roles with their permissions and assign roles to users. Below are two practical approaches: a simple MongoDB/Mongoose model and a more normalized relational model.

Option A — MongoDB/Mongoose (denormalized, simple)

```js
// models/rbac.js (Mongoose-like pseudo-models)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const rolePermissionsSchema = new Schema({
  role: { type: String, required: true, unique: true },
  permissions: [{ type: String }]
});

const userSchema = new Schema({
  name: String,
  role: { type: String, required: true, enum: ['admin', 'manager', 'analyst', 'viewer'] }
});

const RolePermissions = mongoose.model('RolePermissions', rolePermissionsSchema);
const User = mongoose.model('User', userSchema);

// Example seed (in practice, run once)
async function seed() {
  await RolePermissions.deleteMany({});
  await RolePermissions.create({
    role: 'admin',
    permissions: ['user:create','user:read','user:update','user:delete','report:generate','inventory:read','inventory:write']
  });
  await RolePermissions.create({
    role: 'manager',
    permissions: ['user:read','report:generate','inventory:read']
  });
  await RolePermissions.create({
    role: 'analyst',
    permissions: ['report:generate','inventory:read']
  });
  console.log('RBAC seed complete');
}
```

Option B — Relational/normalized (roles, permissions, and role-permissions join)

```sql
-- Schema (SQL)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  role_id INT REFERENCES roles(id)
);
```

Code to check permissions in a normalized setup (pseudo-JS/ORM style):

```js
// Pseudo-ORM style (abstracted)
async function canAccessDb(userId, action) {
  const user = await User.findById(userId).populate('role');
  const role = user.role.name;
  const perm = await Permission.findOne({ action });
  const has = await RolePermission.findOne({ role: role, permission_id: perm.id });
  return !!has;
}
```

Line-by-line explanation is similar to prior sections: describe how roles, permissions, and their relationships are stored, and how a lookup translates to an access decision. The key point: performance can be boosted with caching around frequent permission checks.

## 4. Advanced RBAC Patterns (hierarchies, dynamic checks, and SoD)

RBAC can be extended beyond flat role-permission maps to handle real-world needs like role hierarchies, temporary privilege elevation, and SoD (Segregation of Duties).

```js
// advanced-rbac.js (conceptual)
const roles = {
  admin: { permissions: ['*'], inherits: ['manager'] },
  manager: { permissions: ['inventory:read','inventory:write','report:generate','user:read'], inherits: ['analyst'] },
  analyst: { permissions: ['report:generate','inventory:read'], inherits: [] },
  viewer: { permissions: ['inventory:read'], inherits: [] }
};

function hasPermission(roleName, action, seen = new Set()) {
  const role = roles[roleName];
  if (!role) return false;
  // '*' means all permissions
  if (role.permissions.includes('*')) return true;

  if (role.permissions.includes(action)) return true;

  // Check inherited roles (hierarchy)
  for (const parent of role.inherits) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    if (hasPermission(parent, action, seen)) return true;
  }

  return false;
}

// Example usage
function canAccess(user, action) {
  return hasPermission(user.role, action);
}

const userA = { id: 1, name: 'Alex', role: 'analyst' };
console.log(canAccess(userA, 'inventory:write')); // false
const userB = { id: 2, name: 'Riley', role: 'manager' };
console.log(canAccess(userB, 'inventory:write')); // true (via manager)
```

Line-by-line explanation breaking down each line.
- Line 1-6: Define a role graph with permissions and an inheritance chain (admin inherits manager, etc.).
- Line 8-16: hasPermission recursively checks direct permissions and then inherited roles, avoiding cycles with a seen set.
- Line 18-28: canAccess is a simple wrapper that queries the user’s role and asks whether that role can perform the action.
- Lines 31-38: Demonstrates that a manager can perform inventory:write thanks to the inherited relationship, while the analyst cannot.

Practical notes:
- This pattern supports role hierarchies but can complicate auditing; document the inheritance rules clearly.
- Consider a policy engine or dedicated IAM solution when hierarchies become complex or dynamic.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Hard-coding permissions in the route or middleware
- Bad
```js
// Bad: hard-coded check scattered through routes
if (req.user?.role === 'admin' && action === 'user:delete') {
  next();
} else {
  res.status(403).send('Forbidden');
}
```
- Good
```js
// Good: centralized permission map and reusable checker
function canAccess(user, action) {
  const perms = rolesPermissions[user?.role] || [];
  return perms.includes(action) || perms.includes('*');
}
if (canAccess(req.user, 'user:delete')) {
  next();
} else {
  res.status(403).send('Forbidden');
}
```

### Pitfall 2: Not supporting multiple roles per user
- Bad
```js
// Bad: assumes a single role string
function canAccess(user, action) {
  return rolesPermissions[user.role]?.includes(action);
}
```
- Good
```js
// Good: supports multiple roles by aggregating permissions
function aggregatePermissions(user, allRoles) {
  const userRoles = user.roles || [user.role];
  const perms = new Set();
  userRoles.forEach(r => (allRoles[r] || []).forEach(p => perms.add(p)));
  return Array.from(perms);
}
function canAccess(user, action) {
  const perms = aggregatePermissions(user, rolesPermissions);
  return perms.includes(action) || perms.includes('*');
}
```

### Pitfall 3: Ignoring the need for least privilege and auditability
- Bad
```js
// Bad: blanket admin access everywhere
app.get('/admin', (req, res) => {
  if (req.user?.role === 'admin') res.send('admin panel');
  else res.status(403).send('Forbidden');
});
```
- Good
```js
// Good: explicit, auditable permissions per endpoint
app.get('/admin', authorize('admin:read'), (req, res) => {
  res.send('admin panel');
});

// Reusable authorize middleware as shown in Section 2
```

### Pitfall 4: Not handling missing or unauthenticated users gracefully
- Bad
```js
// Bad: assumes req.user always exists
if (req.user.role === 'admin') {
  // ...
}
```
- Good
```js
// Good: explicit auth checks with meaningful responses
if (!req.user) return res.status(401).send('Unauthorized');
if (!canAccess(req.user, 'inventory:read')) return res.status(403).send('Forbidden');
```

## Y. Why This Matters In Real Systems — production context and real usage

- Security and compliance: RBAC is often a baseline requirement for audits (e.g., SOC2, GDPR, HIPAA). Clear role definitions and permission trees help demonstrate control over who can access sensitive data.
- Operational efficiency: Centralized roles make onboarding/offboarding faster; adjusting access for many users is a change to a policy, not individual users.
- Scalability: As teams grow, maintaining per-user permissions becomes untenable. RBAC scales with the number of roles rather than the number of users.
- Auditing and traceability: Systems should log permission checks and access decisions to support investigations and compliance reviews.
- Performance considerations: In production, avoid recomputing permissions on every request. Cache user permissions with invalidation strategies (time-based TTL, event-driven invalidation on role changes).
- Integration patterns: Many organizations integrate with IAM providers (Auth0, AWS IAM, Azure AD) for centralized authentication and then enforce RBAC in your application logic or API gateway.

Production tips:
- Separate policy from code: store roles/permissions in a database or config service; keep middleware stateless and rely on a fast lookup.
- Cache permissions: e.g., in-memory cache with TTL; refresh on role changes or at defined intervals.
- Avoid permissive defaults: deny by default; require explicit permission mappings for all endpoints.
- Logging and observability: instrument permission checks, and log access decisions for sensitive actions.

## Z. Study Questions — 5 recall questions

1) What are the three core concepts of RBAC in the context of web applications?
2) How would you implement a reusable Express middleware to enforce a given action via RBAC?
3) What are the trade-offs between a denormalized (embedded permissions in roles) model vs a normalized (roles, permissions, role_permissions tables) model?
4) How can role hierarchies be represented and evaluated in RBAC, and what are potential pitfalls?
5) Why is caching permissions important in high-traffic systems, and what are safe invalidation strategies?

## Exercise — practical multi-part coding challenge

Part A — Build a small RBAC module
- Create a Node.js module that defines:
  - A rolesPermissions map for at least four roles (admin, manager, analyst, viewer) with non-overlapping and overlapping permissions.
  - A function canAccess(userId, action) that returns true/false based on the user’s role.
  - A tiny in-memory user store (as in the examples) to drive the checks.
- Deliverable: a single file or two small modules with clear exports.

Part B — Protect an Express app
- Scaffold a minimal Express app with:
  - A mock authentication middleware that attaches req.user based on an X-User-Id header.
  - The authorize(action) middleware from Section 2.
  - At least three routes:
    - GET /docs (requires 'user:read')
    - POST /docs (requires 'user:create')
    - GET /reports (requires 'report:generate')
- Run and test with different X-User-Id values to verify correct access control.

Part C — Add a simple data model (optional, bonus)
- Implement a basic in-memory or Mongoose-like model for Roles and Permissions (two structures: roles with a permissions array, and optional users with role references).
- Implement a function that loads permissions for a given user’s role and uses it to drive canAccess checks, illustrating the separation of concerns between data and policy.

Part D — Optional extension (hierarchy)
- Extend the model to support a simple hierarchy (admin > manager > analyst) and modify the permission check to respect inheritance.
- Show a test example demonstrating a user with role 'manager' gaining access to an action granted to 'analyst' via inheritance.

Notes for learners:
- Start simple (Section 1/Section 2 patterns) and gradually add data-model complexity (Section 3) as needed by your project.
- In real systems, integrate with a robust authentication mechanism first (JWT/session) and layer RBAC on top of that; RBAC is about authorization, not authentication.
- Always test with edge cases: unknown users, unknown actions, multi-role users, and actions that should require elevated privileges.

If you’d like, I can tailor the exercise scaffold to a specific stack (e.g., TypeScript, a particular ORM, or a testing framework) or provide a downloadable repo skeleton you can run locally.