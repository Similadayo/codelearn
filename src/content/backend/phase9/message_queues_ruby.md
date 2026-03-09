# Track: Backend Engineering — Phase 9: System Design & Scalability — Message Queues: Kafka & RabbitMQ (Ruby)

Message queues are the backbone of asynchronous workflows, decoupled services, and scalable architectures. In production, choosing the right queue, designing for throughput, fault tolerance, and idempotent processing is essential. This lesson focuses on two popular systems in Ruby stacks: Kafka for high-throughput, scalable streaming and RabbitMQ for flexible routing and reliable task queues. You’ll see concrete Ruby examples, line-by-line explanations, common pitfalls, and real-world considerations to prepare you for building robust systems.

## 1. Kafka in Ruby: Producers, Consumers, and Offsets

Kafka is ideal for event streaming, decoupled services, and scalable consumption patterns. In Ruby, the ruby-kafka client (or librdkafka-backed clients) lets you publish to topics and consume via consumer groups with partitioned topics. This section demonstrates a basic producer and a basic consumer, including how keys influence partitioning and ordering.

```ruby
# kafka_producer_consumer.rb
require 'kafka'

KAFKA_BROKERS = ["localhost:9092"]

kafka = Kafka.new(seed_brokers: KAFKA_BROKERS, client_id: "order-service")

# -------- Producer --------
producer = kafka.producer
# Use a key to ensure messages with the same key go to the same partition (preserves ordering per key)
producer.produce("OrderCreated: { order_id: 123 }", topic: "orders", key: "order-123")
producer.produce("OrderCreated: { order_id: 124 }", topic: "orders", key: "order-124")
producer.deliver_messages

# -------- Consumer --------
consumer = kafka.consumer(group_id: "orders-consumer-group")
consumer.subscribe("orders")

begin
  consumer.each_message do |message|
    puts "Topic: #{message.topic} | Partition: #{message.partition} | Offset: #{message.offset}"
    puts "Key: #{message.key} | Value: #{message.value}"
    # TODO: business logic here
  end
ensure
  consumer.stop
  kafka.close
end
```

### Line-by-line explanation

- require 'kafka': Load the Kafka client library.
- KAFKA_BROKERS = ["localhost:9092"]: List of seed brokers to bootstrap the cluster.
- kafka = Kafka.new(...): Create a client with a unique client_id for metrics and tracing.
- producer = kafka.producer: Instantiate a producer for publishing messages.
- producer.produce(..., topic: "orders", key: "order-123"): Build a message; the key ensures messages with the same key land in the same partition, preserving per-key order.
- producer.deliver_messages: Flush all pending messages to the cluster.
- consumer = kafka.consumer(group_id: "orders-consumer-group"): Create a consumer that belongs to a consumer group for parallel processing.
- consumer.subscribe("orders"): Listen to the target topic.
- consumer.each_message do |message|: Iterate over messages as they arrive.
- message.topic / message.partition / message.offset / message.key / message.value: Metadata and payload of the message.
- ensure / consumer.stop / kafka.close: Clean shutdown to commit offsets and release resources.

---

## 2. RabbitMQ in Ruby (Bunny): Exchanges, Queues, and Reliable Processing

RabbitMQ is well-suited for complex routing, work queues, and reliable message delivery with acknowledgments and dead-lettering. The Bunny gem is the standard Ruby client. This section shows a simple producer that publishes to a queue and a consumer that processes messages with manual acknowledgments, ensuring reliable work handling.

```ruby
# rabbitmq_producer.rb
require 'bunny'
require 'json'

conn = Bunny.new(hostname: 'localhost')
conn.start

channel = conn.create_channel
channel.confirm_select

# Direct/publication to a named queue (default exchange approach)
queue = channel.queue('orders', durable: true)

payload = { event: 'order_created', order_id: 789 }.to_json
channel.default_exchange.publish(payload, routing_key: queue.name, persistent: true)

puts "Published: #{payload}"
conn.close
```

```ruby
# rabbitmq_consumer.rb
require 'bunny'
require 'json'

conn = Bunny.new(hostname: 'localhost')
conn.start

channel = conn.create_channel
channel.prefetch(10) # max in-flight messages per consumer
queue = channel.queue('orders', durable: true)

# Consumer with manual acks
queue.subscribe(manual_ack: true, block: true) do |delivery_info, properties, body|
  begin
    data = JSON.parse(body)
    puts "Processing: #{data}"
    # Simulated work
    sleep(0.5)
    channel.ack(delivery_info.delivery_tag) # Acknowledge successful processing
  rescue => e
    puts "Failed processing: #{e}"
    # Not ack-ing will requeue the message for retry
  end
end
```

### Line-by-line explanation (producer)

