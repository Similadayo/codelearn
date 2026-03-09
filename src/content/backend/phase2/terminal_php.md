# Terminal & Bash — Navigating the Command Line (Backend Engineering, Phase 2 — Developer Tools & Workflow, PHP)

The command line is the primary workspace for PHP backend developers. Mastery of Bash navigation, project scaffolding, environment management, and efficient workflows translates directly into faster feature delivery, safer deployments, and clearer debugging in real-world systems. This lesson focuses on practical shell skills you’ll use daily when building, testing, and operating PHP applications.

## 1. Getting Comfortable with the Shell: Basic Navigation and Paths

Code example: basic navigation, path handling, and simple file operations.

```bash
# 1) Print the current working directory
pwd

# 2) List files with detailed information
ls -la

# 3) Change directory to a PHP project root (adjust path as needed)
cd ~/projects/php-app

# 4) Create a logs directory if it doesn't exist
mkdir -p logs

# 5) Create or update a README.md
touch README.md
echo "PHP Backend Project" > README.md

# 6) Display the contents of README.md
cat README.md
```

### Line-by-line explanation breaking down each line
- pwd: prints the absolute path of the current working directory.
- ls -la: lists all entries in the directory with permissions, ownership, size, and timestamps.
- cd ~/projects/php-app: changes the current directory to the specified PHP project path (adjust to your environment).
- mkdir -p logs: creates a logs directory if it doesn’t already exist; -p avoids errors if it already exists.
- touch README.md: creates an empty README.md file or updates its timestamp if it exists.
- echo "PHP Backend Project" > README.md: writes the string into README.md, overwriting any previous content.
- cat README.md: outputs the contents of README.md to the terminal.

## 2. Working with Projects: PHP Project Structure in the Terminal

Code example: quick PHP info, starting a built-in server, and verifying output.

```bash
# 1) Print the PHP version (quick sanity check)
php -v

# 2) Start PHP's built-in web server serving the "public" directory
# (This assumes your app has a public/ directory with an index.php)
php -S localhost:8000 -t public &

# Save the server PID so we can stop it later
SERVER_PID=$!

# Give the server a moment to start
sleep 1

# 3) Verify the server is responding (static output or index.php)
curl -sS http://localhost:8000 | head -n 5

# 4) Stop the server
kill "$SERVER_PID"
```

### Line-by-line explanation breaking down each line
- php -v: outputs the PHP interpreter version to ensure PHP is installed and accessible.
- php -S localhost:8000 -t public &: launches the built-in PHP web server, mapping requests to the public directory; & runs it in the background.
- SERVER_PID=$!: captures the background process ID of the server for later control.
- sleep 1: pauses briefly to give the server time to start listening on the port.
- curl -sS http://localhost:8000 | head -n 5: sends an HTTP request to the local server and prints the first five lines of the response, helpful for a quick check.
- kill "$SERVER_PID": terminates the background PHP server process.

## 3. Streamlining with Shell Shortcuts: Aliases, Functions, and Scripting

Code example: useful aliases, functions, and a safe shell configuration snippet.

```bash
# 1) Example: a few handy aliases (add to ~/.bashrc or ~/.zshrc in real usage)
alias ll='ls -la'
alias gs='git status'
alias gd='git diff'

# 2) A small helper function to quickly jump into a project and list contents
function proj() {
  cd "$1" || return
  ll
}

# 3) Make the shell safer and more predictable for scripts
set -euo pipefail
```

### Line-by-line explanation breaking down each line
- alias ll='ls -la': creates a shortcut to list files in long format with details.
- alias gs='git status': quick shortcut to check Git status.
- alias gd='git diff': quick shortcut to view Git diffs.
- function proj() { ... }: defines a Bash function named proj that changes to a given directory and lists contents; if cd fails, it returns early.
- cd "$1" || return: navigates to the argument directory; if the path is invalid, the function exits.
- ll: uses the previously defined alias to display directory contents.
- set -euo pipefail: enables strict shell options:
  -e: exit on error
  -u: treat unset variables as an error
  -o pipefail: propagate errors in pipelines

