# Message Queues in Go: Kafka & RabbitMQ — Phase 9: System Design & Scalability

Message queues are the backbone of resilient, scalable backend systems. They decouple producers from consumers, enable asynchronous processing, and provide buffering under load. In Go, Kafka and RabbitMQ are two popular choices that cover different design patterns: Kafka for high-throughput streaming and event-sourced workflows, RabbitMQ for flexible routing and task queues. This lesson teaches core concepts, practical Go implementations, and patterns you can apply in real systems to design robust, scalable services.

## 1. Kafka Basics in Go: Producing and Consuming

This section demonstrates a simple synchronous Kafka producer and a consumer group in Go using the Sarama library. You'll learn how to publish events to a topic and how to consume them with a consumer group that supports horizontal scaling.

### 1.1 Kafka Producer (Go)

```go
package main

import (
  "fmt"
  "log"
  "os"
  "os/signal"
  "syscall"
  "time"

  "github.com/Shopify/sarama"
)

func main() {
  brokers := []string{"localhost:9092"}
  config := sarama.NewConfig()
  config.Producer.Return.Successes = true        // important to know when a message is written
  config.Producer.Retry.Max = 5                   // retry a few times on failure
  config.Producer.RequiredAcks = sarama.WaitForAll // wait for all in-sync replicas
  config.Version = sarama.V2_8_0

  producer, err := sarama.NewSyncProducer(brokers, config)
  if err != nil {
    log.Fatalf("failed to create producer: %v", err)
  }
  defer producer.Close()

  topic := "events"

  // Publish 10 messages
  for i := 0; i < 10; i++ {
    msg := &sarama.ProducerMessage{
      Topic: topic,
      Value: sarama.StringEncoder(fmt.Sprintf("event-%d", i)),
    }
    partition, offset, err := producer.SendMessage(msg)
    if err != nil {
      log.Printf("Failed to send message: %v", err)
      continue
    }
    log.Printf("message stored in partition %d at offset %d", partition, offset)
    time.Sleep(100 * time.Millisecond)
  }

  // Graceful shutdown on signals
  sigchan := make(chan os.Signal, 1)
  signal.Notify(sigchan, os.Interrupt, syscall.SIGTERM)
  <-sigchan
}
```

### 1.1 Kafka Consumer (Go) — ConsumerGroup

```go
package main

import (
  "context"
  "fmt"
  "log"

  "github.com/Shopify/sarama"
)

type consumerGroupHandler struct{}

func (consumerGroupHandler) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (consumerGroupHandler) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }
func (consumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
  for msg := range claim.Messages() {
    fmt.Printf("Consumed message: %s\n", string(msg.Value))
    session.MarkMessage(msg, "")
  }
  return nil
}

func main() {
  brokers := []string{"localhost:9092"}
  groupID := "sample-group"
  topics := []string{"events"}

  config := sarama.NewConfig()
  config.Version = sarama.V2_8_0
  config.Consumer.Return.Errors = true
  config.Consumer.Offsets.Initial = sarama.OffsetNewest

  cg, err := sarama.NewConsumerGroup(brokers, groupID, config)
  if err != nil {
    log.Fatalf("failed to create consumer group: %v", err)
  }
  defer cg.Close()

  ctx := context.Background()
  handler := consumerGroupHandler{}

  // Run until termination signal
  sig := make(chan os.Signal, 1)
  signal.Notify(sig, os.Interrupt)
  go func() {
    <-sig
    cancel()
  }()

  for {
    if err := cg.Consume(ctx, topics, handler); err != nil {
      log.Printf("error from consumer: %v", err)
    }
  }
}
```

### Line-by-line explanation

- Kafka producer: 
  - Import necessary packages, including Sarama for Kafka integration.
  - Configure a SyncProducer with returns enabled to get ack for each message.
  - Create the producer and iterate to send 10 messages to the topic "events".
  - Each SendMessage call returns the partition and offset where the message is stored; log for visibility.
  - Sleep briefly between messages to simulate pacing.
  - Listen for OS signals to exit gracefully.

- Kafka consumer (consumer group):
  - Define a handler that implements Setup, Cleanup, and ConsumeClaim. ConsumeClaim processes messages from each assigned partition and marks them as consumed.
  - Create a ConsumerGroup with a group ID and subscribe to the "events" topic.
  - Run the Consume loop inside a context; handle errors and exit on signal.

### 1.2 Line-by-line explanation (around the code blocks)
- See the detailed breakdown directly after each code block above to understand how each line contributes to producing or consuming messages, configuring producers/consumers, and ensuring reliable delivery.

## 2. RabbitMQ Basics in Go: Producing and Consuming

