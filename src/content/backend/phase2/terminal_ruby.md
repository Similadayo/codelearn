# Terminal & Bash — Navigating the Command Line (Ruby)

Mastering the terminal is a core skill for backend engineers, especially in a Ruby-centric workflow. The command line accelerates project setup, environment management, debugging, and automation. In Ruby-centric teams, you'll often run scripts, manage dependencies, inspect logs, and orchestrate tasks from the shell. This lesson covers practical Bash navigation, file and path operations, text processing, and Ruby-specific terminal usage to boost productivity and reliability in real systems.

## 1. Terminal Basics for Rubyists

Learn the foundational commands you’ll use every day: how to print your location, list files, move around the filesystem, and quickly inspect outputs. This foundation is essential before you build more complex automations.

```bash
# Print working directory
pwd
# List files (including hidden ones) with details
ls -la
# Change directory (absolute path)
cd /home/user/projects/ruby-app
# List contents again to confirm
ls -la
# Print the current path again using command substitution
echo "Current directory: $(pwd)"
```

### Line-by-line explanation breaking down each line

- pwd: Outputs the absolute path of the current directory.
- ls -la: Lists all items in the directory, including hidden files, with detailed information (permissions, size, timestamp).
- cd /home/user/projects/ruby-app: Changes the current directory to the specified absolute path.
- ls -la: Re-lists contents to verify the change.
- echo "Current directory: $(pwd)": Uses command substitution to embed the current directory path into the string.

## 2. Working with Paths and Directories

Navigate, create, link, and inspect paths robustly. Ruby projects often rely on predictable directory layouts and symlinks for log rotation, deployments, and shared resources.

```bash
# Create a directory tree, including parent directories
mkdir -p ruby_project/logs/{development,production}
# Create placeholder files
touch ruby_project/logs/development/server.log
touch ruby_project/logs/production/server.log
# Create a symbolic link to the development log as current.log
ln -s ruby_project/logs/development/server.log ruby_project/logs/current.log
# Resolve the absolute path of the symlink target
realpath ruby_project/logs/current.log
# Push and pop directories on a stack (quick navigation)
pushd ruby_project
pwd
popd
pwd
```

### Line-by-line explanation breaking down each line

- mkdir -p ruby_project/logs/{development,production}: Creates the project directory with nested log directories, using -p to ensure parent directories exist.
- touch ruby_project/logs/development/server.log: Creates an empty development log file.
- touch ruby_project/logs/production/server.log: Creates an empty production log file.
- ln -s ruby_project/logs/development/server.log ruby_project/logs/current.log: Creates a symbolic link named current.log pointing to the development log.
- realpath ruby_project/logs/current.log: Outputs the absolute path to the symlink target, resolving the link.
- pushd ruby_project: Saves the current directory on a stack and changes to ruby_project.
- pwd: Shows the current directory after the push.
- popd: Returns to the previous directory on the stack.
- pwd: Confirms the return location.

## 3. Searching, Piping, and Text Processing

Text processing is central for log analysis, quick code inspection, and generating reports. Learn to filter, transform, and aggregate data efficiently from the shell, with Ruby-readiness in mind.

```bash
# Find all Ruby source files modified within the last 7 days
find . -name "*.rb" -mtime -7 -print | sort
# Count the number of Ruby files in the project
ruby -e 'puts Dir.glob("**/*.rb").length'
# Print only the filenames and their sizes, one per line
find . -name "*.rb" -printf "%f\t%kKB\n" | sort
# Show processes related to Ruby (safely exclude the grep process itself)
ps aux | awk '$11 ~ /ruby/ && $0 !~ /awk/ {print $2, $11, $12}'
```

### Line-by-line explanation breaking down each line

- find . -name "*.rb" -mtime -7 -print | sort: Searches for files ending in .rb modified in the last 7 days and sorts the results.
- ruby -e 'puts Dir.glob("**/*.rb").length': Executes a small Ruby one-liner to count all Ruby files recursively from the current directory.
- find . -name "*.rb" -printf "%f\t%kKB\n" | sort: Prints just the filename and size in kilobytes for each Ruby file, then sorts the output.
- ps aux | awk '$11 ~ /ruby/ && $0 !~ /awk/ {print $2, $11, $12}': Lists processes where the command includes "ruby", avoiding the awk process itself, and prints PID, command, and arguments.

## 4. Ruby in the Terminal: One-liners and Scripting

Ruby can be leveraged directly from the shell for quick tasks, quick file validations, or small data transformations without creating a script file.

```bash
# List all Ruby files recursively in the current directory
ruby -e 'puts Dir.glob("**/*.rb")'
# Copy Gemfile.lock to a backup using Ruby (demonstrates using Ruby for filesystem tasks)
ruby -e 'require "fileutils"; FileUtils.cp("Gemfile.lock","Gemfile.lock.bak")'
```

### Line-by-line explanation breaking down each line

- ruby -e 'puts Dir.glob("**/*.rb")': Runs Ruby code inline to fetch and print all .rb files recursively.
- ruby -e 'require "fileutils"; FileUtils.cp("Gemfile.lock","Gemfile.lock.bak")': Uses Ruby to require the FileUtils module and copy Gemfile.lock to Gemfile.lock.bak, illustrating how Ruby can perform shell-like tasks with proper error handling if needed.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Paths with spaces are not quoted
  - Bad:
    ```
    cd /Users/alice/My Project
    ```
  - Good:
    ```
    cd "/Users/alice/My Project"
    ```

- Pitfall 2: Command substitution with backticks vs $(...)
  - Bad:
    ```
    FILES=`ls *.rb`
    ```
  - Good:
    ```
    FILES=$(ls *.rb)
    ```

