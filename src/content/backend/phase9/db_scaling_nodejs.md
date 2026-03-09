# Track: Backend Engineering — Phase 9 — System Design & Scalability: Database Scaling — Replication & Sharding (Node.js)

Welcome to Phase 9. In this module, we’ll explore how to scale databases in production using replication and sharding, all implemented with JavaScript/Node.js. Replication improves read throughput and availability, while sharding enables horizontal scaling by distributing data across multiple databases. Together, they unlock higher throughput, lower latency, and better fault tolerance for large systems.

## 1. Replication Concepts in Practice

Understanding master/primary and read replicas, plus synchronous vs asynchronous replication, sets the foundation for scalable backends. In Node.js, you typically route writes to the primary and reads to replicas, with simple failover and load balancing strategies.

```js
// replication-cluster.js
// Minimal replication-aware DB client (Node.js + pg)

const { Pool } = require('pg');

class ReplicationCluster {
  constructor(primaryConfig, replicaConfigs = []) {
    this.primaryPool = new Pool(primaryConfig);

    // Build a pool per replica
    this.replicaPools = replicaConfigs.map(cfg => new Pool(cfg));

    // Simple round-robin counter for replica selection
    this.nextReplica = 0;
  }

  // Naive: treat SELECT as read; anything else as write
  isReadQuery(sql) {
    const s = sql.trim().toLowerCase();
    return s.startsWith('select');
  }

  // Choose a replica in a round-robin fashion, fall back to primary on failure
  async query(sql, params) {
    if (this.isReadQuery(sql) && this.replicaPools.length > 0) {
      const pool = this.replicaPools[this.nextReplica];
      this.nextReplica = (this.nextReplica + 1) % this.replicaPools.length;
      try {
        return await pool.query(sql, params);
      } catch (err) {
        // If a replica fails, retry on the primary
        console.warn('Read from replica failed, falling back to primary:', err.message);
        return this.primaryPool.query(sql, params);
      }
    } else {
      // Writes go to primary (or no replicas configured)
      return this.primaryPool.query(sql, params);
    }
  }

  async close() {
    await this.primaryPool.end();
    for (const p of this.replicaPools) await p.end();
  }
}

module.exports = ReplicationCluster;
```

Usage example:

```js
// usage-example.js
require('dotenv').config();
const ReplicationCluster = require('./replication-cluster');

// Primary and replicas configured via environment variables or config files
const primaryConfig = {
  user: process.env.PG_PRIMARY_USER,
  host: process.env.PG_PRIMARY_HOST,
  database: process.env.PG_PRIMARY_DATABASE,
  password: process.env.PG_PRIMARY_PASSWORD,
  port: 5432
};

const replicaConfigs = [
  {
    user: process.env.PG_REPLICA1_USER,
    host: process.env.PG_REPLICA1_HOST,
    database: process.env.PG_REPLICA1_DATABASE,
    password: process.env.PG_REPLICA1_PASSWORD,
    port: 5432
  },
  {
    user: process.env.PG_REPLICA2_USER,
    host: process.env.PG_REPLICA2_HOST,
    database: process.env.PG_REPLICA2_DATABASE,
    password: process.env.PG_REPLICA2_PASSWORD,
    port: 5432
  }
];

const db = new ReplicationCluster(primaryConfig, replicaConfigs);

async function runDemo() {
  // Read path (goes to replicas in a round-robin fashion)
  const resRead = await db.query('SELECT id, name FROM users WHERE id = $1', [1]);
  console.log('Read result:', resRead.rows);

  // Write path (goes to primary)
  const resWrite = await db.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [1]);
  console.log('Write result:', resWrite.rowCount);

  await db.close();
}

runDemo().catch(console.error);
```

### Line-by-line explanation
- Line 1-7: Import pg Pool and define a ReplicationCluster class with a constructor that creates a primary pool and an array of replica pools. Initialize a round-robin counter.
- Line 9-14: isReadQuery determines whether the given SQL should be treated as a read operation (SELECT) or not.
- Line 16-28: query routes read queries to replicas in round-robin order; if a replica fails, it falls back to the primary and logs a warning.
- Line 30-32: close gracefully shuts down all pools.
- Usage file: defines configurations for primary and replicas (ideally from environment vars), creates the cluster, and demonstrates a read and a write operation, followed by cleanup.
- Explanation of behavior: reads are load-balanced across replicas; writes always hit the primary; in case of replica failure, reads fall back to primary to maintain correctness.

