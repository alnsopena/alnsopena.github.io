import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, '_site');
const PORTFOLIO_SOURCE = path.join(ROOT, 'portafolio-ejecutivo-it', 'index.html');
const PORTFOLIO_OUTPUT = path.join(OUTPUT, 'portafolio-ejecutivo-it', 'index.html');
const MCP_URL = 'https://mcp.monday.com/mcp';
const API_VERSION = '2026-07';
const BOARD_ID = 18396270726;
const SUBITEM_BOARD_ID = 18397995230;

class MondayMcpClient {
  sessionId = null;
  requestId = 0;

  constructor(token) {
    this.token = token;
  }

  headers() {
    const headers = {
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Api-Version': API_VERSION,
      'MCP-Protocol-Version': '2025-06-18',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    return headers;
  }

  async post(body) {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const nextSession = response.headers.get('Mcp-Session-Id');
    if (nextSession) this.sessionId = nextSession;
    if (!response.ok) throw new Error(`monday MCP respondió ${response.status}`);
    return response;
  }

  async decode(response) {
    const body = await response.text();
    if (!body.trim()) return { jsonrpc: '2.0' };
    if ((response.headers.get('content-type') ?? '').includes('text/event-stream') || body.startsWith('event:')) {
      const messages = body
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .filter((line) => line && line !== '[DONE]')
        .map((line) => JSON.parse(line));
      const message = messages.find((candidate) => candidate.result || candidate.error);
      if (!message) throw new Error('Respuesta SSE de monday MCP sin resultado');
      return message;
    }
    return JSON.parse(body);
  }

  async rpc(method, params) {
    const id = ++this.requestId;
    const envelope = await this.decode(await this.post({ jsonrpc: '2.0', id, method, params }));
    if (envelope.error) throw new Error(envelope.error.message ?? `Error MCP ${envelope.error.code ?? ''}`);
    if (envelope.result === undefined) throw new Error(`monday MCP no devolvió resultado para ${method}`);
    return envelope.result;
  }

  async connect() {
    await this.rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'cosmos-it-portfolio-github', version: '1.0.0' },
    });
    await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  }

  async callTool(name, args) {
    const result = await this.rpc('tools/call', { name, arguments: args });
    if (result.isError) {
      const message = result.content?.map((entry) => entry.text).filter(Boolean).join(' ') || `Falló ${name}`;
      throw new Error(message);
    }
    if (result.structuredContent !== undefined) return result.structuredContent;
    const text = result.content?.find((entry) => entry.type === 'text')?.text;
    if (!text) throw new Error(`${name} no devolvió contenido estructurado`);
    return JSON.parse(text);
  }
}

async function getAllItems(client) {
  const items = [];
  let cursor;
  for (let page = 0; page < 100; page += 1) {
    const result = await client.callTool('get_board_items_page', {
      boardId: BOARD_ID,
      limit: 100,
      cursor,
      includeColumns: true,
      includeSubItems: true,
      includeGroup: true,
      includeItemDescription: true,
      subItemLimit: 100,
    });
    items.push(
      ...(result.items ?? []).map((item) => ({
        ...item,
        id: String(item.id),
        subitems: (item.subitems ?? []).map((subitem) => ({
          ...subitem,
          id: String(subitem.id),
          parent_item_id: String(subitem.parent_item_id || item.id),
        })),
      })),
    );
    if (!result.pagination?.has_more || !result.pagination.nextCursor) return items;
    cursor = result.pagination.nextCursor;
  }
  throw new Error('Paginación de proyectos excedió el límite de seguridad');
}

async function getAllUpdates(client, boardId) {
  const updates = [];
  const limit = 100;
  for (let page = 1; page <= 100; page += 1) {
    const result = await client.callTool('get_updates', {
      objectId: String(boardId),
      objectType: 'Board',
      includeItemUpdates: true,
      includeReplies: true,
      includeAssets: true,
      limit,
      page,
    });
    const current = (result.updates ?? []).map((update) => ({
      ...update,
      id: String(update.id),
      item_id: update.item_id == null ? null : String(update.item_id),
    }));
    updates.push(...current);
    if (current.length < limit || result.pagination?.count === 0) return updates;
  }
  throw new Error(`Paginación de actualizaciones ${boardId} excedió el límite de seguridad`);
}