RabbitMQ is a great fit for task queues, work distribution, and flexible routing. In Go, the amqp091-go client is widely used. This section shows a basic durable queue, a producer that publishes tasks, and a consumer (worker) that processes them.

### 2.1 RabbitMQ Producer (Go)

```go
package main

import (
  "log"

  amqp091 "github.com/rabbitmq/amqp091-go"
)

func failOnError(err error, msg string) {
  if err != nil {
    log.Fatalf("%s: %s", msg, err)
  }
}

func main() {
  // Connect to RabbitMQ
  conn, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
  failOnError(err, "Failed to connect to RabbitMQ")
  defer conn.Close()

  ch, err := conn.Channel()
  failOnError(err, "Failed to open a channel")
  defer ch.Close()

  // Declare a durable queue
  q, err := ch.QueueDeclare(
    "emails", // name
    true,     // durable
    false,    // delete when unused
    false,    // exclusive
    false,    // no-wait
    nil,      // arguments
  )
  failOnError(err, "Failed to declare a queue")

  body := "Welcome to our service!"
  err = ch.Publish(
    "",     // exchange
    q.Name, // routing key (queue name)
    false,  // mandatory
    false,  // immediate
    amqp091.Publishing{
      ContentType: "text/plain",
      Body:        []byte(body),
    },
  )
  failOnError(err, "Failed to publish a message")
  log.Printf("Sent %s", body)
}
```

### 2.2 RabbitMQ Consumer (Go)

```go
package main

import (
  "log"

  amqp091 "github.com/rabbitmq/amqp091-go"
)

func failOnError(err error, msg string) {
  if err != nil {
    log.Fatalf("%s: %s", msg, err)
  }
}

func main() {
  // Connect to RabbitMQ
  conn, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
  failOnError(err, "Failed to connect to RabbitMQ")
  defer conn.Close()

  ch, err := conn.Channel()
  failOnError(err, "Failed to open a channel")
  defer ch.Close()

  // Declare the same durable queue
  q, err := ch.QueueDeclare(
    "emails",
    true,  // durable
    false, // delete when unused
    false, // exclusive
    false, // no-wait
    nil,   // arguments
  )
  failOnError(err, "Failed to declare a queue")

  msgs, err := ch.Consume(
    q.Name,
    "",    // consumer
    true,  // auto-ack
    false, // exclusive
    false, // no-local
    false, // no-wait
    nil,   // args
  )
  failOnError(err, "Failed to register a consumer")

  forever := make(chan bool)

  go func() {
    for d := range msgs {
      log.Printf("Received a message: %s", d.Body)
      // In a real worker: perform the email task here
    }
    forever <- true
  }()

  log.Printf("Waiting for messages. To exit press CTRL+C")
  <-forever
}
```

### Line-by-line explanation

- RabbitMQ producer:
  - Connect to RabbitMQ and open a channel.
  - Declare a durable queue named "emails" so messages survive broker restarts.
  - Publish a message to the "emails" queue with a plain text body.
  - Log the sent message and exit.

- RabbitMQ consumer:
  - Connect and declare the same durable queue.
  - Register a consumer on the queue with auto-acknowledgement.
  - Spin a goroutine to handle incoming deliveries and log the payload.
  - Block the main thread to keep the worker alive.

## 3. Design Patterns: Reliability, Idempotency, and Bridges

This section covers patterns that help you build robust systems: idempotent processing to avoid duplicate work, at-least-once vs exactly-once delivery semantics, and simple bridging between messaging systems to support hybrid architectures.

### 3.1 Idempotent processing (Go)

A lightweight in-memory idempotence store demonstrates how to avoid re-processing the same event. In production, replace with Redis, a database, or a distributed cache.

```go
package main

import (
  "fmt"
  "log"
  "sync"
)

type IdempotentStore struct {
  mu   sync.RWMutex
  seen map[string]bool
}

func NewIdempotentStore() *IdempotentStore {
  return &IdempotentStore{seen: make(map[string]bool)}
}

func (s *IdempotentStore) IsProcessed(id string) bool {
  s.mu.RLock()
  defer s.mu.RUnlock()
  return s.seen[id]
}

func (s *IdempotentStore) MarkProcessed(id string) {
  s.mu.Lock()
  s.seen[id] = true
  s.mu.Unlock()
}

func processEvent(id string, payload string) {
  fmt.Printf("Processing event %s: %s\n", id, payload)
}

func main() {
  store := NewIdempotentStore()
  events := []struct{ id, payload string }{
    {"evt-1", "data A"},
    {"evt-2", "data B"},
    {"evt-1", "data A"}, // duplicate
  }

  for _, e := range events {
    if store.IsProcessed(e.id) {
      log.Printf("Duplicate detected for %s; skipping", e.id)
      continue
    }
    processEvent(e.id, e.payload)
    store.MarkProcessed(e.id)
  }
}
```

