# Modules, Packages & Dependency Management in Ruby

Backend engineering in Ruby hinges on clean module organization, clear namespaces, and dependable dependency management. Modules give you reusable, composable behavior and a safe namespace boundary; packages (gems) provide off-the-shelf functionality; Bundler and Gemfiles lock down versions to guarantee reproducible deployments. This lesson walks you through building and organizing modules, using gems responsibly, and managing dependencies in real systems.

## 1. Understanding Ruby Modules

Ruby modules are namespaces and mixins. They help you group related functionality and share behavior across classes without inheritance. This section demonstrates creating a small module, using it as a mixin, and exercising a simple example.

```ruby
# lib/my_app/formatter.rb
require 'date'

module MyApp
  module Formatter
    def format_date(date)
      date.strftime("%Y-%m-%d")
    end
  end
end

class Report
  include MyApp::Formatter

  def today_string
    format_date(Date.today)
  end
end

# usage
r = Report.new
puts r.today_string
```

### Line-by-line explanation
- require 'date': Loads Ruby's date library so Date.today can be used.
- module MyApp; module Formatter; ... end; end: Defines a nested module structure to group formatting logic under a safe namespace.
- def format_date(date); date.strftime("%Y-%m-%d"); end: Instance method provided by the formatter mixin.
- class Report; include MyApp::Formatter; end: The Report class includes the Formatter module, gaining the format_date method as an instance method.
- def today_string; format_date(Date.today); end: Uses the mixed-in formatter to format today's date.
- r = Report.new; puts r.today_string: Creates an instance and prints the formatted date string.

## 2. Namespaces and Organizing Code with Modules

Well-chosen namespaces prevent naming collisions and clarify code organization across large apps. This example shows how to structure nested modules and reference deeply nested constants and classes.

```ruby
# lib/my_app/core/actions/create_user.rb
module MyApp
  module Core
    module Actions
      class CreateUser
        def call(name)
          "User '#{name}' created"
        end
      end
    end
  end
end

# main usage file
require_relative './lib/my_app/core/actions/create_user'

puts MyApp::Core::Actions::CreateUser.new.call("Alice")
```

### Line-by-line explanation
- Nested module definitions create a clear path for the CreateUser action inside MyApp::Core::Actions.
- class CreateUser; def call(name); ...; end: A simple service-like object that performs an action.
- require_relative './lib/.../create_user': Loads the class file from a relative path.
- puts MyApp::Core::Actions::CreateUser.new.call("Alice"): Instantiates the action and outputs a message confirming creation.

## 3. Ruby Mixins with Modules

Mixins allow you to share behavior without forcing a rigid inheritance tree. This section demonstrates an instance mixin (methods become instance methods) and a class-method mixin (adding class methods via the included hook).

```ruby
# lib/concerns/trackable.rb
module Trackable
  def track_event(event)
    "Tracking: #{event} for #{self.class.name}"
  end
end

class Job
  include Trackable
end

job = Job.new
puts job.track_event("started")
```

```ruby
# lib/concerns/class_logger.rb
module ClassLogger
  def self.included(base)
    base.extend(ClassMethods)
  end

  module ClassMethods
    def log_class_name
      "Class: #{name}"
    end
  end
end

class Worker
  include ClassLogger
end

puts Worker.log_class_name
```

### Line-by-line explanation (first code block)
- module Trackable; def track_event(event); ...; end; end: Defines a mixin with an instance method.
- class Job; include Trackable; end: The Job class gains track_event as an instance method via include.
- job = Job.new; puts job.track_event("started"): Calls the mixin-provided method and prints a message.

### Line-by-line explanation (second code block)
- module ClassLogger; def self.included(base); base.extend(ClassMethods); end: When ClassLogger is included, it extends the including class with ClassMethods so class-level methods become available.
- module ClassMethods; def log_class_name; ...; end; end: Defines a class method to expose the class name.
- class Worker; include ClassLogger; end: Worker includes the mixin, gaining the class-level method.
- puts Worker.log_class_name: Invokes the class method to show the class name.

## 4. Packages, Gems, and Dependency Management

Ruby packages are gems. Bundler ties gems to a precise set of versions via Gemfile and Gemfile.lock, ensuring reproducible environments.

```ruby
# Gemfile
source "https://rubygems.org"
ruby "3.1.0"

# Example dependencies
gem "httparty", "~> 0.22"
gem "logger", "~> 1.4"
```

