# Track: Backend Engineering — Phase 4: Building Web Servers — Topic: Input Validation — Never Trust User Input (Ruby)

Input validation is the gatekeeper of robust, secure web services. In this lesson, you’ll learn how to prevent bad data from entering your system, reduce security risk, and build predictable, maintainable server code in Ruby. You’ll explore manual validation, library-backed schemas, JSON boundary checks, and practical patterns that scale in real production systems.

## 1. Concept: What Input Validation Really Is and Why It Matters

Code example (manual validation scaffold):
```ruby
# app/models/user.rb
class User
  attr_accessor :name, :email, :age

  def initialize(name:, email:, age:)
    @name = name
    @email = email
    @age = age
  end
end

# app/validators/user_validator.rb
class UserValidator
  def initialize(user)
    @user = user
    @errors = []
  end

  def valid?
    validate
    @errors.empty?
  end

  def errors
    @errors
  end

  def validate
    @errors << "Name must be present" if @user.name.nil? || @user.name.strip.empty?
    @errors << "Email must be valid" unless valid_email?(@user.email)
    @errors << "Age must be a non-negative integer" unless @user.age.is_a?(Integer) && @user.age >= 0
  end

  private

  EMAIL_REGEX = /\A[^@\s]+@[^@\s]+\z/

  def valid_email?(email)
    email && email.match?(EMAIL_REGEX)
  end
end

# Usage example
u = User.new(name: "Ada", email: "ada@example.com", age: 30)
validator = UserValidator.new(u)
if validator.valid?
  puts "User is valid"
else
  puts "Validation errors: #{validator.errors.join(', ')}"
end
```

### Line-by-line explanation
- Define a simple User model with name, email, and age attributes.
- Create a validator object that encapsulates the validation rules.
- valid? runs validate and returns a boolean indicating if there are errors.
- errors returns the collected error messages.
- validate applies three rules: presence of name, a basic email format, and a non-negative integer age.
- EMAIL_REGEX is a basic email pattern; there are more robust patterns or libraries available.
- The usage example demonstrates constructing a user, validating, and handling errors.

Why this matters professionally
- Validation is the first line of defense against invalid or malicious data entering your system.
- Centralizing validation logic makes maintenance easier and prevents ad-hoc checks scattered across controllers or services.
- Correct error reporting improves developer experience for clients consuming your API while preventing leakage of internal state.

---

## 2. Subtopic: Validation Approaches in Ruby (Manual vs Library-Backed)

### 2.1 Manual POROs with a Validator

Code block:
```ruby
# app/models/product.rb
class Product
  attr_accessor :sku, :name, :price

  def initialize(sku:, name:, price:)
    @sku = sku
    @name = name
    @price = price
  end
end

# app/validators/product_validator.rb
class ProductValidator
  def initialize(product)
    @product = product
    @errors = []
  end

  def valid?
    validate
    @errors.empty?
  end

  def errors
    @errors
  end

  def validate
    @errors << "SKU must be present" if @product.sku.nil? || @product.sku.strip.empty?
    @errors << "Name must be present" if @product.name.nil? || @product.name.strip.empty?
    @errors << "Price must be a non-negative number" unless @product.price.is_a?(Numeric) && @product.price >= 0
  end
end

# Example usage
p = Product.new(sku: "ABC-123", name: "Widget", price: 9.99)
validator = ProductValidator.new(p)
puts validator.errors unless validator.valid?
```

### Line-by-line explanation
- Defines a Product value object with three fields.
- Builder-style validator collects errors instead of raising immediately.
- valid? triggers validation; any errors produce a false result.
- price validation checks numeric type and non-negative value.

### 2.2 Library-based validation: dry-validation

Code block:
```ruby
# Ensure the dry-validation gem is added: gem 'dry-validation'
require 'dry-validation'

UserSchema = Dry::Validation.Schema do
  required(:name).filled(:string)
  required(:email).filled(:string, format?: /\A[^@\s]+@[^@\s]+\z/)
  required(:age).filled(:integer, gt?: 0)
end

input = { name: "Grace", email: "grace@example.com", age: 29 }
result = UserSchema.call(input)

if result.success?
  puts "Input is valid"
else
  puts "Errors: #{result.errors.to_h}"
end
```

### Line-by-line explanation
- Require the dry-validation library.
- Define a schema with rules for name, email format, and age being a positive integer.
- Call the schema with an input hash.
- Check result.success? and print errors if any.

