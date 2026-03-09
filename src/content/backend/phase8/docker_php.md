# Docker — Containers & docker-compose in PHP Backend

Docker containers give PHP backends isolated, reproducible environments that run identically from local dev to production. docker-compose orchestrates multi-container workloads (PHP-FPM, Nginx, databases, caches) with a single command. This lesson teaches you how to containerize a PHP app, wire PHP-FPM with Nginx, add a database, and perform migrations — all in a PHP-friendly workflow.

## 1. Understanding Containers, Images, and docker-compose

In professional PHP development, you ship your app as code plus a container configuration. A container image is a static snapshot of an environment; a container is a running instance of that image. docker-compose lets you compose multiple containers (PHP, web server, DB) with shared networks and volumes.

Code example: Dockerfile, nginx config, docker-compose.yml

```Dockerfile
# Dockerfile for a PHP 8.1 FPM app
FROM php:8.1-fpm-alpine

# Install system dependencies and PHP extensions
RUN apk add --no-cache libzip-dev zip unzip \
    && docker-php-ext-configure zip \
    && docker-php-ext-install pdo_mysql zip

# Working directory inside the container
WORKDIR /var/www

# Copy application source into the image
COPY . /var/www

# Ensure correct permissions
RUN chown -R www-data:www-data /var/www
```

### Line-by-line explanation
- FROM php:8.1-fpm-alpine: Uses a lightweight PHP 8.1 FPM image based on Alpine Linux.
- RUN apk add --no-cache libzip-dev zip unzip ...: Installs libraries needed for PHP extensions (zip, PDO MySQL) while keeping the image small.
- && docker-php-ext-configure zip: Configures the zip extension before building it.
- && docker-php-ext-install pdo_mysql zip: Compiles and enables the PDO MySQL and zip extensions.
- WORKDIR /var/www: Sets the default working directory for subsequent commands and runtime.
- COPY . /var/www: Copies your application code into the container.
- RUN chown -R www-data:www-data /var/www: Ensures the web user owns the app files for proper file permissions.

```yaml
# docker-compose.yml: PHP-FPM + Nginx + MySQL stack
version: "3.9"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: php-app
    volumes:
      - .:/var/www
    expose:
      - "9000"
    networks:
      - appnet

  nginx:
    image: nginx:1.23-alpine
    container_name: nginx
    ports:
      - "8080:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - .:/var/www
    depends_on:
      - app
    networks:
      - appnet

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass
    volumes:
      - db-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - appnet

networks:
  appnet:

volumes:
  db-data:
```

### Line-by-line explanation
- version: "3.9": Docker Compose file format version.
- services: Defines the services in the app stack: app (PHP-FPM), nginx (web server), db (MySQL).
- app:
  - build: context and dockerfile: Build the PHP image from the local Dockerfile.
  - volumes: .:/var/www binds code on the host into the container for live development.
  - expose: "9000" makes PHP-FPM available to the Nginx container on the same network.
  - networks: appnet joins the shared network.
- nginx:
  - image: nginx:1.23-alpine uses a lightweight Nginx image.
  - ports: "8080:80" exposes the site on localhost:8080.
  - volumes: Mounts Nginx config and the app code inside the container.
  - depends_on: ensures PHP app starts before Nginx.
- db:
  - image: mysql:8.0 runs a MySQL 8 container.
  - environment: sets root password and a database/user for the app.
  - volumes: persists database data across restarts.
  - ports: "3306:3306" exposes MySQL for debugging (in prod you’d restrict this).
- networks/appnet and volumes/db-data: define the shared network and persistent DB storage.

```nginx
# nginx/default.conf: Nginx config to proxy PHP-FPM
server {
  listen 80;
  server_name localhost;
  root /var/www/public;
  index index.php index.html;

  location / {
    try_files $uri $uri/ /index.php?$query_string;
  }

  location ~ \.php$ {
    fastcgi_pass php-app:9000;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
  }
}
```

### Line-by-line explanation
- server { listen 80; }: Exposes port 80 inside the container; Nginx handles HTTP requests.
- server_name localhost;: Server hostname for this configuration.
- root /var/www/public;: Document root where PHP entry points live (e.g., public/index.php).
- index index.php index.html;: Default index file order.
- location / { try_files ... }: Route requests to existing files or to index.php for routing.
- location ~ \.php$ { ... }: Pass PHP requests to the PHP-FPM service via FastCGI.
- fastcgi_pass php-app:9000;: Forwards PHP requests to the PHP-FPM container named php-app on port 9000.
- fastcgi_param SCRIPT_FILENAME ...: Provides the full path to the PHP file for execution.
- include fastcgi_params;: Loads standard FastCGI parameters.

## 2. Dockerfile for a PHP App

