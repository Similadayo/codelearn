# Routing — URL Design and Path Parameters in Node.js

Routing is the mechanism by which your web server matches incoming HTTP requests to the code that should handle them. Designing clean, expressive URLs and correctly using path parameters make APIs intuitive, maintainable, and scalable in real-world systems. This lesson focuses on how to design URL structures, how to extract and validate path parameters in Node.js with Express, and how to think about production-readiness.

## 1. Basic Path Parameters with Express

In this section you’ll learn how to define a route that accepts a path parameter and how to read it from the request object.

```js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Route with a path parameter
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  // Mock DB fetch (stand-in for real DB logic)
  const user = { id, name: 'Alice' };
  res.json(user);
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
```

### Line-by-line explanation
- const express = require('express');
  - Import the Express library to create the web server.
- const app = express();
  - Create an Express application instance.
- const PORT = process.env.PORT || 3000;
  - Read the port from environment or default to 3000.
- app.get('/users/:id', (req, res) => { ... });
  - Define a GET route with a path parameter named id.
- const id = parseInt(req.params.id, 10);
  - Extract the path parameter from req.params and parse it as an integer.
- if (Number.isNaN(id)) { ... }
  - Validate the id; respond with 400 if it’s not a number.
- const user = { id, name: 'Alice' };
  - Mock: construct a user object; in a real app you’d query a database here.
- res.json(user);
  - Send a JSON response containing the user data.
- app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  - Start the server and log the listening port.

## 2. Clean URL Design with Versioned API and Nested Resources

This section demonstrates organizing routes to support versioning and nested resources, a common best practice in real APIs.

```js
const express = require('express');
const app = express();
const apiV1 = express.Router();
const usersRouter = express.Router({ mergeParams: true });

// In-memory data (for demonstration)
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];
const posts = [
  { id: 101, userId: 1, title: 'First Post', body: 'Hello' },
  { id: 102, userId: 1, title: 'Second Post', body: 'World' },
  { id: 201, userId: 2, title: 'Bob Post', body: 'Hi' }
];

// GET /api/v1/users/:userId
usersRouter.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/v1/users/:userId/posts
usersRouter.get('/:userId/posts', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
  const userExists = users.some(u => u.id === userId);
  if (!userExists) return res.status(404).json({ error: 'User not found' });

  const userPosts = posts.filter(p => p.userId === userId);
  res.json({ userId, posts: userPosts });
});

// GET /api/v1/users/:userId/posts/:postId
usersRouter.get('/:userId/posts/:postId', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const postId = parseInt(req.params.postId, 10);
  if (Number.isNaN(userId) || Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid IDs' });

  const user = users.find(u => u.id === userId);
  const post = posts.find(p => p.id === postId && p.userId === userId);

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  res.json(post);
});

apiV1.use('/users', usersRouter);
app.use('/api/v1', apiV1);

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Line-by-line explanation
- const apiV1 = express.Router();
  - Create a mounted router to group v1 API routes.
- const usersRouter = express.Router({ mergeParams: true });
  - Create a nested router; mergeParams ensures parent params (if any) are accessible in nested routes.
- Users and posts arrays
  - Mock data representing users and their posts for demonstration.
- GET /api/v1/users/:userId
  - Validates userId, looks up a user, and returns 404 if not found.
- GET /api/v1/users/:userId/posts
  - Validates userId, ensures user exists, then returns posts for that user.
- GET /api/v1/users/:userId/posts/:postId
  - Validates both IDs, ensures the user and post exist, then returns the post.
- apiV1.use('/users', usersRouter);
  - Mount the usersRouter under /api/v1/users.
- app.use('/api/v1', apiV1);
  - Mount the versioned API router.
- app.listen(3000, ...)
  - Start the server.

## 3. Path Parameters vs Query Parameters and Optional Parameters

Distinguish between path parameters (required to locate a resource) and query parameters (optional modifiers that refine the response). Also show how to declare optional path parameters.

```js
const express = require('express');
const app = express();

