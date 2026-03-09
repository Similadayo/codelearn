# MLOps: Deploying Models at Scale in R

In this module, you’ll learn how to deploy machine learning models at scale using R, covering the end-to-end flow from training and packaging a model to serving it via APIs, containerizing for production, and observing health and performance in real systems. MLOps ensures that models are reproducible, scalable, auditable, and observable in production environments, which is essential for teams delivering data-driven software at scale.

## 1. Data Prep, Model Training, and Readiness for Deployment

This section covers selecting a dataset, training a robust baseline model in R, and producing a deterministic artifact suitable for deployment. We’ll use a simple multiclass problem (iris) to demonstrate a reusable training workflow you can adapt to production data.

```r
# 1. Setup and data
library(tidyverse)
library(nnet)      # for multinomial logistic regression (multinom)
set.seed(123)

data(iris)

# 2. Train-test split
idx <- sample(seq_len(nrow(iris)), size = 0.8 * nrow(iris))
train <- iris[idx, ]
test  <- iris[-idx, ]

# 3. Train a robust baseline model
# Multinomial logistic regression (works well on small, well-behaved datasets)
model <- multinom(Species ~ Sepal.Length + Sepal.Width + Petal.Length + Petal.Width, data = train)

# 4. Quick evaluation on the holdout set
pred_test <- predict(model, newdata = test)
accuracy <- mean(pred_test == test$Species)

# 5. Persist the model artifact for deployment
dir.create("models", showWarnings = FALSE)
saveRDS(model, file = "models/iris_multinom_model.rds")

list(accuracy = accuracy)
```

### Line-by-line explanation breaking down each line

- library(tidyverse): Loads the core collection of packages for data manipulation and plotting used in typical data science workflows.
- library(nnet): Loads the neural net package which provides multinom(), enabling multinomial logistic regression for multiclass classification.
- set.seed(123): Ensures reproducible random operations (e.g., train-test split).
- data(iris): Loads the built-in iris dataset.
- idx <- sample(...): Creates a random 80/20 split of the data indices for training and testing.
- train <- iris[idx, ]; test <- iris[-idx, ]: Subsets the iris data into training and test sets.
- model <- multinom(...): Fits a multinomial logistic regression model to predict Species from the four features.
- pred_test <- predict(model, newdata = test): Generates predictions for the test set.
- accuracy <- mean(pred_test == test$Species): Computes the accuracy of the model on the test set.
- saveRDS(model, file = "models/iris_multinom_model.rds"): Serializes the trained model to disk for later loading by a deployment API.
- list(accuracy = accuracy): Returns a quick summary of model performance.

## 2. Packaging the Model for Deployment (Saving, Versioning, and Loading)

This section explains how to store the model artifact to support reproducible deployments and how to load it in a serving environment. We’ll demonstrate a simple, explicit model loading function and a small wrapper around predict to decouple inference logic from the API.

```r
# 1. Define a small inference wrapper
load_model <- function(path = "models/iris_multinom_model.rds") {
  readRDS(path)
}

predict_iris <- function(m, Sepal.Length, Sepal.Width, Petal.Length, Petal.Width) {
  newdata <- data.frame(
    Sepal.Length = as.numeric(Sepal.Length),
    Sepal.Width  = as.numeric(Sepal.Width),
    Petal.Length = as.numeric(Petal.Length),
    Petal.Width  = as.numeric(Petal.Width)
  )
  predict(m, newdata)
}

# 2. Load the model (runtime)
model_runtime <- load_model()

# 3. Example usage (IMPLICITly for local validation)
# sample_input <- list(Sepal.Length = 5.1, Sepal.Width = 3.5, Petal.Length = 1.4, Petal.Width = 0.2)
# predict_iris(model_runtime, sample_input$Sepal.Length, sample_input$Sepal.Width, sample_input$Petal.Length, sample_input$Petal.Width)
```

### Line-by-line explanation breaking down each line

- load_model <- function(...): Defines a function to load the serialized R model from disk, enabling runtime loading in the API.
- readRDS(path): Reads the R object saved earlier by saveRDS.
- predict_iris <- function(m, Sepal.Length, ...): Creates a small, explicit inference function that converts inputs into a data frame compatible with the model’s expected feature columns and calls predict.
- newdata <- data.frame(...): Builds a single-row input data frame with the four numeric features.
- predict(m, newdata): Generates the predicted class for the provided input using the loaded model.
- model_runtime <- load_model(): Demonstrates loading the model in a runtime environment (e.g., a server).
- The commented example shows how to call predict_iris with a sample input for local validation.

## 3. Building a Scalable API (Plumber) for Inference

This section demonstrates turning the model into a production API using Plumber. The API loads the model at startup and exposes a /predict endpoint that accepts input features and returns the predicted species. The design emphasizes statelessness and idempotence for better scale-out behavior.

