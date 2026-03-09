# Track: Backend Engineering — Phase 1: Language Foundations — Control Flow: Conditions & Loops in Java

Control flow is the heartbeat of every program. In backend services, decisions shape authorization, routing, data validation, and error handling, while loops power batch processing, pagination, and streaming data. Mastering conditions and loops in Java gives you a robust toolkit to implement correct, efficient, and maintainable server-side logic.

## 1. Conditional Basics with if/else

Java’s if/else lets you branch behavior based on boolean expressions. This section covers simple, nested, and short-circuit patterns you’ll use to enforce business rules, input validation, and feature toggles.

```java
public class ConditionalExamples {
    public static void printAccess(boolean isMember, int age) {
        if (!isMember) {
            System.out.println("Access denied: members only.");
        } else if (age < 18) {
            System.out.println("Access restricted: under 18.");
        } else {
            System.out.println("Access granted.");
        }
    }

    public static void main(String[] args) {
        printAccess(true, 20);
        printAccess(false, 30);
        printAccess(true, 15);
    }
}
```

### Line-by-line explanation
1. public class ConditionalExamples { — Declares a public class named ConditionalExamples.
2.     public static void printAccess(boolean isMember, int age) { — Defines a static method printAccess that takes isMember and age.
3.         if (!isMember) { — If the user is not a member, take this branch.
4.             System.out.println("Access denied: members only."); — Print denial message.
5.         } else if (age < 18) { — Otherwise, if the user is under 18, take this branch.
6.             System.out.println("Access restricted: under 18."); — Print restriction message.
7.         } else { — If neither condition holds, grant access.
8.             System.out.println("Access granted."); — Print grant message.
9.         } — End of conditional chain.
10.     } — End of printAccess method.
11.
12.     public static void main(String[] args) { — Entry point for demonstration.
13.         printAccess(true, 20); — Expected: Access granted.
14.         printAccess(false, 30); — Expected: Access denied.
15.         printAccess(true, 15); — Expected: Access restricted.
16.     } — End of main.
17. } — End of class.
```

X. Line-by-line explanation
- See lines 1–17 above for the flow. The key ideas are:
  - Use if to check a condition, else if for a secondary condition, and else for the default path.
  - The not operator (!) in line 3 flips the boolean value.
  - This pattern supports clear, readable decision logic in backend gates (auth, validation, feature flags).

## 2. Using the Ternary Operator and Boolean Expressions

The ternary operator provides a compact form of simple conditional selection. It’s useful for straightforward decisions inside expressions, but avoid overuse for complex logic to keep readability.

```java
public class TernaryExamples {
    public static String grade(int score) {
        return score >= 90 ? "A" :
               score >= 80 ? "B" :
               score >= 70 ? "C" : "D";
    }

    public static void main(String[] args) {
        System.out.println(grade(92)); // A
        System.out.println(grade(76)); // C
    }
}
```

### Line-by-line explanation
1. public class TernaryExamples { — Declares a public class named TernaryExamples.
2.     public static String grade(int score) { — Defines grade method returning a letter grade.
3.         return score >= 90 ? "A" : — If score >= 90, return "A"; otherwise evaluate the next condition.
4.                score >= 80 ? "B" : — If score >= 80, return "B"; otherwise evaluate the next condition.
5.                score >= 70 ? "C" : "D"; — If score >= 70, return "C"; else return "D".
6.     } — End of grade method.
7.
8.     public static void main(String[] args) { — Entry point for demonstration.
9.         System.out.println(grade(92)); // A — Demonstrates output.
10.        System.out.println(grade(76)); // C — Demonstrates output.
11.    } — End of main.
12. } — End of class.
```

Why use it: The ternary operator keeps simple, inline decisions tight. In production code, use it sparingly to avoid nested, hard-to-read expressions. In parameterized logging or UI message selection, it’s handy for concise code.

## 3. Switch Statements (including Strings)

Switch is excellent for handling mutually exclusive categories. Modern Java supports strings (since Java 7) and can even use switch expressions in newer versions for concise mapping. Here we cover a traditional switch with strings.

