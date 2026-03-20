"use client"

import { useState } from "react"
import {
  searchBookingsAction,
  getSessionByIdForChannelBooking,
} from "@/app/actions/channel-booking"
import type { SearchBookingsResultItem } from "@/services/channel-booking/search-bookings.service"
import type { ChannelBookingRecord } from "../../context/channel-booking-context"
import { useChannelBooking } from "../../context/channel-booking-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"
import moment from "moment"

function paidLabel(status: number, methodName: string): string {
  if (status === 2) return `Canceled - ${methodName}`
  if (status === 1) return `Paid - ${methodName}`
  if (status === 0) return `Credit - ${methodName}`
  return "—"
}

export function SearchTab() {
  const {
    initialData,
    onDoctorSelect,
    onSessionSelect,
    onBookingSelect,
    setActiveInformationTab,
    clearTransferSelection,
  } = useChannelBooking()

  const [keyword, setKeyword] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SearchBookingsResultItem[]>([])
  const [truncated, setTruncated] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSearch = async () => {
    const from = fromDate ? moment(fromDate).toDate() : null
    const to = toDate ? moment(toDate).toDate() : null
    if (!keyword.trim() && !from && !to) {
      setSearched(true)
      setData([])
      setTruncated(false)
      return
    }
    setLoading(true)
    setSearched(true)
    setTruncated(false)
    setSelectedId(null)
    try {
      const res = await searchBookingsAction({
        keyword: keyword.trim() || undefined,
        fromDate: from ?? undefined,
        toDate: to ?? undefined,
      })
      if (res.success && res.data) {
        setData(res.data)
        setTruncated(res.truncated ?? false)
      } else {
        setData([])
        setTruncated(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = async (row: SearchBookingsResultItem) => {
    setSelectedId(row.id)
    clearTransferSelection()
    const bookingRecord: ChannelBookingRecord = {
      id: row.id,
      appointmentNo: row.appointmentNo,
      title: row.title,
      name: row.name,
      status: row.status,
      method: row.method,
      methodName: row.methodName,
      agencyRef: row.agencyRef,
      staffId: row.staffId,
      staffCode: row.staffCode,
    }
    if (row.sessionId) {
      const sessionRes = await getSessionByIdForChannelBooking(row.sessionId)
      if (sessionRes.success && sessionRes.data) {
        const session = sessionRes.data
        const doctorId = session.doctorId ?? session.doctor?.id
        if (doctorId && initialData?.doctors) {
          const doctor = initialData.doctors.find((d) => d.id === doctorId)
          if (doctor) onDoctorSelect(doctor)
        }
        onSessionSelect(session)
      }
    }
    onBookingSelect(bookingRecord)
    setActiveInformationTab("booking")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs font-medium text-muted-foreground sr-only">
            Search
          </label>
          <Input
            placeholder="Search (Name, Mobile, Agent Ref, Bill No (Digits Part))"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground block">
            From Date
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 w-[140px] text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground block">
            To Date
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 w-[140px] text-xs"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          Search
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <h4 className="text-sm font-semibold px-3 py-2 border-b border-border">
          Bookings
        </h4>
        <div className="min-h-[120px]">
          {!searched ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Enter search criteria and click Search.
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              No booking data.
            </div>
          ) : (
            <>
              {truncated && (
                <p className="text-xs text-amber-600 dark:text-amber-400 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-border">
                  More than 50 results. Narrow the search.
                </p>
              )}
              <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">No</th>
                      <th className="text-left px-2 py-1.5 font-medium">Name</th>
                      <th className="text-left px-2 py-1.5 font-medium">Phone</th>
                      <th className="text-left px-2 py-1.5 font-medium">Agent Ref No</th>
                      <th className="text-left px-2 py-1.5 font-medium">Agent</th>
                      <th className="text-left px-2 py-1.5 font-medium">Bill No</th>
                      <th className="text-left px-2 py-1.5 font-medium">Appo. No</th>
                      <th className="text-left px-2 py-1.5 font-medium">Consultant</th>
                      <th className="text-left px-2 py-1.5 font-medium">Paid</th>
                      <th className="text-left px-2 py-1.5 font-medium">Agent/Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const isSelected = selectedId === row.id
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row)}
                          className={cn(
                            "border-t border-border cursor-pointer transition-colors hover:bg-muted/50",
                            row.status === 2 &&
                              "text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20",
                            isSelected &&
                              (row.status === 2
                                ? "bg-red-200 dark:bg-red-900/60"
                                : "bg-primary/15")
                          )}
                        >
                          <td className="px-2 py-1.5 tabular-nums">
                            {row.appointmentNo}
                          </td>
                          <td className="px-2 py-1.5">
                            {[row.title, row.name]
                              .filter(Boolean)
                              .join(" ")
                              .trim() || "—"}
                          </td>
                          <td className="px-2 py-1.5">{row.phone || "—"}</td>
                          <td className="px-2 py-1.5">
                            {row.agencyRef || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {row.agencyName || "—"}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {row.receiptNoString ??
                              row.bookingid_string ??
                              "—"}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            <span
                              className={cn(
                                "tabular-nums",
                                !isSelected && "text-red-600 dark:text-red-400 font-medium"
                              )}
                            >
                              {String(row.appointmentNo).padStart(2, "0")}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            {row.doctorName || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {paidLabel(row.status, row.methodName)}
                          </td>
                          <td className="px-2 py-1.5">
                            {row.staffCode || row.staffName || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
