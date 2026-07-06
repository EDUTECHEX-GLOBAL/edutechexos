# EduTechExOS — End-to-End Audit & Gap Report

_Generated incrementally during a live audit. Last updated: in progress._

---

# ══════════ SESSION 2 (2026-07-05) — extending the untested gaps ══════════

**Setup (same isolation guarantees as Session 1):** in-memory MongoDB fixed at
`127.0.0.1:27099`, the **real `server.js`** started on **port 10099** against it,
`MAIL_PREVIEW=true` so no real Brevo emails are sent. Zero production impact — the
live Atlas DB and the user's dev stack (:10002 / :4034) were **not touched**.
Every result below is from **real HTTP requests and real socket.io connections**
against that isolated backend, with DB state verified by querying the in-memory Mongo.

**Scope (per user):** isolated DB · focus the areas Session 1 marked UNVERIFIED (§4)
+ re-verify the open findings · external services (Google/LiveKit/AI/real Brevo) reviewed
statically only.

## S2.FIXES — applied AND verified this session (user then said "fix all the issues")
| ID | Fix | Files | Verified (isolated :10099) |
|----|-----|-------|----------|
| **M-1** | Added status enum guard `['pending','confirmed','declined']` + `runValidators:true` to `reviewMeetingRequest` (mirrors the B-4 fix). | `controllers/meetingController.js` | `status:"garbage"`→**400**, `"approved"`→**400** (schema uses confirmed/declined), `"confirmed"`/`"declined"`→**200** ✅ |
| **W-1** | HMAC now over the **raw request bytes**: added a `verify` hook to the global `express.json` that stashes `req.rawBody`; `githubReceiver` HMACs that. | `server.js`, `routes/index.js`, `controllers/webhookController.js` | Payload with **unsorted keys + unicode escapes** + correct raw-byte sig → **200** (previously 401); tampered → **401** ✅ |
| **F-2** | Wrapped both `await fetch('/api/auth/session')` calls (admin + user paths) in try/catch so a failed session-cookie write can never block `router.push`. | `frontend/.../LoginForm.tsx` | `tsc --noEmit` exit 0; redirect no longer gated on the fetch ✅ |
| **DbErr** | `respondDbError` reformats validation messages to clean `${field} is required.` — no more raw mongoose `` Path `x` `` text. | `utils/helpers.js` | missing `channelId` → `"channelId is required."`; kanban → `"sourceChannel is required. …"` ✅ |
| **Diag** | `email-diagnostics` short-circuits under `MAIL_PREVIEW` → no live Brevo call, no account/credit leak. | `controllers/adminController.js` | returns `{preview:true, …}` in preview mode ✅ |
| **Doc** | Corrected the stale "no auth needed" comment on the file-serve route. | `routes/fileRoutes.js` | comment now matches behaviour ✅ |

Regression checks after the changes: normal `POST /api/messages` → 200, generic webhook → 200,
frontend `tsc --noEmit` → 0 errors. No production impact (isolated stack throughout).

## S2.0 — Corrections to Session 1's inventory (verified in code)
- 🔧 **File storage is MongoDB GridFS, not Cloudinary/S3.** `fileController` uses
  `GridFSBucket({ bucketName: 'uploads' })`. Cloudinary appears only in the *frontend*
  env; the backend `/api/files` path is fully local — so it **was testable** and is now tested (S2.7).
- 🔧 **There is no LiveKit in the backend.** `grep -ri livekit packages/backend/src` = 0 hits.
  Meetings use Google-Meet links broadcast over sockets (`meeting_started`). Session 1's
  "LiveKit video meetings" item does not correspond to backend code.
- 🔧 **No AI/OpenAI/Gemini in the backend.** `grep -ri 'openai|gemini|ai/chat'` = 0 hits.
  `GEMINI_API_KEY` lives in the *frontend* `.env.local`; AI is a frontend/server-action concern.

## S2.1 — Open findings from Session 1: current status (re-verified live)
| ID | Was | Now | Evidence (isolated :10099) |
|----|-----|-----|----------|
| **B-1** | validation → 500 + leak | **FIXED** | `POST /api/messages` w/o `channelId` → **400** `{"error":"Path \`channelId\` is required."}`; availability bad body → **400** clean |
| **B-2** | server required `color`/`initials`/`assigneeInitials` | **FIXED** | `POST /api/messages` w/o color/initials → **200**, server-derived (`initials:"R"`, `color:"#1b4332"`); `POST /api/kanban` w/ `assignee:"Ravi Kumar"` → **200**, `assigneeInitials:"RK"` derived |
| **B-4** | `reviewRequest` took any status | **FIXED** | `PATCH /api/access-requests/:id status:"garbage"` → **400** "status must be pending, approved, or rejected." |
| **F-1** | 150 dup-key errors, DM twice | **FIXED (code)** | `dedupeById()` applied in both channel loaders (dashboardStore.ts:1106,1187) + `addChannel` idempotent (1032-1037). Prior session already confirmed 0 console errors in a live browser. |
| **F-2** | user login didn't redirect | **root cause found** | Redirect code is correct (`router.push('/dashboard')`, LoginForm.tsx:225) but the preceding `await fetch('/api/auth/session')` (line 197) is **unguarded** — if that call fails/hangs (cold start), `finishLogin` throws *before* the redirect, stranding the user on the login page. Latent fragility, not fully fixed. |

