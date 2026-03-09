# CAP Theorem & Distributed Systems Basics

This lesson dives into the CAP theorem, how it shapes system design, and how to apply these concepts in Ruby backend systems. You’ll see concrete Ruby examples that illustrate strong vs eventual consistency, basic consensus ideas, and practical patterns (idempotency, retries, distributed locking) you’ll actually reuse in production. By the end, you’ll be able to reason about trade-offs in real systems and translate them into maintainable Ruby code.

## 1. CAP Theorem Fundamentals

The CAP theorem states that in a distributed system, you can only guarantee two of the following three properties simultaneously: Consistency (C), Availability (A), and Partition tolerance (P). Partition tolerance is required for any real distributed system that may lose network connectivity between nodes. Therefore, in the presence of partitions, you must choose between Consistency and Availability.

- CP: Consistency and Partition tolerance. The system remains consistent, possibly at the expense of availability during partitions.
- AP: Availability and Partition tolerance. The system remains available, possibly serving stale data during partitions (eventual consistency).
- CA: Consistency and Availability without Partition tolerance is only feasible in a single-node or fully connected environment; with partitions, CA cannot be guaranteed.

In Ruby terms, you’ll often model these trade-offs as:
- CP-like behavior: strict writes/reads go to a coordinating hub, updates may be blocked if a replica is slow or partitioned.
- AP-like behavior: reads/writes proceed, but you may observe stale values until replication finishes.
- CA-like behavior is rare in real distributed systems during partitions, but you can simulate it on a single node.

Code example: a toy CAP model simulator with two replicas and a network partition toggle (AP vs CP behavior).

```ruby
# cap_simulator.rb
class Replica
  def initialize(name)
    @name = name
    @store = {}
  end

  def write(key, value)
    @store[key] = value
  end

  def read(key)
    @store[key]
  end
end

class CAPSystem
  def initialize
    @a = Replica.new('A')
    @b = Replica.new('B')
    @partitioned = false
  end

  def partition!
    @partitioned = true
  end

  def heal!
    @partitioned = false
  end

  # Write path depends on partition state (CP behavior when partitioned)
  def write(key, value)
    if @partitioned
      # In CP-like behavior during partition: we ensure strong consistency by
      # writing only to a single authoritative replica.
      @a.write(key, value)
    else
      # In normal (non-partitioned) operation: replicate to all replicas.
      @a.write(key, value)
      @b.write(key, value)
    end
  end

  # Read path depends on partition state (AP-like read availability)
  def read(key)
    if @partitioned
      # Read from a single replica; could return stale value if not replicated yet.
      @a.read(key)
    else
      # Read from a healthy majority (simplified): read from A (as primary)
      @a.read(key)
    end
  end
end
```

### Line-by-line explanation
- class Replica: defines a simple in-memory data holder with write/read operations.
- initialize(name): sets up a replica with a name and an empty store.
- write(key, value): stores the value under the key.
- read(key): returns the value for the key from this replica.
- class CAPSystem: orchestrates two replicas and a partition flag.
- initialize: creates two replicas (A and B) and marks the system as not partitioned.
- partition!: toggles the system into a partitioned state.
- heal!: clears the partition state.
- write(key, value): if partitioned, writes only to replica A (simulating CP under partition). If not partitioned, writes to both replicas.
- read(key): if partitioned, reads from replica A (faster/authoritative in CP-like mode). Otherwise reads from replica A (simplified majority behavior).

## 2. Modeling Consistency: Strong vs Eventual in Ruby

This section contrasts strong consistency using a single coordinated path with eventual consistency via asynchronous replication.

A. Strong consistency via a guarded critical section (simulated in-memory store with a mutex to enforce atomicity across keys).

```ruby
# strong_consistency.rb
require 'thread'

class SimpleLedger
  def initialize
    @balances = Hash.new(0)
    @lock = Mutex.new
  end

  def balance(id)
    @balances[id]
  end

  # Atomic transfer: both debit and credit happen under the same mutex
  def transfer(from_id, to_id, amount)
    @lock.synchronize do
      raise "Insufficient funds" if @balances[from_id] < amount
      @balances[from_id] -= amount
      @balances[to_id] += amount
    end
  end

  def seed(id, amount)
    @balances[id] = amount
  end
end
```

B. Eventual consistency via asynchronous replication (primary writes, replicas update later)

```ruby
# eventual_consistency.rb
require 'thread'

class Replica
  def initialize(name)
    @name = name
    @store = {}
  end

  def apply(key, value)
    @store[key] = value
  end

  def read(key)
    @store[key]
  end
end

class Primary
  def initialize
    @data = {}
    @replica = Replica.new('R1')
    @queue = Queue.new
    start_replication_worker
  end

  def start_replication_worker
    Thread.new do
      loop do
        key, value = @queue.pop
        # Simulate replication delay
        sleep(rand(0.1..0.4))
        @replica.apply(key, value)
      end
    end
  end

  # Writes go to primary immediately, replication happens asynchronously
  def write(key, value)
    @data[key] = value
    @queue << [key, value]
  end

  def read(key)
    @data[key]
  end

  def read_replica(key)
    @replica.read(key)
  end
end
```

