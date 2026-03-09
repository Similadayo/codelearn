# Routing — URL Design and Path Parameters in Java (Backend Engineering)

Routing is the mechanism by which a web server maps an incoming request's URL to a specific piece of code that handles the request. In backend engineering, thoughtful URL design and precise path parameter handling are critical for clarity, maintainability, and scalability. Good route design reduces coupling between services, makes APIs easier to consume, and supports evolution over time without breaking clients. This lesson focuses on URL design and path parameters in a Java backend context, using conventional RESTful patterns and Spring Boot-style controllers to illustrate practical concepts.

## 1. URL Design Principles and Versioning
Designing clean, consistent, and future-proof URLs is foundational. This section covers resource-oriented URLs, versioning, and sub-resources, with a concrete code example.

```java
package com.example.routing;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Arrays;

@RestController
@RequestMapping("/api/v1")
public class ProductController {

  @GetMapping("/products")
  public List<Product> listProducts() {
    return Arrays.asList(new Product(1L, "Laptop"), new Product(2L, "Mouse"));
  }

  @GetMapping("/products/{productId}")
  public Product getProduct(@PathVariable Long productId) {
    // In a real app, fetch from DB
    return new Product(productId, "Sample Product");
  }

  @GetMapping("/categories/{categoryId}/products")
  public List<Product> listProductsByCategory(@PathVariable Long categoryId) {
    // Example: category-scoped listing
    return Arrays.asList(new Product(101L, "CategoryProduct"));
  }

  static class Product {
     public Long id;
     public String name;
     public Product(Long id, String name) { this.id = id; this.name = name; }
  }
}
```

### Line-by-line explanation
- The class is annotated with @RestController, indicating a RESTful controller that returns JSON.
- @RequestMapping("/api/v1") establishes a versioned API surface at the /api/v1 base path.
- @GetMapping("/products") maps GET requests to /api/v1/products, returning all products.
- @GetMapping("/products/{productId}") maps GET requests to a specific product by its ID, binding the path segment to the productId parameter via @PathVariable.
- @GetMapping("/categories/{categoryId}/products") demonstrates sub-resources; this endpoint returns products within a given category.
- The inner Product class is a minimal DTO with public fields so it serializes cleanly to JSON. In real systems, use private fields with getters/setters and optional validation.

## 2. Simple Path Parameters and Type Conversion
Path parameters capture dynamic segments from the URL. This section demonstrates mapping path variables to strongly typed method parameters and what happens on type mismatches.

```java
@RestController
@RequestMapping("/api/v1")
public class UserController {

  @GetMapping("/users/{userId}")
  public User getUser(@PathVariable("userId") Long userId) {
    // In a real app, fetch by userId
    return new User(userId, "Alice");
  }

  @GetMapping("/users/{userId}/orders/{orderId}")
  public Order getOrder(
      @PathVariable("userId") Long userId,
      @PathVariable("orderId") Long orderId) {
    // Example composition: fetch a specific order for a user
    return new Order(orderId, "Order-" + orderId);
  }

  static class User {
     public Long id;
     public String name;
     public User(Long id, String name) { this.id = id; this.name = name; }
  }
  static class Order {
     public Long id;
     public String code;
     public Order(Long id, String code) { this.id = id; this.code = code; }
  }
}
```

### Line-by-line explanation
- The getUser method declares userId as a Long path variable, enabling automatic numeric parsing. If a non-numeric value is supplied in the URL, the framework will respond with a 400 Bad Request before entering the method.
- The getOrder method demonstrates multiple path parameters in a single endpoint, binding both userId and orderId from the URL.
- The DTO classes User and Order are simple structures used to serialize responses to JSON; public fields are used for brevity in the example.

## 3. Sub-resources, Multiple Path Parameters, and Regex Constraints
This section covers endpoints that navigate resource hierarchies and demonstrates using regex constraints on path variables to enforce formats.

```java
@RestController
@RequestMapping("/api/v1") 
public class ResourceController {

  // Constrained path variable: only alphanumeric IDs are allowed
  @GetMapping("/resources/{resourceId:[0-9a-fA-F-]+}")
  public Resource getResource(@PathVariable("resourceId") String resourceId) {
    return new Resource(resourceId, "Resource-" + resourceId);
  }

  // Example of a file-like endpoint where we want to capture a name with dots
  @GetMapping("/files/{filename:.+}")
  public String getFile(@PathVariable("filename") String filename) {
    return "Requested file: " + filename;
  }

  static class Resource {
     public String id;
     public String description;
     public Resource(String id, String description) { this.id = id; this.description = description; }
  }
}
```

