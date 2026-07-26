import React, { useState, useEffect } from 'react';
import AdminHeader from './components/AdminHeader';
import AdminSidebar, { AdminTab } from './components/AdminSidebar';
import OverviewModule from './components/OverviewModule';
import PharmaciesModule from './components/PharmaciesModule';
import PatientsModule from './components/PatientsModule';
import TicketsModule from './components/TicketsModule';
import SecurityModule from './components/SecurityModule';
import { 
  getRealPharmacies, getRealPatients, getRealConsultations, 
  getRealBills, getRealUserProfiles, getRealMedicines, 
  getRealBatches, getRealSuppliers, subscribeToRealtimeChanges, 
  RealPharmacyTenant, RealPatientRecord, RealOpConsultation, 
  RealBillRecord, RealUserProfile, RealMedicineRecord, RealBatchRecord, RealSupplierRecord 
} from './lib/supabase';
import { Shield, KeyRound, Sparkles, Radio } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Real Database States from Supabase
  const [pharmacies, setPharmacies] = useState<RealPharmacyTenant[]>([]);
  const [patients, setPatients] = useState<RealPatientRecord[]>([]);
  const [consultations, setConsultations] = useState<RealOpConsultation[]>([]);
  const [bills, setBills] = useState<RealBillRecord[]>([]);
  const [users, setUsers] = useState<RealUserProfile[]>([]);
  const [medicines, setMedicines] = useState<RealMedicineRecord[]>([]);
  const [batches, setBatches] = useState<RealBatchRecord[]>([]);
  const [suppliers, setSuppliers] = useState<RealSupplierRecord[]>([]);

  const [dbConnected, setDbConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLiveEvent, setLastLiveEvent] = useState<string | null>(null);

  // Master Lock Screen State
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('livafil_admin_unlocked') === 'true';
  });
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Fetch 100% Real 360° Supabase Data
  const loadAllRealData = async () => {
    setIsRefreshing(true);
    try {
      const [phData, ptData, csData, blData, usData, mdData, btData, spData] = await Promise.all([
        getRealPharmacies(),
        getRealPatients(),
        getRealConsultations(),
        getRealBills(),
        getRealUserProfiles(),
        getRealMedicines(),
        getRealBatches(),
        getRealSuppliers()
      ]);
      setPharmacies(phData);
      setPatients(ptData);
      setConsultations(csData);
      setBills(blData);
      setUsers(usData);
      setMedicines(mdData);
      setBatches(btData);
      setSuppliers(spData);
      setDbConnected(true);
    } catch (err) {
      console.error(err);
      setDbConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllRealData();

    // 3-second auto-poll backup so new registrations in Main App pop up immediately
    const pollInterval = setInterval(() => {
      loadAllRealData();
    }, 3000);

    const unsubscribe = subscribeToRealtimeChanges((tableName) => {
      setLastLiveEvent(`Live Database Activity: Table '${tableName}' updated in Supabase!`);
      loadAllRealData();
      setTimeout(() => setLastLiveEvent(null), 5000);
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '8888' || pin === '1234' || pin.trim() === 'admin') {
      setIsUnlocked(true);
      localStorage.setItem('livafil_admin_unlocked', 'true');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleUnlockDemo = () => {
    setIsUnlocked(true);
    localStorage.setItem('livafil_admin_unlocked', 'true');
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-white">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900/90 border border-teal-500/30 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 text-center glass-panel">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-teal-500/20 ring-1 ring-teal-400/40 glow-emerald">
            <Shield className="w-7 h-7 text-slate-950 animate-pulse" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              Livafil Platform Admin Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              360° Software Owner Control & Real-time Supabase Sync
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1 flex justify-between">
                <span>Enter Admin Master PIN</span>
                <span className="text-teal-400 font-mono">Default: 8888</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm font-mono tracking-widest focus:outline-none focus:border-teal-500"
                />
              </div>
              {pinError && (
                <p className="text-[11px] text-red-400 font-bold mt-1">Invalid PIN. Try 8888 or click Master Unlock below.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer"
            >
              Authenticate & Launch Control Center
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleUnlockDemo}
              className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" /> One-Click Owner Master Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AdminHeader 
        dbConnected={dbConnected} 
        onRefresh={loadAllRealData} 
        isRefreshing={isRefreshing} 
      />

      {lastLiveEvent && (
        <div className="bg-teal-950 border-b border-teal-500/40 text-teal-300 px-6 py-1.5 text-xs font-bold font-mono flex items-center gap-2 animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-ping" />
          <span>{lastLiveEvent}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          tenantCount={pharmacies.length} 
          ticketCount={2} 
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'overview' && (
            <OverviewModule 
              pharmacies={pharmacies} 
              patients={patients} 
              consultations={consultations} 
              bills={bills} 
              users={users} 
              onNavigate={(tab) => setActiveTab(tab)} 
            />
          )}

          {activeTab === 'pharmacies' && (
            <PharmaciesModule 
              pharmacies={pharmacies} 
              patients={patients} 
              consultations={consultations} 
              bills={bills} 
              users={users} 
              medicines={medicines} 
              batches={batches} 
              suppliers={suppliers} 
              onRefresh={loadAllRealData} 
            />
          )}

          {activeTab === 'patients' && (
            <PatientsModule 
              patients={patients} 
              consultations={consultations} 
              onRefresh={loadAllRealData} 
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsModule />
          )}

          {activeTab === 'security' && (
            <SecurityModule />
          )}
        </main>
      </div>
    </div>
  );
}
