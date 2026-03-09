# Password Hashing with bcrypt in Python (Backend Engineering: Phase 6 — Authentication & Security)

In modern backend systems, securely storing user passwords is non-negotiable. bcrypt provides adaptive hashing with per-password salts, protecting against rainbow table attacks and slowing down attackers even if hashes are compromised. This lesson shows how to hash passwords securely in Python, verify them during login, and reason about security knobs like cost factors and peppering. You’ll gain practical, production-ready patterns you can adapt to real services, databases, and auth flows.

## 1. Hashing a Password with bcrypt in Python

This section demonstrates the core idea: generate a salt and hash a password with bcrypt. The resulting hash contains the salt, so you don’t need to store the salt separately.

```python
import bcrypt

def hash_password(plain_password: str, rounds: int = 12) -> bytes:
    # Generate a per-password salt with the desired cost factor
    salt = bcrypt.gensalt(rounds=rounds)
    # Hash the password using the salt
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed

def verify_password(plain_password: str, hashed: bytes) -> bool:
    # Check if the provided password matches the stored hash
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed)

# Demonstration
password = "Secur3P@ssw0rd!"
hashed = hash_password(password)
print("Hashed password:", hashed)

# Correct verification
print("Verify correct password:", verify_password(password, hashed))

# Incorrect verification
print("Verify wrong password:", verify_password("WrongPassword", hashed))
```

### Line-by-line explanation breaking down each line

- import bcrypt: Imports the bcrypt library to access hashing and verification utilities.
- def hash_password(plain_password: str, rounds: int = 12) -> bytes:: Defines a function to hash a plaintext password with a configurable cost factor.
- salt = bcrypt.gensalt(rounds=rounds): Generates a salt with the specified log rounds (cost factor). Higher rounds cost more computation, increasing security.
- hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt): Hashes the password (encoded to bytes) using the generated salt.
- return hashed: Returns the resulting hash (bytes). The hash includes the salt and cost factor embedded inside it.
- def verify_password(plain_password: str, hashed: bytes) -> bool:: Defines a function to verify a password against a stored hash.
- return bcrypt.checkpw(plain_password.encode('utf-8'), hashed): Checks if the provided password matches the stored hash.
- password = "Secur3P@ssw0rd!": Example plaintext password used for demonstration.
- hashed = hash_password(password): Creates a bcrypt hash for the password.
- print("Hashed password:", hashed): Outputs the hash for inspection.
- print("Verify correct password:", verify_password(password, hashed)): Verifies the correct password against the hash.
- print("Verify wrong password:", verify_password("WrongPassword", hashed)): Verifies an incorrect password to show failure returns False.

## 2. Verifying Passwords and Flow

In a real system, you retrieve the stored hash from a database and verify a user’s login attempt against it. This section demonstrates storing the hash as a text-friendly string and verifying from storage.

```python
# Simulated storage: store as UTF-8 string for DB compatibility
stored_hash_str = hashed.decode('utf-8')

def verify_from_storage(plain_password: str, stored_hash_str: str) -> bool:
    # Convert string back to bytes
    stored_hash = stored_hash_str.encode('utf-8')
    return verify_password(plain_password, stored_hash)

print("Stored hash string:", stored_hash_str)
print("Verify with stored hash:", verify_from_storage(password, stored_hash_str))
```

### Line-by-line explanation breaking down each line

- stored_hash_str = hashed.decode('utf-8'): Converts the hash from bytes to a UTF-8 string so it can be stored in text-based storage (e.g., a DB column).
- def verify_from_storage(plain_password: str, stored_hash_str: str) -> bool:: Defines a helper to verify using the stored string hash.
- stored_hash = stored_hash_str.encode('utf-8'): Converts the stored string back to bytes for bcrypt verification.
- return verify_password(plain_password, stored_hash): Uses the standard verification path to compare the password with the stored hash.
- print("Stored hash string:", stored_hash_str): Displays the string form of the stored hash.
- print("Verify with stored hash:", verify_from_storage(password, stored_hash_str)): Demonstrates end-to-end verification using storage-like data.

## 3. Cost Factor, Salt, and Pepper: Tuning Security

Security knobs help balance resistance to offline attacks with application latency. This section shows how to adjust cost and introduce an optional pepper (a server-side secret added to the password before hashing).

```python
import os
import bcrypt

def hash_password_with_pepper(plain_password: str, rounds: int = 12, pepper: str = "") -> bytes:
    salt = bcrypt.gensalt(rounds=rounds)
    combined = (plain_password + pepper).encode('utf-8')
    return bcrypt.hashpw(combined, salt)

def verify_password_with_pepper(plain_password: str, pepper: str, stored_hash: bytes) -> bool:
    combined = (plain_password + pepper).encode('utf-8')
    return bcrypt.checkpw(combined, stored_hash)

# Pepper is read from environment (should be kept secret and not checked into VCS)
pepper = os.environ.get("BCRYPT_PEPPER", "")

password = "Secur3P@ssw0rd!"
hash_with_pepper = hash_password_with_pepper(password, rounds=14, pepper=pepper)

print("Hash with pepper:", hash_with_pepper)

# Verification path
assert verify_password_with_pepper(password, pepper, hash_with_pepper)
print("Pepper-based verification succeeded.")
```

