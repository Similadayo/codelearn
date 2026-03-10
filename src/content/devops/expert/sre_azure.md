# SRE Principles & Golden Signals in Azure

Compelling intro: In the world of DevOps and Cloud Engineering, Site Reliability Engineering (SRE) gives teams a practical framework to keep services reliable at scale. Golden Signals—latency, traffic, errors, and saturation—are the core, actionable metrics you monitor to detect and diagnose outages before they become customer-visible incidents. In Azure, you can instrument apps with Application Insights, collect telemetry via Azure Monitor, and enforce SLOs, alerting, and runbooks that align with real-world reliability goals. This lesson teaches you how to think in terms of SRE and Golden Signals, with Azure-focused code examples, queries, and configurations you can adapt to production systems.

## 1. SRE Fundamentals in Azure: SLOs, Error Budgets, and Golden Signals

- What it covers: Foundations of reliability, how SRE uses SLOs and error budgets, and how Golden Signals guide your monitoring strategy in Azure.
- Why it matters professionally: Clear reliability objectives reduce firefighting, align teams, and improve customer trust in cloud-native deployments.

```yaml
# Example SLO definition (YAML for readability)
service: "order-processing-service"
slo:
  availability_target: 0.999   # 99.9% availability
  latency_p95_ms: 350         # p95 latency target in milliseconds
  window_days: 30
alerting:
  email_on_burn: true
  auto_rollback_on_budget_exceed: false
```

```python
# Simple error budget calculator (pseudo-example)
# Assumes you run every 24h and track availability
SLO = 0.999
period_days = 30
error_budget = (1 - SLO) * (period_days * 24 * 60 * 60)  # seconds of allowed downtime
print("Error budget seconds in period:", error_budget)
```

```json
{
  "service": "inventory-api",
  "slo": {
    "availability": {
      "target": 0.999,
      "windowDays": 30
    },
    "latency": {
      "p95Ms": 400
    }
  }
}
```

### Line-by-line explanation
- YAML snippet: Defines a high-level SLO for availability and latency with a 30-day window. This helps drive alerting and capacity planning.
- Python snippet: Calculates an error budget from the SLO and a 30-day window. Higher error budget consumption means faster burn and potentially stricter mitigations.
- JSON snippet: A compact programmatic representation of the same SLOs for use in tooling or CI pipelines.

## 2. Latency: Golden Signal and Azure Telemetry

- What it covers: Latency is how long it takes to serve requests. In Azure, you measure latency with Application Insights (duration) and surface p95/p99 latency through Kusto Query Language (KQL) in Log Analytics or Application Insights.
- Why it matters professionally: Latency tails often drive user-perceived slowness. p95/p99 highlights tail latency that averages miss.

### 2.1 Latency via KQL (Application Insights)

```kusto
// Latency: p95 latency per 5m bucket for last 15 minutes
requests
| where timestamp > ago(15m)
| summarize p95LatencyMs = percentile(duration, 95), avgLatencyMs = avg(duration) by bin(timestamp, 5m)
| order by timestamp asc
```

### Line-by-line explanation
- requests: Application Insights table with HTTP request telemetry.
- | where timestamp > ago(15m): limit data to the last 15 minutes.
- | summarize p95LatencyMs = percentile(duration, 95), avgLatencyMs = avg(duration) by bin(timestamp, 5m): compute p95 and average latency in 5-minute buckets.
- | order by timestamp asc: present results chronologically.

### 2.2 Latency via Python (Azure Monitor Query)

```python
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient
import datetime

credential = DefaultAzureCredential()
client = LogsQueryClient(credential)

workspace_id = "<WORKSPACE_OR_WORKSPACE_ID>"
query = """
requests
| where timestamp > ago(15m)
| summarize p95LatencyMs = percentile(duration, 95), avgLatencyMs = avg(duration) by bin(timestamp, 5m)
| order by timestamp asc
"""
response = client.query(workspace_id, query, timespan=datetime.timedelta(minutes=15))
print(response.tables[0].rows)
```

### Line-by-line explanation
- Setup: Use DefaultAzureCredential to authenticate and create a LogsQueryClient.
- workspace_id: Your Log Analytics workspaces or Application Insights data source.
- query: KQL query string computing p95 and average latency per 5-minute bucket for the last 15 minutes.
- response: Executes the query; prints the results.

### 2.3 Latency: Basic Azure Monitor Alert (p95 latency breach)

