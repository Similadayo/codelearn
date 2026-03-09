# Git Basics — Commits, Branches & Merging for Ruby Projects

Git is the backbone of modern software development workflows. In backend engineering, especially with Ruby stacks, clean commit history and well-managed branches make debugging, code reviews, and releases reliable and scalable. This lesson covers commits, branches, and merging with concrete Ruby-oriented examples so you can apply these concepts directly in real Ruby projects.

## 1. Understanding the Core Concepts: Commits, Staging, and the History

When you modify code, you first stage changes, then commit a snapshot of those changes. This creates a durable, navigable history you can revert, audit, or branch from.

### Code examples

```
# 1) Initialize a new Ruby project and Git repository
mkdir ruby-backend-tools && cd ruby-backend-tools
git init

# 2) Create foundational files
echo '# Ruby backend tooling' > README.md
mkdir lib
echo "puts 'Hello, world!'" > lib/app.rb

# 3) Stage changes (index them for the next commit)
git add README.md lib/app.rb

# 4) Create the initial commit with a descriptive message
git commit -m "feat: initial project structure with README and app.rb"

# 5) (Optional) Add a basic .gitignore for Ruby projects
echo ".bundle/\n/vendor/\n/logs/\n/tmp/\n.env" > .gitignore
git add .gitignore
git commit -m "chore: add .gitignore for Ruby projects"
```

### Line-by-line explanation

- mkdir ruby-backend-tools && cd ruby-backend-tools: Create a new directory for the project and enter it.
- git init: Initialize a new Git repository in the current directory.
- echo ... > README.md and mkdir lib: Create basic files/directories for a Ruby project.
- echo "puts 'Hello, world!'" > lib/app.rb: Add a simple Ruby script to the project.
- git add README.md lib/app.rb: Stage the new/modified files so they’re included in the next commit.
- git commit -m "...": Create a new commit with a descriptive message; the message should follow a convention (e.g., feat, chore).
- echo ".bundle/..." > .gitignore: Create a ignore file to avoid committing dependencies, logs, and environment-specific files.
- git add .gitignore and git commit -m "...": Stage and commit the .gitignore so Ruby-related ignores are tracked.

## 2. Branching: Isolating Work, Collaborating, and Managing Features

Branches let you work on features, enhancements, or hotfixes without disturbing the main production-ready history. A typical pattern is main (or master) for released code and feature branches for ongoing work.

### Code examples

```
# 1) Create and switch to a new feature branch
git checkout -b feature-authentication
# or
git switch -c feature-authentication

# 2) Implement a small Ruby feature on this branch
# (Create or modify a file in lib/, e.g., lib/auth.rb)
cat > lib/auth.rb <<'RUBY'
class Auth
  def initialize(user_repo)
    @users = user_repo
  end

  def login(email, password)
    # Placeholder for authentication logic
    true
  end
end
RUBY

# 3) Stage and commit the feature
git add lib/auth.rb
git commit -m "feat(auth): add basic Auth class with login stub"

# 4) Push branch to remote (assuming origin exists)
git push -u origin feature-authentication
```

### Line-by-line explanation

- git checkout -b feature-authentication or git switch -c feature-authentication: Create and switch to a new branch. This isolates your changes from main.
- cat > lib/auth.rb <<'RUBY' ... RUBY: Create a new Ruby file on the feature branch. This is a representative feature implementation.
- git add lib/auth.rb: Stage the new file so it’s included in the next commit.
- git commit -m "feat(auth): ..." : Commit the feature with a descriptive message indicating the area and intent.
- git push -u origin feature-authentication: Push the feature branch to the remote repository and set upstream tracking, enabling git pull/push shorthand in the future.

### Merging feature branches back into main

```
# 1) Update your main branch to the latest state
git checkout main
git pull origin main

# 2) Merge the feature branch into main (default merge)
git merge feature-authentication

# 3) Push the updated main branch
git push origin main
```

If a conflict occurs, Git will halt the merge and mark conflicting sections in files. You resolve manually, then:

```
git add <resolved-file>
git commit -m "fix: resolve merge conflict in <file>"
```

### Line-by-line explanation

- git checkout main and git pull origin main: Switch to the main branch and update it with the remote’s latest changes.
- git merge feature-authentication: Integrate the feature branch into main. If changes touch the same lines, a conflict will be reported.
- After resolving conflicts, git add and git commit finalize the merge resolution.
- git push origin main: Push the merged history to the remote repository.

