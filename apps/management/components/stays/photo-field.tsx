'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { checklistPhotoUrl, uploadChecklistPhoto } from './photos';

/** Thumbnails of taken photos plus a camera button. */
export function PhotoField({
  value,
  onChange,
  stayId,
  max = 6,
  compact = false,
  disabled = false
}: {
  value: string[];
  onChange: (keys: string[]) => void;
  stayId?: string | null;
  max?: number;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  const add = async (files: FileList | null) => {
    const list = [...(files ?? [])].slice(0, Math.max(0, max - value.length));
    if (!list.length) return;
    setBusy((n) => n + list.length);
    const keys: string[] = [];
    for (const f of list) {
      try {
        keys.push(await uploadChecklistPhoto(f));
      } catch (e) {
        toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Upload failed' });
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (keys.length) onChange([...value, ...keys]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((k) => (
        <div key={k} className={cn('relative overflow-hidden rounded-xl border', compact ? 'h-12 w-12' : 'h-16 w-16')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={checklistPhotoUrl(k, stayId)} alt="" className="h-full w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== k))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {Array.from({ length: busy }).map((_, i) => (
        <div key={`b${i}`} className={cn('flex items-center justify-center rounded-xl border', compact ? 'h-12 w-12' : 'h-16 w-16')}>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ))}
      {value.length + busy < max && !disabled && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl border border-dashed text-sm font-medium text-muted-foreground active:bg-muted',
            compact ? 'h-12 px-3' : 'h-16 px-4'
          )}
        >
          <Camera className="h-4 w-4" /> {value.length ? 'Add' : 'Photo'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
