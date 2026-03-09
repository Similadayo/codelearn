# Track: Backend Engineering — Phase 5: Databases — Transactions, ACID, and Concurrency

Transactions, ACID guarantees, and concurrency control are the backbone of reliable data storage in backend systems. As a Go developer, you’ll design data access patterns that are atomic, durable, and consistent even under high load and failure scenarios. This lesson dives into how to structure transactional work in Go, how to reason about isolation levels and locking, and how to avoid the most common pitfalls in real systems.

## 1. Transaction Basics in Go

Learn how to wrap multiple SQL operations in a single transaction, ensuring atomicity and consistency. We’ll cover how to start a transaction, run multiple statements, handle errors, and commit or rollback as needed. This foundation unlocks safe multi-statement updates and is the building block for ACID-compliant data flows.

Code

```go
package main

import (
	"context"
	"database/sql"
	"log"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
)

type DB struct {
	*sql.DB
}

// OpenDB creates a database pool with some basic settings.
func OpenDB(dsn string) (*DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	// Basic pool configuration
	db.SetMaxOpenConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Ensure the connection is valid
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &DB{db}, nil
}

// RunInTransaction executes a function within a transaction.
// It accepts optional TxOptions (e.g., isolation level) and a context for cancellation.
func (d *DB) RunInTransaction(ctx context.Context, fn func(*sql.Tx) error, opts *sql.TxOptions) error {
	// Start a transaction with the provided options
	tx, err := d.BeginTx(ctx, opts)
	if err != nil {
		return err
	}

	// Ensure we rollback on panic
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	// Run user-provided work
	if err := fn(tx); err != nil {
		// Rollback on error
		_ = tx.Rollback()
		return err
	}

	// Commit if all good
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func main() {
	// Example DSN; adjust for your environment
	dsn := "postgres://postgres:password@localhost:5432/demo?sslmode=disable"

	db, err := OpenDB(dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Simple transfer-like operation within a transaction
	err = db.RunInTransaction(ctx, func(tx *sql.Tx) error {
		// Example statements
		_, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - 100 WHERE id = $1", 1)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + 100 WHERE id = $1", 2)
		return err
	}, &sql.TxOptions{Isolation: sql.LevelSerializable})

	if err != nil {
		log.Printf("transaction failed: %v", err)
		return
	}
	log.Println("transaction committed")
}
```

### Line-by-line explanation
- import blocks: bring in context, database/sql, time and the PostgreSQL driver.
- DB struct: thin wrapper around *sql.DB for method receivers.
- OpenDB: creates a database pool, configures connections, pings to validate connectivity.
- RunInTransaction: starts a transaction with optional options (e.g., isolation level), runs the user-supplied function, rolls back on error or panic, and commits on success.
- Main: demonstrates a simple money-transfer-like operation across two accounts using a transaction with Serializable isolation.
- The code emphasizes safe error handling and ensuring Commit happens only after fn(tx) succeeds.

## 2. ACID in Practice: Atomicity, Consistency, Isolation, Durability

ACID is more than a checklist; it’s about how writes propagate through the system and how failures are recovered. This section shows an explicit, non-trivial transfer that demonstrates atomicity (all-or-nothing) and consistency (rules enforced by constraints). We also touch on durability (once committed, changes survive crashes) via persistent storage and proper logging/ WAL.

Code

```go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

func TransferFundsSerializable(ctx context.Context, db *sql.DB, fromID, toID int64, amount int64) error {
	// Serializable to maximize correctness in concurrent scenarios
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback() // safe default

	// Lock and read balances with FOR UPDATE to prevent concurrent modifications
	var fromBal, toBal int64
	if err := tx.QueryRowContext(ctx, "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", fromID).Scan(&fromBal); err != nil {
		return fmt.Errorf("read fromBal: %w", err)
	}
	if err := tx.QueryRowContext(ctx, "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", toID).Scan(&toBal); err != nil {
		return fmt.Errorf("read toBal: %w", err)
	}

	if fromBal < amount {
		return fmt.Errorf("insufficient funds: have %d, need %d", fromBal, amount)
	}

	// Apply updates
	if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = $1 WHERE id = $2", fromBal-amount, fromID); err != nil {
		return fmt.Errorf("debit: %w", err)
	}
	if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = $1 WHERE id = $2", toBal+amount, toID); err != nil {
		return fmt.Errorf("credit: %w", err)
	}

	// Commit when everything succeeds
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// Example usage omitted for brevity
```

