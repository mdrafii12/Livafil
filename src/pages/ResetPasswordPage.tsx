import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    const initRecoverySession = async () => {
      try {
        const fullUrl = window.location.href;
        
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        if (fullUrl.includes('access_token=') && fullUrl.includes('refresh_token=')) {
          const matchAccess = fullUrl.match(/access_token=([^&]+)/);
          const matchRefresh = fullUrl.match(/refresh_token=([^&]+)/);
          if (matchAccess) accessToken = matchAccess[1];
          if (matchRefresh) refreshToken = matchRefresh[1];
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          setHasValidSession(true);
          setSessionChecking(false);
          return;
        }

        if (fullUrl.includes('code=')) {
          const matchCode = fullUrl.match(/code=([^&]+)/);
          if (matchCode) {
            const { error } = await supabase.auth.exchangeCodeForSession(matchCode[1]);
            if (!error) {
              setHasValidSession(true);
              setSessionChecking(false);
              return;
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
      } catch (err: any) {
        console.error('Error establishing recovery session:', err);
        setErrorMsg('Invalid or expired password reset link. Please request a new link.');
        setHasValidSession(false);
      } finally {
        setSessionChecking(false);
      }
    };

    initRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasValidSession(true);
        setErrorMsg(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <Shield className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Set your new workspace security credentials.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">
          {sessionChecking ? (
            <div className="text-center py-8 text-sm text-gray-500 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span>Verifying password recovery session...</span>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4 py-4 animate-fadeIn">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password Changed Successfully</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Your password has been securely updated. You can now log in using your new credentials.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs text-center"
                >
                  Log In to Livafil
                </Link>
              </div>
            </div>
          ) : !hasValidSession ? (
            <div className="text-center space-y-4 py-4 animate-fadeIn">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session Link Required</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {errorMsg || 'No active recovery session found. For security, password resets must be initiated via the email link.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs text-center"
                >
                  Request New Password Reset Link
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 dark:bg-red-950/40 dark:border-red-900/40 dark:text-red-300 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving password...</span>
                    </>
                  ) : (
                    <span>Save Password</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
