# Observability on Azure AKS: Prometheus, Grafana, and ELK (Phase 4 — Kubernetes)

Observability is the practice of understanding a system’s health and behavior from the inside out—via metrics, logs, and traces. In a Kubernetes environment on Azure (AKS), Prometheus handles metrics, Grafana visualizes them, and the ELK stack (Elasticsearch, Logstash, Kibana) centralizes logs for search and analytics. This lesson shows how these tools fit together in production, how to deploy them on AKS, and how to shift from ad-hoc monitoring to a scalable, secure observability pipeline.

## 1. Observability stack on AKS: what and why

Observability combines three pillars: metrics (Prometheus), logs (ELK), and visualization/exploration (Grafana and Kibana). In Azure, you often deploy these components inside AKS and connect them to your workloads. This section covers the high-level approach and gives you a practical bootstrap with Helm.

### Code: Bootstrapping Prometheus + Grafana on AKS
```bash
# 1. Install Prometheus + Grafana stack (Prometheus, Grafana, Alertmanager)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring
```

### Line-by-line explanation
- `helm repo add prometheus-community https://prometheus-community.github.io/helm-charts`: Adds the Prometheus community Helm chart repository so we can install charts like kube-prometheus-stack.
- `helm repo update`: Refreshes local chart metadata from all configured repos.
- `kubectl create namespace monitoring`: Creates a dedicated Kubernetes namespace for monitoring components.
- `helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring`: Installs the kube-prometheus-stack chart into the monitoring namespace. This bundle includes Prometheus, Grafana, Alertmanager, and related dashboards and CRDs needed for automatic discovery.

### Code: Accessing Grafana (and Prometheus) on AKS
```bash
# 2. Access Grafana (example: port-forward from local machine)
kubectl --namespace monitoring port-forward svc/grafana 3000:80
```

### Line-by-line explanation
- `kubectl --namespace monitoring port-forward svc/grafana 3000:80`: For development or test, this forwards localhost:3000 to the Grafana service inside the cluster. In production, you’d typically use Ingress or a LoadBalancer service with proper authentication.

### Code: Discovery of metrics endpoints with ServiceMonitor (Prometheus Operator)
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: sample-app
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: sample-app
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

### Line-by-line explanation
- `apiVersion`, `kind`: Defines the resource type as a ServiceMonitor (Prometheus operator CRD).
- `metadata.name` / `namespace`: Names the ServiceMonitor and places it in the monitoring namespace.
- `spec.selector.matchLabels`: Tells Prometheus which Kubernetes Service(s) to monitor by matching labels.
- `endpoints.port` / `path` / `interval`: Configures how Prometheus scrapes the endpoints (port named http, at /metrics, every 15 seconds).

## 2. Deploying a metrics-enabled sample app (Prometheus metrics)

To see Prometheus in action, deploy a small app that exposes metrics via a /metrics endpoint, and then wire it into Prometheus with a ServiceMonitor.

### Code: App and Kubernetes resources (Python Flask + Prometheus client)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-demo
  namespace: default
data:
  app.py: |
    from flask import Flask
    from prometheus_client import Counter, Summary, generate_latest
    import time
    app = Flask(__name__)

    REQUESTS = Counter('demo_requests_total', 'Total HTTP requests')
    LATENCY = Summary('demo_request_latency_seconds', 'Request latency in seconds')

    @app.route("/")
    def index():
        with LATENCY.time():
            REQUESTS.inc()
            time.sleep(0.05)  # simulate work
            return "Hello from Prometheus-enabled app!"

    @app.route("/metrics")
    def metrics():
        return generate_latest()

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=5000)
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-demo
  labels:
    app: metrics-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: metrics-demo
  template:
    metadata:
      labels:
        app: metrics-demo
    spec:
      containers:
        - name: metrics-demo
          image: python:3.11-slim
          command: ["python", "/app/app.py"]
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: app-script
              mountPath: /app
      volumes:
        - name: app-script
          configMap:
            name: metrics-demo
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: metrics-demo
spec:
  selector:
    app: metrics-demo
  ports:
    - name: http
      port: 5000
      targetPort: 5000
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-demo
  namespace: default
