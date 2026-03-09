# Transformers & Large Language Models with Python Data Stack

Transformers and large language models (LLMs) are reshaping how we approach natural language understanding, generation, and reasoning in data-driven applications. In this module, you’ll learn the core concepts of transformers, practical usage of pre-trained LLMs with the Python data stack, and essential MLOps considerations for deploying, monitoring, and evolving these models in real-world systems. By the end, you’ll be able to build, experiment with, and deploy generation pipelines that are production-aware, scalable, and maintainable.

## 1. Foundations: Transformers, Self-Attention, and Build Blocks

Transformers replace traditional recurrent architectures with self-attention to capture long-range dependencies in text. This section introduces the core idea with a tiny, self-contained Python illustration of scaled dot-product attention, the building block of transformers.

```python
import numpy as np

def softmax(x):
    # Numerically stable softmax along the last axis
    e = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V):
    """
    Simple single-head attention:
    Q: (n_queries, d_k)
    K: (n_keys, d_k)
    V: (n_keys, d_v)
    Returns: (n_queries, d_v)
    """
    d_k = Q.shape[-1]
    # Scores shape: (n_queries, n_keys)
    scores = Q @ K.T / np.sqrt(d_k)
    weights = softmax(scores)  # (n_queries, n_keys)
    # Weighted sum: (n_queries, d_v)
    return weights @ V

# Tiny toy example to demonstrate shapes and outputs
np.random.seed(0)
Q = np.random.randn(2, 4)   # 2 queries, 4-dim
K = np.random.randn(3, 4)   # 3 keys, 4-dim
V = np.random.randn(3, 5)   # 3 values, 5-dim

out = attention(Q, K, V)
print("Output shape:", out.shape)
print(out)
```

### Line-by-line explanation
- import numpy as np: Load NumPy for matrix operations.
- def softmax(x): ...: Define a numerically stable softmax to convert logits into attention weights.
- def attention(Q, K, V): ...: Implement a basic single-head attention that computes attention weights and applies them to V.
- d_k = Q.shape[-1]: Get the dimensionality of the query/key vectors.
- scores = Q @ K.T / np.sqrt(d_k): Compute scaled dot-product attention scores between Q and K.
- weights = softmax(scores): Normalize scores into attention weights.
- return weights @ V: Apply attention weights to V to produce the attended representation.
- np.random.seed(0) and the random arrays: Create tiny, deterministic inputs to illustrate shapes and results.
- out = attention(Q, K, V) and prints: Show the resulting (n_queries, d_v) output and its shape.

## 2. Using Pre-trained LLMs with the Python Data Stack

Pre-trained models from HuggingFace transform the complexity of training into accessible API calls. This section demonstrates loading a small GPT-2 model and generating text from a prompt, suitable for experimentation and lightweight demos.

```python
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

model_name = "gpt2"  # small model suitable for CPU; swap to "gpt2-medium" or larger if resources permit

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# Create a generation pipeline (simplifies usage)
generator = pipeline("text-generation", model=model, tokenizer=tokenizer, device=-1)  # -1 for CPU

prompt = "In data science, a common task is"
result = generator(prompt, max_length=60, temperature=0.7)

print(result[0]["generated_text"])
```

### Line-by-line explanation
- from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline: Import the tokenizer, model, and a convenient generation pipeline.
- model_name = "gpt2": Choose a lightweight pre-trained model to keep compute reasonable.
- tokenizer = AutoTokenizer.from_pretrained(model_name): Load the tokenizer for the given model.
- model = AutoModelForCausalLM.from_pretrained(model_name): Load the pre-trained causal LM (GPT-style) model.
- generator = pipeline("text-generation", ..., device=-1): Create a text-generation pipeline; device=-1 runs on CPU.
- prompt = "...": Define the prompt to seed generation.
- result = generator(prompt, max_length=60, temperature=0.7): Generate text with constraints: total tokens up to 60 and sampling temperature.
- print(result[0]["generated_text"]): Output the generated text sample.

Notes:
- If you have a GPU and the appropriate drivers, set device=0 to accelerate generation.
- For production-grade usage, consider alternatives such as HF Inference Endpoints, quantized models, and batching.

## 3. Prompting, Fine-Tuning, and Pipelines

Two practical strategies for getting strong results from LLMs are prompt engineering (prompting) and lightweight fine-tuning/prompt-tuning. This section shows building a reusable prompt template and a simple prompt-tuning-like wrapper that makes prompts composable.

