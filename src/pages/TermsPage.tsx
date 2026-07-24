import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600 mb-6">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 sm:p-10 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
              <p className="text-xs text-gray-400">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 space-y-5">
            <p>
              These Terms of Service ("Terms") govern your access to and use of Livafil 
              ("we", "us", "our", the "Service"), a pharmacy inventory and management 
              platform. By creating an account or using the Service, you agree to these 
              Terms. If you do not agree, do not use the Service.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">1. Who Can Use Livafil</h3>
            <p>
              Livafil is intended for use by licensed pharmacies, pharmacists, and 
              authorized pharmacy staff operating in India. By registering, you confirm 
              that you hold or are authorized to act on behalf of a business holding a 
              valid pharmacy license under applicable Indian law, and that the 
              information you provide during registration is accurate.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">2. Your Account</h3>
            <p>
              You are responsible for maintaining the confidentiality of your login 
              credentials and for all activity that occurs under your account. Notify us 
              immediately if you suspect unauthorized access. Pharmacy Owners are 
              responsible for the conduct of any Manager or Staff accounts they invite 
              into their pharmacy workspace.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">3. What You're Responsible For</h3>
            <p>
              Livafil is a tool to help you manage inventory, billing, and stock 
              recovery — it does not replace your professional judgment or your legal 
              obligations as a licensed pharmacy. You remain solely responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The accuracy of all medicine, batch, pricing, and stock data you enter</li>
              <li>Compliance with the Drugs and Cosmetics Act, 1940, and all applicable 
                state pharmacy regulations, including Schedule H/H1 prescription 
                requirements</li>
              <li>All transactions conducted through the Exchange feature with other 
                pharmacies, including verifying the legitimacy, licensing, and quality of 
                any medicine received from or sent to another pharmacy</li>
              <li>Any decisions made based on Recovery/Intelligence engine 
                recommendations — these are estimates and suggestions only, not 
                professional pharmaceutical, financial, or legal advice</li>
            </ul>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">4. The Exchange Feature</h3>
            <p>
              The Exchange marketplace connects your pharmacy with other pharmacies on 
              the platform to facilitate trading of surplus or near-expiry stock. Livafil 
              does not take ownership of, inspect, or guarantee the condition, 
              authenticity, or legality of any medicine exchanged between pharmacies. 
              Each pharmacy is independently responsible for verifying the other party's 
              licensing and for the safe handling and transport of any exchanged goods, 
              in compliance with applicable drug distribution laws.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">5. Subscription & Payments</h3>
            <p>
              Paid plans are billed in advance on a recurring basis (monthly or as 
              otherwise stated at checkout) through our payment processor. You can 
              cancel your subscription at any time; access continues until the end of the 
              current billing period. Fees are non-refundable except where required by 
              law.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">6. Data You Provide</h3>
            <p>
              You retain ownership of the business, inventory, and customer data you 
              enter into Livafil. See our{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>{' '}
              for how we handle it. By using the Service, you confirm you have the right 
              to enter any customer data (such as names or phone numbers used in 
              billing) into the system.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">7. Limitation of Liability</h3>
            <p>
              Livafil is provided "as is." To the maximum extent permitted by law, we 
              are not liable for indirect, incidental, or consequential damages arising 
              from your use of the Service, including but not limited to losses from 
              stock discrepancies, failed Exchange transactions, or decisions made based 
              on Recovery engine recommendations. Nothing in these Terms limits 
              liability that cannot be excluded under Indian law.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">8. Termination</h3>
            <p>
              We may suspend or terminate accounts that violate these Terms, engage in 
              fraudulent activity, or misuse the Exchange feature. You may stop using the 
              Service and delete your account at any time by contacting support.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">9. Changes to These Terms</h3>
            <p>
              We may update these Terms from time to time. Continued use of the Service 
              after changes take effect constitutes acceptance of the updated Terms.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">10. Governing Law</h3>
            <p>
              These Terms are governed by the laws of India. Any disputes will be subject 
              to the exclusive jurisdiction of the courts of Andhra Pradesh.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">11. Contact</h3>
            <p>
              Questions about these Terms can be raised through the in-app Support 
              feature or by contacting us directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}