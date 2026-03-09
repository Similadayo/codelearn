# Phase 9 — System Design & Scalability: Database Scaling — Replication & Sharding (PHP)

Database scaling is a core capability for building reliable, high-traffic backends. Replication and sharding are complementary techniques: replication mirrors data to multiple servers to improve read scalability and availability, while sharding horizontally partitions data across multiple databases to overcome single-database write throughput and storage limits. In PHP-based backends, understanding how to route reads/writes, handle replication lag, and design shard-aware schemas is essential for building scalable, fault-tolerant systems.

## 1. Replication Fundamentals in PHP Backends
Replication creates copies of data across multiple database servers. The typical pattern is a single writable master (for writes) and one or more read-only replicas (slaves) for reads. This gives you:
- Read throughput scaling by distributing read queries across replicas.
- Availability improvements: if one replica fails, reads can continue from others.
- An eventual consistency model: writes are committed on the master first; replicas reflect changes with some lag.

Below is a minimal PHP example using PDO that demonstrates a replication-aware data layer with a master and two slaves. It routes writes to the master and reads to slaves in a round-robin fashion.

```php
<?php
// Simple replication-aware DB access layer (master+slaves) in PHP (PDO)
class ReplicationDb {
    private PDO $master;
    private array $slaves;
    private int $slaveIndex = 0;

    public function __construct(string $masterDsn, array $slaveDsns) {
        $this->master = new PDO($masterDsn, '', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $this->slaves = [];
        foreach ($slaveDsns as $dsn) {
            $this->slaves[] = new PDO($dsn, '', '', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
        }
    }

    public function getWritePdo(): PDO {
        return $this->master;
    }

    public function getReadPdo(): PDO {
        if (empty($this->slaves)) {
            return $this->master;
        }
        // Simple round-robin among slaves
        $this->slaveIndex = ($this->slaveIndex + 1) % count($this->slaves);
        return $this->slaves[$this->slaveIndex];
    }

    public function execute(string $sql, array $params = []): PDOStatement {
        // Route: SELECT to slave, others to master (best-effort)
        $pdo = (stripos(trim($sql), 'SELECT') === 0)
            ? $this->getReadPdo()
            : $this->getWritePdo();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
}
```

Usage example:

```php
<?php
$masterDsn = 'mysql:host=127.0.0.10;dbname=shop';
$slaveDsns  = [
  'mysql:host=127.0.0.11;dbname=shop',
  'mysql:host=127.0.0.12;dbname=shop',
];

$db = new ReplicationDb($masterDsn, $slaveDsns);

// Write goes to master
$db->execute('INSERT INTO users (id, name) VALUES (?, ?)', [101, 'Alice']);

// Read goes to one of the replicas
$stmt = $db->execute('SELECT id, name FROM users WHERE id = ?', [101]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($row);
```

### Line-by-line explanation
- Line 1-2: Define a class that encapsulates master and slave connections.
- Line 6-12: Constructor creates a PDO connection to the master and a set of slave PDOs.
- Line 14-16: getWritePdo returns the master connection for writes.
- Line 18-26: getReadPdo selects a slave in a round-robin fashion; falls back to master if no slaves exist.
- Line 28-37: execute determines routing by parsing the SQL (SELECT vs others), prepares, and executes the statement.
- Usage snippet demonstrates typical write and read paths.

## 2. Read/Write Routing, Load Balancing, and Health Checks
In production, you should not only route reads/writes but also monitor the health of replicas and automatically failover or bypass unhealthy nodes. A health-check layer helps you avoid routing reads to a degraded replica and promotes resilience.

```php
<?php
// Health-check and failover capable replication layer (simplified)
class ReplicationHealth {
    private array $slaves;
    public function __construct(array $slavePdoList) {
        $this->slaves = $slavePdoList;
    }

    // Returns map of slave index => boolean healthy
    public function pingSlaves(): array {
        $results = [];
        foreach ($this->slaves as $idx => $pdo) {
            try {
                $stmt = $pdo->query('SELECT 1');
                $stmt->fetchAll();
                $results[$idx] = true;
            } catch (Throwable $e) {
                $results[$idx] = false;
            }
        }
        return $results;
    }

    // Simple failover: choose an available slave in round-robin, or master if none
    public function pickReadPdo(PDO $master): PDO {
        foreach ($this->slaves as $pdo) {
            try {
                $pdo->query('SELECT 1')->fetchAll();
                return $pdo;
            } catch (Throwable $e) {
                // skip unhealthy
            }
        }
        // If no healthy slave, return master
        return $master;
    }
}
```

Usage snippet:

