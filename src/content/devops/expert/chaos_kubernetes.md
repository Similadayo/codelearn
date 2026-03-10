# Chaos Engineering & Reliability in Kubernetes

Chaos engineering is a disciplined approach to building resilient systems by deliberately injecting failures and observing how the system responds. In a Kubernetes-driven DevOps and Cloud Engineering context, chaos testing helps you uncover hidden reliability gaps, validate incident response, and improve MTTR (mean time to recovery). This lesson shows practical, Kubernetes-centric ways to design, run, observe, and bake chaos into your reliability practices.

## 1. Chaos Engineering Fundamentals in Kubernetes

In Kubernetes, reliability starts with designing for failures at multiple layers: pods, nodes, networking, and external dependencies. Chaos experiments simulate these failures in a controlled manner to verify that automatic recovery, retries, load balancing, and health checks work as intended.

Code: Pod-level fault injection (pod-kill)
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: web
```
### Line-by-line explanation
- apiVersion: chaos-mesh.org/v1alpha1 — Declares the Chaos Mesh CRD API version used to create chaos experiments.
- kind: PodChaos — The type of chaos experiment; this one targets pod-level faults.
- metadata.name: pod-kill-example — Unique name for this chaos object.
- spec.action: pod-kill — The action to perform; kills a container/pod.
- spec.mode: one — Target exactly one matching pod for the action.
- spec.selector.namespaces: - default — Scope to the default namespace.
- spec.selector.labelSelectors.app: web — Only pods with label app=web are considered.

Code: Network delay/fault injection
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: net-delay-example
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: web
  direction: both
  duration: "10s"
  delay:
    latency: "150ms"
    jitter: "50ms"
```
### Line-by-line explanation
- apiVersion: chaos-mesh.org/v1alpha1 — Chaos Mesh API for network-level faults.
- kind: NetworkChaos — The chaos type affecting network conditions.
- metadata.name: net-delay-example — Unique name for this network fault.
- spec.action: delay — The network fault to inject (delay).
- spec.mode: one — Apply to one matching pod.
- spec.selector.namespaces: - default — Target namespace.
- spec.selector.labelSelectors.app: web — Pods with app=web are selected.
- spec.direction: both — Apply to both directions (inbound/outbound).
- spec.duration: "10s" — How long the fault lasts.
- spec.delay.latency: "150ms" — Base added latency.
- spec.delay.jitter: "50ms" — Random jitter added on top of latency.

### Line-by-line explanation
- The PodChaos and NetworkChaos examples demonstrate two core chaos primitives: killing a pod to test restart behavior, and delaying network traffic to observe timeouts and retries. The selectors ensure safe scoping to a specific workload, reducing blast radius.

## 2. Safe Chaos Practices and Observability

Chaos is about controlled, safe experiments. Use guardrails to protect production services while still learning about resilience.

Code: PodDisruptionBudget (PDB) to cap disruption
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web
```
### Line-by-line explanation
- apiVersion: policy/v1 — Kubernetes policy API for disruption budgets.
- kind: PodDisruptionBudget — Resource that constrains voluntary disruptions.
- metadata.name: web-pdb — Unique budget name.
- spec.minAvailable: 2 — Requires at least 2 pods to be available during disruptions.
- spec.selector.matchLabels.app: web — Applies only to pods labeled app=web.

Code: Deployment with readiness and liveness probes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
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
        image: nginx:latest
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 15
```
### Line-by-line explanation
- apiVersion, kind, metadata: standard Kubernetes Deployment spec for a web service.
- spec.replicas: 3 — Run 3 pods for load distribution.
- spec.template.metadata.labels: app: web — Label for selectors.
- containers[].name/image/ports — Container details; runs nginx.
- readinessProbe: ensures a pod is ready to serve traffic after a short delay.
- livenessProbe: periodically checks health; if failed, Kubernetes restarts the container.

Why this matters: readiness and liveness checks let chaos experiments know when a pod is healthy; PDB enforces safe disruption limits during chaos.

## 3. Setting Up Chaos Mesh in Kubernetes

