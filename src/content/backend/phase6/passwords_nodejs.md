# Password Hashing with bcrypt in Node.js

Password hashing is a fundamental building block of secure authentication. bcrypt provides a robust, battle-tested way to hash passwords with salt and a configurable work factor, making it resistant to rainbow table attacks and brute-force attempts. In real-world backend systems, correctly hashing and verifying passwords is critical to protecting users' credentials and maintaining trust.

## 1. What bcrypt does and how it fits in authentication

Code example: hashing a password with a fixed cost factor using bcrypt.hash, without manually handling salts.

```js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS
  ? Number(process.env.BCRYPT_SALT_ROUNDS)
  : 12;

async function hashPassword(plainPassword) {
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hash;
}
```

### Line-by-line explanation breaking down each line

- Line 1: Load the bcrypt library, which provides hashing, salting, and verification functions.
- Lines 2-6: Read the desired cost factor from an environment variable; default to 12 if not provided. The cost factor controls how many rounds of processing bcrypt performs.
- Line 8-11: Define an asynchronous function hashPassword that takes a plaintext password, hashes it with the given salt rounds, and returns the resulting hash string. bcrypt.hash automatically handles salt generation when you pass a number as the second argument.
- Note: The returned hash includes the salt and the cost factor; you only need to store this hash in your user store.

## 2. Generating explicit salts vs. using salt rounds directly

Code example: generate an explicit salt with genSalt and then hash with that salt. This demonstrates that bcrypt supports both calling patterns.

```js
async function hashWithExplicitSalt(plainPassword) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(plainPassword, salt);
  return { salt, hash };
}
```

### Line-by-line explanation breaking down each line

- Line 1: Define an asynchronous function hashWithExplicitSalt.
- Line 2: Generate a salt string with the desired cost factor using bcrypt.genSalt.
- Line 3: Hash the plaintext password using the explicit salt string obtained above.
- Line 4: Return an object containing both the salt and the resulting hash. The hash includes the salt, but returning the salt can help in debugging or migration scenarios.

## 3. Verifying a password against its hash

Code example: verifying a candidate password against a stored bcrypt hash using bcrypt.compare.

```js
async function verifyPassword(plainPassword, hash) {
  const isMatch = await bcrypt.compare(plainPassword, hash);
  return isMatch;
}
```

### Line-by-line explanation breaking down each line

- Line 1: Define an asynchronous function verifyPassword that takes a plaintext password and a bcrypt hash.
- Line 2: Use bcrypt.compare to check if the plaintext password, when hashed, matches the stored hash. bcrypt.compare handles salt and timing-safe comparison internally.
- Line 3: Return the boolean result indicating whether the password is correct.

## 4. Choosing a cost factor and handling production constraints

Code example: normalize a cost factor from the environment, with sensible bounds to balance security and performance.

```js
function normalizeCost(cost) {
  const c = Number(cost) || 12;
  // bcrypt cost must be between 4 and 31
  return Math.max(4, Math.min(31, c));
}
const COST_FACTOR = normalizeCost(process.env.BCRYPT_SALT_ROUNDS);
```

### Line-by-line explanation breaking down each line

- Line 1-3: Define a helper normalizeCost that converts the input to a number, defaulting to 12 if parsing fails.
- Line 4-5: Clamp the value to bcrypt’s supported range (4 to 31). Values below 4 are insecure and values above 31 can be impractical for servers.
- Line 6: Apply the normalization to the environment-provided BCRYPT_SALT_ROUNDS, storing the result in COST_FACTOR for reuse.
- Note: In real systems, you’d pass COST_FACTOR to hashPassword or hashWithExplicitSalt instead of a hard-coded constant, and you’d validate this at startup.

## 5. A small signup/login flow using bcrypt

Code example: a minimal in-memory user store with signup and login using the hashing/verification helpers above.

