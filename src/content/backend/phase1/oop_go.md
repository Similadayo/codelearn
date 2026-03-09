# Object-Oriented Programming in Go (Phase 1 — Language Foundations)

Object-Oriented Programming (OOP) in Go centers on how to model real-world concepts with types, methods, interfaces, and composition. Go does not have traditional classes or classical inheritance; instead it emphasizes lightweight structs, method sets, interfaces, and embedding to achieve encapsulation, polymorphism, and code reuse. This approach is particularly powerful in backend systems for building modular services, clean APIs, and testable components that can be composed and extended without fragile hierarchies.

## 1. Types and Methods

Go achieves behavior attachment through methods on types. A method can have a value receiver or a pointer receiver, affecting how it can mutate state and what methods are available on a type’s method set.

```go
package main

import "fmt"

type User struct {
    id   int
    Name string
}

// Value receiver: does not mutate the original User
func (u User) ID() int { return u.id }

// Value receiver: returns a greeting using the current state
func (u User) Greet() string { return fmt.Sprintf("Hello, %s!", u.Name) }

func main() {
    u := User{id: 1, Name: "Ada"}
    fmt.Println(u.Greet()) // Hello, Ada!
    fmt.Println("ID:", u.ID()) // ID: 1
}
```

### Line-by-line explanation
1. package main — declares the executable package.
2. import "fmt" — imports the formatting package for string output.
3. type User struct { id int; Name string } — defines a simple struct with an unexported id and an exported Name.
4. func (u User) ID() int { return u.id } — method with a value receiver returning the internal id.
5. func (u User) Greet() string { return fmt.Sprintf("Hello, %s!", u.Name) } — method returning a formatted greeting.
6. func main() { … } — entry point for the program demonstrating usage.
7. u := User{id: 1, Name: "Ada"} — creates a User instance.
8. fmt.Println(u.Greet()) — prints the greeting.
9. fmt.Println("ID:", u.ID()) — prints the internal id via method.

## 2. Pointer vs Value Receivers and Method Sets

Pointer receivers enable state mutation inside methods, while value receivers operate on a copy and do not mutate the original. Go’s method set rules mean certain methods are only available on pointer vs value types.

```go
package main

import "fmt"

type Counter struct {
    v int
}

// Mutates the receiver: must be invoked on a pointer to Counter
func (c *Counter) Inc() { c.v++ }

// Value receiver: does not mutate the original, operates on a copy
func (c Counter) Double() { c.v *= 2 }

// Mutates the receiver: must be invoked on a pointer to Counter
func (c *Counter) Reset() { c.v = 0 }

// Value accessor to view current value
func (c Counter) Value() int { return c.v }

func main() {
    cnt := Counter{}
    fmt.Println("Initial:", cnt.Value()) // 0

    cnt.Inc()
    fmt.Println("After Inc:", cnt.Value()) // 1

    cnt.Double() // no effect on original because receiver is value type
    fmt.Println("After Double (no change):", cnt.Value()) // 1

    cnt.Reset()
    fmt.Println("After Reset:", cnt.Value()) // 0
}
```

### Line-by-line explanation
1. package main — executable package.
2. import "fmt" — for output.
3. type Counter struct { v int } — simple counter.
4. func (c *Counter) Inc() { c.v++ } — pointer receiver mutates the counter.
5. func (c Counter) Double() { c.v *= 2 } — value receiver mutates only a copy.
6. func (c *Counter) Reset() { c.v = 0 } — pointer receiver resets state.
7. func (c Counter) Value() int { return c.v } — returns current value.
8. func main() { … } — program entry point.
9. cnt := Counter{} — create a zero-valued Counter.
10. fmt.Println("Initial:", cnt.Value()) — shows 0.
11. cnt.Inc() — increments via pointer receiver (Go auto-takes address for addressable values).
12. fmt.Println("After Inc:", cnt.Value()) — shows 1.
13. cnt.Double() — has no effect on cnt because Double uses a value receiver.
14. fmt.Println("After Double (no change):", cnt.Value()) — still 1.
15. cnt.Reset() — resets to 0 via pointer receiver.
16. fmt.Println("After Reset:", cnt.Value()) — shows 0.

## 3. Encapsulation, Constructors, and Factory Functions

Go encourages encapsulation by using unexported fields and providing constructors (factory functions) to enforce invariants and initialization logic.

```go
package main

import "fmt"

type BankAccount struct {
    balance float64
}

// Factory function to initialize with validation
func NewBankAccount(initial float64) *BankAccount {
    if initial < 0 {
        initial = 0
    }
    return &BankAccount{balance: initial}
}

func (a *BankAccount) Deposit(amount float64) {
    if amount > 0 {
        a.balance += amount
    }
}

func (a *BankAccount) Withdraw(amount float64) error {
    if amount <= 0 {
        return fmt.Errorf("invalid amount")
    }
    if amount > a.balance {
        return fmt.Errorf("insufficient funds")
    }
    a.balance -= amount
    return nil
}

func (a BankAccount) Balance() float64 {
    return a.balance
}

func main() {
    acc := NewBankAccount(100)
    acc.Deposit(50)
    if err := acc.Withdraw(30); err != nil {
        fmt.Println("Withdraw error:", err)
    }
    fmt.Println("Balance:", acc.Balance()) // Balance: 120
}
```

