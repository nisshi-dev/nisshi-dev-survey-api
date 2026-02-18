import { safeParse } from "valibot";
import { describe, expect, test } from "vitest";
import {
  LoginRequestSchema,
  LoginResponseSchema,
  MeResponseSchema,
} from "./auth";

describe("LoginRequestSchema", () => {
  test("正常なメールとパスワードを受け入れる", () => {
    const result = safeParse(LoginRequestSchema, {
      email: "admin@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  test("無効なメールアドレスを拒否する", () => {
    const result = safeParse(LoginRequestSchema, {
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  test("空のパスワードを拒否する", () => {
    const result = safeParse(LoginRequestSchema, {
      email: "admin@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginResponseSchema", () => {
  test("message を含むレスポンスを受け入れる", () => {
    const result = safeParse(LoginResponseSchema, {
      message: "Login successful",
    });
    expect(result.success).toBe(true);
  });
});

describe("MeResponseSchema", () => {
  test("id と email を含むレスポンスを受け入れる", () => {
    const result = safeParse(MeResponseSchema, {
      id: "cm5abc123",
      email: "admin@example.com",
    });
    expect(result.success).toBe(true);
  });

  test("id が欠けている場合を拒否する", () => {
    const result = safeParse(MeResponseSchema, {
      email: "admin@example.com",
    });
    expect(result.success).toBe(false);
  });
});