### 2.3 Library-based validation: ActiveModel::Validations (standalone)

Code block:
```ruby
# gem 'activemodel' (install if needed)
require 'active_model'

class Registration
  include ActiveModel::Validations

  attr_accessor :username, :email, :password

  validates :username, presence: true
  validates :email, presence: true, format: { with: /\A[^@\s]+@[^@\s]+\z/ }
  validates :password, length: { minimum: 8 }

  def initialize(attrs = {})
    @username = attrs[:username]
    @email = attrs[:email]
    @password = attrs[:password]
  end
end

r = Registration.new(username: "Bob", email: "bob@example.com", password: "short")
puts r.valid?            # => false
puts r.errors.full_messages
```

### Line-by-line explanation
- Include ActiveModel to get validations without needing Rails.
- Define a Registration class with validations on username, email format, and password length.
- Create an instance and check validity; print error messages if invalid.

Why this matters professionally
- Libraries provide robust, battle-tested validation features and help define reusable schemas.
- Clear separation between input handling and business logic improves maintainability and testing.
- Validation libraries support advanced features: nested keys, coercion, callbacks, and custom validators.

---

## 3. Subtopic: Validating JSON Requests in a Minimal Rack/Sinatra App

Code block (Sinatra + Dry Validation contract):
```ruby
# app.rb
require 'sinatra'
require 'json'
require 'dry-validation'

class UserContract < Dry::Validation::Contract
  params do
    required(:name).filled(:string)
    required(:email).filled(:string, format?: /\A[^@\s]+@[^@\s]+\z/)
    required(:age).filled(:integer, gt?: 0)
  end
end

post '/users' do
  request.body.rewind
  payload = JSON.parse(request.body.read, symbolize_names: true)

  result = UserContract.new.call(payload)

  if result.success?
    status 201
    content_type :json
    { id: 1, name: payload[:name], email: payload[:email], age: payload[:age] }.to_json
  else
    status 400
    content_type :json
    { errors: result.errors.to_h }.to_json
  end
end
```

### Line-by-line explanation
- Requires Sinatra for a lightweight web server, JSON parsing, and Dry Validation for input schema.
- Define a strict contract for the expected payload shape.
- In the POST /users route, parse the JSON body and symbolize keys to match the contract.
- Call the contract to validate; return 201 on success or 400 with detailed errors.

Why this matters professionally
- Validating at the API boundary ensures that downstream services receive clean, predictable data.
- Clear error responses help API consumers fix issues quickly.
- Using a contract-based approach makes validation reusable across endpoints and testable.

---

## 4. Subtopic: Validating Nested Structures and Optional Fields

Code block (Dry Schema for nested data):
```ruby
require 'dry-schema'

Schema = Dry::Schema.Params do
  required(:name).filled(:string)
  required(:email).filled(:string, format?: /\A[^@\s]+@[^@\s]+\z/)
  optional(:address).hash do
    required(:line1).filled(:string)
    required(:city).filled(:string)
    optional(:zip).maybe(:string)
  end
  optional(:phones).array(:string)
end

input = {
  name: "Eve",
  email: "eve@example.com",
  address: { line1: "123 Elm", city: "Metropolis", zip: "12345" },
  phones: ["555-1234", "555-5678"]
}

result = Schema.call(input)
puts result.success? ? "Nested data valid" : "Errors: #{result.errors.to_h}"
```

### Line-by-line explanation
- Define a schema that requires name and email, with nested address validation if address is provided.
- The address block enforces line1, city, and an optional zip.
- Phones is an optional array of strings.
- Validate a sample input that includes nested structures and an array.
- Print whether validation passed or show errors.

Why this matters professionally
- Real-world payloads are rarely flat; nested and optional fields are common (addresses, payment methods, contact histories).
- Declarative nested schemas reduce boilerplate, improve readability, and provide precise error details.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Validate only a subset of fields, or perform checks in multiple places
- Bad:
```ruby
def process(payload)
  raise "Name missing" if payload[:name].nil?
  raise "Email invalid" if payload[:email] !~ /\A[^@\s]+@[^@\s]+\z/
  # Missing: age, nested fields, and consolidated error handling
  # Doing business logic here...
end
```
- Good:
```ruby
def process(payload)
  contract = Dry::Schema.Params do
    required(:name).filled(:string)
    required(:email).filled(:string, format?: /\A[^@\s]+@[^@\s]+\z/)
    required(:age).filled(:integer, gt?: 0)
  end

  result = contract.call(payload)
  raise "Invalid payload: #{result.errors.to_h}" unless result.success?
  # Proceed with validated data
end
```