This section shows a more production-oriented PHP build: installing PHP extensions, installing dependencies with Composer, and preparing a non-root runtime.

Code blocks: Dockerfile and a small PHP script example to verify CLI access

```Dockerfile
# Dockerfile for a PHP 8.1 FPM app (production-friendly)
FROM php:8.1-fpm-alpine

RUN apk add --no-cache libzip-dev unzip \
  && docker-php-ext-configure zip \
  && docker-php-ext-install pdo_mysql zip

WORKDIR /var/www

# Copy dependency manifests first for leverage in the cache
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
  && composer install --no-dev --optimize-autoloader

# Copy the application code
COPY . .

RUN chown -R www-data:www-data /var/www
USER www-data

EXPOSE 9000
```

### Line-by-line explanation
- FROM php:8.1-fpm-alpine: Lightweight PHP-FPM base image with Alpine as the OS.
- RUN apk add --no-cache libzip-dev unzip ...: Installs libraries needed for PHP extensions (zip) and MySQL support.
- && docker-php-ext-configure zip && docker-php-ext-install pdo_mysql zip: Builds and enables the pdo_mysql and zip extensions.
- WORKDIR /var/www: Sets the container’s working directory for subsequent commands and runtime.
- COPY composer.json composer.lock ./: Copies dependency manifests to leverage Docker cache during install.
- RUN curl ... composer install --no-dev --optimize-autoloader: Installs PHP dependencies inside the image with production optimizations.
- COPY . .: Copies the application code into the image.
- RUN chown -R www-data:www-data /var/www: Sets proper ownership for the web user.
- USER www-data: Runs subsequent processes as a non-root user for security.
- EXPOSE 9000: Indicates the port PHP-FPM will listen on (to be proxied by a web server).

## 3. Running and Connecting to a MySQL Database with docker-compose

To connect PHP code to MySQL inside containers, you typically reference the MySQL container by its service name (db) as the host. The PHP code uses PDO to connect via environment-provided credentials.

Code: docker-compose snippet and a small PHP DB connect example

```yaml
version: "3.9"
services:
  app:
    build: .
    environment:
      DB_HOST: db
      DB_DATABASE: appdb
      DB_USER: appuser
      DB_PASSWORD: apppass
    volumes:
      - .:/var/www
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass
    volumes:
      - db-data:/var/lib/mysql
    ports:
      - "3306:3306"

volumes:
  db-data:
```

```php
<?php
// db-connect.php
$host = getenv('DB_HOST') ?: 'db';
$db   = getenv('DB_DATABASE') ?: 'appdb';
$user = getenv('DB_USER') ?: 'appuser';
$pass = getenv('DB_PASSWORD') ?: 'apppass';
$dsn  = "mysql:host=$host;dbname=$db;charset=utf8mb4";

try {
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  echo "DB connected";
} catch (PDOException $e) {
  echo "DB connect failed: " . $e->getMessage();
}
```

### Line-by-line explanation
- DB_HOST, DB_DATABASE, DB_USER, DB_PASSWORD: Environment variables supplied by docker-compose to configure the connection.
- $host = getenv('DB_HOST') ?: 'db';: Reads DB_HOST; defaults to the db service name if not present.
- $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";: Builds a PDO DSN for MySQL with UTF-8.
- new PDO(...): Creates a new PDO instance with error handling and default fetch mode.
- try/catch: Gracefully handles connection failures and prints a message for debugging.

## 4. Running Migrations and Tasks with docker-compose

Migration and ad-hoc PHP tasks are common in PHP backends. Use a CLI script inside the app container and run it via docker-compose.

Code: migrate.php and commands to run it

```php
<?php
// migrate.php
$host = getenv('DB_HOST') ?: 'db';
$db   = getenv('DB_DATABASE') ?: 'appdb';
$user = getenv('DB_USER') ?: 'appuser';
$pass = getenv('DB_PASSWORD') ?: 'apppass';
$dsn  = "mysql:host=$host;dbname=$db;charset=utf8mb4";

try {
  $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ");
  echo "Migration applied";
} catch (PDOException $e) {
  echo "Migration failed: ".$e->getMessage();
}
```

```bash
# One-off migration run against the running app container
docker-compose run --rm app php migrate.php
# Or, while the app container is running, attach to it
docker-compose exec app php migrate.php
```

### Line-by-line explanation
- The PHP script connects to the DB using PDO with credentials from environment or defaults.
- It creates a users table if it does not exist, modeling a simple schema for a real app.
- Migration output messages indicate success or reveal errors for debugging.

## 5. Common Beginner Mistakes

X. Common Beginner Mistakes — bad vs good

