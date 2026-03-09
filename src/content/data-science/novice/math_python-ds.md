# Track: Data Science & AI — Module: Phase 1 — Data Foundations — Topic: Linear Algebra & Statistics (Python Data Stack)

Linear algebra and statistics are foundational to every data science and AI workflow. In practice, you will manipulate vectors and matrices to represent data and models, extract structure with decompositions, and reason about uncertainty and relationships using statistical measures. This lesson uses the Python data stack (NumPy, SciPy, pandas) to build intuition, demonstrate robust patterns, and prepare you for real-world ML pipelines where numerical stability and performance matter.

## 1. Vectors, Matrices, and Basic Operations with NumPy

This section covers core linear algebra primitives you’ll use daily: creating vectors and matrices, verifying shapes, performing elementwise vs. matrix operations, solving linear systems, and computing decompositions. You’ll see practical examples you can adapt for feature engineering, model fitting, and data transformation.

```python
import numpy as np

# Vectors
a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])

# Basic arithmetic (elementwise)
v_sum = a + b            # [5.0, 7.0, 9.0]
v_diff = a - b           # [-3.0, -3.0, -3.0]

# Dot product (scalar)
dot = np.dot(a, b)       # 1*4 + 2*5 + 3*6 = 32.0

# Matrix examples
A = np.array([[1.0, 2.0],
              [3.0, 4.0]])
B = np.array([[5.0, 6.0],
              [7.0, 8.0]])

# Matrix product
prod = A @ B               # 2x2 matrix

# Solve a linear system Ax = b
A_sys = np.array([[3.0, 1.0, -1.0],
                  [2.0, 4.0, 0.0],
                  [-1.0, 2.0, 5.0]])
b_sys = np.array([2.0, 7.0, 3.0])
x = np.linalg.solve(A_sys, b_sys)

# Residual of the solution: Ax - b
residual = A_sys @ x - b_sys

# Eigen decomposition (spectral properties)
w, V = np.linalg.eig(A_sys)

# Broadcasting example: scale every element of A by 2
C = A * 2
```

### Line-by-line explanation
1. Import NumPy as the standard alias np for numerical operations.
2. Create a 1-D vector a with three elements.
3. Create a second 1-D vector b with three elements.
4. Compute elementwise sum of a and b; result is a new vector.
5. Compute elementwise difference of a and b.
6. Compute the dot product of a and b, yielding a scalar.
7. Define a 2x2 matrix A.
8. Define another 2x2 matrix B.
9. Compute the matrix product A @ B (standard matrix multiplication).
10. Define a 3x3 matrix A_sys for a linear system.
11. Define the right-hand side vector b_sys.
12. Solve the linear system Ax = b for x.
13. Compute the residual vector by evaluating A_sys @ x and subtracting b_sys.
14. Compute eigenvalues (w) and eigenvectors (V) of A_sys.
15. Multiply every entry of A by 2 using broadcasting.

---

## 2. Basic Statistics with NumPy

Statistics tell you what the data are like and how they relate. In practice you’ll compute measures of central tendency, dispersion, and relationships between variables. This section covers mean, median, std, variance, handling NaNs, covariance, and correlation.

```python
import numpy as np

# Seed for reproducibility
np.random.seed(0)

# Generate sample data from a normal distribution
data = np.random.normal(loc=5.0, scale=2.0, size=1000)

# Descriptive statistics
mean = np.mean(data)
std = np.std(data, ddof=0)      # population std
var = np.var(data)
median = np.median(data)

# Handling NaNs gracefully
data_with_nan = np.array([1.0, np.nan, 2.0, 3.0])
mean_nan = np.nanmean(data_with_nan)
std_nan = np.nanstd(data_with_nan)

# Generate a simple bivariate sample to compute covariance and correlation
x = np.random.normal(size=1000)
y = 0.5 * x + np.random.normal(scale=0.5, size=1000)

cov_xy = np.cov(x, y, ddof=0)[0, 1]
corr_xy = np.corrcoef(x, y)[0, 1]

# Discrete distribution example (binomial)
k = np.random.binomial(n=10, p=0.5, size=1000)
```

