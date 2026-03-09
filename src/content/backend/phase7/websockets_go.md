# Real-Time with WebSockets in Go

Real-time features empower applications to push updates to clients instantly, reducing latency and improving user experience. WebSockets provide a persistent, bi-directional channel over a single TCP connection, enabling publish-subscribe patterns, live dashboards, chat, collaboration, and real-time analytics. In professional backend engineering, mastering WebSockets in Go means building scalable, robust, and secure real-time services that gracefully handle connections at scale, backpressure, and failure scenarios.

## 1. Basic WebSocket Endpoint and Echo

This section demonstrates a minimal WebSocket server in Go that upgrades HTTP connections to WebSocket, reads messages from a client, and echoes them back. This establishes the core WebSocket lifecycle: upgrade, read, write, and close.

```go
package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	// In production, you should validate the Origin header properly.
	CheckOrigin: func(r *http.Request) bool { return true },
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	// Upgrade the HTTP connection to a WebSocket.
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}
	defer conn.Close()

	// Simple echo loop: read message and send it back.
	for {
		mt, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			break
		}
		err = conn.WriteMessage(mt, message)
		if err != nil {
			log.Println("write error:", err)
			break
		}
	}
}

func main() {
	http.HandleFunc("/ws", wsHandler)
	log.Println("WebSocket Echo server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Line-by-line explanation breaking down each line

- package main: Defines the executable package.
- import (...): Imports the standard logging and HTTP packages plus the Gorilla WebSocket package.
- var upgrader = websocket.Upgrader{...}: Creates a WebSocket upgrader with Cross-Origin checks (CheckOrigin should be properly secured in production).
- func wsHandler(w, r): HTTP handler that will upgrade the connection to WebSocket.
- conn, err := upgrader.Upgrade(...): Upgrades the HTTP connection. If it fails, log and return.
- defer conn.Close(): Ensures the WebSocket connection is closed when the handler exits to avoid leaks.
- for { ... }: Main loop to continuously process messages until an error occurs.
- mt, message, err := conn.ReadMessage(): Reads the next message from the client; mt is the message type.
- if err != nil { log; break }: If reading fails (e.g., client disconnects), exit the loop.
- err = conn.WriteMessage(mt, message): Writes the received message back to the client (echo).
- if err != nil { log; break }: If writing fails, exit the loop.
- func main(): Entry point of the program.
- http.HandleFunc("/ws", wsHandler): Registers the WebSocket endpoint.
- log.Println(...): Logs startup information.
- log.Fatal(http.ListenAndServe(":8080", nil)): Starts the HTTP server on port 8080 and exits on error.

## 2. Building a Robust Hub: Subscriptions and Broadcasting

In real-time systems, you don’t want to blast every message to every client indiscriminately. Instead, you typically group clients by topics (or rooms) and broadcast only to the relevant subscribers. This section implements a small hub with topic subscriptions and publish/subscribe semantics.

```go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

type ClientMessage struct {
	Action  string `json:"action"`  // "subscribe" | "unsubscribe" | "publish"
	Topic   string `json:"topic"`
	Payload string `json:"payload"` // used for publish
}

type Broadcast struct {
	Topic   string
	Message []byte
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	topics map[string]bool
	id     string
}

type Hub struct {
	clients   map[*Client]bool
	topics    map[string]map[*Client]bool // topic -> clients
	register  chan *Client
	unregister chan *Client
	broadcast chan Broadcast
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		topics:     make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Broadcast),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c] = true
		case c := <-h.unregister:
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				// Remove client from all topic subscriptions
				for t := range c.topics {
					if subs, ok := h.topics[t]; ok {
						delete(subs, c)
					}
				}
			}
		case b := <-h.broadcast:
			if subs, ok := h.topics[b.Topic]; ok {
				for cl := range subs {
					select {
					case cl.send <- b.Message:
					default:
						// Slow consumer; drop and remove
						close(cl.send)
						delete(h.clients, cl)
					}
				}
			}
		}
	}
}

func (h *Hub) subscribe(c *Client, topic string) {
	if h.topics[topic] == nil {
		h.topics[topic] = make(map[*Client]bool)
	}
	h.topics[topic][c] = true
	if c.topics == nil {
		c.topics = make(map[string]bool)
	}
	c.topics[topic] = true
}

