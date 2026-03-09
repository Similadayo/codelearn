# Data Science & AI — Phase 4: Deep Learning
Topic: Natural Language Processing (Julia)

Natural Language Processing (NLP) combines linguistics, statistics, and machine learning to enable computers to understand, generate, and reason about human language. In professional settings, NLP powers chatbots, customer sentiment analysis, document classification, and information retrieval. This lesson introduces practical NLP in Julia: from tokenization and bag-of-words representations to lightweight embeddings and a small neural classifier. You’ll learn by building a minimal, end-to-end NLP pipeline you can experiment with, extend, and deploy in real systems.

## 1. Text Representation Basics: Tokenization, Vocabulary, and Bag-of-Words
In this section we cover the foundational steps to convert raw text into numeric features that a machine learning model can consume: tokenization, building a vocabulary, and creating bag-of-words (BoW) vectors.

```julia
#== Section 1: Text Representation Basics ==#
using WordTokenizers
using Flux
using Statistics

# Sample dataset: sentences and a simple binary label (1 = positive, 0 = negative)
sentences = [
  "I love Julia",
  "Julia is great for ML",
  "NLP with Julia is fun",
  "I dislike bugs"
]
labels = [1, 1, 1, 0]  # a tiny synthetic sentiment label

# 1) Tokenize and lowercase each sentence
corpus_tokens = [collect(map(lowercase, tokenize(s))) for s in sentences]

# 2) Build a vocabulary from the corpus
all_tokens = unique(vcat(corpus_tokens...))
vocab = Dict(token => i for (i, token) in enumerate(all_tokens))

# 3) Create a Bag-of-Words vector for each sentence
function bow(tokens, vocab)
  v = zeros(Int, length(vocab))
  for t in tokens
    idx = get(vocab, t, 0)
    if idx != 0
      v[idx] += 1
    end
  end
  return v
end

X = hcat([bow(tokens, vocab) for tokens in corpus_tokens]...)  # feature matrix V x N
y = labels

# Convert labels to one-hot encoding for a 2-class problem
y_onehot = Flux.onehotbatch(y, 0:1)

# Simple logistic regression classifier (softmax over 2 classes)
model = Chain(Dense(length(vocab), 2), softmax)

loss(x, y) = Flux.crossentropy(model(x), y)

# Training loop (mini-batch not necessary for this tiny example)
opt = Descent(0.1)
for epoch in 1:100
  for i in 1:size(X, 2)
    x = X[:, i]
    yy = y_onehot[:, i]
    gs = Flux.gradient(() -> loss(x, yy), Flux.params(model))
    Flux.Optimise.update!(opt, Flux.params(model), gs)
  end
end

# Quick inference on a new sentence ( BoW with the existing vocabulary )
new_sentence = "I love NLP"
new_tokens = collect(map(lowercase, tokenize(new_sentence)))
x_new = bow(new_tokens, vocab)
pred = model(x_new)
println("Predicted probabilities (negative, positive): ", pred)
```

### Line-by-line explanation
- Import essential libraries: WordTokenizers for tokenization, Flux for neural models, and Statistics for any needed stats utilities.
- Define a tiny dataset of sentences and binary labels to illustrate a supervised task.
- Tokenize and lowercase each sentence to produce a clean, comparable token list.
- Build a vocabulary from all unique tokens in the corpus.
- Define a function bow that converts a list of tokens into a BoW vector aligned to the vocabulary indices.
- Construct the feature matrix X where each column is a BoW vector for a sentence.
- Convert labels to one-hot encoding for compatibility with softmax cross-entropy.
- Create a simple neural classifier: a single Dense layer followed by softmax for 2 classes.
- Define a loss function using cross-entropy between model output and one-hot labels.
- Train the model with a straightforward loop over all examples for a fixed number of epochs.
- Prepare a new sentence, tokenize and lowercase it, convert to BoW, and pass through the trained model to obtain class probabilities.

## 2. Embeddings and a Lightweight Classifier: Mean-Pooled Word Embeddings
Beyond BoW, embedding-based representations capture semantic information. We’ll create a tiny fixed-size embedding matrix for the vocabulary and use mean pooling over token embeddings to form a sentence vector, then classify with a small neural network. This approach is lightweight and often more robust than BoW on small datasets.

