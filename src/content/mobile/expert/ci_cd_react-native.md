# Mobile CI/CD for React Native: Phase 5 — Publishing & At-Scale

In Phase 5, you shift from building apps to reliably publishing them at scale. This module covers Mobile CI/CD using Fastlane and Bitrise in a React Native ecosystem. You’ll learn to automate code signing, builds, tests, and releases for both iOS and Android, orchestrated through Fastlane lanes and Bitrise workflows. Mastery here translates to faster release cycles, consistent builds, and safer, auditable deploys across teams.

## 1. Fastlane fundamentals for React Native

Fastlane is a powerful automation tool for mobile app releases. For React Native, you typically configure lanes that perform signing, building, testing, and deployment for both iOS and Android. A well-structured Fastlane setup reduces manual steps, avoids human error, and ensures reproducible builds in CI environments.

```ruby
# Fastfile (iOS and Android lanes for a React Native project)
default_platform(:ios)

platform :ios do
  desc "Submit a new beta build to TestFlight"
  lane :beta do
    # Obtain signing certificates and provisioning profiles from a central source
    # Requires: cocoapod-managed signing via match
    match(type: "appstore")

    # Build iOS app
    gym(
      workspace: "ios/MyApp.xcworkspace",
      scheme: "MyApp",
      clean: true,
      export_method: "app-store",
      xcargs: "-quiet"
    )

    # Upload the build to TestFlight
    pilot
  end

  desc "Release to the App Store"
  lane :release do
    match(type: "appstore")
    gym(
      workspace: "ios/MyApp.xcworkspace",
      scheme: "MyApp",
      clean: true,
      export_method: "app-store"
    )
    deliver
  end
end

platform :android do
  desc "Beta: publish to Google Play internal track"
  lane :beta do
    # Builds a release APK or AAB
    gradle(task: "assembleRelease")

    # Upload to Google Play internal track
    upload_to_play_store(
      track: "internal",
      skip_upload_in_chunks: true
    )
  end

  desc "Release to Google Play"
  lane :release do
    gradle(task: "assembleRelease")
    upload_to_play_store(track: "production")
  end
end
```

### Line-by-line explanation
- default_platform(:ios): Sets the default platform context to iOS so the file starts in the iOS domain.
- platform :ios do ... end: Defines an iOS-specific lane block.
- lane :beta do ... end: A lane for beta distribution (TestFlight).
- match(type: "appstore"): Fetches Apple signing certificates and provisioning profiles from a central store.
- gym(...): Builds the iOS app using the provided workspace, scheme, and export method.
- pilot: Uploads the built IPA to TestFlight.
- deliver: Publishes a release to the App Store.
- platform :android do ... end: Defines an Android-specific lane block.
- gradle(task: "assembleRelease"): Invokes Gradle to produce a release APK/AAB.
- upload_to_play_store(...): Uploads the artifact to Google Play Console, selecting the target track (internal/production).

## 2. Bitrise configuration and integration with Fastlane

Bitrise is a CI/CD platform that helps automate mobile builds. A bitrise.yml defines workflows that wire together steps like code checkout, dependency installation, signing, and running Fastlane lanes. This example shows a minimal, practical setup to trigger iOS and Android beta lanes via Fastlane in a single workflow.

```yaml
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: react-native

workflows:
  publish:
    steps:
      - git-clone: {}
      - cache: {}
      - node-install:
          inputs:
            node_version: '18.x'
      - yarn-install: {}
      - certificate-and-profile-installer: {}
      - fastlane:
          inputs:
            lane: "ios beta"
      - fastlane:
          inputs:
            lane: "android beta"
```

### Line-by-line explanation
- format_version: '11': Specifies the Bitrise YAML schema version.
- default_step_lib_source: URL for the step library Bitrise uses.
- project_type: react-native: Indicates the project type to tailor steps (RN-specific nuances like asset bundling).
- workflows.publish.steps: Defines the steps for the publish workflow.
- git-clone: Clones the repository to the build agent.
- cache: Enables caching to speed up subsequent builds (e.g., node_modules, cocoapods).
- node-install: Installs the specified Node.js version for React Native tooling.
- yarn-install: Installs project dependencies via Yarn.
- certificate-and-profile-installer: Retrieves iOS signing certificates and provisioning profiles.
- fastlane lane: "ios beta": Executes the Fastlane beta lane for iOS.
- fastlane lane: "android beta": Executes the Fastlane beta lane for Android.

## 3. Signing & provisioning and platform-specific considerations

