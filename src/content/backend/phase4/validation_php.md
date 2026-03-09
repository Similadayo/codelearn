# Input Validation — Never Trust User Input (PHP)

In backend development, you never fully trust what clients send. Input validation is the gatekeeper that preserves data integrity, prevents security breaches, and keeps your systems robust under load. This lesson focuses on PHP-backed server development, showing practical, production-oriented patterns for validating, sanitizing, and safely consuming all user-supplied data.

## 1. Trust Boundaries: The Threat Model (Bad vs Good)

Understanding what you must guard against helps shape solid validation. The example contrasts an unsafe, trust-everything approach with a safe, whitelist-based approach.

```php
<?php
// BAD: Directly trusting user input and using it in a file include
$page = $_GET['page'];
include $page . '.php';
```

```php
<?php
// GOOD: Whitelist-based, safe handling
$allowedPages = ['home', 'about', 'contact'];
$page = $_GET['page'] ?? 'home';
if (!in_array($page, $allowedPages, true)) {
    $page = 'home';
}
require __DIR__ . '/pages/' . $page . '.php';
```

### Line-by-line explanation

1) BAD example: $page = $_GET['page']; — grabs user-supplied value directly.  
2) BAD example: include $page . '.php'; — includes a file path derived from user input, enabling path traversal and arbitrary file access.  
3) GOOD example: $allowedPages = ['home', 'about', 'contact']; — define a strict allowlist of permissible pages.  
4) GOOD example: $page = $_GET['page'] ?? 'home'; — default to 'home' if not provided.  
5) GOOD example: in_array($page, $allowedPages, true) — verify the input against the allowlist with strict type checking.  
6) GOOD example: require __DIR__ . '/pages/' . $page . '.php'; — safely load only known pages.

## 2. Validation Basics: Types, Formats, and Whitelisting

Validation ensures the data matches what you expect, not just what the user sent. Here are common PHP patterns for emails, integers, and string constraints, using both filter_input and explicit checks.

```php
<?php
// Email validation using POST data
$email = $_POST['email'] ?? '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}
```

```php
<?php
// Integer validation with range
$ageInput = $_POST['age'] ?? '';
$age = filter_var($ageInput, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 0, 'max_range' => 120]
]);
if ($age === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Age must be an integer between 0 and 120']);
    exit;
}
```

```php
<?php
// Using filter_input for concise validation
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
if ($email === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email']);
    exit;
}
```

### Line-by-line explanation

1) Email block: $email = $_POST['email'] ?? ''; — fetches input with a default.  
2) filter_var(..., FILTER_VALIDATE_EMAIL) — returns the email on success, false on failure.  
3) If false — return 400 with a helpful error.  
4) Age block: $ageInput = $_POST['age'] ?? ''; — gather input.  
5) filter_var(..., FILTER_VALIDATE_INT, ['options'=>...]) — validates integer and enforces range.  
6) If false — respond with a descriptive error.  
7) filter_input example — demonstrates a concise, built-in approach directly from the PHP input stream.

## 3. Validating JSON Payloads: API Endpoints

APIs commonly receive JSON bodies. Decode, validate, and provide structured errors. This example shows a robust pattern for a signup-like payload.

```php
<?php
// Read JSON body
$raw = trim(file_get_contents('php://input'));
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$errors = [];

$name  = $payload['name'] ?? '';
$email = $payload['email'] ?? '';
$age   = $payload['age'] ?? null;

// Required fields
if ($name === '')  $errors['name']  = 'Name is required';
if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Valid email is required';
}
if (!is_int($age) && !ctype_digit((string)$age)) {
    $errors['age'] = 'Age must be an integer';
} elseif ($age !== null && (int)$age < 0 || (int)$age > 120) {
    $errors['age'] = 'Age must be between 0 and 120';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['errors' => $errors]);
    exit;
}

// Normalize/sanitize
$name  = trim($name);
$email = strtolower(trim($email));

// Proceed with business logic (e.g., create user in DB)
echo json_encode(['status' => 'ok', 'name' => $name, 'email' => $email, 'age' => (int)$age]);
```

### Line-by-line explanation

