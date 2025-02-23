import NextAuth, { DefaultSession, DefaultProfile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { connectRedis } from '@/app/utils/user-registration/redis';
import jwt from 'jsonwebtoken';
import pino from 'pino';

// Extend NextAuth types for custom properties
declare module 'next-auth' {
  interface Session extends DefaultSession {
    jwt?: string;
  }

  interface Profile extends DefaultProfile {
    id?: string;
  }
}

// Type declarations for next-auth providers (simplified)
declare module 'next-auth/providers/google' {
  const GoogleProvider: any;
  export default GoogleProvider;
}

declare module 'next-auth/providers/facebook' {
  const FacebookProvider: any;
  export default FacebookProvider;
}

declare module 'next-auth/react' {
  export * from 'next-auth/react';
}

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
      clientSecret: process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: { token: any; account: any; profile: any }) {
      if (account) {
        token.provider = account.provider;
        token.id = profile?.sub || profile?.id || '';
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token.provider && token.id) {
        const redis = await connectRedis();
        const jwtToken = jwt.sign(
          { email: session.user?.email, provider: token.provider, userId: token.id },
          process.env.JWT_SECRET!,
          { expiresIn: '1h' }
        );
        session.jwt = jwtToken;
        await redis.setEx(`session:${session.user?.email}`, 3600, jwtToken); // 1-hour expiry
      }
      return session;
    },
  },
  secret: process.env.JWT_SECRET,
});

export { handler as GET, handler as POST };