```python
def build_prompt(instruction, input_text=None, output_format=None):
    parts = []
    parts.append(f"Instruction: {instruction}")
    if input_text:
        parts.append(f"Input: {input_text}")
    parts.append("Response:")
    if output_format:
        parts.append(f"Format: {output_format}")
    return "\n".join(parts)

# Example usage
instruction = "Translate the following English text to French."
input_text = "Hello, how are you today?"
prompt = build_prompt(instruction, input_text, output_format="plain text")

print("Prompt:\n", prompt)

# Generate using the pipeline from the previous section (reusing tokenizer/model)
from transformers import pipeline
generator = pipeline("text-generation", model=model_name, device=-1)

generated = generator(prompt, max_length=100, temperature=0.6)
print("Generated:\n", generated[0]["generated_text"])
```

### Line-by-line explanation
- def build_prompt(...): Define a helper to assemble a clear, repeatable prompt, enabling consistent prompts across prompts and tasks.
- parts = [] and parts.append(...): Build the prompt as a sequence of labeled sections.
- if input_text: Conditional inclusion of the task-specific input.
- return "\n".join(parts): Assemble the final prompt string with line breaks for readability.
- instruction / input_text / output_format usage: Document the intent and expected structure to guide the model.
- generated = generator(...): Use the transformer generation pipeline to produce a completion from the composed prompt.
- print statements: Show the constructed prompt and the resulting text.

Tips:
- Keep prompts concise but explicit about the desired format and constraints.
- For multiple tasks, reuse a common prompt skeleton and substitute task-specific fields.

## 4. Lightweight Deployment and MLOps Essentials

Deploying LLMs in production involves managing latency, concurrency, reliability, security, and observability. The following example shows a minimal FastAPI app to host a text-generation endpoint, with a simple API key check and safe defaults. This is intentionally lightweight for learning; evolve this with proper authentication, rate limiting, caching, and containerization in real projects.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

# Initialize model and tokenizer (load once)
model_name = "gpt2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
model.eval()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

class GenRequest(BaseModel):
    text: str
    max_length: int = 60
    temperature: float = 0.7
    api_key: str = ""

API_KEY = "secret-demo-key"  # In production, fetch from a secure source

app = FastAPI()

def generate_text(prompt: str, max_length: int, temperature: float) -> str:
    with torch.no_grad():
        inputs = tokenizer.encode(prompt, return_tensors="pt").to(device)
        outputs = model.generate(
            inputs,
            max_length=max_length,
            temperature=temperature,
            do_sample=True,
            top_p=0.95,
            num_return_sequences=1
        )
        return tokenizer.decode(outputs[0], skip_special_tokens=True)

@app.post("/generate")
def generate(req: GenRequest):
    if req.api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    prompt = req.text
    text = generate_text(prompt, req.max_length, req.temperature)
    return {"generated_text": text}
```

### Line-by-line explanation
- from fastapi import FastAPI, HTTPException and from pydantic import BaseModel: Import web framework and data validation tools.
- import torch and transformers: Bring in ML runtime and model utilities.
- model_name = "gpt2" and tokenizer/model initialization: Load model artifacts once at startup to avoid reloading on every request.
- model.to(device): Move the model to the available device (GPU if present).
- class GenRequest(BaseModel): Define the request schema with text, max_length, temperature, and api_key for simple access control.
- API_KEY = "...": Simple, embedded key for demonstration; replace with a secure vault in real deployments.
- app = FastAPI(): Create the FastAPI app.
- def generate_text(...): Helper to perform a single-pass generation with safe decoding and sampling settings.
- @app.post("/generate"): Endpoint definition; uses API key check, calls generate_text, and returns the result.
- raise HTTPException(401): Unauthorized error path when credentials are invalid.

Notes:
- For production, add authentication, rate limiting, authentication headers, logging, metrics, and error handling.
- Consider async endpoints and streaming responses for large outputs.
- Use containerization (Docker) and orchestration (Kubernetes) for scaling and reliability.

## 5. Evaluation, Monitoring, and Guardrails

Producing high-quality, reliable LLM-based systems requires lightweight evaluation and operational guardrails. This section covers simple monitoring hooks, latency measurements, and guardrails to reduce unsafe outputs and budget usage.

```python
import time
import psutil
import torch

