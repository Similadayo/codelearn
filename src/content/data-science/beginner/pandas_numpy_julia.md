# Pandas & NumPy in Julia: DataFrame-centric Data Manipulation

In data science, you often start with raw data and need to clean, transform, and summarize it to extract signals. Julia provides fast, expressive tools for data manipulation that mirror the familiar Pandas (dataframes) and NumPy (array operations) workflows from Python, but with a native, high-performance approach. This lesson teaches core data manipulation concepts using Julia equivalents: DataFrames.jl for tabular data and built-in arrays with broadcasting for numerical computations. You’ll learn how to load, clean, transform, and aggregate data efficiently, plus how to reason about performance in real systems.

## 1. Julia Data Structures for Data Manipulation

In Julia, DataFrames.jl gives you a pandas-like dataframe, while standard arrays handle numeric and categorical data with high performance. Handling missing values is a first-class concern: use Missing values and skipmissing/coalesce to manage them cleanly.

Code example: creating a simple DataFrame with missing values
```julia
using DataFrames

# Create a small DataFrame with a missing value
df = DataFrame(A = [1, 2, missing, 4], B = [10, 20, 30, 40])
df
```

### Line-by-line explanation
- using DataFrames: load the DataFrames.jl package to work with tabular data.
- df = DataFrame(...): construct a DataFrame with two columns A and B. A contains an Int with a missing value; B contains integers.
- df: display the resulting DataFrame to verify structure and content.

## 2. Loading, Cleaning, and Preparing Data

Data often comes from CSVs or other sources and may contain missing values or inconsistent types. This section shows loading a DataFrame-like dataset, inspecting shapes/types, and handling missing values.

Code example: dealing with missing values and basic inspection
```julia
using DataFrames, Statistics

# Example raw frame with missing values
df = DataFrame(A = 1:5, B = [5, missing, 7, 8, 9])

# Compute the mean of B, ignoring missing values
meanB = mean(skipmissing(df.B))

# Impute missing values in B with the column mean
df.B = coalesce.(df.B, meanB)

# Display the cleaned DataFrame
df
```

### Line-by-line explanation
- using DataFrames, Statistics: load DataFrames.jl and the Statistics standard library for mean().
- df = DataFrame(...): create a DataFrame with a missing entry in B.
- meanB = mean(skipmissing(df.B)): compute the mean of B while skipping missing values.
- df.B = coalesce.(df.B, meanB): replace missing entries in B with the computed mean (elementwise broadcast).
- df: show the cleaned DataFrame, now with B fully populated.

Code example: reading CSVs and basic cleaning (optional file I/O)
```julia
using CSV, DataFrames, Statistics

# Load data from a CSV file (path must exist in your environment)
# df = CSV.read("data.csv", DataFrame)

# For demonstration, create a small DataFrame and pretend we loaded it
df = DataFrame(ID = 1:4, Score = [90, missing, 75, 88])

# Clean missing values in Score
meanScore = mean(skipmissing(df.Score))
df.Score = coalesce.(df.Score, meanScore)

df
```

### Line-by-line explanation
- using CSV, DataFrames, Statistics: bring in libraries to read CSVs and compute statistics.
- The CSV.read line is commented to avoid file I/O in this example, but illustrates typical usage.
- df = DataFrame(...): mock-up of loaded data with a missing Score.
- meanScore = mean(skipmissing(df.Score)): compute the non-missing mean for Score.
- df.Score = coalesce.(df.Score, meanScore): fill missing values with the mean.
- df: display the cleaned dataset.

## 3. Basic Transformations and Feature Engineering

Transformation involves selecting columns, filtering rows, and creating new features derived from existing data. In Julia, you can mutate in place or create new DataFrames with transform.

Code example: filtering, selecting, and mutating
```julia
# Start from a simple DataFrame
df = DataFrame(A = 1:5, B = [5, 6, 7, 8, 9])

# Create a new feature C as the product of A and B
df.C = df.A .* df.B

# Filter rows where A > 2 and select a subset of columns
df_sub = df[df.A .> 2, [:A, :B, :C]]

df_sub
```

### Line-by-line explanation
- df = DataFrame(...): create a DataFrame with numeric columns A and B.
- df.C = df.A .* df.B: add a new column C computing the elementwise product of A and B.
- df_sub = df[df.A .> 2, [:A, :B, :C]]: filter rows where A is greater than 2; select only A, B, C columns.
- df_sub: display the resulting subset.

Code example: simple feature engineering with transformation
```julia
# Normalize a numeric column (min-max scaling) and create a new feature
minB = minimum(df.B)
maxB = maximum(df.B)
df.B_norm = (df.B .- minB) ./ (maxB - minB)

# Alternatively, create a log-transformed feature where values > 0
df.logB = log.(df.B .+ 1.0)
```

