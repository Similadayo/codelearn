# Track: Mobile App Development — Phase 5: Publishing & At-Scale

Publishing mobile apps at scale is the culmination of a React Native project. It requires disciplined versioning, robust signing, automated metadata workflows, and reproducible CI/CD that can push builds to both the iOS App Store and Google Play. Mastery here reduces release risks, speeds up time-to-market, and enables safe, auditable rollouts in real production environments.

---

## 1. Publishing Foundations for React Native at Scale

In this section we cover the high-level lifecycle, how iOS and Android publishing differ, and the tooling that makes it repeatable (primarily Fastlane for RN apps). You’ll see a small script that demonstrates cross-platform version bumping, which is a common first automation to adopt before diving into store-specific tasks.

```bash
#!/bin/bash
# scripts/bump_version.sh
# Usage: ./bump_version.sh 1.2.3 456 1.2.3
# Bumps iOS CFBundleShortVersionString and CFBundleVersion (build),
# and Android versionName and versionCode.

set -euo pipefail

IOS_VERSION="$1"      # e.g., 1.2.3
IOS_BUILD="$2"        # e.g., 45
ANDROID_VERSION="$3"   # e.g., 1.2.3
ANDROID_CODE="$4"      # e.g., 45

# 1) iOS: Update Info.plist values
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${IOS_VERSION}" ios/MyApp/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${IOS_BUILD}" ios/MyApp/Info.plist

# 2) Android: Update build.gradle values
sed -i.bak "s/versionName \".*\"/versionName \"${ANDROID_VERSION}\"/" android/app/build.gradle
sed -i.bak "s/versionCode [0-9]*/versionCode ${ANDROID_CODE}/" android/app/build.gradle

echo "Version bump complete:
  iOS ${IOS_VERSION} (${IOS_BUILD}),
  Android ${ANDROID_VERSION} (${ANDROID_CODE})"
```

### Line-by-line explanation
- Shebang and strict mode: ensures the script runs with bash and stops on errors or undefined vars.
- Argument parsing: assigns provided version numbers for iOS and Android.
- iOS plist update: PlistBuddy commands update CFBundleShortVersionString and CFBundleVersion in the Info.plist.
- Android Gradle update: uses sed to replace versionName and versionCode in android/app/build.gradle.
- Final echo: prints the new versions to verify the bump.

---

## 2. iOS App Store Publishing Strategy (Fastlane-Centric)

iOS publishing is tightly regulated by App Store Connect. A robust strategy uses Fastlane to manage signing, builds, metadata, screenshots, and TestFlight distribution, with a repeatable lane that can be invoked from CI/CD.

Code example: Fastlane Fastfile for iOS release and TestFlight

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Release a new iOS version to App Store & TestFlight"
  lane :release_ios do
    # Ensure version/build numbers increment
    increment_version_number  # CFBundleShortVersionString
    increment_build_number      # CFBundleVersion

    # Optional: fetch signing certificates (requires a certificate repo)
    # lane :setup_signing do
    #   match(type: "appstore")
    # end

    # Build the app
    build_app(
      scheme: "MyApp",
      export_method: "app-store"
    )

    # Upload to App Store (production release)
    upload_to_app_store(
      skip_screenshots: false,
      skip_metadata: false,
      skip_app_version_declaration: false
    )

    # Optional: distribute to TestFlight internal testers
    pilot(
      skip_waiting_for_build_processing: true,
      distribute_external: false
    )
  end
end
```

### Line-by-line explanation
- `default_platform(:ios)`: Sets the default platform context to iOS for the lane definitions.
- `lane :release_ios do`: Defines a lane named release_ios to perform the release workflow.
- `increment_version_number`: Bumps CFBundleShortVersionString to the next semantic version.
- `increment_build_number`: Increments CFBundleVersion (the build number).
- `build_app(...)`: Compiles the app using the specified scheme and export method suitable for App Store submission.
- `upload_to_app_store(...)`: Publishes the build to App Store Connect, including metadata and screenshots (as configured in App Store metadata).
- `pilot(...)`: Optional step to upload the build to TestFlight for internal testers; `distribute_external: false` limits to internal testers.

Notes:
- Signing can be centralized with Fastlane Match (not shown) or handled via Apple Developer accounts in CI.
- Store metadata (descriptions, keywords, screenshots) lives in the deliver metadata directory and is consumed by `upload_to_app_store`.

---

## 3. Android Play Publishing Strategy (Fastlane-Centric)

Google Play publishing uses Google Play Console APIs (V3) and releases can flow through internal/alpha/beta/production tracks. Fastlane’s `supply` action drives metadata, screenshots, APK/AAB, and track selection.

Code example: Fastlane Fastfile for Android release

```ruby
# fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Release a new Android version to Google Play"
  lane :release_android do
    # Build the release artifact (AAB recommended)
    gradle(task: "assembleRelease")

    # Upload to Google Play Console
    supply(
      track: "production",
      package_name: " com.example.myapp",
      aab: "android/app/build/outputs/bundles/release/app-release.aab",
      skip_upload_metadata: false,
      skip_upload_images: false,
      skip_upload_screenshots: false
    )
  end
