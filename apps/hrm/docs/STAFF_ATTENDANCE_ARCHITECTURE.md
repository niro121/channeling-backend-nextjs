# Staff Attendance (RFID / Finger-scan) — Architecture & Implementation Guide

Guidance for building the **Staff Attendance** module group in `apps/hrm`.
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).
Roster attendance enum remains on Duty Roster — see `ROSTER_SHIFTS_MANAGER_GUIDE.md` (no auto-overwrite from RFID until HR confirms).

**Status:** P0–P2 backend done; **P3 RFID Attendance UI** started (14 Sep 2026). Corrections page is a stub linked from Add Correction.  
**Build path:** Schema / identity → Device ingest API → Day recompute → UI (RFID Attendance) → Corrections / Export → Optional Duty Roster confirm sync.  
Pages must not call Prisma. No business rules in components. Device traffic uses **REST API routes**, not Server Actions.

**UI gate:** Additional RFID Attendance mocks welcome for polish; primary live dashboard mock is in use for P3.

---

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Identity:** `Staff.hrDetails.fingerPrintRfid` is the canonical device user ID (exact value the machine will send, trimmed). Unique among active staff. |
| 2 | **Timezone:** All day boundaries, Late cutoffs, overnight punch windows use **Asia/Colombo**. |
| 3 | **Duty Roster sync:** RFID-derived status stays **separate** until HR confirms. Do **not** auto-overwrite `RosterAllocation.attendance`. |
| 4 | **Device hardware:** Not chosen yet. HRM exposes a **vendor-neutral punch ingest API**; adapters (push / pull / CSV) live outside or beside the app. |
| 5 | **Mapping table:** Start **without** `AttendanceIdentityMap`. Add later only if enrollment ID ≠ device ID (legacy Emp No, reissued cards). |
| 6 | **Permission:** One resource `attendance` for the whole Staff Attendance group (same pattern as OT → `overtime-requests`). |
| 7 | **Punch log is immutable:** Corrections adjust `AttendanceDay` (and optional correction audit), never delete or rewrite device punches. |
| 8 | **Staff RFID enrollment:** Text input remains the stored value today. **Scan-from-reader** capture on the staff general form is planned **after device / gateway setup** (see §4.3). |

**Existing hooks already in the codebase:**

- Staff enrollment field: `fingerPrintRfid` on `StaffHrDetails` + denormalized `Staff.fingerPrintRfid` (UI: staff general form text field today; scan-to-capture later — §4.3).
- Planned shift + Late thresholds: `ShiftType.graceMinutes` / `lateThresholdMinutes` / `earlyExitThresholdMinutes`.
- Planned duty cell: `RosterAllocation` (`attendance` enum, overnight `attendanceAllocation`).
- Permission route reserved: `/attendance` → `attendance` (`PERMISSION_FLOW.md`, `HRM_DEVELOPMENT_GUIDELINES.md` §9).
- Roster guide explicitly deferred RFID engine in v1 — this doc owns the engine.

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/rfid-attendance` | `attendance` | Live RFID check-ins dashboard (summary cards + streaming table + filters) |
| `/attendance-daily` | `attendance` | Daily register (`AttendanceDay` list, export) |
| `/attendance-devices` | `attendance` | Reader registry / health |
| `/attendance-corrections` | `attendance` | Manual corrections (“Add Correction”) |

Sidebar group (target): **Staff Attendance** — RFID Attendance, Daily Register, Devices, Corrections.

Primary mock for Phase UI: **RFID Attendance** — live check-ins from N readers, Today Present / Late / Missing Punches / Absent / Exceptions, filters (Department, Location, Date, Shift, Staff), Refresh / Export / Add Correction.

---

## 2. High-level architecture

```
Finger-scan / RFID readers
        │
        ▼
Device Gateway / Adapter  (push preferred; pull or CSV fallback)
        │  POST /api/attendance/punches  (API key / HMAC)
        ▼
┌───────────────────────────────────────────────────────────────┐
│ HRM Attendance Engine                                         │
│  1. Resolve staff by fingerPrintRfid                          │
│  2. Append AttendancePunch (immutable)                        │
│  3. Recompute AttendanceDay (Asia/Colombo)                    │
│  4. Optional: publish live event (SSE / poll)                 │
└───────────────────────────────────────────────────────────────┘
        │
        ├──► RFID Attendance UI (live + summaries)
        ├──► Daily register / Export
        └──► HR “Confirm to Duty Roster” ──► RosterAllocation.attendance
