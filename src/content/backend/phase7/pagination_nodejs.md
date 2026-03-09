# Track: Backend Engineering — Module: Phase 7 — Advanced API Features — Topic: Pagination, Filtering & Sorting APIs

Pagination, filtering, and sorting are essential primitives for building scalable and user-friendly APIs. They let clients fetch only the data they need, in the order they expect, while keeping server load predictable. In real systems, well-designed pagination and filtering reduce database load, improve response times, and enable efficient UIs (e.g., infinite scroll, dashboards, and searchable catalogs). This lesson demonstrates practical patterns in Node.js/Express, covering in-memory and database-backed approaches, along with common pitfalls and production considerations.

## 1. API Surface and Query Parameters

Learn the common query parameters that power pagination, filtering, and sorting, and how to validate and normalize them at the API boundary.

Code: Express route skeleton with validation-friendly parameter handling (in-memory approach)
```js
// dependencies
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Sample dataset generator (in-memory)
function generateItems(n = 60) {
  const categories = ['electronics', 'books', 'clothing', 'home'];
  const now = Date.now();
  return Array.from({ length: n }).map((_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    category: categories[i % categories.length],
    price: Math.round(5 + Math.random() * 95),
    createdAt: new Date(now - i * 60 * 60 * 1000) // hours ago
  }));
}
const ITEMS = generateItems(120);

// Utility: parse and validate query params (safe defaults)
function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
  return { page, limit };
}

// Route: GET /items with basic surface for pagination, filtering, and sorting
app.get('/items', (req, res) => {
  const { page, limit } = parsePagination(req);
  const sortField = req.query.sort || 'createdAt'; // field to sort by
  const order = req.query.order === 'desc' ? -1 : 1; // 1 = asc, -1 = desc

  // Simple filters
  const category = req.query.category;
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;

  // Build filtered list
  let list = ITEMS.filter((it) => {
    const okCategory = category ? it.category === category : true;
    const okPrice =
      (minPrice === undefined || it.price >= minPrice) &&
      (maxPrice === undefined || it.price <= maxPrice);
    return okCategory && okPrice;
  });

  // Sorting
  list.sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    if (va < vb) return -1 * order;
    if (va > vb) return 1 * order;
    return 0;
  });

  // Pagination
  const total = list.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = list.slice(start, end);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```

### Line-by-line Explanation
- // dependencies …: Import Express to create an API server.
- const app = express(); const PORT = ...: Initialize the app and port.
- function generateItems(n) { ... }: Creates a mock dataset with fields id, name, category, price, createdAt to drive the example.
- const ITEMS = generateItems(120);: Generate 120 items for realistic pagination.
- function parsePagination(req) { ... }: Normalize page and limit with safe defaults and bounds (min 1, max 100 for limit).
- app.get('/items', (req, res) => { ... });: Define GET /items route to serve paginated data.
- const sortField = req.query.sort || 'createdAt';: Determine the field to sort by, defaulting to createdAt.
- const order = req.query.order === 'desc' ? -1 : 1;: Interpret sort direction.
- const category = req.query.category; const minPrice = ...; const maxPrice = ...;: Extract optional filters from query string.
- let list = ITEMS.filter((it) => { ... }): Apply category and price range filters to the dataset.
- list.sort((a, b) => { ... }): Sort by the chosen field and direction.
- const total = list.length; const start = (page - 1) * limit; const end = start + limit; const data = list.slice(start, end);: Compute total, slice the proper page, and prepare response.
- res.json({ page, limit, total, totalPages: Math.ceil(total / limit), data });: Return pagination metadata and the data slice.

## 2. In-Memory Pagination, Filtering & Sorting

Deep-dive into implementing pagination, filtering, and sorting on top of a local in-memory array. This is great for prototyping, testing, and learning before wiring up a real database.

