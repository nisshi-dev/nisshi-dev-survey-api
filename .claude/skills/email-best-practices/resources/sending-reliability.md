# 送信の信頼性

メールの確実な 1 回だけの送信と、障害時のグレースフルな処理。

## 冪等性

失敗したリクエストのリトライ時に重複メールを防止する。

### 問題

ネットワーク障害、タイムアウト、サーバーエラーにより、メールが送信されたかどうか不確実になることがある。冪等性なしでリトライすると重複送信のリスクがある。

### 解決策: 冪等キー

各リクエストに一意のキーを送信する。同じキーが再送された場合、サーバーは別のメールを送信せず、元のレスポンスを返す。

```typescript
// ビジネスイベントに基づいて決定論的なキーを生成
const idempotencyKey = `password-reset-${userId}-${resetRequestId}`;

await resend.emails.send({
  from: 'noreply@example.com',
  to: user.email,
  subject: 'Reset your password',
  html: emailHtml,
}, {
  headers: {
    'Idempotency-Key': idempotencyKey
  }
});
```

### キー生成戦略

| 戦略 | 例 | 使用場面 |
|----------|---------|----------|
| イベントベース | `order-confirm-${orderId}` | イベントごとに 1 通のメール（推奨） |
| リクエストスコープ | `reset-${userId}-${resetRequestId}` | 同一リクエスト内のリトライ |
| UUID | `crypto.randomUUID()` | 自然なキーがない場合（一度生成し、リトライで再利用） |

**ベストプラクティス:** ビジネスイベントに基づく決定論的キーを使用する。同じ論理的な送信をリトライする場合、同じキーが生成される必要がある。試行ごとに新しく生成される `Date.now()` やランダム値は避ける。

**キーの有効期限:** 冪等キーは通常 24 時間キャッシュされる。この期間内のリトライは元のレスポンスを返す。期限切れ後に同じキーを使用すると新しい送信がトリガーされるため、リトライロジックは 24 時間以内に完了させること。

## リトライロジック

指数バックオフによる一時的な障害の処理。

### リトライすべきケース

| エラーの種類 | リトライ？ | 備考 |
|------------|--------|-------|
| 5xx（サーバーエラー） | ✅ する | 一時的、解消する可能性が高い |
| 429（レート制限） | ✅ する | レート制限ウィンドウを待つ |
| 4xx（クライアントエラー） | ❌ しない | まずリクエストを修正 |
| ネットワークタイムアウト | ✅ する | 一時的 |
| DNS 障害 | ✅ する | 一時的の可能性あり |

### 指数バックオフ

```typescript
async function sendWithRetry(emailData, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await resend.emails.send(emailData);
    } catch (error) {
      if (!isRetryable(error) || attempt === maxRetries - 1) {
        throw error;
      }
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      await sleep(delay + Math.random() * 1000); // ジッターを追加
    }
  }
}

function isRetryable(error) {
  return error.statusCode >= 500 ||
         error.statusCode === 429 ||
         error.code === 'ETIMEDOUT';
}
```

**バックオフスケジュール:** 1s → 2s → 4s → 8s（サンダリングハード防止のためジッター付き）

## エラーハンドリング

### 一般的なエラーコード

| コード | 意味 | アクション |
|------|---------|--------|
| 400 | 不正なリクエスト | ペイロードを修正（無効なメール、必須項目の欠落） |
| 401 | 未認証 | API キーを確認 |
| 403 | 禁止 | 権限、ドメイン認証を確認 |
| 404 | 見つからない | エンドポイント URL を確認 |
| 422 | バリデーションエラー | リクエストデータを修正 |
| 429 | レート制限 | バックオフしてリトライ |
| 500 | サーバーエラー | バックオフしてリトライ |
| 503 | サービス利用不可 | バックオフしてリトライ |

### エラーハンドリングパターン

```typescript
try {
  const result = await resend.emails.send(emailData);
  await logSuccess(result.id, emailData);
} catch (error) {
  if (error.statusCode === 429) {
    await queueForRetry(emailData, error.retryAfter);
  } else if (error.statusCode >= 500) {
    await queueForRetry(emailData);
  } else {
    await logFailure(error, emailData);
    await alertOnCriticalEmail(emailData); // パスワードリセットなど重要なメール向け
  }
}
```

## 信頼性のためのキューイング

重要なメールには、初回送信が失敗しても配信を保証するためにキューを使用する。

**メリット:**
- アプリケーションの再起動を生き残る
- 自動リトライ処理
- レート制限管理
- 監査証跡

**シンプルなパターン:**
1. メールを「pending」ステータスでキュー/データベースに書き込み
2. キューを処理、送信を試行
3. 成功時: 「sent」としてマーク、メッセージ ID を保存
4. リトライ可能な失敗時: リトライ回数を増加、リトライをスケジュール
5. 恒久的な失敗時: 「failed」としてマーク、アラート

## タイムアウト

ハングするリクエストを防ぐために適切なタイムアウトを設定する。

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  await resend.emails.send(emailData, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

**推奨:** メール API 呼び出しには 10〜30 秒。

## 関連

- [Webhook とイベント](./webhooks-events.md) - 配信確認と失敗の処理
- [リスト管理](./list-management.md) - バウンスの処理と無効アドレスの抑制
