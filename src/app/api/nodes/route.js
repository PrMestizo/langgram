import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  validateNodeTemplateCreate,
  validateNodeTemplateUpdate,
  validateDeleteByIdOrName,
} from "../utils/schemas";
import { handleRouteError, parseJsonBody } from "../utils/http";

export async function GET(request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const visibilityParam =
      request?.nextUrl?.searchParams?.get("visibility")?.toLowerCase() ??
      "mine";
    const visibility = ["public", "all", "mine"].includes(visibilityParam)
      ? visibilityParam
      : "mine";

    const commonInclude = {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    if (visibility === "public") {
      const nodes = await prisma.nodeTemplate.findMany({
        where: { isPublic: true },
        include: commonInclude,
      });
      return NextResponse.json(nodes);
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereClause =
      visibility === "all"
        ? {
            OR: [{ ownerId: userId }, { isPublic: true }],
          }
        : { ownerId: userId };

    const nodes = await prisma.nodeTemplate.findMany({
      where: whereClause,
      include: commonInclude,
    });

    return NextResponse.json(nodes);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in GET /api/nodes",
      "No se pudieron obtener los nodos"
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

    const payload = await parseJsonBody(request, validateNodeTemplateCreate);
    const node = await prisma.nodeTemplate.create({
      data: {
        ...payload,
        ownerId: userId,
      },
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/nodes",
      "No se pudo crear el nodo"
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
      const existingNode = await prisma.nodeTemplate.findFirst({
        where: { id: identifier.id, ownerId: userId },
      });

      if (!existingNode) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }

      await prisma.nodeTemplate.deleteMany({
        where: { id: existingNode.id, ownerId: userId },
      });

      return NextResponse.json(existingNode);
    }

    const existingNode = await prisma.nodeTemplate.findFirst({
      where: { name: identifier.name, ownerId: userId },
    });

    if (!existingNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    await prisma.nodeTemplate.deleteMany({
      where: { id: existingNode.id, ownerId: userId },
    });

    return NextResponse.json(existingNode);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in DELETE /api/nodes",
      "No se pudo eliminar el nodo"
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

    const payload = await parseJsonBody(request, validateNodeTemplateUpdate);
    const { id, ...data } = payload;

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
    return handleRouteError(
      error,
      "Error in PUT /api/nodes",
      "No se pudo actualizar el nodo"
    );
  }
}
