# Microservices vs Monolith — When & Why (Python)

In modern backend engineering, choosing between a monolithic architecture and a microservices approach is one of the most consequential design decisions. A monolith is simple to build, test, and deploy, making it a great starting point for small to medium apps or teams. Microservices break the system into independently deployable components, enabling teams to scale, iterate, and adopt technology stacks per service. This lesson uses Python to illustrate both styles, their trade-offs, and practical guidance for when to choose one over the other in real-world systems.

## 1. Monolith: Definition, Characteristics, and a Minimal Example

A monolith is a single, cohesive application where all modules share a single codebase and typically a single database. It’s straightforward to develop, test, deploy, and reason about, especially for smaller teams and simpler domain problems. When domain boundaries are small, data ownership is centralized, and deployment velocity is high, a monolith often wins on simplicity.

Code example: a minimal Python Flask monolith with simple in-memory stores for users and orders.

```python
# monolith_flask.py
from flask import Flask, request, jsonify
from uuid import uuid4
from typing import Dict

app = Flask(__name__)

# In-memory stores (for demonstration)
USERS: Dict[str, dict] = {}
ORDERS: Dict[str, dict] = {}

# Create a user
@app.post("/users")
def create_user():
    data = request.get_json() or {}
    user_id = str(uuid4())
    user = {"id": user_id, "name": data.get("name"), "email": data.get("email")}
    USERS[user_id] = user
    return jsonify(user), 201

# Get a user
@app.get("/users/<user_id>")
def get_user(user_id: str):
    user = USERS.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

# Create an order
@app.post("/orders")
def create_order():
    data = request.get_json() or {}
    order_id = str(uuid4())
    order = {"id": order_id, "user_id": data.get("user_id"), "items": data.get("items", [])}
    ORDERS[order_id] = order
    return jsonify(order), 201

# Get an order
@app.get("/orders/<order_id>")
def get_order(order_id: str):
    order = ORDERS.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

### Line-by-line explanation
- Line 1: Import Flask and helpers for request handling and responses.
- Line 2: Import uuid4 to generate unique IDs.
- Line 3: Import typing.Dict for type hints (optional but helps readability).
- Line 5: Create a Flask app instance.
- Lines 8-9: Define in-memory storage for users and orders.
- Lines 12-18: Endpoint to create a user; generates a UUID, builds the user object, stores it, returns 201 with the user.
- Lines 21-28: Endpoint to fetch a user by ID; returns 404 if not found.
- Lines 31-37: Endpoint to create an order; accepts user_id and items, stores the order, returns 201 with the order.
- Lines 40-46: Endpoint to fetch an order by ID; returns 404 if not found.
- Lines 48-50: Entry point to run the Flask app in dev mode on port 5000.

## 2. Microservices: Definition, Characteristics, and a Minimal Example

Microservices decompose a system into smaller, independently deployable services, each owning its own data. Teams can scale, evolve tech stacks, and deploy parts of the system without touching others. Trade-offs include network complexity, data consistency, distributed tracing, and deployment coordination.

Code examples: three small services with Python

- Product service (FastAPI) – manages products
- Order service (FastAPI) – manages orders
- API gateway (FastAPI) – routes requests to services (simple form of gateway)

Product service (FastAPI)
```python
# product_service.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
from uuid import uuid4

app = FastAPI()
PRODUCTS: Dict[str, dict] = {}

class Product(BaseModel):
    name: str
    price: float

@app.post("/products")
def create_product(p: Product):
    product_id = str(uuid4())
    prod = {"id": product_id, "name": p.name, "price": p.price}
    PRODUCTS[product_id] = prod
    return prod

@app.get("/products/{product_id}")
def get_product(product_id: str):
    return PRODUCTS.get(product_id, {"error": "Product not found"})
```

Order service (FastAPI)
```python
# order_service.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
from uuid import uuid4

app = FastAPI()
ORDERS: Dict[str, dict] = {}

class OrderItem(BaseModel):
    product_id: str
    quantity: int

