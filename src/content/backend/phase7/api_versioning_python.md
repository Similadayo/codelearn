# Track: Backend Engineering — Module: Phase 7 — Advanced API Features — Topic: API Versioning & Deprecation Strategies (Python)

Versioning and deprecation are critical tools for maintaining reliable, scalable APIs. Proper versioning allows you to introduce breaking changes without breaking existing clients, while a thoughtful deprecation strategy communicates timelines and minimizes disruption. In production systems, these practices reduce support burden, enable gradual migrations for customers, and protect business continuity as your API evolves.

## 1. Path-Based, Query, Header, and Media Type Versioning — Choosing and Implementing Versions Correctly

### 1. Path-Based Versioning
Path-based versioning is straightforward and cache-friendly. Each version gets its own URL namespace (e.g., /v1, /v2). This makes it easy for clients to pin to a specific version and for servers to implement clear breakpoints.

```python
# Path-based versioning with FastAPI
from fastapi import FastAPI, APIRouter

app = FastAPI(title="Versioned API - Path-based")

# Version 1
v1_router = APIRouter()
@v1_router.get("/greet")
def greet_v1():
    return {"version": "v1", "message": "Hello from API version 1"}

# Version 2
v2_router = APIRouter()
@v2_router.get("/greet")
def greet_v2():
    return {"version": "v2", "message": "Hello from API version 2 with improvements"}

# Mount routers under their versioned prefixes
app.include_router(v1_router, prefix="/v1")
app.include_router(v2_router, prefix="/v2")
```

### Line-by-line explanation
- Line 1: Import FastAPI and APIRouter from the FastAPI library.
- Line 3: Create a FastAPI application instance with a title for clarity.
- Line 6: Create a router for version 1.
- Line 7: Define a GET endpoint at /greet within v1; returns a dict indicating version 1.
- Line 11: Create a router for version 2.
- Line 12: Define a GET endpoint at /greet within v2; returns a dict indicating version 2 with a message.
- Line 16-17: Mount both routers under /v1 and /v2 respectively, producing endpoints /v1/greet and /v2/greet.

### 1.2 Query Parameter Versioning
Query parameters allow version selection without changing the path, but can complicate caching and URL sharing. It’s less common for public APIs but can be handy for internal APIs or feature flags.

```python
# Query-parameter versioning (less common due to caching implications)
from fastapi import FastAPI, HTTPException, Request

app = FastAPI(title="Versioned API - Query Parameter")

@app.get("/greet")
def greet(request: Request):
    version = request.query_params.get("version", "v1")
    if version == "v1":
        return {"version": "v1", "message": "Hello from API version 1"}
    elif version == "v2":
        return {"version": "v2", "message": "Hello from API version 2"}
    else:
        raise HTTPException(status_code=400, detail="Unsupported version")
```

### Line-by-line explanation
- Line 1-3: Import FastAPI, HTTPException, and Request utilities.
- Line 5: Initialize FastAPI app with a descriptive title.
- Line 7: Define a single GET endpoint at /greet.
- Line 8: Read the version from the query parameter; default to v1 if absent.
- Lines 9-12: Branch logic to return the appropriate version payload or raise a 400 if the version is unsupported.

### 1.3 Header-Based Versioning
Header-based versioning uses a custom header (or Accept-Version) to select the version. This keeps URLs compact and can be friendlier to certain caching/CDN strategies, but is less discoverable for clients.

```python
# Header-based versioning (X-API-Version header)
from fastapi import FastAPI, HTTPException, Request

app = FastAPI(title="Versioned API - Header-Based")

@app.get("/greet")
def greet(request: Request):
    version = request.headers.get("X-API-Version")
    if version == "v1":
        return {"version": "v1", "message": "Hello from API version 1 (via header)"}
    elif version == "v2":
        return {"version": "v2", "message": "Hello from API version 2 (via header)"}
    else:
        raise HTTPException(status_code=400, detail="Unsupported or missing version header")
```

### Line-by-line explanation
- Line 1-3: Import FastAPI, HTTPException, and Request.
- Line 5: Create FastAPI app with a title.
- Line 7: Define the /greet endpoint.
- Line 8: Read version from the X-API-Version header; if absent, version remains None.
- Lines 9-13: Branch to respond with version-specific payload or raise 400 for unsupported/missing version.

