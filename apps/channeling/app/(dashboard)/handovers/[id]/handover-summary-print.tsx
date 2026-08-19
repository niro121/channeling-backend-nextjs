"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import { formatCents } from "@/lib/format-money"
import { formatDenomLabel, FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { HANDOVER_STATUS } from "@/types/handover"
import type { CashierSummaryPaymentAmounts, CashierSummaryIncludedShift } from "@/types/report"

const METHOD_KEYS = ["cashCents", "cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const
const METHOD_PRINT_LABELS: Record<(typeof METHOD_KEYS)[number], string> = {
  cashCents: "CASH VALUE",
  cardCents: "CREDIT CARD VALUE",
  slipCents: "SLIP VALUE",
  checkCents: "CHEQUE VALUE",
  creditCents: "CREDIT VALUE",
  eWalletCents: "E-WALLET VALUE",
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

type SummaryHandover = {
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
  fromUser?: StaffUser
  toUser?: StaffUser
  shift?: {
    id: string
    startedAt?: Date | string | null
    endedAt?: Date | string | null
  } | null
}

type PreviousHandover = {
  id: string
  createdAt?: Date | string
  totalCents: number
  handoverNoString?: string | null
  fromUser?: StaffUser
}

type ReceivedFloat = {
  id: string
  floatNoString?: string | null
  status: number
  direction?: "in" | "out"
  amountReceivedCents: number
  receivedAt?: Date | string | null
  createdAt?: Date | string
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
  return `${formatPrintDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function formatPrintDateTimeCompact(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return `${formatPrintDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
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

function sumSummaryRupees(t: CashierSummaryPaymentAmounts): number {
  return t.cash + t.creditCard + t.slip + t.cheque + t.agent + t.agentCredit + t.eWallet
}

function handoverStatusLabel(status: number | undefined): string {
  if (status === HANDOVER_STATUS.APPROVED) return "Approved"
  if (status === HANDOVER_STATUS.REJECTED) return "Rejected"
  if (status === HANDOVER_STATUS.CANCELLED) return "Cancelled"
  if (status === HANDOVER_STATUS.PENDING) return "Pending"
  return "—"
}

type PrintCell = {
  text: string
  align?: "left" | "right"
  nowrap?: boolean
  span?: number
  bold?: boolean
}

function cellStyle(opts: {
  head?: boolean
  lastCol?: boolean
  lastRow?: boolean
  align?: "left" | "right"
  nowrap?: boolean
  span?: number
  bold?: boolean
}): CSSProperties {
  return {
    padding: "1px 2px",
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

function MiniGrid({
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
  const render = (cells: PrintCell[], rowIndex: number, head: boolean) => {
    let col = 0
    return cells.map((cell, i) => {
      const span = cell.span ?? 1
      const lastCol = col + span >= colCount
      col += span
      return (
        <div
          key={`${head ? "h" : "r"}-${rowIndex}-${i}`}
          className={[
            "summary-cell",
            lastCol ? "summary-last-col" : "",
            !head && rowIndex === lastRow ? "summary-last-row" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={cellStyle({
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
    <div className="summary-grid" style={{ display: "grid", width: "100%", gridTemplateColumns: template }}>
      {render(headers, 0, true)}
      {rows.map((cells, r) => render(cells, r, false))}
    </div>
  )
}

export function HandoverSummaryPrint({
  handover,
  receivedFloats,
  includedHandovers,
  cashierSummary,
  tillBreakdown,
}: {
  handover: SummaryHandover
  receivedFloats: ReceivedFloat[]
  includedHandovers: PreviousHandover[]
  cashierSummary?: {
    grandTotals: CashierSummaryPaymentAmounts
    includedShifts?: CashierSummaryIncludedShift[]
  } | null
  tillBreakdown?: TillBreakdown
}) {
  const { data: session } = useSession()
  const [generatedAt, setGeneratedAt] = useState(() => formatPrintDateTime(new Date()))
  useEffect(() => {
    const stamp = () => setGeneratedAt(formatPrintDateTime(new Date()))
    window.addEventListener("beforeprint", stamp)
    return () => window.removeEventListener("beforeprint", stamp)
  }, [])

  const reportStatus = handoverStatusLabel(handover.status)

  const fromLabel = personLabel(handover.fromUser)
  const toLabel = personLabel(handover.toUser)
  const billNo = handover.handoverNoString || shortRef("HO", handover.id)
  const generatedBy = (session?.user?.name ?? "—").toUpperCase()

  const totalCents =
    handover.totalCents ??
    handover.cashCents +
      handover.cardCents +
      handover.slipCents +
      handover.checkCents +
      handover.creditCents +
      handover.eWalletCents

  const cashInRows = [
    ...receivedFloats
      .filter((f) => f.status === FLOAT_REQUEST_STATUS.RECEIVED && f.direction !== "out")
      .map((f) => ({
        billNo: f.floatNoString || shortRef("FL", f.id),
        date: formatPrintDateTimeCompact(f.receivedAt ?? f.createdAt),
        from: (f.bulkCashier?.name ?? "BULK CASHIER").toUpperCase(),
        valueCents: f.amountReceivedCents,
      })),
    ...includedHandovers.map((h) => ({
      billNo: h.handoverNoString || shortRef("HO", h.id),
      date: formatPrintDateTimeCompact(h.createdAt),
      from: personLabel(h.fromUser),
      valueCents: h.totalCents,
    })),
  ]
  const cashOutRows = receivedFloats
    .filter((f) => f.status === FLOAT_REQUEST_STATUS.RECEIVED && f.direction === "out")
    .map((f) => ({
      billNo: f.floatNoString || shortRef("FL", f.id),
      date: formatPrintDateTimeCompact(f.receivedAt ?? f.createdAt),
      to: (f.bulkCashier?.name ?? "CASHIER").toUpperCase(),
      valueCents: f.amountReceivedCents,
    }))
  const cashOutTotal = cashOutRows.reduce((s, r) => s + r.valueCents, 0)

  const cashInTotal = cashInRows.reduce((s, r) => s + r.valueCents, 0)

  const summaryTotal =
    cashierSummary != null
      ? Math.round(sumSummaryRupees(cashierSummary.grandTotals) * 100)
      : Math.max(0, totalCents - cashInTotal)

  const summaryRows = [
    {
      name: "CASHIER",
      no: handover.shift?.id ? shortRef("SH", handover.shift.id) : "—",
      from: formatPrintDateTimeCompact(handover.shift?.startedAt),
      to: formatPrintDateTimeCompact(handover.createdAt),
      valueCents: summaryTotal,
    },
  ]

  const cashInPlusSummary = cashInTotal + summaryTotal - cashOutTotal

  let shortExcessCents = 0
  if (tillBreakdown) {
    const expected = METHOD_KEYS.reduce((s, key) => s + (tillBreakdown[key] ?? 0), 0)
    shortExcessCents = totalCents - expected
  } else {
    shortExcessCents = totalCents - cashInPlusSummary
  }

  const methodLines = METHOD_KEYS.filter((key) => (handover[key] ?? 0) > 0).map((key) => ({
    label: METHOD_PRINT_LABELS[key],
    cents: handover[key] ?? 0,
  }))

  const breakdown = parseBreakdown(handover.enteredBreakdown)
  const denoms = (breakdown?.cashDenominations ?? []).filter((d) => d.count > 0)
  const nonCash: { name: string; date: string; detail: string; valueCents: number }[] = []
  const pushEntries = (
    name: string,
    entries: { reference: string; amountCents: number }[] | undefined
  ) => {
    for (const e of entries ?? []) {
      if ((e.amountCents ?? 0) === 0 && !(e.reference ?? "").trim()) continue
      nonCash.push({
        name,
        date: formatPrintDate(handover.createdAt),
        detail: (e.reference ?? "").trim() || "—",
        valueCents: e.amountCents,
      })
    }
  }
  pushEntries("CREDIT/DEBIT_CARD", breakdown?.cardEntries)
  pushEntries("SLIP", breakdown?.slipEntries)
  pushEntries("CHEQUE", breakdown?.checkEntries)
  pushEntries("CREDIT", breakdown?.creditEntries)
  pushEntries("E-WALLET", breakdown?.eWalletEntries)
  const nonCashTotal = nonCash.reduce((s, r) => s + r.valueCents, 0)

  return (
    <>
      <style>{`
        .handover-summary-print { display: none; }
        @media print {
          @page { size: A6 portrait; margin: 4mm 12mm; }
          body.print-handover-summary header.sticky,
          body.print-handover-summary nav,
          body.print-handover-summary aside,
          body.print-handover-summary [data-slot="sidebar"],
          body.print-handover-summary .handover-screen,
          body.print-handover-summary .handover-cash-in-print {
            display: none !important;
          }
          body.print-handover-summary .handover-summary-print {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 3mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #000 !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.print-handover-summary .summary-grid {
            width: 100% !important;
            max-width: 100% !important;
          }
          body.print-handover-summary .summary-cell {
            border-top: 1px solid #000 !important;
            border-left: 0 !important;
            border-right: 0 !important;
            border-bottom: 0 !important;
            color: #000 !important;
            background: #fff !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            white-space: normal !important;
            padding: 1px 1px !important;
          }
          body.print-handover-summary .summary-last-col { border-right: 0 !important; }
          body.print-handover-summary .summary-last-row { border-bottom: 1px solid #000 !important; }
          body.print-handover-summary .handover-summary-print .print-totals {
            width: auto !important;
            max-width: 100% !important;
          }
          body.print-handover-summary .handover-summary-print .print-signatures {
            gap: 1rem !important;
          }
        }
      `}</style>
      <div className="handover-summary-print text-black bg-white font-mono text-[10px] leading-tight">
        <p className="text-center font-bold tracking-wide text-[13px] mb-1">HAND OVER REPORT</p>
        <p className="text-center font-bold tracking-wide text-[15px] mb-1.5">
          {reportStatus.toUpperCase()}
        </p>
        <div className="mb-1.5 space-y-0">
          <p>
            <span className="inline-block w-[4.6rem]">BILL NO</span>: {billNo}
          </p>
          <p>
            <span className="inline-block w-[4.6rem]">BILL AT</span>: {formatPrintDateTime(handover.createdAt)}
          </p>
          <p>
            <span className="inline-block w-[4.6rem]">FROM</span>: {fromLabel}
          </p>
          <p>
            <span className="inline-block w-[4.6rem]">TO</span>: {toLabel}
          </p>
          <p>
            <span className="inline-block w-[4.6rem]">GENERATED</span>: {generatedAt} ({generatedBy})
          </p>
        </div>

        {cashInRows.length > 0 ? (
          <div className="mb-1.5">
            <p className="text-center font-bold mb-0.5">CASH IN</p>
            <MiniGrid
              template="minmax(0,0.85fr) minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,0.75fr)"
              headers={[
                { text: "Bill No", nowrap: true },
                { text: "Date" },
                { text: "From" },
                { text: "Value", align: "right", nowrap: true },
              ]}
              rows={cashInRows.map((row) => [
                { text: row.billNo, nowrap: true },
                { text: row.date },
                { text: row.from },
                { text: formatCents(row.valueCents), align: "right" as const, nowrap: true },
              ])}
            />
          </div>
        ) : null}

        {cashOutRows.length > 0 ? (
          <div className="mb-1.5">
            <p className="text-center font-bold mb-0.5">CASH OUT</p>
            <MiniGrid
              template="minmax(0,0.85fr) minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,0.75fr)"
              headers={[
                { text: "Bill No", nowrap: true },
                { text: "Date" },
                { text: "To" },
                { text: "Value", align: "right", nowrap: true },
              ]}
              rows={cashOutRows.map((row) => [
                { text: row.billNo, nowrap: true },
                { text: row.date },
                { text: row.to },
                { text: formatCents(row.valueCents), align: "right" as const, nowrap: true },
              ])}
            />
          </div>
        ) : null}

        <div className="mb-1.5">
          <p className="text-center font-bold mb-0.5">SUMMARY</p>
          <MiniGrid
            template="minmax(0,0.75fr) minmax(0,0.9fr) minmax(0,1.05fr) minmax(0,1.05fr) minmax(0,0.8fr)"
            headers={[
              { text: "Name" },
              { text: "No", nowrap: true },
              { text: "From" },
              { text: "To" },
              { text: "Value", align: "right", nowrap: true },
            ]}
            rows={summaryRows.map((row) => [
              { text: row.name },
              { text: row.no, nowrap: true },
              { text: row.from },
              { text: row.to },
              {
                text: row.valueCents > 0 ? formatCents(row.valueCents) : "",
                align: "right" as const,
                nowrap: true,
              },
            ])}
          />
        </div>

        <div className="ml-auto print-totals w-[14rem] max-w-full mb-1.5">
          <div className="flex justify-between border-t border-black pt-0.5">
            <span>{cashOutTotal > 0 ? "IN + SUMMARY - OUT" : "CASH IN + SUMMARY"}</span>
            <span className="tabular-nums">{formatCents(cashInPlusSummary)}</span>
          </div>
          <div className="border-b-2 border-double border-black mt-0.5" />
        </div>

        <div className="print-totals w-[12rem] max-w-full mb-1.5 space-y-0">
          {methodLines.map((line) => (
            <div key={line.label} className="flex justify-between gap-2">
              <span>{line.label} =</span>
              <span className="tabular-nums">{formatCents(line.cents)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2">
            <span>SHORT/EXCESS =</span>
            <span className="tabular-nums">
              {shortExcessCents === 0 ? "0.00" : `${shortExcessCents < 0 ? "" : "+"}${formatCents(shortExcessCents)}`}
            </span>
          </div>
          <div className="flex justify-between gap-2 font-bold border-t border-black pt-0.5">
            <span>TOTAL COLLECTION</span>
            <span className="tabular-nums">{formatCents(totalCents)}</span>
          </div>
          <div className="border-b-2 border-double border-black" />
        </div>

        {denoms.length > 0 ? (
          <div className="mb-1.5">
            <p className="font-bold mb-0.5">NOTE</p>
            <div className="grid grid-cols-2 gap-x-4">
              {denoms.map((d) => (
                <p key={d.value} className="tabular-nums">
                  {formatDenomLabel(d.value)} x {d.count} = {formatCents(Math.round(d.value * d.count * 100))}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {nonCash.length > 0 ? (
          <div className="mb-1.5">
            <p className="text-center font-bold mb-0.5">CHEQUE, CREDIT CARD, SLIP &amp; E-WALLET</p>
            <MiniGrid
              template="minmax(0,0.95fr) minmax(0,0.85fr) minmax(0,1.35fr) minmax(0,0.75fr)"
              headers={[
                { text: "Name", nowrap: true },
                { text: "Date" },
                { text: "Detail" },
                { text: "Value", align: "right", nowrap: true },
              ]}
              rows={[
                ...nonCash.map((row) => [
                  { text: row.name, nowrap: true },
                  { text: row.date },
                  { text: row.detail },
                  { text: formatCents(row.valueCents), align: "right" as const, nowrap: true },
                ]),
                [
                  { text: "TOTAL", span: 3, bold: true },
                  { text: formatCents(nonCashTotal), align: "right" as const, nowrap: true, bold: true },
                ],
              ]}
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 print-signatures gap-8">
          <div className="text-center">
            <div className="border-t border-black pt-0.5">{toLabel}</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-0.5">{fromLabel}</div>
          </div>
        </div>
      </div>
    </>
  )
}
