use feature-dev plugin and frontend-deign plugin. Lets create a nofifications feature that notifies users when a new message is received by a group the user belongs to, and when a new friend request is received

For message notifications
- Notifications should happen in real time so that push notifications are sent to the user's phone when the group receiving the message is not open
- When the group chat receiving messages is open, the new message should appear on the chat page without the user needing to refresh
- When the user taps the push notifications, the app should open directly to the group

Message UI updates
- When the user has unread messages in a group, show the same indicator on the nav menu that's used on the friends option when a pending friend request. Use the exact same component and refactor it so it can be used across any nav option
- When the user has unread messages in a group and they're on the group screen, show the count of unread messages on the group card. Show the count of unread messages up to 99. If there are more than 99, show 99+
- Add a mute notifications option to the kebab menu on the group screen. If notifications are already muted for the group, show an unmute option instead

For friend request notifications
- Notify users when a new friend request is received
- When the user taps the push notifications, the app should open directly to the friends page

Settings
- Update the notifications option on the profile settings page
- Add a 'Push Notifications' option that when enabled, shows sub options
- Sub option 1: Group Messages
- Sub option 2: Friend requests

Explore options to implement this feature and recommend the best solution too integrating this with a push notification service. My set up is as follows
- React Native frontend that can be deployed to both App Store and Play Store
- Fast API backend with uvicorn
- Deployed to CloudRun with horizontal autoscaling up to 10 pods

Make sure options recommended handle my set up well and deliver a near real time chat experience that's seemless to the users using it. Make sure to handle 
- Cloudrun connection timeouts
- Autoscaling / SIGTERM
- Concurrent connection limits
- explore any other constraights that will need to be considered

Write the full plan to this file in a new section below this line.

---

## Local Setup: Notifications

Complete these steps once to configure Firebase push notifications and run the app locally end-to-end.

---

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**.
2. Name it `nave` (or any name). Disable Google Analytics if you don't need it. Click **Create project**.
3. From the project overview sidebar, click **Cloud Messaging** (under Engage or via the bell icon). Make sure the API is enabled — if it shows "Enable", click it.

---

### Step 2 — Add the iOS app to Firebase

1. In Firebase console, click **+ Add app → iOS**.
2. **iOS bundle ID:** `co.naveapp.app`
3. App nickname: `Nave iOS` (optional). Click **Register app**.
4. Download **`GoogleService-Info.plist`**.
5. Place it at `app/ios/Nave/GoogleService-Info.plist`.
6. In Xcode: open `app/ios/Nave.xcworkspace` → right-click the `Nave` group in the project navigator → **Add Files to "Nave"** → select `GoogleService-Info.plist` → make sure **"Copy items if needed"** is checked and **Target: Nave** is ticked → click **Add**.
7. Skip the remaining Firebase console steps (the SDK is already wired in by this plan).

---

### Step 3 — Add the Android app to Firebase

1. In Firebase console, click **+ Add app → Android**.
2. **Android package name:** `com.navenative`
3. App nickname: `Nave Android` (optional). Click **Register app**.
4. Download **`google-services.json`**.
5. Place it at `app/android/app/google-services.json`.
6. Skip the remaining Firebase console steps (Gradle changes are in the next step).

---

### Step 4 — Wire Firebase into the native projects

#### iOS — update `AppDelegate.swift`

Edit `app/ios/Nave/AppDelegate.swift`:

```swift
import UIKit
import React
import React_RCTAppDelegate
import FirebaseCore                          // ← add this

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()                  // ← add this (before super)
    self.moduleName = "Nave"
    self.initialProps = [:]
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
```

#### Android — update `android/build.gradle`

Edit `app/android/build.gradle`. Add the Google Services classpath inside the `buildscript.dependencies` block:

```groovy
buildscript {
    // ... existing content ...
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        classpath("com.google.gms:google-services:4.4.2")    // ← add this
    }
}
```

#### Android — update `android/app/build.gradle`

Add the plugin application at the top of `app/android/app/build.gradle` (after the existing `apply plugin` lines):

```groovy
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"
apply plugin: "com.google.gms.google-services"    // ← add this
```

---

### Step 5 — Install npm packages and pods

```bash
cd app
npm install @react-native-firebase/app @react-native-firebase/messaging
cd ios && pod install && cd ..
```

Expected: CocoaPods resolves `FirebaseCore`, `FirebaseMessaging`, and related pods. This takes a minute or two.

---

### Step 6 — Configure APNs (iOS only)

Firebase needs an APNs key to deliver notifications to iOS devices/simulators.

1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Keys** → **+**.
2. Name it `Nave APNs`, tick **Apple Push Notifications service (APNs)**, click **Continue → Register**.
3. Download the `.p8` file. Note the **Key ID** and your **Team ID** (top-right on developer.apple.com).
4. In Firebase console → **Project settings** (gear icon) → **Cloud Messaging** tab → **Apple app configuration** → click **Upload** under APNs Auth Key.
5. Upload the `.p8` file, enter Key ID and Team ID. Save.

