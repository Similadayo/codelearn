// ===================================================
// CONTENT REGISTRY
// Each topic ID maps to rich markdown content
// ===================================================

const contentRegistry: Record<string, string> = {

  // ─── BACKEND: how_internet_works ─────────────────────────────────────────────
  how_internet_works: `
# How the Internet Works

Before you write a single line of backend code, you need to understand the infrastructure your code will run on top of. The Internet is not magic — it is a massive global network of computers communicating using agreed-upon rules called **protocols**.

---

## 1. What Actually Happens When You Visit a Website?

Let's trace what happens in the split second you type \`https://google.com\` and hit Enter:

1. **Your browser asks for an IP address** — it contacts a **DNS (Domain Name System)** server. DNS is like a phone book for the internet. It translates human-readable names (\`google.com\`) into machine-readable IP addresses (\`142.250.185.78\`).

2. **Your computer opens a connection** — using a protocol called **TCP (Transmission Control Protocol)**, your computer does a "handshake" with Google's server: *"Hello, can we talk?"* — *"Yes"* — *"Great, let's go."*

3. **The browser sends an HTTP Request** — it sends a message like: *"GET / HTTP/1.1 — please give me the homepage."*

4. **Google's server processes it** — a web server (like Nginx or Apache) receives the request, runs some code, and builds a response.

5. **The response travels back** — split into small chunks called **packets**, routed across the globe through cables and routers, and reassembled on your computer.

6. **Your browser renders the page** — it reads the HTML, fetches CSS and JavaScript files, and paints what you see on screen.

---

## 2. Key Concepts Explained

### IP Address
An IP address is a unique identifier for a device on a network. Like a home address — it tells the internet where to *deliver* information.

- **IPv4**: \`192.168.1.1\` — the traditional format (32-bit, ~4 billion addresses)
- **IPv6**: \`2001:0db8:85a3::8a2e:0370:7334\` — the modern format (128-bit, effectively unlimited addresses)

### DNS — The Phone Book
DNS servers store mappings like:
\`\`\`
google.com → 142.250.185.78
twitter.com → 104.244.42.65
\`\`\`
When you set up your own domain, you create DNS records to point your domain name to your server's IP address.

### TCP/IP — The Delivery System
**TCP** ensures that data arrives *completely and in order*. It breaks data into packets, numbers them, and the receiving end acknowledges each one. If a packet is lost, it gets resent.

**IP** handles *routing* — deciding what path the packet takes across the network.

Think of it this way: TCP is like sending a book split into pages by certified mail. IP is like the postal system that figures out the route to take.

### HTTP & HTTPS
**HTTP (Hypertext Transfer Protocol)** is the language browsers and servers use to talk to each other. It defines how requests and responses are structured.

**HTTPS** adds **TLS encryption** — a security layer that scrambles the communication so that nobody eavesdropping on the network can read it. This is why modern browsers show a padlock icon.

### Ports
A port is like an apartment number within a building (IP address). Different services listen on specific ports:

| Port | Service |
|------|---------|
| 80   | HTTP |
| 443  | HTTPS |
| 22   | SSH |
| 5432 | PostgreSQL |
| 27017 | MongoDB |

When you run a server locally, you often see \`http://localhost:3000\`. The \`3000\` is the port your development server is listening on.

---

## 3. Client-Server Architecture

Every web application is built on this fundamental model:

\`\`\`
                    REQUEST
  [Your Browser] ─────────────────► [Server]
  (The Client)                     (Your App)
                    RESPONSE
  [Your Browser] ◄───────────────── [Server]
\`\`\`

- **Client**: The thing making the request (browser, mobile app, another server)
- **Server**: The thing receiving the request, doing work, and sending back a response

Your backend code lives on the **server** side.

---

## 4. Common Misconceptions

❌ **"The cloud is someone else's computer"** — Yes, essentially. A server is just a computer running 24/7. "The cloud" is just remote servers you rent from companies like AWS, Google, or Azure.

❌ **"HTTP and HTML are the same thing"** — No. HTTP is the *transport protocol* (how data travels). HTML is a *file format* (what the data contains). You can send JSON, images, or video files over HTTP — not just HTML.

---

## 5. Exercise

**Task:** Write a short explanation (in your own words, minimum 150 words) answering:
1. What happens step-by-step when you visit \`https://yourbank.com\`?
2. Why does HTTPS matter for a banking website specifically?
3. What is a port, and why does your local dev server use port 3000?

Submit your answer in the text box below. Your lecturer will review it and provide feedback.
`,

  // ─── BACKEND: http_rest ────────────────────────────────────────────────────
  http_rest: `
# HTTP & REST APIs

HTTP is the backbone of all web communication. As a backend developer, understanding HTTP deeply — not just "it's how websites work" — is absolutely essential. Every API you build will speak HTTP.

---

## 1. What is HTTP?

HTTP stands for **HyperText Transfer Protocol**. It defines a standard way for a **client** (browser, mobile app, another server) to send a **request** to a **server**, and for the server to send back a **response**.

HTTP is **stateless** — meaning every request is completely independent. The server doesn't remember your previous request. If you need to maintain state (like a logged-in session), you have to pass identifying information on every request (usually via cookies or tokens).

---

## 2. Anatomy of an HTTP Request

Every HTTP request has these parts:

\`\`\`
POST /api/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

{
  "name": "Alice",
  "email": "alice@example.com"
}
\`\`\`

Breaking it down:
- **Method**: \`POST\` — what action to perform
- **Path**: \`/api/users\` — which resource to act on
- **HTTP Version**: \`HTTP/1.1\`
- **Headers**: Key-value pairs providing metadata (content type, auth token, etc.)
- **Body**: The data payload (only in POST, PUT, PATCH)

---

## 3. HTTP Methods

Methods (also called "verbs") describe the **intent** of the request:

| Method | Meaning | Has Body? | Example Use |
|--------|---------|-----------|-------------|
| GET    | Retrieve data | No | Get a list of users |
| POST   | Create new resource | Yes | Register a new user |
| PUT    | Replace entire resource | Yes | Update user's full profile |
| PATCH  | Partially update resource | Yes | Change just the user's email |
| DELETE | Remove resource | No | Delete an account |

**Important Rule:** GET requests must never change data. They should be "safe" — calling them 100 times should have the same result as calling them once.

---

## 4. HTTP Status Codes

Status codes tell the client what happened. They're grouped into ranges:

| Range | Meaning | Examples |
|-------|---------|---------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 Moved Permanently, 304 Not Modified |
| 4xx | Client Error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | Server Error | 500 Internal Server Error, 503 Service Unavailable |

**Memorize these critical ones:**
- **200** — Request succeeded
- **201** — Resource created successfully
- **400** — The client sent bad data (validate your inputs!)
- **401** — Not authenticated (no valid login)
- **403** — Authenticated but not *authorized* (no permission)
- **404** — Resource doesn't exist
- **500** — Your server crashed — check your logs!

---

## 5. What is a REST API?

**REST (Representational State Transfer)** is an architectural *style* — a set of principles for designing APIs. A REST API uses HTTP methods and status codes correctly and organizes resources around URLs.

### REST Principles:
1. **Resources are nouns, not verbs** — \`/users\` not \`/getUsers\`
2. **Use HTTP methods meaningfully** — GET to read, POST to create, etc.
3. **Stateless** — No session stored on the server
4. **Consistent URL structure** — Follow a predictable pattern

### Example: A Well-Designed REST API for a Blog

\`\`\`
GET    /posts          → List all posts
GET    /posts/42       → Get post with ID 42
POST   /posts          → Create a new post
PUT    /posts/42       → Replace post 42 entirely
PATCH  /posts/42       → Update parts of post 42
DELETE /posts/42       → Delete post 42

GET    /posts/42/comments  → Get all comments on post 42
POST   /posts/42/comments  → Add a comment to post 42
\`\`\`

---

## 6. Building a Simple REST API in Node.js

\`\`\`javascript
const express = require('express');
const app = express();
app.use(express.json()); // Parse JSON request bodies

// In-memory "database" (for demo only)
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];
let nextId = 3;

// GET /users — List all users
app.get('/users', (req, res) => {
  res.status(200).json(users);
});

// GET /users/:id — Get specific user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json(user);
});

// POST /users — Create new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const newUser = { id: nextId++, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

// DELETE /users/:id — Delete user
app.delete('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  users.splice(index, 1);
  res.status(204).send(); // 204 = success but no content to return
});

app.listen(3000, () => console.log('API running on port 3000'));
\`\`\`

---

## 7. Common Mistakes Beginners Make

❌ **Using GET to delete data** — Never do \`GET /deleteUser?id=5\`. Use DELETE.

❌ **Returning 200 for errors** — \`{ status: "error" }\` with a 200 status code is *wrong*. Use the correct 4xx/5xx code.

❌ **Putting verbs in URLs** — \`/getUser\`, \`/createPost\`, \`/deleteAccount\` are all wrong. URLs should be *nouns*.

❌ **Not validating inputs** — Always validate that required fields exist and are the right type before using them.

---

## 8. Exercise

**Task:** Build a REST API for a simple Todo list using Node.js and Express (or any language/framework you prefer):

**Requirements:**
- \`GET /todos\` — return all todos as JSON
- \`POST /todos\` — create a new todo (body: \`{ title: string, completed: boolean }\`)
- \`PATCH /todos/:id\` — mark a todo as completed
- \`DELETE /todos/:id\` — remove a todo
- Use correct HTTP status codes for every scenario (not found, bad input, success)

Submit your code file(s) and briefly explain your design decisions.
`,

  // ─── BACKEND: sql_fundamentals ─────────────────────────────────────────────
  sql_fundamentals: `
# SQL Fundamentals

Databases are where your application's data *lives*. SQL (Structured Query Language) is the language you use to talk to relational databases like PostgreSQL, MySQL, and SQLite. This is not optional knowledge — it is foundational.

---

## 1. What is a Database?

A **database** is an organized collection of data stored persistently (it survives if the server restarts). A **relational database** organizes data into **tables** (like spreadsheets with rows and columns) where tables can relate to each other.

Think of a table like this:

**users table:**

| id | name    | email             | created_at |
|----|---------|-------------------|------------|
| 1  | Alice   | alice@example.com | 2024-01-01 |
| 2  | Bob     | bob@example.com   | 2024-01-05 |
| 3  | Charlie | charlie@test.com  | 2024-01-10 |

- **Column** = a property (name, email)
- **Row** = a single record (one user)
- **Primary Key** = a unique identifier for each row (the \`id\` column)

---

## 2. Core SQL Commands

### SELECT — Reading Data

\`\`\`sql
-- Get every column from every row
SELECT * FROM users;

-- Get only specific columns
SELECT id, name, email FROM users;

-- Filter with WHERE
SELECT * FROM users WHERE id = 2;

-- Multiple conditions
SELECT * FROM users WHERE name = 'Alice' AND created_at < '2024-02-01';

-- Pattern matching (LIKE)
SELECT * FROM users WHERE email LIKE '%@gmail.com';

-- Sort results
SELECT * FROM users ORDER BY created_at DESC;

-- Limit results
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
\`\`\`

### INSERT — Creating Data

\`\`\`sql
INSERT INTO users (name, email, created_at)
VALUES ('David', 'david@example.com', NOW());
\`\`\`

### UPDATE — Modifying Data

\`\`\`sql
-- Update ONE specific row (always use WHERE!)
UPDATE users SET email = 'newemail@example.com' WHERE id = 3;

-- Update multiple rows
UPDATE users SET verified = true WHERE created_at < '2024-01-01';
\`\`\`

> ⚠️ **DANGER:** Running \`UPDATE users SET email = 'x'\` WITHOUT a WHERE clause updates EVERY row. This is one of the most common developer mistakes. Always double-check your WHERE clause.

### DELETE — Removing Data

\`\`\`sql
-- Delete one specific row
DELETE FROM users WHERE id = 3;

-- Delete with condition
DELETE FROM users WHERE verified = false AND created_at < '2023-01-01';
\`\`\`

---

## 3. Table Relationships (The "Relational" Part)

The power of relational databases is linking tables together.

**Example: Users and Posts**

\`\`\`sql
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create posts table — each post BELONGS to a user
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

The \`user_id\` column in \`posts\` is a **Foreign Key** — it references the \`id\` in \`users\`. This ensures a post can only belong to a user that *actually exists*.

---

## 4. JOINs — Querying Across Tables

A JOIN combines rows from two tables based on a related column:

\`\`\`sql
-- Get all posts together with the author's name
SELECT
  posts.id,
  posts.title,
  users.name AS author_name,
  users.email AS author_email,
  posts.created_at
FROM posts
INNER JOIN users ON posts.user_id = users.id
WHERE posts.published = true
ORDER BY posts.created_at DESC;
\`\`\`

**Types of JOINs:**
- **INNER JOIN** — Only rows where both sides match
- **LEFT JOIN** — All rows from the left table, plus matching rows from right (NULL if no match)
- **RIGHT JOIN** — All rows from right, plus matching from left

\`\`\`sql
-- LEFT JOIN example: Get all users, even those with no posts
SELECT users.name, COUNT(posts.id) AS post_count
FROM users
LEFT JOIN posts ON users.id = posts.user_id
GROUP BY users.id, users.name
ORDER BY post_count DESC;
\`\`\`

---

## 5. Aggregation & Grouping

\`\`\`sql
-- Count rows
SELECT COUNT(*) FROM users;

-- Sum, average
SELECT AVG(price), MIN(price), MAX(price) FROM products;

-- Group by: Count posts per user
SELECT user_id, COUNT(*) AS post_count
FROM posts
GROUP BY user_id
HAVING COUNT(*) > 5  -- HAVING filters groups (like WHERE but for groups)
ORDER BY post_count DESC;
\`\`\`

---

## 6. Indexes — Making Queries Fast

As your table grows to millions of rows, some queries get slow. An **index** is like an index at the back of a book — it lets the database find rows without scanning every single one.

\`\`\`sql
-- Without index: Database scans all 10 million rows
SELECT * FROM users WHERE email = 'alice@example.com'; -- SLOW

-- Create an index on email
CREATE INDEX idx_users_email ON users(email);

-- Now the same query is instant ⚡
SELECT * FROM users WHERE email = 'alice@example.com'; -- FAST
\`\`\`

**When to create an index:**
- Columns you frequently filter by (\`WHERE\`)
- Foreign key columns (\`user_id\`, \`post_id\`)
- Columns you sort by frequently (\`ORDER BY\`)

**Trade-off:** Indexes speed up reads but slow down writes (because the index must be updated on every INSERT/UPDATE/DELETE).

---

## 7. Exercise

Create a PostgreSQL (or SQLite) database schema and queries for a simple library system:

**Requirements:**
1. Create tables for: \`books\`, \`members\`, and \`loans\` (a loan records which member borrowed which book and when)
2. Insert at least 5 books, 3 members, and 4 loans into your schema
3. Write SQL queries that:
   - Return all books currently on loan (not yet returned)
   - Show each member with a count of how many books they've borrowed total
   - Find all books by a specific author
4. Add an appropriate index to improve query performance — explain which column you indexed and why

Submit your SQL file with all CREATE TABLE, INSERT, and SELECT statements.
`,

  // ─── BACKEND: nodejs_basics ────────────────────────────────────────────────
  nodejs_basics: `
# Node.js Fundamentals

Node.js lets you run JavaScript on a server — outside the browser. It powers some of the most scalable systems in the world (Netflix, LinkedIn, PayPal all use it). Understanding *how* it works, not just how to use it, will make you a far better backend developer.

---

## 1. What is Node.js (and Why Does It Matter)?

Traditionally, JavaScript only ran inside browsers. In 2009, Ryan Dahl took the V8 JavaScript engine (the same engine Chrome uses) and embedded it into a runtime you could run on servers. That became Node.js.

**What makes Node.js special:**
- **Non-blocking I/O** — it can handle thousands of simultaneous connections without waiting for each one
- **Single-threaded Event Loop** — instead of spawning a new thread per request (like Java), Node uses one thread with an event loop
- **npm** — the world's largest package ecosystem (2+ million packages)

---

## 2. The Event Loop (Understanding It Deeply)

This is the single most important concept in Node.js.

\`\`\`
Traditional Server (Python, Java):
  Request 1 arrives → Spawn Thread 1 → Thread waits for DB... → Responds
  Request 2 arrives → Spawn Thread 2 → Thread waits for DB... → Responds
  ❌ 10,000 requests = 10,000 threads = runs out of memory

Node.js:
  Request 1 arrives → "Hey DB, get user #1" → DON'T WAIT → move on
  Request 2 arrives → "Hey DB, get user #2" → DON'T WAIT → move on
  [DB responds for Request 1] → Handle it → Send response
  [DB responds for Request 2] → Handle it → Send response
  ✅ One thread handles 10,000 requests efficiently
\`\`\`

This is called **async, non-blocking I/O**. Node.js is great at things involving waiting (database calls, file reads, API calls) because it doesn't block while waiting.

---

## 3. Your First Node.js Server

\`\`\`javascript
// server.js
const http = require('http'); // Built-in Node.js module

const server = http.createServer((req, res) => {
  // req = the incoming request
  // res = the response we'll send back

  console.log(\`\${req.method} \${req.url}\`); // Log every request

  // Set response headers
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;

  // Send the response body
  res.end(JSON.stringify({ message: 'Hello from Node.js!', url: req.url }));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
\`\`\`

Run it: \`node server.js\` then visit \`http://localhost:3000\`

---

## 4. Modules — Organizing Code

Node.js uses a module system. Every file is its own module. You use \`require()\` to import and \`module.exports\` to export.

\`\`\`javascript
// math.js — a module
function add(a, b) { return a + b; }
function multiply(a, b) { return a * b; }

module.exports = { add, multiply }; // Export what we want to share

// app.js — using the module
const math = require('./math'); // Note: ./ means "same directory"
console.log(math.add(5, 3));      // 8
console.log(math.multiply(4, 6)); // 24
\`\`\`

Modern Node.js also supports ES Modules (\`import\`/\`export\`) — the same syntax as frontend JavaScript.

---

## 5. npm — Package Manager

npm (Node Package Manager) lets you install and use code that other developers have published.

\`\`\`bash
# Initialise a new project (creates package.json)
npm init -y

# Install a package (e.g., Express framework)
npm install express

# Install a dev-only package (not needed in production)
npm install --save-dev nodemon

# Install all packages from package.json
npm install

# Run a custom script defined in package.json
npm run dev
\`\`\`

**package.json** is the configuration file for your Node.js project:

\`\`\`json
{
  "name": "my-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
\`\`\`

---

## 6. Async/Await — Writing Non-Blocking Code

Callback hell was the original way to handle async operations. Today we use \`async/await\`:

\`\`\`javascript
const fs = require('fs').promises; // The promises version of the file system module

// ❌ Old way (callback hell)
fs.readFile('config.json', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const config = JSON.parse(data);
  // Now do something with config...
});

// ✅ Modern way (async/await)
async function loadConfig() {
  try {
    const data = await fs.readFile('config.json', 'utf8'); // WAIT for file read
    const config = JSON.parse(data);
    return config;
  } catch (err) {
    console.error('Failed to load config:', err);
    throw err;
  }
}

// Using the function
async function main() {
  const config = await loadConfig();
  console.log('Database host:', config.db.host);
}

main();
\`\`\`

**Key rule:** You can only use \`await\` inside a function marked \`async\`.

---

## 7. Environment Variables

Never hardcode secrets (passwords, API keys) in your code. Use environment variables:

\`\`\`bash
# .env file (NEVER commit this to git!)
DATABASE_URL=postgres://localhost:5432/mydb
JWT_SECRET=super_secret_key_here
PORT=3000
\`\`\`

\`\`\`javascript
// Install dotenv: npm install dotenv
require('dotenv').config(); // Load .env into process.env

const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;

console.log('Starting server on port:', port);
\`\`\`

---

## 8. Exercise

Build a Node.js HTTP server (using only built-in modules — no Express) that:

1. Handles \`GET /\` — returns a JSON object with a welcome message and the current server time
2. Handles \`GET /items\` — returns a hardcoded JSON array of 5 items (objects with id, name, price)
3. Handles \`POST /items\` — reads the JSON body and logs the new item to the console (respond with 201 Created)
4. Handles any other path — returns 404 with \`{ error: "Not Found" }\`
5. Logs every request to the console in the format: \`[TIMESTAMP] METHOD /path\`

**Hint:** For POST, you'll need to read the request body using a data/end event stream.

Submit your \`server.js\` file.
`,

  // ─── FRONTEND: html ────────────────────────────────────────────────────────
  html: `
# Semantic HTML5 & Accessibility

HTML is the skeleton of every web page. But writing *good* HTML is much more than just making things appear on screen. Semantic HTML and accessibility are the foundations that distinguish professional work from amateur work.

---

## 1. What is Semantic HTML?

**Semantic HTML** means using HTML elements for their *meaning*, not just their appearance. The browser doesn't care if you put everything in \`<div>\` tags — but search engines, screen readers, and other developers do.

\`\`\`html
<!-- ❌ BAD: Meaningless divs everywhere -->
<div class="header">
  <div class="logo">My Site</div>
  <div class="nav">
    <div>Home</div>
    <div>About</div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="article-title">My Post</div>
    <div class="article-body">Content here...</div>
  </div>
</div>
<div class="footer">Copyright 2024</div>

<!-- ✅ GOOD: Semantic elements tell the story -->
<header>
  <a href="/" aria-label="Home">My Site</a>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>My Post</h1>
    <p>Content here...</p>
  </article>
</main>
<footer>
  <p><small>Copyright 2024</small></p>
</footer>
\`\`\`

---

## 2. Essential Semantic Elements

| Element | Meaning |
|---------|---------|
| \`<header>\` | Top of page or section (logo, nav) |
| \`<nav>\` | Navigation links |
| \`<main>\` | Primary content of the page (only one per page) |
| \`<article>\` | Self-contained content (blog post, news article) |
| \`<section>\` | Thematic grouping of content |
| \`<aside>\` | Sidebar or supplementary content |
| \`<footer>\` | Bottom of page or section |
| \`<figure>\` | Image or diagram with caption |
| \`<figcaption>\` | Caption for a figure |
| \`<time>\` | A date/time (machine-readable) |
| \`<address>\` | Contact information |
| \`<mark>\` | Highlighted/relevant text |

---

## 3. Headings — The Outline of Your Page

Headings (\`h1\`–\`h6\`) create a document outline. Screen readers use them to navigate. Search engines use them to understand page structure.

**Rules:**
- Only **one \`h1\`** per page — it's the main title
- Don't skip heading levels (don't jump from h2 to h4)
- Use headings for *structure*, not for *styling*

\`\`\`html
<h1>The Complete Guide to Node.js</h1>

  <h2>1. Introduction</h2>
    <h3>What is Node.js?</h3>
    <h3>Why was it created?</h3>

  <h2>2. Getting Started</h2>
    <h3>Installation</h3>
    <h3>Your First Server</h3>
\`\`\`

---

## 4. Accessibility (a11y) — Building for Everyone

Accessibility means making your website usable by people with disabilities — blind users relying on screen readers, keyboard-only users, people with motor impairments, etc.

### Alt Text for Images

\`\`\`html
<!-- ❌ Missing alt text — screen reader announces "image" -->
<img src="chart.png">

<!-- ❌ Generic alt text -->
<img src="chart.png" alt="chart">

<!-- ✅ Descriptive alt text -->
<img src="revenue-chart.png" alt="Bar chart showing 40% revenue growth from Q1 to Q4 2024">

<!-- ✅ Decorative images get empty alt (screen reader skips it) -->
<img src="decorative-wave.svg" alt="">
\`\`\`

### Forms — Label Everything

\`\`\`html
<!-- ❌ Input with no label -->
<input type="email" placeholder="Email">

<!-- ✅ Properly labelled input -->
<label for="email">Email address</label>
<input
  type="email"
  id="email"
  name="email"
  required
  autocomplete="email"
  aria-describedby="email-hint"
>
<p id="email-hint" style="color: gray;">We'll never share your email.</p>
\`\`\`

### Buttons vs Links

\`\`\`html
<!-- ❌ Using a div as a button — not keyboard accessible -->
<div class="btn" onclick="submitForm()">Submit</div>

<!-- ✅ Use actual button elements for actions -->
<button type="submit">Submit</button>

<!-- ✅ Use links for navigation -->
<a href="/dashboard">Go to Dashboard</a>
\`\`\`

### ARIA Attributes

ARIA (Accessible Rich Internet Applications) attributes add semantic meaning when HTML alone isn't enough:

\`\`\`html
<!-- Announce dynamic content changes -->
<div role="alert" aria-live="polite">
  Form submitted successfully!
</div>

<!-- Describe complex UI patterns -->
<button
  aria-expanded="false"
  aria-controls="dropdown-menu"
  onclick="toggleMenu()"
>
  Options ▼
</button>
<ul id="dropdown-menu" hidden>
  <li><a href="/profile">Profile</a></li>
  <li><a href="/settings">Settings</a></li>
</ul>
\`\`\`

---

## 5. Exercise

Build a semantic, accessible webpage for a blog post about "Climate Change":

**Requirements:**
1. Proper \`<!DOCTYPE html>\`, \`<html lang="en">\`, \`<head>\` with charset and viewport meta tags
2. A \`<header>\` with a site logo/title and \`<nav>\` with at least 3 navigation links
3. A \`<main>\` containing one \`<article>\` with:
   - Exactly one \`<h1>\` for the article title
   - At least 3 \`<section>\` elements with \`<h2>\` headings
   - One \`<figure>\` with an image and \`<figcaption>\`
   - A \`<time>\` element for the publish date
4. A contact \`<form>\` with: name field, email field, message textarea, and submit button — all properly labelled
5. A \`<footer>\` with copyright and a link to your Twitter/LinkedIn

Validate your HTML at [validator.w3.org](https://validator.w3.org) and correct all errors before submitting.
`,

  // FALLBACK for content not yet written
  _fallback: `
# {title}

This topic is being prepared by our content team. The detailed guide will be available soon.

In the meantime, here are some excellent resources to get you started:
- Search for this topic on [MDN Web Docs](https://developer.mozilla.org)
- Look it up on [freeCodeCamp](https://www.freecodecamp.org)
- Find a tutorial on [YouTube](https://youtube.com)

Come back soon for the full in-depth guide with code examples and exercises!
`
};

export function getMockContent(trackId: string, moduleId: string, topicId: string): string {
  // Look up content by topic ID directly
  if (contentRegistry[topicId]) {
    return contentRegistry[topicId];
  }

  // Try track_topicId combination
  const trackTopicKey = \`\${trackId}_\${topicId}\`;
  if (contentRegistry[trackTopicKey]) {
    return contentRegistry[trackTopicKey];
  }

  // Fallback for topics without dedicated content yet
  const title = topicId
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return contentRegistry._fallback.replace('{title}', title);
}
