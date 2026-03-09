# Phase 9: System Design & Scalability — Microservices vs Monolith: When & Why (Ruby)

In modern backend systems, choosing between a monolithic application and a distributed set of microservices is one of the most impactful architectural decisions. This lesson explains the when and why behind monoliths and microservices, with Ruby-centric examples to anchor concepts in real-world code. You’ll see concrete Ruby snippets, practical trade-offs, and guidance for moving from a single codebase to independent services without dissolving organizational clarity.

## 1. Monoliths vs Microservices: Core Definitions and How They Look in Code

A monolith is a single codebase and deployment unit that handles multiple business capabilities together. A microservice architecture splits these capabilities into independently deployable services, each with its own codebase, runtime, and data store.

- Monolith characteristics:
  - One codebase, one deployable artifact.
  - Tight coupling but fast internal communication.
  - Simple operational footprint for small teams.

- Microservice characteristics:
  - Multiple independently deployable services.
  - Clear bounded contexts and data ownership.
  - Operational complexity grows with the number of services (observability, network reliability, deployment coordination).

Code example: a tiny in-process monolith in Ruby
```ruby
# Monolith: a single Ruby application handling models, controllers, and data access
class User
  attr_accessor :id, :name
  def initialize(id:, name:)
    @id = id
    @name = name
  end
end

class Order
  attr_accessor :id, :user_id, :amount
  def initialize(id:, user_id:, amount:)
    @id = id
    @user_id = user_id
    @amount = amount
  end
end

# In-memory storage representing a single shared data layer
class InMemoryDB
  @users = {}
  @orders = {}

  class << self
    attr_accessor :users, :orders
  end

  def self.reset
    @users = {}
    @orders = {}
  end

  def self.find_user(id)
    @users[id]
  end

  def self.add_user(user)
    @users[user.id] = user
  end

  def self.find_order(id)
    @orders[id]
  end

  def self.add_order(order)
    @orders[order.id] = order
  end
end

# Simple controller-like interface within a monolith
class AppController
  def create_user(name)
    id = InMemoryDB.users.length + 1
    user = User.new(id: id, name: name)
    InMemoryDB.add_user(user)
    { status: 201, body: { id: id, name: user.name }.to_json }
  end

  def create_order(user_id, amount)
    id = InMemoryDB.orders.length + 1
    order = Order.new(id: id, user_id: user_id, amount: amount)
    InMemoryDB.add_order(order)
    { status: 201, body: { id: id, user_id: user_id, amount: order.amount }.to_json }
  end
end

# Router simulating an HTTP layer
class Router
  def initialize
    @controller = AppController.new
  end

  def route(path, payload = {})
    case path
    when "/users"
      @controller.create_user(payload[:name])
    when "/orders"
      @controller.create_order(payload[:user_id], payload[:amount])
    else
      { status: 404, body: { error: "not found" }.to_json }
    end
  end
end
```

### Line-by-line explanation
- User and Order are plain Ruby models with basic attributes to illustrate data structures in a monolith.
- InMemoryDB holds users and orders in hash maps to simulate a shared database.
- InMemoryDB.reset clears all data, useful for tests or demos.
- AppController exposes create_user and create_order, encapsulating business logic for a monolith.
- Router provides a tiny dispatch layer, routing paths like /users or /orders to the appropriate controller method.

## 2. When to Use a Monolith vs When to Use Microservices

There isn't a one-size-fits-all answer. Use a monolith when:
- Team size is small and deployment cadence is high (fast feedback loop).
- The domain has few bounded contexts and data interactions are tightly coupled.
- You want straightforward operations, simpler testing, and less network overhead.

Use microservices when:
- The system has clear bounded contexts and you need autonomous teams.
- You require independent deployment, different tech stacks, or polyglot environments.
- You must isolate failures, scale specific functions, or support diverse service SLAs.

Code example: a boundary-aware structure inside a monolith (demonstrating microservice-like boundaries)
```ruby
# Within a monolith, you can partition code into bounded contexts
module Billing
  class Invoice
    attr_accessor :id, :order_id, :amount
    def initialize(id:, order_id:, amount:)
      @id = id
      @order_id = order_id
      @amount = amount
    end
  end
end

module Customers
  class Customer
    attr_accessor :id, :name
    def initialize(id:, name:)
      @id = id
      @name = name
    end
  end
end

# Simple route-like dispatch that respects bounded context boundaries
class MonolithRouter
  def route(path, payload = {})
    case path
    when "/billing/invoices"
      # create or fetch invoices
      { status: 200, body: { path: path, payload: payload }.to_json }
    when "/customers"
      { status: 200, body: { path: path, payload: payload }.to_json }
    else
      { status: 404, body: { error: "not found" }.to_json }
    end
  end
end
```

