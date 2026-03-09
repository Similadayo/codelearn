# Data Science & AI — Phase 2: Data Manipulation with Pandas & NumPy

Data manipulation is the workhorse of any data scientist: cleaning messy inputs, reshaping data to fit your analysis, and performing fast, vectorized computations on large datasets. In the Python data stack, Pandas provides high-level data structures (Series, DataFrame) and powerful indexing/shaping capabilities, while NumPy delivers efficient numerical arrays and fast mathematical operations. Mastery of Pandas and NumPy enables you to prototype quickly and scale to real-world datasets found in industry.

## 1. Getting Started with Pandas and NumPy
```python
import numpy as np
import pandas as pd

# NumPy array basics
arr = np.arange(6).reshape(2, 3)  # 2x3 array: [[0,1,2],[3,4,5]]
print("NumPy array:\n", arr)

# Pandas Series
s = pd.Series([10, 20, 30, 40], index=["a", "b", "c", "d"])
print("\nPandas Series:\n", s)

# Pandas DataFrame from a dict
df = pd.DataFrame({"id": [1, 2, 3], "name": ["Alice", "Bob", "Carol"], "score": [88.5, 92.0, 79.5]})
print("\nPandas DataFrame:\n", df)
```
### Line-by-line explanation
- Line 1-2: Import NumPy as np and Pandas as pd, the conventional aliases used throughout the Python data stack.
- Line 4: Create a 2x3 NumPy array containing sequential integers using arange(6) and reshape to shape (2, 3).
- Line 5: Print the NumPy array to verify its structure.
- Line 8: Create a Pandas Series with values [10, 20, 30, 40] and an explicit index ["a","b","c","d"].
- Line 9: Print the Series to inspect its index-label mapping and values.
- Line 12-13: Construct a Pandas DataFrame from a dictionary where keys become column names and values are lists of data.
- Line 14-15: Print the DataFrame to inspect its rows, columns, and dtypes.

## 2. Creating and Inspecting DataFrames and Arrays
```python
# Create a DataFrame with mixed types and a custom index
df2 = pd.DataFrame(
    {
        "city": ["New York", "Los Angeles", "Chicago", "New York"],
        "year": [2020, 2020, 2021, 2021],
        "population": [8.4e6, 4e6, 2.7e6, None],
        "growth": [0.01, 0.02, -0.01, 0.03],
    }
)
df2 = df2.set_index(pd.Index([101, 102, 103, 104], name="idx"))
print("\nDataFrame with mixed types and custom index:\n", df2)

# basic inspection
print("\nInfo:")
print(df2.info())

print("\nSummary statistics (numeric columns only):")
print(df2.describe(include="all"))
```
### Line-by-line explanation
- Line 4-12: Create a DataFrame with mixed column types: city (object), year (int), population (float with a missing value), and growth (float). Then set a custom integer index named "idx".
- Line 13-14: Print the DataFrame to verify its shape, dtypes, and index.
- Line 17-18: Use DataFrame.info() to inspect memory usage, non-null counts, and dtypes.
- Line 21-22: Use describe(include="all") to generate summary statistics for numeric and non-numeric columns; for numeric columns, this yields count, mean, std, min, 25th/50th/75th percentiles, max.

## 3. Indexing, Selection, and Filtering
```python
# Label-based selection with .loc
sel1 = df2.loc[101]  # row with index label 101
print("\nRow 101:\n", sel1)

# Slicing by label for multiple rows
sel2 = df2.loc[102:104]
print("\nRows 102 to 104:\n", sel2)

# Per-column access
city_series = df2['city']
print("\nCity column:\n", city_series)

# Boolean filtering
high_growth = df2[df2['growth'] > 0.0]
print("\nRows with positive growth:\n", high_growth)
```
### Line-by-line explanation
- Line 4: Use .loc to select a single row by its label (101). This returns a Series representing that row.
- Line 5-6: Print the selected row to inspect its values.
- Line 9: Use .loc with a slice of labels to select a range of rows from 102 to 104 (inclusive).
- Line 10-11: Print the sliced rows.
- Line 14: Access a single column by key, returning a Pandas Series for the "city" column.
- Line 17-18: Create a boolean mask where growth is greater than 0 and apply it to the DataFrame to filter rows.

