# Track: Backend Engineering — Phase 2 — Developer Tools & Workflow — Terminal & Bash — Navigating the Command Line

Welcome to Terminal & Bash for Go developers. The command line is your primary workstation in backend engineering: it powers quick experiments, reproducible builds, automated pipelines, and robust debugging. Mastery here translates to faster iteration, fewer human errors, and safer, more reproducible deployments across local, CI, and production environments.

## 1. Terminal Foundations for Go Developers

In this section, you’ll learn the core shell habits and Go-friendly workflows that you’ll rely on daily. You’ll see concrete examples you can copy-paste, followed by line-by-line explanations to solidify understanding.

```bash
# 1) Check your current directory and list top-level items
pwd
ls -la

# 2) Create a Go workspace for a new project and switch into it
mkdir -p ~/dev/go/projects/cli
cd ~/dev/go/projects/cli

# 3) Initialize a new Go module (module path is your VCS path or a pseudo-path)
go mod init github.com/yourname/cli

# 4) Create a simple main.go using a here-document
cat > main.go <<'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello from the terminal-driven Go CLI!")
}
EOF

# 5) Build and run the program
go run .
```

### Line-by-line explanation

1. pwd - prints the present working directory to confirm your location in the filesystem.
2. ls -la - lists all files (including hidden ones) with detailed metadata, helping you understand project layout.
3. mkdir -p ~/dev/go/projects/cli - creates the nested directory path for a new Go project; -p ensures all parent directories exist.
4. cd ~/dev/go/projects/cli - switches your shell working directory into the new project folder.
5. go mod init github.com/yourname/cli - initializes a new Go module, enabling module-aware builds and dependency management.
6. cat > main.go <<'EOF' ... EOF - writes a small Go program to main.go using a here-document. The content prints a friendly message.
7. go run . - compiles and runs the current module (or package in the current directory); the dot indicates the current module/package.

```

## 2. Working with Go Projects from the Terminal

This section demonstrates a practical Go-centric workflow: module setup, writing code, and running/building from the terminal. It emphasizes reproducibility and quick iteration.

```bash
# 1) Ensure you are in the module root (adjust path as needed)
cd ~/dev/go/projects/cli

# 2) Create a slightly more functional Go file
cat > main.go <<'EOF'
package main

import (
    "fmt"
)

func main() {
    fmt.Println("CLI Hello:", goVersion())
}

func goVersion() string {
    // This is a tiny helper to demonstrate a function that could
    // call into runtime/OS details; in real code, you might read from build flags
    // or environment to adjust output per Go version.
    return "Go-CLI-Example v1"
}
EOF

# 3) Run the program
go run .
```

### Line-by-line explanation

1. cd ~/dev/go/projects/cli - Moves into the module's root so subsequent commands affect the correct project.
2. cat > main.go <<'EOF' ... EOF - Overwrites main.go with a small program that printlns a prefix plus a helper result.
3. package main - declares the package as main, which is the entry point for the executable.
4. import (...) - imports the fmt package for formatted output.
5. func main() { ... } - the program's entry point; prints a message including the Go version helper.
6. func goVersion() string { ... } - a tiny helper function returning a version string; demonstrates adding simple logic.
7. go run . - compiles and runs the module in the current directory.

```

## 3. Environment, Go Tools, and Reproducible Workflows

This section focuses on environment hygiene, Go tooling, and small scripts that make Go workflows predictable when run locally or in CI.

```bash
# 1) Inspect Go environment (GOPATH is legacy with modules; modules are the default)
go env GOPATH GOMODCACHE GOMOD

# 2) Enable robust shell behavior when writing scripts
cat > ./scripts/ci_build.sh <<'EOS'
#!/usr/bin/env bash
set -euo pipefail

echo "Building module..."
go build ./...

echo "Running all tests..."
go test ./... -v
EOS
chmod +x ./scripts/ci_build.sh

# 3) Run a quick, verbose test run and capture logs
go test ./... -v | tee test_run.log

# 4) A small, portable script example demonstrating environment awareness
cat > ./scripts/env_print.sh <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
echo "Shell: $SHELL"
echo "PWD: $(pwd)"
echo "Go version: $(go version)"
EOS
chmod +x ./scripts/env_print.sh

# 5) Use a one-liner to build and test with logging (good for CI)
cd ~/dev/go/projects/cli
go test ./... | tee -a ci_output.log
```

