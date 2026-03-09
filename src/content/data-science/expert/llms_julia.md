# Transformers & Large Language Models in Julia (Phase 5: Generative AI & MLOps)

In this lesson, we explore Transformers and Large Language Models (LLMs) from a practical, Julia-centric perspective. We’ll build a tiny, trainable Transformer using Flux, covering key components such as tokenization, embeddings, multi-head self-attention, and encoder blocks. We’ll also discuss how these models fit into real-world AI systems (scaling, deployment, monitoring) and provide an end-to-end exercise to solidify your understanding.

## 1. Foundations: Tokenization, Embeddings, and Positional Encoding in Julia

Compelling introductory note: Transformers learn from sequences of tokens, but raw text cannot be processed directly by neural nets. A lightweight, reproducible pipeline—tokenization, token embeddings, and positional embeddings—forms the bedrock of most language models. In Julia, we’ll implement a small vocab, a simple tokenizer, learned embeddings, and positional encodings to prepare input for a Transformer.

```julia
using Flux
using Flux: onehotbatch, onecold, crossentropy
using Random

# Lightweight vocabulary and tokenizer
const VOCAB = ["<pad>", "<unk>", "<eos>", "hello", "world", "how", "are", "you", "i", "am", "fine"]
const VOCAB_SIZE = length(VOCAB)
token_to_id = Dict(w => i for (i, w) in enumerate(VOCAB))
id_to_token = Dict(i => w for (w, i) in token_to_id)

# Embedding dimensions
d_model = 64
max_len = 128  # maximum sequence length for positional embeddings

# Embedding layers
token_emb = Flux.Embedding(VOCAB_SIZE, d_model)
pos_emb   = Flux.Embedding(max_len,  d_model)

# Simple whitespace tokenizer with unknown token fallback
function tokenize(text::String)
  words = split(lowercase(text))
  ids = [get(token_to_id, w, token_to_id["<unk>"]) for w in words]
  push!(ids, token_to_id["<eos>"])  # end-of-sequence token
  return ids
end

# Prepare input: embeddings + positional embeddings
function encode_input(ids::Vector{Int})
  # x: d_model x L
  x_emb = token_emb(ids)
  L = length(ids)
  pos_indices = collect(1:L)
  p_emb = pos_emb(pos_indices)  # d_model x L
  return x_emb .+ p_emb
end
```

### Line-by-line explanation
- Import Flux and utilities for neural networks and random data.
- Define a small fixed vocabulary and mapping dictionaries for token->ID and ID->token.
- Choose embedding size (d_model) and a maximum sequence length for positional embeddings.
- Create learnable embedding layers: token embeddings (per token) and positional embeddings (per position in the sequence).
- tokenize(text): converts text to a vector of token IDs, appending an EOS token at the end.
- encode_input(ids): looks up token embeddings, looks up positional embeddings for each position, and sums them to produce a d_model x L input tensor.

#### Quick usage example (toy):
- sentence = "hello how are you"
- ids = tokenize(sentence)
- X = encode_input(ids)  # prepared input: D x L

This forms the input to a transformer block.

---

## 2. Core Mechanism: Multi-Head Self-Attention

We now implement a compact, multi-head self-attention mechanism using Flux. This is the heart of transformers: each token attends to others to gather contextual information. We’ll build a scalable, modular MHA with multiple heads and a final projection.

```julia
# Multi-Head Self-Attention (toy implementation)
struct MultiHeadSelfAttention
  W_Q::Dense
  W_K::Dense
  W_V::Dense
  W_O::Dense
  n_heads::Int
  head_dim::Int
end

function MultiHeadSelfAttention(d_model::Int, n_heads::Int)
  head_dim = div(d_model, n_heads)
  W_Q = Dense(d_model, d_model)
  W_K = Dense(d_model, d_model)
  W_V = Dense(d_model, d_model)
  W_O = Dense(d_model, d_model)
  return MultiHeadSelfAttention(W_Q, W_K, W_V, W_O, n_heads, head_dim)
end

# Forward pass: input x is d_model x L
function (m::MultiHeadSelfAttention)(x::AbstractArray{<:Real,2})
  Q = m.W_Q(x)  # d_model x L
  K = m.W_K(x)
  V = m.W_V(x)
  L = size(x, 2)
  heads_out = []

  for h in 1:m.n_heads
    idx = ((h-1)*m.head_dim + 1):(h*m.head_dim)
    qh = Q[idx, :]   # head_dim x L
    kh = K[idx, :]
    vh = V[idx, :]

    scores = (qh' * kh) / sqrt(size(qh, 1))  # L x L
    attn = Flux.softmax(scores; dims=2)       # L x L
    oh = vh * attn'                           # head_dim x L
    push!(heads_out, oh)
  end

  z = hcat(heads_out...)          # d_model x L
  y = m.W_O(z)                      # d_model x L
  return y
end
```

