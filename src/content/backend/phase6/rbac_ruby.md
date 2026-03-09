# Role-Based Access Control (RBAC) in Ruby — Phase 6: Authentication & Security

RBAC is a foundational pattern for securing backend systems. It lets you model who can do what by assigning permissions to roles and roles to users. In production, RBAC supports least-privilege access, simplifies audits, and scales as teams and resources grow. This lesson walks through a pragmatic, in-memory Ruby implementation, demonstrates how to integrate it into your app flow, highlights common pitfalls, and provides hands-on exercises to solidify your understanding.

## 1. Core RBAC Concepts and Data Model

This section defines the minimal in-memory data model: Permission, Role, User, and a central RBAC authorization checker. The goal is a clean separation of concerns: permissions describe what actions are allowed on which resources, roles group permissions, and users gain capabilities via roles.

```ruby
# Core RBAC data model (in-memory, no DB)
class Permission
  attr_reader :action, :resource

  def initialize(action, resource)
    @action = action.to_sym
    @resource = resource.to_sym
  end

  def matches?(action, resource)
    @action == action.to_sym && @resource == resource.to_sym
  end
end

class Role
  attr_reader :name, :permissions

  def initialize(name)
    @name = name.to_s
    @permissions = []
  end

  def add_permission(permission)
    @permissions << permission
  end

  def has_permission?(action, resource)
    @permissions.any? { |p| p.matches?(action, resource) }
  end
end

class User
  attr_reader :name, :roles

  def initialize(name)
    @name = name.to_s
    @roles = []
  end

  def add_role(role)
    @roles << role
  end

  def has_role?(role_name)
    @roles.any? { |r| r.name == role_name.to_s }
  end
end

# Central authorization checker
module RBAC
  def self.authorize?(user, action, resource)
    user.roles.any? { |role| role.has_permission?(action, resource) }
  end
end

# Demo data setup
read_documents = Permission.new('read', 'documents')
write_documents = Permission.new('write', 'documents')

admin_role = Role.new('admin')
admin_role.add_permission(read_documents)
admin_role.add_permission(write_documents)

viewer_role = Role.new('viewer')
viewer_role.add_permission(read_documents)

alice = User.new('Alice')
alice.add_role(admin_role)

bob = User.new('Bob')
bob.add_role(viewer_role)

# Examples
puts RBAC.authorize?(alice, 'read', 'documents')  # => true
puts RBAC.authorize?(bob, 'write', 'documents')   # => false
```

### Line-by-line explanation

- Line 1-2: Define a class Permission to capture an action (e.g., read, write) and a resource (e.g., documents).
- Line 4-6: Initialize action and resource as symbols for consistent comparisons.
- Line 8-10: matches? returns true when both action and resource match the given inputs.
- Line 13-16: Define Role with a name and a list of permissions.
- Line 18-22: add_permission stores a Permission in the role’s permissions array.
- Line 24-26: has_permission? checks if any permission on the role matches the requested action/resource.
- Line 29-33: Define User with a name and a collection of roles; add_role attaches a role to the user.
- Line 35-37: has_role? (utility) checks if the user has a named role.
- Line 40-44: RBAC module with authorize? iterates through the user’s roles and returns true if any role grants the action/resource.
- Line 47-55: Create sample permissions, roles, and users; attach roles to users; demonstrate authorization results.

## 2. Integrating RBAC with a Ruby Web Framework (conceptual Rails-like usage)

In real apps, you’ll want to enforce authorization at controllers, services, and/or middleware layers. This section shows a lightweight pattern to raise a controlled error when access is denied, keeping your business logic clean and testable.

