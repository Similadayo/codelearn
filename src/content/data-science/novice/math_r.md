# Track: Data Science & AI — Phase 1: Data Foundations — Linear Algebra & Statistics (R)

In data science, linear algebra and statistics are the backbone of how we model, reason about, and extract meaning from data. This lesson builds practical intuition and hands-on skills in R for foundational topics: working with vectors and matrices, performing core linear algebra operations, exploring and summarizing data, and building simple statistical models. You’ll learn to think in terms of matrix equations, vectorized operations, and reproducible workflows—critical for scalable data science work in real systems.

## 1. Vectors, Matrices, and Basic Linear Algebra in R

Code blocks demonstrate how to create, transform, and manipulate vectors and matrices, plus solving small linear systems and comparing matrix vs element-wise operations.

```r
# Vectors and basic arithmetic
v <- c(1, 2, 3, 4)

# Create a 2x2 matrix (row-wise)
A <- matrix(c(1, 2, 3, 4), nrow = 2, byrow = TRUE)

# Create another 2x2 matrix
B <- matrix(c(5, 6, 7, 8), nrow = 2, byrow = TRUE)

# Matrix product (A %*% B)
prod <- A %*% B

# Element-wise product (Hadamard product)
ew_prod <- A * B

# Transpose of A
At <- t(A)

# Solve a small linear system A2 x = b
A2 <- matrix(c(2, 1, 1, 3), nrow = 2)  # 2x2
b <- c(1, 2)
x <- solve(A2, b)  # x = A2^{-1} b
```

### Line-by-line explanation breaking down each line

- v <- c(1, 2, 3, 4): Creates a numeric vector of length 4.
- A <- matrix(..., nrow = 2, byrow = TRUE): Builds a 2x2 matrix with values filled by row.
- B <- matrix(..., nrow = 2, byrow = TRUE): Builds another 2x2 matrix.
- prod <- A %*% B: Performs standard matrix multiplication, resulting in a 2x2 matrix.
- ew_prod <- A * B: Performs element-wise multiplication (Hadamard product), same dimension as A and B.
- At <- t(A): Computes the transpose of matrix A.
- A2 <- matrix(..., nrow = 2): Defines a 2x2 matrix for a linear system.
- b <- c(1, 2): Defines the right-hand side vector.
- x <- solve(A2, b): Solves A2 x = b for x using the inverse (or efficient solver) of A2.

## 2. Descriptive Statistics and Data Exploration in R

Code blocks show how to generate a sample dataset, summarize it, compute correlations, and visualize relationships.

```r
set.seed(42)

# Sample dataset with two predictors and a response
df <- data.frame(
  x1 = rnorm(200, mean = 5, sd = 2),
  x2 = rnorm(200, mean = -1, sd = 3)
)
df$y <- 2 + 0.5 * df$x1 - 0.2 * df$x2 + rnorm(200, sd = 1)

# Basic summaries
summ <- summary(df)
means <- sapply(df, mean)
sds <- sapply(df, sd)

# Correlations between numeric columns
cors <- cor(df)

# Pairwise scatter plots for quick exploration
pairs(df)
```

### Line-by-line explanation breaking down each line

- set.seed(42): Ensures reproducibility of random data.
- df <- data.frame(...): Creates a data frame with two numeric predictors x1 and x2.
- df$y <- ...: Defines a linear relationship with noise to serve as the response.
- summ <- summary(df): Produces a concise summary for each column (min, 1st quartile, median, mean, 3rd quartile, max).
- means <- sapply(df, mean): Computes the mean for each column in the data frame.
- sds <- sapply(df, sd): Computes the standard deviation for each column.
- cors <- cor(df): Computes a matrix of pairwise correlations among all numeric columns.
- pairs(df): Generates a matrix of scatter plots for all variable pairs to visually inspect relationships.

## 3. Linear Algebra Essentials: Matrix Operations and Projections in R

Code blocks illustrate scaling, principal component analysis (PCA), eigen decomposition, and a basic QR decomposition example—core techniques used in data transformations and dimensionality reduction.

```r
# Prepare predictor matrix X (two features)
X <- as.matrix(df[, c("x1","x2")])

# Standardize features (zero mean, unit variance)
X_scaled <- scale(X)

# PCA via prcomp on scaled data
pca <- prcomp(X_scaled, center = FALSE, scale. = FALSE)
pc1 <- pca$x[,1]
pc2 <- pca$x[,2]

# Eigen decomposition of the covariance matrix (of scaled data)
cov_mat <- cov(X_scaled)
eigen_res <- eigen(cov_mat)
eigen_values <- eigen_res$values
eigen_vectors <- eigen_res$vectors

# QR decomposition example (useful for solving linear systems, least squares)
A <- matrix(c(1, 2, 3, 4), nrow = 2)
qrA <- qr(A)
Q <- qr.Q(qrA)
R <- qr.R(qrA)
```

