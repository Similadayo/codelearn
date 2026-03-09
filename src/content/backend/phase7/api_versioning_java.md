# API Versioning & Deprecation Strategies (Java)

In backend services, APIs evolve over time. Versioning gives you a safe, structured way to introduce changes without breaking existing clients. Deprecation strategies let you retire old behavior gracefully, with clear timelines, communication, and migration paths. This lesson covers practical approaches you can implement in Java (Spring Boot) to manage API versioning, negotiation, deprecation, and testing in real systems.

## 1. Versioning Strategies Overview

Versioning can be approached in several ways. Each approach has trade-offs in clarity, client impact, and routing complexity. Below are common strategies with concrete Java examples.

### Path-based versioning (v1)

```java
package com.example.api.v1;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {

    @GetMapping("/{id}")
    public UserV1 getUser(@PathVariable Long id) {
        return new UserV1(id, "Alice V1");
    }
}
```

```java
package com.example.api.v1;

public class UserV1 {
    private Long id;
    private String name;

    public UserV1(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    // getters
    public Long getId() { return id; }
    public String getName() { return name; }
}
```

### Path-based versioning (v2)

```java
package com.example.api.v2;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {

    @GetMapping("/{id}")
    public UserV2 getUser(@PathVariable Long id) {
        return new UserV2(id, "Alice V2", "alice@example.com");
    }
}
```

```java
package com.example.api.v2;

public class UserV2 {
    private Long id;
    private String name;
    private String email;

    public UserV2(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    // getters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}
```

### Media type versioning (content negotiation)

```java
package com.example.api.negotiation;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserControllerNegotiation {

    @GetMapping(value = "/{id}", produces = "application/vnd.company.app-v1+json")
    public UserV1 getUserV1(@PathVariable Long id) {
        return new UserV1(id, "Alice V1");
    }

    @GetMapping(value = "/{id}", produces = "application/vnd.company.app-v2+json")
    public UserV2 getUserV2(@PathVariable Long id) {
        return new UserV2(id, "Alice V2", "alice@example.com");
    }
}
```

```java
package com.example.api.negotiation;

public class UserV1 {
    private Long id;
    private String name;

    public UserV1(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
}
```

```java
package com.example.api.negotiation;

public class UserV2 {
    private Long id;
    private String name;
    private String email;

    public UserV2(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}
```

### Short note on tradeoffs

- Path-based versioning makes versions explicit in the URL and easy to observe in logs. It can lead to endpoint duplication.
- Header or media-type versioning keeps URLs stable but relies on client support for negotiation and can complicate routing.
- For large public APIs, consider a combination: path for major versions, header/negotiation for micro-versioning or feature-flagged behaviors.

### Line-by-line explanation breaking down each line

### Line-by-line explanation (path-based v1)

- Defines a REST controller in package com.example.api.v1.
- @RestController marks the class as a Spring MVC controller returning JSON.
- @RequestMapping("/api/v1/users") binds all methods to the v1 users path.
- @GetMapping("/{id}") maps GET requests for /api/v1/users/{id}.
- getUser returns a new UserV1 instance for the given id.
- UserV1 is a simple POJO with id and name fields and corresponding getters.

### Line-by-line explanation (path-based v2)

- Similar pattern but under com.example.api.v2 and /api/v2/users.
- getUser returns UserV2 with id, name, and email.

### Line-by-line explanation (negotiation)

- UserControllerNegotiation exposes a single path /api/users/{id}.
- Two methods differ by the produced content type:
  - Produces application/vnd.company.app-v1+json for v1 clients.
  - Produces application/vnd.company.app-v2+json for v2 clients.
- Client negotiates the version via Accept header.

## 2. Deprecation Lifecycle & Backward Compatibility

A solid deprecation strategy protects existing clients while encouraging migrations. This section shows how to mark endpoints as deprecated and communicate timelines.

```java
package com.example.api.v1;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@Deprecated(since = "2024-06-01", forRemoval = false)
public class UserControllerV1_Deprecated {

    @GetMapping("/{id}")
    public ResponseEntity<UserV1> getUser(@PathVariable Long id) {
        UserV1 user = new UserV1(id, "Alice V1");
        return ResponseEntity.ok()
            .header("Deprecation-Warning",
                    "Endpoint /api/v1/users/{id} will be removed after 2025-01-01. Please migrate to /api/v2/users/{id}.")
            .body(user);
    }
}
```

