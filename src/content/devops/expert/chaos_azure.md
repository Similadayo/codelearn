# Chaos Engineering & Reliability in Azure

Chaos engineering is the discipline of intentionally introducing controlled failures to validate a system’s resilience. In Azure, you can exercise chaos through Chaos Studio, Chaos Mesh on AKS, and a suite of reliability patterns (retry, circuit breakers, timeouts) paired with observability and disaster-recovery strategies. This lesson teaches how to design, run, and learn from chaos experiments in Azure environments, while keeping safety, guardrails, and real-world production needs in mind.

## 1. Chaos Engineering Fundamentals in Azure

Explore the core ideas, tooling, and safety practices you’ll apply when validating reliability in Azure-based systems.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.Chaos/experiments",
      "apiVersion": "2020-10-01-preview",
      "name": "sample-chaos-experiment",
      "location": "[resourceGroup().location]",
      "properties": {
        "steps": [
          {
            "name": "restart-vm",
            "type": "restart",
            "target": {
              "scope": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/MyRG/providers/Microsoft.Compute/virtualMachines/MyVM"
            },
            "duration": "PT5M"
          }
        ],
        "selector": {
          "mode": "All"
        }
      }
    }
  ]
}
```

### Line-by-line explanation
- Line 1-2: ARM template declaration and schema reference for Chaos Studio resources.
- Line 3: Template contentVersion; a simple version for the template.
- Line 4-18: A single Chaos Experiment resource:
  - Line 5: Resource typeMicrosoft.Chaos/experiments with the preview API version.
  - Line 6: Name of the experiment.
  - Line 7: Location from the resource group.
  - Line 8-17: Properties of the experiment:
    - Line 9-15: Steps array defining a disruption action.
    - Line 10-14: Step named "restart-vm" that will perform a restart action on a specific VM (the target scope includes subscription, resource group, and VM). Duration restricts how long the disruption lasts.
    - Line 16: Selector with mode "All" indicating the disruption applies to all targets selected by the experiment.
- Line 18: End of resources array.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Running chaos without a safe guardrail
  - Bad:
    - Starting a disruption on production without a blast radius check or runbook constraints.
  - Good:
    - Configure a runbook, escalation path, and blast radius (e.g., only non-production or during maintenance windows).
- Pitfall 2: Overly long disruption durations
  - Bad:
    - Duration PT2H causing cascading customer impact.
  - Good:
    - Short, bounded durations (PT5M – PT15M) with automatic rollback if alarms fire.
- Pitfall 3: No observability hooks
  - Bad:
    - Running chaos without telemetry or health checks.
  - Good:
    - Instrument experiments; emit events to Application Insights or Log Analytics and verify post-experiment dashboards.

Y. Why This Matters In Real Systems — production context and real usage
- Chaos experiments reveal weaknesses in deployment pipelines, dependency reliability, and failure modes absent in healthy runs.
- In Azure, Chaos Studio/Chaos Mesh on AKS help validate failover paths, autoscaling behavior, and end-to-end SLAs under controlled, observable conditions.
- Proper guardrails, rollback plans, and telemetry ensure learnings translate into actionable improvements rather than noisy incidents.

Z. Study Questions — 5 recall questions
1. What is the primary goal of chaos engineering in production systems?
2. Name two Azure-native chaos tooling options and a typical use case for each.
3. Why are short disruption windows important during chaos experiments?
4. Which telemetry patterns help you correlate chaos events with system health?
5. How do you validate that a recovery action (like a restart) actually improves reliability?

## 2. Chaos Injection on AKS with Chaos Mesh in Azure

Learn how to deploy a chaos framework on Azure Kubernetes Service (AKS) and run a safe pod-level disruption.

```bash
# Deploy Chaos Mesh on AKS (example commands)
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update
kubectl create namespace chaos-testing
helm install chaos-mesh chaos-mesh/chaos-mesh --namespace chaos-testing
```

### Line-by-line explanation
- Line 1: Install the Chaos Mesh Helm chart from the Chaos Mesh repository.
- Line 2: Update the local Helm repo index to fetch the latest charts.
- Line 3: Create a dedicated namespace for Chaos Mesh resources.
- Line 4: Install Chaos Mesh into the chaos-testing namespace, enabling Chaos Mesh CRDs (PodChaos, NetworkChaos, etc.) and controllers.

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: default
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-app
  duration: "30s"
```

