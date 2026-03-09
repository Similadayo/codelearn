# Track: Backend Engineering — Phase 4: Building Web Servers - Environment Variables & Config Management in Java

Compelling introductory paragraph: In modern backend systems, externalizing configuration is a foundation of scalable, maintainable software. Environment variables and config management decouple deployment details from code, enable consistent behavior across development, staging, and production, and support practices like 12-factor apps. This lesson shows how to read environment variables, load configuration from properties files, and bind both into a lightweight Java config layer that a web server can use at startup. You’ll implement a small, runnable web server that respects config sources and demonstrates practical patterns you can reuse in real systems.

## 1. Reading Environment Variables in Java (Basics)

Code example: reading environment variables with sensible defaults.

```java
// EnvDemo.java
public class EnvDemo {
    public static void main(String[] args) {
        String host = System.getenv().getOrDefault("APP_HOST", "127.0.0.1");
        String portStr = System.getenv().getOrDefault("APP_PORT", "8080");
        int port = Integer.parseInt(portStr);

        System.out.println("Host=" + host + " Port=" + port);
    }
}
```

### Line-by-line explanation
- Line 1: Declares a public class named EnvDemo.
- Line 2: Starts the main method, the program entry point.
- Line 3: Reads the environment variable APP_HOST; if not present, uses the default "127.0.0.1".
- Line 4: Reads APP_PORT; if not present, uses the default "8080" as a string.
- Line 5: Converts the port string to an int.
- Line 7: Prints the resolved host and port to stdout.

## 2. Loading Configuration from Properties Files

Code example: loading config from a properties file and applying defaults.

```java
// PropertiesDemo.java
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

public class PropertiesDemo {
    public static void main(String[] args) throws IOException {
        Properties props = new Properties();
        try (FileInputStream in = new FileInputStream("config.properties")) {
            props.load(in);
        }

        String host = props.getProperty("config.host", "127.0.0.1");
        String portStr = props.getProperty("config.port", "8080");
        int port = Integer.parseInt(portStr);

        System.out.println("Loaded host=" + host + ", port=" + port);
    }
}
```

### Line-by-line explanation
- Line 1-3: Imports necessary classes for file I/O and properties handling.
- Line 5: Declares the PropertiesDemo class.
- Line 6: Main method entry point.
- Line 7-11: Creates a Properties object and loads key-value pairs from config.properties.
- Line 12: Retrieves config.host from the properties, defaulting to "127.0.0.1" if missing.
- Line 13: Retrieves config.port from the properties, defaulting to "8080" if missing.
- Line 14: Converts the port string to an int.
- Line 16: Prints the loaded host and port.

Notes:
- config.properties is a plain key-value file. Example content:
  config.host=0.0.0.0
  config.port=8080
  config.db.url=jdbc:h2:mem:test
  config.db.user=sa
  config.db.password=
  config.log.level=INFO

## 3. Building a Lightweight Config Layer with Precedence (Env > File)

Code example: a small ConfigLoader that prefers environment variables over properties file values, and a Config POJO.

```java
// Config.java
public class Config {
    private final String host;
    private final int port;
    private final String dbUrl;
    private final String dbUser;
    private final String dbPassword;
    private final String logLevel;

    public Config(String host, int port, String dbUrl, String dbUser, String dbPassword, String logLevel) {
        this.host = host;
        this.port = port;
        this.dbUrl = dbUrl;
        this.dbUser = dbUser;
        this.dbPassword = dbPassword;
        this.logLevel = logLevel;
    }

    public String getHost() { return host; }
    public int getPort() { return port; }
    public String getDbUrl() { return dbUrl; }
    public String getDbUser() { return dbUser; }
    public String getDbPassword() { return dbPassword; }
    public String getLogLevel() { return logLevel; }
}
```

```java
// ConfigLoader.java
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

public class ConfigLoader {
    private final Properties props = new Properties();

    public ConfigLoader(String propertiesPath) throws IOException {
        try (FileInputStream in = new FileInputStream(propertiesPath)) {
            props.load(in);
        }
    }

    // Precedence: Environment variable wins over properties file
    public String host() {
        String v = System.getenv("CONFIG_HOST");
        return (v != null && !v.isEmpty()) ? v : props.getProperty("config.host", "127.0.0.1");
    }

    public int port() {
        String v = System.getenv("CONFIG_PORT");
        if (v != null && !v.isEmpty()) return Integer.parseInt(v);
        return Integer.parseInt(props.getProperty("config.port", "8080"));
    }

    public String dbUrl() {
        String v = System.getenv("CONFIG_DB_URL");
        return (v != null && !v.isEmpty()) ? v : props.getProperty("config.db.url", "jdbc:h2:mem:test");
    }

    public String dbUser() {
        String v = System.getenv("CONFIG_DB_USER");
        return (v != null && !v.isEmpty()) ? v : props.getProperty("config.db.user", "sa");
    }

    public String dbPassword() {
        String v = System.getenv("CONFIG_DB_PASSWORD");
        return (v != null && !v.isEmpty()) ? v : props.getProperty("config.db.password", "");
    }

    public String logLevel() {
        String v = System.getenv("CONFIG_LOG_LEVEL");
        return (v != null && !v.isEmpty()) ? v : props.getProperty("config.log.level", "INFO");
    }

    public Config load() {
        return new Config(host(), port(), dbUrl(), dbUser(), dbPassword(), logLevel());
    }
}
```

