# Track: Mobile App Development - Phase 3: Native Device Features - Accessing Camera and Geolocation (Kotlin Android)

Accessing native device features like the camera and geolocation is a core skill for building rich mobile apps. This lesson covers practical, production-ready patterns for using CameraX to preview and capture photos and Google's Fused Location Provider to obtain accurate geolocation. You’ll learn how to request runtime permissions, bind camera use cases to the lifecycle, handle location updates, and consider real-world concerns like performance, privacy, and lifecycle safety.

## 1. Camera Access with CameraX

CameraX provides a consistent, easy-to-use API for camera features across Android devices. This section demonstrates setting up a simple camera preview and capturing a photo using CameraX, including required manifest entries and Gradle dependencies.

```kotlin
// CameraXActivity.kt
package com.example.camera

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraXActivity : AppCompatActivity() {

    private lateinit var viewFinder: PreviewView
    private var imageCapture: ImageCapture? = null
    private lateinit var cameraExecutor: ExecutorService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)

        viewFinder = findViewById(R.id.viewFinder)

        // Request camera permission if not granted
        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS
            )
        }

        // Initialize the background executor
        cameraExecutor = Executors.newSingleThreadExecutor()

        // Example: Set up a capture button listener
        // findViewById<Button>(R.id.btnCapture).setOnClickListener { takePhoto() }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = androidx.camera.core.Preview.Builder().build().also {
                it.setSurfaceProvider(viewFinder.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder().build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageCapture
                )
            } catch (exc: Exception) {
                Log.e(TAG, "Use case binding failed", exc)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    // Call this to capture a photo (hook up to a UI button)
    private fun takePhoto() {
        val imageCapture = imageCapture ?: return

        val photoFile = File(externalMediaDirs.first(), "${System.currentTimeMillis()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions, ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val savedUri: Uri? = output.savedUri ?: Uri.fromFile(photoFile)
                    Toast.makeText(
                        this@CameraXActivity,
                        "Photo saved: $savedUri",
                        Toast.LENGTH_SHORT
                    ).show()
                    Log.d(TAG, "Photo saved: $savedUri")
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e(TAG, "Photo capture failed: ${exception.message}", exception)
                }
            }
        )
    }

    private fun allPermissionsGranted(): Boolean {
        return REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                startCamera()
            } else {
                Toast.makeText(
                    this,
                    "Permissions not granted by the user.",
                    Toast.LENGTH_SHORT
                ).show()
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    companion object {
        private const val TAG = "CameraXApp"
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }
}
```

```xml
<!-- activity_camera.xml -->
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".CameraXActivity">

    <androidx.camera.view.PreviewView
        android:id="@+id/viewFinder"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_margin="8dp"
        android:layout_marginStart="8dp"
        android:layout_marginEnd="8dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toTopOf="@+id/btnCapture"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <!-- Example capture button (hook up in code) -->
    <Button
        android:id="@+id/btnCapture"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:text="Capture"
        app:layout_constraintTop_toBottomOf="@id/viewFinder"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_margin="16dp" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

```xml
<!-- AndroidManifest.xml (partial) -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.camera">

    <uses-permission android:name="android.permission.CAMERA" />

    <application
        ... >
        <activity android:name=".CameraXActivity" />
    </application>
</manifest>
```

```gradle
// build.gradle (module: app) dependencies (snippets)
dependencies {
    implementation "androidx.camera:camera-camera2:1.1.0"
    implementation "androidx.camera:camera-lifecycle:1.1.0"
    implementation "androidx.camera:camera-view:1.1.0"

    // Location (for Geolocation in Section 2)
    implementation "com.google.android.gms:play-services-location:21.0.1"
}
```

### Line-by-line explanation breaking down each line

- CameraXActivity class declaration: sets up an Activity dedicated to CameraX usage.
- viewFinder declaration: stores a reference to the PreviewView in the layout for live camera preview.
- imageCapture nullable: holds the ImageCapture use case instance for taking photos.
- onCreate: standard entry point; inflates layout and prepares permissions.
- allPermissionsGranted(): helper to verify CAMERA permission presence.
- startCamera(): obtains a camera provider, creates a Preview and ImageCapture use cases, and binds them to the lifecycle with a back camera selector.
- Preview setup: connects the Preview to the PreviewView surface provider so the camera preview renders on screen.
- ImageCapture.Builder(): configures the capture use case with sane defaults.
- cameraProvider.bindToLifecycle(...): attaches use cases to this Activity’s lifecycle; ensures proper resource handling.
- takePhoto(): triggers a photo capture via ImageCapture and writes to a file; on success, shows a toast and logs the saved URI.
- OnImageSavedCallback: handles success by retrieving the saved URI and errors by logging.
- onRequestPermissionsResult(): handles the user’s permission decision; if granted, starts the camera, otherwise shows a message and exits.
- onDestroy(): shuts down the background executor to release resources.
- Companion object: stores permission constants to keep the code clean and easily adjustable.

---

## 2. Geolocation with Fused Location Provider

Geolocation with the Fused Location Provider (FLP) is the recommended way to obtain device location efficiently and accurately. This section demonstrates requesting location permission, obtaining the last known location, and starting ongoing location updates.

```kotlin
// LocationActivity.kt
package com.example.location

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*

