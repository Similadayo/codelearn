# JWT — Stateless Authentication in Ruby

Stateless authentication using JSON Web Tokens (JWT) lets your backend verify who a user is without storing session data on the server. In Ruby apps (Rails or plain Rack), JWTs enable scalable authentication by encoding user claims into a signed token that the client proves on every request. This lesson covers how to encode, decode, validate claims, and architect secure usage patterns in real systems.

## 1. JWT Basics with Ruby (Encoding & Decoding)

Learn how to create and verify JWTs in Ruby using the jwt gem. This example shows a simple encode/decode flow with HS256 and a secret stored in an environment variable.

Code:
```ruby
# Gemfile
# gem 'jwt'

require 'jwt'
require 'json'
require 'time'

# In real apps, load this from ENV
SECRET = ENV['JWT_SECRET'] || 'default_secret'

# 1) Build a payload with standard claims
payload = {
  sub: 42,                 # subject (user id)
  name: 'Ada Lovelace',
  exp: (Time.now + 60 * 60).to_i,  # 1 hour from now
  iat: Time.now.to_i,
  iss: 'myapp',             # issuer
  aud: 'myapp:backend'        # audience
}

# 2) Encode the token with HS256
token = JWT.encode(payload, SECRET, 'HS256')  # returns a string

# 3) Decode/verify the token
begin
  decoded = JWT.decode(token, SECRET, true, { algorithm: 'HS256' })
  payload_out = decoded[0]          # payload payload_out
  headers_out = decoded[1]          # header
  puts "Decoded payload: #{payload_out}"
rescue JWT::ExpiredSignature
  puts 'Token has expired'
rescue JWT::InvalidIssuerError
  puts 'Invalid issuer'
rescue JWT::DecodeError => e
  puts "Decode error: #{e.message}"
end
```

### Line-by-line explanation

1) Comment about the gem used for encoding/decoding JWTs.  
2) Require the jwt library to access encode/decode methods.  
3) Require JSON and Time utilities for payload construction.  
6) Load the secret key from environment (fallback to a default for local testing).  
9) Create a payload with standard claims: sub (user id), name, exp (expiration), iat (issued at), iss (issuer), aud (audience).  
15) Encode the payload using HS256 with the secret; returns a JWT string.  
18) Attempt to decode/verify the token with the same secret and algorithm.  
19) Extract the payload from the decoded result (JWT.decode returns [payload, header]).  
20) Print the decoded payload for debugging/verification.  
21-27) Rescue specific JWT errors to handle expiration, issuer issues, or generic decode problems.

X-Notes
- This starts as a baseline: HS256 with a shared secret. For production, prefer RS256 with a private/public key pair.

## 2. Validating Exp, Iss, and Aud in Ruby (Robust Claims)

Tokens must be validated not only for signature but also for expiration and intended audience/issuer. This example shows how to enforce these checks in Ruby using the jwt gem.

Code:
```ruby
require 'jwt'
require 'time'

SECRET = ENV['JWT_SECRET'] || 'default_secret'

payload = {
  sub: 123,
  iss: 'myapp',
  aud: 'myapp:backend',
  exp: Time.now.to_i + 30 * 60,  # 30 minutes from now
  iat: Time.now.to_i
}

token = JWT.encode(payload, SECRET, 'HS256')

begin
  # enforce issuer, audience, and expiration checks
  decoded = JWT.decode(
    token,
    SECRET,
    true,
    {
      algorithm: 'HS256',
      iss: 'myapp',           # require this issuer
      verify_iss: true,
      aud: 'myapp:backend',     # require this audience
      verify_aud: true,
      verify_exp: true
    }
  )
  claims = decoded[0]
  puts "Authenticated user id: #{claims['sub']}"
rescue JWT::ExpiredSignature
  puts 'Token expired; require re-authentication.'
rescue JWT::InvalidIssuerError
  puts 'Issuer mismatch.'
rescue JWT::InvalidAudienceError
  puts 'Audience mismatch.'
rescue JWT::DecodeError => e
  puts "Invalid token: #{e.message}"
end
```

### Line-by-line explanation

