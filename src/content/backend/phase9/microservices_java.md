# Microservices vs Monolith — When & Why (Java)

Understanding when to build a monolith versus a distributed microservice system is a foundational skill for backend engineers. This lesson explores the tradeoffs, decision criteria, data boundaries, and operational considerations you’ll face in real-world systems. By the end, you’ll be able to justify architecture choices, sketch practical Java-based examples, and recognize common beginner mistakes before they ship.

## 1. Monoliths vs Microservices — Architectural concepts and concrete code sketches

In a monolith, all domain capabilities live inside a single deployable unit. In a microservice approach, capabilities are split into independently deployable services that communicate over network APIs. The code samples below illustrate minimal Java Spring Boot applications to ground the concepts.

### Monolith code sketch: single Spring Boot app with two capabilities (Users and Orders)

```java
package com.example.monolith;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
@RestController
public class MonolithApplication {
    public static void main(String[] args) {
        SpringApplication.run(MonolithApplication.class, args);
    }

    // In-memory stores (for simplicity in this example)
    private final Map<Long, User> users = new HashMap<>();
    private final Map<Long, Order> orders = new HashMap<>();
    private long userSeq = 1;
    private long orderSeq = 1;

    // User endpoints
    @PostMapping("/users")
    public User createUser(@RequestBody User user) {
        user.setId(userSeq++);
        users.put(user.getId(), user);
        return user;
    }

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        return users.get(id);
    }

    // Order endpoints
    @PostMapping("/orders")
    public Order createOrder(@RequestBody Order order) {
        order.setId(orderSeq++);
        orders.put(order.getId(), order);
        return order;
    }

    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id) {
        return orders.get(id);
    }

    // Lightweight value objects for the demo
    static class User {
        private Long id;
        private String name;
        // getters/setters
        public Long getId(){ return id; }
        public void setId(Long id){ this.id = id; }
        public String getName(){ return name; }
        public void setName(String name){ this.name = name; }
    }

    static class Order {
        private Long id;
        private Long userId;
        private String product;
        private int quantity;
        // getters/setters
        public Long getId(){ return id; }
        public void setId(Long id){ this.id = id; }
        public Long getUserId(){ return userId; }
        public void setUserId(Long userId){ this.userId = userId; }
        public String getProduct(){ return product; }
        public void setProduct(String product){ this.product = product; }
        public int getQuantity(){ return quantity; }
        public void setQuantity(int quantity){ this.quantity = quantity; }
    }
}
```

### Microservices sketch: two independent services communicating over HTTP

- UserService: manages users in its own in-memory store.
- OrderService: creates orders and validates the user by calling UserService.

Code Block B: UserServiceApplication.java

```java
package com.example.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@SpringBootApplication
@RestController
@RequestMapping("/users")
public class UserServiceApplication {

    private final Map<Long, User> users = new ConcurrentHashMap<>();
    private long seq = 1;

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        user.setId(seq++);
        users.put(user.getId(), user);
        return user;
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return users.get(id);
    }

    static class User {
        private Long id;
        private String name;
        public Long getId(){ return id; }
        public void setId(Long id){ this.id = id; }
        public String getName(){ return name; }
        public void setName(String name){ this.name = name; }
    }
}
```

Code Block C: OrderServiceApplication.java

```java
package com.example.orderservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.context.annotation.Bean;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@SpringBootApplication
@RestController
@RequestMapping("/orders")
public class OrderServiceApplication {

    private final Map<Long, Order> orders = new ConcurrentHashMap<>();
    private long seq = 1;

    private final RestTemplate restTemplate;

    public OrderServiceApplication(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @PostMapping
    public Object createOrder(@RequestBody Order order) {
        // Basic cross-service validation: ensure user exists by calling UserService
        try {
            String url = "http://localhost:8081/users/" + order.getUserId();
            User user = restTemplate.getForObject(url, User.class);
            if (user == null) {
                return new ErrorResponse("User not found");
            }
        } catch (Exception e) {
            return new ErrorResponse("Failed to fetch user: " + e.getMessage());
        }
        order.setId(seq++);
        orders.put(order.getId(), order);
        return order;
    }

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        return orders.get(id);
    }

    static class Order {
        private Long id;
        private Long userId;
        private String product;
        private int quantity;
        public Long getId(){ return id; }
        public void setId(Long id){ this.id = id; }
        public Long getUserId(){ return userId; }
        public void setUserId(Long userId){ this.userId = userId; }
        public String getProduct(){ return product; }
        public void setProduct(String product){ this.product = product; }
        public int getQuantity(){ return quantity; }
        public void setQuantity(int quantity){ this.quantity = quantity; }
    }

    static class User {
        private Long id;
        private String name;
        public Long getId(){ return id; }
        public void setId(Long id){ this.id = id; }
        public String getName(){ return name; }
        public void setName(String name){ this.name = name; }
    }

    static class ErrorResponse {
        private String message;
        public ErrorResponse(String message){ this.message = message; }
        public String getMessage(){ return message; }
        public void setMessage(String m){ this.message = m; }
    }
}
```