```julia
#== Section 2: Embeddings + Lightweight Classifier ==#
using Flux
using Statistics

# Rebuild vocabulary (same as Section 1 for consistency in this lesson)
sentences = [
  "I love Julia",
  "Julia is great for ML",
  "NLP with Julia is fun",
  "I dislike bugs"
]
labels = [1, 1, 1, 0]

corpus_tokens = [collect(map(lowercase, tokenize(s))) for s in sentences]
all_tokens = unique(vcat(corpus_tokens...))
vocab = Dict(token => i for (i, token) in enumerate(all_tokens))
V = length(vocab)  # vocabulary size
d = 50            # embedding dimension

# 1) Randomly initialize a word embedding matrix: d x V
W = randn(d, V) * 0.1

# 2) Sentence mean embeddings
function mean_embedding(tokens, vocab, W, d)
  idxs = [vocab[t] for t in tokens if haskey(vocab, t)]
  if isempty(idxs)
    return zeros(d)
  else
    return mean(W[:, idxs], dims=2)[:, 1]
  end
end

# 3) Build dataset of sentence embeddings
X_emb = hcat([mean_embedding(tokens, vocab, W, d) for tokens in corpus_tokens]...)

# 4) Classifier on embeddings
model_emb = Chain(Dense(d, 2), softmax)

# 5) Training setup
y = labels
y_onehot = Flux.onehotbatch(y, 0:1)

loss_emb(x, y) = Flux.crossentropy(model_emb(x), y)

opt_emb = Descent(0.1)

for epoch in 1:200
  for i in 1:size(X_emb, 2)
    x = X_emb[:, i]
    y_i = y_onehot[:, i]
    gs = Flux.gradient(() -> loss_emb(x, y_i), Flux.params(model_emb, W))
    Flux.Optimise.update!(opt_emb, Flux.params(model_emb, W), gs)
  end
end

# 6) Inference helper: recomputes embedding with the learned W and predicts
function predict_with_embeddings(text)
  toks = collect(map(lowercase, tokenize(text)))
  emb = mean_embedding(toks, vocab, W, d)
  p = model_emb(emb)
  return p
end

println("Probabilities for a sample: ", predict_with_embeddings("Julia ML NLP"))
```

### Line-by-line explanation
- Rebuild the same vocabulary to keep the lesson coherent; we’ll reuse V, and vocab for mapping tokens to indices.
- Create a random embedding matrix W with dimensions d x V, where each column is a word embedding.
- Define mean_embedding that looks up token indices, selects their embeddings, and averages across tokens to produce a sentence vector. If no known tokens exist, it returns a zero vector.
- Build a matrix X_emb where each column is the mean-pooled embedding for a sentence.
- Define a simple two-class classifier on top of the embedding representation.
- Convert labels to one-hot encoding for training.
- Define a cross-entropy loss function against the model’s output.
- Train the model by updating both the classifier parameters and the embedding matrix W. This is a compact way to jointly refine word representations and the downstream classifier.
- Provide a helper to predict probabilities for new text by computing its mean embedding and passing it through the classifier.

## 3. Inference, Evaluation, and a Minimal Deployment View
Learn how to run predictions on new text and how to validate a tiny NLP model. This section focuses on practical inference and a quick, reproducible evaluation workflow suitable for a microservice prototype.

```julia
#== Section 3: Inference & Evaluation Pipeline ==#
# Reuse vocab, embedding matrix W, and classifier from Section 2 (conceptual, self-contained here)
# In real notebooks, you would save/load these objects between sections.

# Simple helper to compute sentence probability distribution for a new text
function predict_text(text::String)
  toks = collect(map(lowercase, tokenize(text)))
  emb = mean_embedding(toks, vocab, W, d)
  p = model_emb(emb)
  return p
end

# Example usage
texts = [
  "Julia makes NLP easy",
  "I hate bugs but love code",
  "Machine learning rocks"
]
for t in texts
  println(t, " -> ", predict_text(t))
end
```

### Line-by-line explanation
- Define a predict_text function that tokenizes, looks up embeddings via mean_embedding, and runs the downstream classifier to produce a probability distribution over classes.
- Demonstrate usage by predicting on several new sentences and printing the results. This demonstrates a minimal inference pipeline suitable for a microservice or notebook exploration.

## X. Common Beginner Mistakes
Here are real pitfalls with concrete, bad-vs-good examples to help you write correct, robust NLP code in Julia.

- Pitfall 1: Unknown tokens cause runtime errors
Bad:
```julia
# Assumes every token has a vocab entry
idxs = [vocab[t] for t in tokens]
```
Good:
```julia
idxs = [vocab[t] for t in tokens if haskey(vocab, t)]
```

