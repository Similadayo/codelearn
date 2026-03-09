# Docker — Containers & docker-compose in Node.js (Phase 8: Infrastructure & Deployment)

Containers are the portable building blocks of modern backends. Docker lets you package a Node.js application, along with its runtime and dependencies, into a single image that runs identically anywhere. docker-compose extends this by letting you define multi-service deployments (apps, caches, queues, databases) in a single YAML file. Mastery of Docker and docker-compose is essential for reproducible environments, scalable deployments, and reliable CI/CD pipelines in real-world systems.

## 1. Node.js App Scaffold for Containerization
Begin with a small Express app that will be containerized. This section provides the core app code (index.js) and its package manifest (package.json).

### index.js
```
const express = require('express');
const Redis = require('ioredis');
const app = express();

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

const redis = new Redis({ host: redisHost, port: redisPort });

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/data', async (req, res) => {
  try {
    await redis.set('visit', '1');
    const val = await redis.get('visit');
    res.json({ message: 'Hello from Node.js', redisValue: val });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/enqueue', async (req, res) => {
  const { item } = req.body;
  if (!item) return res.status(400).json({ error: 'item is required' });
  await redis.lpush('queue', item);
  res.json({ queued: item });
});

app.get('/queue-size', async (req, res) => {
  const len = await redis.llen('queue');
  res.json({ queueSize: len });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
```

### package.json
```
{
  "name": "docker-node-app",
  "version": "1.0.0",
  "description": "Node.js app containerized with Docker",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.0"
  }
}
```

### Line-by-line explanation
- index.js: Sets up an Express server, creates a Redis client using environment-driven host/port, and defines endpoints for health, data, enqueue, and queue-size.
- The REDIS_HOST and REDIS_PORT defaults ensure the app can run even when Redis isn’t explicitly provided, which helps in local demos.
- /health pings Redis to verify connectivity; /data demonstrates basic Redis get/set; /enqueue pushes items to a Redis list acting as a queue; /queue-size returns the current length of the queue.
- package.json: Declares the dependencies (Express for HTTP API, ioredis for Redis client) and a start script used by the Dockerfile.
- Both files are intentionally decoupled from environment specifics to maximize portability across environments (dev, test, prod).

## 2. Containerizing the Node.js App with Docker
This section provides the Dockerfile that builds a reproducible image for the Node.js app.

### Dockerfile
```
# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install app dependencies first (cacheable layer)
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the app port
EXPOSE 3000

# Run the app
CMD ["npm", "start"]
```

### Line-by-line explanation
- FROM node:18-alpine: Uses a lightweight Node.js 18 image, which keeps the final image small.
- WORKDIR /app: Establishes /app as the working directory inside the container.
- COPY package*.json ./ and RUN npm install: Copies package.json and package-lock.json (if present) and installs dependencies. This creates a cache-friendly layer so changes to source code don’t reinstall dependencies on every build.
- COPY . .: Copies the rest of the application code into the container.
- EXPOSE 3000: Documents that the container listens on port 3000 at runtime.
- CMD ["npm","start"]: Runs the Node.js app via npm start when the container starts.

## 3. Orchestrating with docker-compose: Multi-Service Deployment
docker-compose lets you run the app together with a Redis service, sharing a network and enabling simple service discovery via the container names.

### docker-compose.yml
```
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
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
- version: '3.8': Uses a modern Compose file version with broad compatibility.
- services.app: Builds the Node.js app from the local Dockerfile, mapping host port 3000 to container port 3000.
  - environment: Sets runtime configuration for PORT and Redis connection details, ensuring the app connects to the Redis service named redis.
  - depends_on: Ensures the Redis service starts before the app attempts to connect.
- services.redis: Runs an official Redis image, exposing port 6379 and persisting data to a named volume redis-data.
- volumes.redis-data: Declares a persistent volume to store Redis data across restarts.
  
### How to run
- Build and start the entire stack: docker-compose up --build
- Test the app:
  - curl http://localhost:3000/health
  - curl http://localhost:3000/data
  - curl -X POST -H "Content-Type: application/json" -d '{"item":"task-1"}' http://localhost:3000/enqueue
  - curl http://localhost:3000/queue-size

## 4. Environment, Networking, and Health in Production
- Service discovery in Docker Compose is simple: containers reference peers by their service name (e.g., REDIS_HOST=redis). This enables stable networking without hard-coding IPs.
- Health signals: In real systems, you’d add more robust health checks (liveness/readiness probes) and integrate with orchestrators (Kubernetes, Swarm) for auto-recovery. In Docker Compose, basic health checks can be added later as needed.
- Data persistence: Redis data is stored in a Docker volume; for production, consider backing by a dedicated data store or a managed Redis service and configure backups, persistence, and performance tuning.
- Image hygiene: Use multi-stage builds to reduce image size, scan for vulnerabilities, and pin exact versions for reproducibility. The providedDockerfile uses a single stage for simplicity; you can adopt multi-stage builds in more complex apps.
- Security: Avoid embedding secrets in environment variables in production. Use secret management or a secure config service. Run containers as non-root users where possible.

## 5. Common Beginner Mistakes — 3+ Pitfalls, Bad vs Good
- Pitfall 1: Using the latest tag, enabling drift
  - BAD:
    ```
    # Dockerfile (bad)
    FROM node:latest
    ```
  - GOOD:
    ```
    # Dockerfile (good)
    FROM node:18-alpine
    ```
  - Why: latest can change without notice, breaking builds. Pinning to a known version provides reproducibility.

- Pitfall 2: Not using .dockerignore, leaking local files
  - BAD:
    ```
    # Dockerfile (bad)
    COPY . .
    ```
  - GOOD:
    Add a .dockerignore and copy only necessary files
    ```
    # .dockerignore
    node_modules
    npm-debug.log
    Dockerfile
    .dockerignore
    ```
    # Dockerfile (good)
    FROM node:18-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    ```
  - Why: keeps build context lean, reduces image size, and prevents leaking sensitive or heavy files.

