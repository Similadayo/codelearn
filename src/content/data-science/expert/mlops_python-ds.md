# MLOps: Deploying Models at Scale

In modern data teams, moving a model from prototype to production is only half the battle. MLOps combines software engineering discipline with machine learning workflows to deploy, monitor, scale, and evolve models safely and efficiently. This lesson focuses on the Python data stack and practical, executable patterns for deploying models at scale—from a fast inference API to containerization, orchestration, monitoring, registry, and robust deployment strategies. By the end, you’ll have a concrete blueprint you can adapt for real-world systems.

## 1. Designing a Scalable Inference API with FastAPI

A production model must be accessible, fast, and reliable. This section shows a minimal yet production-ish FastAPI service that loads a trained scikit-learn model from disk at startup and serves predictions. It also includes a health endpoint and a simple input validation model.

```python
# main.py
from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os

app = FastAPI(title="ML Inference Service")

MODEL_PATH = os.environ.get("MODEL_PATH", "models/model.pkl")
model = None

def load_model():
    global model
    if model is None:
        model = joblib.load(MODEL_PATH)

load_model()

class Request(BaseModel):
    features: list[float]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(req: Request):
    features = req.features
    if not isinstance(features, list) or len(features) == 0:
        return {"error": "features must be a non-empty list of floats"}

    if model is None:
        load_model()
    pred = model.predict([features])
    return {"prediction": pred[0]}
```

### Line-by-line explanation
- Line 1: Import FastAPI, Pydantic BaseModel for request validation.
- Line 2: Import joblib to load the trained scikit-learn model from disk.
- Line 3: Import os to read environment variables (for containerized deployments).
- Line 5: Create a FastAPI app with a descriptive title.
- Line 7: Define the path to the model file, allowing override via MODEL_PATH env var.
- Line 8: Initialize a module-global placeholder for the model.
- Line 10–13: Define a helper function load_model to load the model once and reuse it (singleton at startup).
- Line 15: Call load_model during startup so the model is ready for requests.
- Line 17–20: Define a Pydantic model Request that validates incoming JSON to ensure features is a list of floats.
- Line 22–23: Health endpoint to signal service readiness for Kubernetes liveness checks.
- Line 25–33: Prediction endpoint. Validates input, ensures the model is loaded, performs prediction, and returns the result.

## 2. Packaging and Dependency Management with Docker

Containerizing your service ensures consistency across environments, simplifies scaling, and pairs well with orchestration. This section includes a minimal Dockerfile and a requirements file.

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Run app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```text
# requirements.txt
fastapi
uvicorn[standard]
scikit-learn
joblib
```

### Line-by-line explanation
- Dockerfile
- Line 1: Use a slim Python 3.11 image to reduce image size.
- Line 4: Set the working directory inside the container.
- Line 7–8: Copy requirements and install dependencies to the image.
- Line 11–12: Copy the application source into the container.
- Line 14: Expose port 8000 for the FastAPI app.
- Line 17–18: Command to start the app with uvicorn, binding to all interfaces on port 8000.
- requirements.txt
- Lists the essential libraries needed: FastAPI, Uvicorn, scikit-learn, and joblib.

## 3. Deploying to Kubernetes with Autoscaling

Kubernetes lets you scale replicas of your inference service based on demand. This section provides a Deployment, a Service, and a Horizontal Pod Autoscaler (HPA) to automatically adjust the number of pods by CPU usage.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
      - name: ml-inference
        image: registry.example.com/ml-inference:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
```

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ml-inference-service
spec:
  selector:
    app: ml-inference
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
```

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ml-inference-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ml-inference
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

### Line-by-line explanation
- deployment.yaml
- apiVersion/kind/metadata: Standard Kubernetes Deployment object.
- spec.replicas: Start with 3 pods as a baseline for load.
- spec.selector/spec.template.labels: Ensure pods are correctly matched by the app label.
- containers.image: The container image containing the FastAPI app; replace with your registry path.
- ports/containerPort: Expose internal port 8000.
- resources: Declares CPU/memory requests and limits to help the scheduler allocate resources and enable autoscaling.
- livenessProbe/readinessProbe: Health checks to determine if pods are alive and ready to serve traffic.
- service.yaml
- Creates a ClusterIP service that load-balances across pods selected by the app label.
- hpa.yaml
- scaleTargetRef: Ties HPA to the ml-inference Deployment.
- minReplicas/maxReplicas: Auto-scale between a safe lower and upper bound.
- metrics: Configure CPU-based scaling.

Note: Ensure your cluster has metrics server installed and autoscaling enabled. The health endpoint at /health must be responsive for liveness/readiness probes.

## 4. Observability and Monitoring

