# Track: DevOps & Cloud Engineering — Phase 3: Infrastructure as Code — AWS Cloud Provider Deep Dive

Infrastructure as Code (IaC) with the AWS cloud provider is a core skill for DevOps and Cloud Engineers. By codifying AWS resources, you can reproduce, audit, and scale infrastructure reliably across environments. In this lesson, we’ll dive deep into Terraform-based AWS provisioning, covering provider configuration, networking, compute, and storage, with concrete examples, explanations, and practical pitfalls to avoid in real systems.

## 1. AWS Provider Configuration and Authentication

### Code
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.5.0"

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "env/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

data "aws_caller_identity" "current" {}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

### Line-by-line explanation
- Terraform block declares the required provider (AWS) and its version, plus the optional state backend (S3).
- The backend stores Terraform state remotely; this enables team collaboration and drift detection.
- aws_region and aws_profile are input variables for flexibility across environments and machines.
- The provider block configures the AWS provider using the region and profile from variables.
- data "aws_caller_identity" fetches the current account identity to verify credentials and region.
- Output account_id exposes the AWS account ID for quick verification and downstream uses.

## 2. VPC and Networking Essentials

### Code
```hcl
data "aws_availability_zones" "available" {}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "IaC-VPC"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "IaC-IGW"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "IaC-Public-Subnet"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "IaC-Private-Subnet"
  }
}

resource "aws_eip" "nat" {
  vpc = true
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  depends_on = [aws_internet_gateway.igw]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "IaC-Public-RT"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "IaC-Private-RT"
  }
}

resource "aws_route_table_association" "private_assoc" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "private_subnet_id" {
  value = aws_subnet.private.id
}
```

### Line-by-line explanation
- data "aws_availability_zones" fetches available AZs in the target region to place subnets predictably.
- aws_vpc creates a dedicated virtual network with a large CIDR block.
- aws_internet_gateway attaches an IGW to the VPC for outbound internet access from public subnets.
- aws_subnet.public and aws_subnet.private define two subnets in different AZs; public has auto-assign of public IPs.
- aws_eip and aws_nat_gateway enable private subnets to access the internet via NAT.
- aws_route_table and aws_route_table_association configure routing: public traffic via the IGW and private traffic via the NAT gateway.
- Outputs expose IDs for use in dependent modules or for verification.

## 3. Compute: EC2 Instances and IAM

### Code
```hcl
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.*-x86_64-ebs"]
  }
}

variable "ssh_source" {
  description = "Source CIDR blocks allowed to SSH into the EC2 instance"
  type        = string
  default     = "0.0.0.0/0"
}

resource "aws_security_group" "web_sg" {
  name        = "web-sg"
  description = "Security group for web instance"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_source]
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
    Name = "IaC-Web-SG"
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "ec2-demo-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_s3_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_instance_profile" "web_profile" {
  name = "web-profile"
  role = aws_iam_role.ec2_role.name
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.*-x86_64-ebs"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.web_profile.name
  associate_public_ip_address = true

  tags = {
    Name = "IaC-Web-Instance"
  }

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl enable httpd
              systemctl start httpd
              echo "Hello from Terraform" > /var/www/html/index.html
              EOF
}
```

### Line-by-line explanation
- data "aws_ami" blocks fetch the most recent Amazon Linux 2 AMI for a reliable Linux baseline.
- variable "ssh_source" allows controlling SSH access origin without code changes.
- aws_security_group defines ingress for SSH (restricted by ssh_source) and HTTP (open for demo).
- aws_iam_role and aws_iam_role_policy_attachment create a scoped EC2 role with S3 read-only access.
- aws_iam_instance_profile associates the role with EC2 instances.
- aws_instance launches an EC2 in the public subnet with the AMI, security group, and instance profile; user_data bootstraps a simple HTTP server.
- The combination demonstrates IAM + networking integration for compute in AWS.

## 4. Storage: S3 Buckets and Basic Security

