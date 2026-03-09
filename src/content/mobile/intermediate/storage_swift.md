# Offline Storage in Swift iOS: SQLite and AsyncStorage

Offline storage is foundational for modern mobile apps. It enables data persistence across app launches, supports offline mode, reduces unnecessary network calls, and improves perceived performance. In Swift iOS, you typically choose a structured relational store (SQLite) for complex data and a simple key-value store (AsyncStorage-inspired) for user preferences and small caches. This lesson covers both: using SQLite (via a high-level library and a raw C API) for relational data, and using UserDefaults with Codable for lightweight asynchronous-like key-value storage.

## 1. SQLite.swift — Setup, Table Creation, and Basic CRUD

This section demonstrates using the SQLite.swift library to manage a simple users table: create the table, insert rows, and fetch rows. SQLite.swift provides a type-safe, expressive API that maps Swift types to SQLite columns.

Code block:
```swift
// 1. SQLite.swift: Setup, table creation, and simple CRUD
import Foundation
import SQLite

// Data model to map query results
struct UserModel {
  let id: Int64
  let name: String
  let email: String
}

final class SQLiteManager {
  static let shared = SQLiteManager()
  private var db: Connection?

  private init() {
    // 1) Determine a writable path in the app sandbox
    let fileManager = FileManager.default
    let documentsURL = try! fileManager.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let dbURL = documentsURL.appendingPathComponent("app.sqlite3")

    // 2) Open or create the database
    do {
      db = try Connection(dbURL.path)
    } catch {
      print("SQLite open error: \(error)")
    }
  }

  // 3) Define table and columns
  private let users = Table("users")
  private let id = Expression<Int64>("id")
  private let name = Expression<String>("name")
  private let email = Expression<String>("email")

  // 4) Create the users table
  func createUsersTable() {
    do {
      try db?.run(users.create(ifNotExists: true) { t in
        t.column(id, primaryKey: .autoincrement)
        t.column(name)
        t.column(email, unique: true)
      })
    } catch {
      print("Create table error: \(error)")
    }
  }

  // 5) Insert a user
  func insertUser(name: String, email: String) -> Int64? {
    let insert = users.insert(self.name <- name, self.email <- email)
    do {
      let rowId = try db?.run(insert)
      return rowId
    } catch {
      print("Insert error: \(error)")
      return nil
    }
  }

  // 6) Fetch all users
  func fetchUsers() -> [UserModel] {
    var result: [UserModel] = []
    guard let db = db else { return result }
    do {
      for row in try db.prepare(users) {
        let userId = row[id]
        let userName = row[name]
        let userEmail = row[email]
        result.append(UserModel(id: userId, name: userName, email: userEmail))
      }
    } catch {
      print("Fetch error: \(error)")
    }
    return result
  }
}
```

### Line-by-line explanation
- import Foundation and SQLite: Bring in core utilities and the SQLite.swift library.
- Define UserModel: A simple Swift struct to hold query results.
- SQLiteManager singleton: Ensures a single shared database connection.
- Private init: Builds a file path in the app’s documents directory and opens the database; creates it if needed.
- Columns declaration: Expressions represent columns; this is how you refer to table fields in a type-safe way.
- createUsersTable: Uses create(ifNotExists: true) to avoid errors if the table already exists; defines id as autoincrement primary key, name as text, and email as a unique constraint.
- insertUser: Builds an insert statement with bound values and executes it; returns the inserted row ID or nil on error.
- fetchUsers: Safely unwraps the database handle, iterates over all rows, maps them into UserModel instances, and returns the array.

Why this matters
- SQLite.swift offers type safety, compile-time checks, and readable code for common CRUD tasks.
- Using a dedicated relational store makes it straightforward to enforce constraints (e.g., unique emails) and perform complex queries with joins, filters, and ordering.

## 2. Raw SQLite C API — Direct SQLite usage in Swift

Some projects require direct control over the SQLite C API or avoid external dependencies. This section shows how to open a database, create a table, insert rows, and fetch data using the SQLite3 C API from Swift.