- require 'bunny' / 'json': Load Bunny and JSON handling.
- Bunny.new(hostname: 'localhost') / conn.start: Establish a connection to the broker.
- channel = conn.create_channel: Create a channel (lightweight thread of communication).
- channel.confirm_select: Enable publisher confirmations for reliability (optional but recommended).
- queue = channel.queue('orders', durable: true): Declare a durable queue to survive broker restarts.
- channel.default_exchange.publish(..., routing_key: queue.name, persistent: true): Publish using the default exchange, routing to the target queue; persistent ensures message survival on broker restart.
- puts "Published: ..." / conn.close: Confirm publish and close resources.

### Line-by-line explanation (consumer)

- queue.subscribe(manual_ack: true, block: true): Start a consumer with manual acks, blocking the main thread.
- delivery_info, properties, body: Delivery metadata, message properties, and payload.
- JSON.parse(body): Decode the JSON payload for business logic.
- sleep(0.5): Simulated work to illustrate processing time.
- channel.ack(delivery_tag): Explicitly acknowledge successful processing, allowing the broker to release the message and remove it from the queue.
- rescue / ensure: Ensure you handle errors; unacknowledged messages are requeued for retry.

---

## 3. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Kafka: Missing partitioning key leads to random partition assignment and potential reordering
- RabbitMQ: No acknowledgments can cause data loss on consumer crashes
- idempotency: Not handling duplicate events in a distributed system
- DLQ and retries: No dead-letter or max-retry handling leads to stuck or lost messages

Bad vs Good examples

1) Kafka: No partition key (bad) vs with partition key (good)

```ruby
# Bad: no key, may go to arbitrary partitions
producer.produce("UserSignup", topic: "user-events")

# Good: include a key to keep ordering per user or entity
producer.produce("UserSignup", topic: "user-events", key: "user-42")
```

Line-by-line (bad vs good) explanation would follow the same pattern as above: discuss how the key influences partitioning and ordering.

2) RabbitMQ: Auto-acknowledgment (dangerous) vs manual acks (safe)

```ruby
# Bad: auto-acknowledge; message considered processed as soon as delivered
queue.subscribe do |delivery_info, metadata, body|
  process(body)
  channel.ack(delivery_info.delivery_tag) # In some setups this might be missing
end
# If the process crashes, message is lost since it was auto-acked
```

```ruby
# Good: manual acks ensure processing completes before ack
queue.subscribe(manual_ack: true, block: true) do |delivery_info, metadata, body|
  process(body)
  channel.ack(delivery_info.delivery_tag)
end
```

Line-by-line explanation: illustrate the risk of auto-ack vs the safety of explicit acks.

3) Idempotency: Non-idempotent side effects vs idempotent processing

```ruby
# Bad: processing twice leads to duplicate DB writes
def handle_event(event)
  User.create!(id: event[:user_id], name: event[:name])
end
```

```ruby
# Good: idempotent approach using a deduplication guard (e.g., a Redis set or DB table)
def handle_event(event)
  return if Redis.sismember("seen_events", event[:event_id])
  # perform the durable operation
  User.create!(id: event[:user_id], name: event[:name])
  Redis.sadd("seen_events", event[:event_id])
end
```

4) Dead-letter handling in RabbitMQ: no DLQ vs DLQ wiring

```ruby
# Bad: no DLQ and no max-retries
queue = channel.queue('orders', durable: true)
```

```ruby
# Good: DLQ setup with exchange and routing, plus max redeliver handling
dlx = channel.direct('dlx', durable: true)
dlq = channel.queue('orders.dlq', durable: true)
dlx.bind(dlq, routing_key: 'orders.dlq')
queue = channel.queue('orders', durable: true, arguments: {
  'x-dead-letter-exchange' => dlx.name,
  'x-dead-letter-routing-key' => 'orders.dlq'
})
```

Line-by-line: explain how a DLQ helps catch poison messages and keep the main queue healthy.

5) Observability: lack of metrics and tracing

```ruby
# Bad: silent failure or no metrics
producer.produce("Event", topic: "events")
```

```ruby
# Good: instrumented publish with basic metrics
start = Time.now
producer.produce("Event", topic: "events")
producer.deliver_messages
duration = Time.now - start
Metrics.increment("kafka.produce.success")
Metrics.time("kafka.produce.latency", duration)
```

Line-by-line: show how instrumentation improves operability and incident response.

---

## 4. Why This Matters In Real Systems — production context and real usage

- Throughput & scalability
  - Kafka partitions and replication enable horizontal scaling and fault tolerance. Use a sensible number of partitions per topic to balance fan-out vs ordering by key.
  - RabbitMQ can scale via clusters and shards and by tuning prefetch to control in-flight messages per consumer.

