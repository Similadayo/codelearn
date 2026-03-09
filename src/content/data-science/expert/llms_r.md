# Track: Data Science & AI — Phase 5: Generative AI & MLOps — Transformers & Large Language Models (R)

Compelling introductory paragraph:
Transformers have transformed how we approach language, code, and multimodal data by leveraging self-attention to model long-range dependencies in sequences. Large Language Models (LLMs) built on these architectures empower applications from chat assistants to code generation and scientific reasoning. In R, you can bridge the Python-based Transformers ecosystem with reticulate, enabling end-to-end exploration, prototyping, and basic deployment flows within data science workflows. This lesson blends theory with hands-on R code to help you build intuition and practical capability for working with Transformers and LLMs in real systems.

## 1. Fundamentals of Transformers

- What you’ll learn: the core ideas behind the Transformer architecture (attention, multi-head, positional encoding), how it enables scalable sequence modeling, and how these concepts map to practical NLP tasks.
- Why it matters professionally: understanding the building blocks helps you debug models, reason about latency and memory, and design better prompts and pipelines for production.

```r
# A small, toy demonstration of the attention-like concept in R using reticulate
library(reticulate)

# Import Python's transformers library
transformers <- import("transformers")

# Choose a tiny, interpretable example model (GPT-2 small)
model_name <- "gpt2"
tokenizer <- transformers$AutoTokenizer$from_pretrained(model_name)
model <- transformers$AutoModelForCausalLM$from_pretrained(model_name)

# Simple prompt
prompt <- "In data science, transformers are powerful because"

# Tokenize and prepare input for PyTorch
input_ids <- tokenizer$encode(prompt, return_tensors = "pt")

# Generate a short continuation
output_ids <- model$generate(input_ids, max_length = 50)

# Decode the generated tokens into text
generated_text <- tokenizer$decode(output_ids[1], skip_special_tokens = TRUE)
generated_text
```

### Line-by-line explanation
- library(reticulate): Load the package that enables Python/R interoperability.
- transformers <- import("transformers"): Import the Python transformers module for model/tokenizer access.
- model_name <- "gpt2": Select a small, widely-used GPT-2 variant.
- tokenizer <- transformers$AutoTokenizer$from_pretrained(model_name): Instantiate a tokenizer for the chosen model.
- model <- transformers$AutoModelForCausalLM$from_pretrained(model_name): Load the corresponding causal LM model.
- prompt <- "In data science, transformers are powerful because": Define a short prompt to drive generation.
- input_ids <- tokenizer$encode(prompt, return_tensors = "pt"): Tokenize the prompt into tensors suitable for PyTorch.
- output_ids <- model$generate(input_ids, max_length = 50): Generate a continuation up to 50 tokens beyond the prompt.
- generated_text <- tokenizer$decode(output_ids[1], skip_special_tokens = TRUE): Decode the generated token IDs back into human-readable text.
- generated_text: The final generated string displayed to the user.

## 2. Large Language Models Overview

- Core idea: LLMs extend transformers by scaling data, parameters, and compute to produce coherent long-form text, do reasoning, and follow instructions.
- Common families: GPT-style causal models (e.g., GPT-2, GPT-3 variants), encoder-decoder models (e.g., T5, BART), and instruction-tuned variants (e.g., InstructGPT-style).
- Practical considerations: prompt design, context length, decoding strategies (greedy, sampling, nucleus/top-p, top-k), and safety guardrails.

```r
library(reticulate)

transformers <- import("transformers")

# Compare two sample models (causal LM vs. seq-to-seq)
causal_model_name <- "gpt2"
seq2seq_model_name <- "t5-small"

causal_tokenizer <- transformers$AutoTokenizer$from_pretrained(causal_model_name)
causal_model <- transformers$AutoModelForCausalLM$from_pretrained(causal_model_name)

seq2seq_tokenizer <- transformers$AutoTokenizer$from_pretrained(seq2seq_model_name)
seq2seq_model <- transformers$AutoModelForSeq2SeqLM$from_pretrained(seq2seq_model_name)

prompt <- "Explain the impact of transformers on modern NLP."

# Tokenize and generate with causal LM
causal_input <- causal_tokenizer$encode(prompt, return_tensors = "pt")
causal_output <- causal_model$generate(causal_input, max_length = 60)
causal_text <- causal_tokenizer$decode(causal_output[1], skip_special_tokens = TRUE)

# Tokenize for seq2seq (needed for tasks like summarization)
seq2seq_input <- seq2seq_tokenizer$encode(prompt, return_tensors = "pt")
seq2seq_output <- seq2seq_model$generate(seq2seq_input, max_length = 60)
seq2seq_text <- seq2seq_tokenizer$decode(seq2seq_output[1], skip_special_tokens = TRUE)

list(causal = causal_text, seq2seq = seq2seq_text)
```

