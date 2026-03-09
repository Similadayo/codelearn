# Memory Profiling and Leak Detection in Flutter (Phase 5 — Publishing & At-Scale)

Memory management is a first-class concern in mobile development. In Flutter, leaks and unbounded memory growth can silently erode performance, drain battery, and cause crashes on mid-to-larger devices. This lesson teaches how to profile memory, detect leaks, and apply practical patterns to keep apps healthy at scale—especially as your codebase and user base grow.

## 1. Baseline Demo: A Leaky Widget and Observing Memory Growth

This example demonstrates how a poorly managed widget can contribute to increasing memory usage over time. The widget creates ongoing allocations on a timer and stores them in a list, but it intentionally neglects proper disposal to illustrate how leaks manifest in a Flutter app.

```dart
import 'package:flutter/material.dart';
import 'dart:async';

class MemoryLeakDemo extends StatefulWidget {
  @override
  _MemoryLeakDemoState createState() => _MemoryLeakDemoState();
}

class _MemoryLeakDemoState extends State<MemoryLeakDemo> {
  final List<int> _bigList = [];
  Timer _timer;

  @override
  void initState() {
    super.initState();
    // Simulate ongoing allocations that will leak if not canceled
    _timer = Timer.periodic(Duration(milliseconds: 16), (t) {
      // Allocate a chunk of data every tick
      _bigList.addAll(List.generate(1000, (i) => i));
      // Intentionally not calling setState; focus is on allocations
    });
  }

  @override
  void dispose() {
    // Intentionally not cancelling the timer to demonstrate a leak
    // _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Memory Leak Demo')),
      body: Center(child: Text('Leaky widget running...')),
    );
  }
}
```

### ### Line-by-line explanation
- import 'package:flutter/material.dart'; — Bring in Flutter UI components.
- import 'dart:async'; — Access Timer for periodic work.
- class MemoryLeakDemo extends StatefulWidget — A stateful widget to hold long-lived state.
- _MemoryLeakDemoState — State object that manages allocations.
- final List<int> _bigList = []; — Holds onto a growing collection; prevents GC from reclaiming memory.
- Timer _timer; — Reference to the periodic task so we can cancel it later.
- initState() — Set up initial behavior on creation.
- _timer = Timer.periodic(...); — Schedule a recurring task that allocates memory each tick.
- _bigList.addAll(List.generate(1000, (i) => i)); — Simulates heavy allocations without releasing them.
- dispose() — Called when the widget is removed; in this leaky version we deliberately skip cancelling the timer to show retention.
- build(...) — Minimal UI; the focus is the memory behavior, not UI.

## 2. Detecting Leaks with DevTools: Instrumentation and Snapshots

DevTools memory profiling is the primary tool for detecting leaks in Flutter apps. To complement memory snapshots, you can instrument code to track suspicious retention patterns. The example below introduces a lightweight instrument that counts allocations and disposals, helping you spot mismatches that often indicate leaks. In real scenarios, you’d pair this with Dart DevTools memory snapshots.

```dart
class LeakCounter {
  static int created = 0;
  static int disposed = 0;

  static void logCreate() => created++;
  static void logDispose() => disposed++;

  static int get live => created - disposed;

  static void reset() {
    created = 0;
    disposed = 0;
  }
}

class TrackableObject {
  TrackableObject() {
    LeakCounter.logCreate();
  }

  void dispose() {
    LeakCounter.logDispose();
  }
}
```

```dart
class LeakDetectorDemo extends StatefulWidget {
  @override
  _LeakDetectorDemoState createState() => _LeakDetectorDemoState();
}

class _LeakDetectorDemoState extends State<LeakDetectorDemo> {
  final List<TrackableObject> _items = [];

  void addItems(int n) {
    for (int i = 0; i < n; i++) {
      _items.add(TrackableObject());
    }
    setState(() {}); // update UI if needed
  }

  void removeAll() {
    // Correct disposal pathway
    for (var o in _items) o.dispose();
    _items.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Leak Detector Demo')),
      body: Center(child: Text('Trackable objects live: ${LeakCounter.live}')),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          addItems(50);
        },
        child: Icon(Icons.add),
      ),
    );
  }

  @override
  void dispose() {
    // Ensure we dispose everything on widget removal
    removeAll();
    super.dispose();
  }
}
```

