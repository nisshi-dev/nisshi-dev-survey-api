# リスト管理

抑制リスト、リスト衛生、データ保持によるメールリストのクリーンな維持。

## 抑制リスト

メールを送信すべきでないアドレスへの送信を防ぐリスト。

### 抑制すべき対象

| 理由 | アクション | 抑制解除可能？ |
|--------|--------|-----------------|
| ハードバウンス | 即座に追加 | 不可（アドレスが無効） |
| 苦情（スパム） | 即座に追加 | 不可（法的要件） |
| ソフトバウンス（3 回） | 閾値後に追加 | 可（30〜90 日後） |
| 手動削除要求 | 要求時に追加 | ユーザーが再要求した場合のみ |

### 実装

```typescript
// 抑制リストのスキーマ
interface SuppressionEntry {
  email: string;
  reason: 'hard_bounce' | 'complaint' | 'unsubscribe' | 'soft_bounce' | 'manual';
  created_at: Date;
  source_email_id?: string; // トリガーとなったメール
}

// すべての送信前にチェック
async function canSendTo(email: string): Promise<boolean> {
  const suppressed = await db.suppressions.findOne({ email });
  return !suppressed;
}

// 抑制リストに追加
async function suppressEmail(email: string, reason: string, sourceId?: string) {
  await db.suppressions.upsert({
    email: email.toLowerCase(),
    reason,
    created_at: new Date(),
    source_email_id: sourceId,
  });
}
```

### 送信前チェック

**送信前に必ず抑制リストをチェックする:**

```typescript
async function sendEmail(to: string, emailData: EmailData) {
  if (!await canSendTo(to)) {
    console.log(`Skipping suppressed email: ${to}`);
    return { skipped: true, reason: 'suppressed' };
  }

  return await resend.emails.send({ to, ...emailData });
}
```

## リスト衛生

リストを健全に保つための定期メンテナンス。

### 自動クリーンアップ

| タスク | 頻度 | アクション |
|------|-----------|--------|
| ハードバウンスの削除 | リアルタイム（Webhook 経由） | 即座に抑制 |
| 苦情の削除 | リアルタイム（Webhook 経由） | 即座に抑制 |
| 配信停止の処理 | リアルタイム | マーケティングリストから削除 |
| ソフトバウンスの確認 | 日次 | 3 回失敗で抑制 |
| 非アクティブの削除 | 月次 | 再エンゲージメント → 削除 |

詳細: https://resend.com/docs/knowledge-base/audience-hygiene

### 再エンゲージメントキャンペーン

非アクティブな購読者を削除する前に:

1. **非アクティブの特定:** 45〜90 日間開封/クリックなし
2. **再エンゲージメントメールの送信:** 「お見逃しなく」「まだ興味がありますか？」
3. **14〜30 日間待つ**
4. **無応答者をアクティブリストから削除**

```typescript
async function runReengagement() {
  const inactive = await getInactiveSubscribers(90); // 90 日

  for (const subscriber of inactive) {
    if (!subscriber.reengagement_sent) {
      await sendReengagementEmail(subscriber);
      await markReengagementSent(subscriber.email);
    } else if (daysSince(subscriber.reengagement_sent) > 30) {
      await removeFromMarketingLists(subscriber.email);
    }
  }
}
```

## データ保持

### メールログ

| データ種別 | 推奨保持期間 | 備考 |
|-----------|----------------------|-------|
| 送信試行 | 90 日 | デバッグ、分析 |
| 配信ステータス | 90 日 | コンプライアンス、レポート |
| バウンス/苦情イベント | 3 年 | CASL で要求 |
| 抑制リスト | 無期限 | 削除不可 |
| メールコンテンツ | 30 日 | ストレージコスト |
| 同意記録 | 期限切れ後 3 年 | 法的要件 |

### 保持ポリシーの実装

```typescript
// 日次クリーンアップジョブ
async function cleanupOldData() {
  const now = new Date();

  // 古いメールログを削除（90 日保持）
  await db.emailLogs.deleteMany({
    created_at: { $lt: subDays(now, 90) }
  });

  // 古いメールコンテンツを削除（30 日保持）
  await db.emailContent.deleteMany({
    created_at: { $lt: subDays(now, 30) }
  });

  // 削除不可: 抑制リスト、同意記録
}
```

## 監視すべきメトリクス

| メトリクス | 目標 | アラート閾値 |
|--------|--------|-----------------|
| バウンス率 | < 2% | > 2% |
| 苦情率 | < 0.05% | > 0.05% |
| 抑制リストの増加 | 安定 | 急激な増加 |

## トランザクショナル vs マーケティングリスト

**別々に管理する:**
- トランザクショナル: アカウント関係のあるすべてのユーザーに送信可能
- マーケティング: オプトイン済みの購読者のみ

**抑制は両方に適用:** ハードバウンスと苦情はすべてのメールの種類で抑制。

**配信停止はマーケティングのみ:** マーケティングの配信停止をしたユーザーでも、トランザクショナルメール（パスワードリセット、注文確認）は引き続き受信可能。

## 関連

- [Webhook とイベント](./webhooks-events.md) - バウンス/苦情の通知を受信
- [到達性](./deliverability.md) - リスト衛生が送信者レピュテーションに与える影響
- [法令遵守](./compliance.md) - データ保持の法的要件
