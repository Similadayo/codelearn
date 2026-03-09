# Track: Data Science & AI
## Module: Phase 3 — Machine Learning
## Topic: Supervised & Unsupervised Learning (Scikit-Learn) in Julia

In this lesson, you’ll learn how to perform supervised and unsupervised learning using Scikit-Learn from a Julia environment. Scikit-Learn is a Python library, but Julia users can leverage it efficiently through the ScikitLearn.jl wrapper, which provides a familiar, Pythonic API while staying in the Julia ecosystem. You’ll see practical workflows for classification, clustering, dimensionality reduction, and pipelines, with attention to reproducibility and real-system considerations.

## 1. Supervised Learning: Concepts and Workflow
Supervised learning trains a model on labeled data to predict outcomes for new, unseen data. It’s foundational for tasks like classification and regression in real-world systems, where you must generalize from historical examples to new inputs. In production, you care about data splits, robust evaluation, feature preprocessing, and stable deployment.

Code: Supervised classification with logistic regression (Julia + ScikitLearn.jl)
```julia
using ScikitLearn
@sk_import datasets: make_classification
@sk_import model_selection: train_test_split
@sk_import linear_model: LogisticRegression
@sk_import metrics: accuracy_score

# Generate a synthetic binary classification dataset
X, y = make_classification(
    n_samples=1000,
    n_features=20,
    n_informative=2,
    n_redundant=2,
    n_clusters_per_class=2,
    random_state=42
)

# Split into train and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define a logistic regression classifier (good baseline for many problems)
logreg = LogisticRegression(max_iter=1000)

# Train on the training split
logreg.fit(X_train, y_train)

# Predict on the test split
y_pred = logreg.predict(X_test)

# Evaluate performance
acc = accuracy_score(y_test, y_pred)
println("Test accuracy: ", acc)
```

### Line-by-line explanation
- using ScikitLearn: Load the Julia wrapper that provides access to scikit-learn APIs.
- @sk_import datasets: make_classification: Prepare to call the Python function make_classification from sklearn.datasets.
- @sk_import model_selection: train_test_split: Prepare to call the Python function to split data.
- @sk_import linear_model: LogisticRegression: Prepare to call the Python logistic regression model.
- @sk_import metrics: accuracy_score: Prepare to call the Python accuracy_score metric.
- X, y = make_classification(...): Create a synthetic dataset with 1000 samples, 20 features, and a mix of informative/redundant features and clusters.
- X_train, X_test, y_train, y_test = train_test_split(...): Randomly split the data into training and testing sets with an 80/20 ratio, ensuring reproducibility with random_state.
- logreg = LogisticRegression(max_iter=1000): Instantiate a logistic regression model and allow more iterations for convergence.
- logreg.fit(X_train, y_train): Train the model on the training subset.
- y_pred = logreg.predict(X_test): Generate predictions for the test subset.
- acc = accuracy_score(y_test, y_pred): Compute the proportion of correct predictions.
- println("Test accuracy: ", acc): Display the resulting accuracy to gauge generalization.

## 2. Unsupervised Learning: Concepts and Workflow
Unsupervised learning discovers structure in data without labeled outcomes. It’s essential for clustering similar observations, reducing dimensionality, and exploring data representations. In production, this often informs downstream tasks, anomaly detection, or data organization.

### 2.1 K-Means Clustering
K-Means groups data into a predefined number of clusters by minimizing within-cluster variance.

Code: K-Means clustering on 2D data with a silhouette score
```julia
using ScikitLearn
@sk_import datasets: make_blobs
@sk_import cluster: KMeans
@sk_import metrics: silhouette_score

# Generate 2D data with 3 centers
X, y_true = make_blobs(n_samples=300, centers=3, n_features=2, random_state=0)

# Fit KMeans
kmeans = KMeans(n_clusters=3, random_state=0)
kmeans.fit(X)

labels = kmeans.labels_
inertia = kmeans.inertia_

# Evaluate clustering quality with silhouette score
s_score = silhouette_score(X, labels)
println("Silhouette score: ", s_score)
```

