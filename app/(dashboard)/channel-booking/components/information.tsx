"use client"

import { useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChannelBooking } from "../context/channel-booking-context"
import { BookingTab } from "./information/booking-tab"
import { CancelTab } from "./information/cancel-tab"
import { ChangeTab } from "./information/change-tab"
import { RefundTab } from "./information/refund-tab"
import { SettleTab } from "./information/settle-tab"

const tabTriggerClass =
  "rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"

const TABS = [
  "booking",
  "transfer",
  "cancel",
  "refund",
  "settle",
  "change",
  "search",
  "views",
  "arrival",
  "payment",
] as const

const tabContentClass = "mt-0 p-2 flex-1 min-h-0 overflow-y-auto"

/** Status dot: 0 = pending (amber), 1 = paid (green), 2 = canceled/refunded (red), else neutral */
function BookingStatusDot({ status }: { status: number }) {
  if (status === 0)
    return (
      <span
        className="ml-1.5 size-1.5 shrink-0 rounded-full bg-amber-800 dark:bg-amber-200 ring-2 ring-amber-800/30 dark:ring-amber-200/30"
        title="Pending payment"
        aria-hidden
      />
    )
  if (status === 1)
    return (
      <span
        className="ml-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30"
        title="Paid"
        aria-hidden
      />
    )
  if (status === 2)
    return (
      <span
        className="ml-1.5 size-1.5 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/30 dark:bg-red-400 dark:ring-red-400/30"
        title="Canceled / refunded"
        aria-hidden
      />
    )
  return (
    <span
      className="ml-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
      title="Other"
      aria-hidden
    />
  )
}

export function Information() {
  const { selectedBooking, refreshBookingDetails } = useChannelBooking()
  const bookingStatus = selectedBooking?.status ?? null
  const [activeTab, setActiveTab] = useState("booking")

  return (
    <Card className="flex flex-col h-full min-h-0">
      <CardHeader className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 w-full">
          <TabsList className="h-9 w-full shrink-0 justify-start gap-0 rounded-none border-b border-border bg-transparent p-0 px-2 pt-1">
            <TabsTrigger value="booking" className={tabTriggerClass}>
              <span className="inline-flex items-center">
                Booking
                {bookingStatus !== null && <BookingStatusDot status={bookingStatus} />}
              </span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className={tabTriggerClass}>
              Transfer
            </TabsTrigger>
            <TabsTrigger value="cancel" className={tabTriggerClass}>
              Cancel
            </TabsTrigger>
            <TabsTrigger value="refund" className={tabTriggerClass}>
              Refund
            </TabsTrigger>
            <TabsTrigger value="settle" className={tabTriggerClass}>
              Settle
            </TabsTrigger>
            <TabsTrigger value="change" className={tabTriggerClass}>
              Change
            </TabsTrigger>
            <TabsTrigger value="search" className={tabTriggerClass}>
              Search
            </TabsTrigger>
            <TabsTrigger value="views" className={tabTriggerClass}>
              Views
            </TabsTrigger>
            <TabsTrigger value="arrival" className={tabTriggerClass}>
              Arrival
            </TabsTrigger>
            <TabsTrigger value="payment" className={tabTriggerClass}>
              Payment
            </TabsTrigger>
          </TabsList>
          <TabsContent value="booking" className={tabContentClass}>
            <div className="min-h-[200px] rounded-md bg-secondary p-2">
              <BookingTab />
            </div>
          </TabsContent>
          <TabsContent value="payment" className={tabContentClass}>
            <div className="min-h-[200px] rounded-md bg-secondary p-2">
              <div className="rounded-md border border-primary/30 bg-primary/10 h-9 mb-1.5 flex items-center justify-between px-2" />
              <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px]" />
            </div>
          </TabsContent>
          <TabsContent value="cancel" className={tabContentClass}>
            <div className="flex flex-1 flex-col min-h-0 rounded-md bg-secondary p-2">
              <CancelTab onCancelSuccess={() => { refreshBookingDetails(); setActiveTab("booking") }} />
            </div>
          </TabsContent>
          <TabsContent value="refund" className={tabContentClass}>
            <div className="flex flex-1 flex-col min-h-0 rounded-md bg-secondary p-2">
              <RefundTab onRefundSuccess={() => { refreshBookingDetails(); setActiveTab("booking") }} />
            </div>
          </TabsContent>
          <TabsContent value="change" className={tabContentClass}>
            <div className="flex flex-1 flex-col min-h-0 rounded-md bg-secondary p-2">
              <ChangeTab onUpdateSuccess={() => refreshBookingDetails()} />
            </div>
          </TabsContent>
          <TabsContent value="settle" className={tabContentClass}>
            <div className="flex flex-1 flex-col min-h-0 rounded-md bg-secondary p-2">
              <SettleTab
                onSettleSuccess={() => {
                  refreshBookingDetails()
                  setActiveTab("booking")
                }}
              />
            </div>
          </TabsContent>
          {TABS.filter((v) => v !== "booking" && v !== "payment" && v !== "settle" && v !== "cancel" && v !== "refund" && v !== "change").map((value) => (
            <TabsContent key={value} value={value} className={tabContentClass}>
              <div className="min-h-[200px] rounded-md bg-secondary p-2">
                <div className="min-h-[120px] rounded border border-dashed border-border" />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardHeader>
    </Card>
  )
}
