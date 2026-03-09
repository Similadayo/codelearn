# Track: Backend Engineering — Phase 4: Building Web Servers — Environment Variables & Config Management (Ruby)

Environment variables and config management are foundational for building reliable, portable, and secure backend services. This lesson teaches how to read, organize, and apply configuration in Ruby backends, how to keep secrets safe, and how to structure config so deployments are repeatable and low-risk. You’ll learn patterns that scale from simple scripts to production-grade services.

## 1. Understanding The Role Of Environment Variables In Web Servers

Environment variables let you separate code from configuration, enabling the same artifact to run across development, staging, and production without code changes. They support 12-Factor App principles: strict separation of config from code, easy rotation, and safer deployments.

```ruby
# 1. Loading environment variables with defaults and type conversion
port = ENV.fetch('PORT') { '3000' }.to_i
env  = ENV.fetch('ENVIRONMENT') { 'development' }
db_url = ENV.fetch('DATABASE_URL') { 'postgres://localhost/app_development' }

puts "Starting in #{env} mode on port #{port}"
puts "Connecting to DB: #{db_url}"
```

### Line-by-line explanation
- port = ENV.fetch('PORT') { '3000' }.to_i
  - Fetches the PORT environment variable; if missing, uses '3000' as default, then converts to integer.
- env  = ENV.fetch('ENVIRONMENT') { 'development' }
  - Reads ENV['ENVIRONMENT'], defaulting to 'development' when not provided.
- db_url = ENV.fetch('DATABASE_URL') { 'postgres://localhost/app_development' }
  - Reads the database URL from ENV, with a safe default for local development.
- puts "Starting in #{env} mode on port #{port}"
  - Simple runtime log showing mode and port.
- puts "Connecting to DB: #{db_url}"
  - Logs the DB URL being used (note: avoid printing sensitive secrets in real logs).

## 2. Local Development And Secrets: Using Dotenv In Ruby

During development, you don’t want to hard-code secrets or environment values. The dotenv gem loads values from a .env file into ENV for local development and test, keeping secrets out of your codebase.

```ruby
# Gemfile (excerpt)
gem 'dotenv'

# .env (example)
PORT=5000
DATABASE_URL=postgres://localhost/app_dev
LOG_LEVEL=DEBUG

# app.rb
require 'dotenv'
Dotenv.load  # loads values from .env into ENV

port = (ENV.fetch('PORT', '3000')).to_i
db_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/app_dev')
log_level = ENV.fetch('LOG_LEVEL', 'INFO')
```

### Line-by-line explanation
- require 'dotenv'
  - Loads the dotenv library so its methods are available.
- Dotenv.load
  - Reads the .env file at project root and sets each key/value into ENV.
- port = (ENV.fetch('PORT', '3000')).to_i
  - Reads PORT, defaults to '3000', then converts to integer.
- db_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/app_dev')
  - Reads DATABASE_URL or uses a safe development default.
- log_level = ENV.fetch('LOG_LEVEL', 'INFO')
  - Reads LOG_LEVEL or defaults to INFO.

## 3. YAML Config Files For Production Settings

YAML configuration files enable structured, environment-specific settings. You can keep reusable defaults in code and environment-specific overrides in YAML, while still allowing dynamic overrides from ENV.

```yaml
# config/settings.yml
development:
  port: 3000
  database:
    url: postgres://localhost/app_development
  logging:
    level: INFO

production:
  port: 80
  database:
    url: postgres://db-prod.internal/app_production
  logging:
    level: WARN
```

```ruby
# app.rb
require 'yaml'
require 'erb' # if you want to interpolate env vars inside YAML

env = (ENV['RACK_ENV'] || 'development')
raw = YAML.load_file('config/settings.yml')
env_config = raw[env] || {}

port = (ENV.fetch('PORT', env_config.dig('port') || 3000)).to_i
db_url = ENV.fetch('DATABASE_URL', env_config.dig('database', 'url') || 'postgres://localhost/app')

puts "Configured to listen on port #{port}"
puts "Database URL: #{db_url}"
```

### Line-by-line explanation
- env = (ENV['RACK_ENV'] || 'development')
  - Determines the runtime environment, defaulting to development.
- raw = YAML.load_file('config/settings.yml')
  - Loads the YAML config file into a Ruby hash.
- env_config = raw[env] || {}
  - Selects the environment-specific section; falls back to an empty hash if missing.
- port = (ENV.fetch('PORT', env_config.dig('port') || 3000)).to_i
  - Uses an ENV override if provided; otherwise uses YAML value; otherwise defaults to 3000.
- db_url = ENV.fetch('DATABASE_URL', env_config.dig('database', 'url') || 'postgres://localhost/app')
  - Similar logic for the database URL.
- puts lines
  - Outputs the chosen port and DB URL for visibility during startup.

## 4. Centralized Config Objects And Dependency Injection

Encapsulating configuration in a single object makes it easy to test, swap configurations, and pass settings to components like web servers or database clients.