### Line-by-line explanation
- Billing::Invoice and Customers::Customer model the two bounded contexts inside a monolith, signaling intent separation.
- MonolithRouter routes to different bounded contexts, illustrating how a single app can reflect bounded-context boundaries without fully splitting into microservices.

Code note: The snippet above shows a clean separation of concerns inside a single process. It does not imply distributed deployment; it demonstrates how you might organize code to prepare for a potential migration to microservices.

## 3. Data Boundaries, Transactions, and Consistency in Distributed Contexts

In a monolith, a single database helps maintain strong transactional guarantees. In microservices, each service often owns its data store, making cross-service transactions harder. You need patterns for eventual consistency and failure handling, such as sagas and compensating actions.

A lightweight Ruby example: a simple saga-like flow across two services (in-process simulation)
```ruby
# Simple saga orchestrator (in-process simulation)
class OrderService
  def create_order(user_id, amount)
    id = $order_store.length + 1
    $order_store[id] = { id: id, user_id: user_id, amount: amount, status: 'created' }
    id
  end

  def cancel_order(id)
    if $order_store[id]
      $order_store[id][:status] = 'cancelled'
    end
  end
end

class PaymentService
  def charge(user_id, amount)
    # Simulate a payment attempt
    if amount > 0
      true
    else
      false
    end
  end

  def refund(user_id, amount)
    true
  end
end

class SagaOrchestrator
  def self.place_order(user_id, amount)
    order_service = OrderService.new
    payment_service = PaymentService.new

    order_id = order_service.create_order(user_id, amount)
    if payment_service.charge(user_id, amount)
      { success: true, order_id: order_id }
    else
      order_service.cancel_order(order_id)
      { success: false, order_id: order_id, reason: 'payment failed' }
    end
  end
end
```

### Line-by-line explanation
- OrderService creates an order and records its status. It simulates a per-service boundary for order data.
- PaymentService attempts to charge; its outcome determines whether the saga commits or compensates.
- SagaOrchestrator.place_order ties the flow together: create an order, attempt payment, and perform a compensating action if payment fails.
- This is a simplified view of a saga; in real systems you’d use asynchronous messaging, retries, and robust compensation logic.

Note: In a true distributed system, these services would communicate over HTTP/gRPC, and the saga would be implemented via orchestration (central coordinator) or choreography (event-driven). The Ruby example is intentionally compact to illustrate the concept.

## 4. Migration Path: Incremental Refactor with Strangler Fig

Migrating from a monolith to microservices can be done gradually using the Strangler Fig pattern: new functionality lives in microservices, while the old monolith continues to serve existing users. Over time, traffic is redirected to the new services and the old code path is retired.

Code example: Strangler-style router in Ruby
```ruby
# Strangler router routes new paths to microservices while preserving old paths in the monolith
module OldApp
  def route(path, payload = {})
    # Simple in-process old app routing
    if path.start_with?('/old')
      { status: 200, body: { path: path, payload: payload }.to_json }
    else
      { status: 404, body: { error: 'not found' }.to_json }
    end
  end
end

module NewApp
  def route(path, payload = {})
    # Simple in-process new microservice-style route
    if path.start_with?('/api/v2/')
      { status: 200, body: { path: path, payload: payload }.to_json }
    else
      { status: 404, body: { error: 'not found' }.to_json }
    end
  end
end

class StranglerRouter
  def initialize
    @old = OldApp
    @new = NewApp
  end

  def route(path, payload = {})
    if path.start_with?('/api/v2/')
      @new.route(path, payload)
    else
      @old.route(path, payload)
    end
  end
end
```

### Line-by-line explanation
- OldApp contains legacy behavior accessible via non-new paths.
- NewApp contains fresh microservice-like routes under /api/v2/, enabling gradual migration.
- StranglerRouter delegates to the appropriate app based on the path, enabling incremental migration without a big-bang rewrite.

## 5. Operational Considerations: Observability, Deployment, and Safety

