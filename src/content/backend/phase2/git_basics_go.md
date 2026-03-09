# Git Basics — Commits, Branches & Merging in Go Backend Engineering

Git is the backbone of modern software engineering workflows. For Go backend projects, clean commits, thoughtful branching, and well-managed merges translate directly into faster collaboration, safer deployments, and more reliable systems. This lesson focuses on commits, branches, and merging with practical Go-centric workflows, including conventional commits, testing, and CI-friendly habits.

## 1. Getting Started with Git in a Go Backend Project

Overview:
- Initialize a repository for a small Go backend.
- Create a module, a minimal Go program, and the first commit.
- Establish a baseline workflow you’ll reuse on features.

```bash
# 1) Create a directory for the project and initialize Git
mkdir go-backend-demo
cd go-backend-demo
git init

# 2) Initialize a Go module
go mod init example.com/myapp

# 3) Create a minimal Go program
cat > main.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go backend!")
}
EOF

# 4) Stage and commit the initial setup
git add .
git commit -m "feat(go): initialize module and add hello world"

# 5) (Optional) Open a remote to collaborate later
# git remote add origin <repo-url>
```

### Line-by-line explanation
- Line 1-2: Create and enter a new project directory to keep work isolated.
- Line 3: Initialize a new Git repository in the current directory.
- Line 6: Create a new Go module with the path you’ll use in imports.
- Lines 8-15: Write a minimal Go program that prints a message.
- Lines 18-19: Stage all changes for commit.
- Line 20: Create the initial commit with a conventional message.
- Line 23: Optional step to connect a remote repository for collaboration.

Why this matters:
- A clean baseline makes it easy to track changes, reproduce builds, and run tests consistently as you add features.

## 2. Commits — The Atomic Snapshot and Meaningful Messages

Overview:
- Learn to make small, focused commits that describe a single intent.
- Use conventional commit messages to improve readability and automation.
- Practice a Go-centric workflow: test, then commit, keeping build artifacts out of commits.

```bash
# 1) Add a small helper to support string joining in this module
cat > utils.go << 'EOF'
package main

import "strings"

func join(parts []string, sep string) string {
    return strings.Join(parts, sep)
}
EOF

# 2) Update main.go to use the new helper
cat > main.go << 'EOF'
package main

import "fmt"

func main() {
    parts := []string{"go", "backend"}
    // using the helper join
    result := join(parts, "-")
    fmt.Println(result)
}
EOF

# 3) Go fmt to align formatting
go fmt ./...

# 4) Stage only the modified files and commit with a focused message
git add utils.go main.go
git commit -m "feat(utils): add join helper and use it in main"

# 5) Run tests (if you have tests) and ensure they pass
# go test ./...

# 6) Push to a feature branch (if using remotes)
# git checkout -b feature/encode-join
# git push -u origin feature/encode-join
```

### Line-by-line explanation
- Lines 1-7: Create a new utility file with a small helper function to join strings using a separator.
- Lines 9-15: Replace or update the main program to utilize the new helper for demonstration.
- Line 18: Run go fmt to format the code consistently.
- Lines 21-22: Stage just the modified files to ensure the commit is focused on a single logical change.
- Line 23: Commit with a conventional message describing the feature.
- Lines 26-27: Optional testing and remote-pushing steps to integrate with CI and collaboration workflows.

Why this matters:
- Atomic commits reveal intent clearly, facilitate reviews, and simplify debugging. Go projects benefit from small, well-described commits that map to a single feature or fix.

## 3. Branching — Creating, Naming, and Working on Feature Branches

Overview:
- Use feature branches to isolate work from main.
- Adhere to a naming convention that communicates purpose (e.g., feature/auth, fix/timeout-bug).
- Push branches for collaboration; prepare for code review.

```bash
# 1) Create a feature branch for a health check endpoint
git checkout -b feature/health-endpoint

# 2) Add a simple HTTP health endpoint to the Go app
cat > health.go << 'EOF'
package main

import (
    "net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
EOF

# 3) Wire the endpoint in a basic HTTP server (if you have a server, or demonstrate addition)
cat > main.go << 'EOF'
package main

import (
    "net/http"
    "fmt"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func main() {
    http.HandleFunc("/health", healthHandler)
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
EOF

# 4) Stage and commit the feature work
git add health.go main.go
git commit -m "feat(http): add /health endpoint with simple OK response"

# 5) Push the feature branch for review
git push -u origin feature/health-endpoint
```

