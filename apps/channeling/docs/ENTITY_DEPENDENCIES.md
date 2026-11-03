# Entity dependencies: what happens on delete

Summary of how deleting an entity affects related data (schema + app logic).

---

## What gets **deleted** when

| Delete this | These are **deleted** |
|-------------|------------------------|
| **User** | UserBookingLocation, Shift, ActivityLog |
| **Location** | UserBookingLocation |
| **Doctor** | DoctorSession, DoctorLeave |
| **DoctorSession** | **Session** (by app code in doctor session delete service) |
| **DoctorSessionBulkPriceChange** | DoctorSessionBulkPriceChangeRule, DoctorSessionBulkPriceChangeResult |
| **Discount** | VoucherCode |
| **Booking** | Receipt |

---

## What is **kept** (FK set to null)

When you delete **Session, Department, Room, Zone, Speciality, Location** (for Zones/Rooms), or **Agency/Staff** etc., related records are **not** deleted — only the foreign key on the child is set to null (e.g. Session keeps Booking with `sessionId` null; Room keeps Session with `roomId` null).

---

## Delete **blocked**

- **Doctor** cannot be deleted if any **Booking** references that doctor (Restrict). Reassign or delete those bookings first.

---

*Source: `prisma/schema.prisma`, `services/doctor.sessions.service.ts`.*
