# Phase 8 — Infrastructure & Deployment: Cloud Deployment with Railway, Render & AWS EC2 (Node.js)

Cloud deployment for Node.js backends is the bridge between development and production. It lets your services be provisioned, scaled, and networked automatically across different platforms. In this module, you’ll compare Railway, Render, and AWS EC2 as deployment targets, learn how to prepare a Node.js app for each, and practice writing deployment configs and bootstrap scripts. Mastery here reduces deployment toil, improves reliability, and enables safer rollout strategies in real systems.

## 1. Node.js App Skeleton and Environment

This sub-topic gives you a minimal Node.js Express app and the essential files to run locally and in the cloud. You’ll see how PORT is obtained from the environment so deployments can pick up a dynamic port.

```js
// server.js
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/time', (req, res) => {
  res.json({ time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
```

```json
{
  "name": "backend-deployment",
  "version": "1.0.0",
  "description": "Node.js backend for deployment practice",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

```Dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

### Line-by-line explanation

#### server.js
- Line 1-2: Import Express and create a new app instance.
- Line 4: Read the PORT from the environment, default to 3000 if not provided.
- Lines 6-8: Define a /health endpoint returning status and a timestamp.
- Lines 10-12: Define a /api/time endpoint returning current time in ISO format.
- Lines 14-17: Start the server on PORT and log the message.
- Line 19: Exports the app instance for potential testing.

#### package.json
- Lines 1-2: Metadata (name, version).
- Line 4: Main entry file.
- Lines 5-9: NPM scripts; start executes node server.js.
- Lines 10-14: Express as a dependency.

#### Dockerfile
- Line 1: Use Node 18 on Alpine as the base image.
- Line 2: Set working directory to /app.
- Lines 4-5: Copy package files and install production dependencies.
- Line 7: Copy the rest of the app into the container.
- Line 9: Expose port 3000 for the app.
- Line 10: Command to run the app.

## 2. Cloud Deployment with Railway (Node.js)

Railway is a platform that automates provisioning and deployment for many languages, including Node.js. It recognizes a Node app via standard start scripts and environment variables like PORT. Below are common elements you’d prepare for Railway deployments.

```Procfile
web: node server.js
```

```js
// server.js (same as Section 1, ensure PORT uses environment variable)
```

### Line-by-line explanation

#### Procfile
- Line 1: Declares a process type named web that starts the app with node server.js. Railway uses a Heroku-like Procfile convention to identify how to run the app.

#### server.js
- See Section 1 for line-by-line details. The crucial part is that PORT is read from process.env.PORT to support Railway’s dynamic port assignment.

Notes:
- Railway will detect your repository and run npm install, then npm start (as defined in package.json). If you choose to override, you can configure port and env vars in the Railway dashboard or via railway.json/CLI depending on the latest tooling.

## 3. Cloud Deployment with Render (Node.js)

Render provides a simple web service deployment model. You’ll typically point a Render service at your Git repository and specify a start command and build steps. Below is a representative render.yaml configuration.

```yaml
# render.yaml
version: 1
services:
  - type: web
    name: node-app
    env: node
    buildCommand: npm install
    startCommand: npm start
    plan: free
    port: 3000
```

```js
// server.js (same as Section 1)
```

### Line-by-line explanation

#### render.yaml
- Line 1: Declare the version of the config format.
- Line 2-3: Start the list of services.
- Lines 4-5: Define a web service named node-app; “env: node” signals a Node.js runtime.
- Line 6: Build step runs npm install to install dependencies.
- Line 7: Start step runs npm start, which, in package.json, executes node server.js.
- Line 8: Plan configuration; the free tier is used for cost control.
- Line 9: Port configuration; Render will expose port 3000 from the container. The app should respect PORT if Render provides one dynamically; in many setups, Render maps the service port to its own external port.

Notes:
- Render’s dynamic port handling is typically wired through the PORT environment variable. If needed, ensure your app uses process.env.PORT || 3000 (as shown in Section 1).

## 4. Cloud Deployment with AWS EC2 (Node.js)

AWS EC2 requires more hands-on configuration (instance, security groups, bootstrap scripts). The following examples illustrate an initial bootstrap that installs Node, starts the app, and ensures the process restarts on failure.

### EC2 User Data (cloud-init) bootstrap script

```bash
#!/bin/bash
set -e -o pipefail

# Update and install Node.js (setup script for Node 18)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get update -y
apt-get install -y nodejs git

# Install PM2 for process management
npm install -g pm2

# Clone the app
git clone https://github.com/your-org/your-node-app.git /var/www/app
cd /var/www/app

# Install dependencies
npm ci --production

# Start the app with PM2 and configure startup on reboots
pm2 start server.js --name node-app
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Systemd service file (optional if not using PM2)

```ini
# /etc/systemd/system/node-app.service
[Unit]
Description=Node.js App
After=network.target

