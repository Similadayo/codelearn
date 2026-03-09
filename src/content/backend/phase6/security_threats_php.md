# Security — SQLi, XSS, CSRF & Rate Limiting (PHP)

In modern PHP backends, security is not a bolt-on feature—it’s a core design constraint. This lesson covers four high-impact security topics: SQL injection (SQLi), cross-site scripting (XSS), cross-site request forgery (CSRF), and rate limiting. You’ll learn how to recognize common weaknesses, implement best practices with PHP (PDO, escaping, tokens, and HTTP headers), and reason about real-world production implications such as multi-instance deployments, observability, and compliance. By the end, you should be able to defend data integrity, user privacy, and API reliability in real systems.

## 1. SQL Injection (SQLi)

SQLi occurs when user input is interpolated directly into SQL queries, allowing attackers to alter the query and potentially access, modify, or delete data. The standard defense is using parameterized queries (prepared statements) with bound parameters.

### Insecure PHP example (vulnerable to SQLi)
```php
<?php
// Insecure: user input directly interpolated into SQL
$pdo = new PDO('mysql:host=localhost;dbname=mydb', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$id = $_GET['id']; // user-controlled
$sql = "SELECT * FROM users WHERE id = $id";
$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    echo htmlspecialchars($row['username'], ENT_QUOTES, 'UTF-8');
}
```

### Line-by-line explanation
- Line 2: Establishes a new PDO connection to MySQL with database credentials.
- Line 4: Configures PDO to throw exceptions on errors for easier debugging and error handling.
- Line 6: Reads the id parameter sent by the client (untrusted input).
- Line 7: Builds an SQL string by directly embedding the untrusted input.
- Line 8: Executes the query; if id contains malicious content, the query changes behavior.
- Line 9-11: Fetches results and outputs usernames with HTML escaping.

### Secure PHP example (prepared statements)
```php
<?php
// Secure: use prepared statements and bound parameters
$pdo = new PDO('mysql:host=localhost;dbname=mydb', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$id = $_GET['id']; // user input
$sth = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$sth->bindParam(':id', $id, PDO::PARAM_INT);
$sth->execute();
$rows = $sth->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    echo htmlspecialchars($row['username'], ENT_QUOTES, 'UTF-8');
}
```

### Line-by-line explanation
- Line 2: Establishes a PDO connection.
- Line 4: Sets error handling mode to exceptions.
- Line 6: Retrieves the untrusted id parameter.
- Line 7: Prepares a parameterized SQL statement with a named placeholder :id.
- Line 8: Binds the user input to the :id placeholder as an integer, ensuring only numeric input is treated as data.
- Line 9: Executes the prepared statement.
- Line 10-12: Fetches results and outputs usernames with HTML escaping.

Notes:
- Always prefer prepared statements (PDO with bound parameters or mysqli with prepared statements).
- Validate and normalize inputs (e.g., expecting integers) before binding.
- Apply least-privilege database accounts and enable proper error handling in production.

## 2. Cross-Site Scripting (XSS)

XSS happens when user-supplied data is reflected into HTML without proper encoding, enabling attackers to run arbitrary scripts in other users’ browsers. The defense is to escape/encode output and/or use templates that automatically escape.

### Insecure PHP example (unsafe output)
```php
<?php
// Insecure: outputs user data directly
$name = $_GET['name'];
echo "<div>Welcome, $name!</div>";
```

### Line-by-line explanation
- Line 2: Reads a name parameter from the query string.
- Line 3: Outputs the raw value inside HTML without escaping, allowing embedded markup or scripts.

### Secure PHP example (escaped output)
```php
<?php
// Secure: escape user input before output
$name = $_GET['name'];
echo "<div>Welcome, " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "!</div>";
```

### Line-by-line explanation
- Line 2: Reads the user-provided name.
- Line 3: Uses htmlspecialchars to escape special HTML characters, preventing interpreted markup or scripts.
- The resulting HTML is safe for display in the DOM.

Additional hardening:
- Consider a template engine that auto-escapes variables.
- Employ a robust Content Security Policy (CSP) to limit what dynamic scripts can run.
- Always validate input length and character sets where appropriate.

Example CSP header (basic)
```php
<?php
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none';");
```

## 3. Cross-Site Request Forgery (CSRF)

CSRF tricks a user’s browser into submitting unwanted actions on a site where the user is authenticated. The standard defense is using anti-CSRF tokens tied to the user session and validating them on state-changing actions.

