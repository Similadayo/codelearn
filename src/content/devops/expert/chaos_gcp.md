# Chaos Engineering & Reliability in Google Cloud: Phase 5 — SRE & Reliability

Chaos engineering is the disciplined practice of injecting controlled faults into a system to verify its resilience, detect weaknesses, and improve reliability. In Google Cloud environments, chaos engineering complements SRE by validating service level objectives (SLOs), error budgets, and incident response in a safe, observable way. This lesson teaches you how to design, execute, and learn from chaos experiments on Google Cloud, with a practical focus on GKE (Kubernetes) and Google Cloud Monitoring/Logging for observability and guardrails.

---

## 1. Foundations: What Chaos Engineering Means for SRE in GCP

- Objective: Define reliability goals, observable metrics, and hypotheses before you start injecting faults.
- Why it matters: Real-world outages are costly. Proactively validating resilience reduces MTTR, prevents cascading failures, and improves user trust.

### 1. Reliability plan and hypotheses (YAML excerpts)

```yaml
# reliability-plan.yaml
topic: "Chaos engineering plan for Google Cloud deployments"
objective: "Assess resilience of orders-api under injected faults"
service: "orders-api"
environment: "staging"
SLOs:
  - name: availability
    description: "Service availability over rolling window"
    goal: 0.9995
  - name: p95_latency_ms
    description: "P95 latency in milliseconds"
    target_ms: 350
```

### Line-by-line explanation
- Line 1: A header comment-like line naming the plan file.
- Line 2: topic/category of the plan ( Chaos Engineering for GCP deployments ).
- Line 3: objective describing what you want to prove or observe.
- Line 4: the target service under test.
- Line 5: deployment environment (staging for safe testing before prod).
- Lines 6-12: a list of SLOs to monitor, with:
  - availability as a binary success metric over a rolling window.
  - p95_latency_ms as a latency objective to keep tail latency in check.

---

```yaml
# hypothesis.yaml
goals:
  - "Under CPU pressure, error rate should not exceed 0.5%"
assumptions:
  - "Autoscaling is configured"
  - "Circuit breakers are in place"
```

### Line-by-line explanation
- Line 1: Hypotheses about expected behavior under certain fault conditions.
- Line 2-4: A list of goals describing expected resilience when CPU pressure is introduced.
- Line 5-6: Assumptions about the environment that must hold true for the hypothesis to be valid (e.g., autoscaling, circuit breakers).
- This helps teams decide when to proceed with deeper experiments or stop due to violated assumptions.

---

```json
# metrics_mapping.json
{
  "cpuUtilization": "container.googleapis.com/container/cpu_usage_seconds_total",
  "errorRate": "custom.googleapis.com/service/error_rate",
  "p95Latency": "custom.googleapis.com/service/p95_latency_ms"
}
```

### Line-by-line explanation
- This JSON maps high-level observability goals to Google Cloud Monitoring metric types.
- cpuUtilization maps to container CPU usage metrics in GKE.
- errorRate and p95Latency map to custom metrics you publish from your app/service.
- This mapping guides what dashboards/alerts you’ll rely on during experiments.

---

## 2. Set Up Chaos Mesh on GKE and Run Your First Experiment

In Google Cloud, Chaos Mesh is a popular framework for Chaos Engineering on Kubernetes. This section covers installation, deploying a simple app, and running a basic PodChaos (pod kill) experiment as a safe starting point.

### 2. Chaos Mesh installation on a GKE cluster

```bash
# Install Chaos Mesh in the cluster (in the default namespace; adjust for your cluster)
kubectl apply -f https://chaos-mesh.org/chaos-mesh.yaml
```

### Line-by-line explanation
- Line 1: Uses kubectl to apply the Chaos Mesh manifest directly from the Chaos Mesh project.
- This installs CRDs, the controller, and the default namespace (chaos-testing) components to enable chaos experiments.

---

### 2. Sample app deployment (HTTP echo) and service

```yaml
# web-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:0.2.3
        args: ["-text=chaos-enabled"]
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 5678
```

### Line-by-line explanation
- Deployment metadata: defines a 3-replica web app labeled app=web.
- The container uses hashicorp/http-echo to respond with "chaos-enabled" text on port 5678.
- Service exposes port 80 and routes to container port 5678 for internal and external access as needed.
- This minimal app provides a stable target for chaos experiments.

---

### 2. Pod Chaos: kill a pod to simulate a failure

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-web
  namespace: default
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: ["default"]
    labelSelectors:
      app: web
  duration: "30s"
