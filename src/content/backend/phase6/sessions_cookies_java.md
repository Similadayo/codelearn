# Sessions & Cookies — Stateful Auth in Java

Stateful authentication relies on server-side session state coupled with a client-side cookie to identify the user across requests. In Java backends, the Servlet API provides HttpSession (often via HttpServletRequest.getSession) and the container automatically issues a JSESSIONID cookie to pair with that session. This lesson covers how to implement, secure, and scale stateful sessions in Java—from basic HttpSession usage to distributed session stores (e.g., Redis with Spring Session), and common pitfalls you’ll encounter in production systems.

## 1. Understanding the Basics: HttpSession and JSESSIONID

In a traditional stateful login flow, the server authenticates a user, creates an HttpSession, and stores the user identity in the session. The browser receives a JSESSIONID cookie and sends it with subsequent requests, allowing the server to locate the session and recognize the user.

Code: Simple login/logout/protected flow using HttpSession (Servlet API)

```java
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class LoginServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        if (authenticate(username, password)) {
            HttpSession session = req.getSession(true); // create or reuse
            session.setAttribute("user", username);       // store identity
            // Rotate session ID to mitigate session fixation
            req.changeSessionId();
            resp.getWriter().write("Logged in as " + username);
        } else {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("Invalid credentials");
        }
    }

    private boolean authenticate(String u, String p) {
        // Dummy check for illustration
        return "admin".equals(u) && "secret".equals(p);
    }
}
```

```java
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class LogoutServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false); // don't create if missing
        if (session != null) {
            session.invalidate(); // end the session
        }
        resp.getWriter().write("Logged out");
    }
}
```

```java
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class ProtectedResourceServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("Unauthorized");
            return;
        }
        String user = (String) session.getAttribute("user");
        resp.getWriter().write("Hello, " + user);
    }
}
```

### Line-by-line explanation

- import statements: bring in necessary Servlet API classes.
- LoginServlet.doPost: reads credentials from the request; authenticates; if valid, creates/gets the session, stores user identity, rotates the session ID, and responds with a success message.
- authenticate(...): simple helper for credential check (replace with real logic).
- LogoutServlet.doPost: obtains the existing session (without creating a new one); invalidates it if present; responds accordingly.
- ProtectedResourceServlet.doGet: checks for an existing session and a non-null user attribute; if present, serves a protected resource; otherwise responds with 401.
- HttpSession usage: session attributes (e.g., "user") are server-side state, mapped to the client via the session cookie.
- req.changeSessionId(): mitigates session fixation by issuing a new session ID after authentication.
- JSESSIONID cookie: automatically managed by the container; the browser sends it on subsequent requests.

## 2. Managing HttpSession Lifecycle and Security

Beyond basic usage, you must manage session lifecycle and cookie security to minimize risk (session fixation, leakage, and idle timeout). Here are practical patterns and code samples.

Code A: Configuring session timeout and rotation on login

```java
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class LoginServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        if (authenticate(username, password)) {
            HttpSession session = req.getSession(true); // create session if absent
            // Set a fixed inactivity timeout (15 minutes)
            session.setMaxInactiveInterval(15 * 60);
            session.setAttribute("user", username);
            // Rotate session ID to mitigate fixation
            req.changeSessionId();
            resp.getWriter().write("Logged in as " + username);
        } else {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("Invalid credentials");
        }
    }

    private boolean authenticate(String u, String p) {
        return "admin".equals(u) && "secret".equals(p);
    }
}
```

Code B: Web.xml (or container config) for secure, HttpOnly cookies and SameSite

```xml
<!-- web.xml -->
<web-app ...>
  <session-config>
    <cookie-config>
      <http-only>true</http-only>
      <secure>true</secure>
      <name>JSESSIONID</name>
      <!-- Note: Some containers support SameSite via this tag; others require server-specific config -->
      <same-site>Strict</same-site>
    </cookie-config>
  </session-config>
</web-app>
```

Code C: Programmatic approach to ensure cookies are HttpOnly/Secure when needed (less common for JSESSIONID, but useful for custom cookies)

```java
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;

public class CookieUtil {
    public static void addSecureSessionCookie(HttpServletResponse resp, String value) {
        Cookie c = new Cookie("JSESSIONID", value);
        c.setPath("/");
        c.setHttpOnly(true);
        c.setSecure(true);
        // Not all containers honor SameSite in Cookie API; see server docs
        c.setSecure(true);
        resp.addCookie(c);
        // For SameSite, you may need a response header:
        // resp.setHeader("Set-Cookie", "JSESSIONID=" + value + "; HttpOnly; Secure; SameSite=Strict");
    }
}
```

### Line-by-line explanation

- Code A: LoginServlet sets a fixed idle timeout via setMaxInactiveInterval and rotates the session ID after authentication to prevent fixation. It stores a minimal identity and responds accordingly.
- Code B: web.xml cookie-config sets HttpOnly and Secure flags and configures cookie name; SameSite is expressed if supported by the container.
- Code C: Demonstrates a manual approach to configuring cookies when you control cookie creation (generally not required for JSESSIONID, as the container handles it). Adds cookie with HttpOnly and Secure, and hints at SameSite handling via header.