```bash
# Shell commands (demonstrating dependency management workflow)
$ bundle install
$ bundle update
$ bundle exec ruby script.rb
```

```ruby
# script.rb
require 'bundler/setup'
Bundler.require

require 'date'

# Simple usage to show Bundler loaded gems
puts "Ruby version: #{RUBY_VERSION}"
puts "Date: #{Date.today}"
```

### Line-by-line explanation (Gemfile block)
- source "https://rubygems.org": Sets the gem source.
- ruby "3.1.0": Locks Ruby version, if you’re distributing a gem or a library.
- gem "httparty", "~> 0.22": Pins a gem version with a pessimistic constraint.
- gem "logger", "~> 1.4": Another pinned dependency.

### Line-by-line explanation (bundle commands)
- bundle install: Installs all gems specified in the Gemfile and creates Gemfile.lock.
- bundle update: Updates gems and writes a new Gemfile.lock reflecting resolved versions.
- bundle exec ruby script.rb: Runs the script in an environment that uses the exact gem versions from Gemfile.lock.

### Line-by-line explanation (script.rb)
- require 'bundler/setup': Sets up the load path for Bundler, ensuring gems are loaded from the bundle.
- Bundler.require: Loads all gems listed in the Gemfile.
- require 'date': Uses Ruby’s standard Date library.
- puts outputs: Displays runtime information to verify the environment.

## 5. How Ruby's require, require_relative, and autoload differ

Understanding how Ruby loads code is essential for modular design and performance. This section contrasts different loading strategies and shows a small example.

```ruby
# lib/my_app/utils/date_helper.rb
module MyApp
  module Utils
    module DateHelper
      def self.format(date)
        date.strftime("%Y-%m-%d")
      end
    end
  end
end
```

```ruby
# main.rb
require_relative './lib/my_app/utils/date_helper'

puts MyApp::Utils::DateHelper.format(Date.today)
```

```ruby
# alternative with require (assuming Ruby’s $LOAD_PATH includes the file)
# main2.rb
require 'date'          # standard library, loaded from Ruby’s own path
puts Date.today.to_s
```

### Line-by-line explanation (require_relative example)
- require_relative './lib/...': Loads a file relative to the current file's directory.
- puts MyApp::Utils::DateHelper.format(Date.today): Uses the loaded module to format the date.

### Line-by-line explanation (require example)
- require 'date': Loads a standard library module by name from Ruby’s load path.
- puts Date.today.to_s: Uses the loaded Date class from the standard library.

Note: autoload can delay loading until a constant is first accessed, but it’s less commonly used in modern apps due to thread-safety concerns.

## 6. Versioning of dependencies and Gemfile.lock

Bundler records the exact resolved versions in Gemfile.lock to ensure reproducibility across environments.

```text
# Gemfile.lock (excerpt)
GEM
  remote: https://rubygems.org/
  specs:
    httparty (0.22.0)
    logger (1.4.1)

PLATFORMS
  ruby

DEPENDENCIES
  httparty (~> 0.22)

BUNDLED WITH
  2.3.9
```

### Line-by-line explanation
- The GEM/specs section lists the resolved gem versions.
- PLATFORMS indicates the target platform (Ruby interpreter).
- DEPENDENCIES shows constraints configured in the Gemfile.
- BUNDLED WITH records Bundler’s version used to resolve and install dependencies.

## X. Common Beginner Mistakes

Here are real pitfalls with clear bad vs good code examples.

1) Global namespace pollution

- Bad:
```ruby
FOO_BAR = 42

class Baz
  def show
    FOO_BAR
  end
end
```

- Good:
```ruby
module MyApp
  module Config
    FOO_BAR = 42
  end
end

class Baz
  def show
    MyApp::Config::FOO_BAR
  end
end
```

2) Not pinning dependency versions (reproducibility risk)

- Bad:
```ruby
# Gemfile
source "https://rubygems.org"
gem "httparty"
```

- Good:
```ruby
# Gemfile
source "https://rubygems.org"
ruby "~> 3.1"
gem "httparty", "~> 0.22"
```

3) Requiring internal files by absolute paths and hard-coded names

- Bad:
```ruby
# lib/my_lib.rb
require '/home/user/project/lib/utils/date_helper'
```

