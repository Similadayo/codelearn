# Linux Fundamentals & Administration — Phase 1: Linux & Scripting (AWS)

Compelling intro: In DevOps and Cloud Engineering, Linux is the operating system that powers nearly every cloud workload. Mastery of fundamentals—shell usage, users and permissions, package management, services, storage, networking, and observability—enables you to deploy, monitor, and automate reliable systems at scale. This lesson provides practical, AWS-relevant examples with real-world commands, scripts, and configurations you can adapt in EC2 and other Linux-based environments.

## 1. Shell and Command-Line Essentials

This section covers the core shell skills you’ll use every day: navigating the filesystem, filtering output, and writing small, idempotent scripts that help automate routine tasks on Linux hosts in AWS.

Code block 1: A small script to audit a directory and surface the top space-using files
```bash
#!/usr/bin/env bash
# Usage: ./dir-audit.sh /path/to/dir
set -euo pipefail

DIR="${1:-/var/log}"
echo "Auditing directory: $DIR"

# Show the top 5 largest files/directories under DIR
du -ah "$DIR" 2>/dev/null | sort -rh | head -n 5
```

### Line-by-line explanation
- #!/usr/bin/env bash — Use the user’s environment to locate bash.
- set -euo pipefail — Enable strict error handling: exit on error, treat unset variables as error, and propagate pipeline errors.
- DIR="${1:-/var/log}" — Default to /var/log if no argument is given.
- echo "Auditing directory: $DIR" — Print what is being audited for clarity.
- du -ah "$DIR" 2>/dev/null — Summarize sizes of files/dirs in human-readable form; silence errors for permission issues.
- sort -rh — Sort results by size in reverse, human-readable order.
- head -n 5 — Show the top 5 largest entries.

Code block 2: A tiny, reusable function snippet to ensure idempotent directory creation
```bash
#!/usr/bin/env bash
set -euo pipefail

ensure_dir() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    echo "Directory exists: $dir"
  else
    mkdir -p "$dir"
    echo "Created directory: $dir"
  fi
}
ensure_dir "/opt/myapp/logs"
```

### Line-by-line explanation
- define a function ensure_dir that takes a path.
- if [[ -d "$dir" ]]; then ... else mkdir -p "$dir" — Create the directory only if it doesn’t exist.
- Calling ensure_dir with /opt/myapp/logs ensures a predictable setup step during bootstrap.

Code block 3: Cross-distro package discovery and a tiny “hello” command
```bash
#!/usr/bin/env bash
set -euo pipefail

if command -v uname >/dev/null; then
  OS="$(uname -s)"
  echo "Detected OS: $OS"
fi

# Simple hello to verify PATH and shell behavior
echo "Hello from $(whoami) on $(date -Iseconds)"
```

### Line-by-line explanation
- command -v uname >/dev/null checks for the presence of a core utility.
- OS="$(uname -s)" captures the system name for basic diagnostics.
- whoami and date provide runtime context, useful in logs and debugging.

## 2. Users, Groups, and Permissions

Professional practice in AWS: isolating workloads by users, setting correct ownership, and using permissions to limit access. This section shows how to create users, assign groups, and set file permissions in a safe, auditable way.

Code block 1: Create a dedicated project user with restricted shell and proper ownership
```bash
#!/usr/bin/env bash
set -euo pipefail

# Create a dedicated user for a project with no login shell
sudo useradd -m -d /srv/project -s /usr/sbin/nologin projectuser

# Create a group for project and add user
sudo groupadd -f projectgrp
sudo usermod -aG projectgrp projectuser

# Set ownership and permissions on the project directory
sudo mkdir -p /srv/project
sudo chown -R projectuser:projectgrp /srv/project
sudo chmod 750 /srv/project
```

### Line-by-line explanation
- Creates a system user with no login shell for security.
- Ensures a dedicated group exists and adds the user to it.
- Creates /srv/project, assigns ownership to the new user/group, and restricts access to others.

