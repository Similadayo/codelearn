# OAuth 2.0 — Login with Google / GitHub in Ruby

OAuth 2.0 login with Google and GitHub lets your backend verify user identities via trusted providers, offloading authentication concerns to proven systems. This approach improves security, reduces password handling, and speeds up user onboarding. In Ruby environments (especially Rails), OmniAuth provides a clean, battle-tested path to integrate multiple providers with minimal boilerplate, while giving you full control over how you persist user sessions and tokens in production systems.

## 1. Understanding the OAuth 2.0 login flow in Ruby

OAuth 2.0 authorization involves redirecting the user to the provider, the user authorizes access, and the provider redirects back with an authorization code (which is exchanged for tokens). In web apps, a common pattern is to use a middleware library (like OmniAuth) that abstracts the code exchange and returns a rich auth hash you can persist.

- User clicks "Sign in with Google" or "Sign in with GitHub".
- User is redirected to the provider's login/consent screen.
- Provider redirects back to your app with a callback URL containing an authorization code.
- Your app exchanges the code for an access token (and possibly a refresh token) and builds/founds a User object.
- The app creates a session for the user.

Code sketch (conceptual, not Rails wiring):
```ruby
# Conceptual (not a full Rails app)
# Build the provider authorization URL (provider handles this in OmniAuth)
authorize_url = "https://accounts.google.com/o/oauth2/auth?client_id=#{CLIENT_ID}&redirect_uri=#{REDIRECT_URI}&response_type=code&scope=openid%20email%20profile&state=#{SecureRandom.hex(16)}"
```

### Line-by-line explanation
- Constructs a standard Google OAuth 2.0 authorization URL with the required query parameters.
- client_id: your Google OAuth client ID.
- redirect_uri: where Google will send the user after consent.
- response_type=code: we want an authorization code to exchange for tokens.
- scope: the information you request (openid, email, profile).
- state: a random token to mitigate CSRF.

Common patterns in Ruby/Rails use a dedicated middleware to avoid manually composing this URL. OmniAuth handles the redirect and callback plumbing for multiple providers.

## 2. Setting up Google and GitHub OAuth apps (credentials, scopes, redirects)

Before coding, you must create OAuth apps in each provider’s developer console and configure redirect URLs to point to your app’s callback endpoint, then keep credentials secure (environment variables or secret management).

Key steps:
- Google: create a project, enable OAuth 2.0 Client IDs, set Redirect URI to: https://yourapp.com/auth/google_oauth2/callback
- GitHub: create a OAuth App, set Authorization Callback URL to: https://yourapp.com/auth/github/callback
- Use environment variables to keep client IDs/secrets out of code.

Example credentials usage (environment variables or Rails credentials):
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

Code snippet demonstrating how credentials are read in a Rails initializer:
```ruby
# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2, ENV['GOOGLE_CLIENT_ID'], ENV['GOOGLE_CLIENT_SECRET'], {
    scope: 'userinfo.email, userinfo.profile',
    prompt: 'select_account'
  }

  provider :github, ENV['GITHUB_CLIENT_ID'], ENV['GITHUB_CLIENT_SECRET'], {
    scope: 'user:email'
  }
end
```

### Line-by-line explanation
- Define the OmniAuth middleware with two providers: Google and GitHub.
- provider :google_oauth2: Google strategy; passes client id/secret from env vars.
- scope: requests the user’s email and profile data; prompt: 'select_account' prompts account selection.
- provider :github: GitHub strategy; reads credentials from env vars.
- scope: 'user:email' asks for access to the user’s primary email.

## 3. Rails integration with OmniAuth: Gemfile, initializer, routes

OmniAuth is the glue between your Rails app and the providers. You’ll add gems, configure middleware, and wire routes for the auth callback and failures.

Code: Gemfile additions
```ruby
# Gemfile
gem 'omniauth', '~> 2.0'
gem 'omniauth-google-oauth2'
gem 'omniauth-github'
```

### Line-by-line explanation
- Adds OmniAuth core and provider-specific gems for Google and GitHub.
- OmniAuth 2.x provides a standardized, middleware-based approach to multiple providers.

Code: Routes and controller wiring
```ruby
# config/routes.rb
Rails.application.routes.draw do
  root 'home#index'
  get '/auth/:provider/callback', to: 'sessions#create'
  get '/auth/failure', to: 'sessions#failure'
  delete '/logout', to: 'sessions#destroy'
end
```

