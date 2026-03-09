# Data Structures — Arrays, Objects & Maps in Python

In backend engineering, Python's data structures are the building blocks for processing requests, transforming data, and interfacing with databases and APIs. Lists (arrays), dictionaries (maps/objects), and their nested forms are used to model records, configure services, cache results, and serialize/deserialize JSON payloads. Mastery of these structures leads to clearer APIs, safer data transformations, and more maintainable services.

## 1. Arrays in Python (Lists)

Code examples demonstrate creating, indexing, slicing, mutating, and transforming lists, plus common idioms like list comprehensions.

```python
# 1. Arrays in Python (Lists)
array = [10, 20, 30, 40, 50]

# Access by index (0-based)
first = array[0]      # 10
last = array[-1]       # 50

# Slicing
middle = array[1:3]     # [20, 30]

# Mutating the list
array.append(60)           # [10, 20, 30, 40, 50, 60]
array.extend([70, 80])     # [10, 20, 30, 40, 50, 60, 70, 80]
array.insert(0, 0)           # [0, 10, 20, 30, 40, 50, 60, 70, 80]

# Remove by value
array.remove(30)             # [0, 10, 20, 40, 50, 60, 70, 80]

# Pop last (or specify index)
popped = array.pop()         # pops 80 -> [0, 10, 20, 40, 50, 60, 70], popped = 80

# Sorting
array.sort()                 # [0, 10, 20, 40, 50, 60, 70]
array.sort(reverse=True)     # [70, 60, 50, 40, 20, 10, 0]

# List comprehension
squares = [x * x for x in range(5)]     # [0, 1, 4, 9, 16]

# Filtering with comprehension
evens = [n for n in array if n % 2 == 0]  # [60, 40, 20, 10, 0]
```

### Line-by-line explanation
- line 1: Define a list named array with five integer elements.
- line 4: Access the first element (index 0) and assign to first.
- line 5: Access the last element using negative indexing and assign to last.
- line 8: Create a sublist from index 1 to 2 (not including 3) and assign to middle.
- line 10: Append 60 to the end of the list.
- line 11: Extend the list with two more elements (70, 80).
- line 12: Insert 0 at the start of the list (index 0).
- line 14: Remove the first occurrence of the value 30 from the list.
- line 17: Pop and return the last element, updating the list.
- line 20: Sort the list in ascending order.
- line 21: Sort the list in descending order.
- line 24: Create a new list of squares for numbers 0 through 4 using a comprehension.
- line 27: Create a new list evens containing only even numbers from array.

## 2. Dictionaries (Maps / Objects)

Code examples show creating dictionaries, accessing and mutating keys, safe retrieval, merging, and dictionary comprehensions.

```python
# 2. Dictionaries (Maps / Objects)
config = {
    "host": "db.example.com",
    "port": 5432,
    "credentials": {"user": "dbuser", "password": "s3cr3t"},
    "options": ["read-write", "pool-5"],
}

# Basic access
host = config["host"]          # "db.example.com"
port = config.get("port", 5432)  # 5432 (default if missing)

# Mutate/add keys
config["port"] = 5433
config["timeout"] = 30            # add new key

# Keys/values/items
all_keys = list(config.keys())       # ["host","port","credentials","options","timeout"]
all_values = list(config.values())     # [... values ...]
items = list(config.items())           # [("host", "..."), ...]

# Safe defaults
timeout = config.get("timeout", 60)     # 30 (existing)

# setdefault initializes if missing
config.setdefault("retry", 3)           # adds "retry": 3 if absent

# Dict comprehension (copy)
inverted = {k: v for k, v in config.items()}  # shallow copy

# Merging dictionaries (Python 3.9+ style)
base = {"host": "localhost", "port": 8080}
overrides = {"port": 9090, "debug": True}
merged = {**base, **overrides}  # port overwritten to 9090, debug added

# Example: map user names to their lengths
names = ["Alice", "Bob", "Carol"]
lengths = {name: len(name) for name in names}  # {"Alice": 5, "Bob": 3, "Carol": 5}
```

