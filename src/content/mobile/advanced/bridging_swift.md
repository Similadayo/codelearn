# Writing Native Bridge Modules with Swift (iOS) — Phase 4: Native Modules

Compelling introductory paragraph: In modern mobile apps, you often need to reach platform-specific capabilities or optimize critical paths by writing native code that JS can call. Native Bridge Modules let React Native (or similar frameworks) bridge JS to Swift, unlocking high-performance APIs, access to device features, and seamless integration with existing iOS codebases. Mastering native modules is essential for professional teams delivering feature-rich apps with tight performance and robust platform integration.

## 1. Setup and Project Configuration for Swift React Native Bridge

This section covers the essential project setup to expose Swift code as a React Native bridge module, including the bridging header and a minimal native module with promise-based methods.

```swift
// NativeBridge.swift
import Foundation
import UIKit

@objc(NativeBridge)
class NativeBridge: NSObject, RCTBridgeModule {

  // Indicates whether this module must be created on the main thread.
  // Set to true only if you interact with UI directly here.
  static func requiresMainQueueSetup() -> Bool { return false }

  // Example: Promise-based method that sums two numbers
  @objc func sum(_ a: NSNumber, _ b: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let result = a.intValue + b.intValue
    resolve(result)
  }

  // Example: Promise-based method that returns the device name
  @objc func getDeviceName(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(UIDevice.current.name)
  }
}
```

```objc
// YourApp-Bridging-Header.h
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```

### Line-by-line explanation
- import Foundation
  - Bring in core Swift/Foundation types used by the bridge.
- import UIKit
  - Access iOS UI/device APIs (e.g., UIDevice) if needed.
- @objc(NativeBridge)
  - Expose the Swift class to Objective-C runtime under the module name "NativeBridge" so RN can find it.
  - If you omit the name in @objc(...), Swift uses the class name by default, but specifying it ensures the JS module name is stable.
- class NativeBridge: NSObject, RCTBridgeModule
  - Declare a Swift class that conforms to RCTBridgeModule, the protocol React Native uses to enumerate modules.
- static func requiresMainQueueSetup() -> Bool { return false }
  - Indicates whether module initialization must happen on the main queue. Return true only if you touch UI during initialization.
- @objc func sum(_:_:resolver:rejecter:)
  - Define a method exposed to JS. The first two parameters are positional numbers, followed by resolver and rejecter blocks for Promise-style results.
- let result = a.intValue + b.intValue
  - Perform the computation in native code.
- resolve(result)
  - Resolve the Promise with the computed value to return to JS.
- @objc func getDeviceName(_:resolver:rejecter:)
  - Another native method that returns a string (device name) via Promise.
- UIDevice.current.name
  - Retrieve the device name from iOS APIs.

## 2. Exposing Methods via Promise-based API (Swift)

This subsection demonstrates adding more robust promise-based methods, including data types, error handling, and ensuring safe threading.

```swift
// NativeBridge.swift (additional methods inside the same class)

@objc(NativeBridge)
class NativeBridge: NSObject, RCTBridgeModule {

  static func requiresMainQueueSetup() -> Bool { return false }

  // Sum two numbers (promise)
  @objc func sum(_ a: NSNumber, _ b: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Basic validation
    if a == nil || b == nil {
      reject("ERR_INVALID_INPUT", "Inputs must be numbers", nil)
      return
    }
    let result = a.intValue + b.intValue
    resolve(result)
  }

  // Return a formatted string (promise)
  @objc func formatGreeting(_ name: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let greeting = "Hello, \(name)"
    resolve(greeting)
  }

  // Heavy computation off the main thread
  @objc func heavyComputation(_ n: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      // Simulated heavy work
      var sum = 0
      for i in 0...n.intValue {
        sum += i
      }
      DispatchQueue.main.async {
        resolve(sum)
      }
    }
  }
}
```