Before you can run chaos experiments in Kubernetes, install a chaos engine (Chaos Mesh) and enable the dashboard/metrics as needed.

Code: Installing Chaos Mesh (basic)
```bash
# Add the Chaos Mesh Helm repository
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Create a dedicated namespace for Chaos Mesh
kubectl create namespace chaos-testing

# Install Chaos Mesh in the dedicated namespace
helm install chaos-mesh chaos-mesh/chaos-mesh --namespace chaos-testing
```
### Line-by-line explanation
- helm repo add chaos-mesh … — Adds the Chaos Mesh chart repository.
- helm repo update — Fetches the latest index of charts.
- kubectl create namespace chaos-testing — Isolates Chaos Mesh resources from other workloads.
- helm install chaos-mesh chaos-mesh/chaos-mesh --namespace chaos-testing — Deploys Chaos Mesh into the cluster.

Code: Verify installation and basic components
```bash
kubectl get pods -n chaos-testing
kubectl get crd | grep chaosmesh
```
### Line-by-line explanation
- kubectl get pods -n chaos-testing — Lists Chaos Mesh components to confirm they’re running.
- kubectl get crd | grep chaosmesh — Verifies that Chaos Mesh CRDs are registered in the cluster.

## 4. Observability and Reliability Metrics

Good chaos practice pairs experiments with observable signals: metrics, logs, and alerts that reveal how the system behaves under fault conditions.

Code: PrometheusRule for reliability alerts
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: chaos-reliability-alerts
  namespace: chaos-testing
