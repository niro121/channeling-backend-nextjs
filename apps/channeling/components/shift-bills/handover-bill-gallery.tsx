"use client"

import { useState } from "react"
import { ZoomIn } from "lucide-react"
import { SHIFT_BILL_KIND_LABELS, shiftBillUploaderTag, type ShiftBillAttachmentDto } from "@/types/shift-bill-attachment"
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
        {items.map((item) => {
          const label = item.kind ? SHIFT_BILL_KIND_LABELS[item.kind] : "Bill"
          return (
            <div key={item.id} className="relative overflow-hidden rounded-md border bg-muted">
              <button
                type="button"
                className="block aspect-square w-full"
                onClick={() => setLightboxId(item.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbUrl}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              </button>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="min-w-0 truncate text-xs font-medium">
                  {label}
                  <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-foreground">
                    {shiftBillUploaderTag(item)}
                  </span>
                </span>
                <a
                  href={item.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open large view in a new tab"
                  className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  View
                </a>
              </div>
            </div>
          )
        })}
      </div>
      <ShiftBillLightbox item={lightboxItem} onClose={() => setLightboxId(null)} />
    </>
  )
}