1) Require the JWT library.  
2) Require time utilities for concise time calculations.  
4) Load the secret key from environment with a fallback for dev.  
6) Construct a payload including sub, iss, aud, exp, and iat.  
12) Encode the token with HS256 and the secret.  
16) Begin decoding with strict verification:
- algorithm HS256
- iss must be 'myapp', with verify_iss: true
- aud must be 'myapp:backend', with verify_aud: true
- verify_exp: true to enforce expiration  
23) Extract the payload (claims) from decoded token.  
24) Print the authenticated user id.  
25-32) Rescue specific exceptions for expiration, issuer, audience, and generic decode errors.

Best practice note
- For production, prefer RS256 (asymmetric) so you don’t share a single secret between services.

## 3. Best Practices in Ruby: Secrets, Refresh, and Revocation

Stateless JWTs are powerful, but you still need a solid strategy for key management, token lifetimes, and revocation. This section shows patterns you’ll likely implement in real apps: rotating keys, short-lived access tokens, and a refresh mechanism.

Code:
```ruby
require 'jwt'
require 'openssl'
require 'time'

# 1) Load asymmetric keys (RS256) from ENV or files
private_key = OpenSSL::PKey::RSA.new(ENV['JWT_PRIVATE_KEY'] || File.read('/path/to/private.pem'))
public_key  = OpenSSL::PKey::RSA.new(ENV['JWT_PUBLIC_KEY']  || File.read('/path/to/public.pem'))

def issue_access_token(user_id:, private_key:, exp_minutes: 15)
  payload = {
    sub: user_id,
    iss: 'myapp',
    aud: 'myapp:backend',
    iat: Time.now.to_i,
    exp: (Time.now + exp_minutes * 60).to_i
  }
  JWT.encode(payload, private_key, 'RS256')
end

def decode_and_validate(token, public_key)
  JWT.decode(token, public_key, true, { algorithm: 'RS256', iss: 'myapp', verify_iss: true, aud: 'myapp:backend', verify_aud: true, verify_exp: true })[0]
rescue JWT::ExpiredSignature
  nil
rescue JWT::DecodeError
  nil
end

# Simple usage
access_token = issue_access_token(user_id: 7, private_key: private_key, exp_minutes: 15)
puts "Access token: #{access_token}"

claims = decode_and_validate(access_token, public_key)
puts "Claims: #{claims}"
```

### Line-by-line explanation

1) Require the jwt library, OpenSSL for keys, and time utilities.  
4) Load private/public keys from environment or filesystem—RS256 requires asymmetric keys.  
6) Define a helper to issue an access token:
7) Build a payload including sub, iss, aud, iat, exp.  
14) Sign the token with the private key using RS256.  
17) Define a helper to decode and validate the token:
18) Attempt to decode with the public key and verify issuer, audience, and expiration.  
19) Return the payload (claims) on success.  
20-22) Rescue ExpiredSignature and generic DecodeError by returning nil to signal invalid token.  
26) Generate an example token and print it.  
29) Decode and print the validated claims.

Common practice notes
- Use RS256 for public-key cryptography to avoid distributing shared secrets.
- Keep access tokens short-lived (e.g., 15 minutes) and implement a refresh token flow to obtain new access tokens without re-authenticating users.

## X. Common Beginner Mistakes

Bad vs Good side-by-side examples

- Secret management
  - Bad:
    token = JWT.encode(payload, 'very_secret', 'HS256')
  - Good:
    secret = ENV['JWT_SECRET'] or raise 'JWT_SECRET not configured'
    token = JWT.encode(payload, secret, 'HS256')

- Verifying expiration
  - Bad:
    JWT.decode(token, secret, true, algorithm: 'HS256')
    # but you ignore Exp errors later
  - Good:
    JWT.decode(token, secret, true, { algorithm: 'HS256', verify_exp: true })

- Issuer/Audience checks
  - Bad:
    JWT.decode(token, secret, true, { algorithm: 'HS256' })
    # no issuer/audience constraints
  - Good:
    JWT.decode(token, secret, true, { algorithm: 'HS256', iss: 'myapp', verify_iss: true, aud: 'myapp:backend', verify_aud: true })

- Transport channel
  - Bad:
    Sending tokens in URL query strings (e.g., ?token=…)
  - Good:
    Use Authorization header: "Authorization: Bearer <token>"

