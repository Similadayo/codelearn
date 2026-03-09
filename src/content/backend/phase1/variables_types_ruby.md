# Track: Backend Engineering — Phase 1: Language Foundations — Variables, Data Types & Operators (Ruby)

Welcome to the foundational lesson on Variables, Data Types, and Operators in Ruby. This topic sits at the heart of every backend service: variables store state, data types define how we interpret and manipulate information, and operators enable the logic that powers APIs, data processing, and business rules. Mastery here reduces bugs, improves readability, and makes it easier to reason about performance and correctness in production systems.

## 1. Variables in Ruby

Ruby uses several kinds of variables and naming conventions to manage scope, mutability, and lifetime. Understanding local variables, instance variables, class variables, and constants helps you model domain objects, manage configuration, and maintain clean, testable code in services, workers, and microservices.

```ruby
# Local variable (scoped to the current block, method, or file)
greeting = "Hello"

# Constant (uppercase; generally immutable by convention)
API_VERSION = "v1"

# Instance variable (per object; accessible across instance methods)
class User
  def initialize(name)
    @name = name
  end

  def name
    @name
  end
end

# Class variable (shared across all instances of a class)
class Counter
  @@count = 0

  def initialize
    @@count += 1
  end

  def self.count
    @@count
  end
end

# Demonstration usage
u = User.new("Alice")
puts u.name          # => "Alice"
puts API_VERSION     # => "v1"

Counter.new
Counter.new
puts Counter.count   # => 2
```

### Line-by-line explanation
- 1: Defines a local variable greeting with the string "Hello".
- 4: Declares a constant API_VERSION with value "v1".
- 7-12: Defines a class User with an initialize method that assigns the parameter to an instance variable @name.
- 14-16: Defines a method name that returns the instance variable @name.
- 19-23: Defines a class Counter with a class variable @@count to track how many instances exist.
- 25-27: The initialize method increments the shared @@count for each new instance.
- 29-31: A class method count returns the current value of @@count.
- 34-36: Demonstrates creating a User and printing the name and API_VERSION.
- 38-39: Creates two Counter instances and prints the total count, showing shared state across instances.

## 2. Data Types, Truthiness, and Basic Conversions

Ruby is dynamically typed. Variables can hold values of any type, and types can change over time. Knowing primitive and composite types, how to test for nil or truthiness, and how to convert between types is essential when validating inputs, parsing API payloads, and composing responses in backend applications.

```ruby
# Primitive types
num   = 42
flt   = 3.14159
flag  = true
flag2 = false
text  = "Ruby"

# Nil and truthiness
maybe = nil

# Composite types
arr  = [1, 2, 3, "four"]
hash = { name: "Ruby", year: 1995 }

# Symbols (immutable, often used as keys)
sym = :name

# Type conversions
n        = "123".to_i      # 123
f        = "3.14".to_f     # 3.14
s        = 42.to_s          # "42"
to_pairs = hash.to_a        # [[:name, "Ruby"], [:year, 1995]]

# Truthiness quick note
empty = ""
if empty
  puts "In Ruby, an empty string is truthy!"
end
```

### Line-by-line explanation
- 4-9: Declares several primitive types: integer, float, booleans, and a string.
- 12: Demonstrates nil, which is a distinct falsey value in Ruby.
- 15-16: Demonstrates an array containing numbers and a string; shows a typical composite data structure.
- 17-18: Demonstrates a hash with symbol keys.
- 21: Introduces a symbol, a lightweight immutable identifier often used as hash keys.
- 24-27: Converts string digits to integer, string to float, an integer to string, and converts a hash to an array of key-value pairs.
- 30-34: Shows Ruby’s truthiness behavior: even an empty string is treated as true in an if condition.

## 3. Operators: Arithmetic, Comparisons, Logic, and Strings

Operators power computation, conditional logic, and data transformation. Ruby offers in-place operators, rich numeric methods, and expressive string handling via interpolation and concatenation—tools you’ll use in nearly every backend feature, from data pipelines to API controllers.

