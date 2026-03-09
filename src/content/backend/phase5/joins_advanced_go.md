# Track: Backend Engineering — Phase 5: Databases — Advanced SQL: JOINs, Subqueries & Aggregations (Go)

Compelling introductory paragraph:
Mastering advanced SQL concepts—JOINs, subqueries, and aggregations—empowers backend engineers to build efficient data access layers, perform complex reporting, and maintain scalable services. In Go, combining these SQL techniques with strong data mapping, prepared statements, and careful query design yields robust, maintainable backends that can handle large data volumes without sacrificing correctness or performance. This lesson walks you through practical patterns, concrete Go code, and production-focused considerations to translate SQL theory into real-world systems.

## 1. Joins: INNER, LEFT, RIGHT, and FULL OUTER in Go

JOINs are the backbone of combining related data from multiple tables. We’ll explore common join types and show idiomatic Go patterns for scanning results.

### 1. INNER JOIN example in Go

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type UserWithOrder struct {
	UserID   int
	UserName string
	OrderID  int
	Amount   float64
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	// Simple INNER JOIN: only users with at least one order
	rows, err := db.Query(`
		SELECT u.id, u.name, o.id, o.total
		FROM users u
		INNER JOIN orders o ON u.id = o.user_id;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var results []UserWithOrder
	for rows.Next() {
		var r UserWithOrder
		if err := rows.Scan(&r.UserID, &r.UserName, &r.OrderID, &r.Amount); err != nil {
			log.Fatal("scan:", err)
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, r := range results {
		fmt.Printf("User %d (%s) - Order %d: %.2f\n", r.UserID, r.UserName, r.OrderID, r.Amount)
	}
}
```

### Line-by-line explanation breaking down each line

- package main: Defines the executable package.
- import (...): Imports database/sql, fmt, log, and the PostgreSQL driver package; the driver import is blank-identified to register it.
- type UserWithOrder: Data transfer object to hold joined data from users and orders.
- func main(): Entry point of the program.
- dsn := "...": Data source name for connecting to PostgreSQL.
- db, err := sql.Open(...): Opens a database handle for the given driver and DSN.
- if err != nil { ... }: Basic error handling for opening the connection.
- defer db.Close(): Ensures the DB connection is closed when the program ends.
- rows, err := db.Query(`...`): Executes an INNER JOIN query that returns users with their orders.
- if err != nil { ... }: Error handling for the query.
- defer rows.Close(): Ensure rows are released after processing.
- var results []UserWithOrder: Prepare a slice to hold results.
- for rows.Next() { ... }: Iterate over each row.
- var r UserWithOrder; rows.Scan(...): Map each column to the struct fields; order IDs and amounts are scanned into appropriate types.
- results = append(results, r): Accumulate results.
- if err := rows.Err(); err != nil { ... }: Check for errors during iteration.
- for _, r := range results { ... }: Simple display of results.
- fmt.Printf(...): Print a readable summary of each joined row.

### 1.1 LEFT JOIN example in Go

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type UserWithOptionalOrder struct {
	UserID   int
	UserName string
	OrderID  sql.NullInt64
	Amount   sql.NullFloat64
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	// LEFT JOIN: include users with no orders
	rows, err := db.Query(`
		SELECT u.id, u.name, o.id, o.total
		FROM users u
		LEFT JOIN orders o ON u.id = o.user_id;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var results []UserWithOptionalOrder
	for rows.Next() {
		var r UserWithOptionalOrder
		if err := rows.Scan(&r.UserID, &r.UserName, &r.OrderID, &r.Amount); err != nil {
			log.Fatal("scan:", err)
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, r := range results {
		orderInfo := "NO_ORDER"
		if r.OrderID.Valid {
			orderInfo = fmt.Sprintf("Order %d: %.2f", r.OrderID.Int64, r.Amount.Float64)
		}
		fmt.Printf("User %d (%s) -> %s\n", r.UserID, r.UserName, orderInfo)
	}
}
```

### Line-by-line explanation breaking down each line

- type UserWithOptionalOrder: Uses sql.NullInt64 and sql.NullFloat64 to safely represent possibly NULL order data from the LEFT JOIN.
- rows, err := db.Query(...): Executes a LEFT JOIN to include all users even if they have no matching orders.
- var r UserWithOptionalOrder; rows.Scan(...): Scans into nullable types to preserve NULL semantics.
- if r.OrderID.Valid { ... }: Conditionally formats output only when an order exists.
- The rest of the flow mirrors the INNER JOIN example, but with NULL handling.

### 1.2 Key takeaways for joins in Go

- INNER JOIN returns only matches; LEFT JOIN preserves left-side rows with possible NULLs on the right.
- Use sql.NullX types when you expect NULLs from a LEFT or RIGHT JOIN.
- For production code, prefer column lists (explicit SELECT) over SELECT * to avoid schema drift and improve performance.

## 2. Subqueries: IN, EXISTS, and Scalar Subqueries in Go

Subqueries let you filter, compute, or correlate data without exporting multiple rounds trips. We’ll cover IN, EXISTS, and a scalar subquery in SELECT.

### 2. Subquery in WHERE with IN (Go)

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type User struct {
	ID   int
	Name string
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	// Subquery in WHERE using IN: users who have any order over 100
	rows, err := db.Query(`
		SELECT DISTINCT u.id, u.name
		FROM users u
		WHERE u.id IN (
			SELECT o.user_id
			FROM orders o
			WHERE o.total > 100
		);
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name); err != nil {
			log.Fatal("scan:", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, u := range users {
		fmt.Printf("User %d: %s\n", u.ID, u.Name)
	}
}
```

### Line-by-line explanation breaking down each line

- SELECT DISTINCT u.id, u.name: Retrieve unique users matching the subquery criterion.
- WHERE u.id IN (SELECT o.user_id FROM orders WHERE o.total > 100): Subquery filters users who have any order totaling more than 100.
- rows.Scan(&u.ID, &u.Name): Map result columns to struct fields.

### 2. EXISTS (correlated subquery) in Go

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type UserExists struct {
	ID   int
	Name string
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	// EXISTS: check if a user has at least one order
	rows, err := db.Query(`
		SELECT u.id, u.name
		FROM users u
		WHERE EXISTS (
			SELECT 1
			FROM orders o
			WHERE o.user_id = u.id
		);
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var users []UserExists
	for rows.Next() {
		var u UserExists
		if err := rows.Scan(&u.ID, &u.Name); err != nil {
			log.Fatal("scan:", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, u := range users {
		fmt.Printf("User %d: %s has at least one order\n", u.ID, u.Name)
	}
}
```

### Line-by-line explanation breaking down each line

- EXISTS subquery pattern checks for the existence of related rows without counting them.
- SELECT 1 is a lightweight probe; the actual data from the subquery is not returned.
- The EXISTS clause enables efficient semi-join-like filtering.

### 2. Scalar subquery in SELECT

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type UserWithOrderCount struct {
	ID         int
	Name       string
	OrderCount int
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	// Scalar subquery in SELECT: compute order count per user
	rows, err := db.Query(`
		SELECT u.id, u.name,
		       (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
		FROM users u;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var users []UserWithOrderCount
	for rows.Next() {
		var u UserWithOrderCount
		if err := rows.Scan(&u.ID, &u.Name, &u.OrderCount); err != nil {
			log.Fatal("scan:", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, u := range users {
		fmt.Printf("User %d (%s) has %d orders\n", u.ID, u.Name, u.OrderCount)
	}
}
```

### Line-by-line explanation breaking down each line

- (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count: A scalar subquery computes a per-user metric added as a column.
- rows.Scan(&u.ID, &u.Name, &u.OrderCount): Map three result columns to the struct.

### 2.1 Takeaways about subqueries

- IN is good for simple membership filtering; EXISTS is often more efficient for presence checks.
- Scalar subqueries can provide computed columns without extra application-side joins.

## 3. Aggregations and Grouping: GROUP BY, HAVING, and Simple Totals

Aggregations summarize data, reveal trends, and enable reporting. We’ll cover typical patterns using GROUP BY and HAVING, with practical Go examples.

### 3. Total spend per user (GROUP BY)

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type UserTotal struct {
	UserID   int
	UserName string
	Total    float64
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT u.id, u.name, SUM(o.total) AS total_spent
		FROM users u
		LEFT JOIN orders o ON u.id = o.user_id
		GROUP BY u.id, u.name;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var totals []UserTotal
	for rows.Next() {
		var t UserTotal
		if err := rows.Scan(&t.UserID, &t.UserName, &t.Total); err != nil {
			log.Fatal("scan:", err)
		}
		totals = append(totals, t)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, t := range totals {
		fmt.Printf("User %d (%s) total: %.2f\n", t.UserID, t.UserName, t.Total)
	}
}
```

### Line-by-line explanation breaking down each line

- SUM(o.total) AS total_spent: Aggregates order totals per user.
- LEFT JOIN ensures users with zero orders appear with NULLs; summing NULLs yields NULL, so you typically handle via COALESCE(o.total, 0) if needed. Here the driver maps NULL to 0.0 semantics in some DBs; adjust if needed.
- GROUP BY u.id, u.name: Groups results by user to produce per-user totals.
- rows.Scan(&t.UserID, &t.UserName, &t.Total): Map grouped columns into the struct.

### 3. Filtering groups with HAVING

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type BigSpender struct {
	UserID   int
	UserName string
	Total    float64
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT u.id, u.name, SUM(o.total) AS total_spent
		FROM users u
		LEFT JOIN orders o ON u.id = o.user_id
		GROUP BY u.id, u.name
		HAVING SUM(o.total) > 1000;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var results []BigSpender
	for rows.Next() {
		var b BigSpender
		if err := rows.Scan(&b.UserID, &b.UserName, &b.Total); err != nil {
			log.Fatal("scan:", err)
		}
		results = append(results, b)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, r := range results {
		fmt.Printf("Top spender: User %d (%s) total %.2f\n", r.UserID, r.UserName, r.Total)
	}
}
```

### Line-by-line explanation breaking down each line

- HAVING SUM(o.total) > 1000: Filters groups after aggregation to only include high-spending users.
- The rest mirrors the previous example: grouping, scanning, and display.

### 3. Top N customers by spend (ORDER BY + LIMIT)

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type TopCustomer struct {
	UserID int
	Name   string
	Total  float64
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT u.id, u.name, COALESCE(SUM(o.total), 0) AS total_spent
		FROM users u
		LEFT JOIN orders o ON u.id = o.user_id
		GROUP BY u.id, u.name
		ORDER BY total_spent DESC
		LIMIT 5;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var top []TopCustomer
	for rows.Next() {
		var t TopCustomer
		if err := rows.Scan(&t.UserID, &t.Name, &t.Total); err != nil {
			log.Fatal("scan:", err)
		}
		top = append(top, t)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for i, c := range top {
		fmt.Printf("%d) User %d (%s) total %.2f\n", i+1, c.UserID, c.Name, c.Total)
	}
}
```

### Line-by-line explanation breaking down each line

- COALESCE(SUM(o.total), 0): Handles users with no orders by returning 0 instead of NULL.
- ORDER BY total_spent DESC: Ranks users by spending, newest first.
- LIMIT 5: Returns only the top 5 customers.

### 3.1 Takeaways about aggregations

- GROUP BY consolidates rows by key; HAVING filters groups after aggregation.
- Use COALESCE to normalize NULLs when aggregating over optional relations.
- For large datasets, prefer pre-aggregation strategies or proper indexing to avoid full scans.

## 4. Putting It All Together: Complex Reports with Joins, Subqueries, and Aggregations

In production, you often build layered queries that combine these techniques. Here we use a Common Table Expression (CTE) to pre-aggregate orders, then join to users and apply final filters. This pattern improves readability and helps the planner optimize complex queries.

### 4. Complex report using WITH (CTE), JOINs, and GROUP BY

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type UserReport struct {
	UserID    int
	UserName  string
	Total     float64
	OrderCount int
}

func main() {
	dsn := "postgres://dbuser:dbpass@localhost:5432/shopdb?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	rows, err := db.Query(`
		WITH user_totals AS (
			SELECT o.user_id,
			       SUM(o.total) AS total_spent,
			       COUNT(*) AS orders
			FROM orders o
			GROUP BY o.user_id
		)
		SELECT u.id, u.name, COALESCE(ut.total_spent, 0) AS total_spent, COALESCE(ut.orders, 0) AS orders
		FROM users u
		LEFT JOIN user_totals ut ON u.id = ut.user_id
		WHERE COALESCE(ut.total_spent, 0) > 500
		ORDER BY total_spent DESC
		LIMIT 20;
	`)
	if err != nil {
		log.Fatal("query:", err)
	}
	defer rows.Close()

	var reports []UserReport
	for rows.Next() {
		var r UserReport
		if err := rows.Scan(&r.UserID, &r.UserName, &r.Total, &r.OrderCount); err != nil {
			log.Fatal("scan:", err)
		}
		reports = append(reports, r)
	}
	if err := rows.Err(); err != nil {
		log.Fatal("rows err:", err)
	}

	for _, r := range reports {
		fmt.Printf("User %d (%s) - Total: %.2f over %d orders\n", r.UserID, r.UserName, r.Total, r.OrderCount)
	}
}
```

### Line-by-line explanation breaking down each line

- WITH user_totals AS (...): Define a reusable subquery that pre-aggregates totals and counts per user.
- LEFT JOIN user_totals ut ON u.id = ut.user_id: Combine users with their pre-aggregated metrics, including users with no orders.
- WHERE COALESCE(ut.total_spent, 0) > 500: Apply business rule to filter for meaningful spend.
- ORDER BY total_spent DESC LIMIT 20: Produce a top-20 report.
- rows.Scan(...): Map results into a dedicated report struct.

### 4.1 Takeaways for real systems

- Use CTEs to improve readability and help the optimizer reason about complex queries.
- Combine multiple SQL techniques in a single query to minimize database round-trips.
- Always map results explicitly to avoid misalignments when schema changes.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: N+1 Query Problem
  - Bad:
    ```
    for _, u := range users {
        rows, _ := db.Query("SELECT id, total FROM orders WHERE user_id = $1", u.ID)
        // process per-user orders
    }
    ```
  - Good:
    ```
    rows, _ := db.Query(`
        SELECT u.id, o.id, o.total
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.id IN (...)` // or fetch with a single join
    `)
    // process joined rows
    ```
  - Why it matters: Per-row queries explode latency and DB load for large user bases.

- Pitfall 2: String concatenation for queries (risk of SQL injection)
  - Bad:
    ```
    query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", name)
    db.Query(query)
    ```
  - Good:
    ```
    db.Query("SELECT * FROM users WHERE name = $1", name)
    ```
  - Why it matters: Parameterization prevents SQL injection and helps plan reuse.

- Pitfall 3: SELECT * in production
  - Bad:
    ```
    rows, _ := db.Query("SELECT * FROM orders")
    // scan blindly
    ```
  - Good:
    ```
    rows, _ := db.Query("SELECT id, user_id, total, created_at FROM orders")
    ```
  - Why it matters: Explicit columns improve performance, readability, and resilience to schema changes.

- Pitfall 4: Not handling NULLs in JOINs
  - Bad:
    ```
    var id int
    var total float64
    rows.Scan(&id, &total) // would fail if total is NULL
    ```
  - Good:
    ```
    var id int
    var total sql.NullFloat64
    rows.Scan(&id, &total)
    if total.Valid { fmt.Println(total.Float64) }
    ```
  - Why it matters: NULLs propagate through joins and can cause runtime errors if not handled.

## Y. Why This Matters In Real Systems — production context and real usage

- Correctness: Aggregations and joins determine business metrics (revenue, user activity) and influence analytics dashboards.
- Performance: Large data sets require efficient query shapes (JOINs vs subqueries vs CTEs) and proper indexing. Avoid the N+1 pattern; prefer single well-constructed queries.
- Maintainability: Explicit column lists and well-named aliases help future engineers understand the data model and prevent silent breakages if the schema evolves.
- Safety: Always use parameterized queries to prevent SQL injection and enable query plan caching.
- Observability: Use EXPLAIN ANALYZE in staging to understand query plans; monitor slow queries and optimize with indexes, partitioning, or materialized views when appropriate.

## Z. Study Questions — 5 recall questions

1. What is the main difference between INNER JOIN and LEFT JOIN, and when would you prefer one over the other?
2. How does EXISTS compare to IN in a subquery, and why might EXISTS be more efficient in some cases?
3. Explain the purpose of HAVING and how it differs from WHERE in a query with GROUP BY.
4. How can you compute a per-user total using an aggregate function, and how would you handle users with zero orders?
5. What is a Common Table Expression (CTE) and why might you use it when building complex reports that combine joins, subqueries, and aggregations?

## Exercise — practical multi-part coding challenge

Part A: Database connection and scaffolding
- Write a small Go program that connects to a PostgreSQL database (DSN from environment variables or constants). Ensure the connection is established and the connection pool is healthy with db.Ping.

Part B: Basic join-based report
- Implement a function that returns a slice of a struct containing UserID, UserName, and TotalSpent using an INNER JOIN and GROUP BY. Use COALESCE to handle null totals if needed. Map results into a Go struct and print a summary.

Part C: Subqueries in Go
- Implement two separate functions:
  - Function 1: Return the list of users who have at least one order with total > 100 using an IN subquery.
  - Function 2: Return a per-user count of how many orders they have using a scalar subquery in SELECT or a correlated EXISTS approach; do not compute in Go after fetching.
Each function should demonstrate proper error handling and use parameterized queries.

Part D: Complex report with CTE
- Create a function that builds a top-20 users report using a WITH (CTE) that pre-aggregates user totals and then joins to the users table. The final result should be ordered by total spent descending and limited to 20.

Part E: Practical considerations
- Add context-aware queries with a timeout context, and implement a prepared statement for at least one of the queries to demonstrate statement reuse.

Notes for implementation
- Use the pq driver (github.com/lib/pq) or an equivalent PostgreSQL driver.
- Use explicit column lists in SELECT statements.
- Use sql.NullX types where appropriate to handle NULLs.
- Ensure your code compiles as a single-file or small modularized Go example; you can create multiple functions in a single file to satisfy Part A–E.
- Include comments in your code to explain design decisions and edge cases.

This completes a structured, practical lesson on Advanced SQL concepts—JOINs, Subqueries, and Aggregations—applied in Go.