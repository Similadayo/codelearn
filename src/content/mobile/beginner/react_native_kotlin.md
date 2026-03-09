# Track: Mobile App Development — Phase 2: Cross-Platform — Introduction to React Native

React Native is a popular framework for building cross-platform mobile apps using JavaScript and native components. This lesson introduces the fundamentals of React Native from a Kotlin-Android perspective, showing how to bridge JavaScript with native Android code, why native modules matter in real systems, and how to structure projects for maintainable cross-platform teams.

## 1. React Native Fundamentals

React Native lets you write UI in JavaScript while rendering using native platform components. The bridge enables communication between the JavaScript runtime and platform-specific code (Java/Kotlin on Android, Objective-C/Swift on iOS). For Android teams, this means you can implement performance-critical tasks or access platform APIs with Kotlin, while still sharing most UI and business logic in JavaScript.

Code example: a minimal React Native component that calls a native module to get a greeting.

```javascript
import React from 'react';
import { View, Text, Button, StyleSheet, NativeModules } from 'react-native';

const { GreetingModule } = NativeModules;

export default function App() {
  const [message, setMessage] = React.useState('Welcome to React Native');

  const greet = async () => {
    try {
      const resp = await GreetingModule.getGreeting('Developer');
      setMessage(resp);
    } catch (e) {
      setMessage('Error: ' + e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{message}</Text>
      <Button title="Greet" onPress={greet} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, marginBottom: 20 },
});
```

### Line-by-line explanation
- import React and core React Native components: sets up React scope and UI primitives.
- const { GreetingModule } = NativeModules; imports the native module that will be implemented in Kotlin.
- App component uses React state to hold a message displayed on screen.
- greet function calls the native module getGreeting with a name; the result is awaited and shown.
- The UI renders a message and a button to trigger the native call.
- Styles define basic layout for centering content.

## 2. Setting Up a React Native Project for Android (Kotlin Interop)

This section covers the workflow and key code changes needed to enable Kotlin-based native modules and integrate them into a React Native project on Android.

Code: project setup commands and essential Kotlin bridge scaffolding.

```bash
# 2.1 Create a new React Native project
npx react-native init RNKotlinBridgeDemo

# 2.2 Enable Kotlin in Android build (example snippets)
# In android/build.gradle
buildscript {
  ext.kotlin_version = '1.10.0'
  dependencies {
    classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
  }
}

# In android/app/build.gradle
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'

dependencies {
  implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
}
```

```kotlin
// 2.3 Kotlin native module: GreetingModule.kt
package com.rnkotlinbridge

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class GreetingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "GreetingModule"

  @ReactMethod
  fun getGreeting(name: String, promise: Promise) {
    promise.resolve("Hello, $name! from Kotlin")
  }
}
```

```kotlin
// 2.4 Kotlin package provider: MyReactPackage.kt
package com.rnkotlinbridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Collections.emptyList

class MyReactPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(GreetingModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
```

```kotlin
// 2.5 Integrating the package in MainApplication.kt
package com.rnkotlinbridge

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import java.util.Arrays

class MainApplication : Application(), ReactApplication {
  private val mReactNativeHost = object : ReactNativeHost(this) {
    override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

    override fun getPackages(): List<ReactPackage> {
      val packages = PackageList(this).packages.toMutableList()
      // Add the Kotlin bridge package
      packages.add(MyReactPackage())
      return packages
    }

    override fun getJSMainModuleName(): String = "index"
  }

  override fun getReactNativeHost(): ReactNativeHost = mReactNativeHost
}
```

### Line-by-line explanation
- GreetingModule.kt defines a native module named GreetingModule accessible from JS as GreetingModule.
- getGreeting(name, promise) uses a Promise to return data back to JS; this is the recommended asynchronous pattern for RN native modules.
- MyReactPackage.kt registers the GreetingModule with the React Native bridge so JS can import it via NativeModules.
- MainApplication.kt extends the React Native host and adds MyReactPackage to the list of packages so the bridge loads the Kotlin module at runtime.
- The Kotlin code demonstrates essential patterns: Kotlin class extending ReactContextBaseJavaModule, implementing getName, and using @ReactMethod with Promise.

