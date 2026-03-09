# Error Handling in APIs — Consistent Responses (PHP)

A robust API must communicate failures as clearly as successes, with a single, predictable shape that clients can rely on. In backend services, consistent error handling reduces debugging time, simplifies client integration, and improves observability in production. This lesson teaches a PHP-based approach to building web APIs with uniform response formats, custom exceptions, global error handling, and practical routing patterns suitable for a microservice or monolithic PHP app.

## 1. Defining a Unified API Response Structure

Create a single, consistent JSON shape for both success and error outcomes. This foundation makes downstream clients, logs, and tracing easier to reason about.

```php
<?php
class ApiResponse {
    public static function generateTraceId(): string {
        // Simple, unique identifier per request for correlation
        return bin2hex(random_bytes(8));
    }

    // Success response payload
    public static function success($data, string $traceId = null): array {
        return [
            'success'   => true,
            'data'      => $data,
            'trace_id'  => $traceId ?? self::generateTraceId(),
            'timestamp' => gmdate('Y-m-d\\TH:i:s\\Z')
        ];
    }

    // Error response payload
    public static function error(int $httpCode, string $code, string $message, $details = null, string $traceId = null): array {
        return [
            'success' => false,
            'error'   => [
                'code'    => $code,
                'message' => $message,
                'details' => $details
            ],
            'trace_id' => $traceId ?? self::generateTraceId(),
            'timestamp' => gmdate('Y-m-d\\TH:i:s\\Z')
        ];
    }
}

// Emit a JSON response to the client with an appropriate HTTP status code
function emitJsonResponse(array $payload, int $httpCode = 200): void {
    header('Content-Type: application/json');
    http_response_code($httpCode);
    echo json_encode($payload);
    exit;
}
```

### Line-by-line explanation
- Line 1: Declares the ApiResponse class to group helper methods for API responses.
- Line 2: generateTraceId returns a unique hex string for tracing each request.
- Line 5: success starts a uniform payload for successful responses.
- Line 6: Accepts the data payload and optional traceId.
- Line 7-10: Includes a trace_id and a UTC timestamp in the response.
- Line 14: error starts a uniform payload for error responses.
- Line 15-19: error object contains a machine-friendly code, human message, and optional details.
- Line 20-21: Includes trace_id and timestamp for correlation and timing.
- Line 25-28: emitJsonResponse sets JSON content type, applies HTTP status, encodes, and ends the script.

## 2. Creating Custom Exceptions and Error Rendering

Define a structured set of exceptions you can throw from controllers, then render them through the unified ApiResponse to ensure consistent error payloads everywhere.

```php
<?php
// ApiException is the base for all API-related errors
class ApiException extends Exception {
    protected int $httpCode;
    protected string $errorCode;
    protected $details;

    public function __construct(string $message, int $httpCode = 500, string $errorCode = 'INTERNAL_SERVER_ERROR', $details = null) {
        parent::__construct($message);
        $this->httpCode = $httpCode;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }

    public function getHttpCode(): int { return $this->httpCode; }
    public function getErrorCode(): string { return $this->errorCode; }
    public function getDetails() { return $this->details; }
}

class NotFoundException extends ApiException {
    public function __construct(string $message = 'Resource not found', $details = null) {
        parent::__construct($message, 404, 'NOT_FOUND', $details);
    }
}

class ValidationException extends ApiException {
    public function __construct(string $message = 'Validation failed', $details = null) {
        parent::__construct($message, 422, 'VALIDATION_ERROR', $details);
    }
}

// Centralized renderer for ApiException and generic exceptions
function handleApiException(Throwable $e): void {
    // Obtain a trace id; prefer client-provided, else generate one
    $traceId = $_SERVER['HTTP_X_REQUEST_ID'] ?? ApiResponse::generateTraceId();

    if ($e instanceof ApiException) {
        $payload = ApiResponse::error($e->getHttpCode(), $e->getErrorCode(), $e->getMessage(), $e->getDetails(), $traceId);
        emitJsonResponse($payload, $e->getHttpCode());
    } else {
        // Fallback for unexpected exceptions
        $payload = ApiResponse::error(500, 'UNHANDLED_EXCEPTION', $e->getMessage(), null, $traceId);
        emitJsonResponse($payload, 500);
    }
}

// Bind the renderer to PHP's exception mechanism
set_exception_handler('handleApiException');
```

### Line-by-line explanation
- Line 3: ApiException extends PHP's base Exception to add HTTP semantics and details.
- Line 5-7: Stores HTTP status, a client-facing error code, and optional details.
- Line 12: NotFoundException is a specialized ApiException for 404s.
- Line 18: ValidationException is a specialized ApiException for 422/validation scenarios.
- Line 26: handleApiException decides how to render the exception.
- Line 28-29: If the exception is ApiException, render its details accordingly.
- Line 33-36: If the exception is unknown, render a generic 500 error with a traceId.
- Line 39: Registers the handler with PHP so uncaught exceptions flow here.

## 3. Global Error Handling and Shutdown Bridging

