# Track: Backend Engineering — Phase 6: Authentication & Security - HTTPS, TLS & CORS Configuration

Introd: In modern backend systems, transport security and cross-origin access controls are foundational. HTTPS (HTTP over TLS) protects data in transit, authenticates servers, and helps prevent eavesdropping, tampering, and man-in-the-middle attacks. TLS configuration determines which protocol versions and ciphers are allowed, impacts performance, and influences compliance (e.g., PCI-DSS, GDPR). CORS governs which web clients can access your APIs from browsers, preventing unauthorized cross-origin requests. This lesson covers practical, production-minded HTTPS, TLS, and CORS setup in Python, with code examples you can adapt to Flask and FastAPI, and with emphasis on real-world pitfalls and best practices.

## 1. TLS Foundations and HTTPS in Python Web Apps

Explanation: This section introduces how to enable TLS on a Python web app, including generating certificates and wiring TLS into popular Python frameworks. We’ll start with a Flask example using the built-in development server (for learning) and then discuss production-oriented patterns.

Code: Flask HTTPS with ssl_context
```python
# app.py
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    # Note: This is suitable for learning; do not use the Flask dev server in production.
    app.run(host="0.0.0.0", port=8443, ssl_context=("cert.pem", "key.pem"))
```

Certificate generation (for testing; use proper CA-signed certs in production):
```bash
# Generate a self-signed certificate for localhost (valid for 365 days)
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem \
  -days 365 -subj "/CN=localhost"
```

### Line-by-line explanation
- from flask import Flask, jsonify: Import Flask framework and a helper to return JSON responses.
- app = Flask(__name__): Create the Flask application instance.
- @app.route("/health"): Define a route for health checks.
- def health(): return jsonify({"status": "ok"}): Endpoint returns a simple JSON payload indicating the service is healthy.
- if __name__ == "__main__": Guard to ensure the following runs only when executed directly.
- app.run(host="0.0.0.0", port=8443, ssl_context=("cert.pem","key.pem")): Start the Flask development server with TLS by loading the certificate and private key. This enables HTTPS on port 8443 for testing.
- Certificate generation: The openssl command creates a self-signed cert and key to be used by the server for TLS termination. This is suitable for local testing; replace with a CA-signed cert for production.

## 2. TLS in Modern Python Frameworks (Flask vs FastAPI) and SSL Contexts

### 2A. Flask: Using a custom SSLContext with the built-in server
Code:
```python
# flask_tls_context.py
from flask import Flask, jsonify
import ssl

app = Flask(__name__)

@app.route("/secure")
def secure():
    return jsonify({"secure": True})

def make_ssl_context():
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    # Enforce modern TLS versions
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    # Disable older protocols if available (Python 3.6+ support)
    context.options |= ssl.OP_NO_TLSv1
    context.options |= ssl.OP_NO_TLSv1_1
    # Strong ciphers (system defaults may also be strong)
    context.set_ciphers("ECDHE+AESGCM:!ECDSA:!AES128-SHA:!RC4:!3DES")
    context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    return context

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8443, ssl_context=make_ssl_context())
```

### Line-by-line explanation
- import ssl: Bring Python's SSL module to construct a custom TLS context.
- def make_ssl_context(): Create a helper to configure TLS options for production-like settings.
- context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER): Create an SSL context suitable for TLS servers.
- context.minimum_version = ssl.TLSVersion.TLSv1_2: Require mindestens TLS 1.2 to avoid insecure protocols.
- context.options |= ssl.OP_NO_TLSv1 and OP_NO_TLSv1_1: Explicitly disable TLS 1.0/1.1 if available.
- context.set_ciphers(...): Choose a strong cipher suite; adjust as needed for your OpenSSL version.
- context.load_cert_chain(certfile="cert.pem", keyfile="key.pem"): Load server certificate and key.
- app.run(..., ssl_context=make_ssl_context()): Start Flask with the custom TLS context.

### 2B. FastAPI with Uvicorn: TLS via SSL flags (programmatic)
Code:
```python
# main.py
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/status")
def status():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=443,
        log_level="info",
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem",
    )
```

### Line-by-line explanation
- from fastapi import FastAPI: Import FastAPI to build the API.
- app = FastAPI(): Create the FastAPI application instance.
- @app.get("/status"): Define a simple endpoint to verify service health.
- def status(): return {"status": "ok"}: Endpoint returns a JSON payload.
- if __name__ == "__main__": Guard for direct execution.
- import uvicorn: Import the ASGI server used to run FastAPI.
- uvicorn.run(..., ssl_keyfile="key.pem", ssl_certfile="cert.pem"): Run the app with TLS by supplying the certificate and key to Uvicorn. Port 443 is the standard HTTPS port.

