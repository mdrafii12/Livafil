import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MedicinesCachePayload {
  medicines: any[];
  batches: any[];
}

export interface SyncQueueItem {
  id: string;
  pharmacyId: string;
  type: 'bill' | 'opd_consultation';
  status: 'pending' | 'synced' | 'needs_review';
  createdAt: string;
  staffId: string;
  staffName: string;
  payload: any; // cart/patient/totals data
  requestedQuantity: number;
  availableStockAtSync?: number | null;
  conflictDetails?: string | null;
}

interface OfflineDBSchema extends DBSchema {
  reports: {
    key: string;
    value: {
      pharmacyId: string;
      timestamp: number;
      data: any;
    };
  };
  medicines_cache: {
    key: string;
    value: {
      pharmacyId: string;
      timestamp: number;
      data: MedicinesCachePayload;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
  };
}

const DB_NAME = 'livafil_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'pharmacyId' });
        }
        if (!db.objectStoreNames.contains('medicines_cache')) {
          db.createObjectStore('medicines_cache', { keyPath: 'pharmacyId' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// --- MEDICINES CACHE METHODS ---

export async function saveMedicinesCache(
  pharmacyId: string,
  data: MedicinesCachePayload
): Promise<void> {
  try {
    const db = await getDB();
    await db.put('medicines_cache', {
      pharmacyId,
      timestamp: Date.now(),
      data,
    });
  } catch (err) {
    console.warn('Failed to save medicines cache to IndexedDB:', err);
  }
}

export async function getMedicinesCache(pharmacyId: string): Promise<{
  timestamp: number;
  data: MedicinesCachePayload;
} | null> {
  try {
    const db = await getDB();
    const entry = await db.get('medicines_cache', pharmacyId);
    if (!entry) return null;
    return {
      timestamp: entry.timestamp,
      data: entry.data,
    };
  } catch (err) {
    console.warn('Failed to read medicines cache from IndexedDB:', err);
    return null;
  }
}

export async function deductLocalBatchStock(
  pharmacyId: string,
  batchId: string,
  quantityToDeduct: number
): Promise<void> {
  try {
    const cache = await getMedicinesCache(pharmacyId);
    if (!cache || !cache.data) return;

    const updatedBatches = cache.data.batches.map((b: any) => {
      if (b.id === batchId) {
        const newQty = Math.max(0, b.quantity - quantityToDeduct);
        return { ...b, quantity: newQty };
      }
      return b;
    });

    await saveMedicinesCache(pharmacyId, {
      ...cache.data,
      batches: updatedBatches,
    });
  } catch (err) {
    console.warn('Failed to deduct local batch stock in IndexedDB:', err);
  }
}

// --- SYNC QUEUE METHODS ---

export async function enqueueSyncItem(item: SyncQueueItem): Promise<void> {
  try {
    const db = await getDB();
    await db.put('sync_queue', item);
  } catch (err) {
    console.warn('Failed to enqueue sync item in IndexedDB:', err);
  }
}

export async function getAllSyncQueue(pharmacyId?: string): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAll('sync_queue');
    if (pharmacyId) {
      return items.filter((i) => i.pharmacyId === pharmacyId);
    }
    return items;
  } catch (err) {
    console.warn('Failed to get sync queue from IndexedDB:', err);
    return [];
  }
}

export async function getPendingSyncQueue(pharmacyId?: string): Promise<SyncQueueItem[]> {
  const all = await getAllSyncQueue(pharmacyId);
  return all.filter((i) => i.status === 'pending');
}

export async function getConflictSyncQueue(pharmacyId?: string): Promise<SyncQueueItem[]> {
  const all = await getAllSyncQueue(pharmacyId);
  return all.filter((i) => i.status === 'needs_review');
}

export async function updateSyncItemStatus(
  id: string,
  status: 'pending' | 'synced' | 'needs_review',
  availableStockAtSync?: number | null,
  conflictDetails?: string | null
): Promise<void> {
  try {
    const db = await getDB();
    const item = await db.get('sync_queue', id);
    if (item) {
      item.status = status;
      if (availableStockAtSync !== undefined) item.availableStockAtSync = availableStockAtSync;
      if (conflictDetails !== undefined) item.conflictDetails = conflictDetails;
      await db.put('sync_queue', item);
    }
  } catch (err) {
    console.warn('Failed to update sync item status in IndexedDB:', err);
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('sync_queue', id);
  } catch (err) {
    console.warn('Failed to remove sync item from IndexedDB:', err);
  }
}
