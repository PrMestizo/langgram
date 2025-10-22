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

const nodeInclude = {
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
      const nodes = await prisma.nodeTemplate.findMany({
        where: { visibility: Visibility.PUBLIC, showInStore: true },
        include: nodeInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(nodes);
    }

    if (surface === "sidebar") {
      const nodes = await prisma.nodeTemplate.findMany({
        where: {
          visibility: Visibility.PUBLIC,
          isGlobal: true,
          showInSidebar: true,
        },
        include: nodeInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(nodes);
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

    const nodes = await prisma.nodeTemplate.findMany({
      where,
      include: nodeInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(nodes);
  } catch (error) {
    console.error("Error in /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch nodes",
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

    const node = await prisma.nodeTemplate.create({
      data: {
        ...rest,
        ownerId,
        ...publication,
      },
      include: nodeInclude,
    });
    return NextResponse.json(node);
  } catch (error) {
    console.error("Error in /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
    });
    return NextResponse.json(
      {
        error: "Failed to create node",
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

    const existingNode = await prisma.nodeTemplate.findFirst({
      where: {
        ...identifier,
        ...(isAdmin ? {} : { ownerId: userId }),
      },
      include: nodeInclude,
    });

    if (!existingNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    if (!isAdmin && existingNode.ownerId !== userId) {
      return forbidden();
    }

    await prisma.nodeTemplate.delete({ where: { id: existingNode.id } });

    return NextResponse.json(existingNode);
  } catch (error) {
    console.error("Error in DELETE /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to delete node",
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
        { error: "Missing node identifier" },
        { status: 400 }
      );
    }

    const existingNode = await prisma.nodeTemplate.findUnique({
      where: { id },
    });

    if (!existingNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const isOwner = existingNode.ownerId === userId;

    if (!isAdmin && !isOwner) {
      return forbidden;
    }

    const { rest, controls } = splitPublicationFields(payload);
    const { errors, publication } = resolvePublicationState({
      controls,
      existing: existingNode,
      isAdmin,
      isOwner,
    });

    if (errors?.length) {
      return NextResponse.json(
        { error: errors[0], details: errors },
        { status: 400 }
      );
    }

    const node = await prisma.nodeTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...publication,
      },
      include: nodeInclude,
    });
    return NextResponse.json(node);
  } catch (error) {
    console.error("Error in PUT /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code,
      prismaMetadata: error.meta,
    });
    return NextResponse.json(
      {
        error: "Failed to update node",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
