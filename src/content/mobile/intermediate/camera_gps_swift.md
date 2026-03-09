# Track: Mobile App Development — Phase 3: Native Device Features — Accessing Camera and Geolocation (Swift iOS)

Compelling introductory paragraph: In native iOS development, accessing device hardware like the camera and location services unlocks powerful app capabilities—from capturing photos to delivering location-aware experiences. Mastery of these features requires understanding runtime permissions, privacy controls, and efficient handling of asynchronous callbacks. This lesson walks you through practical, production-ready patterns for invoking the camera and obtaining geolocation data in Swift, with concrete code and best-practice explanations.

## 1. Accessing the Camera with UIImagePickerController

Swift code example: a UIKit-based view controller that safely requests camera access, presents the camera interface, and handles the captured image or cancellation. Remember to add NSCameraUsageDescription to your Info.plist.

```swift
import UIKit
import AVFoundation

class CameraViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate {

    let imagePicker = UIImagePickerController()

    override func viewDidLoad() {
        super.viewDidLoad()
        imagePicker.delegate = self
        imagePicker.sourceType = .camera
        imagePicker.allowsEditing = true
    }

    func requestCameraAccessAndPresent() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            present(imagePicker, animated: true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted {
                        self.present(self.imagePicker, animated: true)
                    } else {
                        self.showCameraAccessDeniedAlert()
                    }
                }
            }
        case .denied, .restricted:
            showCameraAccessDeniedAlert()
        @unknown default:
            break
        }
    }

    private func showCameraAccessDeniedAlert() {
        let alert = UIAlertController(title: "Camera Access Needed",
                                      message: "Please enable camera access in Settings to take photos.",
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    // MARK: - UIImagePickerControllerDelegate
    func imagePickerController(_ picker: UIImagePickerController,
                               didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        // Prefer edited image if available, else the original
        let image = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
        // Example usage: display or save the image
        if let chosenImage = image {
            // e.g., imageView.image = chosenImage
        }
        picker.dismiss(animated: true)
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}
```

### Line-by-line explanation
- Line 1-3: Import UIKit for UI and AVFoundation for camera permission APIs.
- Line 5: Define a view controller class that conforms to UIImagePickerControllerDelegate and UINavigationControllerDelegate.
- Line 7: Create a UIImagePickerController instance to present the camera UI.
- Line 9-15: In viewDidLoad, configure the image picker to use the camera and enable editing.
- Line 17-31: requestCameraAccessAndPresent checks the current camera authorization status.
  - Line 18: Get current status for video (camera).
  - Line 19-21: If authorized, present the camera UI immediately.
  - Line 22-28: If not determined, request access and present the camera upon grant; otherwise show an alert.
  - Line 29-31: If denied or restricted, show an alert guiding the user to Settings.
- Line 33-46: showCameraAccessDeniedAlert constructs a user-friendly alert with a shortcut to Settings.
- Line 49-59: imagePickerController(_:didFinishPickingMediaWithInfo:) handles the chosen image.
  - Line 50: Prefer editedImage if available, else originalImage.
  - Line 53-55: Placeholder to use or display the image.
  - Line 56: Dismiss the picker.
- Line 61-63: imagePickerControllerDidCancel dismisses on cancel.

Note: Add NSCameraUsageDescription to your Info.plist. If you also want to save to the photo library, you’ll need NSPhotoLibraryUsageDescription. This snippet focuses on capturing via the camera.

## 2. Accessing Geolocation with CLLocationManager

Swift code example: a minimal CLLocationManager-based class that requests location permission, starts updates when authorized, and handles location updates and errors. Remember to add NSLocationWhenInUseUsageDescription (or NSLocationAlwaysAndWhenInUseUsageDescription) to Info.plist.

```swift
import CoreLocation
import UIKit

class LocationViewController: UIViewController, CLLocationManagerDelegate {

    let locationManager = CLLocationManager()
    var lastLocation: CLLocation?

    override func viewDidLoad() {
        super.viewDidLoad()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
    }

    func startLocationUpdatesIfAuthorized() {
        let status = CLLocationManager.authorizationStatus()
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.startUpdatingLocation()
        } else {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    // MARK: - CLLocationManagerDelegate
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.startUpdatingLocation()
        } else if status == .denied || status == .restricted {
            // Optionally present a message to the user
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let loc = locations.last {
            lastLocation = loc
            print("Location: \(loc.coordinate.latitude), \(loc.coordinate.longitude)")
            // For power efficiency, stop updates once you have a fix
            locationManager.stopUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }
}
```

