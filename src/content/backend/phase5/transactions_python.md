# Track: Backend Engineering — Phase 5: Databases — Transactions, ACID, and Concurrency (Python)

Transactions, ACID, and concurrency are core pillars of reliable backend systems. When multiple clients modify shared data, you must ensure operations either complete fully or not at all (Atomicity), keep data consistent with rules (Consistency), prevent concurrent anomalies (Isolation), and survive failures (Durability). In Python, you typically interact with a database via a driver (e.g., psycopg2 for PostgreSQL) or an ORM (e.g., SQLAlchemy). This lesson dives into how to model, implement, and reason about transactions, isolation levels, and concurrency patterns in real code, with concrete examples, line-by-line explanations, and hands-on exercises.

## 1. Understanding Transactions and ACID in Practice

A transaction is a sequence of database operations that are treated as a single unit. If any operation fails, the entire sequence is rolled back, leaving the database state unchanged. The ACID properties ensure correctness in multi-user systems.

- Atomicity: All operations in a transaction succeed or none do.
- Consistency: The database moves from one valid state to another.
- Isolation: Concurrent transactions do not interfere in a way that breaks correctness.
- Durability: Once committed, changes survive crashes.

Code example: basic multi-step transfer with explicit BEGIN/COMMIT/ROLLBACK using psycopg2 (PostgreSQL).

```python
# File: transactions_basic.py
import psycopg2

def transfer_atomic(src_id: int, dst_id: int, amount: int) -> None:
    conn = psycopg2.connect(
        "dbname=bank user=postgres password=secret host=localhost"
    )
    cur = conn.cursor()
    try:
        # Begin a transaction
        cur.execute("BEGIN;")

        # Step 1: deduct from source
        cur.execute(
            "UPDATE accounts SET balance = balance - %s WHERE id = %s",
            (amount, src_id),
        )

        # Step 2: credit to destination
        cur.execute(
            "UPDATE accounts SET balance = balance + %s WHERE id = %s",
            (amount, dst_id),
        )

        # Step 3: commit the transaction
        conn.commit()
    except Exception:
        # Any error -> rollback to preserve atomicity
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
```

### Line-by-line explanation
- import psycopg2: Load the PostgreSQL driver to talk to the database.
- def transfer_atomic(...): Define a function to perform a money transfer atomically.
- conn = psycopg2.connect(...): Establish a connection to the database.
- cur = conn.cursor(): Create a cursor to execute SQL commands.
- cur.execute("BEGIN;"): Start a new transaction explicitly.
- cur.execute("UPDATE accounts ..."): Subtract the amount from the source account.
- cur.execute("UPDATE accounts ..."): Add the amount to the destination account.
- conn.commit(): Persist all changes as a single, atomic operation.
- except Exception: Catch any error to revert partial changes.
- conn.rollback(): Roll back the entire transaction on error.
- finally: Clean up resources (cursor and connection).

Common takeaway: This pattern ensures that if either transfer step fails, neither update is visible, preserving atomicity across multiple rows.

## 2. Isolation Levels: How Concurrency Changes Behavior

Isolation levels decide how and when changes become visible to other transactions. Common levels:
- READ COMMITTED (default in PostgreSQL): No dirty reads; non-repeatable reads can occur.
- REPEATABLE READ: Ensures rows read in a transaction stay the same; phantom reads can occur.
- SERIALIZABLE: Most strict; simulates executing transactions one after another.

Code example: setting and using different isolation levels with psycopg2.

```python
# File: isolation_levels.py
import time
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_SERIALIZABLE, ISOLATION_LEVEL_READ_COMMITTED

def transfer_with_isolation(src_id: int, dst_id: int, amount: int, level: str = "READ COMMITTED"):
    level_map = {
        "READ COMMITTED": ISOLATION_LEVEL_READ_COMMITTED,
        "SERIALIZABLE": ISOLATION_LEVEL_SERIALIZABLE,
    }
    conn = psycopg2.connect(
        "dbname=bank user=postgres password=secret host=localhost"
    )
    conn.set_session(autocommit=False, isolation_level=level_map[level])
    cur = conn.cursor()
    try:
        cur.execute("BEGIN;")
        cur.execute(
            "UPDATE accounts SET balance = balance - %s WHERE id = %s",
            (amount, src_id),
        )
        cur.execute(
            "UPDATE accounts SET balance = balance + %s WHERE id = %s",
            (amount, dst_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
```