```ruby
# app/controllers/sessions_controller.rb
class SessionsController < ApplicationController
  def create
    auth = request.env['omniauth.auth']
    user = User.find_or_create_from_omniauth(auth)
    session[:user_id] = user.id
    redirect_to root_path, notice: "Signed in as #{user.name || user.email}"
  rescue => e
    redirect_to root_path, alert: "Authentication error: #{e.message}"
  end

  def failure
    redirect_to root_path, alert: "Authentication failed"
  end

  def destroy
    session.delete(:user_id)
    redirect_to root_path, notice: "Signed out"
  end
end
```

### Line-by-line explanation
- Routes: map the provider callback to SessionsController#create; provide a failure route for errors; add a logout route.
- SessionsController#create: pulls the OmniAuth auth hash from the request environment, finds or creates a User, stores user_id in session, redirects with a success message.
- rescue clause: ensures a friendly failure path if something goes wrong during processing.
- SessionsController#failure: handles explicit auth failures from OmniAuth.
- destroy: clears the user session on logout.

Code: User model with OmniAuth persistence
```ruby
# app/models/user.rb
class User < ApplicationRecord
  validates :provider, :uid, presence: true

  def self.find_or_create_from_omniauth(auth)
    user = where(provider: auth.provider, uid: auth.uid).first_or_initialize
    user.name  = auth.info.name
    user.email = auth.info.email
    user.image = auth.info.image
    user.token = auth.credentials.token
    user.refresh_token = auth.credentials.refresh_token
    user.token_expires_at = Time.at(auth.credentials.expires_at) if auth.credentials.expires_at
    user.save!
    user
  end
end
```

### Line-by-line explanation
- Validates presence of provider and uid since they uniquely identify a user from the provider.
- find_or_create_from_omniauth: locates the user by provider and uid; initializes if missing.
- Updates user attributes with data from the auth hash (name, email, avatar).
- Persists tokens and expiry when provided; saves the user.
- Returns the user object used by the session logic.

Code: Minimal login view with provider links
```erb
<!-- app/views/home/index.html.erb -->
<% if current_user %>
  Signed in as <%= current_user.name || current_user.email %>.
  <%= button_to "Logout", logout_path, method: :delete %>
<% else %>
  <%= link_to "Sign in with Google", "/auth/google_oauth2" %>
  <%= link_to "Sign in with GitHub", "/auth/github" %>
<% end %>
```

### Line-by-line explanation
- If a user is logged in, display their identity and a logout button.
- If not logged in, present sign-in links that route to OmniAuth-driven callbacks.

Code: Helper for current_user (optional but common)
```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  helper_method :current_user

  def current_user
    @current_user ||= User.find_by(id: session[:user_id])
  end
end
```

### Line-by-line explanation
- Exposes a current_user helper for views/controllers.
- Reads the user_id from the session to fetch the User instance.

## 4. Handling the callback data, token storage, and session management

A robust implementation stores user identifiers and tokens securely, refreshes tokens when possible, and avoids leaking tokens in logs. This section shows best practices around the auth hash usage and token persistence.

Code: Securely handling tokens (illustrative example)
```ruby
# app/models/user.rb (updated snippet)
class User < ApplicationRecord
  validates :provider, :uid, presence: true

  def self.find_or_create_from_omniauth(auth)
    user = where(provider: auth.provider, uid: auth.uid).first_or_initialize

    user.assign_attributes(
      name:  auth.info.name,
      email: auth.info.email,
      image: auth.info.image
    )

    # Token handling: store only what's needed and encrypt sensitive data
    if auth.credentials
      user.token = auth.credentials.token
      user.refresh_token = auth.credentials.refresh_token
      user.token_expires_at = Time.at(auth.credentials.expires_at) if auth.credentials.expires_at
    end

    user.save!
    user
  end
end
```

### Line-by-line explanation
- assign_attributes: updates non-sensitive user fields from the auth hash.
- Stores access_token and refresh_token only when provided.
- Converts expires_at (epoch seconds) to a Time object when available.
- Persists the user record with the updated tokens.

