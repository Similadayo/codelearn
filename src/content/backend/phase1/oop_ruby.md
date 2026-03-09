# Object-Oriented Programming in Ruby: Phase 1 — Language Foundations

Object-oriented programming (OOP) is a foundational paradigm for building modular, maintainable, and scalable backend systems. In Ruby, OOP is idiomatic and expressive, enabling clean modeling of real-world domains, clear boundaries between responsibilities, and powerful composition through modules and mixins. This lesson builds the core OOP concepts in Ruby so you can design robust back-end components, from simple domain models to small service objects, with confidence.

## 1. Fundamentals of Classes and Objects in Ruby

Ruby is built around objects. You define classes as blueprints, instantiate objects, and call methods on those objects. This section covers the basics: defining a class, initializing state, and exposing behavior.

```ruby
class Person
  attr_reader :name

  def initialize(name)
    @name = name
  end

  def greet
    "Hello, my name is #{@name}."
  end
end

p = Person.new("Alice")
puts p.greet
```

### Line-by-line explanation breaking down each line
- Line 1: class Person
  - Starts the definition of a new class named Person.
- Line 2: attr_reader :name
  - Creates a read-only accessor for the instance variable @name.
- Line 4: def initialize(name)
  - Defines the constructor method; Ruby calls this when creating a new instance.
- Line 5: @name = name
  - Stores the provided name in an instance variable.
- Line 7: def greet
  - Declares an instance method greet.
- Line 8: "Hello, my name is #{@name}."
  - Returns a string that interpolates the instance's name.
- Line 11: p = Person.new("Alice")
  - Creates a new Person object with name "Alice".
- Line 12: puts p.greet
  - Calls the greet method on p and prints the result.

## 2. Methods, Initialization, and Encapsulation

Encapsulation is about controlling access to an object's state. Ruby supports public, private, and protected methods, and you typically expose state via accessors while keeping mutation limited to defined methods.

```ruby
class BankAccount
  attr_reader :balance

  def initialize(balance = 0)
    @balance = balance
  end

  def deposit(amount)
    raise ArgumentError, "amount must be positive" if amount <= 0
    @balance += amount
  end

  def withdraw(amount)
    raise ArgumentError, "amount must be positive" if amount <= 0
    raise "Insufficient funds" if amount > @balance
    @balance -= amount
  end

  private

  def positive_amount?(amount)
    amount > 0
  end
end

acct = BankAccount.new(100)
acct.deposit(50)
begin
  acct.withdraw(200)
rescue => e
  puts e.message
end
puts acct.balance
```

### Line-by-line explanation breaking down each line
- Line 1: class BankAccount
  - Defines a new class to model a bank account.
- Line 2: attr_reader :balance
  - Exposes a read-only balance attribute.
- Line 4: def initialize(balance = 0)
  - Constructor with a default balance of 0.
- Line 5: @balance = balance
  - Sets the initial balance.
- Line 7: def deposit(amount)
  - Public method to add funds.
- Line 8: raise ArgumentError, "amount must be positive" if amount <= 0
  - Validates input; raises a clear error for invalid amounts.
- Line 9: @balance += amount
  - Increases the balance.
- Line 11: def withdraw(amount)
  - Public method to remove funds.
- Line 12: raise ArgumentError, "amount must be positive" if amount <= 0
  - Input validation.
- Line 13: raise "Insufficient funds" if amount > @balance
  - Checks for sufficient funds before withdrawal.
- Line 14: @balance -= amount
  - Decreases the balance.
- Line 16: private
  - All methods defined after this are private to the class.
- Line 18: def positive_amount?(amount)
  - Private helper for validation (not exposed publicly).
- Line 19: amount > 0
  - Returns true if amount is positive.
- Line 22: acct = BankAccount.new(100)
  - Creates an account with 100 units.
- Line 23: acct.deposit(50)
  - Deposits 50.
- Lines 24-28: begin ... rescue ... end
  - Attempts to withdraw more than available and handles the error gracefully.
- Line 29: puts acct.balance
  - Outputs the final balance.

## 3. Class vs Instance Methods, Accessors and Attribute Handling

Understanding the difference between class methods and instance methods, plus when to use class variables, instance variables, and accessors, is critical for modeling shared vs per-object state correctly.

```ruby
class Counter
  @@total_created = 0

  def initialize
    @id = object_id
    @@total_created += 1
  end

  def self.total_created
    @@total_created
  end

  def id
    @id
  end
end

class User
  attr_accessor :name

  def initialize(name)
    @name = name
  end

  def greet
    "Hello, I'm #{@name}"
  end
end

# Instance usage
u1 = User.new("Alice")
u2 = User.new("Bob")
puts u1.greet
puts u2.greet
puts "Total users created: #{Counter.total_created}"
```

