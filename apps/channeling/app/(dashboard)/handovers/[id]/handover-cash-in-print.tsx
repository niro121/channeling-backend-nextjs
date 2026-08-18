"use client"

import type { CSSProperties } from "react"
import { formatCents } from "@/lib/format-money"
import { formatDenomLabel, FLOAT_REQUEST_STATUS } from "@/types/float-request"
import type { CashierSummaryPaymentAmounts } from "@/types/report"

const METHOD_KEYS = ["cashCents", "cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const
const METHOD_PRINT_LABELS: Record<(typeof METHOD_KEYS)[number], string> = {
  cashCents: "Cash Value",
  cardCents: "Credit Card Value",
  slipCents: "Slip Value",
  checkCents: "Cheque Value",
  creditCents: "Credit Value",
  eWalletCents: "E-Wallet Value",
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
}

type ReceivedFloat = {
  id: string
  floatNoString?: string | null
  status: number
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

function sumSummaryRupees(t: CashierSummaryPaymentAmounts): number {
  return t.cash + t.creditCard + t.slip + t.cheque + t.agent + t.agentCredit + t.eWallet
}

function rupeesToCents(n: number): number {
  return Math.round(n * 100)
}

const printGrid = "inset -1px 0 0 #000, inset 0 -1px 0 #000"
const printTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  borderSpacing: 0,
  border: "1px solid #000",
}
const printCellStyle: CSSProperties = {
  border: "1px solid #000",
  boxShadow: printGrid,
  padding: "2px 6px",
}
const printHeadStyle: CSSProperties = {
  ...printCellStyle,
  fontWeight: 700,
  textAlign: "left",
}

export function HandoverCashInPrint({
  handover,
  receivedFloats,
  includedHandovers,
  cashierSummary,
  tillBreakdown,
}: {
  handover: CashInHandover
  receivedFloats: ReceivedFloat[]
  includedHandovers: PreviousHandover[]
  cashierSummary: {
    grandTotals: CashierSummaryPaymentAmounts
  } | null
  tillBreakdown?: TillBreakdown
}) {
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

  const cashInRows: { billNo: string; date: string; from: string; valueCents: number }[] = [
    ...receivedFloats
      .filter((f) => f.status === FLOAT_REQUEST_STATUS.RECEIVED)
      .map((f) => ({
        billNo: f.floatNoString || shortRef("FL", f.id),
        date: formatPrintDateTime(f.receivedAt ?? f.createdAt),
        from: (f.bulkCashier?.name ?? "Bulk cashier").toUpperCase(),
        valueCents: f.amountReceivedCents,
      })),
    ...includedHandovers.map((h) => ({
      billNo: h.handoverNoString || shortRef("HO", h.id),
      date: formatPrintDateTime(h.createdAt),
      from: personLabel(h.fromUser),
      valueCents: h.totalCents,
    })),
  ]
  const cashInTotal = cashInRows.reduce((s, r) => s + r.valueCents, 0)

  const summaryTotalFromReport = cashierSummary
    ? rupeesToCents(sumSummaryRupees(cashierSummary.grandTotals))
    : null
  const summaryTotal =
    summaryTotalFromReport != null ? summaryTotalFromReport : Math.max(0, totalCents - cashInTotal)
  const summaryRows = [
    {
      name: "Cashier",
      no: handover.shift?.id ? shortRef("SH", handover.shift.id) : "—",
      from: formatPrintDateTime(handover.shift?.startedAt),
      to: formatPrintDateTime(handover.createdAt),
      valueCents: summaryTotal,
    },
  ]

  const cashInPlusSummary = cashInTotal + summaryTotal

  let shortExcessCents = cashInPlusSummary - totalCents
  if (tillBreakdown) {
    const expected = METHOD_KEYS.reduce((s, key) => s + (tillBreakdown[key] ?? 0), 0)
    shortExcessCents = totalCents - expected
  }

  const breakdown = parseBreakdown(handover.enteredBreakdown)
  const denoms = (breakdown?.cashDenominations ?? []).filter((d) => d.count > 0)
  const denomMid = Math.ceil(denoms.length / 2)
  const denomLeft = denoms.slice(0, denomMid)
  const denomRight = denoms.slice(denomMid)

  const nonCash: { name: string; description: string; date: string; valueCents: number }[] = []
  const pushEntries = (
    name: string,
    entries: { reference: string; amountCents: number }[] | undefined
  ) => {
    for (const e of entries ?? []) {
      if ((e.amountCents ?? 0) === 0 && !(e.reference ?? "").trim()) continue
      nonCash.push({
        name,
        description: e.reference || "—",
        date: formatPrintDate(handover.createdAt),
        valueCents: e.amountCents,
      })
    }
  }
  pushEntries("Credit/Debit_Card", breakdown?.cardEntries)
  pushEntries("Slip", breakdown?.slipEntries)
  pushEntries("Cheque", breakdown?.checkEntries)
  pushEntries("Credit", breakdown?.creditEntries)
  pushEntries("E-Wallet", breakdown?.eWalletEntries)
  const nonCashTotal = nonCash.reduce((s, r) => s + r.valueCents, 0)

  const methodLines = METHOD_KEYS.filter((key) => (handover[key] ?? 0) > 0).map((key) => ({
    label: METHOD_PRINT_LABELS[key],
    cents: handover[key] ?? 0,
  }))

  const denomLine = (d: { value: number; count: number }) =>
    `${formatDenomLabel(d.value)} x ${d.count} = ${formatCents(Math.round(d.value * d.count * 100))}`

  return (
    <>
      <style>{`
        .handover-cash-in-print { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body {
            background: #fff !important;
            color: #000 !important;
            overflow: visible !important;
            height: auto !important;
          }
          header, nav, aside, [data-slot="sidebar"] { display: none !important; }
          .handover-screen { display: none !important; }
          .handover-cash-in-print {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .handover-cash-in-print table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            border: 1px solid #000 !important;
          }
          .handover-cash-in-print th,
          .handover-cash-in-print td {
            border: 1px solid #000 !important;
            box-shadow: inset -1px 0 0 #000, inset 0 -1px 0 #000 !important;
            outline: 1px solid #000 !important;
            outline-offset: -1px !important;
            padding: 2px 6px !important;
            color: #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="handover-cash-in-print text-black bg-white font-sans text-[11px] leading-tight">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p>
              <span className="inline-block w-[4.5rem]">Bill No</span>
              <span>: {billNo}</span>
            </p>
            <p>
              <span className="inline-block w-[4.5rem]">Bill At</span>
              <span>: {formatPrintDateTime(handover.createdAt)}</span>
            </p>
            {locationLabel ? (
              <p>
                <span className="inline-block w-[4.5rem]">Location</span>
                <span>: {locationLabel}</span>
              </p>
            ) : null}
            <p>
              <span className="inline-block w-[4.5rem]">From</span>
              <span>: {fromLabel}</span>
            </p>
            <p>
              <span className="inline-block w-[4.5rem]">To</span>
              <span>: {toLabel}</span>
            </p>
          </div>
          <p className="text-base font-bold tracking-wide">CASH IN</p>
        </div>

        {cashInRows.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">Cash In</p>
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printHeadStyle}>Bill No</th>
                  <th style={printHeadStyle}>Date</th>
                  <th style={printHeadStyle}>From</th>
                  <th style={{ ...printHeadStyle, textAlign: "right" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {cashInRows.map((row) => (
                  <tr key={row.billNo}>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.billNo}</td>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.date}</td>
                    <td style={printCellStyle}>{row.from}</td>
                    <td style={{ ...printCellStyle, textAlign: "right", whiteSpace: "nowrap" }}>{formatCents(row.valueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-3">
          <p className="font-semibold mb-0.5">Summary</p>
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printHeadStyle}>Name</th>
                  <th style={printHeadStyle}>No</th>
                  <th style={printHeadStyle}>From</th>
                  <th style={printHeadStyle}>To</th>
                  <th style={{ ...printHeadStyle, textAlign: "right" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.no}>
                    <td style={printCellStyle}>{row.name}</td>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.no}</td>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.from}</td>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.to}</td>
                    <td style={{ ...printCellStyle, textAlign: "right", whiteSpace: "nowrap" }}>{formatCents(row.valueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        <div className="mt-2 ml-auto w-[16rem]">
          <div className="flex justify-between gap-4 border-t border-dashed border-black pt-0.5">
            <span>Cash In + Summary</span>
            <span className="tabular-nums">{formatCents(cashInPlusSummary)}</span>
          </div>
          <div className="border-b-2 border-double border-black mt-0.5" />
        </div>

        <div className="mt-3 w-[18rem] space-y-0.5">
          {methodLines.map((line) => (
            <div key={line.label} className="flex justify-between gap-4">
              <span>{line.label} =</span>
              <span className="tabular-nums">{formatCents(line.cents)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4">
            <span>Short/Excess =</span>
            <span className="tabular-nums">
              {shortExcessCents === 0 ? "0.00" : `${shortExcessCents < 0 ? "" : "+"}${formatCents(shortExcessCents)}`}
            </span>
          </div>
          <div className="flex justify-between gap-4 font-semibold border-t border-black pt-0.5">
            <span>Total Collection</span>
            <span className="tabular-nums">{formatCents(totalCents)}</span>
          </div>
          <div className="border-b-2 border-double border-black" />
        </div>

        {denoms.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">NOTE</p>
            <div className="grid grid-cols-2 gap-x-8">
              <div className="space-y-0.5">
                {denomLeft.map((d) => (
                  <p key={`l-${d.value}`} className="tabular-nums">
                    {denomLine(d)}
                  </p>
                ))}
              </div>
              <div className="space-y-0.5">
                {denomRight.map((d) => (
                  <p key={`r-${d.value}`} className="tabular-nums">
                    {denomLine(d)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {nonCash.length > 0 ? (
          <div className="mt-3">
            <p className="font-semibold mb-0.5">Cheque, Credit Card, Credit, Slip &amp; E-Wallet Transactions</p>
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printHeadStyle}>Name</th>
                  <th style={printHeadStyle}>Description</th>
                  <th style={printHeadStyle}>Date</th>
                  <th style={{ ...printHeadStyle, textAlign: "right" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {nonCash.map((row, i) => (
                  <tr key={`${row.name}-${i}`}>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.name}</td>
                    <td style={printCellStyle}>{row.description}</td>
                    <td style={{ ...printCellStyle, whiteSpace: "nowrap" }}>{row.date}</td>
                    <td style={{ ...printCellStyle, textAlign: "right", whiteSpace: "nowrap" }}>{formatCents(row.valueCents)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...printCellStyle, fontWeight: 700 }} colSpan={3}>
                    Total
                  </td>
                  <td style={{ ...printCellStyle, textAlign: "right", fontWeight: 700 }}>{formatCents(nonCashTotal)}</td>
                </tr>
              </tbody>
            </table>
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
