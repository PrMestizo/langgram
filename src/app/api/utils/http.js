import { NextResponse } from "next/server";
import { HttpError } from "./errors";

export async function parseJsonBody(request, validator) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  let json;
  try {
    json = await request.json();
  } catch (error) {
    throw new HttpError(400, "El cuerpo debe ser JSON válido");
  }

  if (!validator) {
    return json;
  }

  try {
    return validator(json);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(400, "El payload no cumple con el esquema esperado");
  }
}

export function handleRouteError(
  error,
  contextMessage,
  fallbackMessage = "Error interno del servidor"
) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    );
  }

  console.error(contextMessage, {
    message: error?.message,
    name: error?.name,
    stack: error?.stack,
    prismaCode: error?.code,
    prismaMeta: error?.meta,
  });

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
