# Track: DevOps & Cloud Engineering — Module: Phase 1 — Linux & Scripting — Topic: Linux Fundamentals & Administration (Azure)

Linux Fundamentals & Administration is the foundation of reliable, scalable, and secure cloud platforms. In Azure, Linux admins must navigate the Linux filesystem, manage users and permissions, keep systems updated, orchestrate processes, secure networking, and leverage Azure-specific provisioning and automation workflows. This lesson blends core Linux administration concepts with practical Azure CLI workflows to prepare you for real-world DevOps and cloud engineering tasks.

## 1. Linux File System and Navigation

```bash
# Basic navigation and filesystem inspection
pwd
ls -la
cd /var/log
ls -la
du -sh /var/log/*
```

```bash
#!/usr/bin/env bash
# Simple log archive helper
set -euo pipefail

LOG_DIR="$HOME/logs"
DATE=$(date +%F-%H%M%S)
ARCHIVE="$LOG_DIR/system-$DATE.tar.gz"

mkdir -p "$LOG_DIR"
tar -czf "$ARCHIVE" /var/log/*.log || true
```
### Line-by-line explanation
- pwd: Print the current working directory.
- ls -la: List files in long format, including hidden ones; shows permissions and owners.
- cd /var/log: Change directory to system log location.
- ls -la: List log directory contents with details.
- du -sh /var/log/*: Show the size of each item in /var/log to understand footprint.
- #!/usr/bin/env bash: Shebang to run the script with Bash.
- set -euo pipefail: Improve script safety; exit on error, treat unset vars as error, and propagate errors through pipes.
- LOG_DIR="$HOME/logs": Define a local directory to store archives.
- DATE=$(date +%F-%H%M%S): Create a timestamp for the archive filename.
- ARCHIVE="$LOG_DIR/system-$DATE.tar.gz": Path of the resulting archive.
- mkdir -p "$LOG_DIR": Create the logs directory if it doesn't exist.
- tar -czf "$ARCHIVE" /var/log/*.log || true: Archive all .log files; ignore errors if none exist.
- Notes: The first block demonstrates navigation and observation; the second block shows a practical archiving script you could schedule via cron or systemd timer.

---

## 2. Users, Groups, and Permissions

```bash
# Create a new admin user and grant sudo access
sudo adduser devopsadmin
sudo usermod -aG sudo devopsadmin
# Verify sudo privileges for the user
sudo -l -U devopsadmin
```

```bash
#!/usr/bin/env bash
# Safely set up SSH access for a new user
set -euo pipefail

USER="devopsadmin"
SSH_DIR="/home/$USER/.ssh"
PUB_KEY="<SSH_PUBLIC_KEY>"

sudo mkdir -p "$SSH_DIR"
sudo bash -lc "echo '$PUB_KEY' > $SSH_DIR/authorized_keys"
sudo chmod 700 "$SSH_DIR"
sudo chmod 600 "$SSH_DIR/authorized_keys"
sudo chown -R "$USER":"$USER" "$SSH_DIR"
```
```bash
# Example: secure a critical config file
sudo touch /etc/myapp/config.yaml
sudo chown root:root /etc/myapp/config.yaml
sudo chmod 640 /etc/myapp/config.yaml
```
### Line-by-line explanation
- adduser devopsadmin: Create a new user account named devopsadmin.
- usermod -aG sudo devopsadmin: Add devopsadmin to the sudo group to grant admin privileges.
- sudo -l -U devopsadmin: List the sudo privileges of devopsadmin to verify access.
- SSH_DIR initialization: Create the SSH directory for the user.
- pub key: Write the provided public key to authorized_keys to enable SSH key authentication.
- chmod 700 / 600: Enforce secure permissions on the SSH directory and authorized_keys.
- chown -R: Ensure the correct ownership of the SSH directory and contents.
- /etc/myapp/config.yaml: Create a config file with secure ownership and permissions to limit access.

---

## 3. Package Management and Updates

```bash
# Basic Ubuntu/Debian package maintenance
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl unzip ufw fail2ban
```

```bash
#!/usr/bin/env bash
# Pin a specific kernel version to avoid unwanted upgrades (advanced)
set -euo pipefail

sudo apt-mark hold linux-image-generic
```
### Line-by-line explanation
- apt-get update: Refresh the package index.
- apt-get upgrade -y: Upgrade installed packages non-interactively.
- apt-get install -y git curl unzip ufw fail2ban: Install commonly used dev tools and security utilities.
- apt-mark hold linux-image-generic: Prevent a specific package (kernel image) from being automatically upgraded (advanced stability precaution).

---

## 4. Process Management and Scheduling

```bash
# Basic process inspection
ps aux --sort=-%cpu | head -n 5
ps aux --sort=-%mem | head -n 5
```

```bash
#!/usr/bin/env bash
# Create a simple systemd service and timer to log time periodically
set -euo pipefail

# Create hello.service
sudo bash -c 'cat > /etc/systemd/system/hello.service' << "EOF"
[Unit]
Description=Hello Service

[Service]
Type=oneshot
ExecStart=/usr/bin/env bash -c 'echo "$(date) - Hello from systemd" >> /var/log/hello.log'
EOF

# Create hello.timer
sudo bash -c 'cat > /etc/systemd/system/hello.timer' << "EOF"
[Unit]
Description=Hello Timer

[Timer]
OnCalendar=*:0/1
Unit=hello.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now hello.timer
```
### Line-by-line explanation
- ps aux --sort=-%cpu | head -n 5: Show top CPU-consuming processes.
- ps aux --sort=-%mem | head -n 5: Show top memory-consuming processes.
- systemd service: Define a simple one-shot service that appends a timestamp to a log.
- systemd timer: Create a timer that triggers the service every minute (OnCalendar configuration).
- daemon-reload: Instruct systemd to reload unit files.
- enable --now: Enable and start the timer immediately.

---

## 5. Networking, SSH, and Security

```bash
# Harden SSH: disable password authentication and change port
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

```bash
# Firewall hardening with UFW
sudo ufw allow 2222/tcp
sudo ufw allow OpenSSH
sudo ufw --force enable
```

```bash
# Azure-specific: open a port for SSH (example: 2222)
az vm open-port --resource-group DevOpsRG --name LinuxAdminVM --port 2222
```
### Line-by-line explanation
- SSH config changes: Disable password-based login and root login to reduce attack surface.
- Port change: Change SSH to listen on a non-default port (2222) to deter automated attacks.
- Restart SSH: Apply SSH daemon configuration changes.
- UFW rules: Allow SSH on the chosen port and ensure SSH access is permitted from the firewall.
- Azure CLI open-port: Open the port at the cloud network security level so external clients can reach the VM on 2222.

---

## 6. System Services and Boot Automation

```bash
# Create a sample backup script and a systemd service + timer to run daily
sudo mkdir -p /usr/local/bin
sudo bash -c 'cat > /usr/local/bin/backup.sh' << "EOF"
#!/usr/bin/env bash
set -euo pipefail
tar -czf /var/backups/backup-$(date +%F).tar.gz /etc /home
EOF
sudo chmod +x /usr/local/bin/backup.sh
```

```bash
#!/usr/bin/env bash
# Systemd unit files for backup.service and backup.timer
set -euo pipefail

sudo bash -c 'cat > /etc/systemd/system/backup.service' << "EOF"
[Unit]
Description=Daily backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
EOF

sudo bash -c 'cat > /etc/systemd/system/backup.timer' << "EOF"
[Unit]
Description=Daily backup timer

[Timer]
OnCalendar=daily
Persistent=true
Unit=backup.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer
```
### Line-by-line explanation
- backup.sh: A simple script that archives /etc and /home into a dated backup file.
- chmod +x: Make the script executable.
- backup.service: A systemd service that executes the backup script.
- backup.timer: A timer that schedules the service to run daily.
- daemon-reload and enable --now: Refresh systemd state and start scheduling immediately.

---

## 7. Azure Linux Administration: Provisioning, Cloud-Init, and Basic Azure CLI

```bash
# Create a resource group and a Linux VM in Azure (Ubuntu 22.04 LTS)
az group create --name DevOpsRG --location eastus
az vm create \
  --resource-group DevOpsRG \
  --name LinuxAdminVM \
  --image UbuntuLTS \
  --admin-username azureadmin \
  --generate-ssh-keys \
  --custom-data cloud-init.yaml
```

cloud-init.yaml (example):
```yaml
#cloud-config
package_update: true
package_upgrade: true
packages:
  - ufw
  - fail2ban
runcmd:
  - systemctl enable --now ssh
  - ufw allow OpenSSH
```

```bash
# Post-create: run a quick command on the VM
az vm run-command invoke \
  --resource-group DevOpsRG \
  --name LinuxAdminVM \
  --command-id RunShellScript \
  --scripts "sudo apt-get update; sudo apt-get install -y htop"
```

```bash
# Azure CLI: open an additional SSH port (e.g., 2222) for the VM
az vm open-port --resource-group DevOpsRG --name LinuxAdminVM --port 2222
```
### Line-by-line explanation
- az group create: Make a resource group to hold Azure resources.
- az vm create: Provision a Linux VM with Ubuntu LTS, generate SSH keys, and apply cloud-init data on first boot.
- cloud-init.yaml: A small bootstrap that updates packages, installs ufw and fail2ban, and ensures SSH is enabled with firewall allowance on OpenSSH.
- az vm run-command invoke: Execute a script on the VM post-provisioning to install quick utilities like htop.
- az vm open-port: Expose port 2222 in the Azure NSG to allow SSH on the non-default port from outside Azure.

---

## X. Common Beginner Mistakes

- Bad: Attempting to privilege-copy SSH keys without proper directory permissions
  Bad
  ```bash
  # Incorrect: not setting correct permissions
  mkdir -p /home/devopsadmin/.ssh
  echo "<KEY>" > /home/devopsadmin/.ssh/authorized_keys
  ```
  Good
  ```bash
  # Correct: set secure permissions and ownership
  mkdir -p /home/devopsadmin/.ssh
  chmod 700 /home/devopsadmin/.ssh
  echo "<KEY>" > /home/devopsadmin/.ssh/authorized_keys
  chmod 600 /home/devopsadmin/.ssh/authorized_keys
  chown -R devopsadmin:devopsadmin /home/devopsadmin/.ssh
  ```

- Bad: Editing /etc/ssh/sshd_config with fragile sed commands
  Bad
  ```bash
  sed -i 'PasswordAuthentication no' /etc/ssh/sshd_config
  systemctl restart ssh
  ```
  Good
  ```bash
  # Safer: verify the setting exists, then apply
  grep -q '^#PasswordAuthentication' /etc/ssh/sshd_config || echo "Unexpected sshd_config format"
  sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  sudo systemctl restart ssh
  ```

- Bad: Running a one-liner that upgrades the system in a single command without dry-run or confirmation
  Bad
  ```bash
  sudo apt-get update && sudo apt-get upgrade -y
  ```
  Good
  ```bash
  # Safer: preview changes first
  sudo apt-get update
  apt list --upgradable
  read -p "Proceed with upgrades? (y/N): " yn; [ "$yn" = "y" ] && sudo apt-get upgrade -y
  ```

- Bad: Exposing a private key or keys via logs or history
  Bad
  ```bash
  echo "$SSH_KEY" >> ~/.bash_history
  ```
  Good
  ```bash
  # Never store private data in shell history; use environment variables carefully
  export SSH_KEY=$(grep -m1 'ssh-ed25519' ~/.ssh/authorized_keys)
  unset SSH_KEY
  ```

- Bad: Relying solely on password authentication for SSH on public clouds
  Bad
  ```bash
  # Keep password-based SSH enabled
  sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
  sudo systemctl restart ssh
  ```
  Good
  ```bash
  # Enable key-based auth and disable password auth
  sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  sudo systemctl restart ssh
  # Ensure you have a valid public key in authorized_keys
  ```

---

## Y. Why This Matters In Real Systems

- Consistency and repeatability: Linux fundamentals underpin all cloud environments; uniform file permissions, user governance, and service management ensure predictable behavior across environments (dev, stage, prod).
- Security at scale: Proper SSH hardening, firewall rules, and minimal privilege principals prevent common attack vectors and reduce blast radius in Azure-based Linux deployments.
- Automation and reproducibility: Using scripts, cloud-init, and systemd timers enables hands-off operations, reduces human error, and makes deployments auditable—critical in regulated or enterprise environments.
- Azure integration: Mastery of Azure CLI, cloud-init, and NSG rules enables seamless provisioning, config management, and ops across large fleets of Linux VMs in the cloud, aligning with CI/CD pipelines and observability goals.

---

## Z. Study Questions

1. What commands would you use to see the top CPU- and memory-consuming processes on a Linux VM?
2. How do you grant a new user sudo privileges, and why is it important to verify their privileges?
3. Why is it important to set proper permissions on SSH-related files, and what are the typical permissions for /home/USER/.ssh and authorized_keys?
4. How would you configure a Linux VM in Azure to automatically apply security updates on boot using cloud-init?
5. What is the difference between a systemd service and a timer, and when would you use a timer instead of a cron job?

---

## Exercise

Part A — Provision and Prepare a Linux VM on Azure
1) Create a new resource group and a Linux VM in Azure using the Azure CLI. Use a non-default SSH port (e.g., 2222) and enable SSH access.
2) Provide a cloud-init YAML that updates packages, installs ufw and fail2ban, and configures SSH access via a key-based approach.
3) Confirm the VM is accessible via SSH on port 2222 from your workstation (note: you will need an SSH key pair; do not share private keys).

Part B — Harden and Basic Administration
1) Create a new user named "devopsadmin" and grant sudo privileges.
2) Set up SSH key-based authentication for devopsadmin and disable password-based SSH authentication on the VM.
3) Enable a basic firewall (UFW) to allow SSH on port 2222 and deny others by default.

Part C — Automate a Small Routine
1) Create a simple script that appends a timestamp to /var/log/automation.log.
2) Create a systemd service and a timer to run that script every 15 minutes.
3) Verify that the timer triggers by checking the log file entries.

Part D — Azure Integration and Validation
1) Use Azure CLI to open port 2222 for the VM (if not already enabled by --port during creation).
2) Run a quick post-provision command on the VM (e.g., install htop) using az vm run-command invoke and confirm installation succeeds.

Deliverables:
- A short write-up describing the provisioning steps you executed, the Azure CLI commands used, and the validation results (including Linux commands you ran to verify SSH access and service/timer status).
- Screenshots or terminal output snippets showing key results (e.g., SSH login success, systemctl status for the timer, and the latest automation.log entry).