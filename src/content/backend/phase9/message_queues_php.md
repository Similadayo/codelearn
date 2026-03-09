# Phase 9 — System Design & Scalability: Message Queues — Kafka & RabbitMQ (PHP)

Message queues are the backbone of scalable, resilient backends. They decouple producers from consumers, absorb bursts of load, provide reliable delivery guarantees, and enable streaming, event-sourcing, and asynchronous processing patterns. In PHP environments, you can integrate with Kafka using librdkafka bindings and with RabbitMQ using PhpAmqpLib. This lesson covers core concepts, PHP-based examples, and practical design considerations you’ll need in real systems.

## 1. Kafka in PHP: Producer

Kafka is a distributed log where producers append messages to topics and consumers read from partitions. In PHP, you typically use the librdkafka-based extension bindings (RdKafka) for high performance and client-side buffering. Here we implement a simple producer that writes several events to a topic.

```php
<?php
// Kafka Producer: writes a small batch of events to a topic
$producer = new \RdKafka\Producer();
$producer->setLogLevel(LOG_DEBUG);
$producer->addBrokers("127.0.0.1"); // point to your Kafka broker(s)

$topic = $producer->newTopic("php_events"); // topic name

for ($i = 0; $i < 5; $i++) {
    $payload = json_encode([
        'event' => 'signup',
        'user_id' => 1000 + $i,
        'ts' => time()
    ]);
    // RD_KAFKA_PARTITION_UA lets Kafka choose the partition automatically
    $topic->produce(RD_Kafka_PARTITION_UA, 0, $payload);
}

// Flush to ensure messages are delivered (timeout in ms)
$producer->flush(1000);
```

### Line-by-line explanation
- <?php: PHP script tag.
- $producer = new \RdKafka\Producer();: Create a Kafka producer instance using the RdKafka extension.
- $producer->setLogLevel(LOG_DEBUG);: Enable verbose logging for debugging and telemetry.
- $producer->addBrokers("127.0.0.1");: Register one or more Kafka brokers to connect to.
- $topic = $producer->newTopic("php_events");: Get a handle to the topic to publish to.
- for ($i = 0; $i < 5; $i++) { ... }: Loop to publish five messages.
- $payload = json_encode([...]);: Build a JSON payload with event data.
- $topic->produce(RD_Kafka_PARTITION_UA, 0, $payload);: Publish the payload using automatic partitioning.
- $producer->flush(1000);: Block briefly to deliver buffered messages, with a 1-second timeout.

### Why this approach matters
- Producing with partition auto-selection balances load across partitions.
- Flushing ensures deliver guarantees in synchronous shutdowns or when capacity is constrained.
- JSON payloads enable schema evolution and readability in downstream consumers.

## 2. Kafka in PHP: Consumer

Kafka consumers subscribe to topics and process messages. They typically run as long-lived workers and manage offsets (either automatically or manually) to ensure at-least-once or exactly-once semantics as feasible.

```php
<?php
// Kafka Consumer: subscribes to php_events and processes messages
$conf = new \RdKafka\Conf();
// Optional: set consumer group for load balancing across workers
$conf->set('group.id', 'php_consumer_group');

$consumer = new \RdKafka\KafkaConsumer($conf);
$consumer->subscribe(['php_events']); // topics to consume

while (true) {
    $message = $consumer->consume(120000); // 120 seconds timeout

    switch ($message->err) {
        case RD_KAFKA_RESP_ERR_NO_ERROR:
            echo "Received: " . $message->payload . PHP_EOL;
            // Commit offset as soon as the message is processed
            $consumer->commitAsync();
            break;

        case RD_KAFKA_RESP_ERR__PARTITION_EOF:
            // End of partition, continue polling
            break;

        case RD_KAFKA_RESP_ERR_TIMED_OUT:
            // Timeout — no message within window
            break;

        default:
            // Real error handling/logging
            error_log("Kafka error: " . $message->errstr());
            break;
    }
}
```

