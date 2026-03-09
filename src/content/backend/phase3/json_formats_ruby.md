# Track: Backend Engineering — Module: Phase 3 — Networking & The Web — Topic: Data Formats — JSON, XML, and Serialisation

Data formats are the lingua franca of modern networks. JSON dominates modern RESTful and GraphQL APIs for its light footprint and language-agnostic structure, while XML still thrives in legacy integrations and document-centric workflows. Serialization is the art of turning Ruby objects into storable or transmittable representations (and back again), enabling caching, inter-service communication, and persistence. In Ruby, you’ll work with JSON via the standard JSON library, XML via libraries like Nokogiri, and several serialization strategies (Marshal, YAML, JSON, and beyond). This lesson teaches you how to generate, parse, and safely serialize data across these formats, with practical Ruby examples you can adapt in real-world systems.

## 1. JSON, XML, and Serialization: What They Are and Why They Matter

JSON (JavaScript Object Notation) encodes data as lightweight, human-readable text. XML (eXtensible Markup Language) uses a document-oriented tree with tags. Serialization converts complex Ruby objects into formats suitable for storage or transmission (and back again).

Code example: quick roundtrip with JSON in Ruby
```ruby
require 'json'

data = {
  id: 42,
  name: "Ada",
  active: true,
  roles: ["admin", "developer"],
  profile: { email: "ada@example.com", locale: "en-US" }
}

# Serialize to JSON
json = data.to_json
puts "JSON: #{json}"

# Deserialize back to Ruby hash with symbol keys
parsed = JSON.parse(json, symbolize_names: true)
puts "Name: #{parsed[:name]}, Email: #{parsed[:profile][:email]}"
```

### Line-by-line explanation breaking down each line
- require 'json': Loads Ruby’s JSON library so you can call to_json and JSON.parse.
- data = { ... }: Creates a Ruby hash with nested structures representing a user.
- json = data.to_json: Converts the Ruby hash into a JSON string.
- puts "JSON: #{json}": Outputs the JSON string for inspection.
- parsed = JSON.parse(json, symbolize_names: true): Parses the JSON string back into a Ruby hash, using symbols as keys for easier access.
- puts "Name: #{parsed[:name]}, Email: #{parsed[:profile][:email]}": Demonstrates how to read nested values from the parsed JSON.

## 2. Working with JSON in Ruby

### 2.1 Basic JSON generation and parsing
Code block:
```ruby
require 'json'

person = {
  id: 7,
  name: "Grace",
  admin: false,
  scores: [92, 87, 100],
  profile: { email: "grace@example.com", verified: true }
}

# Generate JSON
json = JSON.generate(person)

# Parse JSON back to Ruby, with symbol keys
ruby_obj = JSON.parse(json, symbolize_names: true)

puts "Serialized JSON: #{json}"
puts "Parsed Ruby: #{ruby_obj.inspect}"
```

### Line-by-line explanation
- require 'json': Load JSON support.
- person = { ... }: Build a nested Ruby hash representing a user.
- json = JSON.generate(person): Convert the hash to a JSON string.
- ruby_obj = JSON.parse(json, symbolize_names: true): Parse back to Ruby with symbol keys.
- puts ...: Display the results for verification.

### 2.2 Handling numbers, booleans, and nested structures
Code block:
```ruby
require 'json'

payload = {
  product: "Widget",
  price: 19.99,
  in_stock: true,
  tags: ["electronics", "gadget"],
  specs: { weight_g: 128, color: "red" }
}

json = JSON.generate(payload)
puts json

parsed = JSON.parse(json, symbolize_names: true)
puts "Product: #{parsed[:product]}, Weight: #{parsed[:specs][:weight_g]}g"
```

### Line-by-line explanation
- payload = { ... }: Creates a nested structure with strings, numbers, booleans, arrays, and a nested hash.
- json = JSON.generate(payload): Serializes to JSON.
- parsed = JSON.parse(json, symbolize_names: true): Deserializes with symbol keys for easy access.
- puts ...: Access nested fields to demonstrate navigation of complex structures.

