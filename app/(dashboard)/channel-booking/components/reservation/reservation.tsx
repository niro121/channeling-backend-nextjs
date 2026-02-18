"use client"

import { Card, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChannelBooking } from "../../context/channel-booking-context"
import { AgentBookTab } from "./agent-book-tab"
import { NewBookingDetailsTab } from "./new-booking-details-tab"

const tabContentClass = "mt-0 p-2 flex-1 min-h-0 overflow-y-auto"

export function Reservation() {
  const { reservationDetails } = useChannelBooking()

  return (
    <Card className="flex flex-col h-full min-h-0">
      <CardHeader className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="new-booking" className="flex flex-col flex-1 min-h-0 w-full">
          <TabsList className="h-9 w-full shrink-0 justify-start gap-0 rounded-none border-b border-border bg-transparent p-0 px-2 pt-1">
            <TabsTrigger
              value="new-booking"
              className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              New Booking Details
            </TabsTrigger>
            <TabsTrigger
              value="agent-book"
              className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Agent Book
            </TabsTrigger>
            <TabsTrigger
              value="referred"
              className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Referred
            </TabsTrigger>
          </TabsList>
          <TabsContent value="new-booking" className={tabContentClass}>
            <div className="min-h-[200px] rounded-md bg-secondary p-2">
              <NewBookingDetailsTab />
            </div>
          </TabsContent>
          <TabsContent value="agent-book" className={tabContentClass}>
            <div className="min-h-[200px] rounded-md bg-secondary p-2">
              <AgentBookTab />
            </div>
          </TabsContent>
          <TabsContent value="referred" className={tabContentClass}>
            <div className="min-h-[200px] rounded-md bg-secondary p-2">
              <div className="min-h-[120px] rounded border border-dashed border-border" />
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  )
}
