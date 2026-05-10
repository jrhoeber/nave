1. **Apple App Store Connect contact** Jordan Hoeber, jordan@cornerstonedev.co, (716) 347-5307, 418 Broadway Ste N, Albany, NY 12207 US
2. **Apple Team ID, ASC App ID, Apple ID for submissions** — placeholders in `eas.json`.
3. **Privacy policy and ToS publication.** `/privacy` and `/terms` currently render `ComingSoonPage`. Stores will reject submission until these are live.
7. **DMCA registration** — `navetakedown@cornerstonedev.co` is designated; register the agent with the U.S. Copyright Office before public scaling and add a `/dmca` web page describing the formal-notice format.
8. **`/.well-known/security.txt`** — publish on naveapp.co pointing at `navetsecurity@cornerstonedev.co`.
9. **EU representative / SCCs with subprocessors** — required if EU users are in scope (Neon, Google, OpenAI, Anthropic, Sentry).
10. **Sentry wiring** — `info/info.md` documents a 90-day Sentry retention but Sentry is not yet integrated in either app or backend. Decide whether to wire it up; if not, drop the line from the privacy policy.
11. **GDPR data-subject export endpoint** — `/users/me/export` not implemented; in-app delete works, but bulk export does not.
12. **Beta testers / TestFlight terms** — separate concern but commonly bundled with App Store submission.
13. **`api/.env` and `api/.env.local`** — these contain real production secrets. Confirm they are gitignored (`api/.gitignore`); the values in this audit must NOT be republished anywhere (they are paraphrased, never exposed verbatim).
14. **Parish-feed authorization scope** — today `GET /parishes/{id}/posts` returns posts to any signed-in user, not just members of that parish. Confirm whether this is intentional or a bug.
15. **GCS lifecycle policy for orphaned avatars/images** — best-effort delete on replace exists; orphans accumulate without a bucket-level lifecycle rule.
16. **Admin tooling for child-account deletion** — required by COPPA when becoming aware of a sub-13 user; only self-deletion is implemented today.