### Line-by-line explanation
- Define a lightweight MultiHeadSelfAttention struct with linear projections for Q, K, V and an output projection O, plus the number of heads and the per-head dimension.
- Constructor MultiHeadSelfAttention(d_model, n_heads) initializes W_Q, W_K, W_V, W_O as Dense layers with appropriate input/output sizes and computes head_dim as d_model / n_heads.
- Forward pass: compute Q, K, V by projecting x with the corresponding Dense layers (all shapes are d_model x L).
- For each head h:
  - Extract the head’s slice of Q, K, V using row indices corresponding to that head’s contiguous feature chunk.
  - Compute attention scores as Q_h^T K_h scaled by sqrt(head_dim), resulting in an L x L matrix.
  - Apply softmax across rows (dims=2) to produce attention weights.
  - Compute the head’s output by multiplying V_h with the transposed attention (head_dim x L).
  - Collect and concatenate all head outputs along the feature dimension to form d_model x L.
- Apply the final output projection W_O to obtain the output y of shape d_model x L.

Note: This is a compact educational implementation. Real-world models may include masking, dropout, and optimized batched operations.

#### Quick usage example:
- mha = MultiHeadSelfAttention(d_model, 4)
- X is d_model x L (e.g., from encode_input or random data)
- Y = mha(X)

---

## 3. Transformer Encoder Block and Stacking

Next, we assemble an encoder block by combining multi-head self-attention, a feed-forward network, residual connections, and layer normalization. We then stack multiple such blocks to form a tiny Transformer encoder.

```julia
# Transformer Encoder Block (MHA + FFN with residuals and layer norms)
struct TransformerEncoderBlock
  mha::MultiHeadSelfAttention
  ff::Chain
  ln1::LayerNorm
  ln2::LayerNorm
end

function TransformerEncoderBlock(d_model::Int, n_heads::Int; ff_hidden::Int = 4*d_model)
  mha = MultiHeadSelfAttention(d_model, n_heads)
  ff = Chain(Dense(d_model, ff_hidden, relu), Dense(ff_hidden, d_model))
  ln1 = LayerNorm(d_model)
  ln2 = LayerNorm(d_model)
  return TransformerEncoderBlock(mha, ff, ln1, ln2)
end

function (b::TransformerEncoderBlock)(x::AbstractArray{<:Real,2})
  # Self-attention with residual
  y = x .+ b.mha(x)
  y = b.ln1(y)

  # Feed-forward with residual
  z = b.ff(y)
  z = y .+ z
  z = b.ln2(z)
  return z
end

# Simple Transformer encoder consisting of N stacked blocks
struct SimpleTransformer
  blocks::Vector{TransformerEncoderBlock}
end

function SimpleTransformer(d_model::Int, n_heads::Int, n_layers::Int)
  blocks = [TransformerEncoderBlock(d_model, n_heads) for _ in 1:n_layers]
  return SimpleTransformer(blocks)
end

function (m::SimpleTransformer)(x::AbstractArray{<:Real,2})
  for b in m.blocks
    x = b(x)
  end
  return x
end
```

### Line-by-line explanation
- TransformerEncoderBlock groups together an MHA, a feed-forward (FFN), and two LayerNorm layers with residual connections.
- The block’s forward pass:
  - self-attention with residual: y = x + MHA(x); then apply layer normalization ln1.
  - feed-forward path with residual: z = FFN(y); add residual: z = y + z; then apply layer normalization ln2.
- SimpleTransformer constructor builds N stacked TransformerEncoderBlock instances.
- Forward pass applies each block sequentially to the input, returning the final representation.