### Line-by-line explanation
- $conf = new \RdKafka\Conf();: Create a consumer configuration object.
- $conf->set('group.id', 'php_consumer_group');: Assign the consumer to a group for load balancing and fault tolerance.
- $consumer = new \RdKafka\KafkaConsumer($conf);: Instantiate the Kafka consumer with the given config.
- $consumer->subscribe(['php_events']);: Declare the topics to listen to.
- while (true) { ... }: Enter a continuous polling loop.
- $message = $consumer->consume(120000);: Poll for a message with a 2-minute timeout.
- switch ($message->err) { ... }: Handle the outcome.
- RD_KAFKA_RESP_ERR_NO_ERROR: Message arrived; process it.
- $consumer->commitAsync();: Commit offsets asynchronously after processing.
- RD_KAFKA_RESP_ERR_TIMED_OUT: No message within the timeout window; continue.
- default: Log or handle other errors.

### Why this approach matters
- Consumer groups enable horizontal scaling: multiple workers share the same topic.
- Commit strategy controls when offsets are considered consumed, influencing at-least-once vs. at-most-once semantics.
- Robust error handling and timeouts prevent tight loops and allow backoff strategies.

## 3. RabbitMQ in PHP: Producer

RabbitMQ uses exchanges, queues, and bindings. A durable queue with persistent messages ensures messages survive broker restarts. This PHP example publishes a persistent task to a durable queue.

```php
<?php
require __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$channel = $connection->channel();

// Durable queue and persistent messages
$channel->queue_declare('task_queue', true, true, false, false);

$payload = json_encode(['task' => 'clean_temp', 'requested_at' => time()]);
$msg = new AMQPMessage(
    $payload,
    ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
);

$channel->basic_publish($msg, '', 'task_queue');
echo " [x] Sent task to task_queue\n";

$channel->close();
$connection->close();
```

### Line-by-line explanation
- require vendor/autoload.php: Load Composer autoloader for PhpAmqpLib.
- use PhpAmqpLib\Connection\AMQPStreamConnection; and use PhpAmqpLib\Message\AMQPMessage;: Bring in necessary classes.
- $connection = new AMQPStreamConnection(...): Connect to RabbitMQ broker with credentials.
- $channel = $connection->channel();: Open a channel over the AMQP connection.
- $channel->queue_declare('task_queue', true, true, false, false);: Declare a durable queue (both durable and non-exclusive, non-auto-delete).
- $payload = json_encode([...]);: Build message payload.
- $msg = new AMQPMessage($payload, ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]);: Create a persistent message.
- $channel->basic_publish($msg, '', 'task_queue');: Publish to the default exchange with routing key equal to the queue name.
- echo ...: Simple acknowledgement.
- $channel->close(); $connection->close();: Cleanup resources.

### Line-by-line explanation (continuation)
- The queue_declare parameters ensure durability across broker restarts.
- Delivery mode PERSISTENT marks messages for disk storage (paired with durable queues).
- Publishing to the default exchange with routing key 'task_queue' routes directly to that queue.

## 4. RabbitMQ in PHP: Consumer

This consumer processes tasks from a durable queue with manual acknowledgments and basic QoS to preserve fair dispatch.

```php
<?php
require __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$channel = $connection->channel();

$channel->queue_declare('task_queue', true, true, false, false);
// Fair dispatch: don't give more than one unacknowledged message to a worker
$channel->basic_qos(null, 1, null);

$callback = function($msg) {
    echo " [x] Received ", $msg->body, PHP_EOL;
    // Simulate processing time
    sleep(2);
    // Acknowledge after successful processing
    $msg->ack();
};

$channel->basic_consume('task_queue', '', false, false, false, false, $callback);

while ($channel->is_consuming()) {
    $channel->wait();
}
```

