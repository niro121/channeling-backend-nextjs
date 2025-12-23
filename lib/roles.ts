export const ALL_ROLES: Record<string, string[]> = {
    admin: [
        "/users", "/accounts"
    ],
    dataOfficer: [
        "/transect-results", "/welcome"
    ],
} as const

type RoleKey = keyof typeof ALL_ROLES


export const roles = Object.fromEntries(
    Object.keys(ALL_ROLES).map((key) => [key, key])
) as Record<RoleKey, RoleKey>;

export const roleRights = new Map(Object.entries(ALL_ROLES));