> **Simulator note:** iOS simulators can receive FCM notifications only if you use the [local notification testing method](https://firebase.google.com/docs/cloud-messaging/ios/receive#handle_messages_in_the_foreground). For real push (lock screen), test on a physical device.

---

### Step 7 — Generate the Firebase service account key (for the API)

1. In Firebase console → **Project settings** → **Service accounts** tab.
2. Click **Generate new private key** → **Generate key**. Download the JSON file.
3. Open the downloaded JSON file and copy all its contents.
4. In `api/.env` (or `api/.env.local`), add:

```env
FIREBASE_SERVICE_ACCOUNT_JSON='<paste the entire JSON here on one line>'
```

The value must be a single-line JSON string. You can compact it with:

```bash
cat your-key-file.json | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))"
```

Then paste that output as the value.

---

### Step 8 — Run the database migration

```bash
cd api
make run-local        # starts Docker Compose (PostgreSQL + API)
```

The entrypoint runs `alembic upgrade head` automatically, which applies the new `20260412_0001_notifications.py` migration (adds `user_device_tokens`, `group_notification_mutes`, and three columns to `users`).

To verify:

```bash
make shell
python3 -c "import asyncio, asyncpg; \
  async def run(): \
    conn = await asyncpg.connect('$DATABASE_URL'); \
    rows = await conn.fetch(\"SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_device_tokens','group_notification_mutes')\"); \
    print([r['table_name'] for r in rows]); \
  asyncio.run(run())"
```

Expected output: `['user_device_tokens', 'group_notification_mutes']`

---

### Step 9 — Run the app

**iOS:**
```bash
cd app
npm run ios
```

**Android:**
```bash
cd app
npm run android
```

---

### Step 10 — Verify notifications end-to-end

#### 10a — Check token registration

After logging in, the app calls `POST /notifications/device-token`. Confirm it worked:

```bash
# From api/ with the API running
curl -s -X GET http://localhost:8000/notifications/preferences \
  -H "Authorization: Bearer <your-token>" | python3 -m json.tool
```

Expected:
```json
{
    "push_notifications_enabled": true,
    "notify_group_messages": true,
    "notify_friend_requests": true
}
```

Check the device token was stored (via `make shell` or a DB client):
```sql
SELECT user_id, platform, LEFT(token, 20) || '...' AS token_preview
FROM user_device_tokens;
```

#### 10b — Test group message push

1. Log in on two devices (or simulator + physical device).
2. Both users join the same group.
3. With device B's screen locked (or app closed), send a message from device A.
4. Device B should receive a push notification with the group name and message preview.
5. Tapping the notification opens the app directly to that group chat.

#### 10c — Test friend request push

1. With device B's screen locked, send a friend request from device A.
2. Device B should receive a push notification: "New Friend Request".
3. Tapping it opens the Friends screen.

#### 10d — Test in-app polling

1. Open a group chat on device A.
2. Send a message from device B (or via `curl`).
3. Within 3 seconds, the message appears on device A without any manual refresh.

#### 10e — Test mute

1. In the group card kebab menu, tap **Mute notifications**.
2. Send a message to that group from another user.
3. Confirm no push notification is received.
4. Tap **Unmute notifications** — notifications resume.

#### 10f — Test notification settings

1. Open Profile → Settings → **Notifications**.
2. Toggle **Push Notifications** off → send a message → confirm no push received.
3. Toggle it back on, disable **Group Messages** only → confirm friend request pushes still arrive but message pushes do not.

---

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `FirebaseApp.configure()` crash on iOS | Confirm `GoogleService-Info.plist` is added to the Xcode target (not just the filesystem) |
| No token in `user_device_tokens` | Check console for Firebase init errors; confirm APNs key is uploaded in Firebase console |
| `FIREBASE_SERVICE_ACCOUNT_JSON not set` in API logs | Check the env var is set in `api/.env` and the API restarted |
| Push delivered but app doesn't navigate | Confirm `setupNotificationHandlers` is called in `App.tsx` `onReady`; check `groupId` in notification data payload |
| Android build fails after adding Google Services | Run `cd app/android && ./gradlew clean` then rebuild |
| `pod install` fails | Run `cd app/ios && pod repo update && pod install` |

---

## Implementation Plan

### Architecture Decision: Polling + Firebase Cloud Messaging (FCM)

Given the Cloud Run deployment (up to 10 pods, horizontal autoscaling), stateful WebSocket or SSE connections are impractical without external infrastructure:

| Option | Cloud Run fit | Complexity | Cost |
|--------|--------------|------------|------|
| WebSockets + Redis pub/sub | Fair (session affinity + Redis needed) | High | ~$30+/mo |
| Server-Sent Events + Redis | Same issue | Medium-High | ~$30+/mo |
| External real-time (Ably/Pusher) | Excellent | Medium | ~$0–$25/mo |
| **Client polling (3s when chat open)** | **Excellent** | **Low** | **$0** |

**Cloud Run constraints addressed:**
- **Connection timeouts**: Polling is a short-lived request — no timeout issues
- **Autoscaling/SIGTERM**: Stateless — any pod handles any poll request; graceful shutdown has no active connections to drain
- **Concurrent connection limits**: Short polls use connections briefly and release them vs. WebSockets that hold connections open
- **No shared state between pods**: REST is inherently stateless; two users on different pods don't need to coordinate

**Decision:**
- **In-app real-time** (group chat screen open): Client polls `/prayer-groups/{id}/messages?after={timestamp}` every 3 seconds. Pauses when app is backgrounded.
- **Push notifications** (app closed/backgrounded): Firebase Cloud Messaging — free, handles both iOS (APNs bridge) and Android, single HTTP call from API per event.

---

### Phase 1: Database Changes

**New migration: `api/alembic/versions/20260412_0001_notifications.py`**

New tables:
```sql
-- Stores FCM device tokens per user
CREATE TABLE user_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Per-group mute preferences
CREATE TABLE group_notification_mutes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);
```

New columns on `users`:
```sql
ALTER TABLE users ADD COLUMN notify_group_messages BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN notify_friend_requests BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
```

---

### Phase 2: API Backend

**New files:**
- `api/app/routers/notifications.py` — device token management + notification preferences + group mute
- `api/app/utils/push.py` — Firebase Admin SDK helper to send FCM multicast

**New endpoints:**
```
POST   /notifications/device-token          Register FCM token
DELETE /notifications/device-token          Unregister on logout
GET    /notifications/preferences           Get user notification preferences
PATCH  /notifications/preferences           Update preferences
PATCH  /prayer-groups/{id}/notifications    Mute or unmute a group
GET    /prayer-groups/{id}/notifications    Get mute status
```

**Modified files:**
- `api/app/routers/group_messages.py` — after message insert, send FCM to all eligible group members
- `api/app/routers/friends.py` — after friend request, send FCM to recipient
- `api/app/routers/group_messages.py` — add `?after=` query param to list_messages for polling
- `api/app/config.py` — add `FIREBASE_SERVICE_ACCOUNT_JSON` setting
- `api/requirements.txt` — add `firebase-admin`
- `api/app/main.py` — register notifications router

**Push notification logic:**
- Group message: notify all members (status='member') except sender; skip users with group muted, `notify_group_messages=false`, or `push_notifications_enabled=false`
- Friend request: notify recipient; skip if `notify_friend_requests=false` or `push_notifications_enabled=false`
- Invalid/expired tokens are removed from the DB automatically

**FCM payload structure:**
```json
// Group message
{ "type": "group_message", "groupId": "<uuid>", "groupName": "<name>" }

// Friend request
{ "type": "friend_request" }
```

---

### Phase 3: React Native Frontend

**Firebase setup:**
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```
- Add `GoogleService-Info.plist` (iOS) and `google-services.json` (Android)
- Configure `ios/AppDelegate.mm` and `android/build.gradle`

**New files:**
- `app/src/lib/notifications.ts` — FCM token registration, foreground/background/cold-start handlers, deep-link navigation
- `app/src/components/ui/TabBadge.tsx` — shared red dot indicator (refactored from FriendsTabIcon)

**Modified files:**

| File | Change |
|------|--------|
| `app/App.tsx` | Call `registerPushToken()` after login, `unregisterPushToken()` on logout |
| `app/src/navigation/AppNavigator.tsx` | Refactor Friends badge to use `TabBadge`, add Groups tab badge |
| `app/src/navigation/RootNavigator.tsx` | Set up notification tap navigation handlers |
| `app/src/screens/group/GroupMessageScreen.tsx` | Add 3-second polling loop (pauses when backgrounded/blurred) |
| `app/src/screens/group/GroupScreen.tsx` | Add mute/unmute to kebab menu |
| `app/src/screens/profile/SettingsModal.tsx` | Replace static Notifications item with functional toggle panel |
| `app/src/store/groupChatStore.ts` | Add `getTotalUnreadCount()`, add `appendNewMessages()` for polling |
| `app/src/store/prayerStore.ts` | Add `muteStatusByGroup` map + `muteGroup`/`unmuteGroup` actions |
| `app/src/lib/apiClient.ts` | Add notification API methods |
| `app/src/types/index.ts` | Add `NotificationPreferences` interface |

**Key UX details:**
- Groups nav tab: red dot (same size/style as Friends) when any group has unread messages
- Group card: existing `UnreadBadge` component already handles 99+ — no change needed
- Notification settings: master Push Notifications toggle; when on, sub-toggles for Group Messages and Friend Requests appear (disabled/hidden when master is off)
- Mute toggle: in the group card kebab menu between Share and the admin/leave actions; shows "Mute notifications" or "Unmute notifications" based on current state

**Deep link navigation on notification tap:**
- `type: group_message` → `navigation.navigate('GroupMessage', { id: groupId })`
- `type: friend_request` → `navigation.navigate('App')` then switch to Friends tab
- Handles all three states: foreground (`onMessage`), backgrounded (`onNotificationOpenedApp`), cold start (`getInitialNotification`)