```java
package com.example.config;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.*;
import java.io.IOException;
import org.springframework.stereotype.Component;
import javax.servlet.Filter;

@Component
public class DeprecationHeaderFilter implements Filter {
    @Override
    public void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/")) {
            response.addHeader("Deprecation-Warning",
                    "This API version is deprecated and will be removed after 2025-01-01. Migrate to v2: /api/v2/users/{id}");
        }
        chain.doFilter(request, response);
    }
}
```

### Line-by-line explanation breaking down each line

- The first block defines a v1 controller marked deprecated via @Deprecated.
- The GET endpoint returns a 200 OK with a UserV1 payload.
- A Deprecation-Warning header communicates removal timing to clients.
- The DeprecationHeaderFilter inspects every request path starting with /api/v1/.
- If matched, it injects a Deprecation-Warning header before delegating to the rest of the filter chain.
- This provides a centralized, automated deprecation notice for all v1 consumers.

## 3. Version Negotiation & Routing in Spring Boot

A robust approach uses a resolver to determine the intended version from multiple signals (path, headers, Accept). The controller then delegates to the appropriate versioned payload.

```java
package com.example.api.versioning;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import java.io.IOException;

@Component
public class ApiVersionResolverFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String version = null;
        String path = request.getRequestURI();

        if (path.startsWith("/api/v1/")) version = "v1";
        else if (path.startsWith("/api/v2/")) version = "v2";
        else {
            String header = request.getHeader("X-API-Version");
            if (header != null) version = "v" + header;
            String accept = request.getHeader("Accept");
            if (accept != null && accept.contains("application/vnd.company.app-v2+json")) version = "v2";
        }

        request.setAttribute("API_VERSION", version != null ? version : "v1");
        filterChain.doFilter(request, response);
    }
}
```

```java
package com.example.api.versioning;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/users")
public class UserControllerNegotiated {

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(HttpServletRequest request, @PathVariable Long id) {
        String ver = (String) request.getAttribute("API_VERSION");
        if ("v1".equals(ver)) {
            UserV1 user = new UserV1(id, "Alice V1");
            return ResponseEntity.ok(user);
        } else {
            UserV2 user = new UserV2(id, "Alice V2", "alice@example.com");
            return ResponseEntity.ok(user);
        }
    }
}
```

```java
package com.example.api.versioning;

public class UserV1 {
    private Long id;
    private String name;
    public UserV1(Long id, String name) { this.id = id; this.name = name; }
    public Long getId() { return id; }
    public String getName() { return name; }
}
```

```java
package com.example.api.versioning;

public class UserV2 {
    private Long id;
    private String name;
    private String email;
    public UserV2(Long id, String name, String email) { this.id = id; this.name = name; this.email = email; }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}
```

### Line-by-line explanation breaking down each line

- ApiVersionResolverFilter extends OncePerRequestFilter to run once per request.
- doFilterInternal inspects the request URI, headers, and Accept to determine the target version.
- It sets a request attribute "API_VERSION" with the resolved version (default v1).
- UserControllerNegotiated reads the version from the request attribute and selects the appropriate payload class to return.
- This pattern centralizes version negotiation logic and cleanly separates versioned data models.

## 4. Deprecation Rituals: Roadmap, Notifications, and Client Communication

Beyond code, deprecation requires a documented policy, a clear removal date, and proactive client communication. The following approaches help operationalize this.

```java
package com.example.api.deprecation;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@Deprecated(since = "2024-06-01", forRemoval = true)
public class DeprecatedUserController {

    @GetMapping("/{id}")
    public UserV1 getUser(@PathVariable Long id) {
        // Endpoint logic remains for the deprecation window
        return new UserV1(id, "Deprecated User V1");
    }
}
```

```java
package com.example.api.deprecation;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class DeprecatedUserControllerWithBanner {

    @GetMapping("/{id}")
    public ResponseEntity<UserV1> getUser(@PathVariable Long id) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Deprecation-Warning",
                "Endpoint /api/v1/users/{id} will be removed after 2025-01-01. Migrate to /api/v2/users/{id}.");
        return ResponseEntity.ok().headers(headers).body(new UserV1(id, "Deprecated User V1"));
    }
}
```

