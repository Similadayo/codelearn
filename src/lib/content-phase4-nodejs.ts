// Phase 4 - Node.js Web Server Deep Dive

export const phase4NodejsContent: Record<string, string> = {

    routing_nodejs: `
# Routing in Express — URLs That Make Sense

Routing is how your server listens to specific URL patterns and runs the right code. Good routing design makes your API predictable, consistent, and easy to use. Bad routing makes your API a mess that confuses everyone including yourself in three weeks.

---

## 1. The Anatomy of a Route

\`\`\`javascript
app.METHOD(PATH, ...middleware, handler);
//  ↑         ↑              ↑
//  HTTP verb URL pattern    Function that runs when matched
\`\`\`

\`\`\`javascript
// Every route handler receives these three arguments
app.get('/users', (req, res, next) => {
  // req  — the incoming request (url, headers, body, params, etc.)
  // res  — what you send back (json, status, redirect, etc.)
  // next — pass control to next middleware or error handler
  res.json({ users: [] });
});
\`\`\`

---

## 2. Route Parameters

\`\`\`javascript
// Static route — exact match
app.get('/about', (req, res) => res.send('About page'));

// Route parameter — :paramName is a named wildcard
app.get('/users/:id', (req, res) => {
  const { id } = req.params; // { id: "42" } — always a string!
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  res.json({ id: userId });
});

// Multiple parameters
app.get('/teams/:teamId/members/:memberId', (req, res) => {
  const { teamId, memberId } = req.params;
  res.json({ teamId, memberId });
});

// Optional parameter (rarely used — prefer query params instead)
app.get('/posts/:year/:month?', (req, res) => {
  const { year, month = 'all' } = req.params;
  res.json({ year, month });
});

// Wildcard — matches anything
app.get('/files/*', (req, res) => {
  const path = req.params[0]; // everything after /files/
  res.json({ path });
});
\`\`\`

---

## 3. Query Parameters

\`\`\`javascript
// URL: /products?category=electronics&sort=price&order=asc&page=2&limit=20

app.get('/products', (req, res) => {
  const {
    category,
    sort = 'createdAt',   // default values
    order = 'desc',
    page = '1',
    limit = '10',
  } = req.query; // ALL query params are strings!

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Validate
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({ error: 'Invalid pagination params' });
  }

  // Build response
  const products = getProducts({ category, sort, order });
  const start = (pageNum - 1) * limitNum;
  const paginated = products.slice(start, start + limitNum);

  res.json({
    data: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: products.length,
      totalPages: Math.ceil(products.length / limitNum),
    }
  });
});
\`\`\`

---

## 4. Express Router — Organise Routes into Files

\`\`\`javascript
// routes/users.js
const express = require('express');
const router = express.Router();

// All routes here are prefixed with whatever you mount at in server.js

router.get('/', async (req, res) => {
  const users = await UserService.getAll();
  res.json(users);
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err); // pass to global error handler
  }
});

router.post('/', async (req, res, next) => {
  try {
    const newUser = await UserService.create(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const user = await UserService.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await UserService.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
\`\`\`

\`\`\`javascript
// server.js — mount routers
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);

// This gives you:
// GET    /api/v1/users
// GET    /api/v1/users/:id
// POST   /api/v1/users
// PATCH  /api/v1/users/:id
// DELETE /api/v1/users/:id
\`\`\`

---

## 5. Nested Routers

\`\`\`javascript
// routes/orders.js
const router = express.Router({ mergeParams: true }); // mergeParams lets you access parent params

// GET /api/v1/users/:userId/orders
router.get('/', async (req, res) => {
  const { userId } = req.params; // available because of mergeParams: true
  const orders = await OrderService.getByUser(userId);
  res.json(orders);
});

module.exports = router;

// server.js
const orderRoutes = require('./routes/orders');
app.use('/api/v1/users/:userId/orders', orderRoutes);
\`\`\`

---

## 6. REST URL Design Best Practices

\`\`\`
✅ Use nouns, not verbs in URLs
  /users             (not /getUsers or /fetchUsers)
  /products          (not /listProducts)

✅ Use plural nouns for collections
  /users             (not /user)
  /products/42       (not /product/42)

✅ Use HTTP methods to express the action
  GET    /posts         → list all posts
  POST   /posts         → create a post
  GET    /posts/5       → get post #5
  PUT    /posts/5       → replace post #5
  PATCH  /posts/5       → update post #5
  DELETE /posts/5       → delete post #5

✅ Nested resources for relationships
  GET /users/42/posts          → posts by user 42
  POST /users/42/posts         → create post for user 42
  GET /users/42/posts/7        → post 7 by user 42

✅ Use query params for filtering, sorting, pagination
  GET /products?category=books&sort=price&page=2

✅ Version your API
  /api/v1/users
  /api/v2/users   (breaking changes get a new version)

❌ Avoid
  /getUserById/42         → /users/42
  /createNewPost          → POST /posts
  /deleteUser?id=5        → DELETE /users/5
  /api/users/all/list     → /api/users
\`\`\`

---

## 7. Route Guards and Route-Level Middleware

\`\`\`javascript
// Middleware that checks authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Apply to specific routes
app.get('/users', authenticate, getAllUsers);         // requires auth
app.get('/users/:id', authenticate, getUserById);    // requires auth
app.post('/users', createUser);                       // public (registration)

// Apply to all routes in a router
const protectedRouter = express.Router();
protectedRouter.use(authenticate); // ALL routes below require auth

protectedRouter.get('/profile', getProfile);
protectedRouter.patch('/profile', updateProfile);
\`\`\`

---

## 8. Exercise

Build \`routes/books.js\` — a complete books API with a Router:

**Routes:**
- \`GET /books\` — paginated list, supports \`?page\`, \`?limit\`, \`?genre\`, \`?sort\` (title|year|rating)
- \`GET /books/search\` — search by \`?q\` in title or author (must be before \`/:id\`)
- \`GET /books/:id\` — single book, 404 if not found
- \`GET /books/:id/reviews\` — list reviews for a book
- \`POST /books\` — create book (title, author, year required)
- \`PATCH /books/:id\` — partial update
- \`DELETE /books/:id\` — delete (204)

**Requirements:**
- Use an in-memory array with at least 10 sample books
- All errors return \`{ error: "message" }\` format
- Search route must come BEFORE the \`/:id\` route or Express will interpret "search" as an id
- Implement pagination helper function

Submit \`routes/books.js\` and \`server.js\` that mounts it at \`/api/books\`.
`,

    middleware_nodejs: `
# Middleware — The Heart of Express

Middleware is the most important concept in Express. Every request flows through a chain of middleware functions before or after hitting your route handler. Authentication, logging, rate limiting, CORS — all of these are middleware.

---

## 1. What Middleware Does

A middleware function has access to the **request**, **response**, and the **next** function. It can:
- Run any code
- Modify \`req\` or \`res\` objects
- End the request-response cycle (call \`res.json()\`, etc.)
- Call \`next()\` to pass to the next middleware

\`\`\`
Request → Middleware 1 → Middleware 2 → Route Handler → Response
             ↓                ↓              ↓
          (logging)      (auth check)    (business logic)
\`\`\`

\`\`\`javascript
// Anatomy of a middleware
function myMiddleware(req, res, next) {
  // Before route handler:
  console.log('Request incoming:', req.method, req.path);

  // Modify request (add properties for later use)
  req.requestTime = new Date();

  // Pass to next (REQUIRED unless you send a response!)
  next();
}

// Error middleware — takes 4 args
function errorMiddleware(err, req, res, next) {
  res.status(err.statusCode || 500).json({ error: err.message });
}

app.use(myMiddleware);     // global — runs for ALL routes
app.use('/api', myMiddleware); // path-scoped — runs for /api/* routes
app.get('/users', myMiddleware, handler); // route-scoped — this route only
\`\`\`

---

## 2. Built-In and Essential Middleware

\`\`\`javascript
const express = require('express');
const app = express();

// Parse JSON request bodies
// Without this: req.body is undefined for JSON requests
app.use(express.json({ limit: '10mb' })); // optional size limit

// Parse URL-encoded form data (from HTML <form> tags)
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, images, etc.)
app.use('/public', express.static('public'));
// Now: http://localhost:3000/public/image.png → serves ./public/image.png
\`\`\`

---

## 3. Popular Third-Party Middleware

\`\`\`javascript
const cors = require('cors');        // Cross-Origin Resource Sharing
const helmet = require('helmet');    // Security headers
const morgan = require('morgan');    // HTTP request logging
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// CORS — allow frontend to call your backend from a different domain
app.use(cors({
  origin: ['https://myapp.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // allow cookies
}));

// Helmet — sets security HTTP headers automatically
app.use(helmet()); // adds: X-Frame-Options, X-XSS-Protection, etc.

// Morgan — log every request
app.use(morgan('dev'));   // colored output for development
app.use(morgan('combined')); // Apache-style for production logs

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // max 100 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,      // add rate limit headers to response
});
app.use('/api', limiter); // apply to all API routes

// Cookie parser — read cookies from requests
app.use(cookieParser(process.env.COOKIE_SECRET));

// Compression — gzip responses (big performance win)
app.use(compression());

// npm install cors helmet morgan express-rate-limit cookie-parser compression
\`\`\`

---

## 4. Writing Custom Middleware

\`\`\`javascript
// Request logger with timing
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Intercept res.end to know when response finishes
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: \`\${duration}ms\`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    }));
    return originalEnd(...args);
  };

  next();
};

// Attach request ID to every request
const { v4: uuidv4 } = require('uuid');
const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id); // send back to client
  next();
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Load full user from DB (or just attach payload)
    req.user = await UserService.findById(payload.userId);
    if (!req.user) return res.status(401).json({ error: 'User not found' });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access middleware factory
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: \`Access denied. Requires: \${roles.join(' or ')}\`
    });
  }
  next();
};

// Usage
app.get('/admin/users', authenticate, requireRole('admin'), getUsers);
app.post('/admin/ban', authenticate, requireRole('admin', 'moderator'), banUser);

// Not-found handler (must be LAST route)
app.use((req, res) => {
  res.status(404).json({ error: \`Route \${req.method} \${req.path} not found\` });
});

// Global error handler (must be LAST, must have 4 params)
app.use((err, req, res, next) => {
  console.error(\`[\${new Date().toISOString()}] Error:\`, err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: statusCode < 500 ? err.message : 'An unexpected error occurred',
  });
});
\`\`\`

---

## 5. Middleware Order Matters

\`\`\`javascript
// ✅ Correct order
app.use(requestId);         // 1. Attach request ID
app.use(requestLogger);     // 2. Log request (with ID)
app.use(helmet());          // 3. Security headers
app.use(cors(options));     // 4. CORS (before routes)
app.use(express.json());    // 5. Parse body (before routes that read body)
app.use(limiter);           // 6. Rate limiting
app.use('/api', routes);    // 7. Your routes
app.use(notFoundHandler);   // 8. 404 catch-all (after routes)
app.use(errorHandler);      // 9. Error handler (must be absolutely last)
\`\`\`

---

## 6. Exercise

Build a complete middleware stack:

1. **\`requestLogger\`**: Logs method, URL, status, duration, and request ID in JSON format
2. **\`requestId\`**: Attaches a UUID to \`req.id\` and sends it back in \`X-Request-ID\` header
3. **\`authenticate\`**: Reads JWT from \`Authorization: Bearer <token>\` header, verifies it, attaches user to \`req.user\`
4. **\`requireRole(role)\`**: Factory that returns middleware checking \`req.user.role === role\`
5. **\`validate(schema)\`**: Takes a validation schema and returns middleware that checks \`req.body\` against it — returns 400 with field errors if invalid
6. **\`notFoundHandler\`**: Returns 404 JSON for unmatched routes
7. **\`errorHandler\`**: Global error handler

Wire them all together in a \`server.js\` with at least 3 protected routes and 1 public route. Test that:
- Public routes work without a token
- Protected routes return 401 without token
- Protected routes return 403 with wrong role
- Invalid JSON bodies return 400
`,

    validation_nodejs: `
# Input Validation — Never Trust the Client

Validation is checking that the data sent to your API is correct before you process it. Skipping validation leads to bugs, crashes, security vulnerabilities, and corrupted databases. Every backend developer learns this the hard way — you'll learn it here first.

---

## 1. Why Validate?

\`\`\`javascript
// Without validation — dangerous
app.post('/users', async (req, res) => {
  const user = await db.create(req.body); // What if body is null?
  // What if email is "not-an-email"?
  // What if age is -500?
  // What if name is a 10MB string?
  // What if body has SQL injection?
  res.status(201).json(user);
});

// With validation — safe
app.post('/users', validate(userSchema), async (req, res) => {
  const user = await db.create(req.validatedBody); // guaranteed clean data
  res.status(201).json(user);
});
\`\`\`

---

## 2. Manual Validation (Understanding the Basics)

\`\`\`javascript
function validateUser(data) {
  const errors = [];

  // Check required fields
  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'name is required and must be a string' });
  } else if (data.name.trim().length < 2 || data.name.trim().length > 100) {
    errors.push({ field: 'name', message: 'name must be between 2 and 100 characters' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email) {
    errors.push({ field: 'email', message: 'email is required' });
  } else if (!emailRegex.test(data.email)) {
    errors.push({ field: 'email', message: 'email must be a valid email address' });
  }

  // Age validation
  if (data.age !== undefined) {
    const age = Number(data.age);
    if (isNaN(age) || !Number.isInteger(age) || age < 0 || age > 150) {
      errors.push({ field: 'age', message: 'age must be an integer between 0 and 150' });
    }
  }

  return errors;
}

app.post('/users', (req, res) => {
  const errors = validateUser(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  // proceed...
});
\`\`\`

---

## 3. Joi — Schema-Based Validation

Joi is a popular library that describes your data shape declaratively:

\`\`\`bash
npm install joi
\`\`\`

\`\`\`javascript
const Joi = require('joi');

// Define the schema
const createUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'any.required': 'Name is required',
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase() // auto-convert to lowercase
    .required(),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) // must have upper, lower, digit
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
    }),

  age: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .optional(),

  role: Joi.string()
    .valid('student', 'teacher', 'admin') // enum
    .default('student'),

  tags: Joi.array()
    .items(Joi.string().trim())
    .max(10)
    .optional(),

  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    country: Joi.string().length(2).uppercase(), // ISO country code
  }).optional(),
});

// Validate
const { error, value } = createUserSchema.validate(req.body, {
  abortEarly: false,    // return ALL errors, not just first
  stripUnknown: true,   // remove fields not in schema
  convert: true,        // coerce types where possible (default: true)
});

if (error) {
  const details = error.details.map(d => ({
    field: d.path.join('.'),
    message: d.message,
  }));
  return res.status(400).json({ error: 'Validation failed', details });
}

// value is the sanitised, type-coerced data — use this, not req.body
const user = await UserService.create(value);
\`\`\`

---

## 4. Zod — TypeScript-First Validation

If you use TypeScript (which you should), Zod is the modern choice:

\`\`\`bash
npm install zod
\`\`\`

\`\`\`typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Must include uppercase, lowercase, and digit'
  ),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['student', 'teacher', 'admin']).default('student'),
});

// TypeScript type inferred automatically!
type CreateUser = z.infer<typeof CreateUserSchema>;

// Validate
const result = CreateUserSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });
}

const user: CreateUser = result.data; // TypeScript knows the shape!
\`\`\`

---

## 5. Validation Middleware Factory

\`\`\`javascript
// A reusable middleware that validates req.body against any Joi schema
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      })),
    });
  }

  req.body = value; // replace body with cleaned data
  next();
};

// Usage — clean and readable
app.post('/users', validate(createUserSchema), createUser);
app.patch('/users/:id', validate(updateUserSchema), updateUser);
app.post('/login', validate(loginSchema), login);
\`\`\`

---

## 6. Sanitisation — Cleaning Input

Validation checks correctness. Sanitisation makes it safe:

\`\`\`javascript
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Strip HTML and scripts from user content
function sanitiseHtml(dirty) {
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
  return DOMPurify.sanitize(dirty);
}

// Trim and normalise strings
function sanitiseString(str) {
  return str?.toString().trim().replace(/\s+/g, ' ') || '';
}

// Prevent SQL injection (use parameterised queries — never string concat!)
// ❌ DANGEROUS
const query = \`SELECT * FROM users WHERE email = '\${req.body.email}'\`;
// ✅ Safe — parameterised
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [req.body.email]);
\`\`\`

---

## 7. Exercise

Create a complete validation system for a blogging API:

**Schemas to build (using Joi or Zod):**

1. **\`createPostSchema\`** — validates:
   - \`title\`: string, 5-200 chars, required
   - \`content\`: string, 50-50000 chars, required
   - \`tags\`: array of strings, max 5, each tag max 30 chars, optional
   - \`status\`: enum of \`draft\` or \`published\`, default \`draft\`
   - \`publishAt\`: ISO date string, must be in the future, optional (only if status is \`published\`)

2. **\`updatePostSchema\`** — same fields but all optional (PATCH semantics)

3. **\`loginSchema\`** — validates \`email\` (valid email) and \`password\` (string, min 1 char)

4. **\`paginationSchema\`** — validates query params: \`page\` (int, min 1, default 1), \`limit\` (int, 1-100, default 10), \`sort\` (enum of field names), \`order\` (\`asc\` or \`desc\`)

**Implement a \`validate(schema, target)\` middleware where \`target\` can be \`'body'\`, \`'query'\`, or \`'params'\`.**

Test each schema with valid data, missing required fields, and out-of-range values. Document what errors each invalid case produces.
`,

    env_vars: `
# Environment Variables and Configuration

Your database password should NEVER be in your code. Your API keys should NEVER be on GitHub. Environment variables are the standard solution — they let your app read configuration from its surroundings instead of hardcoding it.

---

## 1. Why Environment Variables?

\`\`\`javascript
// ❌ NEVER do this — you will eventually push this to GitHub
const db = new Database('postgres://admin:mypassword@db.company.com:5432/prod');
const stripe = new Stripe('sk_live_abc123realkey...');
const jwtSecret = 'supersecret123';

// ✅ Configuration from the environment
const db = new Database(process.env.DATABASE_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const jwtSecret = process.env.JWT_SECRET;
\`\`\`

Benefits:
- **Security** — secrets don't end up in source code
- **Flexibility** — run same code in dev, staging, and prod with different values
- **12-Factor App** compliance — the industry standard

---

## 2. The .env File and dotenv

\`\`\`bash
npm install dotenv
\`\`\`

Create a \`.env\` file in your project root:

\`\`\`bash
# .env — NEVER COMMIT THIS FILE
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://admin:password@localhost:5432/myapp

# JWT
JWT_SECRET=your-256-bit-secret-here
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password

# Third-party APIs
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-1

# Feature flags
FEATURE_NEW_DASHBOARD=true
MAX_UPLOAD_SIZE_MB=10
\`\`\`

\`\`\`bash
# .gitignore — add this immediately when starting any project
.env
.env.local
.env.production
.env.staging
\`\`\`

\`\`\`javascript
// server.js — FIRST line of code (before anything else)
require('dotenv').config();

// Now all variables are available as strings via process.env
console.log(process.env.PORT);        // "3000" (string!)
console.log(process.env.NODE_ENV);    // "development"
console.log(process.env.DATABASE_URL);
\`\`\`

---

## 3. Configuration Module — One Place For All Config

\`\`\`javascript
// config/index.js — centralise and validate all config
require('dotenv').config();

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(\`Missing required environment variable: \${key}\`);
  return value;
}

function optional(key, defaultValue) {
  return process.env[key] ?? defaultValue;
}

const config = {
  // Server
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Database
  database: {
    url: required('DATABASE_URL'),
    poolMin: parseInt(optional('DB_POOL_MIN', '2'), 10),
    poolMax: parseInt(optional('DB_POOL_MAX', '10'), 10),
  },

  // Auth
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '30d'),
  },

  // Email
  smtp: {
    host: required('SMTP_HOST'),
    port: parseInt(required('SMTP_PORT'), 10),
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
  },

  // File uploads
  uploads: {
    maxSizeMB: parseInt(optional('MAX_UPLOAD_SIZE_MB', '5'), 10),
    allowedTypes: optional('ALLOWED_UPLOAD_TYPES', 'image/jpeg,image/png,application/pdf').split(','),
  },
};

// This will throw on startup if any required var is missing
// Better to crash early than to fail late
module.exports = config;
\`\`\`

\`\`\`javascript
// Usage anywhere in your app
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(\`Server running on port \${config.port} [\${config.env}]\`);
});

// DB connection
const pool = new Pool({ connectionString: config.database.url });
\`\`\`

---

## 4. Multiple Environments

\`\`\`bash
.env                  # local development (never committed)
.env.example          # template showing what vars are needed (commit this!)
.env.test             # for running test suite
.env.staging          # staging server values (managed on server, not in repo)
\`\`\`

\`\`\`bash
# .env.example — commit this to teach teammates what they need to set
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/dbname
JWT_SECRET=change-this-to-a-random-256-bit-value
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
\`\`\`

\`\`\`javascript
// Load different .env files
require('dotenv').config({ path: \`.env.\${process.env.NODE_ENV}\` });
// or use dotenv-flow library which does this automatically
\`\`\`

---

## 5. Never Log Secrets

\`\`\`javascript
// ❌ NEVER log config containing secrets
console.log(config);             // logs JWT_SECRET, DB passwords!
console.log(process.env);        // logs EVERY env variable!

// ✅ Log only safe parts
console.log({
  env: config.env,
  port: config.port,
  dbConnected: !!config.database.url,  // boolean, not the URL
});
\`\`\`

---

## 6. Exercise

Set up proper configuration for a real project:

1. Create a new project with \`npm init -y\`. Install \`express\` and \`dotenv\`.

2. Create \`.env\` and \`.env.example\` files with these variables:
   - \`PORT\`, \`NODE_ENV\`, \`DATABASE_URL\`, \`JWT_SECRET\`, \`JWT_EXPIRES_IN\`, \`ALLOWED_ORIGINS\`

3. Create \`config/index.js\` that:
   - Loads dotenv as the very first action
   - Uses a \`required(key)\` helper that throws a clear error if missing
   - Parses types properly: port as integer, allowedOrigins as array (split by comma)
   - Exports a frozen config object (use \`Object.freeze()\` to prevent modification)

4. Create \`server.js\` that:
   - Imports config
   - Starts the server on the configured port
   - Logs startup info (env, port) but NOT any secrets
   - Rejects startup if \`NODE_ENV\` is not one of \`development\`, \`test\`, \`production\`

5. Delete \`JWT_SECRET\` from your \`.env\` temporarily and verify the app crashes with a clear error message on startup.
`,

    testing_basics_nodejs: `
# Testing in Node.js — Writing Code That Proves Your Code Works

Testing is how you verify that your code does what you think it does, and that it keeps doing it after you change things. Professional teams don't merge code that isn't tested. Learning to write tests early makes you a far more valuable developer.

---

## 1. Why Testing?

- **Confidence** — you can refactor or add features without worrying you broke something
- **Documentation** — tests show exactly how code is supposed to behave
- **Faster debugging** — tests tell you WHAT broke and WHERE
- **It forces better code** — code that's hard to test is often badly designed

---

## 2. Types of Tests

| Type | What it tests | Speed | Isolation |
|------|--------------|-------|-----------|
| Unit | A single function or class | Very fast | Maximum — no external dependencies |
| Integration | Multiple units working together | Medium | Partial — may use test DB |
| End-to-End (E2E) | Full user flow | Slow | Minimum — real browser, real API |

As a backend developer, focus on **unit tests** and **integration tests** for your APIs.

---

## 3. Jest — Setting Up

\`\`\`bash
npm install --save-dev jest supertest

# In package.json:
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node"
  }
}
\`\`\`

---

## 4. Unit Tests — Testing Functions

\`\`\`javascript
// utils/validators.js
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculateTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items must be a non-empty array');
  }
  return items.reduce((sum, item) => {
    if (typeof item.price !== 'number' || typeof item.quantity !== 'number') {
      throw new Error('Each item must have numeric price and quantity');
    }
    return sum + (item.price * item.quantity);
  }, 0);
}

module.exports = { isValidEmail, calculateTotal };
\`\`\`

\`\`\`javascript
// utils/validators.test.js
const { isValidEmail, calculateTotal } = require('./validators');

describe('isValidEmail', () => {
  // describe groups related tests together

  it('returns true for valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('name.surname@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@gmail.com')).toBe(true);
  });

  it('returns false for invalid email addresses', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });
});

describe('calculateTotal', () => {
  it('calculates total for valid items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(35); // 20 + 15
  });

  it('works with single item', () => {
    expect(calculateTotal([{ price: 99.99, quantity: 1 }])).toBeCloseTo(99.99);
  });

  it('throws for empty array', () => {
    expect(() => calculateTotal([])).toThrow('non-empty array');
  });

  it('throws for non-array input', () => {
    expect(() => calculateTotal(null)).toThrow();
    expect(() => calculateTotal('not an array')).toThrow();
  });

  it('throws when item missing price or quantity', () => {
    expect(() => calculateTotal([{ price: 10 }])).toThrow('numeric price and quantity');
  });
});
\`\`\`

---

## 5. Integration Tests — Testing API Endpoints

\`\`\`javascript
// app.js — export app without starting server (for testing)
const express = require('express');
const app = express();
app.use(express.json());
// ... routes ...
module.exports = app; // don't call app.listen() here!

// server.js — only file that starts the server
const app = require('./app');
app.listen(process.env.PORT || 3000);
\`\`\`

\`\`\`javascript
// routes/users.test.js
const request = require('supertest');
const app = require('../app');

// Reset in-memory store before each test
let users = [];
let nextId = 1;

beforeEach(() => {
  users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];
  nextId = 3;
});

describe('GET /api/users', () => {
  it('returns all users with 200', async () => {
    const res = await request(app).get('/api/users');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ name: 'Alice' });
  });
});

describe('GET /api/users/:id', () => {
  it('returns user when found', async () => {
    const res = await request(app).get('/api/users/1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: 'Alice' });
  });

  it('returns 404 when user not found', async () => {
    const res = await request(app).get('/api/users/999');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/users', () => {
  it('creates user with valid data', async () => {
    const newUser = { name: 'Charlie', email: 'charlie@example.com' };

    const res = await request(app)
      .post('/api/users')
      .send(newUser)
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject(newUser);
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'charlie@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' })
      ])
    );
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Charlie', email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
  });
});
\`\`\`

---

## 6. Common Jest Matchers

\`\`\`javascript
// Equality
expect(value).toBe(42);              // strict === equality
expect(value).toEqual({ a: 1 });    // deep equality (objects/arrays)
expect(value).not.toBe(42);         // negation

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 5);  // floating point comparison

// Strings
expect(str).toContain('hello');
expect(str).toMatch(/regex/);

// Arrays and objects
expect(arr).toHaveLength(3);
expect(arr).toContain('item');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({ partial: 'match' }); // subset match

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('specific message');
expect(() => fn()).toThrow(MyCustomError);

// Async
await expect(asyncFn()).resolves.toBe(42);
await expect(asyncFn()).rejects.toThrow('error message');
\`\`\`

---

## 7. Exercise

Write a complete test suite for a \`PostService\`:

\`\`\`javascript
// services/postService.js — implement this
class PostService {
  constructor() {
    this.posts = [];
    this.nextId = 1;
  }

  create({ title, content, authorId, status = 'draft' }) { /* ... */ }
  findById(id) { /* returns post or null */ }
  findAll({ status, authorId, page = 1, limit = 10 } = {}) { /* returns { data, total, page } */ }
  update(id, updates) { /* returns updated post or null */ }
  delete(id) { /* returns true or false */ }
  publish(id) { /* sets status to published, sets publishedAt */ }
}
\`\`\`

Write tests that cover:
1. Creating posts with valid data
2. Creating posts with missing required fields (title, content, authorId)
3. Finding a post by id (found and not found)
4. Listing all posts with pagination (check data length and total)
5. Filtering by status and authorId
6. Updating a post (found and not found)
7. Deleting a post (found and not found)
8. Publishing a post sets \`publishedAt\` to current date

Target: 100% coverage of your PostService.
`,
};
