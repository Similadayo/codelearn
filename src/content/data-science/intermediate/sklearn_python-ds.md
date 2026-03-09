# Track: Data Science & AI — Phase 3: Machine Learning — Supervised & Unsupervised Learning (Scikit-Learn)

In this module, you’ll explore the two foundational paradigms of machine learning as implemented in scikit-learn: supervised learning (where the model learns from labeled data to predict outcomes) and unsupervised learning (where the model discovers structure from unlabeled data). You’ll see practical Python code using the Python Data Stack (NumPy, pandas, scikit-learn) and learn how to train, evaluate, and deploy simple models in real-world data pipelines. By the end, you’ll understand when to use each approach, how to validate models properly, and how to avoid common beginner mistakes in production-grade data science workflows.

## 1. Conceptual Overview and Quick Hands-on Contrast

Supervised learning uses labeled data to map inputs to known outputs. Unsupervised learning finds structure from unlabeled data, such as clusters or reduced dimensions. In many real-world tasks, you’ll start with supervised learning for prediction, then use unsupervised techniques to explore data structure, feature engineering opportunities, or to initialize models for semi-supervised setups.

Code example: a quick supervised classifier on Iris and an unlabeled clustering run on the same data (after scaling).

```python
# Supervised: Iris classification with a pipeline including scaling
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

iris = load_iris()
X, y = iris.data, iris.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression(max_iter=200, multi_class='multinomial'))
])

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)
print("Supervised test accuracy:", accuracy_score(y_test, y_pred))

# Unsupervised: KMeans clustering on the same data (uses only features, no labels)
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

kmeans = KMeans(n_clusters=3, random_state=42)
clusters = kmeans.fit_predict(X_scaled)

score = silhouette_score(X_scaled, clusters)
print("Unsupervised silhouette score (k=3):", score)
```

### Line-by-line explanation

- Importing load_iris to obtain a small labeled dataset suitable for quick experimentation.
- Splitting data into train and test sets with stratification to preserve class proportions.
- Creating a Pipeline that standardizes features then applies logistic regression (multinomial for multi-class).
- Fitting the pipeline on the training data.
- Predicting the labels for the test set.
- Computing accuracy to evaluate supervised performance.
- Separately, standardizing features and applying KMeans to the unlabeled data.
- Computing a silhouette score to quantify cluster cohesion and separation.

## 2. Practical Supervised Learning: Classification on Iris with Scikit-Learn

In this section, we’ll build a more robust supervised classifier using a different algorithm (Random Forest) to illustrate model diversity and evaluation practices. We’ll train, predict, and inspect a detailed report.

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

# Reuse the same train/test split from the previous example if you like.
# Here, we assume X_train, X_test, y_train, y_test are defined as above.

rf = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)

print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=iris.target_names))

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))
```

### Line-by-line explanation

- Importing RandomForestClassifier for an ensemble method that often offers strong performance with limited feature engineering.
- Instantiating the model with a reasonably large forest, fixed random state for reproducibility, and parallel jobs.
- Fitting the model to the training subset.
- Predicting on the test subset.
- Printing a detailed classification report (precision, recall, f1-score) with human-readable class names.
- Printing a confusion matrix to inspect which classes are being confused by the model.

## 3. Unsupervised Learning: Clustering and Dimensionality Reduction with Iris

Unsupervised learning helps you learn structure from data without labels. This section demonstrates clustering and a simple dimensionality-reduction workflow (PCA) to visualize and interpret the Iris data.

```python
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.pipeline import Pipeline
from sklearn.metrics import silhouette_score
import numpy as np
import matplotlib.pyplot as plt  # Optional: for visualization

# Build a pipeline: scale -> k-means
pipeline_kmeans = Pipeline([
    ('scaler', StandardScaler()),
    ('kmeans', KMeans(n_clusters=3, random_state=42))
])

# Use the same X (no labels used)
pipeline_kmeans.fit(X)
clusters = pipeline_kmeans.named_steps['kmeans'].labels_

# Silhouette score to quantify clustering quality
X_scaled = StandardScaler().fit_transform(X)
sil_score = silhouette_score(X_scaled, clusters)
print("KMeans silhouette score on Iris:", sil_score)

# Optional: PCA for visualization in 2D
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_scaled)
print("PCA explained variance ratio:", pca.explained_variance_ratio_)
print("PCA components shape:", X_pca.shape)

# Optional plotting (uncomment to visualize)
# plt.scatter(X_pca[:, 0], X_pca[:, 1], c=clusters, cmap='viridis')
# plt.title('Iris data clustered by KMeans (2D PCA projection)')
# plt.xlabel('PC1')
# plt.ylabel('PC2')
# plt.colorbar(label='cluster')
# plt.show()
```

### Line-by-line explanation

- Setting up a pipeline that scales features and then applies KMeans clustering.
- Fitting the pipeline on the feature matrix X (no labels used here).
- Accessing the cluster labels computed by KMeans.
- Calculating the silhouette score to assess how well the data are clustered without ground-truth labels.
- Performing PCA to reduce to 2 dimensions for potential visualization and computing the explained variance ratio to understand how much information the components retain.
- Optional plotting code to visualize clusters in 2D space (not required for the computation).

## 4. Model Evaluation, Pipelines, and Cross-Validation

Production-grade workflows rely on robust evaluation and clean training pipelines. This section demonstrates cross-validation, pipelines for reproducibility, and a quick benchmark of accuracy across folds.

```python
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
clf = Pipeline([
    ('scaler', StandardScaler()),
    ('logreg', LogisticRegression(max_iter=200, multi_class='multinomial'))
])

