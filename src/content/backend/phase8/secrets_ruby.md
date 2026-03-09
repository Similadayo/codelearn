# Track: Backend Engineering — Phase 8: Infrastructure & Deployment — Topic: Secrets Management & Production Config (Ruby)

Secrets are the guardrails that keep your systems safe in production. Proper secrets management avoids leaking credentials, enables automated rotation, and supports scalable deployments. In Ruby environments, you’ll typically balance environment-based configuration, external secret stores, and secure bootstrapping to ensure credentials are never baked into code or images. This lesson walks you through practical patterns, code, and production considerations you can apply to Ruby services, including Rails apps and plain Ruby services.

## 1. Secrets Management Fundamentals for Ruby Apps

A robust secrets strategy starts with environment-first configuration, minimal local secrets, and a clear boundary between development and production. In Ruby, you’ll often combine ENV variables with a lightweight local loader for development or a bridge to an external secret store for production.

```ruby
# lib/secrets_loader.rb
# A simple, environment-first secrets loader for Ruby apps
require 'yaml'
require 'erb'

class SecretsLoader
  attr_reader :secrets

  def initialize(env: (ENV['RACK_ENV'] || ENV['RAILS_ENV'] || 'development'))
    @env = env
    @secrets = load
  end

  def load
    secrets = {}

    # 1) Environment variables take precedence
    ENV.each do |k, v|
      secrets[k] = v if k.start_with?('APP_')
    end

    # 2) Optional local secrets for development/testing
    local_path = File.join(__dir__, 'secrets.yml')
    if File.exist?(local_path)
      local = YAML.safe_load(ERB.new(File.read(local_path)).result) || {}
      secrets.merge!(local[@env] || {})
    end

    secrets
  end

  def [](key)
    secrets[key]
  end
end

# Example usage:
# loader = SecretsLoader.new
# db_password = loader['APP_DB_PASSWORD'] || ENV['APP_DB_PASSWORD']
# puts "Loaded secret for DB_PASSWORD" # Do not log actual value
```

### Line-by-line explanation
- require 'yaml' and 'erb': Load YAML with ERB interpolation for local secrets.
- SecretsLoader class: Encapsulates loading logic in one place.
- initialize: Determines the environment (development/production) and triggers loading.
- load: Merges secrets from ENV (prefixed) and an optional local secrets.yml for development.
- ENV.each block: Prefers environment variables beginning with APP_ to avoid collisions.
- secrets.yml fallback: Only used when present; keeps production secrets out of source control.
- [](key): Getter for secret values by key.
- Example usage: Demonstrates how to obtain a secret without exposing its value.

Note: In production, you should not rely on local secrets.yml. This loader is a safe bridge for development and a single source of truth for non-production environments.

## 2. Fetching Secrets from External Stores (AWS Secrets Manager) in Ruby

External secret stores provide rotation, access control, and centralized auditing. AWS Secrets Manager is a common choice in Ruby apps running on AWS. The following example shows how to fetch a secret JSON payload and access individual fields.

```ruby
# lib/aws_secrets_loader.rb
require 'json'
require 'base64'
require 'aws-sdk-secretsmanager'

class AwsSecretsLoader
  def initialize(secret_id:, region: ENV['AWS_REGION'] || 'us-east-1')
    @secret_id = secret_id
    @region = region
    @client = Aws::SecretsManager::Client.new(region: @region)
  end

  def fetch
    resp = @client.get_secret_value(secret_id: @secret_id)
    if resp.secret_string
      JSON.parse(resp.secret_string)
    else
      # secret_binary (base64 encoded)
      JSON.parse(Base64.decode64(resp.secret_binary))
    end
  end

  def load
    fetch
  end
end

# Example usage:
# secret = AwsSecretsLoader.new(secret_id: 'prod/myapp/db_credentials').load
# db_host = secret['host']
# db_user = secret['username']
# db_password = secret['password']
```

