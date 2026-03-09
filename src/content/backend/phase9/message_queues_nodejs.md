# Phase 9 — System Design & Scalability: Message Queues — Kafka & RabbitMQ (Node.js)

Message queues are foundational for building scalable, fault-tolerant backends. They decouple producers from consumers, absorb bursts of load, enable asynchronous processing, and provide durability guarantees. In professional systems, choosing the right queue (Kafka vs RabbitMQ) and implementing correct semantics (at-least-once vs exactly-once, idempotence, dead-letter handling) are critical for reliability and performance.

## 1. Conceptual Foundations: Why Message Queues Matter (Kafka vs RabbitMQ) 

- What they are: systems that store and deliver messages between producers and consumers, often with durability, ordering, and at-least-once/at-most-once semantics.
- When to use Kafka: high-throughput, durable log-like streams, publish-subscribe or event-sourcing patterns, partitioned parallelism, long-term retention.
- When to use RabbitMQ: flexible routing (exchanges, queues), complex routing topologies, lower-latency request/response and task queues, strong delivery guarantees with acknowledgments.
- Core decisions:
  - Delivery semantics: at-least-once, exactly-once (via idempotence and careful offset/ACK handling).
  - Ordering guarantees: Kafka preserves order within a partition; RabbitMQ can preserve order within a queue.
  - Durability: persistent messages, durable queues/exchanges.
  - Scaling: Kafka scales via partitions and consumer groups; RabbitMQ scales via clustering, sharding, and multiple queues/exchanges.

Key concepts at a glance:
- Kafka topics, partitions, offsets, consumer groups.
- RabbitMQ queues, exchanges (direct, fanout, topic, headers), bindings, acknowledgments, dead-lettering.
- Observability: metrics, tracing, and logging to monitor lag, backlog, and consumer health.

Recommended setup notes:
- Install dependencies: npm install kafkajs amqplib
- Run broker instances locally or in your cloud environment to test producers/consumers.

---

## 2. Kafka with Node.js: Producing and Consuming Messages

KafkaJS provides a pure JavaScript client for Kafka. The following examples show a simple producer and a consumer using a single topic "events".

### Producer: publish messages to a Kafka topic

```js
// kafka-producer.js
const { Kafka } = require('kafkajs');

async function runProducer() {
  const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092'] // adjust to your Kafka bootstrap brokers
  });

  const producer = kafka.producer();
  await producer.connect();

  const messages = Array.from({ length: 10 }).map((_, i) => ({
    key: `k-${i}`,
    value: JSON.stringify({ id: i, payload: `event-${i}` }),
  }));

  await producer.send({
    topic: 'events',
    messages,
  });

  await producer.disconnect();
}

runProducer().catch(console.error);
```

### Consumer: read from topic with a consumer group

```js
// kafka-consumer.js
const { Kafka } = require('kafkajs');

async function runConsumer() {
  const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092']
  });

  const consumer = kafka.consumer({ groupId: 'event-consumers' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'events', fromBeginning: true });

  await consumer.run({
    // Process messages with default auto-commit (at-least-once semantics by default)
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString();
      const value = message.value?.toString();
      console.log(`Received message ${key} [${partition}@${topic}]: ${value}`);
      // ... perform processing
    },
  });
}

runConsumer().catch(console.error);
```

### Line-by-line explanation

- Producer:
  - Line 1-3: Import Kafka class from kafkajs.
  - Line 5-14: Create a Kafka client with a clientId and bootstrap broker addresses.
  - Line 16-18: Create and connect a producer instance.
  - Line 20-27: Build an array of 10 messages with distinct keys and JSON payloads.
  - Line 29-34: Send the batch to topic "events" and then disconnect.
- Consumer:
  - Line 1-3: Import Kafka class.
  - Line 5-11: Initialize Kafka client and a consumer with a groupId.
  - Line 13-15: Connect and subscribe to the "events" topic from the beginning.
  - Line 17-30: Run the consumer, processing eachMessage by logging payloads (core processing point).
  - Line 28-30: End of processing block; you can insert your business logic here.

---

## 3. RabbitMQ with Node.js: Queues, Exchanges, and a Worker

RabbitMQ uses queues and exchanges with explicit acknowledgments. The following examples show a durable queue workflow with a simple worker.

### Producer: send durable tasks to a queue

