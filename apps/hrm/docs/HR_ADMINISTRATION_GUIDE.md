# HR Administration — Development Guide

Guidance for building **HR Administration** features in `apps/hrm`.  
Use with:

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — layered architecture, checklists
- `apps/hrm/docs/PERMISSION_FLOW.md` — Auth User Group grants
- `apps/hrm/docs/ROSTER_SHIFTS_MANAGER_GUIDE.md` — downstream consumer of `HolidayCalendar`; **Shift Types** is the current shift template master (Manage Shifts deferred — §34)
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — future holiday-aware leave day counting

**Status:** HR Administration sidebar group is live.  
**Shipped (CRUD):** Holiday Calendar · Designations · Area / Staff Grade · Manage Rosters.  
**Strategy:** Finish remaining **HR Admin master modules** first, then run a single **cross-manager integration** wave (Staff, Roster & Shifts, Leave).  
**Build path (each module):** Doc/types → UI-first master–detail → Prisma/Zod service → Actions → live CRUD.  
**Do not** wire Staff / Roster / Leave consumers until the related master is shipped (or that master is explicitly out of scope for the wave).

### Coverage in this document


| Module                                  | Status                                                    | Detail sections |
| --------------------------------------- | --------------------------------------------------------- | --------------- |
| Holiday Calendar                        | Shipped                                                   | §2–12           |
| Designation Management                  | Shipped (D0–D5); D6/D7 deferred                           | §13–18          |
| Area / Staff Grade                      | Shipped (G0–G5); G6/G7 deferred                           | §19–24          |
| Manage Rosters                          | Shipped (R0–R5); R6/R7 deferred                           | §25–30          |
| Manage Shifts                           | **Not required for current system** — deferred / optional | §34             |
| Remaining masters + integration backlog | Tracking only                                             | §31–33          |


---



## 1. HR Administration (group overview)

HR Administration is the **master-data and configuration** area for hospital HR operations. It sits alongside existing sidebar groups (Administration, Leave Management, Overtime Management, Roster & Shifts) and owns reference data that other modules consume.

### Live sidebar

Collapsible group **HR Administration** (add links only when a module ships — do not pre-populate unbuilt routes):


| Link               | Route               | Resource           |
| ------------------ | ------------------- | ------------------ |
| Holiday Calendar   | `/holiday-calendar` | `holiday-calendar` |
| Designations       | `/designations`     | `designations`     |
| Area / Staff Grade | `/staff-grades`     | `staff-grades`     |
| Manage Rosters     | `/manage-rosters`   | `manage-rosters`   |




### Concern map


| Concern                          | Owner                                           | Notes                                                                    |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| Holiday dates & types            | **Holiday Calendar**                            | Source of truth for PH / Poya / Mercantile days                          |
| Job designations                 | **Designation Management**                      | CRUD shipped; Staff/Roster select still placeholder                      |
| Area / staff grades              | **Area / Staff Grade**                          | CRUD shipped; Staff/Roster select still placeholder                      |
| Roster groups (team/ward)        | **Manage Rosters**                              | Business code `CHN` ≠ period code `SR-n`; Staff/Roster still placeholder |
| Shift templates (timings, flags) | **Roster & Shifts → Shift Types** (`ShiftType`) | Current system master — **not** duplicated in HR Admin (see §34)         |
| Manage Shifts (legacy mock)      | **Deferred / optional** (§34)                   | Only if product requires roster-scoped catalogs + leave/prev-next rules  |
| Departments                      | **Backlog** (§31)                               | Placeholders in Staff, Manage Rosters, Roster filters                    |
| Units / wards                    | **Backlog** (§31)                               | Heavy use in Roster & Shifts; may nest under Department                  |
| Institutions                     | **Backlog** (§31)                               | Staff Employment placeholder                                             |
| Salary cycle                     | **Backlog** (§31)                               | Appears on Overnight / payroll-adjacent Roster UI                        |
| Salary structures                | **Backlog** (§31)                               | Listed in permission map; not built                                      |
| Shift templates for holidays     | Roster & Shifts (`ShiftType.holidayEligible`)   | Consumes holiday dates; does not define them                             |
| PH duty allocations              | Roster & Shifts                                 | Joins `RosterAllocation` → `HolidayCalendar`                             |
| Leave day counting               | Leave                                           | Future: skip holidays when computing `days`                              |
| Payroll PH allowance             | External / future                               | Flags on allocations today; no payroll engine in v1                      |




### Delivery rule

```
1) Ship next HR Admin master (CRUD only)
2) Repeat until backlog masters for this wave are done
3) Then one integration wave → Staff Employment + Roster filters + derived counts
```

---



## 2. Holiday Calendar — product surface


| Route               | Resource key (planned) | Role                                                   |
| ------------------- | ---------------------- | ------------------------------------------------------ |
| `/holiday-calendar` | `holiday-calendar`     | Master list + detail editor for institutional holidays |


**Permission:** dedicated Auth User Group resource `holiday-calendar` (display name **Holiday Calendar**).  
Unlike Roster & Shifts (one resource for the whole group), HR Administration modules get **one resource per screen** so HR Officers can manage holidays without roster publish rights.

**Activity keys (planned):**


| Action     | Key                        |
| ---------- | -------------------------- |
| Page visit | `holiday-calendar.visited` |
| Create     | `holiday-calendar.created` |
| Update     | `holiday-calendar.updated` |
| Delete     | `holiday-calendar.deleted` |


---



## 3. Domain model (`prisma/schema.prisma`)

The collection already exists as a **v1 stub** owned by Roster until HR Administration ships:

```prisma
/// v1 Holiday Date stub (Roster-owned until HR Administration exists).
model HolidayCalendar {
  id     String   @id @default(auto()) @map("_id") @db.ObjectId
  code   String   @unique // HOL-n
  name   String
  typeId String // poya | mercantile | public
  date   DateTime

  allocations RosterAllocation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?  @db.ObjectId
  updatedBy String?  @db.ObjectId

  @@unique([date])
  @@index([typeId])
}
```



### Field semantics


| Field         | Rule                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `code`        | Auto-generated via `generateRecordCode('HOL')` → `HOL-1`, `HOL-2`, … (`HOLIDAY_CALENDAR_CODE_PREFIX` in `types/roster.ts`) |
| `name`        | Display name (e.g. *Nikini Full Moon Poya Day*, *Christmas Day*)                                                           |
| `typeId`      | One of `poya`, `mercantile`, `public` (`HOLIDAY_TYPES` in `types/roster.ts`)                                               |
| `date`        | **Calendar date** (store as UTC midnight or normalized local date — match existing roster date helpers)                    |
| `allocations` | Reverse relation: `RosterAllocation.holidayId` → this record                                                               |




