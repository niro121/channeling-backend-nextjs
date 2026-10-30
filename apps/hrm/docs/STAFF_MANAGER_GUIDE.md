# Staff Manager — Product & Development Guide

Guidance for the **Staff** module in `apps/hrm` (`app/(dashboard)/staff`).  
Use with:

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — layered architecture; Staff is the reference list + tabbed CRUD
- `apps/hrm/docs/PERMISSION_FLOW.md` — Auth User Group grants (`staff`)
- `apps/hrm/docs/STAFF_ATTENDANCE_ARCHITECTURE.md` — Finger Print / RFID ↔ punch ingest
- `apps/hrm/docs/STATUTORY_COMPLIANCE_GUIDE.md` — EPF / ETF numbers ↔ payroll / Statutory
- `apps/hrm/docs/HR_ADMINISTRATION_GUIDE.md` — Zones, Specialities, Manage Rosters, and other masters Staff consumes
- `apps/hrm/docs/ROSTER_SHIFTS_MANAGER_GUIDE.md` — day-by-day shift assignment (uses Staff roster group membership)
- `apps/hrm/docs/RECRUITMENT_MANAGER_GUIDE.md` — Appointment Letter → Staff onboard handoff

**Status:** Staff list + General / HR Detail / Employment / Additional Details tabs are live. Channeling sync (create / update / delete / bulk) follows the three-choice dialog pattern where linkage exists (`migrateSourceId`).  
**Pages must not call Prisma.** Business rules live in `services/staff-services/`.

---

## 1. Product surfaces

| Route | Resource | Role |
|-------|----------|------|
| `/staff` | `staff` | Register (`CommonDataTable`, keyword + status filter, export, bulk delete, Channeling sync) |
| `/staff/add` | `staff` | Create (General tab first; Channeling sync dialog on save) |
| `/staff/[id]/edit` | `staff` | Edit all tabs |

**Tabs:** General · HR Details · Employment · Additional Details.

**Codes:**

| Field | Source | Notes |
|-------|--------|-------|
| Staff Code | `generateRecordCode('ST')` → `ST-n` | Root `Staff.code` (unique) |
| Staff Code (Legacy) | `ST-LG-n` | `hrDetails.staffCodeLegacy`; auto; form field disabled |

Prefixes: `STAFF_CODE_PREFIX` / `STAFF_LEGACY_CODE_PREFIX` in `types/staff.ts`.

---

## 2. Locked product decisions (identity & employment reference)

| # | Decision |
|---|----------|
| 1 | **Finger Print / RFID** is a free-text device user ID (`hrDetails.fingerPrintRfid` + denormalized `Staff.fingerPrintRfid`). Unique among **active** staff. Exact string the reader gateway posts as `rfid`. Scan-from-reader on the form is deferred — see Attendance architecture §4.3. |
| 2 | **Zone Code** stores the zone **code** string (not ObjectId), from published Zone master options. |
| 3 | **Specialities** multi-select stores master **ObjectIds** in `hrDetails.specialityIds`. Options from `/staff-specialities` via `getStaffSpecialityOptionsAction` (`staff` view). Default **active only** (`status === 1`); edit includes already-selected inactive ids so labels still resolve. |
| 4 | **EPF Number** / **ETF Number** are optional membership IDs on `hrDetails`. Unique among **active** staff when non-blank (same pattern as RFID). They do **not** drive contribution % — see Statutory guide. |
| 5 | **Internal sequences** for people are **Staff Code** and **Staff Code (Legacy)** only. Do not invent a second auto-sequence for Registration Number. |
| 6 | **Registration Number** stays a plain optional text field until Ruhunu HR locks its meaning (see §4 open checklist). |
| 7 | Channeling linkage uses `migrateSourceId`. **Create / update / delete** use `ChannelingSyncAlertDialog` (Cancel = discard; HRM only; Continue = sync). Same pattern as Organizations. Create always prompts. Update prompts when Channeling-related fields change or the record is unlinked. |

---

## 3. General tab — field map (high level)

### 3.1 Personal Information (selected)

| UI field | Storage | Notes |
|----------|---------|-------|
| Zone Code | `hrDetails.zoneCode` | Combobox of published zones; option `id` = zone code |
| Finger Print / RFID | `hrDetails.fingerPrintRfid` + root `fingerPrintRfid` | Trim; unique among active |

### 3.1b Specialities (Employment Reference)

| UI field | Storage | Options source |
|----------|---------|----------------|
| Specialities | `hrDetails.specialityIds: string[]` | `getStaffSpecialityOptions` — active (`status: 1`) from `StaffSpeciality`; display `Name (SSP-n)`; edit passes `includeIds` for current selection |

