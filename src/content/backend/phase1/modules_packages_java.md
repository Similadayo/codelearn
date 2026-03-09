# Track: Backend Engineering — Module 1: Language Foundations — Modules, Packages & Dependency Management (Java)

Java projects grow large quickly. Mastering how code is organized into packages, how modules (JPMS) help enforce boundaries, and how to manage dependencies with tools like Maven or Gradle is foundational for building reliable, maintainable backends. This lesson walks through these concepts with concrete code examples, explains each line, highlights common beginner mistakes, and shows how these practices play out in real systems.

## 1. Packages and Classpath: Basics

Packages are the primary mechanism Java uses to organize code and avoid name clashes. A package groups related classes and interfaces, and the classpath (or module path in JPMS) tells the JVM where to find them.

Code: StringUtils.java (com.example.utils)
```java
// File: src/com/example/utils/StringUtils.java
package com.example.utils;

public class StringUtils {
    public static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
```

Code: MainApp.java (com.example.app)
```java
// File: src/com/example/app/MainApp.java
package com.example.app;

import com.example.utils.StringUtils;

public class MainApp {
    public static void main(String[] args) {
        System.out.println(StringUtils.isBlank(""));       // true
        System.out.println(StringUtils.isBlank("  "));     // true
        System.out.println(StringUtils.isBlank("hello"));  // false
    }
}
```

### Line-by-line explanation

- StringUtils.java
  - line 1: package com.example.utils; — Declares the package name. This organizes the class within a namespace.
  - line 3: public class StringUtils { — Begins the StringUtils class.
  - line 4: public static boolean isBlank(String s) { — Declares a utility method that can be called without an instance.
  - line 5: return s == null || s.trim().isEmpty(); — Checks for null or whitespace-only input.
  - line 6: } — Closes the method.
  - line 7: } — Closes the class.

- MainApp.java
  - line 1: package com.example.app; — Declares the MainApp’s package.
  - line 3: import com.example.utils.StringUtils; — Imports a class from another package.
  - line 5: public class MainApp { — Begins the MainApp class.
  - line 6: public static void main(String[] args) { — Entry point of the application.
  - line 7-9: System.out.println(...) — Demonstrates using the utility method with different inputs.
  - line 10: } — Closes main.
  - line 11: } — Closes the class.

Notes:
- Directory layout (for standard Java projects) should mirror the package structure: src/com/example/utils/StringUtils.java and src/com/example/app/MainApp.java.
- The classpath is resolved at compile and run time to locate packages. Modern builds usually replace manual classpath handling with a build tool.

## 2. Java Modules (JPMS) and module-info.java

Java Platform Module System (JPMS) introduces modules to explicitly declare dependencies and exports. This provides better encapsulation, faster startup, and clearer boundaries between components.

Code: Module for utilities (module com.example.utils)
```java
// File: mods/com.example.utils/module-info.java
module com.example.utils {
    exports com.example.utils;
}
```

Code: StringUtils.java for the utils module (as above, but you’ll place it under the module)
```java
// File: mods/com.example.utils/com/example/utils/StringUtils.java
package com.example.utils;

public class StringUtils {
    public static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
```

Code: Module for the application (module com.example.app)
```java
// File: mods/com.example.app/module-info.java
module com.example.app {
    requires com.example.utils;
    exports com.example.app;
    exports com.example.app.api;
}
```

Code: ApiService.java (com.example.app.api)
```java
// File: mods/com.example.app/com/example/app/api/ApiService.java
package com.example.app.api;

public class ApiService {
    public String greet(String name) {
        return "Hello, " + name + "!";
    }
}
```

Code: Main.java (com.example.app)
```java
// File: mods/com.example.app/com/example/app/Main.java
package com.example.app;

import com.example.app.api.ApiService;
import com.example.utils.StringUtils;

public class Main {
    public static void main(String[] args) {
        ApiService svc = new ApiService();
        System.out.println(svc.greet("World"));
        System.out.println(StringUtils.isBlank(""));
    }
}
```