```ruby
# Arithmetic
a = 7
b = 3
sum  = a + b
diff = a - b
prod = a * b
div  = a / b         # integer division: 2
mod  = a % b
pow  = a ** b         # 7 ** 3 => 343
div_float = a.fdiv(b) # 2.333333...

# In-place modification
a += b                 # a becomes 10

# Comparisons
cmp1 = (a > b)         # true
cmp2 = (a == 10)        # true
cmp3 = (a <= 5)         # false
spaceship = (a <=> b)   # 1 (a is greater than b)

# Logical operators
t = true
f = false
and_res = t && f         # false
or_res  = t || f         # true
not_res = !t              # false

# String operations
name = "Ruby"
interpolated = "Hello, #{name}"  # "Hello, Ruby"
concatenated = "Hello, " + name

# Division nuances
div_ref = 7 / 3            # => 2 (integer division)
div_float = 7.fdiv(3)     # => 2.333333...
```

### Line-by-line explanation
- 4-9: Basic arithmetic with two numbers and results for sum, difference, product, and integer division.
- 10-11: Demonstrates floating-point division using fdiv for non-integer results.
- 14: In-place modification using +=, changing a’s value.
- 17-19: Boolean comparisons to produce true/false results.
- 20-22: The spaceship operator <=> returns -1, 0, or 1 depending on the comparison.
- 25-29: Logical operations using AND/OR/NOT with true and false.
- 32-33: String interpolation embeds variables into a string; 34 shows simple string concatenation.
- 37-39: Demonstrates the difference between integer division and floating-point division.

## 4. Common Beginner Mistakes

### 4.1 Global state and shared mutable data
Bad:
```ruby
# BAD: Pollutes global state
$counter = 0
def bad_increment
  $counter += 1
end
```

Good:
```ruby
class Counter
  def initialize
    @count = 0
  end

  def increment
    @count += 1
  end

  def value
    @count
  end
end
```

### 4.2 Assuming empty strings are falsey
Bad:
```ruby
str = ""
if str
  puts "This runs, even though the string is empty"
end
```

Good:
```ruby
str = ""
if !str.empty?
  puts "Non-empty string encountered"
else
  puts "String is empty"
end
```

### 4.3 Floating point equality traps
Bad:
```ruby
result = (0.1 + 0.2) == 0.3
```

Good:
```ruby
target = 0.3
result = (0.1 + 0.2 - target).abs < 1e-12
```

### Line-by-line explanation (each pitfall)
- 1-7 (Global state): The bad example uses a global variable which is accessible and mutable from anywhere, making reasoning and testing hard. The good example encapsulates state inside a class instance, improving testability and avoiding side effects.
- 9-15 (Truthiness): The bad example relies on a common misconception that an empty string is falsey. Ruby treats empty strings as truthy, which leads to logic errors. The good example checks emptiness explicitly.
- 17-23 (Floating-point equality): The bad example compares two floating-point sums directly, which can fail due to precision. The good example uses a small tolerance to determine near-equality.

## 5. Why This Matters In Real Systems

In production Ruby backends, you’ll see a lot of data flow through variables, types, and operators. Correct variable scoping prevents leaks across requests, classes, and threads. Clear data types help validators, serializers, and database mappers behave predictably, reducing runtime errors and bugs that are hard to trace in production logs. Robust operator usage underpins business logic, financial calculations, and rule engines—areas where precision and correctness matter most. Practically, mastering these fundamentals translates to safer API contracts, more maintainable codebases, and faster bug isolation during incidents.

Key takeaways for real systems:
- Prefer local and well-scoped variables; minimize reliance on global state.
- Use explicit type conversions when receiving external input; avoid implicit coercion surprises.
- Implement precise numeric comparisons with tolerance when dealing with floats.
- Leverage Ruby’s expressive strings and interpolation to reduce errors in message formatting and API payloads.
- Write small, testable units that exercise data types and operator behavior to catch regressions early.

## 6. Study Questions

