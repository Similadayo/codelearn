# Data Formats — JSON, XML, and Serialization in Go

This lesson explores how Go applications exchange data using JSON and XML, how to control serialization with struct tags, and how to customize encoding behavior. We’ll cover practical patterns you’ll use in APIs, microservices, and data pipelines, including error handling, performance considerations, and common pitfalls. By the end, you’ll be able to marshal and unmarshal data reliably, choose appropriate formats for different scenarios, and implement custom serializers when the default behavior isn’t enough.

## 1. JSON Basics in Go

JSON is the lingua franca of web APIs. In Go, the encoding/json package provides straightforward methods to marshal and unmarshal data to and from JSON, driven heavily by struct tags that define the JSON field names and options like omitempty.

Code example: JSON marshalling, pretty printing, and unmarshalling a struct with time and a few fields.

```go
package main

import (
  "encoding/json"
  "fmt"
  "log"
  "time"
)

type User struct {
  ID        int       `json:"id"`
  Name      string    `json:"name"`
  Email     string    `json:"email,omitempty"`
  CreatedAt time.Time `json:"created_at"`
  Active    bool      `json:"active"`
  Roles     []string  `json:"roles"`
}

func main() {
  u := User{
    ID:        1,
    Name:      "Alice",
    Email:     "alice@example.com",
    CreatedAt: time.Now(),
    Active:    true,
    Roles:     []string{"admin", "user"},
  }

  // Marshal to compact JSON
  data, err := json.Marshal(u)
  if err != nil {
    log.Fatalf("marshal: %v", err)
  }
  fmt.Println(string(data))

  // Marshal with indentation for readability
  dataIndent, err := json.MarshalIndent(u, "", "  ")
  if err != nil {
    log.Fatalf("marshal indent: %v", err)
  }
  fmt.Println(string(dataIndent))

  // Unmarshal back to struct
  var u2 User
  if err := json.Unmarshal(data, &u2); err != nil {
    log.Fatalf("unmarshal: %v", err)
  }
  fmt.Printf("%+v\n", u2)
}
```

### Line-by-line explanation breaking down each line

- package main: Defines the executable package.
- import (...): Imports the standard library packages used (JSON encoding, formatting, logging, and time).
- type User struct { ... }: Declares a User type with JSON struct tags to control field names and omission behavior.
  - ID int `json:"id"`: Exposes ID in JSON as "id".
  - Name string `json:"name"`: Exposes Name as "name".
  - Email string `json:"email,omitempty"`: Exposes Email as "email" but omits if empty.
  - CreatedAt time.Time `json:"created_at"`: Serializes CreatedAt as a string in RFC3339 format.
  - Active bool `json:"active"`: Serializes Active as "active".
  - Roles []string `json:"roles"`: Serializes the slice of roles.
- func main() { ... }: Entry point of the program.
- u := User{ ... }: Creates a sample User instance with values.
- data, err := json.Marshal(u): Marshals the struct into compact JSON.
- if err != nil { log.Fatalf(...)}: Error handling for marshaling.
- fmt.Println(string(data)): Prints the compact JSON string.
- dataIndent, err := json.MarshalIndent(u, "", "  "): Marshals with indentation for readability.
- if err != nil { log.Fatalf(...)}: Error handling for marshaling.
- fmt.Println(string(dataIndent)): Prints the pretty-printed JSON.
- var u2 User: Declares a variable to hold unmarshaled data.
- if err := json.Unmarshal(data, &u2); err != nil { ... }: Unmarshals JSON back into a Go value.
- fmt.Printf("%+v\n", u2): Prints the decoded struct with field names.

## 2. XML Basics in Go

If you’re interoperating with older systems or certain enterprise APIs, XML remains in use. Go’s encoding/xml package provides similar marshalling/unmarshalling capabilities with the ability to annotate fields for attributes and nested elements. XML requires a bit more boilerplate to express structure and attributes.

Code example: XML marshalling and unmarshalling with attributes and root element control.

```go
package main

import (
  "encoding/xml"
  "fmt"
)

type Person struct {
  XMLName xml.Name `xml:"person"`
  ID      int      `xml:"id,attr"`
  Name    string   `xml:"name"`
  Email   string   `xml:"email"`
  Active  bool     `xml:"active"`
}

func main() {
  p := Person{ID: 42, Name: "Bob", Email: "bob@example.com", Active: true}
  out, err := xml.MarshalIndent(p, "", "  ")
  if err != nil {
    panic(err)
  }
  fmt.Println(string(out))

  // Unmarshal back to struct
  var p2 Person
  if err := xml.Unmarshal(out, &p2); err != nil {
    panic(err)
  }
  fmt.Printf("%+v\n", p2)
}
```

### Line-by-line explanation breaking down each line

