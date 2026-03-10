# Cryptography Fundamentals in Cyber Security

Cryptography is the backbone of modern network security. It enables confidentiality (keeping data secret), integrity (detecting tampering), authentication (verifying identities), and non-repudiation (ensuring actions can be attributed). In Phase 1 of this module, you’ll build a solid mental model of how cryptographic primitives work, how they’re used in real systems, and how to implement them safely in code. This foundation is essential for defending against eavesdropping, tampering, impersonation, and replay attacks in real-world networks.

## 1. Symmetric Cryptography Basics

Symmetric cryptography uses the same key for encryption and decryption. It’s fast and suitable for protecting data at rest or in transit when both ends securely share a secret key. The most used family today is AES (Advanced Encryption Standard). We’ll demonstrate AES in authenticated mode (AES-GCM) so that confidentiality and integrity are provided together.

Code: AES-256-GCM encryption and decryption in Python (cryptography library)

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

# Generate a 256-bit key (random secret)
key = AESGCM.generate_key(bit_length=256)

# Create an AES-GCM crypto object
aesgcm = AESGCM(key)

# Data to protect
plaintext = b"Confidential payload that needs protection in transit"
aad = b"authenticated but not encrypted header"

# Generate a random 12-byte nonce (recommended for AES-GCM)
nonce = os.urandom(12)

# Encrypt: returns ciphertext with tag appended
ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

# Decrypt: returns the original plaintext
decrypted = aesgcm.decrypt(nonce, ciphertext, aad)

print("Decrypted matches plaintext:", decrypted == plaintext)
```

### Line-by-line explanation breaking down each line
- from cryptography.hazmat.primitives.ciphers.aead import AESGCM
  - Import the AESGCM high-level API which provides authenticated encryption with a simple interface.
- import os
  - Import the os module to generate cryptographically secure random bytes for the nonce.
- key = AESGCM.generate_key(bit_length=256)
  - Generate a random 256-bit symmetric key suitable for AES-256-GCM.
- aesgcm = AESGCM(key)
  - Instantiate an AESGCM cipher object bound to the generated key.
- plaintext = b"Confidential payload that needs protection in transit"
  - Define the data you want to protect (byte string).
- aad = b"authenticated but not encrypted header"
  - Define additional authenticated data that will be authenticated but not encrypted.
- nonce = os.urandom(12)
  - Generate a 12-byte random nonce for AES-GCM (recommended size for GCM).
- ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
  - Encrypt the plaintext with the given nonce and AAD. The output includes the authentication tag.
- decrypted = aesgcm.decrypt(nonce, ciphertext, aad)
  - Decrypt the ciphertext. If the nonce, AAD, or ciphertext were tampered with, an exception would be raised; otherwise you get the original plaintext.
- print("Decrypted matches plaintext:", decrypted == plaintext)
  - Verify that decryption yields the original message.

## 2. Hashing and Data Integrity

Hashing converts data to a fixed-size digest. It’s essential for integrity checks and fingerprinting data. For integrity and authenticity, HMAC (hash-based message authentication code) uses a secret key to protect against tampering and impersonation. We’ll cover both SHA-256 hashing and HMAC-SHA256.

Code: SHA-256 hashing and HMAC-SHA256 in Python

```python
import hashlib
import hmac

