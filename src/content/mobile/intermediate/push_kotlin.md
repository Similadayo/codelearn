# Track: Mobile App Development — Phase 3: Native Device Features — Push Notifications Integration (Kotlin Android)

Push notifications are the lifeline between your app and users who aren’t actively using it. In Android, integrating with Firebase Cloud Messaging (FCM) lets you deliver messages from your backend reliably, handle tokens, and present notifications with a consistent user experience across devices and OS versions. This lesson walks you through setting up FCM in Kotlin, wiring a FirebaseMessagingService, creating notification channels, and handling payloads in a production-friendly way.

## 1. Getting Started with Firebase Cloud Messaging (FCM) in Android

To receive push notifications, you must configure Firebase in your Android project, wire up the Messaging SDK, declare the service, and request appropriate permissions.

```gradle
// build.gradle (Project: MyApp)
buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath 'com.android.tools.build:gradle:8.2.0'
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

### Line-by-line explanation
- Declares the Google Services plugin for the build system to enable Firebase integration.
- Uses Google’s Maven repo to fetch the Google Services plugin.

```gradle
// build.gradle (Module: app)
plugins {
  id 'com.android.application'
  id 'kotlin-android'
}

android {
  compileSdk 34

  defaultConfig {
     applicationId "com.example.notifdemo"
     minSdk 21
     targetSdk 34
     versionCode 1
     versionName "1.0"
  }

  buildTypes {
     release { isMinifyEnabled = false; proguardFiles getDefaultProguardFile('proguard-android-optimize.txt', 'proguard-rules.pro') }
  }
}

dependencies {
  // Use BOM to align Firebase component versions (optional)
  implementation platform('com.google.firebase:firebase-bom:32.0.0')
  implementation 'com.google.firebase:firebase-messaging-ktx'
  implementation 'androidx.core:core-ktx:1.12.0'
  // ... other dependencies
}

// Apply Google Services plugin
apply plugin: 'com.google.gms.google-services'
```

### Line-by-line explanation
- Sets up Kotlin-friendly Android configuration with compile and target SDKs.
- Adds Firebase Messaging as a dependency (KTX variant for Kotlin convenience).
- (Optional) Uses Firebase Bill of Materials (BOM) to keep Firebase libraries in sync.
- Applies the Google Services Gradle plugin to ingest google-services.json at build time.

```xml
<!-- AndroidManifest.xml -->
<manifest package="com.example.notifdemo" ...>
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

  <application
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher">

      <!-- Firebase Messaging Service -->
      <service
          android:name=".MyFirebaseMessagingService"
          android:exported="false">
          <intent-filter>
              <action android:name="com.google.firebase.MESSAGING_EVENT" />
          </intent-filter>
      </service>

      <!-- Default notification channel ID used by FCM if you no-op -->
      <meta-data
          android:name="com.google.firebase.messaging.default_notification_channel_id"
          android:value="default_channel" />
      <!-- Other activities/fragments -->
  </application>
</manifest>
```

### Line-by-line explanation
- Grants Internet access for network operations (receiving messages, token upload).
- Adds a manifest entry for the Firebase Messaging service so FCM can deliver messages to your app.
- Declares a notification channel ID meta-data so FCM can pick a channel for notifications on Android O+.
- Keeps other app components unchanged.

```kotlin
// src/main/java/com/example/notifdemo/MainActivity.kt
package com.example.notifdemo

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    // Retrieve and print the FCM registration token
    FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
      if (!task.isSuccessful) {
        Log.w(TAG, "Fetching FCM registration token failed", task.exception)
        return@addOnCompleteListener
      }
      val token = task.result
      Log.d(TAG, "FCM Registration Token: $token")
      // TODO: Send this token to your app server for targeted messaging
    }
  }

  companion object { private const val TAG = "MainActivity" }
}
```

### Line-by-line explanation
- In onCreate, we fetch the current FCM registration token asynchronously.
- If successful, we log the token (and you should send it to your backend).
- This token uniquely identifies the device/app instance for targeted messages.

```kotlin
// src/main/java/com/example/notifdemo/MyFirebaseMessagingService.kt
package com.example.notifdemo

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.util.Log

