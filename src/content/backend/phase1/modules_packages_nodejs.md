# Track: Backend Engineering — Module: Phase 1 — Language Foundations

Compelling introspective paragraph: In backend engineering, clean module boundaries, reliable dependency management, and predictable builds are non-negotiable. Understanding how to structure code with modules, package your logic, and manage dependencies is foundational for scalable services, reproducible deployments, and secure software. This lesson walks through Node.js module systems (ESM and CommonJS), how packages are authored and consumed, how to organize code with workspaces/monorepos, and best practices for reliable, secure dependency management in production systems.

## 1. Understanding Node.js Modules: ES Modules vs CommonJS

This section introduces the core ideas of Node.js modules, how to export and import functionality, and how to choose between ES Modules (import/export) and CommonJS (require/module.exports). You’ll see simple examples of a small math-tools library and a consumer that uses it.

Code: ES Modules library (libs/math-tools/index.js)
```js
// libs/math-tools/index.js
export function add(a, b) {
  return a + b;
}

export function mul(a, b) {
  return a * b;
}

// Optional default export for convenience
export default { add, mul };
```

Code: ES Modules consumer (app/index.js)
```js
// app/index.js
import { add, mul } from '../../libs/math-tools/index.js';

console.log('2 + 3 =', add(2, 3));
console.log('4 * 5 =', mul(4, 5));
```

Line-by-line explanation for ES Modules code:
- libs/math-tools/index.js
  - Line 1: Declares this module as an ES module file and defines its exports.
  - Line 2-4: Exports a named function add that returns the sum of a and b.
  - Line 6-8: Exports a named function mul that returns the product of a and b.
  - Line 11-13: Exports a default object containing the functions for convenient default import.
- app/index.js
  - Line 1: Imports named exports add and mul from the relative path to the library.
  - Line 3: Logs the result of add(2, 3) to the console.
  - Line 4: Logs the result of mul(4, 5) to the console.

Code: CommonJS library (libs/cjs-math-tools/index.js)
```js
// libs/cjs-math-tools/index.js
function add(a, b) {
  return a + b;
}
function mul(a, b) {
  return a * b;
}

module.exports = { add, mul };
```

Code: CommonJS consumer (app-cjs/index.js)
```js
// app-cjs/index.js
const { add, mul } = require('../../libs/cjs-math-tools/index.js');

console.log('2 + 3 (CJS) =', add(2, 3));
console.log('4 * 5 (CJS) =', mul(4, 5));
```

Line-by-line explanation for CommonJS code:
- libs/cjs-math-tools/index.js
  - Line 2-5: Defines two functions, add and mul, that perform arithmetic.
  - Line 7: Exports the functions via module.exports so they can be required by other files.
- app-cjs/index.js
  - Line 2: Requires the CommonJS module by path and destructures add and mul.
  - Line 4: Logs the sum computed by add.
  - Line 5: Logs the product computed by mul.

X-Note: In real projects, you might choose ES Modules (import/export) for future-facing code or CommonJS for legacy compatibility. Both interoperate in Node.js with careful configuration, but keeping a single module system per project is typically cleaner.

## 2. Packages, Dependency Management, and Semantic Versioning

In this section you’ll learn how to package a module, declare dependencies, and manage versioning. You’ll see package.json examples for a library and a consumer app, and how to install a local package via a file reference or an exports map.

Code: Library package.json (libs/math-tools/package.json)
```json
{
  "name": "@acme/math-tools",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.js",
  "exports": "./index.js",
  "license": "MIT"
}
```

Code: Library index (libs/math-tools/index.js) (ESM)
```js
export function add(a, b) {
  return a + b;
}

export function mul(a, b) {
  return a * b;
}
```

Code: Consumer app package.json (app/package.json)
```json
{
  "name": "math-tools-consumer",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@acme/math-tools": "file:../libs/math-tools"
  }
}
```

Code: Consumer index.js (app/index.js)
```js
// app/index.js
import { add, mul } from '@acme/math-tools';

console.log('2 + 3 =', add(2, 3));
console.log('4 * 5 =', mul(4, 5));
```

Line-by-line explanation for package.json and usage:
- libs/math-tools/package.json
  - Line 1-3: Metadata: package name, version, and module system flag for ES modules.
  - Line 4: main field points to the entry module for runtime resolution.
  - Line 5: exports field defines the entry point consumers should use when importing the package.
  - Line 6: License information.
- libs/math-tools/index.js
  - Line 1-6: Exports named functions add and mul for consumers to import.
- app/package.json
  - Line 1-4: Metadata for the consumer project, including the module type.
  - Line 5-8: Declares a local file dependency to the library using file: path.
- app/index.js
  - Line 3-4: Uses named imports from the local dependency to perform calculations and log them.

Code: Install and use local package (commands)
```
# From the root of a multi-folder setup
cd app
npm install
node index.js
```

Line-by-line explanation for installation commands:
- Command 1: Change directory to the consumer app.
- Command 2: Install dependencies, resolving the local file: path to libs/math-tools.
- Command 3: Run the consumer script to verify the library usage works.
- These commands illustrate local dependency management without publishing to a registry.

