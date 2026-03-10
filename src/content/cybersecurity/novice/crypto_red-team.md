# Cryptography Fundamentals - Phase 1: Security Basics (Red Teaming)

Cryptography is the backbone of confidentiality, integrity, and authenticity in modern security operations. In red-team work, understanding how to implement, misuse, or bypass cryptographic primitives helps you simulate realistic attacker scenarios, assess defenses, and design robust countermeasures. This lesson covers core cryptography fundamentals you need to reason about data in transit and at rest, how attackers might exploit weak configurations, and how defenders can harden systems.

## 1. Symmetric Encryption with AES-GCM

Symmetric encryption uses the same key for encryption and decryption. AES-GCM is an AEAD (Authenticated Encryption with Associated Data) mode that provides confidentiality and integrity in one operation, protecting the ciphertext from tampering and ensuring the data is fresh with a nonce.

Code: AES-GCM encryption and decryption (Python, cryptography)

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

# Generate a random 128-bit AES key
key = AESGCM.generate_key(bit_length=128)

aesgcm = AESGCM(key)

# Nonce must be unique per encryption under the same key
nonce = os.urandom(12)

plaintext = b"Confidential red-team payload"
aad = b"authenticated data"  # Optional: associated data that is authenticated but not encrypted

# Encrypt (produces ciphertext with authentication tag appended)
ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

# Decrypt
decrypted = aesgcm.decrypt(nonce, ciphertext, aad)
print(decrypted)
```

### Line-by-line explanation breaking down each line

- from cryptography.hazmat.primitives.ciphers.aead import AESGCM
  - Imports the AESGCM high-level API for AEAD operations.

- import os
  - Imports the OS module to generate cryptographically secure random bytes.

- key = AESGCM.generate_key(bit_length=128)
  - Generates a new random 128-bit key suitable for AES-GCM.

- aesgcm = AESGCM(key)
  - Instantiates an AESGCM object bound to the generated key.

- nonce = os.urandom(12)
  - Creates a 12-byte random nonce (recommended size for AES-GCM).

- plaintext = b"Confidential red-team payload"
  - Defines the plaintext data to encrypt.

- aad = b"authenticated data"
  - Optional associated data that is authenticated but not encrypted.

- ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
  - Encrypts the plaintext with the nonce and AAD; returns ciphertext including the authentication tag.

- decrypted = aesgcm.decrypt(nonce, ciphertext, aad)
  - Decrypts the ciphertext using the same nonce and AAD; returns the original plaintext if valid.

- print(decrypted)
  - Outputs the recovered plaintext, confirming correctness.

## 2. Hashing and Integrity with SHA-256 and HMAC

Hash functions provide data integrity and signatures verify authenticity. HMAC combines a secret key with a hash to guard against tampering and key leakage through hash collisions. Use HMAC for message integrity and tamper-detection in transit.

Code: SHA-256 hashing and HMAC verification (Python)

```python
import os
import hashlib
import hmac

# Secret key used for HMAC (keep this secret in production)
key = os.urandom(32)

message = b"Command and control beacon payload"

# Compute HMAC-SHA256 tag
signature = hmac.new(key, message, hashlib.sha256).digest()

# Verification function
def verify(k, m, sig):
    expected = hmac.new(k, m, hashlib.sha256).digest()
    return hmac.compare_digest(expected, sig)

print("Signature valid?", verify(key, message, signature))
```

### Line-by-line explanation breaking down each line

- import os
  - Imports OS utilities for secure randomness.

- import hashlib
  - Imports hashing primitives.

- import hmac
  - Imports the HMAC module for keyed-hash authentication.

- key = os.urandom(32)
  - Generates a 256-bit secret key used for HMAC.

- message = b"Command and control beacon payload"
  - The data whose integrity we want to protect.

- signature = hmac.new(key, message, hashlib.sha256).digest()
  - Computes an HMAC-SHA256 tag over the message with the secret key.

- def verify(k, m, sig):
  - Defines a verifier function to compare a computed tag with the provided one.

- expected = hmac.new(k, m, hashlib.sha256).digest()
  - Recomputes the expected tag for the given inputs.

- return hmac.compare_digest(expected, sig)
  - Performs a constant-time comparison to avoid timing side channels.

- print("Signature valid?", verify(key, message, signature))
  - Outputs whether the signature is valid.

## 3. Public-Key Cryptography: RSA for Encryption and Signatures

Public-key cryptography enables secure key exchange and digital signatures. RSA with OAEP for encryption and PSS for signatures is a common, standards-based approach. This demonstrates envelope-style encryption: encrypt data with a symmetric key, then encrypt that key with RSA.

Code: RSA key exchange and digital signatures (Python, cryptography)

```python
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend

# Generate RSA key pair
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
public_key = private_key.public_key()

message = b"Attack at dawn"

# Encrypt with RSA-OAEP
ciphertext = public_key.encrypt(
    message,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

# Decrypt with RSA-OAEP
plaintext = private_key.decrypt(
    ciphertext,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

# Sign with RSA-PSS
signature = private_key.sign(
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)

# Verify signature with the public key
try:
    public_key.verify(
        signature,
        message,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256()
    )
    print("Signature verified.")
except Exception:
    print("Signature verification failed.")

print("Decrypted plaintext:", plaintext)
```

### Line-by-line explanation breaking down each line

- from cryptography.hazmat.primitives.asymmetric import rsa, padding
  - Imports RSA primitives and padding schemes for encryption and signing.

- from cryptography.hazmat.primitives import hashes, serialization
  - Imports hashing primitives and serialization utilities (serialization not used here but commonly needed for keys).

- private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
  - Generates a new 2048-bit RSA private key.

- public_key = private_key.public_key()
  - Extracts the corresponding public key.

- message = b"Attack at dawn"
  - The message to protect.

- ciphertext = public_key.encrypt(...
  - Encrypts the message using RSA-OAEP with SHA-256 as the hash.

- plaintext = private_key.decrypt(...
  - Decrypts the ciphertext back to the original message.

- signature = private_key.sign(...
  - Creates a digital signature over the message using RSA-PSS with SHA-256.

- public_key.verify(...
  - Verifies the RSA-PSS signature. If verification fails, an exception is raised.

- except Exception:
  - Catches any verification failure.

- print("Signature verified.")
  - Indicates a successful signature verification.

- print("Decrypted plaintext:", plaintext)
  - Outputs the decrypted message to confirm correctness.

## 4. Password Hashing and Key Derivation: Argon2/Bcrypt (Safeguarding Credentials)

Storing passwords securely uses slow, memory-hard algorithms to resist brute-force attacks. Argon2 and bcrypt are common choices; use a proper salt, high work factor, and avoid plain hash comparisons. This section demonstrates Argon2 with a proper verifier.

Code: Password hashing with Argon2 and verification (Python, argon2-cffi)

```python
from argon2 import PasswordHasher

ph = PasswordHasher(time_cost=2, memory_cost=102400, parallelism=2)

password = "Secur3P@ssw0rd!"

hash = ph.hash(password)

# Verification
try:
    ph.verify(hash, password)
    print("Password is valid.")
except Exception as e:
    print("Invalid password.")
```

### Line-by-line explanation breaking down each line

- from argon2 import PasswordHasher
  - Imports the Argon2 PasswordHasher class for hashing and verification.

- ph = PasswordHasher(time_cost=2, memory_cost=102400, parallelism=2)
  - Configures the Argon2 parameters: time (iterations), memory (KB), and parallelism (threads). Adjust for security vs. performance.

- password = "Secur3P@ssw0rd!"
  - The plaintext password to hash.

- hash = ph.hash(password)
  - Generates a secure Argon2 hash including a salt and parameters.

- try:
  - Starts verification flow.

- ph.verify(hash, password)
  - Verifies that the provided password matches the stored Argon2 hash.

- print("Password is valid.")
  - Confirms successful verification.

- except Exception as e:
  - Catches any mismatch or error during verification.

- print("Invalid password.")
  - Indicates verification failure.

## 5. Key Management and Hybrid (Envelope) Encryption

Real systems often combine public-key cryptography with symmetric keys to protect large payloads efficiently. Envelope (hybrid) encryption encrypts data with a symmetric key (fast) and then encrypts that key with a public key (secure key exchange). This example demonstrates the end-to-end process.

Code: Envelope encryption (Python, cryptography)

```python
import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

# Generate RSA public/private key pair (long-lived in production)
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
public_key = private_key.public_key()

# Data to encrypt
plaintext = b"Very sensitive red-team payload"

# 1) Generate a random data key for AES-GCM
data_key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(data_key)

# 2) Encrypt the data with the data key
nonce = os.urandom(12)
ciphertext = aesgcm.encrypt(nonce, plaintext, None)

# 3) Encrypt the data key with RSA-OAEP
encrypted_data_key = public_key.encrypt(
    data_key,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                 algorithm=hashes.SHA256(),
                 label=None)
)

# At this point, you would store/transmit:
# - encrypted_data_key
# - nonce
# - ciphertext

# Decryption path:
# 4) Decrypt the data key with RSA private key
decrypted_data_key = private_key.decrypt(
    encrypted_data_key,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                 algorithm=hashes.SHA256(),
                 label=None)
)