- Pitfall 2: Mixing integer counts with neural network inputs
Bad:
```julia
X = zeros(Int, V, N)  # integer type
```
Good:
```julia
X = zeros(Float32, V, N)  # float32 is typical for Flux
```

- Pitfall 3: Not handling unknown tokens in embeddings
Bad:
```julia
idxs = [vocab[t] for t in tokens]
emb = mean(W[:, idxs], dims=2)
```
Good:
```julia
idxs = [vocab[t] for t in tokens if haskey(vocab, t)]
emb = isempty(idxs) ? zeros(d) : mean(W[:, idxs], dims=2)[:, 1]
```

- Pitfall 4: Improper final-layer activation for classification
Bad:
```julia
model = Dense(d, 2)  # without explicit softmax
```
Good:
```julia
model = Chain(Dense(d, 2), softmax)
```

- Pitfall 5: Training loop misuses gradients or updates
Bad:
```julia
for (x, y) in zip(X, y)
  gs = gradient(() -> loss(x, y), params(model))
  update!(opt, model, gs)  # incorrect params
end
```
Good:
```julia
for i in 1:size(X, 2)
  x = X[:, i]
  y_i = y_onehot[:, i]
  gs = gradient(() -> loss(x, y_i), params(model))
  Flux.Optimise.update!(opt, params(model), gs)
end
```

## Y. Why This Matters In Real Systems
- Real-world NLP tasks require robust preprocessing: normalization, handling punctuation, stopwords, and multilingual data. The simple pipelines here illustrate core ideas, but production systems require careful tokenization libraries, language detection, and normalization rules.
- Efficiency and scalability: BoW is fast but high-dimensional; embeddings offer compact representations and better generalization. In production, you’ll balance model size, latency, and throughput, possibly using batching, quantization, or model distillation.
- Data quality and evaluation: Small toy datasets can create misleadingly high accuracy. Use larger, representative corpora, stratified splits, and metrics beyond accuracy (precision, recall, F1, ROC-AUC) for real systems.
- Deployability: Save/load models deterministically, version vocabularies, and maintain reproducible environments (e.g., with project.toml, constants for random seeds). Integrate with serving layers, monitoring, and A/B testing.
- Safety and bias: NLP models may reproduce or amplify biases. Implement bias checks, input sanitization, and guardrails for user-facing applications.

## Z. Study Questions
1. What is a bag-of-words representation, and how does it differ from mean-pooled embeddings?
2. Why is it important to handle unknown tokens in a vocabulary, and what are common strategies to do so?
3. How does softmax facilitate multi-class classification in a neural model?
4. What are the trade-offs between a BoW-based model and an embedding-based model in terms of data efficiency and generalization?
5. How would you extend the simple pipeline to handle longer documents or streaming text?

## Exercise
Complete the practical coding challenge below. Implement and experiment with a small end-to-end NLP workflow in Julia, then answer the included questions.

Part A: Extend Vocabulary and Robust BoW
- Task: Add an UNK token, and modify the BoW construction to map unknown tokens to UNK. Rebuild a small dataset and show the improved handling.
- Deliverables:
  - Updated vocabulary with "<UNK>" token.
  - BoW function that maps unknown tokens to UNK index.
  - A small test set including unseen tokens and demonstration of the classifier's predictions.

Part B: Lightweight Embeddings Training and Evaluation
- Task: Train the embedding-based classifier on your dataset, then evaluate on a held-out test sentence(s).
- Steps:
  - Split the data into train/test (e.g., 3 train, 1 test for the tiny example).
  - Train W and model_emb as in Section 2.
  - Compute and print test probabilities and the predicted label.

Part C: Inference Pipeline and Saving/Loading
- Task: Build a small inference function, then save the trained model and vocab to a BSON file and load it back in a new session.
- Steps:
  - Implement a predict_text function for new input.
  - Save model embeddings W, vocabulary, and classifier to "nlp_model.bson".
  - In a new Julia session, load the file and run predict_text on a fresh sentence to verify persistence.

Part D: Quick Reflection
- Write 3–5 sentences describing:
  - What you learned about tokenization, embeddings, and simple classifiers.
  - How this approach might scale to a larger dataset.
  - One potential real-world obstacle and a plan to address it.

Note: The code in this lesson is intentionally compact to illustrate core ideas. In real projects, you would structure modules, add error handling, and integrate with data pipelines, tests, and deployment tooling.