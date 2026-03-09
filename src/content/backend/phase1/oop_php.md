# Track: Backend Engineering — Module Phase 1 — Language Foundations — Topic: Object-Oriented Programming (PHP)

Object-oriented programming (OOP) is a foundational paradigm for building scalable, maintainable, and robust backend systems. In PHP, OOP enables you to model real-world entities, compose behavior with inheritance and interfaces, and write testable, loosely-coupled code that plays nicely with frameworks, DI containers, and PSR standards. This lesson introduces PHP OOP concepts with practical, PHP-focused examples you can apply in real projects.

## 1. Basic Classes and Objects: Properties, Methods, and Visibility

A class is a blueprint for objects. You define properties (state) and methods (behavior). Visibility modifiers (public, protected, private) control access to members, enabling encapsulation.

```php
<?php
class Person {
  private string $name;
  private int $age;

  public function __construct(string $name, int $age) {
    $this->name = $name;
    $this->age = $age;
  }

  public function getName(): string {
    return $this->name;
  }

  public function getAge(): int {
    return $this->age;
  }

  public function greet(): string {
    return "Hi, I'm " . $this->name . ", " . $this->age . " years old.";
  }
}
```

### Line-by-line explanation
- Line 3: Define a class named Person.
- Line 4-5: Declare private properties $name and $age to store state privately.
- Line 7-11: Constructor that initializes $name and $age when a new Person is created.
- Line 13-15: Public getter for $name, enabling read access from outside the class.
- Line 17-19: Public getter for $age, enabling read access from outside the class.
- Line 21-25: Public method greet that returns a formatted string introducing the person.

Usage example:
```php
$alice = new Person("Alice", 28);
echo $alice->greet();
```

## 2. Inheritance and Polymorphism: Extending Behavior

Inheritance lets you build on existing classes. Polymorphism allows a subclass to override or extend behavior, enabling flexible, reusable code.

```php
<?php
class Employee extends Person {
  private float $salary;

  public function __construct(string $name, int $age, float $salary) {
    parent::__construct($name, $age); // initialize base class state
    $this->salary = $salary;
  }

  public function getSalary(): float {
    return $this->salary;
  }

  // Override: extend base behavior
  public function greet(): string {
    return parent::greet() . " and I earn $" . number_format($this->salary, 2);
  }

  public function work(): string {
    return $this->getName() . " is coding.";
  }
}
```

Usage example:
```php
$emp = new Employee("Alice", 30, 75000);
echo $emp->greet() . PHP_EOL;
echo $emp->work() . PHP_EOL;
```

### Line-by-line explanation
- Line 3: Define a class Employee that extends Person, inheriting its properties and methods.
- Line 4: Declare a private property $salary to store the salary.
- Line 6-11: Constructor calls parent::__construct to initialize name and age, then sets salary.
- Line 13-15: Public getter for salary.
- Line 18-21: Override greet to augment the base greeting with salary information.
- Line 23-25: New method work that uses the inherited getName() to compose a message.

## 3. Interfaces and Traits: Reusable Contracts and Composition

Interfaces define a contract that classes must fulfill. Traits allow code reuse without inheritance, enabling horizontal composition of behavior.

```php
<?php
interface Runnable {
  public function run(): void;
}

trait LoggerTrait {
  protected function log(string $message): void {
    echo "[LOG] " . $message . PHP_EOL;
  }
}

class Job implements Runnable {
  use LoggerTrait;

  private string $description;

  public function __construct(string $description) {
    $this->description = $description;
  }

  public function run(): void {
    $this->log("Running: " . $this->description);
  }
}
```

Usage example:
```php
$job = new Job("Data ETL");
$job->run();
```

### Line-by-line explanation
- Line 3-6: Define an interface Runnable with a single method run().
- Line 8-12: Define a trait LoggerTrait with a protected log() helper to print log messages.
- Line 14-19: Define Job that implements Runnable and uses LoggerTrait.
- Line 20-24: Job constructor initializes the description.
- Line 26-29: Implementation of run() that logs the action.

## 4. Abstract Classes and Late Static Binding: Shared Skeletons and Flexible Dispatch

Abstract classes provide a partial implementation that concrete subclasses complete. Late static binding (using static::) enables methods to behave polymorphically in static contexts.

