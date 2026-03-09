# JWT — Stateless Authentication (Java) | Phase 6 — Authentication & Security

Stateless authentication with JSON Web Tokens (JWT) lets backend services verify user identity without maintaining server-side sessions. In Java, you sign a token with a secret (HS256) or a private key (RS256) and include claims like user id, roles, and expiry. The client sends the token with each request, typically in the Authorization header. This approach scales well for microservices and cloud deployments, but requires careful handling of secrets, token revocation, expiry, and secure transport.

---

## 1. JWT Structure and Core Concepts

- What JWT is: a compact, URL-safe token consisting of three parts: header, payload (claims), and signature.
- Why stateless: servers don’t store session data; token carries identity and authorization claims.
- Common design decisions: signing algorithm (HS256 vs RS256), token expiry, issuer/audience checks, and how to rotate keys.

Code: JwtUtil — token generation and validation (using jjwt)

```java
package com.example.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.util.Date;
import java.util.Map;

public class JwtUtil {
    // In production, fetch this from a secure secret manager or env var
    private static final String SECRET_KEY = System.getenv("JWT_SECRET");
    private static final long EXPIRATION_MS = 3600_000; // 1 hour

    public static String generateToken(String subject, Map<String, Object> claims) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + EXPIRATION_MS))
                .signWith(SignatureAlgorithm.HS256, SECRET_KEY.getBytes())
                .compact();
    }

    public static Claims parseToken(String token) {
        Jws<Claims> jws = Jwts.parser()
                .setSigningKey(SECRET_KEY.getBytes())
                .parseClaimsJws(token);
        return jws.getBody();
    }

    public static boolean isTokenValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (Exception e) {
            // Token invalid: signature, expiry, or structure issue
            return false;
        }
    }
}
```

### Line-by-line explanation
- package com.example.auth; — Declares the package for organization.
- import statements — Bring in jjwt types and Java utilities used below.
- public class JwtUtil — Utility class for JWT operations.
- SECRET_KEY — Secret for HS256; in production read securely, not hard-coded.
- EXPIRATION_MS — Token lifetime (1 hour here).
- generateToken(...) — Builds a JWT:
  - current time → issuedAt
  - expiration → setExpiration
  - setSubject(subject) → identity
  - setClaims(claims) → additional data
  - signWith(HS256) → create signature
  - compact() → string token
- parseToken(...) — Validates and parses a token, returning claims if valid.
- isTokenValid(...) — Convenience wrapper to catch any parsing/validation errors.

---

## 2. Generating and Validating Tokens in a Web Context

A simple login flow Issues a JWT after successful credentials, and a utility validates incoming tokens.

Code: AuthServlet — login flow issuing JWT

```java
package com.example.auth;

import javax.servlet.ServletException;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class AuthServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        if (authenticate(username, password)) {
            Map<String, Object> claims = new HashMap<>();
            claims.put("roles", "USER"); // or roles list
            String token = JwtUtil.generateToken(username, claims);

            resp.setContentType("application/json");
            resp.getWriter().write("{\"token\":\"" + token + "\"}");
        } else {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"error\":\"invalid credentials\"}");
        }
    }

    // Very small in-memory check; replace with real user store in production
    private boolean authenticate(String user, String pass) {
        return "alice".equals(user) && "s3cret".equals(pass);
    }
}
```

### Line-by-line explanation
- package and imports — standard servlet setup.
- public class AuthServlet extends HttpServlet — defines an HTTP endpoint for authentication.
- doPost — handles login requests.
- username/password extraction — reads credentials from the request.
- authenticate(...) — simple credential check; replace with DB lookup in real apps.
- If valid:
  - claims map creation (e.g., roles).
  - JwtUtil.generateToken(...) to create a signed JWT.
  - write JSON response containing the token.
- If invalid:
  - set 401 status and return an error message.

Code: JwtValidationExample — validating incoming token (standalone)

```java
package com.example.auth;

import io.jsonwebtoken.Claims;

public class JwtValidationExample {

    public static boolean validate(String token) {
        if (token == null || token.isEmpty()) return false;
        try {
            Claims claims = JwtUtil.parseToken(token);
            // Optional: check issuer, audience, or other claims
            String user = claims.getSubject();
            return user != null && !user.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }
}
```

### Line-by-line explanation
- public class JwtValidationExample — demonstrates token validation logic.
- validate(...) — guards against null/empty tokens.
- JwtUtil.parseToken(token) — verifies signature and parses claims.
- Optional extra checks on claims (subject, roles, etc.).
- Returns true if token is valid and contains expected data; false otherwise.

---

## 3. Stateless Authentication in a Web Layer (Servlet Filter)

To enforce stateless authentication across endpoints, implement a filter that validates the JWT from the Authorization header and binds claims to the request context for downstream handlers.

