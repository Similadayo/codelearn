# Password Hashing with bcrypt in Ruby

Protecting user credentials starts with strong, salt-aware password hashing. In Ruby, the bcrypt gem provides a proven, memory-hard hashing function with automatic salt handling and a tunable cost factor. This lesson teaches how to hash passwords securely, verify them, and integrate bcrypt into a Ruby backend without Rails. Mastery here reduces risk of credential leaks in production systems and is a foundational skill for authentication in any backend service.

## 1. bcrypt in Ruby: concepts, benefits, and setup

This section introduces bcrypt, why the cost factor matters, and how to set up the gem in a Ruby project.

Code example:
```ruby
# Minimal setup: install and require bcrypt, then create a hash
require 'bcrypt'

password = 'correct-horse-battery-staple'
cost = 12
hash = BCrypt::Password.create(password, cost: cost)

puts "Hash: #{hash}"
puts "Embedded cost: #{BCrypt::Password.new(hash).cost}"
```

### Line-by-line explanation
- Line 1: require 'bcrypt' loads the bcrypt library so you can access BCrypt::Password and related helpers.
- Line 3: password stores the plaintext password you want to protect.
- Line 4: cost sets the computational work factor (more rounds mean slower hashing; see Section 4 for guidance). BCrypt will generate a salt and combine it with the password to produce the hash.
- Line 5: BCrypt::Password.create returns a string containing the version, cost, salt, and hash (e.g., $2a$12$...$...), suitable for storage in a database.
- Line 7: Print the resulting hash so you can inspect its format and ensure it includes the cost and salt.
- Line 8: Extract the embedded cost from the stored hash to confirm how the hash was generated.

Notes:
- The hash includes the salt and cost, so you don’t need to store them separately.
- For production, you typically store the hash in a password_digest or similar field.

## 2. Hashing a password with bcrypt (Ruby) — practical storage

Hashing a password for durable storage is the core operation before persisting credentials. This example focuses on a typical storage scenario.

Code example:
```ruby
# Hash a password for storage and show the result
require 'bcrypt'

password = 'my_secure_password'
cost = 12
password_digest = BCrypt::Password.create(password, cost: cost)

# Simulated DB storage (string)
db_record = { password_digest: password_digest }

puts "Stored digest: #{db_record[:password_digest]}"
```

### Line-by-line explanation
- Line 1: Load bcrypt to access hashing functionality.
- Line 3: Define the plaintext password to hash.
- Line 4: Choose a cost factor; 12 is a common secure default for many deployments.
- Line 5: Create the bcrypt hash; the result contains salt, algorithm version, and cost.
- Line 7: Simulate storing the hash in a database record; in real apps, this would be a DB column like password_digest.
- Line 9: Output the stored digest to verify the stored value.

Note:
- Always store the hash string, not the plaintext password.
- The hash string encodes the cost and salt, enabling verification later.

## 3. Verifying a password against a bcrypt hash

Verification compares a user-provided password against the stored hash without revealing the plaintext. This is the authentication step.

Code example:
```ruby
require 'bcrypt'

# Simulated in-database hash (as stored previously)
stored_hash = BCrypt::Password.create('correct-password', cost: 12)

# Password provided by the user during login
input_password = 'wrong-password'

# Verification
authenticated = BCrypt::Password.new(stored_hash) == input_password
puts "Authenticated: #{authenticated}"
```

### Line-by-line explanation
- Line 1: Load bcrypt.
- Line 4: stored_hash represents a previously saved bcrypt hash string retrieved from the database (already salted and cost-parameterized).
- Line 7: input_password is the password the user attempted to log in with.
- Line 9: BCrypt::Password.new(stored_hash) reconstructs a BCrypt::Password object from the hash, which carries the salt and cost. The == operator securely compares the input_password against the hashed value.
- Line 10: Output the authentication result (true/false).

Notes:
- Always use BCrypt’s comparison method rather than hashing the input again and comparing strings.
- If you store null or invalid data, guard against exceptions when reconstructing the hash.

## 4. Cost factor and security trade-offs