Code: Full in-memory flow with a small dataset and the same surface as Section 1
```js
// (Continuing from Section 1 dataset; encapsulate logic for clarity)
function applyFilters(items, { category, minPrice, maxPrice }) {
  return items.filter((it) => {
    const okCategory = category ? it.category === category : true;
    const okPrice =
      (minPrice === undefined || it.price >= minPrice) &&
      (maxPrice === undefined || it.price <= maxPrice);
    return okCategory && okPrice;
  });
}

function applySort(items, sortField, order) {
  return items.slice().sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    if (va < vb) return -1 * order;
    if (va > vb) return 1 * order;
    return 0;
  });
}

function paginate(items, page, limit) {
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageData = items.slice(start, end);
  return pageData;
}

// Example usage with the same dataset
const exampleQuery = {
  page: 2,
  limit: 10,
  sort: 'price',
  order: -1, // desc
  category: 'electronics',
  minPrice: 20,
  maxPrice: 80
};

const filtered = applyFilters(ITEMS, {
  category: exampleQuery.category,
  minPrice: exampleQuery.minPrice,
  maxPrice: exampleQuery.maxPrice
});
const sorted = applySort(filtered, exampleQuery.sort, exampleQuery.order);
const pageData = paginate(sorted, exampleQuery.page, exampleQuery.limit);

console.log({
  page: exampleQuery.page,
  limit: exampleQuery.limit,
  total: sorted.length,
  totalPages: Math.ceil(sorted.length / exampleQuery.limit),
  data: pageData
});
```

### Line-by-line Explanation
- function applyFilters(items, { category, minPrice, maxPrice }) { ... }: Pure function that applies category and price filters to any array of items.
- return items.filter((it) => { ... }): Keeps items that match optional category and within the optional price range.
- function applySort(items, sortField, order) { ... }: Returns a sorted copy of items by a given field and direction.
- const va = a[sortField]; const vb = b[sortField];: Retrieve the values to compare.
- function paginate(items, page, limit) { ... }: Returns a slice corresponding to the requested page.
- Example usage: Demonstrates combining filters, sorting, and pagination on the in-memory dataset.
- console.log(...): Outputs the paginated result and metadata for verification.

## 3. Database-Backed Pagination Patterns

When data lives in a database, you should push filtering, sorting, and pagination into the query so the DB can use indexes and avoid transferring large data sets. Below are patterns for MongoDB (Mongoose-like) and a note on cursor-based pagination for very large datasets.

Code A: MongoDB/Mongoose-style pagination with filters, sort, and skip/limit
```js
// Assume a Mongoose-like model named Item with fields: name, category, price, createdAt
// const Item = require('./models/Item'); // Un-comment if using Mongoose in a real project

async function fetchItemsFromDb(req) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const skip = (page - 1) * limit;
  const sortField = req.query.sort || 'createdAt';
  const sortOrder = req.query.order === 'desc' ? -1 : 1;

  // Build Mongo-like filter object
  const filters = {};
  if (req.query.category) filters.category = req.query.category;
  if (req.query.minPrice || req.query.maxPrice) {
    filters.price = {};
    if (req.query.minPrice) filters.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) filters.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Execute DB query (pseudo-code; adapt to your ORM)
  // const total = await Item.countDocuments(filters);
  // const data = await Item.find(filters)
  //   .sort({ [sortField]: sortOrder })
  //   .skip(skip)
  //   .limit(limit)
  //   .exec();

  // For illustration without a real DB, mimic the DB call:
  // (In a real app, replace the following with actual DB queries)
  const fakeDBTotal = 42; // sample total
  const fakeDBData = []; // sample data slice

  // Return structure
  return {
    page,
    limit,
    total: fakeDBTotal,
    totalPages: Math.ceil(fakeDBTotal / limit),
    data: fakeDBData
  };
}
```

