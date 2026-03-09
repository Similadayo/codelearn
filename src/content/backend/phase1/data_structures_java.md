# Data Structures — Arrays, Objects & Maps in Java

In backend engineering, understanding how to store, organize, and access data efficiently is vital. Arrays give you fast index-based storage, objects model real-world entities with encapsulation and behavior, and maps provide flexible key-value lookups. This lesson builds a solid foundation in these core data structures using Java, highlighting practical usage, common pitfalls, and real-system considerations you’ll encounter in production services.

## 1. Arrays in Java

Java arrays are fixed-size containers that hold elements of a specific type. They offer O(1) access by index, a simple memory model, and are a foundation for performance-critical code. You’ll use arrays for primitive data, batching operations, and as a stepping stone to more dynamic collections like ArrayList.

```java
import java.util.Arrays;

public class ArrayExamples {
  public static void main(String[] args) {
    // 1) Declaring and initializing
    int[] numbers = {3, 1, 4, 1, 5, 9};
    String[] names = new String[3];
    names[0] = "Alice";
    names[1] = "Bob";
    names[2] = "Carol";

    // 2) Basic operations: sum and length
    int sum = 0;
    for (int n : numbers) {
      sum += n;
    }

    // 3) Utility methods from java.util.Arrays
    Arrays.sort(numbers); // sorts in place
    String numbersStr = Arrays.toString(numbers);

    // 4) Multidimensional array (2D)
    int[][] matrix = { {1, 2}, {3, 4} };
    System.out.println("Matrix[0][1] = " + matrix[0][1]);

    System.out.println("Sum: " + sum);
    System.out.println("Sorted: " + numbersStr);
  }
}
```

### Line-by-line explanation
- Line 1: Import Arrays utility for sorting, copying, etc.
- Line 3: Define class ArrayExamples.
- Line 4: Entry point main method.
- Line 6-12: Declare and initialize arrays; demonstrate fixed-size and inline initialization.
- Line 14-18: Compute sum with an enhanced for loop.
- Line 21: Sort the primitive array in place (numbers is reordered).
- Line 22: Convert the array to a human-readable string.
- Line 25: Define a 2D array (matrix) with two rows.
- Line 26: Access an element from the 2D array.
- Line 28-29: Print results.

## 2. Java Objects — Classes, Instances, and Encapsulation

Objects are instances of classes, encapsulating data and behavior. In backend systems, you model domain entities (like users, products, or orders) as immutable or well-encapsulated objects. We’ll build a simple Person class, demonstrate encapsulation, equality semantics, and basic object manipulation (including sorting by a field).

```java
// File: Person.java
public class Person {
  private final int id;
  private final String name;
  private final String email;

  public Person(int id, String name, String email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  public int getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getEmail() {
    return email;
  }

  @Override
  public String toString() {
    return "Person{id=" + id + ", name='" + name + "', email='" + email + "'}";
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Person)) return false;
    Person p = (Person) o;
    return id == p.id &&
           java.util.Objects.equals(name, p.name) &&
           java.util.Objects.equals(email, p.email);
  }

  @Override
  public int hashCode() {
    return java.util.Objects.hash(id, name, email);
  }
}
```

```java
import java.util.*;

public class ObjectExamples {
  public static void main(String[] args) {
    List<Person> people = new ArrayList<>();
    people.add(new Person(3, "Chloe", "chloe@example.com"));
    people.add(new Person(1, "Alice", "alice@example.com"));
    people.add(new Person(2, "Bob", "bob@example.com"));

    // Sort by name using a comparator
    people.sort(Comparator.comparing(Person::getName));

    for (Person p : people) {
      System.out.println(p);
    }
  }
}
```

### Line-by-line explanation (Person.java)
- Line 1: Define public class Person.
- Lines 3-5: Declare immutable fields id, name, email.
- Lines 7-12: Constructor initializes all fields.
- Lines 14-22: Getters for fields.
- Lines 24-30: toString overrides for readable representation.
- Lines 32-43: equals override to provide value-based equality.
- Lines 45-46: hashCode override to align with equals.

### Line-by-line explanation (ObjectExamples.java)
- Line 1: Import java.util package for List and Comparator.
- Line 3: Define class ObjectExamples.
- Line 5: Main entry point.
- Lines 7-12: Create a list of Person and populate it with three instances.
- Line 15: Sort the list by name using a method reference.
- Lines 17-19: Iterate and print each Person.

