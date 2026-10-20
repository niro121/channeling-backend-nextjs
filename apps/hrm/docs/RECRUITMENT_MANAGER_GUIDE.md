# Recruitment Manager — Development Guide

Guidance for building and dynamizing recruitment features in `apps/hrm`.  
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture), `PERMISSION_FLOW.md` (Auth User Group grants), and **`PUBLIC_CAREERS_API_GUIDE.md`** (Wave 11+ public API auth, API Users / API Clients, phased release).

**Status:** Phase 0 UI complete for the full pipeline (sample data + toast-only mutations).  
**Ownership:** HRM is the **system of record** for vacancies, job posts, applications, and hiring. The official website is a **public channel** only (display + apply).  
**Build path:** UI first (done) → **Prisma models → Types/Zod → Services → Actions → wire each screen** → **Public Careers API → website cutover** in the order below.  
Pages must not call Prisma. No business rules in components.

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/vacancy-requests` | `recruitment` | Raise / approve vacancy requests |
| `/job-posts` | `recruitment` | Create, publish, close job posts (linked to vacancies) |
| `/applications` | `recruitment` | Application register, stage moves, reject, schedule interview |
| `/resume-bank` | `recruitment` | Candidate CV bank; add-to-job; move to shortlisting |
| `/shortlisting` | `recruitment` | Review / shortlist / hold / compare / schedule |
| `/interview-schedule` | `recruitment` | Calendar + list; schedule / reschedule / cancel |
| `/evaluation` | `recruitment` | Panel scoring + register; link to appointment letter |
| `/appointment-letters` | `recruitment` | Offer letters; generate / send / accept / decline / onboard |

Sidebar: **Recruitment** collapsible in `desktop-sidebar.tsx`.  
All routes map to resource **`recruitment`** in `lib/permissions.ts` (`view` / `add` / `edit` / `delete`).

Shared domain types: `apps/hrm/types/recruitment.ts`.

**External (not an HRM route):** Official website `/careers` — consumes HRM Public Careers API only. No careers admin in the website CMS once cutover is done.

---

## 2. Cross-app architecture (HRM ↔ Official website)

### 2.1 Ownership

| Concern | Owner | Notes |
|---------|--------|--------|
| Vacancy approval, job posts, applications, interviews, offers, onboarding | **HRM** | All CRUD and workflow live in HRM dashboard + HRM MongoDB |
| Public careers list / detail / apply UI | **Official website** | Branding, SEO, candidate UX only |
| Careers admin in website admin-portal CMS | **Retire after cutover** | Was temporary SoR; must not remain a second write path |

Do **not** put careers in Channeling. Do **not** share HRM `DATABASE_URL` / Prisma with the website. Cross-app access is **HTTP API only** (same rule as `HRM_DEVELOPMENT_GUIDELINES.md` §8).

### 2.2 Target topology

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│  HRM App (admin)            │         │  Official Website                │
│  Vacancy Requests           │         │  /careers (list / detail / apply)│
│  Job Posts                  │         │  No careers CMS admin (post-cut) │
│  Applications + pipeline    │         └────────────────┬─────────────────┘
│  Resume Bank → Offer        │                          │
└──────────────┬──────────────┘                          │ HTTPS
               │                                         │
               ▼                                         ▼
        HRM MongoDB (SoR)  ◄──────── HRM Public Careers API
        VacancyRequest                 GET  published job posts
        JobPost                        GET  job by slug
        Application, …                 POST application (+ CV)
        file metadata / object keys
```

### 2.3 Field mapping (legacy website CMS → HRM)

Former website admin “career posting” fields map into **JobPost** (and related) in HRM:

| Legacy CMS field | HRM home |
|------------------|----------|
| Code / Reference No | Auto-generated sequences on Job Post (`JP-…` / reference) |
| Title / Role, Short title | `JobPost` title fields |
| Slug | Unique `JobPost.slug` (website never invents IDs) |
| Short description | Public summary on `JobPost` |
| Description (rich text) | Full JD on `JobPost` |
| Received applications tab | HRM **Applications** module (not website CMS) |

Website public responses must use a **thin DTO** (title, slug, short/full description, department labels, dates, apply constraints). Never expose internal vacancy justification, reject reasons, salary approval notes, or panel scores.

### 2.4 Public Careers API (contract sketch)

