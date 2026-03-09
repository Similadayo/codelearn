# GitHub Pull Requests, Forks & Team Collaboration for Ruby Backend Engineers

In modern Ruby backend teams, GitHub is more than a place to store code—it's the center of collaboration. Pull requests (PRs) formalize changes, forks enable parallel work, and team workflows enforce quality and security at scale. This lesson teaches how to use forks, branches, PRs, and reviews effectively in Ruby projects, with practical commands, config snippets, and best practices you can apply directly to real systems.

## 1. GitHub Collaboration Model: forks, branches, PRs, and reviews

Back-end teams rely on a clean collaboration model to keep code healthy while multiple contributors work simultaneously. Forks give contributors isolated workspaces, branches isolate features, PRs solicit review and CI validation, and protected rules enforce governance.

Code examples (shell and CLI) demonstrate a typical flow from fork to PR:
```bash
# Authenticate with GitHub CLI
gh auth login

# Fork the upstream repository and clone your fork (replace org/repo)
gh repo fork org/repo --clone

# Create a short-lived feature branch
git checkout -b feature/improve-logging

# Make your changes, then stage and commit
git add .
git commit -m "feat(logger): add structured logging helper"

# Push the feature branch to your fork
git push origin feature/improve-logging

# Open a pull request against the upstream main branch
# You can customize title/body or use --fill to auto-fill from commit messages
gh pr create --title "feat(logger): add structured logging helper" \
  --body "Adds App::Logger with timestamped logs for better observability." \
  --base main --head your-username:feature/improve-logging
```

### Line-by-line explanation breaking down each line
- gh auth login: Authenticate the GitHub CLI so subsequent gh commands can operate against your account.
- gh repo fork org/repo --clone: Create a fork of the upstream repository and clone it locally for development.
- git checkout -b feature/improve-logging: Create and switch to a new branch named feature/improve-logging.
- git add .; git commit -m "...": Stage all changes and commit with a descriptive message.
- git push origin feature/improve-logging: Push the local feature branch to your fork on GitHub.
- gh pr create --title ... --body ... --base main --head your-username:feature/improve-logging: Create a PR from your feature branch to the upstream main branch with a descriptive title and body.

## 2. Branching, Forks, and PR Lifecycle in Ruby Projects

Ruby projects benefit from clear PR templates, automated tests, and consistent branch naming. This section shows a typical lifecycle, including a PR template and a Ruby-focused CI workflow.

Code examples:
```bash
# Create a conventional feature branch and work locally
git checkout -b feature/add-structured-logs
```

```markdown
# .github/PULL_REQUEST_TEMPLATE.md
### What problem does this PR solve?
- Briefly describe the issue and the solution.

### How was this implemented?
- High-level overview of the changes.
- Any notable design decisions.

### How to test
- Steps to reproduce locally.
- Expected results.

### Screenshots (if applicable)
- Attach any visuals.

### Checklist
- [ ] Tests pass locally (rspec)
- [ ] Linting passed (rubocop)
- [ ] No new security alerts
```

```yaml
# .github/workflows/ci.yml
name: Ruby CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.1
      - run: gem install bundler
      - run: bundle install
      - run: bundle exec rspec
```

### Line-by-line explanation breaking down each line
- .github/PULL_REQUEST_TEMPLATE.md: Provides a consistent structure for PR descriptions so reviewers understand intent, changes, tests, and context.
- .github/workflows/ci.yml: Defines a GitHub Actions workflow named "Ruby CI" that runs on PR events.
- on.pull_request.types: Triggers the workflow for PR events like opened, synchronized (new commits pushed), or reopened.
- runs-on: ubuntu-latest: The runner environment for the job.
- actions/checkout@v4: Checks out the repository so the job can access code.
- ruby/setup-ruby@v1 with ruby-version:3.1: Sets up Ruby 3.1 in the CI environment.
- bundle install: Installs project dependencies defined in Gemfile.
- bundle exec rspec: Runs the test suite with Bundler to ensure code correctness.

## 3. Code Quality, Hooks, and Ruby-specific CI Checks

Beyond PRs, automation helps maintain code quality. Ruby projects often use linters (RuboCop) and tests to gate changes. You can run checks before a PR is created and as part of CI.

