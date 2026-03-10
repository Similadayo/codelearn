# Kubernetes Administration & Helm in AWS

This lesson covers the practical aspects of administering Kubernetes clusters on AWS using EKS, with a focus on Helm for packaging and deploying applications. You’ll learn cluster provisioning, RBAC and namespaces, Helm basics, AWS-specific integrations (IRSA, ALB Ingress Controller, CloudWatch), and common operational patterns for real systems.

## 1. Kubernetes cluster administration basics on AWS (EKS)

Administering Kubernetes on AWS starts with provisioning a reliable cluster, configuring kubectl, and validating access. EKS abstracts control plane management, while you manage worker nodes, networking, and workloads.

Code: Create a new EKS cluster with a managed node group
```bash
eksctl create cluster \
  --name dev-cluster \
  --region us-west-2 \
  --version 1.26 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed
```
### Line-by-line explanation
- eksctl create cluster: Invokes eksctl to create a new EKS cluster.
- --name dev-cluster: Sets the cluster name to dev-cluster.
- --region us-west-2: Deploys resources in the specified AWS region.
- --version 1.26: Uses Kubernetes version 1.26 for the control plane (managed by AWS).
- --nodegroup-name standard-workers: Names the worker node group.
- --node-type t3.medium: Chooses the EC2 instance type for workers.
- --nodes 3: Creates an initial 3 nodes in the node group.
- --nodes-min 1 and --nodes-max 4: Enables cluster auto-scaling of nodes between 1 and 4.
- --managed: Creates a managed node group (EKS handles the lifecycle).

Code: Retrieve kubeconfig and validate access
```bash
aws eks update-kubeconfig --region us-west-2 --name dev-cluster
kubectl get nodes
```
### Line-by-line explanation
- aws eks update-kubeconfig --region us-west-2 --name dev-cluster: Pulls cluster endpoint and credentials and updates your local kubeconfig so kubectl talks to the correct cluster.
- kubectl get nodes: Lists worker nodes in the cluster to verify connectivity and node health.

Code: Quick validation of cluster health
```bash
kubectl get ns
kubectl cluster-info
```
### Line-by-line explanation
- kubectl get ns: Lists all namespaces to confirm API server responsiveness.
- kubectl cluster-info: Displays endpoints for the control plane components and verifies cluster readiness.

## 2. Helm basics on AWS: installation, repos, and deployments

Helm 3 is the standard package manager for Kubernetes. In AWS, you’ll typically use Helm to deploy applications, charts, and operators, including CloudWatch-related tooling and AWS integrations.

Code: Install Helm 3
```bash
# Install Helm 3 (Linux/macOS)
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
```
### Line-by-line explanation
- curl -fsSL -o get_helm.sh ...: Downloads the official Helm install script.
- chmod 700 get_helm.sh: Makes the script executable.
- ./get_helm.sh: Runs the installer to install Helm 3 on the local machine.

Code: Add repos and update
```bash
# Add charts repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```
### Line-by-line explanation
- helm repo add bitnami ...: Registers the Bitnami chart repository for Helm.
- helm repo add eks ...: Registers the AWS EKS charts repository (contains AWS-specific charts like ALB controller).
- helm repo update: Fetches the latest chart indexes from all repositories.

Code: Install a chart (example nginx) via Helm
```bash
# Search for nginx charts and install
helm search repo nginx
helm install my-nginx bitnami/nginx --set service.type=LoadBalancer
```
### Line-by-line explanation
- helm search repo nginx: Finds available nginx charts in configured repos.
- helm install my-nginx bitnami/nginx --set service.type=LoadBalancer: Installs the nginx chart with a LoadBalancer service to expose it via an AWS ELB.

