# Track: Mobile App Development — Phase 4: Native Modules — Writing Native Bridge Modules (React Native)

A native bridge module in React Native lets you extend the JavaScript layer with platform-specific capabilities. By writing small, well-scoped native modules, you unlock OS APIs, performance-critical tasks, and access to features that aren’t exposed through the standard React Native API. This is essential in production apps that require tight integration with device hardware, secure storage, advanced cryptography, or platform-specific optimizations. Mastering native bridge modules enables you to build reusable, cross-platform services that feel native and perform like first-class citizens in each platform.

## 1. Concept and API Surface Design

This section introduces the concept of a native bridge module, how a JS app talks to native code, and how to design a stable API surface that works consistently across iOS and Android.

Code: a minimal JS usage pattern showing a native module call.

```js
import { NativeModules } from 'react-native';
const { NativeBridge } = NativeModules;

async function fetchDeviceInfo() {
  try {
    const info = await NativeBridge.getDeviceInfo();
    console.log('Device Info:', info);
  } catch (e) {
    console.error('Failed to fetch device info', e);
  }
}

fetchDeviceInfo();
```

### Line-by-line explanation
- Line 1: Import NativeModules from React Native, which exposes all registered native modules.
- Line 2: Destructure to obtain a reference to our platform module named NativeBridge (the native side must export this module with that exact name).
- Line 4: Define an async JS function that calls a native method and awaits a Promise return.
- Line 5: Try to resolve the Promise and log the resulting information.
- Line 7: Catch and log any error that occurs during the native call.
- Line 9: Invoke the function to trigger the native bridge call.

Key takeaways:
- The JavaScript layer treats native module methods as asynchronous by default, typically using Promises or callbacks.
- The module name (NativeBridge) must match between JS and the native code. Consistency here avoids runtime errors.
- Design a small, stable API surface: one module with a focused set of methods, and use promises for async results.

## 2. API Design: Promises vs Callbacks

Native methods can be exposed as Promises or callbacks. Promises are generally easier to compose with modern async/await patterns, while callbacks can be useful for streaming results or event-style APIs. This section shows how to design both patterns and why you might choose one over the other.

Code: JavaScript usage patterns for Promise-based and Callback-based native methods.

```js
// Promise-based API (recommended for most use cases)
NativeBridge.getDeviceInfo()
  .then(info => {
    // use the info object
  })
  .catch(err => {
    // handle error
  });

// Callback-based API (when you need a partial result or streaming)
NativeBridge.logEvent('APP_START', { timestamp: Date.now() }, (err, result) => {
  if (err) {
    // handle error
  } else {
    // handle success result
  }
});
```

### Line-by-line explanation
- Promise-based portion:
  - Line 1: Call a native method that returns a Promise.
  - Line 2-5: Attach a .then() for success and .catch() for error handling.
- Callback-based portion:
  - Line 8: Call a native method that accepts a callback function as its last argument.
  - Line 9-15: Inside the callback, check for errors and handle the result accordingly.
- Rationale:
  - Use Promises for simple, async return values.
  - Use callbacks when the native code needs to report progress or multiple chunks asynchronously.

Design notes:
- If you’re starting new modules, favor Promise-based APIs for readability and consistency with modern JavaScript.
- When exporting callbacks, keep the callback signature stable (error-first pattern) to avoid confusion.

## 3. iOS Native Module — Objective-C (Promise-based)

This section provides a concrete iOS native module example using Objective-C. It exposes a single method getDeviceInfo that returns a Promise with a dictionary of device name and system version.

Files to add (Objective-C):
- RNBridgeModule.h
- RNBridgeModule.m

Code: RNBridgeModule.h

```objc
// RNBridgeModule.h
#import <React/RCTBridgeModule.h>

@interface RNBridgeModule : NSObject <RCTBridgeModule>
@end
```

Code: RNBridgeModule.m

