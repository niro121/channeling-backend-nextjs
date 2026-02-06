"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChannelBooking } from "../context/channel-booking-context"

export function Information() {
  const { selectedBooking } = useChannelBooking()

  return (
    <Card className="flex flex-col min-h-[360px]">
      <CardHeader className="pb-2">
        <Tabs defaultValue="payment" className="w-full">
          <TabsList className="w-full flex-wrap justify-start h-auto gap-1">
            <TabsTrigger value="booking" className="text-xs">Booking</TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs">Transfer</TabsTrigger>
            <TabsTrigger value="cancel" className="text-xs">Cancel</TabsTrigger>
            <TabsTrigger value="refund" className="text-xs">Refund</TabsTrigger>
            <TabsTrigger value="settle" className="text-xs">Settle</TabsTrigger>
            <TabsTrigger value="change" className="text-xs">Change</TabsTrigger>
            <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
            <TabsTrigger value="views" className="text-xs">Views</TabsTrigger>
            <TabsTrigger value="arrival" className="text-xs">Arrival</TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
          </TabsList>
          <TabsContent value="payment" className="mt-0 pt-4">
            <div className="rounded-md border border-primary/30 bg-primary/10 h-10 mb-4 flex items-center justify-between px-3" />
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[220px]" />
          </TabsContent>
          <TabsContent value="booking" className="mt-0 pt-4">
            {/* Filled when a booking is selected */}
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="transfer" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="cancel" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="refund" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="settle" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="change" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="search" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="views" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
          <TabsContent value="arrival" className="mt-0 pt-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[260px]" />
          </TabsContent>
        </Tabs>
      </CardHeader>
      <CardContent className="p-4 pt-0" />
    </Card>
  )
}