### 2.3 Safety: avoiding unsafe deserialization
Code block:
```ruby
require 'json'

safe_json = '{"name":"Alex","role":"user"}'

# Safe parse: disallow arbitrary object creation
data = JSON.parse(safe_json, symbolize_names: true, create_additions: false)
puts data[:name]
```

### Line-by-line explanation
- safe_json = '...': JSON string with simple data.
- JSON.parse(..., create_additions: false): Prevents JSON from constructing arbitrary Ruby objects; helps mitigate certain attack vectors.
- puts data[:name]: Demonstrates accessing parsed data safely.

## 3. XML in Ruby (Nokogiri)

XML is still common in integrations with legacy systems or document-centric flows. Nokogiri is the de facto Ruby library for XML parsing and building.

Code block (parsing and building XML with Nokogiri):
```ruby
# Be sure to add: gem 'nokogiri' to your Gemfile, then bundle install
require 'nokogiri'

xml_str = "<user><id>101</id><name>Ada</name><emails><email>ada@example.com</email></emails></user>"

# Parse XML
doc = Nokogiri::XML(xml_str)
name = doc.at_xpath('//name').text
email = doc.at_xpath('//emails/email').text
puts "Name: #{name}, Email: #{email}"

# Build XML
builder = Nokogiri::XML::Builder.new do |xml|
  xml.user do
    xml.id 102
    xml.name "Grace"
    xml.emails do
      xml.email "grace@example.com"
    end
  end
end

puts builder.to_xml
```

### Line-by-line explanation
- require 'nokogiri': Loads Nokogiri for XML handling.
- xml_str = "...": A sample XML payload representing a user.
- doc = Nokogiri::XML(xml_str): Parses the string into a document object.
- name = doc.at_xpath('//name').text: Retrieves the text inside the first name element.
- email = doc.at_xpath('//emails/email').text: Retrieves the first email value.
- puts "Name: ..., Email: ...": Displays extracted data.
- builder = Nokogiri::XML::Builder.new do |xml| ... end: Builds an XML document with nested elements.
- puts builder.to_xml: Outputs the constructed XML.

## 4. Serialization in Ruby (Marshal, YAML, JSON)

Serialization turns Ruby objects into a form suitable for storage or transmission. Ruby provides several strategies with different trade-offs.

### 4.1 Marshal: Ruby-internal serialization
Code block:
```ruby
original = { a: 1, b: [2, 3], c: { d: "4" } }

dump = Marshal.dump(original)
restored = Marshal.load(dump)

puts "Original: #{original.inspect}"
puts "Restored: #{restored.inspect}"
```

### Line-by-line explanation
- original = { ... }: A nested Ruby hash.
- dump = Marshal.dump(original): Serializes the object into a binary string format (not human-readable).
- restored = Marshal.load(dump): Deserializes back to a Ruby object.
- puts ...: Verifies equality of original and restored data.

### 4.2 YAML: Human-readable, but be mindful of security
Code block:
```ruby
require 'yaml'

config = {
  service: "payment",
  port: 8080,
  endpoints: { create: "/payments", status: "/payments/status" }
}

yaml_str = YAML.dump(config)
puts yaml_str

safe = YAML.safe_load(yaml_str, [Hash, String, Integer, Symbol, Array])
puts safe.inspect
```

### Line-by-line explanation
- require 'yaml': Loads YAML support.
- config = { ... }: A nested Ruby hash to serialize.
- yaml_str = YAML.dump(config): Serializes to YAML, which is human-readable.
- safe = YAML.safe_load(...): Safely deserializes, restricting to permitted classes to prevent unsafe object creation.
- puts safe.inspect: Shows the deserialized structure.

### 4.3 JSON: Standard cross-language serialization
Code block:
```ruby
require 'json'

payload = { id: 7, title: "Back-end Adapter", active: true }

json = payload.to_json
puts json

roundtrip = JSON.parse(json, symbolize_names: true)
puts roundtrip[:title]
```

### Line-by-line explanation
- require 'json': Uses Ruby’s JSON library.
- payload = { ... }: Data to serialize.
- json = payload.to_json: Converts to a JSON string suitable for network transmission.
- roundtrip = JSON.parse(...): Parses back into a Ruby hash with symbol keys.
- puts roundtrip[:title]: Accesses a value after deserialization.

