import React, { useState } from 'react';
import { ShieldCheck, ToggleLeft, ToggleRight, Key, Cpu, Activity, Lock, Sparkles } from 'lucide-react';

export default function SecurityModule() {
  const [flags, setFlags] = useState([
    { id: 'f1', name: 'ElevenLabs Conversational Voice Agent', enabled: true, category: 'AI Tools' },
    { id: 'f2', name: 'Real-time Supabase Database Sync', enabled: true, category: 'Infrastructure' },
    { id: 'f3', name: 'POS Receipt Thermal Printing', enabled: true, category: 'Hardware' },
    { id: 'f4', name: 'Multilingual Spoken Prompts (Hindi/Telugu)', enabled: true, category: 'i18n' },
  ]);

  const toggleFlag = (id: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Security & Feature Flag Matrix
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Global platform toggles, security encryption settings, and audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Flags */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" /> Platform Feature Toggles
          </h3>

          <div className="space-y-3">
            {flags.map(f => (
              <div key={f.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-200">{f.name}</p>
                  <span className="text-[10px] text-slate-500 font-mono">{f.category}</span>
                </div>
                <button
                  onClick={() => toggleFlag(f.id)}
                  className="cursor-pointer text-slate-300 hover:text-white transition-colors"
                >
                  {f.enabled ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Summary */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Encryption & Access Control
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase">Database SSL/TLS</span>
              <p className="font-bold text-white">256-bit AES Encryption at Rest & In-Transit</p>
              <p className="text-[11px] text-slate-400">All patient records and prescriptions are encrypted in Supabase PostgreSQL storage.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-blue-400 font-extrabold uppercase">Vercel Webhook Security</span>
              <p className="font-bold text-white">24/7 CORS-Protected Webhook Bridge</p>
              <p className="text-[11px] text-slate-400">Pre-flight OPTIONS headers and parameter validation enabled.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