Bridge PHP errors to exceptions and catch fatal errors gracefully to preserve the consistent API response shape even in unexpected failures.

```php
<?php
// Convert PHP errors to exceptions so they can be handled uniformly
function handleError(int $severity, string $message, string $file, int $line): void {
    if (!(error_reporting() & $severity)) { return; }
    throw new ErrorException($message, 0, $severity, $file, $line);
}

// Catch fatal errors via shutdown handler
function handleFatalError(): void {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        $traceId = $_SERVER['HTTP_X_REQUEST_ID'] ?? ApiResponse::generateTraceId();
        $payload = ApiResponse::error(500, 'FATAL_ERROR', $error['message'], ['file' => $error['file'], 'line' => $error['line']], $traceId);
        emitJsonResponse($payload, 500);
    }
}

set_error_handler('handleError');
set_exception_handler('handleApiException'); // defined in Section 2
register_shutdown_function('handleFatalError');
```

### Line-by-line explanation
- Line 4-9: handleError translates PHP errors into ErrorException when the error reporting allows it.
- Line 12-21: handleFatalError inspects the last error on shutdown and, if fatal, returns a sanitized, consistent API error payload with a trace_id.
- Line 24-27: Binds the error and exception handlers into PHP’s runtime so both errors and uncaught exceptions are handled consistently.
- Line 28: Reuses handleApiException from Section 2 for rendering.

## 4. Routing and Controllers with Consistent Error Handling

A small router and controller example that demonstrates throwing ApiException-based errors and returning uniform responses.

```php
<?php
// Assumes ApiResponse, ApiException, NotFoundException, ValidationException
// are available via previous sections
require_once 'ApiResponse.php';
require_once 'ApiExceptions.php'; // defines ApiException, NotFoundException, ValidationException

header('Content-Type: application/json');

// Simple path-based router
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$qs   = $_GET;

try {
    if ($path === '/user' || $path === '/user/') {
        // Expect id in query string
        $id = $qs['id'] ?? null;
        if ($id === null) {
            throw new ValidationException('Parameter id is required', ['param' => 'id']);
        }
        $user = getUserFromDb((int)$id);
        if ($user === null) {
            throw new NotFoundException('User not found', ['id' => $id]);
        }
        $payload = ApiResponse::success($user, $_SERVER['HTTP_X_REQUEST_ID'] ?? ApiResponse::generateTraceId());
        emitJsonResponse($payload, 200);
    } elseif ($path === '/health') {
        $payload = ApiResponse::success(['status' => 'ok'], $_SERVER['HTTP_X_REQUEST_ID'] ?? ApiResponse::generateTraceId());
        emitJsonResponse($payload, 200);
    } else {
        throw new NotFoundException('Endpoint not found');
    }
} catch (ApiException $ex) {
    handleApiException($ex);
} catch (Throwable $ex) {
    handleApiException($ex);
}

// Mock data access
function getUserFromDb(int $id) {
    // Simple in-memory mock: only user with id 1 exists
    if ($id === 1) {
        return ['id' => 1, 'name' => 'Alice', 'email' => 'alice@example.com'];
    }
    return null;
}
```

### Line-by-line explanation
- Line 5-7: Imports the shared API response and exception helpers.
- Line 11: Sets the response content type to JSON for all routes.
- Line 15-23: Router branch for /user; validates input, fetches a user, or throws Validation/NotFound exceptions.
- Line 24-28: Builds a success payload and emits it with a 200 status.
- Line 29-36: Health endpoint example returning a simple success payload.
- Line 37-39: Fallback for unknown routes, throwing a NotFoundException which is rendered consistently.
- Line 41-45: Catch blocks forward to the unified exception renderer.
- Line 49-57: A tiny in-memory data fetcher to simulate a DB lookup.

## 5. Observability: Trace IDs, Timestamps, and Headers

Ensure every response can be correlated across services and logs by issuing a trace_id and surfacing it to clients.

```php
<?php
// Ensure every response includes a trace_id and is associated with a request id
function attachTraceAndHeader(array $payload): array {
    $traceId = $_SERVER['HTTP_X_REQUEST_ID'] ?? ApiResponse::generateTraceId();
    // Expose the same trace_id to clients via header
    header('X-Request-ID: ' . $traceId);
    // Normalize payload to include trace_id
    $payload['trace_id'] = $traceId;
    return $payload;
}

// Example usage in a response
$payload = ApiResponse::success(['message' => 'Operation completed']);
$payload = attachTraceAndHeader($payload);
emitJsonResponse($payload, 200);
```

### Line-by-line explanation
- Line 2-7: attachTraceAndHeader derives or creates a trace_id, sets it in a response header for downstream correlation, and injects it into the payload.
- Line 10-13: Demonstrates wrapping a typical success payload with the trace_id and emitting it.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Inconsistent JSON structure across success and error
  - Bad:
    ```php
    // Inconsistent: plain error object, no data field
    echo json_encode(['error' => 'Not found']);
    ```
  - Good:
    ```php
    $payload = ApiResponse::error(404, 'NOT_FOUND', 'Resource not found');
    emitJsonResponse($payload, 404);
    ```
  - Why it matters: Clients must rely on a fixed contract; inconsistencies force custom parsing logic and increase bugs.

  ### Line-by-line explanation
  - Bad example: lacks a uniform shape; clients must handle ad-hoc formats.
  - Good example: uses ApiResponse::error to return a known, structured payload and proper HTTP status.

