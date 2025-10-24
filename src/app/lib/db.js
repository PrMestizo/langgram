import { PrismaClient } from "../../generated/prisma";

const globalForPrisma = globalThis;

function createClient() {
  return new PrismaClient();
}

let prisma = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

const toolDelegate = prisma?.toolTemplate;
const hasToolDelegate =
  toolDelegate && typeof toolDelegate.findMany === "function";

if (!hasToolDelegate) {
  prisma?.$disconnect?.().catch(() => {});
  prisma = createClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__prisma = prisma;
  }
}

if (!prisma?.toolTemplate) {
  throw new Error(
    "Prisma client is missing the ToolTemplate model. Run `prisma generate` to update the client."
  );
}

export default prisma;