Code: Example guard for callback failure and logging
```ruby
# config/initializers/omniauth.rb (extended)
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2, ENV['GOOGLE_CLIENT_ID'], ENV['GOOGLE_CLIENT_SECRET'], {
    scope: 'userinfo.email, userinfo.profile',
    prompt: 'select_account'
  }

  provider :github, ENV['GITHUB_CLIENT_ID'], ENV['GITHUB_CLIENT_SECRET'], {
    scope: 'user:email'
  }
end

# Optional: customize OmniAuth failure endpoint
OmniAuth.config.on_failure = Proc.new { |env|
  # Log details securely (avoid leaking secrets) and redirect
  message = env['omniauth.error']&.message || "Unknown error"
  Rails.logger.warn("OAuth failure: #{message}")
  [302, { 'Location' => '/auth/failure', 'Content-Type' => 'text/html' }, []]
}
```

### Line-by-line explanation
- Repeats provider declarations with scopes; ensures account selection prompt for Google.
- Adds a global failure handler to log failures and redirect safely instead of exposing raw errors to users.

## 5. Security considerations and best practices

Security in OAuth-based sign-in is central. Consider CSRF protection, token handling, and least privilege.

Key points:
- CSRF protection: Use the provider’s state parameter via OmniAuth to prevent cross-site request forgery.
- Token storage: Don’t log tokens; store them securely (encrypted fields or separate secure storage). Consider periodic token refresh logic.
- Scope minimization: Request only the scopes needed for your app (email, profile). Avoid requesting sensitive scopes unless required.
- Redirect URIs: Use exact, registered redirect URIs; avoid dynamic redirects to prevent open redirect vulnerabilities.
- Error handling: Graceful fallbacks for failed sign-in attempts (no sensitive error details).
- Session management: Use secure, HttpOnly cookies; consider short session lifetimes and re-authentication for sensitive actions.

Code snippet: Example of securing sensitive data
```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Assume a Rails 7 app with encrypted attributes
  encrypts :token, :refresh_token

  def token_expired?
    token_expires_at && Time.current >= token_expires_at
  end
end
```

### Line-by-line explanation
- encrypts :token, :refresh_token uses Rails encryption to ensure tokens are at rest protected.
- token_expired? helper to decide when a token needs refreshing.

Code: CSRF/state and redirect URI sanity
```ruby
# config/initializers/omniauth.rb (additional checks)
OmniAuth.config.allowed_csources = [
  'https://accounts.google.com',
  'https://github.com/login/oauth'
]

# If your app uses multiple subdomains, ensure callback URL is always absolute
filesystem: "https://myapp.example.com/auth/google_oauth2/callback"
```

### Line-by-line explanation
- Defines allowed provider endpoints to mitigate redirection to untrusted hosts.
- Ensures callback URLs are absolute and consistent to prevent open redirect vectors.

## 6. Testing and production readiness

Test across providers, ensure environment variables are loaded in all environments, and verify logging, error handling, and user persistence.

Testing ideas:
- Unit tests for User.find_or_create_from_omniauth with mock auth hashes.
- Integration tests simulating the OmniAuth flow (with test mode in OmniAuth).
- End-to-end tests verifying login, session creation, and logout.

Code: RSpec examples (simplified)
```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  it 'finds or creates a user from omniauth data' do
    auth = OmniAuth::AuthHash.new(
      provider: 'google_oauth2',
      uid: '12345',
      info: { name: 'Alice Doe', email: 'alice@example.com', image: 'https://example.com/avatar.png' },
      credentials: { token: 'token123', expires_at: Time.now.to_i + 3600, refresh_token: 'refresh123' }
    )
    user = User.find_or_create_from_omniauth(auth)
    expect(user.uid).to eq('12345')
    expect(user.email).to eq('alice@example.com')
  end
end
```

### Line-by-line explanation
- Builds a synthetic OmniAuth hash for Google.
- Ensures the User.find_or_create_from_omniauth creates or updates a user with the provided data.
- Verifies key fields were set as expected.

Study the interplay between the provider, token storage, and session so you can reason about token refresh and re-authentication needs in production.

## X. Common Beginner Mistakes

- Bad: Hard-coding credentials in source code
  - Bad
  ```ruby
  # app/controllers/some_controller.rb (bad)
  GOOGLE_CLIENT_ID = 'your-client-id'
  GOOGLE_CLIENT_SECRET = 'your-secret'
  ```

  - Good
  ```ruby
  # app/config (good)
  GOOGLE_CLIENT_ID = ENV['GOOGLE_CLIENT_ID']
  GOOGLE_CLIENT_SECRET = ENV['GOOGLE_CLIENT_SECRET']
 ```