Security notes:
- HttpOnly prevents JavaScript access to cookies, reducing XSS risk.
- Secure ensures cookies are sent only over HTTPS.
- SameSite helps mitigate CSRF; prefer Strict or Lax depending on application flow.
- Always rotate session IDs after login and on privilege escalation.

## 3. Stateful Sessions in Distributed Systems: Redis-backed Sessions with Spring Session

When scaling to multiple application servers, a single in-memory session store is insufficient. Spring Session (with Redis) lets you back HttpSession by Redis, enabling sticky or stateless load balancers to still leverage server-side sessions consistently.

Code: Minimal Spring configuration for Redis-backed HTTP sessions

```java
// build.gradle (or pom.xml) dependencies
// annotation markers assume Spring Boot environment
/*
dependencies {
  implementation("org.springframework.session:spring-session-data-redis")
  implementation("org.redis:lettuce-core") // or jedis, depending on choice
}
*/
```

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;

@Configuration
@EnableRedisHttpSession // enables Redis-backed HTTP session
public class HttpSessionConfig {

    // Example: if you rely on auto-configuration, you can omit explicit beans
    // The following bean demonstrates a Redis connection factory (adjust for your stack)
    @Bean
    public StatefulRedisConnection<String, String> redisConnection() {
        RedisClient client = RedisClient.create("redis://localhost:6379");
        return client.connect();
    }
}
```

application.properties (Spring Boot)

```
spring.session.store-type=redis
spring.redis.host=localhost
spring.redis.port=6379
```

Notes:
- Dependency: spring-session-data-redis (and a Redis client like lettuce or jedis).
- Redis stores the session data; your app servers only participate in exchanging session IDs.
- You can tune TTLs, eviction policies, and cluster Redis for high availability.

### Line-by-line explanation

- @EnableRedisHttpSession: switches the HTTP session mechanism from in-memory to Redis-backed store.
- The Redis connection bean (optional in many setups) demonstrates how you might wire a Redis client; in many Boot setups, you rely on auto-configuration for the connection.
- application.properties: directs Spring Session to use Redis as the backing store and configures Redis host/port.
- The behavior: HttpSession#getId() persists across requests via a cookie managed by the container, which now points to Redis-backed storage.

Security considerations for distributed sessions:
- Ensure your Redis cluster is secured (TLS, authentication).
- Implement appropriate TTLs to avoid unbounded growth.
- Consider session fixation defenses (rotate IDs on login) still apply when using Redis.

## 4. Practical End-to-End Flow: Login → Protected Resource → Logout

This section ties together login, session usage, and protected resources, plus an example filter to guard endpoints.

Code: End-to-end flow with a simple authentication filter and a protected endpoint

```java
import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.IOException;

// Lightweight login endpoint
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        if (authenticate(username, password)) {
            HttpSession session = req.getSession(true);
            session.setAttribute("user", username);
            req.changeSessionId();
            // Optionally set max inactive interval here
            resp.getWriter().write("OK");
        } else {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("Auth failed");
        }
    }

    private boolean authenticate(String u, String p) {
        return "admin".equals(u) && "secret".equals(p);
    }
}

// Protected resource example
@WebServlet("/api/protected/profile")
public class ProtectedProfileServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("Unauthorized");
            return;
        }
        String user = (String) s.getAttribute("user");
        resp.getWriter().write("Profile for " + user);
    }
}

// Simple logout
@WebServlet("/logout")
public class LogoutServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s != null) {
            s.invalidate();
        }
        resp.getWriter().write("Logged out");
    }
}