### Pitfall 2: Naive email validation with simple regex
- Bad:
```ruby
def valid_email?(email)
  !!(email =~ /\A.+@.+\z/)
end
```
- Good:
```ruby
# Use a robust contract or library; avoid ad-hoc regex
result = UserContract.new.call(name: payload[:name], email: payload[:email], age: payload[:age])
```

### Pitfall 3: Not validating at the boundary or relying on database constraints alone
- Bad:
```ruby
# Accept payload, and rely on DB constraints to raise errors
def create_user(payload)
  User.create!(payload)
end
```
- Good:
```ruby
# Validate at the boundary; return structured errors to the client
result = UserContract.new.call(payload)
if result.success?
  User.create!(result.to_h)
else
  { status: :bad_request, errors: result.errors.to_h }
end
```

Why these mistakes bite you in production
- Inadequate validation leads to invalid data entering storage, corrupts analytics, and increases security risk.
- Clear, centralized validation reduces bugs, improves auditability, and makes error handling consistent.

---

## Y. Why This Matters In Real Systems — production context and real usage

- Security: Validating inputs prevents injection attacks, reduces risk of SQL injection, XSS, and JSON parsing issues.
- Reliability: Boundary validation guarantees consistent downstream behavior, easier debugging, and predictable APIs.
- Maintainability: Declarative schemas (dry-validation, Dry::Schema) enable reusable, testable validation logic across endpoints.
- Observability: Structured validation errors help ops and developers triage issues quickly; you can log error details without leaking sensitive data.
- Compliance and standards: Enforcing schemas helps with API contracts, client compatibility, and automated testing pipelines.

Best practices in production
- Validate at the boundary (API layer) before any business logic or persistence.
- Use a schema or contract layer; avoid ad-hoc checks scattered in controllers/services.
- Validate nested structures; validate arrays and optional fields as needed.
- Return actionable, secure error messages (do not reveal internal stack traces or heavy internals).
- Write tests that cover valid data, invalid data, boundary conditions, and nested structures.
- Consider performance: avoid heavy validation in hot paths; cache compiled schemas if possible; ensure that JSON parsing does not become a bottleneck.

---

## Z. Study Questions — 5 recall questions

1) What is the difference between validating at the boundary vs. validating only inside business logic?
2) Name two Ruby libraries you can use for declarative input validation and give a brief use-case for each.
3) How would you validate a nested payload that optionally includes an address object?
4) Why should error messages be structured and not reveal internal details? Give an example of a safe error response.
5) Describe a minimal approach to test your validation logic without hitting a real database.

---

## Exercise — Practical multi-part coding challenge

Part A: Manual boundary validator (no external gems)
- Create a minimal Ruby app (Rack or plain Ruby script) that handles a simulated POST payload for user signup with fields: name, email, age.
- Implement a simple User class and a UserValidator (manual validation).
- Ensure the program prints either "VALID" or a list of errors.

Part B: Add nested address validation with a Dry Schema
- Extend the payload to optionally include address with fields: line1, city, zip.
- Use Dry::Schema to define a nested validation, and apply it to the payload from Part A.
- Output either a success message or the nested errors.

Part C: Web endpoint with Sinatra (or a small Rack app) and JSON payload
- Build a small web endpoint POST /signup that accepts JSON payload matching Part B’s schema.
- Validate using a Dry::Validation contract or Dry::Schema.
- Return HTTP 201 with a JSON body on success, or HTTP 400 with a JSON errors body on failure.

Part D: Tests (optional but recommended)
- Write unit tests for the validator(s) and the Sinatra/Rack endpoint.
- Cover: valid payload, missing required fields, invalid email format, negative age, nested address invalid fields.

Part E: Security and performance notes
- Ensure your endpoint rejects unsupported content types and returns stable error messages.
- Demonstrate how you would log validation failures without leaking sensitive data.

Optional starter templates
- You can start with the following skeletons and fill in the validation logic:
  - lib/validators/user_validator.rb
  - lib/schemas/user_schema.rb (Dry::Schema)
  - app.rb (Sinatra endpoint)
  - spec/ (unit tests using RSpec or Minitest)

This completes a thorough, practical lesson on “Input Validation — Never Trust User Input” in Ruby, with multiple validation strategies, production-minded considerations, and hands-on exercises to build confidence in real systems.