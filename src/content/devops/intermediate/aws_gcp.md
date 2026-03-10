# AWS Cloud Provider Deep Dive for IaC (Phase 3) – DevOps & Cloud Engineering (Google Cloud Stack)

Intro: In this phase of Infrastructure as Code (IaC), you’ll dive deep into the AWS cloud provider using Terraform from a Google Cloud–based workflow. You’ll learn how to securely authenticate, model core AWS resources (VPCs, subnets, security groups, EC2, S3), manage state remotely with Google Cloud Storage as the Terraform backend, and compose reusable modules. This deep dive demonstrates cross-cloud IaC practices: you can manage AWS resources from Google Cloud CI/CD pipelines, orchestrate state with GCS, and apply production-grade patterns such as version pinning, environment separation, and testable modules.

---

## 1. AWS Provider Basics in Terraform (with Google Cloud backend)

Terraform is the lingua franca for IaC across clouds. This section introduces a minimal Terraform config that wires the AWS provider, uses a Google Cloud Storage (GCS) backend to store state (suitable for Google Cloud–hosted CI/CD), and provisions a simple S3 bucket to demonstrate core AWS resource management. We’ll pin the provider, declare environment variables, and emit a small output.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "tf-state-gcp-demo"
    prefix = "aws/provider"
  }
}

variable "aws_region" {
  description = "AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

variable "env" {
  description = "Environment name (dev/stage/prod)"
  type        = string
  default     = "dev"
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "demo" {
  bucket = "tf-demo-${var.env}-bucket-${data.aws_caller_identity.current.account_id}"
  acl    = "private"

  versioning {
    enabled = true
  }

  tags = {
    Environment = var.env
    Terraform   = "true"
  }
}

output "bucket_name" {
  value = aws_s3_bucket.demo.bucket
}
```

### Line-by-line explanation breaking down each line

- terraform { ... }: Declares the Terraform configuration block, pins the AWS provider version, and configures the Google Cloud Storage backend for state storage.
- required_providers { aws = { source = "hashicorp/aws" version = "~> 5.0" } }: Specifies the AWS provider source and version constraints to ensure reproducible builds.
- backend "gcs" { bucket = "tf-state-gcp-demo" prefix = "aws/provider" }: Uses Google Cloud Storage as the backend to store Terraform state, enabling remote, collaborative state management in a Google Cloud environment.
- variable "aws_region" { ... default = "us-east-1" }: Declares a configurable AWS region.
- variable "aws_profile" { ... default = "default" }: Declares a configurable AWS CLI profile to fetch credentials from the local environment.
- variable "env" { ... default = "dev" }: Declares an environment identifier for naming and environment separation.
- provider "aws" { region = var.aws_region, profile = var.aws_profile }: Configures the AWS provider with the chosen region and credentials source.
- data "aws_caller_identity" "current" {}: Reads the current AWS account context to derive a unique bucket name.
- resource "aws_s3_bucket" "demo" { ... }: Creates a private S3 bucket with versioning enabled and environment tags.
- bucket = "tf-demo-${var.env}-bucket-${data.aws_caller_identity.current.account_id}": Constructs a unique bucket name using environment and account ID to reduce collision risk.
- versioning { enabled = true }: Enables S3 versioning to protect against object overwrites and deletions.
- tags = { Environment = var.env, Terraform = "true" }: Applies metadata for governance and auditing.
- output "bucket_name" { value = aws_s3_bucket.demo.bucket }: Exposes the bucket name for downstream usage or debugging.

---

## 2. Authentication and Security Best Practices

 secure and scalable AWS credentials handling is critical in IaC. This section shows common patterns for authenticating to AWS from a Google Cloud–hosted CI/CD or local development environment, including environment-based credentials, assuming roles, and explicit credential sources. These patterns help avoid hard-coding secrets and enable secure role-based access.

```hcl
# Approach A: Use environment variables (no hard-coded credentials in code)
provider "aws" {
  region = var.aws_region
  # Credentials are loaded from:
  # - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  # - AWS_PROFILE or instance role if running on AWS compute
}
```

```hcl
# Approach B: Assume an IAM Role (recommended for CI/CD)
provider "aws" {
  region = "us-west-2"

  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/TerraformRole"
    session_name = "tf-session"
  }

  # You can still rely on environment or profile for initial credentials
}
```

```hcl
# Approach C: Use a dedicated credentials file and profile
provider "aws" {
  region                  = var.aws_region
  shared_credentials_file = "/path/to/.aws/credentials"
  profile                 = "terraform"
}
```

### Line-by-line explanation breaking down each line

- provider "aws" { region = var.aws_region }: Declares the AWS provider and uses a variable for the region to keep the config portable.
- assume_role { role_arn = ..., session_name = "tf-session" }: Tells Terraform to assume a specific IAM role for all subsequent API calls, enabling cross-account or restricted access in CI/CD contexts.
- shared_credentials_file = "/path/to/.aws/credentials" and profile = "terraform": Directs Terraform to use a dedicated credentials file and named profile, avoiding hard-coded keys in code.
- The comments explain the rationale: avoid embedding keys; leverage roles for automation; environment-based credentials fit Google Cloud CI/CD pipelines or GitHub Actions.

---

## 3. Core AWS Resources with Infra as Code (VPC, Subnet, SG, EC2, and S3)

This section demonstrates a practical, production-oriented setup: a VPC with a public subnet, an Internet Gateway, a route to the Internet, a security group, an EC2 instance, and an S3 bucket (from Section 1) to show cross-resource relationships. The example uses a data source to obtain a current Ubuntu AMI and user data to bootstrap a basic web server.

```hcl
# Ubuntu AMI for a recent LTS release
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-20.04-amd64-server-*"]
  }
}
```

```hcl
# Networking: VPC, public Subnet, Internet Gateway, Route Table
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "tf-dev-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = { Name = "tf-dev-subnet-public" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "tf-dev-igw" }
}

