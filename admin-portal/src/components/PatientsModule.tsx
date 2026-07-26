import React, { useState } from 'react';
import { 
  Users, Search, Mic, CheckCircle2, ShieldAlert, Sparkles, Filter, Calendar, 
  Plus, X, Stethoscope, Phone, User, Clock 
} from 'lucide-react';
import { RealPatientRecord, RealOpConsultation, createRealPatient } from '../lib/supabase';

interface PatientsModuleProps {
  patients: RealPatientRecord[];
  consultations: RealOpConsultation[];
  onRefresh: () => void;
}

export default function PatientsModule({ patients, consultations, onRefresh }: PatientsModuleProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'voice' | 'patients'>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    age: 30,
    address: 'Registered via Admin Portal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Combine Patients and Voice OPD Consultations into a unified stream
  const combinedStream = [
    ...patients.map(p => ({
      id: p.id,
      uhid: p.uhid,
      name: p.name,
      phone: p.phone || '9876543210',
      gender: p.gender || 'Male',
      age: p.age || 30,
      doctor: 'OPD General Consultation',
      token: 'UHID Patient',
      status: 'Registered',
      source: p.source || (p.address?.includes('ElevenLabs') ? 'Voice Agent' : 'OPD Reception'),
      created_at: p.created_at || new Date().toISOString()
    })),
    ...consultations.map(c => ({
      id: c.id,
      uhid: c.uhid || 'UHID-2026-9000',
      name: c.patient_name,
      phone: c.patient_phone || '9876543210',
      gender: 'Male',
      age: 32,
      doctor: c.doctor_name || 'Dr. A. K. Sharma',
      token: c.token_number || 'OPD-TK-100',
      status: c.status || 'Waiting',
      source: 'ElevenLabs Voice Agent',
      created_at: c.created_at || new Date().toISOString()
    }))
  ];

  // Deduplicate stream entries by ID or UHID
  const streamMap = new Map<string, typeof combinedStream[0]>();
  combinedStream.forEach(item => streamMap.set(item.id || item.uhid, item));
  const uniqueStream = Array.from(streamMap.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Filter Stream
  const filteredStream = uniqueStream.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.uhid.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search);

    if (!matchesSearch) return false;

    if (activeTab === 'voice') {
      return item.source.toLowerCase().includes('voice');
    }
    if (activeTab === 'patients') {
      return !item.source.toLowerCase().includes('voice');
    }
    return true;
  });

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createRealPatient(formData);
      setSuccessMsg(`Successfully registered "${formData.name}" to Supabase UHID Registry!`);
      setShowModal(false);
      setFormData({ name: '', phone: '', gender: 'Male', age: 30, address: 'Registered via Admin Portal' });
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            UHID Patient Registry & Voice OPD Stream
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 glow-emerald flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span> {uniqueStream.length} Total Patients
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time live database stream of all patient UHIDs and ElevenLabs voice appointments across all clinics.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" /> Register UHID Patient
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="p-3 rounded-2xl glass-card flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Live Stream ({uniqueStream.length})
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'voice'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-purple-400" /> Voice Agent Bookings
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'patients'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            UHID Patient Registry
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search UHID, Patient Name, Mobile..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-medium"
          />
        </div>
      </div>

      {/* Patients Stream Table */}
      <div className="rounded-2xl glass-card overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 pl-5">Patient Name</th>
                <th className="p-3.5">Assigned UHID</th>
                <th className="p-3.5">Mobile Contact</th>
                <th className="p-3.5">Assigned Token / Doctor</th>
                <th className="p-3.5">Registration Source</th>
                <th className="p-3.5 pr-5 text-right">Created Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredStream.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3.5 pl-5 font-bold text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-teal-500/20 to-blue-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center font-extrabold text-xs shrink-0">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.gender} / {item.age} yrs</p>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-md font-mono font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      {item.uhid}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{item.phone}</td>
                  <td className="p-3.5">
                    <div>
                      <p className="text-xs font-extrabold text-slate-200">{item.token}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.doctor}</p>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.source.toLowerCase().includes('voice')
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 glow-purple'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {item.source.toLowerCase().includes('voice') ? (
                        <Mic className="w-3 h-3 text-purple-400 animate-pulse" />
                      ) : (
                        <User className="w-3 h-3 text-blue-400" />
                      )}
                      <span>{item.source}</span>
                    </span>
                  </td>
                  <td className="p-3.5 pr-5 text-right font-mono text-slate-400 text-[11px]">
                    <div className="flex items-center justify-end gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-teal-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-teal-400" /> Register New UHID Patient
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Anish Sharma"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer"
              >
                {isSubmitting ? 'Registering Patient...' : 'Save Patient to Supabase'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
