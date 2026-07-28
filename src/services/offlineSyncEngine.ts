import * as db from './supabaseData';
import {
  getPendingSyncQueue,
  updateSyncItemStatus,
  removeSyncItem,
  SyncQueueItem,
  getAllSyncQueue
} from './offlineDBService';

export async function processSyncQueue(pharmacyId?: string): Promise<{
  synced: number;
  conflicts: number;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, conflicts: 0 };
  }

  const pendingItems = await getPendingSyncQueue(pharmacyId);
  if (pendingItems.length === 0) {
    return { synced: 0, conflicts: 0 };
  }

  let syncedCount = 0;
  let conflictCount = 0;

  // Fetch real batches from Supabase once for validation
  let supabaseBatches: any[] = [];
  try {
    supabaseBatches = await db.getBatches();
  } catch (err) {
    console.warn('Failed to fetch Supabase batches during sync check:', err);
    return { synced: 0, conflicts: 0 };
  }

  for (const item of pendingItems) {
    try {
      if (item.type === 'bill') {
        const cartItems: any[] = item.payload.items || [];
        let hasConflict = false;
        let conflictReason = '';
        let minAvailable = 0;

        // Re-check real stock in Supabase for each batch
        for (const cItem of cartItems) {
          const realBatch = supabaseBatches.find((b) => b.id === cItem.batchId);
          const avail = realBatch ? realBatch.quantity : 0;

          if (!realBatch || avail < cItem.quantity) {
            hasConflict = true;
            minAvailable = avail;
            conflictReason = `Insufficient real stock for ${cItem.medicineName} (Batch: ${cItem.batchNumber}). Requested: ${cItem.quantity} units, Actual Available: ${avail} units.`;
            break;
          }
        }

        if (hasConflict) {
          conflictCount++;
          await updateSyncItemStatus(
            item.id,
            'needs_review',
            minAvailable,
            conflictReason
          );
        } else {
          // Stock is sufficient -> commit to Supabase
          await db.addBill(item.pharmacyId, item.staffId, item.payload);
          await removeSyncItem(item.id);
          syncedCount++;
        }
      } else if (item.type === 'opd_consultation') {
        const { tokenNumber, ...consultationData } = item.payload;
        await db.addOpConsultation(item.pharmacyId, consultationData);
        await removeSyncItem(item.id);
        syncedCount++;
      }
    } catch (err: any) {
      console.error('Failed to sync item:', item.id, err);
    }
  }

  return { synced: syncedCount, conflicts: conflictCount };
}

// ADMIN ACTION: Force approve a conflicting queue item
export async function approveConflictItem(item: SyncQueueItem): Promise<void> {
  if (item.type === 'bill') {
    await db.addBill(item.pharmacyId, item.staffId, item.payload);
  } else if (item.type === 'opd_consultation') {
    const { tokenNumber, ...consultationData } = item.payload;
    await db.addOpConsultation(item.pharmacyId, consultationData);
  }
  await removeSyncItem(item.id);
}

// ADMIN ACTION: Reject and discard a conflicting queue item
export async function rejectConflictItem(itemId: string): Promise<void> {
  await removeSyncItem(itemId);
}
