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

**1. Install JS dependencies**
```bash
npm install
```

**2. Install iOS native dependencies**
```bash
cd ios && pod install && cd ..
```

> Re-run `pod install` any time you add a new package with native code.

---

## Running the App

### iOS Simulator

```bash
npm run ios
```

Starts Metro and launches the app in the default iOS Simulator. To target a specific device:

```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

### Android Emulator

```bash
npm run android
```

Starts Metro and launches the app in a running Android emulator or connected device. Make sure an emulator is already running in Android Studio before executing this command.

### Metro bundler only

```bash
npm start
```

Starts only the JS bundler. Use this when you want to open the app from Xcode or Android Studio directly (e.g., for a physical device build or release build).

---

## API Connection

The app connects to the Nave API. The base URL is configured in:

```
src/lib/config.ts
```

| Environment | URL |
|-------------|-----|
| Local dev | `http://localhost:8000` |
| Production | Set to the deployed Cloud Run URL |

For local development, start the API with `make run-local` from the `api/` directory before running the app.

**iOS Simulator** connects to `localhost` on your Mac automatically.

**Android Emulator** uses `10.0.2.2` to reach your Mac's localhost — update `config.ts` if testing on Android.

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
  lib/            # API client, config, utilities
  navigation/     # React Navigation stack and tab configuration
  screens/        # Screen components grouped by feature
  store/          # Zustand state management (auth, feed, prayer groups)
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

**Android build fails**
- Open `android/` in Android Studio and sync Gradle
- Make sure `ANDROID_HOME` is set in your environment

**"Unable to connect to development server"**
- Make sure Metro is running (`npm start`)
- For Android: confirm the API URL uses `10.0.2.2` not `localhost`
