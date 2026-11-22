# Ayu staff-profile API

Read-only API for the Ruhunu caddie (the service that hosts Ayu). The caddie links its own
users to channeling users by id and asks here, live, whether they are still active. Nothing is
copied between the systems.

Code: `app/api/ayu/staff-users/*`, `services/ayu-staff.service.ts`, `lib/ayu-api-route.ts`.

## Scope

`ayu:staff:read`: read staff profiles for Ayu (name, contact, status). Never returned: NIC,
date of birth, address, password or 2FA fields, user-group permissions, or anything from HR.

## Create the caddie's API client

1. Make sure there is an active user of type **API User** to act as the system user
   (Admin → Users).
2. Admin → API clients → **New**. Name it (e.g. "Ruhunu caddie"), select that user as the
   acting user, and tick **`ayu:staff:read`**.
3. Copy the client id and secret (the secret is shown once) into the caddie's secrets.

To revoke access, block the client or untick the scope. Both take effect on the next call,
because the client is re-read from the database every time.

## Auth

Get a token with client credentials, the same way as the public API
(see [public-api-curl.md](public-api-curl.md)):

```bash
curl -X POST "$BASE/api/public/token" -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"...","client_secret":"..."}'
```

Send it as `Authorization: Bearer <access_token>`.

| Status | `error` | When |
| --- | --- | --- |
| 401 | `invalid_token` | Token missing, invalid or expired, or the client is blocked or deleted |
| 403 | `insufficient_scope` | Valid client without `ayu:staff:read` |
| 400 | `invalid_request` | Bad input (see each route) |
| 404 | `not_found` | `GET /[id]` only |

Errors look like `{ "error": "...", "error_description": "..." }`. Calls are recorded in the
API Log report like the public API (`x-request-id` header). On the `API_ONLY` instance these
routes are served alongside `/api/public` and `/api/management`.

## Routes

Only admin (`userType` 1) and staff (`userType` 2) users are ever returned.

### `GET /api/ayu/staff-users?search=<text>&limit=<n>`

Name or email contains `search` (case-insensitive, at least 2 characters, else 400).
`limit` defaults to 10, max 20. Sorted by name. Inactive users are included, with
`active: false`.

Response: `{ "users": StaffProfile[] }`

### `GET /api/ayu/staff-users/{id}`

One user. 400 if `id` is not a 24-character ObjectId; 404 if not found or not admin/staff.

Response: `{ "user": StaffProfile }`

### `POST /api/ayu/staff-users/status`

Body `{ "ids": ["<userId>", ...] }`, at most 200 (more is a 400). Malformed ids are ignored,
duplicates collapsed. Ids that are not found or are not admin/staff come back
`active: false, sessionVersion: 0`. Nothing is written; POST only so long lists fit.

```json
{
  "statuses": [
    { "id": "665f1c2e9b1d4a0012ab34cd", "active": true, "sessionVersion": 42 },
    { "id": "665f1c2e9b1d4a0012ab0000", "active": false, "sessionVersion": 0 }
  ]
}
```

`sessionVersion` goes up each time the user signs in to channeling; the caddie can use a change
as a signal that the user has signed in again.

## StaffProfile

```json
{
  "id": "665f1c2e9b1d4a0012ab34cd",
  "name": "K. Perera",
  "email": "kperera@example.lk",
  "userType": "staff",
  "active": true,
  "userStatus": 1,
  "staffStatus": 1,
  "mobile": "0771234567",
  "staffCode": "ST-0042",
  "title": "Mrs",
  "userGroup": "Front Office",
  "sessionVersion": 42,
  "updatedAt": "2026-11-20T08:15:00.000Z"
}
```

| Field | Meaning |
| --- | --- |
| `userType` | `"admin"` or `"staff"` |
| `active` | `userStatus === 1` (the value login requires) **and** the linked staff record, if any, has status 1 **and** the user group, if any, has status 1 |
| `userStatus` | `User.status` (1 = active) |
| `staffStatus` | Linked `Staff.status` (0 inactive, 1 active), `null` when the user has no staff record |
| `mobile` | `User.phone` (the 2FA number), else the linked staff contact mobile, as stored; `null` if neither |
| `staffCode`, `title` | From the linked staff record, `null` when none |
| `userGroup` | User group name, `null` when none |
| `updatedAt` | `User.updatedAt`. It is set when the user is created and is not reliably bumped on edits, so poll `/status` for liveness rather than relying on it |
