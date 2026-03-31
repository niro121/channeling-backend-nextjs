'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import {
  exportAgentBalanceConfirmationLetterData,
  getAgentBalanceConfirmationLetterData,
} from '@/app/actions/reports/agent.balance.confirmation.letter.action';
import Loading from '@/app/(dashboard)/loading';
import {
  AgentBalanceConfirmationLetterContentProps,
  AgentBalanceConfirmationLetterExportRow,
  AgentBalanceConfirmationLetterRow,
} from '@/types/reports/agent.balance.confirmation.letter';
import { AgentBalanceConfirmationLetterColumns } from './columns';

const SINHALA_FONT_VFS_NAME = 'NotoSansSinhala-Regular.ttf';
const SINHALA_FONT_FAMILY = 'NotoSansSinhala';
let sinhalaFontLoaded = false;

function getTodayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function letterLabels(language: string) {
  const isSinhala = language === 'si' || language.toLowerCase() === 'sinhala';
  if (isSinhala) {
    return {
      greetingNameFallback: 'කුලමනාකාරතුමනි,',
      greeting: 'මහත්මයාණනි,',
      title: 'ශේෂ තහවුරු සහතිකය',
      body: 'අප ආයතනයේ පවත්වාගෙන යනු ලබන පහත සඳහන් නියෝජිත ගිණුමේ දිනට ශේෂය පහත පරිදි වේ.',
      nameOfAgent: 'නියෝජිත නාමය',
      agentCode: 'නියෝජිත අංකය',
      balanceAsAtDate: 'ශේෂය',
      footer1: 'ස්තුතියි.',
      footer2: 'මෙයට,',
      footer3: 'විශ්වාසී,',
      footer4: 'ගණකාධිකාරී - රුහුණු රෝහල් කාර්යාලය.',
    };
  }

  return {
    greetingNameFallback: '',
    greeting: 'Dear Sir/s,',
    title: 'CERTIFICATE OF BALANCE',
    body: 'We hereby certify that the balance in the below mentioned Agent account maintained with us, as at close of business on was as follows.',
    nameOfAgent: 'Name of Agent',
    agentCode: 'Agent Code',
    balanceAsAtDate: 'Balance as at date',
    footer1: 'Yours faithfully,',
    footer2: '................',
    footer3: 'Accountant.',
    footer4: 'Ruhunu Hospital (Pvt.) Ltd.',
  };
}

function getLangCode(language: string): 'en' | 'si' {
  const l = language?.toLowerCase?.() ?? '';
  if (l === 'si' || l === 'sinhala' || l.includes('sinhala')) return 'si';
  return 'en';
}

function buildLetterHtml(title: string, row: AgentBalanceConfirmationLetterExportRow): string {
  const code = getLangCode(row.language);
  const t = letterLabels(code);
  const isSinhala = code === 'si';

  const greetingName = (row.agentName?.trim() ? row.agentName.trim() : (t as any).greetingNameFallback) || '-';
  const asAtDate = row.asAtDate || '';
  const body = t.body.replace(' on was ', ` on ${asAtDate} was `);

  const balanceText = typeof row.balance === 'string' ? row.balance : Number(row.balance ?? 0).toFixed(2);

  const fontStack = isSinhala ? `'NotoSansSinhala', serif` : `'Helvetica', 'Arial', sans-serif`;

  return `
    <div style="
      width: 794px;
      background: #ffffff;
      padding: 28px 24px;
      box-sizing: border-box;
      font-family: ${fontStack};
      font-size: 14px;
      line-height: 1.8;
      color: #000;
      min-height: 720px;
    ">
      <div style="text-align: left;">
        <div style="font-size: 16px;">${escapeHtml(greetingName)}</div>
        <div style="font-size: 16px;">,</div>
        <div style="font-size: 16px; margin-top: 8px;">${escapeHtml(asAtDate)}</div>
        <div style="font-size: 16px; margin-top: 8px;">${escapeHtml(t.greeting)}</div>
      </div>

      <div style="text-align:center; margin-top: 36px;">
        <div style="font-weight: 700; text-decoration: underline; font-size: 16px;">${escapeHtml(t.title)}</div>
      </div>

      <div style="text-align:center; margin-top: 22px; font-size: 14px;">
        ${escapeHtml(body)}
      </div>

      <div style="margin-top: 48px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; font-weight: 700;">
        <div>${escapeHtml(t.nameOfAgent)}</div>
        <div style="text-align: center;">${escapeHtml(t.agentCode)}</div>
        <div style="text-align: right;">${escapeHtml(t.balanceAsAtDate)}</div>
      </div>

      <div style="margin-top: 8px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px;">
        <div>${escapeHtml(row.agentName || '-')}</div>
        <div style="text-align: center;">${escapeHtml(row.agentCode || '-')}</div>
        <div style="text-align: right;">${escapeHtml(balanceText)}</div>
      </div>

      <div style="margin-top: 44px;">
        <div>${escapeHtml(t.footer1)}</div>
        <div style="margin-top: 14px;">${escapeHtml(t.footer2)}</div>
        <div style="margin-top: 14px;">${escapeHtml(t.footer3)}</div>
        <div style="margin-top: 14px;">${escapeHtml(t.footer4)}</div>
      </div>
    </div>
  `;
}