```ruby
# Lightweight authorization helper (framework-agnostic)
module Authorization
  class ForbiddenError < StandardError; end

  def self.authorize!(user, action, resource)
    unless RBAC.authorize?(user, action, resource)
      raise ForbiddenError, "Access denied: #{user.name} cannot #{action} #{resource}"
    end
  end
end

# Example usage in a controller-like method
def edit_document(user, document)
  Authorization.authorize!(user, 'write', 'documents')
  # proceed with edit operation (document is abstracted as a resource name here)
  "Document #{document} edited by #{user.name}"
end

# Demo
begin
  puts edit_document(alice, 'Quarterly_Report.pdf')
rescue Authorization::ForbiddenError => e
  puts e.message
end

begin
  puts edit_document(bob, 'Quarterly_Report.pdf')
rescue Authorization::ForbiddenError => e
  puts e.message
end
```

### Line-by-line explanation

- Line 4-5: Define a ForbiddenError to represent an unauthorized access attempt.
- Line 7-11: authorize! uses RBAC.authorize? and raises ForbiddenError with a descriptive message if access is denied.
- Line 14-18: Example controller-like function that attempts to perform a write on documents. It calls authorize! before proceeding.
- Line 21-25: Demonstration: Alice should succeed (has admin role with write permission); Bob should fail (viewer only has read).
- Line 26-28: Rescue blocks print either success or error messages.

## 3. RBAC Best Practices and Extensibility

This section demonstrates patterns to scale RBAC, improve performance, and support more realistic usage (caching, audits, and more granular resources).

```ruby
# Simple caching for repeated authorization checks (per-process memoization)
class RBAC
  @permissions_cache = {}

  class << self
    attr_accessor :permissions_cache
  end

  def self.permissions_for(user)
    # Flatten permissions from all roles, with memoization
    @permissions_cache[user.object_id] ||= user.roles.flat_map(&:permissions)
  end

  def self.authorize?(user, action, resource)
    permissions_for(user).any? do |perm|
      perm.action == action.to_sym && perm.resource == resource.to_sym
    end
  end

  def self.clear_cache!
    @permissions_cache.clear
  end
end

# Example of recomputing after a change
alice.clear_cache if alice.respond_to?(:clear_cache!)
# (In this simplified example, call RBAC.clear_cache! to reset cache when roles/permissions change.)
```

### Line-by-line explanation

- Line 4-6: Extend RBAC with a class-level cache to store computed permissions per user.
- Line 8-14: permissions_for returns cached flattened permissions; if not cached, it computes from all roles.
- Line 16-21: authorize? iterates through cached permissions to check for a matching action/resource tuple.
- Line 23-26: clear_cache! provides a hook to invalidate the cache when roles or permissions change.
- Line 29-31: Example note: after mutating a user’s roles/permissions, you should invalidate the cache to reflect updates.

## 4. X. Common Beginner Mistakes

Bad vs Good examples help you spot and fix typical RBAC pitfalls early.

- Pitfall 1: Checking only role names instead of permissions
  - Bad:
    ```ruby
    # Bad: relies on role name presence
    def can_write_documents?(user)
      user.roles.map(&:name).include?('admin')
    end
    ```
  - Good:
    ```ruby
    def can_write_documents?(user)
      RBAC.authorize?(user, 'write', 'documents')
    end
    ```

- Pitfall 2: Duplicated authorization checks scattered across code
  - Bad:
    ```ruby
    # In multiple controllers
    if user.roles.any? { |r| r.name == 'admin' }
      # allow
    else
      # deny
    end
    ```
  - Good:
    ```ruby
    Authorization.authorize!(user, 'write', 'documents')
    # Centralized check; same outcome, single source of truth
    ```

- Pitfall 3: Not updating permissions when roles change
  - Bad:
    ```ruby
    # Never invalidates cache after mutating roles
    RBAC.authorize?(user, 'delete', 'documents')
    ```
  - Good:
    ```ruby
    RBAC.clear_cache!
    RBAC.authorize?(user, 'delete', 'documents')
    ```

