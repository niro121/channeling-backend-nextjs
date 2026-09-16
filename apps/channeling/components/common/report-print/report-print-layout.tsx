"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { RUHUNU_HOSPITAL } from "@/lib/receipt-template/ruhunu-hospital"

/** Default hospital logo served from `apps/channeling/public/assets/`. */
export const RUHUNU_HOSPITAL_LOGO_SRC = "/assets/ruhunu-hospital-logo.png"

/** Default brand line shown above the report title on printed pages. */
export const RUHUNU_PRINT_BRAND_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Ruhunu Channeling"

export type ReportPrintSummaryItem = {
  label: string
  value: React.ReactNode
  /** Span the whole summary grid (e.g. long filter or shift lists). */
  fullWidth?: boolean
}

type ReportPrintLayoutProps = {
  /** Report name shown under the hospital branding. */
  reportName: string
  /** Labelled values shown in the "Report Summary" box (Period, Staff, Report Type, ...). */
  summaryItems: ReportPrintSummaryItem[]
  /** Timestamp printed at the bottom of every page. */
  generatedAt: string
  /**
   * Brand / organization line printed above the report name.
   * Defaults to "Ruhunu Channeling" (or NEXT_PUBLIC_APP_NAME).
   */
  organizationName?: string
  /**
   * Optional logo URL. Defaults to the Ruhunu Hospital brand mark.
   * Pass `null` to hide the logo.
   */
  logoSrc?: string | null
  /** `@page size` value, e.g. "A4 landscape". */
  pageSize?: string
  className?: string
  children: React.ReactNode
}

/** Escape a value for use inside a CSS `content: "..."` string. */
function cssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function ReportPrintLogoFallback({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-14 w-14 shrink-0 text-black"
      role="img"
      aria-label={`${title} logo`}
    >
      <rect x="1.75" y="1.75" width="44.5" height="44.5" rx="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="20" y="10" width="8" height="28" rx="2" fill="currentColor" />
      <rect x="10" y="20" width="28" height="8" rx="2" fill="currentColor" />
    </svg>
  )
}

/**
 * Print frame for reports. On screen only the children (tables) show; when printing,
 * the hospital logo/header, Report Summary box, and page footer (generated time +
 * page count) are included.
 */