Choosing the right cost factor balances security against CPU time and latency. Higher cost increases protection against brute force at the expense of legitimate login latency.

Code example:
```ruby
require 'bcrypt'

password = 'some-strong-password'

[10, 12, 14].each do |cost|
  start = Time.now
  BCrypt::Password.create(password, cost: cost)
  elapsed = Time.now - start
  puts "Cost #{cost} hash time: #{elapsed.round(3)}s"
end
```

### Line-by-line explanation
- Line 1: Load bcrypt.
- Line 3: Define the password to hash for timing purposes.
- Line 5: Iterate over several cost factors to observe their impact on hashing time.
- Line 6: Record start time before hashing.
- Line 7: Create the hash with the given cost; this is the expensive operation we’re measuring.
- Line 8: Compute elapsed time and format it for output.
- Line 9: Print the cost factor and the time it took to hash.

Notes:
- A common baseline is cost 12 in modern systems, but you should calibrate for your hardware and latency budgets.
- In production, you may implement adaptive cost strategies based on observed latency or use a helper to measure system load.

## 5. Integrating bcrypt in a simple Ruby app (no Rails)

This example demonstrates a small, framework-agnostic Ruby class that handles password assignment and authentication using bcrypt.

Code example:
```ruby
require 'bcrypt'

class User
  attr_reader :password_digest

  def initialize
    @password_digest = nil
  end

  # Setter that hashes the password for storage
  def password=(new_password)
    @password_digest = BCrypt::Password.create(new_password, cost: 12)
  end

  # Authentication: verifies a plaintext password against the stored hash
  def authenticate(password)
    return false unless @password_digest
    BCrypt::Password.new(@password_digest) == password
  end
end

# Demo
u = User.new
u.password = 'let-me-in'
puts "Auth with correct password: #{u.authenticate('let-me-in')}"
puts "Auth with wrong password: #{u.authenticate('wrong')}"
```

### Line-by-line explanation
- Line 1: Load bcrypt.
- Line 4: Define a simple User class with a password_digest attribute to store the hash.
- Line 6: Initialize an empty user object (no password yet).
- Line 9: Define a writer method password= that hashes the provided password; this keeps plaintext out of storage.
- Line 10: Hash creation with a chosen cost; store the resulting string in @password_digest.
- Line 13: Define authenticate to verify the supplied password against the stored hash.
- Line 14: Guard against missing hash data.
- Line 15: Reconstruct a BCrypt::Password from the stored hash and compare with the plaintext input.
- Line 18-21: Demonstrate successful and failed authentication scenarios.

Notes:
- This pattern mirrors a lightweight, Rails-like has_secure_password approach without needing Rails.
- In real apps, you’d validate input, handle nils more robustly, and persist users to a database.

## X. Common Beginner Mistakes

Below are common pitfalls with bad vs good patterns. Each pair shows how to do it right.

- Pitfall 1: Storing plaintext passwords
  Bad:
  ```ruby
  # Dangerous: storing plaintext
  stored_password = 'my_password'
  # Later used for comparison (insecure)
  input = 'my_password'
  if stored_password == input
    puts 'Authenticated'
  end
  ```
  Good:
  ```ruby
  require 'bcrypt'
  password = 'my_password'
  digest = BCrypt::Password.create(password, cost: 12)

  # Later, authenticate
  input = 'my_password'
  authenticated = BCrypt::Password.new(digest) == input
  puts "Authenticated: #{authenticated}"
  ```

- Pitfall 2: Double-hashing or hashing the hashed password
  Bad:
  ```ruby
  stored_hash = BCrypt::Password.create('secret')
  input = 'secret'
  # Rehashing the input instead of comparing to stored_hash
  authenticated = BCrypt::Password.create(input) == stored_hash
  ```
  Good:
  ```ruby
  stored_hash = BCrypt::Password.create('secret')
  input = 'secret'
  authenticated = BCrypt::Password.new(stored_hash) == input
  ```

