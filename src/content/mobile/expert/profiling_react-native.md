# Phase 5: Publishing & At-Scale — Memory Profiling and Leak Detection in React Native

Memory profiling and leak detection are critical skills for mobile apps that ship to real users. In React Native, memory leaks can degrade performance, cause jank, and even lead to crashes on devices with limited RAM. This lesson covers how memory works in RN, how to spot leaks, and how to use modern tooling to profile memory in real apps, with hands-on code you can adapt to your projects.

## 1. Understanding Memory Allocation and Common Leak Patterns in React Native

Memory in mobile apps is allocated for objects, closures, UI nodes, images, and data caches. Leaks happen when references are retained beyond their useful lifetime, preventing garbage collection. Below are two patterns: a leak-prone pattern and a corrected pattern. Both snippets are simplified to emphasize the memory issue.

### Bad pattern: leaking through intervals and global references

```js
// LeakDemoBad.js
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

const globalCache = []; // global reference that grows

export default function LeakDemoBad() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Continually allocates a large object every second
    const id = setInterval(() => {
      const large = new Array(10000).fill('x'); // large object
      globalCache.push(large); // stores in a global array (retained)
      setCount((n) => n + 1);
    }, 1000);

    // Missing cleanup: interval never cleared on unmount
    // return () => clearInterval(id);
  }, []);

  return (
    <View>
      <Text>Count: {count}</Text>
    </View>
  );
}
```

### Good pattern: proper cleanup and bounded data structures

```js
// LeakDemoGood.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';

function useSafeInterval(callback, delay) {
  const savedCallback = useRef();
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => savedCallback.current && savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function LeakDemoGood() {
  const [count, setCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      // mark that the component is unmounted
      isMounted.current = false;
    };
  }, []);

  useSafeInterval(() => {
    if (!isMounted.current) return;
    // do not allocate a new large object here; keep memory bounded
    setCount((n) => n + 1);
  }, 1000);

  return (
    <View>
      <Text>Count: {count}</Text>
    </View>
  );
}
```

### Line-by-line explanation

LeakDemoBad.js:
- Line 1-3: Import React utilities and RN components.
- Line 5: Declare a global array to simulate a cache that retains data for the app lifetime.
- Line 7: Define the component.
- Line 9: Initialize a stateful counter.
- Line 11: Start an effect that runs once on mount.
- Line 13: Create a timer that runs every second.
- Line 14: Allocate a large array (memory spike) to simulate a heavy object.
- Line 15: Push the large object into a global cache, which is retained for the app lifetime.
- Line 16: Increment the counter to reflect activity.
- Line 19-20: Note the missing cleanup: the interval is never cleared, so the timer continues, and allocations accumulate, creating a memory leak.
- Line 23-25: Render the UI.

LeakDemoGood.js:
- Line 1-3: Import React utilities and RN components.
- Line 6-11: Define a small, robust hook, useSafeInterval, that stores the latest callback and clears the interval on unmount or delay changes.
- Line 13: Define the component.
- Line 15-16: Initialize state and a ref to track mount status.
- Line 18-22: Cleanup on unmount by marking the component as unmounted, so the interval callback can avoid work after unmount.
- Line 24-32: Use the safe interval to perform work without creating unbounded memory writes. The code no longer retains large data in a global structure, and it clears the timer on unmount.
- Line 34-36: Render the UI.

## 2. Profiling Tooling Setup for React Native

Profiling memory in React Native typically involves Flipper (memory plugin), Android Studio Memory Profiler, and Xcode Instruments. The following setup snippets show how to enable memory profiling instrumentation in a RN project.

### 2.1 iOS: Podfile and Flipper integration

```ruby
# ios/Podfile
platform :ios, '12.0'
require_relative '../node_modules/react-native/scripts/autolinking'
use_flipper!({ 'Flipper' => '0.125.0' }) # enables Flipper with memory plugin

post_install do |installer|
  flipper_post_install(installer)
end
```

### Line-by-line explanation

- Line 2: Set the minimum iOS deployment target (adjust as needed).
- Line 3-4: Ensure autolinking is configured for RN dependencies.
- Line 5: Enable Flipper with a specific version; memory profiling is available via Flipper’s Memory plugin.
- Line 7-9: Run the standard Flipper post-install steps to wire up iOS projects with Flipper.

### 2.2 Android: Gradle dependencies for Flipper

