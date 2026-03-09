# Message Queues in Java: Kafka & RabbitMQ (Phase 9 — System Design & Scalability)

Message queues are the backbone of asynchronous, resilient backend systems. They decouple producers from consumers, enable backpressure, and provide durable, replayable streams of events. In Java, Kafka and RabbitMQ are the two most popular message-queuing engines, each with different guarantees, APIs, and best-fit scenarios. This lesson equips you with the core concepts, production-grade Java patterns, and practical code you can adapt in real systems.

## 1. Core Concepts: When to use Kafka vs RabbitMQ (Delivery, Semantics, and Patterns)

- Kafka is a distributed, partitioned commit-log designed for high-throughput streams, event sourcing, and durable storage with strong ordering within partitions. It shines when you need event replay, scalable consumption, and long-term retention.
- RabbitMQ is a message broker built on flexible routing via exchanges and queues. It excels at complex routing, request/response patterns, and workloads requiring strict delivery acknowledgements and low-latency messaging.

Key concepts you’ll encounter:
- Delivery semantics: at-least-once, at-most-once, and exactly-once (via idempotent consumers or transactional producers).
- Durability: topic/queue persistence, replication (Kafka), durable exchanges/queues in RabbitMQ.
- Ordering and consumption: Kafka provides per-partition ordering; RabbitMQ focuses on per-message acknowledgment and prefetch control.
- Scaling: Kafka scales by adding partitions and consumers in a consumer group; RabbitMQ scales via clustering, sharding, and multiple consumers with prefetch.

Code-free explanation:
- In Kafka, a topic is split into partitions. Each partition preserves a total order, and consumers within a group coordinate to divide partitions. Offset management controls what a consumer has processed.
- In RabbitMQ, producers publish to exchanges, which route messages to queues based on bindings. Consumers pull from queues (or get pushed, depending on mode). Acknowledgments confirm processing.

---

## 2. Kafka Fundamentals: Topics, Partitions, and Delivery Semantics

- Topics, partitions, and replication
- Producer guarantees and idempotence
- Consumer groups and offset management

### Kafka Producer: Java example (with durable acks and idempotence)

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class SimpleKafkaProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        // Kafka bootstrap servers
        props.put("bootstrap.servers", "localhost:9092");
        // Key/value serializers
        props.put("key.serializer", StringSerializer.class.getName());
        props.put("value.serializer", StringSerializer.class.getName());
        // Acknowledgment and reliability
        props.put("acks", "all"); // wait for leader and replicas
        props.put("retries", 3);
        // Enable idempotence to avoid duplicate sends
        props.put("enable.idempotence", "true");
        // Optional: limit max in-flight requests per connection when idempotence is on
        props.put("max.in.flight.requests.per.connection", "5");

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            String topic = "order.events";
            for (int i = 0; i < 5; i++) {
                String key = "order-" + i;
                String value = "{\"orderId\":" + i + ",\"amount\":" + (i * 10) + "}";
                ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
                producer.send(record);
                System.out.println("Sent: " + record);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### Line-by-line explanation breaking down each line

- import org.apache.kafka.clients.producer.KafkaProducer; // Bring in the KafkaProducer class
- import org.apache.kafka.clients.producer.ProducerRecord; // For creating records to send
- import org.apache.kafka.clients.producer.ProducerConfig; // Optional: producer configuration constants
- import org.apache.kafka.common.serialization.StringSerializer; // Serialize String keys/values
- import java.util.Properties; // Hold configuration properties
- public class SimpleKafkaProducer { // Entry point class
-     public static void main(String[] args) { // Program start
-         Properties props = new Properties(); // Create a new properties map
-         props.put("bootstrap.servers", "localhost:9092"); // Kafka broker address
-         props.put("key.serializer", StringSerializer.class.getName()); // Key serializer
-         props.put("value.serializer", StringSerializer.class.getName()); // Value serializer
-         props.put("acks", "all"); // Wait for leader and replicas to acknowledge
-         props.put("retries", 3); // Retry sending on transient failures
-         props.put("enable.idempotence", "true"); // Ensure idempotent sends to avoid duplicates
-         props.put("max.in.flight.requests.per.connection", "5"); // Safe concurrency with idempotence
-         try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) { // Create producer
-             String topic = "order.events"; // Target topic
-             for (int i = 0; i < 5; i++) { // Send a small batch
-                 String key = "order-" + i; // Message key
-                 String value = "{\"orderId\":" + i + ",\"amount\":" + (i * 10) + "}"; // Message value (JSON)
-                 ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value); // Build record
-                 producer.send(record); // Send asynchronously
-                 System.out.println("Sent: " + record); // Telemetry
-             }
-         } catch (Exception e) { // Catch any exceptions
-             e.printStackTrace(); // Print stack trace for debugging
-         }
-     }
- }

