import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { openAPIRouteHandler } from "hono-openapi";
import { adminAuth } from "./middleware/admin-auth.js";
import { apiKeyAuth } from "./middleware/api-key-auth.js";
import adminAuthRoutes from "./routes/admin/auth.js";
import adminSurveys from "./routes/admin/surveys.js";
import dataSurveys from "./routes/data/surveys.js";
import survey from "./routes/survey.js";

const app = new Hono();

app.use("*", logger());

const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
	"*",
	cors({
		origin: allowedOrigin || "*",
		credentials: !!allowedOrigin,
	}),
);

app.get("/health", (c) => c.json({ status: "ok" }));

// 回答者向け API（認証不要）
app.route("/survey", survey);

// 管理画面向け API
app.route("/admin/auth", adminAuthRoutes);
app.use("/admin/surveys/*", adminAuth);
app.route("/admin/surveys", adminSurveys);

// データ投入 API（API Key 認証）
app.use("/data/*", apiKeyAuth);
app.route("/data/surveys", dataSurveys);

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
      servers: [{ url: "/", description: "Local" }],
    },
  })
);

// Swagger UI
app.get("/ui", swaggerUI({ url: "/doc" }));

export default app;
