# JWT — Stateless Authentication in PHP (Backend Engineering: Phase 6 — Authentication & Security)

Stateless authentication with JWTs (JSON Web Tokens) lets a backend verify user identity without maintaining server-side session state. In PHP backends, JWTs enable scalable, decoupled APIs where authentication data travels with each request. This lesson covers how JWTs work, how to generate and verify tokens in PHP, and practical patterns for secure, production-ready usage.

## 1. JWT Essentials in PHP

In a JWT, you have three base64url-encoded parts: header, payload, and signature. The header declares the algorithm (e.g., HS256) and type (JWT). The payload contains claims like sub (subject), iat (issued at), and exp (expiration). The signature ensures the token hasn’t been tampered with.

- Pros: Stateless authentication, easy scale-out, cross-service authentication.
- Cons: Token revocation is harder; secret/key management is critical; tokens must be transmitted over HTTPS.

Code: Manual HS256 JWT creation (no library)

```php
<?php
// Minimal, self-contained JWT creation (HS256, no library)
// 1) Prepare header and payload
$header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
$payload = json_encode([
  'sub' => 'user-123',
  'name' => 'Alice',
  'iat' => time(),
  'exp' => time() + 3600 // 1 hour
]);

$secret = 'your-very-secret-key'; // In real apps, load from env

function base64url_encode($data) {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// 2) Create the signing input
$segments = [
  base64url_encode($header),
  base64url_encode($payload)
];

// 3) Sign the input
$signature = hash_hmac('sha256', implode('.', $segments), $secret, true);

// 4) Form the final token
$token = implode('.', [
  $segments[0],                 // header
  $segments[1],                 // payload
  base64url_encode($signature) // signature
]);

echo $token;
```

### Line-by-line explanation
- Line 1: PHP opening tag.
- Lines 4-7: Define the JWT header and payload. The payload includes sub, name, issued-at, and expiration.
- Line 9: Secret key loaded (in production, read from environment variables or a secrets manager).
- Lines 11-14: base64url_encode helper to produce URL-safe encoding without padding.
- Lines 17-20: Create the signing input segments for the header and payload.
- Line 23: Compute the signature using HMAC-SHA256 over the signing input, returning raw binary data.
- Lines 26-30: Build the final token by concatenating header, payload, and signature (base64url-encoded). Output the token.
- Line 32: End of script.

Notes:
- This is a didactic, library-free example. In production, prefer a well-tested library to handle edge cases and standard-compliant encoding/decoding.

---

## 2. Generating and Validating Tokens with a Library (firebase/php-jwt)

Using a library reduces boilerplate, avoids subtle encoding mistakes, and provides robust decoding with proper error handling and claim checks.

Prerequisite: composer require firebase/php-jwt

```php
<?php
require 'vendor/autoload.php';
use Firebase\JWT\JWT;

$secretKey = 'your-256-bit-secret';
$issuedAt = time();
$expirationTime = $issuedAt + 3600; // 1 hour

$payload = [
  'iat' => $issuedAt,
  'exp' => $expirationTime,
  'sub' => 'user-123',
  'name' => 'Alice',
  'role' => 'admin'
];

// 1) Encode
$jwt = JWT::encode($payload, $secretKey, 'HS256');

// 2) Decode (throws exception on invalid signature or expired token)
$decoded = JWT::decode($jwt, $secretKey, ['HS256']);

// $decoded is an object (stdClass). Access properties via -> syntax
echo $decoded->name;
```

### Line-by-line explanation
- Line 3: Autoload dependencies installed by Composer.
- Line 4: Import the JWT class for convenience.
- Lines 6-9: Define a secret key and token timing windows (issued at, expiration).
- Lines 11-17: Create a payload with standard and custom claims (iat, exp, sub, name, role).
- Line 20: Encode the payload into a JWT using HS256.
- Line 23: Decode the JWT back into a PHP object, validating the signature and expiration automatically.
- Line 26: Output the user’s name from the decoded payload.

Notes:
- The library validates exp and iat automatically when decoding (unless configured otherwise). You can also pass leeway if clock skew is a concern.
- For production, manage the secret with environment variables and consider using short-lived access tokens with a separate refresh mechanism.

---

## 3. Verifying Tokens in a PHP REST Endpoint (stateless guard)

A stateless API endpoint should extract the Bearer token from the Authorization header, verify it, and authorize the request without creating a server-side session.

```php
<?php
require 'vendor/autoload.php';
use Firebase\JWT\JWT;

$secretKey = 'your-256-bit-secret';

// Robust header extraction supporting various server environments
function getBearerToken(): ?string {
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
  if (!$authHeader) {
    if (function_exists('getallheaders')) {
      $headers = getallheaders();
      $authHeader = $headers['Authorization'] ?? null;
    }
  }
  if ($authHeader && preg_match('/Bearer\s+(\S+)/', $authHeader, $m)) {
     return $m[1];
  }
  return null;
}

$token = getBearerToken();
if (!$token) {
  http_response_code(401);
  echo 'Missing Authorization token';
  exit;
}

try {
  // Decode will verify signature and exp claim
  $payload = (array)JWT::decode($token, $secretKey, ['HS256']);

  // Optional: enforce additional checks (e.g., audience, issuer)
  // if ($payload['exp'] < time()) { throw new Exception('Expired'); }

  // Authorized response
  http_response_code(200);
  echo 'Hello, ' . ($payload['name'] ?? 'user');
} catch (Exception $e) {
  http_response_code(401);
  echo 'Invalid token: ' . $e->getMessage();
}
```