```gradle
// android/app/build.gradle
dependencies {
  debugImplementation 'com.facebook.flipper:flipper:0.125.0'
  debugImplementation 'com.facebook.flipper:flipper-network-plugin:0.125.0'
  debugImplementation 'com.facebook.flipper:flipper-fresco-plugin:0.125.0'
  debugImplementation 'com.facebook.soloader:soloader:0.10.1'
}
```

### Line-by-line explanation

- Line 3-7: Add Flipper core and network plugins as debug-only dependencies so they don’t inflate release builds.
- Line 8: Include Soloader, a native library loader used by Flipper.
- These dependencies enable the Memory plugin and network profiling in Flipper on Android.

### 2.3 Android: Enabling Flipper in the native app

```java
// android/app/src/main/java/com/yourapp/MainApplication.java
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.android.utils.FlipperUtils;
import com.facebook.flipper.plugins.memory.MemoryPlugin;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;

@Override
public void onCreate() {
  super.onCreate();
  if (BuildConfig.DEBUG && FlipperUtils.shouldEnableFlipper(this)) {
    AndroidFlipperClient client = AndroidFlipperClient.getInstance(this);
    client.addPlugin(new MemoryPlugin());
    // You can add other plugins as needed (Network, Databases, etc.)
    client.start();
  }
}
```

### Line-by-line explanation

- Import Flipper classes for memory profiling and helper utilities.
- In onCreate, check that the build is a DEBUG build and that Flipper should be enabled.
- Get the Flipper client instance, add a MemoryPlugin, and start the client.
- This wiring ensures that memory snapshots and heap graphs can be captured from Flipper on Android.

### 2.4 Quick-start usage tips

- Start the app in debug mode.
- Open Flipper on your desktop and connect your device/emulator.
- Navigate to the Memory plugin to capture heap snapshots, compare allocations over time, and identify retained objects.
- Use Android Studio Memory Profiler and Xcode Instruments for deeper platform-specific insights (allocations, zygote caches, etc.).
- For Hermes-based apps, you can also leverage Hermes-specific profiling tools and the Chrome DevTools memory tab.

## 3. Practical Memory-Profiling Patterns and Techniques in RN

In real apps, you will combine code hygiene with profiling workflows. The following patterns help you detect and mitigate leaks more effectively.

### 3.1 Avoid retaining large objects in component state or closures

```js
// Avoid: storing big data in state
const [imageCache, setImageCache] = useState({});

// Better: store small, derived, or ephemeral references
const imageCacheRef = useRef(new Map());

// When you fetch or compute heavy data, store a reference in a ref, not in state
```

### 3.2 Properly unsubscribe and cleanup in effects

```js
import { useEffect } from 'react';
import { AppState } from 'react-native';

useEffect(() => {
  const handler = () => {
    // do something
  };
  AppState.addEventListener('change', handler);

  return () => {
    AppState.removeEventListener('change', handler);
  };
}, []);
```

### 3.3 Cancel in-flight async work and timers on unmount

```js
import { useEffect } from 'react';

function useCancelableFetch(url) {
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal }).catch((e) => {
      if (e.name !== 'AbortError') {
        // handle error
      }
    });
    return () => controller.abort();
  }, [url]);
}
```

### 3.4 Use memory-conscious caching strategies

```js
import { useEffect, useRef } from 'react';

function useEphemeralCache() {
  const cacheRef = useRef(new Map());

  useEffect(() => {
    // Clear cache on unmount to avoid leaks
    return () => cacheRef.current.clear();
  }, []);

  return cacheRef;
}
```

### 3.5 Detect and fix common retention patterns with heap snapshots

- Take periodic heap snapshots in Flipper's Memory plugin to identify:
  - Retaining references from long-lived objects to large DOM-like trees (RN views).
  - Closures capturing large data sets unintentionally.
  - Event emitter subscriptions not cleaned up.
- Compare snapshots over time to identify objects that should have been collected but are still retained.

## 4. X. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code

1) Forgetting to clean up subscriptions or timers
- Bad:
```js
useEffect(() => {
  const sub = someEventEmitter.addListener('event', onEvent);
  // no cleanup
}, []);
```
- Good:
```js
useEffect(() => {
  const sub = someEventEmitter.addListener('event', onEvent);
  return () => sub.remove();
}, []);
```

2) Storing large data in component state
- Bad:
```js
const [data, setData] = useState(new Array(1000000).fill(0));
```
- Good:
```js
const dataRef = useRef(null);
useEffect(() => {
  dataRef.current = new Array(1000000).fill(0);
  // do not put large objects into state
}, []);
```