### Line-by-line explanation
- using ScikitLearn: Load the wrapper.
- @sk_import datasets: make_blobs: Import function to generate blob-like clusters for testing.
- @sk_import cluster: KMeans: Import KMeans estimator.
- @sk_import metrics: silhouette_score: Import a clustering quality metric.
- X, y_true = make_blobs(...): Create 300 samples in 2D with three centers for clustering demonstration.
- kmeans = KMeans(n_clusters=3, random_state=0): Initialize KMeans to partition the data into three clusters.
- kmeans.fit(X): Train the model on the data.
- labels = kmeans.labels_: Retrieve the cluster assignment for each sample.
- inertia = kmeans.inertia_: Retrieve the sum of squared distances of samples to their closest cluster center (a measure of compactness; lower is better).
- s_score = silhouette_score(X, labels): Compute how well-separated the clusters are.
- println("Silhouette score: ", s_score): Output the silhouette score to assess clustering quality.

### 2.2 Principal Component Analysis (PCA)
PCA reduces dimensionality by projecting data onto principal components that capture the most variance.

Code: PCA to reduce to 2 components
```julia
@sk_import decomposition: PCA

# Reuse X from the KMeans example (or regenerate for a clean run)
pca = PCA(n_components=2)
X_pca = pca.fit_transform(X)

explained_variance = pca.explained_variance_ratio_
println("Explained variance by component: ", explained_variance)
```

### Line-by-line explanation
- @sk_import decomposition: PCA: Import PCA from sklearn.decomposition.
- pca = PCA(n_components=2): Create a PCA object to reduce data to two components.
- X_pca = pca.fit_transform(X): Fit PCA on X and apply the dimensionality reduction in one step.
- explained_variance = pca.explained_variance_ratio_: Retrieve the proportion of variance explained by each principal component.
- println("Explained variance by component: ", explained_variance): Display the variance explained by the components for interpretation.

## 3. Data Preparation, Evaluation, and Pipelines
In real systems, you typically need robust data preparation, model evaluation, and reproducible pipelines. This section covers train/test splits, cross-validation, and building a pipeline that scales features before fitting a classifier.

Code: Pipeline with StandardScaler and Logistic Regression, plus evaluation and cross-validation
```julia
using ScikitLearn
@sk_import preprocessing: StandardScaler
@sk_import pipeline: Pipeline
@sk_import linear_model: LogisticRegression
@sk_import metrics: accuracy_score
@sk_import model_selection: train_test_split, cross_val_score
@sk_import datasets: make_classification
@sk_import statistics: mean

# Prepare dataset
X, y = make_classification(
    n_samples=1000,
    n_features=20,
    n_informative=2,
    n_redundant=2,
    n_clusters_per_class=2,
    random_state=42
)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define a pipeline: scale features then apply logistic regression
scaler = StandardScaler()
clf = LogisticRegression(max_iter=1000)
pipe = Pipeline(steps=[("scaler", scaler), ("clf", clf)])

# Train-test evaluation
pipe.fit(X_train, y_train)
y_pred = pipe.predict(X_test)
acc = accuracy_score(y_test, y_pred)
println("Test accuracy (pipeline): ", acc)

# Optional: cross-validation on the full dataset
cv_scores = cross_val_score(pipe, X, y, cv=5)
cv_mean = mean(cv_scores)
println("Cross-validated accuracy: ", cv_mean)
```

