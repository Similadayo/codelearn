# Phase 8 — Infrastructure & Deployment: Logging, Monitoring & Alerting (Python)

In production backend systems, robust logging, effective monitoring, and timely alerting are non-negotiable. They enable you to diagnose incidents, meet SLOs, and operate systems at scale. This lesson teaches practical patterns for Python backends: structured logging, metrics with Prometheus, alerting pipelines, and lightweight tracing and correlation ID propagation to tie together distributed components.

## 1. Logging Fundamentals in Python

Code example demonstrates basic logging setup, rotating file logs, and multi-channel output to both console and file.

```python
import logging
from logging.handlers import RotatingFileHandler

def setup_logging(log_file='app.log'):
    logger = logging.getLogger('backend')
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        # Console output
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        # Rotating file output
        fh = RotatingFileHandler(log_file, maxBytes=1024 * 1024, backupCount=5)
        fh.setLevel(logging.INFO)
        # Formatting
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(name)s - %(message)s')
        ch.setFormatter(formatter)
        fh.setFormatter(formatter)
        # Attach handlers
        logger.addHandler(ch)
        logger.addHandler(fh)
    return logger

def main():
    logger = setup_logging()
    logger.info("Application starting")
    logger.warning("This is a sample warning")
    try:
        1 / 0  # deliberate error to demonstrate exception logging
    except Exception:
        logger.exception("Unhandled exception occurred")

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- import logging and RotatingFileHandler to enable logging and log rotation.
- def setup_logging(log_file='app.log'): declare a helper to configure logging.
- logger = logging.getLogger('backend'): obtain a module-specific logger named 'backend'.
- logger.setLevel(logging.INFO): set the minimum level to INFO.
- if not logger.handlers: ensure we don’t attach duplicate handlers on reload.
- ch = logging.StreamHandler(): create a console (stdout) output handler.
- ch.setLevel(logging.INFO): set console log level.
- fh = RotatingFileHandler(log_file, maxBytes=1024*1024, backupCount=5): create a file handler that rotates after 1MB and keeps 5 backups.
- fh.setLevel(logging.INFO): set file log level.
- formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(name)s - %(message)s'): define log format.
- ch.setFormatter(formatter); fh.setFormatter(formatter): apply the formatter to both handlers.
- logger.addHandler(ch); logger.addHandler(fh): attach both handlers to the logger.
- return logger: provide the configured logger to the caller.
- def main(): entry point for demonstration.
- logger = setup_logging(): initialize logging.
- logger.info("Application starting"): emit an info message.
- logger.warning("This is a sample warning"): emit a warning.
- try/except with 1/0 to force an exception; logger.exception records stack trace automatically.
- if __name__ == '__main__': standard entry guard.

## 2. Structured Logs for Rich Context

Code example shows a JSON-formatted, structure-friendly log using a custom formatter and optional extra fields (e.g., request_id).

```python
import logging
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Optional extra fields
        if hasattr(record, "request_id"):
            payload["request_id"] = getattr(record, "request_id")
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)

def setup_json_logging():
    logger = logging.getLogger("backend_structured")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        ch = logging.StreamHandler()
        ch.setFormatter(JsonFormatter())
        logger.addHandler(ch)

def main():
    setup_json_logging()
    logger = logging.getLogger("backend_structured")
    logger.info("Processing request", extra={"request_id": "req-12345"})

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- import json, datetime for JSON formatting and timestamping.
- class JsonFormatter(logging.Formatter): create a custom formatter to emit JSON instead of plain text.
- format(self, record): build a dict payload with timestamp, level, logger, and message.
- "timestamp": UTC ISO timestamp; "level": log level; "logger": logger name; "message": log content.
- if hasattr(record, "request_id"): optionally attach a request_id from the log record.
- if record.exc_info: include exception trace if present.
- return json.dumps(payload): emit a JSON string per log event.
- def setup_json_logging(): configure a dedicated logger with the JSON formatter.
- if not logger.handlers: avoid duplicate handlers; add a StreamHandler with JsonFormatter.
- def main(): set up and emit a sample log with extra context (request_id).
- extra={"request_id": "req-12345"} demonstrates how to attach contextual data to logs.

## 3. Metrics and Monitoring with Prometheus

Code example instruments a minimal Flask app with Prometheus metrics: a counter for requests and a histogram for latency, plus a /metrics endpoint.

```python
from flask import Flask, request
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

import time

app = Flask(__name__)

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'http_status'])
REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'HTTP request latency', ['endpoint'])

@app.before_request
def before():
    request.start_time = time.time()

@app.after_request
def after(response):
    latency = time.time() - request.start_time
    endpoint = request.path
    REQUEST_COUNT.labels(request.method, endpoint, response.status_code).inc()
    REQUEST_LATENCY.labels(endpoint).observe(latency)
    return response

@app.route('/health')
def health():
    return "OK"

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(port=8000)
```