### Line-by-line explanation
- Line 3: Autoload dependencies.
- Line 6: Import JWT class for decoding.
- Line 9: Define the shared secret key used for signature verification.
- Lines 12-24: getBearerToken() extracts the token from the Authorization header across different server environments (Apache, PHP-FPM, etc.).
- Line 26: Retrieve the token; if absent, respond with 401.
- Lines 29-36: Attempt to decode and verify the token. JWT::decode throws on invalid signature or expired token.
- Lines 38-42: If decoding succeeds, respond with a success message and a value from the payload (e.g., user name).
- Lines 43-46: Catch any decode/verify error and respond with 401.

Notes:
- By default, JWT::decode enforces signature correctness and exp/nbf/iat checks. You can disable or adjust checks if needed, but that reduces security.
- Always serve over HTTPS to prevent token capture in transit.

---

## 4. Token Revocation and Refresh (stateless caveat)

JWTs are typically stateless, which makes revocation challenging. A common pattern is to implement short-lived access tokens plus a server-side or shared-cache store for revocation or rotation using a jti (JWT ID) claim. This also supports token rotation on refresh.

```php
<?php
require 'vendor/autoload.php';
use Firebase\JWT\JWT;

$secretKey = 'your-256-bit-secret';

// Simple in-memory blacklist (demo). In production, use Redis, DB, or a dedicated cache.
$TOKEN_BLACKLIST = [];

// Generate a token with a unique identifier (jti)
$jti = bin2hex(random_bytes(8));
$payload = [
  'iat' => time(),
  'exp' => time() + 900, // 15 minutes
  'jti' => $jti,
  'sub' => 'user-123'
];

$token = JWT::encode($payload, $secretKey, 'HS256');

// Revocation example: add jti to blacklist
function revokeToken(string $jti, array &$blacklist): void {
  $blacklist[$jti] = time();
}

// Decode and check blacklist before trusting a token
try {
  $decoded = (array)JWT::decode($token, $secretKey, ['HS256']);
  $tokenJti = $decoded['jti'] ?? null;

  global $TOKEN_BLACKLIST;
  if ($tokenJti && isset($TOKEN_BLACKLIST[$tokenJti])) {
    throw new Exception('Token has been revoked');
  }

  // Token is valid and not revoked
  echo 'Access granted for sub: ' . ($decoded['sub'] ?? 'unknown');
} catch (Exception $e) {
  http_response_code(401);
  echo 'Invalid or revoked token: ' . $e->getMessage();
}
```

### Line-by-line explanation
- Line 3: Autoload dependencies.
- Line 6: Import JWT class for decoding.
- Line 9: Secret key for verification.
- Line 13: Initialize an in-memory blacklist (replace with a persistent store in production).
- Lines 16-21: Create a token payload with iat, exp, jti (unique identifier), and sub.
- Line 24: Encode the payload into a JWT.
- Lines 27-29: Function revokeToken adds a jti to the blacklist.
- Lines 33-42: Decode the token, obtain the jti, and check the blacklist. If present, revoke access.
- Lines 45-47: If valid and not revoked, grant access.
- Lines 49-52: If decoding fails or token is revoked, respond with 401.

Notes:
- For production, store the blacklist in a durable cache (Redis, Memcached) or a database, and consider token rotation strategies for refresh flows.
- Short lifetimes minimize risk, and a refresh flow can issue a new token with a fresh jti after validating a separate, longer-lived refresh token.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Exposing the secret key in source control
  Bad:
  ```php
  $secretKey = 'my-secret-okay-for-dev';
  ```
  Good:
  ```php
  // Load from environment or a secrets manager
  $secretKey = getenv('JWT_SECRET');
  if (!$secretKey) {
    throw new RuntimeException('JWT secret not configured');
  }
  ```

- Pitfall 2: Not validating token expiration
  Bad:
  ```php
  $payload = (array)JWT::decode($token, $secretKey, ['HS256']);
  // No explicit exp check; relying on library? not always guaranteed
  ```
  Good:
  ```php
  // Library validates exp by default; ensure you handle exceptions for expired tokens
  try {
    $payload = (array)JWT::decode($token, $secretKey, ['HS256']);
  } catch (ExpiredException $e) {
    // token expired; prompt for re-authentication
  }
  ```

- Pitfall 3: Writing tokens with insecure signing or padding
  Bad:
  ```php
  // Using a weak or short secret
  $secretKey = 'short';
  ```
  Good:
  ```php
  // Use a long, random secret from a secure source
  $secretKey = rtrim(base64_encode(random_bytes(32)), '=');
  // Store in environment; rotate periodically
  ```

