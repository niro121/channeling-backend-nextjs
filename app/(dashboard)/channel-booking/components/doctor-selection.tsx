"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChannelBooking } from "../context/channel-booking-context"

export function DoctorSelection() {
  const { selectedSpecialityId, selectedDoctor, setSelectedSpecialityId, onDoctorSelect } =
    useChannelBooking()

  return (
    <Card className="flex flex-col min-h-[320px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Specialities</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
        {/* Speciality filter + doctor list placeholders – wire to real data/API */}
        <div className="rounded-md border border-border bg-muted/30 h-9 w-full max-w-xs mb-3" />
        <div className="flex-1 rounded-md border border-dashed border-border bg-muted/20 min-h-[200px]" />
      </CardContent>
    </Card>
  )
}
