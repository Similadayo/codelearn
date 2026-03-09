# Track: Backend Engineering — Phase 2: Developer Tools & Workflow — Terminal & Bash: Navigating the Command Line (Java)

Compelling introductory paragraph: In backend engineering, the command line is the primary interface for code discovery, build orchestration, service management, and automation. For Java projects, everyday work—navigating large codebases, compiling classes, running tests, and deploying artifacts—happens largely through Bash in a shell. This lesson teaches practical Bash skills tailored to Java workflows: navigating the filesystem, manipulating files, filtering and transforming text, and building small automation tools to reproduce and scale development and production tasks. Mastery here translates to faster iteration, safer deployments, and more reliable CI/CD pipelines.

## 1. Terminal basics and environment setup

Code block:
```bash
# Show current directory
pwd
# List all files with details (including hidden ones if any)
ls -la
# Move to a Java project root (example path; adjust to your environment)
cd ~/projects/backend-java-app
# Confirm the new location
pwd
# Return to the previous directory
cd -
# Ensure a nested directory tree exists and then create a sample Java file
mkdir -p src/main/java/com/example
cat > src/main/java/com/example/HelloWorld.java <<'JAVA'
package com.example;

public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, Java CLI!");
    }
}
JAVA
```

### Line-by-line explanation
1. pwd prints the current working directory.
2. ls -la lists all entries in the current directory with permissions, ownership, size, and timestamps.
3. cd ~/projects/backend-java-app changes the shell working directory to the absolute path of the Java project root (adjust to your setup).
4. pwd confirms the new current directory.
5. cd - switches back to the previous directory you were in before the last cd.
6. mkdir -p creates the full directory path if it does not exist (idempotent).
7. cat > src/main/java/com/example/HelloWorld.java <<'JAVA' starts a here-document to write a Java source file; the following lines are the file content until the delimiter JAVA is reached. The content defines a minimal HelloWorld class.
8. The content between the here-document lines writes a simple Java program.
9. The final JAVA line ends the here-document, saving the file.

## 2. File operations and globbing

Code block:
```bash
# List only Java source files in the example package
ls -la src/main/java/com/example/*.java
# Prepare a target directory and copy all Java sources there
mkdir -p target
cp src/main/java/com/example/*.java target/
# Find all Java files in the project and print their absolute paths
find "$(pwd)" -name '*.java' -type f -print
# Remove build artifacts safely (useful when restarting a build)
rm -rf build
```

