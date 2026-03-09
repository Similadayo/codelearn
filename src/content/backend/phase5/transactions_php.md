# Track: Backend Engineering — Phase 5: Databases — Transactions, ACID, and Concurrency (PHP)

Transactions, ACID, and concurrency are foundational for building robust, reliable backends. In PHP-backed services, you often need to update multiple rows or tables atomically, enforce data integrity under concurrent requests, and recover gracefully from errors. Mastery of transactions, proper isolation levels, and locking strategies lets you prevent partial updates, race conditions, and deadlocks—critical for financial apps, order processing, inventory management, and any system with shared mutable state.

## 1. Transactions: Basics with PHP and PDO

A transaction is a sequence of operations that are treated as a single unit of work. Either all of them succeed, or none do. In PHP, using PDO, you wrap related data-modifying statements in beginTransaction, commit, and rollback.

```php
<?php
// Placeholder DSN; replace with real credentials
$dsn = 'mysql:host=db.example.com;dbname=shop';
$user = 'dbuser';
$pass = 'secret';

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

try {
    // Start a new transaction
    $pdo->beginTransaction();

    // Debit from account 1
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - :amt WHERE id = :id");
    $stmt->execute([':amt' => 50, ':id' => 1]);

    // Credit to account 2
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + :amt WHERE id = :id");
    $stmt->execute([':amt' => 50, ':id' => 2]);

    // Commit the transaction
    $pdo->commit();
} catch (Exception $e) {
    // If any operation failed, roll back all changes
    $pdo->rollBack();
    // Re-throw or log the error
    throw $e;
}
```

### ### Line-by-line explanation breaking down each line
- Line 1-4: PHP file header and DSN placeholder for the MySQL database; replace with real values.
- Line 6-10: Create a PDO instance with error reporting set to throw exceptions on errors.
- Line 12: Begin a try block to manage the transactional flow.
- Line 14: Start a new transaction with beginTransaction.
- Line 17-19: Prepare and execute an UPDATE to debit the source account.
- Line 21-23: Prepare and execute an UPDATE to credit the destination account.
- Line 25: Commit the transaction, making both updates durable.
- Line 26-31: If any exception occurs during the try block, catch it, roll back the transaction to leave the database unchanged, and re-throw the error for higher-level handling.

## 2. ACID and Isolation: Ensuring Atomicity, Consistency, and Isolation

ACID guarantees that transactions are atomic, consistent, isolated, and durable. Atomicity means either all updates happen, or none do. Isolation levels control how visible concurrent transactions are to each other. In PHP with PDO and MySQL, you can explicitly set the isolation level within a transaction and perform multiple interdependent updates safely.

```php
<?php
$dsn = 'mysql:host=db.example.com;dbname=shop';
$user = 'dbuser';
$pass = 'secret';

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$pdo->beginTransaction();
try {
    // Set a strict isolation level for this transaction
    $pdo->exec("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

    // Debit amount from account 1
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - :amt WHERE id = :id");
    $stmt->execute([':amt' => 100, ':id' => 1]);

    // Credit amount to account 2
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + :amt WHERE id = :id");
    $stmt->execute([':amt' => 100, ':id' => 2]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

### ### Line-by-line explanation breaking down each line
- Line 1-4: PHP file header and DSN placeholder; replace with real credentials.
- Line 6-10: Create a PDO instance with error mode set to exceptions for robust error handling.
- Line 12: Start a transaction boundary with beginTransaction.
- Line 14: Set the transaction isolation level to SERIALIZABLE to maximize isolation and prevent phantom reads.
- Line 17-19: Debit operation on account 1.
- Line 21-23: Credit operation on account 2.
- Line 25: Commit the transaction to persist both changes atomically.
- Line 26-31: If any exception occurs, roll back to leave the database state unchanged, then re-throw for further handling.

Notes:
- SERIALIZABLE is the strongest isolation level. In high-concurrency systems, it can reduce phantom reads but may impact throughput. Test with representative workloads and consider READ COMMITTED with careful locking for performance-sensitive paths.

## 3. Concurrency and Locks: Pessimistic Locking with FOR UPDATE

Concurrency issues arise when multiple workers attempt to update the same data. Pessimistic locking uses row-level locks to serialize access, typically with SELECT ... FOR UPDATE inside a transaction. This prevents other transactions from updating the locked rows until the first transaction completes.

```php
<?php
$dsn = 'mysql:host=db.example.com;dbname=shop';
$user = 'dbuser';
$pass = 'secret';

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$fromId = 1;
$toId = 2;
$amount = 50;

