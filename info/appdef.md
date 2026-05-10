# Nave — Product Definition

> Last regenerated: 2026-05-10 (reviewed/refreshed 2026-05-10)
> Source of truth: this document is generated from the monorepo. Update by re-running the review process, not by hand-editing.

---

## 1. Executive summary

**Elevator pitch.** Nave is a free Catholic prayer-community mobile app: practicing Catholics and seekers pick a home parish, join (or start) small prayer groups — bible study, men's, women's, young adults, families, devotional, general — chat inside those groups, post to a parish-wide community feed, and build a friend network of fellow members. The name evokes the central body of a Catholic church — the space where the faithful gather.

**Target users.** US-based practicing Catholics and those exploring the Catholic faith, ages 13 and up. The product is currently English-only and and US-only. Children under 13 are blocked at sign-up via a hard age gate.

**Key differentiators.**
- Parish-rooted: every user picks a real-world parish and is connected to its community feed and the prayer groups associated with that parish.
- Faith-aware moderation: a Catholic-specific moderation policy (allows prayer requests about hard topics like grief, addiction, depression, suicidal struggle in others; blocks anti-Catholic harassment, blasphemy, profanity), implemented as a two-layer text pipeline (OpenAI Moderation → Claude Haiku 4.5) plus Google Cloud Vision SafeSearch on every uploaded image.
- Crisis-aware: when Layer 2 detects active self-harm signals, the app surfaces 988, Catholic Charities, diocese, and parish-priest resources to the user.

---

## 2. Company / publisher information

| Field | Value |
|------|-------|
| Legal entity | Cornerstone Dev LLC (cornerstonedev.co) |
| Business address | 418 Broadway Ste N, Albany, NY 12207, US |
| Support email | nave@cornerstonedev.co |
| Marketing URL | https://naveapp.co (referenced in API CORS allowlist `api/app/main.py:54-65` and in `app/src/screens/auth/WelcomeScreen.tsx:183-189`) |
| Support URL | https://naveapp.co/support (`web/src/pages/SupportPage.tsx`, linked from landing footer) |
| Privacy contact | naveprivacy@cornerstonedev.co |
| DMCA agent | jordan@cornerstonedev.co |
| Vulnerability disclosure | navetsecurity@cornerstonedev.co |
| Account deletion URL | https://naveapp.co/delete (`web/src/pages/DeletePage.tsx`) |
| Copyright line | "© {current year} Nave. All rights reserved." (`web/src/pages/LandingPage.tsx:327-329`) |
| Apple submission contact | Jordan Hoeber, jordan@cornerstonedev.co, (716) 347-5307, 418 Broadway Ste N, Albany, NY 12207 US. Apple Team ID / ASC App ID / Apple ID / iOS `appleId` for submissions are still EAS placeholder values (`app/eas.json` `submit.production.ios`: appleTeamId/ascAppId/appleId all `your-...@example.com` / `your-...`) — `<TODO: fill the Apple developer account identifiers in `eas.json`>` |

---

## 3. Product surfaces

### 3.1 Mobile app

