# Track: Backend Engineering — Phase 9 — System Design & Scalability

# Topic: Load Balancing & Horizontal Scaling (Java)

Load balancing and horizontal scaling are essential for building robust, high-traffic backends. In Java ecosystems, you typically design services to be stateless, deploy them in containers or clusters, and rely on load balancers to distribute traffic, perform health checks, and enable seamless scaling. This lesson covers core concepts, practical Java patterns, and real-world configurations you’ll use in production.

## 1. Fundamentals of Load Balancing and Statelessness

Load balancing distributes client requests across multiple backend instances to improve throughput, resilience, and latency. Stateless services simplify scaling because any instance can handle any request, and no client session is tied to a specific server. Key concepts include Layer 4 vs Layer 7 load balancing, health checks, scheduling algorithms (round robin, least connections, IP-hash), and failure handling.

Code: Minimal Spring Boot app (stateless endpoints) and a basic Nginx load balancer configuration.

```java
// File: src/main/java/com/example/loadbalancer/DemoApplication.java
package com.example.loadbalancer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
  public static void main(String[] args) {
    SpringApplication.run(DemoApplication.class, args);
  }
}
```

```java
// File: src/main/java/com/example/loadbalancer/HelloController.java
package com.example.loadbalancer;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @GetMapping("/data")
  public String data() {
    // Stateless: no per-request server state is stored here
    return "Hello from backend!";
  }

  @GetMapping("/health")
  public String health() {
    // Simple liveness endpoint; ensure this is fast and independent of external dependencies
    return "OK";
  }
}
```

```dockerfile
# File: Dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
```

```nginx
# File: nginx.conf
upstream backend {
  # Round-robin by default
  server backend-1:8080;
  server backend-2:8080;
  server backend-3:8080;
}

server {
  listen 80;

  location /data {
    proxy_pass http://backend/data;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
  }

  location /health {
    proxy_pass http://backend/health;
  }
}
```

### Line-by-line explanation

- DemoApplication.java
  - Line 1-3: Package and imports for Spring Boot application.
  - Line 6: Annotates the class as a Spring Boot application, enabling auto-configuration.
  - Line 9: Entry point of the application; delegates to Spring Boot to bootstrap the app.
- HelloController.java
  - Line 1-3: Package declaration and necessary Spring web imports.
  - Line 6: Annotates the class as a REST controller to expose endpoints.
  - @GetMapping("/data"): Handles GET /data; designed to be stateless and fast.
  - @GetMapping("/health"): Handles GET /health; cheap readiness check.
- Dockerfile
  - FROM: Uses a minimal JRE image suitable for Spring Boot.
  - WORKDIR: Sets working directory inside the container.
  - COPY: Packages the built JAR into the image.
  - EXPOSE: Documents that the service listens on port 8080.
  - ENTRYPOINT: Runs the Java JAR when the container starts.
- nginx.conf
  - upstream backend: Defines a group of backend servers to load balance across.
  - server blocks: Listen on port 80 and proxy requests to the backend group.
  - /data location: Proxies data requests to the backend group; preserves headers.
  - /health location: Proxies health checks to the backend group.

## 2. Horizontal Scaling Patterns in Java Microservices

Horizontal scaling means running more identical instances to handle load. In production, you typically deploy in containers and orchestrate with Kubernetes. This section demonstrates stateless deployment patterns and how to expose a scalable service via a load balancer.

Code: Kubernetes Deployment + Service (and optional Horizontal Pod Autoscaler), plus a simple local Docker-Compose pattern for development.

```yaml
# File: kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loadbalancer-demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: loadbalancer-demo
  template:
    metadata:
      labels:
        app: loadbalancer-demo
    spec:
      containers:
      - name: app
        image: your-repo/loadbalancer-demo:latest
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
```