### Line-by-line explanation
- library(reticulate): Load interoperability to Python.
- transformers <- import("transformers"): Import the library with model/tokenizer access.
- causal_model_name <- "gpt2" / seq2seq_model_name <- "t5-small": Define two model families to compare.
- causal_tokenizer <- transformers$AutoTokenizer$from_pretrained(causal_model_name): Get the causal LM tokenizer.
- causal_model <- transformers$AutoModelForCausalLM$from_pretrained(causal_model_name): Get the causal LM model.
- seq2seq_tokenizer <- transformers$AutoTokenizer$from_pretrained(seq2seq_model_name): Get the seq2seq tokenizer.
- seq2seq_model <- transformers$AutoModelForSeq2SeqLM$from_pretrained(seq2seq_model_name): Get the seq2seq model.
- prompt <- "Explain the impact of transformers on modern NLP.": Define the task prompt.
- causal_input <- causal_tokenizer$encode(prompt, return_tensors = "pt"): Tokenize for the causal LM.
- causal_output <- causal_model$generate(causal_input, max_length = 60): Generate response.
- causal_text <- causal_tokenizer$decode(causal_output[1], skip_special_tokens = TRUE): Decode to text.
- seq2seq_input <- seq2seq_tokenizer$encode(prompt, return_tensors = "pt"): Tokenize for seq2seq.
- seq2seq_output <- seq2seq_model$generate(seq2seq_input, max_length = 60): Generate sequence.
- seq2seq_text <- seq2seq_tokenizer$decode(seq2seq_output[1], skip_special_tokens = TRUE): Decode to text.
- list(...): Return both outputs for comparison.

## 3. Setting up in R with reticulate (Python Interop)

- What you’ll learn: how to prepare a Python environment from R, install required packages, and verify access to GPUs if available.
- Why this matters: reproducibility and portability of ML workflows across teams.

```r
library(reticulate)

# Create or select a dedicated environment for transformers
# This will install in a named environment accessible to R
py_install(
  packages = c("transformers", "torch"),
  envname = "transformers-env",
  method = "auto"
)

# Point R to the chosen Python environment
use_virtualenv("transformers-env", required = TRUE)

# Import libraries in the chosen environment
transformers <- import("transformers")
```

### Line-by-line explanation
- library(reticulate): Load the interoperability package.
- py_install(..., envname = "transformers-env", method = "auto"): Install Python packages into a dedicated environment to isolate dependencies.
- use_virtualenv("transformers-env", required = TRUE): Switch R's Python integration to the newly created virtualenv.
- transformers <- import("transformers"): Import the Transformers library from the chosen Python environment.

```r
# Optional: probe for CUDA capability to guide device selection in subsequent calls
torch <- import("torch")
cuda_available <- torch$cuda$is_available()

device <- if (cuda_available) "cuda" else "cpu"
device
```

### Line-by-line explanation
- torch <- import("torch"): Import PyTorch to inspect device availability.
- cuda_available <- torch$cuda$is_available(): Check if CUDA GPUs are accessible.
- device <- if (cuda_available) "cuda" else "cpu": Decide computation device for subsequent calls.

## 4. Using a Pretrained Transformer for Text Generation in R

- What you’ll learn: a practical, end-to-end example of loading a pretrained model and generating text from a prompt in R.
- Why this matters: fast prototyping, experiment with prompts, and integrating generation into data pipelines.

```r
library(reticulate)

# Load tokenizer and model (causal LM)
model_name <- "gpt2"
tokenizer <- transformers$AutoTokenizer$from_pretrained(model_name)
model <- transformers$AutoModelForCausalLM$from_pretrained(model_name)

# Put model on the selected device (CPU in this example for compatibility)
# If you have a GPU setup with CUDA, you can move the model to 'cuda'
device <- "cpu"
model$to(device)

# Define a prompt and generate text
prompt <- "As a data scientist, my favorite data visualization technique is"
input_ids <- tokenizer$encode(prompt, return_tensors = "pt")

# Generation parameters (adjust to balance quality and speed)
generated_ids <- model$generate(
  input_ids,
  max_length = 60,
  do_sample = TRUE,
  top_p = 0.92,
  top_k = 50,
  temperature = 0.8
)

generated_text <- tokenizer$decode(generated_ids[1], skip_special_tokens = TRUE)
generated_text
```

