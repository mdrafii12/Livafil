import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MedicinesCachePayload {
  medicines: any[];
  batches: any[];
}

export interface SyncQueueItem {
  id: string;
  pharmacyId: string;
  type: 'bill' | 'opd_consultation';
  status: 'pending' | 'synced' | 'needs_review' | 'failed';
  createdAt: string;
  staffId: string;
  staffName: string;
  payload: any;
  requestedQuantity: number;
  availableStockAtSync?: number | null;
  conflictDetails?: string | null;
  syncError?: string | null;
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
  pharmacyId: string | undefined,
  data: MedicinesCachePayload
): Promise<void> {
  try {
    const db = await getDB();
    const targetId = pharmacyId || 'default-pharmacy';
    const payload = {
      pharmacyId: targetId,
      timestamp: Date.now(),
      data: {
        medicines: data.medicines || [],
        batches: data.batches || []
      },
    };
    
    await db.put('medicines_cache', payload);

    // Save fallback copy under 'default-pharmacy' if a specific pharmacyId was provided
    if (pharmacyId && pharmacyId !== 'default-pharmacy') {
      await db.put('medicines_cache', {
        ...payload,
        pharmacyId: 'default-pharmacy'
      });
    }

    console.log(`[MEDICINES CACHE WRITE] Successfully cached ${payload.data.medicines.length} medicines and ${payload.data.batches.length} stock batches to IndexedDB (Keys: '${targetId}', 'default-pharmacy').`, payload.data);
  } catch (err) {
    console.warn('Failed to save medicines cache to IndexedDB:', err);
  }
}

export async function getMedicinesCache(pharmacyId?: string): Promise<{
  timestamp: number;
  data: MedicinesCachePayload;
} | null> {
  try {
    const db = await getDB();
    let entry = pharmacyId ? await db.get('medicines_cache', pharmacyId) : null;
    
    if (!entry || !entry.data || !entry.data.medicines || entry.data.medicines.length === 0) {
      entry = await db.get('medicines_cache', 'default-pharmacy');
    }
    
    if (!entry || !entry.data || !entry.data.medicines || entry.data.medicines.length === 0) {
      // Fallback: get most recent entry in object store
      const allEntries = await db.getAll('medicines_cache');
      if (allEntries.length > 0) {
        entry = allEntries[allEntries.length - 1];
      }
    }

    if (!entry || !entry.data || !entry.data.medicines) {
      console.warn('[MEDICINES CACHE READ] No valid medicine cache entry found in IndexedDB medicines_cache store.');
      return null;
    }

    console.log(`[MEDICINES CACHE READ] Retrieved ${entry.data.medicines.length} medicines and ${(entry.data.batches || []).length} stock batches from IndexedDB medicines_cache store (Cached at: ${new Date(entry.timestamp).toLocaleTimeString()}).`, entry.data);
    return {
      timestamp: entry.timestamp,
      data: {
        medicines: entry.data.medicines || [],
        batches: entry.data.batches || []
      },
    };
  } catch (err) {
    console.warn('Failed to read medicines cache from IndexedDB:', err);
    return null;
  }
}

export async function deductLocalBatchStock(
  pharmacyId: string | undefined,
  batchId: string,
  quantityToDeduct: number
): Promise<void> {
  try {
    const cache = await getMedicinesCache(pharmacyId);
    if (!cache || !cache.data) return;

    const updatedBatches = (cache.data.batches || []).map((b: any) => {
      if (b.id === batchId || (b.batchNumber && b.batchNumber === batchId)) {
        const newQty = Math.max(0, b.quantity - quantityToDeduct);
        return { ...b, quantity: newQty };
      }
      return b;
    });

    await saveMedicinesCache(pharmacyId, {
      ...cache.data,
      batches: updatedBatches,
    });
    console.log(`[MEDICINES CACHE DEDUCTION] Deducted ${quantityToDeduct} units from batch ${batchId}. Updated local cache.`);
  } catch (err) {
    console.warn('Failed to deduct local batch stock in IndexedDB:', err);
  }
}

// --- SYNC QUEUE METHODS ---

export async function enqueueSyncItem(item: SyncQueueItem): Promise<void> {
  try {
    const db = await getDB();
    const itemToStore = {
      ...item,
      pharmacyId: item.pharmacyId || 'default-pharmacy'
    };
    await db.put('sync_queue', itemToStore);
    console.log('[OFFLINE DB] Enqueued sync item into IndexedDB:', itemToStore.id, itemToStore.type);
  } catch (err) {
    console.warn('Failed to enqueue sync item in IndexedDB:', err);
  }
}

export async function getAllSyncQueue(pharmacyId?: string): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAll('sync_queue');
    if (pharmacyId && pharmacyId !== 'default-pharmacy') {
      return items.filter((i) => i.pharmacyId === pharmacyId || i.pharmacyId === 'default-pharmacy' || !i.pharmacyId);
    }
    return items;
  } catch (err) {
    console.warn('Failed to get sync queue from IndexedDB:', err);
    return [];
  }
}

export async function getPendingSyncQueue(pharmacyId?: string): Promise<SyncQueueItem[]> {
  const all = await getAllSyncQueue(pharmacyId);
  return all.filter((i) => i.status === 'pending' || i.status === 'failed');
}

export async function getConflictSyncQueue(pharmacyId?: string): Promise<SyncQueueItem[]> {
  const all = await getAllSyncQueue(pharmacyId);
  return all.filter((i) => i.status === 'needs_review');
}

export async function updateSyncItemStatus(
  id: string,
  status: 'pending' | 'synced' | 'needs_review' | 'failed',
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
      console.log(`[OFFLINE DB] Updated sync item ${id} status to '${status}' in IndexedDB.`);
    }
  } catch (err) {
    console.warn('Failed to update sync item status in IndexedDB:', err);
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('sync_queue', id);
    console.log(`[OFFLINE DB] Confirmed deletion of item ${id} from IndexedDB sync_queue.`);
  } catch (err) {
    console.warn('Failed to remove sync item from IndexedDB:', err);
  }
}
