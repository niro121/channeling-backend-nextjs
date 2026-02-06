"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChannelBooking } from "../context/channel-booking-context"

export function Reservation() {
  const { reservationDetails } = useChannelBooking()

  return (
    <Card className="flex flex-col min-h-[360px]">
      <CardHeader className="pb-2">
        <Tabs defaultValue="new-booking" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="new-booking">New Booking Details</TabsTrigger>
            <TabsTrigger value="agent-book">Agent Book</TabsTrigger>
            <TabsTrigger value="referred">Referred</TabsTrigger>
          </TabsList>
          <TabsContent value="new-booking" className="mt-0 pt-4">
            <div className="space-y-3">
              {/* Filled from reservationDetails when session selected */}
              <div className="flex flex-wrap gap-2">
                <div className="rounded-md border border-border bg-muted/30 h-9 w-24" />
                <div className="rounded-md border border-border bg-muted/30 h-9 w-40" />
              </div>
              <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[200px]" />
              <div className="rounded-md border border-primary/30 bg-primary/10 h-10 w-full max-w-xs" />
            </div>
          </TabsContent>
          <TabsContent value="agent-book" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[220px]" />
          </TabsContent>
          <TabsContent value="referred" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[220px]" />
          </TabsContent>
        </Tabs>
      </CardHeader>
      <CardContent className="p-4 pt-0" />
    </Card>
  )
}