| Property | Value | Source |
|----------|-------|--------|
| Display name | "Nave" | `app/ios/Nave/Info.plist` `CFBundleDisplayName`; `app/app.json` `displayName` |
| iOS bundle identifier | `co.naveapp.app` | `app/ios/Nave.xcodeproj/project.pbxproj` `PRODUCT_BUNDLE_IDENTIFIER` |
| Android package name | `com.navenative` | `app/android/app/build.gradle` `namespace` / `applicationId` |
| Marketing version | 1.0 | iOS `MARKETING_VERSION=1.0`; Android `versionName "1.0"` |
| Build number | 1 | iOS `CURRENT_PROJECT_VERSION=1`; Android `versionCode 1` |
| iOS deployment target | iOS 15.1 | `IPHONEOS_DEPLOYMENT_TARGET = 15.1` |
| Android minSdk / targetSdk | 24 / 36 | `app/android/build.gradle` |
| Required device capabilities | `arm64` | `Info.plist` `UIRequiredDeviceCapabilities` |
| Supported orientations | iPhone: portrait only. iPad: portrait, portrait-upside-down, landscape-left, landscape-right. | `Info.plist` `UISupportedInterfaceOrientations*` |
| Supported languages | English (en) — `CFBundleDevelopmentRegion=en`. No additional `*.lproj` localizations present. | `Info.plist` |
| Framework | React Native 0.83.9 + Expo SDK 55 (bare workflow / not Expo Go), TypeScript 5, React 19.2, Hermes engine, React Native New Architecture enabled (`RCTNewArchEnabled` true). | `app/package.json`, `app/ios/Podfile` |
| Custom URL schemes | `com.googleusercontent.apps.667996115450-ak9i7520mpoesbhcs06gcoudmo98984m` (Google Sign-In reverse client ID). No app-level custom scheme or universal link is registered. | `Info.plist` `CFBundleURLTypes` |
| Capabilities (iOS) | Push notifications (`aps-environment = development`); Sign in with Apple (`com.apple.developer.applesignin = Default`). | `app/ios/Nave/Nave.entitlements` |
| App Transport Security | Default ATS on (`NSAllowsArbitraryLoads = false`). Local networking allowed (`NSAllowsLocalNetworking = true`) for dev API. | `Info.plist` |
| Export compliance | `ITSAppUsesNonExemptEncryption = false` declared in `Info.plist` — eligible for the standard-encryption exemption (HTTPS/TLS only). | `Info.plist` |
| iOS Privacy Manifest | Declares "required reason API" usage for `UserDefaults` (CA92.1, 1C8F.1, C56D.1), `FileTimestamp` (0A2A.1, 3B52.1, C617.1), `DiskSpace` (E174.1, 85F4.1), `SystemBootTime` (35F9.1). `NSPrivacyTracking = false`. `NSPrivacyCollectedDataTypes` is populated with 10 entries (Email, Name, UserID, OtherUserContent, PhotosorVideos, ProductInteraction, DeviceID, PerformanceData, OtherDiagnosticData, OtherDataTypes) — all `NSPrivacyCollectedDataTypeLinked = true`, purpose `AppFunctionality`, tracking `false`. Cross-check against §6 before submission; categories there imply we should also confirm Crashlytics-supplied diagnostic types are captured by `PerformanceData` / `OtherDiagnosticData`. | `app/ios/Nave/PrivacyInfo.xcprivacy` |
| Android permissions declared | `android.permission.INTERNET`, `android.permission.POST_NOTIFICATIONS` (required for Android 13+ to request push permission). No `READ_EXTERNAL_STORAGE` or `CAMERA` (image picker libs use system-managed pickers that don't need them on modern Android). | `app/android/app/src/main/AndroidManifest.xml` |
| Custom fonts shipped | Ionicons, MaterialCommunityIcons, Montserrat-Black, Montserrat-ExtraBold, CormorantGaramond-Regular/Italic/Bold | `Info.plist` `UIAppFonts` |

### 3.2 Backend

| Property | Value | Source |
|----------|-------|--------|
| Framework | FastAPI 0.115.12 on Uvicorn, async/await, Python 3.12 | `api/requirements.txt`, `api/Dockerfile` |
| Database | PostgreSQL (managed by Neon, `neondb` on `aws.neon.tech`), accessed via `asyncpg` connection pool. Uses `pg_trgm` for trigram parish search. UUID PKs throughout. | `api/.env`, `api/app/main.py:31`, `api/schema.sql` |
| ORM / migrations | Alembic 1.14.1 + SQLAlchemy 2.0 (migrations only — runtime queries use raw asyncpg). Migrations applied automatically on container start (`api/entrypoint.sh`). | `api/alembic`, `api/requirements.txt` |
| Hosting | Google Cloud Run service `naveapi`, region from CI `vars.REGION`, image in `<region>-docker.pkg.dev/<project>/naveapi/naveapi`. min-instances 0, max-instances 10, 512 MiB memory, 30s timeout. Public (`--allow-unauthenticated`). Auth/CORS enforced in app code. | `.github/workflows/deploy-api.yml` |
| Secrets management | Google Secret Manager: `DATABASE_URL`, `SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` injected at deploy time via `--set-secrets`. CI authenticates via Workload Identity Federation. | `.github/workflows/deploy-api.yml` |
| Object storage | Google Cloud Storage bucket `nave-avatars`, GCP project `nave-a0989`. All uploads private; clients fetch via 7-day V4 signed URLs (cached in-process for 6d23h). Prefixes: `avatars/`, `group-avatars/`, `parish-covers/`, `group_messages/`. | `api/app/utils/storage.py`, `api/.env` |
| Push notifications | Firebase Cloud Messaging via `firebase-admin` Python SDK. APNS badge value is computed per recipient from the inbox unread count. | `api/app/utils/push.py`, `api/app/utils/inbox.py` |
| Public API URL | https://api.naveapp.co | `app/.env.production`, `web/.env.example` |
| Health check | `GET /health` → `{"status": "ok"}` | `api/app/main.py:165-167` |
| CORS allowlist | `https://naveapp.co`, `https://www.naveapp.co`, `http://localhost:5173`, `http://localhost:4173`. Mobile app calls bypass CORS (no `Origin` from native fetch). | `api/app/main.py:54-65` |

### 3.3 Website

| Property | Value | Source |
|----------|-------|--------|
| URL | https://naveapp.co (and `www.naveapp.co`); admin lives on the same origin under `/admin/*` and `/manage`; `/signin` for the sign-in page. | `api/app/main.py` CORS, `web/src/App.tsx` routes |
| Hosting | Firebase Hosting (`web/firebase.json` rewrites all paths to `/index.html`); Firebase project `nave-a0989`. | `web/firebase.json`, `web/.firebaserc` |
| Framework | Vite 5 + React 18 + TypeScript + React Router v6 + Tailwind CSS 3 + Firebase JS SDK v10. | `web/package.json` |
| Pages | `/` Landing (marketing), `/signin` (Firebase Google/Apple sign-in), `/support` (FAQ + support email contact), `/delete` (sign-in gate that routes to `/manage` for in-account deletion — satisfies Google Play's "deletion URL without installing the app" rule), `/dmca` (full DMCA designated-agent page), `/manage` parish-admin tooling (also used as the in-account deletion target), `/admin` super-admin home, `/admin/moderation` (review queue), `/admin/reports` (user reports queue), `/admin/parishes` (parish CRUD + parish-admin assignment), `/admin/users` (`ManageUsersPage` — admin user list + delete), `/privacy` and `/terms` (currently `ComingSoonPage` placeholders — **not yet published**). | `web/src/App.tsx`, `web/src/pages/*` |
| Web auth | Firebase Web SDK; identical Firebase project as mobile (`nave-a0989`); after sign-in, the web client calls `POST /auth/firebase` with `source: "web"` (the API rejects new-account creation from web — web sign-in only works for users who first signed up in the mobile app, see `api/app/routers/auth.py:135-139`). | `web/src/firebase.ts`, `web/src/context/AuthContext.tsx` |
| Web JWT storage | `localStorage` key `nave_jwt` (and `nave_is_admin` boolean). | `web/src/context/AuthContext.tsx` |
| Marketing pixels / analytics on web | None observed. No GA, no Meta Pixel, no Hotjar, no Segment, no cookie-consent banner. The only third-party SDK on the web is Firebase Auth (and Google Fonts via stylesheet link). | `web/src/*`, `web/index.html` |

---

## 4. Features (exhaustive)

> Each feature lists the surfaces it appears on (M = mobile, B = backend, W = web), the personal/UGC data it touches, and the third-party services it depends on.

### 4.1 Account creation & sign-in
- **What it does.** New users sign in with Apple, Google, or email + password (Firebase Identity Toolkit). The Firebase ID token is exchanged at `POST /auth/firebase` for a Nave JWT (HS256, 30-day expiry). On first sign-in the API auto-generates a username from the provider name/email; users complete profile setup (name, username, birthday, optional bio) and pick a parish. Birthday <13 hard-blocks the user with an "ages 13+" screen.
- **Surfaces.** M (`screens/auth/WelcomeScreen.tsx`, `EmailSignInScreen.tsx`, `PasswordResetScreen.tsx`, `ProfileSetupScreen.tsx`, `ParishSetupScreen.tsx`); B (`/auth/firebase`, `/auth/me`); W (`/signin`).
- **Data touched.** Firebase UID, email, display name from provider, optional avatar URL from provider, birthday (DATE), parish_id.
- **Third parties.** Firebase Auth (Google, Apple, email/password); Google Sign-In SDK (mobile); Apple Authentication Services (iOS only); Firebase Identity Toolkit REST endpoint `signInWithIdp` / `signUp` / `signInWithPassword`.
- **Password rules (email mode).** Client-side (`app/src/lib/passwordValidation.ts`): 8–64 chars; rejects passwords containing the literal app-name token `nave` or the email local-part (when ≥4 chars); checks against Have I Been Pwned via k-anonymity (SHA-1 prefix, with `Add-Padding: true` request header). Server-side: passwords are stored by Firebase, not Nave — Nave only sees the resulting ID token.

### 4.2 Profile (own)
- **What it does.** View and edit display name, username (3–20 chars `[a-z0-9_]`, server-checked unique), bio (≤200 chars in UI), parish, birthday, avatar.
- **Surfaces.** M (`screens/profile/ProfileScreen.tsx`, `EditProfileScreen.tsx`, `BlockedUsersScreen.tsx`, `SettingsScreen.tsx`); B (`/users/me` GET/PATCH/DELETE, `/users/me/avatar` POST, `/users/username-available`).
- **Data touched.** display_name, username, bio, avatar (uploaded JPEG, resized server-side to 512px max via Pillow, 5 MB max), birthday, parish_id, location, diocese.
- **Third parties.** Google Cloud Storage (avatar storage); Google Cloud Vision SafeSearch (every avatar moderated before persistence — `users.py:194`).

### 4.3 Profile (other users)
- **What it does.** View another user's profile, see mutual friends (≤5 + count), shared prayer groups count, friendship status. Block/unblock from kebab menu. Blocked users hide from each other in profile lookups, search, and parish-comment lists.
- **Surfaces.** M (`screens/shared/UserProfileScreen.tsx`); B (`/users/{id}`, `/blocks` POST/DELETE/GET).
- **Data touched.** Same as own profile; mutual-friend list (display_name + avatar of up to 5 mutuals).

### 4.4 Parish selection & directory
- **What it does.** Search US parishes by name (trigram + abbreviation expansion: "Saint" → "St.", "Blessed" → "Bl.", etc.). Pick one as your home parish (required to use the app). Parish admins (granted via `parish_admins` table) can edit website / mass schedule and upload a cover photo.
- **Surfaces.** M (`screens/auth/ParishSetupScreen.tsx`, `screens/parish/ParishScreen.tsx`); B (`/parishes/search`, `/parishes/{id}`, `/parishes/{id}` PATCH, `/parishes/{id}/cover-photo` POST).
- **Data touched.** Parish records (name, street_address, city, state, postal_code, diocese, established, website, mass_schedule, cover_photo_url, avatar_url). Seeded from `api/seeds/parishes.sql`.
- **Third parties.** GCS (cover photos), Cloud Vision SafeSearch (cover photo moderated).

### 4.5 Parish community feed
- **What it does.** Members see a chronological feed of parish posts (text only, no images on posts). Parish admins can flag a post as an announcement. Reactions (👍 🙏 ❤️). Per-post comment threads (flat with reply pointer; reactions on comments). Soft-delete via `status='Deleted'`. Reporters can report a post via kebab menu.
- **Surfaces.** M (`screens/parish/ParishScreen.tsx`, `ParishPostDetailScreen.tsx`); B (`/parishes/{id}/posts` GET/POST, PATCH/DELETE, `/parishes/{id}/posts/{id}/reactions`, `/parishes/{id}/posts/{id}/comments` and reactions).
- **Data touched.** Post text (≤ no length limit in DB; client UX TBD), comments (1–1000 chars per `parish_post_comments` CHECK), reactions, author user_id.
- **Moderation.** Every post and every comment passes through Layer 1 (OpenAI omni-moderation-latest) + Layer 2 (Claude Haiku 4.5 with `policy.md` system prompt). Decision: `allow` → status `Posted`; `block` → 400 to client, recorded in `moderation_queue` for audit; `queue` → status `Pending`, hidden from feed until admin approves.

### 4.6 Prayer groups
- **What it does.** Browse all groups in your parish, search by name, filter by category (`bible_study`, `mens_group`, `womens_group`, `young_adults`, `families`, `devotional`, `general`). Public groups: tap to join. Private groups: request → admin approves. Members can invite friends; invites to private groups by non-admins go through admin "approve invitation" gate. Invitations have status `pending` (invitee-facing) / `awaiting_approval` (admin-facing) / `accepted` / `declined`. Group admin can update name / description / category / privacy / schedule, upload group avatar, remove members, transfer-by-deletion, etc. Last admin cannot leave; account deletion reassigns admin to oldest remaining member or deletes the group.
- **Surfaces.** M (`screens/group/GroupScreen.tsx`, `CreateGroupScreen.tsx`, `GroupProfileScreen.tsx`); B (`/prayer-groups` and dozens of nested endpoints — see `api/app/routers/prayer_groups.py`).
- **Data touched.** Group metadata; membership (status `pending` | `member`); avatar in GCS.
- **Third parties.** GCS (avatar), Cloud Vision SafeSearch (avatar moderated), FCM (invite/approval/welcome push notifications).

### 4.7 Group chat
- **What it does.** Each prayer group has an inverted message list. Text messages (≤2000 chars in DB) and image attachments (JPEG/PNG/WebP, ≤10 MB). Reactions: 👍 🙏 ❤️ 😂 😮 🥲. Polling: `?after=` returns messages newer than a timestamp (mobile polls every ~3s while screen focused). Members can delete their own messages; admins can delete any. Mute group → user stops receiving push for new messages.
- **Surfaces.** M (`screens/group/GroupMessageScreen.tsx`); B (`/prayer-groups/{id}/messages` GET/POST, `/messages/upload-image` POST, `/messages/{id}` DELETE, `/messages/{id}/reactions` POST toggle, `/notifications/prayer-groups/{id}/mute`).
- **Data touched.** Message text + image; reactions; per-(user, group) mute state.
- **Moderation.** Text → two-layer text pipeline; on `block` HTTP 400 to client; on `queue` message is created with `moderation_status='pending'` and hidden from list queries (`AND (gm.moderation_status IS NULL OR gm.moderation_status = 'approved')`). Image → Cloud Vision SafeSearch BEFORE upload completes; on `block` or `review` returns HTTP 422 and writes to `moderation_queue`.
- **Push.** New message → inbox row of type `group_message` with `dedup_key=group_msg:<group_id>` (collapses many unread messages from one group into one inbox row). The push title is the group name and the body is `{sender_display_name}: {first 100 chars of text or "📷 Photo"}` (text >100 chars is truncated and suffixed with `…`, see `api/app/routers/group_messages.py:338-340`). Recipients filtered by `users.push_notifications_enabled = TRUE AND notify_group_messages = TRUE`; users with a row in `group_notification_mutes` for the group are pre-excluded at enqueue time.

### 4.8 Friends
- **What it does.** Search users by name/username/email. Send friend request (auto-accepts if the other side already requested). Accept/reject incoming requests. Remove friendship. Maintained as both `friendships` row (with `status`) and a denormalized `friend_edges` (A,B)+(B,A) table for fast mutual-friend joins. Blocking deletes the friendship in both tables.
- **Surfaces.** M (`screens/friends/FriendsScreen.tsx`, `components/friends/AddFriendModal.tsx`); B (`/friends`, `/friends/requests/incoming`, `/friends/search`, `/friends/requests` POST, `/friends/requests/{id}` PATCH, `/friends/{id}` DELETE).
- **Push.** Friend request → inbox `friend_request`, push title "New Friend Request", body `{requester_name} sent you a friend request`. Filtered by `notify_friend_requests = TRUE`.

### 4.9 Notifications inbox
- **What it does.** Server-authoritative notifications inbox (`notifications` table). Every notification is a row with `type`, optional `entity_id`, optional `dedup_key`, `read_at`. APNS badge = `COUNT(*) WHERE user_id = ? AND read_at IS NULL`. Mobile syncs the badge via `GET /notifications/unread-count` and clears slices via `POST /notifications/read` (e.g. on opening a group chat or the friends tab).
- **Notification types observed.** `group_message`, `friend_request`, `group_invite`, `group_approval_needed`, `group_approved`.
- **Preferences.** Three boolean prefs on `users`: `push_notifications_enabled` (master), `notify_group_messages`, `notify_friend_requests`. Group-level mute via `group_notification_mutes`.

### 4.10 Reporting & moderation
- **User-side reporting.** Kebab menu on posts, group messages, comments → `POST /reports` with `content_type` ∈ {post, group_message, comment} and `reason` ∈ {spam, harassment, hate_speech, inappropriate, misinformation, other}. Unique `(reporter_id, content_type, content_id)` constraint prevents duplicate reports (returns 409). Self-reports rejected (400).
- **Auto-moderation.** Two-layer text pipeline plus Cloud Vision SafeSearch on every uploaded image (avatars, group avatars, parish covers, group-message images). See §13 and `api/app/moderation/`.
- **Admin review queues.** App admins (`app_admins` table) review:
  - `/admin/moderation/queue` — content held by auto-moderation (auto-approve publishes the content row; auto-reject marks `parish_posts.status='Rejected'` or `group_messages.moderation_status='rejected'`).
  - `/admin/reports/queue` — user-submitted reports, sorted by per-content `report_count`. Reviewer can `decision='reviewed'` with `remove_content=true` to soft-delete the post (`parish_posts.status='Deleted'`), soft-delete the comment (`parish_post_comments.status='Deleted'`), or hard-delete the group message row.
- **Crisis path.** If Layer 2 (Claude) sets `crisis_indicators=true`, the API attaches `_moderation.crisis_resources` to the response so the mobile client can offer the user 988, Catholic Charities, the diocese family-life office, or their parish priest.
- **Surfaces.** M (kebab menu in `parish/ParishPostCard.tsx`, etc.); B (`/admin/moderation/*`, `/admin/reports/*`); W (`/admin/moderation`, `/admin/reports`).

### 4.11 Account deletion
- **What it does.** `Settings → Delete Account` → two-step Alert confirmation → `DELETE /users/me`. Server runs in a transaction: for every group the user admins, reassign to next-oldest member or delete the group; then stamp `moderation_queue.account_deleted_at = NOW()` for the user's rows (so the retention sweeper can purge them at the end of the +1-year safety window) and finally `DELETE FROM users WHERE id = ?`. The `moderation_queue.user_id` FK is `ON DELETE SET NULL`, so flagged-content audit rows survive deletion until the sweeper purges them. All other related rows cascade via FK (parish_posts, parish_post_comments, parish_post_comment_reactions, group_messages, group_message_reactions, group_invitations, prayer_group_members, group_notification_mutes, friendships, friend_edges, user_blocks, user_reports, notifications, user_device_tokens). Firebase user record on Firebase side is **not** deleted by this flow.
- **Web entry point.** `naveapp.co/delete` — required by Google Play's 2024 "deletion URL accessible without installing the app" rule. Page signs the user in (Firebase) and redirects to `/manage`, where the user can complete deletion in-account.
- **Surfaces.** M (`screens/profile/SettingsScreen.tsx`); B (`api/app/routers/users.py` — `DELETE /users/me`); W (`web/src/pages/DeletePage.tsx`).

---

## 5. User accounts and authentication

| Topic | Detail |
|------|--------|
| Sign-up methods | Apple (iOS only; conditional on `Platform.OS === 'ios'`), Google (iOS + Android), email + password. All three flows resolve to a Firebase ID token, then `POST /auth/firebase` mints the Nave JWT. |
| Sign-in methods | Same three methods; existing accounts can also be linked-by-email if a user previously had an email-based account and later signs in via Google/Apple with the same address (`auth.py:110-133`). |
| Identity verification | None beyond Firebase's email-confirmed sign-in. No phone, KYC, or government ID. |
| Account recovery | Forgot-password handled by Firebase Identity Toolkit (`PasswordResetScreen.tsx`). |
| Session token | Nave JWT, HS256, `sub=user_id`, 30-day expiry, signed with `SECRET_KEY` (Google Secret Manager). Stored in `AsyncStorage` on mobile (key `auth_token`) and `localStorage` on web (key `nave_jwt`). All API calls include `Authorization: Bearer <jwt>`. |
| Token revocation | None. JWT cannot be revoked early; logout = client-side delete only. (Account deletion deletes the user row; subsequent requests with a stale JWT will fail with 401 because `get_current_user` looks up the row.) |
| Multi-device | Multiple device tokens per user supported via `user_device_tokens` (unique on `(user_id, token)`). Push fans out to every registered token. |
| Account deletion path | In-app: Settings → Delete Account (mobile). Web: `naveapp.co/delete` page (sign-in gate → `/manage` for in-account deletion). The deletion URL is published and meets Google Play's policy. |
| Minimum age | 13. Enforced client-side in `ProfileSetupScreen.tsx` and **server-side** via Pydantic `field_validator` on `UserUpdate.birthday` in `api/app/models/user.py` (`MIN_AGE_YEARS = 13`). A direct API caller setting `birthday` to a date <13 years ago is rejected with a 422. |

---

## 6. Data collected — comprehensive inventory

> Apple/Google data-type taxonomy where applicable. "Linked" means tied to a user identifier in our database. "Tracking" uses Apple's definition (used to track across other companies' apps/sites).

| # | Data point | Apple/Google taxonomy | Collected | Source | Linked? | Tracking? | Purpose | Retention | Storage | Shared with |
|---|------------|----------------------|-----------|--------|---------|-----------|---------|-----------|---------|-------------|
| 1 | Email address | Contact Info — Email | Yes (sign-up) | User → Firebase → Nave API (`users.email`) | Yes | No | App functionality (account creation, friend search, account linking) | Until account deletion | `users` table; Firebase Auth | Firebase Auth (Google) |
| 2 | First / last name (display name) | Contact Info — Name | Yes | User input or OAuth provider; `users.display_name` | Yes | No | App functionality (display in feed, chat, profile) | Until account deletion | `users` | None (visible to other users in-app) |
| 3 | Username | Identifiers — User ID | Yes | Generated from name/email at sign-up; user-editable | Yes | No | App functionality | Until account deletion | `users.username` | None |
| 4 | Birthday | Sensitive Info — Other (no exact taxonomy match) — also age-gating data | Yes | User input at ProfileSetup (DATE, full Y-M-D) | Yes | No | Age gate (13+); app functionality | Until account deletion | `users.birthday` | None |
| 5 | Bio (free text) | User Content — Other User Content | Optional | User input | Yes | No | App functionality | Until account deletion | `users.bio` | None |
| 6 | Avatar photo | User Content — Photos | Optional | User upload (photo library) | Yes | No | App functionality | Until account deletion / replaced (best-effort GCS delete on replace) | GCS `nave-avatars/avatars/<user_id>/<uuid>.jpg` | Cloud Vision SafeSearch (per-upload moderation only) |
| 7 | Parish affiliation | User Content — Other User Content | Yes (required) | User selection | Yes | No | Core functionality (parish feed + group filtering) | Until account deletion | `users.parish_id` | None |
| 8 | Diocese | User Content — Other User Content | Optional (derived from parish if set; field also writable directly) | User input / parish join | Yes | No | App functionality | Until account deletion | `users.diocese` | None |
| 9 | Location (city / region free text) | User Content — Other User Content | Optional | User input | Yes | No | App functionality | Until account deletion | `users.location` | None |
| 10 | Posts (parish feed text) | User Content — Other User Content | Optional | User-generated | Yes | No | Core functionality | Until soft-delete (status='Deleted'), then retained indefinitely in DB unless purged | `parish_posts` | OpenAI Moderation API (text only, transient); Anthropic Claude API (text only, transient — see note) |
| 11 | Comments (on parish posts) | User Content — Other User Content | Optional | User-generated | Yes | No | Core functionality | Same as posts | `parish_post_comments` | OpenAI + Anthropic (transient) |
| 12 | Reactions (emoji on posts/comments/messages) | Usage Data — Product Interaction | Yes (when used) | User action | Yes | No | App functionality | Indefinite | `parish_post_reactions`, `parish_post_comment_reactions`, `group_message_reactions` | None |
| 13 | Group messages (text + image) | User Content — Messages, Photos | Optional | User-generated | Yes | No | Core functionality (private chat within prayer groups) | Indefinite (user can delete own; admin can delete any). Hard-deleted on review remove. | `group_messages`, GCS `group_messages/<group_id>/<msg_id>.<ext>` | OpenAI + Anthropic (text); Cloud Vision SafeSearch (image) |
| 14 | Prayer-group memberships | Usage Data — Product Interaction | Yes | User action | Yes | No | App functionality | Indefinite | `prayer_group_members` | None |
| 15 | Friend list | Identifiers — User ID | Yes (when used) | User action | Yes | No | App functionality | Indefinite (user can remove) | `friendships`, `friend_edges` | None |
| 16 | Block list | Identifiers — User ID | Yes (when used) | User action | Yes | No | App functionality (hide content from blocked users) | Indefinite (user can unblock) | `user_blocks` | None |
| 17 | Reports filed | Usage Data — Product Interaction | Yes (when used) | User action | Yes | No | Trust & safety | Indefinite | `user_reports` | None |
| 18 | FCM device token | Identifiers — Device ID (push token, not IDFA) | Yes | Device → API | Yes | No | App functionality (push) | Until logout, account deletion, token refresh, FCM invalidation, or **180 days of inactivity** (purged by retention sweeper based on `updated_at`). `updated_at` is bumped each time the client (re-)registers the token on app launch (`POST /notifications/device-token` → `ON CONFLICT … DO UPDATE SET updated_at = NOW()`); the in-place bump-on-delivery in `api/app/utils/push.py` is gated on a `conn` argument that the current sole caller (`api/app/utils/inbox.py:enqueue`) does not pass, so in practice the freshness signal is re-registration, not delivery — see **Open questions**. | `user_device_tokens` | Firebase Cloud Messaging / APNS / FCM-Android |
| 19 | Notification preferences (3 booleans + per-group mutes) | Usage Data — Product Interaction | Yes | User action | Yes | No | App functionality (honoring opt-in/opt-out) | Account lifetime | `users` flags + `group_notification_mutes` | None |
| 20 | Notifications inbox | Usage Data — Product Interaction | Yes | Server-generated | Yes | No | Delivering platform notifications to user | **90 days from `created_at`**, then purged by retention sweeper | `notifications` | None |
| 21 | Firebase UID | Identifiers — User ID (third-party) | Yes | Firebase Auth | Yes | No | Account linkage | Until account deletion | `users.firebase_uid`; Firebase Auth | Firebase / Google |
| 22 | Application logs (Cloud Run stdout/stderr) | Diagnostics — Performance Data / Other Diagnostic Data | Yes | Server | Yes, where the app logs identifiers (user ID, request ID, IP) | No | Debugging, error investigation, performance monitoring, abuse detection. Lawful basis: legitimate interest (GDPR Art. 6(1)(f)). | 30 days (GCP `_Default` Cloud Logging bucket) | Google Cloud Logging | None |
| 23 | HTTP request/access logs | Diagnostics — Other Diagnostic Data | Yes | Server middleware | Yes, indirectly — IP, user-agent, URL, timestamp, authenticated user_id where available | No | Security monitoring, abuse detection, debugging, rate-limit enforcement. Legitimate interest. | 30 days (`_Default` bucket) | Google Cloud Logging | None |
| 24 | Cloud audit logs (Admin Activity, System Event, Access Transparency) | Diagnostics — Other Diagnostic Data | Yes (for staff/admin actions, not for end users) | GCP | Service-account / staff identity performing the action | No | Security audit trail, compliance, incident investigation. Legal obligation + legitimate interest. | 400 days (fixed by GCP `_Required` bucket; not configurable) | Google Cloud Logging | None |
| 25 | Notification delivery logs | n/a | **Not stored** by Nave. FCM/APNS may retain transient delivery counters server-side; Nave does not persist per-send logs. | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| 26 | Server moderation audit (Layer 1 + Layer 2 results, image SafeSearch scores, snapshot of flagged content) | Diagnostics + User Content (flagged snapshot) | Yes (when content is flagged or queued) | Server | Yes (linked to user_id while account is live; FK becomes NULL after account deletion, with `account_deleted_at` stamped) | No | Platform safety, abuse prevention, appeals. Legitimate interest (GDPR Art. 6(1)(f)); security/integrity exemption (CCPA §1798.105(d)(2)). | **Account lifetime + 1 year** (purged by retention sweeper after `account_deleted_at < NOW() - INTERVAL '1 year'`) | `moderation_queue` | None |
| 27 | Reported content snapshots (status `reviewed` / `dismissed`) | User Content | Yes (when reported) | Server | Yes (via author + reporter) | No | Moderation review, appeals. Legitimate interest (GDPR); legal compliance (DSA). | **90 days after case closure** (`reviewed_at`), purged by retention sweeper | `user_reports` | None |
| 28 | Error and crash reports | Diagnostics — Crash Data | Yes | Mobile (Firebase Crashlytics, iOS) + server (Google Cloud Error Reporting via Cloud Logging) | Yes — mobile records opaque `user_id` only (no email/display name); server stack traces include user IDs where present in log context | No | Debugging, stability monitoring. Legitimate interest. | 90 days | Firebase Crashlytics (mobile) / Google Cloud Error Reporting (backend) | None new — already-disclosed Google/Firebase processors |
| 29 | Web JWT (`nave_jwt` localStorage) | Identifiers — User ID | Yes (web sign-in only) | Server | Yes | No | Web admin auth | Until logout / 30 days expiry | Browser localStorage | None |

**Data NOT collected** (verified absent from code/configs):
- Precise location / GPS — no `react-native-geolocation` or `expo-location`; the iOS `NSLocationWhenInUseUsageDescription` key has been removed from `Info.plist`.
- Approximate location.
- Health & fitness data, HealthKit, Google Fit.
- Financial / payment information — no Stripe, RevenueCat, Apple IAP, Google Play Billing libraries in `package.json`.
- Contacts / address book.
- IDFA, GAID, advertising identifiers — no `react-native-tracking-transparency`, no AdSupport framework usage.
- SMS / phone number.
- Browsing history, search history outside the app.
- Microphone, camera (image picker uses photo library only — `react-native-image-picker` `launchImageLibrary` flow).

---

## 7. Third-party services and SDKs

> All SDKs read off `app/package.json`, `app/ios/Podfile`, `web/package.json`, and `api/requirements.txt`. Versions captured 2026-05-09.

### Mobile SDKs

| SDK | Vendor | Purpose | Where | Data sent | Data received | Vendor privacy URL | Role |
|-----|--------|---------|-------|-----------|---------------|--------------------|------|
| `@react-native-firebase/app` ^24.0.0, `@react-native-firebase/messaging` ^24.0.0 | Google (Firebase) | Push notifications via FCM (delivery to device); Firebase Admin SDK on server uses the same project. | M iOS+Android | Device FCM token, notification payloads | Push messages, token-refresh events | https://firebase.google.com/support/privacy | Service provider (processor) |
| `@react-native-firebase/crashlytics` ^24.0.0 | Google (Firebase) | Mobile crash reporting (iOS via Firebase Crashlytics). | M iOS+Android | Stack traces, device + OS info, app version, opaque user ID set in code (no email/display name) | — | https://firebase.google.com/support/privacy | Service provider (processor) |
| `api.pwnedpasswords.com` (Have I Been Pwned range API) | Troy Hunt / HIBP | Password breach check during email/password sign-up (k-anonymity: only the first 5 hex chars of SHA-1(password) are sent). Called from `app/src/lib/passwordValidation.ts:44`. | M iOS+Android (during email sign-up only) | 5-char SHA-1 prefix of the candidate password | List of suffix+count pairs for matching breached hashes | https://haveibeenpwned.com/Privacy | Independent third party (privacy-preserving API; no account data transmitted) |
| `@react-native-google-signin/google-signin` ^13.0.0 | Google | Google Sign-In OAuth on mobile | M iOS+Android | Reverse-client-ID OAuth, returns idToken to client; idToken sent to Firebase Identity Toolkit, then to Nave | Google account info (sub, email, name, picture) | https://policies.google.com/privacy | Independent third party (auth provider) |
| `@invertase/react-native-apple-authentication` ^2.4.0 | Invertase / Apple | Sign in with Apple | M iOS only | Apple-issued identityToken | Identity token, optional name+email on first sign-in | https://www.apple.com/legal/privacy/ | Independent third party (auth provider) |
| `@notifee/react-native` ^9.1.8 | Invertase | Local notification UI + setting the iOS app icon badge | M iOS+Android | None outbound (local device only) | — | https://invertase.io/legal/privacy | Local SDK (no off-device data) |
| `@react-native-async-storage/async-storage` ^2.1.2 | React Native Community | Local key-value storage (auth token, cached user/parish) | M | Local only | — | n/a — local | Local SDK |
| `@react-native-clipboard/clipboard` ^1.16.3 | React Native Community | Clipboard read/write (e.g. share group invite link) | M | Local only | — | n/a — local | Local SDK |
| `@react-native-community/blur` ^4.4.1 | RN Community | Visual blur for tab bar | M | Local only | — | n/a | Local SDK |
| `@react-native-community/image-editor` ^4.3.0 | RN Community | Avatar crop UX | M | Local only | — | n/a | Local SDK |
| `@react-navigation/*` | React Navigation | Navigation | M | Local only | — | n/a | Local SDK |
| `@shopify/flash-list` 2.0.2 | Shopify | High-performance list virtualization | M | Local only | — | n/a | Local SDK |
| `expo` ~55.0.0, `expo-image` ~55.0.9, `expo-crypto` ~55.0.14 | Expo / 650 Industries | RN tooling (image rendering, hash for password k-anonymity check) | M | `expo-crypto` is local; `expo-image` issues HTTPS GETs to GCS signed URLs; no telemetry from these specific Expo modules | Image bytes from GCS | https://expo.dev/privacy | Local + transit only |
| `react-native` 0.83.9 | Meta | Core framework | M | n/a | n/a | https://privacy.fb.com/policies/ | Local |
| `react-native-config` ^1.6.1 | Mike Hardy | Build-time env vars | M | Local only | — | n/a | Local SDK |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-vector-icons`, `react-native-linear-gradient`, `react-native-image-picker` | Various OSS | UI primitives, gestures, animations, image picker | M | Local only | — | n/a | Local SDK |
| `zustand` ^4.5.2 | OSS | State store | M | Local only | — | n/a | Local SDK |
| `date-fns` ^3.6.0 | OSS | Date formatting | M | Local only | — | n/a | Local SDK |
| `detox` ^20.50.1 (devDep), `jest` ^30.3.0 (devDep) | OSS | E2E testing, unit testing | M (dev only) | Not shipped to production builds | — | n/a | n/a |

### Backend services (server-side)

| Service | Vendor | Purpose | Data sent | Data received | Privacy URL | Role |
|---------|--------|---------|-----------|---------------|-------------|------|
| Neon serverless Postgres (`*.aws.neon.tech`) | Neon Inc. | Primary database, hosted on AWS us-east-1 | All user data (see §6) | Query results | https://neon.tech/privacy | Service provider (processor) |
| Google Cloud Run | Google | API hosting | App traffic, env vars, logs | — | https://cloud.google.com/terms/cloud-privacy-notice | Service provider |
| Google Cloud Storage (`nave-avatars` bucket, project `nave-a0989`) | Google | Image storage (avatars, group avatars, parish covers, group-message images) | Image bytes | Stored objects, signed URLs | https://cloud.google.com/terms/cloud-privacy-notice | Service provider |
| Google Cloud Vision API (SafeSearch) | Google | Image moderation (every image upload) | Image bytes | Likelihood scores per category | https://cloud.google.com/terms/cloud-privacy-notice | Service provider |
| Google Cloud Logging | Google | Structured server logs | HTTP traces, exceptions | — | https://cloud.google.com/terms/cloud-privacy-notice | Service provider |
| Google Secret Manager | Google | Secrets storage | n/a | Secret values to Cloud Run | https://cloud.google.com/terms/cloud-privacy-notice | Service provider |
| Firebase Authentication | Google | Sign-in (Google, Apple, email/password) | Email, OAuth tokens, password hashes | Firebase UID, ID token | https://firebase.google.com/support/privacy | Service provider (and auth provider for users whose data Apple/Google forwards through Firebase) |
| Firebase Cloud Messaging | Google | Push delivery | Title, body, data payload, recipient FCM token | Delivery receipt counts; invalid-token errors | https://firebase.google.com/support/privacy | Service provider |
| OpenAI Moderation API (`omni-moderation-latest`) | OpenAI | Text moderation Layer 1 | User-generated text only (post body / comment / message). No user identifier sent. | Per-category scores | https://openai.com/policies/privacy-policy | Service provider |
| Anthropic Claude API (`claude-haiku-4-5`) | Anthropic, PBC | Text moderation Layer 2 | User-generated text only + the moderation policy in `policy.md`. Note: the system prompt is sent with `cache_control: ephemeral` for prompt caching. | JSON decision/category/confidence/reasoning | https://www.anthropic.com/legal/privacy | Service provider |
| GitHub Actions (CI) | GitHub / Microsoft | API deploy pipeline (Workload Identity Federation to GCP) | Source, build artifacts | n/a | https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement | Service provider (no user data) |

### Web SDKs

| SDK | Vendor | Purpose | Privacy URL |
|-----|--------|---------|-------------|
| `firebase` ^10.12.0 (web modular: `firebase/app`, `firebase/auth`) | Google | Web sign-in (Google + Apple OAuth via Firebase) | https://firebase.google.com/support/privacy |
| `react-router-dom` ^6.23.1, `react`, `react-dom` | OSS | Routing / UI | n/a |
| Google Fonts (Playfair Display, Inter) loaded via `<link rel="stylesheet">` from `fonts.googleapis.com` | Google | Web fonts. Note: this **does** transmit the user's IP and User-Agent to Google when the page loads — disclosed because it is a third-party network request originated by the page. | https://policies.google.com/privacy |

No analytics, no marketing pixels, no chat widgets, no cookie consent banner, and no third-party error monitoring (Sentry/Bugsnag/Datadog) detected anywhere in the repo. Crash/error data flows to Firebase Crashlytics (mobile) and Google Cloud Error Reporting (backend), both within the existing Google/Firebase processor relationships.

---

## 8. Permissions (mobile)

> Only enumerate permissions actually surfaced; iOS-style usage strings included verbatim.

| Platform | Permission | Trigger | Usage string | Used for | Graceful degradation |
|----------|-----------|---------|---------------|----------|----------------------|
| iOS | `NSPhotoLibraryUsageDescription` | First "upload avatar / cover / group avatar / send photo in chat" tap | "Nave needs access to your photos to set your profile picture." | Picking images from the photo library via `react-native-image-picker` | Yes — the upload flow simply doesn't run without the photo. Other features unaffected. |
| iOS | Push notifications (UNUserNotificationCenter via Firebase Messaging) | On first authenticated launch, `registerPushToken()` calls `requestPermission()` | System-controlled; no custom string | Receiving group-message / friend-request / group-invite pushes | Yes — denial just suppresses pushes; user can still toggle in Settings. |
| iOS | Sign in with Apple capability | Welcome screen "Continue with Apple" button | Apple-controlled flow | Sign-in | Yes — user can choose Google or email instead. |
| Android | `android.permission.INTERNET` | All network requests | n/a | Network access | Required, not optional. |
| Android | `android.permission.POST_NOTIFICATIONS` (Android 13+) | First authenticated launch — system permission prompt on Android 13+ | n/a | Push delivery (group messages, friend requests, group invites/approvals) | Yes — denial suppresses pushes only; in-app inbox + badge still drive UX. |

---

## 9. Payments, subscriptions, monetization

**Not applicable.** Nave is a free app; the codebase contains no payment, IAP, RevenueCat, Stripe, Play Billing, paywall, subscription, or pricing logic. No `StoreKit`, no `react-native-iap`, no `@stripe/*` libs. App Store and Google Play submissions should select "Free" with no in-app purchases. Apple's "Sign in with Apple" requirement therefore does not need to be re-evaluated for IAP flows — it is correctly offered alongside Google sign-in per Apple guideline 4.8.

---

## 10. Content and user-generated content

| Topic | Detail |
|------|--------|
| What users can create | Profile (display name, username, bio, avatar). Parish posts (text). Comments on parish posts (1–1000 chars). Group messages (text ≤2000 chars and/or image ≤10 MB JPEG/PNG/WebP). Reactions (fixed emoji set). Prayer groups (name, description, category, schedule, group avatar). Friend requests, blocks, reports. |
| Visibility | Avatar & profile: visible to any signed-in user. Parish feed posts and comments: visible to any signed-in user (the API returns by `parish_id` with no membership check — this is intentional, so users can see other parishes' feeds). Group messages: only members of that prayer group. Direct messages between users: not implemented. |
| Moderation approach | Pre-moderation (auto): see §13. Human review queue (`/admin/moderation/queue`) for queued items. User reports (`/admin/reports/queue`) processed by app admins. |
| Ownership | User retains ownership; the Terms of Service (`<TODO: ToS not yet drafted>`) should grant Nave a worldwide, royalty-free license to host, display, modify (for moderation/cropping/resizing), and distribute UGC within the app for the purpose of operating the service. |
| Takedown / DMCA | Designated Copyright Agent: Jordan Hoeber, jordan@cornerstonedev.co, (716) 347-5307, 418 Broadway Ste N, Albany, NY 12207 (`web/src/pages/DmcaPage.tsx:3-8`).
| Storage / CDN | Postgres for text; GCS for images. Signed URLs (V4, 7-day TTL, in-process cached for 6d23h) used for image fetches — there is no public CDN. |

---

## 11. Communications and messaging

| Channel | Content | Consent / opt-out |
|---------|---------|-------------------|
| Transactional email | None sent by Nave directly. Firebase Auth sends password-reset emails when users invoke the forgot-password flow. | Implicit (user-initiated). |
| Marketing email | None. No newsletter subscription or marketing list captured anywhere in the repo. | n/a |
| SMS | None. | n/a |
| Push notifications | Categories observed: `group_message`, `friend_request`, `group_invite`, `group_approval_needed`, `group_approved`. APNS payload includes title, body, custom data, sound:default, per-recipient badge. Android: high priority. | OS-level (system permission) + app-level (`push_notifications_enabled`, `notify_group_messages`, `notify_friend_requests`, per-group mute). |
| In-app messaging between users | Group chat only (no 1:1 DMs). Messages are server-stored; **NOT** end-to-end encrypted. Server has plaintext access (and by design — used for moderation). | Disclose explicitly in privacy policy. |

---

## 12. Security

| Topic | Detail |
|------|--------|
| Encryption in transit | TLS for all client→API traffic (Cloud Run terminates TLS); for all API→GCS, API→Firebase, API→OpenAI, API→Anthropic, API→Vision (HTTPS endpoints). Mobile ATS enabled; cleartext disallowed except `NSAllowsLocalNetworking` for dev. |
| Encryption at rest | Postgres on Neon — Neon encrypts disks at rest by default (vendor-managed). GCS — Google-managed encryption at rest by default. Application-level field encryption: none. |
| Auth mechanism | Firebase Auth (email + Google + Apple); Nave JWT (HS256) issued by API. Passwords hashed by Firebase (not by Nave); legacy `users.password_hash` column exists in schema but is no longer written. |
| Session management | 30-day JWT TTL, no refresh-token endpoint, no per-device session tracking, no remote revocation. |
| Authorization model | Three role tiers: regular user; parish admin (`parish_admins`); app admin (`app_admins`). Parish admins can edit their parish + post announcements + delete content within the parish; app admins have global access to moderation queues, reports, and parish CRUD. Group ownership is per-group via `prayer_groups.admin_id`. |
| Secret management | GCP Secret Manager; secrets injected into Cloud Run as env vars at deploy. Local `api/.env` and `api/.env.local` contain real credentials (DATABASE_URL, SECRET_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, OPENAI_API_KEY, ANTHROPIC_API_KEY) and are gitignored (not committed). |
| Vulnerability disclosure | navetsecurity@cornerstonedev.co. `/.well-known/security.txt` is published on naveapp.co pointing at this address. |
| Logging / audit | Stdout structured logs from FastAPI middleware (`api/app/main.py:62-86`); Cloud Logging retains them per GCP defaults. Admin actions (parish CRUD, moderation review, report review) emit info-level logs but are not persisted in a separate audit table. |
| Backup / recovery | Neon's branch + point-in-time recovery (vendor default). No app-level backup scripts. |
| Compliance certifications | None |

---

## 12a. Data retention

Authoritative retention policies (source: implementation in `api/app/retention/sweep.py`, schema migration `api/alembic/versions/20260510_0001_retention_cleanup.py`, and Cloud Run Job `nave-retention-sweep` deployed by `.github/workflows/deploy-api.yml`). _Previously cross-referenced `info/info.md`; that companion file was removed — this section is now the single source of truth._

| Data type | Linked to user | Purpose | Retention | Legal basis | Enforcement |
|---|---|---|---|---|---|
| Moderation action records (`moderation_queue`) | Yes (FK becomes NULL on account deletion; `account_deleted_at` stamped at the same moment) | Platform safety, abuse prevention, appeals | **Account lifetime + 1 year** | Legitimate interest (GDPR Art. 6(1)(f)); security/integrity exemption (CCPA §1798.105(d)(2)) | `sweep_moderation_records` — `DELETE … WHERE account_deleted_at IS NOT NULL AND account_deleted_at < NOW() - INTERVAL '1 year'`. Index `idx_mq_account_deleted`. |
| Reported content snapshots (`user_reports`) | Yes (via author/reporter) | Moderation review, appeals | **90 days after case closure** (`status IN ('reviewed','dismissed') AND reviewed_at < NOW() - INTERVAL '90 days'`) | Legitimate interest (GDPR); legal compliance (DSA) | `sweep_reported_content`. Index `idx_user_reports_closed`. |
| Notification records / inbox (`notifications`) | Yes | Delivering platform notifications | **90 days from `created_at`** | Legitimate interest | `sweep_notifications`. Index `idx_notifications_created_at`. |
| Push notification device tokens (`user_device_tokens`) | Yes | Delivering push notifications | Until logout, account deletion, token invalidation, **or 180 days of inactivity**. In practice `updated_at` is currently refreshed when the client (re-)registers the token on app launch (`POST /notifications/device-token` upserts `updated_at = NOW()`); the bump-on-delivery branch in `api/app/utils/push.py:send_push_notifications` activates only when callers pass `conn`, and the only caller today (`api/app/utils/inbox.py:enqueue`, line 94) does not — see **Open questions**. | Legitimate interest | `sweep_device_tokens` — `DELETE … WHERE updated_at < NOW() - INTERVAL '180 days'`. Index `idx_udt_updated_at`. Tokens shared with: APNS, FCM-Android. |
| Notification delivery logs | n/a | n/a — Nave does not store per-send delivery logs | n/a | n/a | n/a |
| Notification preferences (3 user flags + per-group mutes) | Yes | Honoring user opt-in/opt-out | **Account lifetime** | Contract performance | None (cascades on user delete) |
| Application logs (Cloud Run stdout/stderr) | Yes (where the app logs identifiers — user ID, request ID, IP) | Debugging, error investigation, performance monitoring, abuse detection | **30 days** (GCP `_Default` Cloud Logging bucket) | Legitimate interest (GDPR Art. 6(1)(f)) | GCP-managed. |
| HTTP request/access logs | Yes, indirectly (IP, user-agent, URL, timestamp, authenticated user_id where available) | Security monitoring, abuse detection, debugging, rate-limit enforcement | **30 days** (`_Default` bucket) | Legitimate interest (security and platform integrity) | GCP-managed. |
| Cloud audit logs (Admin Activity, System Event, Access Transparency) | Yes for staff/admin actions; not for end users (service-account or staff identity) | Security audit trail, compliance, incident investigation | **400 days** (fixed by GCP `_Required` bucket; not configurable) | Legal obligation, legitimate interest | GCP-managed. |
| Error and crash reports | Yes, where stack traces include user-scoped data (user ID, session ID, device info, app version) | Debugging, stability monitoring | **90 days** | Legitimate interest | Firebase Crashlytics (mobile, iOS) + Google Cloud Error Reporting (backend, via `google-cloud-logging` on Cloud Run). Mobile records opaque `user_id` only. |

**Retention sweeper.** `python -m app.retention.sweep` runs as Cloud Run Job `nave-retention-sweep`, triggered daily by Cloud Scheduler (one-time setup outside CI). Each policy `DELETE`s in batches of 1000 with a per-run cap of 10,000 batches; failures in one policy are logged and the next policy still runs. The job is idempotent and re-entrant.

**Out of scope for the sweeper** (handled by other mechanisms or explicitly indefinite):
- Live user-generated content (posts, comments, group messages, reactions) — retained for the lifetime of the account; soft-deleted posts retained until manual purge; group messages can be hard-deleted by author or admin or by report-review removal.
- Avatars, group avatars, parish covers, group-message images in GCS — best-effort delete on replace; no bucket-level lifecycle policy for orphans (intentional — current orphan volume is acceptable).
- Friendships, blocks, group memberships — cascade-deleted with the user row.

---

## 13. Compliance posture

| Area | Status |
|------|--------|
| **CCPA / CPRA** | Likely applicable if app reaches CA users at threshold. No "sale" of personal information observed (no ad networks, no data brokers). Sharing with subprocessors only. **Required follow-ups:** "Do Not Sell or Share" link on the marketing site (currently absent), GPC honoring (web), sensitive PI (birthday → age) handling disclosure, opt-out of advertising (none — n/a). |
| **COPPA** | App declares 13+. Hard age gate at sign-up: enforced **client-side** in `ProfileSetupScreen.tsx` and **server-side** in `api/app/models/user.py` via the `birthday_meets_minimum_age` Pydantic validator (`MIN_AGE_YEARS = 13`); a direct API caller setting `birthday` to a younger date is rejected 422. Marketing must not target under-13 (current copy looks compliant). If a child slips through, admin-initiated deletion is implemented (`DELETE /admin/users/{id}` in `api/app/routers/admin_users.py`) alongside self-deletion via `DELETE /users/me`. |
| **HIPAA** | Not applicable. No protected health information collected, no provider relationship. (Users may discuss health in prayer requests; this is user-generated content, not PHI under HIPAA's definition because Nave is not a covered entity / business associate.) |
| **PCI DSS** | Not applicable. No card data is processed by Nave. |
| **Accessibility** | No explicit a11y audit. RN components + Ionicons + system fonts mixed with custom fonts (CormorantGaramond, Montserrat). |
| **Export compliance** | The app uses HTTPS/TLS only (no proprietary cryptography, no encryption with non-standard algorithms). `ITSAppUsesNonExemptEncryption = false` is set in `app/ios/Nave/Info.plist:40`, so the app claims the standard-encryption exemption. |
| **HealthKit / Google Fit** | Not used. No entitlements, no SDK references. |

---

## 14. Age rating signals

> For Apple's questionnaire and Google's content rating questionnaire — based on actual product behavior.

| Question | Answer | Evidence |
|----------|--------|----------|
| Cartoon or fantasy violence | None | No game content. |
| Realistic violence | None | n/a |
| Profanity or crude humor | **Infrequent / mild** at most. Nave's moderation policy explicitly **blocks** profanity and vulgar language (`api/app/moderation/policy.md`), but moderation is imperfect — UGC could leak through pre-moderation. | `policy.md` |
| Mature/suggestive themes | **Infrequent / mild.** Prayer requests legitimately discuss grief, suicidal struggle (in past tense or in others), addiction. Sexual content is policy-blocked. | `policy.md` "Welcomed" / "Rejected" |
| Sexual content / nudity | None | Hard-blocked by both text policy and image SafeSearch (`adult >= LIKELY → block`). |
| Horror / fear themes | None | n/a |
| Medical / treatment information | None | Users can discuss health prayer requests; not medical advice. |
| Alcohol, tobacco, drug references | **Infrequent / mild** — discussion of overcoming addictions explicitly allowed in prayer requests. | `policy.md` |
| Gambling | None | n/a |
| Unrestricted web access | None | App contains in-app browsing only via `Linking.openURL` for ToS/Privacy/email links. |
| User-generated content | **Yes.** Parish posts, comments, group messages, profile bios. Moderated: report-and-review (user reports + auto-pre-moderation). | §10 |
| Social interaction (chat, friends) | **Yes.** Group chat between members; friends list. No 1:1 DMs. | §4 |
| Targeted Apple/Google rating | **iOS 12+** (Apple) and **Teen** (Google). |

---

## 15. App store metadata draft

> Lengths verified against current limits (Apple 2026, Google Play 2026).

### 15.1 Apple App Store

| Field | Limit | Draft |
|-------|-------|-------|
| App name | ≤ 30 char | `Nave: Catholic Community` |
| Subtitle (3 candidates) | ≤ 30 char each | `Where the faithful gather`  |
| Promotional text | ≤ 170 char | `Connect with your home parish, join prayer groups — bible study, men's, women's, young adults — and stay close to your Catholic community wherever you go.` |
| Description | ≤ 4000 char | See §16.4 ("Marketing description draft") below; can be lifted directly. |
| Keywords field | ≤ 100 char comma-separated, no spaces, singular | `catholic,prayer,parish,bible,scripture,faith,christian,community,group,mass,saint,church` (90 chars) |
| Primary category | — | **Lifestyle** (best match in App Store taxonomy for faith-and-community apps) |
| Secondary category | — | **Social Networking** |
| Support URL | — | https://naveapp.co/support |
| Marketing URL | — | https://naveapp.co |
| Privacy policy URL | — | https://naveapp.co/privacy (currently a `ComingSoonPage` — `<TODO: publish before submission>`) |
| Copyright | — | `© 2026 Cornerstone Dev LLC` |
| First / last name (App Review contact) | — | Jordan Hoeber |
| Email (App Review contact) | — | jordan@cornerstonedev.co |
| Phone (App Review contact) | — | (716) 347-5307 (same number used for the DMCA designated agent in `web/src/pages/DmcaPage.tsx`) |
| Demo account | — | Required because the app requires sign-in. |
| Review notes | — | Draft: "Nave is a Catholic prayer-community app. Sign in with the provided demo account, then tap Community for the parish feed, Groups for prayer-group discovery, Friends for the friends tab, and Profile for settings. All UGC is auto-moderated; flagged content is held until reviewed by our admin team. The app contains no in-app purchases and no third-party advertising." |
| Sign in with Apple | — | Required (app offers Google + email sign-in) — already implemented. |
| Export compliance (`ITSAppUsesNonExemptEncryption`) | — | `false` (standard HTTPS only) — set in `Info.plist`. |
| Content rights declaration | — | Yes, we have rights to all third-party content (none used in-app). |
| In-app purchases | — | None. |
| Required device capabilities | — | `arm64`. |
| Supported languages / locales | — | English (en). |
| App Privacy "Nutrition Label" — Data linked to user | — | See §6: Email, Name, Username, User ID (Firebase UID, FCM token), Photos (avatar + uploaded images), User Content (posts, comments, messages, reactions), Other User Content (parish, diocese, location, bio, birthday). |
| App Privacy — Data NOT linked to user | — | None — all collected data is associated with the account. |
| App Privacy — Data used for tracking | — | **None.** `NSPrivacyTracking = false`. |
| App Privacy — Purposes per data type | — | App Functionality only (no Analytics, no Personalization, no Advertising, no Product Personalization tied to ad networks, no Fraud Prevention beyond moderation, no Other). |

### 15.2 Google Play

| Field | Limit | Draft |
|-------|-------|-------|
| App title | ≤ 30 char | `Nave: Catholic Community` (24) |
| Short description | ≤ 80 char | `Catholic prayer groups, parish community, and friends — for the faithful.` (72) |
| Full description | ≤ 4000 char | Same as §16.4. |
| App category | — | **Social** (closest fit; alternatives: Lifestyle) |
| Tags | — | `Faith`, `Community`, `Prayer`, `Catholic` |
| Contact email | — | nave@cornerstonedev.co |
| Contact website | — | https://naveapp.co |
| Privacy policy URL | — | https://naveapp.co/privacy (publish first) |
| Account deletion URL | — | https://naveapp.co/delete (`web/src/pages/DeletePage.tsx` — public sign-in gate that routes authenticated users to `/manage` for deletion). Satisfies Google Play 2024 "deletion URL accessible without installing the app" rule. |
| Ads declaration | — | **Contains no ads.** |
| Target age | — | 13+. |
| Data Safety form (per data type) | — | See §6 — every collected type is **required** for app function and **encrypted in transit**. None is "shared" with third parties for purposes outside service-provider role. Users can request data deletion in-app (Settings → Delete Account). |
| Permissions justification | — | INTERNET — required for app/server communication. POST_NOTIFICATIONS (when added) — to deliver group/friend pushes the user has opted into. Photo library access (system-managed picker) — to set avatar / send images in chat. |

---

## 16. Marketing website content source

### 16.1 Hero headline candidates
1. **Where Catholics Gather, Pray, and Grow** (current homepage h1; "Gather," and "Pray," are rendered italic in the accent color — `web/src/pages/LandingPage.tsx:90-95`)
2. The central body of the Church, in your pocket.
3. Your parish, your prayer groups, your people.

### 16.2 Subhead candidates
- "Nave brings the central body of the Church to your phone — connecting you with your parish, prayer groups, and fellow Catholics near and far." (current homepage)

### 16.3 Feature blocks (one per major feature)

| Icon idea | Headline | Description |
|-----------|----------|-------------|
| Chapel front | **Parish Community** | Choose your home parish and connect with a local feed. Read parish announcements, share reflections, and engage with parish life. |
| Group of figures | **Prayer Groups** | Browse, join, or start small groups: bible study, men's, women's, young adults, families, and more. Public or private — your choice. |
| Speech bubble | **Group Chat** | Every group has a dedicated chat. Share intentions, react with emoji, send a photo from a retreat — and stay close between meetings. |
| Heart + cross | **Friends** | Find Catholics by name, send friend requests, and build a network of people who pray with you. See mutual friends and shared groups. |
| Bell | **Quiet by default** | Mute groups you don't need pings from. Choose which notifications you receive — friend requests, group messages, or both. |
| Shield | **A welcoming space** | Every post and comment is screened by a Catholic-aware moderation policy. Crisis support resources surface when someone's struggling. |

### 16.4 Marketing description draft (≤ 4000 char — fits both Apple and Play)

> Nave is a Catholic prayer-community app, built for the faithful and those drawn to the faith.
>
>
> **Find your parish.** Pick your home parish from a directory of parishes across the country. Get parish announcements and a community feed where members share reflections, prayers, and parish life.
>
> **Join prayer groups.** Browse and join small groups — bible study, men's, women's, young adults, families. Or start your own. Public groups are open to anyone; private groups are for your inner circle. Each group has its own chat for staying close between meetings.
>
> **Pray together.** Share intentions, react with emoji, send a photo from a retreat. Group chat keeps your community connected, and you can mute any group anytime.
>
> **Make Catholic friends.** Search by name, send a friend request, see mutual friends and shared groups. Build a network of people who pray with you.
>
> **A welcoming space.** Every post and comment is screened by a Catholic-aware moderation policy that protects sacred space without suppressing real prayer requests. When someone signals crisis, Nave surfaces 988, Catholic Charities, your diocese, and your parish priest.
>
> Free. Available on iPhone and Android. For ages 13 and up.


### 16.6 FAQ source

| Q | A |
|---|---|
| Is Nave free? | Yes. Free on iOS and Android, no ads, no in-app purchases. |
| What ages is Nave for? | 13 and up. We hard-block sign-up for users under 13. |
| Is Nave only for Catholics? | Nave is built for practicing Catholics and those exploring the Catholic faith. The community standards reflect that. |
| Are messages end-to-end encrypted? | No. Group messages are stored on Nave's servers so they can be moderated against our community policy. They are encrypted in transit (TLS) and at rest (provider-managed). |
| Will my email be public? | No. Other members see your display name and username. Email is used to sign you in. |
| Can I delete my account? | Yes. Settings → Delete Account in the app. This removes your profile, posts, comments, messages, and friend connections. |
| Who runs Nave? | Cornerstone Dev LLC. |
| How are posts moderated? | Every post and comment is screened by a two-stage automated pipeline trained on a Catholic-specific policy, plus a human admin queue for edge cases. Users can also report content. |
| What does "Nave" mean? | The nave is the central body of a Catholic church — the space where the faithful gather. |

### 16.7 CTA copy
- Primary: **Download on the App Store** / **Get it on Google Play**
- Secondary (current homepage): "Sign In" → `/signin` (web admin / management)

### 16.8 Footer links inventory
- Support → `/support` (FAQ + `nave@cornerstonedev.co` contact)
- Privacy Policy → `/privacy` (currently `ComingSoonPage`)
- Terms of Service → `/terms` (currently `ComingSoonPage`)
- DMCA → `/dmca` (live)
- (Recommended additions: App Store badge, Play Store badge once apps ship.)

---

## 17. Glossary

| Term | Definition (use consistently across legal, marketing, store) |
|------|--------------------------------------------------------------|
| Nave | The mobile app and the brand. |
| Cornerstone Dev LLC | The publisher / legal entity behind Nave. |
| Parish | A real-world Catholic parish; users select one as their "home parish" during onboarding. |
| Diocese | Geographic / ecclesiastical grouping of parishes; derived from parish data. |
| Prayer group | A small in-app group around a specific category (rosary, scripture, men's, etc.). Has an admin, members, and a chat. |
| Public group / Private group | Public = anyone may join; Private = admin must approve each request. |
| Group admin | The user who created the group (or a transferred successor). Can edit metadata, approve members, remove members, delete the group. |
| Parish admin | A user granted edit rights for a specific parish (`parish_admins`). |
| App admin | A user granted global moderation/admin rights (`app_admins`). |
| Parish post | A text post on the parish community feed. |
| Announcement | A parish post flagged `is_announcement=true`; only parish admins can post one. |
| Comment | A reply to a parish post (1–1000 chars). May reply to another comment via `reply_to_id`. |
| Reaction | An emoji reaction (👍 🙏 ❤️ for posts/comments; six emojis for group messages). |
| Group message | A message in a prayer group chat (text and/or image). |
| Friend / friend request | Bilateral relationship between two users. Requests are pending → accepted/rejected. |
| Block | One-directional hide-and-cut: removes friendship and prevents further interaction. |
| Report | A user's flag against a post / comment / group message for review. |
| Crisis indicator | A Layer-2 moderation signal that the author may be in imminent danger; triggers the in-app crisis-resources card. |
| Inbox notification | A row in `notifications` representing one logical alert; the badge equals unread count. |

---

## 18. Open source attributions

> Top-level production dependencies that ship with the apps. The mobile app already exposes a curated "Open Source Notices" screen at Settings → About Nave → Open Source Notices (`app/src/screens/profile/OpenSourceNoticesScreen.tsx`); the same content is the source for the lists below. Before submission, regenerate the full transitive list with `npm ls --prod --all` (mobile + web) and reconcile the on-screen list against it.

**Mobile (production)** — all MIT unless noted:
- `react-native` (MIT) — Meta
- `react`, `react-dom` (MIT) — Meta
- `expo`, `expo-image`, `expo-crypto` (MIT) — 650 Industries
- `@react-native-firebase/app`, `@react-native-firebase/messaging` (Apache-2.0) — Invertase
- `@react-native-google-signin/google-signin` (MIT) — react-native-google-signin community
- `@invertase/react-native-apple-authentication` (Apache-2.0) — Invertase
- `@notifee/react-native` (Apache-2.0) — Invertase
- `@react-native-async-storage/async-storage` (MIT)
- `@react-native-clipboard/clipboard` (MIT)
- `@react-native-community/blur` (MIT)
- `@react-native-community/image-editor` (MIT)
- `@react-navigation/*` (MIT)
- `@shopify/flash-list` (MIT)
- `react-native-config` (MIT)
- `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-vector-icons`, `react-native-linear-gradient`, `react-native-image-picker` (MIT)
- `zustand` (MIT) — Poimandres
- `date-fns` (MIT)

**Web (production)** — all MIT/Apache-2.0:
- `react`, `react-dom`, `react-router-dom` (MIT)
- `firebase` (Apache-2.0) — Google
- `tailwindcss` (MIT) — dev only
- Google Fonts: Playfair Display (OFL), Inter (OFL)

**Backend (Python)** — see `api/requirements.txt`:
- `fastapi` (MIT), `uvicorn` (BSD-3), `asyncpg` (Apache-2.0), `python-dotenv` (BSD-3), `python-jose[cryptography]` (MIT), `pydantic-settings` (MIT), `python-multipart` (Apache-2.0), `email-validator` (CC0-1.0), `alembic` (MIT), `sqlalchemy` (MIT), `psycopg2-binary` (LGPL-3 with exceptions), `google-cloud-storage` (Apache-2.0), `google-cloud-vision` (Apache-2.0), `google-cloud-logging` (Apache-2.0), `firebase-admin` (Apache-2.0), `Pillow` (HPND), `anthropic` (MIT), `openai` (Apache-2.0).
