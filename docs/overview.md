# nisshi-dev Survey — 要件定義・仕様

## 何をするアプリか

nisshi-dev Survey は **Google Forms の軽量版** のようなアンケート収集アプリ。
管理者がアンケートを作成し、固定 URL を共有して回答を集める。

## 想定ユーザー

| ロール | 説明 |
|---|---|
| 管理者 | アンケートの作成・回答の閲覧を行う。初期は自分1人だが、将来的に複数人管理を想定 |
| 回答者 | 共有された URL からアンケートに回答する。アカウント登録不要。誰でも何度でも回答可能 |
| 外部ツール | API Key 認証でデータ投入 API（`/api/data/*`）を利用。Claude Code 等からアンケート作成・データエントリ作成・回答投入を行う |

## ユーザーフロー

### 管理者

1. Google アカウントでログイン（事前登録済みメールアドレスのみ）
2. ダッシュボードでアンケートを作成（パラメータ定義も設定可能）
3. パラメータ定義がある場合、詳細画面でデータエントリ（値セット）を作成し、エントリ固有の URL を配布
4. 集まった回答をダッシュボードで閲覧（データエントリ単位でフィルタ・比較可能）

### 回答者

1. 配布された専用 URL（`/survey/:id?entry=:entryId`）にアクセス
2. アンケートに回答して送信
3. 完了

## データモデル

| モデル | 説明 |
|---|---|
| Survey | アンケート。タイトル・説明（Markdown、任意）・ステータス（draft/active/completed）・質問定義・パラメータ定義を持つ |
| SurveyDataEntry | データエントリ。Survey のパラメータ定義に基づく値セット。エントリごとに固有の URL を発行して配布する |
| Response | 回答。どのアンケート・データエントリに対する回答かを紐付け。パラメータ値も非正規化して保存 |
| User | 管理者アカウント（better-auth 管理）。Google OAuth でログイン |
| Session | ログインセッション（better-auth 管理）。有効期限付き |
| Account | OAuth アカウント連携情報（better-auth 管理） |
| Verification | メール検証トークン（better-auth 管理） |
| AllowedEmail | ログイン許可メールアドレス。事前登録済みのメールのみ OAuth ログイン可能 |

### パラメータ

Survey にはパラメータ定義を設定できる。パラメータは URL クエリパラメータとしてアンケート URL に埋め込まれ、回答と一緒に保存される。

| フィールド | 型 | 説明 |
|---|---|---|
| key | string | URL パラメータ名（英数字 + `_` `-` のみ） |
| label | string | 管理画面・回答画面での表示名 |
| visible | boolean | `true` の場合、回答者に読み取り専用で表示される |

例: `?version=v2&event_date=2026-02-15` のような URL を配布し、どのバージョン・イベントの回答かを識別する。

### データエントリ

データエントリは、パラメータ定義に基づく **具体的な値のセット** である。1つのデータエントリが1つの配布 URL（`/survey/:id?entry=:entryId`）に対応する。

例: パラメータ「バージョン」を定義した場合

| データエントリ | values | 配布 URL |
|---|---|---|
| 1 | `{version: "v1.0"}` | `/survey/xxx?entry=aaa` |
| 2 | `{version: "v2.0"}` | `/survey/xxx?entry=bbb` |

パラメータが列の定義、データエントリが行のデータという関係。

### リレーション

```
Survey 1 --> * SurveyDataEntry
Survey 1 --> * Response
SurveyDataEntry 1 --> * Response
User 1 --> * Session
User 1 --> * Account
```

## 認証方式

| 対象 | 方式 |
|---|---|
| 回答者 | 認証なし。URL を知っていれば誰でも回答可能 |
| 管理者 | Google OAuth（better-auth）→ セッション Cookie。`AllowedEmail` に事前登録済みのメールアドレスのみログイン可能 |
