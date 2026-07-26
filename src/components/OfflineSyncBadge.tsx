import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { offlineSync } from '../services/offlineSyncService';

export default function OfflineSyncBadge() {
  const [isOnline, setIsOnline] = useState(offlineSync.isOnline());
  const [pendingCount, setPendingCount] = useState(offlineSync.getQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe((online, count) => {
      setIsOnline(online);
      setPendingCount(count);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    await offlineSync.triggerAutoSync();
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border shadow-xs transition-all duration-300">
      {isOnline ? (
        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Wifi className="w-3.5 h-3.5" />
          <span>Online</span>
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="ml-1 text-amber-700 dark:text-amber-300 underline hover:no-underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>({pendingCount} sync)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 px-2.5 py-1 rounded-full animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-rose-600" />
          <span>Offline Mode</span>
          {pendingCount > 0 && (
            <span className="bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
              {pendingCount} saved
            </span>
          )}
        </div>
      )}
    </div>
  );
}