Note: This producer uses idempotence and acks=all for durability. In a real system, you’d likely flush or wait for callback on each send depending on guarantees required.

### Kafka Consumer: Java example (manual commit, at-least-once handling)

```java
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class SimpleKafkaConsumer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "order.service");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        // Disable auto-commit to control offset progression
        props.put("enable.auto.commit", "false");
        // Optional: ensure read-committed reads
        props.put("isolation.level", "read_committed");

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(Collections.singletonList("order.events"));
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
                for (ConsumerRecord<String, String> record : records) {
                    // Process the message
                    System.out.printf("offset=%d key=%s value=%s%n",
                            record.offset(), record.key(), record.value());
                    // In real processing, apply idempotent work here
                }
                // Commit offsets only after successful processing
                consumer.commitSync();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### Line-by-line explanation breaking down each line

- import org.apache.kafka.clients.consumer.ConsumerRecord; // Represents a single record
- import org.apache.kafka.clients.consumer.ConsumerRecords; // Container for a batch of records
- import org.apache.kafka.clients.consumer.KafkaConsumer; // The consumer client
- import java.time.Duration; // For poll timeout
- import java.util.Collections; // For singleton list
- import java.util.Properties; // Configuration container
- public class SimpleKafkaConsumer { // Entry point
-     public static void main(String[] args) { // Program start
-         Properties props = new Properties(); // Create config
-         props.put("bootstrap.servers", "localhost:9092"); // Kafka broker
-         props.put("group.id", "order.service"); // Consumer group
-         props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer"); // Key deserializer
-         props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer"); // Value deserializer
-         props.put("enable.auto.commit", "false"); // Take manual control of offsets
-         props.put("isolation.level", "read_committed"); // Read committed messages (optional)
-         try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) { // Create consumer
-             consumer.subscribe(Collections.singletonList("order.events")); // Subscribe to topic
-             while (true) { // Continuous loop
-                 ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1)); // Pull
-                 for (ConsumerRecord<String, String> record : records) { // Iterate
-                     // Process the message
-                     System.out.printf("offset=%d key=%s value=%s%n",
-                             record.offset(), record.key(), record.value()); // Echo
-                     // In real processing, implement idempotent handling here
-                 }
-                 // Commit offsets after processing
-                 consumer.commitSync();
-             }
-         } catch (Exception e) {
-             e.printStackTrace();
-         }
-     }
- }
```

### Line-by-line explanation breaking down each line

- import org.apache.kafka.clients.consumer.ConsumerRecord; // Represents a single message
- import org.apache.kafka.clients.consumer.ConsumerRecords; // Batch container
- import org.apache.kafka.clients.consumer.KafkaConsumer; // Kafka consumer class
- import java.time.Duration; // Poll timeout duration
- import java.util.Collections; // Utility for Collections.singletonList
- import java.util.Properties; // Configuration map
- public class SimpleKafkaConsumer { // Entry point
-     public static void main(String[] args) { // Program start
-         Properties props = new Properties(); // Instantiate config
-         props.put("bootstrap.servers", "localhost:9092"); // Broker address
-         props.put("group.id", "order.service"); // Consumer group
-         props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer"); // Key deserializer
-         props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer"); // Value deserializer
-         props.put("enable.auto.commit", "false"); // Manual commit control
-         props.put("isolation.level", "read_committed"); // Read committed (optional)
-         try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) { // Create consumer
-             consumer.subscribe(Collections.singletonList("order.events")); // Subscribe topic
-             while (true) { // Continuous loop
-                 ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1)); // Fetch
-                 for (ConsumerRecord<String, String> record : records) { // Process
-                     System.out.printf("offset=%d key=%s value=%s%n",
-                             record.offset(), record.key(), record.value()); // Print
-                     // TODO: Idempotent processing logic
-                 }
-                 consumer.commitSync(); // Commit after processing
-             }
-         } catch (Exception e) {
-             e.printStackTrace();
-         }
-     }
- }
```

---

## 3. RabbitMQ Fundamentals: Exchanges, Queues, and Bindings

- Exchanges, queues, and bindings overview
- Durable messages and acknowledgments
- Routing with direct/fanout/topic exchanges

### RabbitMQ Producer: Java example (direct exchange, durable)

```java
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.MessageProperties;
import com.rabbitmq.client.AMQP;

