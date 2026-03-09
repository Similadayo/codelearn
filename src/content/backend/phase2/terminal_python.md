# Terminal & Bash — Navigating the Command Line

In backend engineering, the command line is your fastest lane for setup, debugging, data exploration, and automation. Mastery of Bash and terminal workflows accelerates development, reduces errors, and makes you fluent in both local experimentation and production pipelines. This lesson ties terminal navigation concepts directly to Python tooling, showing how you can automate, script, and extend your shell work with Python when needed.

## 1. Understanding the Shell, Paths, and Basic Commands

Learn the core commands for moving around the filesystem, inspecting your environment, and verifying tooling availability. These primitives are the building blocks for all deeper workflows.

```bash
# Print the current working directory
pwd

# List directory contents with details and human-readable sizes
ls -la --color=auto

# Show the absolute path of a relative file (if available)
realpath some_script.py || echo "realpath not available on this system"

# Display the path to the Python interpreter
command -v python3

# Print the current shell in use
echo "Shell: $SHELL"
```

### Line-by-line explanation
- pwd prints the absolute path of the current directory.
- ls -la lists all files (including hidden ones) with permissions, owners, sizes, and timestamps in long format.
- realpath resolves a given path to an absolute path; if not available, the fallback echoes a message.
- command -v python3 checks whether python3 is available on the PATH and prints its location.
- $SHELL expands to the current user’s default shell executable path.

## 2. Fast Navigation, Discovery, and Filtering

Build intuition for moving around quickly, leveraging shell features like tilde shortcuts, pushd/popd, globbing, and fast search utilities. This is where you save minutes per task in real projects.

```bash
# Jump to the home/projects directory using a user-friendly shortcut
cd ~/projects || cd "$HOME/projects"

# Use pushd/popd to maintain a quick navigation stack
pushd /var/log
# do some work
popd

# Quickly list all Python files under a directory
find . -type f -name "*.py" -print

# Show disk usage of the current directory in a human-readable form
du -sh .
```

### Line-by-line explanation
- cd ~/projects attempts to change to the projects folder in the user’s home directory; if that fails, the fallback uses "$HOME/projects" to be robust against tilde expansion issues.
- pushd adds the current directory to a stack and changes to /var/log; popd returns you to the previous directory from the stack.
- find . -type f -name "*.py" recursively searches from the current directory for files ending in .py.
- du -sh . reports the total disk usage of the current directory in a human-friendly format.

## 3. Piping, Redirection, and Small Automations with Bash and Python

Combine commands, capture outputs, and bridge shell and Python when you need richer processing or cross-language tooling.

```bash
# Find all Python files recursively and save the list to a log file
find . -type f -name "*.py" -print | tee py_files_all.txt

# Redirect both stdout and stderr of a command to a log file
python3 -m pip list > pip_list.txt 2>&1

# Simple Python snippet to run a shell command and print its output
python3 - <<'PY'
import subprocess
result = subprocess.run(["bash", "-lc", "echo $HOME"], capture_output=True, text=True)
print("Home:", result.stdout.strip())
PY
```

### Line-by-line explanation
- The first line uses find to locate all .py files and pipes the results into tee, which writes to py_files_all.txt while also printing to stdout.
- The second line runs a Python module (pip list) and redirects stdout to pip_list.txt; 2>&1 ensures any error messages also land in the same file.
- The Python heredoc snippet launches a small Python script that executes a shell command via subprocess.run and prints the captured output, illustrating how Python can orchestrate shell tasks.

## 4. Environment Variables and Shell Profiles

Understanding environment variables and where they persist helps you configure reproducible environments for local development and CI pipelines.

```bash
# Set and export an environment variable for the current shell session
export BACKEND_ENV=dev
echo "Backend environment: $BACKEND_ENV"

# Persist an environment variable in your shell profile (example for Bash)
# Add this line to ~/.bashrc or ~/.bash_profile
# export PROJECT_HOME="$HOME/projects"

# Read an environment variable from Python
python3 - <<'PY'
import os
print("PROJECT_HOME is:", os.environ.get('PROJECT_HOME'))
PY
```

### Line-by-line explanation
- export BACKEND_ENV=dev creates an environment variable for the current session and exports it to child processes.
- echo prints the value so you can verify the variable is set.
- The comment shows how to persist a variable by editing your shell profile (bashrc) so it’s available in new shells.
- The embedded Python snippet reads the PROJECT_HOME variable from the environment, illustrating cross-language access to runtime configuration.

## 5. Minimal Python CLI Tools to Extend Terminal Workflow

Tiny Python CLIs can encapsulate common shell tasks, provide argument parsing, and improve cross-platform reliability. This complements Bash-but-extends it with Python’s clarity and ergonomics.