```yaml
# File: kubernetes/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: loadbalancer-demo
spec:
  type: LoadBalancer
  selector:
    app: loadbalancer-demo
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# File: kubernetes/hpa.yaml (optional autoscaling)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loadbalancer-demo-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loadbalancer-demo
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

### Line-by-line explanation

- deployment.yaml
  - apiVersion/kind: Declares this is a Kubernetes Deployment.
  - replicas: Sets initial pod count to 3 for horizontal scale-out.
  - selector/matchLabels: Ties the Deployment to pods labeled app=loadbalancer-demo.
  - template.metadata.labels: Pods get the same label for matching.
  - containers.image: The container image to deploy for the pods.
  - ports.containerPort: Exposes port 8080 inside the pod.
  - readinessProbe: Checks if /health is responsive before routing traffic to a pod.
  - livenessProbe: Periodically checks /health to confirm a pod is alive; Kubernetes restarts if failed.

- service.yaml
  - kind: Service of type LoadBalancer exposes the app to external traffic.
  - selector: Routes traffic to pods labeled app=loadbalancer-demo.
  - ports: Maps external port 80 to pod port 8080.

- hpa.yaml
  - kind: HorizontalPodAutoscaler automatically scales pods based on CPU utilization.
  - scaleTargetRef: Points to the Deployment to scale.
  - minReplicas/maxReplicas: Boundaries for scaling.
  - metrics: Uses CPU utilization as the scaling signal.

## 3. Health Checks, Session Handling, and Idempotence

Health checks ensure only healthy pods receive traffic. Readiness probes gate traffic to healthy instances, while liveness probes recover from stuck states. Proper session handling avoids per-instance state that breaks horizontal scaling. Idempotence ensures repeated requests do not cause unintended side effects.

Code: Custom health/readiness endpoints, and an example of stateless vs stateful session handling.

```java
// File: src/main/java/com/example/loadbalancer/HealthController.java
package com.example.loadbalancer;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

  @GetMapping("/health")
  public Map<String, String> health() {
    // Liveness: should be fast and not depend on external services
    return Map.of("status", "UP", "timestamp", Instant.now().toString());
  }

  @GetMapping("/readiness")
  public Map<String, String> readiness() {
    // Readiness: checks dependencies (DBs, caches, etc.). Here we simulate readiness.
    boolean ready = true; // replace with actual checks
    return Map.of("ready", String.valueOf(ready));
  }
}
```

```nginx
# File: nginx-readiness.conf
upstream app_nodes {
  server loadbalancer-demo-1:8080;
  server loadbalancer-demo-2:8080;
  server loadbalancer-demo-3:8080;
}
server {
  listen 8080;

  location /health {
    proxy_pass http://app_nodes/health;
  }

  location /readiness {
    proxy_pass http://app_nodes/readiness;
  }

  location /data {
    proxy_pass http://app_nodes/data;
  }
}
```

```java
// File: src/main/java/com/example/loadbalancer/SessionController.java
package com.example.loadbalancer;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SessionController {

  // Bad: server-side in-memory session map (stateful; not scalable)
  // private static final Map<String, String> SESSIONS = new HashMap<>();

  // @PostMapping("/login") ... store session in SESSIONS

  // Good: Stateless JWT example (no server-side state)
  @GetMapping("/whoami")
  public String whoAmI(@RequestHeader("Authorization") String token) {
    // In a real app, validate JWT and return subject
    return "user-from-jwt";
  }
}
```

### Line-by-line explanation

- HealthController.java
  - health(): Returns a simple, fast status and timestamp. No external calls to databases or services.
  - readiness(): Returns readiness status; in real systems, you would query DB connections, caches, or other dependencies.

- nginx-readiness.conf
  - Upstream app_nodes: Defines the pool of backend pods reachable via DNS or service names.
  - /health and /readiness: Proxies health/ readiness endpoints to the upstream pool, enabling LB to consider pod health before routing traffic.
  - /data: Proxies data requests to the pool.

- SessionController.java
  - Session approach note: Demonstrates the difference between stateful (in-memory) vs stateless (JWT) session management.
  - whoAmI(): Placeholder for extracting user identity from a token; real implementation should verify and parse JWT.

## X. Common Beginner Mistakes

Pitfalls you’ll likely encounter when learning load balancing and horizontal scaling. Bad vs good patterns are shown side-by-side.

1) Pitfall: Relying on in-memory per-instance sessions
- Bad:
```java
public class SessionService {
  private static final Map<String, String> SESSIONS = new HashMap<>();
  public String login(String user) {
    String token = UUID.randomUUID().toString();
    SESSIONS.put(token, user);
    return token;
  }
}
```
- Good:
```java
// Stateless approach using JWT
public class JwtUtil {
  public static String createToken(String user) { /* sign and return JWT */ }
  public static String getSubject(String token) { /* verify and extract subject */ }
}
```

2) Pitfall: Assuming sticky sessions are required or always enabled
- Bad:
```nginx
# No session affinity; any request may land anywhere
upstream apps {
  server app-1:8080;
  server app-2:8080;
}
```
- Good:
```nginx
# In environments where sessions are needed, prefer externalized state or JWT
upstream apps {
  ip_hash;
  server app-1:8080;
  server app-2:8080;
}
```

3) Pitfall: Health checks that depend on external systems
- Bad:
```java
@GetMapping("/health")
public String health() {
  return db.ping() ? "UP" : "DOWN"; // fails if DB is temporarily unavailable
}
```
- Good:
```java
@GetMapping("/health")
public String health() {
  return "UP"; // cheap, non-blocking
}
@GetMapping("/readiness")
public String readiness() {
  // perform minimal dependency checks here (DB, cache)
  return "READY";
}
```

4) Pitfall: Neglecting idempotence and optimistic aborts
- Bad:
```java
@PostMapping("/increment")
public int increment() {
  counter++; // increments in-memory state; not shared
  return counter;
}
```
- Good:
```java
@PutMapping("/counter")
public ResponseEntity<Void> setCounter(@RequestParam int value) {
  // Persist to a shared store (DB/Redis) to ensure idempotence across pods
  redisTemplate.opsForValue().set("counter", value);
  return ResponseEntity.ok().build();
}
```

## Y. Why This Matters In Real Systems

- Reliability and uptime: Load balancing enables zero-downtime deployments and allows rolling updates without service interruption.
- Scalability: Horizontal scaling lets you meet demand by adding instances rather than upgrading a single machine.
- Fault isolation: If one instance fails, others continue serving traffic; LBs redirect traffic away from unhealthy pods.
- Real-world patterns: Stateless services, externalized state (Redis, distributed cache, JWT), and observability (metrics, traces, logs) are standard in production.
- Deployment strategies: Blue-green, canary, and rolling updates rely on proper health checks and load balancer configurations to minimize risk.

## Z. Study Questions

1) What is the difference between Layer 4 and Layer 7 load balancing, and when would you choose each in a Java backend?
2) Why is statelessness important for horizontal scaling, and what patterns can you use to handle user sessions across multiple instances?
3) How do readiness and liveness probes differ in Kubernetes, and how do they influence traffic routing during a deployment?
4) What is the role of a JWT in a stateless session design, and what security considerations must you address?
5) How do you approach autoscaling in Kubernetes, and what metrics are commonly used to trigger scaling?

## Exercise

Part A: Build a stateless Java microservice and containerize it

- Requirements:
  - Create a Spring Boot app with two endpoints:
    - GET /data: returns a simple JSON payload.
    - GET /health: fast liveness check.
  - Ensure the service is stateless (no per-instance session data).
  - Containerize the app with Docker.

Code: Spring Boot app (minimal)

```java
// File: src/main/java/com/example/exercise/ExerciseApplication.java
package com.example.exercise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ExerciseApplication {
  public static void main(String[] args) {
    SpringApplication.run(ExerciseApplication.class, args);
  }
}
```

```java
// File: src/main/java/com/example/exercise/ExerciseController.java
package com.example.exercise;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Instant;
import java.util.Map;

