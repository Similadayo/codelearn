# HTTP In Depth — Methods, Headers, and Status Codes (Python)

Compelling introductory paragraph: In modern backend systems, clients and servers communicate primarily through HTTP. Understanding the nuanced behavior of HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.), how to correctly use headers to negotiate payloads and caching, and when to return which status codes is essential for building robust, scalable APIs. Mastery of these concepts leads to clearer contracts between services, better client compatibility, and easier debugging in production.

## 1. HTTP Methods: Semantics, Idempotence, Safety, and Examples

Code sample: A small Flask app illustrating core HTTP methods and their semantic expectations, plus a simple Python client using requests to exercise them.

```python
# server.py
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory store for demonstration purposes
resources = {
    1: {"id": 1, "name": "Widget", "price": 9.99},
}

def to_json_response(payload, status=200, headers=None):
    resp = jsonify(payload)
    if headers:
        for k, v in headers.items():
            resp.headers[k] = v
    resp.status_code = status
    return resp

@app.route("/resources", methods=["GET"])
def list_resources():
    return to_json_response({"resources": list(resources.values())})

@app.route("/resources", methods=["POST"])
def create_resource():
    data = request.get_json(force=True) if request.is_json else {}
    if "name" not in data or "price" not in data:
        return to_json_response({"error": "Missing 'name' or 'price'."}, status=400)
    new_id = max(resources.keys(), default=0) + 1
    resource = {"id": new_id, "name": data["name"], "price": data["price"]}
    resources[new_id] = resource
    headers = {
        "Location": f"/resources/{new_id}"
    }
    return to_json_response(resource, status=201, headers=headers)

@app.route("/resources/<int:rid>", methods=["GET", "PUT", "PATCH", "DELETE"])
def resource_by_id(rid):
    if rid not in resources:
        return to_json_response({"error": "Not found."}, status=404)

    if request.method == "GET":
        return to_json_response(resources[rid])

    if request.method == "PUT":
        data = request.get_json(force=True) if request.is_json else {}
        if "name" not in data or "price" not in data:
            return to_json_response({"error": "Missing 'name' or 'price'."}, status=400)
        resources[rid] = {"id": rid, "name": data["name"], "price": data["price"]}
        return to_json_response(resources[rid])

    if request.method == "PATCH":
        data = request.get_json(force=True) if request.is_json else {}
        resources[rid].update({k: v for k, v in data.items() if k in ["name", "price"]})
        return to_json_response(resources[rid])

    if request.method == "DELETE":
        del resources[rid]
        return "", 204  # No content

if __name__ == "__main__":
    app.run(debug=True)
```

```python
# client.py
import requests

BASE = "http://127.0.0.1:5000"

# GET
r = requests.get(f"{BASE}/resources")
print("GET /resources ->", r.status_code, r.json())

# POST (create)
payload = {"name": "Gadget", "price": 14.99}
r = requests.post(f"{BASE}/resources", json=payload)
print("POST /resources ->", r.status_code, r.json(), "Location:", r.headers.get("Location"))

# PUT (full update)
updated = {"name": "Gadget Pro", "price": 19.99}
r = requests.put(f"{BASE}/resources/2", json=updated)
print("PUT /resources/2 ->", r.status_code, r.json())

# PATCH (partial update)
patch = {"price": 17.99}
r = requests.patch(f"{BASE}/resources/2", json=patch)
print("PATCH /resources/2 ->", r.status_code, r.json())

# GET single resource
r = requests.get(f"{BASE}/resources/2")
print("GET /resources/2 ->", r.status_code, r.json())

# DELETE
r = requests.delete(f"{BASE}/resources/2")
print("DELETE /resources/2 ->", r.status_code)
```

### Line-by-line explanation
- server.py
- Import Flask utilities and create a minimal app to demonstrate resource operations.
- The in-memory resources dictionary acts as a tiny datastore for demonstration; in real systems this would be a database.
- to_json_response(...) is a helper to standardize JSON responses and optional headers.
- GET /resources returns the current list of resources as JSON (idempotent, safe).
- POST /resources validates input, creates a new resource with a new ID, and returns 201 Created with a Location header pointing to the new resource.
- The /resources/<rid> route handles:
  - GET: fetch a single resource (200 or 404 if not found).
  - PUT: full replacement of a resource (idempotent; 200 or 404 if not found).
  - PATCH: partial update (non-idempotent if the payload changes state; idempotent in practice for the same payload).
  - DELETE: remove a resource (204 No Content on success).
