# Track: Backend Engineering — Module: Phase 1 — Language Foundations
## Topic: Variables, Data Types & Operators (Python)

Compelling introductory paragraph:
In backend engineering, the way you represent, transform, and reason about data underpins every service—from request validation and API contracts to data modeling and performance-critical pipelines. Mastery of variables, data types, and operators in Python lays the foundation for robust, predictable code that scales with your systems. This lesson builds a concrete mental model: how Python stores values, how to manipulate them safely, and how to reason about code paths in real-world applications.

## 1. Variables and Basic Data Types
Python uses dynamic typing, so you can assign different types to the same variable over time. Understanding basic types (int, float, str, bool, None) and how Python reports them is essential for building reliable backend logic, validators, and data transformers.

```python
# Variables and basic types
a = 42                  # int
b = 3.14                # float
name = "Alice"          # str
is_active = True          # bool
nothing = None            # None

# Inspect types at runtime
print(type(a), a)
print(type(b), b)
print(type(name), name)
print(type(is_active), is_active)
print(type(nothing), nothing)
```

### Line-by-line explanation
- a = 42: Assigns an integer value to variable a.
- b = 3.14: Assigns a floating-point number to b.
- name = "Alice": Assigns a string to name.
- is_active = True: Assigns a boolean value to is_active.
- nothing = None: Assigns the special None value to nothing.
- print(type(a), a): Prints the runtime type of a and its value.
- print(type(b), b): Prints the runtime type of b and its value.
- print(type(name), name): Prints the runtime type of name and its value.
- print(type(is_active), is_active): Prints the runtime type of is_active and its value.
- print(type(nothing), nothing): Prints the runtime type of nothing (NoneType) and its value.

## 2. Numeric Types and Arithmetic Operators
Numbers are foundational in calculations, pricing logic, pagination math, and more. Python supports int and float (and complex), with standard arithmetic operators and clear division semantics.

```python
x = 10
y = 3

# Basic arithmetic
sum_ = x + y
diff = x - y
prod = x * y
quot_float = x / y       # always a float
quot_floor = x // y       # floor division
mod = x % y
power = x ** 2

print(sum_, diff, prod, quot_float, quot_floor, mod, power)
```

### Line-by-line explanation
- x = 10; y = 3: Define two integer operands for arithmetic.
- sum_ = x + y: Adds x and y.
- diff = x - y: Subtracts y from x.
- prod = x * y: Multiplies x and y.
- quot_float = x / y: Performs true division; result is a float (10/3 = 3.333…).
- quot_floor = x // y: Performs floor division; result is the largest integer not greater than the quotient (3).
- mod = x % y: Remainder of division (1).
- power = x ** 2: Exponentiation (x squared).
- print(...): Outputs the calculated values, illustrating type promotion to float for division.

Notes:
- Mixed-type arithmetic with int and float promotes to float, e.g., 5 + 2.5 -> 7.5.

## 3. Strings and Formatting
Strings are vital for logs, messages, API payloads, and templating. Python supports concatenation, repetition, slicing, and modern formatting with f-strings.

```python
greeting = "Hello"
target = "World"

# Basic operations
concat = greeting + " " + target
repeat = "Hi" * 3
length = len(concat)

# Formatting with f-strings
message = f"{concat}, length={length}"

# Escape sequences and raw strings
path = r"C:\projects\backend"
multiline = """Line1
Line2"""

print(concat, repeat, length)
print(message)
print(path)
print(multiline)
```

### Line-by-line explanation
- greeting = "Hello"; target = "World": Create two string values.
- concat = greeting + " " + target: Concatenate with a space in-between.
- repeat = "Hi" * 3: Repeat the string three times.
- length = len(concat): Compute the number of characters in the concatenated string.
- message = f"{concat}, length={length}": Create a formatted string using an f-string.
- path = r"C:\projects\backend": Raw string to avoid escaping backslashes.
- multiline = """Line1\nLine2""": A triple-quoted string representing a two-line block.
- print(...): Output the computed values to demonstrate behavior.

Common formatting notes:
- Prefer f-strings for readability and performance over older concatenation approaches.
- Use raw strings for Windows file paths or regular expressions to avoid excessive escaping.

## 4. Booleans, None, and Truthiness
Python uses truthiness to determine how values are interpreted in boolean contexts. None and False are distinct, and empty containers are considered False in conditional statements.

