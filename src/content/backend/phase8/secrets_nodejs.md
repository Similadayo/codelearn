# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment — Secrets Management & Production Config (Node.js)

Secrets management and production configuration are foundational for secure, reliable backend systems. In production, your code must never hard-code sensitive values, must fetch only the minimum necessary permissions, and must support rotation, auditing, and safe access patterns. This lesson walks through core concepts for Node.js apps, with practical code examples, explanations, and hands-on exercises to deploy secure configurations in real systems.

## 1. Fundamentals: Secrets as Part of 12-Factor Config

Compellingly, 12-Factor apps treat config as the separation of config from code. In Node.js, you typically lean on environment variables and a centralized config module to enforce defaults, validation, and safe access patterns.

```js
// config.js
const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'];

function loadConfig() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const port = Number(process.env.DB_PORT);
  if (Number.isNaN(port)) {
    throw new Error('DB_PORT must be a valid number');
  }

  return {
    dbHost: process.env.DB_HOST,
    dbPort: port,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
  };
}

module.exports = loadConfig;
```

### Line-by-line explanation
- Line 1: Define an array of required environment variable keys that must be present for the app to run.
- Line 3: Declare a function to load and validate config from environment variables.
- Line 4: Build a list of missing keys by checking which required vars are not set.
- Line 5: If any required vars are missing, throw an error with the list of missing keys.
- Line 7: Convert DB_PORT to a number for type safety.
- Line 8: If DB_PORT is not a valid number, throw a descriptive error.
- Lines 10-15: Return a config object with properly typed values ready for use by the application.
- Line 17: Export the loadConfig function for use elsewhere in the codebase.

## 2. Local Development vs Production: Safe Local Secrets with dotenv

For local development, dotenv helps load environment variables from a .env file. Never commit .env files to version control. In production, prefer a secure secret store, but dotenv is great for local testing and CI.

```bash
# Install dotenv (dev-dependency)
npm install dotenv --save-dev
```

```js
// app.js
require('dotenv').config();

const config = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD,
  appEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
```

```env
# .env (do not commit in real repos)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=supersecret
NODE_ENV=development
```

### Line-by-line explanation
- Line 1: Load environment variables from a .env file into process.env using dotenv.
- Lines 3-10: Build a config object with reasonable defaults for local development.
- Line 6: Parse DB_PORT as a number, defaulting to 5432 if not provided.
- Line 9: Expose the final config object for use by the application.
- Line 12-18: Example .env content showing typical dev vars (do not commit).

Notes:
- Never log secrets or print DB_PASSWORD in logs.
- For production, replace dotenv with a centralized secret store (e.g., AWS Secrets Manager, Vault, Kubernetes Secrets).

## 3. Centralized Secrets Management: AWS Secrets Manager (Node.js)

Centralized secret stores reduce blast radius and enable rotation. Here’s a focused example with AWS Secrets Manager using the AWS SDK v3.

```js
// secrets-manager.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function fetchSecret(secretId) {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const data = await client.send(command);

  if ('SecretString' in data && data.SecretString) {
    return data.SecretString;
  }

  // If SecretBinary is used
  const buff = Buffer.from(data.SecretBinary, 'base64');
  return buff.toString('utf8');
}

module.exports = { fetchSecret };
```

```js
// app.js (usage example)
const { fetchSecret } = require('./secrets-manager');

async function loadSecrets() {
  // SECRET_ID could be something like "prod/dbCredentials"
  const secretJson = await fetchSecret(process.env.SECRET_ID);
  const secret = JSON.parse(secretJson);
  return {
    dbPassword: secret.password,
    dbPasswordRotatedAt: secret.rotatedAt,
  };
}

module.exports = loadSecrets;
```

### Line-by-line explanation
- Line 1: Import the Secrets Manager client and GetSecretValueCommand from AWS SDK v3.
- Line 3: Create a Secrets Manager client bound to a region (default us-east-1).
- Lines 5-9: Define fetchSecret to request a secret by its ID, handle errors, and return a string payload whether SecretString or SecretBinary is used.
- Line 11: Export fetchSecret for reuse in the app.
- Line 15-23: In app.js, load the secret by ID from environment, parse JSON, and return a structured object containing critical credentials.
- Line 25: Export the loadSecrets function for consumption by the rest of the application.