- Pitfall 2: Swallowing exceptions or not returning a 500 on unexpected errors
  - Bad:
    ```php
    try {
        // some work
    } catch (Exception $e) {
        // silently ignore
    }
    ```
  - Good:
    ```php
    try {
        // some work
    } catch (Exception $e) {
        error_log($e); // log for ops
        $payload = ApiResponse::error(500, 'UNHANDLED_EXCEPTION', 'Internal server error');
        emitJsonResponse($payload, 500);
    }
    ```
  - Why it matters: Silent failures leave clients and ops in the dark; explicit 500 responses with context help debugging.

  ### Line-by-line explanation
  - Bad: error is swallowed, no response is produced.
  - Good: logs the error and returns a standardized 500 error payload for clients.

- Pitfall 3: Missing trace_id or not using a stable identifier for correlation
  - Bad:
    ```php
    echo json_encode(['error' => 'Not Found']);
    ```
  - Good:
    ```php
    $payload = ApiResponse::error(404, 'NOT_FOUND', 'Resource not found', null, $_SERVER['HTTP_X_REQUEST_ID'] ?? ApiResponse::generateTraceId());
    emitJsonResponse($payload, 404);
    ```
  - Why it matters: Without a trace_id, cross-service debugging and incident analysis become painful.

  ### Line-by-line explanation
  - Bad: no trace_id, so cross-service tracing is hard.
  - Good: ensures a trace_id is present and surfaced in responses, enabling end-to-end tracing.

## Y. Why This Matters In Real Systems — production context and real usage

- Client experience: Frontends, mobile apps, and third-party integrators expect a stable contract. A single error format reduces vendor-specific integration code and improves UX when errors occur.
- Observability: Trace IDs, timestamps, and consistent error codes make it feasible to correlate logs, traces, and metrics across services, instances, and regions. This is crucial for incident response and post-mortems.
- Service reliability: By catching and rethrowing as ApiException with specific codes (e.g., NOT_FOUND, VALIDATION_ERROR, FATAL_ERROR), you can implement granular retry policies, circuit breakers, and alerting rules around particular error types.
- Security and privacy: A uniform response prevents leaking internal DB schemas or stack traces. The details field should be used for client-friendly context while avoiding sensitive data.
- Portability and testing: A single contract simplifies unit tests and contract tests. You can mock ApiResponse in tests to validate output shapes without needing a running server.

## Z. Study Questions — 5 recall questions

1. What is the purpose of a trace_id in API responses, and how should it be used in both server logs and client responses?
2. How does a custom ApiException enable a uniform error contract across different error cases (e.g., NotFound, Validation)?
3. Why should HTTP status codes align with the error payload (e.g., 404 for NotFound, 422 for Validation errors) in a consistent API contract?
4. What are the benefits and risks of converting PHP errors (E_ERROR, E_WARNING, etc.) into exceptions for a web API?
5. Describe how you would extend the pattern to include additional metadata (e.g., request duration, service version) in every response.

## Exercise — a practical multi-part coding challenge

Part A — Build the foundation
- Implement the ApiResponse class (as shown in Section 1) and ensure you can emit both success and error payloads with trace_id and timestamp.
- Implement ApiException, NotFoundException, and ValidationException (as shown in Section 2).
- Wire a global exception handler to render ApiExceptions via the unified response format (as shown in Section 2).

Part B — Create a tiny router with consistent errors
- Build a small PHP script (router.php) that exposes two endpoints:
  - GET /user?id={id} -> returns user data or NotFound/Validation errors
  - GET /health -> returns a healthy status
- Ensure the endpoints return responses using ApiResponse and include trace_id via the request, or generate one if missing (use ApiResponse::generateTraceId()).
- Add a handler for fatal errors (via register_shutdown_function) to return a 500 FATAL_ERROR payload if the server encounters a fatal error.

Part C — Add tracing in responses and testing
- Ensure every response includes the header X-Request-ID reflecting the trace_id.
- Modify the router so that a trace_id from the client (HTTP_X_REQUEST_ID) is used when present; otherwise a new one is generated.
- Write a simple test script that makes two requests, one with an X-Request-ID header and one without, and prints the resulting JSON payloads to verify the trace_id consistency.

Part D — Realistic extension
- Add a new exception type (ForbiddenException) with HTTP 403 and code FORBIDDEN.
- Create a new route /secret that requires a header X-Auth-Token; if missing or invalid, throw ForbiddenException.
- Ensure responses still follow the same contract and include trace_id in both success and error paths.

This lesson provides a structured approach to error handling in PHP APIs with consistent responses, enabling professional-grade reliability, observability, and maintainability in production systems.