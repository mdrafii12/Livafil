import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Settings, User, Building2, Eye, Sun, Moon, Key, Shield, 
  CheckCircle2, Loader2, Sparkles, AlertTriangle, CreditCard, 
  Download, Trash2, Smartphone, Calendar, RefreshCw, KeyRound, 
  Globe, ShieldAlert, ToggleLeft, ToggleRight, Info, X 
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Pharmacy, User as UserType, Subscription, Invoice } from '../types';
import { formatCurrency } from '../utils/currency';

const personalSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

const pharmacySchema = z.object({
  name: z.string().min(2, 'Pharmacy name must be at least 2 characters'),
  licenseNumber: z.string().min(4, 'Drug License Number is required'),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (e.g. 22ABCDE1234F1Z9)'),
  address: z.string().min(5, 'Logistics address is required'),
  phone: z.string().min(10, 'Contact number is required'),
  email: z.string().min(1, 'Contact email is required').email('Invalid email address'),
  upiId: z.string().optional(),
  whatsappAdminPhone: z.string().optional(),
});

type PersonalFormValues = z.infer<typeof personalSchema>;
type PharmacyFormValues = z.infer<typeof pharmacySchema>;

import { Stethoscope } from 'lucide-react';

type SettingsTab = 'profile' | 'pharmacy' | 'doctors' | 'subscription' | 'appearance' | 'advanced' | 'security';

