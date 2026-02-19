---
name: describe-api
description: テストを論理ブロックにグルーピングするための describe/suite
---

# Describe API

関連するテストをスイートにグルーピングし、セットアップを共有する。

## 基本的な使い方

```ts
import { describe, expect, test } from 'vitest'

describe('Math', () => {
  test('adds numbers', () => {
    expect(1 + 1).toBe(2)
  })

  test('subtracts numbers', () => {
    expect(3 - 1).toBe(2)
  })
})

// エイリアス: suite
import { suite } from 'vitest'
suite('equivalent to describe', () => {})
```

## ネストされたスイート

```ts
describe('User', () => {
  describe('when logged in', () => {
    test('shows dashboard', () => {})
    test('can update profile', () => {})
  })

  describe('when logged out', () => {
    test('shows login page', () => {})
  })
})
```

## スイートオプション

```ts
// すべてのテストがオプションを継承する（4.0: オプションは必ず第2引数）
describe('slow tests', { timeout: 30_000 }, () => {
  test('test 1', () => {}) // 30秒のタイムアウト
  test('test 2', () => {}) // 30秒のタイムアウト
})

// ⚠️ 4.0 で削除: describe('name', fn, options) 形式は使えない
```

## スイート修飾子

### スイートのスキップ

```ts
describe.skip('skipped suite', () => {
  test('wont run', () => {})
})

// 条件付き
describe.skipIf(process.env.CI)('not in CI', () => {})
describe.runIf(!process.env.CI)('only local', () => {})
```

### スイートのフォーカス

```ts
describe.only('only this suite runs', () => {
  test('runs', () => {})
})
```

### Todo スイート

```ts
describe.todo('implement later')
```

### 並行スイート

```ts
// すべてのテストが並列実行される
describe.concurrent('parallel tests', () => {
  test('test 1', async ({ expect }) => {})
  test('test 2', async ({ expect }) => {})
})
```

### 並行コンテキスト内での逐次実行

```ts
describe.concurrent('parallel', () => {
  test('concurrent 1', async () => {})

  describe.sequential('must be sequential', () => {
    test('step 1', async () => {})
    test('step 2', async () => {})
  })
})
```

### テスト順序のシャッフル

```ts
describe.shuffle('random order', () => {
  test('test 1', () => {})
  test('test 2', () => {})
  test('test 3', () => {})
})

// オプションで指定する場合
describe('random', { shuffle: true }, () => {})
```

## パラメータ化スイート

### describe.each

```ts
describe.each([
  { name: 'Chrome', version: 100 },
  { name: 'Firefox', version: 90 },
])('$name browser', ({ name, version }) => {
  test('has version', () => {
    expect(version).toBeGreaterThan(0)
  })
})
```

### describe.for

```ts
describe.for([
  ['Chrome', 100],
  ['Firefox', 90],
])('%s browser', ([name, version]) => {
  test('has version', () => {
    expect(version).toBeGreaterThan(0)
  })
})
```

## スイート内のフック

```ts
describe('Database', () => {
  let db

  beforeAll(async () => {
    db = await createDb()
  })

  afterAll(async () => {
    await db.close()
  })

  beforeEach(async () => {
    await db.clear()
  })

  test('insert works', async () => {
    await db.insert({ name: 'test' })
    expect(await db.count()).toBe(1)
  })
})
```

## 修飾子の組み合わせ

すべての修飾子をチェーンできる:

```ts
describe.skip.concurrent('skipped concurrent', () => {})
describe.only.shuffle('only and shuffled', () => {})
describe.concurrent.skip('equivalent', () => {})
```

## 重要ポイント

- トップレベルのテストは暗黙的なファイルスイートに属する
- ネストされたスイートは親のオプション（timeout、retry 等）を継承する
- フックは所属するスイートとネストされたスイートにスコープされる
- `describe.concurrent` ではスナップショット用にコンテキストの `expect` を使用する
- シャッフル順序は `sequence.seed` 設定に依存する

<!--
Source references:
- https://vitest.dev/api/describe.html
-->
