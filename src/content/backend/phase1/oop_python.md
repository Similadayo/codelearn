# Track: Backend Engineering — Phase 1: Language Foundations — Object-Oriented Programming in Python

Compelling introductory paragraph: Object-Oriented Programming (OOP) is a fundamental paradigm for organizing complex software around real-world concepts. In backend systems, OOP helps model domain entities (like users, products, orders), encapsulate behavior, and compose systems from reusable components (services, repositories, mappers). Mastery of Python's class system, inheritance, polymorphism, and common design patterns (e.g., Repository, Service) leads to maintainable, testable, and scalable backend code. This lesson builds a solid foundation in Python OOP with practical examples relevant to backend engineering.

## 1. Basic Object-Oriented Concepts in Python

Code: define a simple User class with attributes and a couple of methods.
```python
class User:
    def __init__(self, username: str, email: str, role: str = 'user'):
        self.username = username
        self.email = email
        self.role = role

    def greeting(self) -> str:
        return f"Hello, {self.username}!"

    def is_admin(self) -> bool:
        return self.role.lower() == 'admin'
```

Code: create instances and use methods.
```python
u1 = User("alice", "alice@example.com")
u2 = User("bob", "bob@example.com", role="admin")

print(u1.greeting())  # Hello, alice!
print(u2.is_admin())  # True
```

### Line-by-line explanation
- Line 1: Define a new class named User.
- Line 2: Define the constructor (__init__) with self, username, email, and an optional role parameter defaulting to 'user'.
- Line 3-5: Assign the provided values to instance attributes: username, email, and role.
- Line 7: Define a method greeting that returns a greeting string referencing the instance's username.
- Line 9: Define a method is_admin that checks if the instance's role is 'admin' (case-insensitive).
- Line 12: Create a User instance u1 with username 'alice' and email 'alice@example.com'.
- Line 13: Create a second User instance u2 with username 'bob', email 'bob@example.com', and role 'admin'.
- Line 15: Call u1.greeting() and print the result.
- Line 16: Call u2.is_admin() and print the result.

## 2. Encapsulation, Properties, and Data Hiding

Code: use private-like attributes and a property with a getter/setter.
```python
class Account:
    def __init__(self, balance: float = 0.0):
        self._balance = balance

    @property
    def balance(self) -> float:
        return self._balance

    @balance.setter
    def balance(self, amount: float):
        if amount < 0:
            raise ValueError("Balance cannot be negative.")
        self._balance = amount
```

Code: usage demonstrating access and validation.
```python
acct = Account(100.0)
print(acct.balance)   # 100.0
acct.balance = 150.0
print(acct.balance)   # 150.0
# acct.balance = -10.0  # would raise ValueError
```

### Line-by-line explanation
- Line 1: Define a class named Account.
- Line 2: Constructor with an optional balance parameter defaulting to 0.0.
- Line 3: Store the balance in a "private" attribute _balance (by convention, not enforced).
- Line 5: Define a read-only property named balance that returns _balance.
- Line 9: Define a setter for the balance property to validate the new amount.
- Line 10-11: If the new amount is negative, raise a ValueError to prevent invalid state.
- Line 12: Update the internal _balance to the validated amount.
- Line 15: Create an Account with 100.0.
- Line 16: Print the current balance (via property).
- Line 17: Update the balance to 150.0 (via property setter).
- Line 18: Print the updated balance.
- Line 19: Commented line showing that setting a negative balance would raise an error.

## 3. Inheritance and Polymorphism

Code: base Shape and concrete implementations with a common interface.
```python
class Shape:
    def area(self) -> float:
        raise NotImplementedError
```

```python
class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height
```

```python
class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        import math
        return math.pi * (self.radius ** 2)
```

```python
def print_area(shape: Shape):
    print(f"Area: {shape.area()}")
```

Usage:
```python
print_area(Rectangle(3, 4))  # Area: 12.0
print_area(Circle(2))        # Area: 12.566370614359172
```

### Line-by-line explanation
- Line 1: Define a base class Shape with a method area that must be implemented by subclasses.
- Line 2: area raises NotImplementedError to enforce override in subclasses.
- Line 5: Define Rectangle as a subclass of Shape with a constructor storing width and height.
- Line 8: Implement area for Rectangle as width multiplied by height.
- Line 13: Define Circle as a subclass of Shape with a constructor storing radius.
- Line 16-17: Implement area for Circle using math.pi and radius squared.
- Line 20: Define a function print_area that accepts any Shape and prints its computed area.
- Line 25: Use print_area with a Rectangle instance; computes 12.0.
- Line 26: Use print_area with a Circle instance; computes π × 2^2.

