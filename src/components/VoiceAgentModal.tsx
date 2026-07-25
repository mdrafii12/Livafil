import React, { useState } from 'react';
import { Sparkles, X, Settings2, PhoneCall, Languages, CheckCircle2, AlertTriangle, Play, HelpCircle } from 'lucide-react';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'general' | 'opd' | 'billing';
  onBookAppointment?: (data: { name: string; phone: string; age?: number; gender?: 'Male' | 'Female' | 'Other'; doctor?: string }) => void;
  onAddToCart?: (medicineQuery: string, qty: number) => void;
  medicines?: Array<{ id: string; name: string; stock?: number; price?: number }>;
}

export default function VoiceAgentModal({
  isOpen,
  onClose,
  mode = 'general',
  onBookAppointment,
  onAddToCart,
  medicines = []
}: VoiceAgentModalProps) {
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState(() => {
    const saved = localStorage.getItem('livafil_elevenlabs_agent_id');
    if (saved && saved.startsWith('agent_9001')) {
      return saved;
    }
    const targetId = 'agent_9001kyccz3qbf3svak7wbp3m4fhs';
    localStorage.setItem('livafil_elevenlabs_agent_id', targetId);
    return targetId;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [testName, setTestName] = useState('Rajesh Kumar');
  const [testPhone, setTestPhone] = useState('9876543210');
  const [testDoctor, setTestDoctor] = useState('Dr. A. K. Sharma');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickBookTest = () => {
    if (onBookAppointment) {
      onBookAppointment({
        name: testName,
        phone: testPhone,
        age: 32,
        gender: 'Male',
        doctor: testDoctor
      });
      setBookingSuccess(`Simulated Voice Booking created for ${testName} with ${testDoctor}! Token added to OPD Queue.`);
      setTimeout(() => setBookingSuccess(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      {/* Outer Glow Container */}
      <div className="relative w-full max-w-md my-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600 rounded-3xl blur-md opacity-40 animate-pulse pointer-events-none"></div>

        {/* Modal Main Card */}
        <div className="relative w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white max-h-[92vh] flex flex-col">
          
          {/* Compact Header Bar */}
          <div className="p-4 pb-3 flex justify-between items-center border-b border-slate-800/80 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30">
                <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                  Livafil Voice Agent
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {mode === 'opd' ? 'OPD Assistant' : mode === 'billing' ? 'Voice Billing' : 'ElevenLabs'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">ElevenLabs Multilingual AI</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-all text-xs font-semibold"
                title="Troubleshoot Errors"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold"
                title="Configure Agent ID"
              >
                <Settings2 className="h-4 w-4 text-blue-400" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Config Drawer */}
          {showConfig && (
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 space-y-2 shrink-0 animate-slide-down">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                  Connected ElevenLabs Agent ID
                </label>
                <span className="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Active
                </span>
              </div>
              <input
                type="text"
                value={elevenLabsAgentId}
                onChange={(e) => {
                  setElevenLabsAgentId(e.target.value);
                  localStorage.setItem('livafil_elevenlabs_agent_id', e.target.value);
                }}
                placeholder="agent_..."
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400">
                Paste your custom ElevenLabs Conversational AI Agent ID here if the default ID runs out of quota.
              </p>
            </div>
          )}

          {/* Troubleshooting Drawer */}
          {showTroubleshoot && (
            <div className="p-3 bg-amber-950/40 border-b border-amber-800/60 space-y-2 shrink-0 animate-slide-down text-left text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Fixing Voice Errors:</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-300 leading-snug">
                <p>
                  <strong className="text-amber-400">1. Quota Exceeded Error:</strong> ElevenLabs free plan credits have been exhausted for this Agent ID. You can set your own fresh Agent ID in settings (⚙️) or test simulated voice booking below.
                </p>
                <p>
                  <strong className="text-amber-400">2. Technical Issue Error:</strong> ElevenLabs cannot reach your local server webhook. Run <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400 font-mono">node elevenlabs_webhook.js</code> and <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400 font-mono">npx ngrok http 5000</code>, then paste the ngrok URL into your ElevenLabs Agent tool settings.
                </p>
              </div>
            </div>
          )}

          {/* Scrollable Center Body */}
          <div className="p-4 py-3 text-center flex flex-col items-center justify-center bg-slate-950/70 overflow-y-auto shrink">
            
            {/* Live Status Badge */}
            <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800/60 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              ElevenLabs AI Voice Agent Ready
            </div>

            {/* Official ElevenLabs Web Component Element */}
            <div className="w-full my-2 flex flex-col justify-center items-center text-center relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-3 shadow-inner min-h-[100px]">
              <div className="w-full flex justify-center items-center text-center mx-auto">
                {React.createElement('elevenlabs-convai', { key: elevenLabsAgentId, 'agent-id': elevenLabsAgentId })}
              </div>
              <div className="mt-1 text-[9px] text-slate-400 font-mono flex items-center justify-center gap-1">
                <span>Active Agent:</span>
                <span className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{elevenLabsAgentId}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 mt-1 max-w-xs leading-tight font-medium">
              Click <strong className="text-white">Start a call</strong> to talk in <span className="text-emerald-400 font-bold">Hindi (हिंदी)</span>, <span className="text-blue-400 font-bold">Telugu (తెలుగు)</span>, or <span className="text-purple-400 font-bold">English</span>.
            </p>

            {/* Simulated Voice Appointment Test Box */}
            {mode === 'opd' && onBookAppointment && (
              <div className="w-full mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <Play className="w-3 h-3 text-emerald-400" /> Instant OPD Voice Booking Test
                  </span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">Quota Bypass</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Patient Name"
                    className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Phone"
                    className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-medium"
                  />
                </div>
                <button
                  onClick={handleQuickBookTest}
                  className="w-full mt-2 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Book OPD Token & Add to Live Queue
                </button>
                {bookingSuccess && (
                  <p className="mt-2 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 p-1.5 rounded border border-emerald-800/80">
                    {bookingSuccess}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Prompts Guide */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1.5 shrink-0">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Languages className="w-3 h-3 text-blue-400" /> Spoken Prompts Guide
            </p>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 text-left">
                <span>🇮🇳 <strong>Hindi:</strong> "नमस्ते, राजेश कुमार के लिए डॉक्टर अपॉइंटमेंट बुक करें"</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 text-left">
                <span>🇮🇳 <strong>Telugu:</strong> "నమస్కారం, డోలో 650 టాబ్లెట్స్ స్టాక్ ఉందా?"</span>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 px-4 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-400 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1 text-slate-400">
              <PhoneCall className="w-3 h-3 text-blue-400" /> Real-time Conversational Voice
            </span>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Livafil AI Suite
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