Notes:
- In a real system, UserService would run on a separate host/port and service discovery would replace hard-coded URLs.
- The microservice example demonstrates independent deployments and inter-service communication via HTTP.

### Line-by-line explanation

Monolith (Code Block A)
- Line 1-6: Package, imports, and Spring Boot application entry-point annotation. Sets up a Spring Boot app.
- Line 12: Annotates the class as a REST controller to serve HTTP endpoints.
- Line 16: Start of main method; boots the Spring context.
- Lines 20-27: In-memory storage for users (maps) and simple ID sequencing.
- Lines 29-38: User endpoints: POST /users creates a user; GET /users/{id} fetches a user.
- Lines 41-60: Order endpoints: POST /orders creates an order; GET /orders/{id} fetches an order.
- Lines 66-88: Static inner User class: simple DTO with id and name.
- Lines 90-110: Static inner Order class: DTO with id, userId, product, and quantity.

Microservice User (Code Block B)
- Line 1-7: Package, imports, and Spring Boot / REST controller setup for /users endpoints.
- Line 11: Main method to bootstrap this service.
- Lines 16-24: POST /users to create a new user with an auto-generated ID.
- Lines 26-32: GET /users/{id} to retrieve a user.
- Lines 35-52: Static inner User DTO.

Line-by-line (Code Block B) explanations:
- The UserService runs independently, owning its own in-memory user store and exposes /users endpoints.

Microservice Order (Code Block C)
- Line 1-7: Package, imports, and setup for /orders endpoints.
- Line 11: Main method to boot the OrderService.
- Lines 16-24: Defines a RestTemplate bean for inter-service calls.
- Lines 28-42: POST /orders validates the user by calling UserService at localhost:8081/users/{id}. If the user exists, it persists the order.
- Lines 44-50: GET /orders/{id} returns an order.
- Lines 55-74: Static inner Order DTO.
- Lines 77-86: Static inner User DTO used for the cross-service call payload.
- Lines 89-103: Static inner ErrorResponse for consistent error messaging.

Line-by-line (Code Block C) explanations:
- The OrderService uses RestTemplate to validate user existence by calling the UserService. If the user is not found or the call fails, an error is returned; otherwise, the order is saved.

## 2. When to split: decision criteria, patterns, and lightweight decision tooling

Choosing between a monolith and microservices is not only a technical decision; it’s organizational and operational. Here are practical guidelines and a tiny code snippet to illustrate using a lightweight decision helper.

- Use a monolith when:
  - The team is small and tightly coupled with the domain.
  - You need fast iteration with low operational overhead.
  - The system doesn’t require independent scalability of components.

- Use microservices when:
  - You have clear bounded contexts and independent deployment cycles.
  - You need isolation for faults, security, or regulatory boundaries.
  - You require independent scaling, different tech stacks per service, or separate teams owning services.

Code Block D: Lightweight decision helper (pseudo Java)

```java
package com.example.structure;

public class ArchitectureAdvisor {

    public static boolean shouldSplit(int teams, boolean complexDomain, int expectedTraffic, boolean requiresIndependentScaling) {
        // Very simple heuristic:
        // - If there are multiple autonomous teams or high complexity, consider splitting.
        if (teams >= 3 || complexDomain) {
            // If traffic warrants per-service scaling, or there are regulatory boundaries
            return expectedTraffic > 1000 || requiresIndependentScaling;
        }
        return false;
    }
}
```

### Line-by-line explanation

- Line 1: Package declaration.
- Line 3: Class declaration.
- Lines 5-12: Static method shouldSplit takes simple domain factors to decide if a split is warranted.
- Lines 7-9: If there are three or more teams or a complex domain, consider splitting.
- Lines 10-13: Return true if traffic is high and independent scaling is desired; otherwise false.

## 3. Data boundaries, transactions, and consistency in monoliths vs microservices

Data management is the hinge of architecture. Monoliths commonly share a single database, while microservices favor isolated databases per service. This section covers the conceptual shift and shows minimal code patterns.

### Monolith-style data access (single database mindset)

In a monolith, a single repository can back multiple aggregates.

Code Block E: Simple JPA-like monolith-style repository sketch (conceptual)

```java
// This is a simplified representation; in a real app you'd use Spring Data JPA
class User {
  Long id;
  String name;
  // getters/setters
}

class Order {
  Long id;
  Long userId;
  String product;
  int quantity;
  // getters/setters
}
```