- Bad: Not scoping data stored from tokens (leaving tokens in user logs)
  - Bad
  ```ruby
  Rails.logger.info("OAuth credentials: #{auth.credentials.inspect}")
  ```

  - Good
  ```ruby
  # Only log non-sensitive identifiers
  Rails.logger.info("OAuth sign-in: provider=#{auth.provider}, uid=#{auth.uid}")
  ```

- Bad: Over-sharing user data or requesting excessive scopes
  - Bad
  ```ruby
  scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
  ```
  - Good
  ```ruby
  scope: 'openid email profile'
  ```

- Bad: Storing tokens in plain text without encryption
  - Bad
  ```ruby
  user.update(token: auth.credentials.token, refresh_token: auth.credentials.refresh_token)
  ```
  - Good
  ```ruby
  user.update(token_ciphertext: encrypt(auth.credentials.token),
              refresh_token_ciphertext: encrypt(auth.credentials.refresh_token))
  # Or use Rails encrypted attributes
  ```

- Bad: Not handling callback failures or denied access
  - Bad
  ```ruby
  def create
    auth = request.env['omniauth.auth']
    User.find_or_create_from_omniauth(auth)
    # assume success
  end
  ```
  - Good
  ```ruby
  def create
    auth = request.env['omniauth.auth']
    if auth.present?
      user = User.find_or_create_from_omniauth(auth)
      session[:user_id] = user.id
      redirect_to root_path, notice: "Signed in"
    else
      redirect_to root_path, alert: "Authentication failed"
    end
  end
  ```

## Y. Why This Matters In Real Systems

- Security and trust: Offloading authentication to Google/GitHub reduces the attack surface and lets you rely on provider security.
- Compliance and lifecycle: Tokens require careful handling, rotation, and revocation policies; OAuth scopes should be minimized to the necessary data.
- User experience: SSO with familiar providers improves conversion and reduces password fatigue for users.
- Operational visibility: Audit trails of login events, failed logins, and token expiry help with incident response and compliance.
- Production readiness: Proper environment management (CI/CD, secret management), monitoring, and error handling ensure reliable sign-in flows.

## Z. Study Questions

1. What are the core steps in the OAuth 2.0 "authorization code" grant flow when used for login in a Rails app?
2. Why is the state parameter important in OAuth 2.0, and how does OmniAuth help protect against CSRF?
3. How should you store OAuth access and refresh tokens in a Rails application to balance security and functionality?
4. What are common pitfalls when configuring Google and GitHub OAuth apps for a production Rails app?
5. How can you test the OmniAuth login flow in unit and integration tests?

## Exercise

Part A: Scaffold a minimal Rails app with OmniAuth for Google and GitHub

- Create a Rails app (or reuse an existing one) and add OmniAuth with google_oauth2 and github providers.
- Implement the user persistence model (provider, uid, name, email, image) and token storage (encrypted).
- Build a simple home page with two sign-in buttons: Google and GitHub, and a sign-out button.
- Ensure environment variables for client IDs/secrets are used (no hard-coded credentials).
- Add routes for /auth/:provider/callback, /auth/failure, and /logout.

Part B: Implement token refresh readiness

- Extend the User model to track token_expires_at and implement a method token_expired? that can be used to trigger refresh logic.
- Sketch a background job (or a service) that refreshes tokens when needed, using the refresh_token from the auth hash.

Part C: Testing

- Write an RSpec test for User.find_or_create_from_omniauth that validates correct field mapping from a mock auth hash.
- Write an integration test that simulates starting an OAuth flow and ensures a user session is created after the callback.

Part D: Security and Observability

- Add a simple logging discipline that records sign-in events without exposing tokens.
- Verify that tokens are stored in encrypted form (or in a secure store) and not in logs.

Deliverable: Provide the code for the core components (Gemfile entries, initializer, routes, sessions controller, user model, and a minimal view with login links) along with at least one test illustrating the OmniAuth flow handling. Include brief explanations of how to run the app locally (e.g., ensuring Redis or a database is running, environment variables are set, and the app is started via Rails server).