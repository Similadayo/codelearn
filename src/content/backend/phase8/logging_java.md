# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment
Topic: Logging, Monitoring & Alerting (Java)

Logging, monitoring, and alerting are the observability pillars that let you understand what your systems are doing in production. In Java backend services, well-implemented logging provides actionable context; structured logging and correlation IDs help trace flows across services; metrics give you visibility into health and performance; and alerting closes the loop by notifying operators before users are affected. This lesson teaches practical techniques, patterns, and code you can apply in real systems.

## 1. Logging Fundamentals in Java

In professional backends, logging is your primary instrument for debugging, auditing, and performance analysis. You want logs that are reliable, searchable, and minimally intrusive to latency. Start with a solid logger (SLF4J façade with Logback or Log4j2) and zero-friction log levels, then layer in structure (JSON) and correlation IDs for cross-service tracing.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    public void placeOrder(String userId, String productId, int quantity) {
        logger.info("Placing order: userId={}, productId={}, quantity={}", userId, productId, quantity);
        if (quantity <= 0) {
            logger.warn("Invalid quantity encountered: {}", quantity);
        }
        // Business logic...
        logger.debug("Order placement processed for user {}", userId);
    }
}
```

```xml
<!-- logback.xml (basic console appender) -->
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="STDOUT"/>
  </root>
</configuration>
```

### Line-by-line explanation
- import org.slf4j.Logger; import org.slf4j.LoggerFactory;
  - Bring SLF4J logging interfaces into the class.
- private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
  - Create a logger instance scoped to this class; this is the usual per-class pattern.
- logger.info("Placing order: userId={}, productId={}, quantity={}", userId, productId, quantity);
  - Log an informational event with structured placeholders to avoid string concatenation costs.
- if (quantity <= 0) { logger.warn("Invalid quantity encountered: {}", quantity); }
  - Emit a warning when business-invalid input is detected.
- logger.debug("Order placement processed for user {}", userId);
  - Emit a debug-level trace for deeper investigation; typically disabled in production.
- The Logback config defines a console appender and a human-readable pattern; root level INFO ensures production logs are concise unless you enable DEBUG in envs.

## 2. Structured Logging with MDC and JSON Output

Structured logging with a JSON encoder and correlation context (MDC) makes logs machine-parsable and sortable by fields like request_id, user_id, and trace_id, enabling efficient searching in log systems.

```xml
<!-- pom.xml dependencies for JSON logging (logstash encoder) -->
<dependency>
  <groupId>net.logstash.logback</groupId>
  <artifactId>logstash-logback-encoder</artifactId>
  <version>6.6</version>
</dependency>
```

```xml
<!-- logback.xml using LogstashEncoder for JSON output -->
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder" />
  </appender>

  <root level="INFO">
    <appender-ref ref="STDOUT"/>
  </root>
</configuration>
```

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

public class HttpRequestHandler {
  private static final Logger logger = LoggerFactory.getLogger(HttpRequestHandler.class);

  public void handle(String requestId, String userId) {
     MDC.put("request_id", requestId);
     MDC.put("user_id", userId);
     try {
        logger.info("Handling request");
        // Simulated work
     } finally {
        MDC.clear();
     }
  }
}
```

### Line-by-line explanation
- dependency: logstash-logback-encoder provides a JSON layout for logback.
- logback.xml: encoder class is LogstashEncoder, which outputs every log event as JSON with fields like @timestamp, @fields, level, message, etc.
- MDC.put("request_id", requestId); MDC.put("user_id", userId);
  - Populate a per-request context that travels with logs from a single request across services.
- try { ... } finally { MDC.clear(); }
  - Ensure MDC state is cleared to avoid cross-request leakage in thread pools.

## 3. Metrics & Monitoring with Micrometer (Spring Boot example)

Metrics give you quantitative visibility into throughput, latency, error rates, and resource usage. Micrometer is the de facto metrics facade in the Java ecosystem; exporting to Prometheus is common in production. This example shows a Spring Boot setup with a simple endpoint instrumented with a Counter and a Timer.

