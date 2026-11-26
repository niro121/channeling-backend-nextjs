# Save Booking Service — Specification for Next.js Implementation

This document describes the **Save Booking** flow from the Sails channeling backend so it can be reimplemented in a Next.js application with the same behavior and rules. It covers the main controller flow, all helpers, models, config, and error handling.

---

## 1. Overview

**Purpose:** Create a channeling (appointment) booking, optionally create a receipt for POS/Agent payments, update agency balance, send SMS to agency, and notify real-time subscribers.

**Current endpoint (Sails):** `POST /api/v1/channeling/savebooking`

**Authentication:** Requires a logged-in user; permission `Savebooking` is checked via user group permissions.

**Response:** `{ status: boolean, data: booking | '' }`  
On error, one of the custom exits is used (see § 7).

---

## 2. Inputs (Request Body / API Contract)

All inputs the Next.js API should accept and validate:

| Input | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `name` | string | yes | - | Patient name (stored uppercase) |
| `title` | string | yes | - | Title id/index into TITLE_LIST |
| `sex` | string | yes | - | Patient sex |
| `phone` | string | yes | - | Patient phone |
| `area` | ref | yes | - | Object with at least `area.name` |
| `remarks` | string | no | `''` | Booking remarks |
| `foriegner` | boolean | yes | - | Foreigner fee flag (note: typo kept for compatibility) |
| `payment_method` | number | no | - | 0=POS, 1=On-Call, 2=Agent, 3=Staff, 4=API |
| `payment_type` | number | no | - | 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque, 4=Agent |
| `agency` | ref | no | `''` | Object with `id`; required for agent flow |
| `agency_ref` | string | no | `''` | Agency reference (stored uppercase) |
| `bank` | ref | no | `''` | `{ id, name }` |
| `slip_ref` | string | no | `''` | Slip reference |
| `card` | string | no | `''` | Card reference |
| `staff` | ref | no | `''` | `{ id, working_department? }` |
| `session` | ref | yes | - | Full session object including `id`, `fees`, `start_time`, `end_time`, `isScan`, `location`, `previous_doctor_session`, `date` |
| `doctor` | ref | yes | - | `{ id, title, name }` |
| `amount` | number | yes | - | Total amount |
| `auto_discount_type` | string | no | `''` | Discount id for auto discount |
| `discount_type` | string | no | `''` | Discount id for manual discount |
| `discount` | number | yes | - | Total discount (must match server-calculated value) |
| `referred_doctor` | ref | no | `''` | `{ id }` |
| `referred_agency` | ref | no | `''` | `{ id }` |
| `referred_staff` | ref | no | `''` | `{ id }` |

**Config constants used:**  
- `BOOKING_METHODS`: id 0=POS, 1=On-Call, 2=Agent, 3=Staff, 4=API  
- `PAYMENT_TYPES`: id 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque, 4=Agent  
- `TITLE_LIST`: array of `{ id, name, sex }` for doctor/patient titles  
- `SMS_TEMPLATE_TYPES`: type 4 = "Agent Balance Message after Booking Agent Channel"

---

## 3. Main Flow (Step-by-Step)

Execute in this order; any step that throws should abort and return the appropriate error.

1. **Authorization**  
   - Resolve current user (e.g. from session/JWT).  
   - Load user’s permissions (from user group or role).  
   - If permission list does not include `'Savebooking'`, return **403 Forbidden**.

2. **Load session**  
   - Fetch session by `inputs.session.id`.  
   - If session not found, treat as error.  
   - If `session.start_time` (as Unix) is before **start of today** (server timezone), return **500** (block past-day bookings).

3. **Consecutive session rule**  
   - If `session.previous_doctor_session` is set:  
     - Call **checkConsecutiveSessionFull(session.id)**.  
     - If it returns `false` (previous session not full), return error **PREVIOUS_SESSION_FILL**: `"Previous Consecutive Sessions is not Full."`

4. **Auto discount**  
   - If `inputs.auto_discount_type` is present:  
     - Call **getProcessedDiscount**(auto_discount_type, payment_method, payment_type, session, foriegner).  
     - If `status` is false, return **DISCOUNT_ERROR** with `autodiscount.message`.  
     - Otherwise add returned `discount_value` and `hospital_fee_discount`, `professionsal_fee_discount`, `other_discount` to running totals.

