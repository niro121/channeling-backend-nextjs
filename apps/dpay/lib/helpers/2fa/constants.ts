/** 2FA method IDs matching types/2FA.ts and UserGroup.twoFactorMethods. EMAIL is currently unavailable in UI. */
export const TWO_FACTOR_METHODS = {
  AUTH_APP: '1',
  SMS: '2',
  EMAIL: '3' // Backend still accepts; UI and send-2fa-code treat as unavailable
} as const;

export type TwoFactorMethodId = (typeof TWO_FACTOR_METHODS)[keyof typeof TWO_FACTOR_METHODS];

/** Prefix for NextAuth error when 2FA is required; payload is the pending token (for AUTH-APP) or empty */
export const ERROR_2FA_REQUIRED = '2FA_REQUIRED';

/** Default expiry for 2FA pending step (minutes) */
export const TWO_FA_PENDING_EXPIRY_MINUTES = Number(process.env.TWO_FA_PENDING_EXPIRY_MINUTES) || 10;
/** Default expiry for SMS/EMAIL code (minutes) */
export const TWO_FA_CODE_EXPIRY_MINUTES = Number(process.env.TWO_FA_CODE_EXPIRY_MINUTES) || 5;
