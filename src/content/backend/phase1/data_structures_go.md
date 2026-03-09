# Data Structures — Arrays, Objects & Maps in Go (Phase 1)

In backend engineering, arrays, objects (structs), and maps are foundational building blocks for modeling data, storing intermediate results, and shaping API payloads. Go’s strong typing, slices for dynamic data, and map semantics give you predictable performance and clear APIs. This lesson dives into fixed-size arrays, slices, structs, and maps in Go, with practical patterns, pitfalls, and production considerations you’ll apply in real systems.

## 1. Arrays, Slices, and Fixed-Size Arrays

Go provides fixed-size arrays, dynamic slices, and the ability to view or grow data safely. Understanding when to use each, along with their length and capacity semantics, is essential for performance and correctness.

```go
package main

import "fmt"

func main() {
    // Fixed-size array (size is part of the type)
    var arr [3]int
    arr[0] = 10
    arr[1] = 20
    arr[2] = 30
    fmt.Println("Fixed array:", arr)

    // A slice backed by an array (or created independently)
    nums := []int{1, 2, 3, 4, 5}
    fmt.Println("Slice initial:", nums)

    // Create a slice view of an existing array (or slice)
    sub := arr[:2] // first two elements: indices 0 and 1
    fmt.Println("Slice from array:", sub)

    // Make a new slice with explicit length and capacity
    s := make([]int, 3, 5) // length 3, capacity 5
    fmt.Println("Made slice:", s, "len:", len(s), "cap:", cap(s))

    // Append to grow beyond the initial length/capacity
    s = append(s, 7, 8)
    fmt.Println("Appended slice:", s, "len:", len(s), "cap:", cap(s))
}
```

### Line-by-line explanation breaking down each line

- Line 1: package main declares the executable program package.
- Line 3: import "fmt" imports the standard formatting package for printing.
- Line 6: var arr [3]int declares a fixed-size array of three integers.
- Lines 7-9: Assign values to each element of the fixed-size array.
- Line 10: fmt.Println prints the fixed array’s contents.
- Line 13: nums := []int{1, 2, 3, 4, 5} creates a dynamic slice with initial values.
- Line 14: fmt.Println shows the initial slice.
- Line 17: sub := arr[:2] creates a slice view of the first two elements of arr.
- Line 18: fmt.Println prints the derived slice from the array.
- Line 21: s := make([]int, 3, 5) creates a slice with length 3 and capacity 5 (allocated storage).
- Line 22: fmt.Println reports length and capacity of the new slice.
- Line 25: s = append(s, 7, 8) appends elements, potentially growing the underlying array if capacity is exceeded.
- Line 26: fmt.Println shows the updated slice and its new length/capacity.

Common patterns to remember:
- Use arrays when you need a fixed-size, stack-friendly data structure (or when interfacing with APIs that require fixed sizes).
- Use slices for most workloads; they are dynamic and share backing storage, with length and capacity controlling growth.
- Use make to preallocate slices when you know capacity in advance to reduce reallocations.

## 2. Structs and Maps: Modeling Data and Dictionaries

Go uses structs to model complex objects with named fields, and maps to model key-value collections. Understanding how to declare, initialize, mutate, and read from these types is foundational for data modeling, configuration, and in-memory caches.

```go
package main

import "fmt"

type User struct {
    ID    int
    Name  string
    Email string
    Tags  []string
}

func main() {
    // Struct value
    u := User{ID: 1, Name: "Alex", Email: "alex@example.com", Tags: []string{"admin", "golang"}}
    fmt.Printf("User: %+v\n", u)

    // Map from string to int (e.g., counts, counters)
    counts := make(map[string]int)
    counts["apples"] = 5
    counts["oranges"] = 3

    // Read with existence check
    if v, ok := counts["apples"]; ok {
        fmt.Println("Apples count:", v)
    }

    // Map from string to a struct (composite values)
    type Product struct {
        ID    string
        Name  string
        Price float64
    }

    catalog := map[string]Product{
        "p1": {ID: "p1", Name: "Widget", Price: 9.99},
        "p2": {ID: "p2", Name: "Gadget", Price: 14.50},
    }

    // Read a product
    fmt.Println("Product p1:", catalog["p1"])

    // Initialize a map with a capacity hint (useful for performance)
    cache := make(map[string]int, 10)
    _ = cache
}
```

### Line-by-line explanation breaking down each line

- Line 1: package main starts the executable package.
- Line 3: import "fmt" imports for printing.
- Lines 5-10: Define a struct type User with fields ID, Name, Email, Tags.
- Line 12: func main() begins the program entry.
- Lines 14-17: Create a User value u with field literals, including a slice for Tags.
- Line 18: fmt.Printf("%+v\n", u) prints the struct with field names.
- Line 21: counts := make(map[string]int) initializes a map from string to int.
- Lines 22-23: Add two key-value pairs to the map.
- Lines 26-29: Read with existence check using v, ok := counts["apples"] to distinguish missing keys.
- Lines 32-41: Define a nested type Product and a map catalog mapping product IDs to Product values; initialize with composite literals.
- Line 44: fmt.Println prints a catalog entry by key.
- Line 47: cache := make(map[string]int, 10) creates a map with a capacity hint (not a hard limit; capacity hint helps allocations).
- Line 48: _ = cache is a no-op to avoid unused variable if compiled standalone.

