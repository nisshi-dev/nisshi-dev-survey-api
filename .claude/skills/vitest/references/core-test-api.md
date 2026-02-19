---
name: test-api
description: テスト定義のための test/it 関数と修飾子
---

# Test API

## 基本的なテスト

```ts
import { expect, test } from 'vitest'

test('adds numbers', () => {
  expect(1 + 1).toBe(2)
})

// エイリアス: it
import { it } from 'vitest'

it('works the same', () => {
  expect(true).toBe(true)
})
```

## 非同期テスト

```ts
test('async test', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// Promise は自動的に await される
test('returns promise', () => {
  return fetchData().then(result => {
    expect(result).toBeDefined()
  })
})
```

## テストオプション

```ts
// タイムアウト（デフォルト: 5000ms）
test('slow test', async () => {
  // ...
}, 10_000)

// オプションオブジェクト（4.0: オプションは必ず第2引数。第3引数は不可）
test('with options', { timeout: 10_000, retry: 2 }, async () => {
  // ...
})

// ⚠️ 4.0 で削除: test('name', fn, options) 形式は使えない
// ✗ test('name', () => {}, { timeout: 10_000 })
// ✓ test('name', { timeout: 10_000 }, () => {})
```

## テスト修飾子

### テストのスキップ

```ts
test.skip('skipped test', () => {
  // 実行されない
})

// 条件付きスキップ
test.skipIf(process.env.CI)('not in CI', () => {})
test.runIf(process.env.CI)('only in CI', () => {})

// コンテキストによる動的スキップ
test('dynamic skip', ({ skip }) => {
  skip(someCondition, 'reason')
  // ...
})
```

### テストのフォーカス

```ts
test.only('only this runs', () => {
  // ファイル内の他のテストはスキップされる
})
```

### Todo テスト

```ts
test.todo('implement later')

test.todo('with body', () => {
  // 実行されないが、レポートに表示される
})
```

### 失敗を期待するテスト

```ts
test.fails('expected to fail', () => {
  expect(1).toBe(2) // アサーションが失敗するのでテストはパスする
})
```

### 並行テスト

```ts
// テストを並列実行する
test.concurrent('test 1', async ({ expect }) => {
  // 並行テストではコンテキストの expect を使用する
  expect(await fetch1()).toBe('result')
})

test.concurrent('test 2', async ({ expect }) => {
  expect(await fetch2()).toBe('result')
})
```

### 逐次テスト

```ts
// 並行コンテキスト内で逐次実行を強制する
test.sequential('must run alone', async () => {})
```

## パラメータ化テスト

### test.each

```ts
test.each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
])('add(%i, %i) = %i', (a, b, expected) => {
  expect(a + b).toBe(expected)
})

// オブジェクトを使用
test.each([
  { a: 1, b: 1, expected: 2 },
  { a: 1, b: 2, expected: 3 },
])('add($a, $b) = $expected', ({ a, b, expected }) => {
  expect(a + b).toBe(expected)
})

// テンプレートリテラル
test.each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
`('add($a, $b) = $expected', ({ a, b, expected }) => {
  expect(a + b).toBe(expected)
})
```

### test.for

`.each` より推奨 — 配列を自動展開しない:

```ts
test.for([
  [1, 1, 2],
  [1, 2, 3],
])('add(%i, %i) = %i', ([a, b, expected], { expect }) => {
  // 第2引数は TestContext
  expect(a + b).toBe(expected)
})
```

## テストコンテキスト

第1引数でコンテキストユーティリティを提供する:

```ts
test('with context', ({ expect, skip, task }) => {
  console.log(task.name)   // テスト名
  skip(someCondition)      // 動的にスキップ
  expect(1).toBe(1)        // コンテキストに紐づいた expect
})
```

## フィクスチャを使用したカスタムテスト

```ts
import { test as base } from 'vitest'

const test = base.extend({
  db: async ({}, use) => {
    const db = await createDb()
    await use(db)
    await db.close()
  },
})

test('query', async ({ db }) => {
  const users = await db.query('SELECT * FROM users')
  expect(users).toBeDefined()
})
```

## リトライ設定

```ts
test('flaky test', { retry: 3 }, async () => {
  // 失敗時に最大3回リトライする
})

// 詳細なリトライオプション
test('with delay', {
  retry: {
    count: 3,
    delay: 1000,
    condition: /timeout/i, // タイムアウトエラーの場合のみリトライ
  },
}, async () => {})
```

## タグ

```ts
test('database test', { tags: ['db', 'slow'] }, async () => {})

// 実行: vitest --tags db
```

## 重要ポイント

- 本体のないテストは `todo` としてマークされる
- `test.only` は CI では `allowOnly: true` でない限りエラーになる
- 並行テストやスナップショットではコンテキストの `expect` を使用する
- 第1引数に関数を渡すと、その関数名がテスト名として使用される
- 4.0: 第3引数でのオプション指定（`test('name', fn, options)`）は廃止

<!--
Source references:
- https://vitest.dev/api/test.html
-->