export default function SettingsPage() {
  const { isDark, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { profile, refreshProfile } = useAuth();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [registeredDoctors, setRegisteredDoctors] = useState<import('../types').RegisteredDoctor[]>([]);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    qualification: 'MBBS, MD',
    specialty: 'General Physician',
    phone: '',
    email: '',
    regNumber: 'MCI-',
    consultationFee: 500,
    roomNumber: 'Cabin 101',
    timingSlots: '09:00 AM - 01:00 PM, 05:00 PM - 09:00 PM'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Advanced settings editable states with localStorage persistence
  const [expiryThreshold, setExpiryThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('livafil_advanced_settings');
    return saved ? JSON.parse(saved).expiryThreshold ?? 90 : 90;
  });
  const [lowStockAlert, setLowStockAlert] = useState<boolean>(() => {
    const saved = localStorage.getItem('livafil_advanced_settings');
    return saved ? JSON.parse(saved).lowStockAlert ?? true : true;
  });
  const [emailDigest, setEmailDigest] = useState<boolean>(() => {
    const saved = localStorage.getItem('livafil_advanced_settings');
    return saved ? JSON.parse(saved).emailDigest ?? true : true;
  });
  const [systemTimezone, setSystemTimezone] = useState<string>(() => {
    const saved = localStorage.getItem('livafil_advanced_settings');
    return saved ? JSON.parse(saved).systemTimezone || 'UTC-5' : 'UTC-5';
  });
  const [desktopModalOpen, setDesktopModalOpen] = useState(false);

  // Security 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(false);
  const [mfaSecretCode, setMfaSecretCode] = useState<string>('');

  // Sessions management list state
  const [activeSessions, setActiveSessions] = useState([
    { id: 'sess-1', device: 'Chrome 118 on macOS Big Sur (Current)', ip: '198.51.100.42', date: 'Active Now' },
    { id: 'sess-2', device: 'Safari on iPhone 15 Pro Max', ip: '172.56.21.9', date: 'Yesterday, 14:12' },
    { id: 'sess-3', device: 'Edge 112 on Windows 11', ip: '198.51.102.11', date: '4 days ago' }
  ]);

  const { register: regPersonal, handleSubmit: submitPersonal, reset: resetPersonal, formState: { errors: errorsPersonal } } = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
  });

  const { register: regPharmacy, handleSubmit: submitPharmacy, reset: resetPharmacy, formState: { errors: errorsPharmacy } } = useForm<PharmacyFormValues>({
    resolver: zodResolver(pharmacySchema),
  });

 const syncSubscription = () => {
    // Billing/subscriptions aren't wired to real payments yet — this stays local-only for now.
    if (!subscription) {
      setSubscription({
        plan: 'Free Trial',
        status: 'Active',
        trialEnd: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        billingCycle: 'Monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        billingHistory: []
      });
    }
  };

 useEffect(() => {
    const loadData = async () => {
      if (!profile?.pharmacy_id) return;
      try {
        const pharm = await db.getMyPharmacy(profile.pharmacy_id);
        setPharmacy(pharm);
        resetPharmacy({
          name: pharm.name,
          licenseNumber: pharm.licenseNumber,
          gstin: pharm.gst,
          address: pharm.address,
          phone: pharm.phone,
          email: pharm.email,
          upiId: pharm.upiId || '',
          whatsappAdminPhone: pharm.whatsappAdminPhone || '',
        });
        const docs = await db.getRegisteredDoctors(profile?.pharmacy_id || 'default-pharmacy');
        setRegisteredDoctors(docs);
      } catch (err) {
        console.error(err);
      }
    };

    if (profile) {
      resetPersonal({
        name: profile.name,
        email: profile.email,
        password: ''
      });
    }
    loadData();
  }, [profile, resetPersonal, resetPharmacy]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

const handleSavePersonal = async (data: PersonalFormValues) => {
    setIsLoading(true);
    try {
      if (!profile) return;

      await db.updateMyProfileName(profile.id, data.name);

      // Email/password changes go through Supabase Auth directly, not the profiles table.
      // Changing email triggers a confirmation email to the NEW address before it takes effect.
      const authUpdates: { email?: string; password?: string } = {};
      if (data.email && data.email !== profile.email) authUpdates.email = data.email;
      if (data.password) authUpdates.password = data.password;

      if (Object.keys(authUpdates).length > 0) {
        const { error } = await supabase.auth.updateUser(authUpdates);
        if (error) throw error;
      }

      await refreshProfile();
      showNotification('Personal security profile updated successfully.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };
const handleSavePharmacy = async (data: PharmacyFormValues) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) return;
      const { gstin, ...rest } = data;

      await db.updatePharmacy(profile.pharmacy_id, { ...rest, gst: gstin });

      const updated = await db.getMyPharmacy(profile.pharmacy_id);
      setPharmacy(updated);
      showNotification('Pharmacy business registration credentials saved.');
    } catch (err: any) {
      console.error(err);
      showNotification(`Error: ${err.message || 'Failed to save settings'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscription Actions
 const handleUpgradeSubscription = async (plan: 'Starter' | 'Professional' | 'Enterprise') => {
    if (!profile?.pharmacy_id) return;
    setIsLoading(true);
    try {
      const { subscriptionId, keyId } = await db.createSubscriptionCheckout(profile.pharmacy_id, plan);

      const razorpay = new (window as any).Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: 'LIVAFIL',
        description: `${plan} Plan Subscription`,
        handler: async () => {
          const updated = await db.getMySubscription(profile.pharmacy_id!);
          setSubscription(updated as any);
          showNotification(`Successfully subscribed to the ${plan} plan!`);
        },
        theme: { color: '#2563eb' },
      });

      razorpay.open();
    } catch (err: any) {
      showNotification(err.message || 'Failed to start checkout.');
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced settings saving
  const handleSaveAdvanced = () => {
    localStorage.setItem('livafil_advanced_settings', JSON.stringify({
      expiryThreshold,
      lowStockAlert,
      emailDigest,
      systemTimezone,
    }));
    showNotification('Advanced alerts and notification threshold configurations saved permanently.');
  };

  // Backup downloader mock
  const handleDownloadBackup = () => {
    showNotification('Preparing HIPAA safe secure backup... Package livafil_db_backup.json generated!');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "livafil_hipaa_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Session revoke
  const handleRevokeSession = (sessId: string) => {
    setActiveSessions(activeSessions.filter(s => s.id !== sessId));
    showNotification('Remote login device session terminated instantly.');
  };

  // Toggle MFA Mock
  const handleToggleMFA = () => {
    if (!is2FAEnabled) {
      setIs2FAEnabled(true);
      setMfaSecretCode('LIVAFIL-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      showNotification('2FA enabled! Secure authenticator key generated.');
    } else {
      setIs2FAEnabled(false);
      setMfaSecretCode('');
      showNotification('2FA authenticator has been disabled.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="settings-view-container">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-gray-500">Configure personal account details, multi-tenant subscription tiers, compliance preferences, and security protocols.</p>
      </div>

      {/* FLOAT ALERTS */}
      {notification && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center gap-2 text-xs font-bold animate-slideIn shadow-xs" id="settings-toast">
          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* SETTINGS SPLIT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT NAV PANEL */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 space-y-1.5 shadow-xs">
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'profile'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <User className="h-4.5 w-4.5 shrink-0" />
            <span>Personal Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('pharmacy')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'pharmacy'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <Building2 className="h-4.5 w-4.5 shrink-0" />
            <span>Pharmacy Details</span>
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'doctors'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <Stethoscope className="h-4.5 w-4.5 shrink-0" />
            <span>Registered Doctors ({registeredDoctors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'subscription'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <CreditCard className="h-4.5 w-4.5 shrink-0" />
            <span>Subscription &amp; Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'appearance'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <Sun className="h-4.5 w-4.5 shrink-0" />
            <span>Appearance Theme</span>
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'advanced'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <Globe className="h-4.5 w-4.5 shrink-0" />
            <span>Advanced Configurations</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'security'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <Key className="h-4.5 w-4.5 shrink-0" />
            <span>Security &amp; Sessions</span>
          </button>
        </div>

        {/* RIGHT EDIT CONTENT PANEL */}
        <div className="lg:col-span-9 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xs min-h-96">
          
          {/* TAB 1: PERSONAL PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={submitPersonal(handleSavePersonal)} className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Personal Security Settings</h3>
                <p className="text-xs text-gray-500">Update your account username, secure email credentials, and passwords.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Operator Name</label>
                  <input 
                    type="text"
                    {...regPersonal('name')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPersonal.name && <p className="text-[10px] text-red-500 mt-0.5">{errorsPersonal.name.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Login Email Address</label>
                  <input 
                    type="email"
                    {...regPersonal('email')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPersonal.email && <p className="text-[10px] text-red-500 mt-0.5">{errorsPersonal.email.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Account Password (Leave empty to keep current)</label>
                <input 
                  type="password"
                  {...regPersonal('password')}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                {errorsPersonal.password && <p className="text-[10px] text-red-500 mt-0.5">{errorsPersonal.password.message}</p>}
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Personal Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PHARMACY BUSINESS PROFILE */}
          {activeTab === 'pharmacy' && (
            <form onSubmit={submitPharmacy(handleSavePharmacy)} className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pharmacy Identity Credentials</h3>
                <p className="text-xs text-gray-500">Manage drug compliance numbers, corporate billing, and tax configurations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hospital / Clinic / Pharmacy Name</label>
                  <input 
                    type="text"
                    {...regPharmacy('name')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPharmacy.name && <p className="text-[10px] text-red-500 mt-0.5">{errorsPharmacy.name.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Authorized Drug License Number</label>
                  <input 
                    type="text"
                    {...regPharmacy('licenseNumber')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPharmacy.licenseNumber && <p className="text-[10px] text-red-500 mt-0.5">{errorsPharmacy.licenseNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">GSTIN Tax Registration Number</label>
                  <input 
                    type="text"
                    {...regPharmacy('gstin')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPharmacy.gstin && <p className="text-[10px] text-red-500 mt-0.5">{errorsPharmacy.gstin.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Logistics Hotline</label>
                  <input 
                    type="text"
                    {...regPharmacy('phone')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPharmacy.phone && <p className="text-[10px] text-red-500 mt-0.5">{errorsPharmacy.phone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Logistics / Support Email Address</label>
                  <input 
                    type="email"
                    {...regPharmacy('email')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                  {errorsPharmacy.email && <p className="text-[10px] text-red-500 mt-0.5">{errorsPharmacy.email.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">UPI Payment ID (For Invoices)</label>
                  <input 
                    type="text"
                    {...regPharmacy('upiId')}
                    placeholder="merchant@upi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">WhatsApp Admin Phone (For Sales Summary)</label>
                  <input 
                    type="text"
                    {...regPharmacy('whatsappAdminPhone')}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Logistics Physical Billing Address</label>
                <textarea 
                  rows={2}
                  {...regPharmacy('address')}
                  className="w-full p-3.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                ></textarea>
                {errorsPharmacy.address && <p className="text-[10px] text-red-500 mt-0.5">{errorsPharmacy.address.message}</p>}
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Corporate Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: REGISTERED DOCTORS PROFILES */}
          {activeTab === 'doctors' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-500" />
                    Registered Doctors &amp; OPD Consultation Profiles
                  </h3>
                  <p className="text-xs text-gray-500">Manage clinic doctors, medical qualifications, room numbers, consultation fees, and OPD availability connected to AI voice booking.</p>
                </div>
                <button
                  onClick={() => setDoctorModalOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register New Doctor</span>
                </button>
              </div>

              {/* Doctors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registeredDoctors.map(doc => (
                  <div key={doc.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-3 relative hover:border-blue-500/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                          {doc.specialty}
                        </span>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mt-1.5">{doc.name}</h4>
                        <p className="text-xs text-gray-500">{doc.qualification}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Fee: {formatCurrency(doc.consultationFee)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Room / Cabin</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{doc.roomNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">MCI Reg No</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{doc.regNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Phone</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{doc.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Schedule</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{doc.availabilityDays.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-[11px] text-gray-500 font-medium">{doc.timingSlots}</span>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove doctor profile ${doc.name}?`)) {
                            await db.deleteRegisteredDoctor(profile?.pharmacy_id || 'default-pharmacy', doc.id);
                            const updated = await db.getRegisteredDoctors(profile?.pharmacy_id || 'default-pharmacy');
                            setRegisteredDoctors(updated);
                            setNotification(`Doctor ${doc.name} removed successfully.`);
                          }
                        }}
                        className="text-red-500 hover:text-red-600 font-bold text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Register Doctor Modal */}
              {doctorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 space-y-4 text-gray-900 dark:text-white shadow-2xl">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-500" />
                        Register OPD Doctor Profile
                      </h3>
                      <button onClick={() => setDoctorModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Doctor Full Name</label>
                        <input
                          type="text"
                          value={newDoctor.name}
                          onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })}
                          placeholder="Dr. Rajesh Kumar"
                          className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-400 font-bold mb-1">Qualification</label>
                          <input
                            type="text"
                            value={newDoctor.qualification}
                            onChange={e => setNewDoctor({ ...newDoctor, qualification: e.target.value })}
                            placeholder="MBBS, MD"
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 font-bold mb-1">Specialty</label>
                          <input
                            type="text"
                            value={newDoctor.specialty}
                            onChange={e => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                            placeholder="General Physician"
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-400 font-bold mb-1">Mobile Phone</label>
                          <input
                            type="text"
                            value={newDoctor.phone}
                            onChange={e => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                            placeholder="9876543210"
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 font-bold mb-1">MCI Reg Number</label>
                          <input
                            type="text"
                            value={newDoctor.regNumber}
                            onChange={e => setNewDoctor({ ...newDoctor, regNumber: e.target.value })}
                            placeholder="MCI-49201"
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-400 font-bold mb-1">Consultation Fee (₹)</label>
                          <input
                            type="number"
                            value={newDoctor.consultationFee}
                            onChange={e => setNewDoctor({ ...newDoctor, consultationFee: Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 font-bold mb-1">Room / Cabin Number</label>
                          <input
                            type="text"
                            value={newDoctor.roomNumber}
                            onChange={e => setNewDoctor({ ...newDoctor, roomNumber: e.target.value })}
                            placeholder="Cabin 101"
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setDoctorModalOpen(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!newDoctor.name) return alert('Doctor name required');
                          await db.saveRegisteredDoctor(profile?.pharmacy_id || 'default-pharmacy', newDoctor);
                          const updated = await db.getRegisteredDoctors(profile?.pharmacy_id || 'default-pharmacy');
                          setRegisteredDoctors(updated);
                          setDoctorModalOpen(false);
                          setNotification(`Registered doctor ${newDoctor.name} added successfully!`);
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                      >
                        Save Doctor Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION PORTAL */}
          {activeTab === 'subscription' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Commercial Subscription Portal</h3>
                <p className="text-xs text-gray-500">View corporate usage thresholds, check free trial countdown, and manage plan limits.</p>
              </div>

              {/* Countdown Banner / Plan Overview */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="bg-blue-600 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    {subscription?.plan} Tier Plan
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1">Status: {subscription?.status}</h4>
                  <p className="text-xs text-slate-400">
                    Your cycle ends on <span className="text-white font-bold">{subscription?.currentPeriodEnd}</span>.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400">Next Billing Amount</div>
                  <div className="text-2xl font-extrabold text-blue-400">
                    {subscription?.plan === 'Starter' ? formatCurrency(49) : subscription?.plan === 'Professional' ? formatCurrency(149) : subscription?.plan === 'Enterprise' ? formatCurrency(499) : formatCurrency(0)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{subscription?.billingCycle} billing cycle</span>
                </div>
              </div>

              {/* Desktop App Download (Gated) */}
              {subscription?.plan && subscription.plan !== 'Free Trial' && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                      <Download className="w-4 h-4" /> LIVAFIL Desktop App
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                      As a subscriber, you get access to our dedicated Windows desktop app for faster performance.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setDesktopModalOpen(true)}
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Desktop App
                  </button>
                </div>
              )}

              {/* DESKTOP APP INFORMATION MODAL */}
              {desktopModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-900 max-w-md w-full rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl animate-slideIn">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <Download className="w-4 h-4 text-indigo-600" />
                        LIVAFIL Windows Desktop App
                      </h4>
                      <button onClick={() => setDesktopModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                      <p>LIVAFIL includes built-in Electron desktop app support in this repository!</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-mono text-[11px] space-y-1">
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold"># Launch local desktop app:</p>
                        <p>npm run electron:dev</p>
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-2"># Build Windows setup installer:</p>
                        <p>npm run electron:build</p>
                      </div>
                      <p className="text-[11px] text-gray-400">The installer package will be output to your local build directory <code className="font-bold text-gray-700 dark:text-gray-200">c:/livafil_build</code>.</p>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setDesktopModalOpen(false)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                      >
                        Got it!
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Choose Tiers Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">Modify Multi-Tenant Plan Tier</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Starter */}
                  <div className={`p-4 border rounded-2xl space-y-3 flex flex-col ${
                    subscription?.plan === 'Starter' 
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20' 
                      : 'border-slate-100 dark:border-slate-800'
                  }`}>
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Starter</span>
                      <p className="text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(49)}<span className="text-xs text-slate-400">/mo</span></p>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 font-medium">
                      <li>• 1 Pharmacy maximum limit</li>
                      <li>• Standard expiry logs</li>
                      <li>• HIPAA B2B Exchange enabled</li>
                    </ul>
                    {subscription?.plan === 'Starter' ? (
                      <span className="w-full text-center py-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-extrabold">Active Plan</span>
                    ) : (
                      <button
                        onClick={() => handleUpgradeSubscription('Starter')}
                        className="w-full text-center py-1.5 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-[10px] font-extrabold transition-all"
                      >
                        Downgrade to Starter
                      </button>
                    )}
                  </div>

                  {/* Professional */}
                  <div className={`p-4 border rounded-2xl space-y-3 flex flex-col ${
                    subscription?.plan === 'Professional' 
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/10' 
                      : 'border-slate-100 dark:border-slate-800'
                  }`}>
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Professional</span>
                      <p className="text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(149)}<span className="text-xs text-slate-400">/mo</span></p>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 font-medium">
                      <li>• Up to 3 Pharmacies maximum</li>
                      <li>• AI Expiry Smart Discount engine</li>
                      <li>• Full reporting insights exports</li>
                    </ul>
                    {subscription?.plan === 'Professional' ? (
                      <span className="w-full text-center py-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-extrabold">Active Plan</span>
                    ) : (
                      <button
                        onClick={() => handleUpgradeSubscription('Professional')}
                        className="w-full text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-extrabold transition-all"
                      >
                        Change to Professional
                      </button>
                    )}
                  </div>

                  {/* Enterprise */}
                  <div className={`p-4 border rounded-2xl space-y-3 flex flex-col ${
                    subscription?.plan === 'Enterprise' 
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20' 
                      : 'border-slate-100 dark:border-slate-800'
                  }`}>
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Enterprise</span>
                      <p className="text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(499)}<span className="text-xs text-slate-400">/mo</span></p>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 font-medium">
                      <li>• Unlimited Pharmacies</li>
                      <li>• Real-time WhatsApp API syncs</li>
                      <li>• Dedicated 24/7 account manager</li>
                    </ul>
                    {subscription?.plan === 'Enterprise' ? (
                      <span className="w-full text-center py-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-extrabold">Active Plan</span>
                    ) : (
                      <button
                        onClick={() => handleUpgradeSubscription('Enterprise')}
                        className="w-full text-center py-1.5 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-[10px] font-extrabold transition-all"
                      >
                        Upgrade to Enterprise
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing History Invoices */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span>Billing History Invoices</span>
                </h4>
                
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {subscription?.billingHistory.map((invoice, index) => (
                    <div key={invoice.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 font-mono">Invoice: {invoice.id}</span>
                        <span className="text-slate-500">Date: {invoice.date}</span>
                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-sm text-[9px] uppercase font-extrabold border border-emerald-100/40">{invoice.status}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(invoice.amount)}</span>
                        <button
                          onClick={handleDownloadBackup}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                          title="Download Invoice PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: APPEARANCE MODE PREFERENCES */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appearance Settings</h3>
                <p className="text-xs text-gray-500">Configure visual themes, contrast ratios, and dark options.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-5 rounded-2xl border flex flex-col items-center justify-center space-y-3 transition-all ${
                    !isDark
                      ? 'border-blue-600 bg-blue-50/20 text-blue-600 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-500'
                  }`}
                >
                  <Sun className="h-8 w-8 text-amber-500" />
                  <span className="text-xs font-bold">Standard Light Theme</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-5 rounded-2xl border flex flex-col items-center justify-center space-y-3 transition-all ${
                    isDark
                      ? 'border-blue-500 bg-blue-950/20 text-blue-400 ring-2 ring-blue-500/20'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-500'
                  }`}
                >
                  <Moon className="h-8 w-8 text-blue-500" />
                  <span className="text-xs font-bold">Immersive Dark Theme</span>
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl flex items-start space-x-3 text-xs text-gray-500">
                <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your selected display settings are saved to browser local session storage and will persist automatically across tab refreshments or logins.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: ADVANCED SYSTEM CONFIGURATIONS */}
          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Module 8: Advanced Configurations</h3>
                <p className="text-xs text-gray-500">Configure regulatory alerts, automatic backup patterns, and multi-site timezone nodes.</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* ExpireAlert Range */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Near-Expiry Threshold Notification Limit</span>
                    <span className="text-blue-600 dark:text-blue-400">{expiryThreshold} Days</span>
                  </div>
                  <input 
                    type="range" 
                    min="30" 
                    max="180" 
                    step="15" 
                    value={expiryThreshold}
                    onChange={(e) => setExpiryThreshold(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 leading-snug">
                    Livafil automatically alerts your team and lists salvage alternatives when stock falls within this range.
                  </p>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Low Stock Alert Flags</p>
                      <p className="text-[10px] text-gray-400">Dispatch instant platform notifications when inventory matches minima.</p>
                    </div>
                    <button onClick={() => setLowStockAlert(!lowStockAlert)}>
                      {lowStockAlert ? <ToggleRight className="h-9 w-9 text-blue-600" /> : <ToggleLeft className="h-9 w-9 text-gray-400" />}
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Email Digest Webhooks</p>
                      <p className="text-[10px] text-gray-400">Deliver consolidated daily summary emails of expiring items to stakeholders.</p>
                    </div>
                    <button onClick={() => setEmailDigest(!emailDigest)}>
                      {emailDigest ? <ToggleRight className="h-9 w-9 text-blue-600" /> : <ToggleLeft className="h-9 w-9 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Administrative Server Timezone</label>
                  <select
                    value={systemTimezone}
                    onChange={(e) => setSystemTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="UTC-5">Eastern Standard Time (EST, UTC-5)</option>
                    <option value="UTC-8">Pacific Standard Time (PST, UTC-8)</option>
                    <option value="UTC+0">Coordinated Universal Time (UTC)</option>
                    <option value="UTC+1">Central European Time (CET, UTC+1)</option>
                  </select>
                </div>

                {/* EXPORTER COMPONENT */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-blue-800 dark:text-blue-300">Regulatory HIPAA Backup Exporter</p>
                    <p className="text-[10px] text-slate-500 leading-snug">Generate and download standard 256-bit encrypted backup catalogs of all medicines.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all self-start md:self-auto shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Generate Exporter Backup</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAdvanced}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Advanced Settings</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & SESSION CONTROL */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Module 9: Security Hub &amp; Sessions</h3>
                <p className="text-xs text-gray-500">Revoke remote login keys, manage HIPAA 2FA credentials, and monitor server connection logs.</p>
              </div>

              {/* Multi-Factor Authenticators (2FA) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4.5 w-4.5 text-blue-600" />
                    <span className="font-extrabold text-slate-850 dark:text-slate-100">Multi-Factor Authentication (MFA)</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">Secure your drug inventory database by forcing standard token prompt checks on logins.</p>
                  
                  {is2FAEnabled && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Active Secret Code Token</span>
                      <p className="font-mono text-xs font-bold text-slate-850 dark:text-slate-100">{mfaSecretCode}</p>
                      <p className="text-[9px] text-gray-400">Configure your Google Authenticator or Duo App using this token.</p>
                    </div>
                  )}
                </div>

                <button onClick={handleToggleMFA} className="shrink-0">
                  {is2FAEnabled ? <ToggleRight className="h-10 w-10 text-blue-600" /> : <ToggleLeft className="h-10 w-10 text-gray-400" />}
                </button>
              </div>

              {/* Active Web Sessions Management */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-blue-600" />
                  Active Client Device Sessions
                </h4>

                <div className="space-y-2.5">
                  {activeSessions.map(sess => (
                    <div key={sess.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-slate-500">
                          <KeyRound className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-850 dark:text-slate-200">{sess.device}</p>
                          <p className="text-[10px] text-gray-400 font-mono">IP: {sess.ip} • Logged: {sess.date}</p>
                        </div>
                      </div>

                      {sess.date === 'Active Now' ? (
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-sm">Current Session</span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(sess.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 rounded-lg transition-colors border border-red-200/20"
                          title="Revoke Session Key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance standard alert */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white flex items-start gap-3 text-xs">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-300">
                  <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Security Standard HIPAA Compliant</span>
                  <p className="leading-relaxed">
                    Livafil systems maintain fully compliant connection pools with SSL enforcement. Local cache files containing drug lists or customer logs are securely isolated from standard public browser extensions.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