- client.py demonstrates a simple Python client using the requests library to exercise the API endpoints, printing status codes and payloads.

## 2. HTTP Headers: Accessing and Emitting Headers

Code sample: Reading request headers and setting response headers to negotiate formats, caching, and security hints.

```python
# headers_demo.py
from flask import Flask, request, jsonify, make_response

app = Flask(__name__)

@app.route("/echo-headers", methods=["GET"])
def echo_headers():
    user_agent = request.headers.get("User-Agent", "unknown")
    accept = request.headers.get("Accept", "*/*")
    return jsonify({"user_agent": user_agent, "accept": accept})

@app.route("/cache-demo", methods=["GET"])
def cache_demo():
    resp = make_response(jsonify({"status": "ok"}), 200)
    # Client-side caching hints
    resp.headers["Cache-Control"] = "public, max-age=60"
    # Tell clients what content type to expect
    resp.headers["Content-Type"] = "application/json"
    return resp

@app.route("/secure-endpoint", methods=["GET"])
def secure_endpoint():
    token = request.headers.get("Authorization")
    if token != "Bearer secrettoken":
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"secret": "42"})

if __name__ == "__main__":
    app.run(debug=True)
```

### Line-by-line explanation
- Import Flask utilities including make_response for explicit header control.
- /echo-headers reads a couple of common request headers and returns them in a JSON payload, demonstrating how servers can inspect client preferences.
- /cache-demo constructs a response and injects Cache-Control and Content-Type headers to guide clients and intermediaries about caching and format.
- /secure-endpoint enforces a simple token-based guard by inspecting the Authorization header; returns 401 when missing or invalid, illustrating how headers enable authentication decisions.
- In production, you would typically use robust auth mechanisms (OAuth, JWTs) and more nuanced header handling (Vary, ETag, If-None-Match).

## 3. HTTP Status Codes: When to Use Which

Code sample: A practical set of routes that demonstrate representative status codes, with comments explaining when each is appropriate.

```python
# statuses_demo.py
from flask import Flask, jsonify, request

app = Flask(__name__)

items = {1: {"id": 1, "name": "Widget", "price": 9.99}}

@app.route("/items/<int:item_id>", methods=["GET"])
def get_item(item_id):
    if item_id not in items:
        return jsonify({"error": "Not found"}), 404
    return jsonify(items[item_id]), 200

@app.route("/items", methods=["POST"])
def create_item():
    data = request.get_json() or {}
    if "name" not in data or "price" not in data:
        return jsonify({"error": "Missing fields"}), 400
    new_id = max(items.keys(), default=0) + 1
    items[new_id] = {"id": new_id, "name": data["name"], "price": data["price"]}
    resp = jsonify(items[new_id])
    resp.status_code = 201  # Created
    resp.headers["Location"] = f"/items/{new_id}"
    return resp

@app.route("/items/<int:item_id>", methods=["PUT"])
def replace_item(item_id):
    data = request.get_json() or {}
    if "name" not in data or "price" not in data:
        return jsonify({"error": "Missing fields"}), 400
    items[item_id] = {"id": item_id, "name": data["name"], "price": data["price"]}
    return jsonify(items[item_id]), 200

@app.route("/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    if item_id in items:
        del items[item_id]
        return "", 204  # No Content
    return jsonify({"error": "Not found"}), 404

@app.route("/redirect-example", methods=["GET"])
def redirect_example():
    # An example of 302 Found redirect
    return jsonify({"redirect": "use /items"}), 302

if __name__ == "__main__":
    app.run(debug=True)
```

### Line-by-line explanation
- get_item: Returns 200 with the item if found; 404 if not found.
- create_item: Validates input; on success returns 201 Created and a Location header, guiding clients to the new resource.
- replace_item: Uses PUT semantics to fully replace the resource; 400 for invalid payload.
- delete_item: Deletes and returns 204 No Content on success; 404 if not found.
- redirect_example: Demonstrates how a route can indicate a redirect with 302 Found; in real apps you might use Flask's redirect helper to return 302 with a Location header.

