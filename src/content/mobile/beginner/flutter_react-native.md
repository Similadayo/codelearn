# Track: Mobile App Development — Phase 2: Cross-Platform — Introduction to Flutter & Dart (React Native Context)

Flutter and Dart offer a cohesive, high-performance path for building cross-platform mobile apps from a single codebase. In this module, we introduce the fundamentals of Flutter and Dart, while also contrasting them with React Native to highlight different mental models, tooling, and trade-offs you’ll encounter in real systems. You’ll learn how Flutter’s widget-centric UI and Dart’s typed, null-safe language shape development, debugging, and performance. You’ll also see how React Native concepts map to Flutter concepts to help you reason across cross-platform stacks.

## 1. Flutter & Dart: The Foundations

Flutter is a UI toolkit that uses Dart to compile to native code for iOS and Android from a single codebase. Dart provides a strongly-typed language with modern features like null safety, async/await, and effective tooling. In cross-platform teams, understanding both Flutter/Dart and the adjacent React Native ecosystem helps you compare trade-offs in performance, developer experience, and architecture.

Below is a minimal Flutter app entry point to illustrate how Flutter apps start and render.

```dart
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      home: Scaffold(
        appBar: AppBar(title: Text('Hello Flutter')),
        body: Center(child: Text('Hello, Flutter!')),
      ),
    );
  }
}
```

### Line-by-line explanation
- import 'package:flutter/material.dart';
  - Imports Flutter’s material design widgets and utilities.
- void main() => runApp(MyApp());
  - Entry point of the app; runApp attaches the given widget tree to the screen.
- class MyApp extends StatelessWidget { ... }
  - Defines a stateless widget that represents the app root.
- Widget build(BuildContext context) { ... }
  - Builds the UI for this widget.
- return MaterialApp(...);
  - Creates a Material Design app shell with routing and theming.
- home: Scaffold(...);
  - Provides a high-level page layout with appBar and body.
- appBar: AppBar(title: Text('Hello Flutter'));
  - Renders a top bar with a title.
- body: Center(child: Text('Hello, Flutter!'));
  - Centers the text in the available space.

## 2. Dart Language Essentials: Types, Null Safety, Functions, and Classes

Dart is the language behind Flutter. It features strong typing, null safety, and concise syntax for functions and data structures. Understanding these basics helps you write robust Flutter apps and reason about performance and tooling.

```dart
// Primitive types and variables
int age = 25;
double height = 1.78;
String name = 'Alex';
bool isActive = true;

// Null safety
String? middleName;
middleName = null; // allowed

// Functions
int add(int x, int y) => x + y;

// Classes
class User {
  final String id;
  final String name;
  User({required this.id, required this.name});
}
```

### Line-by-line explanation
- int age = 25; double height = 1.78; String name = 'Alex'; bool isActive = true;
  - Declares strongly-typed variables demonstrating Dart’s primitive types.
- String? middleName;
  - Declares a nullable string; the ? marks it as able to hold null.
- middleName = null;
  - Assigns null to the nullable variable.
- int add(int x, int y) => x + y;
  - A concise function that returns the sum of two integers (expression-bodied function).
- class User { ... }
  - Defines a simple immutable data class with named parameters and required fields.
- User({required this.id, required this.name});
  - Constructor with named, required parameters, enforced at compile time.

## 3. Building UI: Widgets, Components, and Cross-Framework Comparisons

Flutter builds UI with a tree of widgets. StatelessWidget represents immutable UI, while StatefulWidget holds mutable state. React Native uses components and a component lifecycle to render UI, but the mental model shifts around the bridge to native code.

Flutter: StatelessWidget example
```dart
import 'package:flutter/material.dart';

class WelcomeCard extends StatelessWidget {
  final String title;
  const WelcomeCard({Key? key, required this.title}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(12.0),
      child: Padding(
        padding: EdgeInsets.all(16.0),
        child: Text(title, style: TextStyle(fontSize: 18)),
      ),
    );
  }
}
```

React Native (comparison) example
```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WelcomeCard = ({ title }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

export default WelcomeCard;

const styles = StyleSheet.create({
  card: { margin: 12, padding: 16, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
  title: { fontSize: 18 },
});
```

### Line-by-line explanation
- Flutter version:
  - import 'package:flutter/material.dart';
    - Imports UI primitives for Material Design.
  - class WelcomeCard extends StatelessWidget { ... }
    - Stateless widget representing an immutable UI fragment.
  - final String title;
    - A property bound at construction.
  - const WelcomeCard({Key? key, required this.title}) : super(key: key);
    - Constructor with a required parameter and optional key.
  - Widget build(BuildContext context) { ... }
    - Builds the UI for this widget.
  - return Card(...);
    - Renders a Material Card with margin.
  - child: Padding(... Text(title, ...));
    - Adds padding around the text and styles it.
