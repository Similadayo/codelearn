# Fluid 60FPS Mobile Animations in Flutter

Animations that feel fluid at 60 frames per second are a professional cornerstone of polished mobile apps. In Phase 4 of Native Modules, you’ll learn how to craft high-performance Flutter animations that stay silky smooth under real-world constraints, including interaction-driven motion, parallax, and even leveraging native modules for physics or data that feed your animations. Mastery here reduces jank, improves battery life, and yields a professional, platform-native feel across iOS and Android.

## 1. Foundations of 60FPS Flutter Animations

This section covers the core Flutter animation primitives needed to achieve fluid motion at 60fps: a ticker-driven AnimationController, Tweens, and AnimatedBuilder. We'll start with a simple pulsing dot to illustrate baseline frame-perfect updates and avoid unnecessary rebuilds.

```dart
import 'package:flutter/material.dart';

class FluidPulse extends StatefulWidget {
  const FluidPulse({Key? key}) : super(key: key);

  @override
  _FluidPulseState createState() => _FluidPulseState();
}

class _FluidPulseState extends State<FluidPulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);

    _scale = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _scale,
        builder: (context, child) {
          return Transform.scale(
            scale: _scale.value,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.blueAccent,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 4)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
```

### Line-by-line explanation
- Import the material package for UI components.
- Define a StatefulWidget to manage animation state.
- Mixin SingleTickerProviderStateMixin to provide a vsync signal for the controller.
- Create a late AnimationController named _controller.
- Create a late Animation<double> named _scale for the scale transform.
- Initialize _controller with 1-second duration; set it to repeat back and forth.
- Create _scale as a Tween from 0.95 to 1.05, wrapped in a CurvedAnimation for smooth easeInOut.
- Dispose of the controller to free resources when the widget is removed.
- Build with an AnimatedBuilder to rebuild only when the animation value changes.
- Apply a Transform.scale using the current scale value to render a pulsing circle.
- Style the dot with size, color, shape, and a subtle shadow to emphasize motion.

## 2. Techniques for Fluid Motion at 60FPS

Beyond the baseline, you’ll need patterns that keep frames under 16.7ms on average. This section demonstrates a fluid, staggered entry for a list of cards, leveraging Interval-based CurvedAnimations so each item begins its motion slightly after the previous one, preserving a steady 60fps cadence.

```dart
import 'package:flutter/material.dart';

class StaggeredCards extends StatefulWidget {
  const StaggeredCards({Key? key}) : super(key: key);

  @override
  _StaggeredCardsState createState() => _StaggeredCardsState();
}

class _StaggeredCardsState extends State<StaggeredCards> with TickerProviderStateMixin {
  late final AnimationController _controller;
  final int itemCount = 5;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        final double start = index * 0.15;
        final double end = start + 0.6;
        final Animation<double> animation = CurvedAnimation(
          parent: _controller,
          curve: Interval(start, end, curve: Curves.easeOut),
        );

        return AnimatedBuilder(
          animation: animation,
          builder: (context, child) {
            final double offset = (1.0 - animation.value) * 40.0;
            final double opacity = animation.value;
            return Opacity(
              opacity: opacity,
              child: Transform.translate(
                offset: Offset(0, offset),
                child: Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ListTile(
                    title: Text('Item ${index + 1}'),
                    subtitle: Text('A fluid, staggered entry animation.'),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
```

### Line-by-line explanation
- Import material design components.
- Create a stateful widget to manage a single shared AnimationController.
- Use TickerProviderStateMixin to provide vsync for the controller.
- Define an itemCount to determine how many cards render.
- Initialize the controller with 800ms duration and start it forward.
- Dispose of the controller in the dispose method.
- Build a ListView.builder for dynamic items.
- For each item, define a start and end interval to stagger animations.
- Create a CurvedAnimation with an Interval to produce a staggered effect.
- Use AnimatedBuilder to rebuild the card as its animation progresses.
- Compute vertical offset and opacity from the animation value.
- Wrap the card in Opacity and Transform to achieve a smooth slide-in and fade-in.

## 3. Integrating Native Modules for Animation Data

Flutter’s Platform Channels let you pull native data or physics away from Dart when needed (e.g., using optimized native physics or sensor data). This section shows a simple bridge pattern: Dart calls into native code to fetch a scalar factor that influences an animation’s scale.

### Dart: Platform channel usage
```dart
import 'package:flutter/services.dart';

class NativeAnimationBridge {
  static const MethodChannel _channel = MethodChannel('com.example.animation/native');

  Future<double> getAnimationFactor() async {
    final double factor = await _channel.invokeMethod<double>('getAnimationFactor') ?? 1.0;
    return factor;
  }
}
```

