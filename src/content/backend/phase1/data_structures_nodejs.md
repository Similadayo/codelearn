# Data Structures — Arrays, Objects & Maps in JavaScript / Node.js

Data structures are the backbone of every backend service. In JavaScript, arrays, objects, and maps give you flexible ways to model, transform, and store data in memory, which underpins API responses, caches, data pipelines, and internal logic. Mastery of these structures—how to create them, mutate them correctly, and choose the right one for a given task—produces more maintainable code, better performance, and fewer bugs in production systems.

## 1. Arrays in JavaScript

Arrays are ordered collections of values. They are ideal for lists, sequences, and any scenario where you need to process items in order or perform batch transformations.

```js
// 1) Basic creation and mutation
const numbers = [1, 2, 3, 4, 5];
numbers.push(6);            // [1,2,3,4,5,6]
const first = numbers[0];   // 1
const last = numbers[numbers.length - 1]; // 6

// 2) Slicing vs splicing
const slice = numbers.slice(1, 3);  // [2, 3] (does not mutate)
numbers.splice(2, 1, 99);           // mutate: replace index 2 with 99 -> [1,2,99,4,5,6]

// 3) Functional transformations
const doubled  = numbers.map(n => n * 2);           // [2,4,198,8,10,12]
const evenOnly = numbers.filter(n => n % 2 === 0);   // [2,4,6]
const sumTotal = numbers.reduce((acc, n) => acc + n, 0); // 1+2+99+4+5+6 = 117

// 4) Immutability pattern
const snapshot = [...numbers, 7]; // non-mutating append: [1,2,99,4,5,6,7]

// 5) Iteration styles
for (const n of numbers) { console.log(n); }

// 6) Destructuring
const [a, b, ...rest] = numbers; // a=1, b=2, rest=[99,4,5,6,7]
```

### Line-by-line explanation
1. Create a mutable array with initial numbers.
2. Push adds a new element to the end of the array.
3. Access the first element by index.
4. Access the last element via length property.
5. slice returns a shallow copy of a portion of the array without mutating the original.
6. splice mutates the array: remove 1 element at index 2 and insert 99.
7. map creates a new array with each element transformed.
8. filter creates a new array with elements that pass the predicate.
9. reduce aggregates the array into a single value starting from 0.
10. Spread operator creates a new array that appends 7, leaving the original intact.
11. for...of iterates over values.
12. Destructuring assigns the first two items to a and b, and the rest to an array.

---

## 2. Objects in JavaScript

Objects model entities with named properties. They are ideal for domain models (users, products, sessions) and dynamic dictionaries where property names may vary at runtime.

```js
// 1) Object literal with nested data
const user = {
  id: 42,
  name: "Ollie",
  role: "engineer",
  contact: { email: "ollie@example.com", phone: "555-0123" }
};

// 2) Dynamic keys and computed properties
const prop = "location";
user[prop] = "Seattle"; // { id, name, role, contact, location }

// 3) Cloning and merging (shallow)
const updated = { ...user, role: "senior engineer" };

// 4) Enumerating keys/values
const keys = Object.keys(user);        // ["id","name","role","contact","location"]
for (const k of keys) { console.log(k, user[k]); }

// 5) Destructuring to extract/rename data
const { id, name } = user;               // id=42, name="Ollie"

// 6) Deleting a property
delete user.location;
```

### Line-by-line explanation
1. Define a plain object with nested contact info.
2. Use a dynamic key to add or override a property; prop contains "location".
3. Create a shallow copy of the object and override the role property; other nested references remain the same.
4. Object.keys returns an array of enumerable property names; iterate to inspect.
5. For-of over keys logs each key with its corresponding value.
6. Destructure to pull out id and name into separate variables.
7. delete removes the location property from the object entirely.

Notes:
- Objects use string (and symbol) keys. If you need non-string keys, consider using a Map.
- For deep updates, you’ll typically combine spread with targeted deep merges or use a utility like lodash or a small custom merge.

---

## 3. Maps in JavaScript

Maps are key-value stores with on-demand key types (including objects) and guaranteed insertion order. They are often preferable when keys are not simple strings, or when you need predictable iteration order.

