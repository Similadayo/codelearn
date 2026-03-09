# Track: Mobile App Development — Phase 3: Native Device Features — Push Notifications Integration (Swift iOS)

Push notifications are a critical bridge between your app and users, enabling timely engagement, onboarding flows, and re-engagement campaigns. In iOS, integrating Push Notifications means coordinating with Apple Push Notification service (APNs), requesting user permission, handling device tokens securely, and delivering or reacting to remote and local notifications in-app. This lesson equips you with the practical, production-ready patterns used in real-world Swift iOS apps.

---

## 1. Understanding Push Notifications Architecture and Prerequisites

Push notifications rely on APNs to deliver messages to devices. Your server sends payloads to APNs, which then delivers them to the target device using a device token unique to that installation. Before you can receive remote notifications, you must enable Push Notifications in Xcode, ensure your App ID has the Push capability, and handle the device token on the client. This section includes a minimal model for decoding an APNs payload and a sample payload to illuminate the shape of data your app will process.

Code examples:

```swift
// Swift models to illustrate decoding an APNs payload
struct PushNotification: Decodable {
    let aps: APS
    struct APS: Decodable {
        let alert: Alert?
        let badge: Int?
        let sound: String?
        struct Alert: Decodable {
            let title: String?
            let body: String?
        }
    }
}
```

```json
{
  "aps": {
    "alert": {
      "title": "New Message",
      "body": "Hi there! You have a new message."
    },
    "badge": 3,
    "sound": "default"
  },
  "customKey": "customValue"
}
```

### Line-by-line explanation
- Swift block defines a lightweight model to decode an APNs payload from JSON into strongly-typed Swift structures.
- PushNotification contains an inner APS struct representing the aps dictionary.
- The nested Alert struct models the optional title/body of the alert.
- The sample JSON demonstrates typical keys used by APNs: alert (title/body), badge, and sound, plus optional custom data.

---

## 2. Requesting User Permission for Notifications

Before the app can receive remote notifications, you must request the user’s permission to display alerts, sounds, and update the app badge. This section shows how to request authorization and, if granted, register for remote notifications. It also demonstrates setting the UNUserNotificationCenterDelegate so you can respond to notifications while the app is foregrounded.

Code:

```swift
import UIKit
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Request permission to display alerts, play sounds, and badge the app icon
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
            // If granted, register for remote notifications
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
        // Set delegate to handle foreground UI
        UNUserNotificationCenter.current().delegate = self
        return true
    }
}
```

### Line-by-line explanation
- Import UIKit and UserNotifications to access app lifecycle and notification APIs.
- In didFinishLaunchingWithOptions, call requestAuthorization with options for alert, sound, and badge.
- The completion handler captures granted and error; log errors if present.
- If permission is granted, registerForRemoteNotifications is called on the main queue to begin APNs registration.
- Set UNUserNotificationCenter.current().delegate to self so the app can respond to notifications when foregrounded.
- Return true to complete app launch.

---

## 3. Registering for Remote Notifications and Handling Device Token

When APNs assigns a device token, your app receives it in didRegisterForRemoteNotificationsWithDeviceToken. You must convert the binary token to a hex string for server-side registration. This section shows how to capture and print the token, plus a safe error path if registration fails.

Code:

```swift
extension AppDelegate: UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Convert token to hex string
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("Device Token: \(token)")
        // TODO: Send token to your server to register this device for the user
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }
}
```

### Line-by-line explanation
- Implement UIApplicationDelegate extension to receive remote notification registration callbacks.
- didRegisterForRemoteNotificationsWithDeviceToken converts the Data token to a human-readable hex string, which is how many backends store tokens.
- Print the token for debugging; in production, send it securely to your server tied to the user.
- didFailToRegisterForRemoteNotificationsWithError logs registration failures, which helps diagnose provisioning or capability issues.

---

## 4. Handling Notifications: Foreground Delivery and User Responses

iOS apps can receive notifications while in the foreground, in the background, or after the user taps a notification. Implement UNUserNotificationCenterDelegate methods to customize the in-app presentation and to react to user interactions.

Code:

```swift
extension AppDelegate: UNUserNotificationCenterDelegate {
    // Called when a notification is delivered while the app is in the foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show banner, play sound, and update badge even when app is foregrounded
        completionHandler([.banner, .sound, .badge])
    }

    // Called when the user responds to the notification (taps it)
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("User tapped notification: \(userInfo)")
        // Implement navigation or deep-link handling based on userInfo
        completionHandler()
    }
}
```

### Line-by-line explanation
- Conform AppDelegate to UNUserNotificationCenterDelegate to receive foreground and response callbacks.
- willPresent is invoked when a notification arrives while the app is active; you can choose presentation options (banner, sound, badge).
- didReceive handles the user tapping the notification; extract any custom data from userInfo to navigate or update UI accordingly.
- The completion handlers must be called to resume normal flow.

---

## 5. Testing and Local Notifications for Development

Remote push notifications require a server and valid APNs provisioning. For development and testing, scheduling local notifications is a fast way to verify UI behavior, handling, and foreground presentation without backend setup.

Code:

```swift
func scheduleLocalTestNotification() {
    let content = UNMutableNotificationContent()
    content.title = "Test Local Notification"
    content.body = "This is a local notification for testing your setup."
    content.sound = UNNotificationSound.default

    // Trigger after 5 seconds
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
    let request = UNNotificationRequest(identifier: "LocalTestNotification", content: content, trigger: trigger)

    UNUserNotificationCenter.current().add(request) { error in
        if let error = error {
            print("Error scheduling local notification: \(error)")
        } else {
            print("Local test notification scheduled.")
        }
    }
}
```

### Line-by-line explanation
- Create a UNMutableNotificationContent with title, body, and sound to simulate a push payload.
- Use UNTimeIntervalNotificationTrigger to schedule after a short delay for quick testing.
- Build a UNNotificationRequest and add it to UNUserNotificationCenter to queue the local notification.
- The completion block logs success or errors, aiding debugging during development.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Not requesting permission before enabling remote notifications
- Bad:

```swift
// Bad: Attempting to register without requesting permission
UNUserNotificationCenter.current().delegate = self
UIApplication.shared.registerForRemoteNotifications()
```

- Good:

```swift
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    if granted {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}
```

Pitfall 2: Forgetting to set a UNUserNotificationCenterDelegate
- Bad:

```swift
class AppDelegate: UIResponder, UIApplicationDelegate {
    // No UNUserNotificationCenterDelegate conformance
}
```

- Good:

```swift
extension AppDelegate: UNUserNotificationCenterDelegate {
    // Implement willPresent and didReceive as shown earlier
}
```

Pitfall 3: Incorrect device token handling
- Bad:

```swift
// Try to use the raw Data directly or print as a string
let token = String(describing: deviceToken)
print("Device Token: \(token)")
```

- Good:

```swift
let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
let token = tokenParts.joined()
print("Device Token: \(token)")
```

Pitfall 4: Not enabling Push Notifications capability or misconfigured provisioning
- Bad: Relying on code alone; the app will fail to receive remote tokens if the capability or provisioning is missing.
- Good: Enable Push Notifications in Xcode (Capabilities tab) and ensure you use a development or distribution provisioning profile that includes the Push capability; verify via console logs and the APNs token flow.

Note: These pitfalls emphasize the importance of end-to-end setup (capabilities, provisioning, and server-side token management) in addition to client code.

---

## Y. Why This Matters In Real Systems — production context and real usage

- User engagement and retention: Timely, relevant push notifications drive re-entry, onboarding flows, and feature adoption.
- Token lifecycle: Devices tokens can rotate; servers must gracefully handle token updates and de-duplication across users.
- Privacy and consent: Always respect user settings, provide meaningful reasons for notifications, and honor opt-outs quickly.
- Security: Store tokens securely, use TLS for token delivery, and map tokens to user accounts on the server side without leaking user data.
- Performance and reliability: Batch token updates, implement backoff strategies for failures, and monitor delivery metrics (open rates, opt-in rates).
- Testing strategy: Use local notifications for UI/UX testing and a staging APNs environment to test end-to-end delivery before production.

---

## Z. Study Questions — 5 recall questions

1) What is the role of APNs in iOS push notifications?  
2) How do you convert the device token from Data to a string suitable for server storage?  
3) Which UNUserNotificationCenterDelegate method controls how a notification is presented when the app is in the foreground?  
4) Why is it important to handle didRegisterForRemoteNotificationsWithDeviceToken on the client side?  
5) How can you simulate notification delivery during development without a backend?

---

## Exercise — practical multi-part coding challenge

Goal: Build a minimal iOS app (UIKit-based) that wires up push notification permissions, registers for remote notifications, captures the device token, handles foreground notifications, and provides a local test workflow to simulate notification behavior.

Parts:

1) Project setup (no backend required)
- Create a simple single-view app (UIKit).
- Enable Push Notifications capability in Xcode.
- Ensure AppDelegate is set up to request permission and register for remote notifications as described in Sections 2 and 3.

2) Token capture and display
- Add UI (e.g., a label) to display the device token string captured in didRegisterForRemoteNotificationsWithDeviceToken.
- Update the UI on the main thread after token is obtained.

3) Foreground notification handling
- Implement UNUserNotificationCenterDelegate methods to show a banner/sound/badge when a notification arrives while the app is foregrounded.
- Add a test case: when the user taps a button, schedule a local notification that imitates a remote payload (title, body, and badge).

4) Local test button
- Create a button titled “Test Local Notification” that calls scheduleLocalTestNotification() (from Section 5) to verify the UI path.

5) Optional server-side stub
- Create a small Swift function that mocks sending the token to a server (print to console) and demonstrate how you would later incorporate a real network request (URLSession) to associate a device token with a user record.

Deliverables:
- Upload or provide a link to the Xcode project with the described wiring.
- Include the AppDelegate.swift and ViewController.swift files showing the core logic.
- Provide a README explaining how to run the app, how to test permission flow, token capture, and local notification testing.

Tips:
- Test on a real device; the iOS simulator cannot receive APNs.
- Use the local notification flow for rapid iterations before integrating a backend.
- Keep token handling secure and ensure you map tokens to user identities on your server side.

---