Code B: Cursor-based pagination (optional for very large datasets)
```js
// Cursor-based pagination uses a last-seen value (e.g., _id) to fetch the next page.
// This avoids skipping large offsets and can be more efficient on big data.
// Note: This example uses a MongoDB-like _id field; adapt to your DB.

async function fetchWithCursor(req) {
  const limit = Math.max(parseInt(req.query.limit || '20', 10), 1);
  const after = req.query.after; // last seen _id from previous page
  const filters = {};
  if (req.query.category) filters.category = req.query.category;

  // Build base query; in a real DB, you'd chain query.where(filters)
  // and add a condition on _id greater than 'after' if provided.
  let query = { ...filters };
  if (after) {
    // pseudo condition; adapt to your DB's query syntax
    query._id = { $gt: after };
  }

  // data fetch
  // const data = await Item.find(query).sort({ _id: 1 }).limit(limit + 1);
  const data = []; // placeholder

  // hasNext = data.length > limit
  const hasNext = data.length > limit;
  const results = hasNext ? data.slice(0, limit) : data;

  return {
    data: results,
    nextCursor: hasNext && results.length ? results[results.length - 1]._id : null
  };
}
```

### Line-by-line Explanation
- async function fetchItemsFromDb(req) { ... }: Fetches items using server-side pagination and sorting, pushing filtering into the DB layer.
- const page/limit/skip/sortField/sortOrder: Derive pagination and sorting parameters from the request.
- const filters = {}; if (req.query.category) filters.category = req.query.category;: Build a filter object for the DB query.
- if (req.query.minPrice || req.query.maxPrice) { filters.price = { ... } }: Add range-based price filtering to the DB query.
- // Execute DB query: This shows the intended integration points with a real DB, e.g., Mongoose.
- The example returns a structure with page, limit, total, totalPages, and data to mirror the in-memory approach.
- Cursor-based snippet: fetchWithCursor(req) demonstrates how to use a lightweight cursor (after) to paginate without skip/offset, suitable for large datasets.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Bad: Not validating and normalizing query parameters
- Bad
```js
// No validation; fragile when clients pass strings like '0' or 'abc'
const page = req.query.page || 1;
const limit = req.query.limit || 10;
```
- Good
```js
// Validate and sanitize
const page = Math.max(parseInt(req.query.page || '1', 10), 1);
const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
```

2) Bad: Separating filters for count and data fetch (causes mismatch)
- Bad
```js
const total = await Item.countDocuments({ category: req.query.category });
const data = await Item.find({ category: req.query.category, price: { $gte: 0 } })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
```
- Good
```js
const filters = {};
if (req.query.category) filters.category = req.query.category;
if (req.query.minPrice) filters.price = { $gte: parseFloat(req.query.minPrice) };
const total = await Item.countDocuments(filters);
const data = await Item.find(filters)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
```

3) Bad: N+1 queries when assembling related data
- Bad
```js
const items = await Item.find({});
for (const item of items) {
  item.categoryDetails = await Category.findById(item.categoryId);
}
```
- Good
```js
const items = await Item.find({});
const categoryIds = [...new Set(items.map(i => i.categoryId))];
const categories = await Category.find({ _id: { $in: categoryIds } });
const map = Object.fromEntries(categories.map(c => [c._id, c]));
items.forEach(i => (i.categoryDetails = map[i.categoryId]));
```

4) Bad: Sorting by non-indexed field
- Bad
```js
// Sorting by a field that is not indexed can be costly
db.items.find({ category: 'electronics' }).sort({ customField: 1 }).limit(50);
```
- Good
```js
// Ensure you have an index on the sort field (e.g., create index on createdAt or price)
db.items.createIndex({ createdAt: -1 });
// Then sort with an indexed field
db.items.find({ category: 'electronics' }).sort({ createdAt: -1 }).limit(50);
```

5) Bad: Ignoring total count metadata
- Bad
```js
res.json({ data });
```
- Good
```js
const totalPages = Math.ceil(total / limit);
res.json({ page, limit, total, totalPages, data });
```

## 5. Why This Matters In Real Systems

In production, pagination, filtering, and sorting are more than UI conveniences—they are essential for performance, scalability, and user experience.

