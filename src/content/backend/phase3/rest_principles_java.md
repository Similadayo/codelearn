# REST Architecture — Designing Good APIs in Java

REST architecture is the de facto standard for building scalable, interoperable web services. It defines a principled way to model resources, use HTTP verbs, and leverage stateless interactions to enable evolvable APIs that teams can build, test, and monitor at scale. In professional backend engineering, designing good REST APIs means choosing clear resource names, stable versioning, correct status codes, predictable error formats, and security+performance-savvy patterns. This lesson walks you through key concepts, with concrete Java (Spring) examples, line-by-line explanations, and practical pitfalls to avoid.

## 1. REST Principles and Resource Modeling

Design RESTful resources around nouns, keep endpoints stable, and use HTTP methods to express intent. Model domain resources as JSON-friendly DTOs, prefer idempotent operations where appropriate, and leverage proper status codes for success and failure.

```java
package com.example.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

  private final ProductService service;

  public ProductController() {
    // In a real app, use dependency injection
    this.service = new InMemoryProductService();
  }

  @GetMapping
  public List<ProductDTO> list() {
    return service.findAll().stream()
        .map(ProductDTO::from)
        .collect(Collectors.toList());
  }

  @GetMapping("/{id}")
  public ResponseEntity<ProductDTO> get(@PathVariable Long id) {
    return service.findById(id)
        .map(p -> ResponseEntity.ok(ProductDTO.from(p)))
        .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
  }

  @PostMapping
  public ResponseEntity<ProductDTO> create(@Valid @RequestBody ProductDTO dto) {
    Product p = dto.toProduct();
    Product created = service.create(p);
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .header("Location", "/api/v1/products/" + created.getId())
        .body(ProductDTO.from(created));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ProductDTO> update(@PathVariable Long id, @Valid @RequestBody ProductDTO dto) {
    Product p = dto.toProduct();
    try {
      Product updated = service.update(id, p);
      return ResponseEntity.ok(ProductDTO.from(updated));
    } catch (NoSuchElementException ex) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
```

```java
package com.example.api;

import javax.validation.constraints.*;
import java.math.BigDecimal;

public class ProductDTO {
  private Long id;

  @NotBlank(message = "Name is required")
  private String name;

  private String description;

  @NotNull(message = "Price is required")
  @DecimalMin(value = "0.0", inclusive = true)
  private BigDecimal price;

  // Getters and setters omitted for brevity

  public static ProductDTO from(Product p) {
    ProductDTO dto = new ProductDTO();
    dto.id = p.getId();
    dto.name = p.getName();
    dto.description = p.getDescription();
    dto.price = p.getPrice();
    return dto;
  }

  public Product toProduct() {
    Product p = new Product();
    p.setId(this.id);
    p.setName(this.name);
    p.setDescription(this.description);
    p.setPrice(this.price);
    return p;
  }

  // Getters and setters...
}
```

```java
package com.example.api;

import java.math.BigDecimal;

public class Product {
  private Long id;
  private String name;
  private String description;
  private BigDecimal price;

  // Getters and setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public BigDecimal getPrice() { return price; }
  public void setPrice(BigDecimal price) { this.price = price; }
}
```

```java
package com.example.api;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

public interface ProductService {
  List<Product> findAll();
  Optional<Product> findById(Long id);
  Product create(Product product);
  Product update(Long id, Product product);
  void delete(Long id);
}
```

```java
package com.example.api;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

public class InMemoryProductService implements ProductService {
  private final Map<Long, Product> store = new HashMap<>();
  private final AtomicLong idGen = new AtomicLong(1);

  public InMemoryProductService() {
    // Seed with one product
    Product p = new Product();
    p.setId(idGen.getAndIncrement());
    p.setName("Widget");
    p.setDescription("A basic widget");
    p.setPrice(BigDecimal.valueOf(9.99));
    store.put(p.getId(), p);
  }

  @Override
  public List<Product> findAll() {
    return new ArrayList<>(store.values());
  }

  @Override
  public Optional<Product> findById(Long id) {
    return Optional.ofNullable(store.get(id));
  }

  @Override
  public Product create(Product product) {
    product.setId(idGen.getAndIncrement());
    store.put(product.getId(), product);
    return product;
  }

  @Override
  public Product update(Long id, Product updated) {
    if (!store.containsKey(id)) {
      throw new NoSuchElementException("Product not found");
    }
    updated.setId(id);
    store.put(id, updated);
    return updated;
  }

  @Override
  public void delete(Long id) {
    store.remove(id);
  }
}
```