## 3. Maps in Java

Maps store key-value associations with fast lookup. Common flavors include HashMap (unsorted, fast average case), TreeMap (sorted by key), and ConcurrentHashMap (thread-safe). We’ll demonstrate a basic HashMap usage, iterating entries, and creating a map from a collection of objects by a specific key.

```java
import java.util.HashMap;
import java.util.Map;

public class MapExamples {
  public static void main(String[] args) {
    Map<Integer, String> idToName = new HashMap<>();
    idToName.put(101, "Ada");
    idToName.put(202, "Grace");
    idToName.putIfAbsent(303, "Mina");

    String name = idToName.get(101);
    System.out.println("id 101 -> " + name);

    // Iterate entries
    for (Map.Entry<Integer, String> entry : idToName.entrySet()) {
      System.out.println(entry.getKey() + " -> " + entry.getValue());
    }
  }
}
```

```java
import java.util.*;
import java.util.stream.Collectors;

public class MapFromListDemo {
  public static void main(String[] args) {
    List<Person> people = Arrays.asList(
      new Person(10, "Dana", "dana@example.com"),
      new Person(11, "Eli", "eli@example.com"),
      new Person(12, "Finn", "finn@example.com")
    );

    // Build a map from id to Person
    Map<Integer, Person> byId = new HashMap<>();
    for (Person p : people) {
      byId.put(p.getId(), p);
    }

    // Lookup by id
    System.out.println("Lookup 11: " + byId.get(11));

    // Sort people by name for display
    List<Person> byName = people.stream()
      .sorted(Comparator.comparing(Person::getName))
      .collect(Collectors.toList());

    byName.forEach(System.out::println);
  }
}
```

### Line-by-line explanation (MapExamples.java)
- Line 1-2: Import HashMap and Map.
- Line 4: Define class MapExamples.
- Line 6: Main entry point.
- Lines 8-12: Create a HashMap and populate with entries; demonstrate putIfAbsent.
- Line 14: Retrieve a value by key.
- Lines 17-21: Iterate over entrySet to print key-value pairs.

### Line-by-line explanation (MapFromListDemo.java)
- Line 1-3: Import utilities and streams helpers.
- Line 6: Define class MapFromListDemo.
- Line 8: Main entry point.
- Lines 10-17: Create a List<Person> and populate with several Person instances.
- Lines 20-24: Build a map from id to Person with a for-loop.
- Lines 27-32: Create a name-sorted view of the same data via streams and comparator.
- Line 34: Print each entry in the sorted list.

## X. Common Beginner Mistakes

Pitfalls and how to fix them with bad vs good code.

- Pitfall 1: Null handling and NullPointerExceptions
  - Bad:
  ```java
  String[] names = new String[] { null, "Alice" };
  if (names[0].equals("Alice")) { /* ... */ }
  ```
  - Good:
  ```java
  String[] names = new String[] { null, "Alice" };
  if ("Alice".equals(names[0])) { /* ... */ }
  ```
  - Explanation: Avoid dereferencing null. Using "Alice".equals(names[0]) prevents NPEs when the element is null.

- Pitfall 2: Raw types and missing generics
  - Bad:
  ```java
  List list = new ArrayList();
  list.add("Alice");
  String s = (String) list.get(0);
  ```
  - Good:
  ```java
  List<String> list = new ArrayList<>();
  list.add("Alice");
  String s = list.get(0);
  ```
  - Explanation: Raw types bypass compile-time type checks and lead to ClassCastException at runtime. Use generics to get compile-time safety.

- Pitfall 3: Modifying a collection while iterating
  - Bad:
  ```java
  List<String> items = new ArrayList<>(Arrays.asList("a","b","c"));
  for (String item : items) {
    if (item.equals("b")) items.remove(item);
  }
  ```
  - Good:
  ```java
  List<String> items = new ArrayList<>(Arrays.asList("a","b","c"));
  Iterator<String> it = items.iterator();
  while (it.hasNext()) {
    if (it.next().equals("b")) it.remove();
  }

  // Or using removeIf
  items.removeIf(item -> item.equals("b"));
  ```
  - Explanation: Directly removing from a collection while iterating with enhanced for causes ConcurrentModificationException. Use an explicit Iterator or removeIf for safe mutation.

## Y. Why This Matters In Real Systems

