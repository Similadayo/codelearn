# Track: Backend Engineering — Module 4: Phase 4 — Building Web Servers — Your First Web Server with a Framework (Java)

Compelling introductory paragraph:
Building a web server is foundational to modern backend systems. Using a framework like Spring Boot in Java lets you focus on business logic while the framework handles HTTP routing, serialization, concurrency, and deployment concerns. In Phase 4, you’ll spin up a minimal, production-friendly web server, learn how to expose RESTful endpoints, validate input, and reason about production-grade patterns such as configuration, error handling, and observability. This lesson demonstrates a practical, end-to-end first web server you can grow into a robust service.

## 1. Project setup and bootstrapping with Spring Boot

Code: Maven project definition (pom.xml) and the main application class.

```xml
<!-- pom.xml -->
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>first-webserver</artifactId>
  <version>0.1.0</version>

  <properties>
    <java.version>17</java.version>
    <maven.compiler.source>${java.version}</maven.compiler.source>
    <maven.compiler.target>${java.version}</maven.compiler.target>
    <spring-boot.version>3.0.0</spring-boot.version>
  </properties>

  <dependencies>
    <!-- Web framework foundation -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Optional: validation for request bodies -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Optional: actuator for health checks and metrics (production readiness) -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

```java
// src/main/java/com/example/firstwebserver/FirstWebServerApplication.java
package com.example.firstwebserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FirstWebServerApplication {
    public static void main(String[] args) {
        // Bootstraps the Spring application context and starts the embedded server
        SpringApplication.run(FirstWebServerApplication.class, args);
    }
}
```

### Line-by-line explanation
- pom.xml: Declares Maven project details, Java version, and dependencies for Spring Boot web, validation, and actuator. Sets up the build to create an executable JAR.
- The java.version property ensures consistent Java compilation targets across environments.
- spring-boot-starter-web pulls in Spring MVC, a Tomcat/Jetty/Undertow embedded server, and JSON (via Jackson) support.
- FirstWebServerApplication.java: Annotated with @SpringBootApplication to enable component scanning, auto-configuration, and Spring Boot’s opinionated defaults.
- main method uses SpringApplication.run to bootstrap the application, loading the application context and starting the embedded web server (e.g., Tomcat) on a default port (8080 unless overridden).

## 2. Building a REST API: Controllers and Endpoints

Code: A simple REST controller with basic endpoints.

```java
// src/main/java/com/example/firstwebserver/HelloController.java
package com.example.firstwebserver;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HelloController {

    // Simple health-ish endpoint to prove routing works
    @GetMapping("/hello")
    public String hello() {
        return "Hello, world!";
    }

    // Dynamic path parameter example
    @GetMapping("/hello/{name}")
    public String greet(@PathVariable("name") String name) {
        return "Hello, " + name + "!";
    }
}
```

### Line-by-line explanation
- @RestController marks this class as a controller where every method returns a domain object instead of a view. It combines @Controller and @ResponseBody.
- @RequestMapping("/api") sets a base URL path for all endpoints in this controller.
- @GetMapping("/hello") defines an HTTP GET endpoint at /api/hello.
- hello() returns a plain string; Spring uses a default converter to render as a plain text response.
- @GetMapping("/hello/{name}") defines a dynamic URL where {name} is captured from the path.
- @PathVariable("name") binds the segment of the URL to the method parameter.

## 3. Handling Requests: Path Variables, Query Params, and Request Bodies

Code: DTOs and a controller that demonstrates path variables, query parameters, and request bodies.

```java
// src/main/java/com/example/firstwebserver/Greeting.java
package com.example.firstwebserver;

public class Greeting {
    private String message;
    private String from;

    public Greeting() {}

    public Greeting(String message, String from) {
        this.message = message;
        this.from = from;
    }