class Order(BaseModel):
    user_id: str
    items: List[OrderItem]

def _calc_total(o: Order) -> float:
    # Placeholder total calc; a real system would fetch product prices
    return sum(item.quantity * 9.99 for item in o.items)

@app.post("/orders")
def create_order(o: Order):
    order_id = str(uuid4())
    total = _calc_total(o)
    order = {"id": order_id, "user_id": o.user_id, "items": [i.dict() for i in o.items], "total": total}
    ORDERS[order_id] = order
    return order

@app.get("/orders/{order_id}")
def get_order(order_id: str):
    return ORDERS.get(order_id, {"error": "Order not found"})
```

API gateway (simple routing) (FastAPI)
```python
# gateway.py
from fastapi import FastAPI
import httpx

app = FastAPI()

ORDER_SERVICE_URL = "http://localhost:8000"      # Order service port
PRODUCT_SERVICE_URL = "http://localhost:5001"    # Product service port (not used in gateway here)

@app.post("/gateway/orders")
async def create_order_via_gateway(payload: dict):
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{ORDER_SERVICE_URL}/orders", json=payload)
        return resp.json()

@app.get("/gateway/orders/{order_id}")
async def get_order_via_gateway(order_id: str):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{ORDER_SERVICE_URL}/orders/{order_id}")
        return resp.json()
```

Run commands (typical local runs):
- uvicorn product_service:app --reload --port 5001
- uvicorn order_service:app --reload --port 8000
- uvicorn gateway:app --reload --port 8080

### Line-by-line explanation
- Product service:
  - Line 1: Import FastAPI to create the service.
  - Line 2: Import BaseModel to define data shapes.
  - Line 3: Import typing helpers for type hints.
  - Line 5: Create a FastAPI instance.
  - Line 6: In-memory store for products.
  - Lines 8-11: Pydantic model for product input.
  - Lines 13-18: POST /products creates a new product with a UUID and stores it.
  - Lines 20-24: GET /products/{product_id} returns a product or a not-found dict.

- Order service:
  - Line 1-2: Import FastAPI and BaseModel.
  - Line 5: Create FastAPI instance.
  - Line 6: In-memory store for orders.
  - Lines 8-14: OrderItem model and Order model definitions.
  - Lines 16-18: Internal helper to compute a placeholder total.
  - Lines 20-28: POST /orders creates an order, computes total, stores it.
  - Lines 30-33: GET /orders/{order_id} fetches an order or a not-found.

- Gateway:
  - Line 1-2: Import FastAPI and httpx for HTTP calls.
  - Line 4: Create FastAPI app.
  - Lines 6-8: URLs for the underlying services.
  - Lines 10-15: POST gateway endpoint proxies to the order service.
  - Lines 17-22: GET gateway endpoint proxies to the order service.

## 3. Decision Criteria: When to choose Monolith vs Microservices

A practical heuristic helps teams decide when to use a monolith or to migrate toward microservices. Factors include team size, domain complexity, data ownership, deployment cadence, and evolution risk.

```python
# decision_heuristics.py
def should_use_microservices(
    team_size: int,
    domain_complexity: int,
    data_shared: bool,
    deployment_frequency: int
) -> str:
    """
    Simple heuristic:
      - Microservices when domain complexity is high, teams are large, data ownership is separable, or we deploy frequently.
      - Otherwise, prefer a monolith for simplicity and lower coordination cost.
    Returns "microservices" or "monolith".
    """
    # If data must be independently owned and services can scale independently, microservices shine
    if domain_complexity > 7 and team_size >= 3 and not data_shared:
        return "microservices"

    # Frequent deploys often align with service boundaries and polyglot tech stacks
    if deployment_frequency > 5:
        return "microservices"

    # If the domain is moderate and teams are small, monolith is typically simpler
    if domain_complexity <= 6 and team_size <= 2:
        return "monolith"

    # Fallback
    return "monolith"