### Locked product decisions


| Topic                        | Decision                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| One holiday per calendar day | Enforced by `@@unique([date])` — editing date must check no other row owns that day                                                    |
| Holiday types                | Fixed enum v1: **Poya**, **Mercantile**, **Public** — no free-text type                                                                |
| Ownership                    | **HR Administration** owns CRUD; Roster modules **read only**                                                                          |
| Delete                       | **Block** when `allocations` count > 0; show count in error message                                                                    |
| Date change                  | Allowed when no duplicate; allocations keep `holidayId` FK — duty date on allocation remains authoritative for the cell                |
| Default PH shift template    | **Not** stored on `HolidayCalendar` in v1 — document in Impact panel; wire via Shift Types (`holidayEligible`) + Public Holiday Shifts |
| Payroll / leave side effects | **None** in v1 CRUD — Impact panel is informational until Leave and Payroll integrations land                                          |




### Audit fields

`createdBy` / `updatedBy` are Auth User ObjectIds — **no** cross-DB Prisma relation. Resolve display names via `resolveAuthUsers` (same pattern as Staff, Shift Types, Leave).

---



## 4. Holiday types

Defined in `apps/hrm/types/roster.ts`:

```ts
export const HOLIDAY_TYPES = ['poya', 'mercantile', 'public'] as const;
```


| `typeId`     | UI label   | Typical use (Sri Lanka)                  |
| ------------ | ---------- | ---------------------------------------- |
| `poya`       | Poya       | Full-moon Buddhist holidays              |
| `mercantile` | Mercantile | Shop and office closure days             |
| `public`     | Public     | National / institutional public holidays |


Display labels today live in `public-holiday-shift.service.ts` (`HOLIDAY_TYPE_LABELS`). When building Holiday Calendar, **move labels to a shared helper** (e.g. `lib/helpers/holiday-type.helper.ts`) so Roster and HR Admin stay in sync.

---



## 5. Business rules (implement in service)



### 5.1 Create

1. Validate payload with Zod: `name` (required, max length), `typeId` (enum), `date` (coerce to date).
2. Normalize `date` to start-of-day (consistent with roster allocation dates).
3. Reject if another `HolidayCalendar` row exists for that calendar day.
4. Generate `code` via `generateRecordCode(HOLIDAY_CALENDAR_CODE_PREFIX)`.
5. Set `createdBy` / `updatedBy` from session.



### 5.2 Update

1. Same validation as create.
2. If `date` changes, re-check `@@unique([date])` excluding current id.
3. Set `updatedBy` from session.
4. Do **not** cascade-update `RosterAllocation.date` — allocation duty date is independent.



### 5.3 Delete

1. Count `RosterAllocation` rows where `holidayId = id`.
2. If count > 0 → return structured error: *"Cannot delete — N public holiday shift(s) reference this date."*
3. Otherwise hard-delete the row.



### 5.4 List / search

Support URL-driven filters (master list):


| Param            | Purpose                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `year`           | Default current year; drives list and mini-calendar month                                          |
| `search`         | Case-insensitive match on `name` or `code`                                                         |
| `typeId`         | Filter by holiday type                                                                             |
| `page` / `limit` | Optional pagination if list grows large; master–detail may load full year without pagination in v1 |


Sort default: `date` **ascending** within the selected year.

---



## 6. Downstream impact (documented, wired later)

The detail panel **Impact** box explains cross-module behaviour. v1 stores holidays only; integrations are phased.


| Area                              | Current behaviour                                                 | After Holiday Calendar CRUD                                                                   |
| --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Public Holiday Shifts**         | Reads `holidayCalendar.findMany` for filters/forms                | Same reads; options populated from HR-maintained data                                         |
| **Shift Types**                   | `holidayEligible` flag on master                                  | Unchanged; HR configures which templates apply on PH                                          |
| **Overtime (Day Off / PH Shift)** | Uses PH concept                                                   | Consumes same holiday dates when wired                                                        |
| **Leave application days**        | `computeLeaveApplicationDays` counts inclusive calendar days only | **Future:** subtract days that fall on `HolidayCalendar` (and optionally weekends per policy) |
| **Payroll PH allowance**          | `holidayAllowance` + `sendToPayroll` flags on allocations         | **Future:** payroll export reads allocation + holiday metadata                                |


Keep Impact copy visible in the UI so HR Officers understand why the calendar matters, even before Leave/Payroll hooks exist.

---



## 7. UI map — master–detail (planned)

Match the **Manage Holiday** mock: left register, right detail + mini calendar — **not** the table + sheet pattern used on Shift Types.

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Holiday Calendar                                                          │
│ Manage institutional holidays used by roster, leave, and payroll.         │
└───────────────────────────────────────────────────────────────────────────┘

┌─ ~35% Holidays ──────────────┐  ┌─ ~65% Holiday Detail ──────────────────┐
│ Search                       │  │ [ Save ]                               │
│ ┌──────────────────────────┐ │  │ NAME *          [________________]    │
│ │ Christmas Day            │ │  │ SELECT DAY TYPE * [ Poya ▼ ]          │
│ │ 2026-12-25 · Public      │ │  │ HOLIDAY DATE *  [ 27/08/2026 ]        │
│ │ Nikini Poya (selected)   │ │  │ ┌─ Impact ─────────────────────────┐  │
│ │ 2026-08-27 · Poya        │ │  │ │ Payroll PH allowance…          │  │
│ └──────────────────────────┘ │  │ │ Shifts default to PH template… │  │
│ [ + Add ]  [ Delete ]        │  │ │ Leave requests skip counting…    │  │
│                              │  │ └────────────────────────────────┘  │
│ Year: ◀ 2026 ▶               │  │              ┌─ Aug 2026 calendar ─┐  │
└──────────────────────────────┘  │              │  (selected date)    │  │
                                  │ Created by … │ Updated by …        │  │
                                  └──────────────────────────────────────┘  │
