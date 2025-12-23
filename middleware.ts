import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { roles, roleRights } from "@/lib/roles";

export default withAuth(
  function middleware(request) {
    const token = request.nextauth.token;
    const currentPath = request.nextUrl.pathname;

    if (process.env.NODE_ENV === 'development') {
      console.log('auth-pathname:', currentPath);
      console.log('auth-token role:', token?.role);
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = token.role;

    if (role === roles.admin || role === roles.user) {
      return NextResponse.next();
    }

    const allowedRoutes = roleRights.get(role);

    if (allowedRoutes && allowedRoutes.some(route => currentPath.startsWith(route))) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL("/unauthorized", request.url));
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: "/login",
    },
  }
);


// Don't invoke Middleware on some paths
export const config = {
  matcher: '/((?!login|forgot-password|check-email|register|api/*).*)'
}