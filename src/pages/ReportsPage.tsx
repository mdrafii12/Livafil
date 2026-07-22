import React, { useState, useEffect } from 'react';
import { 
  BarChart4, Calendar, Download, Filter, FileText, TrendingUp, 
  AlertTriangle, Boxes, Truck, ArrowRight, Table, Search,
  Activity, ShieldAlert, CheckCircle, Percent, Printer, FileSpreadsheet, Send, Check, AlertCircle
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { useAuth } from '../contexts/AuthContext';
import { Medicine, Batch, Category, Supplier, Movement } from '../types';
import { IntelligenceService } from '../services/intelligence';
import { formatCurrency } from '../utils/currency';

type ReportType = 'health' | 'recovery' | 'expiry' | 'deadstock' | 'risk';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('health');
  
  // Database States
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { profile } = useAuth();
  const [myPharmacy, setMyPharmacy] = useState<any>(null);
  
  // Toast Helper
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

useEffect(() => {
    const loadData = async () => {
      if (!profile?.pharmacy_id) return;
      try {
        const [meds, bts, cats, sups, movs, pharmacy] = await Promise.all([
          db.getMedicines(),
          db.getBatches(),
          db.getCategories(),
          db.getSuppliers(),
          db.getMovements(),
          db.getMyPharmacy(profile.pharmacy_id),
        ]);
        setMedicines(meds);
        setBatches(bts);
        setCategories(cats);
        setSuppliers(sups);
        setMovements(movs);
        setMyPharmacy(pharmacy);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [profile?.pharmacy_id]);

  // Compute live intelligence states using unified service
  const healthScore = IntelligenceService.getInventoryHealth(batches, medicines);
  const recoveryMetrics = IntelligenceService.getRecoveryMetrics(batches);
  const expiryTimeline = IntelligenceService.getExpiryTimeline(batches, medicines);
  const deadStockItems = IntelligenceService.getDeadStock(batches, movements, medicines);
  const slowMovingItems = IntelligenceService.getSlowMoving(batches, movements, medicines);
  const lowStockItems = IntelligenceService.getLowStock(batches, medicines, suppliers);
  const valueAnalytics = IntelligenceService.getInventoryValueAnalytics(batches, categories, medicines, suppliers);
  // Filter rows based on search and selected categories/suppliers
  const filterByCommonParams = (list: any[], medicineIdKey: string = 'medicineId') => {
    return list.filter(item => {
      // Find medicine
      const medId = item[medicineIdKey] || item.id;
      const med = medicines.find(m => m.id === medId);
      if (!med) return true;

      const matchesCategory = selectedCategory === 'all' || med.categoryId === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  };

  // Compile active report data list
  const getActiveReportData = () => {
    switch (activeReport) {
      case 'health':
        // Show low stock and out of stock medicines
        return filterByCommonParams(lowStockItems, 'id');
      
      case 'recovery':
        // Batches expiring soon with pricing and recovery value
        const nearExpiry = batches.filter(b => b.status === 'Expiring' || b.status === 'Expired');
        return filterByCommonParams(nearExpiry.map(b => {
          const med = medicines.find(m => m.id === b.medicineId);
          return {
            ...b,
            medicineName: med ? med.name : 'Unknown',
            onHandValue: b.quantity * b.purchasePrice,
            potentialRecovery: b.status === 'Expired' ? (b.quantity * b.purchasePrice * 0.20) : (b.quantity * b.purchasePrice * 0.65),
            depreciationLoss: b.status === 'Expired' ? (b.quantity * b.purchasePrice * 0.80) : (b.quantity * b.purchasePrice * 0.35)
          };
        }));

      case 'expiry':
        // Expiring timeline bins representation
        const allActiveBatches = batches.filter(b => b.quantity > 0);
        return filterByCommonParams(allActiveBatches.map(b => {
          const med = medicines.find(m => m.id === b.medicineId);
          const daysRemaining = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return {
            ...b,
            medicineName: med ? med.name : 'Unknown',
            daysRemaining,
            exposureValue: b.quantity * b.purchasePrice
          };
        })).sort((a, b) => a.daysRemaining - b.daysRemaining);

      case 'deadstock':
        // Stagnant dead & slow moving medicines list
        return filterByCommonParams(deadStockItems, 'medicineId');

      case 'risk':
        // Cross references low stock, short shelf life, and high value risks
        return filterByCommonParams(batches.filter(b => b.quantity > 0).map(b => {
          const med = medicines.find(m => m.id === b.medicineId);
          const daysRemaining = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          let riskRating = 'Low';
          let riskBg = 'bg-emerald-50 text-emerald-700';
          if (daysRemaining <= 30 || b.quantity === 0) {
            riskRating = 'CRITICAL';
            riskBg = 'bg-red-50 text-red-700 border-red-200';
          } else if (daysRemaining <= 90 || b.quantity < b.minimumStock) {
            riskRating = 'High';
            riskBg = 'bg-orange-50 text-orange-700 border-orange-200';
          } else if (daysRemaining <= 180) {
            riskRating = 'Medium';
            riskBg = 'bg-blue-50 text-blue-700 border-blue-200';
          }

          return {
            ...b,
            medicineName: med ? med.name : 'Unknown',
            daysRemaining,
            exposure: b.quantity * b.purchasePrice,
            riskRating,
            riskBg
          };
        })).sort((a, b) => {
          if (a.riskRating === 'CRITICAL' && b.riskRating !== 'CRITICAL') return -1;
          if (b.riskRating === 'CRITICAL' && a.riskRating !== 'CRITICAL') return 1;
          return a.daysRemaining - b.daysRemaining;
        });

      default:
        return [];
    }
  };

  const handleSendPO = async (r: any) => {
    if (!r.supplierPhone || !r.supplierId || !profile?.pharmacy_id) {
      showToast('error', 'Supplier phone missing or not properly assigned.');
      return;
    }
    
    const pharmacyName = myPharmacy?.name || 'LIVAFIL Pharmacy';
    
    // Generate text message for WhatsApp
    const message = `*PURCHASE ORDER*\nFrom: ${pharmacyName}\n\nHi ${r.supplierName},\nPlease arrange the following order:\n\n*Medicine:* ${r.medicineName}\n*Quantity Required:* ${r.recommendedReorderQty} units\n\nPlease confirm availability and delivery time.\n\nThanks,\n${pharmacyName}`;
    
    sendWhatsAppMessage(r.supplierPhone, message);
    
    try {
      await db.addPurchaseOrder(profile.pharmacy_id, {
        medicineId: r.id,
        supplierId: r.supplierId,
        quantity: r.recommendedReorderQty,
        status: 'Sent'
      });
      window.open(waUrl, '_blank');
      showToast('success', `Purchase order logged and sent to ${r.supplierName}`);
    } catch (err: any) {
      showToast('error', `Failed to create PO: ${err.message}`);
    }
  };

  const reportData = getActiveReportData();

  // EXPORT 1: CSV FORMAT
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeReport === 'health') {
      headers = ['Drug Name', 'Current Stock Qty', 'Safety Limit Threshold', 'Recommended Reorder Quantity', 'Contact Supplier'];
      rows = reportData.map(r => [r.medicineName, r.currentStock, r.minimumStock, r.recommendedReorderQty, r.supplierName]);
    } else if (activeReport === 'recovery') {
      headers = ['Batch Number', 'Medicine Brand', 'Expiry Date', 'Status', 'Cost Value', 'Salvage Recovery Value', 'Estimated Waste Loss'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.expiryDate, r.status, formatCurrency(r.onHandValue), formatCurrency(r.potentialRecovery), formatCurrency(r.depreciationLoss)]);
    } else if (activeReport === 'expiry') {
      headers = ['Batch Number', 'Medicine Name', 'Expiry Date', 'Days Remaining', 'Shelf Quantity', 'Loss Capital Exposure'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.expiryDate, r.daysRemaining, r.quantity, formatCurrency(r.exposureValue)]);
    } else if (activeReport === 'deadstock') {
      headers = ['Batch Number', 'Medicine Brand', 'Quantity', 'Stock Cost Value', 'Inactive Days Count', 'Suggested Action Plan'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.quantity, formatCurrency(r.value), r.daysSinceLastMovement, r.recoverySuggestion]);
    } else if (activeReport === 'risk') {
      headers = ['Batch Number', 'Medicine Brand', 'Current Stock', 'Safety Threshold', 'Remaining Shelf Days', 'Capital Exposure', 'Calculated Risk Level'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.quantity, r.minimumStock, r.daysRemaining, formatCurrency(r.exposure), r.riskRating]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    triggerDownload(csvContent, 'text/csv;charset=utf-8;', `medguard_intelligence_${activeReport}_report.csv`);
  };

  // EXPORT 2: EXCEL FORMAT (Tab-separated structured sheet)
  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeReport === 'health') {
      headers = ['Drug Name', 'Current Stock Qty', 'Safety Limit Threshold', 'Recommended Reorder Quantity', 'Contact Supplier'];
      rows = reportData.map(r => [r.medicineName, r.currentStock, r.minimumStock, r.recommendedReorderQty, r.supplierName]);
    } else if (activeReport === 'recovery') {
      headers = ['Batch Number', 'Medicine Brand', 'Expiry Date', 'Status', 'Cost Value', 'Salvage Recovery Value', 'Estimated Waste Loss'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.expiryDate, r.status, r.onHandValue, r.potentialRecovery, r.depreciationLoss]);
    } else if (activeReport === 'expiry') {
      headers = ['Batch Number', 'Medicine Name', 'Expiry Date', 'Days Remaining', 'Shelf Quantity', 'Loss Capital Exposure'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.expiryDate, r.daysRemaining, r.quantity, r.exposureValue]);
    } else if (activeReport === 'deadstock') {
      headers = ['Batch Number', 'Medicine Brand', 'Quantity', 'Stock Cost Value', 'Inactive Days Count', 'Suggested Action Plan'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.quantity, r.value, r.daysSinceLastMovement, r.recoverySuggestion]);
    } else if (activeReport === 'risk') {
      headers = ['Batch Number', 'Medicine Brand', 'Current Stock', 'Safety Threshold', 'Remaining Shelf Days', 'Capital Exposure', 'Calculated Risk Level'];
      rows = reportData.map(r => [r.batchNumber, r.medicineName, r.quantity, r.minimumStock, r.daysRemaining, r.exposure, r.riskRating]);
    }

    // TSV is flawlessly opened in Excel as beautiful spreadsheet grids
    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    triggerDownload(tsvContent, 'application/vnd.ms-excel;charset=utf-8;', `medguard_intelligence_${activeReport}_spreadsheet.xls`);
  };

  // EXPORT 3: FORMAL AUDIT PDF (Plain-Text structured summary designed to be clean)
 const handleExportPDF = () => {
    const pharma = myPharmacy;
    let text = `========================================================\n`;
    text += `             LIVAFIL PHARMACY LOSS AUDIT SHEET\n`;
    text += `========================================================\n`;
    text += `Pharmacy: ${pharma?.name || 'Pharmacy Audit'}\n`;
    text += `GSTIN: ${pharma?.gst || 'N/A'}\n`;
    text += `Date Run: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString()}\n`;
    text += `Report Run: ${activeReport.toUpperCase()} INTEL REPORT\n`;
    text += `--------------------------------------------------------\n`;
    text += `Shelf Health Rating: ${healthScore.score}/100 [${healthScore.rating}]\n`;
    text += `Total On-Hand Valuation: ${formatCurrency(valueAnalytics?.inventoryCost || 0)}\n`;
    text += `Total Salvage Recovery: ${formatCurrency(recoveryMetrics.potentialRecoveryValue)}\n`;
    text += `Potential Loss Write-offs: ${formatCurrency(recoveryMetrics.potentialLoss)}\n`;
    text += `--------------------------------------------------------\n\n`;

    if (activeReport === 'health') {
      text += `CRITICAL REPLENISHMENT REQUIRED ITEMS:\n\n`;
      reportData.forEach((r, idx) => {
        text += `${idx + 1}. Medicine: ${r.medicineName}\n`;
        text += `   Current Stock: ${r.currentStock} (Threshold: ${r.minimumStock})\n`;
        text += `   Suggested Reorder Qty: ${r.recommendedReorderQty} units\n`;
        text += `   Sourced Supplier: ${r.supplierName}\n\n`;
      });
    } else if (activeReport === 'recovery') {
      text += `FINANCIAL SALVAGE CLEARANCE TARGETS:\n\n`;
      reportData.forEach((r, idx) => {
        text += `${idx + 1}. Batch ${r.batchNumber} - ${r.medicineName}\n`;
        text += `   Expiry Date: ${r.expiryDate} (${r.status})\n`;
        text += `   On Hand Cost: ${formatCurrency(r.onHandValue)}\n`;
        text += `   Salvage Recovery Potential (Clearance/Credit): ${formatCurrency(r.potentialRecovery)}\n`;
        text += `   Depreciation Deficit Risk: ${formatCurrency(r.depreciationLoss)}\n\n`;
      });
    } else if (activeReport === 'expiry') {
      text += `EXPIRY CHRONOLOGICAL TIMELINE LEDGER:\n\n`;
      reportData.forEach((r, idx) => {
        text += `${idx + 1}. Brand: ${r.medicineName} (Batch: ${r.batchNumber})\n`;
        text += `   Expiry Date: ${r.expiryDate} (${r.daysRemaining <= 0 ? 'EXPIRED' : `${r.daysRemaining} days left`})\n`;
        text += `   Shelf Quantity: ${r.quantity} units\n`;
        text += `   Financial Loss Exposure: ${formatCurrency(r.exposureValue)}\n\n`;
      });
    } else if (activeReport === 'deadstock') {
      text += `STAGNANT DEAD STOCK AUDIT:\n\n`;
      reportData.forEach((r, idx) => {
        text += `${idx + 1}. Batch ${r.batchNumber} - ${r.medicineName}\n`;
        text += `   On Hand Units: ${r.quantity} (Cost Value: ${formatCurrency(r.value)})\n`;
        text += `   Days Since Sales Movement: ${r.daysSinceLastMovement} days\n`;
        text += `   Suggested Action Plan: ${r.recoverySuggestion}\n\n`;
      });
    } else if (activeReport === 'risk') {
      text += `SHELF EXPOSURE RISK SCORECARD:\n\n`;
      reportData.forEach((r, idx) => {
        text += `${idx + 1}. Brand: ${r.medicineName} (Batch: ${r.batchNumber})\n`;
        text += `   Calculated Risk Level: ${r.riskRating}\n`;
        text += `   Current Count: ${r.quantity} (Threshold: ${r.minimumStock})\n`;
        text += `   Days to Expiry: ${r.daysRemaining} days (${r.expiryDate})\n`;
        text += `   Risk Capital Exposure: ${formatCurrency(r.exposure)}\n\n`;
      });
    }

    text += `========================================================\n`;
    text += `        END OF FORMAL PHARMACY AUDIT LEDGER REPORT\n`;
    text += `========================================================\n`;

    triggerDownload(text, 'text/plain;charset=utf-8;', `medguard_formal_audit_${activeReport}.txt`);
  };

  const triggerDownload = (content: string, type: string, filename: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get active report descriptive metadata
  const getReportMeta = () => {
    switch (activeReport) {
      case 'health':
        return {
          title: 'Inventory Health Audit',
          desc: 'Analyze safety stock deficits, completely exhausted lines, and overall therapeutic classification coverage.',
          metric1: 'Deficit Lines',
          val1: lowStockItems.length,
          metric2: 'Shelf Health Index',
          val2: `${healthScore.score}/100`
        };
      case 'recovery':
        return {
          title: 'Capital Recovery Audit',
          desc: 'Quantify write-off risk, active promo discount opportunities, and estimated partial supplier credits.',
          metric1: 'Salvageable Capital',
          val1: formatCurrency(recoveryMetrics.potentialRecoveryValue),
          metric2: 'Projected Loss Deficit',
          val2: formatCurrency(recoveryMetrics.potentialLoss)
        };
      case 'expiry':
        return {
          title: 'Expiry Intelligence Analysis',
          desc: 'A full chronological lookup mapping exact medicines to colored risk windows from 7 to 180 days.',
          metric1: 'Active Expiry Exposure',
          val1: formatCurrency(batches.filter(b => b.status === 'Expiring' || b.status === 'Expired').reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0)),
          metric2: 'Expiring/Expired Batches',
          val2: batches.filter(b => b.status === 'Expiring' || b.status === 'Expired').length
        };
      case 'deadstock':
        return {
          title: 'Dead Stock Detection Audit',
          desc: 'Isolate stock lines exhibiting high inventory count and no sales activity for longer than 60 days.',
          metric1: 'Dead Capital Locked',
          val1: formatCurrency(deadStockItems.reduce((sum, i) => sum + i.value, 0)),
          metric2: 'Stagnant Batch Codes',
          val2: deadStockItems.length
        };
      case 'risk':
        return {
          title: 'Composite Risk Scorecard',
          desc: 'Our intelligent cross-referencing model ranking every batch from Low to Critical risk levels.',
          metric1: 'Critical/High Risk Items',
          val1: reportData.filter((r: any) => r.riskRating === 'CRITICAL' || r.riskRating === 'High').length,
          metric2: 'Aggregate Exposure',
          val2: formatCurrency(reportData.reduce((sum: number, r: any) => sum + r.exposure, 0))
        };
    }
  };

  const meta = getReportMeta();

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            Cognitive Audit &amp; Intelligence Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Execute professional loss analysis, export safety audits, and isolate risk exposures instantly.
          </p>
        </div>
        
        {/* EXPORTS TRIGGER MENU */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button 
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            title="Download Comma Separated CSV Spreadsheet"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>CSV</span>
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            title="Download Excel Compatible Spreadsheet File"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Excel</span>
          </button>

          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer transition-all"
            title="Export Legal Audit Sheet in Plain Text PDF Format"
          >
            <Printer className="h-4 w-4" />
            <span>Formal Audit (PDF)</span>
          </button>
        </div>
      </div>

      {/* SUMMARY METRICS PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{meta.metric1}</p>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{meta.val1}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{meta.metric2}</p>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{meta.val2}</p>
        </div>
      </div>

      {/* INTELLIGENCE TABS NAVIGATION */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-px scrollbar-none gap-2">
        <button
          onClick={() => setActiveReport('health')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 shrink-0 transition-all cursor-pointer ${
            activeReport === 'health' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Inventory Health Report
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-bold border-b-2 shrink-0 transition-all cursor-pointer ${
            activeReport === 'recovery' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveReport('recovery')}
        >
          Recovery Report
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-bold border-b-2 shrink-0 transition-all cursor-pointer ${
            activeReport === 'expiry' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveReport('expiry')}
        >
          Expiry Report
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-bold border-b-2 shrink-0 transition-all cursor-pointer ${
            activeReport === 'deadstock' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveReport('deadstock')}
        >
          Dead Stock Report
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-bold border-b-2 shrink-0 transition-all cursor-pointer ${
            activeReport === 'risk' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveReport('risk')}
        >
          Inventory Risk Report
        </button>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        
        {/* Left Side: Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search brand, batch code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Right Side: Category selection */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-[180px] focus:outline-none"
          >
            <option value="all">All Classifications</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <div className="text-[10px] font-bold text-slate-400 italic bg-slate-50 dark:bg-slate-800 px-2.5 py-2 rounded-lg">
            {reportData.length} lines loaded
          </div>
        </div>
      </div>

      {/* DYNAMIC AUDIT DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{meta.title}</h3>
          </div>
          <p className="text-[11px] text-slate-400 max-w-lg text-right hidden lg:block font-medium">{meta.desc}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            {/* HEALTH REPORT TABLE */}
            {activeReport === 'health' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-5">Medicine Brand</th>
                    <th className="py-3 px-5">Current Stock Level</th>
                    <th className="py-3 px-5">Min safety Threshold</th>
                    <th className="py-3 px-5">Safety Margin deficit</th>
                    <th className="py-3 px-5">Suggested Reorder</th>
                    <th className="py-3 px-5">Assigned Supplier</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {reportData.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{r.medicineName}</td>
                      <td className="py-3.5 px-5 text-red-500 font-bold font-mono">{r.currentStock} units</td>
                      <td className="py-3.5 px-5 text-slate-400 font-mono">{r.minimumStock} units</td>
                      <td className="py-3.5 px-5 font-bold text-slate-500 font-mono">-{r.minimumStock - r.currentStock} units</td>
                      <td className="py-3.5 px-5 text-blue-600 dark:text-blue-400 font-bold font-mono">+{r.recommendedReorderQty} units</td>
                      <td className="py-3.5 px-5 text-slate-500 font-medium">{r.supplierName}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button 
                          onClick={() => handleSendPO(r)}
                          disabled={!r.supplierId || !r.supplierPhone}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* RECOVERY REPORT TABLE */}
            {activeReport === 'recovery' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-5">Batch Code</th>
                    <th className="py-3 px-5">Medicine Brand</th>
                    <th className="py-3 px-5">Expiration date</th>
                    <th className="py-3 px-5">Status state</th>
                    <th className="py-3 px-5">Shelf Asset Cost</th>
                    <th className="py-3 px-5">Clawback Recovery Potential</th>
                    <th className="py-3 px-5">Estimated Net Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {reportData.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">{r.batchNumber}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{r.medicineName}</td>
                      <td className="py-3.5 px-5 text-slate-500">{r.expiryDate}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.status === 'Expired' ? 'bg-red-50 text-red-700 dark:bg-red-950/20' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/20'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(r.onHandValue)}</td>
                      <td className="py-3.5 px-5 font-bold text-emerald-600 font-mono">+{formatCurrency(r.potentialRecovery)}</td>
                      <td className="py-3.5 px-5 font-bold text-red-500 font-mono">-{formatCurrency(r.depreciationLoss)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* EXPIRY REPORT TABLE */}
            {activeReport === 'expiry' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-5">Batch Number</th>
                    <th className="py-3 px-5">Medicine Name</th>
                    <th className="py-3 px-5">Expiration Date</th>
                    <th className="py-3 px-5">Remaining Days</th>
                    <th className="py-3 px-5">Shelf Quantity</th>
                    <th className="py-3 px-5">Loss Exposure Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {reportData.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500">{r.batchNumber}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{r.medicineName}</td>
                      <td className="py-3.5 px-5 text-slate-500">{r.expiryDate}</td>
                      <td className="py-3.5 px-5 font-mono">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.daysRemaining <= 30 ? 'bg-red-50 text-red-700 dark:bg-red-950/20' : 
                          r.daysRemaining <= 90 ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20' : 
                          'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                        }`}>
                          {r.daysRemaining <= 0 ? 'ALREADY EXPIRED' : `${r.daysRemaining} days remaining`}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-medium">{r.quantity} units</td>
                      <td className="py-3.5 px-5 font-bold text-red-500 font-mono">{formatCurrency(r.exposureValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* DEAD STOCK REPORT TABLE */}
            {activeReport === 'deadstock' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-5">Batch Code</th>
                    <th className="py-3 px-5">Medicine Brand</th>
                    <th className="py-3 px-5">In Stock Qty</th>
                    <th className="py-3 px-5">Total Asset Cost</th>
                    <th className="py-3 px-5">Days Stagnant</th>
                    <th className="py-3 px-5">Expiration Date</th>
                    <th className="py-3 px-5">Clearing Action Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {reportData.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">{r.batchNumber}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{r.medicineName}</td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 font-mono">{r.quantity} units</td>
                      <td className="py-3.5 px-5 font-bold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(r.value)}</td>
                      <td className="py-3.5 px-5 font-bold text-red-500 font-mono">{r.daysSinceLastMovement} days stagnant</td>
                      <td className="py-3.5 px-5 text-slate-400">{r.expiryDate}</td>
                      <td className="py-3.5 px-5 font-semibold text-slate-500 italic max-w-xs truncate">{r.recoverySuggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* composite RISK REPORT TABLE */}
            {activeReport === 'risk' && (
              <>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-5">Batch Number</th>
                    <th className="py-3 px-5">Medicine Brand</th>
                    <th className="py-3 px-5">Current Stock</th>
                    <th className="py-3 px-5">Remaining Days</th>
                    <th className="py-3 px-5">Capital At Risk</th>
                    <th className="py-3 px-5">Calculated Risk Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {reportData.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">{r.batchNumber}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{r.medicineName}</td>
                      <td className="py-3.5 px-5 font-medium">{r.quantity} units</td>
                      <td className="py-3.5 px-5 font-mono">{r.daysRemaining <= 0 ? '0' : r.daysRemaining} days</td>
                      <td className="py-3.5 px-5 font-extrabold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(r.exposure)}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${r.riskBg}`}>
                          {r.riskRating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>

      {/* Empty States */}
      {reportData.length === 0 && (
        <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <FileText className="h-9 w-9 text-slate-300" />
          <span className="font-medium">No ledger audit lines matched current criteria.</span>
        </div>
      )}

      {/* Toast Notification Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slideUp">
          <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg ${
            toastMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/90 dark:text-red-300 dark:border-red-800'
          }`}>
            {toastMsg.type === 'success' ? <Check className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            <span className="text-sm font-medium">{toastMsg.text}</span>
          </div>
        </div>
      )}

    </div>
  );
}