// Optional: a filter to guard all /api/protected/* endpoints
@WebFilter("/api/protected/*")
public class AuthFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpSession s = req.getSession(false);
        if (s != null && s.getAttribute("user") != null) {
            chain.doFilter(request, response);
            return;
        }
        HttpServletResponse resp = (HttpServletResponse) response;
        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        resp.getWriter().write("Unauthorized");
    }
}
```

CSRF token reminder (optional in Stateful Apps):
- When using stateful cookies, consider CSRF protection for state-changing actions (POST/PUT/DELETE). A simple server-side token in the session helps validate incoming requests.

```java
// CSRF token generation in a session (and including in a form)
HttpSession session = req.getSession(true);
String token = (String) session.getAttribute("CSRF_TOKEN");
if (token == null) {
    token = java.util.UUID.randomUUID().toString();
    session.setAttribute("CSRF_TOKEN", token);
}
req.setAttribute("csrfToken", token);
```

Line-by-line explanation:
- WebServlets and WebFilter demonstrate an end-to-end protected path: login issues a session, the filter guards /api/protected/*, and logout ends the session.
- doFilter logic ensures only authenticated sessions proceed; otherwise, you return 401.
- CSRF token generation stores a per-session token; forms should include this token and the server should validate it on state-changing requests.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Storing large or sensitive user objects in the session
  - Bad:
    ```java
    session.setAttribute("userFullObject", userObject); // large object + sensitive data
    ```
  - Good:
    ```java
    session.setAttribute("userId", userObject.getId()); // small, non-sensitive identifier
    ```
  - Why it matters: preserves memory per session, reduces risk of exposing data if session hijacked, and keeps session serialization lightweight.

- Pitfall 2: Not rotating session ID on login (session fixation risk)
  - Bad:
    ```java
    HttpSession s = req.getSession(true);
    s.setAttribute("user", username);
    ```
  - Good:
    ```java
    HttpSession s = req.getSession(true);
    s.setAttribute("user", username);
    req.changeSessionId(); // rotate after login
    ```
  - Why it matters: prevents an attacker from hijacking an existing session by forcing a new session ID post-authentication.

- Pitfall 3: Insecure cookies (missing HttpOnly, Secure, or SameSite)
  - Bad:
    ```java
    Cookie c = new Cookie("JSESSIONID", session.getId());
    // no HttpOnly, no Secure
    response.addCookie(c);
    ```
  - Good:
    ```java
    Cookie c = new Cookie("JSESSIONID", session.getId());
    c.setHttpOnly(true);
    c.setSecure(true);
    c.setPath("/");
    response.addCookie(c);
    // SameSite often configured via server/container
    ```
  - Why it matters: mitigates XSS (HttpOnly) and ensures cookies are not sent over insecure channels (Secure); SameSite reduces CSRF risk.

- Pitfall 4: Failing to invalidate sessions on logout
  - Bad:
    ```java
    // logout but no invalidation
    response.getWriter().write("Logged out");
    ```
  - Good:
    ```java
    HttpSession s = req.getSession(false);
    if (s != null) s.invalidate();
    response.getWriter().write("Logged out");
    ```
  - Why it matters: once a user logs out, the server must terminate the session to prevent reuse.

- Pitfall 5: Not planning for distributed sessions (no Redis or JDBC store)
  - Bad: rely on in-memory HttpSession in a multi-node environment.
  - Good: adopt a distributed session store (e.g., Redis with Spring Session) and align TTLs with security requirements.

## Y. Why This Matters In Real Systems — production context and real usage

- Stateless vs. stateful tradeoffs: Stateless tokens (e.g., JWT) scale easily but have limitations (revocation, immediate logout, multi-tenant token invalidation). Stateful sessions are straightforward for access control, audit, and per-user data but require careful scaling strategies.
- Scaling sessions: On multiple app servers, in-memory session storage breaks if a user lands on a different server. Redis-backed sessions (Spring Session) provide a centralized store that all instances share.
- Security posture: Always rotate IDs on login, set HttpOnly/Secure cookies, implement SameSite, set appropriate session timeouts, and invalidate on logout. Consider CSRF protections for state-changing requests.
- Operational concerns: TTLs must balance user convenience and security; monitor Redis memory usage; implement robust disaster recovery for session stores; ensure proper access controls to session data.
- Real-world patterns: Use a combination of production-grade session stores (Redis) with proper connection pooling, health checks, and metrics. For high-security apps, add CSRF tokens, intermittent cookie migrations, and periodic security reviews.

## Z. Study Questions — 5 recall questions

1. What is the purpose of the HttpSession in Java backends, and how does the browser typically pair with it?
2. Why is session ID rotation on login important, and which Servlet API method is commonly used for this?
3. How do HttpOnly and Secure cookie flags mitigate common web security risks?
4. What changes when you switch from in-memory HttpSession to Redis-backed sessions with Spring Session?
5. Name at least two common production concerns when deploying stateful sessions at scale.

## Exercise — a practical multi-part coding challenge

Part A: Build a minimal servlet app with HttpSession
- Implement LoginServlet, ProtectedResourceServlet, LogoutServlet as shown in Section 1.
- Ensure login rotates the session ID and uses a 15-minute idle timeout.

Part B: Harden cookie security and session lifecycle
- Configure HttpOnly and Secure on the JSESSIONID cookie (via web.xml or server config).
- Add a logout path that invalidates the session.
- Ensure protected resources respond with 401 when not authenticated.

Part C: Prepare for distributed sessions with Redis (Spring)
- Add Spring Session dependencies (spring-session-data-redis) to your project.
- Enable Redis-backed HTTP sessions with @EnableRedisHttpSession.
- Configure Redis connection (host/port) and the desired TTL via properties (e.g., spring.session.store-type=redis, spring.redis.*).
- Run a local Redis instance and verify that multiple app instances share the session state.

Part D: Add a minimal CSRF protection layer (optional, recommended for state-changing actions)
- Generate a per-session CSRF token and include it in state-changing requests (POST) and verify on server-side.
- Demonstrate how your LoginServlet, LogoutServlet, and ProtectedResourceServlet interact with the CSRF token flow.

Deliverables:
- Source files for the servlets (LoginServlet, LogoutServlet, ProtectedResourceServlet, AuthFilter if used).
- web.xml or equivalent server configuration showing secure cookie settings.
- If using Spring: a small configuration class for Redis-backed sessions and application.properties entries.
- A short README describing how to run locally (Java version, server, Redis, URLs to test login, access protected endpoints, logout).

This lesson equips you to design, implement, and secure stateful authentication with sessions in Java, covering both traditional Servlet-based apps and distributed deployments.