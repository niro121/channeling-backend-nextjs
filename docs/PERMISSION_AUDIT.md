# Permission System Audit

This document lists all components and their permission check status.

## Components List

### ✅ Components WITH Permission Checks

1. **Users** (`/users`)
   - ✅ Page: Has `checkRouteAccess` check
   - ✅ Server Actions: All actions have `requirePermission` checks
     - `getAllUsers` - view permission
     - `createNewUser` - add permission
     - `updateUser` - edit permission
     - `deleteUser` - delete permission
     - `bulkDeleteUsers` - delete permission
   - ✅ Record Actions: Has `usePermissions` hook checks
     - Edit button protected
     - Delete button protected

2. **User Groups** (`/user-groups`)
   - ⚠️ Page: NO permission check (needs to be added)
   - ⚠️ Server Actions: NO permission checks (needs to be added)
   - ⚠️ Record Actions: NO permission checks (needs to be added)

3. **Channel Booking** (`/channel-booking`) – page and shift
   - ✅ Page: Has `checkRouteAccess("/channel-booking")` check; redirects to unauthorized if no view
   - ✅ Shift (Channel Booking): Separate resource **"shift"** – when **view** is ticked, all shift actions are allowed (no add/edit split)
     - `getActiveShiftAction` – requirePermission("shift", "view")
     - `getCurrentShiftAction` – requirePermission("shift", "view")
     - `startShiftAction` – requirePermission("shift", "view")
     - `pauseShiftAction` – requirePermission("shift", "view")
     - `resumeShiftAction` – requirePermission("shift", "view")
     - `endShiftAction` – requirePermission("shift", "view")
   - ✅ UI: Shift bar and start/skip dialog only on channel-booking route; sidebar link gated by `hasAccess('/channel-booking')`. Grant **Shift (Channel Booking)** view to allow shift creation and controls.

---

### ❌ Components WITHOUT Permission Checks

4. **Agencies** (`/agencies`)
   - ❌ Page: NO permission check
   - ❌ Server Actions: NO permission checks
   - ❌ Record Actions: NO permission checks

5. **Agency Books** (`/agency-books`)
   - ❌ Page: NO permission check
   - ❌ Server Actions: NO permission checks
   - ❌ Record Actions: NO permission checks

6. **Departments** (`/departments`)
   - ❌ Page: NO permission check
   - ❌ Server Actions: NO permission checks
   - ❌ Record Actions: NO permission checks

7. **Doctors** (`/doctors`)
   - ❌ Page: NO permission check
   - ❌ Server Actions: NO permission checks
   - ❌ Record Actions: NO permission checks

8. **Patients** (`/patients`)
   - ❌ Page: NO permission check
   - ❌ Server Actions: NO permission checks
   - ❌ Record Actions: NO permission checks

9. **Specialities** (`/specialities`)
   - ❌ Page: NO permission check
   - ❌ Server Actions: NO permission checks
   - ❌ Record Actions: NO permission checks

10. **Locations** (`/locations`)
    - ❌ Page: NO permission check
    - ❌ Server Actions: NO permission checks
    - ❌ Record Actions: NO permission checks

11. **Rooms** (`/rooms`)
    - ❌ Page: NO permission check
    - ❌ Server Actions: NO permission checks
    - ❌ Record Actions: NO permission checks

12. **Zones** (`/zones`)
    - ❌ Page: NO permission check
    - ❌ Server Actions: NO permission checks
    - ❌ Record Actions: NO permission checks

13. **Tags** (`/tags`)
    - ❌ Page: NO permission check
    - ❌ Server Actions: NO permission checks
    - ❌ Record Actions: NO permission checks

14. **Rosters** (`/rosters`)
    - ❌ Page: NO permission check
    - ❌ Server Actions: NO permission checks
    - ❌ Record Actions: NO permission checks

15. **Discounts** (`/discounts`)
    - ❌ Page: NO permission check
    - ❌ Server Actions: NO permission checks
    - ❌ Record Actions: NO permission checks

---

## Summary

- **Total Components:** 15
- **With Permission Checks:** 2 (Users, Channel Booking) – 13%
- **Without Permission Checks:** 13 (87%)

## Action Required

All components except Users need permission checks added. The middleware provides route-level protection, but we should also add:
1. Page-level checks (server-side)
2. Server action checks (add/edit/delete)
3. UI element protection (client-side)

---

## Resources Already Defined

All these resources are already in `types/user-group.ts`:
- ✅ users
- ✅ channel-booking
- ✅ shift (Shift (Channel Booking) – use view to allow all shift actions)
- ✅ doctors
- ✅ departments
- ✅ rosters
- ✅ patients
- ✅ tags
- ✅ zones
- ✅ rooms
- ✅ specialities
- ✅ locations
- ✅ agency-books
- ✅ agencies
- ✅ discounts

All routes are already mapped in `lib/permissions.ts`.

---

## Next Steps

1. Add permission checks to all page components
2. Add permission checks to all server actions
3. Add permission checks to all record actions
4. Add permission checks to add/edit buttons in UI