```

### Line-by-line explanation
- apiVersion/kind: Defines the Chaos Mesh custom resource for a PodChaos experiment.
- metadata.name/namespace: Names the experiment and scopes it to the default namespace.
- spec.action: The type of chaos to perform (pod-kill).
- spec.mode: "one" means kill a single matching pod; safe for a small blast radius.
- spec.selector: Targets pods labeled app=web in the default namespace.
- spec.duration: The length of time the chaos will affect the target.

---

## 3. Designing Safe Experiments and Observability in GCP

This section covers expanding chaos experiments safely and tying results into Google Cloud’s observability stack.

### 3. Network latency chaos (NetworkChaos)

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: latency-web
  namespace: default
spec:
  action: delay
  mode: one
  duration: "15s"
  latency: "120ms"
  direction: bidirectional
  selector:
    namespaces: ["default"]
    labelSelectors:
      app: web
```

### Line-by-line explanation
- kind: NetworkChaos represents network fault injection experiments.
- action: delay introduces network latency; duration sets how long it lasts.
- mode: one means a single target is affected; adjust risk with other modes (all, random, fixed).
- latency: 120 milliseconds simulated delay.
- direction: bidirectional applies latency both ways between client and server.
- selector: selects pods with label app=web in the default namespace.

---

### 3. Python example: circuit breaker for graceful degradation

```python
# breaker.py
import requests
import pybreaker

breaker = pybreaker.CircuitBreaker(fail_max=3, reset_timeout=60)

@breaker
def call_inventory():
    resp = requests.get("http://inventory-service.default.svc.cluster.local/stock", timeout=2)
    resp.raise_for_status()
    return resp.json()

def main():
    try:
        stock = call_inventory()
        print("Stock:", stock)
    except pybreaker.CircuitBreakerError:
        print("Fallback: inventory unavailable (circuit open)")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Lines 1-2: Import required libraries (requests for HTTP, pybreaker for circuit breaker).
- Line 4: Create a CircuitBreaker with a maximum of 3 failures before tripping and a 60-second reset timeout.
- Lines 6-11: Decorate the inventory call with the circuit breaker; on success, return JSON stock data.
- Lines 13-21: Main routine; on CircuitBreakerError, fall back to a safe path (e.g., degrade gracefully or route to a cached response).
- This demonstrates how to add resilience in app code so chaos experiments reveal if downstream calls cause cascading failures.

---

### 3. Observability integration: reporting metrics to Google Cloud

```python
# push_metrics.py
from google.cloud import monitoring_v3
import time

client = monitoring_v3.MetricServiceClient()
project = "projects/your-gcp-project-id"
series = monitoring_v3.TimeSeries()
series.metric.type = "custom.googleapis.com/service/error_rate"
series.resource.type = "generic_task"
series.resource.labels["task_id"] = "chaos-test-1"
now = time.time()

series.points.add(
    {
        "interval": {"end_time": {"seconds": int(now)}},
        "value": {"double_value": 0.01},
    }
)

client.create_time_series(name=project, time_series=[series])
```

### Line-by-line explanation
- Lines 1-2: Import Google Cloud Monitoring client and time utilities.
- Line 4: Initialize a client for writing time series data.
- Line 5-7: Build a TimeSeries with a custom metric type and a generic resource.
- Line 9-11: Create a single data point (error_rate = 0.01) with the current timestamp.
- Line 13: Send the time series to Cloud Monitoring for visualization and alerting.
- This enables visibility of chaos experiments in Cloud Monitoring dashboards and alerts.

---

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Running chaos in prod without isolation
  - Bad:

```yaml
# bad: chaos meant for prod
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-prod
  namespace: default
spec:
  action: pod-kill
  mode: all
  selector:
    namespaces: ["production"]
    labelSelectors:
      app: payment
  duration: "30s"
```

  - Good:

```yaml
# good: use a dedicated chaos-testing namespace and a minimal blast radius
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-chaos-testing
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: ["chaos-testing"]
    labelSelectors:
      app: payment
  duration: "30s"
```

- Mistake 2: Not isolating test workloads (no labels or selectors)
  - Bad:

```yaml
# bad: very broad target
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: latency-unsafe
spec:
  action: delay
  duration: "20s"
  latency: "100ms"
  mode: one
  selector: {}
```

  - Good:

```yaml
# good: constrain with labels to minimize blast radius
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: latency-safe
  namespace: chaos-testing
spec:
  action: delay
  mode: one
  duration: "20s"
  latency: "100ms"
  direction: bidirectional
  selector:
    namespaces: ["chaos-testing"]
    labelSelectors:
      app: web
```

- Mistake 3: Ignoring observability and rollback
  - Bad:

```yaml
# bad: no metrics or rollback plan
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-no-telemetry
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: ["chaos-testing"]
    labelSelectors:
      app: web
  duration: "30s"
