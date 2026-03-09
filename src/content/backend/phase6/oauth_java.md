# OAuth 2.0 — Login with Google / GitHub (Java)

OAuth 2.0 login with Google and GitHub is a foundational skill for modern backend systems. It lets users authenticate via trusted providers without your app handling user passwords directly. In production, this enables single sign-on, reduces security burden, and improves user experience. This lesson walks through manual implementation (with PKCE) in Java, then shows a production-friendly path using Spring Security OAuth2 Client, plus best practices, pitfalls, and hands-on exercises.

## 1. Manual Authorization Code Flow with PKCE (Java)

This section demonstrates the end-to-end flow for a confidential server-side Java app using the Authorization Code flow with PKCE. It covers generating a PKCE pair, constructing the authorization URL for Google and GitHub, exchanging the authorization code for tokens, and fetching basic user info.

Code block 1: PKCE utilities (code_verifier, code_challenge)

```java
package com.example.oauth2;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public class PKCEUtil {
    // Generates a high-entropy code_verifier (43-128 chars recommended)
    public static String generateCodeVerifier() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return base64UrlEncode(bytes);
    }

    // Creates code_challenge = BASE64URL-ENCODE(SHA256(code_verifier))
    public static String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return base64UrlEncode(digest);
        } catch (Exception e) {
            throw new RuntimeException("PKCE code_challenge generation failed", e);
        }
    }

    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
```

Explanation:
- Line 1 declares the package.
- Lines 4-9 provide a method to generate a high-entropy code_verifier using SecureRandom.
- Lines 12-22 compute a code_challenge from the verifier via SHA-256 and Base64 URL encoding.
- Lines 24-28 helper to encode bytes in Base64 URL format without padding.

Code block 2: OAuth2 client skeleton (authorization URL builder and token exchange)

```java
package com.example.oauth2;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

public class OAuth2Client {
    private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private static final String GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
    private static final String GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
    private static final String GITHUB_USER_URL = "https://api.github.com/user";

    private final String googleClientId;
    private final String googleRedirectUri;

    private final String githubClientId;
    private final String githubRedirectUri;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public OAuth2Client(String googleClientId, String googleRedirectUri,
                        String githubClientId, String githubRedirectUri) {
        this.googleClientId = googleClientId;
        this.googleRedirectUri = googleRedirectUri;
        this.githubClientId = githubClientId;
        this.githubRedirectUri = githubRedirectUri;
    }

    // Build Google authorization URL with PKCE
    public String buildGoogleAuthorizationUrl(String state, String codeChallenge) {
        String scope = "openid email profile";
        return GOOGLE_AUTH_URL +
                "?response_type=code" +
                "&client_id=" + urlEncode(googleClientId) +
                "&redirect_uri=" + urlEncode(googleRedirectUri) +
                "&scope=" + urlEncode(scope) +
                "&state=" + urlEncode(state) +
                "&code_challenge=" + urlEncode(codeChallenge) +
                "&code_challenge_method=S256" +
                "&prompt=consent";
    }

    // Build GitHub authorization URL with PKCE (optional)
    public String buildGithubAuthorizationUrl(String state, String codeChallenge) {
        String scope = "read:user user:email";
        return GITHUB_AUTH_URL +
                "?response_type=code" +
                "&client_id=" + urlEncode(githubClientId) +
                "&redirect_uri=" + urlEncode(githubRedirectUri) +
                "&scope=" + urlEncode(scope) +
                "&state=" + urlEncode(state) +
                (codeChallenge != null ? "&code_challenge=" + urlEncode(codeChallenge) +
                 "&code_challenge_method=S256" : "");
    }

    // Exchange Google authorization code for tokens (with PKCE verifier)
    public Map<String, Object> exchangeGoogleCodeForTokens(String code, String codeVerifier) throws Exception {
        String body = "code=" + urlEncode(code) +
                "&client_id=" + urlEncode(googleClientId) +
                "&redirect_uri=" + urlEncode(googleRedirectUri) +
                "&grant_type=authorization_code" +
                "&code_verifier=" + urlEncode(codeVerifier);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        return mapper.readValue(resp.body(), Map.class);
    }

    // Exchange GitHub authorization code for tokens (PKCE supported)
    public Map<String, Object> exchangeGithubCodeForTokens(String code, String codeVerifier) throws Exception {
        String body = "client_id=" + urlEncode(githubClientId) +
                "&code=" + urlEncode(code) +
                "&redirect_uri=" + urlEncode(githubRedirectUri) +
                "&grant_type=authorization_code" +
                (codeVerifier != null ? "&code_verifier=" + urlEncode(codeVerifier) : "");

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(GITHUB_TOKEN_URL))
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        return mapper.readValue(resp.body(), Map.class);
    }

    // Fetch user info from Google using access_token
    public Map<String, Object> fetchGoogleUserInfo(String accessToken) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_USERINFO_URL))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        return mapper.readValue(resp.body(), Map.class);
    }

    // Fetch user info from GitHub using access_token
    public Map<String, Object> fetchGithubUserInfo(String accessToken) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(GITHUB_USER_URL))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        return mapper.readValue(resp.body(), Map.class);
    }

    private static String urlEncode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
```

