# Phase 5 — Databases: Transactions, ACID, and Concurrency (Java)

Compelling introductory paragraph: In backend systems, correctness under concurrent workloads hinges on robust transaction handling, adherence to ACID properties, and disciplined concurrency control. Transactions ensure a set of database operations either all succeed or all fail, preserving data integrity across faults, restarts, and concurrent users. ACID (Atomicity, Consistency, Isolation, Durability) defines the guarantees we rely on, while concurrency strategies (pessimistic vs optimistic locking, isolation levels, savepoints) let us scale IO-bound operations without sacrificing correctness. This lesson teaches you how to design and implement reliable transactional code in Java using JDBC, covering the concepts, practical patterns, and common pitfalls you’ll encounter in real systems.

## 1. Transactions and ACID fundamentals

In this section, you’ll learn how to wrap multiple database operations in a single atomic transaction, so either all updates succeed or none apply. This is essential for multi-step business processes like money transfers, order creation, or inventory adjustments.

```java
import javax.sql.DataSource;
import java.sql.*;

public class TransactionExample {
    private DataSource ds;

    public TransactionExample(DataSource ds) {
        this.ds = ds;
    }

    // Transfer amount from one account to another using a single transaction
    public void transfer(int fromAccountId, int toAccountId, double amount) throws SQLException {
        try (Connection conn = ds.getConnection()) {
            // Begin a transaction
            conn.setAutoCommit(false);

            // Debit from the source account
            try (PreparedStatement debit = conn.prepareStatement(
                    "UPDATE accounts SET balance = balance - ? WHERE id = ?")) {
                debit.setDouble(1, amount);
                debit.setInt(2, fromAccountId);
                int affected = debit.executeUpdate();
                if (affected != 1) {
                    conn.rollback();
                    throw new SQLException("Debit failed or account not found");
                }
            }

            // Credit to the destination account
            try (PreparedStatement credit = conn.prepareStatement(
                    "UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
                credit.setDouble(1, amount);
                credit.setInt(2, toAccountId);
                int affected = credit.executeUpdate();
                if (affected != 1) {
                    conn.rollback();
                    throw new SQLException("Credit failed or account not found");
                }
            }

            // Commit the transaction atomically
            conn.commit();
        } catch (SQLException e) {
            // Ensure rollback on error
            // (Connection is closed automatically by try-with-resources)
            throw e;
        }
    }
}
```

### Line-by-line explanation breaking down each line

- Line 1-2: Import necessary JDBC classes and DataSource type for connection management.
- Line 4-7: Define a class that holds a DataSource to obtain connections to the database.
- Line 9-12: Constructor stores the provided DataSource for later use.
- Line 15: Public method transfer encapsulates the atomic operation of moving funds between accounts.
- Line 16: Obtain a connection from the pool inside a try-with-resources to ensure cleanup.
- Line 18: Disable auto-commit to begin a transactional block.
- Lines 21-26: Prepare and execute the debit statement to subtract the amount from the source account.
- Line 25: Check that exactly one row was updated; otherwise rollback and throw an exception.
- Lines 29-34: Prepare and execute the credit statement to add the amount to the destination account.
- Line 33: Validate that exactly one row updated; otherwise rollback and throw an exception.
- Line 37: Commit the transaction if both statements succeeded.
- Lines 41-45: Catch SQL exceptions and allow the try-with-resources to close the connection; rethrow to signal failure.
  
Notes:
- The transaction ensures atomicity: either both debit and credit succeed, or neither takes effect.
- In a real system, you’d also handle serialization anomalies and consider stricter isolation levels when needed.

## 2. Isolation levels and concurrency

Isolation level controls how visible changes from one transaction are to others. Different levels trade off performance for consistency. This example demonstrates how to configure isolation levels and the impact on reads in concurrent scenarios.

