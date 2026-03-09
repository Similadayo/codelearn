# Track: Mobile App Development — Module: Phase 4 — Native Modules

Compelling introductory paragraph:
In Flutter, native bridge modules (implemented via Platform Channels) let you reach into Android and iOS platform capabilities from Dart without rewriting the entire app. Writing native bridge modules is essential when you need to use platform-specific SDKs, high-performance APIs, or legacy native code. Mastering this pattern enables you to extend Flutter apps with robust, production-grade features while maintaining a single shared Dart codebase.

## 1. Foundation: Platform Channels in Flutter
Code (Dart):
```dart
// lib/native_bridge.dart
import 'package:flutter/services.dart';

class NativeBridge {
  // Shared channel name for both Android and iOS
  static const MethodChannel _channel = MethodChannel('com.example/native_bridge');

  // Simple string result from native side
  static Future<String?> getPlatformVersion() {
    return _channel.invokeMethod<String>('getPlatformVersion');
  }

  // Complex data: map of device info from native side
  static Future<Map<String, dynamic>?> getDeviceInfo() async {
    final dynamic result = await _channel.invokeMethod('getDeviceInfo');
    return result as Map<String, dynamic>?;
  }
}
```

### Line-by-line explanation
- Line 1: import 'package:flutter/services.dart'; — Imports Flutter’s platform services needed for MethodChannel.
- Line 4: class NativeBridge { — Declares a wrapper class to encapsulate native calls.
- Line 6: static const MethodChannel _channel = MethodChannel('com.example/native_bridge'); — Creates a channel with a unique name shared by Dart and native code.
- Line 9: static Future<String?> getPlatformVersion() { … } — Exposes a typed method to fetch a platform version from native code.
- Line 12: static Future<Map<String, dynamic>?> getDeviceInfo() async { … } — Exposes a method to fetch a map of device information from native code.
- Line 13-15: final dynamic result = await _channel.invokeMethod('getDeviceInfo'); return result as Map<String, dynamic>?; — Calls the native method and casts the dynamic response to a map.

## 2. Dart Side: Implementing a Native Bridge Wrapper
Code (Dart + minimal UI usage):
```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'native_bridge.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Native Bridge Demo',
      home: Scaffold(
        appBar: AppBar(title: Text('Native Bridge Demo')),
        body: Center(child: NativeBridgeWidget()),
      ),
    );
  }
}

class NativeBridgeWidget extends StatefulWidget {
  @override
  _NativeBridgeWidgetState createState() => _NativeBridgeWidgetState();
}

class _NativeBridgeWidgetState extends State<NativeBridgeWidget> {
  String _platformVersion = 'Unknown';
  Map<String, dynamic>? _deviceInfo;

  @override
  void initState() {
    super.initState();
    _loadInfo();
  }

  Future<void> _loadInfo() async {
    final version = await NativeBridge.getPlatformVersion();
    final info = await NativeBridge.getDeviceInfo();
    setState(() {
      _platformVersion = version ?? 'Unavailable';
      _deviceInfo = info;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text('Platform Version: $_platformVersion'),
        SizedBox(height: 20),
        Text('Device Info: ${_deviceInfo ?? 'Unavailable'}'),
        SizedBox(height: 20),
        ElevatedButton(
          onPressed: _loadInfo,
          child: Text('Refresh Info'),
        ),
      ],
    );
  }
}
```

### Line-by-line explanation
- Lines 1-3: Standard Flutter imports and the native bridge import; this ties the UI to the native channel wrapper.
- Lines 7-17: MyApp and basic MaterialApp scaffold for a minimal UI.
- Lines 22-28: NativeBridgeWidget stateful widget to hold and display data.
- Lines 34-41: _loadInfo() fetches platform version and device info from the native side and triggers a UI update.
- Lines 45-56: UI rendering: shows platform version, device info, and a button to refresh values.

## 3. Android Native (Kotlin): Implementing the Method Channel
Code (Kotlin):
```kotlin
// android/app/src/main/kotlin/com/example/nativebridge/MainActivity.kt
package com.example.nativebridge

import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
  private val CHANNEL = "com.example/native_bridge"

  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)

    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
      when (call.method) {
        "getPlatformVersion" -> {
          result.success("Android ${Build.VERSION.RELEASE}")
        }
        "getDeviceInfo" -> {
          // Example composite data
          val info = mapOf(
            "manufacturer" to Build.MANUFACTURER,
            "model" to Build.MODEL,
            "version" to Build.VERSION.RELEASE
          )
          result.success(info)
        }
        else -> result.notImplemented()
      }
    }
  }
}
```

### Line-by-line explanation
- Line 1: Package declaration.
- Line 6-9: Imports required for Flutter integration and Android specifics.
- Line 12: Class declaration extending FlutterActivity.
- Line 15: CHANNEL constant matching the Dart side.
- Lines 17-29: override configureFlutterEngine to register the MethodChannel and handle method calls.
- Lines 19-27: MethodCallHandler:
  - When method is "getPlatformVersion", return the Android version string.
  - When method is "getDeviceInfo", construct a simple Map<String, String> with manufacturer, model, and version, and send it back.
  - Else, indicate the method is not implemented.

## 4. iOS Native (Swift): Implementing the Method Channel
Code (Swift):
```swift
// ios/Runner/AppDelegate.swift
import UIKit
import Flutter

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)

    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(name: "com.example/native_bridge",
                                         binaryMessenger: controller.binaryMessenger)
      channel.setMethodCallHandler { (call, result) in
        switch call.method {
        case "getPlatformVersion":
          result("iOS \(UIDevice.current.systemVersion)")
        case "getDeviceInfo":
          let info: [String: Any] = [
            "manufacturer": UIDevice.current.model, // approximated
            "version": UIDevice.current.systemVersion,
            "name": UIDevice.current.name
          ]
          result(info)
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

### Line-by-line explanation
- Lines 1-3: Import required frameworks.
- Line 7: AppDelegate class declaration.
- Line 12: didFinishLaunchingWithOptions override begins; essential Flutter setup occurs here.
- Line 16: Retrieve the root Flutter view controller to attach the channel.
- Lines 17-26: Create a FlutterMethodChannel named "com.example/native_bridge" and attach a handler.
  - Case "getPlatformVersion": return the iOS system version.
  - Case "getDeviceInfo": return a dictionary with model, system version, and device name.
  - Default: indicate not implemented.
- Line 30: Return the result of the super call.

## 5. Data Types and Errors: Handling Complex Data and Failure Modes
Code (Dart, Kotlin, Swift):
```dart
// Dart: error handling for robustness
try {
  final version = await NativeBridge.getPlatformVersion();
  final info = await NativeBridge.getDeviceInfo();
  // Use version and info as needed
} on PlatformException catch (e) {
  // Safe fallback or error UI
  print('Native call failed: ${e.message}');
}
```

Kotlin (error path example):
```kotlin
// Inside the Kotlin method handler
try {
  val info = mapOf(
    "manufacturer" to Build.MANUFACTURER,
    "model" to Build.MODEL,
    "version" to Build.VERSION.RELEASE
  )
  result.success(info)
} catch (e: Exception) {
  result.error("UNAVAILABLE", "Failed to fetch device info: ${e.message}", null)
}
```

Swift (error path example):
```swift
case "getDeviceInfo":
  do {
    let info: [String: Any] = [
      "manufacturer": UIDevice.current.model,
      "version": UIDevice.current.systemVersion,
      "name": UIDevice.current.name
    ]
    result(info)
  } catch {
    result(FlutterError(code: "UNAVAILABLE", message: "Device info fetch failed", details: nil))
  }
```

### Line-by-line explanation
- Dart try/catch block: Demonstrates robust error handling in Dart when a native call fails.
- Kotlin try/catch: Ensures that any unexpected exception returns a structured error via result.error, enabling proper error handling on the Dart side.
- Swift do/catch: Similar error handling path to surface a FlutterError with codes/messages to Dart.

## 6. Testing, Debugging, and Best Practices
- Start with a minimal, well-named channel: Use a stable channel name (e.g., com.example/native_bridge) and ensure it matches on both sides.
- Prefer typed returns: When returning complex data, use Map<String, dynamic> on Dart and a corresponding Map on native (HashMap in Kotlin, Dictionary in Swift).
- Handle nullability and typing: Dart should cast dynamic results carefully; use try/catch to handle PlatformException.
- Build plugins for reuse: If you plan to expose multiple native features, package them as a Flutter plugin to keep platform code isolated and testable.
- Security considerations: Validate inputs/outputs across the boundary; avoid leaking sensitive data; consider permission requirements on native platforms.
- Testing: Use unit tests on the Dart side with mock MethodChannel to validate call sequences; write integration tests on real devices to exercise platform code paths.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Channel name mismatch
  - Bad:
  ```dart
  // lib/native_bridge.dart
  static const MethodChannel _channel = MethodChannel('native_bridge');
  ```
  Android/iOS:
  ```kotlin
  MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.example/native_bridge")
  ```
  - Good:
  ```dart
  static const MethodChannel _channel = MethodChannel('com.example/native_bridge');
  ```
  Android/iOS:
  ```kotlin
  MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.example/native_bridge")
  ```
  ```swift
  let channel = FlutterMethodChannel(name: "com.example/native_bridge", binaryMessenger: controller.binaryMessenger)
  ```
- Pitfall 2: Not handling asynchronous results or ignoring errors
  - Bad:
  ```dart
  final version = await _channel.invokeMethod('getPlatformVersion');
  ```
  - Good:
  ```dart
  try {
    final version = await _channel.invokeMethod<String>('getPlatformVersion');
  } on PlatformException catch (e) {
    // graceful fallback
  }
  ```
- Pitfall 3: Returning non-serializable data or incorrect typing
  - Bad (returning a custom Dart object directly)
  ```kotlin
  val info = DeviceInfo("Google", "Pixel 5", "11")
  result.success(info) // not serializable
  ```
  - Good (return a serializable map/dictionary)
  ```kotlin
  val info = mapOf("manufacturer" to "Google", "model" to "Pixel 5", "version" to "11")
  result.success(info)
  ```
- Pitfall 4: Not updating on both platforms when API changes
  - Bad: Only updating Android code; iOS path remains stale.
  - Good: Maintain synchronized method names and data shapes across platforms; add tests for each platform.

## Y. Why This Matters In Real Systems — production context and real usage
- Native bridges enable feature parity: You can expose platform-specific capabilities (biometrics, sensors, native UI components, or third-party SDKs) that aren’t available in Dart.
- Performance and UX: Certain tasks are best performed in native code for responsiveness, lower latency, or leveraging optimized platform APIs.
- Plugin ecosystem and maintenance: A well-designed bridge pattern scales to plugins, enabling reuse across apps and teams; clear channel naming and data contracts reduce integration costs.
- Security and stability: Boundary logic must be deterministic; always validate and sanitize data crossing the boundary, catch errors, and provide meaningful error codes to the Dart layer.
- Testing strategy: Combine unit tests for the Dart wrapper with integration tests on both Android and iOS to catch regressions early.

## Z. Study Questions — 5 recall questions
1) What is a Flutter Platform Channel, and what are the key components involved on Dart and native sides?
2) How do you choose a channel name, and why must the Dart and native sides agree on it?
3) How can you transfer complex data (maps, lists) across the channel, and what data types are recommended on each side?
4) What is the purpose of result.notImplemented(), and when should you use it?
5) Name two common production best practices when maintaining native bridge modules across Android and iOS.

## Exercise
Practical multi-part coding challenge to solidify your understanding of writing native bridge modules in Flutter.

Part A — Scaffold the Flutter app
- Create a new Flutter app (or reuse an existing one).
- Add a Dart wrapper (lib/native_bridge.dart) and a simple UI (lib/main.dart) that calls:
  - getPlatformVersion
  - getDeviceInfo
- Ensure the UI updates when you press a button.

Deliverables:
- lib/native_bridge.dart with a MethodChannel named com.example/native_bridge
- lib/main.dart wiring a simple UI to display platformVersion and deviceInfo

Part B — Implement Android Native code (Kotlin)
- In MainActivity.kt, implement a MethodChannel handler for:
  - getPlatformVersion -> "Android <version>"
  - getDeviceInfo -> map with manufacturer, model, version
- Ensure proper error handling and notImplemented for unknown methods.

Deliverables:
- android/app/src/main/kotlin/com/example/nativebridge/MainActivity.kt

Part C — Implement iOS Native code (Swift)
- In AppDelegate.swift, implement a FlutterMethodChannel handler for:
  - getPlatformVersion -> "iOS <system version>"
  - getDeviceInfo -> dictionary with manufacturer (approx UIDevice.model), version (systemVersion), name
- Include basic error handling with FlutterError for unknown methods.

Deliverables:
- ios/Runner/AppDelegate.swift (or where you attach the channel per your template)

Part D — Test and verify
- Run the Flutter app on both Android and iOS simulators/devices.
- Press the “Refresh Info” button and confirm you see:
  - Platform version: Android/iOS <version>
  - Device info: a map with the keys manufacturer, model/name, and version
- Introduce a simulated failure (e.g., in Android, throw an exception in the handler) and verify the Dart side handles PlatformException.

Notes and tips:
- Keep channel names stable and well-documented to prevent cross-team confusion.
- Use try/catch on Dart for PlatformException and show a user-friendly message.
- Consider packaging a plugin if you plan to reuse these bridges across multiple projects.