- Pitfall 4: Assuming Authorization header is always present
  Bad:
  ```php
  $auth = $_SERVER['HTTP_AUTHORIZATION'];
  ```
  Good:
  ```php
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
  if (!$authHeader) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
  }
  ```

- Pitfall 5: Not mitigating clock skew
  Bad:
  ```php
  // Direct exp check; server clock mismatch can cause token rejection
  ```
  Good:
  ```php
  // Allow a small leeway (e.g., 60 seconds) when decoding
  $payload = (array)JWT::decode($token, $secretKey, ['HS256'], 60);
  ```

- Pitfall 6: Over-privilege in payload
  Bad:
  ```php
  // Putting sensitive data in the payload
  $payload = ['sub' => 'user-123', 'roles' => ['admin', 'finance'], 'ssn' => '123-45-6789'];
  ```
  Good:
  ```php
  // Only include needed claims; avoid sensitive data
  $payload = ['sub' => 'user-123', 'role' => 'admin', 'iat' => time(), 'exp' => time() + 3600];
  ```

Notes:
- Centralize secret management, enforce HTTPS, and keep token lifetimes short.
- Prefer using a standard library to avoid subtle encoding or verification mistakes.

---

## Y. Why This Matters In Real Systems — production context and real usage

- Scalability: Stateless JWTs avoid server-side session storage, easing horizontal scaling and microservice communication.
- Security posture: Short-lived tokens reduce risk; multi-layer strategy (access token + refresh token) limits blast radius.
- Key management: Rotate signing keys carefully; implement key IDs (kid) in the header for seamless key rotation.
- Claims governance: Use standard claims (iss, aud, sub, exp, iat, jti) and avoid leaking sensitive data in payload.
- Revocation: Build revocation/rotation into your flow (jti, blacklist, or refresh token invalidation) to handle compromised tokens.
- Transport security: Always enforce TLS; tokens are vulnerable to interception and should never be exposed in insecure channels.
- Observability: Log JWT-related events (issuance, revocation, failed validations) for auditability without logging sensitive payload data.
- Interoperability: JWTs are language-agnostic; design token payloads to be understood by multiple services in your ecosystem.

Practical production practices:
- Use environment-based secrets, with strict access controls.
- Implement token rotation and short expirations (e.g., 15 minutes access tokens).
- Use refresh tokens stored securely (e.g., HttpOnly cookies or secure storage) to obtain new access tokens without logging in again.
- Validate audience (aud) and issuer (iss) claims to prevent token misuse across services.
- Consider using JWKs (JSON Web Keys) for key management and rotation in distributed systems.

---

## Z. Study Questions — 5 recall questions

1) What are the three base components of a JWT, and what does each contain?
2) Why is it recommended to keep JWT expiration times short and use a refresh mechanism?
3) How do you securely obtain the signing secret in a PHP application in production?
4) What is the purpose of the jti (JWT ID) claim, and how can it help with revocation?
5) Name two common pitfalls when extracting and validating the Authorization header in a PHP endpoint.

---

## Exercise — a practical multi-part coding challenge

Part A: Implement a self-contained HS256 JWT generator and verifier in PHP (no external libraries)

- Create a PHP script that:
  - Builds a header and payload with iat, exp, and sub.
  - Signs the token using HS256 without external libraries (as in Section 1).
  - Validates the token by decoding and verifying the signature.
- Deliverables:
  - A single PHP file that prints a valid token when run and then validates it, printing whether validation passed.

Part B: Build a minimal PHP API endpoint that protects a route with JWT

- Create a simple script protected.php that:
  - Reads the Authorization: Bearer <token> header.
  - Validates the token using firebase/php-jwt (Section 2) or your own verifier from Part A.
  - Returns a JSON response with the user name or an error message.
- Deliverables:
  - Protects route with proper 401 responses for missing/invalid tokens.
  - Returns {"status":"ok","user":"<name>"} on success.

Part C: Add revocation support with a jti

- Extend your Part A/Part B implementation to:
  - Include a jti in the token payload.
  - Maintain an in-memory blacklist (or a file-based store for persistence across requests).
  - Before accepting a token, verify that its jti is not in the blacklist.
  - Provide a small script revoke.php that accepts a token's jti and adds it to the blacklist.
- Deliverables:
  - Protected route denies revoked tokens.
  - revoke.php demonstrates token revocation.

Part D: Optional extension — refresh tokens

- Implement a second token type (refresh token) with a longer expiration and a separate signing secret.
- Implement a refresh endpoint that issues a new access token when a valid refresh token is presented.
- Deliverables:
  - New access token issued upon valid refresh.
  - Demonstrate rotation of jti on refresh.

Notes for graders:
- Your code should be well-commented, handle edge cases (missing headers, expired tokens, invalid signatures), and use HTTPS in a real deployment scenario.
- The exercise should demonstrate a complete flow: generation, protection, revocation, and refresh semantics.

This lesson provides both conceptual understanding and concrete PHP patterns for JWT-based stateless authentication. Use and adapt these patterns to meet your system’s scale, security requirements, and operational constraints.