```java
public class SwitchExamples {
    public static String dayType(String day) {
        if (day == null) return "Unknown";
        switch (day.toLowerCase()) {
            case "saturday":
            case "sunday":
                return "Weekend";
            default:
                return "Weekday";
        }
    }

    public static void main(String[] args) {
        System.out.println(dayType("Saturday")); // Weekend
        System.out.println(dayType("Wednesday")); // Weekday
    }
}
```

### Line-by-line explanation
1. public class SwitchExamples { — Declares a public class named SwitchExamples.
2.     public static String dayType(String day) { — Defines a method to classify the day.
3.         if (day == null) return "Unknown"; — Guard clause to handle null input.
4.         switch (day.toLowerCase()) { — Normalize input and switch on its value.
5.             case "saturday": — When value is Saturday (case falls through).
6.             case "sunday": — Also matches Sunday, leading to the same result.
7.                 return "Weekend"; — Return weekend type for weekends.
8.             default: — Fallback for all other days.
9.                 return "Weekday"; — Return weekday type.
10.        } — End of switch.
11.    } — End of dayType method.
12.
13.    public static void main(String[] args) { — Entry point for demonstration.
14.        System.out.println(dayType("Saturday")); // Weekend
15.        System.out.println(dayType("Wednesday")); // Weekday
16.    } — End of main.
17. } — End of class.
```

Why switch here? It cleanly maps discrete inputs (days) to discrete outputs. String-based switches are common in routing, feature flags, and configuration parsing in backends.

## 4. Loops: While and Do-While

While and do-while loops are useful for processing unknown quantities of data, streaming, or user-driven input where the termination condition isn’t known up front. Do-while ensures the body runs at least once.

```java
public class LoopWhileDoWhile {
    public static int sumUpTo(int n) {
        int i = 1, sum = 0;
        while (i <= n) {
            sum += i;
            i++;
        }
        return sum;
    }

    public static int countPositive(int[] arr) {
        int count = 0;
        int i = 0;
        if (arr.length == 0) return 0;
        do {
            if (arr[i] > 0) count++;
            i++;
        } while (i < arr.length);
        return count;
    }

    public static void main(String[] args) {
        System.out.println(sumUpTo(5)); // 15
        int[] a = {-1, 2, 0, 3, 5};
        System.out.println(countPositive(a)); // 2
    }
}
```

### Line-by-line explanation
1. public class LoopWhileDoWhile { — Declares a public class LoopWhileDoWhile.
2.     public static int sumUpTo(int n) { — Method to sum numbers from 1 to n.
3.         int i = 1, sum = 0; — Initialize loop counter and accumulator.
4.         while (i <= n) { — Continue while i is within range.
5.             sum += i; — Add current i to the sum.
6.             i++; — Move to the next integer.
7.         } — End of while loop.
8.         return sum; — Return the computed sum.
9.     } — End of sumUpTo method.
10.
11.     public static int countPositive(int[] arr) { — Counts positive values in an array.
12.         int count = 0;
13.         int i = 0;
14.         if (arr.length == 0) return 0; — Guard against empty array.
15.         do {
16.             if (arr[i] > 0) count++; — Increment if positive.
17.             i++;
18.         } while (i < arr.length); — Repeat until end.
19.         return count; — Return the count.
20.     } — End of countPositive method.
21.
22.     public static void main(String[] args) { — Entry point for demonstration.
23.         System.out.println(sumUpTo(5)); // 15
24.         int[] a = {-1, 2, 0, 3, 5};
25.         System.out.println(countPositive(a)); // 2
26.     } — End of main.
27. } — End of class.
```

Line-by-line explanation
- The while loop (lines 4–7) demonstrates a typical iterative accumulation pattern.
- The do-while loop (lines 15–18) executes body at least once and uses a post-condition to determine continuation.
- The early guard (line 14) ensures we don’t access arr[0] on an empty array, preventing an ArrayIndexOutOfBoundsException.

## 5. For Loops and Enhanced For Loops

For loops are great for a known iteration count, while enhanced for loops (for-each) simplify iteration over arrays or collections.

```java
public class ForAndEnhancedFor {
    public static void printSquares(int n) {
        for (int i = 0; i < n; i++) {
            System.out.println(i * i);
        }
    }

    public static void printWords(String[] words) {
        for (String w : words) {
            System.out.println(w);
        }
    }

    public static void main(String[] args) {
        printSquares(5);
        printWords(new String[]{"apple", "banana", "cherry"});
    }
}
```