```java
import javax.sql.DataSource;
import java.sql.*;

public class IsolationDemo {
    private DataSource ds;

    public IsolationDemo(DataSource ds) {
        this.ds = ds;
    }

    // Demonstrates repeatable read vs read committed effects
    public void demonstrateRepeatableRead(int accountId) throws SQLException {
        // Connection 1 starts a transaction with REPEATABLE_READ
        try (Connection c1 = ds.getConnection();
             Connection c2 = ds.getConnection()) {

            c1.setAutoCommit(false);
            c2.setAutoCommit(false);

            c1.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            c2.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

            // Read balance in transaction 1
            try (PreparedStatement read1 = c1.prepareStatement("SELECT balance FROM accounts WHERE id = ?")) {
                read1.setInt(1, accountId);
                try (ResultSet rs1 = read1.executeQuery()) {
                    rs1.next();
                    int before = rs1.getInt("balance");
                    System.out.println("Before update (c1): " + before);
                }
            }

            // In another, separate transaction, perform a modification
            try (PreparedStatement update2 = c2.prepareStatement(
                    "UPDATE accounts SET balance = balance + 100 WHERE id = ?")) {
                update2.setInt(1, accountId);
                update2.executeUpdate();
            }
            // Commit the second transaction so the change becomes visible to other transactions
            c2.commit();

            // Now read again in the first transaction
            try (PreparedStatement read1b = c1.prepareStatement("SELECT balance FROM accounts WHERE id = ?")) {
                read1b.setInt(1, accountId);
                try (ResultSet rs1b = read1b.executeQuery()) {
                    rs1b.next();
                    int after = rs1b.getInt("balance");
                    System.out.println("After update (c1): " + after);
                }
            }

            // Commit the first transaction
            c1.commit();
        }
    }
}
```

### Line-by-line explanation breaking down each line

- Line 1-2: Import DataSource and JDBC classes.
- Line 4-7: Class stores a DataSource for obtaining connections.
- Line 9-12: Constructor to receive and store the DataSource.
- Line 15: Method demonstrates isolation effects between two concurrent connections.
- Line 18: Open two connections, c1 and c2, in the same try-with-resources block.
- Line 20: Disable auto-commit and set independent isolation levels:
  - c1 uses TRANSACTION_REPEATABLE_READ.
  - c2 uses TRANSACTION_READ_COMMITTED.
- Lines 23-30: c1 reads the balance for accountId before any changes.
- Lines 33-37: c2 updates the balance by adding 100 and commits, making the change visible.
- Lines 40-45: c1 reads the balance again within its transaction to observe the effect of isolation level.
- Lines 48-50: Commit the first transaction after the second read.

Notes:
- With REPEATABLE_READ, the first read value is intended to remain stable within c1, even after c2 commits. With READ_COMMITTED, c1 could observe the updated value on the second read.
- Real systems often pick a single isolation level for all transactions; you may adjust based on workload and consistency requirements.

## 3. ACID in practice: durability and atomicity (savepoints)

ACID’s atomicity means a multi-step operation should either complete fully or rollback entirely. Savepoints let you break long transactions into stages, allowing partial rollbacks without undoing prior work within the same transaction.

```java
import javax.sql.DataSource;
import java.sql.*;

public class SavepointExample {
    private DataSource ds;

    public SavepointExample(DataSource ds) {
        this.ds = ds;
    }

    public void multiStepProcess(int accountId, double amount) throws SQLException {
        try (Connection conn = ds.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement step1 = conn.prepareStatement("UPDATE accounts SET balance = balance - ? WHERE id = ?")) {
                step1.setDouble(1, amount);
                step1.setInt(2, accountId);
                step1.executeUpdate();
            }

            // Create a savepoint after the first step
            Savepoint sp = conn.setSavepoint("after_debit");

            try (PreparedStatement step2 = conn.prepareStatement("INSERT INTO transactions (account_id, delta) VALUES (?, ?)")) {
                step2.setInt(1, accountId);
                step2.setDouble(2, amount);
                step2.executeUpdate();
            }

            // If step2 fails, rollback only to the savepoint (keeping the debit)
            // For demonstration, we'll simulate a failure condition and rollback to savepoint below
            boolean simulateFailure = false;
            if (simulateFailure) {
                conn.rollback(sp); // Undo step2, keep debit
            }

            // Commit the entire transaction
            conn.commit();
        } catch (SQLException e) {
            // On error, rollback entire transaction
            // The connection is closed by try-with-resources
            throw e;
        }
    }
}
```

