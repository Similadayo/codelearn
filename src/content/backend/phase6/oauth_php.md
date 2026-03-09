# OAuth 2.0 — Login with Google / GitHub in PHP

Compelling introductory paragraph: OAuth 2.0 Login with external providers like Google and GitHub is a standard, professional approach to authenticating users without handling passwords directly. It improves security by delegating credential management to trusted providers, streamlines user onboarding, and reduces the scope of your application’s attack surface. In backend engineering, implementing robust, standards-aligned OAuth flows is essential for scalable authentication, consent handling, and secure session management across microservices and front-end clients.

## 1. Prerequisites and Installation

Code: prerequisites and installation of OAuth client libraries, plus a minimal environment outline.

```bash
# Install the OAuth2 client libraries
composer require league/oauth2-client
composer require league/oauth2-google
composer require league/oauth2-github
```

```php
<?php
// bootstrap.php
// 1) Load dependencies
require __DIR__ . '/vendor/autoload.php';
// 2) Start a session for CSRF state handling
session_start();

// 3) Load configuration from environment or a safe source
// (In production, use real env vars and a .env loader or server env)
$_ENV['GOOGLE_CLIENT_ID']     = $_ENV['GOOGLE_CLIENT_ID'] ?? 'YOUR_GOOGLE_CLIENT_ID';
$_ENV['GOOGLE_CLIENT_SECRET'] = $_ENV['GOOGLE_CLIENT_SECRET'] ?? 'YOUR_GOOGLE_CLIENT_SECRET';
$_ENV['GOOGLE_REDIRECT_URI']  = $_ENV['GOOGLE_REDIRECT_URI'] ?? 'https://yourapp.test/google/callback.php';

$_ENV['GITHUB_CLIENT_ID']     = $_ENV['GITHUB_CLIENT_ID'] ?? 'YOUR_GITHUB_CLIENT_ID';
$_ENV['GITHUB_CLIENT_SECRET'] = $_ENV['GITHUB_CLIENT_SECRET'] ?? 'YOUR_GITHUB_CLIENT_SECRET';
$_ENV['GITHUB_REDIRECT_URI']  = $_ENV['GITHUB_REDIRECT_URI'] ?? 'https://yourapp.test/github/callback.php';

// 4) Create provider instances in a small registry/lookup function
$providers = [
    'google' => new \League\OAuth2\Client\Provider\Google([
        'clientId'     => $_ENV['GOOGLE_CLIENT_ID'],
        'clientSecret' => $_ENV['GOOGLE_CLIENT_SECRET'],
        'redirectUri'  => $_ENV['GOOGLE_REDIRECT_URI'],
        'scopes'       => ['openid', 'profile', 'email'],
    ]),
    'github' => new \League\OAuth2\Client\Provider\Github([
        'clientId'     => $_ENV['GITHUB_CLIENT_ID'],
        'clientSecret' => $_ENV['GITHUB_CLIENT_SECRET'],
        'redirectUri'  => $_ENV['GITHUB_REDIRECT_URI'],
        'scopes'       => ['read:user', 'user:email'],
    ]),
];

// Helper: fetch provider by name
function getProvider(string $name) {
    global $providers;
    return $providers[$name] ?? null;
}
```

### Line-by-line explanation
- Line 1-3: Load Composer autoloader and start a session to manage OAuth state and user data.
- Lines 6-13: Load and simulate environment variables for client IDs and redirect URIs.
- Lines 16-28: Instantiate provider objects for Google and GitHub with credentials and required scopes.
- Lines 31-34: Expose a small helper getProvider() to fetch a provider by name from a shared registry.

## 2. Google OAuth 2.0 Login and Callback – Setup and Bootstrap

Code: login Google and callback Google (two separate scripts).

### 2.1 Google Login (login-google.php)

