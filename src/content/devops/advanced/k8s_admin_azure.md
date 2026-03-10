# Phase 4 — Kubernetes Administration & Helm on Azure

Phase 4 dives into Kubernetes administration and Helm fully in the Azure ecosystem. You’ll provision AKS clusters, implement namespace- and RBAC-based access control, deploy applications with kubectl and Helm, configure networking via Ingress, observe and manage deployments at scale, and practice real-world production patterns (GitOps, security, autoscaling, and upgrades). This is the backbone of reliable, repeatable, cloud-native operations in Azure.

## 1. AKS Provisioning and Cluster Access

Provisioning a robust AKS cluster and obtaining credentials for kubectl are the foundational steps for Kubernetes administration in Azure.

```bash
# Log in to Azure
az login

# Create a resource group
az group create --name DevOpsAKS-RG --location eastus

# Create an AKS cluster (3 nodes, SSH keys generated if not provided)
az aks create \
  --resource-group DevOpsAKS-RG \
  --name devops-aks \
  --node-count 3 \
  --generate-ssh-keys

# Get kubeconfig/credentials for kubectl
az aks get-credentials --resource-group DevOpsAKS-RG --name devops-aks

# Verify cluster connectivity
kubectl cluster-info
kubectl get nodes -o wide
```

### Line-by-line explanation
1. az login: Authenticate to your Azure tenant so subsequent commands can access resources.
2. az group create --name DevOpsAKS-RG --location eastus: Create a resource group to contain the AKS resources.
3. az aks create ...: Provision an AKS cluster named devops-aks with 3 worker nodes; SSH keys are generated if not supplied.
4. az aks get-credentials: Fetch kubeconfig for the cluster and merge it into your local kubeconfig so kubectl can talk to AKS.
5. kubectl cluster-info: Show cluster control plane info to verify connectivity.
6. kubectl get nodes -o wide: List worker nodes and their status, confirming the cluster is ready.

## 2. Namespaces, RBAC, Secrets, and ConfigMaps

Isolate workloads, grant least-privilege access, and store configuration and sensitive data securely.

```bash
# Create a dedicated namespace
kubectl create namespace dev

# Create a generic secret (example credentials)
kubectl create secret generic api-credentials \
  --from-literal=apiKey=supersecret \
  --from-literal=apiUser=devuser

# Create a ConfigMap with application config
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=DEBUG \
  --from-literal=ENV=dev

# RBAC: define a Role and a RoleBinding for a specific user in namespace 'dev'
kubectl apply -f - << 'YAML'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev
  name: dev-team
rules:
- apiGroups: [""]
  resources: ["pods","services","configmaps"]
  verbs: ["get","list","watch","create","update","delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-team-binding
  namespace: dev
subjects:
- kind: User
  name: "dev@contoso.com"   # replace with your user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: dev-team
  apiGroup: rbac.authorization.k8s.io
YAML
```

### Line-by-line explanation
1. kubectl create namespace dev: Create an isolated namespace for dev workloads.
2. kubectl create secret generic api-credentials: Create a Kubernetes Secret to store sensitive values without embedding them in manifests.
3. kubectl create configmap app-config: Create a ConfigMap to hold non-sensitive configuration data.
4. kubectl apply -f - << 'YAML' ... YAML: Inline multi-resource manifest that defines a Role (permissions for pods, services, configmaps) scoped to the dev namespace and a RoleBinding associating a user to that Role.
5. The Role's rules grant CRUD-like permissions on core resources; the RoleBinding binds a specific user to that role in dev.

## 3. Deployments, Services, and Health

Deploy applications, expose them, and verify health and traffic flow.

```yaml
# app-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: dev
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:1.23-alpine
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        ports:
        - containerPort: 80
```

```yaml
# app-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-svc
  namespace: dev
spec:
  type: LoadBalancer
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 80
```

```bash
# Apply deployment and service
kubectl apply -f app-deploy.yaml
kubectl apply -f app-svc.yaml

# Verify
kubectl get deployments -n dev
kubectl get pods -n dev
kubectl get svc -n dev
```

### Line-by-line explanation
Deployment manifest:
1. apiVersion: apps/v1; kind: Deployment: Define a Deployment object for replica management.
2. metadata.name: Unique name in the namespace; metadata.namespace: Place the object in dev.
3. spec.replicas: Desired number of pod replicas (3 in this example).
4. spec.selector.matchLabels: Selector used to identify the pods managed by this Deployment.
5. spec.template.metadata.labels: Labels applied to the pod template so the Deployment can manage them.
6. containers.image: The container image to run (nginx:1.23-alpine); resource requests/limits establish baseline resource usage.
7. containerPort: 80; exposes port inside the pod.
Service manifest:
1. apiVersion/kind: Define a LoadBalancer Service to expose the Deployment to the internet in AKS.
2. selector: Matches pods with app: webapp.
3. ports: Expose port 80 to the cluster and to the external LoadBalancer.