### Line-by-line explanation
- require 'json', 'base64', 'aws-sdk-secretsmanager': Bring in JSON parsing, optional binary secret support, and the AWS Secrets Manager client.
- AwsSecretsLoader class: Wraps AWS Secrets Manager interactions.
- initialize: Accepts a secret_id and AWS region (defaulting to AWS_REGION or us-east-1).
- @client = Aws::SecretsManager::Client.new(region: @region): Creates a client with the given region.
- fetch method: Retrieves the secret value by secret_id.
- if resp.secret_string: Secrets Manager returns a string; parse as JSON.
- else: Decode binary secret and parse as JSON.
- load: Alias for fetch, used to hide implementation details.
- Example usage: Demonstrates how to extract individual configuration values from the loaded secret.

Security note: Do not log secret values. Treat the loaded hash as sensitive data and redact when printing.

## 3. Secrets Rotation, Versioning, and Production Patterns

Rotation and versioning are critical for reducing blast radius when credentials are compromised. AWS Secrets Manager supports automatic rotation; your Ruby code should always fetch the current value and avoid caching secrets indefinitely. The following pattern uses AWS Secrets Manager to obtain the current value and demonstrates how to identify the AWSCURRENT version.

```ruby
# lib/secret_rotation.rb
require 'json'
require 'base64'
require 'aws-sdk-secretsmanager'

class SecretRotation
  def initialize(secret_id:, region: ENV['AWS_REGION'] || 'us-east-1')
    @client = Aws::SecretsManager::Client.new(region: region)
    @secret_id = secret_id
  end

  def current_value
    resp = @client.get_secret_value(secret_id: @secret_id)
    secret_data = resp.secret_string || Base64.decode64(resp.secret_binary)
    JSON.parse(secret_data)
  end

  def current_version_id
    resp = @client.describe_secret(secret_id: @secret_id)
    pair = resp.version_ids_to_stages.find { |vid, stages| stages.include?('AWSCURRENT') }
    pair&.first
  end

  def current_version_stages
    resp = @client.describe_secret(secret_id: @secret_id)
    resp.version_ids_to_stages[current_version_id]
  end
end

# Example usage:
# rot = SecretRotation.new(secret_id: 'prod/myapp/db_credentials')
# puts "Current version: #{rot.current_version_id}"
# secret = rot.current_value
# db_host = secret['host']
```

### Line-by-line explanation
- require 'json', 'base64', 'aws-sdk-secretsmanager': Import necessary libs for JSON handling and AWS integration.
- SecretRotation class: Encapsulates rotation-aware secret access.
- initialize: Creates a Secrets Manager client and stores the secret_id.
- current_value: Fetches the secret value (string or binary), decodes if needed, and parses as JSON.
- current_version_id: Calls describe_secret to determine which secret version is AWSCURRENT.
- current_version_stages: Retrieves the stage mapping for the current version (useful for auditing which stages a version is in).
- Example usage: Demonstrates obtaining the current secret and its version for auditing or conditional logic.

Production pattern notes:
- Rely on AWS IAM roles or instance profiles rather than hard-coded credentials.
- Let AWS Secrets Manager handle rotation; your app fetches the latest value at startup or on demand.
- Avoid caching secrets in memory longer than necessary; consider subscribing to refresh on rotation events or at a fixed interval.

## 4. Local Development vs Production: Environment, Development Tools, and Bootstrapping

A practical strategy is to load secrets from ENV in production, and optionally use development-friendly tooling (like dotenv) in local dev, without altering the production boot path.

```ruby
# config/boot.rb (or early in your application bootstrap)
begin
  # In development, dotenv loads variables from .env into ENV
  require 'dotenv/load'
rescue LoadError
  # dotenv not installed; ignore gracefully
end

# app initialization (example usage)
$LOAD_PATH.unshift File.expand_path('../lib', __dir__)
require 'secrets_loader' # from Section 1

loader = SecretsLoader.new
db_host = loader['APP_DB_HOST'] || ENV['APP_DB_HOST']
db_password = loader['APP_DB_PASSWORD'] || ENV['APP_DB_PASSWORD']

# Note: In production, APP_* vars should be provided via the environment
# and/or fetched from AWS Secrets Manager (Section 2) without logging sensitive data.
```

### Line-by-line explanation
- require 'dotenv/load': Attempts to load environment variables from a .env file in development.
- Rescue block handles environments where dotenv isn't present; avoids boot-time failures.
- SecretsLoader usage: Demonstrates consistent access via the loader, preferring ENV values first.
- db_host/db_password: Examples of secret usage without hard-coding values.
- Final note: Emphasizes production practice: do not bake secrets or log them.

