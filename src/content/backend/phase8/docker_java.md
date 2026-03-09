# Docker — Containers & docker-compose in Java Backend

In modern backend workflows, containers give you reproducible environments, predictable dependencies, and fast, isolated deployments. Docker makes it easy to package a Java application with its runtime, system libraries, and config, so you can run the same build artifact anywhere—from your laptop to CI to production clusters. This lesson walks you through containerizing a Java backend, using multi-stage Docker builds, and coordinating services with docker-compose. You’ll learn practical patterns that reduce image sizes, improve security, and simplify deployment pipelines.

## 1. Understanding Containers, Images, and Java Context

- Containers vs images: Images are read-only templates; containers are runnable instances created from images.
- Java considerations: Use a slim JRE/JDK base image, prefer multi-stage builds to minimize final image size, and run as a non-root user for security.
- Typical workflow: compile your Java app into a JAR, containerize the JAR with a minimal runtime, and run it with proper port mapping and environment configuration.

Code example: a minimal Dockerfile skeleton illustrating base structure for a Java app
```dockerfile
# Minimal example illustrating base structure
FROM openjdk:11-jre-slim
WORKDIR /app
COPY target/myapp.jar app.jar
CMD ["java","-jar","app.jar"]
```
### Line-by-line explanation
- FROM openjdk:11-jre-slim: Use a slim OpenJDK 11 runtime as the base image to minimize size.
- WORKDIR /app: Set the working directory inside the container to /app.
- COPY target/myapp.jar app.jar: Copy the built JAR from your build output into the container.
- CMD ["java","-jar","app.jar"]: Run the JAR when the container starts.

## 2. Building a Java App into a Docker Image with a Multi-Stage Build

Multi-stage builds let you compile the app in a heavier image (with Maven) and copy only the compiled artifact into a lighter runtime image, reducing the final size and surface area.

Code blocks: Java app source, Maven POM, and a multi-stage Dockerfile

App.java
```java
package com.example.app;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class App {
  public static void main(String[] args) throws Exception {
     int port = Integer.parseInt(System.getenv().getOrDefault("APP_PORT","8080"));
     String appName = System.getenv().getOrDefault("APP_NAME","DockerJavaApp");
     HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
     server.createContext("/health", exchange -> {
        String response = "{\"status\":\"UP\"}";
        exchange.sendResponseHeaders(200, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
           os.write(response.getBytes());
        }
     });
     server.createContext("/", exchange -> {
        String response = "Hello from " + appName + " on port " + port;
        exchange.sendResponseHeaders(200, response.getBytes().length);
        try (OutputStream os = exchange.getResponseBody()) {
           os.write(response.getBytes());
        }
     });
     server.setExecutor(null);
     System.out.println("Starting " + appName + " on port " + port);
     server.start();
  }
}
```

pom.xml
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>docker-java-app</artifactId>
  <version>0.1.0</version>
  <properties>
    <maven.compiler.source>11</maven.compiler.source>
    <maven.compiler.target>11</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <build>
    <finalName>docker-java-app</finalName>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.9.0</version>
        <configuration>
          <source>${maven.compiler.source}</source>
          <target>${maven.compiler.target}</target>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-jar-plugin</artifactId>
        <version>3.2.0</version>
        <configuration>
          <archive>
            <manifest>
              <addClasspath>false</addClasspath>
              <Main-Class>com.example.app.App</Main-Class>
            </manifest>
          </archive>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

Dockerfile (multi-stage)
```dockerfile
# Builder stage: compile the Java app
FROM maven:3.8.7-eclipse-temurin-11 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -q -DskipTests package

# Runtime stage: smaller, only the JRE
FROM openjdk:11-jre-slim
WORKDIR /app
COPY --from=builder /build/target/docker-java-app-0.1.0.jar app.jar
EXPOSE 8080
ENV APP_NAME docker-java-app
ENTRYPOINT ["java","-jar","app.jar"]
```