- Performance and scalability
  - Use database-side filtering, sorting, and pagination to leverage indexes and avoid transferring large result sets.
  - Prefer cursor-based pagination for very large datasets to avoid expensive offset scans.
  - Ensure relevant fields used in filters/sorts are indexed.

- Data integrity and UX
  - Always return total counts or totalPages to enable correct UI pagination controls.
  - Provide stable sort fields (e.g., createdAt, id) to avoid confusing shifting results when data changes.

- Observability and reliability
  - Instrument endpoints with latency, query counts, and error tracking.
  - Return consistent response shapes (page, limit, total, totalPages, data) to simplify client logic.

- Security and correctness
  - Validate and sanitize all query parameters.
  - Avoid exposing internal fields or server-side-only filters.
  - Rate-limit paginated endpoints to prevent abuse.

- Real-world patterns
  - For public APIs: offer both page-based (page/limit) and cursor-based (after/limit) options.
  - For dashboards and analytics: pre-compute or cache expensive aggregates for common filters.

## 6. Study Questions — 5 Recall Questions

1) What is the difference between page-based pagination and cursor-based pagination? When would you choose one over the other?
2) How do you compute totalPages, and why is total counting sometimes expensive on large datasets?
3) Why should filtering and sorting be pushed to the database layer rather than done in memory?
4) What are common mistakes that cause data to become inconsistent between total and page data, and how can you avoid them?
5) How can indexing influence the performance of a sorting operation in a paginated API?

## 7. Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small, reusable API surface for paginated, filterable, and sortable data in Node.js/Express. You will implement both in-memory and (optional) database-backed variants, and verify behavior with tests or console logs.

Part A — In-Memory Paginated API
- Create a Node.js project (you can reuse the code skeleton from Section 1 and Section 2).
- Tasks:
  1) Implement a reusable paginateItems(data, options) function that accepts:
     - data: array of items
     - options: { page, limit, sort, order, filters: { category, minPrice, maxPrice } }
  2) Ensure validation: page >= 1, limit 1..100, sort field exists on items, order is asc/desc.
  3) Apply filters, then sort, then paginate. Return an object: { page, limit, total, totalPages, data }.
  4) Wire a simple Express route GET /products that uses this function against a generated ITEMS dataset.
  5) Demonstrate usage by logging a few requests with different query combinations to the console (or via curl).

Part B — DB-Backed Pagination (MongoDB/Mongoose-style)
- If you have MongoDB and Mongoose available, implement a MongoDB-backed version:
  1) Define a Mongoose Item schema with fields: name, category, price, createdAt.
  2) Implement an Express route GET /db-items that reads query params (page, limit, sort, order, category, minPrice, maxPrice) and builds a single query with:
     - countDocuments(filters) to compute total
     - find(filters).sort({ [sortField]: sortOrder }).skip(skip).limit(limit)
  3) Return a response with page, limit, total, totalPages, data.
  4) If you don’t have MongoDB, describe how you would adapt the code to PostgreSQL/MySQL using OFFSET/LIMIT and parameterized queries, and outline indexing strategies.

Part C — Optional: Cursor-Pagination Variant
- Implement a cursor-based endpoint GET /cursor-items:
  - Accepts limit and after (cursor value, e.g., last _id or last createdAt).
  - Returns data and nextCursor if there are more results.
  - Explain when and why you would choose cursor pagination over page-based pagination.

Part D — Tests and Observability
- Write simple tests (unit or integration) that verify:
  - Correct total and totalPages calculations for a known dataset.
  - Filtering, sorting, and pagination interact correctly.
- Add basic logging for the API: timestamp, latency, page, limit, total.
- Optional: integrate a lightweight test runner (e.g., Jest or Mocha) and assertions.
  
Hints
- Keep response shapes consistent across endpoints.
- Validate input early and fail gracefully with helpful messages.
- Document the supported query parameters in your API docs or README.

End of lesson.