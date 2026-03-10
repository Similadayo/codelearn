# Cryptography Fundamentals in Web App Security

Cryptography is the backbone of protecting data in transit and at rest in web applications. This lesson covers the fundamentals developers must know to store passwords securely, encrypt sensitive data, and verify integrity and authenticity through digital signatures. You'll learn practical patterns, see concrete code, and understand common missteps that can undermine security in real systems.

## 1. Core Primitives: Hashing, Salting, and HMAC

Hashing, salting, and message authentication codes (HMAC) are foundational for protecting secrets like passwords and for ensuring data integrity. Proper use prevents attackers from easily guessing passwords, extracting secrets from storage, or tampering with data without detection.

```js
// Node.js: Deriving a password hash using PBKDF2-SHA256
const crypto = require('crypto');
const password = 'correcthorsebatterystaple';
const salt = crypto.randomBytes(16).toString('hex');
const iterations = 100000;
const keyLen = 64;
const digest = 'sha256';
const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLen, digest).toString('hex');
console.log({ salt, hash, iterations, keyLen, digest });
```

### Line-by-line explanation breaking down each line

- 1: Import the built-in crypto module to access cryptographic functions.
- 2: Define the plaintext password you want to store securely.
- 3: Generate a fresh 16-byte random salt and encode it as hex; salt prevents rainbow table attacks.
- 4: Set the number of PBKDF2 iterations to slow down brute-force attempts.
- 5: Define the desired derived key length in bytes (64 bytes here).
- 6: Choose the hash function (SHA-256) used by PBKDF2.
- 7: Derive the key using PBKDF2 with the password, salt, iterations, key length, and digest.
- 8: Convert the derived key to a hex string for storage.
- 9: Output the salt and derived hash along with parameters for later verification.

```js
// Node.js: Verifying a password against stored salt/hash
function verifyPassword(inputPassword, storedSalt, storedHash, iterations = 100000, keyLen = 64, digest = 'sha256') {
  const crypto = require('crypto');
  const hash = crypto.pbkdf2Sync(inputPassword, storedSalt, iterations, keyLen, digest).toString('hex');
  // timing-safe comparison to prevent timing attacks
  const result = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  return result;
}
```

### Line-by-line explanation breaking down each line

- 1: Define a function that will check a user-submitted password against stored values.
- 2: Import the crypto module (local scope for this function).
- 3: Re-derive the key using the same salt, iterations, key length, and digest as when hashing.
- 4: Convert the derived key to a hex string for comparison.
- 5: Use a timing-safe comparison to prevent leakage of information via timing.
- 6: Return true if the re-derived hash matches the stored hash, else false.

```js
// Node.js: HMAC for message authentication
const crypto = require('crypto');
const key = crypto.randomBytes(32); // shared secret
const message = 'user:alice:payload';
const hmac = crypto.createHmac('sha256', key).update(message).digest('hex');
console.log({ hmac });
```

### Line-by-line explanation breaking down each line

