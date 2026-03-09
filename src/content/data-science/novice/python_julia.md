# Track: Data Science & AI — Module: Phase 1 — Data Foundations — Topic: Python Basics for Data Science (Julia Stack)

Python Basics for Data Science forms the foundation for how data scientists think about data: types, structures, operations, and basic data workflows. In this lesson, you’ll learn Python-like concepts and workflows, but using Julia as the working language. You’ll see how Julia mirrors Python fundamentals, how to work with data using DataFrames.jl, and how to interoperate with Python when needed. This combination gives you a strong, high-performance base for real-world data science tasks.

## 1. Getting Comfortable with Python-like Concepts in Julia

In this section, you’ll explore Python-style concepts (variables, basic data types, lists/dicts, and simple loops) implemented in Julia. This sets a mental bridge between Python basics and Julia syntax, which is essential for collaborating with teams that mix both ecosystems.

```julia
# Variable declarations (Python-like basics)
x = 42
y = 3.14
name = "Data"
flag = true

# Python-like list and dictionary in Julia
python_like_list = [1, 2, 3, 4]
python_like_dict = Dict("a" => 1, "b" => 2)

# Access and simple operations
sum_val = x + y
second_item = python_like_list[2]  # Julia uses 1-based indexing

# Simple loop
for i in 1:3
  println("i = ", i)
end
```

### Line-by-line explanation
- Line 1: A comment describing the block.
- Line 2-5: Define basic scalar variables with different types (Int, Float64, String, Bool) to mirror Python primitives.
- Line 7: Create a Python-like list; in Julia this is a Vector{Int}.
- Line 8: Create a Python-like dictionary using Julia Dict with string keys.
- Line 11: Compute the sum of x and y, illustrating numeric operations.
- Line 12: Access the second element of the list; note Julia uses 1-based indexing.
- Line 15-17: A simple for loop printing index values 1 through 3.

## 2. Working with DataFrames and CSV in Julia

Python programmers often start with pandas; in Julia, the DataFrames.jl and CSV.jl packages provide similar capabilities. This section shows creating a DataFrame, writing it to CSV, and reading it back.

```julia
using DataFrames
using CSV

df = DataFrame(Name = ["Alice","Bob","Charlie"],
               Score = [92.3, 85.0, 78.5],
               Passed = [true, true, false])

CSV.write("students.csv", df)

df_read = CSV.read("students.csv", DataFrame)
```

### Line-by-line explanation
- Line 1-2: Import DataFrames and CSV packages.
- Line 4-6: Create a DataFrame with column names Name, Score, and Passed; demonstrates mixed data types.
- Line 8: Write the DataFrame to a CSV file named "students.csv".
- Line 10: Read the CSV back into a new DataFrame variable df_read.

## 3. Control Flow: Conditionals and Loops

Control flow is foundational for scripting data tasks. The examples below cover conditionals, for loops, and while loops in Julia (note: Julia uses 1-based indexing and explicit end).

```julia
n = 5
if n > 0
  println("Positive")
else
  println("Non-positive")
end
```

### Line-by-line explanation
- Line 1: n is assigned 5.
- Lines 2-6: If-else conditional checks whether n is positive; prints accordingly.

```julia
for i in 1:5
  println("i=", i)
end
```

### Line-by-line explanation
- Line 1: Iterate i from 1 to 5 inclusive.
- Line 2: Print the current index in the loop.

```julia
i = 1
while i <= 5
  println(i)
  i += 1
end
```

### Line-by-line explanation
- Line 1: Initialize i to 1.
- Lines 2-5: While loop prints i and increments until the condition fails.

## 4. Functions and Scope

Functions are the building blocks for data transformations. Julia supports named functions, anonymous functions, and higher-order functions like map.

```julia
# Named function
function square(x)
  return x^2
end

println("square(4) = ", square(4))

# Anonymous function
cube = x -> x^3
println("cube(3) = ", cube(3))

# Map over a collection
vals = [1, 2, 3, 4]
squared = map(square, vals)
```

### Line-by-line explanation
- Line 4-7: Define a named function square that returns x squared.
- Line 9: Print the result of square(4).
- Line 12-13: Define an anonymous function cube that cubes its input.
- Line 14: Print the result of cube(3).
- Line 17-19: Create an array of values and apply square to each element with map, producing a new array.

## 5. Vectorized Operations and Broadcasting

Data science often requires elementwise and vectorized computations. Julia uses broadcasting with the dot syntax to apply operations across collections.

```julia
a = [1, 2, 3, 4]
b = [10, 20, 30, 40]

sum_vec = a .+ b
prod_vec = a .* b

# String operations with broadcasting
names = ["Alice","Bob","Cathy"]
lengths = length.(names)
```

### Line-by-line explanation
- Line 4-5: Define two equal-length vectors a and b.
- Line 7: Elementwise addition using broadcasting, producing [11, 22, 33, 44].
- Line 8: Elementwise multiplication using broadcasting, producing [10, 40, 90, 160].
- Line 11-13: Define an array of strings and broadcast the length function to each element, producing [5, 3, 5].

## 6. Python Interoperability with PyCall (Optional)

If you need access to Python libraries, PyCall.jl provides seamless interoperability. This section shows a minimal example; ensure PyCall is installed in your environment.