### Line-by-line explanation
1. Import NumPy for numerical operations.
2. Set a fixed random seed to ensure reproducibility across runs.
3. Draw 1000 samples from a normal distribution with mean 5.0 and standard deviation 2.0.
4. Compute the sample mean of data.
5. Compute the population standard deviation of data (ddof=0 means divide by N).
6. Compute the population variance of data.
7. Compute the median of data.
8. Create an array with a NaN to demonstrate missing data handling.
9. Compute the mean ignoring NaNs (nanmean).
10. Compute the standard deviation ignoring NaNs (nanstd).
11. Generate two correlated variables x and y for covariance/correlation analysis.
12. Compute the covariance between x and y (ddof=0 for population covariance) and extract the (0,1) element.
13. Compute the Pearson correlation coefficient between x and y.
14. Generate 1000 outcomes of a Binomial(n=10, p=0.5) experiment to illustrate discrete distributions.

---

## 3. Matrix Decompositions and Their Uses (PCA, Eigen, SVD)

Decompositions reveal structure in data. Eigen decomposition and singular value decomposition (SVD) underpin PCA, dimensionality reduction, and many ML algorithms. This section demonstrates how to compute and interpret these decompositions and how to project data onto principal components.

```python
import numpy as np

# Create a centered data matrix (observations as rows, features as columns)
X = np.random.randn(100, 5)          # 100 samples, 5 features
Xc = X - X.mean(axis=0)               # center features (zero mean)

# Singular Value Decomposition (SVD)
U, s, Vt = np.linalg.svd(Xc, full_matrices=False)

# Choose top-k components (e.g., k=2)
k = 2
V_top = Vt[:k, :]                     # top-k principal directions (in feature space)
X_pca = Xc @ V_top.T                    # project data onto top-k components

# Explained variance ratio (approximate)
explained_variance = (s ** 2) / (len(Xc) - 1)
explained_ratio = explained_variance[:k] / explained_variance.sum()

# Alternative: eigen decomposition on covariance matrix (not as numerically stable for large data)
cov_matrix = np.cov(Xc, rowvar=False)
eig_vals, eig_vecs = np.linalg.eig(cov_matrix)

```

### Line-by-line explanation
1. Import NumPy for numerical operations.
2. Generate a 100x5 matrix of standard normal values; rows are samples, columns are features.
3. Center each feature by subtracting its column mean.
4. Compute the compact SVD of the centered data: U, singular values s, and Vt (transposed right-singular vectors).
5. Define the number of components k to retain (2 in this example).
6. Extract the top-k right-singular vectors (principal directions) from Vt.
7. Project the centered data onto the top-k components to obtain X_pca.
8. Compute the per-component explained variance from the squared singular values.
9. Compute the ratio of explained variance for the top-k components to the total explained variance.
10. Compute the covariance matrix of the centered data (features as variables).
11. Compute eigenvalues and eigenvectors of the covariance matrix (alternative to SVD for PCA intuition).

---

## 4. Probabilistic Thinking: Distributions and Inference (Basic)

Understanding distributions and standardized measures helps you reason about uncertainty and model assumptions. This section covers sampling, z-scores, percentiles, and a light touch on the Central Limit Theorem via simulation.

```python
import numpy as np

np.random.seed(42)

# Draw samples from a normal distribution
samples = np.random.normal(loc=0.0, scale=1.0, size=10000)

# Descriptive stats
mean = np.mean(samples)
std = np.std(samples, ddof=0)

# Standardize to z-scores
z_scores = (samples - mean) / std

# Percentiles
p90 = np.percentile(samples, 90)

# Demonstrate CLT via sampling means
means = [np.mean(np.random.normal(size=1000)) for _ in range(1000)]
mean_of_means = np.mean(means)
std_of_means = np.std(means, ddof=0)
```