```

### Line-by-line explanation
- Line 1: Define function with four inputs describing team and domain characteristics.
- Line 5: Docstring explaining the heuristic.
- Lines 9-11: If the domain is very complex, teams are reasonably sized, and data ownership can be kept separate, choose microservices.
- Lines 14-16: If deployment frequency is high, microservices often help with independent releases.
- Lines 19-21: If the domain is moderate and teams are small, prefer monolith to avoid orchestration overhead.
- Line 25: Fallback to monolith when no other condition is clearly met.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code

- Pitfall 1: Prematurely splitting a small, cohesive domain into microservices with shared data
  - Bad: microservices with a shared in-memory datastore (tight coupling, data inconsistency risk)
  - Good: start with a monolith or clearly owned data boundaries; introduce microservices only when data ownership is well-separated

Bad (shared data in multiple services)
```python
# bad_shared_db.py (conceptual)
# Each service operates on a global in-memory DB (not realistic for real microservices)
PRODUCTS = {}
ORDERS = {}

def add_product(p):
    pid = len(PRODUCTS)
    PRODUCTS[pid] = p
    return pid

def add_order(o):
    oid = len(ORDERS)
    ORDERS[oid] = o
    return oid
```

Good (service-owned data)
```python
# good_separate_services.py
# Product service owns PRODUCTS
PRODUCTS = {}

def add_product(p):
    pid = len(PRODUCTS)
    PRODUCTS[pid] = p
    return pid

# Order service owns ORDERS
ORDERS = {}

def add_order(o):
    oid = len(ORDERS)
    ORDERS[oid] = o
    return oid
```

- Pitfall 2: Tight coupling via direct, unversioned inter-service calls everywhere
  - Bad: hard-coded URLs and no contract versioning; any change breaks consumers
  - Good: define API contracts, use a gateway or client library, and version APIs

Bad (direct hard-coded calls)
```python
# bad_direct_calls.py
import requests

def create_order_in_other_service(payload):
    res = requests.post("http://localhost:8000/orders", json=payload)
    return res.json()
```

Good (gateway-based or client abstraction)
```python
# good_api_contract.py
class OrderServiceClient:
    BASE = "http://localhost:8000"

    def create_order(self, payload):
        import requests
        resp = requests.post(f"{self.BASE}/orders", json=payload)
        resp.raise_for_status()
        return resp.json()
```

- Pitfall 3: Inconsistent API design and lack of contracts
  - Bad: endpoints with differing response shapes and error formats
  - Good: use a consistent contract (OpenAPI/Swagger) and a shared error schema

Bad (inconsistent responses)
```python
# bad_api_inconsistency.py
def get_user(id):
    if id == 0:
        return {"id": id, "name": "Guest"}  # missing error field example
    return {"error": "Not found"}  # inconsistent shape
```

Good (consistent contract)
```python
# good_api_contract.py
from pydantic import BaseModel
class ApiResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None

def get_user(id):
    if id == 0:
        return ApiResponse(success=True, data={"id": id, "name": "Guest"}).dict()
    return ApiResponse(success=False, error="Not found").dict()
