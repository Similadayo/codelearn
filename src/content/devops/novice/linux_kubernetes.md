# Linux Fundamentals & Administration for Kubernetes

Compelling introductory paragraph: In a Kubernetes-driven environment, Linux fundamentals underpin every operation—from provisioning and securing nodes to scripting automation, logging, and interfacing with cluster APIs. A strong foundation in the Linux command line, user and permission management, process supervision, and safe scripting is essential for reliable, scalable DevOps and Cloud Engineering. This lesson layers practical commands, robust scripts, and Kubernetes-aligned patterns to prepare you for real-world on-call work and automation at scale.

## 1. Linux CLI Essentials and File System Basics

- Learn core CLI concepts, file system structure, permissions, and safe scripting practices that are foundational for node administration in Kubernetes.
- This section emphasizes practical, repeatable commands and a robust backup script to illustrate idempotence and error handling.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Basic backup script: packs a source directory and writes a log.
SOURCE_DIR="/opt/app"
BACKUP_ROOT="/var/backups/app"
DATE_STAMP=$(date +%F-%H%M)
BACKUP_FILE="${BACKUP_ROOT}/app-${DATE_STAMP}.tar.gz"
LOG_FILE="/var/log/backup-${DATE_STAMP}.log"

# Ensure backup root exists
mkdir -p "$BACKUP_ROOT"

# Early guard: source must exist
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source dir not found: $SOURCE_DIR" >> "$LOG_FILE"
  exit 1
fi

# If source is empty, exit gracefully
if [ -z "$(ls -A "$SOURCE_DIR" 2>/dev/null)" ]; then
  echo "Nothing to backup in $SOURCE_DIR" >> "$LOG_FILE"
  exit 0
fi

# Create a compressed tarball of the source
tar czf "$BACKUP_FILE" -C "$SOURCE_DIR" .

# Log the backup
echo "Backup created: $BACKUP_FILE" >> "$LOG_FILE"

# Rotate old backups: keep the most recent 7 backups
ls -1t "${BACKUP_ROOT}/app-"*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
```

### Line-by-line explanation
- #!/usr/bin/env bash: Use the system shell to run the script; portable across environments.
- set -euo pipefail: Enable strict error handling; exit on errors, unset vars, and failures in pipelines.
- SOURCE_DIR="/opt/app": Directory to back up.
- BACKUP_ROOT="/var/backups/app": Destination directory for backups.
- DATE_STAMP=$(date +%F-%H%M): Timestamp for backup naming.
- BACKUP_FILE="...": Path to the tarball that will be created.
- LOG_FILE="...": Per-backup log file for traceability.
- mkdir -p "$BACKUP_ROOT": Ensure the backup directory exists without error if it already does.
- if [ ! -d "$SOURCE_DIR" ]; then ...: Guard against missing source; log and exit with failure.
- if [ -z "$(ls -A "$SOURCE_DIR" 2>/dev/null)" ]; then ...: Check for an empty source directory; log and exit gracefully.
- tar czf "$BACKUP_FILE" -C "$SOURCE_DIR" .: Create a gzip-compressed tarball of the source contents.
- echo "Backup created: ..." >> "$LOG_FILE": Record the outcome for auditing.
- ls -1t ... | tail -n +8 | xargs -r rm -f: List backups by recency, remove all but the latest 7 (rotation/retention policy).

### Line-by-line explanation (idempotence and safety)
- The script explicitly checks for the existence of the source and content before creating a backup, reducing unnecessary file writes.
- Quoted variable expansions prevent word-splitting and globbing issues in paths with spaces.
- The rotation step uses xargs -r to avoid errors if there are fewer than 8 backups.

## 2. Managing Users, Groups, and Permissions

- Grasp how to create system users, grant limited sudo rights for narrowly-scoped operations, and set secure directory permissions—crucial for running workloads on Kubernetes nodes without expanding the blast radius.

```bash
#!/bin/bash
set -euo pipefail

USER="devops"
SUDOERS_FILE="/etc/sudoers.d/${USER}"

# Create user if missing
if ! id "$USER" &>/dev/null; then
  sudo useradd -m -s /bin/bash "$USER"
fi

# Grant limited sudo rights for restarting the app service (no password)
echo "${USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart app.service" | sudo tee "$SUDOERS_FILE" >/dev/null
sudo chmod 440 "$SUDOERS_FILE"

