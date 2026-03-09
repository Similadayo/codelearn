# Deep Learning with PyTorch/TensorFlow (Python Data Stack)

Deep learning in Python hinges on the ability to manipulate tensors, compute gradients, and iteratively optimize models. PyTorch offers dynamic graphs and intuitive imperative style, while TensorFlow 2.x emphasizes eager execution and Keras-style APIs. This lesson compares both frameworks in parallel, so you can switch between them in real-world projects, experiment rapidly, and scale to production. By the end, you'll implement tiny networks, understand training loops, preprocess data, and save/evaluate models in both ecosystems.

Introductory paragraph: In modern data science and AI engineering, building effective deep learning models quickly is crucial. PyTorch provides clarity and flexibility for research and experimentation, while TensorFlow offers robust deployment options, scalable data pipelines, and mature ecosystem tools. Knowing how to implement fundamental building blocks—tensors, autograd, model definitions, training loops, data loading, evaluation, and model persistence—in both frameworks makes you resilient to evolving tech stacks and helps teams standardize pipelines across research and production.

## 1. Tensors, Autograd, and Basic Operations

- Concept: Tensors are the core data structure; autograd tracks operations to compute gradients automatically. Understanding basic tensor ops in PyTorch and TF is foundational before building models.

### PyTorch code
```python
import torch

# 1) Create a tensor with gradient tracking
x = torch.tensor([1.0, -2.0, 3.0], requires_grad=True)

# 2) Simple operation
y = torch.relu(x)

# 3) Define a scalar loss
loss = y.sum()

# 4) Backpropagate
loss.backward()

# 5) Inspect gradients
print("x.grad =", x.grad)
```

### Line-by-line explanation
- Line 1: Import the PyTorch package.
- Line 4: Create a 1-D tensor with gradient tracking enabled; requires_grad=True tells autograd to track operations on x.
- Line 7: Apply the ReLU operation elementwise to x to form y.
- Line 10: Define a scalar loss by summing all elements of y.
- Line 13: Backpropagate the loss to compute gradients with respect to x.
- Line 16: Print the gradient stored in x.grad; for ReLU, gradients are 1 where x > 0 and 0 otherwise.

### TensorFlow 2.x code (eager execution)
```python
import tensorflow as tf

# 1) Variables with gradient tracking
x = tf.Variable([1.0, -2.0, 3.0])

# 2) Build a simple computation inside a GradientTape
with tf.GradientTape() as tape:
    y = tf.nn.relu(x)
    loss = tf.reduce_sum(y)

# 3) Compute gradients of loss w.r.t. x
grad = tape.gradient(loss, x)

print("grad =", grad.numpy())
```

### Line-by-line explanation
- Line 1: Import TensorFlow.
- Line 4: Create a mutable tensor (Variable) to track computations for gradient calculation.
- Line 7-9: Start a gradient recording context; compute y = ReLU(x) and loss = sum(y).
- Line 12: Compute gradients of loss with respect to x.
- Line 14: Print the numeric gradient values as a NumPy-like array.

## 2. Building and Training a Simple Neural Network

- Concept: A tiny neural network demonstrates the core ideas of parameterized computation: layers with weights, a forward pass, and non-linear activations.

### PyTorch code
```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class TinyNet(nn.Module):
    def __init__(self, input_dim=2, hidden_dim=4, output_dim=1):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x

# Instantiate and run a quick forward pass
model = TinyNet(input_dim=2, hidden_dim=4, output_dim=1)
X = torch.tensor([[0.5, -1.0], [2.0, 3.0]])
out = model(X)
print("Output:", out.detach().numpy())
```

### Line-by-line explanation
- Line 1-3: Import PyTorch core, neural network module, and functional utilities.
- Lines 5-12: Define TinyNet with two linear layers: 2→4, then 4→1, with ReLU activation after the first layer in forward().
- Lines 15-18: Create a model instance, prepare a 2-sample input tensor, and run a forward pass.
- Line 19: Print the raw output as a NumPy array (detach to avoid tracking graph).

### TensorFlow code (Keras-style)
```python
import tensorflow as tf

class TinyNet(tf.keras.Model):
    def __init__(self, input_dim=2, hidden_dim=4, output_dim=1):
        super().__init__()
        self.fc1 = tf.keras.layers.Dense(hidden_dim, activation='relu')
        self.fc2 = tf.keras.layers.Dense(output_dim)

    def call(self, x):
        x = self.fc1(x)
        return self.fc2(x)

model = TinyNet(input_dim=2, hidden_dim=4, output_dim=1)
X = tf.constant([[0.5, -1.0], [2.0, 3.0]], dtype=tf.float32)
print("Output:", model(X).numpy())
```

