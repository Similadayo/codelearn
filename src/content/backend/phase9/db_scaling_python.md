# Database Scaling — Replication & Sharding

Database scaling is essential for meeting the demand of modern backend systems. Replication and sharding are two foundational techniques that let you scale reads and writes, improve availability, and reduce latency. In Python-backed systems, you’ll typically route writes to a primary node (master) and reads to one or more replicas, while horizontally partitioning data across shards. This lesson walks you through the concepts, practical Python patterns, and how to reason about consistency and operational concerns in real systems.

## 1. Replication Patterns and Consistency

Replication involves maintaining copies of data on multiple nodes. Typical patterns include asynchronous replication (replicas lag behind the primary) and synchronous replication (replicas must acknowledge writes). Understanding lag, failover, and recovery is critical for building robust backends.

```python
# replication_router.py

from typing import List
import threading

class DBNode:
    def __init__(self, dsn: str, role: str):
        self.dsn = dsn
        self.role = role  # 'primary' or 'replica'
        self.conn = None  # Placeholder for a real DB connection

    def connect(self):
        # In a real system, you would do: psycopg2.connect(self.dsn) or similar
        # Here, we simulate a connection being established.
        self.conn = f"Connection({self.dsn})"

    def close(self):
        self.conn = None

    def is_connected(self) -> bool:
        return self.conn is not None

    def execute(self, query: str, params=None):
        # This is a simplified mock. In reality you'd use a DB driver.
        if not self.is_connected():
            self.connect()
        # Simulated behavior: for reads, return fake data; for writes, return success.
        q = query.strip().lower()
        if q.startswith("select"):
            return [("row1", 1), ("row2", 2)]
        else:
            return None


class ReplicationRouter:
    def __init__(self, primary_dsn: str, replica_dsns: List[str]):
        self.primary = DBNode(primary_dsn, "primary")
        self.replicas = [DBNode(dsn, "replica") for dsn in replica_dsns]
        self._rr_index = 0
        self._lock = threading.Lock()

    def _is_read_query(self, query: str) -> bool:
        q = query.strip().lower()
        # Simple heuristic: SELECT and with are treated as reads
        return q.startswith("select") or q.startswith("with")

    def _get_read_connection(self) -> DBNode:
        with self._lock:
            if not self.replicas:
                return self.primary
            node = self.replicas[self._rr_index % len(self.replicas)]
            self._rr_index += 1
            return node

    def _get_write_connection(self) -> DBNode:
        return self.primary

    def execute(self, query: str, params=None):
        conn = self._get_read_connection() if self._is_read_query(query) else self._get_write_connection()
        return conn.execute(query, params)


# Example usage (DSNs are illustrative)
if __name__ == "__main__":
    primary_dsn = "dbname=mydb user=appuser host=primaryhost port=5432"
    replica_dsns = [
        "dbname=mydb user=appuser host=replica1 port=5432",
        "dbname=mydb user=appuser host=replica2 port=5432",
    ]
    router = ReplicationRouter(primary_dsn, replica_dsns)

    # Read goes to replicas (round-robin)
    print("Read result:", router.execute("SELECT * FROM users WHERE id = %s", (123,)))
    print("Read result:", router.execute("SELECT * FROM products"))

    # Write goes to primary
    router.execute("INSERT INTO users (name) VALUES (%s)", ("Alice",))
```

### Line-by-line explanation
- Line 1-2: Import typing.List and threading to manage a simple connection pool/RR index.
- Lines 4-13: Define DBNode as a lightweight wrapper around a DB connection. It stores a DSN, a role, and a placeholder connection. connect() simulates establishing a connection; close() clears it.
- Lines 15-29: Define ReplicationRouter, which holds one primary and multiple replicas. It uses a lock to safely rotate through replicas for read queries.
- Lines 31-35: _is_read_query determines if a query is a read, using a simple heuristic (SELECT/WITH).
- Lines 37-41: _get_read_connection selects the next replica in round-robin fashion; falls back to primary if no replicas exist.
- Lines 43-44: _get_write_connection always returns the primary node.
- Lines 46-49: execute() routes the query to either a read replica or the primary based on the heuristic, then executes.
- Lines 52-66: Example usage with illustrative DSNs; demonstrates a read (to replica) and a write (to primary).

