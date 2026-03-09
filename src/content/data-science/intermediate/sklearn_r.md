# Phase 3 — Machine Learning: Supervised & Unsupervised Learning using Scikit-Learn in R

Data science workflows commonly alternate between supervised tasks (predicting labels or values from data) and unsupervised tasks (discovering structure in data without labels). Scikit-Learn provides a rich set of algorithms for both, but you can leverage them from R through the reticulate package. This lesson shows practical, production-oriented examples of using Scikit-Learn inside R, including setup, supervised classification, unsupervised clustering, and end-to-end pipelines. You’ll learn how to build reproducible ML pipelines in a hybrid R/Python environment, which is increasingly common in industry where teams combine domain modeling in R with scalable ML in Python.

## 1. Conceptual Overview: Supervised vs Unsupervised Learning (via Scikit-Learn in R)

```r
# Minimal R example shell demonstrating the distinction using Python code via reticulate
library(reticulate)

py_run_string("
# Generate a small synthetic dataset suitable for supervised learning
from sklearn.datasets import make_classification
X, y = make_classification(n_samples=120, n_features=4, n_informative=3, n_redundant=1, random_state=42)

# Split into train/test sets for supervised learning evaluation
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

print('X_train shape:', X_train.shape)
print('y_train shape:', y_train.shape)
print('X_test shape:', X_test.shape)
print('y_test shape:', y_test.shape)

# Note: Unsupervised learning would not use y; this block illustrates the separation of concepts.
")
```

### Line-by-line explanation breaking down each line
- library(reticulate): Load the R package that enables Python interoperability.
- py_run_string("..."): Execute a block of Python code from within R.
- from sklearn.datasets import make_classification: Import a function to synthesize a labeled dataset.
- X, y = make_classification(...): Generate features X and labels y with controlled randomness.
- train_test_split(...): Create a train/test split for evaluating supervised models.
- X_train, X_test, y_train, y_test = ...: Unpack the split datasets.
- print(...): Output shapes to verify the split worked.
- The final comment notes that unsupervised learning would not use y and is conceptually distinct from this block.

## 2. Setting Up Scikit-Learn in R (Reticulate)

```r
library(reticulate)

# Optional: select a Python environment (adjust paths as needed)
# use_python("/usr/bin/python3", required = TRUE)

# Install scikit-learn if it isn't available in the chosen environment
if (!py_module_available("sklearn")) {
  message("Installing scikit-learn in a dedicated environment...")
  py_install("scikit-learn", envname = "r-scikit", method = "auto")
}

# Confirm Python and scikit-learn are accessible
py_run_string("
import sys
print('Python version:', sys.version)
import sklearn
print('scikit-learn version:', sklearn.__version__)
")
```

### Line-by-line explanation breaking down each line
- library(reticulate): Load the bridge for Python in R.
- if (!py_module_available("sklearn")) { py_install(...) }: Check for scikit-learn; install if missing, using a dedicated environment to avoid conflicts.
- py_run_string("..."): Run Python code to print versions for visibility and debugging.
- import sys; print(...): Show Python version and scikit-learn version to ensure compatibility.

Notes:
- In production, consider pinning versions and using a reproducible environment (e.g., conda or venv) for all ML steps.
- If you manage multiple projects, you may want to create a project-specific Python environment and point reticulate to it with use_virtualenv or use_condaenv.

## 3. Supervised Learning: Classification with Scikit-Learn (via Reticulate)

```r
library(reticulate)

# Python block: load Iris, split data, build a pipeline with scaling + logistic regression, evaluate accuracy
py_run_string("
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# Load dataset
iris = load_iris()
X, y = iris.data, iris.target

# Split into train/test with stratification to preserve class distribution
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Create a machine learning pipeline: standardize features then apply logistic regression
pipeline = Pipeline([('scaler', StandardScaler()), ('clf', LogisticRegression(max_iter=200))])

# Train the model
pipeline.fit(X_train, y_train)

# Predict on the test set
pred = pipeline.predict(X_test)

# Evaluate
acc = accuracy_score(y_test, pred)
")

# Retrieve the result from Python back into R
acc <- py$acc
acc
```

### Line-by-line explanation breaking down each line
- from sklearn.datasets import load_iris: Import a familiar, well-labeled dataset for quick validation.
- iris = load_iris(); X, y = iris.data, iris.target: Load features and labels into Python vectors.
- train_test_split(..., stratify=y): Split data while preserving label distribution, reducing sampling bias.
- Pipeline([...]): Build a processing chain that first scales features then fits a logistic regression model.
- StandardScaler(): Normalize features to mean 0 and variance 1, improving many learners’ performance.
- LogisticRegression(max_iter=200): Use logistic regression with a higher iteration cap to ensure convergence on some datasets.
- pipeline.fit(X_train, y_train): Train the entire pipeline end-to-end.
- pipeline.predict(X_test): Generate predictions for the held-out set.
- accuracy_score(y_test, pred): Compute a simple accuracy metric to quantify performance.
- acc <- py$acc: Bring the Python result back into R for reporting and plotting.

