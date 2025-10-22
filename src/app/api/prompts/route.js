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

const promptInclude = {
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
      const prompts = await prisma.promptTemplate.findMany({
        where: { visibility: Visibility.PUBLIC, showInStore: true },
        include: promptInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(prompts);
    }

    if (surface === "sidebar") {
      const prompts = await prisma.promptTemplate.findMany({
        where: {
          visibility: Visibility.PUBLIC,
          isGlobal: true,
          showInSidebar: true,
        },
        include: promptInclude,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(prompts);
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

    const prompts = await prisma.promptTemplate.findMany({
      where,
      include: promptInclude,
      orderBy: { updatedAt: "desc" },
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

    const prompt = await prisma.promptTemplate.create({
      data: {
        ...rest,
        ownerId,
        ...publication,
      },
      include: promptInclude,
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

    const existingPrompt = await prisma.promptTemplate.findFirst({
      where: {
        ...identifier,
        ...(isAdmin ? {} : { ownerId: userId }),
      },
      include: promptInclude,
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (!isAdmin && existingPrompt.ownerId !== userId) {
      return forbidden();
    }

    await prisma.promptTemplate.delete({ where: { id: existingPrompt.id } });

    return NextResponse.json(existingPrompt);
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
    const isAdmin = isAdminSession(session);

    if (!userId) {
      return unauthorized();
    }

    const body = await request.json();
    const { id, ownerId: _ownerId, ...payload } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing prompt identifier" },
        { status: 400 }
      );
    }

    const existingPrompt = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const isOwner = existingPrompt.ownerId === userId;

    if (!isAdmin && !isOwner) {
      return forbidden();
    }

    const { rest, controls } = splitPublicationFields(payload);
    const { errors, publication } = resolvePublicationState({
      controls,
      existing: existingPrompt,
      isAdmin,
      isOwner,
    });

    if (errors?.length) {
      return NextResponse.json(
        { error: errors[0], details: errors },
        { status: 400 }
      );
    }

    const prompt = await prisma.promptTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...publication,
      },
      include: promptInclude,
    });
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