### Line-by-line explanation
1. Import NumPy.
2. Set a fixed seed for reproducibility.
3. Draw 10,000 samples from a standard normal distribution (mean 0, std 1).
4. Compute the overall mean of the samples.
5. Compute the population standard deviation of the samples.
6. Convert the raw samples to z-scores by centering and scaling by the standard deviation.
7. Compute the 90th percentile of the samples.
8. Generate 1000 independent means, each from a sample of size 1000, to illustrate the Central Limit Theorem.
9. Compute the mean of these 1000 sample means.
10. Compute the standard deviation of these 1000 sample means.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

| Bad | Good |
|---|---|
| Using Python lists for numeric vector operations; e.g., sum of two lists or elementwise multiply is not vectorized. | Use NumPy arrays for vectorized arithmetic; converts lists to arrays first if needed. |
| Not handling NaNs in statistics; e.g., mean(data_with_nan) returns NaN, leading to downstream failures. | Use nanmean, nanstd, and friends to ignore NaNs when appropriate. |
| Inverting a matrix to solve a linear system; x = inv(A) @ b is numerically unstable and slow for large systems. | Solve with x = np.linalg.solve(A, b) which is more stable and efficient. |
| Broadcasting mistakes without awareness of shapes; e.g., multiplying a (2,3) array by a (3,) array may be unintended. | Use explicit broadcasting with shapes or use np.newaxis to align axes intentionally, e.g., A * b[None, :] or A * b[:, None]. |
| Not seeding the RNG leading to non-reproducible results in experiments. | Always set a deterministic seed for reproducible experiments. |

- Bad example 1 (not vectorized)
```python
# Bad
lst1 = [1, 2, 3]
lst2 = [4, 5, 6]
# This is elementwise in a loop; slow in Python and not vectorized
sum_list = []
for i in range(len(lst1)):
    sum_list.append(lst1[i] + lst2[i])
```
- Good example 1 (vectorized)
```python
# Good
import numpy as np
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])
sum_vec = a + b
```

- Bad example 2 (NaN handling)
```python
# Bad
data = np.array([1.0, np.nan, 2.0])
mean = data.mean()  # becomes NaN
```
- Good example 2 (nan-safe)
```python
# Good
mean_nan_safe = np.nanmean(data)
```

- Bad example 3 (invert-and-multiply)
```python
# Bad
A = np.array([[2.0, 0.0], [0.0, 3.0]])
b = np.array([1.0, 2.0])
x = np.linalg.inv(A) @ b
```
- Good example 3 (solve)
```python
# Good
x = np.linalg.solve(A, b)
```

- Bad example 4 (unintended broadcasting)
```python
# Bad: shapes (2,3) and (3,)
A = np.array([[1,2,3],[4,5,6]])
b = np.array([1,2,3])
scaled = A * b  # broadcast across rows (likely unintended)
```
- Good example 4 (explicit broadcasting)
```python
# Good
scaled = A * b[np.newaxis, :]
```

- Bad example 5 (no seed)
```python
# Bad (non-deterministic)
x = np.random.rand(5)
```
- Good example 5 (seed)
```python
# Good
np.random.seed(1234)
x = np.random.rand(5)
```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Data preprocessing: Vectors and matrices underpin feature engineering, normalization, and encoding schemes. Efficient operations enable real-time or near-real-time data pipelines.
- Model fitting and evaluation: Linear models (linear regression, ridge, lasso) rely on solving linear systems and computing projections; PCA uses SVD or eigen decompositions for dimensionality reduction before model training.
- Numerical stability: Inversion-based methods can be unstable; using solvers (np.linalg.solve) or regularization improves robustness, especially with ill-conditioned data.
- Scalability: Large datasets require batching, sparse representations, and sometimes randomized algorithms (e.g., randomized SVD). Understanding decompositions helps you choose scalable approaches.
- Reproducibility and testing: Deterministic seeding, careful handling of NaNs, and explicit broadcasting rules improve testability and reliability in production.
- Interpretability: Covariance, correlation, and PCA provide intuition about feature relationships and latent structure, aiding feature selection and model debugging.

---

## Z. Study Questions — 5 recall questions

1. What is the difference between the dot product of two vectors and the matrix product of two matrices?
2. How do you compute the top-k principal components of a dataset using NumPy?
3. Why is np.linalg.solve(A, b) generally preferred over x = np.linalg.inv(A) @ b for solving Ax = b?
4. How do you standardize a dataset (convert to z-scores) using NumPy?
5. What is the difference between covariance and correlation, and when would you prefer one over the other?