## 4. Unsupervised Learning: Clustering with Scikit-Learn

```r
library(reticulate)

# Python block: load Iris, apply KMeans clustering, and compute a basic cluster quality metric
py_run_string("
from sklearn.datasets import load_iris
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

iris = load_iris()
X = iris.data
# Perform clustering with a chosen number of clusters
kmeans = KMeans(n_clusters=3, random_state=42)
kmeans.fit(X)
labels = kmeans.labels_
inertia = kmeans.inertia_
# Evaluate clustering quality (mean silhouette score) - higher is better
sil_score = silhouette_score(X, labels)
")

# Retrieve results
labels <- py$labels
inertia <- py$inertia
sil_score <- py$sil_score

list(labels = labels, inertia = inertia, silhouette = sil_score)
```

### Line-by-line explanation breaking down each line
- from sklearn.cluster import KMeans: Import the KMeans clustering model.
- iris = load_iris(); X = iris.data: Load features for clustering; note that there are no labels used in unsupervised learning.
- KMeans(n_clusters=3, random_state=42): Instantiate KMeans with 3 clusters and a fixed seed for reproducibility.
- kmeans.fit(X): Fit the clustering model to the data.
- labels = kmeans.labels_: The cluster assignments for each sample.
- inertia = kmeans.inertia_: Sum of squared distances of samples to their closest cluster center (a common quick metric).
- silhouette_score(X, labels): Compute a clustering quality metric. In practice you might use silhouette_score with X and labels.
- py$labels, py$inertia, py$sil_score: Bring results back into R for reporting.

## 5. Putting It All Together: A Small ML Pipeline with Both Supervised & Unsupervised Steps

```r
library(reticulate)

# Python block: run both supervised and unsupervised steps on Iris data
py_run_string("
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, silhouette_score, adjusted_rand_score

iris = load_iris()
X, y = iris.data, iris.target

# Supervised path: train-test split, pipeline, evaluation
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
pipe = Pipeline([('scaler', StandardScaler()), ('clf', LogisticRegression(max_iter=200))])
pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)
acc = accuracy_score(y_test, pred)

# Unsupervised path: clustering on the full dataset
kmeans = KMeans(n_clusters=3, random_state=42)
kmeans.fit(X)
labels = kmeans.labels_
sil = silhouette_score(X, labels)
ari = adjusted_rand_score(y, labels)

")
acc <- py$acc
sil <- py$sil
ari <- py$ari

list(accuracy = acc, silhouette = sil, adjusted_rand_index = ari)
```

### Line-by-line explanation breaking down each line
- from sklearn.pipeline import Pipeline: Create reusable ML pipelines that couple preprocessing and modeling steps.
- from sklearn.metrics import accuracy_score, silhouette_score, adjusted_rand_score: Pull three commonly used metrics for supervised, unsupervised, and agreement evaluation.
- X_train, X_test, y_train, y_test = train_test_split(..., stratify=y): Ensure evaluation remains faithful to class distribution.
- Pipeline(...): Chain scaling and classifier to avoid manual feature transformations.
- pipe.fit(...); pred = pipe.predict(...); acc = accuracy_score(...): Evaluate supervised learning on the test set.
- kmeans = KMeans(n_clusters=3, random_state=42); kmeans.fit(X); labels = kmeans.labels_: Run an unsupervised clustering on the full dataset.
- sil = silhouette_score(X, labels); ari = adjusted_rand_score(y, labels): Obtain a clustering quality metric; ARI compares clustering to the true labels when available.
- The final list combines results for quick reporting in R.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Data leakage through improper scaling
  - Bad
```r
py_run_string("
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

# Placeholder: assume X and y from prior context
scaler = StandardScaler().fit(X)  # Fit on full data (leakage)
X_scaled = scaler.transform(X)
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
clf = LogisticRegression(max_iter=200).fit(X_scaled, y)
")
```
  - Good
```r
py_run_string("
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

# Split first, then fit scaler on training data only
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
scaler = StandardScaler().fit(X_train)
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)
clf = LogisticRegression(max_iter=200)
clf.fit(X_train_scaled, y_train)
pred = clf.predict(X_test_scaled)
acc = accuracy_score(y_test, pred)
")
```
- Pitfall 2: Not setting a fixed random_state, causing non-deterministic results
  - Bad
```r
py_run_string("
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
")
```
  - Good
```r
py_run_string("
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
")
```
- Pitfall 3: Overfitting by evaluating on the training set
  - Bad
```r
py_run_string("
# Train on full data and evaluate on the same data (overfitting risk)
from sklearn.linear_model import LogisticRegression
clf = LogisticRegression(max_iter=200)
clf.fit(X, y)
pred = clf.predict(X)
acc = accuracy_score(y, pred)
")
```
  - Good
```r
py_run_string("
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
clf = LogisticRegression(max_iter=200)
clf.fit(X_train, y_train)
pred = clf.predict(X_test)
acc = accuracy_score(y_test, pred)
")
```
- Pitfall 4: Ignoring feature scaling for distance-based models
  - Bad
