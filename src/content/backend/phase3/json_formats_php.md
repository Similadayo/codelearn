# Data Formats — JSON, XML, and Serialisation in PHP

In backend engineering, apps frequently exchange data across services and layers. JSON is the lingua franca of RESTful APIs, XML remains important for certain enterprises and SOAP-era integrations, and PHP’s built-in serialisation can persist object graphs or cache complex state. This lesson covers how to reliably encode, decode, build, parse, and serialize data in PHP, why each format matters in real systems, and how to avoid common pitfalls that lead to security or performance issues.

## 1. JSON in PHP — encoding, decoding, and error handling

PHP provides a simple, fast path for converting between PHP arrays/objects and JSON strings via json_encode and json_decode. Understanding how to validate input, handle errors, and preserve Unicode is essential when building APIs and data pipelines.

```php
<?php
// 1A: Build a PHP data structure
$payload = [
  'id' => 101,
  'name' => 'Nova',
  'roles' => ['dev', 'backend'],
  'active' => true,
  'profile' => [
    'email' => 'nova@example.com',
    'age' => 29
  ]
];

// 1B: Encode to JSON with readable formatting
$json = json_encode($payload, JSON_PRETTY_PRINT);
echo $json . PHP_EOL;

// 1C: Decode an incoming JSON payload
$incoming = '{"id":102,"name":"Kai","roles":["admin","editor"],"active":false,"profile":{"email":"kai@example.org","age":34}}';
$decoded = json_decode($incoming, true);

// 1D: Basic error handling after decoding
if (json_last_error() !== JSON_ERROR_NONE) {
  echo "JSON decode error: " . json_last_error_msg() . PHP_EOL;
} else {
  print_r($decoded);
}
?>
```

### Line-by-line explanation
- Line 1-4: Create a PHP associative array named $payload representing a user with nested data.
- Line 7-9: Convert $payload to a JSON string using json_encode with JSON_PRETTY_PRINT for human-friendly output; print the result.
- Line 12-13: Define a JSON string $incoming that would typically come from a client or service.
- Line 14: Decode $incoming into an associative array by passing true as the second parameter.
- Line 17-19: Check for JSON decoding errors. If an error occurred, report it; otherwise, dump the decoded PHP array.

## 2. Working with XML in PHP — building and parsing

XML remains common in enterprise integrations and legacy systems. In PHP, you can construct XML easily with SimpleXMLElement and parse XML with SimpleXML or DOMDocument for pretty-printing and validation. We’ll cover both building and parsing practical XML data.

### 2A. Building XML with SimpleXMLElement

```php
<?php
// 2A: Create an XML document representing a user
$xml = new SimpleXMLElement('<user/>');
$xml->addChild('id', 202);
$xml->addChild('name', 'Nova');
$xml->addChild('email', 'nova@example.com');

// Convert to string for transport or storage
$xml_str = $xml->asXML();
echo $xml_str;
?>
```

### Line-by-line explanation
- Line 3: Instantiate a new SimpleXMLElement using a root tag <user>.
- Line 4-6: Add child elements id, name, and email to the XML document.
- Line 9: Convert the XML object into a string with asXML() for storage or transmission.
- Line 10: Output the XML string.

### 2B. Parsing XML with SimpleXML and DOM for pretty-print

```php
<?php
$xmlInput = '<user><id>202</id><name>Nova</name><email>nova@example.com</email></user>';

// 2C: SimpleXML parsing (easy access to fields)
$simple = simplexml_load_string($xmlInput);
echo "Name: " . (string)$simple->name . PHP_EOL;
echo "ID: " . (int)$simple->id . PHP_EOL;

// 2D: Pretty-print using DOMDocument
$dom = new DOMDocument();
$dom->loadXML($xmlInput, LIBXML_NOWARNINGS);
$dom->formatOutput = true;
echo $dom->saveXML($dom);
?>
```

### Line-by-line explanation
- Line 3: Define an XML string $xmlInput representing a user.
- Line 6: Load the XML string into a SimpleXMLElement object for easy property-style access.
- Line 7-8: Access and print nested fields using object properties cast to appropriate types.
- Line 11: Create a new DOMDocument instance for more advanced operations like pretty printing.
- Line 12: Load the XML string into the DOM with warning suppression to avoid noisy logs.
- Line 13: Enable pretty-print formatting on the DOM.
- Line 14: Output the formatted XML by saving the DOM to a string.

## 3. Data serialization in PHP — serialize, unserialize, and safety

PHP’s serialize and unserialize convert PHP values (including objects) to a storable string and back. This is useful for caching, session storage, or persisting PHP state, but it carries security implications when data comes from untrusted sources. Be mindful of allowed classes and alternative formats like JSON for interoperability.

```php
<?php
// 3A: Simple object serialization
class User {
  public $name;
  public $age;
  public function __construct($name, $age) {
    $this->name = $name;
    $this->age = $age;
  }
}

$user = new User('Lee', 40);

// Serialize the object
$payload = serialize($user);

// Unserialize to get a new object instance
$restored = unserialize($payload);

echo $restored->name . " is " . $restored->age . " years old.";
?>
```

### Line-by-line explanation
- Line 4-9: Define a simple User class with two public properties and a constructor.
- Line 13-16: Create a User instance with name and age.
- Line 19: Serialize the User object into a string for storage or transport.
- Line 22: Unserialize the string back into a PHP object instance.
- Line 24: Print a human-readable summary of the restored object.