### 3.2 Employment Reference

| UI field | Storage | Sequence? | Uniqueness (active staff) |
|----------|---------|-----------|---------------------------|
| Staff Code (Legacy) | `hrDetails.staffCodeLegacy` | Auto `ST-LG-n` | By generation |
| EPF Number | `hrDetails.epfNumber` | **No** | **Yes** (non-blank) |
| ETF Number | `hrDetails.etfNumber` | **No** | **Yes** (non-blank) |
| Registration Number | `hrDetails.registrationNumber` | **No** — keep no sequence | **Open** — see §4 |
| Date Joined / Resigned / Retired | root + `hrDetails` dates | — | — |

Uniqueness for RFID / EPF / ETF is enforced in `staff.service.ts` (application assert; blank allowed; among `status === 1`). Schema `@unique` is not used for these (would conflict with “active only” + embedded fields) — see Statutory / Attendance notes.

---

## 4. Open checklist / TODO

### Registration Number — product lock

**Keep no sequence.** Decide uniqueness only after you lock what **Registration Number** means in Ruhunu HR (**council ID** vs **free note**). Until that is locked, leaving it as a plain optional field is consistent with the current structure.

- [ ] Confirm with Ruhunu HR / product: is Registration Number a professional council / board ID (e.g. SLMC, nursing council), or a free-form HR note?
- [ ] If **council / board ID** → enforce unique among active staff (same trim + assert pattern as EPF/ETF); document in §2 locked decisions; update this checklist to Done.
- [ ] If **free note** → leave non-unique; optionally clarify placeholder / help text on the General form.
- [ ] Do **not** auto-generate or sequence Registration Number (Staff Code / Legacy already own internal sequencing).
- [ ] After lock: update this guide §2 / §3.2 and mention any payroll or Statutory consumer (none today).

### Other Staff follow-ups (non-blocking)

- [ ] Staff form RFID **scan-from-reader** — after device / gateway setup (`STAFF_ATTENDANCE_ARCHITECTURE.md` §4.3)
- [ ] Optional Mongo partial unique indexes for active-staff EPF/ETF/RFID (belt-and-braces under existing app checks)

### Post-review hardening — Employment ↔ roster / shifts (required)

Cross-module IDs live in `HR_ADMINISTRATION_GUIDE.md` §32 (**INT-H***). Staff-owned items:

| ID | Work | Priority |
|----|------|----------|
| **INT-H1** | **Server-side** Employment roster lock: `updateStaffEmployment` must reject changing `employment.roster` when any `StaffShiftAssignment` exists for that staff (mirror UI in `form-employment.tsx`) | Must |
| **INT-H4** | Align Institution / Working Department soft warn with Change Staff: server returns soft warnings + require client ack (today warn is UI-only on Employment) | Should |
| **INT-H6** | Case-insensitive `employment.roster` matching everywhere membership / counts resolve a Manage Roster code | Should |

Related (owned elsewhere, affects Employment UX):

- [ ] **INT-H2** — Shift Assignment create/bulk/update assert staff membership = selected Manage Roster code (`ROSTER_SHIFTS_MANAGER_GUIDE.md` §1.1)
- [ ] **INT-H3** — Legacy null `manageRosterId` included in Manage Rosters in-use + backfill (`HR_ADMINISTRATION_GUIDE.md` §29 / §32)

See §7 for required Employment UI behaviour.

---

## 5. List, filters, export, delete

| Concern | Behaviour |
|---------|-----------|
| Table | `CommonDataTable` (same pattern as Users / User Groups) |
| Filters | Keyword + status (`1` Published / `0` Unpublished); shared `buildStaffWhere` for list + export |
| Export | `getStaffForExport` — all matching rows (no 1,000 cap); `{ success, data, totalRecords }` |
| Create / General update | `ChannelingSyncAlertDialog`: Cancel · Save/Update HRM only · Continue (create/update Channeling) |
| HR Detail update | Same three choices when Channeling fields changed or record unlinked |
| Single delete | `ChannelingSyncAlertDialog`: Cancel · Delete HRM only · Continue (both if `migrateSourceId`) |
| Bulk delete | Same three choices when `getChannelingBulkDeleteDialog` is set; sync only if `syncToChanneling: true` |

---

## 6. File map

