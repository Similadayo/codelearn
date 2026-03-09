# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment

Cloud deployment is the bridge between writing robust Ruby code and delivering reliable, scalable services to users. In this lesson, you’ll learn how to deploy a Ruby web app to three popular environments: Railway (a quick-start PaaS), Render (a similar managed service with YAML-based configuration), and AWS EC2 (full control over the VM and stack). You’ll see concrete Ruby code, Docker configurations, and deployment scripts, plus practical guidance for real-world production use.

## 1. Railway: Deploying a Ruby App

Railway makes it easy to deploy containerized or buildpack-based apps with minimal ops. We’ll demonstrate a small Sinatra app, a Dockerfile, and a simple Ruby repository setup. Railway will build and run the container, wiring ports via the PORT environment variable.

Code A: app.rb (Sinatra app)
```ruby
require 'sinatra'

# Listen on all interfaces and use PORT from the environment (default 4567)
set :bind, '0.0.0.0'
set :port, ENV.fetch('PORT', 4567).to_i

get '/' do
  "Hello from Railway! This is a Ruby Sinatra app on port #{ENV['PORT'] || '4567'}"
end
```

Code B: Gemfile
```ruby
source 'https://rubygems.org'

gem 'sinatra', '~> 2.1'
```

Code C: Dockerfile (Railway builds from Dockerfile by default)
```dockerfile
# Use a slim Ruby base image
FROM ruby:3.2-slim

# Install essential build tools (for compiling gems if needed)
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends build-essential curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Gemfile and install dependencies first (layer caching)
COPY Gemfile Gemfile.lock* ./
RUN gem install bundler -v '~> 2.3' && \
    bundle install --no-deps --clean same --quiet || true

# Copy application code
COPY . .

# Expose port 0.0.0.0:PORT (Railway will map PORT environment variable)
EXPOSE 3000

# Default start command
CMD ["ruby", "app.rb"]
```

Code D: Optional note on environment in Railway (config via UI)
- Railway can inject environment variables (like PORT, DATABASE_URL) through the UI.
- If you need per-environment overrides, add them in Railway’s project settings.

### Line-by-line explanation (Code A: app.rb)
- 1: require 'sinatra' — loads the Sinatra web framework.
- 4: set :bind, '0.0.0.0' — makes the server listen on all network interfaces inside the container.
- 5: set :port, ENV.fetch('PORT', 4567).to_i — uses the PORT env var if provided, otherwise defaults to 4567.
- 7-9: Define a GET route for "/" that returns a friendly message referencing the port.

### Line-by-line explanation (Code B: Gemfile)
- 1: source 'https://rubygems.org' — declares the Gem source.
- 3: gem 'sinatra', '~> 2.1' — specifies Sinatra dependency with a compatible version constraint.

### Line-by-line explanation (Code C: Dockerfile)
- 3: FROM ruby:3.2-slim — starts from a minimal Ruby 3.2 base image.
- 6-10: Install system build tools required for gem compilation and TLS certificates.
- 12: WORKDIR /app — sets the working directory inside the container.
- 15-17: Copy Gemfile(s) and run bundler to install dependencies (caching helps rebuilds faster).
- 20: COPY . . — copies app code into the container.
- 23: EXPOSE 3000 — documents the port the app will listen on (Railway forwards PORT to container; the app uses env PORT).
- 26: CMD ["ruby", "app.rb"] — starts the Sinatra app.

Common deployment notes for Railway:
- Railway will read Dockerfile and run the container, exposing the port specified by the PORT env var.
- In production, you typically pin your Ruby version and gems, ensure a non-root user, and enable logging/monitoring adapters.

## 2. Render: Deploying a Ruby App

Render accepts Docker-based deployments or buildpacks. Here we show a Docker-based deployment using a render.yaml manifest to configure a web service, plus a Dockerfile similar to the Railway example.

Code E: render.yaml (Render deployment manifest)
```yaml
version: 1
services:
  - type: web
    name: ruby-sinatra-render
    env: ruby
    plan: starter
    buildCommand: bundle install --quiet
    startCommand: bundle exec ruby app.rb
    dockerfilePath: Dockerfile
    envVars:
      - key: PORT
        value: "8080"
```

Code F: Dockerfile (Render, compatible with Symphony of Railway example)
```dockerfile
FROM ruby:3.2-slim

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends build-essential curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock* ./
RUN gem install bundler -v '~> 2.3' && \
    bundle install --without production --quiet || true

COPY . .

EXPOSE 8080

CMD ["ruby", "app.rb"]
```

Code G: Optional README snippet (Render expects a Dockerfile or a buildpack)
```markdown
# Deploy to Render
- Use a Dockerfile (recommended) or buildpack-based deployment.
- The render.yaml file configures a web service named ruby-sinatra-render.
- PORT is set via envVars; the app reads PORT from ENV as in app.rb.
```

