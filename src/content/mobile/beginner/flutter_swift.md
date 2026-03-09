# Introduction to Flutter & Dart

Track: Mobile App Development | Module: Phase 2 — Cross-Platform
Topic: Introduction to Flutter & Dart
Language/Stack: Swift iOS

Flutter and Dart empower cross-platform mobile development, letting you write a single codebase that compiles to native iOS and Android apps. This lesson introduces the core concepts of Flutter (UI toolkit) and Dart (programming language), with a focus on how you’d approach building for iOS using Swift as a point of reference. You’ll see practical code samples, line-by-line explanations, common beginner mistakes, and hands-on exercises you can apply in real projects.

## 1. Getting Started with Flutter & Dart: The Big Picture

In this section, you’ll learn what Flutter is, how Dart fits in, and why Flutter is a strong choice for iOS-first teams aiming for cross-platform delivery. We’ll also compare a Flutter approach with native Swift iOS development to highlight trade-offs and design patterns.

Code: Minimal Flutter app entry (main.dart)

```dart
import 'package:flutter/material.dart';

void main() {
  // Entry point of the Flutter application
  runApp(MyApp());
}

/// A very small, self-contained app surface.
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // MaterialApp provides standard Material Design visuals and navigation
    return MaterialApp(
      title: 'Flutter Intro',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: HomeScreen(),
    );
  }
}

/// The home screen of the app with simple text.
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Hello Flutter & Dart')),
      body: Center(
        child: Text(
          'Welcome to Cross-Platform Mobile Development!',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18),
        ),
      ),
    );
  }
}
```

### Line-by-line explanation
- import 'package:flutter/material.dart'; — Imports Flutter’s Material Design components and framework.
- void main() { runApp(MyApp()); } — Entry point of the Dart/Flutter app; runs the widget tree starting with MyApp.
- class MyApp extends StatelessWidget { ... } — Declares a stateless root widget.
- build(BuildContext context) { return MaterialApp(...); } — Builds the app’s root widget, configuring title, theme, and home.
- MaterialApp(..., home: HomeScreen()) — Establishes the main screen of the app.
- class HomeScreen extends StatelessWidget { ... } — Defines a simple screen with an AppBar and centered text.
- Scaffold(...) — Provides a basic page layout with an app bar and body.
- AppBar(title: Text('Hello Flutter & Dart')) — Creates the top navigation bar.
- Center(...) and Text(...) — Centers a text label on the screen.

## 2. Flutter Widgets & Layouts: Building UI with Composition

Flutter emphasizes composing small widgets to build complex UI. This section shows a stateful counter app to demonstrate interaction, layout, and state management patterns in Flutter, with a quick Swift comparison for how you’d structure a UI in native iOS.

Code: Counter app (stateless root with a StatefulWidget)

```dart
import 'package:flutter/material.dart';

void main() => runApp(CounterApp());

class CounterApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: CounterPage(),
    );
  }
}

class CounterPage extends StatefulWidget {
  @override
  _CounterPageState createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _count = 0; // internal state

  void _increment() {
    setState(() {
      _count++; // trigger UI refresh
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Counter Example')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Clicks: $_count', style: TextStyle(fontSize: 24)),
            SizedBox(height: 16),
            ElevatedButton(onPressed: _increment, child: Text('Increment')),
          ],
        ),
      ),
    );
  }
}
```

### Line-by-line explanation
- void main() => runApp(CounterApp()); — Tiny entry point that launches CounterApp.
- class CounterApp extends StatelessWidget { ... } — Stateless root widget for this mini app.
- MaterialApp(home: CounterPage()) — Creates an app shell and sets CounterPage as the main route.
- class CounterPage extends StatefulWidget { ... } — A widget that holds mutable state.
- _CounterPageState maintains _count and defines _increment() that calls setState to refresh UI.
- setState(() { _count++; }); — Notifies Flutter to redraw the UI with the updated value.
- AppBar, Center, Column, Text, ElevatedButton — Basic widgets composing the screen: bar, centered layout, vertical stacking, text label, and a tappable button.
- ElevatedButton(onPressed: _increment, ...) — Hooks a UI action to business logic.

## 3. Dart Essentials: Types, Null Safety, and Async

Dart is the language behind Flutter. This section covers null safety (a core modern Dart feature), basic types, and asynchronous programming with Futures. These patterns map to production code that fetches data, handles errors, and maintains responsive UIs in iOS apps.

Code: Async data fetch with Future

```dart
import 'dart:async';

void main() async {
  print('Fetching data...');
  final data = await fetchData();
  print('Data: $data');
}

Future<String> fetchData() async {
  // Simulate network latency
  await Future.delayed(Duration(seconds: 2));
  return 'Sample payload';
}
```

