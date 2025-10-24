// app/api/auth/register/route.js
import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { validateRegisterUser } from "../../utils/schemas";
import { handleRouteError, parseJsonBody } from "../../utils/http";
import { HttpError } from "../../utils/errors";

export async function POST(request) {
  try {
    const { name, email, password } = await parseJsonBody(
      request,
      validateRegisterUser
    );

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpError(409, "El usuario ya existe");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name ?? null,
        email,
        password: hashedPassword,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: "Usuario registrado correctamente", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/auth/register",
      "No se pudo registrar al usuario"
    );
  }
}
