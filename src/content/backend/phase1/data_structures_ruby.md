# Track: Backend Engineering — Phase 1: Language Foundations — Data Structures in Ruby

Data structures are the backbone of any backend system. In Ruby, arrays, objects (classes), and maps (hashes) are fundamental building blocks used to model, store, and manipulate data efficiently. This lesson covers how to create, access, modify, and reason about these structures in real-world backend tasks—such as processing API payloads, building in-memory caches, and modeling domain entities.

## 1. Arrays in Ruby

Code example:

```ruby
# Arrays in Ruby
numbers = [1, 2, 3, 4, 5]
empty = Array.new
fruits = %w[apple banana cherry]

# Accessing elements
second = numbers[1] # 0-based index

# Mutating
numbers << 6
numbers.push(7)

# Transformations
squared = numbers.map { |n| n * n }

# Reducing
sum = numbers.reduce(0) { |acc, n| acc + n }

puts "numbers: #{numbers}"
puts "second: #{second}"
puts "squared: #{squared}"
puts "sum: #{sum}"
```

### Line-by-line explanation
1. numbers = [1, 2, 3, 4, 5] creates a new array with five integers.
2. empty = Array.new creates an empty array instance.
3. fruits = %w[apple banana cherry] is a shorthand for ["apple", "banana", "cherry"].
4. second = numbers[1] retrieves the element at index 1 (second position), which is 2.
5. numbers << 6 appends 6 to the end of the array.
6. numbers.push(7) appends 7 to the end of the array (equivalent to <<).
7. squared = numbers.map { |n| n * n } creates a new array with each element squared, leaving the original unchanged.
8. sum = numbers.reduce(0) { |acc, n| acc + n } folds the numbers into a single total, starting at 0.
9. The puts statements print the resulting arrays and values for verification.

## 2. Objects and Classes in Ruby

Code example:

```ruby
class User
  attr_accessor :name, :email

  def initialize(name, email)
    @name = name
    @email = email
  end

  def display
    "#{name} <#{email}>"
  end
end

u = User.new("Ada Lovelace", "ada@example.com")
puts u.display
u.name = "Ada"
u.email = "ada.lovelace@example.com"
puts u.display
```

### Line-by-line explanation
1. class User begins a new class definition to model a user entity.
2. attr_accessor :name, :email creates automatic getter and setter methods for name and email.
3. def initialize(name, email) defines the constructor which runs when a new object is created.
4. @name = name stores the provided name in an instance variable.
5. @email = email stores the provided email in an instance variable.
6. end closes the initialize method.
7. def display defines an instance method that returns a formatted string.
8. "#{name} <#{email}>" uses string interpolation to access the object's attributes.
9. end closes the display method.
10. end closes the class definition.
11. u = User.new("Ada Lovelace", "ada@example.com") creates a new User instance.
12. puts u.display prints the formatted user information.
13. u.name = "Ada" updates the name via the setter method.
14. u.email = "ada.lovelace@example.com" updates the email via the setter method.
15. puts u.display prints the updated information.

## 3. Hashes (Maps) in Ruby

Code example:

```ruby
# Hash (Map) with symbol keys
user = { name: "Alex", email: "alex@example.com" }

# Hash with string keys
config = { "timeout" => 30, "retries" => 3 }

# Access values
name = user[:name]
timeout = config["timeout"]

# Default value patterns
default_hash = Hash.new { |h, k| h[k] = "default" }
default_hash[:missing] # => "default"

# Nested hashes and merging
profile = {
  user: { id: 123, name: "Alex" },
  roles: [:admin, :editor]
}

merged = user.merge(age: 30, location: "Remote")

# Iterating over a hash
profile[:user].each do |k, v|
  puts "#{k}: #{v}"
end

puts "name: #{name}, timeout: #{timeout}"
puts "merged: #{merged}"
```

### Line-by-line explanation
1. user = { name: "Alex", email: "alex@example.com" } creates a hash with symbol keys.
2. config = { "timeout" => 30, "retries" => 3 } creates a hash with string keys.
3. name = user[:name] retrieves the value for the :name key (Alex).
4. timeout = config["timeout"] retrieves the value for the "timeout" key (30).
5. default_hash = Hash.new { |h, k| h[k] = "default" } creates a hash that assigns "default" the first time a missing key is accessed.
6. default_hash[:missing] returns "default" and also stores that key with the value "default".
7. profile = { user: { id: 123, name: "Alex" }, roles: [:admin, :editor] } defines a nested hash structure.
8. merged = user.merge(age: 30, location: "Remote") returns a new hash combining user with additional keys.
9. profile[:user].each do |k, v| ... end iterates over the inner user hash and prints each key/value pair.
10. puts "name: #{name}, timeout: #{timeout}" prints the extracted values.
11. puts "merged: #{merged}" prints the merged hash.

## X. Common Beginner Mistakes

Bad vs Good: Avoidable pitfalls when using arrays, objects, and hashes.

- Pitfall 1: Mutating in place vs creating a new collection
  Bad:
  ```ruby
  numbers = [1, 2, 3]
  doubled = numbers.map! { |n| n * 2 } # mutates original; may surprise callers
  ```
  Good:
  ```ruby
  numbers = [1, 2, 3]
  doubled = numbers.map { |n| n * 2 } # returns a new array; originals unchanged
  ```

