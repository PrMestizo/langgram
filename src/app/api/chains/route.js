import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET() {
  try {
    const chains = await prisma.chainTemplate.findMany({
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
    const body = await request.json();
    const chain = await prisma.chainTemplate.create({ data: body });
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
    const body = await request.json();

    if (body.id) {
      const chain = await prisma.chainTemplate.delete({
        where: { id: body.id },
      });
      return NextResponse.json(chain);
    }

    if (body.name) {
      const existingChain = await prisma.chainTemplate.findFirst({
        where: { name: body.name },
      });

      if (!existingChain) {
        return NextResponse.json({ error: "Chain not found" }, { status: 404 });
      }

      const deletedChain = await prisma.chainTemplate.delete({
        where: { id: existingChain.id },
      });

      return NextResponse.json(deletedChain);
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
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing chain identifier" },
        { status: 400 }
      );
    }

    const chain = await prisma.chainTemplate.update({
      where: { id },
      data,
    });
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