- Pitfall 4: String vs symbol inconsistencies
  - Bad:
    ```ruby
    perm = Permission.new('Read', 'Documents')
    # later, compare with :read and :documents
    perm.action == 'read' # false
    ```
  - Good:
    ```ruby
    perm = Permission.new(:read, :documents)
    perm.action == :read
    perm.resource == :documents
    ```

## 5. Y. Why This Matters In Real Systems

- Security posture and least-privilege: RBAC ensures users have only the permissions necessary to perform their job, reducing blast radius.
- Auditability: Models around roles, permissions, and assignments make it straightforward to generate access reports for compliance.
- Scale and maintenance: Grouping permissions by roles simplifies onboarding/offboarding, policy changes, and approvals.
- Performance considerations: In production, use caching, deny-by-default patterns, and audit logs for authorization decisions to avoid performance bottlenecks.
- Integration points: RBAC works well with IAM services, external authorization services, and can be layered with attribute-based access control (ABAC) for dynamic policies.

## 6. Z. Study Questions

1. What are the three core RBAC concepts, and how do they relate to each other?
2. How would you implement a “read” permission for a resource named “documents” and assign it to a role called “viewer”?
3. Why is a centralized authorization check preferable to ad-hoc permission checks scattered across the codebase?
4. How can you improve performance of authorization in a high-traffic backend?
5. How would you implement a permission revocation flow (removing a permission from a role)?

## Exercise

Part A: Extend the RBAC model to support revoking a permission from a role and removing a role from a user.

- Implement:
  - Role#remove_permission(permission)
  - User#remove_role(role)
  - A small utility to print a user’s effective permissions (deduplicated)

Part B: Add a quick helper to list all permissions for a given user.

- Implement:
  - RBAC.permissions_for(user) returning an array of [action, resource] pairs
  - Provide a sample script that prints a user’s permissions in a readable format

Part C: Build a small, runnable driver script that creates roles and users, assigns multiple permissions, and exercises authorization checks across different scenarios.

- Tasks:
  - Create roles: admin (read/write on documents, read on reports), editor (read/write on documents), viewer (read on documents)
  - Create users: alice (admin), carol (editor), dave (viewer)
  - Run a sequence of RBAC.authorize? calls to demonstrate allowed vs denied actions
  - Demonstrate revocation: remove a permission from editor and show the change in authorization

Suggested starter snippet for Part A (to guide your implementation):

```ruby
# Part A helpers
class Role
  def remove_permission(permission)
    @permissions.delete_if { |p| p.action == permission.action && p.resource == permission.resource }
  end
end

class User
  def remove_role(role)
    @roles.delete_if { |r| r.name == role.name }
  end

  def effective_permissions
    @roles.flat_map(&:permissions).uniq { |p| [p.action, p.resource] }
  end
end
```

Suggested starter snippet for Part B:

```ruby
def RBAC.permissions_for(user)
  user.roles.flat_map(&:permissions).map { |p| [p.action, p.resource] }.uniq
end

# Demo printing
alice = User.new('Alice'); alice.add_role(admin_role)
puts "Alice permissions: #{RBAC.permissions_for(alice).map { |a| "#{a[0]}:#{a[1]}" }.join(', ')}"
```

Suggested Part C driver scaffold:

```ruby
# Setup roles and users (reuse from Section 1)
doc_read = Permission.new(:read, :documents)
doc_write = Permission.new(:write, :documents)
/admin_role.add_permission(doc_write)
# ... set up users alice (admin), carol (editor), dave (viewer)

# Run a few authorization checks
puts RBAC.authorize?(alice, :write, :documents) # expected true
puts RBAC.authorize?(dave, :write, :documents)  # expected false

# Revoke a permission and re-check
editor_role.remove_permission(doc_write)
puts RBAC.authorize?(carol, :write, :documents) # expected false after revocation
```

End of lesson. Use this structure to guide implementing a robust RBAC layer in your Ruby backend, tuned for maintainability, scalability, and security in real systems.