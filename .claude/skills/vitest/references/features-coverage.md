---
name: code-coverage
description: V8 または Istanbul プロバイダによるコードカバレッジ
---

# コードカバレッジ

## セットアップ

```bash
# カバレッジ付きでテストを実行
vitest run --coverage
```

## 設定

```ts
// vitest.config.ts
defineConfig({
  test: {
    coverage: {
      // プロバイダ: 'v8'（デフォルト、高速）または 'istanbul'（互換性が高い）
      provider: 'v8',

      // カバレッジを有効化
      enabled: true,

      // レポーター
      reporter: ['text', 'json', 'html'],

      // 対象ファイル
      include: ['src/**/*.{ts,tsx}'],

      // 除外ファイル
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.test.ts',
      ],

      // 4.0: `all` オプションは削除。代わりに include で対象を明示指定
      // include で指定したファイルのうち、テストでカバーされなかったものも表示

      // しきい値
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

## プロバイダ

### V8（デフォルト）

```bash
npm i -D @vitest/coverage-v8
```

- 高速、事前インストルメンテーション不要
- V8 のネイティブカバレッジを使用
- ほとんどのプロジェクトに推奨
- 4.0: AST ベースの解析に移行（v8-to-istanbul を廃止、精度向上）

### Istanbul

```bash
npm i -D @vitest/coverage-istanbul
```

- コードを事前インストルメント
- あらゆる JS ランタイムで動作
- オーバーヘッドは大きいが互換性が高い

## レポーター

```ts
coverage: {
  reporter: [
    'text',           // ターミナル出力
    'text-summary',   // サマリーのみ
    'json',           // JSON ファイル
    'html',           // HTML レポート
    'lcov',           // CI ツール用
    'cobertura',      // XML 形式
  ],
  reportsDirectory: './coverage',
}
```

## しきい値

カバレッジがしきい値を下回った場合にテストを失敗させる:

```ts
coverage: {
  thresholds: {
    // グローバルしきい値
    lines: 80,
    functions: 75,
    branches: 70,
    statements: 80,

    // ファイルごとのしきい値
    perFile: true,

    // しきい値の自動更新（段階的な改善用）
    autoUpdate: true,
  },
}
```

## コードの除外

### V8

```ts
/* v8 ignore next -- @preserve */
function ignored() {
  return 'not covered'
}

/* v8 ignore start -- @preserve */
// ここのコードはすべて無視される
/* v8 ignore stop -- @preserve */
```

### Istanbul

```ts
/* istanbul ignore next -- @preserve */
function ignored() {}

/* istanbul ignore if -- @preserve */
if (condition) {
  // 無視される
}
```

注意: `@preserve` は esbuild を通してもコメントを保持する。

## package.json スクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:coverage:watch": "vitest --coverage"
  }
}
```

## Vitest UI でのカバレッジ

Vitest UI で HTML カバレッジを有効化する:

```ts
coverage: {
  enabled: true,
  reporter: ['text', 'html'],
}
```

`vitest --ui` で実行するとカバレッジを視覚的に確認できる。

## CI 連携

```yaml
# GitHub Actions
- name: カバレッジ付きでテストを実行
  run: npm run test:coverage

- name: Codecov にカバレッジをアップロード
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## シャーディングとカバレッジ

シャーディング実行のカバレッジをマージする:

```bash
vitest run --shard=1/3 --coverage --reporter=blob
vitest run --shard=2/3 --coverage --reporter=blob
vitest run --shard=3/3 --coverage --reporter=blob

vitest --merge-reports --coverage --reporter=json
```

## 4.0 での変更

| 項目 | 変更内容 |
|------|----------|
| `coverage.all` | 削除。`coverage.include` で対象ファイルを明示指定 |
| `coverage.extensions` | 削除 |
| `coverage.ignoreEmptyLines` | 削除 |
| V8 プロバイダ内部 | v8-to-istanbul → AST ベース解析に移行（精度向上） |

## 重要ポイント

- V8 は高速、Istanbul は互換性が高い
- `--coverage` フラグまたは `coverage.enabled: true` で有効化
- 4.0: `all: true` は削除。`include` でカバレッジ対象を明示指定
- しきい値を設定して最低カバレッジを強制
- `@preserve` コメントで除外ヒントを保持

<!--
Source references:
- https://vitest.dev/guide/coverage.html
-->
