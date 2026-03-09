# Input Validation — Never Trust User Input (Python)

In building web servers, user-supplied data travels through every layer—HTTP endpoints, business logic, and data stores. Never trusting this input is non-negotiable: it prevents security breaches (SQL injection, XSS), preserves data integrity, and keeps services reliable under real-world load. This lesson walks through practical, Python-centric techniques for validating and sanitizing input, with concrete examples you can adapt to Flask, FastAPI, or pure Python services.

## 1. Understanding Untrusted Data in Web Requests

When a client sends data, it often looks well-formed but may be malformed, incomplete, or malicious. The server must defensively validate and sanitize it before use.

Code example: basic JSON payload parsing and primitive validation
```python
import json

def extract_username_age(raw_json: str):
    # Parse JSON payload
    data = json.loads(raw_json)

    if not isinstance(data, dict):
        raise ValueError("Payload must be a JSON object")

    # Basic required fields
    username = data.get("username")
    if not isinstance(username, str) or not username:
        raise ValueError("username is required and must be a non-empty string")

    # Optional field with type coercion
    age = data.get("age")
    if age is not None:
        try:
            age = int(age)
        except (ValueError, TypeError):
            raise ValueError("age must be an integer")

    return {"username": username, "age": age}
```

### Line-by-line explanation
- import json: Bring in the JSON parsing module.
- def extract_username_age(raw_json: str): Define a function that accepts a raw JSON string.
- data = json.loads(raw_json): Parse the string into a Python object.
- if not isinstance(data, dict): Ensure the root is a JSON object (not a list or scalar).
- username = data.get("username"): Retrieve the username field without raising if missing.
- if not isinstance(username, str) or not username: Validate that username exists and is a non-empty string.
- age = data.get("age"): Retrieve the age field (optional).
- if age is not None: If age is provided, attempt to coerce to int.
- try: age = int(age) except (ValueError, TypeError): Convert to int or raise a clear error.
- return {"username": username, "age": age}: Return a normalized payload for downstream use.
```

## 2. Validation Strategies: Schemas, Types, and Constraints

Use explicit schemas or validation rules rather than ad-hoc checks sprinkled through code. This section shows a compact, schema-like approach using Python primitives (no external libs) and demonstrates common constraints.

Code example: schema-driven validation with explicit rules
```python
import re
from typing import Any, Dict, Optional

