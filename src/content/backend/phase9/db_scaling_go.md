# Backend Engineering: Phase 9 — System Design & Scalability - Database Scaling: Replication & Sharding (Go)

In modern backend systems, databases must serve growing traffic while keeping data safe, consistent, and quickly accessible. Replication and sharding are two foundational strategies: replication copies data to multiple servers to improve read throughput and availability, while sharding distributes data across multiple machines to scale writes and manage large datasets. This lesson demonstrates practical Go (Golang) patterns for implementing and reasoning about replication and sharding within a single process, highlighting design choices, trade-offs, and real-world considerations.

## 1. Replication Fundamentals in Go

Replication creates copies of data on multiple nodes so reads can be served from replicas and the system remains available despite individual node failures. We’ll model a simple primary (leader) with multiple replicas (followers). Writes go to the primary; replicas receive updates to stay in sync. This section focuses on a straightforward, easy-to-understand in-memory simulation to illustrate concepts.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// DB is a tiny in-memory key-value store abstraction.
type DB interface {
	Put(key, value string) error
	Get(key string) (string, error)
}

// InMemoryStore is a thread-safe in-memory KV store.
type InMemoryStore struct {
	mu   sync.RWMutex
	data map[string]string
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{data: make(map[string]string)}
}

func (s *InMemoryStore) Put(key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = value
	return nil
}

func (s *InMemoryStore) Get(key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.data[key]
	if !ok {
		return "", fmt.Errorf("key not found")
	}
	return v, nil
}

// Replicator handles writes to a primary and synchronously or asynchronously to replicas.
type Replicator struct {
	primary   *InMemoryStore
	replicas  []*InMemoryStore
	syncMode  bool // true = synchronous replication; false = asynchronous
}

// NewReplicator constructs a new replicator with given replicas and mode.
func NewReplicator(primary *InMemoryStore, replicas []*InMemoryStore, syncMode bool) *Replicator {
	return &Replicator{primary: primary, replicas: replicas, syncMode: syncMode}
}

// Put writes to the primary and propagates to replicas per mode.
func (r *Replicator) Put(key, value string) error {
	// Write to primary first
	if err := r.primary.Put(key, value); err != nil {
		return err
	}
	// Replicate to replicas
	if r.syncMode {
		// Synchronous: block until all replicas are updated
		for _, rep := range r.replicas {
			_ = rep.Put(key, value)
		}
	} else {
		// Asynchronous: fire-and-forget replication
		for _, rep := range r.replicas {
			go rep.Put(key, value)
		}
	}
	return nil
}

// Get reads directly from a chosen store (for demonstration we read from primary).
func (r *Replicator) Get(key string) (string, error) {
	return r.primary.Get(key)
}
```

### Line-by-line explanation

- Define DB interface with Put/Get to model simple KV behavior.
- InMemoryStore provides a thread-safe map with a mutex for concurrent access.
- NewInMemoryStore initializes the store with an empty map.
- Put acquires write lock, stores the key/value, and releases the lock.
- Get acquires read lock, retrieves the key, and returns an error if missing.
- Replicator holds a primary and zero or more replicas, plus a mode flag.
- NewReplicator creates a replicator configured for sync or async replication.
- Replicator.Put writes to the primary first; if syncMode is true, it writes to all replicas synchronously, otherwise it dispatches writes to replicas asynchronously using goroutines.
- Replicator.Get reads from the primary (simplified for clarity; in real systems you might read from replicas or implement read routing).

## 2. Read Routing and Consistency

Reads are often served by replicas to reduce load on the primary. However, replicas may lag behind the primary, leading to eventual consistency. The Go sample below demonstrates a simple read router that can direct reads to a replica or the primary, illustrating the trade-offs between latency and staleness.

```go
package main

import (
	"fmt"
	"math/rand"
	"time"
)

// ReadRouter chooses where to read from (primary or a replica).
type ReadRouter struct {
	primary  *InMemoryStore
	replicas []*InMemoryStore
	rng      *rand.Rand
}