### Line-by-line explanation
1. package main — executable program.
2. import "fmt" — for error, formatting and output.
3. type BankAccount struct { balance float64 } — encapsulated field (unexported).
4. func NewBankAccount(initial float64) *BankAccount — constructor with validation.
5. if initial < 0 { initial = 0 } — enforce non-negative balance.
6. return &BankAccount{balance: initial} — initialize and return pointer.
7. func (a *BankAccount) Deposit(amount float64) { … } — mutates balance safely.
8. func (a *BankAccount) Withdraw(amount float64) error { … } — validates and mutates with error return.
9. func (a BankAccount) Balance() float64 { return a.balance } — read-only accessor.
10. func main() { … } — demonstrates usage.
11. acc := NewBankAccount(100) — initial balance via constructor.
12. acc.Deposit(50) — add funds.
13. if err := acc.Withdraw(30); err != nil { … } — attempt withdrawal with error handling.
14. fmt.Println("Balance:", acc.Balance()) — prints final balance.

## 4. Interfaces and Polymorphism

Interfaces enable polymorphism in Go. Any type that implements the interface’s methods is a valid instance of that interface, enabling flexible, testable code.

```go
package main

import "fmt"

type Shape interface {
    Area() float64
    Name() string
}

type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 { return 3.14159 * c.Radius * c.Radius }
func (c Circle) Name() string   { return "Circle" }

type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 { return r.Width * r.Height }
func (r Rectangle) Name() string  { return "Rectangle" }

func PrintArea(s Shape) {
    fmt.Printf("%s area = %.2f\n", s.Name(), s.Area())
}

func main() {
    shapes := []Shape{ Circle{Radius: 2.5}, Rectangle{Width: 3, Height: 4} }
    for _, s := range shapes {
        PrintArea(s)
    }
}
```

### Line-by-line explanation
1. package main — executable package.
2. import "fmt" — for printing.
3. type Shape interface { Area() float64; Name() string } — interface with two methods.
4. type Circle struct { Radius float64 } — Circle type.
5. func (c Circle) Area() float64 { return 3.14159 * c.Radius * c.Radius } — Circle implements Area.
6. func (c Circle) Name() string { return "Circle" } — Circle implements Name.
7. type Rectangle struct { Width, Height float64 } — Rectangle type.
8. func (r Rectangle) Area() float64 { return r.Width * r.Height } — Rectangle Area.
9. func (r Rectangle) Name() string { return "Rectangle" } — Rectangle Name.
10. func PrintArea(s Shape) { fmt.Printf("%s area = %.2f\n", s.Name(), s.Area()) } — generic function operating on Shape.
11. func main() { … } — demonstration.
12. shapes := []Shape{ Circle{Radius: 2.5}, Rectangle{Width: 3, Height: 4} } — create a polymorphic slice.
13. for _, s := range shapes { PrintArea(s) } — iterate and print.

## 5. Embedding and Composition (Simulating Inheritance)

Go uses embedding to reuse behavior and promote methods from one type to another. You can override embedded methods by declaring a method with the same name on the outer type.

```go
package main

import "fmt"

type Engine struct {
    Horsepower int
}

func (e Engine) Start() string {
    return fmt.Sprintf("%d HP engine started", e.Horsepower)
}

type Vehicle struct {
    Make string
}

func (v Vehicle) Start() string {
    return "Starting " + v.Make
}

type Car struct {
    Vehicle
    Engine
    Doors int
}

func (c Car) Start() string {
    // Override: Car-specific startup using embedded fields
    return c.Vehicle.Start() + " with " + fmt.Sprintf("%d", c.Horsepower) + " HP"
}

func main() {
    c := Car{
        Vehicle:   Vehicle{Make: "Toyota"},
        Engine:    Engine{Horsepower: 180},
        Doors:     4,
    }
    fmt.Println(c.Start())         // Car-specific startup sequence
    fmt.Println(c.Vehicle.Start()) // Access promoted method on embedded Vehicle
    fmt.Println("Horsepower (promoted):", c.Horsepower) // Access promoted field
}
```

### Line-by-line explanation
1. package main — executable package.
2. import "fmt" — for formatted output.
3. type Engine struct { Horsepower int } — engine component.
4. func (e Engine) Start() string { return fmt.Sprintf("%d HP engine started", e.Horsepower) } — Engine behavior.
5. type Vehicle struct { Make string } — base vehicle.
6. func (v Vehicle) Start() string { return "Starting " + v.Make } — Vehicle start behavior.
7. type Car struct { Vehicle; Engine; Doors int } — Car embeds Vehicle and Engine to compose behavior.
8. func (c Car) Start() string { … } — method on Car that overrides the embedded Vehicle.Start() behavior.
9. func main() { … } — demonstration.
10. c := Car{ … } — instantiate with embedded fields.
11. fmt.Println(c.Start()) — shows overridden startup sequence.
12. fmt.Println(c.Vehicle.Start()) — explicitly calls the embedded Vehicle Start method.
13. fmt.Println("Horsepower (promoted):", c.Horsepower) — demonstrates promoted field access from Engine.