### Line-by-line explanation
- The first endpoint demonstrates a regex constraint on the path variable resourceId. The pattern [0-9a-fA-F-]+ allows hexadecimal-like IDs plus hyphens, illustrating how to enforce formats at the routing layer.
- If a request does not match the constraint, the framework will not dispatch to the handler, typically returning a 404 or 400 depending on framework behavior.
- The getFile endpoint uses a catch-all pattern with filename:.+ to capture file names that include dots (e.g., "report.v1.2.pdf"), illustrating how regex can influence path shape.
- The Resource DTO mirrors the usage pattern from previous sections, emphasizing consistent response shapes.

## 4. Validation, Error Handling, and Path Parameter Pitfalls
Path parameter handling can lead to runtime errors if not carefully designed. This section shows guarding against invalid values and demonstrates the difference between “bad” and “good” practices.

```java
@RestController
@RequestMapping("/api/v1")
public class CategoryController {

  @GetMapping("/categories/{categoryId}")
  public Category getCategory(@PathVariable("categoryId") Long categoryId) {
     // Basic guard rails: ensure ID is positive
     if (categoryId == null || categoryId <= 0) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid categoryId");
     }
     return new Category(categoryId, "Gadgets");
  }

  static class Category {
     public Long id;
     public String name;
     public Category(Long id, String name) { this.id = id; this.name = name; }
  }
}
```

### Line-by-line explanation
- The method accepts a numeric categoryId. Spring performs type conversion automatically; a non-numeric path segment would result in a 400 before method execution.
- A guard clause checks for null or non-positive IDs and returns a 400 with a descriptive message via ResponseStatusException.
- Returning a Category object demonstrates normal successful responses with a stable shape.
- This pattern helps ensure API reliability by catching invalid inputs early and returning consistent error responses.

Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Fat controllers vs skinny, cohesive controllers
  - Bad:
    ```java
    @RestController
    public class ApiController {
      @GetMapping("/users/{id}")
      public User getUser(...) { /* lots of business logic here */ }
    }
    ```
  - Good:
    ```java
    @RestController
    @RequestMapping("/api/v1/users")
    public class UserController {
      @GetMapping("/{id}")
      public User getUser(@PathVariable Long id) { /* delegate to service */ }
    }
    ```
- Not validating path parameters vs validating at the boundary
  - Bad:
    ```java
    @GetMapping("/orders/{orderId}")
    public Order getOrder(@PathVariable String orderId) {
      // directly use orderId, then parse manually
      Long id = Long.parseLong(orderId); // could throw NumberFormatException
      // fetch ...
    }
    ```
  - Good:
    ```java
    @GetMapping("/orders/{orderId}")
    public Order getOrder(@PathVariable Long orderId) {
      // ID type guarantees numeric values; framework handles conversion
      // fetch ...
    }
    ```
- Not versioning and hard-to-change routes
  - Bad:
    ```java
    @GetMapping("/users/getUser")
    public User getUser(...) { }
    ```
  - Good:
    ```java
    @RequestMapping("/api/v1/users")
    public class UserController {
      @GetMapping("/{userId}")
      public User getUser(@PathVariable Long userId) { }
    }
    ```
- Inconsistent error handling
  - Bad:
    ```java
    @GetMapping("/items/{id}")
    public Item get(@PathVariable Long id) {
      Item i = repo.find(id);
      if (i == null) {
        return null; // 204 or 200 with empty body is confusing
      }
      return i;
    }
    ```
  - Good:
    ```java
    @GetMapping("/items/{id}")
    public Item get(@PathVariable Long id) {
      Item i = repo.find(id);
      if (i == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
      return i;
    }
    ```

Why This Matters In Real Systems — production context and real usage
- Consistency enables client libraries to be stable across teams and services. Versioned base paths (.e.g, /api/v1) allow non-breaking evolution and easy deprecation paths.
- Clear resource-oriented URLs improve API discoverability, automated documentation generation, and gateway routing (e.g., API gateways and reverse proxies).
- Path parameters offer fast routing decisions, but they demand careful validation to prevent invalid inputs from propagating into services.
- Sub-resources (e.g., /users/{userId}/orders/{orderId}) model hierarchies naturally, enabling intuitive permissions, auditing, and rate-limiting at the endpoint level.
- Proper error handling and consistent responses (HTTP status codes and payload shapes) reduce debugging time in production and improve client resilience.
- Regex constraints and advanced path patterns can express domain rules at the routing layer, catching invalid URLs earlier and reducing controller complexity.

