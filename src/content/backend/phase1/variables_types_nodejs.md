# Variables, Data Types & Operators in JavaScript (Node.js)

In backend development, understanding how JavaScript handles variables, data types, and operators is foundational. This knowledge prevents runtime errors, improves data integrity, and enables you to write more predictable, maintainable Node.js services. The examples below cover declarations, primitive and composite data types, coercion, and common operator patterns you’ll use daily when building microservices, APIs, and data-processing pipelines.

## 1. Variables, Scopes, and Declarations

JavaScript offers var, let, and const for declaring variables. Var has function scope and hoisting behavior that can surprise developers. Let and const have block scope, with const ensuring the binding cannot be reassigned. Understanding these differences helps prevent bugs in module boundaries, closures, and asynchronous code.

```js
// Demonstrating var hoisting
console.log("var a before declaration:", a);
var a = 10;
console.log("var a after declaration:", a);

// Demonstrating let temporal dead zone (TDZ)
try {
  console.log("let b before declaration:", b);
} catch (e) {
  console.log("Error accessing 'b' before initialization:", e.message);
}
let b = 20;
console.log("let b after declaration:", b);

// Demonstrating const
const PI = 3.14159;
console.log("const PI:", PI);

// The following line would throw if uncommented (since const cannot be reassigned)
// PI = 3;
```

### Line-by-line explanation
- console.log("var a before declaration:", a); — Accessing var-declared a before its declaration yields undefined due to hoisting.
- var a = 10; — Declares a with function scope and initializes it to 10.
- console.log("var a after declaration:", a); — Outputs 10.
- try { console.log("let b before declaration:", b); } catch (...) — Accessing b before let declaration triggers a ReferenceError (TDZ).
- let b = 20; — Block-scoped declaration of b with initial value 20.
- console.log("let b after declaration:", b); — Outputs 20.
- const PI = 3.14159; — Declares a constant binding; cannot be reassigned.
- // PI = 3; — Commented-out example of attempting reassignment (would throw).

## 2. Primitive Data Types, Type Checking, and Coercion

JavaScript has several primitive types (string, number, boolean, null, undefined, symbol) and objects/arrays. The typeof operator helps, but some quirks (like null and arrays) require additional checks.

```js
// Primitive and composite data types
const s = "hello";
const n = 42;
const f = 3.14;
const t = true;
const u = undefined;
const nx = null;
const sym = Symbol('id');
const obj = { name: "Alice" };
const arr = [1, "two", 3];

// typeof checks
console.log("typeof s:", typeof s);
console.log("typeof n:", typeof n);
console.log("typeof arr:", typeof arr);

// Array.isArray to detect arrays
console.log("Array.isArray(arr):", Array.isArray(arr));

// Coercion example
console.log("s + n =", s + n); // "hello42"

// NaN checks
const bad = Number("abc"); // NaN
console.log("Number('abc') is NaN:", Number.isNaN(bad));
```

### Line-by-line explanation
- const s = "hello"; … const arr = [1, "two", 3]; — Define various primitive and composite values.
- console.log("typeof s:", typeof s); — "string"
- console.log("typeof n:", typeof n); — "number"
- console.log("typeof arr:", typeof arr); — "object" (arrays are objects in typeof)
- console.log("Array.isArray(arr):", Array.isArray(arr)); — true
- console.log("s + n =", s + n); — String concatenation results in "hello42"
- const bad = Number("abc"); — NaN
- console.log("Number('abc') is NaN:", Number.isNaN(bad)); — true

## 3. Operators: Arithmetic, Assignment, Comparisons, Logical, and Ternaries

JS supports a wide range of operators. Understanding arithmetic, assignment, and comparison operators—and how coercion works—helps you write robust APIs and data transformations.

```js
let x = 5;
let y = 2;

const sum = x + y;
const diff = x - y;
const prod = x * y;
const div = x / y;
const mod = x % y;

// In-place updates
x += 1; // x becomes 6
y *= 2; // y becomes 4

// Equality checks
const eqStrict = (x === 6);
const eqLoose = (y == 4);

// Logical and ternary
const truthy = (x > y) && true;
const conditional = x > y ? "x is bigger" : "y is bigger";

// Precedence example
const result = (x + y) * 2;
```

### Line-by-line explanation
- let x = 5; let y = 2; — Initialize operands.
- const sum = x + y; … const mod = x % y; — Basic arithmetic operations.
- x += 1; y *= 2; — In-place updates to x and y, showing compound assignment.
- const eqStrict = (x === 6); const eqLoose = (y == 4); — Strict vs loose equality checks.
- const truthy = (x > y) && true; — Logical AND with a boolean.
- const conditional = x > y ? "x is bigger" : "y is bigger"; — Ternary operator for conditional value.
- const result = (x + y) * 2; — Demonstrates operator precedence.

## 4. Type Checking, NaN, and Finite Values

Handling NaN, Infinity, and finite checks is crucial in data processing paths, especially when parsing input or performing math-heavy operations.

