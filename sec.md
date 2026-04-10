# Security Assessment: api.naveapp.co

**Date:** 2026-04-09
**Scope:** Non-destructive black-box assessment of https://api.naveapp.co/
**Stack:** FastAPI (Python 3.12), asyncpg, PostgreSQL, deployed on Google Cloud Run

---

## Summary

| # | Finding | Severity |
|---|---------|----------|
| 1 | API docs & full OpenAPI schema publicly exposed | High |
| 2 | No rate limiting on auth endpoints | High |
| 3 | All security headers missing | High |
| 4 | No CORS middleware configured | High |
| 5 | User enumeration via `/auth/signup` (409 response) | Medium |
| 6 | HTTP 401/403 status code inconsistency | Low |
| 7 | Default JWT secret in `config.py` (mitigated by env var in prod) | Info |
| 8 | Tech/version disclosure via OpenAPI schema | Info |
| 9 | No account deletion endpoint (GDPR/CCPA concern) | Info |

---

## Detailed Findings

### 1. API Docs and Full Schema Publicly Exposed
**Severity: High**

`/docs`, `/redoc`, and `/openapi.json` are all accessible with no authentication. The OpenAPI schema fully enumerates every endpoint, request/response schema, field names, validation rules, and authentication requirements.

```
GET /docs         → 200 OK  (Swagger UI)
GET /redoc        → 200 OK  (ReDoc UI)
GET /openapi.json → 200 OK  (38,843 bytes of full schema)
```

**Impact:** An attacker gets a complete map of the API surface before writing a single line of attack code. Combined with the other findings, this is a significant force multiplier.

**Fix:**
```python
app = FastAPI(
    title="NaveAPI",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None,     # disable Swagger
    redoc_url=None,    # disable ReDoc
    openapi_url=None,  # disable schema
)
```

---

### 2. No Rate Limiting on Auth Endpoints
**Severity: High**

Six consecutive login attempts with invalid credentials all returned `HTTP 401` with no throttling, backoff, lockout, or `Retry-After` header.

**Impact:** Unlimited brute-force or credential-stuffing attacks against `/auth/login`. Combined with user enumeration via signup (finding #5), this is a full account takeover pathway.

**Fix options:**
- Add `slowapi` (FastAPI rate limiting middleware) to enforce per-IP limits on `/auth/login` and `/auth/signup`
- Configure Google Cloud Armor WAF rate-limiting rules on the Cloud Run service
- Implement exponential account lockout (e.g., 5 failures → 15-minute lockout stored in DB)

---

### 3. Missing All Security Headers
**Severity: High**

Every response is missing the standard set of HTTP security headers. Observed headers:

```
content-type: application/json
x-cloud-trace-context: ...
date: ...
server: Google Frontend
```

Missing headers and risks:

| Header | Risk if Absent |
|--------|---------------|
| `X-Frame-Options` | Clickjacking attacks |
| `X-Content-Type-Options` | MIME-sniffing attacks |
| `Strict-Transport-Security` | SSL stripping / downgrade attacks |
| `Content-Security-Policy` | XSS if ever serving HTML |
| `X-XSS-Protection` | Legacy browser XSS |
| `Referrer-Policy` | Token/path leakage in referrer header |

**Fix:** Add a security headers middleware to `main.py`:
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response
```

---

### 4. No CORS Middleware Configured
**Severity: High**

No `CORSMiddleware` is added to the app. No `Access-Control-*` headers are returned on any response regardless of the `Origin` sent.

```
curl -H "Origin: https://evil.com" https://api.naveapp.co/health
→ HTTP 200, no CORS headers returned
```

**Impact:** Lower immediate risk for a mobile-only app since React Native doesn't use browser CORS enforcement. However, if a web dashboard or admin panel is ever added, any origin can make requests with no restriction. If `*` is ever accidentally configured, CSRF-style attacks become possible.

**Fix:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://naveapp.co"],  # explicit allowlist
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

### 5. User Enumeration via Signup Endpoint
**Severity: Medium**

The signup endpoint returns `HTTP 409` with `"Email or username already in use"` when a field is already taken, allowing an attacker to determine whether an email is registered.

```
POST /auth/signup {"email": "existing@example.com", ...}
→ HTTP 409: {"detail": "Email or username already in use"}

POST /auth/signup {"email": "new@example.com", ...}
→ HTTP 201: {token + user data}
```

The login endpoint is correctly generic and does not enumerate.

**Fix:** Return a non-specific message: `"Could not create account with the provided details"`.

---

### 6. HTTP 401 vs 403 Status Code Inconsistency
**Severity: Low**

```
GET /feed (no Authorization header)    → HTTP 403 "Not authenticated"
GET /feed (Bearer invalidtoken)        → HTTP 401 "Invalid or expired token"
```

RFC convention: `401` = unauthenticated, `403` = authenticated but forbidden. FastAPI's `HTTPBearer` produces this inversion when the header is absent vs invalid.

**Fix:** Use `HTTPBearer(auto_error=False)` and handle both cases in the dependency to normalize both to `HTTP 401`.

---

### 7. Default JWT Secret Key in Config
**Severity: Info — Mitigated**

`config.py` has a hardcoded default:
```python
secret_key: str = "change-me-in-production"
```

Confirmed: production does **not** use this default — a JWT forged with that key was correctly rejected. The secret is injected via environment variable.

**Fix:** Remove the default to force explicit configuration:
```python
secret_key: str  # no default — Pydantic raises at startup if not set
```

---

### 8. Technology/Version Disclosure
**Severity: Info**

Every response includes `server: Google Frontend`. The full API version and framework stack are exposed in the OpenAPI schema:
```json
{"openapi":"3.1.0","info":{"title":"NaveAPI","version":"0.1.0"}}
```

Low risk on its own but helps attackers target known CVEs.

---

### 9. No Account Deletion Endpoint
**Severity: Info**

No `DELETE /users/me` or equivalent endpoint exists. Users cannot delete their own accounts, which is required by GDPR (Right to Erasure) and CCPA for users in the EU or California.

---

## What Looks Good

- JWT auth consistently enforced on all protected endpoints
- All DB queries use asyncpg parameterized queries (`$1`, `$2`, etc.) — no SQL injection risk
- bcrypt password hashing via `passlib`
- No stack traces leaked in error responses (global handler returns generic message)
- Login errors are generic — no email enumeration via login endpoint
- No dangerous endpoints exposed (`/metrics`, `/admin`, `/debug`, `/actuator` all 404)
- HTTPS/HTTP2 enforced via Cloud Run TLS termination
- 30-day JWT expiry — reasonable for a mobile app

---

## Prioritized Remediation

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Add rate limiting to `/auth/login` and `/auth/signup` | Low — add `slowapi` or Cloud Armor rule |
| 2 | Disable `/docs`, `/redoc`, `/openapi.json` in production | Low — 3 lines in `main.py` |
| 3 | Add security headers middleware in `main.py` | Low — ~10 lines |
| 4 | Add explicit CORS allowlist | Low — `add_middleware` call |
| 5 | Fix signup enumeration — return generic conflict message | Low — change one string |
| 6 | Add `DELETE /users/me` endpoint | Medium — new router endpoint + DB query |
| 7 | Remove default `secret_key` from `config.py` | Trivial |
| 8 | Fix 401/403 status code convention | Low — update `HTTPBearer` usage |

---

## Cleanup Note

A test account (`username: testuser999`) was created during the signup enumeration check. Remove it directly from the database:

```sql
DELETE FROM users WHERE username = 'testuser999';
```
