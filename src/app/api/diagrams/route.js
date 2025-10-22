import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { auth } from "@/auth";
import {
  resolvePublicationState,
  splitPublicationFields,
  Visibility,
} from "@/app/lib/visibility";

const ownerSelect = {
  id: true,
  name: true,
  email: true,
};

const diagramInclude = {
  owner: {
    select: ownerSelect,
  },
};

const getRole = (session) => session?.user?.role ?? "user";
const isAdminSession = (session) => getRole(session) === "admin";

const unauthorized = () =>
  NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );

const forbidden = () =>
  NextResponse.json(
    { error: "Forbidden" },
    { status: 403 }
  );

export async function GET(request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const isAdmin = isAdminSession(session);
    const surface = new URL(request.url).searchParams.get("surface");

    if (surface === "store") {
      const diagrams = await prisma.diagram.findMany({
        where: { visibility: Visibility.PUBLIC, showInStore: true },
        include: diagramInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(diagrams);
    }

    if (surface === "sidebar") {
      const diagrams = await prisma.diagram.findMany({
        where: {
          visibility: Visibility.PUBLIC,
          isGlobal: true,
          showInSidebar: true,
        },
        include: diagramInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(diagrams);
    }

    if (!userId) {
      return unauthorized();
    }

    const where = isAdmin
      ? {}
      : {
          OR: [
            { ownerId: userId },
            { visibility: Visibility.PUBLIC, isGlobal: true },
          ],
        };

    const diagrams = await prisma.diagram.findMany({
      where,
      include: diagramInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(diagrams);
  } catch (error) {
    console.error("Error in /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch diagrams",
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
    const isAdmin = isAdminSession(session);

    if (!userId) {
      return unauthorized();
    }

    const body = await request.json();
    const { ownerId: requestedOwnerId, ...payload } = body;
    const { rest, controls } = splitPublicationFields(payload);

    const ownerId = isAdmin
      ? Object.prototype.hasOwnProperty.call(body, "ownerId")
        ? requestedOwnerId ?? null
        : userId
      : userId;

    const { errors, publication } = resolvePublicationState({
      controls,
      existing: {},
      isAdmin,
      isOwner: ownerId === userId,
    });

    if (errors?.length) {
      return NextResponse.json(
        { error: errors[0], details: errors },
        { status: 400 }
      );
    }

    const diagram = await prisma.diagram.create({
      data: {
        ...rest,
        ownerId,
        ...publication,
      },
      include: diagramInclude,
    });
    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Error in /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create diagram",
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
    const isAdmin = isAdminSession(session);

    if (!userId && !isAdmin) {
      return unauthorized();
    }

    const body = await request.json();
    const identifier = body.id
      ? { id: body.id }
      : body.name
        ? { name: body.name }
        : null;

    if (!identifier) {
      return NextResponse.json(
        { error: "Missing identifier (id or name)" },
        { status: 400 }
      );
    }

    const existingDiagram = await prisma.diagram.findFirst({
      where: {
        ...identifier,
        ...(isAdmin ? {} : { ownerId: userId }),
      },
      include: diagramInclude,
    });

    if (!existingDiagram) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    if (!isAdmin && existingDiagram.ownerId !== userId) {
      return forbidden();
    }

    await prisma.diagram.delete({ where: { id: existingDiagram.id } });

    return NextResponse.json(existingDiagram);
  } catch (error) {
    console.error("Error in DELETE /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete diagram",
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
    const isAdmin = isAdminSession(session);

    if (!userId) {
      return unauthorized();
    }

    const body = await request.json();
    const { id, ownerId: _ownerId, ...payload } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing diagram identifier" },
        { status: 400 }
      );
    }

    const existingDiagram = await prisma.diagram.findUnique({
      where: { id },
    });

    if (!existingDiagram) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const isOwner = existingDiagram.ownerId === userId;

    if (!isAdmin && !isOwner) {
      return forbidden();
    }

    const { rest, controls } = splitPublicationFields(payload);
    const { errors, publication } = resolvePublicationState({
      controls,
      existing: existingDiagram,
      isAdmin,
      isOwner,
    });

    if (errors?.length) {
      return NextResponse.json(
        { error: errors[0], details: errors },
        { status: 400 }
      );
    }

    const diagram = await prisma.diagram.update({
      where: { id },
      data: {
        ...rest,
        ...publication,
      },
      include: diagramInclude,
    });
    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Error in PUT /api/diagrams:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update diagram",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
