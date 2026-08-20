# HR Administration — Development Guide

Guidance for building **HR Administration** features in `apps/hrm`.  
Use with:

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — layered architecture, checklists
- `apps/hrm/docs/PERMISSION_FLOW.md` — Auth User Group grants
- `apps/hrm/docs/ROSTER_SHIFTS_MANAGER_GUIDE.md` — downstream consumer of `HolidayCalendar`
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — future holiday-aware leave day counting

**Status:** HR Administration sidebar group and modules are **not built yet**.  
**First module:** **Holiday Calendar** (`/holiday-calendar`).  
**Build path:** Types/Zod → Service → Actions → master–detail UI → wire downstream reads.

This document covers **Holiday Calendar only**. Other HR Administration modules (Designations, Staff Grade, Salary Cycle, Manage Rosters, etc.) will be documented here as they are scoped.

---

## 1. HR Administration (group overview)

HR Administration is the **master-data and configuration** area for hospital HR operations. It sits alongside existing sidebar groups (Administration, Leave Management, Overtime Management, Roster & Shifts) and owns reference data that other modules consume.

| Concern | Owner | Notes |
|---------|-------|-------|
| Holiday dates & types | **Holiday Calendar** (this doc) | Source of truth for PH / Poya / Mercantile days |
| Shift templates for holidays | Roster & Shifts (`ShiftType.holidayEligible`) | Consumes holiday dates; does not define them |
| PH duty allocations | Roster & Shifts (`/public-holiday-shifts`) | Joins `RosterAllocation` → `HolidayCalendar` |
| Leave day counting | Leave (`/leave-application`) | Future: skip holidays when computing `days` |
| Payroll PH allowance | External / future | Flags and allowances on allocations today; no payroll engine in v1 |

**Sidebar (planned):** collapsible group **HR Administration** with **Holiday Calendar** as the first link. Additional links will be added module-by-module — do not pre-populate the sidebar with unbuilt routes.

---

## 2. Holiday Calendar — product surface

| Route | Resource key (planned) | Role |
|-------|------------------------|------|
| `/holiday-calendar` | `holiday-calendar` | Master list + detail editor for institutional holidays |

**Permission:** dedicated Auth User Group resource `holiday-calendar` (display name **Holiday Calendar**).  
Unlike Roster & Shifts (one resource for the whole group), HR Administration modules get **one resource per screen** so HR Officers can manage holidays without roster publish rights.

**Activity keys (planned):**

| Action | Key |
|--------|-----|
| Page visit | `holiday-calendar.visited` |
| Create | `holiday-calendar.created` |
| Update | `holiday-calendar.updated` |
| Delete | `holiday-calendar.deleted` |

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

| Field | Rule |
|-------|------|
| `code` | Auto-generated via `generateRecordCode('HOL')` → `HOL-1`, `HOL-2`, … (`HOLIDAY_CALENDAR_CODE_PREFIX` in `types/roster.ts`) |
| `name` | Display name (e.g. *Nikini Full Moon Poya Day*, *Christmas Day*) |
| `typeId` | One of `poya`, `mercantile`, `public` (`HOLIDAY_TYPES` in `types/roster.ts`) |
| `date` | **Calendar date** (store as UTC midnight or normalized local date — match existing roster date helpers) |
| `allocations` | Reverse relation: `RosterAllocation.holidayId` → this record |

### Locked product decisions

| Topic | Decision |
|-------|----------|
| One holiday per calendar day | Enforced by `@@unique([date])` — editing date must check no other row owns that day |
| Holiday types | Fixed enum v1: **Poya**, **Mercantile**, **Public** — no free-text type |
| Ownership | **HR Administration** owns CRUD; Roster modules **read only** |
| Delete | **Block** when `allocations` count > 0; show count in error message |
| Date change | Allowed when no duplicate; allocations keep `holidayId` FK — duty date on allocation remains authoritative for the cell |
| Default PH shift template | **Not** stored on `HolidayCalendar` in v1 — document in Impact panel; wire via Shift Types (`holidayEligible`) + Public Holiday Shifts |
| Payroll / leave side effects | **None** in v1 CRUD — Impact panel is informational until Leave and Payroll integrations land |

### Audit fields

`createdBy` / `updatedBy` are Auth User ObjectIds — **no** cross-DB Prisma relation. Resolve display names via `resolveAuthUsers` (same pattern as Staff, Shift Types, Leave).

