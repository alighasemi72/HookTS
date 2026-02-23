export type Results<T> = {
    success: boolean;
    message?: string;
    data: T;
};
export type HookConfig = Record<string, unknown>;
export declare enum HookType {
    Sync = "sync",
    Async = "async",
    Mixed = "mixed"
}
export type HookHandler<T> = (payload: T) => Promise<Results<T>>;
export type HookDefinition<Payload, Mode extends HookType, Config extends HookConfig = {}> = {
    payload: Payload;
    mode: Mode;
    config: Config;
};
export interface HookList {
}
type KnownHookName = Extract<keyof HookList, string>;
declare const HOOK_KEY: unique symbol;
export type HookKey<Name extends string, Payload, Mode extends HookType> = Name & {
    readonly [HOOK_KEY]: {
        payload: Payload;
        mode: Mode;
    };
};
type ModulePart<Name extends string> = Name extends `${infer M}:${string}` ? M : never;
type HookPart<Name extends string> = Name extends `${string}:${infer H}` ? H : never;
type PayloadOf<Name extends KnownHookName> = HookList[Name] extends HookDefinition<infer Payload, HookType, HookConfig> ? Payload : never;
type ModeOf<Name extends KnownHookName> = HookList[Name] extends HookDefinition<unknown, infer Mode, HookConfig> ? Mode : never;
type ConfigOf<Name extends KnownHookName> = HookList[Name] extends HookDefinition<unknown, HookType, infer Config> ? Config : never;
type SyncAttachableName = {
    [Name in KnownHookName]: ModeOf<Name> extends HookType.Sync | HookType.Mixed ? Name : never;
}[KnownHookName];
type AsyncAttachableName = {
    [Name in KnownHookName]: ModeOf<Name> extends HookType.Async | HookType.Mixed ? Name : never;
}[KnownHookName];
export declare function createHook<Name extends KnownHookName>(moduleName: ModulePart<Name>, hookName: HookPart<Name>, hookType: ModeOf<Name>, config?: ConfigOf<Name>): HookKey<Name, PayloadOf<Name>, ModeOf<Name>>;
export declare function createHook<Payload, ModuleName extends string, HookName extends string, Mode extends HookType, Config extends HookConfig = {}>(moduleName: ModuleName, hookName: HookName, hookType: Mode, config?: Config): HookKey<`${ModuleName}:${HookName}`, Payload, Mode>;
export declare function attachHookSync<Name extends string, Payload>(hookName: HookKey<Name, Payload, HookType.Sync | HookType.Mixed>, handler: HookHandler<Payload>, priority?: number): void;
export declare function attachHookSync<Name extends SyncAttachableName>(hookName: Name, handler: HookHandler<PayloadOf<Name>>, priority?: number): void;
export declare function attachHookSync<Payload>(hookName: string, handler: HookHandler<Payload>, priority?: number): void;
export declare function attachHookAsync<Name extends AsyncAttachableName>(hookName: Name, handler: HookHandler<PayloadOf<Name>>): void;
export declare function attachHookAsync<Name extends string, Payload>(hookName: HookKey<Name, Payload, HookType.Async | HookType.Mixed>, handler: HookHandler<Payload>): void;
export declare function attachHookAsync<Payload>(hookName: string, handler: HookHandler<Payload>): void;
export declare function runHook<Name extends KnownHookName>(hookName: Name, parameter: PayloadOf<Name>): Promise<Array<Results<PayloadOf<Name>>>>;
export declare function runHook<Name extends string, Payload, Mode extends HookType>(hookName: HookKey<Name, Payload, Mode>, parameter: Payload): Promise<Array<Results<Payload>>>;
export declare function runHook<Payload>(hookName: string, parameter: Payload): Promise<Array<Results<Payload>>>;
export declare const listHooks: () => string[];
export declare const hasHook: (hookName: string) => boolean;
export {};