### Line-by-line explanation (Code E: render.yaml)
- 1: version: 1 — declares the manifest version.
- 4-13: A web service named ruby-sinatra-render, using the ruby environment and starter plan.
- 6: env: ruby — selects the Ruby build/runtime environment on Render.
- 7-8: buildCommand installs dependencies quietly.
- 9: startCommand runs the app using Ruby.
- 10: dockerfilePath: Dockerfile — points to the Dockerfile to build the image.
- 11-14: envVars block demonstrates injecting PORT as 8080 for the container.

### Line-by-line explanation (Code F: Dockerfile)
- Similar to the Railway Dockerfile; port is exposed as 8080 to align with the Render manifest.
- The app.rb will use PORT from the environment; ensure the code reads ENV['PORT'].

Render deployment notes:
- Render will set up a container per the manifest and start it with the given startCommand.
- You can override env vars in the Render UI per environment (staging, production).
- When using Docker, ensure your app binds to 0.0.0.0 and reads PORT from ENV.

## 3. AWS EC2: Deploying a Ruby App

A traditional VM deployment on AWS EC2 gives you full control. This example provides a bootstrap script (user data) to install Ruby, dependencies, and a systemd service to manage the app process. It also includes a minimal Nginx reverse proxy snippet to expose the app on port 80/443.

Code H: User data script (EC2 bootstrap)
```bash
#!/bin/bash
set -euxo pipefail

# Update and install dependencies
apt-get update -y
apt-get install -y git curl ca-certificates build-essential libssl-dev libreadline-dev zlib1g-dev nginx

# Install Ruby via system packages (simplified; for dev/prod use rbenv/rvm if needed)
apt-get install -y ruby-full

# Install Bundler
gem install bundler -v '~> 2.3'

# Create app directory and pull code
USER_DATA_APP_DIR="/opt/app"
mkdir -p "$USER_DATA_APP_DIR"
git clone https://github.com/example/your-ruby-app.git "$USER_DATA_APP_DIR"
cd "$USER_DATA_APP_DIR"

# Install gem dependencies
bundle install --without production

# Precompile assets if Rails; for Sinatra just run the server
# Configure Puma (or Ruby server) to run via systemd (see service file below)
# Create a systemd service for the app
cat > /etc/systemd/system/my-ruby-app.service <<EOF
[Unit]
Description=Ruby Sinatra App
After=network.target

[Service]
WorkingDirectory=$USER_DATA_APP_DIR
ExecStart=/usr/bin/env bundle exec ruby app.rb
Restart=on-failure
Environment=PORT=8080
Environment=RACK_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Start and enable service
systemctl daemon-reload
systemctl enable my-ruby-app.service
systemctl start my-ruby-app.service

# Nginx as reverse proxy
rm /etc/nginx/sites-enabled/default || true
cat > /etc/nginx/sites-available/my_ruby_app <<NGINX
server {
  listen 80;
  server_name _;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
  }
}
NGINX
ln -s /etc/nginx/sites-available/my_ruby_app /etc/nginx/sites-enabled/my_ruby_app
systemctl restart nginx
```

Code I: systemd service file template (for reference)
```ini
# /etc/systemd/system/my-ruby-app.service
[Unit]
Description=Ruby Sinatra App (systemd)
After=network.target

[Service]
WorkingDirectory=/opt/app
ExecStart=/usr/bin/env bundle exec ruby app.rb
Restart=on-failure
Environment=PORT=8080
Environment=RACK_ENV=production

[Install]
WantedBy=multi-user.target
```

Code J: Minimal config/puma.rb (optional if using Puma)
```ruby
# config/puma.rb
port ENV.fetch("PORT") { 8080 }
environment "production"
threads_count = ENV.fetch("PUMA_MIN_THREADS", 2).to_i
threads threads_count, ENV.fetch("PUMA_MAX_THREADS", 5).to_i
```