## 3. TLS Best Practices, HSTS, and Production Readiness

TLS configuration is more than just setting a cert. This section covers best practices and how to express them in code, plus how to set secure response headers.

Code: TLS context, HSTS header, and serving behind a proxy
```python
# tls_best_practices.py (Flask example)
from flask import Flask, jsonify, make_response
import ssl

app = Flask(__name__)

@app.route("/secure-headers")
def secure_headers():
    resp = make_response(jsonify({"ok": True}))
    resp.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    return resp

def build_tls_context():
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.options |= ssl.OP_NO_TLSv1
    ctx.options |= ssl.OP_NO_TLSv1_1
    ctx.set_ciphers("ECDHE+AESGCM:!ECDSA:!AES128-SHA:!RC4:!3DES")
    ctx.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    return ctx

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8443, ssl_context=build_tls_context())
```

### Line-by-line explanation
- resp = make_response(...): Build a Flask response object to attach headers.
- resp.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload': Add HSTS header to enforce HTTPS in browsers for a year and across subdomains. The preload flag signals intent for browser vendors to include your domain in the HSTS preload list.
- The TLS context builder mirrors the previous example, ensuring strong TLS: TLS 1.2+, disabled older versions, strong cipher suites, and certificate loading.
- app.run(..., ssl_context=build_tls_context()): Start the Flask server with strong TLS settings.

Note: In production, TLS termination is typically done at a reverse proxy or load balancer (Nginx, Traefik, HAProxy). The backend then uses TLS only for internal communication (mTLS or a private network). The Python app may receive traffic already TLS-terminated, but you can still enforce HTTPS, HSTS, and proper TLS expectations on the ingress.

Code: Nginx TLS termination example (conceptual)
```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    ssl_session_timeout 1h;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:...';
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Line-by-line explanation
- listen 443 ssl; server_name: Nginx listens on 443 with TLS, hosting the API domain.
- ssl_certificate / ssl_certificate_key: Paths to TLS certificate and private key.
- ssl_protocols, ssl_ciphers: Enforce modern TLS versions and strong cipher suites.
- add_header Strict-Transport-Security: Enforce HTTPS by default for clients.
- location / proxy_pass: Forward requests to the backend service (Flask/FastAPI) over HTTP internally. In production, TLS termination occurs at Nginx, so the backend may not see TLS directly.

## 4. Cross-Origin Resource Sharing (CORS) Configuration

CORS controls which browser-originated requests are allowed to access your API. We cover both Flask and FastAPI approaches.

Code: Flask with Flask-CORS
```python
# cors_flask.py
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Restrict origins and enable credentials as needed
CORS(app, resources={
    r"/api/*": {"origins": ["https://example.com", "https://sub.example.com"]}},
    supports_credentials=True
)

@app.route("/api/data")
def data():
    return jsonify({"data": "secure"})

if __name__ == "__main__":
    app.run(ssl_context=("cert.pem","key.pem"), port=8443)
```

Code: FastAPI with CORSMiddleware
```python
# cors_fastapi.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "https://example.com",
    "https://sub.example.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/api/data")