Code block 2: Demonstrate umask and file creation with predictable permissions
```bash
#!/usr/bin/env bash
set -euo pipefail

# Show current umask
echo "Current umask: $(umask)"

# Create a file with explicit permissions using umask
umask 077
touch /tmp/secure-note
chmod 600 /tmp/secure-note
```

### Line-by-line explanation
- umask 077 ensures newly created files are not readable by others.
- chmod 600 explicitly locks down the file to the owner only, illustrating permission control.

Code block 3: Basic sudoers-safe sudoers.d entry (example)
```bash
# /etc/sudoers.d/devops
# Allow the 'devops' user to run specific commands without a password
devops ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp.service, /usr/bin/apt-get
```

### Line-by-line explanation
- This creates a targeted sudoers entry for automation tasks (restart service, install packages) without broad passwordless access, reducing risk.

## 3. Package Management and Software Installation

Key skill: correctly identifying and using the right package manager on various Linux distributions (including AWS EC2 images). This section demonstrates a robust, idempotent installer that adapts to the host's package manager.

Code block 1: Cross-distro installer for a lightweight web server (Nginx)
```bash
#!/usr/bin/env bash
set -euo pipefail

install_nginx() {
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y nginx
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y nginx
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nginx
  else
    echo "Unsupported package manager" >&2
    exit 1
  fi
}
install_nginx
```

### Line-by-line explanation
- Detects the package manager (apt-get, yum, or dnf) and installs nginx accordingly.
- The script is idempotent in the sense that repeated runs will not fail due to existing installation; if nginx is already installed, the commands simply complete.

Code block 2: Verify nginx is reachable on port 80
```bash
#!/usr/bin/env bash
set -euo pipefail

if command -v systemctl >/dev/null 2>&1; then
  systemctl status nginx.service || true
fi
curl -sSf http://localhost/ || echo "Nginx not responding yet"
```

### Line-by-line explanation
- Systemctl status avoids failing the script if nginx is not yet started.
- curl tests HTTP reachability to verify the service is responding.

Code block 3: Ensure a service starts on boot (example with systemd)
```ini
# /etc/systemd/system/nginx-auto-start.service
[Unit]
Description=Ensure Nginx is running on boot

[Service]
Type=oneshot
ExecStart=/bin/systemctl start nginx.service
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

### Line-by-line explanation
- A simple systemd unit that triggers on boot to attempt to start nginx, ensuring resilience during boot sequences.

## 4. System Services and Process Management

In production, you’ll manage daemons with systemd, enforce restarts on failure, and monitor health. This section shows a minimal health-check service and a sample script it runs.

Code block 1: A simple systemd service unit for a health-check script
```ini
# /etc/systemd/system/health-check.service
[Unit]
Description=Health check for my app
After=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
ExecStart=/usr/local/bin/app-health-check.sh
Restart=on-failure
Environment=ENV=prod

[Install]
WantedBy=multi-user.target
```

### Line-by-line explanation
- Defines a simple, restart-on-failure service that runs as www-data, suitable for a web app health check.

Code block 2: Health check script
```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/var/log/app-health"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/health.log"

# Basic checks (customize for your app)
HEALTH_OK=1
curl -fsS http://localhost:8080/health >/dev/null 2>&1 || HEALTH_OK=0

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
printf "%s HEALTH=%s\\n" "$TIMESTAMP" "$HEALTH_OK" >> "$LOG"

if [[ "$HEALTH_OK" -ne 1 ]]; then
  exit 1
fi
```

### Line-by-line explanation
- Creates a log directory, runs a health check against a local endpoint, and logs the result with a timestamp.
- Exits non-zero if the health check fails, triggering systemd restart behavior.

## 5. Disk, Filesystem, and Storage Management

Key admin task in the cloud is handling disks, partitions, and mounting volumes; in AWS you’ll often attach EBS or instance store volumes. This section demonstrates basic inspection and a safe auto-mount example with UUID or LABEL rather than device names.

Code block 1: Inspect disks and mount a volume
```bash
#!/usr/bin/env bash
set -euo pipefail

# List disks with a readable overview
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Example: mount an attached volume (NVMe or SATA depends on instance type)
# Suppose /dev/nvme1n1 exists and you want to mount it at /mnt/data
sudo mkdir -p /mnt/data
sudo mount /dev/nvme1n1 /mnt/data