## 2. Read Routing, Connection Pooling, and Failure Handling

A robust system needs resilient reads, smart load balancing, and safe fallbacks. Here we extend the pattern with explicit read pool selection, a dedicated write path, and basic retry semantics for failed reads.

```js
// replication-robust.js
const { Pool } = require('pg');

class DBCluster {
  constructor(primaryConfig, replicaConfigs = []) {
    this.primary = new Pool(primaryConfig);
    this.replicas = replicaConfigs.map(cfg => new Pool(cfg));
    this.rr = 0; // round-robin index
  }

  isRead(sql) {
    return sql.trim().toLowerCase().startsWith('select');
  }

  getReadPool() {
    if (this.replicas.length === 0) return this.primary;
    const pool = this.replicas[this.rr];
    this.rr = (this.rr + 1) % this.replicas.length;
    return pool;
  }

  async query(sql, params) {
    const read = this.isRead(sql);
    const pool = read ? this.getReadPool() : this.primary;

    try {
      return await pool.query(sql, params);
    } catch (err) {
      // If a read fails, attempt the primary as a last resort
      if (read) {
        try {
          console.warn('Read failed on replica; retrying on primary:', err.message);
          return await this.primary.query(sql, params);
        } catch (err2) {
          throw err2;
        }
      } else {
        // Write failed on primary
        throw err;
      }
    }
  }

  async closeAll() {
    await this.primary.end();
    for (const r of this.replicas) await r.end();
  }
}

module.exports = DBCluster;
```

Usage example (reads and writes with failover):

```js
// usage-robust.js
require('dotenv').config();
const DBCluster = require('./replication-robust');

const primaryConfig = {
  user: process.env.PG_PRIMARY_USER,
  host: process.env.PG_PRIMARY_HOST,
  database: process.env.PG_PRIMARY_DATABASE,
  password: process.env.PG_PRIMARY_PASSWORD,
  port: 5432
};

const replicaConfigs = [
  { user: process.env.PG_REPLICA1_USER, host: process.env.PG_REPLICA1_HOST, database: process.env.PG_REPLICA1_DATABASE, password: process.env.PG_REPLICA1_PASSWORD, port: 5432 },
  { user: process.env.PG_REPLICA2_USER, host: process.env.PG_REPLICA2_HOST, database: process.env.PG_REPLICA2_DATABASE, password: process.env.PG_REPLICA2_PASSWORD, port: 5432 }
];

const cluster = new DBCluster(primaryConfig, replicaConfigs);

async function run() {
  const r = await cluster.query('SELECT * FROM orders WHERE id = $1', [123]);
  console.log('Order:', r.rows);

  const w = await cluster.query('INSERT INTO orders (id, amount) VALUES ($1, $2)', [999, 49.99]);
  console.log('Insert rows:', w.rowCount);

  await cluster.closeAll();
}

run().catch(console.error);
```

### Line-by-line explanation
- Line 1-7: Import Pool and define a DBCluster that holds a primary pool and an array of replica pools; initialize round-robin index.
- Line 9-11: isRead helper to distinguish reads (SELECT) from writes.
- Line 13-21: getReadPool chooses a replica in a round-robin fashion; if no replicas exist, the primary is used.
- Line 23-41: query executes on the chosen pool; on read failure, it attempts the primary as a fallback; on write failure it propagates the error.
- Line 43-46: closeAll gracefully shuts down all pools.
- Usage: setup configuration via environment variables; perform a read and an insert; close pools.
- Explanation: demonstrates safer read routing, explicit fallback to primary, and centralizes pool management for resilience.

## 3. Sharding Fundamentals: Horizontal Partitioning

Sharding distributes data across multiple databases to scale write throughput and storage independently. A simple approach uses a shard key and a hash function to map each key to a shard. Each shard can have its own primary and its own replicas.