```r
# plumber.R
library(plumber)
library(jsonlite)
path_model <- "models/iris_multinom_model.rds"

# Load the model once when the API starts
model <- readRDS(path_model)

#* Predict Iris species
#* @param Sepal.Length
#* @param Sepal.Width
#* @param Petal.Length
#* @param Petal.Width
#* @post /predict
predict_iris <- function(Sepal.Length, Sepal.Width, Petal.Length, Petal.Width) {
  newdata <- data.frame(
    Sepal.Length = as.numeric(Sepal.Length),
    Sepal.Width  = as.numeric(Sepal.Width),
    Petal.Length = as.numeric(Petal.Length),
    Petal.Width  = as.numeric(Petal.Width)
  )
  pred <- predict(model, newdata)
  list(prediction = as.character(pred))
}

# Optional: health check endpoint
#* @get /health
health <- function() {
  list(status = "ok")
}
```

### Line-by-line explanation breaking down each line

- library(plumber): Loads the Plumber package used to create REST APIs in R.
- path_model <- "models/iris_multinom_model.rds": Specifies where the serialized model is stored.
- model <- readRDS(path_model): Loads the model into memory at API startup; this makes inference calls fast and stateless across requests.
- #* Predict Iris species: Plumber roxygen-style annotation for the API endpoint.
- @param Sepal.Length, etc.: Documents expected input parameters for API tooling and clients.
- #* @post /predict: Declares a POST endpoint at /predict for inference.
- predict_iris <- function(...): Implements the endpoint logic: builds a single-sample data frame from string inputs, invokes predict on the loaded model, and returns a JSON-friendly list.
- list(prediction = as.character(pred)): Formats the result as a JSON object.
- health endpoint: Simple GET endpoint to verify API health.

Usage reminder (local): Run the API with:
# In R console:
library(plumber)
pr <- plumber::plumb("plumber.R")
pr$run(host = "0.0.0.0", port = 8000)

Test example (curl):
curl -X POST -H "Content-Type: application/json" \
  -d '{"Sepal.Length":5.1,"Sepal.Width":3.5,"Petal.Length":1.4,"Petal.Width":0.2}' \
  http://localhost:8000/predict

## 4. Deploying at Scale: Containerization and Orchestration

This section outlines how to containerize the API and deploy it to a cluster, enabling scalable serving with managed orchestration (e.g., Kubernetes). You’ll see a minimal Dockerfile and Kubernetes deployment/service examples.

```dockerfile
# Dockerfile
FROM r-base:4.2.3

# Install system dependencies required for R packages
RUN apt-get update -y && \
    apt-get install -y libxml2-dev libcurl4-openssl-dev libssl-dev

# Install R packages
RUN R -e "install.packages(c('plumber','nnet'), repos='https://cloud.r-project.org')"

# Copy app
WORKDIR /app
COPY models/iris_multinom_model.rds /app/models/iris_multinom_model.rds
COPY plumber.R /app/plumber.R

# Expose API port
EXPOSE 8000

# Run the API
CMD ["R", "-e", "library(plumber); pr <- plumber::plumb('plumber.R'); pr$run(host='0.0.0.0', port=8000)"]
```

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iris-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: iris-api
  template:
    metadata:
      labels:
        app: iris-api
    spec:
      containers:
      - name: iris-api
        image: myregistry/iris-api:latest
        ports:
        - containerPort: 8000
---
# k8s-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: iris-api
spec:
  selector:
    app: iris-api
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
```

### Line-by-line explanation breaking down each line

Dockerfile:
- FROM r-base:4.2.3: Uses a lightweight official R base image as the runtime.
- apt-get install: Installs system libraries required by common R packages (xml, curl, SSL).
- R -e "install.packages(...)": Installs plumber and nnet inside the container for API serving and multinomial modeling.
- WORKDIR /app; COPY: Sets the working directory and copies the model artifact and API script into the container.
- EXPOSE 8000: Exposes the port used by the API.
- CMD ["R", "-e", "..."]: Launches the Plumber API when the container starts.

Kubernetes YAML:
- Deployment: Defines 3 replicas of a pod running the iris API, providing basic horizontal scale-out.
- Service: Exposes the deployment on a stable cluster IP and, with LoadBalancer, can provision an external endpoint in supported environments.

## 5. Observability, Versioning, and Production Readiness

In production, you need versioning, monitoring, and healthy deployment practices. This section outlines pragmatic patterns you can implement in R-based MLOps pipelines.

- Versioning and registry:
  - Tag model artifacts with semantic versions or timestamps (e.g., models/iris_multinom_model_v1.0.0.rds).
  - Maintain a simple registry (e.g., Git or an artifact store) to track model lineage: code version, data snapshot, and hyperparameters.

- Basic health and metrics:
  - Implement /health endpoint (already shown) to reflect readiness and liveness.
  - Collect basic request counts and error rates (incremented per /predict call).

- Basic logging:
  - Use log4r or futile.logger for structured logs in the API, including input schema, prediction, and latency.

- CI/CD hints (conceptual):
  - When a new model is pushed, run a lightweight validation (unit tests and a small holdout check) in CI.
  - If validation passes, build a new Docker image, push to registry, and trigger a Canary rollout in Kubernetes.

```r
# Minimal, production-oriented snippets (conceptual)
library(futile.logger)

