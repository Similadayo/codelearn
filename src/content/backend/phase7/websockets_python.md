# Real-Time with WebSockets in Python

Real-time WebSocket communication enables servers to push data to clients as events happen, rather than polling. In backend engineering, this is essential for live dashboards, chat, multiplayer games, and collaborative apps. This lesson covers practical patterns, security, scalability, and production considerations using Python.

## 1. Understanding WebSockets: basics and when to use them

WebSockets create a persistent, two-way connection between client and server, allowing messages to flow in both directions with low latency. They’re ideal for live updates, chat, real-time analytics, and streaming data. They differ from HTTP requests in that a single connection stays open, reducing overhead and enabling instant message delivery.

Example 1: Simple WebSocket server using the websockets library (asyncio)

```python
import asyncio
import websockets

async def echo(websocket, path):
    async for message in websocket:
        await websocket.send(message)

start_server = websockets.serve(
    echo, "localhost", 8765, ping_interval=20, ping_timeout=20
)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
```

### Line-by-line explanation
- import asyncio and websockets: bring in the async runtime and WebSocket library.
- async def echo(websocket, path): define a handler for each connection.
- async for message in websocket: receive messages from the client as they arrive.
- await websocket.send(message): echo the received message back to the client.
- websockets.serve(...): start a WebSocket server on localhost:8765 with keepalive pings.
- asyncio.get_event_loop().run_until_complete(start_server): initialize the server.
- asyncio.get_event_loop().run_forever(): run the event loop indefinitely.

## 2. WebSocket with FastAPI: building a practical endpoint

FastAPI (ASGI) provides first-class support for WebSockets, with clean routing, dependency injection, and automatic docs. This pattern shows a per-connection broadcast to all connected clients.

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Set

app = FastAPI()
active_connections: Set[WebSocket] = set()

async def broadcast(message: str):
    to_remove = []
    for ws in active_connections:
        try:
            await ws.send_text(message)
        except WebSocketDisconnect:
            to_remove.append(ws)
    for ws in to_remove:
        active_connections.discard(ws)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await broadcast(f"Echo: {data}")
    except WebSocketDisconnect:
        active_connections.discard(websocket)
```

### Line-by-line explanation
- from fastapi import FastAPI, WebSocket, WebSocketDisconnect: import FastAPI and WebSocket utilities.
- app = FastAPI(): create the FastAPI app instance.
- active_connections: a set of currently connected WebSocket objects.
- async def broadcast(message): helper to push a message to all connected clients, removing disconnected ones.
- for ws in active_connections: iterate over live connections to deliver the message.
- await ws.send_text(message): send the payload to a client.
- except WebSocketDisconnect: catch client disconnects and mark the connection for removal.
- @app.websocket("/ws"): define a WebSocket route at /ws.
- await websocket.accept(): complete the WebSocket handshake.
- active_connections.add(websocket): track the new connection.
- while True: continuously listen for messages from the client.
- data = await websocket.receive_text(): receive a message from the client.
- await broadcast(...): broadcast the message to all connected peers.
- active_connections.discard(websocket): remove the disconnected socket on exit.

## 3. Authentication and security for WebSockets

Real systems should verify clients before delivering data. A common pattern is to require a JWT in the Authorization header during the handshake and validate it on connect.

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import jwt
from jwt import PyJWTError
import asyncio

SECRET_KEY = "supersecret"
ALGORITHM = "HS256"

def verify_jwt_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except PyJWTError:
        return None

app = FastAPI()
rooms: dict[str, set[WebSocket]] = {}

async def get_current_user(websocket: WebSocket):
    auth = websocket.headers.get("Authorization")
    token = None
    if auth and auth.lower().startswith("bearer "):
        token = auth[7:]
    if token is None:
        await websocket.close(code=1008)
        raise RuntimeError("Missing token")
    user = verify_jwt_token(token)
    if user is None:
        await websocket.close(code=1008)
        raise RuntimeError("Invalid token")
    return user

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    user = await get_current_user(websocket)
    room = rooms.setdefault(room_id, set())
    room.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to other members in the same room
            await asyncio.gather(
                *[
                    ws.send_text(f"{user['sub']}: {data}")
                    for ws in room if ws is not websocket
                ]
            )
    except WebSocketDisconnect:
        room.discard(websocket)
```