```js
// 1) Creating and mutating a Map
const map = new Map();
map.set("id", 1);
map.set({ user: "Alice" }, { role: "admin" });
map.set(3, true);

// 2) Accessing and checking keys
console.log(map.get("id"));         // 1
console.log(map.has({ user: "Alice" })); // false (different object reference)
console.log(map.size);              // 3

// 3) Iteration preserves insertion order
for (const [key, value] of map) {
  console.log(key, value);
}

// 4) Converting from and to arrays
const pairs = [ ["a", 1], ["b", 2] ];
const map2  = new Map(pairs);         // Map { 'a' => 1, 'b' => 2 }
const objFromMap = Object.fromEntries(map); // converts Map to a plain object (only string keys)
```

### Line-by-line explanation
1. Create a new, empty Map.
2. Insert a string key and an object key with their values.
3. Insert a numeric key.
4. Retrieve the value for a string key; returns 1.
5. Check for the existence of a key by reference. Two distinct objects with identical content are not equal as keys.
6. Read the Map size (number of entries).
7. Iterate over the Map; each iteration yields a [key, value] pair in insertion order.
8. Build a Map from an array of key-value pairs.
9. Convert a Map to a plain object using Object.fromEntries (only works reliably for string keys).

Notes:
- Keys can be any value, including objects, functions, or NaN.
- Use Map when you need non-string keys or when you rely on insertion order guarantees for iteration.

---

## 4. Interoperability: Converting between Arrays, Objects & Maps

Understanding how to convert between these structures lets you pick the right one for a task and efficiently transform data shapes.

```js
// 1) From array of objects to Map by id
const people = [
  { id: "p1", name: "Alice" },
  { id: "p2", name: "Bob" }
];
const byId = new Map(people.map(p => [p.id, p])); // Map { "p1" => {id:"p1",...}, ... }

// 2) From Map back to plain object
const objFromMap = Object.fromEntries(byId);
console.log(objFromMap);

// 3) Frequency count with Map
const fruits = ["apple","apple","banana","apple","orange","banana"];
const freq = new Map();
for (const f of fruits) freq.set(f, (freq.get(f) ?? 0) + 1);
console.log(Object.fromEntries(freq)); // { apple: 3, banana: 2, orange: 1 }
```

### Line-by-line explanation
1. Create an array of objects; map each to a [id, object] tuple and feed into Map constructor to index by id.
2. Convert the Map back into a plain object using Object.fromEntries for easy JSON serialization or API response shaping.
3. Build a frequency map by iterating over an array and incrementing counts in a Map; then serialize to a plain object for debugging.

Notes:
- Object.fromEntries is a powerful companion for converting maps/entries into plain objects.
- When choosing between Map and Object for a frequency cache or index, consider whether you need non-string keys and predictable insertion order.

---

## X. Common Beginner Mistakes

- Bad: Iterating arrays with for...in
- Good: Iterating arrays with for...of or forEach

Bad:
```js
const nums = [10, 20, 30];
for (const i in nums) {
  console.log(i, nums[i]); // i is the index as a string, potential pitfalls
}
```

Good:
```js
const nums = [10, 20, 30];
for (const value of nums) {
  console.log(value); // 10, 20, 30
}
```

- Bad: Using a plain object as a key in a map-like structure
- Good: Use a Map for object keys or serialize the key

Bad:
```js
const cache = {};
const key = { id: 1 };
cache[key] = "value";
console.log(cache["[object Object]"]); // "value" (surprising and error-prone)
```

Good:
```js
const cache = new Map();
const key = { id: 1 };
cache.set(key, "value");
console.log(cache.get(key)); // "value"
```

- Bad: Mutating shared state directly in a loop
- Good: Use immutable patterns or create a new structure to avoid surprises

Bad:
```js
let arr = [1, 2, 3];
for (let i = 0; i < arr.length; i++) {
  arr.splice(i, 1); // mutating while iterating can skip elements
}
```

Good:
```js
const arr = [1, 2, 3];
const newArr = arr.filter(x => x !== 2); // create a new array without mutating
```

- Bad: Confusing Map vs Object for key types
- Good: Choose Map when keys are non-strings or when you need precise key identity

Bad:
```js
const obj = {};
obj[0] = "zero"; // key "0" as a string
```

Good:
```js
const map = new Map();
map.set(0, "zero"); // numeric key preserved
```

- Bad: Assuming JSON.stringify will preserve Maps or non-string keys
- Good: Convert with Object.fromEntries or serialize to arrays first

Bad:
```js
const m = new Map([["k", "v"]]);
JSON.stringify(m); // "{}" — maps aren’t serializable by default
```

Good:
```js
const m = new Map([["k", "v"]]);
const serialized = JSON.stringify(Object.fromEntries(m)); // {"k":"v"}
```

---

