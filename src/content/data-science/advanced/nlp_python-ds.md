# Track: Data Science & AI | Module: Phase 4 — Deep Learning | Topic: Natural Language Processing | Python Data Stack

Natural Language Processing (NLP) is the science of turning unstructured text into structured insights. In professional data science and AI work, NLP enables sentiment analysis, topic modeling, information retrieval, and conversational agents. This lesson focuses on practical NLP using the Python data stack: data handling with pandas, numerical representation with scikit-learn, traditional embeddings with gensim, and modern deep learning approaches with transformers. You’ll build end-to-end pipelines, understand when to apply each technique, and learn how to deploy simple NLP services in real systems.

## 1. Text Representation: From Raw Text to Numerical Data
Text data must be converted into numerical features before it can be used by machine learning models. This section covers cleaning, tokenization, and classic vectorization with TF-IDF.

```python
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

# Simple in-memory dataset
df = pd.DataFrame({
    "text": [
        "I love this movie, it's fantastic and exciting!",
        "This film was terrible and a waste of time.",
        "An excellent performance by the lead actor.",
        "The plot was dull and uninteresting."
    ],
    "label": [1, 0, 1, 0]
})

# TF-IDF vectorization (standard English stopword removal)
tfidf = TfidfVectorizer(stop_words="english")
X = tfidf.fit_transform(df["text"])
print("Shape of TF-IDF feature matrix:", X.shape)
print("TF-IDF feature example (dense):")
print(X[:].toarray()[:2])
```

```python
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

y = df["label"]

# Simple train/test split on the features (illustrative; for real tasks, do a proper split before vectorization)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=42)

# Train a small classifier on top of TF-IDF features
clf = LogisticRegression(max_iter=1000, n_jobs=-1)
clf.fit(X_train, y_train)

preds = clf.predict(X_test)
print("Test predictions:", preds)
```

### Line-by-line explanation
- Line 1-2: Import pandas for data handling and TfidfVectorizer to convert text to numeric features.
- Line 5-14: Create a small DataFrame with text samples and binary labels.
- Line 17: Instantiate a TF-IDF vectorizer with English stop words.
- Line 18: Learn the vocabulary and transform the text data into a sparse matrix X.
- Line 19-21: Print the shape of the resulting feature matrix and show a dense representation for a couple of rows.
- Line 25: Import train_test_split to split data for evaluation.
- Line 26: Extract labels into y.
- Line 29-30: Split the (already vectorized) data into train and test subsets; note that in practice you should split the raw text first, then vectorize the train separately and apply the same vectorizer to test.
- Line 33: Create a Logistic Regression classifier with a high maximum number of iterations to ensure convergence.
- Line 34: Train the classifier on the training TF-IDF features.
- Line 36: Predict on the test set.
- Line 37: Print the raw predictions.

## 2. Word Embeddings: From Tokens to Vectors
Beyond bag-of-words, word embeddings capture semantic relationships. Here we train a simple Word2Vec model using gensim and derive sentence vectors by averaging word vectors.

```python
from gensim.models import Word2Vec

sentences = [
    ["this", "movie", "is", "great"],
    ["i", "love", "this", "film"],
    ["this", "film", "is", "terrible"],
    ["hated", "the", "ending", "of", "this", "movie"]
]

# Train a small Word2Vec model
model = Word2Vec(sentences, vector_size=100, window=3, min_count=1, workers=4)

# Access a word vector
word_vec = model.wv["movie"]
print("Vector for 'movie' shape:", word_vec.shape)

# Compute a simple sentence embedding by averaging word vectors
sentence = ["this", "movie", "is", "great"]
vecs = [model.wv[w] for w in sentence]
sentence_vec = sum(vecs) / len(vecs)
print("Sentence embedding shape:", sentence_vec.shape)
```

### Line-by-line explanation
- Line 1: Import Word2Vec from gensim to train a simple word embedding model.
- Line 3-8: Define a small tokenized corpus (each sentence is a list of tokens).
- Line 11: Instantiate Word2Vec with 100-dimensional vectors, a window size of 3, and include all tokens (min_count=1).
- Line 12: Train the model on the provided sentences.
- Line 15-16: Retrieve the vector for the word "movie" and print its shape to verify dimensionality.
- Line 19: Define a target sentence as a list of tokens.
- Line 20-21: Build a list of word vectors for the sentence words and compute a simple average to form a sentence embedding.
- Line 22: Print the resulting sentence embedding shape.

