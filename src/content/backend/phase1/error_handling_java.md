# Track: Backend Engineering — Phase 1: Language Foundations — Topic: Error Handling & Debugging (Java)

Error handling and debugging are foundational skills for backend engineers. Proper error handling protects service reliability, improves developer productivity, and enables fast, safe recovery in production. In Java, a robust approach combines clear exception design, disciplined resource management, structured logging, and deliberate debugging practices. This lesson walks you through core concepts, concrete code examples, and real-world usage patterns you can apply in professional backend systems.

## 1. Fundamentals of Java Exception Model

Understanding Java's exception hierarchy and flow is the first step to robust error handling. This section covers the basic try-catch-finally pattern and how exceptions propagate.

```java
public class ExceptionBasics {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3};
        try {
            // This line will throw ArrayIndexOutOfBoundsException
            System.out.println("Access: " + arr[5]);
        } catch (ArrayIndexOutOfBoundsException e) {
            System.err.println("Caught: " + e);
        } finally {
            System.out.println("Cleanup resources if any");
        }
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1: Declares a public class named ExceptionBasics.
- Line 2: Entry point method main.
- Line 3: Creates an array with three elements.
- Line 5: Begin try block to catch potential runtime errors.
- Line 7: Accesses an invalid array index, throwing ArrayIndexOutOfBoundsException.
- Line 8-10: Catch block handles the specific exception and prints an error message.
- Line 11-13: Finally block executes regardless of whether an exception occurred; ideal for cleanup.
- Line 15: End of class.

## 2. Custom Exceptions and Domain Errors

Custom exceptions encode domain-specific failure modes, making error handling clearer and more maintainable across layers (e.g., config, validation, business rules).

```java
// Custom exception for configuration parsing errors
class ConfigParseException extends Exception {
    public ConfigParseException(String message) {
        super(message);
    }

    public ConfigParseException(String message, Throwable cause) {
        super(message, cause);
    }
}

import java.io.IOException;

public class CustomExceptionDemo {
    public static void main(String[] args) {
        try {
            readConfig("config.txt");
        } catch (ConfigParseException e) {
            System.err.println("Config parse error: " + e.getMessage());
        } catch (IOException e) {
            System.err.println("IO error: " + e.getMessage());
        }
    }