try {
    $pdo->beginTransaction();

    // Lock the source account row for update
    $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
    $stmt->execute([$fromId]);
    $rowFrom = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rowFrom || $rowFrom['balance'] < $amount) {
        throw new Exception("Insufficient funds");
    }

    // Lock the destination account row for update (order is important to avoid deadlocks)
    $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
    $stmt->execute([$toId]);
    $rowTo = $stmt->fetch(PDO::FETCH_ASSOC);

    // Perform the transfer
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - :amt WHERE id = :id");
    $stmt->execute([':amt' => $amount, ':id' => $fromId]);

    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + :amt WHERE id = :id");
    $stmt->execute([':amt' => $amount, ':id' => $toId]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

### ### Line-by-line explanation breaking down each line
- Lines 1-4: PHP file header and DSN placeholder.
- Lines 6-10: Create a PDO instance with exception-based error handling.
- Lines 12-13: Start a transaction for the transfer sequence.
- Lines 16-21: Lock the source account row for update with FOR UPDATE, fetch balance, and validate sufficient funds.
- Lines 24-29: Lock the destination account row for update with FOR UPDATE to ensure a consistent view before updating.
- Lines 32-38: Debit the source account and credit the destination account, each via UPDATE statements.
- Line 40: Commit the transaction, making all changes durable and visible atomically.
- Lines 41-46: On error, roll back the transaction to revert any partial changes and re-throw the exception.

Deadlock avoidance note:
- If multiple accounts might be updated in different orders across transactions, enforce a fixed locking order (for example, always lock the account with the smaller id first). Example variant:
```
$firstLock = min($fromId, $toId);
$secondLock = max($fromId, $toId);

$stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
$stmt->execute([$firstLock]);
$stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
$stmt->execute([$secondLock]);
```

## 4. Savepoints and Partial Rollbacks

Savepoints let you create intermediate points within a transaction so you can roll back only a portion of work without aborting the entire transaction. This is useful for multi-step operations where a later step might fail and you want to recover gracefully.

```php
<?php
$dsn = 'mysql:host=db.example.com;dbname=shop';
$user = 'dbuser';
$pass = 'secret';

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

try {
    $pdo->beginTransaction();

    // Create a savepoint before Step A
    $pdo->exec("SAVEPOINT sp1");

    // Step A: debit from account 1
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - :amt WHERE id = :id");
    $stmt->execute([':amt' => 60, ':id' => 1]);

    // Step B: credit to account 2
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + :amt WHERE id = :id");
    $stmt->execute([':amt' => 60, ':id' => 2]);

    // If Step B fails, we can roll back to sp1 and retry Step B, or apply compensating logic
    $pdo->commit();
} catch (Exception $e) {
    // Roll back only to the savepoint to retry subsequent steps
    $pdo->exec("ROLLBACK TO SAVEPOINT sp1");
    // Optionally perform compensation or retry logic here
    throw $e;
}
```

### ### Line-by-line explanation breaking down each line
- Lines 1-4: PHP header and DSN. 
- Lines 6-10: Create a PDO instance with exception-driven errors.
- Line 12: Begin a transaction.
- Line 15: Create a savepoint named sp1 to mark a recoverable point.
- Lines 18-22: Step A — debit from account 1.
- Lines 25-29: Step B — credit to account 2.
- Line 31: Commit the transaction if all steps succeed.
- Lines 32-37: If any step fails, roll back to the savepoint sp1, enabling a retry or alternate handling, and rethrow the exception.

Notes:
- Savepoints are powerful but database-backed; ensure your DB supports SAVEPOINT (MySQL, PostgreSQL, etc.). They enable partial rollbacks within a larger transaction without discarding all progress.

## 5. Error Handling, Retries, and Idempotency in Transactions

Real systems encounter transient failures (deadlocks, lock timeouts, temporary DB hiccups). Implementing retries with backoff and idempotent operations reduces user-visible errors and keeps data consistent.

```php
<?php
$dsn = 'mysql:host=db.example.com;dbname=shop';
$user = 'dbuser';
$pass = 'secret';

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$fromId = 1;
$toId = 2;
$amount = 50;
$maxRetries = 3;
$attempt = 0;

while (true) {
    try {
        $pdo->beginTransaction();

        // Lock rows to serialize access
        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
        $stmt->execute([$fromId]);
        $rowFrom = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rowFrom || $rowFrom['balance'] < $amount) {
            throw new Exception("Insufficient funds");
        }

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
        $stmt->execute([$toId]);
        $rowTo = $stmt->fetch(PDO::FETCH_ASSOC);

        // Perform transfer
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - :amt WHERE id = :id");
        $stmt->execute([':amt' => $amount, ':id' => $fromId]);

        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + :amt WHERE id = :id");
        $stmt->execute([':amt' => $amount, ':id' => $toId]);

        $pdo->commit();
        break; // success, exit loop
    } catch (PDOException $e) {
        $pdo->rollBack();

        // Retry on transient errors (e.g., deadlock, lock wait timeout)
        $code = $e->getCode();
        $oneOfTransient = in_array($code, ['40001', 'HYT00', '55P03']); // example PostgreSQL/MySQL codes
        if ($oneOfTransient && $attempt < $maxRetries) {
            $attempt++;
            // Exponential backoff before retry
            usleep((1 << $attempt) * 100000);
            continue;
        }
        // Non-transient error or retries exhausted
        throw $e;
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}
```

### ### Line-by-line explanation breaking down each line
- Lines 1-4: PHP header and DSN placeholder.
- Lines 6-10: PDO setup with exception-based error handling.
- Lines 12-14: Initialize transfer parameters and a retry counter.
- Line 16: Enter an infinite loop to attempt the transactional work with retrials.
- Lines 18-22: Begin transaction and lock the source account row.
- Lines 24-29: Check funds and lock destination row.
- Lines 32-41: Perform debit and credit updates inside the transaction.
- Line 43: Commit on success and exit the loop.
- Lines 44-53: Catch PDOException, roll back, and decide if a retry is warranted. If transient and retries remain, perform backoff and retry; otherwise rethrow.
- Lines 54-58: Catch any other exceptions, roll back, and rethrow.

Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

## X. Common Beginner Mistakes

### Pitfall 1: Not using a transaction for related writes

- Bad:
```php
<?php
// Debit from A
$pdo->exec("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
// Credit to B
$pdo->exec("UPDATE accounts SET balance = balance + 30 WHERE id = 2");
```

- Good:
```php
<?php
$pdo->beginTransaction();
try {
    $pdo->exec("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 30 WHERE id = 2");
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

### Pitfall 2: Ignoring exceptions and not rolling back on error

- Bad:
```php
<?php
$pdo->beginTransaction();
$pdo->exec("UPDATE accounts SET balance = balance - 25 WHERE id = 1");
// Suppose second update fails
$pdo->exec("UPDATE accounts SET balance = balance + 25 WHERE id = 2");
// No commit or rollback on error path
$pdo->commit();
```

- Good:
```php
<?php
$pdo->beginTransaction();
try {
    $pdo->exec("UPDATE accounts SET balance = balance - 25 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 25 WHERE id = 2");
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

### Pitfall 3: Not locking rows in concurrent updates (lost updates)

- Bad:
```php
<?php
$pdo->beginTransaction();
$amt = 50;
$pdo->exec("UPDATE accounts SET balance = balance - $amt WHERE id = 1");
$pdo->exec("UPDATE accounts SET balance = balance + $amt WHERE id = 2");
$pdo->commit();
```

- Good (pessimistic locking with FOR UPDATE):
```php
<?php
$pdo->beginTransaction();
$locks = [1, 2];
foreach ($locks as $id) {
    $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    // optionally read and validate balances here
}
$amt = 50;
$pdo->exec("UPDATE accounts SET balance = balance - $amt WHERE id = 1");
$pdo->exec("UPDATE accounts SET balance = balance + $amt WHERE id = 2");
$pdo->commit();
```

### Pitfall 4: Deadlocks due to inconsistent locking order

- Bad:
```php
// Path A
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
SELECT balance FROM accounts WHERE id = 2 FOR UPDATE;
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
UPDATE accounts SET balance = balance + 50 WHERE id = 2;
COMMIT;

// Path B (order flipped in another process)
BEGIN;
SELECT balance FROM accounts WHERE id = 2 FOR UPDATE;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
...
```

- Good (consistent locking order, e.g., always lock smaller id first):
```php
<?php
$from = 1;
$to = 2;
$first = min($from, $to);
$second = max($from, $to);

$pdo->beginTransaction();
$pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE")->execute([$first]);
$pdo->prepare("SELECT balance FROM accounts WHERE id = ? FOR UPDATE")->execute([$second]);

// perform transfer in a consistent order
$pdo->commit();
```

## Y. Why This Matters In Real Systems

- Data integrity: Transactions prevent partial writes that can corrupt business logic (e.g., transferring funds partially completed).
- Consistency and auditing: ACID properties ensure a clean, auditable state even after crashes.
- Concurrency control: Proper locking strategies prevent race conditions and lost updates, which are common in high-traffic backends (e.g., e-commerce carts, inventory, payments).
- Reliability at scale: Isolation levels and savepoints enable balancing correctness with performance under load.
- Error handling and resilience: Retries and idempotent patterns reduce user-visible failures and enable robust microservice orchestration.

In real systems, you typically combine:
- Transactions for atomic multi-step operations.
- Appropriate isolation (SERIALIZABLE for critical paths; READ COMMITTED with careful locking for throughput).
- Explicit row locking (FOR UPDATE) to serialize access where necessary.
- Savepoints for partial rollback while preserving progress.
- Idempotent or compensating actions for retries in distributed setups.

## Z. Study Questions

1. What does ACID stand for, and why is each property important in a backend service?
2. How does SELECT ... FOR UPDATE help with concurrency control in PHP-PDO/MySQL?
3. When would you choose SERIALIZABLE isolation over READ COMMITTED, and what trade-offs occur?
4. How do savepoints differ from full transaction rollbacks, and when would you use them?
5. Describe a simple retry strategy for transient database errors and how you would avoid infinite loops.

## Exercise

Goal: Implement a robust PHP function to transfer funds between two accounts with proper transaction handling, locking, and idempotency, then demonstrate a small demonstration of safe retries.

Part A: Setup and function skeleton
- Create or assume a MySQL table accounts(id INT PRIMARY KEY, balance DECIMAL(10,2)).
- Create a transfers table to support idempotency:
  - transfers(id BIGINT AUTO_INCREMENT PRIMARY KEY,
              transfer_id VARCHAR(255) UNIQUE,
              from_id INT, to_id INT, amount DECIMAL(10,2),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- Implement a PHP function transferFunds($pdo, $transferId, $fromId, $toId, $amount) that:
  - Uses a transaction.
  - Locks the involved account rows with FOR UPDATE in a consistent order.
  - Checks availability of funds.
  - Inserts a record into transfers to guarantee idempotency (if a transferId already exists, skip the operation and return an "already processed" message).
  - Commits on success; rolls back on failure.
  - Returns a status message (e.g., "ok", "already_processed", "insufficient_funds").

Part B: Demonstrate a retry path for transient errors
- Extend transferFunds to retry up to 3 times on transient PDOException codes (e.g., deadlocks or lock timeouts). Use exponential backoff.
- Ensure idempotent behavior across retries (by relying on the transfers table and the unique transfer_id).

Part C: Simple usage example
- Write a small script that calls transferFunds with a sample transfer_id and two accounts, showing:
  - First transfer succeeds.
  - Re-running with the same transfer_id returns "already_processed" without changing balances.
  - A separate transfer with insufficient funds fails gracefully.

Suggested code blocks should be cohesive and runnable with a real database (rename DSN and credentials as needed). You can provide placeholder DSN and user/password; focus on correctness of transaction flow, locking, idempotency, and retries.