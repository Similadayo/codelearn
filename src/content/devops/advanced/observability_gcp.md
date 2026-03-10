# Phase 4 — Kubernetes: Observability (Prometheus, Grafana, ELK) on Google Cloud

Observability is the practice of understanding a system’s health, performance, and behavior by collecting and analyzing metrics, logs, and traces. In Kubernetes environments on Google Cloud (GKE), a robust observability stack helps SREs and dev teams detect incidents early, investigate root causes quickly, and continuously improve reliability while controlling costs. This lesson focuses on a practical, production-oriented setup using Prometheus, Grafana, and ELK (Elasticsearch, Logstash/Beats, Kibana) in a Google Cloud context, with hands-on code examples you can adapt to your cluster.

## 1. Observability Stack in Kubernetes on Google Cloud (Overview)

In a Kubernetes cluster on Google Cloud, the typical observability stack includes:
- Metrics: Prometheus (scrapes application and cluster metrics), Alertmanager for routing alerts.
- Visualization and ad-hoc querying: Grafana as the dashboards frontend and alerting layer for metrics.
- Logs: ELK stack (Elasticsearch, Logstash/Beats, Kibana) or an alternative like Loki for log aggregation and search.
- Logs + metrics + traces: When possible, you add tracing (e.g., Jaeger, OpenTelemetry) to get end-to-end visibility.
- Cloud context: Integrations with Google Cloud services (Cloud Storage for long-term metric/log retention, Cloud Monitoring, Cloud Logging) for backup, dashboards, and incident response in production.

Key patterns:
- Prometheus operators or kube-prometheus-stack to manage Prometheus, Alertmanager, and Grafana.
- ServiceMonitors and annotations to tell Prometheus what to scrape.
- Grafana provisioning to define data sources and dashboards as code.
- Centralized log shipping from Kubernetes pods to Elasticsearch, with Kibana for search and dashboards.
- End-to-end reasoning: define SLOs/SLA, instrument apps, collect metrics at important code paths, and correlate with logs.

Now we’ll dive into concrete subtopics with code examples.

## 2. Prometheus Setup on GKE (Code)

Prometheus is the backbone for metrics. In GKE, a common approach is to install the kube-prometheus-stack (Prometheus, Alertmanager, Grafana) via Helm.

### 2.1 Install kube-prometheus-stack in GKE

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create a namespace for monitoring and install the stack
kubectl create namespace monitoring
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring
```

### 2.2 Expose Prometheus (optional) and show how to scrape a sample app with a ServiceMonitor

```yaml
# ServiceMonitor to tell Prometheus how to scrape a sample app
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp
  namespace: default
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: myapp
  namespaceSelector:
    matchNames:
      - default
  endpoints:
  - port: http-metrics
    interval: 15s
```

### 2.3 Sample app deployment and service (metrics exposed on /metrics)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: yourdockerhubuser/myapp:latest
        ports:
        - containerPort: 8080
        # Assume the app exposes Prometheus metrics on /metrics
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  labels:
    app: myapp
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
spec:
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
  selector:
    app: myapp
```

### 2.4 Line-by-line explanation

- Code block 2.1 (Helm install)
  - helm repo add: registers the Prometheus community charts so you can install kube-prometheus-stack.
  - helm repo update: refreshes local index from repos.
  - kubectl create namespace: reserves a dedicated namespace for monitoring resources.
  - helm install: deploys the kube-prometheus-stack; name of the release is “monitoring”; in the namespace monitoring. This brings Prometheus, Alertmanager, and Grafana into the cluster with sane defaults.

- Code block 2.2 (ServiceMonitor)
  - apiVersion/kind: defines a ServiceMonitor resource from Prometheus operator CRD.
  - metadata.name/namespace/labels: identifies the monitor resource and scopes it within the cluster.
  - spec.selector.matchLabels: selects the Kubernetes service(s) to monitor by labels; here it targets app: myapp.
  - endpoints: lists scraping configuration: port name must match the service port (http-metrics) and the scrape interval (15s).

