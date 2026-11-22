import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      userType: number;
      userLocationId?: string | null;
      locationCode?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    userType: number;
    userLocationId?: string | null;
    locationCode?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: number;
    userLocationId?: string | null;
    locationCode?: string | null;
  }
}