def sha256_digest(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()

def hmac_sha256(key: bytes, data: bytes) -> bytes:
    return hmac.new(key, data, hashlib.sha256).digest()

message = b"Message for integrity check"
key = b"supersecretkey"

digest = sha256_digest(message)
mac = hmac_sha256(key, message)

print("SHA-256 digest:", digest.hex())
print("HMAC-SHA256:", mac.hex())
```

### Line-by-line explanation breaking down each line
- import hashlib
  - Import the standard library module for cryptographic hash implementations.
- import hmac
  - Import the HMAC module to produce a keyed hash (MAC) for authentication.
- def sha256_digest(data: bytes) -> bytes:
  - Define a function that computes the SHA-256 digest of given data.
-     return hashlib.sha256(data).digest()
  - Compute the SHA-256 digest and return raw bytes.
- def hmac_sha256(key: bytes, data: bytes) -> bytes:
  - Define a function that computes an HMAC using SHA-256 with the provided key.
-     return hmac.new(key, data, hashlib.sha256).digest()
  - Create the HMAC object and return its digest.
- message = b"Message for integrity check"
  - The message to hash and/or authenticate.
- key = b"supersecretkey"
  - The secret key used for the HMAC (must be kept confidential in real systems).
- digest = sha256_digest(message)
  - Compute the SHA-256 digest of the message.
- mac = hmac_sha256(key, message)
  - Compute an HMAC-SHA256 for message authentication.
- print("SHA-256 digest:", digest.hex())
  - Display the hex representation of the digest.
- print("HMAC-SHA256:", mac.hex())
  - Display the hex representation of the MAC.

## 3. Public-key Cryptography and Digital Signatures

Public-key cryptography enables authentication, data integrity, and non-repudiation. Digital signatures allow a verifier to confirm that a message came from a particular private key holder and has not been altered. We’ll show RSA-based signing and verification using the cryptography library.

Code: RSA signing and verification in Python

```python
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes

# Generate RSA key pair
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

message = b"Important message to sign"

# Sign with PSS padding (secure defaults) and SHA-256
signature = private_key.sign(
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)

# Verify signature
try:
    public_key.verify(
        signature,
        message,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256()
    )
    print("Signature is valid.")
except Exception as e:
    print("Signature verification failed:", str(e))

# Serialize public/private keys for storage/transit (optional)
pem_private = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

pem_public = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

print(pem_private.decode()[:60] + "...")
print(pem_public.decode()[:60] + "...")
```

### Line-by-line explanation breaking down each line
- from cryptography.hazmat.primitives.asymmetric import rsa, padding
  - Import RSA primitives for key generation and the padding schemes used in signing and verification.
- from cryptography.hazmat.primitives import serialization, hashes
  - Import utilities to serialize keys and to compute hashes for signatures.
- private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
  - Generate a new RSA private key with a commonly used exponent and 2048-bit key size.
- public_key = private_key.public_key()
  - Derive the corresponding public key from the private key.
- message = b"Important message to sign"
  - Message to be signed.
- signature = private_key.sign(
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
  )
  - Create a digital signature using RSA-PSS with SHA-256 for strong security and probabilistic padding.
- try:
  - Begin verification in a try block to catch failures.
-     public_key.verify(
        signature,
        message,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256()
      )
  - Verify the signature against the message with the same padding and hash algorithm.
-     print("Signature is valid.")
  - Indicate success if verification passes.
- except Exception as e:
  - If verification fails, handle the error.
-     print("Signature verification failed:", str(e))
  - Output the failure reason.
- pem_private = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
  )
  - Serialize the private key in PEM format (unencrypted for demonstration; do not do this in production).
- pem_public = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
  )
  - Serialize the public key in PEM format.
- print(pem_private.decode()[:60] + "...")
  - Print a preview of the private key PEM data.
- print(pem_public.decode()[:60] + "...")
  - Print a preview of the public key PEM data.

## 4. Key Management Basics

Key management is the set of practices and mechanisms for generating, storing, distributing, rotating, and revoking cryptographic keys. Even the strongest algorithms fail if keys are mishandled. In practice, you’ll store keys securely (hardware security modules, OS key stores, or encrypted vaults), rotate them, and separate duties so private keys are not exposed.

Code: Basic key serialization/storage and loading (Python, cryptography)

```python
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# Generate a key pair (as example; in production you'd load existing keys)
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

password = b"vault-password"  # Use a strong passphrase in production
# Encrypt and serialize private key
encrypted_private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.BestAvailableEncryption(password)
)

