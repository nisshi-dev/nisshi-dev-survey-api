# コーディングルール

本リポジトリには自動リンター（Biome/ultracite）は設定されていない。
以下のルールをコーディング時の指針とする。

---

## フォーマット

| 項目 | 設定値 |
|---|---|
| インデント | タブ |
| 改行コード | LF |
| セミコロン | あり |
| アロー関数の括弧 | 常にあり `(x) => ...` |

---

## TypeScript ルール

### 複雑さ（complexity）

- `forEach` 禁止 → `for...of` を使う
- 不要な `catch`・`constructor`・`continue` を禁止
- オプショナルチェーン・アロー関数を推奨

### 正確性（correctness）

- 未使用の変数・未使用の import は残さない
- `const` への再代入禁止
- `isNaN()` を使い `=== NaN` と比較しない
- `parseInt` には基数を渡す

### パフォーマンス

- ループ内でのスプレッド蓄積（`...spread`）禁止
- バレルファイル（`index.ts` で re-export）禁止
- `delete` 演算子禁止（`undefined` を代入する）

### セキュリティ

- 動的コード実行（`Function` コンストラクタ等）禁止

### スタイル

- **`enum` 禁止** → ユニオン型や `as const` を使う
- **ネストした三項演算子禁止**
- **非 null アサーション（`!`）禁止**
- `var` 禁止 → `const` / `let`
- 型定義は `type` より **`interface`** を優先
- ファイル名は **kebab-case**（ASCII 必須）
- `import type` / `export type` を適切に使う
- ブロック文（`{}`）を常に使用（省略禁止）
- テンプレートリテラルを推奨

### 疑わしいコード（suspicious）

- `debugger` 禁止
- `any` の明示的使用は避ける
- `==` 禁止 → `===` を使う
- `@ts-ignore` 禁止 → `@ts-expect-error` を使う
- 空のブロック文禁止
- `console` は **許可**

---

## ファイル別の例外

| 対象 | 緩和ルール |
|---|---|
| テストファイル（`*.test.*`, `*.spec.*`） | 認知的複雑度・`console`・`any` を許可 |
| スクリプト（`scripts/`） | `console`・`process.env` を許可 |
| 型定義ファイル（`*.d.ts`） | 未使用変数・未宣言変数を許可 |