Host on HRM (mirror Channeling public API style, or API-key style like attendance ingest). Website backend is a **machine client**, not an end-user NextAuth session. Applicants are **not** `db-auth` users.

| Endpoint | Purpose |
|----------|---------|
| `GET` published jobs | Careers listing (`status = published`, not expired/closed) |
| `GET` job by slug | Detail page |
| `POST` application (+ multipart CV) | Candidate apply → creates `Application` (and optional Resume Bank link later) |

Rules:
- Only **published** (and not closed/expired) posts appear on the site.
- Slug uniqueness and publish/unpublish/close live in HRM.
- CVs go to object storage; HRM stores keys + metadata (align with Wave 10).
- Application stage/status transitions stay internal to HRM.

### 2.5 What not to do

| Anti-pattern | Why |
|--------------|-----|
| Shared Mongo / shared Prisma with website | Breaks app DB isolation |
| Keep dual admin (CMS + HRM) after cutover | Dual write, sync bugs |
| Sync careers through Channeling | Channeling has no careers domain |
| Website writing Job Posts into HRM DB directly | Bypass services, permissions, audit |
| Push careers into Channeling “for convenience” | Wrong SoR |

### 2.6 Cutover sequence (high level)

1. HRM Job Posts + Applications are live (Waves 1–4).  
2. Ship Public Careers API (Wave 11).  
3. Point website frontend at HRM API; optionally keep CMS **read-only**.  
4. Migrate historical postings + applications into HRM (Wave 12).  
5. Remove Careers from website admin-portal CMS.

---

## 3. Pipeline (business flow)

```
Vacancy Request (draft → pending_approval → approved)
        │
        ▼
   Job Post (draft → published → closed)
        │
        ├──► Application (HRM register / Public Careers API / Resume Bank)
        │
Resume Bank ──add-to-job──► Application
        │
        ▼
   Shortlisting (to_review → shortlisted | on_hold | rejected)
        │
        ▼
 Interview Schedule (scheduled → confirmed → completed | …)
        │
        ▼
   Evaluation (draft → submitted)
        │
        ▼
 Appointment Letter (draft → issued → accepted | declined)
        │
        ▼
   Staff onboarding (`/staff/onboard?letterId=…` → create with prefill or browse list)
```

**Do not dynamize out of order.** Later modules depend on stable IDs and status transitions from earlier ones.  
**Do not ship the Public Careers API before Job Posts (and Application create) are stable.**

---

## 4. Correct dynamic implementation order

Implement backend + wire UI **one wave at a time**. Within each module wave: schema → Zod → service → actions → replace `sample-data` / toasts.

| Wave | Module(s) | Why this order |
|------|-----------|----------------|
| **0** | Foundations | Shared enums already in `types/recruitment.ts`; add Prisma models + Sequence codes; optional shared `RecruitmentActivity` / audit helper |
| **1** | Vacancy Requests | Root of pipeline; no FK to other recruitment entities |
| **2** | Job Posts | Link one or more approved `VacancyRequest`s (same designation; combine across departments); public fields (title, slug, short/full description) live here |
| **3** | Resume Bank | Independent candidate store; needed before “add to job” |
| **4** | Applications | Requires Job Post; can ingest from Resume Bank; **same create path** the public API will call |
| **5** | Shortlisting | View / actions over Application mid-pipeline (+ screening score) |
| **6** | Interview Schedule | Requires Application (or shortlisted candidate) |
| **7** | Evaluation | Requires Interview; criteria stay as TypeScript consts → JSON on record |
| **8** | Appointment Letters | Requires Evaluation (or selected candidate); document storage for PDF |
| **9** | Staff handoff | Accepted letter → Staff create/prefill (`/staff`) |
| **10** | Documents & notify | Resume/CV storage, letter PDF/print/email, candidate notifications |
| **11** | Public Careers API | `GET` published posts + `GET` by slug + `POST` apply; service-account / API-key auth; thin public DTOs; reuse Job Post + Application services |
| **12** | Website cutover & migration | Point official site at API; migrate historical CMS careers + applications; retire website Careers admin |

**Optional early preview:** After Wave 2, a **read-only** `GET` published-posts endpoint may be stubbed for website UI work — but **do not** accept applications until Wave 4 create is production-ready, and treat full Wave 11 as the official public contract.

### Wave checklist (repeat per internal module — Waves 1–9)

