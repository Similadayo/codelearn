# Data Science & AI — Phase 1: Data Foundations — Linear Algebra & Statistics (Julia)

Linear algebra and statistics are the core languages of Data Science. In Phase 1, you’ll learn to represent data as vectors and matrices, manipulate these structures efficiently in Julia, and compute essential statistical summaries that underpin model training and evaluation. Building a solid foundation here enables you to debug models, optimize data pipelines, and implement numerical methods used in real systems.

## 1.

### 1. Scalars, Vectors, and Matrices in Julia
This section covers the core data types you’ll use daily: scalars, vectors, and matrices. You’ll see how to perform common operations, differences between elementwise and linear-algebra operations, and how to inspect shapes.

```julia
using LinearAlgebra
using Random
using Statistics

# Scalars
a = 3.0

# Vectors (1D arrays)
v = [1.0, 2.0, 3.0]

# Matrices (2D arrays)
M = [1.0 2.0;
     3.0 4.0;
     5.0 6.0]  # 3x2 matrix

# Vector-matrix products
v2 = [4.0, 5.0]      # length 2
Mv = M * v2            # 3x2 times 2 -> 3-element vector

# Transpose (conjugate for complex; real case is just transpose)
Mt = transpose(M)      # 2x3

# Dot product (1D case)
d = dot(v2, [1.0, -1.0])  # scalar: 4*(-1) + 5*(1) = 1

# Inverse (requires a square matrix)
N = [1.0 2.0;
     3.0 4.0]            # 2x2
N_inv = inv(N)            # 2x2 inverse

# Norms
nrm_v = norm(v)            # 2-norm of v
```

