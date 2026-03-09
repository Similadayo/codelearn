# Push Notifications Integration in Flutter (Phase 3: Native Device Features)

Push notifications are a foundational mechanism for re-engaging users, delivering timely updates, and driving in-app actions. In professional mobile development, a robust push-notification integration must handle platform differences (Android and iOS), permissions, foreground/background behavior, data vs. notification payloads, token lifecycle, and observability. This lesson teaches you how to integrate Firebase Cloud Messaging (FCM) with Flutter, display foreground notifications using a local notification plugin, and design for reliability in production systems.

## 1. Prerequisites and Project Setup

Understand what you need before coding: Flutter project, Firebase project, and the FlutterFire plugins for messaging and local notifications.

```yaml
# pubspec.yaml (dependencies required for push notifications)
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.15.0
  firebase_messaging: ^14.7.0
  flutter_local_notifications: ^9.7.0
  cupertino_icons: ^1.0.2
```

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}
```

### Line-by-line explanation
- dependencies: Defines the Flutter packages required for push notifications: core Firebase, messaging, local notifications, and icons.
- Imports: Bring in Flutter, Firebase core, Firebase Messaging, and local notifications to enable messaging and in-app notifications.
- main(): Entry point. Ensures Flutter bindings, initializes Firebase, and starts the app.

Notes:
- After adding dependencies, run flutter pub get.
- You’ll also need platform-specific setup (AndroidManifest.xml, iOS Info.plist) explained later in this module.

## 2. Initialize Firebase and Request Permissions

Set up Firebase Messaging and request iOS permissions. Also fetch the device token for server registration.

```dart
class _PushService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    // Initialize local notifications (Android)
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    final InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);
    await _localNotifications.initialize(initializationSettings);

    // Request permissions (iOS)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    print('User granted permission: ${settings.authorizationStatus}');

    // Get FCM token
    final String? token = await _messaging.getToken();
    print('FCM Token: $token');
  }
}
```

### Line-by-line explanation
- _messaging: Access to FCM instance for token and message handling.
- _localNotifications: Plugin used to show in-app notifications when the app is in the foreground.
- init(): Entry point to prepare messaging and local notifications.
- AndroidInitializationSettings: Sets the default icon on Android for displayed notifications.
- InitializationSettings: Combines platform-specific initialization settings.
- requestPermission: On iOS, prompts the user to grant notification permissions (alert, badge, sound).
- getToken: Retrieves the device’s FCM registration token for server-side addressing.
- print statements: Helpful for debugging during development.

Platform notes:
- Android requires minimal manifest changes; iOS requires explicit permission prompts and APNs setup on the Firebase console.

## 3. Message Handlers: Foreground, Background, and Terminated

Configure how messages are received in all app states, and route them to a local notification when appropriate.

```dart
// Background message handler (must be a top-level function)
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message received: ${message.messageId}');
  // You can perform background work here if needed
}

