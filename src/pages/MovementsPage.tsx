import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, X, Loader2, ArrowUpRight, ArrowDownRight, 
  Trash2, History, AlertCircle, Sparkles, Filter, Database, RefreshCw
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Movement, Batch, Medicine, MovementType } from '../types';

const movementSchema = z.object({
  batchId: z.string().min(1, 'Please select a target batch'),
  type: z.string().min(1, 'Please select a movement type'),
  quantity: z.number().min(1, 'Quantity must be at least 1 unit'),
  reason: z.string().min(3, 'Please provide an adjustment reason'),
});

type MovementFormValues = z.infer<typeof movementSchema>;

export default function MovementsPage() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [mv, b, m] = await Promise.all([
        db.getMovements(),
        db.getBatches(),
        db.getMedicines(),
      ]);
      setMovements(mv);
      setBatches(b);
      setMedicines(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    reset({
      batchId: batches[0]?.id || '',
      type: 'Adjustment',
      quantity: 10,
      reason: 'Physical stock count correction'
    });
    setFormOpen(true);
  };

  const onSubmitForm = async (data: MovementFormValues) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) throw new Error('No pharmacy linked to this account.');

      const targetBatch = batches.find(b => b.id === data.batchId);
      if (!targetBatch) {
        throw new Error('Selected batch not found');
      }

      await db.addManualMovement(profile.pharmacy_id, profile.id, {
        batchId: data.batchId,
        medicineId: targetBatch.medicineId,
        type: data.type as MovementType,
        quantity: data.quantity,
        notes: data.reason
      });

      await refreshData();
      setFormOpen(false);
      setNotification(`Successfully recorded stock movement of ${data.quantity} units.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Stock transaction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Movements
  const filteredMovements = movements.filter(m => {
    const batch = batches.find(b => b.id === m.batchId);
    const med = batch ? medicines.find(dr => dr.id === batch.medicineId) : null;
    
    const matchesSearch = 
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.createdBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch && batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (med && med.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || m.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Pagination Slices
  const totalItems = filteredMovements.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMovements.slice(indexOfFirstItem, indexOfLastItem);

  const getMovementBadge = (type: MovementType) => {
    const config = {
      Purchase: { label: 'Purchase (In)', style: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50', icon: ArrowUpRight },
      Sale: { label: 'Sale (Out)', style: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50', icon: ArrowDownRight },
      Return: { label: 'Supplier Return', style: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50', icon: ArrowDownRight },
      Expired: { label: 'Expired Write-off', style: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50', icon: ArrowDownRight },
      Adjustment: { label: 'Adjustment', style: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50', icon: RefreshCw }
    };

    const c = config[type] || config.Adjustment;
    const Icon = c.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${c.style}`}>
        <Icon className="h-3 w-3 shrink-0" />
        <span>{c.label}</span>
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading movements...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Stock Movements Ledger</h1>
          <p className="text-sm text-gray-500">Track drug adjustments, supplier returns, waste disposals, and general physical audits.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Stock Transaction</span>
        </button>
      </div>

      {/* FLOAT NOTIFICATION */}
      {notification && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center space-x-2 text-xs font-semibold animate-slideIn">
          <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 h-full w-4" />
          <input 
            type="text" 
            placeholder="Search stock movements by medicine, operator, batch number or reason..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:border-blue-500"
        >
          <option value="all">All Movement Types</option>
          <option value="Purchase">Purchase Receipts</option>
          <option value="Sale">Sales Disbursements</option>
          <option value="Return">Supplier Returns</option>
          <option value="Expired">Expired Write-offs</option>
          <option value="Adjustment">Audit Adjustments</option>
        </select>
      </div>

      {/* MOVEMENTS HISTORICAL TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="py-3.5 px-5">Timestamp Date</th>
                <th className="py-3.5 px-5">Medicine & Batch</th>
                <th className="py-3.5 px-5">Adjustment Type</th>
                <th className="py-3.5 px-5">Quantity delta</th>
                <th className="py-3.5 px-5">Moved By</th>
                <th className="py-3.5 px-5">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
              {currentItems.length > 0 ? (
                currentItems.map((m) => {
                  const batch = batches.find(b => b.id === m.batchId);
                  const med = batch ? medicines.find(d => d.id === batch.medicineId) : null;
                  const isPositive = m.type === 'Purchase' || m.type === 'Return';
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="py-4 px-5 font-mono text-[11px] text-gray-400">
                        {new Date(m.timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-gray-900 dark:text-white">{med ? med.name : 'Unknown Medicine'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Batch: <span className="font-mono text-gray-600 dark:text-gray-300 font-semibold">{batch ? batch.batchNumber : 'N/A'}</span>
                        </p>
                      </td>
                      <td className="py-4 px-5">{getMovementBadge(m.type)}</td>
                      <td className={`py-4 px-5 font-bold ${
                        isPositive ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {isPositive ? '+' : '-'}{m.quantity} Units
                      </td>
                      <td className="py-4 px-5 font-semibold text-gray-900 dark:text-white">{m.createdBy}</td>
                      <td className="py-4 px-5 max-w-xs truncate" title={m.notes}>{m.notes}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No stock movements logs currently recorded</p>
                    <button onClick={handleOpenAdd} className="text-xs text-blue-600 hover:underline font-semibold mt-1">
                      Execute a manual stock audit transfer
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BUTTONS */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs">
            <span className="text-gray-400">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} logs</span>
            <div className="flex space-x-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-40"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MANUAL MOVEMENT DRAWER / MODAL */}
      {formOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                Record Stock Movement
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Active Batch</label>
                <select 
                  {...register('batchId')}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                >
                  {batches.map(b => {
                    const med = medicines.find(m => m.id === b.medicineId);
                    return (
                      <option key={b.id} value={b.id}>
                        {med ? med.name : 'Unknown'} [Batch: {b.batchNumber}] ({b.quantity} on hand)
                      </option>
                    );
                  })}
                </select>
                {errors.batchId && <p className="text-[10px] text-red-500 mt-0.5">{errors.batchId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Movement Direction</label>
                  <select 
                    {...register('type')}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="Purchase">Purchase Receipts (Stock IN)</option>
                    <option value="Sale">Sales Disbursements (Stock OUT)</option>
                    <option value="Return">Supplier Returns (Stock OUT)</option>
                    <option value="Expired">Expired Write-offs (Stock OUT)</option>
                    <option value="Adjustment">Audit Adjustment (Stock +/-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Quantity Delta</label>
                  <input 
                    type="number" 
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.quantity && <p className="text-[10px] text-red-500 mt-0.5">{errors.quantity.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Audit Log Justification (Notes)</label>
                <textarea 
                  rows={2}
                  {...register('reason')}
                  placeholder="E.g. Disposed of expired tablets safely according to standard NYC protocols..."
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                ></textarea>
                {errors.reason && <p className="text-[10px] text-red-500 mt-0.5">{errors.reason.message}</p>}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Add Log Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}