### Line-by-line explanation
- The controller defines REST endpoints under /api/v1/products for CRUD operations, demonstrating resource-oriented URLs and proper HTTP methods.
- ProductDTO enforces input validation rules using Bean Validation annotations (@NotBlank, @NotNull, @DecimalMin) to catch client mistakes early.
- The in-memory service is a simple stand-in for a real repository; it illustrates the separation of concerns: controller handles HTTP, service handles business logic, and DTOs convert to/from domain models.
- Location header on POST communicates the URL of the newly created resource, aligning with REST best practices.
- 404 responses indicate missing resources; 201 Created signals successful creation.

---

## 2. Designing Good APIs: Versioning, Naming Conventions, and Error Handling

Good APIs follow stable versioning, consistent naming, and predictable error formats. This helps client teams evolve without breaking existing integrations, and it makes error handling for clients clear and actionable.

```java
package com.example.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

public class ApiResponse<T> {
  private boolean success;
  private T data;
  private ApiError error;

  private ApiResponse(boolean success, T data, ApiError error) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, null);
  }

  public static <T> ApiResponse<T> fail(ApiError error) {
    return new ApiResponse<>(false, null, error);
  }

  // Getters...
}

public class ApiError {
  private String code;
  private String message;
  private List<String> details;

  // Constructors
  public ApiError(String code, String message) {
    this.code = code;
    this.message = message;
    this.details = new ArrayList<>();
  }
  // Getters/setters...
}
```

```java
package com.example.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class VersionedProductController {

  private final ProductService service;

  public VersionedProductController() {
    this.service = new InMemoryProductService();
  }

  // Version 1: stable response shape
  @GetMapping("/v1/products")
  public ApiResponse<List<ProductDTO>> listV1() {
    List<ProductDTO> data = service.findAll().stream()
        .map(ProductDTO::from)
        .collect(Collectors.toList());
    return ApiResponse.ok(data);
  }

  // Version 2: hypothetical improvement (e.g., richer DTO)
  @GetMapping("/v2/products")
  public ApiResponse<List<ProductDTO>> listV2() {
    List<ProductDTO> data = service.findAll().stream()
        .map(ProductDTO::from) // in real case, map to a enhanced DTO
        .collect(Collectors.toList());
    return ApiResponse.ok(data);
  }

  // Simple example of per-version endpoint with different response
  @GetMapping("/v1/products/{id}")
  public ApiResponse<ProductDTO> getV1(@PathVariable Long id) {
    return service.findById(id)
        .map(ProductDTO::from)
        .map(ApiResponse::ok)
        .orElseGet(() -> ApiResponse.fail(new ApiError("NOT_FOUND", "Product not found")));
  }
}
```

```java
package com.example.api;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
public class ContentNegotiationController {

  private final ProductService service = new InMemoryProductService();

  // Demonstrates simple media-type versioning via Accept header
  @GetMapping(value = "/{id}")
  public ProductDTO getById(@PathVariable Long id,
                            @RequestHeader(value = "Accept", required = false) String accept) {
    Product p = service.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    // In a real app, inspect 'accept' and map to different DTO shapes
    return ProductDTO.from(p);
  }
}
```

```java
package com.example.api;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

@ControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ProductNotFoundException.class)
  public ResponseEntity<ApiResponse<?>> handleNotFound(ProductNotFoundException ex) {
    ApiError error = new ApiError("NOT_FOUND", ex.getMessage());
    return new ResponseEntity<>(ApiResponse.fail(error), HttpStatus.NOT_FOUND);
  }

  // More handlers (ValidationException, etc.) can be added here
}
```

