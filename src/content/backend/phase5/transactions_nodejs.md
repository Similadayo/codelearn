# Phase 5 — Databases: Transactions, ACID, and Concurrency (JavaScript / Node.js)

Transactions, ACID properties, and concurrency control are foundational to building reliable backend services. In Node.js, where I/O is asynchronous and multiple parts of your system may try to modify the same data at once, understanding how to structure atomic updates, manage isolation levels, and choose locking strategies is essential. This lesson walks through concepts, practical Node.js/PostgreSQL patterns, and real-world pitfalls to help you design robust data operations.

## 1. Foundations: Transactions, ACID, and Concurrency

A database transaction is a sequence of operations that should either complete entirely or have no effect at all. ACID describes four guarantees:
- Atomicity: all-or-nothing execution
- Consistency: database moves from one valid state to another
- Isolation: concurrent transactions do not interfere in ways that violate integrity
- Durability: once committed, changes persist even after crashes

Concurrency arises when multiple clients attempt to update the same data simultaneously. Without proper transactions and locking, you can encounter:
- Dirty reads: seeing uncommitted changes
- Non-repeatable reads: data changing between reads within a transaction
- Lost updates: two processes overwriting each other’s changes

Example (conceptual SQL transaction):
```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

### Line-by-line explanation
- BEGIN: Start a new transaction boundary.
- UPDATE accounts ...: Perform the first operation atomically as part of the same transaction.
- UPDATE accounts ...: Perform the second operation atomically as part of the same transaction.
- COMMIT: Persist all changes if no errors occurred; if an error happens, a ROLLBACK should be issued to revert all changes in this transaction.

## 2. Node.js + PostgreSQL: Basic Transaction Pattern

In Node.js, the recommended pattern is to use a connection pool, acquire a client for a transaction, and ensure proper rollback and release.

Code example (Node.js with node-postgres):
```javascript
// db.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

/**
 * Transfer funds from one account to another using a transaction.
 * Uses SELECT ... FOR UPDATE to lock rows involved in the transfer.
 */