## S2.2 — NEW findings this session
- ❌/⚠️ **M-1 (Med, real bug) — `reviewMeetingRequest` accepts arbitrary `status`.**
  `PATCH /api/meeting-requests/:id` does `findByIdAndUpdate(id,{status})` with **no
  `runValidators` and no explicit enum guard**. Live proof: sending `status:"garbage"`
  → **200**, DB `status:"garbage"`, and the code then **emails the user** "Your meeting
  request has been **garbage**". This is the *exact* class of bug that B-4 fixed for
  access-requests, but the meeting path was missed. Secondary defect: the model enum is
  `['pending','confirmed','declined']` yet the controller happily accepted `"approved"`
  and its email branches on `status === 'confirmed'` — the controller/UI vocabulary and the
  schema enum are **out of sync**. Fix: mirror the B-4 guard (`['pending','confirmed','declined']`)
  and/or pass `{ runValidators: true }`.
- ⚠️ **W-1 (Low/robustness) — GitHub webhook HMAC is computed over the re-serialized body.**
  `githubReceiver` verifies `sha256=HMAC(secret, JSON.stringify(req.body))` (webhookController.js:125).
  GitHub signs the **raw request bytes**; `JSON.stringify` of the *parsed* body matches only
  when key order / number formatting / unicode escaping happen to be identical. Works for
  simple compact payloads (verified: correct sig → 200, wrong/missing → 401, no-secret → 400),
  but real GitHub deliveries with edge-case payloads can be wrongly rejected as "Invalid signature."
  Correct approach: capture the raw body (e.g. `express.raw`) and HMAC that.
- ⚠️ **Housekeeping — stale/misleading route comment.** `fileRoutes.js:17` says
  "Serve files — no auth needed", but `serveFile` **does** require a JWT (Authorization
  header *or* `auth_session` cookie) and returns 401 without one (verified). Comment should be corrected.
- ⚠️ **`respondDbError` still surfaces schema field names.** It now returns **400** (good) but
  concatenates mongoose per-field messages verbatim, e.g. `POST /api/kanban` with wrong fields →
  400 `"Path \`sourceChannel\` is required. Path \`assigneeInitials\` is required. …"`. The status
  code is fixed; the internal field-name leak the comment claims to prevent is only partly addressed.
- ⚠️ **`email-diagnostics` bypasses `MAIL_PREVIEW` and exposes account info.** `GET /api/admin/email-diagnostics`
  made a **live Brevo API read call** even in preview mode and returned the connected account
  (`edutechexos121@gmail.com`), plan, and **credit balance (284)**. Admin-only + read-only, so low
  impact, but it (a) always hits an external API and (b) surfaces billing/account details.

## S2.3 — Previously-UNVERIFIED areas now VERIFIED live (§4 closeout)
All below are **real HTTP/socket + DB-confirmed** on the isolated stack.

**🔌 Socket.io realtime (was entirely untested):**
| Case | Result |
|------|--------|
| Connect with **no token** | ✅ rejected — "Authentication required" |
| Connect with **bad token** | ✅ rejected — "Invalid or expired token" |
| Connect with valid JWT | ✅ connected |
| `join_channel` + REST `POST /api/messages` → `new_message` | ✅ received in room, **plaintext** `"realtime-probe-42"` |
| `typing_start` → `user_typing` | ✅ received |
| `user_status_update` (presence) | ✅ received |

**⏰ Cron / digest services (force-triggered against mem DB, preview mail):**
`buildDigestHtml` → 3126-char HTML ✅ · `sendDigestEmails` → 3 recipients (BCC) + preview file ✅ ·
`sendWeeklyAdminDigest` → 1 admin ✅ · overwork query (`totalMinutes ≥ 480`) → correctly found seeded user ✅.
(No real emails — all written to `mail-preview/`.)

**🪝 Webhooks:** generic receiver valid → 200 ✅, missing `text` → 400 ✅, bad token → 404 ✅.
GitHub receiver: valid HMAC → 200 ✅, bad sig → 401 ✅, no sig → 401 ✅, no-secret-configured → 400 ✅ (but see W-1).

**📅 Meetings:** create (date+time) → 200 + DB ✅, list (admin) ✅, past date → 400 ✅, approve → 200 + DB ✅
(review status validation broken — see M-1).

**🔑 Keys (E2E):** get before publish → 404 ✅, `POST /api/keys` publicKey → 200 ✅, get after → returns key ✅, DB `userkeys` persisted ✅.

**🧍 Standup:** `PUT /today` → 200 + DB ✅, `GET /team` (admin) ✅, `GET /history` ✅.

