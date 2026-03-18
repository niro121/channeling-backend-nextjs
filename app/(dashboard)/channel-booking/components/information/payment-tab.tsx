"use client";

import Link from "next/link";
import { useChannelBooking } from "../../context/channel-booking-context";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

export function PaymentTab() {
  const { selectedDoctor } = useChannelBooking();
  const hasDoctor = !!selectedDoctor?.id;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-2">Doctor payment</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Open Make Doctor Payment with the currently selected doctor pre-selected.
        </p>
        <Button asChild variant="default" size="sm" disabled={!hasDoctor}>
          <Link
            href={hasDoctor ? `/doctor-payments/make?doctorId=${encodeURIComponent(selectedDoctor!.id)}` : "/doctor-payments/make"}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Pay Selected Doctor
          </Link>
        </Button>
        {!hasDoctor && (
          <p className="text-xs text-muted-foreground mt-2">
            Select a doctor in the session list to enable this button.
          </p>
        )}
      </div>
    </div>
  );
}
