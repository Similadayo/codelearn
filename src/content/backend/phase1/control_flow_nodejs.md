# Control Flow — Conditions & Loops (JavaScript / Node.js)

Control flow is how a program decides what to do next and how it repeats work. In backend JavaScript, mastering conditions and loops is essential for input validation, routing decisions, data transformation, batching, pagination, and efficiently processing large datasets without blocking the event loop. This lesson builds a solid foundation you’ll reuse across services, APIs, and microservices.

## 1. Conditions: Truthiness, if/else, ternaries, and switch

Code illustrates decision-making patterns: strict equality vs truthiness, short-circuiting, and choosing branches with switch.

```javascript
// 1. Classic if/else chain
function categorizeStatus(status) {
  if (status === 'success') {
    return 'OK';
  } else if (status === 'warning') {
    return 'CAUTION';
  } else if (status === 'error') {
    return 'FAILED';
  } else {
    return 'UNKNOWN';
  }
}

// 2. Ternary operator for simple binary outcomes
function activeLabel(user) {
  // user might be null/undefined; optional chaining helps avoid exceptions
  return user?.active ? 'Active' : 'Inactive';
}

// 3. Switch statement for multi-way branching
function getRoleLabel(role) {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'user':
      return 'Regular User';
    default:
      return 'Guest';
  }
}
```

### Line-by-line explanation breaking down each line

- Line 1: Defines a function categorizeStatus that takes a status value.
- Line 2: Starts an if/else chain to handle the 'success' case.
- Line 3: Returns 'OK' if status is 'success'.
- Line 4: Else-if for 'warning'.
- Line 5: Returns 'CAUTION' if status is 'warning'.
- Line 6: Else-if for 'error'.
- Line 7: Returns 'FAILED' if status is 'error'.
- Line 8: Default branch when none of the above matched.
- Line 9: Returns 'UNKNOWN'.
- Line 11: Defines a function activeLabel that uses a ternary expression.
- Line 12: Uses optional chaining to access user.active and returns 'Active' if true, otherwise 'Inactive'.
- Line 15: Defines a function getRoleLabel to map roles to labels.
- Line 16-23: Uses a switch statement to return human-friendly labels for 'admin' and 'user'; default falls back to 'Guest'.

---

## 2. Short-circuiting, guard clauses, and null checks

Patterns that keep code readable and safe by exiting early or leveraging logical operators.

```javascript
function applyDiscount(customer) {
  // guard clause: fail fast if input is missing
  if (!customer) return 0;

  const tier = customer.tier;

  // short-circuit evaluation: pick the first truthy value
  const discount =
    (tier === 'gold' && 0.2) ||
    (tier === 'silver' && 0.1) ||
    0;

  return discount;
}
```

### Line-by-line explanation breaking down each line

- Line 1: Defines applyDiscount, taking a customer object.
- Line 3: Guard clause: if customer is falsy, return 0 immediately.
- Line 5: Extracts the tier property from the customer.
- Line 8-10: Uses short-circuit logic:
  - If tier is 'gold', evaluates to 0.2 (and short-circuits).
  - Else if tier is 'silver', evaluates to 0.1.
  - If neither, falls back to 0.
- Line 12: Returns the computed discount.

---

## 3. Loops: for, while, do-while, and for-of

Different looping constructs for iterating arrays, sets, or generators, each with tradeoffs.

```javascript
// A) Classic indexed for loop
function logNumbers(arr) {
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
  }
}

// B) While loop
function logUntilLimit(limit) {
  let i = 0;
  while (i < limit) {
    console.log(i);
    i++;
  }
}

// C) Do-while loop (executes at least once)
function logAtLeastOnce(start) {
  let i = start;
  do {
    console.log(i);
    i++;
  } while (i < start + 3);
}

// D) For-of loop (appropriate for iterable collections)
function logValues(values) {
  for (const v of values) {
    console.log(v);
  }
}
```

### Line-by-line explanation breaking down each line

- A) For loop
- Line 1: Defines logNumbers with an array input.
- Lines 2-4: Standard indexed for loop; iterates while i is within bounds.
- Line 3: Logs the current element at index i.
- B) While loop
- Line 6: Defines logUntilLimit with a numeric limit.
- Line 7: Initializes counter i.
- Lines 8-11: Continuously logs i and increments until limit.
- C) Do-while loop
- Line 14: Defines logAtLeastOnce with a start value.
- Line 15: Initializes i to start.
- Lines 16-20: Executes body at least once, then checks condition to continue.
- D) For-of loop
- Line 23: Defines logValues to iterate over any iterable.
- Line 24: Uses for-of to access each value directly.
- Line 25: Logs each value.