### 1.4 Media Type Versioning (Content Negotiation)
Media type versioning uses content negotiation in the Accept header, e.g., application/vnd.myapi.v2+json. It’s highly explicit and aligns with API evolution best practices but requires discipline in client libraries.

```python
# Media type versioning (content negotiation)
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Versioned API - Media Type Versioning")

@app.get("/greet")
def greet(request: Request):
    accept = request.headers.get("Accept", "")
    if "application/vnd.myapi.v2+json" in accept:
        return JSONResponse({"version": "v2", "message": "Hello from v2 (content-negotiated)"})
    elif "application/vnd.myapi.v1+json" in accept:
        return JSONResponse({"version": "v1", "message": "Hello from v1 (content-negotiated)"})
    else:
        raise HTTPException(status_code=406, detail="Not Acceptable: unsupported media type")
```

### Line-by-line explanation
- Line 1-3: Import necessary FastAPI components and responses.
- Line 5: Create FastAPI app with a title.
- Line 7: Define /greet endpoint.
- Line 8: Read the Accept header for version indicators.
- Lines 9-12: Return a versioned payload depending on the media type requested; otherwise raise 406 Not Acceptable.

### 1.5 Choosing a Strategy
- Path versioning is the most explicit and cache-friendly; easy for clients to pin a version.
- Query parameter versioning is simple but can break CDN caching and URL sharing semantics.
- Header-based versioning is clean from a URL standpoint and supports strong separation of concerns but requires client discipline to set headers consistently.
- Media type/versioning via Accept header is excellent for strict content negotiation and can scale well in polyglot clients, but adds complexity to client implementations.
- Practical tip: start with path-based versioning for public APIs; consider supporting multiple strategies during a transition period, with clear deprecation timelines and client guidance.

## 2. Deprecation Strategies — Communicating and Enforcing Sunset Plans

Deprecation is not just a warning; it’s a policy that governs how you evolve APIs while maintaining trust with clients. A good strategy includes explicit deprecation metadata, a public sunset date, and a mechanism to communicate changes through responses and documentation. In production, you should expose deprecation headers, provide a migration path, and track usage to determine impact.

```python
# Deprecation policy enforcement in a FastAPI app
from fastapi import FastAPI, Request
from datetime import date, datetime

app = FastAPI(title="API Deprecation Policy")

# Centralized version policy (in real life, this would live in a policy service or config)
VERSION_POLICIES = {
    "v1": {
        "deprecated": True,
        "sunset_date": "2026-12-31",
        "redirects_to": "v2",
        "notes": "Security improvements in v2; please migrate by sunset."
    },
    "v2": {
        "deprecated": False,
        "sunset_date": None,
        "redirects_to": None,
        "notes": "Current supported version."
    },
}

def deprecation_headers(version: str):
    policy = VERSION_POLICIES.get(version, {})
    headers = {}
    if policy.get("deprecated"):
        headers["Deprecation"] = "true"
        if policy.get("sunset_date"):
            headers["Sunset"] = policy["sunset_date"]
        if policy.get("redirects_to"):
            headers["Link"] = f"</{policy['redirects_to']}>; rel=\"canonical\""
        if policy.get("notes"):
            headers["X-Deprecation-Notes"] = policy["notes"]
    return headers

# Example endpoints for versions
from fastapi.responses import JSONResponse

@app.get("/v1/greet")
def greet_v1():
    return {"message": "Hello from v1 (deprecated)"}

@app.get("/v2/greet")
def greet_v2():
    return {"message": "Hello from v2 (current)"}

# Middleware that attaches deprecation headers when a deprecated version is accessed
@app.middleware("http")
async def attach_deprecation_headers(request: Request, call_next):
    version = None
    if request.url.path.startswith("/v1/"):
        version = "v1"
    elif request.url.path.startswith("/v2/"):
        version = "v2"
    if version:
        headers = deprecation_headers(version)
        response = await call_next(request)
        for key, value in headers.items():
            response.headers[key] = value
        return response
    return await call_next(request)
```