Observability is critical in production to detect latency, errors, and drift. This section adds Prometheus-compatible metrics to the API and shows how to expose a /metrics endpoint.

```python
# observability.py (or integrate into main.py)
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram, generate_latest, CollectorRegistry
from fastapi.responses import Response

registry = CollectorRegistry()
REQUEST_COUNT = Counter('inference_requests_total', 'Total requests', registry=registry)
LATENCY = Histogram('inference_latency_seconds', 'Latency in seconds', registry=registry)

from time import time
app = FastAPI(title="ML Inference Service with Metrics")

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time()
    response = await call_next(request)
    elapsed = time() - start
    LATENCY.observe(elapsed)
    REQUEST_COUNT.inc()
    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(registry), media_type="text/plain")
```

### Line-by-line explanation
- registry, counters/histograms: Create a dedicated registry and two metrics to track request volume and latency.
- middleware: Wraps every HTTP request to measure latency and increment request count.
- /metrics endpoint: Exposes metrics in Prometheus text format for scraping.

Prometheus configuration snippet (example) to scrape the API:
```yaml
# prometheus.yaml (part)
scrape_configs:
  - job_name: 'ml-inference'
    static_configs:
      - targets: ['ml-inference-service:80']
```

### Line-by-line explanation
- scrape_configs: Tells Prometheus where to scrape metrics from (the Kubernetes service DNS name and port).
- targets: Replace with the actual service namespace/name if needed.

## 5. Model Registry and Versioning

For reproducibility and safe rollouts, connect your service to a model registry and support versioned model loading. This example uses MLflow to load a model from a registry and to log a new version.

```python
# model_registry.py
import os
import mlflow.pyfunc

MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
MODEL_URI = os.environ.get("MODEL_URI", "models:/my-model/Production")

def load_model_from_registry():
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    model = mlflow.pyfunc.load_model(MODEL_URI)
    return model

# Usage in the inference service
model = load_model_from_registry()
def predict_with_registry(input_features):
    return model.predict(input_features)
```

### Line-by-line explanation
- Line 1–3: Import OS and MLflow PyFunc module to interact with the model registry.
- Line 5–6: Read environment variables for registry location and model version/stage.
- Line 9: Function to set the tracking URI and load the production model from MLflow’s model registry.
- Line 12: Return the loaded model for inference.
- Usage: In your inference code, replace local model loading with a call to load_model_from_registry() to fetch the current production model.

Notes and best practices
- Use a separate service account and restricted permissions in your registry.
- Cache the loaded model at process startup to minimize registry calls per request.
- Implement a fallback strategy if registry access is temporarily unavailable (e.g., serve last-good model).

## 6. Rollouts, Canary Deployments

Canary or progressive rollouts reduce risk when updating models. This example uses Argo Rollouts to perform a canary deployment, progressively shifting traffic from the stable version to a newer canary version.

```yaml
# rollout.yaml (requires Argo Rollouts installed)
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: ml-inference-rollout
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
      - name: ml-inference
        image: registry.example.com/ml-inference:v2
        ports:
        - containerPort: 8000
  strategy:
    canary:
      analysis:
        templates:
        - templateName: stability-check
      steps:
      - setWeight: 20
      - pause: { "duration": 10 }  # wait for 10 seconds
      - setWeight: 60
      - pause: { "duration": 10 }
      - setWeight: 100
```

### Line-by-line explanation
- kind: Rollout with a canary strategy to gradually shift traffic from the stable to the canary version.
- replicas/template: Defines the canary container image tag (v2) to be tested.
- strategy.canary.steps: Show a staged rollout plan: start with 20% traffic to canary, pause to observe, then 60%, then 100%.
- Observability/validation: In a real system, attach automated health checks, synthetic tests, and metrics-based gates to the analysis template.

Important notes
- Argo Rollouts must be installed in your cluster; this example assumes you have a canary analysis template named stability-check.
- Ensure rollback behavior is configured so that if the canary fails, traffic can be redirected to the stable version quickly.

## X. Common Beginner Mistakes

Below are real pitfalls with concrete bad vs good code illustrations. Each item shows what not to do and how to fix it.

- Pitfall 1: Loading the model inside the request handler (causes cold starts and high latency)
  - Bad:
  ```python
  @app.post("/predict")
  def predict(req: Request):
      m = joblib.load("models/model.pkl")  # loads on every request
      pred = m.predict([req.features])
      return {"prediction": pred[0]}
  ```
  - Good:
  ```python
  model = joblib.load("models/model.pkl")  # loaded once at startup

  @app.post("/predict")
  def predict(req: Request):
      pred = model.predict([req.features])
      return {"prediction": pred[0]}
  ```

