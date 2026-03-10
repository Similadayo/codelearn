# SRE Principles & Golden Signals in Kubernetes

Phase 5: SRE & Reliability — Topic: SRE Principles & Golden Signals in a Kubernetes Platform. This lesson connects core SRE concepts (SLOs, error budgets, toil, and the golden signals) to practical reliability practices in a Kubernetes environment. You’ll learn how to express reliability targets, observe system health through latency, traffic, errors, and saturation, and translate those signals into concrete alerts, autoscaling decisions, and runbooks that keep services reliable at scale.

## 1. SRE Principles Primer for Kubernetes

SRE hinges on defining objectives that reflect user impact, measuring reliability with objective signals, and using automation to reduce toil. In Kubernetes, these ideas map to SLOs over services, error budgets to manage release velocity, and golden signals embedded into monitoring, alerting, and autoscaling. The goal is to align engineering effort with user-visible reliability, while enabling safe and rapid change.

```yaml
# sre-config.yaml
# A lightweight, human-readable representation of SRE targets for a Kubernetes service.
service: user-service
slo:
  # The objective is the target success rate (availability).
  objective: 0.999      # 99.9% availability
  window: 30d             # evaluation window
  error_budget: 0.001     # 0.1% permissible failure over the window
  latency:
    p95_ms: 250           # P95 latency target in milliseconds
alerts:
  - name: UserService_SLO_Violation
    for: 10m
    severity: critical
    expression: >
      (sum(rate(http_requests_total{service="user-service", status!~"2.."}[5m]))
       / sum(rate(http_requests_total{service="user-service"}[5m]))) > 0.001
    annotations:
      summary: "User-service SLO violation: error rate exceeded or latency degraded"
      description: "The error fraction of requests to user-service has exceeded the SLO window or p95 latency surpassed the target."
```

### Line-by-line explanation breaking down each line

- # sre-config.yaml
  - This is a YAML configuration file naming and describing the SRE targets for the service.
- service: user-service
  - Identifies the service for which the SRE targets apply.
- slo:
  - Starts the SLO section that captures reliability objectives.
- objective: 0.999
  - The target success rate or availability (99.9%). This is the primary reliability objective.
- window: 30d
  - The evaluation window over which the SLO is assessed. Helps smooth short-term variability.
- error_budget: 0.001
  - The allowed fraction of failures within the window (0.1%). Used to balance reliability vs. release velocity.
- latency:
  - Latency-related constraint grouping within the SLO.
- p95_ms: 250
  - Target 95th percentile latency in milliseconds; if p95 exceeds 250 ms, the SLO edge may be at risk.
- alerts:
  - A list of alerting rules tied to the SLO and its health signals.
- - name: UserService_SLO_Violation
  - Identifier for the alert rule.
- for: 10m
  - Require the condition to be true for at least 10 minutes before triggering, reducing alert flapping.
- severity: critical
  - Severity label used by on-call tooling and runbooks.
- expression: >
  - The PromQL expression that evaluates the alert condition. We check both error rate and the presence of non-2xx responses over a 5-minute window.
- (sum(rate(http_requests_total{service="user-service", status!~"2.."}[5m]))
  / sum(rate(http_requests_total{service="user-service"}[5m]))) > 0.001
  - Compute the fraction of failed (non-2xx) requests in the last 5 minutes and compare to a tiny threshold (this is schematic; in practice you’d separate error budget burn from latency checks).
- annotations:
  - Human-readable notes for the alert.
- summary:
  - Short summary for dashboards and notifications.
- description:
  - More detailed explanation, linking to runbooks or postmortems.

## 2. The Golden Signals in a Kubernetes Platform

The four golden signals help you capture the most impactful indicators of reliability: latency (how long requests take), traffic (how much is happening), errors (how many fail), and saturation (how close you are to resource limits). In Kubernetes, you typically observe these via Prometheus metrics from your app and cluster, define alerts, and drive automation (scaling, healing, and runbooks) from them.

### 2.1 Golden Signals: Prometheus alert rules (example)

