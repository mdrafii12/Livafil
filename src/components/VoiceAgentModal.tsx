import React, { useState } from 'react';
import { Sparkles, X, Settings2, PhoneCall, Languages, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      {/* Outer Glow Container */}
      <div className="relative w-full max-w-md my-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600 rounded-3xl blur-md opacity-40 animate-pulse pointer-events-none"></div>

        {/* Modal Main Card (Shorter & Vertically Fitted) */}
        <div className="relative w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white max-h-[88vh] flex flex-col">
          
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
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 space-y-1.5 shrink-0 animate-slide-down">
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
            </div>
          )}

          {/* Scrollable Center Body (Compact & Fitted) */}
          <div className="p-4 py-3 text-center flex flex-col items-center justify-center bg-slate-950/70 overflow-y-auto shrink">
            
            {/* Live Status Badge */}
            <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800/60 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              ElevenLabs AI Voice Agent Ready
            </div>

            {/* Official ElevenLabs Web Component Element */}
            <div className="w-full my-1.5 flex justify-center items-center relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 p-2 shadow-inner min-h-[90px]">
              {React.createElement('elevenlabs-convai', { 'agent-id': elevenLabsAgentId })}
            </div>

            <p className="text-[11px] text-slate-300 mt-2 max-w-xs leading-tight font-medium">
              Click <strong className="text-white">Start a call</strong> to talk in <span className="text-emerald-400 font-bold">Hindi (हिंदी)</span>, <span className="text-blue-400 font-bold">Telugu (తెలుగు)</span>, or <span className="text-purple-400 font-bold">English</span>.
            </p>
          </div>

          {/* Prompts Guide */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1.5 shrink-0">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Languages className="w-3 h-3 text-blue-400" /> Try Spoken Prompts
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 text-left">
                <span>🇮🇳 <strong>Hindi:</strong> "नमस्ते, राजेश कुमार के लिए डॉक्टर अपॉइंटमेंट बुक करें"</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 text-left">
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
