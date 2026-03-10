# Docker Deep Dive

In Phase 2 of DevOps & Cloud Engineering, Docker is a foundational building block for containerized workloads, consistent environments, and scalable CI/CD pipelines in AWS-based systems. This lesson dives deep into Docker concepts, best practices, and real-world workflows you can apply to build, test, and deploy applications on AWS with ECS, Fargate, ECR, and CodeBuild/CodePipeline.

## 1. Docker Fundamentals

The essence of Docker is packaging an application and its dependencies into a portable image that runs as a container. Images are immutable blueprints; containers are runnable, isolated instances. Understanding this at scale enables reproducible environments, faster deployments, and safer rollouts in AWS-centered pipelines.

```Dockerfile
# Dockerfile: Minimal static site served by Nginx
FROM nginx:alpine
LABEL maintainer="devops@example.com"
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
```

### Line-by-line explanation

- FROM nginx:alpine
  - Uses a lightweight Nginx image as the base layer for serving static content.
- LABEL maintainer="devops@example.com"
  - Adds metadata about who maintains this image.
- COPY index.html /usr/share/nginx/html/index.html
  - Copies a static HTML file into the default Nginx content directory.
- EXPOSE 80
  - Documents that the container will listen on port 80; it does not publish the port by itself.

```bash
# index.html (static content for the container)
<!doctype html>
<html>
  <head><title>AWS Docker Demo</title></head>
  <body><h1>Hello from Docker on AWS!</h1></body>
</html>
```

### Line-by-line explanation

- The HTML provides a simple page to verify the container serves content.
- No executable logic is required here; the purpose is to demonstrate image packaging and runtime serving.

```bash
# Build and run locally (example)
docker build -t aws-static-demo:latest .
docker run -d -p 8080:80 aws-static-demo:latest
```

### Line-by-line explanation

- docker build -t aws-static-demo:latest .
  - Builds an image named aws-static-demo with tag latest from the Dockerfile in the current directory.
- docker run -d -p 8080:80 aws-static-demo:latest
  - Runs a container in detached mode, mapping host port 8080 to container port 80 so you can access the site at http://localhost:8080.

## 2. Dockerfile Best Practices & Multi-stage Builds

Multi-stage builds help generate lean production images by compiling artifacts in one stage and shipping only what’s needed to run in the final image. This reduces image size, attack surface, and deployment time in AWS environments.

```Dockerfile
# Build stage
FROM node:16-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

### Line-by-line explanation

- FROM node:16-alpine AS build
  - Starts a build stage using a Node.js base; the stage is named "build" for reference.
- WORKDIR /app
  - Sets the working directory inside the container.
- COPY package.json package-lock.json ./
  - Copies package manifests to install dependencies.
- RUN npm ci
  - Installs dependencies deterministically using package-lock.json.
- COPY . .
  - Copies the rest of the application code into the build stage.
- RUN npm run build
  - Executes the build script to produce a production-ready bundle.

- FROM nginx:alpine
  - Starts the final runtime stage with a lean Nginx image.
- COPY --from=build /app/build /usr/share/nginx/html
  - Copies the built artifacts from the build stage into Nginx’s content directory.
- EXPOSE 80
  - Indicates port 80 is the runtime port.

## 3. Docker Compose for Local Development

Docker Compose allows you to orchestrate multiple containers (web app, database, caches, etc.) for local development and testing. This accelerates feedback loops before pushing changes to AWS.

```yaml
version: "3.8"
services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - db
  db:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: example
```

### Line-by-line explanation

- version: "3.8"
  - Specifies the Compose file format version.
- services:
  - Begins the service definitions.
- web:
  - Defines the web application service.
- build: .
  - Builds the image from the current directory’s Dockerfile.
- ports: ["8080:80"]
  - Exposes the container’s port 80 on the host’s port 8080.
- depends_on: [db]
  - Ensures the web service starts after the db service.
- db:
  - Defines a PostgreSQL database service.
- image: postgres:13
  - Uses a specific Postgres image for consistency.
- environment: POSTGRES_PASSWORD: example
  - Sets environment variables for the database.

## 4. Docker & AWS - Pushing to ECR

AWS Elastic Container Registry (ECR) stores Docker images securely and is tightly integrated with ECS, Fargate, and CodePipeline. The typical flow is build locally or in CI, tag for ECR, and push to a repository.

```bash
# Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Create repository (if not exists)
aws ecr create-repository --repository-name aws-static-site --region us-east-1

# Tag and push
docker tag aws-static-demo:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/aws-static-site:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/aws-static-site:latest
```

### Line-by-line explanation

- aws ecr get-login-password ...
  - Retrieves an authentication token for Docker to access your ECR registry and pipes it to docker login.
- docker login --username AWS --password-stdin <registry>
  - Authenticates Docker to the specified AWS ECR registry.
- aws ecr create-repository --repository-name aws-static-site
  - Creates an ECR repository if it doesn’t already exist.
- docker tag aws-static-demo:latest <account>.dkr.ecr.region.amazonaws.com/aws-static-site:latest
  - Tags the local image with the ECR repository URI.
- docker push <account>.dkr.ecr.region.amazonaws.com/aws-static-site:latest
  - Pushes the tagged image to ECR for use by ECS/Fargate or CodePipeline.

## 5. CI/CD with AWS CodeBuild & CodePipeline

Automating your build, test, and deployment pipeline ensures consistent releases and reduces manual steps. A typical approach is to have CodeBuild build the Docker image, push it to ECR, and produce an imagedefinitions.json for ECS deployment via CodePipeline.

```yaml
# buildspec.yml (CodeBuild)
version: 0.2
phases:
  install:
    runtime-versions:
      docker: 18
  pre_build:
    commands:
      - ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
      - REGION=$(aws configure get region)
      - REPOSITORY_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/aws-static-site
  build:
    commands:
      - docker build -t aws-static-site:latest .
      - docker tag aws-static-site:latest ${REPOSITORY_URI}:latest
  post_build:
    commands:
      - docker push ${REPOSITORY_URI}:latest
      - printf '[{"name":"aws-static-site","imageUri":"%s"}]' ${REPOSITORY_URI}:latest > imagedefinitions.json
