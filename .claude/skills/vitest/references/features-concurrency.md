---
name: concurrency-parallelism
description: 並行テスト、並列実行、シャーディング
---

# 並行実行と並列処理

## ファイルの並列実行

デフォルトで、Vitest はテストファイルをワーカー間で並列に実行する:

```ts
defineConfig({
  test: {
    // ファイルを並列に実行（デフォルト: true）
    fileParallelism: true,

    // ワーカースレッド数
    maxWorkers: 4,
    minWorkers: 1,

    // プールの種類: 'threads', 'forks', 'vmThreads'
    pool: 'threads',
  },
})
```

## 並行テスト

ファイル内のテストを並行に実行する:

```ts
// 個別の並行テスト
test.concurrent('テスト 1', async ({ expect }) => {
  expect(await fetch1()).toBe('result')
})

test.concurrent('テスト 2', async ({ expect }) => {
  expect(await fetch2()).toBe('result')
})

// スイート内の全テストを並行実行
describe.concurrent('並列スイート', () => {
  test('テスト 1', async ({ expect }) => {})
  test('テスト 2', async ({ expect }) => {})
})
```

**重要:** 並行テストではコンテキストの `{ expect }` を使用すること。

## 並行コンテキスト内での逐次実行

逐次実行を強制する:

```ts
describe.concurrent('ほぼ並列', () => {
  test('並列 1', async () => {})
  test('並列 2', async () => {})

  test.sequential('単独実行 1', async () => {})
  test.sequential('単独実行 2', async () => {})
})

// スイート全体を逐次実行
describe.sequential('逐次スイート', () => {
  test('最初', () => {})
  test('次', () => {})
})
```

## 最大並行数

並行テスト数を制限する:

```ts
defineConfig({
  test: {
    maxConcurrency: 5, // ファイルごとの最大並行テスト数
  },
})
```

## アイソレーション

デフォルトでは各ファイルが分離された環境で実行される:

```ts
defineConfig({
  test: {
    // アイソレーションを無効化して高速化（安全性は低下）
    isolate: false,
  },
})
```

## シャーディング

テストを複数マシンに分割する:

```bash
# マシン 1
vitest run --shard=1/3

# マシン 2
vitest run --shard=2/3

# マシン 3
vitest run --shard=3/3
```

### CI での例（GitHub Actions）

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3]
    steps:
      - run: vitest run --shard=${{ matrix.shard }}/3 --reporter=blob

  merge:
    needs: test
    steps:
      - run: vitest --merge-reports --reporter=junit
```

### レポートのマージ

```bash
# 各シャードが blob を出力
vitest run --shard=1/3 --reporter=blob --coverage
vitest run --shard=2/3 --reporter=blob --coverage

# すべての blob をマージ
vitest --merge-reports --reporter=json --coverage
```

## テスト順序

テストの実行順序を制御する:

```ts
defineConfig({
  test: {
    sequence: {
      // テストをランダム順で実行
      shuffle: true,

      // 再現可能なシャッフルのシード値
      seed: 12345,

      // フック実行順序
      hooks: 'stack', // 'stack', 'list', 'parallel'

      // デフォルトで全テストを並行実行
      concurrent: true,
    },
  },
})
```

## テストのシャッフル

隠れた依存関係を検出するためにランダム化する:

```ts
// CLI 経由
vitest --sequence.shuffle

// スイートごと
describe.shuffle('ランダム順序', () => {
  test('テスト 1', () => {})
  test('テスト 2', () => {})
  test('テスト 3', () => {})
})
```

## プールオプション

4.0 では `poolOptions.threads.maxThreads` / `poolOptions.forks.maxForks` は廃止され、トップレベルの `maxWorkers` / `minWorkers` に統合。

### Threads（デフォルト）

```ts
defineConfig({
  test: {
    pool: 'threads',
    maxWorkers: 8,
    minWorkers: 2,
    isolate: true,
  },
})
```

### Forks

アイソレーションが強いが低速:

```ts
defineConfig({
  test: {
    pool: 'forks',
    maxWorkers: 4,
    isolate: true,
  },
})
```

### VM Threads

ファイルごとに完全な VM アイソレーション:

```ts
defineConfig({
  test: {
    pool: 'vmThreads',
  },
})
```

## 失敗時の中断

最初の失敗で停止する:

```bash
vitest --bail 1    # 1 件の失敗で停止
vitest --bail      # 最初の失敗で停止（--bail 1 と同じ）
```

## 重要ポイント

- ファイルはデフォルトで並列実行される
- ファイル内の並列テストには `.concurrent` を使用
- 並行テストでは必ずコンテキストの `expect` を使用する
- シャーディングで CI マシン間にテストを分散
- `--merge-reports` でシャーディング結果を統合
- テストをシャッフルして隠れた依存関係を検出
- 4.0: `poolOptions.threads.maxThreads` / `poolOptions.forks.maxForks` → `maxWorkers` に統合
- 4.0: `singleThread` / `singleFork` → `maxWorkers: 1, isolate: false` に統合

<!--
Source references:
- https://vitest.dev/guide/features.html#running-tests-concurrently
- https://vitest.dev/guide/improving-performance.html
-->