- Pitfall 3: Choosing an insecure low cost factor
  Bad:
  ```ruby
  hash = BCrypt::Password.create('password', cost: 4)
  ```
  Good:
  ```ruby
  hash = BCrypt::Password.create('password', cost: 12)
  ```
  Additional note: Consider benchmarking and environment constraints to select a safe default and adjust if needed.

- Pitfall 4: Not handling nil or blank passwords
  Bad:
  ```ruby
  def authenticate(password)
    BCrypt::Password.new(@password_digest) == password
  end
  ```
  Good:
  ```ruby
  def authenticate(password)
    return false if password.nil? || password.empty?
    BCrypt::Password.new(@password_digest) == password
  end
  ```

- Pitfall 5: Misunderstanding salts and pepper
  Bad (trying to manage salt manually):
  ```ruby
  salt = BCrypt::Engine.generate_salt(12)
  digest = BCrypt::Password.create(password + salt)
  ```
  Good (let bcrypt handle salt, and consider pepper for an extra secret):
  ```ruby
  pepper = ENV['PASSWORD_PEPPER'] || 'default_pepper'
  digest = BCrypt::Password.create(password + pepper, cost: 12)
  ```
  Important: Pepper should be a server-side secret not stored with user data; use it with caution and document its usage.

## Y. Why This Matters In Real Systems

- Security benefits: bcrypt is designed to be slow and memory-hard, making brute-force attempts costly. The salt is embedded in the hash, so you don’t need to store it separately.
- Practical considerations:
  - Cost factor tuning: Higher cost protects against offline attacks but increases login latency; calibrate to meet SLA requirements.
  - Pepper concept: An application-wide secret can add another layer of defense, but manage it securely (e.g., environment variables, secret management).
  - Rate limiting and monitoring: Even with strong hashing, brute-force attempts should be rate-limited and logged.
  - Database protection: Hashes, not plaintext, should be the minimum viable data exposed if a database is breached.
  - Compatibility: Ensure your verification logic uses the same hashing algorithm and cost used during hashing.
- Real-world deployment patterns:
  - In Rails, has_secure_password simplifies this flow by integrating bcrypt with ActiveRecord validations.
  - In pure Ruby backends, the patterns shown here map cleanly to user models, service objects, or authentication layers.
  - Consider migrating to a centralized authentication service if you scale to many services; bcrypt is often a component of a broader identity strategy.

## Z. Study Questions

1) Which function creates a bcrypt hash in Ruby, and what does its output include?
2) How do you verify a user-entered password against a stored bcrypt hash?
3) What is the cost factor, and how does it affect security and performance?
4) Why is it a bad idea to store or compare plaintext passwords?
5) What is the purpose of pepper, and how might you incorporate it safely?

## Exercise

Part A — Hash a new password and prepare storage
- Task: Implement a small Ruby script that hashes a user-provided password and prints the stored digest string.
- Requirements:
  - Use bcrypt with a cost of 12.
  - Read a password from a constant or variable (no user I/O required for this exercise).
  - Print the resulting digest and the embedded cost.

Part B — Build a tiny in-memory user with authentication
- Task: Create a minimal User class (no Rails) with:
  - A password setter that stores a bcrypt digest.
  - An authenticate method that verifies a plaintext password.
- Requirements:
  - Demonstrate creating a user, setting a password, and authenticating with both correct and incorrect passwords.
  - Do not reveal the digest in outputs; just show authentication results.

Part C — Simple CLI for add/login using bcrypt
- Task: Extend the previous class into a tiny CLI-like flow that:
  - Allows adding a user with a password.
  - Allows attempting to login with a password.
- Requirements:
  - Run in a single Ruby script (no external files required).
  - Show clear success/failure messages for each login attempt.
  - Demonstrate the cost factor in the hash creation by printing the embedded cost after hashing.

Tips:
- Keep the code modular so you can run Part A, Part B, and Part C independently.
- Use the examples from Sections 2–5 as reference implementations for hashing and verification.

This completes a comprehensive, hands-on lesson on password hashing with bcrypt in Ruby, covering hashing, verification, cost management, integration patterns without Rails, common beginner mistakes, real-world context, and practical exercises.