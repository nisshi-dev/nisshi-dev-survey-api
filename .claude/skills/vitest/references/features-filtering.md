---
name: test-filtering
description: 名前、ファイルパターン、タグによるテストのフィルタリング
---

# テストフィルタリング

## CLI でのフィルタリング

### ファイルパスで絞り込む

```bash
# "user" を含むファイルを実行
vitest user

# 複数パターン
vitest user auth

# 特定ファイル
vitest src/user.test.ts

# 行番号指定
vitest src/user.test.ts:25
```

### テスト名で絞り込む

```bash
# パターンに一致するテスト
vitest -t "login"
vitest --testNamePattern "should.*work"

# 正規表現パターン
vitest -t "/user|auth/"
```

## 変更ファイル

```bash
# 未コミットの変更
vitest --changed

# 特定のコミット以降
vitest --changed HEAD~1
vitest --changed abc123

# ブランチ以降
vitest --changed origin/main
```

## 関連ファイル

特定のファイルをインポートしているテストを実行する:

```bash
vitest related src/utils.ts src/api.ts --run
```

lint-staged と組み合わせて使用:

```js
// .lintstagedrc.js
export default {
  '*.{ts,tsx}': 'vitest related --run',
}
```

## テストの絞り込み (.only)

```ts
test.only('これだけ実行される', () => {})

describe.only('このスイートだけ', () => {
  test('実行される', () => {})
})
```

CI では `.only` がエラーになる（設定で変更可能）:

```ts
defineConfig({
  test: {
    allowOnly: true, // CI で .only を許可
  },
})
```

## テストのスキップ

```ts
test.skip('スキップ', () => {})

// 条件付き
test.skipIf(process.env.CI)('CI 以外で実行', () => {})
test.runIf(!process.env.CI)('ローカルのみ', () => {})

// 動的スキップ
test('動的', ({ skip }) => {
  skip(someCondition, '理由')
})
```

## タグ

カスタムタグでフィルタリングする:

```ts
test('データベーステスト', { tags: ['db'] }, () => {})
test('遅いテスト', { tags: ['slow', 'integration'] }, () => {})
```

タグ付きテストを実行する:

```bash
vitest --tags db
vitest --tags "db,slow"      # OR 条件
vitest --tags db --tags slow # OR 条件
```

許可するタグを設定する:

```ts
defineConfig({
  test: {
    tags: ['db', 'slow', 'integration'],
    strictTags: true, // 未知のタグでエラー
  },
})
```

## 対象 / 除外パターン

```ts
defineConfig({
  test: {
    // テストファイルのパターン
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // 除外パターン
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/*.skip.test.ts',
    ],

    // ソース内テスト用のインクルード
    includeSource: ['src/**/*.ts'],
  },
})
```

## ウォッチモードでのフィルタリング

ウォッチモードでは以下のキーを押す:
- `p` - ファイル名パターンでフィルタ
- `t` - テスト名パターンでフィルタ
- `a` - 全テストを実行
- `f` - 失敗したテストのみ実行

## プロジェクトのフィルタリング

特定のプロジェクトを実行する:

```bash
vitest --project unit
vitest --project integration --project e2e
```

## 環境ベースのフィルタリング

```ts
const isDev = process.env.NODE_ENV === 'development'
const isCI = process.env.CI

describe.skipIf(isCI)('ローカル限定テスト', () => {})
describe.runIf(isDev)('開発テスト', () => {})
```

## フィルタの組み合わせ

```bash
# ファイルパターン + テスト名 + 変更ファイル
vitest user -t "login" --changed

# 関連ファイル + 実行モード
vitest related src/auth.ts --run
```

## 実行せずにテストを一覧表示

```bash
vitest list                 # すべてのテスト名を表示
vitest list -t "user"       # 名前でフィルタ
vitest list --filesOnly     # ファイルパスのみ表示
vitest list --json          # JSON 出力
```

## 重要ポイント

- テスト名パターンのフィルタリングには `-t` を使用
- `--changed` で変更の影響を受けるテストのみ実行
- `--related` で特定ファイルをインポートしているテストを実行
- タグでテストを意味的にグルーピング
- デバッグには `.only` を使用するが、CI では拒否するよう設定する
- ウォッチモードにはインタラクティブフィルタリングがある

<!--
Source references:
- https://vitest.dev/guide/filtering.html
- https://vitest.dev/guide/cli.html
-->