Additional production bootstrap guidance:
- In containerized deployments (Docker, Kubernetes), ensure secrets are mounted as environment variables or provided to the app at startup via a sidecar or init container.
- Use a single source of truth for secrets in each environment (ENV, Secrets Manager, or a combination with explicit precedence rules).

## 5. Production Deployment Patterns: Access, Auditing, and Safe Defaults

Adopt production-ready patterns that minimize risk and maximize observability. The following notes and code illustrate safe defaults for AWS-backed deployments and general production considerations.

```ruby
# app/configuration.rb
require 'aws-sdk-secretsmanager'

module AppConfig
  def self.client
    @client ||= Aws::SecretsManager::Client.new(region: ENV['AWS_REGION'] || 'us-east-1')
  end

  def self.secret(secret_id)
    resp = client.get_secret_value(secret_id: secret_id)
    data = resp.secret_string || Base64.decode64(resp.secret_binary)
    JSON.parse(data)
  end

  def self.db_credentials
    secret = secret('prod/myapp/db_credentials')
    {
      host: secret['host'],
      port: secret['port'] || 5432,
      dbname: secret['dbname'] || 'myapp',
      user: secret['username'],
      password: secret['password']
    }
  end
end

# Example usage (pseudo-DB connect):
# require 'pg'
# cfg = AppConfig.db_credentials
# conn = PG.connect(host: cfg[:host], dbname: cfg[:dbname], user: cfg[:user], password: cfg[:password], port: cfg[:port])
```

### Line-by-line explanation
- require 'aws-sdk-secretsmanager': Load AWS Secrets Manager client.
- AppConfig module: Centralizes configuration access in one place for the app.
- client method: Uses a memoized AWS Secrets Manager client; relies on AWS credentials provided by the environment (IAM role, instance profile, or compatible provider chain).
- secret method: Fetches a secret by ID, handling string or binary payloads, then parses as JSON.
- db_credentials method: Extracts DB connection parameters from the secret payload and returns a hash suitable for a database client.
- Example usage: Demonstrates how a real app would use the credentials to connect to a database without exposing secrets.

Security and ops notes:
- Do not log sensitive fields (host is often okay, but usernames and passwords should be treated as sensitive and redacted in logs).
- Enforce least privilege for the IAM role used by the app to only read necessary secrets.
- Enable Secrets Manager rotation for rotating credentials. Maintain a process to refresh credentials without downtime.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs. Good)

- Pitfall 1: Secrets checked into version control
  - Bad:
    # config/secrets.yml (committed)
    production:
      db_password: "supersecret"
  - Good:
    # Do not commit secrets; load from environment or external store
    # In code, access via ENV['APP_DB_PASSWORD'] or a secret store
    db_password = ENV['APP_DB_PASSWORD']

- Pitfall 2: Hard-coding secrets in code or images
  - Bad:
    DB_PASSWORD = 'supersecret'
    # This value is baked into the app and potentially into image layers
  - Good:
    # Read at runtime from ENV or a secret store; never hard-code
    db_password = ENV.fetch('APP_DB_PASSWORD') { raise 'Missing APP_DB_PASSWORD' }

- Pitfall 3: Logging secrets or leaking sensitive fields
  - Bad:
    puts "DB_PASSWORD=#{db_password}"
  - Good:
    puts "DB_PASSWORD=[REDACTED]"
    # When logging, redact secrets and only log metadata (like which secret was used)

- Pitfall 4: Not rotating or auditing secret access
  - Bad:
    secret = { host: 'db', user: 'app', password: 'pw' } # static and hard to audit
  - Good:
    secret = AppConfig.secret('prod/myapp/db_credentials')
    # Use rotation-enabled store and log access with redaction/monitoring

- Pitfall 5: Inconsistent secret loading between dev and prod
  - Bad:
    # In development, read from secrets.yml; in prod, read from ENV
  - Good:
    # Use a single loader with clear precedence rules: ENV > external store > default
    # Document precedence and keep tests that simulate both paths

## Y. Why This Matters In Real Systems — Production Context & Real Usage

