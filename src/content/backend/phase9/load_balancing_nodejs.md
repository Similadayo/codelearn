# Load Balancing & Horizontal Scaling in Node.js

Compelling introductory paragraph: In backend engineering, load balancing and horizontal scaling are essential for building resilient, high-throughput services. Load balancing distributes incoming requests across multiple server instances, while horizontal scaling increases capacity by adding more instances rather than upgrading a single machine. In Node.js environments, these concepts are particularly important because Node apps are often I/O-bound and deployed behind reverse proxies or orchestration systems. Mastering clustering, stateless design, external session stores, health checks, and graceful shutdowns lets you leverage multi-core CPUs, handle traffic spikes, and reduce single points of failure in production.

## 1. Core Concepts: Horizontal Scaling, Statelessness, and In-process Clustering

This section introduces the baseline concepts and shows a simple in-process clustering example using Node's cluster module. The code demonstrates how a single Node process can spawn multiple workers to utilize all CPU cores and handle requests concurrently.

```js
// cluster_example.js
const cluster = require('cluster');
const http = require('http');
const os = require('os');

const port = process.env.PORT || 3000;

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Master ${process.pid} is running with ${numCPUs} CPUs`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new worker...`);
    cluster.fork();
  });
} else {
  // Workers share the same port; the OS distributes connections across workers
  http.createServer((req, res) => {
    // Simulated work
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Hello from worker ${process.pid}\n`);
  }).listen(port, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });
}
```

### Line-by-line explanation
- Line 1: Import the cluster module to create a master/worker setup.
- Line 2: Import the http module to serve requests.
- Line 3: Import the os module to query CPU core count.
- Line 5: Define the port from env or default to 3000.
- Line 7: Check if the current process is the master.
- Line 8: Get the number of CPU cores for scaling.
- Line 9: Log the master PID and core count.
- Line 12-14: Fork a worker process for each CPU core.
- Line 16-19: Listen for worker exit events and replace died workers.
- Line 21: Else branch indicates we are in a worker process.
- Line 23-28: Create an HTTP server that responds with the worker PID.
- Line 29-30: Start listening on the designated port and log the worker start.

## 2. Practical Clustering: Graceful Shutdown & Health in a Clustered Node.js App

This section extends clustering with graceful shutdown and readiness. It demonstrates how to tell workers to stop accepting new connections and how to shut down cleanly, which is critical for rolling deployments and high-availability services.

```js
// cluster_graceful_shutdown.js
const cluster = require('cluster');
const http = require('http');
const os = require('os');

const port = process.env.PORT || 3000;

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  // Graceful shutdown handlers
  const shutdown = () => {
    console.log('Master initiating graceful shutdown...');
    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
    }
    setTimeout(() => process.exit(0), 5000); // force exit after timeout
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} exited (${signal || code}).`);
  });
} else {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Worker ${process.pid} response\n`);
  });

  server.listen(port, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });

  // Listen for shutdown command from master
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      // Stop accepting new connections, then exit when existing are done
      server.close(() => {
        process.exit(0);
      });
      // Force exit if not closed in time
      setTimeout(() => process.exit(0), 5000);
    }
  });
}
```

### Line-by-line explanation
- Line 1-3: Import modules for clustering, HTTP, and OS CPU detection.
- Line 5: Set the listening port.
- Line 7: Master check.
- Line 8-9: Determine CPU cores and spawn workers.
- Lines 11-18: Define a shutdown function that tells workers to shut down and then exits.
- Lines 20-21: Bind SIGINT/SIGTERM to trigger graceful shutdown.
- Lines 23-28: Log worker exits and restarts behavior.
- Line 30: Worker branch begins.
- Line 31-40: Create and start an HTTP server in the worker.
- Line 43-50: Listen for master messages; on 'shutdown', close the server gracefully and exit.

### Caveat
- Node's cluster distributes incoming connections for you when workers share a single port. In production you often pair this with an external load balancer (Nginx/HAProxy) and/or container orchestration (Kubernetes) to route traffic across many port-bound services or pods.

## 3. External Load Balancing & Stateless Design: Nginx in Front of Multiple Node Instances

In production, a reverse proxy/load balancer (like Nginx or HAProxy) distributes traffic to a pool of backend instances. Stateless services are easier to scale because no session data is tied to a single instance. Here we show two patterns:
- A) A single Node process cluster behind a local proxy (OS load balancing among workers).
- B) A pool of separate Node processes on different ports with an external LB.

A) Nginx upstream for a pool of backend ports
```nginx
# nginx_load_balancer.conf
upstream node_backend {
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
  server 127.0.0.1:3002;
}

