"use client"

import { dispatchSignOutRequested } from "@/app/(dashboard)/signout-shift-reminder"

export default function SignOutButton() {
  return (
    <button type="button" onClick={dispatchSignOutRequested} className="cursor-pointer">
      Sign Out
    </button>
  )
}
