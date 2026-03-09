# Fluid 60FPS Mobile Animations in React Native (Phase 4: Native Modules)

Intro: Fluid, 60fps animations are essential for polished mobile apps. They feel responsive, natural, and convey quality. In React Native, achieving true 60fps requires careful scheduling of work on the UI thread, minimizing bridge latency, and often using a combination of native modules for high-frequency updates. This lesson walks you through baseline techniques, advanced UI-thread animations with Reanimated 2, and how to leverage native modules to drive high-frequency animation loops while keeping the JS bridge overhead in check. You’ll end with practical tests, common pitfalls, and a hands-on exercise.

## 1. Foundation: What 60FPS means in a React Native context

In modern mobile devices, a 60 frames-per-second target means your app should render a new frame every ~16.7ms. In React Native, there are two main execution paths for animations:
- JavaScript-driven animations: Update values on the JS thread and serialize them to the UI thread. This can cause frame drops if the JS thread is busy.
- UI thread animations: Animate directly on the native UI thread (best for 60fps) to avoid bridge latency.

Code example: baseline animated view using Animated with the native driver (JS-initialized, but offloads transform to the UI thread).

```tsx
// 1-baseline-animated.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default function BaselineAnimated() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true, // offloads transform to UI thread
    }).start();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  box: { width: 60, height: 60, backgroundColor: '#4f8ef7', borderRadius: 8 },
});
```

### Line-by-line explanation
- Import React, hooks, and Animated to create a baseline animation.
- Create a persistent Animated.Value to drive the animation.
- On mount, start a timing animation to 1 over 2 seconds, with useNativeDriver to perform transforms on the UI thread.
- Create an interpolated translateX from the animated value to move the box horizontally.
- Render a container and an Animated.View that applies the animated transform.

Why this matters professionally: Baseline Animated with nativeDriver is a fundamental, broadly-supported approach that reduces bridge overhead. It’s a stepping stone toward more advanced UI-thread solutions (e.g., Reanimated) that deliver smoother 60fps when handling complex scenes.

---

## 2. Fluid UI-thread Animations with Reanimated 2

Reanimated 2 lets you animate on the UI thread with a React-like API, dramatically reducing JS-to-native hops and enabling truly fluid 60fps animations for complex interactions.

Code example: a simple, looping horizontal animation using Reanimated 2’s shared values and useAnimatedStyle.

```tsx
// 2-fluid-ui-thread.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function FluidUIThread() {
  const x = useSharedValue(0);

  useEffect(() => {
    // Loop the animation infinitely
    x.value = withRepeat(withTiming(300, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return <Animated.View style={[styles.box, animatedStyle]} />;
}

const styles = StyleSheet.create({
  box: { width: 60, height: 60, backgroundColor: '#34c759', borderRadius: 8 },
});
```

### Line-by-line explanation
- Import Reanimated components and hooks.
- Create a shared value x to hold the current position.
- On mount, assign a looping animation that moves to 300 over 1 second, repeated infinitely and in the forward direction.
- Create an animated style that translates horizontally based on the shared value.
- Render a single Animated.View that uses the animated style.

Why this matters professionally: Reanimated 2 executes on the UI thread, enabling high-frequency, responsive animations even when the JS thread is busy. It reduces dropped frames and increases perceived performance.

---

## 3. Native Modules for High-Frequency Animations

Sometimes you need the ultimate in fidelity and determinism: a native timer loop that drives an animation with minimal gap from frame to frame. This section shows how to design a Native Module that streams 60fps frames to the React Native layer, plus skeleton native implementations for iOS (Swift) and Android (Kotlin). This is advanced and should be used sparingly; many apps won’t need native frame streams if Reanimated suffices.

Code example: JS interface to a hypothetical NativeAnimationModule that emits per-frame events.

```ts
// 3-native-module-interface.ts
import { NativeModules, NativeEventEmitter } from 'react-native';
import React, { useEffect, useState } from 'react';

type FrameEvent = { frame: number };

const { NativeAnimationModule } = NativeModules;
const nativeEventEmitter = new NativeEventEmitter(NativeAnimationModule);

export function useNativeFrameStream() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const subscription = nativeEventEmitter.addListener<FrameEvent>('Frame', (evt) => {
      setFrame(evt.frame);
    });

    // Start the native timer loop
    NativeAnimationModule.start?.();

    return () => {
      subscription.remove();
      NativeAnimationModule.stop?.();
    };
  }, []);

  return frame;
}
```

Code example: iOS native module skeleton (Swift) to emit Frame events.

