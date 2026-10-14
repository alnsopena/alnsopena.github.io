import { setTimeout as wait } from 'node:timers/promises';

// Use the typed API through the existing MCP connection. The convenience
// get_updates tool changed its objectId argument and stopped scheduled cuts.
const UPDATE_FIELDS = `id item_id text_body created_at updated_at
  creator { id name }
  assets { id name url file_extension file_size created_at }
  replies { id text_body created_at updated_at creator { id name }
    assets { id name url file_extension file_size created_at } }`;

export async function getAllUpdates(client, boardId, { limit = 100, maxPages = 100 } = {}) {
  const updates = new Map();
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await client.callTool('all_api_read', {
      query: `query PortfolioUpdates($ids: [ID!]!, $page: Int!, $limit: Int!) {
        boards(ids: $ids) { id updates(limit: $limit, page: $page, board_updates_only: false) {
          ${UPDATE_FIELDS}
        } }
      }`,
      variables: JSON.stringify({ ids: [String(boardId)], page, limit }),
    });
    if (result.errors?.length) throw new Error('monday rechazó la lectura de comentarios');
    const boards = result.data?.boards ?? result.boards;
    const board = boards?.find(b => String(b.id) === String(boardId));
    if (!Array.isArray(board?.updates)) throw new Error(`Lectura de comentarios incompleta para el tablero ${boardId}`);
    const before = updates.size;
    for (const entry of board.updates) {
      if (!entry.id) throw new Error('monday devolvió un comentario sin identificador');
      updates.set(String(entry.id), {
        ...entry,
        id: String(entry.id),
        item_id: entry.item_id == null ? null : String(entry.item_id),
        replies: entry.replies ?? [], assets: entry.assets ?? [],
      });
    }
    if (board.updates.length < limit) return [...updates.values()];
    if (updates.size === before) throw new Error('La paginación de comentarios no avanza');
  }
  throw new Error(`Paginación de actualizaciones ${boardId} excedió el límite de seguridad`);
}

export async function fetchWithRetry(url, options, { request = fetch, sleep = wait } = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response;
    try { response = await request(url, options); }
    catch (error) {
      if (!(error instanceof TypeError) || attempt === 2) throw error;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const temporary = response.status === 429 || response.status >= 500;
    if (!temporary || attempt === 2) return response;
    const retryAfter = Number(response.headers.get('Retry-After'));
    const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 20000) : 1000 * 2 ** attempt;
    await response.body?.cancel();
    await sleep(delay);
  }
}
