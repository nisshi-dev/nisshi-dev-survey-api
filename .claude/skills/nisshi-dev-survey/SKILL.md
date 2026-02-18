---
name: nisshi-dev-survey
description: nisshi-dev Survey のデータ投入 API を使ってアンケートを作成し、回答データを投入する。アンケート設計からデータ投入まで一気通貫で支援する。
---

# nisshi-dev Survey データ投入スキル

外部から nisshi-dev Survey のアンケートデータを作成・投入するための API リファレンスとワークフロー。

## ワークフロー

### 全体の流れ

1. **アンケート設計** — `/designing-surveys` スキルを使って効果的なアンケートを設計する
2. **アンケート作成** — `POST /api/data/surveys` でアンケートを作成
3. **データエントリ作成**（任意） — `POST /api/data/surveys/:id/data-entries` で配布単位を作成
4. **回答投入** — `POST /api/data/surveys/:id/responses` でデータを一括送信
5. **確認** — 管理画面（`/admin/surveys/:id`）で回答を確認

### Step 1: アンケート設計

まず `/designing-surveys` スキルを呼び出してアンケートを設計する。以下を決定する:

- **目的**: 何を測定・収集するか
- **質問設計**: 各質問が1つのことだけを聞くようにする（ダブルバレル質問を避ける）
- **回答タイプの選択**: text / radio / checkbox を適切に使い分ける
- **パラメータ設計**: バージョン別・イベント別等の比較分析が必要か

### Step 2〜5: API でデータ投入

設計が固まったら、以下の API リファレンスに従ってデータを投入する。

## 前提条件

- `NISSHI_DEV_SURVEY_API_KEY` 環境変数が Survey サーバーに設定されていること
- API Base URL: `http://localhost:5173/api/data`（ローカル開発時）

## 認証

すべてのリクエストに `X-API-Key` ヘッダーが必要:

```
X-API-Key: <NISSHI_DEV_SURVEY_API_KEY の値>
```

## データスキーマ

### 質問タイプ（3種）

```jsonc
// テキスト入力
{ "type": "text", "id": "q1", "label": "ご意見をお聞かせください", "required": false }

// 単一選択（ラジオボタン）
{ "type": "radio", "id": "q2", "label": "満足度は？", "options": ["満足", "普通", "不満"], "required": true }

// 複数選択（チェックボックス）
{ "type": "checkbox", "id": "q3", "label": "利用機能", "options": ["機能A", "機能B", "機能C"], "required": false }

// 「その他（自由入力）」付き
{ "type": "radio", "id": "q4", "label": "好きなエディタ", "options": ["VS Code", "Vim"], "allowOther": true }
```

- `required`: 必須かどうか（省略時は `false`）。`true` の場合、回答フォームで未回答だと送信できない
- `allowOther`: 「その他（自由入力）」オプションを追加するか（省略時は `false`）。radio / checkbox でのみ有効。回答者が「その他」を選ぶと自由記述テキストがそのまま回答値として保存される

### パラメータ（params）

アンケートにメタデータキーを定義し、データエントリや回答時に値を付与できる:

```jsonc
// アンケート作成時の params 定義
"params": [
  { "key": "version", "label": "バージョン", "visible": true },
  { "key": "team", "label": "チーム", "visible": false }
]
```

- `key`: 英数字・ハイフン・アンダースコアのみ (`/^[a-zA-Z0-9_-]+$/`)
- `label`: 表示名
- `visible`: 回答者に表示するかどうか

### データエントリ（SurveyDataEntry）

パラメータ定義に基づく具体的な値のセット。1つのデータエントリ = 1つの配布 URL。

```jsonc
// データエントリ作成時
{ "values": { "version": "v2.0", "team": "backend" }, "label": "v2.0 Backend チーム" }
```

回答を投入する際に `dataEntryId` を指定すると、そのエントリに紐付けられる。

## API エンドポイント

### 1. アンケート作成

```
POST /api/data/surveys
```

リクエストボディ:

```json
{
  "title": "開発者体験アンケート 2026Q1",
  "description": "## 目的\n四半期ごとの開発者体験を調査します。",
  "questions": [
    { "type": "radio", "id": "satisfaction", "label": "総合満足度は？", "options": ["とても満足", "満足", "普通", "不満", "とても不満"] },
    { "type": "checkbox", "id": "tools", "label": "よく使うツールは？", "options": ["VS Code", "JetBrains", "Vim/Neovim", "その他"] },
    { "type": "text", "id": "feedback", "label": "自由記述" }
  ],
  "params": [
    { "key": "team", "label": "チーム", "visible": false }
  ],
  "status": "active"
}
```