func (h *Hub) unsubscribe(c *Client, topic string) {
	if subs, ok := h.topics[topic]; ok {
		delete(subs, c)
	}
	delete(c.topics, topic)
}

var upgrader = websocket.Upgrader{ CheckOrigin: func(r *http.Request) bool { return true } }

func serveWS(h *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}
	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		topics: make(map[string]bool),
	}
	h.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var cm ClientMessage
		if err := json.Unmarshal(message, &cm); err != nil {
			continue
		}
		switch cm.Action {
		case "subscribe":
			c.hub.subscribe(c, cm.Topic)
		case "unsubscribe":
			c.hub.unsubscribe(c, cm.Topic)
		case "publish":
			c.hub.broadcast <- Broadcast{
				Topic:   cm.Topic,
				Message: []byte(cm.Payload),
			}
		}
	}
}

func (c *Client) writePump() {
	defer func() { c.conn.Close() }()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		}
	}
}
```

### Line-by-line explanation breaking down each line

- import (...): Brings in JSON encoding, logging, HTTP, time, and Gorilla WebSocket packages.
- type ClientMessage: Defines a message protocol for actions Subscribe, Unsubscribe, and Publish.
- type Broadcast: Encapsulates a topic and the raw bytes to broadcast to all subscribers of that topic.
- type Client: Represents a connected client, its hub, the outbound message channel, subscribed topics, and an optional id.
- type Hub: Core pub/sub manager with maps of all clients, topic subscriptions, and channels for registering/unregistering clients and broadcasting messages.
- func NewHub(): Initializes a new Hub with empty maps and channels.
- func (h *Hub) Run(): Main event loop handling client registration/unregistration and topic broadcasts.
- case c := <-h.register: Registers a new client.
- case c := <-h.unregister: Removes a client and cleans up its topic subscriptions.
- case b := <-h.broadcast: Broadcasts a message to all clients subscribed to the topic.
- func (h *Hub) subscribe(...): Creates topic entries if needed and registers the client as a subscriber.
- func (h *Hub) unsubscribe(...): Removes the client from a topic’s subscriber list and from the client’s local topic set.
- var upgrader := websocket.Upgrader: Prepares a WebSocket upgrader allowing cross-origin (adjust in production).
- func serveWS(...): Upgrades the HTTP connection, creates a Client, registers it with the Hub, and starts I/O loops.
- func (c *Client) readPump(): Reads incoming messages, decodes ClientMessage, and invokes subscribe/unsubscribe/publish actions.
- func (c *Client) writePump(): Sends outbound messages from the client, handling connection close and timeouts.
- const upgrade constants: Not shown here; uses timeouts via SetReadDeadline and SetWriteDeadline.
- main wiring: Create a Hub, run it, and expose a /ws endpoint that delegates to serveWS.

## X. Common Beginner Mistakes

Common pitfalls when adding WebSockets to backends:

1) Forgetting to protect writes to a single WebSocket connection
Bad:
```go
// Dangerous: writing from multiple goroutines
go func() { conn.WriteMessage(websocket.TextMessage, []byte("A")) }()
go func() { conn.WriteMessage(websocket.TextMessage, []byte("B")) }()
```
Good:
```go
type Client struct {
  conn *websocket.Conn
  send chan []byte
}
func (c *Client) writePump() {
  for msg := range c.send {
    c.conn.WriteMessage(websocket.TextMessage, msg)
  }
}
```

2) Not handling heartbeats/pings, leading to silent timeouts
Bad:
```go
for {
  _, msg, err := conn.ReadMessage()
  // no ping/pong or read deadline
  _ = msg; _ = err
}
```
Good:
```go
const (
  pongWait = 60 * time.Second
  pingPeriod = 54 * time.Second
  writeWait = 10 * time.Second
)
conn.SetReadDeadline(time.Now().Add(pongWait))
conn.SetPongHandler(func(string) error { conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
ticker := time.NewTicker(pingPeriod)
defer ticker.Stop()
```

3) Allowing insecure upgrades or unvalidated origins
Bad:
```go
upgrader.CheckOrigin = func(r *http.Request) bool { return true }
```
Good:
```go
upgrader.CheckOrigin = func(r *http.Request) bool {
  // Validate against allowed origins or use a reverse proxy to handle CORS
  origin := r.Header.Get("Origin")
  return origin == "https://your.frontend.app"
}
```

4) Ignoring per-connection resource accounting and backpressure
Bad:
```go
hub.broadcast <- Broadcast{Topic: "news", Message: []byte("update")}
```
Good:
- Use per-client write buffers, drop slow clients, and monitor queue sizes.
- Implement a writePump with timeouts and backpressure-aware sending as shown in Section 2.

5) Not cleaning up connections on errors or shutdown
Bad:
```go
// No unregister path, leads to leaked goroutines and memory
```
Good:
- Always unregister clients, close connections, and stop their pumps during errors and shutdown (see hub unregister path in Section 2).

## Y. Why This Matters In Real Systems

- Real-time capabilities enable proactive UX: live dashboards, collaborative apps, and responsive notification systems rely on WebSockets for low-latency messaging.
- Reliability concerns: heartbeat/ping, timeouts, and backpressure are essential to avoid stale connections and memory leaks in long-running services.
- Security considerations: authenticate users, authorize topics, and validate origins. Use TLS (wss://) in production and consider token-based authentication (e.g., JWT) for socket access.
- Operational concerns: monitor connection counts, per-connection memory/CPU, and message latency. Instrument with metrics (Prometheus), logging, and tracing.
- Scaling patterns: a single-node hub is straightforward but has limited scalability. For multi-node deployments, consider:
  - Horizontal scaling with sticky sessions at the load balancer and a shared message bus (Redis Pub/Sub, NATS, or Kafka) to propagate messages across instances.
  - Centralized hub or broker service to fan out messages to connected clients across nodes.
  - Backpressure strategies and circuit breakers when downstream clients lag.
- Deployment considerations: run behind a reverse proxy that supports WebSocket upgrades, set sensible timeout limits, and ensure proper TLS termination.

## Z. Study Questions

1) What is the primary difference between a traditional HTTP request/response and a WebSocket connection?  
2) Explain the hub/subscription pattern and how it reduces unnecessary traffic.  
3) How do you implement heartbeat (ping/pong) to keep WebSocket connections alive in Go?  
4) Why is it important to clean up a client’s subscriptions on disconnect, and how is it typically done?  
5) What are some strategies to scale WebSocket backends across multiple application servers?

## Exercise

Build a small production-ish WebSocket microservice in Go with the concepts learned. Deliverables:

- Part A: Baseline WebSocket server with JWT authentication
  - Implement a WebSocket endpoint at /ws with a Bearer token in the Authorization header.
  - Validate the JWT (use github.com/golang-jwt/jwt/v4) against a shared secret and attach the user ID to the client context (for demonstration).
  - Establish a per-connection write pump and a read loop with proper deadlines and a Pong handler.

- Part B: Topic-based Hub with publish/subscribe
  - Implement a Hub that supports subscribing to topics (e.g., stocks/{symbol}) and unsubscribing.
  - Clients can publish messages to a topic which get broadcast to all subscribers of that topic.
  - Demonstrate with an example topic: stocks/ABC.

- Part C: Heartbeats and backpressure
  - Add ping/pong to keep connections alive and drop slow clients if necessary.
  - Ensure writes are synchronized through a per-connection write loop to avoid data races.

- Part D: Simple client (go) for testing
  - Create a small Go client that connects to /ws with a token, subscribes to stocks/ABC, and prints incoming messages.

- Part E: Observability and shutdown
  - Add graceful shutdown handling and basic metrics variables (e.g., current connections, messages broadcasted).

Starter scaffold (high-level guidance; fill in as you implement):

- Use gorilla/websocket for WebSocket handling.
- Use a Hub similar to Section 2, enhanced with authentication context and ping/pong.
- Authenticate once on the HTTP upgrade; pass the user id to the Client and include it in logs for traceability.
- Create a small in-process stock price generator that publishes to stocks/ABC every second to demonstrate broadcasting.

Note: This exercise emphasizes practical, production-oriented patterns: authentication, topic-based messaging, backpressure, and observability. Start with the basic echo server (Section 1) if needed, then progressively implement the hub (Section 2) and reliability (Section 3) features to complete the exercise.