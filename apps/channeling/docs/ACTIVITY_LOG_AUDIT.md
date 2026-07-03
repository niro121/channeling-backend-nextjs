# Activity Log – Tracked Events (Audit Reference)

This document lists all user activities recorded in the application’s activity log, by component. Use it to confirm coverage for auditors or to add new events.

**Importance levels**

- **Low** – Read-only (page/statement views). Can be excluded or trimmed earlier via `ACTIVITY_LOG_LOW_ENABLED`.
- **Medium** – Exports and list downloads (who exported what, when). Useful for data-access audit.
- **High** – Data-changing actions (create, update, delete, approve). Kept for audit.

**Recorded per event:** `userId`, `action`, `entityType`, `entityId` (when applicable), `ipAddress` (when in request), `importance`, `createdAt`.

---

## My Till

| Action | Importance | When |
|--------|------------|------|
| `till.visited` | Low | User opens My Till page |
| `till.statement.viewed` | Low | User fetches till statement (with optional date range) |

---

## Ledger

| Action | Importance | When |
|--------|------------|------|
| `ledger.visited` | Low | User opens Ledger page |
| `ledger.receipt.created` | High | User creates a ledger transaction (receipt) |

---

## Accounting

| Action | Importance | When |
|--------|------------|------|
| `accounting.visited` | Low | User opens Accounting (chart of accounts) page |
| `accounting.statement.viewed` | Low | User views an account statement |
| `accounting.account.created` | High | User creates an account |
| `accounting.account.updated` | High | User updates an account |

---

## Channel Booking

| Action | Importance | When |
|--------|------------|------|
| `channel-booking.visited` | Low | User opens Channel Booking page |
| `channel-booking.booking.created` | High | User creates a booking |
| `booking.transferred` | High | Bookings are transferred (e.g. session/doctor change) |

---

## Doctor Payments

| Action | Importance | When |
|--------|------------|------|
| `doctor-payment.batch.paid` | High | User processes a batch doctor payment (receipt created, bookings updated) |

---

## Sessions

| Action | Importance | When |
|--------|------------|------|
| `sessions.visited` | Low | User opens Sessions page |
| `session.created.bulk` | High | Sessions created (e.g. bulk creation) |
| `session.updated` | High | Session updated |
| `session.deleted` | High | Session deleted |
| `session.sms_sent` | High | SMS sent to session (e.g. reminder) |

---

## Doctors

| Action | Importance | When |
|--------|------------|------|
| `doctors.visited` | Low | User opens Doctors page |
| `doctors.doctor.created` | High | User creates a doctor |
| `doctors.doctor.updated` | High | User updates a doctor |
| `doctors.doctor.deleted` | High | User deletes a doctor |
| `doctors.doctors.bulkDeleted` | High | User bulk-deletes doctors |
| `doctors.exported` | Medium | User exports doctors list |

---

## Doctor Sessions

| Action | Importance | When |
|--------|------------|------|
| `doctor-sessions.visited` | Low | User opens Doctor Sessions page |
| `doctor-sessions.session.created` | High | User creates a doctor session |
| `doctor-sessions.session.updated` | High | User updates a doctor session |
| `doctor-sessions.session.deleted` | High | User deletes a doctor session |
| `doctor-sessions.sessions.bulkDeleted` | High | User bulk-deletes doctor sessions |

---

## Specialities

| Action | Importance | When |
|--------|------------|------|
| `specialities.visited` | Low | User opens Specialities page |
| `specialities.speciality.created` | High | User creates a speciality |
| `specialities.speciality.updated` | High | User updates a speciality |
| `specialities.speciality.deleted` | High | User deletes a speciality |
| `specialities.specialities.bulkDeleted` | High | User bulk-deletes specialities |
| `specialities.exported` | Medium | User exports specialities list |

---

## Doctor Leaves

| Action | Importance | When |
|--------|------------|------|
| `doctor-leaves.visited` | Low | User opens Doctor Leaves page |
| `doctor-leaves.leave.created` | High | User creates a doctor leave |
| `doctor-leaves.leave.updated` | High | User updates a doctor leave |
| `doctor-leaves.leave.deleted` | High | User deletes a doctor leave |
| `doctor-leaves.leaves.bulkDeleted` | High | User bulk-deletes doctor leaves |

---

## Departments

| Action | Importance | When |
|--------|------------|------|
| `departments.visited` | Low | User opens Departments page |
| `departments.department.created` | High | User creates a department |
| `departments.department.updated` | High | User updates a department |
| `departments.department.deleted` | High | User deletes a department |
| `departments.departments.bulkDeleted` | High | User bulk-deletes departments |
| `departments.exported` | Medium | User exports departments list |