def measure_inference_latency(model_fn, prompts, max_length=60):
    latencies = []
    mem_usages = []
    for p in prompts:
        start = time.time()
        with torch.no_grad():
            _ = model_fn(p, max_length=max_length)
        latencies.append(time.time() - start)
        mem_usages.append(psutil.Process().memory_info().rss / (1024 * 1024))  # MB
    return {
        "avg_latency_sec": sum(latencies) / len(latencies),
        "max_latency_sec": max(latencies),
        "avg_memory_mb": sum(mem_usages) / len(mem_usages)
    }

# Example tiny wrapper for a local model (assumes function has the same interface as `generate_text` above)
def model_fn(prompt, max_length=60, temperature=0.7):
    return generate_text(prompt, max_length, temperature)

prompts = [
    "Explain the difference between supervised and unsupervised learning.",
    "Summarize the latest trends in NLP.",
    "Translate: Hello world to Spanish."
]

bench = measure_inference_latency(model_fn, prompts, max_length=60)
print(bench)
```

### Line-by-line explanation
- import time, psutil, torch: For timing, memory measurement, and PyTorch integration.
- def measure_inference_latency(model_fn, prompts, max_length=60): Define a function to benchmark latency and memory.
- Start time measurement around a model call to collect per-prompt latency.
- memory_info().rss: Capture resident memory usage (RAM) during inference.
- Return dictionary with average/max latency and average memory usage.
- def model_fn(...): A placeholder adapter that would call your actual inference function.
- prompts and bench: Run a small bench across a set of prompts and print the results.

Notes:
- For production, integrate with APM tools (e.g., OpenTelemetry, Prometheus) and add dashboards for latency, throughput, error rates.
- Guardrails: Use content filters, safety classifiers, and moderation pipelines to reduce harmful or biased outputs.
- Governance: Track model versions, prompt templates, and data lineage to support reproducibility and audits.

## X. Common Beginner Mistakes

1) Not configuring the device properly (CPU vs GPU) and memory management
- Bad:
```python
# loads to CPU and ignores available GPU
model = AutoModelForCausalLM.from_pretrained("gpt2")
```
- Good:
```python
import torch
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = AutoModelForCausalLM.from_pretrained("gpt2").to(device)
tokenizer = AutoTokenizer.from_pretrained("gpt2")
```

2) Allowing unbounded generation (memory/time blow-up)
- Bad:
```python
outputs = model.generate(input_ids, max_length=10000)
```
- Good:
```python
max_len = min(512, tokenizer.model_max_length)
outputs = model.generate(input_ids, max_length=max_len, do_sample=True, temperature=0.7)
```

3) Tokenization mismatches or not truncating long inputs
- Bad:
```python
inputs = tokenizer.encode(long_text)  # may exceed model's max_length
```
- Good:
```python
max_len = tokenizer.model_max_length
inputs = tokenizer.encode(long_text, return_tensors="pt", max_length=max_len, truncation=True)
```

4) Exposing a model endpoint without basic access control
- Bad:
```python
@app.post("/generate")
def generate(req):
    return {"text": model.generate(...)}
```
- Good:
```python
API_KEY = "secret-demo-key"

@app.post("/generate")
def generate(req: GenRequest):
    if req.api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    # proceed with generation
```

5) Ignoring observability and failure handling in production
- Bad:
```python
def generate(req):
    return model.generate(...)  # no retries, no logging
```
- Good:
```python
import logging
logger = logging.getLogger(__name__)
try:
    text = model.generate(...)
except Exception as e:
    logger.exception("Generation failed: %s", e)
    raise HTTPException(status_code=500, detail="Generation error")
