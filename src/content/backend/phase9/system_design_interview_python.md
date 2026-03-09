# Phase 9 — System Design & Scalability: System Design Interview Walkthroughs (Python)

Compelling introductory paragraph:
System design interview walkthroughs are a core practice for backend engineers to demonstrate how you reason about large, distributed systems under constraints. In Python-focused contexts, you’ll illustrate architecture decisions, data models, APIs, and scalability patterns using runnable snippets that emphasize correctness, clarity, and trade-offs. Mastery here means you can articulate requirements, decompose problems, choose appropriate components, and justify decisions with measurable metrics and real-world constraints. This lesson walks you through a concrete walkthrough workflow and translates design decisions into Python examples you can adapt to real systems.

## 1. Clarify Requirements and Identify Constraints

Understanding what you’re building is the first design step. You gather requirements, constraints, and success metrics, then translate them into a concrete scope for the system design. Here we capture a sample requirements model and demonstrate how to represent questions programmatically.

```python
from dataclasses import dataclass, field
from typing import List, Optional, Dict

@dataclass
class Requirement:
    objective: str  # high-level goal (e.g., "URL shortening service")
    scale: str = "multi-region"  # expected scale category (e.g., "low", "high", "multi-region")
    latency_sla_ms: int = 100  # target read latency SLA in milliseconds
    write_sla_ms: int = 200  # target write latency SLA in milliseconds
    read_replicas: int = 2
    write_consistency: str = "eventual"  # consistency model (e.g., "strong", " eventual")
    non_goals: List[str] = field(default_factory=list)

def gather_clarifying_questions(req: Requirement) -> List[str]:
    """Return questions to clarify unknowns before deeper design."""
    questions = []
    if not req.objective:
        questions.append("What is the primary objective of the system?")
    if req.latency_sla_ms <= 0:
        questions.append("Specify a positive latency SLA for reads.")
    if req.write_sla_ms <= 0:
        questions.append("Specify a positive latency SLA for writes.")
    if req.scale not in {"low", "medium", "high", "multi-region"}:
        questions.append("What is the expected deployment scale category?")
    if req.non_goals:
        questions.append(f"Identify non-goals to avoid feature creep: {req.non_goals}")
    return questions

def architecture_outline(req: Requirement) -> Dict[str, str]:
    """Return a high-level outline of components expected for this scope."""
    outline = {
        "API_Gateway": "Routing, auth, rate limiting",
        "Auth_Service": "OIDC/JWT validation",
        "Service_Layer": "Business logic, coordination",
        "Storage": "Primary DB + read replicas",
        "Cache": "In-memory or distributed cache (e.g., Redis)",
        "Queue/EventBus": "Async processing and durable jobs",
        "Monitoring": "Metrics, logging, tracing"
    }
    return outline
```

### Line-by-line explanation
- Line 1-2: Import dataclass utilities and typing helpers to structure data.
- Line 4-12: Define a data structure (Requirement) to capture objective, scale, latency targets, replication, and non-goals, giving you a single source of truth for constraints.
- Line 14-25: gather_clarifying_questions builds a list of questions if essential fields are missing or constraints are unusual, guiding pre-interview scoping.
- Line 27-34: architecture_outline returns a dictionary naming core components and their rough responsibilities, helping you communicate the architectural plan succinctly.
- This section models how you would organize requirements and derive a high-level architecture before diving into details.

## 2. Define Core Components and Data Models

Next, you map the system to concrete components and data models that support the required functionality, including storage, caches, and service interfaces. This section uses Python to illustrate component boundaries and simple in-memory implementations you might later replace with real services.

```python
from dataclasses import dataclass, field
from typing import Dict, Optional

@dataclass
class DataStore:
    """Simple in-memory key-value store mapping short_code -> long_url."""
    url_map: Dict[str, str] = field(default_factory=dict)

    def get(self, short_code: str) -> Optional[str]:
        return self.url_map.get(short_code)

    def set(self, short_code: str, long_url: str) -> None:
        self.url_map[short_code] = long_url

class URLShortenerService:
    def __init__(self, store: DataStore):
        self.store = store

    def shorten(self, long_url: str, code: Optional[str] = None) -> str:
        if code is None:
            code = self._generate_code(long_url)
        self.store.set(code, long_url)
        return code

    def resolve(self, code: str) -> Optional[str]:
        return self.store.get(code)

    def _generate_code(self, long_url: str) -> str:
        # Simple deterministic hash-based code (not production-grade)
        import hashlib
        digest = hashlib.sha256(long_url.encode("utf-8")).hexdigest()
        return digest[:6]
```

