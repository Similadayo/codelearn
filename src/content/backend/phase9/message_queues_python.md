# Message Queues — Kafka & RabbitMQ

Compelling Intro: In modern backend systems, message queues decouple producers from consumers, enable asynchronous processing, and provide resilience under failure. Kafka and RabbitMQ are two heavyweight, battle-tested backends that support different design goals: Kafka excels at high-throughput, durable event streaming with partitioned topics and replayable logs; RabbitMQ shines for flexible routing, complex routing topologies, and reliable task queues with strong delivery guarantees. In Python you can harness both via client libraries (e.g., kafka-python and pika) to build scalable, fault-tolerant services. This lesson covers core concepts, practical code examples, and production-oriented considerations for building with both systems.

## 1. Message Queues Fundamentals

- What they are: components that decouple producers from consumers, buffering workloads, enabling backpressure control.
- Core primitives:
  - Kafka: topics (with partitions), producers, consumers, consumer groups, offsets, acks, retention.
  - RabbitMQ: exchanges, queues, bindings, routing keys, publishers, consumers, acknowledgments, durability.
- Durability and delivery semantics:
  - At-least-once, at-most-once, and exactly-once are practical trade-offs; typically you aim for at-least-once with idempotent processing.
- Python client basics:
  - Kafka: kafka-python (KafkaProducer, KafkaConsumer).
  - RabbitMQ: pika (BlockingConnection, Channel, Basic.Publish, BasicConsume).

Code: Kafka Producer and Consumer (basic, durable-ish by default when broker is configured for durability)

```python
# Kafka: basic producer
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

producer.send('events', {'type': 'user_signup', 'user_id': 123})
producer.flush()
```

```python
# Kafka: basic consumer
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'events',
    bootstrap_servers=['localhost:9092'],
    group_id='analytics',              # consumer group for load-balancing
    auto_offset_reset='earliest',       # start from earliest if no offset stored
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    payload = message.value
    print("Consumed:", payload)
```

### Line-by-line explanation

- Line 1-6: Import modules and set up a KafkaProducer, specifying a JSON serializer to convert Python dicts to bytes.
- Line 8-12: Instantiate producer with broker URL, and schedule a message to topic 'events'. The message payload is a Python dict serialized to JSON bytes.
- Line 13: Flush to ensure the message is sent before the program exits.
- Line 17-23: Create a KafkaConsumer for topic 'events', within a consumer group 'analytics'. auto_offset_reset ensures starting at the earliest offset if needed.
- Line 24-27: Messages are deserialized from JSON and printed as they arrive. The consumer continuously processes new messages.

> Notes:
> - In production, configure acks and retries for durability (see sections on design patterns and production practices).
> - Offsets are committed automatically or manually depending on your settings; manual commit allows finer control.

Code: RabbitMQ basic producer and consumer (durable queue and persistent messages)

```python
# RabbitMQ: basic producer
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# durable queue ensures RabbitMQ keeps the queue across restarts
channel.queue_declare(queue='task_queue', durable=True)

message = {'task': 'resize_image', 'image_id': 42}
channel.basic_publish(
    exchange='',
    routing_key='task_queue',
    body=json.dumps(message),
    properties=pika.BasicProperties(
        delivery_mode=2  # make message persistent
    )
)

print("Sent message")
connection.close()
```

```python
# RabbitMQ: basic consumer
import pika
import json

def callback(ch, method, properties, body):
    msg = json.loads(body)
    print("Received:", msg)
    # simulate processing
    # ...
    ch.basic_ack(delivery_tag=method.delivery_tag)  # manual ack

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# durable queue must be re-declared on consumer start
channel.queue_declare(queue='task_queue', durable=True)

# ensure one message is delivered at a time to avoid long backlogs
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='task_queue', on_message_callback=callback)

print("Waiting for messages. To exit press CTRL+C")
channel.start_consuming()
```

### Line-by-line explanation

- Producer (lines 3-16): Connect to RabbitMQ, declare a durable queue named 'task_queue', publish a persistent message (delivery_mode=2) with JSON body, then close.
- Consumer (lines 19-31): Connect to RabbitMQ, declare the same durable queue, set QoS to fetch one message at a time, register a callback that decodes JSON, processes, and acknowledges the message. The consumer runs until interrupted.
- Key semantics:
  - Acknowledgments (basic_ack) ensure the broker marks the message as processed only after your code signals completion.
  - Durable queue + persistent messages make the system resistant to broker restarts.