### Line-by-line explanation
- Line 1: Declare a Chaos Mesh PodChaos custom resource.
- Line 2-4: Metadata: resource kind, name, and target namespace.
- Line 5: spec.action specifies the disruption type; here, a pod kill.
- Line 6: spec.mode "one" targets a single matching pod.
- Line 7-11: spec.selector defines the scope; in this case, pods in the "default" namespace with the label app=my-app.
- Line 12: spec.duration sets the disruption window to 30 seconds.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Killing all pods with global selectors
  - Bad:
    - PodChaos with mode: all and broad selectors risks broad outages.
  - Good:
    - Narrow selectors (specific app labels, single namespace) and mode: one for controlled blast radius.
- Pitfall 2: No clean-up or idempotency
  - Bad:
    - Hard-coded single-use manifests without reconcilers or cleanup steps.
  - Good:
    - Use declarative manifests with clear cleanup detours; verify pods restart and app recovers.
- Pitfall 3: Ignoring namespace boundaries
  - Bad:
    - Chaos in all namespaces, risking environment stability.
  - Good:
    - Target a staging or specific app namespace when starting out.

Y. Why This Matters In Real Systems
- Chaos Mesh on AKS provides a granular ability to inject failures at the pod level, enabling you to validate how microservices recover from pod crashes, restarts, or evictions.
- Observability and guardrails must accompany chaos to prevent uncontrolled outages and to learn how dependencies behave under pressure.

## 3. Building Resilience Patterns in Azure (Retry, Circuit Breaker, Timeouts)

Implement and demonstrate resilience patterns in code to cope with transient Azure or external service failures.

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;
using Polly;
using Polly.Extensions.Http;

class ResilienceDemo
{
  private static readonly HttpClient httpClient = new HttpClient();

  public static async Task<string> GetAsyncWithResilience(string url)
  {
    var retryPolicy = HttpPolicyExtensions
      .HandleTransientHttpError()
      .WaitAndRetryAsync(5, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
        onRetry: (outcome, timespan, retryAttempt, context) =>
        {
          Console.WriteLine($"Retry {retryAttempt} after {timespan.Seconds}s due to {outcome.Exception?.Message ?? outcome.Result.StatusCode.ToString()}");
        });

    var circuitBreakerPolicy = HttpPolicyExtensions
      .HandleTransientHttpError()
      .CircuitBreakerAsync(3, TimeSpan.FromSeconds(60));

    var policyWrap = Policy.WrapAsync(retryPolicy, circuitBreakerPolicy);

    HttpResponseMessage response = await policyWrap.ExecuteAsync(() => httpClient.GetAsync(url));
    response.EnsureSuccessStatusCode();
    return await response.Content.ReadAsStringAsync();
  }
}
```

### Line-by-line explanation
- Line 1-3: Using directives for System, HttpClient, and async tasks.
- Line 5: Class declaration for the resilience demo.
- Line 7: Static HttpClient instance for reuse and efficiency.
- Line 9-22: GetAsyncWithResilience method:
  - Line 11-15: Define a retry policy that handles transient HTTP errors and waits with exponential backoff. The onRetry callback logs each retry.
  - Line 17-21: Define a circuit-breaker policy that opens after 3 consecutive failures and remains open for 60 seconds.
  - Line 23: Wrap both policies so that the retry logic is nested within the circuit-breaker logic.
  - Line 25: Execute the HTTP call through the wrapped policy to apply resilience behavior.
  - Line 26: Ensure the response indicates success (throws otherwise).
  - Line 27: Return the response body as string.

```python
import httpx
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(wait=wait_exponential(multiplier=1, min=1, max=60), stop=stop_after_attempt(5))
def fetch(url: str) -> str:
    r = httpx.get(url, timeout=5.0)
    r.raise_for_status()
    return r.text
```

### Line-by-line explanation
- Line 1-2: Import httpx for HTTP calls and tenacity for retry behavior.
- Line 4: Decorator configures exponential backoff (with a max wait) and a max of 5 attempts.
- Line 5: Function fetch performs an HTTP GET.
- Line 6: Execute the request with a timeout of 5 seconds.
- Line 7: Raise an exception for non-2xx responses (triggers retry).
- Line 8: Return the response body on success.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: No handling for transient errors
  - Bad (no retry):
    - return httpClient.GetAsync(url);
  - Good (with retry):
    - Uses a retry policy with exponential backoff to recover from transient failures.
- Pitfall 2: Blocking I/O in async code
  - Bad:
    - Using .Result or .Wait() in async contexts causing deadlocks.
  - Good:
    - Use awaitable async calls and asynchronous resilience policies.
- Pitfall 3: Unbounded retries
  - Bad:
    - Infinite retries with no stop condition.
  - Good:
    - Limit attempts (stop_after_attempt) and consider a circuit breaker to stop unless external signals indicate recovery.

## 4. Observability & Telemetry for Reliability

Instrument chaos tests and resilience strategies so you can learn, measure, and improve.

```csharp
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;
using System.Collections.Generic;