## 4. End-to-End Practical Example: Tiny API with Best Practices

Code sample: A compact Flask-based API that demonstrates creation with Location header, idempotent PUT, safe GETs, and a simple authentication guard.

```python
# ecommerce_api.py
from flask import Flask, request, jsonify

app = Flask(__name__)
notes = {}

def require_api_key(fn):
    def wrapper(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        if api_key != "demo-key":
            return jsonify({"error": "Forbidden"}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

@app.route("/notes", methods=["GET"])
@require_api_key
def list_notes():
    return jsonify({"notes": list(notes.values())})

@app.route("/notes", methods=["POST"])
@require_api_key
def create_note():
    data = request.get_json() or {}
    if "title" not in data:
        return jsonify({"error": "Missing 'title'."}), 400
    new_id = max(notes.keys(), default=0) + 1
    note = {"id": new_id, "title": data["title"], "content": data.get("content", "")}
    notes[new_id] = note
    resp = jsonify(note)
    resp.status_code = 201
    resp.headers["Location"] = f"/notes/{new_id}"
    return resp

@app.route("/notes/<int:note_id>", methods=["GET", "PUT", "DELETE"])
@require_api_key
def note_by_id(note_id):
    if note_id not in notes:
        return jsonify({"error": "Not found"}), 404

    if request.method == "GET":
        return jsonify(notes[note_id])

    if request.method == "PUT":
        data = request.get_json() or {}
        if "title" not in data and "content" not in data:
            return jsonify({"error": "Nothing to update"}), 400
        note = notes[note_id]
        note.update({k: v for k, v in data.items() if k in ["title", "content"]})
        return jsonify(note)

    if request.method == "DELETE":
        del notes[note_id]
        return "", 204

if __name__ == "__main__":
    app.run(debug=True)
```

Client-side tester (optional):

```python
# test_api.py
import requests

BASE = "http://127.0.0.1:5000"
HEADERS = {"X-API-Key": "demo-key", "Accept": "application/json"}

# Create a note
r = requests.post(f"{BASE}/notes", json={"title": "First note", "content": "Hello"}, headers=HEADERS)
print("Created:", r.status_code, r.json(), "Location:", r.headers.get("Location"))

# List notes
r = requests.get(f"{BASE}/notes", headers=HEADERS)
print("List:", r.status_code, r.json())

# Get note by ID
note_id = r.json()["notes"][0]["id"] if r.json()["notes"] else None
if note_id:
    r = requests.get(f"{BASE}/notes/{note_id}", headers=HEADERS)
    print("Get by ID:", r.status_code, r.json())

# Update note
if note_id:
    r = requests.put(f"{BASE}/notes/{note_id}", json={"title": "Updated title"}, headers=HEADERS)
    print("Update:", r.status_code, r.json())

# Delete note
if note_id:
    r = requests.delete(f"{BASE}/notes/{note_id}", headers=HEADERS)
    print("Delete:", r.status_code)
```

### Line-by-line explanation
- ecommerce_api.py shows a compact API that uses an API key header to gate access to all endpoints.
- A simple in-memory store (notes) is used to illustrate CRUD semantics without a database.
- The require_api_key decorator enforces a simple authentication requirement; in production you would replace this with a robust auth mechanism.
- GET /notes returns the current list (read-only, safe).
- POST /notes creates a new note, returns 201 Created and a Location header pointing to the new resource.
- /notes/<note_id> supports GET, PUT, and DELETE with appropriate status codes:
  - GET returns 200 or 404
  - PUT updates fields and returns 200
  - DELETE returns 204 on success
- The client tester demonstrates a typical flow: create, list, retrieve, update, delete, all under the guard of an API key.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: No input validation
Bad:
```python
# bad.py
@app.route("/widgets", methods=["POST"])
def create_widget():
    data = request.get_json()
    widget = {"id": len(widgets) + 1, "name": data["name"], "price": data["price"]}
    widgets.append(widget)
    return jsonify(widget)
```