## 2. Kafka in Python: Admin, Producer, Consumer

In production you often need to provision topics, manage partitions, and understand offset handling.

Code: Creating a topic via Admin API (Python)

```python
# Kafka: create topic with partitions and replication factor
from kafka.admin import KafkaAdminClient, NewTopic

admin = KafkaAdminClient(bootstrap_servers=['localhost:9092'])

topic = NewTopic(
    name='events',
    num_partitions=3,
    replication_factor=2
)

admin.create_topics([topic])
print("Topic created")
```

Code: KafkaProducer with simple durability tuning and a consumer with manual commit option

```python
# Kafka: producer with basic durability flair
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    retries=5,            # retry on transient errors
    acks=1                  # wait for leader acknowledgement
)

producer.send('events', {'event': 'build_complete', 'build_id': 101})
producer.flush()
```

```python
# Kafka: consumer with manual commit (requires enable_auto_commit=False)
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'events',
    bootstrap_servers=['localhost:9092'],
    group_id='analytics',
    auto_offset_reset='earliest',
    enable_auto_commit=False,  # manual commit to control offset progression
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for msg in consumer:
    payload = msg.value
    print("Processing:", payload)
    # ... processing logic ...
    consumer.commit()  # commit after successful processing
```

### Line-by-line explanation

- Admin topic creation:
  - Lines 1-7: Import admin utilities and create an admin client bound to the broker.
  - Lines 9-13: Define a topic named 'events' with 3 partitions and replication factor 2.
  - Lines 15-16: Create the topic in the cluster; print confirmation.
- Producer:
  - Lines 1-7: Create a KafkaProducer with JSON-encoded values, 5 retries, and acks=1 to require leader acknowledgement.
  - Lines 9-11: Send a single event to topic 'events' and flush.
- Consumer (manual commit):
  - Lines 1-6: Create a consumer in group 'analytics' with manual offset commits.
  - Line 8: Message processing loop; payload is decoded JSON.
  - Line 12: Commit the offset after successful processing to avoid data loss on worker failures.

Notes:
- For strong exactly-once semantics in Kafka, you typically need transactional producers and idempotent consumers combined with proper offset management (beyond kafka-python’s basics). Explore confluent-kafka-python if you require full transactions.

## 3. RabbitMQ in Python: Queues, Exchanges, and Durable Messaging

Code: Producer with direct queue (durable)

```python
# RabbitMQ: producer with durable queue
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

channel.queue_declare(queue='task_queue', durable=True)

payload = {'task': 'video_transcode', 'video_id': 'vid_123'}
channel.basic_publish(
    exchange='',
    routing_key='task_queue',
    body=json.dumps(payload),
    properties=pika.BasicProperties(
        delivery_mode=2  # persistent
    )
)

connection.close()
```

Code: Consumer with manual acks and prefetch control

```python
# RabbitMQ: resilient consumer with prefetch and retries
import pika
import json
import time

def process_task(task):
    # simulate work
    time.sleep(0.5)
    if task.get('fail'):
        raise ValueError("Simulated failure")

def on_message(ch, method, properties, body):
    task = json.loads(body)
    try:
        process_task(task)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print("Error processing task:", e)
        # reject and requeue for retry
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
channel.queue_declare(queue='task_queue', durable=True)

# limit unacknowledged messages to avoid spiky backpressure
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='task_queue', on_message_callback=on_message)

print("Awaiting messages...")
channel.start_consuming()
```

### Line-by-line explanation

- Producer:
  - Lines 1-9: Connect to RabbitMQ, declare a durable 'task_queue', publish a persistent message, and close.
- Consumer:
  - Lines 1-6: Define a worker function that simulates work and raises an error on a condition.
  - Lines 9-22: Set up the consumer, declare the queue, configure QoS for backpressure (prefetch_count=1), and register a callback.
  - on_message: Attempts to process; on success, ack; on failure, nack with requeue to retry.

Common patterns:
- Acknowledge each message after successful processing to guarantee at-least-once delivery.
- Requeue on failure to enable retry, with dead-lettering as an eventual production pattern.

## 4. Design Patterns: Pub-Sub vs Work Queues (Kafka vs RabbitMQ)

