"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Copy, Download, FileText, Key, Loader2, Play } from "lucide-react"

export function PublicApiPlayground() {
  const [baseUrl, setBaseUrl] = useState("")
  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin)
  }, [])
  const originForCurl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || ""

  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenResult, setTokenResult] = useState<{
    status: number
    body: unknown
  } | null>(null)

  const [accessToken, setAccessToken] = useState("")
  const [doctorCode, setDoctorCode] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsResult, setSessionsResult] = useState<{
    status: number
    body: unknown
  } | null>(null)

  const [sessionId, setSessionId] = useState("")
  const [bookingsDate, setBookingsDate] = useState("")
  const [includePending, setIncludePending] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsResult, setBookingsResult] = useState<{
    status: number
    body: unknown
  } | null>(null)

  const [createAgencyId, setCreateAgencyId] = useState("")
  const [createBookRef, setCreateBookRef] = useState("")
  const [createTitle, setCreateTitle] = useState("Mr")
  const [createName, setCreateName] = useState("")
  const [createSex, setCreateSex] = useState("M")
  const [createPhone, setCreatePhone] = useState("")
  const [createArea, setCreateArea] = useState("")
  const [createForeigner, setCreateForeigner] = useState(false)
  const [createPaid, setCreatePaid] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{
    status: number
    body: unknown
  } | null>(null)

  const curlToken = originForCurl
    ? `curl -X POST "${originForCurl}/api/public/token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'`
    : ""
  const curlSessions = originForCurl
    ? `curl -X GET "${originForCurl}/api/public/sessions?doctorCode=DR0001&fromDate=2025-02-24" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`
    : ""
  const curlBookings = originForCurl
    ? `curl -X GET "${originForCurl}/api/public/bookings?doctorCode=DR0001&sessionId=SESSION_ID" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`
    : ""
  const curlCreateBooking = originForCurl
    ? `curl -X POST "${originForCurl}/api/public/bookings" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "SESSION_ID",
    "agencyId": "AGENCY_ID",
    "bookReference": "BOOK01",
    "title": "Mr",
    "name": "PATIENT NAME",
    "sex": "M",
    "phone": "0771234567",
    "area": "Colombo",
    "foreigner": false,
    "paid": "yes"
  }'`
    : ""

  function copyCurl(text: string) {
    void navigator.clipboard.writeText(text)
  }

  async function handleGetToken() {
    setTokenLoading(true)
    setTokenResult(null)
    try {
      const res = await fetch("/api/public/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: clientId.trim(),
          client_secret: clientSecret,
        }),
      })
      const body = await res.json().catch(() => ({}))
      setTokenResult({ status: res.status, body })
      if (res.ok && typeof body.access_token === "string") {
        setAccessToken(body.access_token)
      }
    } catch (e) {
      setTokenResult({
        status: 0,
        body: { error: "request_failed", error_description: String(e) },
      })
    } finally {
      setTokenLoading(false)
    }
  }

  async function handleGetSessions() {
    setSessionsLoading(true)
    setSessionsResult(null)
    try {
      const params = new URLSearchParams()
      params.set("doctorCode", doctorCode.trim())
      if (fromDate.trim()) params.set("fromDate", fromDate.trim())
      const res = await fetch(`/api/public/sessions?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      const body = await res.json().catch(() => ({}))
      setSessionsResult({ status: res.status, body })
    } catch (e) {
      setSessionsResult({
        status: 0,
        body: { error: "request_failed", error_description: String(e) },
      })
    } finally {
      setSessionsLoading(false)
    }
  }

  async function handleGetBookings() {
    setBookingsLoading(true)
    setBookingsResult(null)
    try {
      const params = new URLSearchParams()
      params.set("doctorCode", doctorCode.trim())
      if (sessionId.trim()) params.set("sessionId", sessionId.trim())
      if (bookingsDate.trim()) params.set("date", bookingsDate.trim())
      if (includePending) params.set("includePending", "true")
      const res = await fetch(`/api/public/bookings?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      const body = await res.json().catch(() => ({}))
      setBookingsResult({ status: res.status, body })
    } catch (e) {
      setBookingsResult({
        status: 0,
        body: { error: "request_failed", error_description: String(e) },
      })
    } finally {
      setBookingsLoading(false)
    }
  }

  const canGetBookings =
    doctorCode.trim() && (sessionId.trim() || bookingsDate.trim())

  async function handleCreateBooking() {
    setCreateLoading(true)
    setCreateResult(null)
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          agencyId: createAgencyId.trim(),
          bookReference: createBookRef.trim(),
          title: createTitle.trim(),
          name: createName.trim(),
          sex: createSex.trim(),
          phone: createPhone.trim(),
          area: createArea.trim(),
          foreigner: createForeigner,
          paid: createPaid ? "yes" : "no",
        }),
      })
      const body = await res.json().catch(() => ({}))
      setCreateResult({ status: res.status, body })
    } catch (e) {
      setCreateResult({
        status: 0,
        body: { error: "request_failed", error_description: String(e) },
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const canCreateBooking =
    accessToken.trim() &&
    sessionId.trim() &&
    createAgencyId.trim() &&
    createBookRef.trim() &&
    createName.trim() &&
    createPhone.trim() &&
    createArea.trim()

  function copyToken() {
    if (accessToken) void navigator.clipboard.writeText(accessToken)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Postman download + Integration guide at top */}
      <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
        <a
          href="/api/public/postman-collection"
          download="channeling-public-api.postman_collection.json"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Download Postman collection
        </a>
        <Link
          href="/admin/api-clients/integration"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <FileText className="h-4 w-4" />
          Integration guide
        </Link>
      </div>

      {/* Card 1: Get token — full width + cURL inside */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5" />
            1. Get access token
          </CardTitle>
          <CardDescription>
            POST /api/public/token — OAuth2 client_credentials. Use client_id and client_secret from an API client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              placeholder="e.g. uuid from API client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_secret">Client secret</Label>
            <Input
              id="client_secret"
              type="password"
              placeholder="Secret (from create, or reset via new client)"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleGetToken} disabled={tokenLoading}>
            {tokenLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Get token
              </>
            )}
          </Button>
          {tokenResult && (
            <div className="space-y-2">
              <Label>Response ({tokenResult.status})</Label>
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
                {JSON.stringify(tokenResult.body, null, 2)}
              </pre>
              {tokenResult.status === 200 &&
                typeof (tokenResult.body as { access_token?: string }).access_token === "string" && (
                  <Button variant="outline" size="sm" onClick={copyToken}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy token to Sessions
                  </Button>
                )}
            </div>
          )}
          <div className="border-t pt-4">
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs">cURL request example</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyCurl(curlToken)}
                disabled={!curlToken}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
            </div>
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
              {curlToken || "(Detecting origin…)"}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Get sessions — full width + cURL inside */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5" />
            2. Get sessions
          </CardTitle>
          <CardDescription>
            GET /api/public/sessions?doctorCode=…&fromDate=… — Requires Authorization: Bearer &lt;token&gt;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bearer_token">Bearer token</Label>
            <Input
              id="bearer_token"
              type="password"
              placeholder="Paste access_token from step 1"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor_code">Doctor code (required)</Label>
            <Input
              id="doctor_code"
              placeholder="e.g. DR0001"
              value={doctorCode}
              onChange={(e) => setDoctorCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_date">From date (optional, YYYY-MM-DD)</Label>
            <Input
              id="from_date"
              placeholder="e.g. 2026-02-24"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <Button
            onClick={handleGetSessions}
            disabled={sessionsLoading || !doctorCode.trim()}
          >
            {sessionsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Get sessions
              </>
            )}
          </Button>
          {sessionsResult && (
            <div className="space-y-2">
              <Label>Response ({sessionsResult.status})</Label>
              <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
                {JSON.stringify(sessionsResult.body, null, 2)}
              </pre>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs">cURL request example</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyCurl(curlSessions)}
                disabled={!curlSessions}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
            </div>
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
              {curlSessions || "(Detecting origin…)"}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Get bookings — full width + cURL inside */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5" />
            3. Get bookings
          </CardTitle>
          <CardDescription>
            GET /api/public/bookings — Patient list for a doctor. Requires Bearer token,
            doctorCode, and either sessionId (from step 2) or date (YYYY-MM-DD). Paid
            bookings only unless include pending is checked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Reuses doctor code and token from steps 1–2. Paste a session <code className="rounded bg-muted px-1 py-0.5">id</code> from
            the sessions response, or set a date for all sessions that day.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bookings_session_id">Session ID (optional)</Label>
            <Input
              id="bookings_session_id"
              placeholder="Paste session id from step 2"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookings_date">Date (optional, YYYY-MM-DD)</Label>
            <Input
              id="bookings_date"
              placeholder="e.g. 2026-05-25 — use if no sessionId"
              value={bookingsDate}
              onChange={(e) => setBookingsDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="include_pending"
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="include_pending" className="font-normal">
              Include pending bookings (status 0)
            </Label>
          </div>
          <Button
            onClick={handleGetBookings}
            disabled={bookingsLoading || !canGetBookings || !accessToken.trim()}
          >
            {bookingsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Get bookings
              </>
            )}
          </Button>
          {bookingsResult && (
            <div className="space-y-2">
              <Label>Response ({bookingsResult.status})</Label>
              <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
                {JSON.stringify(bookingsResult.body, null, 2)}
              </pre>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs">cURL request example</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyCurl(curlBookings)}
                disabled={!curlBookings}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
            </div>
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
              {curlBookings || "(Detecting origin…)"}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5" />
            4. Create agent booking
          </CardTitle>
          <CardDescription>
            POST /api/public/bookings — Agent method only. Uses the same save pipeline as
            channel booking. Set Paid to No for a pending booking (no receipt; settle later in
            channel booking). Requires sessionId from step 3, agencyId, and bookReference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create_agency_id">Agency ID (agent)</Label>
              <Input
                id="create_agency_id"
                placeholder="Mongo agency id"
                value={createAgencyId}
                onChange={(e) => setCreateAgencyId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create_book_ref">Book reference</Label>
              <Input
                id="create_book_ref"
                placeholder="e.g. ABC01 (book + 2-digit leaf)"
                value={createBookRef}
                onChange={(e) => setCreateBookRef(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_title">Title</Label>
              <Input id="create_title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_name">Name</Label>
              <Input id="create_name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_sex">Sex</Label>
              <Input id="create_sex" value={createSex} onChange={(e) => setCreateSex(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_phone">Phone</Label>
              <Input id="create_phone" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create_area">Area</Label>
              <Input id="create_area" value={createArea} onChange={(e) => setCreateArea(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                id="create_foreigner"
                type="checkbox"
                checked={createForeigner}
                onChange={(e) => setCreateForeigner(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="create_foreigner" className="font-normal">
                Foreigner
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="create_paid"
                type="checkbox"
                checked={createPaid}
                onChange={(e) => setCreatePaid(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="create_paid" className="font-normal">
                Paid (settled — creates receipt)
              </Label>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Uses Session ID from step 3 field above. Amount is calculated server-side from session fees.
          </p>
          <Button onClick={handleCreateBooking} disabled={createLoading || !canCreateBooking}>
            {createLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Create booking
              </>
            )}
          </Button>
          {createResult && (
            <div className="space-y-2">
              <Label>Response ({createResult.status})</Label>
              <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
                {JSON.stringify(createResult.body, null, 2)}
              </pre>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs">cURL request example</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyCurl(curlCreateBooking)}
                disabled={!curlCreateBooking}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
            </div>
            <pre className="max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
              {curlCreateBooking || "(Detecting origin…)"}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