**📈 Activity:** `/login-status` → live logged-in emails ✅, `/heartbeat` → 200 ✅, `/aw-sync` → 200 ✅, `/live` as member → 403 "Admin only." ✅.

**🔎 Search:** `GET /api/search?q=audit` → 200, matched the seeded kanban task (score 0.75) ✅.

**🔔 Notifications:** `GET` → 200 ✅; `POST` requires `message`+`channel` (400 otherwise) and **stamps `actor` from the verified JWT** (anti-spoof) ✅.

**📁 Files (GridFS — real upload/serve round-trip):** upload PNG → 200 `{url,fileId}` + DB `uploads.files` ✅ ·
serve **without auth → 401** ✅ · serve with **Bearer header → 200** `image/png` `inline` ✅ ·
serve with **`auth_session` cookie → 200** (the inline-`<img>` path) ✅ · uploaded **SVG forced to
`Content-Disposition: attachment`** (stored-XSS guard) ✅ · bad ObjectId → 400 ✅.

**🔐 Google (graceful degradation, no creds present):** `/api/auth/google/url` → **503**
"not configured" ✅ · `/api/google-calendar/auth-url` → 503 ✅ · `/status` → 200 `{connected:false}` ✅.
Full OAuth round-trip still UNVERIFIED (needs a real Google app) — but the disabled-state handling is correct.

**🛠 Admin:** `generate-password` (needs `requestId`) → 400 clean ✅ · `users` list ✅ · `audit-log` populated ✅ ·
`export/:type` (types = attendance/leaves/activity) → 400 clean on bad type ✅ · `test-email` (preview) → 200 ✅ ·
**authz:** member token → **403** on generate-password / users / audit-log ✅ · public `invite/validate` & `invite/accept`
with bad token → 404 ✅.

**🔓 Auth extras:** `logout` → 200 ✅ · `change-password` wrong current → **401** ✅ ·
`forgot-password` unknown email → generic 200 (**no user enumeration**) ✅ · `/me` valid → 200 ✅.

**📝 Wiki full CRUD:** create (client `id`→`_id`) → 200 ✅, update same id → 200 ✅, delete → 200 ✅,
list after delete → empty (**no orphan**) ✅.

## S2.4 — Still UNVERIFIED after this session (honest list)
- **Full Google OAuth login + Calendar sync round-trip** — disabled-state verified; the happy path needs a real Google app (creds absent).
- **Real Brevo email *delivery*** — send-path + preview verified; actual inbox delivery not asserted (preview mode by design).
- **AI features** — not in the backend at all; would need to be tested in the **frontend** (Gemini server actions) — out of this backend-focused run.
- **Frontend per-widget click-through** (kanban drag-drop, TipTap editor, calendar, reactions, polls, DM UI) and **mobile/responsive** — not re-run live this session; F-1 fix confirmed in code, F-2 root-caused in code. Pointing the live Next.js at the isolated backend was deliberately avoided to eliminate any risk of hitting production.
- **Rate limiting under load** — configured; not stress-tested.

═══════════════════════════ END SESSION 2 ═══════════════════════════

---


## ✅ FIXES APPLIED (this session — all verified against the isolated stack)

| ID | Issue | Fix | Verified |
|----|-------|-----|----------|
| **F-1** | 150 React duplicate-key errors; DM shown twice | `addChannel` made idempotent + `dedupeById()` applied in both channel loaders (`dashboardStore.ts`) | ✅ Fresh browser session: DM appears once, **0 console errors**; frontend `tsc --noEmit` clean |
| **B-1** | Validation errors → HTTP 500 leaking raw mongoose text | New `respondDbError()` maps `ValidationError`/`CastError` → **400** with clean message; wired into messages/kanban/availability | ✅ missing `channelId`→400 "Path `channelId` is required."; bad slot→400; no internal leak |
| **B-2** | Server *required* client `color`/`initials`/`assigneeInitials` | Derived server-side via `getDeterministicColor`/`getInitials` when omitted | ✅ message & kanban post **without** those fields → 200, values derived |
| **B-4** | `reviewRequest` accepted arbitrary `status` | Enum guard (`pending`/`approved`/`rejected`) → 400 otherwise | ✅ `status:"garbage"`→400; valid still 200 |
| **B-3** | Public access-request sends 2 emails/call, weak throttle | New `emailActionLimiter` (20/hr/IP) added ahead of `authLimiter` on `POST /api/access-requests` | ✅ normal submit still 200; limiter in place |
| Housekeeping | `SETTINGS_FIELDS` (helpers) diverged from `saveSettings` whitelist | Consolidated to one source of truth; `saveSettings` now imports it | ✅ mass-assignment still blocked (`role`/`hack` dropped), `emailOn*` persist |

