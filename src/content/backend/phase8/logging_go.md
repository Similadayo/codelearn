# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment: Logging, Monitoring & Alerting in Go

Compelling introductory paragraph: In modern backend systems, what you can’t measure you can’t fix. Logging gives you a detailed, structured narrative of what happened, tracing ties together distributed requests, and metrics quantify system behavior over time. When combined with alerting, you can detect problems before users notice and automate responses. This lesson focuses on building robust logging, tracing, and alerting for Go services, with practical code samples that you can adapt to real deployments.

## 1. Logging in Go: Structured Logging with Zap

Go’s logging story grows from plain text into structured JSON logs that are easy to search and correlate with traces and metrics. Using a structured logger like Zap improves observability, enables filtering, and supports adding contextual fields (request IDs, user IDs, etc.) without manual string composition.

```go
package main

import (
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

func main() {
	// Production-grade, structured logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	// Simple HTTP handler
	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		// Lightweight request ID (could be replaced with a UUID)
		reqID := fmt.Sprintf("%d", time.Now().UnixNano())

		// Create a logger with request-scoped fields
		l := logger.With(
			zap.String("request_id", reqID),
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.String("remote_addr", r.RemoteAddr),
			zap.Time("ts", time.Now()),
		)

		// Business logic (example)
		w.Write([]byte("hello\n"))

		// Example log line with structured data
		l.Info("handled /hello request")
	})

	// Run server
	http.ListenAndServe(":8080", nil)
}
```

### Line-by-line explanation
- import block: Bring in standard library components and Zap logger.
- main: Initialize a production-grade Zap logger; defer sync to flush buffers on exit.
- http.HandleFunc: Register a route for /hello.
- reqID: Generate a simple, unique-ish request identifier from the current time.
- l := logger.With(...): Create a logger instance augmented with contextual fields for this request.
- w.Write: Perform the basic response (business logic placeholder).
- l.Info(...): Emit a structured log line that includes request context.

Common pitfalls this code avoids:
- Logging plain strings with fmt.Printf instead of structured fields.
- Missing request-scoped context that makes logs hard to correlate with traces or metrics.

## 2. Distributed Tracing with OpenTelemetry in Go

Tracing helps you understand how a request traverses services. OpenTelemetry provides a standard, vendor-agnostic approach. This example uses a stdout exporter for simplicity; in production you’d export to Jaeger, Zipkin, or a centralized OTLP collector.

```go
package main

import (
	"context"
	"log"
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
	// Set up a stdout exporter (readable traces)
	exp, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	if err != nil {
		log.Fatal(err)
	}
	tp := trace.NewTracerProvider(
		trace.WithSampler(trace.AlwaysSample()),
		trace.WithSyncer(exp),
	)
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	// HTTP server with OpenTelemetry instrumentation
	mux := http.NewServeMux()
	mux.Handle("/hello", otelhttp.NewHandler(http.HandlerFunc(helloHandler), "hello"))

	http.ListenAndServe(":8081", mux)
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
	// You can still use standard logs; traces provide the correlation
	w.Write([]byte("hello\n"))
}
```

### Line-by-line explanation
- Imports: Bring in OpenTelemetry components and the otelhttp instrumentation wrapper.
- main: Create a stdout exporter to visualize traces during development.
- NewTracerProvider: Build a tracer provider with a simple always-sample policy and a syncer for the exporter.
- otel.SetTracerProvider: Make the tracer provider globally available for instrumentation.
- http.ServeMux and otelhttp.NewHandler: Wrap the /hello route with OpenTelemetry so incoming requests carry trace context.
- helloHandler: Basic HTTP handler that responds; traces will reflect requests through the server.

Common pitfalls this code avoids:
- Rolling your own tracing with ad-hoc IDs, which makes traces hard to correlate.
- Not propagating context across async work or external calls.

## 3. Metrics & Prometheus in Go

Metrics quantify behavior and enable alerting. Prometheus client_golang makes it straightforward to expose counters and histograms. Expose a /metrics endpoint and collect per-path, per-method metrics.

