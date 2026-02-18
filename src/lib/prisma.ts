import type { Context, Next } from "hono";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

function withPrisma(c: Context, next: Next) {
  if (!c.get("prisma")) {
    const adapter = new PrismaPg({
      connectionString: c.env.DATABASE_URL,
    });
    c.set("prisma", new PrismaClient({ adapter }));
  }
  return next();
}

export default withPrisma;
