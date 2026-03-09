# Phase 7 — Advanced API Features: Pagination, Filtering & Sorting APIs (Ruby)

In modern backend systems, APIs must deliver data efficiently while supporting flexible client experiences. Pagination reduces payloads, filtering narrows results to relevant records, and sorting helps clients present data in meaningful orders. This lesson (Ruby-focused) teaches you how to build clean, safe, and scalable API endpoints that combine pagination, filtering, and sorting for production-ready applications.

## 1. Pagination Fundamentals

Implementing pagination with offset/limit is the most common starting point. This section shows a simple Rails controller action that pages through Product records using page and per_page parameters.

```ruby
# app/controllers/api/v1/products_controller.rb
class Api::V1::ProductsController < ApplicationController
  def index
    per_page = [(params[:per_page] || 20).to_i, 1].max
    page = [(params[:page] || 1).to_i, 1].max

    products = Product.all
    total_count = products.count
    products = products.offset((page - 1) * per_page).limit(per_page)

    render json: {
      total: total_count,
      page: page,
      per_page: per_page,
      data: products
    }
  end
end
```

### Line-by-line explanation
- class Api::V1::ProductsController < ApplicationController: Defines a Rails API controller for version 1 of products.
- def index: Declares the index action to return a list of products.
- per_page = [(params[:per_page] || 20).to_i, 1].max: Safely parses per_page, defaults to 20, ensures a minimum of 1.
- page = [(params[:page] || 1).to_i, 1].max: Safely parses page, defaults to 1, ensures a minimum of 1.
- products = Product.all: Starts with all Product records.
- total_count = products.count: Counts total records before applying pagination.
- products = products.offset((page - 1) * per_page).limit(per_page): Applies offset and limit to fetch the requested page.
- render json: { ... }: Returns a JSON payload including total, page, per_page, and the data slice.

## 2. Filtering API Data

Filtering narrows results by attributes (e.g., category, price range). This example shows how to apply optional filters in a Rails controller while preserving pagination.

```ruby
# app/controllers/api/v1/products_controller.rb
class Api::V1::ProductsController < ApplicationController
  def index
    per_page = [(params[:per_page] || 20).to_i, 1].max
    page = [(params[:page] || 1).to_i, 1].max

    products = Product.all

    # Optional filters
    products = products.where(category: params[:category]) if params[:category].present?
    products = products.where('price >= ?', params[:min_price].to_f) if params[:min_price].present?
    products = products.where('price <= ?', params[:max_price].to_f) if params[:max_price].present?

    total_count = products.count
    products = products.offset((page - 1) * per_page).limit(per_page)

    render json: {
      total: total_count,
      page: page,
      per_page: per_page,
      data: products
    }
  end
end
```

### Line-by-line explanation
- products = Product.all: Start with all products as the base relation.
- products = products.where(category: params[:category]) if params[:category].present?: If a category param is provided, filter by that category.
- products = products.where('price >= ?', params[:min_price].to_f) if params[:min_price].present?: If a min_price is provided, filter to price >= min_price (safe, parameterized).
- products = products.where('price <= ?', params[:max_price].to_f) if params[:max_price].present?: If a max_price is provided, filter to price <= max_price.
- total_count = products.count: Count total results after applying filters (before pagination).
- products = products.offset((page - 1) * per_page).limit(per_page): Paginate based on page and per_page after filters.
- render json: { ... }: Return structured response with counts and paginated data.

## 3. Sorting Results

Sorting allows clients to define the order of results. To prevent SQL injection, always whitelist sortable columns and sanitize direction.

```ruby
# app/controllers/api/v1/products_controller.rb
class Api::V1::ProductsController < ApplicationController
  ALLOWED_SORT_COLUMNS = %w[name price created_at rating].freeze

  def index
    per_page = [(params[:per_page] || 20).to_i, 1].max
    page = [(params[:page] || 1).to_i, 1].max

    sort_by = (params[:sort_by] || 'created_at').to_s
    sort_dir = (params[:sort_dir] || 'desc').to_s.downcase

    sort_by = 'created_at' unless ALLOWED_SORT_COLUMNS.include?(sort_by)
    sort_dir = %w[asc desc].include?(sort_dir) ? sort_dir : 'desc'

    products = Product.order("#{sort_by} #{sort_dir}")
                      .offset((page - 1) * per_page)
                      .limit(per_page)

    total_count = Product.count

    render json: {
      total: total_count,
      page: page,
      per_page: per_page,
      sort_by: sort_by,
      sort_dir: sort_dir,
      data: products
    }
  end
end
```

