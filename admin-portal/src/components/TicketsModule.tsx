import React, { useState } from 'react';
import { HelpCircle, MessageSquare, Send, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { SupportTicketRecord } from '../lib/supabase';

export default function TicketsModule() {
  const [replyText, setReplyText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('t1');
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([
    {
      id: 't1',
      pharmacy_id: 'ph_demo_01',
      subject: 'Custom Receipt Header Configuration',
      message: 'Hello Support, how can we update our printed receipt logo and GSTIN header?',
      status: 'In Progress',
      priority: 'Medium',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 't2',
      pharmacy_id: 'ph_demo_02',
      subject: 'ElevenLabs Voice Agent Multilingual Setup',
      message: 'Need help customizing doctor fees in the voice appointment tool call response.',
      status: 'Open',
      priority: 'High',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ]);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;

    setTickets(prev => prev.map(t => t.id === selectedId ? { ...t, status: 'Resolved' } : t));
    setReplyText('');
    setSuccess('Reply sent to clinic dashboard and ticket marked as Resolved!');
    setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Support Desk & Ticket Resolution
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {tickets.filter(t => t.status !== 'Resolved').length} Open
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Respond to tenant inquiries, billing questions, and integration support.
        </p>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="space-y-3">
          {tickets.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                selectedId === t.id
                  ? 'bg-slate-900 border-blue-500/50 shadow-xl'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  t.priority === 'High' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {t.priority} Priority
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  t.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {t.status}
                </span>
              </div>
              <h4 className="font-bold text-xs text-white">{t.subject}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">{t.message}</p>
            </div>
          ))}
        </div>

        {/* Ticket Reply Box */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" /> Super Admin Ticket Resolution
          </h3>

          {selectedId ? (
            <form onSubmit={handleSendReply} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <p className="font-bold text-white mb-1">
                  Subject: {tickets.find(t => t.id === selectedId)?.subject}
                </p>
                <p>{tickets.find(t => t.id === selectedId)?.message}</p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1">Dispatch Response</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type official response to tenant pharmacy..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send Response & Mark Resolved
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500">Select a support ticket to respond.</p>
          )}
        </div>
      </div>
    </div>
  );
}
