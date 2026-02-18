# nisshi-dev Survey API

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/?to=/:account/workers/services/view/nisshi-dev-survey-api)
[![Hono](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

アンケート作成・回答収集 API サーバー。

| | URL |
|---|---|
| Production | https://nisshi-dev-survey-api.nisshi.workers.dev |
| Health Check | https://nisshi-dev-survey-api.nisshi.workers.dev/health |
| Swagger UI | https://nisshi-dev-survey-api.nisshi.workers.dev/ui |
| Cloudflare Dashboard | [Workers > nisshi-dev-survey-api](https://dash.cloudflare.com/45e74bc4f7c04a2b396544c4b7c72812/workers/services/view/nisshi-dev-survey-api/production) |

## 技術スタック

| レイヤー | 技術 |
|---|---|
| API | [Hono](https://hono.dev) |
| DB | [Prisma](https://www.prisma.io) ORM 7 + PostgreSQL（`@prisma/adapter-pg`） |
| バリデーション | [Valibot](https://valibot.dev) |
| API ドキュメント | hono-openapi + Swagger UI |
| メール送信 | [Resend](https://resend.com) |
| テスト | [Vitest](https://vitest.dev) 4.x |
| デプロイ | [Cloudflare Workers](https://workers.cloudflare.com) |
| リント・フォーマット | [Ultracite](https://github.com/haydenbleasel/ultracite)（Biome） |

## セットアップ

```bash
npm install
cp .dev.vars.example .dev.vars  # 環境変数を設定
npm run db:migrate              # マイグレーション適用
npm run db:seed                 # 管理者ユーザー作成
```

## 開発

```bash
npm run dev       # wrangler dev でローカルサーバー起動
npm test          # Vitest ウォッチモード
npm run test:run  # テスト1回実行
```

## デプロイ

```bash
# シークレット設定（初回のみ）
wrangler secret put DATABASE_URL
wrangler secret put RESEND_API_KEY
wrangler secret put NISSHI_DEV_SURVEY_API_KEY

# デプロイ
npm run deploy
```

`ALLOWED_ORIGINS` と `RESEND_FROM_EMAIL` は `wrangler.jsonc` の `vars` で管理。

## 環境変数

| 変数 | 説明 | 設定先 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 接続 URL | secret |
| `RESEND_API_KEY` | Resend API キー | secret |
| `NISSHI_DEV_SURVEY_API_KEY` | データ投入 API の認証キー | secret |
| `ALLOWED_ORIGINS` | CORS 許可オリジン（カンマ区切り、`*` ワイルドカード対応） | `wrangler.jsonc` vars |
| `RESEND_FROM_EMAIL` | メール送信元アドレス | `wrangler.jsonc` vars |
| `ADMIN_EMAIL` | 管理者メールアドレス（seed 用） | `.dev.vars` |
| `ADMIN_PASSWORD` | 管理者パスワード（seed 用） | `.dev.vars` |

## API エンドポイント

### 回答者向け（認証不要）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/survey/:id` | アンケート取得 |
| POST | `/survey/:id/submit` | 回答送信 |

### 管理者向け（セッション Cookie 認証）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/admin/auth/login` | ログイン |
| POST | `/admin/auth/logout` | ログアウト |
| GET | `/admin/auth/me` | セッション確認 |
| GET | `/admin/surveys` | アンケート一覧 |
| POST | `/admin/surveys` | アンケート作成 |
| GET | `/admin/surveys/:id` | アンケート詳細 |
| PUT | `/admin/surveys/:id` | アンケート内容更新 |
| PATCH | `/admin/surveys/:id` | ステータス更新 |
| DELETE | `/admin/surveys/:id` | アンケート削除 |
| GET | `/admin/surveys/:id/responses` | 回答一覧 |

### データ投入 API（`X-API-Key` ヘッダー認証）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/data/surveys` | アンケート作成 |
| GET | `/data/surveys` | アンケート一覧 |
| GET | `/data/surveys/:id` | アンケート詳細 |
| POST | `/data/surveys/:id/responses` | 回答一括投入 |
| POST | `/data/surveys/:id/data-entries` | データエントリ作成 |

### ユーティリティ

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/health` | ヘルスチェック |
| GET | `/doc` | OpenAPI JSON |
| GET | `/ui` | Swagger UI |

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/overview.md](docs/overview.md) | 要件定義・仕様 |
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ・技術仕様 |
| [docs/coding-rules.md](docs/coding-rules.md) | コーディングルール |
| [docs/validation.md](docs/validation.md) | バリデーション方針（Valibot） |
| [docs/git-guidelines.md](docs/git-guidelines.md) | Git ガイドライン |

## 関連リポジトリ

| リポジトリ | ドメイン | 説明 |
|---|---|---|
| [`nisshi-dev-survey`](https://github.com/nisshi-dev/nisshi-dev-survey) | survey.nisshi.dev | フロントエンド（Vite SPA） |
| `nisshi-dev-survey-api` | nisshi-dev-survey-api.nisshi.workers.dev | API サーバー（本リポ） |
