import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET() {
  try {
    console.log("Prisma client initialized:", !!prisma);
    const models = Object.keys(prisma).filter(
      (key) => typeof prisma[key]?.findMany === "function"
    );
    console.log("Available models:", models);

    const edges = await prisma.edgeTemplate.findMany();
    return NextResponse.json(edges);
  } catch (error) {
    console.error("Error in /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch edges",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const edge = await prisma.edgeTemplate.create({ data: body });
    return NextResponse.json(edge);
  } catch (error) {
    console.error("Error in /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create edge",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    console.log("DELETE request body:", body); // Debug log

    // Opción 1: Si tu modelo tiene un campo 'id', usa esto:
    if (body.id) {
      const node = await prisma.edgeTemplate.delete({
        where: { id: body.id },
      });
      return NextResponse.json(node);
    }

    // Opción 2: Si 'name' es único, primero busca el edge y luego elimínalo
    if (body.name) {
      // Primero verificar si el edge existe
      const existingEdge = await prisma.edgeTemplate.findFirst({
        where: { name: body.name },
      });

      if (!existingEdge) {
        console.error("Edge not found with name:", body.name);
        return NextResponse.json({ error: "Edge not found" }, { status: 404 });
      }

      // Eliminar usando el id del edge encontrado
      const deletedEdge = await prisma.edgeTemplate.delete({
        where: { id: existingEdge.id },
      });

      console.log("Edge deleted successfully:", deletedEdge);
      return NextResponse.json(deletedEdge);
    }

    // Si no hay ni id ni name en el body
    return NextResponse.json(
      { error: "Missing identifier (id or name)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete edge",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