Explanation:
- Lines 1-8 declare the package and imports.
- Lines 14-21 declare endpoints for Google and create fields for client IDs and redirect URIs.
- Lines 24-41 define a constructor to initialize provider config.
- Lines 44-58 implement Google authorization URL construction with PKCE parameters.
- Lines 61-77 implement GitHub authorization URL construction (PKCE is optional here).
- Lines 80-103 implement Google token exchange using the authorization code and PKCE verifier.
- Lines 106-127 implement GitHub token exchange, optionally including code_verifier.
- Lines 130-148 fetch user info from Google using the access token.
- Lines 151-167 fetch user info from GitHub using the access token.
- Lines 169-171 helper to URL-encode.

Code block 3: Example usage (paraphrased flow; not a full web app)

```java
// Example usage (conceptual; not a runnable web app)
public class OAuth2Demo {
    public static void main(String[] args) throws Exception {
        OAuth2Client client = new OAuth2Client(
                "GOOGLE_CLIENT_ID", "https://yourapp.example.com/oauth2/callback/google",
                "GITHUB_CLIENT_ID", "https://yourapp.example.com/oauth2/callback/github"
        );

        // Step 1: Client initiates login
        String codeVerifier = PKCEUtil.generateCodeVerifier();
        String codeChallenge = PKCEUtil.generateCodeChallenge(codeVerifier);
        String state = "randomState123";

        String googleAuthUrl = client.buildGoogleAuthorizationUrl(state, codeChallenge);
        System.out.println("Visit to authorize Google: " + googleAuthUrl);

        // After the user authenticates, your redirect handler receives a "code" for Google
        // String googleCode = ...; // from callback
        // Map<String, Object> tokens = client.exchangeGoogleCodeForTokens(googleCode, codeVerifier);
        // String accessToken = (String) tokens.get("access_token");
        // Map<String, Object> user = client.fetchGoogleUserInfo(accessToken);
        // System.out.println(user);
    }
}
```

Explanation:
- Lines 1-7 set up a demo runner with placeholder client IDs and redirect URIs.
- Step 1 shows building an authorization URL (Google) with PKCE.
- The code for handling the callback (extracting the code, exchanging it for tokens, and retrieving user info) is indicated but not fully wired in this snippet, as it requires a web framework route to receive the redirect.

Code block 4: Simple helper for handling a Google OAuth callback (illustrative)

```java
package com.example.oauth2;

import java.util.Map;

public class CallbackHandler {
    // Pseudo-handler: in a real app, map this to a web route like /oauth2/callback/google
    public void handleGoogleCallback(String code, String codeVerifier) throws Exception {
        OAuth2Client client = new OAuth2Client(
                "GOOGLE_CLIENT_ID", "https://yourapp.example.com/oauth2/callback/google",
                "GITHUB_CLIENT_ID", "https://yourapp.example.com/oauth2/callback/github"
        );
        Map<String, Object> tokens = client.exchangeGoogleCodeForTokens(code, codeVerifier);
        String accessToken = (String) tokens.get("access_token");
        Map<String, Object> user = client.fetchGoogleUserInfo(accessToken);
        // Create app session for user, issue a session cookie, etc.
        System.out.println("Authenticated user: " + user);
    }
}
```

Explanation:
- Lines 1-3 declare package.
- Lines 6-16 demonstrate receiving a code and PKCE verifier from the OAuth2 callback, exchanging for tokens, obtaining user info, and integrating with your app session.

### Line-by-line explanation
- Each line mirrors the flow: instantiate client config, exchange code for tokens, fetch user info, and persist a session as needed.

