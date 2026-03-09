# Phase 8 — Infrastructure & Deployment: Logging, Monitoring & Alerting (Node.js)

In modern backend systems, logging, monitoring, and alerting are the connective tissue between development and reliable production. Logs give you a narrative of what happened, metrics quantify the health of your services, and alerts surface issues before users are affected. This lesson teaches practical, production-facing patterns in JavaScript/Node.js, with concrete code you can adapt to your stack.

## 1. Logging Fundamentals in Node.js

Logging is how you understand a system's behavior after the fact and in real time. In production, you want structured, fast logs, with sensible levels, redaction for sensitive data, and correlation IDs to trace requests across services.

```js
// logger.js
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization'],
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  serializers: {
    req(request) {
      const { method, url, headers } = request;
      return { method, url, headers };
    }
  }
});

function requestLogger(req, res, next) {
  req.id = uuidv4();
  logger.info({ reqId: req.id, path: req.url, method: req.method }, 'incoming request');
  res.on('finish', () => {
    logger.info({ reqId: req.id, statusCode: res.statusCode }, 'response sent');
  });
  next();
}

module.exports = { logger, requestLogger };
```

```js
// app.js
const express = require('express');
const { logger, requestLogger } = require('./logger');

const app = express();

// Attach request-scoped logger
app.use(requestLogger);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  // Centralized error logging
  logger.error({ reqId: req?.id, err }, 'unhandled error');
  res.status(500).json({ error: 'internal_server_error' });
});

app.listen(3000, () => logger.info({ port: 3000 }, 'server started'));
```

### Line-by-line explanation

- logger.js
  - Line 1: Import the Pino logger factory.
  - Line 2: Import UUID generator for request IDs.
  - Line 4-18: Create a logger with:
    - Line 5: Log level from env or default to 'info'.
    - Line 6: Redact sensitive fields (e.g., Authorization headers).
    - Line 7-11: Custom level formatter to wrap the level label.
    - Line 12-18: Define a serializer for HTTP requests to include method, URL, headers (for structured logs).
  - Line 20-27: requestLogger middleware:
    - Line 21: Attach a new UUID to every request as req.id.
    - Line 22: Log an incoming request with its id, path, and method.
    - Lines 23-25: When the response finishes, log the response status with the same request id.
    - Line 26: Call next() to continue the middleware chain.
  - Line 29: Export logger and middleware for reuse.

- app.js
  - Line 1-2: Import Express and the logger utilities.
  - Line 4: Create an Express app.
  - Line 6: Register the requestLogger so every request gets a trace id and a log entry.
  - Line 8: Lightweight health endpoint.
  - Lines 10-15: Centralized error-handling middleware that logs errors with the request id when available.
  - Line 17: Start the server on port 3000 and log the startup event.

## 2. Monitoring & Metrics in Node.js

Monitoring turns raw logs into observable signals you can alert on. A common approach in Node.js is to expose Prometheus-compatible metrics (counters, gauges, histograms) and a /metrics endpoint.

```js
// monitoring.js
const client = require('prom-client');

// Collect default metrics (Go/Node metrics like GC, event loop lag, etc.)
client.collectDefaultMetrics({ prefix: 'backend_' });

// Custom metrics
const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 300, 500, 1000, 2000]
});

// Attach metric collection as middleware
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const deltaMs = Date.now() - start;
    const route = req.route?.path || req.path;
    httpRequestDurationMs.labels(req.method, route, res.statusCode).observe(deltaMs);
  });
  next();
}

module.exports = { httpRequestDurationMs, metricsMiddleware, client };
```

```js
// app-with-metrics.js
const express = require('express');
const { logger, requestLogger } = require('./logger');
const { metricsMiddleware, client } = require('./monitoring');

const app = express();

app.use(requestLogger);
app.use(metricsMiddleware);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(3000, () => logger.info({ port: 3000 }, 'server with metrics started'));
```

### Line-by-line explanation