import java.nio.charset.StandardCharsets;

public class SimpleRabbitProducer {
    private static final String EXCHANGE_NAME = "events";
    private static final String ROUTING_KEY = "order.created";

    public static void main(String[] args) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("localhost");

        try (Connection connection = factory.newConnection();
             Channel channel = connection.createChannel()) {

            // Durable direct exchange
            channel.exchangeDeclare(EXCHANGE_NAME, "direct", true);

            String message = "{\"orderId\": 12345, \"status\": \"created\"}";
            // Persistent messages
            AMQP.BasicProperties props = MessageProperties.PERSISTENT_TEXT_PLAIN;

            channel.basicPublish(EXCHANGE_NAME, ROUTING_KEY, props, message.getBytes(StandardCharsets.UTF_8));
            System.out.println("Sent: " + message);
        }
    }
}
```

### Line-by-line explanation breaking down each line

- import com.rabbitmq.client.ConnectionFactory; // Factory to create connections
- import com.rabbitmq.client.Connection; // Represents a connection to the broker
- import com.rabbitmq.client.Channel; // Channel for communication
- import com.rabbitmq.client.MessageProperties; // Convenience for persistent messages
- import com.rabbitmq.client.AMQP; // AMQP types (for properties)
- import java.nio.charset.StandardCharsets; // UTF-8 charset
- public class SimpleRabbitProducer { // Entry point
-     private static final String EXCHANGE_NAME = "events"; // Exchange name
-     private static final String ROUTING_KEY = "order.created"; // Routing key
-     public static void main(String[] args) throws Exception { // Program start
-         ConnectionFactory factory = new ConnectionFactory(); // Create factory
-         factory.setHost("localhost"); // Broker host
-         try (Connection connection = factory.newConnection();
-              Channel channel = connection.createChannel()) { // Open connection/channel
-             channel.exchangeDeclare(EXCHANGE_NAME, "direct", true); // Declare durable direct exchange
-             String message = "{\"orderId\": 12345, \"status\": \"created\"}"; // Message payload
-             AMQP.BasicProperties props = MessageProperties.PERSISTENT_TEXT_PLAIN; // Persistent delivery
-             channel.basicPublish(EXCHANGE_NAME, ROUTING_KEY, props, message.getBytes(StandardCharsets.UTF_8)); // Publish
-             System.out.println("Sent: " + message); // Telemetry
-         }
-     }
- }
```

### RabbitMQ Consumer: Java example (queue consume with manual acks and QoS)

```java
import com.rabbitmq.client.*;

import java.nio.charset.StandardCharsets;

public class SimpleRabbitConsumer {
    private static final String QUEUE_NAME = "order.queue";

    public static void main(String[] args) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("localhost");

        try (Connection connection = factory.newConnection();
             Channel channel = connection.createChannel()) {

            // Declare a durable queue
            channel.queueDeclare(QUEUE_NAME, true, false, false, null);

            // Prefetch one message at a time (back-pressure)
            channel.basicQos(1);

            DeliverCallback deliverCallback = (consumerTag, delivery) -> {
                String message = new String(delivery.getBody(), StandardCharsets.UTF_8);
                System.out.println("Received: " + message);

                // Simulate processing
                try {
                    Thread.sleep(100);
                } catch (InterruptedException ignored) {}

                // Acknowledge after successful processing
                channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
            };

            // Consume with manual acks (autoAck=false)
            channel.basicConsume(QUEUE_NAME, false, deliverCallback, consumerTag -> {});
            // Keep the program alive to listen for messages
            Thread.sleep(Long.MAX_VALUE);
        }
    }
}
```

