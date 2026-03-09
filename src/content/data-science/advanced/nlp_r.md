# Track: Data Science & AI — Module Phase 4 — Deep Learning — Topic: Natural Language Processing (R)

Natural Language Processing (NLP) is the bridge between human language and machine understanding. In Phase 4, we harness deep learning to model language structure, semantics, and intent. Using R, you can prototype end-to-end NLP pipelines—from text cleaning and feature extraction to embedding-based models (including LSTMs) and practical evaluation in real systems. This lesson equips you with hands-on code, explanations, and deployment-conscious practices to move ideas from concept to production-ready workflows.

## 1. Data preparation for NLP in R

This section covers text ingestion, cleaning, tokenization, and turning text into numeric features you can feed into models. We’ll use quanteda for robust preprocessing.

```r
# Install and load required package
if (!require(quanteda)) install.packages("quanteda")
library(quanteda)

# Sample texts
texts <- c(
  "The data science field is rapidly evolving; NLP is central to this shift.",
  "Deep learning models require careful data preparation and evaluation.",
  "NLP enables computers to understand human language with increasing accuracy."
)

# Create a corpus and tokenize
corp <- corpus(texts)
tok <- tokens(corp, remove_punct = TRUE, remove_numbers = TRUE)
tok <- tolower(tok)
tok <- tokens_remove(tok, stopwords("en"))
tok <- tokens_wordstem(tok)

# Build a document-feature matrix (DFM)
dfm <- dfm(tok)
dfm
```

### Line-by-line explanation
- Line 1-2: Ensure and load the quanteda package for NLP tooling.
- Line 5: Define a vector of example texts.
- Line 8: Create a quanteda corpus from the texts.
- Line 9: Tokenize the corpus, removing punctuation and numbers.
- Line 10: Convert tokens to lowercase for normalization.
- Line 11: Remove common English stopwords to reduce noise.
- Line 12: Apply stemming to unify word variants (e.g., "learning" → "learn").
- Line 15-16: Build a document-feature matrix (DFM) from tokens and print it, providing a numeric feature representation of documents.

## 2. Embeddings and simple neural nets in R

This section introduces two approaches:
- 2.1 A compact LSTM-based classifier using Keras with a small synthetic dataset.
- 2.2 A more scalable approach using a standard NLP dataset (IMDb) via Keras.

### 2.1 Lightweight LSTM classifier with a synthetic dataset (Keras)

```r
# Install and load keras (requires TensorFlow backend)
if (!require(keras)) install.packages("keras")
library(keras)

# Synthetic dataset (for demonstration)
texts <- c(
  "I love natural language processing",
  "This task is challenging but rewarding",
  "Deep learning makes NLP more powerful",
  "I am not sure this approach works well"
)
labels <- c(1, 1, 1, 0)  # 1 = positive, 0 = negative (synthetic)

# Tokenization and sequence preparation
max_words <- 1000
max_len <- 10
tokenizer <- text_tokenizer(num_words = max_words)
fit_text_tokenizer(tokenizer, texts)
sequences <- texts_to_sequences(tokenizer, texts)
x <- pad_sequences(sequences, maxlen = max_len)

# Build a simple LSTM model
model <- keras_model_sequential() %>%
  layer_embedding(input_dim = max_words + 1, output_dim = 50, input_length = max_len) %>%
  layer_lstm(units = 64) %>%
  layer_dense(units = 1, activation = "sigmoid")

model %>% compile(optimizer = "adam", loss = "binary_crossentropy", metrics = c("accuracy"))

# Train (note: tiny dataset; this is for demonstration)
model %>% fit(x, labels, epochs = 5, batch_size = 2)
```

### Line-by-line explanation
- Line 1-2: Ensure the keras package is installed and loaded; requires a TensorFlow backend.
- Line 5-9: Define a tiny labeled dataset and prepare it for sequence modeling.
- Line 11-13: Create a tokenizer, fit on the texts, convert to integer sequences, and pad to a fixed length.
- Line 16-21: Build a sequential model with an Embedding layer, an LSTM layer, and a Dense output for binary classification.
- Line 23-24: Compile the model with Adam optimization and binary cross-entropy loss; specify accuracy as a metric.
- Line 27-28: Train the model for a few epochs (illustrative; not a robust training run).

### 2.2 IMDb sentiment classification with a real dataset (Keras)