### Line-by-line explanation
- require 'thread': imports multithreading primitives.
- class Replica: simple in-memory replica with an apply method to update state.
- initialize(name): sets a human-readable name and empty store.
- apply(key, value): updates the replica’s store with a key/value.
- read(key): fetches a value from the replica.
- class Primary: holds primary data and an asynchronous replication path.
- initialize: creates the primary data store and a single replica, and a replication queue.
- start_replication_worker: starts a background thread that processes replication tasks from the queue, simulating delay.
- Thread.new: begins a new thread for asynchronous work.
- loop do / @queue.pop: continually takes replication tasks off the queue.
- sleep(rand(0.1..0.4)): simulates network/processing delay.
- @replica.apply(key, value): applies the replicated write to the replica.
- write(key, value): writes to the primary store and enqueues replication.
- read(key): reads the current value from the primary (potentially stale in replicas).
- read_replica(key): reads the value from the replica (may lag behind primary).

## 3. Basic Consensus/Coordination: Toy Raft-like Election in Ruby

Consensus protocols (like Raft or Paxos) coordinate a cluster to elect a leader and agree on a log of operations. This is a toy, in-memory illustration to help you reason about the flow rather than a production-ready implementation.

```ruby
# toy_consensus.rb
class Node
  attr_reader :name, :peers
  def initialize(name, peers = [])
    @name = name
    @peers = peers
    @term = 0
    @voted_for = nil
    @leader = nil
  end

  # A follower votes for a candidate if the candidate's term is newer
  def vote_request(candidate, term)
    if term > @term
      @term = term
      @voted_for = candidate
      true
    else
      false
    end
  end

  # A very small election: run against known peers
  def start_election
    term = @term + 1
    votes = 1 # vote for self
    @peers.each do |peer|
      votes += 1 if peer.vote_request(@name, term)
    end
    @leader = (votes > (@peers.size + 1) / 2) ? @name : nil
  end
end
```

### Line-by-line explanation
- class Node: defines a node in a tiny cluster.
- initialize(name, peers = []): sets up the node with a name and a list of peer nodes.
- vote_request(candidate, term): simulates a requester asking for a vote; if the term is newer, grant vote and update term.
- start_election: initiates a term and tallies votes from peers; elects a leader if majority is achieved.
- term = @term + 1: increments the term for the new election.
- votes = 1: starts with a self-vote.
- @peers.each { |peer| votes += 1 if peer.vote_request(@name, term) }: collects votes from peers.
- @leader = (votes > (@peers.size + 1) / 2) ? @name : nil: determines leader based on majority.

Note: This is a conceptual helper to understand flow (start election, collect votes, decide leader). A production Raft implementation requires network, timing, persistent logs, and more robust state machines.

## 4. Practical Patterns for Ruby Backends: Idempotency, Retries, and Distributed Locks

These patterns help you build reliable systems that behave well under CAP trade-offs and real-world failures.

A. Idempotent writes using database upserts (PostgreSQL example with Rails-style upsert)

```ruby
# upsert_example.rb (PostgreSQL + Rails-style usage)
# Requires Rails 6+ or the 'ruby-postgres' adapter with upsert support
# This demonstrates an idempotent balance increment keyed by user_id

require 'active_record'

class UserBalance < ActiveRecord::Base
  # columns: user_id:integer, balance:decimal
  validates :user_id, presence: true, uniqueness: true
end

def upsert_balance(user_id, delta)
  UserBalance.upsert({ user_id: user_id, balance: delta },
                   unique_by: :user_id)
end
```

B. Retry with exponential backoff in Ruby

```ruby
# retry_backoff.rb
def with_retry(max_retries: 5, base: 0.1)
  attempts = 0
  begin
    yield
  rescue StandardError => e
    attempts += 1
    if attempts > max_retries
      raise
    else
      sleep(base * (2 ** (attempts - 1)))
      retry
    end
  end
end
```

C. Distributed locking with Redis (Redlock-like approach)

```ruby
# redis_lock.rb
require 'redis'
require 'securerandom'

class DistributedLock
  def initialize(redis)
    @redis = redis
  end

  # Acquire a lock with NX (set if not exists) and PX (expire)
  def lock(key, ttl_ms = 2000)
    token = SecureRandom.uuid
    ok = @redis.set(key, token, nx: true, px: ttl_ms)
    return nil unless ok

    token
  end

  # Release the lock if we own it
  def unlock(key, token)
    current = @redis.get(key)
    if current == token
      @redis.del(key)
    end
  end
end

# Usage:
# redis = Redis.new
# lock = DistributedLock.new(redis)
# token = lock.lock("resource_lock")
# if token
#   begin
#     # critical section
#   ensure
#     lock.unlock("resource_lock", token)
#   end
# end
```

