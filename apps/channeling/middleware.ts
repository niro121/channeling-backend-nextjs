import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent } from "next/server";
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

const STATIC_PATHS = ['/favicon.ico', '/favicon', '/_next/static', '/_next/image', '/sw-shift-bills.js', '/shift-bills.webmanifest'];
const STATIC_EXT = /\.(ico|png|jpg|jpeg|gif|svg|webp|woff2?|css|webmanifest)(\?.*)?$/i;

const authMiddleware = withAuth(
  function middleware(request) {
    const currentPath = request.nextUrl.pathname;
    // Skip auth for static assets (favicon, _next, and common file extensions)
    if (STATIC_PATHS.some((p) => currentPath === p || currentPath.startsWith(p + '/'))) {
      return NextResponse.next();
    }
    if (STATIC_EXT.test(currentPath)) {
      return NextResponse.next();
    }

    const token = request.nextauth.token;

    if (process.env.NODE_ENV === 'development') {
      console.log('auth-pathname:', currentPath);
      console.log('auth-token userType:', token?.userType);
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Previous login superseded by a newer sign-in elsewhere.
    if (token.error === 'SessionInvalidated') {
      if (currentPath !== '/session-ended') {
        return NextResponse.redirect(new URL('/session-ended', request.url));
      }
      return NextResponse.next();
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
    callbacks: {
      authorized: ({ token }) => {
        // Keep invalidated sessions authorized so middleware can show /session-ended.
        if (token?.error === 'SessionInvalidated') return true;
        return !!token;
      },
    },
  }
);


/**
 * Paths the auth middleware skips. This used to be the `matcher`; it moved here so the
 * API_ONLY gate below can also see /api and /login (the matcher now covers everything).
 */
const AUTH_SKIP = /^\/(?:login|forgot-password|check-email|register|api\/|uat|favicon|_next\/static|_next\/image|sw-shift-bills\.js|shift-bills\.webmanifest|.*\.(?:ico|png|jpg|jpeg|gif|svg|woff2?|webmanifest)$)/;
const AUTH_ALSO = /^\/api\/doctors(?:\/|$)/;

/**
 * API_ONLY=true (the api.ruhunuhospital.lk instance): only the management and public APIs
 * are served; every page and other API returns 404, so staff can't use a second copy of the app.
 */
const API_ONLY_ALLOWED = /^\/api\/(?:management|public)(?:\/|$)/;

export default function middleware(request: NextRequestWithAuth, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;

  if (process.env.API_ONLY === "true") {
    if (API_ONLY_ALLOWED.test(path) || path.startsWith("/_next/")) return NextResponse.next();
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (AUTH_SKIP.test(path) && !AUTH_ALSO.test(path)) return NextResponse.next();
  return authMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
