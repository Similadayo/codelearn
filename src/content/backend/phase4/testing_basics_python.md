# Testing Basics — Unit & Integration Tests in Python (Backend Engineering, Phase 4)

Testing is the safety net that keeps backend systems reliable as they scale. This lesson covers unit tests (testing small, isolated pieces of code) and integration tests (testing how components work together, often with a running web server). You’ll learn how to structure tests in Python, use pytest, mock dependencies, and validate both logic and API behavior in a production-like environment.

## 1. Unit Testing Fundamentals

Unit tests verify the smallest units of behavior in isolation from the rest of the system. They are fast, deterministic, and encourage good design through dependency boundaries.

Code: utils.py (small, pure functions)
```python
# utils.py
from typing import Optional
import re

def clamp(value: int, min_value: int, max_value: int) -> int:
    """Clamp value to the [min_value, max_value] range."""
    return max(min_value, min(value, max_value))

def format_price(price: float) -> str:
    """Format a float as a currency string with two decimals."""
    return f"${price:.2f}"

def is_valid_email(email: str) -> bool:
    """Return True if the string looks like a valid email."""
    pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    return bool(re.match(pattern, email))
```

Code: tests/test_utils.py (unit tests for utils.py)
```python
# tests/test_utils.py
import utils

def test_clamp_inside():
    assert utils.clamp(5, 0, 10) == 5

def test_clamp_lower_bound():
    assert utils.clamp(-2, 0, 10) == 0

def test_clamp_upper_bound():
    assert utils.clamp(12, 0, 10) == 10

def test_format_price():
    assert utils.format_price(3) == "$3.00"
    assert utils.format_price(9.5) == "$9.50"

def test_is_valid_email():
    assert utils.is_valid_email("alice@example.com")
    assert not utils.is_valid_email("not-an-email")
```

### Line-by-line explanation

- utils.py
  - Line 1: Import Optional (not used here, can be omitted; shown for typical type hints) and re for regex matching.
  - Line 3: Define clamp(value, min_value, max_value) to bound value within the given range.
  - Line 4: Docstring describing the function’s purpose.
  - Line 5: Return the lower bound if value is below min_value, else return the min of value and max_value.
  - Line 7: Define format_price(price) to format a numeric price as a string with two decimals.
  - Line 8: Docstring describing the function’s purpose.
  - Line 9: Return a string like "$12.34" using f-string formatting.
  - Line 11: Define is_valid_email(email) to check a basic email structure.
  - Line 12: Pattern for a simple email validation (no spaces, contains @ and a dot after @).
  - Line 13: Return True if the regex matches, else False.

- tests/test_utils.py
  - Line 1: Import the utils module to access its functions.
  - Line 3: Test clamp in the middle of the range.
  - Line 5: Test clamp when value is below the minimum bound.
  - Line 7: Test clamp when value is above the maximum bound.
  - Line 9: Test format_price formatting for an integer price.
  - Line 10: Test format_price formatting for a decimal price.
  - Line 12: Test a valid email pattern.
  - Line 13: Ensure an invalid email is rejected.

## 2. Testing Web Endpoints with FastAPI

Testing web endpoints involves validating the HTTP interface, input validation, and error handling. This often requires a running app instance or a test client.

Code: app.py (FastAPI app with in-memory store)
```python
# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict

app = FastAPI()

# Simple in-memory "database" (example only)
db: Dict[str, dict] = {}

class Item(BaseModel):
    id: str
    name: str
    price: float

@app.post("/items/", status_code=201)
def create_item(item: Item):
    if item.id in db:
        raise HTTPException(status_code=400, detail="Item already exists")
    db[item.id] = item.dict()
    return item

@app.get("/items/{item_id}")
def read_item(item_id: str):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    return db[item_id]
```

Code: tests/test_app.py (integration tests against the FastAPI app)
```python
# tests/test_app.py
from fastapi.testclient import TestClient
from app import app, db

client = TestClient(app)

# Reset DB before and after tests to avoid cross-test interference
def reset_db():
    db.clear()

def test_create_item():
    reset_db()
    payload = {"id": "item1", "name": "Widget", "price": 9.99}
    resp = client.post("/items/", json=payload)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Widget"

def test_read_item():
    reset_db()
    client.post("/items/", json={"id": "item1", "name": "Widget", "price": 9.99})
    resp = client.get("/items/item1")
    assert resp.status_code == 200
    assert resp.json()["price"] == 9.99

def test_read_missing():
    reset_db()
    resp = client.get("/items/missing")
    assert resp.status_code == 404
```

