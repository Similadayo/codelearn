# Track: Backend Engineering — Phase 1 — Language Foundations
Topic: Control Flow — Conditions & Loops (PHP)

Control flow is how programs decide what to do next. It powers authentication checks, feature flags, data validation, and processing pipelines. Mastery of conditions and loops lets you implement complex business logic clearly, safely, and efficiently in PHP-backed systems. This lesson walks you through the core building blocks, with concrete PHP examples, explanations, common pitfalls, real-world relevance, practice questions, and a hands-on exercise.

## 1. If/Else: Branching Your Logic
Code examples show how to choose between multiple paths based on conditions.

```php
<?php
// Basic conditional branching
$score = 82;

if ($score >= 90) {
    $grade = 'A';
} elseif ($score >= 75) {
    $grade = 'B';
} elseif ($score >= 60) {
    $grade = 'C';
} else {
    $grade = 'F';
}

echo "Grade: $grade\n";
```

### Line-by-line explanation breaking down each line
- <?php: Opens the PHP script.
- // Basic conditional branching: Comment describing the section.
- $score = 82;: Initialize a numeric variable used for branching.
- if ($score >= 90) { ... }: If the score is 90 or higher, assign grade A.
- } elseif ($score >= 75) { ... }: If the previous condition was false, check if score is at least 75 to assign B.
- } elseif ($score >= 60) { ... }: If still false, check for a C threshold.
- } else { ... }: If none of the above conditions are met, assign F.
- $grade = 'F';: Assigns the final grade when no earlier condition matched.
- echo "Grade: $grade\n";: Outputs the computed grade.
- ?>: Ends the PHP script (implicit closing tag is okay in modern PHP, but shown here for completeness).

```php
<?php
// Guard against missing data and demonstrate strict vs non-strict boundaries
$ageInput = '18'; // could come from input, query, or form
$age = (int) $ageInput;

if ($age === 18) {
    $status = 'Young Adult';
} else {
    $status = 'Other';
}
echo "Status: $status\n";
```

### Line-by-line explanation breaking down each line
- $ageInput = '18';: Simulates input data as a string.
- $age = (int) $ageInput;: Casts the input to an integer to ensure numeric comparison.
- if ($age === 18) { ... }: Uses strict comparison to check exact type and value.
- } else { ... }: Fallback when the strict comparison fails.
- $status = 'Young Adult'; or 'Other': Sets a human-readable category.
- echo "Status: $status\n";: Prints the resulting status.

## 2. Truthy/Falsy, Isset, Empty, and Null Handling
Understand how PHP decides “truthy” vs “falsy” values and how to safely access optional data.

```php
<?php
// Null coalescing operator to provide defaults when a key might be absent
$username = $_GET['username'] ?? 'guest';
echo "User: $username\n";
```

### Line-by-line explanation breaking down each line
- $_GET['username'] ?? 'guest': If the 'username' key exists in the query string, use its value; otherwise use 'guest'.
- $username = ...;: Stores the resulting value in $username.
- echo "User: $username\n";: Outputs the resolved username.
```

```php
<?php
// Distinguish between null-coalescing and truthy/falsy checks
$input = ''; // could be user input
$displayName = $input ?: 'Anonymous'; // uses truthiness
echo "Display: $displayName\n";
```

### Line-by-line explanation breaking down each line
- $input = '';: Represents an input value that might be empty.
- $displayName = $input ?: 'Anonymous';: If $input is truthy, use it; otherwise fall back to 'Anonymous'. This treats '', 0, '0', false, null as falsey.
- echo "Display: $displayName\n";: Prints the chosen display name.
- Note: The null-coalescing operator ?? and the Elvis shorthand ?: behave differently: ?? only checks for null, while ?: checks for truthiness.

## 3. Switch (and a quick note on Match in PHP 8+)
Switch statements map a single value to multiple branches. In modern PHP, match (PHP 8+) is a stricter, expression-based alternative.

```php
<?php
$status = 'pending';

