export var HookType;
(function (HookType) {
    HookType["Sync"] = "sync";
    HookType["Async"] = "async";
    HookType["Mixed"] = "mixed";
})(HookType || (HookType = {}));
const REGISTRY_KEY = Symbol.for("hookts.registry");
const getRegistry = () => {
    const scope = globalThis;
    if (!scope[REGISTRY_KEY]) {
        scope[REGISTRY_KEY] = new Map();
    }
    return scope[REGISTRY_KEY];
};
const getHookName = (moduleName, hookName) => `${moduleName}:${hookName}`;
const createRuntimeHook = (type, config) => ({
    type,
    config,
    syncHandlers: [],
    asyncHandlers: [],
});
const assertPositivePriority = (priority) => {
    if (!Number.isFinite(priority) || priority <= 0) {
        throw new Error("Hook priority must be a number greater than 0.");
    }
};
const getRegisteredHook = (hookName) => {
    const hook = getRegistry().get(hookName);
    if (!hook) {
        throw new Error(`Hook \"${hookName}\" is not registered. Call createHook first.`);
    }
    return hook;
};
export function createHook(moduleName, hookName, hookType, config = {}) {
    const fullName = getHookName(moduleName, hookName);
    const registry = getRegistry();
    const existing = registry.get(fullName);
    if (!existing) {
        registry.set(fullName, createRuntimeHook(hookType, config));
        return fullName;
    }
    if (existing.type !== hookType) {
        throw new Error(`Hook \"${fullName}\" already exists with type \"${existing.type}\".`);
    }
    existing.config = { ...existing.config, ...config };
    return fullName;
}
export function attachHookSync(hookName, handler, priority = 100) {
    assertPositivePriority(priority);
    const hook = getRegisteredHook(hookName);
    if (hook.type === HookType.Async) {
        throw new Error(`Hook \"${hookName}\" has async mode and does not support attachHookSync.`);
    }
    const nextHandlers = [
        ...hook.syncHandlers,
        { priority, handler: handler },
    ].sort((left, right) => left.priority - right.priority);
    hook.syncHandlers = nextHandlers;
}
export function attachHookAsync(hookName, handler) {
    const hook = getRegisteredHook(hookName);
    if (hook.type === HookType.Sync) {
        throw new Error(`Hook \"${hookName}\" has sync mode and does not support attachHookAsync.`);
    }
    hook.asyncHandlers = [...hook.asyncHandlers, handler];
}
export async function runHook(hookName, parameter) {
    const hook = getRegisteredHook(hookName);
    const syncResults = [];
    if (hook.type !== HookType.Async) {
        for (const entry of hook.syncHandlers) {
            const result = await entry.handler(parameter);
            syncResults.push(result);
        }
    }
    if (hook.type === HookType.Sync) {
        return syncResults;
    }
    const asyncResults = await Promise.all(hook.asyncHandlers.map((handler) => handler(parameter)));
    return [...syncResults, ...asyncResults];
}
export const listHooks = () => [...getRegistry().keys()];
export const hasHook = (hookName) => getRegistry().has(hookName);
