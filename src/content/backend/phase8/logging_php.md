# Logging, Monitoring & Alerting in PHP — Phase 8: Infrastructure & Deployment

In modern backend systems, logs, metrics, and alerts are the connective tissue that keeps services reliable, observable, and maintainable. This lesson focuses on how PHP applications can produce structured logs, expose meaningful metrics for monitoring, and trigger timely alerts when something goes wrong. You’ll learn practical patterns, concrete PHP code, and deployment considerations to integrate logging, monitoring, and alerting into real-world systems.

## 1. Logging in PHP with Monolog

Logging is the most fundamental observability signal. Using Monolog, you can produce structured, level-based logs, rotate files to prevent uncontrolled growth, and format logs as JSON for easy ingestion by central log systems.

```php
<?php
require __DIR__ . '/vendor/autoload.php';
use Monolog\Logger;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\JsonFormatter;

// Create the logger
$logger = new Logger('app');

// Rotating file handler: file path, maxFiles, level
$logger->pushHandler(new RotatingFileHandler(__DIR__ . '/logs/app.log', 7, Logger::DEBUG));

// Apply a JSON formatter for structured logs
foreach ($logger->getHandlers() as $h) {
    $h->setFormatter(new JsonFormatter());
}

// Log some events with context
$logger->info('Request received', [
  'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
  'path' => $_SERVER['REQUEST_URI'] ?? '/',
  'uid' => $_SERVER['HTTP_X_REQUEST_ID'] ?? null,
]);

try {
  // simulate work
  if (random_int(1, 10) === 1) {
    throw new Exception('Database timeout');
  }
  $logger->info('Data processed', ['items' => 42]);
} catch (Throwable $e) {
  $logger->error('Operation failed', [
     'message' => $e->getMessage(),
     'code' => $e->getCode(),
     'trace' => $e->getTraceAsString(),
  ]);
}
```

### Line-by-line explanation
- Require Composer autoload to load Monolog.
- Import Monolog classes for convenience.
- Create a Logger with the channel name 'app'.
- Add a rotating file handler to store logs in logs/app.log, keeping the last 7 files, with DEBUG as the minimum level.
- Apply a JsonFormatter to all handlers to produce structured JSON logs.
- Log an info message for every incoming request, including the HTTP method, path, and a request ID if present.
- Simulate work; on a rare condition, throw an exception to demonstrate error logging.
- Catch exceptions and log an error with the message, code, and a stack trace for debugging.

## 2. Observability: Metrics with Prometheus in PHP

Metrics provide a quantitative view of your system’s health and throughput. The Prometheus PHP client lets you define counters, gauges, histograms, and expose them via a /metrics endpoint that Prometheus can scrape.

```php
<?php
// Simple Prometheus metrics endpoint for PHP
require __DIR__ . '/vendor/autoload.php';
use Prometheus\CollectorRegistry;
use Prometheus\Storage\InMemory;
use Prometheus\RenderTextFormat;

// Registry for in-memory storage (suitable for simple apps or tests)
$registry = new CollectorRegistry(new InMemory());

// A counter for HTTP requests
$requests = $registry->registerCounter('my_app', 'requests_total', 'Total HTTP requests');
$requests->inc();

// You may count status codes or endpoints as you wish
$status = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
$requests->inc();

// Expose metrics in Prometheus text format
$renderer = new RenderTextFormat();
$result   = $renderer->render($registry->getMetricFamilySamples());

header('Content-Type: text/plain');
echo $result;
```

### Line-by-line explanation
- Require autoload to load Prometheus client classes.
- Create a CollectorRegistry using in-memory storage suitable for demonstration.
- Register a counter metric named my_app_requests_total with a help string.
- Increment the counter to reflect a request.
- Optionally increment again or differentiate by endpoint/method as needed.
- Create a RenderTextFormat instance to render metrics in Prometheus text format.
- Retrieve all metric family samples and render them to a plain text string.
- Output the metrics with the correct Content-Type header so Prometheus can scrape them.

Note: For production, you’ll typically back the registry with a durable storage backend (e.g., Redis, file, or a Prometheus Pushgateway) and wire this endpoint into your web framework or router so that each incoming request increments the appropriate metrics.

## 3. Alerting & Health: Slack Alerts, Health Checks, and Simple Daemons

Alerts turn observability signals into actionable notifications. In a PHP environment, you can wire a Slack webhook for real-time alerts and build a lightweight health check endpoint for readiness and liveliness.

```php
<?php
// Slack notifier helper
class SlackNotifier {
  private $webhook;
  public function __construct(string $webhookUrl) {
     $this->webhook = $webhookUrl;
  }
  public function notify(string $text, array $attachments = []) {
     $payload = ['text' => $text, 'attachments' => $attachments];
     $ch = curl_init($this->webhook);
     curl_setopt($ch, CURLOPT_POST, true);
     curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
     curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
     $response = curl_exec($ch);
     curl_close($ch);
     return $response;
  }
}

// Example usage
$notifier = new SlackNotifier(getenv('SLACK_WEBHOOK_URL') ?: '');
$notifier->notify("ALERT: High error rate detected in app");
```