### Line-by-line explanation
- from flask import Flask, request: import Flask to build a small web app and access request data.
- from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST: import Prometheus metrics primitives.
- app = Flask(__name__): create the Flask app instance.
- REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'http_status']): define a counter metric with labels for method, endpoint, and status.
- REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'HTTP request latency', ['endpoint']): define a histogram to capture latency per endpoint.
- @app.before_request: record the start time for each request.
- def before(): request.start_time = time.time(): store start time.
- @app.after_request: compute latency and update metrics after each request.
- latency = time.time() - request.start_time: compute elapsed time.
- REQUEST_COUNT.labels(...).inc(): increment the request counter with appropriate labels.
- REQUEST_LATENCY.labels(endpoint).observe(latency): record latency for the endpoint.
- @app.route('/health'): simple health endpoint.
- @app.route('/metrics'): expose Prometheus metrics via generate_latest.
- if __name__ == '__main__': run the app on port 8000.

## 4. Alerting Basics with Thresholds and Integrations

Code example shows a tiny in-process alerting helper that evaluates error rate and latency, and optionally posts to a webhook (e.g., Slack).

```python
import time
import threading
import requests
from collections import deque

class SimpleAlerting:
    def __init__(self, threshold_error_rate=0.05, threshold_latency=0.5, window_size=60, webhook_url=None):
        self.threshold_error_rate = threshold_error_rate
        self.threshold_latency = threshold_latency
        self.window_size = window_size
        self.webhook_url = webhook_url
        self.events = deque(maxlen=window_size)

    def record(self, ok: bool, latency: float):
        self.events.append((ok, latency))
        self.check()

    def check(self):
        if not self.events:
            return
        total = len(self.events)
        errors = sum(1 for ok, _ in self.events if not ok)
        error_rate = errors / total
        avg_latency = sum(lat for _, lat in self.events) / total
        if error_rate > self.threshold_error_rate or avg_latency > self.threshold_latency:
            self.raise_alert(error_rate, avg_latency)

    def raise_alert(self, error_rate, avg_latency):
        if not self.webhook_url:
            print(f"ALERT: error_rate={error_rate:.2f}, avg_latency={avg_latency:.3f}s")
            return
        payload = {"text": f"Alert: high load. error_rate={error_rate:.2f}, avg_latency={avg_latency:.3f}s"}
        try:
            requests.post(self.webhook_url, json=payload, timeout=3)
        except Exception as e:
            print("Failed to send alert:", e)

# Example usage
def simulate_request(alertor: SimpleAlerting, should_error: bool, latency: float):
    ok = not should_error
    time.sleep(latency)
    alertor.record(ok, latency)

if __name__ == "__main__":
    alertor = SimpleAlerting(threshold_error_rate=0.1, threshold_latency=0.7, window_size=30, webhook_url=None)
    for i in range(40):
        simulate_request(alertor, should_error=(i % 7 == 0), latency=0.6)
```

### Line-by-line explanation
- import time, threading, requests: bring timing, HTTP, and optional webhook delivery functionality.
- from collections import deque: fixed-size queue to hold recent events.
- class SimpleAlerting: encapsulates threshold-based alerting logic.
- __init__(...): store thresholds, window size for sampling, and optional webhook URL.
- self.events = deque(maxlen=window_size): maintain a sliding window of recent results.
- def record(self, ok: bool, latency: float): add a result and trigger a check.
- def check(self): compute error rate and average latency from the window; trigger alert when thresholds breached.
- def raise_alert(self, error_rate, avg_latency): either print a local alert or POST to a webhook for integration (Slack, PagerDuty, etc.).
- simulate_request(...): helper to feed synthetic requests into the alerting system.
- __main__ block: run a simple demonstration loop.

## 5. Tracing and OpenTelemetry: Lightweight Distributed Tracing

Code example demonstrates instrumenting a Flask app with OpenTelemetry, using a console exporter to print trace data locally.

```python
from opentelemetry import trace
from opentelemetry.trace import Tracer
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from flask import Flask

# Setup tracing
provider = TracerProvider()
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)
span_exporter = ConsoleSpanExporter()
span_processor = SimpleSpanProcessor(span_exporter)
provider.add_span_processor(span_processor)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.route("/process")
def process():
    with tracer.start_as_current_span("process_operation"):
        # simulate work
        import time
        time.sleep(0.1)
        return "processed"

if __name__ == "__main__":
    app.run(port=8080)
```

