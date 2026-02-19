---
name: test-environments
description: jsdom、happy-dom 等のブラウザ API 向けテスト環境の設定
---

# テスト環境

## 利用可能な環境

- `node`（デフォルト）- Node.js 環境
- `jsdom` - DOM API を備えたブラウザライクな環境
- `happy-dom` - jsdom より高速な代替
- `edge-runtime` - Vercel Edge Runtime

## 設定

```ts
// vitest.config.ts
defineConfig({
  test: {
    environment: 'jsdom',

    // 環境固有のオプション
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
  },
})
```

## 環境パッケージのインストール

```bash
# jsdom
npm i -D jsdom

# happy-dom（高速だが API は少ない）
npm i -D happy-dom
```

## ファイル単位の環境指定

ファイル先頭にマジックコメントを記述:

```ts
// @vitest-environment jsdom

import { expect, test } from 'vitest'

test('DOM テスト', () => {
  const div = document.createElement('div')
  expect(div).toBeInstanceOf(HTMLDivElement)
})
```

## jsdom 環境

フルブラウザ環境のシミュレーション:

```ts
// @vitest-environment jsdom

test('DOM 操作', () => {
  document.body.innerHTML = '<div id="app"></div>'

  const app = document.getElementById('app')
  app.textContent = 'Hello'

  expect(app.textContent).toBe('Hello')
})

test('window API', () => {
  expect(window.location.href).toBeDefined()
  expect(localStorage).toBeDefined()
})
```

### jsdom オプション

```ts
defineConfig({
  test: {
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
        html: '<!DOCTYPE html><html><body></body></html>',
        userAgent: 'custom-agent',
        resources: 'usable',
      },
    },
  },
})
```

## happy-dom 環境

高速だが API は少ない:

```ts
// @vitest-environment happy-dom

test('基本的な DOM', () => {
  const el = document.createElement('div')
  el.className = 'test'
  expect(el.className).toBe('test')
})
```

## プロジェクトごとの複数環境

異なる環境にはプロジェクトを使用:

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
          name: 'dom',
          include: ['tests/dom/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
})
```

## カスタム環境

カスタム環境パッケージの作成:

```ts
// vitest-environment-custom/index.ts
import type { Environment } from 'vitest/runtime'

export default <Environment>{
  name: 'custom',
  viteEnvironment: 'ssr', // または 'client'

  setup() {
    // グローバル状態のセットアップ
    globalThis.myGlobal = 'value'

    return {
      teardown() {
        delete globalThis.myGlobal
      },
    }
  },
}
```

使用方法:

```ts
defineConfig({
  test: {
    environment: 'custom',
  },
})
```

## VM を使った環境

完全な分離が必要な場合:

```ts
export default <Environment>{
  name: 'isolated',
  viteEnvironment: 'ssr',

  async setupVM() {
    const vm = await import('node:vm')
    const context = vm.createContext()

    return {
      getVmContext() {
        return context
      },
      teardown() {},
    }
  },

  setup() {
    return { teardown() {} }
  },
}
```

## ブラウザモード（4.0 で安定版に昇格）

jsdom/happy-dom ではなく実ブラウザでテストを実行する。4.0 で安定版 API となり、`vitest/browser` からインポート可能。

```ts
// vitest.config.ts
defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright', // または 'webdriverio'
      // 4.0: name → instances に変更（複数ブラウザ対応）
      instances: [
        { browser: 'chromium' },
        // { browser: 'firefox' },
        // { browser: 'webkit' },
      ],
    },
  },
})
```

```ts
// テストファイル内（4.0: vitest/browser からインポート）
import { page, userEvent } from 'vitest/browser'

test('ボタンクリック', async () => {
  await page.render(<MyComponent />)
  await userEvent.click(page.getByRole('button'))
})
```

## CSS とアセット

jsdom/happy-dom での CSS ハンドリング設定:

```ts
defineConfig({
  test: {
    css: true, // CSS を処理

    // またはオプション指定
    css: {
      include: /\.module\.css$/,
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
})
```

## 外部依存関係の問題解決

外部パッケージが CSS/アセットのエラーで失敗する場合:

```ts
defineConfig({
  test: {
    server: {
      deps: {
        inline: ['problematic-package'],
      },
    },
  },
})
```

## ポイント

- デフォルトは `node` - ブラウザ API は使用不可
- フルブラウザシミュレーションには `jsdom` を使用
- 基本的な DOM で高速なテストには `happy-dom` を使用
- `// @vitest-environment` コメントでファイル単位の環境指定が可能
- 複数環境の設定にはプロジェクトを使用
- 4.0: ブラウザモードが安定版に。`vitest/browser` からユーティリティをインポート
- 4.0: `browser.name` → `browser.instances` に変更（複数ブラウザ対応）
- 4.0: `deps.external` / `deps.inline` → `server.deps` に移行

<!--
Source references:
- https://vitest.dev/guide/environment.html
-->
