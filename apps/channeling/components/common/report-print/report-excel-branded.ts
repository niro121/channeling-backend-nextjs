import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
} from "./report-print-layout"
import type { BrandedPdfSummaryItem } from "./report-pdf-branded"

export type DownloadBrandedReportExcelOptions<T> = {
  reportName: string
  summaryItems: BrandedPdfSummaryItem[]
  generatedAt: string
  data: T[]
  columns: string[]
  keys: (keyof T)[]
  fileName?: string
  organizationName?: string
  logoSrc?: string | null
  sheetName?: string
}

let cachedLogoBase64: string | null | undefined

async function loadLogoBase64(src: string): Promise<string | null> {
  if (cachedLogoBase64 !== undefined && src === RUHUNU_HOSPITAL_LOGO_SRC) {
    return cachedLogoBase64
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
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoBase64 = base64
    return base64
  } catch {
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoBase64 = null
    return null
  }
}

function isTotalLikeRow(values: unknown[]): boolean {
  return values.some((v) => {
    const s = String(v ?? "").trim().toLowerCase()
    return (
      s === "total" ||
      s === "grand total" ||
      s === "user total" ||
      s === "opening balance" ||
      s === "closing balance"
    )
  })
}

function colLetter(index1Based: number): string {
  let n = index1Based
  let s = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/**
 * Download an Excel workbook with the same branded structure as print/PDF:
 * logo + brand + report name, Report Summary box, then the data table.
 */
export async function downloadBrandedReportExcel<T>({
  reportName,
  summaryItems,
  generatedAt,
  data,
  columns,
  keys,
  fileName = "report.xlsx",
  organizationName = RUHUNU_PRINT_BRAND_NAME,
  logoSrc = RUHUNU_HOSPITAL_LOGO_SRC,
  sheetName = "Report",
}: DownloadBrandedReportExcelOptions<T>): Promise<void> {
  const colCount = Math.max(columns.length, 3)
  const lastCol = colLetter(colCount)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = organizationName
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ showGridLines: false }],
  })

  sheet.columns = columns.map((header, i) => ({
    header: undefined,
    key: String(keys[i] ?? `c${i}`),
    width: i === 0 ? 8 : i === 1 ? 28 : 14,
  }))

  let row = 1
  let titleStartCol = 1
  let hasLogo = false

  // Brand header: logo + titles
  if (logoSrc !== null) {
    const logoBase64 = await loadLogoBase64(logoSrc ?? RUHUNU_HOSPITAL_LOGO_SRC)
    if (logoBase64) {
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: "png",
      })
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 160, height: 48 },
      })
      sheet.getRow(1).height = 22
      sheet.getRow(2).height = 22
      hasLogo = true
      titleStartCol = Math.min(3, colCount)
    }
  }

  // Titles sit to the right of the logo when present
  sheet.mergeCells(row, titleStartCol, row, colCount)
  const orgCell = sheet.getCell(row, titleStartCol)
  orgCell.value = organizationName.toUpperCase()
  orgCell.font = { bold: true, size: 16, name: "Arial" }
  orgCell.alignment = { vertical: "middle", horizontal: "left" }
  row += 1

  sheet.mergeCells(row, titleStartCol, row, colCount)
  const reportCell = sheet.getCell(row, titleStartCol)
  reportCell.value = reportName.toUpperCase()
  reportCell.font = { bold: true, size: 11, name: "Arial", color: { argb: "FF555555" } }
  reportCell.alignment = { vertical: "middle", horizontal: "left" }
  row += 1

  if (!hasLogo) {
    sheet.getRow(1).height = 22
    sheet.getRow(2).height = 18
  }

  // Rule under brand
  row += 1
  sheet.mergeCells(`A${row}:${lastCol}${row}`)
  const ruleCell = sheet.getCell(row, 1)
  ruleCell.border = { bottom: { style: "medium", color: { argb: "FF000000" } } }
  row += 2

  // Report Summary title bar
  sheet.mergeCells(`A${row}:${lastCol}${row}`)
  const summaryTitle = sheet.getCell(row, 1)
  summaryTitle.value = "REPORT SUMMARY"
  summaryTitle.font = { bold: true, size: 9, name: "Arial" }
  summaryTitle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8E8E8" },
  }
  summaryTitle.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
  }
  summaryTitle.alignment = { vertical: "middle", horizontal: "left" }
  sheet.getRow(row).height = 18
  row += 1

  // Summary items in up to 3 columns (label / value pairs stacked)
  const summaryStartRow = row
  const colsPerItem = Math.max(1, Math.floor(colCount / 3))
  let itemCol = 0
  let itemRow = 0
  for (const item of summaryItems) {
    const span = item.fullWidth ? colCount : colsPerItem
    if (itemCol + span > colCount) {
      itemCol = 0
      itemRow += 2
    }
    const excelRow = summaryStartRow + itemRow
    const excelCol = itemCol + 1
    const endCol = Math.min(excelCol + span - 1, colCount)

    if (endCol > excelCol) {
      sheet.mergeCells(excelRow, excelCol, excelRow, endCol)
      sheet.mergeCells(excelRow + 1, excelCol, excelRow + 1, endCol)
    }

    const labelCell = sheet.getCell(excelRow, excelCol)
    labelCell.value = item.label.toUpperCase()
    labelCell.font = { size: 8, name: "Arial", color: { argb: "FF666666" } }

    const valueCell = sheet.getCell(excelRow + 1, excelCol)
    valueCell.value = item.value || "—"
    valueCell.font = { bold: true, size: 10, name: "Arial" }

    itemCol += span
  }

  const summaryRowsUsed = Math.max(2, (itemRow + 2))
  // Draw outer border around summary body
  const summaryEndRow = summaryStartRow + summaryRowsUsed - 1
  for (let r = summaryStartRow; r <= summaryEndRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(r, c)
      const border: Partial<ExcelJS.Borders> = { ...(cell.border ?? {}) }
      if (r === summaryStartRow) border.top = { style: "thin", color: { argb: "FF000000" } }
      if (r === summaryEndRow) border.bottom = { style: "thin", color: { argb: "FF000000" } }
      if (c === 1) border.left = { style: "thin", color: { argb: "FF000000" } }
      if (c === colCount) border.right = { style: "thin", color: { argb: "FF000000" } }
      cell.border = border
    }
  }
  row = summaryEndRow + 2

  // Table header
  const headerRow = sheet.getRow(row)
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = col
    cell.font = { bold: true, size: 9, name: "Arial" }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    }
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
    }
    cell.alignment = {
      vertical: "middle",
      horizontal: i === 0 || i === 1 ? "left" : "right",
      wrapText: true,
    }
  })
  headerRow.height = 20
  row += 1

  // Data rows
  for (const item of data) {
    const values = keys.map((key) => {
      const value = item[key]
      return value !== undefined && value !== null ? value : ""
    })
    const dataRow = sheet.getRow(row)
    const totalLike = isTotalLikeRow(values)
    values.forEach((value, i) => {
      const cell = dataRow.getCell(i + 1)
      cell.value = typeof value === "number" || typeof value === "string" ? value : String(value)
      cell.font = {
        bold: totalLike,
        size: 9,
        name: "Arial",
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
      }
      cell.alignment = {
        vertical: "middle",
        horizontal: i === 0 || i === 1 ? "left" : "right",
        wrapText: true,
      }
      if (totalLike) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        }
      }
    })
    row += 1
  }

  // Footer
  row += 1
  sheet.mergeCells(`A${row}:${lastCol}${row}`)
  const footerCell = sheet.getCell(row, 1)
  footerCell.value = `Generated: ${generatedAt}`
  footerCell.font = { size: 8, name: "Arial", color: { argb: "FF555555" } }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), fileName)
}