### Line-by-line explanation
- Line 1: Import TensorFlow.
- Lines 4-9: Define TinyNet as a small Keras-style model with a hidden Dense layer (ReLU) and an output Dense layer.
- Line 12: Instantiate the model.
- Line 13: Create a 2x2 input tensor as a constant.
- Line 14: Run a forward pass and print the numeric output.

## 3. Training Loop Essentials and Data Loading

- Concept: Training loops orchestrate forward passes, loss computation, and backpropagation. Demonstrating with synthetic data helps you understand batching, optimization steps, and device placement.

### PyTorch training loop (basic)
```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader

# Reuse TinyNet
class TinyNet(nn.Module):
    def __init__(self, input_dim=2, hidden_dim=4, output_dim=1):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        return self.fc2(x)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
net = TinyNet().to(device)

criterion = nn.MSELoss()
optimizer = optim.SGD(net.parameters(), lr=0.01)

# Fake dataset
X = torch.randn(32, 2)
y = torch.randn(32, 1)

dataset = TensorDataset(X, y)
loader = DataLoader(dataset, batch_size=8, shuffle=True)

for epoch in range(3):
    for batch_x, batch_y in loader:
        batch_x, batch_y = batch_x.to(device), batch_y.to(device)
        optimizer.zero_grad()        # Important: reset gradients per batch
        preds = net(batch_x)
        loss = criterion(preds, batch_y)
        loss.backward()
        optimizer.step()

print("PyTorch training finished.")
```

### Line-by-line explanation
- Lines 12-20: Define TinyNet and move to device (GPU if available).
- Lines 23-26: MSE loss and SGD optimizer initialization.
- Lines 29-33: Create a tiny in-memory dataset, wrap in DataLoader for batching.
- Lines 35-43: Training loop: for each batch, move data to device, zero gradients, forward pass, compute loss, backpropagate, and update weights.
- Line 45: Indicate training finished.

### TensorFlow training loop (GradientTape)
```python
import tensorflow as tf
import numpy as np

# Simple model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(4, activation='relu', input_shape=(2,)),
    tf.keras.layers.Dense(1)
])

loss_fn = tf.keras.losses.MeanSquaredError()
optimizer = tf.keras.optimizers.SGD(learning_rate=0.01)

# Fake data
X = np.random.randn(32, 2).astype(np.float32)
y = np.random.randn(32, 1).astype(np.float32)

dataset = tf.data.Dataset.from_tensor_slices((X, y)).batch(8)

for epoch in range(3):
    for batch_x, batch_y in dataset:
        with tf.GradientTape() as tape:
            preds = model(batch_x)
            loss = loss_fn(batch_y, preds)
        grads = tape.gradient(loss, model.trainable_variables)
        optimizer.apply_gradients(zip(grads, model.trainable_variables))

print("TensorFlow training finished.")
```

### Line-by-line explanation
- Lines 9-13: Build a small Keras-style Sequential model with a hidden layer and output layer.
- Lines 15-17: Define a mean squared error loss and SGD optimizer.
- Lines 20-26: Create a synthetic dataset as a TF Dataset, batched into size 8.
- Lines 28-37: Training loop with GradientTape: compute predictions, compute loss, derive gradients, and apply them.
- Line 39: Indicate training finished.

## 4. Data Loading, Preprocessing, and Evaluation

- Concept: Real models need clean data pipelines, proper batching, and validation to prevent overfitting. These examples show data loading and basic preprocessing in both frameworks.

### PyTorch DataLoader (synthetic data)
```python
import torch
from torch.utils.data import DataLoader, TensorDataset

# Fake data: 100 samples, 3 features
X = torch.randn(100, 3)
y = torch.randn(100, 1)

dataset = TensorDataset(X, y)
loader = DataLoader(dataset, batch_size=16, shuffle=True)

for batch_x, batch_y in loader:
    # Example preprocessing: per-batch normalization
    batch_x = (batch_x - batch_x.mean(dim=0)) / batch_x.std(dim=0).clamp(min=1e-6)
    # Here you'd feed batch_x to a model and compute loss
    pass
```

### Line-by-line explanation
- Lines 6-9: Create a fake dataset of 100 samples with 3 features.
- Lines 11-13: Wrap into TensorDataset and DataLoader for batched, shuffled iteration.
- Lines 15-18: Demonstrate a simple per-batch normalization as a preprocessing step.
- Line 19: Placeholder for integrating into a training loop.

