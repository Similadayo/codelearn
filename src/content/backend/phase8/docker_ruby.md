# Docker — Containers & docker-compose: Ruby Backend

Containers are the lightweight, portable units that package an application with its runtime, libraries, and dependencies. For Ruby backends, Docker ensures your exact Ruby version, gems, and system libraries travel with your code—from development to CI to production—without the “it works on my machine” mystery. This lesson covers how to containerize a Ruby app with Docker, how to orchestrate it with docker-compose, and how to avoid common pitfalls in real systems.

## 1. Understanding Containers for Ruby Backends

- What is a container? Isolated runtime with its own filesystem, networking, and process space.
- Why Ruby benefits: reproducible environments across stages, easier CI/CD, simpler rollback, and consistent gem/native extension handling.
- How Docker fits in: images (read-only templates) and containers (running instances); layers for caching; ports, volumes, and networks for isolation and persistence.
- Production considerations: non-root execution, minimal base images, multi-stage builds for smaller images, health checks, logging to stdout/stderr, and environment-driven configuration.

## 2. Dockerfile: Building a Ruby App Image

Code: Dockerfile (multi-stage build to keep runtime image lean)

```dockerfile
# Stage 1: Build dependencies and gems
FROM ruby:3.2-slim AS builder

# Install build tools and the PostgreSQL client library (needed for the pg gem)
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      build-essential libpq-dev

WORKDIR /app

# Install gems first to leverage Docker layer caching
COPY Gemfile Gemfile.lock ./
RUN bundle config set --global path 'vendor/bundle'
RUN bundle install

# Copy the rest of the application code
COPY . .

# Stage 2: Runtime image
FROM ruby:3.2-slim

WORKDIR /app

# Bring in gems from builder
COPY --from=builder /app/vendor/bundle /usr/local/bundle
ENV BUNDLE_PATH=/usr/local/bundle

# Copy application code
COPY . .

# Expose the port Sinatra will listen on
EXPOSE 4567

# Run the app
CMD ["ruby","server.rb","-o","0.0.0.0"]
```

### Line-by-line explanation

- FROM ruby:3.2-slim AS builder
  - Creates a named stage "builder" using a minimal Ruby base image to build dependencies.
- RUN apt-get update -qq && apt-get install -y --no-install-recommends build-essential libpq-dev
  - Installs essential build tools and PostgreSQL client library needed to compile the pg gem.
- WORKDIR /app
  - Sets the working directory inside the image.
- COPY Gemfile Gemfile.lock ./
  - Copies gem manifest files first to leverage Docker layer caching for gem installation.
- RUN bundle config set --global path 'vendor/bundle'
  - Configures Bundler to install gems into vendor/bundle within the project.
- RUN bundle install
  - Installs all gem dependencies.
- COPY . .
  - Copies the rest of the application source code into the image.
- FROM ruby:3.2-slim
  - Starts the final runtime image, keeping it lean.
- WORKDIR /app
  - Ensures the runtime image context is /app.
- COPY --from=builder /app/vendor/bundle /usr/local/bundle
  - Copies the installed gems from the builder stage to the runtime image.
- ENV BUNDLE_PATH=/usr/local/bundle
  - Tells Bundler where to locate the gems at runtime.
- COPY . .
  - Copies the application code into the runtime image.
- EXPOSE 4567
  - Documents the port the app will listen on inside the container.
- CMD ["ruby","server.rb","-o","0.0.0.0"]
  - Starts the Sinatra app, binding to all interfaces so the container can be accessed from the host.

## 3. App Code: Sinatra Web App (server.rb and Gemfile)

Code: Gemfile

```ruby
source "https://rubygems.org"

gem 'sinatra', '~> 2.1'
gem 'pg', '~> 1.3'
```

Code: server.rb

```ruby
require 'sinatra'
require 'pg'

set :bind, '0.0.0.0'
set :port, 4567
set :environment, :production

get '/' do
  db_url = ENV['DATABASE_URL']
  db_status = if db_url && !db_url.empty?
    begin
      conn = PG.connect(db_url)
      conn.close
      "Database: OK"
    rescue => e
      "Database: ERROR (#{e.class}: #{e.message})"
    end
  else
    "Database: not configured (DATABASE_URL missing)"
  end

  "Hello from Dockerized Ruby app! Ruby #{RUBY_VERSION} | #{db_status}"
end
```

### Line-by-line explanation (Gemfile)

- source "https://rubygems.org"
  - Specifies where to fetch gems.
- gem 'sinatra', '~> 2.1'
  - Adds Sinatra web framework for lightweight routing.
- gem 'pg', '~> 1.3'
  - Adds PostgreSQL driver for Ruby to enable DB interactions.

### Line-by-line explanation (server.rb)

- require 'sinatra'
  - Loads the Sinatra DSL for web routes.
- require 'pg'
  - Loads the PostgreSQL driver to allow DB connections.
- set :bind, '0.0.0.0'
  - Makes the server listen on all network interfaces inside the container.
- set :port, 4567
  - Uses port 4567 inside the container (mapped by docker-compose later).
- set :environment, :production
  - Sets the app environment to production for typical behavior.
- get '/' do ... end
  - Defines the root route that responds to HTTP GET requests.
- db_url = ENV['DATABASE_URL']
  - Reads an optional DATABASE_URL environment variable for DB connectivity.
- DB status logic
  - Attempts to connect to the DB if DATABASE_URL is provided; reports OK or error details.
- "Hello from Dockerized Ruby app! ..."
  - Returns a simple, informative response including Ruby version and DB status.

## 4. Orchestrating with Docker Compose

Code: docker-compose.yml

