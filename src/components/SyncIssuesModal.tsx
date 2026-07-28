import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, X, RefreshCw, User, Calendar, ShieldAlert } from 'lucide-react';
import { getConflictSyncQueue, SyncQueueItem } from '../services/offlineDBService';
import { approveConflictItem, rejectConflictItem, processSyncQueue } from '../services/offlineSyncEngine';
import { formatCurrency } from '../utils/currency';

interface SyncIssuesModalProps {
  pharmacyId: string;
  isOpen: boolean;
  onClose: () => void;
  onQueueUpdated?: () => void;
}

export default function SyncIssuesModal({ pharmacyId, isOpen, onClose, onQueueUpdated }: SyncIssuesModalProps) {
  const [conflicts, setConflicts] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const items = await getConflictSyncQueue(pharmacyId);
      setConflicts(items);
    } catch (err) {
      console.error('Error loading conflict queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConflicts();
    }
  }, [isOpen, pharmacyId]);

  if (!isOpen) return null;

  const handleApprove = async (item: SyncQueueItem) => {
    try {
      await approveConflictItem(item);
      setActionMessage(`Approved transaction by ${item.staffName}. Committed to inventory.`);
      await loadConflicts();
      if (onQueueUpdated) onQueueUpdated();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(`Failed to approve: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectConflictItem(id);
      setActionMessage('Discarded conflicting transaction.');
      await loadConflicts();
      if (onQueueUpdated) onQueueUpdated();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(`Failed to reject: ${err.message}`);
    }
  };

  const handleRetrySync = async () => {
    setLoading(true);
    await processSyncQueue(pharmacyId);
    await loadConflicts();
    if (onQueueUpdated) onQueueUpdated();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 max-w-2xl w-full rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn flex flex-col max-h-[85vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Offline Sync Issues (Admin Review)
              </h3>
              <p className="text-xs text-gray-500">
                Stock conflicts detected during auto-sync. Review and approve or reject transactions.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TOAST MESSAGE */}
        {actionMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* CONTENT */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading conflict queue...</div>
          ) : conflicts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Zero Sync Conflicts</p>
              <p className="text-[11px] text-gray-400">All offline transactions have been synchronized successfully.</p>
            </div>
          ) : (
            conflicts.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-extrabold uppercase rounded-full">
                      Stock Conflict • {item.type === 'bill' ? 'POS Bill' : 'OPD Consultation'}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                      Staff: {item.staffName || 'Cashier'}
                    </h4>
                    <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.createdAt).toLocaleString('en-IN')}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                      {formatCurrency(item.payload?.grandTotal || item.payload?.consultationFee || 0)}
                    </span>
                  </div>
                </div>

                {/* Conflict Reason Box */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Conflict Details:
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{item.conflictDetails || 'Requested stock exceeded available inventory.'}</p>
                </div>

                {/* Item List Summary */}
                <div className="space-y-1 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Requested Items:</p>
                  {(item.payload?.items || item.payload?.medicines || []).map((m: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                      <span>• {m.medicineName || m.name} ({m.batchNumber ? `Batch: ${m.batchNumber}` : ''})</span>
                      <span className="font-bold">{m.quantity || m.qty} units</span>
                    </div>
                  ))}
                </div>

                {/* Admin Actions */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center space-x-1 border border-rose-200/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reject & Discard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve Anyway</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 flex justify-between items-center text-xs">
          <button
            onClick={handleRetrySync}
            disabled={loading}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-run Auto Sync</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