class LocationActivity : AppCompatActivity() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_location)

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED) {
            getLastLocation()
            startLocationUpdates()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_PERMISSION_REQUEST_CODE
            )
        }
    }

    private fun getLastLocation() {
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (location != null) {
                    Log.d(TAG, "Last known location: ${location.latitude}, ${location.longitude}")
                } else {
                    Log.d(TAG, "Last location is null; requesting updates.")
                }
            }
            .addOnFailureListener { e -> Log.e(TAG, "Failed to get location", e) }
    }

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
            .setWaitForLocationSync(false)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    Log.d(TAG, "New location: ${location.latitude}, ${location.longitude}")
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            mainLooper
        )
    }

    override fun onPause() {
        super.onPause()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE &&
            grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        ) {
            getLastLocation()
            startLocationUpdates()
        } else {
            Log.w(TAG, "Location permission denied by user.")
        }
    }

    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 100
        private const val TAG = "LocationDemo"
    }
}
```

```xml
<!-- activity_location.xml (layout placeholder) -->
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent" >
    <!-- UI elements can go here (e.g., status TextView) -->
</FrameLayout>
```

```xml
<!-- AndroidManifest.xml (permission) -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.location">

    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <application
        ... >
        <activity android:name=".LocationActivity" />
    </application>
</manifest>
```

```gradle
// build.gradle (module: app) dependencies (snippets)
dependencies {
    // Location (FLP)
    implementation "com.google.android.gms:play-services-location:21.0.1"
}
```

### Line-by-line explanation breaking down each line

- LocationActivity class: central hub for obtaining and listening to location updates.
- fusedLocationClient: FLP client used to request location data.
- onCreate: initializes FLP client and checks for location permission.
- getLastLocation(): fetches the most recent known location; fast path for immediate data.
- addOnSuccessListener: handles the non-null location and logs coordinates.
- addOnFailureListener: captures errors (e.g., due to missing settings or permissions).
- startLocationUpdates(): sets up a LocationRequest for periodic updates and defines a LocationCallback to process new locations.
- LocationRequest.Builder with PRIORITY_HIGH_ACCURACY and 10-second interval: balances accuracy with battery usage for typical apps.
- onLocationResult(): processes each update by logging coordinates; can be extended to update UI or send to a server.
- onPause(): stops location updates as a lifecycle-aware measure to conserve battery.
- onRequestPermissionsResult(): grants access to location data only after user consent; re-tries data retrieval when granted.
- Companion object: defines permission request code and a log tag.

---

## 3. Handling Permissions and Lifecycle (Best Practices)

Permissions and lifecycle handling are critical in mobile apps to avoid crashes, leaks, and poor UX. This section consolidates best practices for both camera and location permissions and lifecycle-aware use of system resources.

```kotlin
// PermissionsLifecycleHelper.kt
package com.example.core

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class PermissionsLifecycleHelper(private val activity: ComponentActivity) {

    fun ensureCameraPermission(onGranted: () -> Unit) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED) {
            onGranted()
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_REQUEST_CODE
            )
        }
    }

    fun ensureLocationPermission(onGranted: () -> Unit) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED) {
            onGranted()
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_PERMISSION_REQUEST_CODE
            )
        }
    }

    companion object {
        const val CAMERA_PERMISSION_REQUEST_CODE = 101
        const val LOCATION_PERMISSION_REQUEST_CODE = 102
    }
}
```

```kotlin
// Example usage in an Activity (partial)
class CombinedActivity : AppCompatActivity() {

