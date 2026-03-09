# Python Basics for Data Science — R Edition

In this module, we teach data science foundations using R while drawing direct parallels to Python concepts. You’ll learn core data types, control flow, data inspection and manipulation, and practical habits that enable reproducible, scalable data work in real systems. Even though the topic’s name references Python, the material is presented in R to strengthen your ability to translate ideas across languages—an essential skill in professional data science where teams may leverage different stacks.

## 1. Data Types, Variables, and Basic Operations

R basics map closely to Python fundamentals: numbers, text, booleans, sequences, and simple data structures. You’ll learn how to assign values, inspect types, and perform elementary operations.

```r
# Basic assignments and types
x <- 3.14                 # numeric (double)
name <- "Alice"           # character
flag <- TRUE                # logical

# Vectors and sequences
vec <- c(1, 2, 3, 4, 5)    # numeric vector
int_vec <- 1L:5L           # integer vector (L suffix creates integers)

# A small data frame (common data structure in data science)
DF <- data.frame(
  id = 1:3,
  score = c(85, 92, 78),
  group = c("A", "B", "A"),
  stringsAsFactors = FALSE  # important in older R versions; keeps strings as text
)

# Inspect structure and types
str(list(x = x, name = name, flag = flag, vec = vec, int_vec = int_vec, DF = DF))
# Basic aggregations
total_score <- sum(DF$score)
average_score <- mean(DF$score)
```

### Line-by-line explanation
- x <- 3.14 assigns a numeric (double) value to x.
- name <- "Alice" creates a character string for name.
- flag <- TRUE stores a boolean (logical) value.
- vec <- c(1, 2, 3, 4, 5) builds a numeric vector by concatenating elements with c().
- int_vec <- 1L:5L creates an integer sequence from 1 to 5 (L ensures integer type).
- DF <- data.frame(...) constructs a data frame with columns id, score, and group; stringsAsFactors = FALSE ensures character columns stay as text rather than factors on older R versions.
- str(...) prints the internal structure of the created objects to aid understanding of types and shapes.
- total_score and average_score compute the sum and mean of the score column, illustrating base aggregation.

---

## 2. Control Flow and Functions

Control flow and functions are the bread-and-butter for data processing. We’ll cover idiomatic conditionals, loops (for illustration only, since vectorized approaches are usually faster), and defining reusable functions.

```r
# If/else using vectorized form
threshold <- 60
grade <- ifelse(DF$score >= threshold, "Pass", "Fail")

# For loops (less common for vectors, but instructional)
squared <- numeric(length(DF$score))
for (i in seq_along(DF$score)) {
  squared[i] <- DF$score[i]^2
}

# Vectorized alternative (preferred)
squared_vec <- DF$score^2

# Define a simple function
summarize_scores <- function(data) {
  list(
    total = sum(data$score),
    average = mean(data$score),
    max = max(data$score),
    min = min(data$score)
  )
}
summary_result <- summarize_scores(DF)
```

### Line-by-line explanation
- threshold <- 60 sets a numeric threshold for categorizing scores.
- grade <- ifelse(DF$score >= threshold, "Pass", "Fail") applies a vectorized conditional over the score column, producing a character vector.
- squared <- numeric(length(...)) allocates an empty numeric vector the same length as the score vector.
- The for loop iterates over each index and assigns the square of each score to the corresponding element in squared.
- squared_vec <- DF$score^2 performs vectorized squaring directly, which is typically faster and more idiomatic in R.
- summarize_scores defines a function taking a data frame (data) and returns a list with total, average, max, and min scores.
- summary_result <- summarize_scores(DF) calls the function and stores results.

---

## 3. Basic Data Inspection and Manipulation

Inspecting and transforming data is central to data science. We’ll touch on quick inspection, summarization, and a concise manipulation workflow using dplyr (a popular tidyverse package).

```r
# Quick inspection (base R)
head(DF)
summary(DF)

# If you have dplyr installed, use tidyverse-style verbs
library(dplyr)

df2 <- DF %>%
  mutate(score_scaled = score / max(score)) %>%   # add a new derived column
  filter(group != "C") %>%                         # subset rows
  arrange(desc(score))                             # sort by score descending

# Quick glance at the transformed data
glimpse(df2)
```

### Line-by-line explanation
- head(DF) shows the first few rows of the data frame for a quick peek.
- summary(DF) provides per-column descriptive statistics (min, max, quartiles, etc.).
- library(dplyr) loads the dplyr package for tidyverse-style data manipulation.
- The pipe chain df2 <- DF %>% mutate(...) %>% filter(...) %>% arrange(...) performs chained transformations:
  - mutate(score_scaled = score / max(score)) adds a normalized score column.
  - filter(group != "C") keeps only rows where group is not "C".
  - arrange(desc(score)) sorts rows in descending order of score.
- glimpse(df2) provides a compact summary of the transformed data structure.

---

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

### Pitfall 1 — Assignment styles: <- vs =
Bad:
```r
a = 5
```
Good:
```r
a <- 5
```
Comment: In R, <- is the canonical assignment operator. = is allowed in many contexts (e.g., inside function calls) but can be confusing for assignment at top level.