def data():
    return {"data": "secure"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("cors_fastapi:app", host="0.0.0.0", port=443, ssl_keyfile="key.pem", ssl_certfile="cert.pem")
```

### Line-by-line explanation
- Flask-CORS: CORS(app, resources=..., supports_credentials=True): Configure CORS for the app, limiting origins to trusted domains and enabling cookies or Authorization headers when needed.
- FastAPI CORSMiddleware: app.add_middleware(CORSMiddleware, allow_origins=origins, ...): Add CORS middleware with the same intent: only trusted origins can access the API, with specified methods and headers.
- In both examples, the /api/data endpoint is accessible from the approved origins via browser requests, whereas other origins will be blocked by the browser due to CORS policy.

## 5. Common Beginner Mistakes

X. Pitfall: HTTP instead of HTTPS
- Bad:
```python
# bad_http.py
app.run(host="0.0.0.0", port=8080)
```
- Good:
```python
# good_https.py
app.run(host="0.0.0.0", port=8443, ssl_context=("cert.pem","key.pem"))
```

X. Pitfall: Weak TLS configuration (TLS 1.0/1.1, weak ciphers)
- Bad:
```python
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.minimum_version = ssl.TLSVersion.TLSv1
ctx.set_ciphers("RC4-SHA:DES-CBC3-SHA")
```
- Good:
```python
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.minimum_version = ssl.TLSVersion.TLSv1_2
ctx.set_ciphers("ECDHE+AESGCM:!AES128-SHA:!RC4:!3DES")
```

X. Pitfall: Not setting HSTS where TLS is used
- Bad:
```python
# No HSTS header
```
- Good:
```python
# FastAPI snippet
@app.middleware("http")
async def add_hsts(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response
```

X. Pitfall: Overly permissive CORS (origins = ["*"])
- Bad:
```python
# Flask-CORS with wildcard origins
CORS(app, origins="*")
```
- Good:
```python
# FastAPI with restricted origins
origins = ["https://example.com", "https://sub.example.com"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True)
```

## 6. Why This Matters In Real Systems

- Security posture: Proper TLS configuration reduces risk of protocol downgrades, interception, and payload tampering. Enforcing TLS 1.2/1.3 and strong ciphers helps meet regulatory requirements (PCI DSS, HIPAA, GDPR) and improves resilience against known attacks (POODLE, TLS downgrade).
- Operational reliability: Certificate lifecycle management (issuance, renewal, revocation) is critical. Automated solutions (Let’s Encrypt, ACME clients) prevent expired cert failures and ensure continuity.
- Compliance and privacy: HSTS signals browsers to only use HTTPS, reducing the risk of mitm downgrades. CORS misconfigurations can leak data or block legitimate clients; proper origins and credentials handling protect user data in browsers.
- Deployment reality: TLS termination often occurs at a reverse proxy or load balancer. The app should still validate that incoming traffic is TLS-terminated, set appropriate headers, and ensure internal communications are secured if a proxy rests behind a TLS-capable edge.

## 7. Study Questions

1) What is the purpose of TLS when serving an HTTPS endpoint, and what are the main components involved (certificate, private key, handshake)?
2) How do you enable TLS in Flask using the built-in server, and why is this suitable for learning but not recommended for production?
3) In FastAPI with Uvicorn, what are the essential parameters to enable TLS, and where do you place the certificate and key?
4) What is HSTS, and how would you configure it in a Python web framework?
5) Why is overly permissive CORS dangerous, and what is a safe way to configure allowed origins for a public API?

## Exercise

Multi-part hands-on lab: Build and verify a TLS-enabled FastAPI service with restricted CORS and a security header, then verify via a simple client.

Part A — Create a TLS-enabled FastAPI app
- Task: Implement a FastAPI app with a single endpoint /health that returns {"status": "healthy"}.
- Requirements:
  - Use TLS with a self-signed certificate for local testing (cert.pem, key.pem).
  - Enforce TLS 1.2+ and a modern cipher suite in the server run command.
  - Add HSTS header to all responses.
  - Configure CORS to allow only https://example.com and https://sub.example.com, with credentials allowed.

Part B — Run the server with TLS
- Command or script to start the server on port 443 using TLS certs from Part A.
- If using a programmatic approach, provide a minimal Python script to run uvicorn with ssl_keyfile and ssl_certfile.

Part C — Create a tiny TLS client test
- Write a Python script using requests to call https://localhost:443/health with verify=False (for testing) and print the response.
- Then update the script to verify the server TLS configuration by attempting to fetch the URL with verify=True and discuss certificate trust implications.

Part D — Production considerations (short write-up)
- Outline how you would deploy this in a real environment (reverse proxy, certificate automation, and security headers).
- Include a minimal Nginx snippet showing TLS termination at the edge and forwarding to the FastAPI backend over HTTP.

Code snippets for Part A and Part B (FastAPI TLS and CORS)
```python
# part_a_fastapi_tls.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration
origins = [
    "https://example.com",
    "https://sub.example.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy"}

# HSTS via middleware
@app.middleware("http")
async def add_hsts(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("part_a_fastapi_tls:app",
                host="0.0.0.0",
                port=443,
                ssl_keyfile="key.pem",
                ssl_certfile="cert.pem")
```

```bash
# Part B: Run the server (same command as above in practice)
# If you prefer a wrapper script:
python part_a_fastapi_tls.py
```

Certificate generation (for testing)
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 \
  -subj "/CN=localhost"
```

Client test (Part C)
```python
# client_test.py
import requests

url = "https://localhost:443/health"

# Without certificate verification (for testing with self-signed cert)
resp = requests.get(url, verify=False)
print("Status:", resp.status_code, "Body:", resp.json())

# With verification (will fail unless you trust the cert or point to a CA bundle)
# resp = requests.get(url)
# print("Status:", resp.status_code, "Body:", resp.json())
```

Nginx TLS termination snippet (Part D)
```nginx
server {
    listen 443 ssl;
    server_name api.local;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:...';
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

End of lesson.