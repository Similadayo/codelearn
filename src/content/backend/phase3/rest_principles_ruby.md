# REST Architecture — Designing Good APIs in Ruby

In backend engineering, a well-designed REST API is the contract between your service and its clients. It defines clear, predictable endpoints, leverages standard HTTP semantics, and remains scalable, evolvable, and easy to test. This lesson focuses on practical Ruby patterns for designing good APIs: modeling resources, constructing clean URIs, honoring statelessness, using the right HTTP methods and status codes, handling errors gracefully, and introducing versioning and security considerations. We’ll provide Ruby/Rails-centric examples, with a portable Sinatra-based exercise to illustrate core ideas in a lightweight setting.

## 1. Resource Modeling and URI Design

A good REST API models real-world resources as nouns, uses pluralized resource names, and organizes related data under logical hierarchies. URIs should be predictable, stable, and avoid action-oriented verbs.

Code: Rails routes and a sample nested resource setup, plus a RESTful controller scaffold.

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users do
        resources :articles, only: [:index, :show, :create]
      end
    end
  end
end
```

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      def index
        users = User.all
        render json: users, status: :ok
      end

      def show
        user = User.find(params[:id])
        render json: user, status: :ok
      end

      def create
        user = User.new(user_params)
        if user.save
          render json: user, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        user = User.find(params[:id])
        if user.update(user_params)
          render json: user, status: :ok
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        user = User.find(params[:id])
        user.destroy
        head :no_content
      end

      private

      def user_params
        params.require(:user).permit(:name, :email)
      end
    end
  end
end
```

```ruby
# app/controllers/api/v1/articles_controller.rb
module Api
  module V1
    class ArticlesController < ApplicationController
      before_action :set_user

      def index
        articles = @user.articles
        render json: articles, status: :ok
      end

      def show
        article = @user.articles.find(params[:id])
        render json: article, status: :ok
      end

      def create
        article = @user.articles.new(article_params)
        if article.save
          render json: article, status: :created
        else
          render json: { errors: article.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        article = @user.articles.find(params[:id])
        if article.update(article_params)
          render json: article, status: :ok
        else
          render json: { errors: article.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        article = @user.articles.find(params[:id])
        article.destroy
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:user_id])
      end

      def article_params
        params.require(:article).permit(:title, :body)
      end
    end
  end
end
```

### Line-by-line explanation breaking down each line

- Routes file:
  - The outer namespace blocks organize the API by version, e.g., /api/v1.
  - resources :users creates standard REST actions for users (index, show, create, update, destroy).
  - Nested resources :articles under users models the relationship that a user has many articles and provides routes like /api/v1/users/:user_id/articles.

- UsersController:
  - index: fetches all users and returns 200 OK with JSON.
  - show: fetches a single user by id and returns 200 OK.
  - create: builds a new user from strong params; returns 201 Created on success, 422 with error messages on validation failure.
  - update: updates an existing user; returns 200 OK on success, 422 on validation failure.
  - destroy: deletes a user; returns 204 No Content to indicate success without a response body.
  - user_params: uses strong parameters to permit only name and email from the request payload.

- ArticlesController:
  - set_user: loads the parent user from the URL to scope the nested articles.
  - index/show/create/update/destroy: standard REST actions scoped to @user. Each action returns appropriate status codes and payloads.
  - article_params: whitelists title and body for article creation/update.

## 2. Statelessness, HTTP Methods, and Idempotence

REST APIs should be stateless, relying on a client-provided token or credentials for authorization and not storing session data on the server between requests. Use the correct HTTP methods for each operation and ensure idempotence where appropriate.

Code: Rails API-style controller methods illustrating POST for create, PATCH for partial updates, PUT for upserts (conceptual), GET for reads, and DELETE for removals. Also a note about statelessness with a token-based example.

```ruby
# app/controllers/api/v1/articles_controller.rb (excerpt)
module Api
  module V1
    class ArticlesController < ApplicationController
      before_action :authenticate_token!, only: [:create, :update, :destroy]

      def create
        article = Article.new(article_params)
        if article.save
          render json: article, status: :created
        else
          render json: { errors: article.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        article = Article.find(params[:id])
        if article.update(article_params)
          render json: article, status: :ok
        else
          render json: { errors: article.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        article = Article.find(params[:id])
        article.destroy
        head :no_content
      end

      private

      def authenticate_token!
        # Very lightweight example: expect Authorization: Bearer <token>
        token = request.headers['Authorization']&.split(' ')&.last
        unless token && token == 'secret-api-token'
          render json: { error: 'Unauthorized' }, status: :unauthorized
        end
      end

      def article_params
        params.require(:article).permit(:title, :body)
      end
    end
  end
end
```

