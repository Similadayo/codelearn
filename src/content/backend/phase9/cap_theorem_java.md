# CAP Theorem & Distributed Systems Basics in Java

In modern backend engineering, distributed systems are the norm. The CAP theorem helps us reason about tradeoffs between Consistency, Availability, and Partition tolerance in any replicated service. This lesson uses Java to illustrate core concepts, practical patterns, and common mistakes you’ll encounter when designing scalable systems. By the end, you’ll have a concrete feel for how CP and AP designs behave under partitions, how vector clocks help with conflict resolution, and how to build simple, testable simulations in code.

## 1. CAP Theorem: Definitions and a Java Simulation

The CAP theorem states that in any distributed system, you can at most have two of the three properties (Consistency, Availability, and Partition tolerance) simultaneously during a network partition. In practice:
- CP systems favor Consistency and Partition tolerance (at the expense of Availability during partitions).
- AP systems favor Availability and Partition tolerance (at the expense of strict Consistency during partitions).

This section shows small Java simulations of CP-style and AP-style stores to illustrate the tradeoffs in code. These are simplified models designed for education and don't replace a real distributed database.

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A tiny CP-style store: writes succeed only if both nodes are up (strong consistency).
 * Reads prefer whichever node is up and has the data.
 */
public class CAPCPStore {
    static class Node {
        final String id;
        final Map<String, String> store = new ConcurrentHashMap<>();
        boolean up = true;

        Node(String id) { this.id = id; }
    }

    private final Node a;
    private final Node b;

    public CAPCPStore() {
        this.a = new Node("N1");
        this.b = new Node("N2");
    }

    // Two-phase-like, but simplified: require both nodes up to commit
    public synchronized boolean put(String key, String value) {
        if (!a.up || !b.up) {
            // cannot commit if any replica is down (partition)
            return false;
        }
        a.store.put(key, value);
        b.store.put(key, value);
        return true;
    }

    public String get(String key) {
        // Read from primary-if-available, fallback to second node
        if (a.up && a.store.containsKey(key)) return a.store.get(key);
        if (b.up && b.store.containsKey(key)) return b.store.get(key);
        return null;
    }

    // Simulate a network partition by toggling node availability
    public void setPartition(boolean partitioned) {
        a.up = !partitioned;
        b.up = !partitioned;
    }
}
```

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A tiny AP-style store: writes go to a primary and replicate asynchronously to a replica.
 * Reads can be served from either node; replicas may lag during partitions.
 */
public class CAPAPStore {
    static class Node {
        final String id;
        final Map<String, String> store = new ConcurrentHashMap<>();
        boolean up = true;

        Node(String id) { this.id = id; }
    }

    private final Node primary;
    private final Node replica;

    public CAPAPStore() {
        this.primary = new Node("P");
        this.replica = new Node("R");
    }

    // Asynchronous replication to simulate eventual consistency
    public void put(String key, String value) {
        if (!primary.up) {
            throw new IllegalStateException("Primary down");
        }
        primary.store.put(key, value);
        new Thread(() -> {
            if (replica.up) {
                replica.store.put(key, value);
            }
        }).start();
    }

    public String get(String key) {
        // Read freshest achievable data
        if (primary.up && primary.store.containsKey(key)) {
            return primary.store.get(key);
        }
        if (replica.up && replica.store.containsKey(key)) {
            return replica.store.get(key);
        }
        return null;
    }

    public void setPartition(boolean partitioned) {
        primary.up = !partitioned;
        replica.up = !partitioned;
    }
}
```

### Line-by-line explanation

CPStore
- Line 1-6: Define a CPStore with two nodes (N1 and N2) storing data in a thread-safe map; both must be up to commit.
- Line 12-16: Constructor initializes the two nodes.
- Line 19-28: put(key, value) only commits if both nodes are up; otherwise returns false (partition blocks commit).
- Line 31-37: get(key) reads from N1 if available, otherwise N2, then returns value or null.
- Line 40-44: setPartition toggles each node’s availability to simulate partition.

APStore
- Line 1-7: Define a simple APStore with a primary and a replica.
- Line 11-15: Constructor initializes primary and replica.
- Line 18-28: put(key, value) writes to primary and asynchronously propagates to replica if it’s up; no blocking on replication.
- Line 31-39: get(key) prefers primary data if available, otherwise reads from the replica.
- Line 42-46: setPartition toggles availability to simulate partition.

