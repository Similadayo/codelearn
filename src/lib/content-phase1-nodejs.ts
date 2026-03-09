// Phase 1 - Node.js Detailed Content

export const phase1NodejsContent: Record<string, string> = {

    variables_types_nodejs: `
# Variables, Data Types, and Strings in JavaScript

Variables and data types are the foundation of programming. Before you can build APIs, validate user input, or store records in a database, you must understand what kind of value you are working with and how the language represents it.

In backend development, weak understanding here creates expensive mistakes later. A value that looks like a number may actually be a string. A missing value may be \`undefined\` or \`null\`. A boolean may arrive from an HTTP request as the text \`"true"\` rather than the boolean value \`true\`.

---

## 1. What Is a Variable?

A **variable** is a named location in memory that stores a value. You give the value a name so that your program can reuse it later.

Think of a variable as a labeled container:

- the **label** is the variable name
- the **content** is the value inside it
- the **type** describes what kind of value it is

\`\`\`javascript
const courseName = 'Backend Engineering';
let studentCount = 120;
\`\`\`

In the first line, \`courseName\` is the variable name and \`'Backend Engineering'\` is the stored value.

In the second line, \`studentCount\` is the variable name and \`120\` is the stored value.

---

## 2. \`const\`, \`let\`, and \`var\`

JavaScript has three ways to declare variables, but in modern code you mainly use **\`const\`** and **\`let\`**.

### \`const\`

Use \`const\` when the variable should not be reassigned.

\`\`\`javascript
const school = 'CodeLearn';
const maxScore = 100;
\`\`\`

This means the variable name must continue pointing to the same value.

\`\`\`javascript
const school = 'CodeLearn';
school = 'Another School'; // Error
\`\`\`

Important clarification: \`const\` does **not** mean the value is frozen forever. It means the **variable binding** cannot be changed.

\`\`\`javascript
const student = { name: 'Amina', score: 75 };
student.score = 80; // allowed
\`\`\`

### \`let\`

Use \`let\` when the value needs to change.

\`\`\`javascript
let progress = 0;
progress = progress + 1;
\`\`\`

### \`var\`

\`var\` is the old way to declare variables. You will still see it in legacy code, but you should avoid it in modern backend projects because its scoping behavior is confusing.

---

## 3. What Is a Data Type?

A **data type** tells the language what kind of value it is dealing with.

In JavaScript, common primitive data types include:

- **string**: text
- **number**: integers and decimal numbers
- **boolean**: true or false
- **undefined**: a variable exists but has no assigned value
- **null**: an intentional empty value

Examples:

\`\`\`javascript
const username = 'Ada';      // string
const age = 21;              // number
const price = 19.99;         // number
const isAdmin = false;       // boolean
let selectedTrack;           // undefined
const profilePhoto = null;   // null
\`\`\`

### Why types matter in backend engineering

Suppose an API receives this value:

\`\`\`javascript
const quantity = '5';
\`\`\`

This looks like a number, but it is actually a **string**. If you treat it as a number without checking, calculations and validation may go wrong.

---

## 4. Strings

A **string** is a sequence of characters used to represent text.

\`\`\`javascript
const firstName = 'Grace';
const lastName = "Hopper";
\`\`\`

### Template literals

Template literals use backticks and allow you to insert variables directly into a string.

\`\`\`javascript
const name = 'David';
const greeting = \`Hello, \${name}\`;
\`\`\`

This is easier to read than joining strings manually.

\`\`\`javascript
const greeting = 'Hello, ' + name;
\`\`\`

### Multi-line strings

\`\`\`javascript
const note = \`This is line one.
This is line two.
This is line three.\`;
\`\`\`

---

## 5. Worked Example: Variables and Types

\`\`\`javascript
const studentName = 'Maya';
let score = 82;
const passed = score >= 50;
const summary = \`\${studentName} scored \${score}\`;

console.log(summary);
console.log(passed);
\`\`\`

### Line-by-line explanation

1. \`const studentName = 'Maya';\`
   This creates a variable called \`studentName\` and stores a string value inside it.

2. \`let score = 82;\`
   This creates a variable called \`score\` and stores a number. We use \`let\` because scores might later be updated.

3. \`const passed = score >= 50;\`
   This compares \`score\` with \`50\`. The result of the comparison is either \`true\` or \`false\`, so \`passed\` is a boolean.

4. \`const summary = \`\${studentName} scored \${score}\`;\`
   This creates a new string using a template literal. The values of \`studentName\` and \`score\` are inserted into the sentence.

5. \`console.log(summary);\`
   This prints the text stored in \`summary\`.

6. \`console.log(passed);\`
   This prints the boolean result.

### Output

\`\`\`text
Maya scored 82
true
\`\`\`

---

## 6. Checking the Type of a Value

JavaScript provides the \`typeof\` operator.

\`\`\`javascript
console.log(typeof 'hello');   // string
console.log(typeof 42);        // number
console.log(typeof true);      // boolean
console.log(typeof undefined); // undefined
console.log(typeof null);      // object (historical JavaScript quirk)
\`\`\`

That last line matters:

\`\`\`javascript
typeof null // "object"
\`\`\`

This is one of JavaScript's historical mistakes. You must remember it.

---

## 7. Common Beginner Mistakes

### Mistake 1: confusing a number with a numeric string

\`\`\`javascript
const a = '5';
const b = 2;
console.log(a + b); // "52"
\`\`\`

Why? Because \`a\` is a string, so JavaScript performs string concatenation.

If you want arithmetic:

\`\`\`javascript
const a = Number('5');
const b = 2;
console.log(a + b); // 7
\`\`\`

### Mistake 2: not distinguishing \`undefined\` from \`null\`

- \`undefined\` usually means no value was assigned
- \`null\` usually means the programmer intentionally set the value to empty

---

## 8. Why This Matters In Real Backend Systems

When building APIs, values often arrive as text:

- query parameters
- form fields
- JSON fields
- environment variables

For example, even \`process.env.PORT\` is a string:

\`\`\`javascript
const port = process.env.PORT;
console.log(typeof port); // string
\`\`\`

So backend developers constantly convert, validate, and check types.

---

## 9. Study Questions

1. What is the difference between a variable name and a value?
2. Why is \`const\` usually preferred over \`let\`?
3. What is the difference between the string \`'5'\` and the number \`5\`?
4. Why is \`typeof null\` considered a JavaScript quirk?
5. Why do backend developers need strong type awareness even in JavaScript?

---

## 10. Exercise

Create a file called \`variables.js\` and do the following:

1. Store your name in a string variable
2. Store your age in a number variable
3. Store whether you are learning backend in a boolean variable
4. Build a sentence using a template literal
5. Print each variable and also print its type using \`typeof\`
6. Convert the string \`'2500'\` into a number and add \`500\`

Then explain, in words, why JavaScript treated \`'2500'\` differently before conversion and after conversion.
`,

    control_flow_nodejs: `
# Control Flow — Conditions & Loops in JavaScript

Control flow is how your program makes **decisions** and **repeats work**. Without it, code runs top-to-bottom in one straight line. Control flow lets you branch (if this, do that) and loop (keep doing this until done).

---

## 1. The if / else Statement

The most basic decision: if a condition is true, run one block; otherwise run another.

\`\`\`javascript
const temperature = 38;

if (temperature > 37.5) {
  console.log('You have a fever. Rest and drink water.');
} else if (temperature === 37.5) {
  console.log('Right on the boundary. Monitor carefully.');
} else {
  console.log('Temperature is normal.');
}
\`\`\`

**Important:** The condition inside \`if()\` is coerced to boolean. JavaScript considers these values **falsy** (treated as false):
- \`false\`
- \`0\`
- \`""\` (empty string)
- \`null\`
- \`undefined\`
- \`NaN\`

Everything else is **truthy**, including \`[]\`, \`{}\`, \`"0"\`, and \`-1\`.

\`\`\`javascript
// Common trap — empty array is truthy!
const items = [];
if (items) {
  console.log('This runs!'); // truthy — array exists even if empty
}
if (items.length) {
  console.log('This does NOT run'); // 0 is falsy
}
\`\`\`

---

## 2. The switch Statement

Use \`switch\` when comparing one value against many specific cases:

\`\`\`javascript
const httpMethod = 'POST';

switch (httpMethod) {
  case 'GET':
    console.log('Fetching data');
    break; // MUST have break or it falls through to next case!
  case 'POST':
    console.log('Creating data');
    break;
  case 'PUT':
  case 'PATCH': // Multiple cases for same result
    console.log('Updating data');
    break;
  case 'DELETE':
    console.log('Deleting data');
    break;
  default:
    console.log('Unknown method');
}
\`\`\`

> **Warning:** Always include \`break\` or \`return\` in each case. Without it, JavaScript "falls through" to the next case even when the current one matches — a very common bug.

---

## 3. The Ternary Operator

A compact one-line if/else, great for simple decisions:

\`\`\`javascript
const age = 20;
const status = age >= 18 ? 'adult' : 'minor';
console.log(status); // "adult"

// Useful in template literals
const user = { name: 'Alice', isPremium: true };
const greeting = \`Hello, \${user.name}!\${user.isPremium ? ' 👑 Premium member.' : ''}\`;

// DON'T nest ternaries — it becomes unreadable
// Bad:
const result = a ? b ? 'x' : 'y' : 'z'; // What does this even mean?
// Good: use if/else for complex logic
\`\`\`

---

## 4. Short-Circuit Evaluation

JavaScript's \`&&\` and \`||\` don't just return \`true\`/\`false\` — they return one of the actual values:

\`\`\`javascript
// && returns the first FALSY value, or the last value if all are truthy
console.log(1 && 2 && 3);     // 3 (all truthy, returns last)
console.log(1 && null && 3);  // null (first falsy)

// || returns the first TRUTHY value
console.log(null || 'fallback');    // "fallback"
console.log('value' || 'fallback'); // "value"

// Real-world use: default values
function greet(name) {
  const displayName = name || 'Anonymous';
  console.log(\`Hello, \${displayName}!\`);
}

// Conditional execution with &&
const isAdmin = true;
isAdmin && console.log('Admin panel loaded'); // only runs if isAdmin is true

// Nullish coalescing ?? — only falls back on null/undefined (not 0 or "")
const count = 0;
console.log(count || 10);  // 10 — wrong! 0 is falsy
console.log(count ?? 10);  // 0  — correct! 0 is a valid value
\`\`\`

---

## 5. Loops

### for loop — when you know how many times to iterate

\`\`\`javascript
// Classic for loop
for (let i = 0; i < 5; i++) {
  console.log(\`Iteration \${i}\`);
}

// Looping over an array by index
const fruits = ['apple', 'banana', 'cherry'];
for (let i = 0; i < fruits.length; i++) {
  console.log(\`\${i + 1}. \${fruits[i]}\`);
}
\`\`\`

### for...of — the modern way to loop over arrays

\`\`\`javascript
const fruits = ['apple', 'banana', 'cherry'];

for (const fruit of fruits) {
  console.log(fruit); // apple, banana, cherry
}

// With index using entries()
for (const [index, fruit] of fruits.entries()) {
  console.log(\`\${index}: \${fruit}\`);
}

// Works on any iterable: strings, Maps, Sets
for (const char of 'hello') {
  console.log(char); // h, e, l, l, o
}
\`\`\`

### for...in — for iterating object keys

\`\`\`javascript
const user = { name: 'Alice', age: 25, role: 'admin' };

for (const key in user) {
  console.log(\`\${key}: \${user[key]}\`);
}
// name: Alice
// age: 25
// role: admin
\`\`\`

### while loop — when condition controls the loop

\`\`\`javascript
let attempts = 0;
const maxAttempts = 3;

while (attempts < maxAttempts) {
  console.log(\`Attempt \${attempts + 1}\`);
  attempts++;
  // In real code: try connecting, break on success
}
\`\`\`

---

## 6. Loop Control — break and continue

\`\`\`javascript
const numbers = [1, 3, 7, 2, 8, 4, 9, 6];

// Find first number > 5, then stop
for (const num of numbers) {
  if (num > 5) {
    console.log(\`Found: \${num}\`); // 7
    break; // exits the loop entirely
  }
}

// Skip even numbers, process only odd
for (const num of numbers) {
  if (num % 2 === 0) continue; // skip to next iteration
  console.log(\`Odd: \${num}\`); // 1, 3, 7, 9
}
\`\`\`

---

## 7. Array Iteration Methods (Prefer over loops)

In modern JavaScript, you rarely write manual \`for\` loops for arrays. Use these:

\`\`\`javascript
const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 17, active: false },
  { name: 'Charlie', age: 30, active: true },
];

// filter — returns new array with items that pass a test
const activeAdults = users.filter(u => u.active && u.age >= 18);
// [{ name: 'Alice'...}, { name: 'Charlie'... }]

// map — transforms each item, returns new array of same length
const names = users.map(u => u.name);
// ['Alice', 'Bob', 'Charlie']

const upperNames = users.map(u => u.name.toUpperCase());
// ['ALICE', 'BOB', 'CHARLIE']

// find — returns first item that matches (or undefined)
const alice = users.find(u => u.name === 'Alice');

// some — returns true if ANY item matches
const hasMinors = users.some(u => u.age < 18); // true

// every — returns true if ALL items match
const allActive = users.every(u => u.active); // false

// reduce — accumulate to a single value
const totalAge = users.reduce((sum, u) => sum + u.age, 0); // 72

// Chain them together
const result = users
  .filter(u => u.active)
  .map(u => u.name)
  .sort();
// ['Alice', 'Charlie']
\`\`\`

---

## 8. Common Mistakes

\`\`\`javascript
// ❌ Using = instead of === in conditions
if (x = 5) { } // This ASSIGNS 5 to x and always runs!
if (x === 5) { } // ✅ This COMPARES

// ❌ Off-by-one errors
for (let i = 0; i <= arr.length; i++) { // arr[arr.length] is undefined!
  arr[i].doSomething(); // TypeError on last iteration
}
for (let i = 0; i < arr.length; i++) { } // ✅

// ❌ Modifying array while iterating
const items = [1, 2, 3, 4, 5];
for (const item of items) {
  if (item === 3) items.push(6); // Can cause infinite loops or skipped items
}
// ✅ Work on a copy instead
for (const item of [...items]) { }
\`\`\`

---

## 9. Exercise

Build a Node.js script \`control-flow.js\` that solves these tasks:

1. **Grade calculator**: Given an array of scores \`[72, 45, 88, 95, 61, 30]\`, use a loop and if/else to assign a letter grade (A=90+, B=80-89, C=70-79, D=60-69, F=below 60). Log each score and its grade.

2. **FizzBuzz** (classic interview): Loop from 1 to 50. If divisible by 3, print "Fizz". If divisible by 5, print "Buzz". If divisible by both 3 and 5, print "FizzBuzz". Otherwise print the number.

3. **User filter**: Given the users array from section 7, use \`.filter()\`, \`.map()\`, and \`.reduce()\` to:
   - Get names of all active users over 18
   - Calculate the average age of all users
   - Find if any user is named "Bob"

4. **Early exit**: Write a function \`findProduct(products, id)\` that loops through a products array and returns the product with the matching id, or \`null\` if not found. Use \`break\` (or \`find\`).

Run with \`node control-flow.js\` and submit your file.
`,

    functions_nodejs: `
# Functions, Scope & Closures in JavaScript

Functions are the fundamental building blocks of JavaScript. They let you name and reuse blocks of logic, keep code DRY (Don't Repeat Yourself), and create powerful patterns like closures and higher-order functions.

---

## 1. Function Declarations vs Expressions vs Arrow Functions

JavaScript has three main ways to define a function:

\`\`\`javascript
// 1. Function Declaration — hoisted (can call BEFORE definition)
function add(a, b) {
  return a + b;
}
console.log(add(2, 3)); // 5

// 2. Function Expression — NOT hoisted, stored in a variable
const multiply = function(a, b) {
  return a * b;
};

// 3. Arrow Function (ES6+) — concise, no own 'this'
const divide = (a, b) => a / b;       // implicit return (one expression)
const square = n => n * n;             // single param, no parentheses needed
const greet = () => 'Hello!';          // no params
const logger = (msg) => {              // block body with explicit return
  console.log(\`[LOG] \${msg}\`);
  return true;
};
\`\`\`

**When to use which:**
- Use **arrow functions** for callbacks and short utilities (most common in modern JS)
- Use **function declarations** for named top-level functions (easier to read in stack traces)
- Use **function expressions** when assigning to a variable conditionally

---

## 2. Parameters & Arguments

\`\`\`javascript
// Default parameters
function createUser(name, role = 'student', active = true) {
  return { name, role, active };
}
createUser('Alice');           // { name: 'Alice', role: 'student', active: true }
createUser('Bob', 'admin');    // { name: 'Bob', role: 'admin', active: true }

// Rest parameters — collect remaining args into an array
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
sum(1, 2, 3, 4, 5); // 15

// Destructuring parameters — extract directly from objects
function displayUser({ name, age, role = 'viewer' }) {
  console.log(\`\${name} (\${age}) — \${role}\`);
}
displayUser({ name: 'Alice', age: 25, role: 'admin' });

// Spread operator — pass array elements as separate args
const nums = [1, 2, 3];
console.log(Math.max(...nums)); // 3
\`\`\`

---

## 3. Scope — Where Variables Live

Scope determines where a variable can be accessed.

\`\`\`javascript
// Global scope — accessible everywhere (avoid polluting this)
const APP_NAME = 'CodeLearn';

function outer() {
  const x = 10; // function scope — only inside outer()

  function inner() {
    const y = 20; // block/function scope — only inside inner()
    console.log(x); // ✅ can access parent scope (closure)
    console.log(y); // ✅ can access own scope
    console.log(APP_NAME); // ✅ can access global
  }

  inner();
  console.log(x); // ✅
  // console.log(y); // ❌ ReferenceError — y is not defined here
}

// Block scope with let and const
{
  let blockVar = 'only here';
  const blockConst = 'also only here';
  var leaky = 'I escape the block!'; // var ignores block scope!
}
// console.log(blockVar);  // ❌ ReferenceError
// console.log(blockConst);// ❌ ReferenceError
console.log(leaky);         // ✅ "I escape the block!" — var is function-scoped
\`\`\`

---

## 4. Closures

A closure is when a function "remembers" its surrounding scope even after that scope has finished executing. This is one of JavaScript's most powerful features.

\`\`\`javascript
// Simple closure example
function makeCounter(startValue = 0) {
  let count = startValue; // this variable is "closed over"

  return {
    increment() { count++; },
    decrement() { count--; },
    getCount() { return count; },
    reset() { count = startValue; }
  };
}

const counter = makeCounter(10);
counter.increment(); // count = 11
counter.increment(); // count = 12
counter.decrement(); // count = 11
console.log(counter.getCount()); // 11
// count itself is PRIVATE — can only be accessed through the returned methods

// Real-world: creating specialized functions
function createMultiplier(factor) {
  return (number) => number * factor; // factor stays in memory via closure
}
const double = createMultiplier(2);
const triple = createMultiplier(3);
console.log(double(5));  // 10
console.log(triple(5));  // 15

// Real-world: rate-limiting API calls
function rateLimiter(fn, delayMs) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      lastCall = now;
      return fn(...args);
    }
    console.log('Rate limited! Try again later.');
  };
}
\`\`\`

---

## 5. Higher-Order Functions

A higher-order function either **takes a function as an argument** or **returns a function**. They're everywhere in JavaScript.

\`\`\`javascript
// Taking a function as argument
function applyOperation(a, b, operation) {
  return operation(a, b);
}
applyOperation(10, 3, (a, b) => a + b); // 13
applyOperation(10, 3, (a, b) => a * b); // 30

// forEach, map, filter, reduce are all HOFs
[1, 2, 3].map(n => n * 2);        // [2, 4, 6]
[1, 2, 3].filter(n => n > 1);     // [2, 3]
[1, 2, 3].reduce((a, b) => a + b); // 6

// Returning a function — function factory
function createValidator(minLength) {
  return function(str) {
    if (typeof str !== 'string') return { valid: false, error: 'Must be a string' };
    if (str.length < minLength) return { valid: false, error: \`Must be at least \${minLength} chars\` };
    return { valid: true };
  };
}
const validatePassword = createValidator(8);
const validateUsername = createValidator(3);

console.log(validatePassword('abc'));      // { valid: false, error: 'Must be at least 8 chars' }
console.log(validatePassword('secure123')); // { valid: true }
\`\`\`

---

## 6. Callbacks and the Event Loop Preview

\`\`\`javascript
// Synchronous callback — runs immediately
[1, 2, 3].forEach(n => console.log(n)); // all run now

// Asynchronous callback — runs later
setTimeout(() => {
  console.log('I run after 1 second');
}, 1000);

console.log('I run immediately'); // this logs FIRST

// Output order:
// "I run immediately"
// (1 second passes)
// "I run after 1 second"

// Callbacks in Node.js file system (old style)
const fs = require('fs');
fs.readFile('data.txt', 'utf8', (error, data) => {
  if (error) {
    console.error('Failed to read file:', error.message);
    return;
  }
  console.log('File contents:', data);
});
// Code continues here WHILE file is being read (non-blocking!)
console.log('Reading file... (this runs before the file is done!)');
\`\`\`

---

## 7. Pure Functions vs Side Effects

\`\`\`javascript
// PURE function — same inputs always give same output, no side effects
function calculateTax(amount, rate) {
  return amount * rate; // only depends on its inputs
}

// IMPURE — depends on external state (side effect)
let taxRate = 0.1;
function calculateTaxImpure(amount) {
  return amount * taxRate; // result changes if taxRate changes
}

// IMPURE — modifies external state (side effect)
const log = [];
function addToLog(message) {
  log.push(message); // modifies external array
}

// Writing pure functions makes your code:
// - Predictable and easy to test
// - Safe to run in parallel
// - Easy to reason about

// In backend APIs: pure functions for business logic,
// side effects only at the boundaries (DB calls, file writes, etc.)
\`\`\`

---

## 8. Exercise

Create a file \`functions.js\`:

1. **Calculator factory**: Write a \`createCalculator()\` function that returns an object with \`add(n)\`, \`subtract(n)\`, \`multiply(n)\`, \`divide(n)\`, and \`result()\` methods. Each operation should update an internal value (use closure). Chain operations: \`createCalculator().add(5).multiply(3).subtract(4).result()\` should equal 11.

2. **Data pipeline**: Given this array:
\`\`\`javascript
const orders = [
  { id: 1, product: 'Book', price: 25, quantity: 2, paid: true },
  { id: 2, product: 'Pen', price: 3, quantity: 10, paid: false },
  { id: 3, product: 'Laptop', price: 1200, quantity: 1, paid: true },
  { id: 4, product: 'Mouse', price: 45, quantity: 3, paid: true },
];
\`\`\`
   Use chained \`filter()\`, \`map()\`, and \`reduce()\` to find the **total revenue** from paid orders (price × quantity).

3. **Memoization**: Write a \`memoize(fn)\` function that caches the result of a slow function. Test it with a \`slowSquare(n)\` function that uses \`setTimeout\`-style delay via a counter (no actual timing needed — just track if it ran twice with same args).

Submit \`functions.js\` with all three solutions.
`,

    data_structures_nodejs: `
# Data Structures — Arrays, Objects & Maps in JavaScript

JavaScript's core data structures are the containers you'll use constantly in backend development. Understanding their strengths, weaknesses, and the right methods to use will make your code cleaner and more efficient.

---

## 1. Arrays — Ordered Collections

Arrays hold ordered lists of items and provide powerful built-in methods.

\`\`\`javascript
// Creating arrays
const empty = [];
const numbers = [1, 2, 3, 4, 5];
const mixed = [1, 'hello', true, null, { name: 'Alice' }]; // JavaScript allows mixed types
const matrix = [[1, 2], [3, 4], [5, 6]]; // Nested (2D) arrays

// Access
console.log(numbers[0]);      // 1 (first element)
console.log(numbers.at(-1));  // 5 (last element — modern way)
console.log(numbers.length);  // 5

// Modifying
numbers.push(6);       // Add to end → [1,2,3,4,5,6]
numbers.pop();         // Remove from end → returns 6
numbers.unshift(0);    // Add to start → [0,1,2,3,4,5]
numbers.shift();       // Remove from start → returns 0
numbers.splice(2, 1);  // Remove 1 item at index 2 → [1,2,4,5]
numbers.splice(2, 0, 3); // Insert 3 at index 2 (remove 0) → [1,2,3,4,5]
\`\`\`

### The Essential Array Methods

\`\`\`javascript
const products = [
  { id: 1, name: 'Laptop', price: 999, category: 'Electronics', inStock: true },
  { id: 2, name: 'Book', price: 25, category: 'Education', inStock: true },
  { id: 3, name: 'Phone', price: 699, category: 'Electronics', inStock: false },
  { id: 4, name: 'Desk', price: 299, category: 'Furniture', inStock: true },
];

// map — transform each element
const productNames = products.map(p => p.name);
// ['Laptop', 'Book', 'Phone', 'Desk']

const withDiscount = products.map(p => ({
  ...p,
  discountPrice: (p.price * 0.9).toFixed(2) // 10% off
}));

// filter — select elements matching a condition
const inStock = products.filter(p => p.inStock);
const electronics = products.filter(p => p.category === 'Electronics');
const affordable = products.filter(p => p.price < 300 && p.inStock);

// find — first match (or undefined)
const laptop = products.find(p => p.id === 1);
const notFound = products.find(p => p.id === 99); // undefined

// findIndex — index of first match (or -1)
const laptopIndex = products.findIndex(p => p.id === 1); // 0

// reduce — accumulate to single value
const totalValue = products.reduce((sum, p) => sum + p.price, 0); // 2022
const byCategory = products.reduce((groups, product) => {
  const cat = product.category;
  if (!groups[cat]) groups[cat] = [];
  groups[cat].push(product);
  return groups;
}, {});
// { Electronics: [...], Education: [...], Furniture: [...] }

// sort — sorts IN PLACE (modifies original array!)
const byPrice = [...products].sort((a, b) => a.price - b.price); // ascending
const byPriceDesc = [...products].sort((a, b) => b.price - a.price); // descending
const byName = [...products].sort((a, b) => a.name.localeCompare(b.name)); // alphabetical

// includes / indexOf — membership testing
[1, 2, 3].includes(2);     // true
[1, 2, 3].indexOf(2);      // 1
['a','b'].indexOf('c');     // -1

// flat / flatMap
const nested = [[1, 2], [3, 4], [5]];
nested.flat(); // [1, 2, 3, 4, 5]

const sentences = ['Hello World', 'Foo Bar'];
sentences.flatMap(s => s.split(' ')); // ['Hello', 'World', 'Foo', 'Bar']
\`\`\`

---

## 2. Objects — Key-Value Collections

\`\`\`javascript
// Object creation patterns
const user1 = { name: 'Alice', age: 25 }; // Object literal (most common)

function createProduct(name, price) {   // Constructor function
  return { name, price, id: Date.now() }; // shorthand property names
}

// Property access
const book = { title: 'Clean Code', author: 'Martin', year: 2008 };
book.title;           // 'Clean Code' — dot notation
book['author'];       // 'Martin' — bracket notation (use for dynamic keys)

const key = 'year';
book[key];            // 2008 — dynamic property access

// Optional chaining — safe nested access
const config = { database: { host: 'localhost' } };
config?.database?.host;  // 'localhost'
config?.cache?.host;     // undefined (no error!)
config?.database?.port ?? 5432; // 5432 (default via nullish coalescing)

// Adding, updating, deleting
const obj = { a: 1, b: 2 };
obj.c = 3;       // add
obj.a = 10;      // update
delete obj.b;    // delete

// Checking existence
'a' in obj;           // true
obj.hasOwnProperty('a'); // true
obj.x !== undefined;  // true/false (but fails if value IS undefined)
\`\`\`

### Object Manipulation

\`\`\`javascript
const user = { id: 1, name: 'Alice', email: 'alice@example.com', password: 'hashed_pw' };

// Destructuring
const { name, email } = user;
const { name: userName, ...rest } = user; // rename + collect rest

// Spread — copy/merge
const userCopy = { ...user };                    // shallow copy
const updated = { ...user, name: 'Bob' };        // update one field
const merged = { ...defaults, ...userConfig };   // merge (userConfig wins)

// Object.keys/values/entries — iterate over objects
const scores = { Alice: 95, Bob: 82, Charlie: 78 };
Object.keys(scores);    // ['Alice', 'Bob', 'Charlie']
Object.values(scores);  // [95, 82, 78]
Object.entries(scores); // [['Alice', 95], ['Bob', 82], ['Charlie', 78]]

// Convert entries back to object
const doubled = Object.fromEntries(
  Object.entries(scores).map(([name, score]) => [name, score * 2])
);

// Remove a key safely (without mutation)
const { password, ...safeUser } = user; // exclude password from API response
\`\`\`

---

## 3. Map — Keyed Collection with Any Key Type

\`\`\`javascript
// Unlike objects, Map keys can be ANY type (objects, functions, etc.)
// Also maintains insertion order and has better performance for frequent add/remove

const userSessions = new Map();

// set / get / has / delete / size
userSessions.set('user_123', { token: 'abc', expires: Date.now() + 3600000 });
userSessions.set('user_456', { token: 'xyz', expires: Date.now() + 3600000 });

userSessions.get('user_123'); // { token: 'abc', expires: ... }
userSessions.has('user_789'); // false
userSessions.delete('user_123');
userSessions.size;            // 1

// Iterating a Map
for (const [userId, session] of userSessions) {
  console.log(\`\${userId}: \${session.token}\`);
}

// Convert between Map and Array/Object
const mapFromArray = new Map([['a', 1], ['b', 2]]);
const arrayFromMap = [...userSessions.entries()];

// Use Map when:
// - Keys are not strings/symbols
// - You need insertion order guaranteed
// - Frequent additions/removals
// - Need to count items efficiently

// Counting word frequency with Map
const text = 'the quick brown fox jumps over the lazy fox';
const wordCount = new Map();
for (const word of text.split(' ')) {
  wordCount.set(word, (wordCount.get(word) || 0) + 1);
}
// Map { 'the' => 2, 'quick' => 1, ..., 'fox' => 2 }
\`\`\`

---

## 4. Set — Unique Value Collections

\`\`\`javascript
// Set stores unique values only — great for deduplication
const tags = new Set(['javascript', 'nodejs', 'backend', 'javascript']); // duplicate removed
console.log(tags); // Set { 'javascript', 'nodejs', 'backend' }
console.log(tags.size); // 3

tags.add('typescript');
tags.has('nodejs');   // true
tags.delete('backend');

// The most common use: remove duplicates from array
const rawScores = [5, 3, 5, 8, 3, 9, 8, 1];
const unique = [...new Set(rawScores)]; // [5, 3, 8, 9, 1]

// Set operations (not built-in, but easy to implement)
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

const union = new Set([...a, ...b]);         // {1,2,3,4,5,6}
const intersection = new Set([...a].filter(x => b.has(x))); // {3,4}
const difference = new Set([...a].filter(x => !b.has(x)));  // {1,2}
\`\`\`

---

## 5. Choosing the Right Structure

| Use Case | Best Structure |
|----------|---------------|
| Ordered list of items | \`Array\` |
| Named properties on an entity | \`Object\` |
| Counting/lookup with string keys | \`Object\` or \`Map\` |
| Any key type needed | \`Map\` |
| Frequent add/remove by key | \`Map\` |
| Unique values, deduplication | \`Set\` |
| Membership testing (fast) | \`Set\` |

---

## 6. Exercise

Create \`data-structures.js\`:

1. **Inventory system**: Start with an array of products. Write functions to:
   - \`addProduct(products, product)\` — returns new array with product added
   - \`removeProduct(products, id)\` — returns array without that product
   - \`updatePrice(products, id, newPrice)\` — returns array with updated price
   - \`getByCategory(products, category)\` — returns filtered, sorted by price
   - \`getTotalValue(products)\` — sum of price × stock quantity

2. **Frequency counter**: Write \`mostFrequent(array)\` that uses a \`Map\` to count and return the most frequently occurring element.

3. **Unique emails**: Given an array of user objects (some with duplicate emails), use a \`Set\` to return only users with unique emails (keep first occurrence).

4. **Group by**: Write \`groupBy(array, key)\` that groups array items into an object by the value of the given key.

Submit \`data-structures.js\`.
`,

    oop_nodejs: `
# Object-Oriented Programming — Classes & Inheritance in JavaScript

OOP is a way of organising code around "objects" that bundle together data (properties) and behaviour (methods). JavaScript uses a prototype-based system under the hood but provides a \`class\` syntax that feels familiar to developers from Python, Java, or Ruby.

---

## 1. Classes — The Blueprint

\`\`\`javascript
class User {
  // Constructor — runs when you do: new User(...)
  constructor(name, email, role = 'student') {
    this.name = name;       // instance properties
    this.email = email;
    this.role = role;
    this.createdAt = new Date();
    this.#password = null;  // private field (only accessible within class)
  }

  // Private field declaration (must declare at top)
  #password;

  // Instance method — available on every User object
  greet() {
    return \`Hi, I'm \${this.name} (\${this.role})\`;
  }

  // Getter — access like a property but runs code
  get displayName() {
    return \`\${this.name} <\${this.email}>\`;
  }

  // Setter — validates before setting
  set password(raw) {
    if (raw.length < 8) throw new Error('Password too short');
    this.#password = raw; // in real code: store hashed version
  }

  setPassword(raw) {
    this.password = raw;
  }

  // Static method — belongs to CLASS, not instances
  static createAdmin(name, email) {
    return new User(name, email, 'admin');
  }

  // Convert to plain object (useful for API responses)
  toJSON() {
    return {
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
    };
  }

  toString() {
    return this.displayName;
  }
}

// Usage
const alice = new User('Alice', 'alice@example.com');
console.log(alice.greet());       // "Hi, I'm Alice (student)"
console.log(alice.displayName);   // "Alice <alice@example.com>"
alice.setPassword('secure123');

const admin = User.createAdmin('Bob', 'bob@example.com'); // static method
console.log(admin.role); // "admin"
\`\`\`

---

## 2. Inheritance — extends and super

\`\`\`javascript
class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
    this.alive = true;
  }

  speak() {
    return \`\${this.name} says \${this.sound}\`;
  }

  describe() {
    return \`I am \${this.name}\`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name, 'Woof'); // MUST call super() first in constructor
    this.breed = breed;
  }

  // Override parent method
  speak() {
    return \`\${super.speak()}!\`; // call parent version then extend it
  }

  fetch(item) {
    return \`\${this.name} fetches the \${item}!\`;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name, 'Meow');
  }

  purr() {
    return \`Prrrr...\`;
  }
}

const dog = new Dog('Rex', 'Labrador');
console.log(dog.speak());    // "Rex says Woof!"
console.log(dog.describe()); // "I am Rex" (inherited from Animal)
console.log(dog.fetch('ball')); // "Rex fetches the ball!"

console.log(dog instanceof Dog);    // true
console.log(dog instanceof Animal); // true — inheritance chain
\`\`\`

---

## 3. Real-World OOP: API Error Classes

\`\`\`javascript
// Base error class
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name; // "NotFoundError", "ValidationError", etc.
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // vs programming bugs
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(\`\${resource} with id '\${id}' not found\`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

class ValidationError extends AppError {
  constructor(field, message) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }

  toJSON() {
    return { ...super.toJSON(), field: this.field };
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Usage in Express
app.get('/users/:id', (req, res, next) => {
  const user = db.findUser(req.params.id);
  if (!user) return next(new NotFoundError('User', req.params.id));
  res.json(user);
});

app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }
  // Unknown error — don't leak details
  res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong' });
});
\`\`\`

---

## 4. Composition over Inheritance

Inheritance can get complicated fast. Modern JavaScript often favours **composition** — mixing objects together:

\`\`\`javascript
// Mixins — reusable behaviour blocks
const Serializable = {
  toJSON() {
    return Object.fromEntries(
      Object.entries(this).filter(([key]) => !key.startsWith('_'))
    );
  },
  toString() {
    return JSON.stringify(this.toJSON());
  }
};

const Timestamped = {
  initTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  },
  touch() {
    this.updatedAt = new Date();
  }
};

class Post {
  constructor(title, content, authorId) {
    this.title = title;
    this.content = content;
    this.authorId = authorId;
    this.initTimestamps(); // from mixin
  }
}

// Apply mixins
Object.assign(Post.prototype, Serializable, Timestamped);

const post = new Post('My First Post', 'Hello World', 'user_1');
console.log(post.toJSON());
post.touch(); // updates updatedAt
\`\`\`

---

## 5. Exercise

Create \`oop.js\` with a complete bank account system:

1. **Base class \`BankAccount\`** with:
   - Private \`#balance\` field
   - Constructor takes \`owner\`, \`accountNumber\`, \`initialBalance\`
   - \`deposit(amount)\` — validates positive amount, adds to balance, returns new balance
   - \`withdraw(amount)\` — validates amount and sufficient funds, throws custom \`InsufficientFundsError\` if needed
   - \`get balance()\` — getter for balance
   - \`toString()\` — returns \`"[accountNumber]: £balance"\`
   - Private \`#transactionHistory\` array with \`getHistory()\` method

2. **\`SavingsAccount extends BankAccount\`** with:
   - Additional \`interestRate\` property
   - \`applyInterest()\` — adds interest to balance, records transaction
   - Maximum 3 withdrawals per month (track and enforce)

3. **\`InsufficientFundsError extends Error\`** with \`amount\` (what was attempted) and \`available\` (what was in account)

Test all edge cases: negative deposits, over-withdrawals, interest calculation.
`,

    error_handling_nodejs: `
# Error Handling & Debugging in JavaScript

Errors are inevitable. What separates a junior developer from a senior one isn't whether they encounter errors — it's how well they anticipate, catch, and communicate them. Good error handling makes your application resilient, debuggable, and trustworthy.

---

## 1. Types of Errors in JavaScript

\`\`\`javascript
// SyntaxError — invalid code, caught before running
const x = ; // SyntaxError: Unexpected token

// ReferenceError — using variable that doesn't exist
console.log(undeclaredVar); // ReferenceError: undeclaredVar is not defined

// TypeError — wrong type operation
null.toString();     // TypeError: Cannot read properties of null
(5).toUpperCase();   // TypeError: toUpperCase is not a function

// RangeError — value out of allowed range
new Array(-1);       // RangeError: Invalid array length

// Custom errors you create and throw yourself
throw new Error('Something went wrong');
\`\`\`

---

## 2. try / catch / finally

\`\`\`javascript
function parseUserInput(rawJson) {
  try {
    const data = JSON.parse(rawJson); // might throw SyntaxError
    if (!data.name) {
      throw new Error('name field is required'); // your own error
    }
    return data;
  } catch (error) {
    // error is an Error object with .message and .stack
    console.error('Failed to parse input:', error.message);

    // Re-throw if you can't handle it here
    if (error instanceof SyntaxError) {
      throw new Error(\`Invalid JSON: \${error.message}\`);
    }

    throw error; // let it bubble up
  } finally {
    // ALWAYS runs — whether error occurred or not
    // Use for cleanup: closing connections, releasing locks
    console.log('parseUserInput finished (with or without error)');
  }
}

// Catching specific error types
try {
  dangerousOperation();
} catch (error) {
  if (error instanceof TypeError) {
    // Handle type error specifically
  } else if (error instanceof RangeError) {
    // Handle range error
  } else {
    throw error; // anything else: re-throw
  }
}
\`\`\`

---

## 3. Custom Error Classes

\`\`\`javascript
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class DatabaseError extends Error {
  constructor(message, query) {
    super(message);
    this.name = 'DatabaseError';
    this.query = query;
    this.statusCode = 500;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(\`\${resource} '\${id}' not found\`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

// Usage
function getUser(id) {
  if (!id) throw new ValidationError('User ID is required', 'id');
  const user = db.find(id);
  if (!user) throw new NotFoundError('User', id);
  return user;
}
\`\`\`

---

## 4. Async Error Handling

\`\`\`javascript
// ❌ Wrong — .catch() missing
async function fetchData() {
  const response = await fetch('https://api.example.com/data'); // could fail
  const data = await response.json();
  return data;
}

// ✅ With try/catch in async function
async function fetchDataSafe() {
  try {
    const response = await fetch('https://api.example.com/data');

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Fetch failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Promise chain error handling
fetch('/api/users')
  .then(res => {
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return res.json();
  })
  .then(users => console.log(users))
  .catch(err => console.error('Error:', err.message)) // catches ALL errors above
  .finally(() => console.log('Done'));

// Express async error handling — wrap handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next); // passes error to Express error handler
  };
}

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await UserService.findById(req.params.id); // throws if not found
  res.json(user);
}));
\`\`\`

---

## 5. Debugging Techniques

\`\`\`javascript
// console methods for debugging
console.log('Basic output');
console.error('Error details');                 // shows in red
console.warn('Warning');                        // shows in yellow
console.table([{ name: 'Alice' }, { name: 'Bob' }]); // tabular format
console.time('operation');                      // start timer
// ... code ...
console.timeEnd('operation');                   // "operation: 12.345ms"
console.trace('Where am I?');                   // prints the call stack
console.dir(obj, { depth: null });              // deep object inspection

// Node.js debugger
// In package.json scripts: "debug": "node --inspect server.js"
// Then open Chrome → chrome://inspect

// Structured logging (production)
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date() })),
  error: (msg, error, meta = {}) => console.error(JSON.stringify({
    level: 'error', msg,
    error: { message: error.message, stack: error.stack },
    ...meta,
    timestamp: new Date()
  })),
};

logger.info('User logged in', { userId: 'user_123', ip: '127.0.0.1' });
logger.error('DB connection failed', dbError, { attempt: 3 });
\`\`\`

---

## 6. Error Handling Patterns in APIs

\`\`\`javascript
// Centralised error handler in Express
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log error with context
  console.error({
    error: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
  });

  // Send appropriate response
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: statusCode < 500 ? err.message : 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // crash so process manager can restart
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
\`\`\`

---

## 7. Exercise

Create \`error-handling.js\`:

1. **Validation function**: Write \`parseConfig(rawJson)\` that:
   - Parses JSON (catches \`SyntaxError\` and throws a friendlier \`ConfigError\`)
   - Validates that \`port\` (1-65535), \`host\` (non-empty string), and \`dbUrl\` (starts with "postgres://") exist
   - Throws \`ValidationError\` with the specific field name for each failure
   - Returns the validated config object on success

2. **Retry mechanism**: Write \`withRetry(asyncFn, maxRetries = 3, delayMs = 1000)\` that:
   - Calls \`asyncFn()\`
   - On failure, waits \`delayMs\` then tries again
   - After \`maxRetries\` failures, throws a final error with attempt count
   - Logs each attempt with attempt number

3. **Result type**: Implement a \`Result\` class with static \`ok(value)\` and \`err(error)\` constructors and \`isOk\`, \`isErr\`, \`unwrap()\`, \`unwrapOr(default)\` methods — a safe alternative to throwing for expected failures.

Test all paths including the error cases.
`,

    modules_packages_nodejs: `
# Modules, Packages & Dependency Management in JavaScript

Every professional Node.js project is built from modules — files that export functionality, imported by other files that need it. Understanding the module system is essential because **everything** in Node.js is a module.

---

## 1. CommonJS (CJS) — The Original Node.js Module System

\`\`\`javascript
// math.js — exporting
const PI = 3.14159;

function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }

// Named exports
module.exports = { add, subtract, multiply, PI };

// OR: export one thing as default
module.exports = function connectDB(url) { /* ... */ };
\`\`\`

\`\`\`javascript
// app.js — importing
const { add, subtract, PI } = require('./math'); // destructure what you need
const connectDB = require('./db');               // default export

// Node.js built-in modules (no path prefix needed)
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

console.log(add(2, 3));  // 5
console.log(PI);         // 3.14159

// path module examples
path.join('/home', 'user', 'file.txt');  // '/home/user/file.txt'
path.resolve('./data');                   // absolute path from cwd
path.extname('index.html');               // '.html'
path.basename('/path/to/file.js');        // 'file.js'
\`\`\`

---

## 2. ES Modules (ESM) — The Modern Standard

\`\`\`javascript
// In package.json add: "type": "module"
// OR use .mjs extension

// math.mjs — exporting
export const PI = 3.14159;
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

export default class Calculator {
  add(a, b) { return a + b; }
}
\`\`\`

\`\`\`javascript
// app.mjs — importing
import { add, subtract, PI } from './math.mjs';  // named imports
import Calculator from './math.mjs';              // default import
import * as MathUtils from './math.mjs';          // import everything as namespace

// Dynamic import — load module lazily (useful for code splitting)
const module = await import('./heavy-module.mjs');

// Importing JSON (Node.js 18+)
import config from './config.json' assert { type: 'json' };
\`\`\`

---

## 3. package.json — Your Project's DNA

\`\`\`json
{
  "name": "my-api",
  "version": "1.0.0",
  "description": "A REST API built with Node.js",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "lint": "eslint src/",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0",
    "eslint": "^8.45.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
\`\`\`

**Versioning explained:**
- \`^4.18.2\` — compatible with 4.x.x (minor/patch updates OK, major not)
- \`~4.18.2\` — only patch updates allowed (4.18.x)
- \`4.18.2\`  — exact version only

---

## 4. npm Commands You Use Every Day

\`\`\`bash
# Initialise a new project
npm init -y              # -y accepts all defaults

# Install packages
npm install express      # install as dependency
npm install -D nodemon   # install as devDependency (--save-dev)
npm install -g nodemon   # install globally (avoid for project deps)

# Install everything from package.json (fresh clone)
npm install              # or: npm ci (faster, exact versions)

# Uninstall
npm uninstall express

# Update packages
npm update              # update within semver constraints
npm outdated            # see what's outdated

# Check for security vulnerabilities
npm audit
npm audit fix           # auto-fix where possible

# Run scripts
npm start
npm run dev
npm test
npm run lint

# Inspect installed packages
npm list                # tree of all installed packages
npm list --depth=0      # only direct dependencies
npm info express        # info about a package from registry

# npm environment
npm config get prefix   # where global packages are installed
npm config list         # all npm config settings
\`\`\`

---

## 5. Understanding node_modules and package-lock.json

\`\`\`
project/
├── node_modules/        # ALL installed packages (never commit this!)
│   ├── express/
│   ├── lodash/
│   └── ...
├── src/
│   ├── server.js
│   └── utils/
├── package.json         # YOUR declared dependencies
├── package-lock.json    # EXACT tree of what's installed (commit this!)
└── .gitignore           # must include: node_modules/
\`\`\`

**package-lock.json**: Records the exact version of every package (and their dependencies) that was installed. This ensures everyone on your team gets the same packages when they run \`npm install\`.

\`\`\`bash
# .gitignore (always include these)
node_modules/
.env
.env.local
dist/
build/
*.log
\`\`\`

---

## 6. Creating Your Own Module Structure

\`\`\`javascript
// src/
// ├── server.js          — entry point
// ├── routes/
// │   ├── index.js       — combines all routes
// │   ├── users.js
// │   └── products.js
// ├── controllers/
// │   ├── userController.js
// │   └── productController.js
// ├── services/
// │   ├── userService.js  — business logic
// │   └── emailService.js
// ├── models/
// │   └── User.js        — data shape / DB interaction
// ├── middleware/
// │   ├── auth.js
// │   └── errorHandler.js
// └── utils/
//     ├── logger.js
//     └── validators.js

// routes/users.js
const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getUsers);
router.get('/:id', authenticate, getUserById);
router.post('/', createUser);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

module.exports = router;

// server.js
const express = require('express');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
\`\`\`

---

## 7. Popular npm Packages You'll Use

| Package | Purpose |
|---------|---------|
| \`express\` | Web framework |
| \`dotenv\` | Load .env files |
| \`bcryptjs\` | Password hashing |
| \`jsonwebtoken\` | JWT auth |
| \`joi\` / \`zod\` | Input validation |
| \`prisma\` | Database ORM |
| \`axios\` | HTTP client |
| \`nodemailer\` | Send emails |
| \`multer\` | File uploads |
| \`winston\` | Logging |
| \`jest\` | Testing |
| \`nodemon\` | Auto-restart (dev) |
| \`cors\` | CORS middleware |
| \`helmet\` | Security headers |

---

## 8. Exercise

Restructure or build a modular Node.js project:

1. **Project setup**: Initialise a new project with \`npm init -y\`. Install \`express\`, \`dotenv\` as dependencies and \`nodemon\` as a devDependency. Add \`dev\` and \`start\` scripts.

2. **Module structure**: Create the folder layout from Section 6 above. Implement:
   - \`utils/logger.js\` — exports a \`logger\` object with \`info\` and \`error\` methods that log JSON with a timestamp
   - \`middleware/errorHandler.js\` — exports the global Express error handler
   - \`routes/products.js\` — 4 CRUD routes using an in-memory array
   - \`server.js\` — ties everything together

3. **Write a custom module**: Create \`utils/paginate.js\` that exports a \`paginate(array, page, limit)\` function returning \`{ data, total, page, totalPages }\`.

Submit the full project folder (zip it up) or share the file contents.
`,
};
