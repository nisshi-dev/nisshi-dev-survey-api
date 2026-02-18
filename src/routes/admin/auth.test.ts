import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockHandler = vi.fn();
const mockGetSession = vi.fn();

interface TestEnv {
  Variables: {
    auth: {
      handler: typeof mockHandler;
      api: { getSession: typeof mockGetSession };
    };
    user: { id: string; email: string };
  };
}

function createApp() {
  const app = new Hono<TestEnv>();
  app.use("/*", async (c, next) => {
    c.set("auth", {
      handler: mockHandler,
      api: { getSession: mockGetSession },
    } as never);
    await next();
  });
  app.route("/admin/auth", authApp);
  return app;
}

const authApp = (await import("./auth")).default;

describe("GET /admin/auth/me", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockHandler.mockReset();
  });

  test("有効なセッションでユーザー情報を返す", async () => {
    mockGetSession.mockResolvedValue({
      session: { id: "session-1", userId: "user-1" },
      user: { id: "user-1", email: "admin@example.com", name: "Admin" },
    });

    const app = createApp();
    const res = await app.request("/admin/auth/me");

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({
      id: "user-1",
      email: "admin@example.com",
    });
  });

  test("セッションなしで 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/auth/me");

    expect(res.status).toBe(401);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });
});

describe("better-auth ハンドラ", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockHandler.mockReset();
  });

  test("GET リクエストを better-auth handler に委譲する", async () => {
    mockHandler.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const app = createApp();
    const res = await app.request("/admin/auth/sign-in/social");

    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test("POST リクエストを better-auth handler に委譲する", async () => {
    mockHandler.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const app = createApp();
    const res = await app.request("/admin/auth/sign-in/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google" }),
    });

    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