## 2. Spring Security OAuth2 Client for Google & GitHub

Spring Security provides first-class support for OAuth 2.0 login flows, reducing boilerplate and ensuring robust token validation and session handling. This section shows a minimal configuration to enable “Login with Google” and “Login with GitHub” using the framework.

Code block 5: Spring Boot security configuration (OAuth2 login)

```java
package com.example.oauth2;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@SpringBootApplication
public class OAuth2SpringApp {
    public static void main(String[] args) {
        SpringApplication.run(OAuth2SpringApp.class, args);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeRequests(auth -> auth
                .antMatchers("/", "/login**", "/webjars/**").permitAll()
                .anyRequest().authenticated()
            )
            // Enable OAuth2 login with providers configured in application properties
            .oauth2Login();

        return http.build();
    }
}
```

Code block 6: application.properties (Google and GitHub registrations)

```properties
# Google OAuth2 client
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
spring.security.oauth2.client.registration.google.scope=openid,email,profile
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/google

# GitHub OAuth2 client
spring.security.oauth2.client.registration.github.client-id=YOUR_GITHUB_CLIENT_ID
spring.security.oauth2.client.registration.github.client-secret=YOUR_GITHUB_CLIENT_SECRET
spring.security.oauth2.client.registration.github.scope=read:user,user:email
spring.security.oauth2.client.registration.github.redirect-uri={baseUrl}/login/oauth2/code/github
```

Code block 7: Simple controller to display authenticated user info

```java
package com.example.oauth2;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class UserController {

    @GetMapping("/profile")
    public String profile(Model model, @AuthenticationPrincipal OidcUser principal) {
        if (principal != null) {
            model.addAttribute("name", principal.getFullName());
            model.addAttribute("email", principal.getEmail());
            model.addAttribute("provider", principal.getIssuer());
        }
        return "profile";
    }
}
```

Explanation:
- Code block 5: Security configuration enabling OAuth2 login for all endpoints, with a public root and protected rest.
- Code block 6: Spring properties configuring Google and GitHub registrations, including client IDs, secrets, scopes, and redirect URIs.
- Code block 7: A controller that accesses the authenticated principal to render a profile page. Spring handles token validation, nonce, state, and PKCE under the hood.

### Line-by-line explanation
- Code block 5: Bean defines the security filter chain; HTTP security is configured to permit public access to root paths and require authentication for others, and enables OAuth2 login integration.
- Code block 6: Property keys follow Spring’s convention: client registrations for Google and GitHub; redirect URIs map to Spring’s OAuth2 login endpoints.
- Code block 7: Demonstrates how to access the authenticated user’s profile in a controller using @AuthenticationPrincipal.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Pitfall: Skipping CSRF protection by not validating state
- Bad
```java
String authUrl = "https://accounts.google.com/o/oauth2/v2/auth?response_type=code" +
                 "&client_id=YOUR_CLIENT_ID&redirect_uri=" + redirectUri;
```
- Good
```java
String state = generateSecureState();
String authUrl = googleAuthUrlWithState(state);
storeStateForSession(state, sessionId); // CSRF protection
```

2) Pitfall: Exposing client_secret in client code or logs
- Bad
```java
logger.info("Using secret: " + clientSecret);
```
- Good
```java
// Never log secrets. Read from environment at startup, not at runtime.
String clientSecret = System.getenv("GOOGLE_CLIENT_SECRET");
```

3) Pitfall: Trusting ID tokens without validation
- Bad
```java
String idToken = tokenResponse.get("id_token").toString();
Payload payload = JWT.decode(idToken).getPayload();
```
- Good
```java
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.util.Utils;

GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(Utils.getDefaultTransport(), Utils.getDefaultJsonFactory())
        .setAudience(Collections.singletonList(googleClientId))
        .build();
GoogleIdToken token = verifier.verify(idToken);
if (token == null) throw new SecurityException("Invalid ID token");
// Further checks: issuer, audience, nonce, expiry as needed
```

4) Pitfall: Not using PKCE for public clients or mobile apps
- Bad
```java
String tokenEndpoint = "https://example.com/token";
Map<String, String> params = Map.of(
  "grant_type", "authorization_code",
  "code", code,
  "client_id", clientId
  // missing code_verifier
);
```
- Good
```java
String codeVerifier = PKCEUtil.generateCodeVerifier();
String codeChallenge = PKCEUtil.generateCodeChallenge(codeVerifier);
// Send code_verifier in the token request to enable PKCE
```

