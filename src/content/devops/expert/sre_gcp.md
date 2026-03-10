# SRE Principles & Golden Signals in Google Cloud

SRE (Site Reliability Engineering) is a discipline focused on building resilient systems through engineering rigor. This lesson centers on SRE principles, the golden signals that guide reliability work, and how to implement them in Google Cloud. You’ll learn to define SLOs, measure latency/throughput/error rates, instrument services, set up alerting, and apply practical patterns for real-world reliability. By the end, you’ll be able to operate with an error-budget mindset, quantify service health, and respond to incidents with automated and manual strategies in a Google Cloud environment.

## 1. SRE Foundations: SLOs, Error Budgets, and Principles

SRE centers around measurable objectives (SLOs), a concept of error budgets that balance velocity with reliability, and a culture of using data to guide incidents and improvements. In Google Cloud, you’ll typically define SLOs against service metrics, instrument services to emit Service Level Indicators (SLIs), and implement alerting that respects privacy, scope, and operational practicality.

Code: A small Python utility to compute SLI attainment, SLO attainment, and an error budget from raw success/failure samples.

```python
from typing import List

def sli_attainment(samples: List[bool]) -> float:
    """
    samples: True indicates a successful request, False indicates a failure.
    Return the observed success rate (0.0 - 1.0).
    """
    if not samples:
        return 0.0
    successes = sum(1 for s in samples if s)
    return successes / len(samples)

def slo_attainment(samples: List[bool], target: float) -> float:
    """
    target: desired SLIs (e.g., 0.99 for 99% success)
    Attainment is observed_actual / target, capped at 1.0.
    """
    actual = sli_attainment(samples)
    if target <= 0:
        return 0.0
    return min(1.0, actual / target)

def error_budget(slo_value: float) -> float:
    """
    Error budget is the remaining budget given the achieved SLO.
    If SLO is 0.99 and achieved is 0.97, budget = 0.03.
    """
    return max(0.0, 1.0 - slo_value)

# Example usage
samples = [True, True, False, True, True, True, False, True, True, True]  # 8/10 success
target = 0.99  # 99% SLO
attainment = slo_attainment(samples, target)
eb = error_budget(attainment)
print(f"SLO attainment: {attainment:.3f}, Error budget: {eb:.3f}")
```

### Line-by-line explanation
- Line 1: Import typing.List for explicit typing of sample lists.
- Lines 3-12: Define sli_attainment to compute the observed success rate as the ratio of True (success) samples to total samples.
- Lines 14-22: Define slo_attainment to compute how close the observed success rate is to the target SLO, capping at 1.0.
- Lines 24-31: Define error_budget to return the portion of the budget remaining after attainment (1.0 - attainment).
- Lines 34-39: Demonstrate usage with a sample list of successes and a target SLO; print the results.

Notes for real systems:
- In production, you would compute SLIs over a moving window (e.g., 14 days) and decide alert thresholds using policy.
- SLOs should be defined per service, per endpoint, and per critical path to isolate reliability concerns.

## 2. Golden Signals in Google Cloud: Latency, Traffic, Errors, Saturation

