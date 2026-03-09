# OAuth 2.0 — Login with Google / GitHub in Node.js

OAuth 2.0 is the backbone of secure, user-friendly authentication in modern web services. By enabling “Login with Google” and “Login with GitHub,” you let users sign in with existing accounts, reducing friction, improving security, and offloading credential management to trusted providers. In professional backend engineering, implementing robust OAuth flows correctly is essential for protecting user data, maintaining regulatory compliance, and enabling scalable social login experiences across services.

## 1. OAuth 2.0 Concepts and Flow for Social Logins
In this section, you’ll see the high-level flow of social logins using the Authorization Code grant. This is the standard pattern for server-side apps that keep client secrets confidential. The provider (Google or GitHub) issues an authorization code after user authentication, your server exchanges that code for an access token (and optionally a refresh token), and you retrieve the user profile to create a local session.

```js
// High-level sequence (pseudo-code)
GET /auth/:provider          // redirect user to provider with client_id, redirect_uri, scope, state
Provider auth page -> user logs in
→ Redirect to /auth/:provider/callback with code and state
GET /auth/:provider/callback   // server exchanges code for access_token, fetches profile
→ Create/find local user, establish session, redirect to app
```

### Line-by-line explanation breaking down each line
- GET /auth/:provider: Initiates the OAuth flow by directing the user to the provider’s authorization endpoint.
- Provider auth page -> user logs in: The user authenticates with Google or GitHub.
- Redirect to /auth/:provider/callback: The provider redirects back to your app with a temporary authorization code and the original state.
- Server exchanges code for access_token: Your server makes a back-channel request to the provider’s token endpoint, supplying the authorization code and your client secret.
- Fetch user profile: With the access token, you request the user’s profile information from the provider’s API.
- Create/find local user: Link or create a user in your own database.
- Establish session: Create your own session or JWT to represent the logged-in user.
- Redirect to app: Send the user back into your application with an authenticated session.

## 2. Implementing Google and GitHub Login in Node.js (Express + Passport)
This section provides a complete, runnable Node.js example that enables login with Google and GitHub using Passport.js strategies. It demonstrates a minimal in-memory user store, serialize/deserialize logic, and routes for starting and completing the OAuth flows. You should run this with environment variables for client IDs/secrets and a session secret.

```js
// npm packages: express, express-session, passport, passport-google-oauth20, passport-github2, dotenv
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;

const app = express();

// Simple in-memory user store (replace with real DB in production)
const users = new Map();

// Google OAuth2.0 strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
      // request profile & email
      scope: ['profile', 'email'],
    },
    (accessToken, refreshToken, profile, cb) => {
      let user = users.get(profile.id);
      if (!user) {
        user = {
          id: profile.id,
          provider: 'google',
          displayName: profile.displayName,
          emails: profile.emails,
        };
        users.set(profile.id, user);
      }
      return cb(null, user);
    }
  )
);

// GitHub OAuth2.0 strategy
passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
      scope: ['user:email'],
    },
    (accessToken, refreshToken, profile, cb) => {
      let user = users.get(profile.id);
      if (!user) {
        user = {
          id: profile.id,
          provider: 'github',
          displayName: profile.displayName || profile.username,
          username: profile.username,
          emails: profile.emails,
        };
        users.set(profile.id, user);
      }
      return cb(null, user);
    }
  )
);

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, { id: user.id, provider: user.provider });
});

// Deserialize user from session
passport.deserializeUser((obj, done) => {
  // In a real app, fetch user by ID from DB
  const user = Array.from(users.values()).find(
    (u) => u.id === obj.id && u.provider === obj.provider
  );
  done(null, user || null);
});

// Express session and Passport initialization
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  // In production: set cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes to start OAuth flows
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/profile')
);

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/profile')
);

// Protected profile route
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('Not authenticated');
  res.json({ user: req.user });
});

// Simple login page
app.get('/login', (req, res) =>
  res.send('<a href="/auth/google">Login with Google</a><br><a href="/auth/github">Login with GitHub</a>')
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/', (req, res) => res.send('Home. <a href="/login">Login</a>'));

app.listen(3000, () => console.log('Server started on http://localhost:3000'));
```

### Line-by-line explanation breaking down each line
- require('dotenv').config(): Load environment variables from a .env file for client IDs, secrets, and secrets.
- const express = require('express'); etc.: Import core libraries.
- const app = express();: Create Express app.
- const users = new Map(): Lightweight in-memory user store (replace with a DB in real apps).
- passport.use(new GoogleStrategy(...)): Configure Google OAuth2.0 strategy with client credentials and callback URL; scopes request profile and email.
- (accessToken, refreshToken, profile, cb) => { ... }: Strategy verify callback; look up or create a user, then call cb(null, user).
- passport.use(new GithubStrategy(...)): Configure GitHub strategy similarly; request user:email scope to access email.
- (accessToken, refreshToken, profile, cb) => { ... }: GitHub verify callback; store or fetch user.
- passport.serializeUser(...): Define how to save user information into the session.
- passport.deserializeUser(...): Define how to retrieve the full user from session data.
- app.use(session(...)): Enable session handling; configure cookie behavior and secret.
- app.use(passport.initialize()); app.use(passport.session()): Initialize Passport and bind it to the session.
- app.get('/auth/google', ...): Start Google login flow; request profile and email.
- app.get('/auth/google/callback', ...): Handle Google redirect; on success go to /profile.
- app.get('/auth/github', ...): Start GitHub login flow; request user:email.
- app.get('/auth/github/callback', ...): Handle GitHub redirect; on success go to /profile.
- app.get('/profile', ...): Return user info if authenticated; otherwise 401.
- app.get('/login', ...): Simple login page with links to providers.
- app.get('/logout', ...): Log out and redirect home.
- app.get('/', ...): Home route with a login link.
- app.listen(3000, ...): Start server.