### Visual: practice of a conflict and resolution (conceptual)

- When two branches modify the same portion of a file, Git cannot automatically decide which version to keep.
- The conflict markers show:

  <<<<<<< HEAD
  // changes from main
  =======
  // changes from feature-authentication
  >>>>>>> feature-authentication

- You edit the file to choose the correct content, then stage and commit the resolution.

## 3. Merging Strategies: How History Looks and How It Affects Releases

Different strategies affect readability, revertibility, and release behavior. Ruby projects often prefer clear histories for issues and features.

### Code examples

- Normal merge (preserves history of both branches)

```
# Assume you're on main and have a merged feature-authentication branch
git merge feature-authentication
```

- Squash merge (combine all feature commits into a single commit on main)

```
git checkout main
git merge --squash feature-authentication
git commit -m "feat(auth): add authentication subsystem (squashed)"
```

- Rebase to rewrite commit history (linear history)

```
# Rebase the feature branch onto main
git checkout feature-authentication
git rebase main
# Resolve any conflicts if they appear during rebase
# Then fast-forward merge into main
git checkout main
git merge --ff-only feature-authentication
```

- Interactive rebase to squash or reorder commits before merging

```
git checkout feature-authentication
git rebase -i main
# In the editor, mark commits to squash and save/exit
```

### Line-by-line explanation

- git merge feature-authentication: Creates a merge commit that ties the two histories together; preserves the feature’s branch history.
- git merge --squash feature-authentication: Creates a single, squashed set of changes in the working tree, which you then commit as a single commit. No merge commit is created.
- git rebase main: Reapplies the feature commits on top of main, creating a linear history. This can require conflict resolution on each commit.
- git merge --ff-only feature-authentication: Performs a fast-forward merge if possible, meaning the main branch simply advances to the tip of the feature branch without a merge commit.
- git rebase -i main: Opens an interactive editor to edit, squash, or reorder commits before applying them onto main.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code

- Pitfall 1: Large, unfocused commits vs small, focused commits
  - Bad:
    ```
    # Bad: single commit with many unrelated changes
    git add .
    git commit -m "wip: lots of changes across files"
    ```
  - Good:
    ```
    # Good: small, focused commits
    git add lib/auth.rb
    git commit -m "feat(auth): add basic Auth class"

    git add lib/utility.rb
    git commit -m "refactor(util): extract helper into Utility module"
    ```

- Pitfall 2: Not using a .gitignore for dependencies and environment
  - Bad:
    ```
    # Never ignores; commits node_modules, vendor bundles, or env files
    git add .
    git commit -m "chore: add project files"
    ```
  - Good:
    ```
    # .gitignore
    /log
    /tmp
    .env
    .bundle/
    /vendor/bundle
    ```
    Then:
    ```
    git add .gitignore
    git commit -m "chore: add .gitignore for Ruby projects"
    ```

- Pitfall 3: Merging without updating local main (causes conflicts and diverged histories)
  - Bad:
    ```
    git checkout main
    git merge feature-authentication
    # if main is out of date with origin, conflicts or stale history occur
    ```
  - Good:
    ```
    git fetch origin
    git checkout main
    git pull origin main
    git merge feature-authentication
    ```
  - Alternative good pattern (rebase workflow):
    ```
    git fetch origin
    git checkout feature-authentication
    git rebase origin/main
    # resolve conflicts, then switch to main and fast-forward
    git checkout main
    git merge --ff-only feature-authentication
    ```

- Pitfall 4: Exposing secrets or credentials in commits
  - Bad:
    ```
    echo "API_KEY=super-secret" > config/secrets.yml
    git add config/secrets.yml
    git commit -m "feat: add API key"
    ```
  - Good:
    ```
    # Use environment-based config, never commit secrets
    git ignore secrets.yml
    # Or load secrets from a secure store at runtime
    ```

## 5. Why This Matters In Real Systems — Production Context and Real Usage

