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
      "amountLocal": 1500,
      "amountForeign": 10,
      "appointmentNo": 0,
      "location": { "id": "...", "name": "OPD" },
      "doctor": { "id": "...", "title": "Dr", "name": "...", "code": "DR0001" }
    }
  ]
}
```

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

## Postman collection

Import the collection to run these in Postman:

- **File:** `public/assets/public-api.postman_collection.json` (or download from the API Playground)

After import:

1. Set collection variables: `baseUrl`, `client_id`, `client_secret`.
2. Run **Create Access Token**; the collection will store the token.
3. Run **Get Sessions**; it will use the stored token.
4. Set `session_id` (or enable `date` on **Get Bookings**) and run **Get Bookings**.
