# Track: Backend Engineering — Module: Phase 4 — Building Web Servers
## Topic: Testing Basics — Unit & Integration Tests (Ruby)

Testing is the backbone of reliable backend services. Unit tests verify the smallest pieces of logic in isolation, while integration tests ensure that components work together in realistic scenarios (like HTTP endpoints). In Ruby, a strong test suite reduces regression risk, clarifies expectations, and speeds up refactoring—critical for a fast-moving web server. This lesson shows how to write unit tests with RSpec, build simple integration tests with Rack, and apply practical testing techniques in real systems.

## 1. Unit Tests in Ruby (RSpec)

Unit tests exercise a single class or method in isolation from its surroundings. They are fast, deterministic, and focused on behavior. In Ruby, RSpec is a popular choice for expressive, readable tests.

Code
```ruby
# lib/calculator.rb
class Calculator
  def add(a, b)
    a + b
  end

  def multiply(a, b)
    a * b
  end
end
```

```ruby
# spec/calculator_spec.rb
require_relative '../lib/calculator'

RSpec.describe Calculator do
  it 'adds two numbers' do
    expect(Calculator.new.add(2, 3)).to eq(5)
  end

  it 'multiplies two numbers' do
    expect(Calculator.new.multiply(4, 5)).to eq(20)
  end
end
```

### Line-by-line explanation
- lib/calculator.rb
  - class Calculator: defines a simple class to encapsulate arithmetic methods.
  - def add(a, b): public method that returns the sum of a and b.
  - def multiply(a, b): public method that returns the product of a and b.
- spec/calculator_spec.rb
  - require_relative '../lib/calculator': loads the Calculator class for testing.
  - RSpec.describe Calculator do: begins a group of tests for Calculator.
  - it 'adds two numbers' do ... end: an example verifying add returns 5 for inputs 2 and 3.
  - expect(Calculator.new.add(2, 3)).to eq(5): assertion that the result equals 5.
  - it 'multiplies two numbers' do ... end: an example verifying multiply returns 20 for inputs 4 and 5.
  - expect(Calculator.new.multiply(4, 5)).to eq(20): assertion that the result equals 20.

## 2. Integration Tests in Ruby (Rack + Rack::Test)

Integration tests exercise how components behave together in a realistic runtime, such as HTTP requests flowing through a Rack-based app. We’ll create a tiny Rack app and test the HTTP interface end-to-end.

Code
```ruby
# lib/greet_service.rb
class GreetService
  def greet(name)
    "Hello, #{name}"
  end
end
```

```ruby
# lib/hello_app.rb
require 'rack'
require_relative 'greet_service'

class HelloApp
  def initialize(service = GreetService.new)
    @service = service
  end

  def call(env)
    req = Rack::Request.new(env)
    name = req.params['name'] || 'World'
    body = @service.greet(name)
    [200, { 'Content-Type' => 'text/plain' }, [body]]
  end
end
```

```ruby
# spec/integration/hello_app_spec.rb
require 'rack/test'
require_relative '../../lib/hello_app'
require_relative '../../lib/greet_service'

RSpec.describe 'HelloApp integration' do
  include Rack::Test::Methods

  def app
    HelloApp.new
  end

  it 'returns a greeting for the provided name' do
    get '/?name=Alice'
    expect(last_response).to be_ok
    expect(last_response.body).to eq('Hello, Alice')
  end

  it 'uses default greeting when name is missing' do
    get '/'
    expect(last_response).to be_ok
    expect(last_response.body).to eq('Hello, World')
  end
end
```

### Line-by-line explanation
- lib/greet_service.rb
  - class GreetService: encapsulates the greeting logic as a tiny service.
  - def greet(name): builds the greeting string with the provided name.
- lib/hello_app.rb
  - require 'rack': loads Rack framework essentials.
  - require_relative 'greet_service': makes GreetService available to the app.
  - class HelloApp: Rack-compatible application that delegates to the service.
  - initialize(service = GreetService.new): allows dependency injection for testing or substitution.
  - call(env): Rack entry point. Creates a Rack::Request, reads the query param name, defaults to 'World', calls the service, and returns an HTTP 200 with plain text.
  - [200, { 'Content-Type' => 'text/plain' }, [body]]: Rack response tuple: status, headers, and body array.