Notes:
- Word2Vec captures static word semantics. For many NLP tasks, you’ll want contextual embeddings (see Section 3).

## 3. Transformer-based Embeddings: Quick Intro
Transformer-based models produce powerful contextual embeddings. This section demonstrates obtaining sentence embeddings from a pre-trained DistilBERT model, then training a lightweight classifier on top. Be mindful of dependencies and hardware (GPU preferred for larger batches).

```python
from transformers import AutoTokenizer, AutoModel
import torch
from sklearn.linear_model import LogisticRegression

# Load pre-trained model and tokenizer (DistilBERT base)
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
model = AutoModel.from_pretrained("distilbert-base-uncased")

texts = ["This is amazing!", "I did not like this."]

# Tokenize and encode as tensors
inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt")

# Get transformer outputs
with torch.no_grad():
    outputs = model(**inputs)

# CLS-like embedding: take the first token's hidden state
embeddings = outputs.last_hidden_state[:, 0, :]
print("Embeddings shape:", embeddings.shape)

# Simple downstream classifier (2 samples; for demonstration)
X = embeddings.detach().cpu().numpy()
y = [1, 0]
clf = LogisticRegression(max_iter=1000)
clf.fit(X, y)

# Predict on the same inputs (illustrative)
preds = clf.predict(X)
print("Transformer-based predictions:", preds)
```

### Line-by-line explanation
- Line 1-2: Import the tokenizer and model classes from the transformers library and PyTorch.
- Line 5-6: Load DistilBERT-base-uncased tokenizer and model. This yields a fine-tuned representation capable of producing contextual embeddings.
- Line 9: Define two sample texts to embed.
- Line 12: Tokenize texts with padding and truncation, returning PyTorch tensors.
- Line 15: Disable gradient computation for inference.
- Line 16-18: Run the model to obtain hidden representations.
- Line 21: Extract the embedding for the [CLS]-like token (here, the first token) as a fixed-size vector per input.
- Line 22: Print the embedding batch shape (batch_size x hidden_size).
- Line 25: Convert embeddings to a NumPy array for compatibility with scikit-learn.
- Line 26-28: Define a tiny binary-label dataset and train a Logistic Regression classifier on top of the embeddings.
- Line 31: Predict on the same inputs as a demonstration and print the results.

Notes:
- This section shows the typical flow: obtain rich contextual embeddings from a transformer, then train a lightweight classifier on top. For real tasks, use larger datasets and appropriate training loops or off-the-shelf classification heads from libraries like transformers or sentence-transformers.

## 4. Evaluation & Basic Text Classification Pipeline
A robust NLP workflow typically uses a reproducible pipeline with clean train/validation splits, proper evaluation metrics, and model persistence. Here is a practical pipeline using TF-IDF features and Logistic Regression, with a train/test split and performance metrics.

```python
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
import numpy as np

texts = [
    "I love this movie",
    "This film is terrible",
    "Amazing plot and great acting",
    "Bad story, not good",
    "What a fantastic experience",
    "I would not recommend this"
]
labels = [1, 0, 1, 0, 1, 0]

X_train_texts, X_test_texts, y_train, y_test = train_test_split(texts, labels, test_size=0.33, random_state=42)

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english")),
    ("clf", LogisticRegression(max_iter=1000))
])

pipeline.fit(X_train_texts, y_train)
preds = pipeline.predict(X_test_texts)

acc = accuracy_score(y_test, preds)
f1 = f1_score(y_test, preds)
cm = confusion_matrix(y_test, preds)

print("Accuracy:", acc)
print("F1 Score:", f1)
print("Confusion Matrix:\n", cm)
```

### Line-by-line explanation
- Line 1-2: Import utilities to create a reproducible train/test split, vectorize text, train a classifier, and compute metrics.
- Line 6-11: Define a small text dataset and binary labels for sentiment-like classification.
- Line 13-14: Split the data into training and testing sets with a fixed random seed for reproducibility.
- Line 16-20: Create a scikit-learn Pipeline consisting of a TF-IDF vectorizer (english stop words) and a Logistic Regression classifier.
- Line 22: Train the pipeline on the training texts.
- Line 23: Generate predictions for the test texts.
- Line 25: Compute accuracy, a standard recall metric in classification tasks.
- Line 26: Compute F1 score to balance precision and recall.
- Line 27: Compute a confusion matrix to inspect true positives, false positives, false negatives, and true negatives.
- Line 29-31: Print results.

