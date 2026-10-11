import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent } from "next/server";
import { userTypes, roleRights } from "@/lib/roles";
import { canAccessRoute, getResourceFromRoute } from "@/lib/permissions";

const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('NEXTAUTH_SECRET is required in production');
  return 'management-dev-secret';
};

const STATIC_PATHS = ['/favicon.ico', '/favicon', '/_next/static', '/_next/image'];
const STATIC_EXT = /\.(ico|png|jpg|jpeg|gif|svg|webp|woff2?|css|js)(\?.*)?$/i;

const authMiddleware = withAuth(
  function middleware(request) {
    const currentPath = request.nextUrl.pathname;
    if (STATIC_PATHS.some((p) => currentPath === p || currentPath.startsWith(p + '/'))) {
      return NextResponse.next();
    }
    if (STATIC_EXT.test(currentPath)) return NextResponse.next();

    const token = request.nextauth.token;
    if (!token) return NextResponse.redirect(new URL('/login', request.url));

    const userType = token.userType;
    const permissions = token.permissions;

    if (userType === userTypes.admin) return NextResponse.next();

    if (permissions) {
      const resource = getResourceFromRoute(currentPath);
      if (resource) {
        return canAccessRoute(permissions, currentPath)
          ? NextResponse.next()
          : NextResponse.rewrite(new URL('/unauthorized-access', request.url));
      }
      return NextResponse.next();
    }

    const allowedRoutes = roleRights.get(userType?.toString());
    if (allowedRoutes && allowedRoutes.some((route) => currentPath.startsWith(route))) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL('/unauthorized-access', request.url));
  },
  {
    secret: getSecret(),
    pages: { signIn: '/login' },
  }
);

// Paths that don't need a session (sign-in, intro, install page, PWA files, APIs).
const PUBLIC_PATH = /^\/(?:$|login|welcome|install|offline\.html|api\/|favicon|manifest\.webmanifest|sw\.js|_next\/static|_next\/image|.*\.(?:ico|png|jpg|jpeg|gif|svg|woff2?)$)/;

/**
 * People should only use the real domain (NEXTAUTH_URL). The herokuapp.com address works too, but
 * signing in there is a separate session and the PWA installs as a second app — so page visits
 * there are sent over (same as the KLV app). /api is left alone.
 */
function canonicalRedirect(request: NextRequestWithAuth): NextResponse | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const canonical = process.env.NEXTAUTH_URL;
  if (!canonical || !host.endsWith(".herokuapp.com")) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (request.nextUrl.pathname.startsWith("/api/")) return null;
  const url = new URL(canonical);
  url.pathname = request.nextUrl.pathname;
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

export default function middleware(request: NextRequestWithAuth, event: NextFetchEvent) {
  const redirect = canonicalRedirect(request);
  if (redirect) return redirect;
  if (PUBLIC_PATH.test(request.nextUrl.pathname)) return NextResponse.next();
  return authMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
