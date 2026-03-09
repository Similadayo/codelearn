# Error Handling in APIs — Consistent Responses (Python)

In modern backend systems, clients expect error information to arrive in a stable, machine-parseable shape. Consistent error responses reduce debugging time, simplify client libraries, and improve observability across services. This lesson focuses on building a robust, predictable error envelope in Python web APIs (using FastAPI) so every endpoint returns errors in the same structure, regardless of where the failure occurs.

## 1. Establish a Unified Error Model

Define a single, reusable error envelope that all endpoints will return. This includes a stable shape for the error code, message, and optional details, plus metadata like a timestamp and request path.

```python
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

def current_timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    timestamp: str
    path: str
    error: ErrorDetail
    correlation_id: Optional[str] = None  # optional tracing id
```

### Line-by-line explanation
- from typing import Optional, Dict, Any: Import typing helpers for optional fields and dictionaries.
- from datetime import datetime: Import datetime to generate timestamps.
- from pydantic import BaseModel: Use Pydantic to define strict, serializable models.
- def current_timestamp(): ...: Utility to produce a UTC timestamp in a stable format.
- class ErrorDetail(BaseModel): ...: Defines the inner error payload with code, message, and optional details.
- class ErrorResponse(BaseModel): ...: The top-level error envelope containing timestamp, path, the error, and an optional correlation_id for tracing.
- correlation_id field: Helps propagate a trace identifier across services for easier correlation in logs and dashboards.

## 2. Centralize Handling: Global Exception Handlers in FastAPI

Create a FastAPI app with a centralized error handling strategy. Use a custom AppError for domain-specific failures, and add handlers for HTTP errors and request validation to guarantee a consistent envelope everywhere.

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

def current_timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    timestamp: str
    path: str
    error: ErrorDetail
    correlation_id: Optional[str] = None

class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        self.correlation_id = correlation_id

app = FastAPI()

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    resp = ErrorResponse(
        timestamp=current_timestamp(),
        path=request.url.path,
        correlation_id=exc.correlation_id,
        error=ErrorDetail(code=exc.code, message=exc.message, details=exc.details),
    )
    return JSONResponse(status_code=exc.status_code, content=resp.dict())

@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    resp = ErrorResponse(
        timestamp=current_timestamp(),
        path=request.url.path,
        error=ErrorDetail(code="HTTP_ERROR", message=exc.detail, details={"status_code": exc.status_code}),
    )
    return JSONResponse(status_code=exc.status_code, content=resp.dict())

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # FastAPI's automatic validation errors are wrapped here for a consistent shape
    resp = ErrorResponse(
        timestamp=current_timestamp(),
        path=request.url.path,
        error=ErrorDetail(code="VALIDATION_ERROR", message="Request validation failed", details={"errors": exc.errors()}),
    )
    return JSONResponse(status_code=422, content=resp.dict())

@app.get("/users/{user_id}")
async def read_user(user_id: int):
    # Domain-specific checks raise AppError; the handler ensures the envelope shape
    if user_id <= 0:
        raise AppError(code="INVALID_USER_ID", message="User ID must be positive", status_code=400, details={"user_id": user_id})
    if user_id == 404:
        raise AppError(code="USER_NOT_FOUND", message="User not found", status_code=404, details={"user_id": user_id})
    return {"user_id": user_id, "name": "Alice"}
```

### Line-by-line explanation
- app = FastAPI(): Create the FastAPI application.
- @app.exception_handler(AppError): Register a handler for domain-specific errors.
- In app_error_handler: Build an ErrorResponse with current_timestamp, request path, and the AppError's details; return a JSONResponse with the appropriate status code.
- @app.exception_handler(HTTPException): Ensure standard HTTP errors are wrapped in the same envelope.
- In http_error_handler: Use a generic "HTTP_ERROR" code and include the status_code in details for observability.
- @app.exception_handler(RequestValidationError): Catch Pydantic/fastapi validation errors and present them in the same shape with details from exc.errors().
- @app.get("/users/{user_id}"): Example endpoint showing how AppError bubbles up into the canonical error envelope.

## 3. Consistent Error Codes and Messages: Semantic Taxonomy

Choose a stable set of error codes and keep them independent of HTTP status whenever possible. This helps clients programmatically react to errors and improves telemetry consistency. Demonstrate a small taxonomy and how the envelope uses it.

```python
from enum import Enum
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from pydantic import BaseModel