```go
package main

import (
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	reqCount = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests",
		},
		[]string{"path", "method"},
	)

	reqDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"path", "method"},
	)
)

func init() {
	prometheus.MustRegister(reqCount, reqDuration)
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		w.Write([]byte("hello\n"))
		duration := time.Since(start).Seconds()

		reqCount.WithLabelValues("/hello", r.Method).Inc()
		reqDuration.WithLabelValues("/hello", r.Method).Observe(duration)
	})

	// Expose metrics endpoint
	mux.Handle("/metrics", promhttp.Handler())

	http.ListenAndServe(":8082", mux)
}
```

### Line-by-line explanation
- Imports: Bring in Prometheus client libraries for metrics and the HTTP metrics handler.
- var block: Define two metrics:
  - reqCount: CounterVec to count requests by path and method.
  - reqDuration: HistogramVec to record request durations by path and method.
- init(): Register the metrics with Prometheus so they’re exposed on /metrics.
- main(): Create an HTTP server with a /hello endpoint.
- Handler: Record the duration of the request and increment the request counter after writing the response.
- /metrics: The Prometheus metrics endpoint consumed by Prometheus scrapes.

Common pitfalls this code avoids:
- Logging only in logs, but not capturing performance characteristics.
- Using a single global counter without labels to slice by path/method.

## 4. Alerts, Dashboards & Production Workflows

Observability is useless without timely notices and actionable dashboards. This section shows how to set up a simple alert rule for latency and a minimal Alertmanager configuration to forward alerts to Slack (placeholders used for API URL).

Prometheus alert rules (prometheus_alert_rules.yml):
```yaml
groups:
- name: latency_rules
  rules:
  - alert: HighRequestLatency
    expr: rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]) > 0.5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High request latency detected"
      description: "Average latency > 0.5s over the last 5 minutes."
```

Alertmanager configuration (alertmanager.yml):
```yaml
route:
  receiver: 'slack-notifications'
receivers:
- name: 'slack-notifications'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/EXAMPLE/EXAMPLE/EXAMPLE'  # placeholder
    channel: '#ops-alerts'
    username: 'alertmanager'
```

### Line-by-line explanation
- Prometheus rule: Uses the Prometheus histogram metrics http_request_duration_seconds_sum and http_request_duration_seconds_count to compute an average latency. If the average latency over the last 5 minutes exceeds 0.5 seconds for 5 minutes, trigger HighRequestLatency.
- Alertmanager: Routes alerts to a Slack channel. api_url is a placeholder; in real deployments you’d configure a proper webhook URL or a configured receiver (email, PagerDuty, Slack, etc.), and you’d manage secret values securely.

Common pitfalls this section helps avoid:
- Relying on ad-hoc alerts (e.g., daily checks) instead of automated, trigger-based alerts.
- Not routing alerts to a human on-call channel or not using a proper escalation policy.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Logging unstructured text vs structured fields
  Bad:
  ```go
  log.Printf("User %s performed action /login", userID)
  ```
  Good:
  ```go
  log.L().Info("user_action",
      zap.String("user_id", userID),
      zap.String("action", "login"),
  )
  ```

- Pitfall 2: Not propagating trace context into downstream calls
  Bad:
  ```go
  resp, err := http.Get("http://service.internal")
  ```
  Good:
  ```go
  req, _ := http.NewRequest("GET", "http://service.internal", nil)
  otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
  resp, err := http.DefaultClient.Do(req.WithContext(ctx))
  ```

- Pitfall 3: Ignoring metrics in hot paths or duplicating metrics
  Bad:
  ```go
  // Logging only; no metrics
  w.Write([]byte("ok"))
  ```
  Good:
  ```go
  start := time.Now()
  w.Write([]byte("ok"))
  duration := time.Since(start).Seconds()
  reqCount.WithLabelValues("/health", "GET").Inc()
  reqDuration.WithLabelValues("/health", "GET").Observe(duration)
  ```

