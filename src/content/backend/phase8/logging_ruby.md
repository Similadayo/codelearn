# Logging, Monitoring & Alerting in Ruby — Phase 8: Infrastructure & Deployment

In modern backends, logging, monitoring, and alerting are the lifeblood of reliability. They give you visibility into how systems behave under load, how components interact, and when something goes wrong. With Ruby, you can build structured, context-rich logs, instrument traces and metrics, and set up automated alerts that help your team respond quickly to incidents. This lesson walks you through practical implementations, real-world production considerations, and hands-on exercises to solidify your understanding.

## 1. Logging in Ruby: Structured Logs, Context, and Correlation

A robust logging strategy in Ruby starts with structured, machine-readable logs (prefer JSON), consistent log levels, and context such as request IDs, user IDs, and trace information. This makes it easier to search, filter, and correlate events across services.

```ruby
require 'logger'
require 'json'
require 'securerandom'

# JSON-formatted log lines with contextual data
class JsonFormatter < Logger::Formatter
  def call(severity, time, _progname, msg)
    payload = {
      timestamp: time.iso8601,
      level: severity,
      pid: Process.pid,
      thread: Thread.current.object_id,
      request_id: Thread.current[:request_id],
      message: msg.is_a?(String) ? msg : msg.inspect
    }
    payload.to_json + "\n"
  end
end

module AppLogger
  def self.logger
    @logger ||= begin
      logger = Logger.new(STDOUT)
      logger.formatter = JsonFormatter.new
      logger.level = Logger::INFO
      logger
    end
  end

  def self.log(severity, message)
    logger.send(severity.downcase, message)
  end
end

# Simple Rack middleware to assign a per-request ID
class RequestIdMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    Thread.current[:request_id] = env['HTTP_X_REQUEST_ID'] || SecureRandom.uuid
    status, headers, body = @app.call(env)
    headers['X-Request-Id'] = Thread.current[:request_id]
    [status, headers, body]
  ensure
    Thread.current[:request_id] = nil
  end
end

# Example usage in a Rack-compatible app
# app = ->(env) { [200, {'Content-Type' => 'text/plain'}, ['OK']] }
# use RequestIdMiddleware
# AppLogger.log(:info, "Service started")
```

### Line-by-line explanation
- require 'logger', 'json', 'securerandom': Load core logging, JSON formatting, and UUID generation utilities.
- JsonFormatter#call: Build a structured log line as a JSON object, including a timestamp, log level, process and thread IDs, request_id (context), and the log message.
- AppLogger.logger: Initialize a singleton Logger instance with the JSON formatter and INFO as the default level.
- AppLogger.log: Convenience wrapper to log at a given severity.
- RequestIdMiddleware#call: Generate or pass through a per-request ID, store it in a thread-local variable, and ensure the header is set for responses.
- Middleware usage comments: Demonstrate how to wire the middleware into a Rack-based app and emit a log line with correlation context.

## 2. Tracing & Instrumentation: OpenTelemetry in Ruby

Tracing provides end-to-end visibility across services. OpenTelemetry (OTel) lets you create spans for requests, propagate trace context, and export traces to backends like Jaeger, Tempo, or OpenTelemetry Collector. In Ruby, you can instrument Rack apps (and outgoing HTTP calls) to capture latency and bottlenecks.

```ruby
require 'opentelemetry/sdk'
require 'opentelemetry/instrumentation/rack'
require 'opentelemetry/instrumentation/net_http'

OpenTelemetry::SDK.configure do |config|
  # Instrument Rack-based apps to automatically trace incoming requests
  config.use OpenTelemetry::Instrumentation::Rack
  # Instrument Net::HTTP for outgoing requests
  config.use OpenTelemetry::Instrumentation::Net::HTTP

  # Example: set service metadata
  config.service_name = 'rb-backend'
  # In production, configure an OTLP exporter (e.g., to a collector)
  # config.exporter = OpenTelemetry::Exporter::OTLPHttp.new(endpoint: 'http://localhost:4318/v1/traces')
end

# Manual span usage (alternative to automatic Rack instrumentation)
tracer = OpenTelemetry.tracer_provider.tracer('rb-backend', '0.1.0')
tracer.in_span('handle_request') do |span|
  span.set_attribute('http.method', 'GET')
  span.set_attribute('http.path', '/health')
  # ... business logic here ...
  sleep(0.01) # simulate work
end
```

