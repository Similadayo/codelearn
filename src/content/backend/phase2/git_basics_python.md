# Git Basics — Commits, Branches & Merging

Compelling introductory paragraph: In backend engineering, Git is the heartbeat of collaboration. Understanding commits, branching strategies, and merging workflows is essential for traceability, code quality, and safe collaboration across teams. This lesson trains you to capture meaningful changes, isolate features, and integrate work with well-defined history—crucial for reproducible deployments, code reviews, and incident response in real systems.

## 1. Commits: Creating, Staging, and Writing Meaningful Commit Messages

Code example (shell commands to initialize a Python project and make the first commit):
```
# Create a new Python project and initialize a git repository
mkdir my-python-project
cd my-python-project
git init

# Create a simple script
cat > main.py <<'PY'
#!/usr/bin/env python3
def greet(name: str) -> str:
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))
PY

chmod +x main.py

# Check status, add, and commit
git status
git add main.py
git commit -m "feat(py): add Hello World script with a greet() function"
```

### Line-by-line explanation
- mkdir my-python-project: Create a new directory for the project.
- cd my-python-project: Move into the project directory.
- git init: Initialize a new Git repository in the directory.
- cat > main.py <<'PY' ... PY: Create a Python script using a heredoc; defines greet() and a main guard.
- chmod +x main.py: Make the script executable on Unix-like systems.
- git status: Show the current status, including untracked/modified files.
- git add main.py: Stage main.py for the next commit.
- git commit -m "feat(py): add Hello World script with a greet() function": Create a new commit with a descriptive message. The "feat(py):" prefix follows conventional commits to indicate a new Python feature.

## 2. Branching: Creating, Switching, and Pushing Branches

Code example (branch creation, small change on a feature branch, and push setup):
```
# Create and switch to a new feature branch
git checkout -b feature/api-endpoint

# Implement a small change on the feature branch
printf '\n\ndef api_content():\n    return {"status": "ok"}\n' >> main.py

git add main.py
git commit -m "feat(api): scaffold API endpoint content"

# Optional: set up a remote and push the feature branch
git remote add origin git@github.com:yourorg/my-python-project.git 2>/dev/null || true
git push -u origin feature/api-endpoint
```

### Line-by-line explanation
- git checkout -b feature/api-endpoint: Create and switch to a new branch named feature/api-endpoint in one command.
- printf '\n\ndef api_content():\n    return {"status": "ok"}\n' >> main.py: Append a small Python function to main.py, simulating an API scaffold on the feature branch.
- git add main.py: Stage the modified file for commit on the feature branch.
- git commit -m "feat(api): scaffold API endpoint content": Commit the feature branch change with a clear message.
- git remote add origin git@github.com:...: Configure a remote named origin (best practice to enable collaboration). Suppressed error output for environments where the remote may already exist.
- git push -u origin feature/api-endpoint: Push the feature branch to the remote and set it as the upstream branch for easier future pushes/pulls.

## 3. Merging: Merging, Merge Conflicts, and Merge Strategies

Code example (merging a feature branch into main with a merge commit and viewing history):
```
# Ensure main is up-to-date
git checkout main
git pull --ff-only 2>/dev/null || true

# Merge the feature branch with a merge commit
git merge --no-ff feature/api-endpoint -m "Merge feature/api-endpoint into main"

# Visualize the history
git log --oneline --graph --decorate --all
```

### Line-by-line explanation
- git checkout main: Switch to the main branch to incorporate changes.
- git pull --ff-only 2>/dev/null || true: Update local main from the remote using fast-forward only; ignore errors if no remote is configured.
- git merge --no-ff feature/api-endpoint -m "Merge feature/api-endpoint into main": Merge the feature branch into main, creating a merge commit even if a fast-forward would be possible (preserves the feature branch as a distinct history segment).
- git log --oneline --graph --decorate --all: Display a concise, graphical history across all branches to review the merge structure and commits.

Conflict demonstration (optional, for learning purposes):
```
# Simulated conflict scenario (do not run in a real repo without coordinating)
# On main: change a line in main.py
git checkout main
sed -i 's/Hello, World!/Hello, Git/' main.py
git commit -am "style(main): tweak greeting"

# On feature: change the same line differently
git checkout feature/api-endpoint
sed -i 's/Hello, World!/Hello, API-Endpoint/' main.py
git commit -am "refactor(api): change greeting text in API scaffold"

# Merge to trigger conflict
git checkout main
git merge feature/api-endpoint
```
If a conflict occurs, Git will insert conflict markers in main.py, which you resolve manually, then finalize with a commit.

### Line-by-line explanation
- git checkout main: Prepare to merge into the main branch.
- sed -i 's/Hello, World!/Hello, Git/' main.py: Modify the greeting on main to create a divergent change.
- git commit -am "style(main): tweak greeting": Commit the change on main.
- git checkout feature/api-endpoint: Switch to the feature branch to make a conflicting change.
- sed -i 's/Hello, World!/Hello, API-Endpoint/' main.py: Change the same line differently on the feature branch.
- git commit -am "refactor(api): change greeting text in API scaffold": Commit the feature branch change.
- git checkout main: Switch back to main to prepare for merge.
- git merge feature/api-endpoint: Attempt to merge; a conflict will occur if edits touched the same lines differently.

## 4. Rewriting History: Amending Commits, Squashing, and Interactive Rebase