class MyFirebaseMessagingService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
     super.onNewToken(token)
     Log.d(TAG, "Refreshed token: $token")
     // Persist or send token to your server as needed
     sendRegistrationToServer(token)
  }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
     super.onMessageReceived(remoteMessage)
     Log.d(TAG, "From: ${remoteMessage.from}")

     // Prefer data payload if provided
     val title = remoteMessage.data["title"] ?: remoteMessage.notification?.title ?: "Notification"
     val body = remoteMessage.data["body"] ?: remoteMessage.notification?.body ?: ""

     sendNotification(title, body)
  }

  private fun sendRegistrationToServer(token: String) {
     // Implement the logic to upload the token to your backend
  }

  private fun sendNotification(title: String, messageBody: String) {
     val channelId = "default_channel"
     val notificationId = (System.currentTimeMillis() % 100000).toInt()

     val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

     // Create a notification channel for Android O+ (required)
     if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
           channelId,
           "Default Channel",
           NotificationManager.IMPORTANCE_HIGH
        )
        notificationManager.createNotificationChannel(channel)
     }

     val intent = Intent(this, MainActivity::class.java)
     intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
     val pendingIntent = PendingIntent.getActivity(
         this, 0, intent,
         if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
           PendingIntent.FLAG_IMMUTABLE else 0
     )

     val builder = NotificationCompat.Builder(this, channelId)
         .setSmallIcon(R.drawable.ic_notification) // replace with your icon
         .setContentTitle(title)
         .setContentText(messageBody)
         .setAutoCancel(true)
         .setContentIntent(pendingIntent)

     notificationManager.notify(notificationId, builder.build())
  }

  companion object { private const val TAG = "MyFirebaseMsgService" }
}
```

### Line-by-line explanation
- onNewToken: handles token rotation by FCM; you should persist or push the new token to your server.
- onMessageReceived: processes incoming messages, preferring the data payload when present, but falling back to a notification payload if provided.
- sendRegistrationToServer: placeholder for server sync logic.
- sendNotification: builds and displays a local notification, creating a channel on Android O+ if needed, and wiring a tap action back to MainActivity via a PendingIntent. Uses a unique notificationId to avoid collisions.

```kotlin
// Optional: Requesting and logging the FCM token from a foreground Activity (Android 13+)
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

// Inside an Activity (e.g., MainActivity)
if (Build.VERSION.SDK_INT >= 33) {
  if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
      != PackageManager.PERMISSION_GRANTED) {
    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
  }
}
```

### Line-by-line explanation
- Demonstrates how to request the POST_NOTIFICATIONS permission at runtime for Android 13+.
- Checks existing permission and requests it if not granted; replace with your preferred permission flow.

```
# Ensure you have google-services.json in app/ and the Firebase console configured with your app.
```

### Line-by-line explanation
- Note to include the Google Services config blob from Firebase Console; this file is essential to connect your app to Firebase.

---

## 2. Implementing the Firebase Messaging Service and Local Notifications

In this section, we focused on how to implement the FirebaseMessagingService subclass and how to surface notifications to users, including token handling and payload processing.

```kotlin
// MyFirebaseMessagingService.kt (see above for full code)
```

### Line-by-line explanation
- The service handles token refresh (onNewToken) and message delivery (onMessageReceived).
- It creates a notification channel for Android O+ and uses NotificationCompat to ensure broad compatibility.
- Payload handling prioritizes data payload but gracefully uses notification payload if title/body are missing in data.

```kotlin
// MainActivity.kt snippet for token logging (see section 1)
```

### Line-by-line explanation
- Demonstrates how to fetch and log the FCM registration token at app startup, a common place to push the token to your backend.

---

## 3. Notification Channels, Permissions, and Foreground/Background Behavior

To deliver a consistent user experience, you must configure notification channels on Android 8.0+ and handle runtime permissions on newer Android versions.

```kotlin
// Notification channel helper (alternative modular approach)
private fun ensureNotificationChannel(context: Context) {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
     val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
     val chan = NotificationChannel(
        "default_channel",
        "Default Channel",
        NotificationManager.IMPORTANCE_HIGH
     )
     nm.createNotificationChannel(chan)
  }
}
```

### Line-by-line explanation
- Ensures a notification channel exists before posting notifications, preventing crash on Android O+ if the channel is missing.

```xml
<!-- manifest snippet focusing on permissions and channel ID meta-data -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application>
  <meta-data
      android:name="com.google.firebase.messaging.default_notification_channel_id"
      android:value="default_channel" />
  <!-- other components -->