- 1: Import crypto module.
- 2: Generate a 256-bit shared secret key for HMAC.
- 3: Define the message to authenticate (could be a token, payload, or file).
- 4: Create an HMAC using SHA-256 with the shared key and update it with the message.
- 5: Finalize the HMAC and output the digest in hex form.
- 6: Print the computed HMAC for verification or storage.
```

## 2. Symmetric Encryption: AES-GCM for Web Apps

Symmetric encryption protects data at rest and in transit when you have a shared secret key. Use authenticated encryption (AES-GCM) to both conceal and ensure integrity of the plaintext. Always use a random IV per encryption and store it with the ciphertext.

```js
// Node.js: AES-256-GCM encryption
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';
const key = crypto.randomBytes(32); // 256-bit key
const iv = crypto.randomBytes(12);  // 96-bit IV for GCM
const plaintext = 'Sensitive user data';
const cipher = crypto.createCipheriv(algorithm, key, iv);
let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
ciphertext += cipher.final('hex');
const tag = cipher.getAuthTag().toString('hex');
console.log({ iv: iv.toString('hex'), ciphertext, tag });
```

### Line-by-line explanation breaking down each line

- 1: Import crypto module.
- 2: Specify AES-256-GCM as the algorithm (authenticated encryption).
- 3: Generate a 256-bit random key for encryption.
- 4: Generate a 96-bit random IV; GCM requires a unique IV per encryption.
- 5: Define the plaintext to protect.
- 6: Create a Cipher instance with algorithm, key, and IV.
- 7: Encrypt the plaintext, encoding input as UTF-8 and output as hex.
- 8: Finalize encryption and append any remaining ciphertext in hex.
- 9: Retrieve the authentication tag and encode as hex for integrity verification.
- 10: Output IV, ciphertext, and tag for decryption later.

```js
// Node.js: AES-256-GCM decryption
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(Buffer.from(tag, 'hex'));
let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
decrypted += decipher.final('utf8');
console.log(decrypted);
```

### Line-by-line explanation breaking down each line

- 1: Create a Decipher instance with the same algorithm, key, and IV used for encryption.
- 2: Attach the authentication tag produced during encryption to validate integrity.
- 3: Decrypt the ciphertext from hex back to UTF-8 plaintext.
- 4: Complete the decryption process (throws if authentication fails).
- 5: Output the recovered plaintext to verify correctness.

```js
// Node.js: Deriving a symmetric key from a password (KDF)
const crypto = require('crypto');
const passphrase = 'correcthorsebatterystaple';
const salt = crypto.randomBytes(16);
const iterations = 100000;
const keyLen = 32;
const derivedKey = crypto.pbkdf2Sync(passphrase, salt, iterations, keyLen, 'sha256');
console.log({ salt: salt.toString('hex'), derivedKey: derivedKey.toString('hex') });
```

### Line-by-line explanation breaking down each line

- 1: Import crypto module.
- 2: Define a human-memorable passphrase to derive a key from.
- 3: Generate a fresh 16-byte salt to vary the derived key each time.
- 4: Set iteration count to slow down brute force attempts.
- 5: Set the desired key length to 32 bytes (256 bits).
- 6: Derive a key using PBKDF2 with SHA-256.
- 7: Output the salt and the derived key for later encryption use.

## 3. Public Key Cryptography: Signatures and Certificates

Public-key cryptography enables digital signatures (authenticity and non-repudiation) and certificate-based trust. In web apps, signatures are used for tokens, artifacts, and establishing trust in communications.

```js
// Node.js: RSA digital signing and verification
const { generateKeyPairSync, createSign, createVerify } = require('crypto');

// Generate a key pair (for demonstration; in real apps keys are stored securely)
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

// Sign a message
const signer = createSign('RSA-SHA256');
signer.update('message to sign');
signer.end();
const signature = signer.sign(privateKey, 'hex');

// Verify the signature
const verifier = createVerify('RSA-SHA256');
verifier.update('message to sign');
verifier.end();
const isValid = verifier.verify(publicKey, signature, 'hex');
console.log({ isValid });
```

### Line-by-line explanation breaking down each line

- 1: Import the necessary crypto functions for key generation, signing, and verification.
- 2–3: Destructure required APIs from crypto.
- 6–7: Generate a new 2048-bit RSA key pair (suitable for signatures, not ideal for every system due to size).
- 10: Create a Sign object using RSA-SHA256 for the chosen algorithm.
- 11–12: Provide the message to sign and finalize input.
- 13: Sign the data with the private key and encode the signature as hex.
- 16: Create a Verify object with the same algorithm.
- 17–18: Provide the same message to verify and finalize input.
- 19: Verify the signature against the public key and the provided signature hex.
- 20: Output whether the signature is valid.

```js
// Node.js: HTTPS server skeleton with TLS configuration (production-grade concerns)
const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

// In production, load real certificates from a secure store or CA
const options = {
  key: fs.readFileSync('/path/to/private.key'),
  cert: fs.readFileSync('/path/to/cert.pem'),
  // Optional: passphrase if the private key is encrypted
  // passphrase: 'your-passphrase',
  // Security-related TLS options are typically set at the server level
};

app.get('/', (req, res) => res.send('Secure web app'));

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

### Line-by-line explanation breaking down each line

- 1–3: Import TLS-enabled server facilities, filesystem access, and a web framework.
- 5: Create an Express application to handle routes.
- 8–14: Define TLS options by loading the private key and certificate from disk (production should use secure storage).
- 18: Define a simple route to serve a response.
- 20–22: Create an HTTPS server bound to port 443 using the TLS options and Express app.
- 23: Log the server startup.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Mistake 1: Passwords stored with plain hashing and no salt

#### Bad
```js
// BAD: plain hash without salt
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(password).digest('hex');
```

### Line-by-line explanation breaking down each line

- 1: Import crypto module.
- 2: Create a SHA-256 hash object (without salt).
- 3: Update with the password and compute the digest.
- 4: Output the hash (no salt, fast to brute-force).

#### Good
```js
// GOOD: salt and PBKDF2 for password storage
const crypto = require('crypto');
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
```

### Line-by-line explanation breaking down each line

