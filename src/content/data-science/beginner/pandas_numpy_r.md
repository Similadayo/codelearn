# Pandas & NumPy in an R Stack: Phase 2 — Data Manipulation

In the world of Data Science & AI, Pandas and NumPy are foundational for high-performance data manipulation and numerical computing. This lesson translates those core ideas into the R ecosystem using equivalents like the tidyverse (dplyr, tidyr, tibble), data.table, and base R primitives. You’ll learn vectorized operations, DataFrame-like manipulation, missing data strategies, joins, reshaping, and performance considerations—important for robust, scalable data pipelines in production systems.

## 1. NumPy-like Core: Vectorized Operations and Arrays in R

Code examples show how to perform numerical computations with vectors and matrices in R, mirroring NumPy-style workflows.

```r
# NumPy-like concepts in R: vectors, recycling, and matrix broadcasting

# Create two numeric vectors
x <- c(1, 2, 3, 4, 5)
y <- c(10, 20, 30, 40, 50)

# Element-wise vectorized operations (no explicit loops)
sum_vec  <- x + y      # 1+10, 2+20, ...
prod_vec <- x * y      # 1*10, 2*20, ...
mean_x   <- mean(x)    # average of x

# Matrix broadcasting (per-column scaling) using sweep
M <- matrix(1:6, nrow = 2, ncol = 3, byrow = TRUE)
scales <- c(1, 2, 3)   # one scale per column
M_scaled <- sweep(M, 2, scales, FUN = "*")  # multiply each column by its scale
```

### Line-by-line explanation
- Line 1-2: Define two numeric vectors x and y with matching lengths to enable element-wise operations.
- Line 5: Compute element-wise sum of x and y.
- Line 6: Compute element-wise product of x and y.
- Line 7: Compute the mean of vector x.
- Line 10: Create a 2x3 matrix M with values 1 through 6, filled by row.
- Line 11: Define per-column scaling factors.
- Line 12: Use sweep to multiply each column of M by its corresponding scale, effectively broadcasting the per-column vector across rows.

## 2. Pandas-like DataFrame Manipulations in R

This section shows DataFrame-like operations using the tidyverse (dplyr/tidyr) to mirror Pandas workflows: filtering, mutating, grouping, and summarizing.

```r
library(dplyr)
library(tidyr)

df <- tibble(
  id = 1:8,
  group = rep(c("A","B"), each = 4),
  value = c(5, 6, 7, 8, 9, 10, 11, 12),
  score = c(0.5, NA, 0.9, 0.4, NA, 0.6, 0.8, 0.2)
)

summary <- df %>%
  filter(value > 6, !is.na(score)) %>%          # subset rows
  mutate(score_norm = score / max(score, na.rm = TRUE)) %>%  # derive new column
  group_by(group) %>%                           # aggregate by group
  summarise(mean_value = mean(value),            # compute summaries
            max_value  = max(value),
            n          = n(),
            .groups = "drop")
```

### Line-by-line explanation
- Line 4-9: Create a tibble (a modern DataFrame) with columns id, group, value, and score.
- Line 12-15: Start a pipeline:
  - filter: keep rows where value > 6 and score is not NA.
  - mutate: create a normalized score column by dividing by the maximum non-NA score.
  - group_by: group rows by the group column for downstream aggregation.
  - summarise: compute per-group mean(value), max(value), and count; drop the grouping afterwards.

## 3. Data Ingestion, Merges, and Reshaping in R

Learn how to read data, handle missing values, join datasets, and reshape data between long and wide formats—common Pandas tasks translated to R.