Line-by-line explanation (Code Block E):
- Defines two domain entities, User and Order, that could be stored in one shared database in a monolith.

### Microservice data boundaries and a basic event-driven touch

In microservices, each service owns its data. To reflect real-world cross-service consistency without distributed transactions, events are used to propagate changes.

Code Block F: Simple EventBus interface and a saga-like usage in OrderService

```java
// Lightweight event bus (in-process for illustration)
public interface EventBus {
    void publish(Object event);
}

// Simple event types
public class OrderCreatedEvent {
    public final Long orderId;
    public final Long userId;
    public final String product;
    public OrderCreatedEvent(Long orderId, Long userId, String product) {
        this.orderId = orderId;
        this.userId = userId;
        this.product = product;
    }
}

// Order service uses its own data and publishes an event after persisting an order
public class OrderService {
    private final EventBus eventBus;
    // Assume there is an OrderRepository for persistence
    public OrderService(EventBus eventBus) {
        this.eventBus = eventBus;
    }

    public Order createOrder(Order order) {
        // save to OrderService's own DB (omitted)
        Order saved = order; // pretend persistence
        // emit an event to inform other services
        eventBus.publish(new OrderCreatedEvent(saved.id, saved.userId, saved.product));
        return saved;
    }
}
```

Line-by-line explanation (Code Block F):
- Line 1: EventBus interface for publishing events.
- Lines 4-6: OrderCreatedEvent holds a minimal payload indicating an order was created.
- Lines 9-19: OrderService uses the EventBus to publish the OrderCreatedEvent after persisting an order, illustrating eventual consistency without a distributed transaction.

Notes:
- In real systems, you would plug in a message broker (Kafka, NATS, RabbitMQ) and have robust event schemas, idempotency, and replay handling.
- Each service would own its own database schema; cross-service reads would rely on events or API calls.

## 4. Observability, deployment, and testing in microservices

Operational discipline is essential for real systems. Microservices require instrumentation, health checks, resilient communication, and scalable deployment practices.

### Basic health and metrics exposure (Spring Boot Actuator)

Code Block G: Minimal health endpoint exposure

```java
@RestController
public class HealthController {
  @GetMapping("/health")
  public String health() {
    return "UP";
  }
}
```

Code Block H: Application properties to expose health and basic metrics

```
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.metrics.enabled=true
```

Line-by-line explanations (Code Block G and H):
- HealthController: A simple health check endpoint that returns "UP" to indicate service readiness.
- application.properties: Enables actuator endpoints for health and metrics, making basic observability possible without external tooling.

### Basic tracing and resilience (conceptual)

In production, you’d typically wire distributed tracing (OpenTelemetry or Spring Cloud Sleuth) and circuit breakers. The following is a conceptual snippet that shows where to place tracing and resilience hooks.

Code Block I: Pseudocode for tracing in a controller (conceptual)

```java
@RestController
public class SampleController {
  @GetMapping("/demo")
  public String demo() {
    // Start a trace span
    // Do work
    // End span
    return "trace-demo";
  }
}
```

Line-by-line explanation (Code Block I):
- Illustrates where tracing calls would be inserted in a normal controller method to propagate traces across service boundaries.

Note:
- Real instrumentation typically requires dependencies and configuration (for example, Spring Cloud Sleuth, OpenTelemetry exporters, or Prometheus metrics). The ideas above serve as anchors for implementing in your project.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Pitfall: Tight coupling via hard-coded service addresses

- Bad
```java
// Direct, hard-coded dependency between services
String userServiceUrl = "http://localhost:8081/users/";
```

- Good
```java
// Use a client abstraction or discovery (e.g., Feign, RestTemplate with config)
@Service
public class UserClient {
  @Value("${user.service.url}")
  private String baseUrl;

  @Autowired private RestTemplate restTemplate;

  public User getUser(Long id) {
    return restTemplate.getForObject(baseUrl + "/{id}", User.class, id);
  }
}
```

2) Pitfall: Attempting distributed transactions like a single DB transaction

- Bad
```java
// @Transactional spanning across services (not possible in real distributed systems)
@Transactional
public void placeOrderAcrossServices(Order o) {
  orderRepo.save(o);
  // update user balance in UserService-like operation
}
```

- Good
```java
// Use saga/event-based patterns; compensations if steps fail
public void placeOrderSaga(Order o) {
  // Step 1: persist locally
  orderRepo.save(o);
  // Step 2: emit OrderCreatedEvent
  eventBus.publish(new OrderCreatedEvent(o.getId(), o.getUserId(), o.getProduct()));
  // Step 3: react to failures with compensating actions
}
```

3) Pitfall: Shared database across services

