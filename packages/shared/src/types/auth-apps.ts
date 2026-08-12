/** App identifiers for UserGroup.app in @archmage/db-auth. */
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
