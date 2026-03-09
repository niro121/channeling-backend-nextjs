"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { getDoctorPaymentReceiptForPrint } from "@/app/actions/doctor-payment/doctor-payment.actions";
import { getActiveReceiptTemplateAction } from "@/app/actions/receipt-template.actions";
import { buildPlaceholdersForDoctorPayment } from "@/lib/receipt-template/build-placeholders";
import { buildDoctorPaymentPrintHtml } from "@/lib/receipt-template/build-print-html";
import type { DoctorPaymentReceiptDetail } from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service";
import type { ReceiptTemplateRecord } from "@/types/receipt-template-db";

type DoctorPaymentPrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
};

export function DoctorPaymentPrintDialog({
  open,
  onOpenChange,
  receiptId,
}: DoctorPaymentPrintDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DoctorPaymentReceiptDetail | null>(null);
  const [template, setTemplate] = useState<ReceiptTemplateRecord | null>(null);

  useEffect(() => {
    if (!open || !receiptId) {
      setDetail(null);
      setTemplate(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getDoctorPaymentReceiptForPrint(receiptId),
      getActiveReceiptTemplateAction("doctor_payment", "custom_size"),
    ])
      .then(([detailRes, templateRes]) => {
        if (cancelled) return;
        if (detailRes.success && detailRes.data) {
          setDetail(detailRes.data);
        } else {
          setDetail(null);
          setError(detailRes.success ? "No data" : (detailRes as { message?: string }).message ?? "Failed to load receipt.");
        }
        setTemplate(templateRes.success && templateRes.data != null ? templateRes.data : null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, receiptId]);

  const handlePrint = () => {
    if (!detail) return;
    const placeholders = buildPlaceholdersForDoctorPayment(detail);
    const html = buildDoctorPaymentPrintHtml(placeholders, template, detail.receiptNoString);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("style", "position:absolute;width:0;height:0;border:0;visibility:hidden");
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow;
    if (!win) {
      document.body.removeChild(iframe);
      return;
    }
    win.focus();
    win.print();
    document.body.removeChild(iframe);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Consultant Payment</DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}
        {!loading && !error && detail && (
          <p className="text-sm text-muted-foreground py-2">
            {detail.receiptNoString} – {detail.consultantName} – {detail.netAmount.toLocaleString()} LKR
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {detail && (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
