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
import { useToast } from "@/components/hooks/use-toast";
import {
  getDoctorPaymentReceiptForPrint,
  printDoctorPaymentReceiptAction,
} from "@/app/actions/doctor-payment/doctor-payment.actions";
import {
  buildDoctorPaymentPrintHtml,
  type DoctorPaymentPrintModel,
} from "@/lib/receipt-template/build-print-html";
import { printHtmlInIframe } from "@/lib/receipt-template/print-html-iframe";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DoctorPaymentPrintModel | null>(null);
  const [cancelDetail, setCancelDetail] = useState<DoctorPaymentPrintModel | null>(null);

  useEffect(() => {
    if (!open || !receiptId) {
      setDetail(null);
      setCancelDetail(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const loadPromise = cancelReceiptId
      ? getDoctorPaymentReceiptForPrint(cancelReceiptId, { doctorName, originalReceiptNoString })
      : getDoctorPaymentReceiptForPrint(receiptId);

    loadPromise
      .then((detailRes) => {
        if (cancelled) return;
        if (detailRes.success && detailRes.data) {
          if (cancelReceiptId) {
            setDetail(null);
            setCancelDetail(detailRes.data);
          } else {
            setDetail(detailRes.data);
            setCancelDetail(null);
          }
        } else {
          setDetail(null);
          setCancelDetail(null);
          setError(detailRes.success ? "No data" : detailRes.message ?? "Failed to load receipt.");
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

  const handlePrint = async () => {
    const canPrint = cancelReceiptId ? Boolean(cancelDetail) : Boolean(detail);
    if (!canPrint || printing) return;
    setPrinting(true);
    try {
      const printId = cancelReceiptId ?? receiptId;
      const printed = await printDoctorPaymentReceiptAction(
        printId,
        cancelReceiptId ? { doctorName, originalReceiptNoString } : {}
      );
      if (!printed.success || !printed.data) {
        toast({
          title: "Print failed",
          description: printed.message ?? "Could not prepare the receipt.",
          variant: "destructive",
        });
        return;
      }
      const models = [printed.data];
      printHtmlInIframe(buildDoctorPaymentPrintHtml(models), {
        title: "Consultant Payment",
        width: "148mm",
        height: "210mm",
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Print failed",
        description: err instanceof Error ? err.message : "Could not print the receipt.",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  const paidHtml = detail ? buildDoctorPaymentPrintHtml([detail]) : null;
  const cancelHtml = cancelDetail ? buildDoctorPaymentPrintHtml([cancelDetail]) : null;
  const hasContent = Boolean(paidHtml || cancelHtml);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>View receipt</DialogTitle>
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
            {paidHtml && !cancelReceiptId && (
              <div className="space-y-2">
                <div className="rounded-md border bg-white overflow-auto">
                  <iframe
                    title="Paid receipt preview"
                    srcDoc={paidHtml}
                    className="w-full min-h-[520px] border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
            {cancelHtml && (
              <div className="space-y-2">
                <div className="rounded-md border bg-white overflow-auto">
                  <iframe
                    title="Cancel receipt preview"
                    srcDoc={cancelHtml}
                    className="w-full min-h-[520px] border-0 bg-white"
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
          {(cancelReceiptId ? cancelDetail : detail) && (
            <Button onClick={handlePrint} disabled={printing}>
              {printing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Print
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
