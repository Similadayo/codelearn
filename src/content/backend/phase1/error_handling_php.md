# Track: Backend Engineering — Phase 1: Language Foundations — Error Handling & Debugging (PHP)

Error handling and debugging are foundational skills for reliable backend services. Proper error handling prevents silent failures, surfaces actionable issues to developers, and maintains a responsive user experience. In PHP, robust error handling combines configuring error reporting, using exceptions, converting PHP errors to exceptions, and employing structured logging and debugging strategies. This module walks through practical patterns, with concrete PHP examples you can adapt to real systems.

## 1. PHP Error Reporting and Environment-Aware Configuration
Configure error reporting and display to suit development vs. production. Development should display errors locally for rapid feedback; production should hide errors from users and log them securely for operators.

```php
<?php
// 1. Environment-aware error reporting
$env = getenv('APP_ENV') ?: 'development';

if ($env === 'production') {
    // Do not show errors to end users
    ini_set('display_errors', '0');
    // Always log errors in production
    ini_set('log_errors', '1');
} else {
    // Development: show errors for quick feedback
    ini_set('display_errors', '1');
    ini_set('log_errors', '1');
}

// Centralize PHP error reporting
ini_set('error_reporting', E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/logs/php-errors.log');
?>
```

### Line-by-line explanation breaking down each line
- Line 1: Opens a PHP script.
- Line 4: Reads an environment variable APP_ENV; defaults to 'development' if not set.
- Lines 6-11: If in production, disables display of errors to users and ensures errors are logged.
- Lines 12-18: If not in production (development), enables display of errors for quick feedback and ensures errors are logged.
- Line 21: Sets error_reporting to report all PHP errors and warnings.
- Line 22: Ensures error logging is enabled.
- Line 23: Sets a file path for the PHP error log, using a logs directory relative to the script.

## 2. Exceptions and Try/Catch: Building Domain-Specific Error Handling
Use typed exceptions to model domain failures and separate user-facing messages from internal details.

```php
<?php
class AppException extends \Exception {}

function mightFail(bool $shouldFail): string {
    if ($shouldFail) {
        throw new AppException("Operation failed due to invalid state.");
    }
    return "All good!";
}

try {
    $result = mightFail(true);
    echo $result;
} catch (AppException $e) {
    // Domain-specific handling
    echo "AppError: " . htmlspecialchars($e->getMessage());
} catch (\Throwable $e) {
    // Fallback for any other error or exception
    echo "Error: " . htmlspecialchars($e->getMessage());
}
```

### Line-by-line explanation breaking down each line
- Line 3: Declares a custom exception type AppException for domain-specific failures.
- Line 5-11: Defines mightFail(), throwing AppException when the condition is triggered; otherwise returns a success string.
- Line 13-20: Executes mightFail(true) inside a try block; if an AppException is thrown, it’s caught and a domain-specific message is shown; any other Throwable is caught by the general catch.
- Line 14: Call to mightFail(true) triggers the exception.
- Line 15: Outputs the result if no exception occurs.
- Line 16-18: Catch AppException and display a sanitized domain-specific message.
- Line 19-20: Catch any other Throwable (including other exceptions and errors) and display a sanitized message.

## 3. Converting PHP Errors to Exceptions (Error-to-Exception Conversion)
Turn PHP runtime notices and warnings into exceptions so you can unify error handling with try/catch.

```php
<?php
// 3. Convert PHP errors to exceptions
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
}, E_ALL);

// Example: referencing an undefined variable (notice) becomes an exception
try {
    $trigger = $undefinedVar; // undefined variable triggers a Notice
} catch (ErrorException $e) {
    echo "Caught ErrorException: " . $e->getMessage();
}
```