```



### UX rules


| Rule          | Detail                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| Selection     | Click list row → load detail form (client state or URL `?id=` for deep link)        |
| Add           | Clears detail form; sets date from mini-calendar or today; does not save until Save |
| Delete        | Requires selected row; confirm dialog; disabled when allocations exist              |
| Save          | Create or update via server action; toast; refresh list; keep selection             |
| Mini calendar | Highlights selected `date`; clicking a day updates HOLIDAY DATE field               |
| Year control  | Filters left list; calendar opens on selected holiday month or current month        |
| Form stack    | **Formik + Yup** client-side; **Zod** in service (HRM standard)                     |




### Planned file layout

```
apps/hrm/
  app/(dashboard)/(hr-admin)/holiday-calendar/
    page.tsx                           # Server: access, load list + selected record
    holiday-calendar-workspace.tsx     # Client: master–detail shell
    section-holiday-list.tsx           # Left: search, year, list, Add/Delete
    section-holiday-detail.tsx         # Right: form, impact, calendar, audit
    section-holiday-impact.tsx         # Read-only impact panel
    holiday-calendar-ui-context.tsx    # Optional: selection / dirty state

  app/actions/hr-admin-actions/
    holiday-calendar.actions.ts

  services/hr-admin-services/
    holiday-calendar.service.ts

  lib/mappers/
    holiday-calendar-form.mapper.ts    # If form shape differs from payload

  lib/helpers/
    holiday-type.helper.ts             # HOLIDAY_TYPES + labels (shared with roster)

  types/
    holiday-calendar.ts                # Or extend types/roster.ts HolidayCalendar* types
```

**Reference implementations:**

- Workspace composition: `public-holiday-shifts-workspace.tsx`, `shift-types-workspace.tsx`
- Audit footer: Staff Additional Details tab, Shift Types history metadata
- Permissions / activity: `leave-types/page.tsx`, `shift-types/page.tsx`

Pages must **not** call Prisma directly.

---



## 8. Permissions checklist

When implementing Holiday Calendar:

1. Add `{ id: 'holiday-calendar', name: 'Holiday Calendar' }` to `apps/hrm/types/user-group.ts` → `RESOURCES`
2. Map route in `apps/hrm/lib/permissions.ts` → `ROUTE_TO_RESOURCE['/holiday-calendar'] = 'holiday-calendar'`
3. Sidebar: new **HR Administration** group in `desktop-sidebar.tsx`; gate with `hasAccess('/holiday-calendar')`
4. Page: `checkRouteAccess('/holiday-calendar')` → redirect `/unauthorized-access`
5. Actions: `requirePermission('holiday-calendar', 'view'|'add'|'edit'|'delete')`
6. Client buttons: `usePermissions().has('holiday-calendar', …)`
7. Grant on Auth User Group; user re-login to pick up permissions

**Do not** reuse `shift-roster` for holiday CRUD — roster operators should not implicitly gain HR master-data write access.

---



## 9. Service / action contract (planned)



### Types (`types/holiday-calendar.ts` or `types/roster.ts`)

Existing types can be reused:

- `HolidayCalendarRecord`
- `HolidayCalendarPayload`
- `GetHolidayCalendarParams`

Extend with:

- `HolidayCalendarListItem` — id, code, name, typeId, typeLabel, date (ISO string)
- `HolidayCalendarDetail` — record + resolved audit users
- `HolidayCalendarFormOptions` — `holidayTypes: { id, name }[]`



### Actions


| Action                                | Permission | Service call                 |
| ------------------------------------- | ---------- | ---------------------------- |
| `getHolidayCalendarListAction`        | view       | List by year + filters       |
| `getHolidayCalendarByIdAction`        | view       | Single record + audit users  |
| `createHolidayCalendarAction`         | add        | Create                       |
| `updateHolidayCalendarAction`         | edit       | Update                       |
| `deleteHolidayCalendarAction`         | delete     | Delete with allocation guard |
| `getHolidayCalendarFormOptionsAction` | view       | Type dropdown options        |


Each mutation: `revalidatePath('/holiday-calendar')`, `logActivityNonBlocking`, strip audit fields from client payload in the action layer.

### Refactor note (Roster)

After Holiday Calendar service is live, update `public-holiday-shift.service.ts` to import shared holiday type labels (and optionally a thin `listHolidaysForOptions()` helper) instead of duplicating `HOLIDAY_TYPE_LABELS`. **Do not** move CRUD into the roster service — keep reads only there.

---



## 10. Development phases


| Phase                       | Deliverable                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| **H0 — Doc & types**        | This guide; confirm types/constants; shared holiday-type helper              |
| **H1 — Service**            | Zod schemas, CRUD, unique-date guard, delete guard, code generation          |
| **H2 — Actions**            | Permissions, activity log, revalidate                                        |
| **H3 — UI shell**           | Route, sidebar group, workspace layout, empty list/detail                    |
| **H4 — Wire CRUD**          | List search/year, detail form, Save, Add, Delete, audit footer               |
| **H5 — Calendar widget**    | Mini calendar synced with date field                                         |
| **H6 — Roster integration** | Public Holiday Shifts reads from maintained data; smoke test PH shift create |
| **H7 — Leave (future)**     | Holiday-aware `computeLeaveApplicationDays`                                  |
| **H8 — Import (future)**    | Bulk seed for a year (CSV or admin import for Poya/Mercantile lists)         |


Ship **H0–H6** as v1. Defer bulk import and leave/payroll automation.

---



## 11. Testing checklist (manual)

- [ ] Create holiday for each type; code auto-generates `HOL-n`
- [ ] Duplicate date rejected with clear message
- [ ] Edit name/type/date; audit `updatedBy` refreshes
- [ ] Delete blocked when Public Holiday Shift references `holidayId`
- [ ] Delete succeeds when no allocations
- [ ] Year filter and search narrow the list correctly
- [ ] User without `holiday-calendar` permission cannot access route or mutate
- [ ] Public Holiday Shifts form dropdown lists new holidays after save

---



## 12. Related schema (read-only context)

`RosterAllocation` optional holiday fields (owned by Roster, not Holiday Calendar):

```
holidayId         → FK HolidayCalendar
payRate           → 1.50 | 2.00 | 2.50
holidayAllowance  → Float
grantLieuLeave    → Boolean
sendToPayroll     → Boolean
```

`ShiftType.holidayEligible` marks templates suitable for PH duty — configured on **Shift Types**, not on `HolidayCalendar`.

---



## 13. Designation Management — product surface


| Route           | Resource key (planned) | Role                                                            |
| --------------- | ---------------------- | --------------------------------------------------------------- |
| `/designations` | `designations`         | Master list + detail editor for the hospital designation master |


**Permission:** dedicated Auth User Group resource `designations` (display name **Designations**).  
Keep this separate from `staff` and `shift-roster` so HR users can maintain the designation master without broader staff-edit or roster rights.

**Activity keys (planned):**


| Action     | Key                    |
| ---------- | ---------------------- |
| Page visit | `designations.visited` |
| Create     | `designations.created` |
| Update     | `designations.updated` |
| Delete     | `designations.deleted` |


---



## 14. Designation domain model (planned)

Designation Management becomes the source of truth for job titles used across the hospital.

### Proposed v1 fields


| Field                     | Rule                                                              |
| ------------------------- | ----------------------------------------------------------------- |
| `code`                    | Auto-generated human code (e.g. `D1000`, `D1001`)                 |
| `name`                    | Required designation title (e.g. *Assistant Maintenance Officer*) |
| `categoryId`              | Fixed selector value in v1; **not free text**                     |
| `description`             | Optional short note / summary                                     |
| `createdAt` / `updatedAt` | Audit timestamps                                                  |
| `createdBy` / `updatedBy` | Auth User ObjectIds resolved with `resolveAuthUsers`              |




### Locked product decisions


| Topic             | Decision                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Workspace pattern | **Master–detail**, same family as Holiday Calendar                  |
| Category input    | `CustomSelectField`, not text entry                                 |
| Category values   | Fixed v1 options: **Clinical**, **Non-Clinical**                    |
| Code entry        | Treat as generated master code; show read-only in form              |
| Ownership         | HR Administration owns CRUD; Staff and Roster consume it            |
| Delete            | Block when downstream staff records still reference the designation |


---



## 15. Designation categories

Define category constants in a dedicated type module (for example `types/designation.ts`) and expose a shared labels/options helper for UI and services.

```ts
export const DESIGNATION_CATEGORIES = ['clinical', 'non-clinical'] as const;
export type DesignationCategoryId = (typeof DESIGNATION_CATEGORIES)[number];
```


| `categoryId`   | UI label     |
| -------------- | ------------ |
| `clinical`     | Clinical     |
| `non-clinical` | Non-Clinical |


Use a `CustomSelectField` with these options in the detail form. Do not allow ad-hoc category text in v1.

---



## 16. Designation UI map — master–detail

Match the approved mock and the Holiday Calendar interaction style: left register, right detail form.

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Designation Management                                                    │
│ Maintain the master list of job designations used across the hospital.    │
└───────────────────────────────────────────────────────────────────────────┘

┌─ ~35% Designation List ─────────┐  ┌─ ~65% Designation Details ───────────┐
│ Search                    [+]   │  │ Designation Name * [______________] │
│ ┌─────────────────────────────┐ │  │ Code              [ D1000 ]          │
│ │ Assistant Pharmacist  D1001 │ │  │ Category *        [ Clinical ▼ ]     │
│ │ Billing Officer       D1004 │ │  │ Description       [______________]   │
│ │ Consultant Physician  D1008 │ │  │                                     │
│ └─────────────────────────────┘ │  │ [ Delete ]                 [ Save ]  │
└─────────────────────────────────┘  └──────────────────────────────────────┘
```



