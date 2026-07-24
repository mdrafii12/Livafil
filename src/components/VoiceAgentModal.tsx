import React, { useState } from 'react';
import { Sparkles, X, Settings2, PhoneCall, ShieldCheck, Languages, CheckCircle2 } from 'lucide-react';

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
  mode = 'general'
}: VoiceAgentModalProps) {
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState(() => {
    return localStorage.getItem('livafil_elevenlabs_agent_id') || (import.meta.env as any).VITE_ELEVENLABS_AGENT_ID || 'agent_5401ky8y0tsgejyr3pmqya8qhhyb';
  });
  const [showConfig, setShowConfig] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      {/* Outer Glow Container */}
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600 rounded-3xl blur-lg opacity-40 animate-pulse pointer-events-none"></div>

        {/* Modal Main Card */}
        <div className="relative w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white">
          
          {/* Header Bar */}
          <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-800/80 bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/20">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
                  Livafil Voice Agent
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {mode === 'opd' ? 'OPD Receptionist' : mode === 'billing' ? 'Voice Billing' : 'ElevenLabs'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">Powered by ElevenLabs Multilingual Conversational AI</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold flex items-center gap-1"
                title="Configure Agent ID"
              >
                <Settings2 className="h-4.5 w-4.5 text-blue-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ElevenLabs Agent Config Drawer */}
          {showConfig && (
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 space-y-2 animate-slide-down">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                  Connected ElevenLabs Agent ID
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
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
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Webhook tools <code className="text-blue-400">book_opd_appointment</code> &amp; <code className="text-blue-400">check_medicine_stock</code> are active.
              </p>
            </div>
          )}

          {/* ElevenLabs Widget Container */}
          <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-950/70 min-h-[280px]">
            
            {/* Live Indicator Badge */}
            <div className="mb-5 flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-950/50 px-3.5 py-1.5 rounded-full border border-emerald-800/60 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              ElevenLabs AI Voice Agent Ready
            </div>

            {/* Official ElevenLabs Web Component Element */}
            <div className="py-4 flex justify-center scale-125 transform hover:scale-130 transition-transform">
              {React.createElement('elevenlabs-convai', { 'agent-id': elevenLabsAgentId })}
            </div>

            <p className="text-xs text-slate-300 mt-5 max-w-xs leading-relaxed font-medium">
              Click the phone icon above to start your voice call with the AI agent in <span className="text-emerald-400 font-bold">Hindi (हिंदी)</span>, <span className="text-blue-400 font-bold">Telugu (తెలుగు)</span>, or <span className="text-purple-400 font-bold">English</span>.
            </p>
          </div>

          {/* Prompts Guide */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-blue-400" /> Try Spoken Prompts
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center justify-between">
                <span>🇮🇳 <strong>Hindi:</strong> "नमस्ते, राजेश कुमार के लिए डॉक्टर अपॉइंटमेंट बुक करें"</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center justify-between">
                <span>🇮🇳 <strong>Telugu:</strong> "నమస్కారం, డోలో 650 టాబ్లెట్స్ స్టాక్ ఉందా?"</span>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 text-blue-400" /> Real-time Conversational Voice
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
