# Phase 9 — System Design & Scalability: Database Scaling — Replication & Sharding (Java)

In modern backend systems, databases must scale to meet rising traffic while keeping data consistent and queries fast. Replication and sharding are foundational techniques: replication improves read throughput and availability by maintaining copies of data, while sharding distributes data across multiple machines to increase write throughput and storage capacity. This lesson uses Java examples to illustrate how to design, implement, and reason about these patterns in real systems.

## 1. Replication Fundamentals

Replication creates copies of data from a primary (master) database to one or more replicas (slaves). Reads can be served from replicas to reduce load on the primary, while writes go to the primary. This section builds a simple Java routing model to separate read and write connections.

Code: A lightweight replication router that directs writes to the primary and reads to the replica.

```java
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

public class ReplicationRouter {
  private final DataSource primary;
  private final DataSource replica;

  public ReplicationRouter(DataSource primary, DataSource replica) {
    this.primary = primary;
    this.replica = replica;
  }

  public Connection getWriteConnection() throws SQLException {
    return primary.getConnection();
  }

  public Connection getReadConnection() throws SQLException {
    return replica.getConnection();
  }
}
```

### Line-by-line explanation
- import javax.sql.DataSource; // Uses standard JDBC DataSource interface for database connections.
- import java.sql.Connection; // Represents an active connection to the database.
- import java.sql.SQLException; // Exception type for DB access errors.
- public class ReplicationRouter { // Defines a router that separates read/write paths.
- private final DataSource primary; // Primary data source for writes.
- private final DataSource replica; // Replica data source for reads.
- public ReplicationRouter(DataSource primary, DataSource replica) { // Constructor wiring both sources.
- this.primary = primary; // Assign primary DS.
- this.replica = replica; // Assign replica DS.
- public Connection getWriteConnection() throws SQLException { // Method for write operations.
- return primary.getConnection(); // Obtain a connection to the primary.
- public Connection getReadConnection() throws SQLException { // Method for read operations.
- return replica.getConnection(); // Obtain a connection to the replica.
```

Common usage example (illustrative):
- Use getWriteConnection() for INSERT/UPDATE/DELETE.
- Use getReadConnection() for SELECTs.

What this buys you:
- Clear separation of concerns between read/write paths.
- A simple foundation to build more advanced routing (round-robin, load balancing, failover).

## 2. Read/Write Routing in Java

In real apps, you often need to route reads to replicas and writes to primary, sometimes with an option to force reads to the primary for consistency. This section demonstrates a simple router that exposes both read and write routes and a tiny usage pattern.

```java
public class ReadWriteRouter {
  private final DataSource primary;
  private final DataSource replica;
  private boolean preferPrimaryForReads = false; // policy toggle

  public ReadWriteRouter(DataSource primary, DataSource replica) {
    this.primary = primary;
    this.replica = replica;
  }

  public Connection getWriteConnection() throws SQLException {
    return primary.getConnection();
  }

  public Connection getReadConnection() throws SQLException {
    if (preferPrimaryForReads) {
      return primary.getConnection();
    }
    return replica.getConnection();
  }

  public void setPreferPrimaryForReads(boolean prefer) {
    this.preferPrimaryForReads = prefer;
  }
}
```

### Line-by-line explanation
- public class ReadWriteRouter { // Defines a router with an adjustable read preference.
- private final DataSource primary; // Primary for writes.
- private final DataSource replica; // Replica for reads.
- private boolean preferPrimaryForReads = false; // Read policy flag; default favors replicas for performance.
- public ReadWriteRouter(DataSource primary, DataSource replica) { // Constructor.
- this.primary = primary; // Bind primary DS.
- this.replica = replica; // Bind replica DS.
- public Connection getWriteConnection() throws SQLException { // Write path accessor.
- return primary.getConnection(); // Always go to primary for writes.
- public Connection getReadConnection() throws SQLException { // Read path accessor.
- if (preferPrimaryForReads) { // If policy forces primary reads.
- return primary.getConnection(); // Use primary on reads.
- return replica.getConnection(); // Otherwise, use replica.
- public void setPreferPrimaryForReads(boolean prefer) { // Setter for policy.
- this.preferPrimaryForReads = prefer; // Apply policy.
```

Line-by-line usage notes:
- Use getWriteConnection() for all mutating statements (INSERT/UPDATE/DELETE).
- Use getReadConnection() for SELECTs; flip the policy during operations where consistency is critical (e.g., after a write, you may set preferPrimaryForReads(true) for a guard window).

## 3. Sharding Fundamentals

Sharding partitions data horizontally across multiple nodes, so each shard holds a subset of the data. This increases write throughput and storage capacity but requires a shard key and a redirection layer to route requests to the correct shard. The following Java example demonstrates a simple in-memory sharded data source.

```java
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

public class ShardedDataSource {
  private final List<DataSource> shards;
  private final int shardCount;

  public ShardedDataSource(List<DataSource> shards) {
    if (shards == null || shards.isEmpty()) {
      throw new IllegalArgumentException("Shards must be non-empty");
    }
    this.shards = shards;
    this.shardCount = shards.size();
  }

  private int shardIndexForKey(Object key) {
    // Basic hash-based routing; robust implementations might use consistent hashing.
    int h = key == null ? 0 : key.hashCode();
    return Math.abs(h) % shardCount;
  }

  public Connection getConnectionForKey(Object key) throws SQLException {
    int idx = shardIndexForKey(key);
    return shards.get(idx).getConnection();
  }
}
```

### Line-by-line explanation
- import javax.sql.DataSource; // Use JDBC data sources for each shard.
- import java.sql.Connection; // JDBC connection type.
- import java.sql.SQLException; // Standard SQL exception handling.
- public class ShardedDataSource { // Router that chooses a shard based on a key.
- private final List<DataSource> shards; // Ordered list of shard data sources.
- private final int shardCount; // Number of shards.
- public ShardedDataSource(List<DataSource> shards) { // Constructor.
- if (shards == null || shards.isEmpty()) { // Validate inputs.
- throw new IllegalArgumentException("Shards must be non-empty"); // Fail fast.
- this.shards = shards; // Bind shard list.
- this.shardCount = shards.size(); // Record shard count.
- private int shardIndexForKey(Object key) { // Map key to shard index.
- int h = key == null ? 0 : key.hashCode(); // Compute hash of key.
- return Math.abs(h) % shardCount; // Normalize and wrap to shard range.
- public Connection getConnectionForKey(Object key) throws SQLException { // Public API.
- int idx = shardIndexForKey(key); // Determine shard.
- return shards.get(idx).getConnection(); // Open a connection to that shard.
```

Line-by-line usage notes:
- Choose a shard key that distributes data evenly (e.g., userId, productId).
- Ensure your application uses getConnectionForKey(key) for both reads and writes that should reside on the same shard.
- For cross-shard operations, you’ll often need orchestration at a higher layer (transactions, batching, or eventual consistency).

## 4. Consistency Models & Routing Strategies

Replication introduces latency between writes and their visibility on replicas. Depending on your application’s requirements, you may prefer strong consistency (reads reflect the latest write) or eventual consistency (reads may lag). This section provides a simple policy-driven router that chooses read sources based on a desired consistency level.

```java
enum ConsistencyLevel { STRONG, EVENTUAL }

public class ConsistencyRouter {
  private final DataSource primary;
  private final DataSource replica;
  private final ConsistencyLevel level;

  public ConsistencyRouter(DataSource primary, DataSource replica, ConsistencyLevel level) {
    this.primary = primary;
    this.replica = replica;
    this.level = level;
  }

  public Connection getWriteConnection() throws SQLException {
    return primary.getConnection();
  }

  public Connection getReadConnection() throws SQLException {
    switch (level) {
      case STRONG:
        return primary.getConnection();
      case EVENTUAL:
      default:
        return replica.getConnection();
    }
  }
}
```

### Line-by-line explanation
- enum ConsistencyLevel { STRONG, EVENTUAL } // Defines read visibility guarantees.
- public class ConsistencyRouter { // Router that enforces a consistency policy.
- private final DataSource primary; // Primary DS for writes and, in STRONG mode, reads.
- private final DataSource replica; // Replica DS for eventual reads.
- private final ConsistencyLevel level; // Read policy in effect.
- public ConsistencyRouter(DataSource primary, DataSource replica, ConsistencyLevel level) { // Constructor.
- this.primary = primary; // Bind primary DS.
- this.replica = replica; // Bind replica DS.
- this.level = level; // Bind policy.
- public Connection getWriteConnection() throws SQLException { // Writes always go to primary.
- return primary.getConnection(); // Acquire primary connection.
- public Connection getReadConnection() throws SQLException { // Read path respects policy.
- switch (level) { // Branch on policy.
- case STRONG: return primary.getConnection(); // Read from primary for strong consistency.
- case EVENTUAL: default: return replica.getConnection(); // Read from replica with eventual consistency.
```

Line-by-line usage notes:
- STRONG mode is simplest to reason about but may incur higher latency due to synchronous replication.
- EVENTUAL mode improves latency and throughput for reads but requires your application logic to tolerate potential stale data.

## 5. Operational Concerns: Failover, Backups, and Monitoring

Operational readiness matters as you scale. This section presents lightweight patterns for failover signaling and basic observability, without tying you to a specific vendor.

```java
public class FailoverManager {
  private volatile boolean primaryAvailable = true;
  private DataSource primary;
  private DataSource replica;

  public FailoverManager(DataSource primary, DataSource replica) {
    this.primary = primary;
    this.replica = replica;
  }

  public synchronized Connection getWriteConnection() throws SQLException {
    if (!primaryAvailable) {
      // In real systems, we might throw a specialized exception or retry logic.
      throw new SQLException("Primary unavailable - failover required");
    }
    return primary.getConnection();
  }

  public synchronized void reportPrimaryFailure() {
    primaryAvailable = false;
  }

  public synchronized void recoverPrimary() {
    primaryAvailable = true;
  }

  // Simple failover operation: promote replica by swapping references (conceptual).
  public synchronized void promoteReplicaToPrimary() {
    DataSource tmp = primary;
    // In a real system, you'd promote a replica to primary at the DB level and re-wire clients.
    // For this example, we just illustrate the idea.
    // this.primary = replica;
    // this.replica = tmp;
  }
}
```

### Line-by-line explanation
- public class FailoverManager { // Lightweight failover controller.
- private volatile boolean primaryAvailable = true; // Visibility of primary’s health.
- private DataSource primary; // Current primary DS reference.
- private DataSource replica; // Replica DS reference.
- public FailoverManager(DataSource primary, DataSource replica) { // Constructor.
- this.primary = primary; // Bind primary DS.
- this.replica = replica; // Bind replica DS.
- public synchronized Connection getWriteConnection() throws SQLException { // Guarded write access.
- if (!primaryAvailable) { // If primary is down, fail fast.
- throw new SQLException("Primary unavailable - failover required"); // Signal failure.
- return primary.getConnection(); // Normal path.
- public synchronized void reportPrimaryFailure() { primaryAvailable = false; } // Mark down.
- public synchronized void recoverPrimary() { primaryAvailable = true; } // Recover path.
- public synchronized void promoteReplicaToPrimary() { // Conceptual failover hook.
- DataSource tmp = primary; // Save reference.
- // In a real system, rewire references and promote replica to primary.
- // this.primary = replica;
- // this.replica = tmp;
```

Line-by-line usage notes:
- In production, you would integrate with a orchestration system, health checks, and a proper failover mechanism to promote a replica to primary and re-route traffic automatically.
- This snippet emphasizes the concepts: health signaling, controlled write access, and a hook for promotion logic.

## 6. Observability and Testing in Scaling Scenarios

Observability is essential for diagnosing replication lag, shard hot spots, and failover readiness. This section provides a tiny metrics scaffold to count reads and writes and surface simple dashboards or logs.

```java
public class Metrics {
  private long reads = 0;
  private long writes = 0;

  public synchronized void recordRead() { reads++; }
  public synchronized void recordWrite() { writes++; }

  public synchronized long getReads() { return reads; }
  public synchronized long getWrites() { return writes; }

  public void printSnapshot() {
    System.out.println("Metrics snapshot - Reads: " + reads + ", Writes: " + writes);
  }
}
```

Line-by-line explanation
- public class Metrics { // Lightweight in-process metrics collector.
- private long reads = 0; // Read operation counter.
- private long writes = 0; // Write operation counter.
- public synchronized void recordRead() { reads++; } // Increment reads.
- public synchronized void recordWrite() { writes++; } // Increment writes.
- public synchronized long getReads() { return reads; } // Accessor.
- public synchronized long getWrites() { return writes; } // Accessor.
- public void printSnapshot() { System.out.println(...); } // Simple console output for visibility.

Line-by-line usage notes:
- Integrate recordRead/recordWrite in your read/write code paths to maintain visibility.
- Extend Metrics with latency histograms, replicationLagMillis, and per-shard aggregation for deeper insight.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Routing all traffic to a single data source (no replication) instead of separating reads/writes.
  - Bad:
  ```java
  // Single DataSource used for reads and writes
  DataSource ds = getDataSource();
  try (Connection c = ds.getConnection()) {
    // write
    // read
  }
  ```
  - Good:
  ```java
  ReplicationRouter router = new ReplicationRouter(primaryDs, replicaDs);
  try (Connection w = router.getWriteConnection()) { /* write */ }
  try (Connection r = router.getReadConnection()) { /* read */ }
  ```
- Pitfall 2: Map all keys to the same shard (unbalanced load) without a robust hash or consistent hashing.
  - Bad:
  ```java
  int shardIndex = 0; // always shard 0
  return shards.get(shardIndex).getConnection();
  ```
  - Good:
  ```java
private int shardIndexForKey(Object key) {
  int h = key == null ? 0 : key.hashCode();
  return Math.abs(h) % shardCount;
}
```
- Pitfall 3: Reading stale data immediately after a write (no read-after-write consideration).
  - Bad:
  ```java
  // Immediately reads from replica
  try (Connection c = replica.getConnection()) {
    // SELECTs may not see recent writes
  }
  ```
  - Good:
  ```java
  // Use STRONG consistency for reads during critical paths or implement a read-after-write policy
  ConsistencyRouter router = new ConsistencyRouter(primary, replica, ConsistencyLevel.STRONG);
  try (Connection r = router.getReadConnection()) { /* read after write path */ }
  ```
- Pitfall 4: Not using a connection pool (creating new connections per request).
  - Bad:
  ```java
  Connection c = DriverManager.getConnection(dbUrl, user, pass); // every time
  ```
  - Good:
  ```java
  DataSource dsPool = createConnectionPool(dbUrl, user, pass);
  try (Connection c = dsPool.getConnection()) { /* use pooled connection */ }
  ```
- Pitfall 5: Ignoring transactional boundaries across shards (no cross-shard coordination).
  - Bad:
  ```java
  // Write to shard A and shard B in separate transactions with no coordination
  ```
  - Good:
  ```java
  // Use a coordination layer or distributed transaction manager (two-phase commit or sagas)
  // or constrain writes to a single shard when strong consistency is required.
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Latency and throughput: Replication offloads reads from the primary and increases query throughput; sharding scales writes by distributing the load. Together, they enable horizontal scaling to millions of ops per second when implemented with care.
- Consistency vs availability: Strong consistency (reads from primary, synchronous replication) can increase write latency and reduce availability in the face of network issues. Eventual consistency (reads from replicas) improves latency but requires careful application logic to tolerate stale reads.
- Failure modes: If a primary fails, automated failover and reconfiguration are critical. Replica lag and cross-region replication introduce additional failure scenarios—monitoring replication lag and verifying backup integrity are essential.
- Operational tooling: Instrumentation (latency, error rates, lag), health checks, automated backups, and testing under traffic load are indispensable for real systems.
- Security and compliance: Replication streams must be encrypted in transit; access controls and audit logs should cover reads/writes across replicas and shards.

## Z. Study Questions — 5 recall questions

1. What are the main differences between replication and sharding, and what problem does each solve?
2. How does synchronous vs asynchronous replication affect latency and consistency?
3. How would you map a userId to a shard index in a simple hash-based sharding scheme?
4. Why might you occasionally prefer routing reads to the primary even in a read-heavy workload?
5. What are common strategies to handle failover when the primary database becomes unavailable?

## Exercise — a practical multi-part coding challenge

Goal: Build a small in-memory simulation of replication and sharding in Java, with a simple routing layer and a tiny test harness to observe behavior.

Part 1: In-Memory Data Stores
- Implement two simple in-memory stores to simulate primary and replica databases.
- Each store should support put(String key, String value) and get(String key) operations.
- Create an interface DataStore with put/get and two implementations: InMemoryStore (thread-safe) for both primary and replica.

Part 2: Simple Replication Router
- Create a ReplicationRouter that uses two DataStore instances (primary and replica).
- Implement put as a write to primary and a background task that copies the value to replica after a short delay (simulate asynchronous replication).
- Implement get for reads from the replica (to simulate eventual consistency) or from primary (depending on a flag).

Part 3: Sharding Layer
- Implement a ShardedDataStore that distributes keys across N shards using a hash(key) modulo N.
- Each shard uses its own InMemoryStore.
- Provide put/get that route to the correct shard internally.

Part 4: End-to-End Scenario
- Create a small test harness (main method) that:
  - Creates 2 data stores for replication and 3 shards for sharding.
  - Writes several keys using the replication router and then reads them after short delays to observe replication lag.
  - Writes to the sharded store and reads from various shards to verify distribution.
  - Logs timing information to show replication delay and shard routing.

Part 5: Deliverables
- Provide all source files in a single snippet (or clearly separated code blocks) with a simple runnable main that demonstrates the behavior.
- Include comments explaining the behavior and any simplifications.

Example scaffolding (high level; fill in all details as you code):

```java
// Part 1: DataStore interface and InMemoryStore implementation
public interface DataStore {
  void put(String key, String value);
  String get(String key);
}

public class InMemoryStore implements DataStore {
  private final ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();
  @Override public void put(String key, String value) { map.put(key, value); }
  @Override public String get(String key) { return map.get(key); }
}

// Part 2: ReplicationRouter with asynchronous replication
public class ReplicationRouter {
  private final DataStore primary;
  private final DataStore replica;
  public ReplicationRouter(DataStore primary, DataStore replica) { /* ... */ }
  public void put(String key, String value) { /* write to primary and enqueue replication */ }
  public String get(String key) { /* read from replica (may lag) or primary */ }
}

// Part 3: ShardedDataStore
public class ShardedDataStore {
  private final List<DataStore> shards;
  public ShardedDataStore(List<DataStore> shards) { /* ... */ }
  public void put(String key, String value) { /* route to shard by hash(key) */ }
  public String get(String key) { /* route to shard by hash(key) */ }
}

// Part 4: Test harness (main)
public class TestHarness {
  public static void main(String[] args) throws Exception {
    // Setup replication
    DataStore primary = new InMemoryStore();
    DataStore replica = new InMemoryStore();
    ReplicationRouter rr = new ReplicationRouter(primary, replica);

    // Write some keys and observe replication lag
    rr.put("user:1", "Alice");
    rr.put("user:2", "Bob");
    // Sleep briefly to allow replication
    Thread.sleep(50);
    String v = rr.get("user:1"); // Should come from replica (lag may show difference)

    // Setup sharding
    List<DataStore> shardList = Arrays.asList(new InMemoryStore(), new InMemoryStore(), new InMemoryStore());
    ShardedDataStore sds = new ShardedDataStore(shardList);

    // Write/read across shards
    sds.put("order:1001", "OrderA");
    sds.put("order:1002", "OrderB");
    // Reads
    System.out.println("order:1001 -> " + sds.get("order:1001"));
  }
}
```

Notes:
- This exercise is intentionally in-memory and observational. It’s designed to cement the architectural concepts of replication and sharding without requiring a real database cluster.
- Extend and refactor as you go: add a lightweight replication lag metric, configurable delay, or a real-time statistics printer to observe system behavior under varying delays and shard counts.

If you’d like, I can tailor the exercise scaffolding to a specific Java framework (plain JDBC, Spring with a RoutingDataSource-like pattern, or a microservice-style wrapper) and provide a ready-to-run Maven/Gradle project layout.