### Line-by-line explanation
- using ScikitLearn & imports: Bring in all necessary components for preprocessing, modeling, metrics, and evaluation strategies.
- X, y = make_classification(...): Create a dataset suitable for evaluating pipelines.
- X_train, X_test, y_train, y_test = train_test_split(...): Split the data into train and test sets in a reproducible way.
- scaler = StandardScaler(): Create a feature scaler to standardize input features.
- clf = LogisticRegression(max_iter=1000): Define a robust classifier with enough iterations to converge.
- pipe = Pipeline(steps=[("scaler", scaler), ("clf", clf)]): Build a pipeline that first scales, then classifies.
- pipe.fit(X_train, y_train): Fit the pipeline on the training data.
- y_pred = pipe.predict(X_test): Predict on the test data.
- acc = accuracy_score(y_test, y_pred): Compute accuracy on the held-out data.
- println("Test accuracy (pipeline): ", acc): Output the pipeline performance.
- cv_scores = cross_val_score(pipe, X, y, cv=5): Perform 5-fold cross-validation on the full dataset.
- cv_mean = mean(cv_scores): Compute the average cross-validated score.
- println("Cross-validated accuracy: ", cv_mean): Report cross-validated performance.

## X. Common Beginner Mistakes
Here are real pitfalls beginners encounter, with bad and good code examples side-by-side to illustrate correct practice.

- Pitfall 1: Data leakage by including test data in training
  - Bad
  ```julia
  using ScikitLearn
  @sk_import datasets: make_classification
  @sk_import linear_model: LogisticRegression
  @sk_import metrics: accuracy_score

  X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
  logreg = LogisticRegression()
  logreg.fit(X, y)  # Train on all data
  pred = logreg.predict(X)
  acc = accuracy_score(y, pred)
  println("Accuracy: ", acc)
  ```
  - Good
  ```julia
  using ScikitLearn
  @sk_import datasets: make_classification
  @sk_import model_selection: train_test_split
  @sk_import linear_model: LogisticRegression
  @sk_import metrics: accuracy_score

  X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
  logreg = LogisticRegression()
  logreg.fit(X_train, y_train)
  pred = logreg.predict(X_test)
  acc = accuracy_score(y_test, pred)
  println("Test accuracy: ", acc)
  ```
- Pitfall 2: Not scaling features for algorithms that require it (e.g., SVM, logistic regression)
  - Bad
  ```julia
  @sk_import datasets: make_classification
  @sk_import svm: SVC

  X, y = make_classification(n_samples=500, n_features=10, random_state=1)
  svc = SVC(kernel="rbf")
  svc.fit(X, y)
  # No testing split; also no scaling
  ```
  - Good
  ```julia
  @sk_import datasets: make_classification
  @sk_import preprocessing: StandardScaler
  @sk_import pipeline: Pipeline
  @sk_import svm: SVC

  X, y = make_classification(n_samples=500, n_features=10, random_state=1)

  pipe = Pipeline(steps=[("scaler", StandardScaler()), ("svc", SVC(kernel="rbf"))])
  pipe.fit(X_train, y_train)
  pred = pipe.predict(X_test)
  acc = accuracy_score(y_test, pred)
  ```
- Pitfall 3: Using a single train/test split without cross-validation
  - Bad
  ```julia
  # Single split, no cross-validation
  @sk_import datasets: make_classification
  @sk_import linear_model: LogisticRegression
  X, y = make_classification(n_samples=800, n_features=15, random_state=5)
  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=5)
  logreg = LogisticRegression()
  logreg.fit(X_train, y_train)
  pred = logreg.predict(X_test)
  # Evaluate only once
  ```
  - Good
  ```julia
  @sk_import datasets: make_classification
  @sk_import model_selection: train_test_split, cross_val_score
  @sk_import linear_model: LogisticRegression
  X, y = make_classification(n_samples=800, n_features=15, random_state=5)

  # Cross-validated performance for more robust estimates
  pipe = Pipeline([("clf", LogisticRegression())])
  scores = cross_val_score(pipe, X, y, cv=5)
  println("CV accuracy: ", mean(scores))
  ```