### 4.1 Kafka Pub-Sub pattern (broadcast to multiple consumers)

Producer code (same as earlier) publishes to a topic. Create multiple consumers in different groups to receive all messages (each group gets its own copy).

```python
# Kafka: multiple consumer groups receive the same events (pub-sub)
from kafka import KafkaConsumer
import json

consumer_group_a = KafkaConsumer(
    'events',
    bootstrap_servers=['localhost:9092'],
    group_id='service-A',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

consumer_group_b = KafkaConsumer(
    'events',
    bootstrap_servers=['localhost:9092'],
    group_id='service-B',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

# Each consumer runs in its own process/thread
```

### 4.2 RabbitMQ Work Queue pattern (Load-balanced task distribution)

Producer (same as Section 3) sends tasks to a single queue; multiple workers compete to consume and process tasks.

```python
# RabbitMQ: work queue with multiple workers
# Worker code would be similar to the RabbitMQ consumer above
# Each worker connects and calls channel.start_consuming()
```

### Line-by-line explanation

- Kafka Pub-Sub: Setting up two consumers with different group_ids ensures that each group gets all messages, enabling broadcast-style processing without duplicating work.
- RabbitMQ Work Queue: Multiple consumers connecting to the same queue will share the workload; each message is delivered to one worker (load balancing) and acknowledged upon successful processing.

## 5. Performance, Reliability, and Observability in Production

- Durability and replication:
  - Kafka topics should be configured with appropriate partitions and replication_factor to survive broker failures.
  - RabbitMQ queues should be declared durable; messages should be persistent.
- Delivery semantics:
  -Kafka: use acks=1 or -1, handle offset commits carefully (manual commits enable precise control).
  RabbitMQ: use manual acks and prefetch to backpressure consumers; consider dead-letter queues for failed messages.
- Backpressure and scaling:
  - Kafka: scale by adding partitions; scale consumers within a consumer group.
  - RabbitMQ: scale by adding consumers; monitor queue depth and TTL for stuck messages.
- Idempotency and deduplication:
  - Always design consumers to be idempotent; track processed message IDs to avoid duplicate effects.
- Observability:
  - Instrument producers/consumers with metrics: enqueue/dequeue rate, latency, error rate, time-to-processing.
  - Use broker-level metrics (Kafka Zookeeper/Broker, RabbitMQ management UI) and application logs.
- Failure scenarios:
  - Plan for partial failures, broker restarts, network partitions; ensure at-least-once processing upholds system invariants.
- Schema evolution:
  - Use a stable message schema (e.g., JSON with versioning, Avro/Protobuf with schema registry) to avoid breaking consumers.

Code snippet: production-oriented tuning (illustrative)

```python
# Kafka producer tuning (illustrative)
producer = KafkaProducer(
    bootstrap_servers=['broker1:9092', 'broker2:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks=-1,          # wait for all replicas
    retries=10,
    linger_ms=5,      # batch small messages for throughput
    batch_size=16*1024  # 16KB
)
```

```python
# RabbitMQ consumer tuning (illustrative)
channel.basic_qos(prefetch_count=5)  # allow some concurrency while not overwhelming the broker
```

## 6. X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Not using durability properly (data loss on restart)

- Bad: non-durable queue and non-persistent messages
```python
# Bad: not durable
channel.queue_declare(queue='task_queue', durable=False)
channel.basic_publish(exchange='', routing_key='task_queue', body='hello')
```

- Good: durable queue and persistent messages
```python
# Good: durable queue and persistent messages
channel.queue_declare(queue='task_queue', durable=True)
channel.basic_publish(exchange='', routing_key='task_queue', body='hello', properties=pika.BasicProperties(delivery_mode=2))
```

### Pitfall 2: Not ack-ing messages or over-ack-ing (backpressure issues)

- Bad: auto_ack or missing acks
```python
# Bad: auto-ack (messages lost on crash)
channel.basic_consume(queue='task_queue', auto_ack=True, on_message_callback=callback)
```

- Good: manual acks with backpressure
```python
# Good: manual acks
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='task_queue', on_message_callback=callback)
```

### Pitfall 3: Duplicates due to retries without idempotency

- Bad: reprocessing on every retry without dedup
```python
# Bad: naive consumer that reprocesses on retry, no idempotency
def callback(ch, method, properties, body):
    data = json.loads(body)
    process(data)  # could create duplicates if retried
    ch.basic_ack(delivery_tag=method.delivery_tag)
```