### Line-by-line explanation
- Line 1-2: Import CoreLocation for location services and UIKit for UI context.
- Line 4: Define a view controller that conforms to CLLocationManagerDelegate.
- Line 6: Create a CLLocationManager instance to manage location updates.
- Line 7: Optional storage for the last obtained location.
- Line 9-13: In viewDidLoad, set the delegate, desired accuracy, and request location permission.
- Line 15-22: startLocationUpdatesIfAuthorized checks current authorization and starts updates if allowed; otherwise requests permission.
- Line 25-32: locationManager(_:didChangeAuthorization:) handles changes in authorization status by starting updates if granted.
- Line 34-41: locationManager(_:didUpdateLocations:) processes the most recent location and prints coordinates; stops updates to save battery.
- Line 43-46: locationManager(_:didFailWithError:) logs any errors from the location service.

Info: Always include NSLocationWhenInUseUsageDescription (and optionally NSLocationAlwaysUsageDescription) in Info.plist. Test on a real device for realistic results.

## 3. Integrating Camera and Geolocation in a Single View Controller

Swift code example: a cohesive UIKit controller that performs camera capture and reads the current location, wiring both features together with proper permission handling and user feedback. This is a practical pattern for apps like travel journals, augmented reality utilities, or field data capture.

```swift
import UIKit
import AVFoundation
import CoreLocation

class CameraGeolocationViewController: UIViewController,
                                         UIImagePickerControllerDelegate,
                                         UINavigationControllerDelegate,
                                         CLLocationManagerDelegate {

    // Camera
    private let imagePicker = UIImagePickerController()

    // Location
    private let locationManager = CLLocationManager()
    private(set) var currentLocation: CLLocation?
    private let imageView = UIImageView()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupCamera()
        setupLocation()
    }

    // MARK: - Setup helpers
    private func setupUI() {
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(imageView)

        // Simple layout: image view fills top half
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: view.topAnchor),
            imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            imageView.heightAnchor.constraint(equalTo: view.heightAnchor, multiplier: 0.5)
        ])
        // Add a button to trigger camera
        let captureButton = UIButton(type: .system)
        captureButton.setTitle("Take Photo & Get Location", for: .normal)
        captureButton.addTarget(self, action: #selector(didTapCapture), for: .touchUpInside)
        captureButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(captureButton)
        NSLayoutConstraint.activate([
            captureButton.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 20),
            captureButton.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])
    }

    private func setupCamera() {
        imagePicker.delegate = self
        imagePicker.sourceType = .camera
        imagePicker.allowsEditing = true
    }

    private func setupLocation() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        // Request permission early; can also requestWhenInUse just before usage
        locationManager.requestWhenInUseAuthorization()
    }

    // MARK: - Actions
    @objc private func didTapCapture() {
        // Ensure camera permission before presenting
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            present(imagePicker, animated: true)
            // Start location updates in parallel
            startLocationUpdatesIfAuthorized()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted {
                        self.present(self.imagePicker, animated: true)
                        self.startLocationUpdatesIfAuthorized()
                    } else {
                        self.showCameraAccessDeniedAlert()
                    }
                }
            }
        case .denied, .restricted:
            showCameraAccessDeniedAlert()
        @unknown default:
            break
        }
    }

    // MARK: - Location helpers
    private func startLocationUpdatesIfAuthorized() {
        let status = CLLocationManager.authorizationStatus()
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.startUpdatingLocation()
        } else {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    // MARK: - Delegates
    func imagePickerController(_ picker: UIImagePickerController,
                               didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        let image = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
        if let img = image {
            imageView.image = img
        }
        picker.dismiss(animated: true)
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.startUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let loc = locations.last {
            currentLocation = loc
            print("Current location: \(loc.coordinate.latitude), \(loc.coordinate.longitude)")
            // Optional: stop after first fix to save power
            locationManager.stopUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }

    private func showCameraAccessDeniedAlert() {
        let alert = UIAlertController(title: "Camera Access Needed",
                                      message: "Enable camera access in Settings to capture photos.",
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }
}
```

### Line-by-line explanation
- Lines 1-3: Import UIKit, AVFoundation (camera), and CoreLocation (location).
- Lines 5-9: Define a composite view controller implementing relevant delegates.
- Lines 11-14: Declare UI and service components: imagePicker, locationManager, currentLocation, and an imageView to display the photo.
- Lines 16-21: viewDidLoad wires up UI and services.
- Lines 23-38: setupUI creates a simple UI: an imageView and a capture button; lays out minimal constraints.
- Lines 40-46: setupCamera configures the image picker to use the camera and editing.
- Lines 48-53: setupLocation configures the location manager and requests permission.
- Lines 55-83: didTapCapture handles the user tapping the capture button.
  - Checks camera authorization, presents the camera, and starts location updates on success.
  - If not determined, requests permission and proceeds on grant; otherwise shows an alert.
  - The alert explains how to grant access.
