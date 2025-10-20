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

    const edges = await prisma.edgeTemplate.findMany({
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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ownerId, ...data } = body;
    const edge = await prisma.edgeTemplate.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });
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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("DELETE request body:", body); // Debug log

    // Opción 1: Si tu modelo tiene un campo 'id', usa esto:
    if (body.id) {
      const existingEdge = await prisma.edgeTemplate.findFirst({
        where: { id: body.id, ownerId: userId },
      });

      if (!existingEdge) {
        return NextResponse.json({ error: "Edge not found" }, { status: 404 });
      }

      await prisma.edgeTemplate.deleteMany({
        where: { id: existingEdge.id, ownerId: userId },
      });
      return NextResponse.json(existingEdge);
    }

    // Opción 2: Si 'name' es único, primero busca el edge y luego elimínalo
    if (body.name) {
      // Primero verificar si el edge existe
      const existingEdge = await prisma.edgeTemplate.findFirst({
        where: { name: body.name, ownerId: userId },
      });

      if (!existingEdge) {
        console.error("Edge not found with name:", body.name);
        return NextResponse.json({ error: "Edge not found" }, { status: 404 });
      }

      // Eliminar usando el id del edge encontrado
      await prisma.edgeTemplate.deleteMany({
        where: { id: existingEdge.id, ownerId: userId },
      });

      console.log("Edge deleted successfully:", existingEdge);
      return NextResponse.json(existingEdge);
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
        { error: "Missing edge identifier" },
        { status: 400 }
      );
    }

    const updateResult = await prisma.edgeTemplate.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    const edge = await prisma.edgeTemplate.findUnique({ where: { id } });
    return NextResponse.json(edge);
  } catch (error) {
    console.error("Error in PUT /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update edge",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
