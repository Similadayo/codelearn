# Track: Backend Engineering — Phase 2: Developer Tools & Workflow — GitHub: Pull Requests, Forks & Team Collaboration (Java)

GitHub-driven collaboration is the backbone of modern backend teams. Pull requests (PRs) enable peer review, automated checks, and traceable changes, while forks and branching strategies help large teams contribute safely without trampling the main codebase. In Java backend projects, PR workflows integrate with build, test, and security tooling to ensure robust releases. This lesson walks you through the core concepts, practical Java-focused workflows, and real-world pitfalls, with code examples and hands-on exercises.

## 1. Forks, Branches & Pull Requests — Core Concepts

In a collaborative Java backend project, you typically:
- Fork the original repository to your own GitHub account.
- Clone your fork, set the original repo as an upstream remote, and create feature branches.
- Open a PR from your feature branch to the upstream main/develop branch.
- Leverage CI to validate builds and tests before merging.

Code: Typical forked-workflow commands and PR creation steps
```bash
# 1) Fork the repository on GitHub to your-username/project
# 2) Clone your fork locally
git clone git@github.com:your-username/project.git
cd project

# 3) Add the original repo as an upstream remote
git remote add upstream https://github.com/original/project.git

# 4) Create a feature branch (naming convention: feature/<ticket-or-brief>)
git checkout -b feature/auth-jwt

# 5) Make code changes...

# 6) Stage and commit changes with a descriptive message
git add .
git commit -m "feat(auth): scaffold JWT-based authentication flow"

# 7) Push the feature branch to your fork
git push origin feature/auth-jwt

# 8) Open a Pull Request from feature/auth-jwt in your fork to main (or develop) in the upstream repo
```

### Line-by-line explanation
- Fork the repository on GitHub: Creates a copy under your account for you to modify without affecting the original.
- Clone your fork locally: Retrieves your fork’s code so you can work offline and commit changes.
- Add upstream remote: Enables you to fetch the original repository’s changes and keep your fork up to date.
- Create a feature branch: Isolates work for a single feature or fix; avoids editing main directly.
- Make code changes: Implement the feature or fix.
- Stage and commit: Prepares the changes and records a meaningful, atomic commit.
- Push to fork: Makes your branch available on GitHub for collaboration and PR creation.
- Open a PR: Requests review and mergeability checks against the upstream repository’s base branch.

## 2. Java Project Integration with PRs: Maven, JUnit, and PR Checks

When working on a Java backend, your PR should integrate with your build and test process so that reviewers and CI systems can validate changes automatically.

A) Minimal Maven project pom.xml (for tests and dependencies)
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>backend-app</artifactId>
  <version>1.0.0</version>

  <properties>
    <maven.compiler.source>11</maven.compiler.source>
    <maven.compiler.target>11</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
```

### Line-by-line explanation
- Maven project coordinates: groupId, artifactId, and version identify the build artifact.
- maven.compiler.source/target: Ensure Java 11 compatibility (adjust to your project’s JDK).
- junit dependency: Enables JUnit 4 tests; tests run via mvn test in CI.
- The POM anchors the Java project’s build and test lifecycle in PR checks.

B) Java class: UserService (existing or starter)
```java
package com.example.service;

public class UserService {
    // Example: simple in-memory user validation placeholder
    public boolean validateUser(String username, String password) {
        return username != null && password != null && password.length() >= 6;
    }

    // Placeholder for password policy integration
    public boolean isPasswordStrong(String password) {
        return com.example.security.PasswordPolicy.isValid(password);
    }
}
```

### Line-by-line explanation
- Package declaration: organizes code under com.example.service.
- validateUser: simple stub that ensures non-null inputs and a minimum password length.
- isPasswordStrong: delegates to a PasswordPolicy class (goal of PRs is to wire new functionality cleanly without breaking existing code).

C) Unit test: UserServiceTest.java
```java
package com.example.service;