```java
package com.example.api;

public class ProductNotFoundException extends RuntimeException {
  public ProductNotFoundException(Long id) {
    super("Product not found: " + id);
  }
}
```

### Line-by-line explanation
- ApiResponse and ApiError provide a uniform envelope for all API responses, making success and error cases predictable for clients.
- VersionedProductController demonstrates a simple, explicit way to expose multiple API versions via URL paths (v1, v2). This is a common, beginner-friendly approach to avoid breaking changes.
- ContentNegotiationController hints at a more advanced approach: using Accept headers to negotiate response formats or versions.
- ApiExceptionHandler centralizes error handling, returning a consistent ApiResponse with a meaningful error payload and HTTP status code.
- The ProductNotFoundException demonstrates how domain exceptions map cleanly to HTTP 404 via the global exception handler.

---

## 3. API Evolution and Backwards Compatibility

APIs evolve over time. The goal is to add features without breaking existing clients. Strategies include versioned endpoints, adapters/converters, and deprecation guidance in API docs and responses.

```java
package com.example.api;

@RestController
@RequestMapping("/api/v1/products")
public class ProductV1Controller {

  private final ProductService service = new InMemoryProductService();

  @GetMapping("/{id}")
  public ApiResponse<ProductDTO> get(@PathVariable Long id) {
    return service.findById(id)
        .map(ProductDTO::from)
        .map(ApiResponse::ok)
        .orElseGet(() -> ApiResponse.fail(new ApiError("NOT_FOUND", "Product not found")));
  }

  // Old V1 behavior kept for backward compat
}

@RestController
@RequestMapping("/api/v2/products")
public class ProductV2Controller {

  private final ProductService service = new InMemoryProductService();

  @GetMapping("/{id}")
  public ApiResponse<ProductV2DTO> get(@PathVariable Long id) {
    return service.findById(id)
        .map(p -> ProductAdapter.toV2DTO(p))
        .map(ApiResponse::ok)
        .orElseGet(() -> ApiResponse.fail(new ApiError("NOT_FOUND", "Product not found")));
  }
}
```

```java
package com.example.api;

public class ProductV2DTO {
  private Long id;
  private String name;
  private String description;
  private BigDecimal price;
  private String currency; // new field in V2
  // Getters/setters
}
```

```java
package com.example.api;

public class ProductAdapter {
  public static ProductV2DTO toV2DTO(Product p) {
    ProductV2DTO dto = new ProductV2DTO();
    dto.setId(p.getId());
    dto.setName(p.getName());
    dto.setDescription(p.getDescription());
    dto.setPrice(p.getPrice());
    dto.setCurrency("USD"); // example default
    return dto;
  }
}
```

### Line-by-line explanation
- Exposing distinct controllers for v1 and v2 demonstrates a clean, explicit versioning path. The V2 controller can map domain models into a newer DTO shape without affecting V1 clients.
- ProductAdapter centralizes the translation between internal domain models and external API representations, crucial when API shapes diverge over time.
- This approach supports smooth deprecation: you can start routing new clients to v2 while keeping v1 functional for existing clients, with a documented sunset plan.

---

## 4. Security and Performance Considerations for REST

REST APIs in production must be secure, observable, and performant. This section shows a simple API key filter, a sample rate limiter, and a note on compression.

```java
package com.example.api.security;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {
  private static final String HEADER = "X-API-Key";
  // In real apps, fetch keys from a secure store or config
  private static final String SECRET = "secret-key";

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain)
      throws ServletException, IOException {
    String key = request.getHeader(HEADER);
    if (SECRET.equals(key)) {
      filterChain.doFilter(request, response);
      return;
    }
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"Unauthorized\"}");
  }
}
```

```properties
# application.properties (production-ready tuning)
server.compression.enabled=true
server.compression.mime-types=application/json,application/xml
server.compression.min-compression-size=1024
```

