# Module: Phase 3 — Native Device Features: Offline Storage (SQLite, AsyncStorage) in Flutter

Offline storage is essential for robust mobile apps. It lets you persist data when the network is unavailable, provide snappy offline experiences, and reduce unnecessary network traffic. In Flutter, you typically use SQLite via the sqflite package for structured data and a lightweight key-value store via shared_preferences (analogous to “AsyncStorage” in other stacks) for simple settings or caches. This lesson walks you through setting up both approaches, with concrete code, explanations, and practical patterns you can apply in real apps.

## 1. SQLite Storage in Flutter with sqflite: Schema, Model, and CRUD

In this section, you’ll learn how to set up a local SQLite database, define a data model, and implement Create, Read, Update, and Delete (CRUD) operations. We’ll also touch on migrations so your app can evolve safely.

Code: pubspec.yaml dependencies
```dart
dependencies:
  flutter:
    sdk: flutter
  sqflite: ^2.0.3
  path_provider: ^2.0.11
  path: ^1.8.0
```

### Line-by-line explanation
- defines Flutter and the necessary packages:
  - sqflite for SQLite access,
  - path_provider to locate device folders for DB storage,
  - path to handle cross-platform path joining.

Code: lib/models/note.dart
```dart
class Note {
  int? id;
  String title;
  String content;
  int timestamp;

  Note({
    this.id,
    required this.title,
    required this.content,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    final map = <String, dynamic>{
      'title': title,
      'content': content,
      'timestamp': timestamp,
    };
    if (id != null) map['id'] = id;
    return map;
  }

  factory Note.fromMap(Map<String, dynamic> map) {
    return Note(
      id: map['id'] as int?,
      title: map['title'] as String,
      content: map['content'] as String,
      timestamp: map['timestamp'] as int,
    );
  }
}
```

### Line-by-line explanation
- Note class models a single note with id, title, content, and a timestamp.
- toMap converts the Note into a Map<String, dynamic> suitable for database insertion.
- fromMap constructs a Note from a database row map.
- id is nullable to support insertion where id is auto-generated.

Code: lib/db/db_helper.dart
```dart
import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path_provider/path_provider.dart';
import '../models/note.dart';

class DBHelper {
  static final DBHelper _instance = DBHelper._internal();
  factory DBHelper() => _instance;
  DBHelper._internal();

  static Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDB();
    return _db!;
  }

  Future<Database> _initDB() async {
    final directory = await getApplicationDocumentsDirectory();
    final path = join(directory.path, 'notes.db');
    return await openDatabase(
      path,
      version: 2,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Simple migration example: add an archived flag in version 2
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE notes ADD COLUMN archived INTEGER DEFAULT 0');
    }
  }

  Future<int> insertNote(Note note) async {
    final db = await database;
    return await db.insert('notes', note.toMap());
  }

  Future<List<Note>> getNotes() async {
    final db = await database;
    final List<Map<String, dynamic>> maps =
        await db.query('notes', orderBy: 'timestamp DESC');
    return maps.map((m) => Note.fromMap(m)).toList();
  }

  Future<int> updateNote(Note note) async {
    final db = await database;
    return await db.update(
      'notes',
      note.toMap(),
      where: 'id = ?',
      whereArgs: [note.id],
    );
  }

  Future<int> deleteNote(int id) async {
    final db = await database;
    return await db.delete('notes', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> close() async {
    final db = await database;
    await db.close();
  }
}
```

### Line-by-line explanation
- DBHelper uses a singleton pattern to ensure a single database connection.
- _initDB locates a persistent path for the database file and opens (or creates) it.
- onCreate defines the initial schema for version 2 of the database.
- onUpgrade handles migrations; example shows how to add a new column when upgrading.
- insertNote, getNotes, updateNote, deleteNote implement full CRUD against the notes table.
- close shuts down the database cleanly.

Code: lib/main.dart (usage example)
```dart
import 'package:flutter/material.dart';
import 'package:your_app/db/db_helper.dart';
import 'package:your_app/models/note.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = DBHelper();

  // Insert a sample note
  final note = Note(
    title: 'Offline First',
    content: 'This note is stored locally in SQLite.',
    timestamp: DateTime.now().millisecondsSinceEpoch,
  );
  await db.insertNote(note);

  // Read all notes
  final notes = await db.getNotes();
  print('Notes count: ${notes.length}');

  // Update first note if exists
  if (notes.isNotEmpty) {
    final first = notes.first;
    first.title = 'Updated Title';
    await db.updateNote(first);
  }

  // Delete the oldest note (for demonstration)
  if (notes.length > 1) {
    await db.deleteNote(notes.last.id!);
  }

  await db.close();
}
```

### Line-by-line explanation
- main initializes Flutter bindings and the database helper.
- Inserts a sample Note to demonstrate write.
- Reads and prints the number of notes to verify read path.
- Demonstrates update and delete flows on a retrieved Note.
- Closes the database at the end.

