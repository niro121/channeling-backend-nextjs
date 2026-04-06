'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

function formatAmount(amount: unknown): string {
  const num =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
      ? Number(amount)
      : Number.NaN;
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

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
      greetingNameFallback: 'කළමනාකාරතුමා,',
      greeting: 'මහත්මයාණෙනි,',
      title: 'ශේෂ තහවුරු සහතිකය',
      body: 'අප ආයතනයේ පවත්වාගෙන යනු ලබන පහත සඳහන් නියෝජිත ගිණුමේ දිනට ශේෂය පහත පරිදි වේ.',
      nameOfAgent: 'නියෝජිත නාමය',
      agentCode: 'නියෝජිත අංකය',
      balanceAsAtDate: 'ශේෂය',
      footer1: 'ස්තුතියි.',
      footer2: 'මෙයට,',
      footer3: 'විශ්වාසී,',
      footer4: '..............................',
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

  // For Sinhala, the first line must ALWAYS be the Manager salutation,
  // not the agent name. For English, this value isn't used.
  const greetingLine =
    isSinhala
      ? ((t as any).greetingNameFallback || '-')
      : ((row.agentName?.trim() ? row.agentName.trim() : (t as any).greetingNameFallback) || '-');
  const asAtDate = row.asAtDate || '';
  const headerTitle = isSinhala ? `${asAtDate} දිනට ශේෂ සහතිකය.` : t.title;
  const body = isSinhala
    ? `අප ආයතනයේ පවත්වාගෙන යනු ලබන චැනල් නියෝජිත ආයතනයේ ${asAtDate} දිනට ශේෂය පහත පරිදි වේ.`
    : t.body.replace(' on was ', ` on ${asAtDate} was `);

  const balanceText = formatAmount(row.balance ?? 0);

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
      ${isSinhala
        ? `
      <div style="text-align: left;">
        <div style="font-size: 16px;">${escapeHtml(greetingLine)}</div>
        <div style="font-size: 16px; margin-top: 2px;">${escapeHtml(row.agentName || '-')}</div>
        <div style="font-size: 16px; margin-top: 2px;">${escapeHtml(asAtDate)}</div>
        <div style="font-size: 16px; margin-top: 2px;">${escapeHtml(t.greeting)}</div>
      </div>`
        : `
      <div style="text-align: left;">
        <div style="font-size: 16px;">The Manager,</div>
        <div style="font-size: 16px; margin-top: 2px;">${escapeHtml(row.agentName || '-')}</div>
        <div style="font-size: 16px; margin-top: 2px;">${escapeHtml(asAtDate)}</div>
        <div style="font-size: 16px; margin-top: 2px;">${escapeHtml(t.greeting)}</div>
      </div>`
      }

      <div style="text-align:center; margin-top: 36px;">
        <div style="font-weight: 700; ${isSinhala ? '' : 'text-decoration: underline;'} font-size: 16px;">${escapeHtml(headerTitle)}</div>
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

      <div style="margin-top: 48px;">
        <div>${escapeHtml(t.footer1)}</div>
        <div>${escapeHtml(t.footer2)}</div>
        <div>${escapeHtml(t.footer3)}</div>
        <div>${escapeHtml(t.footer4)}</div>
        ${isSinhala ? `<div>${escapeHtml('ගණකාධිකාරී - රුහුණු රෝහල කරාපිටිය.')}</div>` : ''}
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
        <title>${langCode === 'si' ? '' : escapeHtml(title)}</title>
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

  const triggerPrint = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fonts: any = (win.document as any).fonts;
      if (fonts?.ready) {
        await fonts.ready;
      }
    } catch {
      // ignore font readiness errors
    }
    // Allow layout/paint to complete before printing
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        // ignore
      }
    }, 120);
  };

  if (win.document.readyState === 'complete') {
    void triggerPrint();
  } else {
    win.addEventListener('load', () => void triggerPrint());
  }
}