### Line-by-line explanation
- from opentelemetry import trace and related imports: bring OpenTelemetry APIs and SDK components.
- provider = TracerProvider(); trace.set_tracer_provider(provider): initialize a tracer provider to enable tracing.
- tracer = trace.get_tracer(__name__): obtain a tracer for this module.
- span_exporter = ConsoleSpanExporter(): use a simple console exporter to print spans for debugging locally.
- span_processor = SimpleSpanProcessor(span_exporter); provider.add_span_processor(span_processor): attach the exporter to the tracer provider.
- app = Flask(__name__): create a Flask app.
- FlaskInstrumentor().instrument_app(app): automatically instrument Flask to create spans for routes.
- @app.route("/process"): a sample endpoint.
- with tracer.start_as_current_span("process_operation"): create a child span for the operation to demonstrate tracing context propagation.
- time.sleep(0.1): simulate work inside the span.
- if __name__ == "__main__": run the app on port 8080.

## 6. Correlation IDs: Propagating Context Across Services

Code example shows how to generate and propagate a correlation_id header through Flask requests and include it in logs for traceability.

```python
from flask import Flask, request, g
import uuid
import logging

def create_app():
    app = Flask(__name__)
    logger = logging.getLogger("backend")

    @app.before_request
    def before():
        correlation_id = request.headers.get("X-Correlation-Id")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        g.correlation_id = correlation_id
        # Attach correlation_id to a per-request logger
        request.logger = logging.LoggerAdapter(logger, {"correlation_id": correlation_id})

    @app.after_request
    def after(response):
        response.headers["X-Correlation-Id"] = g.correlation_id
        return response

    @app.route("/items")
    def items():
        request.logger.info("Handling /items request")
        return "items"

    @app.route("/health")
    def health():
        request.logger.info("Health check")
        return "OK"

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(port=5000)
```

### Line-by-line explanation
- from flask import Flask, request, g: import Flask web app components and a thread-local storage object g for per-request data.
- import uuid and logging: for correlation ID generation and logging.
- def create_app(): define a factory to create the app (helps with testing and configurability).
- logger = logging.getLogger("backend"): obtain a module-specific logger.
- @app.before_request: function run before every request.
- correlation_id = request.headers.get("X-Correlation-Id"): read correlation ID from incoming header if present.
- if not correlation_id: generate a new UUID to ensure a correlation context exists.
- g.correlation_id = correlation_id: store the correlation ID in the request context.
- request.logger = logging.LoggerAdapter(logger, {"correlation_id": correlation_id}): create a per-request logger that automatically includes correlation_id in log records.
- @app.after_request: ensure correlation ID is echoed back in the response headers for downstream services.
- @app.route("/items"): example endpoint uses the per-request logger to emit a message including correlation context.
- @app.route("/health"): another endpoint illustrating correlation propagation in health checks.
- if __name__ == "__main__": standard entry point to run the app.

## X. Common Beginner Mistakes

Bad vs Good examples to help you spot common pitfalls in logging, metrics, and alerting.

1) Pitfall: Logging via print() instead of a logger
- Bad:
```python
def handle_request():
    print("INFO: handling request")
```
- Good:
```python
import logging
logger = logging.getLogger("backend")
def handle_request():
    logger.info("handling request")
```

2) Pitfall: Logging sensitive data
- Bad:
```python
def login(user, password):
    print({"user": user, "password": password})
```
- Good:
```python
def login(user):
    logger.info("Login attempt for user_id=%s", user)
```

3) Pitfall: Not configuring log level, formatting, or rotation
- Bad:
```python
import logging
logger = logging.getLogger()
logger.addHandler(logging.StreamHandler())
# No explicit level or rotation
```
- Good:
```python
import logging
logger = logging.getLogger("backend")
logger.setLevel(logging.INFO)
fh = RotatingFileHandler("service.log", maxBytes=1024*1024, backupCount=3)
formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)
```

4) Pitfall: Missing correlation_id in logs across components
- Bad:
```python
logger.info("Request received")
```
- Good:
```python
logger_adapter = logging.LoggerAdapter(logger, {"correlation_id": correlation_id})
logger_adapter.info("Request received")
```

5) Pitfall: Not exporting or exposing metrics
- Bad:
```python
# No metrics exposure; hard to observe production behavior
```
- Good:
```python
from prometheus_client import Counter, Histogram, start_http_server
REQUEST_COUNT = Counter('http_requests_total', 'Total requests')
REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'Request latency')
```
Then instrument endpoints to increment and observe.

## Y. Why This Matters In Real Systems