### TensorFlow data pipeline (synthetic data)
```python
import numpy as np
import tensorflow as tf

# Fake data
X = np.random.randn(100, 3).astype(np.float32)
y = np.random.randn(100, 1).astype(np.float32)

dataset = tf.data.Dataset.from_tensor_slices((X, y))
dataset = dataset.shuffle(buffer_size=100).batch(16)

for batch_x, batch_y in dataset:
    # Ensure dtype remains tf.float32
    batch_x = tf.cast(batch_x, tf.float32)
    # Feed into a model: preds = model(batch_x)
    pass
```

### Line-by-line explanation
- Lines 6-12: Create 100 samples, 3 features; pair with targets and build a TF Dataset.
- Line 13-14: Shuffle and batch the dataset for training.
- Lines 16-18: Normalize or cast inputs as needed before feeding to a model. The loop is a placeholder to show data flow into a model.
- Line 19: End of iteration block.

## X. Common Beginner Mistakes

- Mistake 1: Forgetting to reset gradients in PyTorch between batches
  - Bad (PyTorch)
  ```python
  for batch_x, batch_y in loader:
      preds = model(batch_x)
      loss = criterion(preds, batch_y)
      loss.backward()  # gradients accumulate across batches
      optimizer.step()
  ```
  - Good (PyTorch)
  ```python
  for batch_x, batch_y in loader:
      optimizer.zero_grad()       # reset gradients for this batch
      preds = model(batch_x)
      loss = criterion(preds, batch_y)
      loss.backward()
      optimizer.step()
  ```
  - Bad (TF)
  ```python
  for batch_x, batch_y in dataset:
      with tf.GradientTape() as tape:
          preds = model(batch_x)
          loss = loss_fn(batch_y, preds)

      grads = tape.gradient(loss, model.trainable_variables)
      optimizer.apply_gradients(zip(grads, model.trainable_variables))
      # If you reuse the same tape object across iterations, gradients won't be computed correctly.
  ```
  - Good (TF)
  ```python
  for batch_x, batch_y in dataset:
      with tf.GradientTape() as tape:
          preds = model(batch_x)
          loss = loss_fn(batch_y, preds)

      grads = tape.gradient(loss, model.trainable_variables)
      optimizer.apply_gradients(zip(grads, model.trainable_variables))
  ```

- Mistake 2: Mixing NumPy operations with PyTorch tensors (breaks autograd)
  - Bad (PyTorch)
  ```python
  for batch_x, batch_y in loader:
      batch_x_np = batch_x.numpy()           # detaches from graph
      transformed = batch_x_np * 2             # NumPy ops do not track gradients
      preds = model(torch.from_numpy(transformed))
      loss = criterion(preds, batch_y)
      loss.backward()  # will fail or be meaningless
  ```
  - Good (PyTorch)
  ```python
  for batch_x, batch_y in loader:
      transformed = batch_x * 2                   # keep in PyTorch ops
      preds = model(transformed)
      loss = criterion(preds, batch_y)
      loss.backward()
  ```

- Mistake 3: Data leakage and evaluating on training data
  - Bad (Both PyTorch and TF)
  ```python
  # Training and evaluation on same data
  preds = model(X_train)
  train_loss = loss_fn(y_train, preds)

  # This masks actual generalization performance
  ```
  - Good (Split data into train/val)
  ```python
  # Split
  X_train, X_val = X[:80], X[80:]
  y_train, y_val = y[:80], y[80:]

  # Training loop uses X_train/y_train
  # Evaluation uses X_val/y_val
  preds_val = model(X_val)
  val_loss = loss_fn(y_val, preds_val)
  ```

- Additional quick note: Always define a reproducible seed and document random seeds across libraries (NumPy, Python, and framework) to aid debugging and experiment reproducibility.

## Y. Why This Matters In Real Systems

- Production-grade reproducibility: Deterministic results require careful seeding, fixed data splits, and controlled non-deterministic operations (especially on GPUs).
- Scalability and deployment: TensorFlow often shines in production environments due to TensorFlow Serving, TF Lite, and cloud-native deployments; PyTorch supports deployment via TorchScript and ONNX. Understanding both makes it easier to choose the right tool for the job.
- Data pipelines: Real systems load terabytes of data, apply on-the-fly transformations, and feed pipelines into training jobs. TF’s tf.data and PyTorch DataLoader enable efficient, parallelized loading and preprocessing.
- Experiment tracking and model versioning: In practice, teams track experiments (hyperparameters, datasets, metrics) and version models for rollback. Tools like MLflow, Weights & Biases, or built-in platform services support these patterns across frameworks.
- Evaluation and monitoring in production: You monitor inference latency, throughput, and accuracy on live data. Proper validation, test coverage, and monitoring dashboards are essential for maintaining model quality after deployment.

