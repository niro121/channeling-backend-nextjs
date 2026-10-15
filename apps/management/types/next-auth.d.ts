import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Permissions } from "@archmage/shared";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      userType: number;
      permissions?: Permissions | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    userType: number;
    permissions?: Permissions | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: number;
    permissions?: Permissions | null;
  }
}
