// Phase 2 - Shared (Terminal, Git) + Phase 3 (HTTP, JSON)

export const phase2SharedContent: Record<string, string> = {

    terminal: `
# The Terminal — Your Most Powerful Tool

The terminal (also called the command line, shell, or console) is a text-based interface to your computer. Every professional developer uses it daily. As a backend engineer, you'll use it to run servers, manage files, install packages, deploy code, and control remote machines.

---

## 1. Why Learn the Terminal?

- **Speed** — it's faster than clicking through GUIs for most developer tasks
- **Automation** — you can script repetitive tasks
- **Remote servers** — SSH into a server and there's NO GUI, only terminal
- **Developer tools** — npm, git, docker, python — all CLI-first

---

## 2. Navigation — Moving Around Your File System

\`\`\`bash
# Where am I?
pwd                     # Print Working Directory — shows your current path
# /home/alice/projects

# List files and directories
ls                      # basic list
ls -l                   # long format (permissions, size, date)
ls -la                  # include hidden files (starting with .)
ls -lh                  # human-readable sizes (KB, MB)
ls *.js                 # list only .js files

# Change directory
cd /home/alice          # absolute path (starts from root /)
cd projects/my-app      # relative path (from current directory)
cd ..                   # go up one level
cd ../..                # go up two levels
cd ~                    # go to home directory
cd -                    # go back to previous directory

# Make directories
mkdir new-folder
mkdir -p src/components/ui    # create nested dirs (-p = parents)

# File operations
touch server.js         # create empty file
touch .env              # create hidden file
cp file.js copy.js      # copy file
cp -r folder/ backup/   # copy directory (-r = recursive)
mv old.js new.js        # rename file
mv file.js ../          # move file up one level
rm file.js              # delete file (PERMANENT — no recycle bin!)
rm -rf folder/          # delete folder and everything in it (BE CAREFUL)
\`\`\`

---

## 3. Reading Files

\`\`\`bash
cat package.json        # print entire file to terminal
less server.js          # scrollable view (q to quit)
head -20 server.js      # first 20 lines
tail -20 server.log     # last 20 lines
tail -f server.log      # follow file as it grows (great for logs!)
wc -l server.js         # count lines in file
\`\`\`

---

## 4. Searching

\`\`\`bash
# grep — search text within files
grep "TODO" server.js           # find "TODO" in one file
grep -r "console.log" src/      # search recursively in folder
grep -rn "TODO" src/            # show line numbers
grep -ri "error" logs/          # case-insensitive
grep -v "test" src/index.js     # lines NOT matching

# find — find files
find . -name "*.js"             # find all .js files
find . -name "*.js" -not -path "*/node_modules/*"  # exclude node_modules
find . -type d -name "utils"    # find directories named utils
find . -newer package.json      # files modified after package.json
\`\`\`

---

## 5. Processes

\`\`\`bash
# Running processes
node server.js          # run a Node.js file (blocks terminal)
node server.js &        # run in background (&)

# Kill a process
Ctrl+C                  # interrupt/kill current process
Ctrl+Z                  # suspend current process

ps aux                  # list all running processes
ps aux | grep node      # find node processes

kill 1234               # kill process with PID 1234
kill -9 1234            # force kill (SIGKILL)

lsof -i :3000           # find what's using port 3000
kill $(lsof -t -i:3000) # kill process on port 3000
\`\`\`

---

## 6. Environment Variables

\`\`\`bash
# View environment variables
env                     # list all env vars
echo $HOME              # print specific variable
echo $PATH              # your command search path

# Set variables (in current session only)
export PORT=3000
export NODE_ENV=development

# Use in commands
PORT=8080 node server.js   # set only for this command

# .env file (used with dotenv package)
# Create: touch .env
# Contents:
PORT=3000
DATABASE_URL=postgres://localhost:5432/mydb
JWT_SECRET=my-secret-key
NODE_ENV=development

# Load in Node.js:
require('dotenv').config(); // process.env.PORT is now "3000"
\`\`\`

---

## 7. Pipes and Redirection

\`\`\`bash
# Pipe (|) — pass output of one command as input to next
ls -la | grep ".js"                    # find js files in ls output
cat server.log | grep "ERROR"          # filter log for errors
cat server.log | grep "ERROR" | wc -l # count error lines

# Redirect output to files
node server.js > output.log            # redirect stdout to file
node server.js 2> errors.log           # redirect stderr only
node server.js > output.log 2>&1       # redirect both to same file
node server.js >> output.log           # append (don't overwrite)
\`\`\`

---

## 8. Shortcuts That Save Time

\`\`\`bash
# History and recall
history                 # list recent commands
!!                      # repeat last command
!grep                   # repeat last command starting with 'grep'
Ctrl+R                  # search command history (type to filter)

# Cursor movement
Ctrl+A                  # go to start of line
Ctrl+E                  # go to end of line
Ctrl+U                  # clear everything before cursor
Ctrl+K                  # clear everything after cursor
Alt+B                   # move back one word
Alt+F                   # move forward one word

# Auto-complete
Tab                     # autocomplete file/directory names
Tab Tab                 # show all possible completions
\`\`\`

---

## 9. SSH — Connecting to Remote Servers

\`\`\`bash
# Connect to a server
ssh alice@192.168.1.10          # user@ip
ssh -i ~/.ssh/my-key.pem ubuntu@ec2-xx.compute.amazonaws.com  # with key file

# Transfer files
scp file.js alice@server:/home/alice/  # copy file to server
scp -r project/ alice@server:/home/alice/  # copy folder

# SSH config (~/.ssh/config) — create shortcuts
Host myserver
  HostName 192.168.1.10
  User alice
  IdentityFile ~/.ssh/my-key.pem

# Now just:
ssh myserver
\`\`\`

---

## 10. Exercise

Complete these terminal tasks in order (on your own machine):

1. Navigate to your Documents folder. Create a new directory \`terminal-practice\` and enter it.
2. Create 3 files: \`app.js\`, \`config.json\`, and \`.env\`
3. Write some content to app.js using \`echo "console.log('hello')" > app.js\`
4. List all files including hidden ones. Confirm \`.env\` appears.
5. Search for "console.log" inside app.js using grep
6. Create a subdirectory \`logs/\`, create a file \`app.log\` inside it
7. Write 10 lines to app.log using a loop: \`for i in {1..10}; do echo "Log line $i" >> logs/app.log; done\`
8. Use \`tail -5\` to show last 5 lines, then \`grep "5" logs/app.log\` to find lines containing "5"
9. Find all files in the current directory using \`find . -type f\`
10. Delete the entire \`terminal-practice\` directory safely

Document each command and its output in a \`terminal-session.txt\` file.
`,

    git_basics: `
# Git — Version Control for Professionals

Git is the tool that lets multiple developers work on the same codebase without destroying each other's work. It tracks every change ever made, lets you experiment safely, and is the backbone of professional software development. Every company that writes code uses Git.

---

## 1. What is Git and Why Does It Matter?

Git is a **distributed version control system**. It means:
- Every developer has a full copy of the entire project history
- You can work offline
- Nothing is ever truly lost (you can go back to any point in time)
- Multiple people can work in parallel on different features

Without Git, teams email zip files around, overwrite each other's changes, and can never answer "what changed since last Tuesday?"

---

## 2. Core Concepts

| Concept | What it means |
|---------|--------------|
| **Repository (repo)** | A Git-tracked project folder |
| **Commit** | A saved snapshot of your changes |
| **Branch** | An independent line of development |
| **Working directory** | Files as they are now (unstaged) |
| **Staging area** | Changes marked "ready to commit" |
| **HEAD** | Pointer to the current commit you're on |
| **Remote** | A repo hosted elsewhere (GitHub, GitLab) |

---

## 3. Setting Up and Starting

\`\`\`bash
# One-time global config
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global core.editor "code --wait"  # use VS Code as editor
git config --global init.defaultBranch main    # use 'main' not 'master'

# Start tracking a project
cd my-project
git init                    # creates .git/ folder in this directory

# OR clone an existing repository
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git my-folder-name  # custom folder name
\`\`\`

---

## 4. The Daily Workflow

\`\`\`bash
# 1. Check status — always start here
git status                  # see what's changed, what's staged

# 2. Stage changes
git add server.js           # stage specific file
git add src/                # stage entire folder
git add .                   # stage ALL changes in current dir (careful!)
git add -p                  # interactively choose what to stage (chunk by chunk)

# 3. Commit
git commit -m "Add user authentication endpoint"        # with inline message
git commit                  # opens editor for longer message

# Good commit messages:
# ✅ "Add JWT authentication to user routes"
# ✅ "Fix: email validation accepts .co.uk domains"
# ✅ "Refactor: extract database config into separate module"
# ❌ "fix stuff"
# ❌ "wip"
# ❌ "asdfgh"

# 4. View history
git log                     # full history
git log --oneline           # compact one-line format
git log --oneline --graph   # with branch visualisation
git log -10                 # last 10 commits
git log --author="Alice"    # commits by specific author
git log -- src/server.js    # commits that touched a specific file
\`\`\`

---

## 5. Branching

\`\`\`bash
# List branches
git branch                  # local branches
git branch -r               # remote branches
git branch -a               # all branches

# Create and switch
git branch feature/user-auth    # create branch
git checkout feature/user-auth  # switch to it
git checkout -b feature/user-auth  # create AND switch (shorthand)
git switch -c feature/user-auth    # modern way (git 2.23+)

# Switch back
git switch main
git checkout main

# Delete branch
git branch -d feature/user-auth   # safe delete (only if merged)
git branch -D feature/user-auth   # force delete
\`\`\`

---

## 6. Merging

\`\`\`bash
# Fast-forward merge (linear history — branch is ahead of main)
git switch main
git merge feature/user-auth  # if no conflicts: fast-forward

# Merge commit (when histories have diverged)
git merge --no-ff feature/user-auth  # always create a merge commit

# Rebasing — replay your branch on top of main (cleaner history)
git switch feature/user-auth
git rebase main              # replay feature commits on top of latest main

# ⚠️ Rule: Never rebase commits that have been pushed to shared repos
#          Rebase is only safe for local-only branches

# Pull with rebase (keeps history clean)
git pull --rebase origin main
\`\`\`

---

## 7. Resolving Merge Conflicts

Conflicts happen when two branches modify the same part of a file:

\`\`\`bash
# During a merge or rebase, if conflicts occur:
git status  # shows files with conflicts

# Conflict markers look like this in the file:
# <<<<<<< HEAD
# const port = 3000;      (your version)
# =======
# const port = 8080;      (incoming version)
# >>>>>>> feature/change-port

# Resolve by:
# 1. Open the file, remove markers, keep the right code
# 2. Stage the resolved file
git add server.js

# 3. Continue the merge or rebase
git commit           # for merge
git rebase --continue  # for rebase

# To abort if things go bad
git merge --abort
git rebase --abort
\`\`\`

---

## 8. Working with Remote Repositories

\`\`\`bash
# View remotes
git remote -v           # list remote connections

# Add remote
git remote add origin https://github.com/user/repo.git

# Fetch vs Pull
git fetch origin        # download changes but don't apply
git pull origin main    # fetch + merge (or fetch + rebase with --rebase)

# Push
git push origin main    # push local main to remote
git push -u origin feature/auth  # push new branch (-u sets upstream)
git push --force-with-lease  # safer force push (rejects if remote changed)

# Delete remote branch
git push origin --delete feature/old-branch
\`\`\`

---

## 9. Undoing Things

\`\`\`bash
# Unstage a file (keep changes)
git restore --staged server.js   # modern way
git reset HEAD server.js         # old way

# Discard changes in working directory
git restore server.js            # WARNING: permanent!

# Amend last commit (before pushing!)
git add forgotten-file.js
git commit --amend --no-edit    # add file to last commit
git commit --amend -m "Better message"  # change last message

# Undo a commit (but keep changes)
git reset --soft HEAD~1         # undo commit, keep changes staged
git reset HEAD~1                # undo commit, keep changes unstaged
git reset --hard HEAD~1         # undo commit AND discard changes (careful!)

# Create a revert commit (safe for shared repos)
git revert abc1234              # creates new commit that undoes the old one

# Stash work in progress
git stash                       # save uncommitted changes temporarily
git stash push -m "WIP: auth feature"  # with description
git stash list                  # see all stashes
git stash pop                   # apply most recent stash and remove it
git stash apply stash@{1}       # apply specific stash (keep it)
git stash drop stash@{0}        # delete a stash
\`\`\`

---

## 10. .gitignore — What Git Should Never Track

\`\`\`bash
# .gitignore — create in root of project
node_modules/
dist/
build/
.env
.env.local
.env.production
*.log
.DS_Store         # macOS folder metadata
**/__pycache__/   # Python compiled files
*.pyc
.venv/            # Python virtual env
*.sqlite          # local database files
\`\`\`

---

## 11. Professional Git Workflow (Feature Branch Workflow)

\`\`\`bash
# 1. Always start from up-to-date main
git switch main
git pull origin main

# 2. Create a feature branch
git switch -c feature/add-password-reset

# 3. Work on your feature
# ... write code ...
git add .
git commit -m "Add password reset email service"
# ... more changes ...
git commit -m "Add token validation for password reset"

# 4. Keep up with main changes during development
git fetch origin
git rebase origin/main  # replay your commits on top of latest main

# 5. Push your branch
git push -u origin feature/add-password-reset

# 6. Open a Pull Request on GitHub/GitLab
# Team reviews your code, you address feedback
git add .
git commit -m "Address review: sanitise email before sending"
git push

# 7. After PR is approved: merge to main (done via GitHub usually)
# 8. Delete the branch
git branch -d feature/add-password-reset
git push origin --delete feature/add-password-reset
\`\`\`

---

## 12. Exercise

Work through these Git tasks:

1. Create a new directory \`git-practice\`, initialise a new git repo inside it.
2. Set up a \`.gitignore\` that excludes \`node_modules/\`, \`.env\`, and \`*.log\`.
3. Create a \`README.md\` and \`app.js\`. Stage and commit them with a descriptive message.
4. Create a branch \`feature/add-calculator\`. Add a \`calculator.js\` file with add/subtract/multiply/divide functions. Commit this.
5. Switch back to \`main\`. Create a second branch \`feature/add-logger\` from \`main\`. Add a \`logger.js\`. Commit it.
6. Merge \`feature/add-calculator\` into \`main\`.
7. Merge \`feature/add-logger\` into \`main\` (this should create a merge commit).
8. Use \`git log --oneline --graph\` to view the full history. Save the output to a file.
9. Create an intentional conflict: on \`main\`, change a line in \`app.js\`; on a new branch, change the same line differently; merge the branch into main and resolve the conflict.
10. Use \`git stash\` to save some uncommitted changes, make a different commit, then \`git stash pop\` to restore them.

Document every command you ran and what happened.
`,

    http_deep: `
# HTTP — The Language of the Web

Every web request you've ever made used HTTP. As a backend developer, you don't just use HTTP — you BUILD things that speak it. Understanding it deeply means you can debug network issues, design robust APIs, and understand why your browser shows "404 Not Found" or "500 Internal Server Error".

---

## 1. How HTTP Actually Works

HTTP (HyperText Transfer Protocol) is a **request-response protocol**. The client sends a request; the server sends a response. That's it. Each exchange is independent — HTTP is **stateless** (the server doesn't "remember" you between requests by default).

\`\`\`
CLIENT                                    SERVER
  │                                          │
  │──── TCP connection established ─────────►│
  │                                          │
  │  GET /users/42 HTTP/1.1                 │
  │  Host: api.example.com                  │
  │  Authorization: Bearer abc123           │
  │  Accept: application/json               │
  │──────────────────────────────────────►  │
  │                                          │  (finds user, builds response)
  │  HTTP/1.1 200 OK                        │
  │  Content-Type: application/json         │
  │  Content-Length: 87                     │
  │                                          │
  │  {"id":42,"name":"Alice",...}           │
  │◄──────────────────────────────────────  │
  │                                          │
\`\`\`

---

## 2. HTTP Methods (Verbs)

\`\`\`
GET     /users          — Retrieve a list of users (NO body)
GET     /users/42       — Retrieve user with id 42 (NO body)
POST    /users          — Create a new user (body = new user data)
PUT     /users/42       — Replace user 42 entirely (body = full user)
PATCH   /users/42       — Update parts of user 42 (body = only changed fields)
DELETE  /users/42       — Delete user 42 (usually NO body)
HEAD    /users/42       — Same as GET but return ONLY headers (no body)
OPTIONS /users          — Ask what methods are allowed (used by CORS)
\`\`\`

**Idempotency** — critical concept:
- **Idempotent**: calling the same request multiple times has the same effect as calling it once
  - GET, HEAD, PUT, DELETE are idempotent
- **Non-idempotent**: calling multiple times has different effects
  - POST is NOT idempotent (submitting a form twice creates two records)

\`\`\`javascript
// Express showing all HTTP methods
const express = require('express');
const app = express();

app.get('/articles', (req, res) => res.json(articles));
app.post('/articles', (req, res) => { /* create */ });
app.get('/articles/:id', (req, res) => { /* get one */ });
app.put('/articles/:id', (req, res) => { /* full replace */ });
app.patch('/articles/:id', (req, res) => { /* partial update */ });
app.delete('/articles/:id', (req, res) => res.status(204).send());
\`\`\`

---

## 3. Status Codes — What They Really Mean

\`\`\`
2xx — SUCCESS
  200 OK                  — Request succeeded, here's the data (GET, PUT, PATCH)
  201 Created             — Resource was created, here it is (POST)
  204 No Content          — Success but nothing to return (DELETE)
  206 Partial Content     — Used for range requests (video streaming)

3xx — REDIRECT
  301 Moved Permanently   — Resource has moved forever (update your bookmarks)
  302 Found               — Temporary redirect (keeps using old URL)
  304 Not Modified        — Client's cached version is still valid (use it)

4xx — CLIENT ERROR (YOUR fault, as the API caller)
  400 Bad Request         — Invalid request syntax or validation failure
  401 Unauthorized        — Not logged in / no credentials
  403 Forbidden           — Logged in but NOT allowed to do this
  404 Not Found           — Resource doesn't exist
  405 Method Not Allowed  — Method not supported (e.g., DELETE on a read-only endpoint)
  409 Conflict            — Conflict with current state (e.g., email already registered)
  410 Gone                — Resource existed but was permanently deleted
  422 Unprocessable Entity— Valid syntax but failed business logic validation
  429 Too Many Requests   — Rate limited

5xx — SERVER ERROR (SERVER's fault)
  500 Internal Server Error — Unhandled exception on server
  502 Bad Gateway         — Server got invalid response from upstream
  503 Service Unavailable — Server overloaded or in maintenance
  504 Gateway Timeout     — Server waited too long for upstream
\`\`\`

\`\`\`javascript
// Setting status codes in Express
res.status(200).json(data);        // explicit 200 (default for res.json)
res.status(201).json(newResource); // created
res.status(204).send();            // no content
res.status(400).json({ error: 'name is required' });
res.status(401).json({ error: 'Please log in' });
res.status(403).json({ error: 'Forbidden' });
res.status(404).json({ error: 'User not found' });
res.status(422).json({ error: 'Email format invalid', field: 'email' });
res.status(500).json({ error: 'Something went wrong' });
\`\`\`

---

## 4. HTTP Headers — Metadata About the Request/Response

Headers are key-value pairs that describe the message.

### Request Headers (sent by client)
\`\`\`
Host: api.example.com           — target server (required in HTTP/1.1)
Content-Type: application/json  — format of request body
Accept: application/json        — format the client can handle
Authorization: Bearer <token>   — authentication credentials
User-Agent: Mozilla/5.0 ...    — who sent the request
Cookie: session=abc123          — stored cookies
Origin: https://myapp.com       — where the request comes from (CORS)
If-None-Match: "abc123"         — ETag for caching
\`\`\`

### Response Headers (sent by server)
\`\`\`
Content-Type: application/json; charset=utf-8   — format of response body
Content-Length: 248                             — size in bytes
Set-Cookie: session=abc; HttpOnly; Secure       — create/update cookie
Access-Control-Allow-Origin: *                  — CORS permission
Cache-Control: no-cache                         — caching instructions
ETag: "5d8c72a5938347a8"                       — version identifier for caching
Location: /users/42                             — where to find created resource
X-Request-ID: uuid-here                         — custom header for tracing
\`\`\`

\`\`\`javascript
// Reading and setting headers in Express
app.get('/api/data', (req, res) => {
  // Reading request headers
  const contentType = req.headers['content-type'];
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // "Bearer TOKEN" → "TOKEN"

  // Setting response headers
  res.setHeader('X-API-Version', '2.0');
  res.setHeader('Cache-Control', 'no-store');

  // Or use header() (same thing)
  res.header('X-Request-ID', generateId());

  res.json({ data: 'here' });
});
\`\`\`

---

## 5. The Request Lifecycle in Express

\`\`\`
Incoming HTTP Request
        │
        ▼
  [Global Middleware]          ← app.use(express.json())
  [Global Middleware]          ← app.use(cors())
  [Global Middleware]          ← app.use(helmet())
  [Global Middleware]          ← app.use(logger)
        │
        ▼
  [Route-Level Middleware]     ← router.use(authenticate)
        │
        ▼
  [Specific Route Handler]     ← app.get('/users/:id', handler)
        │
        ▼
  [Response sent back]         ← res.json(...)
        │ (if error thrown)
        ▼
  [Error Handling Middleware]  ← app.use((err, req, res, next) => ...)
\`\`\`

---

## 6. Cookies and Sessions

\`\`\`javascript
// Setting a cookie
res.cookie('sessionId', 'abc123', {
  httpOnly: true,       // JS can't read this (prevents XSS)
  secure: true,         // only sent over HTTPS
  sameSite: 'strict',   // prevents CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
});

// Reading cookies
const sessionId = req.cookies.sessionId; // requires cookie-parser middleware

// Clearing a cookie
res.clearCookie('sessionId');
\`\`\`

---

## 7. Caching with HTTP Headers

\`\`\`javascript
// Tell browser to cache for 1 hour
res.setHeader('Cache-Control', 'public, max-age=3600');

// No caching (for sensitive/dynamic data)
res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

// ETag-based caching (validate freshness)
const data = getData();
const etag = generateHash(data);

if (req.headers['if-none-match'] === etag) {
  return res.status(304).send(); // client's cache is still valid
}

res.setHeader('ETag', etag);
res.json(data);
\`\`\`

---

## 8. HTTPS and TLS

HTTPS adds **encryption** to HTTP using TLS (Transport Layer Security):
- Data is encrypted in transit — nobody can read it as it travels
- Server identity is verified via SSL certificates
- Without HTTPS, credentials, tokens, and data are sent as plain text

In development: use plain HTTP locally. In production: **always use HTTPS** (handled by cloud load balancers or nginx, not Express directly).

---

## 9. Exercise

Build a mini "HTTP Explorer" in Node.js:

1. Use Node's built-in \`http\` module (no Express) to create a server that:
   - Responds to \`GET /\` with \`{ message: 'Hello from HTTP!' }\`
   - Responds to \`GET /headers\` with all incoming request headers
   - Responds to \`POST /echo\` with the exact body that was sent
   - Returns \`{ error: 'Not Found' }\` with status 404 for all other paths
   - Returns \`{ error: 'Method Not Allowed' }\` with status 405 if a non-GET request is made to \`/\` or \`/headers\`

2. Test every endpoint using \`curl\`:
\`\`\`bash
curl http://localhost:3000/
curl http://localhost:3000/headers
curl -X POST http://localhost:3000/echo -H "Content-Type: application/json" -d '{"hello":"world"}'
curl http://localhost:3000/missing
curl -X DELETE http://localhost:3000/
\`\`\`

3. Log every request with: method, path, status code, and response time in milliseconds.

Document your curl outputs for each endpoint.
`,

    json_formats: `
# JSON, Data Formats & Serialisation

JSON (JavaScript Object Notation) is the universal language that backends use to communicate — with frontends, mobile apps, other services, and databases. Understanding it thoroughly, along with when to use alternatives like XML or form data, is essential.

---

## 1. What is JSON?

JSON is a **text-based data format** that represents structured data. It's:
- Human-readable
- Language-independent (works in JavaScript, Python, Go, Java, etc.)
- Lightweight (no tags like XML)
- The default format for REST APIs

\`\`\`json
{
  "user": {
    "id": 42,
    "name": "Alice",
    "email": "alice@example.com",
    "age": 25,
    "isActive": true,
    "score": 98.5,
    "tags": ["developer", "designer"],
    "address": {
      "street": "123 Main St",
      "city": "Lagos"
    },
    "profileUrl": null
  }
}
\`\`\`

---

## 2. JSON Rules (Common Mistakes)

\`\`\`json
// ✅ Valid JSON
{
  "name": "Alice",    ← keys MUST be double-quoted strings
  "age": 25,          ← numbers: fine without quotes
  "active": true,     ← booleans: lowercase true/false
  "notes": null,      ← null is allowed
  "tags": ["a", "b"] ← arrays with quoted string items
}

// ❌ Invalid JSON (common mistakes)
{
  name: "Alice",         ← keys without quotes — NOT allowed
  "age": 25,
  // this is a comment  ← NO comments in JSON
  "active": True,        ← capital T — Python boolean, not JSON
  "data": undefined,     ← undefined doesn't exist in JSON
  "fn": function() {}    ← functions don't exist in JSON
}
\`\`\`

---

## 3. JSON in JavaScript

\`\`\`javascript
// Parse: string → JavaScript object
const jsonString = '{"name":"Alice","age":25}';
const obj = JSON.parse(jsonString);
console.log(obj.name); // "Alice"

// Stringify: JavaScript object → string
const user = { name: 'Alice', age: 25, password: 'hashed' };
const json = JSON.stringify(user);
// '{"name":"Alice","age":25,"password":"hashed"}'

// Pretty-printed (for logs, files)
const pretty = JSON.stringify(user, null, 2);
// {
//   "name": "Alice",
//   "age": 25,
//   "password": "hashed"
// }

// Filtering with replacer (exclude sensitive fields)
const safe = JSON.stringify(user, ['name', 'age']); // only these fields
// '{"name":"Alice","age":25}'

// Replacer function
const safeJson = JSON.stringify(user, (key, value) => {
  if (key === 'password') return undefined; // exclude
  return value;
});

// Error handling — JSON.parse throws on invalid input
try {
  const data = JSON.parse(invalidString);
} catch (error) {
  console.error('Invalid JSON:', error.message);
  return res.status(400).json({ error: 'Invalid JSON in request body' });
}

// toJSON — custom serialisation
class User {
  constructor(name, email, passwordHash) {
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
  }

  toJSON() {
    // passwordHash excluded from JSON.stringify automatically
    return { name: this.name, email: this.email };
  }
}
const alice = new User('Alice', 'alice@example.com', 'hash123');
JSON.stringify(alice); // '{"name":"Alice","email":"alice@example.com"}'
\`\`\`

---

## 4. Working with JSON in APIs

\`\`\`javascript
// Receiving JSON from client
app.use(express.json());  // middleware to parse JSON request bodies

app.post('/users', (req, res) => {
  const { name, email, age } = req.body; // body is already parsed

  // Validate
  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation failed',
      details: {
        name: !name ? 'required' : null,
        email: !email ? 'required' : null,
      }
    });
  }

  // Respond with JSON
  res.status(201).json({
    id: 1,
    name,
    email,
    createdAt: new Date().toISOString(), // always use ISO 8601 strings for dates!
  });
});

// Reading a JSON file
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Writing a JSON file
fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
\`\`\`

---

## 5. Dates in JSON

JSON has NO native Date type. Dates are always sent as strings. Use **ISO 8601**:

\`\`\`javascript
// Always serialize dates as ISO strings
const event = {
  title: 'Team meeting',
  startTime: new Date('2024-03-15T09:00:00Z').toISOString(),
  // "2024-03-15T09:00:00.000Z"
};

// Parse back on the receiving end
const received = JSON.parse(json);
const startDate = new Date(received.startTime); // reconstruct
\`\`\`

---

## 6. Content Negotiation — Not Just JSON

Your API should return the right format based on the client's \`Accept\` header:

\`\`\`javascript
app.get('/report', (req, res) => {
  const accept = req.headers['accept'];
  const data = generateReport();

  if (accept?.includes('text/csv')) {
    const csv = convertToCSV(data);
    res.type('text/csv').send(csv);
  } else if (accept?.includes('application/xml')) {
    const xml = convertToXML(data);
    res.type('application/xml').send(xml);
  } else {
    res.json(data); // default: JSON
  }
});
\`\`\`

---

## 7. Form Data and URL-Encoded

Not everything is JSON. HTML forms send \`application/x-www-form-urlencoded\`:

\`\`\`javascript
// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
  const { username, password } = req.body; // from HTML form
  // ...
});
\`\`\`

File uploads use \`multipart/form-data\` (handled by \`multer\` library — covered in Phase 7).

---

## 8. API Response Design

Design consistent JSON responses across your entire API:

\`\`\`javascript
// ✅ Consistent response shape
// Success
{
  "success": true,
  "data": { "id": 1, "name": "Alice" },
  "meta": { "requestId": "abc123" }
}

// Success (list with pagination)
{
  "success": true,
  "data": [{ "id": 1 }, { "id": 2 }],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "age", "message": "Must be a number" }
    ]
  }
}

// Helper functions for consistent responses
const sendSuccess = (res, data, statusCode = 200, meta = {}) =>
  res.status(statusCode).json({ success: true, data, ...meta });

const sendError = (res, message, code, statusCode, details = null) =>
  res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details && { details }) }
  });
\`\`\`

---

## 9. Exercise

Create \`json-api.js\` — a small Express server demonstrating JSON mastery:

1. **\`POST /parse\`**: Accepts any JSON body. Returns:
   - The number of top-level keys
   - The types of each value
   - Any dates found (values that look like ISO strings), converted to human-readable format
   - Any nested objects found (list their paths)

2. **\`GET /users/:id/export\`**: Returns a fake user in three formats based on \`Accept\` header:
   - \`application/json\` → standard JSON
   - \`text/csv\` → comma-separated
   - \`text/plain\` → human-readable paragraph

3. **\`POST /users\`**: Validates inbound user JSON. Requirements:
   - \`name\`: non-empty string
   - \`email\`: valid email format (simple check: contains @)
   - \`age\`: number between 0 and 150
   - \`birthDate\`: valid ISO date string
   Returns 400 with detailed field errors for any failures, 201 with the created user (excluding any \`password\` field) on success.

Test all variations with curl or Postman.
`,
};
