# Track: Backend Engineering — Phase 1: Language Foundations — Functions, Scope & Closures (Ruby)

Ruby gives you powerful, expressive tools for defining behavior, managing scope, and composing functions through blocks, Procs, and Lambdas. Mastery of functions and closures is essential for building modular APIs, clean abstractions, and safe, maintainable code in real systems. This lesson walks you through definitions, scope rules, closures, and practical patterns you’ll use in Ruby-backed services, from small utilities to robust pipelines.

## 1. Ruby Methods: Definition, Parameters, Return

In Ruby, methods define reusable behavior. They can take positional arguments, default values, and keyword arguments. Ruby uses implicit returns (the last evaluated expression is returned) but you can also use explicit return when you need early exits.

```ruby
# Basic method with positional args (implicit return)
def add(a, b)
  a + b
end

# Explicit return (not required here, but shows early exit)
def divide(a, b)
  return nil if b == 0
  return a / b
end

# Method with defaults and a keyword argument
def greet(name, greeting = "Hello", punctuation: "!")
  "#{greeting}, #{name}#{punctuation}"
end

# Keyword-only arguments (syntactic flexibility)
def build_url(host:, path:, secure: true)
  scheme = secure ? "https" : "http"
  "#{scheme}://#{host}/#{path}"
end

puts add(2, 3)                       # => 5
puts divide(10, 2)                   # => 5
puts divide(10, 0)                   # => nil
puts greet("Alice")                  # => "Hello, Alice!"
puts greet("Bob", "Hey", punctuation: ".") # => "Hey, Bob."
puts build_url(host: "example.com", path: "home", secure: false) # => "http://example.com/home"
```

### Line-by-line explanation breaking down each line

- def add(a, b): Defines a method named add with two parameters a and b.
- a + b: Returns the sum of a and b (the last evaluated expression in Ruby is returned implicitly).
- end: Ends the method definition.
- def divide(a, b): Defines a method named divide with two parameters.
- return nil if b == 0: Early exit if the divisor is zero.
- return a / b: Returns the quotient (explicit return).
- end: Ends the method definition.
- def greet(name, greeting = "Hello", punctuation: "!"): Defines a method with a default positional argument and a keyword argument.
- "#{greeting}, #{name}#{punctuation}": Builds and returns the string.
- end: Ends the method definition.
- def build_url(host:, path:, secure: true): Defines a method with keyword-only arguments.
- scheme = secure ? "https" : "http": Chooses the scheme based on the secure flag.
- "#{scheme}://#{host}/#{path}": Constructs and returns the URL string.
- end: Ends the method definition.
- puts ...: Print results to demonstrate usage.

## 2. Scope, Blocks, and Closures

Variables in Ruby live in scopes defined by modules/classes, methods, and blocks. Blocks create closures: they capture and remember the surrounding environment (variables) at the moment they’re created. Procs and Lambdas are objects representing blocks with different semantics around arity and returns.

```ruby
# Closure: a function that remembers variables from its defining scope
def make_multiplier(n)
  factor = n
  Proc.new { |x| x * factor }  # Captures 'factor' from outer scope
end

mult2 = make_multiplier(2)
mult3 = make_multiplier(3)

puts mult2.call(10)  # => 20
puts mult3.call(5)   # => 15

# Blocks, Procs, and Lambdas: basic usage and differences
def with_block
  if block_given?
    yield(42)
  else
    "no block"
  end
end

with_block { |v| puts "block received: #{v}" }  # block path
# Block vs Proc vs Lambda examples
block_example = Proc.new { |n| n * 2 }
lambda_example = ->(n) { n * 2 }

puts block_example.call(3)  # => 6
puts lambda_example.call(3) # => 6

# Return behavior differences
def call_procs
  p = Proc.new { return :from_proc }
  p.call
  :after_proc
end

def call_lambda
  l = -> { return :from_lambda }
  l.call
  :after_lambda
end

puts call_procs    # => :from_proc (returns early due to Proc return)
puts call_lambda   # => :after_lambda (lambda return only exits the lambda)
```

### Line-by-line explanation breaking down each line

