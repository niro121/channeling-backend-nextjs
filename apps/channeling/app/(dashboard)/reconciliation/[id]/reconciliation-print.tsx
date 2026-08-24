"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { formatCents, receiptAmountToCents } from "@/lib/format-money"
import { PAYMENT_METHOD_NAMES, RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import { RECONCILIATION_STATUS } from "@/types/handover"
import { formatReceiptMatchLine, type HandoverTabData } from "./reconciliation-document-view"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function formatPrintDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function fromUserLabel(fromUser: HandoverTabData["handover"]["fromUser"]): string {
  if (!fromUser) return "—"
  const name = (fromUser.name ?? "—").toUpperCase()
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
}

function reconciliationStatusLabel(status: number | null | undefined): string {
  switch (status) {
    case RECONCILIATION_STATUS.IN_RECONCILIATION:
      return "IN RECONCILIATION"
    case RECONCILIATION_STATUS.RECONCILED_APPROVED:
      return "RECONCILED"
    case RECONCILIATION_STATUS.RECONCILED_REJECTED:
      return "REJECTED"
    case RECONCILIATION_STATUS.PENDING:
      return "PENDING"
    default:
      return "—"
  }
}

const NON_CASH_METHODS = [
  RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
  RECEIPT_PAYMENT_METHOD.SLIP,
  RECEIPT_PAYMENT_METHOD.CHECK,
  RECEIPT_PAYMENT_METHOD.E_WALLET,
] as const

type Props = {
  topLevelHandoverId: string
  handoverNoString?: string | null
  reconciliationStatus?: number
  hasReconciliationIssues?: boolean
  chain: HandoverTabData[]
  tickedByHandoverId: Record<string, Set<string>>
  cannotByHandoverId?: Record<string, Record<string, string>>
}

export function ReconciliationPrint({
  topLevelHandoverId,
  handoverNoString,
  reconciliationStatus,
  hasReconciliationIssues = false,
  chain,
  tickedByHandoverId,
  cannotByHandoverId = {},
}: Props) {
  const { data: session } = useSession()
  const [generatedAt, setGeneratedAt] = useState(() => formatPrintDateTime(new Date()))
  useEffect(() => {
    const stamp = () => setGeneratedAt(formatPrintDateTime(new Date()))
    window.addEventListener("beforeprint", stamp)
    return () => window.removeEventListener("beforeprint", stamp)
  }, [])

  const generatedBy = (session?.user?.name ?? "—").toUpperCase()

  const requiredByMethod: Record<string, number> = { cardCents: 0, slipCents: 0, checkCents: 0, eWalletCents: 0 }
  for (const { handover } of chain) {
    requiredByMethod.cardCents += handover.cardCents
    requiredByMethod.slipCents += handover.slipCents
    requiredByMethod.checkCents += handover.checkCents
    requiredByMethod.eWalletCents += handover.eWalletCents
  }

  const methodKeyMap: Record<number, string> = {
    [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: "cardCents",
    [RECEIPT_PAYMENT_METHOD.SLIP]: "slipCents",
    [RECEIPT_PAYMENT_METHOD.CHECK]: "checkCents",
    [RECEIPT_PAYMENT_METHOD.E_WALLET]: "eWalletCents",
  }

  const tickedByMethod: Record<string, number> = { cardCents: 0, slipCents: 0, checkCents: 0, eWalletCents: 0 }
  const tickedReceipts: {
    receiptNo: string
    method: number
    amount: number
    reference: string
    date: string
    from: string
    ticked: boolean
    status: string
    reason: string
  }[] = []

  for (const tab of chain) {
    const ticked = tickedByHandoverId[tab.handover.id] ?? new Set()
    const cannot = cannotByHandoverId[tab.handover.id] ?? {}
    for (const r of tab.receipts) {
      const method = r.paymentMethod
      if (!NON_CASH_METHODS.includes(method as typeof NON_CASH_METHODS[number])) continue
      const cents = receiptAmountToCents(r.amount)
      const net = r.type === 1 ? cents : -cents
      const isCannot = Boolean(r.cannotReconcileAt) || Boolean(cannot[r.id])
      const isPosted = Boolean(r.reconciledAt) && !isCannot
      const isTicked = !isCannot && (isPosted || ticked.has(r.id))
      const key = methodKeyMap[method]
      if (isTicked && key) tickedByMethod[key] += net
      const ref = formatReceiptMatchLine(r)
      const reason = (r.cannotReconcileReason ?? cannot[r.id] ?? "").trim()
      tickedReceipts.push({
        receiptNo: r.receiptNoString,
        method,
        amount: net,
        reference: ref,
        date: formatPrintDateTime(r.createdAt),
        from: fromUserLabel(tab.handover.fromUser),
        ticked: isTicked,
        status: isCannot ? "CAN'T RECONCILE" : isPosted ? "POSTED" : isTicked ? "TICKED" : "OPEN",
        reason: isCannot ? reason : "",
      })
    }
  }

  return (
    <>
      <style>{`
        .reconciliation-print { display: none; }
        @media print {
          @page { margin: 4mm 12mm; }
          body.print-reconciliation header.sticky,
          body.print-reconciliation nav,
          body.print-reconciliation aside,
          body.print-reconciliation [data-slot="sidebar"],
          body.print-reconciliation .reconciliation-screen {
            display: none !important;
          }
          body.print-reconciliation .reconciliation-print {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 3mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #000 !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.print-reconciliation .recon-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          body.print-reconciliation .recon-table th,
          body.print-reconciliation .recon-table td {
            border-top: 1px solid #000 !important;
            padding: 1px 3px !important;
            text-align: left !important;
            font-size: 10px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          body.print-reconciliation .recon-table th {
            font-weight: 700 !important;
          }
          body.print-reconciliation .recon-table tr:last-child td {
            border-bottom: 1px solid #000 !important;
          }
          body.print-reconciliation .recon-table .text-right {
            text-align: right !important;
          }
          body.print-reconciliation .recon-title {
            font-size: 14px !important;
          }
          body.print-reconciliation .recon-section-title {
            font-size: 11px !important;
          }
        }
      `}</style>
      <div className="reconciliation-print text-black bg-white font-mono text-[11px] leading-snug">
        <p className="recon-title text-center font-bold tracking-wide text-[14px] mb-1">RECONCILIATION REPORT</p>
        <div className="mb-1.5 space-y-0">
          <p>
            <span className="inline-block w-[7rem]">HANDOVER NO</span>: {(handoverNoString ?? "—").toUpperCase()}
          </p>
          <p>
            <span className="inline-block w-[7rem]">STATUS</span>: {reconciliationStatusLabel(reconciliationStatus)}
            {hasReconciliationIssues ? "  |  ISSUES" : ""}
          </p>
          <p>
            <span className="inline-block w-[7rem]">HANDOVER ID</span>: {topLevelHandoverId.slice(-8).toUpperCase()}
          </p>
          <p>
            <span className="inline-block w-[7rem]">GENERATED</span>: {generatedAt} ({generatedBy})
          </p>
        </div>

        {/* Handovers summary */}
        <div className="mb-1.5">
          <p className="recon-section-title text-center font-bold mb-0.5">HANDOVER DOCUMENTS</p>
          <table className="recon-table">
            <thead>
              <tr>
                <th>#</th>
                <th>FROM</th>
                <th>DATE</th>
                <th className="text-right">CARD</th>
                <th className="text-right">SLIP</th>
                <th className="text-right">CHQ</th>
                <th className="text-right">E-WAL</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((tab, idx) => (
                <tr key={tab.handover.id}>
                  <td>{idx + 1}</td>
                  <td>{fromUserLabel(tab.handover.fromUser)}</td>
                  <td>{formatPrintDateTime(tab.handover.createdAt)}</td>
                  <td className="text-right">{formatCents(tab.handover.cardCents)}</td>
                  <td className="text-right">{formatCents(tab.handover.slipCents)}</td>
                  <td className="text-right">{formatCents(tab.handover.checkCents)}</td>
                  <td className="text-right">{formatCents(tab.handover.eWalletCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Method-wise summary */}
        <div className="mb-1.5">
          <p className="recon-section-title text-center font-bold mb-0.5">RECONCILIATION SUMMARY</p>
          <table className="recon-table">
            <thead>
              <tr>
                <th>METHOD</th>
                <th className="text-right">TARGET</th>
                <th className="text-right">TICKED</th>
                <th className="text-right">DIFF</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {NON_CASH_METHODS.map((method) => {
                const key = methodKeyMap[method]
                const target = requiredByMethod[key] ?? 0
                const ticked = tickedByMethod[key] ?? 0
                const diff = ticked - target
                const ok = diff === 0
                return (
                  <tr key={method}>
                    <td>{(PAYMENT_METHOD_NAMES[method] ?? "—").toUpperCase()}</td>
                    <td className="text-right">{formatCents(target)}</td>
                    <td className="text-right">{formatCents(ticked)}</td>
                    <td className="text-right">{diff === 0 ? "0.00" : formatCents(diff)}</td>
                    <td>{ok ? "OK" : "MISMATCH"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Ticked receipts per method */}
        {NON_CASH_METHODS.map((method) => {
          const methodReceipts = tickedReceipts.filter((r) => r.method === method)
          if (methodReceipts.length === 0) return null
          return (
            <div key={method} className="mb-1.5">
              <p className="recon-section-title text-center font-bold mb-0.5">
                {(PAYMENT_METHOD_NAMES[method] ?? "—").toUpperCase()} RECEIPTS
              </p>
              <table className="recon-table">
                <thead>
                  <tr>
                    <th>TICK</th>
                    <th>RECEIPT #</th>
                    <th>FROM</th>
                    <th>BANK / REFERENCE</th>
                    <th className="text-right">AMOUNT</th>
                    <th>STATUS</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {methodReceipts.map((r, i) => (
                    <tr key={i}>
                      <td>{r.ticked ? "[X]" : "[ ]"}</td>
                      <td>{r.receiptNo}</td>
                      <td>{r.from}</td>
                      <td>{r.reference}</td>
                      <td className="text-right">{formatCents(r.amount)}</td>
                      <td>{r.status}</td>
                      <td>{r.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Signatures */}
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t border-black pt-0.5">RECONCILER</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-0.5">VERIFIED BY</div>
          </div>
        </div>
      </div>
    </>
  )
}