1. Prisma model(s) + migration  
2. Extend / align `types/recruitment.ts` + Zod in services  
3. `services/recruitment-services/<module>.service.ts`  
4. `app/actions/recruitment-actions/<module>.actions.ts` (`requirePermission`, `logActivityNonBlocking`, `revalidatePath`)  
5. Replace `sample-data.ts` reads in `page.tsx`  
6. Wire Sheet/Dialog submits and `record-actions` confirms  
7. Smoke-test permissions (`recruitment` view/add/edit/delete)

### Wave 11 checklist (Public Careers API)

Full architecture: **`PUBLIC_CAREERS_API_GUIDE.md`**.

1. P0–P1: API User (CustomSelectField) + API Clients module (ID/secret, acting user) — **Done**
2. P2: `POST /api/public/careers/token` (client credentials → Bearer JWT) — **Done**
3. P3: `GET /api/public/careers/jobs` (+ by slug); thin public DTOs — **Done**
4. P4: `POST /api/public/careers/applications` (metadata; flag + `careers:apply`) — **Done**
5. P5: multipart CV via Wave 10 S3 — **Done**
6. API Clients **Playground** tab (token → jobs → apply smoke) — **Done**
7. Rate limiting on token + apply (hardening)
8. Contract tests / Postman for website team
9. Wave 12: website cutover + CMS migration

### Wave 12 checklist (Website cutover)

1. Website reads list/detail from HRM; apply posts to HRM  
2. One-off migration script: CMS careers → `JobPost`; CMS applications → `Application`  
3. Freeze or read-only legacy CMS Careers admin  
4. Remove Careers from website admin-portal nav once verified  
5. Confirm no remaining writes to legacy careers tables

---

## 5. Suggested domain models (Phase 1+)

Sketch only — refine in Prisma when Wave 0 starts. All in HRM MongoDB.

```
VacancyRequest
JobPost          *──* VacancyRequest (combine same designation across depts)
ResumeBankProfile
Application      *──1 JobPost ; optional ResumeBankProfile
  └─ history[]   (embedded ApplicationHistoryEntry)
Interview        *──1 Application
Evaluation       *──1 Interview
  └─ ratings     (JSON map criterionId → rating)
AppointmentLetter *──1 Evaluation (or Application)
```

| Model | Notes |
|-------|--------|
| **VacancyRequest** | Status workflow; department / designation; openings; audit; `linkedJobPost` / `linkedJobPostId` |
| **JobPost** | `vacancyRequestIds[]` + `linkedVacancies[]` snapshots; slug; short/full description; skills; publish / unpublish / close; public DTO source. Openings default to sum of linked vacancies. |
| **ResumeBankProfile** | `profileId` (RB-*); contact + skills + preferred role/dept; `resumeFileName` / `resumeFileKey` (key in Wave 10); `linkedApplicationIds[]`; status `in_bank` \| `linked` \| `shortlisted` |
| **Application** | `applicationId` (APP-*); FK `jobPostId` + denormalized `jobPostCode` / title / dept / designation; optional `resumeBankProfileId`; `currentStage` vs `status`; Wave 5 shortlisting fields `shortlistStatus` (`to_review` \| `shortlisted` \| `on_hold` \| `rejected`), `screeningScore`, `qualifications` / `skills`, `holdReason`; embedded `history[]`; `source` (`hospital_website` \| `resume_bank` \| …); unique `(jobPostId, candidateEmail)`; CV `resumeFileName` / `resumeFileKey`. **No separate Shortlisting model** — `/shortlisting` is a mid-pipeline view over Application. |
| **Interview** | `interviewCode` (INT-*); FK `applicationId` + denormalized APP/JP codes; date + start/end time; panel; type; location; notes; status (`scheduled` \| `confirmed` \| `rescheduled` \| `completed` \| `no_show` \| `cancelled`); `cancelReason` |
| **Evaluation** | `evaluationCode` (EVAL-*); 1:1 FK `interviewId`; denormalized interview/application snapshot; `ratings` JSON; strengths/weaknesses/comments; recommendation / finalDecision; cached `overallScore`; status `draft` \| `submitted` |
| **AppointmentLetter** | `letterNumber` (LETTER-*); 1:1 FK `evaluationId`; denormalized evaluation/application snapshot; salary; dates; `letterGenerated`; status `draft` \| `pending_approval` \| `issued` \| `accepted` \| `declined`; optional `declineReason` / `letterFileKey` (Wave 10) |

