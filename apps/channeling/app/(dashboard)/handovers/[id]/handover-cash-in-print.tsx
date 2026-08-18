"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import { formatCents } from "@/lib/format-money"
import { formatUserDisplayName } from "@/lib/helpers/user-display.helper"
import { formatDenomLabel, FLOAT_REQUEST_STATUS, floatRequestStatusLabel } from "@/types/float-request"
import type { DenominationEntry } from "@/types/float-request"
import { HANDOVER_STATUS } from "@/types/handover"
import type { CashierSummaryPaymentAmounts } from "@/types/report"

const METHOD_KEYS = ["cashCents", "cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const
const METHOD_LABELS: Record<(typeof METHOD_KEYS)[number], string> = {
  cashCents: "Cash",
  cardCents: "Card",
  slipCents: "Slips",
  checkCents: "Cheques",
  creditCents: "Credit",
  eWalletCents: "E-Wallet",
}

type StaffUser = { name: string | null; staff?: { code: string } | null } | null | undefined

type EnteredBreakdown = {
  cashDenominations?: { value: number; count: number }[]
  cardEntries?: { reference: string; amountCents: number }[]
  slipEntries?: { reference: string; amountCents: number }[]
  checkEntries?: { reference: string; amountCents: number }[]
  creditEntries?: { reference: string; amountCents: number }[]
  eWalletEntries?: { reference: string; amountCents: number }[]
}

type CashInHandover = {
  id: string
  createdAt: Date | string
  status?: number
  handoverNoString?: string | null
  cashCents: number
  cardCents: number
  slipCents: number
  checkCents: number
  creditCents: number
  eWalletCents: number
  totalCents?: number
  enteredBreakdown?: unknown
  discrepancyReason?: string | null
  approvalComments?: string | null
  rejectReason?: string | null
  approvedAt?: Date | string | null
  rejectedAt?: Date | string | null
  fromUser?: StaffUser
  toUser?: StaffUser
  journal?: { journalNumber: number | null } | null
  shift?: {
    id: string
    startedAt?: Date | string | null
    endedAt?: Date | string | null
    location?: { name: string; code: string | null } | null
  } | null
}

type PreviousHandover = {
  id: string
  createdAt?: Date | string
  totalCents: number
  handoverNoString?: string | null
  fromUser?: StaffUser
  cashCents?: number
  cardCents?: number
  slipCents?: number
  checkCents?: number
  creditCents?: number
  eWalletCents?: number
  enteredBreakdown?: unknown
  shift?: { startedAt?: Date | string | null } | null
}

type ReceivedFloat = {
  id: string
  floatNoString?: string | null
  status: number
  direction?: "in" | "out"
  amountRequested?: number
  amountReceivedCents: number
  denominationsRequested?: DenominationEntry[]
  denominationsApproved?: DenominationEntry[] | null
  reasonForLessThanRequested?: string | null
  receivedAt?: Date | string | null
  approvedAt?: Date | string | null
  createdAt?: Date | string
  requestedBy?: { name: string } | null
  bulkCashier?: { name: string } | null
}

type TillBreakdown = Partial<Record<(typeof METHOD_KEYS)[number], number>> | null | undefined

function personLabel(user: StaffUser): string {
  if (!user) return "—"
  const name = (user.name ?? "—").toUpperCase()
  return user.staff?.code ? `${name} (${user.staff.code})` : name
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function formatPrintDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}

function formatPrintDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const hh = pad2(d.getHours())
  const min = pad2(d.getMinutes())
  const sec = pad2(d.getSeconds())
  return `${formatPrintDate(d)} ${hh}:${min}:${sec}`
}

function shortRef(prefix: string, id: string): string {
  return `${prefix}/${id.slice(-8).toUpperCase()}`
}

function parseBreakdown(raw: unknown): EnteredBreakdown | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EnteredBreakdown
    } catch {
      return null
    }
  }
  return raw as EnteredBreakdown
}