    static void readConfig(String path) throws IOException, ConfigParseException {
        // In a real scenario we'd read from disk; here we simulate content
        String content = "version: 1\nname: Example"; // simulated content

        // Validate format
        if (!content.startsWith("version:")) {
            throw new ConfigParseException("Invalid configuration format");
        }

        // Additional parsing logic would go here
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-4: Define a custom exception class ConfigParseException with constructors for message and cause.
- Line 6: Import IOException for the example.
- Line 8: Declare public class CustomExceptionDemo.
- Line 9-14: main method attempts to read config and handles two exception types separately.
- Line 16-24: readConfig reads input and validates minimal format; throws ConfigParseException if invalid or propagates IOException otherwise.
- Line 26: End of class.

## 3. Resource Management with Try-With-Resources

Managing resources (files, sockets, streams) safely is crucial to prevent leaks. Java's try-with-resources automates close() calls.

```java
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class ResourceManagementDemo {
    public static void main(String[] args) {
        try (BufferedReader br = new BufferedReader(new FileReader("config.txt"))) {
            String line;
            while ((line = br.readLine()) != null) {
                System.out.println(line);
            }
        } catch (IOException e) {
            System.err.println("Failed to read config: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-3: Import necessary IO classes.
- Line 5: Declare class ResourceManagementDemo.
- Line 6-12: Try-with-resources opens BufferedReader; reads lines in a loop.
- Line 13-16: Catch block handles IO problems, prints a message, and prints the stack trace for debugging.
- Line 18: End of class.

## 4. Logging and Observability

Structured logging is essential for diagnosing issues in production. Prefer logging frameworks over System.out.println for levels, formatting, and routing.

```java
import java.util.logging.Level;
import java.util.logging.Logger;

public class LoggingExample {
    private static final Logger logger = Logger.getLogger(LoggingExample.class.getName());

    public static void main(String[] args) {
        logger.info("Starting operation");
        try {
            int a = 1 / 0; // deliberate error to illustrate logging of exceptions
        } catch (ArithmeticException ex) {
            logger.log(Level.SEVERE, "Unhandled arithmetic error", ex);
        }
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-3: Import logging classes; declare class and a static logger instance.
- Line 5: main method entry.
- Line 7: Log an informational message to indicate the operation start.
- Line 9-12: Deliberate arithmetic error triggers an exception; catch handles it.
- Line 11-12: Log the exception with level SEVERE and include the stack trace.
- Line 14: End of class.

## 5. Debugging Techniques and Strategies

Effective debugging blends quick checks, isolation, and visibility into failures. The following code illustrates practical patterns for safer, clearer debugging.

```java
public class DebugDemo {
    public static void main(String[] args) {
        // BAD: potential NPE
        // String s = null;
        // System.out.println(s.length());

        // GOOD: explicit checks
        String s = null;
        if (s != null) {
            System.out.println(s.length());
        } else {
            System.out.println("s is null");
        }

        // Another common technique: print stack traces in catch blocks
        try {
            int[] a = new int[2];
            System.out.println(a[5]);
        } catch (ArrayIndexOutOfBoundsException e) {
            e.printStackTrace();
        }
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-3: Define class DebugDemo.
- Line 6-12: BAD example commented out shows how null dereference can crash.
- Line 15-23: GOOD approach with a null check to avoid NPE; logs a safe message.
- Line 25-33: Demonstrates capturing a runtime error and printing the stack trace for debugging, which helps pinpoint the issue during development.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

- Pitfall 1: Swallowing exceptions
  - Bad:
    ```java
    public void process() {
        try {
            doWork();
        } catch (Exception e) {
            // swallowed silently
        }
    }
    ```
  - Good:
    ```java
    public void process() {
        try {
            doWork();
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to process", e);
            throw new ProcessingFailureException("Processing failed", e);
        }
    }
    ```
  - Supporting class:
    ```java
    class ProcessingFailureException extends RuntimeException {
        public ProcessingFailureException(String message, Throwable cause) {
            super(message, cause);
        }
    }
    ```

- Pitfall 2: Catching overly broad exceptions
  - Bad:
    ```java
    try {
        readResource();
    } catch (Exception e) {
        System.out.println("Generic failure");
    }
    ```
  - Good:
    ```java
    try {
        readResource();
    } catch (IOException e) {
        System.err.println("IO error: " + e.getMessage());
    } catch (InvalidResourceFormatException e) {
        System.err.println("Invalid format: " + e.getMessage());
    }
    ```
  - Note: Define and use specific exception types relevant to your domain.

- Pitfall 3: Not closing resources (resource leaks)
  - Bad:
    ```java
    public String readFirstLine(String path) throws IOException {
        BufferedReader br = new BufferedReader(new FileReader(path));
        return br.readLine();
    }
    ```
  - Good:
    ```java
    public String readFirstLine(String path) throws IOException {
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            return br.readLine();
        }
    }
    ```

- Pitfall 4: Using System.out.println for production logs
  - Bad:
    ```java
    public void doWork() {
        System.out.println("Work started");
        // ...
    }
    ```
  - Good:
    ```java
    private static final Logger logger = Logger.getLogger(MyClass.class.getName());
    public void doWork() {
        logger.info("Work started");
        // ...
    }
    ```

## Y. Why This Matters In Real Systems

- Reliability: Correct exception handling prevents cascading failures and makes recovery predictable.
- Observability: Structured logging and proper exception propagation give teams context to diagnose issues quickly.
- User experience: Do not leak internal stack traces to end-users; map to user-friendly messages and error codes.
- Safety and security: Avoid exposing sensitive data in logs or error responses; sanitize messages at boundaries.
- Operational metrics: Track error rates, latency spikes, and exception types to inform error budgets and SLOs.
- Layer boundaries: Propagate domain-specific exceptions across service layers, translating into appropriate HTTP status codes or RPC errors at the boundary.

In production, you typically combine:
- Specific, meaningful exception classes per domain.
- Try-with-resources for automatic cleanup.
- Centralized logging with correlation IDs.
- Structured error responses and consistent error codes.
- Alerting and dashboards tied to error budgets and latency.

## Z. Study Questions

1) What is the difference between a checked exception and an unchecked (runtime) exception in Java? When should you prefer one over the other?

2) How does try-with-resources improve resource safety, and what types of resources support it?

3) Why is it a bad practice to catch Exception or Throwable broadly? Provide an example of a more precise catch strategy.

4) How should you design and use custom exceptions in a backend service to improve maintainability?

5) What are two key practices to improve debugging in a running backend system?

## Exercise

Part A: Implement a small config loader with proper error handling.

Files to create (you can place them in a single project/package for the exercise):

1) ConfigParseException.java
2) ConfigReader.java
3) MainRunner.java

Code:

ConfigParseException.java
```java
package exercise.config;

public class ConfigParseException extends Exception {
    public ConfigParseException(String message) {
        super(message);
    }

    public ConfigParseException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

ConfigReader.java
```java
package exercise.config;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class ConfigReader {
    public Map<String, String> readConfig(String path) throws IOException, ConfigParseException {
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            Map<String, String> config = new HashMap<>();
            String line;
            boolean hasVersion = false;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int idx = line.indexOf('=');
                if (idx <= 0) {
                    throw new ConfigParseException("Invalid line: " + line);
                }
                String key = line.substring(0, idx).trim();
                String value = line.substring(idx + 1).trim();
                config.put(key, value);
                if ("version".equalsIgnoreCase(key)) hasVersion = true;
            }
            if (!hasVersion) throw new ConfigParseException("Missing required 'version' key");
            return config;
        }
    }
}
```

MainRunner.java
```java
package exercise.config;

import java.io.IOException;
import java.util.Map;

public class MainRunner {
    public static void main(String[] args) {
        ConfigReader reader = new ConfigReader();
        String path = "config.env";
        try {
            Map<String, String> cfg = reader.readConfig(path);
            System.out.println("Config loaded: " + cfg);
        } catch (IOException e) {
            System.err.println("IO error reading config: " + e.getMessage());
            e.printStackTrace();
        } catch (ConfigParseException e) {
            System.err.println("Config parse error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
```

Sample config.env (for your testing)
version=1
name=ExampleService
port=8080

What you should do next:
- Create the files in your Java project, then run MainRunner.
- Observe proper success output or descriptive error messages with stack traces to aid debugging.
- Extend ConfigReader to support more keys and different value types, adding appropriate exceptions for type-mismatch scenarios.

Notes:
- If you’re new to packaging, place the exercise files under a package such as exercise.config and adjust your project structure accordingly.
- In a real project, you’d add unit tests to verify both success paths and error paths for ConfigReader.