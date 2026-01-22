import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { userTypes, roleRights } from "@/lib/roles";
import { canAccessRoute, getResourceFromRoute } from "@/lib/permissions";

// Ensure NEXTAUTH_SECRET is set for middleware
const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  // Only require secret in production, allow fallback for development and build time
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET environment variable is required in production');
  }
  console.warn('⚠️  NEXTAUTH_SECRET is not set. Using development secret. Please set NEXTAUTH_SECRET in production!');
  return 'development-secret-key-change-in-production';
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
    const permissions = token.permissions;

    // Admin (userType 1) has access to all routes
    if (userType === userTypes.admin) {
      return NextResponse.next();
    }

    // Check permissions if user has a user group
    if (permissions) {
      const resource = getResourceFromRoute(currentPath);
      
      // If route is mapped to a resource, check view permission
      if (resource) {
        const hasAccess = canAccessRoute(permissions, currentPath);
        if (hasAccess) {
          return NextResponse.next();
        }
      } else {
        // Route not mapped (like /welcome, /profile), allow access
        return NextResponse.next();
      }
    } else {
      // Fallback to old role-based system if no permissions
      const allowedRoutes = roleRights.get(userType.toString());
      if (allowedRoutes && allowedRoutes.some(route => currentPath.startsWith(route))) {
        return NextResponse.next();
      }
    }

    return NextResponse.rewrite(new URL("/unauthorized-access", request.url));
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