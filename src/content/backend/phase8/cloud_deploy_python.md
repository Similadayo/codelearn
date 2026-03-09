# Cloud Deployment: Railway, Render & AWS EC2 (Python)

In modern backend engineering, moving your Python services from code to a live, scalable, and secure runtime is as important as writing the code itself. This lesson covers practical cloud deployment options using three popular platforms: Railway, Render, and AWS EC2. You’ll learn how to containerize a Python web app, deploy to each provider, manage ports and environment variables, and understand production considerations like process management, health checks, and observability.

## 1. Railway Deployment (Python)

Railway makes quick, low-friction deployments of small to medium Python services by building from a Dockerfile or project configuration. This section provides a minimal, production-friendly Python app, Dockerfile, startup script, and the steps to deploy with Railway.

Code: Python app (FastAPI) - main.py
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from Railway (Python)!"}

@app.get("/health")
def health():
    return {"status": "ok"}
```

### Line-by-line explanation
1. from fastapi import FastAPI
   - Import the FastAPI class to create the web app.
2. app = FastAPI()
   - Instantiate the FastAPI application object.
3. @app.get("/")
   - Define an HTTP GET route for the root path.
4. def read_root():
   - Define the handler function for the root route.
5. return {"message": "Hello from Railway (Python)!"}
   - Responds with a JSON payload to the client.
6. @app.get("/health")
   - Define an HTTP GET route for health checks.
7. def health():
   - Handler for health check endpoint.
8. return {"status": "ok"}
   - Simple health indicator payload.

Code: dependencies (requirements.txt)
```
fastapi
uvicorn[standard]
```

### Line-by-line explanation
1. fastapi
   - The web framework used to build the API.
2. uvicorn[standard]
   - The ASGI server and optional dependencies for running FastAPI.
   
Code: startup script (start.sh)
```sh
#!/bin/sh
set -e
port="${PORT:-8000}"
exec uvicorn main:app --host 0.0.0.0 --port "$port"
```

### Line-by-line explanation
1. #!/bin/sh
   - Shebang to run the script with /bin/sh.
2. set -e
   - Exit immediately if any command exits non-zero (fail fast).
3. port="${PORT:-8000}"
   - Read PORT from the environment; default to 8000 if not set.
4. exec uvicorn main:app --host 0.0.0.0 --port "$port"
   - Start the FastAPI app using Uvicorn, binding to all interfaces on the chosen port.

Code: Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose the port used by the app
EXPOSE 8000

CMD ["/start.sh"]
```

### Line-by-line explanation
1. FROM python:3.11-slim
   - Use a lightweight Python base image.
2. WORKDIR /app
   - Set the working directory for subsequent steps.
3. COPY requirements.txt .
   - Bring the dependency list into the image.
4. RUN pip install --no-cache-dir -r requirements.txt
   - Install Python dependencies inside the image.
5. COPY . .
   - Copy the application code into the image.
6. COPY start.sh /start.sh
   - Add the startup script.
7. RUN chmod +x /start.sh
   - Make the startup script executable.
8. EXPOSE 8000
   - Document the port the container will expose.
9. CMD ["/start.sh"]
   - Run the startup script when the container starts.

Code: Railway CLI deployment workflow (example)
```bash
# Login and initialize a Railway project
railway login
railway init
# Deploy from the current repository (must contain Dockerfile)
railway up
```

### Line-by-line explanation
1. railway login
   - Authenticate the CLI to your Railway account.
2. railway init
   - Create or link a Railway project to the current repo.
3. railway up
   - Build the image (via Dockerfile) and deploy to Railway; sets up a live URL and port.

Note on environment variables and secrets:
- Railway injects PORT automatically for container apps and exposes it to your startup script.
- You can set additional environment variables via the Railway UI or CLI:
  - railway variables set SECRET_KEY=your-secret
  - railway variables set DB_URL=postgres://...

Code: environment overview
- PORT is provided by Railway for containerized apps; your start script reads PORT.
- Do not hard-code secrets; use Railway variables or a secrets manager.

### Line-by-line explanation (environment setup)
1. PORT comes from the platform (Railway) and is used to configure the server port.
2. SECRET_KEY can be supplied through the UI or CLI as an environment variable.

## 2. Render Deployment (Python)

Render uses a declarative approach with a render.yaml file for multi-service apps. This example shows a Python FastAPI app with a simple deployment, environment variable handling, and a public port provided by Render.

Code: Python app (FastAPI) - main.py
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from Render (Python)!"}

@app.get("/health")
def health():
    return {"status": "ok"}