Code: Upgrade and uninstall
```bash
# Upgrade release (example: bump image tag or replicas)
helm upgrade my-nginx bitnami/nginx --set replicaCount=4

# Uninstall release
helm uninstall my-nginx
```
### Line-by-line explanation
- helm upgrade my-nginx ...: Applies new configuration to an existing release without re-installing from scratch.
- helm uninstall my-nginx: Removes the release and associated resources deployed by Helm.

## 3. Kubernetes RBAC, Namespaces, and IAM Roles for Service Accounts (IRSA) in AWS

Isolating workloads, applying least privilege, and integrating AWS IAM with Kubernetes service accounts are essential for secure clusters in AWS.

Code: Create a dedicated namespace
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sandbox
```
### Line-by-line explanation
- apiVersion: v1, kind: Namespace: Defines a Kubernetes namespace resource.
- metadata.name: Sets the namespace name to sandbox.

Code: Create a service account in the namespace
```yaml
# app-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: sandbox
```
### Line-by-line explanation
- kind: ServiceAccount: Declares a Kubernetes service account resource.
- metadata.name/namespace: Names the SA and assigns it to the sandbox namespace.

Code: RBAC Role and RoleBinding
```yaml
# app-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: sandbox
  name: app-role
rules:
- apiGroups: [""]
  resources: ["pods","pods/log"]
  verbs: ["get","watch","list"]
```

```yaml
# app-rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-rolebinding
  namespace: sandbox
subjects:
- kind: ServiceAccount
  name: app-sa
  namespace: sandbox
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
```
### Line-by-line explanation
- Role: Defines a set of permissions (get, watch, list) on pods and pod logs within the sandbox namespace.
- RoleBinding: Binds the app-sa service account to the app-role, granting the permissions.

Code: Deploy a sample app using the service account
```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: sandbox
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: nginx:1.23
        ports:
        - containerPort: 80
```
### Line-by-line explanation
- Deployment: Creates the desired number of pod replicas for the app.
- namespace: sandbox ensures resources reside in the dedicated namespace.
- template.spec.serviceAccountName: Binds the deployment’s pods to app-sa, enabling the specified RBAC rules.

Code: Apply all resources
```bash
kubectl apply -f namespace.yaml
kubectl apply -f app-sa.yaml
kubectl apply -f app-role.yaml
kubectl apply -f app-rolebinding.yaml
kubectl apply -f app-deployment.yaml
```
### Line-by-line explanation
- kubectl apply -f ...: Creates/updates Kubernetes resources defined in each YAML file, in the correct order to respect dependencies (namespace first, then SA, then RBAC, then deployment).

Code: Optional IRSA (AWS IAM Roles for Service Accounts) example (creating SA with policy)
```bash
# Associate IAM OIDC provider (one-time per cluster)
eksctl utils associate-iam-oidc-provider --region us-west-2 --cluster dev-cluster --approve

# Create an IAM role for the service account and attach a policy
eksctl create iamserviceaccount \
  --region us-west-2 \
  --cluster dev-cluster \
  --namespace sandbox \
  --name app-sa \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --override-existing-serviceaccounts \
  --approve
```
### Line-by-line explanation
- associate-iam-oidc-provider: Enables OIDC-based IAM integration for the cluster.
- create iamserviceaccount: Creates a Kubernetes service account (app-sa) in the sandbox namespace and attaches an IAM policy so pods using this SA can assume the role.

## 4. Watching, logging, and security: observability and governance in AWS

Operational visibility, auditability, and secure configurations are critical in production systems. In AWS, you typically enable cluster logging, integrate with CloudWatch, and use optional supervisors like Prometheus/Grafana for deeper metrics.

Code: Enable EKS cluster logging (api/audit/authenticator/controllerManager/scheduler)
```bash
aws eks update-cluster-config \
  --region us-west-2 \
  --name dev-cluster \
  --logging 'clusterLogging=[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]'
