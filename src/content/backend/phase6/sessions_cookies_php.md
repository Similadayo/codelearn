# Sessions & Cookies — Stateful Auth in PHP

Stateful authentication relies on server-side session data to persist who a user is across multiple requests, typically backed by a session cookie (like PHPSESSID) that identifies the user’s session. This approach centralizes sensitive state on the server while keeping the client lightweight. Mastery of sessions and cookies is essential for building secure, scalable web apps in PHP, because it directly impacts login flow, access control, session hijacking prevention, and how you defend against common web threats.

## 1. Concept: Stateful Auth with PHP Sessions and Cookies

Below are simple examples showing how to start a session, store user data server-side, and later resume the session to verify authentication.

```php
<?php
// Start the session at the beginning of the request
session_start();

// Store user data in the server-side session
$_SESSION['user_id'] = 101;
$_SESSION['username'] = 'sara';
$_SESSION['roles'] = ['user'];
?>
```

### Line-by-line explanation
- Line 1: <?php starts the PHP script.
- Line 2: session_start() initializes a session or resumes the current one, enabling access to $_SESSION.
- Line 4: (blank, for readability)
- Line 6: $_SESSION['user_id'] = 101; stores the authenticated user’s ID in the server-side session.
- Line 7: $_SESSION['username'] = 'sara'; stores the username in the session.
- Line 8: $_SESSION['roles'] = ['user']; stores the user roles in the session for authorization checks.
- Line 9: ?> ends the PHP script.

```php
<?php
// Later, on any page in the app, resume the session
session_start();

if (!empty($_SESSION['user_id'])) {
    // User is authenticated
    $name = $_SESSION['username'] ?? 'Guest';
    echo "Welcome, $name!";
}
```

### Line-by-line explanation
- Line 1: <?php starts the PHP script.
- Line 2: session_start() resumes the existing session, making $_SESSION available.
- Line 4: if (!empty($_SESSION['user_id'])) checks whether a user_id exists in the session, indicating a logged-in user.
- Line 5: // User is authenticated (comment)
- Line 6: $name = $_SESSION['username'] ?? 'Guest'; assigns the username from the session or 'Guest' if missing.
- Line 7: echo "Welcome, $name!"; outputs a greeting.
- Line 8: } closes the if block.
- Line 9: ?> ends the PHP script.
```

## 2. Secure Login Flow with Sessions

A typical login flow validates credentials, then initializes or resumes a session, regenerates the session ID to prevent fixation, and stores minimal identity data server-side.

```php
<?php
// login.php - processes login form POST
require 'db.php'; // pretend database helper

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    // Validate credentials
    $user = db_get_user_by_username($username);
    if ($user && password_verify($password, $user['password_hash'])) {
        // Prevent session fixation
        session_start();
        session_regenerate_id(true);

        // Persist user identity in session
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['logged_in'] = true;

        header('Location: /dashboard.php');
        exit;
    } else {
        // Invalid credentials
        http_response_code(401);
        echo 'Invalid credentials';
        exit;
    }
}
```

### Line-by-line explanation
- Line 1: <?php begins PHP code.
- Line 3: require 'db.php'; includes a helper to fetch user data from a (pretend) database.
- Line 5: Checks if the request method is POST, meaning the login form was submitted.
- Line 6-7: Reads username and password from the POST data with safe defaults.
- Line 9: // Validate credentials (comment)
- Line 10: $user = db_get_user_by_username($username); fetches the user record by username.
- Line 11: if ($user && password_verify($password, $user['password_hash'])) validates the provided password against the stored hash.
- Line 13: // Prevent session fixation (comment)
- Line 14: session_start() initializes the session for the current request.
- Line 15: session_regenerate_id(true) creates a new session ID and discards the old one to prevent fixation.
- Line 18-20: Stores the authenticated user’s identity in the server-side session.
- Line 22: header('Location: /dashboard.php'); redirects the user to a protected page.
- Line 23: exit; stops further script execution.
- Line 25: } else { begins handling failed login.
- Line 26: http_response_code(401); sets an unauthorized response.
- Line 27: echo 'Invalid credentials'; outputs an error message.
- Line 28: exit; ends the script.
- Line 30: ?> ends PHP code.
```

## 3. Access Control and Protected Routes

