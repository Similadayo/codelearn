# Track: DevOps & Cloud Engineering — Phase 3: Infrastructure as Code with Terraform on Google Cloud

Infrastructure as Code (IaC) lets you model, provision, and manage Google Cloud resources declaratively. Terraform is a leading IaC tool that enables versioned, reproducible infrastructure across environments. In this module, you’ll learn how to express GCP resources with Terraform, manage state, and apply best practices for collaboration, security, and reliability in production systems.

## 1. Getting Started with Terraform on Google Cloud

In this section, you’ll set up a minimal Terraform project configured for Google Cloud. You’ll learn how to declare the provider, manage required versions, and enable the Compute Engine API as a prerequisite for provisioning resources.

```hcl
# terraform.tf
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0"
    }
  }

  # Start with a local backend for learning; switch to remote backend for teams.
  backend "local" {
  }
}

# variables.tf
variable "project" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for regional resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "credentials_file" {
  description = "Path to GCP service account JSON key (optional; uses ADC if omitted)"
  type        = string
  default     = ""
}

# main.tf
provider "google" {
  project     = var.project
  region      = var.region
  # If credentials_file is provided, load it; otherwise rely on ADC.
  credentials = var.credentials_file != "" ? file(var.credentials_file) : null
}

# Optional: enable essential APIs (idempotent)
resource "google_project_service" "compute_api" {
  service = "compute.googleapis.com"
}
```

### Line-by-line explanation
- terraform block: Declares required Terraform version and the Google provider version constraint to ensure compatibility.
- required_providers: Pins the google provider to a compatible major version to avoid breaking changes.
- backend "local": Uses a local state file for learning; teams should switch to a remote backend.
- variables: Define project, region, zone, and credentials_path as inputs to customize deployments without editing code.
- provider "google": Configures the provider with project, region, and optional credentials. If credentials_file is empty, the provider uses Application Default Credentials (ADC).
- google_project_service: Ensures the Compute Engine API is enabled for the project. This is idempotent; re-running won’t fail if already enabled.

## 2. Building a VPC and Subnet in GCP with Terraform

A well-scoped VPC and subnet provide network isolation for your workloads. This section demonstrates creating a custom mode VPC (no implicit subnets) and a region-bound subnet, plus an inbound firewall rule for basic SSH access.

```hcl
# network.tf
resource "google_compute_network" "vpc_network" {
  name                    = "demo-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "demo-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}
  
resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  direction     = "INGRESS"
}
```

### Line-by-line explanation
- google_compute_network: Creates a VPC in “custom mode” with no pre-made subnets, enabling full control over IP ranges.
- google_compute_subnetwork: Defines a region-specific subnet within the VPC and assigns a CIDR.
- google_compute_firewall: Allows inbound SSH (port 22) from anywhere. In production, restrict source_ranges to trusted IPs instead of 0.0.0.0/0.

## 3. Deploying a Compute Engine VM in the VPC with Terraform

This section provisions a simple Linux VM within the VPC and subnet. It demonstrates boot disk initialization with a Debian image, a network interface with an external IP, and optional SSH metadata.

```hcl
# compute.tf
variable "zone" {
  description = "zone for compute resources"
  type        = string
  default     = "us-central1-a"
}

variable "ssh_public_key" {
  description = "SSH public key for the VM (optional)"
  type        = string
  default     = ""
}

resource "google_compute_instance" "vm_instance" {
  name         = "demo-vm"
  machine_type = "e2-medium"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "projects/debian-cloud/global/images/debian-11-bullseye-v20230411"
    }
  }

  network_interface {
    network    = google_compute_network.vpc_network.name
    subnetwork = google_compute_subnetwork.subnet.name
    access_config {
      # Creates an ephemeral external IP
    }
  }

  metadata = {
    ssh-keys = var.ssh_public_key != "" ? "terraform:${var.ssh_public_key}" : ""
  }

  service_account {
    email  = "default"
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  tags = ["web"]
}
```