```bash
# Example: Using scheduled query alerts (Log Analytics) to trigger on p95 latency breach
az monitor scheduled-query create \
  --name "LatencyBreaches" \
  --resource-group MyRG \
  --scopes /providers/Microsoft.OperationalInsights/workspaces/MyLogWorkspace \
  --rule 'requests
| where timestamp > ago(15m)
| summarize p95LatencyMs = percentile(duration, 95) by bin(timestamp, 5m)
| where p95LatencyMs > 400'
```

### Line-by-line explanation
- az monitor scheduled-query create: Creates a log-based alert rule.
- --scopes: The Log Analytics workspace resource.
- --rule: The KQL rule to evaluate; if the result set indicates p95LatencyMs > 400 ms, the alert fires.
- This ties latency targets to automated notifications and runbooks.

## 3. Traffic: Observing Throughput and Load

- What it covers: Traffic is the load you serve. In Azure, track requests/sec, throughput, and user impact. Use Application Insights for requests/sec or logs, and Azure Monitor metrics for API rate and ingress.
- Why it matters professionally: Capacity planning and autoscaling rely on accurate traffic metrics to avoid over- or under-provisioning.

### 3.1 Traffic via KQL (Requests/sec)

```kusto
// Requests per minute (ingress rate) for last 20 minutes
requests
| where timestamp > ago(20m)
| summarize requestsPerMin = count() by bin(timestamp, 1m)
| order by timestamp asc
```

### Line-by-line explanation
- requests: Telemetry table with each incoming request.
- where timestamp > ago(20m): last 20 minutes.
- summarize requestsPerMin = count() by 1-minute bins: computes requests per minute.
- order by timestamp: chronological order.

### 3.2 Traffic via Azure Monitor Metrics CLI (Ingestion Rate)

```bash
# Example: Querying "Requests" per minute as a metric on a resource
az monitor metrics list \
  --resource /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Web/sites/MyApp \
  --metric "Requests" \
  --interval 00:05:00 \
  --aggregation "Total" \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-01T01:00:00Z
```

### Line-by-line explanation
- az monitor metrics list: Retrieve metrics for a specific Azure resource.
- --resource: The resource to monitor (App Service in this example).
- --metric "Requests": The throughput metric; exact metric name depends on the resource type.
- --interval 00:05:00: 5-minute granularity.
- --aggregation "Total": Sum across the bucket.
- --start-time / --end-time: Time window for the query.

### 3.3 Traffic: Alert on High Throughput

```bash
# Simple alert on average requests per minute exceeding a threshold
az monitor metrics alert create \
  --name "HighTraffic" \
  --resource-group MyRG \
  --scopes /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Web/sites/MyApp \
  --condition "avg Requests > 1000" \
  --description "Traffic spike detected" \
  --severity 2
```

### Line-by-line explanation
- Creates a metric alert with a condition on the average Requests metric.
- Helps you auto-detect traffic spikes and trigger scale actions or notifications.

## 4. Errors: Detecting Faults and Failure Rates

- What it covers: Errors indicate failed or undesired outcomes. In Azure, track 5xx errors, exception counts, and failed requests using Application Insights and Log Analytics.
- Why it matters professionally: Error budgets rely on accurate error rate measurements to decide on remediation or feature flags.

### 4.1 Error Rate via KQL

```kusto
// Error rate (%): failed requests / total requests in last 30 minutes
requests
| where timestamp > ago(30m)
| summarize totalRequests = count(), failedRequests = sum(iif(success == false, 1, 0)) by bin(timestamp, 5m)
| project timestamp, errorRatePct = 100.0 * failedRequests / totalRequests
| order by timestamp asc
```

### Line-by-line explanation
- requests: Telemetry table with success flag.
- where timestamp > ago(30m): consider last 30 minutes.
- summarize: aggregate counts per 5-minute bucket.
- project: compute error rate percentage.
- order by: chronological results.

### 4.2 Errors via Python (azure-monitor-query)

```python
query = """
requests
| where timestamp > ago(30m)
| summarize totalRequests = count(), failedRequests = sum(iif(success == false, 1, 0)) by bin(timestamp, 5m)
| project timestamp, errorRatePct = 100.0 * failedRequests / totalRequests
| order by timestamp asc
"""
response = client.query(workspace_id, query, timespan=datetime.timedelta(minutes=30))
print(response.tables[0].rows)
```

