// Receptor exclusivo de borradores PPT. Desplegar como web app ejecutado por quien
// publica el script; nunca introducir este endpoint ni el secreto en GitHub Pages.
const DRAFT_FOLDER_ID = '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD';
const PPT_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const MAX_PPT_BYTES = 10 * 1024 * 1024;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_POST_BYTES = Math.ceil(MAX_PPT_BYTES / 3) * 4 + 4096;

function hex(bytes) {
  return bytes.map((value) => (value & 255).toString(16).padStart(2, '0')).join('');
}

function constantTimeHexEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function canonicalDeliveryString(payload) {
  return [
    'COSMOS_WEEKLY_PPT_V1',
    payload.issued_at_ms,
    payload.run_id,
    payload.run_attempt,
    payload.nonce,
    payload.file_name,
    payload.size_bytes,
    payload.sha256,
  ].join('\n');
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.version !== 1 ||
      !Number.isSafeInteger(payload.issued_at_ms) ||
      Math.abs(Date.now() - payload.issued_at_ms) > MAX_CLOCK_SKEW_MS ||
      !/^\d{1,20}$/.test(payload.run_id) || !/^\d{1,6}$/.test(payload.run_attempt) ||
      !/^[0-9a-f]{32}$/.test(payload.nonce) ||
      !/^Portafolio_Proyectos_Borrador_\d{8}_\d{4}(?:_\d+)?\.pptx$/.test(payload.file_name) ||
      !Number.isSafeInteger(payload.size_bytes) || payload.size_bytes < 1000 ||
      payload.size_bytes > MAX_PPT_BYTES ||
      !/^[0-9a-f]{64}$/.test(payload.sha256) ||
      !/^[0-9a-f]{64}$/.test(payload.signature) ||
      typeof payload.pptx_base64 !== 'string' ||
      payload.pptx_base64.length > Math.ceil(MAX_PPT_BYTES / 3) * 4 ||
      payload.pptx_base64.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.pptx_base64)) {
    fail('INVALID_REQUEST');
  }
}

function verifyAndDecode(payload) {
  const secret = PropertiesService.getScriptProperties().getProperty('PPT_DELIVERY_HMAC_SECRET');
  if (!secret || secret.length < 32) fail('NOT_CONFIGURED');
  const expectedSignature = hex(Utilities.computeHmacSha256Signature(canonicalDeliveryString(payload), secret));
  if (!constantTimeHexEqual(expectedSignature, payload.signature)) fail('INVALID_SIGNATURE');

  const bytes = Utilities.base64Decode(payload.pptx_base64);
  if (bytes.length !== payload.size_bytes || bytes[0] !== 0x50 || bytes[1] !== 0x4b ||
      bytes[2] !== 0x03 || bytes[3] !== 0x04) fail('INVALID_PPTX');
  const sha256 = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
  if (!constantTimeHexEqual(sha256, payload.sha256)) fail('INVALID_HASH');
  return { bytes, md5: hex(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes)) };
}

function listDraftFiles(extraQuery, pageSize) {
  const folder = Drive.Files.get(DRAFT_FOLDER_ID, {
    fields: 'id,mimeType,driveId',
    supportsAllDrives: true,
  });
  if (folder.mimeType !== 'application/vnd.google-apps.folder') fail('DESTINATION_NOT_FOUND');
  const options = {
    q: "'" + DRAFT_FOLDER_ID + "' in parents and trashed = false and " + extraQuery,
    fields: 'nextPageToken,incompleteSearch,files(id,name,size,md5Checksum,webViewLink,parents)',
    pageSize,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: folder.driveId ? 'drive' : 'user',
  };
  if (folder.driveId) options.driveId = folder.driveId;
  const result = Drive.Files.list(options);
  if (result.nextPageToken || result.incompleteSearch) fail('STORAGE_SEARCH_INCOMPLETE');
  return result.files || [];
}

function findDelivery(runKey) {
  const matches = listDraftFiles(
    "appProperties has { key='pmoRunKey' and value='" + runKey + "' }", 2);
  if (matches.length > 1) fail('DUPLICATE_RUN_CONFLICT');
  return matches[0] || null;
}

function assertStoredFile(file, payload, md5) {
  if (!file || !/^[A-Za-z0-9_-]+$/.test(file.id || '') ||
      file.name !== payload.file_name || Number(file.size) !== payload.size_bytes ||
      file.md5Checksum !== md5 || !(file.parents || []).includes(DRAFT_FOLDER_ID)) {
    fail('STORAGE_VERIFICATION_FAILED');
  }
}

function reply(result) {
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string' ||
        e.contentLength < 1 || e.contentLength > MAX_POST_BYTES ||
        e.postData.contents.length > MAX_POST_BYTES ||
        !/^application\/json(?:;|$)/i.test(e.postData.type || '')) fail('INVALID_REQUEST');
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (_) {
      fail('INVALID_REQUEST');
    }
    validatePayload(payload);
    const { bytes, md5 } = verifyAndDecode(payload);
    const runKey = payload.run_id + '-' + payload.run_attempt;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) fail('BUSY_RETRY');
    try {
      const existing = findDelivery(runKey);
      if (existing) {
        assertStoredFile(existing, payload, md5);
        return reply({ ok: true, duplicate: true, run_key: runKey,
          file_id: existing.id, file_name: existing.name,
          size_bytes: Number(existing.size), sha256: payload.sha256 });
      }

      // Durante la transición la tarea de Windows puede haber copiado el mismo
      // borrador a Drive antes que este receptor. Evita crear un duplicado.
      const sameName = listDraftFiles("name = '" + payload.file_name + "'", 100);
      const matching = sameName.find((file) => Number(file.size) === payload.size_bytes &&
        file.md5Checksum === md5);
      if (matching) {
        assertStoredFile(matching, payload, md5);
        return reply({ ok: true, duplicate: true, run_key: runKey,
          file_id: matching.id, file_name: matching.name,
          size_bytes: Number(matching.size), sha256: payload.sha256 });
      }
      if (sameName.length) fail('NAME_CONFLICT');

      const blob = Utilities.newBlob(bytes, PPT_MIME, payload.file_name);
      const metadata = {
        name: payload.file_name,
        mimeType: PPT_MIME,
        parents: [DRAFT_FOLDER_ID],
        appProperties: { pmoRunKey: runKey, pmoSha256: payload.sha256 },
      };
      const created = Drive.Files.create(metadata, blob, {
        fields: 'id,name,size,md5Checksum,webViewLink,parents',
        supportsAllDrives: true,
      });
      if (!created || !/^[A-Za-z0-9_-]+$/.test(created.id || '')) fail('STORAGE_VERIFICATION_FAILED');
      const file = Drive.Files.get(created.id, {
        fields: 'id,name,size,md5Checksum,webViewLink,parents',
        supportsAllDrives: true,
      });
      assertStoredFile(file, payload, md5);
      return reply({ ok: true, duplicate: false, run_key: runKey,
        file_id: file.id, file_name: file.name,
        size_bytes: Number(file.size), sha256: payload.sha256 });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    // No registrar el POST ni el secreto: el PPT puede contener datos internos.
    return reply({ ok: false, code: error.code || 'DELIVERY_FAILED' });
  }
}