- Pitfall 4: Ignoring class imbalance when choosing metrics
  - Bad
  ```julia
  # Suppose classes are imbalanced; accuracy may be misleading
  @sk_import datasets: make_classification
  @sk_import linear_model: LogisticRegression
  X, y = make_classification(n_samples=1000, weights=[0.9, 0.1], n_features=20, random_state=42)
  logreg = LogisticRegression()
  logreg.fit(X, y)
  pred = logreg.predict(X)
  acc = mean(pred .== y)
  println("Accuracy: ", acc)
  ```
  - Good
  ```julia
  @sk_import metrics: accuracy_score, precision_score, recall_score
  # Split, then evaluate with precision/recall
  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
  logreg.fit(X_train, y_train)
  pred = logreg.predict(X_test)
  acc = accuracy_score(y_test, pred)
  prec = precision_score(y_test, pred)
  rec = recall_score(y_test, pred)
  println("Acc: ", acc, " | Prec: ", prec, " | Rec: ", rec)
  ```

## Y. Why This Matters In Real Systems
In production, supervised and unsupervised learning are embedded in data pipelines and decision-making processes. Key considerations include:
- Reproducibility: Use fixed random seeds, version data, and track model metadata.
- Data drift and monitoring: Continuously monitor features and model performance; retrain when drift or degradation is detected.
- Performance and latency: Choose models and preprocessing that meet latency requirements; optimize with pipelines and batching.
- Observability and auditability: Log features, training data characteristics, and the reasoning behind predictions for regulatory and debugging purposes.
- Deployment realities: Serialize models reliably (e.g., using joblib or ONNX), handle environment differences, and implement robust error handling.
- Security and privacy: Ensure data handling complies with policies; avoid leaking secrets during evaluation or deployment.

In the Julia + ScikitLearn.jl workflow, you can integrate these models into broader data pipelines, deploy as services, and reuse the same codebase for experimentation and production, benefiting from Julia’s performance and Python’s mature ML ecosystem.

## Z. Study Questions
1. What is the fundamental difference between supervised and unsupervised learning?
2. Why is feature scaling important for logistic regression and SVM, and how can pipelines help enforce this consistently?
3. How does cross-validation improve the reliability of performance estimates?
4. What are silhouette scores, inertia, and explained variance in the context of clustering and dimensionality reduction?
5. How can you persist a trained model from ScikitLearn.jl for later use in a production system?

## Exercise
Complete the following multi-part coding challenge to reinforce a practical ML workflow in Julia using ScikitLearn.jl.

Part A — Supervised Classification
- Task: Build a binary classifier on a synthetic dataset using a pipeline that scales features and uses logistic regression. Evaluate with a held-out test set and report accuracy.
- Deliverables:
  - A Julia code block that creates the data, builds the pipeline, trains, tests, and prints accuracy.
  - A short explanation of why a pipeline helps avoid data leakage and ensures proper preprocessing.

Part B — Unsupervised Clustering
- Task: Generate 3 clearly separable clusters, cluster with K-Means, and report inertia and silhouette score.
- Deliverables:
  - A Julia code block for data generation, clustering, and evaluation.
  - A brief interpretation of inertia and silhouette score values.

Part C — Cross-Validation
- Task: Compare a pipeline’s cross-validated accuracy to a single train/test split. Use 5-fold cross-validation.
- Deliverables:
  - A Julia code block showing cross_val_score usage, and printing the mean CV accuracy.
  - One-sentence takeaway about the value of cross-validation.

Part D — Model Persistence (Optional)
- Task: Save the trained pipeline to disk and demonstrate loading it back for inference on a new sample.
- Deliverables:
  - A Julia code block for saving and loading the model using joblib (or an equivalent path in ScikitLearn.jl).
  - A note on potential pitfalls when loading models in different environments.

Note: If you prefer, you can scaffold the exercise with reusable helper functions (e.g., create_dataset(), train_pipeline(), evaluate_model()) to encourage modular, testable code.