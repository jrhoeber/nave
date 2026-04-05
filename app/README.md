# naveapp

React Native mobile app for Nave — a Catholic prayer community app.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Xcode](https://developer.apple.com/xcode/) (for iOS)
- [Android Studio](https://developer.android.com/studio) (for Android)
- [CocoaPods](https://cocoapods.org/) (for iOS native dependencies)

## Setup

```bash
npm install
```

For iOS, also install native dependencies:

```bash
cd ios && pod install && cd ..
```

## Running Locally

### iOS

```bash
npm run ios
```

This starts the Metro bundler and launches the app in the iOS Simulator.

### Android

```bash
npm run android
```

This starts the Metro bundler and launches the app in an Android emulator or connected device.

### Metro bundler only

```bash
npm start
```

Use this if you want to start the bundler separately, then run the app from Xcode or Android Studio.

## Other Commands

```bash
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
```

## Configuration

The app connects to the naveapi backend. The base URL is set in the store files under `src/store/`. For local development, point it to `http://localhost:8000`.