resource "aws_route_table" "rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "tf-dev-rt" }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.rt.id
}
```

```hcl
# Security Group allowing SSH and HTTP
resource "aws_security_group" "web_sg" {
  name        = "tf-dev-web-sg"
  description = "Allow SSH and HTTP"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # all
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "tf-dev-web-sg" }
}
```

```hcl
# EC2 Instance provisioned in the public subnet
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              hostnamectl set-hostname web
              apt-get update -y
              apt-get install -y nginx
              systemctl enable nginx
              systemctl start nginx
              EOF

  tags = {
    Name = "tf-dev-web"
    Environment = var.env
  }
}
```

### Line-by-line explanation breaking down each line

- data "aws_ami" "ubuntu" { ... }: Finds the most recent Ubuntu 20.04 LTS AMI owned by Canonical to boot the EC2 instance.
- resource "aws_vpc" "main" { ... }: Creates a VPC with DNS support and hostnames for internal addressing and resolution.
- resource "aws_subnet" "public" { ... }: Creates a public subnet within the VPC and allows auto-assign of public IPs.
- resource "aws_internet_gateway" "igw" { ... }: Attaches an Internet Gateway to the VPC to enable outbound Internet access.
- resource "aws_route_table" "rt" { ... }: Defines a route to 0.0.0.0/0 via the Internet Gateway.
- resource "aws_route_table_association" "public_assoc" { ... }: Associates the route table with the public subnet.
- resource "aws_security_group" "web_sg" { ... }: Defines inbound rules for SSH and HTTP and a permissive outbound rule.
- resource "aws_instance" "web" { ... }: Launches a t3.micro Ubuntu server in the public subnet, associates the web SG, bootstraps with Nginx, and serves HTTP.
- data.aws_ami.ubuntu.id is used as the AMI for the EC2 instance ensuring a known, recent image.
- user_data script auto-installs and starts Nginx to serve a basic web page on port 80.

---

## 4. State Management, Backends, and Workspaces (AWS IaC from Google Cloud)

State management is critical for collaboration and safe rollbacks. In a Google Cloud–hosted IaC workflow, you can store Terraform state in Google Cloud Storage (GCS) and use workspaces to separate environments. This section demonstrates configuring a GCS backend, enabling multiple environments, and validating your workspace strategy.

```hcl
terraform {
  backend "gcs" {
    bucket = "tf-state-gcp-demo"
    prefix = "prod/aws"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

```bash
# Initialize Terraform (from Google Cloud CI/CD or local)
terraform init

# Create and switch to a new workspace for prod
terraform workspace new prod
terraform workspace select prod

# Plan and apply for the prod workspace
terraform plan -out=tfplan
terraform apply tfplan
```

### Line-by-line explanation breaking down each line

- backend "gcs" { bucket = "tf-state-gcp-demo" prefix = "prod/aws" }: Configures the Google Cloud Storage backend to store Terraform state for the prod/aws environment, enabling remote state and concurrency control.
- required_providers.aws: Reasserts provider constraints ensuring consistent AWS provider behavior across environments.
- terraform init: Initializes the backend configuration and downloads providers, preparing the working directory for a backend-backed run.
- terraform workspace new prod and terraform workspace select prod: Creates and switches to a dedicated Terraform workspace to isolate state for production deployments, enabling multiple environments (dev, stage, prod) in a single configuration.
- terraform plan -out=tfplan; terraform apply tfplan: Generates an execution plan and applies it to reach the desired state, enabling review before applying changes.

---

## 5. Modules, Reuse, and Composition

As projects scale, you want reusable, testable pieces of infrastructure. This section shows how to structure a VPC as a module and consume it in a top-level configuration. It also demonstrates how to keep secrets and environment-specific values decoupled from module logic.

```hcl
# top-level: main.tf
module "vpc" {
  source            = "./modules/vpc"
  cidr_block        = "10.0.0.0/16"
  enable_dns        = true
  environment       = var.env
}
```

```hcl
# modules/vpc/main.tf
variable "cidr_block" { type = string }
variable "enable_dns" { type = bool; default = true }
variable "environment" { type = string }

resource "aws_vpc" "this" {
  cidr_block = var.cidr_block
  enable_dns_support   = var.enable_dns
  enable_dns_hostnames = var.enable_dns

  tags = {
    Environment = var.environment
    Name        = "tf-vpc-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr_block, 8, 1)
  map_public_ip_on_launch = true

  tags = { Name = "tf-vpc-${var.environment}-subnet" }
}
```

### Line-by-line explanation breaking down each line

- module "vpc" { source = "./modules/vpc" cidr_block = "10.0.0.0/16" ... }: Demonstrates a reusable module call that abstracts VPC creation and exposes parameters for customization.
- variable "cidr_block" { type = string }: Declares a module input for the VPC CIDR block.
- resource "aws_vpc" "this" { ... }: Creates a VPC with DNS support based on module inputs and environment tagging.
- resource "aws_subnet" "public" { vpc_id = aws_vpc.this.id ... }: Creates a public subnet within the VPC, using a helper function cidrsubnet to derive a child subnet range.
- tags = { Name = "tf-vpc-${var.environment}-subnet" }: Tags for governance and traceability.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Credentials in code (Bad) vs credentials from environment or roles (Good)
  Bad:
  ```hcl
  provider "aws" {
    region     = "us-east-1"
    access_key = "AKIA...SECRET"
    secret_key = "SECRET"
  }
  ```
  Good:
  ```hcl
  provider "aws" {
    region = "us-east-1"
    # No keys in code; rely on env vars or IAM roles
  }
  ```

- Pitfall 2: Local state vs remote state (Bad) vs remote state with a cross-cloud backend (Good)
  Bad:
  ```hcl
  terraform {
    backend "local" {}
  }
  ```
  Good:
  ```hcl
  terraform {
    backend "gcs" {
      bucket = "tf-state-gcp-demo"
      prefix = "prod/aws"
    }
  }
  ```

- Pitfall 3: Not parameterizing environment and region (Bad) vs parameterized (Good)
  Bad:
  ```hcl
  resource "aws_vpc" "main" {
    cidr_block = "10.0.0.0/16"
  }
  ```
  Good:
  ```hcl
  variable "vpc_cidr" { type = string; default = "10.0.0.0/16" }
  variable "region"   { type = string; default = "us-east-1" }

  provider "aws" { region = var.region }

  resource "aws_vpc" "main" {
    cidr_block = var.vpc_cidr
  }
  ```

- Pitfall 4: Ignoring tags and naming conventions (Bad) vs consistent tagging (Good)
  Bad:
  ```hcl
  resource "aws_instance" "web" {
    ami           = data.aws_ami.ubuntu.id
    instance_type = "t3.micro"
  }
  ```
  Good:
  ```hcl
  resource "aws_instance" "web" {
    ami           = data.aws_ami.ubuntu.id
    instance_type = "t3.micro"

    tags = {
      Environment = var.env
      Project     = "tf-demo"
    }
  }
  ```

- Pitfall 5: Skipping modularization for complex infra (Bad) vs modular design (Good)
  Bad:
  ```hcl
  # All resources in one file -> hard to test and reuse
  resource "aws_vpc" "main" { ... }
  resource "aws_subnet" "public" { ... }
  resource "aws_instance" "web" { ... }
  ```
  Good:
  ```hcl
  # Use a VPC module and compose with other modules
  module "vpc" { source = "./modules/vpc" ... }
  module "webserver" { source = "./modules/webserver" ... }
  ```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: IaC enforces a reproducible path from code to infrastructure, enabling consistent environments across dev, test, staging, and prod.
- Collaboration and governance: Versioned infrastructure code supports code reviews, branching, and rollback, just like application code.
- Security and compliance: Parameterization and role-based access minimize secrets leakage and enforce least-privilege access patterns.
- Cross-cloud workflows: Using a Google Cloud storage backend for Terraform state lets Google Cloud CI/CD pipelines manage AWS resources, enabling true multi-cloud deployment pipelines.
- Observability and auditing: Tags, naming conventions, and outputs create a clear resource ledger, aiding audits and incident response.
- Operational resilience: Remote state with locking reduces the risk of concurrent apply conflicts and drift, enabling safer blue/green and canary deployments.

---

## Z. Study Questions — 5 recall questions

1. What is the purpose of configuring a Terraform backend, and why might you choose Google Cloud Storage (GCS) as the backend in a Google Cloud environment?
2. How can you securely authenticate to AWS from a Terraform configuration without embedding credentials in code?
3. How do you fetch the most recent Ubuntu AMI for use with an EC2 instance in Terraform?
4. What is the benefit of using Terraform modules, and how would you structure a simple VPC module for reuse?
5. What are two common risks of using local state, and how does a remote backend mitigate them?

---

## Exercise — a practical multi-part coding challenge

Goal: Build a small, multi-environment AWS infrastructure using Terraform, with a reusable VPC module, a public subnet, a security group for web access, an EC2 instance behind a simple load-like setup (nginx), and a separate S3 bucket. Use a Google Cloud Storage backend for state, and demonstrate workspace-based environment separation (dev, prod). The exercise should be executed from a Google Cloud environment (e.g., Cloud Build or Cloud Shell) to align with the course’s Google Cloud stack.

Part A — Create a reusable VPC module
- Implement a module at modules/vpc with:
  - Inputs: cidr_block (string), enable_dns (bool), environment (string)
  - Outputs: vpc_id, public_subnet_id
  - Resources: aws_vpc, aws_subnet (public) with the given CIDR and DNS options
- Provide a sample usage in a top-level main.tf that calls the module with cidr_block = "10.1.0.0/16" and environment = "dev".

Part B — Top-level infrastructure
- In the root module, configure:
  - backend "gcs" with bucket "tf-state-gcp-demo" and prefix "envs/${var.environment}"
  - provider "aws" using region and a safe credentials approach (env vars or assume_role)
  - data "aws_ami" to fetch Ubuntu 20.04 LTS
  - a security group allowing HTTP (80) and SSH (22)
  - an EC2 instance in the public subnet using the AMI from data.aws_ami
  - an S3 bucket from Section 1 that demonstrates object storage
- Use variables:
  - environment (default "dev"), region (default "us-east-1")

Part C — Workspaces and environments
- Initialize Terraform, create two workspaces prod and dev, and plan/apply to both (without reusing state across environments).
- Demonstrate how to switch environments using Terraform workspaces and show separate state in GCS for both.

Part D — Validation and hygiene
- Add basic tagging for resources using the environment name plus a project tag.
- Pin provider versions and add a minimal module-based approach for VPC to show reuse.

Tips and checkpoints:
- Do not embed AWS credentials in code. Use the environment or a role assumption approach.
- Use a unique S3 bucket name in real projects; this exercise can use a deterministic name for demonstration only.
- Run terraform init before any plan or apply, to initialize the backend and providers.
- Use terraform fmt and terraform validate as part of your workflow.

Deliverables:
- A working Terraform configuration that demonstrates the AWS provider deep dive topics, with a Google Cloud backend, and a multi-environment workflow.
- A short README.md (or inline comments) describing how to run the exercise, including prerequisite steps to configure Google Cloud storage bucket for the Terraform backend and AWS credentials method.

Note: This lesson intentionally blends AWS IaC with a Google Cloud-backed state backend to reflect real-world, cross-cloud CI/CD practices. In production, align the backend, credentials management, and naming conventions with your organization’s security and governance policies.