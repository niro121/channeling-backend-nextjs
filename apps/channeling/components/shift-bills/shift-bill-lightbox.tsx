"use client"

import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SHIFT_BILL_KIND_LABELS,
  type ShiftBillAttachmentDto,
} from "@/types/shift-bill-attachment"

export function ShiftBillLightbox({
  item,
  onClose,
  onDelete,
}: {
  item: ShiftBillAttachmentDto | null
  onClose: () => void
  onDelete?: () => void
}) {
  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-3xl w-full"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.viewUrl}
          alt={item.kind ? SHIFT_BILL_KIND_LABELS[item.kind] : "Bill photo"}
          className="max-h-[80vh] w-full rounded-md object-contain"
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-white">
          <span className="truncate">
            {item.kind ? SHIFT_BILL_KIND_LABELS[item.kind] : "Bill"}
            {item.note ? ` · ${item.note}` : ""}
          </span>
          <div className="flex items-center gap-1">
            {onDelete && (
              <Button type="button" size="sm" variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button type="button" size="icon" variant="secondary" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
