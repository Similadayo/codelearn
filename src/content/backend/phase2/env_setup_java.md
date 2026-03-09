# Track: Backend Engineering — Phase 2 — Developer Tools & Workflow — Setting Up a Professional Dev Environment (Java)

1. In modern backend development, a professional dev environment is the foundation of speed, reliability, and collaboration. It ensures every developer on a team works with the same JDK version, build tools, test suites, and quality gates, reducing “works on my machine” issues and accelerating onboarding. This lesson covers the essential components, practical configurations, and repeatable processes you need to bootstrap a robust Java development environment—from local machine setup to CI/CD parity.

## 1. Java Tooling Stack and Version Management
This section introduces the core tooling you’ll rely on to manage and run Java projects consistently: the Java Development Kit (JDK) versions, Gradle as the build tool, and a reproducible setup script. You’ll see a bootstrap script, a Gradle build file, and a tiny Java app to verify the environment.

```bash
#!/usr/bin/env bash
# setup-dev-env.sh - Bootstrap a reproducible Java dev environment
set -euo pipefail

# Ensure sdkman is installed
if [ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]; then
  source "$HOME/.sdkman/bin/sdkman-init.sh"
else
  echo "SDKMAN not found. Installing..."
  curl -s "https://get.sdkman.io" | bash
  source "$HOME/.sdkman/bin/sdkman-init.sh"
fi

# Install specific JDK and Gradle versions (pin versions for reproducibility)
sdk install java 17.0.8-open
sdk install gradle 8.0.1

# Set default versions for the current shell/session
sdk default java 17.0.8-open
sdk default gradle 8.0.1

# Print versions to confirm
echo "JAVA_HOME: ${JAVA_HOME:-}"
java -version
gradle -version
```

```groovy
// build.gradle - Gradle Groovy DSL for a small Java app
plugins {
    id 'java'
    id 'application'
}

group = 'com.example'
version = '1.0.0'

repositories {
    mavenCentral()
}

dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.9.3'
}

application {
    mainClassName = 'com.example.app.App'
}

test {
    useJUnitPlatform()
}
```

```java
// src/main/java/com/example/app/App.java - Simple entry point
package com.example.app;

public class App {
    public static void main(String[] args) {
        System.out.println("Hello, Dev Environment!");
    }
}
```

### Line-by-line explanation
- setup-dev-env.sh
  - Line 1-2: Shebang and safe execution; aborts on error.
  - Line 4-12: Check for sdkman installation; install if missing and initialize.
  - Line 15-16: Install pinned JDK (17.0.8-open) and Gradle (8.0.1) for reproducibility.
  - Line 19-20: Set defaults so new shells pick the pinned versions automatically.
  - Line 23-25: Print versions to verify the environment is correctly configured.
- build.gradle
  - lines 1-7: Apply Java and Application plugins, enabling standard Java project conventions and a runnable main class.
  - lines 9-13: Define group and version metadata, and declare repositories.
  - lines 15-20: Add JUnit Jupiter as a dependency for tests.
  - lines 22-28: Configure the application plugin with the main class and enable JUnit 5 for tests.
- App.java
  - Line 1: Package declaration.
  - Line 3-7: Main method that prints a greeting, serving as a basic sanity check.

## 2. Project Skeleton and Build Tooling
This section demonstrates how to structure a scalable Java project, including settings, a minimal test, and a conventional Git ignore. The goal is to have a clean, reproducible layout that CI/CD can rely on.

```groovy
// settings.gradle - Basic multi-project setup (single-project example)
rootProject.name = 'dev-env-demo'
include 'app'
```

```groovy
// src/test/java/com/example/app/AppTest.java - Simple unit test
package com.example.app;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class AppTest {
    @Test
    void basicTest() {
        assertEquals(2, 1 + 1);
    }
}
```

```gitignore
# IDE / OS files
.idea/
*.iml
*.ipr
.DS_Store

# Build outputs
/build/
out/
target/

# Gradle / IDE caches
.gradle/
.gradle-kotlin-d build/
.gradle-wrapper.jar

# OS artifacts
*.class
*.log
```

### Line-by-line explanation
- settings.gradle
  - Line 1: Declare the settings file for Gradle; defines projects in the build.
  - Line 2-3: Name the root project and include the app project as a submodule.
- AppTest.java
  - Line 1: Package declaration.
  - Line 3-8: JUnit 5 test class with a trivial assertion to validate the test framework is wired up.