```

### Line-by-line explanation
1–8: See Railway example above for the same FastAPI structure and health endpoint.

Code: requirements.txt
```
fastapi
uvicorn[standard]
```

### Line-by-line explanation
1–2: See Railway requirements; identical dependencies.

Code: Render deployment descriptor (render.yaml)
```yaml
services:
  - type: web
    name: python-app
    env: python
    plan: free
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: SECRET_KEY
        value: "CHANGE_ME"
      - key: APP_ENV
        value: production
```

### Line-by-line explanation
1. services:
   - Top-level list of services to deploy.
2. - type: web
   - name: python-app
   - env: python
   - plan: free
   - buildCommand: "pip install -r requirements.txt"
   - startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
   - envVars:
     - key: SECRET_KEY value: "CHANGE_ME"
     - key: APP_ENV value: production
3. buildCommand
   - Installs Python dependencies in the build step.
4. startCommand
   - Runs the FastAPI app, binding to the platform-provided port.
5. envVars
   - Injects environment variables into the runtime.

Note on deployment workflow:
- Render detects the render.yaml and provisions a web service accordingly.
- The $PORT environment variable is provided by Render to the app at runtime.
- Secrets should be stored as environment variables, not hard-coded.

Code: Deploy commands (Render)
```bash
# Push code to a connected Git repo and create a Render service
# Render auto-detects render.yaml on deployment
git add .
git commit -m "Add Render deployment for FastAPI app"
git push origin main
```

### Line-by-line explanation
1. git add/commit/push
   - Triggers a deployment in Render if connected to the repository.
2. Render builds the image and runs the service per render.yaml.

## 3. AWS EC2 Deployment (Python)

Deploying to AWS EC2 provides a flexible, scalable VM-based approach. This section demonstrates two common paths: (A) native Python app managed by Gunicorn behind Nginx, and (B) Dockerized deployment on EC2. Both aim to be production-ready with proper port handling and process management.

Code: Python app (FastAPI) - main.py
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from AWS EC2 (Python)!"}

@app.get("/health")
def health():
    return {"status": "ok"}
```

### Line-by-line explanation
1–8: See Railway/Render examples for a consistent FastAPI structure.

Option A: Native Python app with Gunicorn behind Nginx (no Docker)

Code: Gunicorn startup (example: run with Gunicorn)
```
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### Line-by-line explanation
1. gunicorn
   - Launches Gunicorn as the application server.
2. -w 4
   - Spawn 4 worker processes.
3. -k uvicorn.workers.UvicornWorker
   - Use Uvicorn worker class to run FastAPI apps efficiently.
4. main:app
   - Import path to the FastAPI application object.
5. --bind 0.0.0.0:8000
   - Bind to all interfaces on port 8000 (EC2 security group rule must allow 80/8000 as appropriate).

Code: Systemd service (example) (/etc/systemd/system/app.service)
```
[Unit]
Description=Python FastAPI app
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/app
ExecStart=/usr/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Line-by-line explanation
1. [Unit] Section
   - Defines the service and its ordering.
2. Description
   - Human-readable description.
3. After=network.target
   - Start after the network is ready.
4. [Service] Section
   - Execution details for the process.
5. User/Group
   - Run under a non-root user for security.
6. WorkingDirectory
   - Directory containing app code.
7. ExecStart
   - Command to start Gunicorn with Uvicorn workers.
8. Restart
   - Automatically restart on failure.
9. [Install] Section
   - Enable service to start on boot.

Code: Nginx reverse proxy config (example: /etc/nginx/sites-available/app)
```
server {
    listen 80;
    server_name your-ec2-public-dns;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Line-by-line explanation
1. server { listen 80; server_name ...
   - Expose the public HTTP port and map requests to the app.
2. location / { proxy_pass http://127.0.0.1:8000; ... }
   - Forward incoming requests to the Gunicorn process listening on 8000.
3. proxy_set_header ...
   - Preserve client metadata for logging and upstream apps.

Code: Docker-based EC2 deployment (alternative path)

Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]
```

### Line-by-line explanation
1. FROM python:3.11-slim
   - Lightweight Python environment.
2. WORKDIR /app
   - Set working directory inside the container.
3. COPY requirements.txt .
   - Bring dependencies list into image.
4. RUN pip install --no-cache-dir -r requirements.txt
   - Install dependencies.
5. COPY . .
   - Add app code to image.
6. EXPOSE 8000
   - Expose container port.
7. CMD ["gunicorn", ..., "--bind", "0.0.0.0:8000"]
   - Start the app with Gunicorn and Uvicorn workers.

