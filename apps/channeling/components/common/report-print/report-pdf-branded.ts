import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type ReportPrintSummaryItem,
} from "./report-print-layout"

/** Plain-text summary cell for jsPDF (mirrors ReportPrintSummaryItem). */
export type BrandedPdfSummaryItem = {
  label: string
  value: string
  fullWidth?: boolean
}

export type DownloadBrandedReportPdfOptions<T> = {
  reportName: string
  summaryItems: BrandedPdfSummaryItem[]
  generatedAt: string
  data: T[]
  columns: string[]
  keys: (keyof T)[]
  fileName?: string
  organizationName?: string
  logoSrc?: string | null
  orientation?: "landscape" | "portrait"
}

function pageSize(doc: jsPDF): { width: number; height: number } {
  const width =
    typeof doc.internal.pageSize.getWidth === "function"
      ? doc.internal.pageSize.getWidth()
      : (doc.internal.pageSize as { width?: number }).width ?? 297
  const height =
    typeof doc.internal.pageSize.getHeight === "function"
      ? doc.internal.pageSize.getHeight()
      : (doc.internal.pageSize as { height?: number }).height ?? 210
  return { width, height }
}

/** Convert React print-summary items to plain strings for PDF. */
export function toBrandedPdfSummaryItems(
  items: ReportPrintSummaryItem[]
): BrandedPdfSummaryItem[] {
  return items.map((item) => ({
    label: item.label,
    value: summaryValueToString(item.value),
    fullWidth: item.fullWidth,
  }))
}

function summaryValueToString(value: unknown): string {
  if (value == null || value === false) return "—"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(summaryValueToString).filter((s) => s && s !== "—").join(" ")
  }
  if (typeof value === "object" && value !== null && "props" in value) {
    const children = (value as { props?: { children?: unknown } }).props?.children
    return summaryValueToString(children)
  }
  return "—"
}

let cachedLogoDataUrl: string | null | undefined

async function loadLogoDataUrl(src: string): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined && src === RUHUNU_HOSPITAL_LOGO_SRC) {
    return cachedLogoDataUrl
  }
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoDataUrl = dataUrl
    return dataUrl
  } catch {
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoDataUrl = null
    return null
  }
}

/**
 * Draws the branded print-style header (logo + brand + report name + Report Summary box).
 * Returns the Y position below the header for starting the table.
 */