```xml
<!-- pom.xml dependencies for Spring Boot Actuator and Prometheus -->
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
  </dependency>
  <dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
  </dependency>
</dependencies>
```

```properties
# application.properties
management.endpoints.web.exposure.include=health,info,prometheus
management.endpoint.prometheus.enabled=true
```

```java
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
public class MetricsController {
  private final MeterRegistry registry;

  public MetricsController(MeterRegistry registry) {
    this.registry = registry;
  }

  @GetMapping("/demo")
  public String demo() {
    Counter calls = registry.counter("demo_calls_total", "endpoint", "/demo");
    Timer timer = registry.timer("demo_call_duration_seconds", "endpoint", "/demo");

    return timer.recordCallable(() -> {
      calls.increment();
      try {
        // Simulate work
        Thread.sleep(50);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
      return "ok";
    });
  }
}
```

Explanation of configuration:
- Actuator exposes /actuator/prometheus by enabling the Prometheus endpoint.
- Micrometer is used to create a Counter (demo_calls_total) and a Timer (demo_call_duration_seconds) with a common tag endpoint="/demo".
- Timer.recordCallable(...) measures the duration of the enclosed callable and records it into Prometheus.

```yaml
# Optional: if you need explicit Prometheus scrape config in Prometheus server
# prometheus.yml (snippet)
scrape_configs:
  - job_name: 'java-services'
    static_configs:
      - targets: ['host1:8080', 'host2:8080']
```

### Line-by-line explanation
- import io.micrometer.core.instrument.*;
  - Bring Micrometer primitives into use for metrics.
- Counter calls = registry.counter("demo_calls_total", "endpoint", "/demo");
  - Define a counter metric with a labeled dimension for the endpoint.
- Timer timer = registry.timer("demo_call_duration_seconds", "endpoint", "/demo");
  - Define a timer metric to capture duration, with endpoint tag for context.
- return timer.recordCallable(() -> { ... });
  - Execute the block while automatically recording the duration; in this case, a simulated 50ms task.
- management.endpoints.web.exposure.include and management.endpoint.prometheus.enabled
  - Enable the Prometheus scrape endpoint in Spring Boot Actuator.

## 4. Distributed Tracing with OpenTelemetry

Distributed tracing helps you understand request flows across services. OpenTelemetry provides APIs and an ecosystem to emit traces to a backend (Jaeger, Zipkin, OTLP collectors). You can instrument manually or via auto-instrumentation agents.

```xml
<!-- pom.xml dependencies for OpenTelemetry (manual instrumentation) -->
<dependency>
  <groupId>io.opentelemetry</groupId>
  <artifactId>opentelemetry-api</artifactId>
  <version>1.23.0</version>
</dependency>
<dependency>
  <groupId>io.opentelemetry</groupId>
  <artifactId>opentelemetry-sdk</artifactId>
  <version>1.23.0</version>
</dependency>
```

```java
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.SpanKind;

public class UserService {
  private static final Tracer tracer = GlobalOpenTelemetry.getTracer("com.example.app", "1.0.0");

  public void getUser(String userId) {
     Span span = tracer.spanBuilder("UserService.getUser")
        .setSpanKind(SpanKind.INTERNAL)
        .startSpan();
     try {
        span.setAttribute("user.id", userId);
        // Simulated work
        Thread.sleep(20);
     } catch (InterruptedException e) {
        span.recordException(e);
        Thread.currentThread().interrupt();
     } finally {
        span.end();
     }
  }
}
```

Optionally, configure OTLP exporter ( Jaeger/Tempo/OTLP collector):
```java
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;

public class TelemetryConfig {
  public static OpenTelemetry initOpenTelemetry() {
     OtlpGrpcSpanExporter exporter = OtlpGrpcSpanExporter.builder()
         .setEndpoint("http://localhost:4317")
         .build();

     SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
         .addSpanProcessor(BatchSpanProcessor.builder(exporter).build())
         .build();

     OpenTelemetry openTelemetry = io.opentelemetry.sdk.OpenTelemetrySdk.builder()
         .setTracerProvider(tracerProvider)
         .buildAndRegisterGlobal();

     return openTelemetry;
  }
}
```

