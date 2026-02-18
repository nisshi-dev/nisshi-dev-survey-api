---
name: hono
description: Hono CLI を使った効率的な Hono アプリケーション開発。ドキュメント検索、API リファレンス参照、リクエストテスト、バンドル最適化をサポート。
---

# Hono スキル

Hono CLI（`@hono/cli`）を使って Hono アプリケーションを効率的に開発する。

## セットアップ

npx でグローバルインストール不要で使用可能:

```bash
npx @hono/cli <command>
```

グローバルインストール（任意）:

```bash
npm install -g @hono/cli
```

## AI 向けコマンド

### 1. ドキュメント検索

```bash
hono search "<query>" --pretty
```

Hono の API や機能を検索する。`--pretty` で読みやすい出力にする。

### 2. ドキュメント参照

```bash
hono docs [path]
```

検索結果で見つかったパスの詳細ドキュメントを表示する。

**例:**

```bash
hono docs /docs/api/context
hono docs /docs/api/hono
hono docs /docs/helpers/factory
```

### 3. リクエストテスト

```bash
# GET リクエスト
hono request [file] -P /path

# POST リクエスト
hono request [file] -X POST -P /api/users -d '{"name": "test"}'

# ヘッダー付きリクエスト
hono request [file] -H "Authorization: Bearer token" -P /api/protected
```

内部で `app.request()` を使用するため、HTTP サーバーの起動は不要。

### 4. 最適化・バンドル

```bash
# バンドル最適化
hono optimize [entry] -o dist/index.js

# ミニファイ付き
hono optimize [entry] -o dist/index.js --minify

# ターゲット指定（cloudflare-workers, deno 等）
hono optimize [entry] -t cloudflare-workers
```

## 開発ワークフロー

1. **調査**: `hono search` → `hono docs` で API や機能を調べる
2. **実装**: コードを書く
3. **テスト**: `hono request` でエンドポイントをテストする
4. **最適化**: 必要に応じて `hono optimize` で本番ビルドを最適化する

## ガイドライン

- 不慣れな API を実装する前に必ず `hono search` で検索する
- `hono search` では `--pretty` フラグを使う（デフォルト出力は JSON）
- `hono request` は HTTP サーバーを起動せずに動作する
- ミドルウェアの使い方は `hono search "middleware name"` で検索する