### 3.2 Line-by-line explanation

- Create a thread-safe in-memory store to track processed event IDs.
- IsProcessed checks if an ID was seen; MarkProcessed records an ID as processed.
- main simulates a stream of events, skipping duplicates by consulting the store.
- This pattern helps achieve idempotent processing; replace the in-memory map with Redis or a database for production.

### 3.3 End-to-end bridging: Kafka to RabbitMQ (simplified)

Bridge services are common in hybrid architectures. This simple bridge consumes from a Kafka topic and republishes messages to a RabbitMQ queue, enabling systems that rely on different messaging technologies to interoperate.

```go
package main

import (
  "context"
  "log"
  "os"
  "os/signal"
  "syscall"

  "github.com/Shopify/sarama"
  amqp091 "github.com/rabbitmq/amqp091-go"
)

type bridgeHandler struct {
  rabbit *amqp091.Channel
  queue  string
}

func (h *bridgeHandler) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (h *bridgeHandler) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }
func (h *bridgeHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
  for msg := range claim.Messages() {
    // Publish to RabbitMQ
    err := h.rabbit.Publish(
      "", h.queue, false, false,
      amqp091.Publishing{
        ContentType: "text/plain",
        Body:        msg.Value,
      },
    )
    if err == nil {
      session.MarkMessage(msg, "")
    } else {
      log.Printf("bridge publish error: %v", err)
    }
  }
  return nil
}

func main() {
  // Kafka consumer group setup
  brokers := []string{"localhost:9092"}
  groupID := "bridge-group"
  topics := []string{"events"}

  config := sarama.NewConfig()
  config.Version = sarama.V2_8_0
  config.Consumer.Return.Errors = true

  cg, err := sarama.NewConsumerGroup(brokers, groupID, config)
  if err != nil { log.Fatalf("failed to create consumer group: %v", err) }
  defer cg.Close()

  // RabbitMQ setup
  conn, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
  if err != nil { log.Fatalf("RabbitMQ dial: %v", err) }
  defer conn.Close()

  ch, err := conn.Channel()
  if err != nil { log.Fatalf("RabbitMQ channel: %v", err) }
  defer ch.Close()

  q, err := ch.QueueDeclare("bridge-queue", true, false, false, false, nil)
  if err != nil { log.Fatalf("QueueDeclare: %v", err) }

  handler := &bridgeHandler{rabbit: ch, queue: q.Name}

  // Run bridge
  ctx, cancel := context.WithCancel(context.Background())
  go func() {
    for {
      if err := cg.Consume(ctx, topics, handler); err != nil {
        log.Printf("consume error: %v", err)
      }
    }
  }()

  // Graceful shutdown
  sig := make(chan os.Signal, 1)
  signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
  <-sig
  cancel()
}
```

### Line-by-line explanation

- BridgeHandler holds a RabbitMQ channel and target queue name.
- ConsumeClaim reads Kafka messages and republishes them to RabbitMQ, marking messages only if publish succeeds.
- main wires up Kafka consumer group and RabbitMQ publisher, then runs until interrupted.
- This pattern enables cross-system messaging and can be extended with error handling, retries, and dead-lettering.

## 4. Common Beginner Mistakes

Pitfalls are easy to make when you’re new to message queues. The examples show bad vs good practices side-by-side.

### 4.1 Pitfall 1: Not configuring durable queues/topics or not handling acks

Bad: Non-durable queues and no acks.

```go
// Bad: not durable, no acks (pseudo)
queueDeclare("jobs", false, false, false, false, nil)
Publish("", "jobs", true, []byte("task"))
```

Good: Durable queues and explicit acks.

```go
// Good: durable queue and acks
q, _ := ch.QueueDeclare("jobs", true, false, false, false, nil)
ch.Publish("", q.Name, false, false, amqp.Publishing{Body: []byte("task"), ContentType: "text/plain"})
```

### 4.2 Pitfall 2: Ignoring delivery guarantees across systems

Bad: Fire-and-forget without confirmation or retries.

```go
producer.SendMessage(&sarama.ProducerMessage{Topic: "events", Value: sarama.StringEncoder("msg")})
// No handling of partition/offset or failures
```

Good: Use acknowledgments, retries, and idempotent handlers.

```go
msg := &sarama.ProducerMessage{Topic: "events", Value: sarama.StringEncoder("msg")}
partition, offset, err := producer.SendMessage(msg)
if err != nil {
  log.Printf("send failed: %v; will retry or route to DLQ", err)
} else {
  log.Printf("delivered to partition %d at offset %d", partition, offset)
}
```

### 4.3 Pitfall 3: No idempotency or deduplication

