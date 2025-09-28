import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET → listar diagramas
export async function GET() {
  const diagrams = await prisma.diagram.findMany();
  return NextResponse.json(diagrams);
}

// POST → guardar diagrama
export async function POST(req) {
  const { name, graph } = await req.json();
  const diagram = await prisma.diagram.upsert({
    where: { name },
    update: { graph },
    create: { name, graph },
  });
  return NextResponse.json(diagram);
}

// DELETE → eliminar diagrama
export async function DELETE(req) {
  const { name } = await req.json();
  await prisma.diagram.delete({ where: { name } });
  return NextResponse.json({ success: true });
}