### Line-by-line explanation
- level_map: Map human-friendly level names to psycopg2 constants.
- conn.set_session(..., isolation_level=...): Configure the transaction’s isolation level for the session.
- cur.execute("BEGIN;"): Start the transaction within the chosen isolation context.
- First UPDATE: Deduct balance from the source account.
- Second UPDATE: Credit balance to the destination account.
- conn.commit(): Persist the changes if no errors occur under the chosen isolation.
- except/rollback: If any error happens (e.g., serialization failure at SERIALIZABLE), revert changes.
- finally: Cleanup resources.

Situational note: SERIALIZABLE helps prevent anomalies like phantom reads but can lead to more serialization failures and retries under high contention. READ COMMITTED is typically faster and sufficient for many workloads.

## 3. Concurrency Patterns: Pessimistic vs Optimistic

Two broad strategies for handling concurrent updates:
- Pessimistic locking: Lock rows as soon as they are read to prevent other transactions from modifying them.
- Optimistic concurrency control (OCC): Do not lock upfront; detect conflicts at commit time and retry.

A. Pessimistic locking using SELECT FOR UPDATE (two-phase locking)

```python
# File: concurrency_pessimistic.py
import psycopg2

def transfer_pessimistic(src_id: int, dst_id: int, amount: int) -> None:
    conn = psycopg2.connect(
        "dbname=bank user=postgres password=secret host=localhost"
    )
    cur = conn.cursor()
    try:
        cur.execute("BEGIN;")

        # Lock the rows in a deterministic order to avoid deadlocks
        first, second = sorted([src_id, dst_id])

        cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (first,))
        cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (second,))

        cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, src_id))
        cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, dst_id))

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
```

### Line-by-line explanation
- def transfer_pessimistic(...): Define a pessimistic transfer function.
- cur.execute("BEGIN;"): Start a transaction.
- first, second = sorted(...): Order the two IDs to prevent deadlocks when two concurrent transactions touch the same pair in reverse order.
- cur.execute(... FOR UPDATE): Lock the selected rows immediately for update, preventing other transactions from modifying them.
- Two UPDATE statements: Apply the debit/credit while the locks are held.
- conn.commit(): Commit if everything succeeds.
- except/rollback: Roll back on error to preserve atomicity and consistency.
- finally: Cleanup.

B. Optimistic Concurrency Control (OCC) with a version column

Assumes an additional version column on each row that increments on change.

```python
# File: concurrency_optimistic.py
import psycopg2

def transfer_optimistic(src_id: int, dst_id: int, amount: int, max_retries: int = 5) -> None:
    conn = psycopg2.connect(
        "dbname=bank user=postgres password=secret host=localhost"
    )
    cur = conn.cursor()
    try:
        for attempt in range(max_retries):
            cur.execute("BEGIN;")

            # Read current balances and versions
            cur.execute("SELECT balance, version FROM accounts WHERE id = %s", (src_id,))
            src_bal, src_ver = cur.fetchone()

            cur.execute("SELECT balance, version FROM accounts WHERE id = %s", (dst_id,))
            dst_bal, dst_ver = cur.fetchone()

            # Compute new balances (no locking yet)
            new_src = src_bal - amount
            new_dst = dst_bal + amount

            # Update with optimistic checks (version must match)
            cur.execute(
                "UPDATE accounts SET balance = %s, version = version + 1 WHERE id = %s AND version = %s",
                (new_src, src_id, src_ver),
            )
            if cur.rowcount == 0:
                raise Exception("Optimistic conflict on src account")

            cur.execute(
                "UPDATE accounts SET balance = %s, version = version + 1 WHERE id = %s AND version = %s",
                (new_dst, dst_id, dst_ver),
            )
            if cur.rowcount == 0:
                raise Exception("Optimistic conflict on dst account")

            conn.commit()
            return  # success
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
```

### Line-by-line explanation
- for attempt in range(max_retries): Simple retry loop to handle conflicts.
- cur.execute("BEGIN;"): Start a new transaction for this attempt.
- SELECT balance, version: Read current values and the row version for optimistic checks.
- Compute new balances: Determine intended final state based on input.
- UPDATE ... WHERE id = ... AND version = ...: Attempt to apply changes only if the version matches, incrementing the version.
- if cur.rowcount == 0: Detects a conflict (someone else updated the row first).
- conn.commit(): Commit only if both updates succeed without conflicts.
- except/rollback: Roll back on any conflict or error, then retry or propagate error.
- finally: Cleanup.

Notes:
- OCC relies on the assumption that conflicts are rare; if a conflict is detected, you typically retry the entire operation.
- Using a per-row version column helps you detect concurrent modifications without locking.

