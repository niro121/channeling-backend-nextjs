import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { userTypes, roleRights } from "@/lib/roles";
import { canAccessRoute, getResourceFromRoute } from "@/lib/permissions";

const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('NEXTAUTH_SECRET is required in production');
  return 'hrm-dev-secret';
};

const STATIC_PATHS = ['/favicon.ico', '/favicon', '/_next/static', '/_next/image'];
const STATIC_EXT = /\.(ico|png|jpg|jpeg|gif|svg|webp|woff2?|css|js)(\?.*)?$/i;

export default withAuth(
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

export const config = {
  matcher: ['/((?!login|api/|favicon|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|woff2?)$).*)'],
};
