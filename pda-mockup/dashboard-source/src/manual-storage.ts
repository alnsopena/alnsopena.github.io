export const MANUAL_STORAGE_KEY = 'cosmos-dashboard-operativo-v3:manual:v1';

export type ManualRecord = {
  transmittedAt: string;
  confirmed: boolean;
};
export type ManualRecords = Record<string, ManualRecord>;
type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readManualRecords(storage: BrowserStorage, vesselIds: string[]) {
  try {
    const raw = storage.getItem(MANUAL_STORAGE_KEY);
    if (!raw) return { records: {} as ManualRecords, warning: '' };
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !parsed.records || typeof parsed.records !== 'object' || Array.isArray(parsed.records)) {
      throw new Error('Formato no compatible');
    }
    const records: ManualRecords = {};
    for (const vesselId of vesselIds) {
      const record = parsed.records[vesselId];
      if (record === undefined) continue;
      if (typeof record?.transmittedAt !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-05:00$/.test(record.transmittedAt) ||
          !Number.isFinite(Date.parse(record.transmittedAt)) ||
          typeof record.confirmed !== 'boolean') {
        throw new Error('Registro no valido');
      }
      records[vesselId] = { transmittedAt: record.transmittedAt, confirmed: record.confirmed };
    }
    return { records, warning: '' };
  } catch {
    return {
      records: {} as ManualRecords,
      warning: 'No se pudieron recuperar los registros locales. Se muestran los datos demostrativos originales.',
    };
  }
}

export function writeManualRecords(storage: BrowserStorage, records: ManualRecords) {
  storage.setItem(MANUAL_STORAGE_KEY, JSON.stringify({ version: 1, records }));
}