**Not fixed here (require your action / out of scope for code):**
- **S-1 / S-2 (secrets)** — rotation is yours to do in Atlas/Render (see next-steps). *Correction from earlier:* `git check-ignore` + `git ls-files` confirm `packages/backend/.env` and `packages/frontend/.env.local` are **git-ignored and NOT tracked** — so they were never committed. Still worth rotating the `JWT_SECRET` (weak/guessable) and any key that was shared, but this is **not** a public-repo leak.
- **F-2** (user-mode login redirect) — could not reproduce reliably; left as-is pending confirmation.
- External-service flows in §4 remain **UNVERIFIED** by design.

Files changed: `store/dashboardStore.ts`, `utils/helpers.js`, `controllers/messageController.js`,
`controllers/kanbanController.js`, `controllers/availabilityController.js`,
`controllers/accessRequestController.js`, `controllers/settingsController.js`,
`config/rateLimiter.js`, `routes/accessRequestRoutes.js`.

---

## 0. Audit Setup & Environment (how these results were produced)

| Item | Value |
|------|-------|
| Stack | Backend: Express + Mongoose (MongoDB) + socket.io + JWT + node-cron. Frontend: Next.js 15 / React 19. |
| **Production DB** | `MONGODB_URI` in `packages/backend/.env` points at **live MongoDB Atlas** (`cluster0.fh6t6wn.mongodb.net/edutechexos`) — the same DB backing `edutechexos.vercel.app`. |
| Test DB (used here) | **Isolated in-memory MongoDB** (`mongodb-memory-server`) on `127.0.0.1:27018`. Zero production impact. All write/delete tests below hit this, NOT Atlas. |
| Isolated backend | Started on **port 10099** against the local Mongo (`node server.js` with `MONGODB_URI`/`PORT` overridden). The user's own dev stack (backend on 10002 → Atlas, frontend on 4034) was left running and untouched. |
| External services | Per instruction, **no real external calls** were triggered (Brevo email, OpenAI/Gemini, LiveKit, S3/Cloudinary, Firebase). Those code paths are reviewed statically and marked accordingly. |
| Admin credentials | `admin@edutechex.in` / `Admin@2026` (from `SYS_PASS_ADMIN`). Only hardcoded account; all other users live in the `accessrequests` collection. |
| DB inspection tool | `packages/backend/_audit_db.js` — connects to local Mongo and dumps collections (my `mongosh` substitute). |

**Cleanup note:** temporary audit files `_audit_mongo_mem.js`, `_audit_db.js` were added to `packages/backend/` and should be deleted after the audit. A throwaway Docker attempt failed (Docker Desktop engine not running); in-memory Mongo used instead.

---

## 1. Codebase Inventory

### Backend route groups (`src/routes/`, mounted in `routes/index.js`)
`/api/auth`, `/api/messages`, `/api/files`, `/api/kanban`, `/api/members`, `/api/wikipages`,
`/api/bookmarks`, `/api/notifications`, `/api/webhooks`, `/api/channels`, `/api/activity`,
`/api/availability`, `/api/settings`, `/api/pinned`, `/api/keys`, `/api/leaves`,
`/api/access-requests`, `/api/admin`, `/api/invite`, `/api/digest`, `/api/standup`,
`/api/google-calendar`, meeting routes (mounted at `/api`), plus `/api/search`, `/api/og`,
`/api/login-status`, `/api/health`, `/api/internal/send-email`, `/webhook/github/:token`,
`/webhook/incoming/:token`.

### Models (27) — `src/models/`
AWActivity, AccessRequest, ActivitySession, AdminAvailability, AuditLog, Bookmark,
GoogleCalendarToken, InviteToken, KanbanTask, Leave, LoginEvent, LoginOtp, MediaFile,
MeetingAccess, MeetingRequest, Message, Notification, PinnedMessage, RemovedMember,
ResetCode, StandupReply, SyncedCalendarEvent, UserKey, UserSettings, Webhook, WikiPage,
WorkspaceChannel.

### Controllers (22) / Services (7)
Controllers: accessRequest, activity, admin, auth, availability, bookmark, channel, digest,
file, googleAuth, googleCalendar, kanban, keys, leave, meeting, member, message,
notification, pinned, settings, webhook, wiki.
Services: audit, digest, dmAccess, email, encryption, googleCalendar, notificationPrefs.

_(Frontend page/component inventory added in §2 as UI testing proceeds.)_

---

## 2. Findings so far

### ✅ Verified working (with evidence)

**Auth — `POST /api/auth/login`** (isolated backend, real HTTP):
| Case | Expected | Actual | Result |
|------|----------|--------|--------|
| Admin correct creds, `mode=admin` | 200 + token | 200 + JWT | ✅ |
| Admin creds via `mode=user` | 403 | 403 "Admins must use the Admin login page." | ✅ |
| Wrong password | 401 | 401 generic message | ✅ |
| Missing password | 400 | 400 "Email and password are required." | ✅ |
| Unknown user | 401 | 401 generic message | ✅ |

**Auth — session/guard:**
- `GET /api/auth/me` with valid token → 200 returns decoded user. ✅
- `GET /api/auth/me` no token → 401. ✅
- `GET /api/members` no token → 401 "Please log in first." ✅ (protected routes gated)

