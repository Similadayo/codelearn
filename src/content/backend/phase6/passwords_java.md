# Track: Backend Engineering — Module: Phase 6 — Authentication & Security — Password Hashing with bcrypt (Java)

Password hashing with bcrypt is a foundational defense in depth practice for protecting user credentials at rest. In backend systems, storing plaintext passwords or using fast hash functions invites catastrophic breaches: if your database is compromised, attackers can mount rapid offline attacks. bcrypt, with its adaptive cost factor and built-in salt, makes password cracking significantly more expensive over time and per-password, helping your system tolerate rising hardware capabilities. In Java, you can leverage the jBCrypt library to hash passwords and verify them securely as part of your authentication flow.

## 1. Understanding bcrypt in Java: what it does and why it matters

Bcrypt combines salt and an adjustable work factor to produce a hash that is unique per password and expensive to compute. The salt is embedded in the resulting hash, so you don’t need to store it separately; the verification routine uses the embedded salt to recompute and compare hashes.

Key concepts:
- Salt: A random value appended to the password before hashing, ensuring identical passwords result in different hashes.
- Cost factor (log rounds): Controls how many iterations bcrypt performs. Higher cost means slower hashing, increasing resistance to brute-force attempts.
- Hash format: The output string contains algorithm identifier, cost, salt, and the hash itself, e.g. $2a$12$... which makes it self-contained for verification.

Code example (hashing a password with a cost factor and producing a salted hash):

```java
import org.mindrot.jbcrypt.BCrypt;

public class PasswordUtil {
  // Hash a password with a configurable cost factor
  public static String hashPassword(String password) {
    int cost = 12; // recommended starting point; adjust based on latency tolerance
    String salt = BCrypt.gensalt(cost);
    String hashed = BCrypt.hashpw(password, salt);
    return hashed;
  }

  // Verify a candidate password against a stored hash
  public static boolean checkPassword(String candidate, String storedHash) {
    if (storedHash == null || candidate == null) return false;
    return BCrypt.checkpw(candidate, storedHash);
  }
}
```

### Line-by-line explanation
- Line 1: Import the jBCrypt library class for hashing utilities.
- Line 4: Define a public method hashPassword that accepts the plaintext password.
- Line 5: Set the cost factor (log rounds) to 12. This strikes a balance between security and latency; higher costs increase protection but add delay.
- Line 6: Generate a salt that encodes the cost factor and randomness.
- Line 7: Compute the bcrypt hash using the password and the generated salt.
- Line 8: Return the resulting hashed string; it includes salt and cost factor.
- Line 11: Define a method checkPassword to verify a candidate password against a stored hash.
- Line 12: Guard against null inputs to avoid NPEs and insecure behavior.
- Line 13: Delegate verification to BCrypt.checkpw, which performs the necessary salt extraction and hash comparison.
- Line 14: Return true if the candidate matches the stored hash, false otherwise.

## 2. Setting up bcrypt in a Java project (Maven and Gradle)

To use bcrypt in Java, you need the jBCrypt dependency. Below are common build configurations.

### Maven (pom.xml)

```xml
<dependency>
  <groupId>org.mindrot</groupId>
  <artifactId>jbcrypt</artifactId>
  <version>0.4</version>
</dependency>
```

### Gradle (build.gradle)

```groovy
dependencies {
  implementation 'org.mindrot:jbcrypt:0.4'
}
```

### Line-by-line explanation
- Maven: The dependency block declares the library group, artifact, and version to include in the build.
- Gradle: The implementation configuration adds the same library to the compile/runtime classpath.
- Both ensure the org.mindrot.jbcrypt.BCrypt class is available to your Java source.

## 3. Hashing and verifying: practical usage in a simple utility

This section demonstrates practical usage: hashing a password and then verifying it later, which is the core of authentication flows.

```java
public class PasswordDemo {
  public static void main(String[] args) {
    String plainPassword = "S3cureP@ssw0rd!";
    // Hash the password for storage (e.g., in a database)
    String hash = PasswordUtil.hashPassword(plainPassword);
    System.out.println("Hashed password: " + hash);

    // Verify the password supplied by a user during login
    boolean matched = PasswordUtil.checkPassword("S3cureP@ssw0rd!", hash);
    System.out.println("Password matches: " + matched);

    // Verify with an incorrect password
    boolean badMatch = PasswordUtil.checkPassword("WrongPassword", hash);
    System.out.println("Password matches (wrong): " + badMatch);
  }
}
```

### Line-by-line explanation
- Line 1: Define a simple demo class to illustrate usage.
- Line 5: Store a plaintext password to simulate user input.
- Line 7: Call hashPassword to produce a salted hash for storage.
- Line 8: Print the resulting hash (visible here for demonstration; in production, avoid logging hashes).
- Line 11: Use checkPassword to verify the correct password against the stored hash.
- Line 12: Print the verification result.
- Line 15: Use checkPassword to verify an incorrect password against the same hash.
- Line 16: Print the negative verification result.

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

X. Common Beginner Mistakes

- Pitfall A: Storing plaintext passwords
  - Bad:
  ```java
  // Bad: storing plaintext directly
  public void storePassword(String password) {
    database.save("user1", password); // insecure
  }
  ```
  - Good:
  ```java
  // Good: hash before storage
  public void register(String username, String password) {
    String hash = PasswordUtil.hashPassword(password);
    database.save("user1", hash);
  }
  ```
  - Rationale: Never persist plaintext credentials. Always store a hash. Use the library to embed salt and cost in the stored value.