- Code block 2.3 (Deployment and Service)
  - Deployment: sets up a scalable app with label app: myapp. The app is assumed to expose metrics at /metrics on port 8080.
  - Service: creates a stable endpoint for the app. The annotations instruct Prometheus to scrape the metrics endpoint (port 8080) automatically.
  - Annotations (prometheus.io/scrape and prometheus.io/port) enable automatic discovery for many Prometheus setups (including kube-prometheus-stack) by marking the service as a metrics endpoint.

## 3. Grafana Setup and Dashboards (Code)

Grafana is the visualization layer for metrics. We’ll install Grafana, configure a Prometheus data source, and import a simple dashboard.

### 3.1 Install Grafana via Helm

```bash
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword='ComplexP@ssw0rd' \
  --set service.type=LoadBalancer
```

### 3.2 Provision Grafana data source (Prometheus) via Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  datasource.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-operated.monitoring.svc.cluster.local
      access: proxy
      isDefault: true
```

### 3.3 Import a simple Grafana dashboard (JSON)

```json
{
  "dashboard": {
    "id": null,
    "title": "MyApp Overview",
    "uid": "myapp-overview",
    "panels": [
      {
        "type": "graph",
        "title": "HTTP Requests Total (per hour)",
        "targets": [
          { "expr": "sum by (method) (rate(http_requests_total[1h]))" }
        ],
        "yaxis": { "format": "short" }
      },
      {
        "type": "graph",
        "title": "Request Latency (p95)",
        "targets": [
          { "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" }
        ]
      }
    ]
  },
  "overwrite": true
}
```

### 3.4 Line-by-line explanation

- Code block 3.1 (Grafana install)
  - grafana/grafana: Grafana chart from the Grafana Helm repository.
  - --namespace: places Grafana in the monitoring namespace for isolation with Prometheus.
  - --set adminPassword: sets the initial admin password for Grafana; consider using a Kubernetes Secret in real setups.
  - --set service.type=LoadBalancer: makes Grafana accessible via a cloud load balancer in GKE.

- Code block 3.2 (Grafana data source)
  - ConfigMap named grafana-datasource in the monitoring namespace contains a YAML payload that Grafana will read to configure data sources.
  - datasource.yaml: defines a Prometheus data source named “Prometheus” pointing to the Prometheus service in Prometheus operator's namespace.
  - isDefault: true makes this the default data source in Grafana.

- Code block 3.3 (Dashboard JSON)
  - A minimal dashboard JSON that Grafana can import.
  - Dashboard title: “MyApp Overview”.
  - Panel 1 shows total requests per hour by HTTP method using a PromQL expression.
  - Panel 2 shows the 95th percentile latency using a histogram_quantile query on a histogram metric.

## 4. ELK Stack on Kubernetes (Code)

ELK provides centralized log ingestion, indexing, and search capabilities. In Kubernetes on GKE, you can deploy Elasticsearch and Kibana with Helm and ship logs from pods using Fluent Bit or Filebeat.

### 4.1 Deploy Elasticsearch and Kibana via Helm

```bash
# Add Elastic Helm repo and install Elasticsearch and Kibana
helm repo add elastic https://Helm.elastic.co
helm repo update

kubectl create namespace observability
helm install elasticsearch elastic/elasticsearch \
  --version 8.9.0 \
  --namespace observability \
  --set replicas=2

helm install kibana elastic/kibana \
  --version 8.9.0 \
  --namespace observability \
  --set service.type=LoadBalancer
```

### 4.2 Ship Kubernetes logs to Elasticsearch with Fluent Bit

```bash
# Install Fluent Bit for log shipping
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

helm install fluent-bit fluent/fluent-bit \
  --namespace observability \
  --set backend.type=es \
  --set elasticsearch.host=elasticsearch-master.observability.svc.cluster.local \
  --set elasticsearch.port=9200
