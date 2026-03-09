# Track: Backend Engineering — Module: Phase 4 — Building Web Servers
Topic: Testing Basics — Unit & Integration Tests (Java)

Compelling introductory paragraph
Testing is foundational to reliable backend systems. Unit tests validate small, deterministic pieces of logic in isolation, while integration tests verify that multiple components work together in a realistic runtime environment. Together, they help you catch bugs early, enable safe refactors, and provide confidence for deploying web servers that handle real traffic. In Java, a disciplined testing approach using JUnit 5, Mockito, and integration testing with Spring Boot lets you cover business rules, data access, and HTTP endpoints with clear contracts and fast feedback.

## 1. Testing Foundations: Unit Tests vs Integration Tests

```java
// Calculator.java
package com.example.backend;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int divide(int a, int b) {
        if (b == 0) throw new IllegalArgumentException("Division by zero");
        return a / b;
    }
}
```

```java
// CalculatorTest.java
package com.example.backend;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {

    @Test
    void testAdd() {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
    }

    @Test
    void testDivide() {
        Calculator c = new Calculator();
        assertEquals(2, c.divide(6, 3));
    }

    @Test
    void testDivideByZeroThrows() {
        Calculator c = new Calculator();
        assertThrows(IllegalArgumentException.class, () -> c.divide(1, 0));
    }
}
```

### Line-by-line explanation
- Calculator class provides simple operations used to illustrate unit testing.
- add returns the sum of two integers.
- divide checks for division by zero and performs the division.
- CalculatorTest uses JUnit 5 annotations.
- testAdd validates that 2 + 3 equals 5.
- testDivide validates correct division result.
- testDivideByZeroThrows asserts that dividing by zero throws the expected exception.

## 2. Unit Testing with Mocks: Service Layer Isolation

```java
// User.java
package com.example.backend;

public class User {
    private final String id;
    private final String name;

    public User(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }
    public String getName() { return name; }
}
```

```java
// UserRepository.java
package com.example.backend;

public interface UserRepository {
    User findById(String id);
    void save(User user);
}
```

```java
// UserService.java
package com.example.backend;

public class UserService {
    private final UserRepository repo;

    public UserService(UserRepository repo) {
        this.repo = repo;
    }

    public User getUser(String id) {
        return repo.findById(id);
    }

    public boolean register(User user) {
        if (user == null || user.getName() == null || user.getName().isEmpty()) {
            return false;
        }
        repo.save(user);
        return true;
    }
}
```

```java
// UserServiceTest.java
package com.example.backend;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Test
    void testGetUserReturnsRepositoryValue() {
        UserRepository mockRepo = mock(UserRepository.class);
        User alice = new User("u1", "Alice");
        when(mockRepo.findById("u1")).thenReturn(alice);

        UserService svc = new UserService(mockRepo);
        assertEquals("Alice", svc.getUser("u1").getName());
        verify(mockRepo).findById("u1");
    }

    @Test
    void testRegisterSavesWhenValid() {
        UserRepository mockRepo = mock(UserRepository.class);
        UserService svc = new UserService(mockRepo);
        User user = new User("u2", "Bob");

        boolean ok = svc.register(user);
        assertTrue(ok);
        verify(mockRepo).save(user);
    }

    @Test
    void testRegisterRejectsInvalidUser() {
        UserRepository mockRepo = mock(UserRepository.class);
        UserService svc = new UserService(mockRepo);

        boolean ok = svc.register(null);
        assertFalse(ok);
        verify(mockRepo, never()).save(any());
    }
}
```

### Line-by-line explanation
- User and UserRepository define a simple domain and persistence abstraction.
- UserService encapsulates business logic around retrieving and registering users.
- In testGetUserReturnsRepositoryValue, the repository is mocked to return a known user; the test asserts the service returns the same user and verifies the interaction.
- In testRegisterSavesWhenValid, a valid user triggers a save call; test asserts the operation succeeds and the save interaction occurs.
- In testRegisterRejectsInvalidUser, a null input is rejected without calling save; test ensures no persistence attempt occurs.

## 3. Integration Testing: Web Layer with Spring Boot

```java
// Application.java
package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

```java
// User.java (same as above, or a lightweight DTO)
package com.example.backend;

public class User {
    private String id;
    private String name;

    // default constructor for JSON deserialization
    public User() {}

    public User(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }
    public String getName() { return name; }

    public void setId(String id) { this.id = id; }
    public void setName(String name) { this.name = name; }
}
```

```java
// UserController.java
package com.example.backend;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        User u = service.getUser(id);
        if (u == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(u);
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        boolean created = service.register(user);
        if (created) {
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}
```

```java
// InMemoryUserRepository.java
package com.example.backend;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

@Repository
public class InMemoryUserRepository implements UserRepository {
    private final Map<String, User> store = new ConcurrentHashMap<>();

    @Override
    public User findById(String id) {
        return store.get(id);
    }

    @Override
    public void save(User user) {
        if (user != null && user.getId() != null) {
            store.put(user.getId(), user);
        }
    }
}
```

```java
// UserService.java (Spring-friendly)
package com.example.backend;

import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository repo;

    public UserService(UserRepository repo) {
        this.repo = repo;
    }

    public User getUser(String id) {
        return repo.findById(id);
    }

    public boolean register(User user) {
        if (user == null || user.getName() == null || user.getName().isEmpty()) {
            return false;
        }
        repo.save(user);
        return true;
    }
}
```

```java
// UserControllerIntegrationTest.java
package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerIntegrationTest {

    @Autowired private MockMvc mvc;

    @Test
    void testCreateAndGetUserViaHttp() throws Exception {
        // Create user via POST
        String json = "{\"id\":\"u101\",\"name\":\"Diana\"}";
        mvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("u101"))
            .andExpect(jsonPath("$.name").value("Diana"));

        // Retrieve user via GET
        mvc.perform(get("/api/users/u101"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("u101"))
            .andExpect(jsonPath("$.name").value("Diana"));
    }
}
```

### Line-by-line explanation
- Application.java bootstraps a Spring Boot application for test and runtime.
- User class serves as a domain/DTO with default constructor for JSON deserialization and getters/setters for Spring MVC binding.
- UserController exposes REST endpoints for retrieving and creating users.
- InMemoryUserRepository is a simple, thread-safe in-memory store used by tests and development.
- UserService encapsulates business logic and uses the repository abstraction for persistence.
- UserControllerIntegrationTest uses Spring's testing support to start the context and perform HTTP-like requests via MockMvc.
- The test creates a user through POST and then retrieves it via GET, validating HTTP status codes and response payloads.

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Testing private methods
- Bad approach: unit testing private helpers directly.
- Good approach: test public behavior that relies on private logic; extract to testable components when necessary.

Bad:
```java
// Calculator.java
public class Calculator {
    private int secretAdd(int a, int b) { return a + b; } // private helper

