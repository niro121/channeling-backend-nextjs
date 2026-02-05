"use client"

import { dispatchSignOutRequested } from "@/app/(dashboard)/signout-shift-reminder"

export default function SignOutButton() {
  return (
    <button type="button" onClick={dispatchSignOutRequested}>
      Sign Out
    </button>
  )
}
