# Track: DevOps & Cloud Engineering — Module: Phase 1 — Linux & Scripting — Topic: Linux Fundamentals & Administration (Google Cloud)

Linux Fundamentals and Administration sit at the core of modern DevOps and Cloud engineering. Mastery of the Linux command line, scripting, and system services enables you to automate recurring tasks, enforce consistent environments, and operate scalable systems in Google Cloud. This lesson provides practical, beginner-friendly coverage of essential Linux concepts, with concrete code examples and production-oriented guidance.

## 1. Linux File System & Basic Commands

Understanding the Linux filesystem and core commands is foundational to all administration tasks. This section covers navigation, inspection, and simple file operations, plus a small backup script to illustrate real-world usage.

```bash
#!/usr/bin/env bash
# Basic navigation and inspection
echo "Present working directory:"; pwd
echo "Listing root directory contents:"; ls -la /
echo "Home directory size summary:"; du -sh ~/ 2>/dev/null || true
echo "Disk usage summary (including total):"
df -h --total

# Non-trivial backup script example
SRC="/var/log"
DEST="/opt/backups/$(date +%F_%H-%M-%S)"
mkdir -p "$DEST"
tar -czf "$DEST/logs.tar.gz" -C "$SRC" .
echo "Backed up $SRC to $DEST/logs.tar.gz"
```

### Line-by-line explanation breaking down each line

1) #!/usr/bin/env bash
- Uses the environment's bash to run the script, ensuring portability across distributions.

2) echo "Present working directory:"; pwd
- Prints a label and then the current working directory with pwd.

3) echo "Listing root directory contents:"; ls -la /
- Displays a detailed listing of the root directory for quick context.

4) echo "Home directory size summary:"; du -sh ~/ 2>/dev/null || true
- Shows the size of the current user's home directory; suppresses errors if home is inaccessible.

5) echo "Disk usage summary (including total):"
- Prints a header for the next command output.

6) df -h --total
- Shows human-readable disk usage statistics, including a total line.

7) SRC="/var/log"
- Sets the source directory to back up (example: system logs).

8) DEST="/opt/backups/$(date +%F_%H-%M-%S)"
- Creates a timestamped destination path to avoid overwriting backups.

9) mkdir -p "$DEST"
- Creates the destination directory if it doesn't exist.

10) tar -czf "$DEST/logs.tar.gz" -C "$SRC" .
- Archives and compresses the contents of SRC into a tar.gz file inside DEST.

11) echo "Backed up $SRC to $DEST/logs.tar.gz"
- Confirms the backup completed and where it was stored.

---

## 2. Users, Groups, Permissions

Managing users, groups, and permissions is critical for security and collaboration. This section demonstrates safe user creation, group assignment, and a minimal, restricted sudo rule.

```bash
#!/usr/bin/env bash
set -euo pipefail
# Create a new user with a home directory and login shell
sudo useradd -m -s /bin/bash devops

# Optional: ensure the sudo group exists and add the user to a controlled sudoers entry
sudo usermod -aG sudo devops
sudo mkdir -p /opt/projects
sudo chown devops:devops /opt/projects
sudo chmod 750 /opt/projects

# Create a minimal, restricted sudo rule for the devops user
printf 'devops ALL=(ALL) NOPASSWD: /bin/systemctl' | sudo tee /etc/sudoers.d/devops
sudo chmod 440 /etc/sudoers.d/devops
```

### Line-by-line explanation breaking down each line

1) #!/usr/bin/env bash
- Executes with the system's Bash interpreter for portability.

2) set -euo pipefail
- Enables strict error handling:
  - -e: exit on any non-zero status
  - -u: treat unset variables as an error
  - -o pipefail: propagate errors through pipelines

4) sudo useradd -m -s /bin/bash devops
- Creates a new user named devops with a home directory and Bash login shell.

6) sudo usermod -aG sudo devops
- Adds devops to the sudo group to allow administrative actions (use with care in production).

7) sudo mkdir -p /opt/projects
- Creates a shared project directory.

8) sudo chown devops:devops /opt/projects
- Sets ownership to the devops user and group.

9) sudo chmod 750 /opt/projects
- Grants full access to the owner, read/execute to the group, none to others.

11) printf 'devops ALL=(ALL) NOPASSWD: /bin/systemctl' | sudo tee /etc/sudoers.d/devops
- Creates a minimal sudoers rule allowing the devops user to run systemctl without a password. (Note: Use with caution and consider per-command restrictions in production.)

12) sudo chmod 440 /etc/sudoers.d/devops
- Restricts the sudoers file to read permission for safety.

---

## 3. Bash Scripting Essentials

Bash scripting is the primary tool for automation in Linux. This section introduces a robust, argument-driven script with input validation and error handling.

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

logfile="/var/log/backup.log"
dest="$HOME/backups"
mkdir -p "$dest"