```php
<?php
require __DIR__ . '/bootstrap.php';

// Get the Google provider
$provider = getProvider('google');

// Build the authorization URL and state
$authUrl = $provider->getAuthorizationUrl();

// Persist the state to protect against CSRF
$_SESSION['oauth2state'] = $provider->getState();

// Redirect the user to Google for consent
header('Location: ' . $authUrl);
exit;
```

### Line-by-line explanation
- Line 1: Include bootstrap to load dependencies and the provider registry.
- Line 4: Retrieve the Google provider from the shared registry.
- Line 7: Generate Google’s authorization URL and capture the URL to redirect the user.
- Lines 10-12: Save the cryptographically random state value to the session for CSRF protection.
- Lines 15-16: Redirect the user to Google’s OAuth consent page and exit.

### 2.2 Google Callback (google-callback.php)

```php
<?php
require __DIR__ . '/bootstrap.php';

$provider = getProvider('google');

// Validate state to prevent CSRF
if (empty($_GET['state']) || $_GET['state'] !== $_SESSION['oauth2state']) {
    unset($_SESSION['oauth2state']);
    http_response_code(400);
    exit('Invalid state');
}
unset($_SESSION['oauth2state']);

// Exchange authorization code for an access token
if (isset($_GET['code'])) {
    $token = $provider->getAccessToken('authorization_code', [
        'code' => $_GET['code'],
    ]);
} else {
    http_response_code(400);
    exit('Authorization code not found');
}

// Retrieve the resource owner (user) details
$resourceOwner = $provider->getResourceOwner($token);
$userData = $resourceOwner->toArray();

// Persist user data to session (or DB in real apps)
$_SESSION['user'] = [
    'provider' => 'google',
    'id'       => $userData['sub'] ?? null,
    'name'     => $userData['name'] ?? null,
    'email'    => $userData['email'] ?? null,
    'avatar'   => $userData['picture'] ?? null,
];

// Redirect to a protected area
header('Location: /profile.php');
exit;
```

### Line-by-line explanation
- Line 3: Load bootstrap and provider registry.
- Line 6: Acquire the Google provider instance.
- Lines 9-14: Validate the OAuth state to protect against CSRF. If invalid, return an error and clear state.
- Lines 17-21: Exchange the authorization code for an access token using Google’s token endpoint.
- Lines 24-29: Use the access token to fetch the authenticated user’s profile; transform into a simple PHP array.
- Lines 32-38: Store a normalized subset of user data in the session for later use; redirect to a protected page.

## 3. GitHub OAuth 2.0 Login and Callback – Setup and Bootstrap

Code: login GitHub and callback GitHub (two separate scripts).

### 3.1 GitHub Login (login-github.php)

```php
<?php
require __DIR__ . '/bootstrap.php';

$provider = getProvider('github');

$authUrl = $provider->getAuthorizationUrl();
$_SESSION['oauth2state'] = $provider->getState();

header('Location: ' . $authUrl);
exit;
```

### Line-by-line explanation
- Line 1: Load dependencies and start session via bootstrap.
- Line 4: Resolve the GitHub provider from the registry.
- Line 7-8: Build the authorization URL and store the state in session for CSRF protection.
- Line 11-12: Redirect the user to GitHub for consent and finish.

### 3.2 GitHub Callback (github-callback.php)

```php
<?php
require __DIR__ . '/bootstrap.php';

$provider = getProvider('github');

// Validate state
if (empty($_GET['state']) || $_GET['state'] !== $_SESSION['oauth2state']) {
    unset($_SESSION['oauth2state']);
    http_response_code(400);
    exit('Invalid state');
}
unset($_SESSION['oauth2state']);

// Exchange the authorization code for an access token
$token = $provider->getAccessToken('authorization_code', [
    'code' => $_GET['code'],
]);

// Retrieve the resource owner (user) details
$resourceOwner = $provider->getResourceOwner($token);
$userData = $resourceOwner->toArray();

// Normalize to a common user shape
$_SESSION['user'] = [
    'provider' => 'github',
    'id'       => $userData['id'] ?? null,
    'name'     => $userData['name'] ?? $userData['login'] ?? null,
    'email'    => $userData['email'] ?? null,
    'avatar'   => $userData['avatar_url'] ?? null,
];

// Redirect to a protected area
header('Location: /profile.php');
exit;
```

