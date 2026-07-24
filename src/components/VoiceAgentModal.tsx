import React, { useState } from 'react';
import { Sparkles, X, RefreshCw, PhoneCall, ShieldCheck } from 'lucide-react';

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
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-white">
        
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                ElevenLabs Voice Agent
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {mode === 'opd' ? 'Hindi/Telugu OPD' : mode === 'billing' ? 'Voice Billing' : 'Live'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Powered by ElevenLabs Multilingual Conversational AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1"
              title="Configure ElevenLabs Agent ID"
            >
              <RefreshCw className="h-4 w-4 text-blue-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ElevenLabs Settings Drawer */}
        {showConfig && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              ElevenLabs Agent ID
            </label>
            <input
              type="text"
              value={elevenLabsAgentId}
              onChange={(e) => {
                setElevenLabsAgentId(e.target.value);
                localStorage.setItem('livafil_elevenlabs_agent_id', e.target.value);
              }}
              placeholder="Paste Agent ID (agent_...)"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* ElevenLabs ConvAI Interactive Widget Area */}
        <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-950/60 min-h-[260px]">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-widest bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-800/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
            ElevenLabs Agent Connected
          </div>

          {/* Official ElevenLabs Web Component Widget */}
          <div className="py-4 flex justify-center scale-125">
            {React.createElement('elevenlabs-convai', { 'agent-id': elevenLabsAgentId })}
          </div>

          <p className="text-xs text-slate-400 mt-4 max-w-xs leading-relaxed">
            Click the phone icon above to start talking with your ElevenLabs Voice Agent in <strong className="text-slate-200">Hindi (हिंदी)</strong>, <strong className="text-slate-200">Telugu (తెలుగు)</strong>, or <strong className="text-slate-200">English</strong>.
          </p>
        </div>

        {/* Language Indicator Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 text-blue-400" /> Multi-lingual Voice Call
          </span>
          <span className="font-semibold text-slate-300">Hindi • Telugu • English</span>
        </div>

      </div>
    </div>
  );
}