```r
library(keras)

# Load IMDb data (num_words controls vocabulary size)
c(train_data, train_labels) %<-% dataset_imdb(num_words = 20000)
c(test_data, test_labels) %<-% dataset_imdb(num_words = 20000)

# Pad sequences to a uniform length
maxlen <- 200
x_train <- pad_sequences(train_data, maxlen = maxlen)
x_test  <- pad_sequences(test_data, maxlen = maxlen)

# Build a practical LSTM-based sentiment model
model <- keras_model_sequential() %>%
  layer_embedding(input_dim = 20000, output_dim = 128, input_length = maxlen) %>%
  layer_lstm(units = 64) %>%
  layer_dense(units = 1, activation = "sigmoid")

model %>% compile(
  optimizer = "rmsprop",
  loss = "binary_crossentropy",
  metrics = c("accuracy")
)

# Train with a reasonable epoch count
model %>% fit(
  x_train, train_labels,
  epochs = 3, batch_size = 128,
  validation_split = 0.2
)

# Evaluate on the held-out test set
scores <- model %>% evaluate(x_test, test_labels)
scores
```

### Line-by-line explanation
- Line 1-2: Load the keras package for deep learning in R.
- Line 5-7: Load IMDb sentiment data with a vocabulary limit of 20k words; split into train and test sets.
- Line 10-12: Pad the train and test sequences to a fixed maximum length for uniform input to the network.
- Line 15-20: Define an LSTM-based model with an embedding layer, followed by an LSTM and a sigmoid output.
- Line 22-26: Compile the model with RMSprop optimizer and binary cross-entropy loss; track accuracy.
- Line 29-32: Train the model with a small number of epochs (for demonstration) and a validation split to monitor performance.
- Line 35-36: Evaluate the trained model on the test set and print the scores.

## 3. Evaluation and diagnostics for NLP models

Evaluating NLP models in production requires robust validation, appropriate metrics, and attention to data drift and latency. Here are common practices and a minimal example.

```r
# Simple held-out evaluation example (continuation from IMDb setup)
# Predict on the test set
preds <- model %>% predict(x_test)
pred_labels <- ifelse(preds > 0.5, 1, 0)

# Confusion matrix and accuracy
table(Predicted = pred_labels, Actual = test_labels)
accuracy <- mean(pred_labels == test_labels)
accuracy
```

### Line-by-line explanation
- Line 2-4: Generate predictions for the test set and convert probabilities to binary class labels.
- Line 7-9: Build a confusion matrix comparing predicted vs. actual labels and compute overall accuracy.
- Line 10: Output the accuracy as a simple performance metric.

## X. Common Beginner Mistakes

- Pitfall 1: Ignoring consistent preprocessing across train/test splits
  - Bad:
  ```r
  texts <- c("Data science rocks", "NLP is fun")
  tokens <- unlist(strsplit(tolower(texts), " "))
  ```
  - Good:
  ```r
  library(quanteda)
  toks <- tokens(tolower(texts), remove_punct = TRUE)
  toks <- tokens_remove(toks, stopwords("en"))
  dtm <- dfm(toks)
  ```

- Pitfall 2: No train/test split when evaluating models
  - Bad:
  ```r
  model <- lm(label ~ features, data = df)  # uses all data for training and evaluation
  ```
  - Good:
  ```r
  set.seed(123)
  train_idx <- sample(seq_len(nrow(df)), size = 0.8 * nrow(df))
  train_df <- df[train_idx, ]
  test_df <- df[-train_idx, ]
  # Train on train_df and evaluate on test_df
  ```

- Pitfall 3: Removing too much information with stopword removal
  - Bad:
  ```r
  toks <- tokens_remove(tm, stopwords("en"), min_nchar = 0)
  ```
  - Good:
  ```r
  # Customize stopword list; keep domain-relevant terms
  custom_sw <- c(stopwords("en"), "mr", "mrs", "data")
  toks <- tokens_remove(toks, custom_sw)
  ```

- Pitfall 4: Not padding sequences for neural nets or using ragged inputs
  - Bad:
  ```r
  sequences <- texts_to_sequences(tokenizer, texts)
  # feed directly to a model without padding
  ```
  - Good:
  ```r
  padded <- pad_sequences(sequences, maxlen = max_len)
  # feed 'padded' to the neural model
  ```

## Y. Why This Matters In Real Systems

- Reproducibility and governance: Use fixed seeds, versioned datasets, and literate pipelines (R Markdown, Quarto) to reproduce experiments.
- Data pipelines: NLP models rely on consistent text preprocessing (tokenizers, vocabularies, stopword lists). Changes can silently alter model behavior.
- Latency and throughput: LSTM-based NLP models can be heavy; consider batching strategies, model compression, or moving to CNNs or lightweight transformers when appropriate.
- Deployment considerations: 
  - Serialization: save models with weights and architecture; track dependencies with environments.
  - Observability: monitor drift in input distributions, model accuracy over time, and latency metrics.
  - Security and fairness: guard against biased training data and ensure inputs don’t leak sensitive information.