### Pitfall 2 — 0-based indexing vs 1-based indexing
Bad:
```r
vec <- c(10, 20, 30)
first <- vec[0]      # returns numeric(0); non-intuitive in R
```
Good:
```r
first <- vec[1]      # 10 (R uses 1-based indexing)
```

### Pitfall 3 — Not vectorizing computations
Bad:
```r
# Using a loop to double each element
res <- numeric(length(vec))
for (i in seq_along(vec)) {
  res[i] <- vec[i] * 2
}
```
Good:
```r
res <- vec * 2           # vectorized operation, faster and concise
```

### Pitfall 4 — Strings vs factors when reading data
Bad (older defaults that can cause issues):
```r
df_bad <- data.frame(name = c("Alice","Bob"))
```
Good (explicit or modern defaults):
```r
df_good <- data.frame(name = c("Alice","Bob"), stringsAsFactors = FALSE)
```
Comment: Factors can complicate text handling; prefer characters for textual data unless you need categoricals.

### Pitfall 5 — Reproducibility: not fixing randomness
Bad:
```r
sample(1:100, 5)
```
Good:
```r
set.seed(42)
sample(1:100, 5)
```
Comment: set.seed ensures reproducible results across runs, which is essential in data science workflows.

---

## Y. Why This Matters In Real Systems

- Reproducibility: Consistent seeds, explicit data handling, and documented transformations ensure others can reproduce results, a cornerstone of scientific integrity and collaboration.
- Scalability: Vectorized operations and tidyverse pipelines scale much better than explicit loops, enabling processing of large datasets typical in production.
- Maintainability: Clear data structures (data frames / tibbles), explicit naming, and modular functions simplify maintenance and onboarding.
- Data quality and governance: Explicit typing (strings vs factors), proper factor handling, and robust inspection steps catch data issues early.
- Deployment readiness: Clean, well-documented code maps well to production scripts, batch jobs, and containerized environments; logs, versioning, and testability become practical.

In production, you’ll often combine these basics with data ingestion (e.g., read_csv), data cleaning (mutate, filter), modeling pipelines, and reporting dashboards. R’s ecosystem (tidyverse, data.table, ggplot2) supports end-to-end workflows from raw data to insights, while the same concepts transfer to Python, enabling collaboration across heterogeneous teams.

---

## Z. Study Questions

1) What is the canonical assignment operator in R and how does it differ from Python’s equals sign usage?  
2) How do you create and inspect a simple vector in R? Provide a code example.  
3) How does 1-based indexing in R affect element access compared to Python’s 0-based indexing? Give an example.  
4) Why would you use vectorized operations over explicit loops in R? Provide a side-by-side example.  
5) What is the purpose of set.seed in data science workflows?

---

## Exercise

Part A: Create and explore a small dataset
- Set a reproducible seed and generate a data frame of 200 observations with id, category, and score.
- Ensure category is a factor with ordered levels A, B, C.

Part B: Descriptive statistics per category
- Compute mean, median, and standard deviation of score by category using dplyr.

Part C: Feature engineering
- Create a binary column pass where score >= 60.

Part D: Visualization
- Plot a histogram of score colored by category (use ggplot2 if available; otherwise base R).

Part E: Export results
- Save the augmented dataset to a CSV file named "student_scores.csv".

Code scaffold (fill in as you practice):

```r
# Part A: Setup and data generation
set.seed(123)
library(dplyr)

df_ex <- data.frame(
  id = 1:200,
  category = sample(c("A","B","C"), 200, replace = TRUE),
  score = rnorm(200, mean = 75, sd = 10)
)

# Ensure category is a factor with ordered levels
df_ex$category <- factor(df_ex$category, levels = c("A","B","C"), ordered = TRUE)

# Part B: Descriptive statistics by category
stats_by_cat <- df_ex %>%
  group_by(category) %>%
  summarise(
    count = n(),
    mean_score = mean(score),
    median_score = median(score),
    sd_score = sd(score)
  )

# Part C: Feature engineering
df_ex <- df_ex %>% mutate(pass = score >= 60)

# Part D: Visualization
# If ggplot2 is available
if (requireNamespace("ggplot2", quietly = TRUE)) {
  library(ggplot2)
  p <- ggplot(df_ex, aes(x = score, fill = category)) +
    geom_histogram(binwidth = 3, position = "dodge") +
    labs(title = "Score Distribution by Category", x = "Score", y = "Count")
  print(p)
} else {
  # Fallback to base R
  hist(df_ex$score, breaks = 20, main = "Score Distribution", xlab = "Score")
}

# Part E: Export
write.csv(df_ex, "student_scores.csv", row.names = FALSE)
```

Line-by-line explanation (exercise)
- Set a seed to ensure reproducible random sampling and data generation.
- Create df_ex with id, category, and score columns, drawing category randomly and score from a normal distribution.
- Convert category to an ordered factor to reflect a natural ordering A < B < C.
- Use dplyr to group by category and compute count, mean, median, and standard deviation of scores.
- Add a binary pass column indicating whether each score meets the passing threshold.
- Attempt to load ggplot2; if available, render a histogram colored by category; otherwise, fall back to a base histogram.
- Save the final augmented dataset to a CSV file for downstream reporting or auditing.

This complete lesson provides a structured pathway from fundamental R data types and operations through practical data manipulation, visualization, and reproducible workflows, all aligned with Python-like data science concepts so you can translate ideas across languages in real systems.