## Y. Why This Matters In Real Systems

- API responses and payload shaping: Arrays, objects, and maps determine how you structure JSON data sent over the network. Choosing the right structure can simplify serialization and reduce payload size.
- Performance and scale: Lookups with Maps are typically faster than repeatedly traversing arrays or walking object properties, especially for large datasets. Maps also provide predictable iteration order.
- Memory usage and garbage collection: Large in-memory structures can impact Node.js heap usage. Immutable patterns (e.g., creating new arrays rather than mutating in-place) can help with predictable GC behavior in functional-style pipelines.
- Data integrity and identity: Using Maps for complex keys (like composite objects) ensures correct identity semantics which is important in caches, sessions, and memoization.
- Real-world patterns: Indexing a dataset by id (Map), transforming API responses (arrays/objects), and converting between shapes efficiently with Object.fromEntries, spread operators, and Map methods are common in microservices, data pipelines, and backends.

---

## Z. Study Questions

1) What is the primary difference between a JavaScript Object and a Map in terms of key types and iteration order?  
2) How would you convert an array of key-value pairs into a Map? Provide the exact code snippet.  
3) Why might you prefer a Map over a plain object for a cache that uses object references as keys?  
4) What is the difference between slice and splice on arrays? Give an example that demonstrates each.  
5) How can you convert a Map to a plain object and why might you want to do this?

---

## Exercise

Part A: Build a simple in-memory inventory with fast lookups

- Part 1: Implement a small API (in code form) for a product catalog using an array. Functions:
  - addProduct(products, p) – adds a product object { id, name, price, stock } to an array.
  - removeProductById(products, id) – returns a new array without the product with the given id.
  - findProduct(products, id) – returns the product with that id or null.
  - listProducts(products) – returns a shallow copy for external use.

- Part 2: Build a Map index for fast lookups
  - write buildIndex(products) that returns a Map from id to product.
  - write getProductById(index, id) that uses the Map to fetch a product (or null).

- Part 3: Deduplicate an orders list by orderId
  - Given an array of orders like [{ orderId, productId, qty }, ...] with possible duplicates, write deduplicateOrders(orders) that returns a new array with one entry per orderId, preserving the first occurrence.

- Part 4: Sample usage
  - Create a sample dataset, demonstrate add, remove, lookup via both array methods and Map index, deduplicate a small orders array, and print results.

You can run the following starter code and fill in the missing implementations:

```js
// Part A - Starter: Inventory with array-based storage
function addProduct(products, p) {
  // TODO: implement
}

function removeProductById(products, id) {
  // TODO: implement
}

function findProduct(products, id) {
  // TODO: implement
}

function listProducts(products) {
  // TODO: implement
}

// Part B - Build a fast lookup index with Map
function buildIndex(products) {
  // TODO: implement
}

function getProductById(index, id) {
  // TODO: implement
}

// Part C - Deduplicate orders by orderId
function deduplicateOrders(orders) {
  // TODO: implement
}

// Demo / usage
const inventory = [
  { id: "p1", name: "Widget", price: 9.99, stock: 100 },
  { id: "p2", name: "Gadget", price: 14.99, stock: 50 }
];

// Part C usage: build index
const index = buildIndex(inventory);

// Demonstrate add
const newProduct = { id: "p3", name: "Thingamajig", price: 4.99, stock: 200 };
const updatedInventory = addProduct(inventory, newProduct);

// Demonstrate remove
const afterRemoval = removeProductById(updatedInventory, "p1");

// Demonstrate lookup
const found = getProductById(index, "p2");

// Part C: deduplicate orders
const orders = [
  { orderId: "o1", productId: "p1", qty: 2 },
  { orderId: "o2", productId: "p2", qty: 1 },
  { orderId: "o1", productId: "p1", qty: 3 } // duplicate by orderId
];
const uniqueOrders = deduplicateOrders(orders);

console.log("Inventory:", inventory);
console.log("Index:", Array.from(index.entries()));
console.log("Updated inventory:", updatedInventory);
console.log("After removal:", afterRemoval);
console.log("Found product:", found);
console.log("Unique orders:", uniqueOrders);
```

Notes:
- Ensure addProduct returns a new array (not mutate the input) if you want immutable patterns; otherwise adjust as needed.
- The index builder should be a pure function returning a Map; do not mutate the input array inside it.
- The deduplication should keep the first occurrence of each orderId.

This lesson covered core data structures in JavaScript within a Node.js context, including practical patterns for real-world backend engineering tasks.