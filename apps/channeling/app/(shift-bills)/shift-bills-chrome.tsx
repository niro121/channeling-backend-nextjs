"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Camera, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShiftBillsServiceWorker } from "@/components/shift-bills/shift-bills-service-worker"

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Ruhunu"

export function ShiftBillsChrome({
  session,
  children,
}: {
  session: Session | null
  children: React.ReactNode
}) {
  const live = useSession()
  const name = live.data?.user?.name ?? session?.user?.name ?? "Cashier"

  return (
    <>
      <ShiftBillsServiceWorker />
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Camera className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">Shift bills</p>
            <p className="truncate text-xs text-muted-foreground">
              {brand} · {name}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/channel-booking">Booking</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login?callbackUrl=/shift-bills" })}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Sign out</span>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-3 pt-3 pb-4 sm:p-4">{children}</main>
      </div>
    </>
  )
}