- spec/integration/hello_app_spec.rb
  - require 'rack/test': brings in RackTest helpers for HTTP-style testing.
  - require_relative '../../lib/hello_app' and greet_service: load app and service.
  - include Rack::Test::Methods: mix-in helpers for HTTP requests.
  - def app; HelloApp.new; end: returns the Rack app under test.
  - get '/?name=Alice': simulates an HTTP GET with a query param.
  - expect(last_response).to be_ok: asserts HTTP 200 status.
  - expect(last_response.body).to eq('Hello, Alice'): checks response body.
  - get '/': simulates a request without a name parameter.
  - expect(last_response.body).to eq('Hello, World'): checks default behavior.

## 3. Testing Tools in Ruby (Mocks, Stubs, and Behavior)

Ruby tests often depend on injecting collaborators (mocks/doubles) to isolate behavior and simulate external systems. The example below demonstrates isolating a client that calls an external API by injecting a fake API object.

Code
```ruby
# lib/weather_client.rb
require 'json'

class WeatherClient
  def initialize(api)
    @api = api
  end

  def current_temperature(city)
    response = @api.get("/weather?city=#{city}")
    data = JSON.parse(response.body)
    data['temperature']
  end
end
```

```ruby
# spec/weather_client_spec.rb
require_relative '../lib/weather_client'
require 'ostruct'

RSpec.describe WeatherClient do
  it 'parses temperature from API response' do
    fake_api = double('API')
    allow(fake_api).to receive(:get).with('/weather?city=London')
      .and_return(double('Response', body: { 'temperature' => 15 }.to_json))

    client = WeatherClient.new(fake_api)
    expect(client.current_temperature('London')).to eq(15)
  end
end
```

### Line-by-line explanation
- lib/weather_client.rb
  - require 'json': lets us parse JSON payloads from API responses.
  - class WeatherClient: a tiny client that talks to an injected API object.
  - def initialize(api): stores the injected API dependency.
  - def current_temperature(city): builds a request, parses the JSON body, and returns the temperature value from the payload.
  - response = @api.get(...): simulates an external API call; response must respond with a body string.
  - data = JSON.parse(response.body): converts the JSON string to a Ruby hash.
  - data['temperature']: extracts the temperature value.
- spec/weather_client_spec.rb
  - require_relative '../lib/weather_client': loads the class under test.
  - fake_api = double('API'): creates a test double to stand in for the real API client.
  - allow(fake_api).to receive(:get).with('/weather?city=London')...: stubs the API call to return a controlled fake response.
  - double('Response', body: { 'temperature' => 15 }.to_json): fakes a response object with a JSON body.
  - WeatherClient.new(fake_api): injects the fake API to isolate behavior.
  - expect(...).to eq(15): asserts the method returns the expected temperature.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Testing with real network calls in unit tests
  - Bad
```ruby
# Bad: unit test that hits a live API
describe WeatherClient do
  it 'fetches real data' do
    client = WeatherClient.new(RealHTTPClient.new)
    expect(client.current_temperature('London')).to be > -100
  end
end
```
  - Good
```ruby
# Good: unit test with a test double
describe WeatherClient do
  it 'parses temperature from API response' do
    fake_api = double('API')
    allow(fake_api).to receive(:get).and_return(double('Response', body: { 'temperature' => 20 }.to_json))

    client = WeatherClient.new(fake_api)
    expect(client.current_temperature('London')).to eq(20)
  end
end
```

- Pitfall 2: Testing implementation details instead of behavior
  - Bad
```ruby
# Bad: testing private/internal behavior
describe Calculator do
  it 'uses private add' do
    calc = Calculator.new
    expect(calc.send(:add, 2, 3)).to eq(5) # reaching private method
  end
end
```
  - Good
```ruby
# Good: testing public API only
describe Calculator do
  it 'adds numbers via public API' do
    calc = Calculator.new
    expect(calc.add(2, 3)).to eq(5)
  end
end
```

- Pitfall 3: Shared/global state leaking between tests
  - Bad
```ruby
# Bad: shared global state
$state = {}

describe '#store' do
  it 'mutates global state' do
    $state[:value] = 1
    expect($state[:value]).to eq(1)
  end

  it 'leaves state changed for next test' do
    expect($state[:value]).to be_nil
  end
end
```
  - Good
```ruby
# Good: reset state per example
describe '#store' do
  before(:each) { @state = {} }

  it 'mutates local state' do
    @state[:value] = 1
    expect(@state[:value]).to eq(1)
  end

  it 'starts fresh for each test' do
    expect(@state[:value]).to be_nil
  end
end
```

- Bonus Pitfall: Not handling test data cleanup for integration tests
  - Bad
```ruby
# Bad: tests leave data in the DB
describe 'User API' do
  it 'creates a user' do
    User.create(name: 'Alice')
    expect(User.count).to eq(1)
  end
end
```
  - Good