### Line-by-line explanation breaking down each line
- Line 4: Sets a custom error handler that converts all PHP errors (E_ALL) into ErrorException instances.
- Line 5-9: The handler receives severity, message, file, and line, and throws a new ErrorException with those details.
- Line 12-16: Attempts to access an undefined variable to trigger a PHP Notice; the error handler converts it into an exception.
- Line 13: The undefined variable access triggers a notice under normal PHP behavior.
- Line 14-16: If an ErrorException is thrown, it is caught and a message is displayed.

## 4. Capturing Fatal Errors with a Shutdown Handler
Fatal errors (calls to undefined functions, parse errors, or other fatal conditions) don’t bubble to try/catch. Use a shutdown function to inspect the last error and log or report it.

```php
<?php
// 4. Capture fatal errors with a shutdown handler
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        $log = __DIR__ . '/logs/fatal.log';
        $message = sprintf("Fatal error: %s in %s:%d",
                           $err['message'], $err['file'], $err['line']);
        file_put_contents($log, $message . PHP_EOL, FILE_APPEND);
    }
});

// Example: intentionally calling a non-existent function can cause a fatal error
// nonExistentFunction();

// Normal execution continues
echo "App loaded. Ready." . PHP_EOL;
```

### Line-by-line explanation breaking down each line
- Line 3: Registers a shutdown function to run when the script ends.
- Lines 4-10: Retrieves the last error; if it is a fatal type, creates and appends a log entry to fatal.log with the error message and location.
- Line 11: Path for the fatal error log file.
- Line 13: Formats a descriptive message with error details.
- Line 14: Writes the formatted message to the log file.
- Line 18: Example usage is commented out; uncommenting would trigger a fatal error.
- Line 21: Demonstrates normal script execution after setting up the shutdown handler.

## 5. Lightweight Debugging and Structured Logging
For practical debugging, combine quick inspection with persistent logs. A tiny logger helps keep runtime signals available without requiring external dependencies.

```php
<?php
// 5. Lightweight logger for development and production insight
class SimpleLogger {
    private string $path;

    public function __construct(string $path) {
        $this->path = $path;
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    public function log(string $level, string $message): void {
        $line = sprintf("[%s] [%s] %s",
                        date('Y-m-d H:i:s'), strtoupper($level), $message);
        file_put_contents($this->path, $line . PHP_EOL, FILE_APPEND);
    }
}

$logger = new SimpleLogger(__DIR__ . '/logs/app.log');
$logger->log('info', 'Server started');

// Example usage: log a caught exception
try {
    throw new RuntimeException("Demo exception for debugging");
} catch (Exception $e) {
    $logger->log('error', 'Caught exception: ' . $e->getMessage());
}
```

### Line-by-line explanation breaking down each line
- Line 4-16: Defines a SimpleLogger with a constructor that ensures the log directory exists when initialized.
- Line 18-22: Instantiates the logger with a path to app.log and writes an informational entry.
- Line 25-29: Demonstrates logging when an exception is caught, recording the message at error level.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Revealing internal errors to end users
- Bad:
```php
<?php
try {
    // some operation that fails
} catch (Exception $e) {
    // Directly output the exception, including stack trace
    echo $e;
}
```
- Good:
```php
<?php
try {
    // some operation that fails
} catch (Exception $e) {
    // Do not reveal internal details
    error_log($e->getMessage());
    http_response_code(500);
    echo "An unexpected error occurred. Please try again later.";
}
```

Pitfall 2: Using the error-suppression operator (@)
- Bad:
```php
<?php
// Suppress potential warning/notices
$content = @file_get_contents('/path/not-found.txt');
```
- Good:
```php
<?php
$content = @file_get_contents('/path/not-found.txt');
if ($content === false) {
    // Handle error explicitly, using error_get_last() if needed
    error_log('Failed to read file: /path/not-found.txt');
}
```