    // getters and setters
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
}
```

```java
// src/main/java/com/example/firstwebserver/GreetingController.java
package com.example.firstwebserver;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GreetingController {

    // Query parameter example
    @GetMapping("/greet")
    public Greeting greetWithQuery(@RequestParam(name = "name", defaultValue = "Guest") String name) {
        return new Greeting("Hello, " + name + "!", "GreetingController");
    }

    // POST with request body
    @PostMapping("/echo")
    public Greeting echo(@RequestBody Greeting payload) {
        // Echo back the received payload with a tag
        return new Greeting(payload.getMessage(), "echo-service");
    }

    // Path variable combined with response
    @GetMapping("/greet/{name}/from/{from}")
    public Greeting complexGreet(@PathVariable String name, @PathVariable String from) {
        return new Greeting("Hi " + name + ", this is from " + from, "GreetingController");
    }
}
```

### Line-by-line explanation
- Greeting.java: A simple DTO (data transfer object) with message and from fields, plus getters/setters. It’s used to serialize/deserialize JSON payloads automatically by Spring (Jackson under the hood).
- GreetingController.java: Annotated with @RestController and @RequestMapping("/api") to establish a base path.
- @GetMapping("/greet") with @RequestParam demonstrates reading query parameters; a defaultValue is provided if the parameter is absent.
- greetWithQuery returns a Greeting object; Spring converts it to JSON automatically.
- @PostMapping("/echo") with @RequestBody demonstrates deserializing a JSON payload into a Greeting object, then returning a transformed object.
- echo shows a simple echo service: whatever payload is sent is returned with a different “from” tag.
- @GetMapping("/greet/{name}/from/{from}") demonstrates multiple path variables binding to method parameters.

## 4. Configuring and running: Profiles, port, and packaging

Code: Basic configuration and how to customize the server port and simple properties.

```properties
# src/main/resources/application.properties
server.port=8080
server.servlet.context-path=/api  # optional: mounts all endpoints under /api if not already
management.endpoints.web.exposure.include=health,info
app.version=0.1.0
```

```java
// src/main/java/com/example/firstwebserver/AppProperties.java
package com.example.firstwebserver;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String version;

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
}
```

```java
// src/main/java/com/example/firstwebserver/InfoController.java
package com.example.firstwebserver;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InfoController {

    private final AppProperties appProperties;

    public InfoController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @GetMapping("/info")
    public String info() {
        return "App version: " + appProperties.getVersion();
    }
}
```

### Line-by-line explanation
- application.properties sets the server port to 8080 and optionally a context path; management endpoints (health, info) are exposed for observability. The app.version key demonstrates externalized configuration.
- AppProperties is a simple POJO annotated with @ConfigurationProperties(prefix="app") that binds properties with the app prefix to fields in this class.
- InfoController demonstrates using injected configuration properties to expose runtime information via an endpoint (e.g., /api/info).
- The context-path comment shows how you can optionally mount all endpoints under a global path if desired; by default, endpoints are under the root unless you set a context path.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Blocking long tasks on request thread
Bad:
```java
@GetMapping("/process")
public String process() throws InterruptedException {
    // Blocking work on the request thread
    Thread.sleep(5000);
    return "done";
}
```
Good:
```java
@GetMapping("/process")
public CompletableFuture<String> processAsync() {
    return CompletableFuture.supplyAsync(() -> {
        // simulate long-running task
        try { Thread.sleep(5000); } catch (InterruptedException ignore) {}
        return "done";
    });
}
```

### Line-by-line explanation
- Bad example blocks the request thread for 5 seconds, preventing handling of other requests and starving the thread pool.
- Good example offloads work to a separate thread, freeing the request thread to handle other requests; Spring will complete the response when the future completes.

- Pitfall 2: Not validating input
Bad:
```java
@PostMapping("/users")
public String createUser(@RequestBody String payload) {
    // no validation
    return "User created";
}
```
Good:
```java
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;

public class CreateUserRequest {
    @NotBlank
    private String username;
    // getters/setters
}

@RestController
@RequestMapping("/api")
public class UserController {
    @PostMapping("/users")
    public String createUser(@Valid @RequestBody CreateUserRequest req) {
        // validated
        return "User created: " + req.getUsername();
    }
}
```

### Line-by-line explanation
- Bad example accepts arbitrary payload without validation, risking bad state or security issues.
- Good example uses a strongly-typed DTO with Bean Validation annotations and @Valid to enforce constraints on input, returning a 400 Bad Request if validation fails.

- Pitfall 3: Exposing internal exceptions to clients
Bad:
```java
@GetMapping("/data/{id}")
public Data getData(@PathVariable String id) {
    return dataService.read(id); // may throw runtime exceptions
}
```
Good:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(DataNotFoundException.class)
    public ResponseEntity<String> handleNotFound(DataNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Data not found");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleOther(Exception ex) {
        // log the error for internal diagnostics
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal error");
    }
}
```

### Line-by-line explanation
- Bad example lets exceptions bubble up, potentially leaking stack traces and internal details to clients.
- Good example uses a centralized exception handler (ControllerAdvice) to translate exceptions into safe, consistent HTTP responses and to improve observability by logging internally.

- Pitfall 4: Hard-coding configuration in code
Bad:
```java
public String getEnvEndpoint() {
    return "http://internal-service.example.local";
}
```
Good:
```java
@Value("${external.service.url}")
private String externalServiceUrl;
```

### Line-by-line explanation
- Bad approach couples code to a specific environment, making deployments fragile.
- Good approach uses externalized configuration through properties, enabling environment-specific values without code changes.

## Y. Why This Matters In Real Systems — production context and real usage

- Standardized web frameworks reduce boilerplate: Spring Boot handles HTTP routing, JSON serialization, validation, and lifecycle management, enabling you to deliver features faster.
- Observability and reliability: Actuator endpoints, metrics, and health checks are essential for monitoring. Centralized error handling ensures predictable API behavior and easier debugging.
- Security and validation: Input validation, proper error responses, and avoiding information leakage protect users and systems from attacks and misconfigurations.
- Performance considerations: Understanding the thread model and using asynchronous patterns or reactive styles in high-load scenarios helps maintain responsiveness under load.
- Deployment readiness: Packaging as an executable JAR with embedded server simplifies deployment, scaling, and cloud-ready operations. Externalized configuration (application.properties/yaml) makes it easy to adapt to different environments.
- Evolution and maintainability: Clear DTOs, separation of concerns (Controllers, Services, Repositories), and testability support long-term maintenance and CI/CD workflows.