When you move toward microservices, you need to scale, observe, and coordinate more components:
- Observability: centralized logging, metrics, tracing (e.g., OpenTelemetry in Ruby, Logstash, or Loki for logs).
- Deployment: independent service lifecycles, canaries, feature flags, and per-service monitoring.
- Fault isolation: circuit breakers, timeouts, retries, and graceful degradation.
- Data strategy: per-service databases, eventual consistency, and clear data ownership boundaries.
- API versioning and contract testing to prevent breaking changes across services.

Ruby notes:
- Use lightweight frameworks like Sinatra or Roda for microservice endpoints.
- Use environment-based configuration (ENV vars) to toggle features and endpoints.
- For tracing, consider gems like ruby-trace or OpenTelemetry instrumentation for HTTP clients.

## X. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code (Ruby)

### 1) Pitfall: Shared database across services (tight coupling, fragile boundaries)

Bad (anti-pattern):
```ruby
# Shared in-memory store used by both services (tight coupling)
class SharedDB
  @store = { users: [], orders: [] }
  class << self
    attr_accessor :store
  end

  def self.add_user(name)
    id = @store[:users].length + 1
    @store[:users] << { id: id, name: name }
    id
  end

  def self.add_order(user_id, amount)
    id = @store[:orders].length + 1
    @store[:orders] << { id: id, user_id: user_id, amount: amount }
    id
  end
end
```

Good (preferred per-service boundaries):
```ruby
# User service storage (per-service)
module UserServiceStore
  @users = {}
  class << self
    attr_accessor :users
  end

  def self.add_user(name)
    id = @users.length + 1
    @users[id] = { id: id, name: name }
    id
  end

  def self.find_user(id)
    @users[id]
  end
end

# Order service storage (per-service)
module OrderServiceStore
  @orders = {}
  class << self
    attr_accessor :orders
  end

  def self.add_order(user_id, amount)
    id = @orders.length + 1
    @orders[id] = { id: id, user_id: user_id, amount: amount }
    id
  end

  def self.find_order(id)
    @orders[id]
  end
end
```

### 2) Pitfall: Missing idempotency in APIs (duplicate requests cause duplication)

Bad:
```ruby
def create_user(params)
  user = User.new(name: params[:name])
  # No idempotency key handling
  user.save
  { status: 201, body: user.to_json }
end
```

Good:
```ruby
# Simple idempotency key handling
IDEMPOTENCY_STORE = {}

def create_user(params)
  key = params[:idempotency_key]
  return IDEMPOTENCY_STORE[key] if key && IDEMPOTENCY_STORE[key]

  user = User.new(name: params[:name])
  user.save
  result = { status: 201, body: user.to_json }
  IDEMPOTENCY_STORE[key] = result if key
  result
end
```

### 3) Pitfall: Tight coupling via direct HTTP calls between services

Bad:
```ruby
# UserService calling OrderService directly over HTTP
def create_user_and_order(user_name, item)
  user_id = HTTP.post("http://orders-service/users", { name: user_name }.to_json)
  order_id = HTTP.post("http://orders-service/orders", { user_id: user_id, amount: item.price }.to_json)
  { user_id: user_id, order_id: order_id }
end
```

Good (loose coupling via events or a lightweight API gateway):
```ruby
# Event-driven or gateway-based approach
def create_user_and_order(user_name, item)
  user_id = UserServiceStore.add_user(user_name)
  # Publish event or route via gateway to create order
  order_id = OrderServiceStore.add_order(user_id, item.price)
  { user_id: user_id, order_id: order_id }
end
```

### 4) Pitfall: Not handling schema evolution and backward compatibility

Bad:
```ruby
# Directly changing a shared data contract without versioning
# Client depends on new field 'currency'
class Price
  attr_accessor :amount, :currency
end
```

Good:
```ruby
# Versioned contracts and optional fields
class PriceV1
  attr_accessor :amount
  def initialize(amount:)
    @amount = amount
  end
end

class PriceV2
  attr_accessor :amount, :currency
  def initialize(amount:, currency: 'USD')
    @amount = amount
    @currency = currency
  end
end

# Clients opt-in to v2; existing clients use v1
```

### 5) Pitfall: Inadequate observability and tracing

Bad:
```ruby
# Silent service methods with no logging or metrics
def charge_user(user_id, amount)
  # pretend charge
  true
end
```