Study Questions — 5 recall questions
1) What is the difference between a path parameter and a query parameter, and when should you use each? 
2) How do you assign a version to your API endpoints, and why is this important for backward compatibility?
3) How can you constrain a path variable’s format using regex in a typical Java Spring route?
4) If a path parameter cannot be converted to the required type (e.g., non-numeric when a Long is expected), what HTTP status code is typically returned?
5) What is the benefit of modeling sub-resources (e.g., /users/{userId}/orders) in your URL design?

Exercise — a practical multi-part coding challenge
Goal: Build a small Spring Boot-style REST API that demonstrates routing design, path parameters, and error handling for a “Library” service.

Part A — Define the endpoints
- Create a Spring controller with base path /api/v1/library.
- Endpoints to implement:
  - GET /api/v1/library/libraries — list libraries
  - GET /api/v1/library/libraries/{libraryId} — get a library by ID
  - GET /api/v1/library/libraries/{libraryId}/books — list books in a library
  - GET /api/v1/library/libraries/{libraryId}/books/{bookId} — get a book by ID within a library

Part B — In-memory data
- Use in-memory data structures (maps/lixed lists) to store libraries and books.
- Library: id (long), name (string)
- Book: id (long), title (string)

Part C — Path parameter handling and errors
- Ensure IDs are numeric via @PathVariable Long.
- If a library or book is not found, return 404 with a descriptive message.
- If an invalid ID format is supplied (e.g., /libraries/abc), respond with 400 Bad Request.

Part D — Sample data and response shapes
- Provide at least two libraries, each with two books.
- Response payloads should be simple JSON objects or arrays reflecting the data.

Part E — Example usage (what you would test manually)
- GET /api/v1/library/libraries → returns a list of libraries
- GET /api/v1/library/libraries/1 → returns library 1
- GET /api/v1/library/libraries/1/books → returns books belonging to library 1
- GET /api/v1/library/libraries/1/books/101 → returns book 101 in library 1
- GET /api/v1/library/libraries/1/books/999 → 404 not found
- GET /api/v1/library/libraries/x → 400 bad request

Sample starter code (organize into files as appropriate for your project)

```java
package com.example.library;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@SpringBootApplication
public class LibraryApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(LibraryApiApplication.class, args);
  }
}

@RestController
@RequestMapping("/api/v1/library")
class LibraryController {

  // In-memory data store
  private final Map<Long, Library> libraries = new HashMap<>();
  private final Map<Long, List<Book>> libraryBooks = new HashMap<>();

  public LibraryController() {
    // Seed data
    Library lib1 = new Library(1L, "Central Library");
    Library lib2 = new Library(2L, "Community Library");
    libraries.put(lib1.id, lib1);
    libraries.put(lib2.id, lib2);

    libraryBooks.put(1L, Arrays.asList(new Book(101L, "Java 101"), new Book(102L, "Spring in Action")));
    libraryBooks.put(2L, Arrays.asList(new Book(201L, "Data Structures"), new Book(202L, "Algorithms")));
  }

  @GetMapping("/libraries")
  public List<Library> listLibraries() {
    return new ArrayList<>(libraries.values());
  }

  @GetMapping("/libraries/{libraryId}")
  public Library getLibrary(@PathVariable("libraryId") Long libraryId) {
    Library lib = libraries.get(libraryId);
    if (lib == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Library not found: " + libraryId);
    }
    return lib;
  }

  @GetMapping("/libraries/{libraryId}/books")
  public List<Book> listBooks(@PathVariable("libraryId") Long libraryId) {
    if (!libraries.containsKey(libraryId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Library not found: " + libraryId);
    }
    return libraryBooks.getOrDefault(libraryId, Collections.emptyList());
  }

  @GetMapping("/libraries/{libraryId}/books/{bookId}")
  public Book getBook(@PathVariable("libraryId") Long libraryId,
                      @PathVariable("bookId") Long bookId) {
    if (!libraries.containsKey(libraryId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Library not found: " + libraryId);
    }
    List<Book> books = libraryBooks.getOrDefault(libraryId, Collections.emptyList());
    return books.stream()
      .filter(b -> b.id.equals(bookId))
      .findFirst()
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found: " + bookId));
  }

  static class Library {
     public Long id;
     public String name;
     public Library(Long id, String name) { this.id = id; this.name = name; }
  }

  static class Book {
     public Long id;
     public String title;
     public Book(Long id, String title) { this.id = id; this.title = title; }
  }
}
```

Notes for instructors or students:
- This exercise demonstrates URL design with versioning, proper path parameter binding, sub-resources, and robust error handling.
- You can extend this by adding POST/PUT/DELETE endpoints, introducing service layers, or wiring in a real database and DTO mappings.

End of lesson.