### Line-by-line explanation
- Builder stage
  - FROM maven:3.8.7-eclipse-temurin-11 AS builder: Use a Maven-enabled image to compile the app.
  - WORKDIR /build: Working directory for build artifacts.
  - COPY pom.xml . and COPY src ./src: Bring in build config and source.
  - RUN mvn -B -q -DskipTests package: Build the app in quiet mode, producing a JAR.
- Runtime stage
  - FROM openjdk:11-jre-slim: Lightweight JRE for running the app.
  - WORKDIR /app: Set the runtime working directory.
  - COPY --from=builder /build/target/docker-java-app-0.1.0.jar app.jar: Copy the built JAR from the builder stage.
  - EXPOSE 8080: Document that the app listens on port 8080.
  - ENV APP_NAME docker-java-app: Default environment variable for display.
  - ENTRYPOINT ["java","-jar","app.jar"]: Run the JAR when the container starts.

## 3. Running Containers:docker run Basics for a Java Service

Once you have a built image (from the previous step), you can run it locally, expose ports, and pass environment configuration.

Code blocks: common docker run commands

```bash
# Build the image
docker build -t docker-java-app .

# Run the container locally with port mapping and environment vars
docker run --rm -p 8080:8080 -e APP_NAME=MyDockerApp -e APP_PORT=8080 --name docker-java-app docker-java-app

# Basic health and functional checks
curl -s http://localhost:8080/health
curl -s http://localhost:8080/
```

### Line-by-line explanation
- docker build -t docker-java-app .: Build an image named docker-java-app from the Dockerfile in the current directory.
- docker run --rm -p 8080:8080 -e APP_NAME=MyDockerApp -e APP_PORT=8080 --name docker-java-app docker-java-app: Run the container, remove it on exit, map host port 8080 to container port 8080, set environment variables, and give it a friendly name.
- curl commands: Verify the health endpoint and the root endpoint response.

## 4. docker-compose: Orchestrating a Simple Multi-Service Java App

docker-compose lets you define and run multi-container applications. Below is a simple setup with an app service and a Redis service to illustrate multi-service coordination and networking.

docker-compose.yml
```yaml
version: '3.9'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      APP_NAME: DockerComposeApp
      APP_PORT: 8080
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
volumes:
  redis-data:
```

### Line-by-line explanation
- version: '3.9': Use Compose file format 3.9 for compatibility with modern Docker.
- services.app: Defines the Java application service.
  - build: .: Build the image from the Dockerfile in the current directory.
  - ports: Map host port 8080 to container port 8080.
  - environment: Set APP_NAME and APP_PORT for runtime configuration.
  - depends_on: Ensure Redis starts before the app ( networking is automatic between services ).
- services.redis: Simple Redis service to demonstrate multi-service orchestration.
  - image: redis:7-alpine: Lightweight Redis image.
  - ports: Expose Redis port 6379 for local testing.
  - volumes: Persist Redis data to a named volume.
- volumes.redis-data: Named volume for Redis data persistence.

Commands to run
```bash
# Start the multi-service setup
docker-compose up -d

# Check logs and health
docker-compose logs app
curl -s http://localhost:8080/health

# Tear down
docker-compose down -v
```

## 5. Common Best Practices — Java in Docker (Security, Size, Operations)

- Use multi-stage builds to minimize final image size.
- Prefer a minimal runtime base image (e.g., openjdk:11-jre-slim) and drop root privileges in the final image.
- Run the container as a non-root user for security.
- Expose only necessary ports and implement a HEALTHCHECK for container health visibility.
- Provide sensible defaults via environment variables; document required ones.
- Keep dependencies out of the final image; rely on artifacts produced during the build stage.
- Use non-blocking streams and avoid long-lived processes that ignore termination signals; ensure JVM handles SIGTERM gracefully (Java handles it, but you should rely on proper container termination).

