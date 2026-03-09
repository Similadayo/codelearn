# Track: Backend Engineering — Module: Phase 2 — Developer Tools & Workflow — Topic: GitHub — Pull Requests, Forks & Team Collaboration

Compelling intro: In modern PHP teams, GitHub is not just a place to store code—it's the center of collaboration. Pull Requests (PRs) enable peer review, automated checks, and controlled releases. Forks allow external contributors to propose changes without touching the main repository. Mastery of PR workflows, branch hygiene, and CI integration directly translates to faster delivery, higher code quality, and safer deployments in real-world PHP systems.

## 1. GitHub Collaboration Model and Basic PR Flow

This section introduces the core collaboration model on GitHub: forks, remotes, feature branches, Pull Requests, and basic automation to keep forks in sync. The commands illustrate a typical workflow you’ll repeat across PHP projects.

```bash
# 1) Fork the repository on GitHub (UI step, not CLI)

# 2) Clone your fork locally
git clone https://github.com/your-username/php-project.git
cd php-project

# 3) Add the upstream (original) repository to keep your fork up to date
git remote add upstream https://github.com/original-owner/php-project.git

# 4) Create a feature branch (named descriptively)
git checkout -b feature/improve-autoload

# 5) Make your PHP changes...
# (Edit PHP files, e.g., update autoload mapping)

# 6) Stage and commit your changes
git add .
git commit -m "refactor(autoload): align with PSR-4 for App namespace"

# 7) Push the feature branch to your fork
git push -u origin feature/improve-autoload

# 8) Open a Pull Request (PR) on GitHub from your fork:feature/improve-autoload into upstream:main
#    (Optional API-based PR creation example:)
curl -X POST -H "Authorization: token GITHUB_TOKEN" \
  -d '{"title":"refactor(autoload): PSR-4 autoload for App namespace","head":"your-username:feature/improve-autoload","base":"main","body":"Adds PSR-4 autoload for App namespace and updates tests."}' \
  https://api.github.com/repos/original-owner/php-project/pulls

# 9) Optional sync with upstream while PR is open
git fetch upstream
git checkout main
git merge --ff-only upstream/main
```

### Line-by-line explanation
1) Forking on GitHub creates a separate copy under your account; this step is done in the UI, not via CLI.  
2) Clones your personal fork so you can modify code locally.  
3) Adds the upstream remote to fetch changes from the original project.  
4) Creates a new, descriptive feature branch to isolate changes.  
5) You edit code in your working tree (not shown here).  
6) Stages and commits your changes with a clear message.  
7) Pushes the feature branch to your fork for PR creation.  
8) Opens a PR from your fork to the upstream repository; the curl example demonstrates how to initiate a PR via the GitHub API (requires a token).  
9) Keeps your local main in sync with upstream to minimize merge conflicts later.

## 2. PR Templates, Branch Naming, and Review Etiquette

Well-structured PRs speed reviews and reduce back-and-forth. This section covers a recommended PR template and branch naming conventions, plus a quick review etiquette cheat sheet.

```markdown
# .github/pull_request_template.md
### Summary
- Brief one-line summary of the change.

### Changes
- List files touched and notable code changes.

### Why
- Rationale for the change and context.

### How to test
- Step-by-step manual tests or automated test commands.

### Screenshots (optional)
- Any UI changes (if applicable).

### Related issues
- References to issues this PR closes (e.g., closes #123).
```

```bash
# Branch naming conventions (good vs bad)
# Good
git checkout -b feat/issue-123-autoload-psr4

# Bad
git checkout -b fix
```

### Line-by-line explanation
Template sections:
1) Summary: concise description of the change.  
2) Changes: file-level impact and notable code changes.  
3) Why: motivation and trade-offs.  
4) How to test: explicit steps to verify behavior, including commands.  
5) Screenshots: optional UI evidence.  
6) Related issues: links to issue-tracker items.  

Branch naming:
- Good: feat/issue-123-autoload-psr4 clearly ties the work to an issue and describes the feature.  
- Bad: fix is too vague and hard to trace back to a problem.

## 3. CI, Code Quality, and PHP in PRs

Automated checks in PRs catch issues early. This section shows a PHP-focused GitHub Actions workflow that runs linting, unit tests, PHPStan, and PHP_CodeSniffer on PRs.

```yaml
# .github/workflows/php-ci.yml
name: PHP CI
on:
  pull_request:
    branches:
      - main
      - develop
      - '**'
jobs:
  php-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.1'

      - name: Install dependencies
        run: composer install --no-progress --no-interaction

      - name: PHP linter
        run: find . -name "*.php" -print0 | xargs -0 -n1 php -l

      - name: Run PHPUnit
        run: vendor/bin/phpunit

      - name: Run PHPStan
        run: vendor/bin/phpstan analyse src tests || true

      - name: Run PHP_CodeSniffer
        run: vendor/bin/phpcs
```

### Line-by-line explanation
1) Trigger the workflow on PRs to main, develop, or any branch-pull; ensures PRs are evaluated before merging.  
2) Define a single job named php-ci.  
3) Check out the PR's code so the workflow can inspect it.  
4) Set up PHP 8.1 in the runner environment.  
5) Install project dependencies with Composer.  
6) Run PHP lint (syntax checks) on all PHP files discovered.  
7) Execute PHPUnit tests to verify correctness.  
8) Run PHPStan for static analysis to catch potential issues.  
9) Run PHP_CodeSniffer to enforce coding standards.  

Optional enhancements:
- Add cache for composer to speed up builds.
- Run PHP-CS-Fixer for automatic style fixes.
- Split tests into separate jobs for faster feedback.

## 4. Common Beginner Mistakes — Bad vs Good