### Line-by-line explanation
- Define a SlackNotifier class that encapsulates webhook-based notifications.
- Store the webhook URL in the class and provide a notify method to send a JSON payload to Slack.
- In the notify method, construct the payload with a text and optional attachments, and POST it to the Slack webhook using curl.
- Return the Slack response for logging or debugging.
- Instantiate the notifier with a Slack webhook URL (environment variable preferred) and send a test alert.

Alerting daemon (optional) to watch logs and alert on high error rate:

```php
<?php
// Simple alerting loop (CLI daemon)
require __DIR__ . '/vendor/autoload.php';
class SlackNotifier {
  private $webhook;
  public function __construct(string $webhookUrl) { $this->webhook = $webhookUrl; }
  public function notify(string $text, array $attachments = []) {
     $payload = ['text' => $text, 'attachments' => $attachments];
     $ch = curl_init($this->webhook);
     curl_setopt($ch, CURLOPT_POST, true);
     curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
     curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
     $response = curl_exec($ch);
     curl_close($ch);
     return $response;
  }
}

$logFile = __DIR__ . '/logs/app.log';
$webhook = getenv('SLACK_WEBHOOK_URL');
$notifier = new SlackNotifier($webhook);

// Simple threshold-based alert
$threshold       = 5;      // number of errors
$windowSeconds   = 60;     // time window
$lastChecked     = time();

while (true) {
  if (!file_exists($logFile)) { sleep(5); continue; }

  $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  $now = time();
  $count = 0;

  foreach ($lines as $line) {
    if (stripos($line, '"level":"error"') !== false) {
      // naive timestamp parse: expect an ISO-like timestamp at line start
      if (preg_match('/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*)/', $line, $m)) {
        $ts = @strtotime($m[1]);
        if ($ts !== false && ($now - $ts) <= $windowSeconds) {
          $count++;
        }
      } else {
        $count++;
      }
    }
  }

  if ($count >= $threshold) {
    $notifier->notify("ALERT: $count errors in last $windowSeconds seconds");
  }

  sleep(15);
}
```

### Line-by-line explanation
- Load dependencies via Composer autoload.
- Reuse the SlackNotifier class to send alerts.
- Define the log file path and Slack webhook, and create the notifier instance.
- Set alerting policy: a threshold of errors within a time window triggers an alert.
- Enter an infinite loop to periodically scan the log file for error lines.
- Read the log file lines, count lines containing an error indicator within the time window.
- If the count meets or exceeds the threshold, send an alert with the Slack notifier.
- Sleep for a short interval to avoid busy-waiting, then repeat.

Health endpoints (example in a simple PHP script):

```php
<?php
// health.php
http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
  'status' => 'ok',
  'timestamp' => date('c')
]);
```

Line-by-line explanation
- This script returns a 200 OK with a small JSON payload indicating liveness.
- You can extend this to perform real checks (DB connectivity, cache availability, external service health) and update the status accordingly.

## 4. Deployment Foundations: Logging, Metrics, and Alerts in Real Systems

- Centralized logging: Push logs from app servers to a log aggregator (Elastic Stack, Loki, or a cloud logging service) using a consistent JSON format and structured fields (timestamp, service, level, message, context).
- Centralized metrics: Run the Prometheus server to pull metrics from each service’s /metrics endpoint; use a Grafana dashboard to visualize latency, error rate, request rate, and saturation.
- Alerting pipelines: Use Alertmanager (with Prometheus) to deduplicate, group, and route alerts to Slack, PagerDuty, email, or SMS. Define SLOs and error budgets to shape alerting behavior.
- Security and hygiene: Do not log secrets or credentials. Use environment-scoped redaction. Rotate credentials and ensure log retention policies align with compliance requirements.
- Performance and resilience: Keep log I/O bounded; use asynchronous logging where possible; consider log sampling to reduce overhead in high-traffic services.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Logging sensitive data
  - Bad:
    ```php
    <?php
    $pwd = $_POST['password'];
    $logger->info('Login attempt', ['password' => $pwd]);
    ```
  - Good:
    ```php
    <?php
    $pwd = $_POST['password'] ?? '';
    $masked = str_repeat('*', min(strlen($pwd), 8));
    $logger->info('Login attempt', ['password' => $masked]);
    ```
  - Why it matters: Protects users and compliance; avoid leaking credentials into logs that could be accessed by attackers or misused by operators.

- Pitfall 2: Ignoring log levels and over-logging
  - Bad:
    ```php
    <?php
    // In production, log every SQL query at INFO
    $logger->info('SQL Query', ['sql' => $sql]);
    ```
  - Good:
    ```php
    <?php
    // Log SQL only at DEBUG for development, WARN/ERROR for failures
    if ($isDebug) {
      $logger->debug('SQL Query', ['sql' => $maskedSql]);
    }
    ```
  - Why it matters: Reduces log volume, improves signal-to-noise, and prevents performance degradation in prod.