Good:
```python
# good.py
@app.route("/widgets", methods=["POST"])
def create_widget():
    if not request.is_json:
        return {"error": "JSON required"}, 400
    data = request.get_json()
    if "name" not in data or "price" not in data:
        return {"error": "Missing 'name' or 'price'."}, 400
    widget = {"id": len(widgets) + 1, "name": str(data["name"]), "price": float(data["price"])}
    widgets.append(widget)
    return jsonify(widget), 201
```

### Pitfall 2: Always returning 200, regardless of outcome
Bad:
```python
@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = find_user(user_id)
    return jsonify(user)  # Always 200, even if not found
```

Good:
```python
@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = find_user(user_id)
    if user is None:
        return {"error": "Not found"}, 404
    return jsonify(user), 200
```

### Pitfall 3: Skipping proper header usage
Bad:
```python
@app.route("/data", methods=["GET"])
def data():
    return '{"message": "ok"}'  # No Content-Type header
```

Good:
```python
from flask import Response
@app.route("/data", methods=["GET"])
def data():
    return Response('{"message": "ok"}', status=200, mimetype="application/json")
```

### Pitfall 4: Neglecting security headers and auth
Bad:
```python
@app.route("/secure", methods=["GET"])
def secure():
    return {"secret": "top"}  # No auth check
```

Good:
```python
@app.route("/secure", methods=["GET"])
@require_api_key
def secure():
    return {"secret": "top"}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Correct method semantics drive predictable client behavior and caching.
- Idempotence of GET, PUT, DELETE (and safety of GET/HEAD) underpins cacheability and retry strategies in distributed systems.
- Headers enable content negotiation (Accept, Content-Type), security (Authorization, API keys, CORS), and efficiency (Cache-Control, ETag). Proper header usage reduces latency and load on backends.
- Status codes act as a contract with clients: 200 for success, 201 for creation with Location, 204 for no content after delete/update, 400/401/403/404 for errors, 429 for rate limiting, and 5xx for server errors. Misusing codes leads to hard-to-debug client behavior and poor interoperability.
- Observability: when APIs emit consistent status codes, and log request/response headers and payload sizes, you gain better tracing, alerting, and auditing in production.
- Security: avoid leaking details in error bodies; prefer consistent error shapes and proper authentication/authorization checks. Use content negotiation to avoid surprising payload formats for clients.

## Z. Study Questions — 5 recall questions

1. Which HTTP methods are typically idempotent, and why does that matter for retries?
2. How would you indicate the location of a newly created resource in the response?
3. What headers would you commonly set to guide caching and payload format negotiations?
4. When should you return 404 versus 403, and what is the difference conceptually?
5. How can you ensure a client knows which resources exist at a given URL after creation?

## Exercise — practical multi-part coding challenge

Part A: Build a small Flask API for a "notes" resource
- Requirements:
  - Endpoints: GET /notes, POST /notes, GET /notes/<id>, PUT /notes/<id>, DELETE /notes/<id>
  - Use in-memory storage; no database needed
  - GET operations return 200; POST returns 201 with Location header
  - PUT replaces the entire note; PATCH is not required for this part
  - DELETE returns 204 on success
  - Validate input for POST/PUT (must include title)
  - Use appropriate error statuses (400 for bad input, 404 for not found)

Part B: Add header usage and simple auth
- Add a requirement that all mutating endpoints (POST/PUT/DELETE) require a header X-API-Key with value demo-key; otherwise return 403
- Add Content-Type: application/json on all JSON responses
- Include a Location header on creation

Part C: Create a small Python client to exercise Part A+B
- Implement a script that:
  - Creates a note
  - Lists notes
  - Retrieves the created note
  - Updates it
  - Deletes it
  - Attempts an operation without the API key and handles the 403 response gracefully

Part D: Documentation snippet
- Produce a short README snippet that describes:
  - What each endpoint does
  - The required headers
  - Example curl commands to exercise the API
  - The expected status codes for success and failure

Hints
- Use Flask for rapid prototyping; keep code readable and well-commented.
- Use consistent JSON response shapes for errors, e.g., {"error": "..."}.
- Return appropriate status codes for each operation to mimic real-world RESTful design.

If you’d like, I can provide a fleshed-out solution for Part A–D or tailor the exercise to a specific framework (e.g., FastAPI) or a particular data model.