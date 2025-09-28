import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET() {
  try {
    console.log("Prisma client initialized:", !!prisma);
    const models = Object.keys(prisma).filter(
      (key) => typeof prisma[key]?.findMany === "function"
    );
    console.log("Available models:", models);

    const nodes = await prisma.nodeTemplate.findMany();
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
    const body = await request.json();
    const node = await prisma.nodeTemplate.create({ data: body });
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
    const body = await request.json();
    console.log("DELETE request body:", body); // Debug log

    // Opción 1: Si tu modelo tiene un campo 'id', usa esto:
    if (body.id) {
      const node = await prisma.nodeTemplate.delete({
        where: { id: body.id },
      });
      return NextResponse.json(node);
    }

    // Opción 2: Si 'name' es único, primero busca el nodo y luego elimínalo
    if (body.name) {
      // Primero verificar si el nodo existe
      const existingNode = await prisma.nodeTemplate.findFirst({
        where: { name: body.name },
      });

      if (!existingNode) {
        console.error("Node not found with name:", body.name);
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }

      // Eliminar usando el id del nodo encontrado
      const deletedNode = await prisma.nodeTemplate.delete({
        where: { id: existingNode.id },
      });

      console.log("Node deleted successfully:", deletedNode);
      return NextResponse.json(deletedNode);
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
