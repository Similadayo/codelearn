# Track: Backend Engineering — Phase 6: Authentication & Security

Security in backend systems is not optional: it protects data, users, and services from malicious actors and helps maintain trust and compliance. This lesson focuses on four core defense-in-depth techniques in Java backends: preventing SQL Injection (SQLi), mitigating Cross-Site Scripting (XSS), defending against Cross-Site Request Forgery (CSRF), and implementing effective rate limiting. You’ll see concrete Java code examples (JDBC-based and Servlet-based) that illustrate bad vs good practices, along with explanations, production context, and hands-on exercises.

## 1. SQL Injection (SQLi) — Safe Database Access in Java

SQL injection is one of the most common attack vectors against backends. It occurs when user-controlled input is concatenated into SQL queries, allowing attackers to alter query logic. The safe pattern in Java uses parameterized queries with PreparedStatement to separate code from data.

### Vulnerable: SQL concatenation with Statement
```java
import java.sql.*;

public class UserRepositoryVulnerable {
  private final DataSource ds;

  public UserRepositoryVulnerable(DataSource ds) {
    this.ds = ds;
  }

  public boolean userExists(String username) throws SQLException {
    try (Connection conn = ds.getConnection();
         Statement stmt = conn.createStatement()) {

      // Vulnerable: user-controlled input is concatenated into SQL
      String sql = "SELECT 1 FROM users WHERE username = '" + username + "'";
      try (ResultSet rs = stmt.executeQuery(sql)) {
        return rs.next();
      }
    }
  }
}
```

### Secure: Parameterized query with PreparedStatement
```java
import java.sql.*;

public class UserRepositorySecure {
  private final DataSource ds;

  public UserRepositorySecure(DataSource ds) {
    this.ds = ds;
  }

  public boolean userExists(String username) throws SQLException {
    String sql = "SELECT 1 FROM users WHERE username = ?";
    try (Connection conn = ds.getConnection();
         PreparedStatement ps = conn.prepareStatement(sql)) {

      // Bind user input safely; driver handles escaping/typing
      ps.setString(1, username);
      try (ResultSet rs = ps.executeQuery()) {
        return rs.next();
      }
    }
  }
}
```

### Line-by-line explanation
- Vulnerable version:
  - Import JDBC classes and hold a DataSource for connections.
  - In constructor, store the DataSource.
  - userExists opens a connection, creates a Statement, and builds SQL by concatenating the username.
  - The resulting SQL becomes part of the query logic, enabling SQLi if username includes SQL syntax.
  - Executes the query and returns true if a row exists.
- Secure version:
  - Use a parameterized SQL string with a question mark placeholder.
  - Acquire a connection and prepare a PreparedStatement with the SQL.
  - Bind the username with setString; the driver escapes data properly.
  - Execute the query and return whether a row exists.
  - Try-with-resources ensures all JDBC resources are closed deterministically.

### Line-by-line takeaway
- Always prefer PreparedStatement over Statement when incorporating user input.
- Parameter binding ensures data is treated as data, not executable code.
- Use try-with-resources to avoid resource leaks and ensure proper cleanup.

## 2. Cross-Site Scripting (XSS) — Safe Rendering of User Input

XSS occurs when user-supplied content is embedded into HTML without escaping, allowing attackers to inject scripts. The remedy is to escape user input at render time and, preferably, to use templating engines that automatically escape variables.

### Vulnerable: Directly echoing user input into HTML
```java
import java.io.IOException;
import javax.servlet.http.*;

public class XSSVulnerableServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String user = req.getParameter("user"); // user-controlled input
    resp.setContentType("text/html");
    resp.getWriter().println("<html><body>");
    resp.getWriter().println("<h1>Welcome " + user + "</h1>"); // vulnerable
    resp.getWriter().println("</body></html>");
  }
}
```

### Secure: HTML escaping utility and usage
```java
public final class HtmlUtils {
  private HtmlUtils() {}

  public static String escapeHtml(String s) {
    if (s == null) return "";
    return s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;");
  }
}
```

```java
import java.io.IOException;
import javax.servlet.http.*;

public class XSSSecureServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String user = req.getParameter("user");
    String safeUser = HtmlUtils.escapeHtml(user);
    resp.setContentType("text/html");
    resp.getWriter().println("<html><body>");
    resp.getWriter().println("<h1>Welcome " + safeUser + "</h1>");
    resp.getWriter().println("</body></html>");
  }
}
```