---

## Zones

| Action | Importance | When |
|--------|------------|------|
| `zones.visited` | Low | User opens Zones page |
| `zones.zone.created` | High | User creates a zone |
| `zones.zone.updated` | High | User updates a zone |
| `zones.zone.deleted` | High | User deletes a zone |
| `zones.zones.bulkDeleted` | High | User bulk-deletes zones |
| `zones.exported` | Medium | User exports zones list |

---

## Rooms

| Action | Importance | When |
|--------|------------|------|
| `rooms.visited` | Low | User opens Rooms page |
| `rooms.room.created` | High | User creates a room |
| `rooms.room.updated` | High | User updates a room |
| `rooms.room.deleted` | High | User deletes a room |
| `rooms.rooms.bulkDeleted` | High | User bulk-deletes rooms |
| `rooms.exported` | Medium | User exports rooms list |

---

## Locations

| Action | Importance | When |
|--------|------------|------|
| `locations.visited` | Low | User opens Locations page |
| `locations.location.created` | High | User creates a location |
| `locations.location.updated` | High | User updates a location |
| `locations.location.deleted` | High | User deletes a location |
| `locations.locations.bulkDeleted` | High | User bulk-deletes locations |
| `locations.exported` | Medium | User exports locations list |

---

## Patients

| Action | Importance | When |
|--------|------------|------|
| `patients.visited` | Low | User opens Patients page |
| `patients.patient.created` | High | User creates a patient |
| `patients.patient.updated` | High | User updates a patient |
| `patients.patient.deleted` | High | User deletes a patient |
| `patients.patients.bulkDeleted` | High | User bulk-deletes patients |
| `patients.exported` | Medium | User exports patients list |

---

## Staff

| Action | Importance | When |
|--------|------------|------|
| `staff.visited` | Low | User opens Staff page |
| `staff.staff.created` | High | User creates a staff member |
| `staff.staff.updated` | High | User updates a staff member |
| `staff.staff.deleted` | High | User deletes a staff member |
| `staff.staff.bulkDeleted` | High | User bulk-deletes staff |
| `staff.exported` | Medium | User exports staff list |

---

## Users

| Action | Importance | When |
|--------|------------|------|
| `users.visited` | Low | User opens Users page |
| `users.user.created` | High | User creates a user |
| `users.user.updated` | High | User updates a user |
| `users.user.deleted` | High | User deletes a user |
| `users.users.bulkDeleted` | High | User bulk-deletes users |
| `users.exported` | Medium | User exports users list |

---

## User Groups

| Action | Importance | When |
|--------|------------|------|
| `user-groups.visited` | Low | User opens User Groups page |
| `user-groups.userGroup.created` | High | User creates a user group |
| `user-groups.userGroup.updated` | High | User updates a user group |

---

## Agency Books

| Action | Importance | When |
|--------|------------|------|
| `agency-books.visited` | Low | User opens Agency Books page |
| `agency-books.agencyBook.created` | High | User creates an agency book |
| `agency-books.agencyBook.updated` | High | User updates an agency book |
| `agency-books.agencyBook.deleted` | High | User deletes an agency book |
| `agency-books.agencyBooks.bulkDeleted` | High | User bulk-deletes agency books |
| `agency-books.exported` | Medium | User exports agency books list |

---

## Agencies

| Action | Importance | When |
|--------|------------|------|
| `agencies.visited` | Low | User opens Agencies page |
| `agencies.agency.created` | High | User creates an agency |
| `agencies.agency.updated` | High | User updates an agency |
| `agencies.limit.soft_changed` | High | User updates an agency soft credit limit (`Agency.allowedCreditLimit`) |
| `agencies.limit.hard_changed` | High | User updates an agent hard credit limit (linked `Account.maxBalanceAllowed`) |
| `agencies.agency.deleted` | High | User deletes an agency |
| `agencies.agencies.bulkDeleted` | High | User bulk-deletes agencies |
| `agencies.exported` | Medium | User exports agencies list |

---

## Credit Customers

| Action | Importance | When |
|--------|------------|------|
| `credit-customers.visited` | Low | User opens Credit Customers page |
| `credit-customers.creditCustomer.created` | High | User creates a credit customer |
| `credit-customers.creditCustomer.updated` | High | User updates a credit customer |
| `credit-customers.creditCustomer.deleted` | High | User deletes a credit customer |
| `credit-customers.creditCustomers.bulkDeleted` | High | User bulk-deletes credit customers |
| `credit-customers.exported` | Medium | User exports credit customers list |

---

## Discounts