```js
// NaN and Infinity
const notANumber = 0 / 0; // NaN
console.log("notANumber is NaN:", Number.isNaN(notANumber));

// NaN with isNaN vs Number.isNaN
console.log("global isNaN('NaN'):", isNaN("NaN"));
console.log("Number.isNaN('NaN'):", Number.isNaN("NaN"));

// Finite checks
const finite = 100;
const infinite = Infinity;
console.log("isFinite(finite):", Number.isFinite(finite));
console.log("isFinite(infinite):", Number.isFinite(infinite));

// Object.is for SameValue
console.log("Object.is(NaN, NaN):", Object.is(NaN, NaN));
```

### Line-by-line explanation
- const notANumber = 0 / 0; — Results in NaN.
- Number.isNaN(notANumber) — true; strict NaN check.
- isNaN("NaN") vs Number.isNaN("NaN") — isNaN coerces the value to number, which is NaN; Number.isNaN checks type-safe NaN.
- const finite = 100; const infinite = Infinity; — Examples of finite and infinite values.
- Number.isFinite(finite) — true; Number.isFinite(infinite) — false.
- Object.is(NaN, NaN) — true; demonstrates SameValue semantics.

## 5. Mutable vs Immutable Structures and Copying

Understanding references and copies is essential when dealing with API payloads, caches, and data processing to avoid unintended mutations.

```js
// Mutability and references

// Arrays
const arrA = [1, 2, 3];
const arrB = arrA;
arrB.push(4);
console.log("arrA after arrB.push(4):", arrA); // [1,2,3,4]

// Shallow copy with spread
const arrC = [...arrA];
arrC.push(5);
console.log("arrA (unchanged):", arrA);
console.log("arrC (new):", arrC);

// Objects
const obj1 = { name: "Alice" };
const obj2 = obj1;
obj2.name = "Bob";
console.log("obj1.name after mutation via obj2:", obj1.name);

// Object.freeze to create immutable object
const frozen = Object.freeze({ id: 123, value: "immutable" });
try {
  frozen.id = 999;
} catch (e) {
  console.log("Freeze error:", e.message);
}
console.log("frozen object:", frozen);
```

### Line-by-line explanation
- const arrA = [1, 2, 3]; const arrB = arrA; arrB.push(4); — arrB references the same array as arrA; mutation via arrB affects arrA.
- console.log("arrA after arrB.push(4):", arrA); — Outputs [1,2,3,4].
- const arrC = [...arrA]; arrC.push(5); — Creates a shallow copy; arrA remains unchanged.
- const obj1 = { name: "Alice" }; const obj2 = obj1; obj2.name = "Bob"; — Mutating through a reference affects obj1.
- const frozen = Object.freeze({ id: 123, value: "immutable" }); — Creates an immutable object; further mutations are prevented.
- frozen.id = 999; — In strict mode or non-strict mode, this will fail silently or throw; the try/catch demonstrates guard behavior.
- console.log("frozen object:", frozen); — Shows the original values preserved.

## 6. Best Practices in Node.js: Scoping, Modules, and Safety

Applying disciplined practices helps your back-end code scale, be secure, and be maintainable.

```js
'use strict';
console.log("Strict mode is enabled.");

// Simple module usage
const crypto = require('crypto');
function hashString(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
console.log("hash('secret'):", hashString('secret'));
```

### Line-by-line explanation
- 'use strict'; — Enables strict mode for the file, catching silent errors and disallowing unsafe practices.
- const crypto = require('crypto'); — Node.js built-in module for cryptography.
- function hashString(input) { … } — Simple hashing utility.
- console.log("hash('secret'):", hashString('secret')); — Demonstrates a small, deterministic function using a standard library.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Re-declaring with var instead of using let/const
Bad:
```js
var a = 1;
var a = 2;
console.log(a);
```
Good:
```js
let a = 1;
a = 2;
console.log(a);
```

- Pitfall 2: Using loose equality (==) instead of strict equality (===)
Bad:
```js
const v = "0";
if (v == 0) {
  console.log("loose equality matched 0");
}
```
Good:
```js
const v = "0";
if (v === 0) {
  console.log("strict equality matched 0");
} else {
  console.log("no strict match");
}
```

- Pitfall 3: Mutating function arguments (side effects)
Bad:
```js
function append(arr, item) {
  arr.push(item);
  return arr;
}
const a = [1];
console.log(append(a, 2)); // [1,2]
console.log(a); // [1,2]
```
Good:
```js
function appendImmutable(arr, item) {
  return [...arr, item];
}
const a = [1];
const b = appendImmutable(a, 2);
console.log(a); // [1]
console.log(b); // [1,2]
```

- Pitfall 4: Truthiness pitfalls with empty strings or zero
Bad:
```js
function greet(x) {
  if (x) {
    return "Hello";
  }
  return "Bye";
}
console.log(greet("")); // "Bye"
```
Good:
```js
function greet(x) {
  if (typeof x === 'string' && x.length > 0) {
    return "Hello";
  }
  return "Bye";
}
```

