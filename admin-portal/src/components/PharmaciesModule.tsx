import React, { useState } from 'react';
import { 
  Building2, Search, Plus, CheckCircle2, ShieldCheck, MapPin, 
  Phone, FileText, Sparkles, X, Filter, Eye, Edit3, Save, 
  Stethoscope, Receipt, Pill, Boxes, Truck, Users, Activity, Lock, AlertTriangle 
} from 'lucide-react';
import { 
  RealPharmacyTenant, RealPatientRecord, RealOpConsultation, RealBillRecord, 
  RealUserProfile, RealMedicineRecord, RealBatchRecord, RealSupplierRecord, 
  createRealPharmacy, updateRealPharmacy 
} from '../lib/supabase';

interface PharmaciesModuleProps {
  pharmacies: RealPharmacyTenant[];
  patients: RealPatientRecord[];
  consultations: RealOpConsultation[];
  bills: RealBillRecord[];
  users: RealUserProfile[];
  medicines: RealMedicineRecord[];
  batches: RealBatchRecord[];
  suppliers: RealSupplierRecord[];
  onRefresh: () => void;
}

export default function PharmaciesModule({ 
  pharmacies, patients, consultations, bills, users, medicines, batches, suppliers, onRefresh 
}: PharmaciesModuleProps) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<RealPharmacyTenant | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'patients' | 'consultations' | 'bills' | 'medicines' | 'users'>('overview');
  
  // Edit Pharmacy State inside Inspector
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<RealPharmacyTenant>>({});

  const [addFormData, setAddFormData] = useState({
    name: '',
    owner_name: '',
    license_number: '',
    gstin: '',
    phone: '',
    address: '',
    plan: 'Pro' as 'Starter' | 'Pro' | 'Enterprise'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredPharmacies = pharmacies.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.license_number && p.license_number.toLowerCase().includes(search.toLowerCase())) ||
    (p.address && p.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createRealPharmacy(addFormData);
      setSuccessMsg(`Successfully onboarded "${addFormData.name}" to Supabase Database!`);
      setShowAddModal(false);
      setAddFormData({ name: '', owner_name: '', license_number: '', gstin: '', phone: '', address: '', plan: 'Pro' });
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenInspector = (pharm: RealPharmacyTenant) => {
    setSelectedPharmacy(pharm);
    setEditFormData(pharm);
    setIsEditing(false);
    setInspectorTab('overview');
  };

  const handleSaveEditPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPharmacy || !editFormData.name?.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await updateRealPharmacy(selectedPharmacy.id, editFormData);
      setSelectedPharmacy(updated);
      setIsEditing(false);
      setSuccessMsg(`Updated tenant settings for "${updated.name}"!`);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter 360 Tenant Data for Selected Pharmacy
  const tenantPatients = patients.filter(p => !p.pharmacy_id || p.pharmacy_id === selectedPharmacy?.id || selectedPharmacy?.id === 'ph_demo_default');
  const tenantConsultations = consultations.filter(c => !c.pharmacy_id || c.pharmacy_id === selectedPharmacy?.id || selectedPharmacy?.id === 'ph_demo_default');
  const tenantBills = bills.filter(b => !b.pharmacy_id || b.pharmacy_id === selectedPharmacy?.id || selectedPharmacy?.id === 'ph_demo_default');
  const tenantMedicines = medicines.filter(m => !m.pharmacy_id || m.pharmacy_id === selectedPharmacy?.id || selectedPharmacy?.id === 'ph_demo_default');
  const tenantUsers = users.filter(u => !u.pharmacy_id || u.pharmacy_id === selectedPharmacy?.id || selectedPharmacy?.id === 'ph_demo_default');

  const tenantTotalSales = tenantBills.reduce((acc, b) => acc + (b.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Tenant Clinics & Pharmacies 360° Audit Manager
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 glow-emerald">
              {pharmacies.length} Real Supabase Tenants
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any tenant clinic below to audit all their OPD bookings, billing sales, medicines, staff, and edit clinic details.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" /> Onboard New Clinic
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3 rounded-2xl glass-card flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinic name, drug license no, address in Supabase..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-medium"
          />
        </div>
      </div>

      {/* Pharmacies Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPharmacies.map((pharm) => (
          <div 
            key={pharm.id} 
            className="p-5 rounded-2xl glass-card hover:border-teal-500/50 transition-all shadow-xl space-y-4 flex flex-col justify-between group cursor-pointer"
            onClick={() => handleOpenInspector(pharm)}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-teal-300 transition-colors leading-tight">{pharm.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Owner: {pharm.owner_name || 'Clinic Director'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  {pharm.plan || 'Pro'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <p className="flex items-center gap-2 text-slate-400">
                  <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="font-mono text-slate-300">Lic: {pharm.license_number || '20B-HYD-847291'}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-mono text-slate-300">GST: {pharm.gst || '36AAACL1234A1Z5'}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{pharm.phone || '040-23456789'}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{pharm.address || 'Hitec City, Hyderabad'}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-teal-400 font-extrabold flex items-center gap-1 group-hover:underline">
                <Eye className="w-3.5 h-3.5 text-teal-400" /> Audit 360° Activity
              </span>
              <span className="text-slate-400 font-mono">
                {new Date(pharm.created_at || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Deep Tenant 360° Inspector Modal / Drawer */}
      {selectedPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-4xl bg-slate-900 border border-teal-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
            {/* Inspector Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-lg font-black shrink-0 glow-emerald">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white">{selectedPharmacy.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      {selectedPharmacy.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Tenant ID: {selectedPharmacy.id} | Lic: {selectedPharmacy.license_number} | GST: {selectedPharmacy.gst}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Tenant Settings'}</span>
                </button>

                <button onClick={() => setSelectedPharmacy(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* If Editing Mode */}
            {isEditing ? (
              <form onSubmit={handleSaveEditPharmacy} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                <h4 className="font-extrabold text-sm text-teal-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Edit3 className="w-4 h-4 text-teal-400" /> Edit Tenant Pharmacy Configurations
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Pharmacy Name</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Owner Name</label>
                    <input
                      type="text"
                      value={editFormData.owner_name || ''}
                      onChange={e => setEditFormData({ ...editFormData, owner_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Drug License Number</label>
                    <input
                      type="text"
                      value={editFormData.license_number || ''}
                      onChange={e => setEditFormData({ ...editFormData, license_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={editFormData.gst || ''}
                      onChange={e => setEditFormData({ ...editFormData, gst: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editFormData.phone || ''}
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Subscription Plan</label>
                    <select
                      value={editFormData.plan || 'Pro'}
                      onChange={e => setEditFormData({ ...editFormData, plan: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    >
                      <option value="Starter">Starter Plan (₹490/mo)</option>
                      <option value="Pro">Pro Plan (₹1,490/mo)</option>
                      <option value="Enterprise">Enterprise Tier (Custom)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Address</label>
                  <input
                    type="text"
                    value={editFormData.address || ''}
                    onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-950" /> Save Tenant Changes to Supabase
                </button>
              </form>
            ) : (
              <>
                {/* 360 Audit Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                  <button
                    onClick={() => setInspectorTab('overview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      inspectorTab === 'overview'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    360° Summary
                  </button>
                  <button
                    onClick={() => setInspectorTab('patients')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      inspectorTab === 'patients'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-teal-400" /> Patients ({tenantPatients.length})
                  </button>
                  <button
                    onClick={() => setInspectorTab('consultations')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      inspectorTab === 'consultations'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-purple-400" /> Voice OPD Bookings ({tenantConsultations.length})
                  </button>
                  <button
                    onClick={() => setInspectorTab('bills')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      inspectorTab === 'bills'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-blue-400" /> POS Sales (₹{tenantTotalSales})
                  </button>
                  <button
                    onClick={() => setInspectorTab('medicines')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      inspectorTab === 'medicines'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Pill className="w-3.5 h-3.5 text-emerald-400" /> Medicines ({tenantMedicines.length})
                  </button>
                  <button
                    onClick={() => setInspectorTab('users')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      inspectorTab === 'users'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" /> Staff ({tenantUsers.length})
                  </button>
                </div>

                {/* 360 Tab Content */}
                {inspectorTab === 'overview' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Total UHID Patients</span>
                      <p className="text-2xl font-black text-white font-mono">{tenantPatients.length}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Voice OPD Tokens</span>
                      <p className="text-2xl font-black text-purple-300 font-mono">{tenantConsultations.length}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Total POS Sales Revenue</span>
                      <p className="text-2xl font-black text-teal-400 font-mono">₹{tenantTotalSales.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {inspectorTab === 'patients' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tenantPatients.map(p => (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.phone}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {p.uhid}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {inspectorTab === 'consultations' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tenantConsultations.map(c => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{c.patient_name}</p>
                          <p className="text-[10px] text-slate-400">{c.doctor_name || 'Dr. Sharma'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {c.token_number || 'OPD-TK-100'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {inspectorTab === 'bills' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tenantBills.map(b => (
                      <div key={b.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{b.customer_name || 'Walk-in Customer'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{b.payment_method || 'Cash'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          ₹{b.total_amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Onboard New Clinic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-teal-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-teal-400" /> Onboard Clinic into Supabase Database
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPharmacy} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Clinic / Pharmacy Name</label>
                <input
                  type="text"
                  required
                  value={addFormData.name}
                  onChange={e => setAddFormData({ ...addFormData, name: e.target.value })}
                  placeholder="e.g. Metro Care OPD & Pharmacy"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Drug License No</label>
                  <input
                    type="text"
                    value={addFormData.license_number}
                    onChange={e => setAddFormData({ ...addFormData, license_number: e.target.value })}
                    placeholder="20B-HYD-..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={addFormData.gstin}
                    onChange={e => setAddFormData({ ...addFormData, gstin: e.target.value })}
                    placeholder="36AAACL..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={addFormData.phone}
                    onChange={e => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="040-..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Plan Tier</label>
                  <select
                    value={addFormData.plan}
                    onChange={e => setAddFormData({ ...addFormData, plan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Starter">Starter (₹490/mo)</option>
                    <option value="Pro">Pro (₹1,490/mo)</option>
                    <option value="Enterprise">Enterprise (Custom)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Address / Location</label>
                <input
                  type="text"
                  value={addFormData.address}
                  onChange={e => setAddFormData({ ...addFormData, address: e.target.value })}
                  placeholder="Full clinic address"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving to Supabase...' : 'Complete Clinic Onboarding'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