### Line-by-line explanation breaking down each line

- import com.rabbitmq.client.*; // Import all RabbitMQ client classes
- import java.nio.charset.StandardCharsets; // UTF-8
- public class SimpleRabbitConsumer { // Entry point
-     private static final String QUEUE_NAME = "order.queue"; // Queue name
-     public static void main(String[] args) throws Exception { // Start
-         ConnectionFactory factory = new ConnectionFactory(); // Create factory
-         factory.setHost("localhost"); // Broker host
-         try (Connection connection = factory.newConnection();
-              Channel channel = connection.createChannel()) { // Open connection/channel
-             channel.queueDeclare(QUEUE_NAME, true, false, false, null); // Declare durable queue
-             channel.basicQos(1); // Process one message at a time
-             DeliverCallback deliverCallback = (consumerTag, delivery) -> { // Callback on message
-                 String message = new String(delivery.getBody(), StandardCharsets.UTF_8); // Message payload
-                 System.out.println("Received: " + message); // Show
-                 try { Thread.sleep(100); } catch (InterruptedException ignored) {} // Simulated work
-                 channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false); // Manual ack
-             };
-             channel.basicConsume(QUEUE_NAME, false, deliverCallback, consumerTag -> {}); // Start consuming
-             Thread.sleep(Long.MAX_VALUE); // Keep alive
-         }
-     }
- }
```

---

## 4. Design Patterns and Tradeoffs: Exactly-once, Idempotence, and Dead-Lettering

- Exactly-once semantics are tricky; most systems rely on at-least-once with idempotent processing.
- Kafka: idempotent producers plus careful offset management can approximate exactly-once processing in many cases.
- RabbitMQ: ack-based delivery allows reliable processing; dead-letter exchanges help handle poison messages.
- Dead-lettering strategies: after N retries, route to a DLQ with metadata for retries, last error, and time.

Key recommendations:
- Prefer idempotent processing in your consumers. If processing a message twice should produce the same result, you’ve increased reliability.
- Use durable topics/queues and persistent messages for durability.
- Consider backpressure and prefetch controls to avoid overwhelming consumers.
- Employ dead-letter queues to isolate problematic messages.
- Instrument with metrics (lag, in-flight messages, queue depth, processing latency) and tracing across producers/consumers.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Auto-commit offsets in Kafka, causing misaligned processing
  - Bad:
```java
// Kafka consumer: auto-commit enabled
props.put("enable.auto.commit", "true");
```
```java
// Processing a batch, but offset not tracked per-message
consumer.poll(Duration.ofSeconds(1)).forEach(r -> process(r));
```
  - Good:
```java
// Kafka consumer: manual commit
props.put("enable.auto.commit", "false");
```
```java
// Process then commit after each poll
ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
for (ConsumerRecord<String, String> r : records) {
    process(r);
}
consumer.commitSync();
```

- Pitfall 2: Not using persistent messages in RabbitMQ
  - Bad:
```java
channel.basicPublish(EXCHANGE_NAME, ROUTING_KEY, null, bodyBytes); // non-persistent
```
  - Good:
```java
AMQP.BasicProperties props = MessageProperties.PERSISTENT_TEXT_PLAIN;
channel.basicPublish(EXCHANGE_NAME, ROUTING_KEY, props, bodyBytes); // persistent
```

- Pitfall 3: No backpressure and unbounded prefetch in RabbitMQ
  - Bad:
```java
channel.basicConsume(QUEUE_NAME, true, deliveryCallback, consumerTag -> {});
```
  - Good:
```java
channel.basicQos(1); // process one message at a time
channel.basicConsume(QUEUE_NAME, false, deliveryCallback, consumerTag -> {});
```

- Pitfall 4: Ignoring idempotence in Kafka consumers
  - Bad:
```java
// Re-process message each time without dedup logic
String id = record.offset() + "-" + record.partition();
store.process(id, record.value()); // duplicates allowed
```
  - Good:
```java
String id = record.offset() + "-" + record.partition();
if (!deduper.isProcessed(id)) {
    store.process(id, record.value());
    deduper.markProcessed(id);
}
```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability and correctness are non-negotiable in user-facing services. Ensuring messages are not lost or misprocessed under failure scenarios is crucial.
- Observability: instrument producers and consumers with metrics (throughput, latency, lag, error rate) and distributed tracing to diagnose bottlenecks.
- Security: encrypt in transit (TLS), authenticate clients (SASL for Kafka, SSL for RabbitMQ), and enforce least privilege permissions.
- Operations: monitor queue depth, consumer lag, and backpressure. Have runbooks for scaling (add partitions for Kafka or more RabbitMQ consumers), and for failover (replication, clustering).
- Evolution: plan for schema changes in message payloads (e.g., using Avro or JSON schemas) and handle backward-compatibility in producers/consumers.

Real-world patterns:
- Event sourcing: Kafka as the system of record for domain events; consumers rebuild state by replaying streams.
- Command/Event separation: RabbitMQ handles command routing with flexible routing topologies; Kafka handles immutable event streams for analytics and integration.
- Dead-letter flows: handle poison messages gracefully; implement retries with exponential backoff.

---

## Z. Study Questions — 5 recall questions

1. What is the difference between a Kafka topic and a RabbitMQ exchange?
2. How does enabling idempotence on a Kafka producer help with exactly-once-like semantics?
3. Why would you disable auto-commit in a Kafka consumer, and what pattern does that enable?
4. What is a dead-letter queue (or dead-letter exchange) and when would you use it?
5. How does prefetch (basicQos) in RabbitMQ influence consumer backpressure and workload distribution?

---

## Exercise — practical multi-part coding challenge

Goal: Build a small, end-to-end event pipeline using both Kafka and RabbitMQ in Java, then compare behavior under failure.

Part A — Setup (hands-on)
- Create a Maven/Gradle project that includes dependencies for:
  - Kafka client (org.apache.kafka:kafka-clients)
  - RabbitMQ Java client (com.rabbitmq:amqp-client)
- Create a basic configuration class to hold:
  - Kafka: bootstrap servers, topic name, acks, idempotence flag
  - RabbitMQ: host, exchange, queue, routing key

Part B — Kafka-based event flow (producer + consumer)
- Implement SimpleKafkaProducer (as in Section 2) that writes 5 events to topic "order.events" with keys "order-0"… "order-4" and JSON values.
- Implement SimpleKafkaConsumer (as in Section 2) that consumes from "order.events", processes messages, and uses manual offset commits.
- Add a tiny in-memory store to deduplicate by a unique identifier (e.g., composite of partition and offset or a generated eventId inside the payload) to simulate idempotent processing.

Part C — RabbitMQ-based event flow (producer + consumer)
- Implement SimpleRabbitProducer (as in Section 3) that publishes to exchange "events" with routing key "order.created" and a persistent message.
- Implement SimpleRabbitConsumer (as in Section 3) that consumes from "order.queue" with manual acks, and uses basicQos(1) for backpressure.

Part D — Failure simulation and analysis
- Inject a simulated failure after publishing messages (e.g., stop the consumer mid-processing) and observe:
  - Kafka: offsets after restart and whether messages are reprocessed
  - RabbitMQ: how unacknowledged messages are re-delivered after consumer restarts

Part E — Reflection questions
1. How do you decide between at-least-once and exactly-once semantics for a given domain event?
2. What are the tradeoffs of using direct vs fanout vs topic exchanges in RabbitMQ for a multi-service system?
3. How would you implement a DLQ (dead-letter queue) in RabbitMQ or Kafka in your exercise?
4. How would you instrument and monitor such a pipeline in a real production environment (metrics, traces, alerts)?
5. How would you extend the Kafka producer/consumer to support schema evolution (e.g., Avro or JSON Schema)?

End-to-end, this lesson provides you with concrete Java patterns for Kafka and RabbitMQ, along with the critical design considerations and practical exercises to apply them in real systems.