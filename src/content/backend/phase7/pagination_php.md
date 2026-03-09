# Track: Backend Engineering — Phase 7 — Advanced API Features: Pagination, Filtering & Sorting APIs (PHP)

Pagination, filtering, and sorting are cornerstone features for scalable APIs. They let clients request precisely the slice of data they need, reducing payloads, bandwidth, and server load while enabling responsive UIs. In PHP, building robust, secure, and performant pagination with optional filtering and sorting involves careful handling of input, safe SQL composition, and thoughtful metadata (total counts, total pages). This lesson walks you through practical patterns you can adapt in real-world PHP services.

## 1. Pagination basics with OFFSET/LIMIT (PHP PDO)

Code
```php
<?php
// Database connection (PDO)
$dsn = 'mysql:host=127.0.0.1;dbname=myshop';
$user = 'dbuser';
$pass = 'dbpass';
$pdo = new PDO($dsn, $user, $pass, [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// Pagination parameters from the request
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$perPage = isset($_GET['per_page']) ? max(1, intval($_GET['per_page'])) : 20;
$offset = ($page - 1) * $perPage;

// Retrieve a page of products
$sql = "SELECT id, name, price, category FROM products LIMIT :limit OFFSET :offset";
$stmt = $pdo->prepare($sql);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

// Total count for pagination metadata
$countSql = "SELECT COUNT(*) AS total FROM products";
$total = $pdo->query($countSql)->fetchColumn();

header('Content-Type: application/json');
echo json_encode([
  'data' => $rows,
  'page' => $page,
  'per_page' => $perPage,
  'total' => (int)$total,
  'total_pages' => (int)ceil($total / $perPage),
]);
?>
```

### Line-by-line explanation
- Line 1: Declares the PHP file.
- Lines 3-9: Establishes a PDO connection with error handling and associative fetch mode.
- Lines 12-14: Reads and sanitizes pagination parameters from the query string; defaults to page 1, 20 items per page.
- Line 15: Computes the SQL offset for the requested page.
- Lines 18-21: Prepares and executes a parameterized query using LIMIT and OFFSET to fetch the requested page of products.
- Line 22: Fetches results as an associative array.
- Lines 25-26: Runs a separate query to count the total number of rows (without pagination) to compute total pages.
- Lines 28-35: Returns a JSON response including the paginated data and metadata (current page, per-page, total count, and total pages).

## 2. Filtering and Sorting in the same endpoint (PHP PDO)

Code
```php
<?php
// Database connection (PDO)
$dsn = 'mysql:host=127.0.0.1;dbname=myshop';
$user = 'dbuser';
$pass = 'dbpass';
$pdo = new PDO($dsn, $user, $pass, [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// Pagination parameters
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$perPage = isset($_GET['per_page']) ? max(1, intval($_GET['per_page'])) : 20;
$offset = ($page - 1) * $perPage;

// Filtering parameters
$category = $_GET['category'] ?? null;
$priceMin = $_GET['price_min'] ?? null;
$priceMax = $_GET['price_max'] ?? null;
$search = $_GET['search'] ?? null;

// Sorting
$allowedSort = ['id','name','price','category'];
$sortBy = isset($_GET['sort_by']) && in_array($_GET['sort_by'], $allowedSort)
  ? $_GET['sort_by'] : 'id';
$sortOrder = (isset($_GET['sort_order']) && strtolower($_GET['sort_order']) === 'desc') ? 'DESC' : 'ASC';

// Build dynamic WHERE clause
$conditions = [];
$params = [];

if ($category) { $conditions[] = "category = :category"; $params[':category'] = $category; }
if ($priceMin !== null && $priceMin !== '') { $conditions[] = "price >= :price_min"; $params[':price_min'] = $priceMin; }
if ($priceMax !== null && $priceMax !== '') { $conditions[] = "price <= :price_max"; $params[':price_max'] = $priceMax; }
if ($search) { $conditions[] = "(name LIKE :search OR description LIKE :search)"; $params[':search'] = "%$search%"; }

$where = $conditions ? "WHERE " . implode(' AND ', $conditions) : "";

// Main data query
$sql = "SELECT id, name, price, category FROM products $where ORDER BY $sortBy $sortOrder LIMIT :limit OFFSET :offset";
$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) {
  $stmt->bindValue($k, $v, is_numeric($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

// Total count with the same filters
$countSql = "SELECT COUNT(*) FROM products $where";
$countStmt = $pdo->prepare($countSql);
foreach ($params as $k => $v) {
  $countStmt->bindValue($k, $v, is_numeric($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$countStmt->execute();
$total = $countStmt->fetchColumn();

header('Content-Type: application/json');
echo json_encode([
  'data' => $rows,
  'page' => $page,
  'per_page' => $perPage,
  'total' => (int)$total,
  'total_pages' => (int)ceil($total / $perPage),
]);
?>
```

