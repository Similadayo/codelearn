# Git Basics — Commits, Branches & Merging (PHP Backend)

Git is the backbone of modern software development workflows. For PHP backend projects, clean commit histories, well-scoped branches, and reliable merges enable faster feature delivery, safer rollbacks, and smoother collaboration with teammates and CI/CD pipelines. This lesson covers the essentials of commits, branching, and merging, with PHP-focused examples to illustrate real-world usage on backend codebases.

## 1. Getting Started: Basic Commit Workflow in a PHP Project

- Compelling intro: In a PHP backend, your code evolves through small, meaningful changes staged and saved as commits. A solid commit history makes debugging, reviewing, and rolling back changes simpler, and it keeps your deployment pipeline reproducible.

Code block 1: Initialize a PHP project repository and create the first file
```
# Initialize a PHP project repository
mkdir my-php-app
cd my-php-app
git init
```

Code block 2: Create a simple PHP file (index.php)
```
cat > index.php <<'PHP'
<?php
declare(strict_types=1);

function greet(string $name): string {
    return "Hello, " . $name . "!";
}

echo greet("World");
PHP
```

Code block 3: Stage and commit the initial PHP file
```
git add index.php
git commit -m "Initial commit: add index.php with a simple greeting"
git log --oneline -1 --decorate
```

### Line-by-line explanation
- Code block 1:
  - mkdir my-php-app: Creates a new directory for the PHP project.
  - cd my-php-app: Enters the project directory.
  - git init: Creates a new Git repository in the directory.
- Code block 2:
  - cat > index.php <<'PHP' ... PHP: Writes a PHP script to index.php with strict typing, a small function, and an echo statement.
  - The PHP code defines greet and prints the result when executed.
- Code block 3:
  - git add index.php: Stages index.php for the next commit.
  - git commit -m "...": Creates a new commit with a descriptive message.
  - git log --oneline -1 --decorate: Shows the latest commit with a concise, decorated log line.

## 2. Branching: Creating and Working on Features

- Compelling intro: Branches let you isolate work on features or fixes without disturbing the main codebase. In backend systems, feature branches support parallel work streams (authentication, payments, caching) and enable clean code reviews.

Code block 1: Create and switch to a feature branch
```
git checkout -b feature/authentication
```

Code block 2: Add a new PHP file scaffold for a feature
```
mkdir auth
cat > auth/AuthService.php <<'PHP'
<?php
declare(strict_types=1);

class AuthService {
    public function hashPassword(string $password): string {
        // In real apps, use a strong algorithm and possibly a library
        return password_hash($password, PASSWORD_DEFAULT);
    }
}
PHP
```

Code block 3: Commit the feature scaffold
```
git add auth/AuthService.php
git commit -m "Feature: scaffold authentication service with password hashing"
```

Code block 4: View branch history graph
```
git log --oneline --graph --decorate --all
```

### Line-by-line explanation
- Code block 1:
  - git checkout -b feature/authentication: Creates a new branch called feature/authentication and switches to it.
- Code block 2:
  - mkdir auth: Creates a directory to house authentication-related code.
  - cat > auth/AuthService.php <<'PHP' ... PHP: Writes a PHP class that will hash passwords. This isolates auth logic on its own file.
- Code block 3:
  - git add auth/AuthService.php: Stages the new file for commit.
  - git commit -m "...": Commits the scaffold with a descriptive message.
- Code block 4:
  - git log --oneline --graph --decorate --all: Displays a compact graphical history across all branches to visualize branching.

Note: In real projects you’d also push branches to a remote and open a pull/merge request for review.

## 3. Merging and Conflict Resolution

- Compelling intro: Merging brings work from a feature branch back into a mainline branch (e.g., main). Conflicts occur when the same portion of code was changed in both branches. Understanding merging and conflict resolution is critical to maintain a stable codebase in production systems.

Code block 1: Prepare main and feature branches with conflicting changes
```
# Start from main and create a shared file
git checkout main
mkdir -p shared
cat > shared.php <<'PHP'
<?php
function sayHello(): string {
    return "Hello from Main";
}
PHP
git add shared.php
git commit -m "Main: add shared.php with main version"

# Switch to feature branch and modify the same function
git checkout feature/authentication
cat > shared.php <<'PHP'
<?php
function sayHello(): string {
    return "Hello from Feature";
}
PHP
git add shared.php
git commit -m "Feature: modify shared.php to say feature version"
```

Code block 2: Merge feature into main and observe conflict
```
git checkout main
git merge feature/authentication
```

Code block 3: Resolve the merge conflict
```
# The conflict markers will appear in shared.php, e.g.:
# <<<<<<< HEAD
# function sayHello(): string {
#     return "Hello from Main";
# }
# =======
# function sayHello(): string {
#     return "Hello from Feature";
# }
# >>>>>>> feature/authentication

# Manually edit shared.php to choose the final version
cat > shared.php <<'PHP'
<?php
function sayHello(): string {
    // Choose the desired behavior for the merged result
    return "Hello from Feature"; // example resolution
}
PHP

git add shared.php
git commit -m "Merge conflict resolved: prefer feature version of sayHello()"
```

Code block 4: Alternative with a no-fast-forward merge
```
git checkout main
git merge --no-ff feature/authentication -m "Merge feature/authentication (no-ff) into main"
```

