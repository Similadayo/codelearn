# CAP Theorem & Distributed Systems Basics in PHP

Understanding the CAP theorem and the fundamentals of distributed systems is essential for building scalable, reliable backend services. In PHP-driven backends, you often deal with multiple data stores, caches, and microservices that must operate under imperfect networks and partial failures. This lesson explains CAP trade-offs, consistency models, failure modes, and practical PHP patterns that help you design robust systems in production.

## 1. CAP Theorem in a Nutshell with PHP Simulation

The CAP theorem states that in the presence of a network partition, a distributed system can guarantee at most two of the following three properties: Consistency, Availability, and Partition tolerance. In practice, you almost always endure partitions (network failures, latency spikes). Therefore, you must choose between:
- Consistency (CP): reads/writes are strictly consistent; some requests may fail during partitions to preserve correctness.
- Availability (AP): every request receives a (possibly stale) response; reads/writes continue during partitions.
- CA (Consistency and Availability) is theoretically possible only in a non-partitioned world; in real systems you typically maintain CP or AP during partitions.

This PHP example illustrates a tiny, in-memory cluster with three nodes and a quorum policy for CP-like behavior (consistency under partitions) versus AP-like behavior (availability with potential divergence).

```php
<?php
// Simple in-memory node representing a storage node
class Node {
    public string $name;
    public array $store = [];

    public function __construct(string $name) {
        $this->name = $name;
    }

    public function write(string $key, $value): void {
        $this->store[$key] = $value;
    }

    public function read(string $key) {
        return $this->store[$key] ?? null;
    }
}

// A tiny cluster of nodes with a configurable quorum-based policy
class Cluster {
    /** @var Node[] */
    public array $nodes = [];
    public int $quorum;

    public function __construct(array $names) {
        foreach ($names as $name) {
            $this->nodes[] = new Node($name);
        }
        // Majority/quorum for 3 nodes is 2
        $this->quorum = (int)ceil(count($this->nodes) / 2);
    }

    // CP-like write: if a partition occurs (simulated by skipping a node), we may fail the write
    public function writeWithPartition(string $key, $value, bool $partitioned = false): bool {
        $acks = 0;
        foreach ($this->nodes as $node) {
            // Simulate a partition by skipping one node (e.g., B) in writes
            if ($partitioned && $node->name === 'B') {
                continue;
            }
            $node->write($key, $value);
            $acks++;
        }
        // Write succeeds only if we achieved quorum
        return $acks >= $this->quorum;
    }

    // CP-like read: returns the value if a quorum agrees on it; otherwise null
    public function readWithQuorum(string $key) {
        $vals = [];
        foreach ($this->nodes as $node) {
            $vals[] = $node->read($key);
        }

        // Count occurrences
        $counts = [];
        foreach ($vals as $v) {
            $counts[$v] = ($counts[$v] ?? 0) + 1;
        }
        arsort($counts, SORT_NUMERIC);

        // Return the value with the highest count if it meets quorum
        foreach ($counts as $val => $c) {
            if ($c >= $this->quorum) {
                return $val;
            }
        }
        return null;
    }
}

// Demonstration
$cluster = new Cluster(['A', 'B', 'C']);

// Normal operation (no partition)
$ok = $cluster->writeWithPartition('session:user42', 'Alice', false);
echo "Write without partition: " . ($ok ? "OK" : "FAIL") . PHP_EOL;
echo "Read (consistency check): " . $cluster->readWithQuorum('session:user42') . PHP_EOL;

// Simulate a partition where node B is unreachable for writes
$okPartition = $cluster->writeWithPartition('session:user42', 'Alice-Partitioned', true);
echo "Write with partition (CP-like): " . ($okPartition ? "OK" : "PARTITIONED") . PHP_EOL;

// Read after partition
echo "Read after partition: " . $cluster->readWithQuorum('session:user42') . PHP_EOL;
```

### Line-by-line explanation
1. Define Node with a name and a storage map.
2. Node constructor initializes the node name.
3. Node write stores value under key.
4. Node read returns stored value or null.
6. Define Cluster to manage multiple nodes and a quorum threshold.
7. Cluster constructor builds Node instances from names.
9. Quorum is computed as the ceiling of nodes/2.
12. writeWithPartition writes to all non-partitioned nodes; if partitioned, skips node B.
14-18. Increase acks per successful write; return true if acks meet quorum.
21-31. readWithQuorum gathers values from all nodes, counts frequencies, and returns the most frequent value if it meets quorum.
33-41. Demonstration of normal operation, partition scenario, and reads after partition.

