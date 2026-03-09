# Routing — URL Design and Path Parameters

A solid routing design is the backbone of a maintainable, scalable backend. It defines how clients discover resources, how you model relationships between resources, and how you enforce constraints through path parameters. Well-designed URLs are readable, versioned, and self-descriptive, which reduces on-call confusion, eases client integration, and improves observability in production systems.

## 1. URL Design Principles

In this section we establish best practices for URL design and how path parameters fit into them. We’ll look at resource naming, versioning, nested resources, and when to use path vs query parameters.

```python
# Illustrative URL design patterns (not an app, just guidance)
# These are just string patterns; in real apps you'd register them with a framework.

ROUTES = [
    ("GET",  "/users/<int:user_id>",          "get_user"),
    ("GET",  "/users/<int:user_id>/posts",    "list_user_posts"),
    ("GET",  "/articles/<string:category>/<string:slug>", "get_article"),
    ("POST", "/articles",                      "create_article"),
    ("GET",  "/v2/users/<int:user_id>",        "get_user_v2"),  # versioned API
]
```

### Line-by-line explanation
- ROUTES defines a collection of common, semantically meaningful routes.
- Each tuple includes the HTTP method, the URL pattern with type hints, and a canonical name for the handler.
- Versioning is shown with a /v2/ prefix to illustrate how you can evolve your API without breaking existing clients.
- This snippet is conceptual but helps you reason about design decisions before wiring actual frameworks.

## 2. Path Parameters: Required, Optional, and Type Constraints

Path parameters extract values from the URL path and often drive business logic. They should be typed and validated to prevent runtime errors and to keep routes unambiguous.

```python
# Example using Flask to demonstrate path parameters with types
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    # In a real app, you'd fetch the user from a database
    return jsonify({"user_id": user_id, "name": "Alice"})

@app.route("/articles/<string:category>/<string:slug>", methods=["GET"])
def get_article(category: str, slug: str):
    return jsonify({"category": category, "slug": slug, "title": "Sample Article"})
```

### Line-by-line explanation
- Import Flask and jsonify to build a minimal API.
- Create a Flask app instance.
- Define a route with a required integer path parameter: <int:user_id>. Flask automatically converts and validates the type.
- The handler get_user receives user_id as an int and returns a JSON payload.
- Define another route with two string path parameters: <string:category> and <string:slug>.
- The handler get_article uses both parameters to simulate returning a resource.

### Notes
- Path parameters are typically required; optional path parameters are awkward in the URL path itself and are often better expressed as query parameters or separate routes.
- Use framework-provided converters (int, float, path, etc.) to enforce type constraints early.

## 3. Routing with a Vanilla Python HTTP Server (no framework)

A minimal, framework-free example helps you understand how routing logic can be implemented from scratch and why frameworks exist to simplify it.

```python
# vanilla routing with Python's http.server
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse

class RouterHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
            return

        # Simple routing table
        if path == "/users/42":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"user_id": 42, "name": "Alice"}')
            return

        if path.startswith("/users/"):
            # Very naive extraction: /users/<id>
            parts = path.strip("/").split("/")
            if len(parts) == 2 and parts[0] == "users":
                user_id = parts[1]
                self.send_response(200)
                self.end_headers()
                self.wfile.write(f'{{"user_id": {user_id}, "name": "User{user_id}"}}'.encode())
                return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not Found")

def run(server_class=HTTPServer, handler_class=RouterHandler, port=8000):
    httpd = server_class(("", port), handler_class)
    print(f"Serving on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
```

### Line-by-line explanation
- Import BaseHTTPRequestHandler and HTTPServer to build a tiny HTTP server.
- urllib.parse is used to parse the incoming request URL.
- RouterHandler defines how GET requests are handled.
- do_GET parses the path and routes to different code paths.
- Special health check route returns 200 OK quickly.
- A simple explicit route for /users/42 demonstrates direct path matching.
- A more generic path handling extracts the user_id from /users/<id>.
- run starts the HTTP server on port 8000.

## 4. Routing with FastAPI (Modern, Typed, and Fast)

FastAPI makes path parameters strongly typed and automatically generates docs. It’s excellent for production-grade APIs with robust routing.

```python
# FastAPI example with path parameters
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
async def read_user(user_id: int):
    return {"user_id": user_id, "name": "Alice"}

@app.get("/articles/{category}/{slug}")
async def read_article(category: str, slug: str):
    return {"category": category, "slug": slug, "title": "Sample Article"}
```

Run locally with:
# uvicorn filename:app --reload

### Line-by-line explanation
- Import FastAPI to create a modern API.
- Create an instance of FastAPI.
- Define a route with a required integer path parameter: /users/{user_id}. The type hint int enforces numeric IDs and fast validation.
- read_user returns a JSON payload containing the user_id.
- Define a nested route with two path parameters: category and slug, both strings.
- read_article returns a JSON payload representing a resource identified by category and slug.
- The setup supports automatic OpenAPI/Swagger docs and nice runtime validation.