Code: Semantic versioning and ranges example (package.json snippet)
```json
{
  "dependencies": {
    "@acme/math-tools": "^1.0.0"
  }
}
```

Line-by-line explanation:
- Line 1-2: Declares a dependency on the math-tools package with a caret range, allowing minor/patch updates (but not major).
- This demonstrates how semantic versioning lets you balance stability with updates.

Code: Publishing config for a public package (libs/math-tools/package.json addition)
```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

Line-by-line explanation:
- Line 2-4: Instructs the npm publish process to publish with public access (needed for scoped packages like @acme/* on the public registry).

## 3. Local Development with Workspaces and Monorepos

Monorepos let you co-manage multiple packages in a single repository. This section shows the root workspace config and per-package manifests, along with a basic usage example.

Code: Root package.json with workspaces
```json
{
  "private": true,
  "name": "backend-monorepo",
  "workspaces": [
    "packages/*"
  ]
}
```

Code: packages/math-tools/package.json
```json
{
  "name": "@acme/math-tools",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "exports": "./index.js"
}
```

Code: packages/math-tools/index.js
```js
export function add(a, b) {
  return a + b;
}
export function mul(a, b) {
  return a * b;
}
```

Code: packages/app/package.json
```json
{
  "name": "consumer-app",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@acme/math-tools": "*"
  }
}
```

Code: packages/app/index.js
```js
import { add } from '@acme/math-tools';

console.log('Workspace add(3, 7) =', add(3, 7));
```

Line-by-line explanations:
- Root package.json
  - Line 1-3: Basic metadata; "private" ensures the repo isn’t published as a single package.
  - Line 4-7: Defines a workspace configuration that includes all subpackages under packages/*.
- packages/math-tools/package.json
  - Line 1-4: Package identity and module system settings for ESM.
  - Line 5-6: Main and exports declarations to guide consumers.
- packages/math-tools/index.js
  - Line 1-5: Exposes add and mul functions for use by consumers in the workspace.
- packages/app/package.json
  - Line 1-6: App identity and dependency on the math-tools package within the workspace.
- packages/app/index.js
  - Line 1: Imports the add function via the workspace package alias.
  - Line 3: Logs the result of add to demonstrate dependency resolution within a monorepo.

How to use:
- npm install at the monorepo root will install all workspace dependencies and link packages together.
- Running app/index.js demonstrates inter-package imports and the benefits of a shared codebase.

## 4. Publishing and Private Registries

In real systems, you’ll publish libraries to registries, or use private registries in enterprises. This section covers authentication, publishing configurations, and a typical workflow.

Code: .npmrc (example for private registry)
```
registry=https://registry.npmjs.org/
always-auth=true
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Line-by-line explanation:
- Line 1: Sets the default registry for npm.
- Line 2: Forces authentication for all requests.
- Line 3: Uses an auth token from the environment variable NPM_TOKEN for secure access.

Code: Library package.json with publish configuration
```json
{
  "name": "@acme/secure-tools",
  "version": "0.1.0",
  "type": "module",
  "main": "./index.js",
  "exports": "./index.js",
  "publishConfig": {
    "access": "restricted"
  }
}
```

Line-by-line explanation:
- Line 1-4: Metadata for a scoped package.
- Line 5-6: Entry points for ESM consumers.
- Line 7-9: Publish configuration indicating restricted access, useful for private registries.

Code: Publishing workflow (commands)
```
# Log in to npm (or your private registry)
npm login

# Publish the package (for private registries, ensure access level)
npm publish --access restricted

# Alternatively, package as tarball to test installation locally
npm pack
```

Line-by-line explanation:
- Command 1: Ensure proper authentication before publishing.
- Command 2: Publishes the package with restricted access (private registry).
- Command 3: Creates a tarball for local testing or offline installation.

## 5. Dependency Hygiene, Auditing, and Reproducible Builds

Production systems rely on reproducible builds and security checks. This section covers lockfiles, npm ci for clean installs, and auditing dependencies.

Code: package-lock.json example (snippet)
```json
{
  "name": "example-app",
  "lockfileVersion": 2,
  "dependencies": {
    "lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

Line-by-line explanation:
- Line 2: Indicates the lockfile version used by npm.
- Line 3-9: Shows a resolved dependency entry including version, URL, and integrity hash.

Code: Environment commands for reproducible installs and audit
```
# Install dependencies exactly as defined in the lockfile
npm ci

# Audit for known vulnerabilities
npm audit

