# Memory Profiling and Leak Detection in Kotlin Android — Phase 5: Publishing & At-Scale

Memory profiling and leak detection are critical skills for publishing Android apps at scale. In production, small memory leaks and unprofiled allocations can accumulate, leading to GC thrashing, increased pause times, OutOfMemoryErrors, and a degraded user experience. This lesson covers core concepts, practical tooling, and actionable patterns to detect, reproduce, and fix memory issues in Kotlin Android apps, with concrete code examples you can adapt in real projects.

## 1. Understanding Memory and Leaks in Android Apps

Android apps live in a memory-constrained environment. Leaks occur when objects that are no longer needed stay reachable, preventing the GC from reclaiming memory. The most common leaks involve long-lived references to Activity or Context objects, listeners, or inner classes capturing outer references.

```kotlin
// Bad: holds a reference to an Activity in a long-lived object (potential leak)
class LeakySingleton {
    companion object {
        var activity: Activity? = null
    }
    fun cache(a: Activity) {
        activity = a
    }
}

class SomeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        LeakySingleton.cache(this) // Activity is stored strongly and may outlive the Activity
        // ...
    }
}
```

```kotlin
// Good: avoid leaking Activity by using applicationContext or WeakReference
class SafeSingleton {
    companion object {
        private var appContext: Context? = null
        fun init(context: Context) {
            appContext = context.applicationContext
        }
        fun doWork() {
            val ctx = appContext ?: return
            // Use ctx as needed (not an Activity)
        }
        fun clear() {
            appContext = null
        }
    }
}

class CleanActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SafeSingleton.init(this)
        // ...
    }

    override fun onDestroy() {
        super.onDestroy()
        SafeSingleton.clear() // clear strong reference on destroy
    }
}
```

### Line-by-line explanation

- Bad example:
  - `class LeakySingleton { companion object { var activity: Activity? = null } }` creates a static-like holder that can retain a reference to an Activity.
  - `fun cache(a: Activity) { activity = a }` stores the Activity in a static field.
  - `SomeActivity` calls `LeakySingleton.cache(this)` in `onCreate`, which means the Activity can be kept alive after destruction if not cleared.
  - This pattern can easily lead to leaks when the static reference outlives the Activity lifecycle.

- Good example:
  - `SafeSingleton` stores a Context reference but uses `applicationContext` to avoid leaking Activities.
  - `init(context: Context)` assigns `context.applicationContext`, which is lifecycle-bound to the app rather than a single Activity.
  - `clear()` explicitly nulls the stored context in `onDestroy`, ensuring no stale references remain when the Activity is finished.
  - This pattern minimizes leakage risk and is safer for long-lived singletons.

## 2. Tools for Memory Profiling in Android

Profiling tools help you observe allocations, understand heap usage, and pinpoint leaks. The two most impactful approaches are Android Studio Profiler and LeakCanary for runtime leak detection.

```gradle
// build.gradle (app) - dependencies for development
dependencies {
    debugImplementation "com.squareup.leakcanary:leakcanary-android:2.11.1"
    // Optional: for more advanced profiling
    debugImplementation "com.squareup.leakcanary:leakcanary-android-core:2.11.1"
}
```

```kotlin
// App.kt - Initialize LeakCanary in the Application class
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        if (LeakCanary.isInAnalyzerProcess(this)) {
            // This process is dedicated to LeakCanary for heap analysis.
            // Ensure you do not initialize your app in this process.
            return
        }
        LeakCanary.install(this)
    }
}
```

### Line-by-line explanation

- Gradle dependency block:
  - `debugImplementation` ensures LeakCanary is included only in debug builds, avoiding production overhead.
  - Optional core module provides additional capabilities for analyzing leaks.

- App class:
  - `LeakCanary.isInAnalyzerProcess(this)` guards against initializing app logic in LeakCanary’s analyzer process.
  - `LeakCanary.install(this)` wires up the leak detection pipeline and instrumentation in the app process.

## 3. Detecting Leaks in a Running App with LeakCanary

LeakCanary detects leaks by watching for object retention after a component’s lifecycle should have finished. A common leak scenario is a long-lived object holding a reference to an Activity.

```kotlin
class MainActivity : AppCompatActivity() {
    // Simulate a long-lived callback that could leak the Activity
    private val delayedTask = object : Runnable {
        override fun run() {
            // Use Activity here
            // ...
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Schedule a task that would keep a reference to this Activity if not managed
        Handler(Looper.getMainLooper()).postDelayed(delayedTask, 60_000L)
    }

    override fun onDestroy() {
        super.onDestroy()
        // If you forget to cancel, the Handler reference may keep the Activity alive
        Handler(Looper.getMainLooper()).removeCallbacks(delayedTask)
    }
}
```

```kotlin
// Heap dump trigger (optional, for deeper investigation)
fun triggerHeapDump(context: Context) {
    val path = File(context.externalCacheDir, "heapdump.hprof").absolutePath
    Debug.dumpHprofData(path)
}
```

### Line-by-line explanation

- Leakage-prone pattern:
  - `private val delayedTask = object : Runnable { ... }` creates an anonymous inner class that captures the outer Activity instance.
  - `postDelayed(delayedTask, 60_000L)` schedules work to run in the future, which can keep a reference to the Activity if not canceled.
  - In `onDestroy`, removing callbacks with `removeCallbacks(delayedTask)` ensures the future work won’t reference the Activity after it’s destroyed.

