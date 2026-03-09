# CAP Theorem & Distributed Systems Basics (Backend Engineering) — JavaScript / Node.js

Compelling introductory paragraph:
In modern backends, services live in a world of distributed systems where data is replicated across machines, networks fail, and partitions can occur at any moment. The CAP theorem formalizes the fundamental tradeoffs between Consistency, Availability, and Partition Tolerance, guiding how you design data stores, APIs, and services. This lesson uses JavaScript/Node.js to illustrate the concepts with concrete, runnable patterns. You’ll see AP-like (availability-first) and CP-like (consistency-first) approaches, how eventual consistency arises, and practical strategies you can apply in real systems—from small in-process clusters to microservices communicating over unreliable networks.

## 1. CAP Theorem Fundamentals

- What CAP means in practice:
  - Consistency: Every read sees the most recent write (or an error).
  - Availability: Every request gets a (non-error) response.
  - Partition Tolerance: The system continues operating despite network partitions.
- Key takeaway: In the presence of a partition, you must choose between Consistency and Availability. CA systems don’t tolerate partitions at all; CP/AP systems do, but with different guarantees during partitions.

Code block 1: AP-style in-process store (availability-first; reads and writes are fast, replication can lag or fail)
```js
// APStore: availability-first. Writes succeed locally; replication to replicas happens in the background.
// Good for workloads that can tolerate temporary divergence but want fast responses.
class APStore {
  constructor(name) {
    this.name = name;
    this.local = new Map();
    this.replicas = [];
  }

  addReplica(replica) {
    this.replicas.push(replica);
  }

  // Write-Local + fire-and-forget async replication
  async put(key, value) {
    this.local.set(key, value);
    const replications = this.replicas.map(r => r.put(key, value).catch(() => null));
    // Do not await replication: maintains fast AP semantics
    Promise.all(replications);
    return true;
  }

  async get(key) {
    return this.local.get(key);
  }
}

// Simple replica that can simulate delays or partitions
class Replica {
  constructor(name) {
    this.name = name;
    this.local = new Map();
    this.shouldFail = false; // simulate partition/failure
  }

  async put(key, value) {
    if (this.shouldFail) throw new Error('Partition');
    // simulate network delay
    await new Promise(res => setTimeout(res, Math.random() * 50));
    this.local.set(key, value);
    return true;
  }

  async get(key) {
    return this.local.get(key);
  }
}
```

Code block 2: CP-style in-process store (consistency-first; majority/ quorum-based writes)
```js
// CPStore: consistency-first. Writes succeed only after majority acknowledgment.
class CPStore {
  constructor(nodes) {
    this.nodes = nodes; // array of Node replicas
  }

  // Write to all nodes and require majority acks
  async put(key, value) {
    const acks = await Promise.all(
      this.nodes.map(n => n.put(key, value).catch(() => false))
    );
    const okCount = acks.filter(x => x).length;
    return okCount >= Math.ceil(this.nodes.length / 2);
  }

  // Read from a single node for simplicity (could be extended to quorum read)
  async get(key) {
    return this.nodes[0].get(key);
  }
}

class Node {
  constructor(name) {
    this.name = name;
    this.local = new Map();
  }

  async put(key, value) {
    // simulate potential delay
    await new Promise(res => setTimeout(res, Math.random() * 40));
    this.local.set(key, value);
    return true;
  }

  async get(key) {
    return this.local.get(key);
  }
}
```

Usage example (AP cluster):
```js
const a = new Replica('A');
const b = new Replica('B');
const c = new Replica('C');

const apStore = new APStore('AP');
apStore.addReplica(a);
apStore.addReplica(b);
apStore.addReplica(c);

(async () => {
  await apStore.put('user:1', { name: 'Ada' });
  console.log('AP get:', await apStore.get('user:1'));
})();
```

Usage example (CP cluster):
```js
const n1 = new Node('n1');
const n2 = new Node('n2');
const n3 = new Node('n3');

const cpStore = new CPStore([n1, n2, n3]);

(async () => {
  const ok = await cpStore.put('user:2', { name: 'Bob' });
  console.log('CP write success?', ok);
  console.log('CP read:', await cpStore.get('user:2'));
})();
```

