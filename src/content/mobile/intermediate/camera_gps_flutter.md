# Track: Mobile App Development — Phase 3: Native Device Features

In Phase 3, you’ll deepen your Flutter skills by integrating native device features such as the camera and geolocation. This lesson focuses on practical, production-friendly patterns: permission handling, proper lifecycle management of controllers, error handling, and clean UI integration. Mastery here reduces friction when building feature-rich mobile apps used in real-world scenarios.

## 1. Accessing the Camera

This section covers how to initialize the camera, render a live preview, and capture a photo. You’ll learn the typical Flutter + camera plugin workflow, including handling controller lifecycle and saving images to the app’s local storage.

```dart
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:path/path.dart' as path;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final cameras = await availableCameras();
  final firstCamera = cameras.first;
  runApp(CameraApp(camera: firstCamera));
}

class CameraApp extends StatelessWidget {
  final CameraDescription camera;
  const CameraApp({required this.camera});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: CameraHome(camera: camera),
    );
  }
}

class CameraHome extends StatefulWidget {
  final CameraDescription camera;
  const CameraHome({required this.camera});

  @override
  _CameraHomeState createState() => _CameraHomeState();
}

class _CameraHomeState extends State<CameraHome> {
  late CameraController _controller;
  late Future<void> _initializeControllerFuture;

  @override
  void initState() {
    super.initState();
    _controller = CameraController(widget.camera, ResolutionPreset.medium);
    _initializeControllerFuture = _controller.initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _takePicture() async {
    await _initializeControllerFuture;
    final XFile file = await _controller.takePicture();
    final directory = await getApplicationDocumentsDirectory();
    final String filePath = path.join(directory.path, '${DateTime.now()}.png');
    await file.saveTo(filePath);
    // You can now use filePath (e.g., display thumbnail, upload, etc.)
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Camera')),
      body: FutureBuilder<void>(
        future: _initializeControllerFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.done) {
            return CameraPreview(_controller);
          } else {
            return const Center(child: CircularProgressIndicator());
          }
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _takePicture,
        tooltip: 'Capture',
        child: Icon(Icons.camera_alt),
      ),
    );
  }
}
```

Notes:
- This example uses the camera plugin to enumerate cameras, initialize a controller, and render a live preview.
- Captured images are saved to the app's documents directory.
- AndroidManifest.xml and Info.plist require explicit permission usage descriptions for camera access.

Permissions and platform setup (summary):
- Android: add uses-permission for CAMERA in AndroidManifest.xml.
- iOS: add NSCameraUsageDescription in Info.plist.
- For saving images, using getApplicationDocumentsDirectory avoids external storage permissions on modern Android.

### Line-by-line explanation
- import statements: bring in Flutter UI, camera plugin, and file system helpers.
- main(): initializes Flutter bindings and obtains the available cameras, selecting the first one to pass to the app.
- CameraApp: a lightweight app wrapper that receives a CameraDescription and builds the home screen.
- CameraHome: a stateful widget that holds the camera controller and its initialization future.
- initState(): constructs a CameraController with the chosen camera and a resolution, then starts initialization.
- dispose(): releases the camera when the widget is removed.
- _takePicture(): waits for initialization, captures a picture, grabs the app’s documents directory, builds a file path, and saves the image.
- build(): renders a scaffold with an AppBar, a body that shows a live CameraPreview once initialized (or a loading indicator), and a FAB to capture images.
- CameraPreview(_controller): renders the live camera feed.
- getApplicationDocumentsDirectory(): provides a safe, app-scoped path for saving media.

## 2. Accessing Geolocation

This section shows how to determine the user’s location with proper permission handling, including checks for location services being enabled and handling denied permissions. You’ll see a minimal UI that triggers a location fetch and displays the results.

```dart
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class LocationDemo extends StatefulWidget {
  @override
  _LocationDemoState createState() => _LocationDemoState();
}

class _LocationDemoState extends State<LocationDemo> {
  Position? _position;
  String? _error;

  Future<void> _fetchPosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _error = 'Location services are disabled.';
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _error = 'Location permissions are denied';
          });
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _error = 'Location permissions are permanently denied.';
        });
        return;
      }

      final Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);
      setState(() {
        _position = position;
        _error = null;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Geolocation')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ElevatedButton(
              onPressed: _fetchPosition,
              child: Text('Get Current Location'),
            ),
            const SizedBox(height: 20),
            if (_position != null)
              Text('Lat: ${_position!.latitude}, Lng: ${_position!.longitude}'),
            if (_error != null)
              Text('Error: $_error', style: TextStyle(color: Colors.red)),
          ],
        ),
      ),
    );
  }
}
```

Notes:
- Geolocator is used to check service availability, request permissions, and fetch the current position.
- Permission handling is explicit to cover common failure modes.
- Platform-specific permissions: AndroidManifest.xml requires ACCESS_FINE_LOCATION/ACCESS_COARSE_LOCATION; iOS Info.plist requires NSLocationWhenInUseUsageDescription.

### Line-by-line explanation
- import statements: bring in Flutter UI, Geolocator for location, and permission_handler (optional for pre-permission prompts).
- LocationDemo: a stateful widget to hold location state.
- _LocationDemoState: stores the current Position and potential error text.
- _fetchPosition(): primary function to determine service availability, handle permissions, and fetch location.
  - isLocationServiceEnabled(): checks if location services are enabled.
  - checkPermission(): determines current permission state.
  - requestPermission(): prompts the user for location access if denied.
  - getCurrentPosition(): fetches the location with high accuracy.
  - setState(): updates UI accordingly or shows error messages.