EMAIL_RE = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def validate_user_schema(data: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("data must be a dictionary")

    errors = {}

    # username: 3-30 chars, alphanumeric and underscores
    username = data.get("username")
    if not isinstance(username, str) or not (3 <= len(username) <= 30) or not re.match(r"^\w+$", username):
        errors["username"] = "3-30 chars, letters/digits/underscore"

    # email: must look like a valid email
    email = data.get("email")
    if not isinstance(email, str) or not EMAIL_RE.match(email):
        errors["email"] = "valid email required"

    # age: optional, 0-120
    age = data.get("age")
    if age is not None:
        if not isinstance(age, int) or not (0 <= age <= 120):
            errors["age"] = "age must be integer 0-120"

    # password: at least 8 chars and includes upper, lower, digit
    password = data.get("password")
    if not isinstance(password, str) or len(password) < 8:
        errors["password"] = "minimum 8 characters"
    else:
        if not (re.search(r"[A-Z]", password) and re.search(r"[a-z]", password) and re.search(r"[0-9]", password)):
            errors["password"] = "must include upper, lower, and digit"

    # bio: optional, max 160 chars
    bio = data.get("bio")
    if bio is not None and (not isinstance(bio, str) or len(bio) > 160):
        errors["bio"] = "bio must be at most 160 characters"

    if errors:
        raise ValueError({"errors": errors})

    # Return a sanitized, normalized payload
    return {
        "username": username,
        "email": email,
        "age": age,
        "bio": bio,
    }
```

### Line-by-line explanation
- import re, typing: Bring in regex and typing utilities for constraints.
- EMAIL_RE = re.compile(...): Precompile a permissive email pattern for quick checks.
- def validate_user_schema(data: Dict[str, Any]) -> Dict[str, Any]: Define a function that validates a dict against a schema.
- if not isinstance(data, dict): Validate input type.
- errors = {}: Prepare a map of field errors.
- username = data.get("username"): Pull username value.
- Validation block for username: type, length, and allowed characters via regex.
- email = data.get("email"): Pull email value and validate with EMAIL_RE.
- age = data.get("age"): Optional; ensure it's an int in [0, 120] if present.
- password validation: ensure minimum length and character class requirements.
- bio: Optional; enforce max length if provided.
- if errors: Raise a structured error so callers can show specific fields.
- Return a sanitized payload with only validated fields: username, email, age, bio.

## 3. Safe JSON Parsing and Robust Error Handling

When clients send payloads, parsing errors should not crash your server. Return consistent error structures and avoid leaking internals.

Code example: safe JSON parsing with clear errors
```python
import json
from json import JSONDecodeError

def load_json_safe(raw: str) -> Dict[str, Any]:
    try:
        parsed = json.loads(raw)
    except JSONDecodeError as e:
        raise ValueError({"error": "invalid_json", "detail": str(e)}) from e

    if not isinstance(parsed, dict):
        raise ValueError({"error": "invalid_root_type", "detail": "expected object"})

    return parsed
```

### Line-by-line explanation
- import json, JSONDecodeError: Bring in JSON utilities and specific exception type.
- def load_json_safe(raw: str) -> Dict[str, Any]: Define a function to parse and validate top-level type.
- try: parsed = json.loads(raw): Attempt to parse the raw string to Python objects.
- except JSONDecodeError as e: If parsing fails, raise a structured error with details.
- if not isinstance(parsed, dict): Ensure the root is a JSON object; otherwise, error.
- return parsed: Return the validated dictionary for further processing.

## 4. Validating URL Query Parameters and HTTP Headers

Query parameters and headers often drive server behavior. Validate and sanitize them to avoid injection vectors and subtle bugs.

Code example: validating query params and a request header
```python
from urllib.parse import parse_qs, urlparse
from uuid import UUID

def validate_request_meta(query: str, headers: Dict[str, str]):
    # Parse query string into a dict of single-valued strings
    parsed = parse_qs(query)
    limit_str = parsed.get("limit", [""])[0]
    if limit_str:
        try:
            limit = int(limit_str)
        except ValueError:
            raise ValueError({"error": "invalid_limit", "detail": "limit must be an integer"})
        if not (1 <= limit <= 100):
            raise ValueError({"error": "limit_out_of_range", "detail": "1-100 allowed"})
    else:
        limit = 10  # default

    search = parsed.get("search", [""])[0]
    if not isinstance(search, str):
        search = ""

    # Header validation
    request_id = headers.get("X-Request-ID")
    if request_id:
        try:
            UUID(request_id)
        except ValueError:
            raise ValueError({"error": "invalid_uuid", "detail": "X-Request-ID must be a UUID"})

    return {"limit": limit, "search": search, "X-Request-ID": request_id}
```

### Line-by-line explanation
- from urllib.parse import parse_qs, urlparse: Utilities for parsing query strings.
- from uuid import UUID: For validating UUIDs in headers.
- def validate_request_meta(...): Define a function to validate both query and headers.
- parsed = parse_qs(query): Convert a query string into a dictionary of lists.
- limit_str = parsed.get("limit", [""])[0]: Extract the first value for limit, if present.
- if limit_str: Attempt to coerce to int and enforce range 1-100 with clear errors.
- else: Provide a sensible default for limit.
- search = parsed.get("search", [""])[0]: Extract search term; ensure string type.
- request_id = headers.get("X-Request-ID"): Read a custom header.
- if request_id: Validate that it is a valid UUID; otherwise error.
- return a sanitized dict with validated fields.

Code example: safe SQL usage vs unsafe string concatenation (to prevent SQL injection)
```python
import sqlite3

def bad_query(conn: sqlite3.Connection, username: str):
    # Vulnerable: string formatting can allow injection
    sql = f"SELECT * FROM users WHERE username = '{username}'"
    return conn.execute(sql).fetchall()

def good_query(conn: sqlite3.Connection, username: str):
    # Safe: parameterized query prevents injection
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    return cur.fetchall()
```

### Line-by-line explanation
- import sqlite3: Use a lightweight in-process database for demonstration.
- def bad_query(...): Show a dangerous pattern that interpolates user input directly into SQL.
- sql = f"...": Build the SQL string with user-provided username; injects input directly.
- return conn.execute(sql).fetchall(): Execute and return results.
- def good_query(...): Show a safe pattern using parameter binding.
- cur = conn.cursor(): Obtain a cursor for executing queries.
- cur.execute("SELECT ... WHERE username = ?", (username,)): Pass input as a parameter instead of string formatting.
- return cur.fetchall(): Retrieve results safely.

Code example: HTML rendering with escaping to prevent XSS
```python
import html

def render_user_profile(name: str, bio: str) -> str:
    safe_name = html.escape(name)
    safe_bio = html.escape(bio)
    return f"<div><h1>{safe_name}</h1><p>{safe_bio}</p></div>"
```

### Line-by-line explanation
- import html: Access HTML escaping utilities.
- def render_user_profile(...): Define a simple renderer.
- safe_name = html.escape(name): Escape potentially dangerous characters in the name.
- safe_bio = html.escape(bio): Escape the bio to prevent HTML injection.
- return f"...": Use escaped values to render safe HTML.

## 5. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Relying on default language typing instead of runtime checks
  Bad:
  ```python
  def greet(user: dict) -> str:
      return f"Hello {user['name']}"
  ```
  Good:
  ```python
  def greet(user: dict) -> str:
      if not isinstance(user, dict):
          raise TypeError("user must be a dict")
      if "name" not in user or not isinstance(user["name"], str):
          raise ValueError("name must be a string")
      return f"Hello {user['name']}"
  ```

- Pitfall 2: Skipping nested validation on JSON structures
  Bad:
  ```python
  def process(payload: dict):
      # Assume presence of 'items' and process directly
      for item in payload["items"]:
          do_something(item["value"])
  ```
  Good:
  ```python
  def process(payload: dict):
      if not isinstance(payload, dict) or "items" not in payload:
          raise ValueError("payload must contain 'items'")
      items = payload["items"]
      if not isinstance(items, list):
          raise ValueError("'items' must be a list")
      for item in items:
          if not isinstance(item, dict) or "value" not in item:
              raise ValueError("each item must be {'value': ...}")
          do_something(item["value"])
  ```

- Pitfall 3: Printing or leaking internal errors to clients
  Bad:
  ```python
  def login(username: str, password: str):
      # pretend a DB error occurs
      raise Exception("DB failure: cannot connect to users table")
  ```
  Good:
  ```python
  def login(username: str, password: str):
      try:
          # pretend a DB operation
          pass
      except DatabaseError as e:
          # Log internal error
          log_error("DB failure during login", exc=e)
          # Return safe, generic error to client
          raise ValueError({"error": "invalid_credentials"})
  ```

- Pitfall 4: Not validating data types for optional fields
  Bad:
  ```python
  def display_profile(p):
      name = p.get("name")
      bio = p.get("bio")  # could be None or non-string
      return f"{name}: {bio}"
  ```
  Good:
  ```python
  def display_profile(p):
      if not isinstance(p, dict): raise ValueError("payload must be a dict")
      name = p.get("name")
      bio = p.get("bio", "")
      if name is not None and not isinstance(name, str): raise ValueError("name must be string")
      if bio is not None and not isinstance(bio, str): bio = ""
      return f"{name}: {bio}"
  ```

- Pitfall 5: Piazza of hand-rolled security checks without defense-in-depth
  Bad:
  ```python
  def is_valid_email(email):
      return "@" in email
  ```
  Good:
  ```python
  import re
  EMAIL_RE = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")
  def is_valid_email(email):
      return isinstance(email, str) and EMAIL_RE.match(email) is not None
  ```
  Bad vs Good Side-by-Side Summary
  - Bad: minimal checks, no type enforcement, leaks on errors, and unsafe SQL or HTML handling.
  - Good: explicit type checks, thorough constraints, structured errors, and safe data handling (parameterized queries, escaping).

## 6. Why This Matters In Real Systems

- Security: Prevents SQL injection, XSS, and header-based attacks that can compromise data and compute resources.
- Reliability: Validated inputs prevent downstream exceptions, data corruption, and cascading failures under load.
- Compliance: Many regulations require input validation and secure handling of PII, passwords, and auth tokens.
- Maintainability: Clear validation logic makes refactoring safer and reduces bug-trajectory in production.
- UX and API contracts: Consistent error messages, status codes, and data shapes improve client integration and debugging.

In production, input validation often sits at the boundary of your system: controllers or request handlers invoke validators that sanitize, coerce, and normalize data before business logic runs. Proper error handling converts internal validation failures into predictable HTTP responses (e.g., 400 Bad Request, 422 Unprocessable Entity) with actionable messages for clients while avoiding exposure of sensitive internals.

## 7. Study Questions — 5 recall questions

1) Why is input validation considered a first-class security control in web servers?
2) What are the benefits of schema-based validation over ad-hoc checks?
3) How do you defensively handle JSON parsing errors without leaking internal details?
4) What is the difference between using parameterized queries and string concatenation in SQL, and why does it matter?
5) Provide an example of escaping or sanitizing output to prevent XSS when rendering user-provided content in HTML.

## 8. Exercise — Build a robust, reusable input validator

This multi-part exercise helps you implement a small, self-contained validation module and a simple test harness.

Part A: Create a module validator.py with a user payload validator
- Implement validate_registration(payload: dict) -> dict
  - Required fields: username (3-30 chars, alphanumeric + underscore), email (valid format), password (min 8 chars, includes upper, lower, and digit).
  - Optional fields: age (int 0-120), bio (string, max 160 chars).
  - Behavior: If validation fails, raise ValueError({"errors": {field: message, ...}}).
  - Return a sanitized dict with only validated fields: username, email, password, age, bio.
- Use explicit type checks, regex, and a single cohesive error structure.

Part B: Create a small test harness in exercise_run.py
- Provide at least four payload examples:
  - Valid payload (should return sanitized payload).
  - Missing required field (should raise with field errors).
  - Invalid email format, weak password, and age out of range (aggregate errors).
  - Extra fields should be ignored in the returned payload (ensuring only defined fields survive).
- Print outcomes for each payload: success payload or error details.

Part C: Optional: Quick unit tests (no external libs)
- Write a tiny unittest-based test file test_validator.py with tests corresponding to Part B cases.
- Ensure tests run with Python's standard library (no dependencies).

Part D: Integrate with a dummy request-like flow (optional)
- Add a function simulate_request(raw_json: str) that:
  - Parses raw_json using load_json_safe (Section 3).
  - Validates with validate_registration (Section 2).
  - Returns a success dict or a structured error dict consistent with previous behavior.

Sample code skeleton for Part A (you can fill in details as you build):
```python
# validator.py
import re
from typing import Dict, Any

def validate_registration(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Implement full validation as described
    pass
```

Sample code snippet to run Part A with a valid payload:
```python
from validator import validate_registration

payload = {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "Secret123",
    "age": 30,
    "bio": "Software engineer enjoying clean code."
}
validated = validate_registration(payload)
print("Validated payload:", validated)
```

Explanation prompt
- Explain how you would extend this to handle nested structures (e.g., profile objects), how to integrate with a web framework (Flask/FastAPI), and how to map validation errors to HTTP 400/422 responses.
- Outline potential performance considerations for large payloads and high-concurrency scenarios.

End of lesson.