switch ($status) {
    case 'pending':
        $label = 'Pending';
        break;
    case 'approved':
        $label = 'Approved';
        break;
    case 'rejected':
        $label = 'Rejected';
        break;
    default:
        $label = 'Unknown';
}
echo "Status label: $label\n";
```

### Line-by-line explanation breaking down each line
- $status = 'pending';: The value we want to map.
- switch ($status) { ... }: Begin a switch; route based on $status.
- case 'pending': $label = 'Pending'; break;: If status is 'pending', set label and exit switch.
- case 'approved': ...; break;: If status is 'approved', set label and exit.
- case 'rejected': ...; break;: If status is 'rejected', set label and exit.
- default: $label = 'Unknown';: Fallback when none match.
- echo "Status label: $label\n";: Print the resulting label.
```

```php
<?php
// Modern alternative (PHP 8+) using match (if available)
/$status = 'approved';
$label = match ($status) {
    'pending'  => 'Pending',
    'approved' => 'Approved',
    'rejected' => 'Rejected',
    default    => 'Unknown',
};
echo "Match label: $label\n";
```

### Line-by-line explanation breaking down each line
- $status = 'approved';: Example input.
- $label = match ($status) { ... };: The match expression maps each possible value to a result with strict comparison.
- 'pending'  => 'Pending', etc.: Each arm defines the output for a given input.
- default => 'Unknown': Fallback when no arms match.
- echo "Match label: $label\n";: Outputs the matched label.
- Note: Match is available in PHP 8+. If you’re on PHP 7.x, use the switch example above.

## 4. Short-Circuiting, Ternaries, and Null Coalescing
Leverage concise forms to keep code readable without sacrificing clarity.

```php
<?php
$isAdmin = true;
$role = $isAdmin ? 'admin' : 'user';
echo "Role: $role\n";
```

### Line-by-line explanation breaking down each line
- $isAdmin = true;: Boolean indicating admin access.
- $role = $isAdmin ? 'admin' : 'user';: Ternary operator selects 'admin' if true, otherwise 'user'.
- echo "Role: $role\n";: Prints the chosen role.
```

```php
<?php
// Combining null coalescing with a simple condition
$config = []; // imagine this came from a config file
$timeout = $config['timeout'] ?? 30; // default to 30 if not set
$mode = $config['mode'] ?? 'normal';
echo "Timeout: $timeout, Mode: $mode\n";
```

### Line-by-line explanation breaking down each line
- $config = [];: Simulated configuration array.
- $timeout = $config['timeout'] ?? 30;: Use config value if present, else 30.
- $mode = $config['mode'] ?? 'normal';: Use mode from config if present, else 'normal'.
- echo "Timeout: $timeout, Mode: $mode\n";: Print the resolved settings.

## 5. Loops: For, Foreach, While, and Do-While
Loops let you process collections, generate sequences, and implement retry/backoff logic.

```php
<?php
// For loop with precomputed length (recommended to avoid repeated count calls)
$numbers = [2, 4, 6, 8];
$n = count($numbers);
for ($i = 0; $i < $n; $i++) {
    $numbers[$i] *= 2;
}
print_r($numbers);
```

### Line-by-line explanation breaking down each line
- $numbers = [2, 4, 6, 8];: Sample numeric array.
- $n = count($numbers);: Precompute length to avoid repeated evaluation inside the loop.
- for ($i = 0; $i < $n; $i++) { ... }: Classic C-style loop over indices.
- $numbers[$i] *= 2;: In-place transformation doubling each element.
- print_r($numbers);: Print the transformed array.
```

```php
<?php
// Foreach for associative arrays (clear and idiomatic)
$users = [
  ['id' => 1, 'name' => 'Alice'],
  ['id' => 2, 'name' => 'Bob'],
  ['id' => 3, 'name' => 'Carol'],
];

foreach ($users as $user) {
    echo "User {$user['id']}: {$user['name']}\n";
}
```

### Line-by-line explanation breaking down each line
- $users = [...]: An array of associative arrays representing users.
- foreach ($users as $user) { ... }: Iterates over each user entry.
- echo "User {$user['id']}: {$user['name']}\n";: Outputs a formatted line for each user.
```

```php
<?php
// While and do-while examples
$count = 0;
while ($count < 5) {
    echo "Count: $count\n";
    $count++;
}
```

### Line-by-line explanation breaking down each line
- $count = 0;: Initialize counter.
- while ($count < 5) { ... }: Repeat while condition holds.
- echo "Count: $count\n";: Print current count.
- $count++;: Increment counter.
```