A robust CI/CD pipeline must securely handle signing assets for both iOS and Android. Below are representative, production-friendly patterns you can adopt.

### iOS signing with Fastlane Match (example)
```ruby
# Fastlane Matchfile
git_url("git@github.com:myorg/certificates.git")
storage_mode("git")
type("appstore")
app_identifier("com.myorg.myapp")
team_id("MYTEAMID")
```

### Line-by-line explanation
- git_url: Location of the certificate storage (a Git repo in your org).
- storage_mode("git"): Uses a Git-backed storage for certificates (alternative: s3, google cloud, etc.).
- type("appstore"): Specifies App Store signing assets (other types: "adhoc", "development").
- app_identifier: Bundle ID of the iOS app.
- team_id: Apple Developer Team ID.

A secure, scalable approach is to store certificates and profiles centrally and fetch them in CI via Fastlane match. Do not commit signing material into the repository.

### Android signing with Gradle and environment variables (example)
```groovy
// ios/.. is separate; here is Android signing in build.gradle
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("KEYSTORE_FILE"))
      storePassword System.getenv("KEYSTORE_PASSWORD")
      keyAlias System.getenv("KEY_ALIAS")
      keyPassword System.getenv("KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

```ruby
# Fastlane Android beta with signing config from envs
lane :beta do
  gradle(
    task: "assembleRelease",
    properties: {
      "android.injected.signing.store.file" => ENV["KEYSTORE_FILE"],
      "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
      "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
      "android.injected.signing.key.password" => ENV["KEY_PASSWORD"]
    }
  )
  upload_to_play_store(track: "internal")
end
```

### Line-by-line explanation
- storeFile, storePassword, keyAlias, keyPassword: Pull signing material from environment variables to avoid leaking secrets in code or config files.
- android.injected.signing.*: Gradle properties that Fastlane can inject at build time to perform signing without hardcoding credentials.
- signingConfigs.release: Defines the signing config in Gradle using the environment-based values.
- track: "internal": The target Google Play track for internal testing (adjust as needed).

Note: In Bitrise, store your KEYSTORE_FILE, KEYSTORE_PASSWORD, KEY_ALIAS, and KEY_PASSWORD as secured environment variables and reference them in both Gradle and Fastlane as shown.

## 4. Automating release flows and at-scale considerations

Going at scale means handling multi-team releases, reproducible builds, and fast feedback loops. Key strategies:
- Centralize signing: Use Fastlane match for iOS and a secure Gradle signing config for Android. Store credentials in a vault or Bitrise Secrets and inject at runtime.
- Reproducible builds: Lock dependencies (exact versions in package.json/yarn.lock, Podfile.lock) and pin Fastlane versions in a Gemfile.
- Parallelism and matrixing: Run iOS and Android lanes in parallel where possible; consider separate Bitrise workflows for large teams with per-platform gates.
- Caching: Cache dependencies (node_modules, cocoapods, Gradle) to drastically reduce build times.
- Observability: Integrate test reports, code signing audit logs, and artifact storage for traceability.

Suggested code snippet for caching and parallelism (conceptual):
```yaml
# Conceptual illustration; adjust per your Bitrise version and steps
workflows:
  publish_parallel:
    steps:
      - git-clone: {}
      - cache: {}
      - parallel:
          - fastlane@3:
              inputs:
                lane: "ios beta"
          - fastlane@3:
              inputs:
                lane: "android beta"
```

Note: The exact syntax for parallel execution depends on your CI platform’s capabilities and step versions.

## X. Common Beginner Mistakes

1) Bad: Exposing credentials in repo or logs
- Fastfile shows credentials or keys in plain text.
- Bitrise: secret values hard-coded in scripts.
Good:
- Use environment variables and secret storage; reference via ENV["VAR"] and never commit keys.

Bad
```ruby
# Fastfile (dangerous)
store_password = "supersecret"
match(type: "appstore", appstore_password: store_password)
```

Good
```ruby
# Fastfile
match(type: "appstore", username: ENV["APPLE_ID"] )
```

2) Bad: Not pinning tool versions or SDKs
- Installing “latest” Fastlane or Gradle can lead to breaking changes in CI.
Good:
- Use a Gemfile with a locked fastlane version; pin Gradle/Android SDK versions in build.gradle and CI.

Bad
```ruby
# Gemfile
gem "fastlane"  # no version pinned
```

Good
```ruby
# Gemfile
gem "fastlane", "2.214.0"
```

3) Bad: Overlooking code signing problems in CI
- Relying on local certificates; CI agents lack provisioning profiles.
Good:
- Use Fastlane match for iOS and a secure Android signing config; ensure CI has access to signing assets.

Bad
- Letting Android signing rely on a local keystore path hard-coded in Gradle.

Good
```groovy
// android/build.gradle (signing with env vars)
storeFile file(System.getenv("KEYSTORE_FILE"))
```

4) Bad: Skipping tests or flaky test integration in CI
- CI runs only builds, not unit/UI tests.
Good:
- Add unit tests, UI tests, and lint to CI, and fail builds on test failures.

Bad
```
# Bitrise: only build, no tests
script:
  content: "echo 'Building...'"