async function printLetterPdfViaHtml2Canvas(title: string, row: AgentBalanceConfirmationLetterExportRow) {
  // Render the HTML letter off-screen, rasterize at high scale, then print via jsPDF for crisp Sinhala.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.background = '#fff';
  container.innerHTML = buildLetterHtml(title, row);
  document.body.appendChild(container);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts: any = (document as any).fonts;
    if (fonts?.ready) await fonts.ready;
  } catch {
    // ignore
  }

  const canvas = await html2canvas(container, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  container.remove();

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageMargin = 10;
  const imgWidth = pageWidth - pageMargin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', pageMargin, 10, imgWidth, imgHeight);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsDoc = pdf as any;
  if (typeof jsDoc.autoPrint === 'function') {
    jsDoc.autoPrint({ variant: 'non-conform' });
  }
  window.open(pdf.output('bloburl'), '_blank');
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

  // Omit the external report title on the printable letter. We'll use the
  // centered letter title below instead.
  doc.setFontSize(13);

  if (isSinhala) {
    // Sinhala letter header format:
    // කළමනාකාරතුමා,
    // <Agency Name>
    // <Date>
    // මහත්මයාණෙනි,
    doc.setFontSize(11);
    doc.text('කළමනාකාරතුමා,', margin, y);
    y += 7;
    if (row.agentName?.trim()) {
      doc.text(row.agentName, margin, y);
      y += 7;
    }
    if (row.asAtDate?.trim()) {
      doc.text(row.asAtDate, margin, y);
      y += 10;
    }
    doc.text('මහත්මයාණෙනි,', margin, y);
    y += 12;
  } else {
    // English letter header format:
    // The Manager,
    // <Agency Name>,
    // <Date>
    // Dear Sir/s,
    doc.setFontSize(11);
    doc.text('The Manager,', margin, y);
    y += 7;
    if (row.agentName?.trim()) {
      doc.text(row.agentName, margin, y);
      y += 7;
    }
    if (row.asAtDate?.trim()) {
      doc.text(row.asAtDate, margin, y);
      y += 10;
    }
    doc.text(t.greeting, margin, y);
    y += 12;
  }

  doc.setFontSize(12);
  const headerTitleForPdf =
    isSinhala ? `${row.asAtDate ?? ''} දිනට ශේෂ සහතිකය.` : t.title;
  doc.text(headerTitleForPdf, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  const body =
    isSinhala
      ? `අප ආයතනයේ පවත්වාගෙන යනු ලබන චැනල් නියෝජිත ආයතනයේ ${row.asAtDate ?? ''} දිනට ශේෂය පහත පරිදි වේ.`
      : t.body.replace(' on was ', ` on ${row.asAtDate} was `);
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
  doc.text(formatAmount(row.balance ?? 0), pageWidth - margin, y, { align: 'right' });
  y += 22;

  // Tighter, uniform footer spacing to match preview (no extra space-y).
  doc.text(t.footer1, margin, y);
  y += 7;
  doc.text(t.footer2, margin, y);
  y += 7;
  doc.text(t.footer3, margin, y);
  y += 7;
  doc.text(t.footer4, margin, y);
  if (isSinhala) {
    y += 7;
    doc.text('ගණකාධිකාරී - රුහුණු රෝහල කරාපිටිය.', margin, y);
  }

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
            label="Agent"
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
          await printLetterPdfViaHtml2Canvas(title, row);
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
      customDownloadExcel={async ({ title, data, fileName }) => {
        const row = data?.[0];
        if (!row) return;

        const isSinhala = getLangCode(row.language) === 'si';
        const t = letterLabels(row.language);
        const asAtDate = row.asAtDate || '';

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(title || 'Sheet1');

        // Configure columns (three columns for table section; first column wide for text)
        sheet.columns = [
          { header: '', key: 'col1', width: 60 },
          { header: '', key: 'col2', width: 24 },
          { header: '', key: 'col3', width: 24 }
        ];

        let r = 1;
        // Header block
        if (isSinhala) {
          sheet.addRow([`කළමනාකාරතුමා,`]); r++;
          sheet.addRow([row.agentName || '-']); r++;
          sheet.addRow([asAtDate]); r++;
          sheet.addRow([`මහත්මයාණෙනි,`]); r++;
          sheet.addRow(['']); r++;

          sheet.addRow([`${asAtDate} දිනට ශේෂ සහතිකය.`]); r++;
          // Title style
          sheet.getCell(`A${r - 1}`).font = { bold: true };
          sheet.getCell(`A${r - 1}`).alignment = { horizontal: 'center' };

          sheet.addRow(['']); r++;
          sheet.addRow([`අප ආයතනයේ පවත්වාගෙන යනු ලබන චැනල් නියෝජිත ආයතනයේ ${asAtDate} දිනට ශේෂය පහත පරිදි වේ.`]); r++;
          sheet.getCell(`A${r - 1}`).alignment = { horizontal: 'center' };
          sheet.addRow(['']); r++;
        } else {
          // English header
          sheet.addRow([row.agentName || '-']); r++;
          sheet.addRow([asAtDate]); r++;
          sheet.addRow([t.greeting]); r++;
          sheet.addRow(['']); r++;

          sheet.addRow([t.title]); r++;
          sheet.getCell(`A${r - 1}`).font = { bold: true, underline: true };
          sheet.getCell(`A${r - 1}`).alignment = { horizontal: 'center' };
          sheet.addRow(['']); r++;

          const bodyEn = t.body.replace(' on was ', ` on ${asAtDate} was `);
          sheet.addRow([bodyEn]); r++;
          sheet.getCell(`A${r - 1}`).alignment = { horizontal: 'center' };
          sheet.addRow(['']); r++;
        }

        // Table headers
        sheet.addRow([t.nameOfAgent, t.agentCode, t.balanceAsAtDate]); r++;
        sheet.getRow(r - 1).font = { bold: true };
        sheet.getCell(`B${r - 1}`).alignment = { horizontal: 'center' };
        sheet.getCell(`C${r - 1}`).alignment = { horizontal: 'right' };

        // Table row
        sheet.addRow([row.agentName || '-', row.agentCode || '-', formatAmount(row.balance ?? 0)]); r++;
        sheet.getCell(`B${r - 1}`).alignment = { horizontal: 'center' };
        sheet.getCell(`C${r - 1}`).alignment = { horizontal: 'right' };

        // Footer
        r += 1;
        sheet.addRow([t.footer1]); r++;
        sheet.addRow([t.footer2]); r++;
        sheet.addRow([t.footer3]); r++;
        sheet.addRow([t.footer4]); r++;
        if (isSinhala) {
          sheet.addRow([`ගණකාධිකාරී - රුහුණු රෝහල කරාපිටිය.`]); r++;
        } else {
          sheet.addRow([`Ruhunu Hospital (Pvt.) Ltd.`]); r++;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), (fileName || 'agent-balance-confirmation-letter.xlsx'));
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
