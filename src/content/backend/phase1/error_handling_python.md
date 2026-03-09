# Track: Backend Engineering — Phase 1: Language Foundations — Topic: Error Handling & Debugging (Python)

Error handling and debugging are foundational skills for reliable backend systems. Good error handling prevents minor issues from cascading into outages, makes failures observable, and helps engineers pinpoint root causes quickly. In Python, a disciplined approach to exceptions, logging, and debugging translates to higher uptime, clearer error surfaces for API clients, and easier maintenance.

## 1. Error handling primitives in Python

Code example: use try/except/else/finally to manage common I/O errors, with logging to capture context.

```python
import logging

logging.basicConfig(level=logging.INFO)

def read_text_file(path):
    try:
        with open(path, 'r') as f:
            data = f.read()
        return data
    except FileNotFoundError:
        logging.error("File not found: %s", path)
        raise
    except OSError as e:
        logging.error("OS error while reading %s: %s", path, e)
        raise
    else:
        logging.info("Successfully read file: %s", path)
```

### Line-by-line explanation
- Line 1: Import the standard logging module to record events, errors, and flow.
- Line 3: Configure the logging system to output INFO level messages.
- Line 5: Define read_text_file, taking a file path as input.
- Line 7: Enter a try block to attempt the file operation.
- Line 8: Open the file in read mode within a context manager to ensure cleanup.
- Line 9: Read the file contents into data.
- Line 11: Return the data if the read succeeds.
- Line 12-14: Catch FileNotFoundError, log a descriptive error, and re-raise to propagate the exception.
- Line 15-17: Catch other OS-related errors, log, and re-raise for upstream handling.
- Line 18-20: The else block runs only if no exception occurred; log success for observability.
```

## 2. Custom exceptions and propagation

Code example: define a small custom exception hierarchy, raise specific errors, and propagate them for higher-level handling.

```python
class DataSourceError(Exception):
    """Base class for data source related errors."""
    pass

class NotFoundError(DataSourceError):
    """Raised when a requested item is not found in the data store."""
    pass

class InvalidDataError(DataSourceError):
    """Raised when the data for an item is malformed or invalid."""
    pass

def get_user(user_id, store):
    """
    Fetch a user from an in-memory store.
    - Raises NotFoundError if user_id not in store
    - Raises InvalidDataError if stored data is malformed
    """
    try:
        user = store[user_id]
    except KeyError:
        raise NotFoundError(f"User {user_id} not found")

    # Validate required fields
    if not isinstance(user, dict) or 'name' not in user:
        raise InvalidDataError(f"User {user_id} has invalid data")

    return user

def fetch_user_or_handle(user_id, store):
    """
    Demonstrates propagation: caller handles specific errors.
    """
    try:
        return get_user(user_id, store)
    except NotFoundError as e:
        # Re-raise for caller to decide higher-level behavior
        raise
    except InvalidDataError as e:
        raise
```

### Line-by-line explanation
- Line 1-3: Define a base exception type for data source related errors.
- Line 5-7: Define NotFoundError and InvalidDataError as specialized exceptions.
- Line 9-20: Implement get_user to fetch a user from store and perform basic validation.
- Line 11-14: If the user_id is missing, raise NotFoundError.
- Line 17-19: If the retrieved data is not a dict or lacks a 'name', raise InvalidDataError.
- Line 22-29: fetch_user_or_handle demonstrates propagating specific errors to the caller, re-raising as needed.
```

## 3. Logging, observation, and debugging

Code example: use logging with exception tracing to capture stack traces for debugging.

```python
import logging

LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)

def process_payload(payload):
    try:
        # pretend processing that could fail
        result = 100 / payload  # may raise ZeroDivisionError
        return {"result": result}
    except ZeroDivisionError:
        logging.exception("Division by zero while processing payload: %s", payload)
        raise
```

