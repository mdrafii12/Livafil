import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Edit3, Trash2, X, Check, Loader2, Truck, 
  History, Calendar, FileText, Building2, MapPin, Phone, Mail 
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Supplier, Batch, Medicine } from '../types';
import { formatCurrency } from '../utils/currency';

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  phone: z.string().min(10, 'Contact phone is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  address: z.string().min(5, 'Physical logistics address is required'),
  gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (e.g. 22ABCDE1234F1Z9)'),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function SuppliersPage() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals States
  const [formOpen, setFormOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historySup, setHistorySup] = useState<Supplier | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [s, b, m] = await Promise.all([
        db.getSuppliers(),
        db.getBatches(),
        db.getMedicines(),
      ]);
      setSuppliers(s);
      setBatches(b);
      setMedicines(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSup(null);
    reset({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gst: '22AAAAA1111A1Z1'
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening details history
    setEditingSup(sup);
    setValue('name', sup.name);
    setValue('contactPerson', sup.contactPerson);
    setValue('phone', sup.phone);
    setValue('email', sup.email);
    setValue('address', sup.address);
    setValue('gst', sup.gst);
    setFormOpen(true);
  };

  const onSubmitForm = async (data: SupplierFormValues) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) throw new Error('No pharmacy linked to this account.');
      if (editingSup) {
        await db.updateSupplier(editingSup.id, data);
      } else {
        await db.addSupplier(profile.pharmacy_id, data);
      }
      await refreshData();
      setFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent history click
    if (window.confirm(`Are you sure you want to delete supplier "${name}"? Existing batches from this supplier won't be deleted, but they will clear their supplier link.`)) {
      await db.deleteSupplier(id);
      await refreshData();
      if (historySup?.id === id) setHistorySup(null);
    }
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.gst.includes(searchQuery)
  );

  const totalItems = filteredSuppliers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);

  // Sourced batches for selected supplier in history
  const sourcedBatches = batches
    .filter(b => b.supplierId === historySup?.id)
    .map(b => {
      const med = medicines.find(m => m.id === b.medicineId);
      return {
        ...b,
        medicineName: med ? med.name : 'Unknown Medicine'
      };
    });

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Wholesale Suppliers</h1>
          <p className="text-sm text-gray-500">Manage drug distributors, logistics agents, and retrieve historical batch receipts.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* SEARCH FIELD */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs">
        <div className="relative">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 h-full w-4" />
          <input 
            type="text" 
            placeholder="Search suppliers by distributor name, contact person, or GSTIN..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* CORE SPLIT GRID VIEW: Suppliers List on Left, Expanded History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: SUPPLIERS DATAGRID LIST */}
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden ${historySup ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3 px-5">Distributor Name</th>
                  <th className="py-3 px-5">Contact Person</th>
                  <th className="py-3 px-5">Phone & Email</th>
                  <th className="py-3 px-5">GSTIN</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
                {currentItems.length > 0 ? (
                  currentItems.map((sup) => {
                    const isActive = historySup?.id === sup.id;
                    return (
                      <tr 
                        key={sup.id} 
                        onClick={() => setHistorySup(isActive ? null : sup)}
                        className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-50/20 dark:bg-blue-950/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/20'}`}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center space-x-2.5">
                            <span className="h-7 w-7 bg-blue-100 dark:bg-blue-950/60 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                              <Building2 className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{sup.name}</p>
                              <p className="text-[10px] text-gray-400 truncate max-w-44">{sup.address}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 font-medium text-gray-700 dark:text-gray-300">{sup.contactPerson}</td>
                        <td className="py-4 px-5">
                          <p className="text-gray-600 dark:text-gray-400">{sup.phone}</p>
                          <p className="text-[10px] text-gray-400">{sup.email}</p>
                        </td>
                        <td className="py-4 px-5 font-mono text-[11px] text-gray-500">{sup.gst}</td>
                        <td className="py-4 px-5 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => setHistorySup(isActive ? null : sup)}
                            className={`p-1.5 rounded-lg text-gray-400 hover:text-purple-600 ${isActive ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/20' : ''}`}
                            title="View sourced batches history"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => handleOpenEdit(sup, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600"
                            title="Edit details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(sup.id, sup.name, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600"
                            title="Delete supplier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No wholesale suppliers registered</p>
                      <button onClick={handleOpenAdd} className="text-xs text-blue-600 hover:underline font-semibold mt-1">
                        Add logistics distributor
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
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} distributors
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 border border-gray-100 dark:border-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-300"
                >
                  Prev
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'border border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 border border-gray-100 dark:border-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: SOURCED BATCHES HISTORY EXPANSION PANEL */}
        {historySup && (
          <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4 animate-slideIn">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase History</h3>
                <h4 className="font-bold text-gray-900 dark:text-white text-base mt-0.5">{historySup.name}</h4>
              </div>
              <button 
                onClick={() => setHistorySup(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Supplier Details Card */}
            <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-2 bg-gray-50/50 dark:bg-gray-950 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <p className="flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{historySup.address}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <p className="flex items-center space-x-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{historySup.phone}</span>
                </p>
                <p className="flex items-center space-x-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{historySup.email}</span>
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3 flex items-center space-x-1">
                <span>Sourced Inventories ({sourcedBatches.length})</span>
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sourcedBatches.length > 0 ? (
                  sourcedBatches.map((b) => (
                    <div 
                      key={b.id} 
                      className="p-3 border border-gray-50 dark:border-gray-800/50 bg-white dark:bg-gray-900/60 rounded-xl flex justify-between items-center text-xs hover:border-blue-100"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{b.medicineName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Batch: <span className="font-mono text-gray-600 dark:text-gray-300 font-semibold">{b.batchNumber}</span> • Expiry: {b.expiryDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">{b.quantity} Units</p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Price: {formatCurrency(b.purchasePrice)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400">
                    No medicine batches currently registered through this distributor.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SUPPLIER MODAL CREATE/EDIT */}
      {formOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                {editingSup ? 'Edit Supplier Settings' : 'Add Wholesale Distributor'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Distributor Company Name</label>
                <input 
                  type="text" 
                  {...register('name')}
                  placeholder="E.g. Apex Pharma Distributors"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Contact Person</label>
                <input 
                  type="text" 
                  {...register('contactPerson')}
                  placeholder="E.g. John Miller"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
                {errors.contactPerson && <p className="text-[10px] text-red-500 mt-0.5">{errors.contactPerson.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input 
                    type="text" 
                    {...register('phone')}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Wholesale Email</label>
                  <input 
                    type="email" 
                    {...register('email')}
                    placeholder="orders@distributor.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tax Registration (GSTIN)</label>
                <input 
                  type="text" 
                  {...register('gst')}
                  placeholder="22ABCDE1234F1Z9"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
                {errors.gst && <p className="text-[10px] text-red-500 mt-0.5">{errors.gst.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Logistics / Physical Address</label>
                <textarea 
                  rows={2}
                  {...register('address')}
                  placeholder="Street and warehouse suite information..."
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                ></textarea>
                {errors.address && <p className="text-[10px] text-red-500 mt-0.5">{errors.address.message}</p>}
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
                  <span>{editingSup ? 'Save Changes' : 'Create Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}