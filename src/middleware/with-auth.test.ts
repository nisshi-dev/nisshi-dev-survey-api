import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockCreateAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  createAuth: (...args: unknown[]) => mockCreateAuth(...args),
}));

const { withAuth } = await import("./with-auth");

interface TestEnv {
  Bindings: {
    ALLOWED_ORIGINS: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    DATABASE_URL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    NISSHI_DEV_SURVEY_API_KEY: string;
    RESEND_API_KEY: string;
    RESEND_FROM_EMAIL: string;
  };
  Variables: {
    prisma: unknown;
    auth: unknown;
    user: { id: string; email: string };
  };
}

const testEnv = {
  ALLOWED_ORIGINS: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:8787",
  DATABASE_URL: "postgresql://localhost/test",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  NISSHI_DEV_SURVEY_API_KEY: "key",
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "test@test.com",
};

describe("withAuth middleware", () => {
  beforeEach(() => {
    mockCreateAuth.mockClear();
  });

  test("auth インスタンスを c.var.auth にセットする", async () => {
    const fakeAuth = { handler: vi.fn(), api: { getSession: vi.fn() } };
    mockCreateAuth.mockReturnValue(fakeAuth);

    const app = new Hono<TestEnv>();
    app.use("/*", async (c, next) => {
      c.set("prisma", {} as never);
      c.env = testEnv as never;
      await next();
    });
    app.use("/*", withAuth as never);
    app.get("/test", (c) => c.json({ hasAuth: !!c.get("auth") }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ hasAuth: true });
  });

  test("createAuth に prisma と env を渡す", async () => {
    const fakeAuth = { handler: vi.fn(), api: { getSession: vi.fn() } };
    mockCreateAuth.mockReturnValue(fakeAuth);
    const mockPrisma = { fake: true };

    const app = new Hono<TestEnv>();
    app.use("/*", async (c, next) => {
      c.set("prisma", mockPrisma as never);
      c.env = testEnv as never;
      await next();
    });
    app.use("/*", withAuth as never);
    app.get("/test", (c) => c.json({ ok: true }));

    await app.request("/test");

    expect(mockCreateAuth).toHaveBeenCalledTimes(1);
    expect(mockCreateAuth).toHaveBeenCalledWith(mockPrisma, testEnv);
  });
});
