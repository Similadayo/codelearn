# Python Basics for Data Science — Phase 1: Data Foundations

Python is the lingua franca of data science. It combines readability, a vast ecosystem of libraries, and strong support for data processing, numerical computation, and quick experimentation. This lesson introduces foundational Python concepts with a data-science lens: variables, data types, data structures, control flow, functions, and lightweight data I/O with NumPy and Pandas. By the end, you’ll be able to write small data-processing scripts, prototype analyses, and prepare data for more advanced modeling tasks.

## 1. Python Fundamentals: Variables, Types, and Expressions

This section covers basic data types, how to declare variables, and simple arithmetic. These building blocks underpin everything you’ll do in data science.

```python
# Basic data types
x = 10           # int
y = 3.14         # float
name = "Ada"     # str
flag = True      # bool

# Basic operations
sum_xy = x + y
prod = x * y
length = len(name)

print(x, y, name, flag)
print("Sum:", sum_xy, "Product:", prod, "Length of name:", length)
```

### Line-by-line explanation
- Line 1: A blank line or comment; not executed.
- Line 2: x = 10 assigns the integer 10 to variable x.
- Line 3: y = 3.14 assigns the floating-point number 3.14 to y.
- Line 4: name = "Ada" assigns the string Ada to name.
- Line 5: flag = True assigns a boolean True to flag.
- Line 6: blank line for readability.
- Line 7: sum_xy = x + y computes the sum of x and y, storing 13.14 in sum_xy.
- Line 8: prod = x * y computes the product of x and y, storing 31.4 in prod.
- Line 9: length = len(name) computes the length of the string name (4) and stores it in length.
- Line 11: print(x, y, name, flag) outputs the four values to the console.
- Line 12: print("Sum:", sum_xy, "Product:", prod, "Length of name:", length) formats and prints a summary.

---

## 2. Working with Lists, Tuples, and Dictionaries

Data science frequently uses collections to hold data of different shapes. This section introduces lists, list comprehensions, tuples, and dictionaries.

```python
# Lists
numbers = [1, 2, 3, 4, 5]
squares = [n**2 for n in numbers]

# Tuples
point = (4.5, -2.0)

# Dictionaries
student = {"name": "Ada", "age": 29, "gpa": 3.8}

print("Squares:", squares)
print("Point:", point)
print("Student:", student)
```

### Line-by-line explanation
- Line 2: numbers = [1, 2, 3, 4, 5] creates a list of integers.
- Line 3: squares = [n**2 for n in numbers] uses a list comprehension to produce squares of each element.
- Line 6: point = (4.5, -2.0) defines a 2D point as a tuple.
- Line 9: student = {"name": "Ada", "age": 29, "gpa": 3.8} creates a dictionary with keys and values.
- Line 11: print("Squares:", squares) displays the list of squares.
- Line 12: print("Point:", point) displays the tuple.
- Line 13: print("Student:", student) displays the dictionary.

---

## 3. Control Flow and Functions

Control flow statements (if/for/while) and functions enable branching, iteration, and modular code—essential for data processing pipelines and small experiments.

```python
# Control flow
n = 7
if n % 2 == 0:
    parity = "even"
else:
    parity = "odd"

# Functions
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

message = greet("Ada")
custom = greet("Ada", greeting="Hi")

print(parity, message)
print("Custom:", custom)
```

### Line-by-line explanation
- Line 2: n = 7 assigns the value 7 to n.
- Line 3: if n % 2 == 0 checks whether n is divisible by 2.
- Line 4: parity = "even" executes if the condition is true.
- Line 5: else corresponds to the false condition for odd numbers.
- Line 6: parity = "odd" assigns "odd" when n is not divisible by 2.
- Line 9: def greet(name, greeting="Hello"): defines a function with a default argument.
- Line 10: return f"{greeting}, {name}!" returns a formatted string.
- Line 12: message = greet("Ada") calls the function with default greeting.
- Line 13: custom = greet("Ada", greeting="Hi") calls the function with a custom greeting.
- Line 15: print(parity, message) prints the parity and the default greeting.
- Line 16: print("Custom:", custom) prints the customized greeting.

---

## 4. Intro to NumPy and Pandas Basics

NumPy provides fast numeric arrays, while Pandas offers powerful table-like data structures for data analysis. This section shows a quick tour of both.

```python
import numpy as np
import pandas as pd

# NumPy basics
arr = np.array([1, 2, 3, 4, 5])
mean_val = arr.mean()
sum_val = arr.sum()

# Pandas basics
df = pd.DataFrame({
    "id": [1, 2, 3],
    "value": [10.0, 20.5, 30.25]
})

# Basic operations
df["value_scaled"] = df["value"] / df["value"].max()
print("Mean:", mean_val)
print("Sum:", sum_val)
print(df)
```

### Line-by-line explanation
- Line 1: import numpy as np imports NumPy under the alias np.
- Line 2: import pandas as pd imports Pandas under the alias pd.
- Line 5: arr = np.array([1, 2, 3, 4, 5]) creates a NumPy array.
- Line 6: mean_val = arr.mean() computes the mean of the array.
- Line 7: sum_val = arr.sum() computes the sum of the array.
- Line 10: df = pd.DataFrame({...}) constructs a Pandas DataFrame with two columns: id and value.
- Line 15: df["value_scaled"] = df["value"] / df["value"].max() adds a new column with values scaled by the maximum value.
- Line 16: print("Mean:", mean_val) prints the mean.
- Line 17: print("Sum:", sum_val) prints the sum.
- Line 18: print(df) prints the entire DataFrame.

---

## 5. Data I/O and Quick Transformations