### Line-by-line explanation
- Lines 1-2: Create and switch to a new feature branch to keep work isolated from main.
- Lines 4-12: Create a new health.go that defines a health-check handler for HTTP.
- Lines 14-23: Replace or extend main.go to wire the health endpoint into a minimal HTTP server.
- Lines 26-27: Stage changes; prepare for a focused commit that captures the endpoint addition.
- Line 28: Commit with a message indicating the feature addition.
- Line 31-32: Push the new branch to a remote so peers can review and comment.

Why this matters:
- Branching keeps features isolated, reduces risk to main, and enables parallel work streams (e.g., auth, metrics, health checks) with clear review points.

## 4. Merging and Rebasing — Strategies for Integrating Work

Overview:
- Understand when to merge vs. rebase.
- Preserve history (merge commits) or maintain a linear history (rebase).
- Practice conflict resolution in a controlled example.

```bash
# 1) Ensure main is up to date
git checkout main
git pull --rebase

# 2) Merge a feature branch with a non-fast-forward merge to create a merge commit
git merge --no-ff feature/health-endpoint

# 3) Alternatively, rebase the feature branch onto main for a linear history
git checkout feature/health-endpoint
git fetch origin
git rebase origin/main

# 4) After rebase, switch back to main and fast-forward merge
git checkout main
git pull --rebase
git merge --ff-only feature/health-endpoint
```

### Line-by-line explanation
- Lines 1-2: Update the main branch to the latest state before integrating work.
- Line 5: Merge the feature branch into main, creating an explicit merge commit to show the integration point.
- Lines 8-11: Rebase the feature branch onto the latest main to achieve a linear history, which can simplify bisects and log readability.
- Lines 14-17: On main, perform a fast-forward merge to integrate the rebased feature branch without creating an extra merge commit.

Conflict resolution example (illustrative):
- If two branches modify the same part of a file, a merge will yield conflict markers that you must resolve manually.
- After resolving, you finalize with git add <file> and git commit (for a merge) or git rebase --continue (in a rebase).

Example conflict scenario (conceptual, not executable as-is):
- Before resolving:
  <<<<<<< HEAD
  fmt.Println("Hello from main")
  =======
  fmt.Println("Hello from feature")
  >>>>>>> feature/health-endpoint
- Resolve by choosing one line, or integrating both, then:
```
git add file.go
git commit -m "fix(conflict): resolve merge conflict in file.go"
```

Why this matters:
- Proper merge vs rebase strategy affects the maintainability of the Git history, ease of debugging, and understanding how features were integrated in production deployments.

## 5. Workflow Essentials — Go-Specific Hygiene and Tooling

Overview:
- Use .gitignore to avoid committing build artifacts and dependencies.
- Manage Go modules predictably; understand vendor usage and module caching.
- Establish lightweight CI checks (tests, build) triggered by PRs or commits.

```bash
# 1) Add a Go-friendly .gitignore
cat > .gitignore << 'EOF'
# Binaries and build outputs
bin/
*.exe
*.out
*.prof

# Go dependencies and modules
vendor/
go.sum

# IDE/editor files
.idea/
.vscode/
*.ncb
EOF

# 2) Sample Makefile for local workflows
cat > Makefile << 'EOF'
.PHONY: test build run
test:
\tgo test ./...

build:
\tgo build ./...

run:
\tgo run .
EOF

# 3) Commit the tooling setup
git add .gitignore Makefile
git commit -m "chore(setup): add go-friendly ignores and helper Makefile"

# 4) Push to a baseline branch
# git push origin main
```

### Line-by-line explanation
- Lines 1-12: Create a robust .gitignore tailored for Go projects, excluding common build outputs and IDE data while allowing Go modules to be tracked as appropriate.
- Lines 15-23: Add a simple Makefile for common tasks, such as test, build, and run, to standardize local workflows.
- Lines 26-27: Stage and commit the tooling to keep the repo clean and reproducible.
- Line 30: Optional push to remote to share baseline tooling.

Why this matters:
- A clean repository with sensible ignores and tooling helps CI systems reproduce builds, reduces noise in diffs, and makes onboarding easier for new contributors.

## X. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code Side-by-Side

1) Pitfall: Large, multi-feature commits instead of atomic commits
- Bad:
```bash
git commit -am "refactor: update API, fix tests, and adjust logging"
```
- Good:
```bash
git commit -am "refactor(api): adjust endpoint signatures"
git commit -am "test(api): update tests for new signatures"
git commit -am "feat(logging): add structured logs"
```

2) Pitfall: Committing build outputs or binaries
- Bad:
```bash
# After a build, accidentally commit binary
git add .
git commit -m "build: add binary to repo"
```
- Good:
```bash
# Ensure binaries are ignored by .gitignore
echo "bin/" >> .gitignore
git add .gitignore
git commit -m "chore(ignore): ignore build artifacts"
```

