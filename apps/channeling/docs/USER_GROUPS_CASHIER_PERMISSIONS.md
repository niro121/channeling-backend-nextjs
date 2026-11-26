# Channeling user groups — permissions

Use this when creating user groups in **User Groups**. A group is a permission bundle. Assign the group on the user. Admin (`userType` 1) bypasses every check.

These two groups are **proposed**. They are not stored in code. The app treats a user as a bulk cashier when their group has the flags in the last section.

Standard actions, unless a resource lists its own: **View**, **Add**, **Edit**, **Delete**.

---

## High-level permission list

| Area | Resource | What the ticks mean |
| --- | --- | --- |
| People | Users | Users and user groups |
| Dashboard | Dashboard | Welcome widgets: Active shift, Today’s bookings, Today’s revenue, Sessions today, Recent bookings, Queue snapshot |
| Channeling | Channel Booking | Open channel booking, create bookings, edit / settle / refund |
| Channeling | Channel Booking – Change Date | Change an appointment date |
| Channeling | Channel Booking – Block numbers | Block or unblock appointment numbers |
| Channeling | Channel Booking – Forced bookings | Book into a blocked number |
| Channeling | Shift (Channel Booking) | Start, pause, resume, and end a shift; request and receive float |
| Channeling | Handovers | View own handovers. **View any handover** opens other people’s handovers |
| Channeling | Shifts | Shifts list (oversight) |
| Consultants | Doctors | Doctor master |
| Consultants | Sessions | Session master |
| Consultants | Doctor Sessions | Doctor session setup and bulk price change |
| Consultants | Departments | Departments |
| Consultants | Specialities | Specialities |
| Consultants | Doctor Leave | Doctor leave |
| Organization | Zones, Rooms, Locations | Site setup |
| People | Patients | Patient list |
| People | Tags | Tags |
| Agency | Agency Books | Agency book leaves |
| Agency | Agencies | Agencies, plus **Edit Credit Limit** and **Edit Allowed Credit Limit** |
| Agency | Credit Customers | Credit customers |
| Agency | Discounts | Discount schemes |
| Cash | Bulk Cashier | Float View, Float Approve, Bulk Cashier, Float Request, My Till |
| Cash | Float Transfers | Float transfer history |
| Cash | Doctor Payments | Doctor payments |
| Cash | Accounting | Accounting setup |
| Cash | Ledger | View and post ledger types (branch income/expense, agency notes, deposits, withdrawals, bank deposit), edit, delete, cancel |
| Cash | Bank Accounts | Bank accounts |
| Cash | Receipt Manager | Receipt manager (view only) |
| Cash | Reconciliation | View, submit for reconciliation, approve reconciliation |
| Cash | Approval Center | View, approve channel cancellations, approve channel refunds, approve bank deposits |
| Other | SMS Playground | SMS playground |
| Other | Reports | All reports (one View tick) |
| Admin | API Clients | API clients |

**Bulk Cashier** actions:

| Tick | Opens / allows |
| --- | --- |
| Float Request | Counter cashier asks for float, receives it, or declines an approved float |
| My Till | My Till page |
| Float Approve | This user can be chosen as the approver, and can approve or reject a request |
| Bulk Cashier | Bulk Cashier page: pending requests, active shifts, till cash |
| Float View | Listed on the group form. Nothing in the app checks this tick today |

---

## Proposed: Cashier User

Counter cashier. Books patients, runs a shift, asks the bulk cashier for float, and hands the shift over.

**Grant**

| Resource | Ticks |
| --- | --- |
| Dashboard | Active shift, Today’s bookings |
| Channel Booking | View, Add, Edit |
| Shift (Channel Booking) | View |
| Handovers | View |
| Patients | View |
| Bulk Cashier | Float Request, My Till |

**Leave off**

- Bulk Cashier: Float Approve, Bulk Cashier, Float View
- Handovers: View any handover
- Change Date, Block numbers, Forced bookings
- Shifts list, Reports, Ledger, Accounting, Reconciliation, Approval Center
- Users, master data (doctors, sessions, locations, agencies, discounts)

Edit on Channel Booking is what lets them settle, update, and refund a booking. Leave it off if refunds should go through Approval Center instead.

---

## Proposed: Bulk Cashier User

Holds the source till and issues float. The app also gives this user the longer bulk-cashier shift limit, because of the **Bulk Cashier** tick.

**Grant**

| Resource | Ticks |
| --- | --- |
| Dashboard | Active shift |
| Shift (Channel Booking) | View |
| Handovers | View, View any handover |
| Bulk Cashier | Float Approve, Bulk Cashier, My Till |
| Float Transfers | View |

**Leave off**

- Bulk Cashier: Float Request (they issue float; they do not request it from themselves)
- Channel Booking Add / Edit, unless this person also works the counter
- Ledger, Accounting, Reconciliation, Approval Center, Reports, Users, master data

View any handover lets them open a cashier’s handover, not only ones they sent or received.

---

## What the app actually uses

| If the group has | The user is |
| --- | --- |
| Float Approve | Shown in the “who can approve float” list, and can approve or reject |
| Bulk Cashier | `isBulkCashier`, can open `/bulk-cashier`, and uses the longer shift limit |
| Float Request | Can create, receive, and decline a float while on a shift |
| My Till | Can open `/my-till` |

A cashier group needs **Float Request**. A bulk cashier group needs **Float Approve** and **Bulk Cashier**. Giving both Float Request and Float Approve to the same group mixes the two roles.
