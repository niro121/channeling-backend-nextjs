"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import {
  confirmShiftBillUploadAction,
  deleteShiftBillAttachmentAction,
  listMyShiftBillAttachmentsAction,
  requestShiftBillUploadAction,
} from "@/app/actions/shift-bill-attachment.actions"
import { getCurrentShiftAction } from "@/app/actions/shift.actions"
import { SHIFT_STATUS } from "@/types/shift"
import {
  SHIFT_BILL_KIND_LABELS,
  SHIFT_BILL_KINDS,
  SHIFT_BILL_MAX_BYTES,
  type ShiftBillAttachmentDto,
  type ShiftBillKind,
} from "@/types/shift-bill-attachment"
import { cn } from "@/lib/utils"
import { compressBillImage } from "@/lib/compress-bill-image"
import { ShiftBillLightbox } from "@/components/shift-bills/shift-bill-lightbox"

type ShiftBillsGalleryProps = {
  canUpload: boolean
  emptyHint?: string
  onCountChange?: (count: number) => void
}

export function ShiftBillsGallery({ canUpload, emptyHint, onCountChange }: ShiftBillsGalleryProps) {
  const { toast } = useToast()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<ShiftBillAttachmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [kind, setKind] = useState<ShiftBillKind | "">("")
  const [lightboxId, setLightboxId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await listMyShiftBillAttachmentsAction()
    if (!result.success) {
      toast({ title: result.error, variant: "destructive" })
      return
    }
    setItems(result.data)
    onCountChange?.(result.data.length)
  }, [onCountChange, toast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listMyShiftBillAttachmentsAction()
      .then((result) => {
        if (cancelled) return
        if (result.success) {
          setItems(result.data)
          onCountChange?.(result.data.length)
        } else {
          toast({ title: result.error, variant: "destructive" })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onCountChange, toast])

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !canUpload || uploading) return
    const current = await getCurrentShiftAction().catch(() => null)
    if (!current || current.status !== SHIFT_STATUS.ACTIVE) {
      toast({
        title:
          current?.status === SHIFT_STATUS.PAUSED
            ? "Shift is paused. Resume it before photographing bills."
            : current?.status === SHIFT_STATUS.HANDOVER_PENDING
              ? "Handover is pending. New photos are locked."
              : "Start an active shift before photographing bills.",
        variant: "destructive",
      })
      return
    }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Please choose an image.", variant: "destructive" })
          continue
        }
        const blob = await compressBillImage(file)
        if (blob.size > SHIFT_BILL_MAX_BYTES) {
          toast({ title: "Image is still too large after compression.", variant: "destructive" })
          continue
        }
        const requested = await requestShiftBillUploadAction({
          contentType: "image/jpeg",
          sizeBytes: blob.size,
          kind: kind || null,
          note: null,
        })
        if (!requested.success) {
          toast({ title: requested.error, variant: "destructive" })
          continue
        }
        const put = await fetch(requested.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        })
        if (!put.ok) {
          toast({ title: "Upload to storage failed. Try again.", variant: "destructive" })
          continue
        }
        const confirmed = await confirmShiftBillUploadAction(requested.attachment.id)
        if (!confirmed.success) {
          toast({ title: confirmed.error, variant: "destructive" })
          continue
        }
      }
      await refresh()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not upload photo.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ""
      if (libraryInputRef.current) libraryInputRef.current.value = ""
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteShiftBillAttachmentAction(id)
    if (!result.success) {
      toast({ title: result.error, variant: "destructive" })
      return
    }
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id)
      onCountChange?.(next.length)
      return next
    })
    if (lightboxId === id) setLightboxId(null)
  }

  const lightboxItem = items.find((item) => item.id === lightboxId) ?? null

  return (
    <div className={cn(canUpload && "pb-36")}>
      {canUpload && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SHIFT_BILL_KINDS.map((value) => {
            const selected = kind === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setKind(selected ? "" : value)}
                className={cn(
                  "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {SHIFT_BILL_KIND_LABELS[value]}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Camera className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {emptyHint ?? "No bill photos on this shift yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-lg bg-muted">
              <button
                type="button"
                className="block aspect-square w-full"
                onClick={() => setLightboxId(item.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbUrl}
                  alt={item.kind ? SHIFT_BILL_KIND_LABELS[item.kind] : "Bill"}
                  className="h-full w-full object-cover"
                />
              </button>
              {canUpload && !item.handoverId && (
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {item.kind ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-1 text-[10px] font-medium text-white">
                  {SHIFT_BILL_KIND_LABELS[item.kind]}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              disabled={uploading}
              className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full text-muted-foreground disabled:opacity-50"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-[10px] font-medium">Album</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-50"
              aria-label="Take photo"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Camera className="h-8 w-8" />
              )}
            </button>
            <div className="flex h-14 w-14 flex-col items-center justify-center text-muted-foreground">
              <span className="text-lg font-semibold tabular-nums leading-none">{items.length}</span>
              <span className="text-[10px] font-medium">photos</span>
            </div>
          </div>
        </div>
      )}

      <ShiftBillLightbox
        item={lightboxItem}
        onClose={() => setLightboxId(null)}
        onDelete={
          canUpload && lightboxItem && !lightboxItem.handoverId
            ? () => handleDelete(lightboxItem.id)
            : undefined
        }
      />
    </div>
  )
}