## 2. Read/Write Splitting in Python Applications

Read/Write splitting is the core of leveraging replication in apps: ensure that most reads go to replicas while writes go to the primary. This section shows a focused, self-contained implementation pattern that can be adapted to your codebase without deep coupling to your ORM.

```python
# read_write_split_sample.py

import random
from typing import List

class DB:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.conn = None

    def connect(self):
        # In a real system, open a DB connection (e.g., psycopg2.connect)
        self.conn = f"Connection({self.dsn})"

    def execute(self, query: str, params=None):
        if self.conn is None:
            self.connect()
        # Placeholder behavior: simulate a result set for SELECT, no result for writes
        q = query.strip().lower()
        if q.startswith("select"):
            return [("row", i) for i in range(1, 4)]
        else:
            # Simulate a write by returning nothing but performing a "side effect"
            return None


class ReadWriteRouter:
    def __init__(self, primary_dsn: str, replica_dsns: List[str]):
        self.primary = DB(primary_dsn)
        self.replicas = [DB(dsn) for dsn in replica_dsns]
        self._rr = 0

    def _is_read(self, query: str) -> bool:
        return query.strip().lower().startswith("select")

    def _choose_connection(self, query: str) -> DB:
        if self._is_read(query) and self.replicas:
            # Round-robin among replicas
            conn = self.replicas[self._rr % len(self.replicas)]
            self._rr += 1
            return conn
        else:
            return self.primary

    def execute(self, query: str, params=None):
        conn = self._choose_connection(query)
        return conn.execute(query, params)


# Example usage
if __name__ == "__main__":
    primary_dsn = "dbname=mydb user=appuser host=primary"
    replica_dsns = [
        "dbname=mydb user=appuser host=replica1",
        "dbname=mydb user=appuser host=replica2",
    ]
    router = ReadWriteRouter(primary_dsn, replica_dsns)

    print("Read from replicas (potential lag):", router.execute("SELECT * FROM orders"))
    print("Write to primary:", router.execute("UPDATE orders SET status=%s WHERE id=%s", ("SHIPPED", 101)))
```

### Line-by-line explanation
- Line 1-4: Import random and typing.List for structural clarity.
- Lines 6-15: Define a minimal DB wrapper class with DSN, a lazy connection, and a simple execute method that returns a synthetic result for reads.
- Lines 18-28: Define ReadWriteRouter to hold a primary and a list of replicas, plus a round-robin index for replicas.
- Lines 30-32: _is_read() detects read operations by a simple prefix check.
- Lines 34-41: _choose_connection() selects a replica in round-robin fashion for reads when available; otherwise uses the primary.
- Lines 43-46: execute() routes the query to the chosen DB wrapper.
- Lines 50-66: Example usage demonstrating a read and a write path with illustrative DSNs.

## 3. Sharding Concepts and Key Choices

Sharding partitions data horizontally to achieve linear scalability. The most common shard key choices are user_id, account_id, or other high-cardinality attributes. This section demonstrates a straightforward modulo-based shard strategy and how to map keys to shards in Python.

