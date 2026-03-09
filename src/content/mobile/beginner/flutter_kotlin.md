# Introduction to Flutter & Dart for Cross-Platform Mobile Development (Kotlin Android Track)

Flutter and Dart offer a powerful route to build high-performance, beautiful mobile apps that run on both Android and iOS from a single codebase. For developers steeped in Kotlin Android, this module introduces Flutter’s reactive UI model, the Dart language, and practical cross-platform patterns. You’ll learn how Flutter renders UI with widgets, how to manage state, and how to connect Dart code to native Android (Kotlin) via platform channels. By the end, you’ll have a solid foundation to evaluate Flutter as a cross-platform option in real projects.

## 1.  What are Flutter and Dart, and why do they matter to Android developers?

- Flutter is a UI toolkit from Google that enables building natively compiled applications for mobile, web, and desktop from a single codebase. Dart is the language used to write Flutter apps.
- Key benefits for Android developers:
  - Single codebase for both Android and iOS
  - Hot reload speeds iteration and experimentation
  - Consistent 60fps UI with a rich set of Material and Cupertino widgets
  - Strong tooling, testability, and a growing ecosystem
- Conceptual example: Flutter apps are composed of widgets. The UI is described by composition rather than imperative code.

### Line-by-line explanation
```dart
// Dart example: a minimal Flutter app that shows text
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // The root of your widget tree
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Flutter & Dart Intro')),
        body: Center(child: Text('Hello Flutter & Dart')),
      ),
    );
  }
}
```
1. Import the Flutter material library to access UI widgets.
2. Define the entry point main and call runApp with your root widget.
3. Create a stateless widget MyApp that builds the UI.
4. MaterialApp provides app-level styling and navigation scaffolding.
5. Scaffold gives a basic visual layout with app bar and body.
6. AppBar displays a title; body centers a Text widget with the message.

## 2.  Flutter project setup and project structure (for Kotlin Android developers)

- Install Flutter SDK and set up your IDE (Android Studio or VS Code).
- Create a new Flutter project, which generates a standard structure:
  - android/ for Android-specific integration
  - ios/ for iOS
  - lib/ for Dart code
  - test/ for tests
- Example commands (bash):
```bash
# Verify environment
flutter doctor

# Create a new cross-platform project
flutter create cross_platform_intro

# Open the project in your editor
cd cross_platform_intro
```

### Line-by-line explanation
```bash
flutter doctor
```
1. Checks your environment for Flutter, Android SDK, Xcode (macOS), and required tools.
2. Reports any missing dependencies so you can install them.

```bash
flutter create cross_platform_intro
```
3. Generates a new Flutter project named cross_platform_intro with a default structure.
4. Creates sample Dart code in lib/, Android and iOS project skeletons, and CI-friendly configuration.

```bash
cd cross_platform_intro
```
5. Changes the working directory to your new project so you can edit and run it.

## 3.  Dart basics: variables, types, and functions (as you'll write in Flutter)

- Dart is a modern, strongly-typed language used to write Flutter apps.
- Key concepts: typed variables (var, final, const), functions, classes, and simple control flow.
- Example: a small Dart snippet showing typing, a function, and string interpolation.

```dart
// Dart basics: variables, types, and a simple function
void main() {
  const appName = 'FlutterIntro';
  var count = 3;
  int add(int a, int b) => a + b;

  print('App: $appName, count=$count, 2+3=${add(2,3)}');
}
```

### Line-by-line explanation
1. main is the program entry point.
2. const defines an immutable compile-time constant.
3. var declares a mutable local variable; inferred type is int.
4. int add(int a, int b) declares a function that returns an int and takes two int parameters.
5. Function body uses the concise expression syntax to return a + b.
6. print outputs a formatted string using string interpolation.

## 4.  Building UI with Flutter widgets (a small, runnable app)

- Flutter UIs are built from widgets. Everything is a widget: padding, layout, text, and interactivity.
- This section shows a minimal interactive UI: a title, a message, and a button that prints to console.

```dart
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Intro UI',
      home: Scaffold(
        appBar: AppBar(title: Text('Flutter UI')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Hello Flutter & Dart', style: TextStyle(fontSize: 24)),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  print('ElevatedButton pressed');
                },
                child: Text('Press me'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### Line-by-line explanation
1. Import the Material UI library to access widgets like MaterialApp, Scaffold, AppBar, Text, etc.
2. Entry point main calls runApp with the root widget.
3. MyApp is a stateless widget that describes the UI.
4. MaterialApp configures app-wide themes and routing; title sets the window title on some platforms.
5. Scaffold provides the basic app structure with an AppBar and a body.
6. AppBar shows a top bar with a title.
7. Center aligns its child both vertically and horizontally.
8. Column lays out children vertically.
9. mainAxisAlignment.center centers the children in the column.
10. Text displays a line of text with a larger font size.
11. SizedBox adds vertical spacing between widgets.
12. ElevatedButton is a clickable button; onPressed prints a message.
13. The button’s child is a Text widget describing the button.

## 5.  State management basics: making the UI interactive with setState

- For simple interactivity, use StatefulWidget and manage state with setState.
- This example adds a counter to the UI and updates when the button is pressed.

```dart
import 'package:flutter/material.dart';

