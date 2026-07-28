import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Search, Plus, FileText, CheckCircle2, Clock, 
  Printer, Download, Filter, UserCheck, AlertTriangle, Sparkles, ChevronRight, Activity 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as db from '../services/supabaseData';
import { LabReport, LabTestMaster, Patient, LabReportParameterResult, LabReportStatus } from '../types';
import { formatCurrency } from '../utils/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LabReportsPage() {
  const { profile } = useAuth();

  // Data States
  const [reports, setReports] = useState<LabReport[]>([]);
  const [labTests, setLabTests] = useState<LabTestMaster[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<'reports' | 'catalogue'>('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [newTestModalOpen, setNewTestModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<LabReport | null>(null);

  // Order New Lab Form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. A. K. Sharma (MBBS, MD)');

  // Result Entry Form State
  const [editingResults, setEditingResults] = useState<LabReportParameterResult[]>([]);
  const [techNotes, setTechNotes] = useState('');
  const [techName, setTechName] = useState('Senior Pathology Tech');

  // New Test Master Form
  const [newTestForm, setNewTestForm] = useState({
    code: '',
    name: '',
    category: 'Biochemistry',
    sampleType: 'Blood',
    price: 300,
    normalRange: 'Normal',
    unit: 'mg/dL',
    description: ''
  });

  const [myPharmacy, setMyPharmacy] = useState<import('../types').Pharmacy | null>(null);

  useEffect(() => {
    if (profile?.pharmacy_id) {
      loadLabData();
    }
  }, [profile]);

  const loadLabData = async () => {
    if (!profile?.pharmacy_id) return;
    setLoading(true);
    try {
      const [rData, tData, pData, pharm] = await Promise.all([
        db.getLabReports(profile.pharmacy_id),
        db.getLabTestsMaster(profile.pharmacy_id),
        db.getPatients(profile.pharmacy_id),
        db.getMyPharmacy(profile.pharmacy_id).catch(() => null)
      ]);
      setReports(rData);
      setLabTests(tData);
      setPatients(pData);
      if (pharm) setMyPharmacy(pharm);
    } catch (err) {
      console.error('Failed to load lab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Create New Lab Test Order
  const handleCreateLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id) return;
    const patient = patients.find(p => p.id === selectedPatientId);
    const test = labTests.find(t => t.id === selectedTestId);

    if (!patient || !test) {
      showToast('error', 'Please select both a patient and a lab test.');
      return;
    }

    try {
      const initialResults: LabReportParameterResult[] = (test.parameters || []).map(p => ({
        parameterName: p.name,
        observedValue: p.defaultValue || '',
        unit: p.unit,
        normalRange: p.normalRange,
        flag: 'Normal'
      }));

      const created = await db.createLabReport(profile.pharmacy_id, {
        uhid: patient.uhid,
        patientName: patient.name,
        patientAge: patient.age,
        patientGender: patient.gender,
        patientPhone: patient.phone,
        doctorName,
        testId: test.id,
        testName: test.name,
        category: test.category,
        status: 'Ordered',
        results: initialResults,
        price: test.price
      });

      setReports(prev => [created, ...prev]);
      setOrderModalOpen(false);
      showToast('success', `Lab order ${created.reportNumber} created for ${patient.name}`);

      // Reset
      setSelectedPatientId('');
      setSelectedTestId('');
    } catch (err: any) {
      showToast('error', `Failed to create lab order: ${err.message}`);
    }
  };

  // 2. Open Result Entry Modal
  const openResultModal = (report: LabReport) => {
    setActiveReport(report);
    setEditingResults(report.results && report.results.length > 0 ? [...report.results] : [
      { parameterName: 'Primary Parameter', observedValue: '', unit: 'N/A', normalRange: 'Normal', flag: 'Normal' }
    ]);
    setTechNotes(report.technicianNotes || '');
    setTechName(report.labTechnicianName || 'Senior Lab Technologist');
    setResultModalOpen(true);
  };

  // 3. Save Lab Test Results
  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id || !activeReport) return;

    try {
      const updated = await db.updateLabReportResults(
        profile.pharmacy_id,
        activeReport.id,
        editingResults,
        techNotes,
        techName,
        'Completed'
      );

      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      setResultModalOpen(false);
      showToast('success', `Lab Report ${updated.reportNumber} updated & verified!`);
    } catch (err: any) {
      showToast('error', `Failed to update results: ${err.message}`);
    }
  };

  // 4. Add New Test to Master Catalogue
  const handleAddTestMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id) return;
    if (!newTestForm.name || !newTestForm.code) {
      showToast('error', 'Test Name and Test Code are required.');
      return;
    }

    try {
      const created = await db.addLabTestMaster(profile.pharmacy_id, {
        ...newTestForm,
        parameters: [
          { name: `${newTestForm.name} Result`, unit: newTestForm.unit, normalRange: newTestForm.normalRange }
        ]
      });

      setLabTests(prev => [created, ...prev]);
      setNewTestModalOpen(false);
      showToast('success', `Lab Test ${created.name} added to Master Catalogue.`);
      setNewTestForm({ code: '', name: '', category: 'Biochemistry', sampleType: 'Blood', price: 300, normalRange: 'Normal', unit: 'mg/dL', description: '' });
    } catch (err: any) {
      showToast('error', `Failed to add test: ${err.message}`);
    }
  };

  // 5. PDF Lab Report Generator
  const printLabPdfReport = (report: LabReport, action: 'print' | 'download') => {
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; // dark navy slate

    // Clinic Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');

    const hospitalName = (myPharmacy?.name || 'CLINICAL & PATHOLOGY DIAGNOSTICS').toUpperCase();
    const details = [
      myPharmacy?.address,
      myPharmacy?.phone ? `Ph: ${myPharmacy.phone}` : null,
      myPharmacy?.gst ? `GSTIN: ${myPharmacy.gst}` : null,
      myPharmacy?.licenseNumber ? `Lic: ${myPharmacy.licenseNumber}` : null
    ].filter(Boolean).join(' | ');
    const hospitalAddress = (details || 'NABL ACCREDITED LABORATORY SERVICES').toUpperCase();

    doc.text(hospitalName, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(hospitalAddress, 14, 21);

    // Report Title Right
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNOSTIC TEST REPORT', 196, 17, { align: 'right' });

    // Patient Information Grid Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 34, 182, 32, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    // Row 1
    doc.text(`Patient Name: ${report.patientName}`, 18, 42);
    doc.text(`UHID: ${report.uhid}`, 120, 42);

    // Row 2
    doc.setFont('helvetica', 'normal');
    doc.text(`Age / Gender: ${report.patientAge} Yrs / ${report.patientGender}`, 18, 50);
    doc.text(`Report No: ${report.reportNumber}`, 120, 50);

    // Row 3
    doc.text(`Ref. Doctor: ${report.doctorName}`, 18, 58);
    doc.text(`Date & Time: ${new Date(report.createdAt).toLocaleString()}`, 120, 58);

    // Test Name Banner
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(14, 72, 182, 12, 2, 2, 'FD');

    doc.setTextColor(29, 78, 216);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TEST NAME: ${report.testName.toUpperCase()} (${report.category})`, 18, 80);

    // Parameter Results Table
    const tableBody = (report.results || []).map(r => [
      r.parameterName,
      r.observedValue,
      r.unit,
      r.normalRange,
      r.flag
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['TEST PARAMETER', 'OBSERVED VALUE', 'UNIT', 'REFERENCE RANGE', 'FLAG']],
      body: tableBody,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'bold' },
        4: { fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'High' || val === 'Abnormal') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else if (val === 'Low') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
          } else {
            data.cell.styles.textColor = [16, 185, 129]; // Green
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    if (report.technicianNotes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Pathologist Comments / Impressions:', 14, finalY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(report.technicianNotes, 14, finalY + 6);
    }

    // Doctor & Technician Signatures
    const sigY = Math.max(finalY + 28, 250);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, sigY, 70, sigY);
    doc.line(140, sigY, 196, sigY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(report.labTechnicianName || 'Medical Lab Technologist', 14, sigY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Verified By Lab In-Charge', 14, sigY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Dr. S. K. Roy (MD, Pathologist)', 140, sigY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Chief Consultant Pathologist', 140, sigY + 10);

    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Lab_Report_${report.reportNumber}_${report.patientName.replace(/\s+/g, '_')}.pdf`);
    }
  };

  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = r.patientName.toLowerCase().includes(q) || r.uhid.toLowerCase().includes(q) || r.reportNumber.toLowerCase().includes(q) || r.testName.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 animate-bounce ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <CheckCircle2 className="w-4 h-4" /> {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase rounded-full tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Enterprise HMS Module
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-indigo-400" /> Laboratory & Diagnostic Reports System
          </h1>
          <p className="text-xs text-slate-300">
            Order tests, manage pathology results, flag abnormal parameters & print NABL-compliant Lab Reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setOrderModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Lab Test Order
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase">Total Lab Reports</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{reports.length}</div>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Pending Samples</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {reports.filter(r => r.status === 'Ordered' || r.status === 'Sample Collected').length}
          </div>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Completed Reports</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {reports.filter(r => r.status === 'Completed').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase">Available Lab Tests</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{labTests.length}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button 
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <FileText className="w-4 h-4" /> Lab Orders & Reports Queue
        </button>
        <button 
          onClick={() => setActiveTab('catalogue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'catalogue' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <FlaskConical className="w-4 h-4" /> Test Master Catalogue ({labTests.length})
        </button>
      </div>

      {/* TAB 1: REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Report #, UHID, Patient Name..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold dark:text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Ordered">Ordered</option>
                <option value="Sample Collected">Sample Collected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Report #</th>
                  <th className="p-3">UHID / Patient</th>
                  <th className="p-3">Ref. Doctor</th>
                  <th className="p-3">Test Ordered</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No lab reports found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.reportNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.patientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.uhid} • {r.patientGender}, {r.patientAge}y</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{r.doctorName}</td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{r.testName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded text-slate-700 dark:text-slate-300">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${r.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                          {r.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => openResultModal(r)}
                            className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <Activity className="w-3.5 h-3.5" /> Enter Results
                          </button>
                          {r.status === 'Completed' && (
                            <>
                              <button 
                                onClick={() => printLabPdfReport(r, 'print')}
                                className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => printLabPdfReport(r, 'download')}
                                className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEST MASTER CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-indigo-500" /> Hospital Diagnostic Test Catalogue
            </h3>
            <button 
              onClick={() => setNewTestModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Test Master
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labTests.map(t => (
              <div key={t.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">{t.code}</span>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{t.name}</h4>
                  </div>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(t.price)}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.description || 'Standard pathology test.'}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Sample: <strong className="text-slate-700 dark:text-slate-300">{t.sampleType}</strong></span>
                  <span>Category: <strong className="text-indigo-600 dark:text-indigo-400">{t.category}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ORDER NEW LAB TEST */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" /> Order Patient Lab Test
              </h3>
              <button onClick={() => setOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateLabOrder} className="space-y-3 text-xs">
              <div className="relative">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Search & Select Patient (Name, Phone or UHID)</label>
                <select 
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    const selectedP = patients.find(p => p.id === e.target.value);
                    if (selectedP) {
                      showToast('success', `Selected patient: ${selectedP.name} (${selectedP.uhid})`);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose Registered OP Patient ({patients.length} available) --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.uhid}] — Ph: {p.phone} ({p.gender}, {p.age}y)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecting an OP patient automatically links their UHID, Vitals, and Diagnostic History.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Diagnostic Test</label>
                <select 
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                  required
                >
                  <option value="">-- Choose Lab Test --</option>
                  {labTests.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category}) — {formatCurrency(t.price)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Referring Doctor</label>
                <input 
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setOrderModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md">Create Lab Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTER LAB TEST RESULTS */}
      {resultModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" /> Pathology Result Entry ({activeReport.reportNumber})
                </h3>
                <p className="text-xs text-slate-400">Patient: {activeReport.patientName} ({activeReport.uhid}) • Test: {activeReport.testName}</p>
              </div>
              <button onClick={() => setResultModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveResults} className="space-y-4 text-xs">
              <div className="space-y-3">
                <label className="block font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Test Parameter Results</label>
                {editingResults.map((param, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <input 
                        type="text"
                        value={param.parameterName}
                        onChange={(e) => {
                          const copy = [...editingResults];
                          copy[idx].parameterName = e.target.value;
                          setEditingResults(copy);
                        }}
                        placeholder="Parameter Name"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold dark:text-white"
                      />
                    </div>
                    <div>
                      <input 
                        type="text"
                        value={param.observedValue}
                        onChange={(e) => {
                          const copy = [...editingResults];
                          copy[idx].observedValue = e.target.value;
                          setEditingResults(copy);
                        }}
                        placeholder="Value (e.g. 14.5)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                    <div>
                      <input 
                        type="text"
                        value={param.normalRange}
                        onChange={(e) => {
                          const copy = [...editingResults];
                          copy[idx].normalRange = e.target.value;
                          setEditingResults(copy);
                        }}
                        placeholder="Ref Range"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-500"
                      />
                    </div>
                    <div>
                      <select 
                        value={param.flag}
                        onChange={(e) => {
                          const copy = [...editingResults];
                          copy[idx].flag = e.target.value as any;
                          setEditingResults(copy);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold dark:text-white"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Low">Low</option>
                        <option value="Abnormal">Abnormal</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pathologist Comments / Notes</label>
                <textarea 
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="Enter path lab impressions or notes..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setResultModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Save & Verify Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW TEST MASTER */}
      {newTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" /> Add Test Master
              </h3>
              <button onClick={() => setNewTestModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAddTestMaster} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Test Code</label>
                  <input type="text" value={newTestForm.code} onChange={(e) => setNewTestForm({...newTestForm, code: e.target.value})} placeholder="e.g. BIO-09" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label>
                  <input type="number" value={newTestForm.price} onChange={(e) => setNewTestForm({...newTestForm, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white" required />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Test Name</label>
                <input type="text" value={newTestForm.name} onChange={(e) => setNewTestForm({...newTestForm, name: e.target.value})} placeholder="e.g. Thyroid Profile (T3, T4, TSH)" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select value={newTestForm.category} onChange={(e) => setNewTestForm({...newTestForm, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white">
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Haematology">Haematology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Microbiology">Microbiology</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sample Type</label>
                  <input type="text" value={newTestForm.sampleType} onChange={(e) => setNewTestForm({...newTestForm, sampleType: e.target.value})} placeholder="Blood / Urine" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white" />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setNewTestModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md">Add Test</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
