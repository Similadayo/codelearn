# Track: Backend Engineering — Phase 4: Building Web Servers — Testing Basics: Unit & Integration Tests (JavaScript / Node.js)

Testing basics are the backbone of reliable backend systems. In Node.js, unit tests validate small, isolated pieces of logic, while integration tests verify that multiple components (HTTP routes, services, and data access) work correctly together. Mastery of these tests accelerates safe changes, improves maintainability, and reduces production incidents. This lesson walks you through the core ideas, hands-on examples, and practical patterns you can apply in real systems.

## 1. Unit Tests vs Integration Tests
- Unit tests exercise the smallest testable parts of an application (pure functions, small modules) in isolation from the outside world (databases, network, FS, timers).
- Integration tests verify end-to-end behavior across multiple components (HTTP endpoints, services collaborating with repositories, and external services) to ensure they interact correctly.
- Benefits: fast feedback loop, clear failure signals, easier refactoring, and safer deployments.
- Common approach: write many focused unit tests, then a smaller set of fast integration tests for critical interactions.

## 2. Tooling and Project Setup
Below is a minimal setup using Jest for unit tests and Supertest for HTTP integration tests in a Node.js project.

```json
{
  "name": "backend-testing-basics",
  "version": "1.0.0",
  "description": "Unit & Integration test examples for Node.js backend",
  "scripts": {
    "test": "jest --runInBand",
    "test:cov": "jest --coverage"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
```

### Line-by-line explanation
- Line 1-2: Basic package information and description.
- "scripts": Defines npm run test to execute Jest in a single process (stable for many environments) and test:cov to collect test coverage.
- "dependencies": Express is included because the examples use a small Express app.
- "devDependencies": Jest is the test runner; Supertest helps simulate HTTP requests to an Express app in tests.

```
# Optional: simple Jest configuration (if you want to customize)
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['text', 'lcov']
};
```

### Line-by-line explanation
- testEnvironment: 'node' ensures tests run in a Node.js-like environment.
- testMatch: patterns Jest uses to locate test files.
- collectCoverage: true enables coverage reports.
- collectCoverageFrom: which source files to instrument for coverage.
- coverageReporters: what formats to output (text for console, lcov for HTML/CI).
```

## 3. Writing Unit Tests
In unit tests you typically test pure functions or modules with deterministic behavior, using mocks or fakes for any external interactions.

### 3. Code: Pure utility function (src/utils/math.js)
```js
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Arguments must be numbers');
  }
  return a + b;
}

module.exports = { add };
```

### Line-by-line explanation
- Line 1: Defines the function add that takes two parameters a and b.
- Line 2-4: Input validation ensuring both arguments are numbers; throws a TypeError if not.
- Line 5: Returns the sum of a and b.
- Line 7: Exports the add function so tests and other modules can import it.

### 3. Code: Unit tests for the function (tests/__tests__/math.test.js)
```js
const { add } = require('../../src/utils/math.js');

describe('add', () => {
  test('adds two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('throws on non-number inputs', () => {
    expect(() => add('2', 3)).toThrow(TypeError);
  });
});
```

### Line-by-line explanation
- Line 1: Imports the add function from the module being tested.
- Line 3: Declares a test suite named 'add'.
- Line 4-6: Test that adding two positive numbers yields 5.
- Line 8-10: Test that passing a non-number input results in a TypeError being thrown.
- Overall: These tests exercise both a successful path and an error path for a small pure function.

## 4. Writing Integration Tests
Integration tests validate how components work together, such as HTTP routes calling into services and repositories.

### 4. Code: Minimal Express app using a repository (src/app.js)
```js
const express = require('express');