## 4. Process Management and Environment: Jobs, Background Tasks, and PHP-FPM basics

Code example: background processes, logs, and a simple TMUX workflow.

```bash
# 1) Start a PHP server in the background and redirect logs
php -S 127.0.0.1:8080 -t public > /tmp/php8080.log 2>&1 &
PID=$!
echo "PHP server started with PID $PID"

# 2) Tail the log to monitor requests and errors
tail -f /tmp/php8080.log &

# 3) Stop the server gracefully
kill "$PID"

# Optional: start a persistent session with tmux (requires tmux)
tmux new -s dev
# inside tmux: run server, edit files, etc.
# detach with Ctrl-b d, reattach with: tmux attach -t dev
```

### Line-by-line explanation breaking down each line
- php -S 127.0.0.1:8080 -t public > /tmp/php8080.log 2>&1 &: starts the built-in PHP server in the background, serving the public directory, with stdout and stderr redirected to a log file.
- PID=$!: captures the PID of the background server process for later control.
- echo "PHP server started with PID $PID": prints the PID for visibility.
- tail -f /tmp/php8080.log &: starts following the log in the background so you can watch requests and PHP errors in real time.
- kill "$PID": sends a TERM signal to gracefully stop the server.
- tmux new -s dev: creates a persistent terminal session named dev (tooling choice for complex workflows).
- tmux detach/attach: describes how to leave or rejoin the session; practical for long-running tasks.

## 5. Debugging and Observability from the Terminal

Code example: checking logs, inspecting PHP info, and quick code searches.

```bash
# 1) View application logs in real time (adjust path to your app's logs)
tail -f logs/app.log

# 2) Find PHP errors in the codebase (case-insensitive search for "error" or "Exception")
grep -Rni --include="*.php" "exception|error" .

# 3) Inspect PHP configuration and environment details
php -i | sed -n '1,120p'
```

### Line-by-line explanation breaking down each line
- tail -f logs/app.log: continuously displays new lines appended to the log file, useful for live debugging.
- grep -Rni --include="*.php" "exception|error" .: recursively searches PHP files for lines containing "exception" or "error"; -i makes the search case-insensitive, -n shows line numbers.
- php -i | sed -n '1,120p': prints the PHP configuration information (phpinfo) but pipes to sed to limit the output to the first 120 lines for quicker inspection.

## 6. Version Control, Diffs, and Environment: Using Git and Environment Variables

Code example: basic Git workflow and loading environment variables for PHP apps.

```bash
# 1) Git status and diff
git status
git diff

# 2) Basic Git flow (adjust as needed)
git add .
git commit -m "WIP: scaffold PHP backend project structure"

# 3) Environment variables for local app configuration
export APP_ENV=local
export DB_HOST=127.0.0.1
export DB_PORT=5432

# 4) Access environment variable from PHP (CLI)
php -r 'echo "App environment: " . getenv("APP_ENV") . PHP_EOL;'
```

### Line-by-line explanation breaking down each line
- git status: shows the current state of the working tree and staging area.
- git diff: shows changes that are not yet staged for commit.
- git add .: stages all changes in the repository for commit.
- git commit -m "...": creates a new commit with the provided message.
- export APP_ENV=local (and other vars): sets environment variables for the current shell session, which PHP and other processes can read.
- php -r 'echo ... getenv("APP_ENV") ...': runs a small PHP one-liner to print the value of APP_ENV from the environment.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Running commands with spaces or special characters without quotes
  - Bad:
    ```bash
    cd /path with spaces/MyProject
    ```
  - Good:
    ```bash
    cd "/path with spaces/MyProject"
    ```
- Pitfall 2: Over-reliance on sudo for everyday tasks
  - Bad:
    ```bash
    sudo mkdir /var/www/myapp
    sudo chown user:user /var/www/myapp
    ```
  - Good:
    ```bash
    mkdir -p ~/projects/myapp
    # If necessary, adjust permissions for the user instead of running as root
    chmod u+rwx ~/projects/myapp
    ```
