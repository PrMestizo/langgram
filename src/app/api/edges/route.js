import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET() {
  try {
    console.log("Prisma client initialized:", !!prisma);
    const models = Object.keys(prisma).filter(
      (key) => typeof prisma[key]?.findMany === "function"
    );
    console.log("Available models:", models);

    const edges = await prisma.edgeTemplate.findMany();
    return NextResponse.json(edges);
  } catch (error) {
    console.error("Error in /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch edges",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const edge = await prisma.edgeTemplate.create({ data: body });
    return NextResponse.json(edge);
  } catch (error) {
    console.error("Error in /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create edge",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const edge = await prisma.edgeTemplate.delete({ where: { id: body.id } });
    return NextResponse.json(edge);
  } catch (error) {
    console.error("Error in /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to delete edge",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
