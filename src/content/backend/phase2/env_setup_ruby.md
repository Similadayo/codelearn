# Track: Backend Engineering — Phase 2: Developer Tools & Workflow — Setting Up a Professional Dev Environment (Ruby)

Compelling intro paragraph: In backend engineering, a professional development environment is the backbone of reliable, scalable software delivery. Setting up a reproducible, secure, and efficient dev environment minimizes “works on my machine” incidents, speeds onboarding, and ensures parity between local, staging, and production. This lesson focuses on Ruby-specific tooling and workflows: version management, dependency handling, containerized services, linting, testing, and automation. By mastering these components, you can confidently architect robust dev environments for Ruby-based services, whether you’re building Rails apps, Sinatra microservices, or Ruby libraries.

## 1. Choose and Install a Ruby Version Manager (rbenv) and Set Local Ruby for the Project

Setting a precise Ruby version is essential for consistency across machines and CI. This section demonstrates using rbenv (with ruby-build) to install and pin a Ruby version for the project.

Code blocks

```bash
# Install rbenv and ruby-build (macOS/Linux; using Homebrew for convenience)
brew update
brew install rbenv ruby-build

# Initialize rbenv in your shell profile (example for Zsh)
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc

# Install a specific Ruby version and set it globally
rbenv install 3.1.3
rbenv global 3.1.3

# Create a per-project Ruby version file to enforce the version
echo "3.1.3" > .ruby-version
```

### Line-by-line explanation
- brew update: Refreshes Homebrew’s list of available packages to ensure you install the latest rbenv and ruby-build.
- brew install rbenv ruby-build: Installs the Ruby version manager (rbenv) and the plugin to build Ruby versions (ruby-build).
- echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.zshrc: Ensures the rbenv executable is in your shell’s PATH on startup.
- echo 'eval "$(rbenv init -)"' >> ~/.zshrc: Initializes rbenv in the shell so commands like rbenv install work every time you open a new shell.
- source ~/.zshrc: Applies the updated shell configuration in the current session.
- rbenv install 3.1.3: Downloads and compiles Ruby 3.1.3 for your environment.
- rbenv global 3.1.3: Sets Ruby 3.1.3 as the default Ruby for your user.
- echo "3.1.3" > .ruby-version: Creates a project-local file that pins the Ruby version when you move into the project directory. Tools like rbenv will automatically switch to this version when you cd into the project.

Alternative note: If you prefer RVM (Ruby Version Manager), you can replace the commands with the corresponding rvm install and rvm use commands. The concepts remain the same: pin a Ruby version to the project and ensure all contributors use the same version.

## 2. Setup Bundler, Gems, and a Minimal Ruby App Skeleton

Bundler manages dependencies for Ruby projects. This section shows a minimal Gemfile, Bundler configuration for isolated vendoring, and a simple verification script.

Code blocks

```ruby
# Gemfile
source "https://rubygems.org"

ruby "3.1.3"

# Production dependencies
gem "pg", "~> 1.5"

# Development and test tooling
group :development, :test do
  gem "rspec", "~> 3.12", require: false
  gem "rubocop", "~> 1.60", require: false
  gem "dotenv", "~> 2.7"
end
```

```bash
# Install dependencies with local path isolation
bundle config set --local path "vendor/bundle"
bundle install
```

```ruby
# Optional: a tiny verification script to ensure environment is wired up
# bin/hello.rb
#!/usr/bin/env ruby
require "bundler/setup"
puts "Ruby version: #{RUBY_VERSION}"
puts "Bundler path: #{Bundler::Pathname.new('vendor/bundle').to_s}"
```

### Line-by-line explanation
Gemfile
- source "https://rubygems.org": Declares the gem source repository.
- ruby "3.1.3": Pins the Ruby version for Bundler to target.
- gem "pg", "~> 1.5": Adds the PostgreSQL adapter as a production dependency.
- group :development, :test do ... end: Groups gems for development and testing to avoid shipping them in production.
- gem "rspec", "~> 3.12", require: false: Adds RSpec for testing but does not auto-require it, giving you control to load it in tests.
- gem "rubocop", "~> 1.60", require: false: Linting tool for code style enforcement.
- gem "dotenv", "~> 2.7": Loads environment variables from a .env file in development.

bundle config and install
- bundle config set --local path "vendor/bundle": Tells Bundler to vendor gems into vendor/bundle, isolating dependencies from the system Ruby.
- bundle install: Resolves and installs dependencies defined in the Gemfile.

bin/hello.rb
- #!/usr/bin/env ruby: Shebang to run the script with the current Ruby interpreter.
- require "bundler/setup": Brings Bundler's environment into the script so you can require gems as needed.
- puts ... lines: Simple output to verify Ruby and Bundler are wired up.

Usage notes: You can run the verification script with ruby bin/hello.rb to confirm Ruby and Bundler are functioning with the pinned version.

## 3. Dockerized Development Environment: PostgreSQL, Redis, and Ruby App