### Line-by-line explanation
- require 'opentelemetry/sdk', 'opentelemetry/instrumentation/rack', 'opentelemetry/instrumentation/net_http': Load the OpenTelemetry SDK and Rack/Net::HTTP instrumentations for automatic tracing.
- OpenTelemetry::SDK.configure: Initialize tracing with desired instrumentations and service metadata.
- config.use Rack & Net::HTTP: Enable automatic tracing for incoming requests and outgoing HTTP calls.
- config.service_name: Identify the service in traces for easier filtering in backends.
- Optional OTLP exporter comment: In real deployments, configure an OTLP exporter to send traces to a collector.
- tracer = OpenTelemetry.tracer_provider.tracer(...): Acquire a tracer for this service.
- tracer.in_span('handle_request') { ... }: Create a span named handle_request, automatically recording duration and attributes; place business logic within the block.

## 3. Metrics & Monitoring: Prometheus in Ruby

Metrics give you a compact, aggregatable view of system behavior (request rates, latency, error counts). Prometheus client for Ruby lets you define counters, histograms, gauges, and expose a /metrics endpoint for scraping.

```ruby
require 'prometheus/client'
require 'prometheus/client/formats/text'
require 'sinatra'

PROM = Prometheus::Client registry
# Define metrics
HTTP_REQUESTS = Prometheus::Client::Counter.new(:http_requests_total, docstring: 'Total HTTP requests')
RESPONSE_TIME = Prometheus::Client::Histogram.new(:http_response_time_seconds,
                                               docstring: 'HTTP response times',
                                               buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5])

PROM.register(HTTP_REQUESTS)
PROM.register(RESPONSE_TIME)

# Example request handling (Sinatra route)
before do
  @start = Time.now
end

get '/example' do
  # Simulate work
  sleep(rand(0.01..0.3))
  HTTP_REQUESTS.increment
  HTTP_TIME = Time.now - @start
  RESPONSE_TIME.observe(HTTP_TIME, labels: { endpoint: '/example' })
  "OK"
end

get '/metrics' do
  content_type Prometheus::Client::Formats::Text::CONTENT_TYPE
  Prometheus::Client::Formats::Text.marshal(PROM)
end
```

### Line-by-line explanation
- require 'prometheus/client' and 'prometheus/client/formats/text': Load the Prometheus client library and text formatter for exporting metrics.
- require 'sinatra': Lightweight web framework used to expose a metrics endpoint easily.
- PROM = Prometheus::Client registry: Create a default registry to hold metrics.
- Define HTTP_REQUESTS and RESPONSE_TIME: Set up a counter for total requests and a histogram for request durations with sensible buckets.
- PROM.register(...): Register metrics so Prometheus can discover them.
- before block: Capture start time for request latency measurement.
- get '/example': Simulate work, increment the request counter, observe latency with a label for endpoint.
- get '/metrics': Expose metrics in the Prometheus text format for scraping by a Prometheus server.

## 4. Alerting: Slack Webhook Integration & Threshold-Based Alerts

Alerts help you respond quickly when things go wrong. A simple, robust pattern is to push alerts to a channel via a Slack webhook when a monitored condition crosses a threshold (e.g., high error rate). This example shows a small alerting utility and a rate monitor that triggers when the last minute has too many errors.