## 4. Vectorized Operations and Aggregations
```python
# Simple column arithmetic (vectorized)
df2['population_k'] = df2['population'] / 1000
print("\nPopulation in thousands:\n", df2)

# Grouped aggregations (need a non-null subset)
# First, drop rows where population is missing for a clean aggregation
clean = df2.dropna(subset=['population'])
agg = clean.groupby('city')['population'].mean().reset_index(name='avg_population')
print("\nAverage population by city (na removed):\n", agg)

# NumPy-style operations on entire array
arr2 = np.array([[1, 2], [3, 4]])
print("\nArray operations:")
print("Sum over axis=0:", arr2.sum(axis=0))
print("Mean over axis=1:", arr2.mean(axis=1))
```
### Line-by-line explanation
- Line 4-5: Create a new column population_k by dividing the population by 1000; this demonstrates vectorized arithmetic applied elementwise across the Series.
- Line 6-9: Print the DataFrame with the new column to verify the operation.
- Line 12-13: Create a reduced DataFrame (clean) by dropping rows where population is missing to ensure accurate aggregation.
- Line 14-16: Use groupby on city and compute the mean of the population within each city; reset the index to produce a tidy result with a named column.
- Line 19-22: Demonstrate NumPy array operations on a small 2x2 array; compute column-wise sums and row-wise means using axis parameters.

## 5. Handling Missing Data
```python
# Detect missing values
missing_mask = df2.isna()
print("\nMissing value mask:\n", missing_mask)

# Fill missing values with sensible defaults
filled = df2.fillna({"population": df2['population'].mean(), "growth": 0.0})
print("\nDataFrame with missing values filled:\n", filled)

# Forward fill to propagate last valid observation
ffill = df2.ffill()
print("\nForward-filled DataFrame:\n", ffill)

# Drop any rows that still contain missing values
clean_drop = df2.dropna()
print("\nRows with any missing values dropped:\n", clean_drop)
```
### Line-by-line explanation
- Line 4: df2.isna() creates a boolean mask indicating which cells are missing (NaN/NA) in df2.
- Line 5-6: Print the mask to locate missing data patterns.
- Line 9-10: Use fillna to replace missing population with the mean of the population column and missing growth with 0.0; this yields a complete dataset for downstream analysis.
- Line 11-12: Print the filled DataFrame to verify replacements.
- Line 15-16: Use forward fill (ffill) to propagate the last known valid value down the column; this is common for time-series.
- Line 19-20: Drop any rows that still contain missing values; this yields a dataset with complete rows only.

## 6. Data Transformations: apply, map, transform
```python
# Map: transform a categorical column into codes
city_codes = {'New York': 1, 'Los Angeles': 2, 'Chicago': 3}
df2['city_code'] = df2['city'].map(city_codes)
print("\nDataFrame with city codes:\n", df2)

# Apply: transform each numeric column by a custom function (row-wise)
def normalize_row(row):
    # Avoid division by zero
    total = row[['population', 'growth']].sum()
    if total == 0:
        return row
    row['norm_pop'] = row['population'] / total
    row['norm_growth'] = row['growth'] / total
    return row

# Apply across DataFrame (axis=1 for row-wise)
normalized = df2.apply(normalize_row, axis=1)
print("\nRow-wise normalization:\n", normalized)

# Transform: perform a group-wise transformation
mean_growth_by_city = df2.groupby('city')['growth'].transform('mean')
df2['growth_centered'] = df2['growth'] - mean_growth_by_city
print("\nGrowth centered by city:\n", df2)
```
### Line-by-line explanation
- Line 4-5: Create a mapping dictionary for city codes and use Series.map to translate the city names into numeric codes; store in a new column city_code.
- Line 6-8: Print the DataFrame with the new city_code column.
- Line 11-18: Define a function normalize_row that computes a simple normalization using the sum of population and growth for each row; apply this function row-wise with df2.apply(..., axis=1) to produce a new DataFrame with norm_pop and norm_growth. Print to verify.
- Line 21-24: Use groupby on city and transform('mean') to align each row with the mean growth for its city; subtract this mean from the original growth to create a centered feature growth_centered. Print the resulting DataFrame.

