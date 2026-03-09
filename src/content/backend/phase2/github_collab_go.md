# GitHub Pull Requests, Forks & Team Collaboration in Go Backend Projects

Collaborating on Go backend projects at scale hinges on disciplined GitHub workflows: pull requests to review changes, forks to encourage external contributions, and automated checks to keep code healthy across teams. This lesson teaches you how to use PRs, forks, and team collaboration patterns effectively in Go projects, with concrete Go code examples, CLI workflows, and production-oriented best practices.

## 1. GitHub Concepts for Go Teams

In professional Go teams, pull requests (PRs) are the unit of change review, forks allow external contributors to propose changes without granting direct write access, and branches isolate features. A typical flow: a developer creates a feature branch, pushes commits, opens a PR against main, reviewers approve, CI runs, and the PR is merged (via merge, squash, or rebase strategies). For Go projects, you also want to ensure formatting, tests, and module hygiene flow through PRs.

Code example: a small Go module with a function and a test to illustrate a change that might be proposed via a PR.

```go
// go.mod
module github.com/example/gostats

go 1.20
```

```go
// stats/stats.go
package gostats

// Avg returns the average of a slice of integers.
// Returns 0 for an empty slice.
func Avg(nums []int) float64 {
    if len(nums) == 0 {
        return 0
    }
    sum := 0
    for _, n := range nums {
        sum += n
    }
    return float64(sum) / float64(len(nums))
}
```

```go
// stats/stats_test.go
package gostats

import "testing"

func TestAvg(t *testing.T) {
    if got := Avg([]int{1, 2, 3, 4}); got != 2.5 {
        t.Fatalf("expected 2.5, got %v", got)
    }
}

func TestAvgEmpty(t *testing.T) {
    if got := Avg([]int{}); got != 0 {
        t.Fatalf("expected 0 for empty input, got %v", got)
    }
}
```

### Line-by-line explanation

- go.mod
  - module github.com/example/gostats: declares the module path used for imports.
  - go 1.20: pins the Go toolchain version for reproducible builds.

- stats.go
  - package gostats: declares the package name.
  - func Avg(nums []int) float64 { ... }: computes the average; guards against empty input.
  - if len(nums) == 0 { return 0 }: handles edge case of empty slice.
  - sum := 0; for _, n := range nums { sum += n }: sums elements.
  - return float64(sum) / float64(len(nums)): returns the average as float64.

- stats_test.go
  - package gostats: test file uses the same package.
  - TestAvg: asserts Avg([]int{1,2,3,4}) == 2.5.
  - TestAvgEmpty: asserts Avg([]int{}) == 0.
  - t.Fatalf: reports a failing test with details if expectation is not met.

## 2. Branching and PR Workflow in Go Projects

A typical PR workflow for Go projects: create a feature branch, implement changes, run tests locally, push the branch, and open a PR. CI runs (e.g., GitHub Actions) validate go test, formatting, and linting before maintainers review.

Code examples: Git and GitHub CLI commands to implement a feature branch and open a PR.

```bash
# From main, create a feature branch
git checkout -b feat/add-logging

# Make changes to the code, then stage and commit
git add .
git commit -m "feat(gostats): add optional logging wrapper around Avg"

# Push the feature branch to the origin
git push -u origin feat/add-logging
```

```bash
# Create a pull request using the GitHub CLI
gh pr create --title "feat: add optional logging wrapper around Avg" \
  --body "Adds an optional logging wrapper around the Avg function to aid observability (behind a build tag). Includes tests." \
  --base main --head feat/add-logging
```

### Line-by-line explanation

- git checkout -b feat/add-logging
  - Creates and switches to a new branch named feat/add-logging for isolated work.

- git add .; git commit -m "feat(...): add optional logging wrapper around Avg"
  - Stages all changes and commits with a message following a conventional format (type(scope): description).

- git push -u origin feat/add-logging
  - Pushes the branch to the remote named origin and sets upstream tracking for future pushes/pulls.

- gh pr create --title "...": 
  - Uses the GitHub CLI to open a PR with the given title. 
  - --body provides PR description; --base main means target is main; --head feat/add-logging indicates source branch.

## 3. Forks and Contributor Workflows

Forks enable external contributors to propose changes via PRs without writing to the original repository. The contributor forks the repo, creates a feature branch in the fork, pushes, and opens a PR to the upstream repository. Maintainers review, run checks, and merge.

Code examples: commands for fork-based workflows and creating a PR from a fork.

```bash
# In your forked clone
git remote add upstream https://github.com/yourorg/yourrepo.git
git fetch upstream
git checkout main
git pull upstream main

# Create a feature branch on your fork
git checkout -b fix/typo-in-docs
# Edit files in your fork, test locally
git add .
git commit -m "docs: fix typo in README"
git push origin fix/typo-in-docs
```

```bash
# Open a PR from your fork to the upstream repository
gh pr create --title "docs: fix typo in README" \
  --body "Corrects a typo in the usage section." \
  --base main --head your-username:fix/typo-in-docs
```

### Line-by-line explanation

- git remote add upstream https://github.com/yourorg/yourrepo.git
  - Adds the original repository as a remote named upstream for syncing with the source of truth.

- git fetch upstream
  - Downloads commits, branches, and tags from upstream without merging.

- git checkout main; git pull upstream main
  - Updates your local main to match upstream/main.

- git checkout -b fix/typo-in-docs
  - Creates a new branch on your fork for the fix.

- git push origin fix/typo-in-docs
  - Pushes the feature branch to your fork on GitHub.

- gh pr create --title ... --head your-username:fix/typo-in-docs
  - Opens a PR from the forked repo/branch to the upstream base/main.

## 4. CI, Lint, and Quality Gates in PRs

