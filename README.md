# HookTS

A dependency-free, type-safe hook package for Node.js and browser environments.

## Features

- Fully async handler model (`HookHandler<T> = (payload: T) => Promise<Results<T>>`)
- Three modes: `sync`, `async`, and `mixed`
- Module augmentation support for hook name autocomplete and payload typing
- Functional API (`createHook`, `attachHookSync`, `attachHookAsync`, `runHook`)

## Install

```bash
npm install hookts
```

## Run Tests

```bash
npm test
```

## Run Examples

```bash
npm run example:basic
npm run example:mixed
```

## Types

```ts
import { HookDefinition, HookType, type Results } from "hookts";

type User = { id: string; name: string };

declare module "hookts" {
  interface HookList {
    "user:created": HookDefinition<User, HookType.Mixed>;
  }
}
```

## Create Hook

```ts
import { createHook, HookType } from "hookts";

const userCreatedHook = createHook<{ id: string; name: string }>(
  "user",
  "created",
  HookType.Mixed,
);
```

## Attach Functions

```ts
import { attachHookAsync, attachHookSync } from "hookts";

attachHookSync(userCreatedHook, async (payload) => ({
  success: true,
  data: payload,
}), 1);

attachHookAsync(userCreatedHook, async (payload) => ({
  success: true,
  message: "async handler",
  data: payload,
}));
```

## Run Hook

```ts
import { runHook } from "hookts";

const results = await runHook(userCreatedHook, { id: "1", name: "Ali" });
// results: Results<User>[]
```

## Execution Rules

- `sync`: handlers from `attachHookSync`, ordered by priority ascending
- `async`: handlers from `attachHookAsync`, all run in parallel
- `mixed`: sync handlers run by priority, async handlers run in parallel after sync handlers

## API

- `createHook(moduleName, hookName, hookType, config?)`
- `attachHookSync(hookName, handler, priority?)`
- `attachHookAsync(hookName, handler)`
- `runHook(hookName, payload)`
- `listHooks()`
- `hasHook(hookName)`

## Result Type

```ts
type Results<T> = {
  success: boolean;
  message?: string;
  data: T;
};
```