5. **Manual discount**  
   - If `inputs.discount_type` is present:  
     - Call **getProcessedDiscount**(discount_type, payment_method, payment_type, session, foriegner).  
     - Same validation and accumulation as auto discount; on failure return **DISCOUNT_ERROR**.

6. **Discount consistency**  
   - If `inputs.discount !== total_calculated_discount`, return **DISCOUNT_ERROR**: `"Error on front-end Discounts while Processing."`

7. **Fee types for refund**  
   - Call **getRefundFeeTypes**(session.fees, foriegner) and keep `{ professional_fee, hospital_fee }` for the booking record.

8. **Agency checks** (only if `inputs.agency` is present)  
   - Call **verifyAgencyReference**(agency_ref.toUpperCase(), agency.id).  
     - If it returns `true` (reference invalid/duplicate), return **AGENCY_REF_ERROR**: `"Agency Reference Error."`  
   - Load agency by `inputs.agency.id`.  
   - Call **getAgentBalance**(agency.id) (no `to_date` = use current agency balance).  
   - If `(agency.allowed_credit_limit ?? 0) + credit_balance < inputs.amount`, return **AGENCY_CREDIT_EXCEED**: `"Exceed Agency Credit Limit."`

9. **Create booking**  
   - Build `discount_division`: `{ hospital_fee_discount, professionsal_fee_discount, other_discount }` from steps 4–5.  
   - Insert booking with fields as in § 4 (Booking create payload).  
   - Handle **LIMIT_EXCEEDED** (e.g. appointment limit): return **LIMIT_EXCEEDED**: `"Appointment Limit Exceed."`  
   - If your DB uses sequences/counters for `bookingid`, `bookingid_string`, `appointment_no`, implement equivalent logic (see § 8).

10. **Receipt (POS or Agent only)**  
    - If booking created and `payment_method === 0 || payment_method === 2`:  
      - Create receipt (see § 5).  
      - If agency: call **updateAgentBalance**(agency.id, -1 * receipt.amount).  
      - If agency and `agency_details.send_sms`: load SMS template type 4, build message with placeholders, call **sendSmsTemplate**(phone, template).  
      - Update booking: set `status = 1`, `receipt_no`, `receipt_no_string`, `receipt_payment_method`, `updatedBy`, `receipt_no_createdAt`, `receipt_no_id`.  
      - If receipt creation failed, set `status = false` (booking remains but unpaid).

11. **Response payload**  
    - Load full booking for response using **getBooking**(newBooking.id).  
    - Optionally publish real-time update (e.g. session id, paid_count, pending_count) if your Next app has a similar mechanism.  
    - Return `{ status: booking ? status : false, data: booking || '' }`.

---

## 4. Booking Create Payload

Fields to set when creating the booking (map from inputs + computed values):

- `title`, `name` (uppercase), `phone`, `sex`, `area: inputs.area.name`, `remarks`  
- `method`: `inputs.payment_method`  
- `session` / `session_id`: `inputs.session.id`  
- `doctor`: `inputs.doctor.id`  
- `amount`, `discount` (total from steps 4–5), `discount_id`, `auto_discount_id`  
- `foriegner`  
- `status`: `0` (Pending)  
- `createdBy`: current user id  
- `receipt_no`: `0`, `fees`: `inputs.session.fees`, `refund`: `0`, `refund_amount`: `0`  
- `agency_ref` (uppercase), `agency` (id or null), `staff` (id or null)  
- `discount_division`, `hospital_fee_discount`, `professionsal_fee_discount`  
- `professional_fee`, `hospital_fee` from **getRefundFeeTypes**  
- `referred_doctor`, `referred_agency`, `referred_staff` (ids or null)  
- `session_start_time`, `session_end_time` (from session, as Unix)  
- `isScan`, `location` (from session), `user_location` (from current user), `user_department`: `inputs.staff.working_department ?? ''`  
- `location`: if your schema requires it for sequences, use e.g. `session.location` or current user’s location.

---

## 5. Receipt Create Payload (when payment_method is 0 or 2)