This example anchors the concept that under partitions you can trade consistency (CP) by requiring quorum acknowledgment, or allow availability with potential divergence (AP). In PHP services, you often implement these policies at the data access layer or via middleware.

## 2. Consistency Models and Quorums

Consistency models describe how reads reflect writes in a distributed system. Popular pragmatic choices include quorum-based strong consistency (read/write with majority) and weaker, eventually consistent patterns (reads may return stale data). The following PHP snippet demonstrates two patterns on a three-node cluster: a CP-like quorum write/read and an eventual-availability approach where writes may succeed with a single node.

```php
<?php
class QuorumCluster {
    private array $nodes = [];
    private int $quorum;

    public function __construct(array $names) {
        foreach ($names as $n) {
            $this->nodes[] = new class {
                public string $name;
                public array $store = [];
                public function __construct(string $name){
                    $this->name = $name;
                }
                public function write(string $k, $v){ $this->store[$k] = $v; }
                public function read(string $k){ return $this->store[$k] ?? null; }
            };
            $this->nodes[count($this->nodes)]->name = $n;
        }
        $this->quorum = (int)ceil(count($this->nodes) / 2);
    }

    // CP-like: needs majority acknowledgments
    public function cpWrite(string $key, $value): bool {
        $acks = 0;
        foreach ($this->nodes as $node) {
            $node->write($key, $value);
            $acks++;
        }
        return $acks >= $this->quorum;
    }

    public function cpRead(string $key) {
        $vals = [];
        foreach ($this->nodes as $node) {
            $vals[] = $node->read($key);
        }
        // majority-based read result
        $counts = [];
        foreach ($vals as $v) {
            $counts[$v] = ($counts[$v] ?? 0) + 1;
        }
        arsort($counts, SORT_NUMERIC);
        foreach ($counts as $v => $c) {
            if ($c >= $this->quorum) return $v;
        }
        return null;
    }

    // AP-like: write to any node (one or more) and read from any node; potential staleness
    public function apWrite(string $key, $value): bool {
        // write to the first node only to simulate early availability
        if (!empty($this->nodes)) {
            $this->nodes[0]->write($key, $value);
            return true;
        }
        return false;
    }

    public function apRead(string $key) {
        // read from the first node; may be stale if not replicated yet
        foreach ($this->nodes as $node) {
            $v = $node->read($key);
            if ($v !== null) return $v;
        }
        return null;
    }
}
$cluster = new QuorumCluster(['A','B','C']);
echo "CP Write: " . ($cluster->cpWrite('config:featureX','enabled') ? 'OK' : 'FAIL') . PHP_EOL;
echo "CP Read: " . $cluster->cpRead('config:featureX') . PHP_EOL;
$cluster->apWrite('config:featureX','enabled'); // immediate availability on one node
echo "AP Read after AP write: " . $cluster->apRead('config:featureX') . PHP_EOL;
```

### Line-by-line explanation
1. Define a small class-like structure inline to simulate Node behavior.
2-9. Each node has a name and in-memory store with write/read methods.
11-20. QuorumCluster constructor builds three nodes and sets a majority quorum.
23-31. cpWrite writes to all nodes and returns true if quorum achieved.
32-43. cpRead aggregates values and returns the majority value if it meets quorum.
45-54. apWrite writes to only the first node to simulate eventual write; apRead fetches from any node, potentially stale.
55-63. Demonstration: CP path writes/reads; AP path writes/read demonstrates eventual availability.

This section contrasts two practical patterns:
- CP-like paths: reads and writes require majority consensus to ensure strong consistency.
- AP-like paths: operations complete quickly with available nodes, accepting potential divergence until replication reconciles.

## 3. Partition Tolerance, Network Failures, and Availability

Partition tolerance means the system keeps functioning despite parts of the network being unreachable. Real systems implement different degradation strategies: fail-fast on critical paths, degrade gracefully by serving stale or partial data, or route around partitioned shards. The following PHP example demonstrates a simple approach to degrade gracefully under partitions by defaulting to available nodes and signaling partial availability.

