# Track: Backend Engineering — Phase 2 — Developer Tools & Workflow — Topic: Setting Up a Professional Dev Environment (PHP)

Setting up a professional development environment is the foundation that makes backend work repeatable, scalable, and safe to deploy. In PHP-centric teams, a solid dev environment includes reproducible dependency management, a portable local server stack (often via containers), robust configuration management, debugging and testing hooks, and automation for quality and security checks. This lesson walks you through building a repeatable PHP dev environment you can rely on in production scenarios.

## 1. Establishing a PHP Project Skeleton with Composer and PSR-4 Autoload

A clean project skeleton with proper autoloading and dependency management helps you scale from tiny scripts to large services. Composer is the standard tool for PHP dependency management, and PSR-4 autoloading keeps your codebase organized and autoloadable without manual includes.

```json
// composer.json
{
  "name": "acme/dev-env-php",
  "type": "project",
  "require": {
    "php": "^8.0",
    "vlucas/phpdotenv": "^5.5"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.5",
    "phpstan/phpstan": "^1.11",
    "squizlabs/php_codesniffer": "^3.6"
  },
  "autoload": {
    "psr-4": {
      "App\\": "src/App/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "App\\Tests\\": "tests/"
    }
  },
  "scripts": {
    "test": "phpunit --colors=always",
    "analyse": "phpstan analyse",
    "lint": "phpcs"
  }
}
```

### Line-by-line explanation breaking down each line
- "name": Sets a friendly package name for the project.
- "type": Declares the project type; "project" is a typical value for apps.
- "require": Lists runtime dependencies. PHP 8+ is required; dotenv is included to load environment variables.
- "require-dev": Lists development-time tools (tests and quality checks).
- "autoload": Configures PSR-4 autoloading: the namespace App\ maps to the directory src/App/.
- "autoload-dev": Similar autoloading for development-time code such as tests.
- "scripts": Composer-defined shortcuts to run tests, static analysis, and linting.

```php
// src/App/Controller/HelloController.php
<?php
declare(strict_types=1);

namespace App\Controller;

class HelloController
{
    public function greet(string $name): string
    {
        return "Hello, " . $name;
    }
}
```

### Line-by-line explanation breaking down each line
- <?php declare(strict_types=1); ensures strict typing for this file.
- namespace App\Controller; declares the class’ namespace, aligning with PSR-4 autoloading.
- class HelloController { ... } defines a simple controller with a single method.
- public function greet(string $name): string { ... } takes a string, returns a string, and uses strict typing.

```php
// index.php
<?php
require __DIR__ . '/vendor/autoload.php';

use App\Controller\HelloController;

$controller = new HelloController();
echo $controller->greet('World');
```

### Line-by-line explanation breaking down each line
- require __DIR__ . '/vendor/autoload.php'; loads Composer’s autoloader so App\Controller\HelloController is resolvable.
- use App\Controller\HelloController; imports the class for convenience.
- $controller = new HelloController(); creates an instance.
- echo $controller->greet('World'); prints the result of the greet method.

## 2. Local Development Environment with Docker Compose

A portable dev stack makes it easy to run the same environment locally as in staging/production. A typical PHP stack uses PHP-FPM for PHP execution, Nginx as the web server, and a database like MySQL. Docker Compose coordinates these services.

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: php_app
    volumes:
      - .:/var/www/html
      - ./vendor:/var/www/html/vendor
    working_dir: /var/www/html
    networks:
      - devnet

  web:
    image: nginx:1.23
    container_name: nginx_web
    ports:
      - "8080:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - .:/var/www/html
    depends_on:
      - app
    networks:
      - devnet

  db:
    image: mysql:8.0
    container_name: mysql_db
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: devdb
      MYSQL_USER: devuser
      MYSQL_PASSWORD: devpass
    ports:
      - "3306:3306"
    volumes:
      - dbdata:/var/lib/mysql
    networks:
      - devnet

volumes:
  dbdata:

networks:
  devnet:
```

### Line-by-line explanation breaking down each line
- version: '3.9' declares the compose file version.
- services: begins the list of containers to run.
- app: defines the PHP application service.
  - build: context and dockerfile specify how to build the PHP image.
  - volumes: mount the project so code changes are reflected live.
  - working_dir: sets the working directory inside the container.
- web: defines the Nginx web server service.
  - image: nginx:1.23 uses a stable Nginx image.
  - ports: maps host port 8080 to container port 80 for web access.
  - volumes: mounts Nginx config and the app code into the container.
  - depends_on: ensures app starts before web.
- db: defines the MySQL database service.
  - environment: sets root password, database name, user, and password.
  - ports and volumes: expose and persist database data.
- volumes: dbdata persists database data across restarts.
- networks: devnet creates a shared network so containers can talk to each other.

```dockerfile
# Dockerfile
FROM php:8.2-fpm

# Install system dependencies and PHP extensions
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libicu-dev \ 
        libzip-dev \
    && docker-php-ext-install intl pdo_mysql zip

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application code
COPY . .

# Install PHP dependencies
RUN composer install --no-progress --no-interaction

# Expose the PHP-FPM port
EXPOSE 9000
```

### Line-by-line explanation breaking down each line
- FROM php:8.2-fpm selects the PHP-FPM base image.
- RUN apt-get update && apt-get install ... installs ICU, ZIP libraries and any needed libs.
- RUN docker-php-ext-install intl pdo_mysql zip builds PHP extensions for internationalization, MySQL, and ZIP handling.
- COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer pulls Composer into the image so you can install deps inside the container.
- WORKDIR /var/www/html sets the working directory.
- COPY . . copies project files into the container.
- RUN composer install --no-progress --no-interaction installs PHP dependencies inside the container.
- EXPOSE 9000 exposes PHP-FPM port for the web Server to connect to.

```nginx
# nginx/default.conf
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg)$ {
        expires max;
        log_not_found off;
    }
}
```

### Line-by-line explanation breaking down each line
- server { listen 80; } starts an HTTP server on port 80.
- root /var/www/html/public; sets the document root to the public directory.
- index index.php; defines the default file to serve.
- location / { try_files ... } routes requests to files or to index.php for front controllers.
- location ~ \.php$ { ... } handles PHP files by passing them to the PHP-FPM service.
- fastcgi_pass app:9000; directs PHP requests to the app service at port 9000.
- fastcgi_param SCRIPT_FILENAME and DOCUMENT_ROOT pass correct path info to PHP.

## 3. Environment Variables and Secrets Management

A professional environment avoids hard-coded secrets and uses environment variables instead. dotenv (vlucas/phpdotenv) loads variables from a .env file into the runtime, enabling per-environment configuration without code changes.

```dotenv
# .env
APP_ENV=development
APP_DEBUG=true

DB_HOST=127.0.0.1
DB_DATABASE=devdb
DB_USER=devuser
DB_PASSWORD=devpass
```

### Line-by-line explanation breaking down each line
- APP_ENV controls the application environment (development/production).
- APP_DEBUG toggles verbose error reporting.
- DB_HOST, DB_DATABASE, DB_USER, DB_PASSWORD hold database credentials used by the app.

```dotenv
# .env.example (template for repo)
APP_ENV=development
APP_DEBUG=true

DB_HOST=${DB_HOST:-127.0.0.1}
DB_DATABASE=${DB_DATABASE:-devdb}
DB_USER=${DB_USER:-devuser}
DB_PASSWORD=${DB_PASSWORD:-devpass}
```

### Line-by-line explanation breaking down each line
- .env.example provides a template for contributors to copy and fill in real values.
- The syntax ${VAR:-default} supplies a safe default if the variable is not set in the environment.

```php
// bootstrap.php
<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Access environment variables
$dsn = sprintf('mysql:host=%s;dbname=%s', $_ENV['DB_HOST'] ?? '127.0.0.1', $_ENV['DB_DATABASE'] ?? 'devdb');
$username = $_ENV['DB_USER'] ?? 'devuser';
$password = $_ENV['DB_PASSWORD'] ?? 'devpass';