## 2. AsyncStorage-like Key-Value Storage in Flutter with Shared Preferences

In many apps, you only need lightweight, fast key-value storage (for flags, user preferences, or small caches). shared_preferences is the Flutter analogue of AsyncStorage: simple, asynchronous, and cross-platform.

Code: pubspec.yaml (Shared Preferences)
```dart
dependencies:
  flutter:
    sdk: flutter
  shared_preferences: ^2.0.20
```

### Line-by-line explanation
- Adds the shared_preferences package to store small key-value pairs persistently.
- The API is asynchronous but straightforward: getInstance, then set/get values.

Code: lib/storage/prefs.dart
```dart
import 'package:shared_preferences/shared_preferences.dart';

class Preferences {
  static const String _lastSyncKey = 'last_sync_ms';

  Future<void> setLastSync(DateTime dt) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_lastSyncKey, dt.millisecondsSinceEpoch);
  }

  Future<DateTime?> getLastSync() async {
    final prefs = await SharedPreferences.getInstance();
    final int? ts = prefs.getInt(_lastSyncKey);
    if (ts == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(ts);
  }

  Future<void> clearLastSync() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastSyncKey);
  }
}
```

### Line-by-line explanation
- _lastSyncKey defines a stable key for storing the last synchronization timestamp.
- setLastSync converts DateTime to milliseconds and stores it.
- getLastSync reads the milliseconds and converts back to DateTime, returning null if never set.
- clearLastSync removes the key, useful for tests or user sign-out flows.

Code: lib/main_prefs_example.dart (usage)
```dart
import 'package:flutter/material.dart';
import 'package:your_app/storage/prefs.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = Preferences();

  // Store a last sync timestamp
  await prefs.setLastSync(DateTime.now());

  // Retrieve last sync timestamp
  final lastSync = await prefs.getLastSync();
  print('Last sync: ${lastSync ?? 'never'}');
}
```

### Line-by-line explanation
- Demonstrates initializing Flutter bindings and using the Preferences helper.
- Shows writing a timestamp, then reading it back and printing the result.

## 3. Putting It Together: Choosing the Right Tool and Practical Patterns

Code: lib/repositories/note_repository.dart
```dart
import 'package:your_app/db/db_helper.dart';
import 'package:your_app/models/note.dart';

class NoteRepository {
  final DBHelper _db = DBHelper();

  Future<int> addNote(String title, String content) async {
    final note = Note(
      title: title,
      content: content,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
    return await _db.insertNote(note);
  }

  Future<List<Note>> loadNotes() async {
    return await _db.getNotes();
  }

  Future<void> saveNotesAndUpdateSyncFlag(List<Note> notes) async {
    // Example combined operation: persist notes and update last-sync
    final prefs = PreferenceStore();
    final now = DateTime.now();
    for (var n in notes) {
      if (n.id == null) {
        await _db.insertNote(n);
      } else {
        await _db.updateNote(n);
      }
    }
    await prefs.setLastSync(now);
  }
}
```

Note: PreferenceStore here would be a small wrapper around shared_preferences similar to the Preferences class in section 2. The repository demonstrates combining SQLite CRUD with a lightweight sync-tracking mechanism.

### Line-by-line explanation
- NoteRepository centralizes data operations, keeping the rest of the app decoupled from storage specifics.
- addNote creates and persists a new Note.
- loadNotes reads all persisted notes.
- saveNotesAndUpdateSyncFlag demonstrates a multi-step operation including a sync timestamp update.

Code: lib/db/migration_example.dart (migration sketch)
```dart
import 'package:sqflite/sqflite.dart';

Future<void> migrateDatabase(Database db, int oldVersion, int newVersion) async {
  if (oldVersion < 2) {
    await db.execute('ALTER TABLE notes ADD COLUMN archived INTEGER DEFAULT 0');
  }
  // future migrations can be chained here
}
```

### Line-by-line explanation
- Provides a clean path to add migrations without cluttering the DB helper.
- Keeps upgrade logic isolated, making it easier to test each step.

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### 4.1 Pitfall: Not awaiting async initialization
- Bad
```dart
void init() {
  final db = DBHelper();
  // Not awaiting initialization; later calls may race
  db.database;
}
```
- Good
```dart
Future<void> init() async {
  final db = DBHelper();
  await db.database; // ensures DB is ready before using
}
```

### 4.2 Pitfall: Forgetting to close the database (resource leak)
- Bad
```dart
Future<void> insertNoteNoClose(Note note) async {
  final db = await openDatabase('notes.db');
  await db.insert('notes', note.toMap());
  // forget to close
}
```
- Good
```dart
Future<void> insertNoteSafe(Note note) async {
  final db = await DBHelper().database;
  await db.insert('notes', note.toMap());
  // DB stays managed by DBHelper singleton; close on app exit
}
```