---

## Exercise — Practical multi-part coding challenge

Part A: Descriptive statistics and normalization
- Given a small dataset, compute column means, standard deviations, and z-scores for each feature. Handle any NaN values gracefully.

Part B: Closed-form linear regression (normal equations)
- Create a simple dataset X (shape n x m) and y (length n). Implement linear regression using the normal equation:
  theta = (X^T X)^{-1} X^T y
- Include a column of ones in X to learn an intercept term.
- Compute predictions on the training set and report RMSE.

Part C: Verify with numpy.linalg.lstsq
- Solve the same regression problem using np.linalg.lstsq and compare theta to the one from Part B. Explain any small numerical differences.

Part D: PCA on standardized data
- Center and scale a small dataset, perform SVD, and project onto the first two principal components. Report the shapes of the projected data and the explained variance ratios.

Part E: End-to-end mini-workflow
- Build a tiny, reproducible pipeline that:
  - Generates synthetic data with known linear relationships.
  - Standardizes features.
  - Fits a linear regression model (via normal equations).
  - Evaluates RMSE and prints the learned coefficients, comparing them to the true coefficients used to generate the data.

Sample scaffold you can adapt:

```python
import numpy as np

# Part A: Descriptive stats and normalization
np.random.seed(0)
X = np.random.randn(50, 3)  # 50 samples, 3 features
# Introduce a NaN to test handling
X[0, 1] = np.nan

# Compute column means, ignoring NaNs
means = np.nanmean(X, axis=0)
# Compute column stds, ignoring NaNs
stds = np.nanstd(X, axis=0)

# Standardize (z-score) with NaN handling
X_std = (X - means) / stds
# Replace any remaining NaNs with 0 after standardization
X_std = np.nan_to_num(X_std)

# Part B: Closed-form linear regression
# Create true coefficients for synthetic data
true_beta = np.array([1.5, -2.0, 0.5])
# Generate y with some noise
epsilon = 0.1 * np.random.randn(50)
y = X_std @ true_beta + epsilon

# Add intercept term to X
X_design = np.hstack([np.ones((X_std.shape[0], 1)), X_std])

# Normal equation solution
XtX = X_design.T @ X_design
XtY = X_design.T @ y
beta_hat = np.linalg.solve(XtX, XtY)

# Predictions and RMSE
y_pred = X_design @ beta_hat
rmse = np.sqrt(np.mean((y - y_pred) ** 2))

print("Beta_hat:", beta_hat)
print("RMSE:", rmse)

# Part C: Verify with lstsq
beta_hat_lstsq, residuals, rank, s = np.linalg.lstsq(X_design, y, rcond=None)
print("Beta_hat (lstsq):", beta_hat_lstsq)

# Part D: PCA on standardized data
# Use X_std (already standardized, without NaNs)
U, s, Vt = np.linalg.svd(X_std, full_matrices=False)
k = 2
X_pca = X_std @ Vt[:k].T
explained_variance = (s ** 2) / (X_std.shape[0] - 1)
explained_ratio = explained_variance[:k] / explained_variance.sum()
print("X_pca shape:", X_pca.shape)
print("Explained variance ratio (top-2):", explained_ratio)

# Part E: End-to-end summary
# Compare learned coefficients to true_beta, discuss scaling and intercept implications
```

Notes and tips:
- Ensure you understand when to center data (for PCA) vs. not (some modeling scenarios require raw data).
- When comparing beta_hat and beta_hat_lstsq, small numerical differences are normal due to conditioning and solver tolerances.
- Expand the exercise by experimenting with different noise levels, feature correlations, or adding regularization (ridge) to observe effects on coefficients and RMSE.
- Use pandas.DataFrame for more ergonomic data handling if you wish to annotate features or join with labels.

If you’d like, I can tailor the exercise to a particular dataset or expand any section with additional examples (e.g., regularized regression, matrix conditioning analysis, or a more extensive PCA + clustering workflow).