// NewReadRouter initializes a router with primary and replicas.
func NewReadRouter(primary *InMemoryStore, replicas []*InMemoryStore) *ReadRouter {
	return &ReadRouter{
		primary:  primary,
		replicas: replicas,
		rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Get fetches the value using a simple read strategy:
// 50% chance to read from a replica (if any), otherwise from the primary.
func (rr *ReadRouter) Get(key string) (string, error) {
	if len(rr.replicas) > 0 && rr.rng.Float64() < 0.5 {
		// Read from a randomly chosen replica
		idx := rr.rng.Intn(len(rr.replicas))
		return rr.replicas[idx].Get(key)
	}
	return rr.primary.Get(key)
}
```

### Line-by-line explanation

- ReadRouter holds a reference to the primary and a slice of replicas; it also uses a RNG to distribute reads.
- NewReadRouter creates a router with a seeded RNG for jittered decisions.
- Get implements a probabilistic read path: with 50% probability reads come from a random replica; otherwise, the primary is read.
- This pattern demonstrates the trade-off: replicas reduce load but may return stale data due to replication lag.

## 3. Sharding Fundamentals and Strategies

Sharding partitions data horizontally across multiple databases to scale writes and storage. A common approach is to map a key to a shard using a hashing strategy. This section introduces a minimal, self-contained Go implementation of a consistent hashing ring with virtual nodes, plus a tiny shard cluster to illustrate routing and per-shard replication.

```go
package main

import (
	"fmt"
	"hash/fnv"
	"sort"
	"strconv"
	"sync"
)

// HashRing implements a simple consistent-hashing ring with virtual nodes.
type HashRing struct {
	hashFn   func(string) uint32
	replicas int
	ring     []uint32          // sorted ring of tokens
	nodes    map[uint32]string // token -> nodeName
	mu       sync.RWMutex
}

// NewHashRing constructs a ring with the given number of virtual node replicas per real node.
func NewHashRing(replicas int) *HashRing {
	return &HashRing{
		hashFn:   hashString,
		replicas: replicas,
		ring:     []uint32{},
		nodes:    make(map[uint32]string),
	}
}

// AddNode places 'replicas' virtual nodes for the given real node onto the ring.
func (h *HashRing) AddNode(node string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for i := 0; i < h.replicas; i++ {
		token := h.hashFn(node + ":" + strconv.Itoa(i))
		h.ring = append(h.ring, token)
		h.nodes[token] = node
	}
	sort.Slice(h.ring, func(i, j int) bool { return h.ring[i] < h.ring[j] })
}

// GetNode returns the node responsible for the given key.
func (h *HashRing) GetNode(key string) string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.ring) == 0 {
		return ""
	}
	token := h.hashFn(key)
	// Binary search for the first ring token >= token
	idx := sort.Search(len(h.ring), func(i int) bool { return h.ring[i] >= token })
	if idx == len(h.ring) {
		idx = 0
	}
	return h.nodes[h.ring[idx]]
}

// hashString is a helper hashing function (FNV-1a 32-bit).
func hashString(s string) uint32 {
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(s))
	return hasher.Sum32()
}

// Shard holds a primary and a set of replicas for a shard.
type Shard struct {
	name      string
	primary   *InMemoryStore
	replicas  []*InMemoryStore
	replicator *Replicator
}

// ShardCluster ties multiple shards together via a HashRing.
type ShardCluster struct {
	ring   *HashRing
	shards map[string]*Shard
}

// NewShardCluster creates a cluster with the given shard names and per-shard replicas.
func NewShardCluster(shardNames []string, replicas int) *ShardCluster {
	ring := NewHashRing(100) // 100 virtual nodes per shard
	cluster := &ShardCluster{
		ring:   ring,
		shards: make(map[string]*Shard),
	}
	for _, name := range shardNames {
		primary := NewInMemoryStore()
		replicaStores := make([]*InMemoryStore, 0, replicas)
		for i := 0; i < replicas; i++ {
			replicaStores = append(replicaStores, NewInMemoryStore())
		}
		replicator := NewReplicator(primary, replicaStores, false)
		shard := &Shard{
			name:       name,
			primary:    primary,
			replicas:   replicaStores,
			replicator: replicator,
		}
		cluster.shards[name] = shard
		ring.AddNode(name)
	}
	return cluster
}

// Put writes the key/value to the appropriate shard via the shard's replicator.
func (c *ShardCluster) Put(key, value string) {
	shardName := c.ring.GetNode(key)
	shard := c.shards[shardName]
	_ = shard.replicator.Put(key, value)
}

