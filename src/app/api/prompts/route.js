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
    console.error("Error in /api/prompts:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch prompts",
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
    const prompt = await prisma.promptTemplate.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });
    return NextResponse.json(prompt);
  } catch (error) {
    console.error("Error in POST /api/prompts:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create prompt",
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

    if (body.id) {
      const existingPrompt = await prisma.promptTemplate.findFirst({
        where: { id: body.id, ownerId: userId },
      });

      if (!existingPrompt) {
        return NextResponse.json(
          { error: "Prompt not found" },
          { status: 404 }
        );
      }

      await prisma.promptTemplate.deleteMany({
        where: { id: existingPrompt.id, ownerId: userId },
      });
      return NextResponse.json(existingPrompt);
    }

    if (body.name) {
      const existingPrompt = await prisma.promptTemplate.findFirst({
        where: { name: body.name, ownerId: userId },
      });

      if (!existingPrompt) {
        return NextResponse.json(
          { error: "Prompt not found" },
          { status: 404 }
        );
      }

      await prisma.promptTemplate.deleteMany({
        where: { id: existingPrompt.id, ownerId: userId },
      });

      return NextResponse.json(existingPrompt);
    }

    return NextResponse.json(
      { error: "Missing identifier (id or name)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/prompts:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete prompt",
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
        { error: "Missing prompt identifier" },
        { status: 400 }
      );
    }

    const updateResult = await prisma.promptTemplate.updateMany({
      where: { id, ownerId: userId },
      data,
    });

    if (!updateResult.count) {
      return NextResponse.json(
        { error: "Prompt not found" },
        { status: 404 }
      );
    }

    const prompt = await prisma.promptTemplate.findUnique({ where: { id } });
    return NextResponse.json(prompt);
  } catch (error) {
    console.error("Error in PUT /api/prompts:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update prompt",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