D. Line-by-line explanations for 4A–D blocks

A. Upsert pattern
- require 'active_record': loads the ActiveRecord ORM to enable upsert.
- class UserBalance < ActiveRecord::Base: defines a model for a balances table.
- upsert_balance(user_id, delta): demonstrates an idempotent operation by upserting a balance by user_id so repeated calls with the same user_id won’t create duplicates and can be treated as the same event.

B. Retry with exponential backoff
- def with_retry(...); yield; rescue; sleep; retry: wraps a potentially flaky operation to retry with increasing delay.

C. Distributed lock
- require 'redis' and 'securerandom': bring in Redis client and a UUID generator.
- DistributedLock#lock: tries to acquire a lock only if not present; uses a unique token to ensure ownership on unlock.
- DistributedLock#unlock: releases the lock only if the token matches the current owner, preventing accidental unlocks by others.

D. Usage notes: In production, prefer established libraries like Redlock-rb or a robust Redis client with Lua scripts to guarantee atomicity and safety across multiple Redis nodes.

## 5. Why This Matters In Real Systems

- CAP informs how you design services in the face of partial failures. In a microservices architecture, for example, you might partition services by domain and use asynchronous messaging to keep them decoupled (AP) while ensuring critical financial transactions use stronger coordination (CP) via transactions and idempotent APIs.
- Strong consistency is appropriate for banking-like updates, inventory counts, or billing where mistakes have direct financial or regulatory consequences. It often requires locks, coordination services, or single-wwriter paths that can affect latency and availability.
- Eventual consistency shines for analytics, social feeds, and opportunistic caching where stale reads are acceptable and latency is a priority. Asynchronous replication, background jobs, and queues help achieve high throughput.
- Real systems mix patterns: use transactions for critical state changes, background workers for throughput, idempotent operations to survive retries, and distributed locks to prevent concurrent conflicts.
- Observability (metrics, tracing, logs) is essential to detect partitions, retries, throttling, and latency spikes, enabling safe trade-off decisions in production.

## 6. Study Questions

1. What are the three properties in the CAP theorem, and why is Partition Tolerance not optional in real networks?
2. In a partitioned system, which CAP combination would you choose for a user-facing service that must remain available, and why?
3. How does an idempotent operation help in environments with retries and duplicates? Give a code example in Ruby.
4. What is the purpose of a distributed lock, and how does a safe unlock avoid “stolen” locks?
5. Why are eventual consistency and asynchronous replication common in modern backends, and what risks should you mitigate when using them?

## 7. Exercise — Multi-part Coding Challenge

Overview
You’ll build a tiny CAP-aware toy system in Ruby to reinforce the concepts from this module. You’ll implement a two-node system with a partition toggle, then add simple eventual replication, and finally add a small test harness to observe behavior under failure.

Part A: Implement a two-node CAP simulator with a partition toggle
- Create a file cap_exercise_a.rb.
- Implement a CAPSystem similar to the one in Section 1, but with a simple test harness:
  - Create two stores, A and B (hashes).
  - Implement write(key, value) that:
    - If partitioned: writes only to A (CP mode under partition).
    - If not partitioned: writes to both A and B (eventual consistency after partition heals).
  - Implement read(key) that:
    - If partitioned: reads from A (which could be stale compared to B).
    - If not partitioned: reads from A (as primary) to keep behavior simple.
- Add a small script to simulate a workload:
  - Seed initial balances in A and B.
  - Perform a write while partitioned and then heal; observe how reads differ pre/post-heal.

Part B: Extend to observe eventual replication
- Add a simple asynchronous replication (like in Section 2B) to an in-memory replica when not partitioned.
- Create a small demonstration that shows a write during partition that becomes consistent after heal, with the replica gradually catching up.

Part C: Write a tiny test harness
- Create a couple of methods:
  - simulate_partition(system, duration)
  - measure_read_during_and_after_partition(system, key)
- Print out results showing how reads behave under partition and after healing.

Deliverables
- cap_theorem_intro.md: A markdown explanation of the CAP concepts you learned, with your own tiny Ruby snippets.
- cap_exercise_a.rb: The full exercise code implementing Parts A–C.
- A short README.md describing the expected outputs and how to run the exercise.

Note: The exercise emphasizes conceptual understanding with runnable Ruby code. You’re not expected to implement a production-grade distributed system. The goal is to practice identifying CAP trade-offs, applying simple patterns for consistency, and reasoning about behavior under partitions in Ruby.