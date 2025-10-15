// app/api/auth/register/route.js
import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
  const { name, email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos" },
      { status: 400 }
    );
  }
  const existe = await prisma.user.findUnique({ where: { email } });
  if (!existe) {
    return NextResponse.json(
      { error: "El usuario no existe" },
      { status: 400 }
    );
  }
  const passwordMatch = await bcrypt.compare(password, existe.password);
  
  if (!passwordMatch) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  // Aquí podrías generar un token JWT si estás usando autenticación basada en tokens
  // const token = generateJWT(existe.id);

  return NextResponse.json(
    { 
      message: "Inicio de sesión exitoso",
      user: {
        id: existe.id,
        name: existe.name,
        email: existe.email
      },
      // token: token // Si estás usando JWT
    },
    { status: 200 }
  );
}