1) Caching composer install vs reinstall on code changes
- Bad:
```Dockerfile
COPY . /var/www
RUN composer install
```
- Good:
```Dockerfile
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader
COPY . .
```
2) Inefficient layer caching and missing cleanup
- Bad:
```Dockerfile
RUN apt-get update
RUN apt-get install -y libzip-dev
```
- Good:
```Dockerfile
RUN apt-get update && apt-get install -y libzip-dev && rm -rf /var/lib/apt/lists/*
```
3) Running PHP-FPM behind Nginx without a proper non-root user
- Bad:
```Dockerfile
# no user switch
```
- Good:
```Dockerfile
RUN adduser -D appuser
USER appuser
```
4) Exposing internal ports unnecessarily and bypassing a reverse proxy
- Bad:
```yaml
ports:
  - "9000:9000"  # access PHP-FPM directly from host
```
- Good:
```yaml
ports:
  - "8080:80"  # go through Nginx, keep PHP-FPM internal
```
5) Not binding code into the container for development
- Bad:
```yaml
volumes: []
```
- Good:
```yaml
volumes:
  - .:/var/www
```

## 6. Why This Matters In Real Systems

- Reproducibility: Docker ensures the same PHP version, extensions, and OS in all environments.
- Isolation: Each service (PHP-FPM, Nginx, DB) runs in its own container, reducing cross-service conflicts.
- Deployability: A single docker-compose file (or Kubernetes manifests later) moves from dev to prod with minimal changes.
- Security: Running PHP as a non-root user, limiting exposed ports, and using read-only volumes and secrets management improves security posture.
- Operations: Health checks, logging, and orchestration (scaling, zero-downtime deploys) become feasible when your stack is containerized.
- Production patterns: multi-stage builds, image tagging, version pinning, and secrets management are standard practices to maintain stability and security.

Practical production tips:
- Use a separate production docker-compose.override.yml for environment-specific config.
- Add healthchecks to containers (e.g., HTTP check on Nginx, MySQL ping).
- Prefer nginx + php-fpm with a proxied setup rather than serving PHP via CLI values.
- Keep sensitive credentials out of docker-compose.yml; use Docker Secrets or environment-variable management.
- Persist DB data with named volumes and back up regularly.

## 7. Study Questions

1) What are the main differences between a Docker image and a running container?
2) How does docker-compose help manage a PHP app with PHP-FPM, Nginx, and MySQL?
3) Why should you mount your application code into the container during development?
4) How can you run a PHP CLI task (e.g., migrations) against a running multi-container stack?
5) Name two production hardening practices when containerizing a PHP app.

## 8. Exercise

Part A: Scaffold a minimal PHP app with Dockerized dev stack
- Create a simple PHP app with an index.php and a health.php.
- Build a Dockerfile for PHP-FPM (8.1) and a small Nginx config, plus a docker-compose.yml to run app + nginx + mysql.

Code you should create or modify:

- index.php
```php
<?php
echo "Hello from Dockerized PHP!";
```

- health.php
```php
<?php
http_response_code(200);
echo "OK";
```

- Dockerfile
```Dockerfile
FROM php:8.1-fpm-alpine
RUN apk add --no-cache libzip-dev unzip \
  && docker-php-ext-install pdo_mysql
WORKDIR /var/www
COPY . .
RUN chown -R www-data:www-data /var/www
USER www-data
EXPOSE 9000
```

- nginx/default.conf
```nginx
server {
  listen 80;
  server_name localhost;
  root /var/www/public;
  index index.php;

  location / {
    try_files $uri $uri/ /index.php?$query_string;
  }

  location ~ \.php$ {
    fastcgi_pass php-app:9000;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
  }
}
```

- docker-compose.yml
```yaml
version: "3.9"
services:
  app:
    build: .
    volumes:
      - .:/var/www
    expose:
      - "9000"

  nginx:
    image: nginx:1.23-alpine
    ports:
      - "8080:80"
    depends_on:
      - app
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - .:/var/www

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass
    volumes:
      - db-data:/var/lib/mysql
    ports:
      - "3306:3306"

volumes:
  db-data:
```

Part B: Bring up the stack and verify
- Run: docker-compose up -d
- Open http://localhost:8080 to see the PHP app respond.
- Check that http://localhost:8080/health.php returns OK.

Part C: Add a simple migration
- Create migrate.php (see above migrate.php example).
- Run: docker-compose run --rm app php migrate.php
- Confirm that a users table is created in the MySQL database.

Part D: Confirm live code changes reflect without rebuilding
- Edit index.php to return a new message.
- Refresh http://localhost:8080; you should see the updated text without rebuilding the image, since the host path is mounted into the app container.

Part E: Clean up and production-readiness notes
- Stop and remove containers: docker-compose down
- Consider adding a nginx-healthcheck and a db-healthcheck in the docker-compose file for production readiness.
- Consider replacing the direct MySQL port exposure with a secure internal network in production and use a tunnel or VPN for admin access.