// Optional path parameter: productId may be undefined
app.get('/products/:categoryId/:productId?', (req, res) => {
  const categoryId = parseInt(req.params.categoryId, 10);
  const productId = req.params.productId ? parseInt(req.params.productId, 10) : undefined;
  const { color, sort } = req.query; // query parameters
  res.json({ categoryId, productId, color, sort });
});
```

### Line-by-line explanation
- app.get('/products/:categoryId/:productId?', (req, res) => { ... });
  - Defines a route with an optional path parameter productId using the ? suffix.
- const categoryId = parseInt(req.params.categoryId, 10);
  - Parses and validates categoryId from the path.
- const productId = req.params.productId ? parseInt(req.params.productId, 10) : undefined;
  - If productId is present, parse it; otherwise leave undefined.
- const { color, sort } = req.query;
  - Reads optional query parameters from the URL, e.g., ?color=red&sort=asc.
- res.json({ categoryId, productId, color, sort });
  - Responds with a JSON object summarizing the input.

## 4. Error Handling and 404s in Routing

A production API must gracefully handle unknown routes and unexpected errors.

```js
const express = require('express');
const app = express();

// (Assume routes are defined here)

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Central error handler (optional, for catching thrown errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### Line-by-line explanation
- app.use((req, res) => { res.status(404).json({ error: 'Not Found' }); });
  - Catch-all 404 handler for any request that didn’t match a route.
- app.use((err, req, res, next) => { ... });
  - Central error-handling middleware; logs the error and returns a 500 status.
- console.error(err.stack);
  - Log the error stack for debugging in production environments.

## X. Common Beginner Mistakes

Bad vs Good examples showing real pitfalls and how to fix them.

- Pitfall 1: Putting business logic and DB calls directly in route handlers
  - Bad:
    ```js
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const user = await db.query(`SELECT * FROM users WHERE id = ${id}`);
      res.json(user);
    });
    ```
  - Good:
    ```js
    async function getUserById(id) {
      // Use parameterized queries here in a real DB
      return db.query('SELECT * FROM users WHERE id = $1', [id]);
    }
    app.get('/users/:id', async (req, res, next) => {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
      try {
        const user = await getUserById(id);
        if (!user) return res.status(404).json({ error: 'Not found' });
        res.json(user);
      } catch (err) {
        next(err);
      }
    });
    ```
- Pitfall 2: Unsafe string interpolation in queries (risk of injection)
  - Bad:
    ```js
    const id = req.params.id;
    db.query(`SELECT * FROM users WHERE id = ${id}`);
    ```
  - Good:
    ```js
    const id = parseInt(req.params.id, 10);
    db.query('SELECT * FROM users WHERE id = $1', [id]);
    ```
- Pitfall 3: Not validating or normalizing path parameters
  - Bad:
    ```js
    app.get('/items/:id', (req, res) => {
      res.send(`Item ${req.params.id}`);
    });
    ```
  - Good:
    ```js
    app.get('/items/:id', (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
      res.send(`Item ${id}`);
    });
    ```
- Pitfall 4: Inconsistent route naming (e.g., /user vs /users)
  - Bad:
    ```js
    app.get('/user/:id', handler); // inconsistent with /users
    ```
  - Good:
    ```js
    app.get('/users/:id', handler); // consistent plural naming
    ```
- Pitfall 5: Not handling optional params clearly (ambiguous API)
  - Bad:
    ```js
    app.get('/search/:term', handler); // term is required
    ```
  - Good:
    ```js
    app.get('/search/:term?', handler); // term is optional if business logic allows
    ```
  
## Y. Why This Matters In Real Systems

- Consistent URL design enables discoverability and improves developer experience for internal teams and external partners.
- Versioned APIs (e.g., /api/v1) allow you to evolve endpoints without breaking existing clients.
- Clear separation of path parameters and query parameters helps with caching, routing efficiency, and readability.
- Early and explicit validation (types, ranges, allowed values) reduces errors, prevents bad data from hitting the database, and improves security.
- Proper error handling (404s for missing resources, 400 for bad inputs, 500 for server errors) improves observability and reliability in production.
- Modularity (using Express Router and mergeParams) keeps routing scalable as the codebase grows, aligning with microservice and monolith architectures alike.
- Production concerns: logging, tracing, rate limiting, and input sanitization around routes are essential for stable, observable systems.

## Z. Study Questions

1) What is the difference between a path parameter and a query parameter? When should each be used?

