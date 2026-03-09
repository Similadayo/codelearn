# Error Handling in APIs — Consistent Responses in Java (Backend Engineering, Phase 4: Building Web Servers)

Compelling introductory paragraph:
Error handling in APIs is more than just returning a status code. It’s about creating a predictable, machine-readable contract so clients—whether web apps, mobile apps, or other services—can gracefully handle failures, surface actionable messages to users, and log meaningful context for operators. In high-scale backends, consistent responses reduce debugging time, improve customer experience, and enable automated tooling (telemetry, tracing, and alerting) to triage issues quickly. This lesson focuses on building and enforcing consistent error responses in Java, with practical Spring Boot patterns, validation feedback, RFC 7807 compatibility, and observability best practices.

## 1. Establishing a Consistent Error Response Contract

In a modern API, every error should adhere to a single shape to make it easy for clients to parse, display, or react to. This section shows a minimal, language-agnostic contract implemented in Java with a standard ErrorResponse, a small enum for error codes, a domain exception class, and a global exception handler that translates exceptions into the contract.

```java
// File: src/main/java/com/example/api/dto/ErrorResponse.java
package com.example.api.dto;

import java.time.OffsetDateTime;
import java.util.List;

public class ErrorResponse {
  private int status;
  private String error;
  private String message;
  private String path;
  private OffsetDateTime timestamp;
  private List<ValidationError> errors;

  public ErrorResponse() {}

  public ErrorResponse(int status, String error, String message, String path,
                       OffsetDateTime timestamp, List<ValidationError> errors) {
    this.status = status;
    this.error = error;
    this.message = message;
    this.path = path;
    this.timestamp = timestamp;
    this.errors = errors;
  }

  // Getters and setters
  public int getStatus() { return status; }
  public void setStatus(int status) { this.status = status; }

  public String getError() { return error; }
  public void setError(String error) { this.error = error; }

  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }

  public String getPath() { return path; }
  public void setPath(String path) { this.path = path; }

  public OffsetDateTime getTimestamp() { return timestamp; }
  public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }

  public List<ValidationError> getErrors() { return errors; }
  public void setErrors(List<ValidationError> errors) { this.errors = errors; }
}
```

```java
// File: src/main/java/com/example/api/dto/ValidationError.java
package com.example.api.dto;

public class ValidationError {
  private String field;
  private String message;

  public ValidationError() {}

  public ValidationError(String field, String message) {
    this.field = field;
    this.message = message;
  }

  public String getField() { return field; }
  public void setField(String field) { this.field = field; }

  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
}
```

```java
// File: src/main/java/com/example/api/exception/ApiErrorCode.java
package com.example.api.exception;

public enum ApiErrorCode {
  BAD_REQUEST(400, "Bad Request"),
  NOT_FOUND(404, "Not Found"),
  UNAUTHORIZED(401, "Unauthorized"),
  FORBIDDEN(403, "Forbidden"),
  CONFLICT(409, "Conflict"),
  INTERNAL_ERROR(500, "Internal Server Error");

  private final int status;
  private final String defaultMessage;

  ApiErrorCode(int status, String defaultMessage) {
    this.status = status;
    this.defaultMessage = defaultMessage;
  }

  public int getStatus() { return status; }
  public String getDefaultMessage() { return defaultMessage; }
}
```

```java
// File: src/main/java/com/example/api/exception/ApiException.java
package com.example.api.exception;

public class ApiException extends RuntimeException {
  private final ApiErrorCode code;

  public ApiException(ApiErrorCode code, String message) {
    super(message);
    this.code = code;
  }

  public ApiErrorCode getCode() { return code; }
}
```