// Example usage
try {
    $pdo = new PDO($dsn, $username, $password);
    // set attributes, etc.
} catch (PDOException $e) {
    // handle error
}
```

### Line-by-line explanation breaking down each line
- require autoload.php loads Composer dependencies.
- Dotenv::createImmutable(__DIR__)->load() loads environment variables from .env into $_ENV/$_SERVER.
- DSN and credential extraction read from environment variables with safe fallbacks.
- PDO instantiation demonstrates using the environment-configured DB connection.

## 4. Debugging and Testing

A robust environment includes debugging hooks (e.g., Xdebug) and a suite of tests (e.g., PHPUnit). This section shows how to wire debugging and testing into the PHP dev flow.

```xml
<!-- phpunit.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="vendor/autoload.php"
         colors="true"
         verbose="true">
  <testsuites>
    <testsuite name="Application Test Suite">
      <directory>./tests</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

### Line-by-line explanation breaking down each line
- bootstrap="vendor/autoload.php" ensures Composer autoload is used for tests.
- colors="true" and verbose="true" improve test output readability.
- <testsuites> defines which directories contain tests; here, tests/.

```php
// tests/HelloControllerTest.php
<?php
namespace App\Tests;

use App\Controller\HelloController;
use PHPUnit\Framework\TestCase;

class HelloControllerTest extends TestCase
{
    public function testGreetReturnsGreeting(): void
    {
        $ctrl = new HelloController();
        $this->assertEquals('Hello, World', $ctrl->greet('World'));
    }
}
```

### Line-by-line explanation breaking down each line
- Test class extends PHPUnit\Framework\TestCase to gain assertion methods.
- testGreetReturnsGreeting asserts the expected output of greet.

```ini
; php.ini.d/xdebug.ini
zend_extension=xdebug.so
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
```

### Line-by-line explanation breaking down each line
- zend_extension loads Xdebug.
- xdebug.mode=debug enables debugging features.
- xdebug.start_with_request=yes enables remote debugging at the start of each request.
- xdebug.client_host/port configure where your IDE listens for debugging connections.

## 5. Code Quality, Security, and CI/CD

Quality gates ensure maintainability and security as you scale. This includes static analysis, linting, and automated CI workflows.

```neon
# phpstan.neon
parameters:
  level: max
  paths:
    - src
    - tests
```

### Line-by-line explanation breaking down each line
- level: max enables the strictest analysis level.
- paths: restrict analysis to the source and tests directories for speed and focus.

```xml
<!-- .phpcs.xml -->
<?xml version="1.0"?>
<ruleset name="Project Rules">
  <rule ref="PSR12"/>
  <rule ref="Generic.Formatting.DisallowMultipleStatements"/>
  <property name="severity" value="error"/>
</ruleset>
```

### Line-by-line explanation breaking down each line
- PSR-12 standard enforces modern PHP formatting and structure.
- Disallow multiple statements per line reduces readability issues.
- severity="error" makes violations fail the CI job.

```yaml
# .github/workflows/php.yml
name: PHP

on:
  push:
  pull_request:

jobs:
  php:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.2
      - name: Install dependencies
        run: composer install --no-progress --no-interaction
      - name: Run PHPStan
        run: vendor/bin/phpstan analyse
      - name: Run PHP Unit
        run: vendor/bin/phpunit --colors=always
```

### Line-by-line explanation breaking down each line
- The workflow triggers on push and PR events.
- Setup PHP with a specific version to ensure consistency.
- Install dependencies via Composer.
- Run static analysis (PHPStan) to catch issues early.
- Run unit tests (PHPUnit) to verify behavior.

## 6. Developer Workflow & Reproducibility

A professional dev environment ships with reproducible scripts and a clean workflow to go from source to running stack, reproduce issues, and automate common tasks.

```makefile
# Makefile
.PHONY: up down install test lint analyse

up:
	docker-compose up -d

down:
	docker-compose down

install:
	docker-compose run --rm app composer install

test:
	docker-compose exec app vendor/bin/phpunit --colors=always

lint:
	docker-compose exec app composer run lint

analyse:
	docker-compose exec app composer run analyse
```

### Line-by-line explanation breaking down each line
- up and down start and stop the container stack in detached mode.
- install runs Composer install inside the app container to install dependencies in the containerized environment.
- test runs PHPUnit inside the app container to ensure tests execute in a consistent environment.
- lint and analyse run code quality checks via Composer scripts wired earlier.

## X. Common Beginner Mistakes

