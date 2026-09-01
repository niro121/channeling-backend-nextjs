"use client"

import { useState } from "react"
import { SHIFT_BILL_KIND_LABELS, type ShiftBillAttachmentDto } from "@/types/shift-bill-attachment"
import { ShiftBillLightbox } from "@/components/shift-bills/shift-bill-lightbox"

export function HandoverBillGallery({ items }: { items: ShiftBillAttachmentDto[] }) {
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const lightboxItem = items.find((item) => item.id === lightboxId) ?? null

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No bill photos were attached to this handover.</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="overflow-hidden rounded-md border bg-muted aspect-square"
            onClick={() => setLightboxId(item.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbUrl}
              alt={item.kind ? SHIFT_BILL_KIND_LABELS[item.kind] : "Bill"}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      <ShiftBillLightbox item={lightboxItem} onClose={() => setLightboxId(null)} />
    </>
  )
}
