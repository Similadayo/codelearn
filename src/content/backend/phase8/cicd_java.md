# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment — CI/CD with GitHub Actions Pipelines (Java)

Continuous Integration and Delivery (CI/CD) pipelines are the backbone of reliable, repeatable software delivery. For Java backends, GitHub Actions gives you a programmable, scalable way to build, test, package, and deploy your services with minimal manual intervention. In this lesson, you’ll learn how to design, implement, and reason about GitHub Actions workflows that cover compilation, testing, packaging, caching, and deployment to staging/production environments. You’ll also learn common pitfalls and how to avoid them in real systems.

## 1. CI/CD Fundamentals for Java Backends

In professional backend engineering, CI/CD means every change goes through a validated path: compile, test, package, and (optionally) deploy. For Java, this typically involves Maven or Gradle builds, unit/integration tests, and packaging into a JAR/WAT for distribution. GitHub Actions lets you express these steps as code, enabling:

- Reproducible builds across developers and CI runners
- Early feedback via automated tests
- Safe promotion through environments (dev → staging → prod)
- Caching to reduce build times
- Secrets management for deployment credentials

Below is a compact outline of a GitHub Actions workflow that demonstrates a minimal Java CI/CD outline. This is not production-ready by itself but shows the core structure.

```yaml
# .github/workflows/java-ci-outline.yml
name: Java CI/CD Outline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  outline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Build
        run: mvn -B -DskipTests=false test
```

### Line-by-line explanation
- name: Java CI/CD Outline: The human-readable name of the workflow.
- on: Triggers for the workflow; this runs on pushes and PRs to main.
- jobs: A collection of one or more jobs to run in the workflow.
- outline: The job id.
- runs-on: The type of runner (Ubuntu VM).
- steps: The sequence of actions to perform.
- actions/checkout@v4: Checks out the repository so subsequent steps can access code.
- actions/setup-java@v4: Sets up a Java JDK on the runner; supports multiple distributions and versions.
- distribution: 'temurin' and java-version: '17': Specifies the JDK distribution and version to install.
- mvn -B -DskipTests=false test: Runs Maven in batch mode and executes tests, failing the workflow if tests fail.

## 2. Setting up a Maven-based Java project in GitHub Actions

A typical Java backend uses Maven (or Gradle) for builds. The following workflow demonstrates building, testing, packaging, and uploading an artifact (the JAR) for later deployment or distribution. It uses a JDK matrix to ensure compatibility across multiple Java versions.

```yaml
# .github/workflows/java-ci-maven.yml
name: Java CI with Maven
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java-version: [ '17', '21' ]
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK ${{ matrix.java-version }}
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: ${{ matrix.java-version }}

      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: |
            ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}-${{ matrix.java-version }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - name: Build and test with Maven
        run: mvn -B -DskipTests=false test

      - name: Package JAR
        run: mvn -B package -DskipTests

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: app-artifact
          path: target/*.jar
```