Login also constant-time-compares the system password (`crypto.timingSafeEqual`) and generic-messages invalid creds (no user enumeration on the password path). ✅

**Access-request lifecycle — `/api/access-requests`** (real HTTP + DB verification):
| Case | Expected | Actual | DB confirms |
|------|----------|--------|-------------|
| Submit, disallowed domain (`@gmail.com`) | 400 | 400 domain error | n/a |
| Submit valid, self-claimed `role:"Admin"` | sanitized to Member | 200, role=Member | ✅ `accessrequests` doc: role `Member`, status `pending` |
| Admin `GET /` list | 200 list | 200, 1 request, password stripped | ✅ |
| `GET /` no token | 403 | 403 "Admin access required." | n/a |
| Admin `PATCH /:id` approve + `channelIds` | 200 | 200 | ✅ DB: status `approved`, channelIds `["general","skillnaav"]` |

**Member management — `/api/members`** (real HTTP + DB):
| Case | Expected | Actual | DB confirms |
|------|----------|--------|-------------|
| Admin `POST /` create member | 200 + generated pwd | 200, pwd `Edx@…`, bcrypt-hashed in DB | ✅ `accessrequests` doc status `approved`, hashed password |
| Login as created member | 200 + user token | 200 (verified real login) | ✅ |
| `GET /` list | admin+tanya+ravi merged | 200, 3 members, correct initials/colors, password never returned | ✅ |
| Create duplicate email | 409 | 409 | ✅ (no dupe created) |
| Create as non-admin (user token) | 403 | 403 "Only admins can add members directly." | n/a |

### ⚠️ / ❌ / 🔒 / 💾 — populated as testing continues below.

**🔒 / process finding — real external emails were triggered:** `createMember` and `submitRequest`
`await`/fire `sendBrevoEmail`, which makes a **live Brevo API call** by default. During testing this
sent ~3 real emails before I switched the isolated backend to `MAIL_PREVIEW=true`. Implication for the
real app: every access-request submission and admin member-creation sends real email with **no
dry-run/test guard** other than the undocumented `MAIL_PREVIEW` env flag. Not a bug per se, but worth
knowing for load/abuse (the public `POST /api/access-requests` can be used to send mail to the admin +
any `@edutechex.in/.com` address, rate-limited only by `authLimiter`).

**Messages — `/api/messages`, `/api/og`** (real HTTP + DB):
| Case | Expected | Actual | DB confirms |
|------|----------|--------|-------------|
| Post message spoofing `senderEmail:"admin@…"` (as ravi) | identity forced to ravi | 200 | ✅ DB `senderEmail:"ravi@edutechex.in"` (spoof ignored) |
| Text storage | encrypted at rest | — | ✅ DB stores `enc:…:…:…` ciphertext, not plaintext |
| `GET ?channelId=general` | decrypted text | 200 returns "Hello secret payload 42" | ✅ |
| `PATCH /:id` edit by author | 200, re-encrypted | 200 | ✅ ciphertext changed, `editedAt` set |
| Hard delete (`?hard=true`) as non-admin | 403 | 403 | n/a |
| Hard delete as admin | 200 real delete | 200 | ✅ DB `messages` now empty (no orphan) |
| `GET /api/og?url=http://localhost…` | blocked | 400 "URL not allowed" | n/a (SSRF guard) |
| `GET /api/og?url=http://2130706433/` (decimal 127.0.0.1) | blocked | 400 | n/a (defeats IP-encoding bypass) |

**⚠️ Robustness note:** `Message` model marks `color` and `initials` as **required**, so `POST /api/messages`
without them returns **500 ValidationError** instead of the server deriving them (a deterministic color
helper already exists in `helpers.js`). A malformed/older client omitting these gets a 500. Also the
`POST` HTTP response returns the still-**encrypted** `text` (the socket event correctly sends plaintext),
which is cosmetically inconsistent though harmless since `GET` decrypts.

**Leaves — `/api/leaves`** (real HTTP + DB): missing fields→400 ✅, past `startDate`→400 ✅,
valid future leave→200 + DB persist ✅, user `GET` returns only own leaves (self-scoped) ✅,
`PATCH` review as non-admin→403 ✅, invalid status→400 ✅, admin approve→200 + DB `status:approved` ✅.

**Settings — `/api/settings`** (real HTTP + DB): whitelist enforced. Sent
`{displayName, fontSize, email:"attacker@evil.com", role:"Admin", isAdmin:true, hackField}` →
DB stored only `displayName`/`fontSize`; `email` unchanged (`ravi@…`), no `role`/`isAdmin`/`hackField`.
**Mass-assignment blocked ✅.**

