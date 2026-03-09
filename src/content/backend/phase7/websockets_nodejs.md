# Real-Time with WebSockets in Node.js

Track: Backend Engineering | Module: Phase 7 — Advanced API Features | Topic: Real-Time with WebSockets (JavaScript / Node.js)

Real-time features unlock live, bi-directional communication between servers and clients. WebSockets provide a persistent connection that enables low-latency data exchange, ideal for chat, live dashboards, notifications, collaboration tools, and gaming backends. This lesson builds a robust WebSocket server using Node.js and the ws library, covers connection management, rooms/subscriptions, authentication, and production considerations.

## 1. WebSocket Fundamentals and Protocols

This section introduces the core concepts of WebSockets, how the handshake works, and a simple echo server to illustrate full-duplex communication.

```js
// 1. Minimal WebSocket echo server using ws
// Install: npm install ws
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  // Send a welcome message upon connection
  ws.send('Welcome! You are connected to the WebSocket server.');

  // Echo any received message back to the sender
  ws.on('message', (message) => {
    ws.send(`Echo: ${message}`);
  });
});
```

### Line-by-line explanation
- // 1. Minimal WebSocket echo server using ws
  - Comment describing the file purpose.
- // Install: npm install ws
  - Note to install the ws library.
- const WebSocket = require('ws');
  - Import the ws module to create a WebSocket server.
- const wss = new WebSocket.Server({ port: 8080 });
  - Create a WebSocket server listening on port 8080.
- wss.on('connection', (ws) => { ... });
  - Register a listener for new client connections. Each connection gets its own ws socket.
- ws.send('Welcome! ...');
  - Send a welcome message to the newly connected client.
- ws.on('message', (message) => { ... });
  - Listen for messages from the connected client.
- ws.send(`Echo: ${message}`);
  - Respond back with the received message, prefixed as an echo.

## 2. Production-Ready Server with Heartbeat and Broadcast

This section expands to a production-friendly WebSocket server. It includes a heartbeat (ping/pong) to detect dead connections, structured JSON messaging, and a simple broadcast mechanism.

```js
// 2. Production-ready WSS with heartbeat and broadcast
// Install: npm install ws
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

function noop() {}
function heartbeat() { this.isAlive = true; }

// Handle new connections with per-connection lifecycle
wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', (data) => {
    // Expect JSON with type and payload
    let msg;
    try { msg = JSON.parse(data); } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
      return;
    }

    // Simple message routing
    if (msg.type === 'broadcast') {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'broadcast', payload: msg.payload }));
        }
      });
    } else {
      ws.send(JSON.stringify({ type: 'error', error: 'Unknown type' }));
    }
  });
});

// Heartbeat interval to detect dead connections
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

wss.on('close', function () {
  clearInterval(interval);
});

server.listen(8080);
```

### Line-by-line explanation
- // 2. Production-ready WSS with heartbeat and broadcast
  - Comment describing the file purpose.
- const http = require('http');
  - Import the Node.js HTTP module to create a base server.
- const WebSocket = require('ws');
  - Import the ws library.
- const server = http.createServer();
  - Create a simple HTTP server to attach WebSocket upgrade requests.
- const wss = new WebSocket.Server({ server });
  - Bind a WebSocket server to the HTTP server.
- function noop() {}
  - No-op function used for the ping callback.
- function heartbeat() { this.isAlive = true; }
  - Mark a connection as alive when a pong is received.
- wss.on('connection', function connection(ws) { ... });
  - Handle new client connections.
- ws.isAlive = true;
  - Initialize the alive flag for the connection.
- ws.on('pong', heartbeat);
  - Listen for pong frames to reset the heartbeat.
- ws.on('message', (data) => { ... });
  - Process incoming messages, expecting JSON.
- let msg; try { msg = JSON.parse(data); } catch (e) { ... }
  - Safely parse JSON; on failure, send an error.
- if (msg.type === 'broadcast') { ... }
  - Route broadcast messages to all connected clients.
- wss.clients.forEach((client) => { ... });
  - Iterate over connected clients to broadcast.
- client.readyState === WebSocket.OPEN
  - Only send to open connections.
- const interval = setInterval(function ping() { ... }, 30000);
  - Periodically ping clients to detect dead connections.
- if (ws.isAlive === false) return ws.terminate();
  - Terminate dead connections promptly.
- ws.isAlive = false; ws.ping(noop);
  - Mark as not alive and ping to check status.
- wss.on('close', function () { clearInterval(interval); });
  - Clean up heartbeat on shutdown.
- server.listen(8080);
  - Start listening for connections on port 8080.

### Line-by-line explanation
- The heartbeat and ping/pong logic ensure we can detect and drop dead connections, which is crucial for long-lived real-time channels in production.
- The broadcast path demonstrates how to push a message to all connected peers in a scalable way (subject to capacity and backpressure in more advanced setups).

