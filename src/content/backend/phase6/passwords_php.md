# Password Hashing with bcrypt in PHP

In modern backend systems, storing passwords securely is non-negotiable. Password hashing with bcrypt is a proven, industry-standard approach that adds salts, a configurable work factor, and a verification mechanism that resists common attacks. PHP’s built-in password_hash and password_verify APIs make bcrypt practical and safe to use in production, provided you follow best practices (correct cost factor, proper storage, and regular rehashing when costs rise). This lesson walks you through the concepts, concrete PHP examples, and production considerations to lock in secure authentication behavior.

## 1. Understanding bcrypt and PHP's password_hash

Bcrypt is a password-hashing function that includes salt generation and a work factor (cost). PHP provides a simple API to leverage bcrypt without manually handling salts. The resulting hash string embeds the algorithm, cost, salt, and the hash, so you only need to store the hash in your user store. Using a proper cost factor makes brute-force attacks more expensive as hardware improves.

### Code: Generating a bcrypt hash

```php
<?php
$password = 'CorrectHorseBatteryStaple';
$options = [
    'cost' => 12 // higher cost = slower hashing; balanced with user login latency
];

$hash = password_hash($password, PASSWORD_BCRYPT, $options);

echo $hash;
```

### Line-by-line explanation
- line 1: Start of PHP script.
- line 2: Define the plaintext password entered by the user during registration.
- line 3-6: Create an options array specifying the bcrypt cost factor. Cost 12 is a common default that provides good security without excessive latency.
- line 8: Call password_hash with the plaintext password, the bcrypt constant, and options. This returns a bcrypt hash string that includes the algorithm, cost, salt, and the hashed value.
- line 10: Output the resulting hash string. This value should be stored in your user database (not the plaintext password).

Notes:
- The hash contains all needed information to verify later, including the salt and cost.
- Don’t print or expose the hash beyond what’s necessary for storage and debugging in a safe environment.

## 2. Verifying Passwords with password_verify

When a user attempts to log in, you must verify the supplied password against the stored hash. PHP’s password_verify compares the plaintext password (after any necessary processing) to the stored hash and returns a boolean.

### Code: Verifying a password

```php
<?php
$inputPassword = 'CorrectHorseBatteryStaple'; // password supplied at login
$storedHash = '$2y$12$K1YqYJj7Qn3...'; // retrieved from database

if (password_verify($inputPassword, $storedHash)) {
    echo "Login successful";
} else {
    echo "Invalid credentials";
}
```

### Line-by-line explanation
- line 1: Start of PHP script.
- line 2: The password the user typed during login.
- line 3: The hash retrieved from the user record in your database. This hash was created earlier with password_hash.
- lines 5-7: Call password_verify to check if the input password matches the stored hash. If it matches, the user is authenticated; otherwise, credentials are invalid.
- line 8-9: Branches that print the authentication result.

Notes:
- password_verify automatically extracts the salt and cost from the stored hash to perform the check.
- Do not attempt to replicate bcrypt logic yourself; always use password_verify for correctness and security.

## 3. Rehashing: Upgrading Cost Factors Over Time

As hardware improves, you should periodically upgrade the bcrypt cost. PHP provides password_needs_rehash to determine if a stored hash should be rehashed with newer parameters.

### Code: Detecting and performing a rehash

```php
<?php
$storedHash = '$2y$12$K1YqYJj7Qn3...';
$password = 'CorrectHorseBatteryStaple';

// Decide on a future cost, e.g., 14
$needsRehash = password_needs_rehash($storedHash, PASSWORD_BCRYPT, ['cost' => 14]);

if ($needsRehash) {
    $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 14]);
    // Persist $newHash back to the database for the user
    echo "Rehashed with new cost";
} else {
    echo "No rehash needed";
}
```

### Line-by-line explanation
- line 1: Start of PHP script.
- line 2: The existing hash retrieved from storage.
- line 3: The plaintext password provided for login (or from registration, if you’re initiating a rehash).
- line 5: Check if the stored hash needs rehashing under a stronger cost parameter (14 here).
- line 7-9: If rehash is required, compute a new hash with the higher cost and update the stored value. This preserves security without disrupting user experience.

Notes:
- password_needs_rehash compares the current hash to the algorithm and options you specify.
- Do not rehash every login indiscriminately; only rehash when necessary to minimize latency and DB write load.

## 4. End-to-End Example: Registering and Logging in with a Database (PDO)

In production, you’ll store password hashes in a database and verify on login. This example shows a minimal, safe approach using PDO with prepared statements to avoid SQL injection.

### Code: Basic in-application user registration and login with PDO