Code example (amending the most recent commit and squashing two commits):
```
# Amend the most recent commit message (and optionally its content)
git commit --amend -m "feat(py): add Hello World script with a greet() function (finalized messaging)"

# Squash the last two commits into one (local history rewrite)
git reset --soft HEAD~2
git commit -m "feat(py): consolidate Hello World script and API scaffold into a single commit"
```

### Line-by-line explanation
- git commit --amend -m "..." : Replace the most recent commit’s message (and optionally its changes if you staged new ones before running amend).
- git reset --soft HEAD~2: Move the current branch pointer back two commits, keeping changes staged in the index.
- git commit -m "...": Create a new single commit that combines the two previous commits into one, cleaning up history locally.

Note: If you’ve already pushed commits to a shared remote, rewriting history requires force-pushing with caution (git push --force-with-lease). In real teams, prefer non-destructive workflows (e.g., rebase for local commits before pushing, or avoid rewriting published history).

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Committing unrelated changes together
  - Bad:
    ```
    # bad: commits both code and a configuration tweak
    git add .
    git commit -m "work: update code and config"
    ```
  - Good:
    ```
    # good: keep changes atomic and focused on a single purpose
    git add main.py
    git commit -m "feat(py): add greet() function"
    git add config.yaml
    git commit -m "chore(config): update endpoint URL in config"
    ```

- Pitfall 2: Not using branches for features/hotfixes
  - Bad:
    ```
    # bad: committing directly to main for new feature
    echo "def new_feature(): pass" >> main.py
    git add main.py
    git commit -m "feat: add new feature directly on main"
    ```
  - Good:
    ```
    # good: isolate work on a feature branch
    git checkout -b feature/new-feature
    echo "def new_feature(): pass" >> main.py
    git add main.py
    git commit -m "feat(new-feature): scaffold NYI feature"
    # later merge back to main after review and tests
    git checkout main
    git merge --no-ff feature/new-feature
    ```

- Pitfall 3: Skipping meaningful commit messages
  - Bad:
    ```
    # bad: vague message
    git commit -m "update"
    ```
  - Good:
    ```
    # good: detailed, conventional-style message
    git commit -m "feat(py): add greet() utility with unit-test-ready interface"
    ```

- Pitfall 4: Not handling merge conflicts or relying on CI to fix them
  - Bad:
    ```
    # bad: trust CI to fix local conflicts
    git merge feature/x
    # assume CI will resolve
    ```
  - Good:
    ```
    # good: resolve conflicts locally, run tests, then push
    # after editing conflict markers in files
    git add <resolved-files>
    git commit -m "fix(conflicts): resolve merge with feature/x"
    git push
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Traceability: Each commit should tell a concise story, enabling engineers to understand why changes were made during audits, incident investigations, or rollbacks.
- Collaboration and reviews: Branching enables peer review via pull/merge requests; a merge commit preserves feature history for context.
- Safe releases: Merges can be paired with CI/CD pipelines, code reviews, and automated tests to ensure stability before merging to main/master.
- Reproducibility: A well-structured history with meaningful messages and isolated changes makes reproducing bugs and building releases deterministic.
- Branch management: Feature branches, bugfix branches, and release branches support parallel work streams, hotfixes, and long-lived production versions with controlled promotion.
- Rewrites with care: Amending private commits or squashing locally before pushing helps keep history clean, but avoid rewriting published history in shared branches.
- Remote workflows: Understanding push/pull semantics, up streams, and merge strategies (fast-forward vs. merge commits) is essential for multi-team coordination and CI triggers.

## Z. Study Questions — 5 recall questions

1. What is the difference between a fast-forward merge and a merge commit, and when would you prefer one over the other?
2. How do you create and switch to a new branch named feature/login in one command?
3. How can you amend the most recent commit message without altering the commit content?
4. How can you view a graphical, concise history of all branches and merges?
5. Why is it important to use atomic commits and descriptive messages in a production codebase?

## Exercise — practical multi-part coding challenge

Part A: Initialize a Python project and commit a baseline script
- Create a new directory, initialize a git repo, and add a simple Python script (greet function and CLI).
- Commit with a descriptive message.

Part B: Create a feature branch and implement a small enhancement
- Create a branch feature/api-endpoint and append a new function to main.py that returns a sample JSON-like dict.
- Commit on the feature branch with a meaningful message.

Part C: Merge the feature branch into main using a merge commit
- Switch to main, pull latest changes if any, and merge feature/api-endpoint with --no-ff.
- Verify the history shows a merge commit and the feature branch is integrated.

Part D: Simulate a merge conflict and resolve it
- Reproduce a conflict by editing the same line in main.py on both branches, then merge and resolve the conflict manually.
- Stage, commit the resolution, and push if applicable.

Part E: Rewrite history responsibly (local changes)
- Amend the last commit message to reflect a finalized description.
- Optionally squash the last two commits into a single one (local only) and explain why you would or would not push this rewritten history.
- Report the final branch state with a short summary of the changes.

Deliverables to check:
- A local Git history that includes atomic commits, a feature branch, a merge commit on main, and a resolved merge conflict.
- Clear, descriptive commit messages following a conventional style.
- Demonstrated use of at least one merge option (--no-ff) and one history-rewriting operation (git commit --amend or a soft reset + new commit).

End of lesson.