### Line-by-line explanation
- Import Flutter services for method channels.
- Define a bridge class to encapsulate the platform channel logic.
- Declare a static MethodChannel with a unique name, matching the native side.
- Implement getAnimationFactor to call the native method and return a double, with a 1.0 fallback.

### Android (Kotlin): native method handler
```kotlin
package com.example.animation

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
  private val CHANNEL = "com.example.animation/native"

  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)
    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
      if (call.method == "getAnimationFactor") {
        val factor = 1.0 // Could compute from native physics or sensors
        result.success(factor)
      } else {
        result.notImplemented()
      }
    }
  }
}
```

### Line-by-line explanation
- Import Flutter engine and method channel APIs.
- Define a FlutterActivity subclass and a channel name that matches the Dart side.
- Override configureFlutterEngine to register a MethodChannel.
- In the handler, respond to "getAnimationFactor" by returning a double factor; other methods return notImplemented.

### iOS (Swift): native method handler
```swift
import UIKit
import Flutter

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  private let CHANNEL = "com.example.animation/native"

  override func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    GeneratedPluginRegistrant.register(with: self)

    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(name: CHANNEL, binaryMessenger: controller.binaryMessenger)
      channel.setMethodCallHandler { call, result in
        if call.method == "getAnimationFactor" {
          let factor = 1.0
          result(factor)
        } else {
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

### Line-by-line explanation
- Import UIKit and Flutter.
- Define the AppDelegate with a constant channel name.
- In didFinishLaunchingWithOptions, register plugins and set up a FlutterMethodChannel.
- Handle getAnimationFactor by returning a double factor; otherwise, signal not implemented.

## 4. Practical Flutter + Native Data Fluid Carousel (60FPS)

This section demonstrates a practical widget that uses a PageView with smooth, 60fps transitions and reads a native animation factor to influence its visuals, combining managed Dart animations with native data.

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NativeCarousel extends StatefulWidget {
  const NativeCarousel({Key? key}) : super(key: key);

  @override
  _NativeCarouselState createState() => _NativeCarouselState();
}

class _NativeCarouselState extends State<NativeCarousel> with SingleTickerProviderStateMixin {
  late final PageController _controller;
  late final AnimationController _animCtrl;
  final _channel = MethodChannel('com.example.animation/native');
  double _factor = 1.0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.85);
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 0));
    _loadNativeFactor();
  }

  Future<void> _loadNativeFactor() async {
    try {
      final factor = await _channel.invokeMethod<double>('getAnimationFactor') ?? 1.0;
      setState(() { _factor = factor; });
    } catch (e) {
      // Fallback if native call fails
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _animCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PageView.builder(
      controller: _controller,
      itemCount: 6,
      itemBuilder: (context, index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            double value = 0.0;
            if (_controller.position.haveDimensions) {
              value = (index - _controller.page!).abs();
              value = (value > 1.0) ? 1.0 : value;
            }
            final scale = 0.9 + (1.0 - value) * 0.15;
            return Center(
              child: Transform.scale(
                scale: scale * _factor,
                child: Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: SizedBox(
                    height: 260,
                    width: 260,
                    child: Center(child: Text('Card ${index + 1}')),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
```

### Line-by-line explanation
- Import Flutter material widgets and services for platform channels.
- Define a stateful widget for a carousel that leverages a PageController with a 0.85 viewport.
- Create an AnimationController purely to satisfy the interface; its duration is effectively zero here since the pages drive the animation.
- Instantiate a MethodChannel with a finite channel name that matches the native side.
- Load a native animation factor asynchronously; store it in _factor.
- In dispose, clean up both controllers.
- Build a PageView.builder with six pages.
- Use AnimatedBuilder to recompute layout as the page scrolls.
- Compute a per-item value based on distance from the current page; clamp to 1.0.
- Compute a scale factor using a base 0.9 and a delta, then multiply by the native factor.
- Render a styled Card that visually responds to the computed scale, creating a fluid, 60fps feel.

## X. Common Beginner Mistakes

- Bad vs Good: Disposing AnimationController
  - Bad
  ```dart
  class BadWidget extends StatefulWidget {
    @override
    _BadWidgetState createState() => _BadWidgetState();
  }

  class _BadWidgetState extends State<BadWidget> with SingleTickerProviderStateMixin {
    late final AnimationController _controller = AnimationController(
      vsync: this,
      duration: Duration(seconds: 1),
    );
    // Missing dispose
  }
  ```
  - Good
  ```dart
  class GoodWidget extends StatefulWidget {
    @override
    _GoodWidgetState createState() => _GoodWidgetState();
  }

  class _GoodWidgetState extends State<GoodWidget> with SingleTickerProviderStateMixin {
    late final AnimationController _controller;

    @override
    void initState() {
      super.initState();
      _controller = AnimationController(vsync: this, duration: Duration(seconds: 1))
        ..repeat();
    }

    @override
    void dispose() {
      _controller.dispose();
      super.dispose();
    }
  }
  ```