```objc
// RNBridgeModule.m
#import "RNBridgeModule.h"
#import <React/RCTLog.h>

@implementation RNBridgeModule

RCT_EXPORT_MODULE();

// Promise-based API: getDeviceInfo
RCT_REMAP_METHOD(getDeviceInfo,
                 resolver:(RCTPromiseResolveBlock)resolver
                 rejecter:(RCTPromiseRejectBlock)rejecter)
{
  @try {
    NSDictionary *info = @{
      @"name": [[UIDevice currentDevice] name] ?: @"Unknown",
      @"systemVersion": [[UIDevice currentDevice] systemVersion] ?: @"Unknown"
    };
    resolver(info);
  }
  @catch (NSException *exception) {
    rejecter(@"ERR_GET_INFO", @"Could not fetch device info", nil);
  }
}
@end
```

### Line-by-line explanation
- Line 1: Import the header for the RNBridgeModule, which makes the module known to React Native.
- Line 3: Implement the RNBridgeModule class.
- Line 5: Use RCT_EXPORT_MODULE to register the module with the React Native bridge. The module name defaults to the class name without the “RN” prefix if present; here it will be NativeBridgeModule unless specified otherwise.
- Line 8-9: Use RCT_REMAP_METHOD to expose getDeviceInfo as a Promise-based method. The first parameter is the JS-visible name, and the two blocks (resolver, rejecter) are the Promise resolve/reject callbacks.
- Line 11: Enter a try block to safely fetch device info.
- Line 12-13: Build a dictionary with the device name and system version.
- Line 14: Resolve the Promise with the info dictionary.
- Line 16-19: Catch any exception and reject the Promise with an error code and message.

Notes:
- The dictionary keys ("name", "systemVersion") become the keys in the object you receive in JavaScript.
- You can add more fields (model, deviceName, etc.) if needed, but keep the payload reasonably small to minimize bridge traffic.

## 4. Android Native Module — Java (Promise-based)

This section shows an Android native module implemented in Java that exposes a getDeviceInfo method returning a Promise-like result (via React Native’s Promise). It also includes a minimal package to register the module.

Code: NativeBridgeModule.java

```java
// package com.example.app;
package com.example.app;

import com.facebook.react.bridge.*;

import android.os.Build;

public class NativeBridgeModule extends ReactContextBaseJavaModule {

  NativeBridgeModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "NativeBridge";
  }

  @ReactMethod
  public void getDeviceInfo(Promise promise) {
    try {
      WritableMap info = Arguments.createMap();
      info.putString("model", Build.MODEL);
      info.putString("version", Build.VERSION.RELEASE);
      promise.resolve(info);
    } catch (Exception e) {
      promise.reject("ERR_GET_INFO", e);
    }
  }
}
```

Code: NativeBridgePackage.java

```java
package com.example.app;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.ReactPackage;
import com.facebook.react.common.MapBuilder;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;

public class NativeBridgePackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Arrays.asList(new NativeBridgeModule(reactContext));
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return new ArrayList<>();
  }
}
```

Code: Registration in MainApplication.java (or equivalent)

```java
// inside your MainApplication class
@Override
public List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // Add the custom package
  packages.add(new NativeBridgePackage());
  return packages;
}
```

### Line-by-line explanation
- NativeBridgeModule.java
  - Lines 1-2: Package declaration (adjust to your app’s package).
  - Line 7: Class declaration extending ReactContextBaseJavaModule to integrate with React Native.
  - Line 11: getName returns the module’s name exposed to JS ("NativeBridge").
  - Line 14: Annotate getDeviceInfo as a ReactMethod meaning it’s accessible from JS.
  - Line 16-23: Build a WritableMap with model and version; resolve the Promise with the map.
  - Line 24-28: In case of exception, reject the Promise with an error code and message.
- NativeBridgePackage.java
  - Lines 1-2: Package declaration.
  - Line 9: Implement createNativeModules to return a list containing the NativeBridgeModule.
  - Line 15: Implement createViewManagers (not used here) returning an empty list.
