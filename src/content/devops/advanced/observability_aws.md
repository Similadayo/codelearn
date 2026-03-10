# Observability in Kubernetes: Prometheus, Grafana, and ELK on AWS

Observability is the practice of understanding a system's health, performance, and behavior by collecting, analyzing, and visualizing metrics, logs, and traces. In Kubernetes on AWS, we typically rely on Prometheus for metrics, Grafana for dashboards, and the ELK stack (Elasticsearch, Logstash, Kibana) for logs. Together, they help SREs detect incidents, diagnose root causes faster, set reliable SLOs, and continuously improve system reliability in production-scale environments.

## 1. Observability fundamentals in AWS Kubernetes

- What you gather: 
  - Metrics: pod/container/resource usage, kube-state metrics, cluster health
  - Logs: application and system logs from containers and nodes
  - (Optional) Traces: distributed traces for request flows (OpenTelemetry, Jaeger, etc.)
- How you gather it:
  - Metrics: pull-based scrapes by Prometheus
  - Logs: ship logs to a centralized store (ELK) or cloud-native service
- Why it matters in production:
  - Proactive alerting, performance tuning, capacity planning, incident response, and auditability

Note: In AWS, you typically run this in EKS (Elastic Kubernetes Service) and optionally store long-term logs in S3 or use Elasticsearch on Kubernetes (ELK) for indexing/searchability. You should consider security (RBAC), namespace scoping, TLS, and cost controls when deploying observability tooling.

---

## 2. ## 1. Deploy Prometheus and Grafana in Kubernetes on AWS (EKS)

This section covers a practical way to deploy a full Prometheus + Grafana stack using the kube-prometheus-stack Helm chart. It includes creating a namespace, installing the stack, and exposing Grafana for access.

```bash
# 2.1. Add Helm repositories for Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Line-by-line explanation
- Add the Prometheus community charts to Helm so we can install kube-prometheus-stack (which includes Prometheus and Alertmanager).
- Add Grafana's official charts for dashboard visualization (Grafana is also included in kube-prometheus-stack, but we can customize exposure).

```bash
# 2.2. Create a dedicated namespace for observability
kubectl create ns observability
```

### Line-by-line explanation
- Creates an isolated Kubernetes namespace to keep all observability components organized and RBAC-scoped.

```bash
# 2.3. Install kube-prometheus-stack (Prometheus + Alertmanager + Grafana)
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace observability \
  --set grafana.enabled=true \
  --set grafana.service.type=LoadBalancer \
  --set prometheus.prometheusSpec.podLabels.app=k8s
```

### Line-by-line explanation
- Deploys the complete Prometheus ecosystem (Prometheus, Grafana, Alertmanager, node exporters, kube-state-m metrics, etc.) via the kube-prometheus-stack chart.
- Sets Grafana to be enabled and exposed as a LoadBalancer for external access in AWS (change to Ingress or Port-Forward in development).
- Adds a label to Prometheus pods to help with identification.

```bash
# 2.4. Optional: custom values (example values.yaml content)
cat > values.yaml <<YAML
grafana:
  adminPassword: "Prometheus123!"
  service:
    type: LoadBalancer
prometheus:
  prometheusSpec:
    podLabels:
      app: k8s
YAML

# 2.5. Install with custom values
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace observability \
  -f values.yaml
```

### Line-by-line explanation
- Example of overriding default values to set a strong Grafana admin password and ensure Grafana remains LoadBalancer-exposed.
- Demonstrates how to customize the installation via a values file.

```bash
# 2.6. Access Grafana (common approaches)
# Option A: If using LoadBalancer, fetch the external IP/host
kubectl get svc -n observability prometheus-stack-grafana

# Option B: Temporary access via port-forward (for quick testing)
kubectl port-forward -n observability svc/prometheus-stack-grafana 3000:80
```

### Line-by-line explanation
- Shows how to access Grafana once the service is exposed:
  - Retrieve the external address assigned by the AWS Load Balancer.
  - Or temporarily expose Grafana locally via port-forward for quick testing.

```bash
# 2.7. (Optional) Example PrometheusRule for alerting (requires PrometheusRule CRD)
cat > pod-restarts-alert.yaml <<YAML
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-restart-alert
  namespace: observability