| Concern | Location |
|---------|----------|
| List page | `app/(dashboard)/staff/page.tsx` |
| Filter | `app/(dashboard)/staff/filter-section.tsx` |
| Tabs | `app/(dashboard)/staff/tab-layout.tsx` |
| General form | `app/(dashboard)/staff/form-general.tsx` |
| Row actions | `app/(dashboard)/staff/record-actions.tsx` |
| Actions | `app/actions/staff-actions/staff.actions.ts` |
| Service (CRUD + uniqueness) | `services/staff-services/staff.service.ts` |
| Channeling push | `services/staff-services/staff-channeling-push.service.ts` |
| Types / prefixes | `types/staff.ts` |
| HR details mapper | `lib/mappers/staff-hr-details.mapper.ts` |
| Channeling dialog copy | `lib/helpers/staff-channeling-dialog.helper.ts` |
| Speciality options (active) | `getStaffSpecialityOptionsAction` → `staff-speciality.service.ts` |
| Prisma | `Staff` + `StaffHrDetails` in `prisma/schema.prisma`; master `StaffSpeciality` |

---

## 7. Roster group vs shift assignment (simple)

**Manage Rosters** (HR Admin) is **not** a shift template. It defines a **roster group** (team/ward): department, business code (e.g. `CHN`), and how many shifts per person per day.

**Shift Types** (Roster & Shifts) are the actual shift templates (Morning, Night, etc.).

**Staff Employment** sets roster **membership** (`employment.roster` = Manage Roster **code**). **Shift Assignment** (Roster & Shifts) holds standing shift-type links for that person. Day-by-day duty rows still belong in Roster & Shifts calendars.

In short: group rules in HR Admin → membership on Staff → standing shifts in Shift Assignment → day duties in Roster & Shifts.

### Employment form behaviour (required)

| Control | Required behaviour |
|---------|-------------------|
| Roster group | Editable while the staff has **no** `StaffShiftAssignment` rows. Once **any** standing assignment exists (any status), membership is **read-only** — change or remove assignments in Shift Assignment first. |
| Standing shift assignments | Read-only table (code, shift type, roster, effective dates, status) + link to `/shift-assignment`. Do **not** edit **Default Shift** here; legacy `employment.shift` may still persist from older data on save. |
| Institution / Working department | Remain editable. Soft-warn on save (and inline when dirty) if standing assignments exist — changing org fields does **not** move assignments or clear a locked roster. |
| Dept change while roster locked | Do **not** auto-clear `employment.roster` when working department changes. |
| Change Staff vs Employment | Working department transfers with history belong on **Change Staff**; Employment mirrors the same soft-warn pattern for standing assignments. Roster membership is Employment-only. |

### Enforcement status

| Rule | UI | Server |
|------|----|--------|
| Lock roster when assignments exist | **Done** (`form-employment.tsx`) | **TODO INT-H1** — must reject in `updateStaffEmployment` |
| Soft-warn Institution / Department | **Done** (confirm dialog) | **TODO INT-H4** — optional ack pattern like Change Staff |
| Standing assignments panel | **Done** (`getStaffEmploymentRosterShiftSummaryAction`) | — |

See `HR_ADMINISTRATION_GUIDE.md` §26 / §32 / §39 and `ROSTER_SHIFTS_MANAGER_GUIDE.md` §1.1 / §2C.

---

## 8. Related consumers

| Consumer | Staff fields used |
|----------|-------------------|
| Attendance punch ingest | `fingerPrintRfid` |
| Assign Paysheet / Payslips | `epfNumber` (label / filter); contribution amounts from payroll, not this form |
| Statutory (design) | `epfNumber`, `etfNumber` on returns |
| Roster & Shifts | `employment.roster` (group code); standing assignments via `StaffShiftAssignment`; day allocations by staff × date |
| Change Staff | Versions dept / status / category / grade / designation / basic; soft-warns on dept when standing assignments exist; does **not** edit roster |
| Recruitment onboard | Prefills General; EPF/ETF/Registration start blank |
| Auth User | `User.staffId` → `Staff.id` (auth DB; no Prisma cross-relation) |

---

## 9. Acceptance notes (current)

1. Two active staff cannot share the same non-blank Finger Print / RFID, EPF Number, or ETF Number.
2. Registration Number can be blank or duplicated until §4 is locked and implemented.
3. Zone Code dropdown shows published zones; stored value is the zone code.
4. List status filter and export use the same where-builder.
5. Linked Channeling deletes never treat Cancel as HRM-only delete.
6. Create/update Cancel discards the save; it never saves HRM-only (that is the middle button).
7. Employment roster is read-only in the UI when standing shift assignments exist; server lock is **INT-H1**.
8. Employment shows a read-only standing-assignments panel; Default Shift is not edited on Employment.
9. Institution / Working Department soft-warn when standing assignments exist; department change does not clear a locked roster.

*Last updated: Oct 2026 — Employment roster/standing-shift UX; post-review hardening INT-H* in §4 / HR Admin §32.*
