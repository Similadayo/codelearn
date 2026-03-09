# Track: Backend Engineering — Phase 4 — Building Web Servers: Input Validation — Never Trust User Input

Input validation is the first line of defense in any backend system. It ensures that data coming from clients, third-party services, or edge devices conforms to the shapes, types, and rules your application expects. Proper validation prevents security vulnerabilities (like SQL injection, XSS, and command injection), protects business invariants, reduces runtime errors, and improves reliability and user experience. This lesson uses Java to illustrate practical, production-ready patterns for validating input at the API boundary and across layers of a web server.

## 1. Basic Input Validation Techniques

In this section, you’ll see straightforward, manual validation patterns that run at the API boundary. We’ll start with a small validator class that checks basic rules for username, email, and age.

```java
package com.example.validation;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public class InputValidator {
  private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,20}$");
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
  
  public static boolean isValidUsername(String username) {
    if (username == null) return false;
    String t = username.trim();
    return USERNAME_PATTERN.matcher(t).matches();
  }

  public static boolean isValidEmail(String email) {
    if (email == null) return false;
    String e = email.trim();
    return EMAIL_PATTERN.matcher(e).matches();
  }

  public static boolean isValidAge(Integer age) {
    if (age == null) return false;
    return age >= 13 && age <= 120;
  }

  public static boolean isUserInputValid(String username, String email, Integer age) {
    return isValidUsername(username) && isValidEmail(email) && isValidAge(age);
  }

  public static void main(String[] args) {
    String u = "Alice_01";
    String e = "alice@example.com";
    Integer a = 30;

    System.out.println("Is valid: " + isUserInputValid(u, e, a)); // expect true
  }
}
```

### Line-by-line explanation
- Line 1: Declares the package for organization and reuse.
- Line 4: Declares a constant pattern for usernames (3-20 chars, alphanumeric or underscore).
- Line 5: Declares a constant pattern for emails (basic local+domain pattern; not RFC-complete but sufficient for demonstration).
- Lines 7-9: isValidUsername checks null, trims whitespace, and tests against the username pattern.
- Lines 11-14: isValidEmail checks null, trims whitespace, and tests against the email pattern.
- Lines 16-19: isValidAge ensures age is provided and within a reasonable range (13–120).
- Lines 21-22: isUserInputValid combines the three validators.
- Lines 24-29: A simple main method demonstrating a valid input scenario and printing the result.

## 2. Validating Boundaries, Formats, and Whitelisting

Beyond basic type checks, real endpoints enforce format rules, length constraints, and allowlists to reject unsupported data early. This example demonstrates a single validation method for a user registration scenario with multiple checks, including a whitelist (allowed countries) and password strength.

```java
package com.example.validation;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

public class RegistrationValidator {
  private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,20}$");
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
  private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{8,32}$");
  private static final Set<String> ALLOWED_COUNTRIES = new HashSet<>(Arrays.asList("US","CA","GB","AU","IN"));

  public static boolean validateRegistration(String username, String email, String country, String password) {
    if (username == null || !USERNAME_PATTERN.matcher(username).matches()) return false;
    if (email == null || !EMAIL_PATTERN.matcher(email).matches()) return false;
    if (country == null || !ALLOWED_COUNTRIES.contains(country)) return false;
    if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) return false;
    return true;
  }

  public static void main(String[] args) {
    String username = "User_123";
    String email = "user123@example.com";
    String country = "US";
    String password = "Password1";

    System.out.println("Registration valid? " + validateRegistration(username, email, country, password));
  }
}
```

### Line-by-line explanation
- Line 1: Package declaration for organization.
- Line 5: Username pattern enforces 3–20 chars, alphanumeric/underscore.
- Line 6: Email pattern checks common email shape.
- Line 7: Password pattern requires at least one letter and one digit, 8–32 chars, allowing common special chars.
- Lines 8-9: ALLOWED_COUNTRIES is a simple allowlist for demonstration.
- Lines 11-19: validateRegistration returns false on any invalid field; otherwise true.
- Lines 21-28: Demo main method showing a valid input set and result.

## 3. Validating JSON Payloads with Bean Validation (JSR 380)

Java Bean Validation (via Hibernate Validator) provides declarative validation using annotations. This reduces boilerplate and centralizes rules. The following example shows a DTO with constraints and a minimal Spring-like controller snippet to demonstrate usage.