```

Good
```
# Bitrise: run unit tests
script:
  content: "yarn test"
```

## Y. Why This Matters In Real Systems — production context

- Velocity and consistency: Automated CI/CD accelerates release cycles while maintaining consistent builds across devices and environments.
- Compliance and auditing: Signed artifacts, logs, and deployment trails assist in regulatory requirements and post-mortem analyses.
- Scale across teams: Centralized signing, reusable lanes, and standardized workflows reduce onboarding time for new teams and maintain governance.
- Risk reduction: CI tests catch integration issues early; caching and parallelization reduce time-to-market without sacrificing quality.
- Operational visibility: Central dashboards, artifacts, and alerts help ops teams respond quickly to failures or security concerns.

## Z. Study Questions

1) What is the primary benefit of using Fastlane match for iOS in CI/CD?
2) How does a Bitrise workflow typically trigger a Fastlane lane for both iOS and Android?
3) Why should you avoid hard-coding signing credentials in code or config files?
4) What is the difference between an internal track and production track in Google Play publishing?
5) Name three strategies to improve CI build times for large React Native projects.

## Exercise

Part A: Implement a minimal, working Fastlane multi-platform setup
- Create a Fastfile that:
  - Defines iOS beta and Android beta lanes (as shown in Section 1).
  - Uses match for iOS signing and Gradle for Android signing.
  - Includes a separate release lane for both platforms.

Deliverable: A Fastfile containing ios beta, ios release, android beta, and android release lanes.

Code sketch to get you started (adjust project paths to your repo):
```ruby
# Fastfile (exercise)
default_platform(:ios)

platform :ios do
  lane :beta do
    match(type: "appstore")
    gym(
      workspace: "ios/MyApp.xcworkspace",
      scheme: "MyApp",
      clean: true,
      export_method: "app-store"
    )
    pilot
  end

  lane :release do
    match(type: "appstore")
    gym(
      workspace: "ios/MyApp.xcworkspace",
      scheme: "MyApp",
      clean: true,
      export_method: "app-store"
    )
    deliver
  end
end

platform :android do
  lane :beta do
    gradle(task: "assembleRelease")
    upload_to_play_store(track: "internal")
  end

  lane :release do
    gradle(task: "assembleRelease")
    upload_to_play_store(track: "production")
  end
end
```

Part B: Define a Bitrise workflow that runs the Fastlane lanes
- Create a bitrise.yml with a single workflow named publish that:
  - Checks out the code
  - Restores caches
  - Installs Node.js and dependencies
  - Executes the iOS beta lane and the Android beta lane via Fastlane
  - Uses the Certificate/Provisioning installer for iOS

Code sketch:
```yaml
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: react-native

workflows:
  publish:
    steps:
      - git-clone: {}
      - cache: {}
      - node-install:
          inputs:
            node_version: '18.x'
      - yarn-install: {}
      - certificate-and-profile-installer: {}
      - fastlane:
          inputs:
            lane: "ios beta"
      - fastlane:
          inputs:
            lane: "android beta"
```

Part C: Add secure signing and caching
- Move signing credentials to environment variables or a secret vault (Bitrise Secrets or CI secret store).
- Enable caching for node_modules, Gradle, and CocoaPods (as applicable).
- Validate locally and in CI that the lanes complete and artifacts are produced (IPA/AAB).

Notes:
- Adapt path names to match your actual project layout (e.g., iOS workspace, scheme, Android app module).
- Replace placeholders (e.g., MyApp, Apple IDs, Team IDs) with your real values.
- Test incrementally: start with beta lanes and a single platform, then extend to release lanes and parallel builds.

If you’d like, I can tailor the Fastfile and bitrise.yml to your exact project structure (repository layout, signing strategy, and preferred CI layout) and produce a ready-to-run pair of files.