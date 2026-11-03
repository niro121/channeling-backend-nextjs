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

type DoctorPaymentPrintOptions = {
  doctorName?: string;
  originalReceiptNoString?: string;
};

/** Opens the browser print dialog for an existing consultant-payment receipt. */
export async function printDoctorPaymentReceiptById(
  receiptId: string,
  options: DoctorPaymentPrintOptions = {}
): Promise<{ success: boolean; message?: string }> {
  if (!receiptId.trim()) {
    return { success: false, message: "Receipt is required." };
  }
  const printed = await printDoctorPaymentReceiptAction(receiptId.trim(), options);
  const slips = printed.slips?.length ? printed.slips : printed.data ? [printed.data] : [];
  if (!printed.success || slips.length === 0) {
    return { success: false, message: printed.message ?? "Could not prepare the receipt." };
  }
  printHtmlInIframe(buildDoctorPaymentPrintHtml(slips), {
    title: "Consultant Payment",
    width: "148mm",
    height: "210mm",
  });
  return { success: true };
}

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
  const [slips, setSlips] = useState<DoctorPaymentPrintModel[]>([]);

  useEffect(() => {
    if (!open || !receiptId) {
      setSlips([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const loadId = cancelReceiptId || receiptId;
    const loadOptions = cancelReceiptId ? { doctorName, originalReceiptNoString } : {};
    getDoctorPaymentReceiptForPrint(loadId, loadOptions)
      .then((detailRes) => {
        if (cancelled) return;
        const loaded = detailRes.slips?.length ? detailRes.slips : detailRes.data ? [detailRes.data] : [];
        if (detailRes.success && loaded.length > 0) {
          setSlips(loaded);
        } else {
          setSlips([]);
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
    if (slips.length === 0 || printing) return;
    setPrinting(true);
    try {
      const printId = cancelReceiptId ?? receiptId;
      const printed = await printDoctorPaymentReceiptById(
        printId,
        cancelReceiptId ? { doctorName, originalReceiptNoString } : {}
      );
      if (!printed.success) {
        toast({
          title: "Print failed",
          description: printed.message ?? "Could not prepare the receipt.",
          variant: "destructive",
        });
        return;
      }
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

  const previewHtml = slips.length > 0 ? buildDoctorPaymentPrintHtml(slips) : null;
  const hasContent = Boolean(previewHtml);

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
            {previewHtml && (
              <div className="rounded-md border bg-white overflow-auto">
                <iframe
                  title="Receipt preview"
                  srcDoc={previewHtml}
                  className="w-full border-0 bg-white"
                  style={{ minHeight: `${Math.max(520, slips.length * 520)}px` }}
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {slips.length > 0 && (
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
