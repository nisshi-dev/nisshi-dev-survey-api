---
name: type-testing
description: expectTypeOf と assertType による TypeScript 型テスト
---

# 型テスト

ランタイム実行なしで TypeScript の型をテストする。

## セットアップ

型テストには `.test-d.ts` 拡張子を使用:

```ts
// math.test-d.ts
import { expectTypeOf } from 'vitest'
import { add } from './math'

test('add は number を返す', () => {
  expectTypeOf(add).returns.toBeNumber()
})
```

## 設定

```ts
defineConfig({
  test: {
    typecheck: {
      enabled: true,

      // 型チェックのみ実行
      only: false,

      // チェッカー: 'tsc' または 'vue-tsc'
      checker: 'tsc',

      // 対象ファイルパターン
      include: ['**/*.test-d.ts'],

      // 使用する tsconfig
      tsconfig: './tsconfig.json',
    },
  },
})
```

## expectTypeOf API

```ts
import { expectTypeOf } from 'vitest'

// 基本型チェック
expectTypeOf<string>().toBeString()
expectTypeOf<number>().toBeNumber()
expectTypeOf<boolean>().toBeBoolean()
expectTypeOf<null>().toBeNull()
expectTypeOf<undefined>().toBeUndefined()
expectTypeOf<void>().toBeVoid()
expectTypeOf<never>().toBeNever()
expectTypeOf<any>().toBeAny()
expectTypeOf<unknown>().toBeUnknown()
expectTypeOf<object>().toBeObject()
expectTypeOf<Function>().toBeFunction()
expectTypeOf<[]>().toBeArray()
expectTypeOf<symbol>().toBeSymbol()
```

## 値の型チェック

```ts
const value = 'hello'
expectTypeOf(value).toBeString()

const obj = { name: 'test', count: 42 }
expectTypeOf(obj).toMatchTypeOf<{ name: string }>()
expectTypeOf(obj).toHaveProperty('name')
```

## 関数型

```ts
function greet(name: string): string {
  return `Hello, ${name}`
}

expectTypeOf(greet).toBeFunction()
expectTypeOf(greet).parameters.toEqualTypeOf<[string]>()
expectTypeOf(greet).returns.toBeString()

// パラメータのチェック
expectTypeOf(greet).parameter(0).toBeString()
```

## オブジェクト型

```ts
interface User {
  id: number
  name: string
  email?: string
}

expectTypeOf<User>().toHaveProperty('id')
expectTypeOf<User>().toHaveProperty('name').toBeString()

// 構造のチェック
expectTypeOf({ id: 1, name: 'test' }).toMatchTypeOf<User>()
```

## 等値比較 vs 部分一致

```ts
interface A { x: number }
interface B { x: number; y: string }

// toMatchTypeOf - 部分一致（サブセットマッチング）
expectTypeOf<B>().toMatchTypeOf<A>()  // B は A を拡張している

// toEqualTypeOf - 完全一致
expectTypeOf<A>().not.toEqualTypeOf<B>()  // 完全一致ではない
expectTypeOf<A>().toEqualTypeOf<{ x: number }>()  // 完全一致
```

## ブランド型

```ts
type UserId = number & { __brand: 'UserId' }
type PostId = number & { __brand: 'PostId' }

expectTypeOf<UserId>().not.toEqualTypeOf<PostId>()
expectTypeOf<UserId>().not.toEqualTypeOf<number>()
```

## ジェネリック型

```ts
function identity<T>(value: T): T {
  return value
}

expectTypeOf(identity<string>).returns.toBeString()
expectTypeOf(identity<number>).returns.toBeNumber()
```

## Nullable 型

```ts
type MaybeString = string | null | undefined

expectTypeOf<MaybeString>().toBeNullable()
expectTypeOf<string>().not.toBeNullable()
```

## assertType

値が型に一致することをアサートする（ランタイムでのアサーションは行わない）:

```ts
import { assertType } from 'vitest'

function getUser(): User | null {
  return { id: 1, name: 'test' }
}

test('User を返す', () => {
  const result = getUser()

  // @ts-expect-error - 型チェックが失敗するべき
  assertType<string>(result)

  // 正しい型
  assertType<User | null>(result)
})
```

## @ts-expect-error の使用

コードが型エラーを生成することをテスト:

```ts
test('不正な型を拒否する', () => {
  function requireString(s: string) {}

  // @ts-expect-error - number は string に代入不可
  requireString(123)
})
```

## 型テストの実行

```bash
# 型テストを実行
vitest typecheck

# ユニットテストと一緒に実行
vitest --typecheck

# 型テストのみ
vitest --typecheck.only
```

## 混合テストファイル

ランタイムテストと型テストを組み合わせる:

```ts
// user.test.ts
import { describe, expect, expectTypeOf, test } from 'vitest'
import { createUser } from './user'

describe('createUser', () => {
  test('ランタイム: ユーザーを作成する', () => {
    const user = createUser('John')
    expect(user.name).toBe('John')
  })

  test('型: User 型を返す', () => {
    expectTypeOf(createUser).returns.toMatchTypeOf<{ name: string }>()
  })
})
```

## ポイント

- 型のみのテストには `.test-d.ts` を使用
- 型アサーションには `expectTypeOf` を使用
- 部分一致には `toMatchTypeOf` を使用
- 完全一致には `toEqualTypeOf` を使用
- 型エラーのテストには `@ts-expect-error` を使用
- `vitest typecheck` または `--typecheck` で実行

<!--
Source references:
- https://vitest.dev/guide/testing-types.html
- https://vitest.dev/api/expect-typeof.html
-->