## Z. Study Questions — 5 recall questions

1. What is the purpose of the @SpringBootApplication annotation?
2. How do you read a path variable and a query parameter in a Spring REST controller?
3. Why should you use @Valid and a DTO with validation annotations instead of directly accepting a raw string payload?
4. What is a ControllerAdvice, and how does it improve error handling in APIs?
5. How can you externalize configuration like service URLs or version numbers in a Spring Boot app?

## Exercise — practical multi-part coding challenge

Goal: Build a small, production-friendly REST API using Spring Boot with an in-memory repository and basic input validation. You’ll implement endpoints to check health/info, manage items, and demonstrate proper error handling.

Part 1: Scaffold the project
- Create a Maven project with Spring Boot Web, Validation, and Actuator dependencies (see Section 1 for reference).
- Implement the main application class (as in Section 1) and ensure the app runs with mvn spring-boot:run.

Part 2: Implement health/info endpoints
- Create an InfoController with:
  - GET /api/health: returns a simple JSON { "status": "UP" }.
  - GET /api/info: returns application version from application.properties using @Value or a properties bean.

Part 3: Implement an in-memory Item API
- Create a simple Item model:
  - id: long
  - name: String (non-empty)
  - price: double (positive)
- Create a repository-like component (ItemRepository) backed by a ConcurrentHashMap<Long, Item>.
- Create an ItemController with:
  - GET /api/items: list all items
  - GET /api/items/{id}: fetch item by id, return 404 if not found
  - POST /api/items: create a new item; validate using a CreateItemRequest DTO with @NotBlank name and @Positive price; auto-increment ID
- Provide thread-safe incrementing for IDs and ensure responses use proper HTTP status codes (200/201/404).

Part 4: Validation and error handling
- Ensure input validation is enforced on POST /api/items.
- Implement a simple GlobalExceptionHandler (ControllerAdvice) to translate validation errors into 400 responses with a helpful body.

Part 5: Run and test
- Run the app, verify endpoints with curl or a REST client:
  - GET http://localhost:8080/api/health
  - GET http://localhost:8080/api/info
  - POST http://localhost:8080/api/items with JSON {"name":"Widget","price":19.99}
  - GET http://localhost:8080/api/items
  - GET http://localhost:8080/api/items/1
- Expect JSON responses and correct HTTP statuses.

Starter code snippets for Part 3 (you’ll fill in the rest in your project):

```java
// src/main/java/com/example/firstwebserver/Item.java
package com.example.firstwebserver;

public class Item {
    private Long id;
    private String name;
    private double price;

    // constructors, getters, setters
    public Item() {}
    public Item(Long id, String name, double price) {
        this.id = id; this.name = name; this.price = price;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}
```

```java
// src/main/java/com/example/firstwebserver/CreateItemRequest.java
package com.example.firstwebserver;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Positive;

public class CreateItemRequest {
    @NotBlank
    private String name;

    @Positive
    private double price;

    // getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}
```

```java
// src/main/java/com/example/firstwebserver/ItemController.java
package com.example.firstwebserver;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.validation.Valid;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api")
public class ItemController {

    private final ItemRepository repository = new ItemRepository();
    private final AtomicLong idCounter = new AtomicLong(1);

    @GetMapping("/items")
    public List<Item> listItems() {
        return new ArrayList<>(repository.findAll().values());
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<Item> getItem(@PathVariable Long id) {
        Item item = repository.findById(id);
        if (item == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(item);
    }

    @PostMapping("/items")
    public ResponseEntity<Item> createItem(@Valid @RequestBody CreateItemRequest req) {
        long id = idCounter.getAndIncrement();
        Item item = new Item(id, req.getName(), req.getPrice());
        repository.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }
}
```

```java
// src/main/java/com/example/firstwebserver/ItemRepository.java
package com.example.firstwebserver;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class ItemRepository {
    private final Map<Long, Item> items = new ConcurrentHashMap<>();

    public Map<Long, Item> findAll() {
        return items;
    }

    public Item findById(Long id) {
        return items.get(id);
    }

    public void save(Item item) {
        items.put(item.getId(), item);
    }
}
```

```java
// src/main/java/com/example/firstwebserver/GlobalExceptionHandler.java
package com.example.firstwebserver;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    // Additional handlers (e.g., for 404 or 500) can be added here
}
```

What you should learn from this exercise:
- How to scaffold a Spring Boot application and run an embedded server.
- How to expose RESTful endpoints using @RestController, and how to manage path variables, query params, and request bodies.
- How to perform basic input validation with DTOs and Bean Validation.
- How to implement a simple in-memory repository and ensure thread safety for real-like workloads.
- How to centralize error handling and expose clean API error responses.
- How to leverage externalized configuration for different environments.

If you want, I can tailor the code examples to a specific Spring Boot version, add tests (JUnit + Spring Test), or extend the exercise to include persistence with an in-memory H2 database.