```

### 4.3 Expose Kibana and an example index pattern (manual steps)

```bash
# Obtain Kibana public IP (or DNS) from the cloud provider
# Then login (default credentials depend on setup) and create an index pattern, e.g.
# myapp-*
```

### 4.4 Line-by-line explanation

- Code block 4.1 (Elasticsearch + Kibana install)
  - elasticsearch: Deploys a two-replica Elasticsearch cluster in the observability namespace.
  - replicas: scaled to 2 for resilience; adjust based on workload and budget.
  - kibana: Deploys Kibana in front of Elasticsearch; service type LoadBalancer exposes Kibana publicly or to your VPC, depending on cloud settings.
  - Namespace observability organizes the ELK components with Prometheus/Grafana in the same scope for ease of management.

- Code block 4.2 (Fluent Bit)
  - Fluent Bit collects logs from Kubernetes pods and ships them to Elasticsearch (backend.type=es).
  - elasticsearch.host: internal DNS for the Elasticsearch service; port 9200 is the default ES REST port.
  - This setup enables centralized log indexing and Kibana dashboards for log visibility.

- Code block 4.3 (Kibana index pattern)
  - Exposes steps to create an index pattern (e.g., myapp-*) in Kibana to start searching logs and applying dashboards.
  - In real environments, you often automate this via Kibana Saved Objects or provisioning.

## 5. End-to-End Observability Example (Code)

This section demonstrates a small end-to-end example: a tiny app that exposes HTTP metrics and logs, with Kubernetes manifests to deploy the app and ship metrics/logs. It ties together the previous sections and shows how multi-source observability works in a real cluster.

### 5.1 Metrics-enabled app (Python Flask with Prometheus client)

```python
# app.py
from flask import Flask
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import time

app = Flask(__name__)
REQUESTS = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])

@app.route('/metrics')
def metrics():
    # Expose our metrics in Prometheus format
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/hello')
def hello():
    REQUESTS.labels(method='GET', endpoint='/hello').inc()
    return "Hello, observability!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### 5.2 Dockerfile (Python app)

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

### 5.3 Kubernetes manifests for the app and a metrics-enabled service

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: yourdockerhubuser/myapp:latest
        ports:
        - containerPort: 8080
        # Expose metrics on /metrics (Prometheus scrapes)
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
spec:
  selector:
    app: myapp
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

### 5.4 Line-by-line explanation

- Code block 5.1 (Python app)
  - Imports: Flask to serve HTTP, Counter/Prometheus to collect metrics, generate_latest to render the metrics endpoint.
  - REQUESTS: A Counter metric labeled by HTTP method and endpoint.
  - /metrics: Exposes metrics in Prometheus format for scraping.
  - /hello: Sample endpoint that increments the counter for a GET to /hello.
  - Main block: Runs the Flask app on port 8080, listening on all interfaces.

- Code block 5.2 (Dockerfile)
  - Base image: Python 3.11 slim for a lightweight container.
  - Workdir: /app
  - Copy and install dependencies, then copy source and run app.py.

- Code block 5.3 (Kubernetes manifests)
  - Deployment: Creates two replicas of the app with label app: myapp.
  - The app container exposes port 8080 and serves /metrics and /hello.
  - Service: Exposes port 8080; annotations enable Prometheus to scrape metrics from the service.

## 6. X. Common Beginner Mistakes — 3+ real pitfalls (Bad vs Good)

- Mistake 1: Missing resource requests and limits
Bad:
```yaml
resources: {}
```
Good:
```yaml
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

- Mistake 2: Not enabling health checks or readiness probes
Bad:
```yaml
# No probes
containers:
- name: app
  image: myapp:latest
```
Good:
```yaml
containers:
- name: app
  image: myapp:latest
  livenessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 30
    periodSeconds: 15
  readinessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 10
    periodSeconds: 5
```

- Mistake 3: Narrow or wrong Prometheus scraping configuration
Bad:
```yaml
# ServiceMonitor targets the wrong namespace
namespaceSelector:
  matchNames:
    - kube-system
```
Good:
```yaml
namespaceSelector:
  matchNames:
    - default