### Line-by-line explanation breaking down each line

- Line 1-2: Import DataSource and JDBC classes.
- Line 4-7: Class holds a DataSource for connections.
- Line 9-12: Constructor initializes the DataSource.
- Line 15: Method to perform a multi-step operation atomically.
- Line 17: Obtain a database connection.
- Line 18: Disable auto-commit to begin a transaction.
- Lines 20-25: Debit the account as step 1 of the process.
- Line 27: Create a savepoint after completing step 1.
- Lines 29-33: Step 2 – insert a corresponding transaction record to reflect the debit.
- Line 36: Optional simulated failure flag demonstrates rollback to a savepoint.
- Line 37: If not failing, commit the whole transaction, making both steps atomic.
- Lines 40-47: Catch any SQL exception and rollback; resources are cleaned up automatically.

Notes:
- Savepoints enable partial rollback within a long transaction, which is useful for multi-step business workflows where some steps can be reversed without discarding previous successful steps.
- In distributed systems, savepoints are less common; you may rely on compensating actions or sagas, depending on architecture.

## 4. Concurrency control strategies: optimistic vs pessimistic locking

Concurrency control helps maintain data correctness under contention. Pessimistic locking locks data as soon as it’s read; optimistic locking relies on versioning to detect conflicts at write time.

Pessimistic locking example (via SELECT ... FOR UPDATE):

```java
import javax.sql.DataSource;
import java.sql.*;

public class PessimisticLockingDemo {
    private DataSource ds;

    public PessimisticLockingDemo(DataSource ds) {
        this.ds = ds;
    }

    public void transferWithPessimisticLock(int fromId, int toId, double amount) throws SQLException {
        try (Connection conn = ds.getConnection()) {
            conn.setAutoCommit(false);
            // Lock the rows as we read them to avoid concurrent updates
            try (PreparedStatement lockFrom = conn.prepareStatement(
                    "SELECT balance FROM accounts WHERE id = ? FOR UPDATE")) {
                lockFrom.setInt(1, fromId);
                ResultSet rsFrom = lockFrom.executeQuery();
                if (!rsFrom.next()) throw new SQLException("Source account not found");

                // Debit
                try (PreparedStatement debit = conn.prepareStatement("UPDATE accounts SET balance = balance - ? WHERE id = ?")) {
                    debit.setDouble(1, amount);
                    debit.setInt(2, fromId);
                    debit.executeUpdate();
                }

                // Credit
                try (PreparedStatement lockTo = conn.prepareStatement("SELECT balance FROM accounts WHERE id = ? FOR UPDATE")) {
                    lockTo.setInt(1, toId);
                    ResultSet rsTo = lockTo.executeQuery();
                    if (!rsTo.next()) throw new SQLException("Destination account not found");
                }

                try (PreparedStatement credit = conn.prepareStatement("UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
                    credit.setDouble(1, amount);
                    credit.setInt(2, toId);
                    credit.executeUpdate();
                }

                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }
}
```

Optimistic locking example (version column):

