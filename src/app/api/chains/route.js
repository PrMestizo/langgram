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

    const chains = await prisma.chainTemplate.findMany({
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
    return NextResponse.json(chains);
  } catch (error) {
    console.error("Error in /api/chains:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch chains",
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
    const chain = await prisma.chainTemplate.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });
    return NextResponse.json(chain);
  } catch (error) {
    console.error("Error in POST /api/chains:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create chain",
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
      const existingChain = await prisma.chainTemplate.findFirst({
        where: { id: body.id, ownerId: userId },
      });

      if (!existingChain) {
        return NextResponse.json({ error: "Chain not found" }, { status: 404 });
      }

      await prisma.chainTemplate.deleteMany({
        where: { id: existingChain.id, ownerId: userId },
      });
      return NextResponse.json(existingChain);
    }

    if (body.name) {
      const existingChain = await prisma.chainTemplate.findFirst({
        where: { name: body.name, ownerId: userId },
      });

      if (!existingChain) {
        return NextResponse.json({ error: "Chain not found" }, { status: 404 });
      }

      await prisma.chainTemplate.deleteMany({
        where: { id: existingChain.id, ownerId: userId },
      });

      return NextResponse.json(existingChain);
    }

    return NextResponse.json(
      { error: "Missing identifier (id or name)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/chains:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete chain",
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
        { error: "Missing chain identifier" },
        { status: 400 }
      );
    }

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
    console.error("Error in PUT /api/chains:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update chain",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