---

## 4. Loop control: break, continue, and labeled loops

Controlling flow inside loops for early exits, skipping iterations, or breaking out of nested loops.

```javascript
// A) Break: exit as soon as a condition is met
function indexOfTarget(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}

// B) Continue: skip certain iterations
function logNonNegatives(nums) {
  for (const n of nums) {
    if (n < 0) continue; // skip negatives
    console.log(n);
  }
}

// C) Labeled break: exit outer loop from inner loop (rare, use with caution)
function searchTwoDimensional(grid, target) {
  outer: for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === target) {
        break outer; // exit both loops
      }
    }
  }
}
```

### Line-by-line explanation breaking down each line

- A) Break
- Line 1: Defines indexOfTarget with an array and a target value.
- Lines 2-6: Iterates through the array by index.
- Line 4: If a matching element is found, returns its index.
- Line 7: If no match is found, returns -1.
- B) Continue
- Line 10: Defines logNonNegatives with a numeric array.
- Line 11: Iterates using for-of over nums.
- Line 12: Skips negative values with continue.
- Line 13: Logs non-negative values.
- C) Labeled break
- Line 16: Defines searchTwoDimensional for a 2D grid array.
- Line 17: Starts a labeled outer loop.
- Line 18: Starts inner loop over columns.
- Line 19: If a target is found, break out of the labeled outer loop.
- End: Function completes; grid search halts early when found.

---

## 5. Guard clauses and early returns in larger flows

Patterns for keeping functions readable by validating inputs and exiting early before deep nesting.

```javascript
function getUserProfile(req) {
  // Guard clauses to fail fast on bad input
  if (!req?.params?.id) {
    throw new Error('Missing user id');
  }

  const id = req.params.id;
  // Imagine a DB call here
  const profile = database.findUserById(id);

  if (!profile) {
    throw new Error('User not found');
  }

  return profile;
}
```

### Line-by-line explanation breaking down each line

- Line 1: Defines getUserProfile, taking a request-like object.
- Lines 3-6: Guard clause checks for the presence of req.params.id; throws if missing.
- Line 8: Extracts id from params.
- Line 9: Simulates a data fetch from a database.
- Lines 11-14: Guard clause to handle a missing profile; throws if not found.
- Line 16: Returns the retrieved profile when all checks pass.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Truthy checks that fail for legitimate falsey values (e.g., 0, '', false)
  - Bad:
    ```javascript
    function applyDiscount(d) {
      if (d) return d;
      return 0;
    }
    ```
  - Good:
    ```javascript
    function applyDiscount(d) {
      return d ?? 0; // uses nullish coalescing to allow 0, '', false, etc.
    }
    ```
- Pitfall 2: Off-by-one errors in loops
  - Bad:
    ```javascript
    for (let i = 0; i <= arr.length; i++) {
      console.log(arr[i]);
    }
    ```
  - Good:
    ```javascript
    for (let i = 0; i < arr.length; i++) {
      console.log(arr[i]);
    }
    ```
- Pitfall 3: Mutating a collection while iterating
  - Bad:
    ```javascript
    const arr = [1, 2, 3, 4];
    arr.forEach((x, idx) => {
      if (x % 2 === 0) arr.splice(idx, 1);
    });
    ```
  - Good:
    ```javascript
    const arr = [1, 2, 3, 4];
    const filtered = arr.filter(x => x % 2 !== 0);
    // or iterate with a separate index if you must modify in place
    ```
- Pitfall 4: Not handling async work inside loops
  - Bad:
    ```javascript
    async function runAll(tasks) {
      for (const t of tasks) {
        t.run(); // not awaited
      }
    }
    ```
  - Good:
    ```javascript
    async function runAll(tasks) {
      for (const t of tasks) {
        await t.run();
      }
    }
    ```
- Pitfall 5: Over-nesting conditionals instead of guards
  - Bad:
    ```javascript
    function process(item) {
      if (item) {
        if (item.valid) {
          // do work
        }
      }
    }
    ```
  - Good:
    ```javascript
    function process(item) {
      if (!item) return;
      if (!item.valid) return;
      // do work
    }
    ```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Correctness and user safety: Guard clauses prevent processing invalid inputs (reducing bugs and security risk).