```js
const users = new Map();

async function signupUser(username, password) {
  if (users.has(username)) {
    throw new Error('UserAlreadyExists');
  }
  // Use the normalized cost factor to hash the password
  const hash = await bcrypt.hash(password, COST_FACTOR);
  users.set(username, { hash });
  return { username };
}

async function loginUser(username, password) {
  const user = users.get(username);
  if (!user) {
    return false;
  }
  const isValid = await bcrypt.compare(password, user.hash);
  return Boolean(isValid);
}
```

### Line-by-line explanation breaking down each line

- Line 1: Create an in-memory user store as a Map. In real systems, this would be a database.
- Lines 3-9: signupUser checks for existing users; if new, it hashes the password using the configured COST_FACTOR and stores the result alongside the username.
- Line 10: Return a simple object with the username on successful signup.
- Lines 12-21: loginUser retrieves the user by username; if not found, return false. It then compares the provided password against the stored hash using bcrypt.compare and returns true/false accordingly.

Example usage (optional for illustration):

```js
(async () => {
  await signupUser('alice', 's3cur3P@ssw0rd');
  const ok = await loginUser('alice', 's3cur3P@ssw0rd');
  console.log('Login success:', ok); // true
})();
```

### Line-by-line explanation breaking down each line (example usage)

- The IIFE (immediately invoked function expression) runs an example: it signs up a user and then attempts a login with the correct password, printing the result.

Note: In production, you would replace the in-memory store with a database, and you would return proper responses (e.g., HTTP status codes) rather than booleans.

## X. Common Beginner Mistakes

### 1) Storing plain passwords

Bad:
```js
// Do not store plaintext
const users = new Map();
function badSignup(username, password) {
  if (users.has(username)) throw new Error('UserExists');
  users.set(username, { password }); // plaintext!
}
```

Good:
```js
const bcrypt = require('bcrypt');
const COST_FACTOR = 12;
async function goodSignup(username, password) {
  if (users.has(username)) throw new Error('UserExists');
  const hash = await bcrypt.hash(password, COST_FACTOR);
  users.set(username, { hash });
}
```

### 2) Using too-small or misconfigured cost factor

Bad:
```js
// Very low cost factor makes hashing fast but insecure
const hash = await bcrypt.hash('password', 4);
```

Good:
```js
const COST_FACTOR = Math.max(4, Math.min(31, Number(process.env.BCRYPT_SALT_ROUNDS) || 12));
const hash = await bcrypt.hash('password', COST_FACTOR);
```

### 3) Not handling async properly or ignoring errors

Bad:
```js
function badLogin(username, password) {
  // Not awaiting promises; potential unhandled rejections
  const user = users.get(username);
  const ok = bcrypt.compare(password, user?.hash);
  return ok;
}
```

Good:
```js
async function goodLogin(username, password) {
  const user = users.get(username);
  if (!user) return false;
  const ok = await bcrypt.compare(password, user.hash);
  return ok;
}
```

## Y. Why This Matters In Real Systems

- Security guarantees: bcrypt uses a salt and a tunable work factor, making precomputed attacks infeasible and slowing down brute-force attempts as hardware gets faster.
- Salts are stored with the hash: bcrypt encodes the salt and cost factor into the resulting hash string, so you don’t need to manage salts separately.
- Cost factor tuning: A higher cost factor increases CPU time per hash. In production you must balance security with server capacity and user experience (login latency). Start with a conservative value (e.g., 12) and adjust based on load tests.
- Pepper and defense-in-depth: Some teams add a pepper (a secret value in app config) mixed into the password before hashing. This adds another secret layer but requires secure secret management.
- Real workflows: During signup, store only the bcrypt hash. During login, compare the provided password against the stored hash. Do not reveal which part failed (avoid timing differences that could leak information).
- Performance and scaling: Use a proper login rate limiter, monitor hashing latency, and consider migrating to newer algorithms (e.g., Argon2) when appropriate, weighing platform support and operational risk.
- Compliance: Ensure you meet security requirements and data protection regulations for handling credentials, including secure storage of secrets and regular security reviews.

## Z. Study Questions