## 4. Handling Errors: Deadlocks, Timeouts, and Retries

In high-contention scenarios, you can encounter deadlocks or serialization failures. Proactive patterns help keep user requests responsive.

```python
# File: error_handling.py
import time
import psycopg2
from psycopg2.errors import DeadlockDetected

def safe_transfer_with_retry(src_id: int, dst_id: int, amount: int, max_retries: int = 3):
    attempt = 0
    while attempt <= max_retries:
        try:
            transfer_pessimistic(src_id, dst_id, amount)  # or transfer_atomic / transfer_optimistic
            return
        except DeadlockDetected:
            # Short backoff before retrying after a deadlock
            time.sleep(0.5 * (2 ** attempt))
        except Exception:
            # For other exceptions, propagate or implement a different retry policy
            raise
        attempt += 1
    raise Exception("Max retries reached due to persistent contention")
```

### Line-by-line explanation
- import DeadlockDetected: Import the specific exception type for deadlocks.
- safe_transfer_with_retry(...): Wrapper to retry on deadlocks up to max_retries.
- try: Attempt the transfer with a chosen strategy (pessimistic/atomic/optimistic).
- except DeadlockDetected: Implement exponential backoff before retrying to reduce contention.
- except Exception: Propagate other errors after a failed attempt.
- After exceeding max_retries, raise a descriptive error.

Real systems often combine:
- Deadlock detection with exponential backoff.
- Circuit breakers to avoid hammering a failing service.
- Rate limiting and queueing to smooth peaks.

## 5. Practical Patterns in Python: ORMs vs Raw Drivers

Python ecosystems provide both raw drivers (psycopg2) and ORMs (SQLAlchemy) that can manage transactions and concurrency for you.

A. Raw driver (psycopg2) example: already shown in Sections 1–4.

B. ORM-based approach (SQLAlchemy Core) for explicit transaction management

```python
# File: orm_core.py
from sqlalchemy import create_engine, text

engine = create_engine("postgresql+psycopg2://postgres:secret@localhost/bank")

def transfer_with_sqlalchemy(src_id: int, dst_id: int, amount: int) -> None:
    with engine.begin() as conn:  # begins a transaction, commits on exit, rollbacks on exception
        # Pessimistic locking via explicit FOR UPDATE in deterministic order
        first, second = sorted([src_id, dst_id])
        conn.execute(text("SELECT 1 FROM accounts WHERE id = :id FOR UPDATE"), {"id": first})
        conn.execute(text("SELECT 1 FROM accounts WHERE id = :id FOR UPDATE"), {"id": second})

        conn.execute(
            text("UPDATE accounts SET balance = balance - :amt WHERE id = :id"),
            {"amt": amount, "id": src_id},
        )
        conn.execute(
            text("UPDATE accounts SET balance = balance + :amt WHERE id = :id"),
            {"amt": amount, "id": dst_id},
        )
```

### Line-by-line explanation
- engine = create_engine(...): Create an SQLAlchemy engine bound to PostgreSQL.
- with engine.begin() as conn: Use a transactional context; commit occurs automatically on success, rollback on exception.
- SELECT ... FOR UPDATE: Acquire row locks in a deterministic order to avoid deadlocks.
- UPDATE statements: Apply debit and credit within the same transaction.
- Exiting the context manager commits the transaction or rolls back on error.

Key takeaway: ORMs can simplify boilerplate and provide safer patterns, but you still need to reason about isolation, locking, and retry strategies.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Not wrapping multi-step updates in a single transaction
  - Bad:
    ```python
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
    ```
  - Good:
    ```python
    cur.execute("BEGIN;")
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
    ```
- Mistake 2: Using a low isolation level in high-concurrency paths
  - Bad:
    ```python
    conn.set_session(autocommit=False, isolation_level="READ UNCOMMITTED")  # invalid in PostgreSQL
    ```
  - Good:
    ```python
    conn.set_session(autocommit=False, isolation_level=ISOLATION_LEVEL_SERIALIZABLE)
    ```
- Mistake 3: Not handling exceptions and not rolling back
  - Bad:
    ```python
    cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, src_id))
    cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, dst_id))
    conn.commit()  # If an exception happened earlier, commit would be wrong
    ```
  - Good:
    ```python
    try:
        cur.execute("BEGIN;")
        cur.execute("UPDATE accounts ...", (...))
        cur.execute("UPDATE accounts ...", (...))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    ```
- Mistake 4: Assuming ORDER of operations prevents deadlocks without ordering
  - Bad:
    ```python
    cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (src_id,))
    cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (dst_id,))
    ```
  - Good:
    ```python
    first, second = sorted([src_id, dst_id])
    cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (first,))
    cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (second,))
    ```
