import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, Mail, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

const verifySchema = z.object({
  code: z.string().length(6, 'Verification code must be exactly 6 digits'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (data.code === '123456') {
        setIsSuccess(true);
      } else {
        setError('Invalid verification code. Try "123456" for testing.');
      }
    } catch (err) {
      setError('Verification failed. Try again.');
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
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          We have simulated a 6-digit verification email to your address.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">
          
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 rounded-xl text-center">
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              💡 Use verification code <strong>123456</strong> for testing.
            </p>
          </div>

          {!isSuccess ? (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="code" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  {...register('code')}
                  className="block w-full text-center tracking-widest text-lg font-bold px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="000000"
                />
                {errors.code && (
                  <p className="mt-1 text-xs text-red-500 text-center">{errors.code.message}</p>
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
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>Verify Code</span>
                  )}
                </button>
              </div>

              <div className="text-center mt-4">
                <Link to="/login" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4 animate-fadeIn">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Verified!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Thank you. Your email address has been successfully verified. You can now access your workspace dashboard.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
