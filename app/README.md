# Nave — Mobile App

React Native app for Nave, a Catholic prayer community platform.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 18+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| [Xcode](https://developer.apple.com/xcode/) | 15+ | iOS builds only — Mac required |
| [Android Studio](https://developer.android.com/studio) | Latest | Android builds only |
| [CocoaPods](https://cocoapods.org/) | Latest | iOS native dependencies |
| [Ruby](https://www.ruby-lang.org/) | 3.x | Required by CocoaPods on macOS |

> The API must also be running locally. See `../api/README.md` for setup.

---

## First-Time Setup

### 1. Install JS dependencies

```bash
npm install
```

### 2. Add Firebase config files

Push notifications require platform-specific Firebase config files. These are not committed to the repo — get them from the Firebase console (**Project settings → Your apps**) or from a teammate.

| File | Destination |
|------|-------------|
| `GoogleService-Info.plist` | `ios/Nave/GoogleService-Info.plist` |
| `google-services.json` | `android/app/google-services.json` |

After placing `GoogleService-Info.plist`, open `ios/Nave.xcworkspace` in Xcode, right-click the `Nave` group → **Add Files to "Nave"** → select the file → ensure **Target: Nave** is ticked → **Add**.

To run without push notifications (Firebase not configured), you can skip this step — the app will start fine, notifications will silently no-op.

### 3. Install iOS native dependencies

```bash
cd ios && pod install && cd ..
```

Re-run `pod install` any time you add a package with native code.

---

## Running the App

Start the API first (`make run-local` from `../api/`), then:

### iOS Simulator

```bash
npm run ios
```

To target a specific simulator:

```bash
npm run ios -- --simulator="iPhone 17 Pro"
```

### Android Emulator

```bash
npm run android
```

Make sure an emulator is already running in Android Studio before executing this command.

### Metro bundler only

```bash
npm start
```

Starts only the JS bundler. Use this when building from Xcode or Android Studio directly (e.g., physical device or release build).

---

## API Connection

The base URL is configured in `src/lib/config.ts`.

| Environment | URL |
|-------------|-----|
| Local dev (iOS Simulator) | `http://localhost:8000` |
| Local dev (Android Emulator) | `http://10.0.2.2:8000` |
| Production | Deployed Cloud Run URL |

Android emulators use `10.0.2.2` to reach your Mac's localhost — update `config.ts` if switching between iOS and Android.

---

## Development Commands

```bash
npm run type-check   # TypeScript type checking (no emit)
npm run lint         # ESLint
npm start            # Metro bundler only
```

---

## Project Structure

```
src/
  components/     # Reusable UI components
  lib/            # API client, config, notifications setup
  navigation/     # React Navigation stack and tab configuration
  screens/        # Screen components grouped by feature
  store/          # Zustand state management (auth, feed, groups, friends)
  theme/          # Colors, spacing, typography constants
  types/          # Shared TypeScript types and navigation types
```

---

## Troubleshooting

**Metro cache issues**
```bash
npm start -- --reset-cache
```

**iOS build fails after adding a package**
```bash
cd ios && pod install && cd ..
```

**iOS build fails with "Redefinition of module" errors**

This happens if `use_modular_headers!` was added globally to the Podfile. It should only be scoped to `GoogleUtilities`:
```ruby
pod 'GoogleUtilities', :modular_headers => true
```

**iOS build fails with "Unable to resolve module FirebaseCore"**

Ensure the top of `ios/Podfile` has:
```ruby
$RNFirebaseAsStaticFramework = true
```
Then run `cd ios && pod install && cd ..`.

**Android build fails after adding Firebase**

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

Make sure `google-services.json` is at `android/app/google-services.json` and `apply plugin: "com.google.gms.google-services"` is in `android/app/build.gradle`.

**"Unable to connect to development server"**
- Make sure Metro is running (`npm start`)
- For Android: confirm `config.ts` uses `10.0.2.2` not `localhost`
- Make sure the API is running (`make run-local` from `../api/`)

**Push notifications not arriving locally**

- iOS Simulator cannot receive real push notifications. Test on a physical device.
- Check the API logs (`make logs` from `../api/`) for `FCM multicast` log lines.
- Confirm `FIREBASE_SERVICE_ACCOUNT_JSON` is set in `api/.env` and the API was restarted.
