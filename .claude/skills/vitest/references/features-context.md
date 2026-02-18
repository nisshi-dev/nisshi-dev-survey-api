---
name: test-context-fixtures
description: テストコンテキスト、test.extend によるカスタムフィクスチャ
---

# テストコンテキストとフィクスチャ

## 組み込みコンテキスト

すべてのテストは第一引数としてコンテキストを受け取る:

```ts
test('コンテキスト', ({ task, expect, skip }) => {
  console.log(task.name)  // テスト名
  expect(1).toBe(1)       // コンテキストに紐づいた expect
  skip()                  // テストを動的にスキップ
})
```

### コンテキストのプロパティ

- `task` - テストのメタデータ（名前、ファイルなど）
- `expect` - このテストに紐づいた expect（並行テストで重要）
- `skip(condition?, message?)` - テストをスキップ
- `onTestFinished(fn)` - テスト後のクリーンアップ
- `onTestFailed(fn)` - 失敗時のみ実行

## test.extend によるカスタムフィクスチャ

再利用可能なテストユーティリティを作成する:

```ts
import { test as base } from 'vitest'

// フィクスチャの型を定義
interface Fixtures {
  db: Database
  user: User
}

// 拡張テストを作成
export const test = base.extend<Fixtures>({
  // セットアップ / ティアダウン付きフィクスチャ
  db: async ({}, use) => {
    const db = await createDatabase()
    await use(db)           // テストに提供
    await db.close()        // クリーンアップ
  },

  // 別のフィクスチャに依存するフィクスチャ
  user: async ({ db }, use) => {
    const user = await db.createUser({ name: 'Test' })
    await use(user)
    await db.deleteUser(user.id)
  },
})
```

フィクスチャの使用:

```ts
test('ユーザー検索', async ({ db, user }) => {
  const found = await db.findUser(user.id)
  expect(found).toEqual(user)
})
```

## フィクスチャの初期化

フィクスチャはアクセスされた時のみ初期化される:

```ts
const test = base.extend({
  expensive: async ({}, use) => {
    console.log('初期化中')  // テストが使用する場合のみ実行
    await use('value')
  },
})

test('フィクスチャなし', () => {})           // expensive は呼ばれない
test('フィクスチャ使用', ({ expensive }) => {}) // expensive が呼ばれる
```

## 自動フィクスチャ

すべてのテストでフィクスチャを実行する:

```ts
const test = base.extend({
  setup: [
    async ({}, use) => {
      await globalSetup()
      await use()
      await globalTeardown()
    },
    { auto: true }  // 常に実行
  ],
})
```

## スコープ付きフィクスチャ

### ファイルスコープ

ファイルごとに一度だけ初期化する:

```ts
const test = base.extend({
  connection: [
    async ({}, use) => {
      const conn = await connect()
      await use(conn)
      await conn.close()
    },
    { scope: 'file' }
  ],
})
```

### ワーカースコープ

ワーカーごとに一度だけ初期化する:

```ts
const test = base.extend({
  sharedResource: [
    async ({}, use) => {
      await use(globalResource)
    },
    { scope: 'worker' }
  ],
})
```

## インジェクトフィクスチャ（設定から注入）

プロジェクトごとにフィクスチャを上書きする:

```ts
// テストファイル
const test = base.extend({
  apiUrl: ['/default', { injected: true }],
})

// vitest.config.ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'prod',
          provide: { apiUrl: 'https://api.prod.com' },
        },
      },
    ],
  },
})
```

## スイートごとのスコープ値

特定のスイートでフィクスチャを上書きする:

```ts
const test = base.extend({
  environment: 'development',
})

describe('本番テスト', () => {
  test.scoped({ environment: 'production' })

  test('本番環境を使用', ({ environment }) => {
    expect(environment).toBe('production')
  })
})

test('デフォルトを使用', ({ environment }) => {
  expect(environment).toBe('development')
})
```

## 拡張テストフック

フィクスチャの型情報を持つフック:

```ts
const test = base.extend<{ db: Database }>({
  db: async ({}, use) => {
    const db = await createDb()
    await use(db)
    await db.close()
  },
})

// フックがフィクスチャを認識する
test.beforeEach(({ db }) => {
  db.seed()
})

test.afterEach(({ db }) => {
  db.clear()
})
```

## フィクスチャの合成

拡張テストからさらに拡張する:

```ts
// base-test.ts
export const test = base.extend<{ db: Database }>({
  db: async ({}, use) => { /* ... */ },
})

// admin-test.ts
import { test as dbTest } from './base-test'

export const test = dbTest.extend<{ admin: User }>({
  admin: async ({ db }, use) => {
    const admin = await db.createAdmin()
    await use(admin)
  },
})
```

## 重要ポイント

- `{ }` デストラクチャリングでフィクスチャにアクセスする
- フィクスチャは遅延評価 — アクセス時のみ初期化される
- フィクスチャからクリーンアップ関数を返す
- `{ auto: true }` でセットアップフィクスチャを使用
- `{ scope: 'file' }` でコストの高い共有リソースに使用
- フィクスチャは合成可能 — 拡張テストからさらに拡張できる

<!--
Source references:
- https://vitest.dev/guide/test-context.html
-->