```java
// File: src/main/java/com/example/api/exception/GlobalExceptionHandler.java
package com.example.api.exception;

import com.example.api.dto.ErrorResponse;
import com.example.api.dto.ValidationError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;

import javax.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
    ApiErrorCode code = ex.getCode();

    ErrorResponse er = new ErrorResponse(
        code.getStatus(),
        code.name(),
        ex.getMessage(),
        request.getRequestURI(),
        OffsetDateTime.now(),
        null
    );

    return new ResponseEntity<>(er, HttpStatus.valueOf(code.getStatus()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<ValidationError> errors = ex.getBindingResult().getFieldErrors().stream()
        .map(f -> new ValidationError(f.getField(), f.getDefaultMessage()))
        .collect(Collectors.toList());

    ErrorResponse er = new ErrorResponse(
        HttpStatus.BAD_REQUEST.value(),
        ApiErrorCode.BAD_REQUEST.name(),
        "Validation failed",
        request.getRequestURI(),
        OffsetDateTime.now(),
        errors
    );

    return new ResponseEntity<>(er, HttpStatus.BAD_REQUEST);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleUnknown(Exception ex, HttpServletRequest request) {
    // In production, log the exception with correlation ID, etc.
    ErrorResponse er = new ErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        ApiErrorCode.INTERNAL_ERROR.name(),
        "An unexpected error occurred",
        request.getRequestURI(),
        OffsetDateTime.now(),
        null
    );
    return new ResponseEntity<>(er, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
```

```java
// File: src/main/java/com/example/api/controller/BookController.java
package com.example.api.controller;

import com.example.api.exception.ApiErrorCode;
import com.example.api.exception.ApiException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/books")
public class BookController {

  // Imagine a service is injected and used here
  @GetMapping("/{id}")
  public String getBook(@PathVariable String id) {
    // Simulated not found condition
    boolean found = false;
    if (!found) {
      throw new ApiException(ApiErrorCode.NOT_FOUND, "Book not found with id " + id);
    }
    return "Book details";
  }
}
```

### Line-by-line explanation
- The ErrorResponse class defines a stable payload for all API errors, including status, a short error code, a human-readable message, the request path, a timestamp, and optional field-level errors.
- ValidationError models a single field error (e.g., which field failed and why).
- ApiErrorCode enumerates common HTTP-like statuses with human-friendly default messages, to standardize error code interpretation on clients.
- ApiException is a runtime exception that carries an ApiErrorCode and a message.
- GlobalExceptionHandler translates ApiException into a structured ErrorResponse, embedding status, code, and messages. It also handles Spring’s validation errors via MethodArgumentNotValidException, producing a list of ValidationError items.
- The BookController demonstrates throwing an ApiException when a resource isn’t found, ensuring a consistent error payload across the API.

## 2. Validation Errors and Field-Level Feedback

Validation errors are a common source of API failures. Clients benefit from knowing exactly which field failed and why. This section shows a DTO with javax.validation annotations, and how the global handler surfaces field-level validation details in the error response.

```java
// File: src/main/java/com/example/api/dto/UserRequest.java
package com.example.api.dto;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class UserRequest {

  @NotBlank(message = "Name must not be blank")
  @Size(min = 3, max = 50, message = "Name must be between 3 and 50 characters")
  private String name;

  @Email(message = "Email should be valid")
  @NotBlank(message = "Email must not be blank")
  private String email;

  public UserRequest() {}

  public UserRequest(String name, String email) {
    this.name = name;
    this.email = email;
  }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
}
```

```java
// File: src/main/java/com/example/api/controller/UserController.java
package com.example.api.controller;

import com.example.api.dto.UserRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/users")
public class UserController {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public String createUser(@Valid @RequestBody UserRequest request) {
    // In a real app, persist the user and return the created resource ID or representation
    return "user-created";
  }
}
```

### Line-by-line explanation
- UserRequest defines two fields with validation annotations: name must be non-blank and 3-50 chars; email must be a valid email and not blank.
- UserController exposes a POST /users endpoint. The @Valid annotation triggers Spring Validation on the request body. If validation fails, MethodArgumentNotValidException is thrown and GlobalExceptionHandler formats a detailed error payload including per-field issues.
- If validation passes, the method would continue to create the user; here it returns a placeholder string for demonstration.