[Service]
Type=simple
Environment=PORT=3000
WorkingDirectory=/var/www/app
ExecStart=/usr/bin/node /var/www/app/server.js
Restart=always
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
```

### Line-by-line explanation

#### EC2 User Data (cloud-init)
- Line 1: Shebang for bash and strict error handling across commands.
- Line 4-6: Install Node.js 18 via NodeSource, then update apt.
- Line 8: Install PM2 globally to manage the app process.
- Line 11-12: Clone the repository to /var/www/app and switch into it.
- Line 15: Install production dependencies only.
- Line 18: Start the app with PM2 and name it for monitoring.
- Line 19-20: Save PM2 process list and configure startup at boot using systemd.

#### systemd service
- Line 1: Unit metadata with a clear description.
- Line 4: Service type and environment (PORT). Note that PORT must match your app’s config.
- Line 5: Working directory where the app lives.
- Line 6: Command to start the Node.js server.
- Line 7-8: Always restart on failure and run as the ubuntu user.
- Line 10-11: Install-time target to ensure the service starts on boot.

Notes:
- You can customize the repository URL, port, and environment (e.g., NODE_ENV=production) to suit your security and deployment policies.
- In production, you would typically place a reverse proxy (Nginx) in front of Node.js on port 80/443 and configure TLS at the proxy layer.

## 5. X. Common Beginner Mistakes

Bad vs Good code practices when deploying Node.js apps.

1) Pitfall: Hard-coded port
- Bad:
```js
// server.js
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
```
- Good:
```js
// server.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
```

2) Pitfall: Ignoring environment secrets
- Bad:
```js
const dbPassword = 'supersecret';
```
- Good:
```js
// Use environment variables; never hard-code secrets
const dbPassword = process.env.DB_PASSWORD;
```

3) Pitfall: Not handling errors from async code
- Bad:
```js
someAsyncTask().then(() => {
  // no error handling
});
```
- Good:
```js
someAsyncTask()
  .then(() => { /* success */ })
  .catch(err => {
    console.error('Async task failed', err);
    // optionally exit or recover
  });
```

4) Pitfall: Missing health checks or uptime probes
- Bad:
```js
// No /health endpoint
```
- Good:
```js
app.get('/health', (req, res) => res.status(200).send('ok'));
```

5) Pitfall: Not accounting for dynamic port and logs in production
- Bad:
```js
console.log('Starting on port 3000');
```
- Good:
```js
console.log(`Server listening on port ${PORT}`);
// Combine with a proper logger (e.g., winston, pino) in real systems
```

## 6. Y. Why This Matters In Real Systems

- Reliability and uptime: Cloud platforms provide managed infrastructure, health checks, and auto-restarts. This minimizes manual intervention and reduces MTTR.
- Portability and consistency: Using PORT from environment and standard startup scripts (start commands) makes your app portable across Railway, Render, and EC2.
- Secrets and configuration management: Environment variables and secret stores keep credentials out of your codebase, enabling safer deployments.
- Observability: Centralized logging, metrics, and tracing are easier when you standardize on a single startup path and use robust process managers (PM2, systemd) on EC2.
- Rollbacks and rollouts: Cloud platforms support quick rollbacks, canary deployments, and health checks to ensure safe releases without downtime.
- Cost and scalability: Serverless-ish platforms like Railway/Render auto-scale within limits; EC2 requires manual or scripted scaling but gives fine-grained control.

## 7. Z. Study Questions

1) What is the purpose of the PORT environment variable in cloud deployments, and why should you fallback to a default?  
2) How would you configure a Node.js app for deployment on Render using render.yaml?  
3) What are the main differences between deploying to Railway vs Render for a Node.js API?  
4) How can you ensure your AWS EC2-hosted Node.js app restarts automatically after a crash? Provide a minimal mechanism.  
5) Why are health checks important, and how would you implement a simple /health endpoint in Express?

## Exercise

Part A: Build and containerize a Node.js API and verify local behavior
- Create a minimal Express app with:
  - GET /health returning { status: "ok" }
  - GET /time returning the current ISO timestamp
  - Port should come from process.env.PORT or default to 3000
- Add a Dockerfile (as shown in Section 1) and verify containerizing and running locally:
  - docker build -t node-app .
  - docker run -p 3000:3000 -e PORT=3000 node-app
- Verify:
  - curl http://localhost:3000/health
  - curl http://localhost:3000/time

Part B: Prepare for Railway deployment
- Add a Procfile with: web: node server.js
- Ensure package.json has "start": "node server.js"
- Provide a brief README snippet describing how Railway would deploy the app (environment variables, automatic port binding)

Part C: Prepare for Render deployment
- Create render.yaml (as shown in Section 3) for a web service named node-app
- Ensure server reads PORT and works when Render binds port 3000
- Explain how to connect a Git repo to Render and pick up render.yaml

Part D: Prepare for AWS EC2 deployment
- Write a cloud-init user-data script that:
  - Installs Node.js, clones your app, installs dependencies, and starts with PM2
- Write a systemd service file (optional) to keep the app running on reboot
- Describe steps to create an EC2 instance, open port 3000 in the security group, and deploy the app using the provided bootstrap script

Deliverables:
- The server.js and package.json files from Part A
- Dockerfile from Part A
- Procfile for Railway (Part B)
- render.yaml for Render (Part C)
- EC2 cloud-init script and optional systemd service (Part D)
- A short deployment plan explaining when to use Railway, Render, or EC2 in real-world projects

Note: In real projects, you would typically add a reverse proxy (Nginx or CloudFront/ALB) in front of your Node.js app for TLS termination and static asset handling, along with a robust logging/monitoring stack (Winston/Pino + CloudWatch or other observability services).