- def make_multiplier(n): Defines a function that will produce a closure to multiply by a fixed factor.
- factor = n: Stores the multiplier in a local variable captured by the closure.
- Proc.new { |x| x * factor }: Creates a Proc (closure) that uses the captured factor.
- end: End of method.
- mult2 = make_multiplier(2): Creates a closure that multiplies by 2.
- mult3 = make_multiplier(3): Creates a closure that multiplies by 3.
- mult2.call(10): Invokes the closure, outputs 20 (captures factor = 2).
- mult3.call(5): Invokes the closure, outputs 15 (captures factor = 3).
- def with_block: Defines a method that yields to a block if provided.
- if block_given?: Checks if a block was supplied.
- yield(42): Executes the given block, passing 42.
- end: End of method.
- with_block { |v| ... }: Demonstrates using a block.
- block_example = Proc.new { |n| n * 2 }: Creates a Proc object.
- lambda_example = ->(n) { n * 2 }: Creates a lambda (a stricter closure).
- block_example.call(3): Executes the Proc.
- lambda_example.call(3): Executes the lambda.
- def call_procs: Defines a method that demonstrates Proc return behavior.
- p = Proc.new { return :from_proc }: The Proc will return from the enclosing method when called.
- p.call: Executes the Proc, causing early return.
- :after_proc: Unreachable in practice due to early return.
- def call_lambda: Defines a method that demonstrates Lambda return behavior.
- l = -> { return :from_lambda }: The lambda returns only from itself, not the enclosing method.
- l.call: Executes the lambda.
- :after_lambda: Returned by the method after lambda completes.
- puts calls: Print the observed results.

## 3. Procs, Lambdas, and Blocks in Practice

This section clarifies the practical differences between blocks, Procs, and Lambdas, with patterns you’ll use in Ruby apps, including Rails-style code and service layers.

```ruby
# A reusable transformation pipeline using Procs
def pipeline(*fns)
  ->(input) {
    fns.inject(input) { |acc, fn| fn.call(acc) }
  }
end

to_upper = ->(s) { s.upcase }
add_excl = ->(s) { s + "!" }
shout = pipeline(to_upper, add_excl)

puts shout.call("hello")  # => "HELLO!"
```

### Line-by-line explanation breaking down each line

- def pipeline(*fns): Defines a function that takes any number of function objects (Procs/Lambdas).
- ->(input) { ... }: Returns a new lambda that, when called, applies each function in sequence to the input.
- fns.inject(input) { |acc, fn| fn.call(acc) }: Iterates through the functions, feeding the result of one as the input to the next.
- end: End of method.
- to_upper = ->(s) { s.upcase }: A lambda that uppercases a string.
- add_excl = ->(s) { s + "!" }: A lambda that appends an exclamation mark.
- shout = pipeline(to_upper, add_excl): Builds a pipeline of transformations.
- puts shout.call("hello"): Runs the pipeline, prints "HELLO!".

## 4. Common Beginner Mistakes

Pitfalls and clear bad-vs-good examples to help you avoid typical misconceptions.

- Pitfall A: Using a Proc with a return to exit a surrounding method
  Bad:
  ```ruby
  def safe_call
    p = Proc.new { return :early_exit }
    p.call
    :continuing
  end
  puts safe_call   # => :early_exit
  ```
  Good:
  ```ruby
  def safe_call
    l = -> { :still_here }
    l.call
    :continues   # the method continues after lambda return
  end
  puts safe_call   # => :continues
  ```

- Pitfall B: Capturing loop variables in closures leads to all closures seeing the last value
  Bad:
  ```ruby
  closures = []
  3.times do |i|
    closures << -> { i }
  end
  p closures.map(&:call)  # => [2, 2, 2]
  ```
  Good:
  ```ruby
  closures = []
  3.times do |i|
    closures << ->(n = i) { n }
  end
  p closures.map(&:call)  # => [0, 1, 2]
  ```
  Explanation: The first version captures the loop variable by reference; by the time you call the closures, i ends at the last value. The second version captures the value at time of closure creation by using a default argument.

- Pitfall C: Over-reliance on global state in closures
  Bad:
  ```ruby
  $logger = Logger.new(STDOUT)

  def log_bad(msg)
    $logger.info(msg)
  end

  log_bad("hello")
  ```
  Good:
  ```ruby
  class LoggerWrapper
    def initialize(logger)
      @logger = logger
    end

    def info(msg)
      @logger.info(msg)
    end
  end

  real_logger = Logger.new(STDOUT)
  logger = LoggerWrapper.new(real_logger)
  logger.info("hello")
  ```
  Explanation: Globals make code harder to test and thread-unsafe in real systems. Dependency injection and small, explicit interfaces are safer.