class _PushService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  void registerMessageHandlers() {
    // Foreground messages (when app is open)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Foreground message: ${message.messageId}');
      showLocalNotification(message);
    });

    // User taps a notification to open the app
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification opened app: ${message.messageId}');
      // Navigate or update UI based on message.data
    });

    // Background messages
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
  }

  void showLocalNotification(RemoteMessage message) async {
    const androidDetails = AndroidNotificationDetails(
      'default_channel',
      'Default',
      channelDescription: 'Channel for push notifications',
      importance: Importance.max,
      priority: Priority.high,
    );
    const platformDetails = NotificationDetails(android: androidDetails);
    await _localNotifications.show(
      0,
      message.notification?.title ?? 'Notification',
      message.notification?.body ?? '',
      platformDetails,
      payload: message.data.isNotEmpty ? message.data.toString() : null,
    );
  }
}
```

### Line-by-line explanation
- firebaseBackgroundHandler: Top-level function required by Flutter to handle background messages outside the main isolate. Initializes Firebase to use in the background and logs the message.
- _messaging: Access to FCM to receive messages.
- registerMessageHandlers: Binds runtime listeners for different app states.
- onMessage: Triggered when a message arrives while the app is in the foreground; you typically show a local notification here.
- onMessageOpenedApp: Triggered when the user taps a notification to open the app; use to navigate or refresh UI.
- onBackgroundMessage: Registers the top-level background handler.
- showLocalNotification: Builds and displays a local notification using flutter_local_notifications.
- AndroidNotificationDetails: Defines channel, importance, and priority for Android.
- NotificationDetails: Platform-agnostic wrapper for showing the notification.
- payload: Optional data payload forwarded for navigation or context.

Production note:
- For iOS, you may also implement a separate iOS-specific handling path and ensure APNs tokens are uploaded to FCM.

## 4. Local Notifications Deep Dive (Foreground Display)

Fine-tune how you present in-app notifications when the app is active, including channel management and styling.

```dart
class _PushService {
  // ... existing fields and init() ...

  void configureForegroundDisplay() {
    // Already handled in onMessage by calling showLocalNotification(message)
    // This method is intentionally minimal for clarity.
  }