### Line-by-line explanation
- Line 1: PHP opening tag.
- Lines 3-9: Creates a PDO connection with strict error reporting and associative fetch mode.
- Lines 12-14: Reads and default-sanitizes page and per_page parameters.
- Line 15: Computes offset for pagination.
- Section "Filtering parameters" (Lines 18-21): Reads optional filters (category, price_min, price_max, search) from the request and stores them for binding.
- Lines 24-28: Defines a whitelist of sortable columns and validates sort_by; defaults to id; reads sort_order with a safe default.
- Lines 30-34: Builds dynamic where clause from provided filters. The $params array collects bound values for prepared statements.
- Line 36: Constructs the final WHERE clause string if any filters exist.
- Lines 39-46: Prepares and executes the main data query with ORDER BY, LIMIT, and OFFSET. Binds parameters safely and fetches results.
- Lines 49-55: Builds and executes a parallel count query using the same WHERE filters to obtain total results for pagination.
- Lines 57-66: Returns the JSON response including data and pagination metadata.

## 3. Putting It All Together: Robust, reusable API builder (PHP PDO)

Code
```php
<?php
function getProducts(PDO $pdo, array $params): array {
  // Normalize pagination
  $page = max(1, intval($params['page'] ?? 1));
  $perPage = max(1, intval($params['per_page'] ?? 20));
  $offset = ($page - 1) * $perPage;

  // Build dynamic WHERE clause
  $where = [];
  $bind = [];

  if (!empty($params['category'])) {
    $where[] = "category = :category";
    $bind[':category'] = $params['category'];
  }
  if (isset($params['price_min'])) {
    $where[] = "price >= :price_min";
    $bind[':price_min'] = $params['price_min'];
  }
  if (isset($params['price_max'])) {
    $where[] = "price <= :price_max";
    $bind[':price_max'] = $params['price_max'];
  }
  if (!empty($params['search'])) {
    $where[] = "(name LIKE :search OR description LIKE :search)";
    $bind[':search'] = '%' . $params['search'] . '%';
  }

  $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

  // Safe sorting
  $allowedSort = ['id','name','price','category'];
  $sortBy = in_array($params['sort_by'] ?? '', $allowedSort) ? $params['sort_by'] : 'id';
  $sortOrder = (strtolower($params['sort_order'] ?? 'asc') === 'desc') ? 'DESC' : 'ASC';

  // Data query
  $sql = "SELECT id, name, price, category FROM products $whereSql ORDER BY $sortBy $sortOrder LIMIT :limit OFFSET :offset";
  $stmt = $pdo->prepare($sql);
  foreach ($bind as $k => $v) {
    $stmt->bindValue($k, $v, is_numeric($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
  }
  $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
  $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
  $stmt->execute();
  $data = $stmt->fetchAll();

  // Total count with same filters
  $countSql = "SELECT COUNT(*) FROM products $whereSql";
  $countStmt = $pdo->prepare($countSql);
  foreach ($bind as $k => $v) {
    $countStmt->bindValue($k, $v, is_numeric($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
  }
  $countStmt->execute();
  $total = (int)$countStmt->fetchColumn();

  return [
    'data' => $data,
    'page' => $page,
    'per_page' => $perPage,
    'total' => $total,
    'total_pages' => (int)ceil($total / $perPage),
  ];
}

// Example usage
$dsn = 'mysql:host=127.0.0.1;dbname=myshop';
$pdo = new PDO($dsn, 'dbuser', 'dbpass', [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$params = array_merge($_GET, [
  'page' => $_GET['page'] ?? 1,
  'per_page' => $_GET['per_page'] ?? 20,
]);

$result = getProducts($pdo, $params);

header('Content-Type: application/json');
echo json_encode($result);
```

### Line-by-line explanation
- Function header (Line 1): Declares a reusable function getProducts that accepts a PDO instance and a params array.
- Lines 3-7: Normalizes pagination inputs, ensuring sane defaults and bounds.
- Lines 10-21: Builds a dynamic WHERE clause. Each provided filter appends a condition and a bound value.
- Line 23: Converts the where conditions into a SQL fragment; empty when there are no filters.
- Section "Safe sorting" (Lines 26-28): Publicly allowed sort columns are whitelisted; sort_by is chosen from that list with a safe default.
- Data query (Line 31): Constructs the final SQL for data retrieval with ORDER BY, LIMIT, and OFFSET.
- Binding parameters (Lines 32-37): Binds all filter values safely; ensures correct type handling.
- Lines 38-39: Executes the data query and fetches results.
- Total count (Lines 42-49): Reuses the same filters to count total matching rows.
- Output assembly (Line 51): Returns a structured array with data and pagination metadata.
- Usage example (Lines 54-66): Demonstrates how to instantiate a PDO connection, collect request params, call the helper, and emit JSON.

X. Common Beginner Mistakes — 4 real pitfalls with bad vs good code

