import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, Building2, CheckCircle2, Cpu, Eye, 
  HelpCircle, History, Landmark, Loader2, Play, RefreshCw, Send, 
  Server, Shield, ShieldAlert, Sparkles, ToggleLeft, ToggleRight, 
  Users, Wallet 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, 
  PieChart, Pie, Cell 
} from 'recharts';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { 
  AuditLog, FeatureFlag, Pharmacy, SupportTicket, User, 
  SubscriptionPlan, SubscriptionStatus 
} from '../types';
import { formatCurrency } from '../utils/currency';
import { supabase } from '../lib/supabaseClient';
import { useRealtimeTable } from '../hooks/useRealtimeTable';

export default function SuperAdminPage() {
  const { profile } = useAuth();

  if (!profile?.is_platform_admin) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto bg-red-50 p-2.5 rounded-full" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Restricted Area</h2>
        <p className="text-xs text-gray-500">This is a platform-owner view. Your account doesn't have admin access.</p>
      </div>
    );
  }
  // DB States
  const [users, setUsers] = useState<User[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Interactive controls
  const [activeTab, setActiveTab] = useState<'overview' | 'pharmacies' | 'tickets' | 'flags' | 'audit'>('overview');
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter and search
  const [auditCategory, setAuditCategory] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [pharmacySearch, setPharmacySearch] = useState<string>('');

  // Fetch / Sync DB Data
  const syncDB = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/data', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();

      if (json.status !== 'success') {
        console.error('Admin data fetch failed:', json.message);
        return;
      }

      setPharmacies(json.pharmacies);
      setUsers(json.profiles.filter((p: any) => p.pharmacy_id));
      setTickets(json.tickets);
      setFeatureFlags([]);
      setAuditLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncDB();
  }, []);

  useRealtimeTable('pharmacies', syncDB);
  useRealtimeTable('support_tickets', syncDB);
  useRealtimeTable('profiles', syncDB);

  // System Stats Calculations
  const mrr = 149 * 2 + 49 * 1; // 2 Pros (₹149) and 1 Starter (₹49) as a simulation
  const arr = mrr * 12;
  const systemHealthScore = 98.4;
 const [activeExchangeListingsCount, setActiveExchangeListingsCount] = useState(0);
  useEffect(() => {
    db.getExchangeListings().then(l => setActiveExchangeListingsCount(l.length)).catch(console.error);
  }, []);
  // Toggle Feature Flag
 const handleToggleFlag = (key: string, currentValue: boolean) => {
    setFeatureFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !currentValue } : f));
    triggerSuccess('Feature flag setting updated (local preview only — not yet wired to a real backend toggle).');
  };

  // Support Ticket reply handling
 const handleTicketReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;

    try {
      await db.addTicketReply(selectedTicketId, `${profile?.name} (Super Admin)`, replyMessage);
      await db.adminUpdateTicketStatus(selectedTicketId, 'In Progress');

      setReplyMessage('');
      await syncDB();
      triggerSuccess('Response dispatched successfully to tenant dashboard.');
    } catch (err) {
      console.error(err);
    }
  };