### Line-by-line explanation
- BeginTx with LevelSerializable aims to avoid anomalies under concurrent transactions.
- The two SELECT ... FOR UPDATE statements lock the two account rows to prevent race conditions.
- Check funds sufficiency before applying updates to avoid overdrafts.
- Debit and credit are performed within the same transaction; a failure rolls back all changes.
- Commit finalizes the transaction, making all changes durable in WAL-based databases.

Note: In production, you may want to implement deadlock-avoidance strategies (e.g., locking accounts in a fixed order by ID) and retry logic for serialization failures (see Section 3).

## 3. Isolation Levels, Locks, and Concurrency Patterns in Go

This section digs into how different isolation levels and explicit row locks affect concurrent workloads. We’ll look at two practical patterns:
- Using SELECT FOR UPDATE to lock rows within a transaction.
- Handling serialization failures (error 40001 in PostgreSQL) with retries.

Code

```go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

func isSerializationError(err error) bool {
	if err == nil {
		return false
	}
	// PostgreSQL serialization failure uses SQLSTATE 40001
	return strings.Contains(err.Error(), "40001")
}

func TransferWithLockAndRetry(ctx context.Context, db *sql.DB, fromID, toID int64, amount int64, maxRetries int) error {
	// Attempt with retries on serialization failures
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		err := doSingleTransfer(ctx, db, fromID, toID, amount)
		if err == nil {
			return nil
		}
		lastErr = err
		if isSerializationError(err) {
			// backoff before retry
			time.Sleep(time.Duration(attempt) * 50 * time.Millisecond)
			continue
		}
		// non-retryable error
		return err
	}
	return fmt.Errorf("transfers failed after %d retries: %w", maxRetries, lastErr)
}

func doSingleTransfer(ctx context.Context, db *sql.DB, fromID, toID int64, amount int64) error {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Consistent locking order to avoid deadlocks
	// Always lock the smaller id first
	firstID, secondID := orderIDs(fromID, toID)
	var firstBal, secondBal int64

	// Lock first account
	if err := tx.QueryRowContext(ctx, "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", firstID).Scan(&firstBal); err != nil {
		return err
	}
	// Lock second account
	if err := tx.QueryRowContext(ctx, "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", secondID).Scan(&secondBal); err != nil {
		return err
	}

	// Map balances to from/to regardless of order
	var fromBal, toBal int64
	if firstID == fromID {
		fromBal, toBal = firstBal, secondBal
	} else {
		fromBal, toBal = secondBal, firstBal
	}

	if fromBal < amount {
		return fmt.Errorf("insufficient funds: %d available, need %d", fromBal, amount)
	}

	// Apply updates in a way that respects the locked rows
	if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, fromID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID); err != nil {
		return err
	}

	return tx.Commit()
}

// orderIDs returns the IDs in ascending order to enforce a consistent locking order.
func orderIDs(a, b int64) (int64, int64) {
	if a < b {
		return a, b
	}
	return b, a
}
```

### Line-by-line explanation
- isSerializationError checks for the common PostgreSQL error code 40001 to determine if a retry is worthwhile.
- TransferWithLockAndRetry wraps the transfer logic with a retry loop, performing backoff between attempts.
- doSingleTransfer starts a serializable transaction and uses SELECT FOR UPDATE to lock both accounts.
- A fixed, deterministic locking order (via orderIDs) helps prevent deadlocks in concurrent scenarios.
- Balances are read only after locks; then updates are performed within the same transaction, followed by Commit.

Notes:
- In production, you might also consider using advisory locks or a centralized lock service for cross-service coordination.
- The retry loop should have a maxRetries limit and a backoff strategy to avoid hammering the database.

## 4. X. Common Beginner Mistakes

Pitfalls and how to fix them, with bad vs good code side-by-side.

1) Pitfall: Not rolling back when an error occurs
- Bad

```go
func TransferBad(tx *sql.Tx) error {
	// update from
	_, _ = tx.Exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
	// next line fails, but no rollback
	_, err := tx.Exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
	return err
}
```

- Good

```go
func TransferGood(tx *sql.Tx) error {
	_, err := tx.Exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
	if err != nil {
		return err
	}
	_, err = tx.Exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
	if err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
```

2) Pitfall: Not using context timeouts or cancellation
- Bad

```go
ctx := context.Background()
db.RunInTransaction(ctx, func(tx *sql.Tx) error {
	// long-running work
	// ...
	return nil
}, nil)
```