# Persist mounting using UUID to avoid device-name changes on reboot
UUID=$(blkid -s UUID -o value /dev/nvme1n1)
echo "UUID=$UUID /mnt/data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

### Line-by-line explanation
- lsblk prints structured disk information to identify devices and mount points.
- mount attaches a volume to a mount point.
- blkid reads the UUID of the device; adding an fstab entry ensures automatic mounting on boot independent of device naming.

Code block 2: Safe fstab best practice (UUID-based)
```bash
# Example fstab line (append with care)
# Ensure you replace with the actual device UUID
UUID=YOUR-DEVICE-UUID /mnt/data ext4 defaults,nofail 0 2
```

### Line-by-line explanation
- Using UUIDs rather than device paths avoids boot-time mounting problems when kernel or hardware changes reorder device names.

## 6. Networking Essentials and SSH in AWS

Networking and secure remote access are core to managing Linux hosts in the cloud. This section shows basic networking probes, SSH usage patterns, and a practical SSH config snippet for AWS-style access.

Code block 1: Basic network introspection
```bash
#!/usr/bin/env bash
set -euo pipefail

# Show all IPv4 addresses
ip -4 addr show scope global | awk '/inet/ {print $2, $7}'

# Check if SSH port is open on localhost
nc -zv 127.0.0.1 22 || echo "SSH port 22 closed"
```

### Line-by-line explanation
- ip addr show fetches network interface addresses; awk formats them.
- nc tests connectivity to port 22 on localhost, helpful for quick sanity checks.

Code block 2: SSH config snippet tailored for AWS EC2-style access
```text
# ~/.ssh/config
Host aws-web
  HostName ec2-12-34-56-78.compute-1.amazonaws.com
  User ec2-user
  IdentityFile ~/.ssh/aws-key.pem
  IdentitiesOnly yes

Host devbox
  HostName 54.210.11.99
  User ubuntu
  IdentityFile ~/.ssh/aws-ubuntu-key.pem
  Port 22
```

### Line-by-line explanation
- Defines convenient hosts with a name alias (aws-web, devbox) for quick SSH access.
- Sets the appropriate user and key, ensuring secure, repeatable access patterns.

Code block 3: AWS CLI to discover a public IP (optional AWS context)
```bash
#!/usr/bin/env bash
set -euo pipefail

# Get public IPs of instances tagged with Role=WebServer
aws ec2 describe-instances \
  --filters "Name=tag:Role,Values=WebServer" \
            "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].PublicIpAddress" \
  --output text
```

### Line-by-line explanation
- Uses AWS CLI to locate running instances with a given tag and prints their public IPs, enabling remote access automation or inventory tasks.

## 7. Logs, Monitoring, and Security Basics

Observability and security hygiene are essential in production. This section demonstrates log viewing, a minimal firewall setup, and basic log-forwarding concepts.

Code block 1: Journaling and log viewing basics
```bash
#!/usr/bin/env bash
set -euo pipefail

# View system logs since boot
journalctl -b

# Tail logs in real time
journalctl -f -u nginx.service
```

### Line-by-line explanation
- journalctl -b shows boot logs; -f tails logs in real time for a running service.

Code block 2: Basic firewall setup (Ubuntu/Dedora-like with UFW)
```bash
#!/usr/bin/env bash
set -euo pipefail

# Enable firewall and allow SSH
sudo ufw enable
sudo ufw allow 22/tcp
```

### Line-by-line explanation
- Enables the firewall and explicitly allows SSH; a critical step for remote administration.

Code block 3: Simple log-forwarding concept (pseudo)
```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/var/log/app.log"
TAIL_LOG="/var/log/app-tail.log"

# Append a simple line to simulate log shipping
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") INFO: Ship this line to a central log" >> "$LOG_FILE"

# In a real OS, you would tail and forward to a central service
# tail -F "$LOG_FILE" | some-log-forwarder
```

### Line-by-line explanation
- Writes a timestamped log line; points toward the common pattern of tailing a local log and shipping it to a central collector (e.g., CloudWatch Logs, ELK/OpenSearch).

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

