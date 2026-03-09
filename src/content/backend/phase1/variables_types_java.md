# Track: Backend Engineering — Phase 1: Language Foundations — Topic: Variables, Data Types & Operators (Java)

Compelling introductory paragraph:
In backend engineering, data is the lifeblood of systems: requests flow through services, data is transformed, stored, and retrieved, and decisions are made based on numeric calculations and business rules. Mastering variables, data types, and operators in Java is foundational for building reliable, maintainable, and high-performance services. This lesson equips you with the core mental model: how Java represents values, how memory is managed, and how to write predictable arithmetic and data-manipulation code that scales in real-world systems.

## 1. Primitives and Variables in Java

Code example:
```java
public class PrimitivesDemo {
    public static void main(String[] args) {
        // Primitive types (fixed size, not-null)
        int age = 30;
        long views = 12345678901L;
        double balance = 1250.75;
        float interestRate = 3.5f;
        boolean isActive = true;
        char grade = 'A';
        byte small = 12;
        short medium = 32000;

        // Final to express intent (constant)
        final int MAX_RETRIES = 5;

        // Output to verify values
        System.out.println("age = " + age);
        System.out.println("views = " + views);
        System.out.println("balance = " + balance);
        System.out.println("interestRate = " + interestRate);
        System.out.println("isActive = " + isActive);
        System.out.println("grade = " + grade);
        System.out.println("MAX_RETRIES = " + MAX_RETRIES);
    }
}
```

### Line-by-line explanation breaking down each line
- public class PrimitivesDemo { — declares a public class named PrimitivesDemo to host the code.
- public static void main(String[] args) { — program entry point; JVM starts here.
- int age = 30; — declares a primitive int variable and initializes it to 30.
- long views = 12345678901L; — declares a primitive long; the L suffix denotes a long literal.
- double balance = 1250.75; — declares a primitive double for a decimal value.
- float interestRate = 3.5f; — declares a primitive float; the f suffix denotes a float literal.
- boolean isActive = true; — declares a primitive boolean.
- char grade = 'A'; — declares a primitive char representing a single character.
- byte small = 12; — declares a primitive byte (8-bit signed).
- short medium = 32000; — declares a primitive short (16-bit signed).
- final int MAX_RETRIES = 5; — defines a constant; final makes the value immutable after assignment.
- System.out.println(...); — prints the value of each variable to the console for verification.
- } — closes main.
- } — closes class.

## 2. Data Types: Primitive vs Reference

Code example:
```java
public class DataTypesDemo {
    public static void main(String[] args) {
        // Primitive types (no null)
        int primitiveInt = 42;
        boolean primitiveBool = false;

        // Reference types (can be null)
        String message = "Hello, Java!";
        Integer wrapperInt = null; // wrapper type (nullable)
        Double wrapperDouble = 3.14;

        // Array (reference type)
        int[] numbers = new int[]{1, 2, 3, 4, 5};

        // Printing to demonstrate differences
        System.out.println("primitiveInt = " + primitiveInt);
        System.out.println("primitiveBool = " + primitiveBool);
        System.out.println("message = " + message);
        System.out.println("wrapperInt (nullable) = " + wrapperInt);
        System.out.println("wrapperDouble = " + wrapperDouble);
        System.out.println("numbers length = " + numbers.length);
    }
}
```

### Line-by-line explanation breaking down each line
- public class DataTypesDemo { — defines a new class for this demo.
- public static void main(String[] args) { — entry point.
- int primitiveInt = 42; — primitive int, cannot hold null.
- boolean primitiveBool = false; — primitive boolean.
- String message = "Hello, Java!"; — reference type (String object).
- Integer wrapperInt = null; — wrapper type (nullable).
- Double wrapperDouble = 3.14; — wrapper type holding a double value.
- int[] numbers = new int[]{1, 2, 3, 4, 5}; — array is a reference type; hosts multiple ints.
- System.out.println(...); — print values to demonstrate behavior (null vs non-null, and array length).
- } — end main.
- } — end class.

## 3. Type Inference and Casting

