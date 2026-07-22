import React, { useState, useEffect } from 'react';
import { AlarmClock, Send, Search, Info, Loader2, CheckCircle, Clock } from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { ReminderSchedule } from '../types';
import { supabase } from '../lib/supabaseClient';
import { sendWhatsAppMessage } from '../services/whatsapp';

export default function RemindersPage() {
  const { profile } = useAuth();
  const [reminders, setReminders] = useState<ReminderSchedule[]>([]);
  const [prescriptions, setPrescriptions] = useState<import('../types').Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.pharmacy_id) {
      loadReminders();
    }
  }, [profile]);

  const loadReminders = async () => {
    if (!profile?.pharmacy_id) return;
    try {
      setLoading(true);
      const [rData, pData] = await Promise.all([
        db.getReminderSchedules(profile.pharmacy_id),
        db.getPrescriptions(profile.pharmacy_id)
      ]);
      setReminders(rData);
      setPrescriptions(pData);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (r: ReminderSchedule) => {
    setUpdatingId(r.id);
    try {
      const pharmacyName = profile?.pharmacy_name || 'your pharmacy';
      const message = `Hi ${r.customerName}, your ${r.medicineName} refill may be due soon. Reply to reorder or visit ${pharmacyName}.`;
      
      // Update status in DB
      await db.updateReminderStatus(r.id, 'Sent');
      
      // Open WhatsApp deep link
      sendWhatsAppMessage(r.customerPhone, message);
      
      // Update local state
      setReminders(prev => prev.map(rem => rem.id === r.id ? { ...rem, status: 'Sent' } : rem));
    } catch (err: any) {
      console.error('Failed to update status or send message:', err);
      alert('Failed to send reminder via WhatsApp API. Check API Secrets or server logs.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = reminders.filter(r => {
    const p = r.prescriptionId ? prescriptions.find(x => x.id === r.prescriptionId) : null;
    if (p && p.status === 'Completed') return false;
    
    return r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           r.customerPhone.includes(searchQuery) ||
           r.medicineName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Ready':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"><Clock className="w-3 h-3" /><span>Pending</span></span>;
      case 'Sent':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><Send className="w-3 h-3" /><span>Sent</span></span>;
      case 'Confirmed':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="w-3 h-3" /><span>Confirmed</span></span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <AlarmClock className="w-8 h-8 text-blue-600" />
            <span>Refill Reminders</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track and send refill reminders to your customers.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, or medicine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Medicine</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading reminders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <AlarmClock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No reminders found</p>
                    <p className="text-sm text-gray-400 mt-1">New reminders will appear here automatically when you bill refill items.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {r.customerName}
                    </td>
                    <td className="px-6 py-4">
                      {r.customerPhone}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-blue-600 dark:text-blue-400">{r.medicineName}</div>
                      {(() => {
                        const p = r.prescriptionId ? prescriptions.find(x => x.id === r.prescriptionId) : null;
                        if (p) {
                          return (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Filled: {p.filledDays}/{p.totalDurationDays} days
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(r.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSendReminder(r)}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {updatingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{r.status === 'Sent' ? 'Resend' : 'Send'} Reminder</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