## 2. Distributed Systems Basics: Consistency Models, Vector Clocks, and Conflict Resolution

Consistency models define how reads reflect writes in a distributed system. Vector clocks provide a way to capture causality across nodes, enabling simple conflict detection and resolution in eventual/partially consistent systems.

```java
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Lightweight Vector Clock to track causal relationships across nodes.
 */
public class VectorClock {
    private final Map<String, Integer> clock = new HashMap<>();

    public VectorClock() {}

    public VectorClock(VectorClock other) {
        this.clock.putAll(other.clock);
    }

    public void tick(String nodeId) {
        clock.put(nodeId, clock.getOrDefault(nodeId, 0) + 1);
    }

    public void update(String nodeId, int ts) {
        int cur = clock.getOrDefault(nodeId, 0);
        clock.put(nodeId, Math.max(cur, ts));
    }

    // Returns 1 if this dominates other, -1 if other dominates this, 0 if concurrent/equal
    public int dominance(VectorClock other) {
        boolean thisGeq = true;
        boolean otherGeq = true;
        boolean allEqual = true;

        for (String id : union(clock.keySet(), other.clock.keySet())) {
            int a = clock.getOrDefault(id, 0);
            int b = other.clock.getOrDefault(id, 0);
            if (a < b) thisGeq = false;
            if (a > b) otherGeq = false;
            if (a != b) allEqual = false;
        }

        if (allEqual) return 0;
        if (thisGeq && !allEqual) return 1;
        if (otherGeq && !allEqual) return -1;
        return 0; // concurrent
    }

    private static Set<String> union(Set<String> a, Set<String> b) {
        Set<String> s = new HashSet<>(a);
        s.addAll(b);
        return s;
    }

    @Override
    public String toString() {
        return clock.toString();
    }

    public Map<String, Integer> getClock() {
        return new HashMap<>(clock);
    }
}
```

```java
/**
 * A versioned value with a vector clock for causality.
 */
public class VersionedValue<T> {
    private final T value;
    private final VectorClock vc;
    private final boolean tombstone;

    public VersionedValue(T value, VectorClock vc, boolean tombstone) {
        this.value = value;
        this.vc = vc;
        this.tombstone = tombstone;
    }

    public static <T> VersionedValue<T> create(T value, VectorClock vc) {
        return new VersionedValue<>(value, vc, false);
    }

    public T getValue() { return value; }
    public VectorClock getVectorClock() { return vc; }
    public boolean isTombstone() { return tombstone; }

    // Merge two versioned values based on vector clocks
    public static <T> VersionedValue<T> merge(VersionedValue<T> a, VersionedValue<T> b) {
        int cmp = a.vc.dominance(b.vc);
        if (cmp > 0) return a;
        if (cmp < 0) return b;
        // concurrent: simple fallback (could be enhanced with a conflict list)
        if (a.value != null) return a;
        return b;
    }
}
```

### Line-by-line explanation

VectorClock
- Line 1-7: Basic class with a map of node -> counter to capture causality.
- Line 9-12: Default constructor and copy constructor.
- Line 15-18: tick increments a node’s counter to signal a local event.
- Line 21-26: update allows merging external timestamps per node.
- Line 29-53: dominance() computes causality relation between two clocks:
  - Lines 34-37: Track if this clock is greater-or-equal or other is greater-or-equal for all nodes.
  - Lines 42-45: If clocks are identical, return 0; otherwise return 1 if this dominates, -1 if other dominates.
  - Line 50: Helper union across node sets.
- Line 55-60: toString for debugging, getClock for external access.

VersionedValue
- Line 1-6: Simple container with value, vector clock, and tombstone flag.
- Line 8-14: Factory and getters.
- Line 16-32: merge() compares vector clocks; if one dominates, return it; if concurrent, choose a fallback (here the non-null value).

## 3. Data Partitioning, Replication, and Sharding in Java

Real systems split data across shards and replicate for fault tolerance and latency. This section demonstrates a minimal sharded store and a route function based on key hashing.

```java
/**
 * Simple shard router: maps a key to a shard index using its hash code.
 */
public class ShardRouter {
    private final int shardCount;

    public ShardRouter(int shardCount) {
        if (shardCount <= 0) throw new IllegalArgumentException("shardCount must be >0");
        this.shardCount = shardCount;
    }

    public int route(String key) {
        int hash = key.hashCode();
        return Math.abs(hash) % shardCount;
    }
}
```

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A tiny sharded key-value store with N shards.
 */
