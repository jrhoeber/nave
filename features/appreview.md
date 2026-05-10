# Claude Code Prompt: Rewrite `appdef.md` as `appdef2.md`

You are working in the Nave monorepo, which contains a mobile app, backend, and marketing website. Your task is to produce a comprehensive, accurate, up-to-date description of the entire product by reviewing the actual code, configuration, and existing documentation — and writing the result to a new file.

## Inputs

- **Existing (outdated) source-of-truth file:** `/Users/jordanhoeber/wksp/nave/features/appdef.md`
  - Read this first to understand the *intended* shape of the document and to identify what is now stale, missing, or incorrect.
  - Do **not** treat its contents as authoritative for the new version — code and configuration win every conflict.
- **Authoritative sources** (in priority order):
  1. Source code in the monorepo (mobile app, backend, website) — what the product *actually does*
  2. Configuration files (`package.json`, `app.json` / `app.config.*`, `Info.plist`, `AndroidManifest.xml`, `.env.example`, infrastructure-as-code, CI configs, etc.)
  3. Existing docs (`README.md`, `/docs`, ADRs, CHANGELOG, inline comments)
  4. Database schemas / migrations / ORM models
  5. API route definitions and request/response schemas
  6. Third-party SDK integrations and their initialization sites

## Output

Write the result to: `/Users/jordanhoeber/wksp/nave/features/appdef2.md`

Do **not** modify `appdef.md`. Do not delete or move any other files.

## Why this document matters (use cases)

`appdef2.md` is the single source of truth that will be used to draft or fill out the following — be exhaustive enough to support all of them without further investigation:

1. **Terms of Service** — user obligations, license grant, account rules, payment/subscription terms, IP ownership, UGC rules, prohibited conduct, dispute resolution, governing law, termination, liability limits, warranty disclaimers, DMCA, age restrictions, modifications to terms.
2. **Privacy Policy** (must satisfy GDPR, CCPA/CPRA, COPPA where applicable, plus generic "best practice"):
   - Every category of personal data collected, with the legal basis (GDPR) and business purpose (CCPA)
   - Sources of data (user, device, third parties)
   - Every third party that data is shared with or sold to, by category, plus what they receive and why
   - Retention periods per data category
   - International transfers and safeguards
   - User rights (access, delete, correct, port, opt-out of sale/sharing, limit sensitive data) and how to exercise them
   - Children's data handling
   - Security measures
   - Cookies / SDKs / tracking technologies
   - Contact / DPO information
3. **Apple App Store submission** — app name (≤30 char), subtitle (≤30 char), promotional text (≤170 char), description (≤4000 char), keywords (≤100 char, comma-separated), primary/secondary category, age rating answers, privacy "nutrition label" data (data types collected, linked to user vs. not, used for tracking, purposes per type), App Privacy details for every SDK, support URL, marketing URL, privacy policy URL, copyright, contact info, demo/test account credentials, review notes, export compliance (encryption usage), content rights declarations, Sign in with Apple requirement check, in-app purchase definitions, required device capabilities, supported languages/locales.
4. **Google Play submission** — app title (≤30 char), short description (≤80 char), full description (≤4000 char), category, content rating questionnaire answers, target audience and content settings, **Data Safety form** (every data type collected/shared, whether required or optional, purpose, encryption-in-transit, deletion mechanism, ephemeral processing, third-party sharing details per SDK), Ads declaration, permissions justification, account deletion URL, privacy policy URL, contact email/phone/website.
5. **App's marketing website** — hero copy, feature list with descriptions and screenshots references, supported platforms, system requirements, pricing/plans, FAQ source material, about/company info, press kit basics.
6. **Internal reference** — onboarding new engineers, support staff, contractors.

## Review process

Work systematically. Do not skim. For each section below, *read the actual files* before writing anything.

