import { DefaultSession, DefaultUser, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Permissions } from "@/types/user-group";

declare module "next-auth" {
    interface Session {
        user?: {
            id: string
            userType: number // 1 = admin, 2 = staff
            permissions?: Permissions | null
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        userType: number; // 1 = admin, 2 = staff
        permissions?: Permissions | null
    }
}

declare module "next-auth/jwt" {
    interface JWT extends JWT {
        id: string
        userType: number; // 1 = admin, 2 = staff
        permissions?: Permissions | null
    }
}