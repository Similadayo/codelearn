# Track: Backend Engineering — Phase 6 — Authentication & Security: HTTPS, TLS & CORS Configuration in Ruby

In modern Ruby backends, HTTPS, TLS, and CORS are foundational to protecting data in transit, preventing man-in-the-middle attacks, and safely sharing resources across domains. Properly configuring TLS versions and ciphers, enabling HTTP Strict Transport Security (HSTS), and narrowly scoping Cross-Origin Resource Sharing (CORS) are essential skills for production-grade APIs. This lesson walks you through practical, Ruby-centric examples you can adapt to Rails or Rack-based apps, with concrete code, explanations, and real-world considerations.

## 1. HTTPS, TLS & Certificates in a Ruby Backend

Compellingly, HTTPS and TLS are the gatekeepers of trust between clients and servers. For Ruby apps, TLS can be terminated at a reverse proxy (like Nginx) with the app running behind it, or terminated directly in your Ruby server (e.g., Puma) for development or certain deployments. The important part is to ensure TLS is enabled, certificates are valid, and the app enforces HTTPS consistently.

Code: Ruby on Rails production SSL settings and a reverse-proxy TLS termination example.

```ruby
# config/environments/production.rb
Rails.application.configure do
  # Enforce HTTPS for all connections
  config.force_ssl = true

  # HTTP Strict Transport Security (HSTS)
  # Tells browsers to always use HTTPS for this domain
  config.ssl_options = {
    hsts: {
      expires: 31536000, # 1 year
      subdomains: true
      # optional: preload: true
    }
  }
end
```

```nginx
# nginx.conf (server block for the app)
server {
  listen 443 ssl http2;
  server_name app.example.com;

  ssl_certificate /etc/ssl/certs/app.example.com.crt;
  ssl_certificate_key /etc/ssl/private/app.example.com.key;

  # TLS protocols and cipher suite
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256';
  ssl_prefer_server_ciphers on;

  # Optional: enable HSTS at the proxy layer as a defense in depth
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location / {
    proxy_pass http://127.0.0.1:3000;  # Rails app runs on Puma at 3000
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

### Line-by-line explanation
- Ruby snippet (production.rb)
  - line 1: Begin Rails production configuration block.
  - line 3: config.force_ssl = true enables HTTPS redirection for all requests.
  - line 6-10: config.ssl_options with hsts settings to tell browsers to only use HTTPS for this domain; expires sets the max-age, subdomains applies to subdomains.
- Nginx snippet
  - line 3: Start a server block listening on port 443 with SSL and HTTP/2.
  - line 4: Set the server name for the TLS host.
  - lines 6-7: Specify the TLS certificate and private key paths.
  - line 10: Limit accepted TLS protocol versions to 1.2 and 1.3 for modern security.
  - line 11: Choose a set of strong cipher suites.
  - line 12: Prefer server's cipher order to avoid weaker client preferences.
  - line 15: Add an HTTP header to enforce HSTS in browsers.
  - lines 17-23: Proxy traffic to the Rails app, forwarding essential headers and preserving the HTTPS context.

## 2. TLS Protocols, Cipher Suites & Versioning

Understanding and enforcing TLS versions and cipher suites is critical to prevent weak cryptography from creeping into production.

Code: Ruby client-side TLS versioning with Net::HTTP and Nginx server-side TLS versioning.

```ruby
# A small Ruby client enforcing TLS 1.2 to talk to a TLS-enabled service
require 'net/http'
require 'uri'

uri = URI.parse('https://example.com/api')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
http.ssl_version = :TLSv1_2  # Enforce TLS 1.2
http.verify_mode = OpenSSL::SSL::VERIFY_PEER