### UX rules


| Rule       | Detail                                                                           |
| ---------- | -------------------------------------------------------------------------------- |
| Selection  | Click list row → load form in the right panel                                    |
| Add        | Clears form, highlights detail panel, scrolls/focuses form, does not save yet    |
| Category   | Use `CustomSelectField` only                                                     |
| Code       | Read-only display in detail form once record exists; blank / placeholder for new |
| Save       | Create or update via server action; toast; refresh list; keep selection          |
| Delete     | In detail header with confirm dialog; disabled while creating or when in use     |
| Audit      | Show Created by / Last updated footer using resolved auth users                  |
| Form stack | **Formik + Yup** client-side; **Zod** in service                                 |




### Planned file layout

```
apps/hrm/
  app/(dashboard)/(hr-admin)/designations/
    page.tsx
    designation-workspace.tsx
    designation-ui-context.tsx
    section-designation-list.tsx
    section-designation-detail.tsx
    sample-data.ts                    # UI-first only; remove once actions/service ship

  app/actions/hr-admin-actions/
    designation.actions.ts

  services/hr-admin-services/
    designation.service.ts

  lib/helpers/
    designation-category.helper.ts

  lib/mappers/
    designation-form.mapper.ts

  types/
    designation.ts
```

---



## 17. Designation development phases


| Phase                                  | Deliverable                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- |
| **D0 — Doc & types**                   | This guide section; category constants; UI types                          |
| **D1 — UI shell**                      | Route, sidebar, breadcrumbs, workspace layout, sample data                |
| **D2 — Interactive detail form**       | Search, Add highlight, selector-based category, Save/Delete, audit footer |
| **D3 — Schema & service**              | Prisma model, Zod CRUD, unique name guard, `DES-n` code generation        |
| **D4 — Actions**                       | Permissions, activity log, revalidate                                     |
| **D5 — Wire CRUD**                     | Page + detail form use real actions; sample data removed from imports     |
| **D6 — Staff integration (deferred)**  | Staff Employment selects from designation master                          |
| **D7 — Roster integration (deferred)** | Roster filters/snapshots consume designation master consistently          |


**D0–D5 shipped.** D6/D7 wait for the **cross-manager integration wave** after remaining HR Admin masters (§31).

---



## 18. Designation testing checklist (manual)

- [ ] Register shows designation cards with name left and code right
- [ ] Search filters by designation name or code
- [ ] Add highlights the detail panel and focuses the form
- [ ] Category renders as a `CustomSelectField`, not as a text input
- [ ] Existing record shows read-only code in the form
- [ ] Save / Cancel / Delete buttons appear at the bottom of the detail form
- [ ] Delete is disabled for new records

---



## 19. Area / Staff Grade — product surface


| Route           | Resource key   | Role                                                          |
| --------------- | -------------- | ------------------------------------------------------------- |
| `/staff-grades` | `staff-grades` | Master list + detail editor for hospital areas / staff grades |


**Permission:** dedicated Auth User Group resource `staff-grades` (display name **Area / Staff Grade**).  
Keep this separate from `staff` and `shift-roster`.

**Activity keys (planned):**


| Action     | Key                    |
| ---------- | ---------------------- |
| Page visit | `staff-grades.visited` |
| Create     | `staff-grades.created` |
| Update     | `staff-grades.updated` |
| Delete     | `staff-grades.deleted` |


---



## 20. Area / Staff Grade domain model (planned)

This module is the source of truth for **area / staff grade** records used later by Staff Employment and Roster filters.

Today Staff stores free-text `employmentDetails.employment.staffGrade` and Roster filters collect unique strings from staff. Those stay unchanged until a later integration phase.

### Proposed v1 fields


