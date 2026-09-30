import { createSign } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const DRAFT_FOLDER_NAME = 'Borradores automáticos';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function serviceAccount() {
  const encoded = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('Falta GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON');
  let account;
  try {
    account = JSON.parse(encoded);
  } catch {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON no es JSON válido');
  }
  if (account.type !== 'service_account' || !account.client_email || !account.private_key) {
    throw new Error('La credencial de Drive debe ser una cuenta de servicio válida');
  }
  return account;
}

async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth rechazó la cuenta técnica (${response.status})`);
  const body = await response.json();
  if (!body.access_token) throw new Error('Google OAuth no devolvió token de acceso');
  return body.access_token;
}

async function driveJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 350);
    throw new Error(`Google Drive respondió ${response.status}: ${detail}`);
  }
  return response;
}

export async function upload(filePath, weeklyFolderId) {
  if (!/^[A-Za-z0-9_-]{10,}$/.test(weeklyFolderId)) {
    throw new Error('GOOGLE_DRIVE_WEEKLY_FOLDER_ID no parece un ID de carpeta de Drive');
  }
  const account = serviceAccount();
  const file = await readFile(filePath);
  const info = await stat(filePath);
  if (!info.isFile() || info.size < 1000 || path.extname(filePath).toLowerCase() !== '.pptx'
    || !path.basename(filePath).includes('Borrador') || file.subarray(0, 2).toString() !== 'PK') {
    throw new Error('El borrador indicado no es un PPTX válido');
  }
  const token = await accessToken(account);
  const fields = 'id,name,mimeType,driveId,capabilities(canAddChildren)';
  const folderUrl = new URL(`${DRIVE_API}/files/${encodeURIComponent(weeklyFolderId)}`);
  folderUrl.searchParams.set('supportsAllDrives', 'true');
  folderUrl.searchParams.set('fields', fields);
  const folderResponse = await driveJson(folderUrl, token);
  const weeklyFolder = await folderResponse.json();
  if (weeklyFolder.mimeType !== FOLDER_MIME || !weeklyFolder.driveId) {
    throw new Error('La carpeta Estatus semanal debe pertenecer a una unidad compartida');
  }
  const query = new URL(`${DRIVE_API}/files`);
  query.searchParams.set('supportsAllDrives', 'true');
  query.searchParams.set('includeItemsFromAllDrives', 'true');
  query.searchParams.set('corpora', 'drive');
  query.searchParams.set('driveId', weeklyFolder.driveId);
  query.searchParams.set('q', `'${weeklyFolderId}' in parents and name = '${DRAFT_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`);
  query.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,driveId,capabilities(canAddChildren))');
  query.searchParams.set('pageSize', '100');
  const listing = await (await driveJson(query, token)).json();
  if (listing.files?.length !== 1 || !listing.files[0].capabilities?.canAddChildren) {
    throw new Error(`No se encontró una única carpeta «${DRAFT_FOLDER_NAME}» editable dentro de Estatus semanal`);
  }
  const draftFolderId = listing.files[0].id;

  const uploadUrl = new URL(`${DRIVE_UPLOAD}/files`);
  uploadUrl.searchParams.set('uploadType', 'resumable');
  uploadUrl.searchParams.set('supportsAllDrives', 'true');
  uploadUrl.searchParams.set('fields', 'id,name,webViewLink,createdTime,parents');
  const name = path.basename(filePath);
  const metadata = {
    name,
    mimeType: PPTX_MIME,
    parents: [draftFolderId],
    description: 'Borrador automático del estatus semanal PMO. La versión FINAL se guarda aparte y no se sobrescribe.',
  };
  const start = await driveJson(uploadUrl, token, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-type': PPTX_MIME,
      'x-upload-content-length': String(file.length),
    },
    body: JSON.stringify(metadata),
  });
  const location = start.headers.get('location');
  if (!location || !location.startsWith('https://www.googleapis.com/')) {
    throw new Error('Drive no devolvió una URL de subida válida');
  }
  const completed = await driveJson(location, token, {
    method: 'PUT',
    headers: {
      'content-type': PPTX_MIME,
      'content-length': String(file.length),
    },
    body: file,
  });
  const uploaded = await completed.json();
  if (!uploaded.id || uploaded.name !== name || !uploaded.parents?.includes(draftFolderId)) {
    throw new Error('Drive no confirmó el archivo en la carpeta de borradores');
  }
  const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
  console.log(`Borrador guardado en Drive: ${uploaded.name} (${link})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const filePath = process.argv[2];
  const folderId = process.env.GOOGLE_DRIVE_WEEKLY_FOLDER_ID;
  if (!filePath || !folderId) {
    console.error('Uso: GOOGLE_DRIVE_WEEKLY_FOLDER_ID=... GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=... node scripts/upload-weekly-ppt-drive.mjs <borrador.pptx>');
    process.exitCode = 2;
  } else {
    await upload(filePath, folderId);
  }
}
