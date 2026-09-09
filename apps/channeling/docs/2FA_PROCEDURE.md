# Two-Factor Authentication (2FA) Procedure

This document explains the current 2FA behavior, configuration rules, and user/admin flows in this project.

---

## Current Behavior (Important)

- 2FA is enforced at login only when **both** conditions are true:
  1. User preference is ON (`user.twoFactorEnabled = true`)
  2. User group allows 2FA (`user.userGroup.twoFactorEnabled = true`, or user has no group)
- If a group disables 2FA, users in that group are not prompted for 2FA at login, even if they enabled it in their own settings.
- UI currently supports **AUTH-APP** and **SMS**.
- **EMAIL is currently unavailable in UI** and backend returns unavailable behavior for email sending.

---

## Supported Methods

Method IDs (`lib/helpers/2fa/constants.ts`):

- `1` = `AUTH-APP` (TOTP)
- `2` = `SMS` (OTP code)
- `3` = `EMAIL` (temporarily unavailable in UI)

UI method list is controlled by `types/2FA.ts`.

---

## User-Side 2FA (Account Security Page)

Location: `/account/security` (`app/(dashboard)/account/security/security-page-client.tsx`)

### Rules

- User can enable 2FA only if they have a phone number.
- If the user has no phone:
  - Switch is shown as OFF and disabled.
  - UI explains that mobile number is required.
- If group disables 2FA:
  - UI shows a notice that group-level policy is disabling login 2FA.
  - User preference is still visible and can be saved for future use when group allows 2FA again.

### Endpoints Used

- `GET /api/auth/2fa-status`
  - Returns:
    - `hasAuthenticator`
    - `require2FAAtLogin` (effective runtime state)
    - `userPreference2FA` (saved user setting)
    - `groupAllows2FA`
    - `hasPhone`
- `PATCH /api/auth/2fa-preference`
  - Updates `user.twoFactorEnabled`
  - Blocks enabling when no phone number.

---

## Admin Override (User Management)

Admin users can enable/disable 2FA for any user directly from Users module.

Location: `app/(dashboard)/users/user-form.tsx`

- Admin-only field: **Require 2FA at login (Admin override)**
- This directly updates `user.twoFactorEnabled` through:
  - `app/actions/user.actions.ts`
  - `services/user.service.ts`

Purpose:

- Emergency control during incidents/vulnerability response
- Bypass user-side phone restriction in admin workflows

---

## User Group 2FA Policy

Location: `app/(dashboard)/user-groups/user-group-form.tsx`

- Group toggle: **Require 2FA for this group**
- If OFF, users in that group are not asked for 2FA at login.
- Allowed methods are configured per group (currently AUTH-APP + SMS in UI).

---

## Login Flow (Step-by-Step)

1. User submits email/password on login page.
2. Backend `POST /api/auth/check-login` validates credentials.
3. Backend decides whether 2FA is required using:
   - `user.twoFactorEnabled`
   - `groupAllows2FA`
4. If required, frontend shows method selection.
5. Frontend calls `POST /api/auth/request-2fa-code` with selected method.
6. User enters code and signs in via `lib/auth.ts` credentials authorize flow.

Verification behavior:

- AUTH-APP: TOTP validation (`lib/helpers/2fa/totp.ts`)
- SMS: compares entered code with `user.twoFactorTempCode`

UX note:

- Previously entered verification code is cleared when switching method/back in login form.

---

## SMS / Email Delivery Status

Location: `lib/helpers/2fa/send-2fa-code.ts`

- SMS is active and uses:
  - `lib/helpers/sms/send-sms.ts`
  - `lib/templates/sms/2FA/2fa-code.ts`
- Email sending code is intentionally commented/unavailable:
  - `send2faEmail()` currently returns unsuccessful status.

---

## Security & Expiry

- Pending AUTH-APP step expiry:
  - `TWO_FA_PENDING_EXPIRY_MINUTES` (default 10)
- SMS code expiry:
  - `TWO_FA_CODE_EXPIRY_MINUTES` (default 5)
- On successful verification:
  - temp fields are cleared (`twoFactorTempCode`, `twoFactorExpires`)

---

## Key Files

| Purpose | File |
|---|---|
| Login authorize + 2FA verification | `lib/auth.ts` |
| 2FA constants | `lib/helpers/2fa/constants.ts` |
| TOTP helpers | `lib/helpers/2fa/totp.ts` |
| SMS/Email send wrapper | `lib/helpers/2fa/send-2fa-code.ts` |
| Reusable SMS sender | `lib/helpers/sms/send-sms.ts` |
| 2FA SMS template | `lib/templates/sms/2FA/2fa-code.ts` |
| Login check (2FA decision) | `app/api/auth/check-login/route.ts` |
| Request code by method | `app/api/auth/request-2fa-code/route.ts` |
| 2FA status | `app/api/auth/2fa-status/route.ts` |
| User preference update | `app/api/auth/2fa-preference/route.ts` |
| User security UI | `app/(dashboard)/account/security/security-page-client.tsx` |
| User group 2FA UI | `app/(dashboard)/user-groups/user-group-form.tsx` |
| Admin user form override | `app/(dashboard)/users/user-form.tsx` |

---

## Operational Checklist

- [ ] Ensure group-level 2FA policy is set correctly for each user group.
- [ ] Ensure users who should use SMS 2FA have valid phone numbers.
- [ ] Keep EMAIL method hidden until SMTP implementation is ready.
- [ ] Verify admin override path works for emergency disable/enable.
- [ ] Verify login method-switch flow clears old OTP values.
