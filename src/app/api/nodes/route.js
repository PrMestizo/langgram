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

    const nodes = await prisma.nodeTemplate.findMany({
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
    return NextResponse.json(nodes);
  } catch (error) {
    console.error("Error in /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch nodes",
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
    const node = await prisma.nodeTemplate.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });
    return NextResponse.json(node);
  } catch (error) {
    console.error("Error in /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create node",
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
      const existingNode = await prisma.nodeTemplate.findFirst({
        where: { id: body.id, ownerId: userId },
      });

      if (!existingNode) {
        return NextResponse.json(
          { error: "Node not found" },
          { status: 404 }
        );
      }

      await prisma.nodeTemplate.deleteMany({
        where: { id: existingNode.id, ownerId: userId },
      });
      return NextResponse.json(existingNode);
    }

    // Opción 2: Si 'name' es único, primero busca el nodo y luego elimínalo
    if (body.name) {
      // Primero verificar si el nodo existe
      const existingNode = await prisma.nodeTemplate.findFirst({
        where: { name: body.name, ownerId: userId },
      });

      if (!existingNode) {
        console.error("Node not found with name:", body.name);
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }

      // Eliminar usando el id del nodo encontrado
      await prisma.nodeTemplate.deleteMany({
        where: { id: existingNode.id, ownerId: userId },
      });

      console.log("Node deleted successfully:", existingNode);
      return NextResponse.json(existingNode);
    }

    // Si no hay ni id ni name en el body
    return NextResponse.json(
      { error: "Missing identifier (id or name)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete node",
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
        { error: "Missing node identifier" },
        { status: 400 }
      );
    }

    const updateResult = await prisma.nodeTemplate.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const node = await prisma.nodeTemplate.findUnique({ where: { id } });
    return NextResponse.json(node);
  } catch (error) {
    console.error("Error in PUT /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update node",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
