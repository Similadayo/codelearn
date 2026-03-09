# Track: Backend Engineering — Phase 1: Language Foundations — Topic: Variables, Data Types & Operators (PHP)

Variables, data types, and operators are the building blocks of every PHP backend system. Mastering how to declare, convert, compare, and combine values lets you write safer, more maintainable code, and reduces runtime errors in production services. This lesson walks through PHP’s core concepts with practical examples, line-by-line explanations, common beginner mistakes, and a hands-on exercise to cement understanding.

## 1. Variables and Basic Types

PHP uses dollar-sign prefixed variables. PHP is dynamically typed, so variables can change type, but you can also apply explicit typing to improve reliability.

```php
<?php
// Basic variable declarations in PHP
$intVal    = 42;                    // integer
$floatVal  = 3.14159;              // float (double precision)
$stringVal = "PHP is awesome";      // string
$boolVal   = true;                  // boolean
$arrayVal  = [1, 2, 3, 4];          // indexed array
$assocVal  = ["name" => "Ada", "role" => "Engineer"]; // associative array
$nullVal   = null;                  // null

// Inspect values and types at runtime
echo "Name: ".$stringVal.PHP_EOL;
var_dump($intVal, $floatVal, $boolVal, $nullVal);

// Access nested data
echo "First assoc name: ".$assocVal["name"].PHP_EOL;
```

### Line-by-line explanation
- // Basic variable declarations in PHP:: Declares variables with inferred types (int, float, string, bool, arrays, null).
- $intVal = 42;: Assigns an integer value to a variable.
- $floatVal = 3.14159;: Assigns a floating-point value.
- $stringVal = "PHP is awesome";: Assigns a string.
- $boolVal = true;: Assigns a boolean.
- $arrayVal = [1, 2, 3, 4];: Creates an indexed array.
- $assocVal = ["name" => "Ada", "role" => "Engineer"];: Creates an associative array (map) with string keys.
- $nullVal = null;: Represents a null value.
- echo ...: Outputs a string containing the value of $stringVal.
- var_dump(...): Dumps detailed type and value information for the listed variables.
- $assocVal["name"] ...: Demonstrates array access for an associative array.
```

## 2. Type Juggling, Type Declarations, and Casting

PHP can implicitly convert types (type juggling), but you can enforce types for function inputs/returns and cast values explicitly for clarity and safety.

```php
<?php
declare(strict_types=1); // Enable strict typing for scalar values in this file

function add(int $a, int $b): int {
    return $a + $b;
}

echo "Add(2, 3) = ".add(2, 3).PHP_EOL;

// The following would throw a TypeError under strict_types
// echo "Add('2', '3') = ".add("2", "3").PHP_EOL;

// Explicit casting examples
$raw = "7";
$castToInt = (int)$raw;     // 7
$castToFloat = (float)$raw; // 7.0

echo "Casts: int={$castToInt}, float={$castToFloat}".PHP_EOL;
```

### Line-by-line explanation
- declare(strict_types=1);: Turns on strict scalar type checking in this file.
- function add(int $a, int $b): int { ... }: Declares a function with explicit parameter and return types.
- return $a + $b;: Returns the sum as an integer.
- add(2, 3): Calls the function with integers; outputs 5.
- The commented line demonstrates that passing strings would fail under strict types.
- $raw = "7";: A numeric string that will be cast explicitly.
- (int)$raw and (float)$raw: Explicitly cast the string to int and float respectively.
- Output lines show the results of the casts.

## 3. Operators: Arithmetic, Assignment, Comparison, Logical, and String

Operators let you compute values, test conditions, and build complex logic. PHP supports a broad set of operators.

```php
<?php
$a = 10;
$b = 3;

// Arithmetic
$sum = $a + $b;
$diff = $a - $b;
$prod = $a * $b;
$quot = intdiv($a, $b);  // integer division
$mod  = $a % $b;          // remainder

// Assignment (compound)
$x = 0;
$x += 5;  // equivalent to: $x = $x + 5

// String concatenation
$greeting = "Hello " . "World";

// Comparisons
$equal = ($a == 10);          // true (loose equality)
$strict = ($a === "10");      // false (strict equality with type check)