### Line-by-line explanation
- Vulnerable servlet:
  - Reads a user-supplied parameter and writes it directly into the HTML response.
  - If the user includes HTML/JS, it will be interpreted by the browser, enabling XSS.
- HtmlUtils.escapeHtml:
  - Replaces special characters with their HTML entities to neutralize injected markup.
- Secure servlet:
  - Escapes the user input before embedding it in HTML.
  - Ensures the page renders content as text, not executable markup.

### Line-by-line takeaway
- Escape all user-provided content before rendering in HTML.
- Prefer templating engines or frameworks that provide auto-escaping.
- Avoid manual string concatenation when generating HTML with user data.

## 3. Cross-Site Request Forgery (CSRF) — Protecting State-Changing Requests

CSRF tricks authenticated users into performing unwanted actions. The standard defense is to require a CSRF token for state-changing requests (usually POST). The token is tied to the user session and validated on the server.

### Vulnerable: POST handling without CSRF protection
```java
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;

public class CSRFUnsafeSubmitServlet extends HttpServlet {
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String data = req.getParameter("data");
    // Process data without CSRF protection
    // e.g., update user profile, perform action
    resp.getWriter().write("Processed: " + data);
  }
}
```

### Secure: CSRF token flow in a servlet-based app
```java
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.UUID;

public class CSRFProtectedServlet extends HttpServlet {

  private static final String CSRF_TOKEN_KEY = "CSRF_TOKEN";

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    HttpSession session = req.getSession(true);
    String token = UUID.randomUUID().toString();
    session.setAttribute(CSRF_TOKEN_KEY, token);

    resp.setContentType("text/html");
    resp.getWriter().println("<html><body>");
    resp.getWriter().println("<form method='post' action='/submit'>");
    resp.getWriter().println("<input type='hidden' name='csrf_token' value='" + token + "'/>");
    resp.getWriter().println("<input type='text' name='data'/>");
    resp.getWriter().println("<input type='submit' value='Submit'/>");
    resp.getWriter().println("</form>");
    resp.getWriter().println("</body></html>");
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    HttpSession session = req.getSession(false);
    String sessionToken = session != null ? (String) session.getAttribute(CSRF_TOKEN_KEY) : null;
    String formToken = req.getParameter("csrf_token");

    // Validate CSRF token
    if (sessionToken == null || formToken == null || !sessionToken.equals(formToken)) {
      resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
      resp.getWriter().write("CSRF validation failed");
      return;
    }

    // Rotate the token to mitigate reuse
    String newToken = UUID.randomUUID().toString();
    if (session != null) {
      session.setAttribute(CSRF_TOKEN_KEY, newToken);
    }

    String data = req.getParameter("data");
    // Process data securely
    resp.getWriter().write("Processed securely: " + HtmlUtils.escapeHtml(data));
  }
}
```

### Line-by-line explanation
- doGet:
  - Creates or retrieves the user session and generates a new CSRF token.
  - Stores the token in the session and embeds it as a hidden field in the form.
- doPost:
  - Retrieves the token from both the session and the form.
  - Validates that both tokens exist and match; otherwise rejects the request.
  - Rotates the token to prevent reuse and improves security.
  - Processes the submitted data only after CSRF validation.
- Why rotation matters: re-issuing a new token after each successful state-changing request reduces risk from token leakage or replay.

### Line-by-line takeaway
- Always require a CSRF token for state-changing requests (POST/PUT/DELETE).
- Bind the token to the user session; validate on server-side POSTs.
- Rotate/refresh tokens after successful use to minimize replay risk.
- Consider SameSite cookies and framework-provided CSRF features for stronger defaults.

## 4. Rate Limiting — Throttling to Protect Resources

Rate limiting helps prevent abuse (brute force, credential stuffing, DoS). A simple approach is per-IP throttling using in-memory data structures. For real systems, consider distributed stores (Redis, API gateways) and fuzzier time windows.

