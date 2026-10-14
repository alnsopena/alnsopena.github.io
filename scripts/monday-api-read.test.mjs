import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllUpdates, fetchWithRetry } from './monday-api-read.mjs';

test('comments use typed API, preserve replies and paginate without duplicates', async () => {
  const calls = [];
  const reply = { id: 'reply', text_body: 'New reply', creator: { name: 'PM' } };
  const client = { callTool: async (name, args) => {
    calls.push({ name, args });
    const { ids, page } = JSON.parse(args.variables);
    const updates = page === 1
      ? [{ id: 1, item_id: 10, text_body: 'First', replies: [reply], assets: [{ id: 'asset' }] }, { id: 2, item_id: 20, text_body: 'Second' }]
      : page === 2 ? [{ id: 2, item_id: 20, text_body: 'Second' }, { id: 3, item_id: 30, text_body: 'Newest' }] : [];
    return { data: { boards: [{ id: ids[0], updates }] } };
  } };
  const result = await getAllUpdates(client, 'board', { limit: 2 });
  assert.deepEqual(result.map(x => x.id), ['1', '2', '3']);
  assert.equal(result[0].item_id, '10');
  assert.deepEqual(result[0].replies, [reply]);
  assert.equal(result[0].assets[0].id, 'asset');
  assert.equal(calls.length, 3);
  assert.ok(calls.every(c => c.name === 'all_api_read' && /board_updates_only: false/.test(c.args.query)));
});

test('missing comments, API errors and repeated full pages fail rather than publish a false empty cut', async () => {
  for (const result of [{ boards: [{ id: 'board' }] }, { boards: [] }, { errors: [{ message: 'failed' }] }]) {
    await assert.rejects(getAllUpdates({ callTool: async () => result }, 'board'));
  }
  await assert.rejects(getAllUpdates({ callTool: async () => ({ boards: [{ id: 'board', updates: [{ id: 'same' }] }] }) }, 'board', { limit: 1 }), /no avanza/);
});

test('temporary failures retry with a bounded delay; authentication errors do not retry', async () => {
  const delays = [], responses = [new Response('', { status: 429, headers: { 'Retry-After': '60' } }), new Response('', { status: 503 }), new Response('{}')];
  const result = await fetchWithRetry('https://mcp.monday.com/mcp', {}, { request: async () => responses.shift(), sleep: async ms => delays.push(ms) });
  assert.equal(result.status, 200);
  assert.deepEqual(delays, [20000, 2000]);
  let calls = 0;
  const unauthorized = await fetchWithRetry('https://mcp.monday.com/mcp', {}, { request: async () => { calls++; return new Response('', { status: 401 }); }, sleep: async () => assert.fail('Do not retry authentication') });
  assert.equal(unauthorized.status, 401);
  assert.equal(calls, 1);
});

test('network failure retries and permanent outage stops after three attempts', async () => {
  let calls = 0;
  await assert.rejects(fetchWithRetry('https://mcp.monday.com/mcp', {}, { request: async () => { calls++; throw new TypeError('Network down'); }, sleep: async () => {} }), /Network down/);
  assert.equal(calls, 3);
});