### Line-by-line explanation
- import jwt and PyJWTError for token handling.
- SECRET_KEY and ALGORITHM define the signing method for JWTs.
- verify_jwt_token(token): decodes and validates the token, returning payload or None.
- get_current_user(websocket): extracts the Bearer token from the Authorization header and validates it.
- If token missing/invalid, close connection with code 1008 (policy violation).
- @app.websocket("/ws/{room_id}"): WebSocket per-room endpoint.
- await websocket.accept(): begin the handshake.
- room = rooms.setdefault(...): ensure a room-level container exists for this room.
- room.add(websocket): register the client in the room.
- Inside the loop: receive a message and broadcast to other room members.
- WebSocketDisconnect: remove the client from the room on disconnect.

Note: In production, consider using a dedicated auth/identity service and rotating keys, and avoid storing user state directly on the connection object.

## 4. Broadcasting, rooms, and state management at scale

In real apps you’ll manage rooms or channels and handle many clients. This example demonstrates per-room state with in-memory tracking in a single process. For multi-process/scale-out deployments, you’ll typically use a message broker (Redis, Pub/Sub) to propagate messages across workers.

```python
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set

app = FastAPI()
rooms: Dict[str, Set[WebSocket]] = {}

async def broadcast_to_room(room_id: str, message: str, sender: WebSocket | None = None):
    recipients = rooms.get(room_id, set())
    await asyncio.gather(*[
        ws.send_text(message) for ws in recipients if ws is not sender
    ])

@app.websocket("/ws/{room_id}")
async def ws_room(websocket: WebSocket, room_id: str):
    await websocket.accept()
    room = rooms.setdefault(room_id, set())
    room.add(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            await broadcast_to_room(room_id, f"[{room_id}] {msg}", sender=websocket)
    except WebSocketDisconnect:
        room.remove(websocket)
```

### Line-by-line explanation
- Define a per-room mapping: rooms[target_room] holds a set of WebSocket connections.
- broadcast_to_room(room_id, message, sender=None): send a message to all in the room except the sender.
- In ws_room handler: accept the connection, register the client, and process incoming messages.
- On disconnect, remove the client from the room.

Scaling note: In a multi-process or multi-server deployment, in-memory room tracking won’t be shared across processes. Use Redis Pub/Sub or a message broker to propagate messages to all worker instances, and designate a single source of truth for room membership.

## 5. Production considerations: scaling, heartbeats, retries, and persistence

- Heartbeat and keep-alives: Use ping/pong or a periodic keepalive to detect dead peers. The websockets library can be configured with ping_interval and ping_timeout to detect broken connections early.
- Load balancing: If you scale to multiple application servers, you need a central message broker (Redis, RabbitMQ) or a WebSocket-aware gateway that can distribute messages to all clients regardless of which server they connected to.
- Authentication and authorization: Validate tokens at handshake, rotate keys, and cache user metadata to minimize repeated token validation costs.
- Observability: Instrument latency, message rates, error rates, and connection churn. Collect metrics from your WebSocket endpoints and background workers.
- Fault tolerance: Graceful shutdowns, reconnect strategies for clients, and backpressure handling when message rates spike.

Example: enabling keep-alives in a Python WebSocket server

```python
# For the 'websockets' library
start_server = websockets.serve(
    echo, "localhost", 8765, ping_interval=20, ping_timeout=20
)
```

Example: a Redis-backed Pub/Sub pattern (high-level sketch)

```python
# This is a high-level sketch; actual implementation requires wiring
# aioredis, background tasks, and careful subscription management.

import asyncio
import aioredis
import json

redis = None  # initialize Redis connection pool

rooms = {}  # local per-process room mapping

async def publish_message(room_id: str, text: str):
    await redis.publish_json(f"ws_room:{room_id}", {"room": room_id, "text": text})

async def subscribe_loop():
    pubsub = redis.pubsub()
    await pubsub.subscribe("ws_broadcast")
    async for item in pubsub.listen():
        if item['type'] == 'message':
            payload = json.loads(item['data'])
            room = payload['room']
            text = payload['text']
            # forward to all local WebSocket connections for the room
            for ws in rooms.get(room, set()):
                await ws.send_text(text)
```

### Line-by-line explanation
- Set up a Redis pub/sub channel per room to broadcast messages across workers.
- publish_message publishes to a Redis channel indicating room and text.
- subscribe_loop listens for messages and forwards them to local connections for the relevant room.
- This approach scales across multiple application instances by using Redis as the central broker.

## X. Common Beginner Mistakes

### 1) Not handling disconnects properly

Bad
```python
async def handler(websocket: WebSocket):
    while True:
        msg = await websocket.receive_text()
        await websocket.send_text(f"Echo: {msg}")
```

Good
```python
async def handler(websocket: WebSocket):
    try:
        while True:
            msg = await websocket.receive_text()
            await websocket.send_text(f"Echo: {msg}")
    except WebSocketDisconnect:
        # clean up resources here
        pass
```