```js
// rabbitmq-producer.js
const amqp = require('amqplib');

async function send() {
  const conn = await amqp.connect('amqp://localhost');
  const ch = await conn.createChannel();
  const q = 'task_queue';

  await ch.assertQueue(q, { durable: true });
  const msg = 'Process this task';
  ch.sendToQueue(q, Buffer.from(msg), { persistent: true });

  console.log("Sent:", msg);
  setTimeout(() => { conn.close(); process.exit(0); }, 500);
}

send().catch(console.error);
```

### Consumer/Worker: long-running task with manual ack

```js
// rabbitmq-consumer.js
const amqp = require('amqplib');

async function consume() {
  const conn = await amqp.connect('amqp://localhost');
  const ch = await conn.createChannel();
  const q = 'task_queue';

  await ch.assertQueue(q, { durable: true });
  // One message at a time to demonstrate fair dispatch
  await ch.prefetch(1);

  console.log('Waiting for messages in %s. To exit press CTRL+C', q);
  ch.consume(q, async (msg) => {
    if (msg !== null) {
      const content = msg.content.toString();
      console.log("Processing:", content);
      // Simulate work
      await new Promise(res => setTimeout(res, 1000));

      // Acknowledge on success
      ch.ack(msg);
      console.log("Processed and acked:", content);
    }
  }, { noAck: false });
}

consume().catch(console.error);
```

### Line-by-line explanation

- Producer:
  - Lines 1-2: Import amqplib.
  - Lines 4-11: Connect to RabbitMQ, create a channel, and declare a durable queue named "task_queue".
  - Lines 12-16: Publish a persistent message to the queue.
  - Lines 18-21: Log and gracefully close the connection after a short delay.
- Consumer:
  - Lines 1-2: Import amqplib.
  - Lines 4-11: Connect, create a channel, declare the same durable queue, and set prefetch to 1 for fair dispatch.
  - Lines 13-24: Start consuming with manual acknowledgments. On receiving a message, convert content, simulate work, then ack to confirm success.
  - Lines 26-27: End of function and error handling.

---

## 4. Designing with Both: When to Use Kafka, When to Use RabbitMQ, and Lightweight Bridges

- Use Kafka when you need durable, replayable event streams, high throughput, and partitioned parallelism for scalable consumption.
- Use RabbitMQ when you need flexible routing, quick task queues, or strict delivery semantics with explicit acks and DLX patterns.
- Bridges and hybrids: a small bridge service can read from Kafka topics and fan messages into RabbitMQ queues for downstream workers that require traditional queue semantics, or vice versa.

### Bridge example: Kafka -> RabbitMQ bridge (Node.js)

```js
// bridge-kafka-to-rabbit.js
const { Kafka } = require('kafkajs');
const amqp = require('amqplib');

async function bridge() {
  const kafka = new Kafka({ clientId: 'bridge', brokers: ['localhost:9092'] });
  const consumer = kafka.consumer({ groupId: 'bridge-consumer' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'events', fromBeginning: true });

  const conn = await amqp.connect('amqp://localhost');
  const ch = await conn.createChannel();
  const q = 'bridge_tasks';
  await ch.assertQueue(q, { durable: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = message.value.toString();
      // Forward to RabbitMQ for worker processing
      ch.sendToQueue(q, Buffer.from(payload), { persistent: true });
      console.log('Bridged to RabbitMQ:', payload);
    },
  });
}

bridge().catch(console.error);
```

### Line-by-line explanation

- Bridge setup:
  - Lines 1-4: Import KafkaJS and amqplib.
  - Lines 6-12: Create Kafka consumer and subscribe to "events".
  - Lines 14-21: Create RabbitMQ connection, channel, and durable queue "bridge_tasks".
  - Lines 23-31: In each Kafka message, forward payload to RabbitMQ queue for downstream workers.
  - Lines 33-34: Start bridge; handle errors.
- This bridge allows you to leverage Kafka for ingestion/scaling while using RabbitMQ for traditional task queues.

---

## 5. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: RabbitMQ poor backpressure handling (no prefetch)

Bad:
```js
// rabbit-bad-prefetch.js
await ch.consume(q, async (msg) => {
  // long-running task
  await doWork(msg.content.toString());
  ch.ack(msg);
}, { noAck: false });
```

Good:
```js
// rabbit-good-prefetch.js
await ch.prefetch(1);
await ch.consume(q, async (msg) => {
  await doWork(msg.content.toString());
  ch.ack(msg);
}, { noAck: false });
```

### Line-by-line explanation

- Bad: Consumes without restricting concurrency, potentially flooding the consumer with multiple in-flight messages.
- Good: Sets prefetch to 1 to ensure only one unacknowledged message is in-flight at a time, helping backpressure and fairness.