usage() {
  echo "Usage: $0 <source> <dest>"
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

src="$1"
dst="$2"

if [[ ! -d "$src" ]]; then
  echo "Source directory not found: $src" >&2
  exit 2
fi

archive="$dst/$(basename "$src")-$(date +%F).tar.gz"
tar -czf "$archive" -C "$src" .
echo "Archived $src to $archive" >> "$logfile"
```

### Line-by-line explanation breaking down each line

1) #!/usr/bin/env bash
- Uses Bash for script execution.

2) set -euo pipefail
- Enables strict error handling and safer scripting practices.

3) IFS=$'\n\t'
- Sets Internal Field Separator to newline and tab to prevent word-splitting issues on spaces.

5) logfile="/var/log/backup.log"
- Path to a log file for appending messages.

6) dest="$HOME/backups"
- Destination directory for archives.

7) mkdir -p "$dest"
- Creates the destination directory if needed.

9) usage() { ... }
- Defines a helper function to show correct usage and exit.

12) if [[ $# -lt 2 ]]; then usage; fi
- Validates that at least two arguments were provided.

14) src="$1"
15) dst="$2"
- Assigns positional parameters to named variables.

17) if [[ ! -d "$src" ]]; then ... fi
- Checks that the source path exists and is a directory.

21) archive="$dst/$(basename "$src")-$(date +%F).tar.gz"
- Builds a timestamped archive path.

22) tar -czf "$archive" -C "$src" .
- Creates a compressed tarball of the source directory.

23) echo "Archived $src to $archive" >> "$logfile"
- Logs the operation to a logfile.

---

## 4. Package Management & Services

Installing and managing software packages and services is central to Linux administration. This section shows a typical package install with both Debian/Ubuntu and RHEL/CentOS paths, plus starting and enabling a service.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Debian/Ubuntu path
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo ufw allow 'Nginx Full' || true
sudo ufw -q status

# Red Hat/CentOS path (uncomment if needed)
# sudo yum install -y nginx
# sudo systemctl enable nginx
# sudo systemctl start nginx
```

### Line-by-line explanation breaking down each line

1) #!/usr/bin/env bash
- Declares Bash interpreter.

2) set -euo pipefail
- Enables strict error handling.

4) sudo apt-get update
- Updates the apt package index (Debian/Ubuntu).

5) sudo apt-get install -y nginx
- Installs Nginx non-interactively.

6) sudo systemctl enable nginx
- Configures Nginx to start on boot.

7) sudo systemctl start nginx
- Starts the Nginx service immediately.

8) sudo ufw allow 'Nginx Full' || true
- Opens the appropriate firewall rule for web traffic (best practice is to use a cloud firewall as well). The "|| true" ensures the script continues if UFW is not installed.

9) sudo ufw -q status
- Quietly shows the firewall status.

11) # Red Hat/CentOS path (uncomment if needed)
12-14) (alternative commands) 
- Optional for environments using yum instead of apt.

---

## 5. Basic Networking & Security in Linux

Networking and security practices ensure that services are reachable and protected. This section covers host-based firewall rules and a Google Cloud firewall example.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Linux firewall (ufw) example
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw --force enable
sudo ufw status verbose
```

### Line-by-line explanation breaking down each line

1) #!/usr/bin/env bash
- Uses Bash interpreter.

2) set -euo pipefail
- Enables strict error handling.

4) sudo ufw default deny incoming
- Drops all unsolicited inbound connections by default.

5) sudo ufw default allow outgoing
- Allows outbound connections by default.

6) sudo ufw allow 22/tcp
- Permits SSH traffic on port 22.

7) sudo ufw allow 80/tcp
- Permits HTTP traffic on port 80.

8) sudo ufw allow 443/tcp
- Permits HTTPS traffic on port 443.

9) sudo ufw --force enable
- Enables the firewall immediately, forcing confirmation.

10) sudo ufw status verbose
- Shows the current firewall rules.

Cloud-firewall example (Google Cloud)
```bash
# Create a firewall rule to allow HTTP traffic to instances with the tag http-server
gcloud compute firewall-rules create allow-nginx \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80 \
  --target-tags=http-server
```

### Line-by-line explanation breaking down each line

1) gcloud compute firewall-rules create allow-nginx \
- Initiates creation of a new firewall rule named allow-nginx.

2) --direction=INGRESS \
- Applies to incoming traffic.

3) --priority=1000 \
- Sets the rule priority (lower numbers have higher precedence).

4) --network=default \
- Applies the rule to the default VPC network.

5) --action=ALLOW \
- Specifies that traffic matching the rule should be allowed.

6) --rules=tcp:80 \
- Allows TCP traffic on port 80 (HTTP).

7) --target-tags=http-server
- Applies the rule only to instances with the http-server network tag.

---

## 6. Cloud-Integrated Linux Ops (Google Cloud)

Google Cloud augments Linux administration with metadata, startup scripts, and easy VM provisioning. This section shows how to attach a startup script to a VM and verify networking.

```bash
# Create a simple startup script that installs Nginx on first boot
cat > startup.sh <<'SCRIPT'
#!/bin/bash
apt-get update
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
SCRIPT
chmod +x startup.sh

# Create a Debian-based VM with the startup script via metadata
gcloud compute instances create linux-fundamentals-demo \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --machine-type=e2-medium \
  --boot-disk-size=20GB \
  --metadata-from-file startup-script=startup.sh