| Field                     | Rule                                                            |
| ------------------------- | --------------------------------------------------------------- |
| `code`                    | Auto-generated (`SG-n` via `generateRecordCode`)                |
| `name`                    | Required area name (e.g. *Staff Nurse Grade 1*, *Store Keeper*) |
| `gradeLevelId`            | Fixed selector value in v1; **not free text**                   |
| `createdAt` / `updatedAt` | Audit timestamps                                                |
| `createdBy` / `updatedBy` | Auth User ObjectIds resolved with `resolveAuthUsers`            |




### Locked product decisions


| Topic              | Decision                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Workspace pattern  | **Master–detail**, same family as Designations                                                            |
| Grade Level input  | `CustomSelectField`, not text entry                                                                       |
| Grade Level values | Fixed v1 options aligned with Staff placeholders: **Grade I**, **Grade II**, **Grade III**, **Executive** |
| Code entry         | Generated master code; read-only on the form                                                              |
| Actions            | Cancel / Delete / Save at the **bottom of the detail form** (not list footer; no separate Update)         |
| Ownership          | HR Administration owns CRUD; Staff and Roster consume it later                                            |
| Integrations       | **Deferred** — do not change Staff Employment or Roster in this build                                     |


---



## 21. Grade levels

Define in `types/staff-grade.ts` (canonical for this master). Staff’s `STAFF_GRADE_OPTIONS` remains a placeholder until integration.

```ts
export const STAFF_GRADE_LEVELS = ['grade_i', 'grade_ii', 'grade_iii', 'executive'] as const;
export type StaffGradeLevelId = (typeof STAFF_GRADE_LEVELS)[number];
```


| `gradeLevelId` | UI label  |
| -------------- | --------- |
| `grade_i`      | Grade I   |
| `grade_ii`     | Grade II  |
| `grade_iii`    | Grade III |
| `executive`    | Executive |


Use a `CustomSelectField` with these options. Do not allow ad-hoc grade text in v1.

---



## 22. Area / Staff Grade UI map — master–detail

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Area / Staff Grade Management                                             │
│ Configure staff areas and grades used across the roster and payroll.      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ ~35% Area List ──────────────┐  ┌─ ~65% Area Details ────────────────────┐
│ Search                  [+]   │  │ Area Name *     [________________]    │
│ ┌───────────────────────────┐ │  │ Code            [ SG-1 ]              │
│ │ Pharmacy Assistant        │ │  │ Grade Level *   [ Grade I ▼ ]         │
│ │ Store Keeper (selected)   │ │  │                                       │
│ │ Staff Nurse Grade 1       │ │  │ [ Cancel ] [ Delete ]        [ Save ] │
│ └───────────────────────────┘ │  └───────────────────────────────────────┘
└───────────────────────────────┘
```



### UX rules


| Rule        | Detail                                                                |
| ----------- | --------------------------------------------------------------------- |
| Selection   | Click list row → load form in the right panel                         |
| Add         | Clears form, highlights detail panel, focuses name, does not save yet |
| Grade Level | Use `CustomSelectField` only                                          |
| Code        | Read-only once a record exists; placeholder for new                   |
| Save        | Create or update; toast; refresh list; keep selection                 |
| Delete      | Confirm dialog; disabled while creating                               |
| Audit       | Created by / Last updated footer                                      |
| Form stack  | **Formik + Yup** client-side; **Zod** in service                      |




### Planned file layout

```
apps/hrm/
  app/(dashboard)/(hr-admin)/staff-grades/
    page.tsx
    staff-grade-workspace.tsx
    staff-grade-ui-context.tsx
    section-staff-grade-list.tsx
    section-staff-grade-detail.tsx

  app/actions/hr-admin-actions/
    staff-grade.actions.ts

  services/hr-admin-services/
    staff-grade.service.ts

  lib/mappers/
    staff-grade-form.mapper.ts

  types/
    staff-grade.ts
```

---



## 23. Area / Staff Grade development phases


| Phase                                  | Deliverable                                                                 | Status          |
| -------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| **G0 — Doc & types**                   | This guide section; grade-level constants; UI types                         | **Done**        |
| **G1 — UI shell**                      | Route, sidebar, breadcrumbs, workspace, sample data                         | **Done**        |
| **G2 — Interactive detail form**       | Search, Add highlight, `CustomSelectField` grade, Save/Delete, audit footer | **Done**        |
| **G3 — Schema & service**              | Prisma model, Zod CRUD, unique name, `SG-n` codes                           | **Done**        |
| **G4 — Actions**                       | Permissions, activity log, revalidate                                       | **Done**        |
| **G5 — Wire CRUD**                     | Page + detail form use real actions; sample data removed                    | **Done**        |
| **G6 — Staff integration (deferred)**  | Staff Employment `staffGrade` selects from this master                      | Later — see §32 |
| **G7 — Roster integration (deferred)** | Roster filters consume this master                                          | Later — see §32 |


**G0–G5 shipped.** G6/G7 wait for the **cross-manager integration wave** after remaining HR Admin masters (§31).

---



## 24. Area / Staff Grade testing checklist (manual)

- [ ] Register shows area cards with name and grade
- [ ] Search filters by name, code, or grade label
- [ ] Add highlights the detail panel and focuses the form
- [ ] Grade Level renders as a `CustomSelectField`, not as a text input
- [ ] Existing record shows read-only code in the form
- [ ] Save / Cancel / Delete buttons appear at the bottom of the detail form
- [ ] Delete is disabled for new records

---

---



## 25. Manage Rosters — product surface


| Route             | Resource key     | Role                                                               |
| ----------------- | ---------------- | ------------------------------------------------------------------ |
| `/manage-rosters` | `manage-rosters` | Master list + detail editor for hospital roster groups (team/ward) |


**Permission:** dedicated Auth User Group resource `manage-rosters` (display name **Manage Rosters**).  
Keep this separate from `shift-roster` (operational scheduling) so HR can maintain the roster master without publish rights.

**Activity keys (planned):**


| Action     | Key                      |
| ---------- | ------------------------ |
| Page visit | `manage-rosters.visited` |
| Create     | `manage-rosters.created` |
| Update     | `manage-rosters.updated` |
| Delete     | `manage-rosters.deleted` |


---



## 26. Manage Rosters ↔ Roster & Shifts (mechanism)

Two different “roster codes” exist. Do **not** conflate them.


| Code                  | Owner                         | Example | Meaning                                                               |
| --------------------- | ----------------------------- | ------- | --------------------------------------------------------------------- |
| **Roster group code** | **Manage Rosters** (HR Admin) | `CHN`   | Stable business key for a team/ward roster (CHANNEL)                  |
| **Period code**       | Roster & Shifts `ShiftRoster` | `SR-1`  | Auto ID for one scheduling period (dept + unit + roster + date range) |




### How they connect

```
Staff.employment.roster  ──►  "CHN" (membership key)
                │
                ▼
     Manage Rosters master (name, code, department, max shifts/day)
                │
                ▼
