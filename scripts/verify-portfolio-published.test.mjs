import test from 'node:test';
import assert from 'node:assert/strict';
import { updatesDigest, verifyPublishedCut } from './verify-portfolio-published.mjs';

const snapshot = { extracted_at_utc: '2026-10-14T16:00:00Z', updates: [{ id: '1', item_id: 'project', text_body: 'Latest comment', created_at: '2026-10-13T14:31:00Z', replies: [{ id: '2', text_body: 'Reply' }] }] };
const expected = { cut: snapshot.extracted_at_utc, digest: updatesDigest(snapshot) };
const html = data => '<script type="application/json" id="snapshot">' + JSON.stringify(data) + '</script>';

test('publication check tolerates CDN delay and then verifies the exact cut and comments', async () => {
  let calls = 0;
  const cut = await verifyPublishedCut('https://example.com/', expected, {
    request: async (target, options) => {
      assert.ok(target.searchParams.get('__verify_cut').startsWith(expected.cut));
      assert.equal(options.cache, 'no-store');
      assert.match(options.headers['Cache-Control'], /no-cache/);
      return new Response(html(++calls <= 6 ? { ...snapshot, extracted_at_utc: 'old' } : snapshot));
    },
    sleep: async () => {},
  });
  assert.equal(calls, 7);
  assert.equal(cut, snapshot.extracted_at_utc);
});

test('fresh timestamp with missing comments does not pass the publication check', async () => {
  await assert.rejects(verifyPublishedCut('https://example.com/', expected, {
    request: async () => new Response(html({ ...snapshot, updates: [] })), sleep: async () => {}, attempts: 2,
  }), /comentarios completos/);
  assert.notEqual(updatesDigest(snapshot), updatesDigest({ ...snapshot, updates: [{ ...snapshot.updates[0], replies: [] }] }));
});
