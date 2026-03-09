# Push Notifications Integration in React Native

Push notifications are a vital channel for user engagement, transactional messaging, and timely updates in mobile apps. In a React Native context, delivering consistent notifications across iOS and Android requires a careful blend of native setup (APNs/FCM), proper permission handling, token management, and foreground/background handling. This module provides a structured, production-ready approach using Firebase Cloud Messaging (FCM) for delivery and Notifee for rich notifications, with clear examples, pitfalls, and hands-on exercises.

## 1. Prerequisites and Architecture

In this section, you’ll learn the high-level architecture, the key libraries, and the initial setup steps that make Push Notifications reliable in production.

Code: Library installation and project scaffolding (shell and package.json hints)
```bash
# Install core libraries (not tied to Expo)
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

```json
// package.json (relevant snippet)
{
  "dependencies": {
    "@react-native-firebase/app": "^15.x",
    "@react-native-firebase/messaging": "^15.x",
    "@notifee/react-native": "^2.x",
    "react": "18.x",
    "react-native": "0.71.x"
  }
}
```

```bash
# Android: ensure Google services plugin is applied
# android/build.gradle
classpath 'com.google.gms:google-services:4.3.18'
```

```xml
<!-- Android: app-level manifest snippet (AndroidManifest.xml) -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<application>
  <!-- ... -->
  <!-- Ensure Firebase Cloud Messaging is enabled -->
  <service android:name="com.google.firebase.messaging.FirebaseMessagingService" android:exported="false">
    <intent-filter>
      <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
  </service>
</application>
```

```xml
<!-- iOS: Info.plist additions (Info.plist) -->
<dict>
  <!-- Request permission prompts automatically -->
  <key>UIBackgroundModes</key>
  <array>
    <string>fetch</string>
    <string>remote-notification</string>
  </array>
  <key>FirebaseAppDelegateProxyEnabled</key>
  <false/>
</dict>
```

```text
Note: This section focuses on the integration workflow, not every platform nuance. After setting up these basics, you’ll implement runtime logic in JavaScript to request permissions, fetch the device token, and handle messages in foreground/background contexts.
```

### Line-by-line explanation
1. The npm install commands add the core React Native Firebase modules and Notifee for rich notifications.
2. package.json dependencies lock versions and ensure compatibility among React, RN, and the libraries.
3. The Android build.gradle snippet wires in the Google Services plugin required to communicate with Firebase.
4. AndroidManifest.xml grants a boot-complete permission and outlines a MessagingService to handle FCM events.
5. iOS Info.plist entries enable background fetch and remote notification support, which help iOS schedule and deliver background updates.
6. The notes emphasize focusing on runtime JS logic after native setup to ensure a reliable cross-platform experience.

## 2. Setting Up Push Notifications (Native + JS)

This section covers end-to-end setup: permissions, token retrieval, channel creation, and the bridge between Firebase Messaging and the native notification UI through Notifee.

Code: App-level JavaScript setup (App.js or similar)
```javascript
// App.js
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

const App = () => {
  useEffect(() => {
    // 1) Create a default Android notification channel
    notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    // 2) Request notification permissions (iOS) and log status
    const requestPermission = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      console.log('Notification permission enabled:', enabled);
    };
    requestPermission();

    // 3) Retrieve the FCM token for this device
    messaging()
      .getToken()
      .then((token) => {
        console.log('FCM Token:', token);
        // Persist token to backend if needed
      });

    // 4) Foreground message handler: show a native notification
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      const { title, body } = remoteMessage.notification || {};
      await notifee.displayNotification({
        title: title ?? 'Notification',
        body: body ?? '',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
        },
      });
    });

    return () => {
      unsubscribeOnMessage();
    };
  }, []);

  return (
    <View>
      <Text>Push Notifications Demo</Text>
    </View>
  );
};

export default App;
```

```javascript
// index.js (background message handler for Android/iOS when app is closed or in background)
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const { title, body } = remoteMessage.notification || {};
  await notifee.displayNotification({
    title: title ?? 'Background Notification',
    body: body ?? '',
    android: {
      channelId: 'default',
      smallIcon: 'ic_launcher',
    },
  });
});

AppRegistry.registerComponent(appName, () => App);
```

### Line-by-line explanation
1. Import React and required hooks for component lifecycle.
2. Import core React Native UI primitives for a minimal screen.
3. Import Firebase messaging to interface with FCM.
4. Import Notifee and Android-specific import for notification importance.
5. Define App component and a useEffect to run on mount.
6. Create a Notifee channel named "Default Channel" with HIGH importance for Android notifications.
7. Define an async function to request notification permissions (primarily iOS), then call it.
8. Request permission via messaging().requestPermission(), which prompts iOS users if needed.
9. Determine if permission was granted (AUTHORIZED or PROVISIONAL) and log the result.
10. Retrieve the device’s FCM token with messaging().getToken() and log it (to send to your backend).
11. Subscribe to foreground messages with messaging().onMessage(), and when a message arrives, extract title/body from the payload.
12. Use Notifee to display a native notification on foreground messages, targeting the "default" channel.
13. Return a cleanup function to unsubscribe from foreground messages when the component unmounts.
14. In index.js, register a background message handler using messaging().setBackgroundMessageHandler(), which runs when the app is in background or killed.
15. In the background handler, extract title/body and display a Notifee notification similarly to the foreground path.
16. Register the App component with AppRegistry to bootstrap the app.

## 3. Sending and Receiving Notifications in App (Foreground, Background, Killed)

In production, you must handle three notification contexts: foreground (app open), background, and terminated. This section demonstrates how to bridge FCM payloads with native notifications across contexts.

Code: Background and foreground handling with a practical payload example
```javascript
// Foreground payload handling (already shown in App.js above)

