import { hasPermission } from "@/lib/permissions"
import type { Permissions } from "@/types/user-group"

/** Resource ids (channeling user-group switches). */
export const ROOM_CHECKLIST_FORMS = "room-checklist-forms"
export const ROOM_STAYS = "room-stays"

/**
 * Checklist form builder (channeling desktop, /room-checklists).
 * - view: see forms
 * - edit: create and change forms
 * - publish: publish, archive and delete forms
 */
export function checklistFormsCan(permissions: Permissions | null | undefined, isAdmin: boolean) {
  if (isAdmin) return { view: true, edit: true, publish: true }
  const edit = hasPermission(permissions, ROOM_CHECKLIST_FORMS, "edit")
  const publish = hasPermission(permissions, ROOM_CHECKLIST_FORMS, "publish")
  return {
    view: edit || publish || hasPermission(permissions, ROOM_CHECKLIST_FORMS, "view"),
    edit,
    publish,
  }
}

/**
 * Patient stays and their checklists (management PWA and channeling /room-stays).
 * - view: room status, stays and filled checklists
 * - checkIn / checkOut: fill and submit those checklists
 * - contacts: change contacts and the primary after check-in
 * - override: finish although a blocking item failed (reason required), cancel a wrong check-in
 * - alerts: get a notification when a checklist is submitted with issues
 */
export function roomStaysCan(permissions: Permissions | null | undefined, isAdmin: boolean) {
  if (isAdmin) {
    return { view: true, checkIn: true, checkOut: true, contacts: true, override: true, alerts: true }
  }
  const p = (a: string) => hasPermission(permissions, ROOM_STAYS, a)
  const checkIn = p("check-in")
  const checkOut = p("check-out")
  return {
    view: checkIn || checkOut || p("view"),
    checkIn,
    checkOut,
    contacts: p("contacts"),
    override: p("override"),
    alerts: p("alerts"),
  }
}