### Line-by-line explanation
- minB = minimum(df.B), maxB = maximum(df.B): compute min and max of B for scaling.
- df.B_norm = (df.B .- minB) ./ (maxB - minB): perform elementwise min-max normalization; uses broadcasting with .
- df.logB = log.(df.B .+ 1.0): create a log-transformed feature for numerical stability by applying log to each value after adding 1 to avoid log(0).
- The dot syntax ensures elementwise broadcasting across the vector.

Code example: simple one-liner aggregations with transform
```julia
# Create a tiny dataset with a categorical column for grouping
df = DataFrame(Category = ["A","B","A","B","A"], Value = [10, 20, 30, 40, 50])

# Compute the total Value per Category and attach as a new column
df_totals = transform(groupby(df, :Category), :Value => sum => :Total)

df_totals
```

### Line-by-line explanation
- df = DataFrame(...): build a dataset with a Category label and a numeric Value.
- groupby(df, :Category): group the rows by Category for aggregation.
- :Value => sum => :Total: compute the sum of Value within each category; name the result Total.
- transform(...): produce a new DataFrame with the aggregated totals per category.
- df_totals: display the resulting grouped summary.

## 4. Numerical Computations with Arrays

Pandas often relies on NumPy under the hood for fast numeric ops. Julia uses native arrays with broadcasting to achieve similar performance and clarity.

Code example: elementwise operations and dot products
```julia
using LinearAlgebra

a = [1, 2, 3]
b = [4, 5, 6]

# Elementwise addition and subtraction
sum_ab = a .+ b
diff_ab = a .- b

# Dot product (scalar)
dot_ab = dot(a, b)

# Broadcasting with matrices
M = [1 2; 3 4]
scaled = 2 .* M
transposed = transpose(M)
```

### Line-by-line explanation
- using LinearAlgebra: import linear algebra utilities (dot product, transpose, etc.).
- a, b = [1,2,3], [4,5,6]: define two vectors.
- sum_ab = a .+ b: elementwise addition via broadcasting.
- diff_ab = a .- b: elementwise subtraction via broadcasting.
- dot_ab = dot(a, b): compute the dot product (sum of products).
- M = [1 2; 3 4]: define a 2x2 matrix.
- scaled = 2 .* M: multiply every element of M by 2 via broadcasting.
- transposed = transpose(M): compute the transpose of M.

Code example: basic statistical and linear algebra operations
```julia
# Normalization of a vector, and a simple PCA-like center and scale
X = [3.0, 1.0, 4.0, 1.5]
X_mean = mean(X)
X_centered = X .- X_mean
X_var = mean((X_centered).^2)
X_std = sqrt(X_var)

# Standard score (Z-score)
X_z = (X .- X_mean) ./ X_std
```

### Line-by-line explanation
- X = [3.0, 1.0, 4.0, 1.5]: define a floating-point vector for numerical stability.
- X_mean = mean(X): compute the mean.
- X_centered = X .- X_mean: center data by subtracting the mean.
- X_var = mean((X_centered).^2): compute variance (mean of squared centered values).
- X_std = sqrt(X_var): standard deviation.
- X_z = (X .- X_mean) ./ X_std: compute Z-scores via elementwise operations and broadcasting.

## 5. Grouping, Aggregations, and Pivot-like Operations

Groupby-then-aggregate patterns are core to data analysis. Julia’s DataFrames.jl provides groupby and combine, plus functions like stack/unstack for pivot-like reshaping.

Code example: group, aggregate, and pivot-like operations
```julia
df = DataFrame(Category = ["X","Y","X","Y","X"], Value = [1,2,3,4,5])

# Group by Category and compute multiple summaries
grp = groupby(df, :Category)
summary = combine(grp, :Value => sum => :Total, :Value => mean => :Average)

# Simple unstack/pivot-like operation (requires a second categorical column)
df_pivot = DataFrame(Category = ["X","X","Y","Y"], Subcat = ["a","b","a","b"], Value = [1,2,3,4])
pivot = unstack(df_pivot, :Subcat, :Value)
```

### Line-by-line explanation
- df = DataFrame(...): a small dataset with a categorical column Category and numeric Value.
- groupby(df, :Category): partition data by Category for aggregation.
- combine(grp, :Value => sum => :Total, :Value => mean => :Average): produce a summary DataFrame with Total and Average per category.
- df_pivot: example of a second categorical level for pivoting.
- unstack(df_pivot, :Subcat, :Value): reshape from long to wide format, producing a pivot-like table where Subcat levels become columns.

