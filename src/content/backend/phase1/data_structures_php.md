# Data Structures — Arrays, Objects & Maps in PHP

Data structures are the building blocks your backend services use to store, transform, and transport data. In PHP, arrays are the backbone that can represent lists (indexed arrays), maps (associative arrays), and even lightweight records when combined with objects. Understanding how to work with arrays, objects, and the concept of maps lets you model domain data efficiently, craft robust APIs, and write flexible data-processing pipelines in real-world PHP systems.

## 1. PHP Arrays: Basics and Vectors (Indexed Arrays)

```php
<?php
// Indexed array (vector-like)
$numbers = [1, 2, 3, 4, 5];

// Append a value
$numbers[] = 6;

// Length of the array
$length = count($numbers);

// Iterate with index and value
foreach ($numbers as $index => $value) {
  echo "Index $index: $value\n";
}
```

### Line-by-line explanation
- <?php: Start of PHP script.
- // Indexed array (vector-like): Comment describing the concept.
- $numbers = [1, 2, 3, 4, 5];: Create an indexed array with five elements.
- $numbers[] = 6;: Append the value 6 to the end of the array.
- $length = count($numbers);: Get the number of elements in the array.
- foreach ($numbers as $index => $value) { ... }: Loop over the array, exposing both the index and the value.
- echo "Index $index: $value\n";: Print each index/value pair.
- }: End of the foreach block.
- The script ends implicitly or with closing tag if used.

Explanation: This section demonstrates PHP’s native vector-like behavior using numeric keys. You’ll commonly manipulate these when handling lists, pagination results, or batch processing data fetched from databases.

## 2. Associative Arrays as Maps: Key-Value Storage

```php
<?php
// Associative array serving as a map
$profile = [
  "id" => 101,
  "username" => "jdoe",
  "email" => "jdoe@example.com",
];

// Add a new key with a value
$profile["roles"] = ["user", "admin"];

// Safe access with null coalescing
$email = $profile["email"] ?? null;

// Iterate keys and values
foreach ($profile as $key => $val) {
  $valueText = is_array($val) ? implode(", ", $val) : (string) $val;
  echo "$key => $valueText\n";
}
```

### Line-by-line explanation
- <?php: Start of PHP script.
- // Associative array serving as a map: Comment describing the concept.
- $profile = [ ... ];: Create an associative array with string keys.
- $profile["roles"] = ["user", "admin"];: Add a new key "roles" whose value is an array.
- $email = $profile["email"] ?? null;: Retrieve the email if present; otherwise null.
- foreach ($profile as $key => $val) { ... }: Iterate over keys and values.
- $valueText = is_array($val) ? implode(", ", $val) : (string) $val;: Normalize values for display.
- echo "$key => $valueText\n";: Print key-value pairs.
- }: End of the foreach block.
- The script ends implicitly or with closing tag if used.

Explanation: Associative arrays are the practical, built-in map structure in PHP. They map strings (or any compatible keys) to values and are essential for modeling objects, configurations, or API payloads before converting to objects or JSON.

## 3. Objects in PHP: Classes and stdClass

```php
<?php
// Classic PHP class with typed properties (PHP 7.4+)
class User {
  public int $id;
  public string $name;
  public ?string $email;

  public function __construct(int $id, string $name, ?string $email = null) {
    $this->id = $id;
    $this->name = $name;
    $this->email = $email;
  }

  public function toArray(): array {
    return [
      "id" => $this->id,
      "name" => $this->name,
      "email" => $this->email,
    ];
  }

  public function __toString(): string {
    return "User($this->id): $this->name";
  }
}

$alice = new User(12, "Alice", "alice@example.com");
echo $alice; // __toString() implementation
$asArray = $alice->toArray();
echo json_encode($asArray);
```

### Line-by-line explanation
- <?php: Start of PHP script.
- // Classic PHP class with typed properties (PHP 7.4+): Comment describing the concept.
- class User { ... }: Define a class with properties and methods.
- public int $id; public string $name; public ?string $email;: Typed properties (id as int, name as string, email as nullable string).
- public function __construct(...): Constructor to initialize an instance.
- $this->id = $id; $this->name = $name; $this->email = $email;: Assign constructor arguments to properties.
- public function toArray(): array { ... }: Convert the object to an associative array.
- public function __toString(): string { ... }: String representation for printing.
- $alice = new User(12, "Alice", "alice@example.com");: Instantiate a User.
- echo $alice;: Print using __toString().
- $asArray = $alice->toArray();: Convert to an array.
- echo json_encode($asArray);: Serialize to JSON.

