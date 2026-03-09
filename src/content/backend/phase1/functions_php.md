# PHP Backend Foundations: Functions, Scope & Closures

Compelling introductory paragraph: In backend engineering, functions are the basic building blocks of business logic. They let you encapsulate behavior, reason about code in modular pieces, and compose complex workflows from small, testable units. Understanding how functions interact with scope, variables, and closures is essential for writing maintainable, scalable PHP services (APIs, jobs, workers). Mastery of these concepts reduces bugs, improves testability, and unlocks powerful patterns like dependency injection, higher-order functions, and callbacks used in event-driven architectures.

## 1. Functions Fundamentals in PHP

Code example: a simple, typed function with a straightforward invocation.

```php
<?php
// Simple, strongly-typed function
function add(int $a, int $b): int {
    return $a + $b;
}

echo add(2, 3); // 5
```

### Line-by-line explanation
- <?php opens a PHP block.
- function add(int $a, int $b): int { defines a function named add with two integer parameters and an integer return type.
- return $a + $b; computes the sum and returns it.
- } ends the function body.
- echo add(2, 3); calls the function with 2 and 3 and prints the result (5).
- The script demonstrates explicit typing and a simple function call.

## 2. Function Parameters, Return Types, and Variants

Code blocks covering nullable types and variadic functions.

```php
<?php
// Nullable parameter and explicit string return type
function greet(?string $name): string {
    if ($name === null) {
        return "Hello, guest";
    }
    return "Hello, $name";
}

echo greet(null) . PHP_EOL; // Hello, guest
echo greet("Alex") . PHP_EOL; // Hello, Alex
```

### Line-by-line explanation
- function greet(?string $name): string { declares a function that accepts a string or null and returns a string.
- if ($name === null) { ... } handles the null case.
- return "Hello, $name"; returns a greeting for a provided name.
- } ends the function.
- echo greet(null) . PHP_EOL; prints the null-case greeting with a newline.
- echo greet("Alex") . PHP_EOL; prints the personalized greeting.

```php
<?php
// Variadic function: accepts any number of integers
function sumAll(int ...$numbers): int {
    return array_sum($numbers);
}

echo sumAll(1, 2, 3, 4) . PHP_EOL; // 10
```

### Line-by-line explanation
- function sumAll(int ...$numbers): int { defines a variadic function that accepts zero or more integers.
- return array_sum($numbers); computes the sum of all provided numbers.
- } ends the function.
- echo sumAll(1, 2, 3, 4) . PHP_EOL; prints the sum (10).

## 3. Scope: Local, Global, and Static

Code blocks illustrating scope management patterns in PHP.

```php
<?php
$count = 0;
function increment(): int {
    global $count; // bring the global variable into function scope
    $count++;
    return $count;
}

echo increment() . PHP_EOL; // 1
echo increment() . PHP_EOL; // 2
```

### Line-by-line explanation
- $count = 0; initializes a global counter.
- function increment(): int { starts a function that returns an int.
- global $count; imports the global $count variable into the function scope.
- $count++; increments the global counter.
- return $count; returns the updated count.
- } ends the function.
- echo increment() . PHP_EOL; prints 1.
- echo increment() . PHP_EOL; prints 2.

```php
<?php
function staticCounter(): int {
    static $i = 0; // persists across calls
    $i++;
    return $i;
}

echo staticCounter() . PHP_EOL; // 1
echo staticCounter() . PHP_EOL; // 2
```

### Line-by-line explanation
- function staticCounter(): int { defines a function with a static variable.
- static $i = 0; initializes $i once; it preserves its value between calls.
- $i++; increments the persisted value.
- return $i; returns the persisted value.
- } ends the function.
- echo staticCounter() . PHP_EOL; prints 1.
- echo staticCounter() . PHP_EOL; prints 2.

## 4. Closures and Use

Code blocks demonstrating closures, capturing variables, and practical patterns like mapping and accumulation.

```php
<?php
$multiplier = 3;
$times = function($x) use ($multiplier) {
    return $x * $multiplier;
};

echo $times(5) . PHP_EOL; // 15
```