1) What does the salt factor in bcrypt accomplish, and where is the salt stored?  
2) How do you adjust the computational cost of bcrypt hashing in Node.js? Provide a code example.  
3) What are the main differences between passing a salt rounds number to bcrypt.hash versus generating a salt with bcrypt.genSalt and using bcrypt.hash with the salt?  
4) Why should plaintext passwords never be stored in your user store?  
5) How does bcrypt.compare validate a password, and why is it preferable to re-hashing the input and comparing strings?

## Exercise

Goal: Build a minimal, production-ish Node.js module that demonstrates bcrypt-based authentication with a tiny in-memory user store, plus a small test harness.

Part 1 — Utilities
- Create a file auth.js that exports:
  - hashPassword(plainPassword): Promise<string> - hash a password using a cost factor from env (BCRYPT_SALT_ROUNDS, default 12).
  - verifyPassword(plainPassword, hash): Promise<boolean> - verify a password against a bcrypt hash.
  - signupUser(userStore, username, password): Promise<void> - add a user with a hashed password to a provided store object (not a global singleton; the store should be injected).
  - loginUser(userStore, username, password): Promise<boolean> - verify credentials against the store.

Part 2 — In-memory store and usage
- Create a simple Node.js script app.js that:
  - Creates a plain object to act as a user store (e.g., { alice: { hash: '...' } }).
  - Uses signupUser to create a user.
  - Uses loginUser to attempt login with correct and incorrect passwords.
  - Demonstrates error handling when trying to signup an existing user.
- Provide a small CLI-like demonstration that prints results.

Part 3 — Run locally
- Show commands to install bcrypt, run Node, and run app.js.
- Explain expected output and how to adjust BCRYPT_SALT_ROUNDS.

Starter code (auth.js, app.js) is provided as a scaffold; you should implement the missing pieces per the instructions above. You should not rely on any external databases or frameworks for this exercise.

Starter snippets (place in your project as-is):
```bash
# Initialize a new project (if needed)
mkdir bcrypt-auth-demo
cd bcrypt-auth-demo
npm init -y
npm install bcrypt
```

auth.js
```js
const bcrypt = require('bcrypt');

function normalizeCost(cost) {
  const c = Number(cost) || 12;
  return Math.max(4, Math.min(31, c));
}
const COST_FACTOR = normalizeCost(process.env.BCRYPT_SALT_ROUNDS);

async function hashPassword(plainPassword) {
  // Implement
  // Hint: use bcrypt.hash with COST_FACTOR
}

async function verifyPassword(plainPassword, hash) {
  // Implement
  // Hint: use bcrypt.compare
}

async function signupUser(userStore, username, password) {
  // Implement
  // Hint: check for existing user, hash password, store { hash }
}

async function loginUser(userStore, username, password) {
  // Implement
  // Hint: retrieve user, verify with verifyPassword
}

module.exports = {
  hashPassword,
  verifyPassword,
  signupUser,
  loginUser,
  COST_FACTOR
};
```

app.js
```js
const { signupUser, loginUser, COST_FACTOR, hashPassword, verifyPassword } = require('./auth');

async function main() {
  const store = {};

  try {
    // Sign up user
    await signupUser(store, 'alice', 's3cur3P@ss');
    console.log('Signup succeeded for alice');

    // Attempt login with correct password
    const ok1 = await loginUser(store, 'alice', 's3cur3P@ss');
    console.log('Login with correct password:', ok1);

    // Attempt login with incorrect password
    const ok2 = await loginUser(store, 'alice', 'wrong-password');
    console.log('Login with wrong password:', ok2);

    // Attempt to sign up same user again to show error handling
    await signupUser(store, 'alice', 'another');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
```

Run commands:
- npm install bcrypt
- BCRYPT_SALT_ROUNDS=12 node app.js
- Adjust the environment variable as needed to observe behavior with different cost factors.

What you’ll learn
- How to securely hash and verify passwords with bcrypt.
- How to configure and tune the cost factor for production workloads.
- How to structure a simple, testable authentication flow without relying on a database.