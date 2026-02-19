import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

export type UatCaseRow = {
  Module: string
  Feature: string
  "Test Case ID": string
  "Test Case Description": string
  Steps: string
  "Expected Result": string
  "Pass/Fail": string
  Notes: string
}

/** Dependency order for UAT: create Location/Department/Speciality first, then Zones/Rooms, then Doctors/Sessions, etc. */
const FEATURE_ORDER = [
  "Location",
  "Department",
  "Speciality",
  "Zones",
  "Rooms",
  "Doctor",
  "Doctor Session",
  "Bulk Price Change",
  "Doctor Leave",
  "Patients",
  "Staff",
  "Users",
  "User Groups",
  "Agency Books",
  "Agency",
  "Discount",
  "Tags",
  "SMS Playground",
  "Reports",
]

function parseCsv(csvText: string): UatCaseRow[] {
  const lines = csvText.replace(/^\uFEFF/, "").trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim())
  const rows: UatCaseRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h] = values[j] ?? ""
    })
    rows.push(row as UatCaseRow)
  }
  return rows
}

function sortByDependency(rows: UatCaseRow[]): UatCaseRow[] {
  const orderMap = new Map(FEATURE_ORDER.map((f, i) => [f, i]))
  return [...rows].sort((a, b) => {
    const fa = a.Feature ?? ""
    const fb = b.Feature ?? ""
    const ia = orderMap.has(fa) ? orderMap.get(fa)! : FEATURE_ORDER.length
    const ib = orderMap.has(fb) ? orderMap.get(fb)! : FEATURE_ORDER.length
    if (ia !== ib) return ia - ib
    return (a["Test Case ID"] ?? "").localeCompare(b["Test Case ID"] ?? "")
  })
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "docs/uat/uat-test-cases.csv")
    const content = await readFile(filePath, "utf-8")
    const rows = sortByDependency(parseCsv(content))
    return NextResponse.json(rows)
  } catch (err) {
    console.error("UAT cases load error:", err)
    return NextResponse.json(
      { error: "Failed to load UAT cases" },
      { status: 500 }
    )
  }
}
