# Track: Backend Engineering — Phase 9: System Design & Scalability — Database Scaling: Replication & Sharding (Ruby)

Compelling introductory paragraph
Database scaling is a fundamental challenge in building reliable, high-traffic services. Replication provides read throughput, lowers latency for geographically distributed users, and improves availability by having replicas ready to serve when the primary is congested or down. Sharding splits data across multiple databases to push write throughput and storage beyond a single instance. In Ruby environments, you can implement these patterns with libraries like Sequel or ActiveRecord, and design pragmatic routing, consistency, and failover strategies. This lesson walks through practical Ruby examples, common patterns, and the tradeoffs you’ll encounter in real systems.

## 1. Replication Basics and Active/Passive Setup
Replication introduces a primary (master) that handles writes and one or more replicas (slaves) that serve reads. The typical tradeoffs are stronger consistency for writes and eventual consistency for reads from replicas, plus potential replication lag. In production, you’ll also plan for failover, promotion of a replica to primary, and monitoring lag.

```ruby
# replication_example.rb
require 'sequel'

# In a real environment, these would come from your config/secrets.
MASTER_URL   = ENV['DB_MASTER_URL']   || 'postgres://user:pass@localhost/master'
REPLICA_URL  = ENV['DB_REPLICA_URL']  || 'postgres://user:pass@localhost/replica'

MASTER  = Sequel.connect(MASTER_URL)
REPLICA = Sequel.connect(REPLICA_URL)

# Ensure a simple users table exists on the master
MASTER.run <<-SQL
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
SQL

# WRITE: Do all writes against the MASTER
MASTER[:users].insert(name: 'Alice', email: 'alice@example.com')

# READ: Do reads against the REPLICA
row = REPLICA[:users].where(name: 'Alice').first
puts "Read from replica: #{row.inspect}"
```

### Line-by-line explanation
- require 'sequel' loads the Sequel library for database access.  
- MASTER_URL and REPLICA_URL store connection strings for the primary and replica; in production these come from env vars.  
- MASTER = Sequel.connect(...) creates a Sequel connection to the master database.  
- REPLICA = Sequel.connect(...) creates a Sequel connection to the replica database.  
- MASTER.run ... creates the users table on the master if it doesn’t exist.  
- MASTER[:users].insert(...) writes a record to the master, which is the source of truth.  
- REPLICA[:users].where(...).first reads from the replica. This demonstrates the basic write-to-primary, read-from-replica pattern.  
- puts ... prints the result to verify the read path.

## 2. Read Routing and Consistency Models
Read routing decides whether to query replicas or the primary. Common models include eventual consistency (reads may lag behind writes) and read-after-write consistency (guaranteed visibility after a write in a short window). In Ruby with Sequel, you can implement a lightweight routing helper to prefer replicas for reads but fall back to the master if needed.

```ruby
# replication_routing.rb
def read_user_by_name(name)
  user = REPLICA[:users].where(name: name).first
  if user
    user
  else
    # Fallback to master if replica is behind or unavailable
    MASTER[:users].where(name: name).first
  end
end

# A simple write followed by read example to illustrate read-after-write
def create_and_read(name, email)
  MASTER[:users].insert(name: name, email: email)
  # In a real system, you might wait or poll for replication lag to fall below a threshold.
  REPLICA[:users].where(name: name).first || MASTER[:users].where(name: name).first
end
```

### Line-by-line explanation
- read_user_by_name queries the replica first for a user by name.  
- If the replica doesn’t have the row (lag or outage), it falls back to querying the master to ensure availability.  
- create_and_read demonstrates a common pattern: write to master and then read, acknowledging possible short-lived replica lag.  
- The comments explain practical behavior and the need for lag-aware strategies in real deployments.

## 3. Sharding Fundamentals: Horizontal Partitioning
Sharding distributes data across multiple databases to scale writes and storage. The core ideas are choosing a shard key, mapping keys to shards, and performing reads/writes on the correct shard. Common strategies include modulo-based hashing, consistent hashing, and range-based partitioning. In this section we illustrate a simple modulo-based shard mapping using Sequel.