- Security and compliance: Secrets management reduces the blast radius, supports audits, and helps meet compliance requirements (e.g., PCI, HIPAA) by centralizing access control and rotation.
- Reliability and uptime: Automated rotation minimizes the risk of leaked credentials and reduces manual maintenance. Secret stores can rotate credentials without requiring code changes.
- Operational agility: Centralized secrets allow safe updates without redeploying or rebuilding images; credentials are injected at startup or on a trusted schedule.
- Observability: Access patterns, rotation events, and auditing are visible in secret store dashboards and can trigger alerting for unusual activity.
- Compliance with 12-factor app principles: Secrets should be outside the codebase, managed separately, and injected at runtime.

Practical takeaways for production Ruby systems:
- Use environment-based loading for non-production and external stores for production.
- Prefer AWS IAM-based credentials or instance profiles to avoid embedding credentials in code or containers.
- Enable automatic rotation where possible; fetch current values at startup or on-demand, not long-term cached values.
- Implement redaction in all logs and observability pipelines to avoid leaking secrets.

## Z. Study Questions — 5 Recall Questions

1. What is the primary difference between storing secrets in environment variables versus an external secret store like AWS Secrets Manager?
2. How can you ensure that a secret is not logged by a Ruby application?
3. Describe how you would determine the currently active secret version when versioning is enabled (e.g., AWSCURRENT).
4. Why is it important to avoid baking secrets into Docker images or source control?
5. What are the benefits of using IAM roles or instance profiles for credentials in production apps?

## Exercise — Practical multi-part coding challenge

Part A: Build a simple SecretsLoader and test it in development
- Tasks:
  1) Implement a SecretsLoader (as in Section 1) that reads APP_* secrets from ENV and optionally from config/secrets.yml in development.
  2) Create a small Ruby script (scripts/verify_secrets.rb) that loads a few required secrets and prints a redacted summary (do not print actual values).
  3) Create a sample .env file for development with three secrets: APP_DB_HOST, APP_DB_USER, APP_DB_PASSWORD.
- Deliverables:
  - lib/secrets_loader.rb (as in Section 1)
  - scripts/verify_secrets.rb
  - .env.sample (for developers)

Part B: Fetch secrets from AWS Secrets Manager
- Tasks:
  1) Implement a small loader AwsSecretsLoader (as in Section 2) that fetches a secret_id and returns a hash.
  2) Write a short script (scripts/fetch_db_credentials.rb) that uses AwsSecretsLoader to print only the host and db name ( redact the username and password in output).
  3) Provide a mock secret payload for testing (use JSON format in a test secret).
- Deliverables:
  - lib/aws_secrets_loader.rb
  - scripts/fetch_db_credentials.rb
  - test/fixtures/mock_secret.json (for local tests)

Part C: Rotation awareness
- Tasks:
  1) Implement SecretRotation (as in Section 3) to fetch current_value and current_version_id.
  2) Write a small script (scripts/rotation_info.rb) that prints the current version_id and a sample credential field.
- Deliverables:
  - lib/secret_rotation.rb
  - scripts/rotation_info.rb

Part D: Local development vs production bootstrap
- Tasks:
  1) Demonstrate dotenv integration in development (as in Section 4) with a minimal boot file and a .env.sample.
  2) Show how to override at runtime in production without changing code (via environment variables or external store).
- Deliverables:
  - config/boot.rb (dotenv bootstrap)
  - .env.sample
  - README notes on deployment

Part E: Production pattern integration
- Tasks:
  1) Demonstrate a small configuration module (as in Section 5) that uses AWS Secrets Manager for the DB credentials and returns a hash suitable for a DB client connection.
  2) Explain how to wire this into a hypothetical app startup without logging sensitive data.
- Deliverables:
  - app/configuration.rb
  - README snippet describing integration steps and security considerations

Notes for instructors
- Emphasize the separation of concerns: environment loading, secret retrieval, and application configuration should be modular and replaceable.
- Encourage redaction in all logs and metrics; never print raw secrets to stdout or log streams.
- Tie the exercises to real-world infrastructure: containerized apps, cloud-hosted secrets stores, and CI/CD pipelines with secret injection.
- If teaching Rails, map the SecretsLoader usage to how Rails credentials and ENV work together, but avoid relying on Rails-specific behavior unless teaching Rails users.

End of lesson.