Code block:
```swift
// 2. Raw SQLite C API: Direct SQLite usage in Swift
import Foundation
import SQLite3

final class RawSQLiteManager {
  static let shared = RawSQLiteManager()
  private var db: OpaquePointer?

  private init() {
    // Build a file URL for the database
    let fm = FileManager.default
    let docsURL = try! fm.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let path = docsURL.appendingPathComponent("raw_app.sqlite").path

    // Open the database
    if sqlite3_open(path, &db) != SQLITE_OK {
      print("Unable to open database.")
      db = nil
    } else {
      createTableIfNeeded()
    }
  }

  private func createTableIfNeeded() {
    let sql = """
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT
    );
    """
    var errMsg: UnsafeMutablePointer<Int8>?
    if sqlite3_exec(db, sql, nil, nil, &errMsg) != SQLITE_OK {
      let msg = String(cString: errMsg!)
      print("Create table failed: \(msg)")
      sqlite3_free(errMsg)
    }
  }

  func insertNote(title: String, content: String) -> Int64? {
    var stmt: OpaquePointer?
    let sql = "INSERT INTO notes (title, content) VALUES (?, ?);"
    if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
      sqlite3_bind_text(stmt, 1, (title as NSString).utf8String, -1, nil)
      sqlite3_bind_text(stmt, 2, (content as NSString).utf8String, -1, nil)

      if sqlite3_step(stmt) == SQLITE_DONE {
        let rowId = sqlite3_last_insert_rowid(db)
        sqlite3_finalize(stmt)
        return rowId
      } else {
        print("Insert failed.")
      }
      sqlite3_finalize(stmt)
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db))
      print("Prepare failed: \(errmsg)")
    }
    return nil
  }

  func fetchNotes() -> [(id: Int64, title: String, content: String)] {
    var results: [(Int64, String, String)] = []
    let sql = "SELECT id, title, content FROM notes;"
    var stmt: OpaquePointer?
    if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
      while sqlite3_step(stmt) == SQLITE_ROW {
        let rowId = sqlite3_column_int64(stmt, 0)

        // Defensive accessors for TEXT columns
        let titlePtr = sqlite3_column_text(stmt, 1)
        let contentPtr = sqlite3_column_text(stmt, 2)
        let title = titlePtr != nil ? String(cString: titlePtr!) : ""
        let content = contentPtr != nil ? String(cString: contentPtr!) : ""

        results.append((rowId, title, content))
      }
      sqlite3_finalize(stmt)
    } else {
      let err = String(cString: sqlite3_errmsg(db))
      print("Fetch failed: \(err)")
    }
    return results
  }
}
```

### Line-by-line explanation
- import SQLite3: Pulls in the C API for direct use.
- RawSQLiteManager: A simple singleton to manage DB interactions.
- init: Builds a path in the documents directory and opens the database with sqlite3_open; calls createTableIfNeeded on success.
- createTableIfNeeded: Executes a literal SQL CREATE TABLE statement via sqlite3_exec to ensure the schema exists.
- insertNote: Prepares a parameterized SQL statement, binds title and content, executes, and returns the new row ID.
- fetchNotes: Prepares a SELECT, steps through results, and reads text columns with sqlite3_column_text. Converts C strings to Swift String safely, handles NULLs gracefully.
- Finalization and error checks: Always finalize statements and print errors to aid debugging.

Why this matters
- The raw C API gives you maximum control and can be more lightweight than an ORM-like layer.
- It’s essential for advanced migrations, custom query optimization, or environments where adding dependencies is restricted.

## 3. Async Storage-like Key-Value with UserDefaults (Codable)

AsyncStorage in React Native is an asynchronous, simple key-value store. In Swift, UserDefaults provides a fast, persistent key-value store for small data. When storing complex types, use Codable to encode/decode to Data.

Code block:
```swift
// 3. Async Storage: Key-Value with UserDefaults using Codable
import Foundation

final class AsyncStorage {
  // Asynchronous save to simulate AsyncStorage behavior
  static func set<T: Codable>(_ value: T, forKey key: String, completion: ((Bool) -> Void)? = nil) {
    DispatchQueue.global(qos: .background).async {
      let encoder = JSONEncoder()
      do {
        let data = try encoder.encode(value)
        UserDefaults.standard.set(data, forKey: key)
        DispatchQueue.main.async {
          completion?(true)
        }
      } catch {
        print("Encode error: \(error)")
        DispatchQueue.main.async {
          completion?(false)
        }
      }
    }
  }

  // Synchronous read
  static func get<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
    guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
    let decoder = JSONDecoder()
    do {
      return try decoder.decode(T.self, from: data)
    } catch {
      print("Decode error: \(error)")
      return nil
    }
  }

  static func remove(forKey key: String) {
    UserDefaults.standard.removeObject(forKey: key)
  }
}

// Example Codable type
struct Preferences: Codable {
  var theme: String      // "light" or "dark"
  var fontSize: Double
}
```