async function transferFunds(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the source row to prevent concurrent modifications
    const resFrom = await client.query('SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', [fromId]);
    const balanceFrom = resFrom.rows[0].balance;
    if (balanceFrom < amount) {
      throw new Error('Insufficient funds');
    }
    // Apply debit and credit
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { transferFunds };
```

### Line-by-line explanation
- Line 1-4: Import the PostgreSQL pool and initialize it with a connection string from environment variables.
- Line 9: Define an async function transferFunds to perform a money transfer safely.
- Line 10: Acquire a client from the pool for a dedicated transaction.
- Line 12: Begin a new transaction scope.
- Line 14: Lock the source account row to avoid concurrent debits; FOR UPDATE prevents other transactions from modifying this row until commit/rollback.
- Line 15-18: Read the source balance and check if there are sufficient funds; throw if not.
- Line 20-21: Debit the source account and credit the destination account within the same transaction.
- Line 22: Commit the transaction to persist changes atomically.
- Line 23-26: If any error occurs, roll back to undo all changes in this transaction.
- Line 27-29: Ensure the database client is released back to the pool regardless of outcome.

## 3. Isolation Levels and Concurrency Control

Isolation level dictates how transaction visibility and anomalies are handled. PostgreSQL supports several levels; the most common are READ COMMITTED, REPEATABLE READ, and SERIALIZABLE. You can set the isolation level per-transaction.

Code example: SERIALIZABLE transaction with row locking
```javascript
async function transferSerializable(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    // SERIALIZABLE provides the strictest isolation to prevent anomalies
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    // Lock the relevant rows to prevent concurrent conflicting updates
    const resFrom = await client.query('SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', [fromId]);
    const balanceFrom = resFrom.rows[0].balance;
    if (balanceFrom < amount) throw new Error('Insufficient funds');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### Line-by-line explanation
- Line 4: Begin a transaction with isolation level SERIALIZABLE, ensuring the strongest guarantees.
- Line 6: Acquire a FOR UPDATE lock on the source account row, preventing other transactions from modifying it concurrently.
- Line 7-9: Read balance and validate sufficient funds.
- Line 10-11: Debit and credit steps, performed within the serializable transaction boundary.
- Line 12: Commit the transaction to make changes durable.
- Line 13-16: Rollback on error and rethrow to propagate failure.
- Line 17-18: Release the client back to the pool.

Notes:
- SERIALIZABLE can reduce throughput due to stricter locking and potential serialization failures; be prepared to handle serialization errors (SQLSTATE 40001) with retries.
- Using FOR UPDATE within a serializable transaction can help avoid phantom reads, but you may still encounter serialization anomalies in edge cases; design your logic to be idempotent and robust to retries.

## 4. Locking Strategies: Pessimistic vs Optimistic Concurrency

Two broad families of strategies exist:

- Pessimistic locking: Acquire locks up front (often via FOR UPDATE) to prevent conflicting updates.
- Optimistic locking: Do not lock rows; detect conflicts at commit time using a version or timestamp column.

Pessimistic locking example (FOR UPDATE):
```javascript
async function transferWithPessimisticLock(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock both rows to ensure no other transaction modifies them during the operation
    const rFrom = await client.query('SELECT balance, version FROM accounts WHERE id = $1 FOR UPDATE', [fromId]);
    const rTo = await client.query('SELECT balance, version FROM accounts WHERE id = $1 FOR UPDATE', [toId]);

    const balanceFrom = rFrom.rows[0].balance;
    if (balanceFrom < amount) throw new Error('Insufficient funds');

    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

Optimistic concurrency control example (version column):
```javascript
async function transferOptimistic(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Read current state and version
    const resFrom = await client.query('SELECT balance, version FROM accounts WHERE id = $1', [fromId]);
    const balanceFrom = resFrom.rows[0].balance;
    const versionFrom = resFrom.rows[0].version;
    if (balanceFrom < amount) throw new Error('Insufficient funds');

    // Attempt update with optimistic check on version
    const resDebit = await client.query(
      'UPDATE accounts SET balance = balance - $1, version = version + 1 WHERE id = $2 AND version = $3',
      [amount, fromId, versionFrom]
    );
    if (resDebit.rowCount === 0) {
      throw new Error('Concurrency conflict on debit');
    }

    const resCredit = await client.query(
      'UPDATE accounts SET balance = balance + $1, version = version + 1 WHERE id = $2',
      [amount, toId]
    );
    // Note: You could also apply a version check to the credit update if you want strict parity
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### Line-by-line explanation
- Optimistic variant:
  - Line 4-6: Begin a transaction without acquiring locks upfront.
  - Line 8-11: Read balance and version of the debit account.
  - Line 12-13: Validate funds.
  - Line 16-21: Update debit with an incremental version, which will fail if another transaction modified the row first (version mismatch).
  - Line 23-24: Update credit account to reflect the transfer; versioning can also be applied here if desired.
  - Line 25: Commit on success.
  - Line 26-31: Roll back on error; propagate the error.
  - Line 32-33: Release the client.

Important note:
- Optimistic locking is generally more scalable in low-contention scenarios; it detects conflicts at commit time and requires a retry loop if a conflict occurs.

## 5. Failure Handling, Recovery, and Idempotency

Real systems must gracefully handle transient failures, such as serialization conflicts or deadlocks, and avoid duplicating side effects on retries. Key patterns:

- Retry on serialization failures (SQLSTATE 40001) with backoff.
- Use savepoints for partial rollbacks within long sequences of operations.
- Make external effects idempotent (e.g., deduplicate retries for payments) to avoid double-charging.
- Log and monitor long-running transactions; set appropriate timeouts.

Code example: retry on serialization failure
```javascript
async function resilientTransfer(fromId, toId, amount, maxRetries = 3) {
  const backoffBase = 100;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Reuse a chosen strategy; here, we do a safe debit/credit with optimistic checks
      const resFrom = await client.query('SELECT balance, version FROM accounts WHERE id = $1', [fromId]);
      const balanceFrom = resFrom.rows[0].balance;
      const versionFrom = resFrom.rows[0].version;
      if (balanceFrom < amount) throw new Error('Insufficient funds');

      const resDebit = await client.query(
        'UPDATE accounts SET balance = balance - $1, version = version + 1 WHERE id = $2 AND version = $3',
        [amount, fromId, versionFrom]
      );
      if (resDebit.rowCount === 0) throw new Error('Serialization conflict during debit');

      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
      await client.query('COMMIT');
      return;
    } catch (err) {
      await client.query('ROLLBACK');
      // Handle serialization failures with a retry
      if (err.code === '40001') {
        // serialization_failure
        if (attempt === maxRetries) throw err;
        // backoff before retry
        await new Promise(res => setTimeout(res, Math.min(backoffBase * attempt, 1000)));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
```

### Line-by-line explanation
- Line 5-7: Loop for a bounded number of retries; each attempt opens a fresh transaction.
- Line 9: Begin a new transaction.
- Line 11-14: Read balance and version to prepare for an optimistic update.
- Line 16-18: Validate funds before attempting updates.
- Line 20-24: Attempt an optimistic debit update that will fail if the version changed in the meantime.
- Line 25-26: Credit the destination account (could also participate in the versioning policy).
- Line 27: Commit on success.
- Line 28-34: Roll back on error; if the error is a serialization failure (SQLSTATE 40001), retry with backoff; otherwise rethrow.
- Line 35-37: Release the client.

X. Common Beginner Mistakes

- Bad vs Good: Not using transactions for multi-step operations
  - Bad:
    ```js
    // Two separate statements without transaction
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    ```
  - Good:
    ```js
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
    ```
- Bad vs Good: Not rolling back on error
  - Bad:
    ```js
    try {
      await client.query('BEGIN');
      // operations
      await client.query('COMMIT');
    } catch (e) {
      // no rollback
      throw e;
    } finally {
      client.release();
    }
    ```
  - Good:
    ```js
    try {
      await client.query('BEGIN');
      // operations
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    ```
- Bad vs Good: Holding a transaction for too long
  - Bad:
    ```js
    await client.query('BEGIN');
    // long-running non-essential reads
    const data = await heavyComputation();
    await client.query('COMMIT');
    ```
  - Good:
    ```js
    // Do heavy reads outside the transaction when possible
    await client.query('BEGIN');
    // essential updates
    await client.query('COMMIT');
    // perform long-running work afterwards
    ```
- Bad vs Good: Ignoring isolation level implications
  - Bad:
    ```js
    await client.query('BEGIN');
    // no explicit isolation level
    ```
  - Good:
    ```js
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    ```

Y. Why This Matters In Real Systems

- Data integrity under contention: Banking, payments, inventory, and order processing rely on precise atomicity. A mismanaged transaction can lead to money disappearing, over- or under- stocking, or duplicate orders.
- Performance and throughput trade-offs: Higher isolation levels (like SERIALIZABLE) reduce concurrency. In high-throughput systems, optimistic locking and carefully chosen levels help maintain performance while preserving correctness.
- Failure modes and observability: Deadlocks and serialization failures are normal tolerances in distributed systems. Building retry logic, recording metrics (latency, retry counts, aborts), and alerting on anomalies help operators respond quickly.
- Idempotency and retries: Network retries and retryable transactions mean your operations must be idempotent to avoid duplicate effects. This is particularly important for payment and inventory updates.
- Real-world patterns: In microservices, you often avoid distributed transactions across services. Instead, rely on strong per-database transactions, compensating actions, message queues with exactly-once processing, and idempotent APIs.

Z. Study Questions

1) What are the four ACID properties and why does each matter for backend services?  
2) How does FOR UPDATE help with concurrency control in PostgreSQL when transferring funds between accounts?  
3) What is the difference between READ COMMITTED, REPEATABLE READ, and SERIALIZABLE isolation levels? When might you choose SERIALIZABLE?  
4) Describe optimistic concurrency control and how a version column enables it in PostgreSQL.  
5) What is a common pattern to handle serialization failures in a retry loop, and what should you consider when implementing it?