import org.junit.Test;
import static org.junit.Assert.*;

public class UserServiceTest {
    @Test
    public void testValidateUser_basic() {
        UserService svc = new UserService();
        assertTrue(svc.validateUser("alice", "secret123"));
        assertFalse(svc.validateUser(null, "secret123"));
        assertFalse(svc.validateUser("alice", null));
        assertFalse(svc.validateUser("alice", "short"));
    }
}
```

### Line-by-line explanation
- JUnit import and assertion utilities: enable writing test cases.
- testValidateUser_basic: ensures validateUser handles typical cases and edge conditions properly.
- Assertions verify positive and negative scenarios for input validation.

D) Optional: PasswordPolicy integration class
```java
package com.example.security;

public class PasswordPolicy {
    public static boolean isValid(String password) {
        if (password == null) return false;
        if (password.length() < 8) return false;

        boolean hasUpper = false, hasLower = false, hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isLowerCase(c)) hasLower = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        return hasUpper && hasLower && hasDigit;
    }
}
```

### Line-by-line explanation
- Quick password policy check: non-null, minimum length, and character-type requirements (uppercase, lowercase, digit).
- Loop through characters: flags set as the password is scanned.

E) Line of CI integration (GitHub Actions example)
```yaml
name: Java CI

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  build-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'

      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-maven-

      - name: Build and test
        run: mvn -q -e -DskipTests=false test
```

### Line-by-line explanation
- Trigger: PRs to main or develop trigger the CI workflow.
- Job: build-test runs on Ubuntu with JDK 11.
- actions/checkout: Retrieves the PR code.
- actions/setup-java: Installs Java 11 for the build.
- Maven cache: Speeds up subsequent runs by caching dependencies.
- mvn test: Runs unit tests; a failing test blocks PR merging.

F) Pull Request template (example)
```markdown
#### Summary
What changes are included in this PR?

#### Related issue
Resolves: #1234

#### How to test
Steps to reproduce the bug or verify the feature.

#### Checklist
- [ ] Code compiles
- [ ] All tests pass
- [ ] CI checks pass
- [ ] Documentation updated (if needed)
- [ ] PR description is clear and includes motivation
```

### Line-by-line explanation
- Summary: concise description of the change.
- Related issue: links PR to a tracked issue.
- How to test: reproducible steps for QA or reviewers.
- Checklist: explicit gating criteria for PR validation.

## 3. Pull Request Templates, Checks, and CI for Java Backends

This section shows practical templates and automation to keep PRs consistent and high-quality.

A) GitHub Actions workflow (Java CI) — already shown as part of Section 2D; included again here for emphasis
```yaml
name: Java CI

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'
      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-maven-
      - name: Build and test
        run: mvn -q -e -DskipTests=false test
```

### Line-by-line explanation
- Reiterates CI triggers for PRs and the Java build/test steps to catch regressions early.

B) PR template usage (above) standardizes PR descriptions and quality gates.

### Line-by-line explanation
- Templates reduce back-and-forth by giving reviewers essential context up front.

C) GitHub CLI example for streamlined PRs (optional)
```bash
# Create a PR with reviewers and labels using GitHub CLI
gh pr create --base main --head feature/auth-jwt \
  --title "feat(auth): JWT scaffolding" \
  --body "Adds JWT scaffolding and unit tests. Addresses issue #1234." \
  --reviewer octo-admin --label feature
```

### Line-by-line explanation
- gh pr create: Creates a PR directly from the CLI, saving context switching to the browser.
- --head, --base: Specify feature branch and target branch.
- --reviewer/--label: Pre-assign reviewers and categorize the PR.

## 4. Conflict Resolution and Merging Strategy

When multiple teams work on the same codebase, conflicts can occur. Handling them cleanly preserves a readable history and stable builds.

A) Rebase approach (clean linear history)
```bash
# Update main from upstream
git fetch upstream
git checkout feature/auth-jwt
git rebase upstream/main

