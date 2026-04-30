# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nave** is a Catholic prayer community mobile app. It consists of:
- **`/api`** — FastAPI (Python 3.12) backend with async PostgreSQL (asyncpg)
- **`/app`** — React Native (TypeScript) mobile app for iOS/Android
- **`/web`** — React + Vite + TypeScript web app (landing page + admin console)

## API Development

### Running locally

```bash
cd api
make run-local       # Docker Compose: PostgreSQL 16 + API with hot reload
make down-local      # Stop services
make clean-local     # Stop and remove volumes
```

The API auto-runs Alembic migrations and seeds parish data on startup (`entrypoint.sh`).

### Running without Docker

```bash
cd api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Database migrations

```bash
cd api
alembic upgrade head                          # Apply pending migrations
alembic revision --autogenerate -m "desc"     # Generate new migration
```

Migration files live in `api/alembic/versions/`, named with date prefix `YYYYMMDD_NNNN_desc.py`.

### Docker targets

```bash
make build     # Build production image
make dev       # Run with hot reload (non-compose)
make logs      # Tail container logs
make shell     # Open shell in running container
```

## Mobile App Development

```bash
cd app
npm install
cd ios && pod install && cd ..   # iOS native deps
npm run ios                      # Run on iOS simulator
npm run android                  # Run on Android emulator
npm run lint                     # ESLint
npm run type-check               # TypeScript check (no emit)
```

## Architecture

### API structure (`/api/app/`)

- `main.py` — FastAPI app, CORS, lifespan (connection pool init/teardown)
- `config.py` — Pydantic Settings (reads from `.env`)
- `database.py` — asyncpg connection pool helper
- `auth.py` — JWT creation/verification (bcrypt removed; auth now uses Firebase)
- `dependencies.py` — `get_current_user` dependency for protected routes
- `routers/` — One file per domain: `auth`, `users`, `feed`, `posts`, `prayer_groups`, `friends`, `parishes`, `notifications`
- `models/` — Pydantic request/response schemas
- `utils/` — Shared query helpers and notification creation

### Mobile app structure (`/app/src/`)

- `screens/` — Organized by feature (auth, feed, parish, prayer, profile)
- `navigation/` — React Navigation stack/tab navigators
- `store/` — Zustand stores for auth, feed, prayer groups
- `lib/apiClient.ts` — Central HTTP client (base URL from `config.ts`)
- `types/` — Shared TypeScript types and navigation param types
- `theme/` — Design tokens (colors, spacing, typography)

### Database

PostgreSQL. All PKs are UUIDs. Parish search uses trigram (pg_trgm) indexes. Full schema in `api/schema.sql`.

Core tables: `users` (includes `push_notifications_enabled`, `notify_group_messages`, `notify_friend_requests`), `parishes`, `prayer_groups`, `prayer_group_members`, `group_messages`, `group_message_reactions`, `parish_posts`, `parish_post_reactions`, `friendships`, `user_device_tokens` (FCM tokens), `group_notification_mutes`.

### Auth flow

Firebase Auth (Google + Apple sign-in). After social sign-in, the Firebase ID token is exchanged at `POST /auth/firebase` for an app JWT (30-day expiry). App stores JWT in Zustand `authStore` → all API calls include `Authorization: Bearer <token>` header.

New users go through a setup flow: ProfileSetup (name, birthday, bio) → ParishSetup (required). Users under 13 are blocked at ProfileSetup. Routing in RootNavigator: no birthday → ProfileSetup; no parishId → ParishSetup; complete → AppNavigator.

### Deployment

GitHub Actions (`.github/workflows/deploy-api.yml`) builds and deploys the API to Google Cloud Run. Migrations run automatically during deployment.

## Environment

API config via `.env` / `.env.local` in `api/`:
- `DATABASE_URL` — asyncpg-compatible PostgreSQL URL
- `SECRET_KEY` — JWT signing key
- `ANTHROPIC_API_KEY` — Claude Haiku moderation (Layer 2)
- `OPENAI_API_KEY` — OpenAI Moderation API (Layer 1)
- `MODERATION_ENABLED` — toggle moderation on/off (default: true)

Mobile API base URL is set in `app/src/lib/config.ts` (localhost:8000 for dev; Android emulator uses `10.0.2.2:8000`).

---

## File Reference

> **Maintenance rule:** Any time you add, move, rename, or delete a file, update the relevant section below so this index stays accurate.

### API (`/api/app/`)

#### Core
| File | Purpose |
|------|---------|
| `main.py` | App entry point; lifespan (pool init/teardown), CORS, logging middleware, exception handlers, router registration |
| `config.py` | Pydantic Settings; `DATABASE_URL`, `SECRET_KEY`, `GCS_BUCKET_NAME`, moderation keys — read from `.env` / `.env.local` |
| `database.py` | `get_db()` dependency that yields an asyncpg connection from the pool |
| `auth.py` | `create_access_token()`, `decode_access_token()` (JWT HS256) |
| `dependencies.py` | `get_current_user()` (required auth) and `get_optional_user()` (optional auth) FastAPI dependencies |

#### Routers (`/api/app/routers/`)
| File | Endpoints |
|------|-----------|
| `auth.py` | `POST /auth/firebase` — verify Firebase ID token, create/link user, return JWT; `GET /auth/me` |
| `users.py` | User search, get/update profile, upload avatar (GCS signed URLs) |
| `prayer_groups.py` | List/create/update/delete groups, join/leave, member list, approve/remove members, `POST/DELETE /{id}/avatar` for group avatar upload |
| `group_messages.py` | `GET/POST /prayer-groups/{id}/messages` (supports `?after=` for polling), `DELETE` message, `POST` reaction toggle; sends FCM push on new message |
| `parishes.py` | Fuzzy parish search (trigram + abbreviation expansion), parish member list |
| `friends.py` | `GET /friends`, `GET /friends/requests/incoming`, `GET /friends/search`, `POST /friends/requests` (sends FCM push), `PATCH /friends/requests/{id}`, `DELETE /friends/{id}`; search and send-request filter blocked users |
| `blocks.py` | `POST /blocks`, `DELETE /blocks/{blocked_id}`, `GET /blocks` — block/unblock users; POST atomically removes friendship |
| `notifications.py` | `POST/DELETE /notifications/device-token`, `GET/PATCH /notifications/preferences`, `POST/DELETE/GET /notifications/prayer-groups/{id}/mute` |
| `admin.py` | `GET /admin/moderation/queue`, `PATCH /admin/moderation/queue/{id}` — admin review of flagged content; restricted to users in `app_admins` table |

#### Moderation (`/api/app/moderation/`)
| File | Purpose |
|------|---------|
| `moderate.py` | Orchestrator: `moderate_content()` runs Layer 1 + Layer 2 and returns `{action, reasoning, crisis, crisis_resources}` |
| `openai_prefilter.py` | Layer 1: `check_openai_moderation()` — OpenAI `omni-moderation-latest` with tunable thresholds |
| `claude_moderator.py` | Layer 2: `evaluate_with_claude()` — Claude Haiku 4.5 with prompt-cached policy |
| `image_moderator.py` | Image moderation: `moderate_image()` — Google Cloud Vision SafeSearch; `check_image_or_raise()` — convenience helper used by upload endpoints; thresholds tuned for Catholic audience (strict on adult/racy, lenient on violence for religious art) |
| `review_queue.py` | Postgres queue: `add_to_queue()`, `get_pending()`, `mark_reviewed()` — writes to `moderation_queue` table; supports text and image entries (`image_url`, `image_result`) |
| `crisis_resources.py` | Returns crisis resource list (988, Catholic Charities, diocese, parish priest) |
| `policy.md` | System prompt for Claude Haiku — defines allowed/blocked/review categories |
| `README.md` | Architecture, cost estimates, policy update guide, admin runbook |

#### Models (`/api/app/models/`)
| File | Schemas |
|------|---------|
| `user.py` | `FirebaseAuthRequest`, `UserUpdate` (includes `birthday`), `UserResponse` (includes `birthday`), `TokenResponse` (includes `is_new_user`) |
| `parish.py` | `ParishResponse`, `ParishesResponse` |
| `prayer_group.py` | `PrayerGroupCreate`, `PrayerGroupUpdate`, `PrayerGroupResponse`; categories: `rosary`, `scripture_study`, `mens_group`, `womens_group`, `youth`, etc. |
| `group_message.py` | `GroupMessageCreate`, `GroupMessageResponse`, `GroupMessagesResponse`, `AddReactionBody` |
| `friendship.py` | `FriendRequestCreate`, `FriendRequestUpdate` |
| `block.py` | `BlockCreate` |

#### Utils (`/api/app/utils/`)
| File | Purpose |
|------|---------|
| `storage.py` | `upload_avatar()`, `upload_group_avatar()`, `get_signed_url()` — Google Cloud Storage integration; signed URLs cached 55 min |
| `queries.py` | `USER_STATS_COLS`, `USER_STATS_JOIN` — reusable user stats query fragments |
| `firebase.py` | `verify_firebase_token()`, `get_messaging()` — shared Firebase Admin SDK init; used by auth router and push helper |
| `push.py` | `send_push_notifications()` — FCM multicast helper; cleans up invalid tokens |

#### Database & Infra
| File | Purpose |
|------|---------|
| `schema.sql` | Full DB schema (source of truth for table definitions) |
| `seeds/parishes.sql` | Parish seed data loaded on startup |
| `alembic/versions/` | Migration files — named `YYYYMMDD_NNNN_desc.py` |
| `entrypoint.sh` | Container startup: runs `alembic upgrade head`, seeds parishes, starts uvicorn |
| `docker-compose.yml` | Local dev: PostgreSQL 16 + API with hot reload |
| `Dockerfile` / `Dockerfile.dev` | Production / development Docker images |
| `requirements.txt` | Python deps (FastAPI, asyncpg, pydantic, bcrypt, python-jose, etc.) |

---

### App (`/app/src/`)

#### Entry & Navigation
| File | Purpose |
|------|---------|
| `App.tsx` | Root component; manages auth loading, splash screen, hands off to RootNavigator |
| `navigation/RootNavigator.tsx` | Auth / Setup / App routing; checks `birthday` and `parishId` to route new users through setup flow |
| `navigation/AuthNavigator.tsx` | Welcome screen only (social sign-in) |
| `navigation/AppNavigator.tsx` | Bottom tabs: Community (Parish), Feed, Prayer, Friends, Profile |

#### State (Zustand stores, `/app/src/store/`)
| File | State |
|------|-------|
| `authStore.ts` | User, token, `signInWithFirebase`/logout/profile update; persisted via AsyncStorage |
| `feedStore.ts` | Posts list, pagination, like/unlike + pray/unpray with optimistic updates |
| `prayerStore.ts` | All groups + user's groups; join/leave with optimistic updates |
| `groupChatStore.ts` | Per-group message lists, pagination, send/delete/react with optimistic updates; `getTotalUnreadCount()`, `appendNewMessages()` for polling |
| `friendsStore.ts` | Friends list + incoming requests; accept/reject/remove with optimistic updates |
| `blocksStore.ts` | Blocked users list; block/unblock with optimistic removal |

#### API Layer (`/app/src/lib/`)
| File | Purpose |
|------|---------|
| `apiClient.ts` | Central HTTP client; JWT injection, snake_case→camelCase mapping, 401 handler, all API methods |
| `config.ts` | `API_BASE_URL` constant (localhost:8000 dev / 10.0.2.2:8000 Android) |
| `notifications.ts` | FCM token registration/unregistration + notification tap handlers (foreground, background, cold-start) |

#### Types (`/app/src/types/`)
| File | Contents |
|------|---------|
| `index.ts` | `User`, `Post`, `PostType`, `Comment`, `PrayerGroup`, `PrayerGroupCategory`, `Parish`, `GroupMessage`, `MessageReaction`, `BlockedUser` interfaces |
| `navigation.ts` | Stack param lists for type-safe `navigation.navigate()` calls |

#### Screens (`/app/src/screens/`)
| File | Screen |
|------|--------|
| `auth/WelcomeScreen.tsx` | Landing: Google + Apple sign-in buttons; initiates Firebase Auth flow |
| `auth/ProfileSetupScreen.tsx` | New-user setup: full name, birthday (13+ gate), bio — routed to from RootNavigator when `birthday` is null |
| `auth/ParishSetupScreen.tsx` | Parish selection (required to complete sign-up) — routed to when `parishId` is null |
| `group/GroupScreen.tsx` | Prayer group discovery list; loads mute status per group |
| `group/GroupMessageScreen.tsx` | Group chat: inverted message list, emoji reactions, message input; 3-second polling for new messages when focused; tapping group name navigates to GroupProfile |
| `group/GroupProfileScreen.tsx` | Group profile: avatar (admin-uploadable), name, category, parish, info, mute/share/leave/delete actions, member list with admin remove |
| `group/CreateGroupScreen.tsx` | Create group form |
| `parish/ParishScreen.tsx` | Parish community view |
| `friends/FriendsScreen.tsx` | Friends list + request management |
| `profile/ProfileScreen.tsx` | Own profile with edit |
| `shared/ComposeScreen.tsx` | Modal: create new post |
| `shared/PostDetailScreen.tsx` | Full post + comments |
| `shared/UserProfileScreen.tsx` | Other users' profiles; kebab menu (ellipsis-horizontal) to block user |
| `profile/BlockedUsersScreen.tsx` | List of blocked users with unblock action; navigated to from SettingsModal |

#### UI Components (`/app/src/components/`)
| File | Purpose |
|------|---------|
| `friends/AddFriendModal.tsx` | pageSheet modal to search users and send friend requests; shows friendship status per result |
| `ui/Avatar.tsx` | Avatar with initials fallback |
| `ui/TabBadge.tsx` | Shared red dot badge for nav tab icons (Friends and Groups tabs) |
| `ui/Button.tsx` | Button with variants (primary, secondary, ghost) |
| `ui/Input.tsx` | Styled text input |
| `Splash.tsx` | Startup splash screen |
| `feed/PostCard.tsx` | Post card used in feed and group views |
| `prayer/PrayerGroupCard.tsx` | Prayer group card for list views |
| `prayer/EditPrayerGroupModal.tsx` | pageSheet modal for admins to edit group name, description, category, schedule, privacy |

#### Theme
| File | Purpose |
|------|---------|
| `theme/index.ts` | Design tokens: colors, typography, spacing — import from here for all styling |