A containerized dev environment ensures reproducibility across machines and teams. This section provides a minimal Dockerfile and docker-compose configuration to run Ruby with a PostgreSQL DB and Redis as a cache/mq placeholder.

Code blocks

```dockerfile
# Dockerfile
FROM ruby:3.1

WORKDIR /app

# Install Bundler and install gems
COPY Gemfile Gemfile.lock ./
RUN gem install bundler -v '2.3.11' && bundle install

# Copy the application code
COPY . .

CMD ["bash"]
```

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build: .
    volumes:
      - .:/app
    working_dir: /app
    environment:
      DATABASE_URL: postgres://dev:dev@db/dev_db
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: dev_db
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

### Line-by-line explanation
Dockerfile
- FROM ruby:3.1: Uses the official Ruby 3.1 image as the base.
- WORKDIR /app: Sets the working directory inside the container.
- COPY Gemfile Gemfile.lock ./ and RUN bundle install: Copies dependency manifests and installs gems inside the container, ensuring the container has the exact same gems as the host.
- COPY . .: Copies the rest of the application code into the container.
- CMD ["bash"]: Keeps the container interactive by default for development.

docker-compose.yml
- version: "3.9": Specifies the Compose file version.
- app service: Builds from the Dockerfile, mounts the project directory for live code changes, and depends on db and redis.
- db service: Runs PostgreSQL 15 with environment credentials and exposes port 5432 to the host.
- redis service: Runs Redis 7 and exposes port 6379.

Usage note: Run docker compose up to start the full dev environment. This setup provides a repeatable baseline for local development, CI, and onboarding.

## 4. Linters, Style, and Editor Config

Maintain consistency and catch issues early with RuboCop and project-wide style rules. This section shows a typical .rubocop.yml configuration and how to run linting.

Code blocks

```yaml
# .rubocop.yml
AllCops:
  TargetRubyVersion: 3.1
  Exclude:
    - 'db/schema.rb'
    - 'vendor/**/*'
  NewCops: enable

Layout/LineLength:
  Max: 120

Metrics/MethodLength:
  Max: 20
```

```bash
# Linting commands
bundle install
bundle exec rubocop
```

### Line-by-line explanation
.rubocop.yml
- AllCops: Global settings for RuboCop.
- TargetRubyVersion: Tells RuboCop which Ruby syntax features to expect.
- Exclude: Excludes files from linting, such as database schema dumps and vendored gems.
- NewCops: enable: Proactively enable newly added cops to keep rules up to date.
Layout/LineLength
- Max: 120: Enforces a maximum line length for readability.
Metrics/MethodLength
- Max: 20: Limits each method to encourage small, focused methods.

Usage notes: If you’re not using Rails, RuboCop remains equally valuable for generic Ruby code. Consider adding StandardRB as an alternative style guide if your team prefers it.

## 5. Testing, CI, and Automated Workflows

Automated tests and continuous integration are essential to ensure the dev environment stays reproducible and changes don’t regress behavior.

Code blocks

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:15
        ports:
          - 5432:5432
        env:
          POSTGRES_PASSWORD: pass
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.1
      - run: gem install bundler
      - run: bundle install
      - run: bundle exec rspec --format documentation
      - run: bundle exec rubocop
```

### Line-by-line explanation
- on: push and pull_request: Triggers CI on pushes and PRs to main.
- jobs > test: Defines a single job named test.
- services: db: Launches a Postgres service to mirror the dev/CI DB requirement.
- steps:
  - actions/checkout: Checks out the code.
  - ruby/setup-ruby: Installs the specified Ruby version for the job.
  - gem install bundler: Installs Bundler.
  - bundle install: Installs project dependencies.
  - bundle exec rspec: Runs test suite in documentation format for readability.
  - bundle exec rubocop: Runs style checks to enforce code quality.

Usage notes: This CI config ensures that every push and PR validates both tests and style, preventing regressions and drift in the dev environment.

## 6. Observability: Logging, Debugging, and Monitoring in a Ruby App

Observability helps you diagnose issues quickly in development and production. This section demonstrates a simple, portable Ruby logger setup.

Code blocks

```ruby
# lib/logger_setup.rb
require 'logger'

logger = Logger.new(STDOUT)
logger.level = Logger::INFO
logger.datetime_format = "%Y-%m-%d %H:%M:%S"
logger.formatter = proc do |severity, datetime, progname, msg|
  "#{datetime} | #{severity}: #{msg}\n"
end