### Line-by-line explanation
- queue_declare('task_queue', true, true, false, false): Ensure the queue exists as durable and non-exclusive.
- basic_qos(null, 1, null): Prefetch count set to 1 so workers process one message at a time for fair dispatch.
- $callback = function($msg) { ... }: Callback executed for each message deliver.
- $msg->body: Message payload delivered by the broker.
- sleep(2): Simulated processing delay.
- $msg->ack(): Manually acknowledge to remove the message from the queue.
- basic_consume(..., $callback): Start consuming with the specified callback.

### Line-by-line explanation (continuation)
- Acknowledgements are critical to ensuring at-least-once processing guarantees.
- Prefetching prevents a single worker from being overwhelmed and helps distribute load more evenly.

## 5. Design Patterns and Operational Practices (Observability, Reliability, and Interop)

While there are no new code blocks here, this subsection captures common patterns and PHP-oriented tips you’ll apply in production.

- Durability and persistence: Always declare durable queues and use persistent messages in RabbitMQ to survive broker restarts.
- Idempotent processing: Design workers to be idempotent, so reprocessing messages (due to retries or at-least-once semantics) does not lead to incorrect state.
- Exactly-once semantics: Kafka users often rely on idempotent producers and careful offset management; true end-to-end exactly-once is hard and requires design discipline.
- Backpressure and QoS: Use prefetch (RabbitMQ) or partitioning strategies (Kafka) to control consumer load and avoid overwhelming downstream systems.
- Monitoring: Track producer metrics, consumer lag (Kafka), queue depths (RabbitMQ), and throughput. Instrument with simple logs, and consider exporting to a monitoring system.
- Dead-letter handling: Implement dead-letter queues or DLX routing to isolate failed messages for later inspection and reprocessing.
- Observability integration: Add trace context (e.g., B3/Zipkin/OpenTelemetry) to message payloads where possible to trace end-to-end flows.

### Example snippet: simple dead-letter configuration in RabbitMQ (PHP)
```php
<?php
$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$channel = $connection->channel();
$args = [
    'x-dead-letter-exchange' => 'dlx',
    'x-dead-letter-routing-key' => 'task_queue.dlq'
];
$channel->queue_declare('task_queue', true, true, false, false, false, $args);
```

This snippet demonstrates how to declare a main queue with a dead-letter exchange for failed messages, enabling automated DLQ handling.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not making queues durable and messages persistent (RabbitMQ)
  - Bad:
  ```php
  $channel->queue_declare('task_queue', true, false, false, false);
  $msg = new AMQPMessage('payload'); // non-persistent
  $channel->basic_publish($msg, '', 'task_queue');
  ```
  - Good:
  ```php
  $channel->queue_declare('task_queue', true, true, false, false);
  $msg = new AMQPMessage('payload', ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]);
  $channel->basic_publish($msg, '', 'task_queue');
  ```

- Pitfall 2: Forgetting to acknowledge messages in RabbitMQ (risk of re-delivery)
  - Bad:
  ```php
  $callback = function($msg) {
      echo $msg->body;
      // Missing ack
  };
  ```
  - Good:
  ```php
  $callback = function($msg) {
      echo $msg->body;
      // Successful processing
      $msg->ack();
  };
  ```

- Pitfall 3: Not enabling idempotence or proper deduplication (Kafka)
  - Bad:
  ```php
  $producer = new \RdKafka\Producer();
  $topic = $producer->newTopic("events");
  // Producing without idempotence safeguards
  $topic->produce(RD_Kafka_PARTITION_UA, 0, json_encode(['order_id' => 42]));
  ```
  - Good:
  ```php
  $conf = new \RdKafka\Conf();
  $conf->set('enable.idempotence', 'true');
  $producer = new \RdKafka\Producer($conf);
  $topic = $producer->newTopic("events");
  $topic->produce(RD_Kafka_PARTITION_UA, 0, json_encode(['order_id' => 42]));
  $producer->flush(1000);
  ```

