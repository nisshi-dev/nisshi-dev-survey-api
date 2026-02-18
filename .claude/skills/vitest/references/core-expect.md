---
name: expect-api
description: マッチャー、非対称マッチャー、カスタムマッチャーによるアサーション
---

# Expect API

Vitest は Jest 互換 API を備えた Chai アサーションを使用する。

## 基本アサーション

```ts
import { expect, test } from 'vitest'

test('assertions', () => {
  // 等値比較
  expect(1 + 1).toBe(2)              // 厳密等価（===）
  expect({ a: 1 }).toEqual({ a: 1 }) // ディープ等価

  // 真偽値
  expect(true).toBeTruthy()
  expect(false).toBeFalsy()
  expect(null).toBeNull()
  expect(undefined).toBeUndefined()
  expect('value').toBeDefined()

  // 数値
  expect(10).toBeGreaterThan(5)
  expect(10).toBeGreaterThanOrEqual(10)
  expect(5).toBeLessThan(10)
  expect(0.1 + 0.2).toBeCloseTo(0.3, 5)

  // 文字列
  expect('hello world').toMatch(/world/)
  expect('hello').toContain('ell')

  // 配列
  expect([1, 2, 3]).toContain(2)
  expect([{ a: 1 }]).toContainEqual({ a: 1 })
  expect([1, 2, 3]).toHaveLength(3)

  // オブジェクト
  expect({ a: 1, b: 2 }).toHaveProperty('a')
  expect({ a: 1, b: 2 }).toHaveProperty('a', 1)
  expect({ a: { b: 1 } }).toHaveProperty('a.b', 1)
  expect({ a: 1 }).toMatchObject({ a: 1 })

  // 型
  expect('string').toBeTypeOf('string')
  expect(new Date()).toBeInstanceOf(Date)
})
```

## 否定

```ts
expect(1).not.toBe(2)
expect({ a: 1 }).not.toEqual({ a: 2 })
```

## エラーアサーション

```ts
// 同期エラー — 関数でラップする
expect(() => throwError()).toThrow()
expect(() => throwError()).toThrow('message')
expect(() => throwError()).toThrow(/pattern/)
expect(() => throwError()).toThrow(CustomError)

// 非同期エラー — rejects を使用する
await expect(asyncThrow()).rejects.toThrow('error')
```

## Promise アサーション

```ts
// resolves
await expect(Promise.resolve(1)).resolves.toBe(1)
await expect(fetchData()).resolves.toEqual({ data: true })

// rejects
await expect(Promise.reject('error')).rejects.toBe('error')
await expect(failingFetch()).rejects.toThrow()
```

## スパイ/モックアサーション

```ts
const fn = vi.fn()
fn('arg1', 'arg2')
fn('arg3')

expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledTimes(2)
expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
expect(fn).toHaveBeenLastCalledWith('arg3')
expect(fn).toHaveBeenNthCalledWith(1, 'arg1', 'arg2')

expect(fn).toHaveReturned()
expect(fn).toHaveReturnedWith(value)
```

## 非対称マッチャー

`toEqual`、`toHaveBeenCalledWith` 等の内部で使用する:

```ts
expect({ id: 1, name: 'test' }).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
})

expect({ a: 1, b: 2, c: 3 }).toEqual(
  expect.objectContaining({ a: 1 })
)

expect([1, 2, 3, 4]).toEqual(
  expect.arrayContaining([1, 3])
)

expect('hello world').toEqual(
  expect.stringContaining('world')
)

expect('hello world').toEqual(
  expect.stringMatching(/world$/)
)

expect({ value: null }).toEqual({
  value: expect.anything() // null/undefined 以外のすべてにマッチ
})

// expect.not で否定
expect([1, 2]).toEqual(
  expect.not.arrayContaining([3])
)
```

## ソフトアサーション

失敗してもテストを続行する:

```ts
expect.soft(1).toBe(2) // テストを失敗としてマークするが続行する
expect.soft(2).toBe(3) // こちらも実行される
// すべての失敗が最後にレポートされる
```

## ポーリングアサーション

パスするまでリトライする:

```ts
await expect.poll(() => fetchStatus()).toBe('ready')

await expect.poll(
  () => document.querySelector('.element'),
  { interval: 100, timeout: 5000 }
).toBeTruthy()
```

## アサーション回数の検証

```ts
test('async assertions', async () => {
  expect.assertions(2) // 正確に2つのアサーションが実行されること

  await doAsync((data) => {
    expect(data).toBeDefined()
    expect(data.id).toBe(1)
  })
})

test('at least one', () => {
  expect.hasAssertions() // 少なくとも1つのアサーションが実行されること
})
```

## マッチャーの拡張

```ts
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    return {
      pass,
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
    }
  },
})

test('custom matcher', () => {
  expect(100).toBeWithinRange(90, 110)
})
```

## スナップショットアサーション

```ts
expect(data).toMatchSnapshot()
expect(data).toMatchInlineSnapshot(`{ "id": 1 }`)
await expect(result).toMatchFileSnapshot('./expected.json')

expect(() => throw new Error('fail')).toThrowErrorMatchingSnapshot()
```

## Chai Assert（4.0 新機能）

```ts
// expect.assert で Chai の assert 機能に直接アクセス（型の絞り込みに便利）
const value: string | number = getValue()
expect.assert(typeof value === 'string', 'value should be a string')
// ここ以降、value は string として型推論される
expect(value.toUpperCase()).toBe('HELLO')
```

## スキーママッチング（4.0 新機能）

Standard Schema v1 に準拠する Zod/Valibot/ArkType でバリデーション:

```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
})

test('API response matches schema', async () => {
  const user = await fetchUser(1)
  expect(user).toMatchSchema(UserSchema)
})
```

## ビジュアルリグレッション（4.0 新機能、ブラウザモード）

```ts
// スクリーンショットのキャプチャと比較
await expect(page.locator('.card')).toMatchScreenshot()

// 要素がビューポート内にあることを検証（IntersectionObserver ベース）
await expect(page.locator('.header')).toBeInViewport()
await expect(page.locator('.section')).toBeInViewport({ ratio: 0.5 })
```

## 重要ポイント

- プリミティブには `toBe`、オブジェクト/配列には `toEqual` を使用する
- `toStrictEqual` は undefined プロパティや配列のスパース性もチェックする
- 非同期アサーション（`resolves`、`rejects`、`poll`）は必ず `await` する
- 並行テストでは正しいトラッキングのためにコンテキストの `expect` を使用する
- `toThrow` は同期コードを関数でラップする必要がある
- 4.0: `expect.assert` で Chai assert + 型の絞り込み
- 4.0: `toMatchSchema` で Standard Schema v1 バリデーション
- 4.0: `toMatchScreenshot` / `toBeInViewport` でビジュアルリグレッション（ブラウザモード）

<!--
Source references:
- https://vitest.dev/api/expect.html
-->
