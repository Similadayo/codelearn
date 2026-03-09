# Introduction to React Native for Cross-Platform Mobile Apps

React Native enables building mobile apps using JavaScript and React while rendering native UI components. This approach lets you share a large portion of your codebase between iOS and Android, accelerating development, reducing maintenance costs, and delivering a native user experience. In this module (Phase 2 — Cross-Platform), we focus on introductory concepts for React Native with a Swift iOS perspective: how to write core UI in React Native, how to reason about native modules (bridging with Swift for iOS), and how to structure apps for real-world use. By the end, you’ll be able to scaffold a React Native app, compose reusable components, navigate between screens, and expose a native iOS feature to JavaScript.

---

## 1. Getting Started with React Native

This section introduces a minimal React Native app that renders a simple screen. You’ll learn the basic structure of a React Native project and the core building blocks: components, views, and text.

```js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello React Native</Text>
      <Text style={styles.subtitle}>Cross-Platform mobile UI with a single codebase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
});
```

### Line-by-line explanation
- Line 1: Import React to enable JSX and component creation.
- Line 2: Import core React Native primitives: View, Text, and StyleSheet.
- Line 4: Define a functional component named App and export it as the default export.
- Line 5-13: Return a JSX tree with a root View and two Text elements.
- Line 6: The View uses a style reference to lay out children centrally.
- Line 7: First Text shows the main title with bold styling.
- Line 8: Second Text shows a subtitle with lighter color.
- Line 11-15: Create a StyleSheet named styles to centralize styling.
- Line 12: container style makes the view fill the screen and center content.
- Line 13: title style defines font size and boldness.
- Line 14: subtitle style defines a smaller font and muted color.

---

## 2. Components, Props, and State

React Native is built on React concepts like components, props, and state. This section demonstrates a simple counter component that accepts an initial value via props and manages internal state to update the UI.

```js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);

  return (
    <View style={styles.container}>
      <Text style={styles.count}>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(n => n + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  count: { fontSize: 20, marginBottom: 8 },
});
```

### Line-by-line explanation
- Line 1: Import React and the useState hook for local state management.
- Line 2-3: Import UI primitives View, Text, Button, and StyleSheet.
- Line 5: Define a Counter component that accepts an initial prop (default 0).
- Line 6: Initialize local state count with the provided initial value.
- Line 8-14: Render a View containing a Text showing the current count and a Button to increment.
- Line 9: Display the current count value in the UI.
- Line 10: Button triggers a state update using a functional updater to avoid stale closures.
- Line 14-18: Style the container and the counter text.

---

## 3. Navigation Basics

Most apps require moving between screens. This section demonstrates a small two-screen setup using React Navigation (native stack) to keep navigation fluid and consistent with native platform patterns.

```js
import * as React from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
      <Button title="Go to Details" onPress={() => navigation.navigate('Details')} />
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={styles.container}>
      <Text>Details Screen</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

### Line-by-line explanation
- Line 1: Import React and necessary navigation utilities.
- Line 2-4: Import UI primitives for rendering and styling.
- Lines 6-15: HomeScreen component renders a label and a button that navigates to Details.
- Line 9: Button triggers navigation to the Details screen.
- Lines 17-22: DetailsScreen component renders a simple label.
- Lines 24-29: Create a native stack navigator instance.
- Lines 31-46: App component wraps the navigator inside a NavigationContainer and defines two routes: Home and Details.
- Lines 48-52: Global styles for consistent screen layout.

---

## 4. Working with Native Modules (Swift iOS)

To access platform-specific features, React Native can bridge to native code. This section shows a minimal Swift native module that exposes a promise-based API to fetch the iOS device name, and how to consume it from JavaScript.

Swift (iOS) native module (MyNativeModule.swift):
```swift
import Foundation
import React

@objc(MyNativeModule)
class MyNativeModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    return "MyNativeModule"
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func getDeviceName(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(UIDevice.current.name)
  }
}
```

JavaScript usage (React Native):
```js
import { NativeModules } from 'react-native';
const { MyNativeModule } = NativeModules;