### Codes / sequences

Use existing Sequence pattern (like Staff / Leave): e.g. `VR-…`, `JP-…`, `RB-…`, `APP-…`, `INT-…`, `EVAL-…`, `LETTER-…`.

### Evaluation criteria

`EVALUATION_CRITERIA` / ratings / scores in `types/recruitment.ts`; Wave 7 persists ratings as JSON on `Evaluation`. Optional later: criteria master table — **not required for v1**.

### Documents & notify (Wave 10 — done)

- **Resumes/CVs:** Application + Resume Bank use `commitPendingUpload` → S3 (`resumes/` prefix); keys on `resumeFileKey` / `resumeFileName`. Max **10 MB**; PDF or images.
- **Appointment letter PDF:** `jspdf` builds English letter on **Generate** (force) and **Send** (if key missing); stored under `appointment-letters/` as `letterFileKey`. Download via presigned GET; Print uses browser HTML (works without S3).
- **Send:** Email body + optional PDF attachment; SMS unchanged. Soft-warn if S3/SMTP missing — body notify can still succeed without attachment.
- **Candidate notifications (email + SMS, no internal notes):** interview reschedule/cancel; application shortlist/reject; evaluation submit outcome; appointment letter send.
- Env: `S3_BUCKET`, `AWS_*`, optional `S3_*_PREFIX`; SMTP/SMS already used by letter send.
- Public apply (Wave 11) should reuse the same S3 helpers for CV upload.

---

## 6. UI map (Phase 0 — current)

All under `app/(dashboard)/(recruitment)/`.

### 6.1 Vacancy Requests — `/vacancy-requests`

| Concern | Detail |
|---------|--------|
| Layout | Summary cards + filters + register |
| Create/Edit | Sheet / dialog form |
| Actions | View, edit, submit approval, approve/reject (toast) |
| Key types | `VacancyRequestRecord`, `VACANCY_REQUEST_STATUSES` |

### 6.2 Job Posts — `/job-posts` (Wave 2 — dynamized)

| Concern | Detail |
|---------|--------|
| Link | One or more approved vacancies (same designation); combine openings across departments via `CustomMultiSelect` |
| Prefill | Vacancy Requests **Link** → `/job-posts?prefillVacancyId=` opens create Sheet |
| Actions | Create/edit/duplicate Sheet; view dialog; Applications deep-link |
| Public fields | Title, slug, short/full description, skills (website-facing later) |
| Export | Server re-query with active filters (same pattern as Vacancy Requests / user-groups) |
| Footer | Vacancy Requests ← → Applications |

### 6.3 Applications — `/applications` (Wave 4 — dynamized)

| Concern | Detail |
|---------|--------|
| Actions | Create Sheet; view; resume file (S3 when key present); shortlist / reject (+ reason + history); schedule Sheet → creates Interview |
| Stage vs status | `ApplicationStage` pipeline vs `ApplicationStatus` lifecycle |
| Sources | Manual HRM entry; Resume Bank add-to-job; later Public Careers API |
| Export | Server re-query with active filters |
| Unique | One application per `(jobPostId, candidateEmail)` |
| Footer | Job Posts ← → Resume Bank |

### 6.4 Resume Bank — `/resume-bank` (Wave 3 — dynamized)

| Concern | Detail |
|---------|--------|
| Views | Table + Cards; create/edit Sheet (`RB-*` codes) |
| Actions | View, edit, resume file (S3), add-to-job Sheet → creates Application + marks profile linked, shortlist status |
| Export | Server re-query with active filters |
| Footer | Applications ← → Shortlisting |

### 6.5 Shortlisting — `/shortlisting` (Wave 5 — dynamized)

| Concern | Detail |
|---------|--------|
| Persistence | Same `Application` model (`shortlistStatus`, `screeningScore`, …) — not a separate collection |
| Views | Table only; row selection + Compare CustomDialog (N ≥ 2) |
| Status | `to_review` · `shortlisted` · `on_hold` · `rejected` |
| Score bar | ≥80 green · 50–79 amber · &lt;50 red |
| Actions | View, history, shortlist, hold, reject (+ reason), resume, schedule → creates Interview |
| Service | `shortlisting.service.ts` + actions; shortlist/reject reuse Application service |
| Footer | Resume Bank ← → Interview Schedule |

### 6.6 Interview Schedule — `/interview-schedule` (Wave 6 — dynamized)

