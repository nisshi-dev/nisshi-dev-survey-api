---
name: projects-workspaces
description: モノレポや異なるテスト種別向けのマルチプロジェクト設定
---

# プロジェクト

同一の Vitest プロセス内で異なるテスト設定を実行する。

## 基本的なプロジェクト設定

```ts
// vitest.config.ts
defineConfig({
  test: {
    projects: [
      // 設定ファイルの glob パターン
      'packages/*',

      // インライン設定
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

## モノレポパターン

```ts
defineConfig({
  test: {
    projects: [
      // 各パッケージが独自の vitest.config.ts を持つ
      'packages/core',
      'packages/cli',
      'packages/utils',
    ],
  },
})
```

パッケージの設定:

```ts
// packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'core',
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

## 異なる環境

同じテストを異なる環境で実行:

```ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'happy-dom',
          root: './shared-tests',
          environment: 'happy-dom',
          setupFiles: ['./setup.happy-dom.ts'],
        },
      },
      {
        test: {
          name: 'node',
          root: './shared-tests',
          environment: 'node',
          setupFiles: ['./setup.node.ts'],
        },
      },
    ],
  },
})
```

## ブラウザ + Node プロジェクト

```ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            name: 'chromium',
            provider: 'playwright',
          },
        },
      },
    ],
  },
})
```

## 共有設定

```ts
// vitest.shared.ts
export const sharedConfig = {
  testTimeout: 10000,
  setupFiles: ['./tests/setup.ts'],
}

// vitest.config.ts
import { sharedConfig } from './vitest.shared'

defineConfig({
  test: {
    projects: [
      {
        test: {
          ...sharedConfig,
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          ...sharedConfig,
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
        },
      },
    ],
  },
})
```

## プロジェクト固有の依存関係

各プロジェクトで異なる依存関係をインラインにできる:

```ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'project-a',
          server: {
            deps: {
              inline: ['package-a'],
            },
          },
        },
      },
    ],
  },
})
```

## 特定プロジェクトの実行

```bash
# 特定のプロジェクトを実行
vitest --project unit
vitest --project integration

# 複数プロジェクト
vitest --project unit --project e2e

# プロジェクトを除外
vitest --project.ignore browser
```

## プロジェクトへの値の提供

設定からテストへ値を共有:

```ts
// vitest.config.ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'staging',
          provide: {
            apiUrl: 'https://staging.api.com',
            debug: true,
          },
        },
      },
      {
        test: {
          name: 'production',
          provide: {
            apiUrl: 'https://api.com',
            debug: false,
          },
        },
      },
    ],
  },
})

// テスト内で inject を使用
import { inject } from 'vitest'

test('正しい API を使用する', () => {
  const url = inject('apiUrl')
  expect(url).toContain('api.com')
})
```

## フィクスチャとの併用

```ts
const test = base.extend({
  apiUrl: ['/default', { injected: true }],
})

test('注入された URL を使用する', ({ apiUrl }) => {
  // apiUrl はプロジェクトの provide 設定から取得される
})
```

## プロジェクトの分離

各プロジェクトはデフォルトで独自のスレッドプールで実行される:

```ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'isolated',
          isolate: true, // 完全分離
          pool: 'forks',
        },
      },
    ],
  },
})
```

## プロジェクトごとのグローバルセットアップ

```ts
defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'with-db',
          globalSetup: ['./tests/db-setup.ts'],
        },
      },
    ],
  },
})
```

## 4.0 での変更: workspace → projects

| 3.x | 4.x |
|-----|-----|
| `vitest.workspace.js` / `vitest.workspace.ts` | 使用不可（削除） |
| `workspace` 設定プロパティ | `projects`（`vitest.config.ts` 内） |

```ts
// ⚠️ 3.x: vitest.workspace.js（4.0 で使用不可）
// ✓ 4.x: vitest.config.ts 内の projects で定義
defineConfig({
  test: {
    projects: ['packages/*'],
  },
})
```

## ポイント

- プロジェクトは同一の Vitest プロセス内で実行される
- 各プロジェクトは異なる環境・設定を持てる
- モノレポパッケージには glob パターンを使用
- `--project` フラグで特定プロジェクトを実行
- `provide` でテストに設定値を注入可能
- プロジェクトはルート設定を継承（上書き可能）
- 4.0: `vitest.workspace.js` は廃止。`vitest.config.ts` の `projects` に統合

<!--
Source references:
- https://vitest.dev/guide/projects.html
-->