### Line-by-line explanation
- variable "zone": Sets the VM’s zone; defaults to us-central1-a for convenience.
- variable "ssh_public_key": Optional SSH key to populate the VM's metadata for SSH access.
- google_compute_instance: Creates a single VM with a Debian image, a specified machine type, and a boot disk.
- boot_disk.initialize_params.image: Selects the OS image to boot from (Debian 11 in this example).
- network_interface: Attaches the VM to the VPC and subnet; access_config creates an external IP.
- metadata: Includes optional SSH keys in the instance metadata for initial access; if not provided, no keys are added.
- service_account: Grants the VM a default service account with cloud-platform scope for API access if needed.
- tags: Optional network tags for firewall rules and tooling.

## 4. State Management and Remote Backends

For teamwork and reliability, store Terraform state remotely and enable state locking to prevent concurrent operations. This section shows configuring a Google Cloud Storage (GCS) backend.

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "terraform/state"
  }
}
```

### Line-by-line explanation
- backend "gcs": Switches from local state to a remote GCS backend.
- bucket: The GCS bucket that will store the Terraform state file (.tfstate).
- prefix: A path prefix within the bucket to organize state files, enabling per-environment or per-workspace separation.

Note: You must create the GCS bucket beforehand or allow Terraform to create it if your permissions permit. After adding this backend, run terraform init to migrate or initialize the remote state.

## 5. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Not pinning provider versions
  - Bad:
    provider "google" {}
  - Good:
    terraform {
      required_providers {
        google = {
          source  = "hashicorp/google"
          version = ">= 4.0"
        }
      }
    }

- Pitfall 2: Using a local backend for collaboration
  - Bad:
    backend "local" {}
  - Good:
    backend "gcs" {
      bucket = "my-terraform-state-bucket"
      prefix = "terraform/state"
    }

- Pitfall 3: Not enabling required APIs
  - Bad:
    (no API enablement)
  - Good:
    resource "google_project_service" "compute_api" {
      service = "compute.googleapis.com"
    }

- Pitfall 4: Hard-coding values instead of using variables
  - Bad:
    resource "google_compute_instance" "vm_instance" {
      zone = "us-central1-a"
      machine_type = "e2-medium"
      boot_disk { initialize_params { image = "debian-11" } }
      # ...
    }
  - Good:
    resource "google_compute_instance" "vm_instance" {
      zone         = var.zone
      machine_type = var.machine_type
      boot_disk {
        initialize_params {
          image = var.image_id
        }
      }
      # ...
    }
  - And in variables.tf:
    variable "zone" { default = "us-central1-a" }
    variable "machine_type" { default = "e2-medium" }
    variable "image_id" { default = "projects/debian-cloud/global/images/debian-11-bullseye-v20230411" }

- Pitfall 5: Neglecting security and IAM
  - Bad:
    # VM with broad access
    // No IAM or service account scoping
  - Good:
    resource "google_service_account" "vm_sa" {
      account_id   = "vm-sa"
      display_name = "VM Service Account"
    }

    resource "google_project_iam_member" "vm_sa_time" {
      project = var.project
      role    = "roles/logging.logWriter"
      member  = "serviceAccount:${google_service_account.vm_sa.email}"
    }

    // Attach service account and restrict firewall rules to trusted sources
    // (e.g., limit SSH source ranges in production)

- Pitfall 6: Not validating with Terraform
  - Bad:
    terraform apply
  - Good:
    terraform fmt
    terraform validate
    terraform plan -out=tfplan
    terraform apply "tfplan"

## 6. Why This Matters In Real Systems — Production Context and Real Usage

- Reproducibility and versioning: Infrastructure is captured as code, enabling consistent environments across dev, staging, and prod.
- Team collaboration: Remote state with locking prevents conflicting changes and supports multiple engineers working concurrently.
- Drift detection: Regular runs detect drift between what is declared and what exists, prompting remediation through apply.
- CI/CD integration: Terraform can be invoked from CI pipelines, gating deployments with plan approval and automated tests.
- Cost management: Parameterize machine sizes and regions to balance cost; tag resources for cost allocation; use "count" or "for_each" to manage multiple similar resources.
- Security and compliance: Use service accounts with minimal scopes, rotate credentials, and store secrets in Secret Manager rather than in code.
- Observability and gating: Outputs expose essential runtime data (e.g., external IPs) for integration with other tooling; IAM and firewall rules enforce least privilege.
- Operational patterns: Prefer modules for reuse, enforce naming conventions, and maintain a well-documented repo with a clear upgrade path for provider versions.

## 7. Study Questions — 5 Recall Questions

1. What is the primary purpose of Infrastructure as Code, and how does Terraform help you manage Google Cloud resources?
2. Why is enabling the Compute Engine API a common prerequisite before provisioning resources with Terraform on GCP?
3. How do remote backends (e.g., GCS) improve collaboration and safety in Terraform workflows?
4. What are two key security considerations when provisioning a VM in GCP using Terraform?
5. What is drift in IaC, and how do Terraform plan and apply help detect and remediate drift?

## 8. Exercise — Practical Multi-part Coding Challenge

Goal: Build a small, reproducible GCP environment using Terraform that demonstrates networks, a VM, and safe state management. Complete parts A–D and provide a ready-to-run repository structure.

Part A — Baseline network and a single VM
- Create a VPC, a region subnet, and a firewall rule that allows SSH only from a trusted IP (for example, 203.0.113.0/24).
- Provision a Debian-based Compute Engine VM in us-central1-a with a public IP and a basic SSH key (via metadata).
- Output the VM's external IP.

Code sketch (root project):
- Include main.tf with provider config, network.tf for VPC/subnet/firewall, and compute.tf for the VM.
- variables.tf for project, region, zone, image, and ssh_public_key.
- outputs.tf to expose vm_ip.

Part B — Parameterization and outputs
- Add variables for machine_type, image_id, and ssh_public_key.
- Create outputs for: VM external IP and SSH access command.

Part C — Module-based network module
- Create a module at modules/network with:
  - main.tf: google_compute_network, google_compute_subnetwork, google_compute_firewall
  - outputs.tf: network_id, subnet_id, firewall_id
- In root/main.tf, call module "network" and use its outputs to wire the VM.

Part D — Remote state with GCS
- Configure a Google Cloud Storage bucket and switch the backend to "gcs" in the root Terraform configuration.
- Ensure you initialize the backend and migrate state with terraform init.
- Add a simple plan step in the CI/CD workflow (e.g., a GitHub Actions or GitLab CI job) to run terraform fmt, validate, plan, and apply in a controlled environment.

What you should deliver
- A complete Terraform project structure with:
  - A root module (main.tf, variables.tf, outputs.tf, backend.tf)
  - A network module (modules/network/main.tf, modules/network/outputs.tf)
  - A clear README.md with setup steps, prerequisites (Terraform CLI, gcloud, credentials), and how to run terraform init/plan/apply.
- Example values (as placeholders) for project ID, region, zone, and credentials path in a separate vars.sample or README to guide learners.
- A short section in the README explaining how to switch from the local backend to a remote backend for collaboration and how to apply changes safely.

Notes for instructors
- Emphasize best practices: avoid hard-coding secrets, use environment variables or a separate credentials file, pin provider versions, and enable only necessary APIs.
- Encourage students to run terraform fmt and terraform validate before plan.
- Demonstrate a simple CI idea: upon PR, run terraform fmt, validate, and plan to show reviewers the planned changes, then require manual approval to apply in a staging or prod environment.
- Remind students to run terraform apply only after reviewing the plan, especially when multiple resources exist or when using remote backends.