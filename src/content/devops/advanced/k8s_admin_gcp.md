# Track: DevOps & Cloud Engineering — Phase 4: Kubernetes — Kubernetes Administration & Helm (Google Cloud)

Compelling introductory paragraph:
Kubernetes administration and Helm are foundational skills for operating production-grade applications in modern cloud environments. In Google Cloud, you’ll manage GKE clusters, enforce access controls, schedule workloads, and deploy repeatable, scalable applications using Helm charts. This lesson blends hands-on commands, YAML manifests, and Helm templates to give you practical mastery of cluster management, packaging, and release automation. Mastery here translates to faster deployments, safer rollouts, and clearer visibility in real-world systems.

## 1. Getting Started with Kubernetes Administration on Google Cloud

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set project, zone, and region
gcloud config set project my-gcp-project
gcloud config set compute/zone us-central1-a
gcloud config set compute/region us-central1

# Create a GKE cluster
gcloud container clusters create phase4-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium \
  --enable-ip-alias \
  --enable-autoscaling --min-nodes 1 --max-nodes 5

# Get cluster credentials for kubectl
gcloud container clusters get-credentials phase4-cluster --zone us-central1-a

# Verify cluster and nodes
kubectl cluster-info
kubectl get nodes -o wide
```

```bash
# Basic kubectl context and namespace checks
kubectl config current-context
kubectl config get-contexts
kubectl get namespaces
```

### Line-by-line explanation
- gcloud auth login: Authenticate your Google Cloud account in the current shell.
- gcloud config set project my-gcp-project: Select the GCP project you’ll use for the cluster.
- gcloud config set compute/zone/region: Set default zone and region for subsequent commands.
- gcloud container clusters create phase4-cluster ...: Create a new GKE cluster with 3 nodes, autoscaling, and IP aliasing for efficient networking.
- gcloud container clusters get-credentials phase4-cluster: Fetch cluster credentials and configure kubectl context.
- kubectl cluster-info: Verify the control plane is reachable and the cluster is initialized.
- kubectl get nodes -o wide: Show node details (size, status, version) to confirm the cluster is ready.
- kubectl config current-context: Reveal the active kubeconfig context.
- kubectl config get-contexts: List all available contexts for switching between clusters.
- kubectl get namespaces: Confirm available namespaces and plan where you’ll deploy workloads.

## 2. Namespaces, RBAC, and Resource Management

```bash
# Create a dedicated namespace for development and a quick check
kubectl create namespace dev
kubectl get namespaces
```

```yaml
# namespace.yaml (for reuse)
apiVersion: v1
kind: Namespace
metadata:
  name: dev
```

```bash
# Apply the namespace manifest (alternative approach)
kubectl apply -f namespace.yaml
```

```yaml
# dev-reader.yaml: a Role and RoleBinding in the dev namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev
  name: dev-reader