- Pitfall 3: Running as root and not least-privilege
  - BAD:
    ```
    # Dockerfile (bad)
    FROM node:18-alpine
    CMD ["npm", "start"]
    ```
  - GOOD:
    ```
    # Dockerfile (good)
    FROM node:18-alpine
    RUN addgroup -S app && adduser -S -G app app
    USER app
    CMD ["npm", "start"]
    ```
  - Why: running as root increases risk surface. Use a non-root user for better security.

- Pitfall 4: Not using multi-service testing
  - BAD:
    ```
    # docker-compose.yml (simplified)
    services:
      app:
        build: .
        ports: ["3000:3000"]
      # Redis service omitted
    ```
  - GOOD:
    Include dependent services and volumes (as in the example docker-compose.yml above) to ensure the app runs against real dependencies during development.

- Pitfall 5: Ignoring data persistence and backups
  - BAD:
    ```
    redis:
      image: redis:7-alpine
      ports: ["6379:6379"]
    ```
  - GOOD:
    Include a named volume for Redis data and consider backup strategies in production environments.

## 6. Why This Matters In Real Systems
- Reproducible environments: Docker images encapsulate the runtime, dependencies, and OS details, ensuring the same behavior from dev to prod.
- Faster, safer deployments: Immutable images deployed via CI/CD pipelines reduce “works on my machine” issues and rollbacks.
- Service composition: docker-compose enables local staging environments that resemble production topologies (apps, caches, queues, databases) without managing complex infrastructure.
- Operational visibility: Logs, health endpoints, and metrics can be centralized across services, enabling better observability and incident response.
- Scaling and isolation: Containers can be scaled horizontally; separate concerns (app vs. cache) are isolated, making failures easier to diagnose and recover from.

## 7. Study Questions — 5 Recall Questions
1. What is the purpose of docker-compose, and how does it differ from a plain Dockerfile?
2. Why is it recommended to pin a specific Node.js version in the Dockerfile rather than using node:latest?
3. How does the app know where to find Redis when running in Docker Compose?
4. What is the role of a Docker volume in a Redis service, and why is it important?
5. How would you extend this setup to add a background worker that processes jobs from a Redis queue?

## 8. Exercise — Practical multi-part coding challenge
Part A: Extend the app to enqueue and process jobs
- Objective: Add a worker process that consumes jobs from Redis and updates a completed list.
- Files to add/modify:
  - index.js: Keep the existing endpoints and add a POST /enqueue endpoint (already included in the scaffolding) and a new GET /queue-size endpoint (already included). Ensure the app uses an environment-based Redis host/port.
  - worker.js: New Node script that BRPOP (block pop) jobs from Redis queue and simulate processing, then push results to a "completed" list.

Code for worker.js:
```
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
});

async function work() {
  console.log('Worker started, waiting for jobs on queue:queue');
  while (true) {
    try {
      const res = await redis.brpop('queue', 0); // waits until a job is available
      const value = res[1];
      console.log('Processing job:', value);
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 1000));
      await redis.lpush('completed', value);
      console.log('Job completed:', value);
    } catch (err) {
      console.error('Worker error:', err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

work().catch(err => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
```

Part B: Wire the worker into the containerized environment
- Modify docker-compose.yml to include a worker service using the same image (or a dedicated one if you prefer).
Code snippet to add to docker-compose.yml under services:
```
  worker:
    build: .
    command: ["node", "worker.js"]
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
```

Part C: Exercise how the components interact
- Run: docker-compose up --build
- Interact with the API:
  - curl -X POST -H "Content-Type: application/json" -d '{"item":"task-01"}' http://localhost:3000/enqueue
  - curl http://localhost:3000/queue-size
  - Check container logs: docker-compose logs -f app and docker-compose logs -f worker
- Expected behavior:
  - The /enqueue endpoint pushes a job onto Redis queue.
  - The worker continuously BRPOPs from queue, processes items, and pushes them to the completed list.
  - The /queue-size endpoint reflects the current number of items in the queue.

Note: In production, you would typically use a dedicated job queue system (e.g., BullMQ with Redis, RabbitMQ) and separate build pipelines for worker services to ensure proper resource isolation and scaling. This exercise demonstrates the basic inter-service communication patterns, image immutability, and the power of docker-compose for integrated development and testing.