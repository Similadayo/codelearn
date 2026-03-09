# Cloud Deployment: Railway, Render & AWS EC2 with Java Backend

In this lesson, you’ll learn how to deploy a Java backend to three popular cloud deployment targets: Railway, Render, and AWS EC2. You’ll see how to containerize a Spring Boot app, how to express platform-specific configuration, and how to run and expose services in production. Understanding these patterns helps you deliver reliable services with repeatable deployments, irrespective of the hosting provider.

## 1. Railway Deployment

Railway makes it easy to spin up services with minimal boilerplate. For a Java backend, you typically containerize your app with Docker, provide a start command, and expose the port via environment variables. The example below walks through a minimal Spring Boot app, its Maven config, a Dockerfile, and a Railway config file.

### 1.a. Java Spring Boot App (Application.java)

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    @GetMapping("/greet")
    public String greet() {
        String name = System.getenv().getOrDefault("NAME", "World");
        return "Hello, " + name + "!";
    }
}
```

### 1.b. Maven Build File (pom.xml)

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>jar</packaging>

  <properties>
    <java.version>17</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.1.2</version>
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

### 1.c. Dockerfile

```dockerfile
FROM openjdk:17-jdk-slim
VOLUME /tmp
ARG JAR_FILE=target/demo-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

### 1.d. Railway Configuration (railway.toml)

```toml
[build]
dockerfile = "./Dockerfile"

[deploy]
startCommand = "java -jar /app.jar"

[env]
PORT = "8080"
NAME = "Railway"
```

### 1.e. Line-by-line Explanations

- Application.java
  - Line 1-3: Package and imports for Spring Boot and Web support.
  - Line 6: Main class annotation to enable Spring Boot auto-configuration.
  - Line 11: Main method to start the Spring application.
  - Line 14-16: Expose a health check endpoint at /health.
  - Line 18-22: Expose a /greet endpoint that reads NAME from the environment (or defaults to "World").

- pom.xml
  - Lines 1-8: Basic POM structure and Maven coordinates.
  - Lines 14-19: Java version and Spring Web dependency.
  - Lines 22-29: Spring Boot Maven plugin to package the app as an executable JAR.
  - These settings ensure a portable, self-contained JAR suitable for Docker.

- Dockerfile
  - Line 1: Base image with JDK 17.
  - Line 2: Create a writable /tmp volume (optional for Spring Boot tmp data).
  - Line 3: Build argument JAR_FILE points to the built artifact.
  - Line 4: Copy the JAR into the container as app.jar.
  - Line 5: Run the JAR when the container starts.

- railway.toml
  - [build] Dockerfile reference ensures Railway builds from Dockerfile.
  - [deploy] startCommand tells Railway how to start the app in the container.
  - [env] PORT and NAME demonstrate how to supply environment vars; Railway injects these into the container.

## 2. Render Deployment

Render supports Docker-based deployments through a render.yaml file and a Dockerfile. This section demonstrates an equivalent deployment pattern for the same Spring Boot app on Render.

### 2.a. Dockerfile (same as Railway, for consistency)

```dockerfile
FROM openjdk:17-jdk-slim
VOLUME /tmp
ARG JAR_FILE=target/demo-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

### 2.b. Render Configuration (render.yaml)

```yaml
services:
  - type: web
    name: java-backend
    dockerfilePath: Dockerfile
    envs:
      - key: PORT
        value: "8080"
      - key: SPRING_PROFILES_ACTIVE
        value: prod
