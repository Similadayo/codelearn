# Track: Backend Engineering — Phase 1: Language Foundations — Topic: Functions, Scope & Closures (Java)

Java's functions, scope rules, and closures form the backbone of clean, maintainable backend systems. Understanding how methods (functions), local/global scope, and closures (via lambdas and inner classes) interact helps you write thread-safe APIs, design predictable APIs, and reason about memory usage in production services. In this module, we’ll cover how Java handles function definitions, parameter passing, different scopes, and the closure model introduced by lambdas. You’ll see practical code, line-by-line breakdowns, common beginner traps, and a hands-on exercise to cement these concepts in a real-world style.

## 1. Functions and Methods in Java

Java treats functions as methods on classes. You’ll see instance methods (on objects) and static methods (on the class itself). Understanding how to declare and invoke both types is essential for building reusable APIs, utility helpers, and service components.

```java
// File: FunctionsExample.java
public class FunctionsExample {
    // Instance method
    public int add(int a, int b) {
        return a + b;
    }

    // Static method
    public static int mul(int x, int y) {
        return x * y;
    }

    public static void main(String[] args) {
        FunctionsExample obj = new FunctionsExample();
        int sum = obj.add(5, 7);
        int product = mul(3, 4);
        System.out.println("sum=" + sum + ", product=" + product);
    }
}
```

### Line-by-line explanation
- 1: public class FunctionsExample { — Declares a public class named FunctionsExample.
- 3: public int add(int a, int b) { — Defines an instance method add that takes two ints and returns their sum.
- 4: return a + b; — Returns the sum of a and b.
- 5: } — Closes the add method.
- 8: public static int mul(int x, int y) { — Defines a static method mul that takes two ints and returns their product.
- 9: return x * y; — Returns the product of x and y.
- 10: } — Closes the mul method.
- 12: public static void main(String[] args) { — Entry point; static so it can run without an instance.
- 13: FunctionsExample obj = new FunctionsExample(); — Creates an instance to call the instance method.
- 14: int sum = obj.add(5, 7); — Calls the instance method add and stores the result.
- 15: int product = mul(3, 4); — Calls the static method mul and stores the result.
- 16: System.out.println("sum=" + sum + ", product=" + product); — Prints the results.
- 17: } — Closes main.
- 18: } — Closes the class.

## 2. Parameter Passing and Return Values

Java uses pass-by-value semantics for primitive types and object references. This means the value of a primitive is copied, and the reference to an object is copied (not the object itself). Understanding this helps you predict behavior when methods try to mutate parameters, and when to use return values vs. mutation.

```java
// File: PassByValueDemo.java
public class PassByValueDemo {
    // Modifies a primitive parameter (has no effect outside)
    public void increment(int x) {
        x = x + 1;
    }

    // Mutates the state of a referenced object
    public void mutate(Point p) {
        p.x = p.x + 1;
    }

    public static void main(String[] args) {
        PassByValueDemo d = new PassByValueDemo();

        int a = 5;
        d.increment(a);
        System.out.println("a=" + a); // a remains 5

        Point pt = new Point(10, 20);
        d.mutate(pt);
        System.out.println("pt.x=" + pt.x); // pt.x becomes 11
    }
}

// Simple helper class for demonstration
class Point {
    int x;
    int y;
    Point(int x, int y) { this.x = x; this.y = y; }
}
```