public class ShardedStore {
    private final int shards;
    private final Map<Integer, Map<String, String>> storage = new ConcurrentHashMap<>();
    private final ShardRouter router;

    public ShardedStore(int shards) {
        this.shards = shards;
        this.router = new ShardRouter(shards);
        for (int i = 0; i < shards; i++) storage.put(i, new ConcurrentHashMap<>());
    }

    public void put(String key, String value) {
        int shard = router.route(key);
        storage.get(shard).put(key, value);
    }

    public String get(String key) {
        int shard = router.route(key);
        return storage.get(shard).get(key);
    }

    public int getShardForKey(String key) {
        return router.route(key);
    }
}
```

### Line-by-line explanation

ShardRouter
- Line 6-12: Constructor stores shard count with a guard against non-positive values.
- Line 14-18: route() computes a shard by hashing the key and taking modulo shardCount (positive index).

ShardedStore
- Line 11-15: Constructor creates an in-memory map for each shard and a router.
- Line 17-20: put() routes the key to a shard and writes to that shard’s map.
- Line 23-26: get() routes and reads from the corresponding shard.
- Line 29-31: Helper to expose which shard a key would hit.

## 4. Observability, Resilience, and Failure Handling Patterns

Operational reliability often means retry logic, backoff, timeouts, and graceful fallbacks. The following example provides a simple exponential backoff retry utility that you can apply to transient failures in distributed calls.

```java
import java.util.concurrent.Callable;

/**
 * Simple retry utility with exponential backoff.
 */
