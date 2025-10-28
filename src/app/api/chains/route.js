import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  validateChainTemplateCreate,
  validateChainTemplateUpdate,
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
      const chains = await prisma.chainTemplate.findMany({
        where: { isPublic: true },
        include: commonInclude,
      });
      return NextResponse.json(chains);
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

    const chains = await prisma.chainTemplate.findMany({
      where: whereClause,
      include: commonInclude,
    });
    return NextResponse.json(chains);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in GET /api/chains",
      "No se pudieron obtener las chains"
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

    const payload = await parseJsonBody(request, validateChainTemplateCreate);
    const chain = await prisma.chainTemplate.create({
      data: {
        ...payload,
        ownerId: userId,
      },
    });
    return NextResponse.json(chain, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/chains",
      "No se pudo crear la chain"
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
      const existingChain = await prisma.chainTemplate.findFirst({
        where: { id: identifier.id, ownerId: userId },
      });

      if (!existingChain) {
        return NextResponse.json({ error: "Chain not found" }, { status: 404 });
      }

      await prisma.chainTemplate.deleteMany({
        where: { id: existingChain.id, ownerId: userId },
      });

      return NextResponse.json(existingChain);
    }

    const existingChain = await prisma.chainTemplate.findFirst({
      where: { name: identifier.name, ownerId: userId },
    });

    if (!existingChain) {
      return NextResponse.json({ error: "Chain not found" }, { status: 404 });
    }

    await prisma.chainTemplate.deleteMany({
      where: { id: existingChain.id, ownerId: userId },
    });

    return NextResponse.json(existingChain);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in DELETE /api/chains",
      "No se pudo eliminar la chain"
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

    const payload = await parseJsonBody(request, validateChainTemplateUpdate);
    const { id, ...data } = payload;

    const updateResult = await prisma.chainTemplate.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: "Chain not found" }, { status: 404 });
    }

    const chain = await prisma.chainTemplate.findUnique({ where: { id } });
    return NextResponse.json(chain);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in PUT /api/chains",
      "No se pudo actualizar la chain"
    );
  }
}
