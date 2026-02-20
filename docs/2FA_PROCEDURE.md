# Two-Factor Authentication (2FA) Procedure

This document describes how two-factor authentication is implemented and how to configure and use it.

---

## Overview

- **2FA is required at login only when both** (1) the user has turned it on in **Profile → Security & 2FA**, and (2) **their User Group has 2FA enabled** (admin has not disabled it for the group). If the group has 2FA disabled, the user will not be asked for a code at login even if they turned 2FA on in Settings; the Security page explains this and saves their preference for when the group allows 2FA.
- **User Groups:** An admin can **enable or disable 2FA for a group** (“Require 2FA for this group”). When disabled, no one in that group is prompted for 2FA at login. When enabled, the group can also define **allowed methods** (AUTH-APP, SMS, EMAIL); users in the group then choose one of those methods (or all three if none set).
- **Supported methods** (see `types/2FA.ts`):
  - **1 – AUTH-APP** – TOTP (e.g. Google Authenticator, Authy). Uses the user’s `twoFactorSecret` (set in Settings or at login when they choose AUTH-APP and don’t have one yet), or `TOTP_SECRET` from `.env` as fallback.
  - **2 – SMS** – One-time code sent by SMS (dummy or real API).
  - **3 – EMAIL** – One-time code sent by email (dummy or real SMTP).

---

## Enabling 2FA for a user (Settings)

1. Go to **Profile (avatar) → Security & 2FA** (or `/account/security`).
2. Turn **ON** the **“Require 2FA at login”** switch.
3. Set up at least one method (e.g. authenticator app) in the same page, or at next login when you choose a method.

2FA at login is required only when this switch is on **and** your User Group has 2FA enabled. If your group has 2FA disabled, the Security page shows a notice and your preference is saved until your administrator enables 2FA for the group. The **User Group** “Two-factor authentication” section controls whether 2FA is allowed for the group and which **methods** are allowed (AUTH-APP, SMS, EMAIL).

---

## Setting up the authenticator app (per user)

Users can add their **own** authenticator app entry (recommended) so they are not tied to a shared `TOTP_SECRET` in `.env`.

1. **Go to Security:** From the header, open the profile menu (avatar) → **Security & 2FA** (or go to `/account/security`).
2. **Set up authenticator app:** Click **“Set up authenticator app”**.
3. **Scan or enter code:** A QR code is shown. Scan it with Google Authenticator, Authy, or any TOTP app. If the device has no camera, use **“Can’t scan? Enter this code manually”** — copy the secret and add it as a manual entry in the app (account name can be the app name or email).
4. **Verify:** Click **“I’ve added the app — verify”**, then enter the 6-digit code from the app and click **“Verify and finish”**.

After this, the user’s `twoFactorSecret` is stored in the DB and used at login when they choose AUTH-APP. No need to configure `TOTP_SECRET` in `.env` for that user.

**Setting up AUTH-APP at login:** If you have 2FA enabled but have not yet set up an authenticator app, you can do it at login: after entering email and password, choose **Authenticator app**; you will see a QR code and manual entry code. Add the account in your app, enter the 6-digit code, and sign in.

- **AUTH-APP** verification uses the user’s `twoFactorSecret` (set in Settings or at login), or `TOTP_SECRET` from `.env` as fallback.
- **SMS/EMAIL** do not use any per-user 2FA fields; a code is generated and sent when the user selects that method at login.

---

## Login Flow (Procedure)

1. **User enters email and password** on the login page and submits.
2. **Backend** (`POST /api/auth/check-login`):
   - Validates email and password.
   - If invalid → 401 “Invalid credentials”.
   - If valid and **user has not enabled 2FA** (`user.twoFactorEnabled` is false) → returns `{ success: true, requiresTwoFactor: false }`; client then signs in with credentials.
   - If valid and **user has enabled 2FA** → returns `{ requiresTwoFactor: true, allowedMethods: ["1", "2", "3"] }` (from group or default). No code is sent yet.
3. **Client** shows **“Choose verification method”** with the allowed options (AUTH-APP, SMS, EMAIL). User selects one.
4. **Client** calls `POST /api/auth/request-2fa-code` with `{ email, password, method }`. Backend sends the code (or for AUTH-APP with no existing secret, generates secret and returns `needsSetup: true` with `uri` and `secret` for QR/manual setup at login).
5. **Client** shows either **“Enter verification code”** or, for AUTH-APP when `needsSetup` is true, **“Set up authenticator app”** (QR code + manual secret + code input). User adds the account (if needed), enters the 6-digit code, and submits.
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
| 2FA status (has authenticator?) | `app/api/auth/2fa-status/route.ts` |
| Setup authenticator (generate secret + URI) | `app/api/auth/setup-2fa/route.ts` |
| Verify 2FA setup (confirm code) | `app/api/auth/verify-2fa-setup/route.ts` |
| Login form (email/password + method choice + code) | `app/(auth)/login/login-form.tsx` |
| Account Security page (QR + manual entry + verify) | `app/(dashboard)/account/security/` |
| User group 2FA (enable + methods) | `app/(dashboard)/user-groups/user-group-form.tsx` |
| User group type | `types/user-group.ts` |
| 2FA preference (require 2FA on/off for me) | `app/api/auth/2fa-preference/route.ts` |
| User 2FA fields | `prisma/schema.prisma` (User: twoFactorEnabled, twoFactorMethod, twoFactorSecret, twoFactorTempCode, twoFactorExpires, twoFactorVerified, twoFactorSkipped; UserGroup: twoFactorEnabled, twoFactorMethods for allowed methods only) |

---

## Quick Checklist

- [ ] Enable 2FA on the user group and select allowed methods (AUTH-APP, SMS, EMAIL as needed).
- [ ] Set `TOTP_SECRET` in `.env` for AUTH-APP (shared secret), or set `user.twoFactorSecret` per user in DB.
- [ ] For SMS/EMAIL in production, replace dummy send with real SMS API / SMTP in `lib/2fa/send-2fa-code.ts`.
- [ ] Optionally add a “2FA setup” flow (e.g. in user profile) to generate per-user secret and show QR for AUTH-APP.
