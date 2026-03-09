# Track: Mobile App Development

Offline Storage (SQLite, AsyncStorage) in React Native

In modern mobile apps, your users expect reliable access to data even without network connectivity. Offline storage using SQLite for structured data and AsyncStorage for lightweight key-value pairs lets you build responsive, offline-first apps. This lesson covers when to use each, how to implement them in React Native, and practical patterns for real-world apps.

## 1. SQLite for Structured Offline Data

SQLite is a full relational database engine that runs on-device. Use SQLite when you have structured data, need complex queries, or require relational models (tables, indexes, joins). It enables offline capabilities with fast reads/writes and supports migrations as your schema evolves.

Code example: initialize database, create a contacts table, and perform basic CRUD operations.

```javascript
// sqlite-usage.js
import SQLite from 'react-native-sqlite-storage';
SQLite.enablePromise(true);

export async function initDB() {
  const db = await SQLite.openDatabase({ name: 'app.db', location: 'default' });
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT
    );`
  );
  return db;
}

export async function addContact(db, name, phone, email) {
  await db.executeSql(
    'INSERT INTO contacts (name, phone, email) VALUES (?, ?, ?);',
    [name, phone, email]
  );
}

export async function getContacts(db) {
  const [results] = await db.executeSql(
    'SELECT id, name, phone, email FROM contacts;'
  );
  const items = [];
  for (let i = 0; i < results.rows.length; i++) {
    items.push(results.rows.item(i));
  }
  return items;
}

export async function deleteContact(db, id) {
  await db.executeSql('DELETE FROM contacts WHERE id = ?;', [id]);
}

export async function updateContact(db, id, fields) {
  const updates = [];
  const params = [];

  if (fields.name !== undefined) {
    updates.push('name = ?'); params.push(fields.name);
  }
  if (fields.phone !== undefined) {
    updates.push('phone = ?'); params.push(fields.phone);
  }
  if (fields.email !== undefined) {
    updates.push('email = ?'); params.push(fields.email);
  }

  if (updates.length === 0) return; // nothing to update

  params.push(id);
  const sql = `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`;
  await db.executeSql(sql, params);
}
```

### Line-by-line explanation
1. Import the SQLite library for React Native.
2. Enable Promise-based API to use async/await style.
3. Define initDB to open or create the database file.
4. Open the database with a name and location.
5. Create the contacts table if it doesn't exist.
6. Return the database handle for further operations.
7. Define addContact to insert a new row with provided fields.
8. Use parameterized query to prevent injection and pass values as an array.
9. Define getContacts to fetch all contact rows.
10. Execute a SELECT query; the results object contains rows.
11. Iterate over rows and push each item to a JavaScript array.
12. Return the array of contacts.
13. Define deleteContact to remove a row by id using a parameterized query.
14. Define updateContact to support partial updates.
15. Build an updates array and a params array depending on which fields are provided.
16. If no fields to update, exit early.
17. Append the id to the parameter list and construct the SQL dynamically.
18. Execute the UPDATE statement with the built SQL and parameters.

## 2. AsyncStorage for Lightweight Key-Value Data

AsyncStorage is a simple, unstructured key-value store ideal for small pieces of state, user preferences, caches, tokens, and simple flags. It’s not suited for large datasets or complex queries, but it shines for fast, simple reads/writes.

Code example: storing and loading a user preferences object, and managing a small recent search history.

```javascript
// asyncstorage-usage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storeUserPrefs(prefs) {
  // prefs is an object; serialize to JSON
  await AsyncStorage.setItem('@app_prefs', JSON.stringify(prefs));
}

export async function loadUserPrefs() {
  const raw = await AsyncStorage.getItem('@app_prefs');
  return raw ? JSON.parse(raw) : null;
}

export async function addToRecentSearches(query) {
  try {
    const raw = await AsyncStorage.getItem('@recent_searches');
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(query);
    const trimmed = arr.slice(0, 20);
    await AsyncStorage.setItem('@recent_searches', JSON.stringify(trimmed));
  } catch (e) {
    // Optional: implement fallback or logging
  }
}

export async function getRecentSearches() {
  const raw = await AsyncStorage.getItem('@recent_searches');
  return raw ? JSON.parse(raw) : [];
}
```

### Line-by-line explanation
1. Import AsyncStorage module for key-value persistence.
2. Define storeUserPrefs to persist an object by serializing to JSON.
3. Use JSON.stringify to convert the object to a string before storage.
4. Define loadUserPrefs to read the string value.
5. Parse the JSON string back into an object; return null if not present.
6. Define addToRecentSearches to maintain a small history list.
7. Read existing history; if none, start with an empty array.
8. Add the new query to the front of the list.
9. Limit history to the most recent 20 items.
10. Persist the updated array as a JSON string.
11. Define getRecentSearches to fetch and parse the history.
12. Read and parse the stored array, returning an empty array if missing.

## 3. Hybrid Patterns: Choosing Between SQLite and AsyncStorage (and using both)

In real apps, you’ll often need both: SQLite for structured data and AsyncStorage for small, fast-access pieces of state (config, tokens, last sync time). The pattern is to use SQLite for domains that require queries and relations, and AsyncStorage for lightweight, non-relational data. You can also store meta-information (like lastSync) in AsyncStorage while keeping the main domain data in SQLite.

Code example: a small integration pattern using both storages in a single module.

```javascript
// storage-hybrid.js
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
SQLite.enablePromise(true);