### 2) Relying on in-memory state across processes for rooms

Bad
```python
rooms = {}

async def join(room_id: str, ws: WebSocket):
    rooms[room_id].add(ws)  # fails if rooms is not shared across processes
```

Good
- Use a central store (Redis, database) or a pub/sub broker to coordinate across servers; keep per-process in-memory rooms only for local connections.

### 3) Blocking the event loop with synchronous I/O

Bad
```python
async def handler(websocket: WebSocket):
    data = slow_blocking_io()
    await websocket.send_text(data)
```

Good
```python
import asyncio

async def handler(websocket: WebSocket):
    data = await asyncio.to_thread(slow_blocking_io)
    await websocket.send_text(data)
```

### 4) Skipping authentication or insecure token handling

Bad
```python
async def ws(websocket: WebSocket):
    await websocket.accept()
    # No auth check
```

Good
```python
async def ws(websocket: WebSocket):
    auth = websocket.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        await websocket.close(code=1008)
        return
    token = auth.split(" ", 1)[1]
    user = verify_jwt_token(token)
    if not user:
        await websocket.close(code=1008)
        return
    await websocket.accept()
```

## Y. Why This Matters In Real Systems

- Real-time features dramatically improve user experience (live dashboards, chat, notifications), but they introduce complexity around state, scalability, and reliability.
- Production systems must handle multi-process/multi-server deployments. In-memory per-process state is insufficient; you need a broker (Redis/RabbitMQ) or a dedicated WebSocket gateway to route messages consistently.
- Observability is crucial: track latency, message counts, error rates, and connection churn. Implement structured logging, metrics (latency histograms, percentiles), and tracing across WebSocket flows.
- Security is non-negotiable: enforce authentication on handshake, validate tokens, rotate credentials, and protect against abuse (rate limits, proper closure codes on policy violations).
- Resilience requires heartbeat mechanisms, reconnection strategies on the client side, and graceful degradation when backend services fail or scale-out occurs.

## Z. Study Questions

1) What is the main difference between HTTP long polling and WebSockets in terms of connection behavior?
2) How can you broadcast a message to all clients connected to a specific room in FastAPI?
3) Why is in-memory per-process state insufficient for horizontally scaled WebSocket servers?
4) What header is commonly used to pass a JWT for WebSocket authentication, and how would you validate it on connect?
5) Name two production strategies to scale WebSocket workloads across multiple server instances.

## Exercise

A multi-part practical coding challenge to solidify Real-Time with WebSockets patterns.

Part 0 — Prerequisites
- Install FastAPI and an ASGI server (e.g., uvicorn).
- If you choose the Redis path for Part 4, install aioredis and a Redis server.

Part 1 — Build a per-room echo server (FastAPI)
- Create a FastAPI app with a WebSocket endpoint at /ws/{room_id}.
- Maintain a per-room set of connected clients in memory.
- On receiving a message from a client, broadcast it to all other clients in the same room.
- Add basic exception handling for disconnects.

Expected tasks:
- Implement the WebSocket route.
- Implement per-room broadcast logic.
- Ensure no errors occur when clients disconnect.

Part 2 — Add JWT authentication
- Require a JWT in the Authorization: Bearer <token> header during handshake.
- Verify the token using a shared secret.
- On connect, print or log the user identifier, and include the user name in broadcasted messages (e.g., "[roomA] user1: hello").

Part 3 — Implement heartbeat
- Configure a ping interval (if using the websockets library) or implement a lightweight client-side heartbeat to keep connections alive and detect dead peers quickly.

Part 4 — Scale with Redis Pub/Sub (optional, advanced)
- Extend the architecture to broadcast messages across multiple server instances using Redis Pub/Sub.
- Each server subscribes to a room channel (ws_room:{room_id}) and forwards messages to its local connected clients.
- When a client sends a message, publish it to the Redis channel so every other server broadcasts to their local clients.

Part 5 — Basic client example
- Write a small Python client that connects to the WebSocket server at /ws/{room_id}, sends a few messages, and prints incoming messages.
- Run the client against the server and verify broadcast behavior within the same room.

Deliverable
- A self-contained Python module (or set of modules) demonstrating the per-room WebSocket server with optional JWT authentication and Redis-based scaling path.
- Include clear comments and ensure code blocks are readable and executable with minor adjustments (secret keys, Redis URL) for real testing.

If you’d like, I can tailor the exercise to your preferred stack (e.g., FastAPI-only, or using Django Channels), or provide a ready-to-run repository skeleton with tests.