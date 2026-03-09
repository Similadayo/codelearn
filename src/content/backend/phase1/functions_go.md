# Backend Engineering: Phase 1 — Language Foundations
Topic: Functions, Scope & Closures in Go (Golang)

Functions, scope, and closures are foundational to writing maintainable and scalable Go code. Functions are first-class citizens: you can pass them around, return them from other functions, and bind state inside closures. Understanding how scope rules work and how closures capture variables helps you build flexible APIs, clean middleware, and predictable concurrency primitives without surprises in production systems.

## 1. Functions: Basics and Signatures

In Go, functions are declared with the func keyword, support multiple return values, and can be assigned to variables or passed as arguments. This section covers fundamentals: basic function definitions, function values, and error handling with multiple return values.

```go
package main

import (
	"errors"
	"fmt"
)

func add(a, b int) int {
	return a + b
}

func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

func main() {
	// Basic function call
	fmt.Println("add(2,3) =", add(2, 3)) // 5

	// Function value stored in a variable
	var op func(int, int) int = add
	fmt.Println("op(5,7) =", op(5, 7)) // 12

	// Multiple return values and error handling
	q, err := divide(10, 3)
	if err != nil {
		fmt.Println("divide error:", err)
	} else {
		fmt.Println("divide result =", q) // 3
	}
}
```

### Line-by-line explanation
- package main: declares the package as the executable program.
- import block: brings in necessary packages (errors for error construction, fmt for printing).
- func add(a, b int) int: simple function that returns the sum of two integers.
- func divide(a, b int) (int, error): function that returns a quotient and an error if division by zero occurs.
- func main(): entry point of the program.
- fmt.Println("add(2,3) =", add(2, 3)): demonstrates a direct function call.
- var op func(int, int) int = add: assigns the function value to a variable of function type.
- fmt.Println("op(5,7) =", op(5, 7)): uses the function variable like any function.
- q, err := divide(10, 3): calls divide and handles the potential error.
- if err != nil { ... } else { ... }: basic error handling pattern for functions returning (T, error).

---

## 2. Scope and Shadowing

Go has lexical scoping: variables declared in an outer scope are visible in inner scopes, unless shadowed. Shadowing occurs when an inner scope declares a variable with the same name, hiding the outer one. This section demonstrates global vs local scope, and the subtlety of shadowing.

```go
package main

import "fmt"

var global = "package-level global"

func shadowExample() {
	// Shadowing: this creates a new local variable named 'global'
	global := "local shadow"
	fmt.Println("inside shadowExample:", global) // local shadow
}

func main() {
	fmt.Println("before calling shadowExample:", global) // package-level global
	shadowExample()
	fmt.Println("after calling shadowExample:", global) // still package-level global
}
```

### Line-by-line explanation
- var global = "package-level global": declares a package-scoped variable.
- func shadowExample(): defines a function to demonstrate shadowing.
- global := "local shadow": creates a new local variable named global, shadowing the outer variable.
- fmt.Println inside: prints the shadowed local value.
- func main(): entry point for the program.
- fmt.Println before: prints the outer package-level value.
- shadowExample(): executes the function showing shadowing behavior.
- fmt.Println after: confirms the outer variable is unaffected by the inner shadow.

---

## 3. Closures and Lifetime

A closure is a function value that references variables from its surrounding scope. The captured variables live as long as the closure does, enabling shared state across calls. This section shows a simple counter factory and a common pitfall with loop variables, plus how to fix it.

```go
package main

import "fmt"

// makeCounter returns a function that increments and returns an internal count.
func makeCounter() func() int {
	i := 0
	return func() int {
		i++
		return i
	}
}

func main() {
	counter := makeCounter()
	fmt.Println(counter()) // 1
	fmt.Println(counter()) // 2
	fmt.Println(counter()) // 3
}
```

### Line-by-line explanation
- func makeCounter() func() int: declares a function that returns another function (a closure) with no parameters but returns int.
- i := 0: initializes internal state captured by the closure.
- return func() int { i++; return i }: the inner function increments and returns the captured i.
- main(): obtains a counter closure and calls it multiple times, showing stateful closure behavior.

```go
package main

import "fmt"

func main() {
	// Bad: loop variable captured by closures all refer to the same i
	var funcs []func()
	for i := 0; i < 3; i++ {
		funcs = append(funcs, func() { fmt.Println(i) })
	}
	for _, f := range funcs {
		f() // prints 3 3 3
	}
	// Good: capture a local copy for each iteration
	var good []func()
	for i := 0; i < 3; i++ {
		ii := i // create a new variable for this iteration
		good = append(good, func() { fmt.Println(ii) })
	}
	for _, f := range good {
		f() // prints 0 1 2
	}
}
```

### Line-by-line explanation
- Bad example:
  - for i := 0; i < 3; i++ { funcs = append(funcs, func() { fmt.Println(i) }) }: creates closures that all refer to the same i.
  - f() prints the final value of i (3) for all closures.