```swift
// 3-ios-native-skeleton.swift
// This is a skeleton illustrating a NativeModule that emits frames to JS.
import React
import Foundation
import UIKit

@objc(NativeAnimationModule)
class NativeAnimationModule: RCTEventEmitter {
  private var displayLink: CADisplayLink?
  private var frame: Int = 0

  @objc override func start() {
    guard displayLink == nil else { return }
    displayLink = CADisplayLink(target: self, selector: #selector(onFrame))
    displayLink?.add(to: .main, forMode: .common)
  }

  @objc override func stop() {
    displayLink?.invalidate()
    displayLink = nil
  }

  @objc func onFrame() {
    frame += 1
    sendEvent(withName: "Frame", body: ["frame": frame])
  }

  @objc override func supportedEvents() -> [String]! {
    return ["Frame"]
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
```

Code example: Android native module skeleton (Kotlin) to emit frames.

```kotlin
// 3-android-native-skeleton.kt
package com.example

import com.facebook.react.bridge.*
import android.os.Handler
import android.os.Looper

class NativeAnimationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val handler = Handler(Looper.getMainLooper())
  private var frame = 0
  private var running = false
  private val runnable = object : Runnable {
    override fun run() {
      if (!running) return
      frame++
      val map = WritableMap() // or Arguments.createMap()
      map.putInt("frame", frame)
      sendEvent("Frame", map)
      handler.postDelayed(this, 16) // ~60fps
    }
  }

  @ReactMethod
  fun start() {
    if (running) return
    running = true
    frame = 0
    handler.post(runnable)
  }

  @ReactMethod
  fun stop() {
    running = false
    handler.removeCallbacks(runnable)
  }

  override fun getName(): String = "NativeAnimationModule"

  private fun sendEvent(eventName: String, params: WritableMap) {
    this.reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }
}
```

### Line-by-line explanation
- For the JS interface: set up an event emitter listening to Frame events emitted by the native side; start/stop the native timer.
- iOS Swift module: use CADisplayLink to call onFrame on every screen refresh; increment a frame counter and emit a Frame event to JS.
- Android Kotlin module: run a 16ms timer on the main thread; increment a frame counter and emit a Frame event to JS via React Native’s event emitter.
- The event emitter mechanism bridges native frame updates to JS with minimal latency, enabling high-frequency synchronization for custom animations.

Why this matters professionally: Some animation workloads demand the tightest control and determinism possible, especially when coordinating multiple subsystems (e.g., physics + visuals) or when you need cross-platform parity at exactly 60fps. Native modules give you a way to push frame-timing logic closer to the hardware, reducing jitter introduced by the JS bridge.

Note: In practice, you’ll almost always prefer Reanimated 2 for most Fluid UI needs. Native Modules are advanced tools for very specific requirements (e.g., highly specialized physics or cross-subsystem synchronization) and require careful lifecycle, memory, and threading considerations.

---

## 4. Putting It All Together: A Fluid 60FPS UI driven by both Reanimated and a Native Module

This section demonstrates a practical composition: a draggable card that uses Reanimated for smooth movement and a native frame emitter to modify a secondary indicator in lockstep with 60fps frames.

Code example: React Native component that uses Reanimated for drag and a native frame stream to drive a dot that pulses in sync with frames.

```tsx
// 4-combined-fluid.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, PanResponder } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useNativeFrameStream } from './3-native-module-interface';

export default function CombinedFluid() {
  const panX = useSharedValue(0);
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }],
  }));

  // Native frame stream
  const frame = useNativeFrameStream(); // number increments 1..n at ~60fps

  // A simple pan gesture-like behavior (manual for clarity)
  const startX = 0;
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      panX.value = startX + gestureState.dx;
    },
    onPanResponderRelease: () => {
      // snap back to 0 for simplicity
      panX.value = 0;
    },
  });

  // A pulsing dot whose size depends on the frame count
  const dotSize = Math.max(12, Math.min(40, (frame % 60) * 0.5 + 12));

  const dotStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: '#ff3b30',
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={[styles.card, animatedCardStyle]} />
      <View style={styles.dotsRow}>
        <View style={dotStyle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: 180, height: 120, backgroundColor: '#7c5cff', borderRadius: 12 },
  dotsRow: { marginTop: 40, height: 20, justifyContent: 'center', alignItems: 'center' },
});
```

### Line-by-line explanation
- Import UI components, Reanimated hooks, and the native frame stream hook.
- Create a shared value panX for the draggable card’s horizontal position.
- Build an animated style that translates the card along the X axis.
- Initialize a PanResponder to update panX on drag, providing tactile feedback at ~60fps by staying on the UI thread.
- Use a native frame stream to drive a dot’s size on every 60fps frame, illustrating cross-thread synchronization.
- Compose the UI with a draggable card and a pulsing dot whose size is synced with native frames.