Code examples:
```yaml
# .overcommit.yml (OverCommit config for pre-commit hooks)
PreCommit:
  RuboCop:
    enabled: true
    command: ['bundle', 'exec', 'rubocop']
  RSpec:
    enabled: true
    command: ['bundle', 'exec', 'rspec', '--format', 'documentation']
```

```ruby
# lib/app/logger.rb (new simple structured logger within a Ruby project)
module App
  module Logger
    require 'time'
    def self.log(message, level: :info)
      puts "[#{Time.now.iso8601}] [#{level.to_s.upcase}] #{message}"
    end
  end
end
```

### Line-by-line explanation breaking down each line
- OverCommit config: Enables pre-commit hooks to run RuboCop and RSpec before commits are created, reducing broken changes reaching CI.
- rubocop and rspec commands: Ensure style/quality and behavior tests pass locally before pushing.
- lib/app/logger.rb: Defines a minimal structured logger with timestamp and log level for consistent observability in Ruby apps.

## 4. Collaboration, Reviews, and Merge Strategies

Effective collaboration combines thoughtful PR reviews, predictable merge behavior, and governance. This section covers a practical approach to code reviews, review assignments, and merge decisions.

Code examples:
```bash
# After PR is opened, request reviews from backend and QA teams
gh pr ready  # ensure PR is ready for review (may be used to mark WIP)
gh pr review --comment "Please add unit tests for new Logger" --request-review @backend-team
```

```bash
# Merge strategies using GitHub CLI
# Squash merge keeps a single commit per PR
gh pr merge <PR-number> --squash --cleanup=default
```

```text
# CODEOWNERS example (CODEOWNERS file)
# Code owners by file pattern to ensure appropriate reviews
*.rb @backend-team
Gemfile.lock @security-team
```

### Line-by-line explanation breaking down each line
- gh pr ready: Marks a PR as ready for review if it was created as a draft.
- gh pr review --comment ... --request-review @team: Leaves a review and requests reviews from the specified team.
- gh pr merge <PR-number> --squash --cleanup=default: Merges the PR by squashing all commits into a single commit on the base branch and cleans up the branch if configured.
- CODEOWNERS: Establishes ownership rules so reviews come from the right teams, improving review quality and accountability.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Not syncing forks with upstream regularly
  - Bad:
  ```bash
  # Never sync upstream; work only from origin
  git fetch origin
  git merge origin/main
  ```
  - Good:
  ```bash
  # Properly sync with upstream and keep a clean history
  git remote add upstream https://github.com/org/repo.git 2>/dev/null || true
  git fetch upstream
  git checkout main
  git merge --ff-only upstream/main
  ```
- Explanation:
  - The bad approach assumes origin is the main line; in forks you must fetch upstream and merge from upstream to keep feature branches up-to-date and avoid diverging histories.

- Mistake 2: Weak PR descriptions or missing tests
  - Bad:
  ```markdown
  # PR body
  - Fix bug
  ```
  - Good:
  ```markdown
  ### What
  - Implemented structured logging via App::Logger and updated tests.

  ### Why
  - Improves observability and debuggability in production.

  ### How to test
  - Run rspec; verify logs include timestamp, level, and message.

  ### Acceptance Criteria
  - All tests pass, rubocop clean, PR description complete.
  ```
- Explanation:
  - Clear PR descriptions guide reviewers, reduce cycle time, and set expectations. Tests ensure quality gates.

- Mistake 3: Force-pushing on feature branches in public forks
  - Bad:
  ```bash
  git push origin feature/login -f
  ```
  - Good:
  ```bash
  # Use force-with-lease to avoid overwriting others' work
  git push origin feature/login --force-with-lease
  ```
- Explanation:
  - Force pushing can disrupt collaborators’ work. force-with-lease guards against overwriting remote changes, safer in collaborative flows.

- Mistake 4: Skipping CI or failing to configure it for Ruby
  - Bad:
  ```yaml
  # No CI
  echo "CI skipped"
  ```
  - Good:
  ```yaml
  # .github/workflows/ci.yml
  name: Ruby CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: ruby/setup-ruby@v1
          with: { ruby-version: '3.1' }
        - run: bundle install
        - run: bundle exec rspec
  ```
- Explanation:
  - A green CI gate catches regressions and enforces Ruby-specific quality checks before merge.

## Y. Why This Matters In Real Systems — production context and real usage

In production-grade Ruby backends, PRs are not just about code—they govern risk, security, and uptime. Real systems rely on:

- Branch protection and required status checks to prevent dangerous merges.
- CODEOWNERS to ensure the right experts review critical parts of the codebase.
- Dependabot and bundler-audit to manage dependencies and identify vulnerabilities in Ruby gems.
- Static analysis (Rubocop) and RSPEC tests to enforce style and behavior at every PR.
- Secrets scanning and access control to protect sensitive configurations.
- CI pipelines that run on PRs, ensuring that changes meet performance and reliability criteria before deployment.

Code examples:
```text
# CODEOWNERS (placed at repo root)
*.rb @backend-team
Gemfile.lock @security-team
```

```yaml
# Example Dependabot config (yaml)
version: 2
updates:
  - package-ecosystem: 'bundler'
    directory: '/' 
    schedule:
      interval: 'weekly'
    allow:
      - dependency_type: 'direct'
```

### Line-by-line explanation breaking down each line
- CODEOWNERS: Assigns ownership to specific teams per file pattern, ensuring the right reviewers are automatically requested.
- Dependabot config: Keeps dependencies up-to-date automatically and reduces security risks, particularly in the Ruby ecosystem.

## Z. Study Questions — 5 recall questions

1. What is the purpose of forking a repository when collaborating on GitHub?
2. How does a PR template improve the review process?
3. What is the difference between a squash merge and a merge commit, and when might you choose each?
4. Why should you use force-with-lease instead of force-push in a collaborative project?
5. Name two Ruby-specific CI steps commonly included in GitHub Actions workflows.

## Exercise — a practical multi-part coding challenge

Part A — Set up and baseline
- Fork the sample Ruby project and clone your fork.
- Create a feature branch: git checkout -b feature/add-logger
- Ensure local tests pass on main before starting:
  - ruby version: 3.1
  - Commands:
    - bundle install
    - bundle exec rspec

Part B — Implement a structured logger and integrate it
- Starter code (already present in the exercise repo):
  - lib/app.rb
  ```
  # lib/app.rb
  class App
    def run
      "App is running"
    end
  end
  ```
- Task: Add a new structured logger module and use it in App.run
  - Implement:
  ```
  # lib/app/logger.rb
  module App
    module Logger
      require 'time'
      def self.log(message, level: :info)
        puts "[#{Time.now.iso8601}] [#{level.to_s.upcase}] #{message}"
      end
    end
  end
  ```
  - Update App.run to log on start:
  ```
  # lib/app.rb
  require_relative './logger'
  class App
    def run
      App::Logger.log('Starting App')
      'App is running'
    end
  end
  ```

- Add a tiny test to cover logging output (basic sanity check)
  ```
  # spec/app_spec.rb
  require 'rspec'
  require_relative '../lib/app'
  require_relative '../lib/app/logger'
  RSpec.describe App do
    it 'logs on run' do
      out = StringIO.new
      $stdout = out
      App.new.run
      $stdout = STDOUT
      expect(out.string).to match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[INFO\]/)
    end
  end
  ```

Part C — Open a PR and simulate review
- Use GitHub CLI to push changes:
  ```
  git add .
  git commit -m "feat(logger): add structured App::Logger and integrate into App.run"
  git push origin feature/add-logger
  gh pr create --title "feat(logger): add structured logging" --body "Adds App::Logger with ISO8601 timestamps and log levels; wired into App.run." --base main --head your-username:feature/add-logger
  ```
- Request a review from the backend team:
  ```
  gh pr review --request-review @backend-team
  ```

Part D — Verify and merge
- Ensure CI passes (rspec, rubocop, etc.).
- If needed, squash merge to keep history clean:
  ```
  gh pr merge <PR-number> --squash
  ```
- After merging, delete the feature branch locally and remotely:
  ```
  git branch -d feature/add-logger
  git push origin --delete feature/add-logger
  ```

Optional rubric for assessment
- Correctness: All tests pass, logger produces expected output format.
- Style: Ruby code adheres to RuboCop rules (no offenses).
- Documentation: PR description is clear, with testing steps and impact.
- Collaboration: Review requests and responses are timely; merges follow policy.

Notes for instructors
- Adapt PR templates, CODEOWNERS, and CI configs to reflect your organization’s security and compliance requirements.
- In classrooms, provide a starter repo URL for students to fork; in real courses, consider a controlled sandbox repo.