### Insecure PHP example (no CSRF protection)
HTML form (no CSRF token)
```html
<form action="/transfer.php" method="post">
  <input type="hidden" name="amount" value="100">
  <button type="submit">Transfer</button>
</form>
```

transfer.php (no CSRF check)
```php
<?php
$amount = $_POST['amount'];
// process transfer without CSRF verification
```

### Line-by-line explanation
- Form: Submits a POST to transfer.php with an amount.
- transfer.php: Reads amount and processes it without any CSRF validation.

### Secure PHP example (CSRF-protected)
Server-side: initiate token and render form
```php
<?php
session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$token = $_SESSION['csrf_token'];
?>
<form action="/transfer.php" method="post">
  <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($token, ENT_QUOTES, 'UTF-8'); ?>">
  <input type="hidden" name="amount" value="100">
  <button type="submit">Transfer</button>
</form>
```

transfer.php (CSRF-verified)
```php
<?php
session_start();
if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token']) ||
    !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    http_response_code(403);
    echo 'CSRF token mismatch';
    exit;
}

// Optional: rotate token after successful use
unset($_SESSION['csrf_token']);
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Process transfer securely
$amount = (int) $_POST['amount'];
// … perform transfer logic …
```

Line-by-line explanation
- Server-side: Start session and generate a CSRF token per user session if missing.
- Token is embedded as a hidden input in the form.
- transfer.php: Start session, verify that the submitted token matches the session token using hash_equals to avoid timing attacks.
- On success, rotate or invalidate the token and proceed with the business logic.

Security notes:
- Use secure, HttpOnly cookies for session storage; set SameSite attribute to mitigate CSRF in modern browsers.
- Consider additional protections like double-submit cookie patterns or Origin/Referer checks as a defense-in-depth layer (though CSRF tokens remain the most robust approach).

## 4. Rate Limiting

Rate limiting helps protect APIs and login endpoints from abuse by restricting how often a client can perform operations. The best practice is to implement a distributed rate limiter (e.g., with Redis) to work across multiple app instances.

### Insecure/naive approach (no cross-instance protection)
```php
<?php
// Very naive and not suitable for multi-instance deployments
$ip = $_SERVER['REMOTE_ADDR'];
$allowed = 100; // 100 requests per window
$window = 60; // seconds

// This volatile in-memory counter will reset each request in a real setup
if (!isset($_SESSION['rl'][$ip])) {
    $_SESSION['rl'][$ip] = 0;
}
$_SESSION['rl'][$ip]++;

if ($_SESSION['rl'][$ip] > $allowed) {
    http_response_code(429);
    echo 'Too many requests';
    exit;
}
```

### Line-by-line explanation
- Line 2-6: Defines a rate limit and window.
- Line 9-15: Attempts to count requests per IP in session storage; not shared across processes.
- Line 17-20: Enforces the limit and returns 429 when exceeded.

### Secure distributed rate limiter (Redis)
```php
<?php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$ip = $_SERVER['REMOTE_ADDR'];
$window = 60; // seconds
$limit = 100; // requests per window
$key = 'rl:' . $ip;

$now = time();

$tx = $redis->multi();
$tx->incr($key);
$tx->expire($key, $window);
$results = $tx->exec();

$count = $results[0] ?? 0;
$ttl = $redis->ttl($key);

if ($count > $limit) {
    http_response_code(429);
    echo 'Too many requests';
    exit;
}
```

### Line-by-line explanation
- Line 2-4: Connect to Redis, which stores shared state for rate limiting.
- Line 6-9: Build a per-IP key and specify the window (TTL).
- Line 11-15: Use a Redis transaction to increment the counter and set its TTL atomically.
- Line 17-19: Retrieve the current count and TTL to decide if the request should be allowed.
- Line 21-25: Return 429 when the limit is exceeded.

Notes:
- Redis-based rate limiting scales across multiple app instances and processes.
- Consider hashing IPs or using API keys / tokens for more precise control.
- Be mindful of legitimate users behind NATs; choose limits that balance security and usability.
- For login rate limiting, consider exponential backoff and account lockout policies to avoid DoS on legitimate users.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- SQLi risk: bad vs good
  - Bad:
    - See section 1 insecure example (direct interpolation into SQL).
  - Good:
    - See section 1 secure prepared statements example.

- XSS risk: bad vs good
  - Bad:
    - See section 2 insecure example (unescaped user output).
  - Good:
    - See section 2 secure example (htmlspecialchars output).