3) Not cleaning up after networking or async work
- Bad:
```js
useEffect(() => {
  fetch(url).then(/* ... */);
}, [url]);
```
- Good:
```js
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }).catch(/* ... */);
  return () => controller.abort();
}, [url]);
```

4) Global caches growing without bounds
- Bad:
```js
const globalCache = [];
function cacheItem(item) {
  globalCache.push(item);
}
```
- Good:
```js
const cacheRef = useRef(new Map());
function cacheItem(key, item) {
  cacheRef.current.set(key, item);
}
// Clear when appropriate, e.g., on unmount or cache policy
```

5) Holding onto components via stale closures
- Bad:
```js
function Component() {
  useEffect(() => {
    function onTick() { doSomething(largeObject); }
    const id = setInterval(onTick, 1000);
  }, []);
}
```
- Good:
```js
function Component() {
  const largeObjectRef = useRef(largeObjectFactory());
  useEffect(() => {
    const id = setInterval(() => {
      doSomething(largeObjectRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);
}
```

## 5. Y. Why This Matters In Real Systems — Production Context and Real Usage

- User-perceived performance: memory leaks cause increasing UI jank, slower animations, and eventual OOM kills on devices with modest RAM.
- Battery and thermal effects: memory pressure can lead to higher CPU wakeups and GC pressure, shortening battery life.
- Stability and release velocity: memory leaks escalate risk across user sessions, social networks, or background tasks, making crash reports more frequent.
- Cross-platform consistency: Android tends to tolerate more memory pressure before termination, while iOS is more aggressive about memory pressure cues; profiling helps achieve consistent UX across both ecosystems.
- Production workflows: integrate memory profiling into CI or stage environments, run Flipper Memory plugin during QA, and monitor release notes for regressions in memory behavior.

## 6. Z. Study Questions — 5 Recall Questions

1) What is a memory leak in a mobile app, and why is it particularly problematic on devices with limited RAM?
2) Name two common React Native patterns that lead to memory leaks and how you would fix them.
3) Which tool(s) can you use to take a heap snapshot in a React Native app, and what would you look for in the snapshot?
4) In React Native, why is storing large data structures in component state a bad idea for memory efficiency?
5) Describe a minimal cleanup pattern for a timer set with setInterval inside a React component.

## 7. Exercise — a Practical Multi-Part Coding Challenge

Part A: Create a Leak Scenario
- Build a small React Native component that intentionally leaks memory by subscribing to a global event emitter and allocating a large object on every tick without cleanup.
- Files to create:
  - src/components/LeakGadgetBad.js (deliberate leak)
  - src/components/LeakGadgetGood.js (fixed version with proper cleanup)

Part B: Instrumentation and Profiling
- Add a simple setup to enable Flipper in your RN project (if not already configured in Phase 5):
  - Ensure ios/Podfile and android/build.gradle snippets reflect Flipper integration as shown in section 2.
- Run the app in debug mode and open Flipper. In the Memory plugin:
  - Take an initial heap snapshot.
  - Run LeakGadgetBad for ~30 seconds, then take another snapshot.
  - Compare snapshots to identify retained objects and confirm the leak.
- Then replace with LeakGadgetGood and observe the memory behavior: the second snapshot should show much fewer retained large objects.

Part C: Write a Self-Contained Test Harness
- Implement a small harness that:
  - Creates a bounded cache (e.g., a Map with a max size) and cleans the oldest entry on overflow.
  - Uses useEffect to clear the cache on unmount.
- Demonstrate through code that the cache does not grow unbounded and that unmount clears references.

Part D: Reflect and Report
- Describe in a short write-up:
  - What memory patterns you observed in LeakGadgetBad vs LeakGadgetGood.
  - How you used the profiling tool (Flipper) to confirm the fix.
  - Any trade-offs you encountered (e.g., caching strategy vs memory usage) and how you would tune it for production.

Notes for instructors or self-study organizers:
- The key learning outcomes are recognizing memory retention patterns, setting up profiling tooling (Flipper), and applying cleanup and memory-conscious patterns in React Native code.
- Encourage pairing the code with actual profiling runs on both iOS and Android to illustrate platform-specific differences in memory behavior.

If you want more depth, I can tailor the exercises to a specific RN version, add more advanced profiling scenarios (e.g., image cache growth, WebView memory usage), or include a cheat sheet for common memory-leak signatures in JavaScript and React Native.