import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  validateToolTemplateCreate,
  validateToolTemplateUpdate,
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

    const tools = await prisma.toolTemplate.findMany({
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
    return NextResponse.json(tools);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in GET /api/tools",
      "No se pudieron obtener las herramientas"
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

    const payload = await parseJsonBody(request, validateToolTemplateCreate);
    const tool = await prisma.toolTemplate.create({
      data: {
        ...payload,
        ownerId: userId,
      },
    });
    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/tools",
      "No se pudo crear la herramienta"
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
      const existingTool = await prisma.toolTemplate.findFirst({
        where: { id: identifier.id, ownerId: userId },
      });

      if (!existingTool) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }

      await prisma.toolTemplate.deleteMany({
        where: { id: existingTool.id, ownerId: userId },
      });

      return NextResponse.json(existingTool);
    }

    const existingTool = await prisma.toolTemplate.findFirst({
      where: { name: identifier.name, ownerId: userId },
    });

    if (!existingTool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    await prisma.toolTemplate.deleteMany({
      where: { id: existingTool.id, ownerId: userId },
    });

    return NextResponse.json(existingTool);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in DELETE /api/tools",
      "No se pudo eliminar la herramienta"
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

    const payload = await parseJsonBody(request, validateToolTemplateUpdate);
    const { id, ...data } = payload;

    const updateResult = await prisma.toolTemplate.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const tool = await prisma.toolTemplate.findUnique({ where: { id } });
    return NextResponse.json(tool);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in PUT /api/tools",
      "No se pudo actualizar la herramienta"
    );
  }
}
