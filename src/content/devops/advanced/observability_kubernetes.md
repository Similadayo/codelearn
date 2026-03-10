# Phase 4 — Kubernetes: Observability (Prometheus, Grafana, ELK)

Observability in Kubernetes is the hard currency of reliability. By collecting metrics, logs, and traces from your services and infrastructure, you gain visibility into system behavior, can detect anomalies early, and drive informed decisions for performance, capacity, and incident response. This lesson walks you through a practical, in-cluster observability stack using Prometheus and Grafana for metrics, and the ELK stack (Elasticsearch, Logstash, Kibana) for logs. You’ll see concrete manifests, sample app code, and real-world patterns you can adapt to production.

## 1. Instrumentation and Metrics with Prometheus (and Grafana)

In Kubernetes, Prometheus is the de facto standard for metrics collection. It scrapes metrics endpoints exposed by applications and cluster components, stores time-series data, and provides a powerful query interface. Grafana sits on top of Prometheus (and other data sources) to render dashboards and drive alerts. This section provides a minimal, working path to get a simple app exposing /metrics, scraped by Prometheus, with Grafana dashboards visualizing the results.

### 1.1 Simple metrics app (source code)

This Python Flask app exposes a /metrics endpoint using the prometheus_client library.

```python
# app.py
from flask import Flask
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import time

app = Flask(__name__)
requests = Counter('requests_total', 'Total requests', ['path'])

@app.route("/")
def index():
    requests.labels('/').inc()
    return "Hello, Observability!"

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY app.py .
RUN pip install flask prometheus_client
EXPOSE 8080
CMD ["python", "app.py"]
```

### 1.2 Kubernetes manifests to run the app

Deploy the app with a Deployment and expose it via a Service.

```yaml
# k8s/metrics-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-app
  labels:
    app: metrics-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: metrics-app
  template:
    metadata:
      labels:
        app: metrics-app
    spec:
      containers:
      - name: metrics-app
        image: your-registry/metrics-app:latest
        ports:
        - containerPort: 8080
```

```yaml
# k8s/metrics-app-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: metrics-app
spec:
  selector:
    app: metrics-app
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

### 1.3 Prometheus (static config) to scrape the metrics app

A minimal Prometheus deployment with a config that scrapes the metrics-app service. This approach is fine for learning or small clusters; for production, prefer the Prometheus Operator and ServiceMonitor resources.

```yaml
# k8s/prometheus-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: observability
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'metrics-app'
        static_configs:
          - targets: ['metrics-app:8080']
```

```yaml
# k8s/prometheus-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
          - --config.file=/etc/prometheus/prometheus.yml
          - --storage.tsdb.path=/prometheus
        ports:
          - containerPort: 9090
        volumeMounts:
          - name: config
            mountPath: /etc/prometheus/prometheus.yml
            subPath: prometheus.yml
          - name: data
            mountPath: /prometheus
      volumes:
        - name: config
          configMap:
            name: prometheus-config
        - name: data
          emptyDir: {}
```

```yaml
# k8s/prometheus-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: observability
spec:
  ports:
  - name: http
    port: 9090
    targetPort: 9090
  selector:
    app: prometheus
```

### 1.4 Grafana: data source, provisioning, and a basic dashboard

Grafana is used to visualize Prometheus data. This setup provisions a Prometheus data source and a tiny dashboard.

```yaml
# k8s/grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:9.0.0
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_USER
          value: admin
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: admin
        volumeMounts:
        - name: grafana-provisioning
          mountPath: /etc/grafana/provisioning
      volumes:
      - name: grafana-provisioning
        configMap:
          name: grafana-provisioning
```

```yaml
# k8s/grafana-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: observability
spec:
  type: NodePort
  ports:
  - port: 3000
    targetPort: 3000
  selector:
    app: grafana
```

```yaml
# k8s/grafana-provisioning-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-provisioning
  namespace: observability
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      editable: true
      options:
        path: /var/lib/grafana/dashboards