Code example:
```java
public class TypeInferenceDemo {
    public static void main(String[] args) {
        // Local variable type inference (Java 10+)
        var count = 10;             // inferred as int
        var message = "Type Inference"; // inferred as String

        // Basic casting between primitives
        int large = 130;
        byte wrapped = (byte) large; // overflow wraps around

        // Implicit vs explicit casting
        int a = 9;
        double b = a;               // implicit widening -> 9.0
        int c = (int) b;            // explicit narrowing -> 9

        // Demonstrate integer vs floating division
        int p = 5;
        int q = 2;
        double div1 = p / q;          // 2.0 (integer division first)
        double div2 = p / (double) q; // 2.5 (floating division)

        System.out.println("count = " + count);
        System.out.println("message = " + message);
        System.out.println("wrapped (overflow) = " + wrapped);
        System.out.println("div1 (int division) = " + div1);
        System.out.println("div2 (float division) = " + div2);
    }
}
```

### Line-by-line explanation breaking down each line
- public class TypeInferenceDemo { — declares a class to contain this demo.
- public static void main(String[] args) { — entry point.
- var count = 10; — local variable type inference; count is int.
- var message = "Type Inference"; — message inferred as String.
- int large = 130; byte wrapped = (byte) large; — explicit narrowing cast; may overflow.
- int a = 9; double b = a; — widening primitive conversion; 9 becomes 9.0.
- int c = (int) b; — narrowing back to int; still 9.
- int p = 5; int q = 2; double div1 = p / q; — integer division first yields 2.0 when assigned to double.
- double div2 = p / (double) q; — correct floating division, 2.5.
- System.out.println(...); — output results.
- } — end main.
- } — end class.

Note: Local variable type inference (var) is available from Java 10 onward. For older runtimes, replace var with explicit types.

## 4. Operators: Arithmetic, Assignment, Comparison, Logical

Code example:
```java
public class OperatorsDemo {
    public static void main(String[] args) {
        int a = 7;
        int b = 3;

        // Arithmetic
        int sum = a + b;
        int diff = a - b;
        int prod = a * b;
        double quot = a / (double) b; // force floating division
        int rem = a % b; // remainder

        // Assignment and increments
        int x = 5;
        x += 4; // x = x + 4
        ++x;    // pre-increment
        x++;    // post-increment

        // Comparisons
        boolean greater = a > b;
        boolean equal = a == b;
        boolean notEqual = a != b;

        // Logical
        boolean both = (a > 5) && (b < 5);
        boolean either = (a > 10) || (b < 5);

        System.out.println("sum = " + sum);
        System.out.println("diff = " + diff);
        System.out.println("prod = " + prod);
        System.out.println("quot = " + quot);
        System.out.println("rem = " + rem);
        System.out.println("x = " + x);
        System.out.println("greater = " + greater);
        System.out.println("both = " + both);
        System.out.println("either = " + either);
    }
}
```

### Line-by-line explanation breaking down each line
- public class OperatorsDemo { — declares a class for operator demonstrations.
- public static void main(String[] args) { — entry point.
- int a = 7; int b = 3; — initialize operands for operations.
- int sum = a + b; — addition.
- int diff = a - b; — subtraction.
- int prod = a * b; — multiplication.
- double quot = a / (double) b; — floating-point division.
- int rem = a % b; — modulus (remainder).
- int x = 5; x += 4; ++x; x++; — compound assignment and increments.
- boolean greater = a > b; boolean equal = a == b; boolean notEqual = a != b; — comparisons.
- boolean both = (a > 5) && (b < 5); boolean either = (a > 10) || (b < 5); — logical operators.
- System.out.println(...); — print results.
- } — end main.
- } — end class.

## 5. Strings and Character Data

Code example:
```java
public class StringsDemo {
    public static void main(String[] args) {
        String first = "Backend";
        String second = "Engineering";

        // Concatenation
        String combined = first + " " + second;

        // Basic string operations
        String upper = combined.toUpperCase();
        int len = combined.length();

        // Character data
        char dash = '-';
        boolean hasE = combined.indexOf('E') >= 0;

        // Efficient string building for multiple concatenations
        StringBuilder sb = new StringBuilder();
        for (char c : combined.toCharArray()) {
            if (c != ' ') sb.append(c);
        }
        String noSpaces = sb.toString();

        System.out.println("combined = " + combined);
        System.out.println("upper = " + upper);
        System.out.println("length = " + len);
        System.out.println("noSpaces = " + noSpaces);
        System.out.println("hasE = " + hasE);
    }
}
```