spec:
  groups:
  - name: pod.restarts
    rules:
    - alert: HighPodContainerRestartRate
      expr: rate(kube_pod_container_status_restarts_total[5m]) > 0.1
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "High pod container restart rate detected"
        description: "Container restarts rate exceeded 0.1 over the last 5 minutes."
YAML

kubectl apply -f pod-restarts-alert.yaml
```

### Line-by-line explanation
- Creates a Prometheus alerting rule that triggers if the pod container restart rate exceeds a threshold.
- Demonstrates how to implement simple, time-bound alerts aligned with Kubernetes metrics.
- You can adjust the expression and thresholds to match your environment and SLOs.

---

## 3. ## 2. Grafana dashboards and dashboard provisioning

Grafana is the visualization layer. This section shows a minimal approach to provisioning dashboards and a small example dashboard payload you can import or provision via a ConfigMap.

```yaml
# 3.1. Provision a minimal Grafana dashboard (as a ConfigMap)
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: observability
  labels:
    grafana_dashboard: "1"
data:
  node_cpu_dashboard.json: |-
    {
      "dashboard": {
        "id": null,
        "uid": null,
        "title": "Node CPU Usage",
        "timezone": "browser",
        "schemaVersion": 32,
        "version": 0,
        "panels": [
          {
            "type": "timeseries",
            "title": "Avg CPU (core mode: user+system)",
            "targets": [
              {
                "datasource": "Prometheus",
                "expr": "avg(rate(node_cpu_seconds_total{mode!=\"idle\"}[5m]))",
                "legendFormat": "{{instance}}",
                "refId": "A"
              }
            ]
          }
        ]
      },
      "overwrite": true
    }
```

### Line-by-line explanation
- Creates a ConfigMap that contains a simple Grafana dashboard JSON (node CPU usage). The dashboard references Prometheus as the data source and uses a time-series panel to show average CPU usage across nodes.
- This is a minimal example; real deployments often include multiple dashboards and richer panel configurations.

```bash
# 3.2. Apply dashboards ConfigMap
kubectl apply -f grafana-dashboards.yaml
```

### Line-by-line explanation
- Loads the dashboard JSON into Kubernetes as a ConfigMap. Grafana will provision dashboards from ConfigMaps if you enable provisioning (see Grafana values below).

```yaml
# 3.3. Optional: enable Grafana dashboard provisioning via Helm values (conceptual)
# In values.yaml for kube-prometheus-stack, you would typically configure:
grafana:
  dashboards:
    enabled: true
    label: grafana_dashboard
  grafana.ini:
    paths:
      data: /var/lib/grafana/dashboards
```

### Line-by-line explanation
- Conceptual example of enabling Grafana dashboard provisioning so Grafana automatically loads dashboards from the mounted ConfigMaps or files. The exact syntax depends on the Helm chart version; refer to the chart's docs for the exact provisioning keys you should set.

Notes:
- In production, you’ll usually place dashboards in a structured directory (e.g., /var/lib/grafana/dashboards) and mount them via a provisioning mechanism. The above ConfigMap approach is a compact demonstration.

---

## 4. ## 3. Observability with ELK (Elasticsearch, Logstash, Kibana) on AWS

ELK provides centralized logging. This section demonstrates deploying Elasticsearch and Kibana with Helm and shipping Kubernetes logs to Elasticsearch with a minimal Filebeat configuration, all in AWS.

```bash
# 4.1. Deploy Elasticsearch and Kibana with Helm (in the 'logging' namespace)
helm repo add elastic https://Helm.elastic.co
helm repo update

kubectl create ns logging