- Mistake 5: Ignoring the cost of retries on conflicts
  - Bad: No retry loop after a conflict.
  - Good: Implement an exponential backoff strategy when DeadlockDetected or serialization failure occurs.
  
These contrasts help you write robust transaction logic and anticipate failure modes in real systems.

## Y. Why This Matters In Real Systems — production context and real usage

- Data integrity in multi-user systems: Banking, e-commerce, inventory, and analytics all rely on precise transactional semantics to avoid lost updates, phantom reads, or inconsistent balances.
- Real-world workload characteristics: Read-heavy vs write-heavy, hot-spots (e.g., top accounts), and contention scenarios require tuned isolation levels and appropriate locking strategies.
- Performance and scalability: Pessimistic locking can serialize hot paths; optimistic approaches reduce locking but need conflict resolution and retries. Understand your workload to choose between them.
- Operational considerations:
  - Connection pooling and transaction-scoped lifecycles (avoid long-running transactions that hold locks).
  - Proper error handling and retries with exponential backoff to maintain user responsiveness.
  - Observability: Log transaction durations, lock waits, deadlocks, and retry rates for tuning.
  - Data modeling: Add version columns for OCC, or design keys to enforce deterministic locking orders to prevent deadlocks.
- Real systems often mix: ORM abstractions for productivity, raw SQL for critical paths, and asynchronous task queues to manage heavy write workloads without blocking request handlers.

## Z. Study Questions — 5 recall questions

1) What does the ACID property "Isolation" guarantee in a multi-transaction scenario?
2) How does SELECT FOR UPDATE help with pessimistic concurrency, and what is a common pitfall when many transactions lock rows in reverse order?
3) How can a version column enable optimistic concurrency control, and what must you guard against if a conflict occurs?
4) Why might you choose SERIALIZABLE isolation over READ COMMITTED, and what is the trade-off?
5) Describe a basic retry strategy for handling deadlocks or serialization failures in a Python transaction.

## Exercise — a practical multi-part coding challenge

Goal: Build a small, testable Python module that demonstrates both pessimistic and optimistic concurrency strategies on a PostgreSQL-backed accounts table. You will set up a minimal schema, seed data, implement two transfer functions, and run a simple concurrent scenario to observe behavior.

Part A — Database setup (SQL)
- Create a PostgreSQL database named bank (or adapt to your environment).
- Create accounts table with:
  - id SERIAL PRIMARY KEY
  - name TEXT
  - balance INTEGER NOT NULL DEFAULT 0
  - version INTEGER NOT NULL DEFAULT 0 (for OCC)
- Seed with two accounts:
  - id=1, name='Alice', balance=1000
  - id=2, name='Bob', balance=1000

SQL (run in psql or via a migration tool):

CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0
);

INSERT INTO accounts (name, balance, version) VALUES ('Alice', 1000, 0);
INSERT INTO accounts (name, balance, version) VALUES ('Bob', 1000, 0);

Part B — Implement pessimistic transfer
- Create a Python module that implements transfer_pessimistic as shown in Section 3A.
- Ensure deterministic locking order and proper transaction handling.
- Add a small main block to transfer 150 from Alice to Bob and print final balances.

Part C — Implement optimistic transfer
- Extend the module with transfer_optimistic using a version-based approach as shown in Section 3B.
- Include a retry loop for transient conflicts.
- Include a main block to perform the same transfer as Part B and print final balances.

Part D — Concurrency test
- Write a simple test harness using threading to run multiple transfers concurrently (e.g., four threads transferring between Alice and Bob).
- Run both pessimistic and optimistic versions separately.
- Print: final balances and a count of retries (for optimistic) or observed deadlock retries (for pessimistic, if you implement logging).

What you should submit
- A zipped or single repository containing:
  - transactions_basic.py (from Part A)
  - isolation_levels.py (or a variant you created)
  - concurrency_pessimistic.py
  - concurrency_optimistic.py
  - orm_core.py (optional, demonstrates SQLAlchemy usage)
  - A README.md explaining how to set up PostgreSQL, run each script, and interpret the outputs.

Note: If you cannot access PostgreSQL in your environment, you can adapt the exercises to SQLite with the caveat that SQLite handles transactions differently and may not support the same isolation semantics as PostgreSQL. The core learning outcomes—managing BEGIN/COMMIT/ROLLBACK, understanding isolation levels, and applying optimistic vs pessimistic strategies—remain valuable across databases.