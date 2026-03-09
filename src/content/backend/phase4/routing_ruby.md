# Track: Backend Engineering — Phase 4 — Building Web Servers

Routing is the nerve center of a web server. In Ruby, understanding how to design clean URLs and extract path parameters ensures your services are intuitive, maintainable, and scalable. This lesson uses Sinatra to illustrate core routing concepts without heavyweight ceremony, so you can focus on how requests map to code, how to design RESTful paths, and how to handle optional and wildcard segments in production-grade APIs.

## 1. Routing Fundamentals in Ruby Web Apps

```ruby
require 'sinatra'

# Root endpoint
get '/' do
  "Welcome to the Sinatra router demo"
end

# Path parameter: :id
get '/articles/:id' do
  article_id = params[:id]
  "Fetching article with ID #{article_id}"
end

# Multiple path parameters
get '/users/:user_id/articles/:article_id' do
  user_id = params[:user_id]
  article_id = params[:article_id]
  "User #{user_id} requested article #{article_id}"
end
```

### Line-by-line explanation
- require 'sinatra'  
  Loads the Sinatra DSL so you can declare routes.
- get '/' do ... end  
  Defines a route that matches HTTP GET requests to the root path. The block returns a string response.
- get '/articles/:id' do ... end  
  A route with a dynamic segment named id. The value in that position in the URL is available as params[:id].
- article_id = params[:id]  
  Extracts the path parameter for use inside the route.
- get '/users/:user_id/articles/:article_id' do ... end  
  Route with two path parameters. Demonstrates how to access multiple dynamic segments via params.
- The return values are sent as HTTP responses to the client.

## 2. Designing Clean URLs: RESTful Paths and Parameters

```ruby
require 'sinatra'

# Users resource
get '/users/:user_id' do
  "User #{params[:user_id]}"
end

# Nested resource: a user's articles
get '/users/:user_id/articles' do
  "Articles for user #{params[:user_id]}"
end

# Articles resource
get '/articles/:id' do
  "Article #{params[:id]}"
end

# Nested resource example: comments on an article
get '/articles/:article_id/comments/:comment_id' do
  article_id = params[:article_id]
  comment_id = params[:comment_id]
  "Comment #{comment_id} on article #{article_id}"
end
```

### Line-by-line explanation
- get '/users/:user_id' do ... end  
  RESTful users resource. The user_id in the path is the identifier for the user resource.
- get '/users/:user_id/articles' do ... end  
  Nested resource: articles belonging to a specific user. URL encodes the relationship.
- get '/articles/:id' do ... end  
  Standard articles resource endpoint with a top-level identifier.
- get '/articles/:article_id/comments/:comment_id' do ... end  
  Deeply nested resource: a specific comment on a specific article. Path parameters capture both IDs for precise retrieval.

## 3. Path Parameters vs Query Strings

```ruby
require 'sinatra'

# Path param for resource
get '/products/:id' do
  product_id = params[:id]
  "Product #{product_id}"
end

# Query param and default
get '/search' do
  query = params[:q]
  sort  = params[:sort] || 'relevance'
  if query
    "Search results for '#{query}' sorted by #{sort}"
  else
    "No query provided"
  end
end
```

### Line-by-line explanation
- get '/products/:id' do ... end  
  Demonstrates a path parameter used to identify a resource (product).
- product_id = params[:id]  
  Reads the dynamic segment from the path.
- get '/search' do ... end  
  Demonstrates a query parameter (q) and a default fallback for sort.
- sort = params[:sort] || 'relevance'  
  Uses a default value when the client omits the sort parameter.
- The response uses both path and query data to shape the result.

## 4. Handling Optional and Wildcard Path Segments

```ruby
require 'sinatra'

# Optional year and month
get '/archive(/:year)(/:month)' do
  year  = params[:year]
  month = params[:month]
  if year && month
    "Archive for #{year}-#{month}"
  elsif year
    "Archive for year #{year}"
  else
    "Archive root"
  end
end
```

### Line-by-line explanation
- get '/archive(/:year)(/:month)' do ... end  
  Sinatra supports optional segments by wrapping them in parentheses. This route matches /archive, /archive/2023, and /archive/2023/09.
- year = params[:year], month = params[:month]  
  Reads optional path parameters if present.
- Conditional branches build a meaningful response depending on which segments were supplied.

```ruby
require 'sinatra'

# Wildcard path segment
get '/files/*' do
  path = params['splat'].first
  "Requested file path: /#{path}"
end

# Regex-based route constraint (numeric id)
get %r{/items/([0-9]+)} do
  item_id = params['captures'].first
  "Item with numeric id: #{item_id}"
end
```

### Line-by-line explanation
- get '/files/*' do ... end  
  '*' denotes a wildcard segment. The actual wildcard content is in params['splat'] as an array.
- path = params['splat'].first  
  Retrieves the portion of the URL that matched the wildcard.
- get %r{/items/([0-9]+)} do ... end  
  A regex-based route. The route matches only numeric IDs.
- item_id = params['captures'].first  
  Captures from the regex are stored in params['captures']; take the first capture for the ID.

## 5. Route Organization and Modularity

```ruby
# Classic Sinatra app (all routes in one file)
require 'sinatra'

get '/' do
  'Hello from a classic Sinatra app'
end

get '/health' do
  'OK'
end

get '/resources/:id' do
  "Resource #{params[:id]}"
end
```