Good:
```ruby
require 'logger'

LOGGER = Logger.new(STDOUT)

def charge_user(user_id, amount)
  LOGGER.info("Charging user_id=#{user_id} amount=#{amount}")
  # pretend charge
  success = true
  LOGGER.info("Charge result: #{success}")
  success
end
```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Team scale and ownership: Monoliths are often easier for small teams to ship rapidly. Microservices empower large teams to own bounded contexts with independent deployments, yet require robust coordination, contracts, and discovery mechanisms.
- Deployment cadence: Microservices enable independent rollouts, canary deployments, and targeted scaling. Monoliths require synchronized deployments but are simpler to test and roll back.
- Failure containment: In a microservice world, a failure in one service should not bring down others. This requires circuit breakers, timeouts, retry policies, and bulkheads.
- Data ownership and consistency: A monolith naturally benefits from a single transactional boundary. Microservices often rely on eventual consistency and distributed patterns like sagas, compensating actions, and event-driven integrations.
- Observability: Microservices demand holistic observability: distributed traces (per-request across services), centralized logs, and metrics dashboards to identify latency, error budgets, and dependency health.
- Tech diversity vs complexity: Microservices allow polyglot stacks but increase operational complexity—tooling, deployment pipelines, and service discovery all scale with the number of services.

Practical takeaway for Ruby teams:
- Start with a clean, well-structured monolith while clearly delineating bounded contexts in code (modules, namespaces).
- Introduce service boundaries incrementally as your domain grows and teams expand.
- Use consistency patterns appropriate to the boundary: strong transactional consistency inside a service, eventual consistency across services, with sagas if needed.

## Z. Study Questions — 5 Recall Questions

1. What is a bounded context, and how does it relate to microservices design?
2. Name three concrete indicators you might use to decide to split a monolith into microservices.
3. What is the Strangler Fig pattern, and how does it help with migration?
4. What are sagas, and why are they useful in distributed transactions?
5. List two operational practices essential for running a microservices architecture safely (with Ruby examples).

## Exercise — Practical Multi-Part Coding Challenge

Overview: Build a tiny system to illustrate monolith vs microservices, plus a minimal gateway and a simple saga coordinator. Complete in parts; each part builds on the previous.

Part A: Implement a minimal in-process monolith ( Ruby ) with users and orders
- Create two Ruby classes for domain models: User and Order.
- Implement an in-memory repository to store users and orders (single datastore, as in Section 1).
- Implement a simple Controller (AppController) with methods to create a user and create an order.
- Implement a tiny Router that dispatches to the controller.
- Deliverables: monolith.rb with a small demonstration script that creates a user and an order, printing the final datastore state.

Part B: Create two microservices skeletons (Ruby) using Sinatra
- User Service: REST endpoint POST /users to create a user, GET /users/:id to fetch a user.
- Order Service: REST endpoint POST /orders to create an order, GET /orders/:id to fetch an order.
- Each service uses its own in-memory store (per-service data store).
- Deliverables: user_service.rb and order_service.rb (Sinatra apps). Provide instructions to run each with ruby.

Part C: Implement a simple API gateway in Ruby that routes between monolith and microservices
- The gateway should expose endpoints:
  - POST /api/v1/users -> forwards to monolith (Part A) or to User Service (Part B) depending on feature flag.
  - POST /api/v1/orders -> forwards to monolith or Order Service similarly.
- Implement a basic feature flag switch (ENV or constant) to toggle routing mode.
- Deliverables: gateway.rb with a small example of routing logic and a demonstration script.

Part D: Add a basic saga-like flow to demonstrate cross-service coordination
- Implement a simple method that creates a user in the monolith, creates an order in the order service, and, if the order creation fails, compensates by deleting the created user (or simulating a rollback).
- Demonstrate the flow with printouts for success/failure and compensation.
- Deliverables: saga_demo.rb showing the coordinated flow.

Part E: Optional extension (observability)
- Add simple logging to the gateway and services to show request flow, latency (via Sleep), and outcomes.
- Deliverables: updated gateway.rb, user_service.rb, and order_service.rb with logging statements.

Hints and constraints:
- Keep data stores in-memory for speed and simplicity; focus on architecture rather than persistence.
- Use Ruby 3.x syntax; avoid Rails for microservice demos to keep the example lightweight.
- Provide clear run instructions: how to start Sinatra services, run the gateway, and execute the saga demo.

This completes the module on Microservices vs Monolith — When & Why in Ruby. You should now be able to reason about architecture choices, design boundaries, migrate incrementally, and implement a small-scale practical demonstration of both patterns in code.