```python
#!/usr/bin/env python3
import argparse, os, fnmatch

def list_files(start_dir, pattern="*"):
    for root, dirs, files in os.walk(start_dir):
        for fname in files:
            if fnmatch.fnmatch(fname, pattern):
                print(os.path.join(root, fname))

def main():
    parser = argparse.ArgumentParser(description="List files by pattern starting at a directory")
    parser.add_argument("start", nargs="?", default=".", help="Starting directory")
    parser.add_argument("-p", "--pattern", default="*.py", help="Filename pattern (glob)")
    args = parser.parse_args()
    list_files(args.start, args.pattern)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Shebang line makes the script directly executable on Unix-like systems.
- Imports bring in essential modules: argparse for command-line parsing, os and fnmatch for filesystem traversal and pattern matching.
- list_files walks the directory tree from start_dir and prints paths for files matching the given pattern.
- main sets up the CLI: an optional start directory and a pattern option with a default of "*.py".
- The script runs the main function when executed as the entry point, enabling easy reuse in terminal workflows.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not quoting variables in shell commands
  - Bad:
    ```bash
    rm -rf "$DIR"
    ```
    If DIR is empty, this becomes rm -rf which is dangerous if misused.
  - Good:
    ```bash
    if [ -n "$DIR" ]; then rm -rf "$DIR"; else echo "DIR is empty"; fi
    ```

- Pitfall 2: Relying on alias behavior or commands that may not exist in all shells
  - Bad:
    ```bash
    ls -la *.py | grep ".py"
    ```
  - Good:
    ```bash
    for f in *.py; do
      [ -f "$f" ] && echo "$f"
    done
    ```

- Pitfall 3: Over-mixing sudo or root access without safeguards
  - Bad:
    ```bash
    sudo rm -rf /some/important/path
    ```
  - Good:
    ```bash
    path="/some/important/path"
    if [ -d "$path" ]; then
      sudo rm -rf "$path"
    else
      echo "Path does not exist"
    fi
    ```

- Pitfall 4: Not handling spaces or special characters in filenames
  - Bad (unquoted):
    ```bash
    for f in /tmp/*; do
      echo $f
    done
    ```
  - Good (quoted and safe loop):
    ```bash
    for f in /tmp/*; do
      [ -e "$f" ] && echo "$f"
    done
    ```

- Pitfall 5: Ignoring stderr when diagnosing failures
  - Bad:
    ```bash
    some_command
    ```
  - Good:
    ```bash
    some_command 2>&1 | tee command.log
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Shell scripts and Python CLIs allow you to codify manual tasks, ensuring the same steps run across development, staging, and production.
- Automation and CI/CD: Build, test, and deployment pipelines rely on deterministic command sequences, environment variables, and robust error handling.
- Debugging and observability: Logging outputs (stdout/stderr), exit codes, and exit-on-error options (set -e) help you catch problems early.
- Safety and idempotence: Idempotent scripts reduce the risk of repeated runs, which is essential for migrations, backups, and data processing.
- Extendability: Small Python utilities can wrap and orchestrate complex Bash tasks, enabling richer logic, better error messages, and easier testing.

## Z. Study Questions — 5 recall questions

1. What is the difference between pwd and realpath, and when would you use each?
2. How can you search recursively for files matching a pattern and also capture the results to a log file?
3. How do you safely pass a directory path that might contain spaces to a Bash command?
4. How would you read an environment variable from a Python script?
5. What is the purpose of using a Python CLI script alongside Bash in a backend workflow?

## Exercise

Part A: Python CLI for file discovery
- Build a Python script named bashstrap.py (as shown in Section 5) that:
  - Accepts a starting directory (default: current directory).
  - Accepts a -p/--pattern option to filter file names (default: *.py).
  - Prints absolute paths of matching files, one per line.
- Make it executable and run it from different directories to verify behavior.

Part B: Bash backup script
- Create backup_dir.sh that:
  - Takes a source directory and a destination directory as arguments.
  - Creates a tar.gz archive named with the current date (e.g., backup-20240309.tgz) in the destination directory.
  - Uses tar with compression and preserves file permissions.
- Add error handling to print meaningful messages if inputs are missing or directories don’t exist.

Part C: Integrate Python CLI in Bash
- Write a small Bash snippet that calls the Python CLI from Part A to list Python files in a given directory, demonstrating how Python tooling can be invoked from a Bash workflow.

Part D: Validation steps
- Run Part A in a sample project tree containing various file types and ensure only the expected extensions are printed.
- Run Part B with a test directory and verify that the archive is created in the destination and contains the correct content.
- Run Part C with a path that contains spaces to ensure proper handling.

Note: When implementing, include proper shebang lines, executable permissions, and minimal but robust error handling. This lesson emphasizes practical command-line fluency with Python as a companion tool for automation in backend workflows.