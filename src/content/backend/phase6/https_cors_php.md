# HTTPS, TLS & CORS Configuration in PHP

A robust backend must protect data in transit, validate identity, and control cross-origin access. HTTPS with TLS encrypts traffic, while proper CORS and cookie handling prevent data leaks and session hijacking. This lesson focuses on practical PHP-backed configurations you can apply in real systems, including server-level TLS setup, PHP-level HTTPS enforcement, secure cookie practices, and correct CORS handling.

## 1. HTTPS and TLS Fundamentals

- What to learn: how to enable TLS/HTTPS on common web servers, what certificates entail, and how PHP apps should behave when TLS is in use. You’ll also see how to set security headers that reinforce TLS (like HSTS) and how to inspect TLS-related server blocks.

### Code: Apache VirtualHost with TLS enabled
```apache
<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/example.com/chain.pem

    SSLProtocols all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite EECDH+AESGCM:EDH+AESGCM
    SSLHonorCipherOrder on

    # Optional: Improve security posture
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always -o var Fallback "2>&1"
</VirtualHost>
```
### Line-by-line explanation
- <VirtualHost *:443>: Listen on port 443 for HTTPS.
- ServerName example.com: The domain this host serves.
- DocumentRoot /var/www/html: Where PHP files live.
- SSLEngine on: Enable SSL/TLS for this host.
- SSLCertificateFile / path: Public certificate.
- SSLCertificateKeyFile / path: Private key for the certificate.
- SSLCertificateChainFile / path: CA chain certs (optional with some setups).
- SSLProtocols all -SSLv3 -TLSv1 -TLSv1.1: Allow modern TLS; disable old protocols.
- SSLCipherSuite EECDH+AESGCM:EDH+AESGCM: ...: Prioritize strong ciphers.
- SSLHonorCipherOrder on: Server decides cipher order (often safer).
- Header Strict-Transport-Security: Enforce TLS for future requests (HSTS).

### Code: Nginx server block with TLS
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    root /var/www/html;
    index index.php;
}
```
### Line-by-line explanation
- listen 443 ssl http2: TLS on port 443 with HTTP/2 support.
- server_name example.com: Domain served.
- ssl_certificate / ssl_certificate_key: Paths to certificate and key.
- ssl_protocols TLSv1.2 TLSv1.3: Limit to modern TLS versions.
- ssl_ciphers ...: Strong cipher suites for perfect forward secrecy.
- ssl_prefer_server_ciphers on: Server picks the cipher order.
- ssl_session_tickets off: Disable tickets for certain deployments.
- add_header Strict-Transport-Security: Enforce TLS for future requests.

### Code: PHP snippet for HTTP Strict Transport Security (HSTS)
```php
<?php
// Enable HSTS in all responses when HTTPS is used
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
}
?>
```
### Line-by-line explanation
- if (!empty($_SERVER['HTTPS']) ...): Check if TLS is active.
- header('Strict-Transport-Security: ...'): Instruct browsers to enforce HTTPS for the next year and for subdomains.

### Why this matters
- TLS is not just about encryption; it's about trusted identity, data integrity, and modern web features (HTTP/2, HTTP/3, etc.). Enforcing TLS end-to-end and signaling it with HSTS reduces downgrade attacks and MITM risks.

## 2. Enforcing HTTPS in PHP Applications

- What to learn: how to reliably redirect non-HTTPS requests to HTTPS, including considerations behind proxies and load balancers.

### Code: PHP HTTPS redirect (server-side)
```php
<?php
// Redirect to HTTPS if the current request is not secure
$isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

if (!$isSecure) {
    $host = $_SERVER['HTTP_HOST'] ?? 'example.com';
    $uri  = $_SERVER['REQUEST_URI'] ?? '/';
    header('Location: https://' . $host . $uri, true, 301);
    exit;
}
?>
```
### Line-by-line explanation
- $isSecure = ...: Determine if TLS is active via HTTPS or port 443.
- if (!$isSecure) { ... }: If not TLS, construct a new URL.
- header('Location: https://...'): Redirect to the HTTPS version.
- exit;: Stop processing to ensure the redirect happens.

### Code: Apache .htaccess redirect to HTTPS
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```
### Line-by-line explanation
- RewriteEngine On: Enable mod_rewrite processing.
- RewriteCond %{HTTPS} off: Condition if the request is not HTTPS.
- RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]: Redirect to the same path over HTTPS.

### Why this matters
- Reducing the attack surface requires that every request travels over TLS. If redirects are inconsistent, users may end up on HTTP, exposing data in flight.