server {
  listen 80;
  server_name example.local;

  location / {
    proxy_pass http://node_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /healthz {
    return 200 'OK';
  }
}
```

B) Example of running multiple Node processes on different ports
```bash
# Start three independent Node processes on ports 3000, 3001, 3002
PORT=3000 node simple_server.js &
PORT=3001 node simple_server.js &
PORT=3002 node simple_server.js &
```

C) Simple backend server (port-configurable)
```js
// simple_server.js
const http = require('http');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Hello from PID ${process.pid} on port ${port}\n`);
}).listen(port, () => {
  console.log(`Listening on port ${port}`);
});
```

### Line-by-line explanation
- Nginx config: Upstream block defines a pool of backend endpoints. Each server line points to a different port on localhost (or a different host). The server block forwards all requests to the upstream group, enabling load balancing at the edge.
- Health route: The /healthz location serves a quick, light-weight health check for orchestration systems.
- Multi-port strategy: Running separate Node processes on distinct ports lets the external LB distribute traffic when you’re not relying on Node’s cluster port sharing.
- Node server code: Creates an HTTP server that listens on a configurable port and returns a message including the process ID, useful for demonstration of distribution.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Single-process Node.js, no clustering
  - Bad:
    ```js
    // bad_single_process.js
    const http = require('http');
    const port = 3000;
    http.createServer((req, res) => {
      res.end(`Hello from PID ${process.pid}`);
    }).listen(port, () => console.log('Listening on', port));
    ```
  - Good:
    ```js
    // good_cluster.js
    const cluster = require('cluster');
    const http = require('http');
    const os = require('os');
    const port = process.env.PORT || 3000;

    if (cluster.isMaster) {
      const n = os.cpus().length;
      for (let i = 0; i < n; i++) cluster.fork();
      cluster.on('exit', () => cluster.fork());
    } else {
      http.createServer((req, res) => {
        res.end(`Hello from PID ${process.pid}`);
      }).listen(port);
    }
    ```
- Pitfall 2: Storing session data in memory on a single instance
  - Bad (in-memory session)
    ```js
    // bad_in_memory_session.js
    const express = require('express');
    const session = require('express-session');
    const app = express();

    app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: true }));
    app.get('/', (req, res) => {
      req.session.views = (req.session.views || 0) + 1;
      res.send(`Views: ${req.session.views}`);
    });
    app.listen(3000);
    ```
  - Good (external store, e.g., Redis)
    ```js
    // good_redis_session.js
    const express = require('express');
    const session = require('express-session');
    const RedisStore = require('connect-redis')(session);
    const redis = require('ioredis');
    const app = express();

    const redisClient = new Redis({ host: 'localhost', port: 6379 });
    app.use(session({
      store: new RedisStore({ client: redisClient }),
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: true
    }));
    app.get('/', (req, res) => {
      req.session.views = (req.session.views || 0) + 1;
      res.send(`Views: ${req.session.views}`);
    });
    app.listen(3000);
    ```
- Pitfall 3: No health check or poor health check
  - Bad
    ```js
    // bad_healthcheck.js
    const http = require('http');
    http.createServer((req, res) => res.end('OK')).listen(3000);
    ```
  - Good
    ```js
    // good_healthcheck.js
    const express = require('express');
    const app = express();
    app.get('/healthz', (req, res) => res.status(200).send('OK'));
    app.listen(3000);
    ```
- Pitfall 4: Naive graceful shutdown that abruptly kills connections
  - Bad
    ```js
    // bad_graceful.js
    const http = require('http');
    const server = http.createServer((req, res) => res.end('hi'));
    server.listen(3000);
    process.on('SIGINT', () => process.exit(0));
    ```
  - Good
    ```js
    // good_graceful.js
    const http = require('http');
    const server = http.createServer((req, res) => res.end('hi'));
    server.listen(3000);

    process.on('SIGINT', () => {
      server.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 5000);
    });
    ```