# In plumber.R or the API handler:
loginfo("Prediction request received: inputs=%s", paste(names(as.list(environment())), collapse=", "))

# Simple metrics (conceptual; for real metrics, integrate with Prometheus or Cloud Monitoring)
request_count <- 0L

# In the /predict endpoint (conceptual)
#* @post /predict
predict_iris <- function(...) {
  request_count <<- request_count + 1L
  # ... inference logic ...
  list(prediction = "setosa")
}
```

### Line-by-line explanation breaking down each line

- library(futile.logger): Loads a simple logging package for structured messages.
- loginfo(...): Writes an informational log with dynamic input details.

Note: For real production telemetry, integrate a robust metrics system (Prometheus, OpenTelemetry) and a centralized logging stack (ELK/EFK, Loki) and ensure your API traces requests for debugging and performance analysis.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Not pinning exact library versions
  - Bad:
    library(nnet)
    # model depends on random seeds; not reproducible across environments
  - Good:
    # Use a project environment or packrat/renv to pin dependencies
    # Example: use renv to snapshot packages
    renv::init(bare = TRUE)
    renv::snapshot()

- Pitfall 2: Loading model directly from disk on every request
  - Bad:
    # Inside the API handler, readRDS("models/...rds") on every call
  - Good:
    # Load once at startup (as shown in plumber.R) to keep latency low
    model <- readRDS("models/iris_multinom_model.rds")

- Pitfall 3: No input validation or schema checks
  - Bad:
    newdata <- data.frame(Sepal.Length = as.numeric(Sepal.Length), ...)
    pred <- predict(model, newdata)
  - Good:
    # Validate numeric inputs, handle missing values, and provide meaningful errors
    if (any(is.na(c(Sepal.Length, Sepal.Width, Petal.Length, Petal.Width)))) {
      stop("Missing input features")
    }

- Pitfall 4: Hard-coding environment-specific settings
  - Bad:
    port <- 8000
    system("docker run -p 8000:8000 iris-api:latest")
  - Good:
    port <- Sys.getenv("API_PORT", unset = "8000") %>% as.integer()
    # Use declarative deployment (Docker/Kubernetes) with environment variables and secrets

- Pitfall 5: Ignoring data drift and model monitoring
  - Bad:
    Deploy and assume performance remains constant forever
  - Good:
    Implement periodic drift checks, E2E tests for API endpoints, and a simple SLA dashboard (latency, error rate, accuracy trend over time)

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Reproducibility: MLOps practices ensure that you can reproduce both data processing and model training, enabling audits and compliance in many industries.
- Scalability: Stateless API endpoints and container orchestration enable rapid horizontal scaling to handle peak traffic, ensuring low latency for real-time inference.
- Reliability: Versioned artifacts and health checks reduce deployment risk. Canary or blue-green rollouts can minimize customer impact when updating models.
- Observability: Production-grade metrics, logging, and tracing provide visibility into usage patterns, latency, and drift, enabling proactive maintenance.
- Collaboration and governance: Clear model lineage (data, code, hyperparameters, and artifacts) supports audits, experimentation tracking, and cross-team collaboration.

## Z. Study Questions — 5 Recall Questions

1. What is the purpose of saving a trained model to an RDS file in R, and how does it aid deployment?
2. How does Plumber help you expose a machine learning model as a REST API in R?
3. Why is loading the model once at API startup preferable to loading it on every request?
4. List two ways you can deploy a Plumber-based API at scale in production.
5. What are some essential observability practices you should add to an MLOps deployment?

## Exercise — Practical Multi-part Coding Challenge

Part A: Train a model and create a deterministic artifact
- Task: Use the iris dataset to train a multinomial logistic regression model (or a simple alternative) and save the model to models/iris_multinom_model.rds.
- Deliverable: A complete R script that trains, evaluates, and saves the model.

Part B: Build a Plumber API for inference
- Task: Create plumber.R exposing a POST /predict endpoint that accepts four features (Sepal.Length, Sepal.Width, Petal.Length, Petal.Width) and returns the predicted species.
- Deliverable: A working plumber.R script loaded by startup.

Part C: Containerize the API
- Task: Write a Dockerfile that packages the R API and model artifact, installing necessary R packages and exposing port 8000.
- Deliverable: A Dockerfile ready to build and run.

Part D: Kubernetes deployment (optional in cloud)
- Task: Provide a minimal Kubernetes Deployment and Service YAML to run 3 replicas of the Iris API behind a LoadBalancer.
- Deliverable: k8s-deployment.yaml and k8s-service.yaml (or a single file with both).

Part E: Local testing and validation
- Task: Provide curl commands to validate the API locally and verify the response matches the expected structure.
- Deliverable: A short test plan with sample requests and expected responses.

Note: You can adapt the exercise to your environment (local Docker, cloud Kubernetes, or a simple local Plumber server). The goal is to demonstrate end-to-end MLOps workflow in R: training, packaging, API serving, containerization, deployment, and basic observability.