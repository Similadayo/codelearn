# Track: Backend Engineering — Phase 1: Language Foundations — Functions, Scope & Closures (Python)

Python functions are the building blocks of modular, testable, and scalable backend systems. Mastering how to define and invoke functions, how Python resolves variable scope, and how closures capture and carry state enables you to build clean APIs, robust decorators, and powerful higher-order abstractions. This lesson equips you with practical intuition and hands-on patterns used daily in production backends.

## 1. Defining and Invoking Functions in Python

Functions are reusable blocks of code that can accept inputs, perform work, and return results. They’re first-class citizens in Python, meaning you can pass them around, store them in data structures, and decorate them.

```python
def add(a, b):
    """Return the sum of a and b."""
    return a + b

def greet(name, greeting="Hello"):
    """Return a formatted greeting string."""
    return f"{greeting}, {name}!"

# Usage examples
print(add(3, 4))            # 7
print(greet("Alice"))       # Hello, Alice!
print(greet("Bob", "Hi"))   # Hi, Bob!
```

### Line-by-line explanation
- def add(a, b): — Define a function named add with parameters a and b.
- """Return the sum of a and b.""" — Docstring describing the function.
- return a + b — Compute and return the sum of a and b.
- def greet(name, greeting="Hello"): — Define greet with a required name and an optional greeting defaulting to "Hello".
- """Return a formatted greeting string.""" — Docstring.
- return f"{greeting}, {name}!" — Return a formatted string using the provided arguments.
- print(add(3, 4)) — Call add and print the result (7).
- print(greet("Alice")) — Call greet with the default greeting and print the result.
- print(greet("Bob", "Hi")) — Call greet with a custom greeting and print the result.

## 2. Understanding Scope: Local, Enclosing, Global (LEGB)

Python resolves names using the LEGB order: Local, Enclosing, Global, Built-in. Understanding scope helps you avoid unintended shadowing and side effects, especially in larger modules and services.

### Local and enclosing scope, and nonlocal

```python
x = "global"

def outer():
    x = "outer"

    def inner():
        x = "inner"
        print("inner:", x)
    inner()
    print("outer:", x)

outer()
print("global:", x)
```

### Line-by-line explanation
- x = "global" — Define a global variable x.
- def outer(): — Define an outer function.
- x = "outer" — Assign a new local x inside outer, shadowing the global x.
- def inner(): — Define an inner function inside outer.
- x = "inner" — Assign a new local x inside inner, shadowing outer x.
- print("inner:", x) — Print the inner x ("inner").
- inner() — Call inner.
- print("outer:", x) — Print the outer x ("outer"), showing it remains unchanged by inner.
- outer() — Execute the outer function, triggering inner and the nested prints.
- print("global:", x) — Show the global x remains "global".
  
### Nonlocal for enclosing scope modification

```python
def make_counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc

counter = make_counter()
print(counter())  # 1
print(counter())  # 2
```

### Line-by-line explanation
- def make_counter(): — Define a factory that creates a counter.
- count = 0 — Local variable in the enclosing scope of inc.
- def inc(): — Define a nested function that will modify count.
- nonlocal count — Declare that we want to bind to the nearest enclosing variable named count (not a new local variable).
- count += 1 — Increment the enclosing count.
- return count — Return the updated count.
- return inc — Return the inner function (a closure) that captures count.
- counter = make_counter() — Create a specific counter instance.
- print(counter()) — Invoke the closure; count becomes 1.
- print(counter()) — Invoke again; count becomes 2.

### Global state mutation (less advisable in production)

```python
count = 0

def inc_global():
    global count
    count += 1
    return count

inc_global()
inc_global()
print("global count:", count)
```

### Line-by-line explanation
- count = 0 — Define a module-level (global) variable.
- def inc_global(): — Define a function that declares count as global.
- global count — Indicate we’re using the global variable, not a local one.
- count += 1 — Increment the global counter.
- return count — Return the updated global value.
- inc_global() — Call to mutate global state.
- inc_global() — Second mutation.
- print("global count:", count) — Show the final global value.

## 3. Nested Functions and Closures: Capturing Variables

Closures occur when an inner function remembers and can access variables from an enclosing scope even after that scope has finished executing.

### Simple closure example

```python
def make_adder(n):
    def add(x):
        return x + n
    return add

plus_five = make_adder(5)
print(plus_five(10))  # 15
```

### Line-by-line explanation
- def make_adder(n): — Define a factory that captures n in a closure.
- def add(x): — Define a nested function that uses n from the outer scope.
- return x + n — Compute and return the result using the captured n.
- return add — Return the inner function as a closure.
- plus_five = make_adder(5) — Create a closure that adds 5.
- print(plus_five(10)) — Call the closure; result is 15.

### Late binding problem in closures inside a loop (bad)

```python
funcs = []
for i in range(3):
    funcs.append(lambda x: x * i)

print([f(2) for f in funcs])  # [6, 6, 6]
```