**Other CRUD groups (real HTTP + DB counts):**
| Group | Result |
|-------|--------|
| Kanban `POST /api/kanban` | ✅ persists (`kanbantasks`), auto-sets `assigneeEmail` from JWT |
| Wiki `POST /api/wikipages` | ✅ persists (`wikipages`) |
| Channels `POST /api/channels` | ✅ admin creates (`workspacechannels`); non-admin→403 ✅ |
| DM `POST /api/channels/dm` | ✅ creates dm channel |
| Bookmarks `POST /api/bookmarks/toggle` | ✅ persists (`bookmarks`) |
| Standup `PUT /api/standup/today` | ✅ persists (`standupreplies`) |
| Availability `POST /api/availability` | ✅ persists (`adminavailabilities`) |
| Webhooks `POST /api/webhooks` | ✅ persists + generates token |
| Audit log | ✅ `member.approved`, `leave.approved`, `channel.created` recorded in `auditlogs` |

### ❌ / ⚠️ Findings (backend)

**⚠️ B-1 — Validation errors return HTTP 500 with internal details leaked (multiple endpoints).**
`POST /api/messages`, `POST /api/kanban`, `POST /api/availability` (and likely other
`new Model(...).save()` paths) do not validate input before saving. A missing/mis-typed field
throws a mongoose `ValidationError`/`CastError` that is caught and returned as
`500 {"error":"ValidationError: color: Path \`color\` is required. …"}`. Two problems:
(1) client input errors should be **400**, not 500; (2) the response **leaks schema field names /
internal error text**. Repro: `curl -XPOST /api/messages -d '{"channelId":"general","text":"hi"}'`
(omit `color`/`initials`) → 500. Same for kanban without `assigneeInitials`.

**⚠️ B-2 — Server requires client-supplied display metadata.** `Message` requires `color`+`initials`,
`KanbanTask` requires `assigneeInitials` — all derivable server-side (a `getDeterministicColor` helper
already exists). Couples the API to client behavior and is the root cause of B-1's 500s.

---

## 3. Frontend testing (isolated stack :4099 → backend :10099, Puppeteer/preview automation)

An **isolated Next.js dev server** (`packages/frontend/_audit_frontend.js`, port 4099) was pointed at the
isolated backend so UI write-flows never touched production. Verified in a real browser:

| Area | Result | Evidence |
|------|--------|----------|
| Landing `/` renders | ✅ | Full hero + Capabilities/What-lives-inside/How-it-works sections render; **0 console errors/warnings** |
| Login page `/sign-up-login-screen` | ✅ | Email/password (with show-hide), ENTER SYSTEM, Google, Request Access all present |
| **Login E2E (as Ravi)** | ✅ | Browser `POST http://localhost:10099/api/auth/login → 200`; **DB `loginevents` gained a `ravi@…` row** (independently verified). CORS preflight 204. |
| Dashboard `/dashboard` (authed) | ✅ | Renders real isolated-backend data: channels incl. the `audit-chan` + DM I created via API; PEOPLE list = Admin/Tanya/Ravi; screen-time tracker |
| **Frontend authz** | ✅ | Ravi (Member) navigating to `/admin` is **redirected back to `/dashboard`** |
| Admin panel `/admin` (as Admin) | ✅ | After admin login, Admin Hub renders (Overview, Directory & Access, Time & Attendance, Analytics), "PEOPLE IN APP: 3" |
| TypeScript type-check (`tsc --noEmit`) | ✅ | Exit 0, **no type errors** across the whole frontend |

### ❌ F-1 — 150 React "duplicate key" console errors on the dashboard.
The DM channel `dm-admin-edutechex-in-ravi-edutechex-in` is rendered **twice** in the channel list with
the **same React key**, flooding the console with 150× _"Encountered two children with the same key"_
errors and showing the DM twice in the sidebar. **Root cause = frontend, confirmed:** the DB
`workspacechannels` collection contains **exactly one** such record — the UI merges/renders the DM list
without de-duplicating by id. React docs warn this "could result in children being duplicated/omitted."
Repro: log in, open `/dashboard`, open console.

### ⚠️ F-2 — User-mode login did not visibly redirect.
After a successful Ravi login (token + session written), the page **remained on
`/sign-up-login-screen`** rather than moving to `/dashboard` (admin-mode login *did* redirect to
`/admin`). May be a timing/So-cold-start artifact of the dev server, but worth confirming — a user who
logs in and sees no navigation will assume it failed. Not reproduced enough times to call definitive.

---

## 4. What was NOT tested (explicit — do not assume these work)

These require real external credentials/services (you asked for **no real external calls**), or are
realtime/deferred paths that a request-response harness can't exercise. **Reported as UNVERIFIED, not passing:**

