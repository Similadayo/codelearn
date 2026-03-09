# Deep Learning with PyTorch/TensorFlow in R

Phase 4 of Data Science & AI dives into Deep Learning, equipping you to build, train, and deploy neural networks. In this module, we'll explore Deep Learning using two dominant frameworks—TensorFlow (via Keras in R) and PyTorch (via the torch package in R). We’ll also demonstrate interoperability with Python PyTorch through reticulate. By the end, you’ll be able to construct end-to-end models, preprocess data for deep learning, compare framework ergonomics, and translate models into real systems.

## 1. TensorFlow/Keras in R: Quickstart and a CNN on MNIST

Keras in R provides a high-level API backed by TensorFlow. It’s ideal for rapid prototyping and for production-ready model definitions when using TensorFlow as the backend. This section shows installing, loading a dataset, building a CNN, training, and evaluating on MNIST.

```r
# Install and load Keras (TensorFlow backend)
install.packages("keras")
library(keras)

# Install TensorFlow backend if needed (downloads may take a while)
install_keras(method = "auto")

# Load MNIST data
mnist <- dataset_mnist()
x_train <- mnist$train$x
y_train <- mnist$train$y
x_test  <- mnist$test$x
y_test  <- mnist$test$y

# Preprocess data: reshape to include channel dimension and normalize to [0,1]
x_train <- array_reshape(x_train, c(nrow(x_train), 28, 28, 1)) / 255
x_test  <- array_reshape(x_test,  c(nrow(x_test),  28, 28, 1)) / 255

# One-hot encode labels
y_train_cat <- to_categorical(y_train, 10)
y_test_cat  <- to_categorical(y_test, 10)

# Define a small CNN model
model <- keras_model_sequential() %>%
  layer_conv_2d(filters = 32, kernel_size = c(3,3), activation = 'relu', input_shape = c(28,28,1)) %>%
  layer_max_pooling_2d(pool_size = c(2,2)) %>%
  layer_conv_2d(filters = 64, kernel_size = c(3,3), activation = 'relu') %>%
  layer_max_pooling_2d(pool_size = c(2,2)) %>%
  layer_flatten() %>%
  layer_dense(units = 128, activation = 'relu') %>%
  layer_dropout(rate = 0.5) %>%
  layer_dense(units = 10, activation = 'softmax')

# Compile the model
model %>% compile(
  optimizer = 'adam',
  loss = 'categorical_crossentropy',
  metrics = 'accuracy'
)

# Train the model
model %>% fit(
  x_train, y_train_cat,
  epochs = 3, batch_size = 128,
  validation_split = 0.2
)

# Evaluate on test data
scores <- model %>% evaluate(x_test, y_test_cat)
scores
```

### Line-by-line explanation
- Install and load keras: ensures the R wrapper is available and the TensorFlow backend is installed.
- Load MNIST: fetches a standard 28x28 grayscale image dataset with 10 classes.
- Preprocess: reshapes input to include a channel dimension and scales pixel values to [0,1].
- One-hot encode: converts integer labels to one-hot vectors for categorical Cross-Entropy loss.
- Model definition: builds a small CNN with two conv-pool blocks, flattening, a dense layer, dropout, and a final softmax classifier.
- Compile: specifies optimizer, loss, and accuracy metric.
- Train: fits the model on training data with a validation split.
- Evaluate: computes loss and accuracy on the held-out test set.

## 2. PyTorch-like Deep Learning in R: Using the torch Package

The torch package in R offers a PyTorch-inspired API for defining models, writing training loops, and manipulating tensors directly in R. This section trains a tiny neural network on a synthetic 2D dataset to illustrate the workflow.