## 5. Deployment & Real Systems: Building a Lightweight NLP Service
In production, you’ll need to serve models, monitor quality, and ensure scalable, low-latency responses. The example below shows how to persist a scikit-learn pipeline and expose a simple API with FastAPI (you can also use Flask, Django, or a serverless approach).

```python
# Save the pipeline (once)
import joblib
# Suppose `pipeline` is the trained scikit-learn Pipeline from Section 4
joblib.dump(pipeline, "nlp_pipeline.pkl")

# serve.py
from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI()
model = joblib.load("nlp_pipeline.pkl")

class TextInput(BaseModel):
    text: str

@app.post("/predict")
def predict(input: TextInput):
    pred = model.predict([input.text])[0]
    return {"text": input.text, "label": int(pred)}

# To run: uvicorn serve:app --reload
```

### Line-by-line explanation
- Line 1-3: Import joblib to serialize/deserialize the trained pipeline and FastAPI to serve the model.
- Line 5-8: Create a FastAPI app instance and load the serialized pipeline from disk.
- Line 10-12: Define a Pydantic model to validate incoming JSON with a single text field.
- Line 14-18: Define a POST endpoint /predict that accepts a JSON payload, runs the model, and returns a JSON response with the input text and predicted label.
- How to run: start the server with a command such as uvicorn serve:app --reload, then POST to /predict with a JSON payload like {"text": "I loved this!"}.

Notes:
- In production, you’ll want to add authentication, input validation, logging, error handling, batching for throughput, and monitoring for drift and latency.
- For large transformer-based models, you may deploy a separate inference server with GPU support or use a hosting service that supports model zipping, versioning, and A/B testing.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Data leakage by vectorizing on the entire dataset
  - Bad:
  ```python
  vectorizer = TfidfVectorizer()
  X = vectorizer.fit_transform(all_texts)  # all_texts includes test data
  X_train, X_test, y_train, y_test = train_test_split(X, all_labels, test_size=0.2)
  ```
  - Good:
  ```python
  X_train_texts, X_test_texts, y_train, y_test = train_test_split(all_texts, all_labels, test_size=0.2)
  vectorizer = TfidfVectorizer()
  X_train = vectorizer.fit_transform(X_train_texts)
  X_test = vectorizer.transform(X_test_texts)
  ```
  Explanation: Fit the vectorizer only on training data, then transform both train and test data using the same vocabulary. This prevents information from the test set leaking into the model.

- Pitfall 2: Skipping a proper pipeline and doing preprocessing and modeling separately
  - Bad:
  ```python
  X = TfidfVectorizer(stop_words="english").fit_transform(all_texts)
  clf = LogisticRegression(max_iter=1000)
  clf.fit(X, all_labels)
  # No separation of train/test and no consistent preprocessing at inference time
  ```
  - Good:
  ```python
  pipeline = Pipeline([
      ("tfidf", TfidfVectorizer(stop_words="english")),
      ("clf", LogisticRegression(max_iter=1000))
  ])
  pipeline.fit(X_train_texts, y_train)
  preds = pipeline.predict(X_test_texts)
  ```
  Explanation: A pipeline ensures the same preprocessing is consistently applied during training and inference, reducing errors and improving reproducibility.

- Pitfall 3: Ignoring class imbalance and evaluation beyond accuracy
  - Bad:
  ```python
  # Assume a dataset heavily skewed to class 1
  model.fit(X_train, y_train)
  preds = model.predict(X_test)
  accuracy = (preds == y_test).mean()  # may look good even if model ignores minority class
  ```
  - Good:
  ```python
  from sklearn.metrics import f1_score, precision_score, recall_score
  preds = model.predict(X_test)
  acc = accuracy_score(y_test, preds)
  f1 = f1_score(y_test, preds)
  precision = precision_score(y_test, preds)
  recall = recall_score(y_test, preds)
  ```
  Explanation: Some NLP tasks involve imbalanced classes (e.g., rare hate speech). Use F1, precision, recall, ROC-AUC, and confusion matrices to evaluate fairly and guide model improvements.

