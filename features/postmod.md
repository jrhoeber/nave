# Content Moderation System — Implementation Plan for Claude Code

## Context

You are implementing a layered content moderation system for this app. Read appdef.md for context. Moderation needs to be tight — false positives are far more acceptable than false negatives.

## Architecture

Three layers, in order of execution per piece of user content:

1. **Layer 1 — OpenAI Moderation API** (free, fast pre-filter for obvious violations)
2. **Layer 2 — Claude Haiku 4.5** (contextual judgment against Catholic community policy)
3. **Layer 3 — Human review queue** (small percentage of borderline items)

Image moderation is out of scope for this initial build. Add Sightengine later if needed.

## Implementation tasks

### Task 1: Project scaffolding and dependencies

- Inspect existing repo structure. Identify the backend service that handles user-generated content (posts, prayer requests, comments).
- Add dependencies:
  - `@anthropic-ai/sdk` (or `anthropic` for Python)
  - `openai` (for the free Moderation endpoint)
  - `@google-cloud/secret-manager`
  - `@google-cloud/firestore` (if using Firestore for review queue)
- Create a new module: `src/moderation/` (or equivalent path matching repo conventions)

### Task 2: Configuration and secrets

- Create a config loader that reads from Google Secret Manager in production and `.env` in development
- Required secrets:
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
- Required env vars:
  - `MODERATION_REVIEW_QUEUE_COLLECTION` (Firestore collection name)
  - `MODERATION_LOG_LEVEL`
- Do NOT commit any keys. Add `.env` to `.gitignore` if not already present.

### Task 3: Layer 1 — OpenAI Moderation pre-filter

Create `src/moderation/openaiPrefilter.ts` (or .py equivalent):

- Single function `checkOpenAIModeration(text: string)` that returns `{ flagged: boolean, categories: object, scores: object }`
- Use the `omni-moderation-latest` model
- Map the response to a simple decision: if any of these score above the listed threshold, return `flagged: true`:
  - `sexual`: 0.3
  - `sexual/minors`: 0.05 (very strict)
  - `harassment`: 0.4
  - `harassment/threatening`: 0.2
  - `hate`: 0.3
  - `hate/threatening`: 0.15
  - `violence`: 0.5
  - `violence/graphic`: 0.4
  - `self-harm`: do NOT auto-reject — flag for human review only (prayer requests legitimately involve this)
- Tunable: thresholds in a config object at the top of the file

### Task 4: Layer 2 — Claude Haiku 4.5 contextual moderator

Create `src/moderation/claudeModerator.ts`:

- Function `evaluateWithClaude(text: string, contextType: 'post' | 'prayer_request' | 'comment')`
- Use model `claude-haiku-4-5`
- Use prompt caching on the system prompt (it's identical across all calls)
- System prompt: load from `src/moderation/policy.md` (created in Task 5) — mark with `cache_control: { type: "ephemeral" }`
- User message format: structured input with the content type and the text being evaluated
- Force JSON output by instructing the model and parsing the response
- Expected JSON schema:
  ```json
  {
    "decision": "allow" | "review" | "reject",
    "category": "spiritual_struggle" | "prayer_request" | "theological_discussion" | "harassment" | "blasphemy" | "sexual" | "self_harm_concern" | "spam" | "other",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "crisis_indicators": boolean,
    "suggested_resources": ["array of resource keys if crisis_indicators is true"]
  }
  ```
- If the model returns malformed JSON, default to `decision: "review"` and log the failure
- Set `max_tokens: 300` (responses should be small) and `temperature: 0.0`

### Task 5: The policy document

Create `src/moderation/policy.md`. This is the single most important file in the system. Draft a system prompt covering:

- The community's purpose (Catholic prayer group, faith-sharing, mutual support)
- Tone expected (charitable, prayerful, respectful)
- Explicitly **welcomed** content:
  - Prayer requests including heavy topics: illness, grief, addiction in self or loved ones, marriage struggles, financial hardship, doubt, spiritual dryness
  - Theological discussion and questions
  - Testimonies of conversion, healing, or struggle
  - Sharing of saints' writings, scripture, magisterial teaching
  - Asking for prayers about mental health struggles
- Explicitly **rejected** content:
  - Sexual or sexually suggestive content of any kind
  - Anti-Catholic harassment or mockery of sacraments, the Eucharist, Mary, saints, the Pope, or the Magisterium
  - Blasphemy directed at God, Christ, or the Holy Spirit
  - Slurs, harassment, or attacks on other users
  - Promoting violence, self-harm, or sin (as opposed to discussing struggle with sin)
  - Spam, commercial promotion, links to suspicious sites
  - Proselytizing against Catholic teaching (note: respectful disagreement and questions are welcome; aggressive deconversion attempts are not)
  - Political content unrelated to Catholic moral teaching
  - Misinformation about Catholic doctrine presented as truth
- Items requiring **human review** (decision: "review"):
  - Active suicidal ideation by the user themselves (vs. praying for someone else)
  - Disclosures of abuse (the user as victim)
  - Disclosures of abuse perpetration
  - Edge cases involving sexual sin discussed in context of seeking forgiveness/healing — distinguish testimony from explicit content
  - Anything ambiguous on first read
- Crisis indicator rules: set `crisis_indicators: true` if the user themselves shows signs of imminent self-harm, active suicidal planning, or being in an abusive situation. The app should surface resources without auto-blocking the post.

Output instructions at the end of the policy file: "Respond ONLY with valid JSON matching this schema: { ... }"

### Task 6: Orchestrator

Create `src/moderation/moderate.ts`:

- Function `moderateContent(text: string, contextType: ContextType, userId: string)` that returns `{ action: 'allow' | 'block' | 'queue', reasoning: string, crisis: boolean }`
- Logic:
  1. Run Layer 1 (OpenAI). If flagged on hard categories (sexual/minors, sexual, hate/threatening, violence/graphic), short-circuit to `block`. If flagged on softer categories, mark for Layer 2 with elevated suspicion.
  2. Run Layer 2 (Claude Haiku) regardless of Layer 1 result, EXCEPT when Layer 1 short-circuited to block.
  3. If Claude returns `decision: "allow"` AND no Layer 1 flag → `action: 'allow'`
  4. If Claude returns `decision: "review"` OR Claude returns `allow` with confidence < 0.8 OR Layer 1 had a soft flag → `action: 'queue'`
  5. If Claude returns `decision: "reject"` → `action: 'block'`
  6. If `crisis_indicators: true`, set `crisis: true` regardless of action — the app layer will handle resource surfacing
- Log every decision (decision, reasoning, latency, costs estimated from token counts) to Firestore or Cloud Logging
- Wrap external calls in try/catch with timeouts (5s for OpenAI, 10s for Claude). On any error, default to `action: 'queue'` — never silently allow on failure.

### Task 7: Review queue storage

Create `src/moderation/reviewQueue.ts`:

- Firestore collection storing flagged items: `{ id, userId, content, contextType, layer1Result, layer2Result, finalAction, createdAt, status: 'pending' | 'approved' | 'rejected', reviewerId, reviewedAt, reviewerNotes }`
- Functions: `addToQueue(item)`, `getNext(reviewerId)`, `markReviewed(id, decision, notes)`
- Index on `status` and `createdAt`

### Task 8: Crisis resource handler

Create `src/moderation/crisisResources.ts`:

- A simple module that returns appropriate resources when `crisis_indicators: true`
- Do NOT list specific suicide methods or means
- Resources to include:
  - 988 Suicide & Crisis Lifeline (US)
  - Catholic-specific: Catholic Charities counseling referrals, the user's diocese family life office
  - The user's parish priest as a trusted contact suggestion
- The app UI (out of scope for this task) will surface these — this module just returns the right list

### Task 9: Integration into content posting flow

- Find the existing endpoints that accept user content (post creation, prayer request submission, comments)
- Wrap each with a call to `moderateContent` BEFORE persisting the content
- On `action: 'allow'` → save and publish normally
- On `action: 'queue'` → save with `visibility: 'pending_review'` flag, return success to user with message "Your post is being reviewed and will appear shortly"
- On `action: 'block'` → return 400 with a gentle message ("This content can't be posted in our community. If you believe this is a mistake, please contact us.") — do NOT echo back what was wrong in detail (avoids gaming)
- If `crisis: true` → in the response, include resource information for the client to display

### Task 10: Admin review interface

This is a small internal tool, not user-facing:

- A protected route `/admin/moderation/queue` (auth required, only specific user IDs)
- Lists pending items with: content, why it was flagged, Claude's reasoning, approve/reject buttons, optional notes field
- On approve: change content visibility to public, mark queue item as approved
- On reject: mark queue item rejected, optionally notify user, optionally flag user account if pattern emerges

### Task 11: Tests

- Unit tests for the orchestrator decision logic (mock the API calls)
- Integration tests with real API calls behind an env flag (`RUN_INTEGRATION_TESTS=1`) — keep these lean to avoid burning API credits
- A fixture file `test/moderation/fixtures.json` with example inputs and expected outputs:
  - Clear allows: "Please pray for my mother who has cancer"
  - Clear blocks: explicit slurs, sexual content
  - Review cases: "I don't see the point of going on" (crisis), "I struggle with [sin] and want to confess but I'm scared" (legitimate but sensitive)
  - Theological edge cases: respectful disagreement on a doctrinal point (allow), aggressive attack on the Church (block)
- Aim for ~20 fixtures covering the spectrum

### Task 12: Observability

- Log metrics to Cloud Logging:
  - `moderation.decision` with labels `{action, layer1_flagged, layer2_decision, crisis}`
  - `moderation.latency_ms` per layer
  - `moderation.tokens` for cost tracking
- Build a simple Cloud Logging query / dashboard the user can access to monitor

### Task 13: Documentation

Create `src/moderation/README.md` with:
- Architecture overview
- How to update the policy (it WILL need iteration)
- How to handle false positives reported by users
- Cost estimates based on usage tiers
- A runbook for the admin reviewing the queue

## Important notes

- Use prompt caching aggressively — the policy.md content cached saves ~90% on input tokens
- Set `temperature: 0.0` on Claude calls for consistency
- The policy file is the most valuable artifact. Iterate on it based on real cases. Version it in git.
- Never expose Claude's reasoning to the end user (avoids prompt injection where users craft content to manipulate moderation)
- Log everything for the first 30 days, then trim

## Out of scope for this build

- Image moderation (add Sightengine later)
- Multi-language support (add when expanding beyond English)
- ML feedback loop from human review back into the system (consider in v2)
- User reputation scoring (v2)

## Definition of done

- A user can submit a post and it is moderated through both layers before persisting
- Items in the review queue are visible in an admin interface
- Crisis content surfaces resources to the user
- Total moderation latency p95 < 3 seconds
- All API keys in Secret Manager, none in code
- README covers operational basics