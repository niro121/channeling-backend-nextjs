import { redirect } from "next/navigation"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ArrowLeft } from "lucide-react"

export default async function IntegrationGuidePage() {
  const canView = await checkRouteAccess("/admin/api-clients")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 print:block">
        <div className="flex items-center gap-2">
          <Link href="/admin/api-clients/playground">
            <Button variant="ghost" size="sm" className="gap-1.5 print:hidden">
              <ArrowLeft className="h-4 w-4" />
              Back to Playground
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground text-sm print:text-xs">
          Use your browser&apos;s <strong>Print → Save as PDF</strong> to export this guide.
        </p>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert print:prose-sm">
        <div className="flex items-center gap-2 border-b pb-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight m-0">Public API Integration Guide</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          This guide explains how to integrate your application with the Channeling APIs: create an
          API client, obtain an access token, use Public API endpoints, and test Doctor App
          endpoints.
        </p>

        {/* Step 1: Create application & get client ID and secret */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Create an application and get Client ID & Secret</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Log in to the dashboard and go to <strong>Admin → API Clients</strong> (or <code className="rounded bg-muted px-1 py-0.5">/admin/api-clients</code>).
              </li>
              <li>
                Click <strong>Add New</strong> to register a new API client (your application).
              </li>
              <li>
                Enter an <strong>application name</strong> (e.g. your product or partner name) and save.
              </li>
              <li>
                After creation, you will see the <strong>Client ID</strong> and <strong>Client Secret</strong>. The secret is shown only once at creation; store it securely. If you lose it, you must create a new client or use the reset option (if available).
              </li>
            </ol>
            <p className="text-muted-foreground">
              Use these credentials in the next step to request an access token.
            </p>
          </CardContent>
        </Card>

        {/* Step 2: Get token */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Get an access token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              The API uses <strong>OAuth 2.0 Client Credentials</strong>. Send a POST request to the token endpoint with your client ID and secret.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Endpoint:</strong> <code className="rounded bg-muted px-1 py-0.5">POST /api/public/token</code></li>
              <li><strong>Content-Type:</strong> <code className="rounded bg-muted px-1 py-0.5">application/json</code></li>
              <li><strong>Body (JSON):</strong> <code className="rounded bg-muted px-1 py-0.5">grant_type</code>, <code className="rounded bg-muted px-1 py-0.5">client_id</code>, <code className="rounded bg-muted px-1 py-0.5">client_secret</code></li>
            </ul>
            <p>
              Set <code className="rounded bg-muted px-1 py-0.5">grant_type</code> to <code className="rounded bg-muted px-1 py-0.5">client_credentials</code>. The response includes an <code className="rounded bg-muted px-1 py-0.5">access_token</code> and <code className="rounded bg-muted px-1 py-0.5">expires_in</code> (seconds). Use the access token in the <strong>Authorization</strong> header for all subsequent API calls.
            </p>
            <p className="text-muted-foreground">
              You can test this in the <Link href="/admin/api-clients/playground" className="underline print:no-underline">API Playground</Link> (Step 1: Get access token) or with the Postman collection below.
            </p>
          </CardContent>
        </Card>

        {/* Step 3: Call sessions API */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Call the sessions API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              To fetch available sessions for a doctor, call the sessions endpoint with the token from Step 2.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Endpoint:</strong> <code className="rounded bg-muted px-1 py-0.5">GET /api/public/sessions</code></li>
              <li><strong>Header:</strong> <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;access_token&gt;</code></li>
              <li><strong>Query parameters:</strong> <code className="rounded bg-muted px-1 py-0.5">doctorCode</code> (required), <code className="rounded bg-muted px-1 py-0.5">fromDate</code> (optional, YYYY-MM-DD)</li>
            </ul>
            <p>
              The response contains a <code className="rounded bg-muted px-1 py-0.5">sessions</code> array with session details (date, time, location, doctor, status, <code className="rounded bg-muted px-1 py-0.5">advancedBookingEnabled</code>, <code className="rounded bg-muted px-1 py-0.5">advancedBookingDays</code>, etc.). Only future, non-expired sessions are returned.
            </p>
            <p className="text-muted-foreground">
              Test this in the <Link href="/admin/api-clients/playground" className="underline print:no-underline">API Playground</Link> (Step 2: Get sessions) or via Postman.
            </p>
          </CardContent>
        </Card>

        {/* Step 4: Call bookings API */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 4: Call the bookings API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              To show a doctor who is booked (patient name, contact, queue number), call the bookings endpoint with the token from Step 2.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Endpoint:</strong> <code className="rounded bg-muted px-1 py-0.5">GET /api/public/bookings</code></li>
              <li><strong>Header:</strong> <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;access_token&gt;</code></li>
              <li><strong>Query parameters:</strong> <code className="rounded bg-muted px-1 py-0.5">doctorCode</code> (required), plus <code className="rounded bg-muted px-1 py-0.5">sessionId</code> or <code className="rounded bg-muted px-1 py-0.5">date</code> (YYYY-MM-DD)</li>
              <li><strong>Optional:</strong> <code className="rounded bg-muted px-1 py-0.5">includePending=true</code> to include unpaid bookings</li>
            </ul>
            <p>
              The response contains a <code className="rounded bg-muted px-1 py-0.5">bookings</code> array with appointment number, patient fields (title, name, sex, phone, area, remarks), session time/location, and status. Payment amounts and internal desk fields are not included.
            </p>
            <p className="text-muted-foreground">
              Typical flow: get sessions → pick a <code className="rounded bg-muted px-1 py-0.5">session.id</code> → get bookings for that session. Test in the <Link href="/admin/api-clients/playground" className="underline print:no-underline">API Playground</Link> (Step 3).
            </p>
          </CardContent>
        </Card>
        {/* Step 5: Doctor app APIs */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 5: Doctor app APIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Doctor App endpoints support doctor mobile authentication and profile/session actions.
              In this project, requests should include both the OAuth token from Step 2 and the
              doctor JWT from doctor login where required.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Required OAuth header (all doctor-app calls):</strong>{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  X-Client-Access-Token: {"<access_token>"}
                </code>
              </li>
              <li>
                <strong>Doctor auth flow:</strong>{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  POST /api/doctor-app/auth/check-login
                </code>{" "}
                →{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  POST /api/doctor-app/auth/request-2fa-code
                </code>{" "}
                (if required) →{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  POST /api/doctor-app/auth/login
                </code>
              </li>
              <li>
                <strong>Auth utility endpoint:</strong>{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  POST /api/doctor-app/auth/change-initial-password
                </code>{" "}
                for first-login password reset.
              </li>
              <li>
                <strong>Doctor JWT protected endpoints:</strong>{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  GET /api/doctor-app/auth/me
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  GET /api/doctor-app/sessions
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  GET /api/doctor-app/sessions/[sessionId]
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  PATCH /api/doctor-app/profile
                </code>
                , and{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  POST /api/doctor-app/profile/change-password
                </code>
                . These also require{" "}
                <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;doctor_access_token&gt;</code>.
              </li>
              <li>
                Use the{" "}
                <Link href="/admin/api-clients/playground" className="underline print:no-underline">
                  API Playground
                </Link>{" "}
                Doctor App section (Step 5) for live testing in the same order.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 6: Get doctors */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 6: Get doctors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              To fetch published doctors with speciality (for external apps such as DPAY patient
              bills), call the doctors reference endpoint with the token from Step 2.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Endpoint:</strong> <code className="rounded bg-muted px-1 py-0.5">GET /api/public/doctors</code></li>
              <li><strong>Header:</strong> <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;access_token&gt;</code></li>
              <li><strong>Query parameters:</strong> <code className="rounded bg-muted px-1 py-0.5">keyword</code> (optional — filters by name, code, title, or speciality)</li>
            </ul>
            <p>
              The response contains a <code className="rounded bg-muted px-1 py-0.5">doctors</code> array with{" "}
              <code className="rounded bg-muted px-1 py-0.5">id</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5">title</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5">name</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5">code</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5">specialityId</code>, and{" "}
              <code className="rounded bg-muted px-1 py-0.5">specialityName</code>.
            </p>
            <p className="text-muted-foreground">
              Test in the <Link href="/admin/api-clients/playground" className="underline print:no-underline">API Playground</Link> (Step 6: Get doctors) or via Postman.
            </p>
          </CardContent>
        </Card>

        {/* Step 7: Get areas */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Step 7: Get areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              To fetch active area tags (cities) for booking forms / third-party apps, call the
              areas reference endpoint with the token from Step 2.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Endpoint:</strong> <code className="rounded bg-muted px-1 py-0.5">GET /api/public/areas</code></li>
              <li><strong>Header:</strong> <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;access_token&gt;</code></li>
              <li><strong>Query parameters:</strong> <code className="rounded bg-muted px-1 py-0.5">keyword</code> (optional — filters by area name)</li>
            </ul>
            <p>
              The response contains an <code className="rounded bg-muted px-1 py-0.5">areas</code> array with{" "}
              <code className="rounded bg-muted px-1 py-0.5">id</code> and{" "}
              <code className="rounded bg-muted px-1 py-0.5">name</code>. Use{" "}
              <code className="rounded bg-muted px-1 py-0.5">name</code> when creating a booking via{" "}
              <code className="rounded bg-muted px-1 py-0.5">POST /api/public/bookings</code> (
              <code className="rounded bg-muted px-1 py-0.5">area</code> field).
            </p>
            <p className="text-muted-foreground">
              Test in the <Link href="/admin/api-clients/playground" className="underline print:no-underline">API Playground</Link> (Step 7: Get areas) or via Postman.
            </p>
          </CardContent>
        </Card>

        {/* Postman */}
        <Card className="my-6 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Postman collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              A Postman collection is available so you can run Public API and Doctor App requests
              directly from Postman.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Download:</strong> From the <Link href="/admin/api-clients/playground" className="underline print:no-underline">API Playground</Link> page, click <strong>Download Postman collection</strong>. The file uses your current environment&apos;s base URL.
              </li>
              <li>
                In Postman, use <strong>Import</strong> and select the downloaded JSON file.
              </li>
              <li>
                Set the collection variables <code className="rounded bg-muted px-1 py-0.5">client_id</code> and <code className="rounded bg-muted px-1 py-0.5">client_secret</code>, then run <strong>Create Access Token</strong>. The collection will store the token automatically.
              </li>
              <li>
                Run <strong>Get Sessions</strong> to call the sessions API with the saved token.
              </li>
              <li>
                Set <code className="rounded bg-muted px-1 py-0.5">session_id</code> from a session response (or enable <code className="rounded bg-muted px-1 py-0.5">date</code> on Get Bookings), then run <strong>Get Bookings</strong>.
              </li>
              <li>
                Run <strong>Get Doctors</strong> to list published doctors with speciality (optional <code className="rounded bg-muted px-1 py-0.5">keyword</code> query).
              </li>
              <li>
                For Doctor App flows, use the <strong>Doctor App</strong> folder in this order:
                <strong> Check Login</strong> → <strong>Request 2FA Code</strong> (if required) →
                <strong> Login</strong> → <strong>Me</strong> → <strong>Sessions</strong> →
                <strong>Session by ID</strong>. The same OAuth token is sent as{" "}
                <code className="rounded bg-muted px-1 py-0.5">X-Client-Access-Token</code>.
              </li>
              <li>
                Additional Doctor App endpoints are included:{" "}
                <code className="rounded bg-muted px-1 py-0.5">POST /api/doctor-app/auth/change-initial-password</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">PATCH /api/doctor-app/profile</code>, and{" "}
                <code className="rounded bg-muted px-1 py-0.5">POST /api/doctor-app/profile/change-password</code>.
              </li>
            </ul>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-xs mt-6">
          For cURL examples and live testing, use the Public API Playground at Admin → API Clients → Test API.
        </p>
      </div>
    </div>
  )
}