```ruby
# sharding_basics.rb
require 'sequel'

SHARD_0 = Sequel.connect(ENV['SHARD_0_URL'] || 'postgres://user:pass@localhost/shard0')
SHARD_1 = Sequel.connect(ENV['SHARD_1_URL'] || 'postgres://user:pass@localhost/shard1')

SHARDS = [SHARD_0, SHARD_1].freeze

def shard_for_id(id)
  id.to_i.abs % SHARDS.size
end

def shard_db_for_id(id)
  SHARDS[shard_for_id(id)]
end

def insert_user(id:, name:, email:)
  shard_db_for_id(id)[:users].insert(id: id, name: name, email: email)
end

def find_user(id)
  shard_db_for_id(id)[:users].where(id: id).first
end
```

### Line-by-line explanation
- require 'sequel' loads the Sequel library.  
- SHARD_0 and SHARD_1 establish connections to two separate shard databases.  
- SHARDS freezes an array of shard connections for safe constant access.  
- shard_for_id computes a shard index by taking the absolute value of the id, then modulo by the number of shards.  
- shard_db_for_id selects the correct Sequel DB connection based on the shard index.  
- insert_user writes a user row to the determined shard’s users table.  
- find_user reads a user by id from the same shard, ensuring locality.

## 4. Implementing Sharding in Ruby: Hash-based Routing and Multi-DB Connections
This section builds a small, end-to-end sharding helper that routes both reads and writes to the appropriate shard and demonstrates a basic cross-shard read pattern. It also highlights the complexities around cross-shard operations and potential denormalization.

```ruby
# shard_router.rb
require 'sequel'

MASTER_URLS = [
  ENV['SHARD_0_URL'] || 'postgres://user:pass@localhost/shard0',
  ENV['SHARD_1_URL'] || 'postgres://user:pass@localhost/shard1'
]

SHARDS = MASTER_URLS.map { |u| Sequel.connect(u) }.freeze

# Simple hash-based router (can be extended with Consistent Hashing)
def shard_for_key(key)
  key.to_s.hash.abs % SHARDS.size
end

def db_for_key(key)
  SHARDS[shard_for_key(key)]
end

def insert(table, data)
  db_for_key(data[:id]).from(table).insert(data)
end

def find(table, id)
  db_for_key(id).from(table).where(id: id).first
end

# Usage example
insert(:users, id: 101, name: 'Charlie', email: 'charlie@example.com')
puts find(:users, 101).inspect
```

### Line-by-line explanation
- Require Sequel to access database connections.  
- MASTER_URLS holds the URLs for all shards (shard0, shard1). In production, these come from environment config.  
- SHARDS builds an array of Sequel database connections, one per shard, and freezes it for safety.  
- shard_for_key computes a shard index from the given key using a simple hash-based approach.  
- db_for_key selects the correct Sequel connection from SHARDS for the key.  
- insert writes the provided data to the indicated table on the correct shard.  
- find reads a row by id from the shard responsible for that id.  
- The usage example demonstrates a write followed by a read, both routed through the shard router.

### Line-by-line explanation (cross-reference)
- This file shows how to scale horizontally by routing both reads and writes to the appropriate shard, enabling distributed storage while keeping code paths simple and testable.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Mistake: Treating replicas as writable targets
- Bad
```ruby
# Bad: writing to replica
REPLICA[:users].insert(name: 'Eve', email: 'eve@example.com')
```
- Good
```ruby
# Good: write goes to master
MASTER[:users].insert(name: 'Eve', email: 'eve@example.com')
```

2) Mistake: Assuming modulo-based hashing is always enough and not planning for rebalancing
- Bad
```ruby
# Bad: fixed modulo routing with 2 shards
def shard_for_id(id)
  id.to_i % 2
end
```
- Good
```ruby
# Good: prepare for rebalancing with a simple (extensible) routing approach
SHARDS = [ 'shard0', 'shard1', 'shard2' ]
def shard_for_id(id)
  # A simple step toward a more robust approach; consider consistent hashing or a dynamic shard map
  id.to_i.abs % SHARDS.size
end
```

3) Mistake: Cross-shard joins and foreign-key constraints
- Bad
```ruby
# Bad: attempt a cross-shard join
dbs = SHARDS.map { |s| s.from(:users) }
dbs[0].join(dbs[1], user_id: :id).where('users.id = 1')
```
- Good
```ruby
# Good: avoid cross-shard joins; fetch locally and then assemble data in memory or via denormalization
users = SHARDS[0].from(:users).where(id: 1).all
orders = SHARDS[1].from(:orders).where(user_id: users.map { |u| u[:id] }).all
```