- monitoring.js
  - Line 1: Import the Prometheus client library.
  - Line 4: Register default system metrics (memory usage, CPU, GC, etc.) with a prefix for clarity.
  - Lines 7-14: Define a Histogram metric to capture HTTP request durations:
    - Name, help text, and labels (method, route, status code).
    - Buckets determine the granularity of timing ranges (ms).
  - Lines 17-23: Middleware to measure request duration:
    - Line 18: Capture start time.
    - Line 19-23: After the response finishes, calculate duration and observe it in the histogram with the appropriate labels.
  - Line 25: Export metrics and middleware for use in app.

- app-with-metrics.js
  - Line 1-3: Import Express, logger utilities, and metrics utilities.
  - Line 5-9: Initialize Express app; attach request logging and metrics middleware.
  - Line 11-13: Health endpoint.
  - Lines 15-19: /metrics endpoint that serves Prometheus metrics in the exposition format.
  - Line 21: Start the server and log the startup event.

## 3. Alerting: Detecting Issues and Notifying Teams

Alerting translates metrics and logs into actionable signals when something goes wrong. A pragmatic approach is to implement in-process alerts for critical thresholds (e.g., memory pressure) and optionally integrate with external alerting systems (Slack, PagerDuty, Alertmanager).

```js
// alerting.js
const axios = require('axios');
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK;
const MEM_THRESHOLD_MB = process.env.MEM_THRESHOLD_MB
  ? parseInt(process.env.MEM_THRESHOLD_MB, 10)
  : 600;

function sendSlackAlert(message) {
  if (!ALERT_WEBHOOK) return;
  return axios.post(ALERT_WEBHOOK, { text: message }).catch(() => {});
}

function checkMemoryAndAlert() {
  const memMB = process.memoryUsage().rss / (1024 * 1024);
  if (memMB > MEM_THRESHOLD_MB) {
    const msg = `Memory usage high: ${memMB.toFixed(0)} MB (threshold ${MEM_THRESHOLD_MB} MB)`;
    console.warn(msg);
    return sendSlackAlert(msg);
  }
}

setInterval(checkMemoryAndAlert, 60 * 1000);

module.exports = { checkMemoryAndAlert };
```

```js
// integrate-alerting.js
const { checkMemoryAndAlert } = require('./alerting');

// Optionally perform an initial check at startup
checkMemoryAndAlert();

// If you want to shut off alerts gracefully, you could export a shutdown function too.
```

### Line-by-line explanation

- alerting.js
  - Line 1: Import Axios to send HTTP requests to a webhook (e.g., Slack).
  - Line 2: Read the webhook URL from environment; this is your alert destination.
  - Lines 4-9: Memory threshold configuration, with a sensible default (600 MB).
  - Line 11-15: Helper to post a message to the alerting webhook; it gracefully does nothing if no webhook is configured.
  - Line 17-26: checkMemoryAndAlert function:
    - Line 18: Compute current resident set size (memory in use by the process) in MB.
    - Line 19-25: If memory exceeds threshold, log a warning and send an alert message.
  - Line 28: Schedule the check to run every minute.
- integrate-alerting.js
  - Line 1-3: Import the alerting module and perform an initial health check at startup.

Note: In production, you typically pair in-process alerts with external systems like Alertmanager, Prometheus alerting rules, and response runbooks. This in-process approach gives you immediate visibility and a minimal integration path.

## X. Common Beginner Mistakes

- Pitfall 1: Logging too loosely or too verbosely
  - Bad:
    ```
    console.log('User clicked button');
    ```
  - Good:
    ```
    logger.info({ userId, action: 'button_click', path: req.path }, 'user action');
    ```
  - Why it matters: Structured, machine-readable logs enable efficient search, filtering, and correlation across services.

- Pitfall 2: Not correlating logs across requests
  - Bad:
    ```
    logger.info('processing request');
    ```
  - Good:
    ```
    logger.info({ reqId: req.id, path: req.path }, 'incoming request');
    ```
  - Why it matters: Request IDs enable distributed tracing and root-cause analysis during incidents.