### Line-by-line explanation
- 1: public class PassByValueDemo { — Declares a public class for demonstration.
- 3: public void increment(int x) { — Defines a method that attempts to increment a primitive parameter.
- 4: x = x + 1; — Increments the local copy of x; does not affect the caller.
- 5: } — Closes the increment method.
- 7: public void mutate(Point p) { — Defines a method that mutates the passed object's state.
- 8: p.x = p.x + 1; — Mutates the x field of the referenced Point object.
- 9: } — Closes the mutate method.
- 11: public static void main(String[] args) { — Entry point for the demo.
- 12: PassByValueDemo d = new PassByValueDemo(); — Creates an instance.
- 14: int a = 5; — Declares and initializes a primitive.
- 15: d.increment(a); — Calls a method that cannot modify the caller's primitive.
- 16: System.out.println("a=" + a); // a remains 5 — Prints the unchanged value.
- 18: Point pt = new Point(10, 20); — Creates a Point object.
- 19: d.mutate(pt); — Calls a method that mutates the object's internal state.
- 20: System.out.println("pt.x=" + pt.x); // pt.x becomes 11 — Shows the mutation in action.
- 23: class Point { — Simple helper class used in the demo.
- 24: int x; int y; — Fields for coordinates.
- 25: Point(int x, int y) { this.x = x; this.y = y; } — Constructor.
- 26: } — Closes Point.
- 28: } — Closes PassByValueDemo.

## 3. Scope Rules: Local, Instance, and Static

Java has clear scoping rules: local variables live inside blocks, instance fields belong to an object, and static fields belong to the class. Knowing what can be accessed where helps you design clean APIs and avoid illegal access or shadowing bugs.

```java
// File: ScopeExample.java
public class ScopeExample {
    private int instanceVar = 1;       // instance field
    private static int staticVar = 100; // static (class) field

    public void demonstrate() {
        int localVar = 10; // local variable

        if (localVar > 5) {
            int blockVar = 99; // block-scoped inside the if
            System.out.println(blockVar);
        }

        // System.out.println(blockVar); // compile-time error: blockVar not visible here

        System.out.println(instanceVar); // access to instance field
        System.out.println(staticVar);   // access to static field
        // localVar is not accessible outside demonstrate()
    }

    public static void main(String[] args) {
        new ScopeExample().demonstrate();
    }
}
```

### Line-by-line explanation
- 1: public class ScopeExample { — Declares the class.
- 3: private int instanceVar = 1; — Instance field; each object gets its own copy.
- 4: private static int staticVar = 100; — Static field; shared by all instances.
- 6: public void demonstrate() { — Instance method to illustrate scope.
- 7: int localVar = 10; — Local variable limited to this method block.
- 9: if (localVar > 5) { — Conditional block.
- 10: int blockVar = 99; — Block-scoped variable; only valid within the if block.
- 11: System.out.println(blockVar); — Prints blockVar inside the block.
- 14: System.out.println(instanceVar); — Accesses the instance field.
- 15: System.out.println(staticVar); — Accesses the static field.
- 16: // localVar is accessible only within demonstrate()
- 18: public static void main(String[] args) { — Entry point.
- 19: new ScopeExample().demonstrate(); — Creates an instance to run demonstrate().
- 20: } — Closes main.
- 21: } — Closes ScopeExample.

## 4. Closures in Java: Lambdas and Effectively Final

Java closures are realized through lambda expressions and anonymous inner classes. A key rule: captured local variables must be effectively final (they cannot be reassigned after being captured). This makes closures deterministic and helps with thread-safety in many scenarios. Lambdas also allow capturing references to mutable objects, which is a common technique for building flexible APIs, but you must manage synchronization if those objects are shared across threads.

```java
// File: ClosureDemo.java
import java.util.function.Supplier;

public class ClosureDemo {
    // Basic closure capturing an effectively final variable
    public static Supplier<String> createGreeting(String name) {
        final String greeting = "Hello, " + name; // effectively final
        return () -> greeting; // lambda capturing greeting
    }

    public static void main(String[] args) {
        Supplier<String> s = createGreeting("Alice");
        System.out.println(s.get()); // Hello, Alice
    }
}
```

### Line-by-line explanation
- 1: import java.util.function.Supplier; — Imports the functional interface used for the lambda.
- 3: public class ClosureDemo { — Declares the class.
- 5: public static Supplier<String> createGreeting(String name) { — Method returning a closure (lambda) that supplies a String.
- 6: final String greeting = "Hello, " + name; — Captured variable; declared final to emphasize immutability for the closure.
- 7: return () -> greeting; — Lambda capturing the greeting variable.
- 9: public static void main(String[] args) { — Entry point.
- 10: Supplier<String> s = createGreeting("Alice"); — Creates the closure.
- 11: System.out.println(s.get()); — Invokes the closure to retrieve the greeting.
- 12: } — Closes main.
- 13: } — Closes ClosureDemo.

```java
// File: ClosureMutableDemo.java
import java.util.function.Supplier;

public class ClosureMutableDemo {
    public static Supplier<String> makeCounter() {
        int counterValue = 0;
        // The following line would fail to compile if we tried to reassign 'counterValue' after capturing:
        // counterValue++;
        return () -> "counter=" + counterValue;
    }

    public static void main(String[] args) {
        Supplier<String> s = makeCounter();
        System.out.println(s.get()); // counter=0
    }
}
```

### Line-by-line explanation
- 1: import java.util.function.Supplier; — Imports Supplier.
- 3: public class ClosureMutableDemo { — Declares the class.
- 5: public static Supplier<String> makeCounter() { — Method returning a closure.
- 6: int counterValue = 0; — Local variable captured by the lambda.
- 7-8: // counterValue++; — This commented line shows that attempting to modify the captured variable after the lambda creation would cause a compile error if counterValue weren’t already effectively final.
- 9: return () -> "counter=" + counterValue; — Lambda capturing a effectively final local.
- 13: public static void main(String[] args) { — Entry point.
- 14: Supplier<String> s = makeCounter(); — Creates the closure.
- 15: System.out.println(s.get()); — Executes the closure.
- 16: } — Closes main.
- 17: } — Closes ClosureMutableDemo.

Notes:
- Java requires captured locals to be effectively final. If you need true mutability inside a closure, use a mutable holder object (e.g., a final array, an AtomicInteger, or a dedicated mutable wrapper) and capture that reference instead of reassigning the local variable itself.

## X. Common Beginner Mistakes

- Pitfall 1: Capturing a non-final loop variable in a lambda (compile error)
  - Bad:
    ```java
    import java.util.List;
    public class BadLambdaCap {
        public static void main(String[] args) {
            List<String> items = List.of("a", "b", "c");
            List<Runnable> tasks = new java.util.ArrayList<>();
            for (int i = 0; i < items.size(); i++) {
                tasks.add(() -> System.out.println(i + ": " + items.get(i)));
            }
            tasks.forEach(Runnable::run);
        }
    }
    ```
  - Good:
    ```java
    import java.util.List;
    public class GoodLambdaCap {
        public static void main(String[] args) {
            List<String> items = List.of("a", "b", "c");
            List<Runnable> tasks = new java.util.ArrayList<>();
            for (int i = 0; i < items.size(); i++) {
                final int index = i;
                tasks.add(() -> System.out.println(index + ": " + items.get(index)));
            }
            tasks.forEach(Runnable::run);
        }
    }
    ```
  - Why it matters: The loop variable changes each iteration; lambdas capture the variable itself, not a snapshot value, which makes it effectively final for each iteration only when you introduce a new final binding.

- Pitfall 2: Shadowing instance fields with parameters (accidentally overwriting values)
  - Bad:
    ```java
    public class ShadowDemo {
        private int value = 10;
        public void setValue(int value) { // parameter shadows field
            value = value; // assigns to parameter, not to this.value
        }
    }
    ```
  - Good:
    ```java
    public class ShadowDemo {
        private int value = 10;
        public void setValue(int value) {
            this.value = value; // assign the parameter to the instance field
        }
    }
    ```
  - Why it matters: Shadowing hides the outer field, leading to logic bugs. Using this.value makes intent explicit.

- Pitfall 3: Static methods accessing instance fields directly
  - Bad:
    ```java
    public class StaticAccess {
        private int x = 5;
        public static void printX() {
            System.out.println(x); // illegal: cannot access instance field from static context
        }
    }
    ```
  - Good:
    ```java
    public class StaticAccess {
        private int x = 5;
        public void printX() {
            System.out.println(this.x);
        }
        public static void main(String[] args) {
            new StaticAccess().printX();
        }
    }
    ```
  - Why it matters: Static context has no implicit reference to a particular instance; use an instance method or pass the instance as a parameter.

- Pitfall 4: Incorrectly attempting to mutate captured primitive inside a lambda
  - Bad:
    ```java
    import java.util.function.Supplier;
    public class BadMutateCapture {
        public static Supplier<String> make() {
            int value = 0;
            // value++; // compile error: value must be effectively final to be captured
            return () -> "value=" + value;
        }
    }
    ```
  - Good:
    ```java
    import java.util.function.Supplier;
    public class GoodMutateCapture {
        public static Supplier<String> make() {
            final int value = 0;
            return () -> "value=" + value;
        }
    }
    ```
  - Why it matters: Captured locals are not mutable inside the lambda; use a mutable holder if you need to reflect updates.

- Pitfall 5: Dangling checked exceptions in lambdas with non-throwing interfaces
  - Bad:
    ```java
    public class BadExceptionInLambda {
        public static void main(String[] args) {
            Runnable r = () -> {
                try {
                    throw new java.io.IOException("boom"); // cannot throw checked exception from Runnable
                } catch (Exception e) {
                    // handle
                }
            };
            r.run();
        }
    }
    ```
  - Good:
    ```java
    public class GoodExceptionInLambda {
        public static void main(String[] args) {
            Runnable r = () -> {
                throw new RuntimeException("boom"); // wrap or convert to unchecked
            };
            r.run();
        }
    }
    ```
  - Why it matters: Lambdas can only throw unchecked exceptions unless the functional interface method declares checked exceptions. If you need to propagate checked exceptions, wrap them or create a custom functional interface.

## Y. Why This Matters In Real Systems

- Predictable behavior: Understanding pass-by-value and scope helps you reason about method calls, thread-safety, and side effects, which are crucial in APIs and libraries.
- Performance and memory: Closures capture references that can extend the lifetime of objects. Avoid retaining large object graphs in long-lived closures (e.g., in thread pools or caches) to prevent memory leaks.
- Concurrency and correctness: Capturing effectively final variables is a core pattern for thread-safe code. When you mutate captured state, you must synchronize or use thread-safe wrappers to avoid data races.
- API design: Lambdas and functional interfaces enable expressive pipelines (streams, request-handling, event processing). Clear understanding of scope and closures helps you design robust, composable APIs for backend services.

## Z. Study Questions

1) What does it mean for a captured variable to be effectively final in a lambda? Why is this important?  
2) How does Java distinguish between instance scope and static scope? Give an example where a static method cannot access an instance field directly.  
3) Explain the difference between mutating an object via a passed reference versus reassigning a local variable captured by a lambda.  
4) Why might shadowing a field with a method parameter lead to bugs? How can you prevent this?  
5) In a production service, what are the risks of large closures in long-lived threads or tasks? How would you mitigate them?