```ruby
require 'net/http'
require 'uri'
require 'json'

class SlackNotifier
  def initialize(webhook_url)
    @webhook_url = webhook_url
  end

  def notify(message, severity: 'CRITICAL')
    payload = { text: "[#{severity}] #{message}" }.to_json
    uri = URI(@webhook_url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    req = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
    req.body = payload
    http.request(req)
  end
end

class ErrorRateAlert
  def initialize(threshold:, notifier:)
    @threshold = threshold
    @notifier = notifier
    @timestamps = []
  end

  def record_error!
    @timestamps << Time.now
    prune!
    if @timestamps.size >= @threshold
      @notifier.notify("High error rate: #{@timestamps.size} errors in last minute")
    end
  end

  private

  def prune!
    cutoff = Time.now - 60
    @timestamps.delete_if { |t| t < cutoff }
  end
end

# Example usage (fill in with real wiring in your app)
# webhook = ENV['SLACK_WEBHOOK_URL']
# notifier = SlackNotifier.new(webhook)
# monitor = ErrorRateAlert.new(threshold: 5, notifier: notifier)

# begin
#   # application logic...
# rescue => e
#   monitor.record_error!
# end
```

### Line-by-line explanation
- SlackNotifier#initialize: Store the Slack webhook URL for sending alerts.
- SlackNotifier#notify: Build a simple JSON payload and POST it to Slack via HTTP, optionally tagging severity.
- ErrorRateAlert#initialize: Configure an error-rate monitor with a threshold and a notifier to trigger alerts.
- ErrorRateAlert#record_error!: Record a new error timestamp, prune old timestamps beyond 60 seconds, and trigger a notification if the count exceeds the threshold.
- prune!: Remove timestamps older than 60 seconds to maintain a sliding window for the last minute.
- Example usage: Show how you would wire the notifier and monitor in a real app, and how to call record_error! on error paths.

## X. Common Beginner Mistakes

- Bad: Logging with puts and ad-hoc strings instead of a structured logger.
  - Bad
    ```ruby
    # bad
    puts "INFO: user_id=1234 action=login"
    ```
  - Good
    ```ruby
    require 'logger'
    LOG = Logger.new(STDOUT)
    LOG.info("user_login", user_id: 1234)
    ```
- Bad: Missing correlation context (e.g., no request_id) leading to hard-to-follow logs.
  - Bad
    ```ruby
    LOG.info("Processing /payments")
    ```
  - Good
    ```ruby
    # ensure RequestIdMiddleware sets Thread.current[:request_id]
    LOG.info("Processing /payments", request_id: Thread.current[:request_id])
    ```
- Bad: Logging sensitive data (passwords, tokens, PII).
  - Bad
    ```ruby
    LOG.info("User login", password: user.password)
    ```
  - Good
    ```ruby
    LOG.info("User login", user_id: user.id)
    ```
- Bad: No log rotation or centralized aggregation; logs grow without bound.
  - Bad approach: writing to a single unrotated file forever.
  - Good approach: use a rotating log, or forward to a centralized system (e.g., ELK/OpenSearch, Splunk) and/or container logs.
- Bad: Not instrumenting metrics across components; only logging symptoms.
  - Bad: instrumenting only one service; good: expose consistent metrics across services (requests, latency, error rates) and ship them to Prometheus or a central system.
- Bad: Relying on a single alert channel or one-off notifications without rate-limiting.
  - Good: implement thresholds, deduplicate alerts, and use multiple channels (Slack, PagerDuty) with suppression windows.

## Y. Why This Matters In Real Systems

- Operability: Logs, metrics, and traces enable fast diagnosis of outages and performance regressions.
- Observability at scale: Distributed systems require correlating events across services. Request IDs and trace contexts let you stitch end-to-end flows.
- Incident response: Proactive alerts reduce MTTR (mean time to repair). Clear alerting reduces alert fatigue if thresholds are well-tuned.
- Compliance and auditing: Structured logs with user/action context help with governance and debugging post-incident.
- Performance and capacity planning: Latency histograms and request-rate metrics guide autoscaling and resource allocation.
- Security: Reducing exposure of sensitive data in logs; using secure channels for log streaming and metrics.

## Z. Study Questions

1) What is the purpose of a request_id in logs, and how can you propagate it across services?  
2) How do you expose Prometheus metrics from a Ruby app, and what are common metrics to collect for a web service?  
3) What is an OpenTelemetry span, and how does it help diagnose latency issues in a distributed system?  
4) How would you implement threshold-based alerting via a Slack webhook? What are key considerations for alert fatigue?  
5) List three common mistakes developers make with logging in production and how to avoid them.

