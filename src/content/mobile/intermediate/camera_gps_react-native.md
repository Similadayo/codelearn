# Track: Mobile App Development — Module Phase 3: Native Device Features — Topic: Accessing Camera and Geolocation (React Native)

Accessing device hardware like the camera and location services is a foundational skill for feature-rich mobile apps. Mastery here unlocks capabilities from photo capture and tagging to context-aware services and augmented experiences. This lesson focuses on React Native workflows (Expo-based for simplicity) to demonstrate camera usage, geolocation, and practical patterns for robust, privacy-respecting production apps.

## 1. Accessing the Camera in React Native (Expo)

In this section, you learn how to request camera permissions, render a live camera preview, and capture a photo. We use Expo’s Camera module to simplify native setup.

```javascript
// CameraScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      console.log('Captured photo URI:', photo.uri);
      // You can store or upload the photo.uri as needed
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>No access to camera. Please enable it in settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        ref={cameraRef}
      >
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setType(
                type === Camera.Constants.Type.back
                  ? Camera.Constants.Type.front
                  : Camera.Constants.Type.back
              );
            }}
          >
            <Text style={styles.text}> Flip </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <Text style={styles.text}> Capture </Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1 },
  controls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 20,
  },
  button: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
  },
  text: { color: '#fff', fontSize: 16 },
});
```

### Line-by-line explanation
- import React, { useState, useEffect, useRef } from 'react';: Bring in React hooks for local state, effects, and a ref to the Camera.
- import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';: Basic RN components for UI.
- import { Camera } from 'expo-camera';: Import Expo's camera module.
- useState(null) for hasPermission: Tracks whether camera permission is granted.
- useState(Camera.Constants.Type.back) for type: Keeps track of front/back camera.
- useRef(null) for cameraRef: Holds a reference to the Camera instance to call takePictureAsync.
- useEffect: On mount, request camera permissions asynchronously.
- Camera.requestCameraPermissionsAsync(): Requests permission; status is 'granted' or not.
- takePicture: If cameraRef exists, call takePictureAsync with desired quality; logs the URI for later use.
- Conditional renders: If permission pending, show a loading message; if denied, explain and stop; otherwise show the live camera preview.
- <Camera ... ref={cameraRef}>: Renders the camera view and wires the ref to cameraRef for taking pictures.
- Flip and Capture buttons: UI to switch camera type and trigger photo capture.
- Styles: Basic styling for layout and readability.

## 2. Accessing Geolocation in React Native (Expo)

This section covers requesting location permission and retrieving the device’s current coordinates. We use Expo Location to simplify cross-platform geolocation.

```javascript
// LocationScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';

export default function LocationScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission not granted');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setLocation(loc.coords);
    })();
  }, []);

  return (
    <View style={styles.container}>
      {location ? (
        <Text>Latitude: {location.latitude}, Longitude: {location.longitude}</Text>
      ) : (
        <Text>{errorMsg ?? 'Fetching location...'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

### Line-by-line explanation
- import { useEffect, useState } from 'react';: Manage location state and lifecycle.
- import * as Location from 'expo-location';: Import Expo Location module.
- useEffect(() => { ... }, []): Run once on mount to request permissions and fetch location.
- Location.requestForegroundPermissionsAsync(): Request foreground location permission.
- If status !== 'granted': Update error message and stop further work.
- Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }): Retrieve current location with high accuracy.
- setLocation(loc.coords): Save latitude/longitude to state for rendering.
- Render: If location exists, show latitude/longitude; otherwise show a status message or error.

## 3. Combining Camera and Geolocation: Tagging Photos

Learn how to capture a photo and simultaneously capture the device location, then attach location metadata to the captured image for contextual usage (e.g., photo diary, field data, mapping).

```javascript
// CameraLocationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

