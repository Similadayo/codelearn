# API Versioning & Deprecation Strategies in Ruby (Phase 7: Advanced API Features)

Versioning and deprecation are foundational to maintaining robust, scalable APIs. In Ruby-centric backends (especially Rails apps), choosing a strategy for evolving your API—while preserving client compatibility, providing clear deprecation paths, and offering smooth migrations—defines how safely you can advance features, fix breaking changes, and support long-running clients. This lesson walks through practical Ruby/Rails patterns for versioning (path, header, and media-type approaches) and for signaling, handling, and documenting deprecations in production systems.

## 1. Path-based Versioning in Rails (Explicit Versioned Namespaces)

Path-based versioning uses the URL path to select a versioned API namespace. This approach makes versioning explicit in the endpoint and is easy for clients to test, document, and migrate.

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :items
    end

    namespace :v2 do
      resources :items
    end
  end
end

# app/controllers/api/v1/items_controller.rb
module Api
  module V1
    class ItemsController < ApplicationController
      def index
        items = Item.all
        render json: { version: 1, items: items.map(&:name) }
      end
    end
  end
end

# app/controllers/api/v2/items_controller.rb
module Api
  module V2
    class ItemsController < ApplicationController
      def index
        items = Item.all
        render json: { version: 2, items: items.map { |i| { id: i.id, title: i.title } } }
      end
    end
  end
end
```

### Line-by-line explanation
- config/routes.rb: Defines two top-level API namespaces, v1 and v2, under /api. Each version exposes its own items resource.
- app/controllers/api/v1/items_controller.rb: V1 ItemsController returning a simple list of item names and tagging the response with version: 1.
- app/controllers/api/v2/items_controller.rb: V2 ItemsController returning a richer payload (id and title) and tagging the response with version: 2.
- Each version is isolated in its own module to minimize cross-version coupling.

## 2. Header-based Versioning (Accept Header Negotiation)

Header-based versioning uses the HTTP Accept header to negotiate the version, enabling a single URL to serve multiple versions.

### Code: Rails routing with a version constraint and header-based dispatch

```ruby
# lib/api_constraints.rb
class ApiConstraints
  def initialize(version)
    @version = version
  end

  def matches?(request)
    accept_header = request.headers['Accept']
    accept_header.present? && accept_header.include?("application/vnd.myapp.v#{@version}+json")
  end
end

# config/routes.rb
Rails.application.routes.draw do
  namespace :api, defaults: { format: :json } do
    constraints ApiConstraints.new(1) do
      scope module: :v1, path: '' do
        resources :items
      end
    end

    constraints ApiConstraints.new(2) do
      scope module: :v2, path: '' do
        resources :items
      end
    end
  end
end

# app/controllers/api/v1/items_controller.rb
module Api
  module V1
    class ItemsController < ApplicationController
      def index
        render json: { version: 1, items: Item.pluck(:name) }
      end
    end
  end
end

# app/controllers/api/v2/items_controller.rb
module Api
  module V2
    class ItemsController < ApplicationController
      def index
        render json: { version: 2, items: Item.pluck(:id) }
      end
    end
  end
end
```

### Line-by-line explanation
- lib/api_constraints.rb: ApiConstraints encapsulates a version gate that checks the Accept header for the vendor media type (application/vnd.myapp.vN+json).
- config/routes.rb: Defines two constraint blocks, one for v1 and one for v2. Each constraint maps to a versioned module, enabling header-based routing.
- app/controllers/api/v1/items_controller.rb and app/controllers/api/v2/items_controller.rb: Version-specific controllers return version-tagged payloads. In practice, you may consolidate common logic, but keeping separate controllers clarifies version boundaries.
- Usage example (client): GET /api/items with header Accept: application/vnd.myapp.v2+json will route to V2 controller; Accept: application/vnd.myapp.v1+json routes to V1 controller.

## 3. Deprecation Strategies & Lifecycle (Planning, Signaling, Sunset)

Deprecation is about communicating upcoming removals and guiding clients to modern versions. A mature API provides deprecation notices, an explicit sunset date, and a migration path, often with a temporary coexistence window.

### A. Early deprecation: add deprecation headers on old versions

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < Api::BaseController
      before_action :set_deprecation_headers

      private

      def set_deprecation_headers
        response.headers['Deprecation'] = 'version="v1" is deprecated and will be removed on 2026-04-30'
        response.headers['Link'] = '<https://api.example.com/docs/deprecations#v1>; rel="deprecation"'
        response.headers['Sunset'] = '2026-04-30'
      end
    end
  end
end

# app/controllers/api/v1/items_controller.rb
module Api
  module V1
    class ItemsController < BaseController
      def index
        render json: { items: Item.pluck(:name) }
      end
    end
  end
end
```