```r
library(readr)
library(dplyr)
library(tidyr)

# Ingestion: small inline datasets (could be read_csv/read_parquet in real use)
df1 <- tibble(id = 1:5, value = c(10, NA, 30, 40, 50))
df2 <- tibble(id = c(3, 4, 5, 6), category = c("X","Y","X","Z"))

# Missing data handling: fill NAs with a domain-relevant statistic
mean_value <- mean(df1$value, na.rm = TRUE)
df1_clean <- df1 %>% mutate(value = ifelse(is.na(value), mean_value, value))

# Merges/joins: left_join by id
merged <- df1_clean %>% left_join(df2, by = "id")

# Reshaping: long to wide
long_table <- tibble(id = c(1, 1, 2, 2),
                     time = c("t1", "t2", "t1", "t2"),
                     measure = c(5.0, 6.0, 7.0, 8.0))

wide_table <- long_table %>% pivot_wider(names_from = time, values_from = measure)
```

### Line-by-line explanation
- Line 6-7: Load libraries needed for data ingestion, manipulation, and reshaping.
- Line 10-11: Create two small data frames df1 and df2 with overlapping key id.
- Line 14-15: Compute the mean of df1$value ignoring NAs, then fill NAs with that mean.
- Line 16-17: Perform a left join on id to combine df1_clean with df2, preserving all rows from df1_clean.
- Line 20-23: Create a small long-format table with id, time, and measure.
- Line 25-26: Convert from long to wide format so each distinct time becomes a separate column.

## 4. Performance and Real Systems Considerations

Production data workflows demand speed, memory efficiency, and reliability. This section demonstrates performance-conscious patterns and tools in R.

```r
library(data.table)

# data.table for memory-efficient, fast operations
DT <- data.table(id = 1:1e6, value = rnorm(1e6))

# Vectorized, memory-efficient computation
DT[, log_value := log1p(value)]          # adds a new column by reference

# Fast joins: set a key and join on that key
setkey(DT, id)
# Example: a second, small table to join
DT2 <- data.table(id = c(100, 200, 300), tag = c("a","b","c"))
joined <- DT[DT2, nomatch = 0]           # fast inner join via data.table syntax
```

### Line-by-line explanation
- Line 5: Load data.table for high-performance data manipulation.
- Line 8: Create a large data.table DT with 1,000,000 rows and a numeric value column.
- Line 11: Compute log1p(value) in a vectorized, in-place style and store in a new column log_value.
- Line 14: Set a key on id to optimize joins; data.table uses binary search on keyed columns.
- Line 16-17: Create a smaller lookup table DT2.
- Line 18: Perform a fast inner join by taking DT as the left table and DT2 as the right table; nomatch = 0 excludes non-matching rows.

Note: For truly large-scale analytics, consider columnar storage (Parquet via arrow), out-of-core processing, or distributed backends.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: For loops vs vectorization

Bad:
```r
# For-loop to double a vector
vec <- 1:10
out <- numeric(length(vec))
for (i in seq_along(vec)) {
  out[i] <- vec[i] * 2
}
```

Good:
```r
# Vectorized operation
vec <- 1:10
out <- vec * 2
```

### Line-by-line explanation
- Bad approach uses an explicit loop to compute each element, which is slow for large vectors.
- Good approach leverages R’s vectorized arithmetic, executing in optimized native code.

### Pitfall 2: NA handling in aggregations

Bad:
```r
mean_score <- mean(df$score)  # if df$score has NA, result is NA
```

Good:
```r
mean_score <- mean(df$score, na.rm = TRUE)
```

### Line-by-line explanation
- Bad: mean returns NA if any NA values exist; downstream analysis may break.
- Good: na.rm = TRUE removes NAs during calculation, producing a usable statistic.

### Pitfall 3: Mismatched join keys / types

Bad:
```r
# df1$id is numeric, df2$id is character
library(dplyr)
left_join(df1, df2, by = "id")
```

Good:
```r
# Align types before join
df1 <- df1 %>% mutate(id = as.character(id))
df2 <- df2 %>% mutate(id = as.character(id))
joined <- left_join(df1, df2, by = "id")
```

### Line-by-line explanation
- Bad: Joining on a key with mismatched types yields NULL/NA matches; results are unreliable.
- Good: Coerce join keys to the same type to ensure correct matches and predictable results.

### Pitfall 4: Memory inefficiency through repeated copies