- MainApplication.java
  - Lines 1-4: Typical imports are omitted for brevity; ensure your package imports align.
  - getPackages(): Acquire existing packages, then add the NativeBridgePackage to register the module with the React Native runtime.

Notes:
- The module name in JS is NativeBridge and must match the getName() return value.
- The method getDeviceInfo uses a Promise in Java; you can also implement callback-based methods using a different pattern (Callback) if needed.

## 5. Consuming Native Modules from JavaScript

This section shows how to consume the native modules in your React Native JavaScript code, including Basic usage and type expectations.

Code: JavaScript usage and a small TypeScript-style type hint example (conceptual)

```js
// Type hint-like example (not required, just for clarity)
type DeviceInfo = {
  model: string;
  version: string;
};

// Basic usage
import { NativeModules } from 'react-native';
const { NativeBridge } = NativeModules;

async function showDeviceInfo() {
  try {
    const info = await NativeBridge.getDeviceInfo();
    // info is expected to be an object like { model: 'Pixel 5', version: '11' }
    console.log(info);
  } catch (err) {
    console.error('Error fetching device info', err);
  }
}
```

### Line-by-line explanation
- Line 1-4: Optional TypeScript-like annotation to illustrate expected shape; in plain JS you won’t see types.
- Line 6: Import NativeModules to access native bridge modules.
- Line 7: Destructure NativeBridge from NativeModules to call getDeviceInfo().
- Line 9-17: An async function that awaits the Promise from the native method, logging the device info or handling errors.
- Line 18: Call the function to execute the flow.

Real-world notes:
- On iOS and Android, ensure the native module is correctly compiled and the app rebuilds after adding new native code.
- For TypeScript setups, you can augment the React Native module types with a d.ts to improve autocomplete and type safety.

## X. Common Beginner Mistakes

### 1) Bad: Not exporting or naming the module consistently

- Bad (iOS, missing proper export)
```objc
// RNBridgeModule.m
@implementation RNBridgeModule
// Missing RCT_EXPORT_MODULE() or wrong class name
@end
```

- Good (correct export and naming)
```objc
@implementation RNBridgeModule
RCT_EXPORT_MODULE(NativeBridge);
@end
```

### 2) Bad: Android module not registered in the package/main application

- Bad (not adding to getPackages)
```java
@Override
public List<ReactPackage> getPackages() {
  return Arrays.asList(new MainReactPackage());
  // NativeBridgePackage not added
}
```

- Good (register the package)
```java
@Override
public List<ReactPackage> getPackages() {
  List<ReactPackage> packages = new PackageList(this).getPackages();
  packages.add(new NativeBridgePackage());
  return packages;
}
```

### 3) Bad: Data type mismatches and unstructured payloads

- Bad (returning a raw string instead of a map)
```objc
// RNBridgeModule.m
resolver(@[@"DeviceName", @"SystemVersion"]);
```

- Good (structured map payload)
```objc
NSDictionary *info = @{
  @"name": [[UIDevice currentDevice] name],
  @"systemVersion": [[UIDevice currentDevice] systemVersion]
};
resolver(info);
```

### 4) Bad: Performing long tasks on the main thread or using synchronous methods

- Bad (long task on main thread)
```objc
RCT_EXPORT_METHOD(simulateHeavyWork:(RCTResponseSenderBlock)callback) {
  // Busy-wait loop or sleep on main thread
  [NSThread sleepForTimeInterval:5.0];
  callback(@[[NSNull null], @YES]);
}
```

- Good (offload work to a background thread or keep methods asynchronous)
```objc
RCT_REMAP_METHOD(fetchDataInBackground,
                 resolver:(RCTPromiseResolveBlock)resolver
                 rejecter:(RCTPromiseRejectBlock)rejecter) {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
     // heavy work here
     NSDictionary *result = @{@"ok": @YES};
     dispatch_async(dispatch_get_main_queue(), ^{
       resolver(result);
     });
  });
}
```