## Y. Why This Matters In Real Systems — Production context and real usage
- End-to-end pipelines: In real projects, NLP pipelines typically go from raw data ingestion (ETL), text cleaning, feature extraction, model training, and evaluation to deployment and monitoring. You’ll need versioned datasets, reproducible environments (e.g., conda/venv, Docker), and automated CI/CD for model retraining.
- Model selection and latency: TF-IDF + Logistic Regression is fast and interpretable, suitable for dashboards and search ranking; transformer-based models give state-of-the-art accuracy but are heavier and require batching, GPU resources, and careful serving (e.g., ONNX, TorchScript, or specialized inference servers).
- Monitoring and drift: Track model performance over time, detect drift in language use, and schedule retraining. Implement alerting for declines in key metrics and ensure data privacy and compliance.
- Bias and fairness: NLP models can pick up socio-linguistic biases from training data. Audit datasets, apply debiasing strategies where appropriate, and solicit diverse evaluation data.
- Deployment patterns: Use API endpoints for inference, batch processing for large datasets, and feature stores for managing input features. Consider caching, request batching, and rate limiting to manage latency and cost.

## Z. Study Questions — 5 recall questions
1. What is the purpose of using stop words in TF-IDF, and when might you want to disable them?
2. How does Word2Vec differ from transformer-based embeddings in terms of context and computation?
3. Why is it important to split data into training and test sets before vectorization, rather than vectorizing the entire dataset?
4. What are the advantages of using scikit-learn Pipelines for NLP workflows?
5. Name two common deployment considerations when turning an NLP model into a production service.

## Exercise — a practical multi-part coding challenge

Part A — Build a baseline sentiment classifier
- Create a small labeled dataset (at least 12 sentences with balanced classes, e.g., 6 positive and 6 negative).
- Implement a pipeline using TF-IDF vectorization (stop words English) and Logistic Regression.
- Perform a train/test split (e.g., 80/20), train on the training set, and evaluate on the test set with accuracy and F1 score.
- Save the trained pipeline to disk as nlp_sentiment_pipeline.pkl.

Part B — Add a simple API to serve predictions
- Write a small FastAPI or Flask app that loads the saved pipeline and exposes a /predict endpoint accepting a JSON payload with a "text" field, returning the predicted label.
- Provide a sample curl command to test the API.

Part C (optional) — Transformer-based extension
- If you have the sentence-transformers library available, add an optional path to compute sentence embeddings with a pre-trained model and train a lightweight classifier on top. Compare performance and latency with Part A.

Sample starter code snippets for Part A (you’ll fill in the dataset):

```python
# Part A: baseline dataset and pipeline
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score
import joblib

texts = [
    "I absolutely loved this movie, fantastic experience.",
    "What a waste of time. The plot was awful.",
    "An excellent film with superb acting.",
    "Terrible storyline and bad directing.",
    "I enjoyed every moment of this film.",
    "Not good, I dislike this movie."
]

labels = [1, 0, 1, 0, 1, 0]  # 1 = positive, 0 = negative

X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english")),
    ("clf", LogisticRegression(max_iter=1000))
])

pipeline.fit(X_train, y_train)
preds = pipeline.predict(X_test)

print("Accuracy:", accuracy_score(y_test, preds))
print("F1:", f1_score(y_test, preds))

# Save the model
joblib.dump(pipeline, "nlp_sentiment_pipeline.pkl")
```

Sample starter code for Part B (API skeleton):

```python
# Part B: Simple API to serve predictions
from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI()
model = joblib.load("nlp_sentiment_pipeline.pkl")

class TextInput(BaseModel):
    text: str

@app.post("/predict")
def predict(input: TextInput):
    pred = model.predict([input.text])[0]
    return {"text": input.text, "label": int(pred)}

# Run with: uvicorn this_file_name:app --reload
```

Notes for the Exercise:
- Ensure you have the required packages installed (scikit-learn, pandas, gensim, transformers if you experiment with transformer-based paths, and fastapi/uvicorn for the API).
- Keep the dataset small for the exercise, but try to reason about scalability and potential biases as you extend it.
- For reproducibility, fix random seeds where applicable, and consider using a requirements.txt or environment.yml to capture dependencies.

If you’d like, I can tailor the lesson to a particular NLP task (e.g., topic classification, named-entity recognition, or question answering) or adjust the code examples for a specific notebook style or company stack.