```python
# sharding_strategy.py

from typing import List

NUM_SHARDS = 4

def shard_id_for_key(key) -> int:
    # Ensure stable positive hash and modulo by number of shards
    return abs(hash(key)) % NUM_SHARDS


class ShardRouter:
    def __init__(self, shard_dsns: List[str]):
        # Each shard has its own primary/replica setup; for simplicity, we treat each as a single "DB" connection
        self.shards = [{
            "name": f"shard_{i}",
            "dsns": dsns
        } for i, dsns in enumerate(shard_dsns)]
        # For simplicity, we reuse a same-style ReplicationRouter across shards if dsns provided
        self._routers = []
        for shard in self.shards:
            primary = shard["dsns"][0]
            replicas = shard["dsns"][1:] if len(shard["dsns"]) > 1 else []
            # Lazy router creation to avoid requiring actual DB connections in this example
            self._routers.append((shard["name"], primary, replicas))

    def get_router_by_key(self, key):
        shard_index = shard_id_for_key(key)
        shard_name, primary, replicas = self._routers[shard_index]
        # In a real system you would instantiate and reuse a ReplicationRouter per shard
        return {
            "shard": shard_name,
            "primary": primary,
            "replicas": replicas
        }

    def describe_mapping(self, key) -> str:
        return f"Key '{key}' maps to {self.get_router_by_key(key)['shard']}"


# Example usage
if __name__ == "__main__":
    shard_config = [
        ["db_shard0_primary", "db_shard0_replica1", "db_shard0_replica2"],
        ["db_shard1_primary", "db_shard1_replica1", "db_shard1_replica2"],
        ["db_shard2_primary", "db_shard2_replica1", "db_shard2_replica2"],
        ["db_shard3_primary", "db_shard3_replica1", "db_shard3_replica2"],
    ]
    router = ShardRouter(shard_config)
    key = "user:12345"
    print(router.describe_mapping(key))
    print("Router for key:", router.get_router_by_key(key))
```

### Line-by-line explanation
- Line 1-2: Import List for typing and set NUM_SHARDS = 4 as the shard count.
- Lines 4-7: shard_id_for_key computes a stable shard index using a Python hash modulo the number of shards.
- Lines 9-19: ShardRouter initializes per-shard routing information. In a real system you’d instantiate per-shard replication routers; here we store placeholder data.
- Lines 21-25: get_router_by_key uses shard_id_for_key to select the shard and returns a dictionary with shard metadata.
- Lines 27-29: describe_mapping provides a readable mapping for debugging or testing.
- Lines 32-42: Example usage sets up a 4-shard configuration and prints the shard for a given key.

## 4. End-to-End: Sharded Replication Router

Putting replication and sharding together lets you scale both reads and writes across many partitions. This example sketches an end-to-end pattern: route by shard, then use per-shard replication routing for read/write within that shard.

```python
# sharded_replication_router.py

from typing import List

# Reuse the minimal replication router interface from section 1
class MockReplicationRouter:
    def __init__(self, primary_dsn: str, replica_dsns: List[str]):
        self.primary = {"dsn": primary_dsn, "role": "primary"}
        self.replicas = [{"dsn": dsn, "role": "replica"} for dsn in replica_dsns]
        self.rr = 0

    def execute(self, query: str, params=None):
        q = query.strip().lower()
        if q.startswith("select") and self.replicas:
            target = self.replicas[self.rr % len(self.replicas)]
            self.rr += 1
            return f"READ on {target['dsn']}"
        else:
            return f"WRITE on {self.primary['dsn']}"

class ShardedReplicationRouter:
    def __init__(self, shard_configs: List[dict]):
        # Each shard_config should contain primary and replicas DSNs
        self.shards = []
        for cfg in shard_configs:
            self.shards.append(MockReplicationRouter(cfg["primary"], cfg.get("replicas", [])))

    def _hash_key(self, key) -> int:
        return abs(hash(key))

    def _get_shard_index(self, key) -> int:
        return self._hash_key(key) % len(self.shards)

    def execute(self, key, query, params=None):
        shard_idx = self._get_shard_index(key)
        router = self.shards[shard_idx]
        return router.execute(query, params)


# Example usage
if __name__ == "__main__":
    shard_configs = [
        {"primary": "db_shard0_primary", "replicas": ["db_shard0_replica1", "db_shard0_replica2"]},
        {"primary": "db_shard1_primary", "replicas": ["db_shard1_replica1", "db_shard1_replica2"]},
        {"primary": "db_shard2_primary", "replicas": ["db_shard2_replica1", "db_shard2_replica2"]},
        {"primary": "db_shard3_primary", "replicas": ["db_shard3_replica1", "db_shard3_replica2"]},
    ]
    router = ShardedReplicationRouter(shard_configs)

    key = "user:98765"
    print(router.execute(key, "SELECT * FROM users WHERE id=%s", (98765,)))
    print(router.execute(key, "UPDATE users SET last_seen=NOW() WHERE id=%s", (98765,)))
```