### Line-by-line explanation breaking down each line
- public class StringsDemo { — declares a class for string/char operations.
- public static void main(String[] args) { — entry point.
- String first = "Backend"; String second = "Engineering"; — two string literals.
- String combined = first + " " + second; — concatenation producing "Backend Engineering".
- String upper = combined.toUpperCase(); — converts to uppercase.
- int len = combined.length(); — length of the combined string.
- char dash = '-'; — example of a character primitive.
- boolean hasE = combined.indexOf('E') >= 0; — checks for presence of 'E'.
- StringBuilder sb = new StringBuilder(); for (char c : combined.toCharArray()) { if (c != ' ') sb.append(c); } String noSpaces = sb.toString(); — efficient string manipulation to remove spaces.
- System.out.println(...); — print results.
- } — end main.
- } — end class.

## X. Common Beginner Mistakes

Pitfall 1: Comparing strings with ==
Bad:
```java
public class StringCompareBad {
    public static void main(String[] args) {
        String a = new String("hello");
        String b = new String("hello");
        boolean same = (a == b); // compares references
        System.out.println("same? " + same);
    }
}
```

Good:
```java
public class StringCompareGood {
    public static void main(String[] args) {
        String a = new String("hello");
        String b = new String("hello");
        boolean same = a.equals(b); // value-based comparison
        System.out.println("same? " + same);
    }
}
```

Pitfall 2: Null dereference with autoboxing
Bad:
```java
public class AutoBoxingNpeBad {
    public static void main(String[] args) {
        Integer x = null;
        int y = x; // NPE during unboxing
        System.out.println(y);
    }
}
```

Good:
```java
public class AutoBoxingNpeGood {
    public static void main(String[] args) {
        Integer x = null;
        int y = (x != null) ? x : 0; // safe unwrap with default
        System.out.println(y);
    }
}
```

Pitfall 3: Integer division vs floating-point division
Bad:
```java
public class IntDivisionBad {
    public static void main(String[] args) {
        int a = 5;
        int b = 2;
        double c = a / b; // 2.0 due to integer division
        System.out.println(c);
    }
}
```

Good:
```java
public class IntDivisionGood {
    public static void main(String[] args) {
        int a = 5;
        int b = 2;
        double c = a / (double) b; // 2.5
        System.out.println(c);
    }
}
```

Pitfall 4: Off-by-one errors in loops
Bad:
```java
public class LoopOffByOneBad {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3};
        for (int i = 0; i <= arr.length; i++) {
            System.out.println(arr[i]); // throws ArrayIndexOutOfBoundsException
        }
    }
}
```

Good:
```java
public class LoopOffByOneGood {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3};
        for (int i = 0; i < arr.length; i++) {
            System.out.println(arr[i]);
        }
    }
}
```

## Y. Why This Matters In Real Systems

- Correctness and predictability: Primitives guarantee memory layout and performance, while references and autoboxing introduce nullability concerns and potential boxing overhead. Real systems must minimize surprises in edge cases (nulls, overflow, division semantics) to avoid bugs in business logic, financial calculations, or data transformations.
- Performance considerations: Excessive boxing/unboxing or unnecessary object allocations can trigger GC pressure in high-throughput services. Prefer primitive types when possible and only box when you need nullability or generic containers.
- Null safety and API design: Java’s type system helps enforce contracts. Using Optional, explicit null checks, and clear bounds reduces runtime NPEs in service layers and data pipelines.
- Data modeling implications: Data types align with domain concepts (integers for IDs, long for timestamps, BigDecimal for money, boolean flags). Choosing the right type affects storage, serialization, and API contracts.
- String handling and performance: Immutable strings lead to concatenation pitfalls in tight loops. Use StringBuilder for heavy concatenation, and be mindful of locale-sensitive operations in production-grade code.
- Real-world patterns: In services, you’ll frequently see primitives for core calculations, wrappers for optional values, and robust casting practices to guard against format or data-type mismatches when converting between layers or talking to databases.