- Error handling
  - Bad:
    begin
      JWT.decode(token, secret, true, { algorithm: 'HS256' })
      # no rescue blocks
    end
  - Good:
    begin
      JWT.decode(token, secret, true, { algorithm: 'HS256' })
    rescue JWT::ExpiredSignature
      # handle token expiry gracefully
    rescue JWT::DecodeError => e
      # handle invalid token
    end

- Token revocation
  - Bad:
    Just rely on short expiry without a revocation mechanism
  - Good:
    Implement short-lived access tokens plus a revocation/blacklist mechanism or a refresh token flow with server-side state where needed.

## Y. Why This Matters In Real Systems

- Scalability: Stateless JWTs remove server-side session storage, enabling easier horizontal scaling. No shared session store is required between app servers.
- Security posture: Short-lived tokens limit the window of abuse if a token leaks. However, you must protect the token on the client (use HttpOnly, Secure cookies or Authorization headers) and combat XSS/CSRF risks accordingly.
- Key management: Secrets must be rotated safely. Consider RS256 with a public/private key pair so you don’t have to rotate a single shared secret across services.
- Revocation: JWTs can't be removed from the client once issued unless you implement a revocation strategy (e.g., short lifetimes + refresh tokens, a token store, or a blacklist).
- Observability: Centralized logging of token issuance/validation helps detect misuse. Include claims like iss, aud, and sub in access logs for traceability.

Real-world usage patterns
- Access tokens: short O(15 minutes) lifespan with per-user claims.
- Refresh tokens: longer lifespan (days/weeks) stored securely and used to obtain new access tokens.
- For mobile/web apps, consider using OAuth2/OIDC with a trusted provider to offload token issuance and verification to a secure authority.
- If you operate microservices, RS256 is often preferred to avoid shared secrets across services.

## Z. Study Questions

1) What is the purpose of the exp claim in a JWT, and how is it enforced in Ruby with the jwt gem?  
2) How does RS256 differ from HS256 regarding key management, and why might you prefer RS256 in a production system?  
3) What are two common strategies to revoke or rotate tokens in a stateless JWT system?  
4) Why should you avoid sending tokens in URL query parameters, and what is the recommended transport method?  
5) How would you verify the issuer and audience claims in a Ruby application using the jwt gem?

## Exercise

Part A: Build a small JWT utility

- Create a Ruby module JwtService with two methods:
  - self.encode(payload, key, algo = 'HS256'): returns a JWT string
  - self.decode(token, key, options = {}): returns the payload if valid, raises or returns nil if invalid

Requirements:
- Accept a payload hash with standard claims (sub, iss, aud, exp, iat).
- Validate signature and exp by default (verify_exp: true).
- Allow optional issuer/audience verification (verify_iss, verify_aud).

Code skeleton:
```ruby
# lib/jwt_service.rb
require 'jwt'

module JwtService
  DEFAULT_ALGO = 'HS256'

  def self.encode(payload, key, algo = DEFAULT_ALGO)
   JWT.encode(payload, key, algo)
  end

  def self.decode(token, key, options = {})
    opts = {
      algorithm: (options[:algorithm] || DEFAULT_ALGO),
      verify_exp: true
    }.merge(options)
    decoded = JWT.decode(token, key, true, opts)
    decoded[0] # return payload
  rescue JWT::ExpiredSignature
    nil
  rescue JWT::DecodeError
    nil
  end
end
```

Part B: Quick usage test (CLI)

- Write a small Ruby script that:
  - Creates an access token for user_id 99 with exp 20 minutes from now using a symmetric secret from ENV or a fallback.
  - Decodes the token and prints the payload, or prints an error if invalid/expired.

Part C: Minimal protected endpoint (Rack)

- Create a tiny Rack app (config.ru) that requires a Bearer token on any request and responds with a 401 for missing/invalid tokens and 200 with a simple message for valid tokens.
- Use JwtService to decode the token with a shared SECRET.

Attempt to implement these parts and run locally to verify the flow end-to-end. Include error cases like expired token to confirm you can handle them gracefully.

If you’d like, I can tailor these examples to a specific framework (Rails, Sinatra, or Hanami) and provide a ready-to-run snippet for that stack.