### ### Line-by-line explanation
- class LeakCounter — Centralized tally of created vs disposed objects.
- static int created/disposed — Counters for allocations and disposals.
- logCreate()/logDispose() — Increment counters when objects are created or disposed.
- get live — Live (retained) instances count; used to infer leaks.
- reset() — Reset counters for fresh runs.
- class TrackableObject — Represents an object that participates in leak tracking.
- TrackableObject() { LeakCounter.logCreate(); } — Instrumented constructor.
- void dispose() { LeakCounter.logDispose(); } — Explicit disposal call.
- class LeakDetectorDemo — A widget that uses TrackableObject to illustrate retention.
- final List<TrackableObject> _items — Holds onto created objects; potential leak source.
- addItems(n) — Create new objects and store them in the list.
- removeAll() — Proper disposal and cache clearing to avoid leaks.
- dispose() — Ensures all tracked items are cleaned when the widget is torn down.
- The on-screen counter shows live count, which DevTools should corroborate with memory snapshots.

Note: This approach helps you correlate on-device allocations with DevTools snapshots. Real memory leaks are best observed via DevTools' Memory page (Heap snapshot, Retained size, and Object counts). The instrumentation helps you quickly sanity-check that you’re not forgetting disposal in complex flows.

## 3. Best Practices: Safe Resource Management in Flutter

A wide range of leaks come from streams, animation controllers, timers, and caches that outlive their widgets. The code below demonstrates a canonical pattern: initialize resources in initState and always dispose them in dispose, even when the widget is removed while a user navigates quickly.

```dart
import 'package:flutter/material.dart';
import 'dart:async';

class SafeResourceWidget extends StatefulWidget {
  @override
  _SafeResourceWidgetState createState() => _SafeResourceWidgetState();
}

class _SafeResourceWidgetState extends State<SafeResourceWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final StreamSubscription<int> _subscription;

  @override
  void initState() {
    super.initState();

    // Resource 1: AnimationController
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    // Resource 2: A simple periodic stream
    _subscription = Stream.periodic(const Duration(seconds: 1), (n) => n)
        .listen((value) {
      // Do something with the value (e.g., update state)
      setState(() {});
    });
  }

  @override
  void dispose() {
    // Always cancel subscriptions and dispose controllers
    _subscription.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Safe Resource Widget')),
      body: Center(child: Text('Resources are properly disposed.')),
    );
  }
}
```

### ### Line-by-line explanation
- import 'package:flutter/material.dart'; and import 'dart:async'; — Bring in UI and asynchronous primitives.
- class SafeResourceWidget extends StatefulWidget — A widget that uses resources requiring cleanup.
- _controller = AnimationController(...).repeat(); — Creates an ongoing animation; requires disposal.
- _subscription = Stream.periodic(...).listen((value) { ... }); — Subscribes to a periodic stream, which must be canceled to avoid leaks.
- dispose() — Ensures both resources are released in the correct order: cancel the subscription before disposing the controller.
- setState(() {}); — Trigger UI updates in response to stream events (safe here because we dispose correctly).

## 4. Advanced Techniques: Handling Memory Pressure and Efficient Caching

At scale, devices experience memory pressure, and apps should respond gracefully. The following pattern uses WidgetsBindingObserver to react to memory pressure by clearing caches. It also documents a simple cache with an eviction hook.

```dart
import 'package:flutter/widgets.dart';

class CacheManager with WidgetsBindingObserver {
  final Map<String, dynamic> _cache = {};

  CacheManager() {
    WidgetsBinding.instance.addObserver(this);
  }

  void put(String key, dynamic value) {
    _cache[key] = value;
  }

  dynamic get(String key) => _cache[key];

  void clearIfMemoryPressure() {
    // Evict all cached data under memory pressure
    _cache.clear();
  }

  @override
  void didHaveMemoryPressure() {
    // Called by the framework when memory pressure is detected
    clearIfMemoryPressure();
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cache.clear();
  }
}
```

### ### Line-by-line explanation
- import 'package:flutter/widgets.dart'; — Use low-level Flutter widgets framework for memory pressure callbacks.
- class CacheManager with WidgetsBindingObserver — A simple cache that observes memory pressure.
- CacheManager() { WidgetsBinding.instance.addObserver(this); } — Subscribes to global memory-pressure notifications.
- void put/get — Basic cache operations for storing and retrieving data.
- void clearIfMemoryPressure() — Logic to evict cached items under pressure.
- didHaveMemoryPressure() — Override: Flutter signals memory pressure; clear cache to free memory.
- dispose() — Unregister observer and clear cache when the manager is no longer needed.