## Z. Study Questions

1) What is the role of autograd in PyTorch, and how does it compare to TensorFlow’s GradientTape mechanism?  
2) How do you implement a two-layer neural network in PyTorch and in TensorFlow?  
3) Why is it important to reset gradients between training batches, and how do you do it in PyTorch and TF?  
4) What are common data pipeline components you would use for large-scale datasets in PyTorch vs. TensorFlow?  
5) How do you save and later load a trained model in both PyTorch and TensorFlow?

## Exercise

Multi-part practical coding challenge

Part A – Create a synthetic dataset
- Generate 500 samples with 3 features: X ∈ R^{500x3}.
- Target y is a linear combination with non-linear noise: y = 2.0*x1 - 1.5*x2 + 0.5*x3 + sin(x1) + noise.
- Split into train (400 samples) and test (100 samples).

Part B – Build a small neural network (PyTorch)
- Implement a feed-forward net with:
  - Input layer: 3 features
  - One hidden layer: 8 neurons, ReLU
  - Output layer: 1 value
- Define MSE loss and SGD optimizer (learning_rate = 0.01).

Part C – Train and evaluate (PyTorch)
- Train for 15 epochs using mini-batches of 32.
- After training, evaluate MAE on the test split.
- Save the model parameters to "exercise_tiny_net.pth".

Part D – Optional TensorFlow counterpart
- Create an equivalent model in TensorFlow (Keras or functional API).
- Train for 15 epochs on the same data.
- Evaluate MAE on the test set.
- Save the model to "exercise_tiny_model".

Part E – Analysis checkpoints
- Plot training loss per epoch (you can print or plot using matplotlib if available).
- Report final test MAE and the model save path.

Code scaffolding (PyTorch) for Part A–D (you can adapt as is):

```python
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# Part A: Data
np.random.seed(0)
X = np.random.randn(500, 3).astype(np.float32)
noise = 0.1 * np.random.randn(500, 1).astype(np.float32)
y = (2.0 * X[:, 0:1] - 1.5 * X[:, 1:2] + 0.5 * X[:, 2:3] + np.sin(X[:, 0:1]) + noise).astype(np.float32)

# Train/test split
X_train, X_test = torch.from_numpy(X[:400]), torch.from_numpy(X[400:])
y_train, y_test = torch.from_numpy(y[:400]), torch.from_numpy(y[400:])

train_ds = TensorDataset(X_train, y_train)
test_ds = TensorDataset(X_test, y_test)

train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)

# Part B: Model (PyTorch)
class ExerciseTinyNet(nn.Module):
    def __init__(self, in_dim=3, hidden=8, out_dim=1):
        super().__init__()
        self.fc1 = nn.Linear(in_dim, hidden)
        self.fc2 = nn.Linear(hidden, out_dim)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        return self.fc2(x)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ExerciseTinyNet().to(device)
criterion = nn.MSELoss()
optimizer = optim.SGD(model.parameters(), lr=0.01)

# Part C: Train
for epoch in range(15):
    for xb, yb in train_loader:
        xb, yb = xb.to(device), yb.to(device)
        optimizer.zero_grad()
        pred = model(xb)
        loss = criterion(pred, yb)
        loss.backward()
        optimizer.step()
# Part D: Evaluate
model.eval()
with torch.no_grad():
    test_pred = model(X_test.to(device))
    test_loss = criterion(test_pred, y_test.to(device))
    mae = (test_pred - y_test.to(device)).abs().mean().item()
print("Test MSE:", test_loss.item(), "Test MAE:", mae)

# Save model
torch.save(model.state_dict(), "exercise_tiny_net.pth")
```

Optional TensorFlow version (Part D–E) can be implemented similarly using tf.keras and a small Sequential model, training with a simple loop or model.fit, and saving via model.save.

This completes a compact, but deeply practical, lesson on Deep Learning with PyTorch and TensorFlow using the Python data stack. It covers core concepts, builds intuition through side-by-side examples, and provides hands-on exercises to solidify understanding and prepare for real-world projects.