# Track: Backend Engineering — Phase 7: Advanced API Features

Pagination, filtering, and sorting are foundational for building scalable, user-friendly APIs. When done well, clients can fetch exactly the data they need without over-fetching, and services can maintain performance as datasets grow. In Go, you can implement robust pagination, filtering, and sorting with clear parameter design, careful handling of edge cases, and safe integration with both in-memory data and relational databases.

## 1. API Query Parameters: Pagination, Filtering, Sorting Concepts

This section defines the common query parameters and a small parsing utility to normalize inputs, set sane defaults, and validate values before applying them to your data.

```go
package main

import (
	"net/http"
	"strconv"
	"strings"
)

func parseQueryParams(r *http.Request) (page int, pageSize int, sortBy string, sortDir string, category string, minPrice string, maxPrice string) {
	// Defaults
	page = 1
	pageSize = 10
	sortBy = "id"
	sortDir = "asc"

	// Page
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}

	// Page size
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 {
			pageSize = v
		}
	}

	// Sorting
	if s := r.URL.Query().Get("sort_by"); s != "" {
		sortBy = strings.ToLower(s)
	}
	if d := r.URL.Query().Get("sort_dir"); d != "" {
		sortDir = strings.ToLower(d)
	}
	// Basic normalization
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "asc"
	}

	// Filtering
	category = r.URL.Query().Get("category")
	minPrice = r.URL.Query().Get("min_price")
	maxPrice = r.URL.Query().Get("max_price")

	return
}
```

### Line-by-line explanation
- package main: declares the executable package.
- import block: brings in necessary packages for HTTP handling, string manipulation, and numeric parsing.
- func parseQueryParams(...): defines a helper to read and normalize query params.
- page/pageSize defaults: ensures sensible defaults when parameters are omitted.
- page parsing: converts the page string to an int, validating it's > 0.
- page_size parsing: same approach for page_size.
- sort_by handling: defaults to "id" if not provided; lowercased for normalization.
- sort_dir handling: defaults to "asc"; restricted to "asc" or "desc".
- category/min_price/max_price: pass-through for optional filters used later in data processing.
- Return values: provide all parsed values to the caller for filtering, sorting, and pagination.

---

## 2. Go Implementation: In-Memory Dataset with Pagination, Filtering & Sorting

This section provides a working HTTP endpoint backed by an in-memory dataset. It demonstrates applying filters, dynamic sorting, and page-based slicing. It also returns a structured response with total count and paging metadata.