Line-by-line explanation
- Tracer tracer = GlobalOpenTelemetry.getTracer("com.example.app", "1.0.0");
  - Obtain a named tracer for your package/app; the version is a semantic tag.
- spanBuilder("UserService.getUser").startSpan();
  - Create a new span representing the operation, with a kind (INTERNAL, SERVER, CLIENT, etc.).
- span.setAttribute("user.id", userId);
  - Attach contextual attributes to the span.
- span.end();
  - Finish the span to export it to the configured exporter.

 exporter notes:
- OTLP exporter sends spans to a collector; you can run Jaeger/Tempo to visualize traces.
- You can also use a javaagent-based auto-instrumentation for broader coverage.

## 5. Health Checks, Readiness & Alerting Basics

In production, you expose health/readiness endpoints and ensure alerts trigger before end-users are affected. Spring Boot Actuator provides ready/health endpoints out of the box; you can add custom indicators to reflect downstream dependencies (DB, cache, external services).

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
public class DiskSpaceHealthIndicator implements HealthIndicator {
  @Override
  public Health health() {
     File root = new File("/");
     long free = root.getFreeSpace();
     if (free < 1024L * 1024L * 100) { // < 100 MB
        return Health.down().withDetail("diskFreeBytes", free).build();
     }
     return Health.up().withDetail("diskFreeBytes", free).build();
  }
}
```

Line-by-line explanation
- Implement HealthIndicator to integrate with Spring Boot’s health endpoint.
- Check a critical dependency (disk space) and return Health.up() or Health.down() accordingly.
- This health signal can be used by Kubernetes liveness/readiness probes or alerting rules.

### Line-by-line explanation (for the example above)
- @Component
  - Register the indicator as a Spring bean so it participates in the /actuator/health response.
- health() method
  - Reads the free disk space; if under threshold, marks the service as unhealthy, which can trigger alerts and rollouts.

## X. Common Beginner Mistakes

Bad vs Good code (three real pitfalls)

1) Bad: String concatenation in logs (performance and readability)
- Bad:
```java
logger.info("User " + userId + " performed " + action);
```
- Good:
```java
logger.info("User {} performed {}", userId, action);
```

### Line-by-line explanation
- Bad uses string concatenation, creating intermediate strings even if the log level is disabled.
- Good uses placeholder syntax which avoids unnecessary string creation when the log level is not enabled.

2) Bad: Logging sensitive data
- Bad:
```java
logger.info("Credentials: user={} pass={}", user, password);
```
- Good:
```java
logger.info("User login attempt for userId={}", user.getId());
// Do not log passwords or sensitive tokens; redact values or avoid logging them.
```

### Line-by-line explanation
- Bad logs sensitive user information that could leak in logs.
- Good omits password data; consider redaction or masking for compliance and security.

3) Bad: Not using correlation context (MDC) in distributed calls
- Bad:
```java
logger.info("Starting operation A");
callServiceB();
logger.info("Finished operation A");
```
- Good:
```java
MDC.put("request_id", requestId);
logger.info("Starting operation A");
callServiceB();
logger.info("Finished operation A");
MDC.clear();
```

### Line-by-line explanation
- Bad logs lack a trace context to tie log events across services.
- Good injects a correlation id in MDC so logs from different services can be correlated in a single trace/search.

4) Bad: Over-logging in hot paths
- Bad:
```java
while (true) {
  logger.debug("tick");
  Thread.sleep(1);
}
```
- Good:
```java
if (logger.isDebugEnabled()) {
  logger.debug("tick at {}", System.currentTimeMillis());
}
```

### Line-by-line explanation
- Bad logs every tiny iteration, generating excessive I/O and CPU overhead.
- Good guards the logging call with isDebugEnabled to avoid the cost when disabled.

5) Bad: Missing metrics or incorrect units
- Bad:
```java
registry.counter("requests"); // no labels, ambiguous
```
- Good:
```java
Counter requests = registry.counter("http_requests_total", "method", "GET", "endpoint", "/status");
```

### Line-by-line explanation
- Bad metric naming and lack of dimensionality make monitoring obscure.
- Good uses descriptive metric names and labels to enable meaningful aggregation in dashboards.

## Y. Why This Matters In Real Systems

- Observability accelerates debugging: When incidents occur, you need precise, searchable logs, traces that reveal latency hot spots, and metrics that quantify the problem.
- Production health depends on performance-aware logging: avoid noisy logs in hot paths; use structured, JSON logs for fast ingestion into management systems like ELK, Splunk, or cloud logging APIs.
- Correlation IDs unlock end-to-end tracing across services, enabling you to answer: where did the user request go? which service added latency? what caused the error?
- Proactive alerting protects users: well-tuned alert rules (e.g., error rate rises, latency spikes, dependency failures) reduce MTTR and prevent outages.
- Security and compliance: guard sensitive data in logs; implement access controls on log archives; ensure metrics and traces do not leak secrets.

## Z. Study Questions

1. What is the advantage of using placeholder logging (e.g., logger.info("User {} performed {}", userId, action)) over string concatenation?
2. How do MDC context fields help when logs span multiple services? Give an example of a request_id flow.
3. Why is exporting metrics to Prometheus (or another backend) important for production systems?
4. What is OpenTelemetry, and why might you use an OTLP exporter in a Java application?
5. Name two common health indicators you might implement beyond a simple "is the app running?" check.

## Exercise

Part 1 — Set up logging and MDC in a Spring Boot app
- Create a Spring Boot project (via start.spring.io or your favorite template).
- Add SLF4J + Logback with JSON output (logstash-logback-encoder).
- Implement a simple REST controller (e.g., /orders/{id}) that:
  - Logs at INFO level when a request arrives, using placeholders.
  - Uses MDC to attach a per-request request_id and user_id, and clears MDC afterward.
  - Includes a DEBUG log in a non-prod environment.

Part 2 — Add basic metrics with Micrometer and Prometheus
- Add actuator and micrometer-prometheus dependencies.
- Expose /actuator/prometheus and implement:
  - A Counter metric http_requests_total with labels endpoint="/orders/{id}" and method="GET".
  - A Timer metric http_request_duration_seconds with the same labels.
- Ensure application.properties routes actuator endpoints to prod-friendly exposure.

Part 3 — Instrument a simple OpenTelemetry trace
- Add OpenTelemetry API and SDK dependencies.
- Instrument a method in your controller/service to create a Span named "OrderService.placeOrder" with an attribute, and end the span properly.
- Optionally configure an OTLP exporter to a local collector (Jaeger/Tempo) and run the exporter.

Part 4 — Health checks and readiness
- Implement a custom HealthIndicator that checks a key dependency (e.g., a mock DB or cache) and respond accordingly.
- Expose the health endpoint via /actuator/health and verify readiness.

Part 5 — Alerting concept (not required to deploy)
- Write a basic Prometheus alert rule that triggers when the error rate exceeds a threshold for a window of time.
- Provide a sample Alertmanager route that sends alerts to Slack or Email and mention how you would test it in a staging environment.

Deliverables
- A small Spring Boot project with:
  - Logging (plain and structured) demonstrations.
  - Micrometer metrics exposed through Prometheus.
  - OpenTelemetry tracing (manual instrumentation).
  - Health indicator for readiness.
  - Example alert rules (Prometheus + Alertmanager snippets) for a production-like scenario.

Notes
- For real-world usage, tailor log levels and logs content to your domain (security, auditing, debugging needs).
- Ensure sensitive data is redacted; implement strict access controls on log storage.
- In Kubernetes, couple these observability components with proper resource requests/limits, and consider rolling upgrades with metrics and health checks to avoid cascading failures.