```php
<?php
class SimplePartitionedCluster {
    private array $nodes = [];
    private int $quorum;
    private bool $partitionActive = false;

    public function __construct(array $names) {
        foreach ($names as $n) {
            $node = new class {
                public string $name;
                public array $store = [];
                public function __construct(string $name){
                    $this->name = $name;
                }
                public function write(string $k, $v){ $this->store[$k] = $v; }
                public function read(string $k){ return $this->store[$k] ?? null; }
            };
            $node->name = $n;
            $this->nodes[] = $node;
        }
        $this->quorum = (int)ceil(count($this->nodes) / 2);
    }

    public function setPartition(bool $state): void {
        $this->partitionActive = $state;
    }

    public function write(string $key, $value): bool {
        // If partition is active, only a subset of nodes are reachable (simulate partial availability)
        $acks = 0;
        foreach ($this->nodes as $node) {
            if ($this->partitionActive && $node->name === 'node2') {
                // node2 is unreachable during partition
                continue;
            }
            $node->write($key, $value);
            $acks++;
        }
        return $acks >= $this->quorum;
    }

    public function read(string $key) {
        // Read from reachable nodes; if partition prevents majority, return a best-effort value
        $vals = [];
        foreach ($this->nodes as $node) {
            if ($this->partitionActive && $node->name === 'node2') {
                continue;
            }
            $vals[] = $node->read($key);
        }
        // majority of available reads
        $counts = [];
        foreach ($vals as $v) {
            $counts[$v] = ($counts[$v] ?? 0) + 1;
        }
        arsort($counts, SORT_NUMERIC);
        foreach ($counts as $v => $c) {
            if ($c >= $this->quorum) return $v;
        }
        // best-effort: return latest known value or null
        return end($vals) ?: null;
    }
}

$cluster = new SimplePartitionedCluster(['node1','node2','node3']);
$cluster->write('config:cache','v1');
echo "Read with no partition: " . $cluster->read('config:cache') . PHP_EOL;

$cluster->setPartition(true);
$cluster->write('config:cache','v2'); // part of the cluster cannot be reached; may fail or be partial
echo "Read under partition: " . $cluster->read('config:cache') . PHP_EOL;
```

### Line-by-line explanation
1. Define SimplePartitionedCluster with a set of nodes and quorum.
3-13. Create in-memory node objects with write/read; assign names.
15-17. setPartition toggles a simulated network partition.
19-31. write attempts to all reachable nodes; when partition is active, a specific node is skipped to simulate partial availability; returns true if quorum is reached.
33-50. read collects values from reachable nodes and returns a majority value if possible; otherwise returns a best-effort value.
52-58. Demonstration: normal read, then enter partition, then read again to observe degraded availability.

This section shows how partition tolerance interacts with availability: you can maintain service continuity by serving from available nodes, but you may return stale data or a partial capability depending on the policy.

## 4. Designing CAP-aware PHP Backends: CP vs AP vs CA

In production, you typically model abstract data access patterns to support different CAP preferences. This example defines a small DataStore interface and two concrete implementations: CP-like (strong consistency) and AP-like (high availability with eventual consistency). In real systems, you would wire these up to actual databases (MySQL, PostgreSQL) and caches (Redis, Memcached) with proper error handling, retries, and asynchronous job queues.

```php
<?php
interface DataStore {
    public function set(string $key, $value): bool;
    public function get(string $key);
}

// CP-like store: uses a transactional approach to ensure consistency
class CPStore implements DataStore {
    private array $db = [];

    public function set(string $key, $value): bool {
        // Simulate a transaction boundary
        $this->begin();
        $this->db[$key] = $value;
        $this->commit();
        return true;
    }

    public function get(string $key) {
        return $this->db[$key] ?? null;
    }

    private function begin() { /* transaction start (no-op in this sim) */ }
    private function commit() { /* transaction commit (no-op in this sim) */ }
}

// AP-like store: writes are asynchronous and may be replicated later
class APStore implements DataStore {
    private array $primary = [];
    private array $log = [];

    public function set(string $key, $value): bool {
        // Write to primary immediately
        $this->primary[$key] = $value;
        // Log the write for eventual replication
        $this->log[] = [$key, $value];
        // Return immediately to indicate "availability"
        return true;
    }

    public function get(string $key) {
        // Read from primary; could be stale if replication hasn't caught up
        return $this->primary[$key] ?? null;
    }

    // Simulation helper: apply log entries to simulate replication later
    public function replayLogs(): void {
        foreach ($this->log as [$k, $v]) {
            $this->primary[$k] = $v;
        }
        $this->log = [];
    }
}

// Demonstration
$cp = new CPStore();
$cp->set('user:100', ['name'=>'Alice','email'=>'alice@example.com']);
echo "CP get: " . json_encode($cp->get('user:100')) . PHP_EOL;

$ap = new APStore();
$ap->set('user:101', ['name'=>'Bob','email'=>'bob@example.com']);
echo "AP get (before replication): " . json_encode($ap->get('user:101')) . PHP_EOL;
$ap->replayLogs();
echo "AP get (after replication): " . json_encode($ap->get('user:101')) . PHP_EOL;
```

