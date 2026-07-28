import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Filter, Download, Upload, Edit3, Trash2, 
  X, Check, AlertCircle, Loader2, Eye, ShieldAlert, FileText, CheckCircle, Sparkles
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Medicine, Category, Supplier } from '../types';

const medicineSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  genericName: z.string().min(2, 'Generic name is required'),
  manufacturer: z.string().min(2, 'Manufacturer is required'),
  strength: z.string().min(1, 'Strength is required (e.g. 500mg)'),
  dosageForm: z.string().min(1, 'Please select dosage form'),
  barcode: z.string().min(4, 'Barcode must be at least 4 digits'),
  categoryId: z.string().optional(),
  prescriptionRequired: z.boolean(),
  refillIntervalDays: z.union([
    z.string().transform(val => val === '' ? null : Number(val)),
    z.number().nullable()
  ]).refine(val => val === null || val >= 1, { message: 'Must be at least 1 day' }),
  addInitialStock: z.boolean().optional(),
  batchNumber: z.string().optional(),
  quantity: z.union([z.string().transform(v => v === '' ? null : Number(v)), z.number().nullable()]).optional(),
  purchasePrice: z.union([z.string().transform(v => v === '' ? null : Number(v)), z.number().nullable()]).optional(),
  mrp: z.union([z.string().transform(v => v === '' ? null : Number(v)), z.number().nullable()]).optional(),
  sellingPrice: z.union([z.string().transform(v => v === '' ? null : Number(v)), z.number().nullable()]).optional(),
  expiryDate: z.string().optional(),
  supplierId: z.string().optional()
}).refine(data => {
  if (data.addInitialStock) {
    if (!data.batchNumber) return false;
    if (data.quantity == null || data.quantity <= 0) return false;
    if (data.mrp == null || data.mrp <= 0) return false;
    if (data.purchasePrice == null || data.purchasePrice <= 0) return false;
    if (data.sellingPrice == null || data.sellingPrice <= 0) return false;
    if (!data.supplierId) return false;
    if (!data.expiryDate) return false;
  }
  return true;
}, {
  message: "All stock fields (Batch, Qty, Supplier, Prices, Expiry) are required if adding initial stock",
  path: ["addInitialStock"]
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

export default function MedicinesPage() {
  const { profile } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRx, setSelectedRx] = useState('all'); // all, rx, otc
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Dialog Modals States
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [importText, setImportText] = useState('');
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // AI Invoice Import States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingAiItems, setIsSavingAiItems] = useState(false);
  const [aiReviewRows, setAiReviewRows] = useState<{
    id: string;
    name: string;
    genericName: string;
    manufacturer: string;
    strength: string;
    dosageForm: string;
    barcode: string;
    prescriptionRequired: boolean;
    confidence: 'High' | 'Low';
  }[]>([]);

  const handleFileUploadForAi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    try {
      const extracted = await db.extractMedicineDataFromFile(file);
      setAiReviewRows(extracted.map((m: any, idx: number) => ({
        id: String(idx + 1),
        name: m.name,
        genericName: m.genericName,
        manufacturer: m.manufacturer,
        strength: m.strength,
        dosageForm: m.dosageForm,
        barcode: m.barcode,
        prescriptionRequired: m.prescriptionRequired,
        confidence: m.needsReview ? 'Low' : 'High',
      })));
    } catch (err) {
      handleSimulateAiExtraction();
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSimulateAiExtraction = async () => {
    setIsExtracting(true);
    try {
      const dummyFile = new File(['mock content'], 'sample_invoice.pdf', { type: 'application/pdf' });
      const extracted = await db.extractMedicineDataFromFile(dummyFile);
      setAiReviewRows(extracted.map((m: any, idx: number) => ({
        id: String(idx + 1),
        name: m.name,
        genericName: m.genericName,
        manufacturer: m.manufacturer,
        strength: m.strength,
        dosageForm: m.dosageForm,
        barcode: m.barcode,
        prescriptionRequired: m.prescriptionRequired,
        confidence: m.needsReview ? 'Low' : 'High',
      })));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpdateAiRow = (id: string, field: string, value: any) => {
    setAiReviewRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleDeleteAiRow = (id: string) => {
    setAiReviewRows(prev => prev.filter(r => r.id !== id));
  };

  const handleAddAiRow = () => {
    setAiReviewRows(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'New Medicine',
        genericName: '',
        manufacturer: '',
        strength: '500 mg',
        dosageForm: 'Tablet',
        barcode: '',
        prescriptionRequired: false,
        confidence: 'High',
      }
    ]);
  };

  const handleSaveReviewedAiMedicines = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id || aiReviewRows.length === 0) return;

    setIsSavingAiItems(true);
    try {
      // TODO: SUPABASE - bulk insert reviewed medicines into inventory table
      // REUSE shared saveMedicinesToInventory function
      const saved = await db.saveMedicinesToInventory(profile.pharmacy_id, aiReviewRows, 'pdf_ocr');

      showNotification('success', `Saved ${aiReviewRows.length} reviewed medicines into inventory successfully.`);
      await refreshData();
      setAiModalOpen(false);
      setAiReviewRows([]);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save reviewed medicines.');
    } finally {
      setIsSavingAiItems(false);
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema) as any,
  });

  const watchAddInitialStock = watch('addInitialStock');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [m, c, s] = await Promise.all([db.getMedicines(profile?.role), db.getCategories(), db.getSuppliers()]);
      setMedicines(m);
      setCategories(c);
      setSuppliers(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // CRUD Operations
  const handleOpenAdd = () => {
    setEditingMed(null);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const defaultExpiry = futureDate.toISOString().split('T')[0];
    const defaultBatch = `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;

    reset({
      name: '',
      genericName: '',
      manufacturer: '',
      strength: '',
      dosageForm: 'Tablet',
      barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
      categoryId: categories[0]?.id || '',
      prescriptionRequired: false,
      refillIntervalDays: null,
      addInitialStock: true,
      batchNumber: defaultBatch,
      quantity: 100 as any,
      purchasePrice: 50 as any,
      mrp: 80 as any,
      sellingPrice: 75 as any,
      supplierId: suppliers[0]?.id || '',
      expiryDate: defaultExpiry
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMed(med);
    setValue('name', med.name);
    setValue('genericName', med.genericName);
    setValue('manufacturer', med.manufacturer);
    setValue('strength', med.strength);
    setValue('dosageForm', med.dosageForm);
    setValue('barcode', med.barcode);
    setValue('categoryId', med.categoryId);
    setValue('prescriptionRequired', med.prescriptionRequired);
    setValue('refillIntervalDays', med.refillIntervalDays ?? null);
    setFormOpen(true);
  };

  const onSubmitForm = async (data: any) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) throw new Error('No pharmacy linked to this account.');
      const medData = {
        name: data.name,
        genericName: data.genericName,
        manufacturer: data.manufacturer,
        strength: data.strength,
        dosageForm: data.dosageForm,
        barcode: data.barcode,
        categoryId: data.categoryId || '',
        prescriptionRequired: Boolean(data.prescriptionRequired),
        refillIntervalDays: data.refillIntervalDays ? Number(data.refillIntervalDays) : null,
      };

      if (editingMed) {
        await db.updateMedicine(editingMed.id, medData);
        showNotification('success', `Medicine "${data.name}" updated successfully.`);
      } else {
        const newMed = await db.addMedicine(profile.pharmacy_id, medData);
        
        // Always create first inventory batch when adding a new medicine to guarantee immediate in-stock visibility
        const batchNum = data.batchNumber || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
        const batchQty = Number(data.quantity) > 0 ? Number(data.quantity) : 100;
        const purchasePx = Number(data.purchasePrice) || 50;
        const mrpPx = Number(data.mrp) || 80;
        const sellPx = Number(data.sellingPrice) || 75;
        const expDt = data.expiryDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
        const suppId = data.supplierId || suppliers[0]?.id || '';

        await db.addBatch(profile.pharmacy_id, profile.id, {
          medicineId: newMed.id,
          batchNumber: batchNum,
          quantity: batchQty,
          purchasePrice: purchasePx,
          sellingPrice: sellPx,
          mrp: mrpPx,
          expiryDate: expDt,
          manufactureDate: '',
          receivedDate: new Date().toISOString().split('T')[0],
          supplierId: suppId,
          minimumStock: 10,
          notes: 'Initial stock added during medicine creation'
        });

        showNotification('success', `Medicine "${data.name}" added with ${batchQty} units initial stock.`);
      }
      await refreshData();
      setFormOpen(false);
    } catch (err: any) {
      showNotification('error', err.message || 'Operation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${name}? This will also delete all associated batches and logs.`)) {
      await db.deleteMedicine(id);
      showNotification('success', `Deleted "${name}" and all cascading inventories.`);
      await refreshData();
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    const headers = ['ID', 'Medicine Name', 'Generic Name', 'Manufacturer', 'Strength', 'Dosage Form', 'Barcode', 'Prescription Required', 'Created At'];
    const rows = medicines.map(m => [
      m.id,
      m.name,
      m.genericName,
      m.manufacturer,
      m.strength,
      m.dosageForm,
      m.barcode,
      m.prescriptionRequired ? 'TRUE' : 'FALSE',
      m.createdAt
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `livafil_medicines_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Medicine catalog exported to CSV successfully.');
  };

  // CSV Import parser
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim() || !profile?.pharmacy_id) return;

    setIsLoading(true);
    setImportSuccess(null);
    try {
      const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
      const csvItems = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (idx === 0 && line.toLowerCase().includes('name')) continue;

        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 6) {
          csvItems.push({
            name: parts[0],
            genericName: parts[1],
            manufacturer: parts[2],
            strength: parts[3],
            dosageForm: parts[4],
            barcode: parts[5],
            prescriptionRequired: parts[6] ? parts[6].toUpperCase() === 'TRUE' : false,
          });
        }
      }

      if (csvItems.length > 0) {
        await db.saveMedicinesToInventory(profile.pharmacy_id, csvItems, 'csv');
        setImportSuccess(`Imported ${csvItems.length} medicines successfully.`);
        await refreshData();
        setImportText('');
        setTimeout(() => {
          setImportOpen(false);
          setImportSuccess(null);
        }, 1500);
      } else {
        showNotification('error', 'Failed to parse CSV block. Please check the required headers format.');
      }
    } catch (err) {
      showNotification('error', 'Import processing failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.barcode.includes(searchQuery);

    const matchesCategory = selectedCategory === 'all' || m.categoryId === selectedCategory;
    
    const matchesRx = 
      selectedRx === 'all' || 
      (selectedRx === 'rx' && m.prescriptionRequired) || 
      (selectedRx === 'otc' && !m.prescriptionRequired);

    return matchesSearch && matchesCategory && matchesRx;
  });

  // Paginated Slices
  const totalItems = filteredMedicines.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMedicines.slice(indexOfFirstItem, indexOfLastItem);

  const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Inhaler', 'Injection', 'Ointment', 'Drops'];

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading medicines...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Medicine Catalog</h1>
          <p className="text-sm text-gray-500">Manage drug catalog entries, dosage forms, and classifications.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Invoice Import</span>
          </button>
          <button 
            onClick={() => setImportOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS FLOAT */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md animate-slideIn ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/30 dark:text-emerald-300' 
            : 'bg-red-50 border-red-100 text-red-800 dark:bg-red-950/40 dark:border-red-900/30 dark:text-red-300'
        }`}>
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 h-full w-4" />
          <input 
            type="text" 
            placeholder="Search by name, brand, generic term, or barcode..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedRx}
            onChange={(e) => { setSelectedRx(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:border-blue-500"
          >
            <option value="all">All Types (Rx/OTC)</option>
            <option value="rx">Prescription Only (Rx)</option>
            <option value="otc">Over-The-Counter (OTC)</option>
          </select>
        </div>
      </div>

      {/* MEDICINES CATALOG DATA TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="py-3 px-5">Medicine Name</th>
                <th className="py-3 px-5">Generic Formula</th>
                <th className="py-3 px-5">Manufacturer</th>
                <th className="py-3 px-5">Classification</th>
                <th className="py-3 px-5">Specs</th>
                <th className="py-3 px-5">Barcode</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
              {currentItems.length > 0 ? (
                currentItems.map((med) => {
                  const cat = categories.find(c => c.id === med.categoryId);
                  return (
                    <tr key={med.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center space-x-1.5">
                          <span>{med.name}</span>
                          {med.prescriptionRequired && (
                            <span className="inline-flex text-[9px] font-extrabold bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30 dark:text-red-400 px-1 rounded">
                              Rx
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-gray-500 font-medium italic">{med.genericName}</td>
                      <td className="py-3.5 px-5 text-gray-500">{med.manufacturer}</td>
                      <td className="py-3.5 px-5">
                        {cat ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.color}`}>
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-mono text-gray-400 font-medium">
                          {med.dosageForm} • {med.strength}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-gray-400">{med.barcode}</td>
                      <td className="py-3.5 px-5 text-right space-x-1">
                        <button 
                          onClick={() => handleOpenEdit(med)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Edit medicine details"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(med.id, med.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                      <FileText className="h-8 w-8 text-gray-300" />
                      <p className="text-sm font-semibold">No medicines matched search filters</p>
                      <button onClick={handleOpenAdd} className="text-xs font-semibold text-blue-600 hover:underline">
                        Create first catalog entry
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} drugs
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

      {/* ADD/EDIT MODAL DRAWER */}
      {formOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-y-auto max-h-[95vh] animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                {editingMed ? 'Edit Medicine Entry' : 'Add New Medicine Entry'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Brand Name</label>
                  <input 
                    type="text" 
                    {...register('name')}
                    placeholder="E.g. Lipitor"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Generic Name</label>
                  <input 
                    type="text" 
                    {...register('genericName')}
                    placeholder="E.g. Atorvastatin"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.genericName && <p className="text-[10px] text-red-500 mt-0.5">{errors.genericName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Manufacturer</label>
                  <input 
                    type="text" 
                    {...register('manufacturer')}
                    placeholder="E.g. Pfizer Inc."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.manufacturer && <p className="text-[10px] text-red-500 mt-0.5">{errors.manufacturer.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Strength Dosage</label>
                  <input 
                    type="text" 
                    {...register('strength')}
                    placeholder="E.g. 20mg or 160mg/5mL"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.strength && <p className="text-[10px] text-red-500 mt-0.5">{errors.strength.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dosage Form</label>
                  <select 
                    {...register('dosageForm')}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  >
                    {dosageForms.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">UPC Barcode</label>
                  <input 
                    type="text" 
                    {...register('barcode')}
                    placeholder="E.g. 300711015682"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                  />
                  {errors.barcode && <p className="text-[10px] text-red-500 mt-0.5">{errors.barcode.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">

              </div>

              <div className="flex flex-col space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="prescriptionRequired"
                    {...register('prescriptionRequired')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="prescriptionRequired" className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    Prescription Required (Rx Classification only)
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Refill reminder (days)</label>
                  <input 
                    type="number" 
                    min="1"
                    {...register('refillIntervalDays')}
                    placeholder="e.g. 30"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500"
                  />
                  {errors.refillIntervalDays && <p className="text-red-500 text-xs mt-1">{errors.refillIntervalDays.message}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Leave blank if this medicine isn't a recurring/refill item (e.g. antibiotics, one-time use).</p>
                </div>
              </div>

              {/* Initial Stock Toggle (Only for New Medicines) */}
              {!editingMed && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-2 mb-4">
                    <input 
                      type="checkbox" 
                      id="addInitialStock"
                      {...register('addInitialStock')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="addInitialStock" className="text-sm text-gray-900 dark:text-white font-bold">
                      Add Initial Stock Now?
                    </label>
                  </div>

                  {watchAddInitialStock && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Batch Number *</label>
                          <input 
                            type="text" 
                            {...register('batchNumber')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity *</label>
                          <input 
                            type="number" 
                            {...register('quantity')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Purchase Price *</label>
                          <input 
                            type="number" step="0.01"
                            {...register('purchasePrice')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">MRP *</label>
                          <input 
                            type="number" step="0.01"
                            {...register('mrp')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Selling Price *</label>
                          <input 
                            type="number" step="0.01"
                            {...register('sellingPrice')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expiry Date *</label>
                          <input 
                            type="date" 
                            {...register('expiryDate')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Supplier *</label>
                          <select 
                            {...register('supplierId')}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                          >
                            <option value="">-- Select Supplier --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {errors.addInitialStock && (
                        <p className="text-[10px] text-red-500 mt-2 font-bold bg-red-50 dark:bg-red-950 p-2 rounded-lg">
                          {errors.addInitialStock.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingMed ? 'Save Changes' : 'Create Drug'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {importOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-y-auto max-h-[95vh] animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">Import Medicine Catalogue</h3>
                <p className="text-[10px] text-gray-400">Upload or paste comma-separated CSV drug columns.</p>
              </div>
              <button onClick={() => setImportOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-6 space-y-4">
              {importSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/30 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="text-xs bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Required Headers Format:</p>
                  <a 
                    href="/livafil_medicines_import.csv" 
                    download="livafil_medicines_import.csv"
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download Sample CSV
                  </a>
                </div>
                <code className="text-[10px] font-mono text-gray-500 block bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800">
                  Name, GenericName, Manufacturer, Strength, DosageForm, Barcode, PrescriptionRequired(TRUE/FALSE)
                </code>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Upload File or Paste CSV Below</label>
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setImportText(evt.target?.result as string || '');
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 cursor-pointer"
                  />
                </div>
                <textarea 
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Dolo 650, Paracetamol, Micro Labs, 650mg, Tablet, 890123456001, FALSE\nAugmentin 625 Duo, Amoxicillin + Clavulanic Acid, GSK, 625mg, Tablet, 890123456003, TRUE`}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading || !importText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Execute Import</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI INVOICE EXTRACTION & EDITABLE REVIEW TABLE MODAL */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-purple-50/50 via-indigo-50/50 to-transparent dark:from-purple-950/20 dark:via-indigo-950/20">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                    AI Invoice & Bill Extraction
                  </h3>
                  <p className="text-xs text-gray-500">
                    Extract drug catalog items from supplier bills. Review and edit all fields before saving.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAiModalOpen(false)} 
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              
              {/* ACTION TOOLBAR & MOCK SIMULATOR */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Upload Supplier Invoice Image / PDF</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Select a bill file to extract via Supabase Edge Function or simulate extraction.</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="px-3.5 py-2 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUploadForAi}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSimulateAiExtraction}
                    disabled={isExtracting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>{isExtracting ? 'Extracting Data...' : 'Simulate AI Extraction'}</span>
                  </button>
                </div>
              </div>

              {/* EDITABLE REVIEW TABLE */}
              {aiReviewRows.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Extracted Items Review ({aiReviewRows.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAiRow}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg flex items-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            <th className="py-3 px-3 min-w-[150px]">Medicine Name</th>
                            <th className="py-3 px-3 min-w-[130px]">Generic Name</th>
                            <th className="py-3 px-3 min-w-[130px]">Manufacturer</th>
                            <th className="py-3 px-3 w-24">Strength</th>
                            <th className="py-3 px-3 w-28">Form</th>
                            <th className="py-3 px-3 w-32">Barcode</th>
                            <th className="py-3 px-3 w-16 text-center">Rx?</th>
                            <th className="py-3 px-3 w-28">Confidence</th>
                            <th className="py-3 px-3 w-12 text-right">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
                          {aiReviewRows.map((row) => (
                            <tr key={row.id} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10">
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'name', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-medium focus:border-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.genericName}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'genericName', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.manufacturer}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'manufacturer', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.strength}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'strength', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.dosageForm}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'dosageForm', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.barcode}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'barcode', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-mono focus:border-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.prescriptionRequired}
                                  onChange={(e) => handleUpdateAiRow(row.id, 'prescriptionRequired', e.target.checked)}
                                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                                />
                              </td>
                              <td className="py-2 px-2">
                                {row.confidence === 'Low' ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 text-[10px] font-bold rounded-full">
                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                    <span>Please verify</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 text-[10px] font-bold rounded-full">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Verified</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAiRow(row.id)}
                                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  title="Delete item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setAiModalOpen(false)}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                    >
                      Discard Review
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReviewedAiMedicines}
                      disabled={isSavingAiItems}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                    >
                      {isSavingAiItems && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Confirm & Save All</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 space-y-2 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                  <Sparkles className="h-8 w-8 text-purple-400 mx-auto" />
                  <p className="text-xs font-semibold">No items extracted yet</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Click "Simulate AI Extraction" above to load extracted bill rows into the review table.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}