- Pitfall 3: Word splitting and unquoted variables in loops
  - Bad:
    ```
    DIR=/path/with spaces
    for f in $DIR/*.rb
    do
      echo $f
    done
    ```
  - Good:
    ```
    DIR="/path/with spaces"
    IFS=$'\n'
    for f in "$DIR"/*.rb
    do
      echo "$f"
    done
    ```

- Pitfall 4: Creating directories without -p
  - Bad:
    ```
    mkdir logs
    ```
  - Good:
    ```
    mkdir -p logs
    ```

- Pitfall 5: Dangerous rm usage without safeguards
  - Bad:
    ```
    rm -rf /
    ```
  - Good:
    ```
    rm -rf -- /path/to/target
    ```
  - Extra safeguard:
    ```
    echo "Ready to delete? Type 'yes' to continue:"; read ans; [ "$ans" = "yes" ] && rm -rf -- /path/to/target
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility and automation: Shell commands underpin setup scripts, deployment tasks, and CI pipelines. Predictable commands reduce environment drift.
- Ruby workflows: Often you need to transform logs, generate reports, or inspect assets across environments. The terminal provides fast, repeatable ways to do this without a full Ruby program.
- Safe operations and observability: Quoting, nullglob, and safe piping practices prevent accidental data loss and help ensure logs, configs, and assets are manipulated deterministically.
- Environment and tool integration: Many Ruby apps rely on environment variables, Bundler, RVM/rbenv, and containerized runtimes. The shell is the glue that wires these together in development, staging, and production.
- Security considerations: Never leak secrets in command history; use environment variables or secret management tools; prefer parameterized commands when integrating with scripts.

## Z. Study Questions — 5 recall questions

1. How do you print the absolute path of the current directory in Bash?
2. What is the difference between $(...) and backticks for command substitution, and which is preferred?
3. How can you ensure a directory path with spaces works correctly in a script?
4. Why is it important to quote variables in shell loops, and how can you safely loop over files with spaces?
5. What Bash option helps prevent errors when creating nested directories, and how do you use it?

## Exercise — Practical multi-part coding challenge

Part A: Scaffold a tiny Ruby project skeleton in the terminal

- Create a project folder structure with logs and bin directories, and add a simple executable script.
- Commands:
  ```bash
  # Create scaffold with nested dirs
  mkdir -p ruby_app/{lib,bin,logs}
  # Create a simple runner script
  cat > ruby_app/bin/run <<'RUBY'
  #!/usr/bin/env ruby
  puts "Ruby version: #{RUBY_VERSION}"
  puts "Platform: #{RUBY_PLATFORM}"
  puts "Current dir: #{Dir.pwd}"
  RUBY
  chmod +x ruby_app/bin/run
  # Show the created script
  sed -n '1,6p' ruby_app/bin/run
  ```
- Expected outcome: A runnable script at ruby_app/bin/run that prints Ruby version, platform, and current directory.

- Line-by-line explanation:
  - mkdir -p ruby_app/{lib,bin,logs}: Creates the project directory with subdirectories lib, bin, and logs.
  - cat > ruby_app/bin/run <<'RUBY' ... RUBY: Writes a multi-line Ruby script to the run file.
  - chmod +x ruby_app/bin/run: Makes the script executable.
  - sed -n '1,6p' ruby_app/bin/run: Displays the first six lines of the script to confirm content.

Part B: Add a simple Ruby snippet to list Ruby files

- Commands:
  ```bash
  # List all Ruby files recursively using Ruby
  ruby -e 'puts Dir.glob("**/*.rb")'
  ```
- Expected outcome: A list of all .rb files under the current directory appears in the terminal.

- Line-by-line explanation:
  - ruby -e 'puts Dir.glob("**/*.rb")': Executes a Ruby one-liner that searches for all .rb files recursively and prints their paths.

Part C: Create a log of the last modified Ruby files

- Commands:
  ```bash
  # Find Ruby files modified in the last 2 days, sorted by modification time
  find . -name "*.rb" -mtime -2 -print | sort
  # Save results to a log file in the logs directory
  find . -name "*.rb" -mtime -2 -print | sort > ruby_app/logs/recent_ruby_files.log
  ```
- Expected outcome: A file at ruby_app/logs/recent_ruby_files.log containing the sorted paths of recently modified Ruby files.

- Line-by-line explanation:
  - find . -name "*.rb" -mtime -2 -print | sort: Locates .rb files modified in the last two days, then sorts the list.
  - > ruby_app/logs/recent_ruby_files.log: Redirects the sorted list to a log file for persistence.

Part D: Run the Ruby script and capture environment details

- Commands:
  ```bash
  # Run the launcher script and capture environment info
  ENV=development
  ruby_app/bin/run
  echo "ENV=${ENV}"
  ```
- Optional: Wire environment variables into Ruby output
  - Modify run script to print ENV value:
    ```
    echo "ENV: ${ENV}"
    ```
- Line-by-line explanation:
  - ENV=development: Sets an environment-like variable for the shell session.
  - ruby_app/bin/run: Executes the Ruby launcher script to print version, platform, and current directory.
  - echo "ENV=${ENV}": Displays the environment value to confirm variable propagation.

Notes for learners:
- If you don’t have Bundler or gems installed, you can skip parts involving Bundler. Focus on filesystem, script execution, and Ruby one-liners.
- Try altering commands to handle paths with spaces and verify with actual directories on your machine.
- Use these exercises to build a small, repeatable script that you can drop into CI pipelines or local dev setups.

This lesson provides practical, Ruby-relevant CLI skills you can apply immediately in backend engineering workflows, from quick ad-hoc tasks to building robust automation scripts.