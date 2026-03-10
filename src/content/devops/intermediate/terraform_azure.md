# Infrastructure as Code with Terraform on Azure

Terraform lets you manage Azure resources as code, enabling repeatable, auditable, and version-controlled infrastructure. In professional DevOps and cloud engineering, this means you can spin up entire environments, enforce policy, collaborate safely, and recover quickly from failures. This lesson walks through a practical Terraform setup for Azure, including core resources (RG, VNet, Subnet, NIC, VM), parameterization, and foundational best practices.

## 1. Terraform and Azure Provider Setup

This section establishes the Terraform and Azure provider configuration. It shows how to declare the required Terraform version and pin the AzureRM provider, along with a minimal provider configuration. Authentication in Azure via Terraform uses environment variables, Azure CLI login, or managed identities; no secrets are embedded in code here.

```hcl
# main.tf

terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Optional: configure remote state backend (recommended for real projects)
  # backend "azurerm" {
  #   resource_group_name   = "tfstate-rg"
  #   storage_account_name  = "tfstateacct"
  #   container_name        = "tfstate"
  #   key                   = "terraform.tfstate"
  # }
}

# Azure provider configuration
provider "azurerm" {
  features = {}

  # Authentication methods:
  # - Environment variables: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
  # - Azure CLI login
  # - Managed Identity (in Azure hosts)
}
```

### Line-by-line explanation

1) terraform { … } block declares the required Terraform version and providers.
- required_version ensures modern syntax and features are available.
- required_providers pins the azurerm provider to a compatible major version (3.x).
- The commented backend block shows how to enable remote state with Azure Storage (recommended for teams).

14) provider "azurerm" { … } defines the AzureRM provider and its features.
- features = {} is required by AzureRM to enable the provider’s feature flags.
- The comments describe authentication methods and never place credentials in code.

---

## 2. Azure Resource Topology: RG, VNet, Subnet, NIC, and Linux VM

This section defines the core Azure resources needed to host a Linux VM: a resource group, virtual network, subnet, public IP, network interface, and the VM itself. All resources are defined in a single cohesive set so you can see resource dependencies clearly.

```hcl
# resources.tf

# Resource group
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    environment = var.environment
  }
}

# Virtual network
resource "azurerm_virtual_network" "vnet" {
  name                = "${var.resource_group_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# Subnet
resource "azurerm_subnet" "subnet" {
  name                 = "tf-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP
resource "azurerm_public_ip" "pip" {
  name                = "${var.resource_group_name}-pip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Dynamic"
}

# Network Interface
resource "azurerm_network_interface" "nic" {
  name                = "${var.resource_group_name}-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "nic-config"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }
}

# Linux VM
resource "azurerm_linux_virtual_machine" "vm" {
  name                = "${var.resource_group_name}-vm"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = var.vm_size

  admin_username = var.admin_username
  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  // SSH key-based authentication (recommended)
  admin_ssh_key {
    username   = var.admin_username
    public_key = file("~/.ssh/id_rsa.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  // Ubuntu 22.04 LTS image
  source_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "22.04-LTS"
    version   = "latest"
  }

  tags = {
    environment = var.environment
  }
}
```

### Line-by-line explanation

1) resource "azurerm_resource_group" "rg" { … } creates a logical container for resources in Azure.
- name uses var.resource_group_name to enable reuse across environments.
- location uses var.location to place the RG in the desired Azure region.
- tags attach metadata (environment) for governance and cost tracking.

15) resource "azurerm_virtual_network" "vnet" { … } builds a private network for your resources.
- name derives from the resource group to keep names predictable.
- address_space defines the IP space (10.0.0.0/16) for the VNet.
- location and resource_group_name tie the VNet to the RG.

23) resource "azurerm_subnet" "subnet" { … } creates a subnet within the VNet.
- name is a stable subnet name.
- address_prefixes reserves a portion of the VNet for hosts (10.0.1.0/24).