// Logical
$isReady = ($a > 5) && ($b < 5);
$isAvailable = ($a > 15) || ($b < 5);

// Truthiness of values
$truthy = !empty($greeting);    // true if non-empty string
```

### Line-by-line explanation
- $a = 10; $b = 3;: Initialize two numeric variables.
- Arithmetic: +, -, *, intdiv, %: Compute sum, difference, product, integer division, and remainder.
- $x += 5;: Compound assignment operator (increments by 5).
- $greeting = "Hello " . "World";: Concatenates two strings using the dot operator.
- $equal vs $strict: Demonstrates loose vs strict comparison semantics.
- $isReady: Logical AND combining two conditions.
- $isAvailable: Logical OR combining two conditions.
- $truthy: Checks for non-empty value using empty().

## 4. Arrays and Basic Data Structures

Arrays are fundamental for data modeling, whether handling lists or records. PHP arrays are ordered maps that can be indexed or associative.

```php
<?php
// Indexed array
$nums = [1, 2, 3, 4, 5];
$first = $nums[0];                 // 1
$nums[] = 6;                        // append element

// Associative array
$user = [
    "id" => 101,
    "name" => "Grace Hopper",
    "roles" => ["Developer", "Mentor"]
];

// Array utilities
$sumOfNums = array_sum($nums);     // 1+2+3+4+5+6 = 21
$reversed  = array_reverse($nums);

// Iterate
foreach ($nums as $n) {
    echo $n." ";
}
```

### Line-by-line explanation
- $nums = [1, 2, 3, 4, 5];: Creates an indexed array.
- $first = $nums[0];: Accesses the first element (index 0).
- $nums[] = 6;: Appends a new element to the end of the array.
- $user = [...]: Builds an associative array representing a user record; includes a nested array for roles.
- $sumOfNums = array_sum($nums);: Sums all numeric values in the array.
- $reversed = array_reverse($nums);: Reverses the order of the array.
- foreach ($nums as $n) { ... }: Iterates and outputs each number.

## 5. Nulls, Coalescing, and Safe Access

Nulls and truthy/falsey checks are common in PHP code dealing with databases, user input, and APIs. The null coalescing operator helps provide defaults succinctly.

```php
<?php
$maybe = null;
$value = $maybe ?? "default";           // "default" since $maybe is null

$input = [];                             // empty, no keys
$name  = $input["name"] ?? "guest";      // "guest" (safe access)