Pitfall 3: Not centralizing logging or failing to persist important signals
- Bad:
```php
<?php
if ($db->connect_errno) {
    // Just echo
    echo "DB connection failed";
}
```
- Good:
```php
<?php
class Logger {
    private string $path;
    public function __construct(string $path) { $this->path = $path; }
    public function log(string $level, string $msg): void {
        file_put_contents($this->path, "[$level] " . $msg . PHP_EOL, FILE_APPEND);
    }
}
$logger = new Logger(__DIR__ . '/logs/db.log');
if ($db->connect_errno) {
    $logger->log('error', 'DB connection failed: ' . $db->connect_error);
    // Optionally raise an exception or retry
}
```

Pitfall 4: Ignoring fatal errors and not using a shutdown handler
- Bad:
```php
// No shutdown handler; fatal errors go unlogged
nonexistent_function();
```
- Good:
```php
<?php
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        error_log("Fatal error: " . $err['message']);
    }
});
nonexistent_function(); // This will trigger a fatal error and be captured
```

## Y. Why This Matters In Real Systems — production context and real usage
- Reliability: Consistent error handling reduces MTTR (mean time to recovery) by surfacing actionable information to on-call engineers.
- Security: Hiding internal stack traces and sensitive details protects against information disclosure.
- Observability: Centralized logging, structured messages, and severity levels enable effective incident response, dashboards, and alerting.
- Maintainability: Exceptions model failures clearly, enabling better testing, retry strategies, and fault isolation.
- Compliance and Auditing: Logs and error histories support audits, debugging, and regression prevention.

In real systems, you’ll see frameworks implement similar patterns:
- Framework-level exception handlers that convert PHP exceptions to HTTP error responses with friendly messages.
- Centralized Monolog (or similar) pipelines for logs, with handlers for files, syslog, and external services.
- Instrumentation: correlation IDs, structured logs, and context-rich messages to link related events across services.

## Z. Study Questions — 5 recall questions
1. What is the difference between a PHP error and an exception, and when should you prefer exceptions?
2. How can you convert PHP errors (notices/warnings) into exceptions in a consistent way?
3. Why would you use a shutdown function in PHP, and what type of errors does it catch?
4. In production, why is it important to disable display_errors and log instead?
5. What role does a centralized logger play in debugging and production monitoring?

## Exercise — practical multi-part coding challenge

Goal: Build a small, self-contained PHP script that demonstrates error handling, exception usage, error-to-exception conversion, fatal error capture, and logging. You will create a reusable error handling module and a demo script that exercises it.

Part A: Create a lightweight error handling module
- Create a file error_handling.php that:
  - Defines a SimpleLogger class (as in section 5) and a function init_error_handling() that:
    - Sets error_reporting(E_ALL) and configures error display based on an APP_ENV environment variable (default development).
    - Registers a global error handler that converts errors to ErrorException.
    - Registers a shutdown function to log fatal errors to logs/fatal.log.
  - Returns an instance of SimpleLogger for use by the demo.

Part B: Demo script that exercises error handling
- Create a file demo_error_handling.php that:
  - Requires error_handling.php and calls init_error_handling().
  - Uses a function mightFail($ok) that throws a domain-specific AppException on failure.
  - Demonstrates:
    - A caught AppException path.
    - A PHP notice converted to an ErrorException (by triggering an undefined variable) and caught.
    - Triggering a fatal error path (you can uncomment a line to call a non-existent function) to demonstrate the shutdown handler logging.
  - Logs key events using the SimpleLogger instance from the error handling module.

Part C: Run and verify
- Set APP_ENV=development and run the script from the CLI (or a local server).
- Observe:
  - Exceptions and errors surface or are logged according to environment.
  - Fatal errors log to logs/fatal.log via the shutdown handler.
  - All log lines include timestamp and severity.

Deliverables:
- error_handling.php containing SimpleLogger and init_error_handling().
- demo_error_handling.php demonstrating the features.
- A brief note describing how to run and what to expect in logs, including sample log lines.

This completes a practical, multi-part exercise that reinforces error handling practices and debugging patterns in PHP, aligned with real-world backend engineering workflows.