Note: For a real production app, replace the in-memory user store with a persistent database, add proper error handling, input validation, and secure session management (HTTPS, secure cookies, CSRF protection, etc.).

## 3. Security Best Practices and Practical Tips
To keep OAuth integrations robust and secure in production, adopt these practices:
- Always validate the state parameter to prevent CSRF attacks.
- Store tokens securely; avoid exposing access/refresh tokens to the client or in logs.
- Use environment variables for client secrets; never commit to source control.
- Enable HTTPS and set secure, HttpOnly cookies; use proper session management and rotation.
- Implement robust error handling for provider outages or user denial.
- Regularly rotate client secrets and monitor provider credential usage.
- Consider PKCE for public clients (mobile/SPA) where the client secret cannot be kept confidential.

### X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

#### 1) CSRF / State Not Validated
Bad:
```js
// Starts Google login without state
app.get('/auth/google', (req, res) => {
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?...');
});
```

Good:
```js
// Generate and validate a state to protect against CSRF
const crypto = require('crypto');
app.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const redirectUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/google/callback')}` +
    `&response_type=code&scope=profile%20email&state=${state}`;
  res.redirect(redirectUrl);
});
```

### Line-by-line explanation breaking down each line
- const crypto = require('crypto');: Import crypto module to generate secure random strings.
- const state = crypto.randomBytes(16).toString('hex');: Create a cryptographically strong random state.
- req.session.oauthState = state;: Store the state in the user’s session.
- Build redirect URL: Compose the provider’s authorization URL including state.
- res.redirect(redirectUrl): Redirect user to provider with state parameter.

#### 2) Bad Secrets in Code
Bad:
```js
const GOOGLE_CLIENT_ID = 'your-client-id';
const GOOGLE_CLIENT_SECRET = 'your-client-secret';
```

Good:
```js
// Use environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
```

### Line-by-line explanation breaking down each line
- Hard-coded strings in code are risky; they can be leaked via version control or dumps.
- Using process.env prevents secrets from being committed and helps rotation.

#### 3) Insecure Sessions in Production
Bad:
```js
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
```

Good:
```js
app.enable('trust proxy'); // if behind a reverse proxy
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));
```

### Line-by-line explanation breaking down each line
- app.enable('trust proxy'): Necessary when behind a reverse proxy; ensures secure cookies and IP handling.
- cookie: { secure: true, httpOnly: true, sameSite: 'lax' }: Enforces HTTPS-only cookies, prevents client-side JS access, and mitigates CSRF across sites.

#### 4) Not Handling Provider Errors or Denials
Bad:
```js
app.get('/auth/google/callback', (req, res) => {
  res.redirect('/profile');
});
```

Good:
```js
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  (req, res) => res.redirect('/profile')
);
```

### Line-by-line explanation breaking down each line
- failureRedirect: Ensures you handle authentication failures gracefully.
- The final handler only runs on success, preventing inconsistent session states.

## 4. Why This Matters In Real Systems — Production context and real usage
- Interoperability: Google and GitHub are industry-standard identity providers; leveraging them reduces password management risk for you and your users.
- Security posture: Proper state handling, secure cookies, and token handling are essential to prevent CSRF, token leakage, and session hijacking.
- Compliance and auditing: OAuth logs, grant types used, and token lifetimes influence regulatory compliance (e.g., SOC 2, GDPR). Maintain traceable login events and revoke tokens as needed.
- User experience: Social logins reduce friction; consistent error handling and clear messaging improve user trust and retention.
- Maintainability and scale: Abstract provider-specific logic behind a consistent interface; prepare for adding more providers in the future without duplicating authentication flow.

## 5. Study Questions — 5 recall questions
1. What is the purpose of the state parameter in OAuth 2.0 authorization requests?
2. Why should client secrets be stored in environment variables rather than in source code?
3. Which Passport strategies are shown for Google and GitHub in the example, and what endpoints do they use for callbacks?
4. What changes would you make to support token revocation or logout across providers?
5. How would you adapt the flow for a mobile app using PKCE as opposed to a server-side confidential client?

## 6. Exercise — Practical multi-part coding challenge
Part A: Scaffold a Node.js Express app with Google Login
- Create a new Node.js project and install dependencies: express, express-session, passport, passport-google-oauth20, dotenv.
- Implement Google login with an authorization code flow (no GitHub yet). Use environment variables for GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SESSION_SECRET.
- Store users in a simple in-memory map or a lightweight database; expose a /profile endpoint that returns the authenticated user.

Part B: Extend to Support GitHub Login
- Add a GitHubStrategy using passport-github2 with GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
- Implement /auth/github and /auth/github/callback routes.
- Ensure that both providers store/read users from the same user store and that /profile returns the current user information.

Part C: Harden Security and Observability
- Implement state parameter handling (CSRF protection) for both providers.
- Enforce secure cookies in production settings (consider proxies and HTTPS).
- Add basic error pages or redirects for login failures and a clear logout flow.

Optional extension (for extra mastery)
- Replace the in-memory user store with a real database (e.g., PostgreSQL, MongoDB) and implement user upsert logic on each OAuth callback.
- Add token introspection or a backend token store to allow revocation and session management across providers.

If you want, I can tailor this lesson to a specific project structure, provide a Git repository template, and add test scaffolding (e.g., integration tests for the OAuth routes).