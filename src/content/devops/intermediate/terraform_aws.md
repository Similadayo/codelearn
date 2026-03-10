# Infrastructure as Code with Terraform (AWS)

Terraform enables you to define and manage your AWS infrastructure as code. This module covers how to use Terraform to provision, version, and orchestrate AWS resources in a reproducible, auditable, and scalable way. In real-world DevOps and Cloud Engineering, IaC is the backbone of predictable environments, CI/CD pipelines, and automated deployments.

## 1. Terraform Essentials: Providers, Resources, Variables, and Outputs

In this section, you’ll see a cohesive Terraform configuration that uses the AWS provider to create a versioned S3 bucket and a simple EC2 instance, parameterized by variables. This demonstrates the core building blocks you’ll reuse across projects.

```hcl
# 1) Terraform configuration with providers, variables, and resources

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# AWS region to deploy into (can be overridden with -var or a .tfvars file)
variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

# A simple, explicit provider configuration
provider "aws" {
  region = var.aws_region
}

# A small, random suffix to avoid naming collisions
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# An S3 bucket with versioning enabled (demo state or artifacts)
resource "aws_s3_bucket" "demo_bucket" {
  bucket = "tf-demo-bucket-${random_id.bucket_suffix.hex}"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Environment = "DevOps-Training"
    Project     = "IaC-Workshop"
  }
}

# A data source to fetch the latest Amazon Linux 2 AMI for the current region
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# A security group allowing HTTP and SSH (for demo purposes; restrict in production)
resource "aws_security_group" "web_sg" {
  name        = "tf-demo-web-sg"
  description = "Allow inbound SSH and HTTP traffic"
  vpc_id      = aws_vpc.demo_vpc.id

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
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = "DevOps-Training"
  }
}

# A minimal VPC to place resources in
resource "aws_vpc" "demo_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "tf-demo-vpc"
  }
}

# A public subnet for the EC2 instance
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.demo_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "tf-demo-subnet-public"
  }
}

# Route table and internet gateway to enable internet access
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.demo_vpc.id

  tags = {
    Name = "tf-demo-igw"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.demo_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "tf-demo-public-rt"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public_rt.id
}

# Data source for AZs (to avoid hard-coding AZ names)
data "aws_availability_zones" "available" {}
  
# EC2 instance in the public subnet
resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              amazon-linux-extras install -y nginx1
              systemctl enable nginx
              systemctl start nginx
              EOF

  tags = {
    Name = "tf-demo-web"
  }

  # Optional: prevent accidental destruction of the instance
  # lifecycle {
  #   prevent_destroy = true
  # }
}
```

### Line-by-line explanation
- terraform block: defines required Terraform version and providers (AWS and Random) with versions to ensure compatibility.
- variable "aws_region": allows overriding the deployment region via CLI or tfvars.
- provider "aws": configures the AWS provider to use the chosen region.
- resource "random_id": creates a short, random suffix to avoid name collisions for the bucket.
- resource "aws_s3_bucket": creates a private S3 bucket with versioning and SSE for basic data protection.
- data "aws_ami": queries the latest Amazon Linux 2 AMI in the current region for the EC2 instance.
- resource "aws_security_group": defines inbound/outbound rules for SSH and HTTP within the VPC, enabling access from anywhere (adjust for production).
- resource "aws_vpc": creates a new VPC with DNS resolution enabled to support internal resources and DNS lookups.
- resource "aws_subnet": creates a public subnet within the VPC, enabling public IP assignment on launch.
- resource "aws_internet_gateway": creates an IGW to provide internet access to the VPC.
- resource "aws_route_table" and "aws_route_table_association": establish basic routing for the subnet to reach the internet via the IGW.
- data "aws_availability_zones": fetches available AZs to pick one dynamically, avoiding hard-coded AZ names.
- resource "aws_instance": launches an EC2 instance in the public subnet using the latest Amazon Linux 2 AMI, with a user data script that installs and starts Nginx on boot.

## 2. State Management and Modules: Backends and Reusable Components

In real deployments, storing Terraform state remotely and modularizing configurations are critical for collaboration and reliability. This section shows how to configure a remote backend (S3 + DynamoDB for locking) and how to compose configurations with modules.