- Pitfall 4: Nondeterministic message routing (Kafka partitions not aligned with partition keys)
  - Bad:
  ```php
  // Always sending to partition 0
  $topic->produce(0, 0, $payload);
  ```
  - Good:
  ```php
  // Use a key to influence partitioning for related messages
  $payloadKeyed = json_encode(['user_id' => 42, 'action' => 'login']);
  $topic->produce(RD_Kafka_PARTITION_UA, 0, $payloadKeyed, "user-42");
  ```

Note: The rabbit/qafka code snippets assume the corresponding PHP extensions and libraries are installed and properly autoloaded.

## Y. Why This Matters In Real Systems — production context and real usage

- Throughput and burst handling: Kafka excels at streaming large volumes with scalable partitioning; RabbitMQ excels at complex routing, reliability patterns, and fine-grained delivery guarantees.
- Fault tolerance: Durable queues and persistent messages in RabbitMQ protect against broker restarts; Kafka's replicated topics protect against broker failures.
- Operational complexity: Kafka requires cluster management (brokers, zookeeper or KRaft in newer versions), topic/partition planning, and offset management. RabbitMQ requires queue/exchange topology planning, DLX setups, and consumer QoS tuning.
- Observability: In production, you’ll want to measure producer latency, consumer lag, queue depth, message age, and failure rates. Instrumentation in PHP should be lightweight to avoid adding pressure on request paths.
- Data consistency patterns: End-to-end exactly-once is challenging; you typically implement idempotent consumers, deduplication logic, and guarded state transitions to approach that goal.
- Interoperability: Kafka-based pipelines can feed data lakes, stream processing, and microservices; RabbitMQ can coordinate asynchronous tasks, background jobs, and event-driven workflows with rich routing patterns.

## Z. Study Questions — 5 recall questions

1) What is the difference between a Kafka partition and a RabbitMQ queue, and how does that affect scaling and ordering guarantees?
2) How do you ensure a RabbitMQ message survives broker restarts when using PHP?
3) What is the purpose of consumer groups in Kafka, and how does it affect message processing parallelism?
4) Why would you enable a dead-letter queue in RabbitMQ, and how would you configure it in PHP?
5) What are at-least-once and exactly-once delivery semantics, and why is exactly-once particularly hard to guarantee in distributed systems?

## Exercise — a practical multi-part coding challenge

Part A: Kafka producer
- Implement a PHP producer that publishes 3 distinct user-event messages to a topic named "system_events" on a local Kafka cluster (localhost:9092). Use a JSON payload containing event type and a timestamp. Ensure the producer flushes with a reasonable timeout and logs a simple confirmation on success.

Part B: Kafka consumer
- Implement a PHP consumer that subscribes to "system_events", prints each message, and commits offsets asynchronously. Run the consumer in a loop; include basic error handling for timeouts and fatal errors.

Part C: RabbitMQ producer
- Implement a PHP producer that sends 5 tasks to a durable queue named "worker_tasks" with persistent messages. Each message should contain a small JSON payload with a task id and a task type. Confirm delivery by printing a log line after publishing.

Part D: RabbitMQ consumer
- Implement a PHP consumer that processes messages from "worker_tasks" with basic QoS (prefetch 1) and manual acknowledgments. Simulate a small processing delay per message and acknowledge only after successful processing. Ensure the consumer keeps running and handles shutdown gracefully.

Part E: Observability snippet (optional)
- Add a small PHP snippet to instrument latency for a Kafka producer: measure time from call to produce() to the flush() return, and log the latency to a file (e.g., /tmp/kafka_latency.log). This demonstrates basic production telemetry without introducing external dependencies.

Deliverables:
- Completed PHP scripts for Part A–D (separate files or clearly named scripts).
- Optional latency instrumentation code included in Part E.
- Include inline comments explaining key decisions and configuration values (brokers, topics, queues, durability, and ack strategies).
- A short reflection (2–3 sentences) on which scenario you’d choose Kafka vs RabbitMQ in a real-world system and why.

End of lesson.