```php
<?php
// Simple stdClass example (generic PHP object)
$std = new stdClass();
$std->id = 7;
$std->name = "Bob";
$std->email = "bob@example.com";

// Convert to associative array
$asArray = (array) $std;
echo $asArray['name'];
```

### Line-by-line explanation
- <?php: Start of PHP script.
- // Simple stdClass example: Comment describing the concept.
- $std = new stdClass(); $std->id = 7; $std->name = "Bob"; $std->email = "bob@example.com";: Create a generic object and set properties.
- $asArray = (array) $std;: Cast the object to an associative array.
- echo $asArray['name'];: Access the name from the resulting array.

Explanation: Objects model domain entities with behavior and identity. In PHP, you can either define explicit classes or use lightweight stdClass objects for flexible data containers. This section shows both approaches and how to move data between objects and arrays.

## 4. Maps vs Arrays vs Objects: Interoperability

```php
<?php
// From associative array (map) to object
$map = ["id" => 5, "name" => "Carol"];
$obj = (object) $map;
echo $obj->name;

// From object to associative array
$newMap = (array) $obj;
print_r($newMap);
?>
```

### Line-by-line explanation
- <?php: Start of PHP script.
- // From associative array (map) to object: Comment.
- $map = ["id" => 5, "name" => "Carol"];: Create an associative array.
- $obj = (object) $map;: Cast the array to a stdClass-like object.
- echo $obj->name;: Access the name property on the object.
- // From object to associative array: Comment.
- $newMap = (array) $obj;: Cast the object back to an associative array.
- print_r($newMap);: Print the resulting array structure.

Explanation: Casting between arrays and objects enables flexible data flows—especially when decoding JSON or integrating with APIs that produce/consume either representation. Use explicit conversions to keep intent clear.

## 5. Data Transformations: JSON and API Payloads

```php
<?php
$json = '{"id":9,"name":"Dana","roles":["reader","contributor"]}';

// Decode as associative array
$dataAssoc = json_decode($json, true);

// Decode as stdClass object
$dataObj = json_decode($json);

echo $dataAssoc['name']; // Dana
echo $dataObj->name;     // Dana
```

### Line-by-line explanation
- <?php: Start of PHP script.
- $json = '...';: JSON payload as a string.
- $dataAssoc = json_decode($json, true);: Decode JSON into an associative array (second parameter true).
- $dataObj = json_decode($json);: Decode JSON into a PHP object (stdClass).
- echo $dataAssoc['name'];: Access name from the assoc array.
- echo $dataObj->name;: Access name from the object.

Explanation: JSON is the lingua franca of API payloads. PHP can produce and consume both associative arrays and objects from JSON, making it essential to understand how json_decode behaves with and without the associative flag.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Mutating an array while iterating over it
Bad:
```php
<?php
$nums = [1, 2, 3];
foreach ($nums as $n) {
  $nums[] = $n * 2;
}
print_r($nums);
```
Good:
```php
<?php
$nums = [1, 2, 3];
$expanded = [];
foreach ($nums as $n) {
  $expanded[] = $n;
  $expanded[] = $n * 2;
}
print_r($expanded);
```

- Pitfall 2: Accessing a missing key without checks
Bad:
```php
<?php
$config = ["host" => "localhost"];
$port = $config["port"]; // Undefined index
```
Good:
```php
<?php
$config = ["host" => "localhost"];
$port = $config["port"] ?? 5432; // Default fallback
echo $port;
```

- Pitfall 3: JSON decoding ambiguity (array vs object)
Bad:
```php
<?php
$json = '{"name":"Sam"}';
$data = json_decode($json);
echo $data->name; // Works here, but code path may expect an array elsewhere
```
Good:
```php
<?php
$json = '{"name":"Sam"}';
$data = json_decode($json, true);
echo $data['name']; // Consistent with associative arrays
```

- Pitfall 4: Inconsistent typing without strict_mode
Bad:
```php
<?php
function add($a, $b) {
  return $a + $b;
}
echo add("2", 3);
```
Good:
```php
<?php
declare(strict_types=1);

function add(int $a, int $b): int {
  return $a + $b;
}
echo add(2, 3);
// echo add("2", 3); // would fail under strict types
```

