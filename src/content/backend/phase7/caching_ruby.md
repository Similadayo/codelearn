# Caching with Redis — Speed Up Your API (Ruby)

Caching with Redis is a proven way to dramatically reduce API latency and DB load in production systems. In this lesson, you’ll learn how to design Redis-backed caches in Ruby, implement robust TTL-based caching for API responses, handle invalidation on writes, and apply real-world patterns that scale. By the end, you’ll be able to speed up hot API paths while maintaining correctness.

## 1. Redis Fundamentals for Ruby APIs

Caching requires two main ideas: storing computed results and retrieving them quickly. Redis provides an in-memory store with fast reads/writes and support for TTLs. In Ruby, the redis gem makes interacting with Redis straightforward.

```ruby
# redis_cache.rb
require 'redis'
require 'json'

class RedisCache
  def initialize(url: nil, db: 0)
    @redis = Redis.new(url: url, db: db)
  end

  # Fetch a value by key. If missing, compute via block and cache it.
  def fetch(key, ttl: 300)
    cached = @redis.get(key)
    if cached
      JSON.parse(cached, symbolize_names: true)
    else
      result = yield
      @redis.setex(key, ttl, result.to_json)
      result
    end
  end

  def delete(key)
    @redis.del(key)
  end
end
```

### Line-by-line explanation
- require 'redis': Load the Redis client library.
- require 'json': Load JSON for serialization/deserialization.
- class RedisCache: Define a small wrapper around Redis for simple caching needs.
- def initialize(url: nil, db: 0): Constructor that creates a Redis client, optionally connecting to a specific URL and DB.
- @redis = Redis.new(url: url, db: db): Instantiate the Redis client.
- def fetch(key, ttl: 300): Fetch a value by key with a time-to-live (TTL).
- cached = @redis.get(key): Attempt to read the cached value as a string.
- if cached ... else ... end: If cache hit, parse JSON and return; otherwise compute and cache.
- JSON.parse(cached, symbolize_names: true): Convert the JSON string back into a Ruby object (hash/array) with symbol keys.
- result = yield: Call the provided block to compute the value when cache misses.
- @redis.setex(key, ttl, result.to_json): Store the computed result as JSON with an expiration time.
- result: Return the freshly computed value.
- def delete(key): Public method to invalidate a single cache entry.
- @redis.del(key): Remove the key from Redis.

## 2. Cache Key Design and TTL Strategy

A clear, stable cache key strategy is essential. Keys should be unique per resource and should survive across code changes. Stable ordering of parameters ensures consistent keys.

```ruby
def cache_key_for(action:, user_id:, params: {})
  parts = ["api", action, "user:#{user_id}"]
  unless params.empty?
    query = params.sort.map { |k, v| "#{k}=#{v}" }.join("&")
    parts << query
  end
  parts.join(":")
end

# Example usage
cache = RedisCache.new(url: ENV['REDIS_URL'])
key = cache_key_for(action: :recent_orders, user_id: current_user.id, params: { limit: 20, status: 'open' })
data = cache.fetch(key, ttl: 600) do
  # expensive operation, e.g., a complex query
  Order.where(user_id: current_user.id).limit(20).order(created_at: :desc).to_a
end
```

### Line-by-line explanation
- def cache_key_for(action:, user_id:, params: {}): Define a helper to build stable cache keys.
- parts = ["api", action, "user:#{user_id}"]: Start with a base key using action and user context.
- unless params.empty? ... end: If there are query-like parameters, append them in a sorted, predictable order.
- query = params.sort.map { |k, v| "#{k}=#{v}" }.join("&"): Create a stable query string by sorting, then joining.
- parts << query: Add the query string to the key components.
- parts.join(":"): Join all components with ":" to form the final key.
- cache = RedisCache.new(...): Instantiate the cache helper.
- key = cache_key_for(...): Build a specific cache key for this request.
- data = cache.fetch(key, ttl: 600) do ... end: Retrieve from cache or compute and cache.
- Order.where(...).to_a: Example of an expensive DB query that we want to cache.

## 3. Caching API Responses in Rails (or Plain Ruby)

Rails has a built-in caching API that can be backed by Redis. Below is a Rails-focused example. If you’re not using Rails, see the plain Ruby example in the next code block.