### Line-by-line explanation
- Classic style defines routes at the top level, suitable for small apps or proofs-of-concept.
- Each route maps a path (with optional parameters) to a string or data structure returned to the client.

```ruby
# Modular Sinatra app (Sinatra::Base)
require 'sinatra/base'
require 'json'

class API < Sinatra::Base
  before do
    content_type :json
  end

  get '/' do
    { message: 'API root' }.to_json
  end

  get '/articles/:id' do
    { id: params[:id], title: 'Sample Article' }.to_json
  end
end

# To run this modular app, you typically mount it in config.ru:
# require './api'
# run API
```

### Line-by-line explanation
- require 'sinatra/base'  
  Uses the modular style provided by Sinatra, better for larger apps.
- class API < Sinatra::Base ... end  
  Defines a reusable, mountable application component.
- before do ... end  
  A hook that runs before every route; here it sets the response content type to JSON.
- get '/' do ... end and get '/articles/:id' do ... end  
  Routes defined on the modular app; returns JSON payloads.
- config.ru guidance (commented) shows how to mount the modular app in a Rack-based server. This separation improves testability, routing composition, and reuse.

## X. Common Beginner Mistakes

### Pitfall 1 — Ambiguous dynamic routes causing misrouted requests
Bad:
```ruby
# Ambiguous: could route '/users/new' to :id => 'new'
get '/users/:id' do
  "User #{params[:id]}"
end

get '/users/new' do
  "Create new user"
end
```

Good:
```ruby
get '/users/new' do
  "Create new user"
end

get '/users/:id' do
  "User #{params[:id]}"
end
```

### Pitfall 2 — Not validating numeric path parameters
Bad:
```ruby
get '/orders/:order_id' do
  "Order #{params[:order_id]}"
end
```

Good:
```ruby
get '/orders/:order_id' do
  id = params[:order_id].to_i
  halt 400, 'Invalid id' if id <= 0
  "Order #{id}"
end
```

### Pitfall 3 — Non-RESTful or verbs-in-path in URLs
Bad:
```ruby
get '/getUser/:id' do
  "User #{params[:id]}"
end
```

Good:
```ruby
get '/users/:id' do
  "User #{params[:id]}"
end
```

### Pitfall 4 — Excessively deep nesting without value
Bad:
```ruby
get '/a/b/c/d/e/f/g' do
  'too deep'
end
```

Good:
```ruby
get '/a/b/c' do
  'well-scoped route'
end
```

## Y. Why This Matters In Real Systems

- Consistency and discoverability: RESTful, resource-oriented URLs (e.g., /users/:id, /articles/:id) are intuitive for developers and API clients.
- Maintainability: Clear route organization (modular Sinatra, route grouping) makes larger services scalable; easier to test and reason about.
- Evolvability: Use versioned paths (e.g., /v1/articles/:id) to support changes without breaking clients; plan for deprecations and migrations.
- Performance and observability: Predictable routing reduces CPU cycles for pattern matching; attach metrics to routes for tracing and SLAs.
- Security and validation: Validate and sanitize path params, enforce numeric constraints when IDs are expected, and avoid leaking internal identifiers through poorly designed routes.
- SEO and UX: Clean, stable URLs reduce bookmark drift and improve user experience when a web UI is served from the same routing layer.

Example production-minded pattern:
- Versioned, RESTful API with modular routes
  - GET /v1/users/:user_id/articles
  - GET /v1/articles/:id
  - Optional filters via query strings: /v1/articles?author_id=123&sort=date

Code cannot cover all production concerns, but this foundation ensures your routing layer is expressive, testable, and ready for real systems.

## Z. Study Questions

1) What is a path parameter and how do you access it in Sinatra?
2) How do you design RESTful URLs for nested resources? Provide an example.
3) How can you implement optional path segments in Sinatra? Give a route example.
4) How do you access wildcard segments in Sinatra routes? What data structure holds them?
5) Why should route definitions be ordered carefully, and how can misordering impact request handling?

## Exercise

Part 1 — Build a small Sinatra app with RESTful routes
- Create a new Ruby file (e.g., app.rb) using Sinatra classic style.
- Implement the following routes:
  - GET '/' -> "Welcome to the API"
  - GET '/users/:user_id' -> "User <user_id>"
  - GET '/users/:user_id/articles' -> "Articles for user <user_id>"
  - GET '/articles/:id' -> "Article <id>"
  - GET '/archive(/:year)(/:month)' -> dynamic archive messaging (see Section 4 for patterns)

Part 2 — Extend with modular structure
- Create a modular Sinatra app (class API < Sinatra::Base) with the same routes, returning JSON responses.
- Mount the modular app in a config.ru snippet (or explain how to run via rackup).

Part 3 — Add input validation and edge cases
- For routes using numeric IDs, validate that IDs are positive integers; return 400 on invalid input.
- Add a wildcard route to simulate static asset access: GET '/static/*' -> return the requested path.

Part 4 — Reasoning and reflection
- Explain how the design choices in your routes would scale to a larger service with many resources and versions.
- Discuss at least one potential security or performance concern and how you would mitigate it in a real system.

Expected outcomes:
- A working Sinatra app demonstrating clean RESTful URLs, path parameters, optional segments, wildcards, and modular design.
- Clear line-by-line understanding of how each route is matched and how parameters are accessed.
- Preparedness to apply these routing principles to real production Ruby web servers (Rack-based, Sinatra, or Rails).