data:
  app.py: |
    (content identical to the ConfigMap above)
```

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metrics-demo
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: metrics-demo
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

### Line-by-line explanation
- The first ConfigMap stores the Python app source (app.py) so the Deployment can mount it at /app.
- The Deployment creates 2 replicas of the Flask app, running on port 5000, with a volumeMount of the app script from the ConfigMap.
- The Service exposes the app on port 5000 for other services (like Prometheus ServiceMonitor) to discover.
- The ServiceMonitor binds to the app’s Service by label and scrapes the /metrics endpoint every 15 seconds, leveraging the kube-prometheus-stack CRD for automatic discovery.

## 3. ELK stack on AKS: logs ingestion and exploration

The ELK stack centralizes logs from your Kubernetes workloads. In AKS, you typically deploy Elasticsearch and Kibana, and use Logstash (or Beats like Filebeat) to ship logs from containers. This section shows a minimal, production-aware pattern using Helm and a simple Logstash pipeline.

### Code: Deploy Elasticsearch, Kibana, and Logstash with Helm
```bash
# 1) Add Elastic's Helm repo
helm repo add elastic https://charts.elastic.co
helm repo update

# 2) Create a namespace for logging
kubectl create namespace logging

# 3) Deploy Elasticsearch (clustered)
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --set replicas=3 \
  --set minimumMasterNodes=2 \
  --set data.persistence.enabled=true \
  --set data.persistence.size=20Gi

# 4) Deploy Kibana (connected to Elasticsearch)
helm install kibana elastic/kibana \
  --namespace logging \
  --set elasticsearch.hosts=http://elasticsearch-master:9200

# 5) Optional: Deploy Logstash (for custom pipelines)
helm install logstash elastic/logstash \
  --namespace logging \
  --set pipeline.sources.readFrom=false
```

### Line-by-line explanation
- `helm repo add elastic https://charts.elastic.co` and `helm repo update`: Adds Elastic's official charts and updates the local index so you can install Elasticsearch, Kibana, and Logstash.
- `kubectl create namespace logging`: Creates a dedicated namespace to isolate the ELK stack.
- `helm install elasticsearch ... replicas=3`: Deployes a three-node Elasticsearch cluster for resilience and search performance. `minimumMasterNodes=2` ensures a healthy quorum. Data persistence is enabled with a 20Gi volume to retain logs.
- `helm install kibana ... elastic/elasticsearch`: Deploys Kibana and configures it to connect to Elasticsearch at the default internal host.
- `helm install logstash ... pipeline.sources.readFrom=false`: Deploys Logstash for processing/log enrichment. You can customize inputs/filters via a ConfigMap (not shown here) and mount it as /usr/share/logstash/pipeline/logstash.conf.

### Code: Simple Logstash pipeline (ConfigMap) and a Logstash Deployment
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logstash-pipeline
  namespace: logging
data:
  logstash.conf: |
    input {
      beats {
        port => 5044
      }
    }
    filter {
      grok {
        match => { "message" => "%{COMBINEDAPACHELOG}" }
      }
    }
    output {
      elasticsearch {
        hosts => ["http://elasticsearch-master:9200"]
        index => "logs-%{+YYYY.MM.dd}"
      }
      stdout { codec => rubydebug }
    }
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logstash
  namespace: logging
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
          image: docker.elastic.co/logstash/logstash:8.0.0
          ports:
            - containerPort: 5044
          volumeMounts:
            - name: config
              mountPath: /usr/share/logstash/pipeline/logstash.conf
              subPath: logstash.conf
      volumes:
        - name: config
          configMap:
            name: logstash-pipeline
