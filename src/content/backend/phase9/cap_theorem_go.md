# CAP Theorem & Distributed Systems Basics in Go

Compelling introductory paragraph: The CAP theorem captures a fundamental trade-off in distributed systems: in the presence of network partitions, a system can choose to be either consistent (C) or highly available (A), but not both. Understanding CAP helps backend engineers design systems that meet real-world requirements for latency, correctness, and fault tolerance. In Go, you can build tiny, representative simulations to reason about these trade-offs, articulate expectations to stakeholders, and guide production architectures (e.g., choosing CP-like consensus vs. AP-like eventual consistency). This lesson provides hands-on Go code and structured explanations to solidify intuition about CAP and distributed design basics.

## 1. CAP Theorem Essentials

The CAP theorem states you cannot simultaneously guarantee Consistency, Availability, and Partition tolerance in a distributed system. In practice:
- Partition tolerance is a given in real networks; you must design for it.
- You typically choose between CP (Consistency + Partition tolerance, sacrificing Availability during partitions) and AP (Availability + Partition tolerance, sacrificing strict consistency during partitions).
- In real systems, you often see eventual consistency (AP) or strong consistency with leadership and consensus during partitions (CP).

Code example below illustrates a toy KV store that can be configured to behave as CP or AP under partitions.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// Mode selects the CAP trade-off behavior
type Mode int

const (
	CP Mode = iota // Consistency-focused, may sacrifice availability during partitions
	AP               // Availability-focused, eventual consistency during partitions
)

// Entry stores a value with a logical timestamp
type Entry struct {
	Value string
	TS    int64
}

// Node simulates a storage node in a cluster
type Node struct {
	id    int
	alive bool
	mu    sync.RWMutex
	store map[string]Entry
}

func NewNode(id int) *Node {
	return &Node{
		id:    id,
		alive: true,
		store: make(map[string]Entry),
	}
}

func (n *Node) put(key, val string) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.store[key] = Entry{Value: val, TS: time.Now().UnixNano()}
}

func (n *Node) get(key string) (Entry, bool) {
	n.mu.RLock()
	defer n.mu.RUnlock()
	v, ok := n.store[key]
	return v, ok
}

// Cluster represents a small distributed system with a CAP mode
type Cluster struct {
	nodes []*Node
	mode  Mode
}

// NewCluster creates a cluster with n nodes in the given CAP mode
func NewCluster(n int, mode Mode) *Cluster {
	c := &Cluster{mode: mode}
	for i := 0; i < n; i++ {
		c.nodes = append(c.nodes, NewNode(i))
	}
	return c
}

// aliveCount returns the number of currently alive nodes
func (c *Cluster) aliveCount() int {
	cnt := 0
	for _, nd := range c.nodes {
		if nd.alive {
			cnt++
		}
	}
	return cnt
}