## 5. Interoperability and Security Considerations

- Prefer JSON for cross-language interoperability due to its ubiquity and simplicity.
- Avoid YAML.load on untrusted input. Use YAML.safe_load with a whitelist of permitted classes.
- Be explicit about key formats. JSON.parse can produce string keys by default; consider symbolize_names: true to avoid key string fragmentation.
- For security-sensitive deserialization, disable create_additions (JSON) and avoid arbitrary object deserialization (YAML).
- Validate inputs before processing. Don’t rely on client-provided data structures; normalize data into your internal models.
- Prefer streaming or incremental parsing for large payloads to avoid high memory consumption.

Code snippet: YAML safe deserialization example (defensive)
```ruby
require 'yaml'

payload = STDIN.read
begin
  data = YAML.safe_load(payload, [Hash, Array, String, Integer, Float, TrueClass, FalseClass, NilClass], [], true)
  puts "Validated data: #{data.inspect}"
rescue Psych::SyntaxError => e
  warn "Invalid YAML: #{e.message}"
end
```

### Line-by-line explanation
- STDIN.read: Reads input to be deserialized.
- YAML.safe_load(...): Deserializes safely, whitelisting allowed classes; prevents dangerous object creation.
- rescue Psych::SyntaxError: Handles malformed YAML with a clear error message.

## 6. Performance and Best Practices

- JSON parsing is typically fast enough for many apps, but for high-throughput Ruby apps, consider alternative parsers like Oj (sorts speed wins) while maintaining compatibility.
- When possible, avoid round-trips between JSON and Ruby objects multiple times; structure data to minimize parsing overhead.
- For large documents, consider streaming or chunked processing if supported by your parser (e.g., Oj offers streaming capabilities; the standard JSON library is not designed for streaming large payloads out of the box).
- Cache serialized representations when appropriate and invalidates caches on data changes.
- When building APIs, prefer stable, schema-driven data contracts (e.g., JSON Schema) to enforce structure across clients and services.

Code snippet: Optional use of a faster JSON parser (Oj) with a graceful fallback
```ruby
begin
  require 'oj'
  Oj.optimize_rails if defined?(Oj::Rails)
  data = { user: "Ada", roles: ["admin"] }
  json = Oj.dump(data)
  parsed = Oj.load(json, mode: :strict, symbol_keys: true)
rescue LoadError
  require 'json'
  data = { user: "Ada", roles: ["admin"] }
  json = data.to_json
  parsed = JSON.parse(json, symbolize_names: true)
end

puts parsed
```

### Line-by-line explanation
- begin/rescue: Attempts to load Oj (faster parser); if not installed, falls back to the standard library.
- Oj.optimize_rails: Optional optimization hook for Rails apps.
- Oj.dump / Oj.load: Fast serialization/deserialization with symbol-key options when available.
- rescue LoadError: If Oj isn’t installed, fall back to JSON with standard library.
- puts parsed: Show the resulting Ruby object after parsing.

## X. Common Beginner Mistakes

### Pitfall 1: YAML.load on untrusted input
Bad code:
```ruby
require 'yaml'
# Never do this with external input
user = YAML.load(input_from_user)
```
Good code:
```ruby
require 'yaml'
user = YAML.safe_load(input_from_user, [Hash, Array, String, Integer, Float])
```

### Line-by-line explanation
- YAML.load can instantiate arbitrary Ruby objects, leading to remote code execution if input is malicious.
- safe_load restricts to safe data types; always specify a whitelist when handling untrusted data.

### Pitfall 2: Ignoring JSON parsing errors
Bad code:
```ruby
require 'json'
data = JSON.parse(raw_payload)
```
Good code:
```ruby
require 'json'
begin
  data = JSON.parse(raw_payload, symbolize_names: true)
rescue JSON::ParserError => e
  puts "Invalid JSON: #{e.message}"
end
```

### Line-by-line explanation
- Unhandled parse errors cause crashes or silent failures.
- Wrapping JSON parsing in rescue blocks ensures robust error handling and clearer diagnostics.