void main() => runApp(CounterApp());

class CounterApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: CounterScreen(),
    );
  }
}

class CounterScreen extends StatefulWidget {
  @override
  _CounterScreenState createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  int _count = 0;

  void _increment() {
    setState(() {
      _count++;
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
            Text('Count: $_count', style: TextStyle(fontSize: 28)),
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
1. Import Material UI library for widgets.
2. Entry point launching a CounterApp.
3. CounterApp is a stateless wrapper returning a MaterialApp.
4. MaterialApp with a home screen of CounterScreen.
5. CounterScreen is a StatefulWidget that maintains state.
6. createState creates the mutable state object.
7. _CounterScreenState stores the counter and provides UI.
8. _count holds the current counter value.
9. _increment uses setState to mutate state and trigger a rebuild.
10. build constructs the UI: AppBar and a centered column.
11. Text shows the current count.
12. ElevatedButton triggers _increment on press.
13. The UI automatically updates when state changes due to setState.

## 6.  Platform channels: connecting Dart to Kotlin Android

- Cross-platform apps often need to access native features. Platform channels let Dart call into Kotlin/Java and return results.
- This example demonstrates a simple Android-native info fetch: device manufacturer and model.

Dart side (Flutter):

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DeviceInfo {
  static const MethodChannel _channel = MethodChannel('com.example/device');

  static Future<String> getDeviceInfo() async {
    final String info = await _channel.invokeMethod('getDeviceInfo');
    return info;
  }
}
```

Kotlin side (Android, MainActivity.kt):

```kotlin
package com.example.cross_platform_intro

import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
  private val CHANNEL = "com.example/device"

  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)

    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
      if (call.method == "getDeviceInfo") {
        val info = "Manufacturer: ${Build.MANUFACTURER}, Model: ${Build.MODEL}"
        result.success(info)
      } else {
        result.notImplemented()
      }
    }
  }
}
```

### Line-by-line explanation
Dart side
1. Import Flutter material and services libraries (for MethodChannel).
2. Define a class DeviceInfo with a static channel name.
3. Create a MethodChannel tied to the channel name on the Dart side.
4. getDeviceInfo calls into the native side using invokeMethod and awaits a string result.
5. Returns the string containing device information.

Kotlin side
1. Import necessary Android and Flutter embedding classes.
2. Extend FlutterActivity to host a Flutter UI.
3. Define a channel name that matches the Dart side.
4. Override configureFlutterEngine to register platform channel handlers.
5. Create a MethodChannel bound to the engine’s messenger.
6. Handle the "getDeviceInfo" method by reading Build.MANUFACTURER and Build.MODEL and sending back a string.
7. If another method is called, indicate it’s not implemented.

Note: To actually call and display this in the Dart UI, you’d call DeviceInfo.getDeviceInfo() and show the result in the UI (e.g., in a FutureBuilder or setState).

## X. Common Beginner Mistakes

### 1) Heavy work inside build methods
Bad:
```dart
@override
Widget build(BuildContext context) {
  // Do heavy computation every build
  final items = computeItems(); // expensive
  return ListView(children: items.map((i) => Text(i)).toList());
}
```
Good:
```dart
class MyWidget extends StatelessWidget {
  final List<String> items;

  MyWidget({required this.items});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: items.map((i) => Text(i)).toList(),
    );
  }
}
```

### 2) Forgetting to dispose resources (e.g., controllers)
Bad:
```dart
class MyForm extends StatefulWidget { /* ... */ }

class _MyFormState extends State<MyForm> {
  final _controller = TextEditingController();

  // Never dispose
  @override
  void dispose() {
    // Missing: _controller.dispose();
    super.dispose();
  }
}
```
Good:
```dart
class _MyFormState extends State<MyForm> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### 3) Unoptimized rebuilds and missing const usage
Bad:
```dart
@override
Widget build(BuildContext context) {
  return Column(
    children: [
      Text('Hello World'), // new Text instance on every build
      Icon(Icons.star),
    ],
  );
}
```
Good:
```dart
@override
Widget build(BuildContext context) {
  return Column(
    children: [
      const Text('Hello World'), // const widgets help with rebuilds
      const Icon(Icons.star),
    ],
  );
}
```

## Y. Why This Matters In Real Systems