```js
// shard-manager.js
const { Pool } = require('pg');

const SHARD_COUNT = 4;

// Example shard configs: replace with real hosts/databases in prod
const shardConfigs = [
  { name: 'shard0', primary: {/* config */}, replicas: [ {/* config */} ] },
  { name: 'shard1', primary: {/* config */}, replicas: [ {/* config */} ] },
  { name: 'shard2', primary: {/* config */}, replicas: [ {/* config */} ] },
  { name: 'shard3', primary: {/* config */}, replicas: [ {/* config */} ] },
];

// Simple string-to-number hash that maps a key to a shard index
function hashKeyToShard(key) {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % SHARD_COUNT;
  return h;
}

class Shard {
  constructor(primaryCfg, replicaCfgs = []) {
    this.primary = new Pool(primaryCfg);
    this.replicas = replicaCfgs.map(cfg => new Pool(cfg));
    this.rr = 0; // read replica round-robin
  }

  isRead(sql) {
    return sql.trim().toLowerCase().startsWith('select');
  }

  getReadPool() {
    if (this.replicas.length === 0) return this.primary;
    const pool = this.replicas[this.rr];
    this.rr = (this.rr + 1) % this.replicas.length;
    return pool;
  }

  async query(sql, params) {
    const read = this.isRead(sql);
    const pool = read ? this.getReadPool() : this.primary;
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (read) {
        // Fallback to primary if a replica fails
        try {
          return await this.primary.query(sql, params);
        } catch (err2) {
          throw err2;
        }
      }
      throw err;
    }
  }

  // Optional helper to move a row (for migrations)
  async copyRowTo(targetShard, sql, params) {
    // Implement as needed
  }

  async closeAll() {
    await this.primary.end();
    for (const r of this.replicas) await r.end();
  }
}

class ShardManager {
  constructor(allShardConfigs) {
    this.shards = allShardConfigs.map(cfg => new Shard(cfg.primary, cfg.replicas));
  }

  getShardForKey(key) {
    const idx = hashKeyToShard(key);
    return this.shards[idx];
  }

  async insert(key, sql, params) {
    const shard = this.getShardForKey(key);
    return shard.query(sql, params);
  }

  async read(key, sql, params) {
    const shard = this.getShardForKey(key);
    return shard.query(sql, params);
  }
}

// Example usage: configure with real connectivity details
// const manager = new ShardManager(shardConfigs);
// await manager.insert(user.id, 'INSERT INTO users (id, name) VALUES ($1, $2)', [user.id, user.name]);
```

### Line-by-line explanation
- Line 9-23: Define SHARD_COUNT and a placeholder shardConfigs array (fill with actual DB configs in a real app). hashKeyToShard maps a key to a shard index via a simple modular hash.
- Line 25-45: Shard class encapsulates a primary pool and replica pools; provides read/write routing with round-robin for reads, and a fallback to primary on replica failure.
- Line 47-58: ShardManager holds all shards and resolves a shard by key using hashKeyToShard; provides insert/read helpers scoped to the resolved shard.
- Line 60-66: Example usage hint to create a manager and perform inserts/reads by key.
- Explanation: demonstrates how to partition data horizontally so that each shard handles a portion of the data, enabling parallel writes and reads.

## 4. Bringing Replication and Sharding Together

In real systems, you often combine replication (for reads and availability) with sharding (for horizontal scale). Each shard can have its own primary and replicas. Writes go to the shard’s primary; reads go to its replicas. The routing logic stays local to the shard, but your overall application uses a ShardManager to determine the target shard by the shard key.

```js
// sharded-replication.js
// Minimal integration example: write to shard primary; read from shard replicas

class ShardedDB {
  constructor(shardManager) {
    this.shardManager = shardManager;
  }

  async insertUser(user) {
    // Use user.id as shard key
    return this.shardManager.insert(user.id, 'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)', [user.id, user.name, user.email]);
  }

  async getUser(userId) {
    const res = await this.shardManager.read(userId, 'SELECT id, name, email FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  }

  async updateUser(user) {
    return this.shardManager.read(user.id, 'UPDATE users SET name = $1, email = $2 WHERE id = $3', [user.name, user.email, user.id]);
  }
}
```

Usage sketch:

```js
// setup (pseudo-config; replace with real data)
const manager = new ShardManager(shardConfigs);
const db = new ShardedDB(manager);

async function demo() {
  await db.insertUser({ id: 'u-123', name: 'Alex', email: 'alex@example.com' });
  const user = await db.getUser('u-123');
  console.log('Fetched user:', user);
}
```

