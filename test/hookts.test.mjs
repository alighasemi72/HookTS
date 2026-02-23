import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachHookAsync,
  attachHookSync,
  createHook,
  HookType,
  runHook,
} from '../dist/index.js';

let id = 0;
const unique = (name) => `${name}_${Date.now()}_${++id}`;

test('sync hooks run in ascending priority order', async () => {
  const moduleName = unique('sync_module');
  const hookName = unique('created');
  const fullHook = createHook(moduleName, hookName, HookType.Sync);

  const order = [];

  attachHookSync(fullHook, async (payload) => {
    order.push('p20');
    return { success: true, data: payload };
  }, 20);

  attachHookSync(fullHook, async (payload) => {
    order.push('p10');
    return { success: true, data: payload };
  }, 10);

  const results = await runHook(fullHook, { id: 1 });

  assert.deepEqual(order, ['p10', 'p20']);
  assert.equal(results.length, 2);
  assert.equal(results[0].success, true);
});

test('async hooks run attached handlers and return all results', async () => {
  const moduleName = unique('async_module');
  const hookName = unique('created');
  const fullHook = createHook(moduleName, hookName, HookType.Async);

  const calls = [];

  attachHookAsync(fullHook, async (payload) => {
    calls.push('a1-start');
    await new Promise((resolve) => setTimeout(resolve, 20));
    calls.push('a1-end');
    return { success: true, data: payload };
  });

  attachHookAsync(fullHook, async (payload) => {
    calls.push('a2-start');
    await new Promise((resolve) => setTimeout(resolve, 20));
    calls.push('a2-end');
    return { success: true, data: payload };
  });

  const results = await runHook(fullHook, { id: 2 });

  assert.equal(results.length, 2);
  assert.equal(calls.includes('a1-start'), true);
  assert.equal(calls.includes('a2-start'), true);
  assert.equal(calls.includes('a1-end'), true);
  assert.equal(calls.includes('a2-end'), true);
});

test('mixed hooks run sync first then async handlers', async () => {
  const moduleName = unique('mixed_module');
  const hookName = unique('created');
  const fullHook = createHook(moduleName, hookName, HookType.Mixed);

  const steps = [];

  attachHookSync(fullHook, async (payload) => {
    steps.push('sync');
    return { success: true, data: payload };
  }, 1);

  attachHookAsync(fullHook, async (payload) => {
    steps.push('async-start');
    await new Promise((resolve) => setTimeout(resolve, 10));
    steps.push('async-end');
    return { success: true, data: payload };
  });

  const results = await runHook(fullHook, { id: 3 });

  assert.equal(results.length, 2);
  assert.equal(steps[0], 'sync');
  assert.equal(steps[1], 'async-start');
});

test('invalid mode attachments throw runtime errors', async () => {
  const moduleName = unique('guard_module');
  const hookName = unique('created');
  const fullHook = createHook(moduleName, hookName, HookType.Async);

  await assert.rejects(
    async () => {
      attachHookSync(fullHook, async (payload) => ({ success: true, data: payload }), 1);
    },
    /does not support attachHookSync/,
  );
});