- Pitfall B: Using an unsafe, low cost factor
  - Bad:
  ```java
  // Bad: very small cost factor, fast hashing
  String salt = BCrypt.gensalt(4);
  String hash = BCrypt.hashpw("password123", salt);
  ```
  - Good:
  ```java
  // Good: higher, sane cost factor
  String hash = BCrypt.hashpw("password123", BCrypt.gensalt(12));
  ```
  - Rationale: A low cost factor drastically reduces resistance to brute-force attacks.

- Pitfall C: Manually managing salt outside the hash
  - Bad:
  ```java
  // Bad: generate salt separately and store it
  String salt = BCrypt.gensalt(12);
  String hash = BCrypt.hashpw("pwd", salt);
  database.saveHash(user, hash, salt); // storing salt separately is error-prone
  ```
  - Good:
  ```java
  // Good: rely on bcrypt to embed salt; store only the final hash
  String hash = BCrypt.hashpw("pwd", BCrypt.gensalt(12));
  database.saveHash(user, hash);
  ```
  - Rationale: The salt is embedded in the final hash. Storing an independent salt is unnecessary and error-prone.

- Pitfall D: Not handling null or empty inputs
  - Bad:
  ```java
  // Bad: may throw NullPointerException or validate poorly
  String hash = PasswordUtil.hashPassword(null);
  boolean ok = PasswordUtil.checkPassword(null, hash);
  ```
  - Good:
  ```java
  // Good: guard inputs
  public static boolean safeRegister(String password) {
    if (password == null || password.isEmpty()) return false;
    String hash = PasswordUtil.hashPassword(password);
    // store hash...
    return true;
  }
  ```
  - Rationale: Validate inputs to avoid unsafe states or crashes.

## 5. Why this matters in real systems — production context and real usage

- Security posture: bcrypt strengthens password storage by making each hash unique (salt) and costly to compute (cost factor). This dramatically raises the cost for attackers attempting large-scale credential stuffing or offline cracking.
- Configurability: The cost factor can be tuned as hardware improves. A system can increase the cost factor over time to maintain security without changing application logic.
- Self-contained hashes: bcrypt hashes contain the salt and cost, so verification requires no separate salt management. This reduces the risk of misconfiguration.
- defense-in-depth: Combine bcrypt with other controls:
  - Implement strong password policies (minimum length, complexity).
  - Use rate limiting and account lockouts to deter credential stuffing.
  - Consider integrating multi-factor authentication (MFA) to reduce reliance on passwords.
  - Store pepper in a separate, protected configuration store (not in code or database) to add an extra layer of defense.
- Operational considerations:
  - Logging: avoid logging hashed passwords; log events without sensitive data.
  - Auditing and rotation: periodically review hashing parameters and rotate as needed during maintenance windows.
  - Testing: include unit tests for hashing and verification paths, including edge cases like nulls and empty strings.
- Trade-offs:
  - Higher cost factors protect longer into the future but increase latency for user login; choose an acceptable balance for your latency budgets.

## 6. Study questions — 5 recall questions

1) What provides the salt in a bcrypt hash, and why is it important that the salt be unique per password?
2) How does the cost factor affect the security and performance of password hashing with bcrypt?
3) In bcrypt, is it necessary to store a separate salt alongside the hashed password? Why or why not?
4) What is a common best practice for handling the pepper (if used) in a Java application?
5) Name two concrete production practices you should pair with bcrypt to improve authentication security.

## Exercise — a practical multi-part coding challenge

Part A — Create a reusable password hashing utility
- Task: Implement a Java utility class named PasswordUtil that uses jBCrypt to hash passwords and verify them. Expose two public methods:
  - String hashPassword(String password): hashes with a sensible default cost (e.g., 12).
  - boolean verifyPassword(String candidate, String storedHash): verifies a candidate password against a stored hash.
- Deliverables: PasswordUtil.java with the two methods.

Part B — Simple in-memory user store with register/login
- Task: Create a minimal in-memory user store that maps usernames to hashed passwords. Provide register and login methods:
  - boolean register(String username, String password): hashes the password and stores it; returns false if username exists or password invalid.
  - boolean login(String username, String password): verifies the provided password against the stored hash; returns true if valid.
- Deliverables: UserStore.java with a Map<String, String> backing store and the two methods.
- Notes: Do not persist to disk for this exercise; focus on hashing and verification workflow.

Part C — Demo application
- Task: Create a small DemoApp with a main method that:
  - Registers two users with different passwords.
  - Attempts logins with correct and incorrect passwords.
  - Prints outcomes to demonstrate the flow.
- Deliverables: DemoApp.java with a clear, readable sequence of actions and outputs.
- Bonus: Add basic input validation (non-null, non-empty) and handle duplicate user registration gracefully.

Part D — Extend for production realism (optional)
- Task: Refactor PasswordUtil to allow configuring the cost factor at startup (e.g., via a static setter or environment variable) and ensure the default is used if not set.
- Deliverables: Updated PasswordUtil and a small README note describing how to configure cost factor in production.

Guidance and constraints:
- Use Maven or Gradle to manage dependencies; include jBCrypt in your project configuration.
- Do not rely on any other password hashing mechanisms beyond bcrypt for this exercise.
- Keep the code self-contained and well-commented to illustrate the concepts clearly.
- Focus on correctness and clarity over micro-optimizations.

End of lesson.