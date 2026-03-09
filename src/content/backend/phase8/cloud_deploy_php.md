# Track: Backend Engineering — Module Phase 8 — Infrastructure & Deployment: Cloud Deployment with Railway, Render & AWS EC2 (PHP)

Cloud deployment for PHP apps is how you move from a code treasure to a live, reliable service. In this lesson, you’ll learn how to prepare a PHP application for cloud hosting, deploy it to three popular platforms (Railway, Render, and AWS EC2), and reason about deployment decisions in real systems. You’ll see concrete PHP examples, containerization basics, and production considerations like environment management, security, and scalability.

## 1. Overview: PHP Apps in the Cloud and What Each Platform Changes

In production, you don’t just ship code—you package it, orchestrate it, and monitor it. PHP apps typically need a web server (Apache or Nginx) and a database (e.g., MySQL). Modern cloud providers offer different deployment models:

- Railway: Simple, container-based deployments with Dockerfiles or Docker images. Great for rapid iteration and predictable builds.
- Render: Similar to Railway, with a focus on managed services and auto-deploy from Git repos. Supports Docker-based services.
- AWS EC2: Infrastructure-as-a-service (IaaS). You get VMs you can customize (OS, web server, PHP version). Requires more manual setup but offers maximal control and potential cost savings at scale.

Key PHP deployment concepts
- Environment variables for config (DB_HOST, DB_NAME, DB_USER, DB_PASS).
- A Dockerfile to produce a reproducible image (when using Docker-based deployments).
- A minimal PHP app that uses PDO for database access with proper error handling.
- For EC2, server configuration (Nginx/Apache, PHP-FPM) and a secure deployment process.

This lesson uses a small PHP app that connects to a MySQL database using environment variables, plus concrete deployment artifacts for Railway, Render, and EC2.

---

## 2. 1. Local-ready PHP App and Container Artifacts (Docker-based)

In this section you’ll see a small PHP app that reads DB credentials from environment variables, and Docker-related files to containerize it for cloud deployment.

Code Block A: index.php (PHP app)
```php
<?php
// index.php
// Simple PHP app that reads DB config from environment variables
$host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
$db   = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'testdb';
$user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
$pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "Connected to {$db} as {$user}";
} catch (PDOException $e) {
    http_response_code(500);
    echo "DB connection failed: " . htmlspecialchars($e->getMessage());
}
```
Line-by-line explanation will follow after the block.

Code Block B: Dockerfile (for Apache + PHP)
```dockerfile
# Dockerfile for a PHP 8.3 + Apache image
FROM php:8.3-apache

# Enable PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Copy app
COPY index.php /var/www/html/index.php

# Ensure file permissions
RUN chown -R www-data:www-data /var/www/html
```
Line-by-line explanation will follow after the block.

Code Block C: docker-compose.yml (local dev with DB)
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8080:80"
    environment:
      - DB_HOST=db
      - DB_NAME=mydb
      - DB_USER=user
      - DB_PASS=secret
    depends_on:
      - db
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: mydb
      MYSQL_USER: user
      MYSQL_PASSWORD: secret
    ports:
      - "3306:3306"