### Line-by-line explanation
1. Define a DataStore interface with set and get methods.
4-13. CPStore implements a “strong” store, backing data in a local array and using (simulated) transactions.
15-23. CPStore.set writes inside a simulated transaction; begin/commit are no-ops here but illustrate the boundary.
25-28. CPStore.get reads from the current store.
31-33. APStore implements a simple eventual-consistency pattern: writes go to a primary store and are logged for replication.
36-41. APStore.get reads from the primary (which may be behind); replayLogs simulates replicating the log to followers.
44-57. Demonstration: CP path returns consistent data; AP path shows potential delay (replication) until replayLogs is called.

In production PHP apps, CPStore would map to databases with strict isolation and proper transaction handling, while APStore would map to caches or replicated stores with asynchronous writes and eventual consistency.

## 5. Practical Patterns: Caching, Storage, and Data Replication

Caching is essential for performance, but you must invalidate or refresh caches to avoid serving stale data. The following PHP pattern demonstrates a simple TTL cache layer on top of a backing store to illustrate a practical CAP-aware pattern: fast reads via cache with fallback to a backing store when cache misses occur.

```php
<?php
class SimpleCache {
    private array $store = [];

    public function set(string $key, $value, int $ttlSeconds): void {
        $this->store[$key] = ['v' => $value, 'exp' => time() + $ttlSeconds];
    }

    public function get(string $key) {
        if (!isset($this->store[$key])) return null;
        $entry = $this->store[$key];
        if ($entry['exp'] < time()) {
            unset($this->store[$key]);
            return null;
        }
        return $entry['v'];
    }
}

class BackingDB {
    private array $db = [
        'user:1' => ['id'=>1,'name'=>'Alice'],
        'user:2' => ['id'=>2,'name'=>'Bob'],
    ];

    public function fetch(string $key) {
        return $this->db[$key] ?? null;
    }
}

$cache = new SimpleCache();
$db = new BackingDB();

// get user by id with cache
function getUser(int $id, SimpleCache $cache, BackingDB $db) {
    $key = "user:$id";
    $val = $cache->get($key);
    if ($val !== null) {
        return $val; // cache hit
    }
    // cache miss: fetch from backing store and populate cache
    $val = $db->fetch($key);
    if ($val !== null) {
        // TTL could be 60 seconds
        $cache->set($key, $val, 60);
    }
    return $val;
}

echo json_encode(getUser(1, $cache, $db)) . PHP_EOL;
echo json_encode(getUser(2, $cache, $db)) . PHP_EOL;
```

### Line-by-line explanation
1. SimpleCache class to store key-value pairs with TTL metadata.
3-9. set method stores value with an expiration timestamp.
11-17. get method returns cached value if present and not expired; otherwise returns null.
19-23. BackingDB simulates the primary data store with a fixed dataset.
25-38. getUser function implements a cache-then-store pattern: check cache first, then fallback to DB, and refresh cache.
40-41. Demonstration: fetch users, first call populates cache; second call uses cache.

Key production considerations:
- Use a real cache backend (Redis, Memcached) with proper TTLs and eviction policies.
- Invalidate cache on writes to preserve consistency, using write-through or write-behind patterns.
- Consider cache warming and background refresh to improve uptime.

## X. Common Beginner Mistakes

1) Assuming you can achieve strong consistency everywhere by code alone
- Bad:
  - Writes to one service instance without majority acknowledgment.
  - Reads that assume global consistency without considering partitions.
