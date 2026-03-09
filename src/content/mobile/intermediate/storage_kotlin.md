# Phase 3 — Native Device Features: Offline Storage (SQLite, AsyncStorage) in Kotlin Android

Offline storage is foundational for resilient mobile apps. It lets you keep data locally so your app remains usable when network access is slow or unavailable. In Android with Kotlin, the two primary approaches are SQLite (via Room) for structured relational data, and an asynchronous, lightweight key-value store (DataStore) for simple preferences and small state. Mastering both lets you design offline-capable features, improve UX during connectivity hiccups, and reduce server round-trips.

## 1. Offline Storage Overview: SQLite (Room) vs Async Storage (DataStore)

This section illustrates the core philosophies and starter wiring for both approaches. You’ll see minimal, concrete snippets to bootstrap each path in a real app.

```kotlin
// 1. Room setup: an abstract database exposing a DAO
@Database(entities = [NoteEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
}

// 2. Simple Room instantiation (e.g., in a Repository or DI module)
fun provideDatabase(context: Context): AppDatabase {
    return Room.databaseBuilder(context, AppDatabase::class.java, "notes.db")
        .fallbackToDestructiveMigration() // for quick prototyping; use proper migrations in production
        .build()
}
```

```kotlin
// 3. DataStore (Preferences) setup for async, small key-value storage
// In a Kotlin file, declare a DataStore property on a Context (e.g., within an Application class)
private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

// 4. Define keys and a simple repository wrapper
object PreferencesKeys {
    val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
    val USERNAME = stringPreferencesKey("username")
}
```

### Line-by-line explanation
- 1. Room setup: AppDatabase is a RoomDatabase that exposes a NoteDao for CRUD on notes.
- 2. provideDatabase creates a Room instance tied to a SQLite DB named "notes.db" and uses a destructive migration fallback for simplicity during development.
- 3. DataStore: declares a contextual DataStore<Preferences> property named settingsDataStore to store small key-value pairs asynchronously.
- 4. PreferencesKeys defines typed keys for the DataStore so reads/writes are type-safe and consistent.

---

## 2. SQLite with Room: Defining Entities, DAO, and Database

Room provides a smooth abstraction over SQLite with compile-time checks and coroutines-friendly APIs. This section defines a simple Note model, a DAO for CRUD, and the Room database. You’ll also see how to initialize the database in code.

```kotlin
// 2.1 Entity: a single note row in SQLite
@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val content: String,
    val timestamp: Long
)
```

```kotlin
// 2.2 DAO: CRUD operations for NoteEntity
@Dao
interface NoteDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(note: NoteEntity): Long

    @Query("SELECT * FROM notes WHERE id = :id")
    suspend fun getNoteById(id: Long): NoteEntity?

    @Query("SELECT * FROM notes ORDER BY timestamp DESC")
    suspend fun getAllNotes(): List<NoteEntity>

    @Update
    suspend fun update(note: NoteEntity)

    @Delete
    suspend fun delete(note: NoteEntity)
}
```

```kotlin
// 2.3 Database: Room database that provides the DAO
@Database(entities = [NoteEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
}
```

```kotlin
// 2.4 Database provisioning: typical DI-friendly factory
fun provideDatabase(context: Context): AppDatabase {
    return Room.databaseBuilder(context, AppDatabase::class.java, "notes.db")
        .fallbackToDestructiveMigration() // replace with proper migrations in production
        .build()
}
```

### Line-by-line explanation
- 2.1 NoteEntity defines a table named "notes" with an auto-generated primary key, a title, content, and a timestamp.
- 2.2 NoteDao exposes suspend functions for insert, fetch by id, fetch all, update, and delete, enabling coroutine-friendly operations.
- 2.3 AppDatabase declares an abstract method noteDao() so Room generates the concrete implementation.
- 2.4 provideDatabase builds the database with a descriptive filename and a migration policy suitable for prototyping; in production, replace with explicit migrations to preserve user data.

---

## 3. Async Storage with DataStore: Preferences-based Key-Value (Async Storage)

DataStore provides asynchronous, scalable storage for small bits of data. It’s designed to replace SharedPreferences with a coroutine-friendly, Flow-based API. This section shows setup, writing, and reading simple app settings.

```kotlin
// 3.1 DataStore usage: read/write helpers for preferences
class SettingsRepository(private val dataStore: DataStore<Preferences>) {

    val isNotificationsEnabled: Flow<Boolean> =
        dataStore.data.map { prefs -> prefs[PreferencesKeys.NOTIFICATIONS_ENABLED] ?: true }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        dataStore.edit { prefs -> prefs[PreferencesKeys.NOTIFICATIONS_ENABLED] = enabled }
    }

    val username: Flow<String> =
        dataStore.data.map { prefs -> prefs[PreferencesKeys.USERNAME] ?: "Guest" }

    suspend fun setUsername(name: String) {
        dataStore.edit { prefs -> prefs[PreferencesKeys.USERNAME] = name }
    }
}
```

```kotlin
// 3.2 Instantiation (example usage) — in a Repository or higher layer
// Inside an Android class (e.g., ViewModel or DI module), you obtain the DataStore via Context
val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

// Example: create repository instance
val repository = SettingsRepository(context.settingsDataStore)
```

```kotlin
// 3.3 Reading/writing in a coroutine scope (typical usage)
fun observeUsername(repository: SettingsRepository) {
    viewModelScope.launch {
        repository.username.collect { user ->
            println("Current username: $user")
        }
    }
}
```