## Exercise

Goal: Build a minimal Ruby backend that demonstrates end-to-end logging, tracing, metrics, and alerting. You’ll create a small Rack-based app (using Sinatra for simplicity) that:

- Assigns a per-request ID via middleware
- Logs structured JSON with request_id, method, path, and status
- Exposes Prometheus metrics for request count and latency
- Instruments requests with OpenTelemetry tracing
- Sends a Slack alert when the last minute contains too many errors

Parts

1) Project scaffold
- Create a Gemfile with: sinatra, json, prometheus-client, prometheus-client-formats, opentelemetry-sdk, opentelemetry-instrumentation-rack, opentelemetry-instrumentation-net-http
- Install gems

2) Implement request-id middleware and JSON logging
- Implement a RequestIdMiddleware (as shown in Section 1)
- Implement a JSON logger (as shown in Section 1) and attach it to your Sinatra app
- Ensure logs include request_id and basic request details

3) Instrument tracing with OpenTelemetry
- Configure OpenTelemetry to instrument Rack and Net::HTTP
- Add a manual span around a simulated business operation in a route

4) Expose Prometheus metrics
- Define http_requests_total counter and http_response_time_seconds histogram
- Expose /metrics endpoint to serve metrics in Prometheus text format
- Increment and observe metrics in a sample route

5) Add Slack alerting for high error rate
- Implement SlackNotifier and ErrorRateAlert (as shown in Section 4)
- In the error path of a route, record the error and let the alerting logic trigger
- Ensure the Slack webhook URL is configurable via environment variables

Starter code (assemble these components into a single app)

Gemfile
```ruby
source 'https://rubygems.org'

gem 'sinatra'
gem 'json'
gem 'prometheus-client'
gem 'prometheus-client-formats'
gem 'opentelemetry-sdk'
gem 'opentelemetry-instrumentation-rack'
gem 'opentelemetry-instrumentation-net_http'
```

lib/request_id_middleware.rb
```ruby
require 'securerandom'

class RequestIdMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    Thread.current[:request_id] = env['HTTP_X_REQUEST_ID'] || SecureRandom.uuid
    status, headers, body = @app.call(env)
    headers['X-Request-Id'] = Thread.current[:request_id]
    [status, headers, body]
  ensure
    Thread.current[:request_id] = nil
  end
end
```

app.rb
```ruby
require 'sinatra'
require_relative './lib/request_id_middleware'
require_relative './lib/json_logger' # Implement a light-weight wrapper like in Section 1

use RequestIdMiddleware

before do
  @start_time = Time.now
  env['rack.logger'] ||= Logger.new(STDOUT)
end

get '/health' do
  AppLogger::LOG.info("health_check", path: request.path, request_id: Thread.current[:request_id])
  'OK'
end

get '/hello/:name' do
  # Simulated work
  sleep(rand * 0.2)
  AppLogger::LOG.info("greet", name: params[:name], request_id: Thread.current[:request_id])
  "Hello, #{params[:name]}!"
end

after do
  duration = Time.now - @start_time
  HTTP_REQUESTS.increment
  RESPONSE_TIME.observe(duration, labels: { endpoint: request.path_info })
end

get '/metrics' do
  content_type Prometheus::Client::Formats::Text::CONTENT_TYPE
  Prometheus::Client::Formats::Text.marshal(PROM)
end
```

Instructions for the exercise
- Run the app locally and curl endpoints (e.g., /hello/Alice, /health).
- Observe the JSON logs in stdout with request_id correlation.
- Visit /metrics and verify Prometheus metrics appear.
- Introduce an error path (e.g., /error) and verify the error is logged, an OTLP trace (if configured) is created, and the Slack alert fires when the error rate threshold is exceeded.

What you should learn from this exercise
- How to wire logging, tracing, and metrics together in a Ruby backend.
- How correlation IDs (request_id) enable end-to-end observability.
- How to configure a simple alerting workflow that improves incident response times.

If you’d like, I can tailor the exercise to Rails or a pure Rack app, and I can provide a Dockerized example with an OpenTelemetry Collector and a Slack test webhook.