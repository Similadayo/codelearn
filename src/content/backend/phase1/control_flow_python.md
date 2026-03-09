# Track: Backend Engineering — Module Phase 1: Language Foundations — Topic: Control Flow — Conditions & Loops (Python)

Compelling introductory paragraph:
Control flow is the backbone of any software system. It governs how your program decides what to do next, react to inputs, and process data efficiently. In backend engineering, clean and predictable conditionals, as well as well-designed loops, are essential for validation, routing requests, processing streams of data, and implementing retry/feature-flag logic. Mastery of Python conditionals and loops sets you up for robust APIs, reliable data pipelines, and maintainable server-side code.

## 1. Conditional Statements: if/elif/else
Code example:
```python
def categorize_status(status: str) -> str:
    if status == 'success':
        return 'Operation succeeded'
    elif status == 'warning':
        return 'Operation completed with warnings'
    elif status == 'error':
        return 'Operation failed'
    else:
        return 'Unknown status'
```

### Line-by-line explanation breaking down each line
- def categorize_status(status: str) -> str:
  - Defines a function that takes a string argument and returns a string. Type hints are optional but helpful for readability.
-    if status == 'success':
  - Checks if the input status is exactly 'success'. If true, the following block executes.
-        return 'Operation succeeded'
  - Returns a human-readable message indicating success and exits the function.
-    elif status == 'warning':
  - If the previous condition was false, checks if status is 'warning'.
-        return 'Operation completed with warnings'
  - Returns a message indicating a warning scenario.
-    elif status == 'error':
  - If neither of the above, checks if status is 'error'.
-        return 'Operation failed'
  - Returns a message describing a failure.
-    else:
  - If none of the above conditions match, execute this block.
-        return 'Unknown status'
  - Returns a default message for any unrecognized status.

## 2. Ternary Operator and Short-Circuit Evaluation
Code examples:
```python
def age_group_label(age: int) -> str:
    return 'adult' if age >= 18 else 'minor'
```

### Line-by-line explanation breaking down each line
- def age_group_label(age: int) -> str:
  - Defines a function that returns a string describing age group.
-    return 'adult' if age >= 18 else 'minor'
  - A concise conditional expression: if the condition age >= 18 is true, returns 'adult'; otherwise returns 'minor'.

Optional second example showing truthiness-based defaults:
```python
def greet(name=None):
    name = name or "Guest"
    return f"Hello, {name}!"
```

### Line-by-line explanation breaking down each line
- def greet(name=None) -> str:
  - Function with an optional name argument defaulting to None.
-    name = name or "Guest"
  - Uses Python's truthiness: if name is falsy (None, "", 0, etc.), assigns "Guest".
-    return f"Hello, {name}!"
  - Returns a formatted greeting.

Note: Truthiness-based defaults are convenient but can be surprising if legitimate falsy values (like an empty string) should be preserved. Prefer explicit checks in those cases.

## 3. For Loops and Iterables
Code example 1:
```python
def sum_of_squares(nums):
    total = 0
    for i, n in enumerate(nums, start=1):
        total += n * n
    return total
```

### Line-by-line explanation breaking down each line
- def sum_of_squares(nums):
  - Defines a function that accepts an iterable of numbers.
-    total = 0
  - Initializes a running total.
-    for i, n in enumerate(nums, start=1):
  - Iterates over nums with an index i (starting at 1) and the current number n.
-        total += n * n
  - Adds the square of n to the running total.
-    return total
  - Returns the final sum of squares.

Code example 2:
```python
def first_long_string(strings, min_len=5):
    for s in strings:
        if len(s) >= min_len:
            return s
    return None
```

### Line-by-line explanation breaking down each line
- def first_long_string(strings, min_len=5) -> str:
  - Defines a function to find the first string whose length meets a minimum.
-    for s in strings:
  - Iterates over each string in the provided collection.
-        if len(s) >= min_len:
  - Checks if the current string meets the minimum length.
-            return s
  - Returns the first string meeting the condition.
-    return None
  - If no string satisfies the condition, returns None to indicate absence.

## 4. While Loops and Loop Control
Code example 1:
```python
def countdown(n: int) -> int:
    while n > 0:
        print(n)
        n -= 1
    return 0
```

### Line-by-line explanation breaking down each line
- def countdown(n: int) -> int:
  - Defines a function that counts down from n to 0.
-    while n > 0:
  - Repeats the block while the condition is true.
-        print(n)
  - Outputs the current value to the console (or log).
-        n -= 1
  - Decrements n to progress toward the termination condition.
-    return 0
  - Returns a sentinel value when the loop completes.

Code example 2:
```python
def find_first_divisible(nums, k):
    i = 0
    while i < len(nums):
        if nums[i] % k == 0:
            return nums[i]
        i += 1
    return None
```

### Line-by-line explanation breaking down each line
- def find_first_divisible(nums, k) -> int | None:
  - Defines a function to locate the first number divisible by k.
-    i = 0
  - Initializes an index counter.
-    while i < len(nums):
  - Loops while the index is within bounds.
-        if nums[i] % k == 0:
  - Checks divisibility for the current element.
-            return nums[i]
  - Returns the first matching element immediately.
-        i += 1
  - Moves to the next element.
-    return None
  - If no element is divisible, returns None.

## 5. For-Else and Loop-Else Patterns
Code example 1:
```python
def find_first_even(numbers):
    for n in numbers:
        if n % 2 == 0:
            break
    else:
        return None
    return n
```

### Line-by-line explanation breaking down each line
- def find_first_even(numbers) -> int | None:
  - Defines a function to locate the first even number.
