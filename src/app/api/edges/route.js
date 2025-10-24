import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  validateEdgeTemplateCreate,
  validateEdgeTemplateUpdate,
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

    const edges = await prisma.edgeTemplate.findMany({
      where: { ownerId: userId },
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
    return handleRouteError(
      error,
      "Error in GET /api/edges",
      "No se pudieron obtener los edges"
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

    const payload = await parseJsonBody(request, validateEdgeTemplateCreate);
    const edge = await prisma.edgeTemplate.create({
      data: {
        ...payload,
        ownerId: userId,
      },
    });
    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/edges",
      "No se pudo crear el edge"
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
      const existingEdge = await prisma.edgeTemplate.findFirst({
        where: { id: identifier.id, ownerId: userId },
      });

      if (!existingEdge) {
        return NextResponse.json({ error: "Edge not found" }, { status: 404 });
      }

      await prisma.edgeTemplate.deleteMany({
        where: { id: existingEdge.id, ownerId: userId },
      });

      return NextResponse.json(existingEdge);
    }

    const existingEdge = await prisma.edgeTemplate.findFirst({
      where: { name: identifier.name, ownerId: userId },
    });

    if (!existingEdge) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    await prisma.edgeTemplate.deleteMany({
      where: { id: existingEdge.id, ownerId: userId },
    });

    return NextResponse.json(existingEdge);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in DELETE /api/edges",
      "No se pudo eliminar el edge"
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

    const payload = await parseJsonBody(request, validateEdgeTemplateUpdate);
    const { id, ...data } = payload;

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
    return handleRouteError(
      error,
      "Error in PUT /api/edges",
      "No se pudo actualizar el edge"
    );
  }
}
