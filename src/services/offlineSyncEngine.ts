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
  failed: number;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[OFFLINE SYNC] Device is currently offline. Skipping sync processing.');
    return { synced: 0, conflicts: 0, failed: 0 };
  }

  const pendingItems = await getPendingSyncQueue(pharmacyId);
  console.log(`[OFFLINE SYNC] Found ${pendingItems.length} pending/failed items in sync_queue for pharmacyId: ${pharmacyId || 'all'}`);
  if (pendingItems.length === 0) {
    return { synced: 0, conflicts: 0, failed: 0 };
  }

  let syncedCount = 0;
  let conflictCount = 0;
  let failedCount = 0;

  // Fetch real batches from Supabase once for validation
  let supabaseBatches: any[] = [];
  try {
    console.log('[OFFLINE SYNC] Fetching real-time inventory batches from Supabase for validation...');
    supabaseBatches = await db.getBatches();
    console.log(`[OFFLINE SYNC] Retrieved ${supabaseBatches.length} active inventory batches from Supabase.`);
  } catch (err) {
    console.error('[OFFLINE SYNC] Failed to fetch Supabase inventory batches during pre-sync validation:', err);
    return { synced: 0, conflicts: 0, failed: 0 };
  }

  for (const item of pendingItems) {
    console.log(`[OFFLINE SYNC] >>> Processing queue item ${item.id} (Type: ${item.type}, Staff: ${item.staffName || 'Cashier'}, Created: ${item.createdAt})`);
    
    try {
      if (item.type === 'bill') {
        const cartItems: any[] = item.payload.items || [];
        let hasConflict = false;
        let conflictReason = '';
        let minAvailable = 0;

        // Re-check real stock in Supabase for each batch and resolve real batch ID
        const resolvedItems = [];

        for (const cItem of cartItems) {
          // 1. Find matching batch in Supabase
          let realBatch = supabaseBatches.find((b) => b.id === cItem.batchId);
          if (!realBatch) {
            // Fallback match by medicineId & batchNumber or medicineId
            realBatch = supabaseBatches.find(
              (b) => b.medicineId === cItem.medicineId && b.batchNumber === cItem.batchNumber
            ) || supabaseBatches.find(
              (b) => b.medicineId === cItem.medicineId && b.quantity > 0
            );
          }

          const avail = realBatch ? realBatch.quantity : 0;
          console.log(`[OFFLINE SYNC] Stock check for medicine '${cItem.medicineName}' (Batch: ${cItem.batchNumber || 'N/A'}): requested = ${cItem.quantity}, available = ${avail}`);

          if (!realBatch || avail < cItem.quantity) {
            hasConflict = true;
            minAvailable = avail;
            conflictReason = `Insufficient real stock for ${cItem.medicineName} (Batch: ${cItem.batchNumber || 'Default'}). Requested: ${cItem.quantity} units, Actual Available: ${avail} units.`;
            console.warn(`[OFFLINE SYNC] CONFLICT DETECTED for item ${item.id}: ${conflictReason}`);
            break;
          } else {
            // Stock is sufficient -> map to real batch ID for clean DB insertion
            resolvedItems.push({
              ...cItem,
              batchId: realBatch.id,
            });
          }
        }

        if (hasConflict) {
          conflictCount++;
          console.log(`[OFFLINE SYNC] Marking queue item ${item.id} as 'needs_review' in IndexedDB sync_queue.`);
          await updateSyncItemStatus(
            item.id,
            'needs_review',
            minAvailable,
            conflictReason
          );
        } else {
          // Stock is sufficient for all items -> attempt Supabase insert
          const payloadWithResolvedBatches = {
            ...item.payload,
            items: resolvedItems,
          };

          console.log(`[OFFLINE SYNC] Sending bill payload to Supabase via db.addBill...`);
          const checkoutBill = await db.addBill(
            item.pharmacyId || 'default-pharmacy',
            item.staffId || 'system',
            payloadWithResolvedBatches
          );

          // VERIFY SUPABASE RETURNED SUCCESSFUL RESULT BEFORE REMOVING FROM QUEUE
          if (checkoutBill && checkoutBill.id && checkoutBill.invoiceNumber) {
            console.log(`[OFFLINE SYNC] SUCCESS! Supabase confirmed bill creation (Invoice: ${checkoutBill.invoiceNumber}, Bill ID: ${checkoutBill.id}).`);

            if (item.payload.reminderSchedules && Array.isArray(item.payload.reminderSchedules)) {
              const schedules = item.payload.reminderSchedules.map((s: any) => ({
                ...s,
                billId: checkoutBill.id
              }));
              await db.addReminderSchedules(schedules).catch(e => console.warn('[OFFLINE SYNC] Failed to add reminder schedules:', e));
            }

            console.log(`[OFFLINE SYNC] Removing item ${item.id} from local IndexedDB sync_queue.`);
            await removeSyncItem(item.id);
            syncedCount++;
          } else {
            throw new Error('Supabase addBill call did not return a valid bill object.');
          }
        }
      } else if (item.type === 'opd_consultation') {
        const { tokenNumber, ...consultationData } = item.payload;
        console.log(`[OFFLINE SYNC] Sending OPD consultation payload to Supabase via db.addOpConsultation...`);
        
        const createdOpd = await db.addOpConsultation(
          item.pharmacyId || 'default-pharmacy',
          consultationData
        );

        if (createdOpd && createdOpd.id) {
          console.log(`[OFFLINE SYNC] SUCCESS! Supabase confirmed OPD consultation creation (ID: ${createdOpd.id}, Token: ${createdOpd.tokenNumber}).`);
          console.log(`[OFFLINE SYNC] Removing item ${item.id} from local IndexedDB sync_queue.`);
          await removeSyncItem(item.id);
          syncedCount++;
        } else {
          throw new Error('Supabase addOpConsultation call did not return a valid consultation object.');
        }
      }
    } catch (err: any) {
      failedCount++;
      const errorMessage = err?.message || String(err);
      console.error(`[OFFLINE SYNC] FAILURE! Supabase insert failed for item ${item.id}:`, errorMessage);
      console.log(`[OFFLINE SYNC] KEEPING item ${item.id} in local sync_queue with status 'failed' so data is NOT lost.`);
      await updateSyncItemStatus(item.id, 'failed', null, `Sync error: ${errorMessage}`);
    }
  }

  console.log(`[OFFLINE SYNC] Completed processing cycle: ${syncedCount} synced, ${conflictCount} conflicts, ${failedCount} failed.`);
  return { synced: syncedCount, conflicts: conflictCount, failed: failedCount };
}

// ADMIN ACTION: Force approve a conflicting queue item
export async function approveConflictItem(item: SyncQueueItem): Promise<void> {
  console.log(`[OFFLINE SYNC] Admin override: Forcing sync for item ${item.id}...`);
  if (item.type === 'bill') {
    await db.addBill(item.pharmacyId, item.staffId, item.payload);
  } else if (item.type === 'opd_consultation') {
    const { tokenNumber, ...consultationData } = item.payload;
    await db.addOpConsultation(item.pharmacyId, consultationData);
  }
  await removeSyncItem(item.id);
  console.log(`[OFFLINE SYNC] Admin override complete. Item ${item.id} removed from queue.`);
}

// ADMIN ACTION: Reject and discard a conflicting queue item
export async function rejectConflictItem(itemId: string): Promise<void> {
  console.log(`[OFFLINE SYNC] Admin rejected item ${itemId}. Removing from queue...`);
  await removeSyncItem(itemId);
}