# Retrieve the external IP to access the web server
EXTERNAL_IP=$(gcloud compute instances describe linux-fundamentals-demo \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)') && echo "External IP: $EXTERNAL_IP"

# (Optional) SSH into the instance
# gcloud compute ssh linux-fundamentals-demo
```

### Line-by-line explanation breaking down each line

1) # Create a simple startup script that installs Nginx on first boot
2) cat > startup.sh <<'SCRIPT'
- Begins a here-document to write a script to startup.sh.

3) #!/bin/bash
- Shebang for the startup script.

4) apt-get update
- Updates package indices (Debian-based).

5) apt-get install -y nginx
- Installs Nginx non-interactively.

6) systemctl enable nginx
- Enables Nginx to start on boot.

7) systemctl start nginx
- Starts Nginx immediately.

8) SCRIPT
- Ends the here-document.

9) chmod +x startup.sh
- Makes the startup script executable.

11) gcloud compute instances create linux-fundamentals-demo \
12)   --image-family=debian-11 \
13)   --image-project=debian-cloud \
14)   --machine-type=e2-medium \
15)   --boot-disk-size=20GB \
16)   --metadata-from-file startup-script=startup.sh
- Creates a new Google Compute Engine VM with Debian 11 and attaches the startup script via metadata so it runs on first boot.

18) EXTERNAL_IP=... && echo "External IP: $EXTERNAL_IP"
- Retrieves and prints the VM's external IP address.

20) # gcloud compute ssh linux-fundamentals-demo
- Optional command to SSH into the instance once it's up.

---

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code, side-by-side.

Pitfall 1 — Unquoted variables leading to word splitting and globbing
Bad:
```bash
rm -rf /var/log/$LOG_DIR
```
Good:
```bash
rm -rf "/var/log/$LOG_DIR"
```

Pitfall 2 — Not using strict Bash safety flags
Bad:
```bash
#!/bin/bash
echo "Starting..."
cp "$SRC" "$DEST"
```
Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
cp "$SRC" "$DEST"
```

Pitfall 3 — Running privileged commands inside a script without guarding permissions
Bad:
```bash
#!/bin/bash
apt-get update
apt-get install -y nginx
```
Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
sudo apt-get update
sudo apt-get install -y nginx
```
(Prefer running the entire script with proper elevation or using the system’s configuration management instead of sprinkling sudo calls everywhere.)

Pitfall 4 — Not validating inputs to scripts
Bad:
```bash
#!/bin/bash
log="${1}"
backup "${log}"
```
Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
log="${1:-default.log}"
if [[ ! -f "$log" ]]; then
  echo "Log file not found: $log" >&2
  exit 1
fi
backup "$log"
```

---

## Y. Why This Matters In Real Systems

- Reproducibility: Scripts and startup configurations ensure environments can be recreated consistently, reducing "it works on my machine" problems.
- Automation at scale: Linux fundamentals enable automation across dozens or thousands of instances in Google Cloud, enabling faster iteration and deployment.
- Security and compliance: Proper user permissions, restricted sudo rules, and firewall configurations reduce the attack surface and support compliance needs.
- Reliability and maintenance: Understanding services (systemd, startup scripts) improves uptime, logging, and recoverability, especially in dynamic cloud environments.
- Cost and performance: Efficient scripting reduces human error and makes automation cheaper and more predictable, while proper resource management helps control cloud costs.

---

## Z. Study Questions

1) What is the purpose of set -euo pipefail in a Bash script, and how does it improve reliability?
2) How can you attach a startup script to a Google Compute Engine instance, and when does it run?
3) What is the difference between a Linux firewall (like UFW) and a cloud firewall rule in Google Cloud?
4) How would you securely grant a user limited sudo capabilities, without giving full root access?
5) Name two commands to verify that a newly installed web server (e.g., Nginx) is reachable from a client.

---

## Exercise

Part A — User and Permissions
- Create a user named devops with a home directory and Bash shell.
- Add devops to the sudo group and restrict sudo to a subset of commands (e.g., systemctl only).
- Create a shared project directory at /opt/projects and set ownership to devops with 750 permissions.

Part B — Scripting and Backup
- Write a Bash script backup_dirs.sh that takes two arguments: a source directory and a destination directory. It should validate inputs, create the destination, and save a timestamped tar.gz archive of the source inside the destination. It should log activity to /var/log/backup.log.

Part C — Web Server Setup
- Install Nginx, enable and start it, and deploy a simple index.html page under /var/www/html.
- Ensure the firewall allows HTTP traffic (either UFW or Google Cloud firewall rule).

Part D — Startup Script on Google Cloud
- Create a startup script (startup.sh) that updates packages and installs Nginx, enables and starts it.
- Create a Debian-based VM on Google Cloud with this startup script attached via metadata. Retrieve the external IP and verify you can access the default Nginx page from a browser.

Part E — Quick Verification Commands
- Provide a short set of commands to verify that:
  - The devops user exists and has restricted sudo access.
  - The backup script runs with correct arguments.
  - Nginx is running and serving index.html.

Code snippets for the exercise should be written in Bash and aligned with best practices discussed in this lesson.