# Prepare an application data directory owned by the user
sudo mkdir -p /var/app/data
sudo chown "${USER}:${USER}" /var/app/data
sudo chmod 750 /var/app/data
```

### Line-by-line explanation
- #!/bin/bash; set -euo pipefail: As above, ensure safe execution and explicit error handling.
- USER="devops": The intended admin user for app maintenance.
- SUDOERS_FILE="/etc/sudoers.d/${USER}": Location to store a per-user sudo rule.
- if ! id "$USER" &>/dev/null; then ...: Create the user if it doesn’t exist, preserving idempotence.
- sudo useradd -m -s /bin/bash "$USER": Create a home directory and assign a shell for the user.
- echo "...": Write a narrowly scoped sudo rule that permits restarting a single service without a password.
- sudo tee "$SUDOERS_FILE": Safely create the sudoers file with the specified rule.
- sudo chmod 440 "$SUDOERS_FILE": Harden the sudoers file permissions.
- sudo mkdir -p /var/app/data; sudo chown ...; sudo chmod 750: Create an application data dir, assign ownership to the user, and restrict access to ensure data integrity and security.

## 3. Process, Logging, and Service Management on Nodes

- Learn how to monitor critical services, view and forward logs, and implement basic health checks—skills that translate directly to Kubernetes node maintenance, daemon management, and observability patterns.

```bash
#!/usr/bin/env bash
set -euo pipefail

SERVICE="kubelet"

# Check service status
if systemctl is-active --quiet "$SERVICE"; then
  echo "$SERVICE is running"
else
  echo "$SERVICE is not running" >&2
  # Here you might trigger a restart or alert
fi

# Emit a log entry for observability
logger -t k8s-health "Health: $SERVICE status checked at $(date '+%Y-%m-%d %H:%M:%S')"

# Exit with failure if service is not active
systemctl is-active --quiet "$SERVICE" || exit 1
```

### Line-by-line explanation
- #!/usr/bin/env bash; set -euo pipefail: Standard safety boilerplate.
- SERVICE="kubelet": Target service to monitor (typical Kubernetes node agent).
- if systemctl is-active --quiet "$SERVICE"; then ...: Use systemd to check if the service is running.
- echo "$SERVICE is running"/not running: Basic user feedback for scripts or logs.
- logger -t k8s-health "...": Send a structured log entry to the system logger with a tag.
- systemctl is-active --quiet "$SERVICE" || exit 1: Fail the script if the service isn’t active, enabling automation to catch issues.

## 4. Scripting for Kubernetes: Observability and Maintenance

- This section connects Linux scripting with Kubernetes workflows. It demonstrates a lightweight approach to health checks, integration with kubectl, and cluster-aware automation while keeping host-level discipline.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Basic Kubernetes health check via API endpoint (requires access)
K8S_API="${K8S_API_ENDPOINT:-https://127.0.0.1:6443/healthz}"
NODE_HOSTNAME="$(hostname)"

if curl -sk "$K8S_API" >/dev/null; then
  echo "Kubernetes API healthy on node $NODE_HOSTNAME"
else
  echo "Kubernetes API unhealthy on node $NODE_HOSTNAME" >&2
  exit 1
fi
```

### Line-by-line explanation
- K8S_API="${K8S_API_ENDPOINT:-https://127.0.0.1:6443/healthz}": Read a cluster API health endpoint from environment or default.
- NODE_HOSTNAME="$(hostname)": Capture the current node’s hostname for context in logs.
- curl -sk "$K8S_API" >/dev/null: Health probe of the Kubernetes API; -k ignores TLS certificate validation for demonstration (not recommended in production).
- echo/... or exit 1: Emit status and fail if the API is unhealthy.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Unquoted variables leading to word-splitting
  - Bad:
    ```bash
    for f in /var/log/*; do
      cat $f
    done
    ```
  - Good:
    ```bash
    for f in /var/log/*; do
      [ -f "$f" ] && cat "$f"
    done
    ```
- Pitfall 2: Not enabling strict mode in scripts
  - Bad:
    ```bash
    #!/bin/bash
    backup_dir="/var/backups"
    src_dir="/opt/app"
    tar czf "$backup_dir/app.tar.gz" -C "$src_dir" .
    ```
  - Good:
    ```bash
    #!/usr/bin/env bash
    set -euo pipefail
    backup_dir="/var/backups"
    src_dir="/opt/app"
    tar czf "$backup_dir/app.tar.gz" -C "$src_dir" .
    ```