- Reliability and ordering
  - Kafka provides at-least-once delivery. To achieve effectively idempotent processing, design consumers to deduplicate and idempotently update state.
  - RabbitMQ provides reliable work queues with acknowledgments and DLQs to handle failures gracefully.

- Fault tolerance and recovery
  - Enable durable topics/queues, enable acks, and implement retry/backoff policies. For RabbitMQ, consider dead-letter exchanges for poison messages and backoff strategies for retries.

- Observability
  - Metrics: publish latency, in-flight messages, consumer lag, error rates, DLQ bounces.
  - Tracing: propagate trace context through producer and consumer code to link events across services.

- Schema and data modeling
  - Use schema validation (e.g., JSON Schema, Avro) to catch malformed messages early.
  - Include id fields and idempotency keys in event payloads to support deduping.

- Deployment considerations
  - Separation of concerns: isolates event ingestion from heavy processing to prevent backpressure from affecting user-facing endpoints.
  - Backpressure handling: consumer slowdowns should be met with increased parallelism (Kafka: more consumers/partitions; RabbitMQ: more workers, higher prefetch, or multiple queues).

- Ruby-specific notes
  - Ruby’s GIL means CPU-bound work in consumer threads can bottleneck; prefer multi-process workers or asynchronous processing for heavy tasks.
  - Use non-blocking I/O and worker pools where appropriate (e.g., Sidekiq-style patterns for background jobs consuming from queues).

---

## 5. Study Questions — 5 recall questions

1) What is the effect of using a message key in Kafka, and how does it influence partitioning and ordering?
2) How do you implement reliable message processing in RabbitMQ to avoid losing messages when a consumer crashes?
3) What is a Dead-Letter Queue (DLQ), and why would you configure one in RabbitMQ?
4) Explain the difference between at-least-once and exactly-once semantics in the context of message queues. How can you approximate exactly-once in practice?
5) List two important production considerations when integrating Kafka or RabbitMQ into a Ruby service stack (e.g., monitoring, schema, retries).

---

## 6. Exercise — a practical multi-part coding challenge

Goal: Build a small end-to-end event pipeline in Ruby that demonstrates a production-like pattern for both Kafka and RabbitMQ, including idempotency guards and simple observability hooks.

Part A: Kafka pipeline (Ruby)
- Task 1: Write a Ruby script that publishes 100 user_signup events to a Kafka topic "user-signups" with keys "user-<id>" to ensure partitioning by user_id.
- Task 2: Write a Ruby consumer that processes those events and stores processed_user_ids in an in-memory Set (or Redis if available) to demonstrate idempotency. The consumer should skip duplicates gracefully.
- Task 3: Add minimal instrumentation: log publish latency and a simple counter for processed messages.

Part B: RabbitMQ pipeline (Ruby)
- Task 1: Write a Ruby producer that sends 50 order_tasks to a RabbitMQ queue named "order-tasks" with persistent messages.
- Task 2: Write a Ruby consumer that processes tasks with manual acknowledgments and a simple retry mechanism: if processing fails, requeue up to 3 retries per message, after which those messages move to a DLQ "orders.dlq".
- Task 3: Create a basic DLQ wiring configuration with an exchange and routing key to route failed messages to the DLQ, then consume from the DLQ and log the failed payloads.

Part C: Observability and basic resilience
- Task 1: Add simple metrics scaffolding to both pipelines (e.g., counters for produced messages, processed messages, and a timing metric for processing duration).
- Task 2: Ensure both producers and consumers have clean shutdown hooks to close connections gracefully.

Deliverables (what you should produce)
- A small repository or set of files containing:
  - kafka_producer_consumer.rb with the Kafka example (as in Section 1) plus a separate producer and consumer as needed.
  - rabbitmq_producer.rb and rabbitmq_consumer.rb implementing the RabbitMQ tasks (as in Section 2).
  - A README with instructions to run a local Kafka and RabbitMQ (e.g., via Docker Compose), and how to run the scripts.
  - A brief section describing idempotency strategy and how you would scale in a real production environment (e.g., Redis-based deduping, transactional semantics where applicable).
  - Optional: a small metrics.rb helper to simulate instrumentation.

Notes on running locally
- For Kafka: you can run a local Kafka cluster via Docker (e.g., Zookeeper + Kafka containers) or use your existing cluster. Ensure the topic "orders" (and any topics you publish to) exists or auto-create is enabled.
- For RabbitMQ: you can run a local RabbitMQ container. Ensure the queues and exchanges (and DLQ) are created as shown in the code or via a setup script.

This lesson equips you with practical Ruby patterns for both streaming and queuing, highlights critical design decisions for real systems, and provides hands-on exercises to reinforce best practices in system design and scalability.