- Performance: Heavy loops on the main Node.js thread can block the event loop. Prefer guard patterns and break large work into chunks, or offload CPU-heavy tasks to worker threads or streams.
- Readability and maintainability: Clear if/else chains, switches, and loops with small, focused functions are easier to test and refactor.
- Error handling: Consistent use of try/catch around async operations, and meaningful error messages, reduces debugging time in production.
- Real-world patterns: Guard clauses at function entry points; early returns in nested logic; using for-of/for loops for predictable iteration order; avoiding mutation while iterating; using streams for large data sets when appropriate.

---

## Z. Study Questions — 5 recall questions

1) What is the difference between truthy/falsy values and strict equality checks in conditions? Give an example where a truthy check could mislead you.

2) When would you choose a switch statement over if/else chains? Provide a scenario.

3) How do break and continue affect loop execution? Give a short example of each.

4) What is a guard clause and why is it beneficial in backend request handling?

5) Why might an all-synchronous for loop be problematic in a Node.js server, and what are common strategies to mitigate this?

---

## Exercise — practical multi-part coding challenge

You will implement small functions that practice conditions and loops on realistic data. Use plain JavaScript in a Node.js-friendly style.

- Provided sample data is included for clarity.

Part A: Gather active user names
- Description: Given an array of user objects, return the names of users where active is true.
- Input:
  const users = [
    { id: 1, name: 'Ada', active: true },
    { id: 2, name: 'Bea', active: false },
    { id: 3, name: 'Kai', active: true },
    { id: 4, name: 'Liu', active: false }
  ];
- Task: Implement activeUserNames(users) using a for loop.
- Expected output: ['Ada', 'Kai']

Code block:

```javascript
function activeUserNames(users) {
  // TODO: implement using a loop
}
```

### Line-by-line explanation breaking down each line

- Line 1: Defines activeUserNames with an array of users.
- Line 2: TODO: implement by iterating over the array and collecting names where active is true.
- Line 3: Placeholder return (to be replaced with actual logic).
- Line 4: End of function.

Part B: Bucket users by age category
- Description: Categorize users into age buckets: child (0-17), adult (18-64), senior (65+). Return a summary object.
- Input: Use the same users array plus an age property on each user, e.g., { id, name, age }.
- Task: Implement bucketUserAges(users) using a for-of loop and a switch-like structure (you can use if/else if you prefer).
- Expected output example: { child: 1, adult: 2, senior: 0 } based on the provided ages.

Code block:

```javascript
function bucketUserAges(users) {
  // TODO: implement using a loop and a switch/conditional
}
```

### Line-by-line explanation breaking down each line

- Line 1: Defines bucketUserAges with an array of users that includes age.
- Line 2: TODO: implement to accumulate counts into a result object.
- Line 3: Placeholder return.
- Line 4: End of function.

Part C: Compute a simple order total with guarded flow
- Description: Given an array of orders, sum the total price of all non-cancelled orders. If an order is missing price, skip it but log a warning (simulated with a comment).
- Input:
  const orders = [
    { id: 1, price: 19.99, status: 'completed' },
    { id: 2, price: 5.0, status: 'cancelled' },
    { id: 3, price: 12.5, status: 'completed' },
    { id: 4, /* missing price */ status: 'completed' }
  ];
- Task: Implement sumActiveOrderTotal(orders) using a for loop with continue on cancelled and skip on missing price.
- Expected output: 32.49 (19.99 + 12.50)

Code block:

```javascript
function sumActiveOrderTotal(orders) {
  // TODO: implement summing prices for non-cancelled orders
}
```

### Line-by-line explanation breaking down each line

- Line 1: Defines sumActiveOrderTotal with an orders array.
- Line 2: TODO: implement a loop that sums prices for orders with status !== 'cancelled'.
- Line 3: Placeholder return.
- Line 4: End of function.

Guidance for completing the exercise
- Start with Part A to build comfort with simple iteration and conditionals.
- Move to Part B to practice counting with thresholds and conditional branching.
- Finish with Part C to apply guard clauses (checking for missing fields) and skip logic.
- Run the code with the provided sample data to verify the outputs match the expected values.
- Consider adding basic unit tests (e.g., with a tiny test harness or console.assert) to validate each part.

If you’d like, I can provide a complete, runnable solution with a small test harness and printouts to demonstrate the expected outputs.