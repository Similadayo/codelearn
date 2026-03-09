# Track: Backend Engineering — Phase 1: Language Foundations — Error Handling & Debugging (Ruby)

Compelling introductory paragraph:
Error handling and debugging are foundational skills for any backend engineer. When services fail gracefully, surface meaningful errors, and provide actionable insight to developers and operators, you prevent outages, reduce mean time to recovery (MTTR), and improve user trust. In Ruby-backed systems, clean exception design, structured logging, and lightweight debugging strategies enable robust APIs, background jobs, and data pipelines. This lesson builds practical mental models and concrete patterns you can apply to everyday backend problems.

## 1. Ruby's Error Model and Basic Rescue Patterns
Ruby uses exceptions to model error conditions. The rescue mechanism lets you catch and respond to errors, while ensure lets you perform cleanup regardless of success or failure.

### Code block
```ruby
def dangerous_operation
  # Example: a runtime error (division by zero)
  1 / 0
end

begin
  dangerous_operation
rescue ZeroDivisionError => e
  puts "Handled: #{e.class} - #{e.message}"
else
  puts "Operation succeeded without errors"
ensure
  puts "Cleanup or finalization goes here"
end
```

### Line-by-line explanation
1. Defines a method dangerous_operation that will raise a ZeroDivisionError when executed.  
2. Enters a begin block to start exception handling.  
3. Calls dangerous_operation, which triggers an exception.  
4. Rescue clause catching specifically ZeroDivisionError and binding it to e.  
5. Prints a human-friendly message including the exception class and message.  
6. Else clause runs if no exception occurred; in this case, it would indicate success.  
7. Ensure clause runs regardless of whether an exception occurred, allowing cleanup or finalization code to execute.

## 2. Custom Errors and Validation Patterns
Define domain-specific error types and use them to communicate precise failure modes. This makes error handling clearer and safer across modules.

### Code block
```ruby
class AppError < StandardError; end
class ValidationError < AppError; end
class NotFoundError < AppError; end

def create_user(attrs)
  raise ValidationError, "email is required" if attrs[:email].nil? || attrs[:email].strip.empty?
  raise NotFoundError, "Role not found" if attrs[:role].nil?

  { id: 42, email: attrs[:email], role: attrs[:role] }
end

begin
  create_user(email: "", role: "admin")
rescue ValidationError => e
  puts "Validation error: #{e.message}"
rescue NotFoundError => e
  puts "Not found: #{e.message}"
end
```

### Line-by-line explanation
1. Defines a base AppError inheriting from StandardError for domain-specific errors.  
2. Defines ValidationError and NotFoundError as specialized error types for clearer handling.  
3. Method create_user validates input; raises ValidationError when email is missing or blank.  
4. Raises NotFoundError if the role is missing, illustrating multiple error types.  
5. Returns a user-like hash when validation passes.  
6. Rescue clause for ValidationError prints a readable message.  
7. Rescue clause for NotFoundError prints a readable message.  

## 3. Debugging Techniques and Tools in Ruby
Effective debugging reduces time to root cause. We cover an interactive debugger and lightweight logging.

### Code block (interactive debugging with byebug)
```ruby
# Ensure you have the byebug gem installed: gem install byebug
require 'byebug'

def fetch_user(id)
  byebug  # pause here to inspect state
  raise "User not found" if id <= 0
  { id: id, name: "User#{id}" }
end

begin
  p fetch_user(-1)
rescue => e
  puts "Error: #{e.class} - #{e.message}"
  puts "Backtrace: #{e.backtrace.first}"
end
```

### Line-by-line explanation
1. Comment indicating you need the byebug gem to run this interactively.  
2. Requires the byebug library to enable debugging session.  
3. Defines fetch_user that will pause before proceeding.  
4. byebug statement triggers an interactive debugging session where you can inspect variables.  
5. Raises an error for invalid input to simulate a failure path.  
6. Returns a hash with a user representation if valid input is provided.  
7. Rescue block prints the error class and message.  
8. Also prints the first line of the backtrace to help locate the issue.