- React Native comparison:
  - const WelcomeCard = ({ title }) => ( ... );
    - Functional component that renders UI from props.
  - <View> and <Text> with a StyleSheet for styling.
  - Stylesheet provides layout, spacing, and typography.
  - The pairing shows how a stateless piece of UI is composed differently in each ecosystem.

## 4. State and Interaction: setState (Flutter) vs useState (React Native)

State drives interactivity. Flutter uses setState within a StatefulWidget to trigger a rebuild; React Native commonly uses useState (or other state libraries) to manage UI state.

Flutter stateful counter
```dart
class Counter extends StatefulWidget {
  @override
  _CounterState createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  void _increment() {
    setState(() {
      _count++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text('Count: $_count'),
        ElevatedButton(onPressed: _increment, child: Text('Increment')),
      ],
    );
  }
}
```

React Native (useState) counter
```jsx
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
};

export default Counter;
```

### Line-by-line explanation
- Flutter
  - class Counter extends StatefulWidget { ... } and _CounterState
    - Creates mutable state that persists across rebuilds.
  - int _count = 0;
    - Internal counter state.
  - void _increment() { setState(() { _count++; }); }
    - Triggers a rebuild after mutating state.
  - build(...) returns a layout with Text and ElevatedButton
    - UI reflects current state and re-renders on changes.
- React Native
  - const [count, setCount] = useState(0);
    - Declares a piece of state with an initial value.
  - onPress={() => setCount(count + 1)}
    - Updates state; React re-renders the UI accordingly.

## 5. Tooling, Lifecycle, and Real-World App Structure

Real-world apps rely on fast iteration, debugging, and clean project organization. Flutter’s hot reload speeds UI iteration; React Native has fast refresh and a different bridge strategy to native code. Cross-platform projects also require platform-specific adjustments and performance profiling.

Flutter platform-specific tweaks (example)
```dart
import 'dart:io' show Platform;
import 'package:flutter/material.dart';

class PlatformBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text(Platform.isAndroid ? 'Android' : 'iOS');
  }
}
```

React Native platform check (example)
```jsx
import { Platform, Text } from 'react-native';

const PlatformBadge = () => (
  <Text>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
);

export default PlatformBadge;
```

### Line-by-line explanation
- Flutter PlatformBadge
  - import dart:io show Platform;
    - Access to platform checks at runtime.
  - Platform.isAndroid ? 'Android' : 'iOS'
    - Simple conditional UI to reflect the platform.
- React Native Platform
  - import { Platform } from 'react-native';
  - Platform.OS
    - Returns 'ios' or 'android' to branch UI logic.
- These snippets illustrate how you can gracefully handle platform-specific UI differences in each ecosystem.

## 6. X. Common Beginner Mistakes

### 1) Mutating state directly vs using state setters
Bad (Flutter)
```dart
class Counter extends StatefulWidget {
  @override _CounterState createState() => _CounterState();
}
class _CounterState extends State<Counter> {
  int count = 0;
  void increment() {
    count += 1; // direct mutation, no UI update
  }
  @override
  Widget build(BuildContext context) {
    return Text('Count: $count');
  }
}
```
Good (Flutter)
```dart
class Counter extends StatefulWidget {
  @override _CounterState createState() => _CounterState();
}
class _CounterState extends State<Counter> {
  int count = 0;
  void increment() {
    setState(() {
      count += 1;
    });
  }
  @override
  Widget build(BuildContext context) {
    return Text('Count: $count');
  }
}
```

Bad (React Native)
```jsx
const Counter = () => {
  let count = 0;
  const increment = () => {
    count += 1; // mutating local variable without re-render
  };
  return (
    <Text>Count: {count}</Text>
  );
};
```
Good (React Native)
```jsx
const Counter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount(count + 1);
  return (
    <Text>Count: {count}</Text>
  );
};
```

### 2) Blocking UI with synchronous work in render/build
Bad (Flutter)
```dart
@override
Widget build(BuildContext context) {
  final heavy = computeHeavyWork(); // all in build
  return Text('Result: $heavy');
}
```
Good (Flutter)
```dart
late final int heavy;
@override
void initState() {
  super.initState();
  heavy = computeHeavyWork(); // compute once
}
@override
Widget build(BuildContext context) {
  return Text('Result: $heavy');
}
```

### 3) Not handling asynchronous data or errors
Bad (React Native)
```jsx
useEffect(() => {
  fetchData().then(data => setData(data)); // no error handling
}, []);
```
Good (React Native)
```jsx
useEffect(() => {
  let mounted = true;
  fetchData()
    .then(data => mounted && setData(data))
    .catch(() => mounted && setError(true));
  return () => { mounted = false; };
}, []);
```