```
### Line-by-line explanation
- update-cluster-config: Updates the cluster’s control plane logging configuration.
- logging.types: Specifies which control plane logs to emit (API calls, audit events, etc.).
- enabled: Activates logging for the specified types.

Code: Install CloudWatch integration and/or alternative monitoring stack (example with Prometheus)
```bash
# Install Prometheus stack as an alternative to CloudWatch (for self-hosted metrics)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack
```
### Line-by-line explanation
- helm repo add prometheus-community: Registers the Prometheus community charts.
- helm install monitoring prometheus-community/kube-prometheus-stack: Deploys a full monitoring stack (Prometheus, Grafana, etc.) for K8s metrics.

Code: Verify monitoring components are running
```bash
kubectl get pods -n default
kubectl port-forward svc/monitoring-grafana 3000:80
```
### Line-by-line explanation
- kubectl get pods -n default: Checks pods in the default namespace to ensure services are up.
- kubectl port-forward: Opens a local port to access Grafana’s UI (adjust service name as deployed).

## 5. Helm best practices and chart customization for AWS services

Using Helm with AWS often involves integrating with AWS services (ALB, EFS, S3) and ensuring proper IAM, OIDC, and RBAC configurations. The recommended pattern is to install and configure the AWS Load Balancer Controller, ensure IRSA is in place, and customize charts via values files.

Code: Prepare IRSA for AWS Load Balancer Controller
```bash
# Ensure the cluster has an OIDC provider
eksctl utils associate-iam-oidc-provider --region us-west-2 --cluster dev-cluster --approve
```
### Line-by-line explanation
- associate-iam-oidc-provider: Enables OIDC provider so Kubernetes can assume IAM roles for service accounts.

Code: Create IAM policy attachment for ALB controller
```bash
# Create IAM service account with ALB controller policy
eksctl create iamserviceaccount \
  --region us-west-2 \
  --cluster dev-cluster \
  --namespace kube-system \
  --name alb-controller \
  --attach-policy-arn arn:aws:iam::aws:policy/AWSLoadBalancerControllerFullAccess \
  --override-existing-serviceaccounts \
  --approve
```
### Line-by-line explanation
- create iamserviceaccount: Creates a Kubernetes SA in kube-system bound to an AWS IAM role with the ALB policy.

Code: Install AWS Load Balancer Controller via Helm
```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --set clusterName=dev-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=alb-controller \
  --set region=us-west-2
