// userType: 1 = admin, 2 = staff, 3 = doctor (doctor mobile app; no dashboard routes here)
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
} as const;

export const roleRights = new Map(Object.entries(ALL_ROLES));
