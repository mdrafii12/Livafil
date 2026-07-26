import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Bug, CheckCircle2, ChevronDown, ChevronUp, Clock, 
  HelpCircle, History, Info, LifeBuoy, Mail, MessageSquare, 
  Phone, Send, Sparkles, Volume2 
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { SupportTicket, TicketCategory, TicketPriority } from '../types';
import { useRealtimeTable } from '../hooks/useRealtimeTable';

interface FAQ {
  q: string;
  a: string;
  cat: string;
}

export default function SupportPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [tktTitle, setTktTitle] = useState('');
  const [tktDesc, setTktDesc] = useState('');
  const [tktCat, setTktCat] = useState<TicketCategory>('Technical');
  const [tktPri, setTktPri] = useState<TicketPriority>('Medium');

  // Interactive thread state
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [replyMsg, setReplyMsg] = useState('');

  // Knowledge base search
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null);

  // Load active ticket queues
const syncTickets = async () => {
    try {
      setTickets(await db.getSupportTickets());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncTickets();
  }, []);

// NEW: re-run syncTickets whenever any support ticket or reply changes,
// so a platform admin's reply shows up here live.
useRealtimeTable('support_tickets', syncTickets);
useRealtimeTable('ticket_replies', syncTickets);

 const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktTitle.trim() || !tktDesc.trim() || !profile?.pharmacy_id) return;

    try {
      await db.addSupportTicket(profile.pharmacy_id, {
        title: tktTitle,
        category: tktCat,
        priority: tktPri,
        description: tktDesc
      });

      setTktTitle('');
      setTktDesc('');
      await syncTickets();
      triggerToast('Your support ticket has been raised.');
    } catch (err) {
      console.error(err);
    }
  };

 const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMsg.trim() || !profile) return;

    try {
      await db.addTicketReply(selectedTicketId, `${profile.name} (${profile.role})`, replyMsg);
      setReplyMsg('');
      await syncTickets();
      triggerToast('Response added to ticket conversation thread.');
    } catch (err) {
      console.error(err);
    }
  };

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // FAQ Knowledge Base Seed
  const faqs: FAQ[] = [
    {
      q: 'How does the B2B Exchange masking mechanism protect my pharmacy?',
      a: 'Livafil uses a secure Double-Blind Masking architecture. When you post a near-expiry listing, your pharmacy name and exact coordinates are completely masked to prospective buyers. Only when both parties mutually consent to a transaction/swap do secure HIPAA credentials disclose details.',
      cat: 'Exchange Compliance'
    },
    {
      q: 'What is the return window policy for Pfizer or GSK supplier batches?',
      a: 'Standard pharmaceutical return regulations permit full/partial capital reimbursement for sealed, unopened batches returned between 30 and 90 days before their listed expiration dates. Select "Supplier Return" on the Recovery Center to initialize return dispatch labels automatically.',
      cat: 'Returns'
    },
    {
      q: 'Can I import supplier inventory or categories via CSV files?',
      a: 'Yes, bulk importing is supported. Go to Categories or Suppliers and click the "Upload CSV" button to ingest drug catalogs, manufacturers, and stock balances in 1-click.',
      cat: 'Inventory'
    },
    {
      q: 'How are tax write-off credits calculated for donated expiring drugs?',
      a: 'Medicines donated to local public health clinics or verified non-profit NGOs qualify for corporate tax deductions under IRC Section 170(e)(3) as a direct write-off on inventory depreciation. Livafil logs the exact acquisition cost basis in your Recovery Ledger.',
      cat: 'Donations'
    }
  ];

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="support-hub-root">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-emerald-200/50 dark:border-emerald-900/40">
              <LifeBuoy className="h-3.5 w-3.5" />
              SaaS Helpdesk Active
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Support Hub &amp; Communications</h1>
          <p className="text-sm text-gray-500">Access our Knowledge Base, raise support tickets, and configure B2B channel communication preferences.</p>
        </div>
      </div>

      {/* FLOAT TOAST */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center gap-2.5 text-xs font-bold animate-slideIn shadow-xs" id="support-toast">
          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ACTIVE BROADCAST ANNOUNCEMENT BAR */}
      <div className="p-4 bg-blue-600 rounded-2xl text-white border border-transparent flex items-start gap-3.5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Volume2 className="h-24 w-24" />
        </div>
        <div className="p-2 bg-white/10 rounded-xl shrink-0 mt-0.5 text-white">
          <Volume2 className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-extrabold uppercase tracking-widest text-blue-100 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            V2.5 Update Released
          </p>
          <p className="font-medium text-blue-50 leading-relaxed max-w-2xl">
            Livafil v2.5 is now live! We have introduced the multi-tenant Recovery Center dashboard, real-time ticket messaging threads, and 1-click B2B Exchange Listing Wizards to salvage near-expiry drug inventories.
          </p>
        </div>
      </div>

      {/* THREE MODULE COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FAQ SEARCH & PREFERENCES CONFIG */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* FAQ KNOWLEDGE BASE */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Knowledge Base FAQ</h3>
            </div>
            
            {/* Search FAQ */}
            <input
              type="text"
              placeholder="Search compliance or return guides..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
            />

            {/* Accordion FAQ */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {faqs
                .filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))
                .map((faq, idx) => {
                  const isExpanded = expandedFaqIdx === idx;
                  return (
                    <div key={idx} className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                        className="w-full p-3 bg-slate-50/50 dark:bg-slate-950/40 text-left flex justify-between items-start gap-2 text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        <span>{faq.q}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          {faq.a}
                          <div className="mt-2 text-[9px] font-bold text-blue-600 dark:text-blue-400">Category: {faq.cat}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* COMMUNICATION CHANNEL PREFERENCES */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-blue-600" />
              B2B Communications Preference
            </h3>
            
            <div className="space-y-3.5 text-xs">
              
              {/* Daily email digest */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-850 dark:text-slate-200">Daily Expiry Email Digest</p>
                  <p className="text-[10px] text-slate-400 leading-snug">Get consolidated reports on expiring batches 90 days before exposure.</p>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded-sm focus:ring-blue-500"
                />
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

              {/* Exchange Matching alerts */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-850 dark:text-slate-200">Network B2B Match Alerts</p>
                  <p className="text-[10px] text-slate-400 leading-snug">Notify instantly when partner requested needs align with our surplus stock.</p>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded-sm focus:ring-blue-500"
                />
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

              {/* Future WhatsApp */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1 text-slate-500">
                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase">Future Architecture</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">WhatsApp B2B Gateway Dispatch</p>
                <p className="text-[10px] leading-relaxed">Secure integration for dispatching instant delivery status and swap receipts directly to messaging applications.</p>
              </div>

            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN: ACTIVE TICKETS HISTORY */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Tickets History</h3>
            <History className="h-4 w-4 text-gray-400" />
          </div>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {tickets.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className={`w-full text-left p-3.5 border rounded-xl space-y-2 transition-all flex flex-col ${
                  selectedTicketId === t.id
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20'
                }`}
              >
                <div className="flex justify-between items-start gap-2 w-full text-xs">
                  <span className="font-extrabold text-slate-850 dark:text-slate-150 truncate">{t.title}</span>
                  <span className={`px-2 py-0.5 rounded-xs text-[8px] font-extrabold shrink-0 uppercase ${
                    t.status === 'Resolved' 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : t.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{t.description}</p>

                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2 w-full">
                  <span>Priority: {t.priority}</span>
                  <span className="font-semibold text-slate-400 font-mono">ID: {t.id}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL RESOLUTION VIEW / RAISE NEW TICKET FORM */}
        <div className="lg:col-span-4 space-y-6">
          
          {selectedTicket ? (
            /* Ticket Conversational Thread Viewer */
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Ticket Thread</h3>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedTicket.title}</p>
                </div>
                <button
                  onClick={() => setSelectedTicketId('')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Close Thread
                </button>
              </div>

              {/* Thread List */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {/* original description */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                  <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">Original Description</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{selectedTicket.description}</p>
                </div>

                {/* replies */}
                {selectedTicket.replies.map((rep, idx) => {
                  const isAdmin = rep.sender.includes('Admin') || rep.sender.includes('Support') || rep.sender.includes('Agent');
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 border rounded-xl space-y-1 text-xs max-w-[85%] ${
                        isAdmin 
                          ? 'bg-blue-50/50 border-blue-100/30 dark:bg-blue-950/20 dark:border-blue-900/30' 
                          : 'ml-auto bg-slate-50/40 border-slate-100 dark:bg-slate-900/20 dark:border-slate-850'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                        <span>{rep.sender}</span>
                        <span>{new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{rep.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Send message form */}
              <form onSubmit={handleReplySubmit} className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type reply to support agent..."
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shrink-0 transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* RAISE NEW TICKET FORM */
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-blue-600" />
                Raise Support Ticket
              </h3>

              <form onSubmit={handleRaiseTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Ticket Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Supplier invoice mismatch on Amoxil..."
                    value={tktTitle}
                    onChange={(e) => setTktTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                    <select
                      value={tktCat}
                      onChange={(e) => setTktCat(e.target.value as TicketCategory)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Billing">Billing</option>
                      <option value="Bug">Bug Report</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="Feedback">Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                    <select
                      value={tktPri}
                      onChange={(e) => setTktPri(e.target.value as TicketPriority)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Detailed Description</label>
                  <textarea
                    placeholder="Provide exact details, drug batch numbers, or steps to reproduce..."
                    value={tktDesc}
                    onChange={(e) => setTktDesc(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Raise Helpdesk Ticket</span>
                </button>
              </form>
            </div>
          )}

          {/* SLA DISCLOSURE COMPLIANCE */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">HIPAA SLA Guarding</p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              For security, do not disclose patient prescription names, clinical histories, or private drug registry numbers in support ticket logs. Livafil complies with ISO 27001 data center standards.
            </p>
            <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>SLA Response: &lt; 1 hour</span>
              <span>Encrypted Node Session</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