### Line-by-line explanation
- Line 1-2: Import dataclass tooling and typing for optional values.
- Line 4-9: DataStore is a lightweight in-memory mapping acting as the primary storage (short_code -> long_url).
- Line 11-16: URLShortenerService encapsulates the core logic: shorten stores a mapping, resolve retrieves it, and _generate_code creates a 6-character code from the URL using SHA-256.
- Line 18-25: shorten accepts an optional custom code; if not provided, it generates one and writes to the store.
- Line 27-30: resolve looks up the long URL by short code.
- Line 32-35: _generate_code uses a cryptographic hash for deterministic codes. Note: In production, you’d use a collision-safe approach and consider randomness or sequence-based codes.

## 3. API Design and Endpoints (Python FastAPI example)

A practical system design typically includes a public API. Here is a minimal FastAPI-based implementation that exposes endpoints to shorten URLs and redirect using the short code. This demonstrates lean API design, input validation, and 2xx/3xx behavior.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
import string, random
from fastapi.responses import RedirectResponse

app = FastAPI()

# In-memory storage for demonstration; replace with a distributed store in production
store: Dict[str, str] = {}

class ShortenRequest(BaseModel):
    url: HttpUrl
    code: Optional[str] = None

def _generate_code(n: int = 6) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        candidate = ''.join(random.choice(alphabet) for _ in range(n))
        if candidate not in store:
            return candidate

@app.post("/shorten")
def shorten(req: ShortenRequest):
    code = req.code or _generate_code()
    store[code] = req.url
    return {"code": code, "short_url": f"http://short/{code}"}

@app.get("/{code}")
def redirect(code: str):
    long_url = store.get(code)
    if not long_url:
        raise HTTPException(status_code=404, detail="Not found")
    return RedirectResponse(long_url)
```

### Line-by-line explanation
- Line 1-3: Import FastAPI, Pydantic BaseModel for input validation, and typing for dicts. HttpUrl ensures valid URL input.
- Line 4-7: Import optional random utilities and RedirectResponse for HTTP redirects.
- Line 9: Create a FastAPI app instance to define routes.
- Line 12-13: Define an in-memory store to map short codes to long URLs (to be replaced with durable storage in production).
- Line 15-18: ShortenRequest model enforces a URL and an optional custom code via Pydantic validation.
- Line 20-23: _generate_code creates a 6-character alphanumeric code not already in use.
- Line 25-30: POST /shorten accepts a URL (and optional code), stores the mapping, and returns a code and short URL.
- Line 32-38: GET /{code} fetches the long URL; if missing, returns 404; otherwise redirects to the long URL.

## 4. Scaling Patterns: Caching, Sharding, and Data Partitioning

Scaling a system involves caching, partitioning, and routing logic. Here we illustrate two important building blocks: a simple TTL-based cache and a basic consistent-hash ring for distributing keys across shards.

### 4.a TTL-based Cache

```python
import time

class TTLCache:
    def __init__(self, ttl_seconds: int):
        self.ttl = ttl_seconds
        self.store = {}  # key -> (value, timestamp)

    def set(self, key, value) -> None:
        self.store[key] = (value, time.time())

    def get(self, key):
        if key not in self.store:
            return None
        value, ts = self.store[key]
        if time.time() - ts > self.ttl:
            del self.store[key]
            return None
        return value
```

### Line-by-line explanation
- Line 1: Import time for timestamps.
- Line 3-4: TTLCache holds a time-to-live for entries.
- Line 5-7: __init__ stores TTL and an internal dictionary for entries.
- Line 9-10: set writes a value with the current timestamp.
- Line 12-20: get returns the value if it’s within TTL; otherwise it purges the entry and returns None.

### 4.b Simple Consistent Hash Ring for Sharding

```python
from typing import Optional, List
import hashlib

