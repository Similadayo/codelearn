# Track: Backend Engineering — Module: Phase 1 — Language Foundations — Topic: Control Flow — Conditions & Loops (Go)

Control flow is the heartbeat of any program: it decides which paths to take, when to retry, and how to handle errors gracefully. In backend systems, clear and efficient conditionals and loops translate directly into request latency, resource usage, and reliability. This lesson teaches Go’s core constructs for conditions and loops, with concrete patterns you’ll reuse when implementing APIs, daemons, workers, and data processing pipelines.

## 1. If Statements and Short Statements

Go uses if for conditional branching, with optional short statement initialization that limits the scope of the new variable to the if/else block. This pattern is common for early-return error handling and simple guards.

```go
package main

import "fmt"

func double(n int) int { return n * 2 }

func main() {
    x := 7

    // Basic if/else chain
    if x > 10 {
        fmt.Println("x is greater than 10")
    } else if x == 10 {
        fmt.Println("x is exactly 10")
    } else {
        fmt.Println("x is less than 10")
    }

    // Short statement in if: the variable is scoped to the if/else block
    if y := double(x); y > 10 {
        fmt.Printf("After doubling, y=%d which is > 10\n", y)
    } else {
        fmt.Printf("After doubling, y=%d which is <= 10\n", y)
    }
}
```

### Line-by-line explanation
- Line 1: Declares the package as main, making this a standalone executable.
- Line 3: Defines a helper function double that returns n multiplied by 2.
- Line 5: Defines the entry point main.
- Line 6: Initializes x with 7.
- Line 9-15: Demonstrates a standard if/else-if/else chain to compare x against thresholds.
- Line 18: Executes a short variable declaration inside the if: y is initialized to double(x) and its scope is limited to the if/else block.
- Line 18 (cont’d): Checks if y > 10 and executes the corresponding block.
- Line 19-20: Prints the outcome for the true branch.
- Line 21-23: Prints the outcome for the false branch.
- Line 25: End of main.
- Line 26: End of file.

### Key takeaways
- Use plain if for simple guards and branching logic.
- Use the short statement form (if v := ...; condition) to limit the scope of new variables to the condition and its branches.
- This pattern is ideal for early returns on errors (e.g., if err != nil { return }).

## 2. Switch Statements and Flow

Switch statements in Go provide a clean alternative to long if-else chains. They support value-based cases, condition-based cases (switch with no expression), and the fallthrough keyword to explicitly continue to the next case.

```go
package main

import "fmt"

func main() {
    // Value-based switch
    code := 404
    switch code {
    case 200:
        fmt.Println("OK")
    case 404:
        fmt.Println("Not Found")
    case 500:
        fmt.Println("Server Error")
    default:
        fmt.Println("Unknown code")
    }

    // Switch with condition (switch true) is idiomatic for range checks
    status := 150
    switch {
    case status >= 200 && status < 300:
        fmt.Println("Status looks successful")
    case status >= 400 && status < 500:
        fmt.Println("Client error style")
    default:
        fmt.Println("Other status")
    }

    // Demonstrating fallthrough (explicit)
    v := 1
    switch v {
    case 1:
        fmt.Println("case 1")
        fallthrough
    case 2:
        fmt.Println("case 2 (executed via fallthrough)")
    default:
        fmt.Println("default case")
    }
}
```

### Line-by-line explanation
- Line 1: Package declaration.
- Line 3: Import fmt for printing.
- Line 6: Start of main.
- Line 9-16: Value-based switch on code with explicit cases for 200, 404, 500 and a default.
- Line 19-23: Switch without a value executes the first case whose boolean expression is true.
- Line 25-31: Demonstrates fallthrough to continue execution into the next case when explicitly requested.
- Line 32: End of main.

### Key takeaways
- For exact matches, use a value-based switch: switch code { case ... }.
- For complex predicates, use a switch with no expression (switch { case ... }), which reads like a chain of if/else if statements.
- fallthrough is explicit in Go and should be used sparingly for clarity.

## 3. For Loops: Basics, Break/Continue, and Ranging

Go’s primary looping construct is for. It also supports break and continue for flow control, and the for can range over collections for concise iteration.

```go
package main

import "fmt"

func main() {
    // Basic counting loop
    fmt.Println("Basic for loop:")
    for i := 0; i < 5; i++ {
        fmt.Println(i)
    }

    // for with break
    fmt.Println("For with break:")
    for i := 0; i < 10; i++ {
        if i == 7 {
            break
        }
        fmt.Println(i)
    }

    // Range over a slice
    nums := []int{3, 1, 4, 1, 5}
    fmt.Println("Range over slice:")
    for idx, v := range nums {
        fmt.Printf("idx=%d val=%d\n", idx, v)
    }
}
```