### Line-by-line explanation

1. go env GOPATH GOMODCACHE GOMOD - Prints Go environment values relevant to module mode and cache. GOPATH is largely for legacy setups; GOMODCACHE is the module cache location; GOMOD indicates module mode interactions.
2. A here-doc ci_build.sh creates a robust shell script with set -euo pipefail to stop on first error, treat unset vars as errors, and propagate errors through pipelines.
3. chmod +x ./scripts/ci_build.sh - Makes the script executable for reuse in local workflows or CI.
4. go test ./... -v | tee test_run.log - Runs all tests with verbose output and writes a copy to test_run.log while still printing to stdout.
5. env_print.sh - A small script that prints environment and Go details; useful when diagnosing environment differences between dev, CI, and production.
6. chmod +x ./scripts/env_print.sh - Grants execute permission for reuse.
7. go test ./... | tee -a ci_output.log - Appends test results to a persistent CI log, aiding post-run analysis.

```

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

Below are common beginner missteps you’ll encounter with terminal and Go workflows, shown with bad and good examples side-by-side. Each pair includes a short explanation of why the good version matters.

### 4.1 Quoting and spaces in paths

Bad:
```bash
# Bad: unquoted variable expansion can break on spaces
dir=/path with spaces/go
cd $dir
```

### Line-by-line explanation

- Line 1 sets dir to a path containing spaces, but unquoted variables in cd cause word-splitting; this will fail or behave unpredictably.
- Line 2 attempts to cd into the path without quoting, leading to errors like “No such file or directory” or unexpected behavior.

Good:
```bash
# Good: quote variables to preserve spaces
dir="/path with spaces/go"
cd "$dir"
```

### Line-by-line explanation

- Line 1 uses quotes around the path to preserve spaces as a single argument.
- Line 2 quotes the variable when expanding, ensuring cd receives a single, correctly-spaced path.

### 4.2 Running commands without error checking

Bad:
```bash
# Bad: ignoring failures can hide issues
go test ./...
echo "Tests finished"
```

### Line-by-line explanation

- Line 1 runs tests but does not handle failure; the script continues even if tests fail.
- Line 2 prints a message regardless of the test outcome, masking failures.

Good:
```bash
# Good: stop on error and report status
if go test ./...; then
  echo "All tests passed"
else
  echo "Tests failed" >&2
  exit 1
fi
```

### Line-by-line explanation

- Line 1 runs tests; if they fail, control flows to the else block.
- Line 2 prints a success message only if tests pass.
- Line 3 prints an error message to standard error and exits with a non-zero status, signaling failure to CI.

### 4.3 Overwriting logs without preserving history

Bad:
```bash
# Bad: using > overwrites log files, losing history
go test ./... -v > test.log
```

### Line-by-line explanation

- Line 1 pipes test output to a file via >, which overwrites any existing content, losing history.

Good:
```bash
# Good: append to log so you retain history
go test ./... -v | tee -a test.log
```

### Line-by-line explanation

- Line 1 pipes test output through tee, which both prints to stdout and appends to test.log, preserving history.

### 4.4 Not setting up a safe executable search path

Bad:
```bash
# Bad: relying on a non-standard PATH in scripts
echo $PATH
go install github.com/yourname/cli@latest
```

### Line-by-line explanation

- PATH may not include GOPATH/bin or Go binaries in all environments, leading to command not found errors in scripts.

Good:
```bash
# Good: explicitly set PATH for script reliability
export PATH="$HOME/go/bin:/usr/local/go/bin:$PATH"
echo "PATH is $PATH"
go install github.com/yourname/cli@latest
```

### Line-by-line explanation

- Line 1 extends PATH to include common Go install locations to ensure go commands are found reliably.
- Line 2 confirms the PATH at runtime.
- Line 3 runs the Go install with a predictable environment.

```

