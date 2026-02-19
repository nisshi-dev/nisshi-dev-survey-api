import { safeParse } from "valibot";
import { describe, expect, test } from "vitest";
import { MeResponseSchema } from "./auth";

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