- Heap dump utility:
  - `triggerHeapDump` builds a path in external cache and calls `Debug.dumpHprofData(path)`, which writes a heap dump for offline analysis in Android Studio.

## 4. Practical Techniques: Avoiding Leaks in Kotlin

Preventing leaks requires disciplined patterns and defensive coding. The following examples show common anti-patterns and their safer alternatives.

```kotlin
// Anti-pattern: inner object holds implicit reference to Activity (leak risk)
class MyActivity : AppCompatActivity() {
    private val runnable = object : Runnable {
        override fun run() {
            // reference to MyActivity
        }
    }
    override fun onCreate(...) {
        super.onCreate(...)
        Handler(Looper.getMainLooper()).postDelayed(runnable, 30000)
    }
}
```

```kotlin
// Safer pattern: avoid anonymous inner classes or hold WeakReference
class MyActivity : AppCompatActivity() {
    private val weakSelf = WeakReference<MyActivity>(this)
    private val runnable = Runnable {
        val activity = weakSelf.get() ?: return@Runnable
        // safely reference activity only if still alive
        // ...
    }

    override fun onCreate(...) {
        super.onCreate(...)
        Handler(Looper.getMainLooper()).postDelayed(runnable, 30000)
    }

    override fun onDestroy() {
        super.onDestroy()
        Handler(Looper.getMainLooper()).removeCallbacks(runnable)
    }
}
```

```kotlin
// Alternative: use applicationContext for long-lived singletons
class Logger private constructor(private val appContext: Context) {
    companion object {
        @Volatile private var INSTANCE: Logger? = null
        fun getInstance(context: Context): Logger =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Logger(context.applicationContext).also { INSTANCE = it }
            }
    }
    fun log(message: String) {
        // use appContext for resources, not Activity context
        // e.g., write to file in the app's private storage
    }
}
```

### Line-by-line explanation

- Anti-pattern:
  - A long-lived anonymous Runnable references the Activity instance through the outer class, creating a potential leak if the delayed task outlives the Activity’s lifecycle.
  - The fix uses a WeakReference to the Activity, ensuring the Activity can be garbage collected if it’s no longer in use.
  - The cleanup in `onDestroy` removes any pending callbacks to prevent delayed work from keeping a reference.

- Safe singleton pattern:
  - `Logger` is constructed with an application context, avoiding Activity memory leaks.
  - The `companion object` ensures a single instance, created with the application context to avoid lifecycle-bound references.

## 5. Why This Matters In Real Systems

In real-world apps, memory inefficiencies compound at scale:
- Small leaks, if left unchecked, accumulate as users keep the app open longer or perform long sessions, eventually causing OutOfMemoryError crashes.
- In-phase releases and background processes, especially on devices with tighter memory constraints, can trigger aggressive GC that stalls UI threads, leading to jank and dropped frames.
- Production apps often run across diverse devices with different memory profiles. A leak that’s negligible on one device may become a hotspot on another with less available RAM.
- Continuous integration and release pipelines should integrate memory profiling to catch leaks before shipping, reducing hotfix cycles.

Practical usage:
- Enable LeakCanary in dev builds to catch leaks early.
- Use Android Studio Memory Profiler to observe live allocations and heap dumps during typical user flows.
- Purge long-lived references on lifecycle events (onDestroy, onStop) and favor applicationContext for long-lived singletons.
- Periodically capture heap dumps in staging to model production memory pressure and verify leaks are resolved.

## 6. Study Questions

1. What is the difference between holding a reference to an Activity versus using the Application Context for long-lived singletons?
2. How does LeakCanary help you identify memory leaks in a running app?
3. Why should you cancel delayed tasks or callbacks in lifecycle methods like onDestroy?
4. What is a heap dump, and how can Debug.dumpHprofData be used in Android to diagnose leaks?
5. Give two code patterns that reduce the risk of memory leaks in Kotlin Android apps.

## 7. Exercise

Part A: Leak demonstration and fix
- Create a small Android app with an Activity that intentionally leaks memory via a long-lived Runnable capturing the Activity.
- Add LeakCanary to the project and run the app to reproduce the leak; observe the leak report.
- Refactor the code to use a WeakReference or applicationContext as appropriate to prevent the leak.
- Take a heap dump after the fix and ensure that the previously leaked Activity is no longer retained.

Part B: Heap dump tooling
- Implement a debug-only function in an Activity that triggers a heap dump via Debug.dumpHprofData.
- Run the app, trigger a heap dump after navigating to the Activity, and inspect the heap dump in Android Studio’s memory profiler.
- Document what objects you see retained and confirm no leaks persist for the Activity after onDestroy.

Part C: Profiling discipline in a real app
- Add a small singleton (e.g., a simple Logger) that uses the Application context.
- Ensure lifecycle-aware cleanup in Activities that interacted with it.
- Create a simple test that simulates user navigation and long-lived background work, then profile memory usage to verify allocations and GC behavior remain stable.

Note: When building for release, ensure LeakCanary is excluded from the production APK and only enabled for debug builds. Also, remember to perform profiling with realistic user flows and a representative set of devices to capture real-world memory pressure.