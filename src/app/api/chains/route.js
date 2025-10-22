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

const chainInclude = {
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
      const chains = await prisma.chainTemplate.findMany({
        where: { visibility: Visibility.PUBLIC, showInStore: true },
        include: chainInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(chains);
    }

    if (surface === "sidebar") {
      const chains = await prisma.chainTemplate.findMany({
        where: {
          visibility: Visibility.PUBLIC,
          isGlobal: true,
          showInSidebar: true,
        },
        include: chainInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(chains);
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

    const chains = await prisma.chainTemplate.findMany({
      where,
      include: chainInclude,
      orderBy: { updatedAt: "desc" },
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

    const chain = await prisma.chainTemplate.create({
      data: {
        ...rest,
        ownerId,
        ...publication,
      },
      include: chainInclude,
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

    const existingChain = await prisma.chainTemplate.findFirst({
      where: {
        ...identifier,
        ...(isAdmin ? {} : { ownerId: userId }),
      },
      include: chainInclude,
    });

    if (!existingChain) {
      return NextResponse.json({ error: "Chain not found" }, { status: 404 });
    }

    if (!isAdmin && existingChain.ownerId !== userId) {
      return forbidden();
    }

    await prisma.chainTemplate.delete({ where: { id: existingChain.id } });

    return NextResponse.json(existingChain);
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
    const isAdmin = isAdminSession(session);

    if (!userId) {
      return unauthorized();
    }

    const body = await request.json();
    const { id, ownerId: _ownerId, ...payload } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing chain identifier" },
        { status: 400 }
      );
    }

    const existingChain = await prisma.chainTemplate.findUnique({
      where: { id },
    });

    if (!existingChain) {
      return NextResponse.json({ error: "Chain not found" }, { status: 404 });
    }

    const isOwner = existingChain.ownerId === userId;

    if (!isAdmin && !isOwner) {
      return forbidden();
    }

    const { rest, controls } = splitPublicationFields(payload);
    const { errors, publication } = resolvePublicationState({
      controls,
      existing: existingChain,
      isAdmin,
      isOwner,
    });

    if (errors?.length) {
      return NextResponse.json(
        { error: errors[0], details: errors },
        { status: 400 }
      );
    }

    const chain = await prisma.chainTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...publication,
      },
      include: chainInclude,
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