### Line-by-line explanation
- $multiplier = 3; sets a value to be captured by the closure.
- $times = function($x) use ($multiplier) { ... }; creates a closure that captures $multiplier by value.
- return $x * $multiplier; computes the product inside the closure.
- }; ends the closure.
- echo $times(5) . PHP_EOL; calls the closure with 5 and prints 15.

```php
<?php
$sum = 0;
$adder = function($n) use (&$sum) {
    $sum += $n;
};

$adder(5);
$adder(3);
echo $sum . PHP_EOL; // 8
```

### Line-by-line explanation
- $sum = 0; initializes a variable to accumulate a result.
- $adder = function($n) use (&$sum) { ... }; creates a closure capturing $sum by reference.
- $sum += $n; increases the external $sum by the passed value.
- }; ends the closure.
- $adder(5); calls the closure, adding 5.
- $adder(3); calls the closure again, adding 3.
- echo $sum . PHP_EOL; prints 8, showing state mutation via closure.

```php
<?php
$numbers = [1, 2, 3];
$doubled = array_map(function($n) { return $n * 2; }, $numbers);
print_r($doubled);
```

### Line-by-line explanation
- $numbers = [1, 2, 3]; prepares an array of numbers.
- $doubled = array_map(function($n) { return $n * 2; }, $numbers); uses a closure to transform each element.
- print_r($doubled); outputs the resulting array, e.g., Array ( [0] => 2 [1] => 4 [2] => 6 ).

## 5. Higher-Order Functions and Practical Patterns

Code blocks showing more advanced patterns that are common in PHP backends.

```php
<?php
// Higher-order function: returns a greeting closure
function makeGreeting(string $greet): callable {
    return function(string $name) use ($greet) {
        return $greet . ", " . $name . "!";
    };
}
$sayHello = makeGreeting("Hello");
echo $sayHello("World") . PHP_EOL; // Hello, World!
```

### Line-by-line explanation
- function makeGreeting(string $greet): callable { defines a function that returns a callable (closure).
- return function(string $name) use ($greet) { ... }; returns a closure that uses the captured $greet value.
- echo $sayHello("World") . PHP_EOL; calls the returned closure and prints the formatted greeting.

```php
<?php
// Lightweight, in-process event bus using closures
function makeEventBus(): array {
    $listeners = [];
    $on = function(string $event, callable $cb) use (&$listeners) {
        $listeners[$event][] = $cb;
    };
    $emit = function(string $event, ...$args) use (&$listeners) {
        foreach (($listeners[$event] ?? []) as $cb) {
            $cb(...$args);
        }
    };
    return ['on' => $on, 'emit' => $emit];
}

$bus = makeEventBus();
$bus['on']('greet', function($name) {
    echo "Hello, $name!" . PHP_EOL;
});
$bus['emit']('greet', 'Alice'); // Triggers the listener
```

### Line-by-line explanation
- function makeEventBus(): array { begins a factory that returns an event bus.
- $listeners = []; initializes a local storage for events.
- $on = function(string $event, callable $cb) use (&$listeners) { ... }; defines a method to register listeners for an event.
- $emit = function(string $event, ...$args) use (&$listeners) { ... }; defines a method to emit events to all listeners.
- return ['on' => $on, 'emit' => $emit]; exposes the two closures.
- $bus = makeEventBus(); creates a new bus.
- $bus['on']('greet', function($name) { ... }); registers a listener for 'greet'.
- $bus['emit']('greet', 'Alice'); emits the event, invoking the listener with 'Alice'.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

Pitfall 1: Relying on shared global state inside functions

Bad:
```php
<?php
$counter = 0;
function bump() {
    global $counter;
    $counter++;
}
for ($i = 0; $i < 3; $i++) bump();
echo $counter;
```

Good:
```php
<?php
function bump(int $start): array {
    $counter = $start;
    $counter++;
    return [$counter];
}
list($next) = bump(0);
echo $next;
```

Pitfall 2: Closure capture in loops (late binding by reference)

Bad:
```php
<?php
$funcs = [];
for ($i = 0; $i < 3; $i++) {
    $funcs[] = function() use (&$i) { return $i; };
}
foreach ($funcs as $f) {
    echo $f(); // 3, 3, 3
}
```

Good:
```php
<?php
$funcs = [];
for ($i = 0; $i < 3; $i++) {
    $val = $i;
    $funcs[] = function() use ($val) { return $val; };
}
foreach ($funcs as $f) {
    echo $f(); // 0, 1, 2
}
```

Pitfall 3: Missing or weak type hints and relying on implicit coercion

Bad:
```php
<?php
function concat($a, $b) {
    return $a . $b;
}
echo concat(1, " apples"); // "1 apples" but not explicit about types
```

Good:
```php
<?php
declare(strict_types=1);
function concat(string $a, string $b): string {
    return $a . $b;
}
echo concat("1", " apples"); // "1 apples"
```

## Y. Why This Matters In Real Systems — production context and real usage

- Predictable behavior: Strong typing and explicit scopes prevent subtle bugs that appear only under concurrency, retries, or when wiring together many services.
- Testability: Pure functions and well-scoped closures are easier to unit test; closures enable dependency injection without heavy frameworks.
- Performance and maintainability: Understanding scope avoids unintended globals and reduces memory leaks in long-running workers or daemons.
- Real patterns: Closures enable callbacks for event systems, background job processing, and middleware pipelines. Higher-order functions enable factory patterns for configurable components, reducing boilerplate.
- Security: Avoid leaking globals; use explicit inputs and return values to minimize surface area for vulnerabilities.

## Z. Study Questions — 5 recall questions

1) What is the difference between a local variable and a global variable inside a PHP function, and how do you access the global variable inside a function?  
2) How do closures capture variables in PHP, and what is the effect of using use ($var) vs use (&$var)?  
3) What is the purpose of the static keyword inside a function, and how does it differ from a global variable?  
4) How do you declare and use variadic parameters in PHP? Provide a small example.  
5) Explain how to implement a simple memoization pattern using closures in PHP. Provide a short code sketch.