### Line-by-line explanation
1. public class ForAndEnhancedFor { — Declares a public class ForAndEnhancedFor.
2.     public static void printSquares(int n) { — Prints squares of 0..n-1.
3.         for (int i = 0; i < n; i++) { — Standard for loop with index i.
4.             System.out.println(i * i); — Output square of i.
5.         } — End of for loop.
6.     } — End of printSquares.
7.
8.     public static void printWords(String[] words) { — Iterates over an array of strings.
9.         for (String w : words) { — Enhanced for loop (for-each).
10.            System.out.println(w); — Print each word.
11.        } — End of enhanced for.
12.    } — End of printWords.
13.
14.    public static void main(String[] args) { — Entry point for demonstration.
15.        printSquares(5); — Demonstrates standard for loop.
16.        printWords(new String[]{"apple", "banana", "cherry"}); — Demonstrates enhanced for loop.
17.    } — End of main.
18. } — End of class.
```

Why use both forms? For loops give you index control, useful for numeric ranges. Enhanced for loops simplify iteration when you don’t need the index, reducing boilerplate and risk of off-by-one errors.

## 6. Loop Control: break, continue, and Labels

Break and continue alter loop flow. Labels enable breaking or continuing outer loops from inner loops, which is useful in nested processing.

```java
public class LoopControl {
    public static void printNonZeroMatrix(int[][] matrix) {
        outer:
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] == 0) {
                    continue outer;
                }
                System.out.print(matrix[i][j] + "\t");
            }
            System.out.println();
        }
    }

    public static void main(String[] args) {
        int[][] m = {
            {1, 2, 0},
            {4, 0, 6},
            {7, 8, 9}
        };
        printNonZeroMatrix(m);
    }
}
```

### Line-by-line explanation
1. public class LoopControl { — Declares a public class LoopControl.
2.     public static void printNonZeroMatrix(int[][] matrix) { — Method that prints non-zero entries, with flow control.
3.         outer: — Label named "outer" for the outer loop.
4.         for (int i = 0; i < matrix.length; i++) { — Outer loop over rows.
5.             for (int j = 0; j < matrix[i].length; j++) { — Inner loop over columns.
6.                 if (matrix[i][j] == 0) { — If a zero is encountered...
7.                     continue outer; — Jump to the next iteration of the outer loop, skipping remaining inner iterations for this row.
8.                 } — End of condition.
9.                 System.out.print(matrix[i][j] + "\t"); — Print non-zero element followed by a tab.
10.            } — End of inner loop.
11.            System.out.println(); — New line after each row.
12.        } — End of outer loop.
13.    } — End of printNonZeroMatrix.
14.
15.    public static void main(String[] args) { — Entry point for demonstration.
16.        int[][] m = {
17.            {1, 2, 0},
18.            {4, 0, 6},
19.            {7, 8, 9}
20.        };
21.        printNonZeroMatrix(m); — Demonstrates labeled continue behavior.
22.    } — End of main.
23. } — End of class.
```

Line-by-line explanation
- The label outer on line 3 enables breaking/continuing the outer loop from within the inner loop (lines 7). This pattern allows you to skip to the next row when a condition is met in the inner loop, which can be useful in filtering or short-circuiting nested iterations.

X. Common Beginner Mistakes

- Bad vs Good: String equality
```java
// Bad
String a = "hello";
String b = new String("hello");
if (a == b) { /* ... */ } // Incorrect: '==' compares references, not content.

// Good
if (a.equals(b)) { /* ... */ } // Correct: compares string content.
```

- Bad vs Good: Off-by-one in for loops
```java
// Bad
int[] arr = {1, 2, 3};
for (int i = 0; i <= arr.length; i++) { // OOB when i == arr.length
    System.out.println(arr[i]);
}

// Good
for (int i = 0; i < arr.length; i++) {
    System.out.println(arr[i]);
}
```

- Bad vs Good: Null dereference risk
```java
// Bad
String s = getValue(); // could return null
if (s.length() > 0) { // NPE if s is null
    // ...
}

// Good
String s = getValue();
if (s != null && s.length() > 0) {
    // safe to use s
}
```