Common patterns to remember:
- Structs model real-world entities with named fields; use JSON tags when you plan to marshal to/from JSON.
- Maps are reference-like in Go: assigning a map variable copies the reference, not the data. To make an independent copy, you must clone keys/values explicitly.
- Use the comma-ok idiom to check for key existence in a map.

## 3. Practical Patterns: Composite Data and JSON

In real systems you often combine data structures and encode/decode them for persistence or API communication. This section demonstrates a composite type that contains a map and a slice, plus JSON serialization and deserialization.

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Inventory struct {
    Items map[string]int `json:"items"`
    Logs  []string       `json:"logs"`
}

func main() {
    inv := Inventory{
        Items: map[string]int{"apple": 5, "banana": 2},
        Logs:  []string{"init", "load"},
    }

    // Marshal to JSON
    b, err := json.Marshal(inv)
    if err != nil {
        panic(err)
    }
    fmt.Println(string(b))

    // Unmarshal back from JSON
    var inv2 Inventory
    if err := json.Unmarshal(b, &inv2); err != nil {
        panic(err)
    }
    fmt.Printf("Unmarshaled: %+v\n", inv2)
}
```

### Line-by-line explanation breaking down each line

- Lines 1-5: Package and imports; encoding/json is used for JSON operations, fmt for printing.
- Lines 7-11: Define Inventory with a map[string]int (Items) and a []string (Logs); JSON tags specify field names in JSON.
- Lines 13-22: In main, construct an Inventory value inv with sample data.
- Line 25: json.Marshal(inv) encodes the Inventory to JSON; b holds the bytes, err captures any error.
- Lines 26-28: Panic if marshaling fails; otherwise proceed.
- Line 29: fmt.Println(string(b)) prints the JSON string representation.
- Line 32: var inv2 Inventory declares a target for decoding.
- Lines 33-35: json.Unmarshal(b, &inv2) decodes the JSON back into a Go value; panic on error.
- Line 36: fmt.Printf prints the decoded struct with field names.

Line-by-line takeaways:
- Use encoding/json for straightforward struct-to-JSON translation, leveraging struct field tags to control names and behavior.
- JSON marshalling and unmarshalling operate on exported fields (capitalized names) by default.
- When unmarshalling into a struct with maps and slices, those fields are created automatically; you don’t need to preinitialize them in most cases.

X. Common Beginner Mistakes

- Pitfall 1: Writing to a nil map causes a runtime panic.

Bad:
```go
var m map[string]int
m["a"] = 1
```

Good:
```go
m := make(map[string]int)
m["a"] = 1
```

- Pitfall 2: Assuming maps are independently copyable by assignment.

Bad:
```go
m := map[string]int{"a": 1}
m2 := m       // m2 references the same map as m
delete(m2, "a")
```

Good (explicit copy for independent storage):
```go
m := map[string]int{"a": 1}
m2 := make(map[string]int, len(m))
for k, v := range m {
    m2[k] = v
}
delete(m2, "a") // m remains unchanged
```

- Pitfall 3: Closure capture inside loops leading to all closures closing over the same variable.

Bad:
```go
func makeFuncs() []func() {
    var f []func()
    for i := 0; i < 3; i++ {
        f = append(f, func() { fmt.Println(i) })
    }
    return f
}
```

Good:
```go
func makeFuncs() []func() {
    var f []func()
    for i := 0; i < 3; i++ {
        j := i // capture the current value
        f = append(f, func() { fmt.Println(j) })
    }
    return f
}
```

- Pitfall 4: Relying on map iteration order being deterministic.

Bad:
```go
for k, v := range m {
    fmt.Println(k, v)
}
```

Good (collect and sort keys for deterministic order):
```go
keys := make([]string, 0, len(m))
for k := range m {
    keys = append(keys, k)
}
sort.Strings(keys)
for _, k := range keys {
    fmt.Println(k, m[k])
}
```

- Pitfall 5: Not considering concurrency safety when sharing maps across goroutines.

Bad (unsafe):
```go
var m = make(map[string]int)
go func() { m["a"] = 1 }()
go func() { fmt.Println(m["a"]) }()
```

Good (protect with a mutex or use sync.Map):
```go
var mu sync.RWMutex
var m = make(map[string]int)

go func() {
    mu.Lock()
    m["a"] = 1
    mu.Unlock()
}()

