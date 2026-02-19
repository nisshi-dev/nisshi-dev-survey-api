---
name: mocking
description: vi ユーティリティによる関数・モジュール・タイマー・日付のモック
---

# モック

## モック関数

```ts
import { expect, vi } from 'vitest'

// モック関数の作成
const fn = vi.fn()
fn('hello')

expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith('hello')

// 実装付きモック
const add = vi.fn((a, b) => a + b)
expect(add(1, 2)).toBe(3)

// 戻り値のモック
fn.mockReturnValue(42)
fn.mockReturnValueOnce(1).mockReturnValueOnce(2)
fn.mockResolvedValue({ data: true })
fn.mockRejectedValue(new Error('fail'))

// 実装のモック
fn.mockImplementation((x) => x * 2)
fn.mockImplementationOnce(() => 'first call')
```

## オブジェクトのスパイ

```ts
const cart = {
  getTotal: () => 100,
}

const spy = vi.spyOn(cart, 'getTotal')
cart.getTotal()

expect(spy).toHaveBeenCalled()

// 実装のモック
spy.mockReturnValue(200)
expect(cart.getTotal()).toBe(200)

// オリジナルを復元
spy.mockRestore()
```

## モジュールのモック

```ts
// vi.mock はファイルの先頭に巻き上げられる
vi.mock('./api', () => ({
  fetchUser: vi.fn(() => ({ id: 1, name: 'Mock' })),
}))

import { fetchUser } from './api'

test('モックされたモジュール', () => {
  expect(fetchUser()).toEqual({ id: 1, name: 'Mock' })
})
```

### 部分モック

```ts
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    specificFunction: vi.fn(),
  }
})
```

### スパイ付き自動モック

```ts
// 実装はそのままに呼び出しを監視
vi.mock('./calculator', { spy: true })

import { add } from './calculator'

test('モジュールのスパイ', () => {
  const result = add(1, 2) // 実際の実装が実行される
  expect(result).toBe(3)
  expect(add).toHaveBeenCalledWith(1, 2)
})
```

### 手動モック (__mocks__)

```
src/
  __mocks__/
    axios.ts      # 'axios' のモック
  api/
    __mocks__/
      client.ts   # './client' のモック
    client.ts
```

```ts
// ファクトリなしで vi.mock を呼ぶだけ
vi.mock('axios')
vi.mock('./api/client')
```

## 動的モック (vi.doMock)

巻き上げされない — 動的インポートに使用:

```ts
test('動的モック', async () => {
  vi.doMock('./config', () => ({
    apiUrl: 'http://test.local',
  }))

  const { apiUrl } = await import('./config')
  expect(apiUrl).toBe('http://test.local')

  vi.doUnmock('./config')
})
```

## タイマーのモック

```ts
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('タイマー', () => {
  const fn = vi.fn()
  setTimeout(fn, 1000)

  expect(fn).not.toHaveBeenCalled()

  vi.advanceTimersByTime(1000)
  expect(fn).toHaveBeenCalled()
})

// その他のタイマーメソッド
vi.runAllTimers()           // すべての保留中タイマーを実行
vi.runOnlyPendingTimers()   // 現在保留中のもののみ実行
vi.advanceTimersToNextTimer() // 次のタイマーまで進める
```

### 非同期タイマーメソッド

```ts
test('非同期タイマー', async () => {
  vi.useFakeTimers()

  let resolved = false
  setTimeout(() => Promise.resolve().then(() => { resolved = true }), 100)

  await vi.advanceTimersByTimeAsync(100)
  expect(resolved).toBe(true)
})
```

## 日付のモック

```ts
vi.setSystemTime(new Date('2024-01-01'))
expect(new Date().getFullYear()).toBe(2024)

vi.useRealTimers() // 復元
```

## グローバルのモック

```ts
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ json: () => ({ data: 'mock' }) })
))

// 復元
vi.unstubAllGlobals()
```

## 環境変数のモック

```ts
vi.stubEnv('API_KEY', 'test-key')
expect(import.meta.env.API_KEY).toBe('test-key')

// 復元
vi.unstubAllEnvs()
```

## コンストラクタのモック（4.0 新機能）

```ts
// vi.fn でクラスコンストラクタをモック
const MockUser = vi.fn(function (name: string) {
  this.name = name
})

const user = new MockUser('Alice')
expect(MockUser).toHaveBeenCalledWith('Alice')
expect(user.name).toBe('Alice')
expect(MockUser.mock.contexts[0]).toBe(user)

// vi.spyOn でコンストラクタを監視
vi.spyOn(globalThis, 'Request')
const req = new Request('https://example.com')
expect(globalThis.Request).toHaveBeenCalledWith('https://example.com')
```

## モックのクリア

```ts
const fn = vi.fn()
fn()

fn.mockClear()       // 呼び出し履歴をクリア
fn.mockReset()       // 履歴 + 実装をクリア
fn.mockRestore()     // オリジナルを復元（スパイ用）

// グローバル
vi.clearAllMocks()
vi.resetAllMocks()
vi.restoreAllMocks() // 4.0: vi.spyOn で作成したスパイのみ対象（vi.fn は対象外）
```

## 設定による自動リセット

```ts
// vitest.config.ts
defineConfig({
  test: {
    clearMocks: true,    // 各テスト前にクリア
    mockReset: true,     // 各テスト前にリセット
    restoreMocks: true,  // 各テスト後に復元
    unstubEnvs: true,    // 環境変数を復元
    unstubGlobals: true, // グローバルを復元
  },
})
```

## モック用の巻き上げ変数

```ts
const mockFn = vi.hoisted(() => vi.fn())

vi.mock('./module', () => ({
  getData: mockFn,
}))

import { getData } from './module'

test('巻き上げモック', () => {
  mockFn.mockReturnValue('test')
  expect(getData()).toBe('test')
})
```

## 重要ポイント

- `vi.mock` は巻き上げされる — インポートより先に呼ばれる
- 動的な非巻き上げモックには `vi.doMock` を使用
- テスト汚染を防ぐため、モックは必ず復元する
- `{ spy: true }` で実装を保持しつつ呼び出しを追跡
- `vi.hoisted` でモックファクトリ内の変数を参照可能
- 4.0: `vi.fn().getMockName()` のデフォルト値が `"spy"` → `""（空文字列）` に変更
- 4.0: `vi.restoreAllMocks()` は `vi.spyOn` で作成したスパイのみ復元（`vi.fn` は対象外）
- 4.0: `mock.invocationCallOrder` が 1 始まり（3.x では 0 始まり）
- 4.0: `mock.settledResults` が呼び出し直後に `{ type: 'incomplete' }` で即座に populate
- 4.0: `vi.fn` / `vi.spyOn` でコンストラクタ呼び出しの監視をサポート

<!--
Source references:
- https://vitest.dev/guide/mocking.html
- https://vitest.dev/api/vi.html
-->
