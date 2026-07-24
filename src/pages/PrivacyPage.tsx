import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
              <p className="text-xs text-gray-400">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 space-y-5">
            <p>
              This Privacy Policy explains how Livafil ("we", "us", "our") collects, 
              uses, stores, and protects personal data, in accordance with the Digital 
              Personal Data Protection Act, 2023 ("DPDP Act") and other applicable Indian 
              law. As a Data Fiduciary under the DPDP Act, we are responsible for 
              ensuring the personal data we process is handled lawfully and securely.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">1. What Data We Collect</h3>
            <p>We collect the following categories of personal data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> your name, email address, phone number, 
                and role, provided when you or your pharmacy Owner creates your account</li>
              <li><strong>Pharmacy business data:</strong> your pharmacy's name, license 
                number, GSTIN, address, and contact details</li>
              <li><strong>Customer/billing data:</strong> names and phone numbers of 
                walk-in customers that you (the pharmacy) choose to enter during billing 
                — this data belongs to and is controlled by your pharmacy, not us; we 
                process it on your behalf as a processor for this specific purpose</li>
              <li><strong>Usage data:</strong> inventory, batch, billing, and Exchange 
                transaction records you create while using the Service</li>
              <li><strong>Payment data:</strong> we do not store your card or bank 
                details directly — these are handled entirely by our payment processor 
                (Razorpay), which maintains its own security and compliance standards</li>
            </ul>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">2. Why We Collect It (Purpose Limitation)</h3>
            <p>We use personal data only for the specific purposes for which it was collected:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the core Service (inventory tracking, billing, 
                Recovery recommendations, Exchange marketplace)</li>
              <li>To authenticate your account and enforce access controls between 
                different pharmacies on the platform</li>
              <li>To process subscription payments</li>
              <li>To respond to support requests</li>
              <li>To send you service-related communications (e.g. expiry alerts, 
                account notices) — we do not use your data for unrelated marketing 
                without your separate consent</li>
            </ul>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">3. Your Consent</h3>
            <p>
              By creating an account, you provide consent for us to process your 
              personal data for the purposes described above. Where your pharmacy 
              enters customer data (such as a walk-in customer's name and phone number 
              during billing), it is your pharmacy's responsibility, as the Data 
              Fiduciary for that customer relationship, to have appropriate consent or 
              legal basis for collecting and storing that customer's data.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">4. Data Isolation Between Pharmacies</h3>
            <p>
              Your pharmacy's inventory, billing, staff, and customer data is kept 
              strictly isolated from every other pharmacy on the platform through 
              database-level access controls. The only data visible to other pharmacies 
              is what you deliberately choose to share via the Exchange feature (medicine 
              listings, quantities, and pricing you post) — never your private inventory, 
              billing, or customer records.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">5. How Long We Keep Your Data</h3>
            <p>
              We retain your data for as long as your account remains active. If you 
              close your account, we will delete or anonymize your personal data within 
              a reasonable period, except where we are required to retain certain 
              records for legal, tax, or regulatory purposes.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">6. Where Your Data Is Stored</h3>
            <p>
              Your data is stored using Supabase, a cloud database provider, hosted in a 
              data center region selected to serve users in India. We take reasonable 
              technical and organizational measures — including encryption in transit, 
              access controls, and row-level data isolation — to protect your data 
              against unauthorized access, alteration, or loss.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">7. Your Rights as a Data Principal</h3>
            <p>Under the DPDP Act, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access a summary of the personal data we hold about you</li>
              <li>Request correction or updating of inaccurate or incomplete data</li>
              <li>Request erasure of your personal data, subject to our legal retention 
                obligations</li>
              <li>Withdraw consent for processing at any time (which may limit or end 
                your ability to use the Service)</li>
              <li>Nominate another individual to exercise these rights on your behalf in 
                the event of death or incapacity</li>
              <li>Raise a grievance regarding how your data is handled</li>
            </ul>
            <p>
              To exercise any of these rights, contact us through the in-app Support 
              feature.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">8. Grievance Officer</h3>
            <p>
              In accordance with the DPDP Act, questions, complaints, or grievances 
              regarding the processing of your personal data can be raised through the 
              in-app Support feature, which will be addressed by our designated point of 
              contact for data protection matters.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">9. Third-Party Services We Use</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database, authentication, and backend infrastructure</li>
              <li><strong>Razorpay</strong> — payment processing for subscriptions</li>
            </ul>
            <p>Each of these providers maintains its own privacy and security practices governing the data they process on our behalf.</p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">10. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in 
              our practices or legal requirements. We will notify you of material 
              changes through the app.
            </p>

            <h3 className="font-bold text-gray-900 dark:text-white text-base">11. Contact</h3>
            <p>
              For any questions about this Privacy Policy or how your data is handled, 
              please reach out through the in-app Support feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}