1) Read raw input and decode JSON to an associative array.  
2) If decoding fails, respond with 400 and a clear error.  
3) Initialize an errors container for collecting field-level problems.  
4) Extract fields with defaults.  
5) Validate required fields and formats: name non-empty, email valid.  
6) Validate age as an integer and within a sane range; coerce if necessary.  
7) If any errors exist, respond with 422 and a structured errors object.  
8) Normalize: trim name, lowercase email for consistency.  
9) Proceed to the business logic (e.g., creating a user) after successful validation.

## 4. Validating Arrays and Nested Data

Inputs often contain arrays (roles, tags, addresses). Validate shape and content to avoid structural or type issues.

```php
<?php
// Payload example: { "tags": ["php", "api", "validation"] }
$tags = $payload['tags'] ?? [];

if (!is_array($tags)) {
    $errors['tags'] = 'Tags must be an array';
} else {
    foreach ($tags as $idx => $t) {
        if (!is_string($t)) {
            $errors['tags'][$idx] = 'Each tag must be a string';
        } elseif (strlen($t) > 32) {
            $errors['tags'][$idx] = 'Tag must be 32 characters or fewer';
        }
    }
}
```

```php
<?php
// Alternative: require array input and sanitize each element
$roles = filter_var($payload['roles'] ?? [], FILTER_DEFAULT, FILTER_REQUIRE_ARRAY);
$allowedRoles = ['user', 'admin', 'moderator'];
if (!is_array($roles)) {
    $errors['roles'] = 'Roles must be an array';
} else {
    foreach ($roles as $idx => $role) {
        if (!in_array($role, $allowedRoles, true)) {
            $errors['roles'][$idx] = 'Invalid role: ' . htmlspecialchars($role, ENT_QUOTES, 'UTF-8');
        }
    }
}
```

### Line-by-line explanation

1) Extract tags or roles from payload.  
2) Check that the value is an array; otherwise, report a type error.  
3) Iterate over each item to verify type (string) and constraints (length).  
4) Use in_array to ensure each role is one of the allowed values, preventing privilege escalation or unknown roles.  
5) Employ htmlspecialchars in error messaging to avoid XSS in responses.

## 5. Safer Patterns and Libraries

When validation logic grows, consider library-based validators for consistency, reusability, and better error reporting. Here are two approaches:

- Built-in, minimal approach (custom Validator class)
- Mature libraries (examples only; not required to run here)

A lightweight custom Validator class demonstrates clean, chainable validation without pulling heavy dependencies.

```php
<?php
class Validator {
    private array $data;
    private array $errors = [];

    public function __construct(array $data) {
        $this->data = $data;
    }

    public function required(string $field): self {
        if (!isset($this->data[$field]) || $this->data[$field] === '') {
            $this->errors[$field] = 'Field is required';
        }
        return $this;
    }

    public function email(string $field): self {
        $value = $this->data[$field] ?? '';
        if ($value === '' || filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $this->errors[$field] = 'Invalid email';
        }
        return $this;
    }

    public function intBetween(string $field, int $min, int $max): self {
        $value = $this->data[$field] ?? null;
        $v = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
        if ($v === false) {
            $this->errors[$field] = "Must be int between $min and $max";
        } else {
            // Optionally replace the raw value with the validated int
            $this->data[$field] = $v;
        }
        return $this;
    }

    public function getErrors(): array {
        return $this->errors;
    }

    public function isValid(): bool {
        return empty($this->errors);
    }

    public function value(string $field) {
        return $this->data[$field] ?? null;
    }
}

// Usage
$validator = new Validator($payload);
$validator->required('name')->required('email')->email('email')->intBetween('age', 13, 120);
if (!$validator->isValid()) {
    http_response_code(422);
    echo json_encode(['errors' => $validator->getErrors()]);
    exit;
}
$name  = $validator->value('name');
$email = $validator->value('email');
$age   = $validator->value('age');
```

### Line-by-line explanation

1) Validator class holds input data and collects errors.  
2) required() marks a field as required; adds an error if missing or empty.  
3) email() validates the email format; records an error if invalid.  
4) intBetween() validates integer range; stores the validated value back if valid.  
5) isValid() and getErrors() provide the final validation state and details.  
6) Usage example shows chaining and final extraction of validated values.

Note: In real systems you might replace this with a mature library like Symfony Validator or Respect\Validation for more capabilities (custom constraints, nested data, and localization).