function createApp(repo) {
  const app = express();
  app.use(express.json());

  // Simple route that uses the repo
  app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const user = await repo.getUserById(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return app;
}

module.exports = { createApp };
```

### Line-by-line explanation
- Line 1: Imports Express.
- Line 3-10: Defines a factory createApp(repo) that builds an Express app and wires a route.
- Line 5: Creates an Express app instance.
- Line 6: Enables JSON body parsing for request bodies.
- Lines 8-16: Defines a GET /users/:id route that uses repo.getUserById to fetch a user. Handles not-found (404) and internal errors (500).
- Line 18: Exports the createApp function for tests and usage.

### 4. Code: Integration tests for the HTTP route (tests/integration/app.test.js)
```js
const request = require('supertest');
const { createApp } = require('../../src/app.js');

describe('GET /users/:id integration', () => {
  // Simple fake repository for testing
  const fakeRepo = {
    getUserById: async (id) => {
      if (id === '1') return { id: '1', name: 'Alice' };
      return null;
    }
  };

  const app = createApp(fakeRepo);

  test('returns user when found', async () => {
    const res = await request(app).get('/users/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: '1', name: 'Alice' });
  });

  test('returns 404 when not found', async () => {
    const res = await request(app).get('/users/999');
    expect(res.statusCode).toBe(404);
  });
});
```

### Line-by-line explanation
- Line 1: Imports Supertest to simulate HTTP requests.
- Line 2: Imports the app factory.
- Lines 5-11: Creates a fake in-memory repo with a deterministic behavior for testing.
- Line 13: Builds the Express app instance using the fake repo.
- Line 15-22: Test that a found user returns 200 and the user payload.
- Line 25-29: Test that a non-existent user returns 404.

## 5. Running Tests, Coverage, and Test Quality
- Run tests: npm test
- Run coverage: npm run test:cov
- Inspect results: Jest outputs per-file coverage, plus overall coverage summary.

### Line-by-line explanation
- The npm scripts map to Jest commands:
  - test runs tests in a single process for stability across environments.
  - test:cov enables a coverage report to help you measure how much of your code is executed by tests.
- The jest.config.js (if included) configures environment, test discovery, and coverage collection as described in section 2.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code
- Pitfall 1: Tests depend on external systems (DBs, HTTP services) in unit tests.
  - Bad:
    ```
    // unit test that hits a real database
    const userRepo = require('../db/userRepo');
    test('fetch user', async () => {
      const user = await userRepo.getUserById('1');
      expect(user.id).toBe('1');
    });
    ```
  - Good:
    ```
    // unit test with a mocked repo
    const { getUserById } = require('../../src/services/userService');
    test('fetch user with mocked repo', async () => {
      const mockRepo = { getUserById: jest.fn().mockResolvedValue({ id: '1' }) };
      const user = await getUserById('1', mockRepo);
      expect(user.id).toBe('1');
      expect(mockRepo.getUserById).toHaveBeenCalledWith('1');
    });
    ```
- Pitfall 2: Treating integration tests as unit tests (not isolating dependencies, long-running tests).
  - Bad: A single test hitting a real network and DB on every run.
  - Good: Separate unit tests (pure logic) from a focused integration suite that mocks or seeds only necessary components.
- Pitfall 3: Inadequate handling of async code and errors.
  - Bad:
    ```
    test('async fails quietly', () => {
      someAsyncThing().then(() => expect(true).toBe(false));
    });
    ```
  - Good:
    ```
    test('async fails with rejection', async () => {
      await expect(someAsyncThing()).rejects.toThrow();
    });
    ```
- Pitfall 4: No test data isolation or cleanup.
  - Bad: Tests mutate shared state without reset.
  - Good: Use beforeEach/afterEach to reset mocks, in-memory stores, or database fixtures.
- Pitfall 5: Missing test coverage for error paths and boundary conditions.
  - Good: Include tests for invalid inputs, 404s, 500s, and edge values (empty strings, nulls, very large numbers).

## Y. Why This Matters In Real Systems
- Safe deployments: Regression tests catch what regressions introduced code changes might cause.
- Faster feedback: Developers get quick signals about breaking changes, reducing debugging time in production.
- Better refactoring: Well-structured tests provide a safety net when you restructure modules, swap implementations, or introduce new features.
- CI/CD reliability: Automated test suites are a backbone of modern CI pipelines; flaky tests erode trust, so invest in deterministic tests and clean test data.
- Real-world considerations: Tests should reflect real usage patterns (HTTP routes, error handling, data validation) and avoid brittle dependencies on external services by using mocks or in-memory equivalents.

## Z. Study Questions — 5 recall questions
1. What is the primary difference between unit tests and integration tests?
2. Why is it important to mock external dependencies in unit tests?
3. How would you structure a simple Express route to be easily testable in integration tests?
4. What Jest feature helps you verify that a function throws an error under certain conditions?
5. What are common signs of flaky tests, and how can you mitigate them?

## Exercise — a practical multi-part coding challenge
Goal: Build a small, testable microservice with unit and integration tests, following the patterns in this lesson.

Part 1 — Implement and unit-test a pure utility
- Create src/utils/nameFormatter.js with a function formatUserName(name) that:
  - Trims whitespace
  - Capitalizes the first letter and lowercases the rest
  - Throws TypeError if name is not a string
- Write unit tests in tests/__tests__/nameFormatter.test.js to cover:
  - Normal cases (e.g., "alice" -> "Alice")
  - Mixed case inputs (e.g., "bOB" -> "Bob")
  - Whitespace trimming (e.g., "  carol  " -> "Carol")
  - Empty/whitespace-only strings (-> "")

Part 2 — Build an Express route that uses the utility
- Create a minimal Express app module at src/app.js with a POST /format endpoint that accepts { name } in the JSON body and returns { formatted: string } using formatUserName.
- Validate that name exists and is a string; otherwise return 400.

Part 3 — Write integration tests for the HTTP route
- Write tests in tests/integration/format.test.js using supertest to:
  - Confirm POST /format with a valid name returns 200 and a correctly formatted name
  - Confirm 400 for missing or invalid input

Part 4 — Run and verify
- Ensure npm test runs both unit and integration tests, and npm run test:cov shows coverage for the src/ directory.
- Ensure test data isolation by using a clean in-memory approach and not touching any real databases.

Starter code snippets for Part 1 and Part 2 are provided in this lesson to guide your implementation. Implement the parts, run your tests, and iterate until all tests pass with satisfactory coverage.