// Example of a remoteMessage payload you might receive:
{
  "to": "<device_token>",
  "notification": {
    "title": "New Message",
    "body": "You have a new message."
  },
  "data": {
    "orderId": "12345",
    "type": "message"
  }
}
```

```javascript
// Additional helper: subscribing to a topic
import messaging from '@react-native-firebase/messaging';

async function subscribeToTopic(topic) {
  await messaging().subscribeToTopic(topic);
  console.log(`Subscribed to topic: ${topic}`);
}
```

### Line-by-line explanation
1. The foreground payload handling is implemented in App.js via onMessage and Notifee; this snippet reiterates the concept for clarity.
2. The sample remoteMessage payload shows a typical FCM message: a notification payload for title/body and a data payload for app-specific attributes.
3. The subscribeToTopic helper demonstrates how to subscribe devices to a topic to receive broadcast messages; you can call subscribeToTopic('promotions') or similar as part of onboarding or settings.
4. The topic-based approach helps scale notification targeting without maintaining per-device tokens on your server.

## 4. Advanced Topics: Topics, Device Groups, Notification Actions

This section covers common production patterns beyond basic notifications: topic messaging, device groups, and actionable notifications.

Code: Topic subscription and basic actionable notification
```javascript
// Subscribe to a topic (example: promotions)
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { AndroidImportance } from '@notifee/react-native';

async function initTopicAndActions() {
  await messaging().subscribeToTopic('promotions');
  // Ensure a channel exists for Android
  notifee.createChannel({
    id: 'promo',
    name: 'Promotions',
    importance: AndroidImportance.HIGH,
  });
}
```

```javascript
// Schedule an actionable notification when a message arrives
import notifee, { AndroidAction } from '@notifee/react-native';