### Line-by-line explanation
- `using LinearAlgebra` imports core linear algebra routines (norms, eigenvalues, solvers, etc.).
- `using Random` and `using Statistics` prepare for random data generation and basic statistics (mean, stdev, etc.).
- `a = 3.0` stores a scalar.
- `v = [1.0, 2.0, 3.0]` creates a 1D array (vector) with three elements.
- `M = [...]` defines a 3x2 matrix (3 rows, 2 columns).
- `v2 = [4.0, 5.0]` defines a 2-element vector for multiplication with M.
- `Mv = M * v2` computes the matrix-vector product; compatible shapes are required (3x2 times 2x1 yields a 3-element vector.
- `Mt = transpose(M)` flips the matrix’s dimensions to 2x3.
- `d = dot(v2, [1.0, -1.0])` computes the dot product of two vectors; both must have the same length.
- `N = [...]` defines a 2x2 matrix suitable for inversion.
- `N_inv = inv(N)` computes the inverse of N.
- `nrm_v = norm(v)` computes the Euclidean (2-norm) of the vector v.
  
---

## 2.

### 2. Matrix Operations and Linear Transformations
Dive deeper into matrix algebra: matrix-matrix multiplication, linear transformations, norms, and eigenvalues. These operations are the bread-and-butter of data transformations in ML pipelines.

```julia
# Simple linear transformation
A = [1.0 0.0;
     0.0 2.0]        # 2x2
x = [1.0, 3.0]       # 2-element vector
y = A * x              # Apply transformation

# Norms and distances
norm_y = norm(y)

# Eigenvalues (and eigenvectors)
B = [2.0 0.0;
     0.0 3.0]
eigs = eigen(B)          # returns a structure with values and vectors
vals = eigs.values
vecs = eigs.vectors

# Solving linear systems
A = [3.0 1.0;
     1.0 2.0]
b = [9.0, 8.0]
sol = A \ b                 # Solve Ax = b

# Overdetermined systems (least-squares)
A_ls = [1.0 0.0;
        1.0 1.0;
        1.0 2.0]
b_ls = [2.0, 2.5, 3.5]
x_ls = A_ls \ b_ls           # Best-fit x in least-squares sense
```

### Line-by-line explanation
- `A` and `x` define a simple linear transformation; `y = A * x` applies that transform to x.
- `norm(y)` computes the Euclidean length of y as a measure of its magnitude.
- `eigen(B)` computes eigen decomposition; the resulting object has `values` and `vectors` fields.
- `sol = A \ b` uses the backslash operator to solve a square system Ax = b with a direct solver.
- For the overdetermined system, `A_ls` has more equations than unknowns; `A_ls \ b_ls` yields a least-squares solution that minimizes the residual.

---

## 3.

### 3. Solving Linear Systems and Least Squares
This section formalizes solving systems of equations and computing least-squares solutions, including a brief look at normal equations. You’ll see both direct and least-squares approaches.

```julia
# Direct solve (square system)
A = [3.0 1.0;
     1.0 2.0]
b = [9.0, 8.0]
x_direct = A \ b

# Least-squares via backslash (overdetermined)
A_over = [1.0 2.0;
          3.0 4.0;
          5.0 6.0]
b_over = [7.0, 8.0, 9.0]
x_ls = A_over \ b_over

# Normal equations (explicit, not usually preferred if A is well-conditioned)
AtA = A' * A
Atb = A' * b
x_ne = AtA \ Atb
```

### Line-by-line explanation
- The block begins with a square system; `A \ b` yields the exact solution if A is invertible.
- The next block shows solving an overdetermined system with more equations than unknowns; Julia’s backslash operator returns the least-squares solution by minimizing the residual.
- The normal-equations approach computes (A'A)x = A'b explicitly; in practice, using A \ b is often preferable due to numerical stability, but this demonstrates the concept.

---

## 4.

### 4. Basic Statistics with Julia
Statistics provides the essential summaries you’ll rely on in model diagnostics, feature exploration, and data cleaning. This section covers descriptive statistics, covariance/correlation, and simple random data generation.

```julia
using Random
using Statistics

Random.seed!(123)

# Generate data: 100 samples of 3 features
X = randn(100, 3)    # each row is an observation, each column a feature

# Descriptive statistics (per feature)
mean_per_feature = mean(X, dims=1)      # 1x3 row vector
std_per_feature  = std(X, dims=1)       # 1x3

# Covariance matrix (features as variables; rows are observations)
cov_matrix = cov(X)                      # 3x3

# Correlation between two features
corr_1_2 = cor(X[:, 1], X[:, 2])        # scalar correlation between feature 1 and 2

# Simple sampling
sample_normal = randn(5)                 # 5 samples from standard normal
```

### Line-by-line explanation
- `Random.seed!` ensures reproducible randomness across runs.
- `X = randn(100, 3)` creates a 100x3 matrix; each row is an observation and each column a feature.
- `mean(X, dims=1)` computes per-feature means; the result is a 1x3 row vector.
- `std(X, dims=1)` computes per-feature standard deviations.
- `cov(X)` computes the covariance matrix where entry (i,j) is Cov(feature i, feature j).
- `cor(X[:,1], X[:,2])` computes the Pearson correlation between feature 1 and feature 2.
- `randn(5)` draws 5 samples from a standard normal distribution.

---

## 5.

### 5. Numerical Linear Algebra Practicalities
Production code benefits from performance-conscious patterns: in-place computations to avoid allocations, attention to data layout, and scalable decompositions. This section demonstrates practical techniques and common patterns.

```julia
# In-place multiplication to save allocations
n = 1000
A = randn(n, n)
b = randn(n)

# Without in-place, this allocates a new output
y = A * b

# With in-place to reuse memory
y_inplace = similar(b)
mul!(y_inplace, A, b)   # stores A*b into y_inplace

# Broadcasting vs explicit loops for clarity/perf
x = randn(1000)
# Explicit loop (less idiomatic in Julia for vector ops)
s_loop = 0.0
for i in eachindex(x)
  s_loop += x[i]^2
end

# Idiomatic vectorized approach
s_vec = sum(x .^ 2)      # or use norm(x)^2

# Singular Value Decomposition (PCA-like)
X = randn(50, 20)
U, S, Vt = svd(X)
k = 5
X_approx = U[:, 1:k] * Diagonal(S[1:k]) * Vt[1:k, :]
```

### Line-by-line explanation
- `A = randn(n, n)` and `b = randn(n)` create large matrices/vectors for a stress test example.
- `y = A * b` computes the product, producing a new allocation.
- `y_inplace = similar(b)` allocates an output vector of the same size as b without new allocations during computation.
- `mul!(y_inplace, A, b)` performs the in-place multiplication; the result is stored in `y_inplace`.
- The explicit loop accumulates the squared values; this demonstrates a non-idiomatic approach for performance.
- `sum(x .^ 2)` is the idiomatic Julia approach using broadcasting to compute the sum of squares efficiently.
- `svd(X)` computes the singular value decomposition; taking the first k components reconstructs a low-rank approximation, a common PCA analogue.

---

## X.

### 6. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Confusing elementwise operations with matrix multiplication
- Pitfall 2: Not using the proper dot product or misusing transposes
- Pitfall 3: Ignoring data orientation when computing covariances or means
- Pitfall 4: Avoiding in-place ops, causing unnecessary allocations

Bad vs Good

- Pitfall 1
  - Bad
    ```julia
    A = [1.0 2.0; 3.0 4.0]
    B = [1.0, 1.0]
    # Elementwise multiply (wrong for linear transform)
    Z = A .* B  # broadcasting yields a 2x2 result, not a matrix product
    ```
  - Good
    ```julia
    A = [1.0 2.0; 3.0 4.0]
    B = [1.0, 1.0]
    Z = A * B  # correct matrix-vector product
    ```

- Pitfall 2
  - Bad
    ```julia
    v = [1.0, 2.0, 3.0]
    w = [4.0, 5.0, 6.0]
    s = v' * w  # yields a 1x1 Matrix, not a scalar
    ```
  - Good
    ```julia
    v = [1.0, 2.0, 3.0]
    w = [4.0, 5.0, 6.0]
    s = dot(v, w)  # scalar dot product
    ```

- Pitfall 3
  - Bad
    ```julia
    X = randn(100, 3)
    # Supposing mean over all elements, not per-feature
    m = mean(X)  # scalar; not per-feature mean
    ```
  - Good
    ```julia
    X = randn(100, 3)
    mean_per_feature = mean(X, dims=1)  # 1x3, per-feature means
    ```

- Pitfall 4
  - Bad
    ```julia
    # Treating rows as features in covariance
    X = randn(100, 3)
    cov_rows = cov(X')  # transposing flips orientation; error-prone
    ```
  - Good
    ```julia
    X = randn(100, 3)
    cov_cols = cov(X)    # rows are observations, columns are features
    ```

- Pitfall 5 (bonus): Inadequate numeric type choices
  - Bad
    ```julia
    A = [1 2; 3 4]  # Int
    b = [1.0, 1.0]  # Float
    x = A \ b  # might cause type instability
    ```
  - Good
    ```julia
    A = [1.0 2.0; 3.0 4.0]  # Float64
    b = [1.0, 1.0]
    x = A \ b
    ```

---

## Y.

### 7. Why This Matters In Real Systems — production context and real usage
- Linear algebra underpins every ML model: linear regression, ridge, LASSO, and many neural network operations rely on matrix multiplications, decompositions (SVD, eigen), and linear solvers. Efficient, numerically stable implementations prevent slow training loops and unstable predictions in production.
- Data pipelines rely on accurate statistics for normalization, standardization, and feature engineering. Per-feature statistics drive model convergence and comparability across batches and deployments.
- Real systems require careful memory management and performance considerations: in-place operations, avoiding unnecessary copies, and exploiting efficient BLAS/LAPACK-backed routines. This reduces latency and CPU/GPU usage in production workloads.
- Understanding orientation and shapes prevents silent bugs when integrating with external libraries or migrating between languages. Clear conventions for observations vs features and the columns-vs-rows alignment matter when building reproducible datasets.

---

## Z.

### 8. Study Questions — 5 recall questions
1) What is the difference between a matrix product A * B and elementwise multiplication A .* B? When should you use each?
2) How do you compute a dot product in Julia, and why might v' * w produce a 1x1 matrix instead of a scalar?
3) How would you obtain a least-squares solution for an overdetermined system in Julia? Which operator is used, and what is the rationale?
4) Which Julia function gives you the singular values and right singular vectors of a matrix, and how can you use them for PCA-like dimensionality reduction?
5) Why are in-place operations (mul!, similar) important in production data pipelines, and what risk do they mitigate?

