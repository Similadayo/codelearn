# Track: Backend Engineering — Module: Phase 2 — Developer Tools & Workflow — Topic: Terminal & Bash — Navigating the Command Line

Mastering the terminal and Bash is a foundational skill for backend engineers. In Node.js workflows, the shell is where you install dependencies, automate tasks, manage environments, run scripts, and coordinate CI/CD. A fluent command line reduces onboarding time, speeds debugging, and makes your development lifecycle reproducible across machines and teams.

## 1. Basic Navigation and File Operations

Learn how to move around your filesystem, inspect files, and create a Node.js project from the command line. These basics are the building blocks for every dev workflow.

```bash
# Create a new project directory and enter it
mkdir -p ~/projects/node-app
cd ~/projects/node-app

# Initialize a Node.js project with default settings
npm init -y

# Create a simple Node.js entry point
echo "console.log('Hello from Node.js CLI lesson');" > index.js

# Run the Node.js script
node index.js
```

### Line-by-line explanation
- mkdir -p ~/projects/node-app: Create the directory path, including any missing parent directories (-p). If it already exists, no error occurs.
- cd ~/projects/node-app: Change the current working directory to the new project folder.
- npm init -y: Initialize a new package.json with sensible defaults (-y answers yes to all prompts).
- echo "..." > index.js: Write the given JavaScript code into index.js.
- node index.js: Execute the Node.js script, printing "Hello from Node.js CLI lesson" to the terminal.

## 2. Piping, Redirection, and Text Processing

Use redirection and pipes to combine commands, write logs, and process text streams without creating intermediate files.

```bash
# Create a sample log file
printf "INFO: Start\nINFO: Processing\nERROR: Something failed\nINFO: Done\n" > app.log

# Filter lines containing ERROR and show line numbers
grep -n "ERROR" app.log

# Write the filtered output to a new file
grep -n "ERROR" app.log > errors.log

# Count how many INFO lines are present
grep -n "INFO" app.log | wc -l

# Pipe output to both console and a file
grep "INFO" app.log | tee info.log
```

### Line-by-line explanation
- printf "..." > app.log: Create a log file with four lines, preserving newlines exactly as written.
- grep -n "ERROR" app.log: Search for the string "ERROR" and prefix each matching line with its line number.
- grep -n "ERROR" app.log > errors.log: Redirect the grep output to a file named errors.log.
- grep -n "INFO" app.log | wc -l: Pipe the numbered INFO lines to wc to count them.
- grep "INFO" app.log | tee info.log: Send matching lines to both stdout and the file info.log using tee.

## 3. Searching and Filtering

Efficiently locate code, configuration, and logs. Learn when to use fast tools like ripgrep and how to fall back gracefully.

```bash
# If ripgrep (rg) is installed, use it for fast searching
rg -n --line-number "console" index.js || true

# Fallback to grep if rg is not available
grep -n "console" index.js || true

# Simple field extraction with awk
echo "user:alice:role:admin" | awk -F: '{print $2, $4}'
```

### Line-by-line explanation
- rg -n --line-number "console" index.js: Search for "console" with line numbers using ripgrep.
- || true: Ensure the command chain exits successfully even if rg isn’t installed; this is a guard for teaching examples.
- grep -n "console" index.js: Fall back to grep with line numbers when rg isn’t available.
- echo "user:alice:role:admin" | awk -F: '{print $2, $4}': Split the input on colons (-F:) and print the 2nd and 4th fields (alice admin).

## 4. Environment, Scripts, and Command Substitution

Manipulate environment variables, capture output, and leverage command substitution in scripts and one-liners.

```bash
# Print an environment value with a default if not set
echo "NODE_ENV=${NODE_ENV:-development}"

# Set and export a variable for child processes
export PROJECT_ENV=dev
echo "PROJECT_ENV=$PROJECT_ENV"

# Command substitution to capture the current date
BUILD_DATE=$(date +"%Y-%m-%d")
echo "Build date: $BUILD_DATE"

# Capture Node.js output into a shell variable
OUTPUT=$(node -e "console.log('hello from node')")
echo "$OUTPUT"
```