3) Pitfall: Not updating from remote before merging
- Bad:
```bash
# Merge feature/xyz into main without pulling latest main
git checkout main
git merge feature/xyz
```
- Good:
```bash
git fetch origin
git checkout main
git pull --rebase
git merge --no-ff feature/xyz
```

4) Pitfall: Vague commit messages
- Bad:
```bash
git commit -m "update"
```
- Good:
```bash
git commit -m "feat(auth): add JWT validation to login flow"
```

5) Pitfall: Overusing merge commits on feature branches
- Bad:
```bash
# After work on a feature
git checkout main
git merge feature/xyz
```
- Good (linear history with rebase, if team policy allows):
```bash
git checkout feature/xyz
git rebase origin/main
# Resolve conflicts, test
git push --force-with-lease
git checkout main
git merge --ff-only feature/xyz
```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Reproducible builds: Clean commits and deterministic history make it easier to reproduce a particular state of the codebase for debugging or auditing.
- Safer deployments: Branch-based workflows enable feature isolation, staged integration, and controlled rollouts. Merges and rebases help keep the mainline stable.
- Code reviews and CI: Clear commit messages and small changes speed up code reviews. CI pipelines can gate merges on tests and linting, reducing production defects.
- Rollbacks and traceability: A well-structured Git history makes it easier to identify when a bug was introduced and to rollback specific features without affecting others.
- Go-specific concerns: Handling module changes, vendor decisions, and test coverage in a Go backend benefits from a disciplined approach to commits, branches, and merges to avoid dependency drift or flaky builds.

## Z. Study Questions — 5 Recall Questions

1) What is the advantage of making atomic commits instead of a single large commit?
2) When would you choose to use a --no-ff merge versus a fast-forward merge?
3) How does a well-structured branch name (e.g., feature/auth, fix/timeout) help a team?
4) Why is it important to ignore build outputs and binaries in a Go project?
5) What is a conventional commit message, and why might you adopt it in a Go backend project?

## Exercise — Practical Multi-Part Coding Challenge

Goal:
- Apply commits, branches, and merging in a small Go backend scenario. Demonstrates a clean workflow from baseline to feature integration.

Part A — Baseline Go API
- Create a small Go HTTP server with a /health endpoint on main.
- Commit with a clear message.

Code sketch (you can adapt as you like):

```bash
mkdir exercise-go-api
cd exercise-go-api
git init
go mod init example.com/exercise-go-api

cat > main.go << 'EOF'
package main

import (
    "net/http"
    "fmt"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func main() {
    http.HandleFunc("/health", healthHandler)
    fmt.Println("Server running on :8080")
    http.ListenAndServe(":8080", nil)
}
EOF

git add main.go
git commit -m "feat(api): add /health endpoint and server skeleton"
```

Part B — Create a Feature Branch
- Create a new branch feature/metrics to add a simple /metrics endpoint.
- Implement a minimal metrics collector (in-memory) and add an endpoint to expose it.
- Commit the feature changes.

Code sketch:

```bash
git checkout -b feature/metrics

cat > metrics.go << 'EOF'
package main

import "net/http"

var requestCount int

func metricsHandler(w http.ResponseWriter, r *http.Request) {
    requestCount++
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(fmt.Sprintf("requests=%d", requestCount)))
}
EOF

# Update main.go to register /metrics. For brevity, you can append a line:
# http.HandleFunc("/metrics", metricsHandler)

git add metrics.go
git commit -m "feat(metrics): add /metrics endpoint exposing request count"
```

Part C — Integrate and Resolve Conflicts
- Rebase your feature/metrics onto main, test locally, and merge back into main with a no-ff merge.
- If a conflict arises, resolve it and continue.

Code sketch:

```bash
git fetch origin
git checkout main
git pull --rebase
git checkout feature/metrics
git rebase origin/main

# If conflicts happen, edit conflicting files, then:
git add <resolved-files>
git rebase --continue

# After a clean rebase, switch back to main and merge
git checkout main
git merge --no-ff feature/metrics
```

Part D — Clean Up and Review
- Push branches to a remote, create a PR, and ensure CI would run go test ./...
- Ensure .gitignore properly excludes binaries and build outputs.

Optional checks:
- Run go fmt, go test, and static checks locally before final merge.

What you should be able to explain after completing this exercise:
- How commits, branches, and merges interact in a Go backend project.
- How to create focused feature work, integrate it safely, and maintain a clean history for production deployments.
- How to set up basic tooling (.gitignore, Makefile) to support a Go-based workflow.

If you’d like, I can tailor the lesson to your team’s exact conventions (e.g., strict rebase policies, specific commit message formats, or a preferred CI workflow) and generate a ready-to-run repository skeleton.