```java
// WebServerLauncher.java
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class WebServerLauncher {
    public static void main(String[] args) throws IOException {
        ConfigLoader loader = new ConfigLoader("config.properties");
        Config cfg = loader.load();

        HttpServer server = HttpServer.create(new InetSocketAddress(cfg.getHost(), cfg.getPort()), 0);
        server.createContext("/", exchange -> {
            String response = "Hello! Host=" + cfg.getHost() +
                              " Port=" + cfg.getPort() +
                              " DB=" + cfg.getDbUrl();
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
            exchange.sendResponseHeaders(200, response.getBytes().length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response.getBytes());
            }
        });

        server.start();
        System.out.println("Server listening on " + cfg.getHost() + ":" + cfg.getPort());
        // Note: In a real app you'd keep the JVM alive differently; this is a minimal example.
    }
}
```

### Line-by-line explanation
- Config.java
  - Lines 1-9: Define a simple immutable Config object with six fields and a constructor.
  - Lines 11-22: Provide getters for all fields to allow other parts of the app to read configuration safely.
- ConfigLoader.java
  - Lines 1-9: Imports and class declaration.
  - Lines 11-17: Load properties from a given file path at construction time.
  - Host/Port/DB/User/DBPassword/LogLevel methods (lines 20-57): For each setting, check the environment variable first. If present, use it; otherwise fall back to the properties file value or a default.
  - load() method (lines 59-63): Build and return a Config instance with the resolved values.
- WebServerLauncher.java
  - Imports and main method declaration.
  - Creates a ConfigLoader to read config.properties, then loads a Config.
  - Sets up a minimal HTTP server bound to host and port from config.
  - Defines a single endpoint "/" that responds with a simple informational message including the loaded config values.
  - Starts the server and prints the listening address.

Note:
- config.properties sample (same as above) can be used here to provide values when environment variables are not set.
- Environment overrides should be demonstrated by setting CONFIG_HOST or CONFIG_PORT in your environment before running.

## 4. Startup a Minimal Web Server Using Config

Code example: a runnable server that uses the Config layer to determine host/port and a sample response.

```java
// RunServerWithConfig.java
public class RunServerWithConfig {
    public static void main(String[] args) throws Exception {
        ConfigLoader loader = new ConfigLoader("config.properties");
        Config cfg = loader.load();

        java.net.InetSocketAddress address = new java.net.InetSocketAddress(cfg.getHost(), cfg.getPort());
        com.sun.net.httpserver.HttpServer server = com.sun.net.httpserver.HttpServer.create(address, 0);
        server.createContext("/", exchange -> {
            String body = "Server running. Host=" + cfg.getHost() + " Port=" + cfg.getPort();
            byte[] bytes = body.getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
            exchange.sendResponseHeaders(200, bytes.length);
            try (java.io.OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        server.start();
        System.out.println("Server listening on " + cfg.getHost() + ":" + cfg.getPort());
    }
}
```

### Line-by-line explanation
- Line 1: Declares the RunServerWithConfig class.
- Line 2-3: Main method declaration.
- Line 4: Creates a ConfigLoader for config.properties.
- Line 5: Loads the resolved Config (environment overrides applied).
- Line 7: Creates an HttpServer bound to host and port from config.
- Line 8-16: Adds a root context that responds with a simple status message including host and port.
- Line 17: Starts the HTTP server.
- Line 18: Logs the listening address.

Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Hard-coding configuration values in code
- Bad:
```java
// BadConfig.java
public class BadConfig {
    public static final String HOST = "127.0.0.1";
    public static final int PORT = 8080;
}
```
```java
// BadUsage.java
public class BadUsage {
    public static void main(String[] args) {
        System.out.println("Starting on " + BadConfig.HOST + ":" + BadConfig.PORT);
        // If you later deploy to another environment, you must edit code and recompile
    }
}
```

- Good:
```java
// GoodConfig.java
public class GoodConfig {
    public static String host() {
        return System.getenv().getOrDefault("CONFIG_HOST", "127.0.0.1");
    }
    public static int port() {
        return Integer.parseInt(System.getenv().getOrDefault("CONFIG_PORT", "8080"));
    }
}
```
```java
// GoodUsage.java
public class GoodUsage {
    public static void main(String[] args) {
        System.out.println("Starting on " + GoodConfig.host() + ":" + GoodConfig.port());
        // Values can be overridden via environment without code changes
    }
}
```