### Line-by-line explanation
- funcs = [] — Prepare a list to hold functions.
- for i in range(3): — Loop to create functions capturing i.
- funcs.append(lambda x: x * i) — Each lambda closes over the same i variable.
- print([f(2) for f in funcs]) — All functions use the final i (2), producing [6, 6, 6].

### Fix with default arguments (correct late binding)

```python
funcs = []
for i in range(3):
    funcs.append(lambda x, i=i: x * i)

print([f(2) for f in funcs])  # [0, 2, 4]
```

### Line-by-line explanation
- lambda x, i=i: x * i — Bind i to the current loop value as a default argument.
- The rest mirrors the bad example but now each function uses a stable i.
- Output shows distinct multipliers: 0, 2, 4.

## 4. Higher-Order Functions and Decorators: Functions as First-Class Citizens

Python treats functions as first-class objects: you can pass them around, return them, and compose behavior using decorators and higher-order functions.

### Simple decorator factory: a prefix-tagger

```python
def tagger(prefix):
    def decorator(func):
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            return f"{prefix}{result}{prefix}"
        return wrapper
    return decorator

@tagger("<<")
def say(name):
    return f"Hello, {name}"

print(say("World"))  # <<Hello, World<<
```

### Line-by-line explanation
- def tagger(prefix): — Decorator factory that takes a prefix.
- def decorator(func): — The actual decorator that receives the function to wrap.
- def wrapper(*args, **kwargs): — The wrapper that will execute around the function call.
- result = func(*args, **kwargs) — Call the original function and capture its result.
- return f"{prefix}{result}{prefix}" — Return the decorated string with prefixes.
- return wrapper — Return the wrapped function.
- return decorator — Return the decorator from the factory.
- @tagger("<<") — Apply the decorator with prefix "<<".
- def say(name): — Target function.
- print(say("World")) — Execute; the result is wrapped with "<<".

### Line-by-line explanation
- The outer factory receives a prefix and returns a decorator.
- The inner decorator takes the function to wrap and returns a wrapped version.
- The wrapper calls the original function, then augments the output with the prefix.
- Decorating say with @tagger("<<") creates a new function that prefixes the result.

## 5. Why This Matters In Real Systems

- Modular API design: closures let you create specialized functions (factories) without repeating boilerplate.
- Decorators for cross-cutting concerns: logging, timing, authentication, input validation, and rate limiting are commonly implemented as decorators built on closures.
- Memoization and caching: closures capture caches to avoid recomputation for expensive backend operations (e.g., database lookups, heavy computations).
- Resource management: proper scope management prevents unintentional state leaks across requests, workers, or modules.
- Concurrency considerations: be mindful of closures that capture mutable state; ensure thread-safety or use immutable state and functional patterns where possible.
- Debuggability and readability: clear scope boundaries and explicit closures reduce bugs and improve maintainability in large backend services.

## 6. Study Questions

1. What is the LEGB rule in Python, and how does it affect variable lookup?
2. How can you modify a variable in an enclosing scope from an inner function?
3. What is a closure? Provide a small example showing a function capturing a variable from an outer scope.
4. How do you fix the late-binding closure problem when creating multiple functions in a loop?
5. Why are mutable default arguments a pitfall in Python function definitions, and how can None be used to fix it?

## 7. Exercise

Part A — Closure-based adder
- Task: Implement a function make_adder(n) that returns a function f(x) which adds n to x. Demonstrate with n = 7.

Code:
```python
def make_adder(n):
    def add(x):
        return x + n
    return add

add_seven = make_adder(7)
print(add_seven(3))  # 10
```

Part B — Simple memoization decorator
- Task: Implement a memoize decorator that caches results for given positional and keyword arguments. Use it to decorate a naive recursive function (e.g., Fibonacci), then show a faster result.

Code:
```python
def memoize(func):
    cache = {}
    def wrapper(*args, **kwargs):
        # Build a hashable key from args and kwargs
        key = (args, tuple(sorted(kwargs.items())))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]
    return wrapper

@memoize
def fib(n):
    if n < 2:
        return n
    return fib(n-1) + fib(n-2)

print(fib(10))  # 55
print(fib(20))  # 6765
```

Part C — Tiny timing decorator (production-friendly pattern)
- Task: Create a decorator that prints elapsed time for a function, without changing its signature, and preserves metadata.

Code:
```python
import time
import functools

def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} took {end - start:.6f}s")
        return result
    return wrapper

@timer
def compute(n):
    total = 0
    for i in range(n):
        total += i * i
    return total

print(compute(10000))
```

Completion notes:
- Ensure you run these examples in a Python environment (3.x) to observe scope behavior, closures, and decorator effects.
- Experiment with modifying variables inside nested functions and observe how nonlocal and global alter behavior.
- Extend the exercise by combining closures with a small API design, e.g., a factory that returns route handlers with pre-bound configuration.