### B. Sunset date reached: return 410 Gone for retired endpoints

```ruby
# app/controllers/api/v1/items_controller.rb (continued)
module Api
  module V1
    class ItemsController < BaseController
      SUNSET_DATE = Date.new(2026, 4, 30)

      def index
        if Date.today > SUNSET_DATE
          render json: { error: 'This version has been sunset and is no longer available' }, status: :gone
        else
          render json: { items: Item.pluck(:name) }
        end
      end
    end
  end
end
```

### Line-by-line explanation
- set_deprecation_headers: Attaches a Deprecation header with a clear removal date, a Link header pointing to deprecation docs, and a Sunset header with the removal date to aid automated clients.
- SUNSET_DATE constant: Centralizes the removal date for clarity and future automation.
- index action: If the current date is after the sunset date, responds with 410 Gone to indicate the resource/version is no longer available; otherwise serves the normal payload.
- This pattern provides both a soft deprecation signal (headers) and a hard retirement signal (410) once the sunset passes.

## 4. DRY & Composable Version Negotiation Patterns

To avoid duplicating logic across versions, you can centralize the negotiation and response rendering in a shared base controller and/or a small negotiation service.

### A. Single controller with versioned renderers (header-based)

```ruby
# app/controllers/api/items_controller.rb
class Api::ItemsController < ApplicationController
  before_action :determine_version

  def index
    items = Item.all
    render_versioned(items)
  end

  private

  def determine_version
    # Fallback to v1 if not present
    @version = request.headers['Accept']&.match(/application\/vnd\.myapp\.v(\d+)/)&.captures&.first&.to_i || 1
  end

  def render_versioned(items)
    case @version
    when 2
      render json: { version: 2, items: items.map { |it| { id: it.id, title: it.title } } }
    else
      render json: { version: 1, items: items.map { |it| it.title } }
    end
  end
end
```

### B. Routing with a shared base and version-specific implementations

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    resources :items, only: [:index]
  end
end

# app/controllers/api/base_controller.rb
module Api
  class BaseController < ActionController::API
    private

    def negotiate_version
      request.headers['Accept']&.match(/application\/vnd\.myapp\.v(\d+)/)&.captures&.first&.to_i || 1
    end
  end
end

# app/controllers/api/v1/items_controller.rb
module Api
  class V1::ItemsController < Api::BaseController
    def index
      items = Item.pluck(:title)
      render json: { version: 1, items: items }
    end
  end
end

# app/controllers/api/v2/items_controller.rb
module Api
  class V2::ItemsController < Api::BaseController
    def index
      items = Item.all
      render json: { version: 2, items: items.map { |i| { id: i.id, title: i.title } } }
    end
  end