```python
values = [[], "", 0, None, [1, 2], "text"]

truthiness = [bool(v) for v in values]

# Truthiness results
print(truthiness)

# None vs False
a = None
b = False

print(a is None)      # True
print(a == b)          # False
print(bool(a), bool(b)) # False, False
```

### Line-by-line explanation
- values = [[], "", 0, None, [1, 2], "text"]: List containing various types to test truthiness.
- truthiness = [bool(v) for v in values]: Create a list of booleans representing each value’s truthiness.
- print(truthiness): Show the truthiness results: [False, False, False, False, True, True].
- a = None; b = False: Define two distinct concepts, None and False.
- print(a is None): Checks identity; True if a is precisely None.
- print(a == b): Checks equality; None is not equal to False.
- print(bool(a), bool(b)): Converts both to their boolean values (both False).

## 5. Type Casting and Safe Parsing
Casting converts values from one type to another. Safe parsing handles invalid inputs gracefully without crashing.

```python
s_num = "123"
n = int(s_num)          # converts string to int

f = float("3.14")        # string to float

# Safe parsing with error handling
def safe_int(s):
    try:
        return int(s)
    except (ValueError, TypeError):
        return None

print(n, f)
print(safe_int("456"), safe_int("abc"))
```

### Line-by-line explanation
- s_num = "123"; n = int(s_num): Convert numeric string to an integer.
- f = float("3.14"): Convert numeric string to a float.
- safe_int(s): Define a helper to convert to int with error handling.
- try: return int(s): Attempt conversion.
- except (ValueError, TypeError): Return None if conversion fails (non-numeric input or wrong type).
- print(n, f): Output converted numeric values.
- print(safe_int("456"), safe_int("abc")): Demonstrates successful and failed conversions (None for the latter).

Tips:
- When parsing external input, guard conversions with try/except to avoid runtime crashes.
- Consider returning a Result-like structure or using Optional[int] for clearer API semantics.

## 6. Operator Precedence and Practical Patterns
Understanding precedence helps prevent subtle bugs and makes expressions expressive yet predictable.

```python
a, b, c = 2, 3, 4

# Precedence vs parentheses
order_no_parens = a + b * c        # 2 + (3 * 4) = 14
order_with_parens = (a + b) * c    # (2 + 3) * 4 = 20

# Equality vs identity
lst1 = [1, 2, 3]
lst2 = lst1
lst3 = [1, 2, 3]

eq = (lst1 == lst3)   # True (values equal)
same_id = (lst1 is lst3)  # False (different objects)

print(order_no_parens, order_with_parens, eq, same_id)
```

### Line-by-line explanation
- a, b, c = 2, 3, 4: Initialize three integers for arithmetic experiments.
- order_no_parens = a + b * c: Demonstrates operator precedence (multiplication before addition).
- order_with_parens = (a + b) * c: Parentheses override default precedence.
- lst1 = [1, 2, 3]; lst2 = lst1; lst3 = [1, 2, 3]: Create lists to compare identity and equality.
- eq = (lst1 == lst3): True because the contents are equal.
- same_id = (lst1 is lst3): False because they are different list objects.
- print(...): Show computed results illustrating precedence and equality/identity.

## X. Common Beginner Mistakes
### Pitfall 1: Inefficient string concatenation in a loop
Bad:
```python
strings = ["a", "b", "c", "d"]
result = ""
for s in strings:
    result += s
```
Good:
```python
strings = ["a", "b", "c", "d"]
parts = []
for s in strings:
    parts.append(s)
result = "".join(parts)
```

### Line-by-line explanation
- Bad approach builds a new string on every iteration, leading to O(n^2) time due to repeated allocations.
- Good approach collects substrings in a list and joins once, producing O(n) time with fewer allocations.

### Pitfall 2: Using is to compare values instead of equality
Bad:
```python
a = 1000
b = 1000
print(a is b)  # Might be False
```
Good:
```python
a = 1000
b = 1000
print(a == b)  # True
```

### Line-by-line explanation
- is checks identity (whether two references point to the same object).
- == checks value equality (do the values compare equal).

### Pitfall 3: Default mutable arguments in functions
Bad:
```python
def append_to_list(item, lst=[]):
    lst.append(item)
    return lst
```
Good:
```python
def append_to_list(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

### Line-by-line explanation
- Mutable default args reuse the same list across calls, causing surprising behavior.
- Using None as a sentinel and creating a new list inside ensures clean, independent calls.

### Pitfall 4: Ignoring None or falsy values in checks
Bad:
```python
def safe_divide(a, b):
    return a / b  # If b == 0 or None, this breaks