### Line-by-line explanation breaking down each line

- authenticate_token!: Defines a before_action that runs for create, update, and destroy to enforce a simple token check, illustrating stateless auth without sessions.
- token extraction: Reads the Authorization header and extracts the token portion after "Bearer".
- authorization check: If the token is missing or invalid, returns 401 Unauthorized with a JSON error payload.
- create/update/destroy: Respect HTTP semantics—POST for create (201), PATCH/PUT for update (200), DELETE for removal (204/ No Content implied by head :no_content).
- article_params: Uses strong parameters to whitelist fields, maintaining security and idempotence for updates.

Tips:
- Prefer tokens (e.g., JWT) with a short TTL and do not rely on server-side sessions for API-only apps.
- Keep write operations guarded by authentication/authorization logic.

## 3. Error Handling and Status Codes

A robust API communicates failures clearly with appropriate HTTP status codes and structured error bodies. Avoid leaking internal details; provide actionable messages and, when possible, error codes and field-level hints.

Code: Centralized error handling in ApplicationController and examples of per-action error responses.

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity

  private

  def render_not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def render_unprocessable_entity(exception)
    render json: {
      error: exception.message,
      details: exception.record.errors.full_messages
    }, status: :unprocessable_entity
  end
end
```

```ruby
# In a controller action
def show
  article = Article.find(params[:id])
  render json: article, status: :ok
rescue ActiveRecord::RecordNotFound => e
  render json: { error: e.message }, status: :not_found
end
```

### Line-by-line explanation breaking down each line

- rescue_from ActiveRecord::RecordNotFound: Catches not-found errors thrown by ActiveRecord across controllers, returning a 404 with a concise message.
- rescue_from ActiveRecord::RecordInvalid: Catches validation failures from model saves/updates, returning a 422 with the error messages.
- render_not_found: Renders a simple JSON error payload containing an error string.
- render_unprocessable_entity: Renders a JSON object with a general error and an array of detailed validation messages.
- show action example: Demonstrates a standard read path; if the record is missing, the rescue_from would pivot to a 404.

Best practices:
- Use a consistent error payload shape, e.g., { error: "...", details: [...] }.
- Return 404 when a resource is not found, 400 for bad requests, 422 for validation issues, and 500 for unexpected server errors (log and monitor).

## 4. Pagination, Filtering, and Sorting

When listing resources, you should support pagination to avoid returning huge payloads, and provide optional filtering/sorting for client flexibility. Implement safe defaults and guard against SQL injection by whitelisting sort fields.

Code: A Rails-style index action with pagination, filtering, and sorting.

```ruby
# app/controllers/api/v1/articles_controller.rb (index action)
module Api
  module V1
    class ArticlesController < ApplicationController
      def index
        articles = Article.all

        # Simple filtering
        articles = articles.where(author_id: params[:author_id]) if params[:author_id].present?

        # Safe sorting: whitelist columns
        allowed_sorts = %w[title created_at published_at]
        sort = allowed_sorts.include?(params[:sort]) ? params[:sort] : 'created_at'
        order = %w[asc desc].include?(params[:order]) ? params[:order] : 'desc'

        articles = articles.order("#{sort} #{order}")

        # Pagination
        limit = (params[:limit] || 20).to_i
        offset = (params[:offset] || 0).to_i
        total = articles.count

        render json: { total: total, data: articles.limit(limit).offset(offset) }, status: :ok
      end
    end
  end
end
```

### Line-by-line explanation breaking down each line

- articles = Article.all: Start with all articles as the base query.
- where(author_id: ...): Apply an optional filter if the caller supplied author_id.
- allowed_sorts and sort/order: Whitelist the sortable columns to prevent SQL injection and set default sorting.
- articles.order("#{sort} #{order}"): Apply the sort order to the query.
- limit/offset: Implement pagination with sensible defaults (e.g., 20 items per page).
- total: Compute total number of results before pagination to inform clients about total pages.
- render json: { total, data }: Return both the total count and the current page of results.

Tips:
- For large datasets, consider cursor-based pagination to avoid gaps and race conditions.
- Expose pagination metadata (total, limit, offset) to client code for a robust UX.

## 5. Versioning and Compatibility

Versioning stabilizes your API surface while you evolve features. Common approaches include URL path versioning, header-based versioning, or content-type versioning. URL-based versioning is the most explicit and widely adopted in Rails apps.

Code: Versioned API routes and controllers, plus a note on organizing code.

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users
      resources :articles
    end
  end
end
```

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ApplicationController
      # Common version-specific logic can go here (e.g., API-wide params)
    end
  end
