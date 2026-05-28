"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Download, FileText, Key, Loader2, LogIn, Play } from "lucide-react"

type ApiResult = { status: number; body: unknown }

function ApiResponseBlock({ result }: { result: ApiResult | null }) {
  if (!result) return null
  return (
    <div className="space-y-2">
      <Label>Response ({result.status})</Label>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
        {JSON.stringify(result.body, null, 2)}
      </pre>
    </div>
  )
}

function CurlExampleBlock({
  curl,
  onCopy,
}: {
  curl: string
  onCopy: (text: string) => void
}) {
  return (
    <div className="border-t pt-4">
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-xs">cURL request example</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onCopy(curl)}
          disabled={!curl}
        >
          <Copy className="mr-1 h-3 w-3" />
          Copy
        </Button>
      </div>
      <pre className="max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
        {curl || "(Detecting origin…)"}
      </pre>
    </div>
  )
}

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
  const [toDate, setToDate] = useState("")
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
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{
    status: number
    body: unknown
  } | null>(null)

  const [doctorEmail, setDoctorEmail] = useState("")
  const [doctorPassword, setDoctorPassword] = useState("")
  const [doctorOauthToken, setDoctorOauthToken] = useState("")
  const [doctorAccessToken, setDoctorAccessToken] = useState("")
  const [twoFactorToken, setTwoFactorToken] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [doctorCheckLoading, setDoctorCheckLoading] = useState(false)
  const [doctorCheckResult, setDoctorCheckResult] = useState<ApiResult | null>(null)
  const [doctorLoginLoading, setDoctorLoginLoading] = useState(false)
  const [doctorLoginResult, setDoctorLoginResult] = useState<ApiResult | null>(null)
  const [doctorMeLoading, setDoctorMeLoading] = useState(false)
  const [doctorMeResult, setDoctorMeResult] = useState<ApiResult | null>(null)
  const [doctorFromDate, setDoctorFromDate] = useState("")
  const [doctorToDate, setDoctorToDate] = useState("")
  const [doctorSessionsLoading, setDoctorSessionsLoading] = useState(false)
  const [doctorSessionsResult, setDoctorSessionsResult] = useState<ApiResult | null>(null)
  const [doctorSessionId, setDoctorSessionId] = useState("")
  const [doctorSessionByIdLoading, setDoctorSessionByIdLoading] = useState(false)
  const [doctorSessionByIdResult, setDoctorSessionByIdResult] = useState<ApiResult | null>(null)

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
    ? `curl -X GET "${originForCurl}/api/public/sessions?doctorCode=DR0001&fromDate=2025-02-24&toDate=2025-02-29" \\
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
    "foreigner": false
  }'`
    : ""

  const doctorAuthBase = `${originForCurl}/api/doctor-app/auth`
  const curlDoctorCheckLogin = originForCurl
    ? `curl -X POST "${doctorAuthBase}/check-login" \\
  -H "X-Client-Access-Token: YOUR_OAUTH_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "doctor@example.com",
    "password": "YOUR_PASSWORD"
  }'`
    : ""
  const curlDoctorLogin = originForCurl
    ? `curl -X POST "${doctorAuthBase}/login" \\
  -H "X-Client-Access-Token: YOUR_OAUTH_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "doctor@example.com",
    "password": "YOUR_PASSWORD"
  }'`
    : ""
  const curlDoctorMe = originForCurl
    ? `curl -X GET "${doctorAuthBase}/me" \\
  -H "X-Client-Access-Token: YOUR_OAUTH_ACCESS_TOKEN" \\
  -H "Authorization: Bearer YOUR_DOCTOR_ACCESS_TOKEN"`
    : ""
  const curlDoctorSessions = originForCurl
    ? `curl -X GET "${originForCurl}/api/doctor-app/sessions?fromDate=2025-02-24&toDate=2025-02-29" \\
  -H "X-Client-Access-Token: YOUR_OAUTH_ACCESS_TOKEN" \\
  -H "Authorization: Bearer YOUR_DOCTOR_ACCESS_TOKEN"`
    : ""
  const curlDoctorSessionById = originForCurl
    ? `curl -X GET "${originForCurl}/api/doctor-app/sessions/SESSION_ID" \\
  -H "X-Client-Access-Token: YOUR_OAUTH_ACCESS_TOKEN" \\
  -H "Authorization: Bearer YOUR_DOCTOR_ACCESS_TOKEN"`
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
      if (toDate.trim()) params.set("toDate", toDate.trim())
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

  function copyDoctorToken() {
    if (doctorAccessToken) void navigator.clipboard.writeText(doctorAccessToken)
  }

  const doctorIdentifierReady = doctorEmail.trim() && doctorPassword
  const doctorOauthTokenReady = doctorOauthToken.trim()

  async function runDoctorAuthRequest(
    path: string,
    options: RequestInit,
    setLoading: (v: boolean) => void,
    setResult: (r: ApiResult | null) => void,
    onSuccess?: (body: Record<string, unknown>) => void
  ) {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(path, options)
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
      setResult({ status: res.status, body })
      if (res.ok && onSuccess) onSuccess(body)
    } catch (e) {
      setResult({
        status: 0,
        body: { error: "request_failed", error_description: String(e) },
      })
    } finally {
      setLoading(false)
    }
  }

  function handleDoctorCheckLogin() {
    void runDoctorAuthRequest(
      "/api/doctor-app/auth/check-login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Access-Token": doctorOauthToken.trim(),
        },
        body: JSON.stringify({
          email: doctorEmail.trim(),
          password: doctorPassword,
        }),
      },
      setDoctorCheckLoading,
      setDoctorCheckResult
    )
  }

  function handleDoctorLogin() {
    const payload: Record<string, string> = {
      email: doctorEmail.trim(),
      password: doctorPassword,
    }
    if (twoFactorCode.trim()) payload.twoFactorCode = twoFactorCode.trim()
    if (twoFactorToken.trim()) payload.twoFactorToken = twoFactorToken.trim()

    void runDoctorAuthRequest(
      "/api/doctor-app/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Access-Token": doctorOauthToken.trim(),
        },
        body: JSON.stringify(payload),
      },
      setDoctorLoginLoading,
      setDoctorLoginResult,
      (body) => {
        if (typeof body.access_token === "string") {
          setDoctorAccessToken(body.access_token)
        }
        const doctor = body.doctor as { code?: string } | null | undefined
        if (doctor && typeof doctor.code === "string") {
          setDoctorCode(doctor.code)
        }
      }
    )
  }

  function handleDoctorSessions() {
    void runDoctorAuthRequest(
      (() => {
        const params = new URLSearchParams()
        if (doctorFromDate.trim()) params.set("fromDate", doctorFromDate.trim())
        if (doctorToDate.trim()) params.set("toDate", doctorToDate.trim())
        const qs = params.toString()
        return `/api/doctor-app/sessions${qs ? `?${qs}` : ""}`
      })(),
      {
        headers: {
          ...(doctorAccessToken ? { Authorization: `Bearer ${doctorAccessToken}` } : {}),
          "X-Client-Access-Token": doctorOauthToken.trim(),
        },
      },
      setDoctorSessionsLoading,
      setDoctorSessionsResult
    )
  }

  function handleDoctorMe() {
    void runDoctorAuthRequest(
      "/api/doctor-app/auth/me",
      {
        headers: {
          ...(doctorAccessToken ? { Authorization: `Bearer ${doctorAccessToken}` } : {}),
          "X-Client-Access-Token": doctorOauthToken.trim(),
        },
      },
      setDoctorMeLoading,
      setDoctorMeResult
    )
  }

  function handleDoctorSessionById() {
    const trimmedSessionId = doctorSessionId.trim()
    if (!trimmedSessionId) return

    void runDoctorAuthRequest(
      `/api/doctor-app/sessions/${encodeURIComponent(trimmedSessionId)}`,
      {
        headers: {
          ...(doctorAccessToken ? { Authorization: `Bearer ${doctorAccessToken}` } : {}),
          "X-Client-Access-Token": doctorOauthToken.trim(),
        },
      },
      setDoctorSessionByIdLoading,
      setDoctorSessionByIdResult
    )
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
            GET /api/public/sessions?doctorCode=…&fromDate=…&toDate=… — Requires Authorization: Bearer &lt;token&gt;.
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
          <div className="space-y-2">
            <Label htmlFor="to_date">To date (optional, YYYY-MM-DD)</Label>
            <Input
              id="to_date"
              placeholder="e.g. 2026-02-29"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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
            channel booking (receipt, agency balance, ref validation). Requires sessionId from
            step 2, agencyId, and bookReference.
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

      {/* Doctor app */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogIn className="h-5 w-5" />
            5. Doctor app
          </CardTitle>
          <CardDescription>
            Doctor mobile API playground. Requires OAuth token from step 1 plus doctor login JWT
            for protected endpoints. Flow: Check login → Login → Me → Sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="doctor_oauth_token">Bearer token (from step 1)</Label>
              <Input
                id="doctor_oauth_token"
                type="password"
                placeholder="Paste access_token from 1. Get access token"
                value={doctorOauthToken}
                onChange={(e) => setDoctorOauthToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="doctor_email">Email or username</Label>
              <Input
                id="doctor_email"
                placeholder="doctor@example.com or username"
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="doctor_password">Password</Label>
              <Input
                id="doctor_password"
                type="password"
                placeholder="Doctor user password"
                value={doctorPassword}
                onChange={(e) => setDoctorPassword(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="doctor_access_token">Doctor Bearer token</Label>
              <Input
                id="doctor_access_token"
                type="password"
                placeholder="From Login tab (access_token)"
                value={doctorAccessToken}
                onChange={(e) => setDoctorAccessToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <Tabs defaultValue="check-login" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted p-1 sm:grid-cols-5">
              <TabsTrigger value="check-login" className="text-xs sm:text-sm">
                Check login
              </TabsTrigger>
              <TabsTrigger value="login" className="text-xs sm:text-sm">
                Login
              </TabsTrigger>
              <TabsTrigger value="me" className="text-xs sm:text-sm">
                Me
              </TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs sm:text-sm">
                Sessions
              </TabsTrigger>
              <TabsTrigger value="session-by-id" className="text-xs sm:text-sm">
                Session by ID
              </TabsTrigger>
            </TabsList>

            <TabsContent value="check-login" className="mt-4 space-y-4">
              <p className="text-muted-foreground text-sm">
                POST /api/doctor-app/auth/check-login — Validates credentials; returns whether 2FA
                is required before login.
              </p>
              <Button
                onClick={handleDoctorCheckLogin}
                disabled={doctorCheckLoading || !doctorIdentifierReady || !doctorOauthTokenReady}
              >
                {doctorCheckLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Check login
                  </>
                )}
              </Button>
              <ApiResponseBlock result={doctorCheckResult} />
              <CurlExampleBlock curl={curlDoctorCheckLogin} onCopy={copyCurl} />
            </TabsContent>

            <TabsContent value="login" className="mt-4 space-y-4">
              <p className="text-muted-foreground text-sm">
                POST /api/doctor-app/auth/login — Completes login and returns JWT. Omit 2FA fields
                when check-login did not require 2FA.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="two_factor_code">2FA code (optional)</Label>
                  <Input
                    id="two_factor_code"
                    placeholder="6-digit SMS or TOTP"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="two_factor_token">2FA token (optional)</Label>
                  <Input
                    id="two_factor_token"
                    placeholder="Optional, if 2FA required"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleDoctorLogin}
                disabled={doctorLoginLoading || !doctorIdentifierReady || !doctorOauthTokenReady}
              >
                {doctorLoginLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
              <ApiResponseBlock result={doctorLoginResult} />
              {doctorLoginResult?.status === 200 &&
                typeof (doctorLoginResult.body as { access_token?: string }).access_token ===
                  "string" && (
                  <Button variant="outline" size="sm" onClick={copyDoctorToken}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy doctor token
                  </Button>
                )}
              <CurlExampleBlock curl={curlDoctorLogin} onCopy={copyCurl} />
            </TabsContent>

            <TabsContent value="sessions" className="mt-4 space-y-4">
              <p className="text-muted-foreground text-sm">
                GET /api/doctor-app/sessions — Sessions for the logged-in doctor (Bearer JWT from
                login). Optional fromDate/toDate (YYYY-MM-DD) for date range; default is today.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor_from_date">From date (optional)</Label>
                  <Input
                    id="doctor_from_date"
                    placeholder="e.g. 2026-02-24 (empty = today)"
                    value={doctorFromDate}
                    onChange={(e) => setDoctorFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_to_date">To date (optional)</Label>
                  <Input
                    id="doctor_to_date"
                    placeholder="e.g. 2026-02-29"
                    value={doctorToDate}
                    onChange={(e) => setDoctorToDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleDoctorSessions}
                disabled={
                  doctorSessionsLoading || !doctorAccessToken.trim() || !doctorOauthTokenReady
                }
              >
                {doctorSessionsLoading ? (
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
              <ApiResponseBlock result={doctorSessionsResult} />
              <CurlExampleBlock curl={curlDoctorSessions} onCopy={copyCurl} />
            </TabsContent>

            <TabsContent value="session-by-id" className="mt-4 space-y-4">
              <p className="text-muted-foreground text-sm">
                GET /api/doctor-app/sessions/[sessionId] — Single session details for the logged-in
                doctor (Bearer JWT from login).
              </p>
              <div className="space-y-2">
                <Label htmlFor="doctor_session_id">Session ID</Label>
                <Input
                  id="doctor_session_id"
                  placeholder="Paste session id from Sessions tab"
                  value={doctorSessionId}
                  onChange={(e) => setDoctorSessionId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleDoctorSessionById}
                disabled={
                  doctorSessionByIdLoading ||
                  !doctorAccessToken.trim() ||
                  !doctorSessionId.trim() ||
                  !doctorOauthTokenReady
                }
              >
                {doctorSessionByIdLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Get session by ID
                  </>
                )}
              </Button>
              <ApiResponseBlock result={doctorSessionByIdResult} />
              <CurlExampleBlock curl={curlDoctorSessionById} onCopy={copyCurl} />
            </TabsContent>

            <TabsContent value="me" className="mt-4 space-y-4">
              <p className="text-muted-foreground text-sm">
                GET /api/doctor-app/auth/me — Current doctor user and profile (Bearer JWT from
                login).
              </p>
              <Button
                onClick={handleDoctorMe}
                disabled={doctorMeLoading || !doctorAccessToken.trim() || !doctorOauthTokenReady}
              >
                {doctorMeLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Get me
                  </>
                )}
              </Button>
              <ApiResponseBlock result={doctorMeResult} />
              <CurlExampleBlock curl={curlDoctorMe} onCopy={copyCurl} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