- `payment_method`: `inputs.payment_type`  
- `amount`: `inputs.amount - discount`  
- `bank`: `inputs.bank?.name ?? ''`, `bank_id`: `inputs.bank?.id ?? null`  
- `card_reference`: `inputs.card ?? ''`, `slip_reference`: `inputs.slip_ref ?? ''`  
- `remarks`: `'POS PAYMENT'` if payment_method 0, else `'AGENT PAYMENT'`  
- `type`: `1` (debit/payment)  
- `booking`: new booking id  
- `createdBy`, `agency` (id or null), `user_location`, `location`: session.location  
- Your receipt sequence (e.g. `receiptid`, `receiptid_string`) should be generated per location if you mirror the Sails logic.

---

## 6. Helpers (Detailed)

### 6.1 checkPermissions(userId)

- **Input:** `userId` (string).  
- **Logic:** Load user with `user_group` and its `permissions`. Flatten all permission values from `user_group.permissions` into one array of strings.  
- **Return:** Array of permission names (e.g. `['Savebooking', ...]`).  
- **Used in:** Step 1 to gate access.

---

### 6.2 checkConsecutiveSessionFull(session_id)

- **Input:** `session_id` (string).  
- **Logic:**  
  - Load session (at least `previous_doctor_session`, `date`).  
  - If no `previous_doctor_session`, return `false`.  
  - Load previous session where `doctor_session_id === session.previous_doctor_session` and `date === session.date`; need `appointment_no`, `max_patient_number`.  
  - If `previous_session.appointment_no < previous_session.max_patient_number` return `false` (not full).  
  - Else return `true` (full).  
- **Used in:** Step 3; throw **PREVIOUS_SESSION_FILL** when this returns `false`.

---

### 6.3 getProcessedDiscount(discount_id, payment_method, payment_type, session, foriegner)

- **Inputs:** discount_id, payment_method, payment_type, session (with `fees`), foriegner (boolean).  
- **Logic:**  
  - Load discount by id with `status === 1`.  
  - From `session.fees`: index 0 = professional (local_value, foreign_value); rest = hospital; sum professional and hospital for local and foreign.  
  - Check discount valid: `from_date` / `to_date` (moment) — current date must be within range.  
  - If invalid/expired: return `{ status: false, message: 'Discount has Expired or Inactive.' }`.  
  - Apply discount:  
    - `discount_type === 0`: percentage. `apply_to === 0` → hospital; `apply_to === 1` → professional. Use `discount_value` (local) or `discount_value_foreign` (foreign).  
    - `discount_type === 1`: fixed. Cap by corresponding fee (hospital or professional).  
  - **Return:**  
    `{ status, message, discount_value, other_discount, professionsal_fee_discount, hospital_fee_discount }`  
    (discount_value is the main amount; divide into hospital/professional/other as applicable).  
- **Used in:** Steps 4 and 5; throw **DISCOUNT_ERROR** when status is false.

---

### 6.4 getRefundFeeTypes(fees, foriegner)

- **Inputs:** `fees` (array from session), `foriegner` (boolean).  
- **Logic:** First fee: professional_fee = fees[0].foreign_value or local_value. Remaining fees: sum into hospital_fee (foreign or local).  
- **Return:** `{ professional_fee, hospital_fee }` (numbers).  
- **Used in:** Step 7 and when building booking payload.

---

### 6.5 verifyAgencyReference(ref, agency_id)

- **Inputs:** `ref` (string, already uppercase), `agency_id` (string).  
- **Logic:**  
  - If a booking exists with `agency_ref === ref` and `status` in [0, 1], and `ref.length > 4` → **invalid** (true).  
  - Else: `refbook = ref.substring(0, ref.length - 2)`, `leaf = ref.slice(-2)`. If `leaf` is numeric and > 0, look up Agencybook with `book_number === refbook`, `status === 1`, `agency === agency_id`. If found → valid (false); else invalid (true). If leaf not numeric or 0 → invalid (true).  
- **Return:** boolean — **true means error** (reference invalid or duplicate).  
- **Used in:** Step 8; throw **AGENCY_REF_ERROR** when true.

---

### 6.6 getAgentBalance(agency_id, options?)