```

  - Good:

```yaml
# good: includes telemetry hooks and a clear rollback/retreat strategy
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-telemetry
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: ["chaos-testing"]
    labelSelectors:
      app: web
  duration: "30s"
---
# Additionally, emit a metric or log entry on start/complete
```

- Mistake 4: Skipping clean-up and postmortem
  - Bad: Stop after the experiment; no record
  - Good: Automatically annotate incident with a postmortem entry in a shared knowledge base, and clear all Chaos Mesh experiments after validation.

- Mistake 5: Misconfiguring credentials or IAM
  - Bad: Running chaos with overly broad IAM roles
  - Good: Follow least-privilege principle; bind Chaos Mesh controller/service account with only necessary permissions to inspect resources and emit telemetry.

---

## 5. Why This Matters In Real Systems — production context and real usage

- Reliability is a feature, not a one-off test. Chaos engineering helps you validate SLOs, error budgets, and the readiness of your incident response teams.
- In Google Cloud, chaos testing ties directly into Cloud Monitoring dashboards, alert policies, and centralized logging. This enables rapid detection of degraded service, fast blast-radius reduction, and faster remediation.
- Safe chaos with guardrails (namespaces, labels, duration, and review steps) reduces risk while still surfacing critical failure modes.
- By exercising circuit breakers, rate limiters, and graceful degradation in code, you prevent cascading failures that would otherwise propagate through downstream services.
- Post-incident reviews (postmortems) become data-driven — you can measure whether errors reduced in production after implementing fixes found via chaos experiments.

---

## 6. Study Questions — 5 recall questions

1) What is the primary goal of chaos engineering in a production-like environment?
2) How do SLOs and error budgets influence the scope of chaos experiments?
3) Name two common chaos experiments you can run in Chaos Mesh on Kubernetes.
4) Why is namespace isolation and blast radius important when running chaos experiments?
5) How can Cloud Monitoring be used to observe the outcomes of a chaos experiment?

---

## 7. Exercise — Practical multi-part coding challenge

Part A: Prepare a safe chaos-testing environment in GKE

- Create a GKE cluster (region with minimal nodes for cost control).
- Enable Kubernetes RBAC and install Chaos Mesh.
- Create a dedicated namespace chaos-testing and a simple service/app in that namespace.

Deliverables:
- A kubeconfig-enabled cluster manifest
- A deployed web app (as in Section 2)

Part B: Run a basic PodChaos experiment and observe results

- Define a PodChaos that kills one web pod for 30 seconds.
- Ensure the chaos is scoped to chaos-testing with the label app=web.
- Observe the app via Cloud Monitoring (custom metric or logs) and verify a brief spike in latency or a transient 2–3 pod loss is visible in the metrics.

Deliverables:
- PodChaos manifest
- Observability notes (screenshots or CLI outputs showing pod status and latency data)

Part C: Add a NetworkChaos experiment and a Circuit Breaker in code

- Define a NetworkChaos to inject 100ms latency for 15 seconds, bidirectionally.
- Implement a Python microservice (inventory-aware) using a circuit breaker to gracefully degrade if inventory service is slow or unavailable (see breaker.py sample).

Deliverables:
- NetworkChaos manifest
- breaker.py script
- A short write-up on how the circuit breaker behavior changes under chaos conditions

Part D: Instrument and alert on production-like environment (safe testbed)

- Create a simple Cloud Monitoring alert policy that triggers if error_rate exceeds a threshold for 5 minutes.
- Push a synthetic error rate metric from your app (push_metrics.py) during a chaos run, verify the alert triggers, and observe notification channels.

Deliverables:
- A Terraform or gcloud-based alert policy (or a JSON/YAML snippet)
- push_metrics.py run results showing the metric value in Cloud Monitoring
- A short incident reference note with actions to take when the alert fires

Part E: Post-chaos learning artifact

- Write a short postmortem-style summary describing:
  - The fault scenario tested (CPU pressure, latency, or pod kill)
  - The observed system behavior and any deviations from expected outcomes
  - The actions taken to remediate or improve robustness
  - The changes implemented (e.g., code changes, config updates, or added guardrails)

Optional extensions:
- Integrate Chaos Mesh with a CI/CD pipeline (Cloud Build) to run a repeatable reliability test on merge.
- Expand tests to include CPU stress tests (StressChaos) and database failover.

Notes for instructors/trainers
- Start with a safe staging environment and a clean blast-radius policy.
- Ensure you have a rollback plan and an opt-out mechanism for any experiment.
- Encourage the team to document postmortems and track improvements in SLOs and error budgets after experiments.

If you want, I can tailor the exercise to your specific Google Cloud setup (GKE version, project structure, and preferred tooling) or generate a ready-to-run repository scaffold with all manifests and scripts.