Usage considerations:
- Attach an IAM policy granting least-privilege access to the secrets you retrieve.
- Consider caching and cache invalidation logic to balance freshness with performance.
- Implement error handling for secret retrieval failures (e.g., fallback to env or fail-fast).

## 4. In-app Config Patterns and Encryption: Encrypting Secrets at Rest

In some setups, you might store encrypted values in env or config, then decrypt at runtime using a key sourced from a secure store. This is an example envelope-encryption pattern for illustration.

```js
// encryptor.js
const crypto = require('crypto');

// Decrypts data encrypted as: iv(16) | tag(16) | ciphertext
function decryptSecret(encBase64, base64Key) {
  const buf = Buffer.from(encBase64, 'base64');
  const iv = buf.slice(0, 16);
  const tag = buf.slice(16, 32);
  const ciphertext = buf.slice(32);
  const key = Buffer.from(base64Key, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

module.exports = { decryptSecret };
```

```js
// app.js (usage)
const { decryptSecret } = require('./encryptor');

// Encrypted value and key come from environment or secret store
const encryptedDbPassword = process.env.ENCRYPTED_DB_PASSWORD; // base64(iv|tag|ct)
const base64Key = process.env.DEK_KEY; // base64-encoded 256-bit key

if (!encryptedDbPassword || !base64Key) {
  throw new Error('Missing encrypted password or key');
}

const dbPassword = decryptSecret(encryptedDbPassword, base64Key);
console.log('Loaded DB password (masked in logs): ****'); // Avoid printing actual value
```

### Line-by-line explanation
- Line 1: Import the Node.js crypto module for encryption utilities.
- Line 4-13: Define decryptSecret to reconstruct and decrypt using AES-256-GCM with an IV and auth tag embedded in the ciphertext payload.
- Line 7: Convert the base64-encoded input into a buffer and split into IV, auth tag, and ciphertext.
- Line 9: Create a decryption cipher with aes-256-gcm using the provided key and IV.
- Line 10: Attach the authentication tag to the decipher instance for integrity.
- Lines 12-13: Decrypt the ciphertext, returning the plaintext as a UTF-8 string.
- Line 16-23: In app.js, fetch the encrypted password and key from environment, decrypt, and avoid exposing the raw value in logs.

Notes:
- This pattern adds an extra layer of protection for secrets at rest, but requires secure key management and safe handling of decrypted values in memory.
- In production, you’d typically fetch the key from a KMS or Secrets Manager with proper rotation and access controls.

## 5. Deployment Considerations: Kubernetes Secrets and Rotation

When deploying to Kubernetes, avoid embedding secrets in container images. Use Kubernetes Secrets and mount them into pods as environment variables or volumes. Also plan for rotation and auditability.

```yaml
# app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DB_PASSWORD: supersecret
  JWT_SIGNING_KEY: topsecret
```

```yaml
# deployment.yaml (partial)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
      - name: backend
        image: myorg/backend:latest
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_PASSWORD
        - name: JWT_SIGNING_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SIGNING_KEY
```

Line-by-line explanation
- Secret manifest:
  - Line 2: Define a Kubernetes Secret resource.
  - Line 4: Metadata name for the secret.
  - Line 5: Kind set to Secret.
  - Line 6: Type Opaque indicates arbitrary key-value data.
  - Lines 8-11: stringData provides plaintext values that Kubernetes encodes in base64 for storage.
  - DB_PASSWORD and JWT_SIGNING_KEY are example sensitive values.
- Deployment manifest:
  - Line 16: Start a Deployment for the backend service.
  - Lines 22-31: In the container spec, map environment variables to secret keys using secretKeyRef.
  - DB_PASSWORD gets its value from app-secrets DB_PASSWORD; JWT_SIGNING_KEY from app-secrets JWT_SIGNING_KEY.
Notes:
- Rotate secrets by updating the Secret object and triggering a rollout.
- Use Role-Based Access Control (RBAC) to restrict who can view secrets.
- For more dynamic secret rotation, consider integrating with a Secrets Manager (e.g., AWS Secrets Manager) and a sidecar or init-container pattern.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Hardcoding secrets in code
  - Bad:
    ```js
    // bad.js
    const DB_PASSWORD = 'supersecret';
    module.exports = { DB_PASSWORD };
    ```
  - Good:
    ```js
    // good.js
    const DB_PASSWORD = process.env.DB_PASSWORD;
    if (!DB_PASSWORD) throw new Error('DB_PASSWORD is required');
    module.exports = { DB_PASSWORD };
    ```