### Line-by-line explanation
- Line 1-5: ShardedDB class ties a ShardManager to high-level operations for users. It provides a simple API: insertUser, getUser, updateUser.
- Line 7-12: insertUser routes the insert to the correct shard using the user’s id as the shard key.
- Line 14-17: getUser reads from the shard via the shard key; updateUser writes to the shard’s primary (note: depending on your needs, you might implement read-before-write checks or transactions across shards, which get complex).
- Line 20-26: Usage example demonstrates creating the ShardedDB instance and performing typical operations.
- Explanation: demonstrates composing replication and sharding to achieve scalable, fault-tolerant data access: per-shard primaries handle writes (with replicas for reads), while the outer layer dispatches requests to the correct shard.

## 5. Data Migration & Rebalancing (Re-sharding) in Production

As data grows, you’ll add shards and move data between shards (rebalancing). This is a delicate, long-running task requiring careful cutover, backfill, and consistency guarantees. A typical approach is to copy data in chunks, mark migrated rows, and gradually switch reads/writes to the new shard.

```js
// migrate.js (conceptual - adapt to your codebase)
async function migrateDataAcrossShards(sourceShard, targetShard) {
  // Example: migrate all users created before a timestamp
  const chunkSize = 100;
  let offset = 0;

  while (true) {
    const res = await sourceShard.query(
      'SELECT id, name, email FROM users WHERE created_at < NOW() - INTERVAL \'1 day\' ORDER BY id LIMIT $1 OFFSET $2',
      [chunkSize, offset]
    );

    if (res.rows.length === 0) break;

    for (const row of res.rows) {
      await targetShard.query(
        'INSERT INTO users (id, name, email, migrated_from) VALUES ($1, $2, $3, $4)',
        [row.id, row.name, row.email, sourceShard.name]
      );
      // Optional: mark as migrated or delete from source
      // await sourceShard.query('DELETE FROM users WHERE id = $1', [row.id]);
    }

    offset += chunkSize;
  }
}
```

Line-by-line explanation:
- This function demonstrates a chunked migration between a sourceShard and a targetShard.
- It queries a chunk of rows from the source shard, inserts them into the target shard, and can optionally delete from the source to reclaim space.
- Chunking reduces lock contention and allows the system to keep serving traffic with incremental progress.
- In production, you’d coordinate migrations with feature flags, replication lag considerations, and a rollback plan.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Mistake 1: Treating replication as automatic scaling without reads routing
  - Bad:
    ```js
    // Assume reads are automatically scaled by replication
    const res = await pool.query('SELECT * FROM users'); // always uses the same pool
    ```
  - Good:
    ```js
    // Route reads to replicas; writes to primary
    const res = await dbCluster.query('SELECT * FROM users');
    ```
  - Why it matters: Without explicit read routing, you may hit the primary for reads, increasing latency and reducing the benefit of replicas.

- Mistake 2: No failover or retry logic for replicas
  - Bad:
    ```js
    // Read strictly from one replica; no fallback
    const res = await replica1.query('SELECT ...');
    ```
  - Good:
    ```js
    // Read from replicas with fallback to primary on error
    try { return await replica.query(...); } catch { return await primary.query(...); }
    ```
  - Why it matters: Replica outages should not degrade user experience; graceful fallback improves availability.

- Mistake 3: Poor shard key design -> hotspots
  - Bad:
    ```js
    function shardForKey(key) { return key % 4; } // numeric keys with skew
    ```
  - Good:
    ```js
    // Use robust hash and consider re-probing for hot keys
    function shardForKey(key) {
      const h = murmurHash(String(key)); // or use a library
      return h % SHARD_COUNT;
    }
    ```
  - Why it matters: Skewed shards create hotspots, saturating a single shard and causing bottlenecks.

- Mistake 4: No plan for re-sharding / rebalancing
  - Bad:
    ```js
    // Hard-coded shard map; no growth path
    const shards = [/* 4 shards */];
    ```
  - Good:
    ```js
    // Plan for dynamic shard provisioning and data rebalancing with incremental backfill
    // Include metadata store tracking shard ownership and migration progress
    ```
  - Why it matters: Systems must grow; without a strategy, scaling stalls.

