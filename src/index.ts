import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { openAPIRouteHandler } from "hono-openapi";
import type { PrismaClient } from "./generated/prisma/client.js";
import type { Auth } from "./lib/auth.js";
import { isAllowedOrigin } from "./lib/cors.js";
import withPrisma from "./lib/prisma.js";
import { adminAuth } from "./middleware/admin-auth.js";
import { apiKeyAuth } from "./middleware/api-key-auth.js";
import { withAuth } from "./middleware/with-auth.js";
import adminAuthRoutes from "./routes/admin/auth.js";
import adminSurveys from "./routes/admin/surveys.js";
import dataSurveys from "./routes/data/surveys.js";
import survey from "./routes/survey.js";

interface Bindings {
  ALLOWED_ORIGINS: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NISSHI_DEV_SURVEY_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
}

export interface HonoEnv {
  Bindings: Bindings;
  Variables: {
    prisma: PrismaClient;
    auth: Auth;
    user: { id: string; email: string };
  };
}

const app = new Hono<HonoEnv>();

// CORS（全ルートに適用するため最初に配置）
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGINS;
      if (!allowed) {
        return null;
      }
      return isAllowedOrigin(origin, allowed) ? origin : null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key"],
    maxAge: 86_400,
  })
);

// favicon リクエストを早期に返す（DB 接続を回避）
app.get("/favicon.ico", (c) => c.notFound());

app.get("/health", (c) => c.json({ status: "ok" }));

// OpenAPI JSON
app.get(
  "/doc",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "nisshi-dev Survey API",
        version: "1.0.0",
        description: "アンケート作成・回答収集 API",
      },
      servers: [{ url: "/" }],
    },
  })
);

// Swagger UI
app.get("/ui", swaggerUI({ url: "/doc" }));

app.use("*", withPrisma);
app.use("*", withAuth);
app.use("*", logger());

// 回答者向け API（認証不要）
app.route("/survey", survey);

// 管理画面向け API
app.route("/admin/auth", adminAuthRoutes);
app.use("/admin/surveys/*", adminAuth);
app.route("/admin/surveys", adminSurveys);

// データ投入 API（API Key 認証）
app.use("/data/*", apiKeyAuth);
app.route("/data/surveys", dataSurveys);

export default app;