### Line-by-line explanation

- module-info.java for com.example.utils
  - line 1: module com.example.utils { — Declares a module named com.example.utils.
  - line 2: exports com.example.utils; — Exposes only the package com.example.utils to other modules. Encapsulation is enforced for non-exported packages.

- StringUtils.java (in com.example.utils module)
  - same as Section 1 StringUtils.java, but located under the module’s location so it’s part of the module.

- module-info.java for com.example.app
  - line 1: module com.example.app { — Declares a module named com.example.app.
  - line 2: requires com.example.utils; — States that this module depends on the com.example.utils module.
  - line 3: exports com.example.app; — Exposes the com.example.app package to other modules.
  - line 4: exports com.example.app.api; — Exposes the API package to other modules.

- ApiService.java
  - line 1: package com.example.app.api; — Declares a package in the app module.
  - line 3: public class ApiService { — Defines a simple API service class.
  - line 4: public String greet(String name) { — A greeting method.
  - line 5: return "Hello, " + name + "!"; — Returns a friendly string.

- Main.java
  - line 1: package com.example.app; — Main class package.
  - line 3: import com.example.app.api.ApiService; — Uses a class from the app.api package.
  - line 4: import com.example.utils.StringUtils; — Uses a class from the utils package (requires com.example.utils).
  - line 7: ApiService svc = new ApiService(); — Creates a service instance.
  - line 8: System.out.println(svc.greet("World")); — Uses the service.
  - line 9: System.out.println(StringUtils.isBlank("")); — Uses an exported utility method.

Notes:
- JPMS requires more explicit structure, especially for multi-module projects. The module path (instead of classpath) is used at runtime.
- To compile and run, you must place modules on the module path and invoke with --module-path and -m arguments.
- This example demonstrates a clean boundary: api and util packages are exported; internal packages (if any) can stay non-exported.

Commands (illustrative; adapt file layout to your environment):
- Compile utilities module:
  javac -d mods/com.example.utils mods/com.example.utils/module-info.java mods/com.example.utils/com/example/utils/StringUtils.java

- Compile app module (and its dependencies) with module path:
  javac -d mods --module-path mods -sourcepath src -m com.example.app/com.example.app.Main

- Run the modular application:
  java --module-path mods -m com.example.app/com.example.app.Main

Notes:
- In real projects you typically use a build tool to automate module layout, compilation, and bootstrapping.

## 3. Dependency Management with Maven and Gradle

Managing dependencies reliably is essential in backend systems. Maven and Gradle are the two most common build tools in Java. They handle transitive dependencies, version conflicts, and repository resolution.

Code: Maven pom.xml with a direct dependency (Guava) and a transitive exclusion
```xml
<!-- File: pom.xml -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>

  <dependencies>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>31.1-jre</version>
    </dependency>

    <!-- Example of excluding a transitive dependency -->
    <dependency>
      <groupId>org.apache.commons</groupId>
      <artifactId>commons-io</artifactId>
      <version>2.11.0</version>
      <exclusions>
        <exclusion>
          <groupId>commons-logging</groupId>
          <artifactId>commons-logging</artifactId>
        </exclusion>
      </exclusions>
    </dependency>
  </dependencies>

  <repositories>
    <repository>
      <id>central</id>
      <url>https://repo1.maven.org/maven2/</url>
    </repository>
  </repositories>
</project>
```

Code: Gradle build.gradle (Groovy DSL) with Guava dependency
```groovy
// File: build.gradle
plugins {
    id 'java'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'com.google.guava:guava:31.1-jre'
}
```

### Line-by-line explanation

- pom.xml
  - lines 1-3: XML prologue and model declaration (Maven basics).
  - <groupId>, <artifactId>, <version> — Identify the project coordinates.
  - <dependencies> — Declares runtime and compile-time dependencies.
  - Guava dependency block:
    - <groupId>com.google.guava</groupId>
    - <artifactId>guava</artifactId>
    - <version>31.1-jre</version> — Pulls in Guava for common utilities.
  - Commons IO dependency with an exclusion:
    - <exclusions> and <exclusion> remove a transitive dependency (commons-logging) brought by commons-io.
  - <repositories> central — Specifies where Maven should fetch dependencies.

- build.gradle
  - plugins: Declares this is a Java project.
  - repositories: Points to Maven Central for dependencies.
  - dependencies: Declares Guava as an implementation dependency.

Common notes:
- Transitive dependencies: If A depends on B and B depends on C, Maven/Gradle pulls B and C automatically. Use exclusions or dependencyManagement to resolve conflicts.
- Dependency scopes (Maven) or configurations (Gradle) control visibility and packaging (e.g., test vs compile vs runtime).
- BOMs and dependencyManagement (advanced): Use a Bill of Materials to pin versions consistently across modules.

### Line-by-line explanation (Gradle)
- plugins { id 'java' } — Enables Java-centric tasks (compile, test, jar).
- repositories { mavenCentral() } — Tells Gradle where to fetch dependencies.
- dependencies { implementation 'com.google.guava:guava:31.1-jre' } — Adds Guava to the compile/runtime classpath.

How this matters in real systems:
- Consistent dependency versions prevent "jar hell" across modules and environments.
- Excluding transitive dependencies can avoid runtime conflicts or huge shadow jars.
- In multi-module backends, BOMs help synchronize versions across services.

## 4. Packaging and Artifacts: Building and Running

Build artifacts in Java can be plain JARs on the classpath or modular JARs on the module path. For production backends, you often produce executable jars with dependencies bundled (fat jars) or use containerized deployment with modular boundaries.

Code: Maven shade (fat jar) configuration
```xml
<!-- File: pom.xml (partial, within <project>) -->
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-shade-plugin</artifactId>
      <version>3.3.0</version>
      <executions>
        <execution>
          <phase>package</phase>
          <goals><goal>shade</goal></goals>
          <configuration>
            <transformers>
              <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                <mainClass>com.example.app.Main</mainClass>
              </transformer>
            </transformers>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

Code: Gradle Shadow plugin (fat jar)
```groovy
// File: build.gradle (append to existing file)
plugins {
    id 'com.github.johnrengelman.shadow' version '7.1.2'
}

dependencies {
    implementation 'com.google.guava:guava:31.1-jre'
}

jar {
    manifest {
        attributes 'Main-Class': 'com.example.app.Main'
    }
}

shadowJar {
    // Optional: configure which dependencies to include or minimize
}
```

Code: Running a fat jar (example)
```bash
# Maven
mvn package
java -jar target/my-app-1.0.0.jar

# Gradle
./gradlew shadowJar
java -jar build/libs/my-app-all.jar
```

### Line-by-line explanation

- Maven Shade Plugin
  - line: plugin configuration for maven-shade-plugin — Enables creating a shaded (fat) jar.
  - <phase>package</phase> — Runs during the package phase to produce the jar.
  - <transformers> with ManifestResourceTransformer — Sets the Main-Class in the manifest so the jar can be run with java -jar.
  - <mainClass>com.example.app.Main</mainClass> — Entry point for the application.

- Gradle Shadow plugin
  - plugins { id 'com.github.johnrengelman.shadow' ... } — Applies the Shadow plugin to produce a fat jar.
  - dependencies { implementation ... } — Keeps runtime dependencies in the final artifact.
  - jar { manifest { attributes 'Main-Class': 'com.example.app.Main' } } — Sets the main class for non-shaded jars (useful when running with a minimal jar or for clarity).
  - shadowJar { ... } — Configures the shadow task to customize the fat jar if needed.

Notes:
- Fat/JAR vs modular jar: Fat jars embed dependencies; modular jars rely on the module path at runtime, which can improve startup time and modular integrity but complicates distribution.
- In production, many teams prefer containerized deployments (Docker) and rely on a package manager to manage runtime dependencies, rather than shipping all dependencies in a single jar. The choice depends on ecosystem, team preferences, and deployment requirements.

## X. Common Beginner Mistakes

- Bad vs Good: Package vs Default package
  - Bad:
    - public class Helper { } // Not in a package; poor organization
  - Good:
    - package com.company.util;
      public class Helper { }

- Java Modules without proper module-info
  - Bad:
    - No module-info.java, but you try to export and require in a modular project.
  - Good:
    - Define module com.example.utils { exports com.example.utils; }
      Define module com.example.app { requires com.example.utils; }

- Transitive dependency surprises
  - Bad (unmanaged, version conflict):
    - Two libraries bring conflicting versions of a transitive dependency.
  - Good:
    - Use dependencyManagement/BOM or explicit exclusions to align versions.

- Classpath drift in multi-module projects
  - Bad:
    - Manually juggling jars on classpath across modules.
  - Good:
    - Use Maven/Gradle to build and run multi-module apps consistently.

- Over-reliance on a single large jar
  - Bad:
    - One giant jar containing all code and dependencies (hard to replace or update parts).
  - Good:
    - Modularization with JPMS or clear module boundaries and smaller artefacts.

- Misunderstanding module boundaries
  - Bad:
    - Exporting internal packages or leaking implementation details.
  - Good:
    - Expose only intended public API via modules; hide internals.

## Y. Why This Matters In Real Systems

- Maintainability: Packages and modules enforce clear boundaries between components, making it easier for teams to evolve APIs without breaking clients.
- Build reliability: Dependency management prevents version drift, reduces transitive conflicts, and speeds up CI pipelines.
- Deployment agility: Packaging choices (plain jars vs fat jars vs modular jars) impact startup time, memory usage, and compatibility with different runtimes.
- Evolution and scaling: As systems grow, clean module boundaries and controlled dependencies ease onboarding, testing, and microservice architecture adoption.

## Z. Study Questions

1. What is the difference between a Java package and a module, and how do they help organize code?
2. How does a module specify which packages it exports and which modules it requires?
3. What is a transitive dependency, and how can you manage it in Maven or Gradle?
4. When would you choose a fat jar (shaded jar) vs a modular jar in production?
5. How do you exclude a transitive dependency in Maven? How about in Gradle?

## Exercise

Goal: Build a small modular Java project with dependency management and a fat jar. You’ll create two modules (utils and app), wire them together with JPMS, manage dependencies with Maven, and produce a shaded jar that runs a simple main class.

Part 1: Create a two-module project
- Module com.example.utils
  - StringUtils.java (as in Section 1)
  - module-info.java exporting com.example.utils

- Module com.example.app
  - ApiService.java in com.example.app.api
  - Main.java in com.example.app
  - module-info.java requiring com.example.utils and exporting com.example.app and com.example.app.api

Part 2: Set up Maven-based dependency management
- Create a pom.xml for a top-level project with two modules.
- Add a dependency on Guava (even if unused for this exercise) to illustrate dependency management.
- Demonstrate a transitive dependency exclusion (as in Section 3).

Part 3: Build a shaded jar
- Configure the Maven Shade plugin to produce a fat jar with Main-Class set to the app entry point.
- Build the project and run the shaded jar with java -jar.

Part 4: Run checks
- Run the modular application using the module system (if you’re comfortable) or verify that the shaded jar executes correctly.
- Confirm that Main prints a greeting and demonstrates a StringUtils call.

Deliverables:
- A zip/tarball of the project or a set of commands/scripts to reproduce.
- A short reflection on how modules improved boundaries and how dependency management helped avoid conflicts.

If you’d like, I can provide a ready-to-run sample project layout (with exact file paths, directory structure, and a script to build/run) tailored to your OS and preferred toolchain.