Code example: interoperability with Python (optional)
```julia
# Optional: use PyCall to access Python pandas/numpy if your team relies on cross-language workflows
# You can install PyCall and then import pandas and numpy as pandas, np
# using PyCall
# @pyimport pandas as pd
# @pyimport numpy as np

# This section is optional and for teams blending Julia and Python
```

### Line-by-line explanation
- This block demonstrates optional interoperability. It relies on PyCall to bridge Python libraries (pandas/numpy) into Julia. If your workflow is monolithic Julia, you can skip this.
- The commented lines show typical PyCall syntax for importing pandas as pd and numpy as np.

## X. Common Beginner Mistakes

Below are common pitfalls new Julia users encounter when emulating Pandas/NumPy workflows, with bad vs good examples.

1) Off-by-one indexing (Julia is 1-based)
- Bad:
```julia
# Attempting 0-based indexing (Python-style)
x = df[0, :A]
```
- Good:
```julia
x = df[1, :A]
```

2) Forgetting to broadcast for elementwise operations
- Bad:
```julia
# Might rely on implicit broadcasting
df.C = df.A + df.B
```
- Good:
```julia
df.C = df.A .+ df.B
```

3) Ignoring missing values during aggregation
- Bad:
```julia
# Will error or yield missing results if missing present
meanB = mean(df.B)
```
- Good:
```julia
meanB = mean(skipmissing(df.B))
```

4) In-place mutations vs copies in DataFrames
- Bad:
```julia
# Might lead to confusing behavior due to views/copies
df2 = df
df2.A = df.A .+ 1
```
- Good:
```julia
# Explicitly mutate the original or create a new DataFrame
df.A = df.A .+ 1      # in-place on the same DataFrame
# or
df2 = deepcopy(df)     # if you want an independent copy
```

5) Overlooking performance implications of loops
- Bad:
```julia
# Iterative loop mutating a column (less efficient for large data)
df[!, :C] = 0
for i in 1:nrow(df)
    df.C[i] = df.A[i] * df.B[i]
end
```
- Good:
```julia
# Vectorized/broadcast approach
df.C = df.A .* df.B
```

## Y. Why This Matters In Real Systems

Real systems handle large, evolving data streams. Efficient, readable manipulation code enables faster analytics cycles, easier debugging, and reliable pipelines.

- Performance: Julia’s DataFrames.jl and native arrays are designed for speed. Prefer vectorized operations and broadcasting over explicit loops for large datasets.
- Reproducibility: Use explicit pipelines, avoid in-place mutations when not necessary, and track transformations with clear, versioned code.
- Memory efficiency: Be mindful of memory footprint with large DataFrames. Use in-place operations, streaming where possible, and avoid unnecessary copies.
- Interoperability: Many orgs operate across JVM/Python ecosystems. Julia shines when used as a high-performance core; you can bridge with PyCall or Arrow for cross-language data exchange.
- Production readiness: Build robust data validation, unit tests for transformations, and document assumptions (data types, missing-value handling, and edge cases).

## Z. Study Questions

1) What is the Julia indexing base, and how does it differ from Python’s 0-based indexing?
2) How do you fill missing values in a column with a summary statistic (e.g., the mean) in Julia?
3) How would you compute a new column as the elementwise product of two existing columns?
4) Which functions would you use to group data by a categorical column and compute sum and mean per group?
5) What is the difference between broadcasting with . and standard arithmetic when operating on Julia arrays?

## Exercise

Part A: DataFrame creation, cleaning, and feature engineering
- Create a DataFrame with 8 rows and columns: UserID (Int), Score (Float64 with some missing values), and Category (String).
- Impute missing Score values with the median of non-missing scores.
- Create a new column Score_norm that scales Score to 0-1 range (min-max normalization).
- Group by Category and compute the average Score and the total Score per category. Return a summary table.

Part B: Array operations and statistics
- Create two numeric vectors A and B of length 100 with random values.
- Compute A_plus_B, A_minus_B via elementwise operations.
- Compute the correlation between A and B.

Part C: Simple CSV-like workflow (in code; no file I/O required)
- Build a small DataFrame that resembles a CSV load result (Category, Value).
- Pivot-like operation: unstack to create a matrix where each Category becomes a column and rows represent a simple index, filling missing with 0.

Part D: Reflection
- Explain in 2–3 paragraphs how you would measure and improve memory usage in these data manipulation steps in a production ETL job.

Note: Implementations may vary; focus on correct use of Julia primitives (DataFrames.jl, broadcasting with ., and safe handling of missing values).