Exercise

Part A — Set up a simple accounts schema (SQL)
- Create a PostgreSQL table accounts with:
  - id SERIAL PRIMARY KEY
  - balance NUMERIC(12,2) NOT NULL DEFAULT 0
  - version INTEGER NOT NULL DEFAULT 0

SQL:
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0
);
```

Part B — Implement a basic transactional transfer (Node.js)
- Implement a module that exports transferFunds(fromId, toId, amount) using a transaction with FOR UPDATE to lock involved rows.

Code (Node.js):
```javascript
// transferBasic.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

async function transferFunds(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resFrom = await client.query('SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', [fromId]);
    const balanceFrom = resFrom.rows[0].balance;
    if (balanceFrom < amount) throw new Error('Insufficient funds');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { transferFunds };
```

Part C — Add serialization safety with SERIALIZABLE (optional)
- Refactor to use BEGIN ISOLATION LEVEL SERIALIZABLE and discuss potential retries for serialization failures.

Code (Node.js):
```javascript
// transferSerializable.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

async function transferFundsSerial(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const resFrom = await client.query('SELECT balance FROM accounts WHERE id = $1', [fromId]);
    const balanceFrom = resFrom.rows[0].balance;
    if (balanceFrom < amount) throw new Error('Insufficient funds');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { transferFundsSerial };
```

Part D — Add a simple retry mechanism for known transient failures
- Implement a small wrapper to retry on serialization failures (SQLSTATE 40001).

Code (Node.js):
```javascript
// transferWithRetry.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

async function transferWithRetry(fromId, toId, amount, maxRetries = 3) {
  const backoffBase = 100;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const resFrom = await client.query('SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', [fromId]);
      const balanceFrom = resFrom.rows[0].balance;
      if (balanceFrom < amount) throw new Error('Insufficient funds');
      await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
      await client.query('COMMIT');
      client.release();
      return;
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      if (err.code === '40001' && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.min(backoffBase * attempt, 1000)));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { transferWithRetry };
```

Notes for the exercise:
- Run a PostgreSQL instance with a database and ensure the accounts table exists.
- Install the pg package in Node.js: npm install pg
- Create a simple test script to spawn multiple concurrent transfers to observe isolation behavior under SERIALIZABLE and optimistic locking strategies.
- Observe that under contention, SERIALIZABLE may cause retries, while FOR UPDATE locks prevent dirty reads and lost updates.

This lesson provides a practical path from fundamental concepts through concrete Node.js PostgreSQL patterns, emphasizing how to think about correctness, performance, and real-world failure modes in production systems.