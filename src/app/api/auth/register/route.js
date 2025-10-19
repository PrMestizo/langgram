// app/api/auth/register/route.js
import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { registerUser } from "./registerUser.mjs";

export async function POST(request) {
  const payload = await request.json();
  const result = await registerUser(payload, { prisma, bcrypt });
  return NextResponse.json(result.body, { status: result.status });
}