Bad:
```r
df <- read_csv("data.csv")
df <- mutate(df, new_col = compute(df$old_col))
```

Good:
```r
library(data.table)
DT <- fread("data.csv")
DT[, new_col := compute(old_col)]
```

### Line-by-line explanation
- Bad: Creating new intermediate copies may double memory usage, causing pressure on RAM.
- Good: data.table syntax with in-place updates minimizes copies and improves memory usage.

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Use scripted R workflows (R script or R Markdown) with set.seed or RNG versioning to reproduce results.
- Efficiency: For large datasets, vectorized operations and data.table give substantial speedups and lower memory footprints.
- Reliability: Dealing with missing data gracefully (na.rm, explicit imputation) prevents downstream failures.
- Pipelines: Integrate with ETL pipelines (e.g., cron, Airflow, or other schedulers) and store outputs in stable formats (Parquet/CSV, with proper schemas).
- Collaboration: Use tidyverse conventions and data.table idioms to maintain readable, version-controlled code across teams.
- Observability: Add logging and simple unit tests for data transformations to catch regressions early.

## Z. Study Questions — 5 recall questions

1. What is the R equivalent of vectorized NumPy operations, and how do you perform per-column broadcasting in R?
2. How do you compute a group-wise mean with dplyr while handling NA values?
3. How can you transform data from long to wide format in R? Name a function and provide a brief example.
4. Why might you choose data.table over a pure tidyverse pipeline for large datasets?
5. What does na.rm do in aggregation functions like mean() and sum(), and why is it important?

## Exercise — practical multi-part coding challenge

Part A: Create a synthetic dataset
- Generate a data frame with 200,000 rows containing: id (1:200000), group (A/B/C), value (uniform 1-100), score (random 0-1 with 5% NA).

Part B: Clean and transform
- Replace NA scores with the group-wise median.
- Create a new metric score_norm = score / max(score, na.rm = TRUE) within each group.

Part C: Join with a mapping dataset
- Create a second data frame mapping id to category (randomly assign a category from {"alpha","beta","gamma"}).
- Left join the main dataset with the mapping on id.

Part D: Reshape and summarize
- Compute per-group statistics: average value, median score_norm, and count of rows.
- Pivot to wide format where each group becomes a column of the mean_value.

Part E: Persist results
- Write the final per-group summary to a CSV file and to Parquet using the arrow package.

Example scaffolding to guide you (you should implement fully in your environment):

```r
# Part A
set.seed(123)
N <- 200000
df <- tibble(
  id = 1:N,
  group = sample(c("A","B","C"), N, replace = TRUE),
  value = runif(N, 1, 100),
  score = ifelse(runif(N) < 0.95, runif(N, 0, 1), NA_real_)
)

# Part B
library(dplyr)
median_by_group <- df %>% group_by(group) %>% summarise(med_score = median(score, na.rm = TRUE))
df <- df %>% left_join(median_by_group, by = "group")
df <- df %>% mutate(score = ifelse(is.na(score), med_score, score)) %>% select(-med_score)
df <- df %>% group_by(group) %>% mutate(score_norm = score / max(score, na.rm = TRUE)) %>% ungroup()

# Part C
mapping <- tibble(id = df$id, category = sample(c("alpha","beta","gamma"), N, replace = TRUE))
result <- df %>% left_join(mapping, by = "id")

# Part D
summary <- result %>%
  group_by(group) %>%
  summarise(avg_value = mean(value),
            median_score_norm = median(score_norm, na.rm = TRUE),
            count = n()) %>%
  pivot_wider(names_from = group, values_from = c(avg_value, median_score_norm, count))

# Part E
library(readr)
write_csv(summary, "group_summary.csv")

# Parquet (optional)
library(arrow)
write_parquet(summary, "group_summary.parquet")
```

This lesson provides a practical, real-world bridge between Pandas/NumPy concepts and R workflows, equipping you to manipulate data efficiently in production-grade data science projects.