### Pitfall 2: Not handling missing or invalid environment variables
- Bad:
```java
// BadEnv.java
public class BadEnv {
    public static void main(String[] args) {
        String port = System.getenv("APP_PORT");
        int p = Integer.parseInt(port); // NullPointerException if APP_PORT is missing, NumberFormatException if not a number
        System.out.println("Port: " + p);
    }
}
```

- Good:
```java
// GoodEnv.java
public class GoodEnv {
    public static void main(String[] args) {
        String portStr = System.getenv("APP_PORT");
        int port = 8080;
        if (portStr != null && !portStr.isEmpty()) {
            try {
                port = Integer.parseInt(portStr);
            } catch (NumberFormatException e) {
                System.err.println("Invalid APP_PORT value: " + portStr + " - using default 8080");
            }
        }
        System.out.println("Port: " + port);
    }
}
```

### Pitfall 3: Storing secrets in code or in VCS
- Bad:
```java
// BadSecret.java
public class BadSecret {
    private static final String DB_PASSWORD = "change-me-at-build-time"; // checked into repo
}
```
- Good:
```java
// SecretViaEnv.java
public class SecretViaEnv {
    public static String getDbPassword() {
        String pwd = System.getenv("CONFIG_DB_PASSWORD");
        if (pwd == null || pwd.isEmpty()) {
            throw new IllegalStateException("CONFIG_DB_PASSWORD is not set");
        }
        return pwd;
    }
}
```

Why This Matters In Real Systems

- Environment variables enable immutable deployment pipelines: the same code artifact can run in dev, test, stage, and prod with environment-specific behavior.
- Secrets and credentials should not live in source trees; use environment variables, secret managers, or Kubernetes Secrets/ConfigMaps to inject them at runtime.
- Config layering (defaults, config file, environment override) helps with portability and disaster recovery. A well-defined precedence (env over file) aligns with 12-factor app principles.
- In production, you’ll combine this with structured logging, profiles, and feature flags, but the basics of config loading remain foundational.
- When running in containers or serverless environments, config is often supplied via environment variables or mounted config files; your code should gracefully handle missing values and provide safe defaults or fail fast with a clear message.

Y. Why This Matters In Real Systems — Production context and real usage

- Deploy-time flexibility: You can adjust port, host, database endpoints, or log levels without rebuilding the app.
- Multi-environment parity: The same code path behaves consistently because config sources are externalized.
- Secrets hygiene: Move sensitive values out of code; use environment variables or secret stores. In Kubernetes, you’d mount ConfigMaps/Secrets as environment variables or volume-mapped files.
- Observability impact: Config values often influence logging levels and feature flags; centralizing config loading helps trace how a server is configured in production.

Z. Study Questions — 5 recall questions

1) What is the advantage of preferring environment variables over properties files in production deployments?
2) How can you implement a precedence rule where environment variables override values from a properties file?
3) Why should secrets (like database passwords) not be stored in source code?
4) What Java API would you use to read a simple key-value config file at startup?
5) How would you extend a Java web server to automatically reload configuration when the config file changes?

Exercise — a practical multi-part coding challenge

Part A: Create a minimal config system
- Create a config.properties file with keys for host, port, db.url, db.user, db.password, log.level.
- Implement Config, ConfigLoader (as shown in sections above) that loads values from config.properties and allows environment variable overrides (CONFIG_HOST, CONFIG_PORT, etc.).
- Build a small Java class that prints the resolved configuration (host, port, db.url, log.level).

Part B: Boot a tiny web server using the config
- Extend RunServerWithConfig.java (or reuse WebServerLauncher.java) to start an HttpServer bound to the resolved host/port and respond with a JSON-like snippet showing config values.
- Ensure the server prints a startup log that includes the chosen host and port.

Part C (Optional, for deeper learning): Implement a simple config file watcher
- Use java.nio.file.WatchService to listen for modifications to config.properties.
- On change, reload the properties, apply the new values via the loader, and print a log line indicating the config was reloaded.
- Update the server to reflect the new port or host at runtime (note: actual binding changes require more orchestration; demonstrate by reloading non-binding values and logging the updated settings).

- Deliverables:
  - config.properties sample
  - Config.java, ConfigLoader.java, and WebServerLauncher.java (or RunServerWithConfig.java) with build/run instructions
  - Optional WatchService-based config reloader snippet
  - A one-page summary of how to apply this in a containerized or cloud environment

End-to-end you should be able to:
- Run a tiny Java HTTP server that reads its host/port from environment variables and a properties file, with env vars taking precedence.
- Demonstrate how to update configuration without code changes by adjusting environment values or the config.properties file.
- Understand common pitfalls and how to avoid them in real systems.