### Line-by-line explanation
- @objc func sum(_ a: NSNumber, _ b: NSNumber, resolver resolve: ...)
  - Expose sum as a bridge method that React Native can call with two numbers and get a Promise result.
- if a == nil || b == nil { ... }
  - Basic input validation to provide meaningful error messaging to JS.
- let result = a.intValue + b.intValue
  - Compute on native side.
- resolve(result)
  - Resolve the Promise with the numeric result.
- @objc func formatGreeting(_ name: NSString, resolver resolve: ...)
  - Demonstrates returning a string; name is passed from JS as a string bridged to NSString.
- let greeting = "Hello, \(name)"
  - Create a formatted string in Swift.
- heavyComputation: DispatchQueue.global(...)
  - Offload heavy work to a background queue to avoid blocking the UI.
- DispatchQueue.main.async { resolve(sum) }
  - Return the result back to JS on the main thread after completion.

## 3. Event Emitter for Real-time Communication

Event emitters allow native code to push asynchronous events to JS. This is crucial for streaming data, sensors, or long-running operations.

```swift
// NativeEventModule.swift
import Foundation
import React

@objc(NativeEventModule)
class NativeEventModule: RCTEventEmitter {

  private var timer: Timer?

  override func supportedEvents() -> [String]! {
    return ["DeviceTick"]
  }

  @objc func startTicking() {
    // Ensure timer runs on the main thread for UI-safety
    DispatchQueue.main.async {
      self.timer?.invalidate()
      self.timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
        let payload: [String: Any] = ["timestamp": Date().timeIntervalSince1970]
        self.sendEvent(withName: "DeviceTick", body: payload)
      }
    }
  }

  @objc func stopTicking() {
    DispatchQueue.main.async {
      self.timer?.invalidate()
      self.timer = nil
    }
  }

  override static func requiresMainQueueSetup() -> Bool { return true }
}
```

### Line-by-line explanation
- import React
  - Import RN bridging utilities for EventEmitter usage.
- class NativeEventModule: RCTEventEmitter
  - Subclass the EventEmitter to emit events to JS.
- override func supportedEvents() -> [String]!
  - Declare the event names this module can emit.
- @objc func startTicking()
  - Expose a method to start emitting events; linked from JS.
- Timer.scheduledTimer(...)
  - Set up a timer that fires every second.
- self.sendEvent(withName: "DeviceTick", body: payload)
  - Push an event to JS with a payload containing a timestamp.
- @objc func stopTicking()
  - Expose a method to stop the timer and stop events.
- requiresMainQueueSetup
  - Return true if the module requires main-thread setup (true here because timers touch UI-related APIs).

JS usage snippet (conceptual):
- import { NativeModules, NativeEventEmitter } from 'react-native';
- const { NativeEventModule } = NativeModules;
- const emitter = new NativeEventEmitter(NativeEventModule);
- const subscription = emitter.addListener('DeviceTick', payload => console.log(payload));
- NativeEventModule.startTicking();
// Later: NativeEventModule.stopTicking(); subscription.remove();

## 4. Handling Threading and App Lifecycle in Native Modules

Swift bridge modules should be mindful of threading, UI interactions, and app lifecycle to avoid race conditions, frozen UI, or memory leaks. This example highlights best practices for long-running tasks, cleanup, and main vs background queue decisions.

```swift
// NativeBridgeThreading.swift
import Foundation

@objc(NativeBridgeThreading)
class NativeBridgeThreading: NSObject, RCTBridgeModule {

  static func requiresMainQueueSetup() -> Bool { return false }

  // Run UI-related work on main queue if needed
  @objc func updateUILabel(_ text: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Suppose you have a UILabel accessible here; for demonstration, we just echo back
      resolve("UI updated with: \(text)")
    }
  }

  // Non-UI heavy work already shown elsewhere; this shows proper background work
  @objc func performBackgroundTask(_ iterations: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .utility).async {
      var acc = 0
      for i in 0..<iterations.intValue {
        acc += i
      }
      DispatchQueue.main.async {
        resolve(acc)
      }
    }
  }
}
```