artifacts:
  files:
    - imagedefinitions.json
```

### Line-by-line explanation

- version: 0.2
  - Buildspec version for CodeBuild.
- phases.install
  - Stage to set up environments/tools; in this case docker is required.
- pre_build
  - Determines dynamic values: AWS account, region, and repository URI.
- build
  - Builds the Docker image and tags it with the ECR path.
- post_build
  - Pushes the image to ECR and generates imagedefinitions.json for ECS deployment via CodePipeline.
- artifacts.files
  - Declares the artifact (imagedefinitions.json) to pass to CodePipeline for ECS deployment.

## 6. Deploying to ECS Fargate

With the image in ECR, you can deploy to ECS Fargate by creating a task definition and updating the service. This enables serverless-like container orchestration with AWS-managed infrastructure.

```json
{
  "family": "aws-static-site",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aws-static-site:latest",
      "essential": true,
      "portMappings": [
        { "containerPort": 80, "hostPort": 80 }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aws-static-site",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
```

```bash
# Register the task definition and update an ECS service
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs update-service --cluster my-cluster --service my-service --task-definition aws-static-site
```

### Line-by-line explanation

- Task definition fields (family, networkMode, requiresCompatibilities, cpu, memory)
  - Define the ECS task family, networking mode, and resource requirements for Fargate.
- containerDefinitions
  - Describes how the container should run: image, ports, environment, and logging.
- image
  - Points to the ECR image URI produced earlier.
- portMappings
  - Exposes container port 80 to the host (the task endpoints).
- logConfiguration
  - Uses CloudWatch Logs for centralized observability.
- aws ecs register-task-definition
  - Registers the task definition with ECS so it can be used by a service.
- aws ecs update-service
  - Updates the running ECS service to use the new task definition revision.

## 7. X. Common Beginner Mistakes

| Bad | Good |
| --- | --- |
| Bad: Not using a .dockerignore, causing local copies (node_modules, dist) to be sent into the image. | Good: Include .dockerignore to prune build context | 
| ```Dockerfile
FROM node:16
WORKDIR /app
COPY . .
RUN npm install --production
``` | 
| ```Dockerfile
# .dockerignore
node_modules
dist
build
.env
.git
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .
``` |
| Bad: Running as root with broad permissions or exposing unsafe defaults. | Good: Run as non-root when possible and use least privilege |
| ```Dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html
``` | 
| ```Dockerfile
FROM nginx:alpine
USER nginx
COPY index.html /usr/share/nginx/html
HEALTHCHECK --interval=30s CMD curl -f http://localhost/ || exit 1
``` |
| Bad: Using FROM node:latest which can introduce breaking changes. | Good: Pin to a specific, tested version. |
| ```Dockerfile
FROM node:latest
``` | 
| ```Dockerfile
FROM node:16.18.0-alpine
``` |
| Bad: Not using multi-stage builds, resulting in large images. | Good: Use multi-stage builds to minimize final image size. |
| ```Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
``` | 
| ```Dockerfile
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
``` |

## Y. Why This Matters In Real Systems

- Consistency across environments: Docker enables identical runtime environments from development to production, reducing “it works on my machine” incidents.
- Faster, safer deployments: Smaller, multi-stage images reduce network transfer time and surface area for vulnerabilities in production.
- AWS integration: Docker images become first-class citizens in ECR, ECS, and CodePipeline, enabling scalable CI/CD workflows with minimal operational overhead.
- Observability and security: Standardized logging (awslogs) and image provenance improve traceability, compliance, and incident response.
- Cost and scalability: Containerized workloads on ECS Fargate automatically scale per demand, aligning costs with actual resource consumption without managing servers.

## Z. Study Questions

1) What is the difference between a Docker image and a Docker container?  
2) How does a multi-stage Dockerfile improve production images, and how is it used in AWS deployments?  
3) What is the purpose of a .dockerignore file, and how does it affect build context?  
4) How do you push a Docker image to AWS ECR and reference it from ECS?  
5) What role does a CodeBuild buildspec.yml play in a CI/CD pipeline for AWS deployments?

## Exercise

Part A – Build, tag, and push a Docker image to AWS ECR
- Create a simple Dockerfile (e.g., using the multi-stage pattern from Section 2) for a small web app.
- Build the image locally, tag it for ECR, and push it to an ECR repository you own.
- Verify the image is in the ECR console and note the image URI.

Part B – Local development and verification
- Create a docker-compose.yml that spins up your web service and a Redis instance for caching or session storage.
- Run docker-compose up and verify the app is accessible at http://localhost:8080.

Part C – ECS Fargate deployment (high-level steps)
- Write a task definition JSON referencing the image stored in ECR (as in Section 6).
- Register the task definition, create/update an ECS service, and ensure the service runs tasks on Fargate.
- Confirm you can access the service endpoint (via a load balancer or public IP, depending on your setup).

Part D – Basic CI/CD integration (conceptual)
- Create a CodeBuild project (or equivalent) to build your Docker image, push to ECR, and emit imagedefinitions.json for CodePipeline to deploy to ECS.
- Outline the stages, environment, and artifacts you’d configure in the codebuild spec and pipeline.