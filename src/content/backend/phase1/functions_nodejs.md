# Track: Backend Engineering — Module 1: Phase 1 — Language Foundations: Functions, Scope & Closures (JavaScript / Node.js)

JavaScript functions, scope, and closures are foundational to building robust backend services in Node.js. Understanding how functions are declared, how scope works (including hoisting and the temporal dead zone), and how closures capture and preserve state enables you to write modular, maintainable, and testable code. Mastery in these topics reduces bugs related to variable lifetime, helps in dependency injection patterns, and underpins async programming approaches common in production systems.

## 1. Functions: Declarations, Expressions, Arrow Functions, and Higher-Order Use

This section covers the main ways to create functions in JavaScript, how parameters and defaults work, and how to pass functions as values and operate on them (higher-order functions).

```js
// 1. Function declarations, function expressions, and arrow functions

// Function declaration
function add(a, b) {
  return a + b;
}

// Function expression
const multiply = function(a, b) {
  return a * b;
};

// Arrow function
const divide = (a, b) => a / b;

// Default parameters
function greet(name = 'Guest') {
  return `Hello, ${name}!`;
}

// Rest parameters
function sum(...numbers) {
  return numbers.reduce((acc, n) => acc + n, 0);
}

// Higher-order function
function applyOperation(a, b, op) {
  return op(a, b);
}
```

### Line-by-line explanation
- The section header is a comment and not executed; it labels the concept group.
- function add(a, b) { return a + b; } — A named function declaration; it is hoisted and can be called before its definition.
- const multiply = function(a, b) { return a * b; }; — A function expression assigned to a constant; not hoisted in the same way as declarations.
- const divide = (a, b) => a / b; — An arrow function; concise syntax, no own this binding.
- function greet(name = 'Guest') { ... } — Default parameter usage: if no argument is provided, name defaults to 'Guest'.
- function sum(...numbers) { ... } — Rest parameters: captures all additional arguments into an array named numbers.
- function applyOperation(a, b, op) { return op(a, b); } — Higher-order function: op is itself a function, invoked with a and b.
- Overall takeaway: You can mix declarations, expressions, and arrow forms; default and rest parameters improve flexibility for function calls; higher-order functions enable functional composition.

## 2. Scope, Hoisting, and Block vs Function Scopes

This section demonstrates how JavaScript scoping works, the hoisting behavior of var, and how let/const introduce block scope, including the temporal dead zone (TDZ).

```js
// 2. Scope, Hoisting, and Block vs Function scope

// Hoisting with var
console.log('hoisted var a:', a); // undefined
var a = 10;

// Temporal Dead Zone with let/const
try {
  console.log('TDZ let b:', b);
} catch (e) {
  console.log('TDZ error', e.name);
}
let b = 20;

// Function scoped vs block scoped
function showScope() {
  if (true) {
    var functionScoped = 'var inside if';
    const blockScoped = 'const inside if';
  }
  console.log('functionScoped:', functionScoped); // accessible due to var
  // console.log('blockScoped:', blockScoped); // ReferenceError if uncommented
}
showScope();
```

### Line-by-line explanation
- The code block demonstrates different scoping rules in one place.
- console.log('hoisted var a:', a); shows that var declarations are hoisted and initialized with undefined, thus printing undefined before assignment.
- var a = 10; assigns 10 to a; after hoisting, a exists in the function/global scope.
- The TDZ example with let b reveals that referencing b before its declaration causes a ReferenceError because let/const are not initialized until execution reaches their declaration.
- try { ... } catch (e) catches the TDZ error and prints its name.
- let b = 20; initializes b in the TDZ window after the attempted access.
- In showScope, var functionScoped is function-scoped and accessible outside the if block, while const blockScoped is block-scoped and would cause a ReferenceError if accessed outside the block (uncomment to observe).
- showScope() executes and demonstrates the interaction between block and function scope.

## 3. Closures: Capturing Outer Variables, Private State, and Common Pitfalls

Closures let inner functions capture and persist access to variables in outer scopes, enabling patterns like factory functions, private state, and per-request data in handlers.

```js
// 3. Closures: capturing outer scope

// Simple closure
function makeAdder(x) {
  return function(y) {
    return x + y;
  };
}

const add5 = makeAdder(5);
const result = add5(3); // 8

// Private state with closures
function Counter() {
  let count = 0;
  return {
    increment() { count += 1; return count; },
    get() { return count; }
  };
}
const c = Counter();
c.increment(); // 1
c.increment(); // 2

// Loop-variable closure pitfall (var)
for (var i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log('var i in timeout:', i);
  }, i * 10);
}

// Correct with let
for (let j = 0; j < 3; j++) {
  setTimeout(function() {
    console.log('let j in timeout:', j);
  }, j * 10);
}
```

### Line-by-line explanation
- makeAdder returns a new function that closes over x; the inner function remembers the value of x even after makeAdder finishes.
- add5(3) uses the closure to compute 5 + 3, yielding 8.
- Counter creates a private variable count that is not directly accessible from outside; increment mutates and get reads the internal state.
- In the for loop using var, all timeouts share the same i value due to function-level scoping, resulting in all logs showing 3.
- Using let for i creates a new binding per iteration, so each timeout logs the expected 0, 1, and 2.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Hoisting and TDZ confusion (var vs let)
  - Bad:
  ```js
  console.log(x);
  var x = 5;
  ```
  - Good:
  ```js
  let x = 5;
  console.log(x);
  ```

- Pitfall 2: Closure in loops with var
  - Bad:
  ```js
  for (var k = 0; k < 3; k++) {
    setTimeout(function() { console.log('k=', k); }, 0);
  }
  ```
  - Good:
  ```js
  for (let k = 0; k < 3; k++) {
    setTimeout(function() { console.log('k=', k); }, 0);
  }
  ```