## X. Common Beginner Mistakes

Pitfalls and how to fix them (bad vs good):

- Pitfall 1: Relying on client-side validation only
  - Bad:
    ```php
    // BAD
    $age = $_POST['age'];
    if ($age < 18) { /* ... */ }
    ```
  - Good:
    ```php
    // GOOD
    $age = filter_input(INPUT_POST, 'age', FILTER_VALIDATE_INT, ['options' => ['min_range' => 18]]);
    if ($age === false) { /* error */ }
    ```

- Pitfall 2: Assuming JSON decoding always succeeds
  - Bad:
    ```php
    // BAD
    $payload = json_decode(file_get_contents('php://input'));
    $name = $payload->name;
    ```
  - Good:
    ```php
    // GOOD
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) { /* error */ }
    $name = $payload['name'] ?? '';
    ```

- Pitfall 3: SQL injection through string interpolation
  - Bad:
    ```php
    // BAD
    $name = $_POST['name'];
    $sql = "INSERT INTO users (name) VALUES ('$name')";
    ```
  - Good:
    ```php
    // GOOD
    $name = $_POST['name'] ?? '';
    $stmt = $pdo->prepare('INSERT INTO users (name) VALUES (:name)');
    $stmt->execute(['name' => $name]);
    ```

- Pitfall 4: Echoing user input without escaping (XSS)
  - Bad:
    ```php
    // BAD
    echo "<div>Welcome, $name</div>";
    ```
  - Good:
    ```php
    // GOOD
    echo "<div>Welcome, " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</div>";
    ```

- Pitfall 5: Over-quiet error reporting or leaking internal details
  - Bad:
    ```php
    // BAD
    echo $db->errorInfo();
    ```
  - Good:
    ```php
    // GOOD
    error_log($db->errorInfo()[2] ?? 'DB error');
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
    ```

## Y. Why This Matters In Real Systems

- Data integrity: Invalid or malicious input corrupts databases and business logic.
- Security: Prevents SQL injection, command injection, and XSS by enforcing strict validation and proper escaping.
- Reliability: Defensive validation reduces downstream exceptions, time spent debugging, and system outages during peak load.
- Compliance and auditing: Consistent validation rules simplify audits and data governance.
- UX and API contracts: Clear, consistent error messages help clients correct requests quickly and reduce support burden.
- Performance considerations: Validate early to avoid unnecessary processing; use efficient validators and avoid expensive transformations on invalid data.

## Z. Study Questions

1) What is the difference between validation and sanitization? Give PHP examples.  
2) How would you validate a JSON payload for an API endpoint? Outline the steps and error-handling strategy.  
3) Why is server-side validation essential even if client-side validation exists?  
4) How do prepared statements help mitigate injection attacks beyond input validation?  
5) Provide a small PHP function or class that validates an array field "tags" to ensure every tag is a non-empty string of max 32 characters.

## Exercise

Part A: Build a JSON-based user registration endpoint with robust server-side validation.

- Requirements
  - Accept a JSON POST body with fields:
    - username: string, 3-20 chars, letters, numbers, underscore
    - email: valid email
    - password: string, 8-128 chars, at least one uppercase, one lowercase, one digit
    - roles: array of strings, allowed values ["user", "admin", "moderator"]
    - address: object with street (non-empty), city (non-empty), zip (5 digits)
  - Validate all fields server-side using a combination of filter_var, explicit checks, and a small Validator class if you like.
  - On success: respond with 200 and a JSON payload containing a sanitized version of the input (with username lowercased, email lowercased, and trimmed strings).
  - On failure: respond with 422 and a JSON object describing errors per field.
  - Do not rely on client-side validation; all checks must be verified on the server.

- Part B: Security touches
  - Demonstrate how you would safely prepare an INSERT statement with a password hash (do not store plain passwords). Use password_hash() and a prepared statement pattern.
  - Ensure any user-supplied data echoed back in responses is escaped via htmlspecialchars or not echoed at all.

- Part C: Edge cases
  - Consider and handle: missing fields, extra fields, non-array roles, nested address validation, and unusual Unicode input.

Provide a complete PHP script or modular snippets that together satisfy the above. Include comments explaining the validation decisions and how your approach supports maintainability and security in real deployments.