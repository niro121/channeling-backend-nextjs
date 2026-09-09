"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cancelDoctorPaymentAction } from "@/app/actions/doctor-payment/doctor-payment.actions";

type CancelDoctorPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
  receiptNoString: string;
  onSuccess?: () => void;
};

export function CancelDoctorPaymentDialog({
  open,
  onOpenChange,
  receiptId,
  receiptNoString,
  onSuccess,
}: CancelDoctorPaymentDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please enter a reason for canceling this doctor payment.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await cancelDoctorPaymentAction(receiptId, trimmed);
      if (result.success) {
        toast({
          title: "Doctor payment canceled",
          description: `Reversal ${result.reverseReceiptNoString} has been created. Linked bookings have been updated.`,
        });
        setReason("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          variant: "destructive",
          title: "Cancel failed",
          description: result.message ?? "Could not cancel this doctor payment.",
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel doctor payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will cancel receipt <strong>{receiptNoString}</strong>, create a reversal entry, and clear doctor
          payment on all linked bookings. This action cannot be undone.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason-dp">Cancel reason (required)</Label>
          <Textarea
            id="cancel-reason-dp"
            placeholder="e.g. Entered in error"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={loading}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Canceling…
              </>
            ) : (
              "Cancel payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
