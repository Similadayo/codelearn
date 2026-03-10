# Phase 3 — Infrastructure as Code with Terraform for Kubernetes

Infrastructure as Code (IaC) with Terraform is the discipline of managing cloud and cluster resources through declarative configuration files. In a Kubernetes platform, Terraform lets you codify namespaces, deployments, services, ConfigMaps, Secrets, and even Helm charts, enabling repeatable, auditable, and version-controlled infrastructure in production-grade environments. This matters professionally because it reduces human error, accelerates deployments, supports reproducibility across clusters, and integrates cleanly with CI/CD pipelines.

## 1. Terraform and IaC Fundamentals for Kubernetes
```hcl
# main.tf
provider "kubernetes" {
  config_path = "~/.kube/config"
  # Alternatively, use in-cluster config:
  # in_cluster_config = true
}

# Create a dedicated Kubernetes namespace for the app
resource "kubernetes_namespace" "dev" {
  metadata {
    name = "dev"
  }
}
```

### Line-by-line explanation
- provider "kubernetes" { ... }: Declares the Terraform Kubernetes provider and points it at your kubeconfig so Terraform can authenticate to the cluster.
- config_path = "~/.kube/config": Uses your local kubeconfig file to access the cluster.
- resource "kubernetes_namespace" "dev" { ... }: Creates a Kubernetes Namespace resource named "dev" for isolating resources.
- metadata { name = "dev" }: Sets the namespace name to "dev".
  
## 2. Setting Up the Terraform Kubernetes Provider
```hcl
# main.tf (continuation)
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.11"
    }
  }

  # Example remote backend; replace with your real backend
  backend "s3" {
    bucket   = "tf-state-prod"
    key      = "k8s/terraform.tfstate"
    region   = "us-east-1"
    encrypt  = true
  }
}
```

### Line-by-line explanation
- terraform { required_providers { kubernetes = { source = "...", version = "~> 2.11" } } }: Pins the Kubernetes provider to a specific version for reproducibility.
- backend "s3" { ... }: Configures Terraform to store state remotely in an S3 bucket, enabling collaboration and locking.
- bucket, key, region, encrypt: Locations and security for the remote state; replace with your environment’s values.

## 3. Managing Namespaces, Deployments, and Services with Terraform
```hcl
# main.tf (continuation)
resource "kubernetes_namespace" "dev" {
  metadata {
    name = "dev"
  }
}

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.dev.metadata[0].name
  }

  data = {
    LOG_LEVEL = "DEBUG"
    APP_MODE  = "development"
  }
}

resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx-deployment"
    namespace = kubernetes_namespace.dev.metadata[0].name
    labels = {
      app = "nginx"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.21"
          port {
            container_port = 80
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "nginx" {
  metadata {
    name      = "nginx-service"
    namespace = kubernetes_namespace.dev.metadata[0].name
  }

  spec {
    selector = {
      app = "nginx"
    }

    port {
      port        = 80
      target_port = 80
    }

    type = "LoadBalancer"
  }
}
```

### Line-by-line explanation
- kubernetes_namespace "dev" { ... }: Re-confirms creation of the "dev" namespace (idempotent, safe to re-run).
- kubernetes_config_map "app_config" { ... }: Creates a ConfigMap named "app-config" in the "dev" namespace with configuration data.
- metadata { name, namespace = kubernetes_namespace.dev.metadata[0].name }: Sets resource name and explicitly places it in the "dev" namespace for clarity.
- data = { ... }: Key-value configuration data for the app.
- kubernetes_deployment "nginx" { ... }: Defines a Deployment named "nginx-deployment" in the "dev" namespace using 2 replicas.
- metadata { labels = { app = "nginx" } }: Labels the deployment for selection by the Service.
- spec { replicas = 2 ... }: Declares the number of pod replicas and the Pod template.
- selector { match_labels = { app = "nginx" } }: Tells the Deployment how to match pods for this deployment.
- template { metadata { labels = { app = "nginx" } } spec { container { ... } } }: Pod template with a single container.
- container { name = "nginx", image = "nginx:1.21", port { container_port = 80 } }: The application container, exposing port 80.
- kubernetes_service "nginx" { ... }: Creates a Service to expose the Deployment.
- metadata { name = "nginx-service", namespace = ... }: Names the Service and places it in the same namespace.
- spec { selector = { app = "nginx" }, port { port = 80, target_port = 80 }, type = "LoadBalancer" }: Service selects pods with app=nginx, exposes port 80 externally via a LoadBalancer.

## 4. Using Terraform with Helm on Kubernetes
```hcl
# helm.tf (or alongside existing files)
provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

resource "helm_release" "nginx" {
  name       = "nginx"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "nginx"
  version    = "12.0.1"

  namespace = "dev"

  set {
    name  = "service.type"
    value = "LoadBalancer"
  }
}
```

### Line-by-line explanation
- provider "helm" { kubernetes { config_path = "~/.kube/config" } }: Declares the Helm provider and points to the same kubeconfig for cluster access.
- helm_release "nginx" { ... }: Installs a Helm chart (nginx) into the cluster.
- name, repository, chart, version: Chart details and version pin for reproducibility.
- namespace = "dev": Deploys the chart into the "dev" namespace.
- set { name = "service.type", value = "LoadBalancer" }: Overrides the chart’s default value to expose the service externally.

