---
name: lifecycle-hooks
description: beforeEach、afterEach、beforeAll、afterAll、および around フック
---

# ライフサイクルフック

## 基本フック

```ts
import { afterAll, afterEach, beforeAll, beforeEach, test } from 'vitest'

beforeAll(async () => {
  // ファイル/スイート内のすべてのテストの前に1回実行
  await setupDatabase()
})

afterAll(async () => {
  // ファイル/スイート内のすべてのテストの後に1回実行
  await teardownDatabase()
})

beforeEach(async () => {
  // 各テストの前に実行
  await clearTestData()
})

afterEach(async () => {
  // 各テストの後に実行
  await cleanupMocks()
})
```

## クリーンアップの return パターン

`before*` フックからクリーンアップ関数を返す:

```ts
beforeAll(async () => {
  const server = await startServer()

  // 返された関数は afterAll として実行される
  return async () => {
    await server.close()
  }
})

beforeEach(async () => {
  const connection = await connect()

  // afterEach として実行される
  return () => connection.close()
})
```

## スコープ付きフック

フックは現在のスイートとネストされたスイートに適用される:

```ts
describe('outer', () => {
  beforeEach(() => console.log('outer before'))

  test('test 1', () => {}) // outer before → test

  describe('inner', () => {
    beforeEach(() => console.log('inner before'))

    test('test 2', () => {}) // outer before → inner before → test
  })
})
```

## フックのタイムアウト

```ts
beforeAll(async () => {
  await slowSetup()
}, 30_000) // 30秒のタイムアウト
```

## Around フック

テストをセットアップ/テアダウンのコンテキストでラップする:

```ts
import { aroundEach, test } from 'vitest'

// 各テストをデータベーストランザクションでラップ
aroundEach(async (runTest) => {
  await db.beginTransaction()
  await runTest() // 必ず呼び出すこと！
  await db.rollback()
})

test('insert user', async () => {
  await db.insert({ name: 'Alice' })
  // テスト後に自動的にロールバックされる
})
```

### aroundAll

スイート全体をラップする:

```ts
import { aroundAll, test } from 'vitest'

aroundAll(async (runSuite) => {
  console.log('before all tests')
  await runSuite() // 必ず呼び出すこと！
  console.log('after all tests')
})
```

### 複数の Around フック

オニオンレイヤーのようにネストされる:

```ts
aroundEach(async (runTest) => {
  console.log('outer before')
  await runTest()
  console.log('outer after')
})

aroundEach(async (runTest) => {
  console.log('inner before')
  await runTest()
  console.log('inner after')
})

// 実行順: outer before → inner before → test → inner after → outer after
```

## テスト内フック

テスト本体内で使用する:

```ts
import { onTestFailed, onTestFinished, test } from 'vitest'

test('with cleanup', () => {
  const db = connect()

  // テスト終了後に実行される（パス・失敗を問わず）
  onTestFinished(() => db.close())

  // テストが失敗した場合のみ実行される
  onTestFailed(({ task }) => {
    console.log('Failed:', task.result?.errors)
  })

  db.query('SELECT * FROM users')
})
```

### 再利用可能なクリーンアップパターン

```ts
function useTestDb() {
  const db = connect()
  onTestFinished(() => db.close())
  return db
}

test('query users', () => {
  const db = useTestDb()
  expect(db.query('SELECT * FROM users')).toBeDefined()
})

test('query orders', () => {
  const db = useTestDb() // 新しいコネクション、自動クローズ
  expect(db.query('SELECT * FROM orders')).toBeDefined()
})
```

## 並行テストのフック

並行テストではコンテキストのフックを使用する:

```ts
test.concurrent('concurrent', ({ onTestFinished }) => {
  const resource = allocate()
  onTestFinished(() => resource.release())
})
```

## 拡張テストのフック

`test.extend` を使用すると、フックは型を認識する:

```ts
const test = base.extend<{ db: Database }>({
  db: async ({}, use) => {
    const db = await createDb()
    await use(db)
    await db.close()
  },
})

// これらのフックは `db` フィクスチャを認識する
test.beforeEach(({ db }) => {
  db.seed()
})

test.afterEach(({ db }) => {
  db.clear()
})
```

## フックの実行順序

デフォルトの順序（stack）:
1. `beforeAll`（定義順）
2. `beforeEach`（定義順）
3. テスト
4. `afterEach`（逆順）
5. `afterAll`（逆順）

`sequence.hooks` で設定する:

```ts
defineConfig({
  test: {
    sequence: {
      hooks: 'list', // 'stack'（デフォルト）, 'list', 'parallel'
    },
  },
})
```

## 重要ポイント

- 型チェック中はフックは呼び出されない
- `before*` からクリーンアップ関数を返すことで `after*` の重複を避ける
- `aroundEach`/`aroundAll` では `runTest()`/`runSuite()` を必ず呼び出す
- `onTestFinished` はテストが失敗しても常に実行される
- 並行テストではコンテキストのフックを使用する

<!--
Source references:
- https://vitest.dev/api/hooks.html
-->
