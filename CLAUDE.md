# nisshi-dev Survey API

nisshi-dev Survey の API サーバー。Hono + Prisma + Valibot で実装。
フロントエンドリポジトリ: `nisshi-dev-survey`

## docs

| ドキュメント | 内容 |
|---|---|
| [docs/overview.md](docs/overview.md) | 要件定義・仕様 |
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ・技術仕様 |
| [docs/git-guidelines.md](docs/git-guidelines.md) | Git ガイドライン |
| [docs/coding-rules.md](docs/coding-rules.md) | コーディングルール |
| [docs/validation.md](docs/validation.md) | バリデーション・型ガード方針（Valibot） |

## アーキテクチャ

フロントエンドとAPIは別リポジトリに分離されている。

| | フロントエンド | API |
|---|---|---|
| リポジトリ | `nisshi-dev-survey` | `nisshi-dev-survey-api`（本リポ） |
| ドメイン | survey.nisshi.dev | api.survey.nisshi.dev |
| デプロイ先 | Vercel | Cloudflare Workers |

## 開発手法: TDD（テスト駆動開発）

**このプロジェクトでは TDD を必須とする。** 機能実装・バグ修正のすべてにおいて、実装コードより先にテストを書くこと。

### エージェントへの指示

1. **コードを書く前に `/test-driven-development` スキルを呼び出す** — TDD のルールとワークフローがロードされる
2. **テストの書き方は `/vitest` スキルを参照する** — Vitest 4.x の API・モック・設定の詳細が得られる
3. **Red → Green → Refactor のサイクルを厳守する**
   - RED: 失敗するテストを書き、`npm run test:run` で失敗を確認
   - GREEN: テストを通す最小限のコードを書き、成功を確認
   - REFACTOR: テストをグリーンに保ちながらコードを整理
4. **テストなしにプロダクションコードを書かない（例外なし）**
5. **テストは `npm run test:run` で実行し、結果を確認してから次に進む**

## 開発コマンド

### 開発

- `npm run dev` — 開発サーバー起動（`wrangler dev`）

### テスト

- `npm test` — Vitest をウォッチモードで起動
- `npm run test:run` — テストを1回実行（CI 向け）

### データベース（`db:*`）

- `npm run db:generate` — Prisma Client 生成
- `npm run db:migrate` — マイグレーション作成・適用（開発用）
- `npm run db:migrate:deploy` — マイグレーション適用のみ（本番/CI 用）
- `npm run db:studio` — Prisma Studio 起動（ブラウザで DB を閲覧・編集）
- `npm run db:seed` — 管理者ユーザー作成（`ADMIN_EMAIL`, `ADMIN_PASSWORD` 環境変数が必要）

### コード生成

- `npm run generate:openapi` — OpenAPI JSON をファイルに出力（要: `npm run dev` 起動中）

## 環境変数

- `DATABASE_URL` — PostgreSQL 接続 URL
- `ALLOWED_ORIGIN` — CORS 許可オリジン（本番: `https://survey.nisshi.dev`）
- `RESEND_API_KEY` — Resend API キー（回答コピーメール送信に使用）
- `RESEND_FROM_EMAIL` — 送信元メールアドレス
- `NISSHI_DEV_SURVEY_API_KEY` — データ投入 API の認証キー
- `ADMIN_EMAIL` — 管理者ユーザーのメールアドレス（`db:seed` 用）
- `ADMIN_PASSWORD` — 管理者ユーザーのパスワード（`db:seed` 用）

## Cloudflare Workers デプロイ

- `npm run deploy` — `wrangler deploy --minify` でデプロイ
- シークレットは `wrangler secret put <NAME>` で設定（`DATABASE_URL`, `ALLOWED_ORIGIN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NISSHI_DEV_SURVEY_API_KEY`）
- `nodejs_compat` フラグにより `node:crypto`, `node:net` 等の Node.js API を利用可能

## ドキュメント管理

- 詳細なドキュメントは `docs/` に置く。CLAUDE.md には概要とリンクのみ記載する
- コード変更時に、関連する CLAUDE.md や docs/ の記述が実態と合っているか確認し、古くなっていれば更新する
  - 例: API ルート追加 → docs/architecture.md の API 一覧を更新
  - 例: データモデル変更 → docs/overview.md のデータモデル節を更新
  - 例: 開発コマンド変更 → CLAUDE.md の開発コマンド節を更新