async function getDeviceName() {
  try {
    const name = await MyNativeModule.getDeviceName();
    return name;
  } catch (e) {
    console.error(e);
  }
}
```

UI integration example:
```js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  const [deviceName, setDeviceName] = useState('');

  useEffect(() => {
    getDeviceName().then(setDeviceName);
  }, []);

  return (
    <View style={styles.container}>
      <Text>Device name: {deviceName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

### Line-by-line explanation
- Swift module
- Line 1-2: Import foundational frameworks; React bridging utilities are needed for RN bridging.
- Line 4: Mark the class as an Objective-C compatible module named MyNativeModule.
- Line 5: Declare the class as a React Native bridge module.
- Line 6-9: Provide the module name that React Native will use.
- Line 11-13: Indicate that this module requires the main UI queue for thread-safety and to access UIKit.
- Line 15-17: Expose a method getDeviceName that returns a promise; on success, resolve with the device name.
- Line 20-21: JavaScript import path to access the module from React Native.

- JavaScript usage
- Line 1-2: Import NativeModules to access native implementations.
- Line 4-11: Define an async function that calls the native module and handles errors.
- Line 15-22: A simple UI that fetches and displays the device name on mount.

Note: To bridge Swift properly in a real project, ensure your iOS project is set up with a Swift file, a bridging header, and proper package configuration. This example demonstrates the conceptual pattern and the typical code structure you’d implement in a non-Expo React Native CLI project.

---

## X. Common Beginner Mistakes

Below are real pitfalls new React Native developers commonly encounter, with bad vs good code side-by-side to illustrate best practices.

### Pitfall 1 — Mutating state directly
Bad:
```js
const [todos, setTodos] = useState([]);
function addTodoBad(todo) {
  todos.push(todo);
  setTodos(todos);
}
```
Good:
```js
function addTodoGood(todo) {
  setTodos(prev => [...prev, todo]);
}
```

### Line-by-line explanation
- Bad example mutates the array in place, which can bypass React’s state-change detection and cause UI not to re-render reliably.
- Good example creates a new array with the new item, ensuring React detects the change and re-renders.

### Pitfall 2 — Not providing stable keys in lists
Bad:
```js
{items.map(item => <Text>{item.label}</Text>)}
```
Good:
```js
{items.map(item => <Text key={item.id}>{item.label}</Text>)}
```

### Line-by-line explanation
- Bad example omits a key, which can cause reconciliation issues and warnings, and degrade performance in large lists.
- Good example uses a stable, unique key (item.id) to help React efficiently update list items.

### Pitfall 3 — Forgetting to clean up effects/subscriptions
Bad:
```js
useEffect(() => {
  const id = someEventSource.subscribe(() => doWork());
}, []);
```
Good:
```js
useEffect(() => {
  const id = someEventSource.subscribe(() => doWork());
  return () => someEventSource.unsubscribe(id);
}, []);
```

### Line-by-line explanation
- Bad: Creates a subscription but does not unsubscribe on unmount, risking leaks.
- Good: Returns a cleanup function to unsubscribe when the component unmounts.

### Pitfall 4 — Overusing inline styles instead of StyleSheet
Bad:
```js
<View style={{ padding: 10, backgroundColor: '#fff' }} />
```
Good:
```js
const styles = StyleSheet.create({ container: { padding: 10, backgroundColor: '#fff' }});
<View style={styles.container} />
```

### Line-by-line explanation
- Bad: Inline styles can lead to unnecessary re-renders due to object creation on every render.
- Good: StyleSheet optimizes style handling and encourages reuse.

---

## Y. Why This Matters In Real Systems

- Single codebase, multiple platforms: React Native accelerates delivery by sharing business logic and UI structure across iOS and Android, reducing time-to-market and maintenance costs.
- Native feel and performance: React Native renders native UI components, while critical or platform-specific features can be bridged to Swift/Objective-C (iOS) or Kotlin/Java (Android) for optimal performance.
- Tooling and ecosystem: Rich ecosystem of libraries, typing with TypeScript, and integration with modern tooling (ESLint, Prettier, Jest) improves developer velocity and code quality.
- Real-world considerations: Performance budgets, memory management, and smooth navigation are essential; always measure on target devices, use asynchronous patterns, and adopt lazy loading and code-splitting where appropriate.
- Production workflows: Adopting CI/CD pipelines, crash analytics, over-the-air updates (e.g., CodePush or OTA strategies), and robust testing (unit, integration, end-to-end) are critical in real systems.

---

## Z. Study Questions

1) What are the core benefits of using React Native for cross-platform mobile development?  
2) How does the bridging mechanism between React Native and Swift iOS work at a high level?  
3) What is the purpose of a navigation container and a stack navigator in React Native?  
4) Why is it important to avoid mutating state directly in React components?  
5) Name two common production considerations when deploying a React Native app to users.

---

## Exercise

Multi-part practical coding challenge to reinforce concepts from this lesson.

Part A — Scaffold and UI
- Create a new React Native CLI project (not Expo) and implement a two-screen app with a Home and Profile screen.
- Home screen shows a greeting and a button to navigate to Profile.
- Profile screen displays a user object from a hard-coded dataset and allows editing the displayed name via a TextInput (local state only).

Part B — Simple Todo List
- Add a simple Todo list to the Home screen:
  - A TextInput to enter a new todo.
  - A button to add the todo to a list below.
  - Render the list with each item showing a delete button.
- Use a stable key for each item (id field) and ensure the list updates correctly without mutating state directly.

Part C — Swift Native Module (Device Name)
- Implement a minimal Swift native module as shown in Section 4 that exposes a getDeviceName promise.
- From the Home screen, display the device name above the greeting by calling the native module and storing it in state.
- Ensure you handle errors gracefully and show a fallback message if the device name cannot be retrieved.

Part D — Put it Together and Explain
- Explain how the parts fit together: React Native UI, navigation, state management, and Swift bridging.
- Provide a short test plan outlining how you would verify:
  - Navigation paths work across devices.
  - Todo list operations (add/delete) work as expected.
  - Native module bridging returns a string and handles failure scenarios.

Suggested file structure (high level):
- App.js (root navigator and shared UI container)
- src/screens/HomeScreen.js
- src/screens/ProfileScreen.js
- src/components/TodoList.js
- ios/MyNativeModule.swift (Swift bridging as shown)
- index.js / metro.config.js as needed for your project setup

Notes:
- For Part C, this exercise assumes a non-Expo React Native CLI project since Swift bridging requires native project configuration.
- You can progressively implement and test each part to validate the learning outcomes.

This completes a structured, detailed lesson on Introduction to React Native within a cross-platform context, incorporating Swift iOS bridging concepts, practical code examples, explanations, pitfalls, real-world relevance, recall questions, and a multi-part practical exercise.