// Put writes a key/value in the cluster according to CAP mode
func (c *Cluster) Put(key, val string) error {
	alive := c.aliveCount()
	if alive == 0 {
		return fmt.Errorf("no alive nodes")
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	successes := 0

	for _, nd := range c.nodes {
		if !nd.alive {
			continue
		}
		wg.Add(1)
		go func(n *Node) {
			defer wg.Done()
			n.put(key, val)
			mu.Lock()
			successes++
			mu.Unlock()
		}(nd)
	}

	wg.Wait()

	if c.mode == CP {
		majority := alive/2 + 1
		if successes >= majority {
			return nil
		}
		return fmt.Errorf("partition: CP write requires majority, got %d/%d", successes, alive)
	} else { // AP
		// In AP, as long as at least one node wrote, we consider the write accepted
		if successes > 0 {
			return nil
		}
		return fmt.Errorf("no alive nodes to write in AP")
	}
}

// Get reads a key from the cluster
func (c *Cluster) Get(key string) (string, bool) {
	alive := c.aliveCount()
	if alive == 0 {
		return "", false
	}
	type cand struct {
		val string
		ts  int64
	}
	var best cand
	found := false
	var readCount int

	for _, nd := range c.nodes {
		if !nd.alive {
			continue
		}
		if ent, ok := nd.get(key); ok {
			readCount++
			if !found || ent.TS > best.ts {
				best = cand{val: ent.Value, ts: ent.TS}
				found = true
			}
		}
	}

	if !found {
		return "", false
	}

	// CP reads require majority for consistency; AP can return latest among alive
	if c.mode == CP {
		majority := alive/2 + 1
		if readCount >= majority {
			return best.val, true
		}
		return "", false
	}
	return best.val, true
}
```

### Line-by-line explanation
- Define a Mode enum to switch behavior between CP and AP modes.
- Entry stores the value and a timestamp for conflict resolution.
- Node simulates an individual storage node with a thread-safe map.
- NewNode initializes a node with a given ID.
- Node.put writes a value with a timestamp (not safe across nodes by itself, but the cluster coordinates it).
- Node.get reads a value safely with a read lock.
- Cluster aggregates nodes and maintains a CAP mode.
- NewCluster builds a cluster of n nodes in the specified mode.
- aliveCount counts how many nodes are currently reachable (alive).
- Put writes to all alive nodes concurrently and then checks whether the operation satisfies the chosen CAP mode:
  - CP requires a majority (alive/2 + 1) of successful writes.
  - AP accepts the write if at least one node succeeded.
- Get reads from all alive nodes, picks the latest timestamp, and:
  - In CP mode, validates that the read covers a majority.
  - In AP mode, returns the latest observed value among alive nodes (eventual consistency).

## 2. Simple Distributed KV Store in Go (AP vs CP)

This section provides a practical, self-contained example of a toy distributed key-value store in Go that can be operated in CP or AP mode. It includes a cluster constructor and a small demonstration main function.

```go
package main

import (
	"fmt"
	"time"
)

// Reuse the same definitions from Section 1
type Mode int
type Entry struct {
	Value string
	TS    int64
}
type Node struct {
	id    int
	alive bool
	mu    chan struct{} // simple mutex-like channel for serialization
	store map[string]Entry
}

func NewNode(id int) *Node {
	return &Node{
		id:    id,
		alive: true,
		mu:    make(chan struct{}, 1),
		store: make(map[string]Entry),
	}
}

func (n *Node) put(key, val string) {
	// serialize writes per node
	n.mu <- struct{}{}
	defer func() { <-n.mu }()
	n.store[key] = Entry{Value: val, TS: time.Now().UnixNano()}
}

func (n *Node) get(key string) (Entry, bool) {
	n.mu <- struct{}{}
	defer func() { <-n.mu }()
	v, ok := n.store[key]
	return v, ok
}

type Cluster struct {
	nodes []*Node
	mode  Mode
}

func NewCluster(n int, mode Mode) *Cluster {
	c := &Cluster{mode: mode}
	for i := 0; i < n; i++ {
		c.nodes = append(c.nodes, NewNode(i))
	}
	return c
}

func (c *Cluster) aliveCount() int {
	cnt := 0
	for _, nd := range c.nodes {
		if nd.alive {
			cnt++
		}
	}
	return cnt
}

func (c *Cluster) Put(key, val string) error {
	alive := c.aliveCount()
	if alive == 0 {
		return fmt.Errorf("no alive nodes")
	}
	type result struct{ ok bool }
	ch := make(chan result, alive)

	// Replicate to all alive nodes
	for _, nd := range c.nodes {
		if !nd.alive {
			continue
		}
		go func(n *Node) {
			n.put(key, val)
			ch <- result{ok: true}
		}(nd)
	}

	successes := 0
	for i := 0; i < alive; i++ {
		 <-ch
		successes++
	}
	// CP vs AP behavior
	if c.mode == CP {
		majority := alive/2 + 1
		if successes >= majority {
			return nil
		}
		return fmt.Errorf("partition: CP write requires majority, got %d/%d", successes, alive)
	}
	// AP
	if successes > 0 {
		return nil
	}
	return fmt.Errorf("no alive nodes wrote")
}

func (c *Cluster) Get(key string) (string, bool) {
	alive := c.aliveCount()
	if alive == 0 {
		return "", false
	}
	var latest Entry
	found := false
	seen := 0
	for _, nd := range c.nodes {
		if !nd.alive {
			continue
		}
		seen++
		if ent, ok := nd.get(key); ok {
			if !found || ent.TS > latest.TS {
				latest = ent
				found = true
			}
		}
	}
	if !found {
		return "", false
	}
	// In CP, we could enforce majority on reads as well (omitted for brevity)
	return latest.Value, true
}
```

### Line-by-line explanation
- Define a minimal in-file duplication of the CP vs AP concepts for a compact demonstration.
- Node uses a simple channel-based mutex to serialize access to per-node storage.
- NewCluster builds a cluster of n nodes in the selected mode.
- Put replicates the write to all alive nodes asynchronously and counts successes.
- In CP mode, a majority is required; otherwise, the write succeeds in AP mode if at least one node was written.
- Get reads from all alive nodes and returns the most recent value by timestamp, which models eventual convergence in AP and latest observed value in CP reads depending on quorum.

## 3. Designing for Partitions: Quorums and Timers

Understanding quorums and timeouts is essential for reasoning about partition tolerance and real-world performance.

```go
package main

import "fmt"

type Policy int

const (
	CPPolicy Policy = iota
	APPolicy
)

// quorumSize returns the number of nodes required to satisfy the chosen policy
func quorumSize(n int, p Policy) int {
	if p == CPPolicy {
		return n/2 + 1
	}
	// AP requires only a single node to acknowledge
	return 1
}

func main() {
	fmt.Println("CP quorum for 3 nodes:", quorumSize(3, CPPolicy))
	fmt.Println("AP quorum for 3 nodes:", quorumSize(3, APPolicy))
}
```

### Line-by-line explanation
- Policy enum distinguishes CP vs AP decision logic for quorum calculation.
- quorumSize computes the minimum number of acknowledgments needed:
  - CP: majority (n/2 + 1)
  - AP: at least one ack
- main prints sample quorums for a 3-node cluster, illustrating the core CAP trade-off mechanism.

## 4. Common Beginner Mistakes — 3+ pitfalls with bad vs good code (side-by-side)

Pitfall 1: Assuming CP/writes always succeed during partitions
- Bad:
```go
// CP assumption: write to all nodes; no partition handling
func (c *Cluster) Put(key, val string) error {
	for _, nd := range c.nodes {
		nd.put(key, val) // blindly writes regardless of node availability
	}
	return nil
}
```
- Good:
```go
// CP/AP aware: respects majority availability
func (c *Cluster) Put(key, val string) error {
	alive := c.aliveCount()
	if alive == 0 {
		return fmt.Errorf("no alive nodes")
	}
	// Implement majority check as in Section 1
	// ...
	return nil
}
```

Pitfall 2: Ignoring timestamps and stale reads
- Bad:
```go
type Entry struct { Value string }

func (n *Node) get(key string) (string, bool) {
	val, ok := n.store[key]
	return val, ok
}
```
- Good:
```go
type Entry struct {
	Value string
	TS    int64
}
func (n *Node) get(key string) (Entry, bool) {
	// returns with timestamp; enables conflict resolution
	...
}
```

Pitfall 3: Not modeling partitions or node failures
- Bad:
```go
// Always assumes all nodes are alive
func (c *Cluster) Put(key, val string) error {
	// naive write
	return nil
}
```
- Good:
```go
// Expose and toggle node.alive to simulate partitions
// CP requires majority; AP tolerates partial failures
```

Pitfall 4: Relying on a single node for reads in a distributed setting
- Bad:
```go
func (c *Cluster) Get(key string) (string, bool) {
	return c.nodes[0].get(key) // reads from a single node only
}
```
- Good:
```go
func (c *Cluster) Get(key string) (string, bool) {
	// Read from all alive nodes and pick latest by timestamp
	// CP: ensure majority for strong reads; AP: return latest observed
}
```

Pitfall 5: Lack of concurrency control leading to data races
- Bad:
```go
func (n *Node) put(key, val string) {
	n.store[key] = Entry{Value: val, TS: time.Now().UnixNano()} // no mutex
}
```
- Good:
```go
func (n *Node) put(key, val string) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.store[key] = Entry{Value: val, TS: time.Now().UnixNano()}
}
```

## 5. Why This Matters In Real Systems

- Real systems face partitions, latency variability, and failure modes. CAP helps you reason about what you can guarantee under failure:
  - CP systems (e.g., etcd, Consul in some modes) prioritize correctness and linearizability. During partitions, they may reject writes or reads to maintain consistency. They are often backed by consensus protocols like Raft or Paxos.
  - AP systems (e.g., DynamoDB in certain modes, Cassandra with QUORUM/ONE settings, Riak) favor availability and partition tolerance, accepting eventual consistency. Reconciliation occurs later, and client reads may return stale data.
- Tradeoff examples:
  - etcd (CP) uses a Raft-based consensus to guarantee strong consistency; writes may be slower under partition scenarios but reads are strongly consistent when quorum is reachable.
  - Cassandra (AP with tunable consistency) lets you choose consistency level per operation (ONE, QUORUM, ALL). Under partitions, writes can succeed with lower consistency, while reads may return stale data until hinted handoffs converge.
- Production guidance:
  - Model your data access patterns (reads vs writes, freshness requirements) and choose a CAP posture that aligns with SLAs.
  - Use timeouts, retries, and clear error signaling to handle partial failures gracefully.
  - For critical configuration/state, prefer CP-like guarantees; for user-facing content where availability is paramount, AP with eventual consistency can be acceptable.

## 6. Study Questions — 5 recall questions

1) What does CAP stand for, and why can you not have all three in a partitioned system?
2) In a CP system, what happens to availability during a partition to preserve consistency?
3) How does an AP system typically handle reads and writes during a partition?
4) Explain why timestamps (logical clocks) are useful in resolving conflicts in a distributed KV store.
5) Name two real-world systems and classify them as CP or AP (with brief justification).

## 7. Exercise — practical multi-part coding challenge

Part A — Extend the toy cluster
- Implement a small main program that creates a 3-node cluster in CP mode, writes a key, simulates a partition by turning one node off, then attempts another write. Observe the success/failure behavior.
- Then switch to AP mode and perform the same sequence. Observe how availability changes and how reads may reflect stale data depending on the simulated partition.

Part B — Implement a Get policy
- Modify Get to enforce CP reads that require majority when in CP mode. In AP mode, return the latest value observed among alive nodes.
- Print results for both modes under a simulated partition (one node down) to illustrate the difference.

Part C — Qualitative analysis
- Write a short report (one page) describing:
  - How the observed behavior maps to CAP.
  - Which workload characteristics would push you toward CP vs AP in a production system.
  - How you would extend the toy model to include deliberate message delays and partial failures to mimic real-world networks.

Optional starter snippet for Part A demonstration (place in a separate main.go in the same package):

```go
package main

