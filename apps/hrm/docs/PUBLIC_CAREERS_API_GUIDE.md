# HRM Public Careers API — Guidance

Architecture and implementation guide for releasing HRM’s **machine-authenticated** Public Careers API to the official website (and any future approved clients).

Use with:

- `RECRUITMENT_MANAGER_GUIDE.md` — recruitment domain, Waves 11–12  
- `HRM_DEVELOPMENT_GUIDELINES.md` — layers, no shared Prisma across apps  
- Channeling reference: `apps/channeling` API Clients + `/api/public/token` (same auth *shape*, Careers live in **HRM**)

**Status:** Guidance + **P0–P5 done** (token, jobs, apply + optional CV). Website cutover is P6.  
**Ownership:** HRM is system of record for job posts and applications. The website is a **public channel** (BFF → HRM HTTP only).

---

## 1. Goals

| Goal | Detail |
|------|--------|
| HRM-approved access only | Only clients created/enabled in HRM can obtain tokens |
| Machine auth | Website **backend (BFF)** holds credentials — not the browser, not NextAuth applicants |
| Auditability | Public writes attribute to an **API User** (`userType = 4`) |
| Safe release | Phase read → apply → CV; scopes + feature flags |
| Thin contract | Public DTOs never expose internal recruitment fields |

---

## 2. Identity model (three layers)

| Layer | What | Store |
|-------|------|--------|
| **API User** | Auth `User` with `userType = 4` (`@archmage/shared` `userTypes.apiUser`) | Auth DB (`db-auth`) |
| **API Client** | Machine credentials: `clientId` + hashed `clientSecret`; links to API User | **HRM** MongoDB |
| **Access token** | Short-lived Bearer JWT (`sub` = `clientId`) | Issued by HRM; held by website BFF |

```
┌──────────────────────┐
│  Official website    │
│  (server / BFF only) │
└──────────┬───────────┘
           │ 1) client_id + client_secret
           ▼
┌──────────────────────────────────────────────┐
│  HRM  POST /api/public/careers/token         │
│  Verify ApiClient (active + secret hash)     │
│  Issue JWT (sub=clientId, scopes, exp)       │
└──────────┬───────────────────────────────────┘
           │ 2) Authorization: Bearer <token>
           ▼
┌──────────────────────────────────────────────┐
│  HRM  GET /jobs · GET /jobs/[slug]          │
│       POST /applications                     │
│  actingUserId → Application.createdBy, etc.  │
└──────────────────────────────────────────────┘
```

**Rules:**

- Applicants are **not** `db-auth` users.  
- API Users **cannot** sign in to the HRM dashboard (`isDashboardLoginUserType` excludes type 4).  
- Never put `client_secret` in browser JS, mobile apps, or public repos.  
- Store only `clientSecretHash` (argon2). Plain secret returned **once** on create / rotate.

---

## 3. Product surfaces (HRM dashboard)

| Surface | Route (proposed) | Role |
|---------|------------------|------|
| Users (extend) | `/users` | Create **API User** via User Type |
| API Clients (**new**) | `/api-clients` | Enable access; generate ID + secret; block/revoke |

Permissions: follow existing User / admin patterns (or dedicated `api_clients` resource — decide at implement time and register in `lib/permissions.ts` + User Groups).

### 3.1 Users — API User (CustomSelectField)

On add/edit user form (`user-form.tsx`):

- Use **`CustomSelectField`** for **User Type** (same pattern as Channeling).  
- Options for HRM staff tooling: at least **Staff** and **API User** (Admin remains platform-only as today).  
- When `userType === apiUser` (`4`):
  - **Keep:** name, email, password (account record), status  
  - **Hide / disable:** user group, staff link, 2FA, and other dashboard-only fields  
  - **Show note:** *API Users are acting identities for API Clients. They cannot sign in to the dashboard.*

Service change required: HRM `user.service` today forces `userTypes.staff` — must allow `apiUser` when creating/updating this type.

`USER_TYPE_OPTIONS` / `userTypes.apiUser` already exist in `@archmage/shared`.