- Validation strategies: Use cross-validation or repeated hold-out validation for more robust estimates; monitor performance on production data and retrain if drift occurs.
- Migration path: Start with traditional ML (TF-IDF + logistic regression) for a baseline; move to embeddings + shallow nets; then to transformers if project scope justifies the complexity.

## Z. Study Questions

1) What is a document-feature matrix (DFM) and why is it useful for NLP models in R?  
2) How does padding sequence inputs help LSTM-based models handle text data?  
3) What is the difference between a bag-of-words model and a TF-IDF representation?  
4) Why is a train/test split important in NLP experiments, and what are common pitfalls when creating splits?  
5) What are key considerations when deploying an NLP model in production (latency, drift, monitoring, and reproducibility)?

## Exercise

Part A – Build a basic NLP classifier pipeline (quanteda + glmnet)

1) Create a small labeled dataset of 12 sentences with two classes (0/1). Include varied vocabulary and punctuation.  
2) Preprocess the text: lowercase, remove punctuation/numbers, remove English stopwords, and apply simple stemming.  
3) Convert to a document-feature matrix (DFM) using quanteda.  
4) Split the data into 80% training and 20% testing.  
5) Train a logistic regression classifier using glmnet (or a simple glm) on the DFM.  
6) Evaluate accuracy on the held-out test set and discuss results.

Code scaffold (you fill in with your data):

```r
# Part A1: Prepare data
library(quanteda)
texts <- c(
  "I love NLP, it is fascinating!",
  "This method lacks rigor and is slow.",
  "Deep learning in NLP delivers excellent results.",
  "The approach is unconvincing and noisy.",
  "NLP applications are everywhere and growing.",
  "Model performance is unsatisfactory in practice.",
  "Clear benefits are seen with data-driven NLP.",
  "The pipeline is brittle and hard to maintain.",
  "Efficient preprocessing speeds up training.",
  "Interpretability is crucial for deployment.",
  "This dataset is small but informative.",
  "Evaluation needs robust metrics."
)
labels <- c(1,0,1,0,1,0,1,0,1,1,0,1)

# Part A2: Preprocess
corp <- corpus(texts)
tok <- tokens(corp, remove_punct = TRUE, remove_numbers = TRUE)
tok <- tolower(tok)
tok <- tokens_remove(tok, stopwords("en"))
tok <- tokens_wordstem(tok)

# Part A3: DFM and features
dfm <- dfm(tok)
dfm

# Part A4: Train/test split (80/20)
set.seed(42)
indices <- sample(seq_len(nrow(dfm)), size = floor(0.8 * nrow(dfm)))
train_dfm <- dfm[indices, ]
test_dfm  <- dfm[-indices, ]
train_y <- labels[indices]
test_y  <- labels[-indices]

# Part A5: Train classifier (glmnet)
if (!require(glmnet)) install.packages("glmnet")
library(glmnet)
# glmnet expects a matrix; convert dfm to a matrix
x_train <- as.matrix(train_dfm)
x_test  <- as.matrix(test_dfm)

# Fit logistic regression with L1/L2 regularization
# alpha = 0 for ridge, 1 for lasso; using 1 here as an example
model <- glmnet(x_train, train_y, family = "binomial", alpha = 0.5)

# Predict on test data (average across lambda path or choose lambda via cross-validation)
cv_fit <- cv.glmnet(x_train, train_y, family = "binomial", alpha = 0.5)
best_lambda <- cv_fit$lambda.min
preds <- predict(model, newx = x_test, s = best_lambda, type = "response")
pred_labels <- ifelse(preds > 0.5, 1, 0)

# Part A6: Evaluate
accuracy <- mean(pred_labels == test_y)
accuracy
```

Part B – Optional: Extend with a simple LSTM using Keras (bonus)

1) Use the same dataset to build a tiny Keras LSTM model (as shown in Section 2.1) to compare performance with the bag-of-words baseline.  
2) Compare accuracy and discuss trade-offs between simple linear models and neural approaches for small text datasets.

Notes and tips for the exercise
- This exercise emphasizes a practical NLP pipeline: data ingestion, preprocessing, feature extraction, model training, and evaluation.
- Start simple: a baseline with DFM + logistic regression is often surprisingly strong in many NLP tasks.
- For real projects, ensure you have a proper train/validation/test split, and consider cross-validation if dataset size permits.
- If you extend with Keras, be mindful of dataset size and training time; use smaller architectures and experiments with embedding dimensions.

End of lesson.