import (
	"fmt"
)

func main() {
	// CP mode demonstration
	cpCluster := NewCluster(3, CP)
	_ = cpCluster.Put("greeting", "hello")
	val, ok := cpCluster.Get("greeting")
	fmt.Printf("CP after init: got=%v ok=%v val=%s\n", ok, ok, val)

	// Partition: turn node 1 offline
	cpCluster.nodes[1].alive = false
	err := cpCluster.Put("greeting", "hi-partition")
	if err != nil {
		fmt.Println("CP Put failed under partition:", err)
	} else {
		fmt.Println("CP Put succeeded under partition (unexpected in strict CP)")
	}
	val, ok = cpCluster.Get("greeting")
	fmt.Printf("CP after partition read: ok=%v val=%s\n", ok, val)

	// AP mode demonstration
	apCluster := NewCluster(3, AP)
	_ = apCluster.Put("greeting", "hello-ap")
	val, ok = apCluster.Get("greeting")
	fmt.Printf("AP initial: ok=%v val=%s\n", ok, val)

	// Partition: turn node 2 offline
	apCluster.nodes[2].alive = false
	_ = apCluster.Put("greeting", "hello-ap-partition")
	val, ok = apCluster.Get("greeting")
	fmt.Printf("AP after partition read: ok=%v val=%s\n", ok, val)
}
```

This lesson provides a practical, Go-centric exploration of CAP and distributed systems basics, balancing didactic explanation with hands-on coding to strengthen your ability to design, implement, and reason about scalable backend systems.