```r
py_run_string("
from sklearn.linear_model import LogisticRegression
# Without scaling
clf = LogisticRegression(max_iter=200)
clf.fit(X_train, y_train)
pred = clf.predict(X_test)
acc = accuracy_score(y_test, pred)
")
```
  - Good (include scaling in a pipeline)
```r
py_run_string("
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
pipe = Pipeline([('scaler', StandardScaler()), ('clf', LogisticRegression(max_iter=200))])
pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)
acc = accuracy_score(y_test, pred)
")
```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility and traceability: Using pipelines (as shown) ensures consistent preprocessing and modeling steps across training, evaluation, and deployment. This minimizes drift caused by ad-hoc code changes.
- Environment management: Running Python from R via reticulate means you must manage environments consistently (exact Python version, exact package versions). In production, use environment files (requirements.txt, environment.yml) and containerization (Docker, Kubernetes) to lock dependencies.
- Model versioning and deployment: Each model and its preprocessing steps should be versioned (code + data + metadata). Saving the pipeline (e.g., via joblib/pickle in Python) and storing in a model registry helps roll back or A/B test models safely.
- Monitoring and drift detection: Production systems should monitor data drift (feature distribution changes) and model performance drift (accuracy or other metrics degrading over time). Regular retraining pipelines should be triggered automatically or on schedule.
- Cross-language continuity: The hybrid R/Python approach enables teams to leverage the strengths of both ecosystems. When transitioning to production, consider consolidating into a single deployment target (e.g., Python microservice or R-based API) to simplify monitoring and scaling.

## Z. Study Questions — 5 recall questions

1. What is the difference between supervised and unsupervised learning? Give one practical example of each.
2. Why is it important to split data into train and test sets before fitting a model? How does stratification help?
3. What is the purpose of a Scikit-Learn Pipeline? How does it improve reproducibility?
4. How does StandardScaler affect models like Logistic Regression or KMeans? Why is scaling often necessary for distance-based methods?
5. What metric would you use to evaluate a clustering result when you have ground-truth labels, and which metric would you use if you don’t?

## Exercise — practical multi-part coding challenge

Part A — Supervised Classification on a Generated Dataset
- Task: Create a synthetic binary classification dataset, train a pipeline with scaling and logistic regression, and report accuracy on a held-out test set.
- Steps (in R with reticulate):
  - Use Python to generate a dataset with make_classification(n_samples=400, n_features=20, n_informative=5, n_redundant=5, random_state=42).
  - Split into train/test (test_size=0.2, random_state=42).
  - Build a Pipeline([StandardScaler(), LogisticRegression(max_iter=300)]) and fit on the training data.
  - Evaluate accuracy on the test data. Return the accuracy to R.

Code sketch:
```r
library(reticulate)

py_run_string("
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

X, y = make_classification(n_samples=400, n_features=20, n_informative=5, n_redundant=5, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pipe = Pipeline([('scaler', StandardScaler()), ('clf', LogisticRegression(max_iter=300))])
pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)
acc = accuracy_score(y_test, pred)
")

acc <- py$acc
acc
```

Part B — Unsupervised Clustering on the Same Dataset
- Task: Cluster the full dataset with KMeans (n_clusters=3), compute inertia and silhouette score, and compare cluster labels with the true labels using Adjusted Rand Index (ARI).
- Steps (in R with reticulate):
  - Run KMeans on X; compute inertia, and silhouettes.
  - Compute ARI between true labels y and the cluster labels.
- Expected outputs: inertia, silhouette score, ARI.

Code sketch:
```r
library(reticulate)

py_run_string("
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, adjusted_rand_score
# X and y from previous step exist in Python state; alternatively re-create if needed
# For reproducibility, reuse the same X, y from the previous block
kmeans = KMeans(n_clusters=3, random_state=42)
kmeans.fit(X)
labels = kmeans.labels_
inertia = kmeans.inertia_
sil = silhouette_score(X, labels)
ari = adjusted_rand_score(y, labels)
")

inertia <- py$inertia
sil <- py$sil
ari <- py$ari

list(inertia = inertia, silhouette = sil, adjusted_rand_index = ari)
```

Part C — End-to-End: Compare Supervised vs Unsupervised Insights
- Task: Run both parts A and B in the same session and produce a small summary in R showing how well the supervised model performs versus what clusters resemble the true classes.
- Deliverables: a short report (text or a small data frame) showing acc, ARI, and a qualitative note about cluster alignment.

Note: Throughout the exercise, ensure that the Python environment is stable (same interpreter, same package versions) and that results are reproducible (fixed random seeds). Consider wrapping repeated experiments into R functions that call py_run_string with parameters or into Python modules to improve maintainability.

If you’d like, I can tailor the exercises to a specific dataset (e.g., a real CSV you have) or adjust the difficulty (adding cross-validation, hyperparameter tuning, or model interpretability steps).