# Serialize public key (PEM)
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Load keys back from PEM
loaded_private = serialization.load_pem_private_key(encrypted_private_pem, password=password)
loaded_public = serialization.load_pem_public_key(public_pem)

print("Private key loaded:", isinstance(loaded_private, type(private_key)))
print("Public key loaded:", isinstance(loaded_public, type(public_key)))
```

### Line-by-line explanation breaking down each line
- from cryptography.hazmat.primitives import serialization
  - Import utilities for converting keys to and from PEM/DER formats.
- from cryptography.hazmat.primitives.asymmetric import rsa
  - Import RSA primitives to create or manipulate RSA keys.
- private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
  - Create a private RSA key (for demonstration; in real systems you would load an existing key from a secure store).
- public_key = private_key.public_key()
  - Derive the corresponding public key.
- password = b"vault-password"
  - Define a passphrase used to encrypt the private key when serialized (replace with a strong, secret phrase in production).
- encrypted_private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.BestAvailableEncryption(password)
  )
  - Serialize and encrypt the private key using the provided passphrase.
- public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
  )
  - Serialize the public key to PEM format for distribution.
- loaded_private = serialization.load_pem_private_key(encrypted_private_pem, password=password)
  - Load the private key back from the encrypted PEM using the same passphrase.
- loaded_public = serialization.load_pem_public_key(public_pem)
  - Load the public key back from the PEM.
- print("Private key loaded:", isinstance(loaded_private, type(private_key)))
  - Confirm the private key has been loaded correctly.
- print("Public key loaded:", isinstance(loaded_public, type(public_key)))
  - Confirm the public key has been loaded correctly.

## 5. Certificates and TLS Basics

Understanding how certificates and TLS work helps you reason about secure channels in real networks. You’ll learn how certificates bind identities to public keys and how TLS uses these bindings to establish confidential channels between clients and servers.

Code: Load and inspect a PEM certificate to view subject, issuer, and validity period

```python
from cryptography import x509
from cryptography.hazmat.backends import default_backend

# Load a certificate from a PEM file
with open("server cert.pem", "rb") as f:
    cert_pem = f.read()

cert = x509.load_pem_x509_certificate(cert_pem, backend=default_backend())

