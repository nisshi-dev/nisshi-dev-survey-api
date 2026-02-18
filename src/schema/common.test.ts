import { safeParse } from "valibot";
import { describe, expect, test } from "vitest";
import { IdParamSchema } from "./common";

describe("IdParamSchema", () => {
  test("cuid 形式の文字列を受け入れる", () => {
    const result = safeParse(IdParamSchema, {
      id: "cm5abc123def456ghi789",
    });
    expect(result.success).toBe(true);
  });

  test("空文字を拒否する", () => {
    const result = safeParse(IdParamSchema, { id: "" });
    expect(result.success).toBe(false);
  });

  test("id が未指定の場合を拒否する", () => {
    const result = safeParse(IdParamSchema, {});
    expect(result.success).toBe(false);
  });
});