```ruby
# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def show
    user_id = params[:id]
    key = "api:users:#{user_id}"

    result = Rails.cache.fetch(key, expires_in: 5.minutes) do
      User.find(user_id).as_json(only: [:id, :name, :email])
    end

    render json: result
  end
end
```

### Line-by-line explanation
- class Api::V1::UsersController < ApplicationController: Define a controller for the API.
- def show: Action for showing a user.
- user_id = params[:id]: Extract the requested user ID from parameters.
- key = "api:users:#{user_id}": Build a cache key for this user.
- result = Rails.cache.fetch(key, expires_in: 5.minutes) do ... end: Fetch from Redis-backed cache; if missing, execute the block and cache the result for 5 minutes.
- User.find(user_id).as_json(...): Fetch the user record and serialize it to JSON-friendly form.
- render json: result: Return the cached or freshly computed data as JSON.

Alternative plain Ruby example (non-Rails environment):

```ruby
# plain_ruby_api_example.rb
require 'redis'
require 'json'
redis = Redis.new(url: ENV['REDIS_URL'])

def cached_user(redis, id)
  key = "api:users:#{id}"
  cached = redis.get(key)
  if cached
    JSON.parse(cached)
  else
    user = fetch_user_from_db(id) # heavy operation
    redis.setex(key, 300, user.to_json)
    user
  end
end
```

### Line-by-line explanation
- redis = Redis.new(...): Connect to Redis for caching.
- def cached_user(redis, id): Define a helper to fetch a user with caching.
- key = "api:users:#{id}": Build the cache key for the user.
- cached = redis.get(key): Attempt to read cached data.
- if cached ... else ... end: Return cached data if present; otherwise fetch fresh and cache it.
- JSON.parse(cached): Deserialize cached JSON into Ruby objects.
- fetch_user_from_db(id): Placeholder for the expensive operation.
- redis.setex(key, 300, user.to_json): Cache the fresh result with a TTL of 5 minutes.

## 4. Cache Invalidation and Advanced Patterns

Caching is only useful if it stays correct when data changes. Here are patterns to keep caches coherent.

```ruby
# Rails: invalidate on write
class User < ApplicationRecord
  after_commit :invalidate_user_cache, on: [:create, :update, :destroy]

  private

  def invalidate_user_cache
    Rails.cache.delete("api:users:#{id}")
  end
end
```

```ruby
# Versioned key pattern (auto-invalidates when data changes)
def user_cache_key(user)
  "api:users:#{user.id}:v#{user.updated_at.utc.to_i}"
end
```

### Line-by-line explanation
- after_commit :invalidate_user_cache, on: [:create, :update, :destroy]: Ensure cache invalidation runs after any write operation on the user.
- def invalidate_user_cache: Callback to run invalidation.
- Rails.cache.delete("api:users:#{id}"): Remove stale cache entry for this user.
- def user_cache_key(user): Define a versioned key helper.
- "api:users:#{user.id}:v#{user.updated_at.utc.to_i}": Include a version stamp based on the record’s updated time so that any update creates a new cache key automatically.

Additional pattern: background cache warm and auto-refresh (optional for hot paths)

```ruby
class CacheWarmer
  def initialize(redis, ttl: 300)
    @redis = redis
    @ttl = ttl
  end

  def warm(key, &block)
    return if @redis.exists?(key)
    value = yield
    @redis.setex(key, @ttl, value.to_json)
  end

  def refresh_in_background(key, ttl: @ttl, &block)
    Thread.new do
      sleep(ttl * 0.9)
      value = yield
      @redis.setex(key, ttl, value.to_json)
    end
  end
end
```

### Line-by-line explanation
- class CacheWarmer: A tiny helper to warm or refresh cache entries.
- def warm(key, &block): If the key is absent, compute and cache it.
- return if @redis.exists?(key): Skip if the key already exists.
- value = yield: Compute the value via the provided block.
- @redis.setex(key, @ttl, value.to_json): Store with TTL.
- def refresh_in_background(...): Launch a background thread to refresh closer to expiration.
- Thread.new ...: Run asynchronous refresh, helping keep data fresh without blocking requests.

## 5. Cache Warming and Background Refresh

Warming caches before traffic spikes can drastically reduce cold-start latency. Background refresh reduces stale data risks for high-traffic endpoints.

- Pros:
  - Lower tail latency during peak times.
  - More consistent response times for critical API paths.