```ruby
class AppConfig
  attr_reader :port, :db_url, :log_level

  def initialize
    @port = (ENV.fetch('PORT', '3000')).to_i
    @db_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/app')
    @log_level = (ENV.fetch('LOG_LEVEL', 'INFO')).upcase
  end
end

class WebServer
  def initialize(config)
    @config = config
  end

  def start
    puts "Starting server on port #{@config.port}"
    puts "Using DB: #{@config.db_url}"
    puts "Log level: #{@config.log_level}"
    # Here you would bind to a real server socket, etc.
  end
end

config = AppConfig.new
server = WebServer.new(config)
server.start
```

### Line-by-line explanation
- class AppConfig
  - Defines a simple configuration container.
- attr_reader :port, :db_url, :log_level
  - Exposes read-only accessors for important settings.
- def initialize
  - Loads values from ENV with sane defaults.
- port = (ENV.fetch('PORT', '3000')).to_i
  - PORT with default and numeric conversion.
- db_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/app')
  - DATABASE_URL with default.
- log_level = (ENV.fetch('LOG_LEVEL', 'INFO')).upcase
  - LOG_LEVEL normalization to uppercase.
- class WebServer
  - A minimal component that uses the config object.
- def initialize(config)
  - Injects the config via constructor.
- def start
  - Demonstrates usage of configured values.
- config = AppConfig.new; server = WebServer.new(config); server.start
  - Wiring: build config, inject into server, start.

## 5. Secrets Management And Rotation — Best Practices

Hard-coding secrets in code or relying solely on ENV can be risky. Use dedicated secrets management for rotation, auditing, and restricted access in production. At minimum, never log secrets.

```ruby
# Basic secret wiring (avoid logging secrets)
secret_key_base = ENV['SECRET_KEY_BASE'] || 'fallback-secret'

# Production-grade approach (optional dependency)
# AWS Secrets Manager example (requires 'aws-sdk-secretsmanager')
begin
  require 'aws-sdk-secretsmanager'
  client = Aws::SecretsManager::Client.new(region: 'us-east-1')
  resp = client.get_secret_value(secret_id: 'myapp/prod/secret_config')
  secret_config = JSON.parse(resp.secret_string)
  db_url = secret_config['DATABASE_URL'] || ENV['DATABASE_URL']
rescue LoadError
  # Fallback if the gem is not available (e.g., for local dev)
  db_url = ENV['DATABASE_URL'] || 'postgres://localhost/app_production'
end

puts "Using DB: #{db_url}"
```

### Line-by-line explanation
- secret_key_base = ENV['SECRET_KEY_BASE'] || 'fallback-secret'
  - Reads a cryptographic key from the environment with a safe fallback for non-prod runs.
- begin ... rescue LoadError
  - Attempts to use a secrets manager if the AWS SDK is available; otherwise falls back to ENV or default.
- client = Aws::SecretsManager::Client.new(region: 'us-east-1')
  - Creates a Secrets Manager client (requires AWS credentials configured in your environment).
- resp = client.get_secret_value(secret_id: 'myapp/prod/secret_config')
  - Fetches the secret payload (as a JSON string).
- secret_config = JSON.parse(resp.secret_string)
  - Parses the secret payload into a Ruby hash.
- db_url = secret_config['DATABASE_URL'] || ENV['DATABASE_URL']
  - Prefer the secret value, then an ENV var, then a default.
- rescue LoadError
  - If the AWS SDK isn’t installed, provide a safe fallback.
- puts "Using DB: #{db_url}"
  - Simple visibility output; avoid printing sensitive details in production logs.

Note: In production, integrate with your organization’s secrets strategy (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets) and avoid exposing secrets in logs or error messages.

## 6. Observability: Logging Configuration Via Env Vars

Configuring logging via environment variables helps you switch verbosity without redeploying code. Map environment values to the language’s logging levels.

```ruby
require 'logger'

logger = Logger.new(STDOUT)
level = (ENV['LOG_LEVEL'] || 'INFO').upcase

logger.level = case level
when 'DEBUG' then Logger::DEBUG
when 'INFO'  then Logger::INFO
when 'WARN'  then Logger::WARN
when 'ERROR' then Logger::ERROR
else Logger::INFO
end

logger.debug("Debug details: startup sequence initiated.")
logger.info("Server is starting.")
```

### Line-by-line explanation
- require 'logger'
  - Uses Ruby’s standard logging facility.
- logger = Logger.new(STDOUT)
  - Outputs logs to standard out, which is common for containerized deployments.
- level = (ENV['LOG_LEVEL'] || 'INFO').upcase
  - Reads log level from ENV with a default, normalized to uppercase.
- logger.level = case level ...
  - Maps string level to the corresponding Logger constant.
- logger.debug(...) / logger.info(...)
  - Emits log messages at different severities. In production, keep DEBUG off unless actively troubleshooting.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Hard-coding configuration values in code
Bad:
```ruby
# bad.rb
PORT = 3000
DB_URL = 'postgres://localhost/app_dev'
```

Good:
```ruby
# good.rb
port = ENV.fetch('PORT', '3000').to_i
db_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/app_dev')
```

### Pitfall 2: Not handling missing environment variables gracefully
Bad:
```ruby
# bad.rb
db_url = ENV['DATABASE_URL']  # might be nil
```

