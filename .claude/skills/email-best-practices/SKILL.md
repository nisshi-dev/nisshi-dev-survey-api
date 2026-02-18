---
name: email-best-practices
description: メール機能の実装、迷惑メール対策、高バウンス率の改善、SPF/DKIM/DMARC 認証の設定、メールアドレス収集の実装、法令遵守（特定電子メール法・CAN-SPAM・GDPR・CASL）、Webhook 処理、リトライロジック、トランザクショナル vs マーケティングの判断に使用。
---

# メールベストプラクティス

到達性・法令遵守・ユーザー体験に優れたメールを構築するためのガイド。

## アーキテクチャ概要

```
[ユーザー] → [メールフォーム] → [バリデーション] → [ダブルオプトイン]
                                              ↓
                                    [同意の記録]
                                              ↓
[抑制リストチェック] ←──────────────[送信準備完了]
        ↓
[冪等送信 + リトライ] ──────→ [メール API]
                                       ↓
                              [Webhook イベント]
                                       ↓
              ┌────────┬────────┬─────────────┐
              ↓        ↓        ↓             ↓
           配信成功  バウンス  苦情      開封/クリック
                       ↓        ↓
              [抑制リスト更新]
                       ↓
              [リスト衛生ジョブ]
```

## クイックリファレンス

| やりたいこと | 参照先 |
|------------|-----|
| SPF/DKIM/DMARC の設定、迷惑メール対策 | [到達性](./resources/deliverability.md) |
| パスワードリセット、OTP、確認メールの実装 | [トランザクショナルメール](./resources/transactional-emails.md) |
| アプリに必要なメールの計画 | [トランザクショナルメールカタログ](./resources/transactional-email-catalog.md) |
| ニュースレター登録フォーム、メールバリデーション | [メールアドレス収集](./resources/email-capture.md) |
| ニュースレター、プロモーションの送信 | [マーケティングメール](./resources/marketing-emails.md) |
| CAN-SPAM/GDPR/CASL/特定電子メール法への準拠 | [法令遵守](./resources/compliance.md) |
| トランザクショナル vs マーケティングの判断 | [メールの種類](./resources/email-types.md) |
| リトライ、冪等性、エラーハンドリング | [送信の信頼性](./resources/sending-reliability.md) |
| 配信イベントの処理、Webhook の設定 | [Webhook とイベント](./resources/webhooks-events.md) |
| バウンス・苦情・抑制リストの管理 | [リスト管理](./resources/list-management.md) |

## ここから始める

**新規アプリの場合**
まず[カタログ](./resources/transactional-email-catalog.md)でアプリに必要なメール（パスワードリセット、メール認証等）を計画し、最初のメール送信前に[到達性](./resources/deliverability.md)（DNS 認証）を設定する。

**迷惑メールに分類される場合**
まず[到達性](./resources/deliverability.md)を確認する。認証の問題が最も一般的な原因。Gmail/Yahoo は未認証メールを拒否する。

**マーケティングメールの場合**
次の順で進める: [メールアドレス収集](./resources/email-capture.md)（同意の取得） → [法令遵守](./resources/compliance.md)（法的要件） → [マーケティングメール](./resources/marketing-emails.md)（ベストプラクティス）。

**本番環境対応の送信基盤**
信頼性を追加する: [送信の信頼性](./resources/sending-reliability.md)（リトライ + 冪等性） → [Webhook とイベント](./resources/webhooks-events.md)（配信追跡） → [リスト管理](./resources/list-management.md)（バウンス処理）。