## 7. Merging, Joining, and Concatenation
```python
# Create two smaller DataFrames to merge
df_sales = pd.DataFrame({
    'city': ['New York', 'Los Angeles', 'Chicago'],
    'year': [2020, 2020, 2021],
    'sales': [100, 150, 90]
})

df_population = pd.DataFrame({
    'city': ['New York', 'Los Angeles', 'Chicago', 'Houston'],
    'population_millions': [8.4, 4.0, 2.7, 2.3]
})

# Merge on city (inner)
merged_inner = pd.merge(df_sales, df_population, on='city', how='inner')
print("\nMerged (inner) on city:\n", merged_inner)

# Outer join to preserve all cities
merged_outer = pd.merge(df_sales, df_population, on='city', how='outer')
print("\nMerged (outer) on city:\n", merged_outer)

# Concatenate along rows (axis=0)
concat_rows = pd.concat([df_sales, df_sales], axis=0, ignore_index=True)
print("\nConcatenated along rows:\n", concat_rows)

# Concatenate along columns (axis=1) with alignment on index
df_geo = pd.DataFrame({'latitude': [40.7128, 34.0522, 41.8781], 'longitude': [-74.0060, -118.2437, -87.6298]})
df_combined = pd.concat([merged_inner, df_geo], axis=1)
print("\nConcatenated along columns (aligned by index):\n", df_combined)
```
### Line-by-line explanation
- Line 4-8: Build two small DataFrames, df_sales and df_population, with a common key column city.
- Line 11-13: Perform an inner merge on city to keep only cities present in both frames; print the result.
- Line 16-18: Perform an outer merge on city to retain all cities from both frames; print the result.
- Line 21-23: Use pd.concat to stack df_sales on top of itself (row-wise concatenation). ignore_index resets the index for a clean, continuous index.
- Line 26-28: Create a small df_geo with geographic coordinates and concatenate along columns (axis=1) with the previously merged data, aligning by index. Print the combined DataFrame.

## 8. Performance Tips and Vectorization
```python
import time

# Benchmark a loop vs a vectorized operation
# Create a large DataFrame
n = 1_000_0  # 1 million rows
data = {
    'a': np.random.rand(n),
    'b': np.random.rand(n)
}
large_df = pd.DataFrame(data)

# Vectorized operation
start_vec = time.time()
vec_result = large_df['a'] * large_df['b']
end_vec = time.time()

# Python loop (illustrative; slower)
start_loop = time.time()
loop_result = []
for i in range(n):
    loop_result.append(large_df['a'].iloc[i] * large_df['b'].iloc[i])
end_loop = time.time()

print("\nVectorized time:", end_vec - start_vec)
print("Loop time (illustrative):", end_loop - start_loop)
```
### Line-by-line explanation
- Line 1: Import time for simple benchmarking.
- Line 4: Set n to 1,000,000 rows; this creates a sizable dataset for performance testing.
- Line 5-9: Build a DataFrame large_df with two random numeric columns a and b.
- Line 12-16: Time a vectorized operation that multiplies column a by column b elementwise across the entire DataFrame.
- Line 19-25: Time a Python loop that performs the same multiplication by iterating over indices and appending results; this demonstrates the performance gap between vectorized operations and Python loops.
- Line 27-28: Print the measured times for comparison.
Note: In real systems, you would avoid explicit Python loops for data processing and rely on vectorized NumPy/Pandas operations, and for very large data, consider chunking, Dask, or database-backed operations.