end
```

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < BaseController
      # In a real app, you might route to v2 with separate controllers when breaking changes occur
    end
  end
end
```

### Line-by-line explanation breaking down each line

- Namespacing under Api::V1: Clearly scopes all endpoints to version 1, enabling parallel versions (v2, v3) in the same codebase.
- BaseController: A shared superclass for versioned controllers to hold common concerns (authentication, error handling, etc.), avoiding duplication.
- Versioned routes and controllers: When you need to introduce breaking changes, you can add Api::V2 with new controllers and gradually migrate clients.

Versioning strategy tips:
- Prefer explicit URL versioning (e.g., /api/v1/resource) for clarity and easier client routing.
- Maintain backward compatibility by adding new fields in responses instead of removing old ones.
- Document version lifecycle and deprecation plans for consumers.

## 6. Security and Authentication (brief)

APIs should be protected from abuse and unauthorized access. Use token-based authentication, enforce least privilege, and consider rate limiting and auditing. CSRF protection is typically not needed for stateless APIs unless you rely on cookies for authentication.

Code: Lightweight JWT-style authentication example and a note on production readiness.

```ruby
# app/controllers/application_controller.rb (JWT-like example)
class ApplicationController < ActionController::API
  before_action :authenticate

  private

  def authenticate
    header = request.headers['Authorization']
    token = header.to_s.split(' ').last
    if token == 'secret-api-token'
      # In a real app, decode and verify a JWT here
      @current_user = User.first
    else
      render json: { error: 'Unauthorized' }, status: :unauthorized
    end
  end
end
```

Production notes:
- Use a proper JWT library to encode/decode tokens and validate expiration, issuer, and audience.
- Implement role-based access control (RBAC) to restrict actions by user role.
- Add rate limiting (e.g., Rack::Attack) to protect against abuse.
- Log and monitor API usage with structured logs and metrics to detect anomalies and latency issues.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Over-fetching or under-fetching data
- Bad:
```ruby
# GET /api/v1/users returns every association by default (N+1 risk)
users = User.includes(:articles).all
render json: users.to_json(include: :articles)
```
- Good:
```ruby
# Limit fields and avoid over-fetching; use serializer to control output
users = User.select(:id, :name, :email)
render json: users, each_serializer: UserSerializer
```

2) Not using proper HTTP methods or misusing them
- Bad:
```ruby
# GET used for update (non-idempotent and semantically wrong)
def update
  User.find(params[:id]).update!(params[:user])
  render json: { ok: true }
end
```
- Good:
```ruby
# PATCH for partial updates; PUT for full replacements (use PATCH for partial)
def update
  user = User.find(params[:id])
  if user.update(user_params)
    render json: user, status: :ok
  else
    render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
  end
end
```

3) Returning non-standard or inconsistent error payloads
- Bad:
```ruby
render json: 'Something went wrong', status: 500
```
- Good:
```ruby
render json: { error: 'Internal Server Error', code: 'ERR_500' }, status: :internal_server_error
```

4) Missing validation and poor error handling
- Bad:
```ruby
def create
  User.create!(params[:user])
  render json: { created: true }
end
```
- Good:
```ruby
def create
  user = User.new(user_params)
  if user.save
    render json: user, status: :created
  else
    render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
  end
end
```

## Y. Why This Matters In Real Systems — production context and real usage

- Consistency accelerates client development: A stable contract reduces integration bugs and custom client logic.
- Correct semantics improve interoperability: Clients rely on standard HTTP methods and status codes for automation, retries, and caching.
- Observability and monitoring: Structured error payloads and request metrics enable rapid debugging and service health monitoring.
- Pagination, filtering, and versioning: Handling large datasets, evolving features, and maintaining backward compatibility are essential in production APIs.
- Security and compliance: Proper authentication, authorization, input validation, and auditing prevent data leakage and abuse.

Production patterns you’ll encounter:
- Serializer layers (e.g., ActiveModelSerializers, fast_jsonapi) to maintain stable response shapes and hide internal models.
- Rate limiting and quotas to protect services from abuse.
- API gateways or middleware for cross-cutting concerns (authentication, logging, caching).
- Caching strategies (ETag, Last-Modified, Cache-Control) to reduce load and latency.
- Version migration plans: provide a deprecation window and clear upgrade paths for clients.

## Z. Study Questions — 5 recall questions

