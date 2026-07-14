import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.userId ?? token.sub
      return session
    },
  },
}