```r
library(torch)

set.seed(123)

n <- 400
# Create simple 2D data: two classes
x <- torch_randn(n, 2)
# Create binary labels: 0 or 1 based on a linear boundary
y <- (x[, 1] + x[, 2] > 0)$to(dtype = torch_long())

# Define a tiny MLP
net <- nn_module(
  "MLP",
  initialize = function() {
    self$fc1 <- nn_linear(2, 8)
    self$fc2 <- nn_linear(8, 2)
  },
  forward = function(x) {
    x <- self$fc1(x)
    x <- nnf_relu(x)
    x <- self$fc2(x)
    x
  }
)

model <- net()
criterion <- nn_cross_entropy_loss()
optimizer <- optim_sgd(model$parameters, lr = 0.1)

# Training loop (full-batch for simplicity)
epochs <- 20
for (epoch in 1:epochs) {
  optimizer$zero_grad()
  out <- model(x)
  loss <- criterion(out, y)
  loss$backward()
  optimizer$step()
  if (epoch %% 5 == 0) cat(sprintf("epoch %d, loss %.4f\n", epoch, loss$item()))
}

# Evaluate accuracy
with_no_grad({
  preds <- model(x)$argmax(dim = 2)
  acc <- preds$eq(y)$sum()$item() / n
  cat("Accuracy:", acc, "\n")
})
```

### Line-by-line explanation
- library(torch): loads the PyTorch-like interface for R.
- set.seed: ensures reproducible results.
- Data creation: generates 400 samples in 2D and assigns binary labels based on a simple rule.
- Model definition: builds a tiny two-layer network (input 2 features, hidden size 8, 2 outputs).
- Forward pass: applies a linear layer, ReLU, and a final linear layer to produce class scores.
- Loss and optimizer: uses cross-entropy loss and SGD optimizer.
- Training loop: zero gradients, compute predictions, loss, backpropagate, update.
- Evaluation: computes predicted classes and accuracy on the training data.

## 3. Interoperability: Running Python PyTorch from R via reticulate

When you need to leverage Python PyTorch code from R, reticulate offers a seamless bridge. This example shows running a tiny PyTorch model in Python from R, useful for cross-framework experiments or propped pipelines.

```r
library(reticulate)

# Run a small Python PyTorch snippet
py_run_string("
import torch
import torch.nn as nn
import torch.optim as optim

class Net(nn.Module):
    def __init__(self):
        super(Net, self).__init__()
        self.fc1 = nn.Linear(2, 8)
        self.fc2 = nn.Linear(8, 2)

    def forward(self, x):
        x = self.fc1(x)
        x = torch.relu(x)
        x = self.fc2(x)
        return x

# Simple synthetic data
X = torch.randn(200, 2)
Y = torch.randint(0, 2, (200,))

net = Net()
criterion = nn.CrossEntropyLoss()
optimizer = optim.SGD(net.parameters(), lr=0.1)

for i in range(10):
    optimizer.zero_grad()
    out = net(X)
    loss = criterion(out, Y)
    loss.backward()
    optimizer.step()

print('Python PyTorch run complete; final loss:', float(loss))
")
```

### Line-by-line explanation
- library(reticulate): enables Python–R interop.
- py_run_string: executes the embedded Python code string.
- Python side defines a simple Net with two linear layers and ReLU.
- Generates synthetic data X and labels Y.
- Defines loss and optimizer, runs a short training loop, and prints final loss.
- Control returns to R after execution; you can pull Python objects back if needed via py$object or r_to_py conversions.

## 4. Data Handling and Preprocessing for Deep Learning in R

Data preparation is foundational. Different frameworks have different expectations for input shapes, normalization, and batching. This section shows practical patterns for both Keras and torch pipelines.

```r
# Keras-ready preprocessing (MNIST example)
# Normalize to [0,1], ensure channel dimension
x_train_n <- x_train
x_test_n  <- x_test

# Torch-ready preprocessing (synthetic data)
# Normalize features to zero mean and unit variance
mean_x <- x$mean()$item()
sd_x   <- x$std()$item()
x_norm <- (x - mean_x) / sd_x
```