- Pitfall 2: Shared mutable default values in hashes
  Bad:
  ```ruby
  h = Hash.new([])
  h[:a] << 1
  h[:b] << 2
  # both :a and :b refer to the same default array
  ```
  Good:
  ```ruby
  h = Hash.new { |hash, key| hash[key] = [] }
  h[:a] << 1
  h[:b] << 2
  ```

- Pitfall 3: Inconsistent key types (symbol vs string)
  Bad:
  ```ruby
  settings = { verbose: true }
  settings["verbose"] # => nil
  ```
  Good:
  ```ruby
  settings = { verbose: true } # prefer symbol keys
  settings[:verbose] # => true
  ```
  Alternative good practice: convert input keys to symbols consistently (e.g., with deep_symbolize_keys in Rails or key = key.to_sym).

- Pitfall 4: Deep access without safe navigation or dig
  Bad:
  ```ruby
  name = data[:users][0][:name]
  ```
  Good:
  ```ruby
  name = data.dig(:users, 0, :name)
  # or with safe navigation
  name = data&.dig(:users, 0, :name)
  ```

## Y. Why This Matters In Real Systems

- Performance characteristics: Arrays provide fast indexed access and linear-time operations; Hashes give near-constant-time lookups on keys, enabling efficient lookups by ID or unique field (e.g., email). Understanding when to store data in arrays vs. hashes affects latency and memory usage in APIs, caches, and processing pipelines.
- Data modeling decisions: Choosing between arrays, hashes, and object models impacts how you serialize to JSON, interface with databases, and enforce domain boundaries. For example, representing a user as a Ruby object is natural in the domain model, while a response payload is often a hash/JSON structure.
- Memory and mutation: Large in-memory data structures can accumulate memory quickly. Using freeze, shallow vs deep copies, and careful mutation (mutable vs immutable patterns) matters in long-running services.
- Serialization and APIs: JSON payloads typically map to arrays and hashes. Keeping a stable, predictable structure reduces client-side integration bugs and improves versioning.
- Safety and correctness: Consistent key types, safe navigation for nested data, and avoiding unintended shared state prevent subtle bugs in concurrency or request handling.

## Z. Study Questions

1. What is the primary difference between an Array and a Hash in Ruby, in terms of data access?
2. How do you define a Ruby class with both a constructor and accessible attributes?
3. Why is Hash.new([]) problematic for default values, and how should defaults be defined instead?
4. How do you safely access nested data in a deeply structured hash without risking NilClass errors?
5. What is the difference between map and map! in Ruby, and when would you use each?

## Exercise

Part A — Define a simple domain object
- Create a Ruby class Contact with attributes: name (string), email (string), and tags (array of strings).
- Provide an initializer and a to_s or to_h method for easy display/serialization.

Part B — Build an in-memory directory
- Create a Directory class that stores:
  - An array of Contact objects
  - A Hash (map) from email to Contact for fast lookup
- Implement:
  - add_contact(contact): adds to both structures
  - find_by_email(email): returns a Contact or nil
  - find_by_tag(tag): returns an array of contact names that have the given tag

Part C — Demonstrate usage
- Create several Contact instances with varying tags.
- Build a Directory, add contacts, and perform:
  - search by a tag
  - lookup by email
  - print all contacts in a human-friendly format

Part D — JSON serialization (optional)
- Add a to_h method to Contact and Directory, then serialize Directory to JSON (require 'json') and pretty-print it.
- Ensure the JSON structure reflects the domain data cleanly.

Starter code (you can run this and complete the TODOs):

```ruby
# contact.rb
class Contact
  attr_reader :name, :email, :tags

  def initialize(name, email, tags = [])
    @name = name
    @email = email
    @tags = tags
  end

  def to_h
    { name: name, email: email, tags: tags }
  end

  def to_s
    "#{name} <#{email}> (tags: #{tags.join(', ')})"
  end
end

# directory.rb
class Directory
  def initialize
    @contacts = []
    @by_email = {}
  end

  def add_contact(contact)
    # TODO: implement
  end

  def find_by_email(email)
    # TODO: implement
  end

  def find_by_tag(tag)
    # TODO: implement
  end

  def to_h
    { contacts: @contacts.map(&:to_h) }
  end
end

# demo.rb
require 'json'
require_relative 'contact'
require_relative 'directory'

dir = Directory.new
dir.add_contact(Contact.new("Alice", "alice@example.com", ["friend"]))
dir.add_contact(Contact.new("Bob", "bob@example.com", ["coworker", "friend"]))
dir.add_contact(Contact.new("Carol", "carol@example.com", ["family"]))

puts "Contacts near tag 'friend':"
puts dir.find_by_tag("friend").map(&:to_s)

puts "Find by email bob@example.com:"
puts dir.find_by_email("bob@example.com").to_s

puts "Directory JSON:"
puts JSON.pretty_generate(dir.to_h)
```

Note: You are encouraged to expand the starter code with error handling, tests, and more robust JSON representations as you grow familiar with these data structures in Ruby.