```php
<?php
$masterDsn = 'mysql:host=127.0.0.10;dbname=shop';
$slaveDsns  = [
  'mysql:host=127.0.0.11;dbname=shop',
  'mysql:host=127.0.0.12;dbname=shop',
];

$master = new PDO($masterDsn);
$slaves = [
  new PDO($slaveDsns[0]),
  new PDO($slaveDsns[1]),
];

$health = new ReplicationHealth($slaves);
$healthy = $health->pingSlaves();
// Use health->pickReadPdo($master) to select a healthy read connection at query time
```

### Line-by-line explanation
- Line 4-9: ReplicationHealth holds slave connections and pings them with a lightweight SELECT 1 to check liveness.
- Line 11-22: pingSlaves iterates slaves, catching exceptions to determine health status per slave.
- Line 25-36: pickReadPdo returns the first healthy slave; if none are healthy, it falls back to the master.
- Line 39-47: Example usage creates master/slave connections and demonstrates how to integrate health checks into routing decisions.

## 3. Sharding Fundamentals: Hash-Based Partitioning and Routing
Sharding splits data across multiple databases to increase write throughput and storage capacity. In a hash-based shard, you map a key (e.g., user_id) to a shard using a deterministic function, then perform reads/writes on that shard only. Important considerations:
- Never join across shards at the database layer; instead, join in memory or via a service.
- Ensure a consistent hash function to avoid data movement.
- Plan for re-sharding strategies if you exceed shard capacity.

```php
<?php
// Simple hash-based sharding router
class ShardRouter {
    private int $numShards;
    private array $pdos; // per shard: [master, slaves...]
    public function __construct(array $masterDsns, array $slaveDsnsPerShard) {
        $this->numShards = count($masterDsns);
        $this->pdos = [];
        for ($i = 0; $i < $this->numShards; $i++) {
            $this->pdos[$i]['master'] = new PDO($masterDsns[$i], '', '', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            $this->pdos[$i]['slaves'] = [];
            foreach ($slaveDsnsPerShard[$i] as $dsn) {
                $this->pdos[$i]['slaves'][] = new PDO($dsn, '', '', [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                ]);
            }
        }
    }

    public function getShardIdForKey($key): int {
        return abs(crc32((string)$key)) % $this->numShards;
    }

    public function getShardPdo(int $shardId, string $type): PDO {
        if ($type === 'master' || empty($this->pdos[$shardId]['slaves'])) {
            return $this->pdos[$shardId]['master'];
        }
        // Round-robin among slaves
        static $rr = [];
        if (!isset($rr[$shardId])) $rr[$shardId] = 0;
        $rr[$shardId] = ($rr[$shardId] + 1) % count($this->pdos[$shardId]['slaves']);
        return $this->pdos[$shardId]['slaves'][$rr[$shardId]];
    }

    // Insert with routing to correct shard
    public function insert(string $key, string $sql, array $params): void {
        $shard = $this->getShardIdForKey($key);
        $pdo = $this->getShardPdo($shard, 'master');
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    public function query(string $key, string $sql, array $params): array {
        $shard = $this->getShardIdForKey($key);
        // Reads can go to a slave or master depending on policy
        $pdo = $this->getShardPdo($shard, 'read');
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

Usage example:

```php
<?php
$masters = [
  'mysql:host=127.0.0.20;dbname=shop_shard1',
  'mysql:host=127.0.0.21;dbname=shop_shard2',
  'mysql:host=127.0.0.22;dbname=shop_shard3',
  'mysql:host=127.0.0.23;dbname=shop_shard4',
];
$slavesPerShard = [
  ['mysql:host=127.0.0.30;dbname=shop_shard1', 'mysql:host=127.0.0.31;dbname=shop_shard1'],
  ['mysql:host=127.0.0.32;dbname=shop_shard2', 'mysql:host=127.0.0.33;dbname=shop_shard2'],
  ['mysql:host=127.0.0.34;dbname=shop_shard3', 'mysql:host=127.0.0.35;dbname=shop_shard3'],
  ['mysql:host=127.0.0.36;dbname=shop_shard4', 'mysql:host=127.0.0.37;dbname=shop_shard4'],
];
$router = new ShardRouter($masters, $slavesPerShard);

// Example insert data
$router->insert('user123', 'INSERT INTO users (id, name) VALUES (?, ?)', ['user123', 'Alice']);
// Example read
$rows = $router->query('user123', 'SELECT id, name FROM users WHERE id = ?', ['user123']);
```

### Line-by-line explanation
- Line 4-9: ShardRouter constructor builds per-shard masters and per-shard slave pools from DSNs.
- Line 11-15: getShardIdForKey uses a deterministic CRC32 hash to map a key to a shard.
- Line 17-28: getShardPdo returns either the master or a slave; slaves are selected round-robin.
- Line 31-37: insert routes the write to the shard’s master using a prepared statement.
- Line 39-46: query routes reads to a shard’s read connection and returns results.

## 4. Combining Replication with Sharding: Multi-Tier Routing
In real systems, you often want both replication and sharding. A typical approach is:
- Use shard routing to determine which database instance holds the data for a given key.
- Within that shard, route writes to the master and reads to a slave by replication topology.
- Implement read-your-writes guarantees selectively (e.g., read from master immediately after a write, or accept eventual consistency with reads from slave).

Below is a compact, integrated example that mirrors a multi-tier routing approach. This simplified example demonstrates the concepts without depending on a full ORM or external services.

```php
<?php
// Lightweight combined routing: per-shard master+slaves plus read/write routing
class ShardedReplicationLayer {
    private array $shards; // each shard: ['master'=>PDO, 'slaves'=>[PDO,...]]