1) What is the difference between a local variable, an instance variable, a class variable, and a constant in Ruby? Provide examples.
2) In Ruby, which values are considered false in a conditional?
3) What is the result of 7 / 3 in Ruby? How can you produce a floating-point result instead?
4) Explain the difference between to_i, to_f, and to_s with examples.
5) How does string interpolation work in Ruby? Provide an example that includes a variable and an expression.

## Exercise

Part A — Basic variable usage and arithmetic
- Create a Ruby script that defines price = 19.99 and quantity = 4. Compute total = price * quantity and print a formatted receipt line like "Total: $79.96".

Part B — Basic data structures and aggregation
- Given an array numbers = [5, 1, 8, 3, 7], print the maximum, minimum, sum, and average (as a float). Show the average with two decimal places.

Part C — Simple calculator with operators
- Implement a method calculate(a, op, b) that supports "+", "-", "*", "/", "**" and returns the result. If the operator is unsupported, raise a helpful error. Demonstrate with examples: 2 + 3, 4 ** 2, 7 / 3, and 10 - 4.

Part D — Type conversions and string interpolation
- Convert the strings "42" and "3.14" to integer and float, respectively. Build and print a sentence using string interpolation: "The value 42 as int and 3.14 as float are: 42 and 3.14."

Part E — End-to-end small script
- Write a single Ruby script that:
  - Defines an array of product prices as strings, e.g., ["9.99", "5.50", "12.00"].
  - Converts them to floats, computes the total, and prints: "Cart total: $<total> (computed from <n> items)" with two decimals.
  - Demonstrates a final message built with string interpolation, including a calculation using the previously defined calculate method.

Code block for Exercise (comprehensive example):

```ruby
# Exercise: Variables, Data Types & Operators (Ruby) - End-to-end

# Part A: Basic variables and arithmetic
price = 19.99
quantity = 4
total = price * quantity
puts "Cart item total: $#{'%.2f' % total}"

# Part B: Array operations
numbers = [5, 1, 8, 3, 7]
max_num = numbers.max
min_num = numbers.min
sum_num = numbers.sum
avg_num = sum_num.to_f / numbers.size
puts "Max: #{max_num}, Min: #{min_num}, Sum: #{sum_num}, Avg: #{'%.2f' % avg_num}"

# Part C: Calculator function
def calculate(a, op, b)
  case op
  when '+'
    a + b
  when '-'
    a - b
  when '*'
    a * b
  when '/'
    a / b
  when '**'
    a ** b
  else
    raise ArgumentError, "Unsupported operator: #{op}"
  end
end

puts "2 + 3 = #{calculate(2, '+', 3)}"
puts "4 ** 2 = #{calculate(4, '**', 2)}"
puts "7 / 3 = #{calculate(7, '/', 3)}"

# Part D: Type conversions and string interpolation
str_num = "42"
str_float = "3.14"
puts "to_i: #{str_num.to_i}, to_f: #{str_float.to_f}"
puts "Hello, #{'Ruby'}! The value #{str_num} is now #{str_num.to_i} as an int."

# Part E: End-to-end cart total with string formatting
prices = ["9.99", "5.50", "12.00"]
floats = prices.map { |p| p.to_f }
item_total = floats.sum
puts "Cart total: $#{'%.2f' % item_total} (from #{prices.size} items)"
```

### Line-by-line explanation
- Part A: Calculates and prints the total price for a single line-item cart using basic arithmetic and formatted output.
- Part B: Demonstrates common collection operations: max, min, sum, and average (as a float), then prints them with formatting.
- Part C: Implements a small calculator using a case statement; covers basic operators and error handling for unsupported operators.
- Part D: Converts string representations of numbers to numeric types and demonstrates string interpolation with variables and expressions.
- Part E: Converts a list of string prices to floats, sums them, and prints a formatted cart total, illustrating end-to-end data flow from input strings to a formatted output.

End of lesson. If you’d like, I can tailor the exercise to a specific Ruby version, add tests with a tiny assertion helper, or extend the calculator to support unary operators and error handling for division by zero.