#### Quick usage example:
- Build a small 2-layer Transformer: transformer = SimpleTransformer(d_model, n_heads=4, n_layers=2)
- X = encode_input(ids)  # d_model x L
- Z = transformer(X)       # d_model x L

---

## 4. Building a Tiny Language Model (Toy) in Flux

Now we’ll compose the components into a tiny language model: a stack of Transformer encoder blocks with a language modeling head to predict the next token at each position. We’ll also set up a small toy dataset, a loss function, and a basic training loop.

```julia
# Language model head: project to vocabulary logits
lm_head = Dense(d_model, VOCAB_SIZE)

# Build a tiny Transformer encoder (2 layers, 4 heads)
d_model = 64
n_heads = 4
n_layers = 2
transformer = SimpleTransformer(d_model, n_heads, n_layers)

# Simple dataset of short sentences (toy)
sentences = [
  "hello world",
  "how are you",
  "i am fine",
  "hello i am fine",
  "you are hello"
]

# Helper to convert sentences to input/output pairs
function sentence_to_ids(s::String)
  ids = tokenize(s)
  return ids
end

# Build dataset: (input_ids, target_ids)
dataset = []
for s in sentences
  ids = sentence_to_ids(s)
  push!(dataset, ids)
end

# Loss function for autoregressive next-token prediction
function loss_fn(ids::Vector{Int})
  X = encode_input(ids)                 # d_model x L
  h = transformer(X)                       # d_model x L
  logits = lm_head(h)                      # VOCAB_SIZE x L
  targets = vcat(ids[2:end], token_to_id["<eos>"])  # shift by 1, append EOS for alignment
  # Align logits with targets: drop the first position
  logits = logits[:, 1:(size(logits, 2)-1)]
  Y = onehotbatch(targets[1:(end-1)], 1:VOCAB_SIZE)  # VOCAB_SIZE x (L-1)
  return Flux.crossentropy(logits, Y)
end

# Training setup
ps = Flux.params(transformer, lm_head)
opt = ADAM(0.001)

# Simple training loop (toy)
for epoch in 1:20
  total = 0.0
  for ids in dataset
    gs = gradient(() -> loss_fn(ids), ps)
    Flux.Optimise.update!(opt, ps, gs)
    total += loss_fn(ids)
  end
  println("epoch=$epoch  loss=$(round(total, digits=4))")
end
```

### Line-by-line explanation
- lm_head: a linear head mapping transformer outputs (d_model) to vocabulary logits (VOCAB_SIZE).
- transformer: a SimpleTransformer with 2 encoder layers and 4 attention heads.
- sentences: a small, toy corpus to illustrate training.
- sentence_to_ids: converts a sentence into a sequence of token IDs via the tokenizer defined earlier.
- dataset: a collection of ID sequences corresponding to the sentences.
- loss_fn(ids): forward pass the input sequence through the embedding+positional encoding, transformer, and LM head; compute cross-entropy between predicted logits and the next-token targets (teacher-forcing). We align logits and targets by shifting.
- Training loop: standard ADAM optimizer updates; print epoch loss.

Notes:
- This is a toy setup designed for education, not production-level data or scale.
- For a real system, you would use larger vocabularies, longer sequences, robust tokenization (byte-pair encoding or SentencePiece), proper masking for autoregressive generation, and batched data pipelines.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Not masking attention for autoregressive language modeling
- Bad
```julia
scores = (qh' * kh) / sqrt(head_dim)
attn = Flux.softmax(scores; dims=2)
```
- Good
```julia
# In autoregressive setup, apply a causal mask so tokens cannot attend to future positions
function causal_mask(L::Int)
  m = trues(L, L)
  for i in 1:L
    for j in i+1:L
      m[i, j] = false
    end
  end
  return m
end

scores = (qh' * kh) / sqrt(head_dim)
mask = causal_mask(L)
scores[.!mask] .= -Inf  # mask out future positions
attn = Flux.softmax(scores; dims=2)
```

Pitfall 2: Mixing dimensions incorrectly in attention outputs
- Bad
```julia
oh = vh * attn
```
- Good
```julia
oh = vh * attn'
```
Explanation: shapes must align to produce head_dim x L per head before concatenation.