How to run on EC2 with Docker
- Install Docker on the EC2 instance.
- Transfer your app (or push to ECR and pull) and run:
  - docker build -t python-app .
  - docker run -d -p 80:8000 python-app
- Update security groups to allow inbound traffic on port 80.

## 4. Common Beginner Mistakes — 3+ real pitfalls (Bad vs Good)

- Pitfall 1: Hard-coding secrets in code
Bad:
```python
# bad
DATABASE_URL = "postgres://user:pass@host/db"
SECRET_KEY = "supersecret"
```
Good:
```python
# good
import os
DATABASE_URL = os.environ.get("DATABASE_URL")
SECRET_KEY = os.environ.get("SECRET_KEY")
```
Explanation: Secrets must not be embedded in source. Use environment variables, secrets managers, or service-specific secret stores.

- Pitfall 2: Not using a proper process manager or mismanaging ports
Bad (start with python app.py, no process management):
```bash
# bad
python -m uvicorn main:app --reload --port 8000
```
Good (Gunicorn with Uvicorn workers, proper port binding, and daemonization via systemd or supervisor in production):
```bash
# good
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```
Explanation: In production you need a stable process manager, worker management, and correct port handling behind a reverse proxy or load balancer.

- Pitfall 3: Skipping health checks and readiness probes
Bad:
```python
# bad: health check intentionally removed
@app.get("/health")
def health():
    pass
```
Good:
```python
@app.get("/health")
def health():
    return {"status": "ok"}
```
Explanation: Without health checks, orchestrators and load balancers may route traffic to unhealthy instances.

- Pitfall 4: Ignoring dependencies and versions
Bad:
```
pip install fastapi uvicorn
```
Good:
```
fastapi==0.95.0
uvicorn[standard]==0.22.0
```
Explanation: Pinning versions improves reproducibility and prevents drift across environments.

## 5. Why This Matters In Real Systems — production context

- Reliability and uptime: Cloud providers offer SLAs; choosing the right service (Railway/Render for quick deployments vs EC2 for deep customization) impacts uptime, scaling, and recovery.
- Observability: Production deployments require metrics, logs, and tracing. Integrate with CloudWatch, Log Streams, or external tools; ensure health endpoints and proper logging formats.
- Security: Do not hard-code credentials. Use environment variables, secret stores, and role-based access control. Use TLS (via reverse proxies like Nginx or platform-provided TLS).
- Scaling and cost: Elastic platforms (Render/Railway) auto-scale to match traffic; EC2 provides fine-grained control but requires manual scaling and maintenance.
- CI/CD integration: Automate builds, tests, and deployments. Use branch-based deployments, dependency pinning, and rollout strategies to minimize risk.

## 6. Study Questions — 5 recall questions

1. What environment variable should your app consult for its listening port on Railway or Render?
2. Why is it important to pin dependency versions in requirements.txt for production deployments?
3. What is the purpose of a health endpoint like /health in a web service?
4. How does a reverse proxy (like Nginx) help when deploying a Python app to an EC2 instance?
5. Name two ways to deploy a Python FastAPI app on AWS EC2 (with and without Docker).

## 7. Exercise — practical multi-part coding challenge

Part A: Create a minimal FastAPI app with a health check
- Implement a Python FastAPI app (main.py) exposing:
  - GET / returns a greeting message
  - GET /health returns {"status": "ok"}

Part B: Containerize the app
- Provide a Dockerfile and requirements.txt as in the examples above.
- Include a small startup script to read PORT from the environment.

Part C: Deploy to Railway
- Write a short README with steps:
  - Create a Railway project
  - Ensure Dockerfile is in the repo
  - Run railway up
  - Set SECRET_KEY via railway variables set SECRET_KEY=your-secret
- Include commands and explanation for the expected output URL.

Part D: Deploy to Render
- Create a render.yaml file per the example and explain how to set SECRET_KEY in the Render UI.
- Explain how the app will be accessible via the Render-provisioned URL.

Part E: Deploy to AWS EC2 (optional extension)
- Provide a quick-start guide to:
  - Launch an EC2 instance
  - Install Docker or Python+Gunicorn
  - Pull your app and run container or set up a Gunicorn service
  - Open port 80 and verify by curling the server root

Deliverables:
- Code files: main.py, requirements.txt, Dockerfile, start.sh (Railway option), render.yaml (for Render)
- README-style deployment notes for Railway, Render, and EC2
- A quick verification guide (curl http://your-host/) to confirm successful deployment

Note: For all three providers, ensure the app remains accessible at http://<host> or the provider’s assigned URL, and that the health endpoint responds quickly.