- build(): defines a simple UI with a button to trigger location fetch and text blocks to display results or errors.

## X. Common Beginner Mistakes

### Pitfall 1: Not handling permissions properly (camera or location)
Bad:
```dart
// Bad: directly access the feature without requesting permissions
final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
```
Good:
```dart
LocationPermission permission = await Geolocator.checkPermission();
if (permission == LocationPermission.denied) {
  permission = await Geolocator.requestPermission();
}
if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
  throw Exception('Location permission not granted');
}
final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
```

### Pitfall 2: Initializing and using the camera controller before it's ready
Bad:
```dart
// Bad: render preview while controller is still initializing
return CameraPreview(_controller);
```
Good:
```dart
return FutureBuilder<void>(
  future: _initializeControllerFuture,
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.done) {
      return CameraPreview(_controller);
    } else {
      return Center(child: CircularProgressIndicator());
    }
  },
);
```

### Pitfall 3: Not disposing resources (camera, location streams) properly
Bad:
```dart
class _CameraHomeState extends State<CameraHome> {
  // no dispose override
}
```
Good:
```dart
@override
void dispose() {
  _controller.dispose();
  super.dispose();
}
```

### Pitfall 4: Assuming permissions are granted indefinitely
Bad:
```dart
// Bad: never re-check permissions after user changes
final position = await Geolocator.getCurrentPosition();
```
Good:
```dart
// Good: re-check or prompt again when appropriate (e.g., on resume)
Future<void> _ensurePermissionsAndFetch() async {
  LocationPermission perm = await Geolocator.checkPermission();
  if (perm == LocationPermission.denied) {
    perm = await Geolocator.requestPermission();
  }
  if (perm == LocationPermission.deniedForever) {
    // handle gracefully
    return;
  }
  final position = await Geolocator.getCurrentPosition();
}
```

### Pitfall 5: Saving media without a stable path or permissions
Bad:
```dart
final path = '/external/storage/image.png'; // may fail on many devices
File(path).writeAsBytesSync(bytes);
```
Good:
```dart
final directory = await getApplicationDocumentsDirectory();
final filePath = path.join(directory.path, 'capture.png');
await file.writeAsBytes(bytes);
```

## Y. Why This Matters In Real Systems

- User experience: Photos and location are often core to features like field data capture, travel apps, or AR experiences. A smooth flow with clear permission prompts reduces friction and abandonment.
- Privacy and security: Always request explicit permissions, explain why you need them, and gracefully handle denials. Avoid silently accessing hardware.
- Reliability: Initialize hardware resources only once and dispose them correctly to prevent leaks and crashes. Use FutureBuilder or similar patterns to reflect actual readiness in the UI.
- Platform differences: Android and iOS have distinct permission models and lifecycle quirks. Testing on both platforms is essential; provide platform-specific manifest/Plist entries and test denial flows.
- Performance: Camera and location services can be power-hungry. Debounce location fetches, avoid continuous camera previews when not needed, and handle errors gracefully to protect battery life.
- Testing and observability: Add logs around permission outcomes and camera/Geolocator calls. Consider using mocks for unit tests and integration tests to simulate permissions being granted or denied.

## Z. Study Questions

1) Which Flutter plugin is commonly used to access the device camera?  
2) How do you request and handle location permissions in a Flutter app using Geolocator?  
3) Where should you save captured photos to avoid requiring external storage permissions on Android?  
4) What is the purpose of awaiting the camera controller’s initialize() before displaying the preview?  
5) What platform-specific configurations are typically required to enable camera access on Android and iOS?

## Exercise

Part A — Build a minimal app that combines camera preview and geolocation:
- Create a Flutter app with dependencies: camera, geolocator, path_provider, and permission_handler (optional).
- Display a live camera preview on the screen.
- Add a button to fetch and display current latitude and longitude below the preview.
- Ensure robust permission handling for both camera and location.
Deliverables: A single runnable Flutter app (main.dart or modularized as needed) that demonstrates camera preview and live location retrieval with proper lifecycle and error handling.

Part B — Persist captures with location metadata:
- Extend the app so that pressing a “Capture” button saves the photo to the app’s documents directory and appends a JSON entry to a local file (e.g., captures.json) with fields: timestamp, imagePath, latitude, longitude.
- Create a simple UI panel listing the last 5 captures (image thumbnails and coordinates).
- Add basic error handling for file I/O and permission denials.

Part C — Improve UX and robustness:
- Show toast/snackbar notifications for success/failure of capture and save operations.
- Handle permission changes while the app is in the foreground (e.g., user revokes permission).
- Add basic unit tests or widget tests for permission flow and camera initialization paths (where feasible).

Guidance:
- Start with a clean Flutter project and incrementally integrate the camera and geolocation functionality.
- Keep sensitive data local (image files and location data) and handle failures gracefully with user-friendly messages.
- Document platform-specific setup in README.md (AndroidManifest.xml, Info.plist adjustments) and any caveats observed during testing.

This completes a practical, production-minded lesson on accessing native camera and geolocation features in Flutter, aligned with Phase 3 objectives and ready for hands-on coding and extension.