# Phase 7 — Advanced API Features: Real-Time with WebSockets (Java)

Real-time capabilities are a core part of modern backend systems: live dashboards, collaborative apps, and chat services rely on persistent, low-latency connections. WebSockets enable full-duplex communication over a single TCP connection, allowing servers to push updates to clients instantly and clients to send actions without repeated HTTP handshakes. In Java, you can implement WebSockets with the Java API for WebSocket (JSR 356) or via framework abstractions (e.g., Spring WebSocket). This lesson focuses on a solid, framework-agnostic approach using the standard server endpoint model, then expands to room-based broadcasting, a structured message protocol, cross-instance scalability with Redis Pub/Sub, and practical security/observability patterns. By the end, you’ll be able to build robust real-time endpoints suitable for production workloads.

## 1. WebSocket Fundamentals in Java

This section covers a minimal, working WebSocket server endpoint that accepts connections, broadcasts incoming messages to all connected clients, and handles basic lifecycle events.

Code block:
```java
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@ServerEndpoint("/ws/global")
public class GlobalWebSocketEndpoint {
    // Thread-safe collection to track active sessions
    private static final Set<Session> SESSIONS =
        Collections.synchronizedSet(new HashSet<>());

    // Called when a new client connects
    @OnOpen
    public void onOpen(Session session) {
        SESSIONS.add(session);
        System.out.println("New client connected: " + session.getId());
    }

    // Called when a message is received from a client
    @OnMessage
    public void onMessage(String message, Session session) {
        // Broadcast the message to all connected clients
        synchronized (SESSIONS) {
            for (Session s : SESSIONS) {
                if (s.isOpen()) {
                    s.getAsyncRemote().sendText(message);
                }
            }
        }
    }

    // Called when a client disconnects
    @OnClose
    public void onClose(Session session) {
        SESSIONS.remove(session);
        System.out.println("Client disconnected: " + session.getId());
    }

    // Called when an error occurs in the WebSocket
    @OnError
    public void onError(Session session, Throwable t) {
        System.err.println("Error on session " + session.getId() + ": " + t.getMessage());
        t.printStackTrace();
    }
}
```

### Line-by-line explanation breaking down each line

- import javax.websocket.OnClose; … imports: Bring in JSR 356 annotations and Session class for lifecycle handling.
- import java.util.Collections; java.util.HashSet; java.util.Set;: Utilities to manage a thread-safe collection of sessions.
- @ServerEndpoint("/ws/global"): Declares this class as a WebSocket endpoint available at the path /ws/global.
- private static final Set<Session> SESSIONS = Collections.synchronizedSet(new HashSet<>());: Creates a thread-safe, shared set to track active client sessions.
- @OnOpen public void onOpen(Session session): Lifecycle hook invoked when a client connects; adds the session to the set.
- @OnMessage public void onMessage(String message, Session session): Called when a client sends a message; iterates over all sessions and sends the message asynchronously to each open session.
- if (s.isOpen()) { s.getAsyncRemote().sendText(message); }: Checks that the recipient is still connected, then uses asynchronous IO to avoid blocking.
- @OnClose public void onClose(Session session): Cleanup by removing the session from the active set when a client disconnects.
- @OnError public void onError(Session session, Throwable t): Logs and surfaces errors for operational visibility.

## 2. Managing Connections and Rooms

Real-world apps often group clients into rooms or topics. This section shows a room-based endpoint that subscribes clients to a specific room (path parameter) and broadcasts messages only within that room.