### Line-by-line explanation
- For Keras, we typically normalize pixel values to [0,1] and ensure the correct shape (including batch and channel dimensions) before feeding into the network.
- For Torch, normalizing inputs to zero mean and unit variance helps stabilize training, especially with gradient-based optimizers. The example computes mean and std dev from the dataset and applies standard score normalization.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Not normalizing or scaling inputs
  - Bad
  ```r
  # Bad: feeding raw pixel values without scaling
  model %>% fit(x_train, y_train_cat, epochs = 5, batch_size = 128)
  ```
  - Good
  ```r
  # Good: normalize inputs to [0,1] before training
  x_train_norm <- x_train / 255
  model %>% fit(x_train_norm, y_train_cat, epochs = 5, batch_size = 128)
  ```

- Pitfall 2: Mismatched input shapes or missing channel dimension
  - Bad
  ```r
  # Bad: input_shape expects 28x28x1 but data lacks channel dimension
  model <- keras_model_sequential() %>%
    layer_conv_2d(filters = 32, kernel_size = c(3,3), activation = 'relu', input_shape = c(28,28,1))
  ```
  - Good
  ```r
  # Good: ensure channel dimension exists
  x_train <- array_reshape(x_train, c(nrow(x_train), 28, 28, 1))
  model <- keras_model_sequential() %>%
    layer_conv_2d(filters = 32, kernel_size = c(3,3), activation = 'relu', input_shape = c(28,28,1))
  ```

- Pitfall 3: Using an inappropriate loss for classification
  - Bad
  ```r
  # Bad: using mean_squared_error for multi-class classification
  model %>% compile(optimizer='adam', loss='mean_squared_error', metrics='accuracy')
  ```
  - Good
  ```r
  model %>% compile(optimizer='adam', loss='categorical_crossentropy', metrics='accuracy')
  ```

- Pitfall 4: Ignoring reproducibility and random seeds
  - Bad
  ```r
  # No seed or RNG control
  # Results may vary between runs
  ```
  - Good
  ```r
  set.seed(123)
  use_session_with_seed(123)  # If available in your environment
  ```

- Pitfall 5: Skipping validation/testing or data leakage
  - Bad
  ```r
  # Train on all data, no validation split
  model %>% fit(x_train, y_train_cat, epochs = 10)
  ```
  - Good
  ```r
  model %>% fit(x_train, y_train_cat, epochs = 10, validation_split = 0.2)
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility and versioning: Deep learning experiments depend on fixed seeds, library versions, and data versions. Use explicit seed setting, environment.yml/renv, and model versioning.
- Data pipelines and throughput: Training on large datasets requires efficient data pipelines, batching, and possibly distributed training. For production, you’ll often separate data prep from model training and use data generators or streaming pipelines.
- Model deployment: TensorFlow/Keras models can be saved as HDF5 or SavedModel formats; Torch models can use save_state_dict. Deployment might involve serving endpoints (REST/gRPC), batch inference, or edge deployment (TensorFlow Lite, TorchScript).
- Monitoring and drift: In production, continuously monitor accuracy, latency, and data drift. Re-train or fine-tune when performance degrades.
- Hardware considerations: GPU acceleration dramatically speeds up training; ensure the environment can access CUDA-capable hardware and that dependencies are properly configured.
- Interoperability: R can orchestrate experiments and dashboards while leveraging Python ecosystems for heavy ML experimentation. Reticulate lets you blend R’s analytics with PyTorch/TensorFlow capabilities as needed.

## Z. Study Questions — 5 recall questions

1. What are the main differences between the Keras (TensorFlow) workflow and the torch (PyTorch) workflow in R?
2. How does one normalize pixel data for MNIST before training a CNN in Keras?
3. Why is CrossEntropyLoss appropriate for multi-class classification, and what would be wrong with using MSELoss?
4. How can you run Python PyTorch code from R, and why might you want to do this?
5. What are common steps to serialize and deploy a trained model for production?

## Exercise — practical multi-part coding challenge

Goal: Build a small end-to-end classification workflow in R using both Keras and torch, compare them, and save/load a model.

Part A — Keras (TensorFlow) binary classifier on synthetic 2D data
- Generate two Gaussian blobs in 2D as a toy dataset.
- Train a small neural network in Keras to classify the blobs.
- Evaluate accuracy on a held-out test split.
- Save the trained model to disk in HDF5.

Code sketch (you will fill in with concrete R code):
```r
set.seed(42)
library(keras)

