# Writing Native Bridge Modules in Kotlin for React Native

In mobile app development, native bridge modules let you extend a cross-platform framework (like React Native) with highly-optimized, platform-specific capabilities written in Kotlin for Android. This enables access to device features (toasts, sensors, geolocation, etc.) that are impractical or slow to implement purely in JavaScript. Writing robust native modules is essential for performance-critical paths, integrating third-party SDKs, and providing a seamless UX while maintaining a single JS codebase.

## 1. Defining a Minimal Native Module (Toast example)

This section shows how to create a simple native module that exposes a toast message to JavaScript. It demonstrates the core structure: a module class, a package, and how to register the module.

Code: ToastModule.kt
```kotlin
package com.example.nativebridge

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.widget.Toast

class ToastModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ToastModule"
    }

    @ReactMethod
    fun show(message: String, duration: Int) {
        val toastLength = if (duration == 0) Toast.LENGTH_SHORT else Toast.LENGTH_LONG
        Toast.makeText(reactContext, message, toastLength).show()
    }
}
```

Code: ToastPackage.kt
```kotlin
package com.example.nativebridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Arrays
import java.util.Collections
import java.util.List

class ToastPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return Arrays.asList(ToastModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
```

Code: Registering the package (MainApplication.kt – excerpt)
```kotlin
// inside your MainApplication class, in getPackages()
override fun getPackages(): List<ReactPackage> {
    return Arrays.asList(
        ToastPackage(), // register our native module
        // ... other packages
    )
}
```

### Line-by-line explanation
- package com.example.nativebridge: Declares the Kotlin package for organization and namespacing.
- import statements: Bring in required React Native bridge classes and Android UI classes.
- class ToastModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext): Defines a native module named ToastModule that binds to the React Native context.
- override fun getName(): String { return "ToastModule" }: Exposes the module name used from JavaScript as NativeModules.ToastModule.
- @ReactMethod fun show(message: String, duration: Int): Exposes a method to JavaScript. It converts the duration to a Toast length and shows a native toast.
- ToastPackage: Implements ReactPackage to expose native modules to React Native.
- createNativeModules: Returns a list containing an instance of ToastModule, registering it with the runtime.
- getPackages (MainApplication.kt): Ensures the package is included in React Native’s package list so JavaScript can access ToastModule.

## 2. Exposing Data and Returning Values (Device info with Promise)

To pass data back to JavaScript, use Promises or Callbacks. Here we implement a module that returns a map with device info.

Code: DeviceInfoModule.kt
```kotlin
package com.example.nativebridge

import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = DeviceInfoModule.NAME)
class DeviceInfoModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "DeviceInfoModule"
    }

    override fun getName(): String = NAME

    // Returns a map with device information
    @org.jetbrains.annotations.Nullable
    @kotlin.jvm.Throws(java.lang.Exception::class)
    fun getDeviceInfo(promise: Promise) {
        try {
            val info = WritableNativeMap()
            info.putString("model", Build.MODEL)
            info.putString("manufacturer", Build.MANUFACTURER)
            info.putString("version", Build.VERSION.RELEASE)
            promise.resolve(info)
        } catch (e: Exception) {
            promise.reject("E_INFO", "Failed to fetch device info", e)
        }
    }
}
```

Code: DeviceInfoPackage.kt
```kotlin
package com.example.nativebridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Arrays
import java.util.Collections
import java.util.List

class DeviceInfoPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // Note: The module instance creation can be improved with constructor injection if needed
        return Arrays.asList(DeviceInfoModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
```

Code: JavaScript usage (React Native)
```javascript
import { NativeModules } from 'react-native';
const { DeviceInfoModule } = NativeModules;

async function fetchDeviceInfo() {
  try {
    const info = await DeviceInfoModule.getDeviceInfo();
    console.log('Device Info:', info);
  } catch (e) {
    console.error(e);
  }
}
```

### Line-by-line explanation
- @ReactModule(name = DeviceInfoModule.NAME): Optional annotation for module naming; primarily for clarity and tooling.
- class DeviceInfoModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext): Defines the module and binds to React Native.
- companion object { const val NAME = "DeviceInfoModule" }: Keeps a constant for the module name.
- override fun getName(): String = NAME: Returns the module name to JS.
- @ReactMethod fun getDeviceInfo(promise: Promise): Exposes a method that returns data via Promise.
- val info = WritableNativeMap(): Creates a map-like structure to send multiple fields.
- info.putString(...): Populates the map with device attributes.
- promise.resolve(info): Resolves the Promise with the map so JS can access fields.
- promise.reject(...): Demonstrates error handling if something goes wrong.
- DeviceInfoPackage.kt: Registers DeviceInfoModule with React Native.

