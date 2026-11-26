import { AUTH_APPS, assertAuthAppAccess, canAccessAuthApp } from '@archmage/shared';
import type { AuthAppAccessUser } from '@archmage/shared';

export function canAccessDpayApp(user: AuthAppAccessUser): boolean {
  return canAccessAuthApp(user, AUTH_APPS.dpay);
}

export function assertDpayAppAccess(user: AuthAppAccessUser): void {
  assertAuthAppAccess(user, AUTH_APPS.dpay);
}