### Line-by-line explanation breaking down each line
- Line 1: class Counter
  - Defines a class that counts its instances.
- Line 2: @@total_created = 0
  - Class variable shared across all instances to track total creations.
- Line 4: def initialize
  - Instance constructor.
- Line 5: @id = object_id
  - Assigns a unique per-instance id.
- Line 6: @@total_created += 1
  - Increments the global creation counter.
- Line 9: def self.total_created
  - Defines a class method to query the total count.
- Line 10: @@total_created
  - Returns the shared total.
- Line 13: def id
  - Instance method to access the per-object id.
- Line 14: @id
  - Returns the object id.
- Line 17: class User
  - Defines another class to illustrate instance state vs class state.
- Line 18: attr_accessor :name
  - Automatically creates both reader and writer methods for @name.
- Line 20: def initialize(name)
  - Constructor with a name parameter.
- Line 21: @name = name
  - Stores the name in an instance variable.
- Line 23: def greet
  - Instance method that returns a greeting.
- Line 24: "Hello, I'm #{@name}"
  - Greeting string using the instance's name.
- Line 28-29: u1, u2 creation and method calls
  - Demonstrates independent state per instance and shared class-level counter.

## 4. Inheritance and Modules/Mixins

Inheritance lets you share behavior and establish an “is-a” relationship, while modules and mixins add reusable functionality without inheritance. Ruby supports both for clean, reusable designs.

```ruby
class Animal
  def speak
    raise NotImplementedError, "Subclasses must implement speak"
  end
end

class Dog < Animal
  def speak
    "Bark!"
  end
end

module Describable
  def describe
    "This is a #{self.class}"
  end
end

class Cat < Animal
  include Describable

  def speak
    "Meow"
  end
end

dog = Dog.new
cat = Cat.new
puts dog.speak
puts cat.describe
```

### Line-by-line explanation breaking down each line
- Line 1: class Animal
  - Base class to define a common interface.
- Line 2: def speak
  - Abstract method meant to be overridden by subclasses.
- Line 3: raise NotImplementedError, "Subclasses must implement speak"
  - Enforces implementation in derived classes.
- Line 7: class Dog < Animal
  - Dog inherits from Animal, gaining its interface.
- Line 8: def speak
  - Dog-specific implementation.
- Line 9: "Bark!"
  - Dog’s sound.
- Line 12: module Describable
  - A module that can be mixed into classes to add behavior.
- Line 13: def describe
  - Instance method provided by the mixin.
- Line 14: "This is a #{self.class}"
  - Describes the concrete class of the object.
- Line 17: class Cat < Animal
  - Cat inherits from Animal.
- Line 18: include Describable
  - Mixes in Describable’s behavior.
- Line 20: def speak
  - Cat’s own speak implementation.
- Line 21: "Meow"
  - Cat’s sound.
- Line 25-26: dog, cat creation and outputs
  - Demonstrates inherited behavior and mixin-provided behavior.

## 5. Polymorphism and Duck Typing

Ruby emphasizes duck typing: an object's suitability is determined by its methods and behavior, not its lineage. If it behaves like a duck, treat it as a duck.

```ruby
class Painter
  def render
    "Painting on canvas"
  end
end

class Programmer
  def render
    "Writing code"
  end
end

def display(obj)
  if obj.respond_to?(:render)
    puts obj.render
  else
    raise "Object cannot be rendered"
  end
end

display(Painter.new)
display(Programmer.new)

# Example of duck typing: no shared superclass required
class Widget
  def render
    "Rendering widget"
  end
end
w = Widget.new
puts w.render
```

### Line-by-line explanation breaking down each line
- Line 1: class Painter
  - Defines a class with a render capability.
- Line 2: def render
  - Instance method to render something.
- Line 3: "Painting on canvas"
  - Returns a simple rendering description.
- Line 6: class Programmer
  - Another class that also provides render.
- Line 7: def render
  - Programmer’s render method.
- Line 8: "Writing code"
  - Returns a code-related rendering description.
- Line 11: def display(obj)
  - Accepts any object and attempts to render it.
- Line 12: if obj.respond_to?(:render)
  - Checks if the method exists (duck typing guard).
- Line 13: puts obj.render
  - Calls render on the object.
- Line 15: else raise "Object cannot be rendered"
  - Defensive error if the method isn’t present.
- Line 20-21: display(Painter.new) and display(Programmer.new)
  - Demonstrates polymorphic behavior via the same interface.
