import React from 'react';
import { 
  LayoutDashboard, Building2, Users, HelpCircle, Shield, 
  Activity, ArrowUpRight, Cpu, KeyRound, Sparkles, Terminal 
} from 'lucide-react';

export type AdminTab = 'overview' | 'pharmacies' | 'patients' | 'tickets' | 'security';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  tenantCount: number;
  ticketCount: number;
}

export default function AdminSidebar({ activeTab, setActiveTab, tenantCount, ticketCount }: AdminSidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard, badge: null },
    { id: 'pharmacies', label: 'Tenant Clinics & Pharmacies', icon: Building2, badge: tenantCount },
    { id: 'patients', label: 'UHID & Voice OPD Stream', icon: Users, badge: null },
    { id: 'tickets', label: 'Support Helpdesk', icon: HelpCircle, badge: ticketCount },
    { id: 'security', label: 'Security & Audit Logs', icon: Shield, badge: null },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/95 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
            Navigation Menu
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      active ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real-time Server Webhook Bridge Status Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> 24/7 Webhook Bridge
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <p className="text-[11px] text-emerald-300 font-mono font-semibold truncate">
            https://livafil.vercel.app/api/elevenlabs/webhook
          </p>
          <p className="text-[10px] text-slate-400">
            Vercel Serverless Function active with live Supabase database sync.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Livafil OS Suite:</span>
          <span className="text-blue-400 font-mono font-bold">v2.4.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Deployment:</span>
          <span className="text-emerald-400 font-mono font-bold">Vercel Enterprise</span>
        </div>
      </div>
    </aside>
  );
}