### Code block (structured logging with Ruby's Logger)
```ruby
require 'logger'

def load_config
  logger = Logger.new(STDOUT)
  logger.info("Starting config load")
  # Simulate a problem
  raise "Config file missing" unless File.exist?("config.yml")
  File.read("config.yml")
rescue => e
  logger.error("#{e.class}: #{e.message}")
  nil
end

load_config
```

### Line-by-line explanation
1. Requires the standard Logger class.  
2. Defines load_config to read a configuration file.  
3. Creates a logger that outputs to STDOUT.  
4. Logs an informational message indicating the start of config loading.  
5. Simulates a problem by raising an error if the config file does not exist.  
6. Reads and returns the config file if present.  
7. Rescue block captures any exception, logs an error with the exception class and message.  
8. Returns nil to signal failure to the caller.

## 4. Best Practices for Error Handling and Logging
Adopt clear patterns to keep code maintainable and operable in production.

### Code block
```ruby
def read_file_lines(path)
  File.readlines(path, encoding: 'UTF-8')
rescue Errno::ENOENT => e
  puts "File not found: #{path} - #{e.message}"
  []
rescue Errno::EACCES => e
  puts "Permission denied: #{path} - #{e.message}"
  []
end
```

### Line-by-line explanation
1. Attempts to read all lines from a file with UTF-8 encoding.  
2. Rescue clause for ENOENT (file not found) logs a readable message.  
3. Returns an empty array to indicate no data could be read.  
4. Rescue clause for EACCES (permission denied) logs a readable message.  
5. Returns an empty array to signal failure to callers without crashing the program.

### Code block (ensuring resource cleanup)
```ruby
def safe_file_copy(src, dst)
  File.open(src, "r") do |in_file|
    File.open(dst, "w") do |out_file|
      IO.copy_stream(in_file, out_file)
    end
  end
rescue Errno::ENOENT => e
  warn "Copy failed: #{e.message}"
  raise
end
```

### Line-by-line explanation
1. Opens the source file for reading and ensures the block takes care of closing it.  
2. Inside the first block, opens the destination file for writing.  
3. Copies content from the source to the destination efficiently.  
4. End of both blocks ensures resources are closed after operation.  
5. Rescue clause handles missing source file, prints a warning, and re-raises to propagate the error.

## X. Common Beginner Mistakes
3+ real pitfalls with bad vs good code side-by-side.

| Bad (Common Mistake) | Good (Correct Approach) | Why it matters |
|---|---|---|
| Swallowing exceptions without logging or re-throwing. Example: begin; risky_call; rescue; end | rescue StandardError => e; logger.error("Operation failed: #{e.message}"); raise unless recoverable end | Without logs or proper propagation, root cause and MTTR stay hidden. Always surface actionable signals. |
| Using a broad rescue to catch all errors (rescue nil) or rescue without specifying a class. | rescue SpecificError => e; handle_or_rethrow(e) | Narrow rescues prevent masking serious bugs and preserve stack traces for debugging. |
| Returning nil to indicate failure in library code; callers cannot distinguish error vs. valid nil. | Return a Result object or raise a meaningful exception | Clear signaling helps callers handle errors deterministically and reduces fragile nil checks. |
| Not using ensure/closing resources like files or sockets. | Use ensure or block form to guarantee cleanup | Leaks and resource starvation lead to outages under load. |
| Over-logging or leaking sensitive data in logs | Log structured, concise messages with context but avoid secrets | Observability is powerful, but logs must be safe and usable. |

## Y. Why This Matters In Real Systems
- Reliability: Well-typed error classes and targeted rescues reduce failure modes and prevent cascading exceptions.
- Observability: Consistent logging and backtraces enable faster incident response and root-cause analysis.
- Maintainability: Domain-specific errors communicate intent across services, reducing guesswork during debugging.
- Performance and stability: Proper use of ensure/Resource management prevents leaks under high request volumes.
- Incident response: Clear error signaling makes alerting, dashboards, and service level objectives (SLOs) actionable.