    private val permissionsHelper = PermissionsLifecycleHelper(this)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_combined)

        permissionsHelper.ensureCameraPermission {
            // Initialize CameraX
            // cameraXActivity.startCamera() or equivalent
        }

        permissionsHelper.ensureLocationPermission {
            // Initialize location updates
            // locationActivity.startLocationUpdates() or equivalent
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        // Forward to a centralized handler if you have one
        // You can map requestCode to respective handlers here
    }
}
```

### Line-by-line explanation breaking down each line

- PermissionsLifecycleHelper: a small helper to centralize permission logic for camera and location.
- ensureCameraPermission/ensureLocationPermission: check for permission and either proceed or request it.
- CAMERA_PERMISSION_REQUEST_CODE / LOCATION_PERMISSION_REQUEST_CODE: distinguish which permission request is completing in onRequestPermissionsResult.
- Example usage shows how a combined screen can coordinate camera and location permissions without duplicating permission logic.
- onRequestPermissionsResult in the activity would need to route responses to the appropriate handlers or re-check permissions and initialize components accordingly.

---

## X. Common Beginner Mistakes

1) Not requesting runtime permissions or not handling the user’s denial
Bad:
```kotlin
// Bad: assumes permission granted
startCamera() // may crash if permission isn't granted
```
Good:
```kotlin
// Good: explicit permission check
if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
    startCamera()
} else {
    ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), REQUEST_CODE)
}
```

2) Accessing location data without null-safety or handling permission result
Bad:
```kotlin
val location = fusedLocationClient.lastLocation.await()
Log.d("Location", "${location.latitude}, ${location.longitude}")
```
Good:
```kotlin
fusedLocationClient.lastLocation.addOnSuccessListener { location ->
    location?.let {
        Log.d("Location", "${it.latitude}, ${it.longitude}")
    } ?: run {
        Log.d("Location", "Location is null")
    }
}
```

3) Not binding CameraX use cases to the lifecycle or not unbinding
Bad:
```kotlin
// Just create a Preview and ImageCapture, but never bind or unbind
val preview = Preview.Builder().build()
val imageCapture = ImageCapture.Builder().build()
```
Good:
```kotlin
val cameraProvider = cameraProviderFuture.get()
cameraProvider.unbindAll()
cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
```

4) Running long-running camera or location tasks on the main thread
Bad:
```kotlin
fun captureAndProcess() {
    val bitmap = viewFinder.bitmap // heavy work could block UI
    process(bitmap)
}
```
Good:
```kotlin
executor.execute {
    val bitmap = viewFinder.bitmap
    // heavy processing off the main thread
    process(bitmap)
}
```

5) Not handling device differences and device rotation edge cases
Bad:
```kotlin
viewFinder.surfaceProvider = someStaticSurface // ignores rotation and layout changes
```
Good:
```kotlin
// Bind to lifecycle and let CameraX handle rotation changes; respond to layout changes if necessary
cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
```

---

## Y. Why This Matters In Real Systems

- User experience: Camera and location features directly affect onboarding, feature discovery, and app usefulness. Smooth previews, fast photo capture, and timely location updates create a polished product.
- Privacy and compliance: Explicit runtime permissions and transparent messaging about why data is needed (camera and location) build trust and reduce user churn.
- Performance and battery life: Camera and location APIs are power-hungry. Proper lifecycle binding, avoiding continuous location updates when not needed, and using balanced location accuracy help extend device battery life.
- Reliability across devices: CameraX abstracts hardware quirks and API differences across devices, increasing compatibility and reducing crashes due to device fragmentation.
- Security and data handling: Saving photos securely (proper storage locations, future-proofing against scoped storage changes) and sanitizing location data before transmission are essential for production-grade apps.

Practical real-world patterns you’ve learned:
- Runtime permissions with graceful fallbacks.
- CameraX lifecycle binding for robust resource management.
- FLP with high-accuracy settings for appropriate geolocation behavior.
- Modular permission handling to reuse logic across features.
- Basic error handling and user feedback to improve UX during permission denial or hardware errors.

---

## Z. Study Questions

1) What library provides a consistent camera API across devices in Android, and what are its core use cases shown here?  
2) Which permission is mandatory to access the camera, and how should you request it in an Activity?  
3) How does CameraX help with lifecycle management, and why is bindToLifecycle important?  
4) What is the recommended Google API for geolocation in Android apps, and what permission does it require?  
5) Name two common runtime permission mistakes and one mitigation strategy.

---

## Exercise

Goal: Build a small, production-like screen that shows a live camera preview, can capture a photo, and fetches and logs the current location when a photo is captured.

Part A – Project Setup
- Create a new Android Studio project with Kotlin support.
- Add dependencies for CameraX (camera-camera2, camera-lifecycle, camera-view) and Google Play Services Location.
- Add necessary permissions to the manifest:
  - CAMERA
  - ACCESS_FINE_LOCATION
- Create two activities: CameraXActivity (for camera) and LocationActivity (for location) or combine them into a single screen if you prefer.

Part B – Camera Preview and Capture
- Implement a CameraX-based preview similar to Section 1.
- Add a capture button that saves the photo to external storage and shows a toast with the save location.

Part C – Location Fetch on Capture
- Implement location permission handling as shown in Section 2.
- When the photo is captured, fetch the current location (last known or a short update) and log coordinates, or attach coordinates to the photo metadata if you want to extend.

Part D – Lifecycle and Permissions polish
- Ensure permissions are requested and handled gracefully.
- Bind CameraX use cases to the Activity lifecycle.
- Stop location updates in onPause/onStop and resume in onResume as appropriate.

Part E – Optional Extensions
- Save the location alongside the photo in a sidecar file (e.g., a .json with path and coordinates).
- Display the current location on-screen in the camera view.

Submission checklist:
- Provide the CameraXActivity with a working camera preview and capture flow.
- Provide the LocationActivity or integrated location logic that fetches coordinates with proper permissions.
- Include a short README with steps to run the app, permissions flow, and a note about privacy considerations.

This completes a compact, production-aware lesson on accessing Camera and Geolocation in Kotlin Android, with practical code samples, explanations, pitfalls, real-world implications, and hands-on exercise.