spec:
  groups:
  - name: chaos.reliability
    rules:
    - alert: PodRestartRateHigh
      expr: rate(kube_pod_container_status_restarts_total{container!=\"POD\"}[5m]) > 0.2
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "High pod restart rate observed"
        description: "Container restarts rate exceeded 0.2 per second over the last 5 minutes."
```
### Line-by-line explanation
- apiVersion/kind/metadata.namespace — Setup for a PrometheusRule in the cluster.
- spec.groups/name — Organizes related alert rules.
- rule: PodRestartRateHigh — The alert name.
- expr: rate(kube_pod_container_status_restarts_total[5m]) > 0.2 — Threshold: restart rate over 5 minutes.
- for: 10m — Alert must persist for 10 minutes before firing.
- labels/annotations — Metadata for routing and human-friendly descriptions.

How this matters in production: You can tie chaos experiments to observable signals (alerts, dashboards) to validate SLOs and trigger runbooks automatically when reliability degrades.

## 5. Integrating Chaos into CI/CD and Runbooks

Operationalizing chaos means adding it to pipelines, change management, and incident playbooks. Use environment scoping, approvals, and automatic cleanup of chaos resources.

Code: Simple CI/CD integration example (GitHub Actions)
```yaml
name: Chaos Test
on:
  workflow_dispatch:
jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
    - name: Set up kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'
        kubeconfig: ${{ secrets.KUBECONFIG }}
    - name: Apply Chaos
      run: kubectl apply -f chaos/pod-kill.yaml
    - name: Wait for chaos to finish
      run: kubectl wait --for=condition=Ready pod -l app=web --timeout=60s
    - name: Cleanup Chaos
      run: kubectl delete -f chaos/pod-kill.yaml
```
### Line-by-line explanation
- workflow_dispatch trigger — Manual trigger to run chaos in a controlled way.
- Set up kubectl — Authenticates to the Kubernetes cluster used in the CI environment.
- Apply Chaos — Applies a chaos manifest (e.g., PodChaos) to trigger a fault.
- Wait for chaos to finish — Simple synchronization to observe the outcome.
- Cleanup Chaos — Removes chaos resources to restore normal state.

Y. Why This Matters In Real Systems

- Reduces blast radius: Confines disruption to well-defined namespaces and selectors, protecting production services.
- Validates recovery patterns: Verifies health checks, readiness gating, mimicry of real incidents, and automatic recovery paths.
- Improves incident response: Observability, logging, and metrics collected during chaos inform runbooks and on-call rituals.
- Supports SRE objectives: Helps meet reliability targets by actively testing failure modes, MTTR, and resilience of dependencies.
- Enables safe experimentation culture: Encourages experimentation in controlled ways, with guardrails and reproducible results.

X. Common Beginner Mistakes

- Bad: Chaos can spread across all pods unintentionally.
  Good: Scope chaos narrowly and safely.
  Bad:
  ```yaml
  apiVersion: chaos-mesh.org/v1alpha1
  kind: PodChaos
  metadata:
    name: pod-kill-all
  spec:
    action: pod-kill
    mode: all
    selector:
      labels:
        app: web
  ```
  Good:
  ```yaml
  apiVersion: chaos-mesh.org/v1alpha1
  kind: PodChaos
  metadata:
    name: pod-kill-one
  spec:
    action: pod-kill
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: web
  ```

- Bad: No disruption budget or safety checks.
  Good: Use PodDisruptionBudget to cap disruptions.
  Bad:
  ```yaml
  apiVersion: chaos-mesh.org/v1alpha1
  kind: PodChaos
  metadata:
    name: chaos-no-pdb
  spec:
    action: pod-kill
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: web
  ```
  Good:
  ```yaml
  apiVersion: policy/v1
  kind: PodDisruptionBudget
  metadata:
    name: web-pdb
  spec:
    minAvailable: 2
    selector:
      matchLabels:
        app: web
  ```

- Bad: No observability or logging during chaos.
  Good: Attach metrics, logs, and alerts.
  Bad:
  ```yaml
  apiVersion: chaos-mesh.org/v1alpha1
  kind: NetworkChaos
  metadata:
    name: nothing-observed
  spec:
    action: delay
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: web
    delay:
      latency: "100ms"
  ```
  Good:
  ```yaml
  apiVersion: chaos-mesh.org/v1alpha1
  kind: NetworkChaos
  metadata:
    name: net-delay-example
  spec:
    action: delay
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: web
    delay:
      latency: "100ms"
  ```
  Add Prometheus rules and dashboards to observe impact.

- Bad: Chaos runs directly in production without a runbook or approvals.
  Good: Use a formal runbook, approvals, and a non-prod or isolated namespace for initial testing.

- Bad: Cleanup is forgotten; chaos resources linger and drift.
  Good: Explicit cleanup steps after each run and automated cleanup in CI/CD.

Z. Study Questions

1) What is the purpose of PodChaos and NetworkChaos in a Kubernetes cluster?
2) How does a PodDisruptionBudget contribute to safe chaos testing?
3) Why are readiness and liveness probes important when performing chaos experiments?
4) What signals would you monitor to determine if a chaos experiment improved resilience?
5) Provide a brief outline for integrating chaos testing into a CI/CD pipeline.

Exercise

Part A: Prepare a small service and test its resilience

- Step 1: Create a 3-replica web Deployment with readiness and liveness probes (as in Section 2).
- Step 2: Apply a PodDisruptionBudget with minAvailable: 2 for the web app.
- Step 3: Install Chaos Mesh in a dedicated namespace (as in Section 3).
- Step 4: Create a PodChaos manifest to kill one web pod at a time (as in Section 1).
- Step 5: Apply the chaos manifest and observe:
  - The disruption impact on traffic (via readiness probes and metrics).
  - The PodDisruptionBudget behavior (that at least 2 pods remain available).
  - Logs and alerts from your PrometheusRule during the experiment.
- Step 6: Clean up chaos resources and verify the system returns to steady state.

Deliverables
- deployment.yaml
- pdb.yaml
- chaos/pod-kill.yaml
- prometheus-rule.yaml
- A short write-up describing observed behavior: how the system recovered, which components reacted first, and how alerting behaved.

Optional extension
- Add a NetworkChaos (delay) to simulate latency between services, and observe how circuit breakers or retries mitigate impact.
- Add a CronChaos (if you’re comfortable with Chaos Mesh CronChaos) to schedule regular, controlled chaos for ongoing resilience validation.

Notes for instructors
- Emphasize scope discipline and runbook adherence.
- Encourage pairing chaos experiments with concrete SLO/SLA targets and dashboards.
- Encourage safe escalation and rollback strategies, especially when chaos is introduced to any shared or production-like environment.