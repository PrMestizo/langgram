import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  validateDiagramCreate,
  validateDiagramUpdate,
  validateDeleteByIdOrName,
} from "../utils/schemas";
import { handleRouteError, parseJsonBody } from "../utils/http";

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
    return handleRouteError(
      error,
      "Error in GET /api/diagrams",
      "No se pudieron obtener los diagramas"
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

    const payload = await parseJsonBody(request, validateDiagramCreate);
    const diagram = await prisma.diagram.create({
      data: {
        ...payload,
        ownerId: userId,
      },
    });
    return NextResponse.json(diagram, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/diagrams",
      "No se pudo crear el diagrama"
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

    const identifier = await parseJsonBody(request, validateDeleteByIdOrName);

    if (identifier.id) {
      const existingDiagram = await prisma.diagram.findFirst({
        where: { id: identifier.id, ownerId: userId },
      });

      if (!existingDiagram) {
        return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
      }

      await prisma.diagram.deleteMany({
        where: { id: existingDiagram.id, ownerId: userId },
      });

      return NextResponse.json(existingDiagram);
    }

    const existingDiagram = await prisma.diagram.findFirst({
      where: { name: identifier.name, ownerId: userId },
    });

    if (!existingDiagram) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    await prisma.diagram.deleteMany({
      where: { id: existingDiagram.id, ownerId: userId },
    });

    return NextResponse.json(existingDiagram);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in DELETE /api/diagrams",
      "No se pudo eliminar el diagrama"
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

    const payload = await parseJsonBody(request, validateDiagramUpdate);
    const { id, ...data } = payload;

    const updateResult = await prisma.diagram.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const diagram = await prisma.diagram.findUnique({ where: { id } });
    return NextResponse.json(diagram);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in PUT /api/diagrams",
      "No se pudo actualizar el diagrama"
    );
  }
}
