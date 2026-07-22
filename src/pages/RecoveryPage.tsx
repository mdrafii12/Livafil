import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ArrowUpRight, BarChart4, CheckCircle2, ChevronRight, 
  Coins, Download, FileText, HelpCircle, History, Info, ListPlus, 
  Percent, RefreshCw, Send, ShieldAlert, Sparkles, Trash2, TrendingUp 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Batch, Medicine, ExchangeListing } from '../types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';

interface SalvageLog {
  id: string;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  method: 'B2B Exchange' | 'Supplier Return' | 'Charity Donation' | 'Liquidation';
  recoveredAmount: number;
  lossAvoided: number;
  date: string;
}

export default function RecoveryPage() {
  const { profile } = useAuth();
const [myPharmacy, setMyPharmacy] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [salvageLogs, setSalvageLogs] = useState<SalvageLog[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [customDiscount, setCustomDiscount] = useState<number>(30);
  const [salvageMethod, setSalvageMethod] = useState<'B2B Exchange' | 'Supplier Return' | 'Charity Donation' | 'Liquidation'>('B2B Exchange');
  const [wizardSuccess, setWizardSuccess] = useState<string | null>(null);

const loadData = async () => {
    if (!profile?.pharmacy_id) return;
    try {
      const [bts, meds, logs, pharmacy] = await Promise.all([
        db.getBatches(),
        db.getMedicines(),
        db.getSalvageLogs(),
        db.getMyPharmacy(profile.pharmacy_id),
      ]);
      setBatches(bts);
      setMedicines(meds);
      setSalvageLogs(logs);
      setMyPharmacy(pharmacy);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.pharmacy_id]);

  // Compute stats
  const expiringSoonBatches = batches.filter(b => b.quantity > 0 && b.status === 'Expiring');
  const expiredBatches = batches.filter(b => b.quantity > 0 && b.status === 'Expired');
  const atRiskBatches = [...expiringSoonBatches, ...expiredBatches];

  const totalLossExposure = atRiskBatches.reduce((acc, b) => acc + (b.quantity * b.purchasePrice), 0);
  
  // Potential recovery calculations:
  // - B2B Exchange: returns ~65% of purchase price for near-expiry, 20% for expired
  // - Return to Supplier: ~80% of purchase price if accepted (within return window)
  // - Charity Donation: ~30% tax benefit value
  // - Liquidation: ~15% flat salvage value
  const potentialRecoveryValue = atRiskBatches.reduce((acc, b) => {
    const cost = b.quantity * b.purchasePrice;
    if (b.status === 'Expired') {
      return acc + (cost * 0.15); // liquidation rate
    } else {
      return acc + (cost * 0.60); // exchange rate
    }
  }, 0);

  // Suggested discount rate calculation helper based on remaining shelf life
  const getAISuggestedDiscount = (expiryDateStr: string): { discount: number; reason: string } => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { discount: 90, reason: 'Batch is expired. Immediate liquidation or chemical return required.' };
    } else if (diffDays <= 30) {
      return { discount: 60, reason: 'Less than 30 days remaining. High exposure. List with deep clearance discount.' };
    } else if (diffDays <= 60) {
      return { discount: 40, reason: '30-60 days remaining. Moderate exposure. Standard exchange discount suggested.' };
    } else if (diffDays <= 90) {
      return { discount: 25, reason: '60-90 days remaining. Early alert. Offer minor markdown to accelerate local demand.' };
    } else {
      return { discount: 15, reason: 'Pre-emptive recovery. Safe margins.' };
    }
  };

  // 1-Click Action Wizard handler
 const handleSalvageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !profile?.pharmacy_id) return;

    const targetBatch = batches.find(b => b.id === selectedBatchId);
    if (!targetBatch) return;

    const med = medicines.find(m => m.id === targetBatch.medicineId);
    const medName = med ? med.name : 'Unknown Medicine';
    const totalCost = targetBatch.quantity * targetBatch.purchasePrice;

    try {
      if (salvageMethod === 'B2B Exchange') {
        const listPrice = targetBatch.sellingPrice * (1 - customDiscount / 100);

        await db.addExchangeListing(profile.pharmacy_id, {
          pharmacyName: myPharmacy?.name || 'Unknown Pharmacy',
          medicineId: targetBatch.medicineId,
          medicineName: medName,
          genericName: med ? med.genericName : 'Generic',
          strength: med ? med.strength : 'N/A',
          manufacturer: med ? med.manufacturer : 'Unknown',
          batchNumber: targetBatch.batchNumber,
          quantity: targetBatch.quantity,
          expiryDate: targetBatch.expiryDate,
          mrp: targetBatch.mrp,
          sellingPrice: listPrice,
          discountPercentage: customDiscount,
          minimumOrder: Math.min(10, targetBatch.quantity),
          reason: 'Near Expiry',
          notes: 'AI-Generated pre-expiry salvage listing. Automated discount applied.',
          status: 'Active'
        });

        setWizardSuccess(`Successfully auto-posted ${targetBatch.quantity} units of ${medName} on B2B Exchange network with a ${customDiscount}% discount!`);
      } else {
        let recovered = 0;
        let lossAvoided = 0;

        if (salvageMethod === 'Supplier Return') {
          recovered = totalCost * 0.80;
          lossAvoided = totalCost * 0.80;
        } else if (salvageMethod === 'Charity Donation') {
          recovered = 0;
          lossAvoided = totalCost * 0.30;
        } else if (salvageMethod === 'Liquidation') {
          recovered = totalCost * 0.15;
          lossAvoided = totalCost * 0.15;
        }

        await db.resolveBatchViaSalvage(
          profile.pharmacy_id,
          profile.id,
          { id: targetBatch.id, medicineId: targetBatch.medicineId, batchNumber: targetBatch.batchNumber, quantity: targetBatch.quantity },
          medName,
          salvageMethod,
          Number(recovered.toFixed(2)),
          Number(lossAvoided.toFixed(2))
        );

        setWizardSuccess(`Stock resolved! Logged ${targetBatch.quantity} units of ${medName} processed via ${salvageMethod}. Stock adjusted successfully.`);
      }

      await loadData();
    } catch (err) {
      console.error(err);
    }

    setSelectedBatchId('');
    setTimeout(() => setWizardSuccess(null), 5000);
  };

  // Compute expiry timeline (months remaining distribution)
  const getTimelineData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets: { [key: string]: { exposure: number; recovery: number } } = {};
    
    // Initialize next 6 months
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      buckets[label] = { exposure: 0, recovery: 0 };
    }

    batches.forEach(b => {
      if (b.quantity <= 0) return;
      const expDate = new Date(b.expiryDate);
      const diffMonths = (expDate.getFullYear() - today.getFullYear()) * 12 + expDate.getMonth() - today.getMonth();
      
      if (diffMonths >= 0 && diffMonths < 6) {
        const d = new Date(today.getFullYear(), today.getMonth() + diffMonths, 1);
        const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
        const val = b.quantity * b.purchasePrice;
        if (buckets[label]) {
          buckets[label].exposure += val;
          buckets[label].recovery += b.status === 'Expired' ? (val * 0.15) : (val * 0.60);
        }
      }
    });

    return Object.keys(buckets).map(k => ({
      name: k,
      'Loss Exposure': Number(buckets[k].exposure.toFixed(2)),
      'Projected Recovery': Number(buckets[k].recovery.toFixed(2))
    }));
  };

  const timelineData = getTimelineData();

  // Chart pie distribution of salvage methods
  const pieData = [
    { name: 'B2B Exchange', value: salvageLogs.filter(l => l.method === 'B2B Exchange').reduce((acc, l) => acc + l.lossAvoided, 0) },
    { name: 'Supplier Return', value: salvageLogs.filter(l => l.method === 'Supplier Return').reduce((acc, l) => acc + l.lossAvoided, 0) },
    { name: 'Charity Donation', value: salvageLogs.filter(l => l.method === 'Charity Donation').reduce((acc, l) => acc + l.lossAvoided, 0) },
    { name: 'Liquidation', value: salvageLogs.filter(l => l.method === 'Liquidation').reduce((acc, l) => acc + l.lossAvoided, 0) },
  ].filter(item => item.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const selectedMed = selectedBatch ? medicines.find(m => m.id === selectedBatch.medicineId) : null;
  const aiRecommendation = selectedBatch ? getAISuggestedDiscount(selectedBatch.expiryDate) : null;

  // Sync custom discount to AI recommendation default
  useEffect(() => {
    if (aiRecommendation) {
      setCustomDiscount(aiRecommendation.discount);
    }
  }, [selectedBatchId]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="recovery-center-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-amber-200/50 dark:border-amber-900/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              AI Intelligent Recovery Active
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Recovery Center</h1>
          <p className="text-sm text-gray-500">Recover capital, mitigate depreciation losses, and manage returns for near-expiry and dead stock drugs.</p>
        </div>
        <div className="flex items-center gap-3">
         <button 
            onClick={loadData} 
            className="p-2.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors flex items-center justify-center"
            title="Refresh database values"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <a
            href="https://ai.studio/build"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            <span>Export Recovery Audit</span>
          </a>
        </div>
      </div>

      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: EXPIRED & NEAR EXPIRY COUNT */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">At Risk Batches</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{atRiskBatches.length}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Near-expiry &amp; Expired stock</p>
          </div>
        </div>

        {/* CARD 2: TOTAL LOSS EXPOSURE */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Loss</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCurrency(totalLossExposure)}</h3>
            <p className="text-[10px] text-red-500 font-medium mt-1">Financial value at stake</p>
          </div>
        </div>

        {/* CARD 3: POTENTIAL RECOVERY VALUE */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Potential Recovery</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCurrency(potentialRecoveryValue)}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Through exchange &amp; returns</p>
          </div>
        </div>

        {/* CARD 4: SAVED CAPITAL */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salvaged Capital</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCurrency(salvageLogs.reduce((acc, l) => acc + l.lossAvoided, 0))}</h3>
            <p className="text-[10px] text-blue-500 font-medium mt-1">Actual capital saved to date</p>
          </div>
        </div>

      </div>

      {/* FLOATING ACTION ALERT OR SUCCESS WIZARD POPUP */}
      {wizardSuccess && (
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 text-xs font-bold animate-fadeIn shadow-xs" id="salvage-success-alert">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm mb-0.5">Recovery Action Logged Successfully</p>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">{wizardSuccess}</p>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN SPLIT PLATFORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVE RECOVERY PLANNER & SUGGESTED EXCHANGE WIZARD */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SEC 1: INVENTORY AT RISK SECTION */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-gray-800/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Active Near-Expiry &amp; Expired Inventory</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select any at-risk batch to initialize the smart automated recovery wizard.</p>
              </div>
              <span className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-bold text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-md">
                Depreciation Risk Area
              </span>
            </div>

            {atRiskBatches.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">Your Inventory is Protected</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">There are no batches expiring soon or currently expired. The smart monitoring scanner is running in the background.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-800/60 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Medicine Info</th>
                      <th className="py-3 px-4">Batch No.</th>
                      <th className="py-3 px-4">At Risk Qty</th>
                      <th className="py-3 px-4">Cost Basis</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-xs text-gray-600 dark:text-gray-300">
                    {atRiskBatches.map(b => {
                      const med = medicines.find(m => m.id === b.medicineId);
                      const isExpired = b.status === 'Expired';
                      const expDate = new Date(b.expiryDate);
                      const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                      return (
                        <tr 
                          key={b.id} 
                          className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${selectedBatchId === b.id ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                        >
                          <td className="py-3 px-4 font-semibold">
                            <p className="text-gray-900 dark:text-white font-bold">{med ? med.name : 'Unknown'}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{med ? med.genericName : ''}</p>
                          </td>
                          <td className="py-3 px-4 font-mono">{b.batchNumber}</td>
                          <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-150">{b.quantity} units</td>
                          <td className="py-3 px-4 font-medium">{formatCurrency(b.quantity * b.purchasePrice)}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{b.expiryDate}</p>
                            <p className={`text-[10px] font-bold ${isExpired ? 'text-red-500' : daysLeft <= 30 ? 'text-amber-500 animate-pulse' : 'text-gray-400'}`}>
                              {isExpired ? 'Expired' : `${daysLeft} days remaining`}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              isExpired 
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/40' 
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/40'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedBatchId(b.id)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200/20 flex items-center gap-1.5 ml-auto transition-all"
                            >
                              <span>Salvage</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEC 2: RECOMMENDED RECOVERY ACTIONS / SMART WIZARD */}
          {selectedBatch && (
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 shadow-sm animate-slideIn relative overflow-hidden" id="salvage-wizard-card">
              <div className="absolute top-0 right-0 p-4 bg-blue-500/10 rounded-bl-3xl">
                <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>

              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                AI Smart Salvage Optimization
              </h2>
              <p className="text-xs text-gray-500 mb-6">Let the MedGuard AI engine assist you in executing reciprocal capital retrieval for the selected drug batch.</p>

              {/* Selection Summary Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Target Medicine</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{selectedMed ? selectedMed.name : 'Unknown'}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{selectedMed ? selectedMed.genericName : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Batch Details</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-white mt-1">No: <span className="font-mono">{selectedBatch.batchNumber}</span></p>
                  <p className="text-[10px] text-gray-500 font-semibold">{selectedBatch.quantity} units available</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total At-Risk Cost</p>
                  <p className="text-xs font-bold text-red-500 mt-1">{formatCurrency(selectedBatch.quantity * selectedBatch.purchasePrice)}</p>
                  <p className="text-[10px] text-gray-400">At-purchase rate basis</p>
                </div>
              </div>

              <form onSubmit={handleSalvageSubmit} className="space-y-6">
                
                {/* Steps 1: Salvage Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Select Salvage Method</label>
                    <select
                      value={salvageMethod}
                      onChange={(e) => setSalvageMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                    >
                      <option value="B2B Exchange">Post on B2B Exchange Network</option>
                      <option value="Supplier Return">Supplier Return Policy Fulfillment</option>
                      <option value="Charity Donation">Log Local Charity Donation (Tax Write-Off)</option>
                      <option value="Liquidation">Direct Salvage Liquidation Outflow</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">AI Suggested Discount / Value</label>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/30 dark:border-blue-900/20 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-1.5 font-extrabold text-blue-700 dark:text-blue-400 mb-1">
                        <Info className="h-3.5 w-3.5" />
                        <span>AI Recommendation: {aiRecommendation?.discount}% Markdown</span>
                      </div>
                      <p className="font-medium text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{aiRecommendation?.reason}</p>
                    </div>
                  </div>
                </div>

                {/* Optional Configuration if B2B Exchange */}
                {salvageMethod === 'B2B Exchange' && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Adjust Discount Rate (%)</span>
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{customDiscount}% Discount</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <span className="font-semibold text-slate-500">Retail Unit Price:</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatCurrency(selectedBatch.sellingPrice)}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Exchange Listing Price:</span>
                        <p className="text-xs font-bold text-emerald-600">{formatCurrency(selectedBatch.sellingPrice * (1 - customDiscount / 100))} / unit</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action trigger button */}
                <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchId('')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel Selection
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Execute {salvageMethod} Salvage</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* SEC 3: EXPIRED & STAGGERED LINE TIMELINE */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Depreciation &amp; Capital Recovery Timeline</h2>
                <p className="text-xs text-gray-500 mt-0.5">Projected cost exposure vs potential capital salvaged over the next 6 months.</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-xs"></span>
                <span className="font-bold text-gray-600 dark:text-gray-400">Projected Salvaged</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExposure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRecovery" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="Loss Exposure" stroke="#ef4444" fillOpacity={1} fill="url(#colorExposure)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Projected Recovery" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRecovery)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DISTRIBUTION STATS & DISPOSAL HISTORIC LEDGER */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SEC 4: Pie Chart DISTRIBUTION */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Salvaged Share by Channel</h2>
            <p className="text-xs text-gray-500 mb-4">Cumulative capital breakdown saved through specific recovery pipelines.</p>

            {pieData.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <span>No salvage operations recorded yet.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-44 w-full flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Labels list */}
                <div className="space-y-2 text-xs">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEC 5: RECOVERY LEDGER HISTORY */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recovery Ledger</h2>
                <p className="text-xs text-gray-500 mt-0.5">Historical record of successful capital salvages.</p>
              </div>
              <History className="h-4 w-4 text-gray-400" />
            </div>

            <div className="space-y-4.5 max-h-[360px] overflow-y-auto pr-1">
              {salvageLogs.map(log => {
                const isWriteOff = log.method === 'Charity Donation';
                return (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-950 dark:text-slate-150">{log.medicineName}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {log.batchNumber} • {log.quantity} units</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-extrabold uppercase ${
                        log.method === 'B2B Exchange' 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : log.method === 'Supplier Return'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : log.method === 'Charity Donation'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      }`}>
                        {log.method}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-slate-100 dark:border-slate-800/60 pt-2 text-slate-500">
                      <span>Saved Date: {log.date}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">
                        {isWriteOff ? `Est Tax Off: ₹${log.lossAvoided}` : `Recovered: ₹${log.recoveredAmount}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI RECOVERY COMPLIANCE COMPASS */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">B2B Compliance Compass</p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              In accordance with federal FDA guidelines and local drug regulatory standards, returned or donated medicines must verify complete cold-chain records and seal safety guarantees. MedGuard Exchange enforces double-blind HIPAA masking until mutual compliance validation.
            </p>
            <div className="h-px bg-slate-850"></div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Security Shield Standard: v3.1</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Compliant
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