- Performance and memory: Arrays have low overhead and contiguous memory, but fixed size. For dynamic data, prefer ArrayList or LinkedList (based on access/insert patterns). Be mindful of boxing with wrappers (Integer, Long) when using primitive arrays vs boxed collections; primitives avoid boxing overhead and can improve cache locality.
- Encapsulation and immutability: Designing domain objects as immutable (like Person above) reduces thread-safety concerns and simplifies reasoning in concurrent services.
- Hash codes and equality: If you store objects in maps or sets, override equals and hashCode consistently to avoid subtle bugs (e.g., duplicates in HashSet, missed lookups in HashMap).
- API design considerations: Expose defensive copies of internal arrays/lists when returning them from APIs to preserve encapsulation.
- Serialization and API boundaries: Objects and maps map naturally to JSON, REST payloads, or database records. Choose structures thoughtfully to minimize serialization overhead and to facilitate stable schema evolution.
- Concurrency: Use thread-safe maps (e.g., ConcurrentHashMap) or proper synchronization when shared mutable state is accessed by multiple threads. Understand the trade-offs of locking vs lock-free designs.
- Real-world patterns: Maps are commonly used as caches with computeIfAbsent, or as indices for fast lookups from IDs to domain objects. Arrays are useful for batching, fixed-size buffers, and presentation-layer data passing.

## Z. Study Questions

1) What is the fundamental difference between an array and a List in Java?  
2) How do you declare a Map with integer keys and string values? Provide a short code snippet.  
3) Explain how to iterate over a Map’s entries and print key-value pairs.  
4) Why is it important to override equals and hashCode for objects used as keys in a Map?  
5) What are the main differences between HashMap and TreeMap in Java?

## Exercise

Multi-part practical coding challenge: Build a small in-memory contact repository using arrays and maps, and extend it with a CSV parser.

Part A — Array-backed contact storage
- Implement a fixed-size contact store using an array of Person.
- Requirements:
  - Class: ContactArray
  - Fields: Person[] people; int size;
  - Methods: add(Person p) that stores in the next slot (throws if full), findByName(String name) returning Person or null, printAll()
- Test: Create several Person objects, add them to ContactArray, find by name, and print all.

Part B — Map-backed contact storage by id
- Implement a map-based store indexing by id.
- Requirements:
  - Class: ContactMap
  - Field: Map<Integer, Person> byId;
  - Methods: addPerson(Person p), getById(int id), removeById(int id), printAll()
- Test: Add several Person objects, retrieve by id, remove one, and print remaining.

Part C — CSV loader and interoperability
- Implement a small CSV parser helper to create Person from a single line "id,name,email" and integrate into Part B.
- Requirements:
  - Class: PersonCsvParser with static Person fromCsv(String line)
  - Update Part B test to load lines:
    - "20,Grace,grace@example.com"
    - "21,Heidi,heidi@example.com"
  - After loading, print all entries (expected to include pre-existing and loaded entries).
- Bonus: Implement a method in ContactMap to export all entries to a CSV string.

Starter usage example (for testing)
- The following snippet demonstrates how you might exercise Parts A–C together in a main method.

```java
public class ExerciseRunner {
  public static void main(String[] args) {
    // Part A: Array-backed storage
    ContactArray ca = new ContactArray(4);
    ca.add(new Person(1, "Alice", "alice@example.com"));
    ca.add(new Person(2, "Bob", "bob@example.com"));
    ca.printAll();
    System.out.println("Find by name Bob: " + ca.findByName("Bob"));

    // Part B: Map-backed storage
    ContactMap cm = new ContactMap();
    cm.addPerson(new Person(3, "Chloe", "chloe@example.com"));
    cm.addPerson(new Person(4, "Dana", "dana@example.com"));
    System.out.println("Lookup 4: " + cm.getById(4));

    // Part C: CSV loader
    String[] lines = {
      "5,Eli,eli@example.com",
      "6,Finn,finn@example.com"
    };
    for (String line : lines) {
      Person p = PersonCsvParser.fromCsv(line);
      if (p != null) cm.addPerson(p);
    }
    cm.printAll();
  }
}
```

Expected outputs will vary based on the exact data you add, but you should see:
- Correct storage and retrieval by name/id
- Successful parsing of CSV lines into Person objects
- A printed list of all current entries in the map

This completes a practical, multi-part exercise that reinforces arrays, objects, and maps in Java, while tying together core concepts from Phase 1 — Language Foundations.