### 3.2 API Clients module

| Action | Behavior |
|--------|----------|
| Create | Name + select **active API User** as `actingUserId` (`CustomSelectField`) |
| Generate | `clientId` = UUID; `clientSecret` = high-entropy random; hash with argon2 |
| Reveal secret | **Once** on create (and on explicit rotate) |
| List / edit | Name, acting user, blocked flag, **multi-select scopes** from `PUBLIC_API_SCOPES` (`lib/permissions.ts`) |
| Playground | **Clients** + **Playground** tabs on `/api-clients` (`?tab=playground`) — live token / jobs / apply smoke tests |
| Postman | `GET /api/public/careers/postman-collection` (also linked from Playground) — Careers collection with dynamic `baseUrl` |
| Block | `isBlocked = true` → token issue and Bearer verify fail immediately |
| Rotate secret | New secret + hash; invalidate old secret |

Channeling reference UI: `apps/channeling/app/(dashboard)/admin/api-clients/`.

---

## 4. Data model

### 4.1 Auth (`packages/db-auth`)

```
User.userType
  1 = admin
  2 = staff
  3 = doctor
  4 = api user   // public API acting identity only
```

Update schema comment when implementing. No change to password/2FA semantics for API users beyond “no dashboard login”.

### 4.2 HRM — `ApiClient` (new)

```prisma
model ApiClient {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  clientId         String   @unique   // OAuth client_id
  clientSecretHash String             // argon2 hash
  name             String             // e.g. "Ruhunu Website Prod"
  isBlocked        Boolean  @default(false)
  /// Auth User.id (must be userType = apiUser). Plain ID — no cross-DB Prisma relation.
  actingUserId     String   @db.ObjectId
  /// e.g. ["careers:read", "careers:apply"]
  scopes           String[] @default([])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  createdBy        String?  @db.ObjectId
  updatedBy        String?  @db.ObjectId

  @@index([isBlocked])
  @@index([actingUserId])
}
```

Defaults on create: at least `careers:read`. Add `careers:apply` when that phase is enabled for the client.

**Catalog:** all allowed scope ids live in `apps/hrm/lib/permissions.ts` as `PUBLIC_API_SCOPES` (separate from dashboard `ROUTE_TO_RESOURCE`). Add future product scopes there; the API Clients multi-select and Zod validation both read from that list.

### 4.3 Existing domain (reuse)

| Model | Public use |
|-------|------------|
| `JobPost` | List/detail when published and not closed/expired |
| `Application` | `POST` apply; `source = hospital_website` (or agreed enum) |
| Resume file keys | Wave 10 S3 helpers on apply (multipart) |

---

## 5. HTTP contract

**Base path:** `/api/public/careers`  
**Host:** HRM app (not Channeling).

| Method | Path | Auth | Required scope | Purpose |
|--------|------|------|----------------|---------|
| `POST` | `/token` | `client_id` + `client_secret` | — | Issue access token |
| `GET` | `/jobs` | Bearer | `careers:read` | Published job list |
| `GET` | `/jobs/[slug]` | Bearer | `careers:read` | Job detail |
| `POST` | `/applications` | Bearer | `careers:apply` | Candidate apply (+ optional CV) |

### 5.1 Token request

`POST /api/public/careers/token`  
Content-Type: `application/json` or `application/x-www-form-urlencoded`