Protect sensitive pages by requiring a valid session and optionally enforcing roles. Sessions are checked on every request to guarded endpoints.

```php
<?php
// dashboard.php
session_start();

// Simple access check
if (empty($_SESSION['logged_in'])) {
    header('Location: /login.php');
    exit;
}

// Optional: enforce role-based access
$roles = $_SESSION['roles'] ?? [];
if (!in_array('admin', $roles)) {
    // For a generic protected page:
    echo "<h1>Dashboard</h1>";
    echo "<p>Welcome, " . htmlspecialchars($_SESSION['username']) . "!</p>";
} else {
    // admin area
    echo "<h1>Admin Dashboard</h1>";
}
```

### Line-by-line explanation
- Line 1: <?php begins PHP code.
- Line 3: session_start() resumes the current session or starts a new one.
- Line 6: if (empty($_SESSION['logged_in'])) checks if the user is not logged in.
- Line 7: header('Location: /login.php'); redirects to login if not authenticated.
- Line 8: exit; ends script execution.
- Line 11-12: $roles = $_SESSION['roles'] ?? []; loads roles from session or defaults to an empty array.
- Line 13: if (!in_array('admin', $roles)) checks for a non-admin user.
- Line 15-17: Outputs a generic user dashboard with a safe username display.
- Line 18-21: If the user is an admin, shows an Admin Dashboard.
- Line 23: ?> ends PHP code.
```

```php
<?php
// logout.php
session_start();
$_SESSION = [];
if (ini_get("session.use_cookies")) {
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000,
    $params['path'], $params['domain'],
    $params['secure'], $params['httponly']
  );
}
session_destroy();
header('Location: /login.php');
exit;
```

### Line-by-line explanation
- Line 1: <?php begins PHP code.
- Line 2: session_start() resumes the session to modify or destroy it.
- Line 3: $_SESSION = []; clears all session variables.
- Line 4-9: If cookies are used for the session, invalidate the session cookie by setting it to a past expiration.
- Line 11: session_destroy() destroys the server-side session data.
- Line 12: header('Location: /login.php'); redirects to login.
- Line 13: exit; ends script execution.
```

## 4. Session Security Best Practices

Apply defensive defaults to reduce attack surface: HttpOnly cookies, Secure cookies over HTTPS, SameSite controls, and rotating session IDs at critical transitions.

```php
<?php
// runtime/config.php or top of each entry point
ini_set('session.cookie_httponly', 1); // Helps mitigate XSS by restricting cookie access from JS
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS; 0 for local/dev
ini_set('session.cookie_samesite', 'Lax'); // CSRF mitigation for cross-site requests

// Optional: set a smaller lifetime and clean-up policy
ini_set('session.gc_maxlifetime', 1800); // 30 minutes
```

### Line-by-line explanation
- Line 1: <?php begins PHP code.
- Line 3: ini_set('session.cookie_httponly', 1); enables HttpOnly flag on session cookies to prevent JavaScript access.
- Line 4: ini_set('session.cookie_secure', 0); marks cookies as Secure only when using HTTPS (set to 1 in prod).
- Line 5: ini_set('session.cookie_samesite', 'Lax'); sets SameSite policy to help CSRF defenses.
- Line 8: ini_set('session.gc_maxlifetime', 1800); configures garbage collection for old sessions.
```

Note: In production, ensure you serve over HTTPS and set session.cookie_secure to 1. You should also perform session_id rotation explicitly on privilege elevation or after login (as shown in the login example) to further reduce fixation risk.

## 5. Session Timeout and Inactivity

Implementing inactivity timeouts helps reduce risk if a user leaves a session open.

```php
<?php
session_start();
$timeout = 1800; // 30 minutes

if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
    // End session due to inactivity
    session_unset();
    session_destroy();
    header('Location: /login.php');
    exit;
}
$_SESSION['last_activity'] = time();
```

### Line-by-line explanation
- Line 1: <?php begins PHP code.
- Line 3: session_start() resumes the session to access last_activity.
- Line 4: $timeout = 1800; sets the inactivity threshold (in seconds).
- Line 6: if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) checks for inactivity.
- Line 7-10: If timed out, clear session, destroy it, and redirect to login.
- Line 12: $_SESSION['last_activity'] = time(); updates the last activity timestamp to now.
```

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code examples.