### Line-by-line explanation
- model_name <- "gpt2": Choose a GPT-2 small model for demonstration.
- tokenizer <- transformers$AutoTokenizer$from_pretrained(model_name): Load the corresponding tokenizer.
- model <- transformers$AutoModelForCausalLM$from_pretrained(model_name): Load the model weights.
- device <- "cpu": Select CPU for broad compatibility; switch to "cuda" if available and desired.
- model$to(device): Move the model to the chosen device.
- prompt <- "...": Define the prompt guiding generation.
- input_ids <- tokenizer$encode(prompt, return_tensors = "pt"): Tokenize the prompt into input IDs.
- generated_ids <- model$generate(...): Generate a continuation with control of sampling and diversity.
- generated_text <- tokenizer$decode(generated_ids[1], skip_special_tokens = TRUE): Decode the tokens to readable text.
- generated_text: The final generated text printed to the console.

## 5. Fine-tuning and Instruction Tuning Concepts in R

- What you’ll learn: the high-level flow of fine-tuning a pretrained LM on domain data and how instruction tuning shifts model behavior.
- Why this matters: domain adaptation, improved alignment with user intents, and better performance in specialized tasks.

```r
library(reticulate)

transformers <- import("transformers")

# Load a pretrained model and tokenizer suitable for fine-tuning
model_name <- "gpt2-medium"
tokenizer <- transformers$AutoTokenizer$from_pretrained(model_name)
model <- transformers$AutoModelForCausalLM$from_pretrained(model_name)

# Placeholder for a small, synthetic "dataset" of prompts and targets
prompts <- c("Explain the concept of gradient descent in simple terms.",
             "Describe how attention works in one paragraph.")
targets <- c("Gradient descent is an optimization algorithm that adjusts model parameters to minimize a loss function by moving along the negative gradient...",
             "Attention assigns weights to different positions in the input sequence to focus on the most relevant information for generating each token.")

# In practice, you would tokenize and create a training dataset using the 'datasets' library
# For illustration, show how you would prepare inputs (without full training loop)

tokenize_pair <- function(p, t) {
  input <- tokenizer$encode(p, return_tensors = "pt")
  target <- tokenizer$encode(t, return_tensors = "pt")
  list(input = input, target = target)
}
pairs <- mapply(tokenize_pair, prompts, targets, SIMPLIFY = FALSE)

# Typically you'd convert to a HuggingFace Dataset and feed into a Trainer
# This is a schematic place-holder to illustrate intent
```

### Line-by-line explanation
- prompts / targets: Simple paired examples illustrating the kind of data used for supervised fine-tuning.
- tokenize_pair: A helper that tokenizes a prompt and its target response into tensors suitable for training.
- The code shows the structure of a fine-tuning pipeline (tokenization, dataset building, training loop) but omits the heavy, environment-specific details of a full Trainer setup for brevity. In production, you would use a Trainer or a custom PyTorch training loop, along with a dataset class, training arguments, gradient accumulation, and checkpointing.

## 6. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### 6.1. Not handling the device consistently (CPU vs GPU)
Bad:
```r
library(reticulate)
tokenizer <- transformers$AutoTokenizer$from_pretrained("gpt2")
model <- transformers$AutoModelForCausalLM$from_pretrained("gpt2")

input_ids <- tokenizer$encode("Hello world", return_tensors = "pt")
out <- model$generate(input_ids, max_length = 50)
text <- tokenizer$decode(out[1], skip_special_tokens = TRUE)
text
```
Good:
```r
library(reticulate)
device <- if (reticulate::import("torch")$cuda$is_available()) "cuda" else "cpu"

tokenizer <- transformers$AutoTokenizer$from_pretrained("gpt2")
model <- transformers$AutoModelForCausalLM$from_pretrained("gpt2")
model$to(device)

input_ids <- tokenizer$encode("Hello world", return_tensors = "pt")$to(device)
out <- model$generate(input_ids, max_length = 50)
text <- tokenizer$decode(out[1], skip_special_tokens = TRUE)
text
```

### 6.2. Ignoring max_length and context length
Bad:
```r
generated_ids <- model$generate(input_ids, max_length = 1000)
```
Good:
```r
# Respect the model's context window
max_len <- 60
generated_ids <- model$generate(input_ids, max_length = max_len, do_sample = TRUE, top_p = 0.92)
```