- CSRF risk: bad vs good
  - Bad:
    - See section 3 insecure form and transfer handling.
  - Good:
    - See section 3 secure token-based approach.

- Rate limiting misconfiguration (false sense of protection)
  - Bad pattern:
    - Rely on per-process memory (session-based) in a multi-instance environment; can be bypassed.
  - Good pattern:
    - Use a distributed store (Redis) with per-IP or per-API-key limits and sane windowing.

- Output encoding and CSP neglect
  - Bad:
    - Outputting user input directly into HTML.
  - Good:
    - Escape all user output; apply a robust CSP; consider template engines.

- Session security misconfigurations
  - Bad:
    - Plain HTTP cookies for session data, no HttpOnly or SameSite attributes.
  - Good:
    - Use Secure, HttpOnly cookies; set SameSite attribute; rotate session IDs on privilege changes.

## Y. Why This Matters In Real Systems

- Security controls are part of the system's contract with users and regulators. SQLi, XSS, and CSRF can lead to data breaches, account takeovers, or unauthorized actions, eroding trust and causing financial or legal ramifications.
- Production realities:
  - Multi-instance environments require distributed state (e.g., Redis) for rate limiting and consistent CSRF protection across replicas.
  - Observability: logging of security events (failed logins, CSRF mismatches, rate-limit exceedances) is essential for incident response and auditing.
  - Performance: defensive measures should minimize latency. Prepared statements are fast enough for typical loads; rate limiting must be efficient at scale.
  - Compliance: data handling and security controls align with standards (PCI-DSS, GDPR, CCPA). Proper input validation, output encoding, and token-based protections support compliance requirements.
  - Testing: include automated tests for injection risk, XSS payloads, token validation, and rate limiting scenarios (edge cases, high concurrency, and distributed deployment).

## Z. Study Questions — 5 recall questions

1) What is the primary defense against SQL injection in PHP, and how do you implement it with PDO?
2) How does htmlspecialchars help prevent XSS, and when should you apply it?
3) Describe how a CSRF token protects a state-changing POST request and outline a basic flow to implement it in PHP.
4) Why is a distributed rate limiter preferable to an in-process limiter in multi-instance deployments, and what is a simple Redis-based approach?
5) What HTTP headers or browser features can mitigate CSRF and XSS risks beyond application-level protections?

## Exercise — practical multi-part coding challenge

Objective: Build a small PHP "Profile Update" flow that demonstrates secure database access, output escaping, CSRF protection, and rate limiting.

Part A: Secure profile fetch (SQLi-safe)
- Create a PHP script profile.php that accepts a username via a GET parameter and returns the user’s full name from a MySQL database.
- Use PDO with a prepared statement and bound parameter to avoid SQL injection.
- Output the name safely using HTML escaping.

Deliverables:
- profile.php with prepared statement usage.
- Output should be escaped with htmlspecialchars.

Part B: Safe profile update (CSRF-protected)
- Create an HTML form that allows updating the bio for the logged-in user.
- Include a CSRF token in the form (generated per session, stored in $_SESSION, and validated on POST).
- The update handler should verify the token before applying the change.
- Ensure the session cookies are set with Secure, HttpOnly, and SameSite attributes where possible.

Deliverables:
- update_form.php (form rendering with CSRF token).
- update_profile.php (CSRF token validation and update).

Part C: Rate-limited message posting
- Implement a simple post_message.php endpoint that accepts a message and uses Redis to enforce a limit of 20 messages per minute per IP.
- If the limit is exceeded, return HTTP 429.
- Use a Redis-backed approach, not in-memory per-process state.

Deliverables:
- post_message.php with Redis-based rate limiting.

Part D: Quick security review checklist
- For each deliverable, note at least one security improvement beyond the minimum (e.g., CSP header, content encoding, input validation). Provide a short justification.

Guidance:
- Assume a small app with a MySQL database and a PHP runtime with PDO and Redis extensions available.
- You do not need to implement full authentication; assume a user_id is available in the session for Part B.
- Include comments in code to explain security decisions.

Submission format:
- Paste the code for each file, with clear file names in comments.
- Include brief notes for Part D improvements, per deliverable.

Tips:
- Run tests to ensure no SQL errors, and inspect output in a browser to verify escaping happens correctly.
- Use hash_equals for any token comparisons to avoid timing attacks.
- Keep error disclosure minimal in production; log detailed errors securely instead.