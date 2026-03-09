# Data Formats — JSON, XML, and Serialization in Python

In backend engineering, the way you encode, transmit, and store data matters as much as the data itself. JSON is the lingua franca for web APIs due to its readability and compatibility with JavaScript; XML remains prevalent in enterprise systems that require strict schemas and namespaces; and serialization (the process of converting objects to byte streams) is essential for persistence, caching, and inter-service communication. This lesson covers Python techniques for JSON, XML, and serialization, and provides practical patterns, pitfalls, and real-world considerations.

## 1. JSON in Python: Basics, Encoding, and Decoding

JSON is a lightweight, human-readable data-interchange format. In Python, the json module provides straightforward APIs for serializing Python objects to JSON strings and parsing JSON strings back into Python objects.

```python
# 1. Basic JSON serialization / deserialization
import json

data = {
    "user": {
        "id": 42,
        "name": "Alice",
        "roles": ["admin", "editor"],
        "active": True
    },
    "count": 3
}

# Serialize to a JSON-formatted string
json_str = json.dumps(data, indent=2, sort_keys=True)
print(json_str)

# Deserialize back to Python objects
parsed = json.loads(json_str)
print(parsed["user"]["name"])
```

```python
# 2. Handling non-serializable objects (e.g., datetime) with a custom default encoder
from datetime import datetime
import json

data = {
    "event": "login",
    "user": {"id": 7, "name": "Bob"},
    "time": datetime(2024, 12, 25, 17, 45, 0)
}

def default_encoder(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

# This will convert datetime to an ISO 8601 string
json_str = json.dumps(data, default=default_encoder, indent=2)
print(json_str)

# Deserializing JSON will give strings for the 'time' field
parsed = json.loads(json_str)
print(parsed["time"])  # Note: this is a string, not a datetime object
```

### Line-by-line explanation
- Import json to access JSON utilities.
- Create a Python dictionary representing a simple payload (section 1) or an event (section 2).
- json.dumps converts Python objects to a JSON-formatted string.
- indent=2 pretty-prints the JSON for readability; sort_keys=True sorts keys alphabetically.
- json.loads parses a JSON string back into Python objects (dicts and lists).
- In the second block, a custom default_encoder handles non-serializable types (datetime); it converts datetimes to ISO strings. If an unsupported type is encountered, it raises TypeError.
- After serialization, you will often receive strings for values that were originally non-serializable (like datetime); you may need to convert them back to Python objects as needed.

## 2. XML in Python: Building and Parsing

XML is a flexible, schema-enabled format used widely in enterprise integrations and configurations. Python’s built-in xml.etree.ElementTree provides a clean API to construct and parse XML documents.

```python
# 1. Building a simple XML document with ElementTree
import xml.etree.ElementTree as ET

root = ET.Element('user')
ET.SubElement(root, 'id').text = '123'
ET.SubElement(root, 'name').text = 'Alice'
emails = ET.SubElement(root, 'emails')
ET.SubElement(emails, 'email').text = 'alice@example.com'
ET.SubElement(emails, 'email').text = 'alice@work.com'

xml_str = ET.tostring(root, encoding='unicode')
print(xml_str)
```

```python
# 2. Parsing XML back into Python data
import xml.etree.ElementTree as ET

xml_str = """
<user>
  <id>123</id>
  <name>Alice</name>
  <emails>
    <email>alice@example.com</email>
    <email>alice@work.com</email>
  </emails>
</user>
"""

root = ET.fromstring(xml_str)
user_id = root.find('id').text
name = root.find('name').text
emails = [e.text for e in root.find('emails').findall('email')]

print(user_id, name, emails)
```

### Line-by-line explanation
- Import the ElementTree module for XML handling.
- ET.Element('user') creates the root element named “user”.
- ET.SubElement creates and attaches child elements under a parent.
- The .text attribute is used to set the textual content of an XML node.
- ET.tostring converts the ElementTree into an XML string; encoding='unicode' returns a Python str.
- In the parsing example, ET.fromstring parses an XML string into an ElementTree.
- root.find('id').text retrieves the text content of the first matching child named 'id'.
- root.find('emails').findall('email') returns a list of all <email> elements; comprehension extracts their text.

## 3. Serialization in Python: Pickle and Safe Alternatives

Serialization is the process of converting in-memory objects to a byte stream for storage or transmission. Python’s pickle module can serialize many Python objects, but it poses security risks if the data comes from untrusted sources. For inter-process or network communication, prefer formats like JSON. When you must persist Python objects locally and trust the source, pickle offers a convenient binary format.

```python
# 1. Basic pickle serialization (trusted data)
import pickle

class User:
    def __init__(self, user_id, name):
        self.user_id = user_id
        self.name = name

u = User(1, 'Alice')

payload = pickle.dumps(u)
restored = pickle.loads(payload)

print(type(restored), restored.name)
```

```python
# 2. Safety note and JSON-based alternative for untrusted data
# BAD: loading untrusted pickle data (security risk)
# loaded = pickle.loads(untrusted_bytes)

# Good: use JSON for interoperability and safety
import json
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class UserDTO:
    user_id: int
    name: str
    joined: datetime

u = UserDTO(1, 'Alice', datetime(2024, 5, 17, 10, 30))

def serialize_user_json(obj: UserDTO) -> str:
    def default(o):
        if isinstance(o, datetime):
            return o.isoformat()
        raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")
    return json.dumps(asdict(obj), default=default, indent=2)

json_rep = serialize_user_json(u)
print(json_rep)
```