# Deploy Elasticsearch (3 nodes with persistent storage)
helm install elasticsearch elastic/elasticsearch \
  -n logging \
  --set replicas=3 \
  --set minimumMasterNodes=2 \
  --set persistence.enabled=true \
  --set persistence.size=30Gi \
  --set persistence.storageClass=gp3
```

### Line-by-line explanation
- Adds Elastic's Helm charts and installs Elasticsearch in a dedicated namespace with 3 replicas and volume persistence. The storage class (gp3) is AWS-specific and can be adjusted to your region/cluster.

```bash
# 4.2. Deploy Kibana
helm install kibana elastic/kibana \
  -n logging \
  --set service.type=LoadBalancer \
  --set elasticsearch.hosts=http://elasticsearch-main:9200
```

### Line-by-line explanation
- Deploys Kibana and exposes it via a LoadBalancer. Kibana is configured to connect to Elasticsearch at the specified host. Note: the exact Elasticsearch service name may be elasticsearch-master or another name depending on the Helm chart version.

```yaml
# 4.3. Simple Filebeat deployment to ship container logs to Elasticsearch
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |-
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
    output.elasticsearch:
      hosts: ["http://elasticsearch-master:9200"]
```

### Line-by-line explanation
- Creates a minimal Filebeat config that reads container logs and ships them to Elasticsearch. This is a straightforward approach to get logs indexed in Elasticsearch for search and visualization in Kibana.

```yaml
# 4.4. DaemonSet for Filebeat (ship logs from every node)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      volumes:
        - name: config
          configMap:
            name: filebeat-config
        - name: varlog
          hostPath:
            path: /var/log
      containers:
        - name: filebeat
          image: docker.elastic.co/beats/filebeat:8.9.0
          args: ["-e", "-c", "/etc/filebeat.yml"]
          volumeMounts:
            - name: config
              mountPath: /etc/filebeat.yml
              subPath: filebeat.yml
            - name: varlog
              mountPath: /var/log