Real-world pitfallsbeginners often make. Each pair shows a bad pattern and a recommended improvement with concrete code.

- Pitfall 1: Pushing directly to main instead of using a feature branch
Bad:
```bash
# Directly pushing to main (riskier)
git checkout main
git pull origin main
git add .
git commit -m "unwraps main merge"
git push origin main
```
Good:
```bash
# Create and work on a feature branch
git checkout -b feat/secure-defaults
git add .
git commit -m "feat(config): provide secure defaults"
git push -u origin feat/secure-defaults
```

- Pitfall 2: Vague PR titles and descriptions
Bad PR title:
"update"
Good PR title:
"feat(auth): add PHP session security hardening"
Good description:
- What changed: Implemented session_regenerate_id(true) on login, added tests.
- How to test: Run phpunit; verify session IDs rotate on login.
- Why: Improves session security and reduces risk of session fixation.

- Pitfall 3: Skipping local tests and relying solely on CI
Bad:
```bash
# Relying on CI
# No local tests executed
```
Good:
```bash
# Run local tests first
composer install
vendor/bin/phpunit
vendor/bin/phpstan analyse
vendor/bin/phpcs
```

- Pitfall 4: Committing IDE or environment files
Bad (vendor and IDE files accidentally tracked)
```bash
git add -A
git commit -m "Add vendor and IDE config"
```
Good:
```bash
# .gitignore (example)
vendor/
.idea/
.vscode/
.DS_Store
```
```bash
# Then only commit source changes
git add src/ tests/ composer.json
git commit -m "feat: autoload PSR-4 for App namespace"
```

## 5. Why This Matters In Real Systems — production context

- PRs enable controlled software delivery: features, fixes, and security patches can be reviewed, tested, and approved before appearing in a release.  
- Forks empower external contributors and internal teams across departments or partner orgs without risking the main tree.  
- CI integration with PHP tools (PHPUnit, PHPStan, PHP_CodeSniffer) catches regressions, enforces standards, and improves maintainability over time.  
- Branch hygiene and PR templates cut down review cycles, reduce miscommunication, and create auditable change histories—crucial for audits, compliance, and incident response.  
- In PHP ecosystems, ensuring PSR-4 autoloading, proper composer configuration, and robust unit tests minimizes runtime errors in production and simplifies deployment pipelines.

## 6. Study Questions — 5 recall questions

1) What is the difference between forking a repository and cloning it locally?  
2) Why is it recommended to create a descriptive feature branch instead of committing directly to main?  
3) Name three checks you would include in a PHP-focused CI workflow and why they matter.  
4) What is the purpose of a GitHub Pull Request template?  
5) How can you keep your fork up-to-date with the upstream repository while a PR is open?

## Exercise — a practical multi-part coding challenge

Goal: Practice forking, branching, PR creation, code changes, and CI integration in a PHP project.

Part A — Set up and implement a small feature
- Start with a minimal PHP project structure (or use the skeleton below):
  - composer.json
  - src/App/Greeter.php
  - tests/GreeterTest.php
  - phpunit.xml (optional)

Code example (start point):
```php
// composer.json
{
  "name": "acme/php-project",
  "autoload": {
    "psr-4": {"App\\": "src/"}
  },
  "require-dev": {
    "phpunit/phpunit": "^9.5"
  }
}
```

```php
// src/App/Greeter.php
<?php
namespace App;

class Greeter {
  public static function say(string $name): string {
     return "Hello, " . $name;
  }
}
```

```php
// tests/GreeterTest.php
<?php
use App\Greeter;
use PHPUnit\Framework\TestCase;

final class GreeterTest extends TestCase {
  public function testSay() {
    $this->assertSame("Hello, World", Greeter::say("World"));
  }
}
```

- Create a new feature branch: git checkout -b feat/add-say-goodbye
- Implement a small enhancement: add a sayGoodbye method and its test.
Code changes:
```php
// src/App/Greeter.php (new method)
<?php
namespace App;

class Greeter {
  public static function say(string $name): string {
     return "Hello, " . $name;
  }

  public static function sayGoodbye(string $name): string {
     return "Goodbye, " . $name;
  }
}
```

```php
// tests/GreeterTest.php (new test)
<?php
use App\Greeter;
use PHPUnit\Framework\TestCase;

final class GreeterTest extends TestCase {
  public function testSay() {
    $this->assertSame("Hello, World", Greeter::say("World"));
  }

  public function testSayGoodbye() {
    $this->assertSame("Goodbye, World", Greeter::sayGoodbye("World"));
  }
}
```

- Run local tests:
```bash
composer install
vendor/bin/phpunit
```

Part B — Open a PR and describe your changes
- Push the feature branch and create a PR against upstream/main using the UI or the API example from Section 1.
- Use the PR template from Section 2 to fill in summary, changes, testing steps, and related issues.

Part C — Enable CI and iterate
- Add a GitHub Actions workflow (Section 3) to automatically run tests on PRs.
- If local tests fail, fix issues, commit, and push to the same branch; the PR will update automatically.

Part D — Conflict simulation
- Suppose another contributor merged a conflicting change to Greeter.php in upstream/main.
- Update your fork and rebase the feature branch:
```bash
git fetch upstream
git checkout feature/improve-autoload
git rebase upstream/main
# Resolve any merge conflicts in src/App/Greeter.php
git add .
git rebase --continue
git push -f origin feature/improve-autoload
```
- Open update notes in your PR describing the conflict resolution.

This completes a structured, practical lesson on GitHub pull requests, forks, and team collaboration in a PHP-backed environment. The content emphasizes real-world workflows, tooling, and best practices to improve code quality and collaboration in production-grade PHP systems.