```php
<?php
abstract class Service {
  protected static string $type = 'base';
  public static function describe(): string {
    // late static binding: returns the subclass's $type
    return static::$type;
  }
  abstract public function run(): void;
}

class EmailService extends Service {
  protected static string $type = 'email';
  public function run(): void {
    // implementation detail omitted
  }
}

class SmsService extends Service {
  protected static string $type = 'sms';
  public function run(): void {
    // implementation detail omitted
  }
}

echo EmailService::describe() . PHP_EOL;
echo SmsService::describe() . PHP_EOL;
```

### Line-by-line explanation
- Line 3: Define an abstract class Service as a partial template for services.
- Line 4: Declare a protected static property $type to hold a type descriptor.
- Line 5-7: Static method describe() uses static:: to enable late static binding, returning the subclass type.
- Line 8: Abstract method run() that concrete subclasses must implement.
- Line 11-14: Define EmailService as a concrete subclass with its own $type and a run() implementation.
- Line 17-20: Define SmsService similarly.
- Line 22-23: Output the descriptions for both services demonstrating binding to subclass state.

## 5. Encapsulation and Magic Methods: Dynamic Behavior and Safe Access

Magic methods enable dynamic interactions with objects, while encapsulation protects internal state.

```php
<?php
class DynamicProperties {
  private array $data = [];

  public function __get(string $name) {
    return $this->data[$name] ?? null;
  }

  public function __set(string $name, $value): void {
    $this->data[$name] = $value;
  }

  public function __toString(): string {
    return json_encode($this->data);
  }
}

$dyn = new DynamicProperties();
$dyn->foo = 'bar';       // __set is invoked
echo $dyn->foo . PHP_EOL; // __get is invoked
echo $dyn;                   // __toString is invoked
```

### Line-by-line explanation
- Line 3: Define a class DynamicProperties to hold dynamic key-value pairs.
- Line 5: Private $data array stores properties privately.
- Line 7-9: __get magic method enables reading undefined properties via $object->name.
- Line 11-13: __set magic method enables writing undefined properties via $object->name = value.
- Line 15-17: __toString magic method provides a string representation of the internal data.
- Line 21-24: Demonstration of dynamic property assignment, reading, and string conversion.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Exposing internal state via public properties
  - Bad:
    ```php
    class UserBad {
      public string $name;
      public function __construct(string $name) {
        $this->name = $name;
      }
    }
    ```
  - Good:
    ```php
    class UserGood {
      private string $name;
      public function __construct(string $name) {
        $this->name = $name;
      }
      public function getName(): string { return $this->name; }
      public function setName(string $name): void { $this->name = $name; }
    }
    ```

- Pitfall 2: Not calling the parent constructor in a subclass
  - Bad:
    ```php
    class Person { private string $name; public function __construct(string $name) { $this->name = $name; } }
    class EmployeeBad extends Person {
      private float $salary;
      public function __construct(string $name, float $salary) {
        $this->salary = $salary; // missing parent::__construct($name);
      }
    }
    ```
  - Good:
    ```php
    class EmployeeGood extends Person {
      private float $salary;
      public function __construct(string $name, float $salary) {
        parent::__construct($name);
        $this->salary = $salary;
      }
    }
    ```

- Pitfall 3: Tight coupling through inheritance when composition is preferable
  - Bad:
    ```php
    class EmailService extends SMTPClient {
      public function send(string $to, string $body) {
        // relies on SMTPClient internals; tight coupling
      }
    }
    ```
  - Good:
    ```php
    class SMTPClient {
      public function send(string $to, string $body): void { /* ... */ }
    }
    class EmailService {
      private SMTPClient $smtp;
      public function __construct(SMTPClient $smtp) {
        $this->smtp = $smtp;
      }
      public function send(string $to, string $body): void {
        $this->smtp->send($to, $body);
      }
    }
    ```