### Line-by-line explanation
Code block 1 (APStore):
- Line 1-3: Define APStore class with a constructor taking a name, initializing a local key-value map and an array of replica references.
- Line 5-7: addReplica stores a replica reference for later replication.
- Line 9: put(key, value) writes the value to the local store (primary) and initiates replication to replicas.
- Line 10-12: Create replication promises for each replica; each replica's put may fail (e.g., due to partition) and is caught.
- Line 13: We do not await replication; this preserves fast, availability-focused behavior.
- Line 14-16: get reads from the local store.
- Line 19-28: Replica class: constructor, optional simulated failure, and local write with a small random delay to mimic network latency.
- Line 29-33: put in replica validates partition status and stores the value after a delay.
- Line 35-37: get reads the value from the replica.

Code block 2 (CPStore):
- Line 1-3: CPStore constructor takes an array of nodes (replicas) to coordinate writes.
- Line 5-11: put writes to all nodes and waits for acknowledgments; it returns true only if a majority ack succeeds.
- Line 13-17: get reads from the first node for simplicity (could be extended to quorum read for stronger guarantees).
- Line 19-25: Node class with put/get; put includes a small artificial delay to simulate asynchronous writes.

## 2. Consistency Models & Eventual Consistency

- Eventual consistency: writes propagate to replicas over time; reads may reflect old data immediately after a write.
- Strong consistency (linearizability): reads reflect the latest write; typically requires coordination and can affect latency.

Code block: Eventual vs. Strong read patterns using Leader/Replica model
```js
// Simple leader + replicas illustrating eventual consistency
class Leader {
  constructor() {
    this.local = {};
    this.replicas = [];
  }

  addReplica(replica) {
    this.replicas.push(replica);
  }

  // Write to leader and propagate updates asynchronously
  async put(key, value) {
    this.local[key] = value;
    // fire-and-forget propagation
    for (const r of this.replicas) {
      r.receiveUpdate(key, value);
    }
  }

  get(key) {
    return this.local[key];
  }
}

class Replica {
  constructor(name) {
    this.name = name;
    this.store = {};
  }
  // Simulate asynchronous propagation with a fixed delay
  receiveUpdate(key, value) {
    const delay = Math.random() * 100;
    setTimeout(() => {
      this.store[key] = value;
    }, delay);
  }
  read(key) {
    return this.store[key];
  }
}
```

Usage example:
```js
const L = new Leader();
const R1 = new Replica('R1');
const R2 = new Replica('R2');
L.addReplica(R1);
L.addReplica(R2);

(async () => {
  await L.put('config:color', 'blue');
  console.log('Leader read right after put:', L.get('config:color'));
  // Immediately reads from replicas may still be undefined
  console.log('R1 immediate read:', R1.read('config:color'));
  console.log('R2 immediate read:', R2.read('config:color'));
  // After a short delay, replicas will reflect the update (eventual consistency)
  setTimeout(() => {
    console.log('R1 after delay:', R1.read('config:color'));
    console.log('R2 after delay:', R2.read('config:color'));
  }, 150);
})();
```

### Line-by-line explanation
Code block (Eventual vs. Strong semantics):
- Line 1-6: Leader class with a local store and a list of replicas; can add replicas.
- Line 8-17: put(key, value) writes to the leader and asynchronously propagates to each replica via receiveUpdate without waiting for ack; this models eventual consistency.
- Line 19-23: get(key) returns the leader’s local copy (stronger than nothing, but not guaranteed to be latest for reads from replicas).
- Line 25-30: Replica class with a separate store; receiveUpdate schedules a delayed write to simulate asynchronous propagation.
- Line 31-36: read(key) returns the current value on that replica.

Code block (Usage):
- Lines 1-7: Create a Leader and two Replica instances, attach replicas to the leader.
- Lines 9-15: Put a value into the leader; print immediate leader state and replica state (likely not yet updated).
- Lines 16-22: After 150ms, print replicas’ values to show eventual consistency.

## 3. Partition Tolerance & Failure Modes

- Partition tolerance means the system continues operating when the network splits.
- Handling timeouts, retries, and read repair are common real-world techniques.