| Concern | Detail |
|---------|--------|
| Persistence | `Interview` model (`INT-*`); FK to Application; create sets Application stage → `interview` |
| Views | Calendar (default) + List; Prev/Next week (Mon–Fri) |
| Actions | Reschedule Sheet, cancel (+ reason), view, evaluation (star → `/evaluation?interviewId=`) |
| Create | Header **+ Schedule Interview** Sheet; also from Applications / Shortlisting schedule sheets |
| Service | `interview.service.ts` + `interview.actions.ts` |
| Footer | Shortlisting ← → Evaluation |

### 6.7 Evaluation — `/evaluation`

| Concern | Detail |
|---------|--------|
| Persistence | `Evaluation` model (`EVAL-*`); 1:1 FK to Interview; ratings JSON (`EVALUATION_CRITERIA`); Sequence prefix `EVAL` |
| Layout | Form (top) + register (below) on one page |
| Criteria | 8 consts; live overall score; cached `overallScore` on save/submit |
| Actions | Save draft, submit confirm, preview; register View / Edit (pencil) / Mail → appointment letters |
| Load UX | `?interviewId=` get-or-create draft from Interview; `?evaluationId=`; else first draft |
| Submit side-effects | Interview → `completed`; Application history entry; positive decision may set Application stage → `selected`; candidate email/SMS outcome (no score/notes leak) |
| Service | `evaluation.service.ts` + `evaluation.actions.ts` |
| Footer | Interview Schedule ← → Appointment Letters |

### 6.8 Appointment Letters — `/appointment-letters`

| Concern | Detail |
|---------|--------|
| Persistence | `AppointmentLetter` model (`LETTER-*`); 1:1 FK to Evaluation; Sequence prefix `LETTER` |
| Create/Edit | Sheet; Save Draft (candidate = submitted Evaluation without a letter) |
| Generate | Paper icon → sets `letterGenerated`, status → `pending_approval` when from draft; builds/stores PDF (`letterFileKey`) when S3 configured; preview dialog |
| Send | Email (+ PDF attachment when available) + SMS using Application contact; status → `issued`; Application stage → `offer` |
| Download / Print | Download → ensure PDF + presigned URL; Print → browser HTML (`appointment-letter-print.ts`) |
| Accept / Decline | Accept → `accepted` + Application `hired`; Decline (+ reason) → `declined` |
| Other | Staff onboarding link when accepted (`/staff/onboard`) |
| Load UX | `?evaluationId=` opens create sheet when no letter yet |
| Service | `appointment-letter.service.ts` + `appointment-letter.actions.ts` |
| Status gating | See helpers in `types/recruitment.ts` (`canGenerate…`, `canSend…`, etc.) |
| Footer | Evaluation ← (end of recruitment chain) |

### 6.9 Staff handoff — `/staff/onboard`

| Concern | Detail |
|---------|--------|
| Entry | Appointment Letters UserPlus (accepted only) → `/staff/onboard?letterId=` |
| Choice | **Create with prefill** → `/staff/add?from=appointment&letterId=` · **Browse list** → `/staff?keyword=` |
| Prefill | Name, email, phone, join date from letter + Application; NIC left for HR |
| Link | `Staff.appointmentLetterId` + `AppointmentLetter.staffId`; blocks double onboard |
| Service | `staff-onboard.service.ts` + `staff-onboard.actions.ts`; createStaffOption `appointmentLetterId` |

---

## 7. Shared UI conventions

| Topic | Convention |
|-------|------------|
| Permission | `has('recruitment', 'view'\|'add'\|'edit'\|'delete')` |
| Header | `CommonManagerHeader` + optional header actions |
| Tables | `CommonDataTable` + `DataTableExportFeature`; Created / Updated columns |
| Forms | Formik + Yup; Sheets for create/edit/schedule; CustomDialog for view |
| Confirms | `CustomAlertDialog` for positive; Dialog + red primary for destructive (reject/decline) |
| Cancel buttons | `buttonStyles.cancel.normal` (forms); `.healthy` (back links / soft close) |
| Phase 0 writes | Toast “Not saved” / “will be wired…” — no Prisma |
| Sample data | Per-module `sample-data.ts` |

---

## 8. Status / enum reference