## X. Common Beginner Mistakes
### 1) Chained indexing leading to unpredictable results
Bad:
```python
# Risky: chained indexing may return a view or a copy
subset = df2[df2['city'] == 'New York']['population']
subset = subset * 1.1
```
Good:
```python
# Use .loc for explicit, safe selection
subset = df2.loc[df2['city'] == 'New York', 'population']
subset = subset * 1.1
df2.loc[df2['city'] == 'New York', 'population'] = subset
```

### 2) Iterating over rows with iterrows/itertuples for large data
Bad:
```python
# Very slow on large data
results = []
for idx, row in df2.iterrows():
    results.append(row['population'] * 1.05)
df2['adjusted'] = results
```
Good:
```python
# Vectorized approach
df2['adjusted'] = df2['population'] * 1.05
```

### 3) Filling missing data with a constant for numeric columns
Bad:
```python
# Might hide data quality issues
df2['population'] = df2['population'].fillna(0)
```
Good:
```python
# Use meaningful defaults and domain-aware strategies
mean_pop = df2['population'].mean()
df2['population'] = df2['population'].fillna(mean_pop)
```

### 4) Forgetting to reset index after concatenation or filtering
Bad:
```python
# After filtering, index can be non-sequential
filtered = df2[df2['growth'] > 0.0]
print(filtered)
```
Good:
```python
# Reset index for clean downstream use
filtered = df2[df2['growth'] > 0.0].reset_index(drop=True)
print(filtered)
```

## Y. Why This Matters In Real Systems
- Data pipelines: Pandas and NumPy form the backbone of exploratory data analysis, feature engineering, and quick-win data cleaning in analytics pipelines.
- Reproducibility: Vectorized operations reduce the chance of mistakes that creep in with explicit Python loops, and explicit indexing reduces the risk of unintended mutations.
- Performance: For medium-sized datasets that fit in memory, Pandas/NumPy provide fast, vectorized operations that outperform interpreted loops by orders of magnitude. For larger-than-memory data, you’ll combine Pandas with Dask or SQL-backed workflows; always consider memory usage, data types, and chunking.
- Real-world data: Missing values, varying dtypes, misaligned indexes, and the need for merges/joins are daily realities; fluency in these operations translates to faster model development, cleaner data pipelines, and reliable analytics.

## Z. Study Questions
1. What is the difference between a Pandas Series and a DataFrame?
2. How do you select a subset of rows by label vs by position? Provide examples using .loc and .iloc.
3. What is vectorization, and why is it typically faster than Python loops when processing data in Pandas/NumPy?
4. How would you handle missing data differently in numeric vs categorical columns?
5. Explain the difference between inner, outer, left, and right joins in Pandas merges. Provide an example scenario for each.

## Exercise
Part A: Data generation and cleaning
- Generate a synthetic dataset with 1,000 rows and the following columns:
  - city: one of "New York", "Los Angeles", "Chicago", with duplicates.
  - year: 2019, 2020, or 2021.
  - sales: random integers between 100 and 1000, with about 10% missing.
  - rating: random float between 1.0 and 5.0, with about 5% missing.

Part B: Tasks
1) Create the DataFrame and set a clean, unique index named "record_id".
2) Compute a new column "sales_k" representing sales in thousands (sales / 1000). Ensure missing sales do not cause errors.
3) For each city, compute the average rating (ignoring missing values). Merge this back into the original DataFrame as a new column "city_avg_rating".
4) Create a summarized table that shows, for each year, the total sales and the average rating across all cities.
5) Demonstrate a robust handling of missing data by filling missing sales with the city-year median and filling missing ratings with the city-year median as well, then compute the same summary as in step 4.

Deliverable: A single Python script (or notebook cells) that executes these steps, with clear comments and minimal external dependencies beyond numpy and pandas. Include inline prints to show intermediate results.