Automated checks prevent bad changes from landing in main. Go projects commonly wire up: go test, go fmt, go vet, and golangci-lint. GitHub Actions can run these on PRs.

Example: Go test workflow

```yaml
name: Go Tests

on:
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.20'
      - run: go mod download
      - run: go test ./...
```

```yaml
# Optional style/lint workflow with golangci-lint
name: Go Lint

on:
  pull_request:
    branches: [ main, master ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.20'
      - run: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
      - run: golangci-lint run ./...
```

### Line-by-line explanation

- on: pull_request
  - Triggers the workflow for PR events (opened, synchronize, reopened, etc.).

- actions/checkout@v4
  - Checks out the PR branch so the workflow analyzes the changes.

- actions/setup-go@v4
  - Sets up the specified Go toolchain version for consistent builds.

- go mod download
  - Downloads dependencies defined in go.mod and go.sum.

- go test ./...
  - Runs the full test suite for all packages in the module.

- golangci-lint run ./...
  - Runs the linter across all packages to enforce style and potential issues.

## 5. Handling Merge Conflicts and PR Reviews

Merge conflicts happen when multiple changes touch the same lines. Experienced teams rebase or merge with carefully planned conflict resolution, and reviewers provide feedback on code quality, security, and API stability.

Code example: resolving conflicts on a feature branch before merging.

```bash
# Fetch latest upstream/main and rebase your feature branch
git fetch origin
git rebase origin/main

# Resolve conflicts manually in the affected files
# After editing, mark as resolved
git add .
git rebase --continue

# If the branch history becomes messy, you can force-push after a rebase
git push -f origin feat/add-logging
```

### Line-by-line explanation

- git fetch origin
  - Fetches the latest commits from the remote repository.

- git rebase origin/main
  - Rebases your current branch on top of origin/main, replaying commits.

- git add .; git rebase --continue
  - After resolving conflicts, stages changes and continues the rebase.

- git push -f origin feat/add-logging
  - Force-pushes the rebased branch to update the PR with a clean history.

## 6. X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

### Pitfall 1: Not including tests for new functionality

Bad
```go
// No tests added for the new Avg behavior
```

Good
```go
// Added tests for new Avg edge cases
func TestAvgEdgeCases(t *testing.T) {
    if got := Avg(nil); got != 0 {
        t.Fatalf("expected 0 for nil input, got %v", got)
    }
    if got := Avg([]int{0}); got != 0 {
        t.Fatalf("expected 0 for single zero, got %v", got)
    }
}
```

### Pitfall 2: Inconsistent formatting and formatting drift

Bad
```go
func DoWork() {fmt.Println("hi")}
```

Good
```go
func DoWork() {
    fmt.Println("hi")
}
```

### Pitfall 3: Skipping dependency hygiene in PRs

Bad
```go
// Edited a file but added a new import without running go mod tidy
import "golang.org/x/tools/go/analysis"
```

Good
```go
// After editing, run dependency hygiene
go mod tidy
```

### Pitfall 4: Vague commit messages

Bad
```text
Update
```

Good
```text
feat: add logging wrapper around Avg to support observability
```

### Pitfall 5: Not accounting for Go module boundaries in forks

Bad
```text
// Import path points to a local module not accessible in CI
import "github.com/yourorg/yourrepo/missingpkg"
```

Good
```go
// Use module path relative to the repo structure and public packages
import "github.com/yourorg/gostats"
```

## 7. Y. Why This Matters In Real Systems

- Consistent PR reviews catch design flaws, potential bugs, and security issues before landing in main.
- Forks enable open-source collaboration and external contributions while preserving access control.
- CI and automated checks ensure code health: tests verify correctness, linters enforce style, and formatting makes code readable across teams.
- Go projects benefit from strict module hygiene and test coverage due to statically typed compilation and CI detection of issues early in the lifecycle.
- Auditable history: PRs with clear titles and bodies, combined with code reviews, create an auditable trail for compliance and onboarding of new team members.

## Z. Study Questions

1. What is the difference between a branch-based PR workflow and a fork-based workflow?
2. What Go commands are essential to verify correctness before pushing a PR?
3. How do you configure a GitHub Actions workflow to run go test on PRs?
4. Why is go mod tidy important when making changes that add new dependencies?
5. How can you resolve a merge conflict on a feature branch without losing work?

## Exercise

Part A – Create a small Go module and tests
- Create a new Go module: github.com/yourorg/gobasic
- Implement a function: Reverse(s string) string in a file reverse/reverse.go.
- Write unit tests: reverse/reverse_test.go that cover typical cases (palindromes, empty string, normal strings).
- Ensure go test ./... passes locally.
- Provide the go.mod with a pinned module path and Go version.

Part B – Simulated PR workflow
- From main, create a feature branch to implement a new function: CountDistinct(nums []int) int in a new file distinct/distinct.go.
- Write tests: distinct/distinct_test.go.
- Run go test to verify all tests pass.
- Push the branch to origin and create a PR using gh pr create with a clear title and body.

Part C – Add CI for PRs
- Add a GitHub Actions workflow that runs go test on pull requests to main.
- Optionally add a GolangCI-Lint workflow and ensure lint results are visible on PRs.

Part D – Fork workflow scenario (conceptual)
- Explain steps you would take if you were contributing via fork: fork the repo, create a feature branch, push, and open a PR to upstream/main.
- Describe how maintainers would review, add required reviews, and merge or request changes.

Deliverables
- The Reverse function and tests (Part A).
- Distinct function and tests (Part B).
- GitHub Actions workflow YAML files (Part C).
- A short write-up (2–3 sentences) describing how you would handle PR reviews in a Go backend team, including expectations for reviews, tests, and CI success criteria.