import { attachHookSync, createHook, HookType, runHook } from '../dist/index.js';

const userCreatedHook = createHook('user', 'created', HookType.Sync);

attachHookSync(
  userCreatedHook,
  async (payload) => ({
    success: true,
    message: `Welcome ${payload.name}`,
    data: payload,
  }),
  1,
);

const result = await runHook(userCreatedHook, { id: '1', name: 'Ali' });
console.log(result);