Code block: Read with timeout and simple read-repair
```js
function fetchWithTimeout(promise, ms) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

class NetworkNode {
  constructor(name, delay, shouldFail = false) {
    this.name = name;
    this.delay = delay;
    this.shouldFail = shouldFail;
    this.store = new Map();
  }

  async get(key) {
    if (this.shouldFail) throw new Error('node down');
    await new Promise(res => setTimeout(res, this.delay));
    return this.store.get(key);
  }

  async set(key, value) {
    if (this.shouldFail) throw new Error('node down');
    await new Promise(res => setTimeout(res, this.delay));
    this.store.set(key, value);
  }
}

// Read with timeout to tolerate partitions
async function readWithTimeout(key, nodes, timeoutMs = 50) {
  const reads = nodes.map(n => n.get(key).catch(() => undefined));
  try {
    const results = await Promise.all(reads.map(p => fetchWithTimeout(p, timeoutMs).catch(() => undefined)));
    const value = results.find(v => v !== undefined);
    // simple read repair: if we got a value, write it back to all nodes missing it
    if (typeof value !== 'undefined') {
      await Promise.all(nodes.map(n => n.set(key, value).catch(() => {})));
    }
    return value;
  } catch {
    // fallback: if all fail, return undefined
    return undefined;
  }
}
```

Usage demonstration (simulated partition):
```js
const n1 = new NetworkNode('n1', 20);
const n2 = new NetworkNode('n2', 60);
const n3 = new NetworkNode('n3', 30);

n1.set('status', 'online');
n2.shouldFail = true; // simulate partitioned node
n3.shouldFail = true; // another partitioned node

(async () => {
  // simulate a read under partition
  const val = await readWithTimeout('status', [n1, n2, n3], 40);
  console.log('Read result with partition:', val);
})();
```

### Line-by-line explanation
Code block (Read with timeout and repair):
- Line 1-7: fetchWithTimeout creates a timeout promise and races it against the given promise; ensures a timeout pathway.
- Line 9-18: NetworkNode represents a node with a delay and an optional failure flag; get/set simulate work with a delay.
- Line 21-35: readWithTimeout performs concurrent reads from all nodes with a per-read timeout; picks the first defined value and then performs a read repair by writing that value back to all nodes that lacked it.
- Lines 37-48: Example usage showing two nodes in partitioned state and one online; demonstrates a read with timeout and subsequent repair.

## 4. CAP in Practice: Patterns & Design Decisions

- How architecture choices map to CAP:
  - AP-centric services emphasize fast responses and accept divergence, with eventual consistency.
  - CP-centric services emphasize consistency and may incur higher latency during write/read coordination.
  - In production, many systems blend patterns (read replicas for scale, leader-based writes, cascading retries, timeouts, circuit breakers).

Code block: Simple CAP-mode switch (wrapper around AP/CP patterns)
```js
class CAPService {
  constructor(mode, apLeader, cpNodes) {
    this.mode = mode; // 'AP' or 'CP'
    this.apLeader = apLeader; // Leader-like AP center (APStore-like)
    this.cpNodes = cpNodes; // array of Node instances (CP)
  }

  async put(key, value) {
    if (this.mode === 'AP') {
      // AP path: write locally and fire-and-forget replication
      return this.apLeader.put(key, value);
    } else {
      // CP path: use quorum write across nodes
      const cp = new CPStore(this.cpNodes);
      return cp.put(key, value);
    }
  }

  async get(key) {
    if (this.mode === 'AP') {
      return this.apLeader.get(key);
    } else {
      // For CP, read from a single node for simplicity (could be quorum read)
      return this.cpNodes[0].get(key);
    }
  }
}
```

Usage example:
```js
// AP usage
const apLeader = new APStore('AP Leader');
const ap1 = new Replica('AP-1');
const ap2 = new Replica('AP-2');
apLeader.addReplica(ap1);
apLeader.addReplica(ap2);

const apService = new CAPService('AP', apLeader, []);
(async () => {
  await apService.put('config:mode', 'auto');
  console.log('AP read:', await apService.get('config:mode'));
})();
```

Usage example (CP usage):
```js
const n1 = new Node('N1');
const n2 = new Node('N2');
const n3 = new Node('N3');
const cpService = new CAPService('CP', null, [n1, n2, n3]);
(async () => {
  await cpService.put('config:threshold', 10);
  console.log('CP read:', await cpService.get('config:threshold'));
})();
```