### 4.3 Pitfall: Running heavy DB work on the UI thread without proper async patterns
- Bad
```dart
Future<void> loadNotesSync() {
  // Simulating a long block on the UI thread
  final start = DateTime.now().millisecondsSinceEpoch;
  while (DateTime.now().millisecondsSinceEpoch - start < 2000) {}
  return null;
}
```
- Good
```dart
Future<void> loadNotesAsync() async {
  final notes = await DBHelper().getNotes();
  // Update UI with the results
}
```

### 4.4 Pitfall: Ignoring null-safety and map-to-model conversions
- Bad
```dart
Note.fromMap(Map m) {
  id = m['id']; // could be null and not typed
  title = m['title'];
  content = m['content'];
}
```
- Good
```dart
factory Note.fromMap(Map<String, dynamic> map) {
  return Note(
    id: map['id'] as int?,
    title: map['title'] as String,
    content: map['content'] as String,
    timestamp: map['timestamp'] as int,
  );
}
```

### 4.5 Pitfall: Not handling migrations over app updates
- Bad
```dart
// Version fixed at 1; schema never evolves
onCreate: (db, version) {
  db.execute('CREATE TABLE notes (...');
}
```
- Good
```dart
// Manage versions and migrations explicitly
onUpgrade: (db, oldV, newV) => migrateDatabase(db, oldV, newV),
version: 2,
```

## 5. Why This Matters In Real Systems — production context and real usage

- Offline-first UX: Users expect the app to work even with spotty or no connectivity. SQLite gives instant reads and writes, reducing perceived latency.
- Data integrity and migrations: As your app evolves, schema migrations prevent data loss and preserve user data. Versioned upgrades let you add features (like an archived flag) without breaking older data.
- Sync strategies: Consider how local changes sync with a remote server. Use a lastSync timestamp (via shared_preferences) to drive incremental sync, and design conflict resolution policies for write conflicts.
- Performance and memory: Batch operations and transactions can improve performance when inserting or updating many rows. Avoid long-running DB work on the main thread.
- Testing and portability: Abstract the data layer (repositories) to make unit testing easier and to swap storage backends if needed (e.g., swapping to a different local DB or in-memory mocks for tests).

## 6. Study Questions — 5 recall questions

1. What are the primary use cases for using SQLite in a Flutter app?
2. How does the sqflite onUpgrade mechanism help with schema migrations?
3. How would you store a simple boolean flag vs a structured data record in Flutter storage?
4. Why is it important to manage a single DB instance (e.g., via a singleton DBHelper) rather than opening new connections repeatedly?
5. What is the role of SharedPreferences in offline-first apps, and what kinds of data should you store there?

## 7. Exercise — practical multi-part coding challenge

Goal: Build a small offline notes feature that uses SQLite for notes and SharedPreferences for a last-sync timestamp. You’ll implement the data layer and a tiny usage example, then sketch how you’d wire it to a UI.

Part A — Project setup
- Create a Flutter project (or add to your existing one).
- Update pubspec.yaml with:
  - sqflite, path_provider, path
  - shared_preferences

Part B — Data model and database layer
- Implement lib/models/note.dart (as shown in Section 1).
- Implement lib/db/db_helper.dart (as shown in Section 1, version 2 with a migration example).

Part C — Lightweight preferences helper
- Implement lib/storage/prefs.dart (as shown in Section 2).
- Optional: wrap SharedPreferences access in a small wrapper class if you plan multiple keys.

Part D — Repository pattern (optional but recommended)
- Implement lib/repositories/note_repository.dart (as in Section 3) to expose:
  - Future<int> addNote(String title, String content)
  - Future<List<Note>> loadNotes()
  - Future<void> syncNotesWithTimestamp(List<Note> notes) // demonstrates combined write + last-sync update

Part E — Simple usage demonstration
- Create lib/main.dart or lib/example.dart with an async function that:
  - Initializes the DB
  - Adds 2-3 notes
  - Reads and prints them
  - Updates a note
  - Stores a last-sync timestamp to SharedPreferences
  - Reads back and prints the last-sync value

Part F — Reflection questions
- How would you extend this to support deleting notes and archiving?
- How would you implement a simple conflict resolution strategy if offline edits occur on both sides (local vs remote)?
- What testing strategies would you apply to verify migrations don’t corrupt data?

Notes for the instructor or self-study:
- If you want to show a UI, you can build a minimal list screen that reads notes on init and displays them, with a button to add a new note via the repository you built.
- For real apps, consider using Drift (formerly moor) for a higher level SQLite API that provides type-safe queries and migrations, though sqflite is perfectly fine to learn first.
- For security-sensitive data, consider encryption at rest or using platform-specific secure storage for keys, while keeping user data in the database.

This structured lesson provides a comprehensive, practical foundation for offline storage in Flutter using SQLite and a lightweight AsyncStorage-equivalent approach. Use the code blocks as starting templates, adapt them to your project conventions, and iterate with migrations as your app’s data model evolves.