Note: The JS usage relies on the Promise-returning pattern; the Kotlin side can also use callbacks or synchronous returns (with caveats) if needed.

## 3. Handling Asynchronous Work & Threading in Native Modules

Native modules often perform long-running work. In React Native, keep heavy work off the main thread and return results via Promise or Callback to avoid blocking UI.

Code: AsyncModule.kt
```kotlin
package com.example.nativebridge

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AsyncModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AsyncModule"

    @ReactMethod
    fun computeAsync(input: String, promise: Promise) {
        Thread {
            try {
                // Simulate heavy computation
                Thread.sleep(1000)
                val result = input.length * 7
                val map = com.facebook.react.bridge.WritableNativeMap()
                map.putInt("result", result)
                map.putString("input", input)
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("E_COMPUTE", "Async compute failed", e)
            }
        }.start()
    }
}
```

Code: AsyncModulePackage.kt
```kotlin
package com.example.nativebridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Arrays
import java.util.Collections
import java.util.List

class AsyncModulePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): Lists<NativeModule> =
        Arrays.asList(AsyncModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
```

Code: JavaScript usage (React Native)
```javascript
import { NativeModules } from 'react-native';
const { AsyncModule } = NativeModules;

async function runAsyncComputation(text) {
  try {
    const result = await AsyncModule.computeAsync(text);
    console.log('Async result:', result);
  } catch (e) {
    console.error(e);
  }
}
```

### Line-by-line explanation
- The Thread block in computeAsync runs off the main thread to avoid UI jank.
- Thread.sleep(1000) simulates a time-consuming operation; in real apps, this could be a network request, disk I/O, or heavy computation.
- result calculation demonstrates transforming input into a structured result.
- WritableNativeMap creates a map to return multiple fields to JavaScript.
- promise.resolve(map) sends data back to JS; promise.reject handles errors.
- The package files register the module similarly to the previous section.

Note: If you need to touch UI elements, you must post back to the main thread via runOnUiThread or a Handler tied to the Looper.

## 4. Common Beginner Mistakes — bad vs good

X. Common Mistakes (with side-by-side bad/good snippets)

1) Forgetting to register the module in the package

- Bad:
```kotlin
// ToastModule exists but not registered anywhere
```

- Good:
```kotlin
class MyApplication : Application(), ReactApplication {
    override fun getPackages(): List<ReactPackage> {
        return Arrays.asList(ToastPackage()) // register
    }
}
```

2) Accessing UI elements from a non-UI thread

- Bad:
```kotlin
@ReactMethod
fun showToast(message: String) {
    Toast.makeText(reactContext, message, Toast.LENGTH_SHORT).show() // Called from RN thread
}
```

- Good:
```kotlin
@ReactMethod
fun showToast(message: String) {
    val handler = Handler(Looper.getMainLooper())
    handler.post {
        Toast.makeText(reactContext, message, Toast.LENGTH_SHORT).show()
    }
}
```

3) Returning nothing from a method that should inform the caller (no Promise/Callback)

- Bad:
```kotlin
@ReactMethod
fun compute() {
    // no return type to JS
}
```

- Good:
```kotlin
@ReactMethod
fun compute(promise: Promise) {
    // do work
    promise.resolve("done")
}
```

4) Not handling exceptions or using try/catch

- Bad:
```kotlin
@ReactMethod
fun getDeviceInfo(promise: Promise) {
    val info = WritableNativeMap()
    info.putString("model", Build.MODEL)
    promise.resolve(info) // might crash if Build is null
}
```

- Good:
```kotlin
@ReactMethod
fun getDeviceInfo(promise: Promise) {
    try {
        val info = WritableNativeMap()
        info.putString("model", Build.MODEL ?: "unknown")
        promise.resolve(info)
    } catch (e: Exception) {
        promise.reject("E_INFO", "Failed to fetch device info", e)
    }
}
```

5) Exposing complex types without proper mappings

- Bad:
```kotlin
@ReactMethod
fun getData(): DataClass {
    return DataClass("x", 1)
}
```

- Good:
```kotlin
@ReactMethod
fun getData(promise: Promise) {
    val map = WritableNativeMap()
    map.putString("name", "x")
    map.putInt("value", 1)
    promise.resolve(map)
}
```

6) Holding onto a ReactContext that can cause leaks

- Bad:
```kotlin
class MyModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    // store ctx in a field for later use
}
```

- Good:
```kotlin
class MyModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    // use reactContext when needed, do not leak
}
```

## 5. Why This Matters In Real Systems