### Line-by-line explanation
- ALLOWED_SORT_COLUMNS = %w[name price created_at rating].freeze: Defines safe columns you may sort by.
- sort_by = (params[:sort_by] || 'created_at').to_s: Reads client sort column, defaults to created_at.
- sort_dir = (params[:sort_dir] || 'desc').to_s.downcase: Reads sort direction, defaults to descending.
- sort_by = 'created_at' unless ALLOWED_SORT_COLUMNS.include?(sort_by): Reverts to a safe column if the client provided an invalid one.
- sort_dir = %w[asc desc].include?(sort_dir) ? sort_dir : 'desc': Ensures direction is only asc or desc.
- Product.order("#{sort_by} #{sort_dir}"): Builds a safe ORDER BY clause using sanitized inputs.
- .offset((page - 1) * per_page).limit(per_page): Applies pagination after sorting.
- total_count = Product.count: Total number of products (unfiltered here; adjust if you also support filters).
- render json: { ... }: Returns the sorted, paginated results along with metadata.

Note: For larger datasets or complex filters, consider using a gem like Kaminari or WillPaginate for pagination, which can simplify code and support cursor-like features for large-scale APIs.

## 4. Efficient Combination and API Design

In real apps, you’ll often need to combine pagination, filtering, and sorting. This example shows a cohesive approach while emphasizing performance cautions and clean parameter handling.

```ruby
# app/controllers/api/v1/products_controller.rb
class Api::V1::ProductsController < ApplicationController
  ALLOWED_SORT_COLUMNS = %w[name price created_at rating].freeze

  def index
    per_page = [(params[:per_page] || 20).to_i, 1].max
    page = [(params[:page] || 1).to_i, 1].max

    # Start with a base scope that can be chained
    scope = Product.all

    # Optional filters
    scope = scope.where(category: params[:category]) if params[:category].present?
    scope = scope.where('price >= ?', params[:min_price].to_f) if params[:min_price].present?
    scope = scope.where('price <= ?', params[:max_price].to_f) if params[:max_price].present?

    # Sorting with whitelist
    sort_by = (params[:sort_by] || 'created_at').to_s
    sort_dir = (params[:sort_dir] || 'desc').to_s.downcase
    sort_by = 'created_at' unless ALLOWED_SORT_COLUMNS.include?(sort_by)
    sort_dir = %w[asc desc].include?(sort_dir) ? sort_dir : 'desc'
    scope = scope.order("#{sort_by} #{sort_dir}")

    # Total count for pagination metadata
    total_count = scope.count

    # Pagination
    scope = scope.offset((page - 1) * per_page).limit(per_page)

    render json: {
      total: total_count,
      page: page,
      per_page: per_page,
      sort_by: sort_by,
      sort_dir: sort_dir,
      data: scope
    }
  end
end
```

### Line-by-line explanation
- scope = Product.all: Establishes a base query that can be chained with filters, sort, and pagination.
- scope = scope.where(category: params[:category]) if params[:category].present?: Optional category filter.
- scope = scope.where('price >= ?', params[:min_price].to_f) if params[:min_price].present?: Optional min price filter.
- scope = scope.where('price <= ?', params[:max_price].to_f) if params[:max_price].present?: Optional max price filter.
- scope = scope.order("#{sort_by} #{sort_dir}"): Apply a safe ORDER BY after validation.
- total_count = scope.count: Count the filtered dataset before pagination.
- scope = scope.offset((page - 1) * per_page).limit(per_page): Paginate the filtered and sorted scope.
- render json: { ... data: scope }: Return results with metadata.

Optional production notes
- You can swap to a paging gem like Kaminari: Product.page(page).per(per_page)
- Consider cursor-based (keyset) pagination for very large datasets to avoid expensive offset scans.

## 5. Common Beginner Mistakes

- Bad: Potential SQL injection in ORDER BY due to unsanitized sort parameters.
  Good: Whitelist sort columns and sanitize direction.
  Bad
  ```ruby
  # Dangerous: direct interpolation of user input
  Product.order("#{params[:sort_by]} #{params[:sort_dir]}")
  ```
  Good
  ```ruby
  ALLOWED_SORT_COLUMNS = %w[name price created_at]
  sort_by = (params[:sort_by] || 'created_at')
  sort_by = 'created_at' unless ALLOWED_SORT_COLUMNS.include?(sort_by)
  sort_dir = %w[asc desc].include?(params[:sort_dir].to_s) ? params[:sort_dir] : 'desc'
  Product.order("#{sort_by} #{sort_dir}")
  ```
