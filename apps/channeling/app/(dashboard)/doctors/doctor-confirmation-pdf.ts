"use client"

import jsPDF from "jspdf"
import { drawBrandedPdfFooter, drawBrandedPdfHeader } from "@/components/common/report-print"
import { formatLKR } from "@/lib/format-money"
import type { Doctor } from "@/types/doctor"

type Field = { label: string; value: string; full?: boolean }

function dash(value: string | number | null | undefined): string {
  if (value == null) return "—"
  const text = String(value).trim()
  return text.length ? text : "—"
}

function doctorDisplayName(doctor: Doctor): string {
  const title = doctor.title?.trim() ?? ""
  const name = doctor.name?.trim() ?? ""
  return title ? `${title} ${name}`.trim() : name || "—"
}

function linkedAccount(doctor: Doctor): string {
  if (!doctor.accountId && !doctor.accountName && !doctor.accountCode) return "—"
  const name = doctor.accountName?.trim()
  const code = doctor.accountCode?.trim()
  if (name && code) return `${name} (${code})`
  return name || code || "—"
}

function confirmationFields(doctor: Doctor): Field[] {
  const branches = (doctor.doctorLocations ?? [])
    .map((link) => link.location?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(", ")

  return [
    { label: "Title", value: dash(doctor.title) },
    { label: "Name", value: dash(doctor.name) },
    { label: "Code", value: dash(doctor.code) },
    { label: "Speciality", value: dash(doctor.speciality?.name) },
    { label: "Branches", value: dash(branches), full: true },
    { label: "Phone", value: dash(doctor.phone) },
    { label: "Mobile", value: dash(doctor.mobile) },
    { label: "Fax", value: dash(doctor.fax) },
    { label: "NIC", value: dash(doctor.nic) },
    { label: "Address line 1", value: dash(doctor.addressLine1) },
    { label: "Address line 2", value: dash(doctor.addressLine2) },
    { label: "City", value: dash(doctor.city) },
    { label: "Registration no.", value: dash(doctor.registrationNumber) },
    { label: "TIN number", value: dash(doctor.tinNumber) },
    { label: "WHT percentage", value: `${Number(doctor.whtPercentage ?? 0)}%` },
    { label: "Qualification", value: dash(doctor.qualification), full: true },
    { label: "Referral charge", value: formatLKR(Number(doctor.referralCharge ?? 0)) },
    { label: "Session no. prefix", value: dash(doctor.sessionNoPrefix) },
    { label: "List order no.", value: dash(doctor.order) },
    { label: "Status", value: doctor.status === 1 ? "Publish" : "Unpublish" },
    { label: "Linked account", value: linkedAccount(doctor) },
    {
      label: "Current balance",
      value: doctor.accountId ? formatLKR(Number(doctor.balance ?? 0)) : "—",
    },
  ]
}

function pageSize(doc: jsPDF): { width: number; height: number } {
  const width =
    typeof doc.internal.pageSize.getWidth === "function"
      ? doc.internal.pageSize.getWidth()
      : (doc.internal.pageSize as { width?: number }).width ?? 210
  const height =
    typeof doc.internal.pageSize.getHeight === "function"
      ? doc.internal.pageSize.getHeight()
      : (doc.internal.pageSize as { height?: number }).height ?? 297
  return { width, height }
}

function groupFields(fields: Field[]): Field[][] {
  const rows: Field[][] = []
  let pair: Field[] = []
  for (const field of fields) {
    if (field.full) {
      if (pair.length) {
        rows.push(pair)
        pair = []
      }
      rows.push([field])
      continue
    }
    pair.push(field)
    if (pair.length === 2) {
      rows.push(pair)
      pair = []
    }
  }
  if (pair.length) rows.push(pair)
  return rows
}

function drawRecord(doc: jsPDF, fields: Field[], startY: number, margin: number): number {
  const { width: pageWidth, height: pageHeight } = pageSize(doc)
  const contentWidth = pageWidth - margin * 2
  const bottom = pageHeight - 14
  let y = startY

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text("DOCTOR RECORD", margin, y + 3)
  y += 6

  for (const row of groupFields(fields)) {
    const colW = contentWidth / row.length
    const valueWidth = colW - 4
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const lineCounts = row.map((cell) => doc.splitTextToSize(cell.value, valueWidth).length)
    const rowH = Math.max(11, ...lineCounts.map((count) => 7.2 + count * 3.8))

    if (y + rowH > bottom) {
      doc.addPage()
      y = margin
    }

    row.forEach((cell, index) => {
      const x = margin + index * colW
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.rect(x, y, colW, rowH)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(7)
      doc.setTextColor(85, 85, 85)
      doc.text(cell.label.toUpperCase(), x + 2, y + 3.6)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      const lines = doc.splitTextToSize(cell.value, valueWidth)
      doc.text(lines, x + 2, y + 8)
    })

    y += rowH
  }

  return y
}

function drawSignatures(doc: jsPDF, startY: number, margin: number, doctorName: string): void {
  const { width: pageWidth, height: pageHeight } = pageSize(doc)
  const contentWidth = pageWidth - margin * 2
  const blockH = 46
  let y = startY + 6

  if (y + blockH > pageHeight - 14) {
    doc.addPage()
    y = margin
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  const statement = doc.splitTextToSize(
    "I confirm that the details recorded on this sheet are correct.",
    contentWidth
  )
  doc.text(statement, margin, y)
  y += statement.length * 4.2 + 3

  const gap = 8
  const boxW = (contentWidth - gap) / 2
  const boxH = 34
  const boxes = [
    { title: "DOCTOR", nameLine: doctorName },
    { title: "AUTHORIZED PERSON", nameLine: "" },
  ]

  boxes.forEach((box, index) => {
    const x = margin + index * (boxW + gap)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.35)
    doc.setFillColor(232, 232, 232)
    doc.rect(x, y, boxW, 6.5, "FD")
    doc.rect(x, y, boxW, boxH, "S")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(box.title, x + 2.5, y + 4.4)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("Signature", x + 2.5, y + 14)
    doc.line(x + 22, y + 14.2, x + boxW - 4, y + 14.2)

    doc.text("Name", x + 2.5, y + 22)
    if (box.nameLine) {
      const nameLines = doc.splitTextToSize(box.nameLine, boxW - 20)
      doc.text(nameLines[0] ?? "", x + 16, y + 22)
    } else {
      doc.line(x + 16, y + 22.2, x + boxW - 4, y + 22.2)
    }

    doc.text("Date", x + 2.5, y + 29.5)
    doc.line(x + 16, y + 29.7, x + 58, y + 29.7)
  })
}

export async function downloadDoctorConfirmationPdf(doctor: Doctor): Promise<void> {
  const generatedAt = new Date().toLocaleString()
  const doc = new jsPDF({ orientation: "p", format: "a4" })
  const margin = 12
  const name = doctorDisplayName(doctor)

  const startY = await drawBrandedPdfHeader(doc, {
    reportName: "Doctor detail confirmation",
    summaryItems: [
      { label: "Doctor", value: name },
      { label: "Code", value: dash(doctor.code) },
      { label: "Speciality", value: dash(doctor.speciality?.name) },
    ],
    margin,
  })

  const afterRecord = drawRecord(doc, confirmationFields(doctor), startY, margin)
  drawSignatures(doc, afterRecord, margin, name)
  drawBrandedPdfFooter(doc, generatedAt, margin)

  const code = (doctor.code || "doctor").replace(/[^\w.-]+/g, "-")
  const fileName = name
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
  doc.save(`doctor-confirmation-${code}_${fileName || "doctor"}.pdf`)
}