export default function CameraLocationScreen() {
  const [hasCameraPerm, setHasCameraPerm] = useState(null);
  const [hasLocationPerm, setHasLocationPerm] = useState(null);
  const [location, setLocation] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const cam = await Camera.requestCameraPermissionsAsync();
      setHasCameraPerm(cam.status === 'granted');

      const loc = await Location.requestForegroundPermissionsAsync();
      setHasLocationPerm(loc.status === 'granted');
    })();
  }, []);

  const fetchLocation = async () => {
    if (hasLocationPerm) {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setLocation(loc.coords);
      return loc.coords;
    }
    return null;
  };

  const captureWithLocation = async () => {
    if (cameraRef.current) {
      // Ensure we have a location before capturing (optional)
      const coords = await fetchLocation();

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      const payload = {
        uri: photo.uri,
        timestamp: Date.now(),
        location: coords, // may be null if location permission not granted
      };
      console.log('Photo captured with metadata:', payload);
      // Persist payload to memory/storage as needed
    }
  };

  if (hasLocationPerm === false || hasCameraPerm === false) {
    return (
      <View style={styles.center}>
        <Text>Camera or Location permission denied.</Text>
      </View>
    );
  }

  if (hasCameraPerm === null || hasLocationPerm === null) {
    return (
      <View style={styles.center}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={Camera.Constants.Type.back} ref={cameraRef}>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.button} onPress={captureWithLocation}>
            <Text style={styles.text}>Capture with Location</Text>
          </TouchableOpacity>
        </View>
      </Camera>
      {location && (
        <Text style={styles.meta}>
          Current Location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1 },
  controls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
  },
  text: { color: '#fff' },
  meta: { position: 'absolute', bottom: 20, left: 20, color: '#fff', backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 6 },
});
```

### Line-by-line explanation
- Import camera and location modules; set up two permission states (camera and location) and a location state to display metadata.
- Request both camera and location permissions in a single useEffect to simplify initial setup.
- fetchLocation(): If location permission is granted, obtain current coords; store them for tagging.
- captureWithLocation(): When the user captures, optionally fetch location coords first, then take a picture. The payload includes uri, timestamp, and location data.
- Rendering: Show a camera preview with a capture button. Display current coordinates if available.
- The payload structure illustrates how you might persist image metadata for later display or processing.

## 4. Common Beginner Mistakes

### Bad vs Good: Permission handling and asynchronous logic

- Pitfall 1: Not requesting permissions or not handling denial
Bad:
```javascript
// CameraScreen.js (bad)
export default function CameraScreen() {
  // no permission request
  return <Camera style={{ flex: 1 }} />;
}
```
Good:
```javascript
// CameraScreen.js (good)
useEffect(() => {
  (async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  })();
}, []);
```

- Pitfall 2: Assuming permissions are granted immediately
Bad:
```javascript
const isReady = true; // assume ready
return (
  <Camera style={{ flex: 1 }} />
);
```
Good:
```javascript
if (hasPermission === null) return <Loading />;
if (hasPermission === false) return <Text>No camera access</Text>;
return <Camera style={{ flex: 1 }} ref={cameraRef} />;
```

- Pitfall 3: Not handling asynchronous photo capture errors
Bad:
```javascript
const takePicture = async () => {
  const photo = await cameraRef.current.takePictureAsync();
  // assume success
};
```
Good:
```javascript
const takePicture = async () => {
  try {
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    // handle photo
  } catch (e) {
    console.error('Photo capture failed', e);
  }
};
```

- Pitfall 4: Ignoring platform differences (iOS vs Android) for permissions and live previews
Bad:
```javascript
// assume same UI across platforms
```
Good:
```javascript
// platform-specific tweaks, e.g., aspect ratios, permission prompts, or camera type defaults
```

- Pitfall 5: Storing large binary data in memory instead of a structured store
Bad:
```javascript
const photos = [];
photos.push(photo.uri); // unstructured
```
Good:
```javascript
const [photos, setPhotos] = useState([]);
const addPhoto = (p) => setPhotos((prev) => [...prev, p]); // store objects with metadata
```

## 5. Why This Matters In Real Systems

- User privacy and consent: Camera and location access are sensitive permissions. Apps should clearly explain why the data is needed, provide UI to revoke access, and respect user choices.
- Performance and battery life: Location requests and camera previews consume power. Use foreground permissions sparingly, request only when needed, and stop listeners when not in use.
- Data integrity and context: Tagging photos with location enhances searchability, audit trails, and context in apps like field services, journalism, or travel journals.
- Error handling and resilience: Production apps must gracefully handle permission denial, hardware unavailability, and intermittent device capability differences.
- Security and storage: If you persist photos and location data, consider encryption, secure storage, and minimized data retention policies.
- Cross-platform considerations: Android and iOS differ in permission flows and feature availability; test on both and handle platform-specific edge cases.

## 6. Study Questions

1) Which Expo module is used to request camera permissions, and what is the typical returned value to check?
2) How do you switch between the front and back cameras in Expo Camera?
3) What permission flow is required before using getCurrentPositionAsync from expo-location?
4) How can you attach location metadata to a photo captured by the camera?
5) Name two common production concerns you should address when combining camera and geolocation features.

## 7. Exercise

Complete this multi-part coding challenge to build a small feature that captures a photo with tagged location and displays a gallery of saved items.

Part A — Build a Camera+Location Capture Screen
- Create a screen that asks for camera and foreground location permissions on mount.
- Render a live camera preview with a Capture button.
- When the user taps Capture, fetch the current location (if permitted) and capture a photo.
- Persist an object with { id, uri, timestamp, location } to a local in-memory array (start with useState; no backend required).

Part B — Display a Simple Gallery with Location Overlay
- Show thumbnails of captured photos in a scrollable view.
- When a photo is tapped, display a modal with the photo, timestamp, and location (if available).
- Ensure the location data is human-friendly (e.g., format lat/long to 5 decimals).

Part C — Basic Persistence (Optional Extension)
- Save the gallery to AsyncStorage so the data persists across app restarts.
- On app load, hydrate the gallery from storage.

Sample scaffolding to adapt (pseudo-structure):

- Create a new screen: CameraLocationGalleryScreen
- State:
  - const [photos, setPhotos] = useState([]);
  - const cameraRef = useRef(null);
- Effects:
  - Request permissions on mount (camera and location)
  - Load saved photos from AsyncStorage (if implementing persistence)
- Handlers:
  - captureWithLocation(): fetch location, capture photo, push { id, uri, timestamp, location } into photos
  - openPhoto(photo): show modal with details
- UI:
  - Camera preview with Capture button
  - Horizontal or grid thumbnail list of captured photos
  - Location display in each detail view
- Data shape example:
  - { id: 'abc123', uri: 'file:///path/to/photo.jpg', timestamp: 1680000000000, location: { latitude: 37.7749, longitude: -122.4194 } }

Deliverable goals:
- A working React Native screen (Expo) demonstrating camera capture, location tagging, and a simple gallery.
- Clear handling of permissions and errors.
- Clean, readable code with comments to explain each part.

End of lesson. If you’d like, I can tailor the examples to your project structure (functional vs class components, TypeScript vs JavaScript, bare RN vs Expo).