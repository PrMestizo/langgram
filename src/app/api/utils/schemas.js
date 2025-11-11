import { HttpError } from "./errors";

const INLINE_CONTROL_REGEX = /[\u0000-\u001F\u007F-\u009F]/g;
const MULTILINE_CONTROL_REGEX =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const MAX_CODE_LENGTH = 20000;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;
const MAX_LANGUAGE_LENGTH = 64;
const MAX_TAGS = 32;
const MAX_TAG_LENGTH = 64;
const MAX_GRAPH_NODES = 200;
const MAX_GRAPH_EDGES = 600;
const MAX_GRAPH_SERIALIZED_LENGTH = 200000; // ~200 KB safeguard

export function sanitizeInlineText(value) {
  return value.replace(INLINE_CONTROL_REGEX, "").trim();
}

export function sanitizeMultilineText(value) {
  return value.replace(MULTILINE_CONTROL_REGEX, "");
}

function ensurePlainObject(value, fieldName) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} debe ser un objeto JSON válido`);
  }
  return value;
}

function dropUndefinedKeys(obj) {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
}

function sanitizeId(value, { required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, "El identificador es obligatorio");
    }
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "El identificador debe ser una cadena");
  }
  const sanitized = sanitizeInlineText(value);
  if (!sanitized) {
    if (required) {
      throw new HttpError(400, "El identificador es obligatorio");
    }
    return undefined;
  }
  if (sanitized.length > 128) {
    throw new HttpError(
      400,
      "El identificador no puede superar los 128 caracteres"
    );
  }
  if (!/^[A-Za-z0-9_-]+$/.test(sanitized)) {
    throw new HttpError(
      400,
      "El identificador solo puede contener letras, números, '-' o '_'"
    );
  }
  return sanitized;
}

function sanitizeName(value, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, "El nombre es obligatorio");
    }
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "El nombre debe ser una cadena");
  }
  const sanitized = sanitizeInlineText(value);
  if (!sanitized) {
    if (required) {
      throw new HttpError(400, "El nombre es obligatorio");
    }
    return undefined;
  }
  if (sanitized.length > MAX_NAME_LENGTH) {
    throw new HttpError(
      400,
      `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres`
    );
  }
  return sanitized;
}

function sanitizeDescription(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "La descripción debe ser una cadena");
  }
  const sanitized = sanitizeMultilineText(value).trim();
  if (!sanitized) {
    return undefined;
  }
  if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
    throw new HttpError(
      400,
      `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres`
    );
  }
  return sanitized;
}

function sanitizeLanguage(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "El lenguaje debe ser una cadena");
  }
  const sanitized = sanitizeInlineText(value).toLowerCase();
  if (!sanitized) {
    return undefined;
  }
  if (sanitized.length > MAX_LANGUAGE_LENGTH) {
    throw new HttpError(
      400,
      `El lenguaje no puede superar los ${MAX_LANGUAGE_LENGTH} caracteres`
    );
  }
  return sanitized;
}

function sanitizeCode(value, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, "El código es obligatorio");
    }
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "El código debe ser una cadena");
  }
  const sanitized = sanitizeMultilineText(value);
  if (!sanitized) {
    if (required) {
      throw new HttpError(400, "El código es obligatorio");
    }
    return undefined;
  }
  if (sanitized.length > MAX_CODE_LENGTH) {
    throw new HttpError(
      400,
      `El código no puede superar los ${MAX_CODE_LENGTH} caracteres`
    );
  }
  return sanitized;
}

function sanitizeBoolean(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new HttpError(400, `${fieldName} debe ser un booleano`);
  }
  return value;
}

function sanitizeJson(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    throw new HttpError(400, `${fieldName} debe ser un JSON serializable`);
  }
}

function sanitizeTags(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new HttpError(400, "Las etiquetas deben ser un arreglo");
  }
  const tags = [];
  for (const rawTag of value) {
    const tag = sanitizeInlineText(String(rawTag));
    if (!tag) {
      continue;
    }
    if (tag.length > MAX_TAG_LENGTH) {
      throw new HttpError(
        400,
        `Cada etiqueta debe tener como máximo ${MAX_TAG_LENGTH} caracteres`
      );
    }
    tags.push(tag);
    if (tags.length >= MAX_TAGS) {
      break;
    }
  }
  return tags.length ? tags : undefined;
}

function sanitizeVersion(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new HttpError(400, "La versión debe ser un número válido");
  }
  const intValue = Math.trunc(num);
  return intValue < 1 ? 1 : intValue;
}

function enforceUpdateFields(data, fieldNames) {
  const hasField = fieldNames.some((field) => data[field] !== undefined);
  if (!hasField) {
    throw new HttpError(
      400,
      "Debe proporcionar al menos un campo para actualizar"
    );
  }
}

function sanitizeTemplateCreate(payload, { allowPublic = false } = {}) {
  const data = ensurePlainObject(payload, "body");
  const sanitized = {
    name: sanitizeName(data.name, { required: true }),
    description: sanitizeDescription(data.description),
    code: sanitizeCode(data.code, { required: true }),
    language: sanitizeLanguage(data.language),
    conditionalEdge: sanitizeBoolean(data.conditionalEdge, "conditionalEdge"),
    metadata: sanitizeJson(data.metadata, "metadata"),
  };
  if (allowPublic) {
    const isPublic = sanitizeBoolean(data.isPublic, "isPublic");
    if (isPublic !== undefined) {
      sanitized.isPublic = isPublic;
    }
  }
  return dropUndefinedKeys(sanitized);
}

function sanitizeTemplateUpdate(payload, { allowPublic = false } = {}) {
  const data = ensurePlainObject(payload, "body");
  const sanitized = {
    id: sanitizeId(data.id),
    name: sanitizeName(data.name),
    description: sanitizeDescription(data.description),
    code: sanitizeCode(data.code),
    language: sanitizeLanguage(data.language),
    conditionalEdge: sanitizeBoolean(data.conditionalEdge, "conditionalEdge"),
    metadata: sanitizeJson(data.metadata, "metadata"),
  };
  if (allowPublic) {
    const isPublic = sanitizeBoolean(data.isPublic, "isPublic");
    if (isPublic !== undefined) {
      sanitized.isPublic = isPublic;
    }
  }
  enforceUpdateFields(sanitized, [
    "name",
    "description",
    "code",
    "language",
    "metadata",
    "isPublic",
    "conditionalEdge",
  ]);
  return dropUndefinedKeys(sanitized);
}

export function validateNodeTemplateCreate(payload) {
  return sanitizeTemplateCreate(payload, { allowPublic: true });
}

export function validateNodeTemplateUpdate(payload) {
  return sanitizeTemplateUpdate(payload, { allowPublic: true });
}

export function validateEdgeTemplateCreate(payload) {
  return sanitizeTemplateCreate(payload, { allowPublic: true });
}

export function validateEdgeTemplateUpdate(payload) {
  return sanitizeTemplateUpdate(payload, { allowPublic: true });
}

export function validateChainTemplateCreate(payload) {
  return sanitizeTemplateCreate(payload, { allowPublic: true });
}

export function validateChainTemplateUpdate(payload) {
  return sanitizeTemplateUpdate(payload, { allowPublic: true });
}

export function validateToolTemplateCreate(payload) {
  return sanitizeTemplateCreate(payload, { allowPublic: true });
}

export function validateToolTemplateUpdate(payload) {
  return sanitizeTemplateUpdate(payload, { allowPublic: true });
}

export function validatePromptTemplateCreate(payload) {
  const data = ensurePlainObject(payload, "body");
  return dropUndefinedKeys({
    name: sanitizeName(data.name, { required: true }),
    description: sanitizeDescription(data.description),
    content: sanitizeCode(data.content, { required: true }),
    metadata: sanitizeJson(data.metadata, "metadata"),
    isPublic: sanitizeBoolean(data.isPublic, "isPublic"),
  });
}

export function validatePromptTemplateUpdate(payload) {
  const data = ensurePlainObject(payload, "body");
  const sanitized = {
    id: sanitizeId(data.id),
    name: sanitizeName(data.name),
    description: sanitizeDescription(data.description),
    content: sanitizeCode(data.content),
    metadata: sanitizeJson(data.metadata, "metadata"),
    isPublic: sanitizeBoolean(data.isPublic, "isPublic"),
  };
  enforceUpdateFields(sanitized, [
    "name",
    "description",
    "content",
    "metadata",
    "isPublic",
  ]);
  return dropUndefinedKeys(sanitized);
}

function sanitizeDiagramContent(value) {
  const json = sanitizeJson(value, "content");
  if (json === undefined) {
    throw new HttpError(400, "El contenido del diagrama es obligatorio");
  }
  const serialized = JSON.stringify(json);
  if (serialized.length > MAX_GRAPH_SERIALIZED_LENGTH) {
    throw new HttpError(400, "El contenido del diagrama es demasiado grande");
  }
  return json;
}

export function validateDiagramCreate(payload) {
  const data = ensurePlainObject(payload, "body");
  const sanitized = {
    name: sanitizeName(data.name, { required: true }),
    content: sanitizeDiagramContent(data.content),
    isPublic: sanitizeBoolean(data.isPublic, "isPublic"),
    version: sanitizeVersion(data.version),
    tags: sanitizeTags(data.tags),
  };
  return dropUndefinedKeys(sanitized);
}

export function validateDiagramUpdate(payload) {
  const data = ensurePlainObject(payload, "body");
  const sanitized = {
    id: sanitizeId(data.id),
    name: sanitizeName(data.name),
    content:
      data.content === undefined
        ? undefined
        : sanitizeDiagramContent(data.content),
    isPublic: sanitizeBoolean(data.isPublic, "isPublic"),
    version: sanitizeVersion(data.version),
    tags: sanitizeTags(data.tags),
  };
  enforceUpdateFields(sanitized, [
    "name",
    "content",
    "isPublic",
    "version",
    "tags",
  ]);
  return dropUndefinedKeys(sanitized);
}

export function validateDeleteByIdOrName(payload) {
  const data = ensurePlainObject(payload, "body");
  const id = sanitizeId(data.id, { required: false });
  const name = sanitizeName(data.name);
  if (!id && !name) {
    throw new HttpError(400, "Debe proporcionar un identificador o un nombre");
  }
  return id ? { id } : { name };
}

function sanitizeGraphNodes(nodes) {
  if (!Array.isArray(nodes)) {
    throw new HttpError(400, "nodes debe ser un arreglo");
  }
  if (nodes.length > MAX_GRAPH_NODES) {
    throw new HttpError(400, "El grafo tiene demasiados nodos");
  }
  return nodes.map((node, index) => {
    const data = ensurePlainObject(node, `nodes[${index}]`);
    const sanitizedNode = {
      id: sanitizeId(data.id),
      type: sanitizeName(data.type) ?? "NODE",
    };
    const label = sanitizeName(data.label);
    if (label) {
      sanitizedNode.label = label;
    }
    const code = sanitizeCode(data.code);
    if (code) {
      sanitizedNode.code = code;
    }
    return sanitizedNode;
  });
}

function sanitizeGraphEdges(edges) {
  if (!Array.isArray(edges)) {
    throw new HttpError(400, "edges debe ser un arreglo");
  }
  if (edges.length > MAX_GRAPH_EDGES) {
    throw new HttpError(400, "El grafo tiene demasiadas aristas");
  }
  return edges.map((edge, index) => {
    const data = ensurePlainObject(edge, `edges[${index}]`);
    return {
      source: sanitizeId(data.source),
      target: sanitizeId(data.target),
    };
  });
}

export function validateGraphGenerationRequest(payload) {
  const data = ensurePlainObject(payload, "body");
  const graph = ensurePlainObject(data.graphJSON, "graphJSON");
  const sanitizedGraph = {
    nodes: sanitizeGraphNodes(graph.nodes ?? []),
    edges: sanitizeGraphEdges(graph.edges ?? []),
  };
  const serialized = JSON.stringify(sanitizedGraph);
  if (serialized.length > MAX_GRAPH_SERIALIZED_LENGTH) {
    throw new HttpError(400, "El grafo proporcionado es demasiado grande");
  }
  return { graphJSON: sanitizedGraph };
}

function sanitizeEmail(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "El correo es obligatorio");
  }
  const sanitized = sanitizeInlineText(value).toLowerCase();
  if (!sanitized) {
    throw new HttpError(400, "El correo es obligatorio");
  }
  if (sanitized.length > 254) {
    throw new HttpError(400, "El correo no puede superar los 254 caracteres");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new HttpError(400, "El correo no es válido");
  }
  return sanitized;
}

function sanitizePassword(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "La contraseña es obligatoria");
  }
  if (value.length < 8) {
    throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
  }
  if (value.length > 128) {
    throw new HttpError(
      400,
      "La contraseña no puede superar los 128 caracteres"
    );
  }
  if (value !== value.trim()) {
    throw new HttpError(
      400,
      "La contraseña no puede iniciar ni terminar con espacios"
    );
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new HttpError(400, "La contraseña debe incluir letras y números");
  }
  return value;
}

export function validateRegisterUser(payload) {
  const data = ensurePlainObject(payload, "body");
  const sanitizedName = sanitizeName(data.name);
  return {
    name: sanitizedName,
    email: sanitizeEmail(data.email),
    password: sanitizePassword(data.password),
  };
}