- Pitfall 4: Logging sensitive data or PII
  Bad:
  ```go
  logger.Info("auth", zap.String("password", pwd))
  ```
  Good:
  ```go
  logger.Info("auth_attempt", zap.String("username", username), zap.Bool("authenticated", isAuth))
  // Never log passwords, tokens, or secrets
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability and debugging: Structured logs, traces, and metrics enable pinpointing root causes quickly, reducing MTTR (mean time to repair).
- Incident response: Alerts combined with dashboards give on-call teams actionable signals, enabling faster containment and remediation.
- Performance insights: Histograms and latency metrics reveal tail behavior (p95/p99) and help guide capacity planning.
- Compliance and security: Centralized logging helps with audits and anomaly detection, as well as enforcing least-privilege access to sensitive data in logs.
- Operational scalability: Logging/metrics/tracing should not become bottlenecks; use asynchronous sinks, batching, and non-blocking instrumentation to avoid degrading request latency.

## Z. Study Questions — 5 recall questions

1. What is the primary purpose of a tracing system in a distributed Go application?
2. How does a Prometheus histogram help you understand latency, and what are common histogram metrics named by Prometheus conventions?
3. Why is it important to add contextual fields (like request_id) to logs, and how do you propagate that context across services?
4. What is the role of Alertmanager in a Prometheus-based observability stack?
5. Name two potential pitfalls when instrumenting logging in a high-throughput service and how to mitigate them.

## Exercise — a practical multi-part coding challenge

Part 1: Build a small Go HTTP server with logging, metrics, and tracing
- Create a Go project with the following requirements:
  - Use Zap for logging with structured fields (request_id, path, method).
  - Expose Prometheus metrics: http_requests_total and http_request_duration_seconds for the /hello endpoint.
  - Instrument the server with OpenTelemetry using a stdout exporter, and expose a /hello OTLP-like trace via otelhttp.
  - Expose a /health endpoint and a /metrics endpoint.

Starter code (all-in-one) you can adapt:
```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

var (
	reqCount = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests",
		},
		[]string{"path", "method"},
	)
	reqDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"path", "method"},
	)
)

func init() {
	prometheus.MustRegister(reqCount, reqDuration)
}

func main() {
	// Zap logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// OTLP/stdout exporter
	exp, _ := stdouttrace.New(stdouttrace.WithPrettyPrint())
	tp := trace.NewTracerProvider(trace.WithSyncer(exp))
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	mux := http.NewServeMux()

	// Hello handler with tracing wrapper
	mux.Handle("/hello", otelhttp.NewHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		method := r.Method
		start := time.Now()

		// Simple request_id for demonstration
		reqID := fmt.Sprintf("%d", time.Now().UnixNano())
		l := logger.With(zap.String("request_id", reqID), zap.String("path", path), zap.String("method", method))

		// Business logic
		w.Write([]byte("hello\n"))

		// Metrics
		reqCount.WithLabelValues(path, method).Inc()
		reqDuration.WithLabelValues(path, method).Observe(time.Since(start).Seconds())

		l.Info("handled request")
	}), "hello"))

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok\n"))
	})

	// Metrics endpoint
	mux.Handle("/metrics", promhttp.Handler())

	// Run server
	http.ListenAndServe(":8083", mux)
}
```

Part 2: Extend with request-id propagation and improved logs
- Add a middleware to generate or propagate a request_id and ensure downstream calls/handlers include it in logs and traces.
- Update logs to consistently carry request_id and ensure downstream HTTP calls propagate the trace context.

Part 3: Add a basic Prometheus alert rule and Alertmanager config
- Create a simple latency-based alert rule (as shown earlier) and configure Alertmanager to forward critical alerts to Slack (use a placeholder URL).
- Explain how you would test the alert rule by simulating latency or load.

Notes for implementation:
- In real deployments, you would swap stdout exporters for OTLP to a central collector (Jaeger/Tempo) and wire your metrics to a remote Prometheus instance.
- For production-grade request IDs, consider using a UUID generator (e.g., github.com/google/uuid) and propagate across downstream services and databases.

If you’d like, I can tailor the exercise to a specific cloud environment (GKE, EKS, or self-hosted) or expand any section (e.g., adding tracing sampling, multi-tenant logging, or per-service dashboards).