- Bad: Hard-coding credentials in source files
  - Good: Use environment variables and a loader (dotenv) to supply secrets at runtime.
  Bad:
  ```php
  // dangerous: credentials in code
  $db = new PDO('mysql:host=127.0.0.1;dbname=devdb', 'devuser', 'devpass');
  ```
  Good:
  ```php
  // safe: credentials come from environment
  $db = new PDO(
      'mysql:host=' . $_ENV['DB_HOST'] . ';dbname=' . $_ENV['DB_DATABASE'],
      $_ENV['DB_USER'],
      $_ENV['DB_PASSWORD']
  );
  ```

- Bad: Not using Composer autoload; including files manually
  Bad:
  ```php
  require __DIR__ . '/src/App/Controller/HelloController.php';
  $controller = new App\Controller\HelloController();
  ```
  Good:
  ```php
  require __DIR__ . '/vendor/autoload.php';
  use App\Controller\HelloController;
  $controller = new HelloController();
  ```

- Bad: Ignoring environment-specific config; always using development settings
  Bad:
  ```php
  $config = [
    'debug' => true,
    'db_host' => '127.0.0.1',
  ];
  ```
  Good:
  ```php
  // .env and bootstrap usage
  // environment-specific toggles loaded via vlucas/phpdotenv
  $config['debug'] = ($_ENV['APP_ENV'] ?? 'development') === 'development';
  ```

- Bad: Skipping tests or static analysis in CI
  Bad:
  ```yaml
  # CI runs only deploy
  - name: Build
    run: echo "build"
  ```
  Good:
  ```yaml
  - name: Run tests
    run: composer test
  - name: Run static analysis
    run: composer analyse
  ```

## Y. Why This Matters In Real Systems

- Reproducibility: Containers and defined dependencies ensure every developer, CI, and staging environment runs the same stack, reducing “works on my machine” issues.
- Safety: Environment variables protect secrets and allow per-environment configuration without changing code.
- Quality gates: Static analysis, linting, unit tests, and CI workflows catch regressions early and enforce coding standards.
- Maintainability: A clear project skeleton and autoloaded structure scale with team size, enabling parallel workstreams without tight coupling.
- Deployment parity: The Docker-based dev environment can be mirrored in staging/production, minimizing surprise during deployment.

## Z. Study Questions

1) What is PSR-4 autoloading and why is it important for PHP projects?  
2) How does Docker Compose help ensure developer tooling parity across machines?  
3) What is the role of vlucas/phpdotenv in a PHP application?  
4) Why should secrets and configuration be driven by environment variables rather than hard-coded values?  
5) Name two common PHP QA tools used in CI pipelines and what they check.

## Exercise

Part A: Create a minimal PHP project with Composer autoload and a Hello endpoint
- Initialize a new PHP project with Composer (as shown in Section 1).
- Add a HelloController with a greet method and a small index.php to expose the greeting.

Part B: Build a reproducible local dev environment
- Create a Dockerfile and docker-compose.yml (as in Section 2) to run PHP-FPM, Nginx, and MySQL.
- Add an nginx default.conf for PHP handling.

Part C: Add environment configuration
- Create a .env.example and a bootstrap.php that loads environment variables and connects to MySQL using PDO.

Part D: Add tests and CI basics
- Write a PHPUnit test for HelloController and wire a phpunit.xml.
- Add a GitHub Actions workflow to run tests and PHPStan (as in Section 5).

Part E: Add tooling for quality
- Add PHPStan and PHP_CodeSniffer configurations and demonstrate running them via Composer scripts.

Submission checklist:
- [ ] composer.json with autoload and scripts
- [ ] PHP source files following PSR-4 structure
- [ ] Dockerfile, docker-compose.yml, and nginx config
- [ ] .env.example and bootstrap.php
- [ ] PHPUnit tests and phpunit.xml
- [ ] PHPStan and PHP_CodeSniffer configs
- [ ] GitHub Actions workflow
- [ ] Makefile or equivalent for common tasks

This completes a coherent, professional PHP dev environment setup with reproducibility, tooling, and growth-ready structure. If you want, I can tailor the Docker setup for a specific OS, or swap in a framework (e.g., Slim or Laravel) while preserving the same dev workflow concepts.