### Pitfall 2: RabbitMQ non-durable queues/exchanges

Bad:
```js
await ch.assertQueue(q, { durable: false });
// Messages aren’t durable; they can be lost on broker restart.
```

Good:
```js
await ch.assertQueue(q, { durable: true });
```

### Line-by-line explanation

- Bad: Non-durable queues risk message loss on broker restarts.
- Good: Durable queues preserve messages across restarts.

### Pitfall 3: RabbitMQ lack of proper acknowledgments

Bad:
```js
await ch.consume(q, async (msg) => {
  // Process but never ack
}, { noAck: true }); // Auto-ack
```

Good:
```js
await ch.consume(q, async (msg) => {
  try {
    await doWork(msg.content.toString());
    ch.ack(msg);
  } catch (err) {
    // Optionally send to DLX or requeue
    ch.nack(msg, false, true);
  }
}, { noAck: false });
```

### Line-by-line explanation

- Bad: Messages are auto-acknowledged or not explicitly acknowledged; failures may be lost or cause retries without control.
- Good: Use explicit acks and nacks to control failure handling, retries, and potential dead-lettering.

### Pitfall 4: Kafka lack of consumer offset discipline (auto commit pitfalls)

Bad:
```js
await consumer.run({
  eachMessage: async ({ message }) => {
    // Process
    // No explicit offset management; rely on autos
  }
});
```

Good:
```js
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    // Process
    // Commit offset only after success
    await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }]);
  }
});
```

### Line-by-line explanation

- Bad: Relies on auto-commit semantics which can lead to duplicates after failures.
- Good: Disables auto-commit and manually commits offsets after successful processing, reducing duplicate processing.

---

## 6. Why This Matters In Real Systems — production context and real usage

- Reliability: Proper acks, DLX, and idempotent consumers reduce data loss and duplicate processing.
- Throughput and latency: Kafka’s partitioning enables horizontal scaling; RabbitMQ’s prefetch and queue topology enable predictable latency for task processing.
- Observability: Instrument producers and consumers with metrics for lag, queue depth, processing time, and error rates. Use distributed tracing to follow message flows.
- Failure modes: Plan for broker outages (local replication, multi-AZ deployments), message retries, and backpressure scenarios.
- Operational practices: 
  - Enable durable storage and proper clean shutdowns.
  - Use dead-letter queues to isolate poison messages.
  - Implement idempotent processing where possible.
  - Regularly test failover and recovery drills.

---

## 7. Study Questions — 5 recall questions

1) What is the main difference between Kafka and RabbitMQ in terms of message delivery semantics and throughput?
2) How do consumer groups in Kafka help with scalability?
3) Why would you enable a dead-letter queue in RabbitMQ, and how do you configure it?
4) What is prefetch in RabbitMQ, and why is it important for backpressure?
5) How can you implement idempotent processing for a Kafka consumer to avoid duplicate effects?

---

## 8. Exercise — practical multi-part coding challenge

Part A: Kafka producer and consumer
- Implement a Kafka producer that sends 20 events to topic "events" with unique keys.
- Implement a Kafka consumer in group "exercise-consumers" that processes events and uses an in-memory Set to deduplicate by message key to demonstrate idempotence.

Part B: RabbitMQ producer and worker with DLX
- Implement a RabbitMQ producer that enqueues 10 tasks to a durable queue "task_queue".
- Implement a worker that processes tasks with a simulated failure path (fails on even-numbered tasks) and uses a dead-letter exchange/queue to capture failed messages. Ensure successful messages are acked and failed messages land in the DLQ.

Part C: Bridge exercise (optional)
- Create a small Node.js bridge that reads from Kafka topic "events" and republishes to RabbitMQ queue "bridge_tasks" for downstream workers. This demonstrates interoperability and hybrid architectures.

Deliverables
- Source code files or snippets for:
  - kafka-producer.js
  - kafka-consumer.js
  - rabbitmq-producer.js
  - rabbitmq-consumer-dlq.js
  - bridge-kafka-to-rabbit.js (optional)
- Instructions to run locally (broker URLs, topics/queues to create, and npm install commands).
- Brief notes on how you would extend these patterns for production (e.g., persistent storage for deduplication, distributed tracing, and monitoring).

This completes a practical, structured lesson on Message Queues with Kafka and RabbitMQ in Node.js, covering core concepts, hands-on code, best practices, common mistakes, and a multi-part exercise to cement understanding.