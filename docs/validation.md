# バリデーション・型ガード方針

## 方針: 型ガードは手書きしない

TypeScript のユーザー定義型ガード（`v is T`）を手書きすることは **禁止** とする。

### 理由

型述語（`v is T`）は実行時チェックと型の絞り込みが分離しているため、実装ミスをコンパイラが検出できない。
型定義を変更してもガード関数の本体を更新し忘れると、「静的には通るがランタイムで壊れる」状態になる。

### このプロジェクトでの対策

**Valibot のスキーマから型と検証関数の両方を導出する（SSoT: Single Source of Truth）。**

## Valibot

[Valibot](https://valibot.dev/) はツリーシェイク可能な軽量スキーマバリデーションライブラリ。
Zod と同等の機能を持ちながら、バンドルサイズが大幅に小さい。

### 技術スタック上の位置づけ

| 用途 | 説明 |
|---|---|
| API リクエストボディの検証 | Hono ルートで `v.safeParse()` を使用 |
| API レスポンスの型定義 | レスポンス型もスキーマから導出 |
| Json カラムの型安全な読み出し | Prisma の `Json` 型（`questions`, `answers`）をスキーマで検証 |
| 型の導出 | `v.InferOutput<typeof Schema>` で型を生成。型定義を別途書かない |

## スキーマファイルの構成

```
src/shared/schema/    # Valibot スキーマ（SSoT）
├── question.ts       # 質問スキーマ・型
├── survey.ts         # アンケートスキーマ・型
└── auth.ts           # 認証スキーマ・型
```

### スキーマファイルの構成例

```ts
// src/shared/schema/question.ts
import * as v from "valibot";

// --- スキーマ定義（SSoT） ---

export const TextQuestionSchema = v.object({
  type: v.literal("text"),
  id: v.string(),
  label: v.string(),
});

export const QuestionSchema = v.variant("type", [
  TextQuestionSchema,
  RadioQuestionSchema,
  CheckboxQuestionSchema,
]);

// --- 型導出 ---

export type Question = v.InferOutput<typeof QuestionSchema>;
```

### サーバーでの使用

```ts
// src/server/routes/survey.ts
import { SubmitAnswersSchema } from "@/shared/schema/survey";

app.post("/:id/submit", async (c) => {
  const body = await c.req.json();
  const result = v.safeParse(SubmitAnswersSchema, body);

  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const { answers } = result.output; // SubmitAnswersInput 型
  // ...
});
```

## Prisma Json カラムの検証

Prisma の `Json` 型は TypeScript 上 `JsonValue`（= `unknown`）になる。
DB から取得した値はスキーマで検証してから使う。

```ts
import { QuestionsSchema } from "@/shared/schema/question";

const survey = await prisma.survey.findUnique({ where: { id } });
if (!survey) { /* 404 */ }

const result = v.safeParse(QuestionsSchema, survey.questions);
if (!result.success) {
  // データ不整合 → エラーハンドリング
}
const questions = result.output; // Question[] 型
```

## ルール

1. **`v is T` 形式のユーザー定義型ガードを手書きしない** — Valibot スキーマを使う
2. **型は `v.InferOutput` で導出する** — `interface` / `type` を別途定義しない
3. **スキーマは `src/shared/schema/` に配置する**
4. **API のリクエスト / レスポンス型もスキーマから導出する**
5. **`v.safeParse()` を使う** — `v.parse()` は例外を投げるため、API ルートでは `safeParse` を優先
6. **単純な型チェック（`null` 除外等）は TypeScript の型推論に任せる** — スキーマが不要なケースまで使わない