```
### Line-by-line explanation
- helm install aws-load-balancer-controller: Deploys the AWS Load Balancer Controller using the pre-existing IAM service account.
- clusterName: Associates the controller with the correct EKS cluster.
- serviceAccount.create=false and serviceAccount.name: Use the existing SA created via IRSA.
- region: AWS region for resource creation.

Code: Example Kubernetes Ingress using ALB
```yaml
# sample-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
spec:
  rules:
  - http:
      paths:
      - path: /*
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 80
```
### Line-by-line explanation
- kind: Ingress with annotation alb: Signals the AWS ALB Ingress Controller to manage the ingress.
- path: /* and pathType: Prefix: Matches all paths.
- backend: service: Points to the Kubernetes service to be exposed.

## X. Common Beginner Mistakes

- Bad: Resources without namespaces and no isolation
  - Bad
    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: my-app
    spec:
      replicas: 2
      selector:
        matchLabels:
          app: my-app
      template:
        metadata:
          labels:
            app: my-app
        spec:
          containers:
          - name: app
            image: nginx:1.23
            ports:
            - containerPort: 80
    ```
  - Good
    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: my-app
      namespace: sandbox
    spec:
      replicas: 2
      selector:
        matchLabels:
          app: my-app
      template:
        metadata:
          labels:
            app: my-app
        spec:
          containers:
          - name: app
            image: nginx:1.23
            ports:
            - containerPort: 80
    ---
    apiVersion: v1
    kind: Namespace
    metadata:
      name: sandbox
    ```
- Bad: Using a generic image tag (no pin or digest)
  - Bad
    ```yaml
    image: nginx
    ```
  - Good
    ```yaml
    image: nginx:1.23
    # or pin with digest for immutability
    image: nginx@sha256:abcdef...
    ```
- Bad: Inline chart overrides without a values.yaml or documented defaults
  - Bad
    ```bash
    helm install my-nginx bitnami/nginx --set replicaCount=10
    ```
  - Good
    ```yaml
    # values.yaml
    replicaCount: 3
    image:
      tag: 1.23
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 250m
        memory: 128Mi
    ```
    Then:
    ```bash
    helm install my-nginx bitnami/nginx -f values.yaml
    ```

## Y. Why This Matters In Real Systems

- Reproducibility: Helm charts andIaC (eksctl + YAML manifests) enable reproducible environments (dev, staging, prod) with versioned configurations.
- Security and compliance: IRSA enables fine-grained permissions without leaking AWS credentials to pods.
- Observability: Proper logging, monitoring, and tracing (CloudWatch, Prometheus, Grafana) are essential for incident response and capacity planning.
- Risk management: Namespaces and RBAC prevent accidental cross-tenant interference; proper resource requests/limits protect multi-tenant workloads.
- Operational efficiency: Helm simplifies deployment of complex components (ALB controller, ingress resources, monitoring stacks) and makes rollback straightforward.

## Z. Study Questions

1. What is IRSA and how does it help secure your workloads on EKS?
2. How do you enable cluster-level logging for the EKS control plane?
3. What are the basic steps to deploy the AWS Load Balancer Controller using Helm?
4. Why is it important to pin container images with explicit tags or digests?
5. How do you expose a Kubernetes service externally using AWS-loaded networking (LoadBalancer vs Ingress with ALB)?

## Exercise

Complete this multi-part practical coding challenge to demonstrate end-to-end Kubernetes administration and Helm usage on AWS.

Part A — Create and configure a new EKS cluster
- Create a new EKS cluster named phase4-cluster in us-west-2 using eksctl with:
  - Kubernetes version 1.26
  - A managed node group of 2-4 m5.large nodes
  - Enable cluster logging for api and audit
- After creation, update your kubeconfig and verify access with kubectl.

Part B — Deploy a sample app with RBAC isolation
- Create a new namespace phase4-demo.
- Create a service account app-sa in that namespace and bind it with a Role allowing list/get on pods in that namespace.
- Deploy a simple nginx-based app using a Deployment in phase4-demo with replicas: 3, ensuring the pods run as user service account app-sa.
- Expose the app internally via a ClusterIP service and validate pod-to-service connectivity.

Part C — Install and configure Helm and a user-facing service
- Install Helm 3 (if not already installed).
- Add the bitnami repo and install a nginx ingress controller (or a simple nginx service) via Helm in the phase4-demo namespace.
- Deploy a sample application via Helm chart (bitnami/nginx) with a values.yaml override:
  - replicaCount: 2
  - image.tag: 1.23
  - service.type: NodePort or LoadBalancer (depending on your environment)
- Verify the release is up and accessible within the cluster.

Part D — Integrate ALB Ingress Controller
- Enable an IAM OIDC provider for your cluster.
- Create an IAM service account for the ALB controller with AWSLoadBalancerControllerFullAccess policy.
- Install the AWS Load Balancer Controller via Helm, pointing it to your cluster and using the existing service account.
- Create a sample Ingress resource for your application using the ALB Ingress Controller class, and verify an external hostname is provisioned.

Part E — Observability and security hygiene
- Enable EKS cluster logging for api and audit (if not already enabled).
- Install a light Prometheus/Grafana stack via Helm and verify metrics scraping for your application.
- Confirm that your pods in phase4-demo namespace have appropriate ResourceRequests and Limits defined.

Deliverables:
- A set of YAML manifests and a few shell scripts that perform all steps above.
- A brief write-up describing the decisions you made (namespaces, RBAC, Helm values, ALB setup, and monitoring).