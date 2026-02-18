import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { apiKeyAuth } from "./api-key-auth";

describe("apiKeyAuth middleware", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  function createApp() {
    const app = new Hono();
    app.use("/*", apiKeyAuth);
    app.get("/test", (c) => c.json({ ok: true }));
    return app;
  }

  test("NISSHI_DEV_SURVEY_API_KEY 未設定で 500 を返す", async () => {
    vi.stubEnv("NISSHI_DEV_SURVEY_API_KEY", "");
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "API key not configured" });
  });

  test("X-API-Key ヘッダーなしで 401 を返す", async () => {
    vi.stubEnv("NISSHI_DEV_SURVEY_API_KEY", "valid-key");
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("不正な API キーで 401 を返す", async () => {
    vi.stubEnv("NISSHI_DEV_SURVEY_API_KEY", "valid-key");
    const app = createApp();
    const res = await app.request("/test", {
      headers: { "X-API-Key": "wrong-key" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("正しい API キーで next() を実行する", async () => {
    vi.stubEnv("NISSHI_DEV_SURVEY_API_KEY", "valid-key");
    const app = createApp();
    const res = await app.request("/test", {
      headers: { "X-API-Key": "valid-key" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
