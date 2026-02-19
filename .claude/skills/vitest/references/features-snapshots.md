---
name: snapshot-testing
description: ファイル・インライン・ファイルスナップショットによるスナップショットテスト
---

# スナップショットテスト

スナップショットテストは出力をキャプチャし、保存された参照と比較する。

## 基本的なスナップショット

```ts
import { expect, test } from 'vitest'

test('スナップショット', () => {
  const result = generateOutput()
  expect(result).toMatchSnapshot()
})
```

初回実行で `.snap` ファイルが作成される:

```js
// __snapshots__/test.spec.ts.snap
exports['スナップショット 1'] = `
{
  "id": 1,
  "name": "test"
}
`
```

## インラインスナップショット

テストファイル内に直接保存される:

```ts
test('インラインスナップショット', () => {
  const data = { foo: 'bar' }
  expect(data).toMatchInlineSnapshot()
})
```

Vitest がテストファイルを更新する:

```ts
test('インラインスナップショット', () => {
  const data = { foo: 'bar' }
  expect(data).toMatchInlineSnapshot(`
    {
      "foo": "bar",
    }
  `)
})
```

## ファイルスナップショット

明示的なファイルと比較する:

```ts
test('HTML レンダリング', async () => {
  const html = renderComponent()
  await expect(html).toMatchFileSnapshot('./expected/component.html')
})
```

## スナップショットヒント

説明的なヒントを追加する:

```ts
test('複数のスナップショット', () => {
  expect(header).toMatchSnapshot('ヘッダー')
  expect(body).toMatchSnapshot('本文')
  expect(footer).toMatchSnapshot('フッター')
})
```

## オブジェクト構造のマッチング

部分構造のマッチング:

```ts
test('構造スナップショット', () => {
  const data = {
    id: Math.random(),
    created: new Date(),
    name: 'test'
  }

  expect(data).toMatchSnapshot({
    id: expect.any(Number),
    created: expect.any(Date),
  })
})
```

## エラースナップショット

```ts
test('エラーメッセージ', () => {
  expect(() => {
    throw new Error('Something went wrong')
  }).toThrowErrorMatchingSnapshot()
})

test('インラインエラー', () => {
  expect(() => {
    throw new Error('Bad input')
  }).toThrowErrorMatchingInlineSnapshot(`[Error: Bad input]`)
})
```

## スナップショットの更新

```bash
# すべてのスナップショットを更新
vitest -u
vitest --update

# ウォッチモードでは 'u' を押して失敗したスナップショットを更新
```

## カスタムシリアライザ

カスタムのスナップショットフォーマットを追加する:

```ts
expect.addSnapshotSerializer({
  test(val) {
    return val && typeof val.toJSON === 'function'
  },
  serialize(val, config, indentation, depth, refs, printer) {
    return printer(val.toJSON(), config, indentation, depth, refs)
  },
})
```

または設定で指定:

```ts
// vitest.config.ts
defineConfig({
  test: {
    snapshotSerializers: ['./my-serializer.ts'],
  },
})
```

## スナップショットフォーマットオプション

```ts
defineConfig({
  test: {
    snapshotFormat: {
      printBasicPrototype: false, // Array/Object プロトタイプを表示しない
      escapeString: false,
    },
  },
})
```

## 並行テストでのスナップショット

コンテキストの expect を使用する:

```ts
test.concurrent('並行テスト 1', async ({ expect }) => {
  expect(await getData()).toMatchSnapshot()
})

test.concurrent('並行テスト 2', async ({ expect }) => {
  expect(await getOther()).toMatchSnapshot()
})
```

## スナップショットファイルの保存場所

デフォルト: `__snapshots__/<test-file>.snap`

カスタマイズ:

```ts
defineConfig({
  test: {
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace('__tests__', '__snapshots__') + snapExtension
    },
  },
})
```

## 重要ポイント

- スナップショットファイルはバージョン管理にコミットする
- コードレビューでスナップショットの変更を確認する
- 1 つのテストに複数のスナップショットがある場合はヒントを使う
- 大きな出力（HTML、JSON）には `toMatchFileSnapshot` を使う
- インラインスナップショットはテストファイル内で自動更新される
- 並行テストではコンテキストの `expect` を使用する
- 4.0: Shadow DOM 要素のスナップショット出力形式が改善（pretty-format 更新）

<!--
Source references:
- https://vitest.dev/guide/snapshot.html
- https://vitest.dev/api/expect.html#tomatchsnapshot
-->
