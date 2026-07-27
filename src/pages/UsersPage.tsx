import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, UserPlus, Shield, Key, Mail, CheckCircle2, 
  Trash2, X, Plus, AlertCircle, Loader2, Edit3, Clock
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';

const inviteSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.enum(['Owner', 'Manager', 'Staff', 'OP Staff']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function UsersPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'Staff' },
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([db.getTeamMembers(), db.getPendingInvites()]);
      setMembers(m);
      setInvites(i);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (data: InviteFormValues) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) throw new Error('No pharmacy linked to this account.');

      const alreadyMember = members.some(m => m.email.toLowerCase() === data.email.toLowerCase());
      const alreadyInvited = invites.some(i => i.email.toLowerCase() === data.email.toLowerCase());
      if (alreadyMember || alreadyInvited) {
        alert('This email is already a team member or has a pending invite.');
        setIsLoading(false);
        return;
      }

      // We need the pharmacy's real name for the invite screen the new person will see.
      // profile doesn't carry it directly, so pull it fresh.
      const pharmacy = await db.getMyPharmacy(profile.pharmacy_id);

      // TODO: SUPABASE - insert staff_invites record with role field, send invite link
      await db.inviteStaffMember(profile.pharmacy_id, pharmacy.name, data.name, data.email, data.role);

      await refreshData();
      setFormOpen(false);
      reset();
      setNotification(`Invite created for ${data.email}. Ask them to sign up at /register with this exact email — they'll be prompted to join automatically.`);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to create invite.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'Owner' | 'Manager' | 'Staff') => {
    if (memberId === profile?.id) {
      alert('You cannot modify your own administrative role.');
      return;
    }
    await db.updateStaffRole(memberId, newRole);
    await refreshData();
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (memberId === profile?.id) {
      alert('You cannot revoke your own access.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${name} from this pharmacy? They will lose access immediately.`)) {
      await db.removeStaffMember(memberId);
      await refreshData();
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (window.confirm('Cancel this pending invite?')) {
      await db.cancelInvite(inviteId);
      await refreshData();
    }
  };

  const isAuthorized = profile?.role === 'Owner' || profile?.role === 'Manager';

  if (!isAuthorized) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4 animate-fadeIn">
        <Shield className="h-12 w-12 text-red-500 mx-auto bg-red-50 p-2.5 rounded-full" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Access Violation</h2>
        <p className="text-xs text-gray-500">Only pharmacy Owners or authorized Managers can invite, provision, or adjust staff roles.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading team...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Staff Management</h1>
          <p className="text-sm text-gray-500">Invite team members and manage their roles.</p>
        </div>
        <button 
          onClick={() => setFormOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors self-end sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Employee</span>
        </button>
      </div>

      {/* FLOATING NOTIFICATION */}
      {notification && (
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2.5 text-xs font-semibold animate-slideIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TEAM MEMBERS TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 flex items-center space-x-2">
          <Users className="h-4.5 w-4.5 text-gray-400" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Active Team Members</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Email</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
              {members.map((u) => {
                const isSelf = u.id === profile?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-950/60 rounded-full flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400">
                          {u.name.charAt(0)}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {u.name} {isSelf && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-semibold ml-1">You</span>}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-[11px] text-gray-500">{u.email}</td>
                    <td className="py-4 px-5">
                      {isSelf ? (
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{u.role}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-transparent text-xs font-semibold text-gray-700 dark:text-gray-200 focus:border-blue-500"
                        >
                          <option value="Owner">Owner (Full root access)</option>
                          <option value="Manager">Manager (Audits and stock CRUD)</option>
                          <option value="Staff">Staff (Inventory count edits)</option>
                          <option value="OP Staff">OP Staff (Dispensing & Billing Only)</option>
                        </select>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {!isSelf && (
                        <button 
                          onClick={() => handleRemoveMember(u.id, u.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Remove access"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No team members yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PENDING INVITES TABLE */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 flex items-center space-x-2">
            <Clock className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Pending Invites</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
            {invites.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{inv.name} <span className="text-gray-400 font-normal">({inv.role})</span></p>
                  <p className="text-gray-500 font-mono text-[11px]">{inv.email}</p>
                </div>
                <button
                  onClick={() => handleCancelInvite(inv.id)}
                  className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold"
                >
                  Cancel Invite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVITE DIALOG BOX */}
      {formOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                Invite New Personnel
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleInvite)} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-700 dark:text-blue-300">
                This creates a pending invite. The person must sign up at <strong>/register</strong> using this exact email — they'll be automatically prompted to join your pharmacy.
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  {...register('name')}
                  placeholder="E.g. Priya Sharma"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                <input 
                  type="email" 
                  {...register('email')}
                  placeholder="priya@pharmacy.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
                {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role</label>
                <select 
                  {...register('role')}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                >
                  <option value="Staff">Staff (Perform shelf audits and logs)</option>
                  <option value="OP Staff">OP Staff (Dispensing & Billing Only)</option>
                  <option value="Manager">Manager (Edit medicines, view reports, change staff)</option>
                  <option value="Owner">Owner (Root access to settings and keys)</option>
                </select>
                {errors.role && <p className="text-[10px] text-red-500 mt-0.5">{errors.role.message}</p>}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}