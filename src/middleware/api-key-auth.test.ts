import { Hono } from "hono";
import { describe, expect, test } from "vitest";
import type { HonoEnv } from "../index";
import { apiKeyAuth } from "./api-key-auth";

describe("apiKeyAuth middleware", () => {
  function createApp(apiKey?: string) {
    const app = new Hono<HonoEnv>();
    app.use("/*", async (c, next) => {
      c.env = {
        ...c.env,
        NISSHI_DEV_SURVEY_API_KEY: apiKey ?? "",
      } as HonoEnv["Bindings"];
      await next();
    });
    app.use("/*", apiKeyAuth);
    app.get("/test", (c) => c.json({ ok: true }));
    return app;
  }

  test("NISSHI_DEV_SURVEY_API_KEY 未設定で 500 を返す", async () => {
    const app = createApp("");
    const res = await app.request("/test");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "API key not configured" });
  });

  test("X-API-Key ヘッダーなしで 401 を返す", async () => {
    const app = createApp("valid-key");
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("不正な API キーで 401 を返す", async () => {
    const app = createApp("valid-key");
    const res = await app.request("/test", {
      headers: { "X-API-Key": "wrong-key" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("正しい API キーで next() を実行する", async () => {
    const app = createApp("valid-key");
    const res = await app.request("/test", {
      headers: { "X-API-Key": "valid-key" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