- Pitfall 5: NaN handling mistakes
Bad:
```js
const val = NaN;
if (val) {
  console.log("value present");
} else {
  console.log("value missing");
}
```
Good:
```js
const val = NaN;
if (Number.isNaN(val)) {
  console.log("value is NaN");
}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Data integrity and input validation: Real APIs receive user input and JSON payloads. Always validate types and ranges before processing to prevent runtime errors and security issues.
  - Example: when creating a user record, verify name is a non-empty string and age is a finite number.
  - Code snippet:
    function createUser(input) {
      const { name, age } = input;
      if (typeof name !== "string" || typeof age !== "number" || !Number.isFinite(age)) {
        throw new TypeError("Invalid input");
      }
      return { id: Date.now(), name, age };
    }

- Avoiding silent failures: Use strict mode, explicit checks, and guard clauses to fail fast with meaningful messages. Logging the type and shape of data helps diagnose issues in production.

- Immutable patterns where appropriate: Prefer immutability for data flowing through request handlers and services to reduce accidental sharing and side effects.

- Error handling and resilience: When performing arithmetic or type conversions, gracefully handle invalid inputs, provide meaningful error responses, and avoid leaking internal details.

- Node.js environment realities: Effective use of environment variables (process.env), modularization, and dependency management (npm/yarn) contribute to predictable behavior across environments (dev/stage/prod).

- Observability: Instrument variables and key state with structured logging to help trace data flow, especially in microservices where requests traverse multiple services.

- Security considerations: Guard against type coercion vulnerabilities, ensure proper input validation, and avoid evaluating user-supplied data in unsafe ways (e.g., dynamic code evaluation).

## Z. Study Questions — 5 recall questions

1) What is the difference between var, let, and const in JavaScript in terms of scope and reassignment?
2) How do you reliably detect an array and distinguish it from a plain object?
3) What is the difference between Number.isNaN(value) and global isNaN(value)?
4) How does the spread operator help in creating immutable copies of arrays or objects?
5) Why is strict equality (===) generally preferred over loose equality (==) in backend code?

## Exercise — a practical multi-part coding challenge

Part A — Variable declarations and scoping (practice script: practice-vars.js)
- Create a script that demonstrates var hoisting and let TDZ, then logs the results clearly.
- Expected outcomes:
  - Accessing a var before declaration yields undefined.
  - Accessing a let variable before declaration results in a ReferenceError (demonstrated with a try/catch).

Starter code:
```js
// practice-vars.js
console.log("var-a before:", a);
var a = 10;
console.log("var-a after:", a);

try {
  console.log("let-b before:", b);
} catch (e) {
  console.log("Error accessing 'b' before initialization:", e.message);
}
let b = 20;
console.log("let-b after:", b);
```

Part B — Type inspector utility (practice-types.js)
- Implement a function describeValue(v) returning an object with properties:
  - type: typeof v
  - isArray: Array.isArray(v)
  - isNull: v === null
  - isNaN: Number.isNaN(v)
- Use the function with sample values to demonstrate results.

Starter code:
```js
// practice-types.js
function describeValue(v) {
  // implement
}
console.log(describeValue("hello"));
console.log(describeValue(42));
console.log(describeValue([1, 2, 3]));
console.log(describeValue(null));
console.log(describeValue(NaN));
```

Part C — CLI calculator (practice-calculator.js)
- Build a small command-line calculator that accepts two numbers and an operator (+, -, *, /) as arguments:
  - node practice-calculator.js 7 / 3
- Validate inputs and handle division by zero gracefully.
- Print a descriptive result.

Starter code:
```js
// practice-calculator.js
const args = process.argv.slice(2);
const [aStr, op, bStr] = args;
const a = Number(aStr);
const b = Number(bStr);

if (args.length !== 3 || isNaN(a) || isNaN(b) || !["+","-","*","/"].includes(op)) {
  console.log("Usage: node practice-calculator.js <number> <operator> <number>");
  process.exit(1);
}

let result;
switch (op) {
  case "+": result = a + b; break;
  case "-": result = a - b; break;
  case "*": result = a * b; break;
  case "/":
    if (b === 0) {
      console.log("Error: Division by zero");
      process.exit(1);
    }
    result = a / b;
    break;
}

console.log(`Result: ${a} ${op} ${b} = ${result}`);
```

Part D — Immutable configuration module (practice-config.js)
- Create an immutable config object using Object.freeze and demonstrate that attempts to mutate do not affect the original.
- Provide an accompanying demo (practice-config-demo.js) that imports the config and tries to mutate it.

Starter code:
```js
// practice-config.js
const config = Object.freeze({
  host: "localhost",
  port: 8080,
  maxConnections: 100
});
module.exports = config;

// practice-config-demo.js
const config = require("./practice-config");
try {
  config.port = 9999;
} catch (e) {
  console.log("Mutation error:", e.message);
}
console.log("Config:", config);
```

Note: The exercise sections provide practical templates to apply the concepts covered in this lesson. Run and experiment locally to reinforce understanding of variable declarations, data types, operators, and safe coding practices in Node.js.