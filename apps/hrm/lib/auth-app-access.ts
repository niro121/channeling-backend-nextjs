import { AUTH_APPS, assertAuthAppAccess, canAccessAuthApp } from '@archmage/shared';
import type { AuthAppAccessUser } from '@archmage/shared';

export function canAccessHrmApp(user: AuthAppAccessUser): boolean {
  return canAccessAuthApp(user, AUTH_APPS.hrm);
}

export function assertHrmAppAccess(user: AuthAppAccessUser): void {
  assertAuthAppAccess(user, AUTH_APPS.hrm);
}
