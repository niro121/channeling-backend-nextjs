import { NextAuthOptions } from "next-auth"
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from "./prisma";
import * as argon2 from "argon2";
import { Permissions } from "@/types/user-group";

// Ensure NEXTAUTH_SECRET is set
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

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 1 * 60 * 60,

  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "text", placeholder: "username" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)

        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Credentials are mandatory");
          }

          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
          if (emailRegex.test(credentials.username)) {
            console.log('VALIDATING EMAIL ADDRESS');

            const user = await prisma.user.findFirst({
              where: {
                AND: [
                  {
                    email: credentials.username
                  },
                  {
                    status: 1
                  }
                ]
              },
              include: {
                userGroup: true
              }
            })

            if (!user || !user?.password) {
              throw new Error("Invalid credentials");
            }

            const isCorrectPassword = await argon2.verify(user.password, credentials?.password);

            if (!isCorrectPassword) {
              throw new Error("Invalid credentials");
            }

            // Load permissions from user group
            let permissions = null;
            if (user.userGroup && user.userGroup.permissions) {
              permissions = user.userGroup.permissions as Permissions;
            }

            return {
              id: user.id,
              userType: user.userType,
              name: user.name,
              permissions: permissions
            };
          }

        } catch (error: any) {
          console.log('auth error', error);
          // Re-throw database connection errors to help with debugging
          if (error?.message?.includes('database name') || error?.message?.includes('AtlasError')) {
            throw new Error("Database configuration error: Please check your MONGODB_URI includes a database name");
          }
        }
        return null

      }
    })
  ],
  secret: getSecret(),
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && token) {
        token.id = user.id
        token.userType = user.userType
        token.permissions = user.permissions || null
      }
      // console.log('TOKEN ====>',token);

      return token
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id
        session.user.userType = token.userType
        session.user.permissions = token.permissions || null
      }
      // console.log('SESSION ====>',session);
      return session
    }
  }
}