- Cross-platform development accelerates time-to-market by sharing a large codebase across Android and iOS, reducing maintenance burden.
- Performance considerations: Flutter renders with its own engine and widgets, avoiding some Java/Kotlin UI overhead; however, complex animations should be profiled and optimized.
- Platform channels enable leveraging native capabilities when needed (e.g., camera, sensors, platform services) while maintaining most logic in Dart.
- Real systems require robust testing (unit, widget, integration), CI/CD pipelines, and careful architecture decisions (state management, dependency injection, and testability).
- Production considerations:
  - Proper asset and packager management for both platforms
  - Handling platform-specific differences in layout, permissions, and lifecycle
  - Accessibility, localization, and responsive design
  - App size optimization and performance profiling

## Z. Study Questions

1) What is a Flutter widget, and how does the widget tree relate to UI rendering?
2) How does hot reload speed up Flutter development compared to traditional Android permissions-based refresh?
3) What is a platform channel, and when would you use one in Flutter with Kotlin on Android?
4) Explain the difference between StatelessWidget and StatefulWidget, and give a scenario for each.
5) Describe a simple pattern for adding state in a Flutter app without using external packages.

## Exercise

You will build a small cross-platform feature that demonstrates UI basics and Kotlin interop.

Part A — Create a minimal Flutter UI
- Create a new Flutter project named cross_platform_intro if you haven't already.
- Implement a Counter screen with:
  - A title bar
  - Centered text showing the current count
  - A FloatingActionButton that increments the count
- Ensure the UI uses a StatefulWidget to update the count state.

Part B — Add a Dart-to-Kotlin platform call
- Implement a simple platform channel to fetch Android device info (manufacturer and model) when a button is pressed.
- Dart side:
  - Create a class DeviceInfo with a MethodChannel named "com.example/device".
  - Expose a method getDeviceInfo() that calls the native side and returns a string.
- Kotlin side (Android):
  - In MainActivity, register a MethodChannel with the same name.
  - Implement the "getDeviceInfo" method to return "Manufacturer: <value>, Model: <value>" using Build.MANUFACTURER and Build.MODEL.
- Wire the UI to call getDeviceInfo() when pressing a "Get Device Info" button and display the result below the button.

Part C — Thoughts and testing
- Run the app on an Android emulator or device.
- Tap the Increment button to verify state updates.
- Tap Get Device Info to verify platform channel communication returns the expected string.
- If you can, test on a real device to verify manufacturer/model values.

Code snippets to guide you (you’ll integrate into your project):

Dart: Counter + platform call integration (append to your app)
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DeviceInfo {
  static const MethodChannel _channel = MethodChannel('com.example/device');

  static Future<String> getDeviceInfo() async {
    final String info = await _channel.invokeMethod('getDeviceInfo');
    return info;
  }
}

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: CounterWithInfoScreen(),
    );
  }
}

class CounterWithInfoScreen extends StatefulWidget {
  @override
  _CounterWithInfoScreenState createState() => _CounterWithInfoScreenState();
}

class _CounterWithInfoScreenState extends State<CounterWithInfoScreen> {
  int _count = 0;
  String _deviceInfo = 'Unknown device';

  void _increment() {
    setState(() {
      _count++;
    });
  }

  Future<void> _fetchDeviceInfo() async {
    final info = await DeviceInfo.getDeviceInfo();
    setState(() {
      _deviceInfo = info;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Counter + Device Info')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Count: $_count', style: TextStyle(fontSize: 28)),
            SizedBox(height: 16),
            ElevatedButton(onPressed: _increment, child: Text('Increment')),
            SizedBox(height: 24),
            ElevatedButton(onPressed: _fetchDeviceInfo, child: Text('Get Device Info')),
            SizedBox(height: 12),
            Text(_deviceInfo),
          ],
        ),
      ),
    );
  }
}
```

Kotlin: MainActivity.kt (Android side)
```kotlin
package com.example.cross_platform_intro

import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
  private val CHANNEL = "com.example/device"

  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)
    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
      .setMethodCallHandler { call, result ->
        if (call.method == "getDeviceInfo") {
          val info = "Manufacturer: ${Build.MANUFACTURER}, Model: ${Build.MODEL}"
          result.success(info)
        } else {
          result.notImplemented()
        }
      }
  }
}
```

Optional tasks
- Add error handling on the Dart side if the platform call fails.
- Extend the platform channel to fetch more native capabilities (e.g., battery level) and display them in UI.
- Refactor using a more scalable state management approach as the app grows (e.g., provider, Riverpod) while keeping Kotlin interop in mind.

This lesson provides a practical, end-to-end look at Flutter and Dart from an Android/Kotlin perspective, covering UI building, state management, and native interop crucial for real-world cross-platform mobile development.