response = http.get(uri.request_uri)
puts "Status: #{response.code}"
puts "Body: #{response.body}"
```

```nginx
# nginx.conf snippet for enforcing modern TLS versions
server {
  listen 443 ssl http2;
  server_name example.com;

  ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

  # Enforce modern TLS versions and strong ciphers
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...
  ssl_prefer_server_ciphers on;

  location / {
    proxy_pass http://127.0.0.1:3000;
  }
}
```

### Line-by-line explanation
- Ruby client
  - line 5: Create an HTTP client for the target host and port.
  - line 6: Enable SSL for the connection.
  - line 7: Force the client to use at least TLS version 1.2.
  - line 8: Enable certificate verification to prevent man-in-the-middle attacks.
  - line 10-11: Perform the request and print response status/body; demonstrates a secure outgoing request.
- Nginx server
  - line 5: Start server block for TLS-enabled host.
  - line 7-8: Supply the server’s TLS certificate and private key.
  - line 11: Restrict protocol versions to TLS 1.2 and 1.3 for modern security.
  - line 12: Select strong ciphers, prioritizing server’s choice.
  - line 15: Proxy traffic to the backend app.

## 3. CORS Configuration in Ruby (Rack/Cors)

Cross-Origin Resource Sharing controls which domains can access your API. In Ruby (Rails), rack-cors is a common solution.

Code: Gemfile addition and Rails initializer for CORS.

```ruby
# Gemfile
gem 'rack-cors', require: 'rack/cors'
```

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'https://example.com', 'https://api.example.com'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      max_age: 600
      # credentials: true # Uncomment if you need cookies in CORS requests
  end
end
```

### Line-by-line explanation
- Gemfile
  - line 2: Adds the rack-cors gem, enabling CORS middleware support.
- cors.rb
  - line 5: Insert Rack::Cors middleware at the top of the middleware stack.
  - line 7: Define an allowed origin set (two trusted domains).
  - line 8: Allow all resource paths ('*') and any headers.
  - line 9-11: Permit common HTTP methods used by APIs.
  - line 12: Set a max-age for preflight responses to reduce preflight overhead.
  - line 13: Optional: enable credentials (cookies, authorization headers) if needed.

## 4. Security Headers, HSTS, OCSP Stapling & Observability

Beyond TLS, security headers and certificate validation mechanisms add layers of defense.

Code: Rails security headers and Nginx OCSP stapling + HSTS.

```ruby
# config/environments/production.rb
Rails.application.configure do
  config.force_ssl = true
  config.ssl_options = {
    hsts: {
      expires: 31536000,
      subdomains: true
    }
  }
  # Ensure cookies are Secure
  config.session_store :cookie_store, key: '_myapp_session', secure: true
end
```