- Performance: Bridge calls cross the JS-native boundary; excessive calls or heavy work on the JS thread cause jank. Move heavy work off the JS/UI thread and batch calls when possible.
- Reliability: Properly register modules, handle nulls, and manage threads to avoid crashes in production builds.
- Maintainability: Clear module boundaries and typed data mappings (WritableMap/WritableNativeMap) reduce API confusion and minimize JS-side bugs.
- Interoperability: Modules often need to integrate with other Android SDKs (Firebase, sensors, BLE). A clean bridge interface preserves modularity and testability.
- Security and lifecycle: Avoid exposing sensitive data; clean up resources in onCatalystInstanceDestroy and respect Android lifecycle.

## 6. Study Questions — (recall)

1. What is the role of a ReactPackage in registering native modules with React Native?
2. How do you return complex structured data from Kotlin to JavaScript using a native module?
3. Why should long-running native work be dispatched off the main thread, and how can you return results to JavaScript?
4. What are WritableNativeMap and Promise used for in bridging?
5. What common mistake can lead to memory leaks in native modules, and how can you prevent it?

## 7. Exercise — Build a SystemInfo module with JS usage

Goal: Create a Kotlin Android native module that exposes:
- getDeviceInfo(): Promise resolving to a map with model, manufacturer, and OS version.
- getAppVersion(): Promise resolving to the current app version string.
- simulateCpuLoad(ms): Promise resolving to a summary string after simulating CPU work for ms milliseconds.

Part A: Implement the Kotlin modules
- Create SystemInfoModule.kt with two methods: getDeviceInfo and getAppVersion, both returning Promises.
- Create SystemInfoPackage.kt to register the module.
- Update MainApplication.kt to include SystemInfoPackage.

Part B: Implement a simple test in JavaScript
- Use NativeModules.SystemInfoModule and call both async methods.
- Log results to the console and handle errors.

Part C: Edge cases and tests
- Ensure you properly handle exceptions and reject promises with meaningful error codes.
- Validate that the promise-based results map to correct JS types (strings, maps).

Sample scaffolding to start (Kotlin).

SystemInfoModule.kt
```kotlin
package com.example.nativebridge

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = SystemInfoModule.NAME)
class SystemInfoModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object { const val NAME = "SystemInfoModule" }

    override fun getName(): String = NAME

    @org.jetbrains.annotations.Nullable
    fun getDeviceInfo(promise: Promise) {
        try {
            val map = WritableNativeMap()
            map.putString("model", Build.MODEL)
            map.putString("manufacturer", Build.MANUFACTURER)
            map.putString("version", Build.VERSION.RELEASE)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("E_DEV_INFO", "Failed to fetch device info", e)
        }
    }

    @org.jetbrains.annotations.Nullable
    fun getAppVersion(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val info: PackageInfo = pm.getPackageInfo(reactContext.packageName, 0)
            promise.resolve(info.versionName)
        } catch (e: Exception) {
            promise.reject("E_APP_VER", "Failed to fetch app version", e)
        }
    }

    @ReactMethod
    fun simulateCpuLoad(ms: Int, promise: Promise) {
        Thread {
            try {
                val end = System.currentTimeMillis() + ms
                while (System.currentTimeMillis() < end) {
                    // Busy-wait to simulate CPU work
                    Math.sqrt(Math.random())
                }
                promise.resolve("Simulated CPU load for $ms ms completed")
            } catch (e: Exception) {
                promise.reject("E_CPU", "CPU load simulation failed", e)
            }
        }.start()
    }
}
```

SystemInfoPackage.kt
```kotlin
package com.example.nativebridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Arrays
import java.util.Collections
import java.util.List

class SystemInfoPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return Arrays.asList(SystemInfoModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
```

MainApplication.kt (excerpt)
```kotlin
override fun getPackages(): List<ReactPackage> {
    return Arrays.asList(
        ToastPackage(),
        DeviceInfoPackage(),
        AsyncModulePackage(),
        SystemInfoPackage() // register the exercise module
        // ... other packages
    )
}
```

JavaScript usage (React Native)
```javascript
import { NativeModules } from 'react-native';
const { SystemInfoModule } = NativeModules;

async function testSystemInfo() {
  try {
    const deviceInfo = await SystemInfoModule.getDeviceInfo();
    console.log('Device Info:', deviceInfo);

    const appVersion = await SystemInfoModule.getAppVersion();
    console.log('App Version:', appVersion);

    const cpuResult = await SystemInfoModule.simulateCpuLoad(500);
    console.log(cpuResult);
  } catch (e) {
    console.error(e);
  }
}
```

What you should learn from this exercise:
- How to structure a native module that exposes multiple methods with Promises.
- How to register multiple modules and ensure they’re discoverable from JavaScript.
- How to design clean data mappings between Kotlin and JS (WritableNativeMap vs primitive returns).
- How to test asynchronous bridge calls in a real app workflow.

End of lesson.