Explanation: These pitfalls cover common sources of bugs in PHP data handling—from mutating structures during iteration to relying on implicit type coercion. Embracing explicit checks, consistency in return types, and clear JSON handling reduces runtime errors in real systems.

## Y. Why This Matters In Real Systems — production context and real usage

- API contracts: PHP backends frequently convert between arrays, objects, and JSON for REST/GraphQL endpoints. Clear structure handling reduces payload errors and improves maintainability.
- Data modeling: Arrays simplify payloads and temporary storage; objects model domain entities with behavior; maps (associative arrays) enable fast lookups for configuration, session data, or user records.
- Performance and memory: Large arrays and deep object graphs can impact memory usage. Understanding when to use lightweight arrays versus richer objects helps optimize response sizes and processing time.
- Interoperability: JSON, databases, caching layers (e.g., Redis) often require converting between maps, arrays, and objects. Consistent transformation logic minimizes bugs across services.
- Testing and reliability: Writing clean, well-typed data flows (with optional strict types) improves testability and reduces runtime magic throughout a PHP-based backend.

## Z. Study Questions — 5 recall questions

1. What is the difference between an indexed array and an associative array in PHP?
2. How do you append an element to an array? Provide two valid methods.
3. How can you convert an associative array to an object and back again?
4. What is json_decode’s effect when passed true versus false as the second parameter?
5. Why is it important to avoid mutating a collection while iterating over it, and how can you safely expand results instead?

## Exercise — a practical multi-part coding challenge

Part A: Build a simple in-memory user store using arrays and objects
- Create a PHP class InMemoryStore that holds an internal array of items. Each item is an associative array with keys: id (int), name (string), email (string), roles (array of strings).
- Implement methods:
  - addItem(array $item): int — assigns an id if missing, stores the item, returns the id.
  - getItem(int $id): ?array — returns the item or null if not found.
  - updateItem(int $id, array $updates): bool — applies updates to the item.
  - listItems(): array — returns all items.

Part B: Use the store with several samples
- Instantiate the store and add three users.
- Update one user’s email and roles.
- List all users and print them as JSON.

Part C: Group users by role
- Write a function groupByRole(array $items): array that returns a map where each key is a role and each value is an array of users having that role (avoid duplication if a user has multiple roles).

Code for Part A, Part B, and Part C (all in one or separate blocks as needed):

```php
<?php
// Part A: InMemoryStore
class InMemoryStore {
  private array $items = [];

  public function addItem(array $item): int {
    $id = $item['id'] ?? (count($this->items) + 1);
    $item['id'] = $id;
    $this->items[$id] = $item;
    return $id;
  }

  public function getItem(int $id): ?array {
    return $this->items[$id] ?? null;
  }

  public function updateItem(int $id, array $updates): bool {
    if (!isset($this->items[$id])) return false;
    $this->items[$id] = array_replace($this->items[$id], $updates);
    return true;
  }

  public function listItems(): array {
    return array_values($this->items);
  }
}
```

```php
<?php
// Part B: Using the store
$store = new InMemoryStore();

// Add three users
$store->addItem(["name" => "Alice", "email" => "alice@example.com", "roles" => ["user"]]);
$store->addItem(["name" => "Bob", "email" => "bob@example.com", "roles" => ["admin", "user"]]);
$store->addItem(["name" => "Carol", "email" => "carol@example.com", "roles" => ["user"]]);

// Update Bob's email and roles
$store->updateItem(2, ["email" => "bob@newdomain.com", "roles" => ["admin"]]);

// List all users and print as JSON
$all = $store->listItems();
echo json_encode($all, JSON_PRETTY_PRINT);
```

```php
<?php
// Part C: Group by role
function groupByRole(array $items): array {
  $grouped = [];
  foreach ($items as $item) {
    if (!isset($item['roles']) || !is_array($item['roles'])) continue;
    foreach ($item['roles'] as $role) {
      $grouped[$role][] = $item;
    }
  }
  return $grouped;
}

$store = new InMemoryStore();
$store->addItem(["name" => "Alice", "email" => "alice@example.com", "roles" => ["user"]]);
$store->addItem(["name" => "Bob", "email" => "bob@example.com", "roles" => ["admin", "user"]]);
$store->addItem(["name" => "Carol", "email" => "carol@example.com", "roles" => ["user"]]);

$grouped = groupByRole($store->listItems());
print_r($grouped);
```

End of lesson.