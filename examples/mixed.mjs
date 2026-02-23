import {
  attachHookAsync,
  attachHookSync,
  createHook,
  HookType,
  runHook,
} from '../dist/index.js';

const hook = createHook('order', 'paid', HookType.Mixed);

attachHookSync(
  hook,
  async (payload) => {
    console.log('sync: reserve inventory');
    return { success: true, data: payload };
  },
  1,
);

attachHookAsync(hook, async (payload) => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log('async: send email');
  return { success: true, data: payload };
});

attachHookAsync(hook, async (payload) => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log('async: emit analytics');
  return { success: true, data: payload };
});

const results = await runHook(hook, { orderId: 'ORD-1' });
console.log(results);