- **Inputs:** `agency` (id); optional `to_date`, `balance_at_endof_day`.  
- **For save booking:** Call with only `agency` (no to_date).  
- **Logic (no to_date):** Load Agency by id; return `agency.balance ?? 0`.  
- **Logic (with to_date):** Compute balance from Receipts (method 1 for payments, method 0 + payment_method 4 for refunds) and Leger (deposits) up to that date; then balance = (-1 * paidtotal) + (-1 * refundtotal) + deposits.  
- **Return:** number (balance).  
- **Used in:** Step 8 for credit check.

---

### 6.7 updateAgentBalance(agency_id, value)

- **Inputs:** `agency_id`, `value` (number; negative for payment).  
- **Logic:** Load agency, new balance = current balance + value. Update agency record with new balance.  
- **Return:** `{ balance }` (updated balance).  
- **Used in:** Step 10 after creating receipt for agency payments.

---

### 6.8 getBooking(booking_id)

- **Input:** `booking_id` (string).  
- **Logic:** Load booking with relations: session, doctor, receipts (sorted by createdAt DESC), agency, staff, location, referred_doctor, referred_agency, referred_staff. Add computed: session time/date strings, paidstatus from status, method name from BOOKING_METHODS, createdByName/updatedByName (resolveUser), doctor titleName from TITLE_LIST, refund_feetypes (getRefundFeeTypes), receipt payment type names and createdByName.  
- **Return:** Full booking object for API response.  
- **Used in:** Step 11 and for SMS template placeholders (step 10).

---

### 6.9 sendSmsTemplate(phone, template)

- **Inputs:** `phone`, `template` (string with placeholders already replaced).  
- **Logic:** Call external SMS API (e.g. Mobitel) with credentials from config; send `template` to `phone`. Log to Sms_log (status 0 = sent, 1 = failure).  
- **Return:** e.g. `{ status, error, description }`.  
- **Used in:** Step 10 for agency SMS after booking.

---

### 6.10 getBookingCount(session_id)

- **Input:** `session_id`.  
- **Logic:** Count bookings with session_id and status 1 → paid; status 0 → unpaid.  
- **Return:** `{ paid, unpaid }`.  
- **Used in:** Optional real-time publish (session counts).

---

### 6.11 resolveUser(user_id)

- **Input:** `user_id` (string, optional).  
- **Logic:** Load User by id with staff populated.  
- **Return:** Display name string (e.g. `user.fullName + (staff.code)` or `'NO USER NAME'` / `'NO USER FOUND!'`).  
- **Used in:** getBooking for createdBy/updatedByName.

---

## 7. Error Exits (API Responses)

Map these to appropriate HTTP status and body in Next.js:

| Exit | HTTP suggestion | Response body / message |
|------|------------------|--------------------------|
| forbidden | 403 | Permission denied |
| DISCOUNT_ERROR | 4xx/422 | `{ DISCOUNT_ERROR: message }` |
| LIMIT_EXCEEDED | 4xx/422 | `{ LIMIT_EXCEEDED: "Appointment Limit Exceed." }` |
| AGENCY_CREDIT_EXCEED | 4xx/422 | `{ AGENCY_CREDIT_EXCEED: "Exceed Agency Credit Limit." }` |
| AGENCY_REF_ERROR | 4xx/422 | `{ AGENCY_REF_ERROR: "Agency Reference Error." }` |
| PREVIOUS_SESSION_FILL | 4xx/422 | `{ PREVIOUS_SESSION_FILL: "Previous Consecutive Sessions is not Full." }` |
| serverError (past booking) | 500 | - |

Use a consistent error response shape (e.g. `{ errorCode, message }`) if you prefer.

---

## 8. Models / Data (Summary)

- **Booking:** Core fields as in § 4; relations: session, doctor, agency, staff, receipts, location, user_location, referred_doctor, referred_agency, referred_staff. Status: 0=Pending, 1=Paid, 2=Canceled, 3=Auto Canceled.  
- **Session:** id, date, doctor_session_id, previous_doctor_session, start_time, end_time, fees, max_patient_number, appointment_no, starting_patient_number, isScan, location, status.  
- **Receipt:** receiptid, receiptid_string, payment_method, amount, bank, card_reference, slip_reference, remarks, type, method (1=payment), booking, agency, createdBy, user_location, location.  
- **Agency:** id, balance, allowed_credit_limit, phone, send_sms, …  
- **Discount:** id, status, discount_type (0 %, 1 fixed), apply_to (0 hospital, 1 professional), discount_value, discount_value_foreign, from_date, to_date.  
- **Agencybook:** book_number, agency, status.  
- **Sms_template:** type (4 for agent booking SMS), message, status.  
- **Sms_log:** status, name, description, phone, template.  
- **User:** id, fullName, user_group (with permissions).  
- **Leger:** used in getAgentBalance when calculating balance for a given date (agency, value, createdAt).

