# Track: DevOps & Cloud Engineering — Phase 1: Linux & Scripting — Bash Scripting for Automation (AWS)

Bash scripting is the bread-and-butter of automation in Linux and cloud environments. In AWS contexts, well-crafted scripts let you provision, back up, monitor, and recover with repeatable, auditable steps that scale. This lesson builds practical Bash skills you can apply to everyday DevOps tasks: safe scripting practices, parameterization, AWS CLI automation, and robust error handling. You’ll learn patterns that translate to cron jobs, CI/CD pipelines, and ephemeral AWS environments where speed, reliability, and traceability matter.

## 1. Bash Fundamentals and Safe Scripting
Code examples here introduce safe scripting practices, portable patterns, and simple backup automation to ground the concepts.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Simple directory backup: creates a tar.gz of SOURCE_DIR into DEST_DIR with a timestamp

SOURCE_DIR="${1:-/var/www}"
DEST_DIR="${2:-/tmp/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="${DEST_DIR}/backup-${TIMESTAMP}.tar.gz"

mkdir -p "$DEST_DIR"
tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
echo "Backup created: $ARCHIVE"
```
### Line-by-line explanation breaking down each line
1. Shebang to use env's bash interpreter for portability across environments.
2. Enable strict modes: exit on error (-e), treat unset vars as error (-u), fail on errors in pipelines (-o pipefail), and fail on any command in a pipeline.
3. SOURCE_DIR is set from the first positional argument, or defaults to /var/www if not provided.
4. DEST_DIR is set from the second positional argument, or defaults to /tmp/backups if not provided.
5. TIMESTAMP captures the current date and time in a sortable format.
6. ARCHIVE constructs the full path for the backup archive.
7. Create the destination directory if it does not exist.
8. Create a gzipped tarball of SOURCE_DIR, with the archive path specified.
9. Print the path to the created backup for user feedback.

## 2. Parameters, Functions, and Reusable Patterns
Code examples focus on argument parsing, input validation, and modularization with functions to promote reusability.

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 -s SOURCE_DIR -d DEST_DIR" >&2
  exit 1
}

SOURCE_DIR=""
DEST_DIR=""

while getopts ":s:d:" opt; do
  case "$opt" in
    s) SOURCE_DIR="$OPTARG" ;;
    d) DEST_DIR="$OPTARG" ;;
    :) echo "Option -$OPTARG requires an argument" >&2; usage ;;
    \?) echo "Unknown option: -$OPTARG" >&2; usage ;;
  esac
done

if [[ -z "${SOURCE_DIR}" || -z "${DEST_DIR}" ]]; then
  usage
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="${DEST_DIR}/backup-${TIMESTAMP}.tar.gz"

mkdir -p "$DEST_DIR"
tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
echo "Backup created: $ARCHIVE"
```
### Line-by-line explanation breaking down each line
1. Shebang for portability.
2. Enable strict mode: exit on error, unset variables cause errors, pipefail behavior, and treat undefined vars as errors.
3. Define a function named usage to print proper usage and exit with code 1.
4. Initialize SOURCE_DIR to empty, to be set via options.
5. Initialize DEST_DIR to empty, to be set via options.
6-13. Process command-line options using getopts:
   - -s sets SOURCE_DIR to the provided argument.
   - -d sets DEST_DIR to the provided argument.
   - : handles missing argument for an option and shows usage.
   - ? handles unknown options and shows usage.
14-16. Validate that both SOURCE_DIR and DEST_DIR were provided; otherwise show usage.
17. Generate a timestamp for the backup.
18. Build the full path for the archive.
19-20. Ensure destination exists and create the tarball from SOURCE_DIR.
21. Confirm backup creation to the user.

## 3. AWS CLI in Bash: Common Automation Scenarios
Code examples illustrate calling AWS CLI from Bash to discover resources and generate simple output suitable for automation.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Ensure AWS CLI is installed
command -v aws >/dev/null 2>&1 || { echo "aws CLI not found"; exit 1; }

SOURCE_DIR="${1:-/var/www}"
BUCKET="${2:-my-app-backups}"
PREFIX="${3:-backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="/tmp/backup-${TIMESTAMP}.tar.gz"

tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
aws s3 cp "$ARCHIVE" "s3://${BUCKET}/${PREFIX}/backup-${TIMESTAMP}.tar.gz"
echo "Uploaded to s3://${BUCKET}/${PREFIX}/backup-${TIMESTAMP}.tar.gz"
```
### Line-by-line explanation breaking down each line
1. Shebang to use Bash for portability in Linux/UNIX environments.
2. Enable strict shell options to catch errors early.
3. Check if the AWS CLI is installed; if not, print an error and exit.
4. SOURCE_DIR: directory to back up, defaulting to /var/www.
5. BUCKET: target S3 bucket, defaulting to my-app-backups.
6. PREFIX: S3 prefix path, defaulting to backups.
7. TIMESTAMP: timestamp used to create unique backup names.
8. ARCHIVE: local path for the tarball created from SOURCE_DIR.
9. Create the tarball with gzip compression, switching to SOURCE_DIR for proper pathing.
10. Copy the archive to S3 using a structured path, ensuring a clean, repeatable location.
11. Print the final S3 location for traceability.

## 4. Idempotency, Logging, and Error Handling in Auto-Deployments
Code examples show how to make scripts idempotent, emit structured logs, and handle failures gracefully in automated environments.

```bash
#!/usr/bin/env bash
set -euo pipefail
LOG_FILE="/var/log/bash-automation.log"

# Simple tee-based logging for both stdout and stderr
exec > >(tee -a "$LOG_FILE") 2>&1

SOURCE_DIR="${1:-/var/www}"
BUCKET="${2:-my-app-backups}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="/tmp/backup-${TIMESTAMP}.tar.gz"

tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
aws s3 cp "$ARCHIVE" "s3://${BUCKET}/backups/backup-${TIMESTAMP}.tar.gz"
echo "Backup complete: backup-${TIMESTAMP}.tar.gz"
```
### Line-by-line explanation breaking down each line
1. Shebang for portability.
2. Enable strict mode to avoid silent failures and undefined behavior.
3. Define a log file path for centralized logs.
4. Redirect all stdout and stderr to a process substitution that tees into the log file, ensuring real-time logging.
5. SOURCE_DIR argument with a default fallback.
6. BUCKET argument with a default fallback.
7. TIMESTAMP for unique naming.
8. ARCHIVE path in /tmp to store the tarball.
9. Create the tarball from SOURCE_DIR with gzip compression.
10. Upload the archive to S3, into a stable backups/ prefix.
11. Print a completion message with the archive name.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Not quoting variables
  - Bad:
  ```bash
  #!/bin/bash
  cp $SRC $DEST
  ```
  - Good:
  ```bash
  #!/bin/bash
  cp "$SRC" "$DEST"
  ```
- Pitfall 2: Failing to handle unset variables
  - Bad:
  ```bash
  echo "User: $USER"
  ```
  - Good:
  ```bash
  set -o nounset
  echo "User: ${USER:-unknown}"
  ```
- Pitfall 3: Ignoring command failures
  - Bad:
  ```bash
  rm /tmp/nonexistent_file
  echo "Done"
  ```
  - Good:
  ```bash
  if rm /tmp/nonexistent_file; then
    echo "Removed if existed"
  else
    echo "Nothing to remove" >&2
  fi
  ```
- Pitfall 4: Hard-coding credentials in scripts
  - Bad:
  ```bash
  export AWS_ACCESS_KEY_ID="AKIA..."
  export AWS_SECRET_ACCESS_KEY="abcd..."
  ```
  - Good:
  ```bash
  # Use IAM roles or AWS_PROFILE
  export AWS_PROFILE="automation"
  aws s3 ls
  ```
- Pitfall 5: Overly broad wildcard usage in destructive commands
  - Bad:
  ```bash
  rm -rf /tmp/*
  ```
  - Good:
  ```bash
  TARGET="/tmp/myapp"
  rm -rf -- "$TARGET"/*
  ```

## Y. Why This Matters In Real Systems — production context and real usage
- Reproducibility and auditability: Bash scripts paired with version control become repeatable deploys and backups, reducing configuration drift.
- CI/CD and automation: Scripts are used in build pipelines, nightly backups, on-boot bootstrap sequences, and incident-response playbooks. They must be reliable, idempotent, and auditable.
- Cloud integrations: AWS CLI-driven scripts enable resource discovery, backups, and deployments without requiring heavy GUI tooling. IAM roles and credentials management are critical for security.
- Observability: Logging to stdout/Files and CloudWatch in AWS contexts provides visibility into what automation did, when, and why it failed.
- Security best practices: Do not embed credentials; use IAM roles, temporary credentials (STS), and AWS Secrets Manager where needed. Run automation with the least-privilege principle.
- Error handling and retries: In real systems, transient failures are common (network hiccups, service throttling). Scripts should fail fast but retry gracefully or escalate.
- Idempotency: Automation should be safe to re-run. Creating or updating resources should be a no-op if already in the desired state. This is essential in orchestration and scheduled jobs.

## Z. Study Questions — 5 recall questions
1) What does set -euo pipefail do, and why is it important in automation scripts?
2) How would you safely pass and use positional arguments in a Bash script?
3) Why is quoting variables important in shell scripts, and what can go wrong if you don’t quote them?
4) How can you integrate AWS CLI with a Bash script while following the principle of least privilege?
5) What strategies make a Bash-based automation task idempotent and reliable under retries?

## Exercise — a practical multi-part coding challenge
Goal: Build a robust, reusable Bash utility that backs up a local directory to S3 with logging, optional dry-run, and a retention policy.

Part A: Starter Skeleton
- Create a script named backup_to_s3.sh that accepts:
  - Required: -s SOURCE_DIR, -b S3_BUCKET
  - Optional: --dry-run, --days-to-keep N
- Behavior:
  - Validate inputs.
  - If --dry-run is passed, print what would be done without performing AWS S3 writes.
  - Create a timestamped tar.gz from SOURCE_DIR.
  - Upload to s3://S3_BUCKET/backups/backup-<timestamp>.tar.gz unless in dry-run.
  - Log actions to /var/log/backup_to_s3.log with timestamps.

Starter template (you may modify as needed):
```bash
#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
DAYS_KEEP=7
SOURCE_DIR=""
BUCKET=""

# Basic arg parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--source)
      SOURCE_DIR="$2"; shift 2;;
    -b|--bucket)
      BUCKET="$2"; shift 2;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --days-to-keep)
      DAYS_KEEP="$2"; shift 2;;
    *)
      echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# Validate
if [[ -z "$SOURCE_DIR" || -z "$BUCKET" ]]; then
  echo "Usage: $0 -s SOURCE_DIR -b BUCKET [--dry-run] [--days-to-keep N]" >&2
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="/tmp/backup-${TIMESTAMP}.tar.gz"

# Create archive
tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
DEST="s3://${BUCKET}/backups/backup-${TIMESTAMP}.tar.gz"

if "$DRY_RUN"; then
  echo "[DRY-RUN] Would upload $ARCHIVE to $DEST"
else
  aws s3 cp "$ARCHIVE" "$DEST"
  echo "Uploaded $ARCHIVE to $DEST"
  # Retention policy: delete backups older than DAYS_KEEP days
  aws s3 ls "s3://${BUCKET}/backups/" | \
    awk "{print \\$4}" | \
    while read -r key; do
      # Placeholder: implement date parsing for real-world usage
      :
    done
fi

# Logging
LOG="/var/log/backup_to_s3.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup attempted: ${ARCHIVE} -> ${DEST}" >> "$LOG"
```

Part B: Extend with a real retention policy
- Implement logic to list objects under s3://BUCKET/backups/ and delete those older than DAYS_KEEP days, using aws s3api list-objects-v2 and a time-based filter.
- Add error handling around AWS calls and ensure the script exits non-zero on truly fatal errors.

Part C: Add robust tests and a dry-run verification
- Write a small test harness that calls the script with --dry-run and asserts that no AWS calls are made (you can mock aws via a tiny wrapper or environment flag).
- Validate that a non-existent SOURCE_DIR triggers a descriptive error.

Part D: Documentation and usage examples
- Create a README fragment with examples for typical use cases (nightly backups, developers backing up local workspaces, pipelines backing up artifacts before deploys).
- Include a quick-start checklist for IAM permissions required to run the script against S3.

Hints and tips
- Keep the script modular: extract archive creation, upload, and retention into functions for reusability.
- Favor IAM roles (EC2/CodeBuild/CodePipeline) over static credentials; never hard-code keys in scripts.
- Consider emitting structured logs (JSON line per entry) if you plan to forward logs to CloudWatch or a log aggregator.
- Test in a non-production bucket and simulate various failure modes (network hiccups, permissions errors) to ensure your error handling covers them.

If you’d like, I can tailor the exercises to a specific AWS project you’re working on (e.g., backup strategy for RDS snapshots, S3 data lake hygiene, or EC2 instance bootstrap).