```go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Product struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	Price     float64   `json:"price"`
	Rating    float64   `json:"rating"`
	CreatedAt time.Time `json:"created_at"`
}

var products = []Product{
	{1, "Hammer", "Tools", 12.99, 4.2, time.Now().AddDate(0, 0, -10)},
	{2, "Screwdriver", "Tools", 7.50, 4.0, time.Now().AddDate(0, 0, -5)},
	{3, "Blue Widget", "Gadgets", 29.99, 4.8, time.Now().AddDate(0, 0, -2)},
	{4, "Red Widget", "Gadgets", 29.99, 4.5, time.Now().AddDate(0, 0, -1)},
	{5, "Allen Key", "Tools", 3.75, 3.9, time.Now().AddDate(0, 0, -20)},
	{6, "Drill", "Tools", 79.99, 4.6, time.Now().AddDate(0, 0, -3)},
	{7, "Smartphone Case", "Accessories", 9.99, 4.1, time.Now().AddDate(0, 0, -7)},
	{8, "USB Cable", "Accessories", 4.99, 4.0, time.Now().AddDate(0, 0, -15)},
}

type PagedResponse struct {
	Data      []Product `json:"data"`
	Total     int       `json:"total"`
	Page      int       `json:"page"`
	PageSize  int       `json:"page_size"`
	Timestamp int64     `json:"timestamp"`
}

func main() {
	http.HandleFunc("/api/products", productsHandler)
	log.Println("Starting server on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
	// Parse query
	page, pageSize, sortBy, sortDir, category, minPStr, maxPStr := parseQueryParams(r)

	// Convert price filters
	var minP, maxP float64
	var hasMin, hasMax bool
	if minPStr != "" {
		if v, err := strconv.ParseFloat(minPStr, 64); err == nil {
			minP = v
			hasMin = true
		}
	}
	if maxPStr != "" {
		if v, err := strconv.ParseFloat(maxPStr, 64); err == nil {
			maxP = v
			hasMax = true
		}
	}

	// Filter
	filtered := make([]Product, 0, len(products))
	for _, p := range products {
		// Category filter
		if category != "" && p.Category != category {
			continue
		}
		// Price filters
		if hasMin && p.Price < minP {
			continue
		}
		if hasMax && p.Price > maxP {
			continue
		}
		filtered = append(filtered, p)
	}

	// Sort
	sortProducts(filtered, sortBy, sortDir)

	// Paginate
	start := (page - 1) * pageSize
	if start < 0 {
		start = 0
	}
	end := start + pageSize
	if end > len(filtered) {
		end = len(filtered)
	}
	pageData := filtered
	if start < len(filtered) {
		pageData = filtered[start:end]
	} else {
		pageData = []Product{}
	}

	// Response
	resp := PagedResponse{
		Data:      pageData,
		Total:     len(filtered),
		Page:      page,
		PageSize:  pageSize,
		Timestamp: timeNowUnix(),
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// Helpers

func timeNowUnix() int64 {
	return time.Now().Unix()
}

func sortProducts(arr []Product, sortBy, sortDir string) {
	less := func(i, j int) bool { return true }

	switch sortBy {
	case "name":
		less = func(i, j int) bool {
			if sortDir == "asc" {
				return arr[i].Name < arr[j].Name
			}
			return arr[i].Name > arr[j].Name
		}
	case "category":
		less = func(i, j int) bool {
			if sortDir == "asc" {
				return arr[i].Category < arr[j].Category
			}
			return arr[i].Category > arr[j].Category
		}
	case "price":
		less = func(i, j int) bool {
			if sortDir == "asc" {
				return arr[i].Price < arr[j].Price
			}
			return arr[i].Price > arr[j].Price
		}
	case "rating":
		less = func(i, j int) bool {
			if sortDir == "asc" {
				return arr[i].Rating < arr[j].Rating
			}
			return arr[i].Rating > arr[j].Rating
		}
	case "created_at":
		less = func(i, j int) bool {
			if sortDir == "asc" {
				return arr[i].CreatedAt.Before(arr[j].CreatedAt)
			}
			return arr[i].CreatedAt.After(arr[j].CreatedAt)
		}
	default: // id
		less = func(i, j int) bool {
			if sortDir == "asc" {
				return arr[i].ID < arr[j].ID
			}
			return arr[i].ID > arr[j].ID
		}
	}
	// Stable sort to keep equal elements in original order
	sort.SliceStable(arr, less)
}
```

### Line-by-line explanation
- Product struct: defines the shape of a product with JSON tags for API responses.
- products: in-memory dataset to power the demo endpoint.
- PagedResponse: standard response wrapper including data and paging metadata.
- main: starts HTTP server and routes /api/products to the handler.
- productsHandler: main HTTP handler performing parse, filter, sort, and paginate.
- parseQueryParams: reuses the helper to extract and normalize query params.
- Price filters: convert min_price/max_price strings to numbers when provided.
- Filtering loop: applies category and price constraints to the dataset.
- Sorting: delegates to sortProducts to apply the chosen field and direction.
- Pagination: computes start/end indices, handles bounds, slices the data.
- Response: builds a JSON object with data, total matches, current page, page size, and a timestamp.
- timeNowUnix: helper to produce a numeric timestamp for the response.
- sortProducts: generic sorting using sort.SliceStable based on a whitelisted set of fields to prevent injection and ensure deterministic ordering.

---

## 3. Extending to DB Queries: Safe, Scalable SQL with WHERE, ORDER BY, LIMIT/OFFSET

In production, you’ll typically query a relational database. This section shows a safe pattern for building dynamic SQL with a whitelist of sortable fields, optional filters, and pagination. It emphasizes parameter binding to prevent SQL injection and demonstrates how to compute total counts for correct pagination UX.

