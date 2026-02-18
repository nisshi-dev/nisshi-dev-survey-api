import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".dev.vars")) {
  process.loadEnvFile(".dev.vars");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // prisma generate 時は DB 接続不要のため、未設定時は空文字にフォールバック
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