```java
package com.example.api.deprecation;

import org.springframework.stereotype.Component;
import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class DeprecationBannerInterceptor implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/")) {
            response.addHeader("Deprecation-Warning",
                    "v1 is deprecated and will be removed after 2025-01-01. Please migrate to v2.");
        }
        chain.doFilter(req, res);
    }
}
```

### Line-by-line explanation breaking down each line

- The first snippet marks a v1 endpoint as deprecated with @Deprecated and indicates it should be removed in the future.
- The second snippet adds a Deprecation-Warning header to the v1 response, signaling clients to migrate.
- The third snippet implements a Filter that automatically injects a Deprecation-Warning header for all v1 endpoints, centralizing the messaging.
- Together, these demonstrate a multi-layer approach: policy annotation, explicit client-facing banners, and automated headers for broad visibility.

## 5. Testing Versioned APIs

Tests ensure you preserve compatibility and properly negotiate versions.

```java
package com.example.api.versioning;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ApiVersioningTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void v1PathVersionReturnsV1() throws Exception {
        mockMvc.perform(get("/api/v1/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice V1"));
    }

    @Test
    void v2PathVersionReturnsV2() throws Exception {
        mockMvc.perform(get("/api/v2/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void negotiationV1ViaAcceptHeader() throws Exception {
        mockMvc.perform(
                get("/api/users/1")
                    .header("Accept", "application/vnd.company.app-v1+json"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice V1"));
    }

    @Test
    void negotiationV2ViaAcceptHeader() throws Exception {
        mockMvc.perform(
                get("/api/users/1")
                    .header("Accept", "application/vnd.company.app-v2+json"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("alice@example.com"));
    }
}
```

### Line-by-line explanation breaking down each line

- The tests bootstrap a Spring Boot test context with MockMvc to simulate HTTP requests.
- v1PathVersionReturnsV1 asserts the v1 path returns the v1 payload structure.
- v2PathVersionReturnsV2 asserts the v2 path returns the v2 payload structure.
- negotiationV1ViaAcceptHeader and negotiationV2ViaAcceptHeader verify content negotiation via the Accept header.
- These tests validate both routing strategies and prevent regressions during refactors.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Mixing versions on a single endpoint without clear routing or deprecation policy.
  - Bad:
    ```java
    @RestController
    @RequestMapping("/api/users")
    public class UserController {
        @GetMapping("/{id}")
        public Object getUser(@PathVariable Long id) {
            // naive: returns V1 data structure for all clients
            return new UserV1(id, "Alice");
        }
    }
    ```
  - Good:
    ```java
    @RestController
    @RequestMapping("/api/v1/users")
    public class UserControllerV1 {
        @GetMapping("/{id}")
        public UserV1 getUser(@PathVariable Long id) { return new UserV1(id, "Alice"); }
    }

    @RestController
    @RequestMapping("/api/v2/users")
    public class UserControllerV2 {
        @GetMapping("/{id}")
        public UserV2 getUser(@PathVariable Long id) { return new UserV2(id, "Alice", "alice@example.com"); }
    }
    ```

- Mistake 2: Dropping breaking changes without a deprecation window.
  - Bad:
    ```java
    @GetMapping("/api/v1/users/{id}")
    public UserV1 getUser(@PathVariable Long id) { return new UserV1(id, "Alice"); } // immediately removed
    ```
  - Good:
    ```java
    @Deprecated(since = "2024-06-01", forRemoval = true)
    @GetMapping("/api/v1/users/{id}")
    public UserV1 getUser(@PathVariable Long id) { 
        // keep for a defined deprecation window
        return new UserV1(id, "Alice"); 
    }
    // Migration path: /api/v2/users/{id}
    ```

- Mistake 3: Not communicating deprecation to clients or lacking observable signals.
  - Bad:
    ```java
    // Silent removal without notice
    @GetMapping("/api/v1/users/{id}")
    public UserV1 getUser(@PathVariable Long id) { return new UserV1(id, "Alice"); }
    ```
  - Good:
    ```java
    @GetMapping("/api/v1/users/{id}")
    public ResponseEntity<UserV1> getUser(@PathVariable Long id) {
        HttpHeaders h = new HttpHeaders();
        h.add("Deprecation-Warning", "v1 will be removed 2025-01-01; migrate to /api/v2/users/{id}");
        return new ResponseEntity<>(new UserV1(id, "Alice"), h, HttpStatus.OK);
    }
    ```