export async function drawBrandedPdfHeader(
  doc: jsPDF,
  opts: {
    reportName: string
    summaryItems: BrandedPdfSummaryItem[]
    organizationName?: string
    logoSrc?: string | null
    margin?: number
  }
): Promise<number> {
  const margin = opts.margin ?? 10
  const organizationName = opts.organizationName ?? RUHUNU_PRINT_BRAND_NAME
  const { width: pageWidth } = pageSize(doc)
  const contentWidth = pageWidth - margin * 2

  let y = margin

  // Brand row: logo + titles
  const logoH = 16
  const logoMaxW = 55
  let textX = margin
  if (opts.logoSrc !== null) {
    const logoSrc = opts.logoSrc ?? RUHUNU_HOSPITAL_LOGO_SRC
    const logoData = await loadLogoDataUrl(logoSrc)
    if (logoData) {
      // Preserve aspect for 526×160 asset
      const logoW = Math.min(logoMaxW, logoH * (526 / 160))
      doc.addImage(logoData, "PNG", margin, y, logoW, logoH)
      textX = margin + logoW + 8
    }
  }

  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(organizationName.toUpperCase(), textX, y + 6.5)

  doc.setFontSize(11)
  doc.setTextColor(51, 51, 51)
  const reportLines = doc.splitTextToSize(opts.reportName.toUpperCase(), pageWidth - textX - margin)
  doc.text(reportLines, textX, y + 13)

  y += logoH + 3

  // Rule under brand
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  // Report Summary box
  const summaryTop = y
  const barH = 7
  const padX = 3
  const padY = 3
  const colGap = 5
  const cols = 3
  const colW = (contentWidth - padX * 2 - colGap * (cols - 1)) / cols

  // Title bar
  doc.setFillColor(232, 232, 232)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.35)
  doc.rect(margin, summaryTop, contentWidth, barH, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text("REPORT SUMMARY", margin + padX, summaryTop + 4.8)

  // Lay out items in a 3-column flow (fullWidth spans all columns)
  type Cell = { label: string; value: string; col: number; row: number; span: number }
  const cells: Cell[] = []
  let col = 0
  let row = 0
  for (const item of opts.summaryItems) {
    const span = item.fullWidth ? cols : 1
    if (col + span > cols) {
      col = 0
      row += 1
    }
    cells.push({
      label: item.label,
      value: item.value || "—",
      col,
      row,
      span,
    })
    col += span
    if (col >= cols) {
      col = 0
      row += 1
    }
  }
  const rowCount = cells.length === 0 ? 1 : Math.max(...cells.map((c) => c.row)) + 1

  // Measure row heights
  const labelH = 3.2
  const valueLineH = 4
  const rowGap = 2.5
  const rowHeights: number[] = Array.from({ length: rowCount }, () => 0)
  doc.setFont("helvetica", "bold")
  for (const cell of cells) {
    const w = colW * cell.span + colGap * (cell.span - 1)
    doc.setFontSize(9)
    const valueLines = doc.splitTextToSize(cell.value, w)
    const h = labelH + valueLines.length * valueLineH
    rowHeights[cell.row] = Math.max(rowHeights[cell.row], h)
  }

  let bodyH = padY
  for (let r = 0; r < rowCount; r++) {
    bodyH += rowHeights[r]
    if (r < rowCount - 1) bodyH += rowGap
  }
  bodyH += padY

  const boxH = barH + bodyH
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.35)
  doc.rect(margin, summaryTop, contentWidth, boxH, "S")

  // Draw cells
  let rowY = summaryTop + barH + padY
  const rowStarts: number[] = []
  for (let r = 0; r < rowCount; r++) {
    rowStarts[r] = rowY
    rowY += rowHeights[r] + (r < rowCount - 1 ? rowGap : 0)
  }

  for (const cell of cells) {
    const x = margin + padX + cell.col * (colW + colGap)
    const w = colW * cell.span + colGap * (cell.span - 1)
    const cy = rowStarts[cell.row]

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.setTextColor(85, 85, 85)
    doc.text(cell.label.toUpperCase(), x, cy + 2.5)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    const valueLines = doc.splitTextToSize(cell.value, w)
    doc.text(valueLines, x, cy + 2.5 + labelH)
  }

  return summaryTop + boxH + 4
}

function drawBrandedPdfFooter(doc: jsPDF, generatedAt: string, margin: number) {
  const { width: pageWidth, height: pageHeight } = pageSize(doc)
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    const y = pageHeight - 6
    doc.text(`Generated: ${generatedAt}`, margin, y)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, y, { align: "right" })
  }
}

/**
 * Download a landscape/portrait PDF with the same branded header + Report Summary
 * used by browser print (`ReportPrintLayout`).
 */
export async function downloadBrandedReportPdf<T>({
  reportName,
  summaryItems,
  generatedAt,
  data,
  columns,
  keys,
  fileName = "report.pdf",
  organizationName = RUHUNU_PRINT_BRAND_NAME,
  logoSrc = RUHUNU_HOSPITAL_LOGO_SRC,
  orientation = "landscape",
}: DownloadBrandedReportPdfOptions<T>): Promise<void> {
  const margin = 10
  const doc = new jsPDF({
    orientation: orientation === "landscape" ? "l" : "p",
    format: "a4",
  })
  const { width: pageWidth } = pageSize(doc)
  const tableWidth = pageWidth - margin * 2

  const startY = await drawBrandedPdfHeader(doc, {
    reportName,
    summaryItems,
    organizationName,
    logoSrc,
    margin,
  })

  const rows = data.map((item) =>
    keys.map((key) => {
      const value = item[key]
      return value !== undefined && value !== null ? String(value) : "-"
    })
  )

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth,
    styles: {
      fontSize: 8,
      cellPadding: 1.6,
      minCellWidth: 0,
      overflow: "linebreak",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      fontStyle: "normal",
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontStyle: "normal",
    },
    // Bold last row when it looks like a total (caller typically appends Total / Grand Total)
    didParseCell: (data) => {
      if (data.section !== "body") return
      const raw = data.row.raw
      if (!Array.isArray(raw)) return
      const first = String(raw[0] ?? "")
      const second = String(raw[1] ?? "")
      if (
        /^total$/i.test(first) ||
        /^grand total$/i.test(first) ||
        /^total$/i.test(second) ||
        /user total/i.test(second)
      ) {
        data.cell.styles.fontStyle = "bold"
      }
    },
  })

  drawBrandedPdfFooter(doc, generatedAt, margin)
  doc.save(fileName)
}