- .gitignore
  - Lines 2-6: Ignore common IDE metadata and temporary directories.
  - Lines 9-12: Exclude build outputs that are generated, not checked in.
  - Lines 15-18: Ignore caches used by Gradle and IDEs.
  - Lines 21-23: Ignore OS artifacts and log files.

## 3. IDE Configuration, Code Quality, and Workflow Automation
This section covers integrating code quality tools (like Checkstyle) and automating quality gates in your workflow. You’ll see a Checkstyle configuration, Gradle configuration to apply it, and a CI workflow example that runs on every PR.

```xml
<!-- config/checkstyle/checkstyle.xml - Minimal Google-style Checkstyle rules -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE module PUBLIC
  "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
  "https://checkstyle.org/dtds/configuration_1_3.dtd">
<module name="Checker">
  <property name="severity" value="warning"/>
  <module name="TreeWalker">
    <module name="JavadocType"/>
    <module name="WhitespaceAfter"/>
  </module>
</module>
```

```groovy
// build.gradle (partial) - Add Checkstyle plugin and configuration
plugins {
    id 'java'
    id 'checkstyle'
}

checkstyle {
    toolVersion = '11.9'
    config = resources.text.fromFile('config/checkstyle/checkstyle.xml')
}

tasks.withType(Checkstyle) {
    reports {
        xml.required = false
        html.required = true
    }
}

tasks.named('check') {
    dependsOn 'checkstyleMain'
}
```

```yaml
# .github/workflows/java-ci.yml - Basic Java CI workflow
name: Java CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
      - name: Grant execute permission for gradlew
        run: chmod +x ./gradlew
      - name: Build with Gradle
        run: ./gradlew test
```

### Line-by-line explanation
- config/checkstyle/checkstyle.xml
  - Line 1-3: XML header and Doctype reference.
  - Line 6: Set severity to warnings to avoid blocking builds for minor issues.
  - Line 9-16: A basic walker configuration enabling Javadoc type checks and whitespace checks.
- build.gradle (Checkstyle integration)
  - Lines 1-7: Apply Java and Checkstyle plugins.
  - Lines 9-13: Point Checkstyle to the external config file and set tool version.
  - Lines 15-21: Configure HTML report output.
  - Lines 23-25: Ensure the check task runs as part of the overall check lifecycle.
- java-ci.yml
  - Line 8-12: Checkout code and set up JDK 17.
  - Line 14-16: Ensure wrapper scripts are executable.
  - Line 18-19: Run the test task to validate code and tests.

## 4. Common Beginner Mistakes
3+ real pitfalls with bad vs good code side-by-side.

- Pitfall 1: Not pinning tool versions; assuming the latest is always compatible.
  - Bad:
  - Bad:
```bash
# Bad: No version pinning
sdk install java  # unspecified version
```
  - Good:
```bash
# Good: Pin versions for reproducibility
sdk install java 17.0.8-open
sdk install gradle 8.0.1
```

- Pitfall 2: Relying on system-wide tools instead of a wrapper/SDK manager.
  - Bad:
```bash
# Bad: Install tools globally and assume path
# User must install Gradle and JDK manually
```
  - Good:
```bash
# Good: Use Gradle wrapper and sdkman to bootstrap in scripts
./gradlew wrapper --gradle-version 8.0.1
```

- Pitfall 3: Skipping tests in local runs and CI.
  - Bad:
```yaml
# Bad: No tests run
name: Quick Build
on: [ push ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Skipping tests"
```
  - Good:
```yaml
# Good: Enforce tests in CI
- name: Run tests
  run: ./gradlew test
```

- Pitfall 4: Hardcoding paths or environment assumptions in scripts.
  - Bad:
```bash
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64  # brittle
```
  - Good:
```bash
# Good: Use sdkman or java.home agnostic approaches
export JAVA_HOME="$(asdf where java 17.0.8-open)"  # if using asdf
```

## 5. Why This Matters In Real Systems
In production-grade systems, dev environments must be reproducible, auditable, and portable. The benefits include:
- Consistent developer experiences across laptops, VMs, and containers.
- Reliable CI/CD parity, reducing “it works on my machine” bugs.
- Easier onboarding with a documented bootstrap process and version pinning.
- Clear quality gates (static checks, unit tests, formatting) enforced automatically.
- Easier rollback and auditing of toolchain changes through versioned configs.