- Line 25: class Widget
  - A third example without inheritance.
- Line 26: def render
  - Provides a render method to satisfy duck typing.
- Line 27: "Rendering widget"
  - Result string.
- Line 28-29: w.render
  - Executes the render method on the widget.

## 6. Error Handling and Basic Exceptions

Error handling is essential in backend systems to fail gracefully and to provide meaningful feedback. Ruby’s exception system makes it straightforward to raise, rescue, and propagate errors.

```ruby
class ValidationError < StandardError; end

def create_user(name, email)
  raise ValidationError, "Name must not be empty" if name.nil? || name.strip.empty?
  raise ValidationError, "Email must include @" unless email.include?("@")

  { name: name, email: email }
end

begin
  user = create_user("", "bademail")
rescue ValidationError => e
  puts "Validation failed: #{e.message}"
end
```

### Line-by-line explanation breaking down each line
- Line 1: class ValidationError < StandardError; end
  - Defines a custom exception type for validation failures.
- Line 3: def create_user(name, email)
  - Starts a function that validates user data.
- Line 4: raise ValidationError, "Name must not be empty" if name.nil? || name.strip.empty?
  - Validates presence of name and raises a descriptive error.
- Line 5: raise ValidationError, "Email must include @" unless email.include?("@")
  - Validates a basic email format cue and raises on failure.
- Line 7: { name: name, email: email }
  - Returns a simple hash representing the user.
- Line 10: begin
  - Starts an exception-handling block.
- Line 11: user = create_user("", "bademail")
  - Calls the function with invalid inputs to trigger errors.
- Line 12-14: rescue ValidationError => e; puts ...
  - Catches the exception and prints a friendly message.
  
## 7. Composition and Single Responsibility

Composition favors building complex behavior by combining simpler objects, avoiding deep inheritance trees. This section shows how to compose behavior with separate responsibilities.

```ruby
class EmailSender
  def send_email(to:, subject:, body:)
    # In a real system this would integrate with SMTP/service
    "Email sent to #{to}: [#{subject}] #{body}"
  end
end

class UserNotifier
  def initialize(email_sender)
    @email_sender = email_sender
  end

  def welcome(user)
    subject = "Welcome, #{user.name}!"
    body = "Hi #{user.name}, thank you for joining."
    @email_sender.send_email(to: user.email, subject: subject, body: body)
  end
end

class Customer
  attr_reader :name, :email
  def initialize(name, email)
    @name = name
    @email = email
  end
end

emailer = EmailSender.new
notifier = UserNotifier.new(emailer)
customer = Customer.new("Eli", "eli@example.com")
puts notifier.welcome(customer)
```

### Line-by-line explanation breaking down each line
- Line 1: class EmailSender
  - A small service responsible for sending emails.
- Line 2: def send_email(to:, subject:, body:)
  - Defines a parameterized method for email delivery.
- Line 3: # In a real system this would integrate with SMTP/service
  - Comment describing real-world usage.
- Line 4: "Email sent to #{to}: [#{subject}] #{body}"
  - Simulated result string representing the action.
- Line 7: class UserNotifier
  - A higher-level component responsible for user-focused notifications.
- Line 8: def initialize(email_sender)
  - Dependency injection of EmailSender.
- Line 9: @email_sender = email_sender
  - Stores the injected dependency.
- Line 12: def welcome(user)
  - Builds a welcome message for a user.
- Line 13: subject = "Welcome, #{user.name}!"
- Line 14: body = "Hi #{user.name}, thank you for joining."
- Line 15: @email_sender.send_email(...)
  - Delegates the actual sending to the injected EmailSender.
- Line 18: class Customer
  - A simple domain object to represent a customer.
- Line 19: attr_reader :name, :email
  - Exposes name and email as read-only attributes.
- Line 20: def initialize(name, email)
  - Constructor for Customer.
- Line 21: @name = name; @email = email
  - Stores customer details.
- Line 25-26: emailer and notifier usage; customer welcome
  - Demonstrates composition: the notifier uses a separate EmailSender to fulfill its role.

# X. Common Beginner Mistakes

- Pitfall 1: Global state and class variables for per-instance data
  Bad:
  ```ruby
  class User
    @@name = nil
    def initialize(name)
      @@name = name
    end
    def name
      @@name
    end
  end
  ```
  Good:
  ```ruby
  class User
    def initialize(name)
      @name = name
    end
    def name
      @name
    end
  end
  ```
  Explanation: Class variables share state across all instances, causing cross-talk between instances. Use instance variables for per-object data and accessors to expose them.