### Line-by-line explanation
1. ls -la src/main/java/com/example/*.java lists all Java source files in that package with details.
2. mkdir -p target creates the target directory if it doesn’t exist.
3. cp src/main/java/com/example/*.java target/ copies all Java source files from the source package into the target directory.
4. find "$(pwd)" -name '*.java' -type f -print searches recursively from the current directory for files ending in .java and prints their absolute paths.
5. rm -rf build removes the build directory and its contents recursively; used to reset a build, if present.

## 3. Piping, redirection, and text processing

Code block:
```bash
# Show the first 5 items in the directory listing and pipe to head
ls -la | head -n 5
# Redirect stdout to a log file (overwrite)
echo "Starting build" > build.log
# Append Maven build output to the log, including errors
mvn -q -DskipTests package >> build.log 2>&1
# Count total lines across all Java source files
find src -name '*.java' -print0 | xargs -0 wc -l
# Print only the class names from Java files (best-effort)
grep -R --no-messages '^class ' src | awk -F: '{print $2}'
```

### Line-by-line explanation
1. ls -la | head -n 5 takes the long listing and shows only the first 5 lines, useful for quick previews.
2. echo "Starting build" > build.log creates or overwrites build.log with the message.
3. mvn -q -DskipTests package >> build.log 2>&1 runs Maven packaging quietly, but appends both stdout and stderr to build.log for traceability.
4. find src -name '*.java' -print0 | xargs -0 wc -l counts lines across all Java files using null-separated arguments to handle spaces/newlines safely.
5. grep -R --no-messages '^class ' src | awk -F: '{print $2}' recursively searches for class declarations and prints the filename portion (best-effort when using default grep output).

## 4. Java-centric command-line workflow

Code block 1 (basic compilation and run of a single file):
```bash
# Compile a single Java file into an output directory
javac -d out src/main/java/com/example/HelloWorld.java
# Run the compiled class from the output directory
java -cp out com.example.HelloWorld
```

### Line-by-line explanation
1. javac -d out compiles the HelloWorld.java, placing class files under the directory "out" while preserving package structure.
2. java -cp out com.example.HelloWorld runs the HelloWorld class, adding "out" to the classpath so the JVM can locate com.example.HelloWorld.

Code block 2 (Maven project basics and running the built artifact):
```bash
# Minimal Maven project (pom.xml) snippet (in project root)
cat > pom.xml <<'XML'
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>hello-world</artifactId>
  <version>1.0-SNAPSHOT</version>
  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
  </properties>
</project>
XML

# Build the project (packaging a jar)
mvn -q -DskipTests package
# Run the resulting jar (adjust artifact name as needed)
java -jar target/hello-world-1.0-SNAPSHOT.jar
```

### Line-by-line explanation
1. The Maven pom.xml snippet defines a basic Java project with groupId, artifactId, version, and compiler settings (Java 17 in this example).
2. mvn -q -DskipTests package builds the project quietly and produces a JAR under target.
3. java -jar target/hello-world-1.0-SNAPSHOT.jar runs the packaged application. The exact jar name depends on your Maven coordinates and packaging.

Code block 3 (basic Gradle alternative; optional to show cross-tool workflow):
```bash
# If a Gradle build is present
./gradlew build -x test
# Run the resulting jar if your Gradle build outputs one
ls build/libs/*.jar
java -jar build/libs/hello-world-1.0-SNAPSHOT.jar
```

### Line-by-line explanation
1. ./gradlew build -x test runs a Gradle build while skipping tests, producing artifacts under build/libs.
2. ls build/libs/*.jar lists candidate jar files produced by the Gradle build.
3. java -jar build/libs/hello-world-1.0-SNAPSHOT.jar runs the selected jar (adjust artifact name to match your project).

## 5. Environment, aliases, and small automation scripts

Code block:
```bash
# Quick shortcuts
alias ll='ls -la'
alias g='git'

# Ensure local binaries are found
export PATH="$HOME/.local/bin:$PATH"

# A small helper function to search Java files for a pattern
searchjava() {
  if [[ -d "$1" ]]; then
    find "$1" -name '*.java' -print0 | xargs -0 grep -n --color=auto "$2"
  else
    echo "Directory not found: $1" >&2
  fi
}
```

Code block (a robust automation script for building and running a Java project):
```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$1"
if [[ -z "$PROJECT_DIR" ]]; then
  echo "Usage: $0 /path/to/java/project"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ -f pom.xml ]]; then
  echo "Detected Maven project. Packaging..."
  mvn -q -DskipTests package
  JAR=$(ls target/*.jar | head -n 1)
  if [[ -f "$JAR" ]]; then
    echo "Running $JAR..."
    java -jar "$JAR"
  else
    echo "Jar not found after Maven build." >&2
    exit 3
  fi
elif [[ -f build.gradle ]]; then
  echo "Detected Gradle project. Building..."
  ./gradlew build -x test
  JAR=$(ls build/libs/*.jar | head -n 1)
  if [[ -f "$JAR" ]]; then
    echo "Running $JAR..."
    java -jar "$JAR"
  else
    echo "Jar not found after Gradle build." >&2
    exit 4
  fi
else
  echo "No recognized build file (pom.xml or build.gradle) found." >&2
  exit 2
fi
```

### Line-by-line explanation
1. Shebang and strict modes enable safer scripting (exit on error, treat unset vars as error, pipefail).
2. Read the first argument as PROJECT_DIR and validate input.
3. Change into the provided project directory.
4. If pom.xml exists, detect Maven project flow.
5. Run Maven packaging with tests skipped.
6. Identify the produced jar and run it with java -jar.
7. If build.gradle exists, detect Gradle project flow.
8. Run Gradle build and locate the jar to execute.
9. If neither build file exists, report an error.

### Notes on environment and workflow
- Use quotes around paths to handle spaces.
- Prefer set -euo pipefail or explicit error checks for scripts that automate workflows.
- For Java projects, unify local development with a consistent build tool (Maven or Gradle) to ensure reproducible results.

## X. Common Beginner Mistakes

- Pitfall 1: Not quoting paths with spaces
  Bad:
  ```bash
  cd /path/with spaces/project
  ```
  Good:
  ```bash
  cd "/path/with spaces/project"
  ```
  
- Pitfall 2: Not checking command exit status
  Bad:
  ```bash
  rm -rf build
  mvn package
  ```
  Good:
  ```bash
  rm -rf build && mvn package
  ```
  Or enable strict mode:
  ```bash
  set -euo pipefail
  ```

- Pitfall 3: Overwriting variables or not handling null values in scripts
  Bad:
  ```bash
  JAR=target/*.jar
  java -jar $JAR
  ```
  Good:
  ```bash
  JAR=$(ls target/*.jar | head -n 1)
  if [[ -f "$JAR" ]]; then
    java -jar "$JAR"
  else
    echo "No jar found" >&2
  fi
  ```

- Pitfall 4: Missing quotes around variables in loops
  Bad:
  ```bash
  for f in *.java; do
    wc -l $f
  done
  ```
  Good:
  ```bash
  for f in *.java; do
    wc -l "$f"
  done
  ```

- Pitfall 5: Not handling spaces in build commands (e.g., mvn/gradle) when used inside scripts
  Bad:
  ```bash
  mvn -DskipTests package
  ```
  Good:
  ```bash
  mvn -DskipTests package
  ```
  (Note: the command itself is fine; ensure the project path is quoted and the working directory is correct.)

## Y. Why This Matters In Real Systems

- Reproducibility: Terminal commands and scripts enable reproducible builds, tests, and deployments across machines (dev, CI, and production) by codifying the exact steps.
- Automation: Bash-based tools replace repetitive manual steps with reliable pipelines, reducing human error and speeding up feedback loops for developers.
- Debugging and Observability: Shell commands can surface file locations, process status, and logs quickly; piping and redirection enable concise log collection and analysis.
- Java-centric workflows: Java projects rely heavily on build tools (Maven/Gradle). Mastery of the command line for compilation, packaging, and test execution translates directly into faster feature delivery and easier troubleshooting in containers, CI pipelines, and production services.
- Dev/Prod parity: Scripts and environment setup lines (e.g., JAVA_HOME, PATH) help ensure parity between development environments and production container images, crucial for consistent behavior.

## Z. Study Questions

1. What is the difference between stdout redirection with ">" and ">>" in Bash?
2. How can you quickly search for a string across all Java sources and show line numbers?
3. Why is it important to quote variables and paths in Bash scripts?
4. Name two ways to compile and run a Java program from the command line without using an IDE.
5. How would you detect whether a project uses Maven or Gradle and execute the appropriate build command in a script?

## Exercise

Part 1: Create a small Java project and confirm the basics
- Create a new directory for a Maven-based Java project (no IDE required).
- Add a minimal pom.xml and a HelloWorld.java under src/main/java/com/example/.
- Build the project with Maven and run the resulting jar.
- Verify that running the jar prints the expected message.

Part 2: Implement a reusable build-and-run script
- Create a script named build_and_run.sh at the project root (or in a tools/ directory).
- The script should:
  - Accept a single argument: the path to a Java project (handle spaces with quotes).
  - Detect if pom.xml exists (Maven) or build.gradle exists (Gradle).
  - Build accordingly with tests skipped.
  - Locate the resulting jar and run it with java -jar.
  - Print clear messages about what is happening and handle missing artifacts gracefully.
- Mark the script as executable and test it with the path to your Java project.

Part 3: Extend with logging and a simple search helper
- Add a log file (build.log) and modify the script to tee Maven/Gradle output to the log while still printing progress to the console.
- Add a quick helper function in your shell that searches for a Java keyword (e.g., a package declaration) inside a specific directory and prints matches with line numbers.
- Use the helper to locate the package statement in your HelloWorld.java.

Part 4: Create a simple one-liner for quick verification
- From the project root, run a one-liner that prints the classpath and the main class to run using the output of your build, ensuring you can reproduce the run command without re-reading files.

Deliverables:
- A Maven pom.xml, HelloWorld.java, and a small project structure consistent with the examples above.
- A working build_and_run.sh script that demonstrates the automation workflow.
- A brief README-like section in the project describing how to use the script and what to expect.

This lesson provides a practical, Java-focused foundation for navigating the command line, manipulating files and projects, and building small automation tools that scale from local development to production workflows.