```
Line-by-line explanation will follow after the block.

---

### Line-by-line explanation: index.php (Code Block A)
- Line 1: <?php starts the PHP script.
- Line 3-6: Reads environment variables in a robust way, preferring explicit $_ENV, then getenv(), and finally a sane default if unset. This makes config overridable by the deployment environment.
- Line 8: Builds a DSN string for a MySQL PDO connection.
- Line 10-17: Attempts to create a PDO connection with error throwing enabled. If successful, prints a confirmation message.
- Line 18-21: Catches any PDOException, returns HTTP 500, and prints a sanitized error message to the client. This prevents leaking stack traces in production.

### Line-by-line explanation: Dockerfile (Code Block B)
- Line 1: Specifies the base image: php:8.3-apache, which includes Apache with PHP.
- Line 4: Installs PDO and PDO MySQL extension needed for database access.
- Line 7: Copies the PHP app into the container’s web root.
- Line 10: Changes ownership to the Apache user to avoid permission issues serving files.

### Line-by-line explanation: docker-compose.yml (Code Block C)
- Version and services define the multi-container setup for local testing.
- web service:
  - build: . uses the Dockerfile in the current directory.
  - ports maps container port 80 to host 8080 so you can access http://localhost:8080.
  - environment passes DB_* values into the container for the PHP app.
  - depends_on ensures the DB starts before the web container.
- db service:
  - Uses mysql:8 image.
  - environment sets up user, password, and database for the PHP app to use.
  - ports expose MySQL on 3306 for local tooling.

---

## 2. 2. Railway Deployment (Docker-based PHP App)

Railway can deploy Docker-based PHP apps by building from a Dockerfile and running a start command. Below are representative configuration artifacts for Railway.

Code Block D: railway.toml (Railway build/deploy config)
```toml
# railway.toml
[build]
  dockerfile = "Dockerfile"

[deploy]
  start = "apache2-foreground"
```
Line-by-line explanation will follow after the block.

Code Block E: Procfile (optional start script for Railway)
```Procfile
web: apache2-foreground
```
Line-by-line explanation will follow after the block.

### Line-by-line explanation: railway.toml (Code Block D)
- [build] dockerfile = "Dockerfile" tells Railway to build the image using the Dockerfile in the repo.
- [deploy] start = "apache2-foreground" commands Railway to launch Apache in the foreground once the container starts. This is necessary for many container runtimes to keep the process alive.

### Line-by-line explanation: Procfile (Code Block E)
- web: apache2-foreground defines the web process type and the command to start Apache in the foreground. This mirrors common patterns used by Heroku-like platforms and is optional when Railway infers from Dockerfile, but explicit Procfile helps portability.

---

## 2. 3. Render Deployment (Docker-based PHP App)

Render supports Docker-based web services as well. The following config illustrates deploying the same PHP app.

Code Block F: render.yaml (Render service manifest)
```yaml
# render.yaml
services:
  - type: web
    name: php-app
    env: docker
    dockerFilePath: Dockerfile
    plan: starter
```
Line-by-line explanation will follow after the block.

### Line-by-line explanation: render.yaml (Code Block F)
- services: Defines a list of services to deploy.
- type: web indicates this is a web service that serves HTTP requests.
- name: php-app is a human-friendly identifier for the service.
- env: docker specifies that the service runs from a Docker image/builder rather than a platform-specific runtime.
- dockerFilePath: Dockerfile points to the Dockerfile to use for building the container image.
- plan: starter suggests a basic tier; adjust as needed for production (e.g., scaling, memory).

Note: If you’re starting from a Git repo, Render will build the image using the indicated Dockerfile and then run the container with the start command (default for Apache is apache2-foreground or a configured entrypoint).

---

## 3.  AWS EC2 Deployment: Full VM-based Setup

AWS EC2 gives you full control over the VM. The typical pattern for a PHP app is to install Nginx (or Apache), PHP-FPM, and MySQL, then configure a web server to serve PHP. Below are example artifacts and commands you can adapt.

Code Block G: ec2-setup.sh (Bootstrap script for a fresh Ubuntu instance)
```bash
#!/bin/bash
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Nginx, PHP-FPM, and MySQL
apt-get install -y nginx php-fpm php-mysql mysql-server git

# Enable and start services
systemctl enable nginx
systemctl enable php7.4-fpm
systemctl start nginx
systemctl start mysql

# Basic firewall (optional; adjust to your VPC)
ufw allow 'Nginx Full'
ufw enable
```
Line-by-line explanation will follow after the block.

Code Block H: nginx-site.conf (NGINX config for PHP)
```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```
Line-by-line explanation will follow after the block.

Code Block I: ec2-deploy.sh (Deploy app to EC2)
```bash
#!/bin/bash
set -e

