"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  getSmsActivityAction,
  getSmsLogRecentAction,
} from "@/app/actions/reports/sms-activity.action"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2, MessageCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

function formatDateLabel(iso: string) {
  const d = new Date(iso + "T12:00:00")
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })
}

export default function SmsActivityContent() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<Awaited<ReturnType<typeof getSmsActivityAction>>["data"] | null>(null)
  const [recentSearch, setRecentSearch] = useState("")
  const [recentSearchInput, setRecentSearchInput] = useState("")
  const [recentSms, setRecentSms] = useState<Awaited<ReturnType<typeof getSmsLogRecentAction>>["data"] | null>(null)
  const [recentLoading, setRecentLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getSmsActivityAction({ dateFrom, dateTo })
      if (result.success && result.data) {
        setData(result.data)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message ?? "Failed to load SMS activity.",
        })
        setData(null)
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load SMS activity.",
      })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchRecentSms = useCallback(async () => {
    setRecentLoading(true)
    try {
      const result = await getSmsLogRecentAction({ search: recentSearch || undefined })
      if (result.success && result.data) setRecentSms(result.data)
      else setRecentSms(null)
    } catch {
      setRecentSms(null)
    } finally {
      setRecentLoading(false)
    }
  }, [recentSearch])

  useEffect(() => {
    fetchRecentSms()
  }, [fetchRecentSms])

  const total = data ? data.totalSent + data.totalFailed : 0
  const successRate = total > 0 && data ? ((data.totalSent / total) * 100).toFixed(1) : "—"

  const chartConfig = {
    sent: { label: "Sent", color: "hsl(var(--chart-1))" },
    failed: { label: "Failed", color: "hsl(var(--chart-2))" },
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </span>
              <div>
                <CardTitle className="text-xl">SMS Activity</CardTitle>
                <CardDescription className="mt-0.5">
                  Monitor volume, success rate, and estimated cost. Refunded bookings are excluded from session sends.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 pt-2 sm:pt-0">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                />
              </div>
              <Button onClick={fetchData} disabled={loading} size="default">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading…
                  </>
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{data.totalSent}</div>
                <p className="text-xs text-muted-foreground mt-1">Successful deliveries</p>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-destructive">{data.totalFailed}</div>
                <p className="text-xs text-muted-foreground mt-1">See recent failures below</p>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Success rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Sent ÷ (sent + failed)</p>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Est. cost (LKR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {data.estimatedCost != null
                    ? Number(data.estimatedCost).toLocaleString("en-US", { minimumFractionDigits: 2 }) 
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">SMS_COST_PER_MESSAGE</p>
              </CardContent>
            </Card>
          </div>

          {data.daily.length > 0 && (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>Daily volume</CardTitle>
                <CardDescription>Sent and failed SMS over time. Hover for exact values.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <LineChart data={data.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDateLabel(v)}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
                    />
                    <ChartLegend content={<ChartLegendContent />} className="-mt-2" />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="var(--color-sent)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-sent)", r: 3 }}
                      activeDot={{ r: 4 }}
                      name="sent"
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="var(--color-failed)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-failed)", r: 3 }}
                      activeDot={{ r: 4 }}
                      name="failed"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {data.byType.length > 0 && (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>By source</CardTitle>
                <CardDescription>Breakdown by feature that sent the SMS (Session SMS, Transfer, Booking, etc.)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Success %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byType.map((row) => {
                      const tot = row.sent + row.failed
                      const pct = tot > 0 ? ((row.sent / tot) * 100).toFixed(1) : "—"
                      return (
                        <TableRow key={row.type}>
                          <TableCell className="font-medium">{row.type}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.sent}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{row.failed}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct}%</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.recentFailures.length > 0 && (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>Recent failures</CardTitle>
                <CardDescription>Last 20 failed sends in the selected range</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date / time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentFailures.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.description ?? undefined}>
                          {row.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{row.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.daily.length === 0 && data.byType.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No SMS activity in the selected date range.
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Last 50 SMS</CardTitle>
              <CardDescription>
                Most recent log entries. Search by phone, keyword, or message content.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search phone or keyword…"
                  value={recentSearchInput}
                  onChange={(e) => setRecentSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setRecentSearch(recentSearchInput)}
                  className="pl-8 h-9"
                />
              </div>
              <Button
                variant="secondary"
                size="default"
                onClick={() => setRecentSearch(recentSearchInput)}
                disabled={recentLoading}
              >
                {recentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
              {recentSearch && (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => {
                    setRecentSearchInput("")
                    setRecentSearch("")
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentLoading && !recentSms ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentSms && recentSms.items.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date / time</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Source</TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="min-w-[180px]">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSms.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            row.status === 0
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-destructive font-medium"
                          }
                        >
                          {row.status === 0 ? "Sent" : "Failed"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-xs">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.phone}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground text-xs" title={row.template}>
                        {row.template || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground text-sm">
              {recentSearch ? "No SMS match your search." : "No SMS log entries yet."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
