"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  CHANNEL_APPROVAL_CONFIRMATIONS,
  type ChannelApprovalConfirmationId,
  type ChannelApprovalConfirmations,
} from "@/types/approval-request"

export type RefundCancelConfirmationId = ChannelApprovalConfirmationId
export type RefundCancelConfirmationsState = ChannelApprovalConfirmations

export function requiredRefundCancelConfirmationChecked(value: ChannelApprovalConfirmations): boolean {
  return value.bill
}

export function RefundCancelConfirmations({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: ChannelApprovalConfirmations
  onChange: (id: ChannelApprovalConfirmationId, checked: boolean) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Confirm before requesting approval
      </Label>
      <div className="rounded-md border border-border/60 bg-muted/10 p-2.5 space-y-2">
        {CHANNEL_APPROVAL_CONFIRMATIONS.map((item) => {
          const inputId = `${idPrefix}-${item.id}`
          return (
            <div key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={inputId}
                checked={value[item.id]}
                onCheckedChange={(checked) => onChange(item.id, checked === true)}
                className="mt-0.5"
              />
              <label htmlFor={inputId} className="text-xs text-foreground cursor-pointer leading-snug">
                {item.label}
                {item.required ? <span className="text-destructive"> *</span> : null}
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