rules:
- apiGroups: [""]
  resources: ["pods","services","configmaps"]
  verbs: ["get","list","watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-reader-binding
  namespace: dev
subjects:
- kind: User
  name: "alice@example.com"  # replace with your user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: dev-reader
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# dev-resource-quota.yaml: ResourceQuota for the dev namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-resource-quota
  namespace: dev
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "20"
```

```yaml
# dev-limitrange.yaml: Pod container limits in the dev namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limit
  namespace: dev
spec:
  limits:
  - max:
      cpu: "1"
    min:
      cpu: "100m"
    type: Container
```

```bash
# Apply RBAC and quotas
kubectl apply -f dev-reader.yaml
kubectl apply -f dev-resource-quota.yaml
kubectl apply -f dev-limitrange.yaml

# Quick checks
kubectl --namespace dev get pods
kubectl describe namespace dev
```

### Line-by-line explanation
- kubectl create namespace dev: Creates a dedicated namespace for isolating development workloads.
- (namespace.yaml): Defines a Namespace resource for version-controlled namespace configuration.
- kubectl apply -f namespace.yaml: Creates or updates the namespace from file.
- dev-reader.yaml: Defines a Role (permissions inside dev) and a RoleBinding (binds a user to that role) for scoped access control.
- The Role allows read-only access to pods, services, and configmaps within dev.
- The RoleBinding associates alice@example.com with the dev-reader role inside dev.
- dev-resource-quota.yaml: Sets quotas for CPU, memory, and pods to prevent resource exhaustion in dev.
- dev-limitrange.yaml: Enforces minimum and maximum container resource constraints in the dev namespace.
- kubectl apply: Applies Kubernetes manifests to enforce labels, RBAC, and quotas.
- kubectl describe namespace dev: Verifies that quotas and limit ranges are attached to the namespace.

## 3. Helm Fundamentals in Google Cloud

```bash
# Install Helm (v3)
curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

# Verify installation
helm version
```

```bash
# Add a stable chart repository and update
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

```bash
# Inspect default values for a chart (example: nginx)
helm show values bitnami/nginx
```

```bash
# Simple Helm install into the dev namespace (create-namespace supported)
helm install my-nginx bitnami/nginx --namespace dev --create-namespace
```

```yaml
# values.yaml sample (for a customized nginx deployment)
replicaCount: 2

image:
  repository: docker.io/bitnami/nginx
  tag: 1.23.1

service:
  type: LoadBalancer
  port: 80
```

```bash
# Upgrade with a custom values file
helm upgrade my-nginx bitnami/nginx --namespace dev -f values.yaml
```

```bash
# Rollback to a previous release
helm rollback my-nginx 1
```

```yaml
# Basic Helm chart template snippet: templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "nginx.fullname" . }}
  labels:
    app: {{ include "nginx.name" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "nginx.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "nginx.name" . }}
    spec:
      containers:
        - name: nginx
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 80
```

```yaml
# Basic Helm chart template: templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "nginx.fullname" . }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: {{ include "nginx.name" . }}
```

### Line-by-line explanation
- curl ...get-helm-3 | bash: Downloads and installs Helm v3 for your environment.
- helm version: Verifies the installed Helm binary and client/server compatibility.
- helm repo add bitnami ...: Adds a widely used chart repository and makes charts discoverable.
- helm repo update: Fetches the latest chart metadata from all repos.
- helm show values bitnami/nginx: Displays the default configuration for the nginx chart to guide overrides.
- helm install my-nginx bitnami/nginx --namespace dev --create-namespace: Installs the nginx chart into the dev namespace, creating the namespace if needed.
- values.yaml: A local file with overrides (replicaCount, image tag, and service type) to customize the deployment.
- helm upgrade my-nginx bitnami/nginx --namespace dev -f values.yaml: Applies changes from values.yaml to the release.
- helm rollback my-nginx 1: Reverts the release to revision 1.
- templates/deployment.yaml: A Helm template for the Kubernetes Deployment resource. Uses template helpers and values to render a deployment manifest.
- templates/service.yaml: A Helm template for the Service resource, with type and selectors driven by values and template helpers.
- {{ include "nginx.fullname" . }} and {{ include "nginx.name" . }}: Helm template helpers to generate consistent resource names.

## 4. Deploying Apps with Helm on GKE: Practical Example

```bash
# Create a dev namespace if not present
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -
```

```bash
# Add a chart repo and install a sample app (nginx) via Helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install my-app bitnami/nginx \
  --namespace dev \
  --create-namespace \
  --set replicaCount=3 \
  --set service.type=LoadBalancer
```

```bash
# Check the deployed service and get external IP
kubectl get svc -n dev
```

```bash
# Port-forward for local development (if you prefer not to expose via LoadBalancer)
kubectl port-forward svc/my-app-nginx 8080:80 -n dev
```

```bash
# Access the app locally
curl http://localhost:8080
```

```bash
# Upgrade the release with a value change (e.g., replicas)
helm upgrade my-app bitnami/nginx \
  --namespace dev \
  --set replicaCount=5
```

```bash
# Rollback if the upgrade breaks
helm rollback my-app 2
```

```bash
# Cleanup (optional)
helm uninstall my-app -n dev
kubectl delete namespace dev
```

### Line-by-line explanation
- kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -: Ensures the dev namespace exists in a controlled, reproducible way.
- helm repo add / helm repo update: Makes the bitnami/nginx chart available and up-to-date.
- helm install my-app bitnami/nginx --namespace dev --create-namespace --set replicaCount=3 --set service.type=LoadBalancer: Deploys an nginx-based app with 3 replicas and a LoadBalancer service in the dev namespace.
- kubectl get svc -n dev: Retrieves the service to inspect the external IP assigned by the cloud provider.
- kubectl port-forward: Creates a local tunnel to the service, useful for local testing without exposing it publicly.
- curl http://localhost:8080: Validates you can reach the app from your machine.
- helm upgrade my-app ... --set replicaCount=5: Applies an in-place upgrade to increase replicas without a full reinstall.
- helm rollback my-app 2: Reverts the release to a known-good revision if the upgrade fails.
- helm uninstall / kubectl delete namespace dev: Cleanup steps to remove resources when done.

## 5. Observability, Security, and Best Practices

```bash
# Ensure metrics/scraping works (Metrics Server for resource metrics)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

```bash
# Quick cluster-level metrics (requires metrics-server)
kubectl top nodes
kubectl top pod -n dev
```

```yaml
# Basic Prometheus scrape annotations for a Helm-deployed app
# Add to the deployment template (templates/deployment.yaml)
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "80"
```

```yaml
# Example NetworkPolicy enabling least-privilege in the dev namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-nginx-ingress
  namespace: dev
spec:
  podSelector:
    matchLabels:
      app: nginx
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 0.0.0.0/0
    ports:
    - protocol: TCP
      port: 80
```

```yaml
# Example ServiceAccount and Kubernetes RBAC binding for a workload
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: dev
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-sa-binding
  namespace: dev
subjects:
- kind: ServiceAccount
  name: app-sa
  namespace: dev
roleRef:
  kind: Role
  name: edit
  apiGroup: rbac.authorization.k8s.io
```

### Line-by-line explanation
- metrics-server: Enables collection of resource usage data, necessary for kubectl top and autoscaling decisions.
- kubectl top: Provides real-time resource usage metrics for nodes and pods.
- Prometheus annotations: Allow Prometheus (or Cloud Monitoring with Prometheus) to automatically discover and scrape metrics from pods.
- NetworkPolicy: Restricts access to pods, illustrating an essential security control for microservices communication.
- ServiceAccount and RoleBinding: Demonstrate how you can give a workload limited access to Kubernetes API resources without using a full admin context.
- The combination of metrics, security policies, and restricted service accounts supports safer, observable production deployments.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Skipping namespaces or not scoping resources properly
Bad:
```bash
kubectl apply -f deployment.yaml
```
Good:
```bash
kubectl apply -f deployment.yaml --namespace dev
```

- Mistake 2: Not version-controlling Helm values or charts
Bad:
```bash
helm install my-app bitnami/nginx --set replicaCount=3
```
Good:
```bash
# Keep a values.yaml in VCS and reference it
helm install my-app bitnami/nginx -f deploy/values.yaml --namespace dev
```

- Mistake 3: Over-provisioning or unsafe defaults
Bad:
```yaml
resources:
  requests:
    cpu: "4"
    memory: 16Gi
  limits:
    cpu: "8"
    memory: 32Gi
```
Good:
```yaml
resources:
  requests:
    cpu: "500m"
    memory: "256Mi"
  limits:
    cpu: "1"
    memory: "512Mi"
```

- Mistake 4: Ignoring RBAC and security basics
Bad:
```yaml
# pods running as root with full access
securityContext:
  runAsUser: 0
```
Good:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
```

- Mistake 5: Not validating observability before production
Bad:
No metrics or logs
Good:
Add Prometheus scraping, log aggregation, and Cloud Monitoring dashboards (annotate pods, enable metrics-server, ship logs to Cloud Logging).

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Helm charts and namespace-scoped manifests enable you to recreate environments (dev/stage/prod) with the same configuration.
- Safe releases: Helm supports versioned releases, upgrades, rollbacks, and rollback history, reducing the blast radius of changes.
- Governance and security: RBAC, ResourceQuotas, and NetworkPolicies enforce least privilege and prevent noisy tenants from impacting others.
- Observability: Metrics, logs, and tracing are essential for performance tuning, incident response, and capacity planning.
- GitOps synergy: Pair Kubernetes manifests and Helm charts with CI/CD and GitOps workflows to automate deployment pipelines with pull-request based approvals.
- Cloud-native efficiency: In Google Cloud, you can leverage GKE’s managed control plane, autoscaling, and integration with Cloud Monitoring and Cloud Logging for a scalable, resilient platform.

## Z. Study Questions — 5 recall questions

1) What command do you use to fetch credentials for a GKE cluster so that kubectl can talk to it?
2) How do you create a namespace and ensure resources are scoped to that namespace in Helm deployments?
3) What is the difference between a Role and a ClusterRole in Kubernetes RBAC, and when would you use each?
4) How can you verify that a workload is being scraped by a Prometheus-compatible metrics endpoint in Kubernetes?
5) How would you perform a rollback of a Helm release, and why is rollback important for production reliability?