### Line-by-line explanation breaking down each line

- import os: Imports the OS module to access environment variables for pepper.
- import bcrypt: Imports the bcrypt library for hashing and verification.
- def hash_password_with_pepper(...): Defines a hashing function that adds a pepper to the password before hashing.
- salt = bcrypt.gensalt(rounds=rounds): Generates a per-password salt with the chosen cost factor.
- combined = (plain_password + pepper).encode('utf-8'): Concatenates the password with the pepper and encodes to bytes.
- return bcrypt.hashpw(combined, salt): Hashes the combined password+pepper with the generated salt.
- def verify_password_with_pepper(...): Defines the corresponding verification function.
- pepper = os.environ.get("BCRYPT_PEPPER", ""): Reads the pepper from an environment variable; defaults to empty if not set.
- hash_with_pepper = hash_password_with_pepper(...): Creates a peppered hash with a higher cost factor.
- print("Hash with pepper:", hash_with_pepper): Displays the peppered hash for inspection.
- assert verify_password_with_pepper(...): Verifies the password with the pepper against the stored hash.
- print("Pepper-based verification succeeded."): Confirms successful verification.

Note: Pepper adds an extra layer of security, but it must remain secret and consistent across all authentication checks and rehashes. If the pepper changes, existing hashes will fail verification and must be rehashed with the new pepper.

## 4. Storage Formats, Migration, and Practical Considerations

Security is not just about hashing; it’s about how you store and migrate hashes, and how you evolve your authentication scheme over time.

- Hash format: bcrypt hashes are ASCII strings when decoded, so storing as text is common. The hash itself includes the version, cost factor, and salt, so you don’t need to store salt separately.
- Encoding decisions: When persisting, you can store as text (utf-8) or as binary. If you store as text, decode to utf-8 on write and encode back on read.
- Pepper management: Keep peppers in environment configurations or a dedicated secret manager. Do not hard-code them. If you rotate a pepper, you’ll need a migration path that re-hashes affected passwords with the new pepper.
- Upgrading hash schemes: If you move from bcrypt to a different scheme (e.g., Argon2), you can add a version tag in your user metadata or discern by hash prefix. Re-hash on user login if needed.
- Handling Unicode: Always encode passwords explicitly (e.g., UTF-8) before hashing to avoid TypeError and ensure consistent behavior across platforms.

Example: migration-ready read/write pattern

```python
# Simulated: old hash (stored as text) with no pepper
old_password = "OldP@ssw0rd!"
old_hashed = hash_password(old_password)  # Note: this is a bcrypt hash (bytes)

# Persist as text
old_hashed_text = old_hashed.decode('utf-8')

# On login with pepper-enabled system, try verification:
def verify_with_migration(plain_password: str, stored_hash_text: str, pepper: str) -> bool:
    stored_hash = stored_hash_text.encode('utf-8')
    # First, try plain bcrypt verification (old path)
    if verify_password(plain_password, stored_hash):
        return True
    # If needed, attempt peppered verification by migrating to new pepper/higher rounds
    # This is a simplified example; in practice, you'd detect the scheme version and rehash if needed
    return verify_password_with_pepper(plain_password, pepper, stored_hash)

pepper = os.environ.get("BCRYPT_PEPPER", "")
print("Migration-ready verify result:", verify_with_migration(old_password, old_hashed_text, pepper))
```

### Line-by-line explanation breaking down each line

- old_hashed_text = old_hashed.decode('utf-8'): Converts a previously stored bytes hash to text form for storage compatibility.
- def verify_with_migration(...): Defines a verification function that can support an upgrade path.
- stored_hash = stored_hash_text.encode('utf-8'): Converts text hash back to bytes for bcrypt verification.
- if verify_password(plain_password, stored_hash): Attempts the original bcrypt verification (old path).
- return True: If old path succeeds, authentication passes.
- return verify_password_with_pepper(...): If old path fails, attempt peppered verification as part of migration logic.
- pepper = os.environ.get("BCRYPT_PEPPER", ""): Reads pepper from environment.
- print("Migration-ready verify result:", ...): Demonstrates the result of a potential migration check.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Storing plain passwords or codecs instead of hashed values
  - Bad:
    ```python
    # BAD: storing plaintext password
    user_store = {"alice": "Secur3P@ssw0rd!"}
    def login_bad(username, pw):
        return user_store[username] == pw
    ```
  - Good:
    ```python
    import bcrypt
    user_store = {"alice": hash_password("Secur3P@ssw0rd!")}  # store hash bytes
    def login_good(username, pw):
        stored = user_store[username]
        return verify_password(pw, stored)
    ```