## 4. Helm Basics on AKS: Packages, Values, Upgrades

Helm provides repeatable, versioned deployments and upgrades for Kubernetes apps.

```bash
# Add a stable chart repository (Bitnami as a common example)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Optional: create a namespace for Helm-managed releases
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -

# Values file for a customized nginx deployment
cat > nginx-values.yaml << 'YAML'
replicaCount: 2
image:
  repository: nginx
  tag: "1.23.4"
service:
  type: LoadBalancer
  port: 80
YAML

# Install nginx via Bitnami chart with custom values
helm install nginx-app bitnami/nginx -f nginx-values.yaml --namespace dev --create-namespace

# List releases
helm list -A

# Upgrade (e.g., change image tag)
helm upgrade nginx-app bitnami/nginx -f nginx-values.yaml -n dev
```

### Line-by-line explanation
1. helm repo add / helm repo update: Add and refresh a chart repository so Helm can fetch charts.
2. kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -: Create a dedicated namespace for Helm-managed releases in a reproducible, idempotent way.
3. nginx-values.yaml: A values file customizing replica count, image, and service type for the nginx deployment.
4. helm install nginx-app bitnami/nginx -f nginx-values.yaml --namespace dev --create-namespace: Install the chart with your values into the dev namespace.
5. helm list -A: Show all releases across all namespaces.
6. helm upgrade nginx-app bitnami/nginx -f nginx-values.yaml -n dev: Upgrade the release using the same values file.

## 5. Ingress and Networking in AKS

Ingress consolidates routing rules and hosts to services, enabling friendly URLs and TLS termination.

```bash
# Install the NGINX Ingress Controller via Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace dev --create-namespace \
  --set controller.publishService.enabled=true

# Ingress resource to expose webapp-svc
cat > app-ingress.yaml << 'YAML'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: dev
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: webapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webapp-svc
            port:
              number: 80
YAML

kubectl apply -f app-ingress.yaml

# Optional: check the ingress IP
kubectl get ingress -n dev
```

### Line-by-line explanation
1. helm repo add ingress-nginx ...: Add the official Ingress-NGINX chart repository.
2. helm install ingress-nginx ...: Install the controller; enable publishing the service so AKS can surface an external IP.
3. app-ingress.yaml: Define an Ingress resource that routes HTTP requests for host webapp.example.com to the webapp-svc service on port 80.
4. kubectl apply -f app-ingress.yaml: Create the Ingress resource in the dev namespace.
5. kubectl get ingress -n dev: Retrieve the Ingress information, including the external IP for TLS termination and traffic routing.

Note: In production, you may prefer AGIC (Azure Application Gateway Ingress Controller) for deeper Azure integration and WAF features.

## 6. Observability, Scaling, Upgrades, and Security Best Practices

Run health checks, auto-scale workloads, and plan upgrades in a reliable fashion.

```bash
# Horizontal pod autoscaling for the webapp deployment
kubectl autoscale deployment webapp -n dev --min=2 --max=6 --cpu-percent=50

# Check rollout status to ensure new versions deploy cleanly
kubectl rollout status deployment/webapp -n dev

# Scale cluster nodes (node pool) in AKS
az aks scale --resource-group DevOpsAKS-RG --name devops-aks --node-count 5

# Upgrade AKS cluster version (example: to a newer minor version)
# Find available versions first
az aks get-versions --location eastus -o table
# Then pick a version, e.g., 1.26.3
az aks upgrade --resource-group DevOpsAKS-RG --name devops-aks --kubernetes-version 1.26.3
```

### Line-by-line explanation
1. kubectl autoscale deployment: Create an HPA that scales webapp between 2 and 6 pods based on average CPU usage around 50%.
2. kubectl rollout status: Wait for the current rollout to complete and ensure the deployment is healthy.
3. az aks scale: Increase the node pool size to handle load or resilience requirements.
4. az aks get-versions: Retrieve available Kubernetes versions for AKS in a region to plan upgrades.
5. az aks upgrade: Perform an in-place upgrade of the AKS control plane and node pool to a chosen version.

## X. Common Beginner Mistakes

Real-world pitfalls with practical examples and how to fix them.

- Pitfall 1: Not setting resource requests and limits
  - Bad:
    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: webapp
    spec:
      replicas: 2
      template:
        spec:
          containers:
          - name: webapp
            image: nginx:1.23-alpine
    ```
  - Good:
    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: webapp
    spec:
      replicas: 2
      template:
        spec:
          containers:
          - name: webapp
            image: nginx:1.23-alpine
            resources:
              requests:
                cpu: "100m"
                memory: "128Mi"
              limits:
                cpu: "500m"
                memory: "256Mi"
    ```
  - Line-by-line explanation: See below.