  Future<void> _setupNotificationChannel() async {
    // Android 8.0+ requires a notification channel
    const androidChannel = AndroidNotificationChannel(
      'default_channel',
      'Default Channel',
      description: 'Channel for push notifications',
      importance: Importance.max,
    );
    final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }
}
```

### Line-by-line explanation
- configureForegroundDisplay: Placeholder to emphasize that the actual foreground flow is driven by onMessage calling showLocalNotification.
- _setupNotificationChannel: Demonstrates how to create/update the Android notification channel for consistent styling and behavior across devices.
- AndroidNotificationChannel: Channel metadata that Android uses to categorize notifications.
- createNotificationChannel: Applies the channel to the system for Android.

Production note:
- On iOS, adjust UI/UX for foreground notifications since iOS displays alerts differently depending on user settings.

## 5. Token Management and Topic Messaging

Manage device tokens and enable server-driven audience targeting with topic subscriptions.

```dart
class _PushService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
    print('Subscribed to topic: $topic');
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
    print('Unsubscribed from topic: $topic');
  }

  Future<void> logToken() async {
    final String? token = await _messaging.getToken();
    print('Current FCM token: $token');
  }

  void listenForTokenRefresh() {
    _messaging.onTokenRefresh.listen((newToken) {
      // Send the new token to your server
      print('Token refreshed: $newToken');
    });
  }
}
```

### Line-by-line explanation
- subscribeToTopic/unsubscribeFromTopic: Allow server-side logic to push to all devices subscribed to a given topic (e.g., "news", "updates").
- logToken: Retrieves and logs the current device token for debugging or server integration.
- onTokenRefresh: Reacts to token rotation; you should propagate the new token to your backend to keep registrations up to date.

Server-side tip:
- Use topics for broadcast-style messages and individual tokens for targeted messages. Prefer topics for broad updates and reserve tokens for user-specific data.

## 6. X. Common Beginner Mistakes

Below are real pitfalls with bad vs. good code examples. Read each pair and internalize best practices.

- Pitfall 1: Not requesting iOS permissions
  - Bad:
  ```dart
  // BAD: No permission request on iOS
  void initPush() async {
    // assume permissions granted by default
  }
  ```
  - Good:
  ```dart
  void initPush() async {
    NotificationSettings settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    print('Permission: ${settings.authorizationStatus}');
  }
  ```

- Pitfall 2: Background messages not using a top-level function
  - Bad:
  ```dart
  // BAD: Closure as handler (not allowed for background)
  final handler = (RemoteMessage message) {
    print('Background: ${message.messageId}');
  };
  FirebaseMessaging.onBackgroundMessage(handler);
  ```
  - Good:
  ```dart
  // GOOD: Top-level function required by Flutter for background isolates
  Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
    await Firebase.initializeApp();
    print('Background: ${message.messageId}');
  }
  FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
  ```

- Pitfall 3: Not showing a notification in foreground
  - Bad:
  ```dart
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('Foreground message: ${message.messageId}');
    // No UI update or notification
  });
  ```
  - Good:
  ```dart
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    // Display an in-app notification for foreground messages
    showLocalNotification(message);
  });
  ```

- Pitfall 4: Ignoring data payload
  - Bad:
  ```dart
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('Data: ${message.data}');
    // ignoring data payload
  });
  ```
  - Good:
  ```dart
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    final data = message.data;
    // Use data to update UI or trigger actions
    if (data['navigate'] == 'profile') {
      // navigate to profile screen
    }
  });
  ```

- Pitfall 5: Token not refreshed on rotation or device change
  - Bad:
  ```dart
  void setup() async {
    String? token = await FirebaseMessaging.instance.getToken();
    print('Token: $token');
    // no refresh handling
  }
  ```
  - Good:
  ```dart
  void setup() {
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      // Persist new token to server
      print('Token refreshed: $newToken');
    });
  }
  ```

## Y. Why This Matters In Real Systems

- Reliability and deliverability: Push messages rely on platform services (FCM/APNs). Ensure your app gracefully handles different states (foreground, background, terminated) and gracefully recovers token changes.
- Data vs. notification payloads: Notification payloads trigger system UI; data payloads are delivered to the app for processing. Design payloads to minimize user disruption and maximize actionable insights.
- User experience and consent: Respect user notification preferences. Provide in-app settings to opt in/out and respect Do Not Disturb and mute policies.
- Security and privacy: Protect the device token and data payloads. Do not expose server keys in the client. Validate data server-side and avoid exposing sensitive actions to clients.
- Observability and testing: Log message delivery, token changes, and subscription status. Use staging environments to test FCM flows with realistic payloads before production.
- Platform differences: Android channels, iOS permissions, and lifecycle differences require thoughtful UX and code paths. Make sure to test on multiple OS versions and devices.
- Scalability: For large user bases, prioritize topic messaging for broadcast updates and use device tokens/tersonalized payloads for targeted messages. Maintain token hygiene on the server (token refresh, pruning invalid tokens).

## Z. Study Questions

1) What is the role of Firebase Cloud Messaging in Flutter push notifications?  
2) Why must the background message handler be a top-level function?  
3) How do you display a notification while the app is in the foreground in Flutter?  
4) What is the difference between a notification payload and a data payload?  
5) How should you handle token refresh events on the client and on the server?

## Exercise

Build a simple Flutter app with push-notification support end-to-end. Complete the following parts:

- Part A: Project setup
  - Add dependencies for firebase_core, firebase_messaging, and flutter_local_notifications.
  - Initialize Firebase in main() and set up Android/iOS prerequisites notes.

- Part B: Token and permissions
  - Request iOS notification permissions.
  - Retrieve and print the FCM token on startup.

- Part C: Foreground and background handling
  - Implement a top-level background handler.
  - In foreground, display a local notification when a message arrives.

- Part D: Topic subscription and a minimal UI
  - Subscribe the device to a topic named "updates".
  - Create a simple UI that shows the last 5 received messages (title and body).

- Deliverables
  - A single Flutter project with the above features.
  - A README snippet describing how to test using the Firebase console and a test device.
  - Optional: Add a small test harness to simulate a data payload and verify UI update.

Tips for the exercise
- Use a real Firebase project or a safe staging project to obtain a server key and a sample topic message.
- For testing, you can publish a test message from the Firebase console to a topic or a specific device token.
- Keep code modular: separate a PushService class from UI code and ensure the background handler remains a top-level function.

---
This completes a comprehensive, production-oriented lesson on Push Notifications Integration in Flutter, covering setup, runtime behavior, common pitfalls, production considerations, and hands-on practice.