## 5. Common Beginner Mistakes — Bad vs Good

Pitfalls you’ll encounter and how to fix them.

- Pitfall 1: Manual, unsafe URL construction (risk of injection and broken URLs)
Bad:
```python
def user_post_url(user_id, slug):
    return "/users/" + str(user_id) + "/posts/" + slug
```
Good:
```python
from urllib.parse import quote

def user_post_url(user_id, slug):
    return f"/users/{int(user_id)}/posts/{quote(slug, safe='')}"
```

- Pitfall 2: Not validating path parameters (types are not enforced)
Bad (Flask without converter handles as string):
```python
@app.route("/items/<item_id>")
def get_item(item_id):
    # item_id assumed to be int, but not enforced
    item = db.find(int(item_id))  # potential crash if not numeric
```
Good (Flask with type converter):
```python
@app.route("/items/<int:item_id>")
def get_item(item_id: int):
    item = db.find(item_id)
```

- Pitfall 3: Inconsistent trailing slashes causing redirects or 404s
Bad: two routes
- "/users/<int:user_id>/"
- "/users/<int:user_id>"
Good: standardize one pattern and use strict_slashes=False or framework defaults
```python
# Flask example (choose one convention)
@app.route("/users/<int:user_id>", strict_slashes=False)
def get_user(user_id: int):
    ...
```

- Pitfall 4: Overusing path parameters for optional data
Bad:
```python
@app.route("/articles/<category>/<slug>")
def article(category, slug):
    ...
```
If category is optional, you’ll get 404s. Use query params or separate routes.
Good:
```python
@app.get("/articles/{slug}")
def article(slug: str, category: Optional[str] = None):
    ...
```
- Pitfall 5: Not documenting or validating API endpoints
Bad: silent endpoints with no docs
Good: rely on framework docs (FastAPI) or add explicit docstrings and tests

## 6. Why This Matters In Real Systems

In production, routing design affects maintainability, performance, and user experience.

- Consistent URL semantics lead to easier API discovery and client integrations.
- Typed path parameters catch errors early and improve runtime safety.
- Versioned routes (e.g., /v1/ vs /v2/) enable smooth API evolution without breaking clients.
- Proper encoding and escaping prevent injection issues and ensure compatibility across proxies and gateways.
- Clear hierarchical/nested resources reflect real-world relationships (e.g., users -> posts, books -> authors).
- Observability: stable route names help you monitor endpoints, set up alerts, and collect metrics.

Practical production usage:
- Use framework routing for correctness and validation (Flask, FastAPI, etc.).
- Prefer explicit, descriptive paths over deeply nested or opaque identifiers.
- Centralize 404 handling and unsupported methods to minimize client confusion.
- Consider URL versioning and deprecation policies for long-lived APIs.
- Use automated tests that exercise path parameters and edge cases (empty strings, invalid IDs, etc.).

## 7. Study Questions

1. What are the benefits of using typed path parameters (e.g., /users/{user_id:int}) in a route?
2. Why is URL versioning important, and how would you structure versioned routes in a Python web framework?
3. When should you prefer path parameters over query parameters for filtering or identifying resources?
4. How does a framework like FastAPI improve routing and validation compared to a vanilla HTTP server?
5. What is a common pitfall with trailing slashes, and how can you mitigate it in Flask or FastAPI?

## 8. Exercise

Part A: Create a small API with two approaches (Flask and FastAPI) to illustrate routing and path parameters.

- Task 1: Flask version
  - Implement a Flask app with:
    - GET /users/<int:user_id> → returns user_id and a synthetic name
    - GET /users/<int:user_id>/posts → returns a list of post IDs for that user
  - Run the server locally and test with curl or a browser.

- Task 2: FastAPI version
  - Implement a FastAPI app with:
    - GET /books/{isbn} → returns ISBN and a dummy title
    - GET /books/{isbn}/authors/{author_id} → returns author and book ISBN
  - Run with uvicorn and verify interactive docs at /docs

- Task 3: Design a route generator utility
  - Write a small utility function that builds URLs for a given route name and parameters, mimicking how url_for works in Flask.
  - Example:
    - generator("get_user", user_id=123) → "/users/123"
  - Use this utility in a tiny demonstration route that prints generated URLs.

Deliverables:
- The Flask app file (e.g., app_flask.py) implementing Task 1.
- The FastAPI app file (e.g., app_fastapi.py) implementing Task 2.
- A Python script (e.g., url_builder.py) showing the route generator in Task 3.
- Brief notes on how you would test each route (tools, endpoints, and expected responses).

End of lesson.