```hcl
# 2) Backend configuration for remote state + a simple module usage

# Backend configuration (remote state)
terraform {
  backend "s3" {
    bucket         = "tf-state-prod-demo"        # replace with your bucket
    key            = "phase3/infrastructure.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-state-locks"            # for state locking
    encrypt        = true
  }
}

# Example module usage (reusable, opinionated VPC + networking)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.15.0"

  name = "devops-training-vpc"
  cidr = "10.1.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  private_subnets = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = "DevOps-Training"
  }
}
```

### Line-by-line explanation
- terraform { backend "s3" { ... } }: configures Terraform to use an S3 bucket as the remote state store, with a DynamoDB table for optimistic locking. This makes state shareable and concurrency-safe across teammates and CI pipelines.
- module "vpc": consumes a well-tested, maintained VPC module from the Terraform Registry. This demonstrates modular design, abstraction, and reuse to reduce boilerplate and promote consistency.

## 3. Networking and Compute: VPC, Subnets, and EC2

This section focuses on constructing a basic but production-relevant network layout and launching an EC2 instance within it. It combines the VPC, subnets, routing, security groups, and compute resources into a cohesive, learnable pattern.

```hcl
# 3) Networking + Compute: VPC, public subnet, security group, and EC2

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

# Data is included in Section 1; redefining for standalone clarity
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Public subnet + VPC from Section 1 are re-declared here for clarity in a standalone exercise
resource "aws_vpc" "demo_vpc" {
  cidr_block           = "10.2.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "tf-demo-vpc-2"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.demo_vpc.id
  cidr_block              = "10.2.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = {
    Name = "tf-demo-subnet-public-2"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.demo_vpc.id

  tags = {
    Name = "tf-demo-igw-2"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.demo_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "tf-demo-public-rt-2"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_security_group" "web_sg" {
  name        = "tf-demo-web-sg-2"
  description = "Allow HTTP/S traffic to EC2"
  vpc_id      = aws_vpc.demo_vpc.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tf-demo-web-sg-2"
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              amazon-linux-extras install -y nginx1
              systemctl enable nginx
              systemctl start nginx
              EOF

  tags = {
    Name = "tf-demo-web-2"
  }
}
```

### Line-by-line explanation
- provider and variable: set the region from a variable to demonstrate flexibility.
- data "aws_ami": fetches the latest Amazon Linux AMI for EC2 provisioning.
- aws_vpc: creates a dedicated VPC for the demo network.
- aws_subnet: creates a public subnet within the VPC.
- aws_internet_gateway, aws_route_table, and aws_route_table_association: establish internet access for the subnet.
- data "aws_availability_zones" is omitted here in favor of a fixed AZ for simplicity; you could query AZs similarly to Section 1.
- aws_security_group: allows HTTP and SSH traffic into the instance; adjust rules for production (e.g., restrict SSH to a known IP).
- aws_instance: launches a t3.micro instance in the public subnet with a startup script that installs and runs Nginx.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Hard-coded credentials vs using environment or profile-based authentication
  - Bad:
    ```
    provider "aws" {
      access_key = "AKIA..."
      secret_key = "abcd..."
      region     = "us-east-1"
    }
    ```
  - Good:
    ```
    provider "aws" {
      region = "us-east-1"
    }
    ```
  - Why it matters: hard-coding credentials leaks secrets into code, repos, and CI logs. Use AWS IAM roles, environment variables, or named profiles.

- Pitfall 2: Local state in version control vs remote state
  - Bad (local state):
    ```
    terraform {
      backend "local" {}
    }
    ```
  - Good (remote state for teams):
    ```
    backend "s3" {
      bucket = "tf-state-prod-demo"
      key    = "phase3/infrastructure.tfstate"
      region = "us-east-1"
      dynamodb_table = "tf-state-locks"
      encrypt = true
    }
    ```
  - Why it matters: local state is prone to drift, hard to share, and can cause conflicts in team environments. Remote state enables collaboration and locking.

