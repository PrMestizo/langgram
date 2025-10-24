import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  validatePromptTemplateCreate,
  validatePromptTemplateUpdate,
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

    const prompts = await prisma.promptTemplate.findMany({
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
    return NextResponse.json(prompts);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in GET /api/prompts",
      "No se pudieron obtener los prompts"
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

    const payload = await parseJsonBody(request, validatePromptTemplateCreate);
    const prompt = await prisma.promptTemplate.create({
      data: {
        ...payload,
        ownerId: userId,
      },
    });
    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "Error in POST /api/prompts",
      "No se pudo crear el prompt"
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
      const existingPrompt = await prisma.promptTemplate.findFirst({
        where: { id: identifier.id, ownerId: userId },
      });

      if (!existingPrompt) {
        return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
      }

      await prisma.promptTemplate.deleteMany({
        where: { id: existingPrompt.id, ownerId: userId },
      });

      return NextResponse.json(existingPrompt);
    }

    const existingPrompt = await prisma.promptTemplate.findFirst({
      where: { name: identifier.name, ownerId: userId },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    await prisma.promptTemplate.deleteMany({
      where: { id: existingPrompt.id, ownerId: userId },
    });

    return NextResponse.json(existingPrompt);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in DELETE /api/prompts",
      "No se pudo eliminar el prompt"
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

    const payload = await parseJsonBody(request, validatePromptTemplateUpdate);
    const { id, ...data } = payload;

    const updateResult = await prisma.promptTemplate.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const prompt = await prisma.promptTemplate.findUnique({ where: { id } });
    return NextResponse.json(prompt);
  } catch (error) {
    return handleRouteError(
      error,
      "Error in PUT /api/prompts",
      "No se pudo actualizar el prompt"
    );
  }
}