### Line-by-line explanation
- Lines 1-4: Import required modules; set up FastAPI app.
- Lines 7-14: Define a centralized VERSION_POLICIES dictionary that tracks whether a version is deprecated, the sunset date, and a potential redirect target. This acts as the canonical source of truth for deprecation.
- Lines 16-25: deprecation_headers(version) reads the policy for a given version and builds a set of HTTP headers:
  - Deprecation: signals deprecation status.
  - Sunset: communicates the sunset date.
  - Link: provides a recommended target version (canonical redirect).
  - X-Deprecation-Notes: optional human-friendly notes.
- Lines 28-31: Simple endpoints for v1 and v2. v1 is marked as deprecated in policy.
- Lines 34-41: A middleware function that detects the requested version from the path, computes the appropriate deprecation headers, and attaches them to every response for deprecated versions.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Hard-coding version checks instead of using routers
Bad
```python
# Bad: manual path checks and branching inside handlers
from fastapi import FastAPI

app = FastAPI()

@app.get("/greet")
def greet():
    path = "/greet"  # imagine derived from request.path
    if path.startswith("/v1"):
        return {"version": "v1", "message": "Hi from v1"}
    elif path.startswith("/v2"):
        return {"version": "v2", "message": "Hi from v2"}
    else:
        return {"error": "Unknown version"}
```

Good
```python
# Good: separate routers per version; clear dispatch via URL prefix
from fastapi import FastAPI, APIRouter

app = FastAPI()

v1 = APIRouter()
@v1.get("/greet")
def greet_v1():
    return {"version": "v1", "message": "Hi from v1"}

v2 = APIRouter()
@v2.get("/greet")
def greet_v2():
    return {"version": "v2", "message": "Hi from v2"}

app.include_router(v1, prefix="/v1")
app.include_router(v2, prefix="/v2")
```

### Line-by-line explanation (Bad)
- Line 1: Import FastAPI for app creation.
- Line 3: Create a single FastAPI app.
- Lines 6-14: A single route attempts to branch behavior based on a path-derived value, which is brittle and hard to test.
- Lines 15-21: If-else logic handles versioning inside one function, making it error-prone and hard to extend.

### Line-by-line explanation (Good)
- Line 1: Import FastAPI and APIRouter to modularize endpoints.
- Line 3: Create a FastAPI app.
- Line 6: Create a v1 router and define a v1-specific endpoint.
- Line 11: Create a v2 router and define a v2-specific endpoint.
- Line 14: Mount v1 under /v1, and v2 under /v2; this makes version routing explicit and cache-friendly.

### Pitfall 2: Failing to communicate deprecation or sunset
Bad
```python
# Bad: silently degradable version; no explicit sunset
from fastapi import FastAPI

app = FastAPI()

@app.get("/v1/resource")
def get_resource_v1():
    return {"resource": "data from v1"}
```

Good
```python
# Good: emits deprecation headers and a sunset date
from fastapi import FastAPI, Request
from datetime import date

app = FastAPI()

SUNSET_V1 = "2026-12-31"

@app.middleware("http")
async def add_dep_headers(request: Request, call_next):
    if request.url.path.startswith("/v1/"):
        response = await call_next(request)
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = SUNSET_V1
        return response
    return await call_next(request)

@app.get("/v1/resource")
def get_resource_v1():
    return {"resource": "data from v1"}
```

### Line-by-line explanation (Bad)
- Line 1-2: Import app and Request to attach headers.
- Line 5: Define a v1 resource route without any deprecation messaging.
- Line 9-11: No sunset date or guidance; clients are left guessing how long v1 will live.