```ruby
# Good: ensure clean slate per test (conceptually shown; actual setup depends on framework)
# Rails/RSpec example (or with a database cleaner strategy)
RSpec.configure do |config|
  config.before(:each) { User.delete_all }
  # or config.use_transactional_fixtures = true in Rails
end
```

## 5. Why This Matters In Real Systems — Production Context

- Confidence and speed: A healthy test suite gives fast feedback after changes, reducing the cost of bugs in production.
- Regression safety: Unit tests catch logic regressions in isolated components; integration tests guard against mismatches between components and public APIs.
- Test pyramid: A balanced mix—many fast unit tests, a smaller set of integration tests, and fewer end-to-end tests—yields fast, reliable feedback and stable deployments.
- Dependency management: Injection, mocks, and stubs help simulate failure modes (timeouts, partial outages) without hitting real services.
- Database and state handling: Integration tests must clean up test data to avoid flaky results or polluted environments.
- Performance considerations: Tests should be fast enough to run frequently in CI; avoid long-running tests in the unit layer.
- Real systems pattern: In production Ruby apps (Rails or Sinatra/Rack), tests typically live under spec/ with shared helpers, factories (FactoryBot), and tools like DatabaseCleaner or transactional fixtures to manage state between tests.
- CI/CD integration: Run tests automatically on push/PR; fail builds on test failures to enforce quality gates.

## 6. Study Questions — 5 Recall Questions

1) What is the primary difference between a unit test and an integration test?
2) How does dependency injection help you write isolated unit tests in Ruby?
3) What is Rack::Test, and how does it help with integration testing of Rack-based apps?
4) Name two common test doubles you can use in RSpec and describe when you would use them.
5) What is the test pyramid, and why is it important for production reliability?

## 7. Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small, testable Rack-based greeting service with both unit and integration tests, demonstrating good testing practices.

Part A — Create the service
- Implement a tiny greeting service and a minimal Rack app that uses it.
- Required files:
  - lib/greet_service.rb
  - lib/hello_app.rb
- Behavior:
  - GreetService#greet(name) returns "Hello, #{name}"
  - HelloApp responds to GET /?name=NAME with plain text greeting.
  - If name is missing, default to "World".

Part B — Add unit tests
- Create unit tests for GreetService (spec/greet_service_spec.rb).
- Confirm behavior for typical inputs and edge cases (e.g., spaces, empty string).

Part C — Add integration tests
- Create an integration test for the Rack app (spec/integration/hello_app_spec.rb) using Rack::Test.
- Verify:
  - GET /?name=Alice returns "Hello, Alice"
  - GET / returns "Hello, World"

Part D — Run tests and iterate
- Run the test suite with your preferred tool (e.g., rspec).
- If a test fails, diagnose and fix the code or tests.
- Ensure you have a clean slate for each test; use simple before hooks or a basic cleanup strategy if you’re not in Rails.

Part E — Extension (optional)
- Extend the API to return JSON: { "greet": "Hello, NAME" } for GET /greet?name=NAME.
- Add a new integration test to verify the JSON response and Content-Type header.

Starter code snippet (for your repo)
- lib/greet_service.rb
```ruby
class GreetService
  def greet(name)
    "Hello, #{name}"
  end
end
```

- lib/hello_app.rb
```ruby
require 'rack'
require_relative 'greet_service'

class HelloApp
  def initialize(service = GreetService.new)
    @service = service
  end

  def call(env)
    req = Rack::Request.new(env)
    name = req.params['name'] || 'World'
    body = @service.greet(name)
    [200, { 'Content-Type' => 'text/plain' }, [body]]
  end
end
```

- spec/greet_service_spec.rb
```ruby
require_relative '../lib/greet_service'

RSpec.describe GreetService do
  it 'greets with the provided name' do
    expect(GreetService.new.greet('Alice')).to eq('Hello, Alice')
  end
end
```

- spec/integration/hello_app_spec.rb
```ruby
require 'rack/test'
require_relative '../../lib/hello_app'
require_relative '../../lib/greet_service'

RSpec.describe 'HelloApp integration' do
  include Rack::Test::Methods

  def app
    HelloApp.new
  end

  it 'greets the provided name' do
    get '/?name=Alice'
    expect(last_response).to be_ok
    expect(last_response.body).to eq('Hello, Alice')
  end

  it 'greets with World when name is missing' do
    get '/'
    expect(last_response).to be_ok
    expect(last_response.body).to eq('Hello, World')
  end
end
```

If you complete this exercise, you’ll have a compact, testable backend component with unit and integration tests demonstrating the core concepts covered in this lesson.