```json
{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

Success `200`:

```json
{
  "access_token": "eyJ…",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Errors (align with Channeling where practical):

| HTTP | Code (example) | When |
|------|----------------|------|
| 400 | `unsupported_grant_type` / `invalid_request` | Bad grant or missing fields |
| 401 | `invalid_client` | Unknown, blocked, or bad secret |
| 503 | — | Auth/JWT signing not configured |

### 5.2 Authenticated calls

```http
Authorization: Bearer <access_token>
```

On each request: verify JWT signature + expiry; re-check `ApiClient` exists and `isBlocked === false`; enforce scopes.

### 5.3 Public DTO rules (never expose)

- Vacancy justification / approval notes  
- Screening scores, evaluation ratings, panel comments  
- Reject / decline / cancel **internal** reasons  
- Salary approval internals beyond what HR intentionally publishes  
- Staff / auth user ids (except opaque flow if needed)

Include only: title, slug, short/full description, department/designation labels, employment type, dates, openings (if public), apply eligibility flags.

### 5.4 Apply rules

`POST /api/public/careers/applications` (JSON):

```json
{
  "jobSlug": "staff-nurse-icu",
  "candidateName": "A. Perera",
  "candidateEmail": "a.perera@example.com",
  "candidatePhone": "0771234567",
  "experienceYears": 3,
  "qualifications": "BSc Nursing",
  "skills": ["ICU", "ACL"]
}
```

Success `201`: `{ "application": { "applicationId", "jobSlug", "jobTitle", "appliedDate", "acceptingApplications": true } }`

- Job must be **published** and not closed/expired  
- Source fixed to `hospital_website`  
- Duplicate policy: unique `(jobPostId, candidateEmail)` → HTTP `409`  
- Validation: Zod (name, email, phone mobile rules)  
- Feature flag: `CAREERS_PUBLIC_APPLY_ENABLED` — `503` when off  
- CV (optional): `multipart/form-data` field `resume` — PDF or image, ≤10 MB → S3 `resumes/`; response includes `hasResume`  
- JSON body still supported for metadata-only apply  
- Rate limiting on token + apply (Wave 11 hardening)

---

## 6. Code layout (target)

```
apps/hrm/
  prisma/schema.prisma                 # + ApiClient
  types/api-client.ts
  types/public-careers.ts              # public DTOs + request shapes

  lib/
    public-careers-auth.ts             # issue / verify JWT
    public-careers-cors.ts             # PUBLIC_CAREERS_CORS_ORIGINS

  services/
    api-client-services/
      api-client.service.ts            # CRUD + rotate + list API users
    public/
      careers-token.service.ts
    recruitment-services/
      public-careers.service.ts        # list/detail/apply orchestration

  app/actions/
    api-client.actions.ts              # dashboard only

  app/(dashboard)/
    users/user-form.tsx                # CustomSelectField + API User UX
    api-clients/                       # NEW module
      page.tsx
      columns.tsx
      api-client-form.tsx
      record-actions.tsx

  app/api/public/careers/
    token/route.ts
    jobs/route.ts
    jobs/[slug]/route.ts
    applications/route.ts
```

**Layering:**

- Dashboard CRUD → actions → services (permissions + activity log).  
- Public routes → **services only** + machine auth (no `requirePermission` NextAuth session).

---

## 7. Environment

| Variable | Purpose |
|----------|---------|
| `PUBLIC_CAREERS_JWT_SECRET` (or shared signing secret) | Sign/verify access tokens |
| `PUBLIC_CAREERS_TOKEN_TTL_SEC` | Optional; default `3600` |
| `PUBLIC_CAREERS_CORS_ORIGINS` | Comma-separated website origins |
| `CAREERS_PUBLIC_APPLY_ENABLED` | `true` / `false` — gate `POST /applications` |
| Existing `S3_*` / `AWS_*` | CV upload on apply |
| Existing SMTP/SMS | Not required for public apply ack in v1 (optional later) |

Document all new keys in `apps/hrm/.env.example` when implementing.

---

## 8. Ops: approving a client for production

1. In HRM **Users**, create an **API User** (CustomSelectField → API User).  
2. In **API Clients**, create client → select that user → copy `client_id` + `client_secret` once into the website secret store.  
3. Assign scopes: start with `careers:read` only.  
4. Website BFF env: base URL + credentials.  
5. Smoke: token → list → detail.  
6. When ready: add `careers:apply`, set `CAREERS_PUBLIC_APPLY_ENABLED=true`, smoke apply (+ CV).  
7. To revoke: **Block** the client in HRM (no website redeploy required for kill-switch).

---

## 9. Phased delivery checklist

| Phase | Deliverable | Exit criteria |
|-------|-------------|---------------|
| **P0** | User Type API User via CustomSelectField; service allows type 4 | **Done** — create/edit API users in `/users`; cannot dashboard-login as them |
| **P1** | API Clients module + generate/rotate secret | **Done** — `/api-clients`; secret shown once; block + rotate; scopes via `PUBLIC_API_SCOPES` |
| **P2** | `POST /token` + JWT helpers | **Done** — `POST /api/public/careers/token`; JWT via `public-careers-auth`; blocked/bad secret → 401 |
| **P3 (Wave 11a)** | `GET /jobs`, `GET /jobs/[slug]` | **Done** — published + not expired only; thin DTOs; scope `careers:read` |
| **P4 (Wave 11b)** | `POST /applications` (metadata) | **Done** — slug + candidate fields; `careers:apply` + `CAREERS_PUBLIC_APPLY_ENABLED`; duplicates → 409 |
| **P5 (Wave 11c)** | Multipart CV via S3 | **Done** — optional `resume` file; `resumeFileKey` set; 10 MB / PDF+image |
| **P6 (Wave 12)** | Website cutover + CMS migration | No dual write; CMS careers admin retired |

Safer default: ship **P3** to staging before enabling apply in production.

---

## 10. Security checklist

- [ ] Secret never logged (redact `client_secret` in request logs)  
- [ ] HTTPS only in staging/production  
- [ ] BFF-only consumers (CORS tight; prefer no browser→HRM)  
- [ ] Token TTL short; no refresh token in v1 (re-auth with client credentials)  
- [ ] Blocked client fails both token and Bearer verification  
- [ ] Scope checks on every careers route  
- [ ] Apply flag + rate limits  
- [ ] Public DTOs reviewed against internal models  

---

## 11. Anti-patterns

| Do not | Why |
|--------|-----|
| Share HRM `DATABASE_URL` / Prisma with website | Breaks isolation (`HRM_DEVELOPMENT_GUIDELINES` §8) |
| Put Careers public API on Channeling | Wrong SoR |
| Use a single long-lived static key on every request as the final design | Harder to rotate; weaker identity — prefer client credentials + token |
| Store plaintext `client_secret` in DB | Use argon2 hash only |
| Let API Users sign in to HRM UI | Dashboard login types only |
| Keep website CMS as a second write path after cutover | Dual admin / sync bugs |

---

## 12. Testing focus

| Area | Verify |
|------|--------|
| Token | Happy path; wrong secret; blocked client; missing grant_type |
| Read | Unpublished / closed / expired posts excluded |
| Apply | Duplicate email; closed post; flag off; validation errors |
| AuthZ | Token without `careers:apply` cannot POST applications |
| Audit | Created Application `createdBy` = API user’s auth id |
| CV | Oversized / wrong MIME rejected; key stored when S3 configured |

---

## 13. Relationship to Channeling

| Concern | Channeling | HRM Careers |
|---------|------------|-------------|
| Token style | `client_credentials` → Bearer | Same |
| Client admin UI | `/admin/api-clients` | `/api-clients` (HRM) |
| Client table | Channeling `ApiClient` | **HRM** `ApiClient` |
| Acting user | Channeling User type 4 | Auth User type 4 (`db-auth`) |
| Domain | Bookings, sessions, … | Job posts, applications |

Do **not** reuse Channeling’s `ApiClient` rows for Careers. Credentials and acting users are **HRM-owned**.

---

## 14. Quick start for implementers

1. Read this guide + Recruitment guide §2 / Wave 11 checklist.  
2. Implement **P0 → P1** (API User UX + API Clients) before public routes.  
3. Implement **P2 → P3** and hand website a staging contract (token + GET).  
4. Enable apply (**P4–P5**) only after read path is stable.  
5. Wave 12 cutover last.

When curl/Postman examples are added, keep them in this doc or a sibling `PUBLIC_CAREERS_API_CURL.md` (mirror Channeling’s `public-api-curl.md`).