Production-oriented patterns to adopt:
- Use a single source of truth for tooling versions (SDKMAN, Gradle wrapper, Docker images).
- Represent environments as code (bootstrap scripts, Dockerfiles, GitHub Actions).
- Pin dependencies and tool versions to fixed values; avoid floating releases.
- Integrate checks and tests early in the workflow to catch irreproducible states.

Example Dockerfile (dev-oriented) to standardize a dev container:
```dockerfile
FROM adoptopenjdk:17-jre-hotspot
RUN apt-get update && \
    apt-get install -y curl unzip && \
    curl -s "https://get.sdkman.io" | bash && \
    bash -lc "source $HOME/.sdkman/bin/sdkman-init.sh && sdk install java 17.0.8-open && sdk install gradle 8.0.1"
ENV JAVA_HOME=/path/to/java-17.0.8-open
ENV GRADLE_HOME=/path/to/gradle-8.0.1
WORKDIR /workspace
COPY . /workspace
```

### Line-by-line explanation
- Dockerfile
  - Line 1: Base image with Java 17 runtime.
  - Line 2-3: Update package lists and install basic tools.
  - Line 4-5: Install SDKMAN to manage SDKs programmatically.
  - Line 6-7: Install pinned JDK and Gradle versions via SDKMAN.
  - Line 9-11: Set environment variables to point to the installed JDK and Gradle (paths are container-specific).
  - Line 12: Set the working directory for subsequent commands.
  - Line 13: Copy the project into the container (for development inside the container).

## 6. Study Questions
1) Why is it important to pin the Java and Gradle versions in a dev environment?
2) What role does the Gradle wrapper play in ensuring reproducible builds?
3) How can a centralized code quality gate (like Checkstyle) improve team velocity?
4) What are the advantages of representing environments as code (Dockerfiles, bootstrap scripts) in real systems?
5) What changes would you make to your CI workflow to ensure parity with local development?

## 7. Exercise
Build a small but complete Java dev environment bootstrap and project, then verify it with a test run.

Part A — Bootstrap and skeleton
- Create a new directory dev-env-java, initialize a Gradle project, and bootstrap the dev environment.
- Files to create or update:
  - setup-dev-env.sh (reuse or adapt from Section 1)
  - build.gradle (reuse from Section 1)
  - settings.gradle (from Section 2)
  - src/main/java/com/example/app/App.java (basic app)
  - src/test/java/com/example/app/AppTest.java (unit test)
  - .github/workflows/java-ci.yml (CI workflow for PRs)

Code blocks for Part A (sample scaffolding):

```bash
# Part A: bootstrap
mkdir -p dev-env-java/src/main/java/com/example/app
mkdir -p dev-env-java/src/test/java/com/example/app
cat > dev-env-java/build.gradle <<'GRD'
plugins {
    id 'java'
    id 'application'
}
group = 'com.example'
version = '1.0.0'
repositories { mavenCentral() }
dependencies { testImplementation 'org.junit.jupiter:junit-jupiter:5.9.3' }
application { mainClassName = 'com.example.app.App' }
test { useJUnitPlatform() }
GRD

cat > dev-env-java/settings.gradle <<'SET'
rootProject.name = 'dev-env-demo'
include 'app'
SET

cat > dev-env-java/src/main/java/com/example/app/App.java <<'JAVA'
package com.example.app;
public class App {
    public static void main(String[] args) {
        System.out.println("Hello from the exercise app!");
    }
}
JAVA

cat > dev-env-java/src/test/java/com/example/app/AppTest.java <<'JAVA'
package com.example.app;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
public class AppTest {
    @Test
    void basicTest() {
        assertEquals(2, 1 + 1);
    }
}
JAVA

git init dev-env-java
```

```yaml
# Part A: Part of exercise — CI workflow for the exercise repo
name: Java CI Exercise

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
      - name: Run tests
        run: cd dev-env-java && ./gradlew test
```

Part B — Verify locally
- Run the dev environment bootstrap script, then run the Gradle build and tests.
- Commands:
1) bash setup-dev-env.sh
2) cd dev-env-java
3) ./gradlew test

Part C — Extend
- Add a small Java utility class that computes factorial and a matching unit test.
- Update the build to include a simple coverage report (e.g., Jacoco) and ensure tests fail on formatting or style violations (if you wire in Checkstyle).

Notes
- Keep the dev-env script in version control and reference it in your onboarding docs.
- Consider converting the Dockerfile from Section 5 into a dedicated container image used by each developer’s IDE or by CI runners to guarantee parity.

End of lesson.