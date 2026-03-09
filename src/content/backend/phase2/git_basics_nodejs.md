# Git Basics — Commits, Branches & Merging (Backend Engineering: Phase 2)

Git is the backbone of professional software development for back-end systems. In Node.js projects, clean commits, thoughtful branching, and disciplined merging reduce integration pain, enable safer collaboration, and accelerate CI/CD pipelines. This lesson builds practical intuition for commits, branches, and merges, with concrete Node.js-centric examples you can try locally.

## 1. Understanding the Git lifecycle in a Node.js project

This section covers the core concepts of repositories, staging, commits, and basic history in the context of a Node.js project.

```bash
# Create a new Node.js project and initialize a git repository
mkdir my-api
cd my-api
npm init -y
echo "console.log('Hello from API');" > app.js
git init
git status
git add app.js
git commit -m "feat(api): initial app.js with Hello log"
```

```javascript
// app.js (before committing)
console.log('Hello from API');
```

### Line-by-line explanation
- mkdir my-api: Create a new directory for the project.
- cd my-api: Move into the project directory.
- npm init -y: Initialize a new Node.js package with default settings.
- echo "console.log('Hello from API');" > app.js: Create a simple Node.js file that logs a message.
- git init: Turn this directory into a Git repository.
- git status: Show the current state of the working tree and staging area.
- git add app.js: Stage the new file so it will be included in the next commit.
- git commit -m "feat(api): initial app.js with Hello log": Create the first commit with a meaningful message.
- app.js (content): The actual code that will run when executed (for reference here).

## 2. Commits: atomic changes, messages, and history

A strong commit history makes code reviews easier and enables precise rollbacks. This section demonstrates atomic commits and good commit messages, plus a contrast with a bad commit pattern.

```bash
# Bad: one commit with multiple unrelated changes
# (This groups API changes, config tweaks, and docs in a single commit)
git add .
git commit -m "feat: update API, fix bug, and update docs"
```

```bash
# Good: separate commits for each logical change
# Change 1: API behavior
git add app.js
git commit -m "feat(api): add greeting function to app.js"

# Change 2: Documentation update
git add README.md
git commit -m "docs(readme): explain how to run the API"
```

```bash
# Optional: conventional-style commit messages
git commit --allow-empty -m "chore: initialize conventional commits (example)"
```

### Line-by-line explanation
- git add .: Stage all changes in the working directory (bad practice unless changes are truly related).
- git commit -m "feat: update API, fix bug, and update docs": Create a single commit with multiple unrelated changes; makes history harder to read and rollback harder.
- git add app.js: Stage only app.js for the next commit.
- git commit -m "feat(api): add greeting function to app.js": Commit a focused change (greeting function).
- git add README.md: Stage only the README file.
- git commit -m "docs(readme): explain how to run the API": Commit documentation updates separately.
- git commit --allow-empty -m "...": Create a placeholder commit to illustrate message style (not required in normal flow).

## 3. Branches: creating, switching, collaboration

Branches let teams work on features, fixes, and experiments in isolation. This section shows how to create and switch branches, and how to merge back into the main line of development.

```bash
# Create and switch to a feature branch
git checkout -b feature/logger
```

```bash
# Make a change on the feature branch
echo "console.log('Logger initialized');" >> app.js
git add app.js
git commit -m "feat(logger): initialize basic in-app logger"
```

```bash
# Switch back to main and merge the feature branch
git checkout main
git merge feature/logger
```

```bash
# Push branches to the remote repository (assuming origin exists)
git push -u origin main
git push -u origin feature/logger
```

### Line-by-line explanation
- git checkout -b feature/logger: Create a new branch named feature/logger and immediately switch to it.
- echo "console.log('Logger initialized');" >> app.js: Append a logging statement to the Node.js file on the feature branch.
- git add app.js: Stage the updated file for commit on the feature branch.
- git commit -m "feat(logger): initialize basic in-app logger": Commit the feature branch change with a focused message.
- git checkout main: Switch back to the main branch to prepare for merging.
- git merge feature/logger: Merge the feature/logger branch into main. If there are conflicts, Git will prompt you to resolve them.
- git push -u origin main: Push the main branch to the remote repository and set upstream tracking.
- git push -u origin feature/logger: Push the feature branch to the remote repository and set upstream tracking.

### Line-by-line explanation (conflict scenario)
If main and feature/logger both changed app.js in incompatible ways, a merge will produce conflicts. The typical flow is:
```bash
git merge feature/logger
```
Git will mark conflicts in app.js and require manual resolution:
- Open app.js, edit to resolve the conflict, keeping the desired behavior.
- git add app.js
- git commit -m "fix: resolve merge conflicts in app.js"
- git push
This demonstrates why isolating work in branches matters for clean integration.

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Mixing unrelated changes in a single commit
- Bad:
```bash
# Bad: one commit with multiple unrelated changes
git add .
git commit -m "feat(api): update API, fix bug, and update docs"
```
- Good:
```bash
# Good: separate commits for each logical change
git add app.js
git commit -m "feat(api): add greeting function to app.js"

git add README.md
git commit -m "docs(readme): explain how to run the API"
```