## 3. RFC 7807 Problem Details vs Custom Error Response

RFC 7807 defines a standard “Problem Details” format for machine-readable error information. This section demonstrates how to surface errors as Problem Details, alongside our internal ErrorResponse, and how to set the appropriate content type.

```java
// File: src/main/java/com/example/api/model/ProblemDetails.java
package com.example.api.model;

public class ProblemDetails {
  private String type;
  private String title;
  private int status;
  private String detail;
  private String instance;
  private String traceId;

  public ProblemDetails() {}

  public ProblemDetails(String type, String title, int status, String detail,
                        String instance, String traceId) {
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.traceId = traceId;
  }

  public String getType() { return type; }
  public void setType(String type) { this.type = type; }

  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }

  public int getStatus() { return status; }
  public void setStatus(int status) { this.status = status; }

  public String getDetail() { return detail; }
  public void setDetail(String detail) { this.detail = detail; }

  public String getInstance() { return instance; }
  public void setInstance(String instance) { this.instance = instance; }

  public String getTraceId() { return traceId; }
  public void setTraceId(String traceId) { this.traceId = traceId; }
}
```

```java
// File: src/main/java/com/example/api/exception/ProblemDetailsExceptionHandler.java
package com.example.api.exception;

import com.example.api.model.ProblemDetails;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import javax.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class ProblemDetailsExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ProblemDetails> handleApiException(ApiException ex, HttpServletRequest request) {
    String traceId = MDC.get("requestId");

    ApiErrorCode code = ex.getCode();
    ProblemDetails pd = new ProblemDetails(
        "about:blank",
        code.getDefaultMessage(),
        code.getStatus(),
        ex.getMessage(),
        request.getRequestURI(),
        traceId
    );

    return ResponseEntity.status(code.getStatus())
        .header("Content-Type", "application/problem+json")
        .body(pd);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetails> handleUnknown(Exception ex, HttpServletRequest request) {
    String traceId = MDC.get("requestId");
    ProblemDetails pd = new ProblemDetails(
        "about:blank",
        "Internal Server Error",
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        "An unexpected error occurred",
        request.getRequestURI(),
        traceId
    );
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .header("Content-Type", "application/problem+json")
        .body(pd);
  }
}
```

```java
// File: src/main/java/com/example/api/controller/DemoProblemController.java
package com.example.api.controller;

import com.example.api.exception.ApiException;
import com.example.api.exception.ApiErrorCode;
import com.example.api.model.ProblemDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/demo-problem")
public class DemoProblemController {

  @GetMapping("/not-found")
  public void notFound(HttpServletRequest req) {
    throw new ApiException(ApiErrorCode.NOT_FOUND, "Demo resource not found");
  }
}
```

### Line-by-line explanation
- ProblemDetails models the RFC 7807 shape with type, title, status, detail, instance, and an optional traceId for correlation.
- ProblemDetailsExceptionHandler converts ApiException results into a RFC 7807 Problem Details payload and sets Content-Type to application/problem+json, as recommended by the RFC.
- The handler for unknown exceptions provides a safe, generic Problem Details payload without leaking internals.
- The DemoProblemController demonstrates how a routed endpoint would trigger a Problem Details response through an exception.

Note: If you prefer to continue using the internal ErrorResponse contract everywhere, you can keep the first approach. The RFC 7807 pattern is optional but widely supported and can improve interoperability with clients and gateways that expect Problem Details.

## 4. Observability: Correlation IDs, Logging, and Security Considerations

Production APIs benefit from consistent correlation identifiers, structured logging, and avoiding leakage of internal details. This section shows how to attach a request-scoped ID, propagate it to logs, and surface it to clients for easier troubleshooting.