4) Mistake: Not accounting for replication lag in reads after writes
- Bad
```ruby
# Bad: immediately reading from replica after a write without lag awareness
MASTER[:accounts].insert(user_id: 42, balance: 100)
balance = REPLICA[:accounts].where(user_id: 42).first[:balance]
```
- Good
```ruby
# Good: implement a lag-aware read path (simplified)
def read_balance_after_write(user_id, max_lag_seconds: 2)
  if replica_lag_seconds <= max_lag_seconds
    REPLICA[:accounts].where(user_id: user_id).first
  else
    MASTER[:accounts].where(user_id: user_id).first
  end
end
```

Note: replica_lag_seconds is a conceptual placeholder; in real systems you’d monitor actual replication lag and implement a robust read-after-write policy.

## Y. Why This Matters In Real Systems — production context and real usage
- Availability and latency: Replication lets you serve reads from geographically closer replicas, reducing latency and keeping the primary free for writes and critical operations.
- Scalability: Sharding distributes data volume and write load, enabling systems to scale beyond a single database’s limits. It also isolates hot data, reducing contention.
- Tradeoffs: Consistency models (strong vs eventual), write amplification due to cross-shard operations, and the complexity of migrations or re-sharding are real engineering concerns.
- Operational considerations: Monitoring replication lag, failover automation (promotion of a replica), shard health checks, schema migrations across shards, and backup strategies all require careful planning.
- Practical patterns: Use read replicas for heavy-read workloads, apply a well-defined shard key strategy, prefer denormalization or application-side joins for cross-shard data, and implement robust monitoring and alerting for lag, replication delay, and shard availability.

## Z. Study Questions — 5 recall questions
1. What is the main difference between a master (primary) and a replica in database replication?  
2. In a Ruby Sequel-based setup, how would you route reads to replicas while ensuring availability if the replica is lagging?  
3. Define horizontal partitioning (sharding) and describe a basic modulo-based shard mapping.  
4. What are the main risks of performing cross-shard joins or cross-shard transactions?  
5. List three production considerations you’d monitor to ensure replication and sharding remain healthy in a live system.

## Exercise — practical multi-part coding challenge

Goal
Build a small Ruby environment (using Sequel) that demonstrates replication and sharding in a single, cohesive example. Implement a simple data model and basic routing logic, then exercise basic read/write scenarios across a master/replica and two shards.

Part 1: Setup and replication example
- Create two Sequel connections: one to a master database and one to a replica database.
- Create a users table on the master.
- Implement a small API in Ruby to:
  - Write a user to the master.
  - Read a user by id from the replica (with a fallback to master if not found).

Deliverable: A single script that writes to MASTER and reads from REPLICA (with a safe fallback). Include comments describing the routing decisions.

Part 2: Sharding router
- Implement a ShardRouter class that maps user IDs to one of two shards using a modulo-based approach (id % 2).
- Each shard should be a separate Sequel connection to a distinct database.
- Provide insert and find methods that route to the correct shard.
- Ensure the code is self-contained and can run in a single process with two databases configured via environment variables or default URLs.

Deliverable: A shard-router module with insert and find methods; example usage showing insert followed by a local read.

Part 3: Combined example and basic cross-pattern concerns
- Extend the combined script to:
  - Write a user with a specific id via the shard router.
  - Read that user back via the shard router.
  - Demonstrate a simple cross-pattern scenario: read a user from a replica (where applicable) and fetch additional related data from a different shard as a conceptual cross-part operation (illustrating why denormalization or careful data modeling matters).
- Include a short note about how you would handle a cross-shard "transaction" (two-phase commit concept or compensation pattern) in production.

Hints and tips
- Use the Sequel gem for lightweight Ruby DB access; it's database-agnostic and easy to wire with multiple connections.
- Keep configuration in environment variables (DB_MASTER_URL, DB_REPLICA_URL, SHARD_0_URL, SHARD_1_URL).
- For the exercise, you don’t need to run a real PostgreSQL cluster here; focus on the code structure, routing logic, and how you would wire it in a real environment.

End of lesson.