- Pitfall 2: Using image: latest without safeguards
  - Bad:
    ```yaml
    image: myapp:latest
    imagePullPolicy: Always
    ```
  - Good:
    ```yaml
    image: myapp:1.2.3
    imagePullPolicy: IfNotPresent
    ```
  - Why: Fixed versions ensure reproducible deployments and easier rollbacks.

- Pitfall 3: Deploying directly to cluster-wide default namespace
  - Bad:
    ```bash
    kubectl apply -f app.yaml
    ```
  - Good:
    ```bash
    kubectl create namespace prod
    kubectl apply -n prod -f app.yaml
    ```
  - Why: Namespaces enforce resource quotas, RBAC scoping, and multi-tenant safety.

- Pitfall 4: Storing secrets in code or plain manifests
  - Bad:
    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: db-creds
    stringData:
      username: admin
      password: supersecret
    ```
  - Good:
    ```bash
    kubectl create secret generic db-creds \
      --from-literal=username=dbuser \
      --from-literal=password='$(vault-password)'
    ```
  - Alternative: Use Azure Key Vault integration or Sealed Secrets for encryption at rest.

- Pitfall 5: Manual, ad-hoc deployments without a repeatable method
  - Bad: Multiple YAML files edited manually.
  - Good: Use Helm charts or GitOps (Argo CD / Flux) with versioned manifests and automated reconciliation.

Line-by-line explanations for the above examples (selected):
- Resource requests/limits: Ensure the scheduler can place pods effectively and prevents noisy neighbors. Without them, a single pod can starve others.
- Image tagging discipline: Tags should be explicit; latest can drift and complicate rollbacks.
- Namespaces and RBAC: Isolates environments (dev/stage/prod) and reduces blast radius when credentials are compromised.
- Secrets handling: Avoids exposing sensitive values in manifest files; use secret management tooling or vault integration.

## Y. Why This Matters In Real Systems

- Predictable releases: Helm charts and GitOps pipelines enable reproducible deployments across environments.
- Isolation and security: Namespaces and RBAC reduce blast radius; Secrets must be protected and rotated.
- Cost and performance efficiency: Auto-scaling adapts to load; right-sized resources prevent waste and contention.
- Platform parity: Kubernetes administration on AKS mirrors on-prem and other cloud providers, enabling portable skills.
- Compliance and governance: Infrastructure as code and versioned configurations support audits and change control.
- Observability and reliability: Centralized logging, metrics, and tracing drive faster incident response and capacity planning.

## Z. Study Questions

1) How do you obtain credentials for kubectl to manage an AKS cluster, and why is this step crucial? 
2) What is the purpose of RBAC in Kubernetes, and how do you apply a RoleBinding for a user in a namespace? 
3) How can you expose a Kubernetes Deployment to the internet on AKS without using a traditional VM-based load balancer? 
4) What is the difference between a Helm upgrade and a kubectl apply for the same workload, and when would you prefer one over the other? 
5) Why are resource requests and limits important in a production cluster, and how do you specify them in a Deployment?

## Exercise

Practical multi-part coding challenge to consolidate Kubernetes administration and Helm skills on Azure.

Part A — Provision and Access
- Create a new resource group and AKS cluster in Azure (one you can delete after the exercise). Record the cluster name and resource group for reference.
- Retrieve credentials and verify cluster health with kubectl.

Part B — Namespace, RBAC, and Secrets
- Create a namespace named exercise.
- Create a secret (non-sensitive) and a config map in the exercise namespace.
- Define a Role with read/write access to pods, services, and configmaps, and bind it to a user or service account in the exercise namespace.

Part C — Deployments and Services (with Helm)
- Deploy a small web application using Helm (bitnami/nginx is acceptable) into the exercise namespace with at least 2 replicas and a LoadBalancer Service.
- Verify that the external IP is assigned and traffic can reach the app.

Part D — Ingress
- Install ingress-nginx via Helm in the exercise namespace.
- Create an Ingress resource that routes a host (for example, app.exercise.local) to your nginx service.
- Confirm the Ingress controller has an external address and that you can access the app via the host.

Part E — Autoscale and Upgrades
- Enable horizontal pod autoscaling for the web deployment (min 2, max 6, target CPU 50%).
- Simulate or describe how you would test a rolling upgrade of the app using Helm (upgrade to a new image tag) and verify rollout status.
- Demonstrate cluster scalability by increasing the node count and noting the effect on scheduling and pod distribution.

Part F — Reflection
- Document the commands you used, the outputs (external IPs, ingress address), and any challenges you encountered.
- Include a short discussion of how you would integrate these steps into a CI/CD pipeline or GitOps workflow in Azure (e.g., Azure DevOps, GitHub Actions, Argo CD).

End of lesson.