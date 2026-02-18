# Webhook とイベント

メール配信イベントのリアルタイム受信と処理。

## イベントの種類

| イベント | 発火タイミング | 用途 |
|-------|------------|---------|
| `email.sent` | Resend がメールを受け付けた時 | 送信開始の確認 |
| `email.delivered` | 受信者のサーバーにメールが配信された時 | 配信の確認 |
| `email.bounced` | メールがバウンスした時（ハードまたはソフト） | リスト衛生、アラート |
| `email.complained` | 受信者がスパムとして報告した時 | 即座に配信停止 |
| `email.opened` | 受信者がメールを開封した時 | エンゲージメント追跡 |
| `email.clicked` | 受信者がリンクをクリックした時 | エンゲージメント追跡 |

## Webhook のセットアップ

### 1. エンドポイントの作成

エンドポイントの要件:
- POST リクエストを受け付ける
- 素早く 2xx ステータスを返す（5 秒以内）
- 重複イベントを処理する（冪等な処理）

```typescript
app.post('/webhooks/resend', async (req, res) => {
  // 受信確認のため即座に 200 を返す
  res.status(200).send('OK');

  // 非同期で処理
  processWebhookAsync(req.body).catch(console.error);
});
```

### 2. 署名の検証

なりすまし防止のため、必ず Webhook の署名を検証する。

```typescript
import { Webhook } from 'svix';

const webhook = new Webhook(process.env.RESEND_WEBHOOK_SECRET);

app.post('/webhooks/resend', (req, res) => {
  try {
    const payload = webhook.verify(
      JSON.stringify(req.body),
      {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      }
    );
    // 検証済みペイロードを処理
  } catch (err) {
    return res.status(400).send('Invalid signature');
  }
});
```

### 3. Webhook URL の登録

Resend ダッシュボードまたは API で Webhook エンドポイントを設定する。

## イベントの処理

### バウンスの処理

```typescript
async function handleBounce(event) {
  const { email_id, email, bounce_type } = event.data;

  if (bounce_type === 'hard') {
    // 恒久的な失敗 - すべてのリストから削除
    await suppressEmail(email, 'hard_bounce');
    await removeFromAllLists(email);
  } else {
    // ソフトバウンス - 追跡し、閾値で削除
    await incrementSoftBounce(email);
    const count = await getSoftBounceCount(email);
    if (count >= 3) {
      await suppressEmail(email, 'soft_bounce_limit');
    }
  }
}
```

### 苦情の処理

```typescript
async function handleComplaint(event) {
  const { email } = event.data;

  // 即座に抑制 - 例外なし
  await suppressEmail(email, 'complaint');
  await removeFromAllLists(email);
  await logComplaint(event); // 分析用
}
```

### 配信確認

```typescript
async function handleDelivered(event) {
  const { email_id } = event.data;
  await updateEmailStatus(email_id, 'delivered');
}
```

## 冪等な処理

Webhook は複数回送信される可能性がある。イベント ID を使用して重複処理を防止する。

```typescript
async function processWebhook(event) {
  const eventId = event.id;

  // 処理済みかチェック
  if (await isEventProcessed(eventId)) {
    return; // 重複をスキップ
  }

  // イベントを処理
  await handleEvent(event);

  // 処理済みとしてマーク
  await markEventProcessed(eventId);
}
```

## エラーハンドリング

### リトライの動作

エンドポイントが 2xx 以外を返すと、Webhook は指数バックオフでリトライされる:
- リトライ 1: 約 30 秒後
- リトライ 2: 約 1 分後
- リトライ 3: 約 5 分後
- （約 24 時間継続）

### ベストプラクティス

- **素早く 200 を返す** - タイムアウトを避けるため非同期で処理
- **冪等にする** - 重複配信をグレースフルに処理
- **すべてをログに記録** - デバッグ用に生のイベントを保存
- **失敗をアラート** - Webhook 処理エラーを監視
- **キューで処理** - 複雑な処理にはジョブキューを使用

## Webhook のテスト

**ローカル開発:** ngrok などを使用して localhost を公開する。

```bash
ngrok http 3000
# ngrok の URL を Webhook エンドポイントとして使用
```

**処理の検証:** Resend ダッシュボードからテストイベントを送信するか、各イベントタイプを手動でトリガーする。

## データ保存のための Webhook 取り込み
- [オープンソースリポジトリ](https://github.com/resend/resend-webhooks-ingester)
- [データ保存の理由](https://resend.com/docs/dashboard/webhooks/how-to-store-webhooks-data)

## 関連

- [リスト管理](./list-management.md) - バウンス/苦情データの活用
- [送信の信頼性](./sending-reliability.md) - 送信失敗時のリトライロジック
