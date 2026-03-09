"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Printer, XCircle } from "lucide-react";
import type { DoctorPaymentListItem } from "@/services/doctor-payment/get-doctor-payment-list.service";
import { usePermissions } from "@/components/hooks/use-permissions";
import { DoctorPaymentPrintDialog } from "./doctor-payment-print-dialog";
import { CancelDoctorPaymentDialog } from "./cancel-doctor-payment-dialog";

type DoctorPaymentRecordActionsProps = {
  row: Row<DoctorPaymentListItem>;
};

export function DoctorPaymentRecordActions({ row }: DoctorPaymentRecordActionsProps) {
  const router = useRouter();
  const [printOpen, setPrintOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const { has } = usePermissions();
  const canAdd = has("doctor-payments", "add");
  const canView = has("doctor-payments", "view");
  const receiptId = row.original.id;
  const receiptNoString = row.original.receiptNoString ?? "";
  const isCanceled = row.original.cancelReceiptId != null;

  return (
    <div className="flex items-center justify-end gap-1">
      {canView && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => setPrintOpen(true)}
        >
          <Printer className="h-4 w-4" />
          <span className="sr-only">Print</span>
        </Button>
      )}
      {canAdd && !isCanceled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setCancelOpen(true)}
          title="Cancel payment"
        >
          <XCircle className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      )}
      <DoctorPaymentPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        receiptId={receiptId}
      />
      <CancelDoctorPaymentDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        receiptId={receiptId}
        receiptNoString={receiptNoString}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