## Exercise — practical multi-part coding challenge

Part 1 — Simple adder factory
- Task: Implement makeAdder(int $increment): callable that returns a closure which adds the given increment to any input.
- Deliverable: A closure that, when called with a number, returns that number plus the increment.
- Example: $add5 = makeAdder(5); echo $add5(10); // 15

Part 2 — Lightweight memoization utility
- Task: Implement memoize(callable $fn): callable that returns a new closure which caches results by serialized arguments.
- Deliverable: A memoized version of a slow function.
- Example: $slow = function(int $n) { $prod = 1; for ($i=2; $i<=$n; $i++) $prod *= $i; return $prod; }; $memoSlow = memoize($slow); echo $memoSlow(7); // computes once, then caches

Part 3 — Threshold filter creator
- Task: Implement makeThresholdFilter(float $threshold): callable that returns a closure which tests if a value is above the threshold.
- Deliverable: A reusable predicate closure applied via array_filter.
- Example: $guard = makeThresholdFilter(10.0); $data = [5, 12, 9, 15]; $filtered = array_filter($data, $guard);
- Expected result: [12, 15] (values > 10)

Part 4 — Simple in-process event bus
- Task: Implement makeEventBus() that returns an array with 'on' and 'emit' closures to register listeners and emit events.
- Deliverable: A tiny event system you can use to register callbacks and trigger them by event name.
- Example:
  - $bus = makeEventBus();
  - $bus['on']('login', function($user){ echo "User $user logged in\n"; });
  - $bus['emit']('login', 'alice');
- Expected behavior: prints "User alice logged in"

Part 5 — Compose closures in a small workflow
- Task: Use makeAdder, makeThresholdFilter, and a memoized function to build and run a small data-processing pipeline:
  - Create $add2 = makeAdder(2);
  - Use makeThresholdFilter with a threshold of 3 to filter results from a map.
  - Map a list [1, 2, 3, 4] with $add2, then filter with threshold > 3.
- Deliverable: The resulting array printed, and a short explanation of how closures were composed.

Note: In all parts, include proper PHP opening tags, type hints where appropriate, and minimal inline test code to demonstrate the behavior. Each code block in this exercise should be self-contained and runnable in a standard PHP 8+ environment.