Bad: Processing duplicates if the same message is delivered twice.

```go
for msg := range msgs {
  // process blindly
  process(msg.Body)
}
```

Good: Deduplicate using an idempotent store.

```go
store := NewIdempotentStore() // replace with Redis/DB in production
for msg := range msgs {
  if store.IsProcessed(string(msg.Body)) {
    continue
  }
  process(msg.Body)
  store.MarkProcessed(string(msg.Body))
}
```

### Line-by-line explanation

- Each pitfall pairs a bad approach with a corrected approach to highlight the importance of durability, delivery guarantees, and idempotency.
- The bad code illustrates missing durability, lack of acks, or no deduplication.
- The good code demonstrates best practices: durable queues, message acknowledgments, retries, and idempotent processing.

## 5. Why This Matters In Real Systems

- Throughput and latency: Kafka shines with high-throughput streaming and durable logs; RabbitMQ excels at flexible routing, queues, and worker pools.
- Fault tolerance: Durable topics/queues and proper acks reduce data loss; replication factors in Kafka ensure resilience.
- Operational concerns: Monitoring, dead-letter queues, backpressure handling, message deduplication, and idempotent processing are critical for production reliability.
- Scaling patterns:
  - Kafka: scale by increasing partitions per topic and adding brokers; use consumer groups to parallelize processing.
  - RabbitMQ: scale workers horizontally; consider prefetch settings for backpressure; use DLQs for failed tasks.
- Real deployments: In production you’ll preference Kafka for event streams and event-sourced architectures, while RabbitMQ handles background jobs, task queues, and complex routing. Hybrid architectures often bridge these systems to implement reliable data pipelines.

## 6. Study Questions

1. What is the difference between at-least-once and exactly-once delivery in the context of Kafka and RabbitMQ?
2. How do consumer groups enable horizontal scaling in Kafka, and what is a potential pitfall with offset management?
3. Why is idempotency important in message processing, and what are common approaches to implement it in Go?
4. When would you choose RabbitMQ over Kafka, and vice versa?
5. What are some practical considerations for durability and retries in a production messaging system?

## 7. Exercise

This multi-part exercise helps you build a small end-to-end messaging pipeline in Go, using both Kafka and RabbitMQ. You’ll implement producers, consumers, a deduplicating processor, and a bridge that moves messages from Kafka to RabbitMQ.

Part A — Kafka producer and consumer (Go, Sarama)
- Goal: Publish 20 events to a Kafka topic and consume them with a consumer group.
- Deliverables:
  - A Go program that publishes 20 messages to topic events.
  - A Go program that consumes messages from topic events as part of a consumer group named "exercise-group".
- Steps:
  - Ensure Kafka is running locally (localhost:9092) and create the topic "events".
  - Implement producer.go (uses Sarama SyncProducer) and consumer.go (implements ConsumerGroupHandler).
  - Run producer and then run consumer to observe messages being consumed.

Part B — RabbitMQ producer and worker (Go, amqp091-go)
- Goal: Publish tasks to a durable queue and have a worker process them.
- Deliverables:
  - A Go program that publishes 5 tasks to queue "emails".
  - A Go program that consumes from "emails" and prints the payload, simulating a worker.
- Steps:
  - Ensure RabbitMQ is running locally (localhost:5672).
  - Implement rabbit_producer.go and rabbit_worker.go.
  - Run producer first, then run the worker to observe processing.

Part C — Bridge: Kafka -> RabbitMQ
- Goal: Consume from Kafka topic "events" and publish to RabbitMQ queue "bridge".
- Deliverables:
  - A Go program that runs a bridge: it consumes Kafka messages and republishes them to RabbitMQ.
- Steps:
  - Combine the code patterns from Part A and Part B.
  - Run the bridge and verify that publishing to Kafka results in a message appearing in RabbitMQ.

Part D — Optional: Idempotent processing
- Goal: Add idempotent processing to the consumer (e.g., deduplicate by message ID).
- Deliverables:
  - Extend the Kafka consumer to maintain a dedup store (in-memory for learning; replace with Redis/DB for production).
  - Demonstrate processing the same message twice only once.

Notes and setup:
- Prerequisites: Go installed, go.mod initialized where you’re running the code; Kafka and RabbitMQ running locally with default credentials.
- Dependencies: sarama (github.com/Shopify/sarama), amqp091-go (github.com/rabbitmq/amqp091-go).
- Environment variables and config: In production, externalize broker addresses, topics, queues, credentials, and configure TLS or SASL as needed.

If you’d like, I can provide fully wired go.mod templates and a minimal repository layout (cmd/kafka_producer, cmd/kafka_consumer, cmd/rabbit_producer, cmd/rabbit_worker, cmd/bridge) with ready-to-run main.go files for each part.