import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

if (existsSync(".dev.vars")) {
  process.loadEnvFile(".dev.vars");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