- Pitfall 3: No log context or correlation IDs
  - Bad:
    ```php
    $logger->info('Processing request');
    ```
  - Good:
    ```php
    $logger->info('Processing request', [
      'request_id' => $_SERVER['HTTP_X_REQUEST_ID'] ?? (string) uniqid(),
      'user_id' => $_SESSION['user_id'] ?? null,
      'endpoint' => $_SERVER['REQUEST_URI'] ?? '/',
    ]);
    ```
  - Why it matters: Allows tracing across distributed systems, correlating logs from multiple services around a single user action or request.

- Pitfall 4: Missing log rotation and retention setup
  - Bad:
    ```php
    // Logs grow without bounds
    $logger->pushHandler(new StreamHandler('/var/log/app.log', Logger::DEBUG));
    ```
  - Good:
    ```php
    $logger->pushHandler(new RotatingFileHandler(__DIR__ . '/logs/app.log', 7, Logger::DEBUG));
    ```
  - Why it matters: Prevents disk exhaustion and keeps log storage manageable.

- Optional Pitfall: Not exporting metrics or using non-deterministic naming
  - Bad:
    ```php
    // Metrics endpoint lacks standard naming or labels
    echo "metrics";
    ```
  - Good:
    ```php
    // Standard Prometheus metrics with labels
    // See Section 2 for a concrete example
    ```
  - Why it matters: Keeps metrics usable by standard dashboards and alerting rules.

## Y. Why This Matters In Real Systems — production context and real usage

- Observability is a pillar of reliability: logs, metrics, and alerts enable rapid incident detection, root-cause analysis, and faster MTTR.
- Structured, centralized logging makes it possible to search across services, correlate events, and detect anomalies (e.g., sudden spikes in error percentage).
- Metrics provide objective SLIs (e.g., request rate, error rate, latency) and help enforce SLOs and error budgets.
- Alerts translate anomalies into on-call workflows, reducing blast radius and ensuring that critical issues are escalated promptly.
- In production, you should integrate:
  - Centralized log ingestion (ELK, Loki, or cloud logging)
  - Prometheus-based metrics collection with dashboards in Grafana
  - Alerting pipelines with Alertmanager routing to channels
  - Security-conscious logging practices and rotation/retention policies

## Z. Study Questions — 5 recall questions

1. What is the benefit of using a RotatingFileHandler in Monolog, and how does it help production logs?
2. How can you expose PHP application metrics in a Prometheus-compatible format?
3. Why should you include a request_id or correlation_id in your logs, and how does it help in multi-service debugging?
4. What considerations should you make when implementing alerting channels (e.g., Slack) for production systems?
5. List three common mistakes to avoid when implementing logging and monitoring in PHP apps.

## Exercise — practical multi-part coding challenge

1) Setup and logging
- Create a small PHP project (Composer-based).
- Install Monolog and Prometheus client libraries.
- Implement a PHP script that:
  - Initializes a Monolog Logger with a RotatingFileHandler and JSON formatting.
  - Logs an incoming request with a structured context (method, path, request_id).
  - Simulates an occasional error and logs an error with a stack trace.

2) Metrics endpoint
- Implement a /metrics endpoint using the Prometheus PHP client:
  - Create a request counter and increment on each invocation.
  - Expose metrics in Prometheus text format.

3) Health endpoints
- Add two light endpoints:
  - /healthz: always return 200 with a JSON body indicating status and timestamp.
  - /ready: perform a simple check (e.g., file existence or a lightweight “DB available” flag) and return 200 or 503 accordingly.

4) Alerting integration
- Create a SlackNotifier helper that sends messages to a Slack webhook URL (use an environment variable).
- Write a simple CLI daemon (or a cron job logic) that scans the log file for recent errors (e.g., last 60 seconds) and triggers an alert if a threshold is exceeded.
- Ensure the alert message includes a concise summary and a link or hint for on-call responders.

5) Deployment notes
- Document how you would deploy this in a containerized environment (e.g., PHP-FPM with Nginx, or a CLI-based microservice).
- Include considerations for:
  - Log storage and rotation (bind mounts vs. persistent volumes).
  - Metrics scraping and path exposure.
  - Secure handling of Slack webhook URLs and other secrets.

Deliverables
- A minimal repository layout with the following files:
  - composer.json with required packages (monolog/monolog, promphp/prometheus_client_php, and any others you add)
  - src/logging.php (Monolog setup example)
  - public/metrics.php (Prometheus metrics endpoint)
  - health.php (health endpoint)
  - SlackNotifier.php (Slack webhook helper)
  - alert_daemon.php (simple alerting daemon)
  - README.md with instructions for running locally and for containerized deployment

This completes a thorough, production-oriented approach to Logging, Monitoring & Alerting in PHP, with concrete code, deployment considerations, and practical exercises.