public class RetryExecutor {
    public static <T> T runWithRetry(Callable<T> task, int maxRetries, long initialDelayMs) throws Exception {
        long delay = initialDelayMs;
        int attempt = 0;
        while (true) {
            try {
                return task.call();
            } catch (Exception e) {
                attempt++;
                if (attempt > maxRetries) {
                    throw e;
                }
                Thread.sleep(delay);
                delay = Math.min(delay * 2, 30000); // cap backoff at 30 seconds
            }
        }
    }
}
```

```java
public class RetryDemo {
    public static void main(String[] args) {
        try {
            String result = RetryExecutor.runWithRetry(() -> {
                // Simulated transient failure: 70% chance to fail
                if (Math.random() < 0.7) throw new RuntimeException("Transient failure");
                return "success";
            }, 5, 100);

            System.out.println("Operation result: " + result);
        } catch (Exception e) {
            System.err.println("Operation failed after retries: " + e.getMessage());
        }
    }
}
```

### Line-by-line explanation

RetryExecutor
- Line 1-8: runWithRetry accepts a task, maxRetries, and initialDelay. It loops until success or retries exhausted.
- Line 7-11: Try executing the task; on failure, increment attempt, check against maxRetries, then sleep for the backoff delay, doubling delay with a cap.

RetryDemo
- Line 14-28: Demonstrates usage of the retry utility with a simulated transient failure and a max of 5 retries.
- Line 22-26: On success, prints result; on final failure, prints error message.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

Pitfalls are common when learning CAP and distributed design. The following side-by-side examples show typical mistakes and how to fix them.

1) Pitfall: Assuming CAP means you can have all three at all times
- Bad:
```java
// Naive write: updates both replicas without handling failures
void put(String k, String v) {
    primary.store.put(k, v);
    replica.store.put(k, v); // no checks, assumes network is perfect
}
```
- Good:
```java
boolean put(String k, String v) {
    if (!primary.up || !replica.up) return false; // abort in partition
    primary.store.put(k, v);
    replica.store.put(k, v);
    return true;
}
```

2) Pitfall: Not handling timeouts or retries for transient failures
- Bad:
```java
void callRemote() {
    // Assume remote call always succeeds
    remoteService.doWork();
}
```
- Good:
```java
String result = RetryExecutor.runWithRetry(() -> remoteService.doWork(), 5, 100);
```

3) Pitfall: Ignoring data versioning and conflicts
- Bad:
```java
String read() {
    return store.get("k"); // no conflict awareness
}
```
- Good:
```java
VersionedValue<String> v1 = store.readVersioned("k"); // includes vector clock
VersionedValue<String> v2 = store.readVersioned("k");
VersionedValue<String> merged = VersionedValue.merge(v1, v2); // simple conflict resolution
```

4) Pitfall: Reading stale data without repair
- Bad:
```java
String read(String k) {
    return store.get(k); // no reconciliation
}
```
- Good:
```java
String readWithRepair(String k) {
    VersionedValue<String> a = store.readVersioned(k);
    VersionedValue<String> b = store.readVersionedFromAnotherReplica(k);
    VersionedValue<String> merged = VersionedValue.merge(a, b);
    // optionally write back the merged value to fix divergence
    store.writeVersioned(k, merged);
    return merged.getValue();
}
```

## Y. Why This Matters In Real Systems — Production Context

- CAP is not a binary choice; production systems pick a point in the CAP space based on requirements:
  - CP is typical for metadata stores and systems requiring strict correctness, e.g., etcd, Zookeeper, or certain Redis modes when configured for consistency.
  - AP is common for highly available caches and some NoSQL databases where latency and uptime take priority, e.g., Cassandra, DynamoDB in specific configurations.
- Real systems implement tunable consistency, sharding/partitioning, replication, and conflict resolution strategies to meet SLAs.
- Vector clocks, logical clocks, and CRDTs (conflict-free replicated data types) help resolve divergences without locking, enabling higher availability.
- Observability (metrics, tracing, logs) is essential to detect partitions, propagation delays, and repair events in production.
- Pattern examples:
  - Read repairs and anti-entropy processes keep replicas aligned.
  - Hinted handoff and tombstones ensure cleanup and consistency during node outages.
  - Exponential backoff on retries reduces thundering herd problems during partial outages.

## Z. Study Questions — 5 Recall Questions

1) What are the three properties in CAP, and what happens to them during a network partition?
2) Distinguish CP vs AP with an example scenario and describe a typical data-write behavior in each.
3) How do vector clocks help detect causality and conflicts in a distributed store?
4) Why might eventual consistency be preferable for a caching layer, and what techniques help mitigate stale reads?
5) What is read repair and how does it help maintain eventual consistency in practice?

## Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small end-to-end Java playground that demonstrates CP and AP behavior, vector-clock-based conflict resolution, and a basic sharded store. Complete this in your IDE or a single file with multiple inner classes.

Part A — CP-style store with simple two-node commit
- Tasks:
  - Implement a CPStore class (you can reuse CAPCPStore from Section 1 as a starting point).
  - Add a two-phase commit-like protocol: a prepare phase that always succeeds only if both nodes are up, followed by a commit phase that writes to both nodes.
  - Include a simple test in main() that toggles partition and verifies put/get behavior under partition vs no-partition.
- Deliverables:
  - CPStore class with putPrepare, prepare, commit, and get methods.
  - A small main() that demonstrates commit success when all nodes up and failure when partitioned.

Part B — AP-style store with asynchronous replication
- Tasks:
  - Implement an APStore class (you can reuse CAPAPStore as a starting point).
  - Add an explicit primary and replica; implement an explicit asynchronous replication with thread sleep to simulate latency.
  - Show concurrent reads during a partition and ensure the code handles primary-down edge cases gracefully.
- Deliverables:
  - APStore with putAsync, get, and setPartition.
  - A small demo that shows reads returning possibly stale data during partition.

Part C — Vector clocks and simple conflict resolution
- Tasks:
  - Add a VectorClock class (you can adapt the one provided in Section 2).
  - Create a VersionedValue<T> container with vector clock metadata and a static merge function.
  - Simulate two concurrent updates to the same key on separate nodes and demonstrate merge behavior.
- Deliverables:
  - VectorClock and VersionedValue classes.
  - A small test that shows dominance/merge outcomes for concurrent updates.

Part D — Simple sharding demonstration
- Tasks:
  - Create a small ShardedStore with a few shards (3–4).
  - Demonstrate put/get routing by key to the appropriate shard using a ShardRouter.
  - Show how adding a new shard would re-route keys (conceptual demonstration; not a full rebalancing implementation).
- Deliverables:
  - ShardRouter and ShardedStore usage.
  - A mini-run that inserts and reads several keys, showing shard indices used.

Optional extensions (if you have time):
- Implement a read repair mechanism that, after a read, reconciles divergent replicas and optionally writes the merged value back.
- Extend the AP store to support versioned reads and simple conflict resolution.

Notes
- These exercises are educational simulations and intentionally simplified. They aim to illuminate rather than replace professional distributed systems engineering.
- Use unit tests or a small main() driver to demonstrate each concept clearly.
- If you want to explore further, consider integrating a real distributed store (e.g., Apache Cassandra for AP, etcd for CP) and compare their tunable consistency settings in a controlled lab environment.