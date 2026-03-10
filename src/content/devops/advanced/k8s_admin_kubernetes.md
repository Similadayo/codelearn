# Phase 4 — Kubernetes Administration & Helm

Kubernetes administration and Helm are the backbone of operating production-grade apps in the cloud. This topic covers how to manage Kubernetes resources, package and deploy applications with Helm, enforce access controls, observe and roll out updates safely, and plan for predictable upgrades and backups. Mastery here enables reliable deployments, scalable operations, and secure, auditable environments across teams and clusters.

## 1. Kubernetes Administration Fundamentals

In this section you learn the core primitives for managing apps on a Kubernetes cluster: deploying workloads, exposing services, and reading cluster state. These fundamentals are the bread-and-butter of day-to-day admin work.

```yaml
# nginx-deployment-and-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-demo
  labels:
    app: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.23
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

```bash
# Create the deployment and service in the cluster
kubectl apply -f nginx-deployment-and-service.yaml

# List pods to verify they are created
kubectl get pods -l app=nginx

# Describe a pod to inspect events and status
kubectl describe pod nginx-demo-<salted-hash>

# Get service info (external IP when LoadBalancer provisioning completes)
kubectl get svc nginx-service
```

### Line-by-line explanation breaking down each line

Deployment manifest:
- apiVersion: apps/v1 — Uses the stable Apps API for Deployments.
- kind: Deployment — Declares a Deployment resource.
- metadata.name: nginx-demo — The unique name of this Deployment in the namespace.
- metadata.labels.app: nginx — Label used for selection and organization.
- spec.replicas: 2 — Desired number of pod replicas.
- spec.selector.matchLabels.app: nginx — Label selector matching the pod template.
- spec.template.metadata.labels.app: nginx — Labels assigned to each pod created by this Deployment.
- spec.template.spec.containers[0].name: nginx — Name of the container.
- spec.template.spec.containers[0].image: nginx:1.23 — Container image and tag to deploy.
- spec.template.spec.containers[0].ports[0].containerPort: 80 — Container port the app listens on inside the pod.

Service manifest:
- apiVersion: v1 — Core Kubernetes API group for basic resources.
- kind: Service — Declares a Service resource to expose the pods.
- metadata.name: nginx-service — Name of the Service.
- spec.selector.app: nginx — Matches pods to expose (by label).
- spec.ports[0].port: 80 — Service port exposed inside the cluster.
- spec.ports[0].targetPort: 80 — Port on the Pod to forward to.
- spec.type: LoadBalancer — Creates an external load balancer (cloud environments).

kubectl commands:
- kubectl apply -f nginx-deployment-and-service.yaml — Applies the manifest to create both resources.
- kubectl get pods -l app=nginx — Lists pods with the label app=nginx to verify creation.
- kubectl describe pod nginx-demo-<salted-hash> — Retrieves detailed status, events, and conditions for a specific pod.
- kubectl get svc nginx-service — Shows service details; the EXTERNAL-IP appears when the cloud load balancer is provisioned.

## 2. Helm Basics: Package, Deploy, and Manage Charts

Helm is the package manager for Kubernetes. It allows you to define, install, and upgrade even large applications with configurable parameters. This section demonstrates essential Helm usage and a minimal chart structure.

```bash
# Add a stable chart repository (example; adapt to current repos as needed)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install a release from a chart
helm install my-nginx bitnami/nginx --set service.type=LoadBalancer

# List releases
helm list

# Upgrade a release (change image tag or config)
helm upgrade my-nginx bitnami/nginx --set image.tag=1.24

# Rollback a release to a previous revision
helm rollback my-nginx 1
```

```yaml
# values.yaml (simplified excerpt for a Helm chart)
replicaCount: 2

