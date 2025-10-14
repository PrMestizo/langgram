import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Using JWT strategy instead of database for better performance
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session?.user) {
        session.user.id = token?.sub || user?.id;
        session.user.role = token?.role || user?.role || "user";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
  providers: [
    // Proveedor de credenciales (email y contraseña)
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
        // 1. Buscar usuario por email en la base de datos
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          throw new Error(
            "No se encontró una cuenta con ese correo electrónico."
          );
        }
        // 2. Verificar la contraseña hashed almacenada usando bcrypt
        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordValid) {
          throw new Error("La contraseña es incorrecta.");
        }
        // 3. Retornar objeto de usuario si credenciales válidas (NextAuth genera la sesión JWT)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // Proveedor OAuth2 de Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/", // Página de inicio de sesión personalizada (ruta en /app/login)
  },
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        if (user?.role) {
          session.user.role = user.role;
        } else if (session.user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true },
          });
          session.user.role = dbUser?.role ?? session.user.role;
        }
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
const { auth, signIn, signOut } = handler;

export { handler as GET, handler as POST, auth, signIn, signOut, authOptions };