```java
// File: src/main/java/com/example/api/filter/RequestIdFilter.java
package com.example.api.filter;

import org.springframework.stereotype.Component;
import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;

@Component
public class RequestIdFilter implements Filter {

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    String id = UUID.randomUUID().toString();
    MDC.put("requestId", id);

    HttpServletResponse httpResponse = (HttpServletResponse) response;
    httpResponse.addHeader("X-Request-Id", id);

    try {
      chain.doFilter(request, response);
    } finally {
      MDC.remove("requestId");
    }
  }
}
```

```java
// File: src/main/java/com/example/api/exception/GlobalExceptionHandler.java
package com.example.api.exception;

import com.example.api.dto.ErrorResponse;
import com.example.api.dto.ValidationError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;

import javax.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
    ApiErrorCode code = ex.getCode();

    ErrorResponse er = new ErrorResponse(
        code.getStatus(),
        code.name(),
        ex.getMessage(),
        request.getRequestURI(),
        OffsetDateTime.now(),
        null
    );

    return new ResponseEntity<>(er, HttpStatus.valueOf(code.getStatus()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<ValidationError> errors = ex.getBindingResult().getFieldErrors().stream()
        .map(f -> new ValidationError(f.getField(), f.getDefaultMessage()))
        .collect(Collectors.toList());

    ErrorResponse er = new ErrorResponse(
        HttpStatus.BAD_REQUEST.value(),
        ApiErrorCode.BAD_REQUEST.name(),
        "Validation failed",
        request.getRequestURI(),
        OffsetDateTime.now(),
        errors
    );

    return new ResponseEntity<>(er, HttpStatus.BAD_REQUEST);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleUnknown(Exception ex, HttpServletRequest request) {
    // Log with correlation id for tracing
    String trace = MDC.get("requestId");
    logger.error("Unhandled exception (trace={})", trace, ex);

    ErrorResponse er = new ErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        ApiErrorCode.INTERNAL_ERROR.name(),
        "An unexpected error occurred",
        request.getRequestURI(),
        OffsetDateTime.now(),
        null
    );
    return new ResponseEntity<>(er, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
```

### Line-by-line explanation
- RequestIdFilter generates a unique ID per incoming request, stores it in the MDC (mapped diagnostic context) for structured logging, and exposes it to clients via X-Request-Id header.
- The GlobalExceptionHandler uses the request-scoped trace to enrich logs when exceptions occur, improving post-incident analysis.
- In the general exception handler, we log with the traceId, but we still return a generic message to avoid leaking sensitive info.
- The combination of correlation IDs and consistent error payloads enables precise cross-service tracing in distributed systems.

## X. Common Beginner Mistakes — 3+ Real Pitfalls

Bad vs Good examples with side-by-side corrections.

1) Pitfall: Swallowing or leaking too much information
- Bad:
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<String> handleAll(Exception ex) {
  // Very risky: exposes stack trace
  return ResponseEntity.status(500).body(ex.toString());
}
```
- Good:
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleAll(Exception ex, HttpServletRequest req) {
  // Do not expose internal details; log the exception for ops
  logger.error("Unexpected error: {}", req.getRequestURI(), ex);
  ErrorResponse er = new ErrorResponse(500, "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred. Please try again later.", req.getRequestURI(), OffsetDateTime.now(), null);
  return new ResponseEntity<>(er, HttpStatus.INTERNAL_SERVER_ERROR);
}
```

