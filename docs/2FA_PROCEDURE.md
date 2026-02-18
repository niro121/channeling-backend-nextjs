# Two-Factor Authentication (2FA) Procedure

This document describes how two-factor authentication is implemented and how to configure and use it.

---

## Overview

- **2FA is controlled at the User Group level.** Enable or disable 2FA and choose allowed methods per user group.
- **Users in a 2FA-enabled group** are sent to the 2FA step after entering correct email and password. **No per-user 2FA setting in the DB is required**; the user chooses their verification method on the 2FA screen from the methods allowed by their group.
- **Supported methods** (see `types/2FA.ts`):
  - **1 – AUTH-APP** – TOTP (e.g. Google Authenticator, Authy). Uses `TOTP_SECRET` from `.env` or the user’s `twoFactorSecret` if set.
  - **2 – SMS** – One-time code sent by SMS (dummy or real API).
  - **3 – EMAIL** – One-time code sent by email (dummy or real SMTP).

---

## Enabling 2FA for a User Group

1. Go to **User Groups** (e.g. `/user-groups`).
2. **Create** a new group or **Edit** an existing one.
3. In the **Two-factor authentication** section:
   - Turn **ON** “Require 2FA for this group”.
   - Under **Allowed methods**, select one or more: **AUTH-APP**, **SMS**, **EMAIL**.
4. Save the user group.

All users in that group will be prompted for 2FA at login. They do **not** need `user.twoFactorMethod` (or any 2FA field) set in the database.

---

## Optional: Per-user AUTH-APP secret

- **AUTH-APP** verification uses, in order: the user’s `twoFactorSecret` (if set in DB), then `TOTP_SECRET` from `.env`. So you can use a single shared secret in `.env` for all users, or set `user.twoFactorSecret` per user for separate authenticator entries.
- **SMS/EMAIL** do not use any per-user 2FA fields; a code is generated and sent when the user selects that method at login.

---

## Login Flow (Procedure)

1. **User enters email and password** on the login page and submits.
2. **Backend** (`POST /api/auth/check-login`):
   - Validates email and password.
   - If invalid → 401 “Invalid credentials”.
   - If valid and **2FA not required** (group has 2FA off or no allowed methods) → returns `{ success: true, requiresTwoFactor: false }`; client then signs in with credentials.
   - If valid and **2FA required** → returns `{ requiresTwoFactor: true, allowedMethods: ["1", "2", "3"] }` (depending on group). No code is sent yet.
3. **Client** shows the **“Choose verification method”** screen with the allowed options (AUTH-APP, SMS, EMAIL). User selects one.
4. **Client** calls `POST /api/auth/request-2fa-code` with `{ email, password, method }`. Backend sends the code (or sets pending token for AUTH-APP) and returns a short message.
5. **Client** shows **“Enter verification code”** and the code input. User enters the 6-digit code and submits.
6. **Backend** (`lib/auth.ts` authorize with `twoFactorCode`): Verifies the code (TOTP for AUTH-APP, stored code for SMS/EMAIL), clears temp fields, and signs the user in. On failure, the user can try again or choose another method / back to login.

---

## Dummy vs Real SMS/Email

- **Current behaviour:** Sending is **dummy** in `lib/2fa/send-2fa-code.ts`. It only logs to the console (e.g. “Would send code to … | Code: 123456”). No real API or SMTP is called.
- **To go live:**
  - **SMS:** Replace the implementation with your real SMS API (e.g. re-use `services/send-sms.service.ts` and pass phone number; you may need a `phone` field on the user).
  - **Email:** Implement real SMTP (e.g. Nodemailer or your existing email service) and call it from `send2faEmail` with the user’s email and the generated code.

---

## Expiry and Security

- **AUTH-APP pending step:** 10 minutes (configurable in `lib/2fa/constants.ts` → `TWO_FA_PENDING_EXPIRY_MINUTES`).
- **SMS/EMAIL code:** 5 minutes (`TWO_FA_CODE_EXPIRY_MINUTES`).
- After successful 2FA verification, `twoFactorTempCode` and `twoFactorExpires` on the user are cleared.

---

## File Reference

| Purpose | Location |
|--------|----------|
| Method options (AUTH-APP, SMS, EMAIL) | `types/2FA.ts` |
| 2FA constants and expiry | `lib/2fa/constants.ts` |
| TOTP generate/verify | `lib/2fa/totp.ts` |
| Dummy SMS/Email send | `lib/2fa/send-2fa-code.ts` |
| Login auth + 2FA step 2 | `lib/auth.ts` |
| Check login (2FA required? + allowed methods) | `app/api/auth/check-login/route.ts` |
| Request 2FA code (after user selects method) | `app/api/auth/request-2fa-code/route.ts` |
| Login form (email/password + method choice + code) | `app/(auth)/login/login-form.tsx` |
| User group 2FA (enable + methods) | `app/(dashboard)/user-groups/user-group-form.tsx` |
| User group type | `types/user-group.ts` |
| User 2FA fields | `prisma/schema.prisma` (User: twoFactorMethod, twoFactorSecret, twoFactorTempCode, twoFactorExpires, twoFactorVerified; UserGroup: twoFactorEnabled, twoFactorMethods) |

---

## Quick Checklist

- [ ] Enable 2FA on the user group and select allowed methods (AUTH-APP, SMS, EMAIL as needed).
- [ ] Set `TOTP_SECRET` in `.env` for AUTH-APP (shared secret), or set `user.twoFactorSecret` per user in DB.
- [ ] For SMS/EMAIL in production, replace dummy send with real SMS API / SMTP in `lib/2fa/send-2fa-code.ts`.
- [ ] Optionally add a “2FA setup” flow (e.g. in user profile) to generate per-user secret and show QR for AUTH-APP.