$hasValue = isset($input["name"]);        // false
```

### Line-by-line explanation
- $maybe = null;: Demonstrates a value that could be null.
- $value = $maybe ?? "default";: Uses null coalescing to provide a fallback when $maybe is null.
- $input["name"] ?? "guest": Demonstrates safe access with a fallback when the key is missing.
- isset($input["name"]): Checks whether a key exists before using it.

## X. Common Beginner Mistakes

Below are real pitfalls with bad vs good code examples to help you spot and fix issues early.

- Pitfall 1: Assignment in condition (instead of comparison)
  Bad:
  ```php
  if ($count = 0) {
      // bug: this assigns 0 to $count, condition always false
  }
  ```
  Good:
  ```php
  if ($count == 0) {
      // correct: compare value
  }
  ```
  Good (strict):
  ```php
  if ($count === 0) {
      // strict comparison ensures same type and value
  }
  ```

- Pitfall 2: Not initializing variables before use
  Bad:
  ```php
  echo $name; // Notice: Undefined variable: name
  ```
  Good:
  ```php
  $name = "";
  echo $name;
  ```

- Pitfall 3: Relying on loose comparisons
  Bad:
  ```php
  $val = "0";
  if ($val == 0) { /* intended to check numeric zero, but also true for "" and "false" */ }
  ```
  Good:
  ```php
  $val = "0";
  if ($val === "0") { /* strict string comparison */ }
  ```

- Pitfall 4: Accessing array keys without checking existence
  Bad:
  ```php
  $userName = $user['name']; // may emit notices if 'name' is missing
  ```
  Good:
  ```php
  $userName = $user['name'] ?? null;
  if ($userName === null) {
      // handle missing key
  }
  ```

- Pitfall 5: Not using strict types where appropriate
  Bad:
  ```php
  // global, insecure coupling to types
  function setAge($age) {
      return $age + 1;
  }
  ```
  Good:
  ```php
  declare(strict_types=1);
  function setAge(int $age): int {
      return $age + 1;
  }
  ```

## Y. Why This Matters In Real Systems

- Reliability: Clear variable types and explicit casting reduce subtle bugs that appear only with certain inputs or state changes.
- Maintainability: Strict typing (where appropriate) helps new team members understand function contracts, reducing onboarding time.
- Security and correctness: Explicit type checks and safe access patterns mitigate common attack vectors (e.g., improper input handling, undefined indexes, and unexpected type coercions).
- Tooling and quality: PHPStan, Psalm, and IDEs provide better feedback when code uses explicit types and well-defined data structures.
- Performance considerations: Avoid unnecessary type juggling; use typed interfaces and clear data shapes to enable optimizations and static analysis.

## Z. Study Questions

1) What is the difference between gettype($var) and var_dump($var)?  
2) How does declare(strict_types=1) affect function parameter types in PHP?  
3) What is the operator used to concatenate strings in PHP?  
4) When would you use the null coalescing operator ??, and what does it do?  
5) Why is it important to use strict comparison (===) instead of loose comparison (==) in backend logic?

## Exercise

Part A: Profile and category function
- Create a PHP script that defines a user profile with name (string), age (int), height (float), and isMember (bool). Build a profile summary string and implement a function ageCategory(int $age): string that returns "Child" (<13), "Teen" (13-17), "Adult" (18-64), or "Senior" (65+). Use strict types.

Part B: Safe input handling and casting
- Simulate user input as a string for age (e.g., "27"). Cast to int safely and reuse in the ageCategory logic. Ensure you handle non-numeric input gracefully by returning "Unknown".

Part C: Product data and formatted output
- Represent a product as an associative array with keys: id (int), name (string), price (float). Print a formatted line: "Product [id]: [name] costs $[price with two decimals]".

Part D: Safe math with error handling
- Write a small function divide(float $numerator, float $denominator): float that returns the division result, but throws a descriptive exception if denominator is zero. Demonstrate calling it with valid and zero denominator (catch and print an error message).

Example scaffold (you can expand with your own details):

```php
<?php
declare(strict_types=1);

// Part A: Profile and ageCategory
function ageCategory(int $age): string {
    if ($age < 13) return "Child";
    if ($age <= 17) return "Teen";
    if ($age <= 64) return "Adult";
    return "Senior";
}

$name = "Jordan Lee";
$age = 29;          // int
$height = 1.75;      // float
$isMember = true;     // bool

$profileSummary = sprintf(
    "Profile: %s, Age %d, Height %.2f m, Member: %s",
    $name,
    $age,
    $height,
    $isMember ? "Yes" : "No"
);
echo $profileSummary.PHP_EOL;
echo "Age category: ".ageCategory($age).PHP_EOL;

// Part B: Safe input casting
$rawInput = "27";                 // simulate user-provided string
$potentialInt = (int)$rawInput;    // explicit casting
echo "Input age as int: ".$potentialInt.PHP_EOL;

// Part C: Product data
$product = [
    "id" => 101,
    "name" => "BackEnd T-Shirt",
    "price" => 19.99
];
printf("Product %d: %s costs $%.2f\n", $product["id"], $product["name"], $product["price"]);

// Part D: Safe division
function divide(float $numerator, float $denominator): float {
    if ($denominator == 0.0) {
        throw new \\Exception("Cannot divide by zero.");
    }
    return $numerator / $denominator;
}

try {
    echo "Division result: ".divide(10.0, 2.0).PHP_EOL;
    // This will throw
    echo "Division result: ".divide(10.0, 0.0).PHP_EOL;
} catch (\\Exception $e) {
    echo "Error: ".$e->getMessage().PHP_EOL;
}
```

This lesson provides a solid foundation for handling variables, data types, and operators in PHP-backed systems. Use the exercise to build comfort with type handling, safe access patterns, and defensive programming that pays off in real-world production code.