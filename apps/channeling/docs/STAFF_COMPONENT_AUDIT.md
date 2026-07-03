# Staff Component Audit (COMPONENT_AUDIT_SKELETON.md)

Audit date: against docs/COMPONENT_AUDIT_SKELETON.md.

---

## 1. Unwanted code / files

- **add-staff-button.tsx** – Removed. Add/Edit use normal `<Link>`; loading overlay is handled by layout `NavigationLoadingWrapper`.
- No references to `NavigateWithLoading` or `AddStaffButton` in the staff folder.
- **staff/loading.tsx** – Removed (not in skeleton; loading handled by layout/dashboard).

**Verdict:** No unwanted staff-specific code or files. Structure is clean.

---

## 2. File / route skeleton compliance

| Expected | Staff | Notes |
|----------|--------|------|
| `app/(dashboard)/[entity]/page.tsx` | ✅ `staff/page.tsx` | List page |
| `columns.tsx` | ✅ | First column (Code) clickable to edit |
| `record-actions.tsx` | ✅ | Edit = Link; Delete = button + dialog |
| `filter-section.tsx` | ➖ | Optional; staff has no filters |
| `[entity]-form.tsx` | ✅ `staff-form.tsx` | Formik + Yup |
| `add/page.tsx` | ✅ | Renders form with `entity={null}` |
| `[id]/edit/page.tsx` | ✅ | getById → notFound() → form with entity |
| `app/actions/[entity].actions.ts` | ✅ `staff.actions.ts` | All CRUD + permissions |
| `services/[entity].service.ts` | ✅ `staff.service.ts` | CRUD + Zod |

---

## 3. List view checklist

| Item | Done | Notes |
|------|------|--------|
| List page is server component | ✅ | No `"use client"` on page |
| Route guard | ✅ | `checkRouteAccess('/staff')` + redirect |
| Data from action → service | ✅ | `getStaffAction` → `getStaff` (service) |
| Params from URL searchParams | ✅ | `page`, `limit`, `keyword` |
| CustomDataTable + data, rowCount, deleteServerAction, page | ✅ | |
| SearchInput updates URL | ✅ | `keyword` in toolbarLeft |
| Filters | ➖ | N/A (no filter-section) |
| Add button → /staff/add | ✅ | `<Link href="/staff/add">` |

---

## 4. Pagination

| Item | Done | Notes |
|------|------|--------|
| Server-side pagination (URL → refetch) | ✅ | Handled by CustomDataTable + searchParams |

---

## 5. Add / Edit routes

| Item | Done | Notes |
|------|------|--------|
| Add: /staff/add | ✅ | Form with `isEditPage={false}` |
| Edit: /staff/[id]/edit | ✅ | getStaffByIdAction → notFound() → form |
| Same form for add and edit | ✅ | StaffForm with `staff` + `isEditPage` |

---

## 6. Form & validation

| Item | Done | Notes |
|------|------|--------|
| Formik + Yup | ✅ | staff-form.tsx |
| Service: Zod | ✅ | staff.service.ts (staffSchema) |
| Server errors → setErrors/setTouched | ✅ | handleSubmit maps respond.errors to Formik |
| Submit → action; success redirect/toast | ✅ | create/update action; toast + router.push |

---

## 7. Permissions

| Item | Done | Notes |
|------|------|--------|
| List: checkRouteAccess('/staff') | ✅ | page.tsx |
| Get-list: requirePermission('staff', 'view') | ✅ | getStaffAction |
| Get-by-id: requirePermission('staff', 'view') | ✅ | getStaffByIdAction |
| Create: requirePermission('staff', 'add') | ✅ | createStaffAction |
| Update: requirePermission('staff', 'edit') | ✅ | updateStaffAction |
| Delete: requirePermission('staff', 'delete') | ✅ | deleteStaffAction |
| Bulk-delete: requirePermission('staff', 'delete') | ✅ | bulkDeleteStaffAction |
| Record actions: usePermissions for edit/delete | ✅ | record-actions.tsx |

---

## 8. Quick audit table (skeleton §9)

| Item | Done | Notes |
|------|------|--------|
| List: server component | ✅ | |
| List: route guard | ✅ | |
| List: data from action → service | ✅ | |
| List: params from URL searchParams | ✅ | |
| Pagination: server-side | ✅ | |
| Search: URL-based, server refetch | ✅ | |
| Add route + form | ✅ | |
| Edit route + same form | ✅ | |
| Form: Formik + Yup | ✅ | |
| Service: Zod validation | ✅ | |
| Form maps server errors to fields | ✅ | |
| Permissions: route + actions | ✅ | |

---

## 9. Optional / deviations

- **Add page route guard:** Skeleton does not require guarding the add page; only the create action must check `add`. Staff relies on action-only; optional improvement is `checkRouteAccess` or permission check on add page for earlier redirect.
- **Service "use server":** `staff.service.ts` (and e.g. `location.service.ts`) start with `"use server"`. Services are used only from actions; this is a codebase convention, not required by the skeleton.
- **First column clickable:** Code column links to edit (same pattern as rooms, locations). Aligns with UX goal; not in skeleton but consistent with other entities.

---

## 10. Summary

Staff complies with **COMPONENT_AUDIT_SKELETON.md**: list, add/edit routes, form (Formik + Yup), service (Zod), permissions, and URL-driven search/pagination are in place. No unwanted staff-only code or files.