### Line-by-line explanation
Code block (CAP-mode switch):
- Line 1-4: CAPService constructor accepts a mode and the appropriate components (AP leader or CP nodes).
- Line 6-14: put() routes to AP path if mode is 'AP' (fast, local write + async replication); otherwise uses CP path (quorum-based write).
- Line 16-23: get() returns from the appropriate data source based on mode.
- Usage examples: show how to initialize AP and CP paths and perform a put/get sequence in each mode.

## 5. Lightweight Patterns: Hashing, Clustering, and Node Distribution in Node.js

- Consistent hashing helps distribute keys across nodes with minimal reshuffling when nodes join/leave.
- Simple round-robin or modular hashing can be used for small clusters.

Code block: Simple Consistent Hash Ring (toy example)
```js
// Very small, educational consistent hashing ring
class ConsistentHashRing {
  constructor(nodes = []) {
    this.nodes = nodes;
    this.ring = [];
    this.build();
  }

  // naive hash: sum of char codes
  static hash(str) {
    return Array.from(str).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  }

  build() {
    this.ring = this.nodes.map(n => ({
      hash: ConsistentHashRing.hash(n.name),
      node: n
    }));
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  getNode(key) {
    const keyHash = ConsistentHashRing.hash(key);
    for (const slot of this.ring) {
      if (keyHash <= slot.hash) return slot.node;
    }
    // wrap around
    return this.ring[0]?.node;
  }

  addNode(node) {
    this.nodes.push(node);
    this.build();
  }

  removeNode(nodeName) {
    this.nodes = this.nodes.filter(n => n.name !== nodeName);
    this.build();
  }
}
```

Usage example:
```js
class SimpleNode {
  constructor(name) { this.name = name; this.store = {}; }
  put(key, value) { this.store[key] = value; }
  get(key) { return this.store[key]; }
}
const A = new SimpleNode('A');
const B = new SimpleNode('B');
const C = new SimpleNode('C');
const ring = new ConsistentHashRing([A,B,C]);

const key = 'session:123';
const node = ring.getNode(key);
node.put(key, { user: 'Carol' });

console.log('Key handed to node:', node.name);
console.log('Stored value:', node.get(key));
```

Line-by-line explanation
- Lines 1-8: ConsistentHashRing class maintains a sorted ring of nodes by a simple numeric hash.
- Lines 10-14: hash() is a simple static method computing a numeric hash for a string.
- Lines 16-22: build() populates and sorts the ring based on node names' hash values.
- Lines 24-33: getNode(key) maps a key to the first node with a hash >= key's hash; if none, it wraps to the first node.
- Lines 35-37: addNode/removeNode adjust the ring accordingly.
- Usage: defines a few simple nodes, builds the ring, computes which node should hold a key, stores a value, and prints details.

## X. Common Beginner Mistakes

- 1) Assuming CAP guarantees all three properties simultaneously
  Bad:
  - Writes followed by reads that always reflect the write without coordinating replication.
  Good:
  - Clearly separate AP and CP semantics and document latency/consistency guarantees for each path.

- 2) Not accounting for network partitions in design
  Bad:
  - Reads and writes succeed even during partitions without timeouts or retry/backoff logic.
  Good:
  - Implement timeouts, retries with backoff, and read repairs to converge.

- 3) Writing without a clear isolation level or versioning
  Bad:
  - Overwriting values in multiple places without version vectors or causality tracking.
  Good:
  - Add per-key versioning / vector clocks to detect and resolve write conflicts.

- 4) Relying on a single node for reads in CP paths
  Bad:
  - get() always reads from a single primary; risk of stale data under partitions.
  Good:
  - Use quorum reads or read-repair to improve consistency, or keep reads cheap by routing to replicas with fresh data.

- 5) Overcomplicating the system early
  Bad:
  - Implementing full RAFT/consensus for every microservice without clear requirements.
  Good:
  - Start with simple AP/CP patterns, add complexity only where latency/consistency needs demand it.

Side-by-side examples:

- Pitfall 1: Incomplete CAP thinking
  Bad:
  ```js
  // Read after write always guaranteed
  async function putAndRead(key, value, store) {
    await store.put(key, value);
    return store.get(key); // assumes immediate visibility
  }
  ```
  Good:
  ```js
  // Documented CAP behavior; reads may lag after writes in AP mode
  async function putAndReadAP(key, value, store) {
    await store.put(key, value);
    // read local only; replication may be in flight
    return store.get(key);
  }
  ```