### Line-by-line explanation
- import 'dart:async'; — Imports asynchronous utilities and Future types.
- void main() async { ... } — Marks main as async to await asynchronous work.
- print('Fetching data...'); — Logs initial action.
- final data = await fetchData(); — Waits for the asynchronous operation to complete.
- print('Data: $data'); — Outputs the received data.
- Future<String> fetchData() async { ... } — Defines an asynchronous function returning a String.
- await Future.delayed(Duration(seconds: 2)); — Simulates a delay as a stand-in for a network call.
- return 'Sample payload'; — Returns the result after the simulated delay.

Note: Dart’s null safety ensures types are non-nullable by default. You’ll see examples where you explicitly allow or handle nulls, e.g., String? could be used when a value may be missing, and value ?? fallback provides a safe default.

## 4. Flutter & Swift Interop on iOS: Platform Channels

Cross-platform apps sometimes need to access native capabilities. Flutter uses platform channels to communicate with iOS (Swift) or Android (Kotlin/Java). This section demonstrates a simple battery level example, showing how Dart calls into Swift code on iOS.

Code: Dart side (MethodChannel) for iOS battery level

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() => runApp(BatteryDemo());

class BatteryDemo extends StatefulWidget {
  @override
  _BatteryDemoState createState() => _BatteryDemoState();
}

class _BatteryDemoState extends State<BatteryDemo> {
  static const platform = MethodChannel('com.example/battery');
  int _battery = -1;