- Pitfall 3: Not exiting on script errors
  - Bad (dangerous in automation):
    ```bash
    #!/bin/bash
    cp somefile /dest/ || true
    echo "Copied"
    ```
  - Good:
    ```bash
    #!/bin/bash
    set -euo pipefail
    cp somefile /dest/
    echo "Copied"
    ```
- Pitfall 4: Relying on implicit environment assumptions
  - Bad:
    ```bash
    # Uses PATH to find php; may fail in non-interactive shells
    php -v
    ```
  - Good:
    ```bash
    # Use an explicit path or ensure PATH is configured in the script
    /usr/bin/php -v
    ```
- Pitfall 5: Ignoring differences between development and production
  - Bad:
    ```bash
    export APP_ENV=production
    php -S localhost:8000 -t public
    ```
  - Good:
    ```bash
    if [ "$ENV" = "production" ]; then
      export APP_ENV=production
      # use a real web server in production (e.g., nginx + PHP-FPM)
    else
      export APP_ENV=local
    fi
    php -S localhost:8000 -t public
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Command-line workflows ensure you can reproduce steps exactly (setup, tests, deployments). Scripts with set -euo pipefail and versioned configs reduce drift between environments.
- Safety and correctness: Managing processes, logs, and environment separation reduces the risk of accidental production changes or leaks. Using built-in PHP server is great for local development but not for production workloads; real systems rely on robust servers (Nginx, PHP-FPM, or container orchestration) and proper logging, monitoring, and observability.
- Performance and debugging: Terminal-based workflows enable quick profiling (e.g., using curl, ab, or Apache Bench in tests), live log inspection, and targeted grep/sed/awk pipelines to diagnose issues across large PHP codebases.
- Collaboration: Shared shell scripts, dotfiles, and Git workflows promote consistent onboarding and reduce friction when team members switch between machines or CI environments.
- CI/CD compatibility: All these shell operations map to steps in CI pipelines (checkout, install dependencies with Composer, run tests, start lightweight servers for integration tests, collect logs). Mastery of the terminal helps you translate development steps into automated pipelines.

## Z. Study Questions — 5 recall questions

1) What Bash option ensures a script exits when any command fails, a variable is referenced before assignment, or a pipeline fails?
2) How do you start PHP’s built-in web server in the background and later stop it reliably?
3) Why is it recommended to use quotes around paths with spaces in Bash, and what is a safe alternative approach?
4) How can you quickly inspect PHP configuration and environment details from the command line?
5) What is the difference between a background process and a tmux session, and when would you prefer each for long-running PHP tasks?

## Exercise — a practical multi-part coding challenge

Part A — Create a tiny PHP project skeleton and a simple index
- Create a new directory for a PHP project.
- Add an index.php that prints a friendly message and the current server time.

Part B — Build a runnable local server workflow
- Write a Bash script run_server.sh that:
  - Starts PHP’s built-in server on port 8080 serving the project’s public directory.
  - Logs stdout/stderr to a log file.
  - Writes the server PID to a file, and can stop the server gracefully.
- Ensure the script prints clear start/stop messages.

Part C — Add quick diagnostics and a reproducible query
- In index.php, print a small piece of information about the environment (e.g., APP_ENV if available via getenv).
- Create a one-liner in Bash to curl the server and show the first few lines of the response.
- Use grep to check whether the latest request shows the expected header or content.

Part D — Version control and environment
- Initialize a Git repository for the project, commit the skeleton, and demonstrate a change with a new message.
- Demonstrate setting an environment variable (e.g., APP_ENV=local) and retrieving it in PHP via getenv in a separate one-liner.

Part E — Reflection and extension
- Explain how you would extend this workflow to work with a real web server (Nginx + PHP-FPM) and a containerized setup (Docker) for closer production parity.
- List at least three improvements you would adopt for team-wide consistency (e.g., CI pipelines, dotfiles, standardized scripts, and code-quality checks).

Notes:
- Adjust paths as needed for your environment.
- Replace public/ with your actual document/root folder structure.
- The exercises are designed to be incremental and progressively improve your terminal fluency and PHP workflow discipline.