```java
import javax.sql.DataSource;
import java.sql.*;

public class OptimisticLockingDemo {
    private DataSource ds;

    public OptimisticLockingDemo(DataSource ds) {
        this.ds = ds;
    }

    // accounts table: id INT PRIMARY KEY, balance DOUBLE, version INT
    public void transferWithOptimisticLock(int fromId, int toId, double amount) throws SQLException {
        try (Connection conn = ds.getConnection()) {
            conn.setAutoCommit(false);

            // Read balances and version for both accounts (simplified)
            int fromVersion, toVersion;

            try (PreparedStatement psFrom = conn.prepareStatement("SELECT balance, version FROM accounts WHERE id = ? FOR UPDATE");
                 PreparedStatement psTo = conn.prepareStatement("SELECT balance, version FROM accounts WHERE id = ? FOR UPDATE")) {
                psFrom.setInt(1, fromId);
                try (ResultSet rsFrom = psFrom.executeQuery()) {
                    if (!rsFrom.next()) throw new SQLException("From account not found");
                    fromVersion = rsFrom.getInt("version");
                }

                psTo.setInt(1, toId);
                try (ResultSet rsTo = psTo.executeQuery()) {
                    if (!rsTo.next()) throw new SQLException("To account not found");
                    toVersion = rsTo.getInt("version");
                }
            }

            // Debit with version check (optimistic update)
            int updatedFrom;
            try (PreparedStatement updateFrom = conn.prepareStatement(
                    "UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE id = ? AND version = ?")) {
                updateFrom.setDouble(1, amount);
                updateFrom.setInt(2, fromId);
                updateFrom.setInt(3, fromVersion);
                updatedFrom = updateFrom.executeUpdate();
            }

            if (updatedFrom != 1) {
                conn.rollback();
                throw new SQLException("Optimistic lock failed on debit (concurrent modification detected)");
            }

            // Credit with version check
            int updatedTo;
            try (PreparedStatement updateTo = conn.prepareStatement(
                    "UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE id = ? AND version = ?")) {
                updateTo.setDouble(1, amount);
                updateTo.setInt(2, toId);
                updateTo.setInt(3, toVersion);
                updatedTo = updateTo.executeUpdate();
            }

            if (updatedTo != 1) {
                conn.rollback();
                throw new SQLException("Optimistic lock failed on credit (concurrent modification detected)");
            }

            conn.commit();
        }
    }
}
```

### Line-by-line explanation breaking down each line

- PessimisticLockingDemo:
  - Line 1-2: Import JDBC classes.
  - Line 4-7: Class holds a DataSource.
  - Line 9-12: Constructor stores DataSource.
  - Line 15: Method performs a transfer with pessimistic locking.
  - Line 18: Get a connection.
  - Line 19: Disable auto-commit to start a transaction.
  - Lines 21-29: Acquire a row lock on the source account with FOR UPDATE, then debit.
  - Lines 31-39: Acquire a lock on the destination account (reads with FOR UPDATE to establish lock), then credit.
  - Line 41: Commit the transaction.
  - Lines 42-47: On error, rollback.
- OptimisticLockingDemo:
  - Line 1-2: Import JDBC classes.
  - Line 4-7: Class with DataSource.
  - Line 9-12: Constructor stores DataSource.
  - Line 15: Method begins the optimistic transfer.
  - Line 18: Obtain a connection and disable auto-commit.
  - Lines 21-31: Read version information for both accounts (with FOR UPDATE to lock rows for consistency during checks).
  - Lines 34-44: Update from-account using a version check; if not exactly 1 row updated, rollback and fail.
  - Lines 47-57: Update to-account with a version check; if not exactly 1 row updated, rollback and fail.
  - Line 59: Commit on success.
  - Error handling ensures rollback on failure.

Notes:
- Pessimistic locking is straightforward under high contention but can reduce throughput due to long-held locks.
- Optimistic locking improves throughput under low contention but requires careful handling of version conflicts (retry logic might be needed in real apps).

## X. Common Beginner Mistakes

- 1) Not wrapping multiple related updates in a transaction (autocommit misuse)
  Bad:
  ```java
  // Debit
  stmt1.executeUpdate("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
  // Credit
  stmt2.executeUpdate("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
  ```
  Good:
  ```java
  try (Connection c = ds.getConnection()) {
      c.setAutoCommit(false);
      // debit and credit here
      c.commit();
  } catch (SQLException e) {
      // rollback
  }
  ```

