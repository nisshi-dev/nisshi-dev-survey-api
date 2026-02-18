import { describe, expect, test } from "vitest";
import { buildResponseEmailHtml } from "./email";

describe("buildResponseEmailHtml", () => {
  test("タイトル・質問・回答を含む HTML を生成する", async () => {
    const questions: any[] = [{ type: "text", id: "q1", label: "お名前" }];
    const answers: Record<string, string | string[]> = { q1: "田中太郎" };

    const html = await buildResponseEmailHtml(
      "テストアンケート",
      questions,
      answers
    );

    expect(html).toContain("テストアンケート");
    expect(html).toContain("お名前");
    expect(html).toContain("田中太郎");
  });

  test("質問番号 (Q1, Q2...) を正確に付与する", async () => {
    const questions: any[] = [
      { type: "text", id: "q1", label: "質問1" },
      { type: "text", id: "q2", label: "質問2" },
      { type: "text", id: "q3", label: "質問3" },
    ];
    const answers: Record<string, string | string[]> = {
      q1: "回答1",
      q2: "回答2",
      q3: "回答3",
    };

    const html = await buildResponseEmailHtml("アンケート", questions, answers);

    expect(html).toContain("Q1");
    expect(html).toContain("Q2");
    expect(html).toContain("Q3");
  });

  test("checkbox の回答を「、」区切りで結合表示する", async () => {
    const questions: any[] = [
      {
        type: "checkbox",
        id: "q1",
        label: "好きな果物",
        options: ["りんご", "みかん", "バナナ"],
      },
    ];
    const answers: Record<string, string | string[]> = {
      q1: ["りんご", "バナナ"],
    };

    const html = await buildResponseEmailHtml("アンケート", questions, answers);

    expect(html).toContain("りんご、バナナ");
  });

  test("回答がない質問は空文字で表示する", async () => {
    const questions: any[] = [{ type: "text", id: "q1", label: "任意の質問" }];
    const answers: Record<string, string | string[]> = {};

    const html = await buildResponseEmailHtml("アンケート", questions, answers);

    expect(html).toContain("任意の質問");
  });
});