- Reliability and incident response: Centralized logs, metrics, and traces enable faster root-cause analysis and reduced MTTR.
- Observability at scale: As a system grows (multi-service, multi-tenant, containerized), structured logs, per-request IDs, and metrics become the glue tying components together.
- Operability: Alerting with meaningful thresholds prevents alert fatigue and ensures on-call teams see actionable signals.
- Compliance and security: Avoid logging sensitive data; implement redaction and access controls; manage log retention and encryption.
- Performance considerations: Use log rotation, sane retention policies, and asynchronous logging when necessary to avoid blocking hot-path code.

## Z. Study Questions

1) What is the difference between a log message and a metric?
2) How would you implement structured JSON logging in Python, and why is it beneficial?
3) How do you expose Prometheus metrics in a Python web service?
4) What is a correlation_id, and how does it help in tracing requests across services?
5) Name two common alerting mechanisms and what they typically monitor (e.g., error rate, latency).

## Exercise

Part A: Build a minimal Flask app with logging, metrics, and optional alerting.

- Goals:
  - Implement a basic Flask app with two endpoints: /health and /items.
  - Use rotating file logging and a console log.
  - Expose Prometheus metrics for requests and latency at /metrics.
  - Add a lightweight alerting mechanism that triggers when error rate or latency crosses thresholds; support an optional webhook URL for Slack or similar.
  - Propagate a correlation_id with logging.

- Steps:
  1) Install dependencies
  2) Create app.py with combined features
  3) Run the app and verify:
     - /metrics shows metrics
     - Access /health and /items to generate logs and metrics
     - If an alert condition is triggered, observe console or webhook delivery

- Example combined app (app.py):

```python
import os
import time
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request, g, jsonify
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import requests
import json
import uuid

# 1) Logging setup
logger = logging.getLogger("backend_exercise")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    fh = RotatingFileHandler('exercise_app.log', maxBytes=1024*1024, backupCount=3)
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s')
    ch.setFormatter(formatter)
    fh.setFormatter(formatter)
    logger.addHandler(ch)
    logger.addHandler(fh)

# 2) Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'http_status'])
REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'HTTP request latency', ['endpoint'])

# 3) Alerting (optional Slack webhook)
WEBHOOK_URL = os.environ.get('SLACK_WEBHOOK')

# 4) App and correlation
app = Flask(__name__)

@app.before_request
def before():
    correlation_id = request.headers.get("X-Correlation-Id") or str(uuid.uuid4())
    g.correlation_id = correlation_id
    # per-request logger with correlation_id
    request.logger = logging.LoggerAdapter(logger, {"correlation_id": correlation_id})

@app.after_request
def after(response):
    # propagate correlation id back to client
    response.headers["X-Correlation-Id"] = g.correlation_id
    return response

# Simple in-memory store (for demonstration)
ITEMS = [{"id": 1, "name": "widget"}, {"id": 2, "name": "gadget"}]

@app.route("/health")
def health():
    request.logger.info("Health check performed")
    return jsonify({"status": "healthy"}), 200

@app.route("/items")
def items():
    start = time.time()
    # simulate some work
    time.sleep(0.05)
    latency = time.time() - start
    REQUEST_COUNT.labels(request.method, request.path, 200).inc()
    REQUEST_LATENCY.labels(request.path).observe(latency)
    request.logger.info("Fetched items", extra={"correlation_id": g.correlation_id})
    return jsonify(ITEMS)

# Prometheus metrics endpoint
@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

# Simple in-process alert check (runs on each request)
def check_and_alert(error_detected: bool, latency: float):
    # Example thresholds
    threshold_latency = 0.1  # seconds (adjust for demonstration)
    threshold_error = False  # placeholder for real error signals
    if error_detected or latency > threshold_latency:
        payload = {
            "text": f"Alert: high load or error. latency={latency:.3f}s"
                       f"{', error detected' if error_detected else ''}"
        }
        if WEBHOOK_URL:
            try:
                requests.post(WEBHOOK_URL, json=payload, timeout=2)
            except Exception as e:
                logger.error("Failed to send alert: %s", e)
        else:
            logger.info("ALERT: %s", payload["text"])

# Run
if __name__ == "__main__":
    app.run(port=5000)
```

- Optional usage notes:
  - Install dependencies: flask, prometheus_client, requests
  - Run: SLACK_WEBHOOK=https://hooks.slack.com/... python app.py
  - Access: http://localhost:5000/metrics to view metrics
  - Access: http://localhost:5000/health and http://localhost:5000/items to generate logs and metrics

This completes a compact, practical lesson on logging, monitoring, and alerting in Python backend services.