@RestController
public class ExerciseController {

  @GetMapping("/data")
  public Map<String, Object> data() {
    return Map.of(
      "service", "exercise-backend",
      "timestamp", Instant.now().toString(),
      "status", "OK"
    );
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }
}
```

```xml
<!-- File: pom.xml (dependency snippet) -->
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
</dependencies>
```

```dockerfile
# File: ExerciseDockerfile
FROM eclipse-temurin:17-jre-alpine
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
```

Part B: Deploy with Kubernetes (stateless deployment)

- Create a Deployment and Service to expose the app in a cluster.

```yaml
# File: k8s/exercise-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exercise-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: exercise-backend
  template:
    metadata:
      labels:
        app: exercise-backend
    spec:
      containers:
      - name: backend
        image: your-repo/exercise-backend:latest
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
```

```yaml
# File: k8s/exercise-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: exercise-backend
spec:
  type: LoadBalancer
  selector:
    app: exercise-backend
  ports:
  - port: 80
    targetPort: 8080
```

Part C: Nginx/Ingress guidance

- If you’re running outside Kubernetes, you can still use Nginx as a reverse proxy/load balancer in front of multiple container instances.

```nginx
# File: nginx-exercise.conf
upstream exercise_backends {
  server 10.0.0.101:8080;
  server 10.0.0.102:8080;
  server 10.0.0.103:8080;
}
server {
  listen 80;
  location /data {
    proxy_pass http://exercise_backends/data;
  }
  location /health {
    proxy_pass http://exercise_backends/health;
  }
}
```

Part D: Validation plan

- Build and run locally with three container instances or three Kubernetes pods.
- Validate:
  - GET /data returns 200 with the expected JSON structure.
  - GET /health returns a short, fast status.
  - Simulate a pod failure (kill a container or scale down replicas) and verify the LoadBalancer or Ingress routes to healthy pods without downtime.
  - Optional: extend with a Redis-based session or JWT approach to demonstrate statelessness at scale.

End of lesson.