## 3. Handling Rooms, Subscriptions, and Auth

This section demonstrates organizing clients into rooms (subscriptions) and applying simple token-based authentication during handshake.

```js
// 3. Rooms + token auth (simple demo)
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const server = http.createServer((req, res) => {
  res.end('WebSocket server with rooms');
});
const wss = new WebSocket.Server({ server });

const rooms = new Map(); // roomName -> Set of ws

function addToRoom(room, ws) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
}
function removeFromAllRooms(ws) {
  for (const [room, set] of rooms.entries()) {
    if (set.has(ws)) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(room);
    }
  }
}
function broadcastToRoom(room, msg) {
  const set = rooms.get(room);
  if (!set) return;
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'room', room, payload: msg }));
    }
  }
}

wss.on('connection', function connection(ws, req) {
  const parameters = url.parse(req.url, true);
  const token = (parameters.query && parameters.query.token) || '';

  // naive token check (demo only)
  if (token !== 'letmein') {
    ws.close(1008, 'Invalid token');
    return;
  }

  ws.on('message', function incoming(data) {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' })); return; }

    if (msg.action === 'join') {
      const room = msg.room;
      ws.room = room;
      addToRoom(room, ws);
      ws.send(JSON.stringify({ type: 'joined', room }));
    } else if (msg.action === 'leave') {
      const room = ws.room;
      if (room) {
        removeFromAllRooms(ws);
        ws.room = null;
        ws.send(JSON.stringify({ type: 'left', room }));
      }
    } else if (msg.action === 'send') {
      if (!ws.room) return ws.send(JSON.stringify({ type: 'error', error: 'Not in a room' }));
      broadcastToRoom(ws.room, msg.payload);
    }
  });

  ws.on('close', () => removeFromAllRooms(ws));
  ws.send(JSON.stringify({ type: 'connected' }));
});
```

### Line-by-line explanation
- // 3. Rooms + token auth (simple demo)
  - Comment describing the feature set.
- const url = require('url');
  - Bring in URL parsing to extract query parameters for token checks.
- const server = http.createServer(...);
  - Basic HTTP server to attach WebSocket upgrade requests.
- const wss = new WebSocket.Server({ server });
  - Bind ws to the HTTP server.
- const rooms = new Map();
  - In-memory structure to track room memberships.
- function addToRoom(room, ws) { ... }
  - Helper to join a client to a room.
- function removeFromAllRooms(ws) { ... }
  - Cleanup function to remove a client from all rooms on disconnect.
- function broadcastToRoom(room, msg) { ... }
  - Send a message to all clients in a specific room.
- wss.on('connection', function connection(ws, req) { ... });
  - Connection handler with handshake context (req) for token validation.
- const parameters = url.parse(req.url, true);
  - Parse the incoming request URL to access query parameters.
- const token = (parameters.query && parameters.query.token) || '';
  - Extract token from the query string.
- if (token !== 'letmein') { ws.close(...); return; }
  - Simple auth gate; in production, use a robust auth strategy.
- ws.on('message', function incoming(data) { ... });
  - Interpret client messages as JSON commands with actions like join/leave/send.
- if (msg.action === 'join') { ... }
  - Add the client to a named room and acknowledge.
- else if (msg.action === 'leave') { ... }
  - Remove client from current room and acknowledge.
- else if (msg.action === 'send') { ... }
  - Broadcast a payload to all room members.
- ws.on('close', () => removeFromAllRooms(ws));
  - Ensure cleanup on disconnect.
- ws.send(JSON.stringify({ type: 'connected' }));
  - Initial handshake acknowledgment.

## X. Common Beginner Mistakes

Bad vs Good: three representative pitfalls when implementing WebSocket backends.

- Pitfall 1: No heartbeat / stale connections
  - Bad:
    ```js
    // Bad: no heartbeat, connections can hang indefinitely
    const wss = new WebSocket.Server({ port: 8080 });
    wss.on('connection', ws => {
      ws.on('message', msg => ws.send(msg));
    });
    ```
  - Good:
    ```js
    // Good: heartbeat to detect dead clients
    const wss = new WebSocket.Server({ port: 8080 });
    function heartbeat() { this.isAlive = true; }
    wss.on('connection', ws => {
      ws.isAlive = true;
      ws.on('pong', heartbeat);
      ws.on('message', msg => ws.send(msg));
    });
    setInterval(() => {
      wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    ```