```java
package com.example.api.util;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SimpleRateLimiterFilter extends OncePerRequestFilter {

  // Very naive in-memory per-IP rate limiter (not suitable for production-scale)
  private final ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>();
  private final int LIMIT = 100;
  private final long WINDOW_MS = TimeUnit.MINUTES.toMillis(1);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws IOException, ServletException {
    String ip = request.getRemoteAddr();
    counters.putIfAbsent(ip, new AtomicInteger(0));

    AtomicInteger count = counters.get(ip);
    if (count.incrementAndGet() > LIMIT) {
      response.setStatus(429);
      response.setContentType("application/json");
      response.getWriter().write("{\"error\":\"Too many requests\"}");
      return;
    }

    // After window, reset (simplified; a real implementation would schedule resets)
    // For demonstration purposes only.
    filterChain.doFilter(request, response);
  }
}
```

### Line-by-line explanation
- ApiKeyAuthFilter demonstrates a lightweight security gate: if the request lacks the correct API key, return 401 and stop processing.
- The application.properties snippet shows enabling HTTP compression, which reduces payload sizes and improves perceived latency in production.
- SimpleRateLimiterFilter provides a basic per-IP rate cap. It’s intentionally simplistic: a robust production system would implement distributed rate limits (e.g., Redis-backed) with leaky-bucket or token-bucket algorithms and periodic resets.
- Together, these patterns illustrate how security, observability, and performance concerns translate into code that protects and stabilizes REST services in real systems.

---

## 5. Testing REST APIs and Tooling

Testing ensures API contracts remain reliable as code evolves. Use unit tests for controllers and integration tests for end-to-end behavior.

```java
package com.example.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ProductControllerTest {

  @Autowired
  private MockMvc mvc;

  @Test
  void listReturnsOkAndJson() throws Exception {
    mvc.perform(get("/api/v1/products"))
       .andExpect(status().isOk())
       .andExpect(content().contentTypeCompatibleWith("application/json"));
  }

  @Test
  void getExistingProductReturnsOk() throws Exception {
    mvc.perform(get("/api/v1/products/1"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.name").exists());
  }
}
```

### Line-by-line explanation
- The test class uses Spring Boot’s test support to spin up a lightweight app context and MockMvc to simulate HTTP requests.
- The first test asserts that listing products returns 200 OK and a JSON payload.
- The second test checks that fetching an existing product yields a valid JSON response with a name field, confirming the object mapping from domain to API DTO works as expected.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Exposing internal domain models directly
  - Bad:
    ```java
    @GetMapping("/products/{id}")
    public Product get(@PathVariable Long id) {
      return productRepository.findById(id).orElse(null);
    }
    ```
  - Good:
    ```java
    @GetMapping("/products/{id}")
    public ResponseEntity<ProductDTO> get(@PathVariable Long id) {
      return productService.findById(id)
        .map(ProductDTO::from)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
    ```
  - Why: Prevents leaking internals, makes API schema stable, and enables independent evolution of persistence models.

- Pitfall 2: Returning 200 OK with error details in the body
  - Bad:
    ```java
    @PostMapping("/products")
    public ApiResponse<?> create(@RequestBody ProductDTO dto) {
      if (dto.getName() == null) {
        return new ApiResponse<>(false, null, new ApiError("VALIDATION_FAILED", "Name required"));
      }
      // create
      return new ApiResponse<>(true, created, null);
    }
    ```
  - Good:
    ```java
    @PostMapping("/products")
    public ResponseEntity<ApiResponse<ProductDTO>> create(@Valid @RequestBody ProductDTO dto) {
      Product p = dto.toProduct();
      Product created = service.create(p);
      return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(ProductDTO.from(created)));
    }
    // Validation thrown by @Valid is handled by ApiExceptionHandler
    ```
  - Why: Proper HTTP status codes communicate outcome clearly and support client-side error handling.