Usage example:
```swift
// Saving on a background thread to mirror asynchronous behavior
let prefs = Preferences(theme: "dark", fontSize: 14.0)
AsyncStorage.set(prefs, forKey: "user_prefs") { success in
  print("Saved preferences: \(success)")
}

// Reading back (synchronously; can be called from any thread)
if let loaded: Preferences = AsyncStorage.get(Preferences.self, forKey: "user_prefs") {
  print("Loaded preferences: theme=\(loaded.theme), fontSize=\(loaded.fontSize)")
}
```

### Line-by-line explanation
- AsyncStorage class: Encapsulates all storage operations to avoid scattering UserDefaults boilerplate.
- set(_:forKey:completion:): Performs encoding in a background thread, writes Data to UserDefaults, and calls the completion handler on the main thread to align with UI updates.
- JSONEncoder/Decoder: Encode and decode Codable types to/from Data for robust complex object storage.
- get(_:forKey:): Reads Data from UserDefaults, decodes it into the requested Codable type, and returns it (or nil if missing/invalid).
- remove(forKey:): Convenience to clear a stored key.
- Preferences struct: A sample Codable config object to illustrate real-world usage.

Why this matters
- UserDefaults is fast for small, frequently accessed settings and caches.
- Encoding/decoding via Codable ensures you can store more complex structures safely and maintainably.
- Offloading heavy writes to a background queue avoids blocking the UI, enabling a responsive app.

## X. Common Beginner Mistakes

Bad vs Good examples (side-by-side)

1) Pitfall: Using an in-memory database that doesn’t persist between runs
- Bad:
```swift
// Creates an in-memory DB that doesn't persist
let db = try! Connection(":memory:")
try db.run(Table("users").create { t in
  t.column(Expression<Int64>("id"), primaryKey: .autoincrement)
})
```
- Good:
```swift
// Persist to app documents directory
let fm = FileManager.default
let docs = try! fm.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
let path = docs.appendingPathComponent("app.sqlite3").path
let db = try! Connection(path)
```

2) Pitfall: Building SQL with string interpolation (risk of SQL injection and bugs)
- Bad:
```swift
let title = "O'Reilly's Guide"
let content = "Content with 'quotes' and \(title)"
let sql = "INSERT INTO notes (title, content) VALUES ('\(title)', '\(content)')"
try db.run(sql)
```
- Good:
```swift
let notes = Table("notes")
let t = Expression<String>("title")
let c = Expression<String>("content")
let insert = notes.insert(t <- title, c <- content)
try db.run(insert)
```

3) Pitfall: Not handling errors or swallowing exceptions
- Bad:
```swift
do {
  try db.run(insert) // errors ignored
} catch {
  // no-op
}
```
- Good:
```swift
do {
  try db.run(insert)
} catch {
  print("Database error: \(error)")
  // consider retry, UI feedback, or fallback
}
```

4) Pitfall: Storing non-Codable objects directly in UserDefaults
- Bad:
```swift
// Not codable; this will crash or fail serialization
let colors = ["red", "green", "blue"]
UserDefaults.standard.set(colors, forKey: "colors")
```
- Good:
```swift
struct ColorPalette: Codable { let colors: [String] }
let palette = ColorPalette(colors: ["red","green","blue"])
AsyncStorage.set(palette, forKey: "colors_palette")
```

## Y. Why This Matters In Real Systems

- Offline-first apps: SQLite provides robust local persistence for entities that must exist offline (notes, tasks, caches). It supports indexing, efficient queries, and transactions for data integrity.
- Data integrity and migrations: Real systems require schema versioning, migrations, and conflict resolution when syncing with a remote server. SQLite enables transactional migrations, and a dedicated version key can drive migration logic.
- Performance and power: Local storage reduces network latency and battery usage. Indexes and prepared statements improve query speed and avoid repeated parsing.
- Security considerations: For sensitive data, consider encryption at rest (e.g., SQLCipher) and secure handling of keys, especially if the data is user-specific.
- Observability and testing: Unit tests for database CRUD paths help prevent regression. Mocking SQLite interactions or abstracting the data layer makes tests deterministic.
- Async patterns: Even though disk I/O is fast, performing writes on background threads prevents UI freezes. Codable storage with UserDefaults is great for user preferences and small caches, but not for large datasets.

## Z. Study Questions

1) What are the primary differences between SQLite storage and UserDefaults for mobile apps? When would you choose each?
2) How do you create a table and define a primary key in SQLite.swift?
3) Why should you avoid building SQL queries with string interpolation? How do prepared statements mitigate this risk?
4) How can you store a custom Swift struct in UserDefaults? What are the steps?
5) What is a basic approach to schema migrations in a SQLite-backed store?

## Exercise

 multi-part practical coding challenge