async function showPromotionNotification(title, body, actionUrl) {
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'promo',
      actions: [
        {
          title: 'Open',
          pressAction: { id: 'open_app' },
        },
      ],
      pressAction: { id: 'default' },
    },
  });
}
```

### Line-by-line explanation
1. Subscribe to the "promotions" topic so devices receive broadcast messages sent to that topic.
2. Create an Android notification channel named "Promotions" with high importance to ensure visibility.
3. Define a helper to display a promotion notification with an actionable button, using a dedicated channel.
4. The action structure (pressAction) configures what happens when the user taps the notification action.

## 5. Handling Permissions and Platform Nuances

Because iOS and Android handle permissions and background execution differently, this section consolidates best practices to minimize user friction and maximize reliability.

Code: Permission checks and best-practice patterns
```javascript
// iOS-friendly permission logic (implicit prompts)
async function ensurePermissions() {
  const status = await messaging().hasPermission();
  if (!status) {
    await messaging().requestPermission();
  }
  const token = await messaging().getToken();
  console.log('Token after permission check:', token);
}
```

```javascript
// Avoid memory leaks: clean up listeners on unmount
useEffect(() => {
  const onMessage = messaging().onMessage(async msg => {
    // local handling
  });
  const onTokenRefresh = messaging().onTokenRefresh(newToken => {
    // update backend with refreshed token
  });
  return () => {
    onMessage();
    onTokenRefresh();
  };
}, []);
```

### Line-by-line explanation
1. ensurePermissions checks whether the app has permission to show notifications, and if not, requests it. This helps handle iOS prompts gracefully.
2. Retrieve and log the token after permission handling; token changes should be surfaced to the backend to maintain delivery.
3. useEffect registers foreground message and token refresh listeners, which are cleaned up on unmount to prevent leaks.
4. Returning cleanup functions ensures the listeners don’t accumulate across navigations or reloads.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1 — Not requesting permission on iOS before receiving notifications
  - Bad:
    ```javascript
    // App.js
    useEffect(() => {
      messaging().getToken().then(t => console.log('Token', t));
    }, []);
    ```
  - Good:
    ```javascript
    // App.js
    useEffect(() => {
      const requestPermission = async () => {
        const status = await messaging().requestPermission();
        if (status === messaging.AuthorizationStatus.AUTHORIZED ||
            status === messaging.AuthorizationStatus.PROVISIONAL) {
          const t = await messaging().getToken();
          console.log('Token after permission:', t);
        }
      };
      requestPermission();
    }, []);
    ```

- Pitfall 2 — Not handling background messages properly
  - Bad (assumes foreground delivery always):
    ```javascript
    // App.js
    useEffect(() => {
      messaging().onMessage(async msg => {
        console.log('Foreground message:', msg);
      });
    }, []);
    ```
  - Good:
    ```javascript
    // index.js
    import messaging from '@react-native-firebase/messaging';
    import notifee from '@notifee/react-native';
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      await notifee.displayNotification({ title: remoteMessage.notification?.title ?? 'BG Notification', body: remoteMessage.notification?.body ?? '' });
    });
    ```

- Pitfall 3 — Ignoring token refresh
  - Bad:
    ```javascript
    // Only fetch token once, never update backend
    useEffect(() => {
      messaging().getToken().then(t => console.log('Token', t));
    }, []);
    ```
  - Good:
    ```javascript
    useEffect(() => {
      const unsubscribe = messaging().onTokenRefresh(token => {
        // update backend with new token
        console.log('Token refreshed:', token);
      });
      return unsubscribe;
    }, []);
    ```

- Pitfall 4 — Using only foreground UI prompts for notifications
  - Bad:
    ```javascript
    // Skip Notifee; just alert
    messaging().onMessage(async remoteMessage => {
      alert(remoteMessage.notification?.body);
    });
    ```
  - Good:
    ```javascript
    // Use Notifee to present a non-blocking native notification
    messaging().onMessage(async remoteMessage => {
      await notifee.displayNotification({
        title: remoteMessage.notification?.title ?? 'Notification',
        body: remoteMessage.notification?.body ?? '',
        android: { channelId: 'default' },
      });
    });
    ```

- Pitfall 5 — Failing to create Android notification channels
  - Bad:
    ```javascript
    // Directly display notification without channel
    await notifee.displayNotification({ title: 'Test', body: 'Hello' });
    ```
  - Good:
    ```javascript
    // Create and use a channel
    notifee.createChannel({ id: 'default', name: 'Default Channel', importance: AndroidImportance.HIGH });
    await notifee.displayNotification({ title: 'Test', body: 'Hello', android: { channelId: 'default' } });
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability and scale: Push messages enable time-sensitive user interactions (order updates, security alerts, reminders). Proper token management and token rotation handling are critical for delivery reliability as devices switch networks or reinstall apps.
- Platform compliance: iOS requires explicit user permission; Android requires proper channel configuration to guarantee consistent notification behavior and visual prominence.
- Back-end integration: Maintain a secure, scalable mapping of device tokens to user accounts, support token refresh, and handle topic subscriptions to enable bulk messaging without per-device lookups.
- User experience: Foreground handling should be non-intrusive, leveraging Notifee for consistent UI/UX, with actionable notifications where appropriate.
- Observability: Implement logging, analytics hooks, and error handling (delivery failures, permission denials, token invalidations) to detect issues early.
- Privacy and security: Do not leak tokens; transmit only necessary payloads; respect user preferences for notification types. Implement server-side throttling and backoff for high-volume blasts.

## Z. Study Questions — 5 recall questions

1. What is the role of FCM in a React Native push notification workflow?
2. Why is creating an Android notification channel important for notifications?
3. How do you handle a notification when the app is in the foreground vs the background?
4. What is the difference between a device token and a topic subscription?
5. How should you manage token refresh events in production?

## Exercise — a practical multi-part coding challenge

Overview: Build a small React Native app with push notification integration using Firebase Messaging and Notifee. The exercise guides you through setup, token handling, foreground/background message rendering, and a simple topic-based messaging flow.

Part 1 — Project setup and native config
- Create a new RN project (or use an existing one) and install dependencies:
  - @react-native-firebase/app
  - @react-native-firebase/messaging
  - @notifee/react-native
- Follow platform-specific steps to configure Firebase (google-services.json for Android, GoogleService-Info.plist for iOS).
- Ensure AndroidManifest.xml and Info.plist contain required configurations (see Section 1).

Part 2 — Token management
- Implement a function to request permissions (iOS) and fetch the FCM token.
- Persist the token to a mock backend endpoint (you can simulate this with a local console log or a fake fetch).

Part 3 — Foreground notification rendering
- Create an Android notification channel named “default” with HIGH importance.
- In foreground message handling, display the notification using Notifee with appropriate title/body and a channelId.

Part 4 — Background and terminated message handling
- Implement setBackgroundMessageHandler in index.js to render a Notifee notification when the app is in background or terminated.
- Validate that background notifications appear using a test message from your Firebase console or a test backend.

Part 5 — Topic-based messaging
- Subscribe the device to a topic (e.g., "promotions") and implement a test flow to send a message to that topic from the Firebase console.
- Extend the frontend to react to topic-based messages with a Notifee notification.

Part 6 — Observability and cleanup
- Add console logging for token refresh events and message receipt.
- Ensure listeners are cleaned up on component unmount to avoid memory leaks.

Note: If you’re using Expo, you’ll adapt this exercise to expo-notifications and the Expo push token flow, but the core concepts—permission handling, token management, and foreground/background handling—remain the same.

If you’d like, I can tailor the exercise to a specific React Native template (bare RN vs. Expo) and provide a ready-to-run Git repository structure with sample backend stubs.