- `status`: `"draft"`（デフォルト）または `"active"` を指定可能
- `description`: Markdown 形式対応（最大 10,000 文字）

レスポンス (201): `{ id, title, description, status, createdAt, questions, params }`

### 2. アンケート一覧取得

```
GET /api/data/surveys
```

レスポンス (200): `{ surveys: [{ id, title, status, createdAt }] }`

### 3. アンケート詳細取得

```
GET /api/data/surveys/:id
```

レスポンス (200): アンケート情報 + `dataEntries` 配列（各エントリの `id`, `surveyId`, `values`, `label`, `responseCount`, `createdAt`）

### 4. データエントリ作成

```
POST /api/data/surveys/:id/data-entries
```

リクエストボディ:

```json
{
  "values": { "team": "backend" },
  "label": "Backend チーム"
}
```

- `values` のキーはアンケートのパラメータ定義（`params[].key`）と一致する必要がある
- `label` は任意（最大 200 文字）

レスポンス (201): `{ id, surveyId, values, label, responseCount, createdAt }`

### 5. データエントリ一覧取得

```
GET /api/data/surveys/:id/data-entries
```

レスポンス (200): `{ dataEntries: [{ id, surveyId, values, label, responseCount, createdAt }] }`

### 6. 回答一括送信

```
POST /api/data/surveys/:id/responses
```

注意: アンケートが `status: "active"` の場合のみ回答可能。

リクエストボディ:

```json
{
  "responses": [
    {
      "answers": {
        "satisfaction": "満足",
        "tools": ["VS Code", "Vim/Neovim"],
        "feedback": "開発環境が改善されました"
      },
      "dataEntryId": "entry-1"
    },
    {
      "answers": {
        "satisfaction": "普通",
        "tools": ["JetBrains"],
        "feedback": ""
      },
      "params": { "team": "frontend" }
    }
  ]
}
```

- `responses` 配列: 1件以上必須
- `answers`: キーは質問の `id`、値はテキスト回答(string)または複数選択(string[])
- `dataEntryId`: 省略可。データエントリに紐付ける場合に指定
- `params`: 省略可。dataEntryId を使わずに直接パラメータ値を指定する場合

レスポンス (201): `{ count: <投入件数> }`

## curl 例

```bash
# 1. アンケート作成
curl -X POST http://localhost:5173/api/data/surveys \
  -H "X-API-Key: $NISSHI_DEV_SURVEY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "テストアンケート",
    "questions": [{"type": "text", "id": "q1", "label": "感想"}],
    "params": [{"key": "event", "label": "イベント", "visible": true}],
    "status": "active"
  }'

# 2. データエントリ作成
curl -X POST http://localhost:5173/api/data/surveys/SURVEY_ID/data-entries \
  -H "X-API-Key: $NISSHI_DEV_SURVEY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"values": {"event": "GENkaigi 2026"}, "label": "GENkaigi 2026"}'

# 3. 回答一括送信（dataEntryId 付き）
curl -X POST http://localhost:5173/api/data/surveys/SURVEY_ID/responses \
  -H "X-API-Key: $NISSHI_DEV_SURVEY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      {"answers": {"q1": "とても良かった"}, "dataEntryId": "ENTRY_ID"},
      {"answers": {"q1": "改善の余地あり"}, "dataEntryId": "ENTRY_ID"}
    ]
  }'

# 4. アンケート詳細確認（データエントリ・回答数含む）
curl http://localhost:5173/api/data/surveys/SURVEY_ID \
  -H "X-API-Key: $NISSHI_DEV_SURVEY_API_KEY"
```

## 質問設計のベストプラクティス

- **質問 ID**: 意味のある短い英語名を使う（`satisfaction`, `tools`, `feedback`）
- **ラジオ**: 相互排他的な選択肢。5段階以下が望ましい
- **チェックボックス**: 複数選択が自然な場合に使用
- **テキスト**: 自由記述には必ず1つは入れる
- **1質問1テーマ**: ダブルバレル質問（「速度と安定性」を1つの質問で聞く等）を避ける
- **選択肢の数**: モバイルでスクロールせずに見える範囲に収める

詳しくは `/designing-surveys` スキルを参照。