- Pitfall D: Assuming the block-local variable behaves the same as a local variable outside a block
  Bad:
  ```ruby
  x = 0
  2.times do |x|
    x += 1
  end
  puts x  # surprising: not always 0
  ```
  Good:
  ```ruby
  x = 0
  2.times do |i|
    x = i
  end
  puts x  # 1
  ```
  Explanation: Block parameters and local scopes can be subtle. Naming the inner block variable differently (e.g., |i|) avoids confusion.

## 5. Why This Matters In Real Systems

- API design and DSLs: Closures enable clean, composable APIs and domain-specific languages. You can build pipelines, memoized helpers, and plugin points that are flexible and testable.
- Concurrency and thread-safety: Ruby closures capture state. If closures persist across requests (e.g., in long-running workers or background jobs), captured state can become a source of memory leaks or race conditions. Design with clear ownership and thread-safety in mind.
- Memory management: Capturing large objects in closures can prevent garbage collection from reclaiming them. Keep closures lean and avoid keeping references to huge data sets unless necessary.
- Rails and service patterns: Controllers and services often rely on blocks, Procs, or lambdas for callbacks, scopes, and middleware. Understanding scope and return semantics helps prevent subtle bugs when composing middleware or callbacks.

## 6. Study Questions

1) What is the difference between a Proc and a Lambda in Ruby regarding how they handle return statements?  
2) How do closures capture variables in Ruby? Provide a short example demonstrating a captured variable persisting across calls.  
3) What happens if you create multiple closures inside a loop that reference the loop variable? How can you fix it?  
4) Explain the difference between positional arguments and keyword arguments in Ruby with a small example.  
5) Describe a real-world scenario where using a pipeline of transformations (as in a pipeline example) is beneficial in a Ruby backend service.

## 7. Exercise — Practical multi-part coding challenge

Part A — Build a Counter Closure
- Task: Create a function make_counter that returns a Proc which, when called, increments and returns an internal count starting at 0.
- Requirements:
  - The returned Proc should accept no arguments.
  - Each call should increment and return the next number.
- Example usage:
  ```ruby
  counter = make_counter
  puts counter.call  # 0
  puts counter.call  # 1
  puts counter.call  # 2
  ```

Part B — Create a Transformation Pipeline
- Task: Implement a function pipeline as shown earlier, but now build a small library around it.
- Requirements:
  - pipeline(*fns) returns a Proc that applies each function in order.
  - The library should support at least two simple transformers (e.g., upcase, reverse) and allow composing them.
- Example usage:
  ```ruby
  to_upper = ->(s) { s.upcase }
  reverse = ->(s) { s.reverse }
  transform = pipeline(to_upper, reverse)
  puts transform.call("ruby") # "CURB"
  ```

Part C — Memoization Wrapper
- Task: Implement a memoize function that takes a unary function (Proc/Lambda) and returns a new function that caches its result for each unique input.
- Requirements:
  - Only cache based on the input value (symmetric to simple memoization).
  - Demonstrate with a pure function (e.g., compute length after a small transformation).
- Example usage:
  ```ruby
  slow_len = ->(s) { sleep 0.1; s.length }
  fast_len = memoize(slow_len)
  puts fast_len.call("hello")  # computes once
  puts fast_len.call("hello")  # returns cached result
  ```

Part D — Optional: Simple Event Emitter (Closure-based)
- Task: Create a mini event system where you can register listeners (as Procs) and emit events by name, invoking all listeners associated with that event.
- Requirements:
  - You should be able to register listeners with add_listener(event_name, listener_proc).
  - Emitting an event should call all listeners for that event in the order they were added.
- Example usage:
  ```ruby
  emitter = Object.new
  def emitter.add_listener(event, fn)
    @listeners ||= Hash.new { |h, k| h[k] = [] }
    @listeners[event] << fn
  end
  def emitter.emit(event, *args)
    (@listeners ||= {})[event]&.each { |fn| fn.call(*args) }
  end

  emitter.add_listener(:greet, ->(name){ puts "Hello, #{name}!" })
  emitter.emit(:greet, "Alice")  # => "Hello, Alice!"
  ```

End of lesson.