export function ReportPrintLayout({
  reportName,
  summaryItems,
  generatedAt,
  organizationName = RUHUNU_PRINT_BRAND_NAME,
  logoSrc = RUHUNU_HOSPITAL_LOGO_SRC,
  pageSize = "A4 portrait",
  className,
  children,
}: ReportPrintLayoutProps) {
  const showBrandedLogo = typeof logoSrc === "string" && logoSrc.length > 0

  return (
    <div className={cn("rpt-print-root space-y-3", className)}>
      <style>{`
        @media print {
          @page {
            size: ${pageSize};
            margin: 8mm 10mm 14mm;
            /* Claim top margin boxes so Chrome does not inject date/title headers. */
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "Generated: ${cssString(generatedAt)}";
              font-size: 8pt;
              color: #000;
            }
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 8pt;
              color: #000;
            }
          }

          .rpt-print-root {
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .rpt-print-header {
            display: block !important;
            break-after: avoid;
            page-break-after: avoid;
            margin-bottom: 3mm !important;
          }
          .rpt-print-brand-row {
            display: flex !important;
            align-items: flex-start !important;
            gap: 8mm !important;
            height: 16mm !important;
          }
          .rpt-print-logo {
            height: 16mm !important;
            width: auto !important;
            max-width: 55mm !important;
            object-fit: contain !important;
            object-position: left center !important;
            display: block !important;
            flex-shrink: 0 !important;
          }
          /*
            Logo wordmark bands (measured on 160px-tall asset):
            RUHUNU  23.8%–56.2% | gap 56.2%–61.9% | HOSPITAL 61.9%–93.8%
            Titles are locked into those same bands so they align with the logo text.
          */
          .rpt-print-titles {
            height: 16mm !important;
            flex: 1 1 auto !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            padding: 3.8mm 0 1mm !important;
            position: static !important;
          }
          .rpt-print-org {
            position: static !important;
            transform: none !important;
            top: auto !important;
            height: 5.2mm !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            font-size: 16pt !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            letter-spacing: 0.03em !important;
            text-transform: uppercase !important;
            color: #000 !important;
            white-space: nowrap !important;
          }
          .rpt-print-title-gap {
            height: 0.9mm !important;
            flex-shrink: 0 !important;
          }
          .rpt-print-report-name {
            position: static !important;
            transform: none !important;
            top: auto !important;
            height: 5.1mm !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            font-size: 12pt !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            letter-spacing: 0.04em !important;
            text-transform: uppercase !important;
            color: #333 !important;
            white-space: nowrap !important;
          }
          .rpt-print-rule {
            margin-top: 2.5mm !important;
            border-top: 1.5pt solid #000 !important;
          }
          .rpt-print-summary {
            margin-top: 3mm !important;
            border: 1pt solid #000 !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }
          .rpt-print-summary-bar {
            background: #e8e8e8 !important;
            border-bottom: 1pt solid #000 !important;
            padding: 1.6mm 2.5mm !important;
            font-size: 8.5pt !important;
            font-weight: 700 !important;
            letter-spacing: 0.12em !important;
            text-transform: uppercase !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .rpt-print-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 2.2mm 5mm !important;
            padding: 2.5mm !important;
          }
          .rpt-print-full { grid-column: 1 / -1 !important; }
          .rpt-print-label {
            margin: 0 0 0.6mm !important;
            font-size: 7.5pt !important;
            font-weight: 600 !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            color: #555 !important;
          }
          .rpt-print-value {
            margin: 0 !important;
            font-size: 9.5pt !important;
            font-weight: 700 !important;
            line-height: 1.25 !important;
            color: #000 !important;
          }

          .rpt-print-body { margin-top: 3mm !important; }
          /* Wide report tables: don't clip trailing columns when printing. */
          .rpt-print-root .overflow-hidden,
          .rpt-print-root .overflow-x-auto,
          .rpt-print-root .overflow-auto {
            overflow: visible !important;
          }
          .rpt-print-root .rounded-lg,
          .rpt-print-root .border {
            border-radius: 0 !important;
          }
          .rpt-print-root table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          /* Keep each data row on one page — avoids mid-name fragments after page breaks. */
          .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .rpt-print-root th,
          .rpt-print-root td {
            border: 0.7pt solid #000 !important;
            color: #000 !important;
            padding: 1.2mm 1.2mm !important;
            font-size: 7.5pt !important;
            line-height: 1.25 !important;
            font-weight: 400 !important;
            background: #fff !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Nested Tailwind size utilities (e.g. text-xs) use rem and can print larger than the cell. */
          .rpt-print-root th *,
          .rpt-print-root td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .rpt-print-root thead th,
          .rpt-print-root th {
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            font-size: 7pt !important;
            text-align: inherit;
          }
          .rpt-print-root .whitespace-nowrap,
          .rpt-print-root .whitespace-pre-line {
            white-space: normal !important;
          }
          .rpt-print-root tr.rpt-print-total td,
          .rpt-print-root tr.rpt-print-total th {
            font-weight: 700 !important;
            background: #fff !important;
            border-top: 1.2pt solid #000 !important;
          }
          /* Default tfoot repeats on every printed page; keep Total only after the last body rows. */
          .rpt-print-root tfoot {
            display: table-row-group !important;
          }
          .rpt-print-root .rounded-md { border-radius: 0 !important; }
        }
      `}</style>

      <header className="rpt-print-header hidden print:block">
        <div className="rpt-print-brand-row flex h-14 items-start gap-8">
          {showBrandedLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={RUHUNU_HOSPITAL.name}
              className="rpt-print-logo h-14 w-auto max-w-[220px] shrink-0 object-contain object-left"
            />
          ) : logoSrc !== null ? (
            <ReportPrintLogoFallback title={organizationName} />
          ) : null}
          <div className="rpt-print-titles flex h-14 min-w-0 flex-1 flex-col box-border pt-[13px] pb-[4px]">
            <p className="rpt-print-org m-0 flex h-[21px] items-center text-[22px] font-extrabold uppercase leading-none tracking-wide text-foreground">
              {organizationName}
            </p>
            <div className="rpt-print-title-gap h-[4px] shrink-0" aria-hidden />
            <p className="rpt-print-report-name m-0 flex h-[20px] items-center text-base font-bold uppercase leading-none tracking-wider text-muted-foreground">
              {reportName}
            </p>
          </div>
        </div>
        <div className="rpt-print-rule mt-2 border-t-2 border-foreground" />

        <section className="rpt-print-summary mt-3 overflow-hidden rounded-sm border border-border">
          <div className="rpt-print-summary-bar border-b border-border bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            Report Summary
          </div>
          <div className="rpt-print-summary-grid grid gap-x-8 gap-y-2.5 px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {summaryItems.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className={cn("space-y-0.5", item.fullWidth && "rpt-print-full sm:col-span-2 lg:col-span-3")}
              >
                <p className="rpt-print-label text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {item.label}
                </p>
                <div className="rpt-print-value text-[11px] font-semibold leading-tight">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      </header>

      <div className="rpt-print-body space-y-3">{children}</div>
    </div>
  )
}