- Good

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
db.RunInTransaction(ctx, func(tx *sql.Tx) error {
	// bounded work
	return nil
}, nil)
```

3) Pitfall: Ignoring isolation level implications
- Bad

```go
// No explicit isolation level; defaults to DB defaults
tx, _ := db.Begin()
```

- Good

```go
tx, _ := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
```

4) Pitfall: Deadlocks due to inconsistent locking order
- Bad

```go
// Case A
TRANSFER: lock A then B
```

- Good

```go
// Always lock smaller ID first
first, second := orderIDs(a, b)
tx.QueryRowContext(ctx, "SELECT ... FOR UPDATE", first)
tx.QueryRowContext(ctx, "SELECT ... FOR UPDATE", second)
```

5) Pitfall: Not handling rollback on panic
- Bad

```go
func DoWork(tx *sql.Tx) error {
  tx.Exec("SOME SQL")
  panic("boom") // panic not recovered and not rolled back
  tx.Commit()
  return nil
}
```

- Good

```go
func DoWorkSafe(tx *sql.Tx) (err error) {
  defer func() {
    if p := recover(); p != nil {
      _ = tx.Rollback()
      panic(p)
    }
  }()
  // actual work
  if _, err = tx.Exec("SOME SQL"); err != nil {
    _ = tx.Rollback()
    return err
  }
  return tx.Commit()
}
```

## 5. Y. Why This Matters In Real Systems

- Data integrity: Transactions ensure that multi-step operations either fully succeed or have no effect, preserving business invariants (e.g., debit/credit consistency, inventory counts).
- Concurrency and performance: Proper isolation levels balance correctness against throughput. Serializable isolation minimizes anomalies but can increase contention; Read Committed or Repeatable Read may suffice for many apps and offer better throughput.
- Deadlocks and retries: Real systems must detect and recover from deadlocks or serialization failures. Retriable patterns with backoff keep services responsive under high contention.
- Observability: Instrument transaction duration, lock waits, and retry counts. Use database logs, application metrics, and tracing to diagnose contention hotspots.
- Idempotency and reliability: In distributed systems, you often combine ACID transactions with idempotent operation design and at-least-once delivery guarantees at the service boundary to avoid duplicate effects during retries.

## Z. Study Questions

1) What do the letters in ACID stand for, and why does each matter in a backend database?  
2) How does SELECT FOR UPDATE help with concurrency control inside a transaction?  
3) What is a serialization failure (PostgreSQL 40001), and how should a Go application respond?  
4) Why is it important to lock resources in a consistent order to avoid deadlocks?  
5) What are the trade-offs of using LevelSerializable versus LevelReadCommitted in a high-traffic API?

## Exercise

Part A. Implement a robust bank transfer in Go with Postgres
- Goal: Write a function TransferFundsSafe(db *sql.DB, fromID, toID int64, amount int64) error that:
  - Uses a serializable transaction to ensure atomicity.
  - Locks both accounts using SELECT FOR UPDATE in a consistent order to avoid deadlocks.
  - Checks for sufficient funds and returns a clear error on insufficient balance.
  - Includes retry logic for serialization failures (e.g., Postgres 40001) with a cap on retries.
  - Uses a context with timeout to prevent hanging transactions.

- Deliverables:
  - transfer.go: Implement TransferFundsSafe with a helper that orders IDs and performs locking + updates in a single transaction.
  - retry.go: Implement a small helper isSerializationError and a simple exponential backoff strategy.
  - tests/transfer_test.go: Unit tests that mock or simulate concurrent transfers to verify atomicity and absence of partial updates.
  - README.md: A short guide on how to run the tests against a local Postgres instance, including example DSN and schema (accounts table with id BIGINT and balance BIGINT).

- Starter code sketch (TransferFundsSafe interface and wiring)

```go
package main

import (
	"context"
	"database/sql"
	"fmt"
)

func TransferFundsSafe(db *sql.DB, fromID, toID int64, amount int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Implement using a helper that performs a serializable transaction with locking
	return transferWithRetry(ctx, db, fromID, toID, amount, 3)
}
```

- Part B: Extend with tests
  - Create accounts table in your test database.
  - Seed accounts with known balances.
  - Write a test that runs two concurrent transfers in opposite directions on the same two accounts to ensure no inconsistent final balances (use a shared in-memory or test Postgres instance).
  - Verify that exactly the expected total balance remains after both operations complete.

- Part C: Run and observe
  - Run the tests and observe how retries happen when serialization failures occur.
  - Use logs or metrics to confirm the number of retries and transaction durations.

Notes for the instructor or learner:
- The exercise emphasizes practical patterns: consistent locking order, explicit error handling, and retry logic for concurrency hazards.
- You can extend the exercise to include idempotent replay of transfers (e.g., with a transaction_id and a ledger) for even more realism in distributed systems.

This lesson provides actionable Go patterns for building ACID-compliant, concurrent-safe database interactions. Practice implementing these patterns in a real project to internalize how transactions, isolation, and locking shape the reliability of backend systems.