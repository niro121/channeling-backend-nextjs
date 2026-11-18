"use client";

import Link from "next/link";
import { useChannelBooking } from "../../context/channel-booking-context";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

function toLocalISODate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PaymentTab() {
  const { selectedDoctor, selectedSession } = useChannelBooking();
  const hasDoctor = !!selectedDoctor?.id;
  const sessionDate = selectedSession?.date ? toLocalISODate(selectedSession.date) : "";

  const href = (() => {
    if (!hasDoctor) return "/doctor-payments/make";
    const params = new URLSearchParams();
    params.set("doctorId", selectedDoctor!.id);
    if (sessionDate) {
      params.set("dateFrom", sessionDate);
    }
    return `/doctor-payments/make?${params.toString()}`;
  })();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-2">Doctor payment</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Open Make Doctor Payment with the currently selected doctor and session date.
        </p>
        <Button asChild variant="default" size="sm" disabled={!hasDoctor}>
          <Link href={href}>
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
