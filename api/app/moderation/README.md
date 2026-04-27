# Content Moderation System

Three-layer system that runs on every piece of user-generated text before it is persisted.

## Architecture

```
User submits content
        │
        ▼
┌───────────────────────┐
│ Layer 1: OpenAI       │  ~100ms, free
│ omni-moderation-latest│  Hard blocks on obvious violations
└──────────┬────────────┘
           │ hard block? → BLOCK immediately
           │
           ▼
┌───────────────────────┐
│ Layer 2: Claude Haiku │  ~500–1500ms, ~$0.0003/call
│ Contextual judgement  │  Against Catholic community policy
│ Prompt-cached system  │  (policy.md cached ≈ 90% token savings)
└──────────┬────────────┘
           │
           ▼
     Decision matrix:
     • Claude allow + confidence ≥ 0.8 + no L1 soft flag → ALLOW
     • Claude review OR low confidence OR L1 soft flag   → QUEUE
     • Claude reject                                      → BLOCK
           │
           ├── ALLOW  → content published immediately
           ├── QUEUE  → content saved as Pending, admin reviews
           └── BLOCK  → 400 returned, content never saved
```

Crisis indicators (`crisis_indicators: true`) propagate regardless of allow/block/queue. The app layer surfaces resources to the user.

## Configuration

Add to `api/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
MODERATION_ENABLED=true
```

Admin access is controlled via the `app_admins` table — insert a row to grant access:

```sql
INSERT INTO app_admins (user_id) VALUES ('<your-user-uuid>');
```

For Cloud Run: store `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in Google Secret Manager and mount as env vars in the Cloud Run service definition.

## Updating the Policy

The policy lives in `policy.md`. It is the most important file in the system.

1. Edit `policy.md` to reflect the new rule or category
2. Deploy (the system prompt is re-read from disk on each call — no code change needed)
3. Run integration tests: `RUN_INTEGRATION_TESTS=1 pytest tests/moderation/`
4. Monitor the queue for a few days after any policy change — expect a temporary uptick in review items

The policy is prompt-cached by Anthropic's API. After the first call, ~90% of input tokens are served from cache at ~10% of the cost.

## Handling False Positives

When a user reports their content was incorrectly blocked or is stuck in review:

1. Query the `moderation_queue` table for the item (`SELECT * FROM moderation_queue WHERE id = '...'`)
2. Review `layer1_result` and `layer2_result` JSONB columns — they contain the raw scores and Claude's reasoning
3. If Claude's reasoning was wrong, note the category of mistake
4. Approve via `PATCH /admin/moderation/queue/{item_id}` with `decision: "approved"`
5. If the mistake is systematic, update `policy.md` to clarify the edge case and redeploy

## Admin Interface

Protected route — only users with a row in the `app_admins` table can access.

```
GET  /admin/moderation/queue          # List pending items (oldest first)
PATCH /admin/moderation/queue/{id}   # Approve or reject
  Body: { "decision": "approved" | "rejected", "notes": "optional" }
```

On approval: parish posts flip to `status='Posted'`; group messages flip to `moderation_status='approved'`.

## Cost Estimates

At 1,000 daily posts/messages:

| Layer | Cost/call | Daily | Monthly |
|-------|-----------|-------|---------|
| OpenAI Moderation | $0.00 (free) | $0 | $0 |
| Claude Haiku (cached) | ~$0.0003 | ~$0.30 | ~$9 |

At 10,000 daily: ~$90/month. Token counts are logged for tracking.

## Runbook for Reviewers

**Daily queue review:**
1. `GET /admin/moderation/queue` — check pending count
2. For each item: read content + Claude's reasoning + Layer 1 scores
3. Approve clearly legitimate prayer requests and faith content
4. Reject clear violations (slurs, spam, blasphemy)
5. For crisis items (`crisis_indicators: true`): approve if the content itself is fine (the app already surfaced resources to the user at submission time)

**Pattern flags to watch for:**
- Multiple blocked items from the same user → consider account action
- High volume of false positives on a specific category → update `policy.md`
- `malformed: true` in `layer2_result` → Claude returned bad JSON; item correctly queued

**Latency targets:** p95 < 3 seconds end-to-end. Layer 1 timeout: 5s. Layer 2 timeout: 10s. On timeout, content is queued (never silently allowed).
