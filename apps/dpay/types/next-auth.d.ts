import { DefaultSession } from "next-auth";
import { Permissions } from "@archmage/shared";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      userType: number;
      permissions?: Permissions | null;
      userLocationId?: string | null;
      locationCode?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    userType: number;
    permissions?: Permissions | null;
    userLocationId?: string | null;
    locationCode?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: number;
    permissions?: Permissions | null;
    userLocationId?: string | null;
    locationCode?: string | null;
  }
}