A practical data science workflow often starts with loading data, inspecting it, and applying simple transformations. Here we simulate loading a CSV and performing a simple feature.

```python
# Assuming a CSV file path (in real use, this would be an actual file)
import io
csv_data = """id,name,score
1,Alice,88
2,Bob,92
3,Charlie,85
"""
df = pd.read_csv(io.StringIO(csv_data))

# Basic transform
df["passed"] = df["score"] >= 90

print(df)
```

### Line-by-line explanation
- Line 2: import io imports the I/O module for in-memory streams.
- Line 3-6: csv_data defines a multi-line string that mimics CSV content.
- Line 7: df = pd.read_csv(io.StringIO(csv_data)) reads the CSV data from the in-memory string into a DataFrame.
- Line 10: df["passed"] = df["score"] >= 90 creates a new boolean column indicating pass/fail.
- Line 12: print(df) prints the resulting DataFrame with the new column.

---

## X. Common Beginner Mistakes

Three+ real pitfalls new data scientists often encounter, with bad vs good examples.

- Pitfall 1: Mutable default arguments
  - Bad:
  ```python
  def append_to(element, to=[]):
      to.append(element)
      return to
  ```
  - Good:
  ```python
  def append_to(element, to=None):
      if to is None:
          to = []
      to.append(element)
      return to
  ```
  ### Line-by-line explanation
  - Bad code lines show a default list reused across calls, causing unexpected accumulation.
  - Good code creates a new list when no argument is provided.

- Pitfall 2: Inefficient string construction in loops
  - Bad:
  ```python
  parts = []
  for s in ["a", "b", "c"]:
      parts = parts + [s]
  result = "".join(parts)
  ```
  - Good:
  ```python
  parts = []
  for s in ["a", "b", "c"]:
      parts.append(s)
  result = "".join(parts)
  ```
  ### Line-by-line explanation
  - Bad code repeatedly creates new lists with parts + [s], which is O(n^2) overhead.
  - Good code uses in-place append, resulting in O(n) behavior.

- Pitfall 3: Not leveraging vectorized operations in Pandas/Numpy
  - Bad:
  ```python
  total = 0
  for v in df["value"]:
      total += v
  ```
  - Good:
  ```python
  total = df["value"].sum()
  ```
  ### Line-by-line explanation
  - Bad code uses an explicit Python loop over a Pandas Series, which is slow for large data.
  - Good code uses a built-in vectorized operation that is optimized in C.

- Pitfall 4: Failing to manage resources during file I/O
  - Bad:
  ```python
  f = open("data.txt", "r")
  content = f.read()
  f.close()
  ```
  - Good:
  ```python
  with open("data.txt", "r") as f:
      content = f.read()
  ```
  ### Line-by-line explanation
  - Bad code lacks exception safety; if an error occurs, the file may stay open.
  - Good code uses a context manager to ensure proper resource cleanup.

---

## Y. Why This Matters In Real Systems

- Readability and maintainability: Clear, idiomatic Python reduces onboarding time for teammates and minimizes bugs.
- Reproducibility: Small, well-commented scripts are easier to reproduce and extend.
- Performance considerations: Avoid Python-level loops on large data; prefer vectorized NumPy/Pandas operations or built-in functions.
- Data quality and safety: Proper handling of missing values, type casting, and edge cases reduces pipeline failures.
- Integration with real systems: Python code often runs in data pipelines, notebooks, or services; writing modular functions and with tests makes deployments steadier.

Practical takeaway: Master the core language concepts first, then layer on data-specific libraries (NumPy, Pandas, SciPy) and I/O patterns that scale to real-world datasets.

---

## Z. Study Questions

1) What are the four primary built-in data types shown in this lesson, and how do you declare a variable for each?  
2) How does a Python list differ from a tuple, and when might you choose one over the other?  
3) What is vectorization, and why does it matter for performance in data processing?  
4) How do you read a CSV string into a Pandas DataFrame without writing to disk?  
5) Name two common resource-management patterns for file I/O in Python.

---

## Exercise

Complete this multi-part challenge to reinforce core Python basics and introduce lightweight data analysis with Pandas.

Part A. Basic statistics function (no external libraries)
- Implement a function basic_stats(numbers) that returns a dictionary with mean, median, min, and max for a list of numbers.
- Requirements:
  - Do not rely on the statistics module for mean/median; implement them in code.
  - Handle an empty list gracefully (return None for all fields).

Part B. Cleaned mean with missing values
- Given a list numbers that may contain None, create a function cleaned_mean(numbers) that:
  - Filters out None values.
  - Returns the mean of the remaining numbers, or None if there are no valid numbers.

Part C. Tiny CSV-like dataset with Pandas
- Use the following CSV data (stored as a string) and Pandas to:
  - Load it into a DataFrame.
  - Compute the average score.
  - Add a new boolean column "passed" where score >= 90.
CSV data:
id,name,score
1,Alice,88
2,Bob,92
3,Charlie,85
4,Diana,97

Part D. Vectorized operation with NumPy
- Create a NumPy array from a Python list of numbers [1, 4, 9, 16, 25].
- Compute the square roots using a vectorized NumPy operation and print the results.

Hints:
- For Part A: median can be found by sorting the numbers and picking the middle value (or average of two middle values if even length).
- For Part C: you can import io and use pd.read_csv(io.StringIO(csv_data)) to read from a string.
- For Part D: use numpy.sqrt on the array.

Deliverables:
- Provide the Python code for Parts A–D in a single block for readability, ensuring comments explain each step.
- Briefly describe what you learned from executing the exercise and how the pieces fit into a data-science workflow.