### Step 1 — Repo orientation
- List the top-level monorepo structure. Identify the mobile app package(s), backend service(s), website package(s), shared packages.
- Note the package manager and monorepo tool (npm/yarn/pnpm workspaces, Nx, Turborepo, etc.).
- Note the languages and frameworks per package.

### Step 2 — Mobile app review
- Identify the framework (React Native / Expo / Flutter / native iOS / native Android).
- Read `app.json` / `app.config.{js,ts}` / `Info.plist` / `AndroidManifest.xml` / `build.gradle` / `Podfile`. Capture: app name, bundle ID / package name, version, minimum OS versions, supported devices, supported orientations, declared permissions and their usage descriptions, deep link / URL schemes, associated domains, capabilities (push, background modes, HealthKit, etc.).
- Walk every screen/route and document what each does, what data each collects, and what API calls each makes.
- Identify every third-party SDK in `package.json` / `Podfile` / `build.gradle` and what each does (analytics, crash reporting, ads, attribution, auth, push, payments, maps, social, etc.). For each SDK, note what data it collects.
- Identify every native permission requested and the user-facing reason.
- Identify auth flow(s): email/password, OAuth providers, SSO, magic link, biometric, etc.
- Identify payment / subscription / IAP integration if any (Stripe, RevenueCat, native IAP, etc.) and the actual products/plans.
- Identify push notification setup and what triggers notifications.
- Identify any offline storage, cache, or local DB and what it stores.

### Step 3 — Backend review
- Identify language, framework, hosting/infra (Node/Express, Fastify, NestJS, Python/Django, Rails, Go, etc.; AWS/GCP/Vercel/Fly/Render; serverless vs. server).
- Map every API route/endpoint: method, path, auth requirements, request shape, response shape, side effects.
- Map the database schema: every table/collection, every column/field, relationships, indexes. Note which fields are PII or sensitive.
- Identify every external service integrated server-side: auth providers, email senders (SendGrid/Postmark/SES), SMS (Twilio), payments (Stripe), storage (S3/GCS), search (Algolia), AI/LLM APIs, geocoding, push (FCM/APNs), analytics, error monitoring (Sentry), logging, queues, CDN. For each: what data flows to/from it.
- Identify cron jobs, background workers, webhooks (incoming and outgoing).
- Identify data retention, soft-delete vs. hard-delete patterns, account deletion mechanism.
- Identify encryption: at-rest (DB, storage), in-transit (TLS), secrets management.
- Identify rate limiting, abuse prevention, audit logging.
- Identify any data exports or admin tooling.

### Step 4 — Website review
- Identify framework (Next.js, Astro, plain HTML, etc.) and hosting.
- Identify every page and its purpose.
- Identify forms and where their submissions go (newsletter, contact, waitlist, support).
- Identify analytics, marketing pixels, chat widgets, cookie consent setup.
- Identify any account / dashboard / customer portal functionality and overlap with the mobile app's data model.
- Note current copy themes, taglines, feature framing — this is useful seed material for marketing copy but verify against actual app behavior.

### Step 5 — Cross-cutting concerns
- **Data flow map:** user → mobile app → backend → third parties. Diagram or describe end-to-end for each major feature.
- **Identifiers and PII inventory:** every piece of personal/sensitive data the system can hold, where it lives, who it's shared with.
- **Compliance posture:** GDPR readiness, CCPA readiness, COPPA (is the app for / accessible to children under 13?), HIPAA (any health data?), PCI (any card data touched directly vs. tokenized through Stripe?), accessibility standards.
- **Open source licenses:** scan dependencies for licenses that need attribution in the app's "Licenses" / "Open Source Notices" screen.

## Output document structure

Use this exact structure for `appdef2.md`. If a section genuinely doesn't apply, write "Not applicable" with a one-sentence reason rather than omitting it.