### Line-by-line explanation
- Line 1: Package declaration.
- Line 3: Import fmt for output.
- Line 6: Start of main.
- Line 9-13: Basic for loop with a classic initialization, condition, and post-iteration expression.
- Line 14-17: Loop with a break when i == 7 to exit early.
- Line 18-23: Declares a slice nums and iterates using range to obtain index and value.
- Line 24-25: End of main.

### Key takeaways
- for i := 0; i < n; i++ is the standard C-style loop in Go.
- Use break to exit early from a loop; use continue to skip to the next iteration.
- Use for range when iterating slices, arrays, maps, or strings; you get index and value (except when you use for _, v := range ... to skip the index).

## 4. Range Loops, Maps, and Labeled Breaks

Beyond basic ranges, Go lets you home in on nested loops using labeled break/continue, and it’s common to iterate maps with range (noting that map iteration order is randomized).

```go
package main

import "fmt"

func main() {
    // Labeled break example in a 2D grid
    grid := [][]int{
        {1, 2, 3},
        {4, 0, 6},
        {7, 8, 9},
    }

    found := false
    outer:
    for i := 0; i < len(grid); i++ {
        for j := 0; j < len(grid[i]); j++ {
            if grid[i][j] == 0 {
                found = true
                break outer // break to the labeled outer loop
            }
        }
    }
    if found {
        fmt.Println("Found zero in grid")
    } else {
        fmt.Println("No zero found in grid")
    }

    // Range over a map (order is not guaranteed)
    m := map[string]int{"alice": 23, "bob": 30}
    fmt.Println("Iterating over map (order arbitrary):")
    for k, v := range m {
        fmt.Printf("%s => %d\n", k, v)
    }
}
```

### Line-by-line explanation
- Line 1: Package declaration.
- Line 4: Import fmt.
- Line 7: Start of main.
- Line 10-18: Creates a 2D grid and uses a labeled break (outer) to exit both loops when a zero is found.
- Line 19-25: Prints whether a zero was found.
- Line 28-33: Creates a map and iterates with range; note that map order is nondeterministic.
- Line 34: End of main.

### Key takeaways
- Labeled breaks allow you to exit multiple nested loops in Go.
- Range over maps is convenient but does not guarantee iteration order; don’t rely on order for correctness.
- Range over slices provides both index and value; you can ignore one with the blank identifier.

## 5. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

- Pitfall 1: Not checking errors
  - Bad:
  ```go
  // Bad: ignoring error from Open
  f, _ := os.Open("config.yaml")
  defer f.Close()
  ```
  - Good:
  ```go
  // Good: check error before using the file handle
  f, err := os.Open("config.yaml")
  if err != nil {
      log.Fatalf("failed to open config: %v", err)
  }
  defer f.Close()
  ```

- Pitfall 2: Shadowing variables with short declarations in conditionals
  - Bad:
  ```go
  var err error
  if err := doSomething(); err != nil {
      // this err is the inner one; outer err is unchanged
      // ...
  }
  // outer err is still nil here, which can hide problems
  ```
  - Good:
  ```go
  if err := doSomething(); err != nil {
      // handle error with inner err
  }
  // outer err remains unaffected or is handled explicitly
  ```

- Pitfall 3: Modifying a slice while iterating with range without index
  - Bad (trying to update in place but using value only):
  ```go
  nums := []int{1, 2, 3}
  for _, v := range nums {
      v *= 2 // v is a copy; nums is unchanged
  }
  fmt.Println(nums) // still [1, 2, 3]
  ```
  - Good:
  ```go
  nums := []int{1, 2, 3}
  for i := range nums {
      nums[i] *= 2
  }
  fmt.Println(nums) // [2, 4, 6]
  ```

- Pitfall 4: Overusing a plain for { } infinite loop without a clear exit
  - Bad:
  ```go
  for {
      // forgetful of exit condition
  }
  ```
  - Good:
  ```go
  for i := 0; i < maxTries; i++ {
      // loop body
  }
  ```

- Pitfall 5: Not using default case in switch when handling inputs
  - Bad:
  ```go
  switch code {
  case 200:
      // ok
  case 404:
      // not found
  }
  // missing default means unexpected codes fall through silently
  ```
  - Good:
  ```go
  switch code {
  case 200:
      // ok
  case 404:
      // not found
  default:
      // handle unknown codes
  }
  ```

## 6. Why This Matters In Real Systems

Control flow directly shapes reliability and performance in production Go services.