## Z. Study Questions
1. What is the difference between rescue and ensure in Ruby?  
2. Why is it preferable to rescue specific exception classes rather than a blanket rescue StandardError?  
3. How would you add context to an error so logs are actionable?  
4. What is the role of backtrace in debugging, and how can you use it effectively?  
5. Describe a scenario where using a custom error type improves the clarity of error handling in a backend service.

## Exercise
A practical multi-part coding challenge to solidify error handling and debugging skills in Ruby.

Part A: Create a SafeRunner for block execution
- Goal: Run a block safely, catching errors, and returning a structured result.

### Code block
```ruby
require 'logger'

class SafeRunner
  def initialize(logger: nil)
    @logger = logger || Logger.new(STDOUT)
  end

  # Executes the given block, returning a structured result
  def run
    result = yield
    { success: true, value: result }
  rescue StandardError => e
    @logger.error("#{e.class}: #{e.message}")
    { success: false, error: e.message, backtrace: e.backtrace }
  end
end

# Example usage
runner = SafeRunner.new
outcome = runner.run do
  # Replace with any code that might raise
  [1, 2, 3].fetch(5)  # will raise IndexError
end

puts outcome.inspect
```

### Line-by-line explanation
1. Requires the standard Logger library for structured logging.  
2. Defines SafeRunner with a constructor accepting an optional logger.  
3. The run method yields to the provided block and, if successful, returns a hash with success and value.  
4. If a StandardError (or subclass) is raised, logs an error with class and message.  
5. Returns a hash with success: false, the error message, and the backtrace for debugging.

Part B: JSON parsing with robust error handling
- Goal: Parse JSON input safely and provide structured error information on failure.

### Code block
```ruby
require 'json'
require 'logger'

def parse_json(input)
  JSON.parse(input)
rescue JSON::ParserError => e
  { error: "JSON parse error: #{e.message}", backtrace: e.backtrace }
end

# Example usage
puts parse_json('{"name": "Alice"}').inspect
puts parse_json('invalid json').inspect
```

### Line-by-line explanation
1. Requires JSON library for parsing.  
2. Defines parse_json to take a string input.  
3. Attempts to parse the input as JSON.  
4. Rescue block handles JSON::ParserError, returning a structured error map with a message and backtrace.  
5. Demonstrates usage with valid JSON.  
6. Demonstrates usage with invalid JSON to show error handling.

Part C: Debugging practice with a deliberate bug
- Goal: Reproduce a failure, inspect state with a debugger-friendly approach, and fix the bug.

### Code block
```ruby
require 'byebug'
require 'logger'

def buggy_area(n)
  byebug
  # Bug: off-by-one error in loop
  total = 0
  (0...n).each do |i|
    total += i
  end
  total
end

logger = Logger.new(STDOUT)
begin
  logger.info("Running buggy_area with n=5")
  puts buggy_area(5)  # Expect 10; actual is 10 due to off-by-one
rescue => e
  logger.error("Unhandled error: #{e.message}")
end
```

### Line-by-line explanation
1. Requires byebug to pause execution for interactive inspection.  
2. Requires Logger for structured logs.  
3. Defines buggy_area that will pause with byebug for debugging.  
4. Sets up a sum over a range; the implementation has an off-by-one-like behavior for demonstration.  
5. Logs the start of the operation.  
6. Calls buggy_area and prints the result.  
7. Rescue clause logs any unexpected errors.

Note: The comment intentionally flags an off-by-one pattern to practice diagnosing with a debugger.

End of Exercise
- Extend SafeRunner to optionally recover from certain errors by returning a default value.  
- Add a small CLI interface that reads a JSON string from ARGV and uses parse_json to demonstrate error handling in a user-input flow.  
- Practice using byebug to step through a failing piece of logic and identify root causes.