### Line-by-line explanation
- line 5: Define a dictionary config with nested credentials and options.
- line 9: Retrieve the host using key access; raises KeyError if missing, or use get for default behavior.
- line 10: Retrieve port with a default of 5432 if the key is missing.
- line 13-14: Update an existing value (port) and add a new key (timeout).
- line 17-19: Retrieve keys, values, and items as lists for inspection or iteration.
- line 22: Use get to fetch timeout with default, showing safe access.
- line 25: setdefault ensures a key exists with a default value.
- line 28: Create a shallow copy of the dictionary using a comprehension.
- line 31-32: Merge two dictionaries; in case of conflicts, overrides take precedence.
- line 35-36: Create a dictionary mapping each name to its length using a comprehension.

## 3. Nested and Complex Data Structures

Code examples illustrate combining lists and dictionaries, building indexes, and performing transformations on nested data.

```python
# 3. Nested and Complex Data Structures
users = [
    {"id": 1, "name": "Alice", "roles": ["admin", "user"]},
    {"id": 2, "name": "Bob", "roles": ["user"]},
    {"id": 3, "name": "Carol", "roles": ["moderator", "user"]},
]

# Access Carol's second role
carol = next((u for u in users if u["name"] == "Carol"), None)
carol_role2 = carol["roles"][1] if carol and len(carol["roles"]) > 1 else None  # "user"

# Add a new user
users.append({"id": 4, "name": "Dave", "roles": ["user"]})

# Build an index by id (id -> user)
id_index = {u["id"]: u for u in users}
# id_index[3] -> {"id": 3, "name": "Carol", "roles": ["moderator","user"]}

# Group users by role (role -> list of names)
from collections import defaultdict
role_to_names = defaultdict(list)
for u in users:
    for r in u["roles"]:
        role_to_names[r].append(u["name"])

# Examples of usage
admins = role_to_names.get("admin", [])       # ["Alice"]
user_names = role_to_names.get("user", [])    # ["Alice","Bob","Carol","Dave"]
```

### Line-by-line explanation
- line 3: Define a list of user dictionaries with id, name, and roles.
- line 6-8: Find Carol in the list and extract her second role safely.
- line 11: Append a new user to the list.
- line 14: Create a dictionary that maps user id to the corresponding user dict.
- line 16-21: Build a role-to-names mapping by iterating users and their roles, using defaultdict to collect names per role.
- line 25-26: Fetch names for the "admin" and "user" roles, showing typical query results.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

### Pitfall 1: Mutable default arguments

Bad:
```python
def append_to_list(item, acc=[]):
    acc.append(item)
    return acc
```

### Line-by-line explanation
- line 1: Define a function with a mutable default argument acc.
- line 2-3: Append and return; the default list persists across calls.

Good:
```python
def append_to_list(item, acc=None):
    if acc is None:
        acc = []
    acc.append(item)
    return acc
```

### Line-by-line explanation
- line 1: Default acc is None to avoid shared state.
- line 2: If None, create a new list.
- line 3-4: Append and return, with fresh state on each call when not provided.

### Pitfall 2: Modifying a list while iterating

Bad:
```python
nums = [1, 2, 3, 4, 5]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
```

### Line-by-line explanation
- line 2: Iterate directly over nums.
- line 4: Removing elements while iterating causes skipping and inconsistent results.

Good:
```python
nums = [1, 2, 3, 4, 5]
for n in nums[:]:
    if n % 2 == 0:
        nums.remove(n)
```

### Line-by-line explanation
- line 2: Iterate over a shallow copy nums[:] to avoid mutation during iteration.
- line 4: Remove even numbers safely.

### Pitfall 3: Using a mutable type as a dict key

Bad:
```python
# This will raise TypeError: unhashable type: 'list'
d = {[1, 2]: "value"}
```

### Line-by-line explanation
- line 2: Attempt to use a list as a dictionary key; lists are unhashable.

Good:
```python
d = {(1, 2): "value"}  # tuples are hashable and usable as keys
```

### Line-by-line explanation
- line 1: Use a tuple as the dict key; tuples are hashable if their contents are hashable.

### Pitfall 4: Shallow copy vs deep copy for nested structures

Bad:
```python
import copy
a = [[1, 2], 3]
b = a.copy()      # shallow copy
b[0].append(9)
# a is now [[1, 2, 9], 3] because inner list is shared
```

### Line-by-line explanation
- line 4: b is a shallow copy; inner lists are referenced.
- line 5-6: Mutating b[0] also mutates a[0].

