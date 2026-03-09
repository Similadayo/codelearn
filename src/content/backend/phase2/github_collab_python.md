# GitHub — Pull Requests, Forks & Team Collaboration

In modern backend development, GitHub serves as the nerve center for collaboration: forks enable contributors to experiment independently, branches host isolated features, and pull requests orchestrate code reviews, discussion, and governance. This lesson focuses on how Python teams can leverage GitHub effectively in Phase 2 of Developer Tools & Workflow: mastering PRs, forks, and collaboration at scale. You’ll learn practical patterns, automated tooling with Python, and production-oriented workflows that keep ships sailing smoothly in real-world teams.

## 1. Core Concepts: Forks, Branches, PRs

Understanding the core building blocks helps you collaborate safely and ship confidently.

- Fork: A personal copy of someone else’s repository on GitHub. It enables you to experiment without affecting the original project.
- Branch: A lightweight, isolated line of development within a repository. Branches are for feature work, fixes, and experiments.
- Pull Request (PR): A proposed change to a repository, encapsulating diffs, discussion, and a workflow for review, CI checks, and merging.

Code: Typical fork/branch/PR workflow (shell + gh CLI)

```bash
# 1) Fork the repository on GitHub (done in the browser)

# 2) Clone your fork locally
git clone git@github.com:your-username/repo-name.git
cd repo-name

# 3) Add the upstream remote so you can fetch the original repo
git remote add upstream git@github.com:original-owner/repo-name.git
git fetch upstream

# 4) Create a feature branch off the main branch
git checkout -b feature/add-logging

# 5) Implement changes, then stage and commit
git add .
git commit -m "feat(logging): add structured, leveled logs"

# 6) Push your feature branch to your fork
git push origin feature/add-logging

# 7) Create a PR against upstream/main using GitHub CLI (gh must be installed and authenticated)
gh pr create --base main --head your-username:feature/add-logging \
  --title "feat(logging): add structured logging" \
  --body "This PR introduces structured logs and log correlation IDs for easier tracing."
```

### Line-by-line explanation
- Forking is a GitHub action, not a local Git command; you do it on the GitHub UI and then clone your copy locally.
- Cloning brings your fork to your machine so you can work on it.
- Adding upstream lets you fetch the original repository to sync your fork.
- Creating a feature branch keeps your work isolated from main until PRs are opened.
- Committing captures your changes into the branch with a descriptive message.
- Pushing to origin updates your fork on GitHub with the new branch.
- gh pr create automates PR creation; you specify the base (upstream/main) and the head (your fork/branch), plus a title and body.

## 2. Automating PR Interactions with Python (PyGithub)

Python can automate many PR-related tasks: listing open PRs, assigning reviewers, and adding labels. This helps maintainers ship faster and ensures consistency across teams.

Code: List open PRs and print a summary (using PyGithub)

```python
# requirements: PyGithub
# pip install PyGithub

import os
from github import Github

# It is critical to use a token with minimum required scopes
TOKEN = os.environ.get("GH_TOKEN")  # e.g., "ghp_..."
g = Github(TOKEN)

REPO = "original-owner/repo-name"

repo = g.get_repo(REPO)

print("Open PRs in", REPO)
for pr in repo.get_pulls(state="open", sort="created", base="main"):
    print(f"#{pr.number} {pr.title} by {pr.user.login} (head: {pr.head.ref} -> base: {pr.base.ref})")
```

### Line-by-line explanation
- Import PyGithub and os to access the environment token securely.
- Read the personal access token from environment variables to avoid hard-coding credentials.
- Instantiate a Github client using the token.
- Reference the target repository by owner/name.
- Retrieve the repository object.
- Iterate over all open PRs, sorted by creation time, filtered to those targeting main.
- Print a concise summary: PR number, title, author, and head/base branch names.

Code: Auto-request reviewers for PRs based on labels (using PyGithub)