### 5) Bad: Not declaring thread requirements when needed

- Bad (assuming main thread for a UI-facing task without declaration)
```objc
RCT_EXPORT_METHOD(updateUIHint:(RCTResponseSenderBlock)callback) {
  // Update UI from a non-main thread (dangerous)
  callback(@[[NSNull null], @1]);
}
```

- Good (declare main thread when needed)
```objc
+ (BOOL)requiresMainQueueSetup {
  return YES;
}
```

## Y. Why This Matters In Real Systems

- Performance: Moving heavy or OS-specific tasks to native code reduces JavaScript bridge contention and avoids expensive serializations across the bridge.
- Access to OS APIs: Many platform capabilities (AR, sensors, secure keystore, advanced cryptography, low-level hardware access) are best implemented natively.
- Reusability & Maintenance: A well-designed set of native modules can be shared across iOS and Android, providing a consistent API surface for the JS layer and easing maintenance.
- Security & Compliance: Some security-sensitive operations (e.g., secure storage, attestation) are better isolated in native code with strict permissions and auditing.
- Debuggability: Native modules provide a dedicated workflow (Xcode/Android Studio) for debugging crashes and memory usage, complementing JS-level debugging.

## Z. Study Questions

1) What is the purpose of a native bridge module in React Native?  
2) How do you export a native method to JavaScript as a Promise in iOS (Objective-C)?  
3) How do you register an Android native module so it’s available to React Native JavaScript?  
4) Why should you prefer Promise-based APIs over callback-based APIs in most cases?  
5) Name two common pitfalls when adding a new native module to a project.

## Exercise

Goal: Build a small, cross-platform native module named NativeBridge that exposes a single method getDeviceInfo across iOS (Objective-C) and Android (Java). Then consume that module from React Native JavaScript and display the result in a simple component.

Part A — Prepare the native side (iOS and Android)
1. iOS (Objective-C)
   - Create RNBridgeModule.h and RNBridgeModule.m as described in the section above.
   - Ensure you export a Promise-based method getDeviceInfo that returns a dictionary with keys model and systemVersion.
   - Confirm the module is included in the Xcode target and that a Release build compiles successfully.

2. Android (Java)
   - Create NativeBridgeModule.java and NativeBridgePackage.java as described above.
   - Register the package in MainApplication.java (or appropriate place for your RN version).
   - Ensure getDeviceInfo returns a WritableMap with keys model and version (or systemVersion) and that it resolves in the promise.

Part B — Consume from React Native JavaScript
1. Create a small component (DeviceInfoCard.js) that calls NativeBridge.getDeviceInfo() and renders model and systemVersion in a card-like UI.
2. Add basic error handling and a loading indicator while the bridge resolves.
3. Ensure you can hot-reload the app during development and see updates when the native code rebuilds.

Part C — Extend for parity and resilience (optional, extra challenge)
1. Add a second method to the native module: getAppVersion, which reads:
   - iOS: CFBundleShortVersionString from Info.plist
   - Android: versionName from build.gradle
  2. Expose it via Promise-based API and update the React Native component to display both device info and app version.
  3. Add a small unit-test-like script (or integration test) that mocks the native call behavior to verify the JavaScript surface behaves correctly when the native layer is slow or throws.

Deliverables:
- The fully implemented iOS and Android native modules with proper exports and registration.
- The JavaScript wrapper usage code showing how to call and consume getDeviceInfo (and getAppVersion if you add it).
- A minimal React Native component that displays the results, including error handling and a loading state.

Notes for success:
- Ensure you rebuild the app after changes to native code (clean builds often fix linking issues).
- Use console.log with a descriptive prefix to trace native call flows in dev.
- Keep the surface stable and well-documented so future developers can extend the module without breaking the JS contract.