  Future<void> _getBatteryLevel() async {
    int batteryLevel;
    try {
      final int result = await platform.invokeMethod('getBatteryLevel');
      batteryLevel = result;
    } on PlatformException catch (e) {
      batteryLevel = -1;
    }

    setState(() { _battery = batteryLevel; });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Battery Level (iOS)')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Battery level: ${_battery == -1 ? 'Unknown' : '$_battery%'}'),
              SizedBox(height: 16),
              ElevatedButton(onPressed: _getBatteryLevel, child: Text('Get Battery Level')),
            ],
          ),
        ),
      ),
    );
  }
}
```

Code: Swift side (AppDelegate.swift) for iOS

```swift
import UIKit
import Flutter

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)

    guard let controller = window?.rootViewController as? FlutterViewController else {
      fatalError("Root view controller is not a FlutterViewController")
    }

    let batteryChannel = FlutterMethodChannel(name: "com.example/battery",
                                              binaryMessenger: controller.binaryMessenger)
    batteryChannel.setMethodCallHandler { (call, result) in
      if call.method == "getBatteryLevel" {
        let batteryLevel = self.getBatteryLevel()
        if batteryLevel == -1 {
          result(FlutterError(code: "UNAVAILABLE",
                              message: "Battery level not available.",
                              details: nil))
        } else {
          result(Int(batteryLevel))
        }
      } else {
        result(FlutterMethodNotImplemented)
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func getBatteryLevel() -> Int {
    UIDevice.current.isBatteryMonitoringEnabled = true
    let level = Int(UIDevice.current.batteryLevel * 100)
    return level >= 0 ? level : -1
  }
}
```

### Line-by-line explanation
- Dart side: MethodChannel name 'com.example/battery' is how the Dart and Swift sides identify the bridge.
- platform.invokeMethod('getBatteryLevel') — Sends a message to iOS to execute the corresponding native method.
- Battery level handling and error catching ensure robust UX on iOS.

- Swift side: Creates a FlutterMethodChannel with the same name and registers a handler.
- batteryChannel.setMethodCallHandler — Listens for 'getBatteryLevel' calls from Dart and returns the numeric battery level or an error.
- getBatteryLevel() — Enables battery monitoring and converts UI’s battery percentage to an integer; returns -1 when unavailable.

Note: Platform channels require proper iOS project setup (Swift compatibility, bridging headers if needed). This example demonstrates the pattern you’d implement in production to reach native capabilities from Flutter.

## X. Common Beginner Mistakes

Below are 3+ real pitfalls with side-by-side bad vs good examples. Each pair includes a short explanation and a code snippet. After each snippet, you’ll find a line-by-line explanation.

### Pitfall 1: Mutating state outside of setState (Flutter)

Bad:
```dart
class CounterPage extends StatefulWidget { /* ... */ }

class _CounterPageState extends State<CounterPage> {
  int _count = 0;

  void _increment() {
    _count++; // mutating state without setState
  }
}
```

Good:
```dart
class CounterPage extends StatefulWidget { /* ... */ }

class _CounterPageState extends State<CounterPage> {
  int _count = 0;

  void _increment() {
    setState(() {
      _count++;
    });
  }
}
```

### Line-by-line explanation (Pitfall 1)
- Bad example mutates _count directly, which does not trigger a UI refresh, leading to out-of-sync visuals.
- Good example wraps the mutation in setState, ensuring the framework re-renders the UI to reflect changes.

### Pitfall 2: Rebuilding large subtrees unnecessarily

Bad:
```dart
Widget build(BuildContext context) {
  return Column(
    children: [
      HeavyWidget(), // expensive to build on every frame
      OtherWidget(),
    ],
  );
}
```

Good:
```dart
class ParentWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        HeavyWidget(), // constant subtree; avoids rebuilds if no state changes
        OtherWidget(),
      ],
    );
  }
}
```

### Line-by-line explanation (Pitfall 2)
- Bad approach may rebuild HeavyWidget on every parent rebuild, wasting CPU and battery.
- Using const where possible tells Flutter the widget tree can be reused, reducing work.

### Pitfall 3: Not handling null safety correctly (Dart)

Bad:
```dart
String? name;
print(name.length); // would fail at runtime if name is null
```

Good:
```dart
String? name;
print(name?.length ?? 0); // safe access with fallback
```

### Line-by-line explanation (Pitfall 3)
- Bad code assumes name is non-null, causing a runtime error if name is null.
- Good code uses conditional access (?.) and a null-coalescing operator (??) to provide a safe default.

### Pitfall 4: Mixing asynchronous patterns without proper error handling

Bad:
```dart
Future<void> fetchSomething() async {
  final data = await apiCall(); // assumes API call always succeeds
  print(data);
}
```

Good:
```dart
Future<void> fetchSomething() async {
  try {
    final data = await apiCall();
    print(data);
  } catch (e) {
    print('Fetch failed: $e');
  }
}
```

### Line-by-line explanation (Pitfall 4)
- Bad code ignores failure modes, which can crash UX or miss error recovery.
- Good code uses try/catch to gracefully handle errors and provide fallback UX.

## Y. Why This Matters In Real Systems

- Cross-platform benefits: Maintain a single codebase (Dart/Flutter) for iOS and Android, reducing duplication and accelerating delivery cycles. This matters in real systems where time-to-market and consistent UX across devices are critical.
- Performance considerations: Flutter renders via its own engine, which can provide 60fps UI and smooth animations, but requires mindful widget composition and efficient rebuild strategies to avoid jank.
- Native integration: Platform channels enable accessing device features (battery, sensors, camera) that are not available in the cross-platform layer. This is essential for enterprise apps needing OS-specific capabilities or performance optimizations.
- Team collaboration: Frontend developers focusing on Dart/Flutter can contribute significantly to iOS apps, while Swift experts can handle platform-specific logic when necessary.
- Testing and CI: Flutter’s tooling (flutter test, flutter run, Flutter doctor) supports automated testing across platforms. Real systems rely on CI pipelines to validate changes across iOS + Android configurations.

## Z. Study Questions

1. What is the primary role of Dart in a Flutter app?
2. How does setState affect the Flutter UI, and why is it important for interactive widgets?
3. Explain what a Platform Channel is and when you would use it in a cross-platform app.
4. Describe a scenario where null safety helps prevent runtime errors in Dart.
5. Compare a minimal Flutter app structure to a native Swift iOS app’s entry pattern.

## Exercise

Part A: Build and run a simple Flutter app (no platform-specific code)

- Task 1: Create a Flutter project skeleton (or use the provided main.dart from Section 1) and run it on your emulator or device.
- Task 2: Extend the app to display a list of items using a ListView and a Simple ListTile for each item.
- Task 3: Add a search TextField at the top and filter the list as the user types (case-insensitive).
- Task 4: Add a “Refresh” button that simulates fetching new data with Future.delayed, showing a CircularProgressIndicator while loading, and updating the list once complete.

Part B: Optional extension — iOS native interop

- Task 5 (optional): Implement a platform channel to fetch a device property (e.g., battery level) from the iOS side. Provide Dart code using MethodChannel and the corresponding Swift code in AppDelegate.swift to return a number representing battery percentage.
- Task 6 (optional): Create a tiny SwiftUI or UIKit-based feature that you expose to Flutter via the platform channel, ensuring you handle errors gracefully and provide a fallback UI if the feature is unavailable.

Deliverables for the exercise

- A functional Flutter app (main.dart) that:
  - Renders a list of items.
  - Filters via a search field.
  - Fetches additional data asynchronously with a loading indicator.
- (Optional) Platform-channel code demonstrating a Dart-Swift bridge for a simple native capability, with clear error handling and documentation comments.

Notes for instructors

- Emphasize that Flutter uses Dart, not Swift, for the cross-platform UI code, but Swift may be used for iOS-native features through platform channels.
- Highlight trade-offs: single codebase vs. the need for platform-specific paths or performance considerations.
- Encourage students to run and compare the same UI on iOS and Android emulators to observe performance and rendering differences.

This lesson provides a practical, code-driven introduction to Flutter and Dart, with a realistic nudge toward iOS integration patterns used in production systems.