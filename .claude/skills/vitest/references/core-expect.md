---
name: expect-api
description: Assertions with matchers, asymmetric matchers, and custom matchers
---

# Expect API

Vitest uses Chai assertions with Jest-compatible API.

## Basic Assertions

```ts
import { expect, test } from 'vitest'

test('assertions', () => {
  // Equality
  expect(1 + 1).toBe(2)              // Strict equality (===)
  expect({ a: 1 }).toEqual({ a: 1 }) // Deep equality

  // Truthiness
  expect(true).toBeTruthy()
  expect(false).toBeFalsy()
  expect(null).toBeNull()
  expect(undefined).toBeUndefined()
  expect('value').toBeDefined()

  // Numbers
  expect(10).toBeGreaterThan(5)
  expect(10).toBeGreaterThanOrEqual(10)
  expect(5).toBeLessThan(10)
  expect(0.1 + 0.2).toBeCloseTo(0.3, 5)

  // Strings
  expect('hello world').toMatch(/world/)
  expect('hello').toContain('ell')

  // Arrays
  expect([1, 2, 3]).toContain(2)
  expect([{ a: 1 }]).toContainEqual({ a: 1 })
  expect([1, 2, 3]).toHaveLength(3)

  // Objects
  expect({ a: 1, b: 2 }).toHaveProperty('a')
  expect({ a: 1, b: 2 }).toHaveProperty('a', 1)
  expect({ a: { b: 1 } }).toHaveProperty('a.b', 1)
  expect({ a: 1 }).toMatchObject({ a: 1 })

  // Types
  expect('string').toBeTypeOf('string')
  expect(new Date()).toBeInstanceOf(Date)
})
```

## Negation

```ts
expect(1).not.toBe(2)
expect({ a: 1 }).not.toEqual({ a: 2 })
```

## Error Assertions

```ts
// Sync errors - wrap in function
expect(() => throwError()).toThrow()
expect(() => throwError()).toThrow('message')
expect(() => throwError()).toThrow(/pattern/)
expect(() => throwError()).toThrow(CustomError)

// Async errors - use rejects
await expect(asyncThrow()).rejects.toThrow('error')
```

## Promise Assertions

```ts
// Resolves
await expect(Promise.resolve(1)).resolves.toBe(1)
await expect(fetchData()).resolves.toEqual({ data: true })

// Rejects
await expect(Promise.reject('error')).rejects.toBe('error')
await expect(failingFetch()).rejects.toThrow()
```

## Spy/Mock Assertions

```ts
const fn = vi.fn()
fn('arg1', 'arg2')
fn('arg3')

expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledTimes(2)
expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
expect(fn).toHaveBeenLastCalledWith('arg3')
expect(fn).toHaveBeenNthCalledWith(1, 'arg1', 'arg2')

expect(fn).toHaveReturned()
expect(fn).toHaveReturnedWith(value)
```

## Asymmetric Matchers

Use inside `toEqual`, `toHaveBeenCalledWith`, etc:

```ts
expect({ id: 1, name: 'test' }).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
})

expect({ a: 1, b: 2, c: 3 }).toEqual(
  expect.objectContaining({ a: 1 })
)

expect([1, 2, 3, 4]).toEqual(
  expect.arrayContaining([1, 3])
)

expect('hello world').toEqual(
  expect.stringContaining('world')
)

expect('hello world').toEqual(
  expect.stringMatching(/world$/)
)

expect({ value: null }).toEqual({
  value: expect.anything() // Matches anything except null/undefined
})

// Negate with expect.not
expect([1, 2]).toEqual(
  expect.not.arrayContaining([3])
)
```

## Soft Assertions

Continue test after failure:

```ts
expect.soft(1).toBe(2) // Marks test failed but continues
expect.soft(2).toBe(3) // Also runs
// All failures reported at end
```

## Poll Assertions

Retry until passes:

```ts
await expect.poll(() => fetchStatus()).toBe('ready')

await expect.poll(
  () => document.querySelector('.element'),
  { interval: 100, timeout: 5000 }
).toBeTruthy()
```

## Assertion Count

```ts
test('async assertions', async () => {
  expect.assertions(2) // Exactly 2 assertions must run
  
  await doAsync((data) => {
    expect(data).toBeDefined()
    expect(data.id).toBe(1)
  })
})

test('at least one', () => {
  expect.hasAssertions() // At least 1 assertion must run
})
```

## Extending Matchers

```ts
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    return {
      pass,
      message: () => 
        `expected ${received} to be within range ${floor} - ${ceiling}`,
    }
  },
})

test('custom matcher', () => {
  expect(100).toBeWithinRange(90, 110)
})
```

## Snapshot Assertions

```ts
expect(data).toMatchSnapshot()
expect(data).toMatchInlineSnapshot(`{ "id": 1 }`)
await expect(result).toMatchFileSnapshot('./expected.json')

expect(() => throw new Error('fail')).toThrowErrorMatchingSnapshot()
```

## Chai Assert（4.0 新機能）

```ts
// expect.assert で Chai の assert 機能に直接アクセス（型の絞り込みに便利）
const value: string | number = getValue()
expect.assert(typeof value === 'string', 'value should be a string')
// ここ以降、value は string として型推論される
expect(value.toUpperCase()).toBe('HELLO')
```

## スキーママッチング（4.0 新機能）

Standard Schema v1 に準拠する Zod/Valibot/ArkType でバリデーション:

```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
})

test('API response matches schema', async () => {
  const user = await fetchUser(1)
  expect(user).toMatchSchema(UserSchema)
})
```

## ビジュアルリグレッション（4.0 新機能、ブラウザモード）

```ts
// スクリーンショットのキャプチャと比較
await expect(page.locator('.card')).toMatchScreenshot()

// 要素がビューポート内にあることを検証（IntersectionObserver ベース）
await expect(page.locator('.header')).toBeInViewport()
await expect(page.locator('.section')).toBeInViewport({ ratio: 0.5 })
```

## Key Points

- Use `toBe` for primitives, `toEqual` for objects/arrays
- `toStrictEqual` checks undefined properties and array sparseness
- Always `await` async assertions (`resolves`, `rejects`, `poll`)
- Use context's `expect` in concurrent tests for correct tracking
- `toThrow` requires wrapping sync code in a function
- 4.0: `expect.assert` で Chai assert + 型の絞り込み
- 4.0: `toMatchSchema` で Standard Schema v1 バリデーション
- 4.0: `toMatchScreenshot` / `toBeInViewport` でビジュアルリグレッション（ブラウザモード）

<!-- 
Source references:
- https://vitest.dev/api/expect.html
-->