cv_scores = cross_val_score(clf, X, y, cv=cv, scoring='accuracy')
print("Cross-validated accuracy: {:.3f} (+/- {:.3f})".format(cv_scores.mean(), cv_scores.std()))
```

### Line-by-line explanation

- Importing cross_val_score and StratifiedKFold to perform robust cross-validation that preserves class distribution.
- Defining a pipeline that standardizes features then applies logistic regression.
- Creating a 5-fold stratified cross-validation splitter to ensure representative folds.
- Computing cross-validated accuracy scores across folds.
- Printing the mean accuracy and standard deviation to understand variability.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Data leakage via scaling or imputation learned from the full dataset before splitting.
  - Bad:
    ```python
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)  # Uses all data
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2)
    ```
  - Good:
    ```python
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(max_iter=200, multi_class='multinomial'))
    ])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    ```
  - Why it matters: Using the full data to scale leaks information from the test set into the training process, biasing performance estimates.

- Pitfall 2: Not stratifying the train/test split on imbalanced data.
  - Bad:
    ```python
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    ```
  - Good:
    ```python
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    ```
  - Why it matters: If a class is underrepresented in the split, the model may perform poorly on rare classes, leading to misleading metrics.

- Pitfall 3: Using distance-based models (KNN/SVM with RBF) without scaling.
  - Bad:
    ```python
    from sklearn.svm import SVC
    model = SVC(kernel='rbf', C=1.0, gamma='scale')
    model.fit(X_train, y_train)
    ```
  - Good:
    ```python
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.svm import SVC

    model = Pipeline([
        ('scaler', StandardScaler()),
        ('svc', SVC(kernel='rbf', C=1.0, gamma='scale'))
    ])
    model.fit(X_train, y_train)
    ```
  - Why it matters: Scaling ensures features contribute equally to distance-based decisions; otherwise the model may overemphasize features with larger ranges.

- Pitfall 4: Over-reliance on a single train/test split or a single metric for evaluation.
  - Bad:
    ```python
    # One split, single metric
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=1)
    model.fit(X_train, y_train)
    acc = accuracy_score(y_test, model.predict(X_test))
    ```
  - Good:
    ```python
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
    avg, std = scores.mean(), scores.std()
    ```
  - Why it matters: Cross-validation provides a more reliable estimate of generalization, reducing risk of overfitting to a particular split.

- Pitfall 5: Ignoring model persistence and versioning when moving to production.
  - Bad:
    ```python
    model.fit(X, y)
    # No save or versioning
    ```
  - Good:
    ```python
    import joblib
    joblib.dump(pipe, 'iris_classifier.joblib')
    # Later: model = joblib.load('iris_classifier.joblib')
    ```
  - Why it matters: Reproducing models in production requires saving trained artifacts with clear versions and dependencies.

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Reproducibility: Use pipelines and fixed random_state to reproduce results across environments (dev, test, prod).
- Data drift monitoring: Continuously evaluate performance on incoming data; drift can degrade accuracy or cluster structure.
- Model versioning: Track model artifacts with metadata (training data version, feature preprocessing steps, hyperparameters) and store in a model registry.
- Pipelines for deployment: Scikit-learn pipelines enable consistent preprocessing and inference steps, reducing the chance of mismatched transformations in production.
- Feature store and data quality: Integrate clean, well-documented features; rely on robust data validation to prevent feeding bad data to models.
- Resource constraints: For large datasets, prefer streaming or batch inference patterns; monitor memory, CPU, and latency.
- Testing and quality gates: Include unit tests for data preprocessing, cross-check outputs with small-known datasets, and perform shadow testing before full deployment.
- Collaboration: Use notebooks for exploration and a clean Python module for production; separate concerns between experimentation and production code.

## Z. Study Questions — 5 Recall Questions

1) What is the fundamental difference between supervised and unsupervised learning? Provide a minimal code snippet that demonstrates a supervised training workflow.
2) How does a scikit-learn Pipeline help prevent data leakage and improve reproducibility? Give an example with StandardScaler and LogisticRegression.
3) When would you prefer using KMeans clustering over a supervised classifier? Describe a scenario and provide a brief code outline.
4) What is cross-validation, and why is StratifiedKFold important for multi-class problems?
5) Name two production considerations you should address when moving a trained scikit-learn model from development to deployment.

## Exercise — Practical multi-part coding challenge

Part A: Supervised Classification Pipeline
- Task: Build a pipeline that loads the Iris dataset, splits into train/test with stratification, scales features, trains a Logistic Regression classifier, and reports accuracy on the test set. Use 5-fold cross-validation to estimate performance as well.
- Deliverables: A script that prints test accuracy and cross-validated accuracy with mean and std.

Part B: Unsupervised Clustering and Evaluation
- Task: Standardize features, apply KMeans with k=3, compute silhouette score, and produce a 2D PCA projection for visualization. Print the silhouette score and PCA explained variance.
- Deliverables: Script that prints the silhouette score and PCA stats; optional visualization code commented out.

Part C: Model Persistence
- Task: Train a pipeline (scaler + logistic regression) on the full Iris dataset and save it to disk using joblib. Load it back and verify a prediction on a sample.
- Deliverables: Script that saves and loads the model, then prints a sample prediction.

Part D: Optional Challenge — Basic Regression with Cross-Validation
- Task: Use a simple regression model (e.g., Ridge regression) on a synthetic dataset; perform cross-validation and report RMSE.
- Deliverables: Script that creates synthetic data, runs cross-validated RMSE, and prints results.

Notes:
- You can reuse the Iris dataset for all parts to stay focused on supervised vs unsupervised learning concepts.
- Keep each part modular so you can run them independently.
- Include appropriate import statements and run-ready code blocks.