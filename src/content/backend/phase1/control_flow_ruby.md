# Track: Backend Engineering

Control flow is the backbone of dynamic decision making in software. In backend systems, you routinely evaluate conditions, route requests, validate input, implement business rules, and loop over data collections. Mastery of conditionals and loops in Ruby is foundational for building robust, readable, and maintainable services—from input validation to batch processing and rule engines. This lesson guides you through the essential patterns, idioms, and gotchas you’ll rely on in real-world Ruby projects.

## 1. Conditionals: if/elsif/else in Ruby

Code examples demonstrate how to branch logic based on comparisons, presence of values, and complex predicates.

```ruby
x = 7
if x > 10
  puts "x is large"
elsif x == 10
  puts "x is exactly 10"
else
  puts "x is small"
end
```

### Line-by-line explanation
- Line 1: Assigns the integer 7 to the variable x.
- Line 2: Begins an if block checking whether x > 10.
- Line 3: Executes if the condition x > 10 is true; prints "x is large".
- Line 4: Begins an elsif block that is evaluated if the first condition is false.
- Line 5: Executes if x == 10; prints "x is exactly 10".
- Line 6: The else block; executes if none of the previous conditions were true.
- Line 7: Prints "x is small" when x is neither >10 nor ==10.
- Line 8: Ends the if/elsif/else block.
```

## 2. The Ternary Operator and Unless

Compact conditional expressions and guarded logic help reduce boilerplate and clarify intent.

```ruby
user_signed_in = true
status = user_signed_in ? "logged in" : "guest"
puts "Status: #{status}"
```

```ruby
grade = 75
unless grade >= 60
  puts "Fail"
else
  puts "Pass"
end
```

### Line-by-line explanation
- First block:
  - Line 1: Sets a boolean flag indicating the user is signed in.
  - Line 2: Uses the ternary operator to choose between two strings based on the flag.
  - Line 3: Interpolates and prints the resulting status.
- Second block:
  - Line 1: Assigns a numeric grade.
  - Line 2: Begins an unless block; executes the body unless the condition is true.
  - Line 3: Prints "Fail" if grade is below 60.
  - Line 4: Else branch prints "Pass" if grade is 60 or higher.
  - Line 5: Ends the unless/else block.

## 3. Case statements for multi-way branching

Case statements are often clearer than long chains of elsif when you have a single value with many possible branches.

```ruby
order_status = "processing"
case order_status
when "pending"
  puts "Order is pending"
when "paid"
  puts "Order is paid"
when "shipped"
  puts "Order shipped"
else
  puts "Unknown status"
end
```

### Line-by-line explanation
- Line 1: Sets order_status to "processing".
- Line 2: Begins a case statement using order_status as the target.
- Line 3: When order_status matches "pending", prints the corresponding message.
- Line 4: When order_status matches "paid", prints the corresponding message.
- Line 5: When order_status matches "shipped", prints the corresponding message.
- Line 6: Else branch for any unrecognized status.
- Line 7: Ends the case statement.

## 4. Loops: while and until

Loops let you repeat work while a condition holds or until a condition becomes true.

```ruby
# while loop
count = 0
while count < 5
  puts "count = #{count}"
  count += 1
end
```

```ruby
# until loop
i = 0
until i >= 5
  puts "i = #{i}"
  i += 1
end
```

### Line-by-line explanation
- While loop:
  - Line 1: Initializes a counter.
  - Line 2: Begins a while loop that continues while count < 5.
  - Line 3: Prints the current count.
  - Line 4: Increments count.
  - Line 5: Ends the loop when the condition becomes false.
- Until loop:
  - Line 1: Initializes i.
  - Line 2: Begins an until loop that runs until i >= 5 (i.e., while i < 5).
  - Line 3: Prints the current i.
  - Line 4: Increments i.
  - Line 5: Ends the loop once i reaches 5 or more.

## 5. Iterators and simple functional loops

Ruby’s enumerable methods are idiomatic for processing collections and ranges without explicit index management.

```ruby
5.times do |i|
  puts "Iteration #{i}"
end

(1..5).each do |n|
  puts "Number #{n}"
end
```

### Line-by-line explanation
- First block:
  - Line 1: Invokes the Integer 5.times method, which yields 0..4 to the block.
  - Line 2: Prints the current iteration index.
- Second block:
  - Line 1: Creates a range 1..5 and calls each to iterate over 1,2,3,4,5.
  - Line 2: Prints the current number in the sequence.
  - Line 3: Ends the each block.

## 6. Break, Next, and loop/do constructs

Control exact flow inside deeply nested or long-running loops.

```ruby
i = 0
loop do
  i += 1
  break if i > 5
  next if i.even?
  puts "Odd: #{i}"
end
```

### Line-by-line explanation
- Line 1: Initializes i to 0.
- Line 2: Begins an infinite loop with loop do.
- Line 3: Increments i on every iteration.
- Line 4: Breaks out of the loop when i exceeds 5.
- Line 5: Skips the rest of the current iteration if i is even.
- Line 6: Prints the odd value of i.
- Line 7: Ends the loop.

## X. Common Beginner Mistakes

Illustrative pitfalls with bad vs good code side-by-side to highlight safer patterns.

- Pitfall 1: Assuming 0 is false in Ruby

Bad:
```ruby
def truthy?(val)
  if val
    "truthy"
  else
    "falsy"
  end
end

truthy?(0) # => "truthy"
```

Good:
```ruby
def truthy?(val)
  !val.nil? && val != 0
end

truthy?(0) # => false
truthy?(5) # => true
```

- Pitfall 2: Complex unless conditions reduce readability

Bad:
```ruby
unless user && user.active? && user.valid?
  redirect_to_login