2) Pitfall: Not using specific exceptions; catching generic ones
- Bad:
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleAll(Exception ex) {
  // same as above
}
```
- Good:
```java
@ExceptionHandler(NotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex, HttpServletRequest req) {
  ErrorResponse er = new ErrorResponse(404, "NOT_FOUND", ex.getMessage(), req.getRequestURI(), OffsetDateTime.now(), null);
  return new ResponseEntity<>(er, HttpStatus.NOT_FOUND);
}
```

3) Pitfall: Inconsistent status codes for validation errors
- Bad:
```java
// returning 500 for all validation failures
ErrorResponse er = new ErrorResponse(500, "BAD_REQUEST", "Validation failed", ...);
return new ResponseEntity<>(er, HttpStatus.INTERNAL_SERVER_ERROR);
```
- Good:
```java
ErrorResponse er = new ErrorResponse(400, "BAD_REQUEST", "Validation failed", ..., fieldErrors);
return new ResponseEntity<>(er, HttpStatus.BAD_REQUEST);
```

4) Pitfall: Exposing sensitive details in validation messages
- Bad:
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorResponse> handleValidation(...) {
  String detail = ex.getMessage(); // may include sensitive stack traces
  // ...
}
```
- Good:
```java
List<ValidationError> errors = ex.getBindingResult().getFieldErrors().stream()
  .map(f -> new ValidationError(f.getField(), f.getDefaultMessage()))
  .collect(Collectors.toList());
```

5) Pitfall: No correlation ID or traceability
- Bad:
```java
// No traceId or requestId in logs or responses
```
- Good:
```java
logger.error("Request failed; path={}", req.getRequestURI());
```
and via RequestIdFilter, the correlation ID is attached to logs and responses.

## Y. Why This Matters In Real Systems

- Client experience: Users and client apps can rely on stable, structured error payloads to display friendly messages and implement retry or fallback strategies.
- Debuggability: Correlation IDs and consistent payloads make logs and traces actionable, reducing mean time to repair (MTTR).
- Monitoring and alerting: Uniform errors feed into dashboards for service health, error rates, and anomaly detection, enabling proactive operations.
- Interoperability: RFC 7807 Problem Details improves compatibility with gateways, proxies, and third-party clients that standardize on Problem Details.
- Security: Avoid leaking stack traces or internal details; provide safe messages and log the sensitive data internally.

## Z. Study Questions — 5 Recall Questions

1) What are the key fields you should include in a consistent API error response, and why?
2) How can you surface per-request correlation IDs to clients and logs without leaking internal details?
3) What is RFC 7807, and why might you use Problem Details over a custom error payload?
4) How does validating input and returning field-level errors improve client behavior?
5) What are common mistakes that could degrade the quality of error handling in APIs, and how can you avoid them?

## Exercise

Complete a practical multi-part coding challenge to implement consistent error handling in a small Spring Boot API.

Part A — Define the contract
- Create ErrorResponse, ValidationError, and ApiException structures as shown in Section 1.
- Implement ApiErrorCode with at least BAD_REQUEST, NOT_FOUND, and INTERNAL_ERROR.

Part B — Global exception handling
- Implement GlobalExceptionHandler with:
  - handleApiException for ApiException
  - handleValidation for MethodArgumentNotValidException
  - handleUnknown for general Exception (safe generic message)
- Ensure no internal stack traces are exposed; log details server-side.

Part C — Validation workflow
- Add a DTO with @NotBlank, @Email, and @Size constraints.
- Create a REST endpoint that accepts this DTO with @Valid and returns 201 on success.

Part D — Observability integration
- Add a RequestIdFilter that generates a per-request UUID and exposes it via X-Request-Id header.
- Update the exception handler to log the requestId and include it in error payloads where appropriate.

Part E — Optional RFC 7807 path
- Implement a RFC 7807 ProblemDetails variant and a separate exception handler that returns ProblemDetails (content-type application/problem+json).
- Compare the benefits of this approach versus the internal ErrorResponse shape.

Part F — Testing
- Write unit tests that:
  - Confirm a NOT_FOUND ApiException yields a 404 with a structured ErrorResponse.
  - Confirm a validation error yields a 400 with a list of ValidationError items.
  - Confirm a non-specific exception yields a generic 500 without leaking details.

Deliverables:
- A Spring Boot project (or snippets you can integrate into one) that compiles and runs.
- A short README snippet explaining how to test error responses (curl examples, expected JSON shape).
- Optional: a minimal JUnit test class covering at least the NOT_FOUND and validation error paths.

End of lesson.