```php
<?php
// Assume $pdo is a valid PDO connection to your database
// Schema example: CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE, password_hash VARCHAR(255));

function registerUser(PDO $pdo, string $username, string $password): bool {
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)');
    return $stmt->execute(['username' => $username, 'password_hash' => $hash]);
}

function loginUser(PDO $pdo, string $username, string $password): bool {
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE username = :username');
    $stmt->execute(['username' => $username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && password_verify($password, $row['password_hash'])) {
        return true; // Authentication succeeded
    }
    return false; // Authentication failed
}
?>
```

### Line-by-line explanation
- line 1-3: PHP opening and a note about the expected database schema.
- function registerUser:
  - line 5: Hash the plaintext password with bcrypt at cost 12.
  - line 6-7: Prepare an INSERT statement with named placeholders to prevent SQL injection.
  - line 8: Execute the statement with actual values; returns true on success, false on failure.
- function loginUser:
  - line 12-13: Prepare and execute a SELECT to fetch the stored hash for the given username.
  - line 14: Fetch result as an associative array.
  - line 16-20: If a hash is found, verify the input password against the stored hash. Return true on success, false otherwise.
  
Notes:
- Always use prepared statements when interacting with the database.
- Keep the hash column large enough to accommodate future bcrypt outputs (VARCHAR(255) is common).
- Consider additional measures like rate limiting, account lockout, and multi-factor authentication in production systems.

## X. Common Beginner Mistakes

- Bad: Using plain hash functions like md5/sha1 without salt.
  - Bad code:
    ```php
    <?php
    $hash = md5($password); // insecure
    ```
  - Good code:
    ```php
    <?php
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    ```
- Bad: Manually generating your own salts and concatenating them.
  - Bad code:
    ```php
    <?php
    $salt = bin2hex(random_bytes(16));
    $hash = hash('sha256', $password . $salt);
    ```
  - Good code:
    ```php
    <?php
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    ```
- Bad: Storing or transmitting the hash insecurely (e.g., echoing it to the user or including it in a client-visible SPA state).
  - Good: Store hash in secure DB, transmit only via server-side session; never reveal to client.
- Bad: Not using a cost factor or using a fixed default that’s too slow or too fast for your environment.
  - Good: Choose a cost that balances server load and security; consider a rehash policy to upgrade cost over time.
- Bad: Rehashing on every login without necessity.
  - Good: Use password_needs_rehash to upgrade only when needed.

## Y. Why This Matters In Real Systems

- Security posture: bcrypt protects against rainbow table attacks and makes brute-force attempts computationally expensive due to the work factor.
- Salting is automatic: Each hash has a unique salt encoded within it, preventing identical hashes for identical passwords.
- Upgrade path: As hardware improves, you can increase the cost factor without changing the verification logic.
- Compliance and audit: Proper password handling reduces risk of data breaches, helping satisfy industry standards (e.g., PCI-DSS, OWASP guidelines).
- Operational realities: Production systems require safe storage (DB), safe retrieval, prepared statements, and additional protections like rate limiting, login alerts, and possibly multi-factor authentication.

## Z. Study Questions

1. What does bcrypt do that makes it resistant to precomputed attacks, and how does PHP expose this in password_hash?
2. How do you verify a user-supplied password against a stored bcrypt hash in PHP?
3. Why would you use password_needs_rehash, and what would trigger a rehash in a real system?
4. What are some crucial database-security practices you should pair with password hashing (e.g., prepared statements)?
5. How would you implement a pepper in addition to bcrypt, and what are the caveats of doing so?

## Exercise

Part A: Build a small AuthHasher class

- Create a PHP class that abstracts password hashing and verification using bcrypt.
- Methods to implement:
  - public function hashPassword(string $password, int $cost = 12): string
  - public function verifyPassword(string $password, string $hash): bool
  - public function needsRehash(string $hash, int $newCost = 14): bool
- Include optional support for a pepper read from an environment variable (e.g., $_ENV['PASSWORD_PEPPER']). If pepper is present, apply it to the password before hashing and verifying (password must be peppered consistently in both steps).

Example usage:
- Hash a new password for a registration flow.
- Verify a password during login.
- Check if a stored hash needs rehash to a higher cost and, if so, rehash and indicate you should update storage.

Part B: Minimal PDO-backed user store demonstration

- Create a tiny SQLite database in memory or a file for demonstration.
- Create a users table with columns: id, username, password_hash.
- Use your AuthHasher to register a user and then log in with correct and incorrect passwords.
- Demonstrate a rehash check after changing the cost factor to 15 and updating the stored hash accordingly.

Part C: Security note

- Add a short demonstration in code comments about why you should not expose password hashes, and why you should protect database access with proper access controls and encryption at rest where appropriate.

Deliverable: A single PHP file (or a small set of files if you prefer) containing the AuthHasher class, a demo flow that registers and authenticates a user using an in-memory SQLite DB, optional pepper usage, and comments explaining decisions. Ensure all code adheres to the practices covered in this lesson.