async function fetchSnapshot(token, previous) {
  const client = new MondayMcpClient(token);
  await client.connect();

  const boardResult = await client.callTool('get_board_info', { boardId: BOARD_ID });
  const subitemBoardResult = await client.callTool('get_board_info', { boardId: SUBITEM_BOARD_ID });
  const board = boardResult.board ?? boardResult;
  const subitemBoard = subitemBoardResult.board ?? subitemBoardResult;
  const items = await getAllItems(client);
  if (!items.length) throw new Error('La lectura completa devolvió cero proyectos');

  const mainUpdates = await getAllUpdates(client, BOARD_ID);
  const subitemUpdates = await getAllUpdates(client, SUBITEM_BOARD_ID);
  const updates = [...new Map([...mainUpdates, ...subitemUpdates].map((update) => [update.id, update])).values()];
  const subitems = items.flatMap((item) => item.subitems ?? []);
  const ids = [...items.map((item) => item.id), ...subitems.map((item) => item.id)];

  const rawResponse = await client.callTool('all_api_read', {
    query: `query PortfolioRaw($ids: [ID!]!) {
      items(ids: $ids, limit: 100) {
        id
        name
        state
        description {
          id
          blocks {
            id
            content
          }
        }
        column_values {
          id
          type
          text
          value
          ... on FormulaValue { display_value }
        }
      }
    }`,
    variables: JSON.stringify({ ids }),
  });
  const rawItems = rawResponse.data?.items ?? rawResponse.items ?? [];
  if (rawItems.length !== ids.length) {
    throw new Error(`Lectura tipada incompleta: ${rawItems.length}/${ids.length} elementos`);
  }

  const itemIds = new Set(ids);
  const linkedUpdates = updates.filter((update) => update.item_id && itemIds.has(update.item_id));
  const assetIds = new Set(
    updates.flatMap((update) => [
      ...(update.assets ?? []).map((asset) => String(asset.id)),
      ...(update.replies ?? []).flatMap((reply) => (reply.assets ?? []).map((asset) => String(asset.id))),
    ]),
  );
  const replyCount = updates.reduce((sum, update) => sum + (update.replies?.length ?? 0), 0);
  const normalizedBoard = {
    ...board,
    id: String(board.id ?? BOARD_ID),
    columns: board.columns ?? [],
    subItemColumns: subitemBoard.columns ?? [],
  };

  if (normalizedBoard.id !== String(BOARD_ID) || normalizedBoard.columns.length === 0) {
    throw new Error('Los metadatos del tablero no superaron la validación');
  }
  if (previous?.inventory?.projects && items.length < Math.floor(previous.inventory.projects * 0.5)) {
    throw new Error(`Caída anómala de proyectos: ${previous.inventory.projects} a ${items.length}`);
  }

  return {
    extracted_at_utc: new Date().toISOString(),
    board_id: String(BOARD_ID),
    scope: 'Lectura MCP completa: metadatos, proyectos, subelementos, valores tipados, fórmulas, actualizaciones, respuestas y referencias de archivos.',
    decisions: {
      fin_real: 'Fecha efectiva de cierre, confirmado por el usuario el 2026-09-09',
      direction: 'monday -> portal',
      refresh: 'Actualización horaria mediante GitHub Actions y monday MCP; sin tareas programadas de Codex.',
    },
    inventory: {
      projects: items.length,
      subitems: subitems.length,
      columns: normalizedBoard.columns.length,
      subColumns: normalizedBoard.subItemColumns.length,
      views: normalizedBoard.views?.length ?? 0,
      rawItems: rawItems.length,
      descriptions: rawItems.filter((entry) => Boolean(entry.description)).length,
      updates: updates.length,
      currentLinkedUpdates: linkedUpdates.length,
      historyOtherIds: updates.length - linkedUpdates.length,
      replies: replyCount,
      assetsUnique: assetIds.size,
    },
    board: normalizedBoard,
    items,
    raw_items: rawItems,
    updates,
  };
}

function readEmbeddedSnapshot(html) {
  const match = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No se encontró el corte embebido en el portal');
  return JSON.parse(match[1]);
}

function replaceEmbeddedSnapshot(html, snapshot) {
  const serialized = JSON.stringify(snapshot)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  return html.replace(
    /(<script type="application\/json" id="snapshot">)[\s\S]*?(<\/script>)/,
    (_whole, open, close) => `${open}${serialized}${close}`,
  );
}

async function prepareSite() {
  const expectedOutput = path.join(ROOT, '_site');
  if (OUTPUT !== expectedOutput) throw new Error('Directorio de publicación inesperado');
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(path.join(OUTPUT, 'portafolio-ejecutivo-it'), { recursive: true });
  await cp(path.join(ROOT, 'index.html'), path.join(OUTPUT, 'index.html'));
  try {
    await cp(path.join(ROOT, 'foto.jpg'), path.join(OUTPUT, 'foto.jpg'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await cp(PORTFOLIO_SOURCE, PORTFOLIO_OUTPUT);
}

await prepareSite();
const currentHtml = await readFile(PORTFOLIO_OUTPUT, 'utf8');
const previous = readEmbeddedSnapshot(currentHtml);
const token = process.env.MONDAY_MCP_TOKEN?.trim();

if (!token) {
  console.log(`Portal preparado con el último corte disponible: ${previous.extracted_at_utc}`);
} else {
  const snapshot = await fetchSnapshot(token, previous);
  await writeFile(PORTFOLIO_OUTPUT, replaceEmbeddedSnapshot(currentHtml, snapshot), 'utf8');
  console.log(
    `Corte actualizado: ${snapshot.inventory.projects} proyectos, ${snapshot.inventory.subitems} subelementos y ${snapshot.inventory.updates} actualizaciones.`,
  );
}
