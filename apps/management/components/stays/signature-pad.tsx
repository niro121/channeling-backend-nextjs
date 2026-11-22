'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, Loader2, PenLine } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { checklistPhotoUrl, uploadChecklistPhoto } from './photos';

/** Draw a signature with a finger; saved as an image and stored like a photo. */
export function SignaturePad({
  value,
  onChange,
  stayId
}: {
  value: string | null;
  onChange: (key: string | null) => void;
  stayId?: string | null;
}) {
  const { toast } = useToast();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [editing, setEditing] = useState(!value);
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.offsetWidth, c.offsetHeight);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    setHasInk(false);
  };

  useEffect(() => {
    if (editing) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const save = async () => {
    const c = canvas.current;
    if (!c) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not read the signature.');
      onChange(await uploadChecklistPhoto(blob, { shrinkFirst: false }));
      setEditing(false);
    } catch (e) {
      toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Could not save signature' });
    } finally {
      setSaving(false);
    }
  };

  if (!editing && value) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={checklistPhotoUrl(value, stayId)} alt="Signature" className="h-24 w-full rounded-xl border bg-white object-contain" />
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            onChange(null);
            setEditing(true);
          }}
        >
          <PenLine className="h-4 w-4" /> Sign again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        className="h-36 w-full touch-none rounded-xl border border-dashed bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = e.currentTarget.getContext('2d');
          const p = point(e);
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext('2d');
          const p = point(e);
          ctx?.lineTo(p.x, p.y);
          ctx?.stroke();
          if (!hasInk) setHasInk(true);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="rounded-xl" disabled={!hasInk || saving} onClick={reset}>
          <Eraser className="h-4 w-4" /> Clear
        </Button>
        <Button size="sm" className="rounded-xl" disabled={!hasInk || saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Save signature
        </Button>
      </div>
    </div>
  );
}