export async function initHybridStore() {
  const db = await SQLite.openDatabase({ name: 'hybrid.db', location: 'default' });

  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      dueDate TEXT
    );`
  );

  // Initialize a simple meta value in AsyncStorage
  const lastSync = await AsyncStorage.getItem('@last_sync');
  if (!lastSync) {
    await AsyncStorage.setItem('@last_sync', JSON.stringify({ value: 0, ts: Date.now() }));
  }

  return { db };
}

export async function addTask(db, title, description, dueDate) {
  await db.executeSql(
    'INSERT INTO tasks (title, description, dueDate) VALUES (?, ?, ?);',
    [title, description, dueDate]
  );
}

export async function listTasks(db) {
  const [results] = await db.executeSql(
    'SELECT id, title, description, completed, dueDate FROM tasks;'
  );
  const items = [];
  for (let i = 0; i < results.rows.length; i++) {
    items.push(results.rows.item(i));
  }
  return items;
}

export async function setLastSync(ts) {
  await AsyncStorage.setItem('@last_sync', JSON.stringify({ value: ts, ts: Date.now() }));
}

export async function getLastSync() {
  const raw = await AsyncStorage.getItem('@last_sync');
  return raw ? JSON.parse(raw) : null;
}
```

### Line-by-line explanation
1. Import SQLite and AsyncStorage and enable Promise-based API for SQLite.
2. Define initHybridStore to open the database and set up the schema.
3. Create the tasks table if it does not exist; includes fields for title, description, completion, and due date.
4. Retrieve or initialize a last_sync meta value in AsyncStorage.
5. Return both the db handle to use for SQL operations.
6. Define addTask to insert a new task record with title, description, and dueDate.
7. Parameterized insertion to prevent SQL injection.
8. Define listTasks to fetch all tasks with their fields.
9. Build a JavaScript array from the SQL result rows.
10. Define setLastSync to store a timestamp-based sync state in AsyncStorage.
11. Define getLastSync to read and parse the last sync state.

## 4. X. Common Beginner Mistakes

### Pitfall 1: Storing objects without serialization in AsyncStorage

Bad:
```javascript
// BAD
await AsyncStorage.setItem('@prefs', { darkMode: true });
```

Good:
```javascript
// GOOD
await AsyncStorage.setItem('@prefs', JSON.stringify({ darkMode: true }));
```

### Pitfall 2: Not handling async/await errors

Bad:
```javascript
// BAD
const prefs = await AsyncStorage.getItem('@prefs');
```

Good:
```javascript
// GOOD
try {
  const raw = await AsyncStorage.getItem('@prefs');
  const prefs = raw ? JSON.parse(raw) : null;
} catch (e) {
  // handle error
}
```

### Pitfall 3: Ignoring SQL injections in SQLite queries

Bad:
```javascript
// BAD
db.executeSql(`DELETE FROM contacts WHERE id = ${id}`);
```

Good:
```javascript
// GOOD
db.executeSql('DELETE FROM contacts WHERE id = ?;', [id]);
```

### Pitfall 4: Not closing or properly managing DB connections

Bad:
```javascript
// BAD: open but never close; leaks resources
const db = await SQLite.openDatabase({ name: 'leak.db', location: 'default' });
// use db ...
```

Good:
```javascript
// GOOD: ensure you close when done (or reuse a global instance)
const db = await SQLite.openDatabase({ name: 'app.db', location: 'default' });
// use db ...
await db.close();
```

## 5. Y. Why This Matters In Real Systems

- User experience: Offline capability reduces perceived latency and improves reliability when network is flaky.
- Data integrity: SQLite enforces schema, constraints, and transactions, helping maintain consistent state across app sessions.
- Performance considerations: On-device storage reduces the need for network calls for common operations; AsyncStorage is fast for small state, while SQLite handles larger datasets efficiently with proper indexing.
- Migration and versioning: As apps evolve, you’ll need to migrate schemas (add columns, create new tables) without losing user data. Planning migrations early prevents breaking changes in production.
- Sync strategies: Offline-first apps often implement a sync engine that pushes local changes to a server and resolves conflicts. Storing lastSync timestamps in AsyncStorage helps determine what needs syncing.

## 6. Z. Study Questions