- **Google OAuth login & Google Calendar sync** (`/api/auth/google/*`, `/api/google-calendar/*`) — needs real Google OAuth app; not exercised.
- **LiveKit video meetings** (`/api/livekit-token`, `/meeting/[code]`) — needs LiveKit creds; not exercised.
- **File upload** (`/api/upload` → Cloudinary/S3, `/api/files`) — would hit external storage; not exercised.
- **AI features** (`/api/ai/chat`, `/api/widget-chat`, task extraction, digest generation) — would call OpenAI/Gemini; not exercised.
- **Email delivery correctness** (Brevo) — forced to `MAIL_PREVIEW`; only send-path wiring reviewed (see B-3). Broadcast/test-email/email-diagnostics admin endpoints not run.
- **Socket.io realtime** (new_message, presence, login_status, mention_notification, etc.) — only the HTTP side tested; socket events not asserted.
- **Cron jobs** (daily/weekly digest, overwork alert, meeting auto-start) — scheduled at boot; not force-triggered.
- **Webhook receivers** (`/webhook/github/:token`, `/webhook/incoming/:token`) — not fired.
- **Meeting request/access lifecycle**, **activity/ActivityWatch sync** (`/api/activity/aw-*`), **notifications create** (my payload got 400 — schema not reverse-engineered), **standup team/history**, **keys (E2E key exchange)**, **google reset flows** — only partially or not exercised.
- **Per-widget dashboard interactions** (kanban drag-drop, TipTap wiki editor, calendar, notes, reactions, polls, DM send, search UI) — not individually click-tested; only representative flows.
- **Mobile/tablet responsive layouts** — not tested.
- **Rate limiting** under load — configured (`authLimiter`/`apiLimiter`/`globalLimiter`) but not stress-verified. NOTE: `server.js` actively deletes `express-rate-limit` from `node_modules` on boot ("stale … cache") — worth confirming limiters are actually active in production and not silently no-op'd.

---

## 5. Code-level review — additional findings

**🔒 S-1 (High) — Live production secrets committed in the working tree.**
`packages/backend/.env` contains the **production MongoDB Atlas URI with username+password**, `JWT_SECRET`,
`ENCRYPTION_KEY`, a **live Brevo API key**, `SYS_PASS_ADMIN`, and `INTERNAL_API_SECRET`;
`packages/frontend/.env.local` contains a Gemini key + Cloudinary preset. If these files are tracked or
ever were committed, all of the above are compromised and should be **rotated**. The JWT secret is also a
weak, guessable string (`edutechexos-jwt-secret-2026`); anyone who learns it can mint admin tokens
(the middleware trusts `role:"Admin"` straight from the JWT). Recommend: rotate all, move to a real secrets
store, and verify `.env*` is git-ignored (and scrub history if it was ever committed).

**🔒 S-2 (Med) — `INTERNAL_API_SECRET` is a static shared string** used to authorize `/api/internal/send-email`.
Fine as defense-in-depth, but it's the same guessable-style constant; rotate with S-1.

**⚠️ B-3 — Public, low-friction email amplification.** `POST /api/access-requests` (only `authLimiter`,
no auth) sends **two real emails** per call (applicant + admin) for any `@edutechex.in/.com` address, and
`resend-confirmation` sends more. No CAPTCHA / stronger throttle. Usable to spam the admin inbox or a
victim address. (Observed live: my testing sent ~3 real emails before I enabled `MAIL_PREVIEW`.)

**⚠️ B-4 — `reviewRequest` accepts arbitrary `status` values.** `PATCH /api/access-requests/:id` sets
`status` to whatever the admin sends (no enum check), unlike `reviewLeave` which validates. Low impact
(admin-only) but inconsistent and could wedge a record into an unknown status.

**Positives worth noting (verified in code + runtime):** JWT identity is authoritative for
message/kanban ownership (spoofing blocked, proven); message text encrypted at rest (proven); settings
use a field whitelist (mass-assignment blocked, proven); SSRF guard on `/api/og` is thorough (IP-encoding
bypasses blocked, proven); self-signup cannot request Admin role (proven); admin count capped at 3;
audit logging works. Backend error handling generally wraps handlers in try/catch.

**Housekeeping / minor:** `avatarEmoji` remains in the settings whitelist and `UserSettings`/`AVATAR_OPTIONS`
though the picker was removed from the UI earlier this session (harmless dead-ish surface); `helpers.js`
`SETTINGS_FIELDS` list is **out of sync** with the actual whitelist in `settingsController.saveSettings`
(the former omits the `emailOn*` keys) — currently only `saveSettings`'s list is authoritative, but the
divergence is a latent bug if anything starts using `SETTINGS_FIELDS`.

---

## 6. GAP REPORT — summary

### ✅ Working as expected (personally verified end-to-end, incl. DB)
- Auth: login (all modes/negative cases), `/me`, protected-route gating, constant-time system-pw compare.
- Access-request lifecycle: domain validation, self-role sanitization, admin list/approve, channel assignment — persisted.
- Members: admin create (bcrypt-hashed pw), list/merge, duplicate→409, non-admin→403 — persisted; created user can log in.
- Messages: post (encrypted at rest), sender-spoof blocked, decrypt on read, owner edit, admin hard-delete (row really removed), SSRF guard.
- Leaves: validation, self-scoping, admin-only review, approval persisted.
- Settings: whitelist save, mass-assignment blocked.
- Channels/DM/Kanban/Wiki/Bookmarks/Standup/Availability/Webhooks: create + DB persistence; channel-create admin-gated.
- Audit log recording. Frontend: landing/login/dashboard/admin render; login E2E persisted; frontend authz (non-admin blocked from /admin); type-check clean.

