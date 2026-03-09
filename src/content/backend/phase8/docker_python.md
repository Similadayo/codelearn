# Docker — Containers & docker-compose

Containers are the building blocks for consistent, isolated, and reproducible environments. Docker packages your application with its runtime, libraries, and dependencies into a single image, which can run anywhere Docker is available. Docker-Compose adds a declarative way to define and run multi-container applications. For backend engineers, mastering containers and docker-compose accelerates development, testing, CI/CD, and scalable deployments across environments.

## 1. Containers, Images, and Docker Fundamentals

Code: basic commands to verify Docker, pull an image, and run a container.

```
$ docker --version
$ docker run --rm hello-world
$ docker pull python:3.11-slim
$ docker run --rm -it python:3.11-slim bash
```

### Line-by-line explanation
- Line 1: Check the installed Docker CLI version.
- Line 2: Run a small test image; --rm removes the container after exit.
- Line 3: Pulls the Python 3.11 slim image from Docker Hub.
- Line 4: Starts an interactive Bash session in a fresh Python 3.11-slim container; --rm will remove the container when you exit.

## 2. A Minimal Python App to Containerize

Code: a tiny Flask app and its dependencies.

app.py
```
from flask import Flask, jsonify
import os
import redis

app = Flask(__name__)

# Redis host comes from environment variable, default to 'redis' (container name)
redis_host = os.environ.get('REDIS_HOST', 'redis')
r = redis.Redis(host=redis_host, port=6379, db=0)

@app.route('/count', methods=['GET'])
def count():
    value = r.incr('counter')
    return jsonify({'counter': value})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

requirements.txt
```
Flask>=2.0
redis>=5.0
```

### Line-by-line explanation
- Line 1: Import Flask and jsonify for creating a simple API response.
- Line 2-3: Import os to read environment variables and import redis client.
- Line 5: Create a Flask application instance.
- Line 8: Read REDIS_HOST from the environment; default to 'redis' (useful in Docker Compose).
- Line 9: Create a Redis client pointing to the host/port.
- Line 11-13: Define a /count route that increments a Redis counter and returns its value as JSON.
- Line 15-17: Run the Flask app, binding to all interfaces inside the container.

### Line-by-line explanation (requirements)
- Line 1: Declares Flask as a dependency.
- Line 2: Declares the Redis Python client as a dependency.
- Line 3: (implicit) Ensures these lines map to the installed packages when using pip.

## 3. Dockerfile for Python Apps

Code: a concise Dockerfile that builds and runs the Python app.

Dockerfile
```
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
CMD ["python", "app.py"]
```

### Line-by-line explanation
- Line 1: Use the official Python 3.11 slim image as the base.
- Line 2: Set /app as the working directory inside the container.
- Line 3: Copy requirements.txt into the container.
- Line 4: Install Python dependencies from requirements.txt with no-cache optimization.
- Line 5: Copy the rest of the application code into the container.
- Line 6: Ensure Python outputs are unbuffered for real-time logs.
- Line 7: Command to run the Flask app when the container starts.

## 4. Building and Running Containers Locally

Code: commands to build and run the Flask app image.

```
# Build the image
$ docker build -t python-flask-redis-demo .

# Run the container locally (exposes port 5000)
$ docker run --rm -p 5000:5000 --name demo-python-flask-redis -e REDIS_HOST=redis -d python-flask-redis-demo
```

### Line-by-line explanation
- Line 1: Build the Docker image with tag python-flask-redis-demo.
- Line 3: Run a container from the image, mapping host port 5000 to container port 5000; set REDIS_HOST to redis via env var; run in detached mode.
- Line 4: The container will run the Flask app (via CMD in the Dockerfile); --rm cleans up on stop.

Note: This single-container example is good for learning Docker basics, but Compose becomes valuable when you add multiple services (like a Redis cache).

## 5. Docker Compose Basics

Code: a minimal docker-compose.yml to run the Python app with Redis in a single network.

docker-compose.yml
```
version: "3.9"
services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
volumes:
  redis_data:
```

### Line-by-line explanation
- Line 1: Specify Compose file version 3.9 for compatibility.
- Line 2: Start services at top level.
- Line 3-7: Define the web service:
  - Build from the current directory (uses Dockerfile).
  - Map host port 5000 to container port 5000.
  - Set environment variable REDIS_HOST=redis to tell the app where Redis runs.
  - declare dependency on the redis service to ensure Redis starts first.
- Line 8-12: Define the redis service using the official Redis image; mount a named volume for data persistence.
- Line 13-14: Define named volumes (redis_data).

### Line-by-line explanation
- Line 3: web service is built from the local Dockerfile.
- Line 4-7: Port mapping and environment variable for Redis host; depends_on ensures ordering.
- Line 9: redis service uses a lightweight Redis image.
- Line 11-12: Attach a persistent volume to Redis data directory.
- Line 13-14: Declare a named volume for Redis persistence.

## 6. Compose for a Multi-Service Python App (Web + Redis)

Code: a more robust docker-compose.yml that defines a single-page app and a Redis cache with a basic health check.

docker-compose.yml
```
version: "3.9"
services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 15s
      timeout: 3s
      retries: 5
volumes:
  redis_data:
```

New addition: health checks so Docker can report container health and orchestrate restarts if needed.

health endpoints in app.py (for the web healthcheck)
```
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200
```

### Line-by-line explanation
- Line 3: web service built from local Dockerfile.
- Line 4-7: Port mapping, environment variable, and dependency on Redis.
- Line 8-14: Add a healthcheck to the web service; checks if the HTTP endpoint /health is reachable.
- Line 9: redis service uses a Redis image with a persistent volume.
- Line 10-14: Add a healthcheck for Redis via redis-cli ping.
- Lines 15-16: Declare a persistent Redis data volume.

## 7. Data Persistence, Networking, and Security Considerations

Code: a practical docker-compose snippet focusing on volumes, networks, and a non-root user.

docker-compose.override.yml (illustrative)
```
version: "3.9"
services:
  web:
    networks:
      - appnet
    user: "1000:1000"      # run as non-root user inside container
    environment:
      - REDIS_HOST=redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
  redis:
    networks:
      - appnet
    volumes:
      - redis_data:/data
networks:
  appnet:
volumes:
  redis_data:
```

Line-by-line explanation
- The web service runs as a non-root user (safe default is UID 1000) to reduce privilege risks.
- Both services are attached to a dedicated internal network (appnet) to avoid exposing internal containers to other networks.
- A persistent volume is used for Redis to ensure data survives container restarts.

## X. Common Beginner Mistakes

### 1) Bad: Not using .dockerignore, leading to bloated images
Bad
```
# Dockerfile (bad)
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "app.py"]
```

Good
```
# .dockerignore (good)
__pycache__
*.pyc
.env
venv/
*.sqlite3
```

Nice-to-have: ensure Dockerfile also uses selective copy
Bad
```
# Dockerfile (bad)
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
```

Good
```
# Dockerfile (good)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

Line-by-line explanation
- Bad: COPY . . copies all files, including tests, docs, and local configs, bloating the image.
- Good: .dockerignore excludes unnecessary files from the build context, keeping the image small and build times fast.

### 2) Bad: Not pinning base image or relying on latest
Bad
```
FROM python:latest
```

Good
```
FROM python:3.11-slim
```

Line-by-line explanation
- Latest tags are mutable and can introduce breaking changes; pinning a specific version ensures reproducible builds and predictable security posture.

### 3) Bad: Missing health checks
Bad
```
# No HEALTHCHECK in Dockerfile or Compose
```

Good
```
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:5000/health || exit 1
```

Line-by-line explanation
- Health checks help orchestrators restart unhealthy containers and improve reliability.

### 4) Bad: Running as root without a non-root user
Bad
```
FROM python:3.11-slim
WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

Good
```
FROM python:3.11-slim
RUN groupadd -r app && useradd -r -g app app
WORKDIR /home/app
COPY --chown=app:app . .
USER app
CMD ["python", "app.py"]
```

Line-by-line explanation
- Running as root is a risk in multi-tenant or shared environments. The good example creates a non-root user and runs the app with it.

## Y. Why This Matters In Real Systems

- Reproducibility: Docker ensures identical environments from development to production, reducing "works on my machine" bugs.
- CI/CD: Images and Compose configurations are versioned, enabling automated testing, building, and deployment steps.
- Isolation and security: Containers isolate process trees, file systems, and network namespaces; non-root users further reduce risk.
- Scalability: Docker Compose and orchestration tools (Kubernetes, Swarm) let you scale services independently, roll out updates, and perform swapping/paging strategies without downtime.
- Observability: Health checks, logs, and metrics become a first-class consideration, enabling proactive maintenance.
- Portability: Images run the same on laptops, CI runners, and cloud servers, simplifying multi-environment deployments.

## Z. Study Questions

1) What is the practical difference between a Docker image and a Docker container?
2) How does docker-compose improve development and testing for multi-service apps?
3) Why is a .dockerignore important, and how does it affect image size?
4) How do HEALTHCHECK instructions improve reliability in production?
5) How can you scale a Compose deployment, and what considerations arise when scaling web services?

## Exercise

Part A — Create a containerized Flask API with a Redis cache
- Create a project directory with app.py, requirements.txt, Dockerfile, and docker-compose.yml.
- Implement a Flask API with:
  - GET /count: increments a Redis-backed counter and returns the value.
  - GET /health: returns a simple OK status.

Code snippets (refer to the ones above as a reference):

app.py
```
from flask import Flask, jsonify
import os
import redis

app = Flask(__name__)
redis_host = os.environ.get('REDIS_HOST', 'redis')
r = redis.Redis(host=redis_host, port=6379, db=0)

@app.route('/count', methods=['GET'])
def count():
    value = r.incr('counter')
    return jsonify({'counter': value})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

requirements.txt
```
Flask>=2.0
redis>=5.0
```

Dockerfile
```
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
CMD ["python", "app.py"]
```

docker-compose.yml
```
version: "3.9"
services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
volumes:
  redis_data:
```

Part B — Run and test locally
- Run docker-compose up -d
- Test: curl http://localhost:5000/health
- Test: curl http://localhost:5000/count multiple times to observe increasing counters.

Part C — Scale and observe
- Run docker-compose up --scale web=2 -d
- Verify two web containers are running:
  - docker ps
- Test load balancing by curling the endpoint multiple times; observe counters increment across instances.

Part D — Improve resilience
- Add a HEALTHCHECK to the Dockerfile and update docker-compose.yml health checks.
- Optionally add a non-root user, and use a .dockerignore file to keep the image lean.

This complete, structured approach gives you practical experience with Python-based backend deployment using Docker and docker-compose, preparing you for real-world infrastructure and deployment workflows.