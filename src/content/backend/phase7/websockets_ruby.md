# Track: Backend Engineering — Phase 7: Real-Time with WebSockets (Ruby)

Real-Time with WebSockets lets servers push updates to clients as soon as events occur, enabling chat, live dashboards, collaborative apps, and notifications with minimal latency. In Ruby ecosystems, you have two popular paths: standalone WebSocket servers (e.g., em-websocket or faye-websocket) for non-Rails apps or microservices, and Rails-powered real-time communication via Action Cable. This lesson focusing on Phase 7 shows practical patterns, authentication, scaling, and reliability so you can design production-ready real-time features.

## 1. WebSocket Basics in Ruby (Standalone server)

Learn how to spin up a lightweight WebSocket server in Ruby to understand the core protocol and event flow before wiring it into a full framework.

```ruby
# Lightweight WebSocket server in Ruby using em-websocket
require 'em-websocket'

EM.run do
  EM::WebSocket.start(host: "0.0.0.0", port: 8080) do |ws|
    ws.onopen do |handshake|
      ws.send "Welcome to Ruby WebSocket server!"
    end

    ws.onmessage do |msg|
      ws.send "Echo: #{msg}"
    end

    ws.onclose do
      puts "Connection closed"
    end
  end
end
```

### Line-by-line explanation
- require 'em-websocket': Loads the EventMachine WebSocket library to implement a WebSocket server.
- EM.run do ... end: Starts the EventMachine event loop, which drives asynchronous I/O.
- EM::WebSocket.start(host: ..., port: ...) do |ws|: Spins up a WebSocket server listening on the given host/port; the block yields a ws connection for each client.
- ws.onopen do |handshake| ... end: Callback invoked when a client connects; we greet the client.
- ws.onmessage do |msg| ... end: Callback invoked when a message arrives from the client; we respond by echoing the payload.
- ws.onclose do ... end: Callback invoked when the client disconnects; useful for cleanup or logging.
- ws.send "...": Sends a message back to the connected client.

## 2. Rails Action Cable: Real-Time Channels

Rails’ Action Cable provides a first-class WebSocket integration with Rails models, authentication, and Redis-based pub/sub for multi-server scaling. This example demonstrates a simple chat channel that broadcasts messages to a room.

```ruby
# app/channels/chat_channel.rb
class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "chat_#{params['room']}"
  end

  def receive(data)
    room = data['room'] || 'lobby'
    payload = data.merge('room' => room)
    ActionCable.server.broadcast("chat_#{room}", payload)
  end
end
```

```ruby
# config/cable.yml (Redis adapter wiring)
development:
  adapter: redis
  url: redis://localhost:6379/1

production:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL") %>/1
  channel_prefix: myapp_production
```

### Line-by-line explanation
- class ChatChannel < ApplicationCable::Channel: Defines a channel tied to client subscriptions for real-time communication.
- def subscribed; stream_from "chat_#{params['room']}"; end: When a client subscribes, subscribe to a Redis-backed stream specific to the requested chat room.
- def receive(data); ... ActionCable.server.broadcast(...): When the client sends data to the channel, broadcast that data to all subscribers of the specified room.
- room = data['room'] || 'lobby': Fallback room if not provided.
- payload = data.merge('room' => room): Prepare payload with room metadata for consumers.
- develop config/cable.yml: Configures Redis as the adapter that Action Cable uses for publish/subscribe and inter-process communication across multiple Rails servers.

## 3. Securing WebSocket Connections: Authentication & Authorization

Security is critical for WebSockets because connections persist and bypass typical HTTP request barriers once established. This example shows how to verify a user during the WebSocket handshake in Rails (Action Cable).

```ruby
# app/channels/application_cable/connection.rb
module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      # Typical pattern: use session/cookies or a token to identify the user
      if (verified_user = env['warden']&.user) # Warden (Devise) integration
        verified_user
      elsif (user_id = cookies.encrypted['user_id'])
        User.find_by(id: user_id)
      else
        reject_unauthorized_connection
      end
    end
  end
end
```

### Line-by-line explanation
- module ApplicationCable; class Connection < ActionCable::Connection::Base: Customizes the WebSocket connection class for authentication.
- identified_by :current_user: Declares an identifier to remember the connected user on this connection.
- def connect; self.current_user = find_verified_user; end: Invoked when a new WebSocket connection is established; assigns a verified user or rejects the connection.
- def find_verified_user: Internal helper to verify who is connecting.
- env['warden']&.user: Checks if a Rails authentication layer (e.g., Warden/Devise) has a current user.
- cookies.encrypted['user_id']: Fallback to sessionless token-based or cookie-based user lookup.
- reject_unauthorized_connection: Terminates the handshake if authentication fails.

## 4. Broadcasting, Subscriptions, and Scaling Across Processes

To support multi-server deployments, you rely on a message bus (Redis) so all server processes can publish/subscribe consistently. Action Cable with Redis is a canonical setup; here's how publishing and subscription look in practice.

```ruby
# Example: broadcasting a message to a room from any server
# (Typically called from a controller or background job)
ActionCable.server.broadcast("chat_#{params[:room]}", {
  type: 'message',
  user: current_user.id,
  text: params[:text],
  ts: Time.now.to_i
}.to_json)
```

### Line-by-line explanation
- ActionCable.server.broadcast("chat_#{params[:room]}", ...): Publishes the payload to all subscribers of the specified chat room.
- payload structure: type, user, text, ts: Allows clients to render consistently and handle ordering.
- to_json: Serializes the payload to JSON for browser clients listening via ActionCable’s WebSocket channel.

Note on scaling: The Redis adapter established in cable.yml ensures broadcasts are distributed across all Rails processes and machines. In production, you typically run Redis as a separate service and, if needed, add a distributed pub/sub pattern for other non-Rails services.

