# Secrets Management & Production Config — Phase 8: Infrastructure & Deployment

Secrets management is the practice of securing, storing, and controlling access to sensitive information such as database credentials, API keys, and encryption keys. In production systems, poor secrets handling leads to data breaches, compliance failures, and service outages. This lesson focuses on practical, Java-centered patterns for retrieving, encrypting, rotating, and refreshing secrets in real-world deployments.

## 1. Secrets storage options in Java backends: environment, files, and external stores

Java backends typically obtain secrets from multiple sources, with environment variables being the simplest for containers, and external secret stores providing centralized rotation and access control. This section shows a small, type-safe approach to load secrets from environment variables, and introduces a pattern for integrating an external store.

Code: EnvSecretProvider and a basic AppConfig wired to env secrets
```java
// EnvSecretProvider.java
public class SecretNotFoundException extends RuntimeException {
    public SecretNotFoundException(String message) { super(message); }
}

public class EnvSecretProvider {
    public static String getSecret(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            throw new SecretNotFoundException("Missing secret for key: " + key);
        }
        return value;
    }
}
```

```java
// AppConfig.java
public class AppConfig {
    public final String dbUser;
    public final String dbPassword;
    public final String dbUrl;

    public AppConfig() {
        this.dbUser = EnvSecretProvider.getSecret("DB_USERNAME");
        this.dbPassword = EnvSecretProvider.getSecret("DB_PASSWORD");
        this.dbUrl = EnvSecretProvider.getSecret("DB_URL");
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-4: Define a custom exception to signal missing secrets clearly.
- Line 8: EnvSecretProvider class exposes a static helper to fetch a named secret from environment variables.
- Line 9: Retrieve the value for the given key using System.getenv.
- Line 10-12: If the secret is missing or blank, throw a clear error to fail fast during startup.
- Line 15: AppConfig class that aggregates specific secrets for the application.
- Line 16-18: Fields to hold the database user, password, and URL.
- Line 20-24: Constructor reads secrets via EnvSecretProvider to initialize fields.

Common pitfalls in this approach:
- Secrets are hard-coded in the environment or in startup scripts that aren’t rotated.
- Secrets are logged or exposed inadvertently.

## 2. External secret stores: AWS Secrets Manager example

External secret stores centralize rotation, access control, and auditing. AWS Secrets Manager is a common choice in cloud-native Java apps. The following snippet shows a thin wrapper around the AWS SDK v2 to fetch a raw secret value as a string. In production you’d often store JSON payloads and map them to domain objects; this example keeps it simple.

Code: AWS Secrets Manager secret fetcher
```java
// AwsSecretProvider.java
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

public class AwsSecretProvider {
    private final SecretsManagerClient client;

    public AwsSecretProvider(SecretsManagerClient client) {
        this.client = client;
    }

    public String getSecretValue(String secretName) {
        GetSecretValueRequest request = GetSecretValueRequest.builder()
                .secretId(secretName)
                .build();
        GetSecretValueResponse response = client.getSecretValue(request);
        return response.secretString();
    }

