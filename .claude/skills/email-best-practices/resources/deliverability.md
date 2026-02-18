# メールの到達性

受信者にメールが正しく配信される確率を最大化する。

## メール認証

**Gmail/Yahoo/Microsoft が要求** — 未認証メールは拒否またはスパムフィルタされる。

### SPF (Sender Policy Framework)

ドメインに代わってメールを送信できるサーバーを指定する。

```
v=spf1 include:amazonses.com ~all
```

- DNS に TXT レコードを追加
- `~all`（ソフトフェイル）を使用

### DKIM (DomainKeys Identified Mail)

メールの真正性を証明する暗号署名。

- メールサービスが TXT レコードを提供する

### DMARC

SPF/DKIM の失敗時のポリシーとレポート。

```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

**ロールアウト:** `p=none`（監視） → `p=quarantine; pct=25` → `p=reject`

詳細: https://resend.com/blog/dmarc-policy-modes

### 設定の確認

DNS レコードを直接確認する:

```bash
# SPF レコード
dig TXT yourdomain.com +short

# DKIM レコード（'resend' を自分のセレクタに置き換え）
dig TXT resend._domainkey.yourdomain.com +short

# DMARC レコード
dig TXT _dmarc.yourdomain.com +short
```

**期待される出力:** 各コマンドが設定済みのレコードを返す。出力がない = レコードが未設定。

## 送信者レピュテーション

### IP ウォーミング

新しい IP/ドメインの場合、送信量を段階的に増やす:

| 週 | 日次送信量 |
|------|-------------|
| 1 | 50〜100 |
| 2 | 200〜500 |
| 3 | 1,000〜2,000 |
| 4 | 5,000〜10,000 |

エンゲージメントの高いユーザーから開始する。一貫して送信する。急がない。

詳細: https://resend.com/docs/knowledge-base/warming-up

### レピュテーションの維持

**すべきこと:** エンゲージメントのあるユーザーに送信、バウンス率 < 4%、苦情率 < 0.1%、非アクティブな購読者を削除。

**してはいけないこと:** 購入したリストへの送信、バウンス/苦情の無視、不規則な送信量

## バウンスの処理

| 種類 | 原因 | アクション |
|------|-------|--------|
| ハードバウンス | 恒久的な配信失敗 | 即座に削除 |
| ソフトバウンス | 一時的な配信失敗 | リトライ: 1h → 4h → 24h、3〜5 回失敗で削除 |

**目標:** < 1% 良好、1〜3% 許容範囲、3〜4% 注意、> 4% 危険

## 苦情の処理

**目標:** < 0.01% 優秀、0.01〜0.05% 良好、> 0.05% 危険

**苦情を減らすには:**
- オプトイン済みのユーザーにのみ送信
- 配信停止を簡単かつ即座に
- 明確な送信者名と From アドレスを使用

**フィードバックループ:** Gmail（Postmaster Tools）、Yahoo、Microsoft SNDS で設定。苦情者を即座に削除。

## インフラ

**専用送信ドメイン:** 送信目的ごとに異なるサブドメインを使用（例: トランザクショナルメールに `t.yourdomain.com`、マーケティングメールに `m.yourdomain.com`）。

**DNS TTL:** セットアップ時は低く（300 秒）、安定後は高く（3600 秒以上）。

## トラブルシューティング

**メールが迷惑メールに分類される場合** 以下の順にチェック:
1. 認証（SPF、DKIM、DMARC）
2. List-Unsubscribe ヘッダー — 2024 年 2 月以降 Gmail/Yahoo が要求（[法令遵守](./compliance.md)を参照）
3. 送信者レピュテーション（ブラックリスト、苦情率）
4. コンテンツ
5. 送信パターン（急激な送信量の増加）

**診断ツール:**
- [Google Postmaster Tools](https://postmaster.google.com) - ドメインレピュテーションとスパム率
- [mail-tester.com](https://www.mail-tester.com) - テストメールを送信して到達性スコアを取得
- [MXToolbox](https://mxtoolbox.com/blacklists.aspx) - ブラックリストのステータスを確認

## 関連

- [リスト管理](./list-management.md) - バウンスと苦情を処理してレピュテーションを保護
- [送信の信頼性](./sending-reliability.md) - リトライロジックとエラーハンドリング
