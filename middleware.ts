import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { userTypes, roleRights } from "@/lib/roles";

// Ensure NEXTAUTH_SECRET is set for middleware
const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  NEXTAUTH_SECRET is not set. Using development secret. Please set NEXTAUTH_SECRET in production!');
    return 'development-secret-key-change-in-production';
  }
  throw new Error('NEXTAUTH_SECRET environment variable is required in production');
};

export default withAuth(
  function middleware(request) {
    const token = request.nextauth.token;
    const currentPath = request.nextUrl.pathname;

    if (process.env.NODE_ENV === 'development') {
      console.log('auth-pathname:', currentPath);
      console.log('auth-token userType:', token?.userType);
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userType = token.userType;

    // Admin (userType 1) has access to all routes
    if (userType === userTypes.admin) {
      return NextResponse.next();
    }

    // Check allowed routes for the user type
    const allowedRoutes = roleRights.get(userType);

    if (allowedRoutes && allowedRoutes.some(route => currentPath.startsWith(route))) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL("/unauthorized", request.url));
  },
  {
    secret: getSecret(),
    pages: {
      signIn: "/login",
    },
  }
);


// Don't invoke Middleware on some paths
export const config = {
  matcher: '/((?!login|forgot-password|check-email|register|api/*).*)'
}