```php
<?php
// Break and continue in a loop
$values = [1, 2, 3, 4, 5];
foreach ($values as $v) {
    if ($v === 3) continue; // skip 3
    if ($v > 4) break;       // stop after 4
    echo "Value: $v\n";
}
```

### Line-by-line explanation breaking down each line
- $values = [1, 2, 3, 4, 5];: Sample data.
- foreach ($values as $v) { ... }: Loop through values.
- if ($v === 3) continue;: Skip when value is 3.
- if ($v > 4) break;: Exit loop when value exceeds 4.
- echo "Value: $v\n";: Output the remaining values.

## 6. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Using loose equality (==) instead of strict equality (===) leads to type juggling.
Bad:
```php
<?php
$input = '123';
if ($input == 123) { // true due to type coercion
    echo "Matched loosely\n";
}
```
Good:
```php
<?php
$input = '123';
if ($input === '123') { // strict type and value
    echo "Matched strictly\n";
}
```
```

- Pitfall 2: Accessing array keys without checking existence.
Bad:
```php
<?php
$user = $data['user']; // potential notice if 'user' not set
echo $user;
```
Good:
```php
<?php
$user = $data['user'] ?? 'guest';
echo $user;
```
```

- Pitfall 3: Recomputing array length in a loop condition.
Bad:
```php
<?php
$arr = [10, 20, 30];
for ($i = 0; $i < count($arr); $i++) {
    // ...
}
```
Good:
```php
<?php
$arr = [10, 20, 30];
$n = count($arr);
for ($i = 0; $i < $n; $i++) {
    // ...
}
```
```

- Pitfall 4: Overusing nested ternaries for complex logic.
Bad:
```php
<?php
$level = $score > 90 ? 'A' : ($score > 80 ? 'B' : ($score > 70 ? 'C' : 'D'));
```
Good:
```php
<?php
switch (true) {
    case $score > 90: $level = 'A'; break;
    case $score > 80: $level = 'B'; break;
    case $score > 70: $level = 'C'; break;
    default: $level = 'D';
}
```
```