```

### 2.c. Optional: Application Properties for Render

```properties
# src/main/resources/application.properties
server.port=${PORT:8080}
spring.profiles.active=${SPRING_PROFILES_ACTIVE:prod}
```

### 2.d. Line-by-line Explanations

- Dockerfile
  - See Railway explanation above for the same rationale.

- render.yaml
  - services: A list of services Render should deploy.
  - type: web: This is a HTTP web service.
  - name: java-backend: Human-friendly identifier.
  - dockerfilePath: Dockerfile location to build the image.
  - envs: Environment variables passed to the container. PORT is used to configure the listening port, SPRING_PROFILES_ACTIVE selects the profile.

- application.properties
  - server.port: Reads the PORT environment variable, defaulting to 8080 if not set.
  - spring.profiles.active: Activates the prod profile by default, which can be overridden via env.

## 3. AWS EC2 Deployment

AWS EC2 gives you raw control over the VM. You can deploy a Java app either by manually installing Java and running the JAR, or by deploying a Docker container on the instance. The examples below illustrate both approaches, plus a simple Nginx reverse proxy to expose the app publicly.

### 3.a. Prerequisites (EC2)

- A running EC2 instance (Ubuntu or Amazon Linux 2) with a security group allowing inbound traffic on port 80 (HTTP) and 8080 (app).
- SSH access to the instance.
- Optional: a domain name and TLS certificates if you want HTTPS.

### 3.b. Approach A: Manual Java Deployment on EC2

#### 3.b.1. start-backend.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Install Java 17 if not installed (on Ubuntu)
# sudo apt-get update && sudo apt-get install -y openjdk-17-jdk

# Prepare app directory
APP_DIR=/home/ubuntu/app
mkdir -p "$APP_DIR"
cat <<'JAR' > "$APP_DIR/demo-0.0.1-SNAPSHOT.jar"
# place your built JAR binary here or upload via scp
JAR

# Run the app
cd "$APP_DIR"
nohup java -jar demo-0.0.1-SNAPSHOT.jar > /var/log/app.log 2>&1 &
```

#### 3.b.2. systemd Service (demo-backend.service)

```ini
[Unit]
Description=Java Backend Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/app
ExecStart=/usr/bin/java -jar /home/ubuntu/app/demo-0.0.1-SNAPSHOT.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 3.b.3. Start and Enable

```bash
sudo mv demo-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable demo-backend.service
sudo systemctl start demo-backend.service
```

### 3.c. Approach B: Docker Deployment on EC2

#### 3.c.1. Dockerfile (same as earlier)

```dockerfile
FROM openjdk:17-jdk-slim
VOLUME /tmp
ARG JAR_FILE=target/demo-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

#### 3.c.2. Build and Run on EC2

```bash
# On your local machine
docker build -t demo:0.0.1 .

# Copy the image to EC2 or push to a registry (e.g., Docker Hub, ECR)
# Example: push to Docker Hub
docker tag demo:0.0.1 yourdockerhubuser/demo:0.0.1
docker push yourdockerhubuser/demo:0.0.1

# On the EC2 instance
docker pull yourdockerhubuser/demo:0.0.1
docker run -d -p 8080:8080 --name java-backend yourdockerhubuser/demo:0.0.1
```

### 3.d. Optional: Nginx Reverse Proxy (for port 80)

#### 3.d.1. Nginx site config

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

