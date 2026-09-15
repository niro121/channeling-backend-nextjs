/** App identifiers for UserGroup.app in @archmage/db-auth. */
import { userTypes } from "./roles";

export const AUTH_APPS = {
  hrm: "hrm",
  dpay: "dpay",
  channeling: "channeling",
} as const;

export type AuthApp = (typeof AUTH_APPS)[keyof typeof AUTH_APPS];

export const AUTH_APP_OPTIONS: { id: AuthApp; name: string }[] = [
  { id: AUTH_APPS.hrm, name: "HRM" },
  { id: AUTH_APPS.dpay, name: "DPAY" },
  { id: AUTH_APPS.channeling, name: "Channeling" },
];

export function isAuthApp(value: string | null | undefined): value is AuthApp {
  if (value == null) return false;
  return (Object.values(AUTH_APPS) as string[]).includes(value);
}

/** Minimal user shape for dashboard app login gates. */
export type AuthAppAccessUser = {
  userType: number;
  userGroup?: { app?: string | null } | null;
};

/**
 * Whether a user may sign in to a dashboard app.
 * Admins bypass; staff must belong to a group scoped to the target app.
 */
export function canAccessAuthApp(user: AuthAppAccessUser, app: AuthApp): boolean {
  if (user.userType === userTypes.admin) return true;
  return user.userGroup?.app === app;
}

/** Generic login error — do not reveal app mismatch to the client. */
export const AUTH_APP_ACCESS_DENIED_MESSAGE = "Invalid credentials";

export function assertAuthAppAccess(user: AuthAppAccessUser, app: AuthApp): void {
  if (!canAccessAuthApp(user, app)) {
    throw new Error(AUTH_APP_ACCESS_DENIED_MESSAGE);
  }
}