## 3. Securing Cookies and Sessions over TLS

- What to learn: proper cookie attributes (Secure, HttpOnly, SameSite) to minimize cookie theft or leakage when tokens are used for authentication.

### Code: PHP securing cookies and sessions
```php
<?php
// PHP 7.3+ recommended: configure session cookie parameters with security in mind
session_set_cookie_params([
    'lifetime' => 0,                 // session cookie
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'] ?? '',
    'secure' => true,                 // only over HTTPS
    'httponly' => true,               // not accessible by JS
    'samesite' => 'Lax'               // or 'Strict' depending on needs
]);
session_start();

// Example: set a secure token cookie (e.g., refresh token)
setcookie('auth_token', bin2hex(random_bytes(32)), [
    'expires' => time() + 3600 * 24 * 7, // 1 week
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'] ?? '',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
]);
?>
```
### Line-by-line explanation
- session_set_cookie_params([...]): Configures the session cookie to be secure, HttpOnly, and with a SameSite policy.
- session_start(): Begin the session with the configured cookie.
- setcookie(...): Create a separate cookie for auth with security attributes.
- expires, path, domain, secure, httponly, samesite: Define cookie scope and security properties.

### Why this matters
- Without Secure, HttpOnly, or SameSite, cookies can be stolen via XSS, accessible to client-side scripts, or sent with cross-site requests, increasing the risk of session hijacking.

## 4. CORS Configuration in PHP

- What to learn: controlling cross-origin requests securely, avoiding wildcard origins when credentials are involved, and handling preflight OPTIONS requests correctly.

### Code: Dynamic CORS with preflight handling
```php
<?php
$allowedOrigins = [
    'https://example.com',
    'https://app.example.com'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 3600');
    header('Content-Type: application/json');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header('Access-Control-Allow-Headers: ' . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']);
    }
    exit(0);
}

// Your API logic goes here
echo json_encode(['status' => 'ok']);
?>
```
### Line-by-line explanation
- $allowedOrigins: List of trusted origins allowed to access the API.
- $origin = $_SERVER['HTTP_ORIGIN'] ?? '': Read the request origin if present.
- if (in_array(...)): If origin is allowed, reflect it back and indicate credentials support.
- header('Access-Control-Allow-Origin: ' . $origin): Permit the identified origin.
- header('Vary: Origin'): Instruct caches to vary by Origin.
- header('Access-Control-Allow-Credentials: true'): Allow credentials (cookies, auth headers).
- if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { ... }: Preflight handling.
- header('Access-Control-Allow-Methods: GET, POST, OPTIONS'): Allowed methods.
- header('Access-Control-Allow-Headers: ...'): Allowed request headers.
- exit(0): End preflight response.
- echo json_encode(['status' => 'ok']): Normal API response.

### Why this matters
- Proper CORS prevents unauthorized websites from reading responses or forging requests, while still enabling legitimate cross-origin integrations.

## 5. TLS Best Practices and Certificates

- What to learn: certificate issuance, renewal, and server-level hardening to keep TLS resilient against evolving threats.

### Code: Let's Encrypt + Apache/Nginx best practices (server-side)

- Apache: Sample SSL config (snippet)
```apache
# Enable TLS with Let’s Encrypt certificates
<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder on
    SSLSessionTickets off

    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
</VirtualHost>
```

- Nginx: Sample TLS config (snippet)
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

- CLI: Certbot issuance (one-time)
```
sudo certbot --apache -d example.com --non-interactive --agree-tos -m admin@example.com
```
### Line-by-line explanation
- Server blocks (Apache/Nginx): Define how TLS is terminated and which certificates are used.
- ssl_protocols / SSLProtocol: Restrict to modern TLS versions.
- ssl_ciphers / SSLCipherSuite: Use strong, modern cipher suites.
- SSLSessionTickets off: Reduce potential exposure from session tickets (depends on environment).
- add_header / Strict-Transport-Security: Enforce TLS and protect per-origin.
- certbot command: Automates certificate issuance/renewal with Let’s Encrypt.

### Why this matters
- TLS configurations must evolve with discovered vulnerabilities (e.g., insecure ciphers, old protocol versions). Automated certificate renewal reduces operational risk, while HSTS and proper cipher choices significantly harden the deployment.

## X. Common Beginner Mistakes

### 1) Bad: Using wildcard origins with credentials
Bad:
```php
// CORS: wildcard origin with credentials
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
```