```

### Line-by-line explanation
- Deploys Filebeat as a DaemonSet so every node runs a log shipper, collecting container logs and sending them to Elasticsearch. Volume mounts provide the Filebeat configuration and access to node logs.

Note: In production, you might add TLS, authentication, index lifecycle management, and more robust pipelines with Logstash or Ingest Pipelines. This example focuses on a minimal, working base for AWS Kubernetes.

---

## 5. ## 4. Observability best practices and AWS considerations

- Use separate namespaces for observability components to enforce RBAC boundaries.
- Enable TLS between components (Prometheus <-> Grafana, Filebeat <-> Elasticsearch) and consider using Ingress with TLS in front of Grafana/Kibana.
- Implement data retention policies and roll-up rules (Prometheus data vs. long-term storage costs on AWS S3 or Elastic Cloud).
- Consider cross-AZ deployments and node pool distribution for high availability in AWS.
- Access controls:
  - Secure Grafana with strong admin credentials; use OAuth/OIDC with AWS SSO if possible.
  - Use Elasticsearch security features (TLS, user auth) and restrict access to Kibana.
- Cost awareness:
  - Prometheus and Grafana pods can be memory-intensive; tune resource requests/limits.
  - ELK can be costly at scale; consider alternatives for long-term logs such as S3 storage or managed ELK (Elastic Cloud) if appropriate.
- Observability as code:
  - Store helm values and manifests in version control.
  - Use GitOps pipelines to deploy and validate changes.

---

## X. Common Beginner Mistakes

- Bad: Exposing Grafana publicly without authentication or TLS.
  - Bad:
    - Service exposure via LoadBalancer with no auth or TLS.
  - Good:
    - Use Ingress with TLS or Grafana's built-in auth, and integrate with OIDC/SAML for SSO.
- Bad: Missing resource requests/limits for Prometheus, Grafana, or ELK components, causing OOM and unstable clusters.
  - Bad:
    - No resource specs; containers can starve other workloads.
  - Good:
    - Define requests/limits and horizontal pod autoscaling where applicable.
- Bad: Not configuring data retention or remote storage for Prometheus and logs, causing uncontrolled storage growth.
  - Bad:
    - Retain all data indefinitely on local disks.
  - Good:
    - Set retention policies and/or long-term storage (e.g., S3 with snapshotting, or Elastic cold storage with ILM policies).
- Bad: Failing to isolate observability components by namespace or to apply proper RBAC privileges.
  - Bad:
    - Broad cluster-admin access to Prometheus/Grafana pods.
  - Good:
    - Use dedicated service accounts, minimal RBAC, and namespace isolation.
- Bad: Skipping alert tuning; too noisy alerts or missing critical alerts.
  - Bad:
    - Alerts fire constantly for non-critical issues, leading to alert fatigue.
  - Good:
    - Carefully tune alert thresholds, add "for" durations, and use label-based routing to on-call channels.

---

## Y. Why This Matters In Real Systems

- Reliability and uptime: Observability is the backbone of SRE practices. Early detection and fast diagnosis of incidents reduce MTTR and improve customer experience.
- Capacity planning: Metrics reveal bottlenecks (CPU, memory, I/O), enabling proactive scaling.
- Compliance and auditing: Logs from ELK provide an immutable source of truth for security events, debugging, and regulatory requirements.
- Cost control: Proper retention policies and efficient data pipelines prevent runaway storage costs in cloud environments.
- Operational excellence: Dashboards and alerting enable a culture of data-driven decisions, post-incident reviews, and continuous improvement.

---

## Z. Study Questions

1. What are the three pillars of observability and which AWS/Kubernetes components typically handle each pillar?
2. How would you expose Grafana securely in AWS while avoiding public exposure of admin credentials?
3. What is a PrometheusRule and how does it relate to alerting in the kube-prometheus-stack?
4. Describe a minimal approach to ship Kubernetes container logs to Elasticsearch using Filebeat.
5. Why might you want to provision dashboards in Grafana via ConfigMaps or provisioning pipelines rather than manual imports?

---

## Exercise

Multi-part practical coding challenge to solidify your hands-on skills.

Part A. Deploy Prometheus + Grafana on EKS
- Create a namespace called observability.
- Install kube-prometheus-stack via Helm in that namespace with Grafana exposed as a LoadBalancer.
- Retrieve Grafana URL and log in (admin password from values or defaults).

Part B. Create a basic alert
- Add a PrometheusRule that triggers an alert HighPodRestartRate if the rate of kube_pod_container_status_restarts_total over 5 minutes exceeds 0.1 for 10 minutes.
- Ensure Alertmanager routes the alert to a reachable receiver (e.g., a Slack webhook or email) if configured in your environment.

Part C. Provision a Grafana dashboard
- Create a ConfigMap containing a simple Grafana dashboard JSON (e.g., Node CPU Usage).
- Enable Grafana dashboard provisioning or place the dashboard JSON in a designated path for Grafana to load on startup.

Part D. Deploy a minimal ELK stack and ship logs
- Deploy Elasticsearch and Kibana in namespace logging using Helm.
- Create a ConfigMap with a simple Filebeat configuration to ship container logs to Elasticsearch.
- Deploy a DaemonSet for Filebeat to collect logs from all nodes.
- Verify that you can search for logs in Kibana and that Elasticsearch contains indexed logs from your cluster.

Part E. Verification and a small test
- Deploy a small app (e.g., a Nginx deployment) that emits CPU load and logs.
- Confirm Prometheus scrapes metrics from the app, Grafana shows those metrics on a dashboard, and Kibana/Kibana dashboards show the app logs.
- Demonstrate how to retrieve metrics, dashboards, and logs via commands and UI URLs.

Optional extension (for advanced learners):
- Integrate OpenTelemetry for traces and visualize them in Grafana using a Jaeger backend, with an instrumented sample service.

This structured lesson provides a complete, practical path to building a robust Observability stack in AWS-based Kubernetes environments, with Prometheus, Grafana, and ELK. It includes concrete code examples, explanations, common pitfalls, production considerations, recall questions, and a hands-on exercise to cement understanding.