```

## 5. Why This Matters In Real Systems — Production Context and Real Usage

- Observability and tracing: Microservices require distributed tracing (e.g., OpenTelemetry, Jaeger) to diagnose cross-service flows. Monoliths are easier to trace locally.
- Deployment and rollback: Monoliths deploy as a single unit; microservices allow independent rollbacks, but raise deployment complexity and dependency management.
- Data consistency: Monoliths can rely on transactions across a single DB; microservices need eventual consistency patterns, sagas, or compensating actions.
- Fault isolation and blast radius: Microservices confine failures to a service, improving resilience, but a network partition can degrade user experience if not handled gracefully.
- Team alignment: Microservices align with autonomous teams and domain boundaries; monoliths suit small, centralized teams and less orchestration overhead.
- Observability, security, and compliance: Each service adds surface area for security, logging, and access control; you must design a consistent policy across services.
- Operational overhead: Service discovery, load balancing, config management, and CI/CD pipelines become more complex with microservices.

In real systems, teams often start with a well-structured monolith, extract microservices around bounded contexts as the product scales, and adopt a gateway and shared contract practices to mitigate coupling.

## 6. Study Questions — 5 Recall Questions

1) What are the core trade-offs of monoliths vs microservices in terms of deployment and data ownership?
2) How does data ownership influence the decision to use microservices?
3) Why is a gateway or API client abstraction recommended when adopting microservices?
4) What are common observability needs that arise specifically with microservices?
5) What is a simple design principle to avoid premature microservice fragmentation?

## 7. Exercise — Practical Multi-Part Coding Challenge

Goal: Practice starting from a monolith, then evolve toward a microservices approach, and reflect on trade-offs.

Part A — Build a Monolith (Flask)
- Implement a small REST API in a single Flask app with:
  - POST /users to create a user
  - GET /users/<id> to fetch a user
  - POST /orders to create an order
  - GET /orders/<id> to fetch an order
- Data store: in-memory dictionaries (Users and Orders).
- Deliverables:
  - A single file monolith_exercise.py with the endpoints above.
  - A README with how to run (e.g., python monolith_exercise.py) and an example curl.

Code template (monolith_exercise.py)
```python
# monolith_exercise.py
from flask import Flask, request, jsonify
from uuid import uuid4
from typing import Dict

app = Flask(__name__)
USERS: Dict[str, dict] = {}
ORDERS: Dict[str, dict] = {}

@app.post("/users")
def create_user():
    data = request.get_json() or {}
    user_id = str(uuid4())
    USERS[user_id] = {"id": user_id, "name": data.get("name"), "email": data.get("email")}
    return jsonify(USERS[user_id]), 201

@app.get("/users/<user_id>")
def get_user(user_id: str):
    user = USERS.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

@app.post("/orders")
def create_order():
    data = request.get_json() or {}
    order_id = str(uuid4())
    ORDERS[order_id] = {"id": order_id, "user_id": data.get("user_id"), "items": data.get("items", [])}
    return jsonify(ORDERS[order_id]), 201

@app.get("/orders/<order_id>")
def get_order(order_id: str):
    order = ORDERS.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order)

if __name__ == "__main__":
    app.run(debug=True)
```

Part B — Split into Microservices (Skeleton)
- Create three files with minimal but runnable code:
  - product_service.py (FastAPI) – manages products
  - order_service.py (FastAPI) – manages orders
  - gateway.py (FastAPI) – basic gateway that forwards requests to the order service

Code templates (you can copy-paste the code blocks from Section 2, with the same structure):
- product_service.py
[FastAPI product service code from Section 2]

- order_service.py
[FastAPI order service code from Section 2]

- gateway.py
[Gateway code from Section 2]

Run commands:
- uvicorn product_service:app --reload --port 5001
- uvicorn order_service:app --reload --port 8000
- uvicorn gateway:app --reload --port 8080

Part C — Basic Interaction Test
- Write a small Python script (test_client.py) that:
  - Creates a product via the product service
  - Creates an order via the gateway that references the created product
  - Retrieves the order via the gateway
- Deliverables:
  - test_client.py script using requests or httpx
  - Expected console output demonstrating the end-to-end path

Code template (test_client.py)
```python
# test_client.py
import requests

# 1) Create a product
p = {"name": "Widget", "price": 19.99}
prod = requests.post("http://localhost:5001/products", json=p).json()
product_id = prod.get("id")

# 2) Create an order via gateway (requires user_id or similar; using a simple payload)
payload = {
    "user_id": "user-1",
    "items": [{"product_id": product_id, "quantity": 2}]
}
order = requests.post("http://localhost:8080/gateway/orders", json=payload).json()

print("Order created via gateway:", order)
```

Part D — Reflection Prompts
- After running both architectures, write a brief one-page reflection addressing:
  - How did the cognitive and operational overhead differ between monolith and microservices in your setup?
  - Where would you introduce transactional boundaries and how would you handle consistency in the microservices approach?
  - What operational dashboards or tracing would you add to observe the microservices path?

End of lesson.