Code: JwtAuthenticationFilter — request filter enforcing JWT

```java
package com.example.auth;

import io.jsonwebtoken.Claims;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.*;
import java.io.IOException;

public class JwtAuthenticationFilter extends javax.servlet.Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = JwtUtil.parseToken(token);
                // Attach claims for later use (e.g., authorization checks)
                request.setAttribute("claims", claims);
                chain.doFilter(req, res);
                return;
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("{\"error\":\"invalid token\"}");
                return;
            }
        } else {
            // No token present
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"missing token\"}");
            return;
        }
    }
}
```

### Line-by-line explanation
- public class JwtAuthenticationFilter extends Filter — creates a servlet filter for JWT checks.
- doFilter(...) — core filter method.
- Extract Authorization header and verify “Bearer ” scheme.
- token = header.substring(7) — strip "Bearer " prefix.
- JwtUtil.parseToken(token) — verify signature and parse claims.
- request.setAttribute("claims", claims) — pass claims downstream without server-side sessions.
- If parsing fails, return 401 with error message.
- If header is missing, return 401 indicating missing token.

Code: SecuredEndpointServlet — example protected resource

```java
package com.example.secure;

import javax.servlet.ServletException;
import javax.servlet.http.*;
import java.io.IOException;

public class SecuredEndpointServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        Object claimsObj = req.getAttribute("claims");
        if (claimsObj instanceof io.jsonwebtoken.Claims) {
            io.jsonwebtoken.Claims claims = (io.jsonwebtoken.Claims) claimsObj;
            String user = claims.getSubject();
            resp.setContentType("text/plain");
            resp.getWriter().write("Hello, " + user + "! You are authorized.");
        } else {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("Unauthorized");
        }
    }
}
```

### Line-by-line explanation
- SecuredEndpointServlet shows how a protected resource can read the pre-attached claims.
- It checks the request attribute "claims" for validity.
- If present, extracts the subject (username) and responds with a personalized message.
- If missing, responds with 401 Unauthorized.

---

## 4. Token Renewal, Revocation, and Security Considerations

Stateless JWTs are great for performance, but token revocation and key rotation are non-trivial.

Key ideas:
- Short-lived access tokens + refresh tokens for long sessions.
- Rotate signing keys and publish a key-id (kid) in the JWT header.
- Implement a revocation strategy (e.g., a token blacklist or a per-user revoke flag) if immediate logout is required.
- Always use HTTPS to protect tokens in transit.
- Consider audience (aud) and issuer (iss) claims to bound the token to a specific service and issuer.

Code: Simple in-memory token revocation (illustrative)

```java
package com.example.auth;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class RevocationStore {
    // In-memory store; replace with a distributed cache / DB in production
    private static final Set<String> REVOKED_TOKENS = Collections.synchronizedSet(new HashSet<>());

    public static void revokeToken(String token) {
        REVOKED_TOKENS.add(token);
    }

    public static boolean isRevoked(String token) {
        return REVOKED_TOKENS.contains(token);
    }
}
```

### Line-by-line explanation
- RevocationStore holds revoked tokens.
- Using a Set backed by a synchronized collection ensures thread safety for simple demos.
- revokeToken adds a token to the blacklist.
- isRevoked checks if a token has been revoked before accepting it as valid.

Code: Refresh token flow (high-level sketch)

```java
package com.example.auth;

import java.util.UUID;

public class RefreshService {
    // In production, tie refresh tokens to user + device, store in DB, and invalidate on logout
    public static String issueRefreshToken(String subject) {
        // Generate a long-lived, opaque token (opaque to clients)
        return UUID.randomUUID().toString();
    }

    public static boolean canRefresh(String currentToken, String refreshToken) {
        // Implement server-side mapping between access tokens and refresh tokens
        // Here, we simply demonstrate the pattern; real logic would query a data store
        return currentToken != null && refreshToken != null;
    }
}
```

### Line-by-line explanation
- RefreshService demonstrates a separate refresh-token mechanism.
- issueRefreshToken(...) returns a UUID as a refresh token.
- canRefresh(...) shows a place to validate the pairing of access and refresh tokens via a data store.

---

## X. Common Beginner Mistakes — 3+ Real Pitfalls

Pitfall 1: Storing tokens insecurely on the client
- Bad

```javascript
// Bad: token stored in localStorage
localStorage.setItem("jwt", token);
fetch("/api/secure", {
  headers: { "Authorization": "Bearer " + localStorage.getItem("jwt") }
});
```

- Good

```http
# Good: rely on HttpOnly cookies from server responses
Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
```

Line-by-line explanation
- LocalStorage is accessible via JavaScript, risking XSS exposure.
- HttpOnly cookies prevent JavaScript access, reducing theft risk; ensure Secure and SameSite attributes for protection.