### Line-by-line explanation
- echo "NODE_ENV=${NODE_ENV:-development}": Display NODE_ENV, or "development" if NODE_ENV is unset.
- export PROJECT_ENV=dev: Make PROJECT_ENV available to child processes.
- BUILD_DATE=$(date +"%Y-%m-%d"): Run date and assign its output to BUILD_DATE.
- echo "Build date: $BUILD_DATE": Print the build date captured above.
- OUTPUT=$(node -e "console.log('hello from node')"): Run a short Node.js snippet and assign its console output to OUTPUT.
- echo "$OUTPUT": Print the captured Node.js output.

## 5. Shortcuts, Aliases, and Productivity

Increase your speed and consistency with aliases, shell configuration, and quick history access.

```bash
# Add useful aliases to your shell startup file
printf '%s\n' 'alias ll="ls -la"' 'alias gs="git status"' >> ~/.bashrc

# Quick navigational aliases
printf '%s\n' 'alias ..="cd .."' 'alias ...="cd ../.."' >> ~/.bashrc

# Apply changes immediately (works in Bash)
source ~/.bashrc

# Quick history inspection
history | tail -n 5
```

### Line-by-line explanation
- printf ... >> ~/.bashrc: Append alias definitions to your Bash startup file so they persist across sessions.
- source ~/.bashrc: Reload the startup file to apply the new aliases in the current shell.
- history | tail -n 5: Display the most recent five commands from your command history.

## 6. Best Practices for Scripting in Node.js Dev Environment

Write robust, portable shell scripts to support builds, tests, and deployments in a Node.js project.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Helper: determine project root from this script's location
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

# Install dependencies if package.json exists
if [ -f package.json ]; then
  npm ci
fi

# Run build script if defined in package.json
if npm run | grep -q "build"; then
  npm run build