- Pitfall 3: Not parameterizing values; embedding secrets and environment specifics
  - Bad:
    ```
    resource "aws_instance" "web" {
      ami           = "ami-0abcdef1234567890"
      instance_type = "t2.micro"
      tags = { Environment = "Dev" }
    }
    ```
  - Good:
    ```
    variable "instance_type" { type = string; default = "t3.micro" }
    resource "aws_instance" "web" {
      ami           = data.aws_ami.amazon_linux.id
      instance_type = var.instance_type
      tags = { Environment = var.environment }
    }
    ```
  - Why it matters: hard-coding values reduces reusability and makes maintaining multiple environments painful.

- Pitfall 4: Ignoring drift detection and plan-before-apply
  - Bad:
    ```
    terraform apply
    ```
  - Good:
    ```
    terraform plan
    terraform apply
    ```
  - Why it matters: drift can occur when resources are changed outside Terraform. Plan helps you review changes before applying to prevent unintended mutations.

## Y. Why This Matters In Real Systems — production context and real usage

- Consistency and reproducibility: IaC ensures environments (dev, staging, prod) can be recreated deterministically from code, reducing drift.
- Collaboration and governance: Version-controlled Terraform configurations enable code reviews, audit trails, and policy enforcement (via methods like Sentinel or Open Policy Agent).
- Automation and CI/CD: Terraform integrates with pipelines to provision infrastructure as part of release processes, enabling blue/green deployments, feature toggles, and rollbacks.
- Auditing and security: IaC makes security controls explicit (IAM roles, security groups, encryption) and allows for automated checks (e.g., tfsec, terrascan) as part of CI.
- Cost and reliability: You can model and estimate costs with modules, avoid manual misconfigurations, and ensure consistent tagging for cost attribution.

## Z. Study Questions — 5 recall questions

1. What are the two primary benefits of using a remote backend for Terraform state?
2. How does Terraform identify and prevent conflicting state changes when multiple people apply changes concurrently?
3. Why is it important to parameterize environment-specific values using variables or tfvars instead of hard-coding them?
4. Describe how you would structure a Terraform module and why modules are beneficial in large projects.
5. What is the purpose of the data source data "aws_ami" in Terraform configurations?

## Exercise — a practical multi-part coding challenge

Goal: Build a small, reproducible AWS environment using Terraform that includes a VPC, a public subnet, an EC2 web server, and a remote state backend. You will also refactor into a small module and validate with plan/apply.

Part 1: Create a simple project scaffold
- Create a Terraform project that:
  - Uses AWS as the provider.
  - Defines a remote backend (S3 + DynamoDB) for state.
  - Creates a VPC with a public subnet, an Internet Gateway, and a security group.
  - Deploys a single EC2 instance in the public subnet that serves a basic web page via Nginx.
- Use variables for region and instance_type; provide sensible defaults.

Part 2: Parameterize and modularize
- Extract the VPC, subnet, internet gateway, route table, and security group into a reusable module called modules/network.
- Create a module for the EC2 web server called modules/webserver, which takes instance_type, ami, and user_data as inputs and outputs the public IP of the instance.
- Refactor main.tf to call both modules to assemble the full environment.

Part 3: Outputs and validation
- Output the public IP of the web server and the DNS name of the S3 bucket created in Part 1.
- Run terraform plan and terraform apply to validate that the resources are created as expected.

Part 4: Best practices and security notes
- Ensure no credentials are hard-coded; rely on AWS CLI profiles or instance roles where applicable.
- Use tags consistently for cost attribution.
- Comment your code to explain non-obvious decisions.

Deliverables:
- A single, well-documented Terraform project (code in blocks or files) that passes terraform init, plan, and apply (you won’t actually deploy against your real AWS account here, but ensure the configuration is syntactically correct and logically consistent).
- A short write-up explaining how the modules interact, what you would test in a real environment, and how you would extend this to support multiple environments (e.g., prod) using workspaces or separate state backends.

Note: For learning purposes, please keep the Egress rules of the security groups reasonable (e.g., only port 80 for HTTP and a restricted SSH IP in a real scenario). In the exercise, you should provide a clear caveat about prod-hardening and least-privilege configurations.