```
# Nave — Product Definition

> Last regenerated: <DATE>
> Source of truth: this document is generated from the monorepo. Update by re-running the review process, not by hand-editing.

## 1. Executive summary
   - One-paragraph elevator pitch
   - Target users and primary use cases
   - Key differentiators

## 2. Company / publisher information
   - Legal entity name
   - Business address (if findable in repo / configs)
   - Support email, support URL
   - Marketing URL
   - Privacy contact / DPO
   - Copyright line

## 3. Product surfaces
   ### 3.1 Mobile app
      - Platforms (iOS, Android, versions supported)
      - App name, subtitle ideas, bundle ID, package name
      - Current version
      - Framework and key tech
      - Required device capabilities
      - Supported languages/locales
   ### 3.2 Backend
      - High-level architecture
      - Hosting and regions
      - Languages and frameworks
   ### 3.3 Website
      - URL(s)
      - Purpose (marketing, account portal, both)
      - Framework and hosting

## 4. Features (exhaustive)
   For each feature: name, what it does, which surfaces it appears on, what data it touches, any third-party services it depends on.

## 5. User accounts and authentication
   - Sign-up methods
   - Sign-in methods
   - Identity verification, if any
   - Account recovery
   - Multi-device behavior
   - Account deletion: in-app path, web path, what data is deleted vs. retained, retention period for retained data
   - Minimum age / age gating

## 6. Data collected — comprehensive inventory
   For every data point, a row with:
   - Data type (use Apple/Google taxonomy where possible: Contact Info, Health & Fitness, Financial, Location-Precise, Location-Approximate, Sensitive Info, Contacts, User Content, Search History, Browsing History, Identifiers, Purchases, Usage Data, Diagnostics, Other)
   - Collected? (yes / optional / no)
   - Source (user input, device, third party — name them)
   - Linked to user identity? (yes/no)
   - Used for tracking across apps/sites? (yes/no — Apple's definition)
   - Purpose(s): app functionality, analytics, product personalization, advertising, fraud prevention, legal compliance, etc.
   - Retention period
   - Storage location (DB table, file storage, third-party)
   - Shared with which third parties

## 7. Third-party services and SDKs
   For each:
   - Name and vendor
   - Purpose in the product
   - Where integrated (mobile / backend / web)
   - Data sent to it
   - Data received from it
   - Privacy policy URL of the vendor
   - Whether it's a "service provider" (CCPA) / "processor" (GDPR) under contract, or an independent third party / sale & share recipient
   - SDK version (if mobile)

## 8. Permissions (mobile)
   For each permission:
   - Platform (iOS / Android)
   - Permission name
   - Trigger (when in the app it's requested)
   - User-facing purpose string
   - What we do with the data
   - Whether the feature degrades gracefully if denied

## 9. Payments, subscriptions, monetization
   - Free vs. paid model
   - Subscription tiers, prices, billing periods, free trials, regional differences
   - Payment processors and what data they handle vs. what we handle
   - Refund policy stance
   - In-app purchases (Apple) / Play Billing (Google) products and IDs
   - Auto-renewal terms and how cancellation works on each platform
   - Promo codes / introductory offers
   - Tax handling

## 10. Content and user-generated content
   - What users can create, upload, post
   - Visibility (private / shared / public)
   - Moderation approach (none / automated / human / report-and-review)
   - Ownership and license grant from user to us
   - Takedown / DMCA process
   - Storage and CDN

## 11. Communications and messaging
   - Transactional emails sent (list types)
   - Marketing emails sent and opt-in/opt-out flow
   - SMS sent and consent flow
   - Push notifications: categories, opt-in flow, opt-out path
   - In-app messaging between users (if any), including E2E encryption status

## 12. Security
   - Encryption at rest (per data store)
   - Encryption in transit (TLS versions)
   - Authentication mechanisms (password hashing algorithm, MFA, session management)
   - Authorization model
   - Secret management
   - Vulnerability disclosure path
   - Logging and audit trails
   - Backup and recovery posture
   - Known compliance certifications (SOC 2, ISO 27001, etc.) — only state if verifiable from repo / docs

## 13. Compliance posture
   - GDPR (lawful bases per processing activity, DPO, EU representative if needed, transfer mechanism — SCCs, etc.)
   - CCPA / CPRA (categories collected/sold/shared, sensitive PI handling, opt-out mechanism, GPC honoring)
   - COPPA applicability and handling
   - HIPAA applicability
   - PCI scope and how it's minimized
   - Accessibility (WCAG level targeted, known gaps)
   - Export compliance: does the app use encryption beyond standard HTTPS? (needed for App Store export compliance)
   - Health data: HealthKit / Google Fit usage if any

## 14. Age rating signals
   For both Apple's and Google's questionnaires — capture every "yes/intensity" answer with the in-product evidence (e.g., "User-generated content yes — comments on posts; moderation: report-and-review").

## 15. App store metadata draft
   ### 15.1 Apple App Store
      - App name (≤30 char)
      - Subtitle (≤30 char) — 2–3 candidates
      - Promotional text (≤170 char)
      - Description (≤4000 char)
      - Keywords field (≤100 char, comma-separated, no spaces, singular forms)
      - Primary category, secondary category
      - Support URL, marketing URL, privacy policy URL
      - Copyright
      - Contact info (first/last name, email, phone)
      - Review notes draft
      - Demo account credentials placeholder
   ### 15.2 Google Play
      - App title (≤30 char)
      - Short description (≤80 char)
      - Full description (≤4000 char)
      - Category and tags
      - Contact email, phone, website
      - Privacy policy URL
      - Account deletion URL

## 16. Marketing website content source
   - Hero headline candidates
   - Subhead candidates
   - Feature blocks (icon idea, headline, 1–2 sentence description) — one per major feature
   - Social proof slots (testimonials, press, metrics) — note where copy needs to be written by humans
   - FAQ source — pull questions a real user would ask, with answers grounded in product behavior
   - CTA copy
   - Footer links inventory

## 17. Glossary
   Define every product-specific term consistently for use across legal docs, marketing, and store listings.

## 18. Open source attributions
   List of dependencies and their licenses that require attribution in the app's licenses screen.

## 19. Open questions and known gaps
   Anything you couldn't determine from the code/docs — flag explicitly so a human can fill it in. Do NOT invent answers.

## 20. Change log vs. previous appdef.md
   Bullet list of every material change from the old document: things added, things removed, things corrected.
```