5) Pitfall: Storing tokens insecurely (in-memory or cookies without HttpOnly)
- Bad
```java
response.addHeader("Set-Cookie", "access_token=" + accessToken);
```
- Good
```java
ResponseCookie cookie = ResponseCookie.from("SESSION", sessionId)
      .httpOnly(true)
      .secure(true)
      .sameSite("Strict")
      .path("/")
      .build();
response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
```

## Y. Why This Matters In Real Systems — production context and real usage

- Security posture
  - Use Authorization Code flow with PKCE for public clients to prevent authorization code interception.
  - Validate state to protect against CSRF; use a per-login random state value stored server-side.
  - Always validate the ID token (issuer, audience, expiration, nonce where applicable) or rely on a framework that does this for you.
  - Use a robust provider flow: for Google, prefer OpenID Connect endpoints; for GitHub, ensure you request user email scopes to map accounts properly.

- Token lifecycle and session management
  - Access tokens are short-lived; implement refresh tokens only when you have a secure backend capable of safeguarding them.
  - Store tokens securely: use HttpOnly, Secure cookies for sessions; never expose tokens to frontend code in SPA-like scenarios unless you explicitly design an SPA with a back-end-less flow.
  - Rotate client secrets and monitor for credential leakage; use environment-based credentials rather than hard-coded strings.

- Production-grade patterns
  - Prefer a standard library or framework (Spring Security OAuth2 Client) to handle heavy-lifting: redirect handling, state, PKCE, token validation, and provider metadata discovery.
  - Implement centralized logging and auditing for OAuth2 events (authorize requests, redirections, callback successes/failures).
  - Consider federation and user provisioning: map external identities to internal user records; handle email verification and user attribute mapping.

- Observability and reliability
  - Introduce retry/backoff for token exchange errors; handle provider downtime gracefully.
  - Cache provider metadata (issuer, keys) with a sane TTL and fallback strategy when keys rotate.
  - Load-test login paths to ensure no single-threaded bottlenecks in token exchanges.

## Z. Study Questions — 5 recall questions

1) What is the purpose of the state parameter in OAuth 2.0 authorization requests, and how should you use it securely?
2) Explain PKCE and why it is important for mobile/public clients even when you have a server-side component.
3) Which endpoints are used to perform the OAuth 2.0 login flow with Google and GitHub, and what data do you exchange at each step?
4) How can you verify an ID token, and why is issuer and audience verification essential?
5) When using Spring Security OAuth2 Client, what configuration is typically required to enable Google and GitHub login?

## Exercise — a practical multi-part coding challenge

Part A: Create a small Java project (Gradle or Maven) that implements a reusable OAuth2 helper for Google and GitHub.

- Part A.1: Implement PKCE utilities
  - Create a class PKCEUtil with methods:
    - generateCodeVerifier(): String
    - generateCodeChallenge(String codeVerifier): String

- Part A.2: Implement a compact OAuth2 client
  - Create a class OAuth2Client with:
    - buildGoogleAuthorizationUrl(state, codeChallenge)
    - buildGithubAuthorizationUrl(state, codeChallenge)
    - exchangeGoogleCodeForTokens(code, codeVerifier) -> Map<String, Object>
    - exchangeGithubCodeForTokens(code, codeVerifier) -> Map<String, Object>
    - fetchGoogleUserInfo(accessToken) -> Map<String, Object>
    - fetchGithubUserInfo(accessToken) -> Map<String, Object>
  - Use Java 11 HttpClient and Jackson for JSON parsing. Do not hard-code tokens in source files; read client IDs/secrets from environment variables.

- Part A.3: Basic integration test
  - Write a small test (JUnit 5) that mocks the token response and tests the token exchange method’s ability to parse a JSON payload into a Map.
  - You can simulate responses with a simple WireMock server or by mocking HttpClient (your choice).

- Part A.4: Documentation
  - Add a README with:
    - How to run the test suite
    - How to configure environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
    - How to execute a manual flow (print authorization URLs, instruct the user to paste the authorization code back)

Deliverables:
- A small Java project (src/main/java/com/example/oauth2) implementing PKCE, OAuth2 client, and tests.
- A README with setup and usage instructions.
- A short design note explaining why PKCE and proper token validation are critical in production.

If you’d like, I can tailor the exercise to a specific build tool (Maven or Gradle) or provide a minimal runnable project skeleton.