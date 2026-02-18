import { describe, expect, test } from "vitest";
import { isAllowedOrigin } from "./cors";

describe("isAllowedOrigin", () => {
  test("完全一致するオリジンを許可する", () => {
    expect(
      isAllowedOrigin("https://survey.nisshi.dev", "https://survey.nisshi.dev")
    ).toBe(true);
  });

  test("一致しないオリジンを拒否する", () => {
    expect(
      isAllowedOrigin("https://evil.com", "https://survey.nisshi.dev")
    ).toBe(false);
  });

  test("カンマ区切りの複数オリジンのいずれかに一致すれば許可する", () => {
    const allowed =
      "https://survey.nisshi.dev,https://nisshi-dev-survey-*.vercel.app";
    expect(isAllowedOrigin("https://survey.nisshi.dev", allowed)).toBe(true);
  });

  test("ワイルドカードパターンに一致する Vercel プレビュー URL を許可する", () => {
    const allowed =
      "https://survey.nisshi.dev,https://nisshi-dev-survey-*.vercel.app";
    expect(
      isAllowedOrigin("https://nisshi-dev-survey-abc123.vercel.app", allowed)
    ).toBe(true);
  });

  test("ワイルドカードパターンに一致しないオリジンを拒否する", () => {
    const allowed = "https://nisshi-dev-survey-*.vercel.app";
    expect(
      isAllowedOrigin("https://evil-nisshi-dev-survey-x.vercel.app", allowed)
    ).toBe(false);
  });

  test("空文字の allowedOrigins で全オリジンを拒否する", () => {
    expect(isAllowedOrigin("https://survey.nisshi.dev", "")).toBe(false);
  });

  test("allowedOrigins 内のスペースをトリムして比較する", () => {
    const allowed =
      "https://survey.nisshi.dev , https://nisshi-dev-survey-*.vercel.app";
    expect(isAllowedOrigin("https://survey.nisshi.dev", allowed)).toBe(true);
  });
});
