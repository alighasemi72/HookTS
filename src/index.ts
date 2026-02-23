export type Results<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type HookConfig = Record<string, unknown>;

export enum HookType {
  Sync = "sync",
  Async = "async",
  Mixed = "mixed",
}

export type HookHandler<T> = (payload: T) => Promise<Results<T>>;

export type HookDefinition<
  Payload,
  Mode extends HookType,
  Config extends HookConfig = {},
> = {
  payload: Payload;
  mode: Mode;
  config: Config;
};

export interface HookList {}

type KnownHookName = Extract<keyof HookList, string>;
declare const HOOK_KEY: unique symbol;

export type HookKey<
  Name extends string,
  Payload,
  Mode extends HookType,
> = Name & {
  readonly [HOOK_KEY]: {
    payload: Payload;
    mode: Mode;
  };
};

type ModulePart<Name extends string> = Name extends `${infer M}:${string}` ? M : never;
type HookPart<Name extends string> = Name extends `${string}:${infer H}` ? H : never;

type PayloadOf<Name extends KnownHookName> =
  HookList[Name] extends HookDefinition<infer Payload, HookType, HookConfig>
    ? Payload
    : never;

type ModeOf<Name extends KnownHookName> =
  HookList[Name] extends HookDefinition<unknown, infer Mode, HookConfig>
    ? Mode
    : never;

type ConfigOf<Name extends KnownHookName> =
  HookList[Name] extends HookDefinition<unknown, HookType, infer Config>
    ? Config
    : never;

type SyncAttachableName = {
  [Name in KnownHookName]: ModeOf<Name> extends HookType.Sync | HookType.Mixed
    ? Name
    : never;
}[KnownHookName];

type AsyncAttachableName = {
  [Name in KnownHookName]: ModeOf<Name> extends HookType.Async | HookType.Mixed
    ? Name
    : never;
}[KnownHookName];

type RuntimeHook = {
  type: HookType;
  config: HookConfig;
  syncHandlers: Array<{ priority: number; handler: HookHandler<unknown> }>;
  asyncHandlers: Array<HookHandler<unknown>>;
};

const REGISTRY_KEY = Symbol.for("hookts.registry");

type GlobalWithRegistry = typeof globalThis & {
  [REGISTRY_KEY]?: Map<string, RuntimeHook>;
};

const getRegistry = (): Map<string, RuntimeHook> => {
  const scope = globalThis as GlobalWithRegistry;

  if (!scope[REGISTRY_KEY]) {
    scope[REGISTRY_KEY] = new Map<string, RuntimeHook>();
  }

  return scope[REGISTRY_KEY];
};

const getHookName = (moduleName: string, hookName: string): string =>
  `${moduleName}:${hookName}`;

const createRuntimeHook = (type: HookType, config: HookConfig): RuntimeHook => ({
  type,
  config,
  syncHandlers: [],
  asyncHandlers: [],
});

const assertPositivePriority = (priority: number): void => {
  if (!Number.isFinite(priority) || priority <= 0) {
    throw new Error("Hook priority must be a number greater than 0.");
  }
};

const getRegisteredHook = (hookName: string): RuntimeHook => {
  const hook = getRegistry().get(hookName);

  if (!hook) {
    throw new Error(`Hook \"${hookName}\" is not registered. Call createHook first.`);
  }

  return hook;
};

export function createHook<Name extends KnownHookName>(
  moduleName: ModulePart<Name>,
  hookName: HookPart<Name>,
  hookType: ModeOf<Name>,
  config?: ConfigOf<Name>,
): HookKey<Name, PayloadOf<Name>, ModeOf<Name>>;

export function createHook<
  Payload,
  ModuleName extends string,
  HookName extends string,
  Mode extends HookType,
  Config extends HookConfig = {},
>(
  moduleName: ModuleName,
  hookName: HookName,
  hookType: Mode,
  config?: Config,
): HookKey<`${ModuleName}:${HookName}`, Payload, Mode>;