Practical notes:
- Memory pressure callbacks are a real-world useful hook for large caches, image caches, or in-app data stores that can be re-fetched.
- This pattern is complementary to per-widget disposal: memory pressure handling is global, while per-widget disposal is localized.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Forgetting to dispose streams/subscriptions
  - Bad:
    ```dart
    class BadWidget extends StatefulWidget {
      @override
      _BadWidgetState createState() => _BadWidgetState();
    }

    class _BadWidgetState extends State<BadWidget> {
      StreamSubscription<String>? _sub;

      @override
      void initState() {
        super.initState();
        _sub = Stream.periodic(Duration(seconds: 1), (i) => 'tick')
            .listen((s) { /* do something */ });
      }
      // No dispose()—leak
      @override
      Widget build(BuildContext context) => Container();
    }
    ```
  - Good:
    ```dart
    class GoodWidget extends StatefulWidget {
      @override
      _GoodWidgetState createState() => _GoodWidgetState();
    }

    class _GoodWidgetState extends State<GoodWidget> {
      StreamSubscription<String>? _sub;

      @override
      void initState() {
        super.initState();
        _sub = Stream.periodic(Duration(seconds: 1), (i) => 'tick')
            .listen((s) { /* do something */ });
      }

      @override
      void dispose() {
        _sub?.cancel();
        super.dispose();
      }

      @override
      Widget build(BuildContext context) => Container();
    }
    ```
  - Why it matters: Leaking subscriptions keeps callbacks alive, retaining parent widgets and large objects, causing memory growth over time.

- Pitfall 2: Capturing context in asynchronous callbacks
  - Bad:
    ```dart
    class BadContextWidget extends StatefulWidget {
      @override
      _BadContextWidgetState createState() => _BadContextWidgetState();
    }

    class _BadContextWidgetState extends State<BadContextWidget> {
      late StreamSubscription<String> _sub;

      @override
      void initState() {
        super.initState();
        _sub = Stream.periodic(Duration(seconds: 1), (_) => 'x')
            .listen((_) {
          // Accessing context after dispose can keep the entire tree alive
          // and extend lifetimes unintentionally
          if (mounted) setState(() {});
        });
      }

      @override
      void dispose() {
        _sub.cancel();
        super.dispose();
      }

      @override
      Widget build(BuildContext context) => Container();
    }
    ```
  - Good:
    ```dart
    class GoodContextWidget extends StatefulWidget {
      @override
      _GoodContextWidgetState createState() => _GoodContextWidgetState();
    }

    class _GoodContextWidgetState extends State<GoodContextWidget> {
      late StreamSubscription<String> _sub;

      @override
      void initState() {
        super.initState();
        _sub = Stream.periodic(Duration(seconds: 1), (_) => 'x').listen((_) {
          if (!mounted) return;
          setState(() {});
        });
      }

      @override
      void dispose() {
        _sub.cancel();
        super.dispose();
      }

      @override
      Widget build(BuildContext context) => Container();
    }
    ```
  - Why it matters: Accessing context after a widget is disposed can retain large portions of the widget tree, leading to leaks and confusing behavior.

- Pitfall 3: Holding large caches in state unnecessarily
  - Bad:
    ```dart
    class BadCacheWidget extends StatefulWidget {
      @override
      _BadCacheWidgetState createState() => _BadCacheWidgetState();
    }

    class _BadCacheWidgetState extends State<BadCacheWidget> {
      final Map<String, dynamic> _cache = {}; // Large cache held in state

      @override
      Widget build(BuildContext context) => Text('Cache size: ${_cache.length}');
    }
    ```
  - Good:
    ```dart
    class GoodCacheWidget extends StatefulWidget {
      @override
      _GoodCacheWidgetState createState() => _GoodCacheWidgetState();
    }

    class _GoodCacheWidgetState extends State<GoodCacheWidget> {
      final Map<String, dynamic> _cache = {};
      void load(String key, dynamic value) {
        _cache[key] = value;
        // Consider evicting old entries or using a separate cache manager
      }

      @override
      Widget build(BuildContext context) => Text('Cache size: ${_cache.length}');
    }
    ```
  - Why it matters: Large caches persist longer than useful lifetimes, especially when tied to widget state. Use dedicated cache managers, sized caches, or clear caches on memory pressure.