### 6.3. Not cleaning or handling tokens properly
Bad:
```r
generated_text <- tokenizer$decode(generated_ids[1])
generated_text
```
Good:
```r
generated_text <- tokenizer$decode(generated_ids[1], skip_special_tokens = TRUE)
generated_text
```

### 6.4. Overlooking safety and bias controls
Bad:
```r
prompt <- "Write a harmful instruction..."
# Directly generate
generated_ids <- model$generate(tokenizer$encode(prompt, return_tensors = "pt"), max_length = 100)
```
Good:
```r
prompt <- "Describe a safe, constructive approach to solving problem X."
# Use a filter or safety layer (pseudo-logic shown; integrate with your workflow)
generated_ids <- model$generate(tokenizer$encode(prompt, return_tensors = "pt"), max_length = 100)
text <- tokenizer$decode(generated_ids[1], skip_special_tokens = TRUE)
# Apply basic safety guardrails
text_safe <- ifelse(grepl("harmful|illegal", tolower(text)), "Content suppressed for safety.", text)
text_safe
```

## 7. Why This Matters In Real Systems

- Production constraints: latency, throughput, and cost at scale when serving LLMs.
- Reliability: deterministic behavior in inference, robust error handling, and versioned models.
- Observability: monitoring prompts, toxicity checks, usage patterns, and auditing prompts for bias.
- Compliance and safety: guardrails, content filtering, and data privacy considerations.
- MLOps integration: model packaging, CI/CD for model updates, feature stores for prompts and embeddings, and reproducible environments.

Real systems typically:

- Use parallelized inference pipelines (batching, asynchronous requests).
- Route tasks to appropriate models (e.g., smaller models for short completions, larger models for complex tasks).
- Apply prompt templates and retrieval augmented generation (RAG) to improve accuracy and reduce cost.
- Maintain strict access controls and audit trails for prompts and outputs.
- Instrument metrics (latency, token usage, error rates, safety flags) and log model versioning.

## 8. Study Questions

1) What is the core idea behind self-attention in Transformers, and why does it enable modeling long-range dependencies in sequences?
2) How do decoding strategies like top-p and top-k influence the quality and diversity of generated text?
3) In a production setting, what are three key factors to consider when choosing between a smaller model and a larger, more capable model?
4) How can you use reticulate to switch between CPU and GPU execution for inference in R?
5) What are common safety considerations when deploying LLMs, and what are some basic guardrails you can implement?

## 9. Exercise — Practical multi-part coding challenge

Part A: Set up and generate with GPT-2
- Objective: Load a pretrained GPT-2 model and generate a 50- to 100-token continuation for a given prompt using R and reticulate.
- Steps:
  1. Install and configure a Python environment with transformers.
  2. Load the GPT-2 tokenizer and model.
  3. Generate a 60-token continuation for the prompt: "In data science, transformers enable".
  4. Decode and print the continuation.
- Deliverable: A small R script that prints the generated text.

Part B: Compare two decoding strategies
- Objective: Compare greedy vs nucleus sampling (top-p) for the same prompt.
- Steps:
  1. Generate two outputs using max_length = 60 with do_sample = FALSE (greedy) and do_sample = TRUE, top_p = 0.92 (nucleus).
  2. Print both results side-by-side.
- Deliverable: A pair of generated continuations and a short comparison note.

Part C: Lightweight safety guard
- Objective: Implement a simple post-generation check to suppress outputs containing disallowed terms (e.g., violence or hate speech).
- Steps:
  1. Generate text as in Part A.
  2. If the output contains any term from a small disallowed list, replace with a safety notice.
- Deliverable: The final safe text string.

Part D: Minimal pipeline illustration
- Objective: Build a tiny, end-to-end function generate_text(prompt) that encapsulates model loading, generation, and decoding. Include a note about reusing the loaded model in multiple calls to avoid reloading overhead.
- Deliverable: A reusable R function and a demonstration call.

Hints and tips
- Start by ensuring your Python environment contains transformers and torch. Use reticulate's py_install and use_virtualenv to isolate dependencies.
- For reproducibility, fix a random seed where you can (note that some Python libraries may not propagate seeds perfectly across Rust/Python bridges; document behavior).
- When moving to production, consider using quantized or distilled models for lower latency, and explore retrieval-augmented generation (RAG) for factual accuracy.

End of lesson.