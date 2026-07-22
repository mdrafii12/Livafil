import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, Loader2, ClipboardList, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import * as db from '../services/supabaseData';


const onboardingSchema = z.object({
  name: z.string().min(3, 'Pharmacy Name must be at least 3 characters'),
  ownerName: z.string().min(2, 'Owner Name is required'),
  licenseNumber: z.string().min(5, 'Valid drug license number is required'),
  gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (e.g. 22ABCDE1234F1Z9)'),
  phone: z.string().min(10, 'Valid contact phone number is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  address: z.string().min(5, 'Complete physical address is required'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),
  pincode: z.string().regex(/^[0-9]{5,6}$/, 'Must be a valid 5 or 6 digit pincode'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, refreshProfile } = auth;
  const { session, loading: authLoading } = auth;
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [invite, setInvite] = useState<any | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  useEffect(() => {
  const checkInvite = async () => {
    if (!profile?.email) return;
    try {
      const found = await db.checkMyInvite(profile.email);
      setInvite(found);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingInvite(false);
    }
  };
  checkInvite();
}, [profile?.email]);

  const handleAcceptInvite = async () => {
    if (!invite || !profile) return;
    setAcceptingInvite(true);
    try {
      await db.acceptInvite(invite.id, profile.id, invite.pharmacyId, invite.role);
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to accept invite.');
    } finally {
      setAcceptingInvite(false);
    }
  };

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<OnboardingFormValues>({
  resolver: zodResolver(onboardingSchema),
  defaultValues: {
    ownerName: profile?.name ?? '',
    email: profile?.email ?? '',
  }
});

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Checking for pending invitations...
      </div>
    );
  }

  if (invite) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center py-12 px-4">
        <div className="bg-white dark:bg-gray-900 max-w-md w-full p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">You've been invited!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <strong className="text-gray-800 dark:text-gray-200">{invite.pharmacyName}</strong> invited you to join as a <strong className="text-gray-800 dark:text-gray-200">{invite.role}</strong>.
          </p>
          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
          <button
            onClick={handleAcceptInvite}
            disabled={acceptingInvite}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {acceptingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Accept & Join {invite.pharmacyName}</span>}
          </button>
        </div>
      </div>
    );
  }

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingFormValues)[] = [];
    if (step === 1) {
      fieldsToValidate = ['name', 'ownerName', 'licenseNumber', 'gst'];
    } else if (step === 2) {
      fieldsToValidate = ['phone', 'email', 'address', 'state', 'district', 'city', 'pincode'];
    }
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

const onSubmit = async (data: OnboardingFormValues) => {
  setIsLoading(true);
  setSubmitError(null);
  try {
    const newPharmacyId = crypto.randomUUID();

    // 1. Create the pharmacy row — no .select() this time
    const { error: pharmacyError } = await supabase
      .from('pharmacies')
      .insert({
        id: newPharmacyId,
        name: data.name,
        owner_name: data.ownerName,
        license_number: data.licenseNumber,
        gst: data.gst,
        phone: data.phone,
        email: data.email,
        address: data.address,
        state: data.state,
        district: data.district,
        city: data.city,
        pincode: data.pincode,
      });

    if (pharmacyError) throw pharmacyError;

    // 2. Link the current user's profile to the new pharmacy
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ pharmacy_id: newPharmacyId })
      .eq('id', profile?.id);

    if (profileError) throw profileError;

    // 3. Refresh the profile in context so ProtectedRoute sees the new pharmacy_id
    await refreshProfile();
    navigate('/dashboard');
  } catch (err: any) {
    setSubmitError(err.message || 'Failed to complete onboarding.');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
          Complete Pharmacy Onboarding
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          MedGuard requires your business credentials to secure your custom workspace.
        </p>

        {/* Step Progress Indicators */}
        <div className="mt-8 flex justify-between items-center max-w-sm mx-auto">
          <div className="flex items-center space-x-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>1</div>
            <span className={`text-xs font-medium ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>Business info</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-800 mx-4"></div>
          <div className="flex items-center space-x-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>2</div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>Contact & Address</span>
          </div>
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">

          {submitError && (
  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl">
    {submitError}
  </div>
)}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* STEP 1: BUSINESS REGISTRATION DETAILS */}
            {step === 1 && (
              <div className="space-y-5 animate-slideIn">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Pharmacy Identification Details</span>
                  </h3>
                  <p className="text-xs text-gray-400">Provide legal and drug license parameters.</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Pharmacy Legal Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="E.g. Oakwood Medical Pharmacy"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ownerName" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Pharmacist/Owner Name
                  </label>
                  <input
                    id="ownerName"
                    type="text"
                    {...register('ownerName')}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="John Doe"
                  />
                  {errors.ownerName && (
                    <p className="mt-1 text-xs text-red-500">{errors.ownerName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="licenseNumber" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Drug License Number
                    </label>
                    <input
                      id="licenseNumber"
                      type="text"
                      {...register('licenseNumber')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="PH-NY-2026-XXXX"
                    />
                    {errors.licenseNumber && (
                      <p className="mt-1 text-xs text-red-500">{errors.licenseNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="gst" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      GSTIN (Tax Identification)
                    </label>
                    <input
                      id="gst"
                      type="text"
                      {...register('gst')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="22ABCDE1234F1Z9"
                    />
                    {errors.gst && (
                      <p className="mt-1 text-xs text-red-500">{errors.gst.message}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center space-x-2 transition-colors"
                  >
                    <span>Next step</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ADDRESS & CONTACT PARAMETERS */}
            {step === 2 && (
              <div className="space-y-4 animate-slideIn">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Contact Info & Location</span>
                  </h3>
                  <p className="text-xs text-gray-400">Provide communication channels and address details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="text"
                      {...register('phone')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Business Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Physical Street Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...register('address')}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      {...register('city')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="district" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      District
                    </label>
                    <input
                      id="district"
                      type="text"
                      {...register('district')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {errors.district && (
                      <p className="mt-1 text-xs text-red-500">{errors.district.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="state" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      State
                    </label>
                    <input
                      id="state"
                      type="text"
                      {...register('state')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pincode" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Pincode
                    </label>
                    <input
                      id="pincode"
                      type="text"
                      {...register('pincode')}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {errors.pincode && (
                      <p className="mt-1 text-xs text-red-500">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-between space-x-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating pharmacy...</span>
                      </>
                    ) : (
                      <span>Complete Onboarding</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