// Get reads from the shard's primary (for simplicity; could read from replica as well).
func (c *ShardCluster) Get(key string) (string, error) {
	shardName := c.ring.GetNode(key)
	return shard.primary.Get(key)
}
```

### Line-by-line explanation

- HashRing uses a hash function and a set of virtual nodes per real node to distribute keys evenly.
- NewHashRing initializes the ring with a chosen number of replicas per node and internal maps.
- AddNode inserts virtual tokens for a real node onto the ring; tokens are stored and the ring is kept sorted.
- GetNode finds the node responsible for a given key by hashing the key and locating the next token on the ring (wrapping to the first token if needed).
- Shard aggregates a primary store, a slice of replicas, and a Replicator to propagate writes.
- ShardCluster binds multiple shards to a single HashRing; it creates per-shard stores and replicas, registers shard names on the ring, and holds a map of shardName -> Shard.
- NewShardCluster constructs the cluster, updates the hash ring with shard names, and wires replication for each shard.
- ShardCluster.Put computes the target shard from the ring and delegates replication to that shard’s replicator.
- ShardCluster.Get fetches data from the target shard’s primary for read consistency in this simplified example.

## 4. Integrating Replication + Sharding in Go

Now we combine replication and sharding into a cohesive cluster that routes writes to the correct shard and replicates writes to each shard’s replicas. The cluster uses consistent hashing to decide which shard owns a key and then leverages each shard’s Replicator to ensure data propagation.

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	// Create a 3-shard cluster, each shard with 2 replicas
	cluster := NewShardCluster([]string{"shard-A", "shard-B", "shard-C"}, 2)

	// Write some keys
	cluster.Put("user:1001", "Alice")
	cluster.Put("user:1002", "Bob")
	cluster.Put("order:2001", "Order-XYZ")

	// Someday later, read data back
	time.Sleep(50 * time.Millisecond) // allow async replication to complete (if async)
	val, _ := cluster.Get("user:1001")
	fmt.Println("Retrieved:", val)

	// Demonstrate that the same key maps to a shard and that replication happened
	// for the demonstration, we show primary reads only (replicas would have updated in background)
}
```

### Line-by-line explanation

- main creates a ShardCluster with three shards and two replicas per shard; each shard has its own primary and replicas and a replicator configured for asynchronous replication.
- cluster.Put routes keys to the appropriate shard via the consistent hash ring and uses the shard’s replicator to propagate writes to the shard’s replicas.
- A brief sleep allows background replication to finish if async mode is used, then cluster.Get reads from the selected shard’s primary.
- The example demonstrates end-to-end routing, replication, and per-shard isolation, which are fundamental for scalable systems.

## X. Common Beginner Mistakes

- Note: The following pitfalls illustrate realistic, common missteps. Each pair shows bad vs good code patterns.

1) Pitfall: Not handling replication failures or lag
- Bad:
```go
// Bad: ignores replica write failures
for _, rep := range r.replicas {
	_ = rep.Put(key, value)
}
```
- Good:
```go
// Good: stops or retries on replica write failure, or marks a cricitical path
var lastErr error
for _, rep := range r.replicas {
	if err := rep.Put(key, value); err != nil {
		lastErr = err
		// Optionally retry or escalate
	}
}
if lastErr != nil {
	return lastErr
}
```

2) Pitfall: Blocking the whole request with a single global lock
- Bad:
```go
// Bad: single mutex for all keys
var mu sync.Mutex
func Put(key, value string) {
	mu.Lock()
	primary.Put(key, value)
	// replicate to all replicas
	mu.Unlock()
}
```
- Good:
```go
// Good: per-shard or per-key locking strategy
var shardLocks = make(map[string]*sync.Mutex)
func Put(key, value string) {
	sh := shardForKey(key)
	mu := getLockForShard(sh)
	mu.Lock()
	defer mu.Unlock()
	primary.Put(key, value)
	// replicate ...
}
```

3) Pitfall: Rigid shard mapping (no rebalance/rebalancing costly)
- Bad:
```go
// Bad: hard-coded shard mapping
if key < "m" { shard = shardA } else { shard = shardB }
```
- Good:
```go
// Good: use a consistent-hashing ring (or dynamic rebalancing) to map keys
shardName := ring.GetNode(key)
```