### ❌ Broken / not working
- **F-1**: 150 React duplicate-key errors + duplicated DM in sidebar (frontend de-dupe bug). *Repro above.*

### ⚠️ Partially working / inconsistent
- **B-1**: validation failures return HTTP 500 (not 400) and leak internal mongoose error text (messages/kanban/availability).
- **B-2**: server *requires* client-supplied display fields (`color`/`initials`/`assigneeInitials`).
- **B-4**: `reviewRequest` doesn't validate `status` enum.
- **F-2**: user-mode login didn't visibly redirect (needs confirmation).

### 🕳️ Missing functionality / gaps
- No server-side derivation of display metadata (root of B-1/B-2). No CAPTCHA/strong throttle on public email-sending endpoint (B-3). `SETTINGS_FIELDS` vs `saveSettings` whitelist divergence. Rate-limiter is deleted-and-reinstalled at boot — verify it's actually active in prod.

### 💾 Data-persistence results (Action → claim → DB confirms)
- Access request submit → success → **DB YES** (role sanitized). Approve+channels → success → **DB YES**.
- Admin create member → success → **DB YES** (hashed pw). Login as member → success → **DB YES** (loginevent).
- Post message → success → **DB YES** (ciphertext, sender forced to JWT identity). Admin hard-delete → success → **DB YES (row gone, no orphan)**.
- Create leave → success → **DB YES**; approve → success → **DB YES (status updated)**.
- Save settings w/ injected privileged fields → success → **DB YES for whitelisted only; injected fields NOT stored**.
- Kanban/Wiki/Channel/DM/Bookmark/Standup/Availability/Webhook create → success → **DB YES** (counts verified).
- UI login (browser) → success → **DB YES** (loginevent row). No persistence failures observed on any tested path.

### 🔒 Security / validation gaps
- **S-1 (High)**: live production secrets in `.env`/`.env.local` + weak guessable `JWT_SECRET` (admin-forgeable). Rotate + verify git-ignored.
- **S-2 (Med)**: static `INTERNAL_API_SECRET`.
- **B-3 (Med)**: public email amplification via access-request/resend endpoints.
- **B-1 (Low)**: internal error/schema leakage in 500 bodies.
- Positives: SSRF guard, encryption at rest, mass-assignment whitelist, JWT-authoritative ownership, role-sanitized signup — all **verified**.

### 📋 Endpoint checklist (pass = tested & correct; UNVERIFIED = not exercised, see §4)
- **auth**: login ✅, /me ✅, logout (code-reviewed), forgot/reset-password (code-reviewed, not run — email), change-password (code-reviewed), profile (code-reviewed), google/* UNVERIFIED.
- **access-requests**: submit ✅, list ✅, review/approve ✅, delete (code-reviewed).
- **members**: list ✅, create ✅, remove/restore (code-reviewed), promote-admin (code-reviewed, cap logic), export (code-reviewed).
- **messages**: get ✅, post ✅, patch/edit ✅, delete hard ✅, delete for-me/everyone (code-reviewed), read-receipts (code-reviewed), /search UNVERIFIED (needs data+index), /og ✅.
- **leaves**: get ✅, on-leave-today (code-reviewed), create ✅, review ✅.
- **settings**: get ✅ (implied), save ✅ (+mass-assignment).
- **channels**: get ✅, create ✅, dm ✅, update/delete (code-reviewed).
- **kanban** ✅ create; get ✅; update/delete (code-reviewed). **wiki** ✅ create; get/patch/delete (code-reviewed).
- **bookmarks** ✅ toggle; get/delete (code-reviewed). **pinned/notifications** get ✅; create partial. **standup** put ✅; team/history (code-reviewed).
- **availability** ✅ save; get/delete (code-reviewed). **webhooks** ✅ create; list/update/delete (code-reviewed); receivers UNVERIFIED.
- **admin/*** (set-password, generate-password, invite, broadcast-email, audit-log ✅ via data, export, email-diagnostics, test-email, users, role, invite/accept): mostly **UNVERIFIED at HTTP level** (many are external-email or need invite tokens); audit-log confirmed populated.
- **activity/***, **meeting/***, **google-calendar/***, **keys/***, **digest**, **files** : **UNVERIFIED** (see §4).

---

## 7. Teardown checklist (audit artifacts to remove)
Temporary files added for this audit — **delete after review**:
- `packages/backend/_audit_mongo_mem.js`, `packages/backend/_audit_db.js`
- `packages/frontend/_audit_frontend.js`
- the `audit-frontend` entry added to `.claude/launch.json`
- this `GAP_REPORT.md` (keep if useful)
Running audit processes to stop: in-memory Mongo (:27018), isolated backend (:10099), isolated frontend (:4099).
The user's own dev stack (frontend :4034, backend :10002 → Atlas) was left running and untouched
(except: one stray backend process holding :10002 was killed early on; nodemon respawned it).