```python
from github import Github
import os

TOKEN = os.environ.get("GH_TOKEN")
g = Github(TOKEN)

REPO = "original-owner/repo-name"
TEAM_REVIEWERS = {
    "backend": ["backend-team"],
    "frontend": ["frontend-team"],
    "infra": ["infra-team"],
    "bugfix": ["qa-team"]
}

repo = g.get_repo(REPO)

for pr in repo.get_pulls(state="open", sort="created", base="main"):
    label_names = [lbl.name for lbl in pr.labels]
    requested = set()
    for label in label_names:
        if label in TEAM_REVIEWERS:
            requested.update(TEAM_REVIEWERS[label])
    if requested:
        pr.create_review_request(reviewers=list(requested))
        print(f"PR #{pr.number}: requested reviewers {', '.join(requested)}")
```

### Line-by-line explanation
- Set up the token and GitHub client, same as before.
- Define a mapping from PR labels to reviewer teams for automation.
- Fetch open PRs targeting main.
- Build a set of reviewers by mapping PR labels to teams.
- If any reviewers are determined, submit a review request to those users/teams.
- Print the PR number and the reviewers requested for traceability.

Note: PyGithub methods like PullRequest.create_review_request are used to request reviewers. Ensure the token has permission to view PRs and request reviews.

## 3. PR Workflow Patterns & CI Integration

A robust PR workflow enforces code quality and protects the main branch. Typical patterns include: requiring reviews, CI checks, status checks, and merge gates.

Code: GitHub Actions workflow for PR CI

```yaml
name: PR CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          python -m pip install -r requirements-dev.txt

      - name: Run tests
        run: |
          pytest -q
```

### Line-by-line explanation
- The workflow is named "PR CI" and triggers on PR events: opened, synchronized (updated), or reopened.
- A job named "test" runs on an Ubuntu VM.
- Checkout step fetches the PR's code for the runner.
- Set up Python 3.11 to ensure a consistent interpreter across environments.
- Install development dependencies required for tests.
- Run the project's tests with pytest; a failing test will fail the PR checks, blocking merge if configured.

Optional enhancements:
- Add linting (flake8, black) as a separate job.
- Add matrix testing across Python versions.
- Enforce required status checks in the repository settings to block merges until CI passes.

## 4. Forks, Conflicts & Team Collaboration

Working with forks in teams requires discipline around syncing, conflict resolution, and governance.

Code: Syncing a fork with upstream (Git commands)

```bash
# Assuming you have set upstream to the original repo
git fetch upstream
git checkout main
git merge --ff-only upstream/main
# If ff-only fails due to diverged histories, use rebase instead:
# git fetch upstream
# git rebase upstream/main
```

Code: Detecting PRs that are behind their base (to prompt rebase)

```python
from github import Github
import os

TOKEN = os.environ.get("GH_TOKEN")
g = Github(TOKEN)

# If you inspect PRs on your fork or a centralized repo
REPO = "your-organization/your-fork-or-repo"

repo = g.get_repo(REPO)
for pr in repo.get_pulls(state="open", base="main"):
    # mergeable_state can be 'clean', 'behind', 'behind-base-branch', etc.
    if getattr(pr, "mergeable_state", None) == "behind":
        print(f"PR #{pr.number} is behind its base; rebase may be required.")
```

### Line-by-line explanation
- The first code block shows how to keep a fork up-to-date with the upstream repository using fetch and either fast-forward merge or rebase. If histories have diverged, rebase is a safer, cleaner option.
- The second Python snippet uses PyGithub to scan open PRs and report those that are behind their base branch. This helps maintainers identify PRs that likely need rebase before merging.
- The use of environment variables for tokens ensures credentials aren’t hard-coded.

Practical governance notes:
- Encourage contributors to regularly sync their forks with upstream.
- Use PR templates to guide what information to include (see next section).
- Require reviewers and automated CI checks to ensure code quality before merging.

## X. Common Beginner Mistakes

Bad vs Good examples (side-by-side) to illustrate typical pitfalls in GitHub PR collaboration.

- Mistake 1: Not syncing forks with upstream
  - Bad:
    ```bash
    # Never fetch upstream; PRs diverge
    git fetch origin
    git checkout main
    git merge origin/main
    ```
  - Good:
    ```bash
    git fetch upstream
    git checkout main
    git merge --ff-only upstream/main
    # If necessary, rebase:
    # git rebase upstream/main
    git push --force-with-lease
    ```

