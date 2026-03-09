# Track: Backend Engineering — Phase 1: Language Foundations — Variables, Data Types & Operators in Go

Compelling introductory paragraph:
Variables, data types, and operators are the building blocks of any Go program. They define how you store information, how much memory you allocate, how you represent real-world concepts (numbers, text, truth values), and how you perform computations and decisions. Mastery of these fundamentals directly impacts code safety, performance, and reliability in production systems—especially in backend services that orchestrate data flows, APIs, and storage. This module introduces variables, zero-values, type inference, type conversions, and the core operators you’ll rely on every day as a Go backend engineer.

## 1.  Declaring Variables, Zero Values, and Scope

Go provides several ways to declare variables: explicit var blocks, inline short declarations, and multi-variable declarations. Understanding zero values (the default value for a type) helps you write predictable code without initializing every variable.

```go
package main

import "fmt"

func main() {
    // Explicitly declare with type; zero value for int is 0
    var total int
    // Explicit type with initial value
    var name string = "GoLang"
    // Boolean defaults to false if not initialized
    var ok bool

    // Short variable declaration with type inference (inside function)
    count := 5
    // Multiple variables at once
    a, b, c := 1, 2, 3

    fmt.Printf("total=%d name=%q ok=%v count=%d a=%d b=%d c=%d\n",
        total, name, ok, count, a, b, c)
}
```

### Line-by-line explanation
- package main: Declares the package name; executable programs use package main.
- import "fmt": Imports the fmt package for formatted I/O.
- func main() { ... }: Entry point of the program.
- var total int: Declares an integer variable total with zero value (0).
- var name string = "GoLang": Declares a string variable with an initial value.
- var ok bool: Declares a boolean variable with the zero value (false).
- count := 5: Short variable declaration; type is inferred as int.
- a, b, c := 1, 2, 3: Multiple short declarations in one line.
- fmt.Printf(...): Outputs the values using formatting verbs.
- The program demonstrates explicit and inferred declarations and the use of zero values.

## 2.  Basic Data Types and Zero Values

Go has a compact set of built-in types. Each type has a well-defined zero value, which helps avoid nil pointer panics and uninitialized memory surprises.

```go
package main

import "fmt"

func main() {
    var i int      // zero value: 0
    var f float64  // zero value: 0
    var s string   // zero value: ""
    var b bool     // zero value: false
    fmt.Printf("i=%d f=%f s=%q b=%v\n", i, f, s, b)
}
```

### Line-by-line explanation
- var i int: Declares an integer with zero value 0.
- var f float64: Declares a 64-bit floating-point with zero value 0.0.
- var s string: Declares a string with zero value "".
- var b bool: Declares a boolean with zero value false.
- fmt.Printf(...): Prints the zero values with representative formatting verbs.
- This code shows how uninitialized variables have predictable defaults.

## 3.  Type Inference, Short Declarations, and Basic Type Conversions

Type inference lets the compiler deduce a variable’s type from its initializer. Explicit type conversions are required when crossing type boundaries.

```go
package main

import (
    "fmt"
)

func main() {
    // Type inference
    age := 30
    name := "Alex"
    // Explicit type conversion
    var i int64 = 42
    j := int64(age) // convert int to int64
    // String conversion via fmt or strconv
    s := fmt.Sprintf("%d years old", age)

    fmt.Println(age, name, i, j, s)
}
```

### Line-by-line explanation
- import "fmt": Brings in the fmt package for formatting.
- age := 30, name := "Alex": Short declarations; types inferred as int and string.
- var i int64 = 42: Declares i with explicit int64 type.
- j := int64(age): Converts age (int) to int64 and assigns to j.
- s := fmt.Sprintf("%d years old", age): Builds a string using formatting; demonstrates converting a value to a string representation.
- fmt.Println(...): Outputs the values.
- This snippet contrasts inference with explicit type conversions and string formatting.

## 4.  Operators: Arithmetic, Assignment, Comparison, Logical, and Bitwise

Go supports a complete set of operators. Understand how they interact with types and how ++/-- behave as statements only.

```go
package main

import "fmt"

func main() {
    a := 6
    b := 3

    // Arithmetic
    sum := a + b
    diff := a - b
    prod := a * b
    quo := a / b    // integer division
    rem := a % b

    // Assignment
    a += b // a becomes 9
    a -= 2 // a becomes 7
    a *= 2 // a becomes 14
    a /= 3 // a becomes 4
    a %= 3 // a becomes 1

    // Increment / Decrement as statements only
    a++
    // a-- // would make a == 2

    // Comparisons
    isEqual := (a == 1)
    isGreater := (a > 0)

    // Logical
    t := true
    f := false
    both := t && f
    either := t || f
    notT := !t

    // Bitwise
    x := 5  // 0101
    y := 9  // 1001
    and := x & y // 0001
    orr := x | y // 1101
    xor := x ^ y // 1100
    lshift := x << 1 // 1010

    fmt.Println(sum, diff, prod, quo, rem, a, isEqual, isGreater, both, either, notT, and, orr, xor, lshift)
}
```

### Line-by-line explanation
- a := 6, b := 3: Initialize operands for arithmetic.
- sum, diff, prod, quo, rem: Basic arithmetic results; quo is integer division.
- a += b, a -= 2, a *= 2, a /= 3, a %= 3: Demonstrates compound assignments and their effect on a.
- a++: Increment as a statement; cannot be used as part of an expression.
- Comparisons: isEqual and isGreater reflect boolean results from comparisons.
- Logical operators: and, either, notT show logical combination of booleans.
- Bitwise operators: and, orr, xor, lshift illustrate low-level bit manipulation.
- fmt.Println(...): Outputs results to verify behavior.

