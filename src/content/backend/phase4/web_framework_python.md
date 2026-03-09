# Track: Backend Engineering — Module: Phase 4 — Building Web Servers — Topic: Your First Web Server with a Framework (Python)

Building a web server with a framework like Flask dramatically lowers boilerplate and helps you focus on business logic, routing, and data handling. In this lesson, you’ll spin up a minimal Flask app, define routes, handle requests and responses, run the server in development and production-like environments, and recognize common pitfalls. By the end, you’ll have a working API you can expand into real services in production systems.

## 1. Getting Started with Flask
Introduce a minimal web server using Flask so you can see HTTP routing and basic request handling in action.

```python
# app.py
from flask import Flask

app = Flask(__name__)

@app.route("/", methods=["GET"])
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    # Development server: suitable for local testing
    app.run(host="0.0.0.0", port=5000, debug=True)
```

### Line-by-line explanation
1. from flask import Flask
   - Import the Flask class to create an application instance.
2. app = Flask(__name__)
   - Create a Flask application object. __name__ tells Flask where to look for resources.
3. @app.route("/", methods=["GET"])
   - Define a route for the root URL. Accepts only GET requests.
4. def hello():
   - The function executed when the route is requested.
5. return "Hello, World!"
   - Return a plain text HTTP response with a 200 OK status.
6. if __name__ == "__main__":
   - Ensure the script runs only when executed directly, not when imported.
7. app.run(host="0.0.0.0", port=5000, debug=True)
   - Start Flask’s development server, listening on all interfaces at port 5000. debug=True enables automatic reload and helpful error pages during development.

## 2. Routing and Request Handling
Learn how to define multiple routes, accept path parameters, and read query parameters and request bodies.

```python
# app.py (expanded)
from flask import Flask, request, jsonify

app = Flask(__name__)

# Simple dynamic route
@app.route("/hello/<name>", methods=["GET"])
def greet(name):
    return jsonify({"message": f"Hello, {name}!"})

# Query parameter example
@app.route("/sum", methods=["GET"])
def add():
    try:
        a = int(request.args.get("a", "0"))
        b = int(request.args.get("b", "0"))
        return jsonify({"sum": a + b})
    except ValueError:
        return jsonify({"error": "Invalid numeric inputs"}), 400

# POST with JSON body
@app.route("/echo", methods=["POST"])
def echo():
    data = request.get_json(force=True) or {}
    return jsonify({"received": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

### Line-by-line explanation
1. from flask import Flask, request, jsonify
   - Import needed utilities: Flask for the app, request for incoming data, jsonify to produce JSON responses.
2. app = Flask(__name__)
   - Create the application instance as before.
3. @app.route("/hello/<name>", methods=["GET"])
   - Define a dynamic route capturing a string parameter name from the path.
4. def greet(name):
   - Handler function receives the path variable name.
5. return jsonify({"message": f"Hello, {name}!"})
   - Return a JSON response with a friendly greeting.
6. @app.route("/sum", methods=["GET"])
   - Route to perform a simple addition using query params.
7. def add():
   - Handler for sum calculation.
8. a = int(request.args.get("a", "0"))
   - Read query parameter a, default to 0, convert to int.
9. b = int(request.args.get("b", "0"))
   - Read query parameter b, default to 0, convert to int.
10. return jsonify({"sum": a + b})
    - Return the computed sum as JSON.
11. except ValueError:
    - Catch non-integer inputs and respond with an error.
12. return jsonify({"error": "Invalid numeric inputs"}), 400
    - Return error message with a 400 Bad Request status.
13. @app.route("/echo", methods=["POST"])
    - Define a POST endpoint that echoes back the received JSON.
14. def echo():
    - Handler for echoing input.
15. data = request.get_json(force=True) or {}
    - Parse JSON body; force=True allows JSON even if Content-Type is not set.
16. return jsonify({"received": data})
    - Return what was received in a JSON object.
17. if __name__ == "__main__":
    - Ensure the app can be run directly.
18. app.run(host="0.0.0.0", port=5000, debug=True)
    - Start the server for development with live reload.

## 3. Working with JSON and Responses
Explore returning JSON payloads, custom status codes, and setting headers to help clients interpret responses.

```python
# app.py (JSON-focused)
from flask import Flask, request, jsonify, Response

