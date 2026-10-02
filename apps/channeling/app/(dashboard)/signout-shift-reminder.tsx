"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { getCurrentShiftAction } from "@/app/actions/shift.actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const SIGNOUT_REQUESTED_EVENT = "signout-requested"

export function SignOutShiftReminder() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const doSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  useEffect(() => {
    const handleSignOutRequested = async () => {
      try {
        const currentShift = await getCurrentShiftAction()
        if (currentShift) {
          setOpen(true)
        } else {
          await doSignOut()
        }
      } catch {
        await doSignOut()
      }
    }
    window.addEventListener(SIGNOUT_REQUESTED_EVENT, handleSignOutRequested)
    return () => window.removeEventListener(SIGNOUT_REQUESTED_EVENT, handleSignOutRequested)
  }, [])

  const handleGoToChannelBooking = () => {
    setOpen(false)
    router.push("/channel-booking")
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Active or paused shift</AlertDialogTitle>
          <AlertDialogDescription>
            You have an active or paused shift. Pause or end it from Channel Booking before signing out, or sign out anyway.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleGoToChannelBooking}>
            Go to Channel Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => doSignOut()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sign out anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function dispatchSignOutRequested() {
  window.dispatchEvent(new CustomEvent(SIGNOUT_REQUESTED_EVENT))
}