class ErrorCode(str, Enum):
    INVALID_INPUT = "INVALID_INPUT"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INTERNAL_ERROR = "INTERNAL_ERROR"

# Reuse the ErrorDetail and ErrorResponse models from Section 2,
# or redefine for standalone clarity in this block:
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    timestamp: str
    path: str
    error: ErrorDetail
    correlation_id: Optional[str] = None

from datetime import datetime

def current_timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

app = FastAPI()

# Example: a helper to map AppError-like data into the taxonomy
def to_error_detail(code: ErrorCode, message: str, details: Optional[Dict[str, Any]] = None) -> ErrorDetail:
    return ErrorDetail(code=code.value, message=message, details=details)

@app.get("/demo/trigger")
async def trigger_demo_error():
    # Simulate a domain error that must be translated into the canonical envelope
    detail = to_error_detail(ErrorCode.INVALID_INPUT, "The provided value is invalid", {"field": "value"})
    resp = ErrorResponse(timestamp=current_timestamp(), path="/demo/trigger", error=detail)
    return JSONResponse(status_code=400, content=resp.dict())
```

### Line-by-line explanation
- class ErrorCode(Enum): Define a stable set of error codes that are independent of HTTP status semantics.
- ErrorDetail and ErrorResponse: Reuse or redefine the envelope to keep a uniform shape.
- to_error_detail: Helper to create a typed ErrorDetail from an ErrorCode and message.
- @app.get("/demo/trigger"): Endpoint illustrating how a domain error maps to a canonical error envelope.
- JSONResponse with status_code=400 ensures the client sees the same envelope even for non-HTTP-Exception failures.

Notes:
- In production, you typically link ErrorCode to both HTTP status and the business meaning. The AppError in Section 2 can carry an ErrorCode to drive this mapping centrally.

## 4. Achieving Observability: Correlation IDs and Context Propagation

A consistent error response is valuable, but you also need to be able to trace the error across services. This section demonstrates a lightweight pattern to propagate a correlation_id (trace_id) via middleware and include it in every error envelope.

```python
from fastapi import FastAPI, Request
import uuid
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any

def current_timestamp() -> str:
    from datetime import datetime
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    timestamp: str
    path: str
    error: ErrorDetail
    correlation_id: Optional[str] = None

class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details

app = FastAPI()

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = cid
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = cid
    return response

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    resp = ErrorResponse(
        timestamp=current_timestamp(),
        path=request.url.path,
        correlation_id=getattr(request.state, "correlation_id", None),
        error=ErrorDetail(code=exc.code, message=exc.message, details=exc.details),
    )
    return JSONResponse(status_code=exc.status_code, content=resp.dict())

@app.get("/reports/{report_id}")
async def get_report(report_id: int, request: Request):
    if report_id == 0:
        raise AppError(code="INVALID_INPUT", message="Report ID must be non-zero", status_code=400)
    return {"report_id": report_id, "status": "ready"}
```

### Line-by-line explanation
- @app.middleware("http"): Define a middleware that runs on every request.
- It reads X-Correlation-ID from headers or generates one and stores it on request.state.
- It attaches the same correlation_id back in the response headers for traceability.
- In app_error_handler, correlation_id is retrieved from request.state and included in the envelope so clients and logs can correlate across services.

## 5. Common Beginner Mistakes

Pitfall 1: Inconsistent error shapes
- Bad:
```python
# Bad
@app.get("/foo")
async def foo():
    raise HTTPException(status_code=400, detail="Bad input")
```
- Good:
```python
# Good
@app.get("/foo")
async def foo():
    raise AppError(code="INVALID_INPUT", message="Bad input", status_code=400)
