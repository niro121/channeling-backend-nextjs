"use client"

import { useEffect, useState } from "react"
import {
  getBookingDetails,
  getBookingsBySession,
  updateBookingAction,
} from "@/app/actions/channel-booking"
import type { BookingDetailsView } from "@/services/channel-booking/get-booking-details.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SEX_OPTIONS } from "@/types/channel-booking"
import { TITLE_OPTIONS } from "@/types/title"

export function ChangeTab({ onUpdateSuccess }: { onUpdateSuccess?: () => void }) {
  const { selectedBooking, selectedSession, setBookings, setSelectedBooking } = useChannelBooking()
  const { toast } = useToast()
  const [details, setDetails] = useState<BookingDetailsView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [name, setName] = useState("")
  const [sex, setSex] = useState("")
  const [phone, setPhone] = useState("")
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!selectedBooking?.id) {
      setDetails(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    getBookingDetails(selectedBooking.id)
      .then((res) => {
        if (res.success && res.data) {
          setDetails(res.data)
          setTitle(res.data.patientTitle ?? "")
          setName(res.data.patientName ?? "")
          const patientSex = (res.data.patientSex ?? "").toLowerCase()
          const sexOption = SEX_OPTIONS.find(
            (s) => s.id.toLowerCase() === patientSex || s.name.toLowerCase() === patientSex
          )
          setSex(sexOption?.id ?? "")
          setPhone(res.data.phone ?? "")
          setRemarks(res.data.remark ?? "")
        } else {
          setDetails(null)
          setError(res.message ?? "Failed to load")
        }
      })
      .finally(() => setLoading(false))
  }, [selectedBooking?.id])

  if (!selectedBooking) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Select a booking
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-destructive text-sm">
        {error ?? "Failed to load booking"}
      </div>
    )
  }

  if (details.status === 2) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Cannot update a canceled booking.
      </div>
    )
  }

  async function handleUpdate() {
    if (!title.trim() || !name.trim() || !sex.trim() || !phone.trim()) {
      toast({
        title: "Missing fields",
        description: "Title, name, sex and phone are required.",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      const result = await updateBookingAction({
        booking_id: selectedBooking.id,
        title: title.trim(),
        name: name.trim(),
        sex: sex.trim(),
        phone: phone.trim(),
        remarks: remarks.trim() || undefined,
      })
      if (result.success) {
        toast({ title: "Updated", description: "Channel details have been updated." })
        if (selectedSession?.id) {
          const res = await getBookingsBySession(selectedSession.id)
          if (res.success && res.data) {
            setBookings(res.data)
            const updated = res.data.find((b) => b.id === selectedBooking.id)
            if (updated) setSelectedBooking(updated)
          }
        }
        onUpdateSuccess?.()
      } else {
        toast({
          title: "Error",
          description: result.message ?? result.errorCode,
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Update failed.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Select value={title || undefined} onValueChange={setTitle}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select title" />
            </SelectTrigger>
            <SelectContent>
              {TITLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="text-xs">
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            className="text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sex</Label>
          <Select value={sex || undefined} onValueChange={setSex}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              {SEX_OPTIONS.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input
            className="text-xs"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Remarks</Label>
        <Textarea
          className="min-h-[80px] text-xs resize-y"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks (optional)"
        />
      </div>
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={handleUpdate}
        disabled={submitting}
      >
        {submitting ? "Updating…" : "Update Channel Details"}
      </Button>
    </div>
  )
}
