---
name: vi-utilities
description: vi ヘルパー: モック関数、タイマー、ユーティリティ
---

# Vi ユーティリティ

`vi` ヘルパーはモックおよびユーティリティ関数を提供する。

```ts
import { vi } from 'vitest'
```

## モック関数

```ts
// モックを作成
const fn = vi.fn()
const fnWithImpl = vi.fn((x) => x * 2)

// モックかどうかを確認
vi.isMockFunction(fn) // true

// モックのメソッド
fn.mockReturnValue(42)
fn.mockReturnValueOnce(1)
fn.mockResolvedValue(data)
fn.mockRejectedValue(error)
fn.mockImplementation(() => 'result')
fn.mockImplementationOnce(() => 'once')

// クリア／リセット
fn.mockClear()    // 呼び出し履歴をクリア
fn.mockReset()    // 履歴 + 実装をクリア
fn.mockRestore()  // 元の実装を復元（スパイ用）
```

## スパイ

```ts
const obj = { method: () => 'original' }

const spy = vi.spyOn(obj, 'method')
obj.method()

expect(spy).toHaveBeenCalled()

// 実装のモック
spy.mockReturnValue('mocked')

// getter/setter のスパイ
vi.spyOn(obj, 'prop', 'get').mockReturnValue('value')

// コンストラクタの監視（4.0 新機能）
vi.spyOn(globalThis, 'Request')
const req = new Request('https://example.com')
expect(globalThis.Request).toHaveBeenCalledWith('https://example.com')
```

## モジュールモック

```ts
// ファイル先頭に巻き上げられる
vi.mock('./module', () => ({
  fn: vi.fn(),
}))

// 部分モック
vi.mock('./module', async (importOriginal) => ({
  ...(await importOriginal()),
  specificFn: vi.fn(),
}))

// スパイモード - 実装を維持
vi.mock('./module', { spy: true })

// モック内で実際のモジュールをインポート
const actual = await vi.importActual('./module')

// モックとしてインポート
const mocked = await vi.importMock('./module')
```

## 動的モック

```ts
// 巻き上げされない - 動的インポートと併用
vi.doMock('./config', () => ({ key: 'value' }))
const config = await import('./config')

// モック解除
vi.doUnmock('./config')
vi.unmock('./module') // 巻き上げされる
```

## モジュールリセット

```ts
// モジュールキャッシュをクリア
vi.resetModules()

// 動的インポートの完了を待機
await vi.dynamicImportSettled()
```

## フェイクタイマー

```ts
vi.useFakeTimers()

setTimeout(() => console.log('done'), 1000)

// 時間を進める
vi.advanceTimersByTime(1000)
vi.advanceTimersByTimeAsync(1000)  // 非同期コールバック用
vi.advanceTimersToNextTimer()
vi.advanceTimersToNextFrame()      // requestAnimationFrame

// すべてのタイマーを実行
vi.runAllTimers()
vi.runAllTimersAsync()
vi.runOnlyPendingTimers()

// タイマーをクリア
vi.clearAllTimers()

// 状態を確認
vi.getTimerCount()
vi.isFakeTimers()

// 復元
vi.useRealTimers()
```

## 日付／時刻のモック

```ts
vi.setSystemTime(new Date('2024-01-01'))
expect(new Date().getFullYear()).toBe(2024)

vi.getMockedSystemTime()  // モックされた日付を取得
vi.getRealSystemTime()    // 実際の時刻を取得（ミリ秒）
```

## グローバル／環境変数のモック

```ts
// グローバルをスタブ
vi.stubGlobal('fetch', vi.fn())
vi.unstubAllGlobals()

// 環境変数をスタブ
vi.stubEnv('API_KEY', 'test')
vi.stubEnv('NODE_ENV', 'test')
vi.unstubAllEnvs()
```

## 巻き上げコード

インポートより前にコードを実行する:

```ts
const mock = vi.hoisted(() => vi.fn())

vi.mock('./module', () => ({
  fn: mock, // 巻き上げされた変数を参照可能
}))
```

## 待機ユーティリティ

```ts
// コールバックが成功するまで待機
await vi.waitFor(async () => {
  const el = document.querySelector('.loaded')
  expect(el).toBeTruthy()
}, { timeout: 5000, interval: 100 })

// truthy な値が返るまで待機
const element = await vi.waitUntil(
  () => document.querySelector('.loaded'),
  { timeout: 5000 }
)
```

## モックオブジェクト

オブジェクトのすべてのメソッドをモックする:

```ts
const original = {
  method: () => 'real',
  nested: { fn: () => 'nested' },
}

const mocked = vi.mockObject(original)
mocked.method()  // undefined（モック済み）
mocked.method.mockReturnValue('mocked')

// スパイモード
const spied = vi.mockObject(original, { spy: true })
spied.method()  // 'real'
expect(spied.method).toHaveBeenCalled()
```

## テスト設定

```ts
vi.setConfig({
  testTimeout: 10_000,
  hookTimeout: 10_000,
})

vi.resetConfig()
```

## グローバルモック管理

```ts
vi.clearAllMocks()   // すべてのモックの呼び出し履歴をクリア
vi.resetAllMocks()   // リセット + 実装をクリア
vi.restoreAllMocks() // 元の実装を復元（4.0: vi.spyOn のスパイのみ対象）
```

## vi.mocked 型ヘルパー

モックされた値の TypeScript ヘルパー:

```ts
import { myFn } from './module'
vi.mock('./module')

// モック型としてキャスト
vi.mocked(myFn).mockReturnValue('typed')

// ディープモック
vi.mocked(myModule, { deep: true })

// 部分モックの型付け
vi.mocked(fn, { partial: true }).mockResolvedValue({ ok: true })
```

## 4.0 でのモック動作変更

| 項目 | 3.x | 4.x |
|------|-----|-----|
| `vi.fn().getMockName()` | `"spy"` | `""（空文字列）` |
| `vi.restoreAllMocks()` | 全モック対象 | `vi.spyOn` のスパイのみ |
| `mock.invocationCallOrder` | 0 始まり | 1 始まり |
| `mock.settledResults` | 完了後に追加 | 呼び出し直後に `{ type: 'incomplete' }` で populate |
| コンストラクタ監視 | 未サポート | `vi.fn` / `vi.spyOn` でサポート |

## ポイント

- `vi.mock` は巻き上げされる - 動的モックには `vi.doMock` を使用
- `vi.hoisted` でモックファクトリ内から変数を参照可能
- 既存メソッドの監視には `vi.spyOn` を使用
- フェイクタイマーは明示的なセットアップとティアダウンが必要
- `vi.waitFor` はアサーションが通るまでリトライする
- 4.0: `vi.fn` / `vi.spyOn` でコンストラクタ呼び出しを監視可能
- 4.0: `vi.restoreAllMocks()` は `vi.spyOn` で作成したスパイのみ復元

<!--
Source references:
- https://vitest.dev/api/vi.html
-->