- Pitfall 2: Exposing internal state with attr_accessor
  Bad:
  ```ruby
  class BankAccount
    attr_accessor :balance
  end
  ```
  Good:
  ```ruby
  class BankAccount
    attr_reader :balance
    def deposit(amount)
      @balance = (@balance || 0) + amount
    end
    def withdraw(amount)
      @balance -= amount if amount <= @balance
    end
  end
  ```
  Explanation: Exposing mutable internal state can lead to invariants being broken. Provide controlled mutation methods and keep direct access to state private when possible.

- Pitfall 3: Inheritance for code reuse when composition is better
  Bad:
  ```ruby
  class Logger
    def log(message); puts message; end
  end

  class User < Logger
    def initialize(name); @name = name; end
  end
  ```
  Good:
  ```ruby
  class Logger
    def log(message); puts message; end
  end

  class User
    def initialize(name, logger)
      @name = name
      @logger = logger
    end
    def welcome
      @logger.log("Welcome, #{@name}")
    end
  end
  ```
  Explanation: Subclassing for shared behavior can create rigid hierarchies. Prefer composition (injecting a logger) to compose behavior at runtime and improve testability.

- Pitfall 4: Not validating inputs or relying on nil values
  Bad:
  ```ruby
  class EmailSender
    def send(to, subject, body)
      # assumes non-nil
      puts "Sending to #{to}: #{subject}"
    end
  end
  ```
  Good:
  ```ruby
  class EmailSender
    def send_email(to:, subject:, body:)
      raise ArgumentError, "to must be provided" if to.nil? || to.empty?
      puts "Sending to #{to}: #{subject}"
    end
  end
  ```
  Explanation: Defensive validation guards against runtime errors and provides clearer failure modes.

# Y. Why This Matters In Real Systems

- Robust modeling: Ruby’s OOP features let you express domain concepts directly (e.g., User, Account, Order) and map them to database entities or service interfaces in Rails or microservices.
- Maintainability: Clear boundaries between classes and responsibilities make refactors safer, easier to test, and less error-prone when teams scale.
- Reusability: Modules and mixins reduce duplication and enable horizontal sharing of behavior across unrelated classes.
- Testability: PORO (Plain Old Ruby Objects) design and dependency injection (e.g., injecting a Logger) enable isolated unit tests without requiring the full Rails stack.
- Real-world patterns: Service objects, presenters, and concerns are natural extensions of these foundations and are widely used in production Rails apps and Ruby-based services.

# Z. Study Questions

1) What is the difference between a class method and an instance method in Ruby? How do you define each?
2) Why is encapsulation important in backend design, and how do accessors help enforce it in Ruby?
3) How does duck typing differ from classical inheritance, and why is it common in Ruby?
4) What are the benefits of composition over inheritance in a real system?
5) How would you use exceptions to handle validation errors in a domain model?

# Exercise

Part A — Build a small domain with OOP basics
- Task: Implement a minimal domain for a simple library system using Ruby objects.
- Requirements:
  - Class Book with attributes title, author, and available (boolean). Methods: checkout and return_book to toggle availability.
  - Class Patron with name.
  - Class Library with:
    - A collection of books
    - A collection of patrons
    - Methods: add_book(book), register_patron(patron), loan_book(title, patron) which loans a book to a patron if available and returns true; returns false if the book is not available.
- Starter code (fill in the missing parts):

```ruby
# Starter code: fill in Book, Patron, and Library with the described behavior

class Book
  # TODO: implement initializer, accessors, and checkout/return_book
end

class Patron
  # TODO: implement initializer
end

class Library
  # TODO: implement initialization, add_book, register_patron, and loan_book
end

# Example usage (you can run this after implementing):
library = Library.new
book = Book.new("The Pragmatic Programmer", "Andrew Hunt")
patron = Patron.new("Alex")
library.add_book(book)
library.register_patron(patron)
puts library.loan_book("The Pragmatic Programmer", patron) # => true
puts book.available # => false
```

Part B — Extend with a tiny service object
- Task: Create a small service object that notifies a patron when a book is loaned.
- Requirements:
  - Class EmailSender with a method send_email(to:, subject:, body:)
  - Class LoanNotifier initialized with an EmailSender, method notify(patron, book)
  - Modify Library.loan_book to return the loaned book and call LoanNotifier#notify when a loan occurs.

Optional hints:
- Keep the code simple and focused on OOP concepts: clear responsibilities, simple state, and small, testable units.
- Think about how you would run this in a tiny Ruby script or as part of a Rails-like layer without requiring Rails.

End of lesson.