| Domain | Values |
|--------|--------|
| Vacancy | `draft`, `pending_approval`, `approved`, `rejected`, `cancelled`, `filled` |
| Job post | `draft`, `unpublished`, `published`, `closed` |
| Application stage | `applied` → `screening` → `shortlisted` → `interview` → `selected` → `offer` → `hired` \| `rejected` |
| Application status | `active`, `rejected`, `withdrawn`, `hired` |
| Shortlisting | `to_review`, `shortlisted`, `on_hold`, `rejected` |
| Interview | `scheduled`, `confirmed`, `rescheduled`, `completed`, `no_show`, `cancelled` |
| Interview type | `phone`, `video`, `in_person`, `panel` |
| Evaluation | `draft`, `submitted` |
| Evaluation decision | `recommended`, `recommended_with_conditions`, `hold`, `not_recommended` |
| Appointment letter | `draft`, `pending_approval`, `issued`, `accepted`, `declined` |

---

## 9. Cross-module wiring (already in UI)

| From | To |
|------|----|
| Job Posts footer | `/applications` |
| Applications footer | `/resume-bank` |
| Resume Bank footer | `/shortlisting` |
| Shortlisting footer | `/interview-schedule` |
| Interview Schedule star / footer | `/evaluation?interviewId=` |
| Evaluation mail / footer | `/appointment-letters?evaluationId=` |
| Appointment Letters onboard | `/staff/onboard?letterId=` → `/staff/add?from=appointment&letterId=` or `/staff?keyword=` |

When dynamizing, keep these query params and resolve server-side to real records.

| External | To |
|----------|----|
| Official website careers pages | HRM Public Careers API (Wave 11+) |
| Public apply success | New `Application` visible on `/applications` |

---

## 10. Recommended Prisma / service layout

```
apps/hrm/
  prisma/schema.prisma              # add recruitment models (Wave 0+)
  types/recruitment.ts              # enums + UI record shapes (exists)
  services/recruitment-services/
    vacancy-request.service.ts
    job-post.service.ts
    resume-bank.service.ts
    application.service.ts
    interview.service.ts
    evaluation.service.ts
    appointment-letter.service.ts
    public-careers.service.ts       # Wave 11 — thin DTOs + apply orchestration
  app/actions/recruitment-actions/
    vacancy-request.actions.ts
    …
  app/api/public/careers/           # Wave 11 — machine-authenticated routes
```

Follow Staff / Leave patterns: Zod in services; actions own permissions + activity log + revalidation.  
Public routes call **services** directly (with machine auth), not dashboard server actions.

---

## 11. Testing focus per wave

| Wave | Must verify |
|------|-------------|
| 1 | Vacancy approve only when pending; approved list feeds Job Post picker |
| 2 | Cannot publish without required fields (incl. slug); close stops new applications |
| 3–4 | Add-to-job creates Application; duplicate candidate handling |
| 5 | Shortlist / hold / reject update Application stage + shortlist status |
| 6 | Reschedule sets `rescheduled`; cancel/reschedule notify candidate (email/SMS) |
| 7 | Submit locks evaluation; score matches rating average |
| 8 | Accept unlocks Staff onboard; decline blocks generate send path |
| 9 | Prefill Staff from letter without losing audit trail |
| 10 | CV/letter object keys resolve; notify paths do not leak internal notes |
| 11 | Only published posts listed; apply creates Application with `source=website`; closed posts reject apply |
| 12 | Migrated slugs/applications match; CMS careers admin removed; no dual writes |

---

## 12. Out of scope / deferred

- Letterhead logo / bilingual letter templates (English-only PDF for now)  
- Criteria master CRUD  
- Public Careers API + website cutover (Waves 11–12)  
- Multi-tenant institution scoping (follow Staff when added)  
- Full channeling sync for hired staff (use existing Staff sync after onboard)

---

## 13. Quick start for the next developer

1. Read this guide (§2 architecture + §4 waves) and `HRM_DEVELOPMENT_GUIDELINES.md` §2 (layers) / §8 (no shared Prisma).  
2. Confirm Auth User Group has `recruitment` grants.  
3. Start **Wave 0 + Wave 1 (Vacancy Requests)** only.  
4. Do not open Application / Interview PRs until Job Post IDs are stable.  
5. Do not build website apply against HRM until Wave 4 create + Wave 11 API are ready.  
6. Keep UI components thin — move rules into services as you replace toasts.  
7. After Wave 2, design Job Post public fields (slug, short/full description) with the website careers page in mind — even if Wave 11 comes later.