### Line-by-line explanation
- Line 3: Load dependencies and session bootstrap.
- Line 6: Get the GitHub provider instance.
- Lines 9-14: Validate OAuth state to prevent CSRF; respond with error if invalid.
- Lines 17-21: Exchange the authorization code for an access token from GitHub.
- Lines 24-29: Fetch user data from GitHub’s user API and convert to an array.
- Lines 32-39: Normalize data into a consistent user structure across providers; store in session; redirect to profile.

## 4. Unified User Handling and Session Management

Code: a small helper for normalizing provider-specific user data into a single shape, and an example of a simple profile page (profile.php) that consumes the normalized session data.

### 4.1 User normalization helper (normalize-user.php)

```php
<?php
// normalize-user.php
function normalizeOAuthUser(string $provider, array $data): array {
    switch ($provider) {
        case 'google':
            return [
                'provider' => 'google',
                'id'       => $data['sub'] ?? null,
                'name'     => $data['name'] ?? null,
                'email'    => $data['email'] ?? null,
                'avatar'   => $data['picture'] ?? null,
            ];
        case 'github':
            return [
                'provider' => 'github',
                'id'       => $data['id'] ?? null,
                'name'     => $data['name'] ?? $data['login'] ?? null,
                'email'    => $data['email'] ?? null,
                'avatar'   => $data['avatar_url'] ?? null,
            ];
        default:
            return [
                'provider' => $provider,
                'id'       => null,
                'name'     => null,
                'email'    => null,
                'avatar'   => null,
            ];
    }
}
```

### 4.2 Simple profile page example (profile.php)

```php
<?php
session_start();
$user = $_SESSION['user'] ?? null;

if (!$user) {
    header('Location: /login.php');
    exit;
}

echo "<h1>Welcome, " . htmlspecialchars($user['name'] ?? 'User') . "!</h1>";
echo "<p>Logged in via: " . htmlspecialchars($user['provider']) . "</p>";
if (!empty($user['email'])) {
    echo "<p>Email: " . htmlspecialchars($user['email']) . "</p>";
}
if (!empty($user['avatar'])) {
    echo "<img src='" . htmlspecialchars($user['avatar']) . "' alt='Avatar' width='100' height='100' />";
}
```

### Line-by-line explanation
- normalize-user.php: The function maps provider-specific fields to a consistent user schema. It allows the rest of the app to treat users uniformly regardless of login provider.
- profile.php: A simple session-backed profile view that requires authentication and safely displays the user’s details.

## 5. Common Beginner Mistakes

### X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not validating the state parameter (CSRF)
Bad:
```php
// google-callback.php (unsafe)
$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
```
Good:
```php
// google-callback.php (safe)
if (empty($_GET['state']) || $_GET['state'] !== $_SESSION['oauth2state']) {
    exit('Invalid state');
}
$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
```

- Pitfall 2: Proceeding with token exchange even when the provider redirects with an error
Bad:
```php
$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
```
Good:
```php
if (isset($_GET['error'])) {
    // Handle error gracefully
    exit('OAuth error: ' . htmlspecialchars($_GET['error']));
}
$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
```

- Pitfall 3: Storing tokens insecurely (e.g., in public cookies or logs)
Bad:
```php
error_log(json_encode($token)); // token logged
setcookie('oauth_token', (string)$token, time() + 3600);
```
Good:
```php
// Store only a session-scoped minimal data, and never tokens in cookies
$_SESSION['oauth2_token'] = [
    'access_token' => (string) $token->getToken(),
    'expires_at'   => $token->getExpires(),
];
```

- Pitfall 4: Relying on provider user data without validation
Bad:
```php
$user = $provider->getResourceOwner($token)->toArray();
```
Good:
```php
$userRaw = $provider->getResourceOwner($token)->toArray();
$user = normalizeOAuthUser('google', $userRaw);
// Then validate required fields
if (empty($user['id']) || empty($user['email'])) {
    exit('Incomplete user data');
}
```