Code block:
```java
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;

import java.util.*;

@ServerEndpoint(value = "/ws/chat/{room}")
public class RoomWebSocketEndpoint {
    // Map of room name to the set of sessions subscribed to that room
    private static final Map<String, Set<Session>> ROOM_SESSIONS =
        Collections.synchronizedMap(new HashMap<>());

    @OnOpen
    public void onOpen(Session session, @PathParam("room") String room) {
        joinRoom(room, session);
        System.out.println("Session " + session.getId() + " joined room: " + room);
    }

    @OnMessage
    public void onMessage(String message, Session session, @PathParam("room") String room) {
        broadcast(room, message);
    }

    @OnClose
    public void onClose(Session session, @PathParam("room") String room) {
        leaveRoom(room, session);
        System.out.println("Session " + session.getId() + " left room: " + room);
    }

    @OnError
    public void onError(Session session, Throwable t, @PathParam("room") String room) {
        System.err.println("Error in room " + room + " for session " + session.getId() + ": " + t.getMessage());
        t.printStackTrace();
    }

    private void joinRoom(String room, Session session) {
        ROOM_SESSIONS.computeIfAbsent(room, r -> Collections.synchronizedSet(new HashSet<>()))
                    .add(session);
    }

    private void leaveRoom(String room, Session session) {
        Set<Session> set = ROOM_SESSIONS.get(room);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) {
                ROOM_SESSIONS.remove(room);
            }
        }
    }

    private void broadcast(String room, String message) {
        Set<Session> sessions = ROOM_SESSIONS.getOrDefault(room, Collections.emptySet());
        for (Session s : sessions) {
            if (s.isOpen()) {
                s.getAsyncRemote().sendText(message);
            }
        }
    }
}
```

### Line-by-line explanation breaking down each line

- private static final Map<String, Set<Session>> ROOM_SESSIONS = Collections.synchronizedMap(new HashMap<>());: Maintains per-room session sets with synchronized access for thread-safety.
- @OnOpen public void onOpen(Session session, @PathParam("room") String room): Handles new connection; adds the session to the requested room.
- joinRoom(room, session);: Helper to add the session to the room’s set; creates the set if needed.
- @OnMessage public void onMessage(String message, Session session, @PathParam("room") String room): Receives a message and broadcasts it to all clients in the same room.
- broadcast(room, message);: Helper to iterate through the room’s subscriber sessions and send the message asynchronously.
- @OnClose public void onClose(Session session, @PathParam("room") String room): Cleans up by removing the session from the room on disconnect.
- leaveRoom(room, session): Removes the session and prunes empty rooms for memory hygiene.
- @OnError public void onError(Session session, Throwable t, @PathParam("room") String room): Logs room-specific errors.

## 3. Message Formats and Protocol Design

A robust real-time system uses a clear, extensible message format (often JSON). This section demonstrates a small JSON-based protocol with types like JOIN, CHAT, LEAVE, and uses a Jackson-like mapper to wire messages to the correct room and action.

Code block:
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonProperty;

public class ProtocolMessage {
    public String type;      // "JOIN", "CHAT", "LEAVE"
    public String room;
    public String sender;
    public String content;
    public long timestamp;

    public ProtocolMessage() {} // default constructor needed for Jackson
}

```

```java
import javax.websocket.OnMessage;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import com.fasterxml.jackson.databind.ObjectMapper;