```

### Line-by-line explanation
- The ConfigMap defines a Logstash pipeline that listens for Beats input on port 5044, applies a Grok filter to parse Apache-like logs, and outputs to Elasticsearch with a daily index. The stdout output is useful for debugging.
- The Deployment runs a single Logstash pod with the pipeline trained by the ConfigMap mounted into the expected path.
- Port 5044 is exposed for Beats/Beats-family agents (e.g., Filebeat) to forward logs to Logstash.
- Elasticsearch output points to the internal Elasticsearch service, ensuring logs are stored and searchable.

### Code: Lightweight Beats agent to ship container logs (Filebeat) to Logstash
```yaml
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
      containers:
        - name: filebeat
          image: docker.elastic.co/beats/filebeat:8.9.0
          args: ["-e", "-c", "/etc/filebeat.yml"]
          volumeMounts:
            - name: config
              mountPath: /etc/filebeat.yml
              subPath: filebeat.yml
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: filebeat-config
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/lib/docker/containers/*.log
    output.logstash:
      hosts: ["logstash:5044"]
```

### Line-by-line explanation
- The DaemonSet ensures a Filebeat instance runs on every node, collecting container logs and shipping them to Logstash.
- The Filebeat container uses a config map for its configuration, which specifies container log collection and the Logstash destination.
- The ConfigMap filebeat.yml defines the input as container logs and the output to Logstash on port 5044.
- The volumes mount file paths to allow Filebeat to read container logs from the host filesystem.

## X. Common Beginner Mistakes

1) Bad: Exposing Grafana/Prometheus insecurely
- Bad:
```yaml
# Insecure: using ClusterIP with no auth or TLS exposure
apiVersion: v1
kind: Service
metadata:
  name: grafana
spec:
  type: ClusterIP
  ports:
  - port: 80
```
- Good:
```yaml
# Secure: Use Ingress with TLS and basic auth or OAuth
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - grafana.your-domain.tld
    secretName: grafana-tls
  rules:
  - host: grafana.your-domain.tld
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 80
```

2) Bad: Manual scraping config without ServiceMonitor/Discovery
- Bad:
```yaml
# Prometheus static scrape config (hard to manage)
scrape_configs:
  - job_name: 'custom'
    static_configs:
      - targets: ['metrics-demo.default.svc.cluster.local:5000']
```
- Good:
```yaml
# Use ServiceMonitor + Prometheus operator to auto-discover
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metrics-demo
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: metrics-demo
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

3) Bad: Elasticsearch without resource planning
- Bad:
```yaml
# No resource requests/limits
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  # ...
```
- Good:
```yaml
# Resource requests/limits and storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  ...

    resources:
      requests:
        memory: "4Gi"
        cpu: "1"
      limits:
        memory: "8Gi"
        cpu: "2"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      resources:
        requests:
          storage: 50Gi
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
```

4) Bad: Relying on port-forward for production dashboards
- Bad:
```bash
# Port-forward to Grafana for access (not suitable for multi-user prod)
kubectl port-forward svc/grafana 3000:80
```
- Good:
```yaml
# Ingress with TLS + RBAC/SSO
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: grafana-auth
spec:
  tls:
  - hosts:
    - grafana.your-domain.tld
    secretName: grafana-tls
  rules:
  - host: grafana.your-domain.tld
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 80
```

## Y. Why This Matters In Real Systems

- Reliability: Observability is essential for incident response and post-incident analysis. Prometheus provides reliable time-series data; Grafana/Kibana let you quickly identify anomalous patterns.
- Scale and ops velocity: As you scale, CRDs (ServiceMonitor), Helm charts, and Kubernetes-native resources help you automate provisioning and ensure consistency across environments.
- Security and governance: Use RBAC for access to Prometheus, Grafana, Elasticsearch, and Kibana. Enable TLS, encryption at rest, and restricted API access to dashboards and alerts.
- Compliance and auditing: Store logs and metrics for defined retention periods. Centralized dashboards support audits and Sarbanes-Oxley / regulator requirements.
- Resilience and disaster recovery: Distribute components across availability zones (where possible), enable data replication (Elasticsearch), backups, and define alerting rules to catch outages early.

## Z. Study Questions

1) What are the three pillars of observability, and how are Prometheus, Grafana, and ELK used to support them?
2) How do you expose Grafana securely in AKS, and why is port-forward acceptable only for development?
3) What is a ServiceMonitor, and why is it preferred over editing Prometheus scrape configs directly?
4) How can you forward logs from Kubernetes containers to Elasticsearch, and what role does Logstash/Filebeat play?
5) What are some common production pitfalls when running a combined Prometheus/Grafana/ELK stack on Kubernetes, and how can you mitigate them?

## Exercise

Part A — Create a metrics-exporting app and wire it into Prometheus

1) Write a small Python app (Flask) that exports a Prometheus metric at /metrics.
   - Include a counter (requests) and a summary (latency).

2) Deploy the app to a Kubernetes cluster (AKS or a local kind cluster).
   - Create a ConfigMap with the Python app and a Deployment that runs it.
   - Expose the app with a Service on port 5000.

3) Create a ServiceMonitor to scrape the app’s /metrics endpoint.
   - Ensure Prometheus (from kube-prometheus-stack) can discover the endpoint automatically.

4) Verify that Grafana shows the app’s metrics.
   - Import a simple Prometheus dashboard or create a minimal panel that graphs the demo_app_requests_total counter.

Code you should use for Part A (you can adapt language or version as needed):

Python app (App code in app.py)
```python
from flask import Flask
from prometheus_client import Counter, Summary, generate_latest
import time

app = Flask(__name__)

REQUESTS = Counter('demo_app_requests_total', 'Total requests')
LATENCY = Summary('demo_app_request_latency_seconds', 'Request latency in seconds')

@app.route("/")
def index():
    start = time.time()
    REQUESTS.inc()
    time.sleep(0.05)  # Simulated work
    latency = time.time() - start
    LATENCY.observe(latency)
    return "Hello from the Observability Demo!"

@app.route("/metrics")
def metrics():
    return generate_latest()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

Kubernetes resources (ConfigMap + Deployment + Service + ServiceMonitor)
```yaml
# ConfigMap with app.py
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-demo
  namespace: default
data:
  app.py: |
    from flask import Flask
    from prometheus_client import Counter, Summary, generate_latest
    import time

    app = Flask(__name__)
    REQUESTS = Counter('demo_app_requests_total', 'Total requests')
    LATENCY = Summary('demo_app_request_latency_seconds', 'Request latency in seconds')

    @app.route("/")
    def index():
        start = time.time()
        REQUESTS.inc()
        time.sleep(0.05)
        latency = time.time() - start
        LATENCY.observe(latency)
        return "Hello from the Observability Demo!"

    @app.route("/metrics")
    def metrics():
        return generate_latest()

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=5000)
```

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-demo
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: metrics-demo
  template:
    metadata:
      labels:
        app: metrics-demo
    spec:
      containers:
        - name: metrics-demo
          image: python:3.11-slim
          command: ["python", "/app/app.py"]
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: app-script
              mountPath: /app
      volumes:
        - name: app-script
          configMap:
            name: metrics-demo
```

```yaml
# Service
apiVersion: v1
kind: Service
metadata:
  name: metrics-demo
  namespace: default
spec:
  selector:
    app: metrics-demo
  ports:
    - name: http
      port: 5000
      targetPort: 5000
```

```yaml
# ServiceMonitor (to be used with Prometheus Operator)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metrics-demo
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: metrics-demo
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

Part B — Deploy ELK stack and ship logs (conceptual outline)

1) Deploy Elasticsearch, Kibana, and Logstash via Helm (as shown in the ELK section above).
2) Create a simple Logstash pipeline (logstash.conf) to receive logs on port 5044 and index into Elasticsearch.
3) Deploy a Filebeat DaemonSet on the cluster to ship container logs to Logstash.
4) Verify in Kibana that logs from the app appear and that you can search for specific fields (e.g., message, container.name).

Notes and tips

- Security: In production, secure Prometheus endpoints with TLS, basic auth/OAuth for Grafana, and restrict Elasticsearch access. Consider using Azure AD integration for Grafana access.
- Storage and retention: Plan Prometheus data retention (e.g., 7–30 days) and Elasticsearch data retention (index lifecycle management) based on your needs and budget.
- Observability design: Start with a minimal stack and gradually add dashboards and alerting rules tailored to the business context (SLA/SLO targets, error budgets).
- Azure considerations: If desired, connect AKS logs to Azure Monitor or Log Analytics for a broader view, but maintain Prometheus/ELK as the primary metrics/logs pipeline for in-cluster visibility and portability.

If you want, I can tailor the lesson to a specific AKS version, or provide a step-by-step script that you can run end-to-end in a cloud playground or your Azure subscription.