### Code
```hcl
provider "aws" {
  region = var.aws_region
}

resource "random_string" "bucket_suffix" {
  length  = 6
  upper   = false
  lower   = true
  numeric = true
  special = false
}

resource "aws_s3_bucket" "data_bucket" {
  bucket = "tf-demo-bucket-${random_string.bucket_suffix.result}"
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
    Name        = "tf-demo-bucket"
    Environment = "Dev"
  }
}

resource "aws_s3_bucket_public_access_block" "block" {
  bucket                    = aws_s3_bucket.data_bucket.id
  block_public_acls         = true
  ignore_public_acls          = true
  block_public_policy         = true
  restrict_public_buckets     = true
}
```

### Line-by-line explanation
- random_string generates a small, unique suffix to avoid bucket name collisions (bucket names are global).
- aws_s3_bucket creates a private bucket with versioning enabled for recovery and data protection.
- server_side_encryption_configuration ensures data at rest is encrypted with AES256 by default.
- aws_s3_bucket_public_access_block blocks public access at the account/bucket level to enforce private storage.
- Tags provide discoverability and cost allocation context.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1 — Hardcoding credentials in code
Bad:
```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```
Good:
```hcl
provider "aws" {
  region = "us-east-1"
}
```
Notes: Prefer AWS CLI credentials file, environment variables, or IAM roles (in EC2) to avoid credential leakage and rotation issues.

### Pitfall 2 — Opening SSH on the entire Internet
Bad:
```hcl
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}
```
Good:
```hcl
variable "ssh_source" {
  description = "Source CIDR blocks allowed to SSH into the EC2 instance"
  type        = string
  default     = "203.0.113.0/24"
}

ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = [var.ssh_source]
}
```
Notes: Restrict SSH to a known corporate IP or a tight CIDR block; consider using Bastion hosts or SSM Session Manager for access.

### Pitfall 3 — Not using a backend or proper state isolation
Bad:
```hcl
terraform {
  required_providers { aws = { source = "hashicorp/aws" } }
}
```
Good:
```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "env/prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```
Notes: A backend enables shared state, locking, and drift detection across team members.

### Pitfall 4 — Not tagging resources
Bad:
```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```
Good:
```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  tags = {
    Name        = "IaC-Web-Instance"
    Environment = "Dev"
  }
}
```
Notes: Tags improve governance, cost tracking, and automation.

### Pitfall 5 — Skipping version constraints and drift protection
Bad:
```hcl
provider "aws" {
  region = "us-east-1"
}
```
Good:
```hcl
provider "aws" {
  region  = "us-east-1"
  version = "~> 5.0"
}
```
Notes: Pinning provider versions reduces unexpected future changes and drift.

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: IaC ensures identical environments across dev, staging, and production, reducing drift.
- Change control and auditability: Infrastructure changes go through code reviews, PRs, and CI pipelines, creating an auditable history.
- Security posture: Least privilege IAM roles, encryption at rest (S3 SSE), restricted network access, and centralized secret management improve security.
- Compliance and governance: Tagging, naming conventions, and resource inventories help with regulatory compliance.
- Disaster recovery and reliability: Backed state files, versioned storage, and tested plans enable quick rollback and recovery.
- Scalability and maintainability: Modularity and parameterization enable reuse across teams and environments, cutting time-to-value for new projects.

## Z. Study Questions — 5 recall questions

1) What is the purpose of the Terraform backend, and why would you choose an S3 backend for AWS projects?
2) How do you fetch the latest Amazon Linux 2 AMI in Terraform, and why is using the most_recent option important?
3) What is the difference between a public subnet and a private subnet in a VPC, and how does NAT gateway enable private subnet internet access?
4) How would you attach an IAM role to an EC2 instance to grant S3 read-only access, and why is an instance profile needed?
5) Why is tagging resources important in real AWS environments, and what are practical tagging strategies?

## Exercise — Practical multi-part coding challenge

Goal: Build a small, production-facing AWS infrastructure using Terraform that includes a VPC with public and private subnets, a NAT gateway, an EC2 instance behind a security group, and an S3 bucket with encryption. Follow a basic CI-friendly workflow and demonstrate outputs for validation.