function handoverStatusLabel(status: number | undefined): string {
  if (status === HANDOVER_STATUS.APPROVED) return "Approved"
  if (status === HANDOVER_STATUS.REJECTED) return "Rejected"
  if (status === HANDOVER_STATUS.CANCELLED) return "Cancelled"
  if (status === HANDOVER_STATUS.PENDING) return "Pending"
  return "—"
}

function flattenBreakdownLines(breakdown: EnteredBreakdown | null): { method: string; detail: string; amountCents: number }[] {
  if (!breakdown) return []
  const lines: { method: string; detail: string; amountCents: number }[] = []
  for (const d of breakdown.cashDenominations ?? []) {
    if (!d.count) continue
    lines.push({
      method: "Cash",
      detail: `${formatDenomLabel(d.value)} × ${d.count}`,
      amountCents: Math.round(d.value * d.count * 100),
    })
  }
  const groups: [string, { reference: string; amountCents: number }[] | undefined][] = [
    ["Card", breakdown.cardEntries],
    ["Slips", breakdown.slipEntries],
    ["Cheques", breakdown.checkEntries],
    ["Credit", breakdown.creditEntries],
    ["E-Wallet", breakdown.eWalletEntries],
  ]
  for (const [label, entries] of groups) {
    for (const e of entries ?? []) {
      if ((e.amountCents ?? 0) === 0 && !(e.reference ?? "").trim()) continue
      lines.push({ method: label, detail: e.reference || "—", amountCents: e.amountCents })
    }
  }
  return lines
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Ruhunu Hospital"

type PrintCell = {
  text: string
  align?: "left" | "right"
  nowrap?: boolean
  span?: number
  bold?: boolean
}

function printCellStyle(opts: {
  head?: boolean
  lastCol?: boolean
  lastRow?: boolean
  align?: "left" | "right"
  nowrap?: boolean
  span?: number
  bold?: boolean
}): CSSProperties {
  return {
    padding: "3px 6px",
    fontWeight: opts.head || opts.bold ? 700 : 400,
    textAlign: opts.align ?? "left",
    whiteSpace: opts.nowrap ? "nowrap" : undefined,
    borderTop: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: opts.lastCol ? "1px solid #000" : "0",
    borderBottom: opts.lastRow ? "1px solid #000" : "0",
    gridColumn: opts.span && opts.span > 1 ? `span ${opts.span}` : undefined,
  }
}

function PrintGrid({
  template,
  headers,
  rows,
}: {
  template: string
  headers: PrintCell[]
  rows: PrintCell[][]
}) {
  const colCount = headers.length
  const lastRow = rows.length - 1
  const renderCells = (cells: PrintCell[], rowIndex: number, head: boolean) => {
    let col = 0
    return cells.map((cell, i) => {
      const span = cell.span ?? 1
      const lastCol = col + span >= colCount
      col += span
      return (
        <div
          key={`${head ? "h" : "r"}-${rowIndex}-${i}`}
          className={[
            "cash-in-cell",
            lastCol ? "cash-in-last-col" : "",
            !head && rowIndex === lastRow ? "cash-in-last-row" : "",
          ].filter(Boolean).join(" ")}
          style={printCellStyle({
            head,
            lastCol,
            lastRow: !head && rowIndex === lastRow,
            align: cell.align,
            nowrap: cell.nowrap,
            span,
            bold: cell.bold,
          })}
        >
          {head ? cell.text.toUpperCase() : cell.text}
        </div>
      )
    })
  }
  return (
    <div className="cash-in-grid" style={{ display: "grid", width: "100%", gridTemplateColumns: template }}>
      {renderCells(headers, 0, true)}
      {rows.map((cells, r) => renderCells(cells, r, false))}
    </div>
  )
}

export function HandoverCashInPrint({
  handover,
  receivedFloats,
  includedHandovers,
  tillBreakdown,
  approvedByUser,
  rejectedByUser,
}: {
  handover: CashInHandover
  receivedFloats: ReceivedFloat[]
  includedHandovers: PreviousHandover[]
  cashierSummary?: {
    grandTotals: CashierSummaryPaymentAmounts
  } | null
  tillBreakdown?: TillBreakdown
  approvedByUser?: StaffUser
  rejectedByUser?: StaffUser
}) {
  const { data: session } = useSession()
  const [generatedAt, setGeneratedAt] = useState(() => formatPrintDateTime(new Date()))
  useEffect(() => {
    const stamp = () => setGeneratedAt(formatPrintDateTime(new Date()))
    window.addEventListener("beforeprint", stamp)
    return () => window.removeEventListener("beforeprint", stamp)
  }, [])

  const generatedBy = formatUserDisplayName(session?.user?.name, session?.user?.id)
  const fromLabel = personLabel(handover.fromUser)
  const toLabel = personLabel(handover.toUser)
  const billNo = handover.handoverNoString || shortRef("HO", handover.id)
  const location = handover.shift?.location
  const locationLabel = location
    ? `${location.name}${location.code ? ` (${location.code})` : ""}`
    : null

  const totalCents =
    handover.totalCents ??
    handover.cashCents +
      handover.cardCents +
      handover.slipCents +
      handover.checkCents +
      handover.creditCents +
      handover.eWalletCents

  const methodLines = METHOD_KEYS.filter((key) => (handover[key] ?? 0) > 0).map((key) => ({
    key,
    label: METHOD_LABELS[key],
    cents: handover[key] ?? 0,
  }))

  const inTotalCents = receivedFloats
    .filter((f) => f.direction !== "out" && f.status === FLOAT_REQUEST_STATUS.RECEIVED)
    .reduce((sum, f) => sum + (f.amountReceivedCents ?? 0), 0)
  const outTotalCents = receivedFloats
    .filter((f) => f.direction === "out" && f.status === FLOAT_REQUEST_STATUS.RECEIVED)
    .reduce((sum, f) => sum + (f.amountReceivedCents ?? 0), 0)

  const prevMethodCols = METHOD_KEYS.filter((key) => includedHandovers.some((h) => (h[key] ?? 0) > 0))
  const breakdown = parseBreakdown(handover.enteredBreakdown)
  const entryLines = flattenBreakdownLines(breakdown)
  const entryTotalCents = entryLines.reduce((s, l) => s + l.amountCents, 0)

  const tillRows = tillBreakdown
    ? METHOD_KEYS.filter((key) => (tillBreakdown[key] ?? 0) !== 0 || (handover[key] ?? 0) !== 0).map((key) => {
        const expected = tillBreakdown[key] ?? 0
        const entered = handover[key] ?? 0
        return { key, label: METHOD_LABELS[key], expected, entered, diff: entered - expected }
      })
    : []

  const extraMetaRow =
    handover.status === HANDOVER_STATUS.APPROVED
      ? [
          { text: formatPrintDateTime(handover.approvedAt) },
          { text: personLabel(approvedByUser) },
        ]
      : handover.status === HANDOVER_STATUS.REJECTED
        ? [
            { text: formatPrintDateTime(handover.rejectedAt) },
            { text: personLabel(rejectedByUser) },
          ]
        : null
  const extraMetaHeaders =
    handover.status === HANDOVER_STATUS.APPROVED
      ? [{ text: "Approved at" }, { text: "Approved by" }]
      : handover.status === HANDOVER_STATUS.REJECTED
        ? [{ text: "Rejected at" }, { text: "Rejected by" }]
        : null

  const notes = [
    handover.approvalComments?.trim() ? `Comments: ${handover.approvalComments.trim()}` : null,
    handover.rejectReason?.trim() ? `Reject reason: ${handover.rejectReason.trim()}` : null,
    handover.discrepancyReason?.trim() ? `Discrepancy: ${handover.discrepancyReason.trim()}` : null,
  ].filter((n): n is string => !!n)

  return (
    <>
      <style>{`
        .handover-cash-in-print { display: none; }
        @media print {
          html, body {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            overflow: visible !important;
            height: auto !important;
          }
          header.sticky, nav, aside, [data-slot="sidebar"], .handover-screen {
            display: none !important;
          }
          .handover-cash-in-print {
            display: block !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.print-handover-summary .handover-cash-in-print {
            display: none !important;
          }
          .handover-cash-in-print .cash-in-grid {
            width: 100% !important;
          }
          .handover-cash-in-print .cash-in-cell {
            border-top: 1px solid #000 !important;
            border-left: 1px solid #000 !important;
            border-right: 0 !important;
            border-bottom: 0 !important;
            color: #000 !important;
            background: #fff !important;
          }
          .handover-cash-in-print .cash-in-last-col {
            border-right: 1px solid #000 !important;
          }
          .handover-cash-in-print .cash-in-last-row {
            border-bottom: 1px solid #000 !important;
          }
          .handover-cash-in-print .handover-report-meta {
            width: 100% !important;
            border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
      <div className="handover-cash-in-print text-black bg-white font-sans text-[11px] leading-tight">
        <div className="handover-report-meta flex items-baseline justify-between gap-3 mb-1.5">
          <p className="font-bold tracking-wide">
            {BRAND_NAME.toUpperCase()} CHANNELING
          </p>
          <p className="font-bold tracking-wide">HANDOVER REPORT</p>
          <p className="tabular-nums font-semibold">{billNo}</p>
        </div>
        <div className="mb-2">
          <PrintGrid
            template="1.1fr 0.8fr 1.6fr"
            headers={[
              { text: "Bill No" },
              { text: "Status" },
              { text: "Branch" },
            ]}
            rows={[
              [
                { text: billNo },
                { text: handoverStatusLabel(handover.status) },
                { text: locationLabel ?? "—" },
              ],
            ]}
          />
          <PrintGrid
            template="1fr 1fr"
            headers={[
              { text: "From" },
              { text: "To" },
            ]}
            rows={[
              [
                { text: fromLabel },
                { text: toLabel },
              ],
            ]}
          />
          <PrintGrid
            template="1.15fr 1.15fr 1fr 1.15fr"
            headers={[
              { text: "Handover at" },
              { text: "Shift started" },
              { text: "Generated by" },
              { text: "Generated at" },
            ]}
            rows={[
              [
                { text: formatPrintDateTime(handover.createdAt) },
                { text: formatPrintDateTime(handover.shift?.startedAt) },
                { text: generatedBy },
                { text: generatedAt },
              ],
            ]}
          />
          {extraMetaHeaders && extraMetaRow ? (
            <PrintGrid
              template="1fr 1fr"
              headers={extraMetaHeaders}
              rows={[extraMetaRow]}
            />
          ) : null}
        </div>
        {notes.length > 0 ? (
          <div className="mb-2 space-y-0.5">
            {notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          <p className="font-semibold mb-0.5">COLLECTION</p>
          <PrintGrid
            template="1.4fr 1fr"
            headers={[
              { text: "Method" },
              { text: "Amount", align: "right", nowrap: true },
            ]}
            rows={[
              ...methodLines.map((line) => [
                { text: line.label },
                { text: formatCents(line.cents), align: "right" as const, nowrap: true },
              ]),
              [
                { text: "Total", bold: true },
                { text: formatCents(totalCents), align: "right" as const, nowrap: true, bold: true },
              ],
            ]}
          />
        </div>

        {receivedFloats.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">
              FLOATS THIS SHIFT
              {inTotalCents > 0 || outTotalCents > 0
                ? ` — ${inTotalCents > 0 ? `In ${formatCents(inTotalCents)}` : ""}${inTotalCents > 0 && outTotalCents > 0 ? " · " : ""}${outTotalCents > 0 ? `Out ${formatCents(outTotalCents)}` : ""}`
                : ""}
            </p>
            <PrintGrid
              template="1.1fr 0.5fr 0.9fr 1.6fr 0.9fr 0.9fr 1.4fr"
              headers={[
                { text: "Bill No", nowrap: true },
                { text: "Dir" },
                { text: "Status" },
                { text: "Party" },
                { text: "Requested", align: "right", nowrap: true },
                { text: "Given", align: "right", nowrap: true },
                { text: "When", nowrap: true },
              ]}
              rows={receivedFloats.map((f) => {
                const isOut = f.direction === "out"
                const party = isOut ? f.requestedBy?.name : f.bulkCashier?.name
                const givenCents =
                  f.status === FLOAT_REQUEST_STATUS.RECEIVED ||
                  (f.status === FLOAT_REQUEST_STATUS.APPROVED && (f.denominationsApproved?.length ?? 0) > 0)
                    ? f.amountReceivedCents
                    : null
                const when =
                  f.status === FLOAT_REQUEST_STATUS.RECEIVED ? f.receivedAt : f.approvedAt ?? f.createdAt
                return [
                  { text: f.floatNoString || shortRef("FL", f.id), nowrap: true },
                  { text: isOut ? "Out" : "In" },
                  { text: floatRequestStatusLabel(f.status) },
                  { text: party ?? "—" },
                  { text: formatCents(f.amountRequested ?? 0), align: "right" as const, nowrap: true },
                  { text: givenCents != null ? formatCents(givenCents) : "—", align: "right" as const, nowrap: true },
                  { text: formatPrintDateTime(when), nowrap: true },
                ]
              })}
            />
          </div>
        ) : null}

        {includedHandovers.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">PREVIOUS HANDOVERS</p>
            <PrintGrid
              template={["1.1fr", "1.5fr", "1.4fr", ...prevMethodCols.map(() => "0.8fr"), "0.9fr"].join(" ")}
              headers={[
                { text: "Bill No", nowrap: true },
                { text: "From" },
                { text: "When", nowrap: true },
                ...prevMethodCols.map((key) => ({ text: METHOD_LABELS[key], align: "right" as const, nowrap: true })),
                { text: "Total", align: "right" as const, nowrap: true },
              ]}
              rows={includedHandovers.map((h) => [
                { text: h.handoverNoString || shortRef("HO", h.id), nowrap: true },
                { text: personLabel(h.fromUser) },
                { text: formatPrintDateTime(h.createdAt ?? h.shift?.startedAt), nowrap: true },
                ...prevMethodCols.map((key) => ({
                  text: (h[key] ?? 0) > 0 ? formatCents(h[key] ?? 0) : "—",
                  align: "right" as const,
                  nowrap: true,
                })),
                { text: formatCents(h.totalCents), align: "right" as const, nowrap: true, bold: true },
              ])}
            />
          </div>
        ) : null}

        {tillRows.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">TILL VS ENTERED</p>
            <PrintGrid
              template="1.2fr 1fr 1fr 1fr"
              headers={[
                { text: "Method" },
                { text: "Till", align: "right", nowrap: true },
                { text: "Entered", align: "right", nowrap: true },
                { text: "Diff", align: "right", nowrap: true },
              ]}
              rows={tillRows.map((row) => [
                { text: row.label },
                { text: formatCents(row.expected), align: "right" as const, nowrap: true },
                { text: formatCents(row.entered), align: "right" as const, nowrap: true },
                {
                  text: row.diff === 0 ? "—" : `${row.diff > 0 ? "+" : ""}${formatCents(row.diff)}`,
                  align: "right" as const,
                  nowrap: true,
                },
              ])}
            />
          </div>
        ) : null}

        {entryLines.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">
              {handover.status === HANDOVER_STATUS.APPROVED ? "ENTRIES RECEIVED" : "ENTRIES HANDED OVER"}
            </p>
            <PrintGrid
              template="1fr 2.2fr 0.9fr"
              headers={[
                { text: "Method" },
                { text: "Detail" },
                { text: "Amount", align: "right", nowrap: true },
              ]}
              rows={[
                ...entryLines.map((line) => [
                  { text: line.method, nowrap: true },
                  { text: line.detail },
                  { text: formatCents(line.amountCents), align: "right" as const, nowrap: true },
                ]),
                [
                  { text: "Total", span: 2, bold: true },
                  { text: formatCents(entryTotalCents || totalCents), align: "right" as const, nowrap: true, bold: true },
                ],
              ]}
            />
          </div>
        ) : null}

        <div className="mt-10 grid grid-cols-2 gap-16">
          <div className="text-center">
            <div className="border-t border-black pt-1">{toLabel}</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1">{fromLabel}</div>
          </div>
        </div>
      </div>
    </>
  )
}