    public int publicAdd(int a, int b) { return secretAdd(a, b); }
}
```

Good:
```java
// CalculatorTest.java
import static org.junit.jupiter.api.Assertions.*;
class CalculatorTest {
    @Test void testPublicAdd() {
        Calculator c = new Calculator();
        assertEquals(5, c.publicAdd(2, 3));
    }
}
```

### Pitfall 2: Over-mocking and brittle tests
- Bad: mocking collaborators too aggressively, causing tests to fail on implementation changes.
- Good: mock only external dependencies; verify behavior, not internal details.

Bad:
```java
@Test void testBehaviorWithAllMocks() {
    Repo repo = mock(Repo.class);
    Service svc = new Service(repo);
    when(repo.find("x")).thenReturn(new Item("x"));
    assertEquals("x", svc.doWork("x"));
    verify(repo).find("y"); // brittle: wrong interaction
}
```

Good:
```java
@Test void testBehaviorWithFocusedMock() {
    Repo repo = mock(Repo.class);
    when(repo.find("x")).thenReturn(new Item("x"));
    Service svc = new Service(repo);
    assertEquals("x", svc.doWork("x"));
}
```

### Pitfall 3: Not testing edge cases and error paths
- Bad: only happy-path tests.
- Good: include nulls, empty strings, failure conditions, and exception paths.

Bad:
```java
@Test void testOkPath() {
    MathService ms = new MathService();
    assertEquals(4, ms.multiply(2, 2));
}
```

Good:
```java
@Test void testEdgeCases() {
    MathService ms = new MathService();
    assertThrows(IllegalArgumentException.class, () -> ms.multiply(0, 5));
    assertThrows(IllegalArgumentException.class, () -> ms.divide(5, 0));
}
```

## 5. Why This Matters In Real Systems — production context and real usage

- Reduces regression risk: automated tests catch unintended behavior after changes, enabling safe refactors and feature adds.
- Improves deploy confidence: integration tests exercise end-to-end paths (HTTP, services, DB), reducing runtime issues in production.
- Supports CI/CD: fast, deterministic test runs integrate with pipelines to gate changes before deployment.
- Encourages maintainable design: tests reflect contracts, encouraging smaller, loosely-coupled components and explicit interfaces.
- Manages data and environment parity: tests should run with predictable data setups (in-memory DBs, test containers) to avoid flakiness.

## 6. Study Questions — 5 recall questions

1. What is the essential difference between a unit test and an integration test?
2. Why are mocks useful in unit testing, and what are common pitfalls when overusing them?
3. How do you verify that a collaborator was interacted with in Mockito?
4. What Spring testing annotations enable integration testing of controllers without starting a real server?
5. Name three strategies to reduce flaky tests in an integration test suite.

## 7. Exercise — a practical multi-part coding challenge

Part A — Set up a minimal Java project
- Create a new Java project (Maven or Gradle) with dependencies for JUnit 5, Mockito, and Spring Boot (Web + Test).

Part B — Implement domain, service, and repository
- Build a small domain: Product with id, name, and price.
- Create a ProductRepository interface and an in-memory implementation.
- Implement ProductService with methods:
  - Product getProduct(String id)
  - boolean createProduct(Product p)
  - List<Product> listAll()

Part C — Unit tests for the service
- Write unit tests for ProductService using a mocked ProductRepository.
- Include at least tests for: successful creation, retrieval of an existing product, and handling of a null product input.

Part D — Web layer with Spring Boot
- Expose a REST controller at /api/products with endpoints:
  - GET /api/products/{id} -> Product or 404
  - POST /api/products -> 201 with created product or 400 if invalid
- Wire up an in-memory repository so you can run the app without a database.

Part E — Integration tests for the web layer
- Write integration tests using @SpringBootTest and MockMvc to test the POST and GET endpoints end-to-end.
- Ensure health of the controller, proper status codes, and correct JSON payloads.

Part F — Evaluation criteria
- Clarity of unit tests and coverage of edge cases.
- Correct use of mocks (not over-mocking, verifying meaningful interactions).
- End-to-end HTTP tests that exercise the controller and service wiring.
- Readability, naming, and maintainability of test data and helper utilities.

Notes for implementing the exercise
- Use a simple JSON serializer/deserializer for Product in the controller (Spring Boot handles this via Jackson by default).
- Keep the in-memory repository thread-safe if you plan to run concurrent tests.
- Favor descriptive test names (e.g., createsProductSuccessfully, returns404WhenProductMissing).

This completes a comprehensive lesson on Unit and Integration Testing for Java-based backend web servers, covering theory, practical code examples, and real-world production considerations.