## Rules

- **Ground every claim in the code.** When a claim is non-obvious (e.g., "data is encrypted at rest"), cite the file path and line range that supports it.
- **Never invent.** If the repo doesn't tell you something (e.g., a privacy contact email), put a `<TODO: ...>` placeholder. Do not guess company addresses, retention periods, prices, or legal entity names.
- **Prefer code over docs when they conflict.** Old README claims are exactly the kind of thing this exercise is trying to correct.
- **Be exhaustive on data flows and third parties.** Privacy policies and Data Safety forms get rejected for missing items, never for over-disclosure.
- **Use precise, neutral language.** This document feeds legal documents — no marketing puffery in the data sections. Marketing-flavored language belongs only in section 16.
- **Capture both surfaces of each feature.** If a feature spans mobile + backend + website, describe it once with notes on each surface.
- **Note version numbers** (app version, SDK versions, framework versions) wherever they appear — these get stale quickly and the next review will need them.
- **Flag SDKs that read device identifiers** (IDFA, GAID, Android ID, fingerprinting), share data cross-app, or use data for their own purposes — these have outsized privacy disclosure consequences.
- **Honor the file boundary.** Write only `appdef2.md`. Do not modify `appdef.md` or any other file.

## Final check before writing

Before you finalize `appdef2.md`, re-read sections 6 (Data collected), 7 (Third-party services), 8 (Permissions), 13 (Compliance posture), and 14 (Age rating signals). For each item there, confirm you have a code-level basis. If you find yourself unable to verify something that's important for a privacy policy or Data Safety form, move that item to section 19 (Open questions) rather than glossing over it.

Begin.