### Line-by-line explanation
- 3.1 SettingsRepository wires a Flow-based read for isNotificationsEnabled and username, providing suspend functions to update values with dataStore.edit. The default values show sensible fallbacks.
- 3.2 Demonstrates how to wire the DataStore instance on a Context and create a repository. This is typically done via DI (Dagger/Hilt/Koin) in a real app.
- 3.3 shows collecting the username Flow inside a coroutine scope (e.g., ViewModel) to reactively react to changes.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Mistakes are learning opportunities. Here are common beginner pitfalls when combining Room and DataStore, with concise bad/good examples.

- Pitfall 1: Blocking main thread with I/O
  - Bad:
  ```kotlin
  // Blocking main thread by calling a suspend function directly
  fun loadNotes(noteDao: NoteDao): List<NoteEntity> {
      return runBlocking { noteDao.getAllNotes() }
  }
  ```
  - Good:
  ```kotlin
  suspend fun loadNotes(noteDao: NoteDao): List<NoteEntity> {
      return noteDao.getAllNotes()
  }
  ```
- Pitfall 2: Not using proper migrations in Room
  - Bad:
  ```kotlin
  @Database(entities = [NoteEntity::class], version = 2)
  abstract class AppDatabase : RoomDatabase() { /* no migrations defined */ }
  ```
  - Good:
  ```kotlin
  @Database(entities = [NoteEntity::class], version = 2)
  abstract class AppDatabase : RoomDatabase() { abstract fun noteDao(): NoteDao }

  // In builder
  Room.databaseBuilder(context, AppDatabase::class.java, "notes.db")
      .addMigrations(MIGRATION_1_2)
      .build()

  val MIGRATION_1_2 = Migration_1_2()
  // Implement Migration from 1 to 2 with SQL or schema changes
  ```
- Pitfall 3: Reading DataStore synchronously on main thread
  - Bad:
  ```kotlin
  fun getUsernameSync(repo: SettingsRepository): String {
      var result = ""
      runBlocking { repo.username.first().let { result = it } }
      return result
  }
  ```
  - Good:
  ```kotlin
  suspend fun getUsername(repo: SettingsRepository): String =
      repo.username.first()
  ```
- Pitfall 4: Mixing concerns (UI code directly accessing DAOs or DataStore)
  - Bad: Accessing DAOs/DataStore from an Activity/Fragment directly and doing I/O.
  - Good: Access via a repository or use-case layer; perform I/O off the main thread; expose clean Flows/LiveData to UI.
- Pitfall 5: Not handling nulls or defaults properly
  - Bad:
  ```kotlin
  val name = prefs[PreferencesKeys.USERNAME] // could be null
  ```
  - Good:
  ```kotlin
  val name = prefs[PreferencesKeys.USERNAME] ?: "Guest"
  ```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Offline resilience: Users can view and modify data even when offline, then sync when online.
- Data integrity and migrations: Structured data (Room) supports transactional operations and schema migrations, preserving user data across app upgrades.
- Performance and power: Room uses efficient queries and coroutines; DataStore uses asynchronous I/O with Flow, reducing main-thread work and jank.
- Real-world patterns: combine Room for complex relational data (notes, chats, caches) with DataStore for settings, feature flags, and small state (theme, user preferences). Implement repository patterns, migrations, and unit/integration tests to ensure consistent behavior across offline/online states.
- Observability: Flows provide a natural mechanism for UI to react to persistence changes, enabling responsive UIs without manual polling.
- Testing: Use in-memory databases for tests; mock DataStore flows to verify UI and business logic without touching disk.

---

## Z. Study Questions — 5 recall questions

1. What are the main differences between Room (SQLite) and DataStore (Async Storage) in Android Kotlin projects?
2. How do you perform a simple insert and fetch in Room using suspend functions? Provide a minimal code snippet.
3. How can you observe changes to a DataStore value from the UI using Kotlin Flows?
4. What is a database migration and why is it important when evolving a local schema?
5. When designing an offline-first feature, what considerations determine whether to store data in Room vs DataStore?

---

## Exercise — practical multi-part coding challenge

Part A — Room-based Notes app core

- Implement a NoteEntity with fields: id (Long, auto-generated), title (String), content (String), timestamp (Long).
- Implement a NoteDao with insert, getNoteById, getAllNotes, update, delete.
- Implement AppDatabase and a provideDatabase(context) function as shown in section 2.
- Create a small coroutine-based function that inserts three sample notes and then prints all notes.

Part B — DataStore-based Settings

- Set up a Preferences DataStore with a SettingsRepository that exposes:
  - A boolean: notificationsEnabled (default true)
  - A string: username (default "Guest")
- Implement write and read helpers using suspend functions and Flows.
- Demonstrate collecting username in a coroutine and printing updates to the console.

Part C — Integration scenario

- Write a small test-like function (not a full Android UI) that:
  - Creates an in-memory Room database (for tests) and a SettingsRepository backed by DataStore (you can mock the DataStore for unit tests).
  - Inserts two notes, updates one, marks notificationsEnabled, and prints final note count and current username.
- Provide a short summary of how offline storage would behave if the device goes offline during a write.

Notes to implement in your workspace:
- Use Kotlin coroutines throughout for all I/O.
- Prefer the repository pattern to separate UI from persistence concerns.
- Include simple error handling and defaults to keep the flow robust in real devices.