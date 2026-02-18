---
name: vi-utilities
description: vi helper for mocking, timers, utilities
---

# Vi Utilities

The `vi` helper provides mocking and utility functions.

```ts
import { vi } from 'vitest'
```

## Mock Functions

```ts
// Create mock
const fn = vi.fn()
const fnWithImpl = vi.fn((x) => x * 2)

// Check if mock
vi.isMockFunction(fn) // true

// Mock methods
fn.mockReturnValue(42)
fn.mockReturnValueOnce(1)
fn.mockResolvedValue(data)
fn.mockRejectedValue(error)
fn.mockImplementation(() => 'result')
fn.mockImplementationOnce(() => 'once')

// Clear/reset
fn.mockClear()    // Clear call history
fn.mockReset()    // Clear history + implementation
fn.mockRestore()  // Restore original (for spies)
```

## Spying

```ts
const obj = { method: () => 'original' }

const spy = vi.spyOn(obj, 'method')
obj.method()

expect(spy).toHaveBeenCalled()

// Mock implementation
spy.mockReturnValue('mocked')

// Spy on getter/setter
vi.spyOn(obj, 'prop', 'get').mockReturnValue('value')

// コンストラクタの監視（4.0 新機能）
vi.spyOn(globalThis, 'Request')
const req = new Request('https://example.com')
expect(globalThis.Request).toHaveBeenCalledWith('https://example.com')
```

## Module Mocking

```ts
// Hoisted to top of file
vi.mock('./module', () => ({
  fn: vi.fn(),
}))

// Partial mock
vi.mock('./module', async (importOriginal) => ({
  ...(await importOriginal()),
  specificFn: vi.fn(),
}))

// Spy mode - keep implementation
vi.mock('./module', { spy: true })

// Import actual module inside mock
const actual = await vi.importActual('./module')

// Import as mock
const mocked = await vi.importMock('./module')
```

## Dynamic Mocking

```ts
// Not hoisted - use with dynamic imports
vi.doMock('./config', () => ({ key: 'value' }))
const config = await import('./config')

// Unmock
vi.doUnmock('./config')
vi.unmock('./module') // Hoisted
```

## Reset Modules

```ts
// Clear module cache
vi.resetModules()

// Wait for dynamic imports
await vi.dynamicImportSettled()
```

## Fake Timers

```ts
vi.useFakeTimers()

setTimeout(() => console.log('done'), 1000)

// Advance time
vi.advanceTimersByTime(1000)
vi.advanceTimersByTimeAsync(1000)  // For async callbacks
vi.advanceTimersToNextTimer()
vi.advanceTimersToNextFrame()      // requestAnimationFrame

// Run all timers
vi.runAllTimers()
vi.runAllTimersAsync()
vi.runOnlyPendingTimers()

// Clear timers
vi.clearAllTimers()

// Check state
vi.getTimerCount()
vi.isFakeTimers()

// Restore
vi.useRealTimers()
```

## Mock Date/Time

```ts
vi.setSystemTime(new Date('2024-01-01'))
expect(new Date().getFullYear()).toBe(2024)

vi.getMockedSystemTime()  // Get mocked date
vi.getRealSystemTime()    // Get real time (ms)
```

## Global/Env Mocking

```ts
// Stub global
vi.stubGlobal('fetch', vi.fn())
vi.unstubAllGlobals()

// Stub environment
vi.stubEnv('API_KEY', 'test')
vi.stubEnv('NODE_ENV', 'test')
vi.unstubAllEnvs()
```

## Hoisted Code

Run code before imports:

```ts
const mock = vi.hoisted(() => vi.fn())

vi.mock('./module', () => ({
  fn: mock, // Can reference hoisted variable
}))
```

## Waiting Utilities

```ts
// Wait for callback to succeed
await vi.waitFor(async () => {
  const el = document.querySelector('.loaded')
  expect(el).toBeTruthy()
}, { timeout: 5000, interval: 100 })

// Wait for truthy value
const element = await vi.waitUntil(
  () => document.querySelector('.loaded'),
  { timeout: 5000 }
)
```

## Mock Object

Mock all methods of an object:

```ts
const original = {
  method: () => 'real',
  nested: { fn: () => 'nested' },
}

const mocked = vi.mockObject(original)
mocked.method()  // undefined (mocked)
mocked.method.mockReturnValue('mocked')

// Spy mode
const spied = vi.mockObject(original, { spy: true })
spied.method()  // 'real'
expect(spied.method).toHaveBeenCalled()
```

## Test Configuration

```ts
vi.setConfig({
  testTimeout: 10_000,
  hookTimeout: 10_000,
})

vi.resetConfig()
```

## Global Mock Management

```ts
vi.clearAllMocks()   // Clear all mock call history
vi.resetAllMocks()   // Reset + clear implementation
vi.restoreAllMocks() // Restore originals（4.0: vi.spyOn のスパイのみ対象）
```

## vi.mocked Type Helper

TypeScript helper for mocked values:

```ts
import { myFn } from './module'
vi.mock('./module')

// Type as mock
vi.mocked(myFn).mockReturnValue('typed')

// Deep mocking
vi.mocked(myModule, { deep: true })

// Partial mock typing
vi.mocked(fn, { partial: true }).mockResolvedValue({ ok: true })
```

## 4.0 でのモック動作変更

| 項目 | 3.x | 4.x |
|------|-----|-----|
| `vi.fn().getMockName()` | `"spy"` | `""（空文字列）` |
| `vi.restoreAllMocks()` | 全モック対象 | `vi.spyOn` のスパイのみ |
| `mock.invocationCallOrder` | 0 始まり | 1 始まり |
| `mock.settledResults` | 完了後に追加 | 呼び出し直後に `{ type: 'incomplete' }` で populate |
| コンストラクタ監視 | 未サポート | `vi.fn` / `vi.spyOn` でサポート |

## Key Points

- `vi.mock` is hoisted - use `vi.doMock` for dynamic mocking
- `vi.hoisted` lets you reference variables in mock factories
- Use `vi.spyOn` to spy on existing methods
- Fake timers require explicit setup and teardown
- `vi.waitFor` retries until assertion passes
- 4.0: `vi.fn` / `vi.spyOn` でコンストラクタ呼び出しを監視可能
- 4.0: `vi.restoreAllMocks()` は `vi.spyOn` で作成したスパイのみ復元

<!-- 
Source references:
- https://vitest.dev/api/vi.html
-->