- Pitfall 4: Missing type hints and return types
  - Bad:
    ```php
    function getUser($id) {
      // ...
    }
    ```
  - Good:
    ```php
    function getUser(int $id): ?User {
      // ...
    }
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Maintainability: OOP helps structure complex domains into cohesive, reusable components. This reduces duplication and makes refactoring safer.
- Testability: Interfaces, abstract classes, and dependency injection enable precise unit tests and easier mocking.
- Collaboration: Encapsulation and clear APIs reduce unintended side effects when multiple teams touch the codebase.
- Framework compatibility: PHP ecosystems (Laravel, Symfony, Slim) rely on OOP patterns like controllers, services, repositories, and DTOs; understanding these concepts accelerates framework adoption and contribution.
- Reliability and security: Proper visibility and input validation prevent accidental data leaks and enforce invariants. Polymorphism enables swapping implementations (e.g., different storage backends) without changing call sites.
- Performance considerations: PHP’s object model incurs minor overhead, but well-designed OOP reduces complexity, enabling caching, lazy loading, and DI-based patterns that positively impact throughput and maintainability.
- Real-world pattern example: Using interfaces for repositories (UserRepository implements Persistable) allows easy swapping of data sources (e.g., MySQL, PostgreSQL, or in-memory stores) without altering business logic.

## Z. Study Questions — 5 recall questions

1. What is the difference between public, protected, and private visibility in PHP classes?  
2. How do you override a method in PHP, and why might you call parent::methodName() inside the override?  
3. What is a trait, and when would you choose to use a trait instead of inheritance?  
4. Explain late static binding in PHP and provide a short example of how static:: differs from self::.  
5. What is the purpose of an interface in PHP, and how does it help with testability and dependency injection?

## Exercise — Practical multi-part coding challenge

Part A: Build a small OOP library to manage a collection of products with persistence in a simple in-memory store.

- Create a base class Model with:
  - protected static int $nextId = 1;
  - protected int $id;
  - protected DateTime $createdAt;
  - public function __construct(): void that assigns a unique id and sets createdAt to now.

- Create interface Persistable with method save(array &$store): void.

- Create trait Timestampable with:
  - protected DateTime $updatedAt;
  - public function touch(): void to update updatedAt to now;
  - public function getUpdatedAt(): DateTime to read the last update time.

- Create class Product extends Model and implements Persistable:
  - Use Timestampable.
  - Private string $name; private float $price;
  - Constructor(string $name, float $price) calls parent::__construct(), assigns properties, and calls $this->touch() to initialize updatedAt.
  - Public getters for name and price.
  - Implement save(array &$store): void to store a serializable snapshot in $store['products'][$id] containing id, name, price, createdAt, updatedAt (formatted as ISO8601).
  - Optional: __toString() to render a short summary.

- Demonstrate usage:
  - Create an in-memory store array.
  - Instantiate two Product objects.
  - Save both to the store.
  - Print the store contents to verify the data was captured.

Example implementation:

```php
<?php
class Model {
  protected static int $nextId = 1;
  protected int $id;
  protected DateTime $createdAt;

  public function __construct() {
    $this->id = self::$nextId++;
    $this->createdAt = new DateTime();
  }

  public function getId(): int { return $this->id; }
  public function getCreatedAt(): DateTime { return $this->createdAt; }
}

interface Persistable {
  public function save(array &$store): void;
}

trait Timestampable {
  protected DateTime $updatedAt;
  public function __constructTimestampable(): void {
    $this->updatedAt = new DateTime();
  }
  public function touch(): void {
    $this->updatedAt = new DateTime();
  }
  public function getUpdatedAt(): DateTime {
    return $this->updatedAt;
  }
}

class Product extends Model implements Persistable {
  use Timestampable;

  private string $name;
  private float $price;

  public function __construct(string $name, float $price) {
    parent::__construct();
    $this->name = $name;
    $this->price = $price;
    // initialize updatedAt
    $this->touch();
  }

  public function getName(): string { return $this->name; }
  public function getPrice(): float { return $this->price; }

  public function save(array &$store): void {
    if (!isset($store['products'])) {
      $store['products'] = [];
    }
    $store['products'][$this->getId()] = [
      'id' => $this->getId(),
      'name' => $this->getName(),
      'price' => $this->getPrice(),
      'createdAt' => $this->getCreatedAt()->format(DateTime::ATOM),
      'updatedAt' => $this->getUpdatedAt()->format(DateTime::ATOM),
    ];
  }
}

// Usage
$store = [];

$p1 = new Product("Laptop", 1299.99);
$p1->save($store);

$p2 = new Product("Smartphone", 799.99);
$p2->save($store);

print_r($store);
```

Notes for learners:
- This exercise reinforces core OOP concepts in a cohesive mini-domain: models, persistence contract, and timestamp management via traits.
- The in-memory store is a stand-in for a real data store; in production, you would inject a repository or ORM to handle actual database interactions.
- You can extend the exercise by adding validation, updating records, or integrating with a DI container in a larger PHP application.

If you’d like, I can tailor the exercise to a specific PHP framework (Laravel-style Eloquent-like model, Symfony-style service, etc.) or adjust the complexity to fit a particular cohort level.