- Mistake 2: Skipping PR templates and checks
  - Bad: Opening a PR with a vague title and no description.
  - Good: Use a PR template with a clear title, description, and checklist, e.g., a .github/PULL_REQUEST_TEMPLATE.md file:
    ```markdown
    ## PR Title
    Short description of changes

    ## What issue does this fix?
    - Issue # (link)

    ## How to test
    - Steps to reproduce
    - Expected results

    ## Checklist
    - [ ] Unit tests added
    - [ ] Documentation updated
    ```
  - See: PR templates enforced by GitHub; include a template in your repo.

- Mistake 3: Not using reviewers or overloading a PR with the wrong reviewers
  - Bad:
    ```python
    # No reviewer requested
    pr.create_review_request(reviewers=[])
    ```
  - Good:
    ```python
    pr.create_review_request(reviewers=["backend-team", "qa-team"])
    ```
- Mistake 4: Embedding secrets in code or CI configs
  - Bad:
    ```python
    token = "ghp_abcdefghijk12345"  # hard-coded
    ```
  - Good:
    ```python
    token = os.environ.get("GH_TOKEN")  # retrieved from CI secrets
    ```
- Mistake 5: Ignoring CI feedback and not wiring status checks
  - Bad: Merging PRs with failing tests.
  - Good: Enforce status checks in repo settings; require passing CI before merge.

## Y. Why This Matters In Real Systems

Why GitHub PRs, forks, and team collaboration matter in production environments:

- Code quality and governance: PRs provide a formal review channel, ensuring multiple eyes catch bugs, security issues, and architectural concerns.
- Auditability and traceability: PR discussions, reviews, and CI results create an auditable trail of why changes occurred and whether they were approved.
- Safer collaboration at scale: Forks enable broad contributor participation without granting write access; branch-based workflows minimize risk.
- Reproducible builds and testability: CI checks on PRs ensure changes don’t break builds or tests before they reach customers, reducing production incidents.
- Clear ownership and accountability: Review assignments, labels, and PR templates help teams know who owns what and what to review, improving velocity and quality.

In real systems, you’ll typically combine:
- PR templates and guidelines for consistency.
- Automated reviews and static analysis.
- CI/CD pipelines that gate merges with test results.
- A defined policy for who can approve, merge, and how hotfixes are handled.

## Z. Study Questions

1) What is the practical difference between a fork and a branch, and when would you choose each in a project?

2) How can you automatically assign reviewers for PRs based on labels using Python?

3) What is the purpose of a GitHub Action workflow in the context of PRs, and what would you typically include in it?

4) How can you detect PRs that are behind the base branch, and what should you do when you find them?

5) List three common beginner mistakes in PR collaboration and how to remedy them.

## Exercise

Part A — Build a small PR collaboration tool in Python
- Task: Create a Python script that connects to GitHub (via PyGithub) and prints a summary of all open PRs in a given repository, including PR number, title, author, and the number of reviews.
- Deliverable: A script at tools/pr_summary.py that prints the data in a readable format.
- Guidance:
  - Use an environment variable GH_TOKEN for authentication.
  - Iterate PRs with state="open" and base="main".
  - Print pr.number, pr.title, pr.user.login, and the number of reviews (len(pr.get_reviews()) or pr.review_comments count if available).

Part B — Extend to auto-assign reviewers
- Task: Extend the script to automatically request reviewers based on PR labels (e.g., if the PR has label "backend", request reviewers from the "backend-team" group).
- Deliverable: Updated tools/pr_summary.py to call pr.create_review_request(reviewers=[...]).
- Guidance:
  - Build a mapping from label names to reviewer identifiers.
  - Only make requests if a mapping exists for at least one label.

Part C — CI integration example
- Task: Add a GitHub Actions workflow that runs Python tests on PRs opened or synchronized and ensures the PR cannot be merged until tests pass.
- Deliverable: File .github/workflows/pr-ci.yml with a basic Python test setup.
- Guidance:
  - Use a simple pytest-based suite (you can add a tiny test in tests/test_sample.py).
  - Ensure the workflow checks run on PRs and that status checks are required before merging.

Optional challenge
- Create a small script to detect PRs that are behind their base and print a list of PR numbers needing rebase, using GitHub’s mergeable_state or a similar heuristic.
- Deliverable: A script that prints behind PRs, and a short note on how maintainers would request rebase in practice.

Note: In all code, avoid printing or storing secret tokens. Use environment variables and GitHub App or OAuth tokens with least privilege. Happy collaborating!