### Line-by-line explanation (Good)
- Lines 1-3: Import FastAPI, Request, and any constants you’ll need.
- Line 6: Define a sunset date as a constant for v1.
- Lines 8-13: Middleware attaches Deprecation and Sunset headers to all /v1/* responses, making the deprecation policy observable.
- Lines 15-17: Define a real v1 endpoint that remains functional for now, but with clear deprecation signaling.

### Pitfall 3: Ignoring cache behavior during version upgrades
Bad
```python
# Bad: same Cache-Control headers across versions
from fastapi import FastAPI

app = FastAPI()

@app.get("/v1/data")
def data_v1():
    return {"data": "v1"}

@app.get("/v2/data")
def data_v2():
    return {"data": "v2"}
```

Good
```python
# Good: versioned cache hints; per-version caching strategies
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/v1/data")
def data_v1():
    return JSONResponse({"data": "v1"}, headers={"Cache-Control": "max-age=60"})

@app.get("/v2/data")
def data_v2():
    return JSONResponse({"data": "v2"}, headers={"Cache-Control": "max-age=300"})
```

### Line-by-line explanation (Bad)
- Lines 1-4: Define two endpoints for v1 and v2 with identical cache semantics; assumes clients handle both.
- Lines 5-6: No per-version caching hints; potential stale data on proxies.

### Line-by-line explanation (Good)
- Lines 1-3: Define two endpoints with per-version cache headers.
- Lines 5-7: Return JSON responses with versioned payloads and distinct Cache-Control headers, enabling correct proxy behavior and client caching.

## Y. Why This Matters In Real Systems — Production context and real usage

- Backward compatibility: Clients rely on a stable API contract. Versioning ensures you can ship breaking changes without forcing all clients to migrate simultaneously.
- Controlled depreciation: A formal sunset date and migration path reduces unsupported usage gradually, lowers support costs, and informs business decisions (e.g., sunset fee structures for old clients).
- Cache and performance: Versioned URLs and content negotiation support efficient caching strategies across CDNs and proxies, reducing latency and load on your services.
- Client ecosystem maturity: For public APIs especially, you should publish a versioning policy, deprecation schedule, and migration guides. Consider SDKs that target specific versions to minimize fragmentation.
- Observability: Instrument version usage (e.g., traffic split by version, sunset hit-rate), and alert on rising usage of deprecated versions to prioritize work.

Practical patterns you’ll likely see in real systems:
- Public API: Start with path-based versioning (/v1, /v2) and communicate a lifecycle for v1 (deprecate, sunset, and port to v2).
- Internal/microservice boundaries: Use header or content-negotiated versioning to keep internal routing clean, while exposing a stable external API surface.
- Deprecation as a release process: Tie deprecation to release milestones, connect with changelogs, and provide automatic migration notes to clients.

## Z. Study Questions — 5 recall questions

1. What are the four common API versioning strategies, and a quick pro/cons for each?
2. How does a deprecation header like Deprecation and Sunset assist clients and proxies in practice?
3. Why is path-based versioning generally preferred for public APIs over query parameter versioning?
4. How can content negotiation via media type (Accept header) coexist with or replace other versioning strategies?
5. What are key production considerations when sunsetting an API version (e.g., timelines, migration guides, telemetry)?

## Exercise — a practical multi-part coding challenge

You are building a small Python FastAPI backend that demonstrates versioning and deprecation in a realistic, maintainable way. Complete the following tasks:

Part A — Implement a versioned API with at least v1 and v2
- Create an app with two routes:
  - GET /v1/items — returns a list of items in v1 schema
  - GET /v2/items — returns a list of items in v2 schema (different shape or additional fields)
- Use path-based versioning (as in Section 1.1). Ensure both endpoints are discoverable and independently testable.

Part B — Add a deprecation policy for v1
- Introduce a deprecation policy: v1 is deprecated with a sunset date (e.g., 90 days from today) and a hint to migrate to v2.
- Emit Deprecation and Sunset headers on all /v1/* responses, and include an optional Link header that points to /v2/.
- Ensure v2 remains the default for requests without a version, or clearly document the default behavior.

Part C — Implement a test suite
- Write tests that verify:
  - Accessing /v1/items returns data and includes Deprecation and Sunset headers.
  - Accessing /v2/items returns data without deprecation headers.
  - Accessing with an Accept header that requests v2 content-negotiated version still returns v2 data (if you implemented media type versioning in this exercise as an extra credit).

Part D — Document and observe
- Add a concise README that describes:
  - The versioning strategy chosen and why.
  - The deprecation policy (sunset date, migration path).
  - How to upgrade clients to v2.
- Add a simple telemetry snippet (pseudo or actual) that would log how many requests hit v1 vs v2 over time.

Deliverables:
- A minimal FastAPI project (app.py or main.py) implementing the above.
- A tests/ directory with pytest tests for Part C.
- A README.md detailing the versioning and deprecation strategy.
- Optional: an example curl script showing how to request v1 vs v2 and the expected headers.

Notes:
- If you want to push this further, implement a small canary route for v2 to gradually shift traffic from v1 to v2, and add a feature flag to enable/disable the canary in configuration.
- Keep the code modular: separate versioned routers, a small deprecation policy module, and a simple calculator-like data source to keep the example focused on API versioning behavior.