```yaml
version: '3.9'
services:
  web:
    build: .
    ports:
      - "8080:4567"
    environment:
      DATABASE_URL: "postgres://postgres:postgres@db/postgres"
    depends_on:
      - db
    volumes:
      - .:/app
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  db-data:
```

### Line-by-line explanation

- version: '3.9'
  - Uses a modern Compose file format compatible with current Docker Engine.
- services: … web
  - Defines a web service for the Ruby app.
- build: .
  - Builds the image from the Dockerfile in the current directory.
- ports: - "8080:4567"
  - Maps host port 8080 to container port 4567 (the app’s listening port).
- environment: DATABASE_URL: "postgres://postgres:postgres@db/postgres"
  - Provides a default database URL that the app can consume via the DATABASE_URL env var.
- depends_on: db
  - Ensures the database service starts before the web service.
- volumes: - .:/app
  - Mounts the project directory for development (live code changes).
- db service
  - Defines a PostgreSQL database service for development/testing.
- image: postgres:15-alpine
  - Uses a lightweight Postgres image.
- environment
  - Sets DB credentials and database name.
- volumes
  - Persists DB data across restarts via a named volume.
- volumes: db-data
  - Declares a named volume for database storage.

## X. Common Beginner Mistakes

### 1) Bad: Bundler gems installed in the final image without caching

```dockerfile
# Bad: Reinstalls gems every build
FROM ruby:3.2-slim
WORKDIR /app
COPY . .
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev
RUN bundle install
```

### Good

```dockerfile
# Good: Uses a builder stage to cache gems
FROM ruby:3.2-slim AS builder
RUN apt-get update -qq && apt-get install -y --no-install-recommends build-essential libpq-dev
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle config set --global path 'vendor/bundle'
RUN bundle install

FROM ruby:3.2-slim
WORKDIR /app
COPY --from=builder /app/vendor/bundle /usr/local/bundle
ENV BUNDLE_PATH=/usr/local/bundle
COPY . .
```

### 2) Bad: Running as root without a non-root user

```dockerfile
# Bad: No non-root user
FROM ruby:3.2-slim
WORKDIR /app
COPY . .
CMD ["ruby","server.rb","-o","0.0.0.0"]
```

### Good

```dockerfile
# Good: Create and switch to a non-root user
FROM ruby:3.2-slim
RUN useradd -m appuser
WORKDIR /home/appuser/app
USER appuser
COPY --chown=appuser:appuser . .
CMD ["ruby","server.rb","-o","0.0.0.0"]
```

### 3) Bad: Not using a .dockerignore

```dockerfile
# Bad: Copying unnecessary files increases image size
FROM ruby:3.2-slim
WORKDIR /app
COPY . .
```

### Good

```dockerfile
# Good: Use .dockerignore to exclude non-essential files
# .dockerignore
.git
log
tmp
node_modules
test
spec
coverage
*.log
```

### 4) Bad: No consideration for multi-stage builds or image size

```dockerfile
# Bad: All-in-one, large image with build tools
FROM ruby:3.2-slim
RUN apt-get update && apt-get install -y build-essential libpq-dev
WORKDIR /app
COPY . .
RUN bundle install
```

### Good

Use multi-stage (as shown in Section 2) to keep the final image lean.

## Y. Why This Matters In Real Systems

- Consistency across environments: Docker ensures the same Ruby version, gem versions, and system libraries in dev, CI, and production.
- Faster, repeatable deployments: Images can be versioned, cached, and rolled back if needed.
- Resource control and security: Containers can be limited in CPU/memory, and running as non-root improves security posture.
- Observability: Docker encourages logging to stdout/stderr, which integrates with container orchestrators and log aggregators.
- Easy orchestration: docker-compose helps you spin up multi-service stacks (web + database) for development and testing, mirroring real infrastructure.
- Dev-experiments to production parity: You can test database migrations, environment configuration, and network policies in a close-to-production container.

## Z. Study Questions

1. What are the main differences between a Docker image and a container?
2. Why is a multi-stage Docker build beneficial for Ruby apps?
3. How can you run a Ruby web app inside Docker so that it is accessible from the host machine?
4. What is the purpose of a .dockerignore file, and what patterns would you typically include?
5. How does docker-compose help when your app needs a database or other services?

## Exercise

Part A — Set up a minimal Sinatra app inside Docker

- Create a directory for the project and add:
  - Gemfile (as in the code above)
  - server.rb (as in the code above)
  - Dockerfile (the multi-stage Dockerfile above)
  - .dockerignore (as described)
  - docker-compose.yml (as described)
- Build and run:
  - docker-compose build
  - docker-compose up -d
  - curl http://localhost:8080/ to verify the app returns the expected message including Ruby version and DB status indicator.
- Optional: Set DATABASE_URL in docker-compose.yml to point to the db service and verify the app reports DB connectivity status.

Part B — Extend with a database

- Ensure Postgres is running via docker-compose.
- Confirm pg gem compiles by having libpq-dev installed in the builder (as shown) and the app uses DATABASE_URL to connect.
- Modify server.rb to display a simple query result from the database, e.g., "SELECT NOW();" if desired.

Part C — Production considerations

- Convert to a non-root user in the runtime image (as shown in the “Common Mistakes” good example).
- Add a healthcheck to the Dockerfile that pings the Sinatra route.
- Remove the host-mounted code in the production environment (adjust docker-compose to use a built image instead of a volume mount).
- Consider a small health endpoint (e.g., /health) and ensure your orchestrator can restart unhealthy containers.

This lesson provides a concrete path from understanding containers to deploying a Ruby backend with docker-compose, highlighting best practices, common mistakes, and practical steps to move your Ruby services toward reliable, scalable production deployments.