## Exercise

Part A — Function application and lambdas
- Implement a small utility class that can apply a binary operation (add, subtract, multiply) to two integers using a functional interface.
- Create a method that returns a closure (lambda) capturing a final greeting string and use it to print a greeting.

Part B — Scope and closures in practice
- Build a small demo with an instance field, a static field, and a local variable. Create a lambda that uses these fields and demonstrate that modifying the local within the method is not allowed after capture, while mutating a captured mutable object is possible if you wrap it.

Part C — Closure in a loop (correct pattern)
- Create a list of strings, and build a list of Runnable tasks where each task prints its own index and the corresponding string. Ensure there is no captured loop variable issue.

Part D — Exercise solution (complete runnable class)
- Implement the following single file as a runnable Java program (no external libraries):
  - A static method applyOperation(int a, int b, IntBinaryOperator op) that applies op to a and b.
  - A static method greetWithName(String name) that returns a Supplier<String> with a captured final greeting.
  - A static method createPrintTasks(List<String> items) that returns a List<Runnable> printing "index: value" for each item, with proper per-iteration capture.
  - A main method that demonstrates all of the above, with console output matching the expected results.

Starter code (you can copy, modify, and expand):
```java
import java.util.*;
import java.util.function.*;

public class ExerciseFunctionsScopeClosures {
    // Part A
    public static int applyOperation(int a, int b, IntBinaryOperator op) {
        return op.applyAsInt(a, b);
    }

    // Part A & B
    public static Supplier<String> greetWithName(String name) {
        final String greeting = "Hi " + name;
        return () -> greeting;
    }

    // Part C
    public static List<Runnable> createPrintTasks(List<String> items) {
        List<Runnable> tasks = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            final int index = i;
            tasks.add(() -> System.out.println(index + ": " + items.get(index)));
        }
        return tasks;
    }

    public static void main(String[] args) {
        // Part A demo
        int sum = applyOperation(6, 3, (a, b) -> a + b);
        int prod = applyOperation(6, 3, (a, b) -> a * b);
        System.out.println("sum=" + sum + ", prod=" + prod);

        // Part B demo
        java.util.function.Supplier<String> greet = greetWithName("Niko");
        System.out.println(greet.get());

        // Part C demo
        List<String> words = Arrays.asList("alpha", "beta", "gamma");
        List<Runnable> tasks = createPrintTasks(words);
        for (Runnable t : tasks) t.run();
    }
}
```

Expected outputs when you run the Exercise:
- sum=9, prod=18
- Hi Niko
- 0: alpha
- 1: beta
- 2: gamma

End of lesson.