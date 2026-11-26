'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { reissueRoomCodeAction } from '@/app/actions/room-ayu.actions';
import { RoomCard, type RoomCardData } from './room-card';

const HOSPITAL = process.env.NEXT_PUBLIC_BRAND_NAME ? `${process.env.NEXT_PUBLIC_BRAND_NAME} Hospital` : 'Ruhunu Hospital';
// A5 in mm, and the on-screen preview scale.
const A5 = { w: 148, h: 210 };
const PREVIEW = 0.5;

/** Draws a card at print resolution and adds it to `pdf` as a full A5 page. */
async function addCardPage(pdf: import('jspdf').jsPDF, el: HTMLElement, first: boolean) {
  const html2canvas = (await import('html2canvas')).default;
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    // fonts not ready: draw anyway
  }
  const canvas = await html2canvas(el, {
    scale: 4,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    // html2canvas draws text in a filled pill or circle a little low; lift those labels in its copy only.
    onclone: (doc) => {
      doc.querySelectorAll<HTMLElement>('[data-pdf-lift]').forEach((n) => {
        n.style.position = 'relative';
        n.style.top = '-0.9mm';
      });
      // The big room number drifts most (about 3 mm at that size).
      doc.querySelectorAll<HTMLElement>('[data-pdf-lift-lg]').forEach((n) => {
        n.style.position = 'relative';
        n.style.top = '-3mm';
      });
      doc.querySelectorAll<HTMLElement>('[data-pdf-drop]').forEach((n) => {
        n.style.position = 'relative';
        n.style.top = '0.9mm';
      });
    },
  });
  if (!first) pdf.addPage('a5', 'portrait');
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A5.w, A5.h);
}

async function newPdf() {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });
}

export function RoomQrSheet({
  rooms: initialRooms,
  baseUrl,
  locations,
  zones,
  locationId,
  zoneId,
  canReissue,
}: {
  rooms: RoomCardData[];
  baseUrl: string;
  locations: { id: string; name: string }[];
  zones: { id: string; name: string }[];
  locationId: string | null;
  zoneId: string | null;
  canReissue: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [rooms, setRooms] = useState(initialRooms);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  // The full-size cards (off screen) that PDFs are drawn from.
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const go = (next: { locationId?: string | null; zoneId?: string | null }) => {
    const sp = new URLSearchParams();
    const loc = next.locationId !== undefined ? next.locationId : locationId;
    const zone = next.zoneId !== undefined ? next.zoneId : zoneId;
    if (loc) sp.set('locationId', loc);
    if (zone) sp.set('zoneId', zone);
    router.push(`${pathname}?${sp}`);
  };

  const reissue = (room: RoomCardData) => {
    if (!window.confirm(`Make a new code for Room ${room.number}? The card already in the room will stop working.`)) return;
    setBusy(room.roomId);
    startTransition(async () => {
      const res = await reissueRoomCodeAction(room.roomId);
      setBusy(null);
      toast({ variant: res.success ? 'default' : 'destructive', title: res.message ?? (res.success ? 'Done' : 'Failed') });
      if (res.success && res.data) setRooms((prev) => prev.map((r) => (r.roomId === room.roomId ? { ...r, code: res.data!.code } : r)));
    });
  };

  const download = async (list: RoomCardData[], fileName: string, key: string) => {
    setDownloading(key);
    try {
      const pdf = await newPdf();
      for (let i = 0; i < list.length; i++) {
        const el = cardRefs.current.get(list[i].roomId);
        if (el) await addCardPage(pdf, el, i === 0);
      }
      pdf.save(fileName);
    } catch (e) {
      console.error('[room-qr] pdf failed', e);
      toast({ variant: 'destructive', title: 'Could not make the PDF. Try again, or use Print.' });
    } finally {
      setDownloading(null);
    }
  };

  const safe = (s: string) => s.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '');

  return (
    <div className="mx-auto max-w-6xl p-6 print:m-0 print:max-w-none print:p-0">
      <style>{`@page { size: A5 portrait; margin: 0; } @media print { html, body { background: #fff; } .room-card-page { break-after: page; } .room-card-page:last-child { break-after: auto; } }`}</style>

      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rooms">
            <ArrowLeft className="size-4" /> Rooms
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">In-room Ayu cards</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={locationId ?? undefined} onValueChange={(v) => go({ locationId: v, zoneId: null })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zoneId ?? 'all'} onValueChange={(v) => go({ zoneId: v === 'all' ? null : v })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!rooms.length || downloading !== null}
            onClick={() => void download(rooms, `ayu-room-cards${rooms.length > 1 ? '' : `-room-${safe(rooms[0]?.number ?? '')}`}.pdf`, 'all')}
          >
            {downloading === 'all' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download all ({rooms.length})
          </Button>
          <Button onClick={() => window.print()} disabled={!rooms.length}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
        <p className="w-full text-sm text-muted-foreground">
          A5 cards, one per room. Patients scan, confirm their phone, then chat with Ayu and ask for things; requests appear on the stay
          for GROs. Each code is random, so another room&apos;s code can&apos;t be guessed.
        </p>
      </div>

      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rooms here.</p>
      ) : (
        <>
          {/* ==== ON SCREEN: small previews with their own buttons ==== */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-6 print:hidden">
            {rooms.map((r) => {
              const url = `${baseUrl}/room/${r.code}`;
              return (
                <div key={r.roomId} className="flex flex-col items-center gap-2">
                  <div
                    className="overflow-hidden rounded-xl border shadow-sm"
                    style={{ width: `${A5.w * PREVIEW}mm`, height: `${A5.h * PREVIEW}mm` }}
                  >
                    <div style={{ transform: `scale(${PREVIEW})`, transformOrigin: 'top left' }}>
                      <RoomCard room={r} url={url} hospital={HOSPITAL} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloading !== null}
                      onClick={() => void download([r], `ayu-room-${safe(r.number)}.pdf`, r.roomId)}
                    >
                      {downloading === r.roomId ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
                    </Button>
                    {canReissue && (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => reissue(r)} title="Make a new code (the old card stops working)">
                        {busy === r.roomId ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} New code
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ==== FULL SIZE: what Print uses, and what the PDFs are drawn from (kept off screen) ==== */}
          <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 print:static print:left-auto print:pointer-events-auto">
            {rooms.map((r) => (
              <div key={r.roomId} className="room-card-page">
                <RoomCard
                  ref={(el) => {
                    if (el) cardRefs.current.set(r.roomId, el);
                    else cardRefs.current.delete(r.roomId);
                  }}
                  room={r}
                  url={`${baseUrl}/room/${r.code}`}
                  hospital={HOSPITAL}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