- Bad vs Good: Non-short-circuiting vs short-circuiting boolean checks
```java
// Bad (uses single &; both sides are evaluated)
if (setup() & verify()) {
    // ...
}

// Good (uses &&; short-circuits if setup() is false)
if (setup() && verify()) {
    // ...
}
```

- Bad vs Good: Missing braces for multi-line blocks
```java
// Bad
if (cond)
    doSomething();
    doAnotherThing(); // Always runs, not gated by cond

// Good
if (cond) {
    doSomething();
    doAnotherThing();
}
```

Y. Why This Matters In Real Systems

- Correctness and business rules: Conditional logic enforces authentication checks, input validation, feature toggles, and routing. A small mistake can grant access, reject valid requests, or route data incorrectly.
- Reliability and edge cases: Nulls, empty data, and boundary conditions are common in production. Guard clauses and robust loop boundaries prevent crashes and NPEs.
- Performance and scalability: Short-circuiting (&&) avoids unnecessary work; nested if/else can be refactored into cleaner switch statements or guard clauses to reduce cognitive load and improve maintainability.
- Maintainability and readability: Clear, well-commented conditionals and loops reduce bugs when the codebase grows and teams scale.
- Real-world usage: In backend services, these concepts drive request validation, data processing pipelines, template rendering, pagination, streaming, and batch jobs. Understanding control flow directly reduces latency, avoids expensive operations, and ensures predictable behavior under load.

Z. Study Questions

1. What is short-circuit evaluation, and how do the operators && and || differ from & and | in Java?
2. How would you classify the day type (weekday/weekend) using a switch statement with a string input?
3. When should you prefer a for loop over a while loop? Give an example scenario in a backend service.
4. Explain why using a guard clause (early return) can improve readability and reduce nesting in conditionals.
5. Write a small code snippet that uses a labeled break to exit an outer loop from an inner loop.

Exercise

Part A — Build a ControlFlowLab utility (multi-method class)
- Objective: Implement a compact Java utility that demonstrates core control flow patterns covered in this lesson.
- Tasks:
  1) Create a class named ControlFlowLab with the following static methods:
     - grade(int score): String — implements an if/else chain to return "A" for >= 90, "B" for >= 80, "C" for >= 70, otherwise "D".
     - dayCategory(String day): String — uses a switch to return "Weekend" for "Saturday"/"Sunday" and "Weekday" for all other days (case-insensitive; handle null).
     - sum(int[] numbers): int — sums all integers in the array using a for loop.
     - countPositives(int[] numbers): int — counts numbers > 0 using an enhanced for loop.
     - printRightTriangle(int rows): void — prints a right-angled triangle of asterisks with the given number of rows using a while loop.
  2) Add a main method that exercises all methods with representative test data:
     - grade(85), grade(92)
     - dayCategory("Monday"), dayCategory("Sunday"), dayCategory(null)
     - sum(new int[]{1, 2, 3, 4, 5})
     - countPositives(new int[]{-1, 0, 2, 3, -4})
     - printRightTriangle(4) (expect a 4-row triangle on the console)
  3) Ensure the code compiles with Java 8+ and uses only standard library features.
- Deliverables:
  - A single Java file named ControlFlowLab.java containing the class and all methods above.
  - A short README-style note (in code comments) describing the approach and any edge-case considerations (null inputs, empty arrays, etc.).
- Example test plan:
  - Expected outputs when running the main method:
    - grade(85) -> B
    - grade(92) -> A
    - dayCategory("Monday") -> Weekday
    - dayCategory("Sunday") -> Weekend
    - dayCategory(null) -> Unknown or handle as per your implementation choice
    - sum([1,2,3,4,5]) -> 15
    - countPositives([-1, 0, 2, 3, -4]) -> 2
    - printRightTriangle(4) -> prints:
      *
      **
      ***
      ****
      (line breaks and alignment are as shown)

Notes for the instructor
- This lesson assumes basic Java syntax familiarity and familiarity with a command-line build tool (e.g., javac). If your cohort uses an IDE, you can provide a small project template to run the main method.
- Encourage students to reason about edge cases: null inputs, empty arrays, and invalid row counts (e.g., negative numbers) and add defensive checks in the implementation as a follow-up exercise.

End of Lesson.