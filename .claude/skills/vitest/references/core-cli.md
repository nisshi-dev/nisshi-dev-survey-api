---
name: vitest-cli
description: コマンドラインインターフェースのコマンドとオプション
---

# コマンドラインインターフェース

## コマンド

### `vitest`

ウォッチモード（開発時）またはランモード（CI）で Vitest を起動する:

```bash
vitest                    # 開発時はウォッチモード、CI ではランモード
vitest foobar             # パスに "foobar" を含むテストを実行
vitest basic/foo.test.ts:10  # ファイルと行番号で特定のテストを実行
```

### `vitest run`

ウォッチモードなしでテストを1回実行する:

```bash
vitest run
vitest run --coverage
```

### `vitest watch`

明示的にウォッチモードを起動する:

```bash
vitest watch
```

### `vitest related`

指定ファイルをインポートしているテストを実行する（lint-staged との連携に便利）:

```bash
vitest related src/index.ts src/utils.ts --run
```

### `vitest bench`

ベンチマークテストのみを実行する:

```bash
vitest bench
```

### `vitest list`

一致するすべてのテストを実行せずに一覧表示する:

```bash
vitest list                    # テスト名を一覧表示
vitest list --json             # JSON で出力
vitest list --filesOnly        # テストファイルのみ一覧表示
```

### `vitest init`

プロジェクトの初期セットアップを行う:

```bash
vitest init browser            # ブラウザテストをセットアップ
```

## 主要オプション

```bash
# 設定
--config <path>           # 設定ファイルのパス
--project <name>          # 特定のプロジェクトを実行

# フィルタリング
--testNamePattern, -t     # パターンに一致するテストを実行
--changed                 # 変更されたファイルのテストを実行
--changed HEAD~1          # 直前のコミットで変更されたファイルのテスト

# レポーター
--reporter <name>         # default, verbose, tree, dot, json, html（4.0: basic は削除）
--reporter=html --outputFile=report.html

# カバレッジ
--coverage                # カバレッジを有効化
--coverage.provider v8    # v8 プロバイダーを使用
--coverage.reporter text,html

# 実行
--shard <index>/<count>   # テストを複数マシンに分割
--bail <n>                # n 回失敗したら停止
--retry <n>               # 失敗したテストを n 回リトライ
--sequence.shuffle        # テスト順序をランダム化

# ウォッチモード
--no-watch                # ウォッチモードを無効化
--standalone              # テストを実行せずに起動

# 環境
--environment <env>       # jsdom, happy-dom, node
--globals                 # グローバル API を有効化

# デバッグ
--inspect                 # Node インスペクターを有効化
--inspect-brk             # 起動時にブレークポイントで停止

# 出力
--silent                  # コンソール出力を抑制
--no-color                # カラー表示を無効化
```

## package.json のスクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

## CI でのシャーディング

テストを複数マシンに分割する:

```bash
# マシン 1
vitest run --shard=1/3 --reporter=blob

# マシン 2
vitest run --shard=2/3 --reporter=blob

# マシン 3
vitest run --shard=3/3 --reporter=blob

# レポートをマージ
vitest --merge-reports --reporter=junit
```

## ウォッチモードのキーボードショートカット

ウォッチモード中のキー操作:
- `a` - すべてのテストを実行
- `f` - 失敗したテストのみ実行
- `u` - スナップショットを更新
- `p` - ファイル名パターンでフィルタ
- `t` - テスト名パターンでフィルタ
- `q` - 終了

## 重要ポイント

- 開発時はデフォルトでウォッチモード、CI（`process.env.CI` が設定されている場合）ではランモード
- 1回限りの実行を確実にするには `--run` フラグを使用（lint-staged で重要）
- camelCase（`--testTimeout`）と kebab-case（`--test-timeout`）の両方が使用可能
- ブール値のオプションは `--no-` プレフィックスで否定可能
- 4.0: `basic` reporter は削除。`--reporter=default --no-summary` で代替
- 4.0: `verbose` は常にフラット表示。ツリー表示は `--reporter=tree`
- 4.0: `--standalone` + ファイルパターン指定で自動実行

<!--
Source references:
- https://vitest.dev/guide/cli.html
-->