### Line-by-line explanation
- Lines 4-15: Define a lightweight MockReplicationRouter to illustrate per-shard replication decisions. Reads go to replicas when available; writes go to primary.
- Lines 17-28: Define ShardedReplicationRouter that holds one MockReplicationRouter per shard. It uses a hash-based shard function to pick the correct shard for a given key.
- Lines 30-35: _hash_key returns a stable integer for the given key.
- Lines 37-41: _get_shard_index maps a key to a shard index.
- Lines 43-48: execute delegates the query to the selected shard’s replication router.
- Lines 52-66: Example usage sets up four shards and demonstrates a read and a write routed via the appropriate shard.

## 5. Operational Considerations: Config, Retries, and Observability

Implementing replication and sharding is not just about routing queries; you must handle failures, transient latency, and observability.

- Connection pools and timeouts: Use pooled connections (e.g., psycopg2 pool, SQLAlchemy pool) to reduce connection churn and cap resource usage.
- Retries with backoff: Implement idempotent-friendly retries for transient failures. Use exponential backoff with jitter to avoid thundering herds.
- Replication lag handling: Detect lag and route read-after-write queries to the primary for a short window if strong consistency is required.
- Failure handling and failover: Build automated health checks and promote a replica to primary when the current primary fails, with a clear promotion protocol.
- Observability: Track per-shard latency, replication lag, replica health, and hot shards. Emit metrics to dashboards and alerting systems.

Example retry utility (no external dependencies):

```python
# retry_policy.py

import time
import random
from typing import Callable, Type, Tuple

def retry_on_exception(exceptions: Tuple[Type[BaseException], ...], max_retries: int = 3, initial_delay: float = 0.1, max_delay: float = 2.0):
    def decorator(fn: Callable):
        def wrapper(*args, **kwargs):
            delay = initial_delay
            attempt = 0
            while True:
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt > max_retries:
                        raise
                    # Add jitter to avoid synchronized retries
                    sleep_time = min(delay * (2 ** (attempt - 1)), max_delay)
                    sleep_time = sleep_time * (0.5 + random.random() * 0.5)
                    time.sleep(sleep_time)
        return wrapper
    return decorator
```

### Line-by-line explanation
- Lines 1-3: Import time, random and typing utilities for the retry decorator.
- Lines 5-14: Define retry_on_exception, a decorator factory that takes exception types and retry configuration.
- Lines 7-13: The inner wrapper tries to execute the function, catching specified exceptions and retrying with exponential backoff and jitter; raises after exhausting retries.
- Lines 15-24: Example usage would decorate a dangerous database operation to automatically retry on transient failures.

## X. Common Beginner Mistakes

- Bad vs Good: Read/write routing without clear policy
  - Bad:
    ```python
    def route(query):
        if "select" in query.lower():
            return "replica"
        return "primary"
    ```
    Why it’s bad: It mistakes substring matching for robust detection. Also uses a naive heuristic that can misroute complex queries (e.g., stored procedures, SELECT FOR UPDATE).
  - Good:
    ```python
    def is_read_query(query: str) -> bool:
        q = query.strip().lower()
        return q.startswith("select") or q.startswith("with") or q.startswith("show")
    
    def route(query, router):
        if is_read_query(query):
            return router.read_replicas()[0]  # choose a replica deterministically or round-robin
        return router.primary()
    ```

- Bad vs Good: Not handling replication lag in reads
  - Bad:
    ```python
    # Immediately read after write without considering lag
    router.execute("UPDATE users SET last_seen = NOW() WHERE id = 1")
    rows = router.execute("SELECT * FROM users WHERE id = 1")
    ```
  - Good:
    ```python
    # Read-after-write policy with a short consistency window
    router.execute("UPDATE users SET last_seen = NOW() WHERE id = 1")
    # Optional: force read from primary for strong consistency during critical ops
    rows = router.execute("SELECT * FROM users WHERE id = 1", force_primary=True)
    ```
    Note: Your router would need a consistency policy flag and appropriate routing logic.

