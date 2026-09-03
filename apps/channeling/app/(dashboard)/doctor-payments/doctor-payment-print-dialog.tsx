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
import {
  getDoctorPaymentReceiptForPrint,
  getDoctorCancelReceiptForPrint,
} from "@/app/actions/doctor-payment/doctor-payment.actions";
import { getActiveReceiptTemplateAction } from "@/app/actions/receipt-template.actions";
import { buildPlaceholdersForDoctorPayment } from "@/lib/receipt-template/build-placeholders";
import { buildDoctorPaymentPrintHtml } from "@/lib/receipt-template/build-print-html";
import type { DoctorPaymentReceiptDetail } from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service";
import type { ReceiptTemplateRecord } from "@/types/receipt-template-db";

type DoctorPaymentPrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
  /** When payment is canceled, the reversal receipt id so we can show both paid + cancel receipts */
  cancelReceiptId?: string;
  doctorName?: string;
  originalReceiptNoString?: string;
};

export function DoctorPaymentPrintDialog({
  open,
  onOpenChange,
  receiptId,
  cancelReceiptId,
  doctorName,
  originalReceiptNoString,
}: DoctorPaymentPrintDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DoctorPaymentReceiptDetail | null>(null);
  const [cancelDetail, setCancelDetail] = useState<DoctorPaymentReceiptDetail | null>(null);
  const [template, setTemplate] = useState<ReceiptTemplateRecord | null>(null);
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null);
  const [cancelReceiptHtml, setCancelReceiptHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !receiptId) {
      setDetail(null);
      setCancelDetail(null);
      setTemplate(null);
      setReceiptHtml(null);
      setCancelReceiptHtml(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReceiptHtml(null);
    setCancelReceiptHtml(null);
    const paidPromise = getDoctorPaymentReceiptForPrint(receiptId);
    const templatePromise = getActiveReceiptTemplateAction("doctor_payment", "custom_size");
    const cancelPromise = cancelReceiptId
      ? getDoctorCancelReceiptForPrint(cancelReceiptId, { doctorName, originalReceiptNoString })
      : Promise.resolve<{ success: false; message: string } | { success: true; data: DoctorPaymentReceiptDetail }>({ success: false, message: "" });

    Promise.all([paidPromise, templatePromise, cancelPromise])
      .then(([detailRes, templateRes, cancelDetailRes]) => {
        if (cancelled) return;
        if (detailRes.success && detailRes.data) {
          setDetail(detailRes.data);
        } else {
          setDetail(null);
          setError(detailRes.success ? "No data" : (detailRes as { message?: string }).message ?? "Failed to load receipt.");
        }
        setTemplate(templateRes.success && templateRes.data != null ? templateRes.data : null);
        if (cancelDetailRes.success && cancelDetailRes.data) {
          setCancelDetail(cancelDetailRes.data);
        } else {
          setCancelDetail(null);
        }
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
  }, [open, receiptId, cancelReceiptId, doctorName, originalReceiptNoString]);

  useEffect(() => {
    if (!detail || !open) return;
    const placeholders = buildPlaceholdersForDoctorPayment(detail);
    const html = buildDoctorPaymentPrintHtml(placeholders, template, detail.receiptNoString);
    setReceiptHtml(html);
  }, [detail, template, open]);

  useEffect(() => {
    if (!cancelDetail || !open) return;
    const placeholders = buildPlaceholdersForDoctorPayment(cancelDetail);
    const html = buildDoctorPaymentPrintHtml(placeholders, template, cancelDetail.receiptNoString);
    setCancelReceiptHtml(html);
  }, [cancelDetail, template, open]);

  const handlePrint = () => {
    if (!detail) return;
    const parts: string[] = [];
    const placeholdersPaid = buildPlaceholdersForDoctorPayment(detail);
    const htmlPaid = buildDoctorPaymentPrintHtml(placeholdersPaid, template, detail.receiptNoString);
    parts.push(htmlPaid);
    if (cancelDetail && cancelReceiptHtml) {
      parts.push(cancelReceiptHtml);
    }
    const combinedHtml = parts.join('<div style="page-break-before:always;"></div>');
    const iframe = document.createElement("iframe");
    iframe.setAttribute("style", "position:absolute;width:0;height:0;border:0;visibility:hidden");
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(combinedHtml);
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

  const hasContent = (detail && receiptHtml) || (cancelDetail && cancelReceiptHtml);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>View receipt{cancelReceiptId ? "s" : ""}</DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}
        {!loading && !error && hasContent && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
            {detail && receiptHtml && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Paid receipt</p>
                <div className="rounded-md border bg-muted/30 overflow-hidden">
                  <iframe
                    title="Paid receipt preview"
                    srcDoc={receiptHtml}
                    className="w-full min-h-[320px] border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
            {cancelDetail && cancelReceiptHtml && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cancel receipt</p>
                <div className="rounded-md border bg-muted/30 overflow-hidden">
                  <iframe
                    title="Cancel receipt preview"
                    srcDoc={cancelReceiptHtml}
                    className="w-full min-h-[320px] border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="mt-4 shrink-0">
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