```
Good:
```python
def safe_divide(a, b):
    if b is None or b == 0:
        return None
    return a / b
```

### Line-by-line explanation
- The bad version fails on division by zero or None, causing runtime errors.
- The good version explicitly guards against None and zero to return a safe result.

## Y. Why This Matters In Real Systems
- Correct type handling reduces runtime errors in API endpoints, data pipelines, and microservices communication.
- Clear understanding of mutable vs immutable types prevents subtle bugs in caching, memoization, and concurrency contexts.
- Proper parsing and formatting are crucial for input validation, serialization (JSON, DB interfaces), and API contracts.
- Operator precedence and truthiness logic impact business rules (pricing, eligibility, feature flags) and can lead to critical bugs if misunderstood.
- Readable, well-typed code improves maintainability, onboarding, and performance profiling in production environments.

## Z. Study Questions
1) What is the difference between is and == in Python?  
2) What will be the results of 7 / 2 and 7 // 2?  
3) How do you create a string that includes variable values using f-strings?  
4) What is the truthiness of an empty list, an empty string, and the number 0?  
5) How would you safely parse an integer from user input that might be invalid?

## Exercise
Part A: Build a small utilities module that exposes a function describe_value and a simple calculator.

Code: Part A
```python
# Part A: describe_value and a simple calculator
from typing import Optional, Union

def describe_value(val: object) -> str:
    """Return a human-readable description of the value's type and content."""
    t = type(val).__name__
    return f"Type: {t}, Value: {val}"

def calculate(a: Union[int, float], b: Union[int, float], op: str) -> Optional[float]:
    """Perform a basic arithmetic operation.

    Supported ops: '+', '-', '*', '/', '//', '**'
    Returns None for invalid operator or division by zero.
    """
    if op == '+':
        return a + b
    if op == '-':
        return a - b
    if op == '*':
        return a * b
    if op == '/':
        if b == 0:
            return None
        return a / b
    if op == '//':
        if b == 0:
            return None
        return a // b
    if op == '**':
        return a ** b
    return None

# Example usage (for quick local checks)
if __name__ == "__main__":
    print(describe_value(123))
    print(describe_value("backend"))
    print("Calc 5 + 2 =", calculate(5, 2, '+'))
    print("Calc 5 / 0 =", calculate(5, 0, '/'))
```

### Line-by-line explanation
- Imports: Bring Optional and Union for type hints.
- describe_value: Determines the runtime type name and formats a descriptive string.
- calculate: Implements a small switch-like structure for supported operators.
- Each if block handles a specific operator; division and floor division guard against division by zero.
- The __main__ block demonstrates basic usage and sanity checks.

Code: Part B
```python
# Part B: Parsing and formatting exercise
def format_user(name: str, age: int) -> str:
    """Return a user-friendly string with name and age using an f-string."""
    return f"User {name} is {age} years old."

def parse_numbers(csv: str) -> list:
    """Parse a comma-separated list of numbers, skipping invalid entries."""
    nums = []
    for part in csv.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            nums.append(int(part))
        except ValueError:
            pass
    return nums

# Example usage
if __name__ == "__main__":
    print(format_user("Alice", 30))
    print(parse_numbers("1, 2, 3, four, 5"))
```

### Line-by-line explanation
- format_user: Uses an f-string to embed name and age into a readable sentence.
- parse_numbers: Splits the CSV input, trims whitespace, and safely converts to int, skipping invalid entries.
- __main__ demonstrates both functions with sample data.

Code: Part C
```python
# Part C: Small integration example
def summarize(numbers: list) -> dict:
    """Return a summary dict for a list of numbers."""
    if not numbers:
        return {"count": 0, "sum": 0, "average": None}
    total = sum(numbers)
    avg = total / len(numbers)
    return {"count": len(numbers), "sum": total, "average": avg}

# Example usage
if __name__ == "__main__":
    data = [1, 2, 3, 4, 5]
    print(summarize(data))
    print(summarize([]))
```

### Line-by-line explanation
- summarize: Computes count, total, and average, handling empty lists gracefully.
- __main__: Demonstrates with a non-empty dataset and an empty list.

These exercises reinforce core concepts:
- Variable types and basic introspection.
- Arithmetic operations and operator semantics.
- Safe parsing, string formatting, and basic data aggregation.
- The importance of clean, readable code that behaves predictably in production systems.