4) Pitfall: Not accounting for read-your-writes and read-from-replicas pitfalls
- Bad:
```go
// Bad: always read from primary
return primary.Get(key)
```
- Good:
```go
// Good: route reads using a mix of primary/replicas and consider read-your-writes guarantees
if wantStaleOK {
	return replica.Get(key)
} else {
	return primary.Get(key)
}
```

## Y. Why This Matters In Real Systems

- Throughput and latency: Replication reduces read latency by serving reads from replicas; sharding increases write throughput by distributing load.
- Availability and fault tolerance: If one shard or replica fails, others can continue serving traffic. Proper failover handling minimizes downtime.
- Consistency vs. performance trade-offs: Replication introduces lag; sharding introduces rebalancing complexity. Systems must choose consistency guarantees (strong vs eventual) based on use-case.
- Operational concerns: Backups, point-in-time recovery, monitoring replication lag, and automated shard rebalancing are essential in production.
- Go-specific considerations: Use goroutines and channels to implement asynchronous replication, but guard critical paths with clear error handling, timeouts, and context propagation to prevent leaks and cascading failures. Test error paths and latency budgets to ensure stability under load.

## Z. Study Questions

1) What are the core differences between replication and sharding, and what problems do they solve?  
2) How does consistent hashing help when adding or removing shards without huge data shuffles?  
3) What is read-your-writes, and how can it be affected by read routing choices to replicas?  
4) Why might you choose synchronous vs asynchronous replication, and what are the trade-offs?  
5) In a real system, how would you monitor replication lag and shard rebalancing to ensure SLAs are met?

## Exercise

Part A – Implement a minimal replicated primary with two replicas (Go)

- Task: Create a small Go program that sets up a primary store and two replicas, uses a Replicator in synchronous mode, and demonstrates Put/Get across primary and replicas.
- Deliverables:
  - A working main.go file implementing the InMemoryStore, Replicator, and a simple demo that writes several keys and reads back from primary and replicas.
  - Logs showing replication progress and timing.
- Starter code: (copy into a single file or split into files as you wish)

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	primary := NewInMemoryStore()
	rep1 := NewInMemoryStore()
	rep2 := NewInMemoryStore()

	replicator := NewReplicator(primary, []*InMemoryStore{rep1, rep2}, true)

	// Write some keys
	start := time.Now()
	_ = replicator.Put("config:feature_x", "enabled")
	_ = replicator.Put("user:alice", "Alice")
	elapsed := time.Since(start)

	fmt.Println("Put elapsed:", elapsed)

	// Read back from primary
	val, _ := primary.Get("config:feature_x")
	fmt.Println("primary:", val)

	// Read back from replicas to verify replication
	r1, _ := rep1.Get("config:feature_x")
	r2, _ := rep2.Get("config:feature_x")
	fmt.Println("replicas:", r1, r2)
}
```

Part B – Add simple sharding (Go)

- Task: Extend the program to partition keys into 2 shards using a basic consistent-hashing ring and route Put/Get to the correct shard’s primary.
- Deliverables:
  - A HashRing implementation (or reuse the snippet from Section 3) and a ShardCluster that routes keys based on GetNode.
  - Demonstration code writing to multiple shards and retrieving values.
- Hints:
  - Reuse InMemoryStore for each shard’s primary and replicas (one or two replicas per shard).
  - Use a single ring to map keys to shard names.

Part C – End-to-end cluster demo

- Task: Combine replication and sharding: a cluster with 3 shards, each shard replicating to 2 replicas, with Put routing to a shard and replicating within the shard.
- Deliverables:
  - A small demonstration program that puts several keys and reads them back, showing that data lands on the correct shard and is replicated to its replicas.
  - A simple timing report showing Put vs Get latency for primary and replica reads.

Notes

- The code examples above are educational and intentionally simplified. In production, you would implement:
  - Proper error handling and retry/backoff policies for replica writes.
  - Timeouts, backpressure handling, and context propagation.
  - Healthy-liveness checks, failover, and automated shard rebalancing.
  - Durable storage backends (PostgreSQL, MySQL, distributed stores) and their specific replication features.
  - Observability: metrics on replication lag, query latency, and shard balance.

This lesson provides a hands-on foundation for understanding and building scalable, distributed backends with replication and sharding in Go. Adjust the complexity as you progress toward real-world deployments and production-grade systems.