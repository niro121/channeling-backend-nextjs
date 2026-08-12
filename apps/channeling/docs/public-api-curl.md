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
      "advancedBookingEnabled": true,
      "advancedBookingDays": 7,
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

`advancedBookingEnabled` is `true` when the doctor session template has `advancedBookingDays > 0`. On **Create booking**, omitting `paid` (or sending `paid: no`) on such sessions creates an **On-Call** pending booking (`status 0`, `createdBy` = API acting user). Send `paid: yes` for a settled Agent booking.

---

## 3. Get Doctors

**GET** `/api/public/doctors`  
**GET** `/api/public/doctors?keyword=cardio`  

Returns published doctors with speciality for external integrations (e.g. DPAY patient bills). Requires a valid Bearer token.

### Query parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `keyword` | No | Filter by doctor name, code, title, or speciality name. |

### cURL

```bash
curl -X GET "http://localhost:3000/api/public/doctors" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example success response (200)

```json
{
  "doctors": [
    {
      "id": "...",
      "title": "Dr.",
      "name": "Anura Jayawardena",
      "code": "DR0001",
      "specialityId": "...",
      "specialityName": "Cardiology"
    }
  ]
}
```

---

## 4. Get Areas

**GET** `/api/public/areas`  
**GET** `/api/public/areas?keyword=colombo`  

Returns active area tags (cities) for booking forms / third-party apps. Requires a valid Bearer token.  
Use the area **`name`** when creating a booking via `POST /api/public/bookings` (`area` field).

### Query parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `keyword` | No | Filter by area name. |

### cURL

```bash
curl -X GET "http://localhost:3000/api/public/areas" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

```bash
curl -X GET "http://localhost:3000/api/public/areas?keyword=colombo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example success response (200)

```json
{
  "areas": [
    { "id": "...", "name": "Colombo" },
    { "id": "...", "name": "Galle" }
  ]
}
```

---

## 5. Get Bookings

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

## 6. Create booking

**POST** `/api/public/bookings`

Creates a booking via the channel-booking save pipeline. Requires Bearer token and API client acting user.

- **Paid** (`paid: yes`, or omitted on non-advance sessions): **Agent** method, receipt created, **status 1**. `agencyId` + `bookReference` required.
- **Unpaid advance** (`paid: no`, or omitted when `advancedBookingDays > 0`): **On-Call** method, **status 0** (pending, no receipt). Booking is attached to the API acting user as `createdBy`. `agencyId` + `bookReference` are optional; if passed, they are stored on the booking (no agency debit).

### JSON body

| Field           | Required | Description |
|----------------|----------|-------------|
| `sessionId`    | Yes      | Session id from Get Sessions. |
| `agencyId`     | Paid; optional for On-Call | Agency Mongo id (required for Agent / paid). Optional on unpaid advance — saved if passed with `bookReference`. |
| `bookReference`| Paid; optional for On-Call | Full agency ref (e.g. `ABC01`). Optional on unpaid advance — saved if passed with `agencyId`. |
| `title`, `name`, `sex`, `phone`, `area` | Yes | Patient details. |
| `remarks`      | No       | Optional remarks. |
| `foreigner`    | No       | `true` for foreign fee tier. |
| `paid`         | No       | `yes` / `true`: **Agent** settled (**status 1**). `no` / `false`: **On-Call** pending (**status 0**) — only on advance-booking sessions. **Omitted:** advance → On-Call pending; otherwise Agent settled. |

### cURL (paid Agent)

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

### cURL (unpaid advance → On-Call pending)

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

`agencyId` / `bookReference` may be omitted on On-Call; if both are sent they are stored (no settlement / no agency debit).

### Example success response (201) — On-Call pending

```json
{
  "booking": {
    "id": "...",
    "appointmentNo": 5,
    "status": 0,
    "statusLabel": "Pending",
    "agencyRef": "",
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

Use **Get Bookings** with `includePending=true` to list pending (On-Call) bookings.

---

## Postman collection

Import the collection to run these in Postman:

- **File:** `public/assets/public-api.postman_collection.json` (or download from the API Playground)

After import:

1. Set collection variables: `baseUrl`, `client_id`, `client_secret`.
2. Run **Create Access Token**; the collection will store the token.
3. Run **Get Sessions**; it will use the stored token.
4. Set `session_id` (or enable `date` on **Get Bookings**) and run **Get Bookings**.