logger.info("Dev environment initialized")
```

### Line-by-line explanation
- require 'logger': Loads Ruby's standard logging library.
- logger = Logger.new(STDOUT): Creates a logger that writes to standard output for easy visibility in consoles and container logs.
- logger.level = Logger::INFO: Sets the minimum severity to INFO; DEBUG messages will be suppressed in normal operation.
- logger.datetime_format: Customizes the timestamp formatting for readability.
- logger.formatter = proc ...: Defines a custom log line format to include timestamp and severity.
- logger.info("Dev environment initialized"): Logs an informational message indicating the logger is operational.

Additional notes: In Rails, you can rely on Rails' built-in logger, but having a lightweight, plain Ruby logger is valuable for non-Rails services or microservices (e.g., Sinatra, Rake tasks).

## 7. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfalls developers commonly face when setting up a professional Ruby dev environment, with quick comparisons.

- Pitfall 1: Not pinning Ruby version or relying on system Ruby
Bad
```bash
# No version pin and no version manager
ruby -v
ruby script.rb
```
Good
```bash
# Pin and use rbenv; .ruby-version in repo
rbenv install 3.1.3
rbenv local 3.1.3
```

- Pitfall 2: Not isolating gems; using global gems
Bad
```bash
# Bundler install writes to global gem path
bundle install
```
Good
```bash
# Isolate gems per project
bundle config set --local path "vendor/bundle"
bundle install
```

- Pitfall 3: Ignoring linting; shipping unlinted code
Bad
```ruby
def foo(b)  return b+1 end
```
Good
```ruby
def foo(b)
  b + 1
end
```

- Pitfall 4: Missing a reproducible dev environment for DBs
Bad
```yaml
# Local dev expects a locally installed postgres without a defined version
# User must manually install PostgreSQL
```
Good
```yaml
# Docker Compose with a defined Postgres service
db:
  image: postgres:15
```

## 8. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Version pinning via .ruby-version, Gemfile.lock, and docker-compose ensures every developer and CI runner uses identical dependencies and Ruby interpreter.
- Onboarding: A clean, documented setup accelerates new team members joining the project.
- CI/CD parity: Automated linting, tests, and environment provisioning reduce the risk of “works on my machine” defects making it to production.
- Observability by default: Centralized logging and consistent logging formats make diagnosing issues in production or staging practical and faster.
- Maintainability: Clear separation of concerns (version management, dependency management, containerization, linting, testing, and CI) makes the codebase easier to evolve and scale.

## Z. Study Questions — 5 recall questions

1. What is the purpose of the .ruby-version file, and how does rbenv use it?
2. Why would you configure Bundler to install gems into a local path (vendor/bundle)?
3. Name two benefits of dockerizing your development environment for a Ruby service.
4. What RuboCop configuration option would you adjust to enforce a max line length of 100?
5. What steps would you include in a CI workflow to ensure both tests and linting pass on every PR?

## Exercise — practical multi-part coding challenge

Part A — Bootstrap a new Ruby project with reproducible dev tooling
- Create a new directory for a Ruby project.
- Initialize a Gemfile pinning Ruby 3.1.3 and include:
  - pg (production DB adapter)
  - rspec and rubocop (development/test)
  - dotenv (environment loading in development)
- Configure Bundler to vendored path vendor/bundle and install dependencies.
- Add a minimal Ruby script that prints Ruby version and Bundler path to verify the environment.

Part B — Add a minimal web service scaffold (Sinatra) with DB
- Add Sinatra to Gemfile (or Rails if preferred, but Sinatra keeps it lighter).
- Create a simple Sinatra app with:
  - GET /health that returns { status: "ok" } as JSON.
  - GET /users/:id that looks up a users table (you can simulate with an in-memory hash if you want to avoid DB for the exercise, but the goal is to wire true DB usage if you can).
- Create a simple migration to create a users table with id and name (if you choose PostgreSQL, define the migration accordingly).

Part C — Dockerized dev environment
- Write a Dockerfile for the Ruby app (3.1 image) that installs bundler and runs the app in a console-friendly mode.
- Write a docker-compose.yml that starts:
  - app: depends_on db and redis
  - db: PostgreSQL 15 with a dev_db
  - redis: Redis 7
- Ensure the app connects to PostgreSQL using DATABASE_URL or a similar environment variable.

Part D — Linting and testing
- Add a simple rspec test that verifies the /health endpoint returns status: "ok".
- Add a rubocop configuration with a reasonable max line length and a few style rules (you can copy from the .rubocop.yml example above).
- Create a GitHub Actions workflow that runs rubocop and rspec on push and PRs.

Part E — Validation and onboarding notes
- Create a README section describing how to set up the dev environment locally (commands to install Ruby, install Bundler, run docker-compose up, run tests).
- Ensure the project has a working .ruby-version, Gemfile.lock, and a basic CI workflow file.

Deliverables for the exercise:
- A minimal Ruby project structure in a single repository with:
  - .ruby-version
  - Gemfile and Gemfile.lock
  - Dockerfile and docker-compose.yml
  - A small Sinatra (or Rails) app with /health and /users endpoints
  - A migration script for PostgreSQL (if using DB)
  - A basic rspec test for the endpoint
  - A .rubocop.yml configuration
  - A GitHub Actions workflow for CI
  - A README with setup instructions

Note: The exercise is intentionally multi-part to mirror real-world tasks: version management, dependency management, containerized dev environments, linting, testing, and CI. You can implement progressively, iterating from a simple script to a full containerized service with a live DB.