- Pitfall 3: Storing credentials in code or logs
  - Bad:
    ```bash
    DB_PASSWORD="secret"
    ./deploy.sh --password "$DB_PASSWORD"
    ```
  - Good:
    ```bash
    export DB_PASSWORD="${DB_PASSWORD:-}"
    ./deploy.sh --password "$DB_PASSWORD"
    ```
- Pitfall 4: Not accounting for spaces in filenames or paths
  - Bad:
    ```bash
    cp /path/to/$FILE /backup/
    ```
  - Good:
    ```bash
    cp "/path/to/$FILE" "/backup/"
    ```
  - Bonus pitfall: using globbing in scripts without validation (risk of unexpected matches).

## Y. Why This Matters In Real Systems

- Linux fundamentals are the baseline for reliable Kubernetes operation. Node provisioning and maintenance rely on predictable filesystem layouts, secure user management, robust process supervision, and observability. Practices shown here:
  - Enable safe automation and repeatable deployments on cluster nodes.
  - Improve security by using limited sudo privileges and proper directory permissions.
  - Improve reliability through idempotent scripts, proper error handling, and log-driven troubleshooting.
  - Align with Kubernetes patterns: scripts and services on nodes complement controllers, operators, and cloud-native tooling; Kubernetes manifests (CronJobs, DaemonSets) can orchestrate Linux-based tasks across many nodes with predictable behavior.
- Real-world usage scenarios:
  - Regular backups of application data on every node or on a designated storage class.
  - Node-health checks and auto-recovery hooks integrated with systemd or Kubernetes health checks.
  - Centralized log collection and alerting for security events, deployment changes, or resource pressure.

## Z. Study Questions — 5 recall questions

1. What does set -euo pipefail do, and why is it recommended in scripts that manage production infrastructure?
2. How would you grant a user permission to restart a specific systemd service without giving full root access?
3. Why is quoting variables important in shell scripts, and how can failing to quote lead to bugs?
4. How can you rotate old backups in a script, and why is rotation important for storage management?
5. What is the purpose of a Kubernetes CronJob, and how could you use a Linux backup script within a CronJob?

## Exercise

Part A — Implement and test a robust backup script
- Create a script named backup.sh that:
  - Backs up /opt/app to /var/backups/app with a timestamp.
  - Writes a log entry to /var/log/backup.log.
  - Maintains a retention of last 7 backups (rotate older files).
- Make the script executable and run it manually to verify behavior.

Part B — Add a systemd service and timer to automate backups
- Create /etc/systemd/system/app-backup.service that runs /usr/local/bin/backup.sh.
- Create /etc/systemd/system/app-backup.timer to schedule the backup at 02:00 daily.
- Enable and start the timer: systemctl enable --now app-backup.timer.

Part C — Kubernetes context: CronJob to run backup in-cluster
- Prepare a container image that includes backup.sh (or copy it into the container image at build time).
- Write a Kubernetes CronJob manifest to run the backup container daily at 02:00, mounting a PersistentVolumeClaim named backup-pvc at /var/backups.
- Example manifest (adjust image and PVC as appropriate):
  apiVersion: batch/v1
  kind: CronJob
  metadata:
    name: node-backup
  spec:
    schedule: "0 2 * * *"
    jobTemplate:
      spec:
        template:
          spec:
            containers:
            - name: backup
              image: myregistry/linux-backup:latest
              env:
              - name: SOURCE_DIR
                value: /opt/app
              - name: BACKUP_ROOT
                value: /var/backups
              volumeMounts:
              - name: backup-storage
                mountPath: /var/backups
              securityContext:
                runAsNonRoot: true
            restartPolicy: OnFailure
            volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-pvc

Notes:
- Ensure the container image includes backup.sh and appropriate tooling (tar, mkdir, etc.).
- The PVC backup-pvc must be created in advance and bound to a compatible storage class.
- In production, prefer least-privilege containers and avoid privileged mode unless absolutely necessary.

If you’d like, I can tailor the exercises to your environment (specific distro, CI/CD tooling, or your Kubernetes cluster type) and provide ready-to-apply files for your repo.