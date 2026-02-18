import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    handler: vi.fn(),
    api: { getSession: vi.fn() },
  })),
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => vi.fn()),
}));

const { betterAuth } = await import("better-auth");
const mockBetterAuth = vi.mocked(betterAuth);

const { createAuth } = await import("./auth");

function makeEnv() {
  return {
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    BETTER_AUTH_SECRET: "test-secret-at-least-32-chars-long",
    BETTER_AUTH_URL: "http://localhost:8787",
    ALLOWED_ORIGINS: "http://localhost:5173",
  };
}

describe("createAuth", () => {
  beforeEach(() => {
    mockBetterAuth.mockClear();
    mockBetterAuth.mockReturnValue({
      handler: vi.fn(),
      api: { getSession: vi.fn() },
    } as never);
  });

  test("betterAuth を呼び出して auth インスタンスを返す", () => {
    const auth = createAuth({} as never, makeEnv());

    expect(auth).toBeDefined();
    expect(auth.handler).toBeDefined();
    expect(auth.api).toBeDefined();
    expect(mockBetterAuth).toHaveBeenCalledTimes(1);
  });

  test("basePath を /admin/auth に設定する", () => {
    createAuth({} as never, makeEnv());

    const options = mockBetterAuth.mock.calls[0]?.[0];
    expect(options?.basePath).toBe("/admin/auth");
  });

  test("Google ソーシャルプロバイダが設定される", () => {
    const env = makeEnv();
    env.GOOGLE_CLIENT_ID = "my-google-id";
    env.GOOGLE_CLIENT_SECRET = "my-google-secret";
    createAuth({} as never, env);

    const options = mockBetterAuth.mock.calls[0]?.[0];
    expect(options?.socialProviders?.google).toEqual({
      clientId: "my-google-id",
      clientSecret: "my-google-secret",
    });
  });

  test("trustedOrigins に ALLOWED_ORIGINS が設定される", () => {
    const env = makeEnv();
    env.ALLOWED_ORIGINS = "https://survey.nisshi.dev,https://other.example.com";
    createAuth({} as never, env);

    const options = mockBetterAuth.mock.calls[0]?.[0];
    expect(options?.trustedOrigins).toEqual([
      "https://survey.nisshi.dev",
      "https://other.example.com",
    ]);
  });

  test("databaseHooks で AllowedEmail に登録済みメールは通過する", async () => {
    const mockFindUnique = vi
      .fn()
      .mockResolvedValue({ id: "1", email: "ok@example.com" });
    const mockPrisma = {
      allowedEmail: { findUnique: mockFindUnique },
    } as never;

    createAuth(mockPrisma, makeEnv());

    const options = mockBetterAuth.mock.calls[0]?.[0];
    const beforeHook = options?.databaseHooks?.user?.create?.before;
    expect(beforeHook).toBeDefined();

    const result = await beforeHook!(
      { email: "ok@example.com", name: "Test" } as never,
      {} as never
    );
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "ok@example.com" },
    });
    expect(result).toEqual({
      data: { email: "ok@example.com", name: "Test" },
    });
  });

  test("databaseHooks で AllowedEmail に未登録メールは拒否する", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    const mockPrisma = {
      allowedEmail: { findUnique: mockFindUnique },
    } as never;

    createAuth(mockPrisma, makeEnv());

    const options = mockBetterAuth.mock.calls[0]?.[0];
    const beforeHook = options?.databaseHooks?.user?.create?.before;

    const result = await beforeHook!(
      { email: "unknown@example.com", name: "Bad" } as never,
      {} as never
    );
    expect(result).toBe(false);
  });
});