```java
package com.example.validation;

import javax.validation.constraints.*;

public class UserRegistrationDTO {
  @NotBlank(message = "username is required")
  @Size(min = 3, max = 20, message = "username must be 3-20 chars")
  @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "username can only contain letters, numbers, and underscore")
  private String username;

  @NotBlank(message = "email is required")
  @Email(message = "invalid email address")
  private String email;

  @NotNull(message = "age is required")
  @Min(value = 13, message = "minimum age is 13")
  @Max(value = 120, message = "maximum age is 120")
  private Integer age;

  @NotBlank(message = "password is required")
  @Size(min = 8, max = 32, message = "password must be 8-32 chars")
  private String password;

  // Getters and setters (omitted for brevity)
  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public Integer getAge() { return age; }
  public void setAge(Integer age) { this.age = age; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
}
```

```java
package com.example.validation;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class RegistrationControllerJSR380 {
  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody UserRegistrationDTO dto, BindingResult br) {
    if (br.hasErrors()) {
      List<String> errors = br.getFieldErrors().stream()
          .map(e -> e.getField() + ": " + e.getDefaultMessage())
          .collect(Collectors.toList());
      return ResponseEntity.badRequest().body(errors);
    }
    // Proceed to service layer
    return ResponseEntity.ok("Registration accepted for user: " + dto.getUsername());
  }
}
```

### Line-by-line explanation
- DTO class imports javax.validation.constraints.* to apply constraints.
- Each field is annotated with validations:
  - username: NotBlank, length 3–20, pattern restricts characters.
  - email: NotBlank and Email pattern validation.
  - age: NotNull with Min/Max bounds.
  - password: NotBlank and length bounds for basic strength.
- Getters/setters provide access to fields.
- Controller imports Spring MVC annotations and validation support.
- register method uses @Valid to trigger bean validation on the incoming DTO.
- If there are errors, the BindingResult is inspected to produce a readable error list.
- On success, a placeholder response is returned (replace with real service call).

## 4. Secure Data Handling: Database Interaction with Prepared Statements

Validating input at the API boundary is essential, but you must also secure downstream data handling. This example contrasts unsafe string concatenation with safe prepared statements in JDBC.

Bad: vulnerable to SQL injection because user input is concatenated into SQL.

```java
import java.sql.Connection;
import java.sql.Statement;

public class UnsafeJdbcExample {
  public static void insertUser(Connection conn, String username, String email, int age) throws Exception {
    String sql = "INSERT INTO users (username, email, age) VALUES ('"
        + username + "', '"
        + email + "', "
        + age + ")";
    try (Statement stmt = conn.createStatement()) {
      stmt.executeUpdate(sql);
    }
  }
}
```

Good: uses PreparedStatement with parameter placeholders to prevent injection and type-safely bind values.

```java
import java.sql.Connection;
import java.sql.PreparedStatement;

public class SafeJdbcExample {
  public static void insertUser(Connection conn, String username, String email, int age) throws Exception {
    String sql = "INSERT INTO users (username, email, age) VALUES (?, ?, ?)";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
      ps.setString(1, username);
      ps.setString(2, email);
      ps.setInt(3, age);
      ps.executeUpdate();
    }
  }
}
```

### Line-by-line explanation
- Bad example:
  - Line 1-3: Standard JDBC classes are imported.
  - Line 5: Builds an SQL string by directly embedding user input, creating a SQL injection risk.
  - Lines 6-11: Creates a Statement and executes the concatenated SQL.
- Good example:
  - Line 1-2: Imports JDBC classes used for parameterized queries.
  - Line 4: SQL uses placeholders (?, ?, ?) for values.
  - Line 5-9: Prepares the statement, binds values with setString and setInt, and executes safely.
  - Line 10: The try-with-resources ensures the PreparedStatement is closed.

## X. Common Beginner Mistakes

1) Side-stepping server-side validation by relying only on client-side checks
- Bad:
```java
// Client sends validation-only checks; server trusts client
String username = request.getParameter("username");
// Assume client-side checks passed
```
- Good:
```java
// Server-side validation performed fully
String username = request.getParameter("username");
if (!InputValidator.isValidUsername(username)) {
  response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid username");
  return;
}
```

2) Overly strict or brittle regex that rejects valid inputs
- Bad:
```java
// Username must match a very long, fragile regex
username.matches("^(?!.*__)(?=.{3,20}$)(?!.*\\.$)[A-Za-z0-9_.]+$")
```
- Good:
```java
// Clear, documented rules with simple patterns; use compile-time constants
private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_]{3,20}$");
```

3) Nulls and empties not handled consistently
- Bad:
```java
if (username.length() < 3) { ... } // NPE if username is null
```
- Good:
```java
if (username == null || username.trim().isEmpty()) { ... }
```

4) Mixing concerns: validation logic sprinkled across layers
- Bad: Validation logic scattered in controllers, services, and repositories.
- Good: Centralize core validation rules (e.g., in a dedicated validator or DTO annotations) and reuse across layers.

## Y. Why This Matters In Real Systems