- Pitfall 2: Logging secrets
  - Bad:
    ```js
    console.log('DB_PASSWORD=', process.env.DB_PASSWORD);
    ```
  - Good:
    ```js
    // Only log non-sensitive identifiers or masked values
    console.log('Config loaded: appEnv=', process.env.NODE_ENV);
    ```
- Pitfall 3: Missing config validation
  - Bad:
    ```js
    // bad.js
    const config = {
      port: process.env.PORT,
      dbUrl: process.env.DB_URL
    };
    module.exports = config;
    ```
  - Good:
    ```js
    // good.js (using Joi for validation)
    const Joi = require('joi');
    const schema = Joi.object({
      port: Joi.number().default(3000),
      dbUrl: Joi.string().uri().required(),
    });
    const { error, value } = schema.validate({
      port: process.env.PORT ? Number(process.env.PORT) : undefined,
      dbUrl: process.env.DB_URL,
    });
    if (error) throw error;
    module.exports = value;
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Security posture: Centralized secrets stores reduce the risk surface by minimizing password exposure and enabling strict IAM policies.
- Rotation and auditability: Secrets rotation reduces blast radius when credentials are compromised. Secret stores provide rotation hooks and audit logs.
- Least privilege: Applications should access only the secrets they need, with per-service or per-namespace restrictions.
- Separation of environments: Use distinct secret stores or namespaces for dev, staging, and prod to prevent cross-environment leaks.
- Incident response: Quick secret revocation and re-issuance are essential in the event of a suspected breach. Automated rotation and automatic secret injection reduce downtime.
- Operational complexity: Decoupling config from code allows safer deployments, easier scaling, and better compliance with security standards.

## Z. Study Questions — 5 recall questions

1. What is the primary rationale for separating config from code in 12-Factor apps?
2. Why should secrets not be logged, and how can you protect sensitive information during logging?
3. Describe how to fetch secrets from AWS Secrets Manager in a Node.js app using the AWS SDK v3.
4. What is envelope encryption, and why might you encrypt secrets before storing them in config or environment variables?
5. How do Kubernetes Secrets help with deployment-time secret management, and what are key security considerations?

## Exercise — practical multi-part coding challenge

Goal: Build a small, self-contained config loader for a Node.js app that supports local dotenv, a centralized secret fetch (simulated), and a simple in-memory cache with rotation support. Then demonstrate a usage script that prints a masked connection string.

Part A: Create a secure config module
- Create a file config-loader.js that:
  - Loads defaults from environment variables.
  - If process.env.SECRET_ID is set, fetch a secret payload from a simulated Secrets Manager function (no AWS required for the exercise). The simulated function should return a JSON string with fields: dbPassword, dbName, host, port.
  - Merge the fetched secret payload (if any) into the final config object.
  - Validate required fields (host, port, dbName) using a small inline validation (no external deps required).
  - Implement a simple in-memory cache: if the config was loaded within the last 60 seconds, return the cached object instead of re-loading.

Part B: Create a simulated Secrets Manager
- In secrets-sim.js, implement a function fetchSecretSim(secretId) that returns a Promise<string> of a JSON string containing { "dbPassword": "...", "dbName": "...", "host": "...", "port": 5432 } for a known secretId, or rejects for unknown IDs.

Part C: Create a usage script
- Create app.js that uses config-loader.js to obtain the configuration, builds a PostgreSQL DSN string like: postgres://user:password@host:port/dbName, masking the password as **** in any printed output, and prints the DSN to the console.

Part D: Run and test
- Run app.js twice within a short interval to demonstrate the cache behavior (no re-fetch of secrets within 60 seconds).
- Change SECRET_ID between runs (simulate rotation) and demonstrate that the loader respects a new fetch after a cache expiry (you can simulate time by adjusting the internal cache expiry in code for testing).

Hints:
- Keep the simulated secret payload simple and deterministic for testing.
- Use console.log to show the DSN with the password masked.
- You do not need to set up real AWS resources for this exercise; focus on the loader architecture, caching, and rotation flow.

Deliverables:
- config-loader.js
- secrets-sim.js
- app.js
- A short README snippet (in code block) showing how to run: node app.js, and what to expect in output.