```

```yaml
# k8s/grafana-dashboard.json (mounted via a ConfigMap in dashboards.yaml)
{
  "dashboard": {
    "id": null,
    "title": "Kubernetes Metrics Overview",
    "timezone": "browser",
    "panels": [
      {
        "type": "time_series",
        "title": "Requests/sec (simulated)",
        "targets": [
          { "expr": "sum(rate(http_requests_total[5m]))", "legendFormat": "requests/sec", "refId": "A" }
        ],
        "gridPos": { "x": 0, "y": 0, "w": 24, "h": 9 }
      }
    ],
    "uid": null
  }
}
```

### 1.4.1 Line-by-line explanation

- app.py: The Flask app creates a Prometheus Counter named requests_total with a label path. The index route increments the counter for "/" each request. The /metrics route serves the current metrics in the Prometheus exposition format. The server runs on port 8080.
- Dockerfile: Uses a lightweight Python base image, installs Flask and prometheus_client, exposes port 8080, and runs the Python app.
- metrics-app Deployment: Deploys a single replica of the metrics-app container with the app image and exposes port 8080. Labels help Prometheus find the pod if using label selectors.
- metrics-app Service: Exposes the deployment on port 8080 so Prometheus can reach metrics-app:8080.
- prometheus-config ConfigMap: Defines a Prometheus scrape_config to fetch metrics from the metrics-app target. The scrape interval is set to 15 seconds.
- prometheus Deployment and prometheus-service: Run Prometheus and expose its UI on port 9090 for querying time-series data.
- grafana Deployment and Service: Deploy Grafana, expose its UI on port 3000, and configure credentials.
- grafana-provisioning ConfigMap: Provisions Grafana with a Prometheus data source (pointing to http://prometheus:9090) and dashboard provisioning. The dashboards.json example uses a simple time-series panel querying Prometheus.
- grafana-dashboard.json: A representative dashboard payload that Grafana can render; in practice, dashboards.yaml will reference this file and Grafana will render the panel showing the metric expression.

## 2. Observability with Grafana Dashboards and Alerts

Grafana dashboards bring Prometheus metrics to life with visualizations, templating, and alerts. In production, you’ll typically maintain dashboards as code (provisioned config maps or dashboards stored in a Git repository) and version them, then apply changes via CI/CD. This section shows you how to wire Grafana dashboards to your Prometheus data source and create a basic alert rule.

### 2.1 Data source provisioning (repeat from above, for clarity)

```yaml
# k8s/grafana-provisioning-configmap.yaml (excerpt)
datasources.yaml: |
  apiVersion: 1
  datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### 2.2 A simple dashboard payload (JSON)

```json
// k8s/grafana-dashboard.json
{
  "dashboard": {
    "id": null,
    "title": "Kubernetes Metrics Overview",
    "timezone": "browser",
    "panels": [
      {
        "type": "time_series",
        "title": "Requests/sec",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "requests/sec",
            "refId": "A"
          }
        ],
        "gridPos": { "x": 0, "y": 0, "w": 24, "h": 9 }
      },
      {
        "type": "stat",
        "title": "Total Requests",
        "targets": [
          { "expr": "sum(http_requests_total)", "refId": "B" }
        ],
        "gridPos": { "x": 0, "y": 9, "w": 6, "h": 3 }
      }
    ],
    "schemaVersion": 32,
    "version": 0,
    "uid": "k8s-metrics-overview"
  },
  "overwrite": true
}
```

### 2.3 Alerting basics (Prometheus alert rules)

```yaml
# k8s/prometheus-alert-rules.yaml
groups:
- name: example.rules
  rules:
  - alert: HighRequestRate
    expr: sum(rate(http_requests_total[5m])) > 100
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High request rate detected"
      description: "Requests/sec exceeded 100 for more than 2 minutes."
```

### 2.3.1 Line-by-line explanation

- grafana-provisioning-configmap.yaml: Data source points Grafana to Prometheus at http://prometheus:9090; Grafana uses this as the default data source.
- grafana-dashboard.json: A minimal dashboard with a time-series panel showing requests/sec and a stat panel showing total requests. The panel has coordinates (gridPos) for placement in the UI.
- prometheus-alert-rules.yaml: Defines an alert named HighRequestRate. It fires when the sum(rate(http_requests_total[5m])) exceeds 100 for at least 2 minutes. It tags the alert with severity and provides a short description.

## 3. Logs with ELK on Kubernetes

While Prometheus/Grafana cover metrics, logs are equally critical. The ELK stack provides centralized search and analytics for logs. This section provides a minimal end-to-end ELK deployment in Kubernetes plus a log shipper (Filebeat) that streams container logs to Logstash, which forwards to Elasticsearch and Kibana for visualization.

### 3.1 Elasticsearch (single-node) and Kibana

```yaml
# k8s/elasticsearch-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: observability
spec:
  serviceName: elasticsearch
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
        env:
        - name: discovery.type
          value: "single-node"
        - name: ES_JAVA_OPTS
          value: "-Xmx512m -Xms512m"
        ports:
        - containerPort: 9200
        - containerPort: 9300
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
      volumes:
      - name: data
        emptyDir: {}
```