```

### Layering (align with HRM guidelines)

| Concern | Layer |
|---------|--------|
| Device punch ingest | `app/api/attendance/...` → `services/attendance-services/*` |
| Corrections, confirm-to-roster, export, device CRUD | Server Actions → services |
| Late / Missing / pairing rules | Services only (`attendance-rules.service.ts`) |
| Live dashboard data | Server Components + client poll/SSE; no Prisma in UI |

---

## 3. Data model (target)

MongoDB collections via `apps/hrm/prisma/schema.prisma`. Names are proposals; keep codes via `generateRecordCode` where a human-facing code is needed.

### 3.1 Staff identity (existing + constraints)

```
Staff.hrDetails.fingerPrintRfid  String?   // enrollment; must match device payload
```

**Required behaviours (application + index):**

- Trim on create/update.
- Unique among **active** staff (`status = 1`); reject duplicates with a clear error.
- Lookup path for ingest: `findFirst` / indexed query on `hrDetails.fingerPrintRfid`.

> Prisma embedded types on Mongo may require an application-level uniqueness check and a dedicated index strategy (e.g. denormalize `fingerPrintRfid` onto `Staff` root later if query performance needs it). Document the chosen approach in the P0 checklist when implementing.

### 3.2 `AttendanceDevice`

| Field | Notes |
|-------|--------|
| `code` | Unique reader code (e.g. `GATE-01`) |
| `name` | Display name |
| `location` / `locationId` | Filter “Location” |
| `status` | `active` \| `inactive` |
| `lastSeenAt` | Updated on successful punch ingest |
| `apiKeyHash` | Optional per-device key (prefer hashed) |

### 3.3 `AttendancePunch` (immutable event stream)

| Field | Notes |
|-------|--------|
| `deviceId` | Relation / ObjectId |
| `deviceCode` | Snapshot for display |
| `externalPunchId` | Device/middleware id — **idempotency** with `deviceId` |
| `rfid` | Raw ID from machine |
| `staffId` | Resolved staff; null if unmatched |
| `punchedAt` | Instant (store UTC; interpret day in Asia/Colombo) |
| `direction` | `in` \| `out` \| `unknown` |
| `source` | `device` \| `manual` \| `import` |
| `matchStatus` | `matched` \| `unmatched` \| `inactive_staff` |
| `rawPayload` | Optional JSON audit |

**Indexes:** `(punchedAt)`, `(staffId, punchedAt)`, `(rfid, punchedAt)`, unique `(deviceId, externalPunchId)`.

### 3.4 `AttendanceDay` (dashboard + summaries)

One document per staff per **calendar date in Asia/Colombo**.

| Field | Notes |
|-------|--------|
| `staffId`, `date` | Unique pair (`date` = UTC start-of-day for that Colombo date) |
| `firstInAt`, `lastOutAt` | Pairing result |
| `status` | `present` \| `late` \| `absent` \| `missing_punch` \| `on_leave` \| `not_rostered` |
| `flags` | e.g. `missing_in`, `missing_out`, `early_exit`, `exception` |
| `shiftTypeId` | From planned `RosterAllocation` when present |
| `rosterAllocationId` | Optional link |
| `department`, `location` | Denormalized for filters |
| `confirmedToRosterAt` | Set when HR confirms sync |
| `correctionReason`, `correctedBy`, `correctedAt` | Last correction metadata |

### 3.5 Optional later: `AttendanceCorrection` / `AttendanceIdentityMap`

- **Correction:** full before/after audit trail if last-correction fields are not enough.
- **IdentityMap:** only if device ID ≠ `fingerPrintRfid`.

### 3.6 What we do **not** store on `RosterAllocation`

Do not write every punch onto the duty cell. Keep punches on `AttendancePunch`. Duty cell remains planned shift + optional confirmed attendance enum.

---

## 4. Device integration (recommended methods)

Hardware is not implemented yet. Prefer this order:

| Priority | Method | When |
|----------|--------|------|
| **1 — Push gateway (recommended)** | LAN middleware / vendor push receives SDK or ADMS events and `POST`s to HRM | Realtime live dashboard; vendor-agnostic HRM |
| **2 — Pull poller** | Job polls device DB/API every N seconds, then posts the same DTO | Vendor only supports “download logs” |
| **3 — CSV / file import** | Backfill, go-live, broken reader days | Manual ops fallback |

### 4.1 Ingest contract

`POST /api/attendance/punches`

Auth: device API key or HMAC (not NextAuth session). Middleware already excludes `/api` from page auth — enforce auth **inside** the route.

Example body:

```json
{
  "deviceCode": "GATE-01",
  "externalPunchId": "dev-998877",
  "rfid": "A1B2C3D4",
  "punchedAt": "2025-08-15T08:12:03+05:30",
  "direction": "unknown"
}
```

**Ingest steps:**

1. Authenticate caller.
2. Idempotency: skip duplicate `(deviceId, externalPunchId)`.
3. Resolve `Staff` by `fingerPrintRfid` (= `rfid`).
4. Insert `AttendancePunch`.
5. Recompute that staff’s `AttendanceDay` for the Colombo calendar date (and overnight window if needed).
6. Touch `AttendanceDevice.lastSeenAt`.
7. Notify live subscribers (SSE) or rely on client poll.

### 4.2 Direction handling

If the device cannot send IN/OUT, use `direction: "unknown"` and pair by order (first punch ≈ in, last ≈ out; odd incomplete pairs → missing punch flags).

### 4.3 Staff form RFID enrollment (scan-to-capture) — deferred until device setup

**Status:** Documented only. Implement once at least one physical (or gateway-simulated) reader is available. Do **not** block punch ingest / day rules / RFID Attendance UI on this.

**Problem:** Today `fingerPrintRfid` on the staff general form (`form-general.tsx`) is a plain text input. Admins can mistype the ID the machine will send. Enrollment should support **capture from a reader**.

**Constraint:** The browser cannot talk to most finger-scan / RFID panels directly (proprietary LAN SDK / Windows service). Capture must go through the same **device gateway → HRM API** path as punches.

**Target UX (staff general form):**

1. Admin opens Staff → General and focuses **Finger Print / RFID**.
2. Clicks **Scan from reader** → enrollment listen mode (timeout ~30–60s).
3. Staff taps/scans at a designated enrollment reader (or any active device configured for enrollment).
4. Gateway posts the scan (reuse punch ingest, or a lighter enroll-read endpoint).
5. Form receives the RFID (short poll or SSE) and fills `fingerPrintRfid`.
6. Admin saves staff as today (trim + unique among active staff already enforced).

Keep the text input as **fallback** (paste / manual edit / no reader at desk).

**Suggested API / flow (when implementing):**

| Piece | Role |
|-------|------|
| Session-auth action or route | Start / cancel enrollment listen (`staffId` optional for add vs edit; timeout; optional `deviceCode`) |
| Device ingest | Next scan from allowed device(s) is tagged as enrollment candidate (do **not** require a full attendance day recompute for unmatched enrollment taps — or mark `source: enroll` and skip day write) |
| Form client | Poll `GET` enroll session or subscribe until RFID arrives / timeout |
| Save path | Existing staff create/update — still the source of truth |

**Do not:**

- Wire the Next.js page directly to the device SDK.
- Rely on WebUSB/WebHID unless a specific reader is proven to support it (unlikely for hospital panels).
- Auto-save staff on scan — only populate the field; admin confirms Save.

**Checklist (implement after device setup):**

- [ ] Enrollment listen start/cancel API (session + timeout)
- [ ] Ingest path recognizes enrollment mode (or dedicated enroll-read) without corrupting attendance days
- [ ] Staff general form: **Scan from reader** control + waiting / success / timeout states
- [ ] Optional: restrict enrollment to a designated `AttendanceDevice` (e.g. HR desk reader)
- [ ] Smoke: gateway/simulated scan fills form field; uniqueness still blocks duplicate active RFID

---

## 5. Business rules engine

Recompute runs after each punch (and on correction / nightly job for Absent).

### 5.1 Inputs

- Punches for the staff in the relevant window.
- Planned `RosterAllocation` for the Colombo date (respect overnight `attendanceAllocation`: `shift_start` \| `shift_end` \| `split_both`).
- `ShiftType.startTime` / `endTime` / `graceMinutes` / `lateThresholdMinutes` / `earlyExitThresholdMinutes`.
- Leave flags when available (`RosterAllocation.isLeave` / leave applications — wire when ready).

### 5.2 Classification (maps to RFID Attendance UI)

| UI status | Rule (summary) |
|-----------|----------------|
| **Present** | Rostered; first in ≤ shift start + grace |
| **Late** | Rostered; first in after grace (card hint uses shift start + grace, e.g. “After 08:15”) |
| **Missing Punches** | Incomplete IN/OUT pair (`missing_in` / `missing_out`) |
| **Absent** | Rostered; no punches; not on leave |
| **Exceptions** | Unmatched RFID, inactive staff, duplicate burst, policy violations |
| **In** (live row) | Matched punch; day status still Present/Late as applicable |

### 5.3 Duty Roster confirm (explicit HR action)

Action: **Confirm to Duty Roster** (single day or bulk).

- Maps `AttendanceDay.status` → `RosterAllocation.attendance` (`present` \| `late` \| `absent`).
- Skips cells with no allocation / already amended policy (define in service).
- Sets `confirmedToRosterAt` for audit.
- Never runs automatically on punch ingest.

---

## 6. Target file layout

```
apps/hrm/
  prisma/schema.prisma                    # AttendanceDevice, AttendancePunch, AttendanceDay

  app/api/attendance/
    punches/route.ts                      # Device ingest
    recompute/route.ts                    # Cron / ops: Absent + day recompute for a date
    stream/route.ts                       # Optional SSE for live UI
    enroll/…                              # Optional: enrollment listen (after device setup — §4.3)

  app/actions/attendance-actions/
    device.actions.ts
    attendance-day.actions.ts
    attendance-correction.actions.ts
    attendance-confirm-roster.actions.ts
    attendance-export.actions.ts

  services/attendance-services/
    device.service.ts
    punch-ingest.service.ts
    attendance-day.service.ts
    attendance-rules.service.ts
    attendance-confirm-roster.service.ts
    attendance-export.service.ts

  app/(dashboard)/(attendance)/
    rfid-attendance/                      # Live dashboard (primary mock)
    attendance-daily/
    attendance-devices/
    attendance-corrections/

  types/attendance.ts
  lib/mappers/attendance-*.ts             # If forms need mappers
  lib/helpers/attendance-timezone.helper.ts   # Asia/Colombo via @date-fns/tz (TZDate)
```

Wire routes into:

- `desktop-sidebar.tsx` — Staff Attendance group  
- `lib/permissions.ts` — `ROUTE_TO_RESOURCE` for each route → `attendance`  
- Auth User Group matrix — grant `attendance` view/add/edit/delete as needed  

Device ingest does **not** use User Group `add`; it uses device credentials. Log device activity separately if required.

---

## 7. Realtime / live dashboard

| Approach | Recommendation |
|----------|----------------|
| **Short polling (5–10s)** | Default for v1 — simple, enough for hospital ops |
| **SSE** (`/api/attendance/stream`) | Add when polling load is noticeable |
| WebSockets | Defer unless already standardized elsewhere |

“Streaming” badge = recent successful ingest + device(s) `lastSeenAt` within threshold.

---

## 8. Security & ops

- Device keys in env or hashed per-device secrets; rotate without downtime.
- Rate-limit ingest endpoint.
- Never expose `rawPayload` with secrets to the browser.
- Idempotent writes for flaky networks.
- Nightly job: recompute Absent / Missing for yesterday; reconcile stuck days.
- Activity log for HR corrections and Confirm-to-Roster (human actions).

---

## 9. Relation to Roster & Shifts

| Concern | Owner |
|---------|--------|
| Planned shift, publish, amendments | Roster & Shifts |
| Manual Present/Late/Absent on duty cell | Duty Roster (existing) |
| Machine punches + derived daily status | **Staff Attendance (this doc)** |
| Copy derived status onto duty cell | HR Confirm action only |

Update `ROSTER_SHIFTS_MANAGER_GUIDE.md` RFID deferral line when this engine ships: keep enum on cell; RFID remains a separate source of truth until confirm.

---

## 10. Implementation checklist

Use these checkboxes while building. Mark items done in PRs / when closing a phase. Do not skip identity uniqueness before live ingest.

### Phase P0 — Foundations (schema + identity)

- [x] Add Prisma models: `AttendanceDevice`, `AttendancePunch`, `AttendanceDay` (+ indexes / unique keys)
- [x] Add `types/attendance.ts` (status enums, punch DTO, day DTO)
- [x] Enforce trim + unique `fingerPrintRfid` among active staff on create/update (staff service)
- [x] Document / implement RFID lookup strategy (embedded field query vs denormalized root field)
- [x] Helper: Asia/Colombo day start/end (`attendance-timezone.helper.ts`)
- [x] `prisma generate` completed; **`db push` pending** — run `npx prisma db push` in `apps/hrm` against your local/staging HRM DB when ready
- [x] Seed or create at least one `AttendanceDevice` for local testing (`ensureDefaultAttendanceDevice` / auto on `DEV-LOCAL` ingest)
- [x] Map routes in `lib/permissions.ts` → resource `attendance`
- [x] Ensure Auth User Group resource `attendance` exists in shared RESOURCES / matrix UI

### Phase P1 — Punch ingest API

- [x] `POST /api/attendance/punches` with API-key (or HMAC) auth
- [x] Zod validate ingest payload
- [x] Idempotency on `(deviceId, externalPunchId)`
- [x] Resolve staff by `fingerPrintRfid`; mark unmatched punches
- [x] Persist `AttendancePunch` (immutable)
- [x] Update `AttendanceDevice.lastSeenAt`
- [ ] Unit/integration smoke: duplicate punch, unmatched RFID, matched RFID — run `npm run smoke:attendance` in `apps/hrm` (see §13)
- [x] Env docs: device key(s) in `apps/hrm/.env.example` (no real secrets)

### Phase P2 — Day recompute + rules

- [x] `attendance-rules.service.ts`: pair IN/OUT / unknown direction
- [x] Load planned `RosterAllocation` + `ShiftType` for Late/Present
- [x] Apply grace / late thresholds
- [x] Flag missing punches, early exit, exceptions
- [x] Write/update `AttendanceDay`
- [x] Overnight window respects `attendanceAllocation` (`shift_start` / `shift_end` / `split_both`; punch window + day posting)
- [x] Nightly (or on-demand) job for Absent when rostered with zero punches — `recomputeAttendanceDaysForDate` + `POST /api/attendance/recompute` + `npm run recompute:attendance`
- [x] Leave-aware status when leave data is available (`on_leave`) — uses `RosterAllocation.isLeave` when present

### Phase P3 — RFID Attendance UI (primary mock)

- [x] Sidebar group **Staff Attendance** + `/rfid-attendance` page shell
- [x] `CommonManagerHeader`: title, subtitle (reader count · today date), Refresh / Export / Add Correction
- [x] Summary cards: Today Present, Late, Missing Punches, Absent, Exceptions
- [x] Live check-ins table: Staff, Department, Time, Status badges (In / Late / Missing Out)
- [x] Filters sidebar: Department, Location, Date, Shift, Staff
- [x] Wire cards + table to `AttendanceDay` / recent punches (empty state until data exists)
- [ ] Polling (or SSE) for live updates + Streaming badge (Streaming badge is heuristic for now; auto-poll later)
- [x] Permission gates (`attendance` view)
- [x] **Add Correction** → `/attendance-corrections` (stub until P4)

### Phase P4 — Devices, Daily register, Corrections, Export

- [ ] `/attendance-devices` CRUD (Sheets or pages — follow Shift Types / OT patterns)
- [ ] `/attendance-daily` `CommonDataTable` register
- [ ] Add Correction flow → updates `AttendanceDay` + audit fields (punches untouched)
- [ ] Export CSV/Excel (punches and/or daily summaries) — table-only export pattern
- [ ] `/attendance-corrections` register if corrections are not only a dialog on the live page

### Phase P5 — Confirm to Duty Roster + hardening

- [ ] Server action + service: Confirm to Duty Roster (single / bulk)
- [ ] Map day status → `RosterAllocation.attendance` (`present` \| `late` \| `absent`)
- [ ] Set `confirmedToRosterAt`; activity log
- [ ] Guard: do not auto-sync on ingest
- [ ] Device gateway sample / README for push adapter (vendor-agnostic DTO)
- [ ] Rate limit + basic abuse protection on ingest
- [ ] Unmatched RFID ops queue / Exceptions drill-down
- [ ] Duplicate-burst suppression / debounce window
- [ ] Update this doc status + `ROSTER_SHIFTS_MANAGER_GUIDE.md` RFID deferral note
- [ ] Non-admin permission smoke test

### Optional / later

- [ ] `AttendanceIdentityMap` if enrollment ID ≠ device ID
- [ ] SSE live stream instead of polling
- [ ] Auto-suggest Confirm for yesterday’s closed days (still requires HR click)
- [ ] Payroll / OT consumption of `AttendanceDay` hours
- [ ] **Staff form scan-to-capture enrollment (§4.3)** — after device / gateway setup

---

## 11. Acceptance criteria (MVP)

1. Staff with a unique `fingerPrintRfid` receives a punch via ingest → appears on RFID Attendance live table within poll interval.
2. Late is computed from rostered `ShiftType` + grace (Colombo time).
3. Missing Out / unmatched RFID appear in Missing Punches / Exceptions counts.
4. Duty Roster attendance enum does **not** change until Confirm.
5. Duplicate `externalPunchId` from the same device does not create a second punch.
6. View-only `attendance` users cannot correct or confirm; edit users can.

---

## 12. Open points (resolve during P0/P1, not blockers for docs)

| Topic | Default until decided |
|-------|------------------------|
| Exact device vendor / SDK | Push gateway posts neutral DTO |
| Denormalize RFID onto `Staff` root for indexing | **Done:** `Staff.fingerPrintRfid` (+ index); kept in sync with `hrDetails.fingerPrintRfid`; punch lookup backfills root from embedded |
| Confirm mapping for `missing_punch` → Duty enum | Leave duty unchanged or set `absent` only when HR chooses — default: skip cell |
| Staff form RFID capture | Text input now; **Scan from reader** after device setup (§4.3) |

---

## 13. Local smoke (ingest)

Prerequisites:

1. Schema applied (`npx prisma db push` in `apps/hrm`)
2. Set `ATTENDANCE_DEVICE_API_KEY` in `.env`
3. HRM running (`npm run dev` → port **3001**)
4. Optional: set `ATTENDANCE_SMOKE_RFID` to a real staff `fingerPrintRfid` for a **matched** punch + `AttendanceDay`

### Script (preferred)

```bash
cd apps/hrm
npm run smoke:attendance
```

The script (`scripts/smoke-attendance-ingest.mjs`) loads `.env`, auto-seeds `DEV-LOCAL` via the API, and checks:

1. First punch succeeds  
2. Same `externalPunchId` → `duplicate: true`  
3. Unknown RFID → `matchStatus: unmatched`

### Absent / day recompute (P2)

Marks **Absent** (and refreshes other statuses) for rostered staff whose attendance posts to a Colombo civil date — respects overnight `attendanceAllocation`.

```bash
cd apps/hrm
npm run recompute:attendance              # today Asia/Colombo
npm run recompute:attendance -- 2025-08-15
```

Or: `POST /api/attendance/recompute` with the same API key and optional `{ "date": "yyyy-MM-dd" }`.  
HR UI can call `recomputeAttendanceDaysForDateAction` (`attendance` / `edit`).

### Curl (manual)

```bash
# Matched punch (uses DEV-LOCAL auto-seed)
curl -s -X POST http://localhost:3001/api/attendance/punches \
  -H "Content-Type: application/json" \
  -H "X-Attendance-Api-Key: YOUR_KEY" \
  -d "{\"deviceCode\":\"DEV-LOCAL\",\"externalPunchId\":\"smoke-1\",\"rfid\":\"STAFF_RFID\",\"punchedAt\":\"2025-08-15T08:12:03+05:30\",\"direction\":\"unknown\"}"

# Duplicate (same externalPunchId) — should return duplicate: true
curl -s -X POST http://localhost:3001/api/attendance/punches \
  -H "Content-Type: application/json" \
  -H "X-Attendance-Api-Key: YOUR_KEY" \
  -d "{\"deviceCode\":\"DEV-LOCAL\",\"externalPunchId\":\"smoke-1\",\"rfid\":\"STAFF_RFID\",\"punchedAt\":\"2025-08-15T08:12:03+05:30\"}"

# Unmatched RFID
curl -s -X POST http://localhost:3001/api/attendance/punches \
  -H "Content-Type: application/json" \
  -H "X-Attendance-Api-Key: YOUR_KEY" \
  -d "{\"deviceCode\":\"DEV-LOCAL\",\"externalPunchId\":\"smoke-unmatched\",\"rfid\":\"UNKNOWN-RFID\",\"punchedAt\":\"2025-08-15T09:00:00+05:30\"}"
```

---

## Related docs

- `HRM_DEVELOPMENT_GUIDELINES.md` — layered architecture, planned `/attendance` resource  
- `PERMISSION_FLOW.md` — `/attendance` → `attendance`  
- `ROSTER_SHIFTS_MANAGER_GUIDE.md` — duty attendance enum; RFID deferred in roster v1  
- Staff enrollment UI: `app/(dashboard)/staff/form-general.tsx` (`fingerPrintRfid` text field; scan-to-capture deferred — §4.3)
