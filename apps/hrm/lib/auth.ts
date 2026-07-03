import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authPrisma } from '@archmage/db-auth';
import * as argon2 from 'argon2';
import { Permissions } from '@archmage/shared';
import { verifyTotp } from '@/lib/helpers/2fa/totp';
import { isDashboardLoginUserType } from '@/lib/roles';

const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === 'development') return 'hrm-dev-secret';
  throw new Error('NEXTAUTH_SECRET is required in production');
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 1 * 60 * 60
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' },
        twoFactorToken: { label: '2FA Token', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error('Credentials are mandatory');
          }

          const loginIdentifier = credentials.username.trim();
          const userWhere = {
            OR: [{ email: loginIdentifier }, { username: loginIdentifier }],
            status: 1
          };

          const has2FACode =
            typeof credentials.twoFactorCode === 'string' &&
            credentials.twoFactorCode.trim().length > 0;
          const twoFactorToken =
            typeof credentials.twoFactorToken === 'string'
              ? credentials.twoFactorToken.trim()
              : null;

          if (has2FACode) {
            const isAuthAppToken =
              typeof twoFactorToken === 'string' &&
              twoFactorToken.length > 10 &&
              !/^\d{6}$/.test(twoFactorToken);

            if (isAuthAppToken) {
              const user = await authPrisma.user.findFirst({
                where: {
                  twoFactorTempCode: twoFactorToken,
                  twoFactorExpires: { gt: new Date() },
                  status: 1
                },
                include: { userGroup: true }
              });
              if (!user) throw new Error('Invalid or expired 2FA. Please try again.');
              if (!isDashboardLoginUserType(user.userType)) throw new Error('Invalid credentials');

              const totpSecret = user.twoFactorSecret ?? user.twoFactorPendingSecret ?? process.env.TOTP_SECRET;
              if (!totpSecret) throw new Error('Invalid or expired 2FA. Please try again.');

              const valid = await verifyTotp(credentials.twoFactorCode, totpSecret);
              if (!valid) throw new Error('Invalid 2FA code.');

              const usedPendingSecret = Boolean(user.twoFactorPendingSecret);
              await authPrisma.user.update({
                where: { id: user.id },
                data: {
                  twoFactorTempCode: null,
                  twoFactorExpires: null,
                  ...(usedPendingSecret
                    ? { twoFactorSecret: user.twoFactorPendingSecret, twoFactorPendingSecret: null }
                    : {})
                }
              });

              return {
                id: user.id,
                userType: user.userType,
                name: user.name,
                email: user.email,
                permissions: user.userGroup?.permissions as Permissions ?? null
              };
            }

            // SMS/EMAIL 2FA
            const user = await authPrisma.user.findFirst({ where: userWhere, include: { userGroup: true } });
            if (!user?.password) throw new Error('Invalid credentials');
            if (!await argon2.verify(user.password, credentials.password)) throw new Error('Invalid credentials');
            if (!isDashboardLoginUserType(user.userType)) throw new Error('Invalid credentials');
            if (!user.twoFactorExpires || user.twoFactorExpires < new Date()) throw new Error('2FA code expired.');

            const storedCode = user.twoFactorTempCode != null ? String(user.twoFactorTempCode) : '';
            if (storedCode !== credentials.twoFactorCode.trim()) throw new Error('Invalid 2FA code.');

            await authPrisma.user.update({
              where: { id: user.id },
              data: { twoFactorTempCode: null, twoFactorExpires: null }
            });

            return {
              id: user.id,
              userType: user.userType,
              name: user.name,
              email: user.email,
              permissions: user.userGroup?.permissions as Permissions ?? null
            };
          }

          // Password-only login
          const user = await authPrisma.user.findFirst({ where: userWhere, include: { userGroup: true } });
          if (!user?.password) throw new Error('Invalid credentials');
          if (!await argon2.verify(user.password, credentials.password)) throw new Error('Invalid credentials');
          if (!isDashboardLoginUserType(user.userType)) throw new Error('Invalid credentials');
          if (user.mustChangePassword) return null;

          const group = user.userGroup;
          const groupAllows2FA = group == null || group.twoFactorEnabled === true;
          if (user.twoFactorEnabled && groupAllows2FA) return null;

          return {
            id: user.id,
            userType: user.userType,
            name: user.name,
            email: user.email,
            permissions: group?.permissions as Permissions ?? null
          };
        } catch (error: any) {
          console.error('[hrm auth]', error);
        }
        return null;
      }
    })
  ],
  secret: getSecret(),
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userType = user.userType;
        token.permissions = user.permissions ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.userType = token.userType;
        session.user.permissions = token.permissions ?? null;
      }
      return session;
    }
  }
};