Good:
```python
import copy
a = [[1, 2], 3]
b = copy.deepcopy(a)  # deep copy
b[0].append(9)
# a remains [[1, 2], 3], b is [[1, 2, 9], 3]
```

### Line-by-line explanation
- line 2: Use deepcopy to clone nested structures.
- line 4-5: Mutating b[0] does not affect a.

## 5. Why This Matters In Real Systems

- Performance: Lists and dicts provide O(1) average-case lookups and efficient in-memory data manipulation, which is critical for request handling, caching layers, and in-memory queues.
- Predictability: Using the right structure (e.g., dict for key-based access, list for ordered sequences) reduces complexity and bugs in API logic, serializers, and data pipelines.
- JSON and APIs: Python dictionaries map directly to JSON objects; understanding how to serialize/deserialize with json.dumps and json.loads enables smooth API integration.
- Concurrency considerations: Backend services may read/write shared data structures; careful mutation, copying, and thread-safety patterns matter (e.g., avoiding shared mutable defaults, choosing immutable patterns where possible).
- Data modeling: Complex nested data (lists of dicts, dicts of lists) mirrors common data models (records, user profiles, configuration trees) and enables flexible transformations, filtering, and indexing in data processing pipelines.

## 6. Study Questions

1. What is the difference between a Python list and a tuple, and when would you choose one over the other?
2. How do you safely provide a default value for a missing key in a dictionary?
3. How can you merge two dictionaries so that the second overwrites the first on conflicts?
4. Why is mutating a list while iterating a pitfall, and what is a safe pattern to remove items?
5. How would you transform a list of user dictionaries into a mapping from id to user name using a dictionary comprehension?

## 7. Exercise

Part A: Build a small in-memory registry of people with IDs, names, and roles. Implement basic CRUD-like operations and a couple of queries.

- Create an initial registry (list of dictionaries) with at least 3 people.
- Implement:
  - add_person(registry, person): add a dict representing a person.
  - get_person_by_id(registry, id): return the person dict or None.
  - update_person_name(registry, id, new_name): update the name in-place; return True if found.
  - add_role_to_person(registry, id, role): add a role to the person’s roles list if present.
- Build an id -> person index to speed lookups.
- Implement a function to find all people with a given role and return their names.

Part B: Serialization round-trip.

- Implement to_json(registry) to serialize the registry to a JSON string.
- Implement from_json(json_str) to reconstruct the registry as a Python object.

Part C: Practical usage.

- Demonstrate each function with a short script that creates a registry, performs a few updates, queries by role, then serializes to JSON and back.

Code scaffold you can start from (you will fill in the details):

```python
import json
from typing import List, Dict, Optional

def add_person(registry: List[Dict], person: Dict) -> None:
    registry.append(person)

def get_person_by_id(registry: List[Dict], id: int) -> Optional[Dict]:
    for p in registry:
        if p.get("id") == id:
            return p
    return None

def update_person_name(registry: List[Dict], id: int, new_name: str) -> bool:
    person = get_person_by_id(registry, id)
    if not person:
        return False
    person["name"] = new_name
    return True

def add_role_to_person(registry: List[Dict], id: int, role: str) -> bool:
    person = get_person_by_id(registry, id)
    if not person:
        return False
    roles = person.setdefault("roles", [])
    if role not in roles:
        roles.append(role)
    return True

def to_json(registry: List[Dict]) -> str:
    return json.dumps(registry)

def from_json(json_str: str) -> List[Dict]:
    return json.loads(json_str)

# Example usage
if __name__ == "__main__":
    registry = [
        {"id": 1, "name": "Alice", "roles": ["admin"]},
        {"id": 2, "name": "Bob", "roles": ["user"]},
        {"id": 3, "name": "Carol", "roles": ["user", "moderator"]},
    ]

    add_person(registry, {"id": 4, "name": "Dave", "roles": ["user"]})
    update_person_name(registry, 2, "Robert")
    add_role_to_person(registry, 1, "auditor")

    admins = [p["name"] for p in registry if "admin" in p.get("roles", [])]
    json_str = to_json(registry)
    registry_copy = from_json(json_str)

    print("Admins:", admins)
    print("JSON length:", len(json_str))
```

End of lesson.