Good:
```php
$allowedOrigins = ['https://example.com', 'https://api.example.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
```

### 2) Bad: Cookies without security flags
Bad:
```php
setcookie('session', $token);
```

Good:
```php
setcookie('session', $token, [
  'expires' => time() + 3600,
  'path' => '/',
  'domain' => $_SERVER['HTTP_HOST'],
  'secure' => true,
  'httponly' => true,
  'samesite' => 'Lax'
]);
```

### 3) Bad: HTTPS redirection that breaks behind proxies
Bad:
```php
header('Location: https://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']);
exit;
```

Good:
```php
$proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ($_SERVER['HTTPS'] ?? 'off');
if ($proto !== 'https' && $proto !== 'on') {
    header('Location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'], true, 301);
    exit;
}
```

### 4) Bad: Disabling TLS verification in client requests
Bad:
```php
$ch = curl_init('https://api.example.com/data');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
```

Good:
```php
$ch = curl_init('https://api.example.com/data');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);
$response = curl_exec($ch);
curl_close($ch);
```

### Why these are pitfalls
- Wildcard origins with credentials undermine access control.
- Insecure cookies open session data to theft via XSS or network sniffing.
- Improper proxy-aware redirects can cause infinite loops or insecure paths.
- Disabling TLS verification defeats the purpose of HTTPS.

## Y. Why This Matters In Real Systems

- Data protection: TLS prevents eavesdropping, tampering, and impersonation on the wire.
- Compliance: PCI-DSS, HIPAA, and others require encryption in transit and proper TLS configurations.
- Reliability: Proper TLS versions, ciphers, and HSTS improve resilience against known vulnerabilities.
- Interoperability: CORS correctness enables legitimate cross-origin API usage without data leakage.
- Operational hygiene: Automated certificate renewal reduces outages and admin toil.

In real systems, these settings are not one-off. They are versioned, tested, and validated in staging before promotion to production. Monitor TLS handshake failures, keep an eye on certificate expiry alerts, and regularly audit CORS origins and cookie security configurations.

## Z. Study Questions

1. What is the purpose of HTTP Strict Transport Security (HSTS), and how do you enable it in a PHP-hosted app?
2. Why is it unsafe to use Access-Control-Allow-Origin: * when credentials are involved in CORS requests?
3. How do you configure a secure cookie in PHP to prevent access from JavaScript and ensure the cookie is sent only over HTTPS?
4. What are the benefits of restricting TLS versions and cipher suites on the server, and how would you configure this in Apache or Nginx?
5. How can you accurately determine if a request to your PHP API is arriving over HTTPS when behind a reverse proxy or load balancer?

## Exercise

Part A — Build a minimal PHP API with HTTPS enforcement and secure cookies
- Create a small PHP API at api.local (simulate locally with hosts file or your environment) with the following features:
  1) HTTPS enforcement: If a request comes in over HTTP, redirect to HTTPS (respect proxy headers if behind a load balancer).
  2) Authentication token: Generate a one-time token stored in a secure cookie (SameSite=Lax, Secure, HttpOnly).
  3) CORS: Accept requests only from https://example.com and https://api.example.com, handle preflight OPTIONS correctly, and reflect the origin.
  4) Endpoint: GET /status returns {"status":"ok","tls":"on"} in JSON only when TLS is active; otherwise redirect.

- Deliverables:
  - index.php (main API)
  - cors.php (helper to determine allowed origins)
  - .htaccess (optional for Apache HTTPS redirect)
  - Instructions for testing locally with TLS (simulated or using a dev cert)

Part B — Client script to call the API over TLS
- Create a PHP or shell-based client (e.g., curl_client.php) that:
  - Uses cURL with TLS verification enabled.
  - Sets an Origin header matching an allowed origin.
  - Reads and prints the JSON response.

Part C — TLS verification and server hardening checklist
- Write a short checklist (text file) documenting:
  - Steps to obtain and renew a certificate via Let's Encrypt.
  - The TLS versions, ciphers, and headers you configured in your environment.
  - How to test HSTS, TLS versions, and cross-origin requests securely.

Optional hints and scaffolding
- For local HTTPS testing, you can create a self-signed certificate, but remember to configure curl and browsers to trust it for testing.
- Use curl -I https://your-api/status to inspect TLS-related response headers quickly.
- Validate that the Origin header is restricted in CORS responses and that credentials requests reflect the proper origin rather than a wildcard.

This completes a practical, production-oriented treatment of HTTPS, TLS, and CORS in a PHP backend.