31) resource "azurerm_public_ip" "pip" { … } allocates a dynamic public IP for the VM.
- allocation_method "Dynamic" defers IP assignment until needed.

38) resource "azurerm_network_interface" "nic" { … } attaches an IP to a NIC.
- ip_configuration links the NIC to the subnet and the public IP.

49) resource "azurerm_linux_virtual_machine" "vm" { … } provisions a Linux VM.
- admin_username sets the SSH user; network_interface_ids attaches NICs to the VM.
- admin_ssh_key config enables SSH authentication using your public key.
- os_disk and image_reference define storage and the OS image (Ubuntu 22.04-LTS).
- tags tag the VM for organization and cost controls.

---

## 3. Parameterization and Outputs

To make the configuration reusable across environments (dev, staging, prod), define variables and outputs. This keeps environment-specific values out of code and exposes useful runtime information.

```hcl
# variables.tf

variable "location" {
  type    = string
  default = "East US"
  description = "Azure region for all resources"
}

variable "resource_group_name" {
  type    = string
  default = "tf-rg"
  description = "Name of the Azure Resource Group"
}

variable "admin_username" {
  type        = string
  description = "SSH username for the VM"
}

variable "vm_size" {
  type    = string
  default = "Standard_B2s"
  description = "VM size"
}

variable "environment" {
  type    = string
  default = "dev"
  description = "Environment tag for resources"
}
```

```hcl
# outputs.tf

output "vm_public_ip" {
  description = "Public IP address of the VM"
  value       = azurerm_public_ip.pip.ip_address
}

output "vm_private_ip" {
  description = "Private IP address of the VM"
  value       = azurerm_network_interface.nic.ip_configuration[0].private_ip_address
}
```

### Line-by-line explanation

1) variable "location" { … } defines an input parameter for the Azure region.
- type = string enforces the data type.
- default provides a sensible region if none is supplied.
- description documents the variable for users.

9) variable "resource_group_name" { … } sets the RG name as an input.
- Keeps resource naming consistent across environment instances.

15) variable "admin_username" { … } captures the SSH username.
- This is essential for SSH access to the VM.

21) variable "vm_size" { … } controls the VM size choice.
- Default to a small, cost-effective instance; can be overridden per environment.

27) variable "environment" { … } attaches an environment tag for governance and cost reports.

33) output "vm_public_ip" { … } exposes the VM’s public IP after apply.
- Useful for connectivity and verification in pipelines.

39) output "vm_private_ip" { … } exposes the VM’s private IP for internal access and logging.

---

## 4. Common Beginner Mistakes

Pitfalls and how to avoid them. Bad vs Good examples are shown for each.

### Pitfall 1: Hardcoding values instead of using variables

Bad:
```hcl
# Bad: hard-coded environment name and location
resource "azurerm_resource_group" "rg" {
  name     = "tf-rg"
  location = "East US"
}
```

Good:
```hcl
# Good: parameterize                       # (variables.tf defines location and resource_group_name)
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}
```

### Pitfall 2: Not pinning provider version or Terraform version

Bad:
```hcl
# Bad: no version pinning
provider "azurerm" {
  features = {}
}
```

Good:
```hcl
# Good: explicit versions and plan to upgrade safely
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}
```

### Pitfall 3: Storing secrets or credentials in code

Bad:
```hcl
# Bad: embedding a password (Windows example)
resource "azurerm_windows_virtual_machine" "win" {
  admin_password = "SuperSecret123!"
  ...
}
```

Good:
```hcl
# Good: SSH keys for Linux; avoid passwords
# For Windows, use secure retrieval (Key Vault) and avoid plaintext in code
# admin_password = var.admin_password (and fetch from a secret store)
```

### Pitfall 4: Not using a remote/backend for state

Bad:
```hcl
# Bad: local state; not suitable for collaboration or recovery
terraform {
  backend "local" {}
}
```