- Pitfall 3: Mutable default parameters
  - Bad:
  ```js
  function pushToList(item, list = []) {
    list.push(item);
    return list;
  }
  console.log(pushToList(1)); // [1]
  console.log(pushToList(2)); // [1, 2]
  ```
  - Good:
  ```js
  function pushToList(item, list) {
    list = list || [];
    list.push(item);
    return list;
  }
  console.log(pushToList(1)); // [1]
  console.log(pushToList(2)); // [2]
  ```

- Pitfall 4: Async error handling in callbacks
  - Bad:
  ```js
  const fs = require('fs');
  fs.readFile('notfound.txt', (err, data) => {
    console.log(data.length);
  });
  ```
  - Good:
  ```js
  const fs = require('fs');
  fs.readFile('notfound.txt', (err, data) => {
    if (err) {
      console.error('Read failed', err);
      return;
    }
    console.log('size', data.length);
  });
  ```

## Y. Why This Matters In Real Systems — Production context and real usage

- Correct scope and closures reduce memory leaks and stale state. In long-running Node.js processes (APIs, workers, message handlers), closures can capture references longer than intended if not designed carefully.
- Closures enable dependency injection and factory patterns. In Express-like servers, you often create middleware or services with closures to “bake in” configuration (e.g., a logger prefix, a database handle, or rate-limiting parameters), avoiding global state.
- Hoisting and TDZ awareness prevents runtime surprises when code order changes. In large codebases, accidentally relying on hoisting can cause bugs that are hard to trace in production.
- Async code and callbacks rely on proper error handling inside closures. Failing to propagate or handle errors in async callbacks is a leading source of instability in I/O-heavy backends.
- Module boundaries and scope discipline help with testability and maintainability. Keeping state local to modules and avoiding global leakage makes unit tests deterministic and scalable in larger services.

Real-world usage patterns:
- Creating middleware factories in Express: const auth = (secret) => (req, res, next) => { ... } capturing secret via closure.
- Implementing simple DI containers: function createService(deps) { return { repo: deps.repo } } uses closures to bind dependencies.
- Writing safe async loops: using let in loops or IIFE to preserve loop variables ensures correct logging, event handling, and request-specific data per iteration.

## Z. Study Questions — 5 recall questions

1. What is a closure, and why is it useful in backend development?
2. How does the temporal dead zone affect access to let/const variables before their declaration?
3. What is the difference between a function declaration and a function expression in terms of hoisting?
4. How can you fix a common pitfall where a for-loop with setTimeout captures the wrong loop index?
5. Provide a simple example of using a higher-order function to compose operations (e.g., a function that takes another function and applies it to input).

## Exercise — practical multi-part coding challenge

You will build small, self-contained exercises that exercise function creation patterns, scope, and closures. Each part should be runnable in a Node.js environment.

Part 1 — Memoization (a function wrapper that caches results)
- Implement a generic memoize(fn) that caches results by arguments.
- Test with a deliberately slow function to demonstrate the cache.

Code:
```js
// Part 1: Memoization helper
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Slow function to simulate heavy computation
function slowDouble(n) {
  // simulate some delay
  const end = Date.now() + 5;
  while (Date.now() < end) {}
  return n * 2;
}

const memoSlowDouble = memoize(slowDouble);
console.log('First call (slow):', memoSlowDouble(10)); // slow
console.log('Second call (cached):', memoSlowDouble(10)); // fast (from cache)
```

Part 2 — Logger factory using closures
- Create a createLogger(moduleName) that returns a logger function. The logger prefixes messages with moduleName and a timestamp.

Code:
```js
// Part 2: Logger factory using closures
function createLogger(moduleName) {
  return (level, message) => {
    const t = new Date().toISOString();
    console.log(`[${t}] [${moduleName}] ${level}: ${message}`);
  };
}

const userLogger = createLogger('UserService');
userLogger('INFO', 'User created');
```

Part 3 — Simple dependency-injected service via closure
- Implement a small service factory that takes a mock database object and returns a user service with getUser and createUser methods.

Code:
```js
// Part 3: Simple DI-style service with closures
function createUserService(db) {
  return {
    getUser(id) { return db.findUser(id); },
    createUser(user) {
      const id = db.insertUser(user);
      return { id, ...user };
    }
  };
}

// Mock in-memory database
const mockDb = {
  data: [{ id: 1, name: 'Alice' }],
  findUser(id) { return this.data.find(u => u.id === id); },
  insertUser(user) {
    const id = this.data.length + 1;
    this.data.push({ id, ...user });
    return id;
  }
};

const userService = createUserService(mockDb);
console.log('Get user 1:', userService.getUser(1));
console.log('Create user:', userService.createUser({ name: 'Bob' }));
```

Part 4 — Async closure correctness in a loop
- Write a function printNumbers(n) that prints 0 through n-1 with incremental delays, ensuring the correct value is printed each time. Demonstrate both a broken var version and a correct let version.

Code:
```js
// Part 4: Async loop with closures - correct version
function printNumbers(n) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => console.log('number:', i), i * 50);
  }
}
printNumbers(5);

// Optional: show the broken var version (uncomment to observe)
/*
function printNumbersBroken(n) {
  for (var i = 0; i < n; i++) {
    setTimeout(function() {
      console.log('broken number:', i);
    }, i * 50);
  }
}
printNumbersBroken(5);
*/
```

What you’ll learn by completing this exercise:
- How closures enable function factories and private state.
- How to build small, composable utilities that are easy to test and reuse.
- How to reason about asynchronous code and loop variables to avoid common timing bugs in production systems.