Golden signals are the primary metrics you monitor to assess health. In Google Cloud, you typically instrument services (or apps) to emit SLIs (latency, request rate/throughput, error rate, saturation). The following code blocks demonstrate how to fetch and summarize these signals from Google Cloud Monitoring (Cloud Monitoring) using the Python client. The examples assume you’ve published metrics under custom.googleapis.com/sre/* so you can query them directly.

### 2.1 Latency (P95) — custom latency metric

```python
from google.cloud import monitoring_v3
from datetime import datetime, timedelta
from google.protobuf.timestamp_pb2 import Timestamp

project_id = "your-project-id"
metric_type = 'custom.googleapis.com/sre/latency_p95'  # in seconds
resource_type = 'global'

client = monitoring_v3.MetricServiceClient()
name = f"projects/{project_id}"

def to_timestamp(dt):
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts

end = datetime.utcnow()
start = end - timedelta(minutes=30)

interval = monitoring_v3.TimeInterval(
    start_time=to_timestamp(start),
    end_time=to_timestamp(end)
)

results = client.list_time_series(
    request={
        "name": name,
        "filter": f'metric.type = "{metric_type}" AND resource.type = "{resource_type}"',
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.View.FULL
    }
)

values = []
for ts in results:
    for point in ts.points:
        # point.value has one of several value types; assume double_value for simplicity
        if point.value.HasField("double_value"):
            values.append(point.value.double_value)

avg_p95 = sum(values) / len(values) if values else 0.0
print(f"Approximate P95 latency (s) over last 30m: {avg_p95:.3f}")
```

### Line-by-line explanation
- Line 1: Import the Cloud Monitoring client library.
- Lines 2-5: Import date utilities for a 30-minute window.
- Lines 7-9: Define the target metric type and resource type to query.
- Lines 11-13: Instantiate the client and set the project name.
- Lines 15-22: Helper to convert Python datetimes to protobuf timestamps.
- Lines 24-29: Define the time interval for the query (last 30 minutes).
- Lines 31-39: Build and execute a time-series query for the latency metric.
- Lines 41-46: Extract numeric values from the time-series points (assuming double_value).
- Line 48: Compute the average latency across the window.
- Line 49: Print the result.

Notes for real systems:
- If you instrument with OpenTelemetry, consider exporting to Google Cloud Monitoring using OTLP and then querying the emitted custom metrics via the same approach.
- Use windowed aggregations (e.g., align and aggregate) for stable SLIs rather than single-point spikes.

### 2.2 Traffic (Throughput) — requests per second

```python
from google.cloud import monitoring_v3
from datetime import datetime, timedelta
from google.protobuf.timestamp_pb2 import Timestamp

project_id = "your-project-id"
metric_type = 'custom.googleapis.com/sre/requests_per_second'  # RPS
resource_type = 'global'

client = monitoring_v3.MetricServiceClient()
name = f"projects/{project_id}"

def to_timestamp(dt):
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts

end = datetime.utcnow()
start = end - timedelta(minutes=15)

interval = monitoring_v3.TimeInterval(
    start_time=to_timestamp(start),
    end_time=to_timestamp(end)
)

results = client.list_time_series(
    request={
        "name": name,
        "filter": f'metric.type = "{metric_type}" AND resource.type = "{resource_type}"',
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.View.FULL
    }
)

rps_values = []
for ts in results:
    for point in ts.points:
        if point.value.HasField("double_value"):
            rps_values.append(point.value.double_value)

avg_rps = sum(rps_values) / len(rps_values) if rps_values else 0.0
print(f"Average throughput (RPS) over last 15m: {avg_rps:.2f}")
```

### Line-by-line explanation
- Similar structure to latency: initializes client, defines time window, queries the metric, iterates time-series points, extracts values, and averages them to produce an RPS estimate.

Notes:
- If you collect throughput in terms of requests per minute, convert accordingly to RPS as needed.

### 2.3 Errors (Error rate) — per-request success indicator

```python
from google.cloud import monitoring_v3
from datetime import datetime, timedelta
from google.protobuf.timestamp_pb2 import Timestamp

project_id = "your-project-id"
metric_type = 'custom.googleapis.com/sre/error_rate'  # 0.0 - 1.0 (fraction of errors)
resource_type = 'global'

client = monitoring_v3.MetricServiceClient()
name = f"projects/{project_id}"

def to_timestamp(dt):
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts

end = datetime.utcnow()
start = end - timedelta(minutes=20)

interval = monitoring_v3.TimeInterval(
    start_time=to_timestamp(start),
    end_time=to_timestamp(end)
)

results = client.list_time_series(
    request={
        "name": name,
        "filter": f'metric.type = "{metric_type}" AND resource.type = "{resource_type}"',
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.View.FULL
    }
)

errs = []
for ts in results:
    for point in ts.points:
        if point.value.HasField("double_value"):
            errs.append(point.value.double_value)

avg_error_rate = sum(errs) / len(errs) if errs else 0.0
print(f"Average error rate over last 20m: {avg_error_rate:.4f}")
```

### Line-by-line explanation
- Again, the script mirrors latency and throughput: connects to Cloud Monitoring, queries the error-rate metric, collects values, and computes an average error rate.

Notes:
- Error rate SLI can be computed as (errors / total requests). If you publish error_rate directly as a ratio, ensure consistency across your instrumentation.

### 2.4 Saturation (Resource utilization) — CPU/memory/pod saturation

```python
from google.cloud import monitoring_v3
from datetime import datetime, timedelta
from google.protobuf.timestamp_pb2 import Timestamp

project_id = "your-project-id"
# Example saturation metric could be CPU utilization published as custom metric
metric_type = 'custom.googleapis.com/sre/cpu_utilization'  # 0.0 - 1.0
resource_type = 'gce_instance'  # example resource type

client = monitoring_v3.MetricServiceClient()
name = f"projects/{project_id}"

def to_timestamp(dt):
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts

end = datetime.utcnow()
start = end - timedelta(minutes=30)

interval = monitoring_v3.TimeInterval(
    start_time=to_timestamp(start),
    end_time=to_timestamp(end)
)

results = client.list_time_series(
    request={
        "name": name,
        "filter": f'metric.type = "{metric_type}" AND resource.type = "{resource_type}"',
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.View.FULL
    }
)

cpu_values = []
for ts in results:
    for point in ts.points:
        if point.value.HasField("double_value"):
            cpu_values.append(point.value.double_value)
avg_cpu = sum(cpu_values) / len(cpu_values) if cpu_values else 0.0
print(f"Average CPU saturation over last 30m: {avg_cpu:.3f}")
```

### Line-by-line explanation
- This example queries a hypothetical saturation metric (e.g., CPU utilization) and computes the average over the time window.
- If you use containerized workloads, you may query container metrics via Cloud Monitoring (e.g., container.googleapis.com/container/cpu/utilization) or your own custom metrics.

Notes:
- Saturation measures resource headroom and capacity limits. Use stable selects (e.g., percentile-based or time-averaged baselines) to avoid alert storms.

## 3. Instrumentation & Alerting in Google Cloud

Now that you know the golden signals, you’ll instrument apps to emit them (or collect them via OpenTelemetry) and define alerting policies in Cloud Monitoring. The examples show how to instrument with OpenTelemetry and how to declare an alert policy to react to a latency SLI breach.

### 3.1 OpenTelemetry instrumentation (Python) for custom SIGs

```python
# This is a simplified OpenTelemetry example illustrating custom metrics emission.
# In practice, you would export to Google Cloud Monitoring via OTLP to be visible as custom metrics.

from time import sleep
import random
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider

# Create a meter and two instruments: a histogram for latency and a counter for errors
provider = MeterProvider()
metrics.set_meter_provider(provider)
meter = metrics.get_meter("demo-service", "0.1.0")

latency_hist = meter.create_histogram(
    "custom.googleapis.com/sre/latency_p95",
    unit="s",
    description="Observed request latency P95"
)

errors_counter = meter.create_counter(
    "custom.googleapis.com/sre/errors",
    description="Total error count"
)

def handle_request():
    start = time.time()
    try:
        # Simulated work
        sleep(random.uniform(0.05, 0.25))
        if random.random() < 0.05:
            raise ValueError("simulated error")
    except Exception:
        errors_counter.add(1, {"route": "/example"})
    finally:
        latency = time.time() - start
        latency_hist.record(latency, {"route": "/example"})

# Example loop simulating incoming requests
while True:
    handle_request()
    sleep(0.1)
```

### Line-by-line explanation
- Line 1-3: Import time and randomness utilities for a simple loop; import OpenTelemetry API.
- Line 5-9: Create a MeterProvider and a Meter for a service, then create two instruments:
  - latency_hist: a histogram to collect latency measurements, mapped to a custom metric name.
  - errors_counter: a counter to track error occurrences.
- Lines 11-28: Define a request handler that:
  - Records start time, simulates work with a sleep, occasionally raises an error.
  - On error, increments the error counter with a route attribute for dimensionality.
  - After work, computes latency and records it in the histogram with a route label.
- Lines 30-32: A loop to simulate continuous traffic and measurement.

Notes:
- In production, export your OpenTelemetry metrics to Google Cloud Monitoring via OTLP/gRPC to populate Cloud Monitoring dashboards with these custom metrics.

### 3.2 Alert policy example (YAML) for latency SLI breach

policy.yaml
```yaml
name: projects/PROJECT_ID/alertPolicies/ALERT_POLICY_LATENCY_P95
display_name: "SRE: Latency P95 > 0.5s (30m window)"
documentation:
  content: |
    Triggers when P95 latency breaches threshold for 30 minutes.
conditions:
- display_name: "Latency P95 breach threshold"
  condition_threshold:
    filter: 'metric.type = "custom.googleapis.com/sre/latency_p95" AND resource.type = "global"'
    aggregations:
    - alignment_period: "300s"      # 5-minute alignment window
      per_series_aligner: "ALIGN_PERCENTILE_95"
    - alignment_period: "1500s"     # 25-minute window for trending
      per_series_aligner: "ALIGN_PERCENTILE_95"
    comparison: "COMPARISON_GT"
    threshold_value: 0.5
    duration: "1800s"  # 30 minutes
trigger:
  type: "metricThreshold"
```

### Line-by-line explanation
- Line 1: YAML policy file header for an alert policy.
- Lines 2-4: Basic metadata: display name and documentation for operators.
- Lines 5-14: Define a single condition that triggers when the P95 latency exceeds 0.5 seconds.
  - filter selects the custom latency metric and global resource scope.
  - aggregations configure how to condense multiple samples:
    - ALIGN_PERCENTILE_95 with a 5-minute alignment period to compute the 95th percentile over each 5-minute window.
    - A second aggregation with a longer window (25 minutes) to observe trend in percentile.
  - duration defines how long the condition must be true before alerting (30 minutes here).
  - comparison and threshold_value define the breach condition.
- Lines 15-17: Notification and triggering behavior (this snippet assumes you’ll wire to a notification channel externally).

Notes:
- In Google Cloud, you typically connect alert policies to notification channels (email, SMS, Slack, PagerDuty, Pub/Sub) depending on your incident workflow. The YAML above shows how to declare the condition; you’ll need to apply it with gcloud or the Cloud Monitoring API.

## X. Common Beginner Mistakes

Here are real-world pitfalls with bad vs good examples. Each pair demonstrates a small, correctable pattern.

### 1) Pitfall: Alerting on transient spikes instead of stable signals

- Bad
```python
# Alert on a single data point crossing threshold (no window)
latency_ms = get_latest_latency()
if latency_ms > 500:
    raise_alert("Latency spike")
```

- Good
```python
# Alert on a sustained condition over a time window
latencies = get_latency_series(last_5_minutes=True)
p95 = percentile(latencies, 95)
if p95 > 500:
    raise_alert("P95 latency exceeded threshold over 5m window")
```

### 2) Pitfall: No resource scoping or labeling in metrics

- Bad
```python
# Emit a global metric with no dimensions
emit_metric("custom.googleapis.com/sre/error_rate", value=0.02)
```

- Good
```python
# Emit a metric with service and route labels for segmentation
emit_metric("custom.googleapis.com/sre/error_rate", value=0.02, labels={"service": "orders", "route": "/checkout"})
```

### 3) Pitfall: Blindly alerting for all services with one policy

- Bad
```yaml
# Single global alert policy for all services
filter: metric.type == "custom.googleapis.com/sre/latency_p95"
```

- Good
```yaml
# Per-service alert policy, with labels to differentiate
filter: metric.type == "custom.googleapis.com/sre/latency_p95" AND resource.labels.service_id == "orders"
```

### 4) Pitfall: No runbook or automation for remediation

- Bad
```text
# Alert arrives; on-call must manually diagnose and fix
```

- Good
```yaml
# Alert triggers Pub/Sub with incident details
notification_channels: ["projects/PROJECT_ID/notificationChannels/CHANNEL_ID"]
```

```python
# Cloud Function (remediation trigger) skeleton
def remediation_on_alert(event, context):
    # Parse incident data
    # Decide remediation step (e.g., scale out, deploy canary)
    # Execute remediation (e.g., call GKE API to scale deployment)
    pass
```

## Y. Why This Matters In Real Systems — production context and real usage

In production, SRE principles are not just theoretical; they guide how teams operate, respond to incidents, and evolve a system with confidence. Key considerations in Google Cloud:

- SLOs and error budgets drive prioritization: budget waste indicates when to push feature work or focus on reliability improvements.
- Golden signals provide a minimal but sufficient health picture: latency, traffic, errors, and saturation help you identify where to invest in capacity or code changes.
- Instrumentation matters: you must expose consistent, labeled metrics across services to enable slicing by service, environment, region, or version.
- Alerting should be actionable: alert policies must avoid noise, be scoped, and route to the right on-call engineers with runbooks and automation for remediation when possible.
- Real-world workflows: you’ll integrate with Pub/Sub, Cloud Functions, and Cloud Run to implement automated runbooks, post incident notifications to Slack/Teams, and scale or recover resources automatically where safe.

Remediation patterns you may adopt:
- Auto-scaling: scale to handle bursts when latency or saturation signals breach thresholds.
- Canary or blue/green deployments: gradually shift traffic to healthier versions when SLI breaches are observed.
- Runbooks and handoffs: ensure runbooks exist for common incidents, and automate common steps (e.g., restarts, cache flushes) where safe.
- Chaos engineering: periodic, controlled experiments to verify resilience and detect alerting gaps.

Remediation example code (Cloud Function): a simple Slack notification and a placeholder for an automated remediation action.

```python
# Cloud Function triggered by Cloud Monitoring -> Pub/Sub alert
import base64
import json
import os
from urllib import request

def alert_to_slack(event, context):
    payload = json.loads(base64.b64decode(event['data']).decode('utf-8'))
    policy = payload.get("incident", {}).get("policyName", "Unknown policy")
    summary = payload.get("incident", {}).get("summary", "")
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL")

    message = {"text": f"SRE Alert: {policy}\n{summary}"}
    data = json.dumps(message).encode("utf-8")
    req = request.Request(webhook_url, data=data, headers={'Content-Type': 'application/json'})
    with request.urlopen(req) as resp:
        resp.read()

    # Placeholder for remediation steps (e.g., scale a deployment)
    # scale_deployment("orders", "orders-service", desired_replicas=5)
```

Notes:
- This demonstrates the end-to-end flow: monitoring alert -> Pub/Sub -> Cloud Function -> notification and remediation.
- In real deployments, you’d implement robust authentication, idempotence, and safety checks around any remediation actions.

## Z. Study Questions

1) What are the four golden signals, and why are they chosen as a minimal health set?  
2) How do SLOs and error budgets influence deployment decisions and incident response?  
3) How would you compute a P95 latency SLI over a rolling 5-minute window in Cloud Monitoring?  
4) Why is metric labeling (dimensions) important when aggregating SLIs across services or endpoints?  
5) Describe a practical remediation pattern that automates a response to a sustained SLI breach in Google Cloud.

## Exercise

Multi-part practical coding challenge to apply SRE principles with Golden Signals in Google Cloud.

Part A — Instrument a small service with custom metrics
- Build a tiny Python FastAPI (or plain Python HTTP) service with two endpoints: /health and /purchase.
- Instrument with OpenTelemetry (or direct custom metric emission) to publish:
  - custom.googleapis.com/sre/latency_p95 (latency in seconds)
  - custom.googleapis.com/sre/requests_per_second (throughput)
  - custom.googleapis.com/sre/error_rate (0.0 - 1.0)
  - Include resource labels like service and endpoint.

Part B — Query metrics from Cloud Monitoring
- Write a Python script (or bash with gcloud) that queries the last 15 minutes of custom metrics for latency, computes P95 latency, and prints a summary.
- Extend this to also fetch average RPS and error rate, then print a small health summary (e.g., “Healthy” if latency_p95 < 0.5s and error_rate < 0.01 and RPS > 10).

Part C — Create an alert policy for latency
- Create a YAML (or gcloud CLI) policy that alerts if P95 latency exceeds 0.5s for 30 minutes for your service.
- Wire the alert to a Slack channel or email notification channel of your choice.

Part D — Simple remediation hook
- Implement a small Cloud Function (or local script) that subscribes to Pub/Sub alert messages and posts a concise alert to Slack.
- Extend the function to perform a safe remediation action (e.g., log a remediation step, or call a Kubernetes API to scale a Deployment by a non-disruptive amount if you’re running in GKE). Include safety checks to avoid rapid flapping.

Deliverables:
- The instrumented service code (with metrics emitted).
- The metric-query script (latency, RPS, error rate).
- The alert policy YAML (or gcloud command) for latency P95 breaches.
- The basic remediation Cloud Function code (or equivalent) and a short runbook describing how to trigger and verify remediation.

This lesson equips you to apply SRE principles and Golden Signals in Google Cloud environments, enabling reliable, observable, and scalable systems.