- Pitfall 5: Not enforcing HTTPS in production or using localhost without clear session security
Bad:
- Running on HTTP in a public environment (risky)
Good:
- Always use HTTPS in production, set secure and httpOnly flags on session cookies:
```ini
; php.ini or runtime config
session.cookie_secure = 1
session.cookie_httponly = 1
```

- Pitfall 6: Missing error handling for token fetch failures
Bad:
```php
$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
```
Good:
```php
try {
    $token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
} catch (\League\OAuth2\Client\Provider\Exception\IdentityProviderException $e) {
    // Log and show user-friendly message
    error_log($e->getMessage());
    exit('Authentication failed');
}
```

## 6. Why This Matters In Real Systems

- Security and trust: Delegating authentication to Google/GitHub reduces password management risk, but you must still protect tokens, validate state, and guard redirect URIs.
- Compliance and auditing: Logging, revocation, and token expiry behavior matter when auditing access for sensitive data.
- Scalability: A clean, provider-agnostic abstraction (normalize user data, consistent session storage) makes it easier to support additional providers later.
- User experience: A smooth flow with minimal FRI (friction) permits single sign-on experiences across services, faster onboarding, and better retention.
- Operational concerns: Treat token storage, refresh handling (if used), and scope minimization as part of your security posture. Enforce HTTPS, monitor for anomalous login patterns, and implement logout/invalidation flows.

## 7. Study Questions

1) What is the purpose of the state parameter in OAuth 2.0, and how should you validate it in your callback?  
2) How do you retrieve the authenticated user’s profile after exchanging the authorization code for an access token in Google?  
3) Why is it important to normalize user data from different providers into a common schema?  
4) List three secure practices you should apply when storing OAuth tokens in a PHP application.  
5) How would you extend this setup to support a new provider (e.g., LinkedIn) using the same pattern?

## 8. Exercise — Practical multi-part coding challenge

Part A — Project setup
- Add dependencies to your PHP project:
  - composer require league/oauth2-client
  - composer require league/oauth2-google
  - composer require league/oauth2-github
- Create a .env (or equivalent) with your Google and GitHub client IDs, secrets, and redirect URIs.

Part B — Implement a combined login flow
- Create a small bootstrap.php that:
  - Starts a session
  - Initializes provider instances for Google and GitHub (as shown in Section 1)
  - Exposes a getProvider($name) helper
- Create login.php with two options:
  - A link/button for “Login with Google”
  - A link/button for “Login with GitHub”
  - Each should route to login-google.php or login-github.php respectively.

Part C — Implement callback handlers
- Implement google-callback.php and github-callback.php following the patterns shown in Sections 2 and 3.
- Each callback should:
  - Validate state
  - Exchange the code for a token
  - Retrieve and normalize the user data
  - Store a minimal, secure representation in the session
  - Redirect to profile.php

Part D — Create a profile and logout flow
- Create profile.php to display the user’s normalized data (similar to profile.php example).
- Create logout.php to clear the session and redirect to login page.

Part E — Basic integration test
- Exercise a scenario where:
  - A user clicks “Login with Google,” completes consent, and lands on profile.php.
  - A user clicks “Login with GitHub,” completes consent, and lands on profile.php.
- Verify that session data is consistent, and that the profile displays provider, name, email, and avatar when available.

Part F — Optional extension (PKCE for SPA-style flows)
- If your app includes a frontend SPA that uses a backend-based OAuth flow, implement PKCE for additional security in the authorization request and token exchange, per provider capability.
- Document how PKCE changes your login flow and where the code_verifier/code_challenge values are stored and validated.

Note: In production, replace the simple $_ENV usage with a proper environment variable loader, enforce HTTPS, validate redirect URIs per provider requirements, and store user records in a database rather than sessions for long-term sessions.