ShiftRoster period (code = SR-n) + RosterAllocation cells
  department + unit + roster snapshot + from/to
```


| Layer                        | Role                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| **Manage Rosters**           | Defines the catalog: CHANNEL / `CHN`, linked department, shifts-per-person-per-day rule    |
| **Staff Employment**         | Assigns a staff member to a roster group (today free-text / placeholder options)           |
| **Shift Roster / Duty / OT** | Filters and snapshots the roster **string**; builds `ShiftRoster` periods with auto `SR-n` |




### Locked product decisions


| Topic                     | Decision                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Workspace pattern         | **Master–detail**, same family as Designations / Staff Grade                                               |
| Roster code (`CHN`)       | **Human-entered** short unique key (uppercase); **not** `generateRecordCode('SR')`                         |
| Period codes (`SR-n`)     | Stay owned by Roster & Shifts; never reused here                                                           |
| Department                | `CustomSelectField` (placeholder options until Department master exists)                                   |
| Shifts per person per day | Required positive integer; scheduling rule for later Roster & Shifts enforcement                           |
| Actions                   | Cancel / Delete / Save at the **bottom of the detail form**                                                |
| Summary cards             | Informational (active shifts / linked dept / assigned staff) — sample or derived counts; full wiring later |
| Integrations              | **Deferred** — do not change Staff Employment or Roster & Shifts filters in this build                     |
| Snapshot strategy (later) | Prefer storing master **code** (`CHN`) on staff/allocations; show name in UI                               |


See also: `ROSTER_SHIFTS_MANAGER_GUIDE.md` — Staff roster field is a string today; no Roster master FK in Roster v1.

---



## 27. Manage Rosters domain model



### Prisma `ManageRoster`


| Field                     | Rule                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `code`                    | Unique short roster code (e.g. `CHN`) — HR-entered, normalized uppercase (not auto `SR-n`) |
| `name`                    | Required unique display name (e.g. *CHANNEL*)                                              |
| `departmentId`            | Selector value (placeholder enum/options until Department master)                          |
| `shiftsPerPersonPerDay`   | Integer ≥ 1                                                                                |
| `createdAt` / `updatedAt` | Audit timestamps                                                                           |
| `createdBy` / `updatedBy` | Auth User ObjectIds via `resolveAuthUsers`                                                 |


Derived (UI / later queries, not stored on the model):


| Display                 | Source (later)                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| Assigned staff count    | Count Staff where `employment.roster` matches `code` (returns `0` until R6) |
| Linked department label | Resolve `departmentId` → name                                               |
| Active shifts           | Count of active shift types (returns `0` until R7)                          |


---



## 28. Manage Rosters UI map — master–detail

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Manage Rosters                                                            │
│ Master list of hospital rosters — one roster per team/ward, mapped to a   │
│ department.                                                               │
└───────────────────────────────────────────────────────────────────────────┘

┌─ ~35% Rosters ──────────────┐  ┌─ ~65% Roster Details ────────────────────┐
│ Search                      │  │ Name *              [ CHANNEL ]         │
│ ┌─────────────────────────┐ │  │ Department *        [ Channel ▼ ]       │
│ │ ACCOUNTS · 10 staff     │ │  │ Shifts / person / day * [ 3 ]           │
│ │ CHANNEL · 32 staff (sel)│ │  │ Roster code         [ CHN ]             │
│ │ ADMINISTRATION · 29 …   │ │  │ ┌ Active shifts ┐ ┌ Linked dept ┐ …    │
│ └─────────────────────────┘ │  │ [ Cancel ] [ Delete ]         [ Save ]  │
│                             │  │ Created by … · Last updated …           │
└─────────────────────────────┘  └─────────────────────────────────────────┘
```



### UX rules


| Rule          | Detail                                                              |
| ------------- | ------------------------------------------------------------------- |
| Selection     | Click list row → load detail form                                   |
| Add           | Clears form, highlights detail, focuses name; no persist until Save |
| Department    | `CustomSelectField` only                                            |
| Roster code   | Editable short code; unique; normalize to uppercase on save         |
| Summary cards | Show sample/derived stats under the form fields                     |
| Save / Delete | Bottom of detail form (confirm on delete)                           |
| Form stack    | **Formik + Yup** client; **Zod** in service                         |




### File layout

```
apps/hrm/
  app/(dashboard)/(hr-admin)/manage-rosters/
    page.tsx
    manage-roster-workspace.tsx
    manage-roster-ui-context.tsx
    section-manage-roster-list.tsx
    section-manage-roster-detail.tsx

  app/actions/hr-admin-actions/
    manage-roster.actions.ts

  services/hr-admin-services/
    manage-roster.service.ts

  lib/mappers/
    manage-roster-form.mapper.ts

  types/
    manage-roster.ts
```

---



## 29. Manage Rosters development phases


| Phase                                           | Deliverable                                                                 | Status          |
| ----------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| **R0 — Doc & types**                            | This guide; code vs `SR-n` clarity; UI types                                | Done            |
| **R1 — UI shell**                               | Route, sidebar, breadcrumbs, workspace                                      | Done            |
| **R2 — Interactive detail form**                | Search, Add highlight, department select, Save/Delete, summary cards, audit | Done            |
| **R3 — Schema & service**                       | Prisma `ManageRoster`, Zod CRUD, unique name + unique code                  | Done            |
| **R4 — Actions**                                | Permissions, activity log, revalidate                                       | Done            |
| **R5 — Wire CRUD**                              | Live list + mutations; sample data removed                                  | Done            |
| **R6 — Staff integration (deferred)**           | Staff Employment roster select from this master                             | Later — see §32 |
| **R7 — Roster & Shifts integration (deferred)** | Filters/options + enforce shifts-per-person; keep `SR-n` for periods        | Later — see §32 |


**R0–R5** shipped. R6/R7 wait for the **cross-manager integration wave** after remaining HR Admin masters (§31). Prefer shipping **Departments** first so Manage Rosters can drop its department placeholder enum.

---



## 30. Manage Rosters testing checklist (manual)