# 5) Decrypt the data with the decrypted data key
aesgcm2 = AESGCM(decrypted_data_key)
plaintext_out = aesgcm2.decrypt(nonce, ciphertext, None)

print(plaintext_out)
```

### Line-by-line explanation breaking down each line

- import os
  - Imports OS utilities for randomness.

- from cryptography.hazmat.primitives.asymmetric import rsa, padding
  - Imports RSA and padding schemes for envelope encryption.

- from cryptography.hazmat.primitives.ciphers.aead import AESGCM
  - Imports the AEAD API for symmetric encryption.

- from cryptography.hazmat.primitives import hashes
  - Imports hashing algorithms used in OAEP.

- from cryptography.hazmat.backends import default_backend
  - Chooses the cryptographic backend.

- private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
  - Generates an RSA private key.

- public_key = private_key.public_key()
  - Derives the corresponding public key.

- plaintext = b"Very sensitive red-team payload"
  - The actual data to protect.

- data_key = AESGCM.generate_key(bit_length=256)
  - Creates a random symmetric key for AES-GCM.

- aesgcm = AESGCM(data_key)
  - Binds AES-GCM to the generated data key.

- nonce = os.urandom(12)
  - Generates a unique nonce for the encryption.

- ciphertext = aesgcm.encrypt(nonce, plaintext, None)
  - Encrypts the payload with AES-GCM; includes authentication tag.

- encrypted_data_key = public_key.encrypt(...
  - Encrypts the data key with RSA-OAEP for secure key transport.

- decrypted_data_key = private_key.decrypt(...
  - Recovers the original data key from the encrypted key.

- aesgcm2 = AESGCM(decrypted_data_key)
  - Creates a new AES-GCM instance with the recovered key.

- plaintext_out = aesgcm2.decrypt(nonce, ciphertext, None)
  - Decrypts the ciphertext to retrieve the original plaintext.

- print(plaintext_out)
  - Outputs the recovered plaintext to verify correctness.

## X. Common Beginner Mistakes

Pitfalls beginners often make when learning cryptography. See bad vs good examples side-by-side for clarity.

### Pitfall 1: Reusing IVs or nonces with AES-CBC/CTR

Bad:
```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import os
key = os.urandom(16)
iv = b'\x00' * 16  # Fixed IV (dangerous)
cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
encryptor = cipher.encryptor()
ct = encryptor.update(b"Secret data 1234") + encryptor.finalize()
```

Good:
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
key = AESGCM.generate_key(bit_length=128)
aesgcm = AESGCM(key)
nonce = os.urandom(12)  # Unique per encryption
ct = aesgcm.encrypt(nonce, b"Secret data 1234", None)
```

### Pitfall 2: Not authenticating data (no MAC or AEAD)

