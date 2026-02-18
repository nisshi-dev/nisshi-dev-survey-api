import type { MiddlewareHandler } from "hono";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import type { HonoEnv } from "../index.js";

const withPrisma: MiddlewareHandler<HonoEnv> = async (c, next) => {
  if (!c.get("prisma")) {
    const adapter = new PrismaPg({
      connectionString: c.env.DATABASE_URL,
    });
    c.set("prisma", new PrismaClient({ adapter }));
  }
  await next();
};

export default withPrisma;