- [ ] Register shows roster name + staff count (staff count `0` until R6)
- [ ] Search filters by name or roster code
- [ ] Add highlights the detail panel and focuses the form
- [ ] Department renders as a `CustomSelectField`
- [ ] Roster code is editable, unique, and uppercased on save
- [ ] Duplicate name or code shows a field error
- [ ] Summary cards render under the fields
- [ ] Save / Cancel / Delete buttons appear at the bottom of the detail form
- [ ] Delete is disabled for new records
- [ ] Create / update / delete persist after refresh

---



## 31. Remaining HR Admin modules (backlog)

Track here until each module gets its own detailed sections (same pattern as Holiday / Designation / Grade / Roster).  
**Do not add sidebar links until CRUD ships.** Prefer master–detail under `(hr-admin)/`, one Auth resource per screen.

### Suggested build order


| Priority | Module (working name) | Likely route           | Likely resource       | Why next                                                                       |
| -------- | --------------------- | ---------------------- | --------------------- | ------------------------------------------------------------------------------ |
| **P1**   | **Departments**       | `/departments`         | `departments`         | Unblocks Manage Rosters `departmentId`, Staff Employment, Roster filters       |
| **P2**   | **Units / Wards**     | `/units` (TBD)         | `units` (TBD)         | Roster & Shifts filters/snapshots; confirm if nested under Department          |
| **P3**   | **Institutions**      | `/institutions` (TBD)  | `institutions` (TBD)  | Staff Employment still uses `INSTITUTION_OPTIONS` placeholder                  |
| **P4**   | **Salary Cycle**      | `/salary-cycles` (TBD) | `salary-cycles` (TBD) | Overnight / payroll-adjacent Roster columns; payroll prep                      |
| **P5**   | **Salary Structures** | `/salary-structures`   | `salary-structures`   | Already named in permission map; payroll prep                                  |
| **—**    | **Manage Shifts**     | `/manage-shifts` (TBD) | `manage-shifts` (TBD) | **Not in current build wave** — see §34 (Shift Types already covers templates) |


> **Positions:** `/positions` appears in the legacy permission map. Prefer treating **Designations** as the job-title master unless product requires a separate Positions screen.  
> **Manage Shifts:** Do **not** add a sidebar link or start CRUD until product explicitly chooses Option A/B/C in §34. Default for the current system: **keep Shift Types**; skip HR Admin Manage Shifts.



### Placeholder sources to replace later


| Consumer         | Placeholder file / pattern                                                           | Replace with                                            |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Staff Employment | `types/staff-employment-options.ts` (`DEPARTMENT_OPTIONS`, `INSTITUTION_OPTIONS`, …) | Live masters                                            |
| Staff Employment | Same file (`STAFF_DESIGNATION_OPTIONS`, `STAFF_GRADE_OPTIONS`, `ROSTER_OPTIONS`)     | Designation / Staff Grade / Manage Roster masters (§32) |
| Manage Rosters   | `MANAGE_ROSTER_DEPARTMENTS` in `types/manage-roster.ts`                              | Departments master                                      |
| Roster & Shifts  | Filter option loaders / snapshot strings                                             | Departments, Units, Designations, Rosters, Grades       |




### Per-module checklist (copy when starting a new master)

- [ ] Guide section drafted (product surface, domain, UI map, phases)
- [ ] Types + sample data (UI-first)
- [ ] Route + sidebar + breadcrumbs + permission resource
- [ ] Master–detail Formik/Yup UI (actions at bottom of detail)
- [ ] Prisma model + Zod service + unique guards / codes
- [ ] Server actions (permissions, activity log, revalidate)
- [ ] Wire live CRUD; remove sample data
- [ ] Leave Staff/Roster integration for §32 unless explicitly in-scope

---



## 32. Cross-manager integration backlog (deferred)

**Gate:** Prefer completing P1–P3 (or the subset product locks for this wave) before a broad integration pass. Holiday Calendar already feeds Public Holiday Shifts; other masters do not yet replace Staff/Roster placeholders.

### Staff Manager (`/staff` — Employment tab)


| ID         | Work                                                                           | Depends on        | Status        |
| ---------- | ------------------------------------------------------------------------------ | ----------------- | ------------- |
| **INT-S1** | Designation select from `Designation` master (store code or id consistently)   | Designations      | Deferred (D6) |
| **INT-S2** | Staff grade select from `StaffGrade` master                                    | Staff Grades      | Deferred (G6) |
| **INT-S3** | Roster select from `ManageRoster` master (store business **code**, e.g. `CHN`) | Manage Rosters    | Deferred (R6) |
| **INT-S4** | Department select from Departments master                                      | Departments (P1)  | Blocked       |
| **INT-S5** | Institution select from Institutions master                                    | Institutions (P3) | Blocked       |
| **INT-S6** | Remove obsolete entries from `staff-employment-options.ts` once live           | INT-S1–S5         | Deferred      |




### Roster & Shifts


| ID         | Work                                                                                                                                         | Depends on                   | Status              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------- |
| **INT-R1** | Designation filters / snapshots use Designation master                                                                                       | Designations                 | Deferred (D7)       |
| **INT-R2** | Staff grade filters use Staff Grade master                                                                                                   | Staff Grades                 | Deferred (G7)       |
| **INT-R3** | Roster filters/options use Manage Roster codes (`CHN`); keep `SR-n` for period IDs only                                                      | Manage Rosters               | Deferred (R7)       |
| **INT-R4** | Enforce Manage Roster `shiftsPerPersonPerDay` where scheduling rules apply                                                                   | Manage Rosters + R7          | Deferred            |
| **INT-R5** | Department / Unit filters and snapshots from masters                                                                                         | Departments (P1), Units (P2) | Blocked             |
| **INT-R6** | Manage Rosters summary: assigned staff count (match `employment.roster` → code)                                                              | INT-S3                       | Deferred            |
| **INT-R7** | Manage Rosters summary: active shift **template** count (from `ShiftType` today; roster-scoped only if Manage Shifts / Option A ships — §34) | Optional                     | Deferred            |
| **INT-R8** | Confirm Holiday Calendar ownership notes in Roster guide (stub language is outdated)                                                         | Holiday Calendar             | Docs follow-up      |
| **INT-R9** | If Manage Shifts ships: wire Roster & Shifts to one shift master (deprecate dual editors)                                                    | §34 Option A/B               | Not started / gated |




### Leave / other


| ID         | Work                                                                    | Depends on                | Status   |
| ---------- | ----------------------------------------------------------------------- | ------------------------- | -------- |
| **INT-L1** | Leave day counting skips `HolidayCalendar` dates where product requires | Holiday Calendar          | Deferred |
| **INT-P1** | Payroll / PH allowance consumes holiday + salary masters                | Salary Cycle / Structures | Future   |