export function createHook(
  moduleName: string,
  hookName: string,
  hookType: HookType,
  config: HookConfig = {},
): string {
  const fullName = getHookName(moduleName, hookName);
  const registry = getRegistry();
  const existing = registry.get(fullName);

  if (!existing) {
    registry.set(fullName, createRuntimeHook(hookType, config));
    return fullName;
  }

  if (existing.type !== hookType) {
    throw new Error(
      `Hook \"${fullName}\" already exists with type \"${existing.type}\".`,
    );
  }

  existing.config = { ...existing.config, ...config };
  return fullName;
}

export function attachHookSync<Name extends string, Payload>(
  hookName: HookKey<Name, Payload, HookType.Sync | HookType.Mixed>,
  handler: HookHandler<Payload>,
  priority?: number,
): void;

export function attachHookSync<Name extends SyncAttachableName>(
  hookName: Name,
  handler: HookHandler<PayloadOf<Name>>,
  priority?: number,
): void;

export function attachHookSync<Payload>(
  hookName: string,
  handler: HookHandler<Payload>,
  priority?: number,
): void;

export function attachHookSync<Payload>(
  hookName: string,
  handler: HookHandler<Payload>,
  priority = 100,
): void {
  assertPositivePriority(priority);

  const hook = getRegisteredHook(hookName);

  if (hook.type === HookType.Async) {
    throw new Error(
      `Hook \"${hookName}\" has async mode and does not support attachHookSync.`,
    );
  }

  const nextHandlers = [
    ...hook.syncHandlers,
    { priority, handler: handler as HookHandler<unknown> },
  ].sort((left, right) => left.priority - right.priority);

  hook.syncHandlers = nextHandlers;
}

export function attachHookAsync<Name extends AsyncAttachableName>(
  hookName: Name,
  handler: HookHandler<PayloadOf<Name>>,
): void;

export function attachHookAsync<Name extends string, Payload>(
  hookName: HookKey<Name, Payload, HookType.Async | HookType.Mixed>,
  handler: HookHandler<Payload>,
): void;

export function attachHookAsync<Payload>(
  hookName: string,
  handler: HookHandler<Payload>,
): void;

export function attachHookAsync<Payload>(
  hookName: string,
  handler: HookHandler<Payload>,
): void {
  const hook = getRegisteredHook(hookName);

  if (hook.type === HookType.Sync) {
    throw new Error(
      `Hook \"${hookName}\" has sync mode and does not support attachHookAsync.`,
    );
  }

  hook.asyncHandlers = [...hook.asyncHandlers, handler as HookHandler<unknown>];
}

export function runHook<Name extends KnownHookName>(
  hookName: Name,
  parameter: PayloadOf<Name>,
): Promise<Array<Results<PayloadOf<Name>>>>;

export function runHook<Name extends string, Payload, Mode extends HookType>(
  hookName: HookKey<Name, Payload, Mode>,
  parameter: Payload,
): Promise<Array<Results<Payload>>>;

export function runHook<Payload>(
  hookName: string,
  parameter: Payload,
): Promise<Array<Results<Payload>>>;

export async function runHook<Payload>(
  hookName: string,
  parameter: Payload,
): Promise<Array<Results<Payload>>> {
  const hook = getRegisteredHook(hookName);
  const syncResults: Array<Results<Payload>> = [];

  if (hook.type !== HookType.Async) {
    for (const entry of hook.syncHandlers) {
      const result = await (entry.handler as HookHandler<Payload>)(parameter);
      syncResults.push(result);
    }
  }

  if (hook.type === HookType.Sync) {
    return syncResults;
  }

  const asyncResults = await Promise.all(
    hook.asyncHandlers.map((handler) => (handler as HookHandler<Payload>)(parameter)),
  );

  return [...syncResults, ...asyncResults];
}

export const listHooks = (): string[] => [...getRegistry().keys()];

export const hasHook = (hookName: string): boolean => getRegistry().has(hookName);