end
```

Good:
```ruby
if user.nil? || !user.active? || !user.valid?
  redirect_to_login
end
```

- Pitfall 3: Mutating a collection while iterating

Bad:
```ruby
arr = [1, 2, 3]
arr.each { |x| arr << x * 2 } # dangerous: modifies during iteration
```

Good:
```ruby
arr = [1, 2, 3]
new_vals = arr.map { |x| x * 2 }
# or if you need to filter/collect conditionally:
filtered = arr.select { |x| x.odd? }
```

- Pitfall 4: Doing heavy work in loops instead of pre-collecting

Bad:
```ruby
results = []
(1..1_000_000).each do |n|
  results << expensive_operation(n) if n.even?
end
```

Good:
```ruby
evens = (1..1_000_000).select(&:even?)
results = evens.map { |n| expensive_operation(n) }
```

## Y. Why This Matters In Real Systems

Control flow choices directly impact correctness, performance, and maintainability in production systems.

- Correctness and domain rules: Business logic often relies on precise conditionals (e.g., pricing rules, access control). Clear, well-scoped conditionals reduce bugs.
- Readability and maintainability: Nested if/elsif chains become hard to reason about. Case statements, guard clauses, and concise loops improve comprehension for future maintainers.
- Performance considerations: Avoid expensive work inside loops, and prefer enumerators over manual index-based loops when possible. Beware N+1-like patterns when iterating over data that triggers repeated fetches (e.g., database calls in a loop).
- Error handling and resilience: Using early returns (guard clauses) and explicit nil checks reduces the chance of exceptions propagating unexpectedly.
- Real-world patterns: Branching by user state, destination, or input shape is extremely common in APIs, background jobs, and batch processes. Idiomatic Ruby patterns help keep such logic robust under change.

## Z. Study Questions

1. When would you use a case statement instead of a long if/elsif/else chain?  
2. How does Ruby treat 0, nil, and false in a boolean context?  
3. What is the difference between while and until loops? Provide an example where each is appropriate.  
4. What does the next keyword do inside a loop?  
5. How can you avoid mutating a collection while iterating over it?

## Exercise

Part A: Implement basic classification, shipping, and discount helpers

Task: Create a small Ruby module (or a single class) that exposes three static methods and a tiny driver to demonstrate usage. You should not rely on external gems.

- Method 1: classify_number(n) -> :negative, :zero, or :positive
- Method 2: shipping_cost(destination, weight) -> numeric cost
  - destination can be :domestic or :international
  - base cost = 5.0
  - rate per unit weight: domestic 1.0, international 2.0
  - total shipping = base + rate * weight
- Method 3: apply_discounts(subtotal, promos) -> numeric total
  - promos is an array of hashes, each with:
    - type: :percentage or :flat
    - value: for :percentage, a decimal like 0.1 for 10%; for :flat, a currency amount
  - apply each promotion in sequence; never go below zero

- Driver: Create a sample order object and print the computed shipping, discounts, and final total.

Starter code (fill in the missing implementations)

```ruby
# Part 1: Classify numbers, shipping, and discounts
class ControlFlowChallenge
  def self.classify_number(n)
    # TODO: return :negative, :zero, or :positive
  end

  def self.shipping_cost(destination, weight)
    # TODO: implement as described above
  end

  def self.apply_discounts(subtotal, promos)
    # TODO: implement sequentially applying promos
  end

  def self.compute_order_total(order)
    # order is a hash with keys:
    #  :subtotal (numeric)
    #  :destination (:domestic or :international)
    #  :weight (numeric)
    #  :promos (array of promo hashes)
    #
    # Use the above methods to compute:
    #  - shipping = shipping_cost(order[:destination], order[:weight])
    #  - new_subtotal = order[:subtotal] + shipping
    #  - final_total = apply_discounts(new_subtotal, order[:promos])
    #  - return { shipping:, final_total: }
  end
end

# Driver: an example order
order = {
  subtotal: 100.0,
  destination: :domestic,
  weight: 2.0,
  promos: [
    { type: :percentage, value: 0.10 }, # 10% off
    { type: :flat, value: 5.0 }          # $5 off
  ]
}

shipping = ControlFlowChallenge.shipping_cost(order[:destination], order[:weight])
new_subtotal = order[:subtotal] + shipping
final_total = ControlFlowChallenge.apply_discounts(new_subtotal, order[:promos])

puts "Shipping: #{'%.2f' % shipping}"
puts "Subtotal with shipping: #{'%.2f' % new_subtotal}"
puts "Final total after discounts: #{'%.2f' % final_total}"
```

Expected outcomes (example values):
- shipping_cost(:domestic, 2.0) -> 7.0 (base 5.0 + 2.0 * 1.0)
- new_subtotal -> 107.0
- final_total -> 107.0 - 10% + (-5) = 96.0 (but apply in sequence; 107.0 * 0.10 = 10.7; 107.0 - 10.7 = 96.3; then -5.0 = 91.3; or if you apply flat after percentage, final = 96.3)
Note: The exact numeric result depends on the interpretation of the “sequence” of applying promotions. The prompt asks you to apply promotions in sequence; your implementation should reflect that.

How to proceed:
- Implement the three methods in ControlFlowChallenge as described.
- Run the provided driver code to validate output.
- Try modifying order data (destination, weight, promos) to observe how control flow patterns affect the final result.

Tips:
- Keep your implementations small and explicit; emphasize readability.
- Write small tests in your head or by tweaking the driver to verify edge cases (e.g., zero weight, both promos that push the total below zero).
- Consider edge cases such as nils or empty promos arrays and decide how you want to handle them (e.g., default to no discount).