## Z. Study Questions

1) What is the difference between a primitive type and a wrapper/reference type in Java? Give an example of when you would use each.

2) How would you obtain a floating-point result from two integers without losing precision? Provide a code example.

3) Why should you avoid using == to compare strings? What method should you use instead?

4) What is autoboxing? Provide a scenario where it could cause a NullPointerException and how to prevent it.

5) How can you safely convert a double value to an int in Java, and why might you want to do this carefully?

## Exercise

Practical multi-part coding challenge: VariableLab and friends

Objective:
Build a single Java file that demonstrates primitive types, reference types, type inference, casting, and basic string/array operations. You will implement a small playground that prints computed values and demonstrates safe handling of nulls and division.

Part A — Primitive and basic operations
- Create a class VariableLab with a main method.
- Declare and initialize one value for each primitive type (byte, short, int, long, float, double, boolean, char).
- Print each value and verify types via operations (e.g., arithmetic or boolean logic).

Part B — String and array handling
- Create two string literals, concatenate them with a space, convert to uppercase, and print length.
- Create an int[] array with five numbers, compute sum and average (as double), print results.

Part C — Type inference and casting
- Use var (Java 10+) to declare a few local variables, then demonstrate explicit casting between int and double.
- Show an overflow example by casting a large int to a byte.

Part D — Null safety and conditional logic
- Demonstrate a nullable wrapper (Integer) and safely convert to a primitive int with a default if null.
- Implement a small safeDivide(int a, int b) method that returns a double and handles division by zero by returning 0.0.

Part E — Putting it all together
- Use the pieces above in a cohesive main flow that prints a short “summary” line about the kinds of values used.

Instructions:
- Save as VariableLab.java.
- Compile: javac VariableLab.java
- Run: java VariableLab
- Expected outcomes: you should see outputs for all primitives, strings, arrays, inference results, and safe division results.

Sample starter scaffold (you’ll fill in the full logic):
```java
public class VariableLab {
    public static void main(String[] args) {
        // Part A: primitives
        byte by = 1;
        short sh = 300;
        int i = 1000;
        long lng = 5000000000L;
        float f = 1.23f;
        double d = 4.56;
        boolean flag = true;
        char ch = 'K';

        // Print Part A results
        System.out.println("primitives: " + by + ", " + sh + ", " + i + ", " + lng +
                           ", " + f + ", " + d + ", " + flag + ", " + ch);

        // Part B: strings and arrays
        String a = "Backend";
        String b = "Engineering";
        String combined = (a + " " + b).toUpperCase();
        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : nums) sum += n;
        double avg = sum / (double) nums.length;

        System.out.println("combined = " + combined);
        System.out.println("sum = " + sum);
        System.out.println("avg = " + avg);

        // Part C: type inference and casting
        var inferredInt = 42; // int
        var inferredStr = "Type inference";
        int casted = (int) (inferredInt * 2.5); // demo cast

        int overflow = (byte) 130; // overflow example
        System.out.println("inferredInt=" + inferredInt + ", inferredStr=" + inferredStr +
                           ", casted=" + casted + ", overflow=" + overflow);

        // Part D: null safety
        Integer maybe = null;
        int safeVal = (maybe != null) ? maybe : 0;
        System.out.println("safeVal = " + safeVal);

        System.out.println("safeDivide(5, 2) = " + safeDivide(5, 2));
        System.out.println("safeDivide(5, 0) = " + safeDivide(5, 0));
    }

    public static double safeDivide(int a, int b) {
        if (b == 0) return 0.0;
        return a / (double) b;
    }
}
```

Notes:
- Ensure you are using a Java runtime that supports var (Java 10+) for Part C. If not, replace var with explicit types.
- This exercise reinforces the memory-safe, type-safe foundations you’ll rely on when building backend services, microservices, and data processing pipelines.