# Part A: data creation
n <- 400
X1 <- matrix(rnorm(n*2, mean = -2, sd = 1), ncol = 2)
X2 <- matrix(rnorm(n*2, mean =  2, sd = 1), ncol = 2)
X <- rbind(X1, X2)
y <- c(rep(0, n), rep(1, n))

# Split
train_idx <- sample(seq_len(nrow(X)), size = 0.8 * nrow(X))
X_train <- X[train_idx,]
X_test  <- X[-train_idx,]
y_train <- y[train_idx]
y_test  <- y[-train_idx]

# Model: simple MLP
model <- keras_model_sequential() %>%
  layer_dense(units = 16, activation = 'relu', input_shape = c(2)) %>%
  layer_dense(units = 2, activation = 'softmax')

model %>% compile(optimizer = 'adam', loss = 'sparse_categorical_crossentropy', metrics = 'accuracy')

# Train
model %>% fit(X_train, y_train, epochs = 50, batch_size = 16, validation_split = 0.2)

# Evaluate
loss_acc <- model %>% evaluate(X_test, y_test)
print(loss_acc)

# Save
save_model_hdf5(model, filepath = "keras_toy_classifier.h5")
```

Part B — Torch (PyTorch-like) binary classifier on the same data
- Build a tiny MLP with 2 inputs and 2 outputs.
- Train on the same data.
- Evaluate accuracy on the test set.
- Save the model’s state dict.

Code sketch:
```r
library(torch)

# Prepare tensors
X <- torch_tensor(X)
Y <- torch_tensor(y, dtype = torch_long())

# Model
net <- nn_module(
  "ToyMLP",
  initialize = function() {
    self$fc1 <- nn_linear(2, 16)
    self$fc2 <- nn_linear(16, 2)
  },
  forward = function(x) {
    x <- self$fc1(x)
    x <- nnf_relu(x)
    x <- self$fc2(x)
    x
  }
)

model_torch <- net()
criterion <- nn_cross_entropy_loss()
optim <- optim_adam(model_torch$parameters, lr = 0.01)

# Train
epochs <- 60
for (epoch in 1:epochs) {
  optim$zero_grad()
  out <- model_torch(X)
  loss <- criterion(out, Y)
  loss$backward()
  optim$step()
}
# Evaluate
pred <- model_torch(X)$argmax(dim = 2)
acc <- pred$eq(Y)$sum()$item() / Y$size()[[1]]
print(paste("Torch-like accuracy:", acc))

# Save
torch_save(model_torch$state_dict(), "toy_torch_model.pt")
```

Part C — Interoperability check (optional)
- Load the Keras model in R and run predictions on a few samples. Then, load the PyTorch-like model and compare predictions. This reinforces cross-framework compatibility in practical pipelines.

Notes
- If you cannot download dataset dependencies or want to skip heavy training, you can mock data with simpler structures and verify API usage.
- The exact function names (e.g., layer_conv_2d, image preprocessing) may vary slightly depending on package versions; refer to the installed package docs if you encounter minor differences.

This lesson provides a structured pathway to mastering deep learning in R with both TensorFlow/Keras and PyTorch-like interfaces, plus interoperability with Python. Use these foundations to experiment with more complex networks, transfer learning, and production-grade deployment pipelines.