- Bad: Not validating page/per_page leading to negative or zero values.
  Good
  ```ruby
  per_page = [(params[:per_page] || 20).to_i, 1].max
  page = [(params[:page] || 1).to_i, 1].max
  Product.limit(per_page).offset((page - 1) * per_page)
  ```
- Bad: Counting total results after applying only partial filters or using a separate, inconsistent query.
  Good: Apply the same filter chain before counting, then paginate.
  ```ruby
  scope = Product.all
  scope = scope.where(category: params[:category]) if params[:category].present?
  total_count = scope.count
  scope = scope.offset((page - 1) * per_page).limit(per_page)
  ```
- Bad: Leading wildcard filters that hamper index usage (e.g., where("name LIKE '%term%'")) without full-text support.
  Good: Use index-friendly patterns and/or full-text search where appropriate.
  ```ruby
  # Less efficient
  scope = scope.where("name LIKE ?", "%#{params[:query]}%")
  # More efficient if supported
  scope = scope.where("name ILIKE ?", "%#{sanitize_sql_like(params[:query].to_s)}%")
  ```
- Bad: Not handling very large per_page values, causing memory pressure.
  Good: Enforce a maximum per_page and validate integers.
  ```ruby
  per_page = [(params[:per_page] || 20).to_i, 100].min
  ```

## 6. Why This Matters In Real Systems

- Performance at scale: Offloading work to the database with well-scoped queries and proper indexing reduces latency and server load. Pagination with proper limits prevents excessive data transfer per request.
- User experience: Clients rely on predictable response shapes (total, page, per_page) to drive UIs like infinite scroll or paged tables.
- Security: Sorting inputs must be whitelisted to avoid SQL injection. Filtering should use parameterized queries to prevent injection and ensure query plan stability.
- Consistency and correctness: Applying filters before counting ensures the total reflects the user’s view, not the entire table.
- Maintenance and evolution: Centralizing allowed sort fields and filter logic makes adding new features (e.g., multi-parameter filtering, relationships) safer and easier.

Advanced note: For very large datasets or high-read APIs, consider cursor-based (keyset) pagination to avoid the performance penalties of offset, and implement caching strategies (e.g., fragment caching or response caching) for common filter/sort combinations.

## Z. Study Questions

1. What is the difference between offset-based pagination and cursor-based (keyset) pagination, and when would you choose one over the other?
2. Why is whitelisting sort columns essential when implementing dynamic ORDER BY clauses?
3. How can you safely implement range filtering (e.g., price_min, price_max) without introducing SQL injection risks?
4. Explain why applying filters before counting total results is important for accurate pagination metadata.
5. What database indexing strategies would help improve performance for paginated, filtered, and sorted APIs?

## Exercise

Multi-part coding challenge: Build a Rails API endpoint that returns a paginated, filtered, and sorted list of products with robust input handling and safe SQL practices.

Part 1 — Setup
- Create a Rails controller Api::V1::ProductsController with an index action.
- Ensure routes are configured for GET /api/v1/products.

Part 2 — Pagination
- Implement offset-based pagination with page and per_page params.
- Enforce per_page to be between 1 and 100; default to 20.

Part 3 — Filtering
- Add optional filters for category, min_price, and max_price (all optional).
- Ensure filters use parameterized queries and do not leak into SQL strings.

Part 4 — Sorting
- Implement sorting with sort_by and sort_dir parameters.
- Whitelist sort columns to [name, price, created_at, rating].
- Accept sort_dir as 'asc' or 'desc' with a safe default.

Part 5 — Combined Endpoint
- Combine pagination, filtering, and sorting into a single, cohesive scope.
- Return a JSON payload with keys: total, page, per_page, sort_by, sort_dir, data.

Part 6 — Validation and Security
- Add input sanitization to guard against invalid values.
- Document the allowed sort fields and direction in comments or a constant.

Part 7 — Testing (optional)
- Write a few RSpec request specs that verify:
  - Pagination returns the correct page and per_page.
  - Filtering by category returns only matching records.
  - Sorting yields the expected order for a given sort_by and sort_dir.
  - Total reflects the number of records after filtering.

Deliverable: Provide the final controller code snippet implementing all parts, plus brief notes about how you would test it end-to-end in a real system.