# If there are conflicts, resolve them in editor, then:
git add .
git rebase --continue

# Push the rebased branch (need force-with-lease)
git push --force-with-lease origin feature/auth-jwt
```

### Line-by-line explanation
- git fetch upstream: fetches latest changes from the original repository.
- git checkout feature/auth-jwt: switch to your feature branch.
- git rebase upstream/main: replay your commits on top of the latest main to keep a linear history.
- Resolve conflicts, then continue rebasing.
- Force push with lease: updates the remote branch; protects against overwriting someone else’s work.

B) Merge approach (preserves merge commits)
```bash
git fetch upstream
git checkout main
git merge upstream/main --no-ff
git push origin main
```

### Line-by-line explanation
- git merge --no-ff: creates a merge commit even if the branch could be fast-forwarded, preserving context of the feature branch in history.
- This approach is easier to understand but can clutter history if used liberally.

C) Guidelines
- Prefer rebase for feature branches in small teams to keep history linear.
- Use merge commits for large features where you want to preserve the exact feature boundary.
- Always run CI after conflict resolution and before merging.

## 5. Collaboration Roles, Access Control & Governance

- Maintainers: Review, approve, and merge PRs; manage repository settings.
- Contributors: Open PRs, respond to reviews, keep branches up to date.
- Reviewers: Provide code-quality feedback, run tests locally if needed, request changes when necessary.
- Governance practices: enforce branch protection rules (e.g., require PR reviews, status checks, and passing CI before merging), keep a public CHANGELOG, and maintain a concise PR template.

Code: Example of using GitHub CLI to manage PRs and reviews (for teams)
```bash
# List open PRs
gh pr list

# Add a reviewer to a specific PR
gh pr edit 1234 --add-reviewer octo-reviewer

# Merge a PR (only after checks pass)
gh pr merge 1234 --merge --delete-branch
```

### Line-by-line explanation
- gh pr list: helps triage feed of open PRs.
- gh pr edit --add-reviewer: automatically notifies a reviewer.
- gh pr merge: performs the merge according to the repository’s settings, with an option to delete the source branch after merging.

## 6. Best Practices: PR Etiquette, Templates, and Documentation

- Small, focused PRs: one feature or fix per PR to simplify review.
- Descriptive titles and bodies: include the what, why, and how; reference related issues.
- Include tests: ensure unit/integration tests cover new behavior.
- Document user-facing changes: update API docs or internal developer docs as needed.
- Ensure local validation: run mvn test and, if feasible, mvn -DskipTests=false verify locally before opening PR.
- Use templates: PR templates standardize information, reducing back-and-forth.

Code: Sample PR guidelines snippet (markdown)
```markdown
PR Guidelines
- Focused changes with a clear purpose
- Descriptive title and body
- Tests updated or added, with results
- Documentation updated if needed
- Affected modules listed
```

### Line-by-line explanation
- Each bullet enforces clarity and completeness, reducing review cycles and surprise changes in production.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Pushing directly to main without a feature branch
Bad:
```bash
# Directly pushing to main (dangerous)
git checkout main
git pull origin main
# Make quick fix
# Commit
git add .
git commit -m "fix: quick bug fix"
git push origin main
```
Good:
```bash
# Use a feature branch for every change
git checkout -b fix/urgent-bug
# Make changes
git add .
git commit -m "fix(urgent): address race condition in processing queue"
git push origin fix/urgent-bug

# Then open a PR from fix/urgent-bug to main
```

Pitfall 2: Large, unfocused commits
Bad:
```bash
git add .
git commit -m "wip: multiple changes including refactor and docs"
```
Good: atomic, focused commits
```bash
# First logical change
git add src/main/java/com/example/AuthService.java
git commit -m "feat(auth): scaffold JWT support in AuthService"