```

## Y. Why This Matters In Real Systems

- Performance and latency: LLMs are compute-intensive. Production services require low-latency generation (often tens to hundreds of milliseconds per request for user-facing apps) and scalable throughput via batching and asynchronous serving.
- Reliability and observability: Production systems must provide health checks, monitoring dashboards, and alerts. You should track error rates, average latency, memory usage, and request volume per model/version.
- Safety, governance, and compliance: Language models can hallucinate or produce unsafe content. Implement content filtering, guardrails, audit logs, and data governance (data provenance and privacy).
- MLOps lifecycle: Versioning of models, prompts, and datasets; reproducible training/inference pipelines; continuous integration/continuous deployment (CI/CD) with rollback strategies; dependency management and environment reproducibility.
- Operational costs: Inference costs can be high; you should consider model quantization, distillation, or using hosted inference endpoints to balance latency, accuracy, and budget.
- Real-world wrappings: Production apps combine LLMs with structured retrieval (RAG), post-processing, and business logic to ensure factual accuracy and applicability to tasks.

## Z. Study Questions

1) What is the purpose of self-attention in transformers, and how does it differ from traditional RNNs?
2) How do you load a small GPT-2 model with the HuggingFace transformers library and perform a simple text generation?
3) What is a prompt template, and how can it help standardize interactions with an LLM?
4) Name two common MLOps concerns when deploying LLMs to production.
5) What factors influence the quality and safety of generated outputs, and what guardrails can you implement?

## Exercise

Part A — Basic generation function
- Create a Python function generate_text_basic(model_name, prompt, max_length=60, temperature=0.7) that loads a pre-trained causal LM and returns generated text.
- Ensure device handling (GPU if available, else CPU) and minimal error handling.
- Provide a minimal test call and print the generated text.

Code:
```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

def generate_text_basic(model_name, prompt, max_length=60, temperature=0.7):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name).to(device)
    model.eval()
    with torch.no_grad():
        input_ids = tokenizer.encode(prompt, return_tensors="pt").to(device)
        outputs = model.generate(
            input_ids,
            max_length=max_length,
            temperature=temperature,
            do_sample=True
        )
        return tokenizer.decode(outputs[0], skip_special_tokens=True)

# Test
if __name__ == "__main__":
    print(generate_text_basic("gpt2", "Data science progress often starts with", max_length=60, temperature=0.7))
```

Line-by-line explanation
- Import torch and transformer components.
- Define generate_text_basic to set device, load tokenizer/model, and prepare evaluation mode.
- Move inputs to device, call generate with sampling, and decode the output to text.

Part B — Prompt templating and batch generation
- Build a small prompt template and generate multiple prompts in a batch loop.
- Demonstrate batching limitations and asynchronous considerations (conceptual, not a full async server).

Code:
```python
def build_prompt_template(instruction, inputs=None):
    base = f"Instruction: {instruction}\n"
    if inputs:
        base += "Inputs:\n" + "\n".join(f"- {x}" for x in inputs) + "\n"
    base += "Response:"
    return base

def batch_generate(model_name, prompts, max_length=60, temperature=0.7):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name).to(device)
    model.eval()

    results = []
    for p in prompts:
        input_ids = tokenizer.encode(p, return_tensors="pt").to(device)
        with torch.no_grad():
            out = model.generate(input_ids, max_length=max_length, temperature=temperature, do_sample=True)
        results.append(tokenizer.decode(out[0], skip_special_tokens=True))
    return results

if __name__ == "__main__":
    template = build_prompt_template("Summarize the following:", ["Data pipelines are central to modern analytics.", "Model monitoring is crucial for reliability."])
    prompts = [template + " 1) Importance of data quality", template + " 2) Benefits of monitoring"]
    summaries = batch_generate("gpt2", prompts)
    for s in summaries:
        print(s)
```

Line-by-line explanation
- build_prompt_template: Create a reusable prompt skeleton for consistent prompts.
- batch_generate: Load model once, loop through prompts, generate text for each, decode results.
- The main block demonstrates how to assemble prompts and generate a batch of outputs.

Part C — Lightweight FastAPI wrapper (conceptual)
- Create a minimal FastAPI app endpoint to expose generation with an API key guard (as in Section 4) but in a simplified form for quick experimentation.

Code:
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI()
MODEL_NAME = "gpt2"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME).to("cpu")
model.eval()

class GenReq(BaseModel):
    prompt: str
    max_length: int = 60
    temperature: float = 0.7
    api_key: str = ""

API_KEY = "demo-key"

@app.post("/generate")
def generate(req: GenReq):
    if req.api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    with torch.no_grad():
        inputs = tokenizer.encode(req.prompt, return_tensors="pt")
        outputs = model.generate(inputs, max_length=req.max_length, temperature=req.temperature)
        text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"generated_text": text}
```

Line-by-line explanation
- FastAPI setup and data model: Define request shape with prompt and generation controls.
- API_KEY check: Simple guard for demonstration.
- Inference: Tokenize, run generate, and decode to text.
- Return: Encapsulate the result in a JSON response.

Note:
- For a real service, you’d add robust authentication, rate limiting, asynchronous handling, streaming responses, and containerization for deployment.

End of lesson.