go func() {
    mu.RLock()
    _ = m["a"]
    mu.RUnlock()
}()
```

Y. Why This Matters In Real Systems

- Data modeling impact: Arrays are fixed-size and cheap; slices enable dynamic work and are the de facto standard for lists. Choose structures that reflect data invariants and API contracts to minimize runtime errors and allocations.
- Concurrency and safety: Go maps are not safe for concurrent writes. In real systems, you’ll frequently see caches, registries, or in-memory stores accessed by multiple goroutines. Protect shared maps with sync.RWMutex or use sync.Map when you need a concurrent map with simple usage patterns.
- Memory and allocations: Preallocating slices and maps (via make) helps reduce allocations and fragmentation under load. When modeling JSON payloads or large in-memory datasets, consider memory layout and GC pressure.
- Serialization costs: JSON marshaling/unmarshaling is convenient but may be a bottleneck in high-throughput systems. Structure your data to minimize reflection costs, and consider alternative encodings or precomputed schemas if needed.
- Real-world patterns: Structs closely reflect domain entities; maps work well for dictionaries, caches, and dynamic keys. When you need a mapping from string keys to aggregates, a map is typically the simplest approach; when you have a fixed shape, a struct is better for type safety and performance.

Z. Study Questions

1) What is the difference between an array and a slice in Go, and when would you choose each?
2) How do you safely read a value from a map and handle the case where the key does not exist?
3) Why are maps not safe for concurrent writes, and what are two common patterns to make them safe in production?
4) How do you marshal a struct with map and slice fields to JSON, and what role do struct tags play?
5) Describe a scenario where a fixed-size circular buffer is appropriate, and outline the core operations to implement it.

Exercise

Part A — Implement a thread-safe key-value store and test concurrency
- Task: Create a small in-memory key-value store with a concurrent writer/reader workload.
- Requirements:
  - Define type KVStore with fields:
    - mu sync.RWMutex
    - data map[string]string
  - Implement NewKVStore() *KVStore, Set(key, value string), Get(key string) (string, bool), Delete(key string), ListKeys() []string
  - Write a main program that:
    - Creates a KVStore
    - Spawns 4 goroutines: two performing Set with different keys, two performing Get reads
    - Uses a wait group to wait for all goroutines to finish
  - Print results to demonstrate correctness under concurrent access

Code scaffold (you fill in the rest):

```go
package main

import (
    "fmt"
    "sync"
)

type KVStore struct {
    mu   sync.RWMutex
    data map[string]string
}

func NewKVStore() *KVStore {
    return &KVStore{data: make(map[string]string)}
}

func (s *KVStore) Set(key, value string) {
    // TODO: implement
}

func (s *KVStore) Get(key string) (string, bool) {
    // TODO: implement
    return "", false
}

func (s *KVStore) Delete(key string) {
    // TODO: implement
}

func (s *KVStore) ListKeys() []string {
    // TODO: implement
    return nil
}

func main() {
    store := NewKVStore()
    var wg sync.WaitGroup

    // Writer goroutines
    wg.Add(2)
    go func() {
        defer wg.Done()
        store.Set("alpha", "1")
    }()
    go func() {
        defer wg.Done()
        store.Set("beta", "2")
    }()

    // Reader goroutines
    wg.Add(2)
    go func() {
        defer wg.Done()
        if v, ok := store.Get("alpha"); ok {
            fmt.Println("alpha =", v)
        } else {
            fmt.Println("alpha not found")
        }
    }()
    go func() {
        defer wg.Done()
        if v, ok := store.Get("beta"); ok {
            fmt.Println("beta =", v)
        } else {
            fmt.Println("beta not found")
        }
    }()

    wg.Wait()
    fmt.Println("Keys:", store.ListKeys())
}
```

Part B — Circular buffer (fixed-size log)
- Task: Implement a simple fixed-capacity circular buffer for strings with write and read operations.
- Requirements:
  - Implement type LogBuffer with fields:
    - buf []string
    - head int (index of oldest element when full)
    - count int (number of elements currently stored)
  - NewLogBuffer(capacity int) *LogBuffer
  - Write(s string) to append a value, evicting the oldest when full
  - ReadAll() []string to return elements in oldest-to-newest order
  - Ensure correctness when the buffer has not yet filled to capacity and when it has wrapped around
- Provide a small main function demonstrating writes and reads.

Part C — JSON round-trip for a domain object
- Task: Define a domain type and perform marshal/unmarshal to verify field visibility and JSON tags.
- Steps:
  - Define type User with ID int, Name string, Roles []string, and a Tags map[string]string with JSON tag mappings
  - Create a User instance, marshal to JSON, print JSON, unmarshal back, and print the result

Notes:
- While Part A demonstrates safe concurrent access, always run with go test -race or similar race detectors in real projects to catch data races early.
- The patterns here map to real backend concerns: caches, logs, and API payloads. Use these templates as starting points and adapt to your system’s scale and threading model.

If you’d like, I can expand any section with deeper examples (e.g., advanced JSON tagging, custom marshalers, or performance considerations for large maps).