```yaml
# k8s/elasticsearch-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: observability
spec:
  ports:
  - port: 9200
    targetPort: 9200
  selector:
    app: elasticsearch
```

```yaml
# k8s/kibana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
      - name: kibana
        image: docker.elastic.co/kibana/kibana:8.8.0
        env:
        - name: ELASTICSEARCH_HOSTS
          value: http://elasticsearch:9200
        ports:
        - containerPort: 5601
```

```yaml
# k8s/kibana-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: observability
spec:
  ports:
  - port: 5601
    targetPort: 5601
  selector:
    app: kibana
```

### 3.2 Filebeat (log shipper) to forward container logs to Logstash

```yaml
# k8s/filebeat-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: observability
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
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.8.0
        args:
        - "-e"
        - "-c"
        - "/etc/filebeat/filebeat.yml"
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: config
        configMap:
          name: filebeat-config
      - name: varlog
        hostPath:
          path: /var/log
```

```yaml
# k8s/filebeat-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: observability
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      json:
        message_key: log
        now-utc: true
    outputs:
      logstash:
        hosts: ["logstash:5044"]
```

```yaml
# k8s/logstash-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logstash
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logstash
  template:
    metadata:
      labels:
        app: logstash
    spec:
      containers:
      - name: logstash
        image: docker.elastic.co/logstash/logstash:8.8.0
        ports:
        - containerPort: 5044
        volumeMounts:
        - name: pipeline
          mountPath: /usr/share/logstash/pipeline
      volumes:
      - name: pipeline
        configMap:
          name: logstash-pipeline
```

```yaml
# k8s/logstash-pipeline-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logstash-pipeline
  namespace: observability
data:
  pipeline.conf: |
    input {
      beats {
        port => 5044
      }
    }
    filter { }
    output {
      elasticsearch {
        hosts => ["http://elasticsearch:9200"]
      }
    }
```

### 3.2.1 Line-by-line explanation

- elasticsearch StatefulSet and services: Sets up a single-node Elasticsearch with Java options, exposing 9200 for API access and 9300 for cluster communication.
- Kibana Deployment and Service: Exposes Kibana UI on port 5601 and points it to Elasticsearch at http://elasticsearch:9200.
- Filebeat DaemonSet and config: Filebeat runs on every node, tails container logs from /var/log/containers, and forwards them to Logstash via port 5044.
- Logstash Deployment and pipeline: Logstash listens on 5044 for incoming beats, and outputs to Elasticsearch at http://elasticsearch:9200.
- The end-to-end flow: Kubernetes pods write logs to stdout/stderr; Docker/Container runtimes place logs in /var/log/containers; Filebeat collects them, Logstash parses, and Elasticsearch indexes them; Kibana provides search and dashboards.

## X. Common Beginner Mistakes

Below are real-world pitfalls that beginners often make when implementing observability stacks in Kubernetes. For each pitfall, you’ll see a bad example and a recommended, safer approach.

1) Pitfall: Not using a dedicated namespace for observability components
- Bad:
```yaml
# All components in default namespace
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-app
```
- Good:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-app
  namespace: observability
```

2) Pitfall: Scraping everything everywhere with no scopes
- Bad (overly broad scrape config from a single Prometheus)
```yaml
static_configs:
  - targets: ['*']
```
- Good (limit to known targets and cluster services)
```yaml
static_configs:
  - targets: ['metrics-app:8080']
  - targets: ['node-exporter:9100']
```

3) Pitfall: No data retention or storage for Prometheus
- Bad (ephemeral data via emptyDir without retention)
```yaml
volumes:
  - name: data
    emptyDir: {}
```
- Good (persist Prometheus data, using a StatefulSet or durable PVC)
```yaml
volumeClaimTemplates:
- metadata:
    name: prometheus-data
  spec:
    accessModes: ["ReadWriteOnce"]
    resources:
      requests:
        storage: 10Gi
```

4) Pitfall: Skipping security and RBAC for observability components
- Bad (Prometheus/Grafana exposed publicly with no auth)
- Good (enable RBAC, use Secrets for credentials, and restrict Service exposure)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-admin
  namespace: observability
type: Opaque
data:
  admin-password: <base64-encoded-password>
```

