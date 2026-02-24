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
    </div>
  )
}