image:
  repository: nginx
  tag: 1.23
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80
```

```yaml
# templates/deployment.yaml (simplified)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "mychart.name" . }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ include "mychart.name" . }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: 80
```

```yaml
# templates/service.yaml (simplified)
apiVersion: v1
kind: Service
metadata:
  name: {{ include "mychart.fullname" . }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: {{ .Values.service.port }}
    targetPort: 80
  selector:
    app.kubernetes.io/name: {{ include "mychart.name" . }}
```

### Line-by-line explanation breaking down each line

values.yaml:
- replicaCount: 2 — Default replica count for the Deployment; can be overridden at install time.
- image.repository: nginx — Default container image repository.
- image.tag: 1.23 — Default image tag; upgrade path managed via Helm upgrades.
- image.pullPolicy: IfNotPresent — Image pull policy policy for efficiency.
- service.type: LoadBalancer — Service type; LoadBalancer creates an external endpoint.
- service.port: 80 — Port exposed by the Service inside the cluster.

templates/deployment.yaml:
- apiVersion: apps/v1 — Uses the stable Apps API for Deployments.
- kind: Deployment — Declares a Deployment resource.
- metadata.name: {{ include "mychart.fullname" . }} — Name is built from the chart’s naming helpers.
- spec.replicas: {{ .Values.replicaCount }} — Dynamic replica count from values.yaml.
- spec.selector.matchLabels.app.kubernetes.io/name: {{ include "mychart.name" . }} — Selector that matches labels on the pod template.
- template.metadata.labels.app.kubernetes.io/name: {{ include "mychart.name" . }} — Labels for the pods created by this Deployment.
- containers[0].name: {{ .Chart.Name }} — Container name derived from the chart.
- containers[0].image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}" — Image and tag from values.yaml.
- containers[0].ports[0].containerPort: 80 — Port the container exposes.

templates/service.yaml:
- apiVersion: v1 — Core Kubernetes API for Service.
- kind: Service — Declares a Service resource.
- metadata.name: {{ include "mychart.fullname" . }} — Name resolved from chart templates.
- spec.type: {{ .Values.service.type }} — Service type from values.yaml (LoadBalancer by default).
- ports.port: {{ .Values.service.port }} — Service port; targetPort maps to container port.
- selector.app.kubernetes.io/name: {{ include "mychart.name" . }} — Matches the Deployment pods.

kubectl usage in context:
- helm install my-nginx bitnami/nginx --set service.type=LoadBalancer installs a pre-built chart with a LoadBalancer service.
- helm upgrade and helm rollback manage lifecycle and safe rollback points for production releases.

## 3. RBAC and Namespace Isolation

Access control and namespace boundaries are essential for multi-tenant environments and least-privilege security. This section shows how to create a dedicated namespace, a service account, a role, and a role binding to expose restricted read access to pods.

```yaml
# rbac-namespace-role-binding.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dev-sa
  namespace: prod
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: prod
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: prod
subjects:
- kind: ServiceAccount
  name: dev-sa
  namespace: prod
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Apply the RBAC configuration
kubectl apply -f rbac-namespace-role-binding.yaml

# Verify the namespace and service account exist
kubectl get namespace prod
kubectl get sa -n prod

# Verify permissions (simulate as the service account)
kubectl auth can-i get pods --as system:serviceaccount:prod:dev-sa -n prod
```

### Line-by-line explanation breaking down each line

rbac-namespace-role-binding.yaml:
- apiVersion: v1 kind: Namespace metadata.name: prod — Creates an isolated namespace named prod.
- apiVersion: v1 kind: ServiceAccount metadata.name: dev-sa namespace: prod — Defines a ServiceAccount named dev-sa in the prod namespace for pods and workloads.
- apiVersion: rbac.authorization.k8s.io/v1 kind: Role metadata.name: pod-reader namespace: prod — Declares a Role scoped to the prod namespace with specific permissions.
- rules:
  - apiGroups: [""] — Core API group (no prefix).
  - resources: ["pods"] — The resources this role applies to.
  - verbs: ["get", "watch", "list"] — Allowed actions on pods.
- apiVersion: rbac.authorization.k8s.io/v1 kind: RoleBinding metadata.name: read-pods namespace: prod — Binds the role to a subject in the same namespace.
- subjects: - kind: ServiceAccount name: dev-sa namespace: prod — The subject that receives the permissions (the SA in prod).
- roleRef: kind: Role name: pod-reader apiGroup: rbac.authorization.k8s.io — The role being granted.

kubectl commands:
- kubectl apply -f rbac-namespace-role-binding.yaml — Creates the namespace, SA, role, and binding.
- kubectl get namespace prod — Verifies the namespace exists.
- kubectl get sa -n prod — Checks the service accounts in prod.
- kubectl auth can-i get pods --as system:serviceaccount:prod:dev-sa -n prod — Tests whether the SA can perform the requested action in that namespace.

## 4. Observability, Rollouts and Rollbacks

Observability and controlled rollouts reduce MTTR and provide predictable release behavior. This section demonstrates how to manage deployments, monitor progress, and roll back if something goes wrong.

```yaml
# nginx-rolling-update.yaml (simplified deployment with readiness/liveness probes)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-rolling
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-rolling
  template:
    metadata:
      labels:
        app: nginx-rolling
    spec:
      containers:
      - name: nginx
        image: nginx:1.23
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
```

```bash
# Apply the rolling update manifest
kubectl apply -f nginx-rolling-update.yaml

# Check rollout status (waits until deployment is healthy)
kubectl rollout status deployment/nginx-rolling

# View rollout history to inspect revisions
kubectl rollout history deployment/nginx-rolling

# Roll back to the previous revision if something goes wrong
kubectl rollout undo deployment/nginx-rolling
```

### Line-by-line explanation breaking down each line

nginx-rolling-update.yaml:
- apiVersion: apps/v1 kind: Deployment — Standard deployment resource for rolling updates.
- metadata.name: nginx-rolling — Name of the deployment.
- spec.replicas: 3 — Target number of pods for this deployment.
- spec.selector.matchLabels.app: nginx-rolling — Label used to identify pods managed by this deployment.
- template.metadata.labels.app: nginx-rolling — Labels assigned to pods created by this deployment.
- containers[0].name: nginx — Container name inside the pod.
- containers[0].image: nginx:1.23 — Image and tag used for pods during this rollout.
- containers[0].ports[0].containerPort: 80 — Exposed port on the container.
- readinessProbe: confirms the pod is ready to receive traffic (HTTP GET to / on port 80 after initial delay).
- livenessProbe: ensures the container is healthy; if failed, the container is restarted.

kubectl commands:
- kubectl apply -f nginx-rolling-update.yaml — Creates/updates the deployment.
- kubectl rollout status deployment/nginx-rolling — Waits for a successful rollout.
- kubectl rollout history deployment/nginx-rolling — Shows revision history with change details.
- kubectl rollout undo deployment/nginx-rolling — Reverts to the previous revision if issues arise.

## 5. Upgrades, Backups, and GitOps Mindset

Production systems require predictable upgrades, safe rollbacks, and reliable backups. This section covers upgrade strategies with Helm, simple backup concepts, and a GitOps-oriented practice that ties changes to version control.

```bash
# Example Helm upgrade (bumps app version while preserving configuration)
helm upgrade my-nginx bitnami/nginx --set image.tag=1.24 --reuse-values

# Helm history and rollback
helm history my-nginx
helm rollback my-nginx 2
```

```bash
# Simple Kubernetes backup concept (manual, for small-scale learning)
# Export all resources in a namespace to YAML for versioning
kubectl get all -n prod -o yaml > prod-backup-$(date +%Y%m%d).yaml

# Snapshot important secrets/configmaps (encrypted in real life)
kubectl get secret my-secret -n prod -o yaml > my-secret.yaml
```

```yaml
# GitOps-style declarative manifest example (prod-app.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-app
  namespace: prod
spec:
  replicas: 4
  selector:
    matchLabels:
      app: prod-app
  template:
    metadata:
      labels:
        app: prod-app
    spec:
      containers:
      - name: app
        image: company/app:stable
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        ports:
        - containerPort: 8080
```

### Line-by-line explanation breaking down each line

Helm upgrade:
- helm upgrade my-nginx bitnami/nginx --set image.tag=1.24 --reuse-values — Upgrades the release my-nginx to the new chart image tag while reusing existing values to minimize drift.

helm history:
- helm history my-nginx — Lists historical revisions for the release, including status and update times.

rollback:
- helm rollback my-nginx 2 — Reverts release to revision 2 in case of issues.

Backup YAML approach:
- kubectl get all -n prod -o yaml — Exports all resource definitions in the prod namespace to YAML, enabling version-controlled backups.
- kubectl get secret my-secret -n prod -o yaml — Extracts a sensitive manifest; handle secrets securely (consider encryption or secret management tools).

GitOps manifest:
- apiVersion, kind, metadata, spec — The standard Kubernetes Deployment manifest; namespace field ensures the manifest targets the intended namespace.
- spec.replicas: 4 — Desired scale after the update.
- template.spec.containers[0].image: company/app:stable — Image reference; in GitOps, changes are committed to version control and applied by an automated agent.

## 6. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

- Mistake 1: Using image: latest without pinning a specific tag
  Bad:
  - image: nginx:latest
  - imagePullPolicy: Always
  Good:
  - image: nginx:1.23
  - imagePullPolicy: IfNotPresent

- Mistake 2: Skipping readiness and liveness probes
  Bad:
  readinessProbe: null
  livenessProbe: null
  Good:
  readinessProbe:
    httpGet:
      path: /
      port: 80
    initialDelaySeconds: 5
    periodSeconds: 10
  livenessProbe:
    httpGet:
      path: /
      port: 80
    initialDelaySeconds: 15
    periodSeconds: 20

- Mistake 3: Not using namespaces or RBAC for isolation
  Bad:
  - Deployments and services in default namespace with no restrictions
  Good:
  - Create dedicated namespaces (e.g., prod, staging, dev) and apply RoleBindings to enforce least privilege

- Mistake 4: Manual, brittle upgrades without version control
  Bad:
  - helm upgrade my-nginx bitnami/nginx --set image.tag=1.24 --force
  Good:
  - Use a values.yaml with explicit version pinning and keep changes under version control; use helm diff plugin if available

- Mistake 5: Ignoring observability during deployments
  Bad:
  - No rollout status monitoring, no logs captured
  Good:
  - kubectl rollout status deployment/..., kubectl logs -f deployment/..., instrumented probes and metrics for visibility

## 7. Why This Matters In Real Systems

In production, Kubernetes administration and Helm are the bridge between development intent and reliable, auditable operations. Benefits include:
- Repeatable deployments: Helm charts and declarative manifests enable consistent environments across dev/stage/prod.
- Safer upgrades: Readiness and liveness checks, plus rollout status monitoring, reduce blast radius during updates.
- Security and isolation: Namespace boundaries and RBAC minimize blast radii and enforce least privilege.
- Observability: Centralized logging, metrics, and events drive quicker incident response and capacity planning.
- GitOps alignment: Treating cluster state as code allows versioning, rollback, and automated reconciliation, improving reliability and auditability.

## 8. Study Questions

1. What is the difference between a Deployment and a Service in Kubernetes?
2. How do you roll back a failed Helm upgrade to a previous revision?
3. Why are readiness and liveness probes important for deployments?
4. How does RoleBinding differ from ClusterRoleBinding, and when would you use each?
5. What are the typical steps in a GitOps workflow for applying changes to a Kubernetes cluster?

## 9. Exercise

Part A: Create a two-replica web application and expose it
- Deliverables:
  - A Deployment manifest for a simple web app (static NGINX or a small container) with 2 replicas and readiness/liveness probes.
  - A corresponding Service of type LoadBalancer to expose the app.
- Provide the YAML in a single file or split into two files as you prefer.

Part B: Package the app with a minimal Helm chart
- Deliverables:
  - A Helm chart skeleton named my-webapp with:
    - values.yaml including replicaCount, image.repository, image.tag, and service.type/port
    - templates/deployment.yaml using Helm templates
    - templates/service.yaml using Helm templates
  - Include the Chart.yaml with basic metadata.

Part C: Deploy with Helm and verify
- Steps:
  - Helm install my-webapp ./my-webapp
  - Verify pods, service, and endpoints
  - Update the image tag via Helm and perform a rollout, then roll back if needed

Part D: RBAC and namespace isolation
- Deliverables:
  - A namespace named web-prod
  - A ServiceAccount named web-admin in web-prod
  - A Role granting read access to pods in web-prod
  - A RoleBinding binding the SA to the Role
  - Commands to verify access using kubectl auth can-i

Part E: Observability and safe upgrades
- Deliverables:
  - A deployment manifest with readiness/liveness and a rolling update scenario
  - A Helm upgrade to a new image tag and a rollback path
  - A short write-up describing how you would monitor rollout progress in a real system (e.g., logs, events, metrics)

Note: In your actual environment, adapt repository URLs, chart names, and cluster context to your cluster configuration. Use a development namespace for experiments before promoting to prod.