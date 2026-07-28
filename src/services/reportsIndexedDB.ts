import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ReportsCachePayload {
  medicines: any[];
  batches: any[];
  categories: any[];
  suppliers: any[];
  movements: any[];
  pharmacy: any;
}

interface ReportsDBSchema extends DBSchema {
  reports: {
    key: string;
    value: {
      pharmacyId: string;
      timestamp: number;
      data: ReportsCachePayload;
    };
  };
}

const DB_NAME = 'livafil_reports_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReportsDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ReportsDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'pharmacyId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveReportsCache(
  pharmacyId: string,
  data: ReportsCachePayload
): Promise<void> {
  try {
    const db = await getDB();
    await db.put('reports', {
      pharmacyId,
      timestamp: Date.now(),
      data,
    });
  } catch (err) {
    console.warn('Failed to save reports cache to IndexedDB:', err);
  }
}

export async function getReportsCache(pharmacyId: string): Promise<{
  timestamp: number;
  data: ReportsCachePayload;
} | null> {
  try {
    const db = await getDB();
    const entry = await db.get('reports', pharmacyId);
    if (!entry) return null;
    return {
      timestamp: entry.timestamp,
      data: entry.data,
    };
  } catch (err) {
    console.warn('Failed to read reports cache from IndexedDB:', err);
    return null;
  }
}