- Pitfall 2: Unguarded input and insufficient message framing
  - Bad:
    ```js
    // Bad: assume data is always JSON and well-formed
    wss.on('connection', ws => {
      ws.on('message', data => {
        // directly broadcast
        wss.clients.forEach(c => c.send(data));
      });
    });
    ```
  - Good:
    ```js
    // Good: validate JSON, enforce schema, sanitize, limit size
    wss.on('connection', ws => {
      ws.on('message', data => {
        let msg;
        try { msg = JSON.parse(data); } catch (e) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
          return;
        }
        // Enforce a simple schema
        if (typeof msg.type !== 'string') return;
        // Example: handle only known types
        if (msg.type === 'chat' && typeof msg.text === 'string') {
          wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(JSON.stringify({ type: 'chat', text: msg.text })));
        }
      });
    });
    ```
- Pitfall 3: Weak authentication/authorization at handshake
  - Bad:
    ```js
    // Bad: no auth check during connection
    wss.on('connection', ws => {
      ws.send('connected');
    });
    ```
  - Good:
    ```js
    // Good: validate token from query string before accepting the connection
    wss.on('connection', (ws, req) => {
      const { token } = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      if (token !== 'correct-token') {
        ws.close(1008, 'Invalid token');
        return;
      }
      ws.send('connected');
    });
    ```
- Pitfall 4: Resource leaks when clients disconnect
  - Bad:
    ```js
    // Bad: no cleanup; room sets retain dead ws references
    const rooms = new Map();
    wss.on('connection', (ws) => {
      // no cleanup on close
      ws.on('message', (data) => {
        // join/leave without cleanup
      });
    });
    ```
  - Good:
    ```js
    // Good: cleanup on disconnect
    const rooms = new Map();
    wss.on('connection', ws => {
      ws.on('close', () => {
        // remove from all rooms to prevent leaks
        for (const [room, set] of rooms.entries()) set.delete(ws);
      });
    });
    ```

## Y. Why This Matters In Real Systems

- Real-time reliability: Heartbeats and proper close handling prevent resource leaks and phantom connections.
- Scaling: WebSocket servers often run behind load balancers. Sticky sessions or shared state (e.g., Redis Pub/Sub) is needed to broadcast to all instances.
- Authorization and security: Token-based or certificate-based authentication should be enforced at upgrade time; avoid leaking credentials in messages.
- Observability: Implement metrics around active connections, messages per second, latency, error rates, and disconnects.
- Performance and backpressure: Large message bursts require backpressure handling and potentially message queues or chunking to avoid overwhelming clients or servers.
- Proxy/TLS considerations: Ensure reverse proxies (Nginx, Traefik) are configured to support WebSocket upgrades and TLS termination with proper timeout settings.
- Data consistency: For room-based or channel-based messaging, ensure ordered delivery when required and handle out-of-order arrivals if operating in a multi-instance environment.

## Z. Study Questions

1. What differentiates the WebSocket handshake from a regular HTTP request?
2. How does the ping/pong mechanism help maintain a healthy WebSocket connection?
3. Describe a simple approach to implement “rooms” or “topics” for a WebSocket server.
4. Why is it important to authenticate during the handshake rather than only after the connection is established?
5. How would you scale a WebSocket server horizontally behind a load balancer, and what cross-instance coordination techniques might you use?

## Exercise

Build a small, end-to-end WebSocket feature in Node.js covering all major concepts from this lesson.

Part A: Setup
- Create a new Node.js project and install the ws library (npm install ws).
- Start a WebSocket server listening on port 8080.

Part B: Echo + Heartbeat
- Implement a server that echoes messages back to the sender.
- Add a heartbeat mechanism (ping/pong) to detect dead connections and terminate them.

Part C: Rooms / Subscriptions
- Extend the server to support rooms. Clients can send JSON messages to join, leave, or broadcast within a room.
- Example protocol:
  - { "action": "join", "room": "sports" }
  - { "action": "leave" }
  - { "action": "send", "payload": "Hello room" }

Part D: Authentication
- Add a simple token-based authentication step during the handshake. If the token is missing or invalid, close the connection with code 1008.
- Example: clients must connect with a query string like ws://localhost:8080/?token=letmein

Part E: Minimal Client Test
- Create a small Node.js script (client.js) that connects to your server, authenticates with the token, joins a room, and sends a message to that room. Log all received messages to the console.

Deliverables
- A single directory with:
  - server.js (WebSocket server implementing echo, heartbeat, rooms, auth)
  - client.js (simple test client)
  - README.md with setup and usage instructions

Hints
- Use the ws library for both server and client (client can use new WebSocket('ws://localhost:8080/?token=letmein')).
- Ensure your server handles errors gracefully and cleans up on client disconnect.
- Keep code modular: separate helpers for room management and message routing.

This completes a practical, production-oriented module on Real-Time with WebSockets in a Node.js backend stack, embedding robust connection handling, subscription mechanisms, and authentication patterns suitable for real-world systems.