1. When would you choose SQLite over AsyncStorage in a React Native app?
2. How do you safely insert data into a SQLite table to avoid SQL injection?
3. What is the purpose of JSON.stringify/JSON.parse when using AsyncStorage?
4. Why is it important to consider data migrations in offline storage, and how might you approach a simple schema migration?
5. How can you combine SQLite and AsyncStorage in a single feature?

## 7. Exercise

Objective: Build a small offline-capable “Tasks” feature that uses SQLite for task data and AsyncStorage for a sync timestamp. Follow the steps below and provide a minimal working example that you could integrate into a React Native project.

Part A — Setup and Schema
- Create a module called storage/tasksStore.js.
- Implement initDB() to open SQLite database and create a tasks table with: id (INTEGER PRIMARY KEY AUTOINCREMENT), title (TEXT), description (TEXT), completed (INTEGER 0/1), dueDate (TEXT).
- Ensure the function returns the db handle.

Part B — CRUD APIs
- Implement addTask(db, task) with task = { title, description, dueDate }.
- Implement listTasks(db) returning an array of tasks.
- Implement updateTask(db, id, fields) where fields can include title, description, completed, dueDate.
- Implement deleteTask(db, id).

Part C — AsyncStorage for Sync State
- Implement setLastSynced(ts) and getLastSynced() to store and read a last-synced timestamp (in ms).

Part D — Optional Hybrid Example
- Add a function markTaskSynced(db, id) that sets a "synced" flag on the task or uses completed to indicate synced status if you choose to extend the schema.

Part E — Minimal Usage Snippet
- Provide a small React component snippet showing how you would:
  - Initialize the DB on mount.
  - Add a task.
  - List tasks and render them.
  - Update last-synced timestamp after a hypothetical sync.

Starter code snippet (starter modules only; adapt to your project structure):

```javascript
// storage/tasksStore.js
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
SQLite.enablePromise(true);

export async function initDB() {
  const db = await SQLite.openDatabase({ name: 'tasks.db', location: 'default' });
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      dueDate TEXT
    );`
  );
  return db;
}

export async function addTask(db, task) {
  const { title, description, dueDate } = task;
  await db.executeSql('INSERT INTO tasks (title, description, dueDate) VALUES (?, ?, ?);', [title, description, dueDate]);
}

export async function listTasks(db) {
  const [results] = await db.executeSql('SELECT id, title, description, completed, dueDate FROM tasks;');
  const items = [];
  for (let i = 0; i < results.rows.length; i++) {
    items.push(results.rows.item(i));
  }
  return items;
}

export async function updateTask(db, id, fields) {
  const updates = [];
  const params = [];

  if (fields.title !== undefined) { updates.push('title = ?'); params.push(fields.title); }
  if (fields.description !== undefined) { updates.push('description = ?'); params.push(fields.description); }
  if (fields.completed !== undefined) { updates.push('completed = ?'); params.push(fields.completed ? 1 : 0); }
  if (fields.dueDate !== undefined) { updates.push('dueDate = ?'); params.push(fields.dueDate); }

  if (updates.length === 0) return;
  params.push(id);
  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  await db.executeSql(sql, params);
}

export async function deleteTask(db, id) {
  await db.executeSql('DELETE FROM tasks WHERE id = ?;', [id]);
}

export async function setLastSynced(ts) {
  await AsyncStorage.setItem('@last_synced', String(ts));
}

export async function getLastSynced() {
  const raw = await AsyncStorage.getItem('@last_synced');
  return raw ? Number(raw) : 0;
}
```

Usage example (conceptual, to adapt to your component framework):

```javascript
// Example React component usage (pseudo-code)
import React, { useEffect, useState } from 'react';
import { initDB, addTask, listTasks, updateTask, deleteTask, setLastSynced, getLastSynced } from './storage/tasksStore';

export default function TasksScreen() {
  const [db, setDb] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    (async () => {
      const d = await initDB();
      setDb(d);
      const all = await listTasks(d);
      setTasks(all);
    })();
  }, []);

  const add = async () => {
    if (!db) return;
    await addTask(db, { title: 'New Task', description: 'Describe', dueDate: new Date().toISOString() });
    const all = await listTasks(db);
    setTasks(all);
  };

  const syncNow = async () => {
    const ts = Date.now();
    await setLastSynced(ts);
    // Imagine a real sync here...
  };

  // render tasks...
}
```

Notes
- This exercise emphasizes building a clean API surface for offline data access and a simple, predictable sync state stored in AsyncStorage.
- If you’re using Expo, you might swap in expo-sqlite or adapt imports accordingly.
- Consider adding migrations as your schema evolves (e.g., altering tables, adding new columns) and testing on device emulators.

If you’d like, I can tailor these examples to a specific React Native setup (bare React Native, Expo, TypeScript, etc.) or provide a ready-to-run project skeleton.