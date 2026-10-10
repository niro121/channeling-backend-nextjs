# Component Audit Skeleton

Use this doc as the standard structure when building or auditing a list + CRUD component (e.g. Doctors, Locations, Rooms, Doctor Sessions, Agencies).

---

## 1. Normal Structure Overview

| Layer | Expected pattern |
|-------|------------------|
| **List page** | Server component; route guard; data from **server action** → **service**; params from **URL `searchParams`** (`page`, `limit`, `keyword`, filter IDs). |
| **Pagination** | **Server-side**: changing page/limit updates the **URL** → server re-fetches → **service** called with new `page`/`limit` (no client-only slicing). |
| **Search** | **Server-side**: search updates **URL** (e.g. `keyword`) and resets `page` → server re-renders → list action/service called with new params. |
| **Filters** | Filter controls set URL params → server refetch → service receives filter params. |
| **Add route** | `/[entity]/add` → page loads any options → single form with `entity={null}`. |
| **Edit route** | `/[entity]/[id]/edit` → get one by id via action → service; `notFound()` if missing → same form with `entity={data}`. |
| **Form** | Client component; **Formik** for state/submit; **Yup** for client-side validation. |
| **Server validation** | In **service**: **Zod** schema before create/update; return structured errors; form maps `error.issues` to Formik `setErrors`/`setTouched`. |
| **Permissions** | List route: `checkRouteAccess(route)`; actions: `requirePermission(entity, 'view'\|'add'\|'edit'\|'delete')`. |

---

## 2. File / Route Skeleton

```
app/(dashboard)/[entity]/
  page.tsx              # List: server component, searchParams → action → service
  columns.tsx            # Table column definitions
  record-actions.tsx     # Row actions (edit, delete)
  filter-section.tsx     # Filters that update URL params
  [entity]-form.tsx      # Add + Edit form (Formik + Yup)
  add/
    page.tsx             # Add page → form with entity={null}
  [id]/
    edit/
      page.tsx           # Edit page → getById → form with entity={data}

app/actions/
  [entity].actions.ts    # Server actions → call services

services/
  [entity].service.ts    # CRUD + Zod validation
```

---

## 3. List View Checklist

- [ ] List page is a **server component** (no `"use client"`).
- [ ] **Route guard**: `checkRouteAccess('/route')` and `redirect('/unauthorized-access')` when no access.
- [ ] List data comes from a **server action** that calls a **service** (not raw Prisma in the page).
- [ ] List params come from **URL `searchParams`**: `page`, `limit`, `keyword`, and any filter IDs.
- [ ] Table uses `CustomDataTable` (or equivalent) with `data`, `rowCount`, `deleteServerAction`, and `page` from params.
- [ ] **Search**: `SearchInput` (or equivalent) that updates URL (e.g. `keyword`) so server refetches.
- [ ] **Filters**: `FilterSection` (or equivalent) that sets URL params so list refetches via service.
- [ ] **Add** button links to `/[entity]/add`.

---

## 4. Pagination Checklist

- [ ] Pagination is **server-side**: changing page or limit updates the **URL** (e.g. `?page=1&limit=10`).
- [ ] Table uses `manualPagination: true` and pagination controls call `onPageChange` / `onLimitChange` which do `router.replace(pathname + '?' + newParams)`.
- [ ] No client-only slicing: when URL changes, the **service** is called again with new `page`/`limit`.

---

## 5. Add / Edit Routes Checklist

- [ ] **Add**: route `/[entity]/add`; page loads options if needed; renders form with `entity={null}`.
- [ ] **Edit**: route `/[entity]/[id]/edit`; page calls get-by-id action → service; uses `notFound()` when not found; renders same form with `entity={data}`.
- [ ] Same form component is used for both add and edit (differentiated by `entity` being null or the loaded record).

---

## 6. Form & Validation Checklist

