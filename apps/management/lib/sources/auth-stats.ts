import 'server-only';
import { authPrisma } from '@archmage/db-auth';
import { AUTH_APP_OPTIONS } from '@archmage/shared';
import { userTypes } from '@/lib/roles';

export type AuthStats = {
  activeUsers: number;
  admins: number;
  twoFactorEnabled: number;
  usersByApp: { app: string; label: string; users: number }[];
};

const ACTIVE = 1;
const UNASSIGNED = 'unassigned';

/** Platform-wide user statistics from the shared auth DB. */
export async function getAuthStats(): Promise<AuthStats> {
  const dashboardUser = { status: ACTIVE, userType: { in: [userTypes.admin, userTypes.staff] } };

  const [activeUsers, admins, twoFactorEnabled, groups] = await Promise.all([
    authPrisma.user.count({ where: dashboardUser }),
    authPrisma.user.count({ where: { status: ACTIVE, userType: userTypes.admin } }),
    authPrisma.user.count({ where: { ...dashboardUser, twoFactorEnabled: true } }),
    authPrisma.userGroup.findMany({
      where: { status: ACTIVE },
      select: { app: true, _count: { select: { users: { where: { status: ACTIVE } } } } }
    })
  ]);

  const countsByApp = new Map<string, number>();
  for (const group of groups) {
    const app = group.app ?? UNASSIGNED;
    countsByApp.set(app, (countsByApp.get(app) ?? 0) + group._count.users);
  }

  return {
    activeUsers,
    admins,
    twoFactorEnabled,
    usersByApp: [
      ...AUTH_APP_OPTIONS.map((option) => ({
        app: option.id,
        label: option.name,
        users: countsByApp.get(option.id) ?? 0
      })),
      // Legacy groups created before UserGroup.app existed
      { app: UNASSIGNED, label: 'Unassigned', users: countsByApp.get(UNASSIGNED) ?? 0 }
    ]
  };
}