function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function downloadLetterPdfViaHtml2Canvas(title: string, row: AgentBalanceConfirmationLetterExportRow, fileName?: string) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.background = '#fff';
  container.innerHTML = buildLetterHtml(title, row);
  document.body.appendChild(container);

  // Ensure fonts are loaded for sharper Sinhala rendering.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts: any = (document as any).fonts;
    if (fonts?.ready) await fonts.ready;
  } catch {
    // Ignore font readiness errors; html2canvas will still render.
  }

  const canvas = await html2canvas(container, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  container.remove();

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210; // A4 portrait width in mm
  const pageMargin = 10;
  const imgWidth = pageWidth - pageMargin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', pageMargin, 10, imgWidth, imgHeight);
  pdf.save(fileName || 'Agent Balance Confirmation Letter.pdf');
}

async function openLetterPrintWindowViaHtml(title: string, row: AgentBalanceConfirmationLetterExportRow) {
  const htmlBody = buildLetterHtml(title, row);
  const langCode = getLangCode(row.language);
  const fontFaceCss =
    langCode === 'si'
      ? `
    @font-face {
      font-family: 'NotoSansSinhala';
      src: url('/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }`
      : '';

  const docHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0; padding: 0; background: #fff; }
          body { font-family: ${langCode === 'si' ? "'NotoSansSinhala', serif" : "Arial, sans-serif"}; }
          ${fontFaceCss}
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(docHtml);
  win.document.close();
  win.focus();
  win.print();
}