- Pitfall 5: Exiting from library code with exit/die.
Bad:
```php
<?php
if ($error) {
    die('Fatal error');
}
```
Good:
```php
<?php
if ($error) {
    throw new RuntimeException('Fatal error');
}
```
```

## 7. Why This Matters In Real Systems
Control flow is the backbone of business logic in production PHP systems. Correct use of conditions and loops affects correctness, reliability, readability, and performance.

- Correctness: Guard clauses and early returns prevent deep nesting and reduce bugs.
- Readability: Clear if/else chains and loop constructs make intent obvious to future maintainers.
- Performance: Avoid repeated costly operations inside hot loops; precompute lengths, minimize unnecessary computations, and choose appropriate loop constructs.
- Security: Validate inputs with explicit checks; avoid relying on truthiness that might misinterpret malicious data.
- Maintainability: Use explicit switch/match or well-factored functions to make changes isolated and testable.

Example: guard clauses in a function
```php
<?php
function getDiscount(array $customer, array $cart): float {
    if (!$customer) return 0.0; // guard clause
    if (empty($cart)) return 0.0;  // guard clause

    // Core logic using clear control flow
    $subtotal = array_sum(array_column($cart, 'price'));
    if ($customer['tier'] === 'platinum') {
        return $subtotal * 0.85;
    }
    return $subtotal * 0.9;
}
```

## 8. Study Questions — 5 recall questions
1) What is the practical difference between the null coalescing operator ?? and the ternary ?: for defaults?
2) How does a switch statement differ in readability and maintainability from a long chain of if/else if statements?
3) Why is it often better to precompute length when looping with for loops over arrays?
4) How would you safely access an optional nested value in an associative array to avoid notices?
5) When might you prefer a guard clause (early return) over deeply nested conditionals in a function?

## 9. Exercise — practical multi-part coding challenge
Objective: Build a small PHP module that processes a set of orders using principled control flow. You’ll implement helper functions, process a data set with foreach, and output a summarized report.

Part A — categorizeStatus function
- Implement a function categorizeStatus(string $status): string using a switch statement that maps:
  - 'pending' => 'Pending'
  - 'paid' => 'Paid'
  - 'shipped' => 'Shipped'
  - 'delivered' => 'Delivered'
  - any other value => 'Unknown'

Part B — isVIPShipping function
- Implement a function isVIPShipping(array $order): bool that returns true if:
  - order total > 100, or
  - customer tier is 'gold' or 'platinum'
  - Otherwise false
- The order array shape:
  [
    'id' => int,
    'total' => float,
    'customer' => ['tier' => string]
  ]

Part C — processOrders function
- Given an array of orders, use foreach to build:
  - totalOrders: count of orders
  - totalValue: sum of 'total'
  - statusCounts: associative array tallying categorizeStatus on each order's status
  - vipCount: number of orders with isVIPShipping true

Part D — input validation and robustness
- If an order missing 'total' or 'customer', treat total as 0 and customer tier as 'guest'.
- If an order has an unrecognized status, categorize as 'Unknown' using categorizeStatus.

Part E — output
- Print a clean, human-readable report:
  - Total orders, total value (formatted to 2 decimals)
  - Counts per status (Pending, Paid, Shipped, Delivered, Unknown)
  - VIP shipping count
  - List the IDs of VIP orders

Sample scaffold you can start with (you may modify and extend as needed):
```php
<?php
$orders = [
  ['id' => 101, 'status' => 'pending', 'total' => 120.50, 'customer' => ['tier' => 'gold']],
  ['id' => 102, 'status' => 'paid', 'total' => 45.00, 'customer' => ['tier' => 'silver']],
  ['id' => 103, 'status' => 'shipped', 'total' => 320.75, 'customer' => ['tier' => 'platinum']],
  ['id' => 104, 'status' => 'cancelled', 'total' => 0, 'customer' => ['tier' => 'bronze']],
];

function categorizeStatus(string $status): string {
  switch ($status) {
    case 'pending': return 'Pending';
    case 'paid': return 'Paid';
    case 'shipped': return 'Shipped';
    case 'delivered': return 'Delivered';
    default: return 'Unknown';
  }
}

function isVIPShipping(array $order): bool {
  $total = $order['total'] ?? 0;
  $tier = $order['customer']['tier'] ?? 'guest';
  return $total > 100 || in_array(strtolower($tier), ['gold', 'platinum']);
}

function processOrders(array $orders): void {
  $totalOrders = 0;
  $totalValue = 0.0;
  $statusCounts = ['Pending' => 0, 'Paid' => 0, 'Shipped' => 0, 'Delivered' => 0, 'Unknown' => 0];
  $vipOrderIds = [];

  foreach ($orders as $order) {
    $id = $order['id'] ?? null;
    $total = $order['total'] ?? 0.0;
    $statusRaw = $order['status'] ?? 'Unknown';
    $status = categorizeStatus($statusRaw);

    $totalOrders++;
    $totalValue += $total;
    if (isset($statusCounts[$status])) {
      $statusCounts[$status]++;
    } else {
      $statusCounts['Unknown']++;
    }

    if (isVIPShipping($order)) {
      if ($id !== null) $vipOrderIds[] = $id;
    }
  }

  // Output report
  echo "Orders Report:\n";
  echo "Total orders: $totalOrders\n";
  printf("Total value: %.2f\n", $totalValue);
  echo "Status counts: \n";
  foreach ($statusCounts as $k => $v) {
    echo "  $k: $v\n";
  }
  echo "VIP orders: " . count($vipOrderIds) . "\n";
  if ($vipOrderIds) {
    echo "VIP Order IDs: " . implode(', ', $vipOrderIds) . "\n";
  }
}

processOrders($orders);
```

Notes for this exercise:
- You can expand by adding unit tests for categorizeStatus and isVIPShipping.
- Consider edge cases: missing fields, numeric types, and unexpected statuses.
- Ensure outputs are readable and suitable for logs or dashboards.

End of lesson.