</application>
```

### Line-by-line explanation
- Internet permission is required for network calls.
- POST_NOTIFICATIONS permission is mandatory on Android 13+ to display notifications.
- The manifest tells the system to use a default notification channel when none is specified by the app.

```kotlin
// Kotlin: requesting POST_NOTIFICATIONS permission (Android 13+)
if (Build.VERSION.SDK_INT >= 33) {
  if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
      != PackageManager.PERMISSION_GRANTED) {
    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
  }
}
```

### Line-by-line explanation
- Demonstrates a practical runtime permission check and request for the new Android 13 permission.

---

## 4. Optional Features: Topic Subscriptions and Data Payload Handling

Extra capabilities help you target messages and design rich notifications.

```kotlin
// Subscribe to a topic (useful for broadcast-style messaging)
FirebaseMessaging.getInstance().subscribeToTopic("promotions")
  .addOnCompleteListener { task ->
    if (task.isSuccessful) {
      Log.d("FCM", "Subscribed to promotions topic")
    } else {
      Log.w("FCM", "Topic subscription failed", task.exception)
    }
  }
```

### Line-by-line explanation
- Subscribes the device/app instance to a topic named "promotions" so backend can publish to that topic and all subscribers receive it.
- Logs success or failure for debugging and monitoring.

```kotlin
// Payload considerations
override fun onMessageReceived(remoteMessage: RemoteMessage) {
  val data = remoteMessage.data
  val notification = remoteMessage.notification
  // You can inspect data payload keys (e.g., data["image_url"]) and fetch assets as needed.
}
```

### Line-by-line explanation
- Illustrates how to inspect both data and notification payloads to decide how to present content or fetch assets.

---

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

### Pitfall 1 — Not declaring the Firebase service in the manifest

Bad:
```xml
<!-- Forgot to declare service -->
```

Good:
```xml
<application>
  <service
      android:name=".MyFirebaseMessagingService"
      android:exported="false">
      <intent-filter>
          <action android:name="com.google.firebase.MESSAGING_EVENT" />
      </intent-filter>
  </service>
</application>
```

### Line-by-line explanation
- Without declaring the service, FCM cannot deliver messages to your app, so onMessageReceived will never be invoked.

### Pitfall 2 — Failing to create a notification channel on Android O+

Bad:
```kotlin
val builder = NotificationCompat.Builder(this, "missing_channel")
  .setSmallIcon(R.drawable.ic_notification)
  .setContentTitle(title)
  .setContentText(message)
```

Good:
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
  val channel = NotificationChannel("default_channel", "Default Channel", NotificationManager.IMPORTANCE_HIGH)
  val nm = getSystemService(NotificationManager::class.java)
  nm.createNotificationChannel(channel)
}
val builder = NotificationCompat.Builder(this, "default_channel")
  .setSmallIcon(R.drawable.ic_notification)
  .setContentTitle(title)
  .setContentText(message)
```

