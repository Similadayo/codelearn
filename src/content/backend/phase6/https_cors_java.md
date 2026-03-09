# Track: Backend Engineering — Phase 6: Authentication & Security — HTTPS, TLS & CORS Configuration (Java)

This lesson dives into securing Java backend services with HTTPS and TLS, hardening TLS settings, enabling mutual TLS where appropriate, and configuring CORS for safe cross-origin access. You’ll learn how TLS termination typically works in production, how to enable and test HTTPS in a Spring Boot app, how to enforce secure headers like HSTS, and how to correctly configure cross-origin requests for API endpoints. By the end, you’ll be able to secure a Java backend end-to-end and reason about real-world deployment architectures.

## 1. Enabling HTTPS in a Spring Boot Application

Compelling reason: HTTPS protects data in transit, authenticates your server to clients, and is a baseline requirement for regulatory compliance and modern security hygiene. In Spring Boot, enabling HTTPS is a matter of configuring a keystore with a certificate and pointing the app to use it.

Code blocks:

```properties
# src/main/resources/application.properties

# Listen on port 8443 for HTTPS
server.port=8443

# Path to the TLS certificate keystore (PKCS12 in this example)
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=changeit
server.ssl.key-store-type=PKCS12

# Optional: alias of the key inside the keystore
server.ssl.key-alias=tomcat
```

```bash
# Generate a self-signed PKCS12 keystore for development (not for production)
keytool -genkeypair \
  -alias tomcat \
  -dname "CN=localhost,OU=Dev,O=Example,L=City,ST=State,C=US" \
  -storetype PKCS12 -keystore keystore.p12 -storepass changeit \
  -keypass changeit -validity 3650
```

```bash
# Alternative: generate a JKS keystore (legacy, still common in some contexts)
keytool -genkeypair \
  -alias tomcat \
  -dname "CN=localhost,OU=Dev,O=Example,L=City,ST=State,C=US" \
  -keystore keystore.jks -storetype JKS -storepass changeit \
  -keypass changeit -validity 3650
```

### Line-by-line explanation breaking down each line

- application.properties:
  - server.port=8443: Configures the embedded server to listen on port 8443 for TLS traffic.
  - server.ssl.key-store=classpath:keystore.p12: Points to the keystore file that contains the server certificate and private key, loaded from the classpath.
  - server.ssl.key-store-password=changeit: Password to access the keystore.
  - server.ssl.key-store-type=PKCS12: Specifies the keystore format (PKCS12 in this case).
  - server.ssl.key-alias=tomcat: Identifies the specific key/certificate in the keystore to use.
- keytool command:
  - -genkeypair: Generates a key pair (private key and public certificate).
  - -alias tomcat: Names the entry in the keystore.
  - -dname "...": Distinguished name details for the certificate subject.
  - -storetype PKCS12: Chooses the keystore format PKCS12.
  - -keystore keystore.p12: Output keystore file.
  - -storepass/changeit: Password protecting the keystore.
  - -keypass changeit: Password protecting the private key.
  - -validity 3650: Validity period in days (10 years here).
- keytool -genkeypair … -keystore keystore.jks:
  - Similar to PKCS12 example, but outputs a JKS keystore, which is still widely used in some environments.

## 2. TLS Hardening: Protocols, Ciphers, HSTS & Mutual TLS

Compelling reason: Not all TLS configurations are created equal. Enforcing modern protocols (e.g., TLS 1.2 and TLS 1.3), strong cipher suites, and additional protections like HTTP Strict Transport Security (HSTS) reduce the attack surface. In some scenarios, mutual TLS (mTLS) adds a second factor of trust between client and server.

Code blocks:

```properties
# TLS protocol versions to enable
server.ssl.enabled-protocols=TLSv1.2,TLSv1.3

# Prefer strong cipher suites; avoid weak ciphers
server.ssl.ciphers=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,\
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,\
TLS_AES_128_GCM_SHA256

# Enable mutual TLS (client authentication) and provide a trust store for clients
server.ssl.client-auth=need
server.ssl.trust-store=classpath:truststore.jks
server.ssl.trust-store-password=changeit
server.ssl.trust-store-type=JKS
```

```java
// src/main/java/com/example/security/SecurityConfig.java
package com.example.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
  @Override
  protected void configure(HttpSecurity http) throws Exception {
    http
      // Ensure all requests use HTTPS
      .requiresChannel()
        .anyRequest()
        .requiresSecure()
      .and()
      // Enable HSTS in addition to HTTPS
      .headers()
        .httpStrictTransportSecurity()
          .includeSubDomains(true)
          .maxAgeInSeconds(31536000)
      .and()
      // Basic authorization (adjust per your needs)
      .authorizeRequests()
        .anyRequest().authenticated();
  }
}
```

### Line-by-line explanation breaking down each line

- application.properties:
  - server.ssl.enabled-protocols=TLSv1.2,TLSv1.3: Restricts the allowed TLS protocol versions to TLS 1.2 and TLS 1.3 for stronger security.
  - server.ssl.ciphers=...: Lists concrete cipher suites that are considered strong. TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 and TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 are modern, AEAD ciphers; TLS_AES_128_GCM_SHA256 is a TLS 1.3 cipher.
  - server.ssl.client-auth=need: Enables mutual TLS, requiring clients to present a valid certificate.
  - server.ssl.trust-store=classpath:truststore.jks: Specifies the trust store containing CA certificates or client certificates trusted by the server.
  - server.ssl.trust-store-password, server.ssl.trust-store-type: Provide access to the trust store and its type.

- SecurityConfig.java:
  - @Configuration, @EnableWebSecurity: Marks this class as a security configuration for Spring Security.
  - configure(HttpSecurity http): Entry point to declarative security rules.
  - .requiresChannel().anyRequest().requiresSecure(): Forces HTTPS for all requests.
  - .headers().httpStrictTransportSecurity(): Enables HSTS with subdomains and a one-year max-age.
  - .authorizeRequests().anyRequest().authenticated(): Requires authentication for all endpoints (adjust as needed for public APIs).
  
- Additional notes:
  - With client-auth=need, you must provide a trust store that includes the CA certificates or client certificates you want to trust. Client applications must present valid certificates to connect.
  - In production, store your keystore/trust-store outside the classpath (e.g., in a secure path) and rotate certificates before expiry.

## 3. Certificate Management & Reverse Proxies in Production

Compelling reason: In real deployments, TLS termination is often performed at a reverse proxy or load balancer (Nginx, Traefik, Apache, or a cloud load balancer). The backend service can then run HTTP internally. This reduces certificate management overhead on each service and centralizes TLS configuration.

Code blocks:

Nginx example (TLS termination with HTTP backend and HSTS header):

