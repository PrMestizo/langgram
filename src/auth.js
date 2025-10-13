//En este archivo definiremos las opciones de NextAuth,
//incluyendo los proveedores de autenticación, el adaptador de Prisma,
//las páginas personalizadas, y callbacks para gestionar JWT y sesiones.

// auth.js - Configuración de NextAuth (Auth.js)
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/app/lib/db";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma), // Conecta NextAuth con la base de datos Prisma:contentReference[oaicite:5]{index=5}
  providers: [
    // Proveedor de credenciales (email y contraseña)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        // 1. Buscar usuario por email en la base de datos
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null; // Usuario no existe o no tiene contraseña
        // 2. Verificar la contraseña hashed almacenada usando bcrypt
        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordValid) return null; // Contraseña incorrecta
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
    signIn: "/login", // Página de inicio de sesión personalizada (ruta en /app/login)
  },
  session: {
    strategy: "jwt", // Usar JWT para las sesiones (en lugar de sesiones en BD):contentReference[oaicite:7]{index=7}
  },
  callbacks: {
    // Incluir campo de rol en el JWT al iniciar sesión
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role; // Adjuntar el rol del usuario al token JWT:contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
      }
      return token;
    },
    // Exponer el rol en la sesión, disponible para el cliente
    async session({ session, token }) {
      if (session.user && token) {
        session.user.role = token.role; // Pasa el rol del JWT a la sesión activa:contentReference[oaicite:10]{index=10}:contentReference[oaicite:11]{index=11}
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET, // Secreto para firmar/encriptar los JWT
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