Pitfall 2: Not validating issuer/audience or relying solely on signature
- Bad

```java
// Bad: only checks signature implicitly by parsing; ignores iss/aud
Claims claims = JwtUtil.parseToken(token);
String user = claims.getSubject();
```

- Good

```java
// Good: explicitly validate issuer and audience
Claims claims = JwtUtil.parseToken(token);
String iss = claims.getIssuer();
String aud = claims.getAudience();
if (!"my-auth-server".equals(iss) || !"my-service".equals(aud)) {
    throw new SecurityException("Invalid token claims");
}
```

Line-by-line explanation
- Checking issuer (iss) and audience (aud) constrains tokens to trusted issuers and targets, preventing token misuse across services.

Pitfall 3: Using a weak or hard-coded secret
- Bad

```java
private static final String SECRET = "break-me";
```

- Good

```java
private static final String SECRET = System.getenv().getOrDefault("JWT_SECRET", "fallback-secure-default");
```

Line-by-line explanation
- Hard-coded secrets are vulnerable in code repos and CI/CD.
- Read from environment or a secrets manager to enable rotation and separation of duties.

Pitfall 4: No token revocation strategy
- Bad

```java
// Accepts any valid signature forever; no revocation
boolean ok = JwtUtil.isTokenValid(token);
```

- Good

```java
if (JwtUtil.isTokenValid(token) && !RevocationStore.isRevoked(token)) {
    // proceed
} else {
    // reject
}
```

Line-by-line explanation
- Without revocation, tokens remain valid until expiry, hindering logout or emergency revocation.
- Combining a revocation store with expiry checks enables immediate invalidation when needed.

---

## Y. Why This Matters In Real Systems

- Statelessness enables horizontal scaling: servers can be added without maintaining session state.
- Performance: fewer DB lookups; tokens are self-contained claims validated by signature.
- Security posture: relies on transport security (HTTPS), strong signing keys, and proper token lifecycle management (expiry, rotation, revocation).
- Real-world patterns:
  - Use a short-lived access token (e.g., 15 minutes) with a longer-lived refresh token.
  - Rotate keys periodically and publish key IDs (kid) in the token header to enable seamless rotation.
  - Implement audience (aud) and issuer (iss) checks to bound tokens to specific services.
  - Prefer HTTP-only cookies for tokens when you can, and consider CSRF implications for cookie-based auth.
  - Log and monitor failed authentication attempts; implement rate limiting to deter brute-force attacks.
- In microservices, JWTs can be signed by a central authority and verified by downstream services without contacting the auth server on every request, provided keys are distributed and cached carefully.

---

## Z. Study Questions — 5 Recall Questions

1) What are the three parts of a JWT and what does each part contain?
2) Why is stateless authentication advantageous for horizontally scaled systems?
3) How would you rotate signing keys without breaking existing tokens?
4) What are the security implications of storing JWTs in localStorage vs HttpOnly cookies?
5) What is the purpose of issuer (iss) and audience (aud) claims, and how would you validate them in code?

---

## Exercise — Practical Multi-Part Coding Challenge

Part A — Create JwtUtil and a minimal login flow
- Implement JwtUtil (as in Section 1) with generateToken, parseToken, and isTokenValid.
- Build AuthServlet (as in Section 2) that authenticates a user and returns a JWT.

Part B — Build a protected endpoint with a servlet filter
- Implement JwtAuthenticationFilter (as in Section 3) to require a valid JWT for protected resources.
- Create SecuredEndpointServlet (as in Section 3) that greets the authenticated user using the token's subject.

Part C — Add a basic refresh mechanism (conceptual)
- Add a RefreshService skeleton (as in Section 4) and a simple refresh flow outline.
- Outline how you would store and rotate refresh tokens securely, and how you would invalidate them on logout.

Part D — Testing commands (local dev)
- Start a minimal embedded servlet container (e.g., using an embedded Jetty/Tomcat or your framework of choice).
- Use curl to test:
  - POST /login with username/password -> receive JWT
  - GET /secure with Authorization: Bearer <token> -> should return 200 with a hello message
  - Access with an expired or tampered token -> expect 401

Part E — Security review checklist
- Ensure TLS is enabled (HTTPS) in all environments.
- Verify the token expiry is short enough to limit risk, balanced with user experience.
- Confirm secrets are loaded from a secure source and rotated regularly.
- Validate iss and aud claims in all protected endpoints.
- Ensure there is a plan for token revocation (blacklist or refresh token strategy).

Note: The above exercise assumes a basic servlet environment. In real projects, you would wire these components into a modern framework like Spring Boot, configure a SecurityFilterChain, and manage secrets via a vault or cloud secret manager.