- [ ] **Frontend**: **Formik** for form state and submit; **Yup** for client-side validation schema.
- [ ] **Backend**: **Zod** schema in the **service** for create/update payloads; validate before DB operations.
- [ ] Server returns validation errors (e.g. `error.issues`) and form maps them to fields (e.g. `setErrors` / `setTouched` on Formik).
- [ ] Submit calls server action (create or update); on success, redirect to list or edit page; on error, show toast and optionally set field errors from server.

---

## 7. Permissions Checklist

- [ ] List page: `checkRouteAccess('/route')` before rendering.
- [ ] Get-list action: `requirePermission(entity, 'view')` (if applicable).
- [ ] Create action: `requirePermission(entity, 'add')`.
- [ ] Update action: `requirePermission(entity, 'edit')`.
- [ ] Delete / bulk-delete actions: `requirePermission(entity, 'delete')`.

---

## 8. Code Patterns (Reference)

### List page (server component, params from URL)

```tsx
type SearchParams = {
  searchParams?: Promise<{ page?: string; limit?: string; keyword?: string; /* filters */ }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/your-route');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const { data, totalRecords } = await getListAction({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    // ...filter params
  });

  return (
    <>
      <SearchInput name="keyword" placeholder="..." className="..." />
      <FilterSection ... />
      <CustomDataTable
        data={data}
        rowCount={totalRecords}
        deleteServerAction={bulkDeleteAction}
        page={params?.page}
        ...
      />
    </>
  );
}
```

### Pagination (server-driven via URL)

- In `CustomDataTable`: `onPageChange` / `onLimitChange` build new `URLSearchParams` and call `router.replace(pathname + '?' + params)`.
- List page re-renders with new `searchParams` → action → service with new `page`/`limit`.

### Form (Formik + Yup, server errors mapped)

```tsx
// Client component
const validationSchema = Yup.object({ ... });

const handleSubmit = async (values, { setErrors, setTouched }) => {
  const respond = await createOrUpdateAction(values);
  if (!respond?.success && respond?.error?.issues) {
    const fieldErrors = {};
    Object.keys(respond.error.issues).forEach((key) => {
      fieldErrors[key] = respond.error.issues[key]?.[0];
    });
    setErrors(fieldErrors);
    setTouched(Object.fromEntries(Object.keys(fieldErrors).map(k => [k, true])));
  }
};
```

### Service (Zod validation)

```ts
const entitySchema = z.object({
  name: z.string().min(1).max(150),
  // ...
});

// In create/update:
const parsed = entitySchema.safeParse(payload);
if (!parsed.success) {
  return { success: false, error: { message: 'Validation failed', issues: parsed.error.flatten().fieldErrors } };
}
```

---

## 9. Quick Audit Table

When auditing a component, fill this mentally or in a copy:

| Item | Done | Notes |
|------|------|--------|
| List: server component | ☐ | |
| List: route guard | ☐ | |
| List: data from action → service | ☐ | |
| List: params from URL searchParams | ☐ | |
| Pagination: server-side (URL change → refetch) | ☐ | |
| Search: URL-based, server refetch | ☐ | |
| Add route + form | ☐ | |
| Edit route + same form | ☐ | |
| Form: Formik + Yup | ☐ | |
| Service: Zod validation | ☐ | |
| Form maps server errors to fields | ☐ | |
| Permissions: route + actions | ☐ | |

---

## 10. Known Deviations (this codebase)

- **Doctor Sessions**: List has no `SearchInput` (only filters); add/edit routes are under doctor id: `/doctor-sessions/[id]/add`, `/doctor-sessions/[id]/edit`. Consider adding keyword search if you want full alignment with this skeleton.
- **Locations**: Edit page passes `isEditPage={false}`; consider `true` for edit.
- **Rooms**: Add page title/component name still say "Doctor" in places; rename to Room for consistency.
- **Location form**: Component is named `DoctorForm` in `location-form.tsx`; rename to `LocationForm` for clarity.

Use this skeleton when adding a new list+CRUD module or when auditing an existing one.
