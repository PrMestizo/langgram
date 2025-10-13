// app/api/auth/register/route.js
import { prisma } from "@/lib/prisma";
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
  // ¿Ya existe un usuario con ese email?
  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) {
    return NextResponse.json(
      { error: "El usuario ya existe" },
      { status: 400 }
    );
  }
  // Hashear la contraseña antes de guardarla
  const hashedPassword = await bcrypt.hash(password, 10); // 10 rondas de sal (salt)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      // 'role' se establecerá automáticamente a "user" por el default del esquema
    },
  });
  return NextResponse.json(
    { message: "Usuario registrado correctamente", userId: user.id },
    { status: 201 }
  );
}