### Integration wave checklist

- [ ] Product confirms which §31 masters are in-scope for the wave
- [ ] Staff Employment options loaded from live list actions (not static arrays)
- [ ] Stored keys documented (code vs ObjectId) per field
- [ ] Roster filter option loaders updated
- [ ] Derived counts on Manage Rosters verified
- [ ] Placeholder constants deleted or reduced to non-master enums only
- [ ] Manual QA on Staff create/edit + one Roster filter screen

---



## 33. Recommended next steps

1. **Manual QA** shipped modules (Holiday, Designation, Staff Grade, Manage Rosters) if not already signed off.
2. **Start P1 — Departments:** document in this guide → UI-first → CRUD (same shell as Designations).
3. **Clarify P2 Units** with product (separate master vs children of Department).
4. Continue **P3–P5** as needed for payroll / institution scope.
5. **Do not** start Manage Shifts unless product locks §34 Option A or B; default is keep **Shift Types**.
6. Only then run **§32 integration wave** (batch Staff Employment + Roster filters together).

---



## 34. Manage Shifts — product decision (deferred)

Legacy / product mocks show **Manage Shifts** under HR Administration (roster dropdown → list of templates → detail with day type, leave hours, previous/next shift, flags).  
That screen is **not required for the current HRM system to function.**

### Current system (locked for now)


| Concern                                                                        | Owner today                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Shift **templates** (name, start/end, duration, night/overnight/holiday flags) | **Roster & Shifts → Shift Types** (`ShiftType`, `/shift-types`, codes `SHF-n`) |
| Roster **groups** (CHANNEL / `CHN`)                                            | **HR Admin → Manage Rosters**                                                  |
| Putting templates on staff × dates                                             | Shift Roster, Duty, Amendments, Night/Overnight/PH (all use `shiftTypeId`)     |
| Standing staff ↔ shift rule                                                    | Shift Assignment                                                               |


Operational chain already works:

```
ShiftType  →  StaffShiftAssignment / RosterAllocation  →  grids & registers
ManageRoster (group) is separate; period codes remain SR-n on ShiftRoster
```



### Layer map (mock vs current)

```
HR Administration                         Roster & Shifts
─────────────────                         ────────────────
Manage Rosters (groups)                   Shift Types ← current template master
Manage Shifts (mock only) ──optional──►   (or extended ShiftType)
Staff membership / employment             Shift Assignment
                                          Shift Roster / Duty / Amendments
                                          Night / Overnight / PH registers
```


| Layer                    | Owns                         | Example                            |
| ------------------------ | ---------------------------- | ---------------------------------- |
| Manage Rosters           | Roster *groups*              | ACCOUNTS / CHANNEL → `CHN`         |
| Manage Shifts (if built) | Shift *templates per roster* | For ACCOUNTS: `8.30-5`, `DO`, `PH` |
| Shift Types (today)      | Hospital-wide templates      | `SHF-1` Day 08:00–16:00            |
| Roster & Shifts ops      | Staff × date allocations     | Cell uses a template id            |




### When HR Admin Manage Shifts *would* be justified

Ship (or replace Shift Types) only if product locks **all or most** of:

1. Templates are **scoped per roster group** (ACCOUNTS catalog ≠ CHANNEL catalog).
2. **HR** owns the catalog with a separate permission from `shift-roster` publish/allocate.
3. Fields beyond current `ShiftType`: day type (Normal / DO / PH), leave hour full/half, previous/next shift, First / Last / Half / Hide flags — as **master data**.



### When *not* to add it

- One hospital-wide shift list is enough.
- Extra rules can wait, or can be added as fields on existing `ShiftType`.
- Avoid **two editors** for the same concept (Manage Shifts + `/shift-types`).

**Default decision:** skip Manage Shifts in the HR Admin build wave; keep **Shift Types**; prefer **P1 Departments** next.

### If product later chooses to proceed — options (pick one)


| Option                         | Approach                                                       | Roster & Shifts impact                                                                                     |
| ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **A. Extend** `ShiftType`      | Add optional roster link + mock fields; keep `shiftTypeId` FKs | Light: option loaders may filter by roster; `/shift-types` may stay or become thinner                      |
| **B. New Manage Shifts model** | New collection under HR Admin; migrate FKs                     | Heavier: Assignment / Duty / Shift Roster / Amendments / Night / Overnight / PH option sources + migration |
| **C. Two masters**             | Both screens write templates                                   | **Avoid** — drift risk                                                                                     |


Prefer **A or B, never C**.

### Roster & Shifts follow-up *only if* A or B ships


| Area                       | Change                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Shift Types**            | Largest: deprecate CRUD, read-only, or redirect to HR Admin (if B); or extend form (if A)   |
| **Shift Assignment**       | Shift options scoped to staff’s roster group when roster-scoped catalogs exist              |
| **Shift Roster / Duty**    | Allocate / filter options from the same master; validate template allowed for period roster |
| **Amendments**             | Amended shift must be in the allowed catalog                                                |
| **Night / Overnight / PH** | Map day-type / flags to existing night/overnight/holidayEligible rules                      |
| **Shared helper**          | e.g. `getShiftOptionsForRoster(rosterCode)` for all consumers                               |
| **Delete guard**           | Block delete when allocations/assignments reference the template                            |
| **Docs / sidebar**         | One shift-master story in both guides                                                       |


**Until then:** no Roster & Shifts refactor is required for Manage Shifts; continue using global `ShiftType`.

### Mock field cheat-sheet (for a future spec)


| Mock field                    | Role                                | Today on `ShiftType`?                                      |
| ----------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Roster filter                 | Scope catalog to Manage Rosters row | No (global)                                                |
| Name / start / end / duration | Timing                              | Yes (similar)                                              |
| Day type                      | Normal / DO / PH-style              | Partial (`holidayEligible` + category; not DO/PH day type) |
| Leave hour full / half        | Leave calculations                  | No                                                         |
| Previous / next shift         | Rotation chain                      | No                                                         |
| First / Last / Half / Hide    | Sequencing + UI visibility          | No                                                         |
| Night / Overnight flags       | Registers                           | Yes (`isNightShift`, `isOvernight`)                        |


---

*Last updated: Aug 2026 — Manage Shifts deferred (§34); Shift Types remains the current template master; remaining HR Admin backlog §31–33 unchanged in priority (P1 Departments next).*