Code block: Dockerfile snippet demonstrating best practices (non-root user and healthcheck)
```dockerfile
FROM openjdk:11-jre-slim
# Create a non-root user and switch to it
RUN groupadd -r app && useradd -r -g app app
WORKDIR /home/app
COPY --from=builder /build/target/docker-java-app-0.1.0.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fs http://localhost:8080/health || exit 1
CMD ["java","-jar","app.jar"]
```

### Line-by-line explanation
- RUN groupadd -r app && useradd -r -g app app: Create a dedicated, non-root user.
- WORKDIR /home/app: Place the app in a user-owned directory.
- COPY --from=builder ...: Bring in the built artifact from the builder stage.
- USER app: Run the container as the non-root user.
- EXPOSE 8080: Document the port the app listens on.
- HEALTHCHECK ...: Periodically verify the app is healthy; Docker can take action if unhealthy.

Note: The builder stage reference in this snippet assumes a preceding builder stage in the same Dockerfile. If you’re isolating to a final-stage snippet, ensure the built artifact is available at the cited path.

## 6. Why This Matters In Real Systems — Production Context

- Reproducible environments: Docker ensures “works on my machine” aligns with CI/CD and prod by shipping the exact runtime environment.
- Faster deployments and rollbacks: Atomic image versions enable quick deployments and safe rollbacks if something breaks.
- Resource isolation and scaling: Containers isolate CPU/memory usage and can be scaled horizontally with orchestration tools (Kubernetes, Docker Swarm).
- Consistent deployment pipelines: Docker images provide a consistent artifact across development, CI, and production.
- Observability and health: Embedded HEALTHCHECK and proper logging allow orchestrators to monitor and restart unhealthy containers automatically.
- Security posture: Running as non-root, keeping images small, and scanning dependencies reduces the attack surface.

## 7. Study Questions — 5 Recall Questions

1. What is the difference between a Docker image and a running container?
2. Why are multi-stage builds especially beneficial for Java applications?
3. How does docker-compose help you coordinate an app and its dependencies (e.g., a DB or cache) in development?
4. How would you implement a container health check for a Java HTTP service?
5. List two security improvements you should apply when containerizing a Java application.

## 8. Exercise — Practical Multi-Part Coding Challenge

Goal: Dockerize a small Java backend, run it with docker-compose, and verify basic observability and resilience.

Part A: Extend the Java app
- Add a new endpoint /version that returns a JSON payload with appName and version (read from an environment variable APP_VERSION, default 0.1.0).
- Update App.java to serve:
  - GET /version -> {"name": "DockerComposeApp", "version": "0.1.0"}
  - Keep existing /health and root routes.

Part B: Harden the Dockerfile
- Convert to a non-root user in the final image (if not already).
- Add a HEALTHCHECK that pings /health.
- Ensure the final image remains as small as possible.

Part C: Add a docker-compose service and environment
- Extend docker-compose.yml with a separate service named "db" (you can reuse Redis or a mock DB container). Make the app read a DATABASE_URL environment variable (default to a fake URL) and print it on startup to demonstrate configuration flow.
- Demonstrate a SCALE operation by describing how you would run two app instances with docker-compose or using Docker Compose with --scale.

Part D: Local validation plan
- Provide commands to build, run, and test:
  - Build and run the app via docker-compose up -d
  - Call /health and /version
  - Demonstrate scaling to 2 instances (conceptual if you’re not running it)
  - Stop and clean up with docker-compose down -v

Part E: Troubleshooting checklist
- If /health returns 500, list common causes and how you would diagnose.
- If containers fail to start, outline a quick diagnostic workflow (logs, environment, port conflicts).

Files you’ll modify/add (summary)
- src/main/java/com/example/app/App.java (extend for /version)
- pom.xml (unchanged or minor updates if needed)
- Dockerfile (upgrade to non-root, add HEALTHCHECK)
- docker-compose.yml (add db service and environment wiring)
- Optional: README.md with your run steps

This lesson equips you with practical patterns for building, containerizing, and orchestrating Java-based backends in real-world environments. You’ll be able to iterate quickly, test locally, and seed production-ready deployment strategies.