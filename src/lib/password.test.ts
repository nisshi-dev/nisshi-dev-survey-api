import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  test("salt:hash 形式の文字列を返す", async () => {
    const hash = await hashPassword("mypassword");
    const parts = hash.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]?.length).toBeGreaterThan(0);
    expect(parts[1]?.length).toBeGreaterThan(0);
  });

  test("同じパスワードでも毎回異なるハッシュを生成する", async () => {
    const hash1 = await hashPassword("mypassword");
    const hash2 = await hashPassword("mypassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  test("正しいパスワードで true を返す", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("correct-password", hash);
    expect(result).toBe(true);
  });

  test("誤ったパスワードで false を返す", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });
});