```

- Mistake 4: Exposing Grafana with weak credentials
Bad:
```bash
adminPassword: admin
```
Good:
```bash
adminPassword: <generated-secret>
# Prefer Kubernetes Secret management and RBAC-restricted access
```

- Mistake 5: Not batching dashboards or using non-versioned dashboards
Bad:
- Manually creating single dashboards via UI every time
Good:
- Provision dashboards via JSON files or Grafana provisioning to maintain repeatability.

- Mistake 6: Logging at the wrong verbosity or not shipping logs
Bad:
- Not shipping logs to ELK/Loki; relying only on metrics
Good:
- Use Fluent Bit/Fluentd to ship logs to Elasticsearch and correlate with metrics.

## 7. Y. Why This Matters In Real Systems

- Reliability and MTTR: Observability allows rapid incident detection, triage, and root-cause analysis, reducing mean time to repair (MTTR).
- SRE discipline: Define SLOs/SLIs using real user metrics, system metrics, and logs. Tie alerts to on-call playbooks and runbooks.
- Cost efficiency: Right-sized metrics retention, dashboards, and alerts prevent alert fatigue and unnecessary escalations; long-term data often stored in cheaper storage (e.g., Cloud Storage) while hot dashboards stay in Prometheus/Grafana/ELK.
- Compliance and audit: Centralized logs and dashboards help with security audits, access controls, and incident reporting.
- Cloud-native alignment: In GKE, integrating with Google Cloud Logging/Monitoring complements Prometheus/Grafana, enabling unified visibility across cloud-native components.

## 8. Z. Study Questions — 5 Recall Questions

1) What are the three core pillars of observability, and how do they complement each other?  
2) How does a ServiceMonitor in Prometheus relate to the scraping configuration, and what files must be created to monitor a new service?  
3) Why is provisioning Grafana data sources and dashboards preferable to manual setup in production?  
4) What is the role of Fluent Bit/Fluentd in an ELK-based logging setup on Kubernetes?  
5) In a Google Cloud context, what are some practical considerations when exposing metrics or logs to external dashboards (e.g., security, IAM, network egress)?

## 9. Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small end-to-end observability demo on a GKE-like environment (or your local K8s if you don’t have GKE access). The exercise guides you through implementing an apps stack with Prometheus, Grafana, and ELK, along with end-to-end data flow for metrics and logs.

Part A — Create a metrics-enabled app
- Implement a small Python Flask app with a /metrics endpoint (Prometheus) and a /hello endpoint (business logic).
- Dockerize it and push the image to your container registry.
- Create Kubernetes manifests for a Deployment and a Service with a Prometheus scraping annotation.

Part B — Install the Prometheus/Grafana stack
- Install kube-prometheus-stack in a dedicated namespace using Helm.
- Verify that Prometheus is scraping the app metrics (you should see targets in Prometheus UI).
- Install Grafana (via Helm) and configure a Prometheus data source via provisioning.

Part C — Create basic dashboards and alerts
- Create a simple Grafana dashboard (or provision one) that displays:
  - Total HTTP requests per minute
  - 95th percentile latency
- Create a basic alert (e.g., when http_requests_total rate drops to zero or latency exceeds a threshold).

Part D — Deploy ELK and ship logs
- Install Elasticsearch and Kibana via Helm in an observability namespace.
- Install Fluent Bit configured to ship pod logs to Elasticsearch.
- Verify logs appear in Kibana (or querying Elasticsearch directly).

Part E — Tie together and perform a simple run
- Generate traffic to /hello to generate metrics and logs.
- Check Grafana for metrics visuals; check Kibana for logs around the same timeframe.
- Experiment with a ServiceMonitor adjustment or a new dashboard to demonstrate how observability data can be combined.

Part F — Security and best practices
- Use a Kubernetes Secret for Grafana admin credentials.
- Apply least-privilege RBAC for Prometheus and Grafana service accounts.
- Enable basic authentication for Kibana if exposed externally and consider IP allowlists.

Optional extension (Cloud context):
- If you are on GKE, consider using Cloud Monitoring to export Prometheus metrics or integrate with Cloud Logging for logs, ensuring you configure IAM roles appropriately.
- Validate cost impact by estimating storage of metrics/logs and enabling retention policies.

This lesson provides a structured, practical path to building a robust observability stack in Kubernetes on Google Cloud. Use the code blocks as templates and tailor resource requests, retention policies, and access controls to your environment and organizational policies.