- Pitfall 1: Exposing raw user input in ORDER BY
  Bad:
  ```php
  // user can inject SQL through sort_by
  $sql = "SELECT * FROM products ORDER BY " . $_GET['sort_by'] . " " . $_GET['sort_order'];
  ```
  Good:
  ```php
  // whitelist allowed sort columns
  $allowedSort = ['id','name','price','category'];
  $sortBy = in_array($_GET['sort_by'], $allowedSort) ? $_GET['sort_by'] : 'id';
  $sortOrder = (strtolower($_GET['sort_order'] ?? 'asc') === 'desc') ? 'DESC' : 'ASC';
  $sql = "SELECT * FROM products ORDER BY $sortBy $sortOrder";
  ```
  Explanation: Always whitelist sortable columns. Do not directly interpolate user input into SQL. Sorting by an untrusted column opens SQL injection and breaks query plans.

- Pitfall 2: Not using prepared statements for filters
  Bad:
  ```php
  $category = $_GET['category'];
  $where = "WHERE category = '$category'";
  $sql = "SELECT * FROM products $where";
  ```
  Good:
  ```php
  $where = [];
  $params = [];
  if (!empty($_GET['category'])) {
    $where[] = "category = :category";
    $params[':category'] = $_GET['category'];
  }
  $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
  $stmt = $pdo->prepare("SELECT * FROM products $whereSql");
  foreach ($params as $k => $v) { $stmt->bindValue($k, $v, PDO::PARAM_STR); }
  ```
  Explanation: Use prepared statements and parameter binding for all user-supplied values to prevent SQL injection.

- Pitfall 3: Mismatched total count when filters apply
  Bad:
  ```php
  $countSql = "SELECT COUNT(*) FROM products";
  // no filters applied to total
  ```
  Good:
  ```php
  $countSql = "SELECT COUNT(*) FROM products $whereSql";
  // same filters as data query
  ```
  Explanation: The pagination metadata (total) must reflect the same filtering criteria as the data query to avoid misleading page counts.

- Pitfall 4: No input validation for per_page and page
  Bad:
  ```php
  $perPage = $_GET['per_page']; // could be string, huge number, or zero
  ```
  Good:
  ```php
  $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
  $perPage = isset($_GET['per_page']) ? max(1, min(100, intval($_GET['per_page'] ?? 20))) : 20;
  ```
  Explanation: Validate and constrain page sizes to sane ranges to prevent abuse and ensure stable performance.

Y. Why This Matters In Real Systems — production context and real usage

- Consistent API contracts: Return a stable JSON shape (data, page, per_page, total, total_pages). Clients rely on this for infinite scrolling, paginated lists, or dashboards.
- Indexing strategy: Create indexes on columns used for filtering (category, price) and sorting (price, name). For price ranges, consider composite indexes that support range queries to minimize full table scans.
- Performance tradeoffs: OFFSET-based pagination is simple but can become slow with large offsets on big tables. For very large datasets, explore keyset (cursor-based) pagination. Example: paginate by a monotonically increasing key (e.g., id or created_at) with a last_seen_id/last_value token.
- Consistent total counts: If total counts fluctuate due to high write activity, consider caching the total or returning approximate counts with a refresh strategy, while still providing exact counts when feasible.
- Security and correctness: Always constrain sort fields, validate inputs, and keep the API resilient to invalid queries. Provide helpful error messages and sensible defaults.
- API design realism: Support empty results gracefully, document query parameters (names, accepted values), and consider versioning if you introduce breaking changes.

Z. Study Questions — 5 recall questions

1) What is the difference between offset-based pagination and cursor-based (keyset) pagination, and when would you choose one over the other?
2) Why is whitelisting sortable columns critical, and how do you implement it in PHP?
3) How do you ensure the total count reported by a paginated endpoint matches the applied filters?
4) What are common performance pitfalls with pagination on large datasets, and what are two strategies to mitigate them?
5) How would you extend a simple pagination endpoint to include filtering by multiple fields and sorting by a chosen column?

Exercise — a practical multi-part coding challenge

Part A — Implement a paginated products endpoint with filters
- Create a PHP script (e.g., api/products.php) that:
  - Accepts GET parameters: page, per_page, category, price_min, price_max, search, sort_by, sort_order.
  - Uses PDO with prepared statements and an allowlist for sort_by.
  - Returns a JSON object with data, page, per_page, total, total_pages.
  - Applies the same filters to both the data query and the total count.

Part B — Add robust validation and defaults
- Validate per_page to be between 1 and 100, default to 20.
- Default sort_by to id and sort_order to ASC if not provided or invalid.
- Ensure negative or malformed inputs are handled gracefully with sensible defaults and no runtime errors.

Part C — Demonstrate a combined usage pattern
- Show an example curl call:
  - curl "https://example.com/api/products.php?page=2&per_page=25&category=electronics&price_min=50&price_max=500&search=watch&sort_by=price&sort_order=desc"
- Explain what the response should contain and how the client would calculate total_pages.

Part D — Optional: Implement a reusable helper (getProducts)
- Refactor the logic into a PHP function as shown in Section 3, then use it in a lightweight route to handle requests.
- Ensure the helper returns the same structured payload as the endpoint in Part A.

This completes a practical, secure, and scalable approach to pagination, filtering, and sorting in PHP-based backends.