- Mistake 4: Not testing versioned endpoints or migration paths.
  - Bad: Only testing a single version or path.
  - Good: Test all version paths and negotiation scenarios (as shown in Section 5).

- Mistake 5: Relying solely on client-side feature flags without server-side controls.
  - Bad: Customers depend only on client libraries to switch versions.
  - Good: Enforce strict version negotiation at server boundary, publish a deprecation policy, and provide clear migration docs and tooling.

## Y. Why This Matters In Real Systems

- Client stability: External clients and internal services depend on predictable contracts. Versioning minimizes breaking changes and preserves trust with partners.
- Release trains and migration: Structured deprecation windows allow teams to plan migrations with minimum disruption, coordinating across teams.
- Observability and governance: Version metadata in logs, metrics, and OpenAPI specs improves discoverability, automation, and compliance.
- Microservice ecosystems: In a distributed environment, consistent versioning and negotiation reduce coupling between services and enable safer rollouts.
- Developer experience: Clear migration paths, deprecation notices, and test coverage accelerate onboarding and reduce tech debt.

## Z. Study Questions — 5 recall questions

1. What are the main differences between path-based versioning and header/media-type versioning?
2. How can you communicate deprecation to clients in a machine-readable and human-friendly way?
3. Describe a simple server-side approach to version negotiation that supports path, header, and Accept-based negotiation.
4. Why is a deprecation window important for production systems, and what are typical durations?
5. How would you structure tests to ensure both v1 and v2 endpoints behave correctly over time?

## Exercise — Practical multi-part coding challenge

Goal: Build a minimal Spring Boot project that demonstrates three core aspects: path-based versioning, content-negotiation-based versioning, and a deprecation mechanism with tests.

Part A: Project scaffolding
- Create a Spring Boot project (dependencies: spring-boot-starter-web, spring-boot-starter-test).
- Define a clean package structure:
  - com.example.api.v1 (UserControllerV1, UserV1)
  - com.example.api.v2 (UserControllerV2, UserV2)
  - com.example.api.negotiation (UserControllerNegotiation, UserV1, UserV2)
  - com.example.config (ApiVersionResolverFilter)

Part B: Implement versioned endpoints
- Implement path-based v1 and v2 endpoints:
  - GET /api/v1/users/{id} -> UserV1
  - GET /api/v2/users/{id} -> UserV2
- Implement content-negotiation endpoints:
  - GET /api/users/{id} with Accept header of:
    - application/vnd.company.app-v1+json -> UserV1
    - application/vnd.company.app-v2+json -> UserV2
- Implement a simple in-process deprecation banner for v1 using a header DEPRECATION-WARNING and a @Deprecated annotation.

Part C: Version negotiation
- Add ApiVersionResolverFilter (as shown in Section 3) to resolve the version from path prefixes or headers.
- Create a single handler for negotiation that returns the appropriate version payload based on the resolved version.

Part D: Deprecation policy
- Add a DeprecationHeaderFilter (or similar) to emit a deprecation warning header for /api/v1/* endpoints.
- Ensure the removal date, migration path, and guidance are explicit in the header content.

Part E: Tests
- Write JUnit 5 tests (SpringBootTest + MockMvc) to verify:
  - v1 and v2 path-based endpoints return expected structures.
  - Content negotiation paths with Accept header return the correct versions.
  - Deprecation headers appear for v1 endpoints.

Part F: Reflection questions
- Explain how the version negotiation filter decouples version resolution from business logic.
- Discuss the pros/cons of path-based vs content-negotiation versioning in a multi-team environment.
- Propose a simple OpenAPI/Swagger annotation strategy to reflect versioned endpoints and deprecation plans.

Acceptance criteria
- At least one concrete example of each versioning strategy (path, negotiation, and deprecation messaging) is present.
- The code demonstrates backwards compatibility with a deprecation window and a migration path.
- Automated tests cover both versioned endpoints and negotiation behavior.
- Clear documentation is present in code comments and in the study questions/notes.

If you want, I can provide a ready-to-run Maven or Gradle project structure with all the pieces wired up and a short README explaining how to run the app and tests.