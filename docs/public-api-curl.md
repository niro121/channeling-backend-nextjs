# Public API – cURL examples

Base URL: `http://localhost:3000` (change for staging/production).

---

## 1. Create Access Token

**POST** `/api/public/token`  
Get an OAuth2 access token using client credentials. Use this token in the `Authorization` header for protected endpoints.

### JSON body

```bash
curl -X POST "http://localhost:3000/api/public/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'
```

### Form-urlencoded body

```bash
curl -X POST "http://localhost:3000/api/public/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

### Example success response (200)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use `access_token` in the next request as `Authorization: Bearer <access_token>`.

---

## 2. Get Sessions

**GET** `/api/public/sessions?doctorCode=DR0001&fromDate=2025-02-24`  
Returns future sessions for a doctor. Requires a valid Bearer token.

### Query parameters

| Parameter   | Required | Description                          |
|------------|----------|--------------------------------------|
| `doctorCode` | Yes      | Doctor code (e.g. `DR0001`).         |
| `fromDate`   | No       | Start date in `YYYY-MM-DD`; default is today. |

### cURL

```bash
curl -X GET "http://localhost:3000/api/public/sessions?doctorCode=DR0001&fromDate=2025-02-24" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example success response (200)

```json
{
  "sessions": [
    {
      "id": "...",
      "date": "2025-02-24",
      "startTime": "2025-02-24T13:00:00.000Z",
      "startTimeFormatted": "7:00 PM",
      "endTime": "2025-02-24T14:00:00.000Z",
      "status": 1,
      "doctorOnLeave": false,
      "minPatientNumber": 1,
      "maxPatientNumber": 50,
      "appointmentNo": 12,
      "isFull": false,
      "amountLocal": {
        "professionalFee": 1200,
        "hospitalFee": 300,
        "amount": 1500
      },
      "amountForeign": {
        "professionalFee": 8,
        "hospitalFee": 2,
        "amount": 10
      },
      "location": { "id": "...", "name": "OPD", "city": "Colombo" },
      "doctor": { "id": "...", "title": "Dr", "name": "...", "code": "DR0001" }
    }
  ]
}
```

`status` is `0` (disabled) when any of: doctor on leave (`doctorOnLeave: true`), current time is past `endTime`, a previous consecutive session on the same day is not full (linked via `previousDoctorSession` — same rule as channel booking), or `isFull` is true. Otherwise `status` is `1`.

---

## 3. Get Bookings

**GET** `/api/public/bookings?doctorCode=DR0001&sessionId=SESSION_ID`  
**GET** `/api/public/bookings?doctorCode=DR0001&date=2025-05-25`  

Returns paid bookings with minimal patient details for a doctor. Requires a valid Bearer token.

### Query parameters

| Parameter        | Required | Description |
|-----------------|----------|-------------|
| `doctorCode`    | Yes      | Doctor code (e.g. `DR0001`). |
| `sessionId`     | One of*  | Session id from Get Sessions. |
| `date`          | One of*  | Session date `YYYY-MM-DD` (all sessions that day). |
| `includePending`| No       | `true` to include pending (status 0) bookings; default is paid only. |

\* Provide `sessionId` or `date` (if both are sent, `sessionId` is used).

### cURL (by session)

```bash
curl -X GET "http://localhost:3000/api/public/bookings?doctorCode=DR0001&sessionId=SESSION_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### cURL (by date)

```bash
curl -X GET "http://localhost:3000/api/public/bookings?doctorCode=DR0001&date=2025-05-25" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example success response (200)

```json
{
  "bookings": [
    {
      "id": "...",
      "appointmentNo": 12,
      "status": 1,
      "statusLabel": "Paid",
      "patient": {
        "title": "Mr",
        "name": "John Doe",
        "sex": "M",
        "phone": "0771234567",
        "area": "Colombo",
        "remarks": "",
        "foreigner": false
      },
      "session": {
        "id": "...",
        "date": "2025-05-25",
        "startTimeFormatted": "7:00 PM",
        "location": { "id": "...", "name": "OPD" }
      }
    }
  ]
}
```

---

## 4. Create agent booking

**POST** `/api/public/bookings`

Creates an agent-method booking (same pipeline as channel booking). Requires Bearer token and API client acting user.

### JSON body

| Field           | Required | Description |
|----------------|----------|-------------|
| `sessionId`    | Yes      | Session id from Get Sessions. |
| `agencyId`     | Yes      | Agency Mongo id. |
| `bookReference`| Yes      | Full agency ref (e.g. `ABC01`). |
| `title`, `name`, `sex`, `phone`, `area` | Yes | Patient details. |
| `remarks`      | No       | Optional remarks. |
| `foreigner`    | No       | `true` for foreign fee tier. |
| `paid`         | No       | Default `yes` / `true`: receipt created, **status 1** (settled). `no` / `false`: **pending** agent booking (**status 0**, not settled; settle later in channel booking). |

### cURL (paid — default)

```bash
curl -X POST "http://localhost:3000/api/public/bookings" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "agencyId": "AGENCY_ID",
    "bookReference": "BOOK01",
    "title": "Mr",
    "name": "PATIENT NAME",
    "sex": "M",
    "phone": "0771234567",
    "area": "Colombo",
    "paid": "yes"
  }'
```

### cURL (pending — not settled)

```bash
curl -X POST "http://localhost:3000/api/public/bookings" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "agencyId": "AGENCY_ID",
    "bookReference": "BOOK02",
    "title": "Mr",
    "name": "PATIENT NAME",
    "sex": "M",
    "phone": "0771234567",
    "area": "Colombo",
    "paid": "no"
  }'
```

### Example success response (201)

```json
{
  "booking": {
    "id": "...",
    "appointmentNo": 5,
    "status": 0,
    "statusLabel": "Pending",
    "agencyRef": "BOOK02",
    "amount": 2000,
    "fees": {
      "professionalFee": 1500,
      "hospitalFee": 500,
      "discount": 0,
      "amount": 2000
    }
  }
}
```

Use **Get Bookings** with `includePending=true` to list pending bookings.

---

## Postman collection

Import the collection to run these in Postman:

- **File:** `public/assets/public-api.postman_collection.json` (or download from the API Playground)

After import:

1. Set collection variables: `baseUrl`, `client_id`, `client_secret`.
2. Run **Create Access Token**; the collection will store the token.
3. Run **Get Sessions**; it will use the stored token.
4. Set `session_id` (or enable `date` on **Get Bookings**) and run **Get Bookings**.