- Pitfall 3: Ignoring errors in async code
  - Bad:
    ```
    async function doWork() {
      await somethingThatFails();
    }
    doWork();
    ```
  - Good:
    ```
    async function doWork() {
      await somethingThatFails();
    }
    doWork().catch(err => logger.error({ err }, 'doWork failed'));
    ```
  - Why it matters: Unhandled rejections can crash processes; proper error logging captures root causes.

- Pitfall 4: Not exposing or configuring metrics endpoints
  - Bad:
    ```
    // No /metrics exposure
    ```
  - Good:
    ```
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    });
    ```
  - Why it matters: Without metrics, you can't observe latency, throughput, or error rates to drive SRE decisions.

- Pitfall 5: Not redacting sensitive data in logs
  - Bad:
    ```
    logger.info({ user: userInfo, password: userInfo.password }, 'login attempt');
    ```
  - Good:
    ```
    // Redact sensitive fields; use serializers or explicit fields
    redact: ['req.headers.authorization', 'password'],
    ```
  - Why it matters: Logs often travel across systems; leaking secrets creates security risk and compliance issues.

- Pitfall 6: Over-reliance on console.time/console.timeEnd in production
  - Bad:
    ```
    console.time('dbQuery');
    // ...
    console.timeEnd('dbQuery');
    ```
  - Good:
    ```
    httpRequestDurationMs.labels(method, route, status).observe(duration);
    ```
  - Why it matters: High-velocity logs from console APIs are not structured or centralized; use a proper metrics/logging pipeline.

## Y. Why This Matters In Real Systems

- Reliability and SRE alignment: Logs, metrics, and alerts are core to incident response, change management, and capacity planning.
- Observability over visibility: Collecting structured logs, multiple metrics, and alerts lets you answer "why did this happen?" quickly, not just "that this happened."
- Scalability: As services scale, centralized logging and metrics prevent log silos and enable cross-service correlation.
- Runbooks and SLAs: Clear alert signals tied to SLOs/SLIs help teams meet reliability targets and trigger automated or semi-automated remediation.
- Security and compliance: Redaction in logs reduces risk of leaking sensitive data while preserving useful context for audits.

## Z. Study Questions

1. What are the benefits of structured logs over plain text logs?
2. How would you correlate a request across multiple services in a distributed system?
3. What is a Prometheus histogram, and how does it help you understand latency?
4. Why is it important to expose a /metrics endpoint in production apps?
5. How can you implement basic alerts inside an application, and when would you prefer an external alerting system?

## Exercise

Part 1: Build a minimal Node.js API with logging, metrics, and alerting

- Create a small Express app with the following endpoints:
  - GET /health — returns { ok: true }
  - GET /items — returns a small in-memory list of items
- Implement logging:
  - Use Pino to log at info/debug levels with a request ID
  - Log incoming requests and responses with structured data
- Implement metrics:
  - Instrument an HTTP request duration histogram (ms) labeled by method, route, and status
  - Expose a /metrics endpoint that serves Prometheus metrics
- Implement alerting:
  - Add a memory usage alert that triggers a Slack (or other webhook) notification if RSS memory exceeds 600 MB (configurable via env)
  - Ensure the alert message includes the current memory usage
- Documentation:
  - Include a README with setup instructions (npm install), run commands, and how to test:
    - curl/Browser to /health
    - curl to /metrics to see Prometheus-formatted metrics
    - Trigger memory alert by simulating memory usage growth (e.g., allocating arrays) and observe the alert webhook invocation
- Deliverables:
  - A single repository with:
    - package.json including dependencies (express, pino, uuid, prom-client, axios)
    - app.js implementing logging, metrics, and endpoints
    - monitoring.js containing metrics setup
    - alerting.js containing memory alert logic
    - instructions to run in a local dev environment

Hints for success:
- Keep secrets out of logs; use redaction in the logger configuration.
- Use process.env to configure log level and alert thresholds.
- When testing alerts locally, you can configure ALERT_WEBHOOK to a test webhook (e.g., a simple webhook URL that echoes messages to a chat channel).

This lesson provides practical patterns used by real systems: structured, fast logging; observable metrics for performance and capacity; and actionable alerts that help maintain service reliability in production.