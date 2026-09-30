/**
 * Despachador privado para pedir un nuevo borrador de la PPT semanal.
 * Publicar como Web app: ejecutar como propietario; acceso: dominio COSMOS.
 * El PAT permanece exclusivamente en las propiedades de este Apps Script.
 */
const PMO_DISPATCH = Object.freeze({
  domain: 'cosmos.com.pe',
  api: 'https://api.github.com/repos/alnsopena/alnsopena.github.io/actions/workflows/publicar-portafolio.yml/dispatches',
  actions: 'https://github.com/alnsopena/alnsopena.github.io/actions/workflows/publicar-portafolio.yml',
  cooldownMs: 90 * 1000,
});

function doGet() {
  try {
    requirePmoUser_();
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('COSMOS · PPT semanal');
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><html lang="es"><meta charset="utf-8"><title>Acceso restringido</title>' +
      '<body style="font:16px Arial,sans-serif;padding:3rem;color:#142c3c">' +
      '<h1>Acceso restringido</h1><p>Usa una cuenta PMO autorizada de COSMOS.</p></body></html>'
    ).setTitle('Acceso restringido');
  }
}

/** Solo esta función pública puede solicitar la ejecución desde la interfaz. */
function requestDraft() {
  try {
    requirePmoUser_();
  } catch (error) {
    return { ok: false, message: 'No tienes autorización para generar borradores.' };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { ok: false, message: 'Hay otra solicitud en curso. Intenta de nuevo en un minuto.' };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const token = String(props.getProperty('GITHUB_DISPATCH_TOKEN') || '').trim();
    if (!token) {
      return { ok: false, message: 'Falta configurar el acceso a GitHub en Apps Script.' };
    }

    const now = Date.now();
    const last = Number(props.getProperty('LAST_DISPATCH_MS') || 0);
    if (Number.isFinite(last) && now - last < PMO_DISPATCH.cooldownMs) {
      return { ok: false, message: 'Ya se solicitó un borrador hace menos de 90 segundos. Revisa GitHub Actions.' };
    }

    const response = UrlFetchApp.fetch(PMO_DISPATCH.api, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2026-03-10',
      },
      payload: JSON.stringify({
        ref: 'main',
        inputs: { generate_ppt: 'true' },
      }),
      muteHttpExceptions: true,
      followRedirects: false,
    });

    const status = response.getResponseCode();
    if (status !== 200 && status !== 204) {
      return { ok: false, message: githubError_(status) };
    }

    props.setProperty('LAST_DISPATCH_MS', String(now));
    let runUrl = PMO_DISPATCH.actions;
    if (status === 200) {
      try {
        const payload = JSON.parse(response.getContentText());
        const candidate = String(payload.html_url || '');
        if (/^https:\/\/github\.com\/alnsopena\/alnsopena\.github\.io\/actions\/runs\/\d+$/.test(candidate)) {
          runUrl = candidate;
        }
      } catch (_) {
        // El despacho ya fue aceptado; el enlace general sigue siendo válido.
      }
    }

    return {
      ok: true,
      message: 'Solicitud aceptada. El borrador aparecerá en Drive al terminar la generación y entrega.',
      runUrl: runUrl,
    };
  } catch (error) {
    // No devolver ni registrar la excepción: UrlFetch puede incluir cabeceras sensibles.
    return { ok: false, message: 'No se pudo contactar a GitHub. Intenta de nuevo o revisa Actions.' };
  } finally {
    lock.releaseLock();
  }
}

function requirePmoUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email || !email.endsWith('@' + PMO_DISPATCH.domain)) {
    throw new Error('Acceso denegado');
  }
  const raw = PropertiesService.getScriptProperties().getProperty('PMO_ALLOWED_EMAILS') || '';
  const allowed = raw.split(/[\s,;]+/).map(function (entry) {
    return entry.trim().toLowerCase();
  }).filter(Boolean);
  if (allowed.indexOf(email) === -1) {
    throw new Error('Acceso denegado');
  }
  return email;
}

function githubError_(status) {
  if (status === 401 || status === 403) {
    return 'GitHub rechazó la credencial. Revisa vigencia y permiso Actions: write.';
  }
  if (status === 404) {
    return 'GitHub no encontró el workflow. Revisa el repositorio y acceso del token.';
  }
  if (status === 422) {
    return 'GitHub rechazó la solicitud. Revisa que workflow_dispatch siga habilitado en main.';
  }
  return 'GitHub devolvió HTTP ' + status + '. Revisa la ejecución en Apps Script.';
}