class TelemetryDemo
{
  static void Main()
  {
    // Initialize TelemetryClient (InstrumentationKey configured via environment or config)
    TelemetryClient telemetry = new TelemetryClient();

    // Track a custom event when a chaos experiment completes
    telemetry.TrackEvent("ChaosExperimentCompleted",
      new Dictionary<string, string>
      {
        { "ExperimentName", "restart-vm-2024-01" },
        { "Status", "Completed" }
      });

    // Flush telemetry before exiting
    telemetry.Flush();
  }
}
```

### Line-by-line explanation
- Line 1-2: Import Application Insights types.
- Line 4-8: Telemetry client creation (integration key typically supplied via configuration or environment variable).
- Line 11-18: Track a custom event named "ChaosExperimentCompleted" with properties to identify the experiment and status.
- Line 21: Flush telemetry to ensure data is sent before process exit.

## 5. SRE & DR in Azure — Multi-region, Failover, and Runbooks

Design for reliability using multi-region deployments, global traffic routing, and runbooks for automatic recovery.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "microsoft.network/trafficmanagerprofiles",
      "apiVersion": "2018-04-01",
      "name": "prod-traffic-profile",
      "location": "global",
      "properties": {
        "trafficRoutingMethod": "Priority",
        "monitorConfig": {
          "protocol": "HTTP",
          "port": 80,
          "path": "/health"
        },
        "dnsConfig": {
          "relativeName": "prod-traffic",
          "ttl": 60
        },
        "endpoints": [
          {
            "name": "westus-endpoint",
            "type": "Microsoft.Network/trafficManagerProfiles/externalEndpoints",
            "targetResourceId": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/MyRG/providers/Microsoft.Web/sites/ProdApp-West",
            "endpointLocation": "westus",
            "priority": 1
          },
          {
            "name": "northeurope-endpoint",
            "type": "Microsoft.Network/trafficManagerProfiles/externalEndpoints",
            "targetResourceId": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/MyRG/providers/Microsoft.Web/sites/ProdApp-EU",
            "endpointLocation": "northeurope",
            "priority": 2
          }
        ]
      }
    }
  ]
}
```

### Line-by-line explanation
- Line 1-3: Template header for a Traffic Manager profile (global DNS routing).
- Line 4: Resource type for Traffic Manager profiles with the external API version.
- Line 5-7: Profile metadata (name and location).
- Line 9-20: Profile properties:
  - Line 10: Routing method set to Priority, enabling a primary endpoint with a fallback.
  - Line 11-15: Health monitor configuration for availability checks (HTTP, port 80, path /health).
  - Line 16-20: DNS configuration for the Traffic Manager DNS name with a TTL.
  - Line 21-37: Endpoint configurations, with two endpoints prioritized (westus and northeurope) and their target resource IDs.
- Line 37: End of resources.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Ignoring health checks
  - Bad:
    - Traffic manager endpoints without monitorConfig, leading to misrouting during outages.
  - Good:
    - Include monitorConfig and health probes to route away from unhealthy endpoints.
- Pitfall 2: Single-region deployment with no DR plan
  - Bad:
    - All traffic points to one region; no failover path.
  - Good:
    - Active-passive or active-active strategies with clear failover rules and metrics.
- Pitfall 3: Overlooking operational runbooks
  - Bad:
    - No automated recovery actions or escalation triggers.
  - Good:
    - Include runbooks, automation for failover, and post-incident review hooks.

## Y. Why This Matters In Real Systems — production context and real usage
- Multi-region traffic management ensures service continuity during regional outages.
- Observability across chaos experiments reveals how failures propagate through dependencies, enabling faster improvements.
- DR strategies in Azure require tight coupling between infrastructure as code, runbooks, and monitoring signals to reduce MTTR (mean time to recovery).

## Z. Study Questions — 5 recall questions
1. What is the purpose of using a Traffic Manager with priority routing in Azure?
2. How would you implement a pod-level disruption safely on AKS with Chaos Mesh?
3. Name two resilience patterns and a scenario where each is most useful.
4. Why is telemetry important when running chaos experiments?
5. What guardrails would you put in place before running a chaos experiment in production?

## Exercise — Practical multi-part coding challenge