- Bad vs Good: Not using connection pools
  - Bad:
    ```python
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("SELECT ...")
    cur.close()
    conn.close()
    ```
  - Good:
    ```python
    from psycopg2 import pool
    po = pool.SimpleConnectionPool(minconn=1, maxconn=10, dsn=DSN)
    conn = po.getconn()
    with conn.cursor() as cur:
        cur.execute("SELECT ...")
    po.putconn(conn)
    ```
    Benefits: reuse connections, avoid connection storms, and improve throughput.

- Bad vs Good: Ignoring operational metrics
  - Bad:
    No metrics collection; assume “works” if there are no exceptions.
  - Good:
    Instrument per-shard latency, replication lag, error rates, and queueing. Emit to dashboards and alert on anomalies.

## Y. Why This Matters In Real Systems

- Availability and latency: Replication and sharding let you scale horizontally, reduce hot spots, and improve read throughput, directly impacting user-facing latency and system resilience.
- Data locality and compliance: Sharding by user/account can align with data governance requirements (e.g., data residency per region) and can reduce cross-region traffic.
- Consistency trade-offs: Strong consistency often requires reads from primary or explicit synchronization windows. Eventual consistency improves throughput but complicates correctness guarantees for clients.
- Operational complexity: You’ll need monitoring, automatic failover, backups per shard, and robust tooling for schema changes across shards and replicas.

## Z. Study Questions

1. What is the primary difference between replication lag and synchronous replication? How do they affect read-after-write behavior?
2. In a read/write-splitting router, how would you implement a fallback when all replicas are unreachable?
3. How does a modulo-based shard key mapping work, and what are its potential drawbacks compared to a consistent hashing approach?
4. Why is it important to use connection pools in a replicated/sharded setup, and what problems might you encounter if you don’t?
5. Describe a simple strategy for handling a schema change that must be applied across all shards and replicas.

## Exercise

Multi-part practical coding challenge to reinforce replication and sharding concepts.

Part A — Implement a simple multi-shard router with replication queues (in-memory proxy)
- Create a Python module that:
  - Represents N shards (e.g., 3 shards) with one primary and two replicas per shard (in-memory stubs; no real DBs required).
  - Uses a hash-based key mapping to assign a logical key to a shard.
  - For each shard, implements a lightweight replication router with a primary and two replica “stores” that simulate latency (e.g., using time.sleep to emulate lag).
  - Expose an API: route_write(key, sql, params) and route_read(key, sql, params) that dispatch to the appropriate shard and within shard to primary/replicas using a round-robin pattern for reads.
- Implement a basic consistency policy parameter (e.g., strong vs eventual) to illustrate how policy affects routing decisions.

Part B — Demonstrate read-after-write semantics under lag
- Simulate a write to key K and then immediately perform a read for the same key with two scenarios:
  - Strong consistency: route the read to the primary (or ensure primary visibility) for a short window.
  - Eventual consistency: route the read to a replica and show the read lag effect by printing a timestamp or simulated delay.
- Validate that the results reflect the chosen policy.

Part C — Add a basic health check and auto-failover stub
- Extend your shard router to track artificial health indicators for each shard.
- If a shard’s primary becomes unhealthy, simulate a failover by promoting a replica to primary and re-routing writes to this new primary.

Part D — Observability and metrics
- Instrument at least three metrics per shard: read_latency_ms, write_latency_ms, and replication_lag_ms.
- Print a small summary after a sequence of operations to demonstrate visibility.

Deliverable:
- A single repository with:
  - shard_router.py implementing the architecture and API.
  - tests or a simple script demonstrating Part A through Part D usage.
  - A short README describing how to run the demonstration and what each part validates.

Note: This exercise emphasizes architecture, routing logic, and conceptual correctness. It does not require a real database. The goal is to simulate the behavior of a replicated, sharded backend to reason about design tradeoffs, latency, and consistency in production systems.