@ServerEndpoint(value = "/ws/chat/{room}")
public class JsonProtocolEndpoint {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @OnMessage
    public void onMessage(String text, Session session, @PathParam("room") String room) {
        try {
            ProtocolMessage msg = MAPPER.readValue(text, ProtocolMessage.class);
            // Attach the room if the client didn't include it
            msg.room = (msg.room == null || msg.room.isEmpty()) ? room : msg.room;
            msg.timestamp = System.currentTimeMillis();
            String out = MAPPER.writeValueAsString(msg);
            // Broadcast to the appropriate room (reuse broadcast logic from Section 2)
            broadcastRoom(room, out);
        } catch (Exception e) {
            // handle parsing/serialization errors
            System.err.println("Failed to process message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void broadcastRoom(String room, String payload) {
        // Pseudocode: look up sessions for the room and send payload
        Set<Session> sessions = RoomSessionsHolder.getSessionsForRoom(room);
        for (Session s : sessions) {
            if (s.isOpen()) {
                s.getAsyncRemote().sendText(payload);
            }
        }
    }
}
```

### Line-by-line explanation breaking down each line

- import com.fasterxml.jackson.databind.ObjectMapper;: Jackson utility for JSON serialization/deserialization.
- public class ProtocolMessage { … }: Defines a simple POJO that models the common payload fields for all real-time messages.
- public ProtocolMessage() {}: Default constructor required by Jackson to instantiate the class from JSON.
- @OnMessage public void onMessage(String text, Session session, @PathParam("room") String room): Receives a raw JSON string, converts it to ProtocolMessage, and then uses a room-scoped broadcast.
- ProtocolMessage msg = MAPPER.readValue(text, ProtocolMessage.class);: Deserializes JSON into a ProtocolMessage instance.
- msg.timestamp = System.currentTimeMillis();: Adds a timestamp to the message for ordering/traceability.
- String out = MAPPER.writeValueAsString(msg);: Serializes the enriched message back to JSON for broadcasting.
- broadcastRoom(room, out);: Publishes the payload to all clients in the specified room.

Note: In production, you’d want to centralize room management (as in Section 2) and reuse a single broadcast utility. This section focuses on illustrating a clean, extensible message format and the wiring to a JSON-based protocol.

## 4. Scalability and Cross-Instance Communication

WebSocket servers are frequently deployed in clusters. Browsers maintain a connection per client, but each server instance only knows its local connections. To broadcast across the whole cluster, you typically use a distributed pub/sub mechanism (e.g., Redis) to fan out messages to all instances. This section presents a pragmatic pattern and skeleton code to bridge local WebSocket sessions with a Redis pub/sub channel.

Code block:
```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPubSub;

import java.util.function.Consumer;

public class RedisWebSocketBridge {
    private static final String CHANNEL = "ws:channel";
    private final Jedis publisher;
    private final Jedis subscriber;
    private final Consumer<String> dispatch;

    public RedisWebSocketBridge(Consumer<String> localBroadcast) {
        this.dispatch = localBroadcast;
        this.publisher = new Jedis("localhost", 6379);
        this.subscriber = new Jedis("localhost", 6379);
        startListener();
    }

    public void publish(String message) {
        publisher.publish(CHANNEL, message);
    }

    private void startListener() {
        new Thread(() -> {
            subscriber.subscribe(new JedisPubSub() {
                @Override
                public void onMessage(String channel, String message) {
                    if (CHANNEL.equals(channel)) {
                        dispatch.accept(message); // forward to local WebSocket sessions
                    }
                }
            }, CHANNEL);
        }).start();
    }
}
```

```java
// Integration sketch in a WebSocket endpoint (Section 2 style)
public class RoomWebSocketEndpoint {
    private static RedisWebSocketBridge bridge;

    static {
        // Initialize bridge with a local broadcaster that knows how to send to local sessions
        bridge = new RedisWebSocketBridge((message) -> {
            // Broadcast to all local sessions for the appropriate room
            // e.g., RoomSessionsHolder.broadcastAll(message);
        });
    }

    @OnMessage
    public void onMessage(String text, Session session, @PathParam("room") String room) {
        // Publish to Redis so all instances broadcast to their local sessions
        bridge.publish(text);
    }
}
```

### Line-by-line explanation breaking down each line

- import redis.clients.jedis.Jedis; import redis.clients.jedis.JedisPubSub;: Bring in Jedis client for Redis Pub/Sub.
- private static final String CHANNEL = "ws:channel";: The Redis channel name used for cross-instance broadcasts.
- public RedisWebSocketBridge(Consumer<String> localBroadcast): Constructor wires a local broadcast sink that updates all local sessions when a message is received from Redis.
- new Thread(() -> { subscriber.subscribe(...); }): Starts a background thread to listen for Redis messages, enabling non-blocking operation.
- onMessage(String channel, String message): Called when a message is published on the Redis channel; forwards to the local business logic.
- bridge.publish(text): Publishes a message to Redis so other instances can receive and broadcast locally.

Note: In production, you’ll likely route messages to specific rooms, include metadata (room, sender, timestamp), and perform serialization with a well-defined schema. The key pattern is: publish locally from your endpoint to Redis, then subscribe on each instance to broadcast to its local connections.

## 5. Security and Observability

Real-time APIs introduce attack surfaces (unauthorized access, origin spoofing, abuse). This section covers practical security measures and observability patterns you should implement in production.

Code block (handshake origin check and heartbeat):
```java
import javax.websocket.server.ServerEndpointConfig;
import javax.websocket.server.ServerEndpoint;
import javax.websocket.server.HandshakeRequest;
import javax.websocket.server.HandshakeResponse;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.Map;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.EndpointConfig;
import javax.websocket.OnMessage;
import javax.websocket.PongMessage;
import javax.websocket.OnPong;
import javax.websocket.CloseReason;

@ServerEndpoint(value = "/ws/secure/{room}", configurator = OriginCheckConfigurator.class)
public class SecureRoomEndpoint {
    // Simple in-memory allow-list (in real apps, back with a data store)
    private static boolean allowedOrigin(String origin) {
        return origin != null && (origin.equals("https://trusted.example.com")
                || origin.equals("https://admin.example.com"));
    }

    @OnOpen
    public void onOpen(Session session, @PathParam("room") String room, EndpointConfig config) {
        String origin = (String) config.getUserProperties().get("origin");
        if (!allowedOrigin(origin)) {
            try {
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Origin not allowed"));
            } catch (Exception e) {
                // ignore
            }
            return;
        }
        // proceed to register the session to the room (omitted for brevity)
    }

    @OnMessage
    public void onMessage(String message, Session session, @PathParam("room") String room) {
        // handle message
    }

    @OnPong
    public void onPong(PongMessage pong, Session session) {
        // update last-pong timestamp for heartbeat
        // e.g., lastPongMap.put(session, System.currentTimeMillis());
    }
}

// Configurator to capture handshake Origin header
class OriginCheckConfigurator extends ServerEndpointConfig.Configurator {
    @Override
    public void modifyHandshake(ServerEndpointConfig sec, HandshakeRequest request, HandshakeResponse response) {
        Map<String, List<String>> headers = request.getHeaders();
        List<String> originList = headers.get("Origin");
        String origin = (originList != null && !originList.isEmpty()) ? originList.get(0) : "";
        sec.getUserProperties().put("origin", origin);
        super.modifyHandshake(sec, request, response);
    }
}
```

Notes:
- Origin checking is performed at handshake time by capturing the Origin header via a Configurator. This helps prevent unauthorized cross-origin WebSocket connections.
- TLS (WSS) is primarily a deployment/container concern. To enforce transport security, terminate TLS at the reverse proxy or application server (e.g., Nginx, Apache, Tomcat) and expose wss:// URLs to clients.
- Heartbeats: you can implement a heartbeat by sending periodic pings (or using a ping/pong mechanism) to detect dead connections and close them proactively. In JSR 356, you can use session.getAsyncRemote().sendPing(ByteBuffer) and @OnPong.

### Line-by-line explanation breaking down each line

- @ServerEndpoint(value = "/ws/secure/{room}", configurator = OriginCheckConfigurator.class): Declares the secure endpoint and wires a custom handshake configurator to capture Origin.
- private static boolean allowedOrigin(String origin): Helper to enforce a simple allow-list policy.
- @OnOpen public void onOpen(Session session, @PathParam("room") String room, EndpointConfig config): Handles the WebSocket open event, reads the captured origin from config, and rejects disallowed origins.
- String origin = (String) config.getUserProperties().get("origin");: Retrieves the origin captured during handshake.
- session.close(new CloseReason(...)): Closes the connection with a policy violation if origin is not allowed.
- @OnPong public void onPong(PongMessage pong, Session session): Provides a hook to process heartbeat responses.
- OriginCheckConfigurator.modifyHandshake(...): Captures the Origin header during the handshake and stores it in user properties for later use in onOpen.

If you want deeper TLS integration, review your container’s TLS/SSL configuration and ensure the WS endpoint is served over wss:// in clients, with proper certificate management and domain validation.

## X. Common Beginner Mistakes

Here are real pitfalls observed in beginner WebSocket implementations, with bad vs good examples.

- Pitfall 1: Not using a thread-safe collection for sessions
Bad:
```java
private static final List<Session> SESSIONS = new ArrayList<>();
```
Good:
```java
private static final Set<Session> SESSIONS = Collections.synchronizedSet(new HashSet<>());
```

- Pitfall 2: Blocking sends on IO threads
Bad:
```java
for (Session s : SESSIONS) {
    s.getBasicRemote().sendText(message); // blocks if the client is slow
}
```
Good:
```java
for (Session s : SESSIONS) {
    if (s.isOpen()) {
        s.getAsyncRemote().sendText(message); // non-blocking
    }
}
```

- Pitfall 3: Forgetting to clean up onClose
Bad:
```java
@OnClose
public void onClose(Session session) {
    // no cleanup
}
```
Good:
```java
@OnClose
public void onClose(Session session) {
    SESSIONS.remove(session);
}
```

- Pitfall 4: Not handling and validating input messages
Bad:
```java
@OnMessage
public void onMessage(String text, Session session) {
    // assumes every message is valid
}
```
Good:
```java
@OnMessage
public void onMessage(String text, Session session) {
    try {
        // validate structure, sanitize content, handle parsing errors
    } catch (Exception e) {
        session.getAsyncRemote().sendText("{\"error\":\"invalid message\"}");
    }
}
```

- Pitfall 5: Ignoring keep-alives and timeouts
Bad:
“No heartbeat or ping/pong”
Good:
Implement a periodic ping and close stale sessions to prevent silent disconnections and resource leakage.

- Pitfall 6: Exposing endpoints publicly without authorization
Bad:
Endpoint without any access control.
Good:
Add origin checks, per-room ACLs, or token validation in handshake or onMessage.

## Y. Why This Matters In Real Systems

- Real-time dashboards and monitoring: Live metrics streams, anomaly detection, and alerting require low-latency pushes from server to client. WebSockets are a natural fit for fan-out updates.
- Collaborative apps and chat: Users expect immediate responses and presence information. Rooms/topics map well to channels in collaborative tools.
- Multi-instance deployments: In production, a single JVM isn’t enough. Redis or a message broker bridges multiple WebSocket servers, ensuring messages are delivered across the entire cluster.
- Security and reliability: TLS termination, origin checks, rate limiting, and robust observability are essential to prevent abuse, diagnose issues quickly, and maintain uptime.

Key production considerations:
- Connection scaling: Use Redis Pub/Sub or a dedicated message broker to fan out across instances.
- Backpressure and flow control: Design higher-level protocols to handle bursts and avoid overwhelming clients.
- Reliability: Implement heartbeat/keep-alive, proper error handling, and fallback strategies (e.g., fall back to long polling for clients that can’t use WebSockets).
- Observability: Instrument metrics (connections, messages per second, latencies, error rates), and integrate logs with tracing to diagnose distributed issues.

## Z. Study Questions

1) What are the main advantages of WebSockets over traditional HTTP for real-time features?
2) How would you broadcast messages to only clients inside a specific room?
3) Why might you need a cross-instance pub/sub mechanism (e.g., Redis) when using WebSockets in a cluster?
4) What security measures should you implement for a WebSocket API?
5) How can you implement a heartbeat to detect and clean up dead connections?

## Exercise

Practical multi-part coding challenge to build and extend a real-time WebSocket subsystem in Java.

Part A — Implement a basic broadcast endpoint
- Create a Java WebSocket server endpoint at /ws/global that broadcasts every received message to all connected clients (similar to Section 1).
- Requirements:
  - Thread-safe storage of sessions.
  - Use asynchronous sends to avoid blocking IO threads.
  - Clean up sessions on close and handle errors gracefully.

Part B — Add room-based broadcasting
- Extend to /ws/chat/{room} that subscribes clients into a room and broadcasts only to that room (Section 2).
- Requirements:
  - Proper mapping from room name to a set of sessions per room.
  - On client disconnect, remove them from the room and prune empty rooms.

Part C — Introduce a simple JSON protocol
- Add a ProtocolMessage class (Section 3) and wire the endpoint to accept JSON payloads, attach a timestamp, and broadcast the serialized message.
- Requirements:
  - Use Jackson (or another JSON library) to serialize/deserialize.
  - Validate input and gracefully handle malformed payloads.

Part D — Cross-instance broadcasting with Redis
- Implement a Redis-based bridge (Section 4) so messages published by one server instance appear on all other instances.
- Requirements:
  - A local broadcaster that writes to local sessions.
  - Redis Pub/Sub channel to fan out messages to all instances.
  - Avoid infinite loops by ensuring messages from Redis aren’t re-published locally unless necessary.

Part E — Security and health checks
- Implement handshake-level origin checks (Section 5) and an optional heartbeat mechanism using ping/pong to detect dead clients.
- Requirements:
  - Lightweight origin validation during handshake (safe origins list).
  - Periodic ping from server to clients and appropriate handling of pongs.
  - Clear error handling and a strategy to close stale connections.

Deliverables:
- A compact project (or modular files) implementing the above parts.
- A README with setup steps, dependencies, and how to run in a local environment (including Redis setup if Part D is implemented).
- Brief notes on how you’d deploy to a real environment (containerization, TLS termination, and observability).

If you’d like, I can tailor the exercise scaffolding to a concrete framework (e.g., plain Java EE servlet container vs Spring Boot) and provide a ready-to-run Maven/Gradle project skeleton.