### Line-by-line explanation breaking down each line

- X <- as.matrix(df[, c("x1","x2")]): Extracts x1 and x2 and converts to a matrix for linear algebra.
- X_scaled <- scale(X): Standardizes columns of X to have mean 0 and sd 1.
- pca <- prcomp(X_scaled, center = FALSE, scale. = FALSE): Performs PCA on the scaled data without additional centering/scaling.
- pc1 <- pca$x[,1], pc2 <- pca$x[,2]: The scores for the first and second principal components.
- cov_mat <- cov(X_scaled): Computes the covariance matrix of the scaled data.
- eigen_res <- eigen(cov_mat): Performs eigen decomposition of the covariance matrix.
- eigen_values <- eigen_res$values, eigen_vectors <- eigen_res$vectors: Extracts eigenvalues and eigenvectors.
- A <- matrix(...): Defines a small matrix for the QR decomposition example.
- qrA <- qr(A): Computes the QR decomposition of A.
- Q <- qr.Q(qrA), R <- qr.R(qrA): Extracts the Q and R factors from the QR decomposition.

## 4. Statistical Modeling: Linear Regression and Diagnostics in R

Code blocks demonstrate fitting a linear regression model with lm, examining summaries, generating predictions and residuals, basic diagnostic plots, and solving the normal equations manually for comparison.

```r
# Linear regression using lm
fit <- lm(y ~ x1 + x2, data = df)

# Summary of the fitted model
summary_fit <- summary(fit)

# Predictions and residuals
fitted_vals <- fitted(fit)
res <- residuals(fit)

# Diagnostic plots (4 standard plots)
par(mfrow = c(2, 2))
plot(fit)

# Manual least-squares solution using normal equations
Xmat <- cbind(Intercept = 1, df$x1, df$x2)  # design matrix with intercept
Yvec <- df$y
beta_hat <- solve(t(Xmat) %*% Xmat) %*% t(Xmat) %*% Yvec

# Compare with built-in coefficients
coef_fit <- coef(fit)
identical(round(as.vector(beta_hat), 6), round(as.vector(coef_fit), 6))
```

### Line-by-line explanation breaking down each line

- fit <- lm(y ~ x1 + x2, data = df): Fits a linear model predicting y from x1 and x2 using least squares.
- summary_fit <- summary(fit): Retrieves a detailed summary including coefficients, standard errors, t-values, and p-values.
- fitted_vals <- fitted(fit): Extracts the model's predicted values on the observed data.
- res <- residuals(fit): Extracts residuals (observed - fitted).
- par(mfrow = c(2, 2)); plot(fit): Arranges a 2x2 grid and plots standard diagnostic plots (Residuals vs Fitted, Q-Q, Scale-Location, Residuals vs Leverage).
- Xmat <- cbind(Intercept = 1, df$x1, df$x2): Constructs the design matrix with an intercept term.
- Yvec <- df$y: Response vector.
- beta_hat <- solve(t(Xmat) %*% Xmat) %*% t(Xmat) %*% Yvec: Computes the normal equations solution beta_hat = (X^T X)^{-1} X^T y.
- coef_fit <- coef(fit): Extracts the coefficient estimates from the lm object.
- identical(...): Compares the two estimates to verify they match (within rounding tolerance).

## X. Common Beginner Mistakes

### Mistake 1: Matrix dimension mismatch and wrong operator
Bad:
```r
# Attempting matrix multiplication with incompatible shapes
A <- matrix(1:4, nrow = 2)
B <- matrix(1:3, nrow = 3)  # 3x1 or 3x? not conformable with A
C <- A %*% B
```
Good:
```r
A <- matrix(1:4, nrow = 2)
B <- matrix(5:8, nrow = 2)  # 2x2 compatible with A
C <- A %*% B
```

### Mistake 2: Ignoring NA values in statistics
Bad:
```r
vec <- c(1, 2, NA, 4)
mean(vec)
```
Good:
```r
vec <- c(1, 2, NA, 4)
mean(vec, na.rm = TRUE)
```