- 1: Import crypto module.
- 2: Generate a unique 16-byte salt for this password.
- 3: Derive a 64-byte key using PBKDF2 with 100k iterations and SHA-256.
- 4: Output (or store) the salt and hash for later verification.

### Mistake 2: Encrypting with AES-CBC without IV or authentication

#### Bad
```js
// BAD: CBC without an IV and no authentication
const cipher = crypto.createCipher('aes-256-cbc', key);
let enc = cipher.update(plaintext, 'utf8', 'hex');
enc += cipher.final('hex');
```

### Line-by-line explanation breaking down each line

- 1: Create a CBC cipher with a raw key (no IV specified).
- 2–3: Encrypt data without a random IV; this is insecure and deterministic.
- 4: Finalize encryption.

#### Good
```js
// GOOD: AES-256-GCM with random IV and authentication tag
const algorithm = 'aes-256-gcm';
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv(algorithm, key, iv);
let enc = cipher.update(plaintext, 'utf8', 'hex');
enc += cipher.final('hex');
const tag = cipher.getAuthTag();
```

### Line-by-line explanation breaking down each line

- 1: Use a modern authenticated mode (GCM) for confidentiality and integrity.
- 2: Generate a fresh random IV for this encryption instance.
- 3: Create the cipher with IV and key.
- 4–5: Encrypt the data to ciphertext.
- 6: Retrieve the authentication tag for integrity verification.

### Mistake 3: Reusing IVs or salts across multiple encryptions

#### Bad
```js
const iv = Buffer.alloc(16, 0); // fixed IV
```

### Line-by-line explanation breaking down each line

- 1: Creates a fixed, all-zero IV, which makes ciphertext deterministic and vulnerable to certain attacks.

#### Good
```js
const iv = crypto.randomBytes(12);
```

### Line-by-line explanation breaking down each line

- 1: Generate a fresh random IV for each encryption, preserving semantic security.

## Y. Why This Matters In Real Systems — production context and real usage

- Data breach risk: Weak password storage (no salt, single-hash) enables rapid credential stuffing and password reuse attacks.
- Data tampering risk: Without authenticated encryption (or with insecure modes), attackers can modify data in transit or at rest without immediate detection.
- Trust and compliance: Modern standards (TLS 1.2+, HSTS, secure key management) reduce risk and help meet regulatory requirements (e.g., GDPR, PCI-DSS).
- Incident response: Proper cryptographic hygiene (rotation, secure key storage, auditorability) speeds incident investigations and reduces blast radius after a compromise.
- System design impact: Cryptography should be considered at the API boundary (tokens, password resets, data payloads) and tied to concrete threat models (insider vs. external attacker, data at rest vs. in transit).

Examples from real systems:
- Passwords stored with salted PBKDF2/Argon2 or bcrypt instead of plain SHA-256.
- Session tokens signed with a private key or HMAC, then verified by the service.
- Data encrypted at rest with AES-GCM; IVs are per-encryption and stored alongside ciphertext; keys are rotated using a KMS.

## Z. Study Questions — 5 recall questions

1. What is the purpose of using a salt when hashing passwords?
2. What makes AES-GCM preferable to AES-CBC for web app encryption?
3. How does HMAC differ from a plain hash, and why is it important for message integrity?
4. Why should you use a key derivation function (like PBKDF2) for password-derived keys instead of a straight hash?
5. What is the role of a private/public key pair in digital signatures, and how does verification work?

## Exercise

Part A — Password storage module
- Implement a small module that exports two functions: hashPassword(password) and verifyPassword(inputPassword, salt, hash).
- hashPassword should generate a random salt, derive a PBKDF2-SHA256 hash, and return { salt, hash }.
- verifyPassword should recompute the hash with the provided salt and compare using a timing-safe method.
- Provide a usage example demonstrating storing a user and verifying login attempts.

Part B — Data encryption module
- Implement two functions: encrypt(plaintext, key) and decrypt(ciphertextObject, key).
- encrypt should produce { iv, ciphertext, tag } suitable for storage or transport.
- decrypt should take the same structure and return the original plaintext.
- Ensure you use AES-256-GCM with a random IV per encryption.

Part C — Digital signature module
- Implement two functions: sign(message, privateKey) and verify(message, signature, publicKey).
- Use RSA-SHA256 or ECDSA-SHA256 depending on your environment.
- The module should work with keys loaded from PEM strings (not only generated at runtime).
- Include a small test demonstrating signing a message and verifying the signature.

Deliverables:
- A single Node.js file (or a small set of files) that passes the above tasks.
- Include comments explaining security decisions and any assumptions.
- Include a short README-like note on how to rotate keys and where to store them securely.