- Pitfall 1: Trusting client-side cookies for authentication state
  - Bad:
  ```php
  <?php
  // BAD: trusting a cookie named 'logged_in' to authorize access
  if ($_COOKIE['logged_in'] ?? false) {
      // assume authenticated
  }
  ```
  - Good:
  ```php
  <?php
  // GOOD: rely on server-side session
  session_start();
  if (!empty($_SESSION['logged_in'])) {
      // authenticated
  }
  ```

- Pitfall 2: Not regenerating the session ID on login
  - Bad:
  ```php
  <?php
  session_start();
  $_SESSION['user_id'] = 42;
  ```
  - Good:
  ```php
  <?php
  session_start();
  session_regenerate_id(true);
  $_SESSION['user_id'] = 42;
  ```

- Pitfall 3: Storing too much data or sensitive data in session
  - Bad:
  ```php
  <?php
  $_SESSION['profile'] = $userProfile; // large or sensitive
  ```
  - Good:
  ```php
  <?php
  $_SESSION['user_id'] = $user['id'];
  // Fetch additional data as needed per request instead of storing in session
  ```

- Pitfall 4: Storing passwords in session
  - Bad:
  ```php
  <?php
  $_SESSION['password'] = $password; // BAD
  ```
  - Good:
  ```php
  <?php
  $_SESSION['user_id'] = $user['id'];
  // Never store plaintext passwords or password hashes in session
  ```

## Y. Why This Matters In Real Systems

- Security: Server-side session data reduces risk of client tampering, but you must protect the session cookie and guard against session fixation and hijacking (regenerate IDs on login, use HttpOnly/Secure cookies, and consider SameSite settings).
- Deployment realities: File-based PHP sessions can become a bottleneck in load-balanced or multi-server environments. In production, consider centralized session stores (Redis or Memcached) and consistent session configuration:
  - Example: Redis-backed sessions
  ```ini
  ; php.ini
  session.save_handler = redis
  session.save_path = "tcp://127.0.0.1:6379"
  ```
  - Or via PHP code (during initialization):
  ```php
  <?php
  ini_set('session.save_handler', 'redis');
  ini_set('session.save_path', 'tcp://127.0.0.1:6379');
  session_start();
  ```
- Best practices: Use short session lifetimes, rotate IDs on login, set HttpOnly and Secure cookies, and prefer server-side validation over client-provided data. Consider CSRF protections and, for API-heavy apps, sometimes migrating to token-based approaches for stateless endpoints, while preserving stateful flows for web UI where appropriate.

## Z. Study Questions

1) What is the main difference between stateful (session-based) and stateless (token-based) authentication?  
2) Why should you call session_regenerate_id(true) after a successful login?  
3) How do you securely configure cookies for PHP sessions (HttpOnly, Secure, SameSite)?  
4) How can you implement an inactivity timeout for a PHP session?  
5) What are the trade-offs of using a centralized session store (like Redis) vs file-based sessions on a single server?

## Exercise

Build a small PHP mini-application that demonstrates a complete, secure, stateful login workflow with sessions and cookies. Deliverables:
- A simple in-memory or file-based user store (hard-coded users with hashed passwords is fine for the exercise).
- A login page (login.php) that processes credentials, starts a session, regenerates the session ID, and stores minimal user identity in $_SESSION.
- A protected page (dashboard.php) that only renders if the user is logged in; show a welcome message with the username.
- A logout page (logout.php) that securely destroys the session and clears the cookie.
- Implement an inactivity timeout (30 minutes) and ensure session data is invalidated afterward.
- Apply basic session security settings (HttpOnly, SameSite, Secure in production) and document their rationale in a readme.

Optional extension for extra realism:
- Move session storage to Redis (or another centralized store) and configure PHP accordingly.
- Add a role-based access check (e.g., admin vs user) on a separate admin page.
- Include CSRF protection tokens for any state-changing form submissions.

Guidance:
- Use the code samples in this lesson as a blueprint, but adapt them into a small, cohesive project with at least three PHP files (login.php, dashboard.php, logout.php) and a simple index or login form to drive the test flow.
- Keep security in mind: don’t expose password values, don’t store sensitive data in the session beyond what’s necessary (e.g., user_id and username), and rotate session IDs on login.