- Good:
  - Implement quorum-based writes/reads or explicitly choose AP vs CP paths and document expectations.
  - Use explicit distribution-layer policies or middleware to enforce CAP choices.

Code example: bad assumption vs better approach

Bad:
```php
// Writes only to a single cache node, assuming others are synchronized
$cache->set('user:9','Jane', 120);
```

Good:
```php
// Write to a durable backing store with a clear replication policy
$store = new CPStore();
$store->set('user:9', ['name' => 'Jane']); // ensures consistency within the CP boundary
```

2) Not handling partitions and failing gracefully
- Bad:
  - Service continues serving stale or partial data without signaling partition status.
- Good:
  - Detect partitions and apply a fail-fast or degraded-availability strategy with clear user feedback.

Bad:
```php
// assume all nodes are reachable
$val = $cluster->readWithQuorum('session:1');
```

Good:
```php
$val = $cluster->readWithQuorum('session:1');
if ($val === null) {
  // signal degraded mode or fetch from fallback source
  $val = $fallback->get('session:1');
}
```

3) Cache without invalidation or stale reads
- Bad:
  - Update DB but never refresh or invalidate the cache, leading to stale reads.
- Good:
  - Invalidate or refresh cache synchronously on writes, or implement cache-aside with careful TTLs.

Bad:
```php
$cache->set('user:1', $newUser, 60); // cache updated but DB update missing
```

Good:
```php
$store->set('user:1', $newUser);
$cache->set('user:1', $newUser, 60); // invalidate/refresh
```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- CAP trade-offs affect SLA and user experience. For a financial ledger, CP behavior (consistency) is often essential; for feed-like data or social content, AP semantics may be acceptable to ensure high availability.
- Partition tolerance is a given in distributed deployments (multi-region deployments, cloud hiccups). Designing for partitions avoids cascading outages.
- Clear interfaces and architectural boundaries help teams swap CP vs AP stores without changing application logic. This enables A/B testing CAP behaviors or gradually migrating between stores.
- Caching patterns must be coupled with invalidation strategies, monitoring, and observability. Production systems rely on metrics: cache hit rate, tail latency, error rate during partitions, replication lag, etc.
- Observability and resiliency are as critical as correctness. Use tracing (e.g., OpenTelemetry), metrics (Prometheus), and structured logging to understand the CAP behavior in production.

## Z. Study Questions

1) What are the three properties in the CAP theorem, and why is Partition Tolerance treated as a given in real-world systems?
2) How does a quorum-based CP design help maintain consistency during partitions?
3) What is the difference between CP and AP in practice, and what are typical indicators you’d observe in production for each?
4) Why is cache invalidation critical in CAP-aware designs, and what are common invalidation strategies?
5) How would you design a PHP backend to allow swapping between CP and AP stores with minimal code changes?

## Exercise

Part A — Implement a CAP-aware PHP repository pattern
- Build an interface DataStore with methods set(string $key, $value): bool and get(string $key).
- Implement CPStore (strong consistency) and APStore (high availability with eventual consistency) as in-section examples, both satisfying DataStore.
- Create a small CLI driver (PHP script) that:
  - Instantiates both CPStore and APStore.
  - Performs a series of writes and reads to demonstrate CP vs AP behavior under simulated partition by toggling a boolean flag.
  - Logs results showing whether reads are consistent with writes and whether reads return stale data during partition.

Part B — Cache with invalidation
- Implement a SimpleCache (TTL-based) and a BackingDB as a mock database.
- Write a PHP function getUserProfile(int $id) that uses the cache first and falls back to the backing DB if the cache misses or expires.
- After a write to BackingDB, ensure the cache is invalidated or refreshed accordingly.

Part C — Observability and basic testing
- Add micro-logging (error and info levels) around CP vs AP operations.
- Create a small test harness that asserts:
  - CPStore returns the same value for a given key across reads after a write (under no partition).
  - APStore can return stale data when a partition is active.

Deliverable expectations:
- Clean, documented PHP code with a clear separation of concerns.
- Demonstrations of CP vs AP behavior in controlled scenarios.
- Clear notes about what changes would be required to migrate from AP to CP or vice versa in a real system.

This lesson provides concrete PHP patterns and executable conceptual demonstrations to help you reason about CAP in real backend systems. Use these as templates and adapt them to your actual data stores, queues, and caches in production environments.