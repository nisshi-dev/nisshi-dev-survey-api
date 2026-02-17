import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // .env が存在しない環境（Vercel 等）では環境変数から直接読む
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