APP_DIR="/var/www/html/my-app"

# Ensure the app directory exists
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Example: pull from a Git repo (or copy from your CI artifact)
git init
git remote add origin https://github.com/your-org/php-cloud-app.git
git pull origin main

# Optional: install PHP dependencies with Composer (if needed)
# php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
# php composer-setup.php --install-dir=/usr/local/bin --filename=composer
# composer install

# Restart Nginx to pick up changes
systemctl restart nginx
```
Line-by-line explanation will follow after the block.

### Line-by-line explanation: ec2-setup.sh (Code Block G)
- Lines 4-6: Update and upgrade system packages.
- Lines 9-11: Install Nginx, PHP-FPM, MySQL, and Git for deployment operations.
- Lines 14-15: Enable and start Nginx and PHP-FPM services.
- Line 17: Optional firewall rules; adjust to your environment.

### Line-by-line explanation: nginx-site.conf (Code Block H)
- Lines 2-3: Listen on port 80 and use a permissive server_name for demonstration.
- Line 4: Document root is /var/www/html; PHP files live here.
- Line 5-9: Route static requests or pass PHP requests to PHP-FPM.
- Lines 11-14: PHP-FPM integration through fastcgi; SCRIPT_FILENAME ensures correct PHP execution.

### Line-by-line explanation: ec2-deploy.sh (Code Block I)
- Line 2: Shebang and strict shell mode.
- Line 6: Define APP_DIR and create it if missing.
- Lines 9-11: Initialize a Git repo and pull app code from a remote repository.
- Lines 14-16: Optional Composer steps for PHP dependencies.
- Line 19: Restart Nginx to apply the new app.

Note: The EC2 deployment pattern assumes you have SSH access to the VM and a path where your web app resides. In production, you would typically automate this with a CI/CD pipeline, use TLS (HTTPS with cert-manager/Let’s Encrypt), and employ a proper database service (Amazon RDS) or a managed MySQL on EC2.

---

## X. Common Beginner Mistakes

Here are 3+ real-world pitfalls with bad vs good code. Use these as quick checks when you review deployment code.

Pitfall 1: Hard-coding credentials in source
- Bad:
```php
<?php
$host = 'db.example.com';
$db   = 'mydb';
$user = 'admin';
$pass = 's3cret';
$pdo  = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
```
- Good (use environment variables, secret management, and defaults):
```php
<?php
$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'mydb';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$pdo  = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
```

Pitfall 2: Unsafe SQL (string concatenation) vs prepared statements
- Bad:
```php
$uid = $_GET['id'];
$sql = "SELECT * FROM users WHERE id = $uid";
$pdo->query($sql);
```
- Good (use prepared statements):
```php
$uid = $_GET['id'];
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute(['id' => $uid]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

Pitfall 3: Exposing detailed errors to end users
- Bad:
```php
try {
  // DB connection...
} catch (PDOException $e) {
  echo $e->getMessage();
}
```
- Good:
```php
try {
  // DB connection...
} catch (PDOException $e) {
  // Log the actual error server-side
  error_log($e->getMessage());
  // Show a user-friendly message
  http_response_code(500);
  echo "An internal error occurred. Please try again later.";
}
```

Pitfall 4: Not isolating configuration from code (mixing config)
- Bad (config mixed into code):
```php
$dsn = "mysql:host=mysql-prod;dbname=prod_db";
```
- Good (config driven via environment, externalized):
```php
$envHost = getenv('DB_HOST');
$dsn = "mysql:host=$envHost;dbname=". (getenv('DB_NAME') ?: 'prod_db');
```

Pitfall 5: Missing TLS/HTTPS in production
- Bad (HTTP only):
- Good (redirect to HTTPS and use TLS; example notes only, TLS config not shown here).

---

## Y. Why This Matters In Real Systems — Production Context & Real Usage

- Stability and scalability: Cloud deployments aim for consistent builds, reproducible environments, and the ability to scale horizontally. Docker-based deployments (Railway/Render) make CI/CD predictable and reduce “works on my machine” issues.
- Security: Do not ship secrets in source control. Use environment variables, secret managers, or cloud KMS. For EC2, security groups, TLS termination, and least-privilege DB access are essential.
- Observability and reliability: In production you should monitor health endpoints, set up automated health checks, log aggregation, and alerting. Consider automated rollbacks if a deployment fails.
- Cost and control: EC2 offers fine-grained control (instance types, VPCs, IAM), while Railway/Render abstract away infrastructure for speed. Choose based on team size, scale, and control needs.
- Deployment automation: A robust workflow uses CI/CD to build, test, and deploy across environments (dev/stage/prod) with repeatable steps, not manual interventions.
- Data protection: Regular backups, database snapshots, and point-in-time recovery strategies are critical for production apps.

In short, mastering these three platforms for PHP apps helps you pick the right tool for the job: speed and simplicity (Railway/Render) vs. control and customization (AWS EC2). The patterns shown here—containerization, environment-driven configuration, and a reasonable separation between code and deployment config—are foundational to modern backend infrastructure.

---

## Z. Study Questions — 5 Recall Questions

1) Why should you prefer environment variables over hard-coded credentials in a PHP deployment?
2) What is the purpose of a Dockerfile in cloud deployments, and how does it relate to reproducible builds?
3) How do prepared statements help protect against SQL injection in a PHP PDO context?
4) Compare the deployment models of Railway/Render versus AWS EC2. What are the trade-offs?
5) Name at least three production concerns you should plan for when deploying a PHP app (e.g., TLS, backups, monitoring, scaling).

