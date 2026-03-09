# Transactions, ACID, and Concurrency in Ruby Backends

In modern backend systems, databases are the system of record for critical state. Transactions allow multiple operations to be executed atomically, guarding against partial updates that could leave data in an inconsistent state. ACID properties (Atomicity, Consistency, Isolation, Durability) define the guarantees we rely on to keep data correct even in the face of errors or concurrent access. Concurrency control—through locking strategies, isolation levels, and careful transaction design—helps us build high-throughput, correct systems (for example, money transfers, inventory management, and order processing) without data corruption or race conditions. This lesson demonstrates how to implement and reason about transactions, ACID, and concurrency in Ruby using ActiveRecord (the typical ORM in Rails-based backends), with practical code examples and best practices.

## 1. Understanding ACID and Transactions in Ruby

Transactions group a set of database operations so they either all succeed or all fail. In Ruby with ActiveRecord, you can wrap code in a transaction block to ensure atomicity, and you can apply locking to prevent other processes from interleaving updates.

### Code example: transferring funds atomically with row-level locks

```ruby
# app/models/account.rb
class Account < ApplicationRecord
  # columns: id, balance:decimal
end

# Somewhere in your service layer
def transfer_funds(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = Account.lock.find(sender_id)
    receiver = Account.lock.find(receiver_id)

    raise "insufficient funds" if sender.balance < amount

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
end
```

### Line-by-line explanation
- ActiveRecord::Base.transaction do ... end
  - Starts a database transaction. All database changes inside this block are atomic: either all succeed or all are rolled back on error.
- sender = Account.lock.find(sender_id)
  - Fetches the sender account and acquires a row-level lock (SELECT ... FOR UPDATE). This prevents other transactions from updating this row until the transaction completes.
- receiver = Account.lock.find(receiver_id)
  - Fetches the receiver account with a row-level lock as well.
- raise "insufficient funds" if sender.balance < amount
  - Guard condition to ensure the sender has enough balance before performing the transfer.
- sender.balance -= amount
  - Decrements the sender’s balance locally.
- receiver.balance += amount
  - Increments the receiver’s balance locally.
- sender.save!
- receiver.save!
  - Persistes the updated balances. If any save fails, the entire transaction is rolled back.

---

## 2. Isolation Levels and Concurrency Strategies

Isolation level and locking strategy determine how transactions interact with each other. Different databases and drivers support different levels; PostgreSQL, for example, supports several, including serializable, which provides the strongest guarantees at the cost of potential retries.

### 2a. Serializable isolation

```ruby
ActiveRecord::Base.transaction(isolation: :serializable) do
  account = Account.find(account_id)
  account.balance += 50.0
  account.save!
end
```

### Line-by-line explanation
- ActiveRecord::Base.transaction(isolation: :serializable) do ... end
  - Runs the transaction under the SERIALIZABLE isolation level. This behaves as if transactions are executed one after another in some order; it prevents phenomena like phantom reads but can lead to serialization failures requiring retries.
- account = Account.find(account_id)
  - Retrieves the account row.
- account.balance += 50.0
  - Applies the business mutation in Ruby.
- account.save!
  - Persists changes. If another concurrent transaction causes a conflict, this save may raise an error (ActiveRecord::StatementInvalid or ActiveRecord::SerializationFailure depending on adapter), in which case you should retry.

### 2b. Pessimistic locking with lock

```ruby
def deposit_with_lock(account_id, amount)
  ActiveRecord::Base.transaction do
    account = Account.lock.find(account_id)
    account.balance += amount
    account.save!
  end
end
```

### Line-by-line explanation
- ActiveRecord::Base.transaction do ... end
  - Begin a transaction to ensure atomicity.
- account = Account.lock.find(account_id)
  - Acquire a row-level lock on the account (SELECT ... FOR UPDATE) to prevent concurrent updates during the transaction.
- account.balance += amount
  - Apply the mutation in Ruby.
- account.save!
  - Persist the updated balance. If the transaction fails, it will roll back.

### 2c. Optimistic locking with lock_version

To enable optimistic locking, add a lock_version column (integer) to the model.

```ruby
# app/models/bank_account.rb
class BankAccount < ApplicationRecord
  # requires a lock_version: integer column
end

# Transfer using optimistic locking
def optimistic_transfer(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = BankAccount.find(sender_id)
    receiver = BankAccount.find(receiver_id)

    raise "insufficient funds" if sender.balance < amount

    sender.balance -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
rescue ActiveRecord::StaleObjectError
  # Handle concurrency conflict (e.g., retry or notify)
  retry
end
```

### Line-by-line explanation
- BankAccount model includes a lock_version column to enable optimistic locking.
- ActiveRecord::Base.transaction do ... end
  - Start a transaction.
- sender = BankAccount.find(sender_id)
  - Load sender (version is tracked by lock_version).
- receiver = BankAccount.find(receiver_id)
  - Load receiver (version is tracked).
- balance mutations
  - Apply business logic in Ruby.