```javascript
// 2.6 Simple usage wrapper in JS (optional clarity)
import { NativeModules } from 'react-native';
const { GreetingModule } = NativeModules;

export default GreetingModule;
```

### Line-by-line explanation
- Import NativeModules from react-native to access the bridge.
- Destructure GreetingModule from NativeModules to obtain a JS reference to the Kotlin module.
- Export GreetingModule for convenient import in other JS files (optional wrapper).

## 3. Consuming Native Modules in React Native (JS)

This section shows how to call the Kotlin-implemented module from JavaScript, including handling the promise-based result.

Code: App component using the Kotlin-based native module to fetch a greeting.

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, NativeModules, StyleSheet } from 'react-native';

const { GreetingModule } = NativeModules;

export default function App() {
  const [greet, setGreet] = useState('Press Greet to call native module');

  const doGreet = async () => {
    try {
      const message = await GreetingModule.getGreeting('React Native');
      setGreet(message);
    } catch (err) {
      setGreet('Error: ' + (err?.message ?? err));
    }
  };

  useEffect(() => {
    // Optional: warm-up or pre-fetch data
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{greet}</Text>
      <Button title="Greet" onPress={doGreet} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 16, marginBottom: 12 },
});
```

### Line-by-line explanation
- GreetingModule is pulled from NativeModules, linking the JavaScript side to Kotlin.
- doGreet calls getGreeting with a name; because the Kotlin method uses a Promise, the JS side receives a Promise and uses await.
- Error handling updates the UI with useful messages.
- The UI renders a message and a button that triggers the native call.

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Returning a value directly from a native module method annotated with @ReactMethod (without Promise or Callback)
  - Bad:
    ```kotlin
    @ReactMethod
    fun getGreeting(name: String): String {
      return "Hello, $name"
    }
    ```
    - Why this is wrong: ReactMethod cannot return values directly to JS; it must use Promise or Callback.
  - Good:
    ```kotlin
    @ReactMethod
    fun getGreeting(name: String, promise: Promise) {
      promise.resolve("Hello, $name")
    }
    ```
    - Correct usage: Uses Promise to asynchronously pass data back to JS.

- Pitfall 2: Forgetting to register the native module in the package or not adding the package to MainApplication
  - Bad:
    ```kotlin
    // GreetingModule is defined but never registered
    // MainApplication.kt omits MyReactPackage()
    ```
  - Good:
    ```kotlin
    // In MyReactPackage.kt
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
      return listOf(GreetingModule(reactContext))
    }

    // In MainApplication.kt
    packages.add(MyReactPackage())
    ```
    - Correct wiring ensures the bridge can instantiate and expose the module.

- Pitfall 3: Not passing the correct module name on the JS side
  - Bad (assuming the module name is GreetingModule, but JS uses a different key):
    ```javascript
    const { Greeting } = NativeModules; // Wrong key
    ```
  - Good:
    ```javascript
    const { GreetingModule } = NativeModules; // Correct by name
    ```
    - Important to align the getName() return value in Kotlin with how you reference it in JS.

- Pitfall 4: Performing heavy work on the main thread inside the native module
  - Bad:
    ```kotlin
    @ReactMethod
    fun longRunningOperation(promise: Promise) {
      Thread.sleep(5000) // blocks main thread
      promise.resolve("Done")
    }
    ```
  - Good:
    ```kotlin
    @ReactMethod
    fun longRunningOperation(promise: Promise) {
      Thread {
        // Do heavy work here in a background thread
        val result = SomeHeavyWork()
        promise.resolve(result)
      }.start()
    }
    ```
    - Keeps the UI responsive and avoids ANR issues.

- Pitfall 5: Not handling errors or exceptions in native code
  - Bad:
    ```kotlin
    @ReactMethod
    fun failSometimes(promise: Promise) {
      val x = 1 / 0 // crash
      promise.resolve(x)
    }
    ```
  - Good:
    ```kotlin
    @ReactMethod
    fun failSometimes(promise: Promise) {
      try {
        val result = potentiallyFailingCall()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_NATIVE", e)
      }
    }
    ```
    - Robust error handling prevents hard crashes and provides actionable errors to JS.

## 5. Why This Matters In Real Systems

- Performance and user experience: Native modules let you implement CPU-intensive tasks in Kotlin, avoiding heavy JavaScript processing and keeping UI responsive.
- Access to platform APIs: Some device features (sensor data, advanced permissions, OEM-specific features) are best accessed via native code or require custom native bridges.
- Team collaboration and reuse: Shared business logic can live in JS, while platform-specific capabilities live in Kotlin/Swift, enabling collaboration between web-like teams and mobile specialists.
- Maintainability and testing: Native modules can be unit-tested on the Kotlin side and integration-tested with RN, improving reliability across Android and iOS.
- Security and validation: Implementing critical logic in native code can protect sensitive operations and validate inputs before exposing results to JS.

## 6. Study Questions

1. What is the role of the JavaScript bridge in React Native on Android?
2. How do you expose a native Kotlin module to React Native?
3. Why must @ReactMethod methods that return data to JS use a Promise or Callback?
4. How do you register a Kotlin module so React Native can discover it?
5. Name a scenario where writing a native module is preferable to implementing the feature purely in JavaScript.

## 7. Exercise

Part A — Project setup
1) Create a new React Native project and enable Kotlin-based native modules in the Android project.
2) Ensure gradle includes the Kotlin plugin and the Kotlin stdlib.

Part B — Implement a Kotlin native module
3) Implement a native module DeviceInfoModule that exposes a method getDeviceInfo(promise) returning a map with brand, model, and apiLevel.
4) Register the module in a ReactPackage and include the package in MainApplication.

Kotlin code for DeviceInfoModule and package (example):

```kotlin
// DeviceInfoModule.kt
package com.rnexercise

