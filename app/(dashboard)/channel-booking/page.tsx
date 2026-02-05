import React from "react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { checkRouteAccess } from "@/lib/server-permissions"

export default async function ChannelBookingPage() {
  const canView = await checkRouteAccess("/channel-booking")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Channel Booking</h1>
        <p className="text-muted-foreground text-sm">Select speciality, consultant and session, then complete the booking.</p>
      </div>

      {/* Top row: Specialities | Consultant & Sessions | Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Specialities */}
        <Card className="flex flex-col min-h-[320px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Specialities</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
            <div className="rounded-md border border-border bg-muted/30 h-9 w-full max-w-xs mb-3" />
            <div className="flex-1 rounded-md border border-dashed border-border bg-muted/20 min-h-[200px]" />
          </CardContent>
        </Card>

        {/* Middle: Consultant & Sessions */}
        <Card className="flex flex-col min-h-[320px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consultant & Sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 min-h-0 p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              <div className="rounded-md border border-border bg-muted/30 h-9 w-32" />
              <div className="rounded-md border border-border bg-muted/30 h-9 w-28" />
              <div className="rounded-md border border-border bg-muted/30 h-9 w-36" />
            </div>
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[80px] flex-1" />
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px]" />
          </CardContent>
        </Card>

        {/* Right: Bookings */}
        <Card className="flex flex-col min-h-[320px]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Bookings</CardTitle>
            <div className="flex gap-1">
              <div className="rounded-md border border-border bg-muted/30 h-8 w-8" />
              <div className="rounded-md border border-border bg-muted/30 h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-4 pt-0">
            <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[240px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: New Booking Details (left) | Booking Details / Confirmation (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bottom Left: New Booking Details */}
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

        {/* Bottom Right: Booking / Payment / Details */}
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
      </div>
    </div>
  )
}
