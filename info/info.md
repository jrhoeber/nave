1. **Apple App Store Connect contact** Jordan Hoeber, jordan@cornerstonedev.co, (716) 347-5307, 418 Broadway Ste N, Albany, NY 12207 US
2. **Apple Team ID, ASC App ID, Apple ID for submissions** — placeholders in `eas.json`.
3. **Privacy policy and ToS publication.** `/privacy` and `/terms` currently render `ComingSoonPage`. Stores will reject submission until these are live.
7. **DMCA registration** — `navetakedown@cornerstonedev.co` is designated; agent registered with the U.S. Copyright Office, `/dmca` page up.
8. **`/.well-known/security.txt`** — published on naveapp.co pointing at `navetsecurity@cornerstonedev.co`.
9. **EU representative / SCCs with subprocessors** — no EU users
10. **Sentry wiring** - Firebase Crashlytics + Google Cloud Error Reporting in use. 90 day retention with sensitive info scrubbing.
11. **GDPR data-subject export endpoint** — `/users/me/export` not implemented; in-app delete works, but bulk export does not.
12. **Beta testers / TestFlight terms** — just use the app terms * privacy policy
13. **`api/.env` and `api/.env.local`** — not in github.
14. **Parish-feed authorization scope** — intended
15. **GCS lifecycle policy for orphaned avatars/images** — skip for now. Handling this well enough.
16. **Admin tooling for child-account deletion** — done
