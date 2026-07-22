import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, BarChart3, AlertTriangle, Pill, Boxes, 
  Sparkles, PlusCircle, ArrowRightCircle, Download, FileText, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Sparkle,
  Shield, DollarSign, Activity, Percent, ArrowRight, CheckCircle,
  ThumbsUp, Tag, ShoppingCart, Info, RotateCcw, Flame, Bell, Send
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Medicine, Batch, Category, Movement, Notification } from '../types';
import { IntelligenceService, HealthScore, RecoveryMetrics, ExpiryGroup, DeadStockItem, SlowMovingItem, LowStockItem, ValueAnalytics, SmartRecommendation } from '../services/intelligence';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { formatCurrency } from '../utils/currency';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useTranslation();
const [suppliers, setSuppliers] = useState<import('../types').Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'expiry' | 'deadstock' | 'lowstock'>('expiry');
  
  // Intelligence Metrics state
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [recovery, setRecovery] = useState<RecoveryMetrics | null>(null);
  const [expiryTimeline, setExpiryTimeline] = useState<ExpiryGroup[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [slowMoving, setSlowMoving] = useState<SlowMovingItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [analytics, setAnalytics] = useState<ValueAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load state
 const refreshAllState = async () => {
    setLoading(true);
    try {
      const [meds, bts, cats, movs, sups] = await Promise.all([
        db.getMedicines(),
        db.getBatches(),
        db.getCategories(),
        db.getMovements(),
        db.getSuppliers(),
      ]);

      if (profile?.pharmacy_id) {
        await db.syncBatchNotifications(profile.pharmacy_id, bts);
      }

      const notificationRows = await db.getNotifications();
      setMedicines(meds);
      setBatches(bts);
      setCategories(cats);
      setMovements(movs);
      setSuppliers(sups);
      setNotifications(notificationRows);

      setHealth(IntelligenceService.getInventoryHealth(bts, meds));
      setRecovery(IntelligenceService.getRecoveryMetrics(bts));
      setExpiryTimeline(IntelligenceService.getExpiryTimeline(bts, meds));
      setDeadStock(IntelligenceService.getDeadStock(bts, movs, meds));
      setSlowMoving(IntelligenceService.getSlowMoving(bts, movs, meds));
      setLowStock(IntelligenceService.getLowStock(bts, meds, sups));
      setAnalytics(IntelligenceService.getInventoryValueAnalytics(bts, cats, meds, sups));
      setRecommendations(IntelligenceService.getSmartRecommendations(bts, meds, movs));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllState();
  }, []);

  // Simulates executing a clearance discount (35% off selling price & mrp) on a batch
const handleApplyDiscount = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch || !profile?.pharmacy_id) return;

    const newSellingPrice = batch.sellingPrice * 0.65;
    const newMrp = batch.mrp * 0.70;

    try {
      // db.updateBatch signature: (id, pharmacyId, createdBy, oldQuantity, batchData)
      // Quantity is unchanged here, so no Adjustment movement gets logged — this is
      // a price-only change, not a stock change.
      await db.updateBatch(batch.id, profile.pharmacy_id, profile.id, batch.quantity, {
        ...batch,
        sellingPrice: newSellingPrice,
        mrp: newMrp,
        notes: `${batch.notes || ''} [Promo Active: 35% Expiry Clearance Applied]`.trim()
      });

      setActionSuccessMsg(`Cleared! Applied flash discount to batch "${batch.batchNumber}". Selling price reduced to ${formatCurrency(newSellingPrice)}.`);
      await refreshAllState();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDailySummary = async () => {
    try {
      setLoading(true);
      if (!profile?.pharmacy_id) return;
      
      // Fetch latest pharmacy config for admin phone
      const pharm = await db.getMyPharmacy(profile.pharmacy_id);
      if (!pharm?.whatsappAdminPhone) {
        setActionSuccessMsg('Warning: No WhatsApp Admin Phone configured in Settings > Pharmacy.');
        setTimeout(() => setActionSuccessMsg(null), 5000);
        return;
      }

      // Fetch all bills to compute today's sales
      const allBills = await db.getBills();
      const todayString = new Date().toLocaleDateString('en-IN');
      const todayBills = allBills.filter(b => b.date.startsWith(todayString) || b.date.includes(todayString));
      
      const salesTotal = todayBills.reduce((sum, b) => sum + b.grandTotal, 0);
      const billsCount = todayBills.length;
      const returnedBillsCount = todayBills.filter(b => b.status === 'Returned' || b.status === 'Partially Returned').length;
      
      const message = `*MEDGUARD DAILY SUMMARY*\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n*Sales Performance:*\nTotal Revenue: ${formatCurrency(salesTotal)}\nTotal Invoices: ${billsCount}\nReturned/Refunded: ${returnedBillsCount}\n\n*Inventory Health:*\nShelf Score: ${health?.score || 0}/100\nPending Recommendations: ${recommendations.length}\n\nHave a great evening!`;
      
      sendWhatsAppMessage(pharm.whatsappAdminPhone, message);
      
      setActionSuccessMsg('Daily summary launched via WhatsApp Deep Link.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setActionSuccessMsg('Error generating summary.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Simulates restock order for a medicine
  const handleQuickReorder = async (medicineId: string, quantity: number) => {
    const med = medicines.find(m => m.id === medicineId);
    if (!med || !profile?.pharmacy_id) return;

    const existingBatches = batches.filter(b => b.medicineId === medicineId);
    const purchasePrice = existingBatches.length > 0 ? existingBatches[0].purchasePrice : 10;
    const sellingPrice = existingBatches.length > 0 ? existingBatches[0].sellingPrice : 18;
    const mrp = existingBatches.length > 0 ? existingBatches[0].mrp : 20;
    const supplierId = existingBatches.length > 0 ? existingBatches[0].supplierId : (suppliers[0]?.id || '');
    const minStock = existingBatches.length > 0 ? existingBatches[0].minimumStock : 100;

    const dFuture = new Date();
    dFuture.setDate(dFuture.getDate() + 365);
    const expiryDate = dFuture.toISOString().split('T')[0];
    const dManufacture = new Date().toISOString().split('T')[0];

    try {
      await db.addBatch(profile.pharmacy_id, profile.id, {
        medicineId,
        batchNumber: 'RESTOCK-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        quantity,
        purchasePrice,
        sellingPrice,
        mrp,
        expiryDate,
        manufactureDate: dManufacture,
        receivedDate: dManufacture,
        supplierId,
        minimumStock: minStock,
        notes: 'Automated low stock replenishment reorder.'
      });

      setActionSuccessMsg(`Success! replenishment order submitted to distributor. Added ${quantity} fresh units of ${med.name}.`);
      await refreshAllState();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };
  // KPI aggregates
  const totalValue = analytics?.inventoryCost || 0;
  const medicineCount = medicines.length;
  const lowStockCount = lowStock.length;
  const expiringCount = batches.filter(b => b.status === 'Expiring').length;
  const deadStockValue = deadStock.reduce((sum, item) => sum + item.value, 0);

  // Chart 1: Inventory Trend Data (Last 6 months simulated based on database current state)
  const inventoryTrendData = [
    { month: 'Feb', Value: totalValue * 0.88, Loss: deadStockValue * 0.2 },
    { month: 'Mar', Value: totalValue * 0.93, Loss: deadStockValue * 0.1 },
    { month: 'Apr', Value: totalValue * 0.96, Loss: deadStockValue * 0.3 },
    { month: 'May', Value: totalValue * 0.90, Loss: deadStockValue * 0.5 },
    { month: 'Jun', Value: totalValue * 1.03, Loss: deadStockValue * 0.8 },
    { month: 'Jul (Live)', Value: totalValue, Loss: deadStockValue },
  ];

  // Chart 2: Expiry Risk Distribution
  const expiryRiskData = expiryTimeline.map(group => ({
    range: group.name,
    Value: group.totalValue,
    color: group.color
  }));

  // Chart 3: Category Distribution Data for Donut
  const categoryShare = analytics?.categoryDistribution || [];
  const COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100 pb-12">
      
      {/* 1. OPERATIONS OVERVIEW HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded-sm uppercase tracking-wide">Phase 2 Enabled</span>
            <span className="text-xs text-slate-400 font-medium">• Intelligence Core v2.1</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            {t('dashboard.overview')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time shelf risk indices, capital recovery probability, and automated loss mitigation strategies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshAllState}
            disabled={loading}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh State'}</span>
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-blue-100 dark:shadow-none cursor-pointer transition-all"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Intelligence Audit</span>
          </button>

          <button 
            onClick={handleSendDailySummary}
            disabled={loading}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send Daily Summary</span>
          </button>
        </div>
      </div>

      {/* ACTION STATUS BANNER */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 shadow-xs animate-slideDown">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold leading-relaxed">{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. DYNAMIC COCKPIT ADVISOR HERO */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:15px_15px]"></div>
        <div className="relative z-10 flex items-start gap-4 max-w-4xl">
          <div className="h-11 w-11 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm animate-pulse">
            <Sparkles className="h-5 w-5 text-emerald-300 fill-emerald-300" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/10 px-2 py-0.5 rounded-sm">MEDGUARD COGNITIVE ADVISOR</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wide">Operational Guard Active</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-100">
              {loading ? (
                'Recalculating capital exposure and expiration risk vectors...'
              ) : health && health.score < 75 ? (
                `Action Required: Shelf Health score has dipped to ${health.score}/100. We detected ${formatCurrency(deadStockValue)} tied up in stagnant or expired stock. Liquidate expiring batches immediately to salvage up to ${formatCurrency(recovery?.potentialRecoveryValue || 0)} in cost.`
              ) : (
                `All clear! The inventory health score is a healthy ${health?.score || 100}/100. Supplier return claims and clearance discount structures are in perfect sync. Keep tracking.`
              )}
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            const highRec = recommendations.find(r => r.priority === 'high');
            if (highRec && highRec.medicineId) {
              navigate('/batches');
            } else {
              setActiveTab('deadstock');
            }
          }}
          className="relative z-10 shrink-0 px-4 py-2.5 bg-white text-indigo-700 hover:bg-slate-50 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 self-end md:self-auto cursor-pointer transition-colors"
        >
          <span>Resolve Alerts</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* DESKTOP APP DOWNLOAD BANNER (UNIVERSAL) */}
      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-lg shrink-0">
            <Download className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              LIVAFIL for Windows (Desktop App)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Prefer a desktop app? Download LIVAFIL for Windows for dedicated window management and quick access.
            </p>
          </div>
        </div>
        <a 
          href="/downloads/LIVAFIL-Setup.exe"
          download="LIVAFIL-Setup.exe"
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download Desktop App (Windows)
        </a>
      </div>

      {/* 3. THE INTEL CORE METRICS BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* A. INVENTORY HEALTH SCORE CARD */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Shelf Health Score</h3>
              <p className="text-xs text-slate-400">Composite index based on waste metrics</p>
            </div>
            {health && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${health.bgColor} ${health.color} border ${health.borderColor}`}>
                {health.rating}
              </span>
            )}
          </div>

          {health && (
            <div className="py-6 flex flex-col md:flex-row items-center gap-6 justify-center">
              {/* Radial Progress Ring */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="46" stroke="#f1f5f9" strokeWidth="10" fill="transparent" className="dark:stroke-slate-800" />
                  <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent" 
                    className={health.color}
                    strokeDasharray={289}
                    strokeDashoffset={289 - (289 * health.score) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold tracking-tight">{health.score}</span>
                  <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">/100</span>
                </div>
              </div>

              {/* Deductions Breakdown list */}
              <div className="space-y-2.5 text-xs w-full max-w-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Fully Expired Penalty</span>
                  <span className="font-semibold text-red-500">-{health.breakdown.expiredImpact} pts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, (health.breakdown.expiredImpact / 45) * 100)}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-slate-500">
                  <span>Near Expiry Exposure</span>
                  <span className="font-semibold text-orange-500">-{health.breakdown.expiringImpact} pts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (health.breakdown.expiringImpact / 25) * 100)}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-slate-500">
                  <span>Stock Deficits & Lows</span>
                  <span className="font-semibold text-purple-500">-{health.breakdown.lowStockImpact} pts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (health.breakdown.lowStockImpact / 20) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {health && (
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-lg flex gap-2.5 items-start">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-normal font-medium text-slate-500 dark:text-slate-400">
                {health.reason}
              </p>
            </div>
          )}
        </div>

        {/* B. RECOVERY SCORE CARD */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Capital Recovery Potential</h3>
              <p className="text-xs text-slate-400">Salvageable capital from high-risk assets</p>
            </div>
            {recovery && (
              <div className="text-right">
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{recovery.recoveryPercentage}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-tight">Recovery rate</span>
              </div>
            )}
          </div>

          {recovery && (
            <div className="py-4 space-y-4">
              {/* Recovery Projections Slider */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100/60 dark:border-emerald-900/25 p-3 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Potential Recovery</span>
                  <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(recovery.potentialRecoveryValue)}
                  </span>
                </div>
                
                <div className="bg-red-50/50 dark:bg-red-950/15 border border-red-100/60 dark:border-red-900/25 p-3 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-0.5">Projected Write-off</span>
                  <span className="text-xl font-bold font-mono text-red-700 dark:text-red-300">
                    {formatCurrency(recovery.potentialLoss)}
                  </span>
                </div>
              </div>

              {/* Progress Slider Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Recovery Progress</span>
                  <span>{recovery.recoveryPercentage}% Clawed back</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${recovery.recoveryPercentage}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {recovery && (
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest mb-1">RECOMMENDED ESCALATION</span>
              <p className="text-[11px] leading-tight text-slate-600 dark:text-slate-300 font-medium">
                {recovery.recommendations[0]}
              </p>
            </div>
          )}
        </div>

        {/* C. INVENTORY CAPITAL ASSETS ANALYTICS */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Capital Breakdown</h3>
              <p className="text-xs text-slate-400">Total drug cost vs valuation margins</p>
            </div>
            <DollarSign className="h-4.5 w-4.5 text-blue-500 shrink-0" />
          </div>

          {analytics && (
            <div className="py-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 dark:bg-slate-950/40 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Cost</span>
                <span className="text-sm font-bold font-mono tracking-tight block">
                  {formatCurrency(analytics.inventoryCost)}
                </span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/40 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sale Value</span>
                <span className="text-sm font-bold font-mono tracking-tight block">
                  {formatCurrency(analytics.inventorySellingValue)}
                </span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/40 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MRP Value</span>
                <span className="text-sm font-bold font-mono tracking-tight block">
                  {formatCurrency(analytics.inventoryMrpValue)}
                </span>
              </div>
            </div>
          )}

          {analytics && (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Net Profit Margin (Est):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  +{formatCurrency(analytics.potentialProfit)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Waste Projection Deficit:</span>
                <span className="text-red-500 font-bold font-mono">
                  -{formatCurrency(analytics.potentialLoss)}
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 4. REAL-TIME INTERACTIVE ANALYTIC VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: INVENTORY VALUE TREND AREA */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 dark:border-slate-800/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Inventory Valuation Trend</h3>
              <p className="text-xs text-slate-400">Total cost assets vs simulated deadstock loss</p>
            </div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">
              Real-time Analytics
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inventoryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGradUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.10}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(value) => [formatCurrency(parseFloat(value as string))]} contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#1e293b' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Area name="Capital Valuation" type="monotone" dataKey="Value" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#valGradUp)" />
                <Area name="Estimated Waste Write-offs" type="monotone" dataKey="Loss" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#lossGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: DONUT CATEGORY CAPITAL SHARE */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 dark:border-slate-800/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Category Allocation</h3>
              <p className="text-xs text-slate-400">Inventory cost value by therapeutic class</p>
            </div>
          </div>
          
          <div className="h-44 w-full relative flex justify-center items-center">
            {categoryShare.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryShare}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="costValue"
                  >
                    {categoryShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(parseFloat(v as string)), 'Allocated Cost']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">No categories allocated.</span>
            )}
          </div>
          
          {/* Detailed list split */}
          <div className="mt-2 space-y-2 text-xs border-t border-slate-50 dark:border-slate-800/80 pt-3.5">
            {categoryShare.slice(0, 4).map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-500">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="truncate font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">${cat.costValue.toFixed(0)}</span>
                  <span className="text-[10px] text-slate-400">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. MULTI-MODULE OPERATIONAL WORKSPACES (TABS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 gap-4">
          <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-950/60 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('expiry')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'expiry' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'}`}
            >
              Expiry Intelligence Bins
            </button>
            <button
              onClick={() => setActiveTab('deadstock')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'deadstock' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'}`}
            >
              Dead &amp; Slow Stocks
            </button>
            <button
              onClick={() => setActiveTab('lowstock')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'lowstock' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'}`}
            >
              Low Stock Replenishment
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
            <span>Interactive Simulated Operations</span>
          </div>
        </div>

        {/* Tab 1: Expiry bins timeline */}
        {activeTab === 'expiry' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {expiryTimeline.map((group) => (
                <div key={group.id} className="border border-slate-100 dark:border-slate-800/80 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col justify-between min-h-[120px]">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{group.name}</span>
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: group.color }}></span>
                  </div>
                  <div className="my-2">
                    <p className="text-2xl font-black font-mono leading-none tracking-tight">
                      {group.count} <span className="text-xs font-semibold text-slate-400">Batches</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Exposure Value: <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(group.totalValue)}</span>
                    </p>
                  </div>
                  {group.id === 'expired' && group.count > 0 ? (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-100/50 dark:bg-red-950/30 px-2 py-0.5 rounded-sm block text-center uppercase tracking-wide">Needs Disposal</span>
                  ) : group.id === 'd30' && group.count > 0 ? (
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-100/50 dark:bg-orange-950/30 px-2 py-0.5 rounded-sm block text-center uppercase tracking-wide">Apply Flash Discount</span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">Monitor closely</span>
                  )}
                </div>
              ))}
            </div>

            <div className="border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden">
              <div className="bg-slate-50/60 dark:bg-slate-950/25 px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 tracking-wider">
                EXPIRED OR CRITICAL BATCH ITEMS DETAIL
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 text-slate-400 font-semibold">
                      <th className="px-6 py-3">Medicine</th>
                      <th className="px-6 py-3">Batch Number</th>
                      <th className="px-6 py-3">Expiry Date</th>
                      <th className="px-6 py-3">In-Stock Qty</th>
                      <th className="px-6 py-3">Capital Exp</th>
                      <th className="px-6 py-3">Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {batches.filter(b => b.status === 'Expired' || b.status === 'Expiring').map((b) => {
                      const med = medicines.find(m => m.id === b.medicineId);
                      const isExpired = b.status === 'Expired';
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                          <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">{med ? med.name : 'Unknown'}</td>
                          <td className="px-6 py-3.5 font-mono text-slate-500">{b.batchNumber}</td>
                          <td className="px-6 py-3.5">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span className={isExpired ? 'text-red-600 font-semibold' : 'text-slate-600'}>{b.expiryDate}</span>
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500">{b.quantity} units</td>
                          <td className="px-6 py-3.5 font-bold font-mono text-slate-700 dark:text-slate-300">{formatCurrency(b.quantity * b.purchasePrice)}</td>
                          <td className="px-6 py-3.5">
                            {isExpired ? (
                              <button 
                                onClick={() => navigate('/batches')}
                                className="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40 text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                Supplier Return
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApplyDiscount(b.id)}
                                className="px-2.5 py-1 rounded bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Flame className="h-3 w-3" />
                                <span>Clearance (35%)</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dead and Slow Stock list */}
        {activeTab === 'deadstock' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/55 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Dead &amp; Slow-Moving Criteria</h4>
                <p className="text-xs text-slate-500 leading-normal mt-1 max-w-3xl">
                  Dead stock represents fully expired assets (100% loss) or inventory remaining stagnant with zero registered sales for over 90 days. Slow-moving stock detects items with low velocity relative to expirations, calculating recovery probability.
                </p>
              </div>
              <div className="shrink-0 font-mono text-xs bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-bold">
                Total Dead Assets: {formatCurrency(deadStockValue)}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Dead Stock list */}
              <div className="border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden">
                <div className="bg-slate-100/50 dark:bg-slate-950/40 px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold flex justify-between items-center text-slate-500">
                  <span>DEAD STOCK DETECTED ({deadStock.length})</span>
                  <span className="text-[10px] text-red-500 uppercase tracking-widest font-black">HIGH LOSS RISK</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[350px] overflow-y-auto">
                  {deadStock.length > 0 ? (
                    deadStock.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-all flex flex-col justify-between gap-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.medicineName}</p>
                            <p className="text-[11px] text-slate-400">Batch {item.batchNumber} • idle for {item.daysSinceLastMovement} days</p>
                          </div>
                          <span className="font-bold font-mono text-red-600 dark:text-red-400">Loss: {formatCurrency(item.estimatedLoss)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Asset Value: {formatCurrency(item.value)}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {item.recoverySuggestion}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-8 text-center text-slate-400 text-xs">No dead stock detected under current parameters.</p>
                  )}
                </div>
              </div>

              {/* Slow Moving list */}
              <div className="border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden">
                <div className="bg-slate-100/50 dark:bg-slate-950/40 px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold flex justify-between items-center text-slate-500">
                  <span>SLOW MOVING DETECTED ({slowMoving.length})</span>
                  <span className="text-[10px] text-blue-500 uppercase tracking-widest font-black">LOW VELOCITY</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[350px] overflow-y-auto">
                  {slowMoving.length > 0 ? (
                    slowMoving.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-all flex flex-col justify-between gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.medicineName}</p>
                            <p className="text-[11px] text-slate-400">Batch {item.batchNumber} • Last sales move: {item.daysSinceLastMovement} days ago</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-500 block">Recovery Prob</span>
                            <span className={`text-sm font-bold ${item.recoveryProbability > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{item.recoveryProbability}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Remaining Shelf Life: {item.remainingShelfLifeDays} days</span>
                          <button
                            onClick={() => handleApplyDiscount(item.id)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Trigger Promo Sale</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-8 text-center text-slate-400 text-xs">No slow moving stock detected currently.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Low stock replenishment */}
        {activeTab === 'lowstock' && (
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">REORDER RECONSTRUCTION ALGORITHM ACTIVE</h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-normal mt-0.5">
                  The system automatically calculates deficit margins based on safety stock thresholds. Click "Quick Reorder Restock" to dispatch a simulated purchasing movement, updating the shelves in real-time.
                </p>
              </div>
            </div>

            <div className="border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3">Medicine Name</th>
                    <th className="px-6 py-3">Current Stock</th>
                    <th className="px-6 py-3">Min Safety Stock</th>
                    <th className="px-6 py-3">Deficit</th>
                    <th className="px-6 py-3">Primary Supplier</th>
                    <th className="px-6 py-3">Suggested Order</th>
                    <th className="px-6 py-3">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lowStock.length > 0 ? (
                    lowStock.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-all">
                        <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">{item.medicineName}</td>
                        <td className="px-6 py-3.5 text-red-500 font-bold font-mono">{item.currentStock} units</td>
                        <td className="px-6 py-3.5 text-slate-500">{item.minimumStock} units</td>
                        <td className="px-6 py-3.5 font-bold text-slate-500 font-mono">-{item.minimumStock - item.currentStock} units</td>
                        <td className="px-6 py-3.5 text-slate-500 truncate max-w-44">{item.supplierName}</td>
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-bold font-mono">+{item.recommendedReorderQty} units</td>
                        <td className="px-6 py-3.5">
                          <button
                            onClick={() => handleQuickReorder(item.id, item.recommendedReorderQty)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40 rounded text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span>Dispatch Restock</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Outstanding! All registered medicines are safely above minimum thresholds.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* 6. SMART AI STRATEGIC SUGGESTIONS & DYNAMIC ALERTS BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RECOMMENDATION BLOCK (Col-span-2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Cognitive Action Items</h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Dynamic</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {recommendations.slice(0, 5).map((rec, idx) => (
              <div key={rec.id || idx} className="border border-slate-100 dark:border-slate-800/80 rounded-lg p-3.5 bg-slate-50/50 dark:bg-slate-950/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      rec.priority === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' :
                      rec.priority === 'medium' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {rec.priority} Priority
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{rec.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">{rec.description}</p>
                </div>
                <div className="shrink-0 flex items-center md:flex-col items-end gap-3 md:gap-1 text-right w-full md:w-auto border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-2.5 md:pt-0">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">{rec.impactLabel}</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(rec.impactValue)}
                    </span>
                  </div>
                  
                  {rec.type === 'discount' && rec.batchNumber && (
                    <button
                      onClick={() => {
                        const targetBatch = batches.find(b => b.batchNumber === rec.batchNumber);
                        if (targetBatch) handleApplyDiscount(targetBatch.id);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-md shadow-xs shrink-0 cursor-pointer transition-colors"
                    >
                      Apply Clear
                    </button>
                  )}
                  {rec.type === 'reorder' && rec.medicineId && (
                    <button
                      onClick={() => handleQuickReorder(rec.medicineId!, rec.impactValue > 500 ? 100 : 50)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-md shadow-xs shrink-0 cursor-pointer transition-colors"
                    >
                      Quick Reorder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT INTELLIGENCE ALERTS & NOTIFICATIONS */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-blue-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Cognitive Alert Feed</h3>
            </div>
           <button
              onClick={async () => {
                try {
                  await db.markAllNotificationsRead();
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                } catch (err) {
                  console.error('Failed to mark notifications as read', err);
                }
              }}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold tracking-tight cursor-pointer"
            >
              Mark all read
            </button>
          </div>

          <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1 flex-1">
            {notifications.slice(0, 6).map((notif) => {
              const isRead = notif.read;
              return (
                <div key={notif.id} className={`p-3 rounded-lg border text-xs flex gap-2.5 transition-all ${
                  isRead 
                    ? 'border-slate-100 bg-slate-50/20 dark:border-slate-800 text-slate-500' 
                    : 'border-blue-100 bg-blue-50/20 dark:border-blue-900/10 dark:border-blue-900/30 text-slate-700 dark:text-slate-200 font-medium'
                }`}>
                  <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
                    notif.type === 'expiry' ? 'bg-red-500' : notif.type === 'low_stock' ? 'bg-amber-500' : notif.type === 'exchange_request' ? 'bg-blue-500' : notif.type === 'exchange_match' ? 'bg-emerald-500' : 'bg-slate-500'
                  }`}></span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-slate-100 leading-snug">{notif.title}</p>
                    <p className="text-[11px] text-slate-500 leading-normal">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 block font-medium mt-1">
                      {new Date(notif.timestamp).toLocaleDateString('en-IN')} at {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })}
            {notifications.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-12">No registered cognitive alerts.</p>
            )}
          </div>
          
          <button 
            onClick={() => navigate('/batches')}
            className="w-full py-2 border border-slate-200 dark:border-slate-800 text-center text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 mt-4 cursor-pointer text-slate-600 dark:text-slate-400 transition-colors"
          >
            Manage Batch Records
          </button>
        </div>

      </div>

    </div>
  );
}