```nginx
# /etc/nginx/conf.d/secure-api.conf
server {
  listen 443 ssl http2;
  server_name example.com;

  ssl_certificate /etc/ssl/certs/fullchain.pem;
  ssl_certificate_key /etc/ssl/private/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  location / {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Ensure the frontend strictly uses HTTPS
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

Spring Boot adjustment when TLS is terminated at the proxy:

```properties
# src/main/resources/application.properties
# Do not expose TLS on the Spring Boot app itself
server.port=8080
server.ssl.enabled=false
# If behind a proxy, let Spring know about the forwarded protocol
server.forward-headers-strategy=native
```

### Line-by-line explanation breaking down each line

- Nginx config:
  - listen 443 ssl http2;: Enables TLS on port 443 and enables HTTP/2.
  - ssl_certificate/ssl_certificate_key: Paths to the public certificate and private key for TLS termination.
  - ssl_protocols TLSv1.2 TLSv1.3;: Restricts to modern TLS protocols.
  - ssl_ciphers HIGH:!aNULL:!MD5;: A broad, strong cipher suite selection.
  - proxy_pass http://localhost:8080;: Forwards incoming requests to the Spring Boot app running on port 8080 (HTTP).
  - proxy_set_header ...: Propagates original request metadata to the backend.
  - add_header Strict-Transport-Security ...: Informs clients to always use HTTPS for future requests.

- Spring Boot properties:
  - server.port=8080: Backend app port when TLS termination is handled by the proxy.
  - server.ssl.enabled=false: Disable TLS on the Spring Boot app.
  - server.forward-headers-strategy=native: Ensure Spring respects the X-Forwarded-* headers from the proxy (recommended behind proxies).

## 4. CORS Configuration for Backend APIs

Cross-Origin Resource Sharing (CORS) is essential when a frontend app hosted on a different origin talks to your backend. Configure controlled origins, methods, and headers to prevent unintended access while enabling legitimate integrations.

Code blocks:

```java
// src/main/java/com/example/config/GlobalCorsConfig.java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
public class GlobalCorsConfig {

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    // Only allow trusted frontend origins
    config.setAllowedOrigins(Arrays.asList("https://example.com", "https://app.example.com"));
    // Allow common HTTP methods for API usage
    config.setAllowedMethods(Arrays.asList("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
    // Allow headers your API expects (e.g., Authorization for tokens)
    config.setAllowedHeaders(Arrays.asList("Authorization","Content-Type","X-Requested-With"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
  }
}
```

```java
// src/main/java/com/example/config/SecurityConfig.java
package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
  @Override
  protected void configure(HttpSecurity http) throws Exception {
     http
       .cors()
       .and()
       .csrf().disable() // Disable CSRF protection for stateless APIs or configure as needed
       .authorizeRequests()
       .antMatchers("/api/**").authenticated()
       .anyRequest().permitAll();
  }
}
```

### Line-by-line explanation breaking down each line

- GlobalCorsConfig.java:
  - @Configuration: Marks this class as a Spring configuration.
  - @Bean public CorsConfigurationSource corsConfigurationSource(): Defines a bean that Spring uses to determine CORS settings.
  - CorsConfiguration config = new CorsConfiguration(): Creates a new CORS configuration object.
  - config.setAllowedOrigins(Arrays.asList("https://example.com", "https://app.example.com")): Restricts allowed origins to trusted frontends.
  - config.setAllowedMethods(...): Specifies allowed HTTP methods for cross-origin requests.
  - config.setAllowedHeaders(...): Specifies which headers can be included in requests from allowed origins.
  - config.setAllowCredentials(true): Allows cookies and credentials in cross-origin requests (needs matching origin in allowedOrigins).
  - config.setMaxAge(3600L): Caches preflight responses for 1 hour to reduce preflight overhead.
  - UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(): Creates a CORS configuration source.
  - source.registerCorsConfiguration("/api/**", config): Applies CORS config to all API endpoints under /api/.

- SecurityConfig.java:
  - @Configuration, @EnableWebSecurity: Standard Spring Security configuration class.
  - http.cors(): Enables the CORS configuration defined above.
  - http.csrf().disable(): Disables CSRF protection for API endpoints; adjust for your security model (stateless JWT-based APIs often disable CSRF).
  - http.authorizeRequests().antMatchers("/api/**").authenticated(): Requires authentication for API endpoints; adjust as needed for public routes.

Common pitfalls with CORS (covered in the X section below) include allowing all origins with credentials, or forgetting to align allowed origins with frontend hosts, which can lead to security issues or broken frontend integrations.

## 5. Why This Matters In Real Systems

- Security hygiene: HTTPS is non-negotiable for sensitive data in transit. Enforcing TLS 1.2+/1.3+ and strong ciphers reduces exposure to protocol downgrade and cipher-spotting attacks.
- Production realities: TLS termination often occurs in a reverse proxy, simplifying certificate management, enabling centralized monitoring, and allowing benefits like HTTP/2 and TLS features (ALPN, OCSP stapling).
- Access control: Proper CORS configuration is crucial for enabling legitimate frontend apps while preventing unauthorized domains from calling your APIs.
- Compliance and audits: Many standards (PCI DSS, HIPAA, etc.) require encrypted data in transit and controlled cross-origin access, making HTTPS, TLS hardening, and correct CORS behavior essential.

## Z. Study Questions

1. What is the difference between enabling HTTPS in Spring Boot vs. performing TLS termination at a reverse proxy?
2. Why is it important to disable weak TLS protocols and weak cipher suites in production?
3. How does mutual TLS (mTLS) increase security, and what additional artifacts (trust stores) are required?
4. What header is configured by Spring Security to enforce HTTPS usage in browsers, and what does it accomplish?
5. When configuring CORS, why is it a bad idea to set allowedOrigins to "*" when allowing credentials?

## Exercise

Part A: Local HTTPS with Spring Boot and a Simple API
- Goal: Spin up a Spring Boot app that serves HTTPS locally and exposes a simple, secured API.

Steps:
1) Generate a PKCS12 keystore with a self-signed certificate (or reuse an existing one).
2) Configure Spring Boot to use HTTPS via application.properties as in Section 1.
3) Add a simple REST controller with an endpoint /api/echo that returns the request payload or a greeting.
4) Add a basic SecurityConfig to require authentication and enable HSTS (as shown in Section 2).
5) Write a minimal integration test that calls https://localhost:8443/api/echo with a client certificate (simulate if possible) or use test configuration to bypass client certs for the test.

Deliverables:
- A Spring Boot project (pom.xml or build.gradle) with the properties, keystore in resources, a controller, and a SecurityConfig enabling HTTPS and HSTS.
- A short README describing how to run locally and how to test the TLS setup (curl example: curl -k https://localhost:8443/api/echo -H "Content-Type: application/json" -d '{"msg":"hello"}').

Part B: Production-style TLS Termination with Nginx
- Goal: Demonstrate TLS termination at a proxy and forward to a HTTP backend.

Steps:
1) Prepare a certificate chain at /etc/ssl/certs/fullchain.pem and its private key at /etc/ssl/private/privkey.pem.
2) Create an Nginx config (as in the Nginx example) to terminate TLS and forward to Spring Boot on 8080.
3) In your Spring Boot app, disable TLS (server.ssl.enabled=false) and run on port 8080.
4) Start Nginx and test accessing https://example.com/api/echo. Verify HSTS header is present.

Deliverables:
- Nginx config file with TLS termination and HSTS header.
- Updated Spring Boot properties for non-TLS operation behind the proxy.
- A short note on how to validate that traffic is TLS-protected at the proxy and HTTP within the app.

Part C: CORS and a Frontend
- Goal: Validate safe cross-origin API access from a frontend domain.

Steps:
1) Implement GlobalCorsConfig as in Section 4 to allow a specific frontend domain.
2) Create a frontend fetch call to /api/echo on that domain and verify correct handling of credentials and CORS headers.
3) Observe preflight OPTIONS requests and ensure the server responds with appropriate ACLs (Access-Control-Allow-Origin, Access-Control-Allow-Credentials).

Deliverables:
- A small frontend snippet (could be plain JS or a simple React fetch) calling your backend with credentials.
- Verification steps and expected logs in the backend showing allowed origins and methods.

Notes:
- For real deployments, automate certificate provisioning (e.g., using Let's Encrypt via a reverse proxy like Nginx/Traefik or Kubernetes cert-manager) to avoid manual certificate management.
- Always monitor TLS configuration over time and rotate certificates before expiry. Consider enabling TLS session resumption and OCSP stapling where supported by your stack.
- When testing, ensure you’re differentiating between HTTPS (TLS in transit) and HTTP (internal traffic) so you don’t leave a security gap in production.