```yaml
# golden_signals.rules.yaml
groups:
  - name: golden_signals
    rules:
      - alert: UserService_HighLatency_P95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="user-service"}[5m])) by (le)) > 0.25
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "User-service p95 latency exceeds target ( > 250ms )"
          description: "The p95 latency for user-service requests is above the 250ms target for > 5 minutes."
      - alert: UserService_LowTraffic
        expr: sum(rate(http_requests_total{service="user-service"}[5m])) < 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "User-service traffic dropped below threshold"
          description: "Low request rate could indicate upstream issues or scaling problems."
      - alert: UserService_HighErrorRate
        expr: sum(rate(http_requests_total{service="user-service", status=~"(4|5).."}[5m])) / sum(rate(http_requests_total{service="user-service"}[5m])) > 0.02
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on user-service"
          description: "More than 2% of requests are failing (4xx/5xx) in the last 5 minutes."
      - alert: UserService_Saturation
        expr: avg(rate(container_cpu_usage_seconds_total{container_label_io_kubernetes_pod_name=~".*"}[5m])) > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CPU saturation on pods backing user-service"
          description: "Average CPU utilization exceeds 80% for more than 5 minutes."
```

### Line-by-line explanation breaking down each line

- # golden_signals.rules.yaml
  - Filename and purpose; this is a PrometheusRule-like structure for alerting.
- groups:
  - A list of rule groups; helps organize rules by topic or service.
- - name: golden_signals
  - Identifier for this group of rules.
- rules:
  - A list of individual alert rules within the group.
- - alert: UserService_HighLatency_P95
  - Human-readable alert name for latency issues.
- expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="user-service"}[5m])) by (le)) > 0.25
  - PromQL: compute p95 latency from a histogram of request durations and alert if it exceeds 0.25 seconds.
- for: 5m
  - The condition must hold for 5 minutes before firing.
- labels:
  - Metadata for routing and severity in notifications.
- severity: critical
- annotations:
  - Additional details for humans reviewing the alert.
- summary:
  - Short description.
- description:
  - Expanded description with context.
- - alert: UserService_LowTraffic
  - Latency is not the only signal; Traffic can drop and indicate issues upstream or required scaling.
- expr: sum(rate(http_requests_total{service="user-service"}[5m])) < 10
  - Simple check: traffic is below 10 requests per second.
- for: 10m
  - Hold 10 minutes to avoid flapping.
- - alert: UserService_HighErrorRate
  - Alerts when error rate crosses a threshold.
- expr: sum(rate(http_requests_total{service="user-service", status=~"(4|5).."}[5m])) / sum(rate(http_requests_total{service="user-service"}[5m])) > 0.02
  - Error rate > 2% over last 5 minutes.
- - alert: UserService_Saturation
  - Saturation alert for CPU pressure on pods backing the service.
- expr: avg(rate(container_cpu_usage_seconds_total{container_label_io_kubernetes_pod_name=~".*"}[5m])) > 0.8
  - CPU usage above 80% average over 5 minutes.
- The remaining lines set labels and human-readable annotations to help operators triage.

### 2.2 Golden signals: Kubernetes-ready instrumentation (Deployment + Service)