### Mistake 3: Not using vectorized operations and relying on loops
Bad:
```r
# Inefficient loop to compute column means
cols <- ncol(df)
means <- numeric(cols)
for (j in 1:cols) {
  means[j] <- mean(df[[j]])
}
```
Good:
```r
sapply(df, mean)
# or colMeans(as.matrix(df))
```

### Mistake 4: Not reproducible in experiments
Bad:
```r
set.seed(123)  # Not actually set in all branches
sample(1:100, 10)
```
Good:
```r
set.seed(12345)
sample(1:100, 10)
```

## Y. Why This Matters In Real Systems

- Reproducibility: In production you must reproduce results across runs and environments. Seeds, deterministic data pipelines, and versioned code matter.
- Numerical stability: Linear algebra routines (solvers, inverses) must be chosen carefully. For ill-conditioned systems, use QR or SVD-based approaches rather than naive inverses.
- Performance and scale: Large datasets require vectorization and efficient libraries. Favor matrix operations over explicit for-loops; leverage BLAS/LAPACK-backed implementations via base R or optimized packages.
- Data integrity: Handling NA, missing values, and outliers robustly is essential. Use na.rm in summaries, imputation strategies, and robust regression when appropriate.
- Reproducible preprocessing: Standardization, centering, and scaling should be applied consistently in training and deployment to avoid data leakage or drift.
- Interpretability: Linear models and PCA provide interpretable baselines and feature insights; they are often used as baselines before deploying more complex models.

## Z. Study Questions

1) What is the difference between matrix multiplication and element-wise multiplication in R? Provide code to illustrate both on a pair of 2x2 matrices.

2) How do you standardize a matrix in R, and why is standardization important for PCA?

3) How can you compute the least-squares solution without using lm? Provide the formula and a code snippet.

4) What is PCA, and how do you extract and interpret the first principal component using R functions?

5) How can you diagnose a linear regression model in R? Name two common diagnostic plots and what they reveal.

## Exercise

Your task is to build a small end-to-end example that uses linear algebra and statistics to explore a synthetic dataset, fit a model, and verify a manual computation against a built-in function. Complete all parts and ensure results are reproducible.

Part 1 — Data generation
- Create a synthetic dataset with two predictors x1 and x2 and a response y, with a known relationship: y = 1.5 + 2.0*x1 - 0.8*x2 + noise, where noise is Gaussian.

Part 2 — Descriptive statistics
- Compute basic summaries (mean, sd) for x1, x2, y.
- Compute the pairwise correlation matrix for the three variables.

Part 3 — Regression modeling
- Fit a linear model predicting y from x1 and x2 using lm.
- Print the summary and extract coefficients.

Part 4 — Manual least-squares verification
- Build the design matrix with an intercept and solve for beta_hat using the normal equations.
- Compare beta_hat to the coefficients from the lm model. They should be very close.

Part 5 — PCA on predictors
- Standardize x1 and x2, run PCA, and report the loadings (eigenvectors) for the first principal component. Interpret what the first component represents in terms of x1 and x2.

Part 6 — Optional extension (robustness)
- Repeat Part 3 with a small amount of outlier noise added to y, and discuss how the diagnostic plots reflect the presence of an outlier.

Sample Solution (for reference)

```r
set.seed(2024)

# Part 1: Data generation
n <- 200
x1 <- rnorm(n, mean = 5, sd = 2)
x2 <- rnorm(n, mean = -1, sd = 3)
noise <- rnorm(n, sd = 1)
y <- 1.5 + 2.0 * x1 - 0.8 * x2 + noise
df_ex <- data.frame(x1, x2, y)

# Part 2: Descriptive statistics
summary(df_ex)
sapply(df_ex, sd)
cor(df_ex)

# Part 3: Regression modeling
fit <- lm(y ~ x1 + x2, data = df_ex)
summary(fit)

# Part 4: Manual least-squares verification
Xmat <- cbind(Intercept = 1, df_ex$x1, df_ex$x2)
Yvec <- df_ex$y
beta_hat <- solve(t(Xmat) %*% Xmat) %*% t(Xmat) %*% Yvec
beta_hat
coef(fit)

# Part 5: PCA on predictors
X <- as.matrix(df_ex[, c("x1","x2")])
X_scaled <- scale(X)
pca <- prcomp(X_scaled, center = FALSE, scale. = FALSE)
pca$rotation[,1]  # loadings for PC1
pca$x[,1]         # scores on PC1

# Interpretation: PC1 is a linear combination of x1 and x2 that captures the most variance in the data.
```

This lesson provides a solid foundation in linear algebra and statistics using R, with concrete code, explanations, and best-practice considerations for real-world data science work.