Good:
```ruby
# good.rb
db_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/app_dev')
```

### Pitfall 3: Exposing secrets in logs or code
Bad:
```ruby
# bad.rb
puts "Secret: #{ENV['SECRET_KEY_BASE']}"
```

Good:
```ruby
# good.rb
secret = ENV['SECRET_KEY_BASE']
# Do not log or print the secret
```

### Pitfall 4: Mixing config sources without a clear precedence
Bad:
```ruby
# bad.rb
port = ENV['PORT'] || 3000
db_url = YAML.load_file('config/settings.yml')[ENV['RACK_ENV'] || 'development']['database']['url']
```

Good:
```ruby
# good.rb
env = ENV['RACK_ENV'] || 'development'
env_config = YAML.load_file('config/settings.yml')[env] || {}
port = (ENV.fetch('PORT', env_config['port'] || 3000)).to_i
db_url = ENV.fetch('DATABASE_URL', env_config.dig('database', 'url') || 'postgres://localhost/app')
```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: By separating config from code, you can reproduce environments precisely across development, CI, staging, and production.
- Security: Secrets and credentials should be rotated and stored in dedicated secret stores; never commit secrets or logs containing secrets.
- Operational flexibility: You can adjust log levels, endpoints, or feature flags on the fly without redeploying or rewriting code.
- Auditing and compliance: Centralized config changes can be tracked, monitored, and versioned, enabling safer deployments.
- Reliability and scalability: Config files plus environment overrides support scalable deployments across multiple environments, clusters, and cloud providers.
- Testing benefits: Mocks and fixtures can override config deterministically, enabling predictable tests without touching real secrets.

## Z. Study Questions — 5 recall questions

1. What is the primary benefit of using environment variables for configuration in a Ruby backend?
2. How can you provide default values for environment variables in Ruby?
3. Why should secrets generally be stored outside of the codebase, and what are common tools to manage them?
4. How would you merge environment-specific YAML config with runtime ENV overrides in Ruby?
5. What is the purpose of a Config object or dependency injection pattern in a web server?

## Exercise

Goal: Build a small, end-to-end Ruby demo that demonstrates environment-based configuration, YAML-based environment overrides, and a simple server skeleton that uses a config object.

Part A — Project Setup
- Create a directory structure:
  - config/settings.yml (environment-specific defaults)
  - Gemfile (with dotenv for development)
  - .env (example values for development)
  - app.rb (main entry)
- Provide sample contents:

config/settings.yml
```yaml
development:
  port: 3000
  database:
    url: postgres://localhost/app_development
  logging:
    level: INFO

production:
  port: 80
  database:
    url: postgres://db-prod/internal/app_production
  logging:
    level: WARN
```

.env
```
PORT=5000
DATABASE_URL=postgres://localhost/app_dev
LOG_LEVEL=DEBUG
RACK_ENV=development
```

Gemfile
```ruby
source 'https://rubygems.org'
gem 'dotenv', group: [:development, :test]
```

Part B — Ruby Code (config merge and DI)
app.rb
```ruby
require 'yaml'
require 'erb'
require 'json'

# Simple AppConfig with DI-friendly interface
class AppConfig
  attr_reader :port, :db_url, :log_level

  def initialize
    env = ENV['RACK_ENV'] || 'development'
    raw = YAML.load_file('config/settings.yml')
    env_config = raw[env] || {}

    @port = (ENV.fetch('PORT', env_config.dig('port') || 3000)).to_i
    @db_url = ENV.fetch('DATABASE_URL', env_config.dig('database', 'url') || 'postgres://localhost/app')
    @log_level = (ENV.fetch('LOG_LEVEL', env_config.dig('logging', 'level') || 'INFO')).upcase
  end
end

class WebServer
  def initialize(config)
    @config = config
  end

  def start
    puts "Starting server on port #{@config.port}"
    puts "Connecting to DB #{@config.db_url}"
    puts "Log level: #{@config.log_level}"
    # Real server start would go here
  end
end

config = AppConfig.new
server = WebServer.new(config)
server.start
```

Part C — Dotenv usage (development)
- If you are using development, you can run with Dotenv to load .env values. Ensure you have the gem installed (bundle install).

Line-by-line explanations:
- ENV-based precedence: ENV vars override YAML and defaults; YAML provides environment defaults; defaults cover the rest.
- The AppConfig class encapsulates the logic for loading and validating configuration.
- WebServer demonstrates how to inject the config object to a component, enabling easier testing and substitution.

Optional extension ideas
- Add a SecretsManager integration (e.g., AWS Secrets Manager) to fetch sensitive values at startup, replacing direct ENV usage for secrets.
- Extend the YAML file to include feature flags and service endpoints; demonstrate how to override via ENV in staging/production.
- Add tests: mock ENV and verify that AppConfig produces expected port, db_url, and log_level values.

If you want, I can tailor the lesson to a specific Ruby framework (e.g., Sinatra, Rack-based apps, or Rails) and show framework-specific config patterns (like Rails credentials, Rails config_for, or Sinatra settings).