```yaml
# user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  labels:
    app: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: ghcr.io/example/user-service:latest
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          env:
            - name: METRICS_ENDPOINT
              value: /metrics
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"

---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### Line-by-line explanation breaking down each line

- # user-service-deployment.yaml
  - A multi-resource YAML containing the Deployment and the Service for the user-service.
- apiVersion: apps/v1
  - Kubernetes API version for deployments.
- kind: Deployment
  - Declares a Deployment resource to manage a set of pods.
- metadata:
  - Metadata about the resource.
- name: user-service
  - The name of the deployment.
- labels:
  - Attach labels for selection and organization.
- spec:
  - The desired state specification of the deployment.
- replicas: 3
  - Run three pod replicas for availability and load distribution.
- selector:
  - How the deployment identifies pods it manages.
- matchLabels:
  - The label that must be present on pods to be managed by this deployment.
- template:
  - Pod template describing the desired pods.
- containers:
  - Container specs for the pod.
- name: user-service
  - Container name.
- image: ghcr.io/example/user-service:latest
  - Container image to run.
- ports:
  - Expose container port 8080.
- readinessProbe:
  - Kubernetes readiness probe; the service must pass health checks to receive traffic.
- httpGet:
  - Readiness check uses an HTTP GET.
- path: /healthz
  - Endpoint used to determine readiness.
- initialDelaySeconds: 5
  - Time to wait before starting readiness checks.
- periodSeconds: 10
  - Interval between readiness checks.
- livenessProbe:
  - Liveness probe to detect and recover failed containers.
- httpGet:
  - Liveness check uses an HTTP GET.
- initialDelaySeconds: 15
  - Delay before starting liveness checks.
- periodSeconds: 20
  - Interval for liveness checks.
- env:
  - Environment variable to indicate metrics endpoint.
- METRICS_ENDPOINT: /metrics
  - Suggests the app exposes Prometheus metrics at /metrics.
- resources:
  - Resource requests and limits for the container helps with saturation budgeting.
- requests:
  - Resource requests for scheduling and QoS.
- cpu: "100m"
  - 100 milliCPU requested.
- memory: "128Mi"
  - 128 MiB memory requested.
- limits:
  - Hard caps to prevent runaway usage.
- cpu: "500m"
  - 500 milliCPU limit.
- memory: "512Mi"
  - 512 MiB memory limit.
- ---
- apiVersion: v1
  - Kubernetes core API version for a Service.
- kind: Service
  - Declares a Kubernetes Service to expose the pods.
- metadata:
  - Metadata for the Service.
- name: user-service
  - Service name.
- spec:
  - Service spec.
- selector:
  - How the Service selects the pods to route traffic to.
- app: user-service
  - Label selector matching the deployment.
- ports:
  - Exposed ports for the Service.
- port: 80
  - Service port exposed inside the cluster.
- targetPort: 8080
  - Port on the Pod/container to which traffic is directed.
- type: ClusterIP
  - Internal Kubernetes service type; not exposed externally by default.

### 2.3 Golden signals: Horizontal Pod Autoscaler example (CPU-based)

```yaml
# user-service-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

### Line-by-line explanation breaking down each line

- # user-service-hpa.yaml
  - HPA configuration for autoscaling the user-service Deployment.
- apiVersion: autoscaling/v2
  - API version for the autoscaler (v2 supports multiple metric types).
- kind: HorizontalPodAutoscaler
  - Resource that automatically scales pods based on metrics.
- metadata:
  - Metadata about the HPA resource.
- name: user-service-hpa
  - Name of the HPA.
- spec:
  - Desired behavior spec for autoscaling.
- scaleTargetRef:
  - The target to scale (the Deployment in this case).
- apiVersion: apps/v1
  - The API version of the target Deployment.
- kind: Deployment
  - Target kind.
- name: user-service
  - Target Deployment name.
- minReplicas: 3
  - Minimum number of replicas to maintain.
- maxReplicas: 10
  - Upper bound for replicas to prevent over-provisioning.
- metrics:
  - The list of metrics used to drive scaling.
- - type: Resource
  - A resource-based metric (CPU, memory, etc.).
- resource:
  - Details of the resource metric.
- name: cpu
  - The resource to monitor (CPU usage).
- target:
  - The target policy for scaling.
- type: Utilization
  - The target is based on utilization percentage.
- averageUtilization: 60
  - Target average CPU utilization across pods (60%).

##  X. Common Beginner Mistakes

Below are real pitfalls with bad vs good code examples, focused on SRE primitives and golden signals in Kubernetes. The bad snippets illustrate typical misconfigurations; the good snippets show corrected approaches.