### Line-by-line explanation
- Code block 1:
  - git checkout main: Switches to the main branch.
  - mkdir -p shared: Creates a directory for a shared script.
  - cat > shared.php <<'PHP' ... PHP: Writes an initial main version of shared.php.
  - git add shared.php; git commit: Adds and commits the main version.
  - git checkout feature/authentication: Switches to the feature branch.
  - cat > shared.php <<'PHP' ...: Rewrites shared.php on the feature branch with a conflicting version.
  - git add/shared.php; git commit: Commits the feature version.
- Code block 2:
  - git merge feature/authentication: Attempts to merge feature/authentication into main, triggering a conflict.
- Code block 3:
  - The conflict markers indicate diverging changes. You must manually edit shared.php to resolve.
  - After editing, git add and git commit finalize the merge with a clean history.
- Code block 4:
  - git merge --no-ff feature/authentication: Performs a merge that always creates a merge commit, preserving a explicit branch history even if a fast-forward is possible.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

- Pitfall 1: Committing incomplete work on the wrong branch
Bad:
```
# Working directly on main, partial changes, poor messages
# File: index.php
echo "Partial change" // incomplete
git add index.php
git commit -m "WIP: partial progress on main"
```
Good:
```
# Create a feature branch for work in progress
git checkout -b feature/improve-index
# Work, test, and commit meaningful steps
git add index.php
git commit -m "Index: implement partial greeting feature on feature/improve-index"
```

- Pitfall 2: Skipping pulls and merging diverged histories
Bad:
```
# After teammates pushed to origin/main
git merge origin/main
# Potential conflicts or hidden changes
```
Good:
```
git fetch origin
git rebase origin/main    # or: git pull --rebase
```
Explanation: Keeps your local history linear and reduces surprises during merges.

- Pitfall 3: Leaving merge conflicts unresolved
Bad:
```
# After merge conflict markers appear
<<<<<<< HEAD
return "Main";
=======
return "Feature";
>>>>>>> feature/authentication
```
Good:
```
# Resolve conflicts by editing the file, then stage and commit
git add shared.php
git commit -m "Resolve merge conflict in shared.php by choosing final behavior"
```

- Pitfall 4: Vague commit messages and no structure
Bad:
```
git commit -m "misc changes"
```
Good:
```
git commit -m "Auth: add password hashing scaffold in AuthService.php"
```

- Pitfall 5: Not using branches for hotfixes or experiments
Bad:
```
# Directly editing main for a quick fix
git checkout main
# make change
git commit -m "Quick fix on main"
```
Good:
```
git checkout -b hotfix/login-redirect
# implement fix
git commit -m "Hotfix: correct login redirect behavior"
```

## 5. Why This Matters In Real Systems

- Production context: Git workflows enable isolated feature development, code reviews, and controlled releases. Branching strategies support parallel work streams, while merging and conflict resolution prevent destabilizing main deployments.
- Real usage notes:
  - Use feature branches for new functionality and bug fixes.
  - Write meaningful, consistent commit messages (preferably with a conventional style, e.g., feat:, fix:, chore:).
  - Require code reviews via pull requests or merge requests before merging to main.
  - Use CI to run tests on each merged change; ensure tests cover PHP backends (unit and integration tests).
  - Tag release commits (e.g., v1.2.3) and automate deployments from main or release branches.
  - Consider a lightweight rebase in feature branches to squash small commits before merging, producing a clean history.
- PHP-specific tips: Keep PHP files focused and isolated by feature. Use autoloading (Composer) to keep dependencies clear, and ensure PHPStan/PHP_CodeSniffer checks are integrated in CI to enforce quality on all commits.

## 6. Study Questions

1. What is the difference between a branch and a merge in Git?
2. How do you create a new branch and switch to it in one command?
3. What indicates a merge conflict has occurred, and how do you resolve it?
4. Why would you use git merge --no-ff versus a fast-forward merge?
5. How can you squash multiple commits on a feature branch before merging to main?

## 7. Exercise

Part A: Set up a PHP project with a basic commit history
- Create a new directory my-php-app-exercise and initialize a Git repo.
- Add index.php with a simple greeting (as in Section 1).
- Commit with a descriptive message.

Part B: Create a feature branch and implement a new PHP file
- Create a feature branch named feature/cache.
- Add a new PHP file cache/CacheService.php with a simple class that stores a value in an array (in-memory simulation).
- Commit with a clear message.

Part C: Merge and resolve conflict
- On main, modify shared.php to return a different string as a conflict example (as in Section 3).
- Merge feature/cache into main and resolve conflicts if they occur.
- Ensure the final merged file compiles or runs in a basic PHP check.

Part D: History hygiene
- On the feature/cache branch, squash the two commits into a single logical commit using an interactive rebase.
- Replace multiple commits with one, then merge into main (no-ff if you want to preserve the branch).
- Tag the final merged state with v0.1.0.

Part E: Remote workflow (optional)
- Add a remote repository URL.
- Push your main and feature branches.
- Create a pull/merge request in your remote hosting service and describe the changes.

This completes a structured, PHP-focused lesson on Git basics: commits, branches, and merging, with practical examples, explanations, common mistakes, and hands-on exercises.