end
```

### Line-by-line explanation
- negotiate_version: Centralizes the logic to extract version from the Accept header, defaulting to 1 when absent.
- render_versioned or the versioned controllers: Demonstrates how to keep the routing clean while rendering version-specific payloads, enabling a single or minimal set of endpoints to support multiple versions via negotiation.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Inconsistent versioning strategy across endpoints
  - Bad
    ```ruby
    # app/controllers/items_controller.rb
    def index
      version = params[:version] || 1
      if version == 2
        render json: { items: Item.all.map(&:id) }
      else
        render json: { items: Item.all.map(&:name) }
      end
    end
    ```
  - Good
    ```ruby
    # Use a single source of truth: either path-based versions or header-based negotiation, not both.
    # Path-based consistent approach (preferred for clarity)
    # config/routes.rb
    namespace :api do
      namespace :v1 do
        resources :items
      end
      namespace :v2 do
        resources :items
      end
    end
    ```

- Pitfall 2: Deprecating without a public migration path or docs
  - Bad
    ```ruby
    # Old v1 endpoint silently removed without notice
    class Api::V1::ItemsController < ApplicationController
      def index
        render json: { error: 'Deprecated' }, status: :gone
      end
    end
    ```
  - Good
    ```ruby
    # V1 with deprecation headers and explicit sunset date
    class Api::V1::ItemsController < Api::V1::BaseController
      before_action :set_deprecation_headers
      SUNSET_DATE = Date.new(2026, 4, 30)

      def index
        if Date.today > SUNSET_DATE
          render json: { error: 'Deprecated and sunset date passed' }, status: :gone
        else
          render json: { items: Item.pluck(:name) }
        end
      end

      private

      def set_deprecation_headers
        response.headers['Deprecation'] = 'version="v1" is deprecated and will be removed on 2026-04-30'
        response.headers['Link'] = '<https://api.example.com/docs/deprecations#v1>; rel="deprecation"'
        response.headers['Sunset'] = '2026-04-30'
      end
    end
    ```

- Pitfall 3: Ignoring tests for versioned endpoints
  - Bad
    ```ruby
    # No tests asserting different versions
    # RSpec example that only checks a single version
    it 'returns items for v1' do
      get '/api/v1/items'
      expect(response).to have_http_status(:ok)
    end
    ```
  - Good
    ```ruby
    # RSpec tests for both versions and for deprecation headers
    describe 'API versioning' do
      it 'returns v1 payload' do
        get '/api/v1/items'
        expect(response.status).to eq(200)
        expect(JSON.parse(response.body)['version']).to eq(1)
      end

      it 'returns v2 payload' do
        get '/api/v2/items'
        expect(response.status).to eq(200)
        expect(JSON.parse(response.body)['version']).to eq(2)
      end

      it 'signals deprecation for v1' do
        get '/api/v1/items'
        expect(response.headers['Deprecation']).to be_present
      end
    end
    ```

- Pitfall 4: Failing to communicate deprecation details in docs and changelogs
  - Bad
    ```text
    API v1 is deprecated. Upgrade to v2.
    ```
  - Good
    - Maintain a formal deprecation policy doc with:
      - Sunset date
      - Migration guide
      - Link headers and in-app messaging
      - Timeline and customer impact assessment

- Pitfall 5: Not validating compatibility of payloads across versions
  - Bad
    ```ruby
    # v1: items: [{ name: 'X' }]
    # v2: items: [{ id: 1, title: 'X' }]
    ```
  - Good
    ```ruby
    # Normalize responses through a contract/serializer per version
    # v1 serializer
    class Api::V1::ItemSerializer
      def as_json(item)
        { name: item.name }
      end
    end
    # v2 serializer
    class Api::V2::ItemSerializer
      def as_json(item)
        { id: item.id, title: item.title }
      end
    end
    ```

## Y. Why This Matters In Real Systems

- Customer retention and trust: Clients build integrations around stable API contracts. Breaking changes without notice harms partners and user experiences.
- Migration planning: Versioning enables parallel lifecycles—new features in v2 while maintaining v1 for compliance windows.
- Deprecation discipline: Clear sunset dates and deprecation signals reduce post-release chaos and support load.
- Observability: Instrument versioned endpoints (requests per version, deprecation header hits, sunset-date metrics) to plan retirement and capacity planning.
- Documentation and contracts: Versioned API docs, samples, and contract tests (e.g., Pact or contract tests) help teams align on expected shapes and behaviors.
- Compliance and governance: Enterprises often require explicit upgrade paths and deprecation cycles to minimize risk in production environments.

## Z. Study Questions — 5 recall questions

1. What is the primary difference between path-based and header-based API versioning?
2. How can you implement a version constraint in Rails routing that selects a controller based on the Accept header?
3. Which HTTP headers are commonly used to signal deprecation and sunset information?
4. What is the purpose of a “sunset date” in an API deprecation strategy?
5. How would you test versioned endpoints to ensure both v1 and v2 remain compatible and correctly implemented?

## Exercise

Part A: Set up a small Rails-like API skeleton (conceptual, pseudo-code or your local project)

- Create a simple Rails app (or pretend environment) with an Item model (attributes: id, title).
- Implement path-based versioning with v1 and v2:
  - v1: GET /api/v1/items returns a JSON array of item titles.
  - v2: GET /api/v2/items returns a JSON array of objects with { id, title }.
- Ensure controllers are isolated by version and that routes are clearly versioned.

Part B: Add header-based version negotiation

- Implement a single endpoint GET /api/items that uses Accept: application/vnd.myapp.v1+json or Accept: application/vnd.myapp.v2+json to choose the version.
- Implement minimal controllers to demonstrate different payload shapes for v1 and v2.

Part C: Introduce deprecation signaling for v1

- Add deprecation headers to v1 responses:
  - Deprecation: version="v1" is deprecated and will be removed on <sunset-date>.
  - Link: <https://example.com/docs/deprecations#v1>; rel="deprecation"
  - Sunset: <sunset-date>
- Implement a sunset check that returns 410 Gone when the current date passes the sunset date.

Part D: Add tests

- Write RSpec tests to verify:
  - v1 and v2 return correct shapes.
  - Header-based negotiation selects the expected version.
  - Deprecation headers appear on v1 responses.
  - After sunset, v1 item requests return 410 Gone.

Part E: Documentation and maintenance plan

- Create a short deprecation policy document with:
  - Version lifecycles (how long v1 remains active)
  - How clients should migrate
  - How to discover deprecation notes (docs, changelog)
  - How to verify programs against version changes (contract tests)

Notes for implementation:
- You can adapt the code samples into your existing Rails project or a minimal dummy app.
- The emphasis should be on clear versioning semantics, predictable migration paths, and explicit deprecation signaling that operators and clients can rely on in production systems.