---

## Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small PHP app and prepare it for three deployment targets (Railway, Render, AWS EC2), then demonstrate how you would deploy it to each platform.

Part A: Create the PHP app (env-driven DB access)
- Deliverables:
  - index.php that connects to a MySQL database using environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASS).
  - A minimal Dockerfile that packages PHP with Apache to serve index.php.
  - A docker-compose.yml for local development with a MySQL container.
- Validation steps:
  - Ensure index.php uses getenv() or $_ENV to fetch DB credentials.
  - Run docker-compose up and access the app at http://localhost:8080.

Part B: Railway deployment artifacts
- Deliverables:
  - railway.toml configuration pointing Railway at your Dockerfile.
  - Optional Procfile if you prefer Heroku-like start syntax.
- Validation steps:
  - Confirm Railway builds the Docker image and starts Apache in the foreground.

Part C: Render deployment artifacts
- Deliverables:
  - render.yaml with a web service that uses the given Dockerfile.
  - Reuse the same Dockerfile from Part A.
- Validation steps:
  - Ensure the service can be built and started by Render.

Part D: AWS EC2 bootstrap and deployment sketches
- Deliverables:
  - ec2-setup.sh script to install Nginx, PHP-FPM, and MySQL, plus a basic firewall rule set.
  - nginx-site.conf snippet for serving PHP via PHP-FPM.
  - ec2-deploy.sh outline that pulls code from a repository and places it under /var/www/html for Nginx to serve.
- Validation steps:
  - On a new EC2 Ubuntu instance, run ec2-setup.sh, place your app under /var/www/html, link the Nginx config, and cycle services.
  - Access the app via the instance public IP to verify PHP execution.

Submission checklist
- All code blocks above are included in your notes.
- The PHP app is runnable locally via Docker Compose (Part A).
- Railway and Render config files reflect the same Dockerfile (Part B & C).
- EC2 bootstrap and deployment steps are clear and executable on a new VM (Part D).

If you want, I can tailor the exact content to a preferred PHP version (e.g., PHP 8.2 vs 8.3), or adjust the Render/Railway config to their latest documented formats.