## 5. Reliability Patterns: Heartbeats, Reconnects, and Backpressure

Real-time systems must tolerate network hiccups, client reconnects, and varying message loads. The following patterns help maintain robust connections and sane load behavior.

- Heartbeats and client keep-alives to detect dead connections
- Idempotent messages and unique message IDs to handle reconnections
- Backpressure handling: avoid blocking the event loop and offload heavy work

Code examples (mixed languages for clarity):

- Client keep-alive (JavaScript client example; not Ruby, but essential for production):
```js
// client.js
const socket = new WebSocket('ws://example.com/cable');
let pingTimer = setInterval(() => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
  }
}, 30000);

socket.addEventListener('close', () => clearInterval(pingTimer));
```

- Bad: blocking handler that delays messages (risks backpressure and timeouts)
```ruby
# BAD: heavy work inline in onmessage
ws.onmessage do |msg|
  sleep 2 # simulating heavy work
  ws.send "Processed: #{msg}"
end
```

- Good: offload heavy work to a background job or thread pool
```ruby
# GOOD: async processing to avoid blocking the event loop
ws.onmessage do |msg|
  Thread.new do
    result = HeavyComputation.call(msg)
    ws.send "Processed: #{result}"
  end
end
```

- Bad: trusting every incoming payload without validation
```ruby
# BAD
def receive(data)
  ActionCable.server.broadcast("chat_#{params['room']}", data)
end
```

- Good: validate and sanitize payloads before broadcasting
```ruby
# GOOD
def receive(data)
  return unless data.is_a?(Hash) && data['text'].is_a?(String)
  text = data['text'].strip
  return if text.empty? || text.length > 1000
  ActionCable.server.broadcast("chat_#{params['room']}", { text: text, user: current_user.id }.to_json)
end
```

- Bad: no cleanup on disconnect
```ruby
# BAD
def unsubscribed
  # nothing to clean up
end
```

- Good: cleanup resources and reference counts
```ruby
# GOOD
def unsubscribed
  # Example: decrement online user count, release resources
  OnlineUsers.decrement(current_user.id)
end
```

- Bad: no authentication guard on received messages
```ruby
# BAD
def receive(data)
  ActionCable.server.broadcast("chat_#{params['room']}", data)
end
```

- Good: enforce authorization on messages
```ruby
# GOOD
def receive(data)
  if data['text'] && current_user&.can_send?(data['room'])
    ActionCable.server.broadcast("chat_#{params['room']}", { user: current_user.id, text: data['text'] }.to_json)
  else
    Rails.logger.warn("Unauthorized or invalid message")
  end
end
```

## 6. Why This Matters In Real Systems — production context and real usage

- Scalability: For many concurrent connections, Redis-backed Action Cable distributes messages across multiple Rails servers. This prevents a single server from becoming a bottleneck.
- Reliability: Heartbeats and reconnection logic handle flaky networks. Idempotent message handling and message IDs help avoid duplicate renders after reconnects.
- Security: WebSocket authentication should be enforced at the handshake, with authorization checks before broadcasting or streaming.
- Observability: Instrument channels with metrics (connections, broadcasts, message sizes, error rates) and log notable events to detect anomalies early.
- Observability and tracing: Integrate with distributed tracing (e.g., OpenTelemetry) to understand real-time flows across services.
- Deployment considerations: Run Redis as a separate service; ensure TLS termination at a load balancer if used; use sticky sessions if you rely on session-based routing (though Action Cable with Redis generally removes the need for sticky sessions at the WebSocket layer).

## 7. Study Questions — 5 recall questions

1) What is the primary role of Action Cable in Rails, and how does it achieve cross-server broadcasting?  
2) How do you authenticate a WebSocket connection in Rails using Action Cable?  
3) Why is Redis commonly used in WebSocket deployments, and what problem does it solve?  
4) What are two strategies to avoid blocking the event loop when handling messages from WebSocket clients?  
5) Name a real-world scenario where WebSockets are preferred over Server-Sent Events (SSE) and explain why.

## 8. Exercise — a practical multi-part coding challenge

Part A: Build a minimal real-time chat feature in Rails with Action Cable
- Create a ChatChannel that subscribes to a room and broadcasts messages received to all subscribers of that room.
- Use a cable.yml Redis adapter configuration for development.

Part B: Add authentication to the WebSocket connection
- Implement a Connection class that authenticates the user during the handshake and exposes current_user to the channel.
- Gate chat access so only authenticated users can subscribe.

Part C: Front-end hookup (brief)
- Provide a small JavaScript snippet that connects to the Action Cable channel, subscribes to a room, and handles incoming messages by appending them to a chat DOM element.
- Example (pseudo-HTML context):
  - HTML: <div id="messages"></div>
  - JS: subscribe to "ChatChannel" with room param, append incoming messages to #messages.

Part D: Scale with Redis (production mindset)
- Confirm Redis is configured as the adapter and explain how messages propagate to other Rails servers in a multi-node deployment.

Part E: Observability and reliability
- Add basic instrumentation: log when a message is broadcast, and expose a small metric for messages per minute.
- Describe a test plan to validate successful broadcasting in a multi-process environment.

Deliverables (what you should have)
- A working Rails Action Cable channel for chat (ChatChannel) with a Subscription model (if you prefer a room-per-subscription pattern) and a Connection handshake that authenticates users.
- cable.yml configured for development with Redis.
- A short JS client snippet hooking into Action Cable for a specified room.
- A basic test plan and optional RSpec tests covering connection authentication and a broadcast scenario.

Note: The exercises can be implemented incrementally. The goal is to demonstrate the complete pipeline from client connection, through authenticated channels, to broadcast across multiple server processes, with an eye toward reliability and production-readiness.