- Bad vs Good: Rebuilding large trees with setState
  - Bad
  ```dart
  class BadSetState extends StatefulWidget {
    @override
    _BadSetStateState createState() => _BadSetStateState();
  }

  class _BadSetStateState extends State<BadSetState> {
    int _value = 0;
    void _increment() {
      _value++;
      setState(() {}); // Rebuilds entire subtree
    }
    @override
    Widget build(BuildContext context) => Text('Value: $_value');
  }
  ```
  - Good
  ```dart
  class GoodValueNotifier extends StatefulWidget {
    @override
    _GoodValueNotifierState createState() => _GoodValueNotifierState();
  }

  class _GoodValueNotifierState extends State<GoodValueNotifier> {
    final ValueNotifier<int> _value = ValueNotifier<int>(0);

    void _increment() => _value.value++;

    @override
    Widget build(BuildContext context) {
      return ValueListenableBuilder<int>(
        valueListenable: _value,
        builder: (context, value, child) => Text('Value: $value'),
      );
    }
  }
  ```

- Bad vs Good: Not using RepaintBoundary for expensive animation
  - Bad
  ```dart
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => HeavyWidget(), // Repaints every frame
    );
  }
  ```
  - Good
  ```dart
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => HeavyWidget(), // Isolated repaint region
      ),
    );
  }
  ```

- Bad vs Good: Violating vsync expectations
  - Bad
  ```dart
  class BadTicker extends StatefulWidget {
    @override
    _BadTickerState createState() => _BadTickerState();
  }

  class _BadTickerState extends State<BadTicker> {
    late final AnimationController _controller; // No vsync
    _controller = AnimationController(duration: Duration(seconds: 1)); // Missing vsync
  }
  ```
  - Good
  ```dart
  class GoodTicker extends StatefulWidget {
    @override
    _GoodTickerState createState() => _GoodTickerState();
  }

  class _GoodTickerState extends State<GoodTicker> with SingleTickerProviderStateMixin {
    late final AnimationController _controller;

    void initState() {
      super.initState();
      _controller = AnimationController(vsync: this, duration: Duration(seconds: 1));
    }
  }
  ```

## Y. Why This Matters In Real Systems

- Consistent 60fps is crucial for perceived performance; jank leads to user frustration and drop-offs.
- Flutter’s rendering pipeline updates frames in sync with the screen refresh; misusing setState or heavy builds between frames causes frame drops.
- Va/fy: Use vsync to align with the device’s refresh cycle, and keep animations lightweight by avoiding expensive rebuilds in hot paths.
- Performance profiling: Use Flutter DevTools to inspect frame timings, GPU thread usage, and repaint regions to identify bottlenecks.
- Native integration can be valuable for physics engines, sensors, or data feeds that must be updated at high rates without overloading the Dart VM. When using Platform Channels, remember to minimize round-trips and amortize heavy work on the native side.

## Z. Study Questions

1. What is the purpose of the vsync parameter in an AnimationController?
2. How does an Interval affect a CurvedAnimation, and how can it be used to create staggered appearances?
3. Why would you wrap an animated subtree with RepaintBoundary?
4. How can Platform Channels be used to influence a Flutter animation, and what are potential pitfalls?
5. What are common indicators of a 60fps animation that is not performing well, and how can you measure them?

## Exercise

Part A — Baseline: Create a 60fps Pulsing Circle
- Implement a standalone Flutter app that shows a single pulsing circle at 60fps (similar to the FluidPulse example in Section 1).
- Ensure you dispose of the AnimationController properly.

Part B — Staggered Card List
- Build a screen with a vertical list of 5 cards that animate in with a staggered effect using Intervals (as in the StaggeredCards example).
- Each card should fade in and slide slightly from the bottom.

Part C — Native Data-Driven Animation
- Add a Platform Channel to your app (mock or real native side) that returns a double factor representing a “feel” of the animation (e.g., 0.8–1.2).
- Use this factor to scale your pulsing or card animation, updating when the native value is retrieved.

Part D — Performance Considerations
- Profile your animation to confirm it stays around or below 16.7ms per frame on representative devices.
- Add a RepaintBoundary around the animated region; explain why this helps in your code comments.
- If your app uses heavy widgets in the animated area, refactor to minimize the number of widgets rebuilt per frame.

Deliverables:
- A self-contained Flutter project (or clearly separated Dart files) that compiles and runs a 60fps animation with at least one native-augmented animation.
- Inline comments describing performance decisions and why they support 60fps fluidity.
- A short paragraph summarizing your profiling findings and any trade-offs you encountered during implementation.