# Second logical change
git add src/test/java/com/example/AuthServiceTest.java
git commit -m "test(auth): add unit tests for JWT scaffold"
```

Pitfall 3: Skipping tests or relying on CI exclusively
Bad:
```bash
# Trust CI to catch issues
# No local tests run
```
Good:
```bash
# Run unit tests locally before PR
mvn -Dtest=*Test test
```

## Y. Why This Matters In Real Systems — production context and real usage

- Quality gates: PR reviews and CI catch defects early, reducing post-release hotfixes.
- Auditability: PR history provides a clear narrative of why changes were made, supporting compliance and traceability.
- Collaboration hygiene: Branch protections and templates reduce drift, ensuring consistent standards across multiple teams.
- Safe releases: Automated tests and code quality checks minimize the risk of breaking changes in production systems.
- Rollback readiness: With a clean PR history and reproducible builds, rolling back to a known good state is simpler if issues arise.

## Z. Study Questions — 5 recall questions

1) What is the primary purpose of forking a repository in a team workflow?  
2) How do you keep your fork in sync with the upstream repository?  
3) What is the difference between merging and rebasing a feature branch?  
4) Why should a PR include tests and documentation updates?  
5) What is a pull request template, and how does it help in reviews?

## Exercise — practical multi-part coding challenge

Objective: Implement a small authentication-enhancement feature in a Java backend project, wired through a PR workflow with tests and CI.

Part 1: Prepare and branch
- Fork the repository and clone your fork.
- Create a feature branch named feature/auth-policy.

Commands (illustrative):
```bash
git clone git@github.com:your-username/backend-app.git
cd backend-app
git remote add upstream https://github.com/original/backend-app.git
git fetch upstream
git checkout -b feature/auth-policy
```

Part 2: Implement a password policy and integrate into UserService
Files to add/modify:
- com/example/security/PasswordPolicy.java
- com/example/service/UserService.java
- com/example/service/UserServiceTest.java

PasswordPolicy.java
```java
package com.example.security;

public class PasswordPolicy {
    public static boolean isValid(String password) {
        if (password == null) return false;
        if (password.length() < 8) return false;

        boolean hasUpper = false, hasLower = false, hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isLowerCase(c)) hasLower = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        return hasUpper && hasLower && hasDigit;
    }
}
```

UserService.java (integration point)
```java
package com.example.service;

import com.example.security.PasswordPolicy;

public class UserService {
    public boolean validateUser(String username, String password) {
        return username != null && password != null && password.length() >= 6;
    }

    // New integration point
    public boolean isPasswordStrong(String password) {
        return PasswordPolicy.isValid(password);
    }
}
```

UserServiceTest.java (unit tests for password policy integration)
```java
package com.example.service;

import org.junit.Test;
import static org.junit.Assert.*;

public class UserServiceTest {
    @Test
    public void testPasswordStrength() {
        UserService svc = new UserService();
        assertTrue(svc.isPasswordStrong("Abcd1234"));
        assertFalse(PasswordPolicy.isValid(null));
        assertFalse(PasswordPolicy.isValid("abcdef12"));
        assertFalse(PasswordPolicy.isValid("ABCDEF12"));
        assertFalse(PasswordPolicy.isValid("AbcdEf1")); // 7 chars
    }
}
```

Part 3: Add CI
- Add a GitHub Actions workflow (java-ci.yml) as shown in Section 2.

Part 4: Create a PR
- Push your branch to your fork and open a PR to upstream/main with a descriptive title and body.
- Ensure CI passes and reviewers are assigned.

Part 5: Verification
- Locally run mvn test to verify tests pass before or after PR submission.
- After PR merge, pull upstream/main to your local main to stay in sync.

What you should deliver to your instructor or reviewer
- A forked and updated repository branch feature/auth-policy with implemented code, tests, and a passing CI workflow.
- A PR that includes a clear summary, references to related issues, test results, and any necessary documentation updates.

End of lesson.