### Line-by-line explanation
- matrix: java-version: Creates a matrix so the workflow runs for both Java 17 and Java 21.
- actions/setup-java@v4: Installs the specified JDK version for the job.
- Cache Maven packages: Caches the local Maven repository to avoid re-downloading dependencies on every run.
- key: Combines OS, Maven hash, and Java version to create a unique cache key per Java version and project state.
- Build and test with Maven: Executes Maven tests; fails the job if tests fail.
- Package JAR: Produces the deliverable artifact (target/*.jar).
- Upload artifact: Saves the built JAR as an artifact to the workflow run for later steps/environments.

## 3. Caching dependencies to speed up builds

Caching is critical to keep CI fast. Maven downloads dependencies to ~/.m2/repository. Caching that directory between runs avoids re-downloading the same dependencies, dramatically reducing build times, especially on large projects or when the dependency graph is stable.

```yaml
# Snippet: Maven cache (can be placed in a build or multi-stage workflow)
- name: Cache Maven packages
  uses: actions/cache@v3
  with:
    path: ~/.m2/repository
    key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
    restore-keys: |
      ${{ runner.os }}-maven-
```

### Line-by-line explanation
- actions/cache@v3: The caching action that stores and retrieves files between workflow runs.
- path: ~/.m2/repository: The Maven local repository to cache.
- key: A unique key based on OS and the hash of pom.xml files; rebuilds cache when dependencies change.
- restore-keys: Fallback keys to try if the exact key is not found (helps populate cache quickly on the next run).

Optional extension for Gradle users:
```yaml
- name: Cache Gradle
  if: fileExists('gradle/wrapper/gradle-wrapper.properties')
  uses: actions/cache@v3
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper/dists
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/gradle-wrapper.properties') }}
    restore-keys: |
      ${{ runner.os }}-gradle-
```

### Line-by-line explanation
- if: fileExists('gradle/wrapper/gradle-wrapper.properties'): Applies only if Gradle is used.
- path: ~/.gradle/caches and ~/.gradle/wrapper/dists: Cache Gradle caches and wrapper distributions.
- key: Combines OS and Gradle wrapper properties to invalidate cache when wrapper config changes.
- This reduces re-downloads of Gradle dependencies and distributions across runs.

## 4. Testing, packaging, and artifact management

A production-ready pipeline tests thoroughly, packages artifacts, and stores them for deployment. This example includes unit tests, packaging into a JAR, and uploading the artifact for deployment steps or release processes.

```yaml
# .github/workflows/java-ci-test-package.yml
name: Java CI: Test and Package
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test-and-package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Cache Maven
        uses: actions/cache@v3
        with:
          path: |
            ~/.m2/repository
            ~/.m2/settings.xml
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - name: Run unit tests
        run: mvn -B -DskipTests=false test

      - name: Package
        run: mvn -B package -DskipTests

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: jar-artifact
          path: target/*.jar

      - name: Create release note (tag)
        if: startsWith(github.ref, 'refs/tags/')
        run: echo "Release: ${GITHUB_REF}"
```

### Line-by-line explanation
- Upload artifact: Stores the packaged JAR so downstream deployment jobs or release processes can consume it.
- on: The workflow triggers on pushes to main and on PRs; while the release step only fires if a tag is created.
- if: startsWith(github.ref, 'refs/tags/'): Conditional execution for tag-based releases; useful for automating releases.

## 5. Protecting secrets and promoting to environments

 deployment to staging/production requires secure handling of credentials and a controlled promotion flow. This example shows using repository secrets and an SSH-based deployment to a staging server. It also demonstrates pulling the artifact from the workflow run for deployment.

```yaml
# .github/workflows/java-ci-deploy-staging.yml
name: Deploy to staging
on:
  push:
    branches: [ main ]
jobs:
  deploy-staging:
    needs: [test-and-package]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: jar-artifact

      - name: Deploy to staging via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            mkdir -p /opt/myapp
            cp jar-artifact/*.jar /opt/myapp/myapp.jar
            # Example restart command; adapt to your service manager
            systemctl restart myapp
```

### Line-by-line explanation
- environment: staging: Marks the deployment as targeting the staging environment, enabling environment protections and approvals if configured in GitHub.
- actions/download-artifact@v3: Retrieves the previously uploaded artifact (the JAR) for deployment.
- appleboy/ssh-action@master: SSH-based deployment action to push the artifact to a remote server and run a deployment script.
- host, username, key: Pulls credentials from repository secrets to avoid hard-coding sensitive data.
- script: A shell sequence to copy the artifact and restart the service on the staging server.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfalls and how to fix them are common when starting with CI/CD. See below for practical, side-by-side examples.

- Pitfall 1: Exposing secrets in code
  - Bad:
    ```yaml
    - name: Deploy with credentials in code
      run: |
        export USER=admin
        export PASS=supersecret
        curl -u $USER:$PASS https://example.com/deploy
    ```
  - Good:
    ```yaml
    - name: Deploy using secrets
      env:
        DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        DEPLOY_PASS: ${{ secrets.DEPLOY_PASS }}
      run: |
        curl -u "$DEPLOY_USER:$DEPLOY_PASS" https://example.com/deploy
    ```
  - Explanation: Secrets must be provided via GitHub Secrets (or CI secret store). Avoid embedding credentials directly in workflow files to prevent leakage in logs or VCS history.

- Pitfall 2: Not pinning actions versions
  - Bad:
    ```yaml
    - uses: actions/checkout@latest
    ```
  - Good:
    ```yaml
    - uses: actions/checkout@v4
    ```
  - Explanation: Pinning action versions prevents accidental breaking changes when a new, incompatible version is released. Pin to a known major/minor version and update deliberately.

- Pitfall 3: Skipping or not caching dependencies
  - Bad:
    ```yaml
    - name: Build
      run: mvn -B test
    ```
  - Good:
    ```yaml
    - name: Cache Maven
      uses: actions/cache@v3
      with:
        path: ~/.m2/repository
        key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
        restore-keys: |
          ${{ runner.os }}-maven-
    - name: Build
      run: mvn -B -DskipTests=false test
    ```
  - Explanation: Caching dependencies drastically reduces build time. Without caching, every CI run must re-download dependencies, increasing latency and resource use.

- Pitfall 4: Running integration/deployment steps against production-like resources in CI
  - Bad:
    ```yaml
    - name: Deploy to prod from CI
      run: |
        ssh prodserver 'deploy_script.sh'
    ```
  - Good:
    ```yaml
    - name: Deploy to staging first
      run: |
        ssh stagingserver 'deploy_script.sh'
    ```
  - Explanation: Always promote through staging first. Use isolated test and staging environments, and gate promotions behind reviews, feature flags, or canaries.

## Y. Why This Matters In Real Systems

- Predictability and repeatability: CI/CD pipelines ensure every build is performed the same way, reducing drift between environments.
- Faster feedback: Developers get immediate signals about regressions, integration issues, and dependency conflicts.
- Safer deployments: Automated packaging, versioning, and artifact management enable controlled promotions to staging and production.
- Security and compliance: Secrets are stored securely, access to deployment targets is controlled, and audit trails exist for releases.
- Reliability at scale: Caching, distributed runners, and matrix builds help maintain throughput as the team and product grow.
- Observability: Integrated tests and health checks give you early indicators of system health, enabling proactive reliability engineering.

## Z. Study Questions — 5 recall questions

1. What GitHub Actions feature allows you to run a workflow on multiple Java versions in parallel?
2. How do you cache Maven dependencies in a GitHub Actions workflow, and why is it important?
3. What is the difference between actions/setup-java@v4 with different java-version values and using a matrix?
4. How can you securely deploy artifacts to a staging environment without exposing credentials in the workflow?
5. Why is it important to pin action versions rather than using latest, and what’s a safe strategy for upgrading them?

## Exercise

Goal: Build a small Java backend project and implement a complete CI/CD pipeline with Maven, caching, and staging deployment. You’ll deliver a minimal working example and a GitHub Actions workflow that ties everything together.

Part A — Create a minimal Java Maven project
- Create a Maven project with Spring Boot (or a simple Java app if you prefer). Include:
  - pom.xml with dependencies for spring-boot-starter-web and spring-boot-starter-test (or equivalent test framework).
  - A simple REST controller that responds with “OK” on GET /health.
  - A basic unit test for the health endpoint.

Code snippets (you can adapt to your preferred structure):

- pom.xml
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>healthcheck</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>healthcheck</name>
  <packaging>jar</packaging>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.1.2</version>
    <relativePath/> <!-- lookup parent from repository -->
  </parent>

  <properties>
    <java.version>17</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

- HealthController.java
```java
package com.example.healthcheck;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class HealthController {

    public static void main(String[] args) {
        SpringApplication.run(HealthController.class, args);
    }

    @GetMapping("/health")
    public String health() {
        return "OK";
    }
}
```

- HealthControllerTests.java
```java
package com.example.healthcheck;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(content().string("OK"));
    }
}
```

Part B — Add a GitHub Actions workflow
- Create the Maven-based workflow that builds, tests, and packages the app, with a simple artifact upload and a staging deployment step (dry-run or simulated) using secrets.

- .github/workflows/java-ci-maven.yml
```yaml
name: Java CI with Maven for HealthCheck

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-test-package:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java-version: [ '17', '21' ]
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK ${{ matrix.java-version }}
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: ${{ matrix.java-version }}

      - name: Cache Maven
        uses: actions/cache@v3
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}-${{ matrix.java-version }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - name: Run tests
        run: mvn -B -DskipTests=false test

      - name: Package jar
        run: mvn -B package -DskipTests

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: healthcheck-jar
          path: target/*.jar

  deploy-staging:
    needs: build-test-package
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: healthcheck-jar

      - name: Deploy to staging (simulated)
        if: ${{ secrets.DEPLOY_SIMULATED != 'false' }}
        run: |
          echo "Simulated deployment: would transfer jar to staging server"
          ls -l target/*.jar || true
```

Notes for Part B:
- This exercise uses a simulated deployment step for safety; in real usage, you’d securely deploy to a staging environment (e.g., via SSH, Kubernetes, or a cloud-specific deployment action) using secrets like SPNs, SSH keys, or cloud credentials.
- You can add a real deployment step later (e.g., using a container registry, Kubernetes manifests, or an SSH-based deploy script) once you’ve validated the staging path.

What you should deliver
- A working Maven Java project with a functional /health endpoint.
- A GitHub repository containing two workflows:
  - Java CI with Maven (build/tests/package) and artifact upload.
  - Deploy to staging (as a safe demonstration) that uses artifacts from the CI workflow.
- Clear instructions for running locally and for triggering the workflows via GitHub.

This structured approach gives you practical exposure to the core techniques of GitHub Actions for Java backends: dependency caching, multi-JDK testing, packaging, artifact management, and secure deployment to environments. It’s the foundation you’ll need to scale CI/CD across teams and services in real-world systems.