If you want more pitfalls, consider: global keys causing long-lived references, mismanaging inherited widgets, or keeping references in static singletons that live beyond the app lifecycle.

## Y. Why This Matters In Real Systems — production context and real usage

- User experience: Memory pressure can trigger UI jank, frame drops, and dropped frames, affecting perceived performance.
- Battery and thermal effects: Unnecessary allocations cause GC churn, higher CPU usage, and more heat generation.
- Stability at scale: In large apps with many screens and complex state, leaks accumulate, causing crashes in long-running sessions or after backgrounding/foregrounding.
- Release quality and observability: Profiling memory with DevTools during development and automated tests helps catch leaks before users encounter them. Integrating memory profiling into CI ensures repeated regressions are caught early.
- Pattern alignment with lifecycle: Proper disposal aligns with Flutter’s widget lifecycle, enabling the framework to reclaim memory and resources promptly.

Practical tips for production:
- Regularly profile both hot paths and long-lived widgets.
- Use didHaveMemoryPressure to reduce caches and free resources when the OS signals memory pressure.
- When implementing caches, bound their size and implement eviction policies.
- Instrument critical resource lifecycles (subscriptions, controllers, image loaders) with consistent dispose calls.
- Combine memory snapshots with retention graphs in DevTools to identify root causes.

## Z. Study Questions — 5 recall questions

1. What is the difference between memory growth observed in a running app and a true memory leak?
2. How do you use Dart DevTools to collect a memory snapshot and analyze retained objects?
3. Which Flutter lifecycle method should you override to clean up resources like streams and controllers?
4. How does didHaveMemoryPressure help your app under memory pressure, and what should you typically do in its handler?
5. Give an example of a memory-friendly caching strategy in Flutter and why it helps at scale.

## Exercise — a practical multi-part coding challenge

Part A — Build a intentionally leaky widget and observe memory growth
- Task: Create a Flutter app with a screen that navigates to a leaky widget (like MemoryLeakDemo in Section 1) and repeatedly navigates back and forth to observe increasing memory usage.
- Deliverables:
  - A main screen with a button to push the leaky screen.
  - The leaky screen implemented as in Section 1.
  - Run DevTools, take memory snapshots after several navigations, and note the retained object counts.

Part B — Fix the leak with proper disposal
- Task: Re-implement the leaky screen from Part A, this time ensuring all resources (timers, streams) are properly disposed in dispose().
- Deliverables:
  - A fixed leaky widget that cancels timers or subscriptions on dispose.
  - A second DevTools memory snapshot showing stable memory usage after repeated navigations.

Part C — Add a cache with memory-pressure handling
- Task: Implement a simple CacheManager (as in Section 4) and wire didHaveMemoryPressure to clear the cache on memory pressure.
- Deliverables:
  - The CacheManager class with a small API (put/get/clear).
  - A widget that uses CacheManager to store data and can trigger memory pressure manually (simulate didHaveMemoryPressure).
  - A DevTools snapshot showing memory volatility reducing after pressure handling.

Part D — Profile in a real-ish flow
- Task: Create a small app flow with a queue of data loading tasks that uses a StreamSubscription and a cache, ensuring all resources are disposed properly and the app behaves smoothly under memory pressure.
- Deliverables:
  - Complete code with:
    - A StatefulWidget that subscribes to a stream of data.
    - Proper disposal of the subscription and any created controllers.
    - A CacheManager that evicts on memory pressure.
  - Instructions for profiling with Dart DevTools: how to connect, capture a memory snapshot, and interpret the retained size versus instance counts.

Notes and tips for the exercise:
- Start with a minimal leaky widget and verify memory growth using DevTools before attempting fixes.
- Use the Memory page in DevTools to view both the allocation timeline and snapshots; look for objects with unexpectedly long retention.
- When simulating memory pressure, use the didHaveMemoryPressure path as a model for what your production app should do, even if you’re not triggering real OS pressure in your test environment.

This completes a focused, practical lesson on memory profiling and leak detection in Flutter, aligned with Phase 5 goals for publishing and at-scale readiness.