- Good:
```ruby
# lib/my_lib.rb
require_relative 'utils/date_helper'
```

4) Relying on global environment instead of Bundler for apps meant to run in different systems

- Bad:
```ruby
# Directly install gems globally and run script without Bundler
# gem install httparty
# ruby script.rb
```

- Good:
```ruby
# Gemfile (as shown earlier)
# Run all in a deterministic way
$ bundle install
$ bundle exec ruby script.rb
```

5) Ignoring autoloading vs eager loading trade-offs

- Bad (no organization, pulls in dependencies too early):
```ruby
require 'date'
require 'httparty'
```

- Good (controlled loading, or using Bundler to manage when gems are loaded):
```ruby
# Use Bundler to manage loading, and require only what you need
require 'bundler/setup'
Bundler.require(:default)

require 'date'       # optionally only if needed
```

## Y. Why This Matters In Real Systems

- Maintainability: Namespaced modules prevent collisions as teams scale; clear structure makes onboarding faster.
- Reusability: Mixins enable behavior sharing without inheritance constraints.
- Reliability: Dependency pinning via Gemfile.lock ensures production environments mirror development, reducing "it works on my machine" issues.
- Reproducibility: Bundler and Gemfile.lock let CI systems install exactly the same dependency graph every run.
- Deployment efficiency: Bundler's loading can be tuned (eager vs lazy loading) to optimize startup time in services.

## Z. Study Questions

1) What is the difference between a Ruby module used as a namespace and a module used as a mixin?  
2) How do you reference a deeply nested class or module, and why is that beneficial for large applications?  
3) What files define a Ruby project’s dependency graph and exact versions?  
4) How do require, require_relative, and autoload differ in Ruby? When would you use each?  
5) Why is pinning gem versions important for production deployments?

## Exercise

Build a small, self-contained library with modules, a gem dependency, and a usage script. Follow the steps below and commit all files to a small repository structure.

Part A: Create a modular library

- lib/my_infra/metrics/counter.rb
  - Implement a simple Counter class with increment(n = 1) and value methods.
- lib/my_infra/trackable.rb
  - Implement a Trackable mixin with an instance method track(event) that returns a string including the event and the object’s class.
- lib/my_infra.rb
  - Re-export or provide simple accessors to view the library structure.

Code blocks (Part A)

```ruby
# lib/my_infra/metrics/counter.rb
module MyInfra
  module Metrics
    class Counter
      def initialize
        @count = 0
      end

      def increment(n = 1)
        @count += n
      end

      def value
        @count
      end
    end
  end
end
```

```ruby
# lib/my_infra/trackable.rb
module MyInfra
  module Trackable
    def track(event)
      "Tracked: #{event} by #{self.class}"
    end
  end
end
```

```ruby
# lib/my_infra.rb
require_relative 'my_infra/metrics/counter'
require_relative 'my_infra/trackable'

module MyInfra
  Counter = Metrics::Counter
end
```

Part B: Create a Gemfile for dependency management

- Create a Gemfile that pins Ruby and includes httparty as an example dependency.

Code block

```ruby
# Gemfile
source "https://rubygems.org"
ruby "~> 3.1"
gem "httparty", "~> 0.22"
```

Part C: Script that uses Bundler to load dependencies and exercises the library

Code block

```ruby
# bin/run.rb
require 'bundler/setup'
Bundler.require

require_relative '../lib/my_infra'

class Service
  include MyInfra::Trackable

  def run
    track("service-started")
  end
end

# Use the Counter from the library
counter = MyInfra::Counter.new
counter.increment(5)

puts "Counter value: #{counter.value}"
puts Service.new.run
```

Part D: Run it

- Install dependencies and run the script:

Commands

```bash
$ bundle install
$ ruby bin/run.rb
```

Explanation for Exercise (concise)

- Part A creates a small, focused library with a Counter and a Trackable mixin under a clear namespace (MyInfra).
- Part B provides a minimal Gemfile to demonstrate dependency management with Bundler.
- Part C shows a script that uses Bundler to load dependencies and consumes the library, demonstrating both a mixin (Trackable) and a packaged class (Counter).
- Part D shows how to run the code in a reproducible environment using bundle exec semantics.

If you’d like, I can tailor the exercise to a domain-specific backend task (e.g., a simple event tracker or a tiny metric collector) or adapt it to a Rails-like structure to demonstrate real-world integration.