Notes:
- This EC2 approach gives you full control over the runtime stack, security groups, and scaling strategy (you'd typically use ASG, load balancers, and autoscaling policies for production).
- For a Rails app, you’d also configure assets precompilation, database config, and migrations in the startup workflow.
- Consider using CloudWatch (logs) and an SSH key strategy for operations.

### Line-by-line explanation (Code H: User data script)
- Shebang, strict error handling, and apt-get updates prepare the instance.
- Install essential system packages (git, nginx, Ruby runtime).
- Install Bundler and clone the app repository.
- Install gems with bundler.
- Create and enable a systemd service to manage the Ruby app process.
- Configure Nginx as a reverse proxy to forward HTTP to the Ruby app port.
- Start the systemd service and Nginx.

### Line-by-line explanation (Code I: systemd service)
- Units define dependencies; the service starts after network.
- WorkingDirectory sets the app directory.
- ExecStart defines how to launch the app (bundle exec ruby app.rb).
- Restart ensures the service restarts on failure.
- Environment lines declare runtime variables (PORT, RACK_ENV).

### Line-by-line explanation (Code J: config/puma.rb)
- Sets port from PORT env var, optional Rails-friendly config for Puma, and thread pool sizing.

AWS EC2 deployment notes:
- You’ll typically initialize an EC2 instance in a VPC with a security group allowing 80/443 and 22 for SSH.
- For production, use an AMI with the desired Ruby and system tooling, or use a bootstrap script like the one above.
- Consider replacing the direct “git clone” in user data with a private repo pull (SSH keys, or use a CI/CD workflow).

## 4. Common Beginner Mistakes

Pitfall 1: Hardcoding ports and not honoring PORT env in Docker apps
- Bad:
```ruby
# app.rb
set :port, 4567
```
- Good:
```ruby
# app.rb
set :port, ENV.fetch('PORT', 4567).to_i
```

Pitfall 2: Running the app in the foreground without a proper process manager on servers
- Bad (systemd omitted; app runs as a background shell process)
```bash
# Bad startup script
ruby app.rb &
```
- Good (systemd service or supervisor)
```ini
# systemd unit (example)
[Unit]
Description=Ruby Sinatra App
After=network.target

[Service]
WorkingDirectory=/opt/app
ExecStart=/usr/bin/env bundle exec ruby app.rb
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Pitfall 3: Not handling secrets and environment separation
- Bad (hardcoded API keys in code)
```ruby
# app.rb
API_KEY = "hard-coded-key-please-change"
```
- Good (ENV-based, with secret management)
```ruby
# app.rb
API_KEY = ENV.fetch('THIRD_PARTY_API_KEY') do
  raise "THIRD_PARTY_API_KEY is not set"
end
```

Pitfall 4: Ignoring logs and observability
- Bad (no logging, relying on crash dumps)
- Good (structured logging, log to stdout for container logging)
```ruby
require 'logger'
LOGGER = Logger.new(STDOUT)
LOGGER.info("Server started on port #{ENV['PORT'] || 4567}")
```

Pitfall 5: Skipping version pinning and reproducible builds
- Bad (install latest gems without a lockfile)
- Good (commit Gemfile.lock and pin Ruby version)
```dockerfile
FROM ruby:3.2-slim
COPY Gemfile Gemfile.lock ./
RUN bundle install
```

## 5. Why This Matters In Real Systems

- Reliability and uptime: Production deployments require predictable environments (pinned Ruby versions, dependency locks) and robust process management (systemd containers, or orchestration tooling).
- Security: Secrets management (ENV vars, AWS Secrets Manager, or Render/Railway built-in secret stores), minimal base images, and regular patching.
- Observability: Centralized logs (systemd journal, CloudWatch, or Render/Railway logs), metrics, and tracing to instrument requests and detect failures quickly.
- Scaling and fault tolerance: PaaS (Railway/Render) abstracts away scaling, while EC2 requires explicit setup (ASG, load balancers, health checks).
- CI/CD alignment: Automated builds, tests, and deployments ensure changes go through a repeatable pipeline rather than ad-hoc SSH-based updates.
- Portability: Docker-based deployments (Railway/Render) enable consistent behavior across environments; EC2 gives control but adds ops burden.

## 6. Study Questions

1. How does a Rails/Sinatra app typically discover which port to listen on in a cloud deployment?  
2. What is the role of a process manager (like systemd) on a VM-based deployment, and why is it important?  
3. When deploying to Render or Railway via Docker, why is it important to bind the app to 0.0.0.0 and respect the PORT environment variable?  
4. What are the key differences between PaaS deployments (Railway/Render) and IaaS (EC2) deployments in terms of operations and scalability?  
5. List three security best practices you would apply when deploying a Ruby app to production.

## 7. Exercise

Part A: Build and deploy a minimal Ruby Sinatra app to Railway
- Tasks:
  1) Create a small Sinatra app (app.rb) that responds to GET / with a greeting.
  2) Add a Gemfile and Dockerfile suitable for Railway.
  3) Create a local Docker image and run it to verify the app binds to port 0.0.0.0 and responds on PORT.
  4) Push the repository to a platform-agnostic Git provider and connect it to Railway; verify the deployment.

Part B: Create a Render configuration and deploy
- Tasks:
  1) Create render.yaml to configure a web service for a Ruby app, using a Dockerfile.
  2) Ensure PORT is handled via ENV in the app and render.yaml.
  3) Deploy to Render and test the endpoint.

Part C: Bootstrap a Rails-ready EC2 deployment
- Tasks:
  1) Write an EC2 user-data script that installs Ruby, Bundler, clones a repo, installs gems, and starts a systemd service for the app.
  2) Provide a minimal systemd service file to manage the app process.
  3) Configure a basic Nginx reverse proxy to expose the app on port 80.
  4) Outline the steps to create the EC2 instance, security groups, and key-pair.

Part D: Reflection
- Write a short paragraph comparing the tradeoffs you observed between Railway, Render, and EC2 in terms of setup effort, control, observability, and scaling.

End of lesson.