1) Not quoting variables, leading to word-splitting and globbing
- Bad:
```bash
cp $SRC $DST
```
- Good:
```bash
cp -- "$SRC" "$DST"
```

2) Running as root for routine tasks; unsafe or non-idempotent operations
- Bad:
```bash
rm -rf /var/log/*
```
- Good:
```bash
set -euo pipefail
readonly TARGET="/var/log/myapp"
rm -rf -- "$TARGET"/*
```

3) Ignoring command failures in scripts
- Bad:
```bash
mkdir /opt/myapp
cp myapp /opt/myapp
```
- Good:
```bash
set -euo pipefail
mkdir -p /opt/myapp
cp -- "myapp" /opt/myapp/
```

4) Using device names in fstab that can change on reboot
- Bad:
```bash
/dev/xvdb1 /mnt/data ext4 defaults 0 2
```
- Good:
```bash
UUID=YOUR-DEVICE-UUID /mnt/data ext4 defaults,nofail 0 2
```

5) Not using idempotent scripting for bootstrap
- Bad:
```bash
apt-get install -y nginx
```
- Good:
```bash
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y nginx
fi
```

## Y. Why This Matters In Real Systems

- Security and least privilege: Proper user, group, and permission configurations reduce blast radii in multi-tenant environments.
- Predictability and idempotence: Automation tasks must be repeatable without side effects when rerun (critical for CI/CD pipelines and cloud autoscaling).
- Reliability through monitoring: Systemd services with Restart policies and health checks reduce incident response times.
- Cloud realities: AWS often involves ephemeral environments; using UUIDs for mount points and proper tag-based discovery simplifies management across environments.
- Observability and compliance: Logging, auditing, and centralized monitoring are foundational for incident response and governance.

## Z. Study Questions

1) What is the difference between using a device name (e.g., /dev/xvdb1) and a filesystem UUID in /etc/fstab, and why is UUID preferred in cloud instances?
2) How does systemd help you ensure a service restarts on failure, and what unit directives are involved?
3) Why is it important to quote variables in shell scripts, and what can go wrong if you don’t?
4) What AWS-specific steps can you take to securely access a Linux host after launching an EC2 instance?
5) Provide a small Bash snippet that checks if a given port is open on localhost and prints a friendly status.

## Exercise

A multi-part practical coding challenge to reinforce Linux fundamentals in an AWS context.

Part A — Build a small “health monitor” utility
- Create a script health_check.sh that outputs a compact JSON summary with:
  - cpu_cores: number of CPU cores
  - mem_mb: total memory in MB
  - disk_use_perc: percent disk usage on root (/) partition
  - healthy: true if all above thresholds pass (cpu_cores > 1, mem_mb > 512, disk_use_perc < 90)

Example output:
{"cpu_cores":4,"mem_mb":8192,"disk_use_perc":42,"healthy":true}

Part B — Make it a service with a timer
- Create a systemd service unit health-check.service that runs health_check.sh, and a timer health-check.timer that fires every 5 minutes.
- Ensure the service restarts on failure and logs to a dedicated journal.

Part C — Extend to AWS context
- Update health_check.sh to intake an environment variable THRESHOLD_DISK (default 90) and to print a warning line if disk_use_perc exceeds the threshold.
- Demonstrate how you would upload the JSON summary to CloudWatch Logs using the AWS CLI (pseudo-commands are fine; provide a realistic command structure you would implement).

Part D — Local automation sanity check
- Write a one-liner to verify that the health_check.sh script is executable and returns valid JSON (hint: use jq if available).
- If jq is not installed, show how to validate with a minimal shell check (no external tools).

Part E — Deployment notes
- Outline how you would bootstrap this on a new EC2 instance (Ubuntu or Amazon Linux 2) using a user-data script that installs jq (if needed), places the scripts, and enables the systemd timer.

Provide all code blocks with proper line-by-line explanations following each non-trivial block, and ensure the final solution is self-contained and copy-pasteable in a real AWS Linux environment (adjust paths if needed).