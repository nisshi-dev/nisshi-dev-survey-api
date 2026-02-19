---
name: vitest-configuration
description: vitest.config.ts または vite.config.ts による Vitest の設定
---

# 設定

Vitest は `vitest.config.ts` または `vite.config.ts` から設定を読み込む。Vite と同じ設定フォーマットを共有する。

## 基本セットアップ

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // テストオプション
  },
})
```

## 既存の Vite 設定との併用

Vitest の型参照を追加し、`test` プロパティを使用する:

```ts
// vite.config.ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

## 設定のマージ

設定ファイルを分離している場合は `mergeConfig` を使用する:

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
  },
}))
```

## 主要オプション

```ts
defineConfig({
  test: {
    // グローバル API（describe, it, expect）をインポートなしで使用可能にする
    globals: true,

    // テスト環境: 'node', 'jsdom', 'happy-dom'
    environment: 'node',

    // 各テストファイルの前に実行するセットアップファイル
    setupFiles: ['./tests/setup.ts'],

    // テストファイルの include パターン
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],

    // exclude パターン
    exclude: ['**/node_modules/**', '**/dist/**'],

    // テストのタイムアウト（ミリ秒）
    testTimeout: 5000,

    // フックのタイムアウト（ミリ秒）
    hookTimeout: 10000,

    // デフォルトでウォッチモードを有効にする
    watch: true,

    // カバレッジ設定
    coverage: {
      provider: 'v8', // または 'istanbul'
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
    },

    // テストを分離して実行（各ファイルを別プロセスで実行）
    isolate: true,

    // テスト実行プール: 'threads', 'forks', 'vmThreads'
    pool: 'threads',

    // ワーカー数（4.0: maxThreads/maxForks は廃止 → maxWorkers に統合）
    maxWorkers: 4,
    minWorkers: 1,

    // テスト間でモックを自動クリアする
    clearMocks: true,

    // テスト間でモックを自動リストアする
    restoreMocks: true,

    // 失敗したテストのリトライ回数
    retry: 0,

    // 最初の失敗で停止する
    bail: 0,
  },
})
```

## 条件付き設定

`mode` または `process.env.VITEST` でテスト固有の設定を行う:

```ts
export default defineConfig(({ mode }) => ({
  plugins: mode === 'test' ? [] : [myPlugin()],
  test: {
    // テストオプション
  },
}))
```

## プロジェクト（モノレポ）

同一の Vitest プロセスで異なる設定を実行する:

```ts
defineConfig({
  test: {
    projects: [
      'packages/*',
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
})
```

## 4.0 での設定変更

| 3.x | 4.x |
|-----|-----|
| `maxThreads` / `maxForks` | `maxWorkers` |
| `minThreads` / `minForks` | `minWorkers` |
| `singleThread` / `singleFork` | `maxWorkers: 1, isolate: false` |
| `poolOptions.threads.*` | トップレベルに昇格 |
| `workspace` / `vitest.workspace.js` | `projects`（config 内に統合） |
| `coverage.all` | 削除（`coverage.include` を明示指定） |
| `coverage.extensions` | 削除 |
| `coverage.ignoreEmptyLines` | 削除 |
| `deps.external` / `deps.inline` | `server.deps` を使用 |

## 重要ポイント

- Vitest は Vite の変換パイプラインを使用する — 同じ `resolve.alias` やプラグインが機能する
- `vitest.config.ts` は `vite.config.ts` より優先される
- `--config` フラグでカスタム設定パスを指定可能
- テスト実行時は `process.env.VITEST` が `true` に設定される
- テスト設定は `test` プロパティに記述し、それ以外は Vite の設定
- 4.0: Vite ModuleRunner を使用（vite-node を廃止）
- 4.0: `vitest.workspace.js` は使用不可 → `projects` を `vitest.config.ts` 内に記述

<!--
Source references:
- https://vitest.dev/guide/#configuring-vitest
- https://vitest.dev/config/
-->