end
```

### Line-by-line explanation
- `default_platform(:android)`: Sets the default platform to Android.
- `lane :release_android do`: Defines a lane to publish to Google Play.
- `gradle(task: "assembleRelease")`: Invokes Gradle to produce the release artifact (AAB recommended).
- `supply(...)`:
  - `track: "production"` selects the Play track to publish to.
  - `package_name`: the Android package identifier for the app.
  - `aab`: path to the Android App Bundle to upload.
  - `skip_upload_*` options: control whether metadata, images, and screenshots get uploaded; set to false to ensure the store listing is updated.

Notes:
- For automated signing, configure Gradle signingConfigs or use Google Play App Signing and provide the appropriate credentials via CI secrets or a service account.
- You can also add lanes for internal/beta tracks (e.g., `track: "internal"`).

---

## 4. End-to-End Cross-Platform CI/CD for Publishing

A production-ready workflow typically runs on a CI server (GitHub Actions, CircleCI, Jenkins). The key is to separate macOS builds (iOS) from Linux/macOS for Android, securely manage credentials, and run distinct lanes for each platform.

Code example: GitHub Actions workflow (two jobs: iOS and Android)

```yaml
name: Publish React Native App

on:
  push:
    branches: [ main ]

jobs:
  ios:
    name: Publish iOS
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Ruby and Bundler
        run: |
          gem update --system
          gem install bundler
          bundle install
      - name: Install dependencies
        run: |
          cd ios && pod install --repo-update && cd ..
      - name: Run iOS Release Lane
        env:
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
        run: |
          bundle exec fastlane ios release_ios

  android:
    name: Publish Android
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Install Fastlane
        run: |
          gem install fastlane
      - name: Run Android Release Lane
        env:
          SUPPLY_SERVICE_ACCOUNT_KEY: ${{ secrets.SUPPLY_SERVICE_ACCOUNT_KEY }}
        run: |
          bundle exec fastlane android release_android