fi
```

### Line-by-line explanation
- #!/usr/bin/env bash: Use the system's Bash interpreter to run this script.
- set -euo pipefail: Make the script exit on errors (-e), treat unset variables as errors (-u), and propagate errors in pipelines (-o pipefail) for safer behavior.
- ROOT_DIR=...: Compute the repository root by resolving the script’s path and moving up to the project root.
- cd "$ROOT_DIR" || exit 1: Change to the project root; exit if it fails.
- if [ -f package.json ]; then npm ci; fi: If package.json exists, install dependencies deterministically.
- if npm run | grep -q "build"; then npm run build; fi: If a build script is defined, run it.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code (side-by-side):

- Pitfall 1: Deleting with rm without confirmation or safety
  - Bad:
    ```
    rm -rf /path/to/somedir
    ```
  - Good:
    ```
    rm -rf ./somedir
    # or with safety:
    read -p "Delete $DIR? (y/N) " ans
    [[ "$ans" == "y" || "$ans" == "Y" ]] && rm -rf "$DIR"
    ```

- Pitfall 2: For loops that expand spaces improperly
  - Bad:
    ```
    DIR="/path/with spaces"
    for f in $DIR/*; do
      echo "$f"
    done
    ```
  - Good:
    ```
    DIR="/path/with spaces"
    for f in "$DIR"/*; do
      echo "$f"
    done
    ```

- Pitfall 3: Not failing fast or not checking errors in scripts
  - Bad:
    ```
    # Might continue after a failed command
    cp "$src" "$dst"
    ```
  - Good:
    ```
    set -euo pipefail
    cp -- "$src" "$dst"
    ```

- Pitfall 4: UUOC (chu) Using cat unnecessarily
  - Bad:
    ```
    cat file.txt | grep "pattern"
    ```
  - Good:
    ```
    grep "pattern" file.txt
    ```

## Y. Why This Matters In Real Systems

In production-grade systems, the terminal and Bash workflows underpin reproducibility, automation, and operational reliability:

- Reproducibility: Scripted tasks ensure every developer and CI agent performs identical steps, reducing “it works on my machine” issues.
- Automation and CI/CD: Build, test, and deploy pipelines rely on shell commands to orchestrate tasks across environments (dev, staging, prod).
- Environment parity: Managing environment variables, PATH, and tool versions from the shell helps ensure servers run the same binaries as local dev machines.
- Debugging and incident response: Quick log lookups, grep/rg filters, and line-by-line command tracing speed up diagnosing outages.
- Security and governance: Scripts can enforce checks, fail closed on errors, and avoid dangerous manual commands in production contexts.

Real-world practices you’ll see:
- Use set -euo pipefail in all non-trivial scripts.
- Keep scripts in a dedicated bin/ directory and expose them via npm scripts or CI jobs.
- Containerize tooling for consistency (Dockerfiles that install Node.js and your CLI tools).
- Use environment-specific configuration via env vars, with defaults and validation at startup.

## Z. Study Questions

1. What command would you use to quickly see the last 10 commands you executed in your shell?
2. How do you capture the output of a Node.js one-liner into a Bash variable?
3. Explain the difference between > and >> when redirecting output.
4. Why is set -euo pipefail recommended in shell scripts, and what does each option do?
5. How would you quickly search for the string "console.log" inside index.js using a fast tool, and what’s a safe fallback if that tool isn’t installed?

## Exercise

Part A: Create a Node.js project and a simple CLI script
- Task: Scaffold a small Node.js project and add index.js that prints both the current working directory and NODE_ENV (with a default of development).
- Steps:
  1) Create a directory, initialize npm, and write index.js.
  2) Print CWD and NODE_ENV (with default).
Code:
```bash
# Part A.1: Scaffold
mkdir -p ~/projects/node-app-cli
cd ~/projects/node-app-cli
npm init -y

# Part A.2: Write a CLI script
cat > index.js <<'JS'
console.log("CWD:", process.cwd());
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
JS

# Part A.3: Run the script
node index.js
```

Part B: Create a backup script with timestamp
- Task: Write a Bash script backup.sh that takes a directory as an argument and creates a tar.gz backup under backups/ with a timestamp.
Code:
```bash
#!/usr/bin/env bash
set -euo pipefail

DIR="${1:-.}"
NAME="$(basename "$DIR")"
TS="$(date +"%Y%m%d-%H%M%S")"
DEST_DIR="${HOME}/backups"
mkdir -p "$DEST_DIR"
tar czf "${DEST_DIR}/${NAME}-${TS}.tar.gz" -C "$(dirname "$DIR")" "$(basename "$DIR")"
echo "Backup created: ${DEST_DIR}/${NAME}-${TS}.tar.gz"
```

Part C: Wire it into npm scripts
- Task: Add an npm script to run the backup and verify it executes.
Code:
```bash
# In package.json (under "scripts"):
# "backup": "bash ../path-to-backup-script/backup.sh ./"
# Example, create a separate scripts/ directory and reference it accordingly
```

Part D: Run and verify
- Task: Create a sample folder to back up, run the script, and list the backups.
Code:
```bash
mkdir -p test-data/dir
echo "sample" > test-data/dir/file.txt

# Run backup (adjust path to where backup.sh resides)
bash ./backup.sh test-data
ls -la ~/backups
```

Notes for the exercise:
- Ensure backup.sh is executable: chmod +x backup.sh
- Use absolute paths in production scripts to avoid ambiguity.
- Extend the backup to exclude certain files or to compress with bzip2 for different requirements.

If you’d like, I can tailor this lesson to your exact repository structure or include more Node-specific shell integrations (e.g., npm scripts that run lint/test in a single shell task, or using npx to run CLI tools directly from the npm workspace).