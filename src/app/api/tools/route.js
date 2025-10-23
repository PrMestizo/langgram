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
    console.error("Error in /api/tools:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch tools",
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
    const tool = await prisma.toolTemplate.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });
    return NextResponse.json(tool);
  } catch (error) {
    console.error("Error in POST /api/tools:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create tool",
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
      const existingTool = await prisma.toolTemplate.findFirst({
        where: { id: body.id, ownerId: userId },
      });

      if (!existingTool) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }

      await prisma.toolTemplate.deleteMany({
        where: { id: existingTool.id, ownerId: userId },
      });
      return NextResponse.json(existingTool);
    }

    if (body.name) {
      const existingTool = await prisma.toolTemplate.findFirst({
        where: { name: body.name, ownerId: userId },
      });

      if (!existingTool) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }

      await prisma.toolTemplate.deleteMany({
        where: { id: existingTool.id, ownerId: userId },
      });

      return NextResponse.json(existingTool);
    }

    return NextResponse.json(
      { error: "Missing identifier (id or name)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/tools:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete tool",
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
        { error: "Missing tool identifier" },
        { status: 400 }
      );
    }

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
    console.error("Error in PUT /api/tools:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update tool",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