Why this matters professionally: This demonstrates a pragmatic blueprint for combining the strongest animation techniques (UI-thread Reanimated 2) with native frame sovereignty to achieve stable 60fps across complex interactions. It reinforces the principle that you should prefer UI-thread work for per-frame updates and only fall back to native modules when you have a compelling reason for even lower bridge overhead or specialized hardware interaction.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Doing heavy JS work during animation frames
  - Bad:
    ```tsx
    // animate.tsx - terrible for 60fps
    function onFrame(ts: number) {
      // compute expensive layout in JS
      layoutComputation(ts);
      requestAnimationFrame(onFrame);
    }
    ```
  - Good:
    ```tsx
    // animate.tsx - distribute work to the UI thread
    // Use Reanimated 2 so the heavy math runs on UI thread
    const x = useSharedValue(0);
    useEffect(() => {
      x.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    }, []);
    ```

- Mistake 2: Ignoring native driver when possible
  - Bad:
    ```tsx
    // 2-baseline-animated.tsx
    Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    // but later you read anim.value on the JS side per-frame, causing bridge
    // overhead
    ```
  - Good:
    ```tsx
    // 2-fluid-ui-thread.tsx
    // Use useSharedValue and useAnimatedStyle to keep per-frame work on UI thread
    ```

- Mistake 3: Overusing layout-affecting transforms
  - Bad:
    ```tsx
    // Frequent layout recalculation via measuring
    const [w, setW] = useState(0);
    useEffect(() => {
      measureViewLayout().then(size => setW(size.width));
    }, []);
    ```
  - Good:
    ```tsx
    // Use transforms and Reanimated to avoid re-layout
    const x = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: x.value }],
    }));
    ```

- Mistake 4: Not handling device performance and frame drops
  - Bad:
    ```tsx
    // 1-baseline-animated.tsx
    setInterval(() => {
      // update animation frame
    }, 16);
    ```
  - Good:
    ```tsx
    // 2-fluid-ui-thread.tsx
    // Rely on frame scheduling provided by the UI thread via withTiming / withRepeat
    ```

- Mistake 5: Improper memory cleanup leading to leaks
  - Bad:
    ```tsx
    useEffect(() => {
      const id = setInterval(() => heat(), 1000);
      // no cleanup
    });
    ```
  - Good:
    ```tsx
    useEffect(() => {
      const id = setInterval(() => heat(), 1000);
      return () => clearInterval(id);
    }, []);
    ```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Performance and battery: Smooth 60fps animations translate to better perceived performance and can reduce user frustration. UI-thread animation libraries reduce jitter by minimizing cross-thread communication.
- Consistency across devices: Older devices struggle with heavy JS work; offloading to the UI thread or using native modules helps maintain consistent frame times.
- Maintainability: Reanimated 2 provides a declarative API that maps closely to typical animation patterns, lowering the risk of dropped frames due to asynchronous bridging.
- Debugging and instrumentation: Use tools like Flipper, Hermes, and performance monitors. Monitor frame drops, jank, and thermal throttling during testing in real devices.
- Accessibility and UX: Fluid animations should respect reduced motion preferences and not degrade readability or interaction for users who disable animations.

---

## Z. Study Questions — 5 recall questions

1. What is the primary advantage of running animations on the UI thread compared to the JS thread?
2. How does Reanimated 2 help achieve 60fps in React Native? Name two core concepts.
3. Why might you choose to implement a Native Module for animation in some scenarios?
4. In the context of 60fps animation, what is the purpose of useNativeDriver in Animated.timing?
5. Describe a situation where using a native frame emitter could be beneficial and a potential risk you must manage.

---

## Exercise — a practical multi-part coding challenge

Part A: Build a fluid 60fps draggable card using Reanimated 2

- Requirements:
  - Implement a draggable card that follows the user’s finger with no perceptible lag.
  - The card movement must render at 60fps on a variety of devices.
  - Use Reanimated 2 (useSharedValue, useAnimatedStyle, withSpring or withTiming).
  - Include a small, non-blocking trailing glow that follows the card but does not impact frame rate.

Part B: Integrate a Native Module frame emitter (optional advanced step)

- Requirements:
  - Create a minimal Native Module skeleton (iOS Swift or Android Kotlin) that emits a Frame event at ~60fps.
  - Subscribe to the Frame events in JS and render a small indicator whose size or color updates per frame.
  - Ensure proper cleanup on component unmount and app backgrounding.

Part C: Performance considerations report

- Deliverables:
  - Explain how you verified 60fps (e.g., frame rate traces, UI thread vs JS thread distribution).
  - List the optimizations you applied (useNativeDriver, avoiding layout thrash, minimizing bridge traffic).
  - Note any trade-offs you encountered when adding the native module.

Submission format:
- Include a single React Native component implementing Part A (and Part B if you completed it).
- Provide the native module skeleton files for iOS/Android in the code blocks as optional references.
- Include a brief README-style notes section describing your performance verification steps and decisions.

End of lesson.