1) What is the difference between idempotent and non-idempotent HTTP methods, and which methods are idempotent by definition?  
2) How would you design URIs for nested resources (e.g., a user’s articles) to avoid ambiguity?  
3) Which HTTP status codes should you use for successful resource creation, validation failures, and not-found errors?  
4) Why is API versioning important, and what are two common ways to version REST APIs?  
5) What is a safe way to handle pagination on the server side, and what are typical query parameters you might expose to clients?

## Exercise

Build a small REST API in Ruby (using Sinatra for portability) that manages a simple resource: Task. The exercise walks you through creating a versioned API, implementing pagination, basic filtering, and authentication.

Part A – Create a minimal Sinatra API (in-memory store)
- Create a single file, e.g., app.rb, with a small in-memory array of tasks.
- Implement endpoints under /api/v1/tasks:
  - GET /api/v1/tasks – list tasks (with optional limit and offset)
  - GET /api/v1/tasks/:id – retrieve a single task
  - POST /api/v1/tasks – create a new task (validate presence of title)
  - PATCH /api/v1/tasks/:id – update a task (patch only provided fields)
  - DELETE /api/v1/tasks/:id – delete a task
- Return JSON responses with appropriate status codes (200, 201, 422, 404, 204).
- Add very simple authentication: require header Authorization: Bearer secret-token for write operations (POST/PATCH/DELETE).

Code (single file example):
```ruby
# app.rb
require 'sinatra'
require 'json'
set :bind, '0.0.0.0'
set :port, 4567

# In-memory store of tasks
TASKS = [
  { id: 1, title: 'Implement REST API', completed: false, created_at: '2026-03-01' },
  { id: 2, title: 'Write tests', completed: true, created_at: '2026-03-02' }
]

helpers do
  def json(data)
    content_type :json
    data.to_json
  end

  def authorize!
    token = request.env['HTTP_AUTHORIZATION']&.split(' ')&.last
    halt 401, json({ error: 'Unauthorized' }) unless token == 'secret-token'
  end
end

# Versioned namespace: /api/v1/*
namespace do
  before '/api/v1/*' do
    # No global auth; only certain actions require auth
  end

  # List tasks with pagination
  get '/api/v1/tasks' do
    limit = (params['limit'] || 20).to_i
    offset = (params['offset'] || 0).to_i
    data = TASKS.slice(offset, limit) || []
    json({ total: TASKS.length, data: data })
  end

  # Get a single task
  get '/api/v1/tasks/:id' do
    t = TASKS.find { |tk| tk[:id] == params[:id].to_i }
    if t
      json t
    else
      halt 404, json({ error: 'Task not found' })
    end
  end

  # Create a new task (requires auth)
  post '/api/v1/tasks' do
    authorize!
    payload = JSON.parse(request.body.read) rescue {}
    if payload['title'] && !payload['title'].strip.empty?
      new_id = (TASKS.map { |t| t[:id] }.max || 0) + 1
      task = { id: new_id, title: payload['title'], completed: payload['completed'] ||= false, created_at: Time.now.to_s }
      TASKS << task
      status 201
      json task
    else
      halt 422, json({ error: 'Validation failed: title is required' })
    end
  end

  # Update a task (requires auth)
  patch '/api/v1/tasks/:id' do
    authorize!
    t = TASKS.find { |tk| tk[:id] == params[:id].to_i }
    if t
      payload = JSON.parse(request.body.read) rescue {}
      t[:title] = payload['title'] if payload.key?('title')
      t[:completed] = payload['completed'] if payload.key?('completed')
      json t
    else
      halt 404, json({ error: 'Task not found' })
    end
  end

  # Delete a task (requires auth)
  delete '/api/v1/tasks/:id' do
    authorize!
    index = TASKS.index { |tk| tk[:id] == params[:id].to_i }
    if index
      TASKS.delete_at(index)
      status 204
    else
      halt 404, json({ error: 'Task not found' })
    end
  end
end
```

Part B – Run it locally
- Install Ruby and the Sinatra gem.
- Run: ruby app.rb
- Test with curl:
  - List: curl -s http://localhost:4567/api/v1/tasks
  - Create (needs auth): curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer secret-token" -d '{"title":"New Task"}' http://localhost:4567/api/v1/tasks

Part C – Extend (optional)
- Add cursor-based pagination or a total pages field.
- Add simple search by title via query param ?q=...
- Add a serializer-like layer to shape responses consistently (e.g., always return { data: {...} }).

Notes for the Exercise:
- This exercise demonstrates key REST concepts in a minimal, framework-agnostic way: versioned endpoints, standard HTTP methods, status codes, input validation, error handling, and simple authentication. If you’re using Rails for real work, translate these concepts into Rails controllers, routes, and serializers, preserving the same semantics.

End of lesson.