- 2) Ignoring rollback on exceptions
  Bad:
  ```java
  conn.setAutoCommit(false);
  // perform updates
  conn.commit(); // Never reaches on error
  ```
  Good:
  ```java
  try {
      conn.setAutoCommit(false);
      // perform updates
      conn.commit();
  } catch (SQLException e) {
      conn.rollback();
      throw e;
  }
  ```

- 3) Mixing isolation levels without justification
  Bad:
  ```java
  conn.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
  // Do reads for a fast path
  ```
  Good:
  ```java
  // Choose an isolation level aligned with the workload and consistency needs
  conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
  ```

- 4) Not handling deadlocks or retriable conflicts
  Bad:
  ```java
  // A single transaction that can deadlock with others
  // no retry logic
  ```
  Good:
  ```java
  // Catch deadlock-like errors and retry a limited number of times
  ```

## Y. Why This Matters In Real Systems

- Data integrity in financial, inventory, and order systems depends on ACID guarantees to prevent anomalies like double-spending, phantom reads, or inconsistent balances.
- Concurrency control choices influence throughput and latency in production. Pessimistic locking can prevent anomalies under heavy contention but may throttle performance; optimistic locking encourages high concurrency but requires robust retry logic and version handling.
- Proper transaction management is essential when coordinating across multiple tables, services, or events. Saving points, explicit rollback on exceptions, and careful exception handling determine how gracefully systems recover from partial failures.
- Isolation levels matter in distributed architectures (monolithic DBs vs microservices). When deploying microservices, consider patterns like sagas or event sourcing to maintain consistency without distributed transactions spanning services.
- In production, monitor locking metrics, deadlocks, long-running transactions, and rollback rates to tune the database and application behavior.

## Z. Study Questions

1) What do ACID properties stand for, and why is each important in a transactional system?  
2) How does setting a transaction isolation level affect visibility of other transactions’ changes? Provide an example.  
3) What is a savepoint, and when would you use it?  
4) Compare pessimistic locking with optimistic locking. When would you choose one over the other?  
5) Why is proper exception handling and rollback crucial in transactional code?

## Exercise

Part A — Implement a transactional funds transfer

- Objective: Build a small Java class that transfers funds between two accounts using JDBC with proper transaction handling and rollback on failure.
- Requirements:
  - Use a DataSource for connection pooling.
  - Implement a method transferFunds(int fromAccountId, int toAccountId, double amount) that debits one account and credits another within a single transaction.
  - Ensure correct rollback on any failure.
  - Include basic input validation (positive amount, distinct accounts).

Code Skeleton:

```java
import javax.sql.DataSource;
import java.sql.*;

public class ExerciseTransaction {
    private DataSource ds;

    public ExerciseTransaction(DataSource ds) {
        this.ds = ds;
    }

    public void transferFunds(int fromAccountId, int toAccountId, double amount) throws SQLException {
        // TODO: implement the transactional debit/credit with rollback
    }
}
```

Part B — Add optimistic locking to the transfer

- Extend the example to use a version column on accounts (id, balance, version).
- Implement a transferFundsOptimistic that updates using a version check and retries on conflict with a simple cap (e.g., 3 retries).

Code sketch:

```java
public void transferFundsOptimistic(int fromAccountId, int toAccountId, double amount) throws SQLException {
    // Pseudo: read balances and versions; perform updates with "WHERE id = ? AND version = ?" checks
    // Increment version on each update; rollback on conflict; commit on success
}
```

Part C — Concurrency test harness

- Write a small test harness (main method or JUnit test) that spins up two threads performing transfers in parallel to simulate real-world contention.
- Use an in-memory H2 database or a lightweight database to demonstrate transactional behavior and verify ACID properties.
- Validate:
  - Sum of balances remains constant after parallel transfers blocking and retries.
  - No partial updates occur (no account ends with negative balance if funds were insufficiently checked).

Deliverables:
- A single Java project or set of classes showing the above implementations.
- A short README or in-code comments describing how to run the tests and what to observe regarding ACID behavior.

This completes a comprehensive, practice-oriented lesson on Transactions, ACID, and Concurrency in Java, bridging theory with actionable, production-relevant patterns.