'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BellRing } from 'lucide-react';

/**
 * One A5 card (148 × 210 mm) for a room: Ayu, the QR, three short steps.
 * Sinhala, with English only where people say it that way. Plain hex colours and inline styles on
 * purpose: the PDF download draws this with html2canvas, which can't read Tailwind's oklch palette.
 */
const GREEN = '#1f7a4d';
const GREEN_DARK = '#14532d';
const INK = '#18201c';
const MUTED = '#62716a';
const SINHALA = "'Noto Sans Sinhala', 'Iskoola Pota', 'Sinhala Sangam MN', 'Sinhala MN', system-ui, sans-serif";

const STEPS = ['Phone camera එකෙන් QR එක scan කරන්න', 'ඔබේ phone number එක තහවුරු කරන්න', 'ඔබට අවශ්‍ය දේ Ayu ගෙන් අහන්න'];

export type RoomCardData = { roomId: string; number: string; zone: string | null; branch: string | null; code: string };

export const RoomCard = forwardRef<HTMLDivElement, { room: RoomCardData; url: string; hospital: string }>(function RoomCard(
  { room, url, hospital },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: '148mm',
        height: '210mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: INK,
        fontFamily: SINHALA,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ==== HEADER ==== */}
      <div style={{ background: GREEN_DARK, color: '#ffffff', padding: '6mm 10mm', display: 'flex', alignItems: 'center', gap: '6mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ayu-portrait.png"
          alt="Ayu"
          crossOrigin="anonymous"
          style={{ width: '28mm', height: '28mm', borderRadius: '50%', border: '1mm solid #ffffff', objectFit: 'cover', flexShrink: 0, background: '#ffffff' }}
        />
        <div>
          <div style={{ fontSize: '8.5mm', fontWeight: 700, lineHeight: 1.25 }}>ආයුබෝවන්! මම Ayu</div>
          <div style={{ fontSize: '4.2mm', lineHeight: 1.4, opacity: 0.9, marginTop: '1mm' }}>ඔබේ කාමර සේවා සහායිකාව</div>
          <div style={{ fontSize: '3mm', letterSpacing: '0.5mm', textTransform: 'uppercase', opacity: 0.7, marginTop: '2.5mm', fontFamily: 'system-ui, sans-serif' }}>
            {hospital}
          </div>
        </div>
      </div>

      {/* ==== ROOM + QR ==== */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '5mm' }}>
        <div style={{ fontSize: '4mm', color: MUTED, lineHeight: 1.3 }}>කාමර අංකය</div>
        <div data-pdf-lift-lg style={{ fontSize: '14mm', fontWeight: 800, color: GREEN_DARK, lineHeight: 1.1, fontFamily: 'system-ui, sans-serif' }}>{room.number}</div>
        <div style={{ marginTop: '6mm', padding: '3mm', border: '0.6mm solid #d6e7dd', borderRadius: '5mm' }}>
          <QRCodeSVG value={url} size={260} level="M" marginSize={0} fgColor={INK} style={{ width: '60mm', height: '60mm', display: 'block' }} />
        </div>
        <div style={{ marginTop: '6mm', fontSize: '4.8mm', fontWeight: 600, textAlign: 'center', lineHeight: 1.45, color: GREEN_DARK, padding: '0 12mm' }}>
          ඔබට ඕනෑම දෙයක් අවශ්‍ය නම්, Ayu ගෙන් අහන්න
        </div>
      </div>

      {/* ==== STEPS ==== */}
      <div style={{ marginTop: '6mm', display: 'flex', justifyContent: 'center' }}>
        <div>
        {STEPS.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '2.2mm' }}>
            <span style={{ width: '5mm', fontSize: '4.6mm', fontWeight: 800, color: GREEN, lineHeight: 1.4, fontFamily: 'system-ui, sans-serif', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: '3.8mm', lineHeight: 1.4 }}>{step}</span>
          </div>
        ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ==== CALL BELL ==== */}
      <div style={{ borderTop: '0.4mm solid #e7ece9', padding: '4.5mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5mm' }}>
        <span data-pdf-drop style={{ display: 'block', flexShrink: 0 }}>
          <BellRing color="#b42318" strokeWidth={2} style={{ width: '4.8mm', height: '4.8mm', display: 'block' }} />
        </span>
        <span data-pdf-lift style={{ fontSize: '3.6mm', color: '#b42318', fontWeight: 600, lineHeight: 1.4 }}>හදිසි අවස්ථාවකදී ඇඳ අසල call bell එක ඔබන්න</span>
      </div>
    </div>
  );
});