### Line-by-line explanation
- Line 1: Import the logging module for structured log output.
- Line 3: Define a log format that includes timestamp and level for traceability.
- Line 4: Configure the logging system to INFO level with the given format.
- Line 6: Define process_payload to simulate processing with a potential division error.
- Line 8: Attempt a calculation that may raise ZeroDivisionError.
- Line 9: If a ZeroDivisionError occurs, log the full stack trace with context, then re-raise.
```

## 4. Debugging techniques in Python

Code example: leverage breakpoints and sanity checks to inspect state during execution.

```python
def compute_mean(values):
    if not values:
        raise ValueError("values must not be empty")
    for idx, v in enumerate(values):
        if v is None:
            breakpoint()  # Python 3.7+ built-in debugger
    return sum(values) / len(values)
```

### Line-by-line explanation
- Line 1: Define compute_mean to calculate the average of a list.
- Line 2-4: Validate input to avoid ambiguous errors and divide-by-zero later.
- Line 5-8: Iterate over values; if a None is encountered, pause execution with a breakpoint for interactive inspection.
- Line 9: Compute and return the mean after validating all values.
```

## 5. Robust error handling patterns for services

Code example: implement a basic retry pattern with exponential backoff to handle flaky calls.

```python
import time
import random
import logging

logging.basicConfig(level=logging.INFO)

def fetch_with_retry(fetch_fn, retries=3, backoff=0.5):
    """
    Retry a flaky operation with exponential backoff.
    fetch_fn: a zero-argument callable that may raise ConnectionError
    """
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            return fetch_fn()
        except ConnectionError as e:
            last_exc = e
            if attempt == retries:
                logging.error("All retries failed after %d attempts", retries)
                raise
            sleep = backoff * (2 ** (attempt - 1))
            # small jitter
            sleep = sleep * (0.9 + random.random() * 0.2)
            logging.warning("Retry %d after error: %s. Sleeping %.2fs", attempt, e, sleep)
            time.sleep(sleep)
```

### Line-by-line explanation
- Line 1-3: Import time, random, and logging for timing, jitter, and observability.
- Line 5: Configure logging to INFO level for visibility into retries.
- Line 7-15: Define fetch_with_retry, accepting a zero-argument callable and retry policy.
- Line 12-15: Try to execute fetch_fn; on ConnectionError, save the exception and schedule a retry unless at the last attempt.
- Line 16-23: Compute exponential backoff with a small random jitter to avoid thundering herd; log each retry and sleep accordingly.
- Line 24-26: If all retries fail, log and re-raise the last exception.

## X. Common Beginner Mistakes

- BAD: Catching broad exceptions and swallowing the details
  BAD
  ```python
  import json

  def parse_json(text):
      try:
          return json.loads(text)
      except Exception:
          return None
  ```
  GOOD
  ```python
  import json
  import logging

  def parse_json(text):
      try:
          return json.loads(text)
      except json.JSONDecodeError as e:
          logging.error("JSON decode failed: %s", e)
          raise
  ```

- BAD: Swallowing errors and returning ambiguous results
  BAD
  ```python
  def load_config(path):
      try:
          with open(path) as f:
              return json.load(f)
      except:
          return None
  ```
  GOOD
  ```python
  def load_config(path):
      with open(path) as f:
          try:
              return json.load(f)
          except json.JSONDecodeError as e:
              logging.error("Invalid config: %s", e)
              raise
  ```

- BAD: Logging only a generic message without context
  BAD
  ```python
  def process(value):
      try:
          return 10 / value
      except ZeroDivisionError:
          logging.info("error")
  ```
  GOOD
  ```python
  def process(value):
      try:
          return 10 / value
      except ZeroDivisionError:
          logging.exception("Division by zero while processing value: %s", value)
          raise
  ```

- BAD: Not releasing resources (manual close)
  BAD
  ```python
  def read_first_line(path):
      f = open(path, 'r')
      line = f.readline()
      f.close()
      return line
  ```
  GOOD
  ```python
  def read_first_line(path):
      with open(path, 'r') as f:
          return f.readline()
  ```

- BAD: Propagating internal details to clients (no surface control)
  BAD
  ```python
  def handler():
      try:
          do_work()
      except Exception as e:
          raise e
  ```
  GOOD
  ```python
  def handler():
      try:
          do_work()
      except Exception:
          # Do not leak internals; return a stable error surface
          raise BackendError("Internal server error")
  ```