- Good: idempotent processing or dedup store
```python
# Good: idempotent processing with idempotency key
processed = set()

def callback(ch, method, properties, body):
    data = json.loads(body)
    if data['id'] in processed:
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    process(data)
    processed.add(data['id'])
    ch.basic_ack(delivery_tag=method.delivery_tag)
```

### Pitfall 4: Ignoring offsets, backpressure, and partitioning in Kafka

- Bad: single consumer with no offset management in a high-volume topic
```python
# Bad: unbounded consumption with auto-commit and no partitioning assumptions
consumer = KafkaConsumer('events', bootstrap_servers=['localhost:9092'], group_id='workers')
for msg in consumer:
    process(msg.value)
    consumer.commit()
```

- Good: plan partitioning and consumer groups; enable manual commit or transactional boundaries
```python
# Good: partition-aware design with explicit commits
consumer = KafkaConsumer('events', bootstrap_servers=['localhost:9092'], group_id='workers',
                         auto_offset_reset='earliest', enable_auto_commit=False)

for msg in consumer:
    process(msg.value)
    consumer.commit()
```

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability at scale:
  - Kafka enables real-time streams across services; RabbitMQ enables reliable background job processing.
  - Real systems mix both: event streams for analytics, and task queues for background processing.
- Operational considerations:
  - Topic/queue naming conventions, retention policies, and dead-letter handling to prevent silent failures.
  - Monitoring and alerting on lag in consumers, queue depth, broker errors, and consumer retries.
- Design decisions:
  - Use Kafka for high-throughput event sourcing and stream processing; use RabbitMQ for fine-grained routing, worker pools, and tasks requiring strict ordering within a queue.
  - Ensure idempotent consumers and deduplication strategies to simplify retries and error handling.
- Production patterns:
  - Dead-letter queues in RabbitMQ for poison messages.
  - Topic retention and compaction in Kafka to avoid unbounded storage while preserving the ability to replay events.
  - Schema evolution with compatibility checks (e.g., Avro with schema registry).

## Z. Study Questions — 5 recall questions

1) What is the main design difference between Kafka’s topic/partition model and RabbitMQ’s queue/exchange model?
2) How do consumer groups in Kafka enable scaling and load balancing of message processing?
3) Why are message acknowledgments important in RabbitMQ, and what is the effect of prefetch_count?
4) Describe at least two strategies to achieve idempotent processing in a consumer.
5) What production considerations would lead you to implement a dead-letter queue or a replayable event log?

## Exercise

Part A: Build a small, dual-backend event processor in Python

- Goal: Publish events to Kafka and a separate queue in RabbitMQ; implement a single Python consumer that can process events from either backend (config-driven) and store results in an in-memory store.

Steps:
1) Create a simple event schema. Each event should include:
   - id: a unique string
   - type: string (e.g., "signup", "image_processed")
   - payload: dict with data
2) Implement a Python module event_publisher.py that can publish to either Kafka or RabbitMQ based on a config flag (backend='kafka' or 'rabbitmq').
   - For Kafka: use the KafkaProducer example; send to topic 'events'.
   - For RabbitMQ: use the RabbitMQ producer example; send to queue 'task_queue'.
3) Implement a Python module event_consumer.py that subscribes to either backend.
   - It should process events and store results in a global in-memory dictionary keyed by event.id with a processed flag.
   - Use idempotent processing: if an event with the same id is processed again, ignore or return quickly.
4) Add a small integration test script test_integration.py that:
   - Publishes 20 events to the chosen backend.
   - Waits for processing and verifies all event IDs are present in the in-memory store with processed=True.
5) Extend with error handling:
   - Simulate a transient failure for a subset of events.
   - Ensure messages are retried, but duplicates are not reprocessed due to idempotency.

Deliverables:
- A single project folder with:
  - event_publisher.py
  - event_consumer.py
  - test_integration.py
  - requirements.txt (listing kafka-python and pika)
  - A short README describing how to run with Kafka and with RabbitMQ (including local Docker steps if desired)

Notes:
- Run-time requirements assume local dev environment with Kafka and RabbitMQ running on default ports; for real environments you’ll configure hostnames and security as needed.
- Keep the in-memory store ephemeral for the exercise; in production you would use a database or distributed cache.

End of lesson.