### Line-by-line explanation

- app.py
  - Line 1: Import FastAPI and HTTPException for building the API and handling errors.
  - Line 2: Import BaseModel from Pydantic for request validation.
  - Line 3: Import Dict for typing the in-memory store.
  - Line 5: Create a FastAPI instance named app.
  - Line 8: Declare an in-memory dictionary db to simulate a datastore.
  - Line 10-14: Define Item as a Pydantic model with id, name, and price.
  - Line 16-22: POST /items/ endpoint:
    - Line 16: Define the function create_item with an Item model parsed from the body.
    - Line 17: If the item ID already exists, raise a 400 error.
    - Line 18: Save the item to the in-memory db.
    - Line 19: Return the created item (FastAPI will serialize to JSON).
  - Line 24-29: GET /items/{item_id} endpoint:
    - Line 25: If the item_id is not in db, raise a 404 error.
    - Line 28: Return the item data from db.

- tests/test_app.py
  - Line 1: Import the FastAPI test client.
  - Line 2: Import the app and the db object to reset state between tests.
  - Line 4: Instantiate TestClient with the FastAPI app.
  - Line 7-8: Define a helper reset_db to clear the in-memory store.
  - Line 10-15: Test creating a new item and asserting a 201 status and correct payload.
  - Line 17-22: Test reading an existing item by first creating it, then fetching and asserting payload.
  - Line 24-29: Test reading a missing item returns a 404.

## 3. Mocking and Dependency Injection

Mocking lets you replace real dependencies with controlled test doubles, so you can verify behavior in isolation and simulate edge cases (e.g., slow or failing dependencies).

Code: service.py (dependency-injected access pattern)
```python
# service.py
from typing import Optional, Protocol

class UserRepository(Protocol):
    def get_user(self, user_id: str) -> Optional[dict]:
        ...

def get_profile(user_id: str, repo: UserRepository) -> dict:
    user = repo.get_user(user_id)
    if user is None:
        raise ValueError("User not found")
    return {"id": user_id, "name": user["name"]}
```

Code: tests/test_service.py (unit test with a fake repository)
```python
# tests/test_service.py
from service import get_profile

class FakeRepo:
    def get_user(self, user_id: str) -> dict:
        if user_id == "u1":
            return {"name": "Alice"}
        return None

def test_get_profile():
    repo = FakeRepo()
    profile = get_profile("u1", repo)
    assert profile == {"id": "u1", "name": "Alice"}

def test_get_profile_not_found():
    repo = FakeRepo()
    try:
        get_profile("missing", repo)
        assert False, "Expected ValueError"
    except ValueError:
        pass
```

### Line-by-line explanation

- service.py
  - Line 1-2: Import Optional and Protocol to define a testable repository interface.
  - Line 4-6: Define UserRepository as a Protocol with a single method get_user. This enables structural typing and easy mocking.
  - Line 8-12: Define get_profile that accepts a user_id and a repo implementing UserRepository.
  - Line 9: Call repo.get_user(user_id) to fetch user data.
  - Line 10-12: If no user found, raise a ValueError indicating not found.
  - Line 13-14: If user exists, return a simple profile dictionary.

- tests/test_service.py
  - Line 1: Import the function under test.
  - Line 3-9: Define a simple FakeRepo with a deterministic behavior for a known user and None for others.
  - Line 11-15: Test the happy path by asserting the returned profile matches the fake data.
  - Line 17-23: Test the not-found path by asserting a ValueError is raised for a missing user.

## X. Common Beginner Mistakes

Real-world tests quickly slip into fragile or unusable patterns. Here are common pitfalls with bad vs good code patterns.

- Pitfall 1: Not isolating tests from I/O or network
  - Bad:
    ```python
    # bad
    import requests

    def fetch_price(item_id):
        r = requests.get(f"https://api.example.com/items/{item_id}")
        return r.json()["price"]
    ```
    - This makes tests flaky (depends on network, API changes) and slow.
  - Good:
    ```python
    # good
    def fetch_price(item_id, http_get):
        r = http_get(f"https://api.example.com/items/{item_id}")
        data = r.json()
        return data["price"]
    ```
    - Dependency injection allows you to supply a mock http_get during tests, keeping unit tests fast and deterministic.

- Pitfall 2: Flaky tests due to global state
  - Bad:
    ```python
    # bad
    db = {}

    def add_item(item):
        db[item["id"]] = item
        return item
    ```
    - Tests may pass or fail depending on test order and global state.
  - Good:
    ```python
    # good
    from typing import Dict

    def add_item(item, store: Dict[str, dict]):
        store[item["id"]] = item
        return item
    ```
    - Use local or fixture-scoped stores to isolate tests. Clear fixtures before each test.