const handleUpdateTicketStatus = async (id: string, status: 'Open' | 'In Progress' | 'Resolved') => {
    try {
      await db.adminUpdateTicketStatus(id, status);
      await syncDB();
      triggerSuccess(`Support ticket status resolved to [${status}].`);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Chart distribution data
  const subscriptionChartData = [
    { name: 'Trialing', value: 4, cost: 0 },
    { name: 'Starter (₹49)', value: 8, cost: 392 },
    { name: 'Professional (₹149)', value: 12, cost: 1788 },
    { name: 'Enterprise (₹499)', value: 3, cost: 1497 }
  ];

  const MRR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesCategory = auditCategory === 'all' || log.category === auditCategory;
    const matchesSearch = auditSearch === '' || 
      log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="super-admin-portal-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Global Administration Control
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Super Admin Portal</h1>
          <p className="text-sm text-gray-500">Configure global configurations, manage tenant license approvals, and inspect platform system telemetry logs.</p>
        </div>
        <button
          onClick={syncDB}
          className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 font-bold text-xs flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Synchronize Node Cluster</span>
        </button>
      </div>

      {/* FLOAT ALERT */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center gap-2.5 text-xs font-bold animate-slideIn shadow-xs" id="admin-success-toast">
          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ADMIN METRICS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Active Tenants</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{pharmacies.length}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Licensed pharmacies connected</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100/30 dark:border-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated MRR</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCurrency(mrr)}</h3>
            <p className="text-[10px] text-purple-600 font-medium mt-1">ARR Projected: {formatCurrency(arr)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100/30 dark:border-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Telemetry</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{systemHealthScore}%</h3>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">99.98% SLA Guaranteed</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/30 dark:border-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">B2B Listings</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{activeExchangeListingsCount}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Active listings in network</p>
          </div>
        </div>

      </div>

      {/* TAB SELECT NAVIGATION */}
      <div className="border-b border-gray-200 dark:border-gray-850 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-extrabold border-b-2 px-1 transition-all whitespace-nowrap ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('pharmacies')}
          className={`pb-3 text-xs font-extrabold border-b-2 px-1 transition-all whitespace-nowrap ${
            activeTab === 'pharmacies' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Tenant Pharmacies
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 text-xs font-extrabold border-b-2 px-1 transition-all whitespace-nowrap ${
            activeTab === 'tickets' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Support Ticket Queue ({tickets.filter(t => t.status !== 'Resolved').length})
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`pb-3 text-xs font-extrabold border-b-2 px-1 transition-all whitespace-nowrap ${
            activeTab === 'flags' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Feature Flag Console
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-extrabold border-b-2 px-1 transition-all whitespace-nowrap ${
            activeTab === 'audit' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Platform Audit Trail
        </button>
      </div>

      {/* CORE SPLIT SCREEN VIEW DETAILS */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
            
            {/* Subscription Distribution Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">SaaS Monthly Subscription Revenue Distribution</h3>
              <p className="text-xs text-gray-500">Distribution analysis of subscriber endpoints across starter, professional, and enterprise tiers.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 h-56 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subscriptionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="cost"
                      >
                        {subscriptionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={MRR_COLORS[index % MRR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="md:col-span-6 space-y-3 text-xs">
                  {subscriptionChartData.map((item, idx) => (
                    <div key={item.name} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: MRR_COLORS[idx % MRR_COLORS.length] }}></span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(item.cost)}/mo ({item.value} members)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform System Telemetry */}
            <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active System Telemetry</h3>
              
              <div className="space-y-4 text-xs">
                {/* Latency Widget */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">Node API Latency</span>
                    <span className="text-emerald-500 font-extrabold">12ms (Optimal)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-1/5"></div>
                  </div>
                </div>

                {/* Cloud memory Widget */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">Host Memory Usage</span>
                    <span className="text-blue-500 font-extrabold">42.1% (3.3 GB of 8 GB)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[42%]"></div>
                  </div>
                </div>

                {/* Database Conns Widget */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">PostgreSQL Connection Pools</span>
                    <span className="text-purple-500 font-extrabold">18 Active of 100 max</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full w-[18%]"></div>
                  </div>
                </div>

                {/* Server Status Indicators */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5" />
                      API Gateway Router US-East
                    </span>
                    <span className="text-emerald-500 font-bold">● ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5" />
                      Stripe Gateway Webhooks
                    </span>
                    <span className="text-emerald-500 font-bold">● ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      HIPAA Encryption HSM Node
                    </span>
                    <span className="text-emerald-500 font-bold">● ONLINE</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TENANT PHARMACIES */}
        {activeTab === 'pharmacies' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Tenant Register</h3>
                <p className="text-xs text-gray-500 mt-0.5">Approve, monitor, or manage configurations for subscribed pharmacy databases.</p>
              </div>
              <input
                type="text"
                placeholder="Search pharmacies by license or name..."
                value={pharmacySearch}
                onChange={(e) => setPharmacySearch(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 w-full sm:w-72"
              />
            </div>

            <div className="overflow-x-auto border border-gray-50 dark:border-gray-800/60 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-800/60 font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Pharmacy Info</th>
                    <th className="py-3 px-4">Owner Name</th>
                    <th className="py-3 px-4">Drug License Number</th>
                    <th className="py-3 px-4">GST / Tax ID</th>
                    <th className="py-3 px-4">Contact Coordinates</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-850 text-gray-600 dark:text-gray-300">
                  {pharmacies
                    .filter(p => p.name.toLowerCase().includes(pharmacySearch.toLowerCase()) || p.licenseNumber.toLowerCase().includes(pharmacySearch.toLowerCase()))
                    .map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                          <p>{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.address}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold">{p.ownerName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{p.licenseNumber}</td>
                        <td className="py-3 px-4 font-mono">{p.gst}</td>
                        <td className="py-3 px-4 leading-normal">
                          <p>{p.email}</p>
                          <p className="text-[10px] text-gray-400">{p.phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40">
                            Approved &amp; Active
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SUPPORT TICKET WORKFLOW */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
            
            {/* Tickets Left List */}
            <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Global Helpdesk Tickets</h3>
              
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-3.5 border rounded-xl space-y-2 transition-all flex flex-col ${
                      selectedTicketId === t.id
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full text-xs">
                      <span className="font-extrabold text-slate-850 dark:text-slate-150 truncate">{t.title}</span>
                      <span className={`px-2 py-0.5 rounded-xs text-[9px] font-extrabold shrink-0 ${
                        t.priority === 'Urgent' || t.priority === 'High'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{t.description}</p>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2 w-full">
                      <span>Category: {t.category}</span>
                      <span className={`font-bold uppercase ${t.status === 'Resolved' ? 'text-emerald-500' : 'text-blue-500'}`}>
                        {t.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Reply Right area */}
            <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs min-h-96">
              {selectedTicket ? (
                <div className="space-y-6">
                  
                  {/* Summary */}
                  <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-gray-950 dark:text-white">{selectedTicket.title}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-semibold">Ticket: {selectedTicket.id} • Opened on {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'Resolved')}
                        className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] rounded-lg border border-emerald-200/20"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'Open')}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg border border-slate-200/20"
                      >
                        Re-Open
                      </button>
                    </div>
                  </div>

                  {/* Thread messages logs */}
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {/* Initial Description */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                      <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">Original Report</span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{selectedTicket.description}</p>
                    </div>

                    {/* Replies */}
                    {selectedTicket.replies.map((rep, idx) => {
                      const isAdmin = rep.sender.includes('Admin') || rep.sender.includes('Support') || rep.sender.includes('Agent');
                      return (
                        <div 
                          key={idx} 
                          className={`p-3 border rounded-xl space-y-1 text-xs max-w-[85%] ${
                            isAdmin 
                              ? 'ml-auto bg-blue-50/50 border-blue-100/50 dark:bg-blue-950/20 dark:border-blue-900/30' 
                              : 'bg-slate-50/40 border-slate-100 dark:bg-slate-900/20 dark:border-slate-850'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                            <span>{rep.sender}</span>
                            <span>{new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{rep.message}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleTicketReplySubmit} className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Submit Support Response</label>
                    <textarea
                      placeholder="Type official system support message to dispatch..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
                      >
                        <Send className="h-4 w-4" />
                        <span>Dispatch Reply</span>
                      </button>
                    </div>
                  </form>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-gray-400">
                  <HelpCircle className="h-10 w-10 text-slate-300 mb-3" />
                  <span>Select any ticket from the left queue to coordinate responses.</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: FEATURE FLAG CONSOLE */}
        {activeTab === 'flags' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Corporate Feature Flag Toggles</h3>
              <p className="text-xs text-gray-500 mt-0.5">Toggle live system features instantly across all active node sessions without re-deploying code.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featureFlags.map(f => (
                <div key={f.key} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-start justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-950 dark:text-white">{f.name}</span>
                      <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-sm text-[8px] font-extrabold uppercase">
                        {f.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{f.description}</p>
                    <p className="text-[10px] font-mono font-bold text-gray-400">Flag Key: {f.key}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleToggleFlag(f.key, f.enabled)}
                    className="shrink-0 transition-transform active:scale-95"
                  >
                    {f.enabled ? (
                      <ToggleRight className="h-10 w-10 text-blue-600" strokeWidth={1.5} />
                    ) : (
                      <ToggleLeft className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PLATFORM AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Audit Ledger</h3>
                <p className="text-xs text-gray-500 mt-0.5">Filterable record of every administrative, login, and listing actions across tenants.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <select
                  value={auditCategory}
                  onChange={(e) => setAuditCategory(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Security">Security</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Exchange">Exchange</option>
                  <option value="Subscription">Subscription</option>
                  <option value="User">User</option>
                </select>
                <input
                  type="text"
                  placeholder="Search logs by action or details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-50 dark:border-gray-800/60 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-855 border-b border-gray-100 dark:border-gray-800/60 font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Address / Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-850 text-gray-600 dark:text-gray-300">
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900 dark:text-white">{log.username}</p>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">{log.role}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-extrabold uppercase ${
                          log.category === 'Security' 
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : log.category === 'Subscription'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium max-w-xs truncate" title={log.details}>{log.details}</td>
                      <td className="py-3 px-4 leading-normal font-medium">
                        <p className="font-mono">{log.ipAddress}</p>
                        <p className="text-[10px] text-gray-400">{log.device}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