- Pitfall 2: Ignoring input validation and type hints
  - Bad:
  ```python
  @app.post("/predict")
  def predict(req):
      pred = model.predict([req.features])
      return {"prediction": pred[0]}
  ```
  - Good:
  ```python
  from pydantic import BaseModel

  class Request(BaseModel):
      features: list[float]

  @app.post("/predict")
  def predict(req: Request):
      pred = model.predict([req.features])
      return {"prediction": pred[0]}
  ```

- Pitfall 3: No health checks or readiness signals for orchestration
  - Bad:
  ```python
  @app.get("/health")
  def health():
      return {"status": "ok"}
  ```
  - Good (expanded readiness):
  ```python
  @app.get("/health")
  def health():
      # Could add dependency checks, e.g., model loaded, disk space, registry access
      return {"status": "ok"}

  @app.get("/readiness")
  def readiness():
      # True if the app is ready to receive traffic
      ready = model is not None
      return {"ready": ready}
  ```

- Pitfall 4: No observability (no metrics or logging)
  - Bad:
  ```python
  # No metrics
  @app.post("/predict")
  def predict(req: Request):
      pred = model.predict([req.features])
      return {"prediction": pred[0]}
  ```
  - Good:
  ```python
  from prometheus_client import Counter, Histogram, generate_latest
  @app.middleware("http")
  async def metrics_middleware(request, call_next):
      start = time()
      response = await call_next(request)
      latency = time() - start
      LATENCY.observe(latency)
      REQUESTS.inc()
      return response

  @app.get("/metrics")
  def metrics():
      return Response(generate_latest(registry), media_type="text/plain")
  ```

## Y. Why This Matters In Real Systems

- Reliability and uptime: Scalable deployments with proper health checks and HPA prevent outages under load.
- Reproducibility: A model registry with versioning ensures you can reproduce results and roll back if drift occurs.
- Observability: Metrics and logging enable proactive tuning, alerting, and incident response.
- Canaries and rollouts: Gradual releases reduce risk when updating models or features; they enable A/B testing and controlled experimentation.
- Cost and efficiency: Containerization and orchestration optimize resource use and allow dynamic scaling across multiple regions and clusters.
- Compliance and auditability: Versioned artifacts and traceable pipelines support governance requirements.

## Z. Study Questions

1. What are the main benefits of loading a machine learning model at startup rather than on every request?
2. How does a Kubernetes HorizontalPodAutoscaler determine when to scale, and what metrics does it rely on in the example?
3. What is the purpose of a /health endpoint in a production inference service?
4. How would you integrate Prometheus metrics into a FastAPI service, and why are they useful?
5. What is a canary deployment, and how does Argo Rollouts help implement it in Kubernetes?

## Exercise

Build a practical, end-to-end scalable inference service and deployment pipeline. Complete the following multi-part challenge.

Part A: Implement a FastAPI Inference Service
- Create a FastAPI app (like main.py) that:
  - Loads a scikit-learn model from disk at startup.
  - Validates input with Pydantic.
  - Exposes /predict and /health endpoints.
  - Adds a /metrics endpoint for Prometheus (basic latency and request counters).

Part B: Containerize the Service
- Write a Dockerfile and requirements.txt as shown in this lesson.
- Build and run locally to verify it serves predictions at http://localhost:8000/predict.

Part C: Deploy to Kubernetes with Autoscaling
- Create deployment.yaml, service.yaml, and hpa.yaml to deploy to a cluster.
- Ensure readiness and liveness probes work with the /health endpoint.
- Configure HPA to scale based on CPU usage.

Part D: Observability
- Wire in Prometheus-compatible metrics (requests, latency) and expose /metrics.
- Provide a minimal Prometheus scrape configuration.

Part E: Model Registry and Versioning
- If available, connect to MLflow (mlflow.pyfunc) to load a model from a registry (models:/your-model/Production).
- Demonstrate how you would switch models without changing service code (e.g., by changing MODEL_URI environment variable or model version).

Part F: Rollouts (optional)
- If your cluster has Argo Rollouts, add a Rollout manifest for a canary deployment and describe the steps you would take to promote to 100% traffic gradually.

Deliverables
- main.py (FastAPI app with startup model loading, /predict, /health, and /metrics).
- Dockerfile and requirements.txt.
- deployment.yaml, service.yaml, hpa.yaml (Kubernetes resources).
- observability.py or integrated metrics in main.py.
- Optional: rollout.yaml for canary deployment (Argo Rollouts).
- A short README section detailing how to run locally, build images, deploy to Kubernetes, and verify metrics.

This lesson provides a complete, practical blueprint for deploying models at scale using the Python data stack, with attention to startup performance, containerization, orchestration, observability, and production-grade deployment strategies.