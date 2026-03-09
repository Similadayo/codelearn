# Introduction to Flutter & Dart

Flutter is Google's UI toolkit for building natively compiled applications for mobile, web, and desktop from a single codebase. Dart is the language that powers Flutter, offering a modern, object-oriented syntax with strong typing, ahead-of-time compilation, and a rich set of libraries. In Phase 2 of Cross-Platform development, mastering Flutter & Dart enables you to ship high-performance, visually expressive apps across iOS and Android faster, with consistent UX and shared business logic. This lesson covers core Flutter concepts, demonstrates concrete code, and gives you practical, production-focused insight into how Flutter apps are built and maintained.

## 1. 1. Flutter & Dart Fundamentals

- What this covers: the core building blocks (widgets, widget tree, hot reload, and the basic app bootstrap in Dart).
- Why it matters professionally: a strong foundation reduces debugging time, improves performance, and enables cross-platform portability with a single codebase.

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Intro',
      home: Scaffold(
        appBar: AppBar(title: Text('Hello Flutter')),
        body: Center(child: Text('Hello from Flutter & Dart!')),
      ),
    );
  }
}
```

### Line-by-line explanation

- Line 1: Import the Flutter material library, which provides a rich set of widgets for Material Design.
- Line 3: Define the main entry point of the Dart program.
- Line 4: Call runApp with MyApp to inflate the widget tree and start the app.
- Line 6-14: MyApp is a stateless widget that builds a MaterialApp.
- Line 8: Create a MaterialApp as the root of the app.
- Line 9: Set the title used by some platforms and accessibility tools.
- Line 10-12: Use a Scaffold to provide a basic visual layout structure with an app bar and body.
- Line 13-14: Center a simple text widget in the app body.

---

## 2. 2. Building a Simple UI with Widgets

- What this covers: how to compose a UI using common widgets like Scaffold, AppBar, Center, Column, Text, SizedBox, and ElevatedButton.
- Why it matters professionally: UI composition is the heart of Flutter apps; clean, readable layouts scale with your app’s complexity.

```dart
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter UI Demo',
      home: Scaffold(
        appBar: AppBar(title: Text('UI Demo')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Welcome to Flutter UI'),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  // Interactive placeholder
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

- Line 1: Import Flutter Material library for UI widgets.
- Line 3: Entry point to run the app.
- Line 4-6: MyApp is a stateless widget that returns a MaterialApp.
- Line 8: Set the app title.
- Line 9-19: The home screen uses Scaffold with an AppBar and a body.
- Line 11-18: Body is a centered Column with a greeting text, a spacer, and a button.
- Line 14: Text widget shows a message.
- Line 15: SizedBox creates vertical space between widgets.
- Line 16-20: ElevatedButton with a labeled child; onPressed is a placeholder for interaction.

---

## 3. 3. State Management Basics with StatefulWidget

- What this covers: introducing state via StatefulWidget and updating UI with setState.
- Why it matters professionally: apps respond to user actions; proper state management is essential for correctness and maintainability.

```dart
import 'package:flutter/material.dart';

void main() => runApp(CounterApp());

class CounterApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(home: CounterScreen());
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
      appBar: AppBar(title: Text('Counter')),
      body: Center(
        child: Text('Count: $_count', style: TextStyle(fontSize: 24)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _increment,
        child: Icon(Icons.add),
      ),
    );
  }
}
```

### Line-by-line explanation

- Line 1-2: Import and define the main app entry.
- Line 4-7: CounterApp is a simple wrapper that builds a MaterialApp with home set to CounterScreen.
- Line 9-11: CounterScreen is a StatefulWidget and creates its state.
- Line 13-16: _CounterScreenState holds the mutable state (_count).
- Line 18-21: _increment uses setState to signal Flutter to rebuild with an updated count.
- Line 23-38: UI scaffold showing an AppBar, the current count in the center, and a FAB to increment.
- Line 31-35: The Text widget displays the current count value.

---

## 4. 4. Basic Navigation and Routes

- What this covers: navigating between screens using Navigator and MaterialPageRoute.
- Why it matters professionally: apps often need multi-screen flows; clean navigation is essential for UX and code maintainability.

```dart
import 'package:flutter/material.dart';

void main() => runApp(NavDemoApp());

class NavDemoApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(title: 'Nav Demo', home: HomeScreen());
  }
}

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Center(
        child: ElevatedButton(
          child: Text('Go to Details'),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => DetailsScreen()),
            );
          },
        ),
      ),
    );
  }
}

class DetailsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Details')),
      body: Center(child: Text('Details Screen')),
    );
  }
}
```

### Line-by-line explanation

- Line 1-2: Import Flutter Material library and define the main app.
- Line 4-8: MyApp sets the home to HomeScreen.
- Line 10-24: HomeScreen builds a Scaffold with a centered button.
- Line 18-23: onPressed uses Navigator.push to navigate to DetailsScreen.
- Line 26-34: DetailsScreen shows a simple page with a back-enabled AppBar.

---

## 5. 5. Responsive Layouts and Basic Theming

- What this covers: using MediaQuery to adapt layout and a basic theme for consistent visuals.
- Why it matters professionally: real devices have varied sizes; responsive design improves UX and reduces maintenance.

```dart
import 'package:flutter/material.dart';

void main() => runApp(ResponsiveApp());

class ResponsiveApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Responsive Demo',
      home: ResponsivePage(),
    );
  }
}

class ResponsivePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isWide = width > 600;
    return Scaffold(
      appBar: AppBar(title: Text('Responsive')),
      body: Center(
        child: isWide
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Expanded(child: Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Panel 1')))),
                  Expanded(child: Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Panel 2')))),
                ],
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Panel 1'))),
                  SizedBox(height: 8),
                  Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Panel 2'))),
                ],
              ),
      ),
    );
  }
}
```

### Line-by-line explanation

- Line 1-2: Import Flutter Material library and define the app entry.
- Line 4-10: MyApp builds a MaterialApp with a home of ResponsivePage.
- Line 12-29: ResponsivePage uses MediaQuery to determine screen width and chooses a row or column layout accordingly.
- Line 16-24: Wide layout shows two panels side by side; each panel is a Card with padding.
- Line 26-28: Narrow layout stacks two panels vertically with spacing.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Mutating state without using setState
  - Bad:
  ```dart
  class CounterWidget extends StatefulWidget {
    @override _CounterWidgetState createState() => _CounterWidgetState();
  }

  class _CounterWidgetState extends State<CounterWidget> {
    int _count = 0;
    void increment() {
      _count++; // Mutating without setState
    }
    @override
    Widget build(BuildContext context) {
      return Column(
        children: [
          Text('Count: $_count'),
          ElevatedButton(onPressed: increment, child: Text('Increment')),
        ],
      );
    }
  }
  ```
  - Good:
  ```dart
  class CounterWidget extends StatefulWidget {
    @override _CounterWidgetState createState() => _CounterWidgetState();
  }

  class _CounterWidgetState extends State<CounterWidget> {
    int _count = 0;
    void increment() {
      setState(() {
        _count++;
      });
    }
    @override
    Widget build(BuildContext context) {
      return Column(
        children: [
          Text('Count: $_count'),
          ElevatedButton(onPressed: increment, child: Text('Increment')),
        ],
      );
    }
  }
  ```

- Pitfall 2: Not disposing resources (e.g., TextEditingController)
  - Bad:
  ```dart
  class MyForm extends StatefulWidget {
    @override _MyFormState createState() => _MyFormState();
  }

  class _MyFormState extends State<MyForm> {
    final _controller = TextEditingController();
    @override
    Widget build(BuildContext context) {
      return TextField(controller: _controller);
    }
  }
  ```
  - Good:
  ```dart
  class MyForm extends StatefulWidget {
    @override _MyFormState createState() => _MyFormState();
  }

  class _MyFormState extends State<MyForm> {
    final _controller = TextEditingController();
    @override
    void dispose() {
      _controller.dispose();
      super.dispose();
    }
    @override
    Widget build(BuildContext context) {
      return TextField(controller: _controller);
    }
  }
  ```

- Pitfall 3: Missing stable keys in dynamic lists
  - Bad:
  ```dart
  ListView(
    children: items.map((item) => ListTile(title: Text(item))).toList(),
  );
  ```
  - Good:
  ```dart
  ListView(
    children: items.map((item) => ListTile(key: ValueKey(item), title: Text(item))).toList(),
  );
  ```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Cross-platform consistency: A single codebase reduces platform drift and feature gaps between iOS and Android.
- Performance considerations: Flutter's widget tree is efficient, but you must avoid unnecessary rebuilds (using const widgets, proper keys, and selective state updates).
- Maintainability: Clear state boundaries and modular widgets help teams scale; cohesive UI patterns improve onboarding and reduce bugs.
- Testing and CI: Flutter’s hot reload speeds iteration; unit and widget tests should cover state changes, navigation flows, and responsive behavior.
- Production readiness: The patterns shown (stateful widgets for dynamic UI, Navigator for flow, and responsive layouts) map to real apps like chat, dashboards, and e-commerce frontends.

---

## Z. Study Questions — 5 recall questions

1. What is the purpose of the setState method in Flutter, and why is it important to call it when updating a widget’s state?
2. How does Flutter decide when to rebuild a portion of the UI, and what role do widgets play in this process?
3. How can you implement simple navigation between two screens in Flutter?
4. Why is using Keys important for dynamic lists, and how do you apply them to list items?
5. What is the benefit of making widgets const where possible, and how does it impact performance?

---

## Exercise — a practical multi-part coding challenge

Goal: Build a small, self-contained Flutter app that lists fruits, supports search, detail navigation, and adding new items at runtime.

Part 1 — Starter app
- Create a Flutter app that displays a list of 5 fruit items with emoji, using a ListView.

Code (complete as a single file) to start from:
```dart
import 'package:flutter/material.dart';

void main() => runApp(FruitApp());

class FruitApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fruits',
      theme: ThemeData(primarySwatch: Colors.green),
      home: FruitList(),
    );
  }
}

class FruitList extends StatefulWidget {
  @override
  _FruitListState createState() => _FruitListState();
}

class _FruitListState extends State<FruitList> {
  final List<String> _items = [
    'Apple 🍎',
    'Banana 🍌',
    'Cherry 🍒',
    'Date 🌰',
    'Grape 🍇',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Fruits')),
      body: ListView.builder(
        itemCount: _items.length,
        itemBuilder: (context, index) {
          final item = _items[index];
          return ListTile(
            title: Text(item),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (ctx) => FruitDetail(item: item)),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        child: Icon(Icons.add),
        onPressed: () {
          // Part 4: Add item dialog will be implemented here in Part 4
        },
      ),
    );
  }
}

class FruitDetail extends StatelessWidget {
  final String item;
  FruitDetail({@required this.item});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Fruit Detail')),
      body: Center(child: Text(item, style: TextStyle(fontSize: 32))),
    );
  }
}
```

Part 2 — Add a search bar to filter items
- Modify the UI to include a TextField at the top that filters _items by substring. Debounce not required for this exercise.

Part 3 — Navigate to a detail screen on tap
- The starter already includes navigation; ensure the Detail screen shows the tapped item.

Part 4 — Add a simple “Add item” flow
- Implement a dialog opened by the FloatingActionButton that asks for a new fruit name (e.g., "Mango 🥭") and appends it to the list. Use setState to refresh the UI.

Part 5 — Accessibility and polish
- Ensure all tappable elements have semantic labels; use const where possible; consider small theming improvements; add a simple test path if you have time.

Tips
- Test on different screen sizes to verify responsive behavior.
- Use const widgets where you know inputs won’t change to improve performance.
- Keep the UI logic contained and consider small helper widgets if the UI grows larger.

This completes a complete, structured, and practical Flutter & Dart lesson with code examples, explanations, pitfalls, real-world context, recall questions, and a hands-on exercise.