Pitfall 3: Not applying residuals consistently
- Bad
```julia
y = b.mha(x)
y = b.ln1(y)
z = b.ff(y)
return z
```
- Good
```julia
# Proper residuals and denormalization sequence
y = x .+ b.mha(x)
y = b.ln1(y)
z = b.ff(y)
z = y .+ z
z = b.ln2(z)
return z
```

Pitfall 4: Failing to move data/devices consistently (CPU vs GPU)
- Bad
```julia
# on CPU-only
X = encode_input(ids)
```
- Good
```julia
# Optional: move to GPU if available (requires CUDA.jl)
# using CUDA
# X = cu(encode_input(ids))  # if CUDA is available
```

Pitfall 5: Misalignment of sequence length between logits and targets
- Bad
```julia
logits = lm_head(h)  # V x L
loss = crossentropy(logits, targets)  # shapes mismatch
```
- Good
```julia
logits = lm_head(h)              # V x L
targets = ids[2:end]               # length L-1
logits = logits[:, 1:(end-1)]     # align to targets
Y = onehotbatch(targets, 1:VOCAB_SIZE)
loss = crossentropy(logits, Y)
```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility and experimentation: Transformers require careful control of seeds, deterministic behavior, and versioned datasets. In Julia, expose data pipelines and model definitions with explicit seed settings and parameter configs.

- Scale and hardware: Real LLMs demand GPUs or TPUs and efficient batching. Even in a toy Julia model, consider using CUDA.jl to move tensors to GPU and adjust memory usage. For larger systems, you’ll need mixed-precision, gradient checkpointing, and data parallelism.

- Training vs inference: Training requires large compute and data pipelines; inference demands latency guarantees and batching strategies. In production, you’d deploy a trained Transformer via a service (REST/gRPC), implement batching for throughput, and optimize memory (e.g., attention pruning, quantization).

- Model packaging and deployment: Save and load model state (parameters) reliably (e.g., JLD2, BSON, or MLJ’s Serialization). Version your models and their preprocessing steps. For Julia, you can package a model into a module or an executable with PackageCompiler for reproducible environments.

- Monitoring and safety: Track runtime latency, memory usage, and input distributions. For generative models, monitor for bias, toxicity, and hallucinations, and implement guardrails or filtering as needed.

- Security and compliance: Ensure data handling complies with privacy and data governance policies. Use secure inference endpoints, audit logging, and access controls.

In short: understanding Transformers conceptually is essential, but plugging them into real systems requires attention to data pipelines, hardware, deployment, monitoring, and governance.

---

## Z. Study Questions — 5 recall questions

1) What is the primary purpose of positional embeddings in a Transformer?
2) How does multi-head self-attention enable the model to capture different features across a sequence?
3) Why are residual connections and layer normalization important in Transformer encoder blocks?
4) What is the role of the LM head in a language model built on top of a Transformer encoder?
5) Name two production considerations when deploying a Transformer-based model in a real system.

---

## Exercise — practical multi-part coding challenge

Part A: Implement a small Transformer encoder block and stacking
- Task: Build a 2-layer Transformer encoder with 4 attention heads using Flux in Julia (re-use the structures from Sections 2 and 3).
- Deliverable: A function create_tiny_transformer(d_model, n_heads, n_layers) that returns a SimpleTransformer with the specified parameters.

Part B: Prepare a tiny dataset and train a toy next-token predictor
- Task: Create a mini-dipeline with your encoder blocks and a language-head to predict the next token. Use a small fixed vocabulary and 3–6 short sentences.
- Deliverable: A train loop that minimizes cross-entropy for next-token prediction on the toy dataset.

Part C: Inference demonstration
- Task: Given a new seed sentence, show the model produces the next-token predictions for the next 5 steps (greedy search over the marginal logits).
- Deliverable: A short script printing the predicted token IDs and corresponding tokens.

Part D: Reflection questions
- Explain how masking would be added to the attention mechanism for a proper autoregressive language model.
- Compare the memory footprint of a 2-layer encoder vs a 6-layer encoder with the same hidden size; discuss implications for deployment.

Implementation hints:
- Reuse and adapt the code blocks from Sections 2–4.
- Keep the vocabulary small for this exercise to keep training times short.
- Ensure tokenization, encoding, and the LM head align in dimensions.

If you’d like, I can provide a ready-to-run notebook with all parts wired together and comments to guide you through the implementation step-by-step.