2) How do you declare an optional path parameter in Express, and how do you check if it was provided?

3) Why is it valuable to version your API routes (e.g., /api/v1/)? What design considerations influence versioning?

4) How does mergeParams in Express Router affect access to parent route parameters inside nested routers?

5) List three common mistakes when designing and implementing route handlers and how you would fix them.

## Exercise

Build a small, fully functional Express API that uses versioned routes and path parameters to manage users and their posts. It should meet the following requirements:

- Versioned API at /api/v1
- In-memory data store for users and posts (no external DB required)
- Endpoints:
  - GET /api/v1/users/:userId — fetch a user by ID
  - GET /api/v1/users/:userId/posts — fetch all posts for a user
  - GET /api/v1/users/:userId/posts/:postId — fetch a single post for a user
  - Optional query parameter include=comments on the posts route should include the post’s comments in the response
- Validate userId and postId as integers; respond with 400 for invalid IDs
- Return 404 when a user or post cannot be found
- Add a simple request logger middleware
- Return a 404 for unknown routes and 500 for unexpected errors

Code solution (working example):

```js
// Exercise: Versioned API with path parameters and in-memory data
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory data
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];
const posts = [
  { id: 101, userId: 1, title: 'First', body: 'Hello World', comments: ['Nice post'] },
  { id: 102, userId: 1, title: 'Second', body: 'More content', comments: [] },
  { id: 201, userId: 2, title: 'Bob Post', body: 'Hi there', comments: ['Cool'] }
];

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Versioned API
const v1 = express.Router();

// GET /api/v1/users/:userId
v1.get('/users/:userId', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json(user);
});

// GET /api/v1/users/:userId/posts
v1.get('/users/:userId/posts', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const userPosts = posts.filter(p => p.userId === userId);
  res.json({ userId, posts: userPosts });
});

// GET /api/v1/users/:userId/posts/:postId
v1.get('/users/:userId/posts/:postId', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const postId = parseInt(req.params.postId, 10);
  if (Number.isNaN(userId) || Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid IDs' });

  const user = users.find(u => u.id === userId);
  const post = posts.find(p => p.id === postId && p.userId === userId);

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // If include=comments, return comments as part of the response (demonstrates query param usage)
  const includeComments = req.query.include === 'comments';
  const result = includeComments ? { ...post } : { id: post.id, userId: post.userId, title: post.title, body: post.body };

  res.json(result);
});

app.use('/api/v1', v1);

// 404 for unknown routes
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// 500 error handler (optional, for demonstration)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

Line-by-line explanation
- Lines 1-3: Import Express, create app, and set the port.
- Lines 6-14: In-memory user and post data used by the endpoints.
- Lines 17-21: Simple request logger middleware to register each incoming request.
- Lines 24-36: Define v1 router and implement:
  - GET /users/:userId with validation and 404 for missing users.
  - GET /users/:userId/posts with validation and 404 if user not found.
  - GET /users/:userId/posts/:postId with validation, 404 checks, and optional inclusion of comments via query param.
- Line 42: Mount the versioned router at /api/v1.
- Lines 45-47: 404 handler for unknown routes.
- Lines 50-53: Central error handler for unexpected errors (logs stack and returns 500).
- Line 55: Start the server and log the port.

End of lesson.