class ConsistentHashRing:
    def __init__(self, nodes: Optional[List[str]] = None, replicas: int = 3):
        self.replicas = replicas
        self.ring = {}  # hash -> node
        self._sorted_keys: List[int] = []
        if nodes:
            for n in nodes:
                self.add_node(n)

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode("utf-8")).hexdigest(), 16)

    def add_node(self, node: str) -> None:
        for i in range(self.replicas):
            key = f"{node}:{i}"
            h = self._hash(key)
            self.ring[h] = node
            self._sorted_keys.append(h)
        self._sorted_keys.sort()

    def remove_node(self, node: str) -> None:
        for i in range(self.replicas):
            key = f"{node}:{i}"
            h = self._hash(key)
            self.ring.pop(h, None)
            self._sorted_keys.remove(h)

    def get_node(self, key: str) -> Optional[str]:
        if not self.ring:
            return None
        h = self._hash(key)
        for k in self._sorted_keys:
            if h <= k:
                return self.ring[k]
        return self.ring[self._sorted_keys[0]]
```

### Line-by-line explanation
- Line 1-3: Optional typing and hashlib for hashing.
- Line 5-14: ConsistentHashRing constructor initializes replicas, ring, and sorted keys; optionally adds initial nodes.
- Line 16-18: _hash computes a 128-bit hash (MD5) of the input key to place it on the ring.
- Line 20-26: add_node adds replicas of a node to the ring to improve key distribution; repeats with different virtual nodes.
- Line 28-33: remove_node removes both the physical node and its replicas from the ring.
- Line 35-41: get_node finds the appropriate node for a given key by walking the ring in ascending order; wraps to the first node if needed.

## 5. Observability, Reliability, and Operational Readiness

Operational readiness combines logging, metrics, tracing, and fault tolerance. Here are light-weight Python patterns you can adopt early, with an emphasis on non-blocking observability and safe failure modes.

```python
import uuid
import logging
import time
from functools import wraps

logging.basicConfig(level=logging.INFO)

def trace(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        trace_id = uuid.uuid4().hex
        logging.info(f"[{trace_id}] START {func.__name__}")
        result = func(*args, **kwargs)
        logging.info(f"[{trace_id}] END {func.__name__}")
        return result
    return wrapper

class MetricsRegistry:
    def __init__(self):
        self.counters = {}
        self.timings = {}

    def inc(self, name: str, amount: int = 1) -> None:
        self.counters[name] = self.counters.get(name, 0) + amount

    def observe(self, name: str, value: float) -> None:
        self.timings.setdefault(name, []).append(value)

# Example usage
metrics = MetricsRegistry()

@trace
def process_request(x: int) -> int:
    t0 = time.time()
    time.sleep(0.01)  # simulate work
    dt = time.time() - t0
    metrics.inc("requests_total")
    metrics.observe("request_latency_ms", dt * 1000)
    return x * 2
```

### Line-by-line explanation
- Line 1-4: Import UUID for unique trace identifiers, logging for observability, and time for latency measurement.
- Line 6-7: Configure the logging level (adjust to your environment).
- Line 9-16: trace decorator generates a unique trace_id, logs the start and end of a function, and preserves function metadata via wraps.
- Line 18-28: MetricsRegistry is a tiny in-process metrics collector with counters and timing observations.
- Line 30-38: Example usage shows tracing a function and recording metrics for requests and latency.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

### Pitfall 1 — Inadequate input validation and type safety

Bad:
```python
def create_user(name, email):
    return {"name": name, "email": email}
```

Good:
```python
import re
def is_valid_email(email: str) -> bool:
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))

def create_user(name: str, email: str):
    if not isinstance(name, str) or not isinstance(email, str):
        raise TypeError("name and email must be strings")
    if not is_valid_email(email):
        raise ValueError("invalid email")
    return {"name": name, "email": email}
```

### Pitfall 2 — Missing idempotency guarantees for write operations

Bad:
```python
import uuid
orders = {}

def create_order(user_id, amount):
    order_id = str(uuid.uuid4())
    orders[order_id] = {"user_id": user_id, "amount": amount}
    return order_id
```

Good:
```python
import uuid
orders = {}
idempotency_store = {}

def create_order(user_id, amount, idempotency_key=None):
    if idempotency_key:
        if idempotency_key in idempotency_store:
            return idempotency_store[idempotency_key]
    order_id = str(uuid.uuid4())
    orders[order_id] = {"user_id": user_id, "amount": amount}
    if idempotency_key:
        idempotency_store[idempotency_key] = order_id
    return order_id
