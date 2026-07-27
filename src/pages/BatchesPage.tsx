import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Edit3, Trash2, X, Check, Loader2, Calendar, 
  Boxes, AlertCircle, Info, RefreshCw, Layers, DollarSign, ArrowLeftRight, MessageSquare
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Batch, Medicine, Supplier, BatchStatus } from '../types';
import { formatCurrency } from '../utils/currency';
import { sendWhatsAppMessage } from '../services/whatsapp';

const batchSchema = z.object({
  medicineId: z.string().min(1, 'Please select a medicine'),
  batchNumber: z.string().min(2, 'Batch number is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  purchasePrice: z.number().min(0.01, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0.01, 'Selling price must be positive'),
  mrp: z.number().min(0.01, 'MRP must be positive'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be in YYYY-MM-DD format'),
  manufactureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Manufacture date must be in YYYY-MM-DD format'),
  receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Received date must be in YYYY-MM-DD format'),
  supplierId: z.string().min(1, 'Please select a supplier'),
  minimumStock: z.number().min(0, 'Minimum stock cannot be negative'),
  notes: z.string().optional(),
});

type BatchFormValues = z.infer<typeof batchSchema>;

export default function BatchesPage() {
  const { profile } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals States
  const [formOpen, setFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Exchange Listing Modal State
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [selectedBatchForExchange, setSelectedBatchForExchange] = useState<Batch | null>(null);
  const [exchangeForm, setExchangeForm] = useState({
    sellingPrice: 0,
    discountPercentage: 20,
    minimumOrder: 5,
    reason: 'Near Expiry' as 'Near Expiry' | 'Overstock' | 'Slow Moving' | 'Other',
    notes: '',
  });
  const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);

  // Reorder Modal State
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [selectedBatchForReorder, setSelectedBatchForReorder] = useState<Batch | null>(null);
  const [reorderForm, setReorderForm] = useState({
    supplierId: '',
    quantity: 10,
    notes: '',
  });
  const [isSubmittingReorder, setIsSubmittingReorder] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
  });

  const handleOpenExchangeModal = (b: Batch) => {
    setSelectedBatchForExchange(b);
    const calculatedDiscount = b.mrp > 0 ? Math.max(10, Math.round(((b.mrp - b.sellingPrice) / b.mrp) * 100)) : 20;
    setExchangeForm({
      sellingPrice: b.sellingPrice > 0 ? b.sellingPrice : Math.round(b.purchasePrice * 1.1),
      discountPercentage: calculatedDiscount,
      minimumOrder: Math.min(10, b.quantity),
      reason: 'Near Expiry',
      notes: `Batch ${b.batchNumber} expiring on ${b.expiryDate}. Listed directly from inventory.`,
    });
    setExchangeModalOpen(true);
  };

  const handleSubmitExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForExchange || !profile?.pharmacy_id) return;
    const med = medicines.find(m => m.id === selectedBatchForExchange.medicineId);
    if (!med) return;

    setIsSubmittingExchange(true);
    try {
      const myPharm = await db.getMyPharmacy(profile.pharmacy_id);
      const pharmacyName = myPharm?.name || profile.name || 'Partner Pharmacy';

      await db.addExchangeListing(profile.pharmacy_id, {
        medicineId: med.id,
        pharmacyName,
        medicineName: med.name,
        genericName: med.genericName || '',
        strength: med.strength || '',
        manufacturer: med.manufacturer || '',
        batchNumber: selectedBatchForExchange.batchNumber,
        quantity: selectedBatchForExchange.quantity,
        expiryDate: selectedBatchForExchange.expiryDate,
        mrp: selectedBatchForExchange.mrp,
        sellingPrice: Number(exchangeForm.sellingPrice),
        discountPercentage: Number(exchangeForm.discountPercentage),
        minimumOrder: Number(exchangeForm.minimumOrder),
        reason: exchangeForm.reason,
        notes: exchangeForm.notes,
        status: 'Active',
      });

      alert(`Batch ${selectedBatchForExchange.batchNumber} has been listed on the Inter-Pharmacy Exchange marketplace!`);
      setExchangeModalOpen(false);
      await refreshData();
    } catch (err: any) {
      console.error('Failed to list batch on exchange:', err);
      alert(err.message || 'Failed to create exchange listing');
    } finally {
      setIsSubmittingExchange(false);
    }
  };

  const handleOpenReorderModal = (b: Batch) => {
    setSelectedBatchForReorder(b);
    const suggestedQty = Math.max(10, (b.minimumStock * 2) - b.quantity);
    setReorderForm({
      supplierId: b.supplierId || (suppliers[0]?.id ?? ''),
      quantity: suggestedQty,
      notes: '',
    });
    setReorderModalOpen(true);
  };

  const handleSubmitReorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForReorder || !profile?.pharmacy_id) return;
    const med = medicines.find(m => m.id === selectedBatchForReorder.medicineId);
    const sup = suppliers.find(s => s.id === reorderForm.supplierId);
    if (!med || !sup) {
      alert('Please ensure a valid medicine and supplier are selected.');
      return;
    }

    setIsSubmittingReorder(true);
    try {
      await db.addPurchaseOrder(profile.pharmacy_id, {
        medicineId: med.id,
        supplierId: sup.id,
        quantity: Number(reorderForm.quantity),
        status: 'Sent',
      });

      const myPharm = await db.getMyPharmacy(profile.pharmacy_id);
      const pharmacyName = myPharm?.name || 'Our Pharmacy';
      const contactName = sup.contactPerson || sup.name;

      const message = `Hi ${contactName}, we'd like to reorder ${reorderForm.quantity} units of ${med.name} ${med.strength}. Please confirm availability and pricing. — ${pharmacyName}`;

      sendWhatsAppMessage(sup.phone || '', message);

      alert(`Purchase order created for ${reorderForm.quantity} units of ${med.name} and WhatsApp order message opened!`);
      setReorderModalOpen(false);
      await refreshData();
    } catch (err: any) {
      console.error('Failed to create purchase order:', err);
      alert(err.message || 'Failed to create purchase order');
    } finally {
      setIsSubmittingReorder(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [b, m, s] = await Promise.all([
        db.getBatches(),
        db.getMedicines(),
        db.getSuppliers(),
      ]);
      if (profile?.pharmacy_id) {
        await db.syncBatchNotifications(profile.pharmacy_id, b);
      }
      setBatches(b);
      setMedicines(m);
      setSuppliers(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingBatch(null);
    reset({
      medicineId: medicines[0]?.id || '',
      batchNumber: '',
      quantity: 100,
      purchasePrice: 10.00,
      sellingPrice: 15.00,
      mrp: 18.00,
      expiryDate: new Date(Date.now() + 3600000 * 24 * 180).toISOString().split('T')[0], // 6 months from now
      manufactureDate: new Date(Date.now() - 3600000 * 24 * 30).toISOString().split('T')[0], // 1 month ago
      receivedDate: new Date().toISOString().split('T')[0], // today
      supplierId: suppliers[0]?.id || '',
      minimumStock: 20,
      notes: ''
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (b: Batch) => {
    setEditingBatch(b);
    setValue('medicineId', b.medicineId);
    setValue('batchNumber', b.batchNumber);
    setValue('quantity', b.quantity);
    setValue('purchasePrice', b.purchasePrice);
    setValue('sellingPrice', b.sellingPrice);
    setValue('mrp', b.mrp);
    setValue('expiryDate', b.expiryDate);
    setValue('manufactureDate', b.manufactureDate);
    setValue('receivedDate', b.receivedDate);
    setValue('supplierId', b.supplierId);
    setValue('minimumStock', b.minimumStock);
    setValue('notes', b.notes || '');
    setFormOpen(true);
  };

  const onSubmitForm = async (data: BatchFormValues) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) throw new Error('No pharmacy linked to this account.');
      if (editingBatch) {
        await db.updateBatch(editingBatch.id, profile.pharmacy_id, profile.id, editingBatch.quantity, data);
      } else {
        await db.addBatch(profile.pharmacy_id, profile.id, data);
      }
      await refreshData();
      setFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, batchNo: string) => {
    if (window.confirm(`Are you sure you want to delete batch ${batchNo}? This will remove all movement logs associated with this batch.`)) {
      await db.deleteBatch(id);
      await refreshData();
    }
  };

  // Filter batches
  const filteredBatches = batches.filter(b => {
    const med = medicines.find(m => m.id === b.medicineId);
    const sup = suppliers.find(s => s.id === b.supplierId);
    
    const matchesSearch = 
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (med && med.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sup && sup.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || b.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Paginated Slices
  const totalItems = filteredBatches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBatches.slice(indexOfFirstItem, indexOfLastItem);

  const getStatusBadge = (status: BatchStatus) => {
    const styles = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
      Expiring: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
      Expired: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
      'Low Stock': 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50',
      'Out of Stock': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/50'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading batches...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Inventory Batches</h1>
          <p className="text-sm text-gray-500">Log multi-batch drug stock, independent price sheets, and expiry timelines.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Batch</span>
        </button>
      </div>

      {/* FILTER SEARCH MODULE */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 h-full w-4" />
          <input 
            type="text" 
            placeholder="Search batches by brand name, supplier company, or batch number..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:border-blue-500"
        >
          <option value="all">All Expiry Statuses</option>
          <option value="Active">Active / Healthy</option>
          <option value="Expiring">Expiring Soon (&lt;90 days)</option>
          <option value="Expired">Expired</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>

      {/* BATCH DATALIST CONTAINER */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="py-3.5 px-5">Medicine</th>
                <th className="py-3.5 px-5">Batch Number</th>
                <th className="py-3.5 px-5">On Hand Stock</th>
                <th className="py-3.5 px-5">Purchase / Sale / MRP</th>
                <th className="py-3.5 px-5">Dates (Mfg / Exp)</th>
                <th className="py-3.5 px-5">Logistics Supplier</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
              {currentItems.length > 0 ? (
                currentItems.map((b) => {
                  const med = medicines.find(m => m.id === b.medicineId);
                  const sup = suppliers.find(s => s.id === b.supplierId);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="py-4 px-5">
                        <p className="font-bold text-gray-900 dark:text-white">{med ? med.name : 'Unknown Medicine'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{med ? med.genericName : ''}</p>
                      </td>
                      <td className="py-4 px-5 font-mono font-medium text-gray-600 dark:text-gray-300">{b.batchNumber}</td>
                      <td className="py-4 px-5">
                        <p className="font-semibold text-gray-900 dark:text-white">{b.quantity} Units</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Min: {b.minimumStock} Units</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-semibold text-gray-950 dark:text-white">
                          {formatCurrency(b.purchasePrice)} / {formatCurrency(b.sellingPrice)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">MRP: {formatCurrency(b.mrp)}</p>
                      </td>
                      <td className="py-4 px-5 space-y-0.5 text-gray-500">
                        <p className="flex items-center space-x-1">
                          <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0 w-8">Mfg:</span>
                          <span>{b.manufactureDate}</span>
                        </p>
                        <p className="flex items-center space-x-1 font-semibold text-gray-700 dark:text-gray-300">
                          <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0 w-8">Exp:</span>
                          <span>{b.expiryDate}</span>
                        </p>
                      </td>
                      <td className="py-4 px-5 text-gray-600 truncate max-w-40">{sup ? sup.name : <span className="text-gray-300">Unlinked</span>}</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(b.status)}
                          {b.status === 'Expiring' && (
                            <button
                              onClick={() => handleOpenExchangeModal(b)}
                              className="mt-1 px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md text-[10px] font-bold flex items-center space-x-1 border border-amber-500/30 transition-colors"
                              title="List on Inter-Pharmacy Exchange Marketplace"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              <span>List on Exchange</span>
                            </button>
                          )}
                          {(b.quantity < b.minimumStock || b.status === 'Low Stock') && (
                            <button
                              onClick={() => handleOpenReorderModal(b)}
                              className="mt-1 px-2 py-0.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-bold flex items-center space-x-1 border border-purple-500/30 transition-colors"
                              title="Draft purchase order & WhatsApp supplier"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>Draft Reorder</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right space-x-1.5">
                        <button 
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Edit batch settings"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(b.id, b.batchNumber)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Delete batch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Boxes className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No active batches matched filters</p>
                    <button onClick={handleOpenAdd} className="text-xs text-blue-600 hover:underline font-semibold mt-1">
                      Register your first drug stock batch
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} batches
            </span>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-300"
              >
                Prev
              </button>
              {[...Array(totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'border border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50'}`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BATCH MODAL DIALOG DRAW-BOX */}
      {formOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                {editingBatch ? 'Edit Batch Configuration' : 'Register New Drug Stock Batch'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Medicine</label>
                  <select 
                    {...register('medicineId')}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  >
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Batch Code Number</label>
                  <input 
                    type="text" 
                    {...register('batchNumber')}
                    placeholder="E.g. LIP-882A"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.batchNumber && <p className="text-[10px] text-red-500 mt-0.5">{errors.batchNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stock Quantity</label>
                  <input 
                    type="number" 
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.quantity && <p className="text-[10px] text-red-500 mt-0.5">{errors.quantity.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minimum Alert</label>
                  <input 
                    type="number" 
                    {...register('minimumStock', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.minimumStock && <p className="text-[10px] text-red-500 mt-0.5">{errors.minimumStock.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Supplier Company</label>
                  <select 
                    {...register('supplierId')}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Purchase Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    {...register('purchasePrice', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Selling Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    {...register('sellingPrice', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">MRP Value</label>
                  <input 
                    type="number" 
                    step="0.01"
                    {...register('mrp', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Manufacture Date</label>
                  <input 
                    type="text" 
                    {...register('manufactureDate')}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.manufactureDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.manufactureDate.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Received Date</label>
                  <input 
                    type="text" 
                    {...register('receivedDate')}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.receivedDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.receivedDate.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expiration Date</label>
                  <input 
                    type="text" 
                    {...register('expiryDate')}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.expiryDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.expiryDate.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Batch Audit Notes (Optional)</label>
                <textarea 
                  rows={2}
                  {...register('notes')}
                  placeholder="E.g. Verified cold storage seals upon logistics receipt."
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                ></textarea>
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
                  <span>{editingBatch ? 'Save Changes' : 'Record Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST ON EXCHANGE MODAL */}
      {exchangeModalOpen && selectedBatchForExchange && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center space-x-2">
                <ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                  List Batch on Exchange
                </h3>
              </div>
              <button onClick={() => setExchangeModalOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExchange} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold">
                  {medicines.find(m => m.id === selectedBatchForExchange.medicineId)?.name} (Batch #{selectedBatchForExchange.batchNumber})
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Available Quantity: <strong>{selectedBatchForExchange.quantity} units</strong> • Expiring: <strong>{selectedBatchForExchange.expiryDate}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Selling Price / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeForm.sellingPrice}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Discount (% Off MRP)</label>
                  <input
                    type="number"
                    value={exchangeForm.discountPercentage}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, discountPercentage: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minimum Order Qty</label>
                  <input
                    type="number"
                    value={exchangeForm.minimumOrder}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, minimumOrder: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Listing Reason</label>
                  <select
                    value={exchangeForm.reason}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, reason: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="Near Expiry">Near Expiry</option>
                    <option value="Overstock">Overstock</option>
                    <option value="Slow Moving">Slow Moving</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Listing Notes</label>
                <textarea
                  rows={2}
                  value={exchangeForm.notes}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, notes: e.target.value })}
                  placeholder="Additional conditions or pickup notes for buyer pharmacies..."
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setExchangeModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExchange}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  {isSubmittingExchange && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Publish to Marketplace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAFT REORDER MODAL */}
      {reorderModalOpen && selectedBatchForReorder && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                  Draft Low-Stock Reorder
                </h3>
              </div>
              <button onClick={() => setReorderModalOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReorder} className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200/50 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300">
                <p className="font-bold">
                  {medicines.find(m => m.id === selectedBatchForReorder.medicineId)?.name}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Current Stock: <strong>{selectedBatchForReorder.quantity} units</strong> • Minimum Limit: <strong>{selectedBatchForReorder.minimumStock} units</strong>
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Supplier</label>
                <select
                  value={reorderForm.supplierId}
                  onChange={(e) => setReorderForm({ ...reorderForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  required
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone || 'No phone'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reorder Quantity (Units)</label>
                <input
                  type="number"
                  value={reorderForm.quantity}
                  onChange={(e) => setReorderForm({ ...reorderForm, quantity: parseInt(e.target.value) || 1 })}
                  required
                  min={1}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-semibold text-gray-700 dark:text-gray-300">Action Summary:</p>
                <p>1. Record purchase order in Livafil database as 'Sent'.</p>
                <p>2. Open WhatsApp Web / App pre-filled with supplier order message.</p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReorderModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReorder}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  {isSubmittingReorder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Send Order via WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}