#### 3.d.2. Nginx Setup Commands

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo mv /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
# Write the new config above to /etc/nginx/sites-available/default
sudo systemctl reload nginx
```

### 3.e. Line-by-line Explanations

- start-backend.sh
  - Shebang and set -euo pipefail ensure robust script behavior.
  - Optional Java installation lines show how to install JDK 17 if needed.
  - Creates app directory and (conceptually) places the JAR there.
  - Runs the JAR in the background, logging to /var/log/app.log.

- systemd service
  - [Unit]: Description and ordering, ensuring the service starts after networking is up.
  - [Service]: Executes the Java JAR as user 'ubuntu', restarts on failure.
  - [Install]: Enables the service to start at boot.

- Dockerfile
  - Same rationale as earlier: containerize the Java app for repeatable deployments.

- Docker run on EC2
  - Builds/publishes the image, then runs the container exposing port 8080 to host 8080.
  - This approach isolates the Java process in a container on a minimal VM footprint.

- Nginx config
  - Proxies external HTTP traffic on port 80 to the local 8080 where the Java app runs.
  - Sets appropriate headers to preserve the original host and client IP.

## X. Common Beginner Mistakes

- Bad vs Good: Port binding in Spring Boot
  - Bad:
    - server.port=8080
  - Good:
    - server.port=${PORT:8080}
- Bad vs Good: Binding to loopback vs external interfaces in Docker
  - Bad:
    - server.address=127.0.0.1
  - Good:
    - server.address=0.0.0.0
- Bad vs Good: Hard-coding secrets or DB URLs
  - Bad:
    - String dbUrl = "jdbc:postgresql://localhost:5432/mydb";
  - Good:
    - String dbUrl = System.getenv("DB_URL");
- Bad vs Good: Docker JAR reference
  - Bad:
    - ARG JAR_FILE=target/*.jar
      COPY ${JAR_FILE} app.jar
  - Good:
    - Use a concrete path after you run mvn package, e.g., target/demo-0.0.1-SNAPSHOT.jar, and ensure the artifact exists in the build output.
- Bad vs Good: Port exposure with container orchestration
  - Bad:
    - Exposing only internal ports without mapping (e.g., docker run without -p)
  - Good:
    - docker run -d -p 8080:8080 ...
- Bad vs Good: Not using environment-based configuration
  - Bad:
    - spring.profiles.active=prod hard-coded in code or config
  - Good:
    - Use environment-driven profiles and defaults (SPRING_PROFILES_ACTIVE, PORT, etc.)

## Y. Why This Matters In Real Systems

- Repeatable deployments: Docker images and platform-specific config enable identical deployments from dev to prod.
- Portability: You can move between Railway, Render, or EC2 with minimal changes to code; only config files differ.
- Production readiness: Environment-based config, health checks, and proper port binding are essential for load balancers and auto-scaling groups.
- Observability: Combine logs from containerized apps with platform telemetry; ensure /health is fast and reliable for liveness checks.
- Security and secrets: Never bake credentials in code; prefer environment variables, secret managers, or platform-specific secret stores.
- Operability: For EC2 and other IaaS, you should consider blue/green or canary deployments and automated rollbacks. For PaaS (Railway/Render), leverage restarts, health checks, and graceful deploys provided by the platform.

## Z. Study Questions

1) What is the purpose of binding the Spring Boot app to 0.0.0.0 in a Docker container?
2) How does a platform-specific config file (railway.toml or render.yaml) influence how your app starts?
3) Why is it important to use the PORT environment variable for cloud deployments?
4) Compare and contrast deployment on Railway vs Render for a Java backend. What are key similarities and differences?
5) Outline a simple, production-ready EC2 deployment workflow for a Java app using Docker, including security and observability considerations.

## Exercise

Part A: Create a minimal Java Spring Boot backend
- Implement a Spring Boot application with two endpoints:
  - GET /health returns "OK".
  - GET /greet returns "Hello, <NAME>!" using NAME from the environment or "World" by default.
- Ensure the app listens on a port provided by the PORT environment variable (default to 8080).

Part B: Containerize the app
- Write a Dockerfile to containerize the app (as shown in the examples).
- Build the image locally: mvn clean package -DskipTests, then docker build -t yourname/demo:0.0.1 .

Part C: Deploy to Railway (hands-on)
- Create railway.toml with dockerfile and startCommand, plus PORT and NAME env vars.
- Push your Docker image to a registry if required, and configure Railway to deploy from Dockerfile.
- Verify the app responds at the provided URL (curl http://your-railway-service/health).

Part D: Deploy to Render (hands-on)
- Create render.yaml that references your Dockerfile and sets PORT=8080 and SPRING_PROFILES_ACTIVE=prod.
- Ensure the service starts correctly on Render and exposes a public URL.
- Verify health and greet endpoints via the public URL.

Part E: Deploy to AWS EC2 (hands-on)
- Option 1 (Docker-based): Launch an Ubuntu/Amazon Linux instance, install Docker, push/build your image, and run a container mapping port 8080 to the host.
- Option 2 (Manual Java): Install OpenJDK 17, upload the built JAR, and run with a systemd service (as shown).
- Optionally configure Nginx as a reverse proxy from port 80 to 8080, and set up a basic firewall rule to allow 80/8080.

Deliverables
- The Spring Boot app source (Application.java) with endpoints /health and /greet.
- pom.xml for building the app.
- Dockerfile for containerization.
- Railway configuration (railway.toml) or a rendered equivalent.
- render.yaml and application.properties snippet if using Render.
- If using EC2, a sample systemd service file and a minimal Nginx config, or a Docker-based run script.

Notes
- Always test locally first with a server port you can map to a local browser (e.g., 8080).
- When moving to cloud, rely on environment variables for configuration and avoid hard-coded values.
- For real production deployments, consider adding health checks, metrics, logging, and secret management as next steps.