- Security: Proper input validation dramatically reduces attack surface (SQL injection, XSS, path traversal) and prevents attackers from co-lming payloads that exploit weak assumptions.
- Reliability: Guardrails at the boundary prevent bad data from causing exceptions later in the stack, reducing bugs and outages.
- Compliance and Auditing: Validation rules enforce business constraints (age, consent, data formats) that may be required by policies, regulations, or contracts.
- User Experience: Clear, actionable error messages help clients correct issues quickly and reduce support overhead.
- Performance: Early rejection of invalid data avoids unnecessary processing, database lookups, and I/O.

## Z. Study Questions

1) What is the difference between trusting client-side validation and enforcing server-side validation?
2) Name at least two common data format or content validation patterns you should apply at the API boundary.
3) What are the benefits of using prepared statements over string concatenation for database operations?
4) How do Bean Validation annotations reduce boilerplate in Java web apps?
5) Why is input validation important for both security and business rule enforcement?

## Exercise

Part A: Define a validation-enabled registration flow using Spring Boot with a DTO and a controller.

- Create a Spring Boot project (or provide equivalent Maven/Gradle snippet) and add Hibernate Validator on the classpath.
- Implement UserRegistrationDTO with the following fields and constraints:
  - username: NotBlank, 3–20 chars, alphanumeric/underscore only
  - email: NotBlank, valid email format
  - age: NotNull, between 13 and 120
  - password: NotBlank, 8–32 chars
- Implement a RegistrationController with a POST /register endpoint that accepts the DTO, validates it (using @Valid), and returns:
  - 400 with validation errors if any constraint is violated
  - 200 with a success message if valid

Part B: Add a simple in-memory repository and service to simulate persistence and business rules.

- Create a UserRepository with an in-memory Map<String, User> keyed by username.
- Create a RegistrationService that:
  - Checks for username uniqueness
  - On success, stores the UserDTO (or a User entity) in the repository
  - Returns an appropriate response (success or 409 Conflict if username exists)
- Wire the service into the controller (e.g., via constructor injection).

Part C: Testing and verification examples

- Provide curl commands to test:
  - Valid payload
  - Invalid payload (e.g., short username, bad email, age out of range)
  - Duplicate username (to trigger 409)
- Expected outcomes:
  - 200 with a success message for a valid payload
  - 400 with a list of field errors for invalid payload
  - 409 when attempting to register an already-taken username

Code scaffolding (Spring-like snippets to copy-paste)

UserRegistrationDTO.java
```java
package com.example.demo.dto;

import javax.validation.constraints.*;

public class UserRegistrationDTO {
  @NotBlank(message = "username is required")
  @Size(min = 3, max = 20, message = "username must be 3-20 characters")
  @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "username can only contain letters, numbers, or underscore")
  private String username;

  @NotBlank(message = "email is required")
  @Email(message = "invalid email address")
  private String email;

  @NotNull(message = "age is required")
  @Min(value = 13, message = "minimum age is 13")
  @Max(value = 120, message = "maximum age is 120")
  private Integer age;

  @NotBlank(message = "password is required")
  @Size(min = 8, max = 32, message = "password must be 8-32 characters")
  private String password;

  // Getters and setters
  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public Integer getAge() { return age; }
  public void setAge(Integer age) { this.age = age; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
}
```

RegistrationController.java
```java
package com.example.demo.controller;

import com.example.demo.dto.UserRegistrationDTO;
import com.example.demo.service.RegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class RegistrationController {
  private final RegistrationService service;

  public RegistrationController(RegistrationService service) {
    this.service = service;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody UserRegistrationDTO dto, BindingResult br) {
    if (br.hasErrors()) {
      String errors = br.getFieldErrors().stream()
          .map(e -> e.getField() + ": " + e.getDefaultMessage())
          .collect(Collectors.joining("; "));
      return ResponseEntity.badRequest().body(errors);
    }

    String result = service.register(dto);
    if ("DUPLICATE".equals(result)) {
      return ResponseEntity.status(409).body("Username already exists");
    }
    return ResponseEntity.ok("Registration successful for user: " + dto.getUsername());
  }
}
```

RegistrationService.java
```java
package com.example.demo.service;

import com.example.demo.dto.UserRegistrationDTO;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class RegistrationService {
  private final Map<String, UserRegistrationDTO> userStore = new ConcurrentHashMap<>();

  public String register(UserRegistrationDTO dto) {
    String username = dto.getUsername();
    if (userStore.containsKey(username)) {
      return "DUPLICATE";
    }
    userStore.put(username, dto);
    return "OK";
  }
}
```

In addition, you can add a small test script or Postman collection to verify responses, and expand the repository to a real database in later modules.

If you’d like, I can tailor these examples to a specific Java framework you’re using (Spring Boot, Micronaut, Quarkus) and provide a runnable Maven/Gradle project layout.