print("Subject:", cert.subject)
print("Issuer:", cert.issuer)
print("Not valid before:", cert.not_valid_before)
print("Not valid after:", cert.not_valid_after)
```

### Line-by-line explanation breaking down each line
- from cryptography import x509
  - Import the X.509 module for parsing certificates.
- from cryptography.hazmat.backends import default_backend
  - Obtain a cryptographic backend required for parsing.
- with open("server cert.pem", "rb") as f:
  - Open a PEM-encoded certificate on disk (placeholder filename).
-     cert_pem = f.read()
  - Read the certificate bytes.
- cert = x509.load_pem_x509_certificate(cert_pem, backend=default_backend())
  - Parse the PEM certificate into a usable object.
- print("Subject:", cert.subject)
  - Print the certificate subject (identity the cert asserts).
- print("Issuer:", cert.issuer)
  - Print who issued the certificate.
- print("Not valid before:", cert.not_valid_before)
  - Print the start of the certificate’s validity period.
- print("Not valid after:", cert.not_valid_after)
  - Print the end of the certificate’s validity period.

## X. Common Beginner Mistakes

- Bad: Storing passwords with plain hashes or no MAC
  - Good: Use salted password hashing with Argon2/Bcrypt+scrypt and proper memory-hard functions.
  Bad example:
  ```python
  # Bad: plain hash for password storage (insecure)
  import hashlib
  def store_password(pw: str) -> str:
      return hashlib.sha256(pw.encode()).hexdigest()
  ```
  Good example:
  ```python
  # Good: use Argon2id via passlib (or bcrypt) for password storage
  from argon2 import PasswordHasher
  ph = PasswordHasher()
  def hash_password(pw: str) -> str:
      return ph.hash(pw)
  ```
- Bad: Reusing IVs/nonces across messages in AES-CBC or AES-GCM
  - Good: Generate a fresh random nonce/IV for each encryption and store it with the ciphertext.
  Bad example:
  ```python
  # Bad: reusing IV
  iv = b'\x00' * 12
  ciphertext = aesgcm.encrypt(iv, data, aad=None)  # if using GCM
  ```
  Good example:
  ```python
  # Good: new nonce per encryption
  nonce = os.urandom(12)
  ciphertext = aesgcm.encrypt(nonce, data, aad=None)
  ```
- Bad: Disabling certificate verification in TLS (verify=False)
  - Good: Always verify certificates or pin server certificates in code.
  Bad example:
  ```python
  import requests
  requests.get("https://example.com", verify=False)  # insecure
  ```
  Good example:
  ```python
  # Use system CA store and, if possible, certificate pinning
  import requests
  requests.get("https://example.com", verify=True)
  ```
- Bad: Hard-coding cryptographic keys into source code
  - Good: Load keys from secure storage or environment-protected vaults.
  Bad example:
  ```python
  key = b"this-is-my-secret-key-that-is-hardcoded"
  ```
  Good example:
  ```python
  # Retrieve from secure vault / environment
  import os
  key = os.environ["AES_KEY"].encode()
  ```

## Y. Why This Matters In Real Systems

- Confidentiality of data in transit: TLS and VPNs rely on robust cryptography to prevent eavesdropping.
- Data at rest: Databases, backups, and files require encryption keys managed securely to protect sensitive data if storage media are stolen.
- Integrity and authenticity: HMACs, digital signatures, and certificates ensure that data hasn’t been tampered with and that it originated from a trusted party.
- Key management and rotation: In production, keys must be rotated regularly, properly stored, and access-controlled to limit exposure and risk.
- Compliance and audits: Cryptographic controls are often required by regulatory standards (e.g., GDPR, PCI-DSS, HIPAA) to protect sensitive information and maintain traceability.

## Z. Study Questions

1. What is the main difference between symmetric and asymmetric cryptography? Provide an example use-case for each.
2. How does AES-GCM provide both confidentiality and integrity in a single operation?
3. What is the purpose of an HMAC, and how does it differ from a cryptographic hash?
4. Describe RSA-PSS and why it is preferred over basic PKCS#1 v1.5 signatures in modern systems.
5. Why is proper key management critical for the security of cryptographic systems?

## Exercise

Multi-part practical coding challenge (Python, cryptography library)

Part A — Implement AES-256-GCM utility
- Task: Create a small module that can encrypt and decrypt with AES-256-GCM using a random nonce and optional AAD. The module should expose:
  - generate_key() -> bytes
  - encrypt(key: bytes, plaintext: bytes, aad: bytes | None) -> dict with nonce, ciphertext
  - decrypt(key: bytes, nonce: bytes, ciphertext: bytes, aad: bytes | None) -> plaintext

Part B — Implement and verify RSA signatures
- Task: Create a signing utility that can generate an RSA key pair, sign a message with RSA-PSS SHA-256, and verify signatures. Ensure that verification raises a clear error on failure.

Part C — Create a secure message envelope
- Task: Build a function that takes a plaintext message, a symmetric key, and an RSA private key. It should:
  - Encrypt the message with AES-256-GCM, including a random nonce and AAD.
  - Create an RSA-PSS/SHA-256 signature of the ciphertext (or of the plaintext if you prefer).
  - Return a JSON-serializable envelope containing: nonce (hex), ciphertext (hex), aad (hex, if used), signature (hex), and public key (PEM, optional).
- Guidance:
  - Use cryptography for all crypto operations.
  - Do not print secret material; the exercise can show safe logging only (e.g., lengths, key IDs).

Notes:
- This lesson uses Python with the cryptography library. Ensure you have it installed: pip install cryptography
- In production, never hard-code keys, never print secret material, and always handle exceptions carefully to avoid leaking sensitive information.