- Cons:
  - Additional complexity and potential thread-safety concerns.
  - Slightly stale reads if refresh fails.

Best practice: start with a simple TTL-based cache, then add a background warmer for hot endpoints where latency is critical. Use metrics to decide which endpoints deserve warming.

## X. Common Beginner Mistakes — 4 Real Pitfalls (Bad vs Good)

1) Pitfall: Not using TTL or using unreasonably long TTLs
- Bad:
```ruby
# No TTL means data ages without bound
@redis.set("api:users:#{id}", user.to_json)
```
- Good:
```ruby
@redis.setex("api:users:#{id}", 300, user.to_json) # 5 minutes
```

2) Pitfall: Non-unique or fragile cache keys
- Bad:
```ruby
# Keys rely on URL path that may change
@redis.set("api:users:#{id}", user.to_json)
```
- Good:
```ruby
"api:users:#{id}:v#{user.updated_at.utc.to_i}"
```

3) Pitfall: Serialization errors causing cache failures
- Bad:
```ruby
# Directly caching complex Ruby objects without safe serialization
@redis.set("api:users:#{id}", user) 
```
- Good:
```ruby
@redis.setex("api:users:#{id}", 300, user.to_json)
# And deserialize on read
JSON.parse(raw, symbolize_names: true)
```

4) Pitfall: Stale data due to writes not invalidating cache
- Bad:
```ruby
# Update DB, but don't invalidate cache
user.update(name: "New Name")
```
- Good:
```ruby
def update_user(id, attrs)
  User.where(id: id).update_all(attrs)
  Rails.cache.delete("api:users:#{id}")
end
```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Latency and throughput: Redis caching moves expensive operations off the hot path, dramatically reducing response time and DB load.
- Consistency vs performance: TTLs introduce eventual consistency. Choose TTLs based on how fresh data must be for your domain (e.g., user profiles vs. analytics).
- Invalidation strategies: Invalidate on writes to guarantee correctness, or use versioned keys to implicitly invalidate old data without explicit deletes.
- Key design discipline: Stable, unique keys prevent subtle bugs. Prefer versioned or content-hash-based keys for complex objects.
- Monitoring and observability: Instrument cache hit rate, TTL distribution, and cold-start latency. Use metrics to decide which endpoints deserve warming.

## Z. Study Questions — 5 Recall Questions

1) What is the purpose of a TTL in a cache, and how does it affect data freshness?
2) How would you design a cache key to avoid collisions for a user resource with multiple query parameters?
3) Describe a cache invalidation strategy you would use when a user’s profile is updated.
4) What are the benefits and drawbacks of background cache warming?
5) How can you validate that your caching layer is providing a real performance win in production?

## Exercise — Practical Multi-Part Coding Challenge

Part A — Build a Redis-backed cache wrapper
- Task: Implement a robust RedisCache wrapper (as shown in Section 1) with fetch and delete methods, and add error handling for Redis connection issues.
- Deliverables:
  - redis_cache.rb implementing RedisCache.
  - A simple script that demonstrates fetch with a simulated expensive computation.

Part B — Apply TTL-based caching to a hot API path
- Task: Create a small Ruby class that simulates a hot API path (expensive_db_query) and use the RedisCache wrapper to cache the result for 10 minutes.
- Deliverables:
  - A Ruby script or small module showing the expensive computation and how it’s cached.

Part C — Cache invalidation on write (Rails example)
- Task: Given a User model, implement after_commit callbacks to invalidate the user cache on write, and create a versioned key function to illustrate automatic invalidation on update.
- Deliverables:
  - Validated Rails model code snippet.
  - A short controller example that reads from the cache and demonstrates invalidation after a write.

Part D — Optional: Background cache warming
- Task: Implement a small CacheWarmer-like class (as shown in Section 4) and demonstrate warming a hot key at startup and refreshing in the background.
- Deliverables:
  - cache_warmer.rb with warm and refresh_in_background methods.
  - A script that warms a few keys at startup and then refreshes them periodically.

Hints:
- Start with a minimal Redis-backed fetch implementation, then layer in TTL, then add invalidation and optional warming.
- Use JSON for serialization to keep compatibility with Ruby objects and simple decoding on read.
- Instrument with basic logging to observe cache misses (cold) vs hits (warm).

End of lesson.