- Pitfall 3: Lacking input validation
  - Bad:
    ```java
    @PostMapping("/products")
    public ProductDTO create(@RequestBody ProductDTO dto) {
      Product p = new Product(null, dto.getName(), dto.getDescription(), dto.getPrice());
      // no validation
      return ProductDTO.from(service.create(p));
    }
    ```
  - Good:
    ```java
    @PostMapping("/products")
    public ResponseEntity<ApiResponse<ProductDTO>> create(@Valid @RequestBody ProductDTO dto) {
      Product p = dto.toProduct();
      Product created = service.create(p);
      return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ProductDTO.from(created)));
    }
    ```
  - Why: Strong validation reduces bad data, avoids downstream errors, and improves API reliability.

- Pitfall 4: Ignoring versioning and deprecation strategy
  - Bad: renaming endpoints or changing response shapes without notice.
  - Good: maintain v1, introduce v2 with adapters, and mark deprecated endpoints with a clear sunset timeline and docs.
  - Why: Professional APIs require predictable evolution to keep clients functional and avoid breaking changes.

---

## Y. Why This Matters In Real Systems — production context and real usage

- Stability and evolution: Clear versioning and compatibility strategies prevent breaking client integrations as your service evolves.
- Clear contracts: Uniform response envelopes (success/data, or error payloads) make client code simpler and more robust.
- Observability: Centralized error handling and consistent logging/tracing enable faster incident response.
- Security and performance: Lightweight, well-scoped security (API keys, OAuth where appropriate) and performance tuning (compression, rate limiting) protect both the API and its users at scale.
- Testing as a first-class practice: Unit and integration tests guard contracts and help you refactor confidently.

In real systems, you’ll also connect to a database, implement repository patterns, adopt OpenAPI/Swagger for docs, and instrument with tracing (Jaeger/Zipkin) and metrics (Micrometer/Prometheus). The REST design patterns demonstrated here map directly to those larger ecosystems.

---

## Z. Study Questions — 5 recall questions

1. What naming convention and HTTP methods would you use for a typical CRUD resource in a REST API?
2. Why is returning 201 Created with a Location header preferable to returning 200 OK after creating a resource?
3. How does a layered approach with DTOs help protect internal domain models?
4. What is the purpose of a centralized error envelope (e.g., ApiResponse) in a REST API?
5. Name two common strategies for API versioning and one drawback of each.

---

## Exercise — a practical multi-part coding challenge

Part 1: Create a small Spring Boot REST service for a "Book" resource
- Implement an in-memory repository for books (id, title, author, isbn, price).
- Create Book, BookDTO, and BookController with CRUD endpoints:
  - GET /api/v1/books
  - GET /api/v1/books/{id}
  - POST /api/v1/books
  - PUT /api/v1/books/{id}
  - DELETE /api/v1/books/{id}
- Validate input on BookDTO (title non-empty, price non-negative).

Part 2: Add a standardized error envelope
- Introduce ApiResponse<T> and ApiError classes (as shown in Section 2).
- Create a GlobalExceptionHandler to map exceptions to ApiResponse errors.
- Ensure GET missing resource returns 404 with a meaningful error payload.

Part 3: Implement a simple security and rate-limiting layer
- Add an ApiKeyAuthFilter that requires a header X-API-Key with a known value.
- Add a naive per-IP rate limiter that returns 429 after a threshold for a short window.
- Enable response compression in application properties.

Part 4: Write a basic integration test
- Use Spring Boot Test + MockMvc to verify:
  - Creating a book returns 201 Created and a valid Location header.
  - Getting an existing book returns 200 and a valid JSON payload.
  - Getting a non-existent book returns 404 with a meaningful error.

Hints and tips
- Start with the code from Section 1 as your baseline REST controller and in-memory service.
- Build out ApiResponse and ApiError once your endpoints can fail; keep error handling centralized.
- Keep the API versioned in the URL (v1) during the exercise to avoid breaking changes.
- Use @Valid on request bodies to exercise the validation path in tests.

This lesson provided a structured, practical walkthrough of REST API design in Java, focusing on sound resource modeling, versioning strategies, error handling, security and performance considerations, testing, and common mistakes to avoid in real-world systems.