- sender.save! and receiver.save!
  - Save changes. If either record has been updated by another transaction since load, ActiveRecord raises ActiveRecord::StaleObjectError.
- rescue ActiveRecord::StaleObjectError; retry
  - Simple retry strategy to resolve optimistic locking conflicts (real systems may implement backoff or limit retries).

---

## 3. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

1) Not wrapping multi-record updates in a transaction

- Bad
```ruby
def transfer_bad(sender_id, receiver_id, amount)
  sender   = Account.find(sender_id)
  receiver = Account.find(receiver_id)
  raise "insufficient funds" if sender.balance < amount

  sender.balance   -= amount
  receiver.balance += amount

  sender.save!
  receiver.save!
end
```

- Good
```ruby
def transfer_good(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = Account.find(sender_id)
    receiver = Account.find(receiver_id)
    raise "insufficient funds" if sender.balance < amount

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
end
```

2) Not locking rows in concurrent transfers

- Bad
```ruby
def transfer_race(sender_id, receiver_id, amount)
  sender   = Account.find(sender_id)
  receiver = Account.find(receiver_id)
  raise "insufficient funds" if sender.balance < amount

  sender.balance   -= amount
  receiver.balance += amount

  sender.save!
  receiver.save!
end
```

- Good
```ruby
def transfer_lock(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = Account.lock.find(sender_id)
    receiver = Account.lock.find(receiver_id)

    raise "insufficient funds" if sender.balance < amount

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
end
```

3) Relying on default isolation without explicit locking

- Bad
```ruby
def transfer_no_lock_isolation(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = Account.find(sender_id)
    receiver = Account.find(receiver_id)

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
end
```

- Good
```ruby
def transfer_with_serializable(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction(isolation: :serializable) do
    sender   = Account.lock.find(sender_id)
    receiver = Account.lock.find(receiver_id)

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
end
```

4) Not handling optimistic locking conflicts

- Bad
```ruby
def transfer_without_handling(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = BankAccount.find(sender_id)
    receiver = BankAccount.find(receiver_id)

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
end
```

- Good
```ruby
def transfer_with_optimistic_lock(sender_id, receiver_id, amount)
  ActiveRecord::Base.transaction do
    sender   = BankAccount.find(sender_id)
    receiver = BankAccount.find(receiver_id)

    sender.balance   -= amount
    receiver.balance += amount

    sender.save!
    receiver.save!
  end
rescue ActiveRecord::StaleObjectError
  retry
end
```

---

## 4. Why This Matters In Real Systems

- Data integrity under concurrency: Financial services, inventory management, and order processing require strict consistency. A broken transfer can lead to money disappearing or duplicating.
- Performance vs correctness: Locking and isolation levels trade throughput for correctness. Serializable isolation reduces anomalies but can increase retries and wait times; pessimistic locking reduces concurrency but prevents conflicts; optimistic locking enables higher throughput with conflict retries.
- Failure modes and retries: Deadlocks, timeouts, and serialization failures happen in production. Systems must be designed to handle retries, backoff, and clear error handling.
- Monitoring and observability: Track lock waits, long-running transactions, deadlocks, and transaction duration. Use DB logs and application metrics to tune isolation levels and retry strategies.
- Real-world design notes: For high-throughput services, consider domain-specific strategies like compensating actions, idempotency keys, and offloading to event streams to maintain consistency guarantees without blocking critical paths.

---

## 5. Study Questions

1) What does ACID stand for, and why is each property important in a back-end database operation?  
2) How do you perform a transactional money transfer in Rails/ActiveRecord? What are the key steps to ensure atomicity?  
3) What is the difference between pessimistic locking and optimistic locking? Provide a Ruby/ActiveRecord example for each.  
4) Why might you choose a serializable isolation level, and what are the trade-offs?  
5) What are common signs of a deadlock in a Rails app, and what practical strategies can prevent or mitigate them?

---

## Exercise

Part 1 — Implement a safe transfer using pessimistic locking

- Create a transfer_funds_with_lock(sender_id, receiver_id, amount) method that:
  - Runs inside a single ActiveRecord transaction.
  - Locks both accounts using row-level locking (SELECT ... FOR UPDATE).
  - Validates sufficient funds before transferring.
  - Updates balances and logs the transfer.

Part 2 — Extend with a TransferLog

- Add a TransactionLog (or TransferLog) model with fields:
  - id, sender_id, receiver_id, amount, status:string, created_at
- Inside the transaction, create a log entry with status "completed" after successful transfers, or "failed" if an error occurs.
- Ensure the log creation is part of the same transaction (so it rolls back on failure).

Part 3 — Basic retry for concurrency conflicts

- If a serialization failure or stale object error occurs, retry the transfer up to 3 times with exponential backoff.
- Provide minimal test scaffolding or usage example showing concurrent transfers that would stress locking and demonstrate retries.

Provide your implementation as Ruby code blocks. Include concise explanations for how you would test and verify correctness in a real project (e.g., through unit tests, integration tests, and load tests).