# Object-Oriented Programming in JavaScript / Node.js

Object-Oriented Programming (OOP) in JavaScript helps you model real-world domains, organize complex server-side logic, and create reusable, testable code. In Node.js, classes and objects are common patterns for representing domain models, services, and adapters. Modern JS supports class syntax, private fields, inheritance, mixins, and async methods, making OOP practical and expressive for back-end systems.

## 1. Fundamentals of OOP in JavaScript

A basic understanding of classes, constructors, and methods is the foundation of OOP in JS. You’ll learn how to define a simple class, extend it, and instantiate objects.

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    console.log(`${this.name} makes a sound.`);
  }
}
class Dog extends Animal {
  speak() {
    console.log(`${this.name} barks.`);
  }
}
const d = new Dog('Rex');
d.speak();
```

### Line-by-line explanation breaking down each line
1. Define a class named Animal.
2. The constructor initializes the name property on the instance.
3. Define a method speak that uses the instance name to log a generic message.
4. Define a subclass Dog that extends Animal, inheriting its properties and methods.
5. Override the speak method in Dog to provide a specialized behavior.
6. Create a new Dog instance with the name 'Rex'.
7. Call the speak method on the Dog instance, which resolves to the overridden version.

```
const d = new Dog('Rex');
d.speak();
```

### Line-by-line explanation breaking down each line (usage)
1. Create a new Dog instance with the name 'Rex'.
2. Invoke the speak method, resulting in "Rex barks." being logged.

## 2. Encapsulation, Accessors, and State

Encapsulation hides internal state and exposes a controlled interface. Private fields (#field), getters, and setters help enforce invariants and validation, which is crucial for back-end models (e.g., accounts, users).

```js
class BankAccount {
  #balance = 0;
  constructor(owner) {
    this.owner = owner;
  }
  get balance() { return this.#balance; }
  deposit(amount) { 
    if (amount <= 0) throw new Error('Deposit must be positive');
    this.#balance += amount; 
    return this.#balance; 
  }
  withdraw(amount) { 
    if (amount <= 0) throw new Error('Withdraw must be positive');
    if (this.#balance < amount) throw new Error('Insufficient funds');
    this.#balance -= amount; 
    return this.#balance; 
  }
}
```

```js
const acc = new BankAccount('Alice');
acc.deposit(100);
acc.withdraw(30);
console.log(acc.balance); // 70
```

### Line-by-line explanation breaking down each line (Block 1)
1. Declare a class BankAccount with a private field #balance.
2. Initialize #balance to 0 at declaration time.
3. Define a constructor that stores the account owner.
4. Provide a getter for balance to expose read-only access to the private balance.
5. Implement deposit with validation to ensure positive amounts.
6. Increment the private balance by the deposited amount.
7. Return the new balance after deposit.
8. Implement withdraw with validation to ensure positive amounts and sufficient funds.
9. Decrement the private balance by the withdrawn amount.
10. Return the new balance after withdrawal.

### Line-by-line explanation breaking down each line (Block 2)
1. Create a BankAccount for 'Alice'.
2. Deposit 100 units.
3. Withdraw 30 units.
4. Log the current balance (70).

## 3. Inheritance and Polymorphism

Inheritance lets you share behavior and data while enabling specialized behavior in subclasses. Polymorphism lets code work with base types while executing derived implementations.

```js
class Vehicle {
  constructor(brand) { this.brand = brand; }
  honk() { console.log(`${this.brand} vehicle honks.`); }
}
class Car extends Vehicle {
  constructor(brand, model) {
    super(brand);
    this.model = model;
  }
  honk() {
    console.log(`${this.brand} ${this.model} car honks loudly!`);
  }
  start() { return `${this.brand} ${this.model} started.`; }
}
function makeSound(v) {
  v.honk();
}
```

```js
const car = new Car('Toyota', 'Camry');
makeSound(car); // uses polymorphism
console.log(car.start());
```

### Line-by-line explanation breaking down each line (Block 1)
1. Define a base class Vehicle with a brand property.
2. Implement a honk method that logs a generic message.
3. Define a subclass Car that extends Vehicle.
4. In Car’s constructor, call super to initialize the base class and set model.
5. Override honk in Car to provide a more specific message.
6. Add a start method that returns a start message.
7. Define a standalone function makeSound that calls honk on any Vehicle-like object.

### Line-by-line explanation breaking down each line (Block 2)
1. Create a Car instance with brand 'Toyota' and model 'Camry'.
2. Pass the car to makeSound, which calls the car’s honk (polymorphic behavior).
3. Log the result of car.start().

## 4. Composition and Prototypes (Inheritance vs Composition)

Composition favors assembling behavior from smaller parts rather than deep inheritance trees. Mixins and composition can improve flexibility and testability.

```js
const Timestamped = Base =>
  class extends Base {
    constructor(...args) {
      super(...args);
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
    touch() {
      this.updatedAt = new Date();
    }
  };

class User {
  constructor(name) {
    this.name = name;
  }
}
class UserWithTimestamps extends Timestamped(User) {}
```

```js
const u = new UserWithTimestamps('Alice');
console.log(u.name, u.createdAt, u.updatedAt);
u.touch();
console.log(u.updatedAt);
```

```js
class Logger {
  log(message) { console.log(message); }
}
class Task {
  constructor(name, logger) {
    this.name = name;
    this.logger = logger;
  }
  run() {
    this.logger.log(`Running task: ${this.name}`);
  }
}
```

```js
const logger = new Logger();
const task = new Task('Backup', logger);
task.run();
```

### Line-by-line explanation breaking down each line (Block 1 - Mixin)
1. Define a higher-order function Timestamped that takes a Base class and returns a new class.
2. The returned class extends the provided Base class.
3. In the constructor, call super to initialize Base properties.
4. Set createdAt to the current date and time.
5. Set updatedAt to the current date and time.
6. Define a touch method to refresh updatedAt.

### Line-by-line explanation breaking down each line (Block 2 - Usage)
1. Create a new UserWithTimestamps instance with the name 'Alice'.
2. Access and log name, createdAt, and updatedAt.
3. Call touch to refresh updatedAt.
4. Log the new updatedAt timestamp.

### Line-by-line explanation breaking down each line (Block 3 - Composition)
1. Define a simple Logger with a log method.
2. Define a Task class that accepts a name and a logger dependency.
3. In Task, store the provided logger and name.
4. Implement run to delegate logging to the injected logger.
5. Create a Logger instance and a Task, then run the task to observe logging behavior.

### Line-by-line explanation breaking down each line (Block 4 - Usage)
1. Instantiate a Logger.
2. Create a Task named 'Backup' with the injected logger.
3. Invoke run to produce a log entry.

## 5. Async OOP Patterns

Asynchronous operations are common in back-end services (HTTP calls, DB access, queues). Encapsulating async behavior inside class methods helps keep your code organized and testable.

```js
class ApiClient {
  constructor(baseUrl) { this.baseUrl = baseUrl; }
  async get(endpoint) {
    const res = await fetch(`${this.baseUrl}${endpoint}`);
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);
    return res.json();
  }
}
```

```js
(async () => {
  const client = new ApiClient('https://api.example.com/');
  const data = await client.get('/users/1');
  console.log(data);
})();
```

### Line-by-line explanation breaking down each line (Block 1)
1. Define ApiClient with a baseUrl for requests.
2. Implement an asynchronous get method that fetches from baseUrl + endpoint.
3. Await the HTTP response.
4. If the response isn’t OK, throw an error with the status.
5. Parse and return the JSON body of the response.

### Line-by-line explanation breaking down each line (Block 2)
1. Immediately-invoked async function to demonstrate usage without top-level await.
2. Create an ApiClient with a base URL.
3. Await a GET request to an endpoint.
4. Log the retrieved data.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Forgetting to bind this when passing methods as callbacks

Bad:
```js
class Counter {
  constructor() { this.count = 0; }
  increment() { this.count++; }
}
const c = new Counter();
setTimeout(c.increment, 1000); // this is undefined inside increment
```

Good:
```js
// Bind this explicitly
setTimeout(c.increment.bind(c), 1000);
```

Alternatively, use an arrow function to preserve context:
```js
setTimeout(() => c.increment(), 1000);
```

### Pitfall 2: Inheriting without calling super() in derived constructors

Bad:
```js
class Animal {
  constructor(name) { this.name = name; }
}
class Dog extends Animal {
  constructor(name) {
    // Forgot to call super(name)
    this.name = name;
  }
}
```

Good:
```js
class Dog extends Animal {
  constructor(name) {
    super(name);
  }
}
```

### Pitfall 3: Exposing internal state (no encapsulation) vs proper encapsulation

Bad:
```js
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email; // internal state exposed publicly
  }
}
```

Good:
```js
class User {
  #email;
  constructor(name, email) {
    this.name = name;
    this.#email = email;
  }
  get email() { return this.#email; }
  set email(v) { if (v.includes('@')) this.#email = v; else throw new Error('Invalid email'); }
}
```

### Pitfall 4: Not handling asynchronous errors (no try/catch or error propagation)

Bad:
```js
class ApiClient {
  async fetchData() {
    const res = await fetch('https://example.com/data');
    // Potential errors are unhandled
    return res.json();
  }
}
```

Good:
```js
class ApiClient {
  async fetchData() {
    const res = await fetch('https://example.com/data');
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);
    return res.json();
  }
}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Maintainability: OOP models help you map domain concepts (User, Product, Order) to code, making systems easier to understand and modify.
- Testability: Encapsulation and clear interfaces enable unit tests with mocks/stubs, reducing flaky tests.
- Reuse and evolution: Inheritance and mixins let you share behavior without duplicating code, easing feature additions.
- Reliability and error handling: Centralized validation, guards, and async error handling improve system stability.
- Performance and memory: Use composition to avoid deep inheritance hierarchies that complicate memory profiles; prefer lightweight, single-responsibility classes.
- Real-world patterns: Logging, auditing, and timestamping are common cross-cutting concerns. Demonstrating them via mixins or composition keeps core logic clean.
- Ecosystem alignment: In Node.js, you’ll often tie OOP patterns to data access layers (repositories), services, and adapters, making your code easier to test with dependency injection and easier to substitute in production (e.g., replacing a repository with a database-backed implementation).

## Z. Study Questions — 5 recall questions

1. What is the difference between a class and a constructor function in JavaScript, and how does extends enable inheritance?
2. How do private fields (#field) enforce encapsulation in JavaScript classes?
3. How does you call the base class constructor from a derived class?
4. What are the benefits of using a mixin pattern (composition) versus deep inheritance for adding behavior?
5. How can you structure an OOP-based API client to handle errors robustly and testably?

## Exercise — a practical multi-part coding challenge

Part 1 — Define a base model and a product subclass
- Create a base class Model with:
  - a unique id (auto-incremented)
  - a createdAt timestamp
- Create a Product class that extends Model with:
  - name (string)
  - price (non-negative number)
  - basic validation in the constructor

Code block:
```js
class Model {
  constructor() {
    this.id = Model.nextId++;
    this.createdAt = new Date();
  }
}
Model.nextId = 1;
class Product extends Model {
  constructor(name, price) {
    super();
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Product name is required');
    }
    if (typeof price !== 'number' || price < 0) {
      throw new Error('Product price must be a non-negative number');
    }
    this.name = name;
    this.price = price;
  }
}
```

### Line-by-line explanation breaking down each line (Part 1)
1. Define a base Model class.
2. In the constructor, assign a unique id using a static counter.
3. Record the creation timestamp.
4. Initialize the nextId counter to 1 on the Model class.
5. Define a Product class that extends Model.
6. Call super() to initialize base attributes.
7. Validate the name parameter and throw if invalid.
8. Validate the price parameter and throw if invalid.
9. Assign name and price to the instance.

Part 2 — In-memory repository for products
- Implement a simple repository to store Product instances by id.
- Provide add, get, and list methods.

Code block:
```js
class ProductRepository {
  constructor() {
    this.items = new Map();
  }
  add(product) {
    if (!(product instanceof Product)) {
      throw new Error('Can only add Product instances');
    }
    this.items.set(product.id, product);
  }
  get(id) {
    return this.items.get(id);
  }
  list() {
    return Array.from(this.items.values());
  }
}
```

### Line-by-line explanation breaking down each line (Part 2)
1. Define ProductRepository to store Product instances.
2. Use a Map to store items by their id for fast lookup.
3. Validate input to ensure only Product instances are added.
4. Insert the product into the map keyed by its id.
5. Retrieve a product by id from the map.
6. Return all stored products as an array.

Part 3 — Add timestamping via a small mixin (composition)
- Create a mixin that adds updatedAt and a touch() method to a base class.
- Apply it to a Product subclass to demonstrate composition.

Code block:
```js
const Timestamped = Base => class extends Base {
  constructor(...args) {
    super(...args);
    this.updatedAt = new Date();
  }
  touch() {
    this.updatedAt = new Date();
  }
};
class ProductWithTS extends Timestamped(Product) {}
```

### Line-by-line explanation breaking down each line (Part 3)
1. Define a mixin function that accepts a Base class and returns a subclass.
2. The new class extends the Base class to preserve its behavior.
3. In the constructor, call super and set updatedAt.
4. Add a touch method to refresh updatedAt.

Part 4 — Usage example: creating, storing, and updating
- Create a repository, add a product, and demonstrate updating timestamp via touch.

Code block:
```js
const inventory = new ProductRepository();
const laptop = new ProductWithTS('Laptop', 1299);
inventory.add(laptop);

console.log(inventory.list().map(p => ({
  id: p.id,
  name: p.name,
  price: p.price,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt
})));

laptop.touch();
console.log('Updated at:', laptop.updatedAt);
```

### Line-by-line explanation breaking down each line (Part 4)
1. Instantiate a ProductRepository to hold products.
2. Create a ProductWithTS instance for a Laptop with price 1299.
3. Add the product to the inventory.
4. List all products and map to a simple object with relevant fields.
5. Log the product details including createdAt and updatedAt.
6. Call touch on the product to refresh updatedAt.
7. Log the new updatedAt timestamp.

End of lesson.