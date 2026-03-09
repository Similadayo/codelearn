# Track: Backend Engineering — Module: Phase 1 — Language Foundations — Topic: Object-Oriented Programming (Java)

Compelling introductory paragraph:
Object-Oriented Programming (OOP) is the foundational paradigm used to model real-world problems as software. In Java, OOP enables you to encapsulate data and behavior within classes, leverage inheritance to share and specialize functionality, and use interfaces and abstractions to write flexible, maintainable code. Mastery of OOP is essential for building scalable backend systems, where clear object boundaries, well-defined contracts, and testable components directly impact reliability, performance, and team velocity.

## 1. Class and Object Basics
A class is a blueprint for creating objects. An object is an instance of a class with state (fields) and behavior (methods). This section introduces basic syntax: fields, constructors, getters/setters, and a simple toString for debugging.

```java
public class Person {
    private String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public int getAge() { return age; }

    public void setAge(int age) { this.age = age; }

    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + '}';
    }
}
```

### Line-by-line explanation
- Line 1: public class Person { — declares a new class named Person as a public type.
- Line 2-3: private fields name and age — store the internal state; private enforces encapsulation.
- Line 5-8: constructor — initializes name and age when creating a Person.
- Line 10-11: getName() and setName(String) — accessors for name.
- Line 13-14: getAge() and setAge(int) — accessors for age.
- Line 16-19: toString() — provides a readable string representation useful for debugging.

## 2. Encapsulation, Access Modifiers, and Getters/Setters
Encapsulation hides internal state and exposes a controlled API. This example shows private fields, a read-only field, and safe mutators.

```java
public class BankAccount {
    private String accountId;
    private double balance;
    private final String currency;

    public BankAccount(String accountId, double balance, String currency) {
        this.accountId = accountId;
        this.balance = balance;
        this.currency = currency;
    }

    public String getAccountId() { return accountId; }
    public double getBalance() { return balance; }

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Deposit must be positive");
        balance += amount;
    }

    public boolean withdraw(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Withdrawal must be positive");
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }
}
```

### Line-by-line explanation
- Line 1: public class BankAccount { — defines a class to model a bank account.
- Line 2-4: private fields accountId, balance, currency — internal state; currency is final (immutable after construction).
- Line 6-11: constructor — sets initial values; currency remains constant.
- Line 13-14: getAccountId() and getBalance() — provide read-only access to immutable state.
- Line 16-21: deposit() — validates input and updates balance.
- Line 23-30: withdraw() — validates input, checks sufficiency, updates balance; returns success status.

## 3. Inheritance and Polymorphism
Inheritance allows a class to reuse behavior; polymorphism lets you treat different subclasses uniformly. This example shows an abstract base class and concrete subclasses with overridden behavior.

```java
public abstract class Animal {
    private String name;
    public Animal(String name) { this.name = name; }
    public String getName() { return name; }
    public abstract void speak();
}

public class Dog extends Animal {
    public Dog(String name) { super(name); }
    @Override
    public void speak() { System.out.println(getName() + " says: Woof!"); }
}

public class Cat extends Animal {
    public Cat(String name) { super(name); }
    @Override
    public void speak() { System.out.println(getName() + " says: Meow!"); }
}
```

### Line-by-line explanation
- Line 1: public abstract class Animal { — defines an abstract base class for animals.
- Line 2-4: private name; constructor and getter — stores and exposes the animal's name.
- Line 5: public abstract void speak(); — declares an abstract method to be implemented by subclasses.
- Line 7-11: class Dog extends Animal — concrete subclass; calls super in constructor.
- Line 12-14: @Override speak() for Dog — provides dog-specific behavior.
- Line 16-20: class Cat extends Animal — another subclass; overrides speak() with cat-specific behavior.

## 4. Interfaces and Abstract Classes
Interfaces define contracts, while abstract classes provide partial implementations and shared state. This example demonstrates both patterns.

```java
public interface Movable {
    void move(int dx, int dy);
}

public abstract class Vehicle implements Movable {
    private String id;
    public Vehicle(String id) { this.id = id; }
    public String getId() { return id; }
    public abstract void start();
    public abstract void stop();
}

public class Car extends Vehicle {
    public Car(String id) { super(id); }
    @Override
    public void start() { System.out.println("Car " + getId() + " starting"); }
    @Override
    public void stop() { System.out.println("Car " + getId() + " stopping"); }
    @Override
    public void move(int dx, int dy) { System.out.println("Car moving " + dx + ", " + dy); }
}
```

### Line-by-line explanation
- Line 1: public interface Movable { — defines a contract for movable objects.
- Line 2: void move(int dx, int dy); — method signature to be implemented by classes.
- Lines 4-11: public abstract class Vehicle implements Movable — provides shared state (id) and enforces start/stop implementations.
- Line 5-6: private id; constructor and getter — stores a unique identifier.
- Line 7-9: abstract start() and stop() — to be implemented by concrete vehicles.
- Line 13-21: public class Car extends Vehicle — concrete vehicle; implements start/stop/move.

## 5. Composition over Inheritance and Practical Patterns
Composition favors building complex types by combining simpler ones rather than extending a class hierarchy. This example demonstrates Engine as a component of a Car, enabling flexible design and testability.

```java
public class Engine {
    private final int horsepower;
    public Engine(int horsepower) { this.horsepower = horsepower; }
    public int getHorsepower() { return horsepower; }
    public void rev() { System.out.println("Engine revving at " + horsepower + "hp"); }
}

public class CarWithEngine {
    private final Engine engine;
    private final String model;

    public CarWithEngine(Engine engine, String model) {
        this.engine = engine;
        this.model = model;
    }

    public void start() {
        System.out.println("Starting " + model);
        engine.rev();
    }
}
```

### Line-by-line explanation
- Line 1: public class Engine { — defines a simple component representing an engine.
- Line 2-4: private horsepower; constructor; getter — stores engine horsepower.
- Line 5-6: rev() — simulates engine activity.
- Line 9: public class CarWithEngine { — a car composed with an engine.
- Line 10-12: Engine engine; String model; — composition relationship and model name.
- Line 14-19: constructor — wires engine and model into the CarWithEngine instance.
- Line 21-25: start() — demonstrates interaction with the composed Engine.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

| Pitfall | Bad Example | Good Example |
|---|---|---|
| Public mutable fields break encapsulation | public class User { public String username; } | public class User { private String username; public String getUsername() { return username; } public void setUsername(String username) { this.username = username; } } |
| Not overriding equals() and hashCode() for value-like objects | public class Coordinate { public int x; public int y; } | public class Coordinate { private final int x; private final int y; public Coordinate(int x, int y) { this.x = x; this.y = y; } @Override public boolean equals(Object o) { if (this == o) return true; if (!(o instanceof Coordinate)) return false; Coordinate c = (Coordinate) o; return x == c.x && y == c.y; } @Override public int hashCode() { return Objects.hash(x, y); } } |
| Tight coupling to concrete implementations (no interface) | public class TextEditor { private final SpellChecker spellChecker = new SimpleSpellChecker(); } | public interface SpellChecker { boolean check(String text); } public class TextEditor { private final SpellChecker spellChecker; public TextEditor(SpellChecker spellChecker) { this.spellChecker = spellChecker; } } |
| Not guarding against nulls (NPE risk) | public int getLength(String s) { return s.length(); } | public int getLength(String s) { if (s == null) return 0; return s.length(); } |

## Y. Why This Matters In Real Systems — production context and real usage
- Maintainability: Encapsulation and clean boundaries reduce accidental coupling, making code easier to evolve and reason about.
- Testability: Interfaces and abstract classes enable easier unit tests via mocks and stubs; composition often yields smaller, replaceable components.
- Reliability: Proper equals/hashCode implementations ensure correct behavior in collections and caching, preventing subtle bugs.
- Performance and memory: Object graphs and inheritance trees affect memory footprint and GC pressure; prefer composition to minimize deep hierarchies when possible.
- API design: Public APIs (classes, methods) should be stable, with clear contracts, input validation, and minimal side effects.
- Real-world backend patterns: Domain models, service layers, and data access objects typically leverage encapsulation, polymorphism, and composition to enable scalable, testable services.

## Z. Study Questions — 5 recall questions
1) What is the difference between a class and an object in Java?  
2) How does inheritance enable polymorphism, and why is it useful in a backend service?  
3) Distinguish between an interface and an abstract class. When would you choose one over the other?  
4) Why is overriding equals() and hashCode() important for value-like classes? Provide a simple example.  
5) Explain composition over inheritance with a small example and its benefits in system design.

## Exercise — a practical multi-part coding challenge
Goal: Build a small, cohesive OOP demonstration in Java that exercises class design, inheritance, interfaces, and composition. You may implement each part in separate files.

Part 1: Encapsulated Value and Basic Class
- Create a class PersonRecord with private fields firstName, lastName, and age. Provide constructor, getters, and a toString. Ensure immutability for this exercise (no setters).
- Deliverable: PersonRecord.java

Part 2: Inheritance and Polymorphism
- Create abstract class Employee with fields id and name, and abstract method calculatePay(). Implement two subclasses: FullTimeEmployee and PartTimeEmployee with appropriate pay calculations.
- Demonstrate a small driver that creates a list of Employee, iterates, and prints pay by calling calculatePay() polymorphically.
- Deliverables: Employee.java, FullTimeEmployee.java, PartTimeEmployee.java, EmployeeDemo.java

Part 3: Interfaces and Behavior Contracts
- Define an interface Payable with method getPayDetails(). Have the concrete employee classes implement Payable as well, providing a string description of the pay.
- Deliverables: Payable.java, FullTimeEmployee.java (updated), PartTimeEmployee.java (updated)

Part 4: Composition and a Simple Service
- Create a class PayrollService that takes a List<Payable> and computes total payout. Use composition rather than inheritance to connect employees to payroll.
- Deliverables: PayrollService.java, PayrollDemo.java (or modify EmployeeDemo.java to include payroll calculation)

Part 5: Integration Test (Optional)
- Create a small JUnit or main-based test that assembles several PersonRecord objects and Employee objects, runs payroll calculations, and prints and verifies expected totals.

Notes for implementation:
- Keep code simple and self-contained for learning purposes.
- Include necessary imports (e.g., java.util.List, java.util.ArrayList).
- Ensure your code compiles with Java 8+ (lambdas and streams optional).

This completes a compact, end-to-end practice of class design, encapsulation, inheritance and polymorphism, interfaces, and composition in Java—core foundation skills for backend engineering.