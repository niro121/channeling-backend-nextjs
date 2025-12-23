import { NextAuthOptions } from "next-auth"
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from "./prisma";
import * as argon2 from "argon2";

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
              }

            })

            if (!user || !user?.password) {
              throw new Error("Invalid credentials");
            }

            const isCorrectPassword = await argon2.verify(user.password, credentials?.password);

            if (!isCorrectPassword) {
              throw new Error("Invalid credentials");
            }

            return {
              id: user.id,
              role: user.role,
              name: user.name
            };
          }

        } catch (error) {
          console.log('auth error', error);
        }
        return null

      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || 'default_secret',
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && token) {
        token.id = user.id
        token.role = user.role
      }
      // console.log('TOKEN ====>',token);

      return token
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      // console.log('SESSION ====>',session);
      return session
    }
  }
}