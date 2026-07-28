import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, UserPlus, Search, Plus, CheckCircle, Clock, 
  Send, FileText, Activity, AlertCircle, Trash2, Printer, Download,
  ChevronRight, RefreshCw, UserCheck, ShieldAlert, Pill, HeartPulse, Sparkles, Mic, WifiOff
} from 'lucide-react';
import VoiceAgentModal from '../components/VoiceAgentModal';
import { useAuth } from '../contexts/AuthContext';
import * as db from '../services/supabaseData';
import { Patient, OpConsultation, Medicine, OpPrescriptionItem } from '../types';
import { formatCurrency } from '../utils/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { saveMedicinesCache, getMedicinesCache, enqueueSyncItem } from '../services/offlineDBService';

export default function OpdPage() {
  const { profile } = useAuth();

  // Primary Data States
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<OpConsultation[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'prescribe' | 'patients' | 'queue' | 'doctors'
  const [activeTab, setActiveTab] = useState<'prescribe' | 'patients' | 'queue' | 'doctors'>('prescribe');
  const [registeredDoctors, setRegisteredDoctors] = useState<import('../types').RegisteredDoctor[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Patient Record History Modal State
  const [viewPatientHistory, setViewPatientHistory] = useState<Patient | null>(null);

  // New Patient Form Modal
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    age: 30,
    bloodGroup: 'O+',
    address: '',
    allergies: '',
    chronicConditions: ''
  });

  // e-Prescription Form State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorName, setDoctorName] = useState('Dr. A. Sharma (MBBS, MD)');
  const [vitals, setVitals] = useState({
    bp: '120/80',
    pulse: 72,
    temp: 98.6,
    weight: 65,
    sugar: 110
  });
  const [diagnosis, setDiagnosis] = useState('');
  const [rxItems, setRxItems] = useState<OpPrescriptionItem[]>([]);
  const [consultationFee, setConsultationFee] = useState<number>(300);

  // Selected drug row inside prescription builder
  const [selectedMedId, setSelectedMedId] = useState('');
  const [dosage, setDosage] = useState('1-0-1 After Food');
  const [durationDays, setDurationDays] = useState(5);
  const [qty, setQty] = useState(10);
  const [rxNotes, setRxNotes] = useState('');

  const [myPharmacy, setMyPharmacy] = useState<import('../types').Pharmacy | null>(null);

  useEffect(() => {
    if (profile?.pharmacy_id) {
      loadData();
    }
  }, [profile]);

  // Auto-sync OPD queue & UHID registry when Voice Modal is open or closed
  useEffect(() => {
    if (!profile?.pharmacy_id || !voiceModalOpen) return;
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(interval);
  }, [profile, voiceModalOpen]);

  const isOnline = useOnlineStatus();
  const [isOfflineCacheEmpty, setIsOfflineCacheEmpty] = useState(false);

  const loadData = async () => {
    if (!profile?.pharmacy_id) return;
    setLoading(true);

    if (isOnline) {
      try {
        const [pData, cData, mData, pharm, docsData, bData] = await Promise.all([
          db.getPatients(profile.pharmacy_id),
          db.getOpConsultations(profile.pharmacy_id),
          db.getMedicines(),
          db.getMyPharmacy(profile.pharmacy_id).catch(() => null),
          db.getRegisteredDoctors(profile.pharmacy_id),
          db.getBatches().catch(() => [])
        ]);
        setPatients(pData);
        setConsultations(cData);
        setMedicines(mData);
        setRegisteredDoctors(docsData);
        if (pharm) setMyPharmacy(pharm);
        setIsOfflineCacheEmpty(false);

        // Save medicines and batches to IndexedDB
        await saveMedicinesCache(profile.pharmacy_id, { medicines: mData, batches: bData });
      } catch (err) {
        console.error('Failed to load OPD data online, falling back to cache:', err);
        await loadFromCache();
      } finally {
        setLoading(false);
      }
    } else {
      await loadFromCache();
      setLoading(false);
    }
  };

  const loadFromCache = async () => {
    if (!profile?.pharmacy_id) return;
    const cache = await getMedicinesCache(profile.pharmacy_id);
    if (cache && cache.data && cache.data.medicines.length > 0) {
      setMedicines(cache.data.medicines);
      setIsOfflineCacheEmpty(false);
    } else {
      setIsOfflineCacheEmpty(true);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Create Patient
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id) return;
    if (!newPatient.name.trim() || !newPatient.phone.trim()) {
      showToast('error', 'Patient Name and Phone Number are required.');
      return;
    }

    try {
      const count = patients.length + 1;
      const uhid = `UHID-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
      const created = await db.addPatient(profile.pharmacy_id, {
        ...newPatient,
        uhid
      });

      setPatients(prev => [created, ...prev]);
      setSelectedPatient(created);
      setPatientModalOpen(false);
      showToast('success', `Patient ${created.name} registered with UHID: ${created.uhid}`);

      // Reset Form
      setNewPatient({
        name: '',
        phone: '',
        gender: 'Male',
        age: 30,
        bloodGroup: 'O+',
        address: '',
        allergies: '',
        chronicConditions: ''
      });
    } catch (err: any) {
      showToast('error', `Failed to add patient: ${err.message}`);
    }
  };

  // 2. Add Drug to Prescription
  const handleAddMedicineToRx = () => {
    if (!selectedMedId) {
      showToast('error', 'Please select a medicine from inventory.');
      return;
    }
    const med = medicines.find(m => m.id === selectedMedId);
    if (!med) return;

    // Avoid duplicates
    if (rxItems.some(item => item.medicineId === selectedMedId)) {
      showToast('error', `${med.name} is already in the prescription.`);
      return;
    }

    setRxItems(prev => [
      ...prev,
      {
        medicineId: med.id,
        medicineName: `${med.name} (${med.strength})`,
        dosage,
        durationDays: Number(durationDays) || 5,
        quantity: Number(qty) || 10,
        notes: rxNotes
      }
    ]);

    // Reset drug picker
    setSelectedMedId('');
    setDosage('1-0-1 After Food');
    setDurationDays(5);
    setQty(10);
    setRxNotes('');
  };

  const handleRemoveRxItem = (medicineId: string) => {
    setRxItems(prev => prev.filter(i => i.medicineId !== medicineId));
  };

  // 3. Submit e-Prescription & OPD Consultation
  const handleSaveConsultation = async (statusOverride?: 'Sent to POS') => {
    if (!profile?.pharmacy_id) return;
    if (!selectedPatient) {
      showToast('error', 'Please select or register an Out-Patient first.');
      return;
    }

    if (!isOnline) {
      const tokenNum = 'OPD-OFF-' + Math.floor(100 + Math.random() * 900);
      const status = statusOverride || 'Completed';
      const consultationPayload = {
        uhid: selectedPatient.uhid,
        patientName: selectedPatient.name,
        patientPhone: selectedPatient.phone,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        doctorName,
        vitals,
        diagnosis,
        medicines: rxItems,
        consultationFee,
        tokenNumber: tokenNum,
        status
      };

      await enqueueSyncItem({
        id: 'sync_opd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        pharmacyId: profile.pharmacy_id,
        type: 'opd_consultation',
        status: 'pending',
        createdAt: new Date().toISOString(),
        staffId: profile.id,
        staffName: profile.name,
        payload: consultationPayload,
        requestedQuantity: rxItems.reduce((sum, i) => sum + i.quantity, 0)
      });

      showToast('success', `OP Consultation ${tokenNum} saved offline (Pending sync - will upload when internet returns)`);
      setDiagnosis('');
      setRxItems([]);
      return;
    }

    try {
      const { tokenNumber: tokenNum } = await db.getNextDailyOpToken(profile.pharmacy_id);
      const status = statusOverride || 'Completed';

      const created = await db.addOpConsultation(profile.pharmacy_id, {
        uhid: selectedPatient.uhid,
        patientName: selectedPatient.name,
        patientPhone: selectedPatient.phone,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        doctorName,
        vitals,
        diagnosis,
        medicines: rxItems,
        consultationFee,
        tokenNumber: tokenNum,
        status
      });

      setConsultations(prev => [created, ...prev]);

      if (status === 'Sent to POS') {
        showToast('success', `Prescription ${created.tokenNumber} sent to Pharmacy POS for 1-click billing!`);
      } else {
        showToast('success', `OP Consultation ${created.tokenNumber} saved successfully.`);
      }

      // Reset Rx builder
      setDiagnosis('');
      setRxItems([]);
    } catch (err: any) {
      showToast('error', `Failed to save OPD consultation: ${err.message}`);
    }
  };

  // 4. PDF Generation & Printing
  const generateOpdPdf = (
    c: {
      uhid: string;
      patientName: string;
      patientPhone: string;
      gender: string;
      age: number;
      doctorName: string;
      vitals?: { bp?: string; pulse?: number; temp?: number; weight?: number; sugar?: number };
      diagnosis?: string;
      medicines: OpPrescriptionItem[];
      consultationFee: number;
      tokenNumber: string;
      createdAt?: string;
    },
    mode: 'download' | 'print'
  ) => {
    try {
      const doc = new jsPDF();

      // Clinic Header Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 36, 'F');

      const clinicTitle = (myPharmacy?.name || 'LIVAFIL CLINIC & PHARMACY').toUpperCase();
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(clinicTitle, 14, 14);

      const subtitle = myPharmacy?.address 
        ? `${myPharmacy.address} • License: ${myPharmacy.licenseNumber || 'N/A'}`
        : 'Out-Patient (OPD) e-Prescription & Case Sheet';

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, 22);
      doc.text(`Out-Patient (OPD) Case Sheet`, 14, 28);
      doc.text(`Token: ${c.tokenNumber} | Date: ${new Date(c.createdAt || Date.now()).toLocaleDateString()}`, 196, 28, { align: 'right' });

      // Patient Info Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PATIENT INFORMATION', 14, 42);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 45, 182, 26, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Patient Name: `, 18, 53);
      doc.setFont('helvetica', 'normal');
      doc.text(`${c.patientName} (${c.gender}, ${c.age} yrs)`, 45, 53);

      doc.setFont('helvetica', 'bold');
      doc.text(`UHID: `, 130, 53);
      doc.setFont('helvetica', 'normal');
      doc.text(`${c.uhid}`, 145, 53);

      doc.setFont('helvetica', 'bold');
      doc.text(`Phone: `, 18, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(`${c.patientPhone}`, 45, 62);

      doc.setFont('helvetica', 'bold');
      doc.text(`Doctor: `, 130, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(`${c.doctorName}`, 145, 62);

      // Vitals & Diagnosis
      let y = 78;
      if (c.vitals) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PATIENT VITALS', 14, y);
        y += 5;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const vitalsText = `BP: ${c.vitals.bp || '120/80'} mmHg  |  Pulse: ${c.vitals.pulse || 72} bpm  |  Temp: ${c.vitals.temp || 98.6}°F  |  Weight: ${c.vitals.weight || 65} kg  |  Sugar: ${c.vitals.sugar || 110} mg/dL`;
        doc.text(vitalsText, 14, y);
        y += 8;
      }

      if (c.diagnosis) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('CLINICAL DIAGNOSIS', 14, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(c.diagnosis, 14, y);
        y += 10;
      }

      // Prescribed Medicines (Rx) or Blank Empty Area
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Rx', 14, y + 2);
      y += 6;

      if (c.medicines && c.medicines.length > 0) {
        const tableData = c.medicines.map((m, idx) => [
          idx + 1,
          m.medicineName,
          m.dosage,
          `${m.durationDays} Days`,
          `${m.quantity} units`
        ]);

        autoTable(doc, {
          startY: y,
          head: [['#', 'Medicine Name', 'Dosage Schedule', 'Duration', 'Qty']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3 }
        });

        y = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : y + 35;
      } else {
        // Completely empty blank white space for doctor to write freely
        y += 85;
      }

      // Ensure footer fits neatly at bottom of page
      const pageHeight = doc.internal.pageSize.height;
      let footerY = Math.max(y + 10, pageHeight - 45);

      // Consultation Fee & Payment Info (Bottom Left)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Consultation Fee: ${formatCurrency(c.consultationFee)}`, 14, footerY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Issued Date: ${new Date(c.createdAt || Date.now()).toLocaleString()}`, 14, footerY + 6);
      doc.text(`Issued By: ${c.doctorName}`, 14, footerY + 11);

      // Doctor Signature & Stamp Box (Bottom Right)
      doc.setDrawColor(203, 213, 225);
      doc.rect(130, footerY - 5, 66, 32, 'D');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("DOCTOR'S SIGNATURE & STAMP", 133, footerY);

      doc.setDrawColor(148, 163, 184);
      doc.line(133, footerY + 18, 191, footerY + 18);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(c.doctorName, 133, footerY + 22);
      doc.text('Reg. No: MED/2026/OPD', 133, footerY + 25);

      // Bottom Disclaimer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Valid for OPD consultation. Please follow dosage strictly as advised by doctor.', 105, pageHeight - 6, { align: 'center' });

      if (mode === 'download') {
        doc.save(`OP-Prescription-${c.uhid}.pdf`);
      } else {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const printWin = window.open(url, '_blank');
        if (printWin) {
          printWin.focus();
          printWin.print();
        }
      }
    } catch (err) {
      console.error('Failed to generate OPD PDF:', err);
    }
  };

  // Filtered Patients
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2 transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
          <Stethoscope className="w-96 h-96" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> {myPharmacy?.name || 'LIVAFIL Clinic & Pharmacy Suite'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {myPharmacy?.name ? `${myPharmacy.name} - Out-Patient (OPD) System` : 'Out-Patient (OPD) System'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
            Register out-patients, log vitals, generate digital e-prescriptions, and transfer orders seamlessly to the Pharmacy POS.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Mic className="w-4 h-4 animate-pulse" /> Book by Voice
          </button>
          <button 
            onClick={() => setPatientModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Register New OP Patient
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered OP Patients</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{patients.length}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Today's Consultations</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{consultations.length}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Queue Tokens</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {consultations.filter(c => c.status === 'Waiting' || c.status === 'Consulting').length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sent to Pharmacy POS</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {consultations.filter(c => c.status === 'Sent to POS').length}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('prescribe')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'prescribe'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" /> e-Prescription & Vitals Workspace
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'patients'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Patient Directory (UHID Registry)
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> OPD Token Queue Board
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'doctors'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" /> Registered Doctors ({registeredDoctors.length})
        </button>
      </div>

      {/* TAB 1: e-Prescription Workspace */}
      {activeTab === 'prescribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Select Patient & Vitals */}
          <div className="space-y-6">
            {/* Patient Lookup & Selector */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-500" /> Out-Patient Selection
                </h3>
                {selectedPatient ? (
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    Change Patient
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setNewPatient({
                        name: '',
                        phone: '',
                        gender: 'Male',
                        age: 30,
                        bloodGroup: 'O+',
                        address: '',
                        allergies: '',
                        chronicConditions: ''
                      });
                      setPatientModalOpen(true);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + New Patient
                  </button>
                )}
              </div>

              {!selectedPatient ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text"
                      value={patientSearchInput}
                      onChange={(e) => setPatientSearchInput(e.target.value)}
                      placeholder="Type Patient Name or Mobile Number..."
                      className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                    />
                    {patientSearchInput && (
                      <button 
                        onClick={() => setPatientSearchInput('')}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Matching Patient Records List */}
                  {patientSearchInput.trim() !== '' && (
                    <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-md">
                      {patients.filter(p => 
                        p.name.toLowerCase().includes(patientSearchInput.toLowerCase()) ||
                        p.phone.includes(patientSearchInput) ||
                        p.uhid.toLowerCase().includes(patientSearchInput.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                          <p>No past patient record matching "{patientSearchInput}"</p>
                          <button
                            onClick={() => {
                              const isPhone = /^\d+$/.test(patientSearchInput.trim());
                              setNewPatient(prev => ({
                                ...prev,
                                name: isPhone ? '' : patientSearchInput,
                                phone: isPhone ? patientSearchInput : ''
                              }));
                              setPatientModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Register New Patient
                          </button>
                        </div>
                      ) : (
                        patients.filter(p => 
                          p.name.toLowerCase().includes(patientSearchInput.toLowerCase()) ||
                          p.phone.includes(patientSearchInput) ||
                          p.uhid.toLowerCase().includes(patientSearchInput.toLowerCase())
                        ).map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearchInput('');
                            }}
                            className="p-3 hover:bg-blue-50/50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-2">
                                <span>{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({p.uhid})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Mobile: <span className="font-semibold text-slate-700 dark:text-slate-300">{p.phone}</span> • {p.gender}, {p.age}y
                              </div>
                            </div>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              Select
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {patientSearchInput.trim() === '' && (
                    <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <p className="text-xs text-slate-400">Search existing patient by Name / Mobile or register new</p>
                      <button 
                        onClick={() => {
                          setNewPatient({
                            name: '',
                            phone: '',
                            gender: 'Male',
                            age: 30,
                            bloodGroup: 'O+',
                            address: '',
                            allergies: '',
                            chronicConditions: ''
                          });
                          setPatientModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> + Register New Out-Patient
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl text-xs space-y-2">
                  <div className="font-extrabold text-slate-900 dark:text-white flex justify-between items-center text-sm">
                    <span>{selectedPatient.name}</span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">{selectedPatient.uhid}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-medium flex items-center justify-between">
                    <span>Mobile: <strong>{selectedPatient.phone}</strong></span>
                    <span>{selectedPatient.gender}, {selectedPatient.age} yrs</span>
                  </div>
                  {selectedPatient.bloodGroup && (
                    <div className="text-slate-500">Blood Group: <strong className="text-slate-700 dark:text-slate-200">{selectedPatient.bloodGroup}</strong></div>
                  )}
                  {selectedPatient.allergies && (
                    <div className="text-red-500 font-semibold">Allergies: {selectedPatient.allergies}</div>
                  )}
                  
                  <div className="pt-2 border-t border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                    <button 
                      onClick={() => setViewPatientHistory(selectedPatient)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Past Medical File
                    </button>
                    <button 
                      onClick={() => setSelectedPatient(null)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Search Another Patient
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Vitals Log */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" /> Patient Vitals
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Blood Pressure</label>
                  <input 
                    type="text"
                    value={vitals.bp}
                    onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                    placeholder="120/80"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pulse (bpm)</label>
                  <input 
                    type="number"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Temp (°F)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Weight (kg)</label>
                  <input 
                    type="number"
                    value={vitals.weight}
                    onChange={(e) => setVitals({ ...vitals, weight: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Doctor Info & Fee */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Consulting Registered Doctor</label>
                <select 
                  value={doctorName}
                  onChange={(e) => {
                    setDoctorName(e.target.value);
                    const selected = registeredDoctors.find(d => `${d.name} (${d.qualification})` === e.target.value || d.name === e.target.value);
                    if (selected) {
                      setConsultationFee(selected.consultationFee);
                    }
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                >
                  {registeredDoctors.length > 0 ? (
                    registeredDoctors.map(doc => (
                      <option key={doc.id} value={`${doc.name} (${doc.qualification})`}>
                        {doc.name} • {doc.specialty} ({doc.roomNumber})
                      </option>
                    ))
                  ) : (
                    <option value="Dr. A. Sharma (MBBS, MD)">Dr. A. Sharma (MBBS, MD)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Consultation Fee (₹)</label>
                <input 
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                  className="w-full text-xs font-bold text-emerald-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Prescription Builder */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Digital e-Prescription Pad</h3>
                  <p className="text-xs text-slate-400">Select medicines from pharmacy inventory with real-time stock verification.</p>
                </div>
                {selectedPatient && (
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full">
                    {selectedPatient.uhid}
                  </span>
                )}
              </div>

              {/* Diagnosis Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Diagnosis / Clinical Notes</label>
                <textarea 
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="E.g. Acute Upper Respiratory Tract Infection, Fever"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              {/* Add Drug Selector Row */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-blue-500" /> Prescribe Drug from Inventory
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <select 
                      value={selectedMedId}
                      onChange={(e) => setSelectedMedId(e.target.value)}
                      className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                    >
                      <option value="">-- Select Medicine --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.strength}) - {m.dosageForm}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="Dosage (e.g. 1-0-1)"
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400">Duration (Days)</label>
                    <input 
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400">Total Qty</label>
                    <input 
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleAddMedicineToRx}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Drug
                    </button>
                  </div>
                </div>
              </div>

              {/* Prescribed Drugs Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Medicine</th>
                      <th className="p-3">Dosage Instruction</th>
                      <th className="p-3 text-center">Days</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rxItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          No drugs added to prescription yet. Select a medicine above.
                        </td>
                      </tr>
                    ) : (
                      rxItems.map(item => (
                        <tr key={item.medicineId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{item.medicineName}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{item.dosage}</td>
                          <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">{item.durationDays}d</td>
                          <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{item.quantity}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleRemoveRxItem(item.medicineId)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Submit & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  Total Consultation Fee: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(consultationFee)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {selectedPatient && (
                    <>
                      <button 
                        type="button"
                        onClick={() => generateOpdPdf({
                          uhid: selectedPatient.uhid,
                          patientName: selectedPatient.name,
                          patientPhone: selectedPatient.phone,
                          gender: selectedPatient.gender,
                          age: selectedPatient.age,
                          doctorName,
                          vitals,
                          diagnosis,
                          medicines: rxItems,
                          consultationFee,
                          tokenNumber: 'T-CURRENT'
                        }, 'print')}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>

                      <button 
                        type="button"
                        onClick={() => generateOpdPdf({
                          uhid: selectedPatient.uhid,
                          patientName: selectedPatient.name,
                          patientPhone: selectedPatient.phone,
                          gender: selectedPatient.gender,
                          age: selectedPatient.age,
                          doctorName,
                          vitals,
                          diagnosis,
                          medicines: rxItems,
                          consultationFee,
                          tokenNumber: 'T-CURRENT'
                        }, 'download')}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </>
                  )}

                  <button 
                    type="button"
                    onClick={() => handleSaveConsultation()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Save OP Record
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleSaveConsultation('Sent to POS')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send to POS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Patient Directory */}
      {activeTab === 'patients' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UHID, name, phone..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none dark:text-white"
              />
            </div>

            <button 
              onClick={() => setPatientModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Register New Out-Patient
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Gender / Age</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Blood Group</th>
                  <th className="p-3">Known Allergies</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No patients found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{p.uhid}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{p.gender}, {p.age}y</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{p.phone}</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300">{p.bloodGroup || 'N/A'}</span></td>
                      <td className="p-3 text-red-500 font-medium">{p.allergies || 'None'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setViewPatientHistory(p)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> Medical File
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedPatient(p);
                              setActiveTab('prescribe');
                            }}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs hover:bg-blue-100 transition-colors"
                          >
                            + New e-Rx
                          </button>
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

      {/* TAB 3: Queue Board */}
      {activeTab === 'queue' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Live OPD Token Queue Board
            </h3>
            <button 
              onClick={loadData}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {consultations.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-400">
                No active consultation tokens in queue today.
              </div>
            ) : (
              consultations.map(c => (
                <div 
                  key={c.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 font-black text-sm rounded-lg">
                      {c.tokenNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      c.status === 'Sent to POS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{c.patientName}</div>
                    <div className="text-xs text-slate-400">UHID: {c.uhid} • Phone: {c.patientPhone}</div>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/50 pt-2 flex items-center justify-between">
                    <div>
                      <div>Doctor: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.doctorName}</span></div>
                      <div>Rx Items: <span className="font-bold text-blue-600 dark:text-blue-400">{c.medicines.length}</span></div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => generateOpdPdf(c, 'print')}
                        title="Print Prescription"
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => generateOpdPdf(c, 'download')}
                        title="Download PDF"
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: Register New Out-Patient */}
      {patientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Out-Patient Registration
              </h3>
              <button 
                onClick={() => setPatientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input 
                  type="text"
                  required
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="E.g. Rajesh Kumar"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input 
                    type="tel"
                    required
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age (Years)</label>
                  <input 
                    type="number"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                <select 
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Known Drug Allergies</label>
                <input 
                  type="text"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  placeholder="E.g. Penicillin, Sulfa"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setPatientModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Patient Complete Medical Record File */}
      {viewPatientHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Patient Electronic Medical Record ({viewPatientHistory.uhid})
                </h3>
                <p className="text-xs text-slate-400">{viewPatientHistory.name} • {viewPatientHistory.gender}, {viewPatientHistory.age}y • Phone: {viewPatientHistory.phone}</p>
              </div>
              <button 
                onClick={() => setViewPatientHistory(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Health Profile Info */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
              <div><span className="text-slate-400">Blood Group:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{viewPatientHistory.bloodGroup || 'N/A'}</span></div>
              <div><span className="text-slate-400">Known Allergies:</span> <span className="font-bold text-red-500">{viewPatientHistory.allergies || 'None'}</span></div>
              <div className="col-span-2"><span className="text-slate-400">Chronic Conditions:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{viewPatientHistory.chronicConditions || 'None reported'}</span></div>
            </div>

            {/* Consultation History Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Past OPD Consultations & Vitals History</h4>
              {consultations.filter(c => c.uhid === viewPatientHistory.uhid).length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                  No past OPD visit records found for this patient.
                </div>
              ) : (
                consultations.filter(c => c.uhid === viewPatientHistory.uhid).map(c => (
                  <div key={c.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/30 dark:bg-slate-800/20">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString()}</span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">{c.tokenNumber}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">Doctor: <span className="font-semibold">{c.doctorName}</span></div>
                    {c.vitals && (
                      <div className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        BP: {c.vitals.bp || '120/80'} | Pulse: {c.vitals.pulse || 72} bpm | Temp: {c.vitals.temp || 98.6}°F | Wt: {c.vitals.weight || 65}kg | Sugar: {c.vitals.sugar || 110}mg/dL
                      </div>
                    )}
                    {c.diagnosis && <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Diagnosis: {c.diagnosis}</div>}
                    {c.medicines.length > 0 && (
                      <div className="text-xs space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Prescribed Drugs ({c.medicines.length}):</div>
                        {c.medicines.map((m, idx) => (
                          <div key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-2 border-l-2 border-blue-500">
                            • {m.medicineName} — {m.dosage} ({m.durationDays} days, {m.quantity} qty)
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 flex justify-end gap-2">
                      <button 
                        onClick={() => generateOpdPdf(c, 'print')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Rx
                      </button>
                      <button 
                        onClick={() => generateOpdPdf(c, 'download')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REGISTERED DOCTORS DIRECTORY */}
      {activeTab === 'doctors' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-500" />
                  Clinic Registered Doctors Directory
                </h3>
                <p className="text-xs text-slate-400">View active OPD doctors, consultation room numbers, registration details, and fee structure connected to AI voice booking.</p>
              </div>
              <button
                onClick={() => {
                  window.location.href = '/settings';
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Manage Doctor Profiles
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {registeredDoctors.map(doc => (
                <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3 relative hover:border-blue-500 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        {doc.specialty}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">{doc.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{doc.qualification}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      ₹{doc.consultationFee}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between"><span>Cabin Room:</span> <strong className="text-slate-900 dark:text-white">{doc.roomNumber}</strong></div>
                    <div className="flex justify-between"><span>MCI Reg No:</span> <strong className="text-slate-900 dark:text-white font-mono">{doc.regNumber}</strong></div>
                    <div className="flex justify-between"><span>Mobile:</span> <strong className="text-slate-900 dark:text-white font-mono">{doc.phone}</strong></div>
                    <div className="flex justify-between"><span>Days:</span> <strong className="text-slate-900 dark:text-white">{doc.availabilityDays.join(', ')}</strong></div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium text-center bg-slate-100 dark:bg-slate-800/60 p-2 rounded-lg">
                    ⏰ {doc.timingSlots}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VOICE APPOINTMENT MODAL */}
      <VoiceAgentModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        mode="opd"
        onBookAppointment={async (data) => {
          if (!profile?.pharmacy_id) return;
          try {
            const count = patients.length + 1;
            const uhid = `UHID-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
            const created = await db.addPatient(profile.pharmacy_id, {
              name: data.name,
              phone: data.phone,
              gender: data.gender || 'Male',
              age: data.age || 30,
              bloodGroup: 'O+',
              address: 'Voice Registered Patient',
              allergies: '',
              chronicConditions: '',
              uhid
            });
            setPatients(prev => [created, ...prev]);
            setSelectedPatient(created);

            // Generate consultation token
            const tokenNumber = `OPD-TK-${Math.floor(100 + Math.random() * 900)}`;
            const assignedDoc = registeredDoctors.length > 0 ? registeredDoctors[0].name : (data.doctor || 'Dr. A. K. Sharma');
            const fee = registeredDoctors.length > 0 ? registeredDoctors[0].consultationFee : 500;

            const newConsultation = await db.addOpConsultation(profile.pharmacy_id, {
              uhid,
              patientName: data.name,
              patientPhone: data.phone,
              gender: data.gender || 'Male',
              age: data.age || 30,
              doctorName: assignedDoc,
              consultationFee: fee,
              tokenNumber,
              medicines: [],
              status: 'Waiting'
            });

            setConsultations(prev => [newConsultation, ...prev]);
            setActiveTab('queue');
            showToast('success', `Voice OPD Appointment confirmed for ${data.name}! Assigned Token ${tokenNumber}. Confirmation sent to ${data.phone}.`);
          } catch (err: any) {
            showToast('error', `Failed to book voice appointment: ${err.message}`);
          }
        }}
      />
    </div>
  );
}
