import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Prisma singleton (evita múltiples conexiones en dev)
const globalForPrisma = globalThis;
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  // ✅ Usa SOLO una estrategia. Aquí JWT:
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Debes proporcionar un correo y una contraseña.");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          throw new Error(
            "No se encontró una cuenta con ese correo electrónico."
          );
        }
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) {
          throw new Error("La contraseña es incorrecta.");
        }
        // Devuelve lo que quieras que viva en el JWT
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ?? "user",
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    // Mete el role (y lo que necesites) en el token una sola vez
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? "user";
      }
      return token;
    },
    // Propaga del token a la session (lado cliente)
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.role = token.role ?? "user";
      }
      return session;
    },
  },

  pages: {
    // Ajusta si tu formulario real vive en /login
    signIn: "/",
  },

  secret: process.env.AUTH_SECRET, // En Auth.js v5 es AUTH_SECRET (ok). Si usas NextAuth v4 sería NEXTAUTH_SECRET.
};

// Exports para App Router /app/api/auth/[...nextauth]/route.js
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export const { auth, signIn, signOut } = handler;
