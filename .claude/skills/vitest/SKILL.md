---
name: vitest
description: Vite ベースの高速ユニットテストフレームワーク。Jest 互換 API を提供。テストの作成、モック、カバレッジ設定、テストのフィルタリングやフィクスチャを扱う時に使用。
metadata:
  author: Anthony Fu
  version: "4.0.18"
  source: Updated from https://vitest.dev/blog/vitest-4 and https://vitest.dev/guide/migration.html
---

Vitest は Vite を基盤とした次世代テストフレームワーク。Jest 互換の API を提供し、ESM・TypeScript・JSX をネイティブにサポートする（設定不要）。Vitest は Vite アプリと同じ設定、トランスフォーマー、リゾルバー、プラグインを共有する。

**主な特徴:**
- Vite ネイティブ: Vite の ModuleRunner を使用した高速テスト実行（4.0 で vite-node を置換）
- Jest 互換: 多くの Jest テストスイートのドロップイン置き換え
- スマートウォッチモード: モジュールグラフに基づき影響のあるテストのみ再実行
- ESM、TypeScript、JSX を設定なしでネイティブサポート
- マルチスレッドワーカーによる並列テスト実行（Tinypool 廃止、ネイティブ実装に）
- V8 または Istanbul による組み込みカバレッジ（4.0 で AST ベース解析に改善）
- スナップショットテスト、モック、スパイユーティリティ
- ブラウザモードが安定版に昇格（4.0）
- ビジュアルリグレッションテスト: `toMatchScreenshot` によるスクリーンショット比較（4.0 新機能）
- スキーマバリデーション: `expect.schemaMatching` で Zod/Valibot/ArkType に対応（4.0 新機能）

> **このスキルは Vitest 4.x（4.0.18）対応。** 3.x からのマイグレーションが必要な場合は公式ガイドを参照: https://vitest.dev/guide/migration.html

## 4.0 での主な破壊的変更

| 変更内容 | 3.x | 4.x |
|---------|-----|-----|
| ワークスペース設定 | `workspace` / `vitest.workspace.js` | `projects`（`vitest.config.ts` 内に統合） |
| ワーカー数設定 | `maxThreads` / `maxForks` | `maxWorkers` |
| シングルスレッド | `singleThread` / `singleFork` | `maxWorkers: 1, isolate: false` |
| プールオプション | `poolOptions.threads.*` | トップレベルに昇格 |
| カバレッジ | `coverage.all`, `coverage.extensions` | 削除（`coverage.include` を明示指定） |
| モジュール実行 | vite-node | Vite ModuleRunner |
| モック名デフォルト | `"spy"` | `""（空文字列）` |
| `restoreAllMocks` | すべてのモック対象 | `vi.spyOn` で作成したスパイのみ |
| `invocationCallOrder` | 0 始まり | 1 始まり（Jest 互換） |
| テストオプション | 第3引数でオプション指定可 | 第2引数のみ |
| basic レポーター | 利用可能 | 削除（`default` + `summary: false` で代替） |
| verbose レポーター | ツリー表示 | フラット表示（ツリーは `--reporter=tree`） |
| ブラウザモード | `@vitest/browser/context` | `vitest/browser` |
| 環境変数 | `VITE_NODE_DEPS_MODULE_DIRECTORIES` | `VITEST_MODULE_DIRECTORIES` |
| 環境変数 | `VITEST_MAX_THREADS` / `VITEST_MAX_FORKS` | `VITEST_MAX_WORKERS` |

## コア

| トピック | 説明 | リファレンス |
|---------|------|-------------|
| 設定 | Vitest と Vite の設定統合、defineConfig、projects 設定 | [core-config](references/core-config.md) |
| CLI | コマンドラインインターフェース、コマンドとオプション | [core-cli](references/core-cli.md) |
| Test API | test/it 関数、skip・only・concurrent 等の修飾子 | [core-test-api](references/core-test-api.md) |
| Describe API | テストのグルーピングとネストされたスイート用の describe/suite | [core-describe](references/core-describe.md) |
| Expect API | アサーション、スキーママッチング、ビジュアルリグレッション | [core-expect](references/core-expect.md) |
| フック | beforeEach、afterEach、beforeAll、afterAll、aroundEach | [core-hooks](references/core-hooks.md) |

## 機能

| トピック | 説明 | リファレンス |
|---------|------|-------------|
| モック | vi ユーティリティによる関数・モジュール・タイマー・日付のモック | [features-mocking](references/features-mocking.md) |
| スナップショット | toMatchSnapshot とインラインスナップショットによるスナップショットテスト | [features-snapshots](references/features-snapshots.md) |
| カバレッジ | V8（AST ベース解析）または Istanbul によるコードカバレッジ | [features-coverage](references/features-coverage.md) |
| テストコンテキスト | テストフィクスチャ、context.expect、カスタムフィクスチャ用の test.extend | [features-context](references/features-context.md) |
| 並行実行 | 並行テスト、並列実行、シャーディング | [features-concurrency](references/features-concurrency.md) |
| フィルタリング | 名前、ファイルパターン、タグによるテストのフィルタリング | [features-filtering](references/features-filtering.md) |

## 応用

| トピック | 説明 | リファレンス |
|---------|------|-------------|
| Vi ユーティリティ | vi ヘルパー: mock、spyOn、フェイクタイマー、hoisted、waitFor | [advanced-vi](references/advanced-vi.md) |
| 環境 | テスト環境: node、jsdom、happy-dom、カスタム | [advanced-environments](references/advanced-environments.md) |
| 型テスト | expectTypeOf と assertType による型レベルテスト | [advanced-type-testing](references/advanced-type-testing.md) |
| プロジェクト | マルチプロジェクト設定（workspace から projects に移行） | [advanced-projects](references/advanced-projects.md) |
