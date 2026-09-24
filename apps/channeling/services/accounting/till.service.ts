'use server';

import prisma from '@/lib/prisma';
import { getOrCreateAccount } from './account/get-or-create.service';

export type ResolvedTill = {
  tillId: string;
  accountId: string;
  accountName: string | null;
  accountCode: string | null;
  locationId: string;
  locationName: string | null;
  locationCode: string | null;
};

type EnsureTillParams = {
  userId: string;
  locationId: string;
  isActive?: boolean;
};

export async function ensureTillForUserLocation(
  params: EnsureTillParams
): Promise<{ success: true; till: ResolvedTill } | { success: false; error: string }> {
  const { userId, locationId, isActive = true } = params;

  // Reuse any existing CASH account for this user+location before attempting creation.
  // This protects My Till load from legacy duplicate-code/account-creation collisions.
  const existingAccount = await prisma.account.findFirst({
    where: { type: 'CASH', userId, locationId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, isActive: true },
  });
  if (existingAccount && !existingAccount.isActive) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { isActive: true },
    });
  }

  const existing = await prisma.till.findFirst({
    where: existingAccount
      ? { accountId: existingAccount.id }
      : { userId, locationId, isActive: true },
    include: {
      account: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true } },
    },
  });
  if (existing) {
    if (!existing.isActive || existing.closedAt != null) {
      await prisma.till.update({
        where: { id: existing.id },
        data: { isActive: true, closedAt: null, userId, locationId },
      });
    }
    return {
      success: true,
      till: {
        tillId: existing.id,
        accountId: existing.account.id,
        accountName: existing.account.name ?? null,
        accountCode: existing.account.code ?? null,
        locationId: existing.location.id,
        locationName: existing.location.name ?? null,
        locationCode: existing.location.code ?? null,
      },
    };
  }

  if (existingAccount) {
    const createdFromExistingAccount = await prisma.till.create({
      data: {
        accountId: existingAccount.id,
        userId,
        locationId,
        isActive,
      },
      include: {
        account: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
      },
    });
    return {
      success: true,
      till: {
        tillId: createdFromExistingAccount.id,
        accountId: createdFromExistingAccount.account.id,
        accountName: createdFromExistingAccount.account.name ?? null,
        accountCode: createdFromExistingAccount.account.code ?? null,
        locationId: createdFromExistingAccount.location.id,
        locationName: createdFromExistingAccount.location.name ?? null,
        locationCode: createdFromExistingAccount.location.code ?? null,
      },
    };
  }

  const accountResult = await getOrCreateAccount({
    type: 'CASH',
    userId,
    locationId,
  });
  if (!accountResult.success) {
    return { success: false, error: accountResult.error };
  }

  const account = accountResult.account;
  const created = await prisma.till.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      userId,
      locationId,
      isActive,
    },
    update: {
      userId,
      locationId,
      isActive,
      closedAt: null,
    },
    include: {
      account: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true } },
    },
  });

  return {
    success: true,
    till: {
      tillId: created.id,
      accountId: created.account.id,
      accountName: created.account.name ?? null,
      accountCode: created.account.code ?? null,
      locationId: created.location.id,
      locationName: created.location.name ?? null,
      locationCode: created.location.code ?? null,
    },
  };
}

export async function resolveActiveTillForUserLocation(userId: string): Promise<ResolvedTill | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userLocationId: true },
  });
  if (!user?.userLocationId) return null;

  const ensured = await ensureTillForUserLocation({ userId, locationId: user.userLocationId, isActive: true });
  if (!ensured.success) throw new Error(ensured.error);
  return ensured.till;
}

export async function resolveTillForUserAndLocation(
  userId: string,
  locationId: string
): Promise<ResolvedTill> {
  const ensured = await ensureTillForUserLocation({ userId, locationId, isActive: true });
  if (!ensured.success) throw new Error(ensured.error);
  return ensured.till;
}

export async function listTillsForUser(userId: string): Promise<
  Array<ResolvedTill & { isActive: boolean }>
> {
  const tills = await prisma.till.findMany({
    where: { userId, isActive: true },
    include: {
      account: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ location: { name: 'asc' } }, { createdAt: 'asc' }],
  });
  return tills.map((till) => ({
    tillId: till.id,
    accountId: till.account.id,
    accountName: till.account.name ?? null,
    accountCode: till.account.code ?? null,
    locationId: till.location.id,
    locationName: till.location.name ?? null,
    locationCode: till.location.code ?? null,
    isActive: till.isActive,
  }));
}
