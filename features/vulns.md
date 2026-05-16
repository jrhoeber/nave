# Nave Security Vulnerability Report

Scan target: entire repository at commit `9a0e8b8`
Scan date: 2026-05-14

## Findings

### 1. Parish post edits bypass text moderation

- Severity: High
- Affected code: `api/app/routers/parishes.py:453`
- CWE: CWE-693, CWE-285
- Issue: `POST /parishes/{parish_id}/posts` runs `moderate_content()` before publishing, but `PATCH /parishes/{parish_id}/posts/{post_id}` updates `parish_posts.content` directly and leaves the post in `Posted` status. An authenticated post author can create benign content, then edit it into content that the moderation pipeline would have blocked or queued.
- Impact: Bypasses a core trust-and-safety control for parish-wide content, including harassment, profanity, anti-Catholic abuse, crisis-sensitive content handling, or other material the product definition says must be blocked or queued.
- Recommended remediation: Run the same moderation pipeline on edited post content before updating. If the moderation action is `block`, reject and log the attempt to `moderation_queue`; if `queue`, set the post back to `Pending` or create a new pending revision that is hidden until review. Add regression tests for create-safe/edit-blocked and create-safe/edit-queued cases.

### 2. Comment edit queue decisions are ignored

- Severity: Medium
- Affected code: `api/app/routers/parish_post_comments.py:378`, `api/app/routers/parish_post_comments.py:393`
- CWE: CWE-693
- Issue: Comment edits are re-moderated and `block` is rejected, but `queue` is not handled. When `moderate_content()` returns `queue`, the code still updates the existing comment content and leaves it visible as `Posted`.
- Impact: Content that should require human review can be published immediately through edit flow.
- Recommended remediation: Mirror comment-create behavior on edit. Persist queued edits as hidden pending content or set the comment status to `Pending` until admin review, and add a `moderation_queue` row tied to the edited comment.

### 3. Profile avatar URL can bypass SafeSearch image moderation

- Severity: Medium
- Affected code: `api/app/models/user.py:14`, `api/app/models/user.py:18`, `api/app/routers/users.py:129`, `api/app/routers/users.py:153`
- CWE: CWE-434, CWE-693
- Issue: `UserUpdate` accepts `avatar_url`, and `PATCH /users/me` mass-updates all supplied fields. This bypasses the dedicated `POST /users/me/avatar` path, which enforces content type, size, GCS storage, and Cloud Vision SafeSearch.
- Impact: A user can set a profile avatar to arbitrary external imagery without moderation. The URL is then returned in user search, feeds, comments, friends, and group views, creating a moderation bypass and a third-party tracking surface.
- Recommended remediation: Remove `avatar_url` from `UserUpdate`. Only allow avatar changes through the upload endpoint, store only managed GCS object names, and optionally migrate or reject existing external avatar URLs except trusted OAuth provider pictures if that remains intentional.

### 4. Group and parish image URL fields bypass upload moderation

- Severity: Medium
- Affected code: `api/app/models/prayer_group.py:14`, `api/app/models/prayer_group.py:22`, `api/app/models/prayer_group.py:25`, `api/app/models/prayer_group.py:33`, `api/app/routers/prayer_groups.py:210`, `api/app/routers/prayer_groups.py:217`, `api/app/routers/prayer_groups.py:277`, `api/app/routers/parishes.py:178`, `api/app/models/parish.py:30`, `api/app/models/parish.py:33`
- CWE: CWE-434, CWE-693
- Issue: `PrayerGroupCreate`, `PrayerGroupUpdate`, and `ParishUpdate` accept direct `avatar_url` or `cover_photo_url` values. Those route paths write attacker-supplied URLs directly to database rows, bypassing the dedicated upload endpoints that enforce image type, size, GCS storage, and SafeSearch checks.
- Impact: Group avatars and parish cover photos can display unmoderated external content to group members or parish users. Parish cover updates require parish-admin access, but group avatar bypass is available to any group admin, including self-created groups.
- Recommended remediation: Remove direct image URL fields from create/update schemas, make image columns server-managed, and require all image changes to go through the existing upload endpoints. Add server-side validation that stored image values are managed object names under expected prefixes.

### 5. Private prayer group details and member lists are readable by non-members

- Severity: Medium
- Affected code: `api/app/routers/prayer_groups.py:248`, `api/app/routers/prayer_groups.py:254`, `api/app/routers/prayer_groups.py:360`, `api/app/routers/prayer_groups.py:366`
- CWE: CWE-639, CWE-862
- Issue: `GET /prayer-groups/{group_id}` returns group details for any authenticated user who knows the UUID, even when `is_private = TRUE`. `GET /prayer-groups/{group_id}/members` similarly returns the full member list after only checking that the group exists.
- Impact: Private group names, descriptions, schedules, parish/diocese metadata, admin identity, and member identities can be exposed outside the intended private group boundary.
- Recommended remediation: For private groups, require `prayer_group_members.status = 'member'` or admin ownership before returning detail or members. Return 404 for unauthorized private groups to avoid existence leaks. Add tests for non-member access to private group detail and member list.

### 6. npm audit reports vulnerable web dependencies

- Severity: High
- Affected code: `web/package-lock.json`
- CWE: CWE-1104
- Issue: `npm audit --production --audit-level=moderate` reported 12 vulnerabilities in the web dependency tree, including high-severity `protobufjs <=7.5.5` advisories and high-severity `undici <=6.23.0` advisories pulled through Firebase packages.
- Impact: The practical impact depends on whether the vulnerable Node-side code paths are reachable in the deployed Firebase web app or build tooling, but the dependency tree contains known high-severity parser, code-generation, request-smuggling, and denial-of-service advisories.
- Recommended remediation: Run `npm audit fix` in `web/`, review the resulting Firebase dependency updates, and run the web build/test suite. If the audit cannot fully resolve through transitive dependencies, pin or upgrade Firebase packages to fixed versions once available.

### 7. npm audit reports vulnerable mobile dependencies

- Severity: High
- Affected code: `app/package-lock.json`
- CWE: CWE-1104
- Issue: `npm audit --production --audit-level=moderate` reported 5 vulnerabilities in the mobile dependency tree, including high-severity `fast-xml-builder <=1.1.6` advisories and a moderate `postcss <8.5.10` advisory pulled through Expo tooling.
- Impact: The highest risk is build-time or tooling exposure unless the vulnerable XML builder is reachable in app runtime. It still represents a known vulnerable dependency in the shipped project tree.
- Recommended remediation: Run `npm audit fix` in `app/` and review whether Expo can be upgraded without the breaking downgrade suggested by `npm audit fix --force`. Prefer upgrading to a fixed Expo/tooling version rather than forcing a major downgrade.

## Deferred checks

- Python dependency advisory scanning was not completed because `pip-audit` is not installed in the local environment. Install `pip-audit` or run an equivalent scanner against `api/requirements.txt`.
