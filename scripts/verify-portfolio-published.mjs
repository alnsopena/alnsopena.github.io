import { createHash } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export function updatesDigest(snapshot) {
  const fields = entry => [String(entry.id), entry.text_body ?? '', entry.created_at ?? '', entry.updated_at ?? '', entry.creator?.id ?? '', entry.creator?.name ?? ''];
  const updates = (snapshot.updates ?? []).map(entry => [
    String(entry.item_id ?? ''), ...fields(entry),
    (entry.replies ?? []).map(fields).sort((a, b) => a[0].localeCompare(b[0])),
  ]).sort((a, b) => a[1].localeCompare(b[1]));
  return createHash('sha256').update(JSON.stringify(updates)).digest('hex');
}

export async function verifyPublishedCut(url, expected, { request = fetch, sleep = wait, attempts = 5 } = {}) {
  if (!expected.cut || !expected.digest) throw new Error('Falta la referencia del corte que debe publicarse');
  let error;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const target = new URL(url);
      target.searchParams.set('__verify_cut', expected.cut + '-' + attempt);
      const response = await request(target, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('La web publicada respondió HTTP ' + response.status);
      const match = (await response.text()).match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
      if (!match) throw new Error('La web publicada no contiene el corte de monday');
      const snapshot = JSON.parse(match[1]);
      if (snapshot.extracted_at_utc !== expected.cut || updatesDigest(snapshot) !== expected.digest) {
        throw new Error('La web publicada todavía no contiene el corte y los comentarios completos');
      }
      return snapshot.extracted_at_utc;
    } catch (failure) { error = failure; }
    if (attempt + 1 < attempts) await sleep(5000);
  }
  throw error;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cut = await verifyPublishedCut('https://alnsopena.github.io/portafolio-ejecutivo-it/', {
    cut: process.env.EXPECTED_CUT, digest: process.env.EXPECTED_UPDATES_DIGEST,
  });
  console.log('Publicación verificada: corte ' + cut + ' y comentarios completos.');
}