## 5. Why This Matters In Real Systems

In real systems, load balancing and horizontal scaling are central to meeting SLA targets and minimizing downtime. Production realities include:
- Traffic spikes and seasonal workloads: autoscaling and rapid provisioning of new instances help maintain response times.
- Stateless services: by avoiding per-instance credentials, sessions, or ephemeral data in memory, you enable seamless scaling and you can vertically or horizontally scale without complex data migrations.
- External state stores: Redis, Memcached, or databases become the single source of truth for sessions, caches, and coordination, enabling cross-instance consistency.
- Health checks and graceful degradation: orchestrators rely on health endpoints to terminate unhealthy pods/intervene during failures without user-visible disruption.
- Observability: metrics, traces, and logs from proxies, load balancers, and app instances guide autoscaling decisions and incident response.
- Deployment patterns: Kubernetes, Docker Swarm, or cloud-native services provide automated rolling upgrades, health checks, and horizontal scaling.

Kubernetes example (conceptual)
- Deployments manage replicas.
- HorizontalPodAutoscaler (HPA) adjusts replicas based on CPU/mrequency metrics.
- Ingress or a Service with a LoadBalancer provides external load balancing.
- Readiness and liveness probes drive healthy/unhealthy state decisions.

YAML snippet (conceptual)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: node-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: node-backend
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

Real-world considerations:
- Choose stateless design for ease of scale; use Redis/Memcached to share cache and sessions.
- Use a robust load balancer and health checks; implement readiness and liveness probes.
- Use atomic deployments and rolling updates to minimize user impact.
- Instrument and observe: latency percentiles, error rates, throughput, and saturation indicators guide autoscaling thresholds.

## Z. Study Questions

1. What is horizontal scaling, and how does it differ from vertical scaling?
2. How does Node.js cluster help utilize multi-core CPUs, and what are its limitations?
3. Why is statelessness important in a horizontally scaled system?
4. What is the role of a health check endpoint in production, and what should it typically verify?
5. Describe a graceful shutdown procedure in a clustered Node.js app and why it matters.

## Exercise

Part A — Build a clustered HTTP server
- Objective: Create a cluster-enabled Node.js server that serves a simple endpoint and utilizes all CPU cores.
- Deliverables:
  - A file named cluster_exercise.js implementing a master that forks workers and a worker that serves HTTP requests.
  - The server should respond with the worker PID and a timestamp.

Part B — Add graceful shutdown and a health endpoint
- Extend cluster_exercise.js to:
  - Expose a /healthz endpoint that returns 200 OK.
  - Implement a graceful shutdown sequence when the master receives SIGINT or SIGTERM, which shuts down workers gracefully within a timeout.

Part C — Stateless session design with Redis (optional advance)
- Objective: Convert a simple Express app into a stateless design by using Redis for sessions.
- Deliverables:
  - A file named redis_session_example.js showing:
    - An Express app that uses express-session with connect-redis as the store.
    - A route /visit that increments and returns a visit counter stored in Redis.
  - Instructions to install dependencies: npm i express express-session connect-redis ioredis

Part D — Lightweight multi-port setup behind a local LB (optional)
- Objective: Demonstrate how an external load balancer would forward requests to multiple Node processes.
- Deliverables:
  - A script simple_server.js that reads process.env.PORT and starts an HTTP server that responds with the port and PID.
  - A Bash snippet to launch three separate Node processes on ports 3000, 3001, and 3002.
  - Nginx or HAProxy config snippet showing an upstream group across those ports (as shown in section 3).

Part E — Validation
- Run the cluster and expansion scenario:
  - Start the cluster_exercise.js with the environment port if needed.
  - Simulate terminal interrupts (Ctrl+C) to observe graceful shutdown.
  - Use curl to hit http://localhost:3000/healthz and http://localhost:3000/ to confirm responses.
  - If you implemented Redis sessions, curl /visit multiple times to verify the increment is persisted in Redis.

Notes
- You can run scripts locally to observe behavior, understanding that production deployments would use orchestration and a dedicated load balancer.
- If you choose to implement Part C, ensure Redis is running locally or adjust host/port settings accordingly.

This lesson provides a structured, practical approach to load balancing and horizontal scaling in Node.js, with concrete code examples, production-oriented best practices, and hands-on exercises to reinforce concepts.