> Security note: Unserialize on data from untrusted sources is unsafe. Prefer JSON-based serialization (json_encode/json_decode) or use PHP 7.0+'s unserialize with the allowed_classes option to restrict what can be instantiated.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not validating JSON input or ignoring decoding errors
Bad:
```php
$payload = $_POST['payload'];
$data = json_decode($payload, true);
```
Good:
```php
$payload = $_POST['payload'] ?? '{}';
$decoded = json_decode($payload, true);
if (json_last_error() !== JSON_ERROR_NONE) {
  // handle error, e.g. log and return a 400
  http_response_code(400);
  echo "Invalid JSON: " . json_last_error_msg();
  exit;
}
```
- Pitfall 2: Unserializing untrusted data
Bad:
```php
$payload = $_POST['payload'];
$object = unserialize($payload);
```
Good:
```php
$payload = $_POST['payload'];
// Restrict allowed classes to prevent object injection
$object = unserialize($payload, ["allowed_classes" => ["User"]]);
if ($object === false) {
  // handle error
  http_response_code(400);
}
```
- Pitfall 3: XXE vulnerabilities in XML parsing
Bad:
```php
$xml = simplexml_load_string($xmlString, "SimpleXMLElement", LIBXML_NOENT);
```
Good:
```php
// Disable external entity loading for safety
libxml_disable_entity_loader(true);
$xml = simplexml_load_string($xmlString, "SimpleXMLElement", 0);
```
- Pitfall 4: Returning JSON with the wrong Content-Type
Bad:
```php
header('Content-Type: text/plain; charset=utf-8');
echo json_encode($data);
```
Good:
```php
header('Content-Type: application/json; charset=utf-8');
echo json_encode($data, JSON_UNESCAPED_UNICODE);
```

## Y. Why This Matters In Real Systems — production context and real usage

- Interoperability: JSON is the de facto standard for HTTP APIs; XML remains important for legacy systems and some enterprise stacks.
- Data contracts: Ensuring a stable, validated schema reduces API breakages. Use explicit field validation and, when possible, schema validation (JSON Schema for JSON, XSD for XML).
- Security: Never unserialize untrusted input; use JSON-based payloads for external data and sanitize XML inputs. Be mindful of XXE and injection vectors.
- Performance and scale: JSON parsing is typically faster and lighter on memory than XML. For large payloads, streaming parsers or chunked responses can help.
- Maintainability: Keep data formatting logic separate from business logic. Centralized serializers/deserializers improve testability and versioning.
- Language and ecosystem fit: JSON is widely supported across languages; XML tooling exists but is heavier. In PHP, use appropriate extensions and avoid embedding serialization formats in URLs or logs.

## Z. Study Questions — 5 recall questions

1. What PHP functions convert between PHP arrays/objects and JSON strings?
2. How can you safely parse XML in PHP to avoid XML External Entity (XXE) vulnerabilities?
3. Why is unserialize on data from clients considered risky, and what safer alternative can you use for API data interchange?
4. When encoding JSON for an API response that contains non-ASCII characters, which option helps preserve Unicode characters?
5. What is a practical guideline to decide between using JSON versus XML in a PHP-based backend service?

## Exercise — multi-part coding challenge

Goal: Build a small PHP utility that accepts a JSON payload, validates it, outputs an XML representation, and demonstrates a round-trip via PHP serialization.

Part A — JSON intake and validation (CLI)
- Read a JSON string from STDIN or a provided string.
- Decode to an associative array.
- Validate that the keys id (integer) and name (string) exist.
- If valid, print a success message and the decoded array; otherwise print a helpful error.

Part B — Serialize and round-trip
- Create a simple PHP object (e.g., User with name and id).
- Serialize the object to a string.
- Unserialize it back and verify the fields match the original.

Part C — XML output
- Convert the validated PHP array into XML using SimpleXMLElement (root <user> with child elements <id>, <name>, and optional <email>).
- Print the resulting XML with pretty formatting.

Part D — Quick test scaffold
- Provide a small driver snippet that wires Parts A–C together for a demonstration run:
  - Use a sample JSON input like {"id": 7, "name": "Eli", "email": "eli@example.org"}.
  - Output JSON input validation result, serialized form, and the final XML.

Example starter code (you can adapt as you implement):

```php
<?php
// Part A: JSON intake and validation
$inputJson = '{"id":7,"name":"Eli","email":"eli@example.org"}';
$decoded = json_decode($inputJson, true);
if (json_last_error() !== JSON_ERROR_NONE) {
  echo "Invalid JSON: " . json_last_error_msg() . PHP_EOL;
  exit(1);
}
if (!isset($decoded['id'], $decoded['name']) || !is_int($decoded['id']) || !is_string($decoded['name'])) {
  echo "Missing required fields 'id' (int) and 'name' (string)." . PHP_EOL;
  exit(1);
}
echo "JSON input valid. Decoded data:\n";
print_r($decoded);

// Part B: Serialize and round-trip
class Person {
  public $name;
  public $id;
  public function __construct($n, $i) { $this->name = $n; $this->id = $i; }
}
$person = new Person($decoded['name'], (int)$decoded['id']);
$serialized = serialize($person);
$restored = unserialize($serialized);
echo "Serialized and restored: " . $restored->name . " (id=" . $restored->id . ")\n";

// Part C: XML output
$root = new SimpleXMLElement('<user/>');
$root->addChild('id', $restored->id);
$root->addChild('name', $restored->name);
if (!empty($decoded['email'])) {
  $root->addChild('email', $decoded['email']);
}
$xmlStr = $root->asXML();
echo "XML output:\n" . $xmlStr;
```

Extending this exercise in a real project would involve handling input from HTTP requests, integrating proper error handling, and adding unit tests for each path (JSON validation, serialization integrity, andXML generation).