    public function __construct(array $masterDsns, array $slaveDsnsPerShard) {
        $this->shards = [];
        $count = count($masterDsns);
        for ($i = 0; $i < $count; $i++) {
            $this->shards[$i]['master'] = new PDO($masterDsns[$i], '', '', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            $this->shards[$i]['slaves'] = [];
            foreach ($slaveDsnsPerShard[$i] as $dsn) {
                $this->shards[$i]['slaves'][] = new PDO($dsn, '', '', [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                ]);
            }
        }
    }

    private function getShardIdForKey(string $key): int {
        return abs(crc32($key)) % count($this->shards);
    }

    public function write(string $key, string $sql, array $params): void {
        $sid = $this->getShardIdForKey($key);
        $master = $this->shards[$sid]['master'];
        $stmt = $master->prepare($sql);
        $stmt->execute($params);

        // Simple synchronous replication: copy to all slaves of this shard
        foreach ($this->shards[$sid]['slaves'] as $slave) {
            $stmt2 = $slave->prepare($sql);
            $stmt2->execute($params);
        }
    }

    public function read(string $key, string $sql, array $params, bool $preferMaster = false): array {
        $sid = $this->getShardIdForKey($key);
        if ($preferMaster || empty($this->shards[$sid]['slaves'])) {
            $pdo = $this->shards[$sid]['master'];
        } else {
            // Simple round-robin among slaves
            static $rr = [];
            if (!isset($rr[$sid])) $rr[$sid] = 0;
            $rr[$sid] = ($rr[$sid] + 1) % count($this->shards[$sid]['slaves']);
            $pdo = $this->shards[$sid]['slaves'][$rr[$sid]];
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

Usage:

```php
<?php
$masters = [
  'mysql:host=127.0.0.20;dbname=shop_shard1',
  'mysql:host=127.0.0.21;dbname=shop_shard2',
  'mysql:host=127.0.0.22;dbname=shop_shard3',
  'mysql:host=127.0.0.23;dbname=shop_shard4',
];
$slavesPerShard = [
  ['mysql:host=127.0.0.30;dbname=shop_shard1', 'mysql:host=127.0.0.31;dbname=shop_shard1'],
  ['mysql:host=127.0.0.32;dbname=shop_shard2', 'mysql:host=127.0.0.33;dbname=shop_shard2'],
  ['mysql:host=127.0.0.34;dbname=shop_shard3', 'mysql:host=127.0.0.35;dbname=shop_shard3'],
  ['mysql:host=127.0.0.36;dbname=shop_shard4', 'mysql:host=127.0.0.37;dbname=shop_shard4'],
];

$layer = new ShardedReplicationLayer($masters, $slavesPerShard);

// Write a user to the shard determined by user_id
$layer->write('user123', 'INSERT INTO users (id, name) VALUES (?, ?)', ['user123', 'Alice']);

// Read back (prefer master to avoid consistency surprises)
$rows = $layer->read('user123', 'SELECT id, name FROM users WHERE id = ?', ['user123'], true);
```

### Line-by-line explanation
- Line 4-22: The constructor builds per-shard master/slave PDOs from DSNs.
- Line 24-26: getShardIdForKey deterministically maps a key to a shard.
- Line 28-36: write routes to the shard master and propagates the write to all slaves (simple replication).
- Line 38-50: read chooses master (if requested) or a slave using round-robin, executes, and returns results.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Mixing reads and writes on the wrong DB (no read/write routing)
  - Bad:
    ```php
    // Reads/writes all go to the same connection (no routing)
    $pdo->query("SELECT * FROM users WHERE id = 1");
    $pdo->query("UPDATE users SET name = 'Bob' WHERE id = 1");
    ```
  - Good:
    ```php
    // Write to master, read from slave
    $pdoMaster->prepare("UPDATE users SET name = ? WHERE id = ?")->execute(['Bob', 1]);
    $pdoSlave->prepare("SELECT * FROM users WHERE id = ?")->execute([1]);
    ```
- Pitfall 2: Assuming immediate consistency after a write in a replicated setup
  - Bad:
    ```php
    // Read immediately after write from replica
    $db->execute("INSERT INTO orders (id, amount) VALUES (?, ?)", [123, 9.99]);
    $row = $db->execute("SELECT * FROM orders WHERE id = ?", [123])->fetch();
    // May get stale data due to replication lag
    ```
  - Good:
    ```php
    // Read from master for the first read after a write, or implement a small delay
    $db->execute("INSERT INTO orders (id, amount) VALUES (?, ?)", [123, 9.99]);
    $row = $dbMaster->prepare("SELECT * FROM orders WHERE id = ?")->execute([123])->fetch();
    ```
- Pitfall 3: Cross-shard joins or cross-shard reads
  - Bad:
    ```php
    // Attempting to join user data across shards (not supported by simple sharding)
    $rows = $db->query("SELECT u.id, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.id = ?", [123]);
    ```
  - Good:
    ```php
    // Read from a single shard and perform any cross-shard aggregation at the application layer
    $rows = $db->query("SELECT id, name FROM users WHERE id = ?", [123]);
    // Then fetch related data from the same shard or orchestrate via a service
    ```
- Pitfall 4: Not handling failover gracefully
  - Bad:
    ```php
    // If a slave goes down, hard fail
    $pdo = $slaves[0];
    $stmt = $pdo->query("SELECT * FROM products");
    ```
  - Good:
    ```php
    // Health-check and fallback to master or another healthy slave
    if ($healthCheck->isSlaveHealthy(0)) {
        $pdo = $slaves[0];
    } else {
        $pdo = $master;
    }
    $stmt = $pdo->query("SELECT * FROM products");
    ```

## Y. Why This Matters In Real Systems — production context and real usage
- Scale and cost: Replication increases read capacity without purchasing more powerful single servers; sharding increases write throughput by distributing data and load.
- Availability and disaster recovery: With replicas, you can survive a single node failure; with shards, you can re-balance or migrate shards if a node fails.
- Operational complexity: You must design robust routing, monitoring, and failover. Tools like orchestrators, proxies (e.g., ProxySQL, Vitess), and observability (metrics, traces) become essential in real systems.
- Consistency trade-offs: Replication introduces lag (eventual consistency for reads from replicas). Decide whether you can tolerate that, and implement strategies to mitigate it (read-from-master for critical paths, explicit synchronization points, etc.).
- Schema and query design: Cross-shard joins, referential integrity, and migrations are more complex; design schemas to minimize cross-shard operations and plan for re-sharding if shards become unbalanced.

## Z. Study Questions — 5 recall questions
1. What is the main difference between replication and sharding in terms of scaling goals?
2. How does round-robin read routing help balance load across replicas?
3. Why should you avoid cross-shard joins in a sharded database architecture?
4. What is replication lag, and how can your application mitigate it?
5. What are some signals you would monitor to detect replica health and trigger failover?

## Exercise — a practical multi-part coding challenge
Part A — Build a minimal in-memory replication/sharding demo in PHP
- Create a small in-memory "database" for four shards. Each shard has a master storage array and two slave storage arrays.
- Implement a ShardRouter-like class that maps a key (e.g., user_id) to a shard via a deterministic hash (crc32).
- Implement write and read methods that operate on the shard’s master and replicas to demonstrate replication behavior in memory (no real DB connections required).
- Print logs showing where writes go (master) and where reads come from (slave or master on fallback).

Part B — Extend to a PDO-based simulation (without a live DB)
- Replace in-memory storage with actual PDO-based stores using SQLite in memory for each shard to keep things portable.
- Implement:
  - A per-shard master connection using SQLite in memory (like sqlite:memory:dbN_master).
  - Per-shard two slave connections using separate in-memory SQLite databases (sqlite:memory:dbN_slave1, sqlite:memory:dbN_slave2).
  - A write path that inserts into the shard master and replicates into each slave (by executing the same INSERT on each slave).
  - A read path that reads from a slave in a round-robin fashion, with an option to read from master when needed.
- Validate that after a write, subsequent reads can observe the inserted row via slaves (with explicit replication semantics) and via the master for consistency-critical code.

Part C — Small integration test
- Write a script that:
  - Creates four shards with the described master/slave sets.
  - Writes 5 unique users with different IDs.
  - Reads them back from a randomly chosen key and shard, verifying that data matches what was written.
  - Demonstrates a health-check-like flow by simulating a slave connection failure and confirming reads fall back to another healthy replica or the master.

Notes
- These exercises are intentionally scoped to help you reason about replication and sharding concepts without requiring a production-grade distributed database setup.
- In real systems, you would use a database proxy or sharding engine (e.g., Vitess, ProxySQL) to handle routing, connection pooling, and health checks at runtime; this exercise focuses on understanding the design decisions, routing logic, and application-level integration in PHP.

If you’d like, I can tailor the exercises to a specific PHP framework (Laravel, Symfony) or adjust the examples for a MySQL, PostgreSQL, or MariaDB environment.