## Y. Why This Matters In Real Systems

- Reliability: Clear error handling prevents cascading failures and helps callers recover gracefully.
- Observability: Structured logs, tracebacks, and consistent error payloads enable faster root-cause analysis and incident response.
- API design: Standardized error shapes (e.g., HTTP-like error codes or JSON error objects) provide predictable behavior for clients and integrations.
- Debugging in production: Debugging tools (breakpoints, logging, and tracebacks) help locate issues without relying on brittle print statements.
- Maintainability: Custom exception hierarchies expose domain-specific failure modes, making code easier to reason about and test.
- Testing and resilience: Unit tests that cover error paths, retries, and edge cases improve resilience and reduce outages.

## Z. Study Questions

1) What is the difference between using exceptions for control flow vs returning error values in Python?
2) How does logging.exception differ from logging.error when you catch an exception?
3) Why is it important to catch and re-raise specific exception types rather than a bare except?
4) What is exponential backoff, and why is it beneficial in distributed systems?
5) How can you ensure that internal implementation details are not leaked to API clients in error responses?

## Exercise

Part A: Implement a small error-handling framework with a custom error hierarchy and a decorator to normalize API responses.

- Create a script that defines:
  - A base BackendError and two concrete errors NotFoundError and BadRequestError.
  - A decorator handle_api_errors that catches those errors and returns a uniform dict: { "success": bool, "data": ..., "error": ... }.
  - A simple in-memory STORE dictionary of users, with one valid entry and one missing user.

Code (Part A – definitions and decorator):

```python
# Part A: Error hierarchy and API error decorator
import json
import logging
from typing import Callable, Any

logging.basicConfig(level=logging.INFO)

class BackendError(Exception):
    """Base class for backend errors."""
    pass

class NotFoundError(BackendError):
    pass

class BadRequestError(BackendError):
    pass

# Decorator to normalize endpoint responses
def handle_api_errors(func: Callable) -> Callable:
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            return {"success": True, "data": result}
        except NotFoundError as e:
            return {"success": False, "error": "not_found", "message": str(e)}
        except BadRequestError as e:
            return {"success": False, "error": "bad_request", "message": str(e)}
        except BackendError as e:
            return {"success": False, "error": "backend_error", "message": "Internal backend error"}
        except Exception as e:
            logging.exception("Unhandled error in endpoint")
            return {"success": False, "error": "internal", "message": "Internal server error"}
    return wrapper
```

Part B: Implement a simple endpoint using the framework.

```python
# Part B: In-memory store and endpoint
STORE = {
    1: {"name": "Alice", "age": 30},
    2: {"name": "Bob", "age": 25},
}

@handle_api_errors
def get_user_endpoint(user_id: int):
    try:
        user = STORE[user_id]
    except KeyError:
        raise NotFoundError(f"User {user_id} not found")
    return user
```

Part C: Run a small demo and a mock failure.

```python
if __name__ == "__main__":
    # Success case
    print(get_user_endpoint(1))
    # Failure case
    print(get_user_endpoint(999))
```

Part D: Optional unit tests (unittest) to verify error payload shapes.

```python
import unittest

class TestEndpoints(unittest.TestCase):
    def test_get_user_success(self):
        self.assertEqual(get_user_endpoint(1), {
            "success": True,
            "data": {"name": "Alice", "age": 30}
        })

    def test_get_user_not_found(self):
        self.assertEqual(get_user_endpoint(999), {
            "success": False,
            "error": "not_found",
            "message": "User 999 not found"
        })

if __name__ == "__main__":
    unittest.main()
```

Notes:
- The exercise guides you through building a small, testable error-handling flow common in backend endpoints: domain-specific errors, a normalization wrapper, and predictable responses suitable for API clients.
- You can extend this by adding more error classes (e.g., UnauthorizedError), simulating I/O failures, and wiring into a real web framework (e.g., FastAPI) to see how the error surface maps to HTTP responses.