- Good example:
  - ii := i: creates a new variable for each iteration, captured by the closure.
  - f() prints the captured values 0, 1, and 2 respectively.

---

## X. Common Beginner Mistakes

Go closures and scope trips are common for new Go developers. Here are real pitfalls with bad vs good code.

- Pitfall 1: Closure capturing loop variable (the classic)
```go
// Bad
package main

import "fmt"

func main() {
	var fns []func() int
	for i := 0; i < 3; i++ {
		fns = append(fns, func() int { return i })
	}
	for _, f := range fns {
		fmt.Println(f()) // 3 3 3
	}
}

// Good
package main

import "fmt"

func main() {
	var fns []func() int
	for i := 0; i < 3; i++ {
		ii := i
		fns = append(fns, func() int { return ii })
	}
	for _, f := range fns {
		fmt.Println(f()) // 0 1 2
	}
}
```

- Pitfall 2: Shadowing and losing outer variable value
```go
// Bad
package main

import "fmt"

var n = 0

func shadow() {
	n := 5 // shadows package-level n
	fmt.Println("inside shadow:", n) // 5
}

func main() {
	shadow()
	fmt.Println("global after:", n) // 0
}

// Good
package main

import "fmt"

var n = 0

func shadow() {
	// do not shadow; modify the outer variable or pass it as a parameter
	n = 5
	fmt.Println("inside shadow:", n) // 5
}

func main() {
	shadow()
	fmt.Println("global after:", n) // 5
}
```

- Pitfall 3: Ignoring errors from functions returning (T, error)
```go
// Bad
package main

import (
	"fmt"
)

func mayFail(a int) (int, error) {
	if a < 0 {
		return 0, fmt.Errorf("negative: %d", a)
	}
	return a * 2, nil
}

func main() {
	res, _ := mayFail(-1)
	fmt.Println("result (ignoring error):", res) // 0
}

// Good
package main

import (
	"fmt"
)

func mayFail(a int) (int, error) {
	if a < 0 {
		return 0, fmt.Errorf("negative: %d", a)
	}
	return a * 2, nil
}

func main() {
	if v, err := mayFail(2); err != nil {
		fmt.Println("error:", err)
	} else {
		fmt.Println("result:", v) // 4
	}
}
```

- Pitfall 4: Mutating shared state without synchronization in concurrent contexts (beyond scope of scope/closures, but common in closures)
```go
// Bad (race condition potential)
package main

import (
	"fmt"
	"time"
)

func main() {
	var counter int
	for i := 0; i < 5; i++ {
		go func() {
			counter++ // race risk
		}()
	}
	time.Sleep(time.Second)
	fmt.Println("counter:", counter)
}
```
- Good (with proper synchronization using channels or mutex)
```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	var mu sync.Mutex
	counter := 0
	var wg sync.WaitGroup

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			counter++
			mu.Unlock()
		}()
	}
	wg.Wait()
	fmt.Println("counter:", counter) // 5
}
```

---

## Y. Why This Matters In Real Systems

- Readability and maintainability: closures let you capture dependencies (e.g., config, logger, DB client) without duplicating parameters in every function signature.
- HTTP handlers and middleware: closures are commonly used to build middleware that wraps handlers with extra context (authentication, logging, tracing).
- Functional options and configuration builders: closures enable clean APIs for optional configuration without a proliferation of types.
- Memory and lifetime: closures carry references to captured variables; unused captures can cause memory bloat if not managed (e.g., closing over large structs in long-lived closures).
- Testing and debuggability: closures should have clear capture semantics; unpredictable captures across loops can lead to flakey tests if not handled carefully.

---

## Z. Study Questions

1) What is a closure in Go, and how does it differ from a plain function?  
2) How does Go capture variables in closures (by reference or by value), and what are common pitfalls?  
3) What happens when a loop variable is captured by a closure inside a loop? How can you fix it?  
4) How can you use closures to implement simple factories (e.g., a counter or an adder)?  
5) Why is shadowing dangerous, and how can you avoid unintended shadowing in larger modules?

---

## Exercise

Part 1: Closure-based counter
- Implement a function makeCounter() that returns a closure. Each invocation of the closure should return the next integer starting from 1.
- Demonstrate usage by calling the returned function 4 times.

Part 2: Adder factory
- Implement makeAdder(delta int) func(int) int that returns a function which, given x, returns x + delta.
- Create two adders (e.g., add5 and add10) and show their behavior with sample inputs.

Part 3: Scope and closure in a mini registry
- Create a small function registry: a map[string]func(string) string.
- Register at least two handlers (e.g., "greet" and "shout") using closures that capture a prefix or suffix.
- Demonstrate invoking the handlers with inputs and printing results.

Part 4: Memoization utility (optional extension)
- Implement memoizeIntToInt(f func(int) int) func(int) int that caches results for integer inputs.
- Use it on a slow function (simulate delay with time.Sleep) and show the memoized version improving repeated calls.

Code skeletons and examples for the exercises should compile as standalone programs. You can combine each part into separate small programs or a single program with clearly delineated sections and a main function that demonstrates each piece.