Good:
```hcl
# Good: remote backend to enable team collaboration and safe state
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstateacct"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
```

---

## 5. Why This Matters In Real Systems

In production-grade environments, infrastructure as code with Terraform provides:
- Idempotence and reproducibility: the same code yields the same resources across environments and recreates them safely on re-apply.
- Versioned infrastructure: Git-based workflows track changes to your infrastructure definitions, enabling code reviews and rollbacks.
- Environment parity: variables and modules allow consistent environments (dev, test, prod) with minimal duplication.
- State management and collaboration: remote backends and state locking prevent conflicting changes and enable CI/CD integration.
- Governance and security: secrets are decoupled from code, and tagging enables cost allocation and policy enforcement.
- Disaster recovery: with remote state and proper backups, you can recreate environments quickly after outages.

In this Azure-focused Terraform setup, you can expand to modules, integrate with CI/CD pipelines (GitHub Actions, Azure DevOps), and add policy checks (e.g., allowed VM sizes, allowed regions) to enforce compliance as part of your deployment process.

---

## 6. Study Questions

1) What is the purpose of the terraform block in the provider configuration, and why is provider pinning important?
2) How do you establish a private network boundary for your VM in Azure using Terraform?
3) Why is SSH key-based authentication preferred over passwords for Linux VMs in IaC?
4) What are the benefits of using a remote state backend in team environments?
5) How would you expose useful runtime information (like IP addresses) from Terraform to other tools or pipelines?

---

## 7. Exercise

Complete this practical, multi-part coding challenge to solidify your understanding. You will extend the example from this lesson and apply best practices.

Part 1 — Parameterization (environment-specific deployments)
- Add a variables.tf declaration for:
  - location, resource_group_name, admin_username, vm_size, environment (if not already present).
- Update main resources to use these variables (you already have this in the scaffolding).
- Create an additional outputs.tf entry to expose vm_size or environment if desired.
What you will implement:
- Ensure all resource names and region selections come from variables, enabling dev/staging/prod deployments from the same codebase.

Part 2 — Security and Networking: SSH inbound access
- Create a Network Security Group (NSG) that allows inbound SSH (port 22) from a specific IP range (e.g., your office IP or a known CIDR).
- Attach the NSG to the VM's NIC (either via a dedicated NIC subnet association or via a network_security_group_id block, depending on your approach).
What you will implement:
- A new azurerm_network_security_group resource with an inbound rule for SSH.
- Attach it to the VM’s NIC or subnet to restrict access.

Part 3 — Multiple VMs and a shared subnet
- Add a second Linux VM in the same VNet but a separate subnet or the same subnet with a different NIC.
- Use a single VNet/subnet strategy to practice resource reuse and dependency ordering.
What you will implement:
- azurerm_subnet "subnet2" or reuse the same subnet.
- azurerm_network_interface for the second VM.
- azurerm_linux_virtual_machine for the second VM, with its own name and NIC.

Part 4 — Remote backend and state management
- Configure the Azurerm backend for remote state storage (storage account, container, and key).
- If you don’t have real storage resources, show how to name them and explain the prerequisites; you can present the backend block as a suggested approach.
What you will implement:
- A backend "azurerm" block in a separate backend.tf (or in your main.tf’s terraform block) and instructions to create the storage account, resource group, and container that back Terraform state.

Part 5 — Verification and workflow
- Run terraform init to initialize providers and the backend.
- Run terraform plan to review changes.
- Run terraform apply to provision resources.
- Validate access by connecting to the VM via SSH using the public IP, and verify the private IP from the NIC's configuration.
What you will implement:
- A simple, repeatable workflow for developers and operators to provision environments safely.

Note: In a real environment, you would encapsulate Part 1–4 into a reusable Terraform module and consume it from a root module with different input variables for each environment. You would also integrate with a CI/CD workflow that runs terraform fmt, terraform validate, terraform plan, and terraform apply with approvals as appropriate.