# Attempt to automatically fix minor issues
npm audit fix
```

Line-by-line explanation:
- Command 1: npm ci installs exactly what is in package-lock.json, ensuring reproducibility in CI/CD.
- Command 2: Runs a security audit of dependencies.
- Command 3: Attempts to auto-fix non-breaking vulnerabilities; may upgrade minor versions within constraints.

## X. Common Beginner Mistakes

- 1) Mixing ES Modules and CommonJS without clear boundaries
Bad:
```js
// app-esm.js (ESM)
import express from 'express';
const bodyParser = require('body-parser');
```
Good:
```js
// app-esm.js (ESM)
import express from 'express';
import bodyParser from 'body-parser';
```

Explanation: In ESM files, use import/export consistently. CommonJS require is not available unless transpiled or dynamically imported.

- 2) Forgetting to set the module type or file extensions
Bad:
```json
// package.json
{
  "name": "demo",
  "type": "module"
}
```
File: app.js
```js
import { add } from './math-tools/index';
```
Good:
```json
// package.json
{
  "name": "demo",
  "type": "module"
}
```
File: app.js
```js
import { add } from './math-tools/index.js';
```

Explanation: When using ES modules, ensure extension resolution is explicit or set "type": "module" to enable bare .js imports.

- 3) Overlooking lockfiles and reproducibility
Bad:
- Relying on package.json alone without a lockfile in CI/CD.
Good:
- Commit package-lock.json (or pnpm-lock.yaml/yarn.lock) and use npm ci in CI.

Code: example lockfile practice
```json
{
  "name": "tiny-app",
  "lockfileVersion": 2,
  "dependencies": {
    "express": {
      "version": "4.18.2",
      "resolved": "...",
      "integrity": "..."
    }
  }
}
```

Explanation: Lockfiles pin exact versions to ensure identical installs across environments.

- 4) Publishing too many dependencies or leaking devDependencies
Bad:
```json
{
  "dependencies": {
    "eslint": "^8.40.0",
    "chalk": "^5.0.0"
  }
}
```
Good:
```json
{
  "dependencies": {
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "eslint": "^8.40.0"
  }
}
```

Explanation: Distinguish runtime dependencies from development tooling to minimize production surface and container size.

## Y. Why This Matters In Real Systems

- Consistency and reproducibility: Lockfiles and workspace setups ensure the same dependency graph every time, reducing "it works on my machine" issues.
- Security posture: Regular npm audit scans catch known vulnerabilities. Automated fixes help triage quickly but should be reviewed before production deployment.
- Deployability and speed: Monorepos with workspaces streamline changes across packages, enable consistent versioning, and improve collaboration across teams.
- Maintainability: Clear module boundaries, well-defined exports, and consistent package.json fields make onboarding and refactors safer.
- Operational discipline: Using private registries for internal tooling, code-quality tools, and libraries helps enforce security and governance while keeping external dependencies lean.

## Z. Study Questions

1) What is the difference between ES Modules and CommonJS in Node.js, and when would you choose one over the other?
2) How does the exports field in package.json influence how a consumer imports a package?
3) What is the purpose of npm ci, and how does it differ from npm install in CI/CD pipelines?
4) How do workspaces help manage a monorepo, and what changes are required in root package.json to enable them?
5) What are the benefits and risks of using private registries, and how do you configure authentication for publishing?

## Exercise

Multi-part practical coding challenge: Build and consume a small string-tools library with a monorepo workflow and a local publish/test cycle.

Part A – Create a string-tools library (ESM)
- Create a new folder libs/string-tools with a package.json (type: module) and an index.js exporting:
  - capitalize(s): capitalizes first character of a string.
  - slugify(s): lowercases the string, replaces non-alphanumeric with hyphens, trims hyphens.
Code: libs/string-tools/index.js
```js
export function capitalize(s) {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugify(s) {
  if (typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, '');    // trim leading/trailing hyphens
}
```

Code: libs/string-tools/package.json
```json
{
  "name": "@acme/string-tools",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.js",
  "exports": "./index.js"
}
```

Part B – Create a consumer app in the same repo (monorepo style)
- Root package.json enabling workspaces, with a consumer app under apps/consumer and a dependency on @acme/string-tools.
Code: Root package.json (for a workspace)
```json
{
  "private": true,
  "name": "string-tools-workspace",
  "workspaces": [
    "libs/*",
    "apps/*"
  ]
}
```

Code: apps/consumer/package.json
```json
{
  "name": "string-tools-consumer",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@acme/string-tools": "*"
  }
}
```

Code: apps/consumer/index.js
```js
import { capitalize, slugify } from '@acme/string-tools';

const input = "hello world!";
console.log(capitalize(input)); // "Hello world!"
console.log(slugify(input));     // "hello-world"
```

Part C – Install, test locally, and verify the local package
- Commands:
```
# From repo root
npm install
node apps/consumer/index.js
```
Expected output:
Hello world!
hello-world

Part D – Pack and install tarball (local publish/test)
- Create a tarball of the library and reinstall in a clean consumer
```
npm pack --workspaces=false --silent libs/string-tools
# This generates something like string-tools-1.0.0.tgz
cd apps/consumer
npm install ../../libs/string-tools/string-tools-1.0.0.tgz
node index.js
```

Part E – Quick audit and hygiene checks
- Run: npm ci to ensure reproducible install in CI
- Run: npm test (if you add tests)
- Run: npm audit to verify dependencies

Notes:
- This exercise reinforces: (a) how to author a small library, (b) how to consume a local package in a monorepo-like setup, (c) how to test a publish/publish-like workflow locally with npm pack, and (d) how dependency management and module resolution work together in real systems.

If you'd like, I can tailor these sections to a specific Node.js version or adjust the examples for CommonJS-heavy teams or a strictly ES Module environment.