## 4. Composition and the Repository Pattern

Code: Repository that stores User objects and a Service that uses the repository.
```python
class UserRepository:
    def __init__(self):
        self._users = {}

    def add(self, user: 'User'):
        self._users[user.username] = user

    def get(self, username: str) -> 'User':
        return self._users.get(username)
```

```python
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    def register(self, username: str, email: str) -> 'User':
        user = User(username, email)
        self.repo.add(user)
        return user
```

Usage:
```python
repo = UserRepository()
service = UserService(repo)
service.register("charlie", "charlie@example.com")
print(repo.get("charlie").email)  # charlie@example.com
```

### Line-by-line explanation
- Line 1: Define a UserRepository class responsible for persisting User instances in memory.
- Line 2: Constructor initializes an internal dictionary _users.
- Line 5: add method stores a User in the repository keyed by username.
- Line 8: get method retrieves a User by username (or None if not found).
- Line 12: Define a UserService that depends on a UserRepository (composition).
- Line 13: Service constructor stores the provided repository instance.
- Line 16-18: register creates a new User, stores it in the repository, and returns it.
- Line 21: Create a repository instance.
- Line 22: Create a service bound to the repository.
- Line 23: Register a new user via the service.
- Line 24: Access the stored user through the repository and print their email.

## 5. Dunder Methods and Introspection

Code: implement __repr__, __str__, and __eq__ for a User-like class.
```python
class User:
    def __init__(self, username: str, email: str):
        self.username = username
        self.email = email

    def __repr__(self) -> str:
        return f"User(username={self.username!r}, email={self.email!r})"

    def __str__(self) -> str:
        return f"{self.username} <{self.email}>"

    def __eq__(self, other) -> bool:
        if not isinstance(other, User):
            return NotImplemented
        return (self.username, self.email) == (other.username, other.email)
```

Code: demonstration.
```python
u1 = User("dana", "dana@example.com")
u2 = User("dana", "dana@example.com")
print(u1)           # dana <dana@example.com>
print(u1 == u2)     # True
```

### Line-by-line explanation
- Line 1: Define class User.
- Line 2-3: Constructor sets username and email on the instance.
- Line 5: __repr__ returns an unambiguous string representation suitable for debugging.
- Line 8: __str__ returns a readable, user-facing representation.
- Line 11-14: __eq__ compares two User instances by their (username, email); returns NotImplemented if the other object isn't a User.
- Line 17-18: Create two User instances with identical data.
- Line 19: Print the human-readable representation of u1 via __str__.
- Line 20: Compare u1 and u2 using __eq__.

## 6. Practical Python OOP Patterns for Backend

Code: using @dataclass for simple data models to reduce boilerplate (demonstrates a common pattern in Python backends).
```python
from dataclasses import dataclass

@dataclass
class Product:
    id: int
    name: str
    price: float

p = Product(1, "Widget", 9.99)
print(p)  # Product(id=1, name='Widget', price=9.99)
```

### Line-by-line explanation
- Line 1: Import the dataclass decorator from the dataclasses module.
- Line 3: Apply @dataclass to automatically generate __init__, __repr__, and other boilerplate.
- Line 4-6: Define a simple data model Product with id, name, and price.
- Line 8-9: Instantiate a Product and print its representation (generated by dataclass).

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Mutable default arguments
  Bad:
  ```python
  class Collector:
      def __init__(self, items=[]):
          self.items = items
  ```
  Good:
  ```python
  class Collector:
      def __init__(self, items=None):
          self.items = [] if items is None else list(items)
  ```

- Pitfall 2: Using a mutable class attribute shared across instances
  Bad:
  ```python
  class Counter:
      value = 0
      def increment(self):
          self.value += 1
  ```
  Good:
  ```python
  class Counter:
      def __init__(self):
          self.value = 0
      def increment(self):
          self.value += 1
  ```

- Pitfall 3: Methods missing self parameter
  Bad:
  ```python
  class Greeter:
      def greet():
          print("Hello")
  ```
  Good:
  ```python
  class Greeter:
      def greet(self):
          print("Hello")
  ```