---

## Exercise

### Multi-part practical coding challenge

You will implement a small end-to-end workflow in Julia: a simple linear regression via normal equations, followed by a PCA-based dimensionality reduction and evaluation.

Part A — Linear regression via normal equations
1) Generate a dataset X of shape (100, 3) with standard normal features and a true coefficient vector β = [1.5, -2.0, 0.5]. Create y = X*β + noise, where noise ~ N(0, 0.1^2).
2) Add a bias term to X (i.e., augment X with a column of ones) to allow for an intercept.
3) Compute the ordinary least squares solution for β_hat using the normal equations method (the explicit (X'X)^{-1} X'y approach).
4) Compute predictions y_hat for the training data and report the root-mean-square error (RMSE) between y and y_hat.
5) Compare β_hat to the true β; comment on closeness given the noise.

Part B — PCA-based dimensionality reduction
1) Take a new dataset Z of shape (80, 5) with correlated features (generate Z by Z = W * S + ε where W is 5x3, S is 3x80, ε noise).
2) Center Z per feature (subtract per-feature mean).
3) Compute the SVD Z = U S Vᵀ and project Z onto the top 2 components: Z_proj = U[:,1:2] * Diagonal(S[1:2]) * Vt[1:2, :]
4) Reconstruct an approximation Z_approx using only the top 2 components and compare the reconstruction error to the original Z (per-entry mean squared error).
5) Report the explained variance captured by the top 2 components and interpret.

Part C — Small reflection
Provide a short reflection (2–3 sentences) on how you would adapt these techniques when scaling to large datasets and when you would prefer iterative solvers over direct normal equations.

Note: You can run this in a single Julia file or a Jupyter/Pluto notebook. Use the standard library and avoid adding extra dependencies for this exercise. Include comments explaining each step.

End of lesson.