### Line-by-line explanation
- static func requiresMainQueueSetup() -> Bool { return false }
  - Non-UI work can run on a background thread. Returning false avoids blocking the main thread during startup.
- DispatchQueue.main.async { ... }
  - Ensure any UI-related work or updates happen on the main thread.
- DispatchQueue.global(qos: .utility).async { ... }
  - Offload heavy computation to a background queue to keep the UI responsive.
- DispatchQueue.main.async { resolve(acc) }
  - Return results to JS on the main thread to avoid race conditions with UI state.

## X. Common Beginner Mistakes

Bad vs Good code: 3+ pitfalls you’ll likely encounter when writing Swift native bridge modules.

- Pitfall 1: Forgetting the @objc annotation (module name not exposed)
  - Bad:
    class MyBridge: NSObject, RCTBridgeModule {
      static func requiresMainQueueSetup() -> Bool { return false }
      @objc func test(_ value: NSNumber, resolver: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) { ... }
    }
  - Good:
    @objc(MyBridge)
    class MyBridge: NSObject, RCTBridgeModule {
      static func requiresMainQueueSetup() -> Bool { return false }
      @objc func test(_ value: NSNumber, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) { ... }
    }

- Pitfall 2: Blocking the main thread with heavy work
  - Bad:
    @objc func compute(_ input: NSNumber, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
      // Heavy work directly on main thread
      var s = 0
      for i in 0...1000000 { s += i }
      resolve(s)
    }
  - Good:
    @objc func compute(_ input: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        var s = 0
        for i in 0...1000000 { s += i }
        DispatchQueue.main.async { resolve(s) }
      }
    }

- Pitfall 3: Not handling lifecycle/cleanup for timers or observers
  - Bad:
    @objc func start() {
      timer = Timer.scheduledTimer(...)
    }
  - Good:
    @objc func start() {
      invalidateTimerIfNeeded()
      timer = Timer.scheduledTimer(...)
    }
    @objc func stop() {
      invalidateTimerIfNeeded()
    }
    private func invalidateTimerIfNeeded() {
      timer?.invalidate()
      timer = nil
    }

- Pitfall 4: Returning non-JSON-convertible values
  - Bad:
    @objc func complexObject(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let obj = SomeCustomStruct(...)
      resolve(obj) // RN cannot serialize custom Swift structs
    }
  - Good:
    @objc func simpleDict(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["ok": true, "count": 42]
      resolve(dict)
    }

## Y. Why This Matters In Real Systems

- Performance and UX: Native modules enable low-latency access to hardware sensors, camera, biometrics, or heavy computations. Offloading work to background threads prevents jank and improves scroll/animation smoothness.
- Reliability and testing: Strong typing in Swift reduces edge-case bugs during data marshalling. Clear Promise rejection handling improves error visibility in JS.
- Maintainability and security: Encapsulation of platform-specific logic in dedicated modules keeps app code clean. Bridge boundaries help enforce separation of concerns and reduce churn when upgrading RN versions.
- Build and deployment considerations: Swift version compatibility, bridging headers, and module naming matter for CI pipelines. Ensure Podfile and Xcode project are configured to compile Swift code for RN bridging, and that you expose the correct module names in JS.
- Observability: Event emitters and status callbacks give you telemetry hooks (e.g., battery level, device orientation, live sensor data) that help monitor app health in production.

## Z. Study Questions

1. What is a native bridge module and why would you use one in a React Native (or similar) app?
2. In Swift bridging for React Native, how do you expose a class as a module named NativeBridge to JavaScript?
3. How do Promise-based methods work in Swift bridge modules? What are the roles of resolver and rejecter?
4. Why should long-running native tasks often be dispatched to a background queue, and how do you return results back to JS safely?
5. What is an RCTEventEmitter and what is a typical pattern to push events from Swift to JavaScript?