- Pitfall 4: Defining __eq__ without __hash__
  Bad:
  ```python
  class User:
      def __init__(self, username):
          self.username = username
      def __eq__(self, other):
          return isinstance(other, User) and self.username == other.username
  ```
  Good:
  ```python
  class User:
      def __init__(self, username):
          self.username = username
      def __eq__(self, other):
          return isinstance(other, User) and self.username == other.username
      def __hash__(self):
          return hash(self.username)
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Maintainability: OOP encourages clear boundaries (models, services, repositories), making complex backend code easier to reason about, test, and refactor.
- Reuse and composition: By composing components (repositories, services) rather than autogenerating ad-hoc functions, teams can swap implementations (e.g., in-memory repo for tests, SQL/NoSQL repo for production) with minimal code changes.
- Debuggability: __repr__/__str__ and consistent model representations improve logging and debugging in production systems.
- Patterns in practice: Repository and Service patterns map well to real architectures (e.g., CRUD operations, business rules, transaction boundaries). Python’s dynamic typing can be leveraged with type hints for IDE support and error catching during development.
- Performance and discipline: While Python OOP supports rapid development, mindful design (avoiding unnecessary inheritance, favoring composition, using dataclasses for simple data carriers) helps keep systems performant and understandable at scale.
- Testing: Objects with clear interfaces and deterministic behavior are easier to unit test. Mocks and fakes can stand in for repositories/services to test business logic in isolation.

## Z. Study Questions — 5 recall questions

1) What is the difference between an instance attribute and a class attribute? How does Python resolve attribute access?  
2) How do you implement encapsulation in Python, and why would you prefer properties over direct attribute access?  
3) Explain the roles of __repr__ and __str__ in debugging and logging. Which should be machine-friendly and which human-friendly?  
4) When would you prefer composition over inheritance in backend design? Provide a concrete example.  
5) Name at least two common pitfalls when defining __eq__ in Python classes and how to mitigate them.

## Exercise — Practical multi-part coding challenge

Part A: Create a small domain model and repository
- Task: Implement a lightweight domain model for a Product with id, name, and price. Include __repr__ and __eq__ so products compare by id and fields.
- Requirements:
  - Product class with id (int), name (str), price (float).
  - __repr__ showing Product(id=..., name=..., price=...).
  - __eq__ compares products by id (and optionally name and price if you want stricter equality).
  - A simple ProductRepository with add(product) and get(product_id).

Starter code:
```python
class Product:
    def __init__(self, id: int, name: str, price: float):
        self.id = id
        self.name = name
        self.price = price

    def __repr__(self) -> str:
        return f"Product(id={self.id!r}, name={self.name!r}, price={self.price!r})"

    def __eq__(self, other) -> bool:
        if not isinstance(other, Product):
            return NotImplemented
        return self.id == other.id
        # Optional: return (self.id, self.name, self.price) == (other.id, other.name, other.price)
```

```python
class ProductRepository:
    def __init__(self):
        self._store = {}

    def add(self, product: Product):
        self._store[product.id] = product

    def get(self, product_id: int) -> Product:
        return self._store.get(product_id)
```

Part B: Implement a simple ProductService
- Task: Add a method to apply a discount to a product's price by a percentage, accessible through the service.
- Requirements:
  - ProductService(repo) initializer.
  - discount(product_id, percent) that reduces price by percent and stores the updated product back in the repository.
  - Ensure percent is within [0, 100].

Starter code:
```python
class ProductService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

    def discount(self, product_id: int, percent: float) -> Product:
        product = self.repo.get(product_id)
        if product is None:
            raise ValueError("Product not found")
        if not (0 <= percent <= 100):
            raise ValueError("Percent must be between 0 and 100")
        discount_amount = product.price * (percent / 100)
        product.price -= discount_amount
        self.repo.add(product)  # re-save updated product
        return product
```

Part C: Demonstration script
- Task: Create a couple of products, add them to the repository, apply a discount via the service, and print results.
Starter code:
```python
def demo():
    repo = ProductRepository()
    service = ProductService(repo)

    p1 = Product(1, "Widget", 9.99)
    p2 = Product(2, "Gadget", 19.99)

    repo.add(p1)
    repo.add(p2)

    print("Before discount:")
    print(repo.get(1))
    print(repo.get(2))

    service.discount(1, 20)  # 20% discount on Widget
    service.discount(2, 50)  # 50% discount on Gadget

    print("After discount:")
    print(repo.get(1))
    print(repo.get(2))

if __name__ == "__main__":
    demo()
```

Task outcomes checklist:
- The Product class supports readable representations and equality checks suitable for tests.
- The repository stores and retrieves products by id.
- The service applies percentage-based discounts and persists updates.
- The demonstration prints before-and-after states to verify correctness.

End of lesson.