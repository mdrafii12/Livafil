import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, Receipt, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AccessRestrictedProps {
  title?: string;
  message?: string;
}

export default function AccessRestricted({
  title = 'Access Restricted',
  message,
}: AccessRestrictedProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const roleName = profile?.role || 'OP Staff';

  const defaultMessage = `Your account role (${roleName}) is restricted to dispensing and billing workflows. Access to inventory purchase costs, financial reports, supplier settings, and staff management is disabled for this account.`;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-red-100 dark:border-red-900/40">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200/60 dark:border-amber-900/50">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Role: {roleName}</span>
          </span>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {message || defaultMessage}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => navigate('/billing')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs"
          >
            <Receipt className="w-4 h-4" />
            <span>Go to Quick Billing</span>
          </button>
          <button
            onClick={() => navigate('/opd')}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
          >
            <Stethoscope className="w-4 h-4 text-emerald-500" />
            <span>OPD Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