### Simple naive per-IP rate limiter
```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class SimpleRateLimiter {
  private final long windowMs;
  private final int maxRequests;
  private final Map<String, Window> calls = new ConcurrentHashMap<>();

  public SimpleRateLimiter(int maxRequests, long windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public boolean allow(String key) {
    long now = System.currentTimeMillis();
    Window w = calls.computeIfAbsent(key, k -> new Window(now, 0));
    synchronized (w) {
      if (now - w.start > windowMs) {
        w.start = now;
        w.count = 0;
      }
      if (w.count < maxRequests) {
        w.count++;
        return true;
      } else {
        return false;
      }
    }
  }

  private static class Window {
    long start;
    int count;
    Window(long start, int count) { this.start = start; this.count = count; }
  }
}
```

```java
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;

public class RateLimitFilter implements Filter {
  private SimpleRateLimiter limiter;

  @Override
  public void init(FilterConfig cfg) {
    // Example: 10 requests per second per IP
    limiter = new SimpleRateLimiter(10, 1000);
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String ip = request.getRemoteAddr();

    if (!limiter.allow(ip)) {
      response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
      response.getWriter().write("Rate limit exceeded");
      return;
    }

    chain.doFilter(req, res);
  }

  @Override
  public void destroy() {}
}
```

### More robust: Token Bucket per IP (sliding behavior)
```java
import java.util.concurrent.ConcurrentHashMap;

public class TokenBucketRateLimiter {
  private final double capacity;
  private final double refillPerMs;
  private final ConcurrentHashMap<String, TokenBucket> buckets = new ConcurrentHashMap<>();

  public TokenBucketRateLimiter(double capacity, double refillPerSec) {
    this.capacity = capacity;
    this.refillPerMs = refillPerSec / 1000.0;
  }

  public boolean allow(String key) {
    long now = System.currentTimeMillis();
    TokenBucket bucket = buckets.computeIfAbsent(key,
        k -> new TokenBucket(capacity, refillPerMs, now));
    return bucket.tryConsume(now);
  }

  private static class TokenBucket {
    double tokens;
    final double capacity;
    final double refillPerMs;
    long lastRefill;

    TokenBucket(double capacity, double refillPerMs, long now) {
      this.capacity = capacity;
      this.refillPerMs = refillPerMs;
      this.tokens = capacity;
      this.lastRefill = now;
    }

    synchronized boolean tryConsume(long now) {
      long delta = now - lastRefill;
      if (delta > 0) {
        tokens = Math.min(capacity, tokens + delta * refillPerMs);
        lastRefill = now;
      }
      if (tokens >= 1.0) {
        tokens -= 1.0;
        return true;
      }
      return false;
    }
  }
}
```

```java
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;

public class BucketRateLimitFilter implements Filter {
  private TokenBucketRateLimiter limiter;

  @Override
  public void init(FilterConfig cfg) {
    // Example: capacity 100 tokens, refill ~100 tokens/sec
    limiter = new TokenBucketRateLimiter(100.0, 100.0);
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String ip = request.getRemoteAddr();

    if (!limiter.allow(ip)) {
      response.setStatus(429);
      response.getWriter().write("Rate limit exceeded");
      return;
    }

    chain.doFilter(req, res);
  }

  @Override
  public void destroy() {}
}
```

### Line-by-line explanation
- SimpleRateLimiter:
  - Maintains a per-key time window with a maximum count.
  - allow() checks if the current window has capacity; if not, request is rejected.
  - Window is reset when the time window elapses.
- RateLimitFilter:
  - Applies the limiter per client IP for incoming requests.
  - Returns 429 when the limit is reached.
- TokenBucketRateLimiter (advanced):
  - Each client gets a bucket of tokens that refills over time.
  - tryConsume() refills tokens based on elapsed time and consumes one if available.
  - Buckets are stored per client in a concurrent map for thread safety.
- BucketRateLimitFilter:
  - Uses the token bucket limiter to throttle traffic and return 429 when saturated.

### Line-by-line takeaway
- Start with a simple windowed rate limiter; it is easy to reason about but has edge-case drift.
- For higher traffic and distributed systems, prefer a shared store (Redis) or an API gateway with built-in rate limiting.
- Always provide meaningful responses (e.g., 429 Too Many Requests) and avoid leaking internal metrics.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- SQLi Pitfall 1: Concatenating user input into SQL versus parameter binding
  - Bad:
    ```java
    String sql = "SELECT * FROM users WHERE username='" + username + "'";
    Statement stmt = conn.createStatement();
    ```
  - Good:
    ```java
    String sql = "SELECT * FROM users WHERE username = ?";
    PreparedStatement ps = conn.prepareStatement(sql);
    ps.setString(1, username);
    ```