## X. Common Beginner Mistakes

- Pitfall 1: Mutating state with value receivers vs pointer receivers
  Bad:
  ```go
  type Counter struct{ v int }
  func (c Counter) Increment() { c.v++ } // value receiver mutates a copy
  ```
  Good:
  ```go
  type Counter struct{ v int }
  func (c *Counter) Increment() { c.v++ } // pointer receiver mutates the original
  ```

- Pitfall 2: Overusing interfaces or returning nil interfaces
  Bad:
  ```go
  var w io.Writer
  // w is nil; calling methods panics at runtime
  w.Write([]byte("hi"))
  ```
  Good:
  ```go
  var w io.Writer = new(bytes.Buffer)
  w.Write([]byte("hi"))
  ```
  Or prefer using concrete types when you don’t need polymorphism, and guard nils before use.

- Pitfall 3: Confusing embedding with inheritance
  Bad:
  ```go
  type Base struct{ Wait bool }
  type Derived struct { Base }

  func (d Derived) Start() string { return "Derived start" }
  // Expecting Base methods to be overridden automatically
  ```
  Good:
  ```go
  type Base struct{ Active bool }
  func (b Base) Start() string { return "Base start" }

  type Derived struct {
      Base
  }

  func (d Derived) Start() string { return "Derived start" }

  // Access embedded methods explicitly when needed:
  d := Derived{}
  d.Base.Start()
  ```
  Explanation: embedding promotes methods, but you can override; be explicit about which method you want to call.

## Y. Why This Matters In Real Systems

- Modularity and testability: Go’s OOP features encourage small, composable components with clear boundaries. Interfaces allow easy mocking in tests and enable dependency injection patterns.
- API design with interfaces: When you expose behavior via interfaces, you can swap implementations without changing call sites, enabling strategies, adapters, or mock backends in production.
- Composition over inheritance: Go’s pattern of embedding and composition reduces fragile hierarchies, aids in maintaining large codebases, and improves readability.
- Concurrency considerations: Go’s value vs pointer semantics directly affect how you share objects across goroutines. Prefer explicit synchronization (mutexes) or thread-safe patterns when mutating shared state.

## Z. Study Questions

1. What is the difference between a value receiver and a pointer receiver in Go? How does it affect mutability?
2. How do interfaces enable polymorphism in Go? Give a concrete example with a Shape interface.
3. How does embedding differ from classical inheritance, and how can you override an embedded method?
4. Why are constructors/factory functions common in Go, and how can they enforce invariants?
5. In a backend service, how would you apply OOP principles to design a modular payroll or billing subsystem using interfaces and composition?

## Exercise

Part A — Build a small OOP system with encapsulation and composition
- Create a package-local object model for an organization with employees and managers.
- Use unexported fields for internal state and provide constructors NewEmployee and NewManager.
- Employee should have fields: id, name (exported), salary (unexported). Provide methods: Name() string, Salary() float64, Promote(delta float64) to adjust salary.
- Manager should embed Employee and add a field teamSize. Provide a method TeamSummary() string.

Part B — Interfaces and polymorphism
- Define an interface Worker with methods Work() string and GetSalary() float64.
- Let Employee and Manager implement Worker. The Work method should reflect their role (e.g., "Employee working", "Manager coordinating").
- Write a function PayAll(workers []Worker) float64 that sums salaries.

Part C — Practical usage and testing
- Create a small main program that:
  - Instantiates two Employees and one Manager.
  - Calls Work on each via a Worker slice.
  - Adjusts salaries via Promote, then runs PayAll.
  - Prints a simple payroll summary for verification.

Starter structure (you will implement the details):
- A single main.go containing:
  - type Employee struct { id int; name string; salary float64 }
  - func NewEmployee(id int, name string, salary float64) *Employee
  - func (e *Employee) Name() string
  - func (e *Employee) Salary() float64
  - func (e *Employee) Promote(delta float64)
  - type Manager struct { Employee; teamSize int }
  - func NewManager(id int, name string, salary float64, teamSize int) *Manager
  - func (m *Manager) Work() string
  - func (m *Manager) GetSalary() float64
  - func (e *Employee) Work() string
  - func (e *Employee) GetSalary() float64
  - func PayAll(workers []Worker) float64
  - func main() { ... big showcase ... }

Notes
- The exercise intentionally blends Go’s composition and interface-based polymorphism to demonstrate practical OOP patterns in a backend language that favors composition over classical inheritance.
- You should be able to run the final program with go run main.go and see the printed workflow and payroll results.