- package main: Defines the program package.
- import ("encoding/xml"; "fmt"): Imports the XML encoding package and fmt for printing.
- type Person struct { ... }: Defines an XML-mappable type.
  - XMLName xml.Name `xml:"person"`: Sets the root element name to "person".
  - ID int `xml:"id,attr"`: Serializes ID as an attribute named "id" on the root element.
  - Name string `xml:"name"`: Serializes Name as a nested element <name>.
  - Email string `xml:"email"`: Serializes Email as a nested element <email>.
  - Active bool `xml:"active"`: Serializes Active as a nested element <active>.
- func main() { ... }: Program entry.
- p := Person{...}: Creates a sample Person instance.
- out, err := xml.MarshalIndent(p, "", "  "): Marshals the struct to pretty-printed XML.
- if err != nil { panic(err) }: Basic error handling.
- fmt.Println(string(out)): Prints the XML.
- var p2 Person: Declares a variable to hold the unmarshaled value.
- if err := xml.Unmarshal(out, &p2); err != nil { panic(err) }: Unmarshals the XML.
- fmt.Printf("%+v\n", p2): Prints the decoded struct.

Notes:
- The XMLName field controls the root element name.
- The tag `xml:"id,attr"` turns the field into an XML attribute rather than a sub-element.
- Encoding/xml uses struct tags to express hierarchy; nested structs map to nested elements.

## 3. Custom Serialization with Marshaler/Unmarshaler

Go’s encoding/json (and encoding/xml) provide hooks to customize how values are serialized and deserialized. Implementing the Marshaler and Unmarshaler interfaces lets you control formatting for complex types (like times or domain-specific types) without changing your data model.

Code example: Custom JSON serialization for a time-like type, plus usage in a struct.

```go
package main

import (
  "encoding/json"
  "fmt"
  "time"
)

type CustomTime struct {
  time.Time
}

func (ct CustomTime) MarshalJSON() ([]byte, error) {
  // Serialize as a RFC3339 string
  s := ct.Time.Format(time.RFC3339)
  return []byte(`"` + s + `"`), nil
}

func (ct *CustomTime) UnmarshalJSON(b []byte) error {
  // b is the JSON string including quotes
  var s string
  if err := json.Unmarshal(b, &s); err != nil {
    return err
  }
  t, err := time.Parse(time.RFC3339, s)
  if err != nil {
    return err
  }
  ct.Time = t
  return nil
}

type User struct {
  ID     int        `json:"id"`
  Name   string     `json:"name"`
  Joined CustomTime `json:"joined"`
}

func main() {
  u := User{
    ID:     2,
    Name:   "Carol",
    Joined: CustomTime{Time: time.Date(2023, 4, 1, 10, 30, 0, 0, time.UTC)},
  }

  b, err := json.Marshal(u)
  if err != nil {
    panic(err)
  }
  fmt.Println(string(b))

  // Round-trip
  var u2 User
  if err := json.Unmarshal(b, &u2); err != nil {
    panic(err)
  }
  fmt.Printf("%+v\n", u2)
}
```

### Line-by-line explanation breaking down each line

- type CustomTime struct { time.Time }: A thin wrapper around time.Time to demonstrate custom marshaling.
- func (ct CustomTime) MarshalJSON() ([]byte, error): Implements json.Marshaler.
  - s := ct.Time.Format(time.RFC3339): Formats the time as a string.
  - return []byte(`"` + s + `"`), nil: Returns the JSON string value with quotes.
- func (ct *CustomTime) UnmarshalJSON(b []byte) error: Implements json.Unmarshaler.
  - var s string; json.Unmarshal(b, &s): Extracts the string value from JSON.
  - t, err := time.Parse(time.RFC3339, s): Parses the string into a time.Time.
  - ct.Time = t; return nil: Stores the parsed time back into the CustomTime.
- type User struct { ID int; Name string; Joined CustomTime }: Uses the CustomTime type for the Joined field.
- In main(): Creates a User with a specific Joined time, marshals to JSON, prints it, then unmarshals back and prints the result.

Why use custom serialization?
- You can enforce consistent formats across services.
- You can adapt to non-default representations (e.g., epoch seconds, non-RFC3339).
- You can preserve backward compatibility when the underlying type changes.

## X. Common Beginner Mistakes

### 1) Ignoring errors from serialization

Bad:
```go
data, _ := json.Marshal(u)
```

Good:
```go
data, err := json.Marshal(u)
if err != nil { /* handle error */ }
```

### 2) Not exporting fields or not using tags

Bad:
```go
type User struct {
  id int    // unexported; json.Marshal will skip it
  Name string `json:"name"`
}
```

Good:
```go
type User struct {
  ID    int    `json:"id"`
  Name  string `json:"name"`
  Email string `json:"email,omitempty"`
}
```

### 3) Relying on default field names without tags

Bad:
```go
type User struct {
  ID int
  Name string
}
```
This will produce JSON with "ID" and "Name" keys, which may not align with API contracts that expect lowercase names.

Good:
```go
type User struct {
  ID   int    `json:"id"`
  Name string `json:"name"`
}
```

### 4) Large payloads without streaming

