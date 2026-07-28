import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingSyncQueue, getConflictSyncQueue } from '../services/offlineDBService';
import { processSyncQueue } from '../services/offlineSyncEngine';
import { useAuth } from '../contexts/AuthContext';
import SyncIssuesModal from './SyncIssuesModal';

export default function OfflineSyncBadge() {
  const isOnline = useOnlineStatus();
  const { profile } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const targetPharmacyId = profile?.pharmacy_id || 'default-pharmacy';

  const refreshCounts = async () => {
    try {
      const pending = await getPendingSyncQueue(targetPharmacyId);
      const conflicts = await getConflictSyncQueue(targetPharmacyId);
      setPendingCount(pending.length);
      setConflictCount(conflicts.length);
    } catch (err) {
      console.error('Error reading sync counts:', err);
    }
  };

  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 2500);
    return () => clearInterval(interval);
  }, [targetPharmacyId]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      handleAutoSync();
    }
  }, [isOnline, targetPharmacyId]);

  const handleAutoSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      console.log('[OFFLINE SYNC BADGE] Online status detected. Triggering auto-sync...');
      await processSyncQueue(targetPharmacyId);
      await refreshCounts();
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full transition-all duration-300">
        {isOnline ? (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5" />
            <span>Online</span>

            {pendingCount > 0 && (
              <button
                onClick={handleAutoSync}
                disabled={isSyncing}
                className="ml-1 text-amber-700 dark:text-amber-300 underline hover:no-underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>({pendingCount} pending)</span>
              </button>
            )}

            {conflictCount > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="ml-1.5 px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer animate-pulse"
                title="Review offline stock conflicts"
              >
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 px-2.5 py-1 rounded-full">
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                {pendingCount} queued
              </span>
            )}
          </div>
        )}
      </div>

      <SyncIssuesModal
        pharmacyId={targetPharmacyId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          refreshCounts();
        }}
        onQueueUpdated={refreshCounts}
      />
    </>
  );
}