```go
package db

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type ProductRow struct {
	ID        int
	Name      string
	Category  string
	Price     float64
	CreatedAt time.Time
}

func queryProducts(db *sql.DB, page, pageSize int, sortBy, sortDir, category string, minP, maxP *float64) ([]ProductRow, int, error) {
	allowedSort := map[string]bool{
		"id":         true,
		"name":       true,
		"category":   true,
		"price":      true,
		"created_at": true,
	}
	if !allowedSort[sortBy] {
		sortBy = "id"
	}
	dir := "ASC"
	if strings.EqualFold(sortDir, "desc") {
		dir = "DESC"
	}

	// Build WHERE clause
	clauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if category != "" {
		clauses = append(clauses, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, category)
		argIdx++
	}
	if minP != nil {
		clauses = append(clauses, fmt.Sprintf("price >= $%d", argIdx))
		args = append(args, *minP)
		argIdx++
	}
	if maxP != nil {
		clauses = append(clauses, fmt.Sprintf("price <= $%d", argIdx))
		args = append(args, *maxP)
		argIdx++
	}
	whereClause := ""
	if len(clauses) > 0 {
		whereClause = "WHERE " + strings.Join(clauses, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM products %s", whereClause)
	var total int
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// ORDER BY and LIMIT/OFFSET
	orderClause := fmt.Sprintf("ORDER BY %s %s", sortBy, dir)
	limitClause := fmt.Sprintf("LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, pageSize, (page-1)*pageSize)

	query := fmt.Sprintf("SELECT id, name, category, price, created_at FROM products %s %s %s", whereClause, orderClause, limitClause)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	results := []ProductRow{}
	for rows.Next() {
		var pr ProductRow
		if err := rows.Scan(&pr.ID, &pr.Name, &pr.Category, &pr.Price, &pr.CreatedAt); err != nil {
			return nil, 0, err
		}
		results = append(results, pr)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return results, total, nil
}
```

### Line-by-line explanation
- package db: defines a small DB helper package.
- ProductRow: struct matching the columns retrieved from the database.
- queryProducts: function that builds and executes a dynamic query with pagination and filters.
- allowedSort map: whitelists valid sort fields to prevent arbitrary column injection.
- sortBy validation: falls back to "id" if the requested sort field is not allowed.
- sort direction: uses ASC for default; DESC when requested.
- WHERE clause construction: adds conditions for category and price filters as parameterized expressions.
- args slice and argIdx: track SQL parameters and their positions for PostgreSQL style placeholders $1, $2, ...
- total count query: executes a separate COUNT(*) query using the same filters to compute total results for paging metadata.
- main data query: selects the required columns with the computed filters, sort, and pagination.
- rows scanning: iterates over results and builds ProductRow objects.
- error handling: returns any error encountered during queries or scanning.
- This pattern keeps data access safe (parameterized queries), scalable, and flexible for complex filtering and sorting needs.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Unvalidated query parameters
  - Bad
  - Good

Bad:
```go
// Do not rely on defaults; this can panic or misbehave
page, _ := strconv.Atoi(r.URL.Query().Get("page"))
pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
```

Good:
```go
page := 1
pageSize := 10
if p := r.URL.Query().Get("page"); p != "" {
    if v, err := strconv.Atoi(p); err == nil && v > 0 {
        page = v
    }
}
if ps := r.URL.Query().Get("page_size"); ps != "" {
    if v, err := strconv.Atoi(ps); err == nil && v > 0 {
        pageSize = v
    }
}
```

- Pitfall 2: Allowing raw sort column from client (SQL injection risk)
  - Bad
  - Good

Bad:
```go
order := fmt.Sprintf("ORDER BY %s %s", r.URL.Query().Get("sort_by"), strings.ToUpper(r.URL.Query().Get("sort_dir")))
rows, _ := db.Query("SELECT id, name FROM products " + order)
```