Bad (reads entire payload into memory):
```go
var data []byte
json.Unmarshal(data, &v)
```

Good (streaming for large arrays):
```go
dec := json.NewDecoder(r)
for {
  var item Item
  if err := dec.Decode(&item); err == io.EOF { break }
  if err != nil { // handle
  }
  // process item
}
```

### 5) XML pitfalls: attributes vs elements and mixed usage

Bad:
```go
type Product struct {
  ID int `xml:"id"`
  Name string `xml:"name"`
}
```
This makes both fields elements, not attributes, which might not match the target schema.

Good:
```go
type Product struct {
  XMLName xml.Name `xml:"product"`
  ID      int      `xml:"id,attr"`
  Name    string   `xml:"name"`
}
```

## Y. Why This Matters In Real Systems

- API contracts and versioning: JSON field names and XML element structure become part of the contract. Changing them without versioning breaks clients.
- Performance and scalability: Use json.Decoder for streaming large payloads to avoid loading everything into memory; configure XML decoders appropriately for large documents.
- Data interchange between services: Different teams or services may require JSON or XML. Being able to design flexible models and provide multiple serializations helps with interoperability.
- Security and validation: Validate inputs after deserialization, avoid reflecting user input directly in logs, and consider strict decoding to avoid silently accepting unexpected fields.
- Serialization format trade-offs:
  - JSON: Lightweight, human-readable, widely supported, good for APIs.
  - XML: Rich schema, supports attributes, namespaces, and validation, but heavier and more verbose.
  - Custom serialization: Lets you enforce consistent formats, but requires maintenance and tests to cover edge cases.

## Z. Study Questions

1) How does the json:"name"` tag affect marshaling and unmarshaling of a struct field?
2) How do you serialize a Go struct to XML with a root element named after the struct type?
3) What is the purpose of the omitempty option in JSON tags, and when should you use it?
4) How can you customize the JSON representation of a time.Time field?
5) What is the difference between using a json.Decoder (streaming) vs json.Marshal/json.Unmarshal (in-memory), and when would you choose each?

## Exercise

Part A — Define a data model and basic JSON/XML serialization
- Create a Go program that defines a struct Article with the following fields:
  - ID int, Title string, Content string, Categories []string, PublishedAt time.Time
  - JSON tags: id, title, content, categories, published_at
  - XML tags: root element <article>, id as an attribute, title/content as elements, categories nested as <categories><category>...</category></categories>
- Implement JSON marshalling/unmarshalling using encoding/json and XML marshalling/unmarshalling using encoding/xml.
- Ensure PublishedAt serializes to RFC3339 in JSON and as an ISO-like string in XML.

Code skeleton you can adapt:
```go
package main

import (
  "encoding/json"
  "encoding/xml"
  "fmt"
  "time"
)

type Article struct {
  XMLName     xml.Name  `xml:"article"`
  ID          int       `xml:"id,attr"`
  Title       string    `xml:"title"`
  Content     string    `xml:"content"`
  Categories  []string  `xml:"categories>category"`
  PublishedAt time.Time `json:"published_at" xml:"published_at"`
}

func main() {
  a := Article{
    ID:          123,
    Title:       "Go Serialization",
    Content:     "Learn how JSON and XML are handled in Go.",
    Categories:  []string{"programming", "golang"},
    PublishedAt: time.Now(),
  }

  // JSON
  bj, err := json.Marshal(a)
  if err != nil { panic(err) }
  fmt.Println("JSON:", string(bj))

  // XML
  bx, err := xml.MarshalIndent(a, "", "  ")
  if err != nil { panic(err) }
  fmt.Println("XML:", string(bx))

  // Round-trip checks (optional)
  var aJSON Article
  if err := json.Unmarshal(bj, &aJSON); err != nil { panic(err) }
  var aXML Article
  if err := xml.Unmarshal(bx, &aXML); err != nil { panic(err) }
}
```

Part B — Streaming and validation
- Extend the program to:
  - Use a json.Decoder to stream a JSON array of articles from an input reader, decoding one Article at a time and printing only the IDs.
  - Validate that the JSON input is valid using json.Valid.
- Add small unit tests for at least one marshal/unmarshal round-trip.

Part C — Practical microservice pattern
- Suppose you have a microservice that receives a JSON payload for new articles and stores them in a database (mock storage in memory). Sketch how you would wire:
  - HTTP handler to accept POST /articles with JSON body.
  - Decode into Article (with proper error handling).
  - Log or store the Article (in-memory map).
  - Respond with 201 Created and the stored Article in JSON.
- Provide a minimal, runnable example (without external dependencies) that demonstrates:
  - HTTP server, route handling, JSON decoding, in-memory storage, and JSON response.

Hints
- Reuse struct tags consistently across JSON and XML to minimize surprises for API clients.
- Consider implementing a small helper function to convert time fields to RFC3339 consistently across formats.
- Add basic tests for JSON/XML marshal/unmarshal to catch regressions in field tags or root element configuration.

End of lesson.