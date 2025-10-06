import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET() {
  try {
    const prompts = await prisma.promptTemplate.findMany();
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
    const body = await request.json();
    const prompt = await prisma.promptTemplate.create({ data: body });
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
    const body = await request.json();

    if (body.id) {
      const prompt = await prisma.promptTemplate.delete({
        where: { id: body.id },
      });
      return NextResponse.json(prompt);
    }

    if (body.name) {
      const existingPrompt = await prisma.promptTemplate.findFirst({
        where: { name: body.name },
      });

      if (!existingPrompt) {
        return NextResponse.json(
          { error: "Prompt not found" },
          { status: 404 }
        );
      }

      const deletedPrompt = await prisma.promptTemplate.delete({
        where: { id: existingPrompt.id },
      });

      return NextResponse.json(deletedPrompt);
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