- Correctness and readability: Clear if/else and switch logic reduces bugs in request routing, feature flags, and feature toggles.
- Error handling discipline: Early returns via if err != nil pattern are essential for robust I/O, DB, and network operations.
- Performance implications: Unnecessary branches and repeated work inside loops add latency; prefer simple, predictable loop patterns. Range loops are efficient for processing large datasets without extra allocations.
- Maintainability under scale: Consistent use of switch with default, proper labeled breaks for complex nested loops, and avoiding shadowing keep codebases easier to reason about as teams grow.
- Real-world patterns: Short-variable initializers inside if help keep error-checks close to their source, improving traceability when diagnosing failures in production logs.

## 7. Study Questions

1) How do you write a short statement in an if condition in Go, and what is its scope?  
2) When would you prefer a switch using a condition (switch { ... }) over a value-based switch? Provide a pattern example.  
3) What is the behavior of range when iterating over a map, and how should you handle the potential nondeterministic order?  
4) What is the difference between modifying a slice inside a range loop with v (value) versus using indices i? Provide a small code contrast.  
5) How can you exit from nested loops in Go, and why might this be preferable to restructuring the logic with flags?

## Exercise

Build a small Go program that exercises the control flow concepts covered. Complete the tasks below in a single file (main.go) or modularly in testable functions.

Part A: If/Short Statement
- Given a numeric slice, print elements greater than 10 using an if statement. Use a short declaration to compute a threshold in the if condition if you like.

Part B: Status Classification with Switch
- Implement a function classifyStatus(code int) string that uses a switch to return:
  - "OK" for 200
  - "Not Found" for 404
  - "Server Error" for 500
  - "Unknown" for anything else
- Call it from main with a few sample codes and print the results.

Part C: Process Requests with Range
- Define a Request struct: type Request struct { ID int; Path string; Method string; Authorized bool }
- Create a slice of requests with a mix of authorized and unauthorized entries and multiple HTTP methods (GET, POST, DELETE).
- Use a range loop to:
  - Count the number of authorized requests by method in a map[string]int
  - Print a summary table of method -> count for authorized requests

Part D: Labeled Break in a 2D Grid
- Create a 2D grid (slice of slices) filled with integers, including at least one 0.
- Use a nested loop with a label to locate the first 0 and break to the outer loop once found.
- Print the coordinates (row, col) where the first 0 was found, or a message if none exists.

Starter code (you can modify or replace as you see fit):

```go
package main

import (
	"fmt"
	"log"
	"os"
)

type Request struct {
	ID         int
	Path       string
	Method     string
	Authorized bool
}

func classifyStatus(code int) string {
	// TODO: implement with switch
	return "Unknown"
}

func main() {
	// Part A: If/Short Statement
	nums := []int{5, 12, 7, 22, 3}
	fmt.Println("Numbers > 10:")
	for _, n := range nums {
		if n > 10 {
			fmt.Println(n)
		}
	}

	// Part B: Status Classification
	for _, c := range []int{200, 404, 500, 301} {
		fmt.Printf("Code %d => %s\n", c, classifyStatus(c))
	}

	// Part C: Process Requests
	reqs := []Request{
		{ID: 1, Path: "/login", Method: "POST", Authorized: true},
		{ID: 2, Path: "/data", Method: "GET", Authorized: true},
		{ID: 3, Path: "/admin", Method: "DELETE", Authorized: false},
		{ID: 4, Path: "/data", Method: "GET", Authorized: true},
		{ID: 5, Path: "/login", Method: "POST", Authorized: false},
	}
	counts := make(map[string]int)
	for _, r := range reqs {
		if !r.Authorized {
			continue
		}
		counts[r.Method]++
	}
	fmt.Println("Authorized request counts by method:")
	for m, c := range counts {
		fmt.Printf("%s: %d\n", m, c)
	}

	// Part D: Labeled break
	grid := [][]int{
		{1, 2, 3},
		{4, 0, 6}, // contains a zero
		{7, 8, 9},
	}
	found := false
	var row, col int
outer:
	for i := 0; i < len(grid); i++ {
		for j := 0; j < len(grid[i]); j++ {
			if grid[i][j] == 0 {
				found = true
				row, col = i, j
				break outer
			}
		}
	}
	if found {
		fmt.Printf("First zero found at (%d, %d)\n", row, col)
	} else {
		fmt.Println("No zero found in grid")
	}
}
```

Notes for the exercise:
- You may implement classifyStatus directly in the same file or in a separate file for clarity.
- Run the program with go run to see outputs from each section.
- Ensure you handle edge cases in Part C (e.g., empty reqs, all unauthorized).

This lesson provides a compact, practical foundation for understanding control flow in robust Go backend systems. If you’d like, I can tailor the exercise to a specific backend scenario (HTTP handlers, worker pools, or data ingestion) and provide automated tests to validate the behaviors.