Part A: Set up provider, backend, and VPC
- Create a Terraform configuration with:
  - AWS provider (region configurable), backend using S3.
  - A VPC (10.0.0.0/16) with one public and one private subnet in different AZs.
  - An Internet Gateway and a NAT Gateway for the private subnet.

Part B: Deploy a compute resource with least privilege IAM
- Launch an EC2 instance in the public subnet using an Amazon Linux 2 AMI.
- Create a dedicated IAM role with AmazonS3ReadOnlyAccess and attach it to the instance via an instance profile.
- Install a simple web server via user_data and verify that the instance is reachable.

Part C: Create a secured S3 bucket
- Create an S3 bucket with a unique name (prefix with a random suffix).
- Enable versioning and SSE-S3 encryption.
- Block public access at the bucket level.

Part D: Outputs and validation
- Output VPC ID, public and private subnet IDs, EC2 public IP, and bucket name.
- Run terraform init, plan, and apply; verify resources exist in the AWS Console.
- Run terraform destroy to clean up.

Reference Solution (comprehensive, end-to-end) — paste-ready Terraform snippet
```hcl
# Reference: End-to-end AWS IaC (VPC, Public/Private Subnets, EC2, S3)
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.5.0"

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "env/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
variable "ssh_source" {
  description = "Source CIDR for SSH access"
  type        = string
  default     = "203.0.113.0/24"
}

provider "aws" {
  region = var.aws_region
}

# ----------------------------
# Networking: VPC, subnets, IGW, NAT
# ----------------------------
data "aws_availability_zones" "available" {}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "Ibex-IaC-VPC" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "Ibex-IaC-IGW" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags = { Name = "Ibex-IaC-Public" }
}
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
  tags = { Name = "Ibex-IaC-Private" }
}

resource "aws_eip" "nat" {
  vpc = true
}
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  depends_on    = [aws_internet_gateway.igw]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "Ibex-Public-RT" }
}
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
  tags = { Name = "Ibex-Private-RT" }
}
resource "aws_route_table_association" "private_assoc" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

# ----------------------------
# Compute: EC2 with IAM role
# ----------------------------
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.*-x86_64-ebs"]
  }
}

resource "aws_security_group" "web_sg" {
  name   = "Ibex-Web-SG"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_source]
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
  tags = { Name = "Ibex-Web-SG" }
}

resource "aws_iam_role" "ec2_role" {
  name = "Ibex-EC2-Role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}
resource "aws_iam_role_policy_attachment" "ec2_s3_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "Ibex-EC2-Profile"
  role = aws_iam_role.ec2_role.name
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.*-x86_64-ebs"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl enable httpd
              systemctl start httpd
              echo "<h1>Ibex IaC</h1><p>Provisioned with Terraform</p>" > /var/www/html/index.html
              EOF

  tags = { Name = "Ibex-Web-Instance" }
}

# ----------------------------
# Storage: S3 for data
# ----------------------------
resource "random_string" "bucket_suffix" {
  length  = 6
  upper   = false
  lower   = true
  numeric = true
  special = false
}
resource "aws_s3_bucket" "data_bucket" {
  bucket = "tf-ibex-demo-bucket-${random_string.bucket_suffix.result}"
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
    Name        = "Ibex-demo-bucket"
    Environment = "Dev"
  }
}
resource "aws_s3_bucket_public_access_block" "block" {
  bucket                    = aws_s3_bucket.data_bucket.id
  block_public_acls         = true
  ignore_public_acls          = true
  block_public_policy         = true
  restrict_public_buckets     = true
}

# Outputs
output "ec2_public_ip" {
  value = aws_instance.web.public_ip
}
output "bucket_name" {
  value = aws_s3_bucket.data_bucket.bucket
}
output "vpc_id" {
  value = aws_vpc.main.id
}
output "public_subnet" {
  value = aws_subnet.public.id
}
output "private_subnet" {
  value = aws_subnet.private.id
}
```

Instructions: Use this as a reference to ensure you’ve tied together VPC, networking, compute, and storage with proper IAM roles and encryption. In your exercise, you should adapt these resources to fit your organization’s naming conventions, security guidelines, and CI/CD workflow.

End of lesson.