- Pitfall 3: Not testing error handling
  - Bad:
    ```python
    def get_user(user_id):
        # assume user exists
        return {"id": user_id, "name": "Test"}
    ```
    - No coverage for missing user or invalid input.
  - Good:
    ```python
    def get_user(user_id, repo):
        user = repo.get_user(user_id)
        if user is None:
            raise ValueError("User not found")
        return user
    ```
    - Tests cover both success and failure paths.

- Pitfall 4: Over-mocking or testing implementation details
  - Bad:
    ```python
    def sanitize(input_str):
        return input_str.strip()

    def test_sanitize_calls_strip(monkeypatch):
        called = {"strip": False}
        def fake_strip(s):
            called["strip"] = True
            return s
        monkeypatch.setattr(str, "strip", fake_strip)
        assert sanitize(" x ") == "x"
        assert called["strip"] is True
    ```
    - Ties tests too closely to Python internals; brittle.
  - Good:
    ```python
    def sanitize(input_str: str) -> str:
        return input_str.strip()

    def test_sanitize_basic():
        assert sanitize(" x ") == "x"
    ```
    - Focus on behavior, not internal calls.

- Pitfall 5: Not using pytest fixtures for setup/teardown
  - Bad:
    ```python
    def test_flow():
        # setup
        clear_database()
        # test
        assert run_flow() == True
        # teardown
        clear_database()
    ```
  - Good:
    ```python
    import pytest

    @pytest.fixture
    def reset_db():
        clear_database()
        yield
        clear_database()

    def test_flow(reset_db):
        assert run_flow() == True
    ```
    - Fixtures provide reusable and deterministic setup/teardown.

## Y. Why This Matters In Real Systems

- Quality assurance and CI: Unit tests catch regressions early, integration tests verify end-to-end flows, and automated tests run in CI when code changes.
- Test Pyramid discipline: A solid ratio of unit tests, component tests, and integration tests reduces feedback time and improves confidence.
- Determinism and reliability: Tests must be deterministic and fast; flaky tests undermine trust and waste time.
- Realistic test data: Use fixtures, factories, or synthetic data to reflect production scenarios without touching real data stores.
- Isolation vs. integration: Unit tests isolate logic; integration tests validate interactions between components (e.g., API, DB, caching) in a staging-like environment.
- Dependency management: Use mocks and dependency injection to control external systems (APIs, DBs, message queues) in tests without requiring them to be live.
- Performance considerations: Tests should remain fast; for performance-sensitive code, use targeted benchmarks separate from functional tests.

## Z. Study Questions

1. What is the difference between a unit test and an integration test?
2. Why is dependency injection helpful in unit tests?
3. How can you prevent flaky tests caused by shared global state?
4. What is a testing pyramid, and why should you follow它?
5. How would you test a FastAPI endpoint without touching a real database?

## Exercise

You will build a small but complete testing exercise that exercises both unit-level utilities and a simple web API with tests.

Part A — Create a tiny module with pure functions
- Implement a module notes.py containing:
  - A Note dataclass with id (str) and content (str).
  - A NoteRepository protocol with methods add(note), get(note_id), list().
  - An in-memory implementation InMemoryNoteRepository that stores notes in a dict.
  - A pure function summarize(note: Note) -> str that returns the first 20 characters of the content with ellipsis if longer.

Part B — Build a FastAPI app around notes
- Implement a FastAPI app in main.py with endpoints:
  - POST /notes/ to create a note (inject a repository).
  - GET /notes/{note_id} to fetch a note by ID.
  - GET /notes/ to list all notes.
- Ensure you can swap the repository via dependency injection (e.g., using a dependency override in FastAPI).

Part C — Write unit and integration tests
- Unit tests for notes.summarize() and for InMemoryNoteRepository behavior.
- Integration tests for the API endpoints using a test repository instance (no real DB).
- Also write a test that uses a small mock to simulate a failing repository when fetching a note.

Part D — Run and reflect
- Run the tests in a clean environment (pytest) and ensure they pass.
- Document any design decisions you made to keep tests fast, deterministic, and maintainable.

Notes:
- You can provide starter code snippets for Part A and Part B, but the core goal is to implement and validate both unit and integration aspects with pytest in a coherent project layout.
- If you prefer, you can adapt the exercise to your existing stack (e.g., use Flask or FastAPI). The testing patterns remain the same.

End of lesson.