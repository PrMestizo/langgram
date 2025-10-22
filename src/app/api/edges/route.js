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

const edgeInclude = {
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
      const edges = await prisma.edgeTemplate.findMany({
        where: { visibility: Visibility.PUBLIC, showInStore: true },
        include: edgeInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(edges);
    }

    if (surface === "sidebar") {
      const edges = await prisma.edgeTemplate.findMany({
        where: {
          visibility: Visibility.PUBLIC,
          isGlobal: true,
          showInSidebar: true,
        },
        include: edgeInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(edges);
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

    const edges = await prisma.edgeTemplate.findMany({
      where,
      include: edgeInclude,
      orderBy: { updatedAt: "desc" },
    });
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

    const edge = await prisma.edgeTemplate.create({
      data: {
        ...rest,
        ownerId,
        ...publication,
      },
      include: edgeInclude,
    });
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

    const existingEdge = await prisma.edgeTemplate.findFirst({
      where: {
        ...identifier,
        ...(isAdmin ? {} : { ownerId: userId }),
      },
      include: edgeInclude,
    });

    if (!existingEdge) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    if (!isAdmin && existingEdge.ownerId !== userId) {
      return forbidden();
    }

    await prisma.edgeTemplate.delete({ where: { id: existingEdge.id } });

    return NextResponse.json(existingEdge);
  } catch (error) {
    console.error("Error in DELETE /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete edge",
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
        { error: "Missing edge identifier" },
        { status: 400 }
      );
    }

    const existingEdge = await prisma.edgeTemplate.findUnique({
      where: { id },
    });

    if (!existingEdge) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    const isOwner = existingEdge.ownerId === userId;

    if (!isAdmin && !isOwner) {
      return forbidden;
    }

    const { rest, controls } = splitPublicationFields(payload);
    const { errors, publication } = resolvePublicationState({
      controls,
      existing: existingEdge,
      isAdmin,
      isOwner,
    });

    if (errors?.length) {
      return NextResponse.json(
        { error: errors[0], details: errors },
        { status: 400 }
      );
    }

    const edge = await prisma.edgeTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...publication,
      },
      include: edgeInclude,
    });
    return NextResponse.json(edge);
  } catch (error) {
    console.error("Error in PUT /api/edges:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update edge",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