### Line-by-line explanation
- query: KQL computing error rate per 5-minute bucket.
- response: Executes and prints error rate results.

### 4.3 Error Budget Burn and Alerts (Log-based)

```bash
# Log rule: if 5m error rate > 2% for 30m window, trigger alert
az monitor scheduled-query create \
  --name "ErrorRateBreaches" \
  --resource-group MyRG \
  --scopes /providers/Microsoft.OperationalInsights/workspaces/MyLogWorkspace \
  --rule 'requests
  | where timestamp > ago(30m)
  | summarize errRate = 100.0 * sum(iif(success == false, 1, 0)) / count() by bin(timestamp, 5m)
  | where errRate > 2'
```

### Line-by-line explanation
- Creates a log-based alert rule that fires when error rate breaches 2% over a 30-minute window.
- Useful to trigger runbooks, paging, or on-call alerts.

## 5. Saturation: Capacity and Resource Contention

- What it covers: Saturation tells you when you’re hitting capacity limits (CPU, memory, I/O, queue depth). In Azure, collect resource saturation metrics and correlate with throughput and errors.
- Why it matters professionally: Without saturation signals you might fail to scale proactively, leading to degraded performance under load.

### 5.1 Saturation via Perf (CPU) in Log Analytics

```kusto
Perf
| where CounterName == "% Processor Time" and CounterValue > 70
| summarize avgCPU = avg(CounterValue), maxCPU = max(CounterValue) by bin(TimeGenerated, 5m)
| order by TimeGenerated asc
```

### Line-by-line explanation
- Perf: Windows performance counters in Log Analytics.
- CounterName == "% Processor Time": CPU usage counter.
- CounterValue > 70: threshold for saturation concern.
- summarize: average and maximum CPU per 5-minute window.
- TimeGenerated: time normalization of log entries.

### 5.2 Saturation via Azure Monitor Metrics (CPU)

```bash
# Example: CPU percentage metric for a VM or App Service
az monitor metrics list \
  --resource /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Compute/virtualMachines/MyVM \
  --metric "Percentage CPU" \
  --interval 00:05:00 \
  --aggregation Average \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-01T01:00:00Z
```

### Line-by-line explanation
- Retrieves CPU usage metric in 5-minute intervals.
- Useful for capacity planning and autoscale triggers.

### 5.3 Saturation: Alert on High Saturation

```bash
az monitor metrics alert create \
  --name "HighCpuUsage" \
  --resource-group MyRG \
  --scopes /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Compute/virtualMachines/MyVM \
  --condition "avg Percentage CPU > 75" \
  --description "CPU saturation detected" \
  --severity 2
```

### Line-by-line explanation
- Creates an alert when average CPU exceeds 75%.
- Enables proactive remediation (scale out, cache warming, or feature flags).

## 6. Observability, Runbooks, and Alerting in Real Systems

- What it covers: Integrating Golden Signals with alerting & automation. Use Azure Monitor, Application Insights, and Runbooks/Automation to respond to incidents.
- Why it matters professionally: Automated responses help reduce MTTR, improve reliability, and maintain customer trust.

### 6.1 Action Groups (Azure)

```bash
# Create an Action Group for alerts
az monitor action-group create \
  --name "OnCallGroup" \
  --resource-group MyRG \
  --short-name OC \
  --email-receiver oncall@example.com \
  --phone-number "+1-555-0100" \
  --webhook https://example.com/alerts
```

### Line-by-line explanation
- Defines who gets alerted and how (email, SMS, webhook).
- Use with metric or log-based alerts to auto-notify on incidents.

### 6.2 Runbook: Respond to an Incident

```powershell
# Example PowerShell runbook snippet (Azure Automation)
param(
  [string]$incidentId,
  [string]$serviceName
)

Write-Output "Responding to incident $incidentId for $serviceName"
# Steps: pull latest incident metrics, scale out, notify on-call, and run postmortem script
```

### Line-by-line explanation
- A skeleton showing where automation steps would go: collect data, apply remediation, notify, and log actions.

## X. Common Beginner Mistakes

- 3+ real pitfalls with bad vs good code side-by-side.

1) Pitfall: Relying on average latency; ignoring tail latency
- Bad:
```kusto
// Using avg(duration) as a proxy for latency
requests
| summarize avgLatency = avg(duration)
```
- Good:
```kusto
// Use p95 or p99 latency instead
requests
| summarize p95Latency = percentile(duration, 95), p99Latency = percentile(duration, 99) by bin(timestamp, 5m)
```

