import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET() {
  try {
    console.log("Prisma client initialized:", !!prisma);
    const models = Object.keys(prisma).filter(
      (key) => typeof prisma[key]?.findMany === "function"
    );
    console.log("Available models:", models);

    const diagram = await prisma.diagram.findMany();
    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Error in /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch diagrams",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const diagram = await prisma.diagram.create({ data: body });
    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Error in /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create diagram",
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
      const diagram = await prisma.diagram.delete({
        where: { id: body.id },
      });
      return NextResponse.json(diagram);
    }

    // Opción 2: Si 'name' es único, primero busca el nodo y luego elimínalo
    if (body.name) {
      // Primero verificar si el nodo existe
      const existingDiagram = await prisma.diagram.findFirst({
        where: { name: body.name },
      });

      if (!existingDiagram) {
        console.error("Diagram not found with name:", body.name);
        return NextResponse.json(
          { error: "Diagram not found" },
          { status: 404 }
        );
      }

      // Eliminar usando el id del diagram encontrado
      const deletedDiagram = await prisma.diagram.delete({
        where: { id: existingDiagram.id },
      });

      console.log("Diagram deleted successfully:", deletedDiagram);
      return NextResponse.json(deletedDiagram);
    }

    // Si no hay ni id ni name en el body
    return NextResponse.json(
      { error: "Missing identifier (id or name)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete diagram",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing diagram identifier" },
        { status: 400 }
      );
    }

    const diagram = await prisma.diagram.update({
      where: { id },
      data,
    });
    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Error in PUT /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update diagram",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