- Bad
```java
// Multiple services directly access a shared Users table
SELECT * FROM users WHERE id = ?;
```

- Good
```java
 // Each service owns its schema and data; no shared tables
// UserService manages users; OrderService stores orders in its own DB
```

4) Pitfall: Skipping observability

- Bad
```java
@GetMapping("/compute")
public String compute() { return "ok"; }
// no metrics, no tracing, no health checks
```

- Good
```java
// Expose health/metrics and instrument endpoints
@GetMapping("/compute")
public String compute() { // increment metrics
  return "ok";
}
```

5) Pitfall: Fragmenting too aggressively or too coarsely

- Bad (too many microservices)
- Good (clear domain boundaries; keep teams aligned)

Code-like illustration:
- Bad: 20 tiny services with overlapping domains (management overhead)
- Good: 3-5 well-defined services (User, Product, Order) with bounded contexts

Line-by-line explanations (for each pitfall block):
- See above “Bad” and “Good” blocks. The core idea is that bad code reflects fragile coupling and operational toil, while good code shows proper boundaries, abstractions, and observability practices.

## Y. Why This Matters In Real Systems — production context and real usage

- Fault isolation: Microservices confine failures to a service, reducing blast radius, but require robust inter-service communication and distributed tracing.
- Scalability: Microservices let you scale hot components independently; monoliths may not meet peak load without scale-out or refactoring.
- Team autonomy: Microservices map to team boundaries, enabling faster, parallel delivery. Monoliths are simpler to coordinate for small teams.
- Data governance: Bounded contexts in microservices help with regulatory needs, data ownership, and schema evolution.
- Operational complexity: Microservices demand strong CI/CD, containerization, service discovery, monitoring, and resilient communication patterns (timeouts, retries, circuit breakers).
- Testing strategy: Monoliths benefit from end-to-end tests, while microservices require contract testing, consumer-driven tests, and simulated environments to validate interactions.

## Z. Study Questions — 5 recall questions

1) What are the primary architectural differences between a monolith and a microservice system?  
2) When would you favor starting with a monolith versus a microservice split? List at least two criteria.  
3) What are bounded contexts, and why are they important for microservices data boundaries?  
4) How can events help achieve eventual consistency across microservices? Give a simple example.  
5) Name three observable signals you would implement in a production microservice (e.g., health, tracing, metrics) and why they matter.

## Exercise — practical multi-part coding challenge

Part 1 — Design phase (conceptual)
- Given an online bookstore domain (Users, Books, and Orders), decide architecture boundaries.
  - Propose a monolith layout and the minimal set of microservices if you were to split.
  - Justify boundaries in terms of team structure, data ownership, and scaling needs.

Part 2 — Monolith implementation (Java/Spring Boot)
- Build a small monolith (like Code Block A) with:
  - In-memory stores for users, books, and orders.
  - Endpoints: POST /users, GET /users/{id}, POST /books, GET /books/{id}, POST /orders, GET /orders/{id}.
- Run locally and sanity-check end-to-end flows (e.g., create a user, add a book, place an order).

Part 3 — Microservices implementation (Java/Spring Boot)
- Split into at least two services:
  - UserService: manages users (in-memory DB).
  - OrderService: creates orders and calls UserService to validate the user (using RestTemplate as shown in Code Block C).
- Implement a simple inter-service call, using configuration for base URLs rather than hard-coded values.
- Demonstrate an end-to-end flow: create a user in UserService, then create an order in OrderService that references that user.

Part 4 — Observability and resilience
- Add a basic health endpoint and actuator exposure (Code Blocks G and H).
- Instrument a simple endpoint to capture a basic metric (counter) and sketch how you would wire distributed tracing (OpenTelemetry or Sleuth) in Spring Boot.
- Explain how you would monitor service health and how you would respond to degradation (timeouts, retries, circuit breakers).

Part 5 — Discussion prompt
- Reflect on the tradeoffs you observed between monolith and microservices during your exercise.
- Write a short justification for your architecture choice given a hypothetical scaling scenario (e.g., orders spike during a sale, or user growth triggers separate scaling for authentication).

End-to-end notes:
- The monolith example is intentionally compact for clarity. In real projects, you’d modularize into packages, layer your architecture (controllers, services, repositories), and persist to a database rather than an in-memory store.
- The microservices examples illustrate the core ideas: independence, inter-service communication, and per-service data ownership. In production, you’d replace in-memory stores with persistent databases, add authentication/authorization, implement robust retries, timeouts, idempotency keys, schemas, and contract tests.

If you’d like, I can tailor the lesson to a particular Spring Boot version, add a sample Maven/Gradle project structure, or extend the microservice examples with a gateway-service and a simple OpenAPI contract for the two services.