## Exercise — a practical multi-part coding challenge

Part A — Prepare the cluster and namespace
- Create a GKE cluster named phase4-exercise with 3 nodes and autoscaling enabled.
- Create a dedicated namespace dev-exercise.
- Configure a ResourceQuota and a LimitRange in dev-exercise to enforce sensible defaults.

Part B — Package a simple app with Helm
- Create a minimal Helm chart (you can start from a small template) for a Python Flask app or a static nginx page.
- Configure values.yaml to set replicaCount, image tag, and service type LoadBalancer.
- Install the chart into dev-exercise using Helm, with a values override to 2 replicas and a LoadBalancer service.
- Enable metric scraping via Prometheus annotations on the deployment.

Part C — Deploy, observe, and roll back
- Access the app via the LoadBalancer external IP and confirm it serves the page.
- Scale the deployment by upgrading the Helm release to 4 replicas.
- Simulate a failed upgrade and rollback to the previous release.
- Verify resource usage using kubectl top and ensure metrics are visible.

Part D — Security and observability refinements
- Add a NetworkPolicy in dev-exercise to restrict traffic to the app service to a specific CIDR or pod selector.
- Create a ServiceAccount for the app and bind it with a Role that permits reading pods and configmaps in the namespace (least privilege).
- Annotate the deployment for Prometheus scraping and verify metrics appear in Cloud Monitoring or your Prometheus instance.

Note: The exercise steps assume you have a Google Cloud project with permissions to create GKE resources. Adapt the cluster size, region, and names to fit your environment. If you cannot run GKE in this environment, you can simulate portions of the exercise using minikube or kind locally, but focus on Helm templating, RBAC, and network policies as the core learning outcomes.

End of lesson.