### Line-by-line explanation
- git add . (bad): includes all changes, making it impossible to revert a specific change cleanly.
- git commit -m "feat(api): ...": commits have a focused scope; easier code reviews and rollbacks.
- The second pair isolates documentation updates, enabling precise history.

Pitfall 2: Vague commit messages
- Bad:
```bash
git commit -m "update stuff"
```
- Good:
```bash
git commit -m "feat(api): expose greet endpoint in app.js"
```

### Line-by-line explanation
- Vague messages fail to convey intent, making it hard for teammates to understand why a change exists when scanning logs.

Pitfall 3: Not using feature branches for new work
- Bad (no branch, direct main work):
```bash
# Direct work on main
echo "console.log('new feature');" >> app.js
git add app.js
git commit -m "feat: quick feature on main"
```
- Good (use a feature branch):
```bash
git checkout -b feature/new-feature
echo "console.log('new feature');" >> app.js
git add app.js
git commit -m "feat(new-feature): implement feature scaffolding"
git checkout main
git merge feature/new-feature
```

### Line-by-line explanation
- Working directly on main couples new features with ongoing hotfixes, risking destabilization of the primary branch.
- Branching isolates work, enabling safer integration and code reviews.

Pitfall 4: Not syncing with remote before merging
- Bad:
```bash
git checkout main
git merge feature/xyz
# Remote has newer commits; not aware
```
- Good:
```bash
git fetch origin
git checkout main
git pull --rebase
git merge feature/xyz
git push
```

### Line-by-line explanation
- git fetch origin: updates remote-tracking branches without altering local work.
- git pull --rebase: replays local commits on top of the latest remote, keeping a linear history.
- git push: updates the remote after a clean merge.

## 5. Why This Matters In Real Systems — production context and real usage

- Source of truth: Git tracks every change; CI/CD pipelines typically trigger on pushes/merges to main or release branches, running tests, linting, and builds.
- Code review and collaboration: Branches enable pull requests or merge requests, preserving a history of decisions and allowing peers to review changes before integration.
- Rollbacks and audits: Atomic commits allow precise rollbacks to a known good state; semantic commit messages improve traceability for audits and debugging.
- Node.js considerations: When deploying Node.js services, you rely on consistent packaging, versioning, and reproducible builds. A clean git history helps ensure that:
  - Only intended feature changes are deployed.
  - Tests and linting pass in CI before deployment.
  - Merge conflicts are resolved with clear reasoning, reducing production incidents.
- Best practices: adopt a branch strategy (e.g., feature branches merged into main, or trunk-based with short-lived feature flags), enforce pre-commit hooks (lint/format/test), and require code review for critical changes.

## 6. Study Questions — 5 recall questions

1) What is the difference between a branch and a commit?  
2) How do you create and switch to a new feature branch named feature/auth?  
3) What is the difference between a fast-forward merge and a merge commit?  
4) How do you resolve a merge conflict in a file?  
5) Why are atomic commits with descriptive messages important for maintainability?

## 7. Exercise — a practical multi-part coding challenge

Part A: Set up a Node.js project and initialize Git
- Create a new folder called village-api and initialize a Node.js project.
- Create app.js that exports a simple function and logs a message.
- Initialize a Git repository and make the first commit with a descriptive message.

Part B: Implement a feature on a separate branch
- Create a feature branch named feat/route-hello.
- Modify app.js to expose a function that returns a greeting, and add a small comment explaining usage.
- Add a README section describing how to use the new function and commit changes.

Part C: Merge and resolve conflicts in a simulated scenario
- Switch back to main and merge feat/route-hello.
- Simulate a conflict by editing app.js in both branches differently (e.g., different return strings or different function signatures) and perform a merge.
- Resolve the conflict with a clear, intentional resolution, then push changes to a remote (you can simulate a remote if you don’t have one).

Part D: Reflect and reproduce
- Write a short paragraph documenting:
  - The commit messages you used and why they are helpful.
  - The branching strategy you applied and its rationale.
  - How you would enforce quality gates (lint/tests) in CI/CD for this Node.js project.

Optional starter code snippet for Part B (app.js sketch):
```javascript
// app.js
function greeting(name) {
  return `Hello, ${name}!`;
}

module.exports = { greeting };
```

Expected tasks for Part C (merge flow and conflict resolution):
- After creating a conflicting change in both branches, perform:
```bash
git checkout main
git merge feat/route-hello
# resolve conflict in app.js by keeping the intended greeting, e.g., "Hello, Node!"
git add app.js
git commit -m "fix(merge): resolve conflict in app.js and keep consistent greeting"
```

Notes for instructors
- Encourage students to explain their commit messages aloud or in comments to foster a habit of clear communication.
- Emphasize the importance of branch naming and a lightweight review process in real teams.
- If possible, integrate a CI step that runs npm test or a small lint, to illustrate how Git quality gates prevent bad merges from reaching production builds.