---

## 9. Config / Constants

- **TITLE_LIST:** Array of `{ id, name, sex }` for titles (MR., MRS., DR., etc.).  
- **BOOKING_METHODS:** id 0–4 (POS, On-Call, Agent, Staff, API).  
- **PAYMENT_TYPES:** id 0–4 (CASH, CREDIT CARD, SLIP, CHEQUE, AGENT).  
- **SMS:** MOBITEL_SMS_USER, MOBITEL_SMS_API_PASSWORD, MOBITEL_SMS_URL (or equivalent) for sendSmsTemplate.

---

## 10. SMS Template Placeholders (Agency SMS, type 4)

Replace in template message:

- `{agency_ref}`  
- `{doctor}` → TITLE_LIST[doctor.title].name + ' ' + doctor.name  
- `{appointment_no}` → padded to 2 digits  
- `{date}` → session date string  
- `{time}` → session time string  
- `{amount}` → (amount - discount) formatted  
- `{balance}` → updated agency balance from updateAgentBalance

---

## 11. Next.js Adaptation Notes

- **Auth:** Replace `this.req.me` with your auth (e.g. NextAuth session or JWT); ensure you have `id`, `user_location`, and a way to resolve permissions (e.g. from role or user_group).  
- **DB:** Use your ORM (Prisma, Drizzle, etc.) and replicate the same validations and relations; implement sequences for bookingid, receiptid, appointment_no per location if you keep the same semantics.  
- **Realtime:** Replace `Sessions.publish(...)` with your stack (e.g. Pusher, Socket.io, or server-sent events) if you need live session counts.  
- **Files to mirror (conceptually):**  
  - Controller: `api/controllers/channeling/savebooking.js`  
  - Helpers: `check-permissions`, `checkconsercutivesessionfull`, `get-processed-discount`, `get-refund-fee-types`, `verify-agency-reference`, `getagent-balance`, `updateagentbalance`, `get-booking`, `sendsmstemplate`, `get-boooking-count`, `resolve-user`  
  - Config: TITLE_LIST, BOOKING_METHODS, PAYMENT_TYPES, SMS template type 4, SMS API config  
- **Typo:** `foriegner` and `professionsal_fee_discount` are kept in this spec to match the existing backend; you can keep them for compatibility or rename in your schema and map at the API boundary.

---

## 12. File Reference (Sails codebase)

| Role | Path |
|------|------|
| Controller | `api/controllers/channeling/savebooking.js` |
| checkPermissions | `api/helpers/check-permissions.js` |
| checkConsecutiveSessionFull | `api/helpers/checkconsercutivesessionfull.js` |
| getProcessedDiscount | `api/helpers/get-processed-discount.js` |
| getRefundFeeTypes | `api/helpers/get-refund-fee-types.js` |
| verifyAgencyReference | `api/helpers/verify-agency-reference.js` |
| getAgentBalance | `api/helpers/getagent-balance.js` |
| updateAgentBalance | `api/helpers/updateagentbalance.js` |
| getBooking | `api/helpers/get-booking.js` |
| sendSmsTemplate | `api/helpers/sendsmstemplate.js` |
| getBookingCount | `api/helpers/get-boooking-count.js` |
| resolveUser | `api/helpers/resolve-user.js` |
| Config | `config/custom.js` (TITLE_LIST, BOOKING_METHODS, PAYMENT_TYPES, SMS_*) |
| Models | `api/models/` (Bookings, Sessions, Receipts, Agency, Discount, Agencybook, Sms_template, Sms_log, User, Leger, Location, Doctor, Staff) |
| Route | `config/routes.js`: POST `/api/v1/channeling/savebooking` → channeling/savebooking |

Use this spec together with the listed files so Cursor (or any developer) can reimplement the save-booking service in the new Next.js app with the same flow and business rules.