Part A — Build a Notes store with SQLite.swift
- Tasks:
  1) Initialize a SQLite database in the app's documents directory.
  2) Create a new table named notes with columns: id (INTEGER PRIMARY KEY AUTOINCREMENT), title (TEXT), content (TEXT), created_at (TEXT).
  3) Implement a function addNote(title: String, content: String) -> Int64? that inserts a note and sets created_at to the current ISO8601 timestamp.
  4) Implement a function getAllNotes() -> [Note] that returns all notes ordered by created_at descending.
  5) Demonstrate usage by inserting two notes and printing them.

- Starter code snippet (you can place inside a Swift file in a project):
```swift
import Foundation
import SQLite

struct Note {
  let id: Int64
  let title: String
  let content: String
  let createdAt: String
}

final class NotesDB {
  static let shared = NotesDB()
  private var db: Connection?
  private let notes = Table("notes")
  private let id = Expression<Int64>("id")
  private let title = Expression<String>("title")
  private let content = Expression<String>("content")
  private let createdAt = Expression<String>("created_at")

  private init() {
    let fm = FileManager.default
    let docs = try! fm.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let path = docs.appendingPathComponent("notes.sqlite3").path
    do {
      db = try Connection(path)
      createTableIfNeeded()
    } catch {
      print("Database init error: \(error)")
    }
  }

  private func createTableIfNeeded() {
    let createSQL = notes.create(ifNotExists: true) { t in
      t.column(id, primaryKey: .autoincrement)
      t.column(title)
      t.column(content)
      t.column(createdAt)
    }
    do {
      try db?.run(createSQL)
    } catch {
      print("Create table error: \(error)")
    }
  }

  func addNote(title t: String, content c: String) -> Int64? {
    // Implement insertion with current ISO8601 timestamp
    let now = ISO8601DateFormatter().string(from: Date())
    let insert = notes.insert(self.title <- t, self.content <- c, self.createdAt <- now)
    do {
      return try db?.run(insert)
    } catch {
      print("Insert note error: \(error)")
      return nil
    }
  }

  func getAllNotes() -> [Note] {
    var results: [Note] = []
    guard let db = db else { return results }
    let query = notes.order(createdAt DESC)
    do {
      for row in try db.prepare(query) {
        let nid = row[id]
        let ntitle = row[title]
        let ncontent = row[content]
        let ncreated = row[createdAt]
        results.append(Note(id: nid, title: ntitle, content: ncontent, createdAt: ncreated))
      }
    } catch {
      print("Fetch notes error: \(error)")
    }
    return results
  }
}
```

Part B — Async storage for user preferences
- Tasks:
  1) Define a Codable Preferences struct with theme (String) and fontSize (Double).
  2) Save an instance with AsyncStorage.set and read it back with AsyncStorage.get.
  3) Simulate an update: change theme to "dark" and save again, then read to verify.

- Starter code snippet:
```swift
struct Preferences: Codable {
  var theme: String
  var fontSize: Double
}

// Save
let prefs = Preferences(theme: "light", fontSize: 14.0)
AsyncStorage.set(prefs, forKey: "user_prefs") { success in
  print("Prefs saved: \(success)")
}

// Read
if let loaded: Preferences = AsyncStorage.get(Preferences.self, forKey: "user_prefs") {
  print("Loaded prefs: theme=\(loaded.theme), fontSize=\(loaded.fontSize)")
}

// Update (simulate)
let updated = Preferences(theme: "dark", fontSize: 15.0)
AsyncStorage.set(updated, forKey: "user_prefs") { _ in
  if let reloaded: Preferences = AsyncStorage.get(Preferences.self, forKey: "user_prefs") {
    print("Updated prefs: theme=\(reloaded.theme), fontSize=\(reloaded.fontSize)")
  }
}
```

Part C — Quick offline sync simulation
- Tasks:
  1) Create a simple flag on Note to mark as "offlineEdited" if created while offline.
  2) Provide a function simulateSync() that prints notes queued for sync and then clears the flag.
- Suggested approach (conceptual; integrate with Part A):
```swift
// Extend Note model or store a parallel queue in memory or in DB table
// For brevity, pseudocode-like implementation:
// - When offline, mark notes as needingSync = true (additional column BOOLEAN)
// - sync: fetch notes WHERE needsSync == true, send to server, on success set needsSync = false
```

- Note: The exercise focuses on implementing the local storage layers; syncing logic will depend on your backend.

End of exercise. Implement and test each part in a real Swift project, ensuring you import the necessary libraries (SQLite.swift) via Swift Package Manager or Xcode dependencies.