import React from 'react';
import { Shield, Sparkles, Database, Bell, RefreshCw, Lock, ExternalLink } from 'lucide-react';

interface AdminHeaderProps {
  dbConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function AdminHeader({ dbConnected, onRefresh, isRefreshing }: AdminHeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Shield className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              Livafil Super Admin
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Platform Center
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Standalone Software Owner Portal</p>
          </div>
        </div>

        {/* Supabase Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Database:</span>
          {dbConnected ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live (Supabase Cloud)
            </span>
          ) : (
            <span className="text-amber-400 font-bold">Connecting...</span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh All Database Stats"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync DB'}</span>
        </button>

        <a
          href="https://livafil.vercel.app"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all"
        >
          <span>Main App</span>
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
        </a>

        {/* Owner Profile Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-extrabold shadow-md">
            SA
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-200 leading-tight">Software Owner</p>
            <p className="text-[10px] text-emerald-400 font-mono font-medium">super_admin@livafil.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
