import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const diagrams = await prisma.diagram.findMany({
      where: {
        OR: [{ ownerId: userId }, { isPublic: true }],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json(diagrams);
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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ownerId, ...data } = body;
    const diagram = await prisma.diagram.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });
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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("DELETE request body:", body); // Debug log

    // Opción 1: Si tu modelo tiene un campo 'id', usa esto:
    if (body.id) {
      const existingDiagram = await prisma.diagram.findFirst({
        where: { id: body.id, ownerId: userId },
      });

      if (!existingDiagram) {
        return NextResponse.json(
          { error: "Diagram not found" },
          { status: 404 }
        );
      }

      await prisma.diagram.deleteMany({
        where: { id: existingDiagram.id, ownerId: userId },
      });
      return NextResponse.json(existingDiagram);
    }

    // Opción 2: Si 'name' es único, primero busca el nodo y luego elimínalo
    if (body.name) {
      // Primero verificar si el nodo existe
      const existingDiagram = await prisma.diagram.findFirst({
        where: { name: body.name, ownerId: userId },
      });

      if (!existingDiagram) {
        console.error("Diagram not found with name:", body.name);
        return NextResponse.json(
          { error: "Diagram not found" },
          { status: 404 }
        );
      }

      // Eliminar usando el id del diagram encontrado
      await prisma.diagram.deleteMany({
        where: { id: existingDiagram.id, ownerId: userId },
      });

      console.log("Diagram deleted successfully:", existingDiagram);
      return NextResponse.json(existingDiagram);
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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing diagram identifier" },
        { status: 400 }
      );
    }

    const updateResult = await prisma.diagram.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json(
        { error: "Diagram not found" },
        { status: 404 }
      );
    }

    const diagram = await prisma.diagram.findUnique({ where: { id } });
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