- Traceability: Each commit documents a small, intentional change. This makes debugging and auditing easier when issues arise in production.
- Reviewability: Small, focused commits are quicker to review and less error-prone to revert if something goes wrong.
- Release discipline: Branching strategies support feature development, hotfixes, and releases without destabilizing the main line.
- CI/CD integration: Git history feeds automated tests, builds, and deployment pipelines. Merges into main often trigger test suites and staged deployments.
- Ruby-specific concerns: Bundler and environment-specific files should be excluded (.bundle, vendor/bundle, .env) to avoid conflicts across environments. Re-running bundle install ensures reproducible environments.

Practical usage example in production context:
- You create a feature branch for a small Ruby service improvement.
- You push to remote and open a pull request (PR) for code review.
- CI runs tests for the PR; if green, you merge (preferably with a squash merge for a clean history).
- After merging, you tag a release candidate and trigger a deployment pipeline.
- If a bug is found post-release, you revert the problematic commit or create a hotfix branch, then merge back into main.

Example revert command:
```
# Revert a bad commit by its hash
git revert abc123def
git push origin main
```

## 6. Study Questions — 5 Recall Questions

1) What is the purpose of the staging area (the index) in Git?
2) How does a git merge differ from a git rebase in terms of history?
3) How do you create and switch to a new feature branch in Git?
4) What is the effect of a git merge --squash, and when might you want to use it?
5) How can you safely revert a bad commit in a published history?

## 7. Exercise — Multi-Part Practical Coding Challenge

Goal: Build a small Ruby project, practice commits, branches, and merging strategies, and produce clean history.

Part A — Set up a new Ruby project with Git
- Steps:
  - Create a new directory and initialize a Git repo.
  - Add a minimal Ruby script.
  - Commit with a descriptive message.

Code (Part A):
```
# Part A: Setup
mkdir coffee_shop_backend && cd coffee_shop_backend
git init
mkdir lib
echo "# Coffee Shop Backend" > README.md
cat > lib/order.rb <<'RUBY'
class Order
  def initialize(items = [])
    @items = items
  end

  def total
    @items.sum
  end
end
RUBY

git add README.md lib/order.rb
git commit -m "feat(order): scaffold Order class with total calculation"
```

Part B — Create a feature branch and implement a new feature
- Steps:
  - Create a feature branch for adding tax calculation.
  - Implement a simple tax calculation in Ruby.
  - Commit your changes on the feature branch.

Code (Part B):
```
git checkout -b feature/tax
cat > lib/tax.rb <<'RUBY'
class Tax
  def initialize(rate)
    @rate = rate
  end

  def apply(amount)
    (amount * (1 + @rate)).round(2)
  end
end
RUBY

# Update Order to use Tax
cat > lib/order.rb <<'RUBY'
class Order
  def initialize(items = [])
    @items = items
  end

  def total
    @items.sum
  end
end
RUBY

# Add integration: Tax on order total
cat > lib/order_with_tax.rb <<'RUBY'
require_relative 'order'
require_relative 'tax'

class OrderWithTax < Order
  def initialize(items = [], tax_rate = 0.08)
    super(items)
    @tax = Tax.new(tax_rate)
  end

  def total_with_tax
    @tax.apply(total)
  end
end
RUBY

git add lib/tax.rb lib/order_with_tax.rb lib/order.rb
git commit -m "feat(tax): add Tax class and integrate with Order"
```

Part C — Merge the feature back into main using a merge commit
- Steps:
  - Switch to main, pull latest changes, merge the feature branch, and push.

Code (Part C):
```
git checkout main
git pull origin main || true
git merge feature/tax
git push origin main
```

Part D — Alternative: squash merge to tidy history
- Steps:
  - Merge the feature branch with --squash and commit a single message.

Code (Part D):
```
git checkout main
git merge --squash feature/tax
git commit -m "feat(tax): add tax calculation integrated into Order (squashed)"
git push origin main
```

Part E — Clean up and reflect on history
- Steps:
  - If appropriate, delete the feature branch locally and remotely after merge.

Code (Part E):
```
git branch -d feature/tax
git push origin --delete feature/tax
```

Notes and tips
- Always prefer meaningful commit messages (type, scope, and short description).
- Keep feature branches focused on a single concern.
- Use .gitignore to avoid committing environment/config artifacts specific to Ruby projects.
- For collaborative work, consider using pull requests or merge requests to enable code review before merging.

If you’d like, I can tailor this lesson to a specific Ruby web framework (e.g., Rails) or adapt it to a team’s existing branching policy (GitFlow, trunk-based development, etc.).