async function ensureSinhalaFont(doc: jsPDF) {
  if (sinhalaFontLoaded) return;

  const response = await fetch('/fonts/NotoSansSinhala-Regular.ttf');
  if (!response.ok) {
    throw new Error('Failed to load Sinhala font file for PDF export.');
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  // jsPDF custom font API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsDoc = doc as any;
  jsDoc.addFileToVFS(SINHALA_FONT_VFS_NAME, binary);
  jsDoc.addFont(SINHALA_FONT_VFS_NAME, SINHALA_FONT_FAMILY, 'normal');
  sinhalaFontLoaded = true;
}

async function buildLetterPdf(title: string, row: AgentBalanceConfirmationLetterExportRow): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const margin = 18;
  const pageWidth =
    (typeof doc.internal.pageSize.getWidth === 'function'
      ? doc.internal.pageSize.getWidth()
      : doc.internal.pageSize.width) ?? 210;

  const t = letterLabels(row.language);
  const isSinhala = row.language === 'si' || row.language.toLowerCase() === 'sinhala';
  if (isSinhala) {
    await ensureSinhalaFont(doc);
    doc.setFont(SINHALA_FONT_FAMILY, 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }
  let y = 20;

  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 16;

  if (row.agentName?.trim()) {
    doc.setFontSize(11);
    doc.text(row.agentName, margin, y);
    y += 7;
  }
  if (row.address?.trim()) {
    const wrappedAddress = doc.splitTextToSize(row.address, pageWidth - margin * 2);
    doc.text(wrappedAddress as string[], margin, y);
    y += wrappedAddress.length * 6 + 2;
  }

  if (row.asAtDate?.trim()) {
    doc.text(row.asAtDate, margin, y);
    y += 10;
  }

  doc.text(t.greeting, margin, y);
  y += 12;

  doc.setFontSize(12);
  doc.text(t.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  const body = t.body.replace(' on was ', ` on ${row.asAtDate} was `);
  const wrappedBody = doc.splitTextToSize(body, pageWidth - margin * 2);
  doc.text(wrappedBody as string[], margin, y);
  y += wrappedBody.length * 6 + 10;

  doc.setFontSize(11);
  doc.text(t.nameOfAgent, margin, y);
  doc.text(t.agentCode, margin + 105, y);
  doc.text(t.balanceAsAtDate, pageWidth - margin, y, { align: 'right' });
  y += 9;

  doc.text(row.agentName || '-', margin, y);
  doc.text(row.agentCode || '-', margin + 105, y);
  doc.text(row.balance || '0.00', pageWidth - margin, y, { align: 'right' });
  y += 22;

  doc.text(t.footer1, margin, y);
  y += 12;
  doc.text(t.footer2, margin, y);
  y += 10;
  doc.text(t.footer3, margin, y);
  y += 10;
  doc.text(t.footer4, margin, y);

  return doc;
}

function AgentBalanceConfirmationLetterContentInner({
  agentOptions,
}: AgentBalanceConfirmationLetterContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    agentId:
      searchParams.get('agentId') && searchParams.get('agentId') !== '__all__'
        ? (searchParams.get('agentId') ?? undefined)
        : undefined,
    asAtDate: searchParams.get('asAtDate') ?? getTodayDate(),
    language: (searchParams.get('language') === 'si' ? 'si' : 'en') as 'en' | 'si',
  });

  return (
    <ReportTemplate<AgentBalanceConfirmationLetterRow, AgentBalanceConfirmationLetterExportRow>
      title="Agent Balance Confirmation Letter"
      description="Generate certificate letter for selected agent balance as at a selected date."
      filterButtonLabel="Search"
      initialFilterValues={{
        asAtDate: getTodayDate(),
        language: 'en',
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <Combobox
            label="Select Agent"
            options={agentOptions}
            value={values.agentId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('agentId', v)}
          />
          <div className="min-h-[68px] flex flex-col justify-end w-[260px]">
            <label className="text-sm text-black font-semibold mb-2 block">Date</label>
            <input
              type="date"
              value={values.asAtDate ?? getTodayDate()}
              onChange={(e) => setValue('asAtDate', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <Selector
            label="Language"
            showDefaultOption={false}
            options={[
              { id: 'en', name: 'English' },
              { id: 'si', name: 'Sinhala' },
            ]}
            value={values.language ?? 'en'}
            onChange={(v) => setValue('language', v)}
          />
        </div>
      )}
      fetchData={async (params) => {
        const query = {
          agentId:
            params.get('agentId') && params.get('agentId') !== '__all__'
              ? (params.get('agentId') ?? undefined)
              : undefined,
          asAtDate: params.get('asAtDate') ?? getTodayDate(),
          language: (params.get('language') === 'si' ? 'si' : 'en') as 'en' | 'si',
        };
        return getAgentBalanceConfirmationLetterData(query);
      }}
      exportData={async () => exportAgentBalanceConfirmationLetterData(buildQuery())}
      columns={AgentBalanceConfirmationLetterColumns}
      exportColumns={['Language', 'As At Date', 'Agent Name', 'Agent Code', 'Address', 'Balance']}
      exportKeys={
        ['language', 'asAtDate', 'agentName', 'agentCode', 'address', 'balance'] as (keyof AgentBalanceConfirmationLetterExportRow)[]
      }
      exportTitle="Agent Balance Confirmation Letter"
      exportFileName="agent-balance-confirmation-letter"
      customDownloadPdf={async ({ title, data, fileName }) => {
        const row = data?.[0];
        if (!row) return;
        const langCode = getLangCode(row.language);
        // Use HTML->canvas->PDF for Sinhala for crisp glyph rendering.
        if (langCode === 'si') {
          await downloadLetterPdfViaHtml2Canvas(title, row, fileName);
          return;
        }
        const doc = await buildLetterPdf(title, row);
        doc.save(fileName || 'Agent Balance Confirmation Letter.pdf');
      }}
      customPrintPdf={async ({ title, data }) => {
        const row = data?.[0];
        if (!row) return;
        const langCode = getLangCode(row.language);
        // Print via HTML to preserve Sinhala shaping and layout.
        if (langCode === 'si') {
          await openLetterPrintWindowViaHtml(title, row);
          return;
        }
        const doc = await buildLetterPdf(title, row);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsDoc = doc as any;
        if (typeof jsDoc.autoPrint === 'function') {
          jsDoc.autoPrint({ variant: 'non-conform' });
        }
        window.open(doc.output('bloburl'), '_blank');
      }}
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No data available."
    />
  );
}

export default function AgentBalanceConfirmationLetterContent(
  props: AgentBalanceConfirmationLetterContentProps
) {
  return (
    <Suspense fallback={<Loading />}>
      <AgentBalanceConfirmationLetterContentInner {...props} />
    </Suspense>
  );
}