- Pitfall 2: No backoff on retry after partition
  Bad:
  ```js
  async function putWithNoBackoff(key, value, replicas) {
    for (const r of replicas) await r.put(key, value);
  }
  ```
  Good:
  ```js
  async function putWithBackoff(key, value, replicas) {
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await Promise.all(replicas.map(r => r.put(key, value)));
        return true;
      } catch {
        await new Promise(res => setTimeout(res, (i+1) * 50));
      }
    }
    throw new Error('Replication failed after backoff');
  }
  ```

- Pitfall 3: Not proactively repairing diverging data
  Bad:
  ```js
  // Read without repair
  async function read(key, nodes) {
    return nodes[0].get(key);
  }
  ```
  Good:
  ```js
  // Read with simple repair
  async function readWithRepair(key, nodes) {
    const values = await Promise.all(nodes.map(n => n.get(key).catch(() => undefined)));
    const value = values.find(v => v !== undefined);
    if (value !== undefined) {
      await Promise.all(nodes.map(n => n.set(key, value).catch(() => {})));
    }
    return value;
  }
  ```

## Y. Why This Matters In Real Systems

- Availability vs Consistency decisions drive user experience: e-commerce sites prefer quick reads for product listings (AP-like), while financial systems require strong consistency for transfers (CP-like).
- Partitions happen in production: cloudy or multi-region deployments experience latency spikes and occasional outages; designing for partition tolerance reduces user-visible failures.
- Real systems use layered patterns:
  - Local caches for fast reads; write-behind caches to decouple latency.
  - Read replicas and quorum reads for balance between latency and consistency.
  - Health checks, circuit breakers, and fallback UIs to keep systems resilient during partial outages.
- Tooling and observability: metrics around latency, error rates, replication lag, and clock skew are essential to operating CAP-aware services.

## Z. Study Questions

1) What are the three components of the CAP theorem, and what does Partition Tolerance assume about your system?  
2) How does an AP-style store handle writes during a network partition? What is the tradeoff?  
3) What is read repair, and why is it useful in eventual consistency models?  
4) In a CP system, why might a quorum read be preferred over a single-node read?  
5) How can you design a simple in-process cluster to simulate CAP tradeoffs before deploying to real infra?

## Exercise

Goal: Build a tiny 3-node cluster in Node.js that can operate in AP or CP mode, simulate a partition, and demonstrate read/write behaviors with line-by-line explanations. You’ll implement:
- A simple 3-node cluster with AP and CP mode support.
- A small utility to simulate partitions and delays.
- A demonstration script showing how CAP choices affect reads after writes.

Part A: Create the cluster nodes and two modes
- Create Node class (with put/get) and a Replica class (with put/get and a fail flag).
- Implement AP mode: leader writes locally and triggers asynchronous replication to replicas without waiting.
- Implement CP mode: leader uses a simple quorum write (majority of nodes must ack).

Part B: Demonstration script
- Initialize three nodes (A,B,C).
- In AP mode: write a value, immediately read from the leader, and then show that replicas may lag.
- In CP mode: write a value, wait for quorum, then read from a node and demonstrate consistency across reads.

Part C: Extend with a simple partition
- Set one replica to fail on put, and show how CP mode still succeeds if a majority acknowledges, while AP mode remains fast but divergent.

Part D: Write a short README-style explanation
- Explain what happened in AP vs CP runs, how partitioning affected each path, and what “read repair” might look like in a real system.

Hints:
- Reuse the code blocks in Sections 1–5 as building blocks for your exercise.
- Keep functions small and well-named.
- Use console.log statements to illustrate timing and data visibility across nodes.

Optional extension:
- Add a minimal read-repair function for the AP path to illustrate convergence after a read, or implement a simple Consistent Hash Ring to distribute keys across nodes.

This lesson provides practical, runnable Node.js patterns for understanding CAP and distributed systems foundations. Use the code samples to experiment with partition scenarios, observe how latency and data divergence occur, and internalize the tradeoffs you’ll face when you design real backend services.