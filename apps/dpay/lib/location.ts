import { authPrisma } from '@archmage/db-auth';
import { getChannelingPrisma } from '@/lib/channeling-prisma';

/**
 * Branch for DPAY receipt numbering.
 * Primary source: Channeling User Location (same field set in Channeling Users UI).
 * Fallback: auth User.userLocationId + locationCode if present.
 */
export type DpayLocationConfig = {
  locationId: string;
  locationCode: string;
  locationName: string;
};

async function getLocationFromChanneling(email: string, username?: string | null) {
  const prisma = getChannelingPrisma();
  const or: Array<{ email?: string; username?: string }> = [{ email }];
  if (username?.trim()) {
    or.push({ username: username.trim() });
  }

  const channelingUser = await prisma.user.findFirst({
    where: {
      status: 1,
      OR: or,
    },
    select: {
      userLocationId: true,
      userLocation: { select: { id: true, code: true, name: true } },
    },
  });

  const locationId =
    channelingUser?.userLocationId?.trim() ||
    channelingUser?.userLocation?.id?.trim() ||
    '';
  const locationCode = channelingUser?.userLocation?.code?.trim() || '';
  const locationName = channelingUser?.userLocation?.name?.trim() || '';

  if (!locationId || !locationCode) {
    return null;
  }

  return {
    locationId,
    locationCode,
    locationName: locationName || locationCode,
  };
}

export async function getUserLocationConfig(
  userId: string | null | undefined
): Promise<
  { success: true; data: DpayLocationConfig } | { success: false; message: string }
> {
  if (!userId?.trim()) {
    return {
      success: false,
      message: 'You must be signed in to generate a receipt number.',
    };
  }

  try {
    const authUser = await authPrisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        userLocationId: true,
        locationCode: true,
      },
    });

    if (!authUser) {
      return { success: false, message: 'Signed-in user was not found.' };
    }

    // 1) Channeling User Location (where "User Location" is managed in Channeling)
    if (process.env.CHANNELING_DATABASE_URL?.trim() && authUser.email) {
      try {
        const fromChanneling = await getLocationFromChanneling(
          authUser.email,
          authUser.username
        );
        if (fromChanneling) {
          return { success: true, data: fromChanneling };
        }
      } catch (error: unknown) {
        console.error('Channeling location lookup failed', error);
      }
    }

    // 2) Auth fallback (optional denormalized fields)
    const locationId = authUser.userLocationId?.trim() || '';
    const locationCode = authUser.locationCode?.trim() || '';
    if (locationId && locationCode) {
      return {
        success: true,
        data: { locationId, locationCode, locationName: locationCode },
      };
    }

    return {
      success: false,
      message:
        'No branch found for your account. Set User Location on your Channeling user (same email as DPAY login), and set CHANNELING_DATABASE_URL in DPAY .env.',
    };
  } catch (error: unknown) {
    console.error('getUserLocationConfig error', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to resolve user branch location',
    };
  }
}

/** One line for the receipt letterhead, from the Channeling location address. */
export function formatLocationAddress(input: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
}): string {
  const parts = [input.addressLine1, input.addressLine2, input.city]
    .map((value) => value?.trim() || '')
    .filter(Boolean);
  return [...new Set(parts)].join(', ');
}

export type LocationLetterhead = {
  /** Current Channeling location name. Empty when it cannot be read. */
  locationName: string;
  /** addressLine1, addressLine2, and city. Empty when it cannot be read. */
  addressLine: string;
};

/**
 * Name and address of the branch stored on the receipt (Channeling Location).
 * Read at print time, same as the channeling booking receipt. Does not update the receipt.
 */
export async function getLocationLetterhead(
  locationId: string | null | undefined
): Promise<LocationLetterhead> {
  const empty = { locationName: '', addressLine: '' };
  const id = locationId?.trim();
  if (!id || !process.env.CHANNELING_DATABASE_URL?.trim()) return empty;

  try {
    const prisma = getChannelingPrisma();
    const location = await prisma.location.findUnique({
      where: { id },
      select: { name: true, addressLine1: true, addressLine2: true, city: true },
    });
    if (!location) return empty;
    return {
      locationName: location.name?.trim() || '',
      addressLine: formatLocationAddress(location),
    };
  } catch (error: unknown) {
    console.error('getLocationLetterhead error', error);
    return empty;
  }
}

/**
 * Staff code for a receipt print line.
 * Channeling staff code for that login, then the Channeling or auth username.
 */
export async function resolveUserPrintCode(
  authUserId: string | null | undefined
): Promise<string> {
  const id = authUserId?.trim();
  if (!id) return '';

  try {
    const authUser = await authPrisma.user.findUnique({
      where: { id },
      select: { email: true, username: true },
    });
    if (!authUser) return '';

    if (process.env.CHANNELING_DATABASE_URL?.trim() && authUser.email) {
      const channeling = getChannelingPrisma();
      const user = await channeling.user.findFirst({
        where: { email: authUser.email, status: 1 },
        select: { username: true, staff: { select: { code: true } } },
      });
      const staffCode = user?.staff?.code?.trim();
      if (staffCode) return staffCode;
      const channelingUsername = user?.username?.trim();
      if (channelingUsername) return channelingUsername;
    }

    return authUser.username?.trim() || '';
  } catch (error: unknown) {
    console.error('resolveUserPrintCode error', error);
    return '';
  }
}

/** Display helper: "Ruhunu Hospital (RH)" */
export function formatIssuedLocation(input: {
  locationName?: string | null;
  locationCode?: string | null;
}): string {
  const name = input.locationName?.trim() || '';
  const code = input.locationCode?.trim() || '';
  if (name && code && name !== code) return `${name} (${code})`;
  return name || code || '—';
}