-    for n in numbers:
  - Iterates over the sequence.
-        if n % 2 == 0:
  - Checks evenness.
-            break
  - Exits the loop when an even number is found.
-    else:
  - The else block attached to the for-loop executes only if the loop did not encounter a break.
-        return None
  - Returns None if no even number was found.
-    return n
  - Returns the found even number when break occurred.

Code example 2 (nested loop with else):
```python
def find_first_prime(numbers):
    for n in numbers:
        is_prime = True
        for d in range(2, int(n**0.5) + 1):
            if n % d == 0:
                is_prime = False
                break
        if is_prime:
            return n
    return None
```

### Line-by-line explanation breaking down each line
- def find_first_prime(numbers) -> int | None:
  - Defines a function to locate the first prime in the list.
-    for n in numbers:
  - Iterates over each candidate number.
-        is_prime = True
  - Assumes primality until proven otherwise.
-        for d in range(2, int(n**0.5) + 1):
  - Checks divisibility up to the square root of n.
-            if n % d == 0:
  - If a divisor is found, n is not prime.
-                is_prime = False
  - Mark as not prime.
-                break
  - Exit the inner loop early.
-        if is_prime:
  - If no divisors were found, n is prime.
-            return n
  - Return the first prime found.
-    return None
  - If no prime is found, return None.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Mutable default arguments
  - Bad:
    ```python
    def append_to_list(item, lst=[]):
        lst.append(item)
        return lst
    ```
  - Good:
    ```python
    def append_to_list(item, lst=None):
        if lst is None:
            lst = []
        lst.append(item)
        return lst
    ```
- Pitfall 2: Using is vs == for equality
  - Bad:
    ```python
    def is_five(x):
        return x is 5
    ```
  - Good:
    ```python
    def is_five(x):
        return x == 5
    ```
- Pitfall 3: Modifying a list while iterating
  - Bad:
    ```python
    items = [1, 2, 3, 4]
    for i in range(len(items)):
        if items[i] % 2 == 0:
            del items[i]
    ```
  - Good:
    ```python
    items = [1, 2, 3, 4]
    items = [x for x in items if x % 2 != 0]
    ```
- Pitfall 4: Off-by-one errors with range
  - Bad:
    ```python
    for i in range(len(arr) + 1):
        do_something(arr[i])
    ```
  - Good:
    ```python
    for i in range(len(arr)):
        do_something(arr[i])
    ```
- Pitfall 5: Assuming truthiness equals validity
  - Bad:
    ```python
    data = fetch_data()
    if data:  # could be empty list/dict, but meaningful in context
        process(data)
    ```
  - Good:
    ```python
    data = fetch_data()
    if data is not None and len(data) > 0:
        process(data)
    ```

## Y. Why This Matters In Real Systems — production context and real usage
- Predictable control flow reduces bugs and makes behavior easier to reason about during production incidents.
- Clear conditionals enable accurate input validation, feature flags, and error handling in APIs and services.
- For loops are central to processing datasets, streaming data, and batch jobs. Understanding iteration, early exits, and loop-else logic helps implement robust parsers, log processing, and analytics pipelines.
- Short-circuit evaluation and truthiness help write concise defaulting logic, but must be used with care to avoid surprising outcomes (e.g., empty strings, zeros, or custom objects).
- In high-traffic systems, micro-optimizations (while loops with careful termination, avoiding unnecessary work inside loops) can reduce CPU usage and latency. More importantly, readable and well-structured control flow improves maintainability, testability, and on-call responsiveness.

## Z. Study Questions — 5 recall questions
1) What is the difference between if/elif/else and nested if statements in terms of flow and readability?
2) Explain the for-else construct and describe a scenario where it’s useful.
3) What is a potential pitfall of using the truthiness of a value (e.g., x or default) to select a value?
4) Why is it problematic to remove items from a list while iterating over it with a standard for loop?
5) Write a short code snippet that uses a while loop and a break to implement a sentinel-controlled loop.

## Exercise — a practical multi-part coding challenge
Part A: Categorize and summarize records
- Implement categorize_records(records) that:
  - Each record is a dict with keys: 'name', 'score' (int 0-100), and optional 'status' (string).
  - Returns a list of strings in the form "name: PASS" if score >= 60, otherwise "name: FAIL".
  - If 'status' is provided, include it in the output: "name (status): PASS/FAIL".

Part B: Count and group by category
- Extend the function to also return a dict counting records per category derived from 'status' if present; default category to "unknown" when absent.

Part C: Stream processing with sentinel
- Write process_stream(lines) that:
  - Takes an iterable of strings representing lines from a log/stream.
  - Uses a while loop and a sentinel "QUIT" to stop processing.
  - For each line, if it starts with "ERROR", increment an error_count.
  - Return a tuple (processed_count, error_count) where processed_count is the number of lines processed before QUIT.

Example usage hints (not required to run in isolation):
- Part A example input:
  [
    {'name': 'Alice', 'score': 92, 'status': 'admin'},
    {'name': 'Bob', 'score': 57},
    {'name': 'Charlie', 'score': 65, 'status': 'guest'},
  ]
- Expected Part A output (example):
  ["Alice (admin): PASS", "Bob: FAIL", "Charlie (guest): PASS"]

- Part C example input:
  [
    "INFO startup",
    "ERROR failed to connect",
    "WARN retrying",
    "ERROR timeout",
    "QUIT",
    "INFO should not be processed"
  ]
- Expected Part C output (example):
  (4, 2)

Remember to test edge cases:
- Empty inputs
- Very large lists
- Missing keys in Part A
- Lines without a QUIT in Part C (document behavior expectations)