### Line-by-line explanation
- In the first block, a simple class is defined and instantiated; pickle.dumps converts the object to a binary representation.
- pickle.loads reconstructs the object from the binary data.
- The code demonstrates restoring the same object type and attributes after round-tripping.
- The second block emphasizes security: never unpickle data from untrusted sources because it can lead to arbitrary code execution.
- As an alternative, use JSON with a dataclass-like structure to achieve portable, readable, and safer serialization.
- The dataclass UserDTO is a lightweight data container; asdict converts it to a dictionary suitable for JSON serialization.
- The serialize_user_json function uses a custom default function to handle datetime objects, converting them to ISO strings.
- json.dumps with the default parameter ensures non-serializable objects are properly transformed.

## X. Common Beginner Mistakes

- Bad vs Good: JSON serialization of datetime
- Bad:
  ```python
  import json
  data = {"time": datetime.now()}
  json_str = json.dumps(data)
  ```
  - This fails because datetime is not JSON-serializable.
- Good:
  ```python
  import json
  from datetime import datetime
  data = {"time": datetime.now()}
  def default(o):
      if isinstance(o, datetime):
          return o.isoformat()
      raise TypeError
  json_str = json.dumps(data, default=default)
  ```
- Bad vs Good: Build XML via string concatenation
- Bad:
  ```python
  id_ = 42
  name = "Alice"
  xml = "<user><id>{}</id><name>{}</name></user>".format(id_, name)
  ```
  - Prone to injection, escaping issues, and error-prone escaping.
- Good:
  ```python
  import xml.etree.ElementTree as ET
  root = ET.Element('user')
  ET.SubElement(root, 'id').text = str(42)
  ET.SubElement(root, 'name').text = 'Alice'
  xml_str = ET.tostring(root, encoding='unicode')
  ```
- Bad vs Good: Using pickle for untrusted data
- Bad:
  ```python
  import pickle
  data = get_untrusted_bytes()
  obj = pickle.loads(data)  # dangerous
  ```
- Good:
  ```python
  # Prefer JSON or another safe serializer for untrusted data
  import json
  data = json.loads(untrusted_json)
  ```
- Bad vs Good: Not validating JSON against a schema
- Bad:
  ```python
  import json
  payload = '{"id": 123, "name": "Alice"}'
  obj = json.loads(payload)  # assumes fields exist, can fail later
  ```
- Good:
  ```python
  import json
  from typing import TypedDict
  class User(TypedDict):
      id: int
      name: str

  payload = '{"id":123,"name":"Alice"}'
  data = json.loads(payload)
  user: User = data  # or explicitly validate/convert with a schema tool
  ```
- Bad vs Good: Non-ASCII characters handling
- Bad:
  ```python
  data = {"text": "こんにちは"}
  json_str = json.dumps(data)  # may escape non-ASCII characters
  ```
- Good:
  ```python
  data = {"text": "こんにちは"}
  json_str = json.dumps(data, ensure_ascii=False)
  ```

## Y. Why This Matters In Real Systems

- Interoperability: JSON is the de facto standard for RESTful APIs and microservices; XML remains prevalent in industries with strict schemas (e.g., finance, healthcare) or with legacy integrations.
- Performance and size: JSON tends to be lighter and faster to parse than XML, but XML can carry richer schemas and namespaces. Choose the right format based on requirements, not whim.
- Validation and contracts: JSON Schema and XML Schema help enforce data contracts, evolve schemas safely, and catch mismatches early in CI/CD or runtime.
- Security considerations: Never deserialize data from untrusted sources with formats that allow code execution (e.g., pickle). Prefer JSON or other safe formats for external boundaries.
- Serialization strategy: Use human-readable formats for APIs and logs; use binary/compact formats for internal storage and caching where appropriate.
- Data fidelity and time handling: When encoding dates, times, or fuzzy types, pick consistent representations (ISO strings, epoch milliseconds) and ensure you convert back correctly on the receiving end.
- Versioning and backward-compatibility: Plan schema evolution, deprecation paths, and clear errors for incompatible payloads to avoid breaking downstream services.

## Z. Study Questions

1) What are the primary differences between JSON and XML in terms of readability and schema support?
2) How do you handle non-serializable Python objects (like datetime) when encoding to JSON in Python?
3) Why is using pickle unsafe for untrusted data, and what safer alternatives exist?
4) How can you convert a Python dataclass instance to a JSON string and reconstruct it from JSON?
5) What are some best practices for validating and evolving data schemas in JSON or XML in production systems?

## Exercise

Part A: JSON with datetime handling
- Given a Python dict containing a datetime object, implement a function to serialize to JSON with the datetime converted to ISO format, and then deserialize back in a usable form (e.g., a dict with the datetime parsed back).

Part B: XML round-trip
- Build an XML representation of a user payload (id, name, and a list of emails) using ElementTree, then parse the XML back into Python variables and verify the values.

Part C: Dataclass to JSON and back
- Create a dataclass User with fields id: int, name: str, joined: datetime. Write code to serialize this dataclass to JSON and then reconstruct the dataclass instance from the JSON data.

Part D: Simple pickle usage (trusted data)
- Demonstrate serializing and deserializing a small Python object using pickle, highlighting that the data must come from a trusted/controlled source.

Part E: Quick integration task
- Given a small service payload, implement three functions:
  1) to_json_with_datetime(data) -> str (handles datetime)
  2) dict_to_xml_str(data) -> str (builds a simple XML)
  3) from_json_and_xml_roundtrip(payload_json) -> dict (parses JSON, then parses a corresponding XML payload and merges results safely)
- Provide test inputs and show the expected outputs for each function.

End of lesson.