### Pitfall 3: Not sanitizing deserialized data
Bad code:
```ruby
data = JSON.parse(input, symbolize_names: true)
# Directly pass data to a database query or view
```
Good code:
```ruby
data = JSON.parse(input, symbolize_names: true)
# Normalize and validate before using
name = data[:name].to_s.strip
email = data[:email].to_s.downcase
# Use strong parameterization or validation library
```

### Line-by-line explanation
- Validating and normalizing input prevents injection, type surprises, and unexpected behavior downstream.
- Always validate shapes, required keys, and types before using data in business logic.

## Y. Why This Matters In Real Systems

- API gateways and microservices rely on clean, validated data formats to route and transform payloads reliably.
- JSON is the lingua franca of web APIs; consistent symbol/string key handling reduces bugs when integrating with clients in different languages.
- XML is common in enterprise integrations and document workflows; Nokogiri simplifies parsing and building XML while offering XPath queries for flexible data extraction.
- Serialization strategies determine performance, security, and compatibility. Marshal is fast but Ruby-specific; YAML offers readability but requires safe-loading practices; JSON provides cross-language interoperability.
- Security-conscious developers enforce strict parsing modes, avoid object deserialization risks, and validate payloads against schemas.
- Real systems balance readability, performance, and compatibility: write clean data contracts, choose safe parsing settings, and profile performance to avoid bottlenecks in API-heavy services.

## Z. Study Questions

1) What are the main differences between JSON and XML for data interchange? Mention readability, verbosity, and language interoperability.

2) How do you convert a Ruby hash into JSON and back, ensuring you have symbol keys after parsing?

3) Why is YAML.load considered risky on untrusted input, and how does YAML.safe_load mitigate that risk?

4) What is Marshal in Ruby, and why might you choose YAML or JSON over Marshal for data interchange across services?

5) Give two best-practice strategies for handling large JSON payloads in a Ruby service (e.g., streaming vs. full in-memory parsing).

## Exercise

Multi-part practical coding challenge: JSON, XML, and serialization in a small data interchange flow

Part A – JSON round-trip utility
- Create a Ruby script that:
  - Builds a nested Ruby object representing a collection of users (each user has id, name, emails as an array, and a profile with locale).
  - Serializes the collection to JSON.
  - Parses the JSON back into Ruby objects with symbolize_names: true.
  - Validates that each user has an id and a name; prints a summary line for each user.

Part B – XML export with Nokogiri
- Extend your script to export the same collection to XML using Nokogiri::XML::Builder, with a root node <users> containing <user> elements.
- Each <user> should include <id>, <name>, and a nested <emails> list of <email> nodes.
- Also parse the resulting XML back to Ruby objects (you can use Nokogiri to extract data and then map to Ruby hashes).

Part C – Serialization choices and caveats
- Serialize the collection using:
  - YAML.dump and YAML.safe_load (with a whitelist).
  - JSON (to_json) and JSON.parse (with symbolize_names).
  - Marshal.dump and Marshal.load (note any caveats for cross-process persistence).
- Print results for each path and discuss: readability, safety, and cross-language compatibility.

Starter code snippet for Part A (fill in missing pieces):
```ruby
# Part A starter
require 'json'

users = [
  { id: 1, name: "Ada", emails: ["ada@example.com"], profile: { locale: "en" } },
  { id: 2, name: "Grace", emails: ["grace@example.com"], profile: { locale: "en" } }
]

# TODO: JSON round-trip
json = users.to_json
puts "JSON: #{json}"

# TODO: parse back
parsed = JSON.parse(json, symbolize_names: true)
parsed.each do |u|
  # Ensure required fields
  puts "User ##{u[:id]}: #{u[:name]} (emails: #{u[:emails].join(', ')})"
end
```

Expected outcomes after completing Part A–C:
- A JSON string representing the users, and a Ruby array of hashes with symbol keys after parsing.
- An XML representation of the same data, and a Ruby data structure rebuilt from XML.
- Demonstrated safe YAML loading, JSON parsing, and a note on Marshal usage and its limitations for cross-system compatibility.

This completes a thorough, structured lesson on JSON, XML, and serialization in Ruby, with practical code, explanations, pitfalls, and real-world implications.