2) Pitfall: Not normalizing by time window or bucket size
- Bad:
```kusto
requests
| where timestamp > ago(15m)
| summarize total = count()
```
- Good:
```kusto
requests
| where timestamp > ago(15m)
| summarize total = count() by bin(timestamp, 1m)
```

3) Pitfall: Ignoring sampling in telemetry (biased data)
- Bad:
```csharp
TelemetryClient.TrackEvent("Signup");
```
- Good:
```csharp
// Ensure sampling is enabled or use adaptive sampling to minimize bias
TelemetryConfiguration.Active.TelemetryInitializers.Add(new AdaptiveSamplingTelemetryInitializer( /* params */ ));
```

4) Pitfall: Not tying alerts to actionable runbooks
- Bad:
```bash
az monitor metrics alert create --name "HighLatency" ...
```
- Good:
```bash
az monitor metrics alert create \
  --name "HighLatency" \
  --action "$(az monitor action-group show --name OnCallGroup --query id -o tsv)" \
  --description "Latency breach; trigger runbook and notify on-call"
```

5) Pitfall: Overloading dashboards with noisy signals
- Bad: A single dashboard containing every metric without context.
- Good: Focused, role-based dashboards (SRE, product owner, on-call) with target thresholds and clear color-coding; include p95 latency, error rate, and CPU saturation.

## Y. Why This Matters In Real Systems

- Production context: SRE principles embed reliability into software lifecycles. In Azure, Golden Signals guide when to scale, when to roll back, and how to prioritize incident response. SLOs become contract-like expectations with customers; error budgets balance feature delivery and reliability.
- Real usage examples:
  - A payment gateway uses p95 latency targets (e.g., < 350 ms) and a low error budget to limit new deployments during spikes.
  - A SaaS platform scales out App Services when requests per minute surpass a threshold, while alerting on high CPU or memory saturation.
  - Runbooks automatically retry failed operations and notify on-call engineers upon sustained errors.

## Z. Study Questions

1) What are the four Golden Signals, and why is each important for Azure-based services?
2) How do you compute p95 latency in Application Insights using KQL?
3) What is an error budget, and how would you calculate it for a 99.9% availability target over 30 days?
4) How can you alert on saturation in Azure Monitor, and what actions can you configure in an action group?
5) Why is tail latency often more critical than average latency in production systems?

## Exercise

Part A — Instrumentation and telemetry
- Create or identify an Azure App Service or Function with Application Insights enabled.
- Add a small Express (Node.js) or ASP.NET Core middleware to log request duration to Application Insights (automatic and custom events).

Code example (Node.js, Express):
```javascript
const express = require('express');
const app = express();
const appInsights = require('applicationinsights');
appInsights.setup('INSTRUMENTATION_KEY').start();

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    appInsights.defaultClient.trackRequest({
      name: `${req.method} ${req.originalUrl}`,
      duration: duration,
      resultCode: res.statusCode,
      success: res.statusCode < 400
    });
  });
  next();
});

app.get('/health', (req, res) => res.send('ok'));
app.listen(3000, () => console.log('Server running'));
```

Part B — KQL practice
- Write KQL queries to compute:
  1) p95 latency for last 60 minutes in 5-minute buckets.
  2) 5-minute average error rate over the past 2 hours.
 3) Requests per minute over the last 30 minutes.

Part C — Alerting and remediation
- Set up a log-based alert (Azure Monitor) that fires if p95 latency > 500 ms for 15 minutes.
- Attach an action group that emails the on-call and posts to a webhook.

Part D — Simple Python query tool
- Write a Python script using azure-monitor-query to fetch the last 24 hours of:
  - p95 latency
  - error rate
  - total requests
- Print or export the results to JSON for a lightweight dashboard.

Part E — SLO and error budget calculation
- Given an SLA of 99.95% availability over 30 days, compute the monthly error budget and outline a plan for what actions to take if burn rate exceeds 50%.

Notes for implementation
- Replace placeholders (INSTRUMENTATION_KEY, resource IDs, workspace IDs) with your real Azure resources.
- Metrics and log schema names can vary by resource type; adjust KQL and CLI metric names accordingly.
- Use role-based access and least privilege in your Azure credentials when running these commands.

End of lesson.