    // Convenience constructor for default region (adjust as needed)
    public static AwsSecretProvider inDefaultRegion() {
        SecretsManagerClient client = SecretsManagerClient.builder()
                .region(Region.US_EAST_1) // choose your region
                .build();
        return new AwsSecretProvider(client);
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-5: Import AWS Secrets Manager client and request/response types.
- Line 7: AwsSecretProvider class encapsulates access to AWS Secrets Manager.
- Line 9-12: Store a pre-configured SecretsManagerClient instance.
- Line 14-18: Constructor takes a client instance, enabling testability and dependency injection.
- Line 20-28: getSecretValue builds and sends a GetSecretValueRequest for the given secret name, then returns the secret string payload.
- Line 30-37: Convenience factory method to create a provider with a default region (adjust to your environment).

Usage notes:
- Secrets in AWS Secrets Manager are typically JSON payloads; you may want to parse secretString() into a Map or a POJO.
- Prefer IAM roles for EC2/ECS/Lambda to avoid embedding long-lived credentials in code or config.

## 3. Vault integration: HashiCorp Vault Java Driver example

HashiCorp Vault provides fine-grained access control and dynamic secrets. The Java driver enables reading secrets from a path. The sample below shows a minimal read from Vault using a token.

Code: Vault secret read example (BetterCloud Vault Java Driver)
```java
// VaultSecretProvider.java
import com.bettercloud.vault.Vault;
import com.bettercloud.vault.VaultConfig;
import com.bettercloud.vault.VaultException;

import java.util.Map;

public class VaultSecretProvider {
    private final Vault vault;

    public VaultSecretProvider(String endpoint, String token) throws VaultException {
        VaultConfig config = new VaultConfig()
                .address(endpoint)
                .token(token)
                .build();
        this.vault = new Vault(config);
    }

    // Reads a single key from a KV mount at the given path
    public String getSecret(String path, String key) throws VaultException {
        Map<String, String> data = vault.logical().read(path).getData();
        return data.get(key);
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-6: Import Vault Java Driver classes.
- Line 8: VaultSecretProvider class encapsulates retrieval logic.
- Line 10-14: Constructor builds a Vault client using a Vault endpoint and a token (token-based auth is common in vault usage).
- Line 16-22: getSecret reads the secret at a given path, then extracts the desired key from the returned data map.

Notes:
- Use Vault’s dynamic secrets feature to generate short-lived credentials on demand.
- Always scope Vault policies to the minimum capabilities required by the application.

## 4. Encryption patterns for secrets: envelope encryption with a key from a vault or KMS

Even after secrets are retrieved, you may want to decrypt data at runtime or store secrets in an encrypted form. This example demonstrates a small AES-GCM decryption utility that accepts a base64-encoded ciphertext, key, and IV. Keys should be stored in a dedicated KMS or secret store, never in code.

Code: AES-GCM decryption utility and usage
```java
// SecretDecryptor.java
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class SecretDecryptor {
    private static final String AES_GCM_NOPADDING = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits

    public static String decrypt(String base64Ciphertext, String base64Key, String base64Iv) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        byte[] iv = Base64.getDecoder().decode(base64Iv);
        byte[] ciphertext = Base64.getDecoder().decode(base64Ciphertext);

        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance(AES_GCM_NOPADDING);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, spec);

        byte[] plaintext = cipher.doFinal(ciphertext);
        return new String(plaintext, StandardCharsets.UTF_8);
    }
}
```

```java
// CryptoSecretProvider.java
public class CryptoSecretProvider {
    // In real deployments, the key/IV should be fetched securely (e.g., from KMS or Vault)
    public String decryptSecret(String encryptedBase64) throws Exception {
        String keyBase64 = System.getenv("SECRET_AES_KEY"); // 256-bit key
        String ivBase64 = System.getenv("SECRET_AES_IV");   // 96-bit IV (12 bytes)
        return SecretDecryptor.decrypt(encryptedBase64, keyBase64, ivBase64);
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-7: Import cryptography APIs for AES-GCM decryption and encoding.
- Line 9-17: SecretDecryptor.decrypt accepts ciphertext, key, and IV as base64-encoded strings, decodes them, and runs AES/GCM decryption.
- Line 19-28: Substitutes a base64 ciphertext and decodes key/IV from environment variables; decrypts to plaintext.
- Line 30-38: CryptoSecretProvider demonstrates how a consuming component might call decryptSecret to obtain a usable secret at runtime.

Notes:
- Do not log decrypted secrets; ensure redaction in logs.
- Use short-lived, rotated keys wherever possible and tie encryption keys to a dedicated key management service.

## 5. Dynamic config reload and secret rotation: keeping secrets fresh at runtime

Production systems benefit from the ability to refresh secrets without restarting services. A lightweight pattern is to cache secrets and provide a refresh method that re-fetches values from the source (env, AWS Secrets Manager, Vault, etc.). In fast-moving deployments, you may wire this to a config refresh endpoint or a scheduled job.

Code: Minimal secret cache with explicit refresh
```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public interface SecretProvider {
    Map<String, String> loadAll();
}

public class CachedSecretManager {
    private volatile Map<String, String> cache = new ConcurrentHashMap<>();
    private final SecretProvider provider;

    public CachedSecretManager(SecretProvider provider) {
        this.provider = provider;
        refresh();
    }

    public String getSecret(String key) {
        return cache.get(key);
    }

    public synchronized void refresh() {
        Map<String, String> latest = provider.loadAll();
        if (latest != null) {
            cache = new ConcurrentHashMap<>(latest);
        }
    }
}
```

### Line-by-line explanation breaking down each line
- Line 1-6: Define a simple SecretProvider interface with a method to load all secrets as a map.
- Line 8-18: CachedSecretManager holds a thread-safe, in-memory cache of secrets and a reference to the provider.
- Line 20-24: Constructor stores the provider and performs an initial refresh to seed the cache.
- Line 26-28: getSecret reads a secret by key from the cache.
- Line 30-37: refresh fetches the latest secrets from the provider and replaces the cache atomically if there are updates.

Notes:
- This pattern supports hot-reload semantics in environments with a central secret store.
- You can trigger refresh via an actuator endpoint, a messaging bus, or a cron job, depending on your stack.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Hardcoding secrets or embedding secrets in source/config files
- Bad:
```java
public class BadHardcodedConfig {
    public static final String DB_URL = "jdbc:mysql://db.internal:3306/appdb";
    public static final String DB_USER = "app_user";
    public static final String DB_PASSWORD = "p@ssw0rd"; // dangerous
}
```
- Good:
```java
public class GoodEnvConfig {
    public static final String DB_URL = System.getenv("DB_URL");
    public static final String DB_USER = System.getenv("DB_USERNAME");
    public static final String DB_PASSWORD = System.getenv("DB_PASSWORD");
}
```

Pitfall 2: Logging secrets or leaking sensitive data
- Bad:
```java
import java.util.logging.Logger;

public class BadLogging {
    private static final Logger log = Logger.getLogger(BadLogging.class.getName());
    public void reveal(String password) {
        log.info("Password: " + password);
    }
}
```
- Good:
```java
import java.util.logging.Logger;

public class GoodLogging {
    private static final Logger log = Logger.getLogger(GoodLogging.class.getName());
    public void reveal(String password) {
        log.info("Password: [REDACTED]");
        // or log only non-sensitive metadata
        log.info("Using DB user: " + System.getenv("DB_USERNAME"));
    }
}
```

Pitfall 3: Not rotating or auditing secrets
- Bad (static credentials in env at startup, no rotation or audit hooks)
```java
public class BadStaticSecret {
    private static final String SECRET = "static-secret-ignored-by-rotation";
}
```
- Good (template for rotation-aware access)
```java
public class GoodRotatingSecret {
    private final SecretProvider provider;
    public GoodRotatingSecret(SecretProvider provider) {
        this.provider = provider;
        // rotation should be triggered on schedule or via event
        refresh();
    }
    public void refresh() {
        // fetch fresh secrets from provider (e.g., AWS Secrets Manager or Vault)
        // update internal references or caches
    }
}
```

Pitfall 4: Not handling fetch failures gracefully
- Bad:
```java
public class BadFailureMode {
    public String fetch(String key) {
        return System.getenv(key); // could be null in production
    }
}
```
- Good:
```java
public class GoodFailureMode {
    public String fetch(String key) {
        String v = System.getenv(key);
        if (v == null) {
            throw new SecretNotFoundException("Missing: " + key);
        }
        return v;
    }
}
```

Pitfall 5: Assuming plaintext storage of secrets in memory
- Bad:
```java
public class InMemoryPlaintextSecrets {
    private final String secret = "sensitive";
    public String getSecret() { return secret; }
}
```
- Good:
```java
public class InMemorySecureSecrets {
    private final String encryptedSecret;
    public InMemorySecureSecrets(String encrypted) { this.encryptedSecret = encrypted; }
    public String getSecret(SecretDecryptor decryptor) {
        try {
            return decryptor.decrypt(encryptedSecret);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt secret", e);
        }
    }
}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Security and compliance: Centralized secrets management simplifies meeting compliance requirements (e.g., PCI-DSS, SOC 2, HIPAA) by enforcing access controls, auditing, and rotation policies.
- Rotation and incident response: Dynamic secrets reduce blast radius during a breach and speed up recovery by rotating credentials on a schedule or in response to events.
- Least privilege and auditing: External stores enable strict policy definitions, IAM roles, and access logging. Your application should fetch only what it needs, and never store secrets in logs or metrics.
- Performance and reliability: Cache secrets with a well-defined TTL and a refresh strategy to balance latency against freshness. Fail-safe behavior (fail-secure vs fail-open) depends on your risk model.
- Operational practices: Automate secret rotation in CI/CD pipelines and manage different secrets per environment (dev/stage/prod) using distinct stores or prefixes.

Production usage patterns to consider:
- Use environment variables for containerized deployments, backed by external secret stores for rotation.
- Centralize keys in AWS Secrets Manager, Vault, or a similar system; grant least-privilege access.
- Encrypt sensitive payloads at rest and decrypt only in trusted processes, never in logs or telemetry.
- Implement a health/metrics endpoint for secret fetch latency and failure counts.
- Provide a reliable fallback strategy: if a secret cannot be retrieved, either fail fast with a clear error or use a safe default with proper auditing.

## Z. Study Questions — 5 recall questions

1) What are the main advantages of using an external secret store (like AWS Secrets Manager or Vault) over environment variables alone?
2) Describe a simple envelope encryption pattern for secrets in a Java application. What components are involved?
3) Why is it important to avoid logging secrets, and what are concrete steps to redact secrets in logs?
4) How can a Java service implement dynamic secret rotation without restarting?
5) What considerations are needed when choosing between fail-fast vs fail-secure behavior when a secret fetch fails?

## Exercise — a practical multi-part coding challenge

Part A: Implement a small secret provider architecture
- Create a SecretProvider interface with a method Map<String, String> loadAll().
- Implement two concrete providers:
  - EnvSecretProvider: reads all secrets from environment variables into a map (keys are DB_USERNAME, DB_PASSWORD, DB_URL, etc.).
  - MockSecretProvider: used for tests; constructed with a Map<String, String> and returns values from it.
- Implement a CachedSecretManager (as in Section 5) that uses a SecretProvider and exposes getSecret(String key).

Part B: Build a tiny configuration class that uses the secret provider
- Create a DatabaseConfig class that accepts SecretProvider in the constructor and initializes fields:
  - dbUrl
  - dbUsername
  - dbPassword
- Add a method authenticateSimulation() that prints a simulated connection string but redacts passwords (e.g., "jdbc:mysql://user:****@host/db").

Part C: Demonstrate usage with a main method
- In a separate Main.java, wire a MockSecretProvider with a small map (DB_URL, DB_USERNAME, DB_PASSWORD).
- Instantiate DatabaseConfig with a MockSecretProvider.
- Call authenticateSimulation() to show that secrets are retrieved and the password is redacted in output.

Part D: Add a small unit test
- Write a JUnit test for DatabaseConfig that uses MockSecretProvider to ensure the fields are loaded correctly and the password is not exposed in the toString representation (or is redacted in the simulate method).

Part E (optional): Extend to a simple AWS Secrets Manager fetch path (pseudo-code)
- Show how you would plug in AwsSecretProvider (from Section 2) in place of MockSecretProvider in Part C, and describe the necessary dependencies and IAM permissions. Do not run this in your local without proper AWS credentials.

This lesson provides a structured, Java-focused view of secrets management and production config, balancing practical code examples with production-ready considerations. If you want, I can tailor the exercises to your current tech stack (e.g., Spring Boot only, or a pure Java service) or expand any single section with deeper integration patterns (Spring Cloud Vault, Spring Cloud Config, or KMS-based envelope encryption).