- Pitfall 1: No way to reflect SLOs or alert rules in code; hard to explain or forget to update them.
  Bad:
  ```yaml
  # No explicit SLOs or alert thresholds
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: dummy-config
  data:
    note: "SLOs defined elsewhere"
  ```
  Good:
  ```yaml
  # SLO and alert manifest explicitly defined
  apiVersion: config.sre/v1
  kind: SLOConfig
  metadata:
    name: user-service-slo
  spec:
    service: user-service
    objective: 0.999
    window: 30d
    latency:
      p95_ms: 250
    alerting:
      - name: UserService_SLO_Violation
        for: 10m
        severity: critical
        expression: >
          (sum(rate(http_requests_total{service="user-service", status!~"2.."}[5m]))
           / sum(rate(http_requests_total{service="user-service"}[5m]))) > 0.001
  ```

- Pitfall 2: No by-label grouping in PromQL; alerts become globally noisy and hoard attention.
  Bad:
  ```yaml
  # Global alert on total latency, no service scope
  expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  ```
  Good:
  ```yaml
  # Scoped by service and instance
  expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="user-service"}[5m])) by (le)) > 0.25
  for: 5m
  labels: { service: "user-service" }
  ```

- Pitfall 3: Not using readiness/liveness probes or using them incorrectly; can cause flaky traffic routing and false negatives.
  Bad:
  ```yaml
  readinessProbe: {}
  livenessProbe: {}
  ```
  Good:
  ```yaml
  readinessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 10
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 15
    periodSeconds: 20
  ```

- Pitfall 4: Ignoring saturation signals; focusing only on latency or error rate.
  Bad:
  ```yaml
  # Only latency alert; no saturation or resource checks
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m])) > 0.3
  ```
  Good:
  ```yaml
  # Latency plus saturation signals
  - alert: HighLatency
    expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="user-service"}[5m])) by (le)) > 0.25
    for: 5m
  - alert: HighCpuUsage
    expr: avg(rate(container_cpu_usage_seconds_total{container="user-service"}[5m])) > 0.8
    for: 5m
  ```

- Pitfall 5: Not providing actionable runbooks or downstream routing in alerts.
  Bad:
  ```yaml
  annotations:
    summary: "Error in user-service"
  ```
  Good:
  ```yaml
  annotations:
    summary: "Error in user-service: high error rate"
    description: "Investigate upstream dependencies, circuit-breakers, and recent deploys. Runbook: /docs/runbooks/user-service.md"
  ```

## Y. Why This Matters In Real Systems

In production, SRE principles and Golden Signals translate to fewer outages, faster MTTR, and safer release velocity. SLOs tie engineering effort to user impact, while error budgets govern how aggressively you push changes (feature flags, canary deployments) without compromising reliability. Golden Signals provide a common vocabulary that operators, developers, and platform teams use to observe, reason about, and act on health. In Kubernetes, this means:

- Designing services with explicit SLOs and error budgets to balance reliability and velocity.
- Instrumenting services with Prometheus metrics, exposing /metrics endpoints, and annotating metrics with service and instance labels for precise observability.
- Implementing readiness and liveness probes to protect traffic from unhealthy pods and to automate healing.
- Using autoscaling (HPA) to adapt to load while respecting saturation signals (CPU/memory utilization) to prevent resource exhaustion.
- Building alerting rules that are actionable, reduced to a manageable set, and integrated with runbooks and on-call processes.
- Incorporating postmortems and continuous improvement loops to reflect learnings in SLO updates and alert tuning.

In short: the four signals help you detect user-impacting problems early, the SLOs guide decision-making in releases, and Kubernetes primitives automate resilience so teams can move faster without sacrificing reliability.

## Z. Study Questions

1) What are the four golden signals, and why are they important in a Kubernetes environment?
2) How do you compute p95 latency from a Prometheus histogram, and how can you alert on it?
3) What is an error budget and how does it influence release velocity and incident response?
4) Why are readiness and liveness probes essential for reliability in Kubernetes?
5) How can you avoid alert fatigue when designing Prometheus rules for SRE-driven operations?

## Exercise

Part 1 — Build a minimal Prometheus-instrumented service (Node.js) and expose metrics