5) Pitfall: Not wiring logs end-to-end or relying on container logs alone
- Bad (only stdout; no Filebeat/ELK)
- Good (Filebeat collects container logs and ships to Elasticsearch; logs are searchable)
```yaml
# already shown in 3.2; ensure Filebeat config references the right output (Logstash or Elasticsearch)
```

6) Pitfall: Overlooking dashboards as code
- Bad (manual Grafana changes only)
- Good (provision dashboards via ConfigMaps or GitOps; keep dashboards in source control)

7) Pitfall: Not validating instrumentation under load
- Bad (only smoke test; no load test)
- Good (simulate traffic, verify Prometheus scrapes, Grafana dashboards show expected patterns)

## Y. Why This Matters In Real Systems

Observability is the backbone of reliability and operational efficiency in production. Why it matters:

- Faster MTTR: Prometheus time-series data and Grafana dashboards help you identify bottlenecks and root causes quickly when incidents occur.
- Capacity planning: Historical metrics enable trend analysis for right-sizing resources (CPU, memory, I/O, network).
- Compliance and auditing: Centralized logs in Elasticsearch/Kibana support incident review and security audits.
- Echo-state resilience: Kubernetes environments are dynamic (pods rescale, nodes join/leave). A solid observability stack provides consistent visibility despite ephemeral workloads.
- Automated risk management: Alerts triggered by Prometheus rules can auto-scale or notify on-call teams, reducing manual toil.

Production patterns to adopt:
- Use a dedicated observability namespace and RBAC boundaries.
- Prefer the Prometheus Operator with ServiceMonitor/Alertmanager for scalable, maintainable prometheus deployments.
- Centralize logs with Filebeat/Logstash to Elasticsearch, and secure access with Kibana.
- Provision dashboards and alerts as code; version-control dashboards for reproducibility.
- Separate data stores per data type (metrics vs logs) but ensure correlated timestamps and consistent labeling (namespace, pod, app labels).

## Z. Study Questions

1) What is the primary role of Prometheus in Kubernetes observability?
2) How does Grafana obtain data to visualize metrics from Prometheus?
3) What is a ServiceMonitor and when would you use it?
4) What are the key components of the ELK stack, and what is their role in log analytics?
5) Why is it important to provision dashboards and alert rules as code in a CI/CD workflow?

## Exercise

You will implement a small end-to-end observability scenario in a fresh Kubernetes cluster. Complete the following tasks in sequence and provide a short write-up of what you did and why.

Part A — Instrumentation and metrics
1) Create the metrics-app as described in section 1.1 (Python app with /metrics) and build a Docker image (or use a mock image) and push it to your registry.
2) Deploy metrics-app Deployment and Service in namespace observability (or your chosen namespace).
3) Deploy a simple Prometheus stack (static config as in 1.3) to scrape metrics-app:8080.
4) Deploy Grafana in the same namespace and provision a Prometheus data source pointing to Prometheus.
5) Create a basic Grafana dashboard (JSON or JSON snippet) that shows:
   - A timeseries for the rate of requests to the root endpoint (/).
   - A stat showing total requests.
6) Verify data: curl metrics-app to generate some requests, then check Grafana dashboards for updated graphs.

Part B — Logs with ELK
1) Deploy Elasticsearch and Kibana (single-node) in the same namespace.
2) Deploy Filebeat DaemonSet and point it to Logstash (or directly to Elasticsearch if you configure outputs accordingly).
3) Create a minimal Logstash pipeline that forwards logs from Filebeat to Elasticsearch.
4) Generate logs from your metrics-app (e.g., print some logs to stdout; ensure Filebeat captures them) and verify they appear in Kibana.
5) In Kibana, perform a simple search for the logs containing the word "Hello" or a similar unique token you add to your app's logging path.

Deliverables
- A short write-up documenting:
  - The namespace choices and resource names you used.
  - The Prometheus scrape configuration and rationale.
  - The Grafana provisioning approach and a sample dashboard.
  - How logs flow from Kubernetes to Elasticsearch and how you validated it in Kibana.
  - Any encountered challenges and how you resolved them.

Notes
- All code examples in this lesson are intentionally compact to illustrate the concepts. In production, you would typically deploy Prometheus and Grafana via the Prometheus Operator (kube-prometheus-stack) and manage dashboards and alerts with GitOps.
- Security: For real deployments, enable authentication, restrict access to Grafana and Kibana, and consider TLS for all service endpoints. Use Kubernetes RBAC to limit who can view/edit observability resources.

If you want, I can tailor the exercise to a specific cloud provider (GKE, EKS, AKS) or to a particular Helm-based deployment pattern.