- Pitfall 2: Reusing a single, fixed salt for all passwords
  - Bad:
    ```python
    # BAD: same salt for every password
    fixed_salt = bcrypt.gensalt(rounds=12)
    def bad_hash(pw: str):
        return bcrypt.hashpw(pw.encode(), fixed_salt)
    ```
  - Good:
    ```python
    def good_hash(pw: str):
        return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12))
    ```

- Pitfall 3: Hashing with a non-secure pipeline (e.g., sha256 then bcrypt, or double-hashing without a purpose)
  - Bad:
    ```python
    import hashlib
    def bad_double_hash(pw: str):
        sha = hashlib.sha256(pw.encode()).digest()
        return bcrypt.hashpw(sha, bcrypt.gensalt())
    ```
  - Good:
    ```python
    def good_hash(pw: str):
        return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt())
    ```

- Pitfall 4: Not handling encoding consistently (TypeError from mixing str and bytes)
  - Bad:
    ```python
    def bad_encode(pw):
        return bcrypt.hashpw(pw, bcrypt.gensalt())  # pw must be bytes
    ```
  - Good:
    ```python
    def good_encode(pw: str):
        return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt())
    ```

- Pitfall 5: Ignoring pepper or secret management
  - Bad:
    ```python
    def bad_pepper_hash(pw: str):
        pepper = ""  # hard-coded empty pepper
        return bcrypt.hashpw((pw + pepper).encode(), bcrypt.gensalt())
    ```
  - Good:
    ```python
    import os
    pepper = os.environ.get("BCRYPT_PEPPER", "")
    def good_pepper_hash(pw: str):
        return bcrypt.hashpw((pw + pepper).encode('utf-8'), bcrypt.gensalt())
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Security resilience: bcrypt automatically handles salts and introduces a cost factor. Per-password salts prevent precomputed attacks; pepper adds an extra secret layer, albeit with caveats (secret management and rotation).
- Performance and usability: Cost factor directly affects compute time. A higher rounds value increases resistance to offline cracking but adds latency to legitimate logins. Monitor and tune based on latency budgets and hardware.
- Data lifecycles and migrations: You may need to upgrade hash schemes or rotate peppers. Plan for metadata/versioning in user records so you can verify and re-hash as needed without breaking existing accounts.
- Storage considerations: Hashes are typically stored as text in databases. Ensure encoding/decoding is consistent across services and language bindings.
- Operational security: Treat pepper and other secrets as credentials. Use environment variables, secret managers, or container secrets. Audit who has access to pepper values and rotate them carefully with a migration strategy.

## Z. Study Questions — 5 recall questions

1) What does bcrypt.gensalt do and why is a per-password salt important?  
2) How does bcrypt store the salt and cost factor within the hash itself?  
3) How would you implement a pepper, and what are its trade-offs?  
4) Why is it a bad idea to hash the password with sha256 before bcrypt?  
5) How can you migrate from a system without pepper to one with pepper without breaking existing logins?

## Exercise — practical multi-part coding challenge

Goal: Build a small, self-contained, testable password-hashing module and a tiny in-memory authentication flow using bcrypt in Python. You’ll implement, test, and reflect on a clean, production-ready pattern.

Part A — Implement a minimal bcrypt helper
- Create a module named auth_hashing.py with:
  - hash_password(plain_password: str, rounds: int = 12) -> bytes
  - verify_password(plain_password: str, hashed: bytes) -> bool
  - Optional pepper support:
    - hash_password_with_pepper(plain_password: str, rounds: int = 12, pepper: str = "") -> bytes
    - verify_password_with_pepper(plain_password: str, pepper: str, stored_hash: bytes) -> bool
- Include small tests in the same file using simple asserts or a basic if __name__ == "__main__": block to demonstrate basic usage.

Part B — In-memory user store and login flow
- Implement an in-memory user store that maps username to hashed password (bytes) using the helper above.
- Provide register_user(username: str, password: str) -> bool and authenticate(username: str, password: str) -> bool.
- Demonstrate a login flow:
  - Register two users (e.g., alice, bob) with different passwords.
  - Attempt logins with correct and incorrect passwords.
  - Print outcomes in a readable format.

Part C — Pepper integration and environment configuration
- Read a pepper from an environment variable named BCRYPT_PEPPER (default to empty if not set).
- Use hash_password_with_pepper and verify_password_with_pepper in the login/register flow.
- Demonstrate re-hashing a stored password when a pepper is added (conceptual migration pattern; you can simulate by re-hashing on first login after pepper change).

Part D — Plain-language goals and security notes
- Add comments explaining design decisions, why per-password salts are essential, and how you would extend this to a real database-backed user store.
- Discuss how you would test performance and tune the rounds factor in a staging environment.

Deliverable: A cohesive, well-commented Python module (auth_hashing.py) plus a short script (demo.py) that wires hashing, storage, and login logic together. Include the expected console output as comments or a sample run in your notes.