### 4) Monolithic UI with no composition
Bad (Flutter)
```dart
Widget build(BuildContext context) {
  return Column(
    children: [
      // 200 lines of nested widgets building the same UI
    ],
  );
}
```
Good (Flutter)
```dart
class CounterRow extends StatelessWidget {
  final int count;
  CounterRow(this.count);
  @override
  Widget build(BuildContext context) {
    return Text('Count: $count');
  }
}
// Then assemble in a higher-level widget
```

## Y. Why This Matters In Real Systems

- Cross-platform efficiency: Flutter offers a single codebase with consistent behavior across iOS and Android, reducing duplication and coordination costs; React Native offers a different approach via a JavaScript bridge—fast for certain teams, but with trade-offs in native module integration and startup times.
- Performance and UX: Flutter renders via its own engine and widgets, yielding smooth 60fps UIs; React Native relies on native components plus a JS bridge, which can introduce performance considerations for complex animations.
- Tooling and CI/CD: Both have mature tooling, but Dart tooling (analyze, format, test) integrates tightly with Flutter; React Native relies on JS tooling (ESLint, Metro, TypeScript) and may require more boilerplate for native modules.
- Platform-specific considerations: Both ecosystems support platform-specific code paths (e.g., Android/iOS overrides, platform channels in Flutter, Native Modules in React Native). Understanding when to isolate platform logic helps performance and maintainability.
- Real-world maintenance: A well-structured widget/component hierarchy, clear state management, and robust error handling are crucial for maintainability in production apps across both stacks.

## Z. Study Questions

1) What language and paradigm underlie Flutter, and how does null safety improve code quality?  
2) How do StatelessWidget and StatefulWidget differ in Flutter, and when would you choose one over the other?  
3) Compare setState in Flutter to useState in React Native. How do they influence rebuilds and performance?  
4) Name two ways to handle platform-specific UI in Flutter and in React Native.  
5) Why is a modular widget/component approach important for real-world cross-platform apps?

## Exercise

Part A — Flutter: Create a dynamic “Greeting List” app
- Requirements:
  - Display a list of greetings in a scrollable ListView.
  - Provide a text field to input a new greeting and a button to add it to the list.
  - Use a StatefulWidget to manage the list state.
  - Start with at least 3 initial greetings.

Code (Flutter)
```dart
import 'package:flutter/material.dart';

void main() => runApp(GreetingApp());

class GreetingApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Greeting List (Flutter)',
      home: GreetingHome(),
    );
  }
}

class GreetingHome extends StatefulWidget {
  @override
  _GreetingHomeState createState() => _GreetingHomeState();
}

class _GreetingHomeState extends State<GreetingHome> {
  final List<String> _greetings = ['Hello', 'Hi there', 'Greetings'];
  final TextEditingController _controller = TextEditingController();

  void _addGreeting() {
    final text = _controller.text.trim();
    if (text.isNotEmpty) {
      setState(() {
        _greetings.add(text);
      });
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Greeting List')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(labelText: 'New greeting'),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.add),
                  onPressed: _addGreeting,
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _greetings.length,
              itemBuilder: (context, index) => ListTile(
                title: Text(_greetings[index]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

Part A — Line-by-line explanation
- The app defines a StatefulWidget that holds a list of greetings and a text field controller.
- The _addGreeting method validates input, updates state with setState, and clears the input.
- The UI includes a TextField for input, a Button (as an IconButton) to trigger addition, and a ListView to render the list.

Part B — React Native: Implement the same Greeting List
- Requirements:
  - A cross-platform React Native app with a text input, an Add button, and a scrollable list of greetings.
  - Use useState to manage the list.
  - Start with 3 initial greetings.

Code (React Native)
```jsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import ReactNative from 'react-native';

const App = () => {
  const [greetings, setGreetings] = useState(['Hello', 'Hi there', 'Greetings']);
  const [text, setText] = useState('');

  const addGreeting = () => {
    const trimmed = text.trim();
    if (trimmed) {
      setGreetings((g) => [...g, trimmed]);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="New greeting"
          value={text}
          onChangeText={setText}
        />
        <Button title="Add" onPress={addGreeting} />
      </View>
      <FlatList
        data={greetings}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderColor: '#ccc', borderWidth: 1, padding: 8, marginRight: 8, borderRadius: 4 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
```

Part B — Line-by-line explanation
- useState initializes the greetings list with three items and maintains the current input text.
- addGreeting trims the input, appends it to the list, and resets the input field.
- The UI lays out a text input and an Add button on top, with a FlatList rendering the greetings below.
- React Native styling uses a small subset of flexbox for layout.

Notes
- This exercise demonstrates a practical, parallel approach to building the same feature in Flutter (D/Dart) and React Native (JS/TS). You should be able to map concepts such as state, events, and list rendering across both stacks, which is crucial when working in cross-platform teams.