| Action | Importance | When |
|--------|------------|------|
| `discounts.visited` | Low | User opens Discounts page |
| `discounts.discount.created` | High | User creates a discount |
| `discounts.discount.updated` | High | User updates a discount |
| `discounts.discount.deleted` | High | User deletes a discount |
| `discounts.discounts.bulkDeleted` | High | User bulk-deletes discounts |
| `discounts.exported` | Medium | User exports discounts list |

---

## Bulk Cashier

| Action | Importance | When |
|--------|------------|------|
| `bulk-cashier.visited` | Low | User opens Bulk Cashier page |

---

## Float Transfers

| Action | Importance | When |
|--------|------------|------|
| `float-transfers.visited` | Low | User opens Float Transfers page |
| `float-transfers.floatRequest.approved` | High | Bulk cashier approves a float request |

---

## Shifts

| Action | Importance | When |
|--------|------------|------|
| `shifts.visited` | Low | User opens Shifts page |
| `shift.started` | High | User starts a shift |
| `shift.paused` | High | User pauses a shift |
| `shift.resumed` | High | User resumes a shift |
| `shift.ended` | High | User ends a shift |

---

## Tags

| Action | Importance | When |
|--------|------------|------|
| `tags.visited` | Low | User opens Tags page |
| `tags.tag.created` | High | User creates a tag |
| `tags.tag.updated` | High | User updates a tag |
| `tags.tag.deleted` | High | User deletes a tag |
| `tags.tags.bulkDeleted` | High | User bulk-deletes tags |
| `tags.exported` | Medium | User exports tags list |

---

## SMS Playground

| Action | Importance | When |
|--------|------------|------|
| `sms-playground.visited` | Low | User opens SMS Playground page |

---

## SMS Templates

| Action | Importance | When |
|--------|------------|------|
| `sms-templates.visited` | Low | User opens SMS Templates page |
| `sms-templates.template.created` | High | User creates an SMS template |
| `sms-templates.template.updated` | High | User updates an SMS template |
| `sms-templates.template.deleted` | High | User deletes an SMS template |
| `sms-templates.templates.bulkDeleted` | High | User bulk-deletes SMS templates |

---

## Reports

| Action | Importance | When |
|--------|------------|------|
| `reports.visited` | Low | User opens Reports (index) page |
| `reports.agent-detail.exported` | Medium | User exports Agent Detail report |
| `reports.doctors.exported` | Medium | User exports Doctors report |
| `reports.channel-agent-reference-book.exported` | Medium | User exports Channel Agent Reference Book report |
| `reports.doctor-arrivals.exported` | Medium | User exports Doctor Arrivals report |
| `reports.user-activity.exported` | Medium | User exports User Activity report (capped at 10k; note if more exist) |
| `reports.agent-history-credit-limit-update.exported` | Medium | User exports Agent History(Credit Limit Update) report |
| `reports.channel-transfer.exported` | Medium | User exports Channel Transfer Report |
| `reports.cashier-drawer-balance.exported` | Medium | User exports Cashier Drawer Balance report |
| `reports.card-summary-bank-wise.exported` | Medium | User exports Card Summary - Bank Wise report |
| `reports.agent-collection-receipt.exported` | Medium | User exports Agent Collection Receipt report |

---

## Admin – Receipt Templates

| Action | Importance | When |
|--------|------------|------|
| `admin.receipt-templates.visited` | Low | User opens Receipt templates page |
| `admin.receipt-templates.template.created` | High | User creates a receipt template |
| `admin.receipt-templates.template.updated` | High | User updates a receipt template |
| `admin.receipt-templates.template.deleted` | High | User deletes a receipt template |
| `admin.receipt-templates.header.deleted` | High | User deletes a receipt header template |
| `admin.receipt-templates.footer.deleted` | High | User deletes a receipt footer template |

---

## Admin – API Clients

| Action | Importance | When |
|--------|------------|------|
| `admin.api-clients.visited` | Low | User opens API Clients page |
| `admin.api-clients.client.created` | High | User creates an API client |
| `admin.api-clients.client.updated` | High | User updates an API client |

---

## Summary for Auditors

- **Page visits (low):** Logged for every main dashboard area so you can see who accessed which screens.
- **Exports (medium):** List exports and report exports are logged (who exported, when, and row count where available) for data-access audit.
- **Mutations (high):** Create, update, delete (single and bulk), and approve actions are logged with the acting user, entity type, and entity id where relevant.
- **IP address:** Captured from request headers when available (`x-forwarded-for` or `x-real-ip`).
- **Retention:** Low-importance events can be trimmed (e.g. by age) without losing audit-critical data; medium (exports) and high (mutations) should be retained per your policy.


If you need additional events (e.g. more sub-pages or report types), they can be added using the same `logActivity` helper and this document updated.