```julia
using PyCall
np = pyimport("numpy")

arr = np.array([1, 2, 3, 4])
total = np.sum(arr)
```

### Line-by-line explanation
- Line 2: Import PyCall.
- Line 3: Import Python's numpy module as np.
- Line 5: Create a NumPy array from a Julia-level array.
- Line 6: Use NumPy to compute the sum of the array.

## X. Common Beginner Mistakes

Here are real pitfalls often faced by beginners transitioning Python habits to Julia. Bad vs Good code is shown for clarity.

- Pitfall 1: Off-by-one indexing (Python uses 0-based indexing; Julia uses 1-based indexing)
  - Bad
  ```julia
  # Bad: assuming 0-based indexing
  arr = [10, 20, 30]
  for i in 0:2
    println(arr[i])
  end
  ```
  - Good
  ```julia
  # Good: use 1-based indexing
  arr = [10, 20, 30]
  for i in 1:length(arr)
    println(arr[i])
  end
  ```

- Pitfall 2: Trying to concatenate arrays with + (common Python mindset) instead of proper Julia concatenation
  - Bad
  ```julia
  a = [1, 2, 3]
  b = [4, 5, 6]
  c = a + b  # This performs elementwise addition, not concatenation; could surprise Python users
  ```
  - Good
  ```julia
  a = [1, 2, 3]
  b = [4, 5, 6]
  c = vcat(a, b)  # [1, 2, 3, 4, 5, 6]
  ```

- Pitfall 3: Global variables inside performance-critical functions
  - Bad
  ```julia
  sum = 0
  for i in 1:1_000_000
    sum += i
  end
  ```
  - Good
  ```julia
  function fast_sum(n)
    s = 0
    for i in 1:n
      s += i
    end
    return s
  end
  ```

- Pitfall 4: Type instability and arrays of Any
  - Bad
  ```julia
  values = Any[1, 2.0, "3"]
  total = sum(values)  # may fail or be slow due to mixed types
  ```
  - Good
  ```julia
  ints = Int64[1, 2, 3]
  total = sum(ints)
  ```

- Pitfall 5: Assuming Python-style string building inside loops without using appropriate methods
  - Bad
  ```julia
  s = ""
  for i in 1:1000
    s *= "x"  # repeated string concatenation in a loop is slow
  end
  ```
  - Good
  ```julia
  parts = fill("x", 1000)
  s = join(parts, "")
  ```

## Y. Why This Matters In Real Systems

- Performance and scalability: Julia code benefits from JIT compilation and type stability, which translate to faster data processing, especially on large datasets.
- Reproducibility: Clear, explicit data transformations and type-consistent code reduce nondeterministic behavior.
- Data pipelines: Reading/writing CSVs, DataFrames manipulation, and vectorized operations map directly to real-world ETL tasks, feature engineering, and analytics pipelines.
- Python interoperability: When required, PyCall lets you leverage mature Python ecosystems (pandas, scikit-learn, NumPy) without leaving Julia, enabling hybrid systems that get the best of both worlds.
- Memory management: Being mindful of mutable vs immutable data and avoiding global state improves performance and reliability in production services.

## Z. Study Questions

1) How does Julia’s 1-based indexing differ from Python’s 0-based indexing? Give an example illustrating a common indexing mistake and the corrected version.

2) What syntax in Julia enables elementwise operations on arrays, and how would you perform a component-wise addition of two vectors?

3) How do you read a CSV into a DataFrame and then write it back to disk in Julia? Provide small code snippets.

4) What is the difference between vcat and hcat, and when would you use each?

5) Explain how PyCall.jl allows you to access Python libraries from Julia. What is a simple example to sum a NumPy array from Julia?

## Exercise

Multi-part practical coding challenge to cement the basics.

Part A: Build and summarize a small dataset
- Create a dataset of 6 students with columns: Name (string), Age (Int), Score (Float64), Passed (Bool).
- Compute the average Score, the number of students who Passed, and the pass rate (as a fraction).
- Filter the DataFrame to only the students who Passed, and sort by Score descending.

Code scaffold (you may fill in as you proceed):

```julia
using DataFrames

students = DataFrame(
  Name = ["Alex","Priya","Chen","Diego","Nia","Mika"],
  Age = [22, 23, 21, 24, 22, 23],
  Score = [88.0, 92.5, 76.0, 83.5, 95.0, 72.0],
  Passed = [true, true, false, true, true, false]
)

# 1) Average score
avg_score = mean(students.Score)

# 2) Number of Passed
num_passed = count(students.Passed)

# 3) Pass rate
total = nrow(students)
pass_rate = num_passed / total

# 4) Filter Passed and sort by Score descending
passed_df = filter(row -> row.Passed, students)
sorted_passed = sort(passed_df, :Score, rev=true)
```

Part B: CSV round-trip
- Write the original dataset to a CSV file named "students_roundtrip.csv" and then read it back into a new DataFrame.
- Recompute the average score from the loaded data to verify integrity.

Part C: Optional PyCall histogram (Python interop)
- If PyCall is available, use numpy to compute a histogram of the Score column (e.g., 0-100 with 10 bins).
- Print the bin counts and verify they sum to the number of rows.

Notes
- Ensure you have DataFrames.jl and CSV.jl installed in your environment.
- If you’re new to PyCall, you can skip Part C or install PyCall and NumPy to complete it.

End of lesson.