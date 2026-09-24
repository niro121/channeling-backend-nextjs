"use client"

import { useEffect } from "react"

export function ShiftBillsServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw-shift-bills.js", { scope: "/" }).catch(() => {
      // Install still works on iOS without a service worker.
    })
  }, [])
  return null
}