```

Pitfall 2: Mixing 422 raw validation errors with custom envelopes
- Bad:
```python
# Bad
from fastapi import Body
@router.post("/items")
async def create_item(item: Item = Body(...)):
    # If validation fails, FastAPI returns 422 with its own body
    pass
```
- Good:
```python
# Good
@router.post("/items")
async def create_item(item: Item):
    # If validation fails, a centralized RequestValidationError handler returns the envelope
    pass
```

Pitfall 3: Skipping path, timestamp, and correlation_id in errors
- Bad:
```python
# Bad
def error_response(msg: str):
    return {"error": msg}
```
- Good:
```python
# Good
def error_response(request: Request, code: str, message: str, details: Optional[dict] = None):
    return ErrorResponse(
        timestamp=current_timestamp(),
        path=request.url.path,
        correlation_id=getattr(request.state, "correlation_id", None),
        error=ErrorDetail(code=code, message=message, details=details),
    )
```

## 6. Why This Matters In Real Systems

- Client interoperability: Clients (mobile, web, services) can reliably parse error envelopes and implement retry/backoff or routing rules based on error codes.
- Automation and tooling: Automatic retries, circuit breakers, and alerting map cleanly to stable error codes and messages.
- Debuggability: Timestamps, paths, and correlation IDs speed root-cause analysis across microservices and environments (dev/stage/prod).
- Observability: Centralized error handling pairs well with structured logging, APM traces, and metrics for error rates by code, endpoint, or user.

Real-world practices to consider:
- Include a human-readable message for developers and a machine-readable code for automation.
- Attach optional details with sensitive data redaction in production.
- Use a global exception handler for unexpected errors to prevent leaking internal stack traces.
- Propagate a correlation/trace ID across all services and include it in every error envelope.

## 7. Study Questions

1. What are the advantages of using a single, unified error envelope for all API errors?
2. How do custom application errors (AppError) improve client usability compared to plain HTTPException?
3. Why should you include a correlation_id in error responses, and how can middleware help propagate it?
4. How does FastAPI’s RequestValidationError help you centralize validation error reporting in a consistent shape?
5. What changes would you make to redact sensitive fields in error details for production environments?

## Exercise

Part A: Build a small FastAPI app with unified error handling

- Task 1: Create a FastAPI app that contains:
  - A unified error envelope as shown in Section 1.
  - A custom AppError with at least two distinct codes (e.g., INVALID_INPUT, USER_NOT_FOUND).
  - Handlers for AppError, HTTPException, and RequestValidationError that return the envelope in Section 2 style.
- Task 2: Add a middleware that generates and propagates a correlation_id for each request (and includes it in the error envelope as in Section 4).
- Task 3: Implement endpoints:
  - GET /users/{user_id}: returns a dummy user; raises AppError INVALID_INPUT for non-positive IDs and USER_NOT_FOUND for a specific ID (e.g., 404).
  - POST /items: accepts a JSON body with fields id (int), name (str), price (float); uses Pydantic for validation and raises AppError with INVALID_INPUT when validation fails (the envelope should capture these as validation errors too).
- Task 4: Run the app locally (uvicorn) and manually verify:
  - A 400 INVALID_INPUT from /users/0 returns the standard envelope.
  - A 404 USER_NOT_FOUND from /users/404 returns the envelope with the proper code.
  - A 422 validation error from /items with an invalid payload is wrapped in the same envelope.
  - The response includes X-Correlation-ID and the envelope contains the same value in correlation_id.
- Task 5: (Optional) Write a small Python script using httpx to exercise the endpoints and print the envelope responses.

Deliverables:
- A single Python module (e.g., main.py) containing the FastAPI app with the above behavior.
- A short README snippet (in markdown) describing how to run the app and how the error envelope looks in practice.

Note: You can adapt the code samples in this lesson to your preferred Python web framework, but the key ideas—unified error models, centralized handling, consistent codes/messages, and observability through correlation IDs—should remain the same.