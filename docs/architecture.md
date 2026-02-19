# アーキテクチャ・技術仕様

## 構成概要

フロントエンドと API は別リポジトリに完全分離されている。

| | フロントエンド | API（本リポ） |
|---|---|---|
| リポジトリ | `nisshi-dev-survey` | `nisshi-dev-survey-api` |
| ドメイン | survey.nisshi.dev | api.survey.nisshi.dev |
| デプロイ先 | Vercel | Cloudflare Workers |
| Framework | Vite（SPA） | Hono |

## 技術スタック

| レイヤー | 技術 | 役割 |
|---|---|---|
| バックエンド | Hono | REST API サーバー |
| バリデーション | Valibot | スキーマベースの型安全なバリデーション・型ガード（SSoT） |
| API ドキュメント | hono-openapi + @hono/swagger-ui | Valibot スキーマから OpenAPI 3.1 自動生成 + Swagger UI |
| 認証 | better-auth | Google OAuth、セッション管理、メール許可リスト |
| DB | Prisma Postgres + Prisma ORM 7 | マネージド PostgreSQL（`@prisma/adapter-pg` で直接接続） |
| メール送信 | Resend | 回答コピーメールのトランザクショナル送信 |
| テスト | Vitest 4.x | TDD ベースのユニットテスト |
| デプロイ | Cloudflare Workers | `wrangler deploy` |

## プロジェクト構造

```
src/
├── index.ts             # Hono app エントリ
├── dev.ts               # 開発サーバー（@hono/node-server）
├── worker.ts            # Cloudflare Workers エントリ（env ブリッジ）
├── schema/              # Valibot スキーマ（SSoT）
├── lib/                 # ユーティリティ
├── middleware/           # ミドルウェア
├── routes/              # ルートハンドラ
├── generated/prisma/    # Prisma Client（.gitignore 済み）
prisma/
├── schema.prisma
└── migrations/
scripts/
├── generate-openapi.ts
└── seed-admin.ts
```

## API エンドポイント

### 回答者向け（認証不要）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/survey/:id` | アンケート取得（status=active のみ） |
| POST | `/api/survey/:id/submit` | 回答送信 |

### 管理者向け（要認証）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/admin/auth/me` | セッション確認（後方互換） |
| GET/POST | `/api/admin/auth/*` | better-auth 認証エンドポイント（Google OAuth フロー等） |
| GET | `/api/admin/surveys` | アンケート一覧 |
| POST | `/api/admin/surveys` | アンケート作成 |
| GET | `/api/admin/surveys/:id` | アンケート詳細 |
| PUT | `/api/admin/surveys/:id` | アンケート内容更新 |
| PATCH | `/api/admin/surveys/:id` | ステータス更新 |
| DELETE | `/api/admin/surveys/:id` | アンケート削除 |
| GET | `/api/admin/surveys/:id/responses` | 回答一覧 |
| POST | `/api/admin/surveys/:id/data-entries` | データエントリ作成 |
| PUT | `/api/admin/surveys/:id/data-entries/:entryId` | データエントリ更新 |
| DELETE | `/api/admin/surveys/:id/data-entries/:entryId` | データエントリ削除 |

### データ投入 API（API キー認証）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/data/surveys` | アンケート作成 |
| GET | `/api/data/surveys` | アンケート一覧 |
| GET | `/api/data/surveys/:id` | アンケート詳細 |
| POST | `/api/data/surveys/:id/responses` | 回答一括投入 |
| GET | `/api/data/surveys/:id/data-entries` | データエントリ一覧 |
| POST | `/api/data/surveys/:id/data-entries` | データエントリ作成 |

### その他

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/doc` | OpenAPI JSON |
| GET | `/api/ui` | Swagger UI |

## 認証フロー

better-auth ライブラリを使用した Google OAuth 認証。

```
1. ブラウザ → GET /api/admin/auth/sign-in/social (provider=google)
   → better-auth: Google OAuth フローにリダイレクト
   → Google 認証後、コールバックで better-auth がユーザー作成/ログイン処理
   → databaseHooks: AllowedEmail テーブルで許可メールか検証（未登録なら拒否）
   → 成功: Session + Cookie 設定

2. ブラウザ → GET /api/admin/surveys/* (Cookie: better-auth セッション)
   → adminAuth ミドルウェア: auth.api.getSession({ headers }) でセッション検証
   → 有効: c.set("user", { id, email }) → next()
   → 無効/なし: 401 { error: "Unauthorized" }
```

- 認証ライブラリ: better-auth（Prisma アダプター + Google OAuth ソーシャルプロバイダー）
- メール許可リスト: `AllowedEmail` テーブルに事前登録されたメールのみログイン可能
- Cookie: `SameSite=None`, `Secure=true`（cross-origin 対応）
- セッション管理: better-auth が自動管理（DB 保存）

## 環境変数

- `DATABASE_URL` — PostgreSQL 接続 URL（Prisma Postgres）
- `ALLOWED_ORIGINS` — CORS 許可オリジン（カンマ区切り、ワイルドカード `*` 対応。例: `https://survey.nisshi.dev,https://nisshi-dev-survey-*.vercel.app`）
- `RESEND_API_KEY` — Resend API キー（回答コピーメール送信に使用）
- `RESEND_FROM_EMAIL` — 送信元メールアドレス（未設定時は Resend サンドボックスの `onboarding@resend.dev`）
- `NISSHI_DEV_SURVEY_API_KEY` — データ投入 API の認証キー（`X-API-Key` ヘッダーで送信）
- `GOOGLE_CLIENT_ID` — Google OAuth クライアント ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth クライアントシークレット
- `BETTER_AUTH_SECRET` — better-auth の暗号化シークレット（最低 32 文字）
- `BETTER_AUTH_URL` — better-auth のベース URL（例: `https://nisshi-dev-survey-api.nisshi.workers.dev`）
- `ADMIN_EMAIL` — 許可メールアドレス（`db:seed` 用）

## Cloudflare Workers デプロイ

- `npm run deploy`（`wrangler deploy`）でデプロイ
- シークレットは `wrangler secret put <NAME>` で設定
- `wrangler.toml` で `nodejs_compat` フラグを有効化（`node:crypto`, `node:net` 等の利用に必要）
- Workers エントリポイント: `src/worker.ts`（env ブリッジミドルウェア → `src/index.ts` に委譲）

## 開発ワークフロー

```
ターミナル1（API）:
  cd nisshi-dev-survey-api && npm run dev  # localhost:3000

ターミナル2（フロント）:
  cd nisshi-dev-survey && npm run dev      # localhost:5173 → /api proxy → :3000
```

### API 変更時の型同期フロー

1. API リポで変更・デプロイ
2. API リポで `npm run generate:openapi` → `openapi.json` 生成
3. `openapi.json` をフロントリポにコピー
4. フロントリポで `npm run generate:client` → SWR hooks 再生成