- XSS Pitfall 2: Rendering user input without escaping
  - Bad:
    ```java
    out.println("<div>" + userInput + "</div>");
    ```
  - Good:
    ```java
    String safe = HtmlUtils.escapeHtml(userInput);
    out.println("<div>" + safe + "</div>");
    ```
- CSRF Pitfall 3: Accepting GET/POST requests for state-changing actions without tokens
  - Bad:
    ```java
    // POST /update with data, no CSRF token
    ```
  - Good:
    ```java
    // Include CSRF token in form and verify on POST
    ```
- Rate Limiting Pitfall 4: In-memory counters without expiration in multi-instance deployments
  - Bad:
    ```java
    Map<String, Integer> counts = new HashMap<>();
    counts.put(ip, counts.getOrDefault(ip, 0) + 1);
    ```
  - Good:
    ```java
    // Per-IP sliding window or token bucket with distributed store (Redis)
    ```
- Additional note:
  - Relying on client-side controls (e.g., UI disables) for security is weak; enforce on server-side.
  - Always verify and log security events; never assume trust based on user input or headers alone.

## Y. Why This Matters In Real Systems — Production Context

- Security crimes are frequent and costly: data breaches, regulatory penalties, service outages, and reputational damage.
- Defense in depth: combine secure SQL access, output encoding, CSRF protection, and rate limiting to reduce risk across attack surfaces.
- Production considerations:
  - Use prepared statements by default; audit codebase for dynamic SQL.
  - Centralize HTML escaping (prefer framework templating with auto-escaping).
  - Implement CSRF protection consistently across all session-based endpoints; consider framework defaults (e.g., Spring Security CSRF).
  - Apply rate limiting at the edge (API gateway, CDN, or reverse proxy) for scale and reliability; supplement with in-app limits as needed.
  - Use logging and monitoring to detect anomalies (SQLi patterns, XSS payloads, failed CSRF attempts, burst traffic).
  - Regularly test with automated security tests (static analysis, dynamic tests, fuzzing).

## Z. Study Questions — 5 Recall Questions

1. What is the primary difference between String concatenation in SQL queries and parameterized queries via PreparedStatement in Java?
2. How does HTML escaping prevent XSS, and why is it preferable to rely on a templating engine’s escaping?
3. What is a CSRF token, and how is it typically used in a web app’s form submission flow?
4. Describe two approaches to rate limiting and a brief advantage of each.
5. Why is it important to rotate CSRF tokens after a successful state-changing action?

## Exercise — Practical multi-part coding challenge

Complete the following tasks to build a small, secure backend module (Java, Servlet/JDBC-based). You can assume a simple in-memory H2 database or a mock DataSource.

Part A — Safe UserDAO
- Implement a UserDAO (data access object) with a safe method to check if a username exists using PreparedStatement.
- Include proper resource handling (try-with-resources) and basic error handling.
- Provide unit-test-like sample usage demonstrating safe usage.

Part B — XSS-Safe Rendering
- Add a small servlet that reads a query parameter and renders a greeting.
- Ensure the output is escaped using HtmlUtils.escapeHtml before writing to the response.
- Include a brief note on how to extend this to templates.

Part C — CSRF-Protected Form
- Create a CSRF-protected servlet flow:
  - doGet renders a form with a CSRF token embedded.
  - doPost validates the token, rotates it, and processes the data.
- Demonstrate how to rotate the token after successful validation.

Part D — Rate Limiting
- Implement a simple per-IP rate limiter (either SimpleRateLimiter or TokenBucketRateLimiter) and apply it in a servlet filter.
- Demonstrate a test scenario: simulate multiple requests from one IP and show that after the limit is reached, further requests are rejected with HTTP 429.

Part E — End-to-End Demo Plan
- Outline a minimal testing plan that demonstrates:
  - SQLi prevention via prepared statements
  - XSS protection via escaping
  - CSRF protection via token validation
  - Rate limiting deployment checks (edge vs internal)
- Include quick manual test steps and expected outcomes.

Note: If you’re using a framework like Spring Boot, you can adapt the patterns shown here to Spring components (JdbcTemplate or JPA with parameter binding, Spring Security CSRF defaults, and WebMvcConfigurer for interceptors/filters). The core ideas—avoid string concatenation for SQL, encode/escape output, protect state-changing actions with tokens, and throttle abusive requests—remain the same across stacks.