Good:
```go
sortBy := "id"
if allowedSorts[r.URL.Query().Get("sort_by")] {
    sortBy = r.URL.Query().Get("sort_by")
}
sortDir := "ASC"
if strings.EqualFold(r.URL.Query().Get("sort_dir"), "desc") {
    sortDir = "DESC"
}
order := fmt.Sprintf("ORDER BY %s %s", sortBy, sortDir)
// use parameterized query safely; avoid injecting raw values into SQL
```

- Pitfall 3: Not including total count or page metadata
  - Bad
  - Good

Bad:
```go
rows, _ := db.Query("SELECT id, name FROM products LIMIT ? OFFSET ?", pageSize, (page-1)*pageSize)
// missing total count
```

Good:
```go
// Compute total and include it in the response so clients can render pagination controls
var total int
db.QueryRow("SELECT COUNT(*) FROM products").Scan(&total)
// then fetch the page data with LIMIT/OFFSET
```

---

## Y. Why This Matters In Real Systems — production context and real usage

- UX and performance: Clients rely on consistent, fast responses with predictable paging. Returning total counts and stable sort orders improves user experience in dashboards and marketplaces.
- Data scale: For large datasets, offset-based pagination (LIMIT/OFFSET) can become inefficient. Cursor-based pagination or keyset pagination can improve performance, but offset-based is easier to implement initially.
- Consistency and determinism: Stable sorting with deterministic tie-breakers (e.g., id as secondary key) prevents row duplication or missing items between pages when sort fields have equal values.
- Security: Always whitelist sortable fields and use parameterized queries to prevent SQL injection when building dynamic ORDER BY or WHERE clauses.
- Architecture considerations: In real systems, you often implement the API contract and data access layer separately, use caching for frequently requested pages, and ensure observability with metrics around paging performance.

---

## Z. Study Questions — 5 recall questions

1) What are the typical query parameters used for offset-based pagination, and what are their defaults?
2) How do you implement safe sorting when the client can request a sort field, and why is whitelisting important?
3) Why should you include the total number of results in a paginated response?
4) What is the difference between in-memory data pagination and database-backed pagination, and what are the trade-offs?
5) How can you extend a basic paginator to support filtering by multiple fields (e.g., category and price range) without breaking the API contract?

---

## Exercise — a practical multi-part coding challenge

Goal: Build a robust, production-friendly API endpoint in Go that supports pagination, filtering, and sorting against an in-memory dataset, then sketch how you would migrate to a database-backed implementation.

Part A: End-to-end in-memory endpoint enhancements
- Extend the in-memory demo to:
  - Return a "links" object in the JSON response containing next and previous page URLs (based on the current request).
  - Add a new text search filter param q that matches case-insensitive across Name and Category.
  - Ensure deterministic pagination by using a stable sort with a tie-breaker on ID when sort fields are equal.
- Deliverables:
  - Updated handler that composes a response with Data, Total, Page, PageSize, and Links { next, prev }.
  - Updated sort and filter logic to respect the new q parameter and stable ordering.

Part B: Documentation-driven API contract
- Write a short API contract snippet describing:
  - Endpoint: GET /api/products
  - Query parameters: page, page_size, sort_by, sort_dir, category, min_price, max_price, q
  - Response schema: data[], total, page, page_size, links{ next, prev }
- Include example request and response payloads.

Part C: (Optional) Planning for DB migration
- Outline how you would replace the in-memory dataset with a relational database.
  - What queries would you reuse or translate (filters, sorting, pagination)?
  - How would you compute the total count efficiently with the same filters?
  - What considerations would guide the choice between OFFSET-based vs. cursor-based pagination in your system?

Hints:
- Start from the in-memory code in Section 2. Incrementally add the features described in Part A, validating with curl/httpie requests like:
  - curl "http://localhost:8080/api/products?page=1&page_size=5&sort_by=price&sort_dir=asc&category=Tools&min_price=5&max_price=50&q=widget"
- Keep APIs backward-compatible where possible; when adding new optional parameters, ensure defaults preserve existing behavior.

This completes Phase 7: Advanced API Features for Pagination, Filtering & Sorting APIs in Go.