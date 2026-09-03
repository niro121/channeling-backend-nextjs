import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import * as argon2 from 'argon2';
import { Permissions } from '@/types/user-group';
import { verifyTotp } from '@/lib/helpers/2fa/totp';
import { isDashboardLoginUserType } from '@/lib/roles';
import { bumpSessionVersion, getUserSessionVersion } from '@/lib/auth-session-version';
import { logActivityNonBlocking } from '@/lib/activity-log';

// Ensure NEXTAUTH_SECRET is set
const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️  NEXTAUTH_SECRET is not set. Using development secret. Please set NEXTAUTH_SECRET in production!'
    );
    return 'development-secret-key-change-in-production';
  }
  throw new Error(
    'NEXTAUTH_SECRET environment variable is required in production'
  );
};

type AuthUserPayload = {
  id: string;
  userType: number;
  name: string;
  email: string;
  permissions: Permissions | null;
  sessionVersion: number;
};

async function finalizeSuccessfulLogin(user: {
  id: string;
  userType: number;
  name: string;
  email: string;
  permissions: Permissions | null;
}): Promise<AuthUserPayload> {
  const sessionVersion = await bumpSessionVersion(user.id);
  return { ...user, sessionVersion };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 1 * 60 * 60
  },
  logger: {
    error(code, metadata) {
      // Don't log JWT decryption errors from stale/invalid cookies (e.g. after NEXTAUTH_SECRET change).
      if (
        code === 'JWT_SESSION_ERROR' &&
        metadata?.message === 'decryption operation failed'
      )
        return;
      console.error('[next-auth][error]', code, metadata);
    }
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'username' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: {
          label: '2FA Code',
          type: 'text',
          placeholder: '000000'
        },
        twoFactorToken: { label: '2FA Token', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error('Credentials are mandatory');
          }

          const loginIdentifier = credentials.username.trim();
          const userWhere = {
            OR: [
              { email: loginIdentifier },
              { username: loginIdentifier }
            ],
            status: 1
          };

          const has2FACode =
            typeof credentials.twoFactorCode === 'string' &&
            credentials.twoFactorCode.trim().length > 0;
          const twoFactorToken =
            typeof credentials.twoFactorToken === 'string'
              ? credentials.twoFactorToken.trim()
              : null;

          // --- Step 2: Verify 2FA and sign in ---
          if (has2FACode) {
            // AUTH-APP uses a long hex token; SMS/EMAIL store a 6-digit code in twoFactorTempCode.
            // Only use AUTH-APP branch when token looks like a real token (not a 6-digit code).
            const isAuthAppToken =
              typeof twoFactorToken === 'string' &&
              twoFactorToken.length > 10 &&
              !/^\d{6}$/.test(twoFactorToken);
            if (isAuthAppToken) {
              // AUTH-APP: find user by pending token
              const user = await prisma.user.findFirst({
                where: {
                  twoFactorTempCode: twoFactorToken,
                  twoFactorExpires: { gt: new Date() },
                  status: 1
                },
                include: { userGroup: true }
              });
              if (!user) {
                throw new Error('Invalid or expired 2FA. Please try again.');
              }
              if (!isDashboardLoginUserType(user.userType)) {
                throw new Error('Invalid credentials');
              }
              const totpSecret =
                user.twoFactorSecret ??
                user.twoFactorPendingSecret ??
                process.env.TOTP_SECRET;
              if (!totpSecret) {
                throw new Error('Invalid or expired 2FA. Please try again.');
              }
              const valid = await verifyTotp(
                credentials.twoFactorCode,
                totpSecret
              );
              if (!valid) {
                throw new Error('Invalid 2FA code.');
              }
              const usedPendingSecret = Boolean(user.twoFactorPendingSecret);
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  twoFactorTempCode: null,
                  twoFactorExpires: null,
                  ...(usedPendingSecret
                    ? {
                        twoFactorSecret: user.twoFactorPendingSecret,
                        twoFactorPendingSecret: null
                      }
                    : {})
                }
              });
              const permissions = user.userGroup?.permissions
                ? (user.userGroup.permissions as Permissions)
                : null;
              return finalizeSuccessfulLogin({
                id: user.id,
                userType: user.userType,
                name: user.name,
                email: user.email,
                permissions
              });
            }

            // SMS/EMAIL: find by email or username + password, then verify stored code
            const user = await prisma.user.findFirst({
              where: userWhere,
              include: { userGroup: true }
            });
            if (!user || !user.password) {
              throw new Error('Invalid credentials');
            }
            const isCorrectPassword = await argon2.verify(
              user.password,
              credentials.password
            );
            if (!isCorrectPassword) {
              throw new Error('Invalid credentials');
            }
            if (!isDashboardLoginUserType(user.userType)) {
              throw new Error('Invalid credentials');
            }
            if (!user.twoFactorExpires || user.twoFactorExpires < new Date()) {
              throw new Error('2FA code expired. Please log in again.');
            }
            // Compare as strings (DB may return number for twoFactorTempCode in some drivers)
            const storedCode = user.twoFactorTempCode != null ? String(user.twoFactorTempCode) : '';
            const enteredCode = credentials.twoFactorCode.trim();
            if (storedCode !== enteredCode) {
              throw new Error('Invalid 2FA code.');
            }
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorTempCode: null, twoFactorExpires: null }
            });
            const permissions = user.userGroup?.permissions
              ? (user.userGroup.permissions as Permissions)
              : null;
            return finalizeSuccessfulLogin({
              id: user.id,
              userType: user.userType,
              name: user.name,
              email: user.email,
              permissions
            });
          }

          // --- Step 1: Validate password, then require 2FA or return user ---
          const user = await prisma.user.findFirst({
            where: userWhere,
            include: { userGroup: true }
          });

          if (!user || !user.password) {
            throw new Error('Invalid credentials');
          }

          const isCorrectPassword = await argon2.verify(
            user.password,
            credentials.password
          );
          if (!isCorrectPassword) {
            throw new Error('Invalid credentials');
          }

          if (!isDashboardLoginUserType(user.userType)) {
            throw new Error('Invalid credentials');
          }

          if (user.mustChangePassword === true) {
            return null;
          }

          const group = user.userGroup;
          // 2FA required only when BOTH user enabled it in Settings AND group allows 2FA
          const groupAllows2FA = group == null || group.twoFactorEnabled === true;
          const userRequires2FA = user.twoFactorEnabled === true && groupAllows2FA;

          if (userRequires2FA) {
            return null;
          }

          let permissions = null;
          if (group?.permissions) {
            permissions = group.permissions as Permissions;
          }
          return finalizeSuccessfulLogin({
            id: user.id,
            userType: user.userType,
            name: user.name,
            email: user.email,
            permissions
          });
        } catch (error: any) {
          console.log('auth error', error);
          if (
            error?.message?.includes('database name') ||
            error?.message?.includes('AtlasError')
          ) {
            throw new Error(
              'Database configuration error: Please check your MONGODB_URI includes a database name'
            );
          }
          // Surface real auth failures (e.g. invalid 2FA) instead of a silent null.
          if (typeof error?.message === 'string' && error.message.length > 0) {
            throw error;
          }
        }
        return null;
      }
    })
  ],
  secret: getSecret(),
  pages: {
    signIn: '/login'
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      logActivityNonBlocking({
        userId: user.id,
        action: 'auth.login',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: user.email ?? null,
          name: user.name ?? null
        },
        importance: 'high'
      });
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && token) {
        token.id = user.id;
        token.userType = user.userType;
        token.permissions = user.permissions || null;
        token.email = (user as { email?: string }).email ?? null;
        // Prefer authorize payload; fall back to DB (NextAuth may omit custom user fields).
        let version = user.sessionVersion;
        if (version == null && user.id) {
          const dbUser = await getUserSessionVersion(user.id);
          version = dbUser?.sessionVersion ?? 0;
        }
        token.sessionVersion = version ?? 0;
        delete token.error;
        return token;
      }

      if (!token?.id) return token;

      // Already marked invalid — keep flag so middleware can show the block screen.
      if (token.error === 'SessionInvalidated') return token;

      try {
        const dbUser = await getUserSessionVersion(token.id as string);
        if (
          !dbUser ||
          dbUser.status !== 1 ||
          dbUser.sessionVersion !== (token.sessionVersion ?? 0)
        ) {
          return { ...token, error: 'SessionInvalidated' as const };
        }
      } catch (err) {
        console.error('[auth] sessionVersion check failed:', err);
      }

      return token;
    },

    async session({ session, token }) {
      if (token?.error === 'SessionInvalidated') {
        session.error = 'SessionInvalidated';
        // Clear user so server actions treat this as unauthenticated until they hit /session-ended.
        delete (session as { user?: unknown }).user;
        return session;
      }
      if (session?.user) {
        session.user.id = token.id;
        session.user.userType = token.userType;
        session.user.permissions = token.permissions || null;
        session.user.email = (token.email as string) ?? undefined;
      }
      return session;
    }
  }
};