```

### Pitfall 3 — Using in-memory stores for production without persistence

Bad:
```python
db = {}

def put(key, value):
    db[key] = value

def get(key):
    return db.get(key)
```

Good:
```python
import sqlite3
conn = sqlite3.connect("data.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)")
conn.commit()

def put(key, value):
    with conn:
        conn.execute("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", (key, value))

def get(key):
    cur = conn.execute("SELECT value FROM kv WHERE key = ?", (key,))
    row = cur.fetchone()
    return row[0] if row else None
```

### Pitfall 4 — Ignoring data consistency in multi-region deployments

Bad:
- Assume strong consistency across all regions without design.

Good:
- Use eventual consistency with conflict resolution, or implement cross-region replication with CRDTs or a versioned key store. While code is complex, you can start by:
  - Designating a single source of truth per resource.
  - Implementing asynchronous replication and vector clocks or last-write-wins with explicit reconciliation.

## Y. Why This Matters In Real Systems

In production, you design for scale, reliability, and maintainability. Key takeaways:

- Horizontal scaling is often mandatory to meet traffic spikes; design components to be stateless where possible and shared-nothing.
- Caching dramatically reduces latency and load; TTL, eviction policies, and cache invalidation complexity must be understood and tested.
- Data partitioning (sharding) enables growth but introduces routing, consistency, and rebalancing challenges. Consistent hashing helps minimize remapping when nodes join/leave.
- Observability is non-negotiable: good logs, metrics, and traces enable issue diagnosis in production. Plan instrumentation early, not as an afterthought.
- Trade-offs matter: strong consistency simplifies correctness but hurts latency and availability in distributed systems; eventual consistency improves performance but requires conflict resolution.
- Real systems must handle failures gracefully: idempotent APIs, retry/backoff strategies, and circuit breakers protect downstream services.

## Z. Study Questions

1) What is the difference between horizontal and vertical scaling in system design?  
2) How would you implement a TTL-based cache, and what eviction policy might you choose?  
3) Why is idempotency important for write APIs, and how can you implement idempotency keys?  
4) In a globally distributed service, which consistency model would you choose for reads and writes, and why?  
5) Describe a simple data model for a URL shortener and how you would store mappings and ensure uniqueness of short codes.

## Exercise

Part A — Build a minimal URL shortener library (library-focused)

- Implement a module url_shortener.py with:
  - A DataStore-backed interface (use the DataStore class from Section 2 as a base, but you can implement a simple in-memory subclass for this exercise).
  - A URLShortenerService that can:
    - shorten(long_url: str, code: Optional[str] = None) -> str
    - resolve(code: str) -> Optional[str]
    - generate_code(long_url: str) -> str (hash-based or random)
- Write a small test script that demonstrates shortening two URLs and resolving them.

Part B — Add caching and basic sharding (integration-focused)

- Extend the library to:
  - Include a TTLCache with a short TTL (e.g., 60 seconds) for hot URL mappings.
  - Implement a ConsistentHashRing across 3 shards, each backed by a separate in-memory store (or dictionary).
  - Route shorten and resolve operations to the appropriate shard based on the short code or URL hash.
- Provide a simple simulation that shortens URLs and then resolves them, showing how the ring distributes keys.

Part C — Simple API wrapper (optional, for quick hands-on)

- Implement a tiny FastAPI app (as in Section 3) that uses your library.
- Ensure that the API endpoints call into your service layer and that the TTL cache is engaged for hot paths.

Part D — Quick design critique

- Given a scenario where traffic doubles every hour for the next 24 hours, explain what steps you would take to scale, what components to audit, and which metrics to monitor.
- Describe your approach to testing the design under load, including simulated latency and cache invalidation scenarios.

Notes and tips:
- Start with clear, testable requirements. Use the console or a REPL to verify each small piece before stitching together.
- In real interviews, communicate trade-offs clearly: why you chose a simple cache first, then why you would add sharding or a distributed store.
- Keep code modular and well-documented so interviewers can follow the architecture and reasoning.

If you want more depth on any subsection (e.g., deeper API examples, more advanced hashing, or production-grade metrics), tell me which topic to expand and I’ll tailor additional lessons and runnable code.