Bad:
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
key = AESGCM.generate_key(bit_length=128)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
ct = aesgcm.encrypt(nonce, b"payload", None)  # No AAD and no verification path shown
# Receiver decrypts without any integrity check conceptually
```

Good:
```python
# Use AEAD (AES-GCM) and include AAD if needed; integrity is built-in
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
key = AESGCM.generate_key(bit_length=128)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
aad = b"header"
ct = aesgcm.encrypt(nonce, b"payload", aad)
pt = aesgcm.decrypt(nonce, ct, aad)
```

### Pitfall 3: Hard-coding keys or storing them insecurely

Bad:
```python
# Do NOT store keys in source control or code
KEY = b"hardcoded_key_please_change_me_!!!"
```

Good:
```python
# Use environment variables or a secrets manager
import os
KEY = os.environ.get("CRYPTO_KEY")
assert KEY is not None, "CRYPTO_KEY environment variable required"
```

## Y. Why This Matters In Real Systems

- Security posture: Cryptography is only as strong as its configuration. Wrong modes, repeated nonces, or poorly managed keys create attack surfaces that enable data theft, tampering, or impersonation.
- Key management: Protecting keys is critical. Keys should be rotated, stored in secure hardware or KMS, and access-controlled. Secrets in code or repos are high-risk.
- Operational realism: Red teams simulate real-world scenarios—data exfiltration, command and control channels, and credential abuse—where cryptography often determines whether defenders detect or miss activity.
- Compliance and standards: Many industries require compliance with standards (e.g., FIPS 140-2/3 for crypto modules, NIST SP 800-53 controls). Use vetted libraries and follow best practices for configuration, validation, and auditing.
- Attack surface awareness: Side-channel risks (timing, power) and implementation bugs can undermine otherwise strong cryptography. Regular code reviews, fuzz testing, and formal verification where feasible reduce risk.

In practice, you should:
- Favor AEAD modes (AES-GCM, ChaCha20-Poly1305) to combine encryption and authentication.
- Use secure key derivation and proper salts/parameters for password storage (Argon2, bcrypt).
- Implement envelope encryption for large data or data-at-rest scenarios.
- Centralize key management with auditable access controls and rotation policies.
- Validate all cryptographic operations and handle failures gracefully with proper error handling.

## Z. Study Questions

1. What is the difference between symmetric and asymmetric cryptography, and when would you choose each?
2. What is an AEAD mode, and why is it important for both confidentiality and integrity?
3. How does HMAC differ from a digital signature, and when would you use each?
4. Explain envelope (hybrid) encryption and why it is efficient for protecting large payloads.
5. Why is nonce/IV management critical, and what can go wrong if nonces are reused?

## Exercise

Goal: Implement a small cryptography utility that supports AES-GCM encryption/decryption and envelope encryption, with a simple command-line interface and tests.

Part A — AES-GCM utility
- Create a Python module crypto_utils.py with:
  - encrypt_aes_gcm(key, plaintext, aad=None) -> dict:
    - Returns { "nonce": hex, "ciphertext": hex, "aad": aad_hex (optional) }
  - decrypt_aes_gcm(key, nonce_hex, ciphertext_hex, aad=None) -> bytes
- Use cryptography’s AESGCM to perform operations.
- Add basic input validation and error handling.

Part B — Envelope encryption example (RSA + AES-GCM)
- Extend crypto_utils.py with:
  - envelope_encrypt(plaintext, public_key) -> dict:
    - Generates a random data key, encrypts plaintext with AES-GCM, then encrypts the data key with the RSA public_key (OAEP).
    - Returns { "encrypted_data_key": hex, "nonce": hex, "ciphertext": hex }
  - envelope_decrypt(envelope, private_key) -> bytes:
    - Decrypts the data key with RSA private_key, then decrypts the ciphertext with AES-GCM using the recovered key.
- Include example RSA key generation in a separate function or in a small script for testing.

Part C — Quick tests
- Write a short test script test_crypto.py that:
  - Generates a random AES key and encrypts/decrypts a message using encrypt_aes_gcm/decrypt_aes_gcm; asserts plaintext equality.
  - Generates an RSA key pair, performs envelope_encrypt/envelope_decrypt, and asserts the decrypted plaintext matches the original.

Part D — CLI (optional enhancement)
- Create a tiny CLI tool cli_crypto.py that:
  - Accepts a subcommand aes-encrypt or envelope-encrypt.
  - Reads plaintext from stdin or a file and outputs a JSON payload with the necessary fields.
  - For envelope-encrypt, prints the public key in PEM format if needed and demonstrates a full round-trip by decrypting with a generated private key in-process.

Notes
- Ensure you have the cryptography library installed: pip install cryptography
- This exercise emphasizes correctness, safety, and readability. Do not use hard-coded keys in real work; instead, rely on environment variables, KMS, or secret management solutions.
- In production, add robust error handling, logging, and input validation, and consider side-channel resistant comparisons for MACs and signatures.