import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceInfoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceInfoModule"

  @ReactMethod
  fun getDeviceInfo(promise: Promise) {
    val info = Arguments.createMap().apply {
      putString("brand", Build.BRAND)
      putString("model", Build.MODEL)
      putInt("apiLevel", Build.VERSION.SDK_INT)
    }
    promise.resolve(info)
  }
}
```

```kotlin
// DeviceInfoPackage.kt
package com.rnexercise

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DeviceInfoPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(DeviceInfoModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
```

```kotlin
// MainApplication.kt (snippet)
override fun getPackages(): List<ReactPackage> {
  val packages = mutableListOf<ReactPackage>(MainReactPackage())
  packages.add(DeviceInfoPackage()) // add the new package
  return packages
}
```

Part C — Consume in React Native
5) In a React Native component, call the native module to fetch device info and render it.

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, NativeModules } from 'react-native';

const { DeviceInfoModule } = NativeModules;

export default function App() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    DeviceInfoModule.getDeviceInfo().then((inf) => {
      setInfo(inf);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Info</Text>
      {info ? (
        <Text style={styles.info}>
          Brand: {info.brand}{'\n'}
          Model: {info.model}{'\n'}
          API Level: {info.apiLevel}
        </Text>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  info: { fontSize: 14, lineHeight: 20 },
});
```

Part D — Validation and considerations
6) Build and run on an Android device or emulator.
7) Verify that the UI shows brand, model, and API level from the Kotlin module.
8) Consider adding error handling for environments where the module might not be available (e.g., unit tests without Android runtime).

If you complete these parts, you’ll have a working Kotlin-to-JavaScript native bridge in a React Native project, illustrating a practical cross-platform workflow that Kotlin Android developers can leverage in Phase 2: Cross-Platform track.