```

### Line-by-line explanation
- Workflow triggers on pushes to main, suitable for protected releases.
- Two separate jobs leverage the appropriate runners: macOS for iOS and Linux for Android.
- iOS job:
  - Checks out code and sets up Ruby environment to run Fastlane.
  - Installs iOS dependencies (CocoaPods) to ensure a valid build environment.
  - Executes the Fastlane lane `ios release_ios`, passing credentials via secrets.
- Android job:
  - Checks out code and sets up Java environment.
  - Installs Fastlane (Ruby gem).
  - Executes the Fastlane lane `android release_android` with credentials, using a service account for Google Play access.

Notes:
- Secrets should be stored in your CI platform (e.g., GitHub Secrets) and consumed as environment variables.
- Consider matrix pipelines for more granular control; add a dry-run option for testing.

---

## 5. Metadata, Localization, and Asset Strategy

Store listings require assets (screenshots, icons), localized descriptions, and compliance metadata (privacy policy, ads disclosures). Automate as much as possible to prevent drift between the app and its store listings.

Code example: metadata.json-like structure for automated upload

```json
{
  "ios": {
    "metadata_path": "metadata/ios/en-US",
    "screenshots_path": "metadata/ios/en-US/screenshots",
    "description": "Your app description in English (US).",
    "keywords": ["react-native", "mobile", "ios", "example"],
    "promo_text": "Promotional text for App Store"
  },
  "android": {
    "metadata_path": "metadata/android/en-US",
    "screenshots_path": "metadata/android/en-US/screenshots",
    "full_description": "Full description for Google Play listing.",
    "short_description": "Short description for Google Play",
    "graphics": {
      "feature_graphic": "feature_graphic.png",
      "promo_graphic": "promo_graphic.png"
    }
  }
}
```

### Line-by-line explanation
- The JSON structure defines per-store metadata directories and assets.
- `ios.metadata_path` and `android.metadata_path` point to store listing content that tools like Fastlane deliver/post upload to the stores.
- Descriptions, keywords, and promo text map to the App Store Connect fields (iOS) and Google Play Store fields (Android).
- `screenshots_path` specifies where your screenshots live for automated ingestion.
- The assets (feature_graphic, promo_graphic) are used to meet store requirements and visual standards.

Best practice notes:
- Localize metadata and assets in parallel with builds to maintain alignment with feature branches.
- Validate assets against store-specific size and format constraints (iOS requires PNG/JPG; Android has size limits and density qualifications).

---

## X. Common Beginner Mistakes

- Bad vs Good: secrets in repos vs secret management in CI
  - Bad:
    # Insecure: keys checked into repo
    FASTLANE_PASSWORD="password123"
  - Good:
    # Use CI secret management; never hard-code
    FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}

- Bad vs Good: signing approach
  - Bad:
    lane :release_ios do
      # assumes development certs are used for releases
      export_method: "development"
      # This will fail for App Store submission
    end
  - Good:
    lane :release_ios do
      # Use App Store distribution certs (via match or similar)
      # and export_method: "app-store"
      build_app(scheme: "MyApp", export_method: "app-store")
      upload_to_app_store
    end

- Bad vs Good: skipping store metadata and localization
  - Bad:
    upload_to_app_store(skip_screenshots: true, skip_metadata: true)
  - Good:
    upload_to_app_store(skip_screenshots: false, skip_metadata: false)
    # Ensure localized metadata is updated for all target locales

- Bad vs Good: manual, ad-hoc releases
  - Bad:
    manual steps in docs
  - Good:
    a single source of truth: a Fastlane pipeline with CI triggers, versioning policy, and rollback checks.

- Bad vs Good: inconsistent versioning
  - Bad:
    Android versionName and iOS CFBundleShortVersionString drift between branches
  - Good:
    automatic version bump and synchronized lane that updates both platforms in lockstep.

---

## Y. Why This Matters In Real Systems

- Reproducible builds: CI/CD ensures the exact same process, tooling, and environment every release.
- Security and compliance: Secrets management, code signing, and audit trails protect against tampering and leaks.
- Rollback capabilities: Track-based releases and precise metadata allow swift rollbacks if a store rejection or critical bug occurs.
- Observability: Build status, test results, and artifact storage (IPAs, AABs) give teams visibility into release health.
- Localization consistency: Automated metadata pipelines prevent language drift and ensure store listings reflect new features.

Practical implications:
- You will run builds on macOS runners for iOS and separate runners for Android; automation reduces human error and speeds up response times during incidents.
- A well-structured Fastlane setup makes it feasible to onboard new engineers, QA, or CI/CD contributors without sacrificing quality or control.

---

## Z. Study Questions

1. What are the primary Fastlane actions used to publish iOS apps to the App Store and TestFlight?
2. How does the Google Play `supply` action differ from the iOS `upload_to_app_store` action in terms of what it uploads?
3. Why is it important to manage signing certificates with a tool like Match when publishing iOS apps?
4. Describe how you would set up CI to publish to both stores in a single workflow. What are the main separation points?
5. What types of store metadata should be automated, and how can localization be integrated into the pipeline?

---

## Exercise

Part A — Create a minimal cross-platform Fastlane setup

- Create a Fastlane folder structure for an RN app named "MyApp".
- Write a Fastfile with two lanes: `ios_release` and `android_release` as shown in the examples above.
- Create an Appfile that sets the bundle identifiers and account details (use placeholders).
- Add a basic version bump script (as in Section 1) and wire it into the lanes so version numbers are bumped before builds.

Part B — Build a simple CI/CD pipeline skeleton

- Create a GitHub Actions workflow file that triggers on pushes to main and runs:
  - iOS: `fastlane ios release_ios` on macOS runner
  - Android: `fastlane android release_android` on Linux runner
- Configure secrets for:
  - FASTLANE_PASSWORD (iOS)
  - SUPPLY_SERVICE_ACCOUNT_KEY or Google credentials (Android)
- Include a step to install dependencies (Ruby gems, Android build tools, etc.).

Part C — Metadata automation scaffolding

- Create a metadata directory structure for iOS and Android as shown in Section 5.
- Provide a simple script or a small README that explains how to add localized descriptions and screenshots, and how a CI job would pick up and upload these assets.

Deliverables:
- Fastlane/Fastfile with ios_release and android_release lanes
- Fastlane/Appfile with placeholders
- scripts/bump_version.sh (adapted to your project)
- .github/workflows/publish.yml (basic CI skeleton)
- metadata/ios/en-US and metadata/android/en-US directories with sample text or JSON

This exercise reinforces cross-platform automation, secure credential handling, and a reproducible publishing workflow—key competencies for Phase 5: Publishing & At-Scale.