// userType: 1 = admin, 2 = staff, 3 = doctor (doctor app), 4 = api user (public API createdBy only)
export const ALL_ROLES: Record<number, string[]> = {
    1: [ // admin
        "/users", "/accounts"
    ],
    2: [ // staff
        "/transect-results", "/welcome"
    ],
} as const

export const userTypes = {
    admin: 1,
    staff: 2,
    doctor: 3,
    apiUser: 4,
} as const

export const USER_TYPE_OPTIONS: { id: number; name: string }[] = [
    { id: userTypes.admin, name: "Admin" },
    { id: userTypes.staff, name: "Staff" },
    { id: userTypes.doctor, name: "Doctor" },
    { id: userTypes.apiUser, name: "API User" },
]

export function getUserTypeLabel(userType: number): string {
    return USER_TYPE_OPTIONS.find((o) => o.id === userType)?.name ?? String(userType)
}

/** Users that may sign in to the web dashboard (NextAuth). */
export function isDashboardLoginUserType(userType: number): boolean {
    return userType === userTypes.admin || userType === userTypes.staff
}

export const roleRights = new Map(Object.entries(ALL_ROLES));