## 5.  Pointers and References (Diving into Go’s data-access semantics)

Pointers let you refer to and mutate values without copying them. They are essential for performance-sensitive code paths and for sharing state in functions.

```go
package main

import "fmt"

func main() {
    v := 123
    p := &v           // p holds the address of v
    *p = 456          // mutate the value at the address
    fmt.Println("v:", v, "address:", p)
}
```

### Line-by-line explanation
- v := 123: Creates an int variable with value 123.
- p := &v: Captures the memory address of v in a pointer to int.
- *p = 456: Dereferences the pointer and assigns a new value to that memory location.
- fmt.Println(...): Shows the updated value of v and the pointer’s address (memory location).
- This demonstrates the basic mechanics of pointers: address acquisition and dereferencing for mutation.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Shadowing a variable unintentionally
  - Bad:
    var count int = 5
    if true {
        count := 10 // shadows outer count
        fmt.Println(count) // 10
    }
    fmt.Println(count) // 5
  - Good:
    var count int = 5
    if true {
        count = 10 // reassigns the same variable
        fmt.Println(count) // 10
    }
    fmt.Println(count) // 10

- Pitfall 2: Mismatched types without explicit conversion
  - Bad:
    var i int = 5
    var f float64 = i // compile error: cannot use i (type int) as type float64
  - Good:
    var i int = 5
    var f float64 = float64(i)

- Pitfall 3: Using a nil map (uninitialized map)
  - Bad:
    var m map[string]int
    m["alpha"] = 1 // panic: assignment to entry in nil map
  - Good:
    m := make(map[string]int)
    m["alpha"] = 1

- Pitfall 4: Using ++/-- in expressions (not allowed in Go)
  - Bad:
    x := 1
    y := x++ // compile error
  - Good:
    x := 1
    x++
    y := x

- Pitfall 5: Assuming interface{} can be used like a concrete type without checks
  - Bad:
    var v interface{} = "hello"
    // directly use v as string without type assertion
    // leading to runtime panic if misused
  - Good:
    var v interface{} = "hello"
    if s, ok := v.(string); ok {
        fmt.Println("string value:", s)
    }

## Y. Why This Matters In Real Systems — production context and real usage

- Correct typing reduces runtime errors and makes APIs safer. Strong type discipline helps catch mistakes at compile time rather than at runtime in production.
- Zero values influence default behavior, defaults in configuration loading, and database interactions. Predictable defaults reduce edge-case bugs.
- Type conversions are explicit, reducing accidental data corruption when reading/writing across layers (e.g., JSON, DB values, network payloads).
- Operators and arithmetic semantics affect financial calculations, counters, rate limiting, and pagination math. Understanding integer division vs floating-point math avoids subtle bugs.
- Pointers enable efficient memory handling and controlled mutation across functions. However, misuse can lead to data races or subtle bugs; Go’s memory model and race detector help mitigate this in real systems.
- Proper use of maps, slices, and concurrency-safe patterns matters for backend services handling large-scale request traffic and shared state.

## Z. Study Questions — 5 recall questions

1. What is the default zero value of a string in Go?
2. How do you convert an int to a float64 explicitly?
3. Can you use the ++ operator as part of a larger expression in Go? Why or why not?
4. What happens if you try to write to a nil map without initializing it?
5. Given a pointer p to an int, how do you change the value it points to?

## Exercise — Practical multi-part coding challenge

Part A: Variable declarations and printing
- Write a small Go program that declares:
  - an int named userCount with a value of 7
  - a float64 named price with value 19.99
  - a string named title with value "Backend Go"
  - a bool named active with value true
- Print all values with a single fmt.Printf using appropriate verbs.

Part B: Type conversions and formatting
- Convert userCount to float64 and print both integer and converted float versions.
- Create a string representation of price using fmt.Sprintf and print it.

Part C: Arithmetic and logic
- Compute tax as price * 0.08 and total as price + tax.
- If total > 20, print a message; otherwise print a different message.

Part D: Pointers and a helper function
- Create an int variable items = 10; pass its address to a helper function double(n *int) that doubles the value in place.
- Print items before and after calling the helper function.

Part E: Simple data-structure interaction
- Create a map[string]int to count two items: "apples" and "oranges" with 3 and 5 respectively.
- Increment the count for apples and print the map.

Part F: Optional extension (for more practice)
- Write a small function summarize(a, b int) (sum int, product int, greater bool) that returns the sum, product, and whether a > b for two integers. Call it from main and print the results.

Starter code scaffold (you can fill in the parts above):

```go
package main

import (
    "fmt"
)

func double(n *int) {
    // implement: double the value pointed to by n
}

func summarize(a, b int) (sum int, product int, greater bool) {
    // implement: return sum, product, and whether a > b
    return
}

func main() {
    // Part A
    // declare and print variables

    // Part B
    // type conversions and formatting

    // Part C
    // arithmetic and logic

    // Part D
    // pointer usage

    // Part E
    // map usage

    // Part F (optional)
    // call summarize and print results
}
```

This multi-part exercise reinforces the core concepts of variables, types, and operators, while also introducing pointer manipulation and simple data structures in Go.