- Part A: Create a small Node.js app that exposes /healthz and /metrics using prom-client.
  Code: server.js
  ```javascript
  // server.js
  const express = require('express');
  const client = require('prom-client');
  const app = express();

  // Enable default metrics collection (Go process metrics, GC, etc.)
  client.collectDefaultMetrics();

  // Custom metrics example (optional)
  const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['service', 'status']
  });

  app.use((req, res, next) => {
    res.on('finish', () => {
      httpRequestTotal.inc({ service: 'user-service', status: res.statusCode });
    });
    next();
  });

  app.get('/healthz', (req, res) => res.status(200).send('OK'));

  // Expose metrics at /metrics
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Simple endpoint to simulate latency
  app.get('/hello', (req, res) => {
    const delay = Math.floor(Math.random() * 200) + 50; // 50-250ms
    setTimeout(() => res.send('hello'), delay);
  });

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`User service listening on port ${port}`);
  });
  ```
- Part B: Dockerfile to containerize the app
  ```dockerfile
  # Dockerfile
  FROM node:18-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm install
  COPY . .
  EXPOSE 8080
  CMD ["node", "server.js"]
  ```
- Part C: Kubernetes manifest for Deployment and Service
  ```yaml
  # user-service-deployment.yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: user-service
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: user-service
    template:
      metadata:
        labels:
          app: user-service
      spec:
        containers:
          - name: user-service
            image: your-registry/user-service:latest
            ports:
              - containerPort: 8080
            readinessProbe:
              httpGet:
                path: /healthz
                port: 8080
              initialDelaySeconds: 5
              periodSeconds: 10
            livenessProbe:
              httpGet:
                path: /healthz
                port: 8080
              initialDelaySeconds: 15
              periodSeconds: 20
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: user-service
  spec:
    selector:
      app: user-service
    ports:
      - port: 80
        targetPort: 8080
        protocol: TCP
  ```
- Part D: PrometheusRule for golden signals
  ```yaml
  # user-service-golden-signals.yaml
  apiVersion: monitoring.coreos.com/v1
  kind: PrometheusRule
  metadata:
    name: user-service-golden-signals
  spec:
    groups:
      - name: user-service
        rules:
          - alert: UserService_HighLatency_P95
            expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="user-service"}[5m])) by (le)) > 0.25
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "User-service p95 latency exceeds target"
              description: "p95 latency > 250ms for 5 minutes."
          - alert: UserService_HighErrorRate
            expr: sum(rate(http_requests_total{service="user-service", status=~"(4|5).."}[5m])) / sum(rate(http_requests_total{service="user-service"}[5m])) > 0.02
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "High error rate on user-service"
              description: "Error rate > 2% for 5 minutes."
  ```
- Part E: Load test script (optional)
  ```bash
  # load_test.sh
  # Simple load test using curl to simulate traffic to the service
  TARGET=${TARGET:-http://<k8s-service-ip-or-host>/hello}
  DURATION=${DURATION:-60} # seconds
  RATE=${RATE:-50}        # requests per second
  END=$((SECONDS + DURATION))
  while [ $SECONDS -lt $END ]; do
    for i in $(seq 1 $RATE); do
      curl -s "$TARGET" >/dev/null &
    done
    wait
  done
  ```
Part 2 — Deploy and observe (high-level steps)
- Build and push the Docker image for the user-service.
- Apply the Kubernetes manifests (Deployment, Service).
- Apply the PrometheusRule for golden signals.
- Ensure Prometheus is scraping the /metrics endpoint of the service.
- Run the load_test.sh script to generate traffic and observe p95 latency, error rate, and saturation indicators in a Grafana dashboard or Prometheus expression browser.
- Use the alert rules to verify you receive alerts when the golden signals cross thresholds and practice triage with runbooks.

Note: In production, you would integrate these configurations with your GitOps workflow, ensure proper RBAC for Prometheus, and wire alerts into your incident management system (e.g., PagerDuty, Opsgenie). The exercise aims to give you tangible, hands-on familiarity with SRE concepts, Prometheus-based signaling, and Kubernetes readiness for reliability in real systems.