## Exercise

Multi-part practical coding challenge to implement a complete native bridge module with a simple event emitter and demonstrate JS usage.

Part A — Create a Swift Native Bridge Module
- Objective: Implement a module named DeviceInfoBridge exposing two Promise-based methods:
  - getDeviceName(): returns the current device name.
  - getSystemVersion(): returns the iOS system version.
- Steps:
  1) Add a bridging header to your iOS project if not already present:
     - Include: #import <React/RCTBridgeModule.h>
  2) Implement NativeBridge with two methods:
     - getDeviceName(resolver, rejecter)
     - getSystemVersion(resolver, rejecter)
  3) Ensure the module is exposed to React Native:
     - Use @objc(DeviceInfoBridge) class DeviceInfoBridge: NSObject, RCTBridgeModule { ... }
  4) Return values properly via resolver, handle any edge cases with rejecter.

Code sketch (Swift):

```swift
import Foundation
import UIKit

@objc(DeviceInfoBridge)
class DeviceInfoBridge: NSObject, RCTBridgeModule {

  static func requiresMainQueueSetup() -> Bool { return false }

  @objc func getDeviceName(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(UIDevice.current.name)
  }

  @objc func getSystemVersion(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(UIDevice.current.systemVersion)
  }
}
```

Part B — Create a Native Event Emitter
- Objective: Implement a simple event emitter that fires a “Tick” event every second.
- Steps:
  1) Create NativeEventModule.swift with RCTEventEmitter subclass.
  2) Define supportedEvents to include "Tick".
  3) Implement startTicking and stopTicking to manage a timer that emits Tick events.

Code sketch (Swift):

```swift
import Foundation
import React

@objc(TickEmitter)
class TickEmitter: RCTEventEmitter {

  private var timer: Timer?

  override func supportedEvents() -> [String]! {
    return ["Tick"]
  }

  @objc func startTicking() {
    DispatchQueue.main.async {
      self.timer?.invalidate()
      self.timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
        self.sendEvent(withName: "Tick", body: ["time": Date().timeIntervalSince1970])
      }
    }
  }

  @objc func stopTicking() {
    DispatchQueue.main.async {
      self.timer?.invalidate()
      self.timer = nil
    }
  }

  override static func requiresMainQueueSetup() -> Bool { return true }
}
```

Part C — Basic JS usage (conceptual)
- How you would call from JavaScript (assuming React Native setup):
  - Import and access NativeModules.DeviceInfoBridge.getDeviceName().then(...).catch(...)
  - Import and subscribe to Tick events using nativeEventEmitter.

Example JS usage skeleton (conceptual):

```javascript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { DeviceInfoBridge, TickEmitter } = NativeModules;
const tickEmitter = new NativeEventEmitter(TickEmitter);

// Get device info
DeviceInfoBridge.getDeviceName()
  .then((name) => console.log('Device name:', name))
  .catch((err) => console.error(err));

DeviceInfoBridge.getSystemVersion()
  .then((ver) => console.log('System version:', ver))
  .catch((err) => console.error(err));

// Listen for ticks
const subscription = tickEmitter.addListener('Tick', payload => {
  console.log('Tick at', payload.time);
});

// Start/stop ticking
DeviceInfoBridge.startTicking && DeviceInfoBridge.startTicking();
setTimeout(() => {
  DeviceInfoBridge.stopTicking && DeviceInfoBridge.stopTicking();
  subscription.remove();
}, 10000);
```

What you should learn from this exercise:
- How to wire a Swift native module into a RN project using bridging headers and @objc annotations.
- How to expose Promise-based APIs and events to JavaScript.
- How to manage threading considerations for heavy or UI-related work.
- How to reason about production readiness: error handling, lifecycle, and backpressure for event streams.

If you’d like, I can tailor the code samples to your exact RN version, or demonstrate a full end-to-end project snippet including build settings, Podfile adjustments, and a complete JS integration example.