## 5. Why This Matters In Real Systems

In real systems, terminal and bash proficiency directly affects reliability, automation, and velocity:

- Reproducible builds: Command sequences, scripts, and environment settings ensure that developers, CI, and production environments produce identical results.
- Safe automation: Set -euo pipefail, proper quoting, and explicit error handling reduce the risk of silent failures in scripts that build, test, deploy, or monitor services.
- Faster debugging: Proficient use of grep, awk, sed, and piping lets you quickly locate issues, inspect logs, and verify system state without heavy IDEs.
- Go ecosystem maturity: Understanding module mode, go env, and common Go tooling from the terminal enables efficient dependency management, cross-platform builds, and reliable test runs in CI/CD pipelines.
- CI/CD integration: Scripts executed in CI need to be deterministic, idempotent, and fast. The patterns shown (logging, robust scripts, environment introspection) map well to pipelines in GitHub Actions, GitLab CI, Jenkins, or other orchestrators.

```

## 6. Study Questions — 5 Recall Questions

1. What does the command go mod init do, and why is it important for Go projects using modules?
2. How does set -euo pipefail improve the safety of Bash scripts? Explain what each option does.
3. How can you capture command output to both the terminal and a log file in a single step?
4. Why is quoting variables when expanding them into commands important? Provide an example.
5. Describe a minimal Go workflow to create, build, and run a simple CLI program from the terminal.

```

## 7. Exercise — Practical multi-part coding challenge

Part A: Create a small Go CLI module and verify its behavior from the terminal.

- Step 1: Create a new module in your home workspace and implement a tiny CLI app that prints a greeting and the current Go version.
  - Tasks:
    - Initialize a module: go mod init github.com/yourname/cli-welcome
    - Write main.go with a small function that returns the current Go version (hint: use runtime or runtime/debug if you want to inspect Go version at runtime; otherwise print a static label).
    - Build and run: go run .
  - Deliverables: main.go content, and a short terminal transcript showing go mod tidy, go run ., and the output.

- Step 2: Add a small flag parsing example to demonstrate basic CLI input.
  - Tasks:
    - Update main.go to accept a flag --name and print "Hello, <name>!" if provided; otherwise print a default greeting.
    - Use the standard library flag package.
  - Deliverables: updated main.go, run examples:
    - go run . --name Alice
    - go run . (default greeting)

Part B: Create robust build/test scripts and demonstrate logging.

- Step 1: Create a script that builds and tests the module, using set -euo pipefail and logs.
  - Tasks:
    - Create scripts/ci_build.sh implementing:
      - set -euo pipefail
      - go build ./...
      - go test ./... -v
      - Redirect output to a log file test_and_build.log via tee or redirection.
  - Deliverables: the script content, and commands to execute it: bash ./scripts/ci_build.sh

Part C: Integrate a quick search/test workflow to locate a handler-like package.

- Step 1: In your module, add a couple of subpackages (e.g., internal/handler, internal/util) with simple files.
  - Tasks:
    - Use go list ./... to list all packages and grep for a particular pattern (e.g., “handler”) to practice shell text processing.
  - Deliverables: the shell command(s) used, and sample output demonstrating a filtered list of packages containing “handler”.

Part D: Optional: add a simple coverage report.

- Step 1: Run tests with coverage:
  - go test ./... -coverprofile=coverage.out
  - go tool cover -html=coverage.out -o coverage.html
  - View coverage.html to see test coverage per package.
- Deliverables: commands and expected results (a coverage.html path).

Notes and tips for the exercise:
- Keep your module paths consistent with your git hosting, but you can use a social-branch-like path for local practice (e.g., github.com/yourname/cli-welcome).
- Use quotes around all path and variable expansions in the scripts you write to avoid surprises on spaces or special characters.
- When working in CI, prefer tee to log outputs rather than relying on stdout alone, so logs persist after the run.

If you’d like, I can tailor the exercise to a specific Go version, CI platform, or repository structure you’re using in your organization.