- Mistake 5: Ignoring replication lag when reading across replicas
  - Bad:
    ```js
    // Read fresh data directly from replicas, assuming zero lag
    const row = await replica.query('SELECT * FROM users WHERE id = $1', [id]);
    ```
  - Good:
    ```js
    // Consider read-your-own-writes or version checks; tolerate eventual consistency for certain ops
    const row = await replica.query('SELECT * FROM users WHERE id = $1', [id]);
    // Or perform a follow-up check on the primary if strict freshness is required
    ```
  - Why it matters: Replicas lag behind primaries; some apps require certain consistency guarantees.

## Y. Why This Matters In Real Systems

- Performance and latency: Reads can be served from replicas in parallel with writes to the primary, significantly reducing latency for read-heavy workloads.
- Availability and fault tolerance: Replication provides failover capabilities; if a replica fails, another can handle reads, and the primary can take on writes even when a replica is down.
- Scalability: Sharding distributes data and load horizontally; you can add shards to handle growth without over-provisioning a single instance.
- Operational complexity: Routing logic, hash/shard maps, migration plans, and monitoring become critical. You’ll typically use tooling like connection proxies (e.g., PgBouncer), managed replication solutions, or internal routing services to simplify this.
- Data consistency: Synchronous vs asynchronous replication affects how fresh reads are. In many systems, reads are eventually consistent, so you must design idempotent operations and conflict resolution where applicable.
- Observability: Track replication lag, per-shard throughput, hot shard metrics, and migration progress; build dashboards and alerting around latency, error rates, and lag.

## Z. Study Questions — 5 Recall Questions

1. What is the difference between master/primary and read replicas in a replicated database setup?
2. How does round-robin read routing help balance load across replicas, and what are its trade-offs?
3. Explain how hash-based sharding maps a key to a shard. What are potential pitfalls?
4. Why might you need to perform data migration (re-sharding), and what are safe patterns to do so?
5. What are “synchronous” vs “asynchronous” replication, and how do they affect read freshness and write durability?

## Exercise — Practical Multi-Part Coding Challenge

Part A: Build a replication-aware DB client in Node.js
- Create a module that exports a class ReplicationCluster (or reuse the pattern from Section 1) with:
  - Primary write path
  - Multiple read replicas with round-robin selection
  - Safe fallback from replica to primary on read failures
- Deliverables:
  - replication-cluster.js (as shown in Section 1)
  - usage-example.js demonstrating a read and a write path against real PostgreSQL instances or a locally mocked DB

Part B: Extend to Sharding with per-shard replication
- Create a module shard-manager.js that:
  - Splits data across SHARD_COUNT shards using a hash function
  - Each shard has its own primary and replicas (mocked or real)
  - Exposes insert(key, sql, params) and read(key, sql, params) that route to the correct shard and use write/read semantics
- Deliverables:
  - shard-manager.js (as shown in Section 3)
  - example-config.js that defines 4 shards with placeholder configs
  - usage example demonstrating insert and read by key

Part C: A small end-to-end demo
- Create demo.js that wires:
  - A ShardManager with 4 shards
  - A ShardedDB wrapper (Section 4) to insert and fetch a user
- The demo should:
  - Insert a user with a known id
  - Read the user back, showing it is fetched from the correct shard
  - Update the user and confirm the write path uses the shard primary
- Deliverables:
  - demo.js that runs the end-to-end flow
  - README with steps to run (including env vars or mock setup)

Notes for the exercise
- You can run against real PostgreSQL instances or use a local mocking strategy for the database calls (e.g., implement a simple in-memory proxy that pretends to be a database).
- If you use real PostgreSQL, ensure you configure separate hosts/ports for primary and replicas per shard.
- Emphasize clean separation of concerns: replication routing logic lives in a cluster-level component; shard routing lives in a shard manager; business logic calls the high-level API (insert/read) without needing to know the underlying topology.

This lesson provides a practical, hands-on understanding of how to design and implement replication and sharding in Node.js-backed systems. You’ll learn not only the patterns but also the pitfalls, trade-offs, and real-world considerations essential for production-grade database scalability.