- Lines 85-95: Image picker delegate methods: assigning the captured image to imageView and handling cancel.
- Lines 97-105: locationManager(_:didChangeAuthorization:) starts location updates when granted.
- Lines 107-115: locationManager(_:didUpdateLocations:) stores and prints the latest coordinates; optionally stops updates.
- Lines 117-120: locationManager(_:didFailWithError:) logs errors.
- Lines 122-132: showCameraAccessDeniedAlert helper to guide users to Settings.

Note: This integrated example emphasizes a realistic flow where you request both camera and location permissions up-front, handle asynchronous responses, and present feedback to the user. Ensure both NSCameraUsageDescription and NSLocationWhenInUseUsageDescription are added to Info.plist.

## X. Common Beginner Mistakes

- Bad vs Good: Missing Info.plist keys (privacy usage descriptions)
  - Bad
    ```swift
    // No Info.plist keys
    // Attempting to access camera without describing why in the plist
    AVCaptureDevice.requestAccess(for: .video) { _ in }
    ```
  - Good
    ```xml
    <!-- Info.plist additions -->
    <key>NSCameraUsageDescription</key>
    <string>We need access to your camera to take photos.</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>We need access to your location to tag photos with your current position.</string>
    ```
- Bad vs Good: Not checking permissions before presenting UI
  - Bad
    ```swift
    // Directly presenting the camera without checking authorization
    present(imagePicker, animated: true)
    ```
  - Good
    ```swift
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    if status == .authorized {
        present(imagePicker, animated: true)
    } else {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                if granted { self.present(self.imagePicker, animated: true) }
            }
        }
    }
    ```
- Bad vs Good: Force unwrapping optionals or assuming values exist
  - Bad
    ```swift
    let image = info[.editedImage] as! UIImage
    ```
  - Good
    ```swift
    if let image = info[.editedImage] as? UIImage {
        // use image
    }
    ```
- Bad vs Good: Not stopping location updates to save battery
  - Bad
    ```swift
    locationManager.startUpdatingLocation()
    // Never stops
    ```
  - Good
    ```swift
    locationManager.startUpdatingLocation()
    // In didUpdateLocations, optionally stop after obtaining a fix
    locationManager.stopUpdatingLocation()
    ```
- Bad vs Good: Ignoring authorization changes at runtime
  - Bad
    ```swift
    // Start updates without listening to authorization changes
    locationManager.startUpdatingLocation()
    ```
  - Good
    ```swift
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.startUpdatingLocation()
        }
    }
    ```

## Y. Why This Matters In Real Systems

- Privacy and trust
  - Users grant access to sensitive capabilities (camera, location). Respect their consent, explain usage clearly, and disclose data handling practices.
- Reliability and UX
  - Permissions are asynchronous. Always handle not-determined, denied, and restricted states gracefully with clear guidance and fallback flows.
- Performance and battery life
  - Location updates can drain the battery. Start updates only when needed and stop promptly after acquiring useful data.
- Privacy-preserving data handling
  - Don’t log or transmit raw sensor data unless essential. Provide options to disable or limit feature usage, and offer user-visible privacy controls.
- Production considerations
  - Test on real devices across iOS versions. Simulators may not emulate all hardware features or permissions behavior exactly.
- Accessibility and error handling
  - Provide descriptive error messages and accessible UI for permission prompts. Consider in-app settings links for users who need to adjust permissions.

## Z. Study Questions

1) What Info.plist keys must you include to use the camera and location services, and why are they required?
2) How do you safely check and request camera access before presenting UIImagePickerController?
3) What CLLocationManager delegate method notifies you of permission changes, and how should you respond?
4) How can you minimize battery impact when using location services in a real app?
5) What is the difference between authorizedWhenInUse and authorizedAlways, and when would you use each?

## Exercise

Part A – Build a mini feature: Camera capture with location tagging
- Create a single UIViewController (non-storyboard) that includes:
  - A button labeled "Capture Photo".
  - An image view to display the captured photo.
  - A label to show the current coordinates after location is obtained.
- Implement:
  - Camera access using UIImagePickerController with proper permission handling.
  - Location access using CLLocationManager; acquire the current coordinates after the photo is captured.
  - Save the captured image to the app’s documents directory with a timestamped filename.
  - Display latitude and longitude in the label once location is obtained.
- Requirements and constraints:
  - Include the necessary Info.plist keys: NSCameraUsageDescription and NSLocationWhenInUseUsageDescription.
  - Ensure no crashes due to nil optionals by using safe unwrapping.
  - Provide user feedback for permission denials with a Settings link.
  - Write clean, modular code: separate small helper methods for permission checks, location start/stop, and image saving.
- Deliverables:
  - A runnable Swift file (CameraLocationFeature.swift) suitable for integration into a UIKit-based app.
  - A brief README-style explanation of how the code handles permissions, how it saves images, and how location data is displayed.

End of lesson.