## 5. State Management and Drift Detection
```hcl
# main.tf (continuation)
terraform {
  backend "s3" {
    bucket   = "tf-state-prod"
    key      = "k8s/terraform.tfstate"
    region   = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt  = true
  }
}
```

### Line-by-line explanation
- terraform { backend "s3" { ... } }: Remote state configuration to enable collaboration and locking.
- dynamodb_table = "terraform-locks": Adds a lock table to prevent concurrent writes, reducing the risk of state corruption.
- encrypt = true: Ensures state at rest is encrypted.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code
### Pitfall 1: Not using a remote backend or state locking
Bad:
```hcl
# No backend, every run reads/writes local state
provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

Good:
```hcl
terraform {
  backend "s3" {
    bucket           = "tf-state-prod"
    key              = "k8s/terraform.tfstate"
    region           = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt          = true
  }
}
```

### Pitfall 2: Hardcoding kubeconfig paths and cluster details
Bad:
```hcl
provider "kubernetes" {
  config_path = "$HOME/.kube/config"
}
```

Good:
```hcl
variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}
provider "kubernetes" {
  config_path = var.kubeconfig_path
}
```

### Pitfall 3: No provider version pinning
Bad:
```hcl
provider "kubernetes" {
  # No version pin
}
```

Good:
```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.11"
    }
  }
}
```

### Pitfall 4: Missing namespace scoping leading to drift
Bad:
```hcl
resource "kubernetes_deployment" "nginx" {
  metadata {
    name = "nginx-deployment"
    # no namespace
  }
  # ...
}
```

Good:
```hcl
resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx-deployment"
    namespace = kubernetes_namespace.dev.metadata[0].name
    labels = { app = "nginx" }
  }
  # ...
}
```

### Pitfall 5: Storing secrets as plain data
Bad:
```hcl
resource "kubernetes_secret" "db_creds" {
  metadata { name = "db-creds" }
  data = {
    password = "plaintext-password"
  }
}
```

Good:
```hcl
resource "kubernetes_secret" "db_creds" {
  metadata { name = "db-creds" }

  data = {
    password = base64encode("s3cret!")
  }
}
```

## Y. Why This Matters In Real Systems — production context and real usage
- Reproducibility: IaC ensures you can recreate environments (dev/stage/prod) from code, reducing drift.
- Auditability: Terraform state and plan outputs provide an auditable history of changes and approvals.
- Collaboration: Remote state and locking prevent conflicting changes by multiple engineers.
- CI/CD integration: Terraform plans can be gated by pull requests or pipelines, ensuring changes are reviewed and tested before apply.
- Idempotence and safety: Terraform applies converge to the desired state, even after cluster changes, facilitating safe operations.
- Hybrid workflows: You can combine Terraform with Helm for chart-driven apps and Kubernetes-native resources in a single workflow.

## Z. Study Questions — 5 recall questions
1) What is the purpose of the Terraform Kubernetes provider, and how does it differ from the Helm provider in this workflow?  
2) How do you enable remote state storage and locking for collaborative Terraform work?  
3) How can you reference a Kubernetes Namespace across resources in Terraform?  
4) What is the advantage of using a ConfigMap and a Secret in Kubernetes, and how do you manage them in Terraform?  
5) Why is idempotence important in IaC, and how do providers and backends help achieve it in production scenarios?

## Exercise — Practical multi-part coding challenge
Goal: Build a small, reproducible Terraform setup that deploys a minimal app to a Kubernetes cluster, with a namespace, deployment, service, a ConfigMap, and a Helm-based component. You will run it locally (pointing to your cluster) or in CI with appropriate credentials.

Part A — Project structure and provider setup
- Create a Terraform project with:
  - A Kubernetes provider configured via kubeconfig, and a separate Helm provider for a chart.
  - A remote backend (S3 + DynamoDB) for state locking (you can stub values if necessary for the exercise).
- Deliverables:
  - main.tf with provider blocks and backend config.
  - variables.tf to parameterize kubeconfig_path and namespace.

Part B — Namespace and basic app resources
- Define a namespace named "dev".
- Create a ConfigMap named "app-config" in the "dev" namespace with two keys: LOG_LEVEL and APP_MODE.
- Create a Deployment "nginx-deploy" using image nginx:1.21 to run 2 replicas, labeling pods with app=nginx.
- Create a Service "nginx-svc" of type LoadBalancer that exposes port 80 and selects app=nginx.

Part C — Secrets and best practices
- Create a Kubernetes Secret named "db-creds" with a key "password" that uses base64 encoding.
- Reference the secret from a Pod/Deployment or simply store it for demonstration (avoid embedding secret values directly in code).

Part D — Helm integration (optional)
- Use the Helm provider to install the Bitnami nginx chart into the dev namespace, overriding the service type to LoadBalancer.
- Ensure it does not conflict with the Deployment you created; explain how you’d migrate or de-conflict resources if needed.

Part E — Validation and outputs
- Add outputs to print the external IP of the nginx service (if available) and the namespace name.
- Run commands you would use to validate:
  - terraform init
  - terraform plan
  - terraform apply
  - Retrieve the external IP for the nginx Service (via kubectl or the Terraform output)

Notes and tips
- If your cluster does not provide an external LoadBalancer IP (e.g., on bare metal or minikube), you can switch to NodePort and adapt the output accordingly.
- In CI, pin the Terraform version and use a minimal, locked set of provider versions to ensure reproducibility.
- Always review drift between Terraform state and actual cluster state by running terraform plan before apply.

End of lesson.