---

## 4. Holiday types

Defined in `apps/hrm/types/roster.ts`:

```ts
export const HOLIDAY_TYPES = ['poya', 'mercantile', 'public'] as const;
```

| `typeId` | UI label | Typical use (Sri Lanka) |
|----------|----------|-------------------------|
| `poya` | Poya | Full-moon Buddhist holidays |
| `mercantile` | Mercantile | Shop and office closure days |
| `public` | Public | National / institutional public holidays |

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

| Param | Purpose |
|-------|---------|
| `year` | Default current year; drives list and mini-calendar month |
| `search` | Case-insensitive match on `name` or `code` |
| `typeId` | Filter by holiday type |
| `page` / `limit` | Optional pagination if list grows large; master–detail may load full year without pagination in v1 |

Sort default: **`date` ascending** within the selected year.

---

## 6. Downstream impact (documented, wired later)

The detail panel **Impact** box explains cross-module behaviour. v1 stores holidays only; integrations are phased.

| Area | Current behaviour | After Holiday Calendar CRUD |
|------|-------------------|------------------------------|
| **Public Holiday Shifts** | Reads `holidayCalendar.findMany` for filters/forms | Same reads; options populated from HR-maintained data |
| **Shift Types** | `holidayEligible` flag on master | Unchanged; HR configures which templates apply on PH |
| **Overtime (Day Off / PH Shift)** | Uses PH concept | Consumes same holiday dates when wired |
| **Leave application days** | `computeLeaveApplicationDays` counts inclusive calendar days only | **Future:** subtract days that fall on `HolidayCalendar` (and optionally weekends per policy) |
| **Payroll PH allowance** | `holidayAllowance` + `sendToPayroll` flags on allocations | **Future:** payroll export reads allocation + holiday metadata |

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

| Rule | Detail |
|------|--------|
| Selection | Click list row → load detail form (client state or URL `?id=` for deep link) |
| Add | Clears detail form; sets date from mini-calendar or today; does not save until Save |
| Delete | Requires selected row; confirm dialog; disabled when allocations exist |
| Save | Create or update via server action; toast; refresh list; keep selection |
| Mini calendar | Highlights selected `date`; clicking a day updates HOLIDAY DATE field |
| Year control | Filters left list; calendar opens on selected holiday month or current month |
| Form stack | **Formik + Yup** client-side; **Zod** in service (HRM standard) |

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

| Action | Permission | Service call |
|--------|------------|--------------|
| `getHolidayCalendarListAction` | view | List by year + filters |
| `getHolidayCalendarByIdAction` | view | Single record + audit users |
| `createHolidayCalendarAction` | add | Create |
| `updateHolidayCalendarAction` | edit | Update |
| `deleteHolidayCalendarAction` | delete | Delete with allocation guard |
| `getHolidayCalendarFormOptionsAction` | view | Type dropdown options |

Each mutation: `revalidatePath('/holiday-calendar')`, `logActivityNonBlocking`, strip audit fields from client payload in the action layer.

### Refactor note (Roster)

After Holiday Calendar service is live, update `public-holiday-shift.service.ts` to import shared holiday type labels (and optionally a thin `listHolidaysForOptions()` helper) instead of duplicating `HOLIDAY_TYPE_LABELS`. **Do not** move CRUD into the roster service — keep reads only there.

---

## 10. Development phases

| Phase | Deliverable |
|-------|-------------|
| **H0 — Doc & types** | This guide; confirm types/constants; shared holiday-type helper |
| **H1 — Service** | Zod schemas, CRUD, unique-date guard, delete guard, code generation |
| **H2 — Actions** | Permissions, activity log, revalidate |
| **H3 — UI shell** | Route, sidebar group, workspace layout, empty list/detail |
| **H4 — Wire CRUD** | List search/year, detail form, Save, Add, Delete, audit footer |
| **H5 — Calendar widget** | Mini calendar synced with date field |
| **H6 — Roster integration** | Public Holiday Shifts reads from maintained data; smoke test PH shift create |
| **H7 — Leave (future)** | Holiday-aware `computeLeaveApplicationDays` |
| **H8 — Import (future)** | Bulk seed for a year (CSV or admin import for Poya/Mercantile lists) |

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

*Last updated: Aug 2026 — Holiday Calendar module only.*