```nginx
# nginx.conf snippet for OCSP stapling and HSTS headers
http {
  ssl_stapling on;
  ssl_stapling_verify on;
  ssl_trusted_certificate /etc/ssl/certs/ca-bundle.pem;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

### Line-by-line explanation
- Rails config
  - line 3: Enforce HTTPS across the app.
  - lines 4-9: Configure HSTS with a 1-year max-age and subdomain coverage.
  - line 12: Ensure session cookies are transmitted only over HTTPS.
- Nginx
  - lines 4-6: Enable and verify OCSP stapling, aiding certificate revocation checks without extra round-trips.
  - line 7: Point to a trusted CA bundle for stapling verification.
  - line 9: Add a strict HSTS header to all responses, including subdomains and preload directive for supported browsers.

## 5. X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Not forcing SSL in production
  - Bad:
    ```ruby
    # config/environments/production.rb
    config.force_ssl = false
    ```
  - Good:
    ```ruby
    # config/environments/production.rb
    config.force_ssl = true
    ```

- Pitfall 2: Insecure cookies (no Secure flag)
  - Bad:
    ```ruby
    # config/initializers/session_store.rb
    Rails.application.config.session_store :cookie_store, key: '_myapp_session'
    ```
  - Good:
    ```ruby
    # config/initializers/session_store.rb
    Rails.application.config.session_store :cookie_store, key: '_myapp_session', secure: true
    ```

- Pitfall 3: Overly permissive CORS
  - Bad:
    ```ruby
    # config/initializers/cors.rb
    origins '*'
    ```
  - Good:
    ```ruby
    # config/initializers/cors.rb
    origins 'https://example.com', 'https://api.example.com'
    ```

- Pitfall 4: Using a self-signed certificate in production
  - Bad (Nginx):
    ```nginx
    ssl_certificate /etc/ssl/certs/selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/selfsigned.key;
    ```
  - Good:
    ```nginx
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ```

- Pitfall 5: Missing HSTS or weak TLS versions
  - Bad:
    ```nginx
    ssl_protocols TLSv1 TLSv1.1;
    ```
  - Good:
    ```nginx
    ssl_protocols TLSv1.2 TLSv1.3;
    ```

- Pitfall 6: No certificate rotation/renewal process
  - Bad: Manual renewal only
  - Good: Automated renewal using certbot with a cron/hourly job

## 6. Y. Why This Matters In Real Systems — production context and real usage

- Trust and data protection: TLS prevents eavesdropping, tampering, and impersonation on the network.
- Compliance: PCI DSS, GDPR, HIPAA, and other standards require proper TLS versioning, certificate management, and secure configurations.
- Performance: HTTP/2 (enabled by HTTPS) and TLS session resumption reduce latency. OCSP stapling avoids extra round trips for certificate revocation checks.
- Operational excellence: Automated certificate issuance/renewal (e.g., Let's Encrypt), monitoring TLS health, and regular audits reduce risk of outages due to expired certs.
- Auditing and observability: Maintain logs of TLS handshakes, cipher suites used, and TLS version distribution. Tools like Nginx’s access logs, Ruby logger, and external scanners help verify configuration.

Real-world patterns:
- TLS termination at a reverse proxy (Nginx/Envoy) with the Ruby app behind it, using strict TLS protocols and HSTS.
- Separate CORS policy tuned to allow only specific client domains, with credentials only when necessary.
- Regular certificate rotation workflows integrated with CI/CD and monitoring alerts for expirations.
- Security headers (HSTS, CSP if needed, X-Content-Type-Options) applied consistently.

## Z. Study Questions — recall and quick reasoning (5 questions)

1. What is the primary purpose of HTTP Strict Transport Security (HSTS), and where is it typically configured?
2. How do you enforce TLS 1.2 or higher for a Ruby-based client using Net::HTTP?
3. In Rails, how do you configure CORS to allow only specific origins and what does max_age control?
4. Why is it generally recommended to terminate TLS at a reverse proxy like Nginx rather than on the Ruby app server in production?
5. What are OCSP stapling and its benefit in TLS negotiation?

## Exercise — practical multi-part coding challenge

Part A: Set up TLS termination and HTTPS in a small Rails app
- Goals:
  - Enable HTTPS with TLS 1.2/1.3 in production using Nginx as a reverse proxy.
  - Enforce HSTS and force_ssl in Rails.
  - Use a trusted certificate (e.g., Let’s Encrypt) and set up automatic renewal.
- Deliverables:
  - Nginx server block with TLS, HTTP/2, TLSv1.2+ and strong ciphers.
  - Rails production.rb enabling force_ssl and HSTS.
  - A script or note describing how to obtain and renew certificates via certbot.

Part B: Implement and test CORS for a Ruby API
- Goals:
  - Add rack-cors to a Rails app.
  - Allow only two trusted origins and enable a few common HTTP methods.
  - Verify via curl that preflight requests are correctly handled.
- Deliverables:
  - Gemfile change and config/initializers/cors.rb (as shown earlier).
  - curl tests: preflight OPTIONS request and a GET with Origin header from an allowed origin.

Part C: Add security headers and verify
- Goals:
  - Add HSTS header and OCSP stapling on Nginx.
  - Validate via a browser or curl that HSTS header is present.
- Deliverables:
  - Rails config and Nginx config sections for HSTS and OCSP.
  - curl -I https://your-domain to verify Strict-Transport-Security header.

Part D: TLS health check script
- Goals:
  - Create a small Ruby script to test a domain’s TLS version and cipher from the client side.
- Deliverables:
  - A Ruby script using Net::HTTP with tls_version set to TLSv1_2 or TLSv1_3 and verify peer connection.

Example starter for Part D (you can adapt to your domain):

```ruby
# tls_health_check.rb
require 'net/http'
require 'uri'

def tls_info(host)
  uri = URI.parse("https://#{host}/health")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.ssl_version = :TLSv1_3  # Try TLSv1_2 first if TLSv1_3 is not supported
  http.verify_mode = OpenSSL::SSL::VERIFY_PEER

  begin
    resp = http.get(uri.request_uri)
    puts "Status: #{resp.code}, TLS: #{http.ssl_version}"
  rescue => e
    puts "Error: #{e.message}"
  end
end

tls_info('example.com')
```

Notes:
- Replace example.com with your domain and ensure a health endpoint exists for a lightweight check.
- If TLSv1.3 is not supported by the server, fallback logic can test TLSv1_2.

End of lesson.