Part A — Set up Chaos on AKS
- Task: Provision a small AKS cluster and install Chaos Mesh in a dedicated namespace.
- Code/Commands:
```bash
# 1) Create a resource group and AKS cluster (simplified)
az group create --name mySRERG --location eastus
az aks create --resource-group mySRERG --name mySREAKS --node-count 1 --enable-addons monitoring

# 2) Get credentials to kubectl
az aks get-credentials --resource-group mySRERG --name mySREAKS

# 3) Install Chaos Mesh
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update
kubectl create namespace chaos-testing
helm install chaos-mesh chaos-mesh/chaos-mesh --namespace chaos-testing
```

Line-by-line explanation
- Line 1-2: Create a resource group and a minimal AKS cluster for SRE learning.
- Line 3: Fetch credentials to configure kubectl for the cluster.
- Line 5-7: Add Chaos Mesh Helm repository, update, and create a dedicated namespace for Chaos Mesh.
- Line 8: Install Chaos Mesh into the namespace.

Part B — Create and run a PodChaos experiment
- Task: Kill a single pod labeled app=my-app for 30 seconds.
- Code:
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-sample
  namespace: default
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-app
  duration: "30s"
```

Line-by-line explanation
- Line 1: API version for Chaos Mesh CRD.
- Line 2: Kind PodChaos defines this disruption type.
- Line 4-6: Metadata for the resource.
- Line 7: Spec.action specifies the disruption (pod-kill).
- Line 8: Spec.mode one targets a single matching pod.
- Line 9-13: Selector specificity to limit disruption to pods with label app=my-app in the default namespace.
- Line 14: Duration defines how long the disruption lasts.

Part C — Build a resilient client in a sample .NET API
- Task: Implement a retry + circuit-breaker policy for a downstream API in a .NET Web API.
- Code:
```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Net.Http;
using System.Threading.Tasks;
using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient("DownstreamApi")
  .AddPolicyHandler(GetPolicy());

var app = builder.Build();

app.MapGet("/call", async (IHttpClientFactory factory) =>
{
  var client = factory.CreateClient("DownstreamApi");
  var resp = await client.GetAsync("https://httpbin.org/status/200");
  return resp.IsSuccessStatusCode ? "OK" : "Fail";
});

app.Run();

static IAsyncPolicy<HttpResponseMessage> GetPolicy()
{
  var retryPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .WaitAndRetryAsync(5, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
      onRetry: (outcome, timespan, retryAttempt, context) =>
      Console.WriteLine($"Retry {retryAttempt} after {timespan.Seconds}s"));

  var circuitPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .CircuitBreakerAsync(2, TimeSpan.FromSeconds(30));

  return Policy.WrapAsync(retryPolicy, circuitPolicy);
}
```

Line-by-line explanation
- Line 1-7: Set up a minimal ASP.NET Core app and add an HttpClient named "DownstreamApi".
- Line 9-16: Use a policy wrapper combining retry and circuit breaker for resilience.
- Line 20-28: Endpoint that calls the downstream API and returns a simple result.
- Line 30-46: GetPolicy defines the retry and circuit-breaker behavior with logging to the console.

Part D — Observability integration (Instrumentation)
- Task: Add Application Insights telemetry for chaos events.
- Code:
```csharp
using Microsoft.ApplicationInsights;
using System.Collections.Generic;

// Inside your startup or main method
TelemetryClient telemetry = new TelemetryClient();
telemetry.TrackEvent("ChaosExperimentTriggered",
  new Dictionary<string, string> { { "ExperimentName", "pod-kill-sample" }, { "Status", "Triggered" } });
telemetry.Flush();
```

Line-by-line explanation
- Line 1-2: Imports for Application Insights.
- Line 5-9: Create a TelemetryClient instance and track a custom event whenever a chaos experiment begins.
- Line 10-11: Flush telemetry so the event is sent before the process ends.

Notes for instructors and learners
- Safety: Always run chaos experiments in non-prod environments first; obtain approvals for any production testing cadence; have an automated rollback/runbook.
- Observability: Ensure you have dashboards in Azure Monitor / Log Analytics and Application Insights to correlate chaos events, system metrics, and incidents.
- Reproducibility: Store chaos definitions as code (ARM templates, Helm charts, YAML) in version control and tag experiments with metadata.

If you’d like, I can tailor the content to a specific Azure focus (e.g., more emphasis on AKS, App Service, or Azure SQL), swap in language examples (Python, Java, or Node.js), or provide a runnable starter project repository scaffold that includes all sections above.