### Line-by-line explanation
- Android O+ requires a channel; otherwise notifications may not appear or behave as expected.

### Pitfall 3 — Not handling POST_NOTIFICATIONS permission on Android 13+

Bad:
```kotlin
// No runtime permission check
```

Good:
```kotlin
if (Build.VERSION.SDK_INT >= 33) {
  if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
      != PackageManager.PERMISSION_GRANTED) {
    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
  }
}
```

### Line-by-line explanation
- Without runtime permission handling, notifications may be blocked on Android 13+ if the user denies the permission.

### Pitfall 4 — Ignoring token lifecycle

Bad:
```kotlin
override fun onNewToken(token: String) {
  // do nothing
}
```

Good:
```kotlin
override fun onNewToken(token: String) {
  // Save/update token on app server
  sendRegistrationToServer(token)
}
```

### Line-by-line explanation
- FCM may rotate tokens; you must propagate the new token to your backend to keep targeted messaging working.

---

## Y. Why This Matters In Real Systems

- Reliability: FCM token rotation, device offline scenarios, and background payload handling require robust logic to ensure messages are delivered and displayed.
- Backend integration: Your server must store tokens securely, manage topic subscriptions, and ensure tokens are tied to user accounts.
- Data vs notification payload: Decide where to handle data in-app vs letting the system display notification payload; this affects UX on foreground/background transitions.
- Privacy and security: Use HTTPS for token updates, validate server endpoints, and implement authentication/authorization for endpoints that receive tokens.
- UX consistency: Notification channels, icons, sounds, and priorities should align with your app’s design language.
- Accessibility and battery: Avoid spamming users; implement sensible rate limits and avoid heavy work inside onMessageReceived.

---

## Z. Study Questions

1) What file(s) do you need to modify to enable FCM in an Android app using Kotlin?  
2) Why is a NotificationChannel necessary on Android 8.0+ and how do you create one in code?  
3) What is the difference between data payload and notification payload in FCM, and how should you handle each in onMessageReceived?  
4) How can you retrieve and log the FCM registration token at app startup, and why is this token important?  
5) Which Android version introduces the POST_NOTIFICATIONS permission, and how should you request it at runtime?

---

## Exercise

Complete this multi-part coding challenge to build a small, production-like push notification workflow.

Part A — Setup and token handling
- Create a new Android Kotlin project (or adapt an existing one).
- Add Firebase to the project (google-services.json) and configure Gradle files as shown.
- Implement a MainActivity that fetches the FCM token on startup and logs it. Ensure you handle failures gracefully.

Part B — Implement the Messaging Service
- Implement a FirebaseMessagingService subclass (MyFirebaseMessagingService) that:
  - Handles onNewToken by logging and sending the token to a mock server function.
  - Handles onMessageReceived by showing a local notification with title/body from data or notification payload.
  - Creates a notification channel named “Default Channel” with high importance on Android O+.

Part C — Foreground/Background UX and permissions
- Ensure that notifications are shown when messages arrive while the app is in the foreground.
- Add the POST_NOTIFICATIONS permission for Android 13+ and request it at runtime.
- Use a valid drawable icon resource for the notification.

Part D — Optional: Topic subscriptions
- Add a feature to subscribe the device to a topic named “alerts” and log success/failure.
- Demonstrate sending a data payload payload for a test message with a title and body, and a separate data payload key for an image URL (don’t fetch the image for now; just log the URL).

Deliverables:
- All Kotlin source files highlighted in this lesson (MainActivity.kt, MyFirebaseMessagingService.kt) and any helper classes.
- Updated AndroidManifest.xml and Gradle snippets reflecting the changes.
- A short README-style section (in your repo) explaining how to test push notifications using Firebase Console (send test message) and how to verify token propagation to your backend.

Note: If you’re not able to run Firebase in your environment, you can simulate onMessageReceived by sending a local broadcasting intent from a test utility to mimic FCM payloads and verify your notification surface logic.