app = Flask(__name__)

@app.route("/status", methods=["GET"])
def status():
    resp = jsonify({"status": "ok"})
    resp.status_code = 200
    resp.headers["X-Frame-Options"] = "DENY"
    return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

### Line-by-line explanation
1. from flask import Flask, request, jsonify, Response
   - Import Flask, request, jsonify for responses, and Response if you need low-level control.
2. app = Flask(__name__)
   - Create the app instance.
3. @app.route("/status", methods=["GET"])
   - Define a status endpoint to report health or readiness.
4. def status():
   - Handler function for the status endpoint.
5. resp = jsonify({"status": "ok"})
   - Create a JSON response payload indicating healthy status.
6. resp.status_code = 200
   - Explicitly set HTTP status code (200 OK).
7. resp.headers["X-Frame-Options"] = "DENY"
   - Add a security-related header to discourage framing.
8. return resp
   - Return the prepared response object.
9. if __name__ == "__main__":
   - Standard Python entry-point check.
10. app.run(host="0.0.0.0", port=5000, debug=True)
    - Run the development server.

## 4. Running and Deploying
Understand how to run a Flask app in development and how to prepare for production with a WSGI server like Gunicorn.

```bash
# Development (quick local test)
python app.py
```

```bash
# Production-like server (Gunicorn)
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

```python
# app.py (production-ready guard)
from flask import Flask
app = Flask(__name__)

@app.route("/", methods=["GET"])
def home():
    return "Hello from Flask in production-like setup!"

if __name__ == "__main__":
    # In production, you typically do not call app.run.
    # This guard is present for local testing.
    app.run(host="0.0.0.0", port=5000)
```

### Line-by-line explanation
1. # Development (quick local test)
2. python app.py
   - Runs the Flask development server defined in app.py, suitable for quick local testing. It is not recommended for production due to performance and security constraints.
3. # Production-like server (Gunicorn)
4. gunicorn -w 4 -b 0.0.0.0:8000 app:app
   - Launch Gunicorn with 4 worker processes, binding to port 8000. app:app tells Gunicorn to import the app instance from app.py.
5. # app.py (production-ready guard)
6. from flask import Flask
7. app = Flask(__name__)
8. @app.route("/", methods=["GET"])
9. def home():
10.     return "Hello from Flask in production-like setup!"
11. if __name__ == "__main__":
12.     app.run(host="0.0.0.0", port=5000)
    - This block is primarily for local testing; in production, Gunicorn (or another WSGI server) handles serving.

## 5. Basic Testing with curl
Verify endpoints quickly from the command line.

```bash
# Simple GET
curl -s http://localhost:5000/

# Dynamic route with path parameter
curl -s http://localhost:5000/hello/Alice

# Sum with query parameters
curl -s "http://localhost:5000/sum?a=3&b=7"

# Echo POST with JSON
curl -s -X POST -H "Content-Type: application/json" -d '{"foo": "bar"}' http://localhost:5000/echo
```

### Line-by-line explanation
1. curl -s http://localhost:5000/
   - Sends a GET request to the root endpoint. The -s flag silences progress metrics for clean output.
2. curl -s http://localhost:5000/hello/Alice
   - Accesses the dynamic route with path parameter name = "Alice".
3. curl -s "http://localhost:5000/sum?a=3&b=7"
   - Calls the /sum endpoint with query parameters a=3 and b=7 to compute 10.
4. curl -s -X POST -H "Content-Type: application/json" -d '{"foo": "bar"}' http://localhost:5000/echo
   - Posts JSON data to /echo and returns it back in the response.

## X. Common Beginner Mistakes
Three common pitfalls and how to fix them, with bad vs good examples.

| Bad | Good |
| --- | --- |
| ```python
# Bad: Mutating a global list across requests without thread-safety
items = []
@app.route("/items", methods=["POST"])
def add_item():
    data = request.get_json()
    items.append(data)
    return jsonify({"items": items})
``` | ```python
# Good: Use a proper data store (e.g., a database) or a thread-safe approach
# For demonstration, store in a local per-request scope and don't mutate shared state
from threading import Lock
_lock = Lock()
-items = []
-@app.route("/items", methods=["POST"])
-def add_item():
-    data = request.get_json()
-    with _lock:
-        _items.append(data)
-    return jsonify({"items": list(_items)})
+_items = []
+_lock = Lock()
+@app.route("/items", methods=["POST"])
+def add_item():
+    data = request.get_json()
+    if not isinstance(data, dict):
+        return jsonify({"error": "Invalid payload"}), 400
+    with _lock:
+        _items.append(data)
+        current = list(_items)
+    return jsonify({"items": current})
``` |
| Bad: ```python
# Bad: Assume query params exist and are valid
a = int(request.args.get("a"))
b = int(request.args.get("b"))
``` | Good: ```python
# Good: Validate inputs and provide defaults
def add():
    try:
        a = int(request.args.get("a", 0))
        b = int(request.args.get("b", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid inputs"}), 400
    return jsonify({"sum": a + b})
``` |
| Bad: Returning 200 for errors or exposing stack traces in production | Good: Use proper status codes and avoid exposing internals
```python
# Bad
@app.errorhandler(Exception)
def handle(e):
    return "Internal Server Error"  # not ideal; still 500 but no details

# Good
@app.errorhandler(Exception)
def handle(e):
    # Log error details securely
    app.logger.exception("Unhandled exception")
    return jsonify({"error": "Internal Server Error"}), 500
``` |


## Y. Why This Matters In Real Systems
- Correct routing and request handling are the foundation of API-backed services. Well-structured endpoints enable clear contracts with clients (front-end apps, mobile apps, other services).
- Production considerations: thread-safety and concurrency (Flask runs on WSGI servers that can handle multiple workers), proper error handling, and meaningful HTTP status codes are essential for reliability.
- Observability: add logging, metrics, and health checks. A health endpoint (e.g., /healthz or /status) informs orchestrators (Kubernetes, load balancers) when to route traffic away from unhealthy instances.
- Security and compliance: validate inputs, sanitize outputs, set appropriate headers, and avoid exposing stack traces or secrets.
- Deployment hygiene: containerization, environment-driven configuration, and a dedicated production server (Gunicorn/Uvicorn) improve scalability and maintainability.

## Z. Study Questions
1. What is the purpose of using a WSGI server like Gunicorn for Flask apps in production?
2. How do you read a path parameter vs a query parameter in Flask?
3. What HTTP status code should you return for a client-provided bad request, and why?
4. How can you return JSON responses from Flask and include custom headers?
5. Why is it risky to mutate global state in a web server, and what are safer alternatives?

## Exercise
Build and extend a small Flask API in a single file (app.py) to solidify your understanding. Complete all parts below and run tests locally.

Part A — Create a minimal API
- Implement a Flask app with two endpoints:
  - GET /ping -> returns {"pong": true}
  - POST /mirror -> accepts JSON payload and echoes it back as {"mirror": <payload>}

Part B — Add a simple in-memory store (with a caveat)
- Introduce a thread-safe in-memory list of messages, exposed via:
  - GET /messages -> returns [{"id": <int>, "text": <string>}...]
  - POST /messages -> accepts JSON {"text": "<string>"} and appends to the list with an auto-incremented id.
- Note: This is for learning; in real systems you’d use a database.

Part C — Health and validation
- Add GET /healthz that returns {"status": "healthy"}.
- Validate POST /messages input: require "text" key as a non-empty string; return 400 on invalid input.

Part D — Run locally and document
- Provide a short README-style section in your code comments describing run commands:
  - Development: python app.py
  - Production-like: gunicorn -w 2 -b 0.0.0.0:8000 app:app

Part E — Basic tests (curl)
- Show sample curl commands to exercise all endpoints you implemented.

Deliverables:
- A single app.py containing all parts.
- A brief README.md snippet in your code comments describing how to run in both dev and production-like modes.
- Brief notes on potential improvements (e.g., replacing in-memory store with a database, adding tests, and adding authentication).