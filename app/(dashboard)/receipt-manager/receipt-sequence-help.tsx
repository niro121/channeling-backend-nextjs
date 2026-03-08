"use client";

import React from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Helper for auditors: explains receipt number sequences and prefixes.
 * Prefix uses location shortcode (e.g. RH = Ruhunu Hospital); global receipts use REC-.
 */
const SEQUENCE_ROWS: { method: string; description: string; prefix: string }[] = [
  { method: "Payment (channel)", description: "POS/card/slip payments", prefix: "{code}CHANN/" },
  { method: "Refund", description: "Channel refunds", prefix: "{code}CHANN-REF/" },
  { method: "Doctor payment", description: "Consultant payments", prefix: "{code}CHANN-DOC-PAY/" },
  { method: "Doctor cancel", description: "Doctor payment cancellation", prefix: "{code}CHANN-DOC-REF/" },
  { method: "Debit note (agency)", description: "Agency ledger debit", prefix: "{code}CHANN-AGN-DN/" },
  { method: "Credit note (agency)", description: "Agency ledger credit", prefix: "{code}CHANN-AGN-CN/" },
  { method: "Agency deposit", description: "Agency deposit", prefix: "{code}CHANN-AGN-DP/" },
  { method: "Agency withdraw", description: "Agency withdrawal", prefix: "{code}CHANN-AGN-WD/" },
  { method: "Branch income", description: "Branch income", prefix: "{code}CHANN-INC/" },
  { method: "Branch expense", description: "Branch expense", prefix: "{code}CHANN-EXP/" },
];

export function ReceiptSequenceHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Receipt number sequences (for auditors)">
          <Info className="h-4 w-4" />
          <span className="sr-only">Receipt sequences help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="p-3 border-b bg-muted/50">
          <h4 className="font-medium text-sm">Receipt number sequences</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use this when exporting receipts for audit. <code className="bg-muted px-1 rounded">{`{code}`}</code> = location shortcode (e.g. RH). Global receipts use <code className="bg-muted px-1 rounded">REC-</code>.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 font-medium">Method</th>
                <th className="text-left p-2 font-medium">Prefix pattern</th>
              </tr>
            </thead>
